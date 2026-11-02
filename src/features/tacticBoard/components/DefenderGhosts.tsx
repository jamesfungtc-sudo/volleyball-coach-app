import type { DefenderTarget } from '../engine/defenders'
import type { BoardIcon } from '../state/boardState'
import { PLAYER_RADIUS } from './BoardIconView'

/** Ghosts closer than this to the player are hidden; they'd just sit underneath the icon. */
const MIN_OFFSET = 0.3

interface DefenderGhostsProps {
  defenders: BoardIcon[]
  suggestions: Map<string, DefenderTarget>
}

/** Suggested spot for each hand-placed defender: a dashed outline joined to the player. */
export function DefenderGhosts({ defenders, suggestions }: DefenderGhostsProps) {
  return (
    <g pointerEvents="none" aria-hidden="true">
      {defenders.map(icon => {
        const target = suggestions.get(icon.id)
        if (!target) return null
        const { x, y } = target.point
        if (Math.hypot(x - icon.x, y - icon.y) < MIN_OFFSET) return null
        return (
          <g key={icon.id}>
            <line
              x1={icon.x}
              y1={icon.y}
              x2={x}
              y2={y}
              stroke="hsl(var(--team-home))"
              strokeWidth={0.04}
              strokeDasharray="0.1 0.1"
              opacity={0.8}
            />
            <circle
              cx={x}
              cy={y}
              r={PLAYER_RADIUS}
              fill="hsl(var(--team-home) / 0.25)"
              stroke="hsl(var(--team-home))"
              strokeWidth={0.05}
              strokeDasharray="0.12 0.08"
            />
            <text
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={0.32}
              fontWeight={700}
              fill="hsl(0 0% 100%)"
              opacity={0.9}
              style={{ userSelect: 'none' }}
            >
              {icon.label}
            </text>
          </g>
        )
      })}
    </g>
  )
}
