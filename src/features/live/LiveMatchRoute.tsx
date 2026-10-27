import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { MatchProvider } from './context/MatchContext'
import { loadMatch } from './storage/liveMatchStore'
import QuickScoreView from './views/QuickScoreView'

export default function LiveMatchRoute() {
  const { matchId = '' } = useParams()
  const match = loadMatch(matchId)

  if (!match) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <h1 className="text-xl font-semibold">Match not found on this device</h1>
        <p className="max-w-sm text-sm text-muted-foreground">Live matches are stored on the device they were started on.</p>
        <Button asChild>
          <Link to="/">Back to Live</Link>
        </Button>
      </div>
    )
  }

  return (
    <MatchProvider key={match.id} initialMatch={match}>
      <QuickScoreView />
    </MatchProvider>
  )
}
