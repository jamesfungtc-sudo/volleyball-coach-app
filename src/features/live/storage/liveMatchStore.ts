/**
 * Local-first persistence for Live matches.
 * Every state change is written here synchronously so a match survives
 * reloads, crashes and offline use. Google Sheets sync happens separately.
 */
import type { LiveMatch } from '../types'

const MATCH_PREFIX = 'vbc:live:match:'
const INDEX_KEY = 'vbc:live:index'

let listeners: (() => void)[] = []
let cachedIndex: LiveMatch[] | null = null

function notify() {
  cachedIndex = null
  listeners.forEach(l => l())
}

function readIndex(): string[] {
  try {
    return JSON.parse(localStorage.getItem(INDEX_KEY) || '[]')
  } catch {
    return []
  }
}

function writeIndex(ids: string[]) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(ids))
}

export function newMatchId(): string {
  return `lm_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

export function loadMatch(id: string): LiveMatch | null {
  try {
    const raw = localStorage.getItem(MATCH_PREFIX + id)
    return raw ? (JSON.parse(raw) as LiveMatch) : null
  } catch {
    return null
  }
}

export function saveMatch(match: LiveMatch): void {
  try {
    localStorage.setItem(MATCH_PREFIX + match.id, JSON.stringify(match))
    const ids = readIndex()
    if (!ids.includes(match.id)) writeIndex([match.id, ...ids])
  } catch (e) {
    console.error('[liveMatchStore] Failed to save match:', e)
  }
  notify()
}

export function deleteMatch(id: string): void {
  localStorage.removeItem(MATCH_PREFIX + id)
  writeIndex(readIndex().filter(x => x !== id))
  notify()
}

/** All locally stored matches, most recently updated first. Stable reference between changes. */
export function listMatches(): LiveMatch[] {
  if (!cachedIndex) {
    cachedIndex = readIndex()
      .map(loadMatch)
      .filter((m): m is LiveMatch => m !== null)
      .sort((a, b) => b.updatedAt - a.updatedAt)
  }
  return cachedIndex
}

export function subscribeMatches(listener: () => void): () => void {
  listeners.push(listener)
  return () => {
    listeners = listeners.filter(l => l !== listener)
  }
}
