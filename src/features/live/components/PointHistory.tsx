import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import type { LiveMatch, LivePoint } from '../types'

export function PointCard({ point, match }: { point: LivePoint; match: LiveMatch }) {
  const won = point.winner === 'home'
  const sideOut = point.winner !== point.servingBefore
  return (
    <li className="flex items-center gap-3 rounded-md border border-border bg-surface px-3 py-2">
      <span className={cn('h-8 w-1 shrink-0 rounded-full', won ? 'bg-success' : 'bg-destructive')} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">
          {won ? match.home.name : match.opponent.name}
          <span className="font-normal text-muted-foreground"> {sideOut ? 'side-out' : 'on serve'}</span>
        </div>
        <div className="text-xs text-muted-foreground">
          Point {point.number} · R{point.rotationBefore}
        </div>
      </div>
      <span className="text-base font-semibold tabular-nums">
        {point.home}–{point.opponent}
      </span>
    </li>
  )
}

/** Slide-in panel listing every point, newest first, grouped by set. */
export function PointHistory({
  match,
  open,
  onClose,
  onUndo,
}: {
  match: LiveMatch
  open: boolean
  onClose: () => void
  onUndo: () => void
}) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const setsNewestFirst = [...match.sets].reverse()

  return (
    <>
      <div
        className={cn('fixed inset-0 z-40 bg-black/40 transition-opacity', open ? 'opacity-100' : 'pointer-events-none opacity-0')}
        onClick={onClose}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Point history"
        aria-hidden={!open}
        inert={!open}
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-full max-w-[400px] flex-col border-l border-border bg-surface-elevated shadow-xl transition-transform duration-200',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-border pl-4 pr-1 pt-[env(safe-area-inset-top)]">
          <h2 className="text-lg font-semibold">Point history</h2>
          <button
            ref={closeRef}
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
            aria-label="Close point history"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {match.points.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No points yet</p>
          ) : (
            setsNewestFirst.map(set => {
              const points = match.points.filter(p => p.set === set.number).reverse()
              if (points.length === 0) return null
              return (
                <section key={set.number} className="mb-4">
                  <h3 className="mb-2 flex justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <span>Set {set.number}</span>
                    <span className="tabular-nums">
                      {set.home}–{set.opponent}
                    </span>
                  </h3>
                  <ol className="flex flex-col gap-1.5">
                    {points.map(p => (
                      <PointCard key={p.id} point={p} match={match} />
                    ))}
                  </ol>
                </section>
              )
            })
          )}
        </div>

        <div className="shrink-0 border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            onClick={onUndo}
            disabled={match.points.length === 0}
            className="h-11 w-full rounded-md border border-border bg-surface text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            Undo last point
          </button>
        </div>
      </aside>
    </>
  )
}
