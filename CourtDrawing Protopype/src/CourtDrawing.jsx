import { useState, useRef } from 'react';
import './CourtDrawing.css';

const CourtDrawing = () => {
  const [currentTrajectory, setCurrentTrajectory] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const svgRef = useRef(null);

  // Court boundaries (in SVG coordinates)
  const COURT = {
    left: 50,
    right: 350,
    top: 100,
    bottom: 900,
    width: 300,
    height: 800
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

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
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
      // Too small, clear it
      setCurrentTrajectory(null);
    }
    // Otherwise keep the trajectory (don't clear it - user can redraw)

    setIsDragging(false);
  };

  const Arrow = ({ startX, startY, endX, endY, startInBounds, endInBounds, isDragging = false }) => {
    // Calculate arrow head
    const angle = Math.atan2(endY - startY, endX - startX);
    const arrowLength = 15;

    const arrowPoint1X = endX - arrowLength * Math.cos(angle - Math.PI / 6);
    const arrowPoint1Y = endY - arrowLength * Math.sin(angle - Math.PI / 6);
    const arrowPoint2X = endX - arrowLength * Math.cos(angle + Math.PI / 6);
    const arrowPoint2Y = endY - arrowLength * Math.sin(angle + Math.PI / 6);

    const arrowColor = isDragging ? "#ff6b6b" : "#2563eb";
    const startColor = startInBounds ? "#22c55e" : "#ef4444"; // green if in, red if out
    const endColor = endInBounds ? "#22c55e" : "#ef4444";

    return (
      <g className={isDragging ? 'preview-arrow' : 'trajectory-arrow'}>
        {/* Main line */}
        <line
          x1={startX}
          y1={startY}
          x2={endX}
          y2={endY}
          stroke={arrowColor}
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* Arrow head */}
        <polygon
          points={`${endX},${endY} ${arrowPoint1X},${arrowPoint1Y} ${arrowPoint2X},${arrowPoint2Y}`}
          fill={arrowColor}
        />
        {/* Start point indicator - color coded */}
        <circle
          cx={startX}
          cy={startY}
          r="8"
          fill={startColor}
          opacity="0.9"
          stroke="white"
          strokeWidth="2"
        />
        {/* End point indicator - color coded */}
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
    <div className="court-container">
      <h2>Volleyball Court - In/Out Bounds Tracking</h2>
      <p className="instructions">
        Draw trajectories anywhere. <span style={{color: '#22c55e', fontWeight: 'bold'}}>Green circles</span> = in bounds, <span style={{color: '#ef4444', fontWeight: 'bold'}}>Red circles</span> = out of bounds
      </p>

      <svg
        ref={svgRef}
        className="volleyball-court"
        viewBox="0 0 400 1000"
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
      >
        {/* Out of bounds area - top */}
        <rect x="0" y="0" width="400" height="100" fill="#4a9fb8" opacity="0.7" />

        {/* Out of bounds area - bottom */}
        <rect x="0" y="900" width="400" height="100" fill="#4a9fb8" opacity="0.7" />

        {/* Out of bounds area - left side */}
        <rect x="0" y="100" width="50" height="800" fill="#4a9fb8" opacity="0.7" />

        {/* Out of bounds area - right side */}
        <rect x="350" y="100" width="50" height="800" fill="#4a9fb8" opacity="0.7" />

        {/* Court playing surface (orange/clay) */}
        <rect x="50" y="100" width="300" height="800" fill="#d4956c" />

        {/* Court outline */}
        <rect x="50" y="100" width="300" height="800" fill="none" stroke="white" strokeWidth="3" />

        {/* Center line */}
        <line x1="50" y1="500" x2="350" y2="500" stroke="white" strokeWidth="3" />

        {/* Attack lines (3m from center - 120px in our scale) */}
        <line x1="50" y1="380" x2="350" y2="380" stroke="white" strokeWidth="2" strokeDasharray="10,5" />
        <line x1="50" y1="620" x2="350" y2="620" stroke="white" strokeWidth="2" strokeDasharray="10,5" />

        {/* Side labels */}
        <text x="200" y="250" textAnchor="middle" fill="white" fontSize="24" fontWeight="bold">
          SIDE A
        </text>
        <text x="200" y="770" textAnchor="middle" fill="white" fontSize="24" fontWeight="bold">
          SIDE B
        </text>

        {/* Out of bounds labels */}
        <text x="200" y="55" textAnchor="middle" fill="white" fontSize="16" opacity="0.8">
          OUT OF BOUNDS
        </text>
        <text x="200" y="965" textAnchor="middle" fill="white" fontSize="16" opacity="0.8">
          OUT OF BOUNDS
        </text>

        {/* Render the single trajectory */}
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

      <div className="controls">
        <button
          className="clear-btn"
          onClick={() => setCurrentTrajectory(null)}
          disabled={!currentTrajectory}
        >
          Clear Trajectory
        </button>
        {currentTrajectory && !isDragging && (
          <div className="trajectory-info">
            <p>
              <strong>Start:</strong> {currentTrajectory.startInBounds ? '✅ In bounds' : '❌ Out of bounds'}
            </p>
            <p>
              <strong>End:</strong> {currentTrajectory.endInBounds ? '✅ In bounds' : '❌ Out of bounds'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourtDrawing;
