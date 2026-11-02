import { COURT_WIDTH, NET_Y, type Point } from '../engine/court'
import { BLOCK_WIDTH, type DefenceAnalysis, type LaneKind } from '../engine/defence'
import { polygonArea, polygonCentroid } from '../engine/geometry'

const LANE_FILL: Record<LaneKind, string> = {
  line: 'hsl(var(--tb-lane))',
  cross: 'hsl(var(--tb-lane))',
  open: 'hsl(var(--tb-lane))',
  seam: 'hsl(var(--tb-seam))',
}

/** Lanes smaller than this (m²) are too thin to label legibly. */
const MIN_LABELLED_AREA = 0.6
const LABEL_INSET = 0.8

interface DefenceOverlayProps {
  analysis: DefenceAnalysis
}

/** Block shadow and open lanes on our court, plus the sight lines from the hitter to the block edges. */
export function DefenceOverlay({ analysis }: DefenceOverlayProps) {
  const { contact } = analysis
  const edges = analysis.shadows.flatMap(s => [s.from, s.to])

  return (
    <g pointerEvents="none" aria-hidden="true">
      {analysis.lanes.map(lane => (
        <polygon key={`lane-${lane.from}`} points={toPoints(lane.polygon)} fill={LANE_FILL[lane.kind]} />
      ))}
      {analysis.shadows.map(shadow => (
        <polygon key={`shadow-${shadow.from}`} points={toPoints(shadow.polygon)} fill="hsl(var(--tb-shadow))" />
      ))}

      <g stroke="hsl(var(--tb-sight-line))" strokeWidth={0.035} strokeDasharray="0.15 0.12">
        {edges.map(x => (
          <line key={x} x1={contact.x} y1={contact.y} x2={x} y2={NET_Y} />
        ))}
      </g>

      {analysis.lanes.map(lane => {
        if (polygonArea(lane.polygon) < MIN_LABELLED_AREA) return null
        const c = polygonCentroid(lane.polygon)
        return (
          <text
            key={`label-${lane.from}`}
            // Narrow edge lanes put the centroid near a sideline; keep the word inside the court.
            x={Math.min(COURT_WIDTH - LABEL_INSET, Math.max(LABEL_INSET, c.x))}
            y={c.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={0.42}
            fontWeight={700}
            letterSpacing={0.04}
            fill="hsl(0 0% 100%)"
            stroke="hsl(222 47% 7% / 0.55)"
            strokeWidth={0.08}
            paintOrder="stroke"
            style={{ userSelect: 'none' }}
          >
            {lane.kind.toUpperCase()}
          </text>
        )
      })}
    </g>
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
