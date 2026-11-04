import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent,
} from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { Button } from '@/components/ui/button'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { availableChoices, ballAt, planAttack, type AttackChoice, type AttackPlan } from '../../engine/attack'
import { ATTACK_LINE_DISTANCE, COURT_LENGTH, COURT_WIDTH, LINE_WIDTH, NET_Y, type Point } from '../../engine/court'
import { analyseDefence, BLOCK_SIZES, BLOCK_ZONE_DEPTH, BLOCKER_Y, DEFAULT_BLOCK_SIZE, type BlockSize, type DefenceAnalysis } from '../../engine/defence'
import { rollZones, tipZone } from '../../engine/hitZones'
import {
  ANTENNA_ABOVE_NET,
  ARM_LENGTH,
  blockHandHeight,
  CONTACT_ABOVE_NET_RANGE,
  contactHeight,
  eyeHeight,
  HAND_PENETRATION,
  HEAD_RATIO,
  jumpFor,
  NET_DEPTH,
  NET_HEIGHT,
  parseHslToken,
  PLAYER_HEIGHT,
  SHOULDER_RATIO,
  toWorld,
  type NetKind,
  type Stance,
} from '../../engine/view3d'
import {
  blockersOf,
  isBlocker,
  suggestedDefence,
  type BoardAction,
  type BoardIcon,
  type BoardState,
} from '../../state/boardState'

// First-person 3D view from one of our defenders, built from the same board state as the 2D view.
// Loaded on demand (React.lazy) so three.js only downloads when someone opens it.

const STANCE_OPTIONS: { value: Stance; label: string }[] = [
  { value: 'crouch', label: 'Ready' },
  { value: 'stand', label: 'Standing' },
]

const BALL_RADIUS = 0.105
const BODY_RADIUS = 0.17
const HEAD_RADIUS = 0.12
const SHOULDER_HALF_WIDTH = 0.2
const LIMB_RADIUS = 0.05
const POST_OFFSET = 1
/** Look-around limits and sensitivity. */
const LOOK_RADIANS_PER_PX = 0.005
const MAX_PITCH = 1.2
/**
 * Field of view is set side to side (about what a player takes in), then converted to the vertical
 * angle three.js wants, so a tall phone doesn't end up with a narrow slit. Tall screens are capped
 * to keep the edges from stretching. Pinch zoom scales it.
 */
const HORIZONTAL_FOV = 80
const VERTICAL_FOV = { min: 50, max: 100 }
const ZOOM = { min: 0.35, max: 1.2 }
/**
 * Follow camera, from the defender (metres): it looks at a spot this far ahead of them toward the
 * hitter, at this height, from this far behind them, this high, and a little to their right so
 * their head doesn't hide the hitter. A wider lens than the court views shows the floor around them.
 */
const FOLLOW = { ahead: 1.2, lookHeight: 0.9, behind: 2.6, height: 2.3, side: 0.45, horizontalFov: 68 }
/** Wide views use a longer lens than the eyes, so the court isn't stretched at the edges. */
const WIDE_HORIZONTAL_FOV = 55
const WIDE_VERTICAL_FOV = { min: 35, max: 75 }
/** Share of the view's height the ball sits above the centre. */
const BALL_ABOVE_CENTRE = 0.18
/** One tap of a nudge arrow. */
const NUDGE_STEP = 0.1
/** Pointer travel (CSS px) below which a press is a tap. */
const TAP_SLOP_PX = 6
/** Dragging toward or away from you covers more ground per pixel: the floor is seen at a low angle. */
const DEPTH_DRAG_GAIN = 2.5
/** Hitters stay on their side, at least this far off the net. */
const HITTER_MIN_OFF_NET = 0.2
/** The defender you're looking through stays clear of the block zone, or they'd become a blocker. */
const VIEWER_MIN_OFF_NET = BLOCK_ZONE_DEPTH + 0.3
/** One tap of the contact-height stepper. */
const CONTACT_STEP = 0.05
/** Holding a nudge arrow: wait this long, then repeat at this rate (ms). */
const REPEAT_DELAY = 350
const REPEAT_EVERY = 90
/** Below this a move of your own isn't worth mentioning. */
const MOVED_HINT_MIN = 0.05
/** The hitter's arm swing before contact (seconds, before slow motion). */
const WINDUP = 0.45
/** Playback speeds; slow is the default, for teaching. */
const SPEEDS = [
  { value: 0.5, label: '½× speed' },
  { value: 0.25, label: '¼× speed' },
  { value: 1, label: 'Real speed' },
]
const TRAIL_SAMPLES = 40
const ATTACK_CHOICES: { value: AttackChoice; label: string }[] = [
  { value: 'tip', label: 'Tip' },
  { value: 'roll', label: 'Roll shot' },
  { value: 'hardMe', label: 'Hard: at me' },
  { value: 'hardLeft', label: 'Hard: my left' },
  { value: 'hardRight', label: 'Hard: my right' },
  { value: 'line', label: 'Hard: line' },
  { value: 'cross', label: 'Hard: cross' },
  { value: 'seam', label: 'Hard: seam' },
  { value: 'touch', label: 'Off the block' },
]

/**
 * Where the camera is. 'eyes' is the defender's own view; 'follow' is a third-person camera just
 * behind them (their body in view, and the floor round them). The rest are wide views of the court.
 * All but 'eyes' orbit on drag and zoom on pinch.
 */
type CameraMode = 'eyes' | 'follow' | 'behind' | 'side' | 'hitter' | 'above'
const CAMERA_OPTIONS: { value: CameraMode; label: string }[] = [
  { value: 'eyes', label: 'Eyes' },
  { value: 'follow', label: 'Follow' },
  { value: 'behind', label: 'Behind' },
  { value: 'side', label: 'Side' },
  { value: 'hitter', label: 'Hitter' },
  { value: 'above', label: 'Above' },
]

interface AttackRunState {
  id: number
  plan: AttackPlan
  finished: boolean
}
/** Below this the Auto D spot isn't worth mentioning. */
const AUTO_SPOT_HINT_MIN = 0.25
/** Invisible grab area round a movable player, so they're easy to tap from across the court. */
const GRAB_RADIUS = 0.45

interface Grab {
  id: string
  pointerId: number
  /** Opponents other than the hitter can't be dragged; a tap makes them the hitter. */
  tapOnly: boolean
}

/** Stepping a blocker back off the net puts them this far behind the block zone. */
const OFF_NET_STEP_BACK = 0.6
const NET_OPTIONS: { value: NetKind; label: string }[] = [
  { value: 'men', label: "Men's" },
  { value: 'women', label: "Women's" },
]

interface Viewer3DProps {
  state: BoardState
  dispatch: Dispatch<BoardAction>
  viewerId: string
  onChangeViewer: (id: string) => void
  onClose: () => void
}

