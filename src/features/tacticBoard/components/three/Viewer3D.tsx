import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Button } from '@/components/ui/button'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { ATTACK_LINE_DISTANCE, COURT_LENGTH, COURT_WIDTH, LINE_WIDTH, NET_Y, type Point } from '../../engine/court'
import { analyseDefence, DEFAULT_BLOCK_SIZE, type BlockSize, type DefenceAnalysis } from '../../engine/defence'
import { rollZones, tipZone } from '../../engine/hitZones'
import {
  ANTENNA_ABOVE_NET,
  ARM_LENGTH,
  blockHandHeight,
  contactHeight,
  eyeHeight,
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
import { blockersOf, isBlocker, type BoardIcon, type BoardState } from '../../state/boardState'

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
/** Share of the view's height the ball sits above the centre. */
const BALL_ABOVE_CENTRE = 0.18

interface Viewer3DProps {
  state: BoardState
  viewerId: string
  onChangeViewer: (id: string) => void
  onClose: () => void
}

export default function Viewer3D({ state, viewerId, onChangeViewer, onClose }: Viewer3DProps) {
  const [stance, setStance] = useState<Stance>('crouch')
  const look = useLook(viewerId)

  const defenders = state.icons
    .filter(icon => icon.kind === 'home' && !isBlocker(icon))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))
  const viewer = defenders.find(icon => icon.id === viewerId)
  const index = defenders.findIndex(icon => icon.id === viewerId)
  const step = (by: number) => onChangeViewer(defenders[(index + by + defenders.length) % defenders.length].id)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!viewer) return null

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
          <span className="whitespace-nowrap text-sm font-semibold">Player {viewer.label}'s view</span>
          <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => step(1)} aria-label="Next player">
            <ChevronIcon direction="right" />
          </Button>
        </div>
      </div>

      <div
        className="relative min-h-0 flex-1 touch-none select-none"
        onPointerDown={look.onPointerDown}
        onPointerMove={look.onPointerMove}
        onPointerUp={look.onPointerUp}
        onPointerCancel={look.onPointerUp}
        onWheel={look.onWheel}
      >
        <Canvas frameloop="demand" dpr={[1, 2]} camera={{ near: 0.05, far: 200 }} aria-label={`3D view from player ${viewer.label}`}>
          <Scene state={state} viewer={viewer} stance={stance} yaw={look.yaw} pitch={look.pitch} zoom={look.zoom} />
        </Canvas>
        <p className="pointer-events-none absolute bottom-2 left-0 right-0 text-center text-xs text-white/80 [text-shadow:0_1px_2px_rgb(0_0_0/0.8)]">
          Drag to look around · pinch to zoom
        </p>
      </div>

      <div className="flex shrink-0 items-center justify-center gap-2 px-2 py-1">
        <SegmentedControl value={stance} onChange={setStance} options={STANCE_OPTIONS} />
        <Button variant="outline" className="h-11 px-3" onClick={look.reset}>
          Face hitter
        </Button>
      </div>
    </div>
  )
}

/** Drag to turn the head, pinch or wheel to zoom. Resets when the viewer changes. */
function useLook(viewerId: string) {
  const [yaw, setYaw] = useState(0)
  const [pitch, setPitch] = useState(0)
  const [zoom, setZoom] = useState(1)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ distance: number; zoom: number } | null>(null)

  const reset = () => {
    setYaw(0)
    setPitch(0)
    setZoom(1)
  }
  useEffect(reset, [viewerId])

  const clampZoom = (v: number) => Math.min(ZOOM.max, Math.max(ZOOM.min, v))
  const spread = () => {
    const [a, b] = [...pointers.current.values()]
    return Math.hypot(a.x - b.x, a.y - b.y)
  }

  return {
    yaw,
    pitch,
    zoom,
    reset,
    onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
      if ((e.target as HTMLElement).closest('button')) return
      e.currentTarget.setPointerCapture(e.pointerId)
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pointers.current.size === 2) pinch.current = { distance: spread(), zoom }
    },
    onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
      const last = pointers.current.get(e.pointerId)
      if (!last) return
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pinch.current && pointers.current.size === 2) {
        setZoom(clampZoom(pinch.current.zoom * (pinch.current.distance / Math.max(1, spread()))))
        return
      }
      // Turning slower when zoomed in keeps the drag feeling the same.
      const scale = LOOK_RADIANS_PER_PX * zoom
      setYaw(y => y - (e.clientX - last.x) * scale)
      setPitch(p => Math.min(MAX_PITCH, Math.max(-MAX_PITCH, p + (e.clientY - last.y) * scale)))
    },
    onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
      pointers.current.delete(e.pointerId)
      if (pointers.current.size < 2) pinch.current = null
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
  yaw: number
  pitch: number
  zoom: number
}

