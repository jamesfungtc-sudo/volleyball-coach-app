import { useState, useRef } from 'react';
import './LandscapeDashboard.css';

const LandscapeDashboard = () => {
  const [currentTrajectory, setCurrentTrajectory] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const svgRef = useRef(null);

  // Court boundaries (in SVG coordinates)
  // Volleyball court is 9m x 18m (1:2 ratio)
  // Minimal out-of-bounds zones for maximum court display
  const COURT = {
    left: 30,
    right: 390,
    top: 40,
    bottom: 760,
    width: 360,
    height: 720
  };

  // Check if a point is within the court bounds
  const isInBounds = (x, y) => {
    return x >= COURT.left &&
           x <= COURT.right &&
           y >= COURT.top &&
           y <= COURT.bottom;
  };

  const getCoordinates = (e) => {
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();

    // Handle both touch and mouse events
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    // Create an SVG point for accurate transformation
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;

    // Transform screen coordinates to SVG coordinates
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());

    return {
      x: svgP.x,
      y: svgP.y
    };
  };

  const handleStart = (e) => {
    e.preventDefault();
    const coords = getCoordinates(e);
    setIsDragging(true);
    setCurrentTrajectory({
      startX: coords.x,
      startY: coords.y,
      endX: coords.x,
      endY: coords.y,
      startInBounds: isInBounds(coords.x, coords.y),
      endInBounds: isInBounds(coords.x, coords.y)
    });
  };

  const handleMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();

    const coords = getCoordinates(e);
    setCurrentTrajectory(prev => ({
      ...prev,
      endX: coords.x,
      endY: coords.y,
      endInBounds: isInBounds(coords.x, coords.y)
    }));
  };

  const handleEnd = (e) => {
    if (!isDragging) return;
    e.preventDefault();

    // Only keep trajectory if there's meaningful distance
    const distance = Math.sqrt(
      Math.pow(currentTrajectory.endX - currentTrajectory.startX, 2) +
      Math.pow(currentTrajectory.endY - currentTrajectory.startY, 2)
    );

    if (distance < 10) {
      setCurrentTrajectory(null);
    }

    setIsDragging(false);
  };

  const Arrow = ({ startX, startY, endX, endY, startInBounds, endInBounds, isDragging = false }) => {
    const angle = Math.atan2(endY - startY, endX - startX);
    const arrowLength = 15;

    const arrowPoint1X = endX - arrowLength * Math.cos(angle - Math.PI / 6);
    const arrowPoint1Y = endY - arrowLength * Math.sin(angle - Math.PI / 6);
    const arrowPoint2X = endX - arrowLength * Math.cos(angle + Math.PI / 6);
    const arrowPoint2Y = endY - arrowLength * Math.sin(angle + Math.PI / 6);

    const arrowColor = isDragging ? "#ff6b6b" : "#2563eb";
    const startColor = startInBounds ? "#22c55e" : "#ef4444";
    const endColor = endInBounds ? "#22c55e" : "#ef4444";

    return (
      <g>
        <line
          x1={startX}
          y1={startY}
          x2={endX}
          y2={endY}
          stroke={arrowColor}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <polygon
          points={`${endX},${endY} ${arrowPoint1X},${arrowPoint1Y} ${arrowPoint2X},${arrowPoint2Y}`}
          fill={arrowColor}
        />
        <circle
          cx={startX}
          cy={startY}
          r="8"
          fill={startColor}
          opacity="0.9"
          stroke="white"
          strokeWidth="2"
        />
        <circle
          cx={endX}
          cy={endY}
          r="8"
          fill={endColor}
          opacity="0.9"
          stroke="white"
          strokeWidth="2"
        />
      </g>
    );
  };

  return (
    <div className="landscape-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <select className="action-dropdown">
            <option>(Set)</option>
            <option>Serve</option>
            <option>Attack</option>
            <option>Pass</option>
          </select>
          <select className="action-dropdown">
            <option>(Serve/Receive)</option>
            <option>Serving</option>
            <option>Receiving</option>
          </select>
        </div>
        <div className="header-right">
          <button className="toggle-btn">Point only</button>
          <button className="toggle-btn active">All Attempt</button>
          <button className="settings-btn">⚙️</button>
        </div>
      </header>

      {/* Main Content */}
      <div className="dashboard-content">
        {/* Left: Court */}
        <div className="court-section">
          <svg
            ref={svgRef}
            className="court-svg"
            viewBox="0 0 420 800"
            preserveAspectRatio="xMidYMid meet"
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
          >
            {/* Out of bounds areas - light blue zones only */}
            <rect x="0" y="0" width="420" height="40" fill="#4a9fb8" />
            <rect x="0" y="760" width="420" height="40" fill="#4a9fb8" />
            <rect x="0" y="40" width="30" height="720" fill="#4a9fb8" />
            <rect x="390" y="40" width="30" height="720" fill="#4a9fb8" />

            {/* Court surface - 9m x 18m ratio (360 x 720) */}
            <rect x="30" y="40" width="360" height="720" fill="#d4956c" />
            <rect x="30" y="40" width="360" height="720" fill="none" stroke="white" strokeWidth="4" />

            {/* Center line - divides court in half */}
            <line x1="30" y1="400" x2="390" y2="400" stroke="white" strokeWidth="4" />

            {/* Attack lines (3m from center = 120px at our scale) */}
            <line x1="30" y1="280" x2="390" y2="280" stroke="white" strokeWidth="3" strokeDasharray="12,6" />
            <line x1="30" y1="520" x2="390" y2="520" stroke="white" strokeWidth="3" strokeDasharray="12,6" />

            {/* Labels */}
            <text x="210" y="190" textAnchor="middle" fill="white" fontSize="28" fontWeight="bold">
              SIDE A
            </text>
            <text x="210" y="630" textAnchor="middle" fill="white" fontSize="28" fontWeight="bold">
              SIDE B
            </text>

            {/* Trajectory */}
            {currentTrajectory && (
              <Arrow
                startX={currentTrajectory.startX}
                startY={currentTrajectory.startY}
                endX={currentTrajectory.endX}
                endY={currentTrajectory.endY}
                startInBounds={currentTrajectory.startInBounds}
                endInBounds={currentTrajectory.endInBounds}
                isDragging={isDragging}
              />
            )}
          </svg>

          <button
            className="undo-btn"
            onClick={() => setCurrentTrajectory(null)}
            disabled={!currentTrajectory}
          >
            ↺
          </button>
        </div>

        {/* Right: Controls & Stats */}
        <div className="controls-section">
          {/* Score Display */}
          <div className="score-display">
            <div className="score-box team-score">15</div>
            <div className="score-box opponent-score">9</div>
          </div>

          {/* Stats Grid */}
          <div className="stats-grid">
            <div className="stat-panel">
              <h3>Trends</h3>
              <div className="panel-content">
                {/* Mock chart area */}
              </div>
            </div>
            <div className="stat-panel">
              <h3>Stats</h3>
              <div className="panel-content">
                {/* Mock stats area */}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="action-buttons">
            <div className="button-row">
              <button className="rally-count">← 32</button>
              <button className="action-btn">Hit</button>
              <button className="action-btn">Block</button>
              <button className="action-btn">Hit</button>
              <button className="action-btn">Hit</button>
            </div>
            <div className="button-column">
              <button className="result-btn in-play">in-play</button>
              <button className="result-btn kill">Kill</button>
              <button className="result-btn error">Error</button>
            </div>
            <div className="button-row-small">
              <button className="small-btn">Hit</button>
              <button className="small-btn">Hit</button>
              <button className="small-btn">Hit</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandscapeDashboard;
