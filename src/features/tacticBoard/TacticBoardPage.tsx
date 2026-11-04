import { lazy, Suspense, useCallback, useEffect, useId, useReducer, useState, type Dispatch } from 'react'
import { Button } from '@/components/ui/button'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { cn } from '@/lib/utils'
import { TacticBoard } from './components/TacticBoard'
import {
  boardReducer,
  initialBoardState,
  isBlocker,
  type AutoDefence,
  type BoardAction,
  type BoardState,
  type HitView,
  type Tool,
  type ZoomMode,
} from './state/boardState'
import type { NetKind } from './engine/view3d'
import './tacticBoard.css'

// three.js is big; only download it when someone opens the 3D view.
const Viewer3D = lazy(() => import('./components/three/Viewer3D'))

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

const AUTO_DEFENCE_OPTIONS: { value: AutoDefence; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'perimeter', label: 'Perimeter' },
  { value: 'rotational', label: 'Rotational' },
]

const NET_OPTIONS: { value: NetKind; label: string }[] = [
  { value: 'men', label: 'Men' },
  { value: 'women', label: 'Women' },
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
  const [presenting, setPresenting] = useState(false)
  // Stable, so PresentView's full-screen effect runs once per visit rather than on every render.
  const exitPresent = useCallback(() => setPresenting(false), [])
  // Defender whose 3D view is open, on top of whichever 2D screen opened it.
  const [viewFrom, setViewFrom] = useState<string | null>(null)
  const closeView = useCallback(() => setViewFrom(null), [])

  const viewer = viewFrom && (
    <Suspense fallback={<Loading3D />}>
      <Viewer3D state={state} dispatch={dispatch} viewerId={viewFrom} onChangeViewer={setViewFrom} onClose={closeView} />
    </Suspense>
  )

  if (presenting) {
    return (
      <>
        <PresentView state={state} dispatch={dispatch} onExit={exitPresent} onViewFrom={setViewFrom} />
        {viewer}
      </>
    )
  }

  return (
    <>
      {/* Fill the space above the tab bar (h-14 + safe area, see AppShell/TabBar). */}
      <div className="flex h-[calc(100dvh-3.5rem-env(safe-area-inset-bottom))] flex-col">
        <header className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2 pt-[calc(0.5rem+env(safe-area-inset-top))]">
          <h1 className="mr-auto hidden text-lg font-semibold sm:block">Tactics</h1>
          <Button className="h-11 shrink-0 gap-1.5 px-3" onClick={() => setPresenting(true)} title="Show the court full screen">
            <PresentIcon />
            Present
          </Button>
          <SegmentedControl
            value={state.zoom}
            onChange={zoom => dispatch({ type: 'setZoom', zoom })}
            options={ZOOM_OPTIONS}
            className="ml-auto sm:ml-0"
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
        </header>

        <div className="flex shrink-0 flex-wrap items-center gap-2 px-3 pt-2">
          <DefenceSettings state={state} dispatch={dispatch} />
        </div>

        <div className="relative min-h-0 flex-1 p-2">
          <TacticBoard state={state} dispatch={dispatch} onViewFrom={setViewFrom} />
          {state.showShadow && <Legend hitView={state.hitView} />}
        </div>

        {/* Below the court rather than floating over it, so it never hides a player. */}
        <div className="flex shrink-0 justify-center pb-2">
          <DrawingToolbar state={state} dispatch={dispatch} />
        </div>
      </div>
      {viewer}
    </>
  )
}

function Loading3D() {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-background text-sm text-muted-foreground">
      Loading 3D view…
    </div>
  )
}

interface BoardProps {
  state: BoardState
  dispatch: Dispatch<BoardAction>
}

/**
 * The board filling the screen, for showing a player face to face. Covers the app's tab bar; view and
 * drawing controls stay on screen, the rest sit behind a menu so the court keeps the space.
 * Browsers that allow it (Android, desktop) also go truly full screen; iPhone Safari doesn't, but
 * the app opened from the Home Screen has no browser bars anyway.
 */
