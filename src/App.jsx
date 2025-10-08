import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import NavigationBar from './components/navigation/NavigationBar'
import RotationsPage from './pages/RotationsPage'
import TeamsPage from './pages/TeamsPage'
import StatisticsPage from './pages/StatisticsPage'
import MatchListPage from './pages/MatchListPage'
import MatchSetupPage from './pages/MatchSetupPage'
import StatsPage from './pages/StatsPage'
import AnalyticsPage from './pages/AnalyticsPage'
import './App.css'

function App() {
  return (
    <Router>
      <div className="app">
        <NavigationBar />

        <main className="app-main">
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
    </Router>
  )
}

export default App
