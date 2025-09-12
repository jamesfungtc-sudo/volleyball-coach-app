import AdvancedVolleyballCourt from '../../shared/components/AdvancedVolleyballCourt';
import { VOLLEYBALL_SYSTEMS, makeStartingOrder, getRotations, getRallyLineup } from '../../../utils/volleyballSystems';
import './RotationDisplay.css';

const RotationDisplay = ({ teamConfig }) => {
  
  const calculateTeamRotations = (teamData) => {
    if (!teamData || !teamData.system || !teamData.players) {
      return { servingRotations: [], rallyRotations: [] };
    }

    try {
      // Get the system order
      const systemOrder = VOLLEYBALL_SYSTEMS[teamData.system];
      if (!systemOrder) return { servingRotations: [], rallyRotations: [] };

      // Make starting order based on P1 choice
      const rotationOrder = makeStartingOrder(systemOrder, teamData.startingP1);
      
      // Get all 6 serving rotations
      const servingRotations = getRotations(teamData.players, rotationOrder);
      
      // Calculate rally formations for each rotation
      const rallyRotations = servingRotations.map(servingRotation => 
        getRallyLineup(servingRotation)
      );

      return { servingRotations, rallyRotations };
    } catch (error) {
      console.error('Error calculating rotations:', error);
      return { servingRotations: [], rallyRotations: [] };
    }
  };

  const teamARotations = calculateTeamRotations(teamConfig.teamA);
  const teamBRotations = calculateTeamRotations(teamConfig.teamB);

  const formatPlayersForCourt = (rotation) => {
    if (!rotation || rotation.length < 6) {
      return Array(6).fill({ name: '---', role: '' });
    }
    return rotation.map(player => ({
      name: typeof player === 'string' ? player : (player.name || '---'),
      role: typeof player === 'string' ? '' : (player.role || '')
    }));
  };

  return (
    <div className="rotation-display">
      <div className="display-header">
        <h2>🏐 Volleyball Rotation Map</h2>
        <div className="legend">
          <span className="legend-item serving">🟢 Serving Formation</span>
          <span className="legend-item rally">🟠 In-Rally Formation</span>
        </div>
      </div>

      <div className="rotations-grid">
        {[1, 2, 3, 4, 5, 6].map(rotationNum => (
          <div key={rotationNum} className="rotation-block">
            <div className="rotation-header">
              <h3>Rotation {rotationNum}</h3>
              <div className="rotation-teams">
                <span className="team-label team-a">Team A</span>
                <span className="vs">vs</span>
                <span className="team-label team-b">Team B</span>
              </div>
            </div>
            
            <div className="courts-container">
              {/* Team A Courts */}
              <div className="team-courts">
                <div className="formation-pair">
                  <AdvancedVolleyballCourt
                    players={formatPlayersForCourt(teamARotations.servingRotations[rotationNum - 1])}
                    rotationNumber={rotationNum}
                    formation="serving"
                    team="A"
                  />
                  <AdvancedVolleyballCourt
                    players={formatPlayersForCourt(teamARotations.rallyRotations[rotationNum - 1])}
                    rotationNumber={rotationNum}
                    formation="rally"
                    team="A"
                  />
                </div>
              </div>

              {/* Team B Courts */}
              <div className="team-courts">
                <div className="formation-pair">
                  <AdvancedVolleyballCourt
                    players={formatPlayersForCourt(teamBRotations.servingRotations[rotationNum - 1])}
                    rotationNumber={rotationNum}
                    formation="serving"
                    team="B"
                  />
                  <AdvancedVolleyballCourt
                    players={formatPlayersForCourt(teamBRotations.rallyRotations[rotationNum - 1])}
                    rotationNumber={rotationNum}
                    formation="rally"
                    team="B"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RotationDisplay;