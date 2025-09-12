import { useState } from 'react'
import AdvancedVolleyballCourt from '../../shared/components/AdvancedVolleyballCourt'
import { VOLLEYBALL_SYSTEMS, makeStartingOrder, getRotations, getRallyLineup } from '../../../utils/volleyballSystems'
import './RotationMapViewer.css'

// Unified court component showing both teams on one court
const UnifiedVolleyballCourt = ({ teamAPlayers, teamBPlayers, rotationNumber, formation }) => {
  // Team A positions (bottom half, facing up toward net)
  const teamAPositions = [
    { id: 1, x: 85, y: 85, desc: 'P1 - Right Back' },   // Bottom right (server position)
    { id: 2, x: 85, y: 65, desc: 'P2 - Right Front' },  // Top right  
    { id: 3, x: 50, y: 65, desc: 'P3 - Middle Front' }, // Top middle
    { id: 4, x: 15, y: 65, desc: 'P4 - Left Front' },   // Top left
    { id: 5, x: 15, y: 85, desc: 'P5 - Left Back' },    // Bottom left
    { id: 6, x: 50, y: 85, desc: 'P6 - Middle Back' }   // Bottom middle
  ];

  // Team B positions (top half, facing down toward net)
  const teamBPositions = [
    { id: 1, x: 15, y: 15, desc: 'P1 - Right Back' },   // Top left (their back right)
    { id: 2, x: 15, y: 35, desc: 'P2 - Right Front' },  // Bottom left (their front right)
    { id: 3, x: 50, y: 35, desc: 'P3 - Middle Front' }, // Bottom middle (their front middle)
    { id: 4, x: 85, y: 35, desc: 'P4 - Left Front' },   // Bottom right (their front left)
    { id: 5, x: 85, y: 15, desc: 'P5 - Left Back' },    // Top right (their back left)
    { id: 6, x: 50, y: 15, desc: 'P6 - Middle Back' }   // Top middle (their back middle)
  ];

  const getPlayerAtPosition = (players, position) => {
    if (!players || players.length < 6) return { name: '---', role: '' };
    return players[position - 1] || { name: '---', role: '' };
  };

  const isServer = (position, team) => {
    return formation === 'serving' && position === 1;
  };

  return (
    <div className="unified-volleyball-court">
      <div className="unified-court">
        {/* Court background with consistent border */}
        <div className="unified-court-background">
          {/* Net line in center */}
          <div className="unified-net-line"></div>
        </div>

        {/* Team A Players (top half) */}
        {teamAPositions.map(pos => {
          const player = getPlayerAtPosition(teamAPlayers, pos.id);
          const serverStatus = isServer(pos.id, 'A');
          
          return (
            <div
              key={`A-${pos.id}`}
              className={`unified-player-position team-a ${serverStatus ? 'server' : ''}`}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: 'translate(-50%, -50%)'
              }}
              title={`Team A - ${pos.desc}: ${player.name} (${player.role})`}
            >
              <div className="unified-player-circle team-a">
                <div className="unified-player-name">{player.name}</div>
                <div className="unified-position-number">P{pos.id}</div>
                {serverStatus && <div className="server-indicator">⚡</div>}
              </div>
            </div>
          );
        })}

        {/* Team B Players (bottom half) */}
        {teamBPositions.map(pos => {
          const player = getPlayerAtPosition(teamBPlayers, pos.id);
          const serverStatus = isServer(pos.id, 'B');
          
          return (
            <div
              key={`B-${pos.id}`}
              className={`unified-player-position team-b ${serverStatus ? 'server' : ''}`}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: 'translate(-50%, -50%)'
              }}
              title={`Team B - ${pos.desc}: ${player.name} (${player.role})`}
            >
              <div className="unified-player-circle team-b">
                <div className="unified-player-name">{player.name}</div>
                <div className="unified-position-number">P{pos.id}</div>
                {serverStatus && <div className="server-indicator">⚡</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const RotationMapViewer = ({ teamConfig }) => {
  const [currentRotation, setCurrentRotation] = useState(1)

  const calculateTeamRotations = (teamData) => {
    if (!teamData || !teamData.system || !teamData.players) {
      return { servingRotations: [], rallyRotations: [] };
    }

    try {
      // Get the system order - PRESERVE EXACT LOGIC
      const systemOrder = VOLLEYBALL_SYSTEMS[teamData.system];
      if (!systemOrder) return { servingRotations: [], rallyRotations: [] };

      // Make starting order based on P1 choice - PRESERVE EXACT LOGIC
      const rotationOrder = makeStartingOrder(systemOrder, teamData.startingP1);
      
      // Get all 6 serving rotations - PRESERVE EXACT LOGIC
      const servingRotations = getRotations(teamData.players, rotationOrder);
      
      // Calculate rally formations for each rotation - PRESERVE EXACT LOGIC
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

  const goToNextRotation = () => {
    setCurrentRotation(current => current === 6 ? 1 : current + 1);
  };

  const goToPreviousRotation = () => {
    setCurrentRotation(current => current === 1 ? 6 : current - 1);
  };

  const goToRotation = (rotationNum) => {
    setCurrentRotation(rotationNum);
  };

  const currentIndex = currentRotation - 1; // Convert to 0-based index

  return (
    <div className="rotation-map-viewer">
      {/* Navigation Controls */}
      <div className="rotation-controls">
        <button 
          className="rotation-btn prev-btn"
          onClick={goToPreviousRotation}
          aria-label="Previous rotation"
        >
          ← Previous
        </button>
        
        <div className="rotation-indicators">
          {[1, 2, 3, 4, 5, 6].map(num => (
            <button
              key={num}
              className={`rotation-dot ${num === currentRotation ? 'active' : ''}`}
              onClick={() => goToRotation(num)}
              aria-label={`Go to rotation ${num}`}
            >
              {num}
            </button>
          ))}
        </div>
        
        <button 
          className="rotation-btn next-btn"
          onClick={goToNextRotation}
          aria-label="Next rotation"
        >
          Next →
        </button>
      </div>

      {/* Main court display - side by side */}
      <div className="courts-container">
        {/* Left side - Serving Formation */}
        <div className="formation-section">
          <h3 className="formation-title serving">🟢 Serving</h3>
          <UnifiedVolleyballCourt
            teamAPlayers={formatPlayersForCourt(teamARotations.servingRotations[currentIndex])}
            teamBPlayers={formatPlayersForCourt(teamBRotations.servingRotations[currentIndex])}
            rotationNumber={currentRotation}
            formation="serving"
          />
        </div>

        {/* Right side - In-Rally Formation */}
        <div className="formation-section">
          <h3 className="formation-title rally">🟠 In-Rally</h3>
          <UnifiedVolleyballCourt
            teamAPlayers={formatPlayersForCourt(teamARotations.rallyRotations[currentIndex])}
            teamBPlayers={formatPlayersForCourt(teamBRotations.rallyRotations[currentIndex])}
            rotationNumber={currentRotation}
            formation="rally"
          />
        </div>
      </div>
    </div>
  );
};

export default RotationMapViewer;