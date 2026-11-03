import type { Point, Rect } from './court'

/** Sutherland–Hodgman clip of a polygon against an axis-aligned rectangle. */
export function clipPolygonToRect(polygon: Point[], rect: Rect): Point[] {
  const minX = rect.x
  const maxX = rect.x + rect.width
  const minY = rect.y
  const maxY = rect.y + rect.height

  type Edge = { inside: (p: Point) => boolean; intersect: (a: Point, b: Point) => Point }
  const atX = (x: number) => (a: Point, b: Point) => ({ x, y: a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x) })
  const atY = (y: number) => (a: Point, b: Point) => ({ x: a.x + ((b.x - a.x) * (y - a.y)) / (b.y - a.y), y })
  const edges: Edge[] = [
    { inside: p => p.x >= minX, intersect: atX(minX) },
    { inside: p => p.x <= maxX, intersect: atX(maxX) },
    { inside: p => p.y >= minY, intersect: atY(minY) },
    { inside: p => p.y <= maxY, intersect: atY(maxY) },
  ]

  let output = polygon
  for (const edge of edges) {
    const input = output
    output = []
    for (let i = 0; i < input.length; i++) {
      const current = input[i]
      const previous = input[(i + input.length - 1) % input.length]
      if (edge.inside(current)) {
        if (!edge.inside(previous)) output.push(edge.intersect(previous, current))
        output.push(current)
      } else if (edge.inside(previous)) {
        output.push(edge.intersect(previous, current))
      }
    }
    if (output.length === 0) break
  }
  return output
}

/** Unsigned area (shoelace formula). */
export function polygonArea(polygon: Point[]): number {
  let twice = 0
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]
    const b = polygon[(i + 1) % polygon.length]
    twice += a.x * b.y - b.x * a.y
  }
  return Math.abs(twice) / 2
}

/** Area centroid; falls back to the vertex average for degenerate polygons. */
export function polygonCentroid(polygon: Point[]): Point {
  let twice = 0
  let cx = 0
  let cy = 0
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]
    const b = polygon[(i + 1) % polygon.length]
    const cross = a.x * b.y - b.x * a.y
    twice += cross
    cx += (a.x + b.x) * cross
    cy += (a.y + b.y) * cross
  }
  if (Math.abs(twice) < 1e-9) {
    const n = polygon.length || 1
    return {
      x: polygon.reduce((s, p) => s + p.x, 0) / n,
      y: polygon.reduce((s, p) => s + p.y, 0) / n,
    }
  }
  return { x: cx / (3 * twice), y: cy / (3 * twice) }
}

/** Ray-casting point-in-polygon test (points on an edge may go either way). */
export function pointInPolygon(p: Point, polygon: Point[]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]
    const b = polygon[j]
    if (a.y > p.y !== b.y > p.y && p.x < a.x + ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y)) inside = !inside
  }
  return inside
}
