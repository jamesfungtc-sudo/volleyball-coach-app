import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function LivePage() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold">Live Match</h1>
      <p className="text-muted-foreground text-center max-w-md">
        Start a new match or continue a recent one. Quick mode for head coaches, detailed mode for statisticians.
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link to="/in-game-stats/setup">New Match</Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link to="/in-game-stats">Recent Matches</Link>
        </Button>
      </div>
    </div>
  )
}
