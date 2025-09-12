import PageLayout from '../components/layout/PageLayout'

function AnalyticsPage() {
  return (
    <PageLayout
      title="Advanced Analytics"
      subtitle="Deep insights and heatmap visualizations for strategic analysis"
      className="analytics-page"
    >
      <div className="coming-soon">
        <div className="coming-soon-icon">📈</div>
        <h2>Analytics Dashboard Coming Soon</h2>
        <p>Advanced analytics features will include:</p>
        <ul>
          <li>Attack heatmap visualization</li>
          <li>Court position analysis</li>
          <li>Performance trend tracking</li>
          <li>Comparative team analysis</li>
          <li>Strategic insights generation</li>
          <li>Export capabilities for detailed reports</li>
        </ul>
        <div className="phase-indicator">
          <span className="phase-badge">Phase 3</span>
          <span>Planned for future development</span>
        </div>
      </div>
    </PageLayout>
  )
}

export default AnalyticsPage