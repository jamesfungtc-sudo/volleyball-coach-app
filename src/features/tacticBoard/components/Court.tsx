import {
  ANTENNA_X,
  BOARD_BOUNDS,
  ATTACK_LINE_DISTANCE,
  ATTACK_LINE_EXTENSION,
  COURT_LENGTH,
  COURT_WIDTH,
  LINE_WIDTH,
  NET_Y,
} from '../engine/court'

const HALF_LINE = LINE_WIDTH / 2
const FLOOR_BLEED = 40
const line = 'hsl(var(--tb-line))'

/** Static court surface and markings, drawn in metres. Lines sit inside the 9 × 18 m area they bound. */
export function Court() {
  // The 3 m is measured from the centre-line axis to the rear edge of each attack line.
  const attackLineYs = [NET_Y - ATTACK_LINE_DISTANCE + HALF_LINE, NET_Y + ATTACK_LINE_DISTANCE - HALF_LINE]
  const { dash, gap, count } = ATTACK_LINE_EXTENSION
  const extensionLength = count * dash + (count - 1) * gap

  return (
    <g aria-hidden="true">
      {/* Oversized so the floor still fills the screen when the view is widened to fit it. */}
      <rect
        x={BOARD_BOUNDS.x - FLOOR_BLEED}
        y={BOARD_BOUNDS.y - FLOOR_BLEED}
        width={BOARD_BOUNDS.width + FLOOR_BLEED * 2}
        height={BOARD_BOUNDS.height + FLOOR_BLEED * 2}
        fill="hsl(var(--tb-free-zone))"
      />
      <rect x={0} y={0} width={COURT_WIDTH} height={COURT_LENGTH} fill="hsl(var(--tb-court))" />

      <g stroke={line} strokeWidth={LINE_WIDTH} fill="none">
        <rect
          x={HALF_LINE}
          y={HALF_LINE}
          width={COURT_WIDTH - LINE_WIDTH}
          height={COURT_LENGTH - LINE_WIDTH}
        />
        <line x1={0} y1={NET_Y} x2={COURT_WIDTH} y2={NET_Y} />
        {attackLineYs.map(y => (
          <g key={y}>
            <line x1={0} y1={y} x2={COURT_WIDTH} y2={y} />
            <line
              x1={-gap}
              y1={y}
              x2={-gap - extensionLength}
              y2={y}
              strokeDasharray={`${dash} ${gap}`}
            />
            <line
              x1={COURT_WIDTH + gap}
              y1={y}
              x2={COURT_WIDTH + gap + extensionLength}
              y2={y}
              strokeDasharray={`${dash} ${gap}`}
            />
          </g>
        ))}
      </g>

      <Net />
    </g>
  )
}

function Net() {
  const postOffset = 1
  return (
    <g>
      <line
        x1={-postOffset}
        y1={NET_Y}
        x2={COURT_WIDTH + postOffset}
        y2={NET_Y}
        stroke="hsl(var(--tb-net))"
        strokeWidth={0.1}
        strokeLinecap="round"
      />
      {[-postOffset, COURT_WIDTH + postOffset].map(x => (
        <circle key={x} cx={x} cy={NET_Y} r={0.12} fill="hsl(var(--tb-net))" />
      ))}
      {ANTENNA_X.map(x => (
        <circle
          key={x}
          cx={x}
          cy={NET_Y}
          r={0.07}
          fill="hsl(0 80% 55%)"
          stroke="hsl(0 0% 100%)"
          strokeWidth={0.03}
        />
      ))}
    </g>
  )
}
