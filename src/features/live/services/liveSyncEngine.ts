/**
 * Live match → Google Sheets sync.
 *
 * Every change is appended to a persistent outbox in localStorage and flushed
 * in order through the shared writeQueue. Failed writes stay in the outbox and
 * are retried with backoff and on reconnect, so points recorded offline are
 * never dropped. The data layer (googleSheetsAPI, writeQueue) is used as-is.
 */
import {
  addPoint,
  createTeam,
  isAPIConfigured,
  saveMatchFull,
  undoLastPoint,
  updateGameState,
  type GameState,
} from '@/services/googleSheetsAPI'
import { enqueueWrite } from '@/services/writeQueue'
import type { PointData } from '@/types/inGameStats.types'
import type { LiveMatch, LivePoint, TeamRef } from '../types'
import { currentSet } from '../reducers/matchReducer'

type OpBody =
  | { kind: 'create'; home: TeamRef; opponent: TeamRef; date: string; gameState: GameState }
  | { kind: 'point'; set: number; point: PointData }
  | { kind: 'undo'; set: number }
  | { kind: 'state'; gameState: GameState }

type SyncOp = OpBody & { id: string; matchId: string; tries: number }

export type SyncState = 'synced' | 'syncing' | 'offline' | 'error' | 'local'

export interface SyncSnapshot {
  state: SyncState
  pending: number
}

const OUTBOX_KEY = 'vbc:live:outbox'
const REMOTE_IDS_KEY = 'vbc:live:remoteIds'
const MAX_BACKOFF_MS = 60_000

// ============================================================================
// Persistent outbox
// ============================================================================

function readOps(): SyncOp[] {
  try {
    return JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]')
  } catch {
    return []
  }
}

function writeOps(ops: SyncOp[]) {
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(ops))
  publish()
}

function readRemoteIds(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(REMOTE_IDS_KEY) || '{}')
  } catch {
    return {}
  }
}

export function getRemoteId(matchId: string): string | null {
  return readRemoteIds()[matchId] ?? null
}

function setRemoteId(matchId: string, remoteId: string) {
  localStorage.setItem(REMOTE_IDS_KEY, JSON.stringify({ ...readRemoteIds(), [matchId]: remoteId }))
}