export default function Viewer3D({ state, dispatch, viewerId, onChangeViewer, onClose }: Viewer3DProps) {
  const [stance, setStance] = useState<Stance>('crouch')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const grab = useRef<Grab | null>(null)
  const camera = useRef<THREE.PerspectiveCamera | null>(null)
  const stage = useRef<HTMLDivElement>(null)
  const stateRef = useRef(state)
  stateRef.current = state

  const movedSelf = useHoldViewer(viewerId, stateRef, dispatch)
  // A new hitter is a new play, so "You moved" counts from where Auto D puts you for it.
  const start = useStartSpot(viewerId, state.hitterId, stateRef)

  const hitter = state.icons.find(icon => icon.id === state.hitterId)
  const blockers = useMemo(() => blockersOf(state.icons), [state.icons])
  const analysis = useMemo(() => (hitter ? analyseDefence({ hitter, blockers }) : null), [hitter, blockers])
  const [run, setRun] = useState<AttackRunState | null>(null)
  const [speedIndex, setSpeedIndex] = useState(0)
  const [chooserOpen, setChooserOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  // Changing the camera keeps the attack, so "Again" replays the same hit from the new angle.
  const [cameraMode, setCameraMode] = useState<CameraMode>('eyes')
  const wide = cameraMode !== 'eyes'
  // Eyes and Follow are about the defender ("you", "Hard: at me"); the court views name them.
  const aboutYou = cameraMode === 'eyes' || cameraMode === 'follow'
  // Anything that changes the play makes the last attack stale.
  useEffect(() => setRun(null), [state.icons, state.hitterId, state.net, state.contactAboveNet, viewerId])
  const viewerIcon = state.icons.find(icon => icon.id === viewerId)
  const movable = [
    ...(viewerIcon ? [viewerIcon] : []),
    ...(hitter ? [hitter] : []),
    ...state.icons.filter(isBlocker).sort((a, b) => a.x - b.x),
  ]
  const selected = state.icons.find(icon => icon.id === selectedId && (icon.kind === 'home' || icon.id === state.hitterId))

  /**
   * Move a player by a board-space step. The hitter stays on their side and you stay clear of the
   * block zone. Our players can go anywhere on our side: into the block zone they become blockers
   * (snapping onto the net when let go), out of it they stop blocking.
   */
  const moveBy = (id: string, dx: number, dy: number, { release = true } = {}) => {
    const icon = stateRef.current.icons.find(i => i.id === id)
    if (!icon) return
    const home = icon.kind === 'home'
    const y =
      id === viewerId
        ? Math.max(NET_Y + VIEWER_MIN_OFF_NET, icon.y + dy)
        : home
          ? Math.max(NET_Y, icon.y + dy)
          : Math.min(NET_Y - HITTER_MIN_OFF_NET, icon.y + dy)
    if (id === viewerId) movedSelf.current = true
    dispatch({ type: 'move', id, to: { x: icon.x + dx, y } })
    if (home && release) dispatch({ type: 'drop', id })
  }

  /** A blocker steps back off the net and stops blocking; a defender at the net steps up to block. */
  const toggleBlocking = (icon: BoardIcon) => {
    const to = isBlocker(icon) ? NET_Y + BLOCK_ZONE_DEPTH + OFF_NET_STEP_BACK : BLOCKER_Y
    dispatch({ type: 'move', id: icon.id, to: { x: icon.x, y: to } })
    dispatch({ type: 'drop', id: icon.id })
  }

  const look = useLook(`${viewerId}:${cameraMode}`, {
    grab,
    onDrag(dxPx, dyPx) {
      const id = grab.current?.id
      const icon = stateRef.current.icons.find(i => i.id === id)
      if (!id || !icon || grab.current?.tapOnly || !camera.current || !stage.current) return
      const d = dragToBoard(camera.current, toWorld(icon, 1.2), dxPx, dyPx, stage.current.clientHeight)
      // Snapping onto the net waits for the finger to lift, so a blocker can be pulled off it.
      moveBy(id, d.x, d.y, { release: false })
    },
    onRelease(released, tapped) {
      const icon = stateRef.current.icons.find(i => i.id === released.id)
      if (!icon) return
      if (released.tapOnly) {
        if (tapped) chooseHitter(icon.id)
      } else if (icon.kind === 'home') dispatch({ type: 'drop', id: icon.id })
    },
    onTapEmpty: () => setSelectedId(null),
  })

  const defenders = state.icons
    .filter(icon => icon.kind === 'home' && !isBlocker(icon))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))
  const viewer = defenders.find(icon => icon.id === viewerId)
  const index = defenders.findIndex(icon => icon.id === viewerId)
  const step = (by: number) => onChangeViewer(defenders[(index + by + defenders.length) % defenders.length].id)

  // The defender we follow went up to block (a new hitter's default block, or dragged to the net):
  // follow another defender rather than show nothing.
  const fallbackViewer = viewer ? undefined : defenders[0]?.id
  useEffect(() => {
    if (fallbackViewer) onChangeViewer(fallbackViewer)
  }, [fallbackViewer, onChangeViewer])

  /** Same as tapping an opponent on the 2D board: a new attack with its default block. */
  function chooseHitter(id: string) {
    if (id === stateRef.current.hitterId) return
    setSelectedId(null)
    dispatch({ type: 'setHitter', id })
    // A new play: the defender we follow takes their Auto D spot, then holds it again.
    if (stateRef.current.autoDefence !== 'off') dispatch({ type: 'setManual', id: viewerId, manual: true })
    movedSelf.current = false
    look.reset()
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!viewer) return null

  const autoSpot = state.autoDefence === 'off' ? undefined : suggestedDefence(state).get(viewer.id)?.point
  const autoOffset = autoSpot && { x: autoSpot.x - viewer.x, y: autoSpot.y - viewer.y }
  const showAuto = !!autoOffset && Math.hypot(autoOffset.x, autoOffset.y) > AUTO_SPOT_HINT_MIN
  const moved = start && { x: viewer.x - start.x, y: viewer.y - start.y }
  const showMoved = !!moved && Math.hypot(moved.x, moved.y) > MOVED_HINT_MIN
  const contact = contactHeight(state.net, state.contactAboveNet)
  const speed = SPEEDS[speedIndex]
  const choices = analysis ? availableChoices(analysis) : new Set<AttackChoice>()

  const startAttack = (choice: AttackChoice | 'random') => {
    if (!analysis) return
    setChooserOpen(false)
    setSelectedId(null)
    const plan = planAttack(choice, { analysis, blockers, net: state.net, contactAboveNet: state.contactAboveNet, viewer })
    setRun(prev => ({ id: (prev?.id ?? 0) + 1, plan, finished: false }))
  }
  const replay = () => setRun(prev => prev && { id: prev.id + 1, plan: prev.plan, finished: false })
  const who = aboutYou ? 'you' : viewer.label
  const result = run?.finished ? describeAttack(run.plan, viewer, who) : null

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-background pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] pt-[env(safe-area-inset-top)]">
      <div className="flex shrink-0 items-center gap-2 px-2 py-1">
        <Button variant="outline" className="h-11 shrink-0 gap-1 px-3" onClick={onClose} aria-label="Back to the board">
          <ChevronIcon direction="left" />
          2D
        </Button>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-1">
          <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => step(-1)} aria-label="Previous player">
            <ChevronIcon direction="left" />
          </Button>
          <span className="whitespace-nowrap text-sm font-semibold">{aboutYou ? `Player ${viewer.label}'s view` : `Player ${viewer.label}`}</span>
          <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => step(1)} aria-label="Next player">
            <ChevronIcon direction="right" />
          </Button>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 shrink-0 text-lg"
          onClick={() => setSettingsOpen(open => !open)}
          aria-expanded={settingsOpen}
          aria-label="3D settings"
        >
          ⋯
        </Button>
      </div>

      <div className="flex shrink-0 items-center justify-center gap-0.5 overflow-x-auto px-2 pb-1" role="group" aria-label="Camera">
        {CAMERA_OPTIONS.map(option => (
          <Button
            key={option.value}
            variant={cameraMode === option.value ? 'secondary' : 'ghost'}
            className="h-9 shrink-0 px-2 text-sm"
            aria-pressed={cameraMode === option.value}
            onClick={() => setCameraMode(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      <div
        ref={stage}
        className="relative min-h-0 flex-1 touch-none select-none"
        onPointerDown={look.onPointerDown}
        onPointerMove={look.onPointerMove}
        onPointerUp={look.onPointerUp}
        onPointerCancel={look.onPointerUp}
        onWheel={look.onWheel}
      >
        <Canvas frameloop="demand" dpr={[1, 2]} camera={{ near: 0.05, far: 200 }} aria-label={wide ? `3D view of the court, ${cameraMode}` : `3D view from player ${viewer.label}`}>
          <Scene
            state={state}
            viewer={viewer}
            stance={stance}
            look={look}
            selectedId={selectedId}
            movableIds={state.icons
              .filter(icon => (icon.kind === 'home' && (!aboutYou || icon.id !== viewer.id)) || icon.id === state.hitterId)
              .map(icon => icon.id)}
            cameraMode={cameraMode}
            onGrab={(id, pointerId) => {
              const tapOnly = state.icons.find(icon => icon.id === id)?.kind === 'opponent' && id !== state.hitterId
              grab.current = { id, pointerId, tapOnly }
              if (!tapOnly) setSelectedId(id)
            }}
            cameraRef={camera}
            run={run}
            speed={speed.value}
            onRunFinished={() => setRun(prev => prev && { ...prev, finished: true })}
          />
        </Canvas>
        {settingsOpen && (
          <div data-ui className="absolute right-2 top-2 z-10 w-64 space-y-2 rounded-lg bg-background/95 p-3 shadow-lg backdrop-blur-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm">Net</span>
              <SegmentedControl value={state.net} onChange={net => dispatch({ type: 'setNet', net })} options={NET_OPTIONS} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm">Zones on the floor</span>
              <Button variant="outline" className="h-9 px-3" onClick={() => dispatch({ type: 'toggleShadow' })}>
                {state.showShadow ? 'On' : 'Off'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Net height: {NET_HEIGHT[state.net].toFixed(2)} m</p>
          </div>
        )}
        {(showAuto || showMoved) && (
          <div className="absolute left-2 right-2 top-2 flex items-center justify-between gap-2 rounded-lg bg-background/85 px-3 py-1.5 text-xs backdrop-blur-sm">
            <div className="min-w-0">
              {showMoved && moved && (
                <div>
                  You moved: <strong>{describeOffset(moved)}</strong>
                </div>
              )}
              {showAuto && autoOffset && (
                <div>
                  Auto D spot: <strong>{describeOffset(autoOffset)}</strong>
                </div>
              )}
            </div>
            {showAuto && (
              <Button
                variant="secondary"
                className="h-8 shrink-0 px-3 text-xs"
                onClick={() => {
                  if (!autoSpot) return
                  movedSelf.current = true
                  dispatch({ type: 'move', id: viewer.id, to: autoSpot })
                }}
              >
                Go there
              </Button>
            )}
          </div>
        )}
        {chooserOpen && (
          <div data-ui className="absolute inset-x-2 bottom-2 rounded-lg bg-background/95 p-2 shadow-lg backdrop-blur-sm">
            <div className="mb-1.5 flex items-center justify-between px-1">
              <span className="text-sm font-semibold">Choose the attack</span>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setChooserOpen(false)} aria-label="Close">
                ✕
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {ATTACK_CHOICES.map(choice => (
                <Button
                  key={choice.value}
                  variant="outline"
                  className="h-11 justify-start px-3"
                  disabled={!choices.has(choice.value)}
                  onClick={() => startAttack(choice.value)}
                >
                  {choiceLabel(choice.value, choice.label, aboutYou ? null : viewer.label)}
                </Button>
              ))}
            </div>
          </div>
        )}
        {result && !chooserOpen && (
          <div data-ui className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-2 rounded-lg bg-background/85 px-3 py-1.5 text-xs backdrop-blur-sm">
            <span>
              <strong>{result.title}</strong> · {result.where} · {result.time}
            </span>
            <Button variant="secondary" className="h-8 shrink-0 px-3 text-xs" onClick={replay}>
              Again
            </Button>
          </div>
        )}
        <p
          className={`pointer-events-none absolute bottom-2 left-0 right-0 text-center text-xs text-white/80 [text-shadow:0_1px_2px_rgb(0_0_0/0.8)] ${result || chooserOpen ? 'hidden' : ''}`}
        >
          {selected?.id === viewer.id && aboutYou
            ? 'Arrows move you, as you face the net · hold to keep moving'
            : selected
              ? 'Drag the player, or use the arrows'
              : cameraMode === 'follow'
                ? 'Drag to swing round · pinch to zoom · Me (arrows) to move'
                : wide
                  ? 'Drag players to move them · tap an opponent to make them the hitter'
                  : 'Drag to look around · tap an opponent to make them the hitter'}
        </p>
      </div>

      {selected?.id === state.hitterId && (
        <div className="flex shrink-0 items-center justify-center gap-1.5 px-2 pt-1">
          <span className="mr-1 text-sm text-muted-foreground">Contact height</span>
          <NudgeButton
            label="Lower contact"
            icon="down"
            onStep={() => dispatch({ type: 'setContact', aboveNet: stateRef.current.contactAboveNet - CONTACT_STEP })}
            disabled={state.contactAboveNet <= CONTACT_ABOVE_NET_RANGE.min}
          />
          <span className="w-16 text-center text-sm font-semibold tabular-nums">{contact.toFixed(2)} m</span>
          <NudgeButton
            label="Raise contact"
            icon="up"
            onStep={() => dispatch({ type: 'setContact', aboveNet: stateRef.current.contactAboveNet + CONTACT_STEP })}
            disabled={state.contactAboveNet >= CONTACT_ABOVE_NET_RANGE.max}
          />
        </div>
      )}

      <div className="flex min-h-[3.25rem] shrink-0 items-center justify-center gap-1.5 overflow-x-auto px-2 pt-1">
        {selected ? (
          <>
            <span className="mr-1 whitespace-nowrap text-sm font-semibold">{playerName(selected, state.hitterId, viewer.id)}</span>
            <NudgeButton label="Move left" onStep={() => moveBy(selected.id, -NUDGE_STEP, 0)} icon="left" />
            <NudgeButton label="Move right" onStep={() => moveBy(selected.id, NUDGE_STEP, 0)} icon="right" />
            {selected.id === state.hitterId && (
              <>
                <NudgeButton label="Move off the net" onStep={() => moveBy(selected.id, 0, -NUDGE_STEP)} icon="up" />
                <NudgeButton label="Move toward the net" onStep={() => moveBy(selected.id, 0, NUDGE_STEP)} icon="down" />
              </>
            )}
            {selected.kind === 'home' && !isBlocker(selected) && (
              <>
                <NudgeButton label="Move toward the net" onStep={() => moveBy(selected.id, 0, -NUDGE_STEP)} icon="up" />
                <NudgeButton label="Move back" onStep={() => moveBy(selected.id, 0, NUDGE_STEP)} icon="down" />
              </>
            )}
            {selected.kind === 'home' && selected.id !== viewer.id && (isBlocker(selected) || selected.y < NET_Y + 2.5) && (
              <Button variant="outline" className="h-11 shrink-0 px-3" onClick={() => toggleBlocking(selected)}>
                {isBlocker(selected) ? 'Off the net' : 'Block'}
              </Button>
            )}
            <Button variant="secondary" className="ml-1 h-11 px-4" onClick={() => setSelectedId(null)}>
              Done
            </Button>
          </>
        ) : (
          <>
            <span className="mr-1 text-sm text-muted-foreground">Adjust</span>
            {movable.map(icon => (
              <Button key={icon.id} variant="outline" className="h-11 shrink-0 px-3" onClick={() => setSelectedId(icon.id)}>
                {playerName(icon, state.hitterId, viewer.id)}
              </Button>
            ))}
          </>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-center gap-2 px-2 pt-1">
        <Button className="h-11 gap-1.5 px-4" onClick={() => startAttack('random')} disabled={!analysis}>
          <PlayIcon />
          Random
        </Button>
        <Button
          variant="outline"
          className="h-11 px-3"
          onClick={() => setChooserOpen(open => !open)}
          aria-expanded={chooserOpen}
          disabled={!analysis}
        >
          Choose…
        </Button>
        <Button
          variant="outline"
          className="h-11 px-3"
          onClick={() => setSpeedIndex(i => (i + 1) % SPEEDS.length)}
          aria-label={`${speed.label}, tap to change`}
        >
          {speed.label}
        </Button>
      </div>

      <div className="flex shrink-0 items-center justify-center gap-2 px-2 py-1">
        {!wide && <SegmentedControl value={stance} onChange={setStance} options={STANCE_OPTIONS} />}
        <Button variant="outline" className="h-11 px-3" onClick={look.reset}>
          {aboutYou ? 'Face hitter' : 'Reset view'}
        </Button>
      </div>
    </div>
  )
}

/**
 * Hold the defender we're looking through while the 3D view is open, so moving the block doesn't
 * make the camera jump; hand them back to Auto D on the way out. Players already placed by hand
 * stay as they were.
 */
function useHoldViewer(viewerId: string, stateRef: MutableRefObject<BoardState>, dispatch: Dispatch<BoardAction>) {
  // Set once you move yourself: then you stay hand-placed, as if dragged on the 2D board.
  const movedSelf = useRef(false)
  useEffect(() => {
    movedSelf.current = false
    const { autoDefence, manual } = stateRef.current
    if (autoDefence === 'off' || manual.includes(viewerId)) return
    dispatch({ type: 'setManual', id: viewerId, manual: true })
    return () => {
      if (!movedSelf.current) dispatch({ type: 'setManual', id: viewerId, manual: false })
    }
  }, [viewerId, stateRef, dispatch])
  return movedSelf
}

/** Where the defender stood when you started looking through them (for this hitter), for "You moved …". */
function useStartSpot(viewerId: string, hitterId: string, stateRef: MutableRefObject<BoardState>): Point | undefined {
  const [start, setStart] = useState<{ key: string; at: Point }>()
  const key = `${viewerId}:${hitterId}`
  useEffect(() => {
    const icon = stateRef.current.icons.find(i => i.id === viewerId)
    if (icon) setStart({ key, at: { x: icon.x, y: icon.y } })
  }, [key, viewerId, stateRef])
  return start?.key === key ? start.at : undefined
}

interface LookOptions {
  /** Set when a press landed on a movable player: that pointer drags them instead of the view. */
  grab: MutableRefObject<Grab | null>
  onDrag: (dxPx: number, dyPx: number) => void
  /** The finger lifted off a grabbed player; `tapped` if it barely moved. */
  onRelease: (grab: Grab, tapped: boolean) => void
  onTapEmpty: () => void
}

/** Drag to turn the head, pinch or wheel to zoom. Resets when the viewer changes. */
/** `resetKey` changes (another defender, another camera) put the view back to its starting angle. */
function useLook(resetKey: string, { grab, onDrag, onRelease, onTapEmpty }: LookOptions) {
  const [yaw, setYaw] = useState(0)
  const [pitch, setPitch] = useState(0)
  const [zoom, setZoom] = useState(1)
  // Bumped on reset: the view re-aims at the hitter then, and only then (moving the hitter doesn't turn your head).
  const [aimVersion, setAimVersion] = useState(0)
  const pointers = useRef(new Map<number, { x: number; y: number; travel: number }>())
  const pinch = useRef<{ distance: number; zoom: number } | null>(null)

  const reset = () => {
    setYaw(0)
    setPitch(0)
    setZoom(1)
    setAimVersion(v => v + 1)
  }
  useEffect(reset, [resetKey])

  const clampZoom = (v: number) => Math.min(ZOOM.max, Math.max(ZOOM.min, v))
  const spread = () => {
    const [a, b] = [...pointers.current.values()]
    return Math.hypot(a.x - b.x, a.y - b.y)
  }

  return {
    yaw,
    pitch,
    zoom,
    aimVersion,
    reset,
    onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
      if ((e.target as HTMLElement).closest('button, [data-ui]')) return
      e.currentTarget.setPointerCapture(e.pointerId)
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY, travel: 0 })
      if (pointers.current.size === 2 && !grab.current) pinch.current = { distance: spread(), zoom }
    },
    onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
      const last = pointers.current.get(e.pointerId)
      if (!last) return
      const dx = e.clientX - last.x
      const dy = e.clientY - last.y
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY, travel: last.travel + Math.hypot(dx, dy) })
      if (grab.current?.pointerId === e.pointerId) {
        onDrag(dx, dy)
        return
      }
      if (pinch.current && pointers.current.size === 2) {
        setZoom(clampZoom(pinch.current.zoom * (pinch.current.distance / Math.max(1, spread()))))
        return
      }
      // Turning slower when zoomed in keeps the drag feeling the same.
      const scale = LOOK_RADIANS_PER_PX * zoom
      setYaw(y => y - dx * scale)
      setPitch(p => Math.min(MAX_PITCH, Math.max(-MAX_PITCH, p + dy * scale)))
    },
    onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
      const press = pointers.current.get(e.pointerId)
      pointers.current.delete(e.pointerId)
      if (pointers.current.size < 2) pinch.current = null
      if (grab.current?.pointerId === e.pointerId) {
        const released = grab.current
        grab.current = null
        onRelease(released, (press?.travel ?? 0) < TAP_SLOP_PX)
      } else if (press && press.travel < TAP_SLOP_PX && pointers.current.size === 0) onTapEmpty()
    },
    onWheel(e: WheelEvent<HTMLDivElement>) {
      setZoom(z => clampZoom(z * (1 + e.deltaY * 0.001)))
    },
  }
}