function Scene({ state, viewer, stance, yaw, pitch, zoom }: SceneProps) {
  const colors = useBoardColors()
  const hitter = state.icons.find(icon => icon.id === state.hitterId)
  const blockers = useMemo(() => blockersOf(state.icons), [state.icons])
  const analysis = useMemo(() => (hitter ? analyseDefence({ hitter, blockers }) : null), [hitter, blockers])
  const contact = analysis?.contact ?? hitter ?? { x: COURT_WIDTH / 2, y: NET_Y - 1 }
  const ball = toWorld(contact, contactHeight(state.net))
  const eye = toWorld(viewer, eyeHeight(viewer.blockSize ?? DEFAULT_BLOCK_SIZE, stance))

  return (
    <>
      <color attach="background" args={[colors.sky]} />
      <ambientLight intensity={1.1} />
      <directionalLight position={[4, 12, 10]} intensity={1.6} />
      <FirstPersonCamera eye={eye} target={ball} yaw={yaw} pitch={pitch} zoom={zoom} />

      <CourtFloor colors={colors} />
      {analysis && state.showShadow && <Zones analysis={analysis} state={state} colors={colors} />}
      <Net net={state.net} colors={colors} />

      {state.icons.map(icon =>
        icon.kind === 'ball' || icon.id === viewer.id ? null : (
          <Figure
            key={icon.id}
            icon={icon}
            pose={icon.id === state.hitterId ? 'hitter' : isBlocker(icon) ? 'blocker' : 'ready'}
            net={state.net}
            ball={contact}
            colors={colors}
          />
        ),
      )}
      <mesh position={ball}>
        <sphereGeometry args={[BALL_RADIUS, 24, 16]} />
        <meshStandardMaterial color={colors.ball} roughness={0.6} />
      </mesh>
    </>
  )
}

function FirstPersonCamera({ eye, target, yaw, pitch, zoom }: { eye: Vec3; target: Vec3; yaw: number; pitch: number; zoom: number }) {
  const camera = useThree(s => s.camera) as THREE.PerspectiveCamera
  const invalidate = useThree(s => s.invalidate)
  const aspect = useThree(s => s.size.width / Math.max(1, s.size.height))
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
function Figure({ icon, pose, net, ball, colors }: { icon: BoardIcon; pose: Pose; net: NetKind; ball: Point; colors: BoardColors }) {
  const size: BlockSize = icon.kind === 'home' ? (icon.blockSize ?? DEFAULT_BLOCK_SIZE) : DEFAULT_BLOCK_SIZE
  const height = PLAYER_HEIGHT[size]
  const color = icon.kind === 'home' ? colors.home : colors.opponent
  // Our players face the opponents (-Z); theirs face us (+Z).
  const facing = icon.kind === 'home' ? -1 : 1

  const reach = pose === 'hitter' ? contactHeight(net) : pose === 'blocker' ? blockHandHeight(size, net) : 0
  const lift = pose === 'ready' ? 0 : jumpFor(size, reach)
  const [x, , z] = toWorld(icon)
  const shoulderY = lift + height * SHOULDER_RATIO
  const shoulders: Vec3[] = [-1, 1].map(side => [x + side * SHOULDER_HALF_WIDTH, shoulderY, z])

  const hands: Vec3[] = shoulders.map(([sx, , sz], i): Vec3 => {
    if (pose === 'blocker') return [sx, reach, sz + facing * 0.15]
    if (pose === 'hitter' && i === 1) {
      const [bx, by, bz] = toWorld(ball, reach)
      return [bx, by - BALL_RADIUS, bz]
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

function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d={direction === 'left' ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'} />
    </svg>
  )
}
