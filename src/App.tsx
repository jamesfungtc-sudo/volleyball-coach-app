import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { Toaster } from 'sonner'
import { ThemeProvider, useTheme } from './providers/ThemeProvider'
import { AppShell } from './components/AppShell'

import LivePage from './pages/LivePage'
import AnalysisPage from './pages/AnalysisPage'
import ScoutingPage from './pages/ScoutingPage'
import TeamsPage from './pages/TeamsPage'
import SettingsPage from './pages/SettingsPage'
import MatchSetup from './features/live/MatchSetup'
import LiveMatchRoute from './features/live/LiveMatchRoute'

import MatchListPage from './pages/MatchListPage'
import MatchSetupPage from './pages/MatchSetupPage'
import StatsPage from './pages/StatsPage'
import VisualTrackingPage from './pages/VisualTrackingPage'
import { OpponentTrackingProvider } from './features/inGameStats/context/OpponentTrackingContext'

function AppRoutes() {
  const location = useLocation()
  const isVisualTracking = location.pathname.includes('/visual')

  if (isVisualTracking) {
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
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<LivePage />} />
        <Route path="/analysis" element={<AnalysisPage />} />
        <Route path="/scouting" element={<ScoutingPage />} />
        <Route path="/teams" element={<TeamsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/live/new" element={<MatchSetup />} />
      </Route>

      {/* Full-screen live tracking (no tab bar) */}
      <Route path="/live/:matchId/quick" element={<LiveMatchRoute />} />

      {/* Existing match flow pages (kept during rebuild) */}
      <Route path="/in-game-stats" element={<MatchListPage />} />
      <Route path="/in-game-stats/setup" element={<MatchSetupPage />} />
      <Route path="/in-game-stats/:matchId" element={<StatsPage />} />
    </Routes>
  )
}

function ToasterWithTheme() {
  const { resolvedTheme } = useTheme()
  return (
    <Toaster
      position="top-center"
      theme={resolvedTheme}
      richColors
      closeButton
    />
  )
}

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AppRoutes />
        <ToasterWithTheme />
      </Router>
    </ThemeProvider>
  )
}

export default App