interface SceneProps {
  state: BoardState
  viewer: BoardIcon
  stance: Stance
  look: { yaw: number; pitch: number; zoom: number; aimVersion: number }
  selectedId: string | null
  movableIds: string[]
  onGrab: (id: string, pointerId: number) => void
  cameraRef: MutableRefObject<THREE.PerspectiveCamera | null>
  run: AttackRunState | null
  speed: number
  onRunFinished: () => void
  cameraMode: CameraMode
}

function Scene({
  state,
  viewer,
  stance,
  look,
  selectedId,
  movableIds,
  onGrab,
  cameraRef,
  run,
  speed,
  onRunFinished,
  cameraMode,
}: SceneProps) {
  const wide = cameraMode !== 'eyes'
  const colors = useBoardColors()
  const hitter = state.icons.find(icon => icon.id === state.hitterId)
  const blockers = useMemo(() => blockersOf(state.icons), [state.icons])
  const analysis = useMemo(() => (hitter ? analyseDefence({ hitter, blockers }) : null), [hitter, blockers])
  const contact = analysis?.contact ?? hitter ?? { x: COURT_WIDTH / 2, y: NET_Y - 1 }
  const ball = toWorld(contact, contactHeight(state.net, state.contactAboveNet))
  const eye = toWorld(viewer, eyeHeight(viewer.blockSize ?? DEFAULT_BLOCK_SIZE, stance))
  // The way you were looking at the last reset (toward the ball). Kept as a direction, so moving
  // the hitter, the block or yourself doesn't turn your head.
  const aim = useRef<{ version: number; direction: Vec3 }>({ version: -1, direction: [0, 0, -1] })
  if (aim.current.version !== look.aimVersion) {
    aim.current = { version: look.aimVersion, direction: [ball[0] - eye[0], ball[1] - eye[1], ball[2] - eye[2]] }
  }
  const [dx, dy, dz] = aim.current.direction
  const target: Vec3 = [eye[0] + dx, eye[1] + dy, eye[2] + dz]

  return (
    <>
      <color attach="background" args={[colors.sky]} />
      <ambientLight intensity={1.1} />
      <directionalLight position={[4, 12, 10]} intensity={1.6} />
      {wide ? (
        <OrbitCamera
          {...(cameraMode === 'follow' ? followPreset(viewer, aim.current.direction) : cameraPreset(cameraMode, hitter))}
          yaw={look.yaw}
          pitch={look.pitch}
          zoom={look.zoom}
          cameraRef={cameraRef}
        />
      ) : (
        <FirstPersonCamera eye={eye} target={target} yaw={look.yaw} pitch={look.pitch} zoom={look.zoom} cameraRef={cameraRef} />
      )}

      <CourtFloor colors={colors} />
      {analysis && state.showShadow && <Zones analysis={analysis} state={state} colors={colors} />}
      <Net net={state.net} colors={colors} />

      {state.icons.map(icon =>
        icon.kind === 'ball' || (!wide && icon.id === viewer.id) || (run && icon.id === state.hitterId) ? null : (
          <Figure
            key={icon.id}
            icon={icon}
            pose={icon.id === state.hitterId ? 'hitter' : isBlocker(icon) ? 'blocker' : 'ready'}
            net={state.net}
            contactAboveNet={state.contactAboveNet}
            ball={contact}
            colors={colors}
            selected={icon.id === selectedId}
            onGrab={
              movableIds.includes(icon.id) || icon.kind === 'opponent'
                ? (e: ThreeEvent<PointerEvent>) => {
                    // Nearest player only; the press drags them rather than the view.
                    e.stopPropagation()
                    onGrab(icon.id, e.pointerId)
                  }
                : undefined
            }
          />
        ),
      )}
      {run && hitter ? (
        <AttackRun
          key={run.id}
          plan={run.plan}
          speed={speed}
          hitter={hitter}
          net={state.net}
          contactAboveNet={state.contactAboveNet}
          contact={contact}
          colors={colors}
          onFinished={onRunFinished}
        />
      ) : (
        <Ball at={ball} colors={colors} />
      )}
    </>
  )
}

