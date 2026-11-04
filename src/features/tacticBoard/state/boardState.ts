import { BOARD_BOUNDS, clampToRect, COURT_WIDTH, NET_Y, type Point } from '../engine/court'
import {
  analyseDefence,
  BALL_DIAMETER,
  BLOCK_SIZES,
  BLOCKER_Y,
  DEFAULT_BLOCK_SIZE,
  isInBlockZone,
  type Blocker,
  type BlockSize,
} from '../engine/defence'
import { suggestDefence, type DefenceSystem, type DefenderTarget } from '../engine/defenders'
import type { HitType } from '../engine/hitZones'
import type { NetKind } from '../engine/view3d'

export type IconKind = 'home' | 'opponent' | 'ball'

export interface BoardIcon extends Point {
  id: string
  kind: IconKind
  label: string
  /** Home players: how big a block they put up (medium when unset). Kept as they move around. */
  blockSize?: BlockSize
}

export type ZoomMode = 'full' | 'defence'

/** Auto D: which system places the non-blockers, or 'off' to leave them where they are. */
export type AutoDefence = 'off' | DefenceSystem

/** 'move' drags icons; the drawing tools draw on the board instead. */
export type Tool = 'move' | 'pen' | 'arrow'

export interface Drawing {
  id: string
  kind: 'pen' | 'arrow'
  /** Pen: the stroke path. Arrow: [tail, head]. */
  points: Point[]
}

/** Which attack's landing zones to show; 'all' layers them. */
export type HitView = HitType | 'all'

export interface BoardState {
  icons: BoardIcon[]
  /** Opponent icon treated as the attacker; drives the defence view and the block shadow. */
  hitterId: string
  zoom: ZoomMode
  showShadow: boolean
  hitView: HitView
  /** Non-blocking home players follow the chosen system's defence spots. */
  autoDefence: AutoDefence
  /** Home players the coach has placed by hand; auto defence leaves them where they are. */
  manual: string[]
  tool: Tool
  drawings: Drawing[]
  /** Net height for the 3D view. */
  net: NetKind
}

export type BoardAction =
  | { type: 'move'; id: string; to: Point }
  /** End of a drag: home players released in the block zone snap onto the net. */
  | { type: 'drop'; id: string }
  /** Tap on an opponent: they become the hitter and our default block lines up against them. */
  | { type: 'setHitter'; id: string }
  | { type: 'setBlockSize'; id: string; size: BlockSize }
  | { type: 'setZoom'; zoom: ZoomMode }
  | { type: 'toggleShadow' }
  | { type: 'setHitView'; hitView: HitView }
  | { type: 'setAutoDefence'; autoDefence: AutoDefence }
  /** Send hand-placed defenders back to their suggested spots. */
  | { type: 'resetDefenders' }
  /** Hold a defender where they are (Auto D leaves them alone), or hand them back to Auto D. */
  | { type: 'setManual'; id: string; manual: boolean }
  | { type: 'setTool'; tool: Tool }
  | { type: 'setNet'; net: NetKind }
  | { type: 'addDrawing'; drawing: Drawing }
  | { type: 'undoDrawing' }
  | { type: 'clearDrawings' }
  | { type: 'reset' }

// Opponents face down the screen, so their left side (positions 4, 5) is on screen right.
// Default scene: opponent outside hitter attacking from their position 4 into a closed double
// block (our 2 + 3), with our 4 off the net and the back row in a perimeter defence.
const DEFAULT_ICONS: BoardIcon[] = [
  { id: 'h4', kind: 'home', label: '4', x: 1.5, y: 12.2 },
  { id: 'h3', kind: 'home', label: '3', x: 7.22, y: BLOCKER_Y },
  { id: 'h2', kind: 'home', label: '2', x: 7.9, y: BLOCKER_Y },
  { id: 'h5', kind: 'home', label: '5', x: 1.3, y: 15.5 },
  { id: 'h6', kind: 'home', label: '6', x: 4.5, y: 16.8 },
  { id: 'h1', kind: 'home', label: '1', x: 8.2, y: 15.5 },

  { id: 'o4', kind: 'opponent', label: '4', x: 8.0, y: 8.0 },
  { id: 'o3', kind: 'opponent', label: '3', x: 4.5, y: 8.0 },
  { id: 'o2', kind: 'opponent', label: '2', x: 1.0, y: 8.0 },
  { id: 'o5', kind: 'opponent', label: '5', x: 7.5, y: 2.5 },
  { id: 'o6', kind: 'opponent', label: '6', x: 4.5, y: 1.5 },
  { id: 'o1', kind: 'opponent', label: '1', x: 1.5, y: 2.5 },

  { id: 'ball', kind: 'ball', label: '', x: 7.5, y: 8.5 },
]

