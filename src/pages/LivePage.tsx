import { useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { deleteMatch, listMatches, subscribeMatches } from '@/features/live/storage/liveMatchStore'
import { discardMatchOps } from '@/features/live/services/liveSyncEngine'
import { currentSet } from '@/features/live/reducers/matchReducer'
import { setsWon } from '@/features/live/reducers/setReducer'
import { SyncBadge } from '@/features/live/components/SyncBadge'
import type { LiveMatch } from '@/features/live/types'

export default function LivePage() {
  const matches = useSyncExternalStore(subscribeMatches, listMatches)
  const active = matches.filter(m => m.status !== 'completed')
  const finished = matches.filter(m => m.status === 'completed')

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 py-6 md:px-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Live Match</h1>
        <SyncBadge />
      </div>

      <Button asChild size="lg" className="h-14 w-full text-base">
        <Link to="/live/new">+ New Match</Link>
      </Button>

      {matches.length === 0 && (
        <p className="mt-10 text-center text-muted-foreground">
          No matches yet. Start one to track the score with two taps per rally.
        </p>
      )}

      {active.length > 0 && <MatchSection title="In progress" matches={active} />}
      {finished.length > 0 && <MatchSection title="Finished" matches={finished} />}

      <p className="mt-10 text-center text-sm text-muted-foreground">
        Need per-player stats?{' '}
        <Link to="/in-game-stats" className="text-primary underline-offset-4 hover:underline">
          Open detailed tracking
        </Link>
      </p>
    </div>
  )
}

function MatchSection({ title, matches }: { title: string; matches: LiveMatch[] }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">{title}</h2>
      <ul className="flex flex-col gap-3">
        {matches.map(m => (
          <MatchCard key={m.id} match={m} />
        ))}
      </ul>
    </section>
  )
}

function MatchCard({ match }: { match: LiveMatch }) {
  const won = setsWon(match.sets)
  const set = currentSet(match)
  const done = match.status === 'completed'

  function remove() {
    if (!confirm(`Delete ${match.home.name} vs ${match.opponent.name} from this device?`)) return
    discardMatchOps(match.id)
    deleteMatch(match.id)
  }

  return (
    <li className="flex items-stretch rounded-lg border border-border bg-surface">
      <Link to={`/live/${match.id}/quick`} className="flex min-w-0 flex-1 items-center gap-4 p-4 text-foreground hover:bg-muted/50 hover:text-foreground">
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">
            {match.home.name} <span className="font-normal text-muted-foreground">vs</span> {match.opponent.name}
          </div>
          <div className="mt-0.5 truncate text-sm text-muted-foreground">
            {match.date}
            {match.venue && ` · ${match.venue}`} · {match.sets.map(s => `${s.home}–${s.opponent}`).join(', ')}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-xl font-bold tabular-nums">
            {won.home}–{won.opponent}
          </div>
          <div className={cn('text-xs font-medium', done ? 'text-muted-foreground' : 'text-primary')}>
            {done ? 'Final' : `Resume set ${set.number}`}
          </div>
        </div>
      </Link>
      <button
        onClick={remove}
        aria-label={`Delete ${match.home.name} vs ${match.opponent.name}`}
        className="flex w-12 shrink-0 items-center justify-center border-l border-border text-muted-foreground hover:text-destructive"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
        </svg>
      </button>
    </li>
  )
}