function Ball({ at, colors }: { at: Vec3; colors: BoardColors }) {
  return (
    <mesh position={at}>
      <sphereGeometry args={[BALL_RADIUS, 24, 16]} />
      <meshStandardMaterial color={colors.ball} roughness={0.6} />
    </mesh>
  )
}

/**
 * One attack, played once: the hitter's swing, the flight with a fading trail, then a marker where
 * it landed. Time runs from -WINDUP (start of the swing) to the end of the bounce, slowed by `speed`.
 */
function AttackRun({
  plan,
  speed,
  hitter,
  net,
  contactAboveNet,
  contact,
  colors,
  onFinished,
}: {
  plan: AttackPlan
  speed: number
  hitter: BoardIcon
  net: NetKind
  contactAboveNet: number
  contact: Point
  colors: BoardColors
  onFinished: () => void
}) {
  const [t, setT] = useState(-WINDUP)
  const invalidate = useThree(s => s.invalidate)
  const startedAt = useRef<number | null>(null)
  const done = useRef(false)
  const finished = useRef(onFinished)
  finished.current = onFinished
  useEffect(() => invalidate(), [invalidate])

  useFrame(() => {
    if (done.current) return
    const now = performance.now() / 1000
    startedAt.current ??= now
    const next = (now - startedAt.current) * speed - WINDUP
    if (next >= plan.duration) {
      done.current = true
      setT(plan.duration)
      finished.current()
      return
    }
    setT(next)
    invalidate()
  })

  const trail = useMemo(
    () => new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.6 })),
    [],
  )
  useEffect(
    () => () => {
      trail.geometry.dispose()
      ;(trail.material as THREE.Material).dispose()
    },
    [trail],
  )
  const flown = Math.max(0, t)
  trail.geometry.setFromPoints(
    Array.from({ length: TRAIL_SAMPLES + 1 }, (_, i) => {
      const b = ballAt(plan, (flown * i) / TRAIL_SAMPLES)
      return new THREE.Vector3(...toWorld(b, b.h))
    }),
  )
  const now = ballAt(plan, flown)
  const [lx, , lz] = toWorld(plan.landing)

  return (
    <>
      <Figure icon={hitter} pose="hitter" net={net} contactAboveNet={contactAboveNet} ball={contact} colors={colors} swing={t} />
      {t > 0 && <primitive object={trail} />}
      <Ball at={toWorld(now, now.h)} colors={colors} />
      {t >= plan.landedAt && (
        <mesh rotation-x={-Math.PI / 2} position={[lx, 0.015, lz]}>
          <ringGeometry args={[0.16, 0.24, 32]} />
          <meshBasicMaterial color="#facc15" />
        </mesh>
      )}
    </>
  )
}

