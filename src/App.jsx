import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { Toaster } from 'sonner'
import NavigationBar from './components/navigation/NavigationBar'
import RotationsPage from './pages/RotationsPage'
import TeamsPage from './pages/TeamsPage'
import StatisticsPage from './pages/StatisticsPage'
import MatchListPage from './pages/MatchListPage'
import MatchSetupPage from './pages/MatchSetupPage'
import StatsPage from './pages/StatsPage'
import AnalyticsPage from './pages/AnalyticsPage'
import VisualTrackingPage from './pages/VisualTrackingPage'
import { OpponentTrackingProvider } from './features/inGameStats/context/OpponentTrackingContext'

function AppLayout() {
  const location = useLocation()
  const isVisualTracking = location.pathname.includes('/visual')

  if (isVisualTracking) {
    // Full-screen game view — no nav, no padding
    return (
      <div className="w-full h-screen overflow-hidden bg-background">
        <OpponentTrackingProvider>
          <Routes>
            <Route path="/in-game-stats/:matchId/visual" element={<VisualTrackingPage />} />
          </Routes>
        </OpponentTrackingProvider>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <NavigationBar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<RotationsPage />} />
          <Route path="/teams" element={<TeamsPage />} />
          <Route path="/statistics" element={<StatisticsPage />} />
          <Route path="/in-game-stats" element={<MatchListPage />} />
          <Route path="/in-game-stats/setup" element={<MatchSetupPage />} />
          <Route path="/in-game-stats/:matchId" element={<StatsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
        </Routes>
      </main>
    </div>
  )
}

function App() {
  return (
    <Router>
      <AppLayout />
      <Toaster
        position="top-center"
        theme="dark"
        richColors
        closeButton
      />
    </Router>
  )
}

export default App
