import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  VolleyballCourt,
  TrajectoryArrow,
  getCoordinates,
  clampToViewBox,
  isInBounds,
  calculateDistance,
  type Trajectory
} from '../features/inGameStats/components/VisualTracking';
import './VisualTrackingPage.css';

/**
 * VisualTrackingPage - Visual opponent tracking with trajectory drawing
 *
 * Layout:
 * - Left column (40%): SVG volleyball court with player markers and drawing
 * - Right column (60%): Stats panel (top) + Controls panel (bottom)
 * - Landscape orientation only, no scrolling
 *
 * Drawing system ported from: CourtDrawing Protopype/src/CourtDrawing.jsx
 */
export default function VisualTrackingPage() {
  const navigate = useNavigate();
  const svgRef = useRef<SVGSVGElement>(null);

  // Drawing state
  const [currentTrajectory, setCurrentTrajectory] = useState<Trajectory | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  /**
   * Handle drawing start (mouse down or touch start)
   * Ported from prototype handleStart
   */
  const handleStart = (event: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    event.preventDefault();

    if (!svgRef.current) return;

    const coords = getCoordinates(event, svgRef.current);
    const clamped = clampToViewBox(coords.x, coords.y);

    setIsDragging(true);
    setCurrentTrajectory({
      startX: clamped.x,
      startY: clamped.y,
      endX: clamped.x,
      endY: clamped.y,
      startInBounds: isInBounds(clamped.x, clamped.y),
      endInBounds: isInBounds(clamped.x, clamped.y)
    });
  };

  /**
   * Handle drawing move (mouse move or touch move)
   * Ported from prototype handleMove
   */
  const handleMove = (event: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    if (!isDragging || !svgRef.current) return;

    event.preventDefault();

    const coords = getCoordinates(event, svgRef.current);
    const clamped = clampToViewBox(coords.x, coords.y);

    setCurrentTrajectory(prev => prev ? {
      ...prev,
      endX: clamped.x,
      endY: clamped.y,
      endInBounds: isInBounds(clamped.x, clamped.y)
    } : null);
  };

  /**
   * Handle drawing end (mouse up or touch end)
   * Ported from prototype handleEnd
   */
  const handleEnd = (event: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    if (!isDragging) return;

    event.preventDefault();

    // Only keep trajectory if there's meaningful distance (minimum 10px)
    if (currentTrajectory) {
      const distance = calculateDistance(
        currentTrajectory.startX,
        currentTrajectory.startY,
        currentTrajectory.endX,
        currentTrajectory.endY
      );

      if (distance < 10) {
        // Too small, clear it
        setCurrentTrajectory(null);
      }
      // Otherwise keep the trajectory (don't clear it - user can redraw)
    }

    setIsDragging(false);
  };

  /**
   * Clear the current trajectory
   */
  const handleClear = () => {
    setCurrentTrajectory(null);
  };

  return (
    <div className="visual-tracking-page">
      {/* Header */}
      <header className="visual-tracking-header">
        <button
          onClick={() => navigate('/in-game-stats')}
          className="btn-back-arrow"
        >
          ← Back to Stats
        </button>
        <div className="header-info">
          <h1>Visual Opponent Tracking</h1>
          <p className="match-info">Eagles vs Hawks • Set 1</p>
        </div>
        <div className="header-actions">
          <button className="btn-icon" title="Settings">⚙️</button>
          <button className="btn-icon" title="Export">📥</button>
        </div>
      </header>

      {/* Main Content - 2 Column Grid */}
      <div className="visual-tracking-content">
        {/* Left Column: Volleyball Court */}
        <div className="court-section">
          <VolleyballCourt
            svgRef={svgRef}
            isDrawing={isDragging}
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
          >
            {/* Render the trajectory arrow if exists */}
            {currentTrajectory && (
              <TrajectoryArrow
                startX={currentTrajectory.startX}
                startY={currentTrajectory.startY}
                endX={currentTrajectory.endX}
                endY={currentTrajectory.endY}
                startInBounds={currentTrajectory.startInBounds}
                endInBounds={currentTrajectory.endInBounds}
                isDragging={isDragging}
              />
            )}
          </VolleyballCourt>
        </div>

        {/* Right Column: Stats + Controls */}
        <div className="panel-section">
          {/* Top: Stats Panel */}
          <div className="stats-panel">
            <div className="panel-placeholder">
              <h3>📊 Drawing Info</h3>
              {currentTrajectory && !isDragging && (
                <div className="trajectory-info">
                  <p>
                    <strong>Start:</strong>{' '}
                    {currentTrajectory.startInBounds ? '✅ In bounds' : '❌ Out of bounds'}
                  </p>
                  <p>
                    <strong>End:</strong>{' '}
                    {currentTrajectory.endInBounds ? '✅ In bounds' : '❌ Out of bounds'}
                  </p>
                  <p>
                    <strong>Coordinates:</strong>
                    <br />
                    Start: ({Math.round(currentTrajectory.startX)}, {Math.round(currentTrajectory.startY)})
                    <br />
                    End: ({Math.round(currentTrajectory.endX)}, {Math.round(currentTrajectory.endY)})
                  </p>
                </div>
              )}
              {!currentTrajectory && (
                <p style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                  Draw on the court to create a trajectory
                </p>
              )}
            </div>
          </div>

          {/* Bottom: Controls Panel */}
          <div className="controls-panel">
            <div className="panel-placeholder">
              <h3>🎮 Controls</h3>
              <div style={{ padding: '20px' }}>
                <button
                  onClick={handleClear}
                  disabled={!currentTrajectory}
                  style={{
                    padding: '12px 24px',
                    fontSize: '16px',
                    fontWeight: 600,
                    cursor: currentTrajectory ? 'pointer' : 'not-allowed',
                    background: currentTrajectory ? '#ef4444' : '#e0e0e0',
                    color: currentTrajectory ? '#ffffff' : '#999',
                    border: 'none',
                    borderRadius: '8px',
                    width: '100%'
                  }}
                >
                  Clear Trajectory
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Portrait Orientation Warning */}
      <div className="orientation-warning">
        <div className="warning-content">
          <h2>📱 Please Rotate Device</h2>
          <p>Visual tracking requires landscape orientation</p>
          <div className="rotate-icon">⤾</div>
        </div>
      </div>
    </div>
  );
}
