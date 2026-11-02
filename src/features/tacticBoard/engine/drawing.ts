import type { Point } from './court'

/** Pen samples closer together than this (m) are dropped, keeping paths light. */
export const PEN_MIN_STEP = 0.06
/** Strokes shorter than this (m) are treated as accidental taps and discarded. */
export const MIN_STROKE_LENGTH = 0.25

/** Add a pen sample unless it's too close to the previous one. */
export function appendPenPoint(points: Point[], p: Point): Point[] {
  const last = points[points.length - 1]
  if (last && Math.hypot(p.x - last.x, p.y - last.y) < PEN_MIN_STEP) return points
  return [...points, p]
}

export function pathLength(points: Point[]): number {
  let length = 0
  for (let i = 1; i < points.length; i++) {
    length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
  }
  return length
}

export function isMeaningfulStroke(points: Point[]): boolean {
  return points.length >= 2 && pathLength(points) >= MIN_STROKE_LENGTH
}

/** SVG path for a stroke, using quadratic curves through midpoints so freehand lines look smooth. */
export function smoothPath(points: Point[]): string {
  if (points.length === 0) return ''
  if (points.length < 3) return points.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ')
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length - 1; i++) {
    const mid = { x: (points[i].x + points[i + 1].x) / 2, y: (points[i].y + points[i + 1].y) / 2 }
    d += ` Q ${points[i].x} ${points[i].y} ${mid.x} ${mid.y}`
  }
  const end = points[points.length - 1]
  return `${d} L ${end.x} ${end.y}`
}
