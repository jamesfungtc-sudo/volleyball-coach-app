import { useEffect, useId, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { getTeams, isAPIConfigured } from '@/services/googleSheetsAPI'
import { cn } from '@/lib/utils'
import type { MatchFormat, Side, TeamRef } from './types'
import { createMatch } from './reducers/matchReducer'
import { newMatchId, saveMatch } from './storage/liveMatchStore'
import { queueMatchCreated } from './services/liveSyncEngine'

interface SheetTeam {
  Id: string
  Name: string
}

const OTHER = '__other__'

const inputClass =
  'h-11 w-full rounded-md border border-input bg-background px-3 text-base text-foreground ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export default function MatchSetup() {
  const navigate = useNavigate()
  const [teams, setTeams] = useState<SheetTeam[]>([])
  const [teamsLoading, setTeamsLoading] = useState(isAPIConfigured())
  const [date, setDate] = useState(() => new Date().toLocaleDateString('en-CA'))
  const [home, setHome] = useState<TeamRef>({ id: null, name: '' })
  const [opponent, setOpponent] = useState<TeamRef>({ id: null, name: '' })
  const [venue, setVenue] = useState('')
  const [format, setFormat] = useState<MatchFormat>(5)
  const [firstServe, setFirstServe] = useState<Side>('home')
  const [rotation, setRotation] = useState(1)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (!isAPIConfigured()) return
    getTeams()
      .then(data => setTeams((data as SheetTeam[]).filter(t => t?.Id && t?.Name)))
      .catch(() => setTeams([]))
      .finally(() => setTeamsLoading(false))
  }, [])

  const homeName = home.name.trim()
  const opponentName = opponent.name.trim()
  const errors = {
    home: !homeName ? 'Enter your team' : null,
    opponent: !opponentName
      ? 'Enter the opponent'
      : opponentName.toLowerCase() === homeName.toLowerCase() ? 'Opponent must differ from your team' : null,
  }
  const valid = !errors.home && !errors.opponent

  function start() {
    setSubmitted(true)
    if (!valid) return
    const match = createMatch(
      {
        date,
        venue: venue.trim(),
        home: { ...home, name: homeName },
        opponent: { ...opponent, name: opponentName },
        format,
        firstServe,
        rotation,
      },
      newMatchId()
    )
    saveMatch(match)
    queueMatchCreated(match)
    navigate(`/live/${match.id}/quick`)
  }

  return (
    <div className="mx-auto w-full max-w-[600px] px-4 py-6 md:px-6">
      <div className="mb-5 flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild className="h-11 w-11">
          <Link to="/" aria-label="Back to Live">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">New Match</h1>
      </div>

      <form
        className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-4 md:p-6"
        onSubmit={e => {
          e.preventDefault()
          start()
        }}
        noValidate
      >
        <Field label="Date">
          {id => <input id={id} type="date" className={inputClass} value={date} onChange={e => setDate(e.target.value)} />}
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <TeamField
            label="Your team"
            value={home}
            onChange={setHome}
            teams={teams}
            loading={teamsLoading}
            error={submitted ? errors.home : null}
            placeholder="e.g. Lions U18"
          />
          <TeamField
            label="Opponent"
            value={opponent}
            onChange={setOpponent}
            teams={teams.filter(t => t.Id !== home.id)}
            loading={teamsLoading}
            error={submitted ? errors.opponent : null}
            placeholder="e.g. Eagles"
          />
        </div>

        <Field label="Venue" hint="Optional">
          {id => (
            <input id={id} className={inputClass} value={venue} placeholder="e.g. Home gym" onChange={e => setVenue(e.target.value)} />
          )}
        </Field>

        <Field label="Format">
          {() => (
            <SegmentedControl<string>
              className="w-full [&>button]:flex-1"
              value={String(format)}
              onChange={v => setFormat(Number(v) as MatchFormat)}
              options={[
                { value: '3', label: 'Best of 3' },
                { value: '5', label: 'Best of 5' },
              ]}
            />
          )}
        </Field>

        <Field label="First serve">
          {() => (
            <SegmentedControl<Side>
              className="w-full [&>button]:flex-1 [&>button]:min-w-0 [&>button]:truncate"
              value={firstServe}
              onChange={setFirstServe}
              options={[
                { value: 'home', label: homeName || 'Your team' },
                { value: 'opponent', label: opponentName || 'Opponent' },
              ]}
            />
          )}
        </Field>

        <Field label="Starting rotation" hint="Can be changed during the match">
          {() => (
            <SegmentedControl<string>
              className="w-full [&>button]:flex-1 [&>button]:px-0"
              value={String(rotation)}
              onChange={v => setRotation(Number(v))}
              options={[1, 2, 3, 4, 5, 6].map(n => ({ value: String(n), label: String(n) }))}
            />
          )}
        </Field>

        <Button type="submit" size="lg" className="h-12 w-full text-base">
          Start Match
        </Button>
      </form>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: (id: string) => ReactNode }) {
  const id = useId()
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="flex items-baseline justify-between text-sm font-medium">
        {label}
        {hint && <span className="text-xs font-normal text-muted-foreground">{hint}</span>}
      </label>
      {children(id)}
    </div>
  )
}

function TeamField({
  label,
  value,
  onChange,
  teams,
  loading,
  error,
  placeholder,
}: {
  label: string
  value: TeamRef
  onChange: (team: TeamRef) => void
  teams: SheetTeam[]
  loading: boolean
  error: string | null
  placeholder: string
}) {
  const [custom, setCustom] = useState(false)
  const showSelect = teams.length > 0 && !custom

  return (
    <Field label={label}>
      {id => (
        <div className="flex flex-col gap-1.5">
          {showSelect ? (
            <select
              id={id}
              className={cn(inputClass, !value.id && 'text-muted-foreground')}
              value={value.id ?? ''}
              aria-invalid={!!error}
              onChange={e => {
                if (e.target.value === OTHER) {
                  setCustom(true)
                  onChange({ id: null, name: '' })
                  return
                }
                const team = teams.find(t => t.Id === e.target.value)
                onChange(team ? { id: team.Id, name: team.Name } : { id: null, name: '' })
              }}
            >
              <option value="">Select team…</option>
              {teams.map(t => (
                <option key={t.Id} value={t.Id}>
                  {t.Name}
                </option>
              ))}
              <option value={OTHER}>+ New team…</option>
            </select>
          ) : (
            <input
              id={id}
              className={inputClass}
              value={value.name}
              placeholder={loading ? 'Loading teams…' : placeholder}
              aria-invalid={!!error}
              autoComplete="off"
              onChange={e => onChange({ id: null, name: e.target.value })}
            />
          )}
          {custom && teams.length > 0 && (
            <button
              type="button"
              className="self-start text-sm text-primary"
              onClick={() => {
                setCustom(false)
                onChange({ id: null, name: '' })
              }}
            >
              Choose a saved team
            </button>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )}
    </Field>
  )
}
