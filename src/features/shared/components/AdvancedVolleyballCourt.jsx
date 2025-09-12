import './AdvancedVolleyballCourt.css';

const AdvancedVolleyballCourt = ({ 
  players, 
  rotationNumber, 
  formation = 'serving', // 'serving' or 'rally'
  team = 'A',
  showNet = true,
  isTopHalf = false,
  isBottomHalf = false
}) => {
  // Team A and B should face each other across the net
  const getPositions = () => {
    if (isTopHalf) {
      // Team A positions (top half) - flipped to face Team B
      return [
        { id: 1, x: 15, y: 25, desc: 'P1 - Left Back' },    // Position 1 (Server) - flipped
        { id: 2, x: 15, y: 75, desc: 'P2 - Left Front' },   // Position 2 - flipped
        { id: 3, x: 50, y: 75, desc: 'P3 - Middle Front' }, // Position 3 - flipped
        { id: 4, x: 85, y: 75, desc: 'P4 - Right Front' },  // Position 4 - flipped
        { id: 5, x: 85, y: 25, desc: 'P5 - Right Back' },   // Position 5 - flipped
        { id: 6, x: 50, y: 25, desc: 'P6 - Middle Back' }   // Position 6 - flipped
      ];
    } else {
      // Team B positions (bottom half) or full court - normal orientation
      return [
        { id: 1, x: 85, y: 75, desc: 'P1 - Right Back' },    // Position 1 (Server)
        { id: 2, x: 85, y: 25, desc: 'P2 - Right Front' },   // Position 2
        { id: 3, x: 50, y: 25, desc: 'P3 - Middle Front' },  // Position 3
        { id: 4, x: 15, y: 25, desc: 'P4 - Left Front' },    // Position 4
        { id: 5, x: 15, y: 75, desc: 'P5 - Left Back' },     // Position 5
        { id: 6, x: 50, y: 75, desc: 'P6 - Middle Back' }    // Position 6
      ];
    }
  };

  const positions = getPositions();

  const getPlayerAtPosition = (position) => {
    if (!players || players.length < 6) return { name: '---', role: '' };
    return players[position - 1] || { name: '---', role: '' };
  };

  const isServer = (position) => {
    return formation === 'serving' && position === 1;
  };

  const getFormationTitle = () => {
    const formationType = formation === 'serving' ? 'Serving' : 'In-Rally';
    return `${formationType} - Rotation ${rotationNumber}`;
  };

  const getTeamColor = () => {
    return team === 'A' ? '#2196f3' : '#ff9800';
  };

  return (
    <div className={`advanced-volleyball-court ${isTopHalf ? 'top-half' : ''} ${isBottomHalf ? 'bottom-half' : ''}`}>
      {/* Remove redundant titles when used as half courts */}
      {!isTopHalf && !isBottomHalf && (
        <div className="court-title" style={{ color: getTeamColor() }}>
          <h4>Team {team}</h4>
          <span>{getFormationTitle()}</span>
        </div>
      )}
      
      <div className="court" style={{ borderColor: getTeamColor() }}>
        {/* Court background */}
        <div className="court-background">
          {/* Only show net line if showNet is true */}
          {showNet && <div className="net-line"></div>}
          
          {/* Attack lines */}
          <div className="attack-line-front"></div>
          <div className="attack-line-back"></div>
          
          {/* Only show center line if not used as half courts */}
          {!isTopHalf && !isBottomHalf && <div className="center-line"></div>}
        </div>

        {/* Player positions */}
        {positions.map(pos => {
          const player = getPlayerAtPosition(pos.id);
          const serverStatus = isServer(pos.id);
          
          return (
            <div
              key={pos.id}
              className={`player-position ${serverStatus ? 'server' : ''}`}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: 'translate(-50%, -50%)'
              }}
              title={pos.desc}
            >
              <div 
                className="player-circle"
                style={{ 
                  borderColor: getTeamColor(),
                  backgroundColor: serverStatus ? '#ff5722' : getTeamColor()
                }}
              >
                <div className="player-number">P{pos.id}</div>
                <div className="player-name">{player.name}</div>
                <div className="player-role">{player.role}</div>
              </div>
              {serverStatus && <div className="server-indicator">⚡</div>}
            </div>
          )
        })}

        {/* Formation type indicator */}
        <div className="formation-indicator">
          <span className={formation}>{formation.toUpperCase()}</span>
        </div>

        {/* Court labels */}
        <div className="court-labels">
          <div className="front-court-label">Front Court</div>
          <div className="back-court-label">Back Court</div>
          <div className="net-label">NET</div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedVolleyballCourt;