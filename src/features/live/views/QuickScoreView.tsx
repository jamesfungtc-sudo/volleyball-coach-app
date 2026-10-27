import { useCallback, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { ScoreDisplay } from '@/components/ui/score-display'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { LiveShell } from '../LiveShell'
import { useMatch } from '../context/MatchContext'
import { SyncBadge } from '../components/SyncBadge'
import { PointHistory } from '../components/PointHistory'
import { currentSet, nextRotation, nextSetFirstServe, prevRotation } from '../reducers/matchReducer'
import { isMatchPoint, isSetPoint, matchWinner, setsWon } from '../reducers/setReducer'
import type { LiveMatch, Side } from '../types'

export default function QuickScoreView() {
  const { match, dispatch } = useMatch()
  const navigate = useNavigate()
  const [historyOpen, setHistoryOpen] = useState(false)

  const set = currentSet(match)
  const won = setsWon(match.sets)
  const atSetStart = set.home + set.opponent === 0
  const canUndo = match.points.length > 0

  const score = (winner: Side) => {
    dispatch({ type: 'SCORE', winner })
    navigator.vibrate?.(10)
  }
  const undo = useCallback(() => dispatch({ type: 'UNDO' }), [dispatch])
  const closeHistory = useCallback(() => setHistoryOpen(false), [])

  return (
    <LiveShell
      strip={
        <>
          <IconButton label="Exit to Live" onClick={() => navigate('/')}>
            <path d="M15 18l-6-6 6-6" />
          </IconButton>
          <div className="flex min-w-0 flex-1 items-center justify-center gap-2 text-sm font-semibold sm:gap-3 sm:text-base">
            <span className="min-w-0 flex-1 truncate text-right">{match.home.name}</span>
            <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              Set {set.number} · Bo{match.format}
            </span>
            <span className="min-w-0 flex-1 truncate">{match.opponent.name}</span>
          </div>
          <SyncBadge compact className="max-sm:px-2.5" />
        </>
      }
      actions={
        <>
          <button
            onClick={undo}
            disabled={!canUndo}
            className="flex h-11 items-center gap-1.5 rounded-md px-3 text-sm font-medium hover:bg-muted disabled:opacity-40"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3 7v6h6" />
              <path d="M21 17a9 9 0 0 0-15-6.7L3 13" />
            </svg>
            <span className="max-sm:sr-only">Undo</span>
          </button>

          <div className="flex min-w-0 flex-1 items-center justify-center gap-1 sm:gap-2">
            <button
              onClick={() => dispatch({ type: 'SET_SERVE', side: match.serving === 'home' ? 'opponent' : 'home' })}
              disabled={!atSetStart || match.status !== 'in_progress'}
              title={atSetStart ? 'Switch serving team' : 'Serve follows the rally winner'}
              className="flex h-11 min-w-0 max-w-[40vw] items-center gap-1.5 rounded-md px-2 text-sm hover:bg-muted disabled:hover:bg-transparent"
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-warning" aria-hidden />
              <span className="truncate">
                <span className="text-muted-foreground max-sm:sr-only">Serve </span>
                {match.serving === 'home' ? match.home.name : match.opponent.name}
              </span>
              {atSetStart && match.status === 'in_progress' && <span className="text-muted-foreground">⇄</span>}
            </button>
            <RotationStepper
              rotation={match.rotation}
              onChange={rotation => dispatch({ type: 'SET_ROTATION', rotation })}
            />
          </div>

          <button
            onClick={() => setHistoryOpen(true)}
            className="flex h-11 items-center gap-1.5 rounded-md px-3 text-sm font-medium hover:bg-muted"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
              <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
            </svg>
            <span className="max-sm:sr-only">History</span>
          </button>
        </>
      }
    >
      <section className="flex shrink-0 flex-col items-center gap-2 px-4 py-3 sm:py-5" aria-live="polite">
        <ScoreDisplay
          homeScore={set.home}
          awayScore={set.opponent}
          homeLabel={match.home.name}
          awayLabel={match.opponent.name}
          serving={match.serving === 'home' ? 'home' : 'away'}
        />
        <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs">
          <span className="rounded-full border border-border px-2.5 py-1 font-semibold tabular-nums">
            Sets {won.home}–{won.opponent}
          </span>
          {match.sets.filter(s => s.winner).map(s => (
            <span
              key={s.number}
              className={cn(
                'rounded-full px-2.5 py-1 font-medium tabular-nums',
                s.winner === 'home' ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'
              )}
            >
              S{s.number} {s.home}–{s.opponent}
            </span>
          ))}
          <PointBadge match={match} />
        </div>
      </section>

      <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 px-2 pb-2 portrait:max-sm:grid-cols-1 sm:gap-3 sm:px-3 sm:pb-3">
        <TapZone side="home" label="Our Point" team={match.home.name} next={set.home + 1} onTap={score} disabled={match.status !== 'in_progress'} />
        <TapZone side="opponent" label="Their Point" team={match.opponent.name} next={set.opponent + 1} onTap={score} disabled={match.status !== 'in_progress'} />
      </div>

      {match.status !== 'in_progress' && <SetBreakPanel match={match} onUndo={undo} onDone={() => navigate('/')} />}

      <PointHistory match={match} open={historyOpen} onClose={closeHistory} onUndo={undo} />
    </LiveShell>
  )
}

function TapZone({
  side,
  label,
  team,
  next,
  onTap,
  disabled,
}: {
  side: Side
  label: string
  team: string
  next: number
  onTap: (side: Side) => void
  disabled: boolean
}) {
  const home = side === 'home'
  return (
    <button
      onClick={() => onTap(side)}
      disabled={disabled}
      className={cn(
        'flex min-h-[120px] select-none flex-col items-center justify-center gap-1 rounded-xl border-2 transition-[background-color,transform] duration-75',
        'touch-manipulation active:scale-[0.99] disabled:opacity-40',
        home
          ? 'border-success/40 bg-success/10 text-success active:bg-success/30'
          : 'border-destructive/40 bg-destructive/10 text-destructive active:bg-destructive/30'
      )}
    >
      <span className="text-3xl font-bold sm:text-4xl">{label}</span>
      <span className="max-w-[90%] truncate text-sm font-medium opacity-80">
        {team} → <span className="tabular-nums">{next}</span>
      </span>
    </button>
  )
}

function PointBadge({ match }: { match: LiveMatch }) {
  if (match.status !== 'in_progress') return null
  const set = currentSet(match)
  for (const side of ['home', 'opponent'] as Side[]) {
    const name = side === 'home' ? match.home.name : match.opponent.name
    if (isMatchPoint(match.sets, match.format, side)) {
      return <span className="rounded-full bg-warning/25 px-2.5 py-1 font-semibold text-foreground">Match point · {name}</span>
    }
    if (isSetPoint(set, match.format, side)) {
      return <span className="rounded-full bg-warning/25 px-2.5 py-1 font-semibold text-foreground">Set point · {name}</span>
    }
  }
  return null
}

function RotationStepper({ rotation, onChange }: { rotation: number; onChange: (r: number) => void }) {
  return (
    <div className="flex items-center rounded-md border border-border" role="group" aria-label="Rotation">
      <button className="flex h-10 w-9 items-center justify-center rounded-l-md hover:bg-muted" onClick={() => onChange(prevRotation(rotation))} aria-label="Previous rotation">
        ‹
      </button>
      <span className="min-w-9 text-center text-sm font-semibold tabular-nums" aria-live="polite">
        R{rotation}
      </span>
      <button className="flex h-10 w-9 items-center justify-center rounded-r-md hover:bg-muted" onClick={() => onChange(nextRotation(rotation))} aria-label="Next rotation">
        ›
      </button>
    </div>
  )
}

function SetBreakPanel({ match, onUndo, onDone }: { match: LiveMatch; onUndo: () => void; onDone: () => void }) {
  const { dispatch } = useMatch()
  const set = currentSet(match)
  const winner = match.status === 'completed' ? matchWinner(match.sets, match.format) : set.winner
  const won = setsWon(match.sets)
  const winnerName = winner === 'home' ? match.home.name : match.opponent.name
  const [firstServe, setFirstServe] = useState<Side>(() => nextSetFirstServe(match))
  const [rotation, setRotation] = useState(match.rotation)
  const completed = match.status === 'completed'

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/90 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="set-break-title">
      <div className="flex w-full max-w-[440px] flex-col gap-4 rounded-xl border border-border bg-surface-elevated p-5 shadow-xl">
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground">{completed ? 'Match over' : `Set ${set.number} complete`}</p>
          <h2 id="set-break-title" className={cn('mt-1 text-2xl font-semibold', winner === 'home' ? 'text-success' : 'text-destructive')}>
            {winnerName} {completed ? 'win' : 'take the set'} {completed ? `${Math.max(won.home, won.opponent)}–${Math.min(won.home, won.opponent)}` : `${set.home}–${set.opponent}`}
          </h2>
          {match.sets.length > 1 && (
            <p className="mt-1 text-sm text-muted-foreground tabular-nums">
              {match.sets.map(s => `${s.home}–${s.opponent}`).join(' · ')}
            </p>
          )}
        </div>

        {!completed && (
          <>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Set {set.number + 1} first serve</span>
              <SegmentedControl<Side>
                className="w-full [&>button]:min-w-0 [&>button]:flex-1 [&>button]:truncate"
                value={firstServe}
                onChange={setFirstServe}
                options={[
                  { value: 'home', label: match.home.name },
                  { value: 'opponent', label: match.opponent.name },
                ]}
              />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Starting rotation</span>
              <SegmentedControl<string>
                className="w-full [&>button]:flex-1 [&>button]:px-0"
                value={String(rotation)}
                onChange={v => setRotation(Number(v))}
                options={[1, 2, 3, 4, 5, 6].map(n => ({ value: String(n), label: String(n) }))}
              />
            </div>
          </>
        )}

        <div className="flex gap-2">
          <button onClick={onUndo} className="h-12 flex-1 rounded-md border border-border bg-surface text-sm font-medium hover:bg-muted">
            Undo last point
          </button>
          <button
            onClick={() => (completed ? onDone() : dispatch({ type: 'START_NEXT_SET', firstServe, rotation }))}
            className="h-12 flex-1 rounded-md bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            autoFocus
          >
            {completed ? 'Done' : `Start Set ${set.number + 1}`}
          </button>
        </div>
      </div>
    </div>
  )
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} aria-label={label} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted">
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {children}
      </svg>
    </button>
  )
}
