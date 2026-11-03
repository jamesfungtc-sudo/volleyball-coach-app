import type { PointerEvent } from 'react'
import type { BlockSize } from '../engine/defence'
import type { BoardIcon } from '../state/boardState'

/**
 * Sized so two medium or large blocker icons that touch (centres 2r apart) leave a hand gap smaller
 * than the ball: 2r - BLOCK_WIDTH < BALL_DIAMETER, so "icons touching = closed block". Small hands
 * leave a seam when merely touching, as they would on court. Revisit if BLOCK_SIZES change.
 */
export const PLAYER_RADIUS = 0.34
export const BALL_RADIUS = 0.2
/** Invisible hit area so icons stay easy to grab with a finger at phone scale. */
const TOUCH_RADIUS = 0.65

interface BoardIconViewProps {
  icon: BoardIcon
  isHitter: boolean
  isDragging: boolean
  /** Shown as a badge on players at the net. */
  blockSize?: BlockSize
  onPointerDown: (e: PointerEvent<SVGGElement>, icon: BoardIcon) => void
}

export function BoardIconView({ icon, isHitter, isDragging, blockSize, onPointerDown }: BoardIconViewProps) {
  return (
    <g
      // CSS transform (px = user units inside SVG) so auto-placed defenders glide rather than jump.
      className={isDragging ? undefined : 'motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out'}
      onPointerDown={e => onPointerDown(e, icon)}
      style={{ transform: `translate(${icon.x}px, ${icon.y}px)`, cursor: isDragging ? 'grabbing' : 'grab' }}
      role="button"
      aria-label={iconLabel(icon, isHitter)}
    >
      <circle r={TOUCH_RADIUS} fill="transparent" />
      {isDragging && <circle r={TOUCH_RADIUS * 0.9} fill="hsl(0 0% 100% / 0.25)" />}
      {icon.kind === 'ball' ? <Ball /> : <Player icon={icon} isHitter={isHitter} />}
      {blockSize && <SizeBadge size={blockSize} />}
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
        // iOS Safari ignores dominant-baseline; dy centres cap-height digits and letters everywhere.
        dy="0.35em"
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

const BADGE_RADIUS = 0.16

function SizeBadge({ size }: { size: BlockSize }) {
  const at = PLAYER_RADIUS * 0.8
  return (
    <g transform={`translate(${at} ${-at})`} style={{ pointerEvents: 'none' }}>
      <circle r={BADGE_RADIUS} fill="hsl(0 0% 100%)" stroke="hsl(var(--team-home))" strokeWidth={0.03} />
      <text textAnchor="middle" dy="0.35em" fontSize={0.2} fontWeight={800} fill="hsl(var(--team-home))" style={{ userSelect: 'none' }}>
        {size[0].toUpperCase()}
      </text>
    </g>
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
  const block = icon.kind === 'home' && icon.blockSize ? `, ${icon.blockSize} block` : ''
  return `${team} player ${icon.label}${isHitter ? ' (hitter)' : ''}${block}`
}
