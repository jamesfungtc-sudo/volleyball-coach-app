import type { Point } from '../engine/court'
import { smoothPath } from '../engine/drawing'
import type { Drawing } from '../state/boardState'

const INK_WIDTH = 0.09
const OUTLINE_WIDTH = 0.17
const HEAD_LENGTH = 0.42
const HEAD_HALF_WIDTH = 0.24

interface DrawLayerProps {
  drawings: Drawing[]
  /** Stroke being drawn right now, if any. */
  draft: Drawing | null
}

/** Coach's lines and arrows: bright ink over a dark outline so they read on every zone colour. */
export function DrawLayer({ drawings, draft }: DrawLayerProps) {
  const all = draft ? [...drawings, draft] : drawings
  return (
    <g pointerEvents="none" aria-hidden="true" strokeLinecap="round" strokeLinejoin="round" fill="none">
      {all.map(drawing => (
        <g key={drawing.id}>
          <Shape drawing={drawing} stroke="hsl(var(--tb-ink-outline))" width={OUTLINE_WIDTH} />
          <Shape drawing={drawing} stroke="hsl(var(--tb-ink))" width={INK_WIDTH} />
        </g>
      ))}
    </g>
  )
}

function Shape({ drawing, stroke, width }: { drawing: Drawing; stroke: string; width: number }) {
  if (drawing.kind === 'pen') {
    return <path d={smoothPath(drawing.points)} stroke={stroke} strokeWidth={width} />
  }
  const [tail, head] = drawing.points
  if (!tail || !head) return null
  const { shaftEnd, wings } = arrowHead(tail, head)
  return (
    <>
      <line x1={tail.x} y1={tail.y} x2={shaftEnd.x} y2={shaftEnd.y} stroke={stroke} strokeWidth={width} />
      <polygon points={wings.map(p => `${p.x},${p.y}`).join(' ')} fill={stroke} stroke={stroke} strokeWidth={width} />
    </>
  )
}

/** Triangle at `head`, plus where the shaft should stop so it doesn't poke through the tip. */
function arrowHead(tail: Point, head: Point) {
  const length = Math.hypot(head.x - tail.x, head.y - tail.y) || 1
  const ux = (head.x - tail.x) / length
  const uy = (head.y - tail.y) / length
  const headLength = Math.min(HEAD_LENGTH, length * 0.6)
  const base = { x: head.x - ux * headLength, y: head.y - uy * headLength }
  return {
    shaftEnd: base,
    wings: [
      head,
      { x: base.x - uy * HEAD_HALF_WIDTH, y: base.y + ux * HEAD_HALF_WIDTH },
      { x: base.x + uy * HEAD_HALF_WIDTH, y: base.y - ux * HEAD_HALF_WIDTH },
    ],
  }
}
