import { COURT_LENGTH, COURT_WIDTH, NET_Y, type Point, type Rect } from './court'
import { clipPolygonToRect } from './geometry'

// 2D block-shadow model.
//
// Every attack is a straight line from the hitter's contact point (projected to the floor) into
// our court, and every such line crosses the net line at exactly one x. So instead of angles we
// describe rays by that "net x". A blocker covers the net x range of its hands; overlapping hand
// ranges merge into one shadow; whatever is left between the antennae (0..9) is an open lane.

/**
 * Width of one blocker's hands + forearms along the net, in metres.
 * NOTE: first guess, to be tuned against real footage — it drives almost every result here.
 * See docs/TACTIC_BOARD_PLAN.md "Open notes".
 */
export const BLOCK_WIDTH = 0.5

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

export interface DefenceAnalysis {
  /** Hitter contact point actually used (kept on the opponent side of the net). */
  contact: Point
  shadows: Shadow[]
  lanes: Lane[]
}

export interface DefenceInput {
  hitter: Point
  /** Centre x of each blocker's hands on the net. */
  blockerXs: number[]
  blockWidth?: number
}

const OUR_COURT: Rect = { x: 0, y: NET_Y, width: COURT_WIDTH, height: COURT_LENGTH - NET_Y }

export function isInBlockZone(p: Point): boolean {
  return p.y >= NET_Y && p.y <= NET_Y + BLOCK_ZONE_DEPTH
}

export function analyseDefence({ hitter, blockerXs, blockWidth = BLOCK_WIDTH }: DefenceInput): DefenceAnalysis {
  const contact = { x: hitter.x, y: Math.min(hitter.y, NET_Y - MIN_HITTER_DISTANCE) }

  const covered = mergeIntervals(
    blockerXs.map(x => ({ from: x - blockWidth / 2, to: x + blockWidth / 2 })),
    BALL_DIAMETER,
  )

  const shadows = covered.map(interval => ({ ...interval, polygon: wedge(contact, interval) }))
  const lanes = gaps(covered).flatMap(gap => {
    const polygon = wedge(contact, gap)
    return polygon.length >= 3 ? [{ ...gap, kind: laneKind(gap, contact), polygon }] : []
  })

  return { contact, shadows: shadows.filter(s => s.polygon.length >= 3), lanes }
}

/** Point where the ray through `netX` lands at depth `y` on our side. */
export function rayPointAt(contact: Point, netX: number, y: number): Point {
  const t = (y - contact.y) / (NET_Y - contact.y)
  return { x: contact.x + (netX - contact.x) * t, y }
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
