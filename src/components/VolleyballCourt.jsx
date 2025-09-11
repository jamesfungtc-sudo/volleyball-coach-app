import './VolleyballCourt.css'

const VolleyballCourt = ({ players, currentRotation }) => {
  // Calculate actual positions based on rotation
  // Volleyball positions: 1=Server, 2=Right Front, 3=Middle Front, 4=Left Front, 5=Left Back, 6=Middle Back
  // Rotation system: positions move clockwise when rotating
  
  const getPlayerAtPosition = (position) => {
    // Calculate which player is at which court position based on current rotation
    const playerNumber = ((position - currentRotation + 6) % 6) + 1
    return players[playerNumber]
  }

  const positions = [
    { id: 4, label: 'P4', x: 15, y: 25, desc: 'Left Front' },     // Position 4
    { id: 3, label: 'P3', x: 50, y: 25, desc: 'Middle Front' },   // Position 3  
    { id: 2, label: 'P2', x: 85, y: 25, desc: 'Right Front' },    // Position 2
    { id: 5, label: 'P5', x: 15, y: 75, desc: 'Left Back' },      // Position 5
    { id: 6, label: 'P6', x: 50, y: 75, desc: 'Middle Back' },    // Position 6
    { id: 1, label: 'P1', x: 85, y: 75, desc: 'Right Back/Server' } // Position 1
  ]

  return (
    <div className="volleyball-court-container">
      <div className="court">
        {/* Court background */}
        <div className="court-background">
          {/* Net line */}
          <div className="net-line"></div>
          
          {/* Attack lines */}
          <div className="attack-line-front"></div>
          <div className="attack-line-back"></div>
          
          {/* Center line */}
          <div className="center-line"></div>
        </div>

        {/* Player positions */}
        {positions.map(pos => {
          const player = getPlayerAtPosition(pos.id)
          const isServer = pos.id === currentRotation
          
          return (
            <div
              key={pos.id}
              className={`player-position ${isServer ? 'server' : ''}`}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              <div className="player-circle">
                <div className="player-number">{pos.id}</div>
                <div className="player-name">{player.name}</div>
                <div className="player-role">{player.position}</div>
              </div>
              {isServer && <div className="server-indicator">⚡</div>}
            </div>
          )
        })}

        {/* Court labels */}
        <div className="court-labels">
          <div className="front-court-label">Front Court</div>
          <div className="back-court-label">Back Court</div>
          <div className="net-label">NET</div>
        </div>
      </div>
    </div>
  )
}

export default VolleyballCourt