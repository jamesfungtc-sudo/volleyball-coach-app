import { COURT_LENGTH, COURT_WIDTH, NET_Y, type Point } from './court'
import { BLOCK_ZONE_DEPTH, type DefenceAnalysis, type LaneKind } from './defence'
import { clipPolygonToRect, polygonArea, polygonCentroid } from './geometry'
import { rollZones, tipZone } from './hitZones'

// Suggested defender spots (heuristic, first pass):
//   1. One digger per open lane, biggest lane first, standing in the lane at digging depth.
//   2. Then tip cover (short, behind the block), then roll cover (in the shadow, mid-depth).
//   3. Then deep middle as a fallback, so a single block still places every defender.
// Defenders are matched to spots by the shortest total distance, so nobody crosses the court.

export type TargetKind = LaneKind | 'tip' | 'roll' | 'base'

export interface DefenderTarget {
  kind: TargetKind
  point: Point
}

/** Back-court band where diggers stand to play hard-driven balls (metres from the net). */
export const DIG_DEPTH = { from: 3.5, to: 8.3 }
/** Lanes smaller than this (m²) aren't worth a dedicated digger. */
export const MIN_LANE_AREA = 1
/** Keep suggested spots this far inside the lines. */
const EDGE_MARGIN = 0.5
/** Nearest a defender is placed to the net: clear of the block zone, or they'd count as a blocker. */
const MIN_DEFENDER_DEPTH = BLOCK_ZONE_DEPTH + 0.5
const DEEP_MIDDLE: Point = { x: COURT_WIDTH / 2, y: COURT_LENGTH - 1.5 }

export function defenderTargets(analysis: DefenceAnalysis): DefenderTarget[] {
  const digBand = { x: 0, y: NET_Y + DIG_DEPTH.from, width: COURT_WIDTH, height: DIG_DEPTH.to - DIG_DEPTH.from }

  const laneTargets = analysis.lanes
    .filter(lane => polygonArea(lane.polygon) >= MIN_LANE_AREA)
    .sort((a, b) => polygonArea(b.polygon) - polygonArea(a.polygon))
    .map(lane => {
      const inBand = clipPolygonToRect(lane.polygon, digBand)
      const area = inBand.length >= 3 ? inBand : lane.polygon
      return { kind: lane.kind, point: polygonCentroid(area) }
    })

  const targets: DefenderTarget[] = [...laneTargets]
  if (analysis.shadows.length) {
    targets.push({ kind: 'tip', point: polygonCentroid(tipZone(analysis)) })
    const largestRoll = rollZones(analysis).sort((a, b) => polygonArea(b) - polygonArea(a))[0]
    if (largestRoll) targets.push({ kind: 'roll', point: polygonCentroid(largestRoll) })
  }
  targets.push({ kind: 'base', point: DEEP_MIDDLE })

  return targets.map(t => ({ ...t, point: insideCourt(t.point) }))
}

export interface Defender extends Point {
  id: string
}

/**
 * Give the first `defenders.length` targets to defenders, choosing the matching with the least
 * total distance. Returns a target per defender id; defenders beyond the target count get none.
 */
export function assignDefenders(defenders: Defender[], targets: DefenderTarget[]): Map<string, DefenderTarget> {
  const chosen = targets.slice(0, defenders.length)
  let best: { cost: number; picks: number[] } = { cost: Infinity, picks: [] }

  // At most 6 defenders, so trying every matching is cheap (≤ 720).
  const picks: number[] = []
  const used = new Set<number>()
  ;(function search(t: number, cost: number) {
    if (cost >= best.cost) return
    if (t === chosen.length) {
      best = { cost, picks: [...picks] }
      return
    }
    for (let d = 0; d < defenders.length; d++) {
      if (used.has(d)) continue
      used.add(d)
      picks.push(d)
      search(t + 1, cost + Math.hypot(defenders[d].x - chosen[t].point.x, defenders[d].y - chosen[t].point.y))
      picks.pop()
      used.delete(d)
    }
  })(0, 0)

  return new Map(best.picks.map((d, t) => [defenders[d].id, chosen[t]]))
}

export function suggestDefence(analysis: DefenceAnalysis, defenders: Defender[]): Map<string, DefenderTarget> {
  return assignDefenders(defenders, defenderTargets(analysis))
}

function insideCourt(p: Point): Point {
  return {
    x: Math.min(COURT_WIDTH - EDGE_MARGIN, Math.max(EDGE_MARGIN, p.x)),
    y: Math.min(COURT_LENGTH - EDGE_MARGIN, Math.max(NET_Y + MIN_DEFENDER_DEPTH, p.y)),
  }
}