export const initialBoardState: BoardState = withAutoDefence({
  icons: DEFAULT_ICONS,
  hitterId: 'o4',
  zoom: 'full',
  showShadow: true,
  hitView: 'hard',
  autoDefence: 'perimeter',
  manual: [],
  tool: 'move',
  drawings: [],
  net: 'men',
})

export function isBlocker(icon: BoardIcon): boolean {
  return icon.kind === 'home' && isInBlockZone(icon)
}

export function boardReducer(state: BoardState, action: BoardAction): BoardState {
  return withAutoDefence(applyAction(state, action))
}

function applyAction(state: BoardState, action: BoardAction): BoardState {
  switch (action.type) {
    case 'move': {
      const to = clampToRect(action.to, BOARD_BOUNDS)
      const moved = updateIcon(state, action.id, icon => ({ ...icon, ...to }))
      const isHome = state.icons.some(i => i.id === action.id && i.kind === 'home')
      return isHome && !state.manual.includes(action.id) ? { ...moved, manual: [...state.manual, action.id] } : moved
    }
    case 'drop':
      return updateIcon(state, action.id, icon => (isBlocker(icon) ? { ...icon, y: BLOCKER_Y } : icon))
    case 'setHitter': {
      const hitter = state.icons.find(i => i.id === action.id)
      if (hitter?.kind !== 'opponent') return state
      // A new attack is a new scene: hand placements give way to the defaults.
      return { ...state, hitterId: action.id, icons: lineUpBlock(state.icons, hitter), manual: [] }
    }
    case 'setBlockSize':
      return updateIcon(state, action.id, icon => (icon.kind === 'home' ? { ...icon, blockSize: action.size } : icon))
    case 'setZoom':
      return { ...state, zoom: action.zoom }
    case 'toggleShadow':
      return { ...state, showShadow: !state.showShadow }
    case 'setHitView':
      return { ...state, hitView: action.hitView }
    case 'setAutoDefence':
      // A new system starts from its own suggestions, so hand placements are dropped.
      return { ...state, autoDefence: action.autoDefence, manual: [] }
    case 'resetDefenders':
      return { ...state, manual: [] }
    case 'setManual': {
      const others = state.manual.filter(id => id !== action.id)
      return { ...state, manual: action.manual ? [...others, action.id] : others }
    }
    case 'setTool':
      return { ...state, tool: action.tool }
    case 'setNet':
      return { ...state, net: action.net }
    case 'addDrawing':
      return { ...state, drawings: [...state.drawings, action.drawing] }
    case 'undoDrawing':
      return { ...state, drawings: state.drawings.slice(0, -1) }
    case 'clearDrawings':
      return { ...state, drawings: [] }
    case 'reset':
      // Board positions reset; view settings stay as the coach left them.
      return {
        ...initialBoardState,
        zoom: state.zoom,
        showShadow: state.showShadow,
        hitView: state.hitView,
        autoDefence: state.autoDefence,
        tool: state.tool,
        net: state.net,
      }
  }
}

/** Outside hitters (beyond this from a sideline) get a double block; anyone in between, the middle alone. */
const OUTSIDE_ATTACK_BAND = 3
/** Blocker centres in a closed double block: icons touching (2 × PLAYER_RADIUS). */
const DOUBLE_BLOCK_SPACING = 0.68
/** Hand gap a default block is set with: just under the ball, so it's closed. */
const CLOSED_HAND_GAP = BALL_DIAMETER - 0.03
/** The outside blocker sets the block just inside the hitter's arm. */
const OUTSIDE_BLOCKER_INSET = 0.1
/** Keep blockers' hands inside the antennae. */
const BLOCKER_MAX_FROM_CENTRE = COURT_WIDTH / 2 - 0.4
/** Where front-row players stand when they're not blocking and Auto D is off. */
const OFF_NET_SPOT: Record<string, Point> = {
  '4': { x: 1.5, y: NET_Y + 3.2 },
  '3': { x: 4.5, y: NET_Y + 3.2 },
  '2': { x: 7.5, y: NET_Y + 3.2 },
}

