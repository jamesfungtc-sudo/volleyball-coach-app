import { clampToRect, FULL_VIEW, type Point } from '../engine/court'
import { analyseDefence, BLOCKER_Y, isInBlockZone } from '../engine/defence'
import { suggestDefence, type DefenderTarget } from '../engine/defenders'
import type { HitType } from '../engine/hitZones'

export type IconKind = 'home' | 'opponent' | 'ball'

export interface BoardIcon extends Point {
  id: string
  kind: IconKind
  label: string
}

export type ZoomMode = 'full' | 'defence'

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
  /** Non-blocking home players follow the suggested defence spots. */
  autoDefence: boolean
  /** Home players the coach has placed by hand; auto defence leaves them where they are. */
  manual: string[]
  tool: Tool
  drawings: Drawing[]
}

export type BoardAction =
  | { type: 'move'; id: string; to: Point }
  /** End of a drag: home players released in the block zone snap onto the net. */
  | { type: 'drop'; id: string }
  | { type: 'setHitter'; id: string }
  | { type: 'setZoom'; zoom: ZoomMode }
  | { type: 'toggleShadow' }
  | { type: 'setHitView'; hitView: HitView }
  | { type: 'toggleAutoDefence' }
  /** Send hand-placed defenders back to their suggested spots. */
  | { type: 'resetDefenders' }
  | { type: 'setTool'; tool: Tool }
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
  autoDefence: true,
  manual: [],
  tool: 'move',
  drawings: [],
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
      const to = clampToRect(action.to, FULL_VIEW)
      const moved = updateIcon(state, action.id, icon => ({ ...icon, ...to }))
      const isHome = state.icons.some(i => i.id === action.id && i.kind === 'home')
      return isHome && !state.manual.includes(action.id) ? { ...moved, manual: [...state.manual, action.id] } : moved
    }
    case 'drop':
      return updateIcon(state, action.id, icon => (isBlocker(icon) ? { ...icon, y: BLOCKER_Y } : icon))
    case 'setHitter': {
      const icon = state.icons.find(i => i.id === action.id)
      return icon?.kind === 'opponent' ? { ...state, hitterId: action.id } : state
    }
    case 'setZoom':
      return { ...state, zoom: action.zoom }
    case 'toggleShadow':
      return { ...state, showShadow: !state.showShadow }
    case 'setHitView':
      return { ...state, hitView: action.hitView }
    case 'toggleAutoDefence':
      return { ...state, autoDefence: !state.autoDefence, manual: [] }
    case 'resetDefenders':
      return { ...state, manual: [] }
    case 'setTool':
      return { ...state, tool: action.tool }
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
      }
  }
}

function updateIcon(state: BoardState, id: string, update: (icon: BoardIcon) => BoardIcon): BoardState {
  return { ...state, icons: state.icons.map(icon => (icon.id === id ? update(icon) : icon)) }
}

/** Suggested spot for each non-blocking home player (empty if there's no hitter). */
export function suggestedDefence(state: BoardState): Map<string, DefenderTarget> {
  const hitter = state.icons.find(icon => icon.id === state.hitterId)
  if (!hitter) return new Map()
  const blockerXs = state.icons.filter(isBlocker).map(icon => icon.x)
  const defenders = state.icons.filter(icon => icon.kind === 'home' && !isBlocker(icon))
  return suggestDefence(analyseDefence({ hitter, blockerXs }), defenders)
}

/** Move every auto-managed defender onto its suggested spot. */
function withAutoDefence(state: BoardState): BoardState {
  if (!state.autoDefence) return state
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
