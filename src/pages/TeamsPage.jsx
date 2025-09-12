import PageLayout from '../components/layout/PageLayout'

function TeamsPage() {
  return (
    <PageLayout
      title="Team Management"
      subtitle="Manage team rosters, player profiles, and substitutions"
      className="teams-page"
    >
      <div className="coming-soon">
        <div className="coming-soon-icon">👥</div>
        <h2>Team Management Coming Soon</h2>
        <p>Advanced team management features will include:</p>
        <ul>
          <li>Player roster management</li>
          <li>Player profiles and statistics</li>
          <li>Substitution tracking</li>
          <li>Team performance analytics</li>
          <li>Season planning tools</li>
        </ul>
        <div className="phase-indicator">
          <span className="phase-badge">Phase 2</span>
          <span>Currently in development</span>
        </div>
      </div>
    </PageLayout>
  )
}

export default TeamsPage