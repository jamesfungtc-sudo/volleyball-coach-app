import { COURT_LENGTH, COURT_WIDTH, NET_Y, type Point, type Rect } from './court'
import { clipPolygonToRect } from './geometry'

// 2D block-shadow model.
//
// Every attack is a straight line from the hitter's contact point (projected to the floor) into
// our court, and every such line crosses the net line at exactly one x. So instead of angles we
// describe rays by that "net x". A blocker covers the net x range of its hands; overlapping hand
// ranges merge into one shadow; whatever is left between the antennae (0..9) is an open lane.
//
// A shadow doesn't run forever: a hard hit can still clear the hands and come down deep. Each
// blocker's size sets how far past their hands (along the ball's path) they still protect; beyond
// that is an "over the block" zone.

export type BlockSize = 'large' | 'medium' | 'small'

/**
 * Per blocker size: width of hands + forearms along the net, and how far past the hands the
 * shadow reaches (Infinity = to the end line).
 * NOTE: first guesses, to be tuned against real footage — they drive almost every result here.
 * See docs/TACTIC_BOARD_PLAN.md "Open notes".
 */
export const BLOCK_SIZES: Record<BlockSize, { width: number; reach: number }> = {
  large: { width: 0.6, reach: Infinity },
  medium: { width: 0.5, reach: 7.5 },
  small: { width: 0.4, reach: 5.5 },
}

export const DEFAULT_BLOCK_SIZE: BlockSize = 'medium'

/** Medium hands; the width used when a blocker's size isn't given. */
export const BLOCK_WIDTH = BLOCK_SIZES[DEFAULT_BLOCK_SIZE].width

/** The far edge of a shadow with a limited reach is drawn through this many points per stretch. */
const REACH_SAMPLES = 8

/** A gap narrower than the ball can't be hit through, so it counts as closed. */
export const BALL_DIAMETER = 0.21

/** Home players this close to the net (on our side) are treated as blockers. */
export const BLOCK_ZONE_DEPTH = 1

/** Where blocker icons settle when dropped in the block zone. */
export const BLOCKER_Y = NET_Y + 0.4

/** Hitters closer to the net than this are treated as being this far away. */
const MIN_HITTER_DISTANCE = 0.1

export interface NetInterval {
  from: number
  to: number
}

export type LaneKind = 'line' | 'cross' | 'seam' | 'open'

export interface Lane extends NetInterval {
  kind: LaneKind
  /** In-court landing area for this lane (empty polygons are dropped). */
  polygon: Point[]
}

export interface Shadow extends NetInterval {
  polygon: Point[]
}

/** Deep part of the court behind a block whose shadow stops short: a hit over the hands. */
export interface OverZone extends NetInterval {
  polygon: Point[]
}

export interface DefenceAnalysis {
  /** Hitter contact point actually used (kept on the opponent side of the net). */
  contact: Point
  shadows: Shadow[]
  lanes: Lane[]
  over: OverZone[]
}

export interface Blocker {
  /** Centre x of the hands on the net. */
  x: number
  size?: BlockSize
}

export interface DefenceInput {
  hitter: Point
  blockers?: Blocker[]
  /** Shorthand for medium blockers at these x's. */
  blockerXs?: number[]
}

interface Hands extends NetInterval {
  reach: number
}

const OUR_COURT: Rect = { x: 0, y: NET_Y, width: COURT_WIDTH, height: COURT_LENGTH - NET_Y }

export function isInBlockZone(p: Point): boolean {
  return p.y >= NET_Y && p.y <= NET_Y + BLOCK_ZONE_DEPTH
}

export function analyseDefence({ hitter, blockers = [], blockerXs = [] }: DefenceInput): DefenceAnalysis {
  const contact = { x: hitter.x, y: Math.min(hitter.y, NET_Y - MIN_HITTER_DISTANCE) }
  const all: Blocker[] = [...blockers, ...blockerXs.map(x => ({ x }))]
  const hands: Hands[] = all.map(b => {
    const { width, reach } = BLOCK_SIZES[b.size ?? DEFAULT_BLOCK_SIZE]
    return { from: b.x - width / 2, to: b.x + width / 2, reach }
  })

  const covered = mergeIntervals(hands, BALL_DIAMETER)
  const shadows: Shadow[] = []
  const over: OverZone[] = []
  for (const interval of covered) {
    const runs = reachRuns(interval, hands)
    // Along the net left to right, then back along the far edge right to left.
    const farSide = runs.flatMap(run => farEdge(contact, run)).reverse()
    const polygon = clipPolygonToRect(
      [{ x: interval.from, y: NET_Y }, { x: interval.to, y: NET_Y }, ...farSide],
      OUR_COURT,
    )
    if (polygon.length >= 3) shadows.push({ ...interval, polygon })
    for (const run of runs) {
      if (run.reach === Infinity) continue
      const deep = overZone(contact, run)
      if (deep.length >= 3) over.push({ from: run.from, to: run.to, polygon: deep })
    }
  }

  const lanes = gaps(covered).flatMap(gap => {
    const polygon = wedge(contact, gap)
    return polygon.length >= 3 ? [{ ...gap, kind: laneKind(gap, contact), polygon }] : []
  })

  return { contact, shadows, lanes, over }
}

