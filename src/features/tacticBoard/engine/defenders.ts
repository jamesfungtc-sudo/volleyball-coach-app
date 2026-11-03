import { COURT_LENGTH, COURT_WIDTH, NET_Y, type Point } from './court'
import { BLOCK_ZONE_DEPTH, rayPointAt, type DefenceAnalysis, type Lane } from './defence'
import { clipPolygonToRect, polygonArea, polygonCentroid } from './geometry'

// Suggested defender spots for a chosen defensive system.
//
// Each system gives the non-blockers a list of jobs with a textbook spot, written for an attack
// from our right (mirrored for an attack from our left). The block shadow then adjusts the spots:
//   - Line and cross diggers stand just outside the shadow, where they can see the hitter.
//   - The tip player tucks in behind wherever the block actually is.
//   - The seam player moves into the seam when the block splits.
// Jobs are listed in priority order: with fewer defenders (a triple block) the last job is dropped,
// with more (a single block) the extra job is used. Players get jobs by least total distance.

export type DefenceSystem = 'perimeter' | 'rotational'

export type RoleKind = 'line' | 'deepLine' | 'deepCross' | 'sharpCross' | 'deepMiddle' | 'tip'

export interface DefenderTarget {
  kind: RoleKind
  point: Point
  /** True when the role moved into a seam between split blockers. */
  inSeam?: boolean
}

interface Role {
  kind: RoleKind
  /** Textbook spot against an attack from our right: x across, depth = metres from the net. */
  spot: { x: number; depth: number }
  /** Digger who stands on the edge of the shadow on this side. */
  lane?: 'line' | 'cross'
  /** Moves into the seam when the block splits. */
  takesSeam?: boolean
}

export const SYSTEM_ROLES: Record<DefenceSystem, Role[]> = {
  // Everyone not blocking spreads to the edges; the block takes the middle. Nobody is set for tips.
  perimeter: [
    { kind: 'line', spot: { x: 8.3, depth: 6.2 }, lane: 'line' },
    { kind: 'deepCross', spot: { x: 1.0, depth: 7.2 }, lane: 'cross' },
    { kind: 'deepMiddle', spot: { x: 4.6, depth: 8.3 }, takesSeam: true },
    { kind: 'sharpCross', spot: { x: 1.0, depth: 3.6 }, lane: 'cross' },
    { kind: 'tip', spot: { x: 6.5, depth: 2.6 } },
  ],
  // The back row rotates toward the attack: line player up for tips, middle back to the deep line.
  rotational: [
    { kind: 'tip', spot: { x: 7.4, depth: 2.6 } },
    { kind: 'deepLine', spot: { x: 8.2, depth: 8.2 }, lane: 'line' },
    { kind: 'deepCross', spot: { x: 3.0, depth: 7.6 }, lane: 'cross', takesSeam: true },
    { kind: 'sharpCross', spot: { x: 1.0, depth: 3.4 }, lane: 'cross' },
    { kind: 'deepMiddle', spot: { x: 4.5, depth: 8.3 } },
  ],
}

/** Back-court band where a seam digger stands (metres from the net). */
export const DIG_DEPTH = { from: 3.5, to: 8.3 }
/** Seams smaller than this (m²) aren't worth moving a digger for. */
export const MIN_SEAM_AREA = 1
/** How far outside the shadow edge a digger stands, so they can see the hitter's arm. */
export const SHADOW_EDGE_MARGIN = 0.5
/**
 * Most a digger is moved to get out of the shadow. When the block takes away nearly all of a
 * lane, the digger stays close to their textbook spot instead of being pushed onto a sideline.
 */
export const MAX_SHADOW_NUDGE = 1.5
/** How far the tip player stands toward the middle from the centre of the block. */
const TIP_INSIDE_OFFSET = 0.6
/** Keep suggested spots this far inside the lines. */
const EDGE_MARGIN = 0.5
/** Nearest a defender is placed to the net: clear of the block zone, or they'd count as a blocker. */
const MIN_DEFENDER_DEPTH = BLOCK_ZONE_DEPTH + 0.5