function enqueueOp(matchId: string, body: OpBody) {
  // No backend configured: matches are local-only
  if (!isAPIConfigured()) return
  let ops = readOps()
  // Only the latest game state matters
  if (body.kind === 'state') ops = ops.filter(o => !(o.kind === 'state' && o.matchId === matchId))
  ops.push({ ...body, id: `op_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, matchId, tries: 0 })
  writeOps(ops)
  requestFlush()
}

// ============================================================================
// Status
// ============================================================================

let snapshot: SyncSnapshot = { state: isAPIConfigured() ? 'synced' : 'local', pending: readOps().length }
let listeners: (() => void)[] = []
let lastState: SyncState = snapshot.state

function publish(state: SyncState = lastState) {
  lastState = state
  const pending = readOps().length
  if (snapshot.state === state && snapshot.pending === pending) return
  snapshot = { state, pending }
  listeners.forEach(l => l())
}

export function getSyncSnapshot(): SyncSnapshot {
  return snapshot
}

export function subscribeSync(listener: () => void): () => void {
  listeners.push(listener)
  return () => {
    listeners = listeners.filter(l => l !== listener)
  }
}

// ============================================================================
// Flushing
// ============================================================================

let flushing = false
let failures = 0
let retryTimer: ReturnType<typeof setTimeout> | null = null

/** Run a task through the shared write queue and wait for its result. */
function runQueued<T>(task: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    enqueueWrite(async () => {
      try {
        resolve(await task())
      } catch (e) {
        reject(e)
        throw e
      }
    })
  })
}

async function resolveTeamId(team: TeamRef): Promise<string> {
  if (team.id) return team.id
  const { teamId } = await runQueued(() => createTeam(team.name))
  return teamId
}

async function runOp(op: SyncOp): Promise<void> {
  if (op.kind === 'create') {
    if (getRemoteId(op.matchId)) return
    const home = await resolveTeamId(op.home)
    const opponent = await resolveTeamId(op.opponent)
    // Persist created team ids so a retry doesn't create duplicate teams
    writeOps(readOps().map(o => (o.id === op.id && o.kind === 'create'
      ? { ...o, home: { ...o.home, id: home }, opponent: { ...o.opponent, id: opponent } }
      : o)))
    const { matchId } = await runQueued(() => saveMatchFull({
      homeTeam: home,
      opponentTeam: opponent,
      gameDate: op.date,
      sets: [1, 2, 3, 4, 5].map(n => ({ set_number: n, points: [] })),
      gameState: op.gameState,
      rotationConfigs: {},
      trajectories: [],
    }))
    setRemoteId(op.matchId, matchId)
    return
  }

  const remoteId = getRemoteId(op.matchId)
  if (!remoteId) throw new Error(`Match ${op.matchId} has not been created remotely yet`)

  switch (op.kind) {
    case 'point':
      return runQueued(() => addPoint(remoteId, op.set, op.point))
    case 'undo':
      return runQueued(() => undoLastPoint(remoteId, op.set))
    case 'state':
      return runQueued(() => updateGameState(remoteId, op.gameState))
  }
}

function scheduleRetry() {
  if (retryTimer) clearTimeout(retryTimer)
  const delay = Math.min(MAX_BACKOFF_MS, 3000 * 2 ** Math.max(0, failures - 1))
  retryTimer = setTimeout(() => {
    retryTimer = null
    void flush()
  }, delay)
}

export async function flush(): Promise<void> {
  if (flushing) return
  if (!isAPIConfigured()) return publish('local')
  if (!navigator.onLine) return publish('offline')
  if (readOps().length === 0) return publish('synced')

  flushing = true
  publish('syncing')
  try {
    for (let op = readOps()[0]; op; op = readOps()[0]) {
      // A non-create op whose match was never queued for creation can never succeed
      if (op.kind !== 'create' && !getRemoteId(op.matchId) &&
          !readOps().some(o => o.kind === 'create' && o.matchId === op!.matchId)) {
        console.warn('[liveSync] Dropping orphan op', op)
      } else {
        await runOp(op)
      }
      const done = op.id
      writeOps(readOps().filter(o => o.id !== done))
    }
    failures = 0
    publish('synced')
  } catch (e) {
    console.error('[liveSync] Sync failed, will retry:', e)
    failures++
    const [head, ...rest] = readOps()
    if (head) writeOps([{ ...head, tries: head.tries + 1 }, ...rest])
    publish(navigator.onLine ? 'error' : 'offline')
    scheduleRetry()
  } finally {
    flushing = false
  }
}

export function requestFlush() {
  void flush()
}

// ============================================================================
// Public API: translate match changes into outbox ops
// ============================================================================

export function toGameState(match: LiveMatch): GameState {
  const set = currentSet(match)
  return {
    currentSet: set.number,
    homeScore: set.home,
    opponentScore: set.opponent,
    pointNumber: set.home + set.opponent + 1,
    servingTeam: match.serving,
    status: match.status === 'completed' ? 'completed' : 'in_progress',
  }
}

function toPointData(p: LivePoint): PointData {
  return {
    point_number: p.number,
    winning_team: p.winner,
    action_type: 'Quick',
    action: p.winner === 'home' ? 'Point won' : 'Point lost',
    locationTempo: null,
    home_player: '',
    opponent_player: '',
    home_score: p.home,
    opponent_score: p.opponent,
  }
}

export function queueMatchCreated(match: LiveMatch) {
  enqueueOp(match.id, {
    kind: 'create',
    home: match.home,
    opponent: match.opponent,
    date: match.date,
    gameState: toGameState(match),
  })
}

/** Diff two states of the same match and queue the matching remote writes. */
export function queueMatchChange(prev: LiveMatch, next: LiveMatch) {
  if (next.points.length > prev.points.length) {
    for (const p of next.points.slice(prev.points.length)) {
      enqueueOp(next.id, { kind: 'point', set: p.set, point: toPointData(p) })
    }
  } else if (next.points.length < prev.points.length) {
    for (const p of prev.points.slice(next.points.length).reverse()) {
      enqueueOp(next.id, { kind: 'undo', set: p.set })
    }
  }
  enqueueOp(next.id, { kind: 'state', gameState: toGameState(next) })
}

export function discardMatchOps(matchId: string) {
  writeOps(readOps().filter(o => o.matchId !== matchId))
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    failures = 0
    requestFlush()
  })
  window.addEventListener('offline', () => publish('offline'))
}
