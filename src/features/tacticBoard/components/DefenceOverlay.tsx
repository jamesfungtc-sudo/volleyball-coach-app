import { COURT_WIDTH, NET_Y, type Point } from '../engine/court'
import { BLOCK_WIDTH, type DefenceAnalysis, type LaneKind } from '../engine/defence'
import { polygonArea, polygonCentroid } from '../engine/geometry'
import { rollZones, tipZone } from '../engine/hitZones'
import type { HitView } from '../state/boardState'

const LANE_FILL: Record<LaneKind, string> = {
  line: 'hsl(var(--tb-lane))',
  cross: 'hsl(var(--tb-lane))',
  open: 'hsl(var(--tb-lane))',
  seam: 'hsl(var(--tb-seam))',
}

/** Lanes smaller than this (m²) are too thin to label legibly. */
const MIN_LABELLED_AREA = 0.6
const LABEL_INSET = 0.8
/** Hard-hit lanes stay faintly visible behind the roll/tip zones for context. */
const BACKGROUND_LANE_OPACITY = 0.35

interface DefenceOverlayProps {
  analysis: DefenceAnalysis
  hitView: HitView
  labelScale?: number
}

/** Block shadow and attack landing zones on our court, plus the sight lines from the hitter to the block edges. */
export function DefenceOverlay({ analysis, hitView, labelScale = 1 }: DefenceOverlayProps) {
  const { contact } = analysis
  const edges = analysis.shadows.flatMap(s => [s.from, s.to])
  const showHard = hitView === 'hard' || hitView === 'all'
  const rolls = hitView === 'roll' || hitView === 'all' ? rollZones(analysis) : []
  const tip = hitView === 'tip' || hitView === 'all' ? tipZone(analysis) : null

  return (
    <g pointerEvents="none" aria-hidden="true">
      <g opacity={showHard ? 1 : BACKGROUND_LANE_OPACITY}>
        {analysis.lanes.map(lane => (
          <polygon key={`lane-${lane.from}`} points={toPoints(lane.polygon)} fill={LANE_FILL[lane.kind]} />
        ))}
      </g>
      {analysis.shadows.map(shadow => (
        <polygon key={`shadow-${shadow.from}`} points={toPoints(shadow.polygon)} fill="hsl(var(--tb-shadow))" />
      ))}

      {rolls.map((zone, i) => (
        <Zone key={`roll-${i}`} polygon={zone} color="--tb-roll" />
      ))}
      {tip && <Zone polygon={tip} color="--tb-tip" />}

      <g stroke="hsl(var(--tb-sight-line))" strokeWidth={0.035} strokeDasharray="0.15 0.12">
        {edges.map(x => (
          <line key={x} x1={contact.x} y1={contact.y} x2={x} y2={NET_Y} />
        ))}
      </g>

      {showHard &&
        analysis.lanes.map(lane =>
          polygonArea(lane.polygon) < MIN_LABELLED_AREA ? null : (
            <Label key={`label-${lane.from}`} at={polygonCentroid(lane.polygon)} text={lane.kind.toUpperCase()} scale={labelScale} />
          ),
        )}
      {rolls.map((zone, i) =>
        polygonArea(zone) < MIN_LABELLED_AREA ? null : (
          <Label key={`roll-label-${i}`} at={polygonCentroid(zone)} text="ROLL" scale={labelScale} />
        ),
      )}
      {tip && <Label at={polygonCentroid(tip)} text="TIP" scale={labelScale} />}
    </g>
  )
}

function Zone({ polygon, color }: { polygon: Point[]; color: string }) {
  return (
    <polygon
      points={toPoints(polygon)}
      fill={`hsl(var(${color}-fill))`}
      stroke={`hsl(var(${color}-stroke))`}
      strokeWidth={0.05}
      strokeDasharray="0.18 0.1"
      strokeLinejoin="round"
    />
  )
}

function Label({ at, text, scale }: { at: Point; text: string; scale: number }) {
  return (
    <text
      // Narrow edge lanes put the centroid near a sideline; keep the word inside the court.
      x={Math.min(COURT_WIDTH - LABEL_INSET, Math.max(LABEL_INSET, at.x))}
      y={at.y}
      textAnchor="middle"
      dy="0.35em"
      fontSize={0.42 * scale}
      fontWeight={700}
      letterSpacing={0.04}
      fill="hsl(0 0% 100%)"
      stroke="hsl(222 47% 7% / 0.55)"
      strokeWidth={0.08 * scale}
      paintOrder="stroke"
      style={{ userSelect: 'none' }}
    >
      {text}
    </text>
  )
}

/** Each blocker's hands drawn on the net, so the covered width is visible. */
export function BlockerHands({ blockerXs }: { blockerXs: number[] }) {
  return (
    <g pointerEvents="none" aria-hidden="true">
      {blockerXs.map((x, i) => (
        <rect
          key={i}
          x={x - BLOCK_WIDTH / 2}
          y={NET_Y - 0.08}
          width={BLOCK_WIDTH}
          height={0.16}
          rx={0.05}
          fill="hsl(var(--team-home))"
          stroke="hsl(0 0% 100%)"
          strokeWidth={0.03}
        />
      ))}
    </g>
  )
}

function toPoints(polygon: Point[]) {
  return polygon.map(p => `${p.x},${p.y}`).join(' ')
}