function FirstPersonCamera({
  eye,
  target,
  yaw,
  pitch,
  zoom,
  cameraRef,
}: {
  eye: Vec3
  target: Vec3
  yaw: number
  pitch: number
  zoom: number
  cameraRef: MutableRefObject<THREE.PerspectiveCamera | null>
}) {
  const camera = useThree(s => s.camera) as THREE.PerspectiveCamera
  const invalidate = useThree(s => s.invalidate)
  const aspect = useThree(s => s.size.width / Math.max(1, s.size.height))
  cameraRef.current = camera
  const [ex, ey, ez] = eye
  const [tx, ty, tz] = target

  useLayoutEffect(() => {
    const base = new THREE.Vector3(tx - ex, ty - ey, tz - ez).normalize()
    const baseYaw = Math.atan2(base.x, base.z)
    const fov = verticalFov(aspect) * zoom
    // Look a little below the ball so it sits in the upper third, leaving room for the floor zones.
    const basePitch = Math.asin(base.y) - fov * BALL_ABOVE_CENTRE * (Math.PI / 180)
    const p = Math.min(MAX_PITCH, Math.max(-MAX_PITCH, basePitch + pitch))
    const y = baseYaw + yaw
    camera.position.set(ex, ey, ez)
    camera.lookAt(ex + Math.sin(y) * Math.cos(p), ey + Math.sin(p), ez + Math.cos(y) * Math.cos(p))
    camera.fov = fov
    camera.updateProjectionMatrix()
    invalidate()
  }, [camera, invalidate, ex, ey, ez, tx, ty, tz, yaw, pitch, zoom, aspect])

  return null
}

interface CameraPreset {
  /** Which way the camera sits from the target (only the direction counts, unless `distance` is unset and there's no span). */
  from: Vec3
  target: Vec3
  /** Metres that should fit across and up the screen; the distance is worked out from these. */
  span?: { across: number; up: number }
  /** A fixed distance instead (the follow camera). */
  distance?: number
  horizontalFov?: number
}

/**
 * Third-person camera behind the defender, facing the way they looked at the last "Face hitter"
 * (so moving the hitter or the block doesn't swing it). It moves with them.
 */