export function systemTargets(analysis: DefenceAnalysis, system: DefenceSystem): DefenderTarget[] {
  const attackFromRight = analysis.contact.x >= COURT_WIDTH / 2
  const seam = widestSeam(analysis.lanes)

  return SYSTEM_ROLES[system].map(role => {
    const x = attackFromRight ? role.spot.x : COURT_WIDTH - role.spot.x
    let point = { x, y: NET_Y + role.spot.depth }
    let inSeam = false

    if (role.takesSeam && seam) {
      point = seamSpot(seam)
      inSeam = true
    } else if (role.kind === 'tip' && analysis.shadows.length) {
      point = tipSpot(analysis, role.spot.depth)
    } else if (role.lane) {
      point = outOfShadow(analysis, point, role.lane, attackFromRight)
    }
    return { kind: role.kind, point: insideCourt(point), ...(inSeam && { inSeam }) }
  })
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

export function suggestDefence(
  analysis: DefenceAnalysis,
  defenders: Defender[],
  system: DefenceSystem,
): Map<string, DefenderTarget> {
  return assignDefenders(defenders, systemTargets(analysis, system))
}

function widestSeam(lanes: Lane[]): Lane | undefined {
  return lanes
    .filter(lane => lane.kind === 'seam' && polygonArea(lane.polygon) >= MIN_SEAM_AREA)
    .sort((a, b) => b.to - b.from - (a.to - a.from))[0]
}

function seamSpot(seam: Lane): Point {
  const band = { x: 0, y: NET_Y + DIG_DEPTH.from, width: COURT_WIDTH, height: DIG_DEPTH.to - DIG_DEPTH.from }
  const inBand = clipPolygonToRect(seam.polygon, band)
  return polygonCentroid(inBand.length >= 3 ? inBand : seam.polygon)
}

/** Just behind the block, shaded toward the middle of the court. */
function tipSpot(analysis: DefenceAnalysis, depth: number): Point {
  const from = Math.min(...analysis.shadows.map(s => s.from))
  const to = Math.max(...analysis.shadows.map(s => s.to))
  const centre = (from + to) / 2
  const towardMiddle = centre > COURT_WIDTH / 2 ? -TIP_INSIDE_OFFSET : TIP_INSIDE_OFFSET
  return { x: centre + towardMiddle, y: NET_Y + depth }
}

/** If the spot is inside a block shadow, slide it sideways to just outside the edge on the lane's side. */
function outOfShadow(analysis: DefenceAnalysis, p: Point, lane: 'line' | 'cross', attackFromRight: boolean): Point {
  // The line runs along the hitter's sideline; cross goes the other way.
  const towardRight = lane === 'line' ? attackFromRight : !attackFromRight
  for (const shadow of analysis.shadows) {
    const a = rayPointAt(analysis.contact, shadow.from, p.y).x
    const b = rayPointAt(analysis.contact, shadow.to, p.y).x
    const left = Math.min(a, b)
    const right = Math.max(a, b)
    if (p.x < left || p.x > right) continue
    const edge = towardRight ? right + SHADOW_EDGE_MARGIN : left - SHADOW_EDGE_MARGIN
    const shift = Math.max(-MAX_SHADOW_NUDGE, Math.min(MAX_SHADOW_NUDGE, edge - p.x))
    return { x: p.x + shift, y: p.y }
  }
  return p
}

function insideCourt(p: Point): Point {
  return {
    x: Math.min(COURT_WIDTH - EDGE_MARGIN, Math.max(EDGE_MARGIN, p.x)),
    y: Math.min(COURT_LENGTH - EDGE_MARGIN, Math.max(NET_Y + MIN_DEFENDER_DEPTH, p.y)),
  }
}