function PresentView({
  state,
  dispatch,
  onExit,
  onViewFrom,
}: BoardProps & { onExit: () => void; onViewFrom: (id: string) => void }) {
  useEffect(() => {
    // Older browsers return nothing instead of a promise.
    document.documentElement.requestFullscreen?.()?.catch(() => {})
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onExit()
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    }
  }, [onExit])

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] pt-[env(safe-area-inset-top)]">
      <div className="flex shrink-0 items-center gap-2 px-2 pt-1">
        <SegmentedControl
          value={state.zoom}
          onChange={zoom => dispatch({ type: 'setZoom', zoom })}
          options={ZOOM_OPTIONS}
          className="mr-auto"
        />
        <SettingsMenu state={state} dispatch={dispatch} />
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 shrink-0"
          onClick={onExit}
          aria-label="Exit present mode"
          title="Exit present mode"
        >
          <CloseIcon />
        </Button>
      </div>
      <div className="relative min-h-0 flex-1 p-1">
        <TacticBoard state={state} dispatch={dispatch} presenting onViewFrom={onViewFrom} />
        {state.showShadow && <Legend hitView={state.hitView} />}
      </div>
      <div className="flex shrink-0 justify-center pb-1">
        <DrawingToolbar state={state} dispatch={dispatch} />
      </div>
    </div>
  )
}

/** Shadow, hit type, Auto D and defender reset: a wrapping row on the page, a panel in present mode. */
function DefenceSettings({ state, dispatch }: BoardProps) {
  const hasMovedDefenders =
    state.autoDefence !== 'off' &&
    state.icons.some(icon => state.manual.includes(icon.id) && icon.kind === 'home' && !isBlocker(icon))
  return (
    <>
      <Button
        variant={state.showShadow ? 'secondary' : 'outline'}
        className="h-10 shrink-0 px-3"
        onClick={() => dispatch({ type: 'toggleShadow' })}
        aria-pressed={state.showShadow}
      >
        Shadow {state.showShadow ? 'on' : 'off'}
      </Button>
      {state.showShadow && (
        <NativeSelect
          label="Hit"
          value={state.hitView}
          options={HIT_OPTIONS}
          onChange={hitView => dispatch({ type: 'setHitView', hitView })}
        />
      )}
      <NativeSelect
        label="Auto D"
        value={state.autoDefence}
        options={AUTO_DEFENCE_OPTIONS}
        onChange={autoDefence => dispatch({ type: 'setAutoDefence', autoDefence })}
      />
      <NativeSelect label="Net" value={state.net} options={NET_OPTIONS} onChange={net => dispatch({ type: 'setNet', net })} />
      {hasMovedDefenders && (
        <Button
          variant="outline"
          className="h-10 shrink-0 px-3"
          onClick={() => dispatch({ type: 'resetDefenders' })}
          title="Send hand-placed defenders back to their suggested spots"
        >
          Reset D
        </Button>
      )}
    </>
  )
}

/** Present mode's "more" button: the defence settings and board reset in a panel over the court. */
function SettingsMenu({ state, dispatch }: BoardProps) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <Button
        variant={open ? 'secondary' : 'outline'}
        size="icon"
        className="h-11 w-11 shrink-0"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-label="More settings"
        title="More settings"
      >
        <MoreIcon />
      </Button>
      {open && (
        <>
          {/* Tap anywhere else to close. */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 top-12 z-20 flex w-64 flex-col items-stretch gap-2 rounded-xl border border-border bg-surface-elevated p-3 shadow-lg">
            <DefenceSettings state={state} dispatch={dispatch} />
            <Button
              variant="outline"
              className="h-10 gap-1.5"
              onClick={() => {
                dispatch({ type: 'reset' })
                setOpen(false)
              }}
            >
              <ResetIcon />
              Reset board
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

function DrawingToolbar({ state, dispatch }: BoardProps) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-border bg-surface-elevated p-1 shadow-sm">
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
  )
}

/** Colour key laid over the top corner of the board instead of taking a row of its own. */
function Legend({ hitView }: { hitView: HitView }) {
  return (
    <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-x-2 gap-y-0.5 rounded-md bg-background/75 px-2 py-1 text-[11px] leading-tight text-foreground backdrop-blur-sm">
      {LEGEND_FOR[hitView].map(key => {
        const { label, color } = LEGEND[key]
        return (
          <span key={key} className="inline-flex items-center gap-1">
            <span
              className="h-2.5 w-2.5 rounded-sm border border-border"
              // Tints are translucent, so show them over the court colour like on the board.
              style={{ background: `linear-gradient(${color}, ${color}), hsl(var(--tb-court))` }}
            />
            {label}
          </span>
        )
      })}
    </div>
  )
}

/** Native select: compact, and opens the system picker on phones. */
function NativeSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  const id = useId()
  return (
    <label htmlFor={id} className="flex h-10 items-center gap-1.5 rounded-md border border-input bg-background pl-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <select
        id={id}
        value={value}
        onChange={e => onChange(e.target.value as T)}
        className={cn('h-full rounded-md bg-transparent pr-2 font-medium text-foreground outline-none', 'focus-visible:ring-2 focus-visible:ring-ring')}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function PresentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  )
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
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