function followPreset(viewer: Point, looking: Vec3): CameraPreset {
  const flat = Math.hypot(looking[0], looking[2]) || 1
  const forward = [looking[0] / flat, looking[2] / flat]
  const right = [-forward[1], forward[0]]
  const [vx, , vz] = toWorld(viewer)
  const target: Vec3 = [vx + forward[0] * FOLLOW.ahead, FOLLOW.lookHeight, vz + forward[1] * FOLLOW.ahead]
  const back = FOLLOW.ahead + FOLLOW.behind
  const from: Vec3 = [
    -forward[0] * back + right[0] * FOLLOW.side,
    FOLLOW.height - FOLLOW.lookHeight,
    -forward[1] * back + right[1] * FOLLOW.side,
  ]
  return { from, target, distance: Math.hypot(...from), horizontalFov: FOLLOW.horizontalFov }
}

/**
 * Starting angle for each wide view (world metres; our end line is at Z = +9). The hitter's view
 * follows the hitter.
 */
function cameraPreset(mode: Exclude<CameraMode, 'eyes' | 'follow'>, hitter: BoardIcon | undefined): CameraPreset {
  switch (mode) {
    case 'behind':
      return { from: [0, 0.7, 1], target: [0, 0.5, 3], span: { across: 11, up: 13 } }
    case 'side':
      return { from: [-1, 0.55, 0.15], target: [0, 0.5, 1.5], span: { across: 20, up: 9 } }
    case 'hitter': {
      // Up and behind the hitter, on the line from our court through them, so they're in the foreground.
      const [hx, , hz] = toWorld(hitter ?? { x: COURT_WIDTH / 2, y: NET_Y - 1 })
      const target: Vec3 = [hx * 0.3, 0.5, 3.5]
      return { from: [hx - target[0], 4, hz - target[2]], target, span: { across: 11, up: 13 } }
    }
    case 'above':
      // Centred a little toward our end, leaving room for the result line at the bottom.
      return { from: [0, 1, 0.12], target: [0, 0, 1.5], span: { across: 11, up: 22 } }
  }
}

/** How far back the camera has to be for `span` to fill the screen at this aspect ratio. */
function fitDistance(span: NonNullable<CameraPreset['span']>, aspect: number): number {
  const vertical = (wideVerticalFov(aspect) * Math.PI) / 180
  const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * aspect)
  return Math.max(span.up / 2 / Math.tan(vertical / 2), span.across / 2 / Math.tan(horizontal / 2))
}

/** Wide views: drag swings the camera round the target, pinch moves it closer or further. */
function OrbitCamera({
  from,
  target,
  span,
  distance,
  horizontalFov = WIDE_HORIZONTAL_FOV,
  yaw,
  pitch,
  zoom,
  cameraRef,
}: CameraPreset & {
  yaw: number
  pitch: number
  zoom: number
  cameraRef: MutableRefObject<THREE.PerspectiveCamera | null>
}) {
  const camera = useThree(s => s.camera) as THREE.PerspectiveCamera
  const invalidate = useThree(s => s.invalidate)
  const aspect = useThree(s => s.size.width / Math.max(1, s.size.height))
  cameraRef.current = camera
  const [fx, fy, fz] = from
  const [tx, ty, tz] = target
  const across = span?.across ?? 0
  const up = span?.up ?? 0

  useLayoutEffect(() => {
    const orbit = new THREE.Spherical().setFromVector3(new THREE.Vector3(fx, fy, fz))
    orbit.theta += yaw
    // Never quite straight down (the view would spin) and never under the floor.
    orbit.phi = Math.min(Math.PI / 2 - 0.03, Math.max(0.05, orbit.phi - pitch))
    orbit.radius = (distance ?? fitDistance({ across, up }, aspect)) * zoom
    camera.position.setFromSpherical(orbit).add(new THREE.Vector3(tx, ty, tz))
    camera.lookAt(tx, ty, tz)
    camera.fov = wideVerticalFov(aspect, horizontalFov)
    camera.updateProjectionMatrix()
    invalidate()
  }, [camera, invalidate, fx, fy, fz, tx, ty, tz, across, up, distance, horizontalFov, yaw, pitch, zoom, aspect])

  return null
}

/**
 * Turn a finger drag into a step on the floor, in board metres: sideways in the direction the
 * camera faces, and up the screen = away from you. Scaled to the player's distance, so a drag
 * moves them about as far as it looks like it should.
 */
function dragToBoard(camera: THREE.PerspectiveCamera, at: Vec3, dxPx: number, dyPx: number, heightPx: number): Point {
  const distance = camera.position.distanceTo(new THREE.Vector3(...at))
  const metresPerPx = (2 * distance * Math.tan((camera.fov * Math.PI) / 360)) / Math.max(1, heightPx)
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).setY(0).normalize()
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).setY(0).normalize()
  const step = right.multiplyScalar(dxPx * metresPerPx).add(forward.multiplyScalar(-dyPx * metresPerPx * DEPTH_DRAG_GAIN))
  return { x: step.x, y: step.z }
}

function wideVerticalFov(aspect: number, horizontalFov = WIDE_HORIZONTAL_FOV): number {
  const half = (horizontalFov * Math.PI) / 360
  const vertical = (2 * Math.atan(Math.tan(half) / aspect) * 180) / Math.PI
  return Math.min(WIDE_VERTICAL_FOV.max, Math.max(WIDE_VERTICAL_FOV.min, vertical))
}

function verticalFov(aspect: number): number {
  const half = (HORIZONTAL_FOV / 2) * (Math.PI / 180)
  const vertical = 2 * Math.atan(Math.tan(half) / aspect) * (180 / Math.PI)
  return Math.min(VERTICAL_FOV.max, Math.max(VERTICAL_FOV.min, vertical))
}

type Vec3 = [number, number, number]

interface BoardColors {
  sky: string
  freeZone: Token
  court: Token
  line: Token
  net: Token
  lane: Token
  seam: Token
  shadow: Token
  roll: Token
  tip: Token
  home: string
  opponent: string
  ball: string
}

interface Token {
  color: string
  opacity: number
}

/** The board's own palette (tacticBoard.css), so the floor zones match the 2D view and theme. */
function useBoardColors(): BoardColors {
  return useMemo(() => {
    const css = getComputedStyle(document.documentElement)
    const token = (name: string) => parseHslToken(css.getPropertyValue(name) || '0 0% 50%')
    const solid = (name: string) => token(name).color
    const theme = document.documentElement.dataset.theme
    const dark = theme === 'dark' || (theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches)
    return {
      sky: dark ? '#0f1726' : '#cfe3f3',
      freeZone: token('--tb-free-zone'),
      court: token('--tb-court'),
      line: token('--tb-line'),
      net: token('--tb-net'),
      lane: token('--tb-lane'),
      seam: token('--tb-seam'),
      shadow: token('--tb-shadow'),
      roll: token('--tb-roll-fill'),
      tip: token('--tb-tip-fill'),
      home: solid('--team-home'),
      opponent: solid('--team-opponent'),
      ball: solid('--tb-ball'),
    }
  }, [])
}