/**
 * Who blocks which attacker, by our court positions: an attack from our right (their 4) gets our
 * 2 + 3, from our left (their 2) our 4 + 3, through the middle our 3 alone. Returns blocker x's.
 */
export function defaultBlock(
  hitter: Point,
  sizeOf: (label: string) => BlockSize = () => DEFAULT_BLOCK_SIZE,
): { label: string; x: number }[] {
  // Touching icons close a medium or large block; smaller hands have to squeeze in tighter.
  const spacing = (a: string, b: string) =>
    Math.min(DOUBLE_BLOCK_SPACING, (BLOCK_SIZES[sizeOf(a)].width + BLOCK_SIZES[sizeOf(b)].width) / 2 + CLOSED_HAND_GAP)
  // Rounded to the centimetre so the same tap always gives exactly the same picture.
  const clampX = (x: number) =>
    Math.round(Math.min(COURT_WIDTH / 2 + BLOCKER_MAX_FROM_CENTRE, Math.max(COURT_WIDTH / 2 - BLOCKER_MAX_FROM_CENTRE, x)) * 100) / 100
  if (hitter.x > COURT_WIDTH - OUTSIDE_ATTACK_BAND) {
    const outside = clampX(hitter.x - OUTSIDE_BLOCKER_INSET)
    return [{ label: '2', x: outside }, { label: '3', x: clampX(outside - spacing('2', '3')) }]
  }
  if (hitter.x < OUTSIDE_ATTACK_BAND) {
    const outside = clampX(hitter.x + OUTSIDE_BLOCKER_INSET)
    return [{ label: '4', x: outside }, { label: '3', x: clampX(outside + spacing('4', '3')) }]
  }
  return [{ label: '3', x: clampX(hitter.x) }]
}

/** Put the default blockers on the net and send anyone else off it; the ball goes to the hitter. */
function lineUpBlock(icons: BoardIcon[], hitter: BoardIcon): BoardIcon[] {
  const block = defaultBlock(hitter, label => blockSizeOf(icons.find(i => i.kind === 'home' && i.label === label)))
  const towardMiddle = hitter.x > COURT_WIDTH / 2 ? -1 : 1
  return icons.map(icon => {
    if (icon.kind === 'ball') return { ...icon, x: hitter.x + 0.5 * towardMiddle, y: hitter.y + 0.5 }
    if (icon.kind !== 'home') return icon
    const blocker = block.find(b => b.label === icon.label)
    if (blocker) return { ...icon, x: blocker.x, y: BLOCKER_Y }
    if (!isBlocker(icon)) return icon
    return { ...icon, ...(OFF_NET_SPOT[icon.label] ?? { x: icon.x, y: NET_Y + 3.2 }) }
  })
}

function blockSizeOf(icon: BoardIcon | undefined): BlockSize {
  return icon?.blockSize ?? DEFAULT_BLOCK_SIZE
}

/** Our players at the net, as the defence model sees them. */
export function blockersOf(icons: BoardIcon[]): Blocker[] {
  return icons.filter(isBlocker).map(icon => ({ x: icon.x, size: blockSizeOf(icon) }))
}

function updateIcon(state: BoardState, id: string, update: (icon: BoardIcon) => BoardIcon): BoardState {
  return { ...state, icons: state.icons.map(icon => (icon.id === id ? update(icon) : icon)) }
}

/** Suggested spot for each non-blocking home player (empty when Auto D is off or there's no hitter). */
export function suggestedDefence(state: BoardState): Map<string, DefenderTarget> {
  if (state.autoDefence === 'off') return new Map()
  const hitter = state.icons.find(icon => icon.id === state.hitterId)
  if (!hitter) return new Map()

  const defenders = state.icons
    .filter(icon => icon.kind === 'home' && !isBlocker(icon))
    .map(icon => ({ ...icon, zone: Number(icon.label) || undefined }))
  return suggestDefence(analyseDefence({ hitter, blockers: blockersOf(state.icons) }), defenders, state.autoDefence)
}

/** Move every auto-managed defender onto its suggested spot. */
function withAutoDefence(state: BoardState): BoardState {
  if (state.autoDefence === 'off') return state
  const suggestions = suggestedDefence(state)
  let changed = false
  const icons = state.icons.map(icon => {
    const target = suggestions.get(icon.id)
    if (!target || state.manual.includes(icon.id)) return icon
    if (target.point.x === icon.x && target.point.y === icon.y) return icon
    changed = true
    return { ...icon, ...target.point }
  })
  return changed ? { ...state, icons } : state
}
