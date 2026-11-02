import type { PointerEvent } from 'react'
import type { BoardIcon } from '../state/boardState'

/**
 * Sized so two blocker icons that touch (centres 2r apart) leave a hand gap smaller than the ball:
 * 2r - BLOCK_WIDTH < BALL_DIAMETER. "Icons touching = closed block" is how coaches read the board.
 * Revisit if BLOCK_WIDTH changes.
 */
export const PLAYER_RADIUS = 0.34
export const BALL_RADIUS = 0.2
/** Invisible hit area so icons stay easy to grab with a finger at phone scale. */
const TOUCH_RADIUS = 0.65

interface BoardIconViewProps {
  icon: BoardIcon
  isHitter: boolean
  isDragging: boolean
  onPointerDown: (e: PointerEvent<SVGGElement>, icon: BoardIcon) => void
}

export function BoardIconView({ icon, isHitter, isDragging, onPointerDown }: BoardIconViewProps) {
  return (
    <g
      transform={`translate(${icon.x} ${icon.y})`}
      onPointerDown={e => onPointerDown(e, icon)}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      role="button"
      aria-label={iconLabel(icon, isHitter)}
    >
      <circle r={TOUCH_RADIUS} fill="transparent" />
      {isDragging && <circle r={TOUCH_RADIUS * 0.9} fill="hsl(0 0% 100% / 0.25)" />}
      {icon.kind === 'ball' ? <Ball /> : <Player icon={icon} isHitter={isHitter} />}
    </g>
  )
}

function Player({ icon, isHitter }: { icon: BoardIcon; isHitter: boolean }) {
  const fill = icon.kind === 'home' ? 'hsl(var(--team-home))' : 'hsl(var(--team-opponent))'
  return (
    <>
      {isHitter && (
        <circle
          r={PLAYER_RADIUS + 0.12}
          fill="none"
          stroke="hsl(var(--team-opponent))"
          strokeWidth={0.06}
          strokeDasharray="0.12 0.08"
        />
      )}
      <circle r={PLAYER_RADIUS} fill={fill} stroke="hsl(0 0% 100%)" strokeWidth={0.05} />
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={0.38}
        fontWeight={700}
        fill="hsl(0 0% 100%)"
        style={{ userSelect: 'none', pointerEvents: 'none' }}
      >
        {icon.label}
      </text>
    </>
  )
}

function Ball() {
  const r = BALL_RADIUS
  return (
    <g stroke="hsl(var(--tb-ball-stroke))" strokeWidth={0.03} fill="none">
      <circle r={r} fill="hsl(var(--tb-ball))" />
      <path d={`M ${-r} 0 Q 0 ${-r * 0.6} ${r} 0`} />
      <path d={`M ${-r * 0.5} ${-r * 0.85} Q ${r * 0.1} 0 ${-r * 0.5} ${r * 0.85}`} />
      <path d={`M ${r * 0.5} ${-r * 0.85} Q ${-r * 0.1} 0 ${r * 0.5} ${r * 0.85}`} />
    </g>
  )
}

function iconLabel(icon: BoardIcon, isHitter: boolean) {
  if (icon.kind === 'ball') return 'Ball'
  const team = icon.kind === 'home' ? 'Home' : 'Opponent'
  return `${team} player ${icon.label}${isHitter ? ' (hitter)' : ''}`
}