function CourtFloor({ colors }: { colors: BoardColors }) {
  const half = COURT_WIDTH / 2
  const halfLength = COURT_LENGTH / 2
  const inset = LINE_WIDTH / 2
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[60, 60]} />
        <meshLambertMaterial color={colors.freeZone.color} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.001}>
        <planeGeometry args={[COURT_WIDTH, COURT_LENGTH]} />
        <meshLambertMaterial color={colors.court.color} />
      </mesh>
      {/* Lines sit inside the area they bound, as on the 2D court. */}
      <FloorStrip x={-half + inset} z={0} width={LINE_WIDTH} length={COURT_LENGTH} color={colors.line.color} />
      <FloorStrip x={half - inset} z={0} width={LINE_WIDTH} length={COURT_LENGTH} color={colors.line.color} />
      <FloorStrip x={0} z={-halfLength + inset} width={COURT_WIDTH} length={LINE_WIDTH} color={colors.line.color} />
      <FloorStrip x={0} z={halfLength - inset} width={COURT_WIDTH} length={LINE_WIDTH} color={colors.line.color} />
      <FloorStrip x={0} z={0} width={COURT_WIDTH} length={LINE_WIDTH} color={colors.line.color} />
      <FloorStrip x={0} z={-ATTACK_LINE_DISTANCE + inset} width={COURT_WIDTH} length={LINE_WIDTH} color={colors.line.color} />
      <FloorStrip x={0} z={ATTACK_LINE_DISTANCE - inset} width={COURT_WIDTH} length={LINE_WIDTH} color={colors.line.color} />
    </group>
  )
}

function FloorStrip({ x, z, width, length, color }: { x: number; z: number; width: number; length: number; color: string }) {
  return (
    <mesh rotation-x={-Math.PI / 2} position={[x, 0.002, z]}>
      <planeGeometry args={[width, length]} />
      <meshBasicMaterial color={color} />
    </mesh>
  )
}

/** The same zones as the 2D board, laid on the floor. */
function Zones({ analysis, state, colors }: { analysis: DefenceAnalysis; state: BoardState; colors: BoardColors }) {
  const showHard = state.hitView === 'hard' || state.hitView === 'all'
  const faded = showHard ? 1 : 0.35
  const rolls = state.hitView === 'roll' || state.hitView === 'all' ? rollZones(analysis) : []
  const tip = state.hitView === 'tip' || state.hitView === 'all' ? tipZone(analysis) : null
  return (
    <group>
      {analysis.lanes.map(lane => (
        <FloorPolygon key={`lane-${lane.from}`} polygon={lane.polygon} token={lane.kind === 'seam' ? colors.seam : colors.lane} lift={0.004} fade={faded} />
      ))}
      {analysis.over.map(zone => (
        <FloorPolygon key={`over-${zone.from}`} polygon={zone.polygon} token={colors.lane} lift={0.004} fade={faded} />
      ))}
      {analysis.shadows.map(shadow => (
        <FloorPolygon key={`shadow-${shadow.from}`} polygon={shadow.polygon} token={colors.shadow} lift={0.005} />
      ))}
      {rolls.map((zone, i) => (
        <FloorPolygon key={`roll-${i}`} polygon={zone} token={colors.roll} lift={0.006} />
      ))}
      {tip && <FloorPolygon polygon={tip} token={colors.tip} lift={0.007} />}
    </group>
  )
}

function FloorPolygon({ polygon, token, lift, fade = 1 }: { polygon: Point[]; token: Token; lift: number; fade?: number }) {
  const geometry = useMemo(() => {
    // Shapes are drawn in the XY plane; turned flat, shape y becomes -Z.
    const shape = new THREE.Shape(polygon.map(p => new THREE.Vector2(p.x - COURT_WIDTH / 2, -(p.y - NET_Y))))
    return new THREE.ShapeGeometry(shape)
  }, [polygon])
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <mesh geometry={geometry} rotation-x={-Math.PI / 2} position-y={lift}>
      <meshBasicMaterial color={token.color} transparent opacity={token.opacity * fade} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  )
}

function Net({ net, colors }: { net: NetKind; colors: BoardColors }) {
  const top = NET_HEIGHT[net]
  const span = COURT_WIDTH + POST_OFFSET * 2
  const half = COURT_WIDTH / 2
  return (
    <group>
      <mesh position={[0, top - NET_DEPTH / 2, 0]}>
        <planeGeometry args={[span, NET_DEPTH]} />
        <meshBasicMaterial color="#111827" transparent opacity={0.45} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, top - 0.035, 0]}>
        <boxGeometry args={[span, 0.07, 0.02]} />
        <meshLambertMaterial color="#ffffff" />
      </mesh>
      {[-1, 1].map(side => (
        <mesh key={`post-${side}`} position={[side * (half + POST_OFFSET), (top + 0.1) / 2, 0]}>
          <cylinderGeometry args={[0.05, 0.05, top + 0.1, 12]} />
          <meshLambertMaterial color={colors.net.color} />
        </mesh>
      ))}
      {[-1, 1].map(side => (
        <Antenna key={`antenna-${side}`} x={side * half} bottom={top - NET_DEPTH} top={top + ANTENNA_ABOVE_NET} />
      ))}
    </group>
  )
}

/** Red and white 10 cm bands, like the real thing. */
function Antenna({ x, bottom, top }: { x: number; bottom: number; top: number }) {
  const band = 0.1
  const count = Math.round((top - bottom) / band)
  return (
    <group>
      {Array.from({ length: count }, (_, i) => (
        <mesh key={i} position={[x, bottom + band * (i + 0.5), 0]}>
          <cylinderGeometry args={[0.012, 0.012, band, 8]} />
          <meshLambertMaterial color={i % 2 ? '#ffffff' : '#dc2626'} />
        </mesh>
      ))}
    </group>
  )
}

type Pose = 'hitter' | 'blocker' | 'ready'

