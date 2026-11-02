import { useReducer } from 'react'
import { Button } from '@/components/ui/button'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { TacticBoard } from './components/TacticBoard'
import { boardReducer, initialBoardState, type ZoomMode } from './state/boardState'
import './tacticBoard.css'

const ZOOM_OPTIONS: { value: ZoomMode; label: string }[] = [
  { value: 'full', label: 'Full' },
  { value: 'defence', label: 'Defence' },
]

const LEGEND = [
  { label: 'Blocked', color: 'hsl(var(--tb-shadow))' },
  { label: 'Open', color: 'hsl(var(--tb-lane))' },
  { label: 'Seam', color: 'hsl(var(--tb-seam))' },
]

export default function TacticBoardPage() {
  const [state, dispatch] = useReducer(boardReducer, initialBoardState)

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
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 px-3 pt-2 text-xs text-muted-foreground">
        {state.showShadow &&
          LEGEND.map(({ label, color }) => (
            <span key={label} className="inline-flex items-center gap-1.5">
              <span
                className="h-3 w-3 rounded-sm border border-border"
                // Tints are translucent, so show them over the court colour like on the board.
                style={{ background: `linear-gradient(${color}, ${color}), hsl(var(--tb-court))` }}
              />
              {label}
            </span>
          ))}
        <span className="ml-auto">Tap opponent = hitter · Drag to net = block</span>
      </div>
      <div className="min-h-0 flex-1 p-2">
        <TacticBoard state={state} dispatch={dispatch} />
      </div>
    </div>
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
