import { cn } from '@/lib/utils'

interface ScoreDisplayProps {
  homeScore: number
  awayScore: number
  homeLabel?: string
  awayLabel?: string
  serving?: 'home' | 'away'
  className?: string
}

export function ScoreDisplay({
  homeScore,
  awayScore,
  homeLabel = 'Home',
  awayLabel = 'Away',
  serving,
  className,
}: ScoreDisplayProps) {
  return (
    <div className={cn('flex items-center justify-center gap-6', className)}>
      <ScoreSide
        score={homeScore}
        label={homeLabel}
        serving={serving === 'home'}
        align="right"
      />
      <span className="text-2xl font-semibold text-muted-foreground">–</span>
      <ScoreSide
        score={awayScore}
        label={awayLabel}
        serving={serving === 'away'}
        align="left"
      />
    </div>
  )
}

function ScoreSide({
  score,
  label,
  serving,
  align,
}: {
  score: number
  label: string
  serving: boolean
  align: 'left' | 'right'
}) {
  return (
    <div className={cn('flex flex-col items-center gap-1', align === 'right' ? 'items-end' : 'items-start')}>
      <div className="flex items-center gap-2">
        {serving && align === 'right' && <ServingDot />}
        <span
          className="text-7xl font-bold leading-none tabular-nums"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {score}
        </span>
        {serving && align === 'left' && <ServingDot />}
      </div>
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
    </div>
  )
}

function ServingDot() {
  return (
    <span className="h-2.5 w-2.5 rounded-full bg-warning" aria-label="Serving" />
  )
}