/** A simple player: body, head and arms. No number tag: it sat over the heads and hid the view. */
function Figure({
  icon,
  pose,
  net,
  contactAboveNet,
  ball,
  colors,
  selected = false,
  onGrab,
  swing,
}: {
  icon: BoardIcon
  pose: Pose
  net: NetKind
  contactAboveNet: number
  ball: Point
  colors: BoardColors
  selected?: boolean
  onGrab?: (e: ThreeEvent<PointerEvent>) => void
  /** Hitter only: seconds from contact, to animate the arm swing (negative = winding up). */
  swing?: number
}) {
  const size: BlockSize = icon.kind === 'home' ? (icon.blockSize ?? DEFAULT_BLOCK_SIZE) : DEFAULT_BLOCK_SIZE
  const height = PLAYER_HEIGHT[size]
  const color = icon.kind === 'home' ? colors.home : colors.opponent
  // Our players face the opponents (-Z); theirs face us (+Z).
  const facing = icon.kind === 'home' ? -1 : 1

  const reach = pose === 'hitter' ? contactHeight(net, contactAboveNet) : pose === 'blocker' ? blockHandHeight(size, net) : 0
  const lift = pose === 'ready' ? 0 : jumpFor(size, reach)
  const [x, , z] = toWorld(icon)
  const shoulderY = lift + height * SHOULDER_RATIO
  const shoulders: Vec3[] = [-1, 1].map(side => [x + side * SHOULDER_HALF_WIDTH, shoulderY, z])
  // Right-handed: facing us (+Z) a player's right hand is on the -X side, facing them it's +X.
  const hittingArm = facing === 1 ? 0 : 1

  // Blockers: arms pressed forward over the net, spread across the width their size covers on the 2D board.
  const handSpread = BLOCK_SIZES[size].width / 2 - LIMB_RADIUS
  const handZ = facing * HAND_PENETRATION[size]

  const hands: Vec3[] = shoulders.map(([sx, , sz], i): Vec3 => {
    if (pose === 'blocker') return [x + (i === 0 ? -1 : 1) * handSpread, reach, handZ]
    if (pose === 'hitter' && i === hittingArm) {
      const [bx, by, bz] = toWorld(ball, reach)
      const atBall: Vec3 = [bx, by - BALL_RADIUS, bz]
      if (swing === undefined) return atBall
      const cocked: Vec3 = [sx + 0.05, shoulderY + 0.45, sz - facing * 0.45]
      const followThrough: Vec3 = [sx - 0.05, shoulderY - 0.3, sz + facing * 0.55]
      return swingHand(swing, atBall, cocked, followThrough)
    }
    if (pose === 'hitter') return [sx - 0.1, shoulderY + 0.25, sz - facing * 0.3]
    // Ready position: arms out in front, hands about waist height.
    return [sx * 0.6 + x * 0.4, lift + height * 0.48, sz + facing * 0.45]
  })

  return (
    <group>
      <mesh position={[x, lift + (shoulderY - lift) / 2, z]}>
        <capsuleGeometry args={[BODY_RADIUS, shoulderY - lift - BODY_RADIUS * 2, 4, 12]} />
        <meshLambertMaterial color={color} />
      </mesh>
      <mesh position={[x, lift + height * HEAD_RATIO, z]}>
        <sphereGeometry args={[HEAD_RADIUS, 16, 12]} />
        <meshLambertMaterial color="#f1c9a5" />
      </mesh>
      {shoulders.map((from, i) => (
        <Limb key={i} from={from} to={hands[i]} color={color} />
      ))}
      {selected && (
        <mesh rotation-x={-Math.PI / 2} position={[x, 0.012, z]}>
          <ringGeometry args={[0.38, 0.5, 40]} />
          <meshBasicMaterial color="#facc15" />
        </mesh>
      )}
      {onGrab && (
        <mesh position={[x, Math.max(height, reach) / 2, z]} onPointerDown={onGrab}>
          <cylinderGeometry args={[GRAB_RADIUS, GRAB_RADIUS, Math.max(height, reach), 12]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}

function Limb({ from, to, color }: { from: Vec3; to: Vec3; color: string }) {
  const { position, quaternion, length } = useMemo(() => {
    const a = new THREE.Vector3(...from)
    const b = new THREE.Vector3(...to)
    const dir = b.clone().sub(a)
    return {
      position: a.clone().add(b).multiplyScalar(0.5),
      quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()),
      length: dir.length() || ARM_LENGTH,
    }
  }, [from, to])
  return (
    <mesh position={position} quaternion={quaternion}>
      <capsuleGeometry args={[LIMB_RADIUS, Math.max(0.01, length - LIMB_RADIUS * 2), 4, 8]} />
      <meshLambertMaterial color={color} />
    </mesh>
  )
}

/** Hitting hand along the swing: draw back, whip through the ball, follow through. */
function swingHand(t: number, atBall: Vec3, cocked: Vec3, followThrough: Vec3): Vec3 {
  const drawBack = WINDUP * 0.4
  if (t < -WINDUP + drawBack) return lerp3(atBall, cocked, (t + WINDUP) / drawBack)
  if (t < 0) return lerp3(cocked, atBall, (t + WINDUP - drawBack) / (WINDUP - drawBack))
  return lerp3(atBall, followThrough, t / 0.25)
}

function lerp3(a: Vec3, b: Vec3, k: number): Vec3 {
  const u = Math.min(1, Math.max(0, k))
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]
}

const OUTCOME_TITLE: Record<AttackPlan['outcome'], string> = {
  tip: 'Tip',
  roll: 'Roll shot',
  hard: 'Hard',
  touchUp: 'Off the block, up',
  touchOut: 'Off the block, out',
  touchDrop: 'Off the block, short',
  stuff: 'Stuffed',
}
const HARD_TITLE: Partial<Record<AttackChoice, string>> = {
  hardMe: 'Hard at you',
  hardLeft: 'Hard to your left',
  hardRight: 'Hard to your right',
  line: 'Hard line',
  cross: 'Hard cross',
  seam: 'Hard seam',
}

/** "Hard cross · 1.2 m left, 0.4 m back of you · 0.46 s" */
function describeAttack(plan: AttackPlan, viewer: Point, who: string) {
  const aimedAtYou = plan.choice === 'hardMe' || plan.choice === 'hardLeft' || plan.choice === 'hardRight'
  const title =
    plan.outcome !== 'hard'
      ? OUTCOME_TITLE[plan.outcome]
      : plan.overBlock && !aimedAtYou
        ? 'Hard over the block'
        : (HARD_TITLE[plan.choice] ?? 'Hard')
  const { x, y } = plan.landing
  const offset = { x: x - viewer.x, y: y - viewer.y }
  const where =
    y < NET_Y
      ? 'back on their side'
      : x < 0 || x > COURT_WIDTH || y > COURT_LENGTH
        ? 'out'
        : Math.hypot(offset.x, offset.y) < 0.5
          ? `right at ${who}`
          : `${describeOffset(offset)} of ${who}`
  return { title, where, time: `${plan.landedAt.toFixed(2)} s` }
}

/** "Hard: at me" in the defender's eyes or follow view; "Hard: at 6" in a court view. */
function choiceLabel(choice: AttackChoice, label: string, defender: string | null) {
  if (!defender) return label
  if (choice === 'hardMe') return `Hard: at ${defender}`
  if (choice === 'hardLeft') return `Hard: ${defender}'s left`
  if (choice === 'hardRight') return `Hard: ${defender}'s right`
  return label
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M7 4.5v15l12-7.5z" />
    </svg>
  )
}

function playerName(icon: BoardIcon, hitterId: string, viewerId: string) {
  if (icon.id === viewerId) return `Me (${icon.label})`
  if (icon.id === hitterId) return `Hitter ${icon.label}`
  return isBlocker(icon) ? `Blocker ${icon.label}` : `Player ${icon.label}`
}

/** "0.6 m left, 0.4 m back", as the defender facing the net would say it. */
function describeOffset({ x, y }: Point) {
  const parts = []
  if (Math.abs(x) >= 0.1) parts.push(`${Math.abs(x).toFixed(1)} m ${x > 0 ? 'right' : 'left'}`)
  if (Math.abs(y) >= 0.1) parts.push(`${Math.abs(y).toFixed(1)} m ${y < 0 ? 'forward' : 'back'}`)
  return parts.join(', ')
}

/** One step per tap; hold to keep stepping. */
function NudgeButton({
  label,
  icon,
  onStep,
  disabled = false,
}: {
  label: string
  icon: keyof typeof CHEVRON_PATH
  onStep: () => void
  disabled?: boolean
}) {
  const timer = useRef<number | undefined>(undefined)
  const stepRef = useRef(onStep)
  stepRef.current = onStep
  const stop = () => window.clearTimeout(timer.current)
  useEffect(() => stop, [])
  useEffect(() => {
    if (disabled) stop()
  }, [disabled])

  return (
    <Button
      variant="outline"
      size="icon"
      className="h-11 w-11 shrink-0"
      aria-label={label}
      title={label}
      disabled={disabled}
      onPointerDown={e => {
        if (e.button !== 0) return
        stepRef.current()
        const repeat = () => {
          stepRef.current()
          timer.current = window.setTimeout(repeat, REPEAT_EVERY)
        }
        timer.current = window.setTimeout(repeat, REPEAT_DELAY)
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      // Keyboard presses arrive as clicks with no pointer behind them.
      onClick={e => e.detail === 0 && onStep()}
    >
      <ChevronIcon direction={icon} />
    </Button>
  )
}

const CHEVRON_PATH = { left: 'm15 18-6-6 6-6', right: 'm9 18 6-6-6-6', up: 'm18 15-6-6-6 6', down: 'm6 9 6 6 6-6' }

function ChevronIcon({ direction }: { direction: keyof typeof CHEVRON_PATH }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d={CHEVRON_PATH[direction]} />
    </svg>
  )
}