/** Point where the ray through `netX` lands at depth `y` on our side. */
export function rayPointAt(contact: Point, netX: number, y: number): Point {
  const t = (y - contact.y) / (NET_Y - contact.y)
  return { x: contact.x + (netX - contact.x) * t, y }
}

/**
 * Split a shadow into stretches of equal reach. Where hands overlap the longer reach wins; a gap
 * too small for the ball (or a sliver by an antenna) takes the shorter reach of its neighbours.
 */
function reachRuns(interval: NetInterval, hands: Hands[]): Hands[] {
  const cuts = [...new Set([interval.from, interval.to, ...hands.flatMap(h => [h.from, h.to])])]
    .filter(x => x >= interval.from && x <= interval.to)
    .sort((a, b) => a - b)
  const runs: Hands[] = []
  for (let i = 0; i + 1 < cuts.length; i++) {
    const mid = (cuts[i] + cuts[i + 1]) / 2
    const covering = hands.filter(h => h.from <= mid && h.to >= mid)
    const reach = covering.length
      ? Math.max(...covering.map(h => h.reach))
      : Math.min(...neighbours(mid, hands).map(h => h.reach))
    const last = runs[runs.length - 1]
    if (last && last.reach === reach) last.to = cuts[i + 1]
    else runs.push({ from: cuts[i], to: cuts[i + 1], reach })
  }
  return runs
}

/** Closest hands on each side of a net x. */
function neighbours(x: number, hands: Hands[]): Hands[] {
  const left = hands.filter(h => h.to <= x).sort((a, b) => b.to - a.to)[0]
  const right = hands.filter(h => h.from >= x).sort((a, b) => a.from - b.from)[0]
  return [left, right].filter((h): h is Hands => h !== undefined)
}

/** Where the ball stops being blocked, for net x's across a run (left to right). */
function farEdge(contact: Point, run: Hands): Point[] {
  if (run.reach === Infinity) {
    return [rayPointAt(contact, run.from, COURT_LENGTH), rayPointAt(contact, run.to, COURT_LENGTH)]
  }
  return Array.from({ length: REACH_SAMPLES }, (_, i) =>
    pastHands(contact, run.from + ((run.to - run.from) * i) / (REACH_SAMPLES - 1), run.reach),
  )
}

/** Point `distance` past the net along the ray through `netX`, stopping at our end line. */
function pastHands(contact: Point, netX: number, distance: number): Point {
  const dx = netX - contact.x
  const dy = NET_Y - contact.y
  const length = Math.hypot(dx, dy)
  const toEndLine = ((COURT_LENGTH - NET_Y) * length) / dy
  const d = Math.min(distance, toEndLine)
  return { x: netX + (dx / length) * d, y: NET_Y + (dy / length) * d }
}

/** The run's lane between where its shadow ends and the end line. */
function overZone(contact: Point, run: Hands): Point[] {
  return clipPolygonToRect(
    [...farEdge(contact, run), rayPointAt(contact, run.to, COURT_LENGTH), rayPointAt(contact, run.from, COURT_LENGTH)],
    OUR_COURT,
  )
}

/** Merge hand ranges (clipped to the antennae) and close any gap the ball can't fit through. */
function mergeIntervals(intervals: NetInterval[], minGap: number): NetInterval[] {
  const clipped = intervals
    .map(i => ({ from: Math.max(0, i.from), to: Math.min(COURT_WIDTH, i.to) }))
    .filter(i => i.to > i.from)
    .sort((a, b) => a.from - b.from)

  const merged: NetInterval[] = []
  for (const interval of clipped) {
    const last = merged[merged.length - 1]
    if (last && interval.from - last.to < minGap) last.to = Math.max(last.to, interval.to)
    else merged.push({ ...interval })
  }

  // Slivers between the block and an antenna are closed too.
  if (merged.length) {
    if (merged[0].from < minGap) merged[0].from = 0
    const last = merged[merged.length - 1]
    if (COURT_WIDTH - last.to < minGap) last.to = COURT_WIDTH
  }
  return merged
}

function gaps(covered: NetInterval[]): NetInterval[] {
  const result: NetInterval[] = []
  let cursor = 0
  for (const c of covered) {
    if (c.from > cursor) result.push({ from: cursor, to: c.from })
    cursor = c.to
  }
  if (cursor < COURT_WIDTH) result.push({ from: cursor, to: COURT_WIDTH })
  return result
}

function laneKind(gap: NetInterval, contact: Point): LaneKind {
  const touchesLeft = gap.from <= 0
  const touchesRight = gap.to >= COURT_WIDTH
  if (touchesLeft && touchesRight) return 'open'
  if (!touchesLeft && !touchesRight) return 'seam'
  // "Line" runs along the hitter's own sideline; "cross" goes to the far side.
  const hitterOnRight = contact.x >= COURT_WIDTH / 2
  return touchesRight === hitterOnRight ? 'line' : 'cross'
}

/** Area of our court reached by every ray whose net x lies in `interval`. */
function wedge(contact: Point, interval: NetInterval): Point[] {
  return clipPolygonToRect(
    [
      { x: interval.from, y: NET_Y },
      { x: interval.to, y: NET_Y },
      rayPointAt(contact, interval.to, COURT_LENGTH),
      rayPointAt(contact, interval.from, COURT_LENGTH),
    ],
    OUR_COURT,
  )
}
