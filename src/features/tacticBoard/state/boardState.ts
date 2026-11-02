import { clampToRect, FULL_VIEW, type Point } from '../engine/court'
import { BLOCKER_Y, isInBlockZone } from '../engine/defence'

export type IconKind = 'home' | 'opponent' | 'ball'

export interface BoardIcon extends Point {
  id: string
  kind: IconKind
  label: string
}

export type ZoomMode = 'full' | 'defence'

export interface BoardState {
  icons: BoardIcon[]
  /** Opponent icon treated as the attacker; drives the defence view and the block shadow. */
  hitterId: string
  zoom: ZoomMode
  showShadow: boolean
}

export type BoardAction =
  | { type: 'move'; id: string; to: Point }
  /** End of a drag: home players released in the block zone snap onto the net. */
  | { type: 'drop'; id: string }
  | { type: 'setHitter'; id: string }
  | { type: 'setZoom'; zoom: ZoomMode }
  | { type: 'toggleShadow' }
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

export const initialBoardState: BoardState = {
  icons: DEFAULT_ICONS,
  hitterId: 'o4',
  zoom: 'full',
  showShadow: true,
}

export function isBlocker(icon: BoardIcon): boolean {
  return icon.kind === 'home' && isInBlockZone(icon)
}

export function boardReducer(state: BoardState, action: BoardAction): BoardState {
  switch (action.type) {
    case 'move': {
      const to = clampToRect(action.to, FULL_VIEW)
      return updateIcon(state, action.id, icon => ({ ...icon, ...to }))
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
    case 'reset':
      return { ...initialBoardState, zoom: state.zoom, showShadow: state.showShadow }
  }
}

function updateIcon(state: BoardState, id: string, update: (icon: BoardIcon) => BoardIcon): BoardState {
  return { ...state, icons: state.icons.map(icon => (icon.id === id ? update(icon) : icon)) }
}
