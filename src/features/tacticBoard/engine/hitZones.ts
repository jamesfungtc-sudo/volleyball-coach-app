import { COURT_LENGTH, COURT_WIDTH, NET_Y, type Point } from './court'
import type { DefenceAnalysis } from './defence'
import { clipPolygonToRect } from './geometry'

// Where each type of attack can land, built on top of the block shadow.
//   Hard: through the open lanes (line, cross, seams) at any depth — that's the lanes themselves.
//   Roll: arcs over the block and drops into the shadow, mid-depth.
//   Tip:  pushed short, around and just behind the block.
// Depths are metres from the net. First-pass constants, to tune with real footage.

export type HitType = 'hard' | 'roll' | 'tip'

export const ROLL_DEPTH = { from: 2, to: 6 }
export const TIP_DEPTH = 3
/** How far either side of the block a tip can be placed. */
export const TIP_SPREAD = 1.5

/** Parts of the block shadow a roll shot can drop into. */
export function rollZones(analysis: DefenceAnalysis): Point[][] {
  const band = {
    x: 0,
    y: NET_Y + ROLL_DEPTH.from,
    width: COURT_WIDTH,
    height: ROLL_DEPTH.to - ROLL_DEPTH.from,
  }
  return analysis.shadows
    .map(shadow => clipPolygonToRect(shadow.polygon, band))
    .filter(polygon => polygon.length >= 3)
}

/** Short area around the block; with no block a tip can go anywhere short. */
export function tipZone(analysis: DefenceAnalysis): Point[] {
  const { shadows } = analysis
  const from = shadows.length ? Math.min(...shadows.map(s => s.from)) - TIP_SPREAD : 0
  const to = shadows.length ? Math.max(...shadows.map(s => s.to)) + TIP_SPREAD : COURT_WIDTH
  const x = Math.max(0, from)
  const width = Math.min(COURT_WIDTH, to) - x
  const depth = Math.min(TIP_DEPTH, COURT_LENGTH - NET_Y)
  return [
    { x, y: NET_Y },
    { x: x + width, y: NET_Y },
    { x: x + width, y: NET_Y + depth },
    { x, y: NET_Y + depth },
  ]
}
