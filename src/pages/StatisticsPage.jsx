import PageLayout from '../components/layout/PageLayout'

function StatisticsPage() {
  return (
    <PageLayout
      title="Game Statistics"
      subtitle="Track in-game performance and analyze player statistics"
      className="statistics-page"
    >
      <div className="coming-soon">
        <div className="coming-soon-icon">📊</div>
        <h2>Statistics Tracking Coming Soon</h2>
        <p>Real-time game statistics features will include:</p>
        <ul>
          <li>Point-by-point scoring</li>
          <li>Error tracking by type and position</li>
          <li>Player performance metrics</li>
          <li>Serve receive effectiveness</li>
          <li>Attack success rates</li>
          <li>Real-time match statistics</li>
        </ul>
        <div className="phase-indicator">
          <span className="phase-badge">Phase 2</span>
          <span>Currently in development</span>
        </div>
      </div>
    </PageLayout>
  )
}

export default StatisticsPage