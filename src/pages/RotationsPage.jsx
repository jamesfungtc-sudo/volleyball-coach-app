import { useState } from 'react'
import PageLayout from '../components/layout/PageLayout'
import TeamConfigPanel from '../features/rotations/components/TeamConfigPanel'
import RotationMapViewer from '../features/rotations/components/RotationMapViewer'
import { DEFAULT_TEAM_CONFIG } from '../utils/volleyballSystems'
import './RotationsPage.css'

function RotationsPage() {
  const [teamConfig, setTeamConfig] = useState({
    ...DEFAULT_TEAM_CONFIG,
    // Set default system to 5-1 (OH>S) as requested
    teamA: {
      ...DEFAULT_TEAM_CONFIG.teamA,
      system: "5-1 (OH>S)",
      startingP1: "OH (w.s)"
    },
    teamB: {
      ...DEFAULT_TEAM_CONFIG.teamB,
      system: "5-1 (OH>S)", 
      startingP1: "OH (w.s)"
    }
  })

  const handleConfigChange = (newConfig) => {
    setTeamConfig(newConfig)
  }

  return (
    <PageLayout
      title="Rotation Analysis"
      subtitle="Configure teams and analyze rotation matchups with serving vs in-rally formations"
      className="rotations-page"
    >
      <div className="rotations-layout">
        {/* Configuration Panel */}
        <section className="page-section">
          <h2>Team Configuration</h2>
          <TeamConfigPanel onConfigChange={handleConfigChange} />
        </section>
        
        {/* New Rotation Map Viewer */}
        <section className="page-section">
          <h2>Rotation Map Viewer</h2>
          <RotationMapViewer teamConfig={teamConfig} />
        </section>
      </div>
    </PageLayout>
  )
}

export default RotationsPage