import { useReducer } from 'react'
import { Button } from '@/components/ui/button'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { TacticBoard } from './components/TacticBoard'
import {
  boardReducer,
  initialBoardState,
  isBlocker,
  type HitView,
  type Tool,
  type ZoomMode,
} from './state/boardState'
import './tacticBoard.css'

const ZOOM_OPTIONS: { value: ZoomMode; label: string }[] = [
  { value: 'full', label: 'Full' },
  { value: 'defence', label: 'Defence' },
]

const HIT_OPTIONS: { value: HitView; label: string }[] = [
  { value: 'hard', label: 'Hard' },
  { value: 'roll', label: 'Roll' },
  { value: 'tip', label: 'Tip' },
  { value: 'all', label: 'All' },
]

const TOOL_OPTIONS: { value: Tool; label: string }[] = [
  { value: 'move', label: 'Move' },
  { value: 'pen', label: 'Pen' },
  { value: 'arrow', label: 'Arrow' },
]

const LEGEND = {
  blocked: { label: 'Blocked', color: 'hsl(var(--tb-shadow))' },
  open: { label: 'Open', color: 'hsl(var(--tb-lane))' },
  seam: { label: 'Seam', color: 'hsl(var(--tb-seam))' },
  roll: { label: 'Roll', color: 'hsl(var(--tb-roll-fill))' },
  tip: { label: 'Tip', color: 'hsl(var(--tb-tip-fill))' },
}

const LEGEND_FOR: Record<HitView, (keyof typeof LEGEND)[]> = {
  hard: ['blocked', 'open', 'seam'],
  roll: ['blocked', 'roll'],
  tip: ['blocked', 'tip'],
  all: ['blocked', 'open', 'seam', 'roll', 'tip'],
}

export default function TacticBoardPage() {
  const [state, dispatch] = useReducer(boardReducer, initialBoardState)
  const hasMovedDefenders =
    state.autoDefence &&
    state.icons.some(icon => state.manual.includes(icon.id) && icon.kind === 'home' && !isBlocker(icon))

  return (
    // Fill the space above the tab bar (h-14 + safe area, see AppShell/TabBar).
    <div className="flex h-[calc(100dvh-3.5rem-env(safe-area-inset-bottom))] flex-col">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2 pt-[calc(0.5rem+env(safe-area-inset-top))]">
        <h1 className="hidden text-lg font-semibold sm:block">Tactics</h1>
        <div className="flex flex-1 items-center justify-end gap-2">
          <Button
            variant={state.showShadow ? 'default' : 'outline'}
            className="h-11 shrink-0 px-3"
            onClick={() => dispatch({ type: 'toggleShadow' })}
            aria-pressed={state.showShadow}
          >
            Shadow
          </Button>
          <SegmentedControl
            value={state.zoom}
            onChange={zoom => dispatch({ type: 'setZoom', zoom })}
            options={ZOOM_OPTIONS}
          />
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 shrink-0"
            onClick={() => dispatch({ type: 'reset' })}
            aria-label="Reset board"
            title="Reset board"
          >
            <ResetIcon />
          </Button>
        </div>
      </header>
      <div className="flex shrink-0 flex-wrap items-center gap-2 px-3 pt-2">
        {state.showShadow && (
          <SegmentedControl
            value={state.hitView}
            onChange={hitView => dispatch({ type: 'setHitView', hitView })}
            options={HIT_OPTIONS}
          />
        )}
        <Button
          variant={state.autoDefence ? 'default' : 'outline'}
          className="h-11 shrink-0 px-3"
          onClick={() => dispatch({ type: 'toggleAutoDefence' })}
          aria-pressed={state.autoDefence}
          title="Move non-blocking players to suggested defence spots"
        >
          Auto D
        </Button>
        {hasMovedDefenders && (
          <Button
            variant="outline"
            className="h-11 shrink-0 px-3"
            onClick={() => dispatch({ type: 'resetDefenders' })}
            title="Send hand-placed defenders back to their suggested spots"
          >
            Reset D
          </Button>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 px-3 pt-2 text-xs text-muted-foreground">
        {state.showShadow &&
          LEGEND_FOR[state.hitView].map(key => LEGEND[key]).map(({ label, color }) => (
            <span key={label} className="inline-flex items-center gap-1.5">
              <span
                className="h-3 w-3 rounded-sm border border-border"
                // Tints are translucent, so show them over the court colour like on the board.
                style={{ background: `linear-gradient(${color}, ${color}), hsl(var(--tb-court))` }}
              />
              {label}
            </span>
          ))}
        {/* Hidden on phones to keep the court as large as possible. */}
        <span className="ml-auto hidden sm:inline">Tap opponent = hitter · Drag to net = block</span>
      </div>
      <div className="relative min-h-0 flex-1 p-2">
        <TacticBoard state={state} dispatch={dispatch} />
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-border bg-surface-elevated/90 p-1 shadow-lg backdrop-blur">
          <SegmentedControl
            value={state.tool}
            onChange={tool => dispatch({ type: 'setTool', tool })}
            options={TOOL_OPTIONS}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11"
            onClick={() => dispatch({ type: 'undoDrawing' })}
            disabled={state.drawings.length === 0}
            aria-label="Undo last drawing"
            title="Undo last drawing"
          >
            <UndoIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11"
            onClick={() => dispatch({ type: 'clearDrawings' })}
            disabled={state.drawings.length === 0}
            aria-label="Clear drawings"
            title="Clear drawings"
          >
            <ClearIcon />
          </Button>
        </div>
      </div>
    </div>
  )
}

function UndoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </svg>
  )
}

function ClearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
    </svg>
  )
}

function ResetIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  )
}
