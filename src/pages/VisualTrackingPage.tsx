import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  VolleyballCourt,
  COURT_DIMENSIONS,
  TrajectoryArrow,
  PlayerMarker,
  getCoordinates,
  clampToViewBox,
  isInBounds,
  calculateDistance,
  getPositionCoordinates,
  analyzeTrajectory,
  type Trajectory,
  type TeamLineup,
  type PlayerInPosition,
  type TrajectoryAnalysis
} from '../features/inGameStats/components/VisualTracking';
import {
  OpponentTrackingProvider,
  useOpponentTracking
} from '../features/inGameStats/context/OpponentTrackingContext';
import type {
  OpponentPlayer,
  TrajectoryData,
  OpponentAttemptResult
} from '../features/inGameStats/types/opponentTracking.types';
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
function VisualTrackingPageContent() {
  const navigate = useNavigate();
  const svgRef = useRef<SVGSVGElement>(null);

  // Opponent Tracking Context
  const {
    selectPlayer,
    setActionType: setContextActionType,
    setTrajectory,
    saveVisualAttempt,
    state: contextState
  } = useOpponentTracking();

  // Player selection state
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerInPosition | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<'home' | 'opponent' | null>(null);

  // Action type state
  const [actionType, setActionType] = useState<'attack' | 'serve' | 'block' | 'dig'>('attack');

  // Drawing state
  const [currentTrajectory, setCurrentTrajectory] = useState<Trajectory | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Mock player lineups (TODO: Load from match context)
  const [homeLineup] = useState<TeamLineup>({
    P1: { playerId: 'h1', jerseyNumber: 1, playerName: 'Player 1', position: 'P1' },
    P2: { playerId: 'h2', jerseyNumber: 2, playerName: 'Player 2', position: 'P2' },
    P3: { playerId: 'h3', jerseyNumber: 3, playerName: 'Player 3', position: 'P3' },
    P4: { playerId: 'h4', jerseyNumber: 4, playerName: 'Player 4', position: 'P4' },
    P5: { playerId: 'h5', jerseyNumber: 5, playerName: 'Player 5', position: 'P5' },
    P6: { playerId: 'h6', jerseyNumber: 6, playerName: 'Player 6', position: 'P6' }
  });

  const [opponentLineup] = useState<TeamLineup>({
    P1: { playerId: 'o1', jerseyNumber: 7, playerName: 'Opponent 1', position: 'P1' },
    P2: { playerId: 'o2', jerseyNumber: 8, playerName: 'Opponent 2', position: 'P2' },
    P3: { playerId: 'o3', jerseyNumber: 9, playerName: 'Opponent 3', position: 'P3' },
    P4: { playerId: 'o4', jerseyNumber: 10, playerName: 'Opponent 4', position: 'P4' },
    P5: { playerId: 'o5', jerseyNumber: 11, playerName: 'Opponent 5', position: 'P5' },
    P6: { playerId: 'o6', jerseyNumber: 12, playerName: 'Opponent 6', position: 'P6' }
  });

  /**
   * Save the current attempt with result button
   * Converts trajectory and player data to context format and saves
   */
  const handleSaveAttempt = (result: OpponentAttemptResult) => {
    if (!selectedPlayer || !currentTrajectory || !selectedTeam || !trajectoryAnalysis) {
      console.warn('Cannot save: missing player, trajectory, team, or analysis');
      return;
    }

    // Convert PlayerInPosition to OpponentPlayer format
    const opponentPlayer: OpponentPlayer = {
      id: selectedPlayer.playerId,
      name: `#${selectedPlayer.jerseyNumber} ${selectedPlayer.playerName}`,
      number: selectedPlayer.jerseyNumber.toString()
    };

    // Convert local Trajectory to TrajectoryData format
    const trajectoryData: TrajectoryData = {
      startX: currentTrajectory.startX,
      startY: currentTrajectory.startY,
      endX: currentTrajectory.endX,
      endY: currentTrajectory.endY,
      startInBounds: currentTrajectory.startInBounds,
      endInBounds: currentTrajectory.endInBounds,
      distance: trajectoryAnalysis.distance,
      angle: 0, // TODO: Calculate angle if needed
      speed: trajectoryAnalysis.speed,
      landingArea: trajectoryAnalysis.landingArea
    };

    // Update context with player and trajectory
    selectPlayer(opponentPlayer, selectedTeam);
    setContextActionType(actionType);
    setTrajectory(trajectoryData);

    // Save the attempt
    saveVisualAttempt(result);

    // Clear trajectory and allow user to draw again for same player
    setCurrentTrajectory(null);

    console.log(`✅ Saved ${actionType} attempt:`, {
      player: opponentPlayer.name,
      result,
      trajectory: trajectoryData
    });
  };

  /**
   * Handle drawing start (mouse down or touch start)
   * Ported from prototype handleStart
   *
   * IMPORTANT: Only allow drawing if a player is selected
   */
  const handleStart = (event: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    event.preventDefault();

    // Block drawing if no player selected
    if (!selectedPlayer) return;

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
   * Handle player selection
   */
  const handlePlayerClick = (playerId: string, team: 'home' | 'opponent') => {
    const lineup = team === 'home' ? homeLineup : opponentLineup;
    const player = Object.values(lineup).find(p => p?.playerId === playerId);

    if (player) {
      setSelectedPlayer(player);
      setSelectedTeam(team);
      // Clear any existing trajectory when selecting new player
      setCurrentTrajectory(null);
    }
  };

  /**
   * Clear selection and reset to player selection mode
   */
  const handleClear = () => {
    setCurrentTrajectory(null);
    setSelectedPlayer(null);
    setSelectedTeam(null);
    setActionType('attack'); // Reset to default
  };

  /**
   * Reselect player (keep current player, clear trajectory)
   */
  const handleReselectPlayer = () => {
    setCurrentTrajectory(null);
    setSelectedPlayer(null);
    setSelectedTeam(null);
    setActionType('attack');
  };

  /**
   * Determine which side of the court should be disabled for drawing
   * Disabled side only shows when:
   * 1. A player is selected
   * 2. No trajectory has been started yet (user hasn't picked the starting point)
   *
   * Once user starts drawing (isDragging or currentTrajectory exists), the overlay disappears
   * because the ball can land on any side of the court.
   */
  const disabledSide: 'home' | 'opponent' | null = useMemo(() => {
    // No restriction if no player selected
    if (!selectedTeam) return null;

    // Once user starts drawing, remove the overlay (ball can cross to other side)
    if (isDragging || currentTrajectory) return null;

    // Before drawing starts: restrict the starting side
    // If opponent team selected, disable home side (they should start from opponent side)
    // If home team selected, disable opponent side (they should start from home side)
    return selectedTeam === 'opponent' ? 'home' : 'opponent';
  }, [selectedTeam, isDragging, currentTrajectory]);

  /**
   * Keyboard shortcut: Space bar for "In Play"
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only trigger if Space bar and we have a valid trajectory
      if (event.code === 'Space' && trajectoryAnalysis && selectedPlayer && currentTrajectory && selectedTeam) {
        event.preventDefault();
        handleSaveAttempt('in_play');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [trajectoryAnalysis, selectedPlayer, currentTrajectory, selectedTeam]);

  /**
   * Analyze current trajectory using coordinate calculations
   * Only calculate when trajectory exists and is not being dragged
   */
  const trajectoryAnalysis: TrajectoryAnalysis | null = useMemo(() => {
    if (!currentTrajectory || isDragging || !selectedTeam) return null;

    return analyzeTrajectory(
      currentTrajectory.startX,
      currentTrajectory.startY,
      currentTrajectory.endX,
      currentTrajectory.endY,
      selectedTeam,
      actionType,
      currentTrajectory.startInBounds,
      currentTrajectory.endInBounds
    );
  }, [currentTrajectory, isDragging, selectedTeam, actionType]);

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
            disabledSide={disabledSide}
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
          >
            {/* Render home team players - Only show if no player selected (drawing mode) */}
            {!selectedPlayer && Object.values(homeLineup).map((player) => {
              if (!player) return null;
              const position = getPositionCoordinates('home', player.position);

              return (
                <PlayerMarker
                  key={player.playerId}
                  playerId={player.playerId}
                  jerseyNumber={player.jerseyNumber}
                  playerName={player.playerName}
                  team="home"
                  x={position.x}
                  y={position.y}
                  isSelected={false}
                  isFaded={false}
                  onClick={(id) => handlePlayerClick(id, 'home')}
                />
              );
            })}

            {/* Render opponent team players - Only show if no player selected (drawing mode) */}
            {!selectedPlayer && Object.values(opponentLineup).map((player) => {
              if (!player) return null;
              const position = getPositionCoordinates('opponent', player.position);

              return (
                <PlayerMarker
                  key={player.playerId}
                  playerId={player.playerId}
                  jerseyNumber={player.jerseyNumber}
                  playerName={player.playerName}
                  team="opponent"
                  x={position.x}
                  y={position.y}
                  isSelected={false}
                  isFaded={false}
                  onClick={(id) => handlePlayerClick(id, 'opponent')}
                />
              );
            })}

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
              <h3>📊 Player & Drawing Info</h3>

              {/* Selected Player */}
              {selectedPlayer && (
                <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
                  <p><strong>Selected Player:</strong></p>
                  <p style={{ fontSize: '18px', fontWeight: '600', color: '#2563eb' }}>
                    #{selectedPlayer.jerseyNumber} {selectedPlayer.playerName}
                  </p>
                  <p style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>
                    Position: {selectedPlayer.position} ({selectedTeam === 'home' ? 'Home' : 'Opponent'})
                  </p>

                  {/* Action Type Selector */}
                  <div style={{ marginTop: '16px' }}>
                    <p style={{ fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}>Action Type:</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <button
                        onClick={() => setActionType('attack')}
                        style={{
                          padding: '10px',
                          fontSize: '14px',
                          fontWeight: '600',
                          border: actionType === 'attack' ? '2px solid #059669' : '2px solid #e5e7eb',
                          background: actionType === 'attack' ? '#059669' : 'white',
                          color: actionType === 'attack' ? 'white' : '#333',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        Attack
                      </button>
                      <button
                        onClick={() => setActionType('serve')}
                        style={{
                          padding: '10px',
                          fontSize: '14px',
                          fontWeight: '600',
                          border: actionType === 'serve' ? '2px solid #ea580c' : '2px solid #e5e7eb',
                          background: actionType === 'serve' ? '#ea580c' : 'white',
                          color: actionType === 'serve' ? 'white' : '#333',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        Serve
                      </button>
                      <button
                        onClick={() => setActionType('block')}
                        style={{
                          padding: '10px',
                          fontSize: '14px',
                          fontWeight: '600',
                          border: actionType === 'block' ? '2px solid #7c3aed' : '2px solid #e5e7eb',
                          background: actionType === 'block' ? '#7c3aed' : 'white',
                          color: actionType === 'block' ? 'white' : '#333',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        Block
                      </button>
                      <button
                        onClick={() => setActionType('dig')}
                        style={{
                          padding: '10px',
                          fontSize: '14px',
                          fontWeight: '600',
                          border: actionType === 'dig' ? '2px solid #0891b2' : '2px solid #e5e7eb',
                          background: actionType === 'dig' ? '#0891b2' : 'white',
                          color: actionType === 'dig' ? 'white' : '#333',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        Dig
                      </button>
                    </div>
                  </div>

                  {/* Reselect Player Button */}
                  <button
                    onClick={handleReselectPlayer}
                    style={{
                      marginTop: '16px',
                      padding: '10px',
                      width: '100%',
                      fontSize: '14px',
                      fontWeight: '600',
                      border: '2px solid #2563eb',
                      background: 'white',
                      color: '#2563eb',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    🔄 Reselect Player
                  </button>
                </div>
              )}

              {/* Trajectory Analysis */}
              {trajectoryAnalysis && (
                <div style={{ padding: '20px', borderTop: '1px solid #e5e7eb' }}>
                  <p style={{ fontWeight: '600', marginBottom: '12px', fontSize: '16px' }}>
                    📍 Trajectory Analysis
                  </p>

                  {/* Bounds Check */}
                  <div style={{ marginBottom: '12px', fontSize: '14px' }}>
                    <p style={{ marginBottom: '4px' }}>
                      <strong>Start:</strong>{' '}
                      {trajectoryAnalysis.startInBounds ? '✅ In bounds' : '❌ Out of bounds'}
                    </p>
                    <p>
                      <strong>Landing:</strong>{' '}
                      {trajectoryAnalysis.endInBounds ? '✅ In bounds' : '❌ Out of bounds'}
                    </p>
                  </div>

                  {/* Distance & Speed */}
                  <div style={{ marginBottom: '12px', fontSize: '14px' }}>
                    <p style={{ marginBottom: '4px' }}>
                      <strong>Distance:</strong> {Math.round(trajectoryAnalysis.distance)}px
                    </p>
                    <p>
                      <strong>Speed:</strong>{' '}
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: trajectoryAnalysis.speed === 'short' ? '#fef3c7' :
                                   trajectoryAnalysis.speed === 'medium' ? '#fed7aa' : '#fecaca',
                        color: '#333',
                        fontWeight: '600',
                        fontSize: '12px'
                      }}>
                        {trajectoryAnalysis.speed.toUpperCase()}
                      </span>
                    </p>
                  </div>

                  {/* Landing Area */}
                  <div style={{ marginBottom: '12px', fontSize: '14px' }}>
                    <p>
                      <strong>Landing Area:</strong>{' '}
                      <span style={{ textTransform: 'capitalize', fontWeight: '600' }}>
                        {trajectoryAnalysis.landingArea} Court
                      </span>
                    </p>
                  </div>

                  {/* Serve Zone (if serve) */}
                  {actionType === 'serve' && trajectoryAnalysis.serveZone && (
                    <div style={{ marginBottom: '12px', fontSize: '14px' }}>
                      <p>
                        <strong>Serve Zone:</strong>{' '}
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '4px',
                          background: '#dbeafe',
                          color: '#1e40af',
                          fontWeight: '600',
                          fontSize: '14px'
                        }}>
                          Zone {trajectoryAnalysis.serveZone}
                        </span>
                      </p>
                    </div>
                  )}

                  {/* Hit Position (if attack) */}
                  {actionType === 'attack' && trajectoryAnalysis.hitPosition && (
                    <div style={{ marginBottom: '12px', fontSize: '14px' }}>
                      <p>
                        <strong>Hit Position:</strong>{' '}
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '4px',
                          background: '#dcfce7',
                          color: '#166534',
                          fontWeight: '600',
                          fontSize: '14px'
                        }}>
                          {trajectoryAnalysis.hitPosition}
                        </span>
                      </p>
                    </div>
                  )}

                  {/* Grid Cell (for reference) */}
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                    <p>Grid: Row {trajectoryAnalysis.gridCell.row + 1}, Col {trajectoryAnalysis.gridCell.col + 1}</p>
                  </div>

                  {/* Result Buttons - NEW */}
                  <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '2px solid #e5e7eb' }}>
                    <p style={{ fontWeight: '600', marginBottom: '12px', fontSize: '14px' }}>
                      📝 Save Attempt:
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <button
                        onClick={() => handleSaveAttempt('in_play')}
                        style={{
                          padding: '12px',
                          fontSize: '14px',
                          fontWeight: '600',
                          border: '2px solid #3b82f6',
                          background: '#3b82f6',
                          color: 'white',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#2563eb'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#3b82f6'}
                      >
                        ▶️ In Play
                      </button>
                      <button
                        onClick={() => handleSaveAttempt('kill')}
                        style={{
                          padding: '12px',
                          fontSize: '14px',
                          fontWeight: '600',
                          border: '2px solid #10b981',
                          background: '#10b981',
                          color: 'white',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#059669'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#10b981'}
                      >
                        ⚡ Kill
                      </button>
                      <button
                        onClick={() => handleSaveAttempt('ace')}
                        style={{
                          padding: '12px',
                          fontSize: '14px',
                          fontWeight: '600',
                          border: '2px solid #f59e0b',
                          background: '#f59e0b',
                          color: 'white',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#d97706'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#f59e0b'}
                      >
                        🎯 Ace
                      </button>
                      <button
                        onClick={() => handleSaveAttempt('error')}
                        style={{
                          padding: '12px',
                          fontSize: '14px',
                          fontWeight: '600',
                          border: '2px solid #ef4444',
                          background: '#ef4444',
                          color: 'white',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#dc2626'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#ef4444'}
                      >
                        ❌ Error
                      </button>
                    </div>
                    <p style={{ fontSize: '11px', color: '#666', marginTop: '8px', textAlign: 'center' }}>
                      💡 Tip: Press Space for "In Play"
                    </p>
                  </div>

                  {/* Debug Info */}
                  {currentTrajectory && (
                    <div style={{ fontSize: '11px', color: '#999', marginTop: '12px', padding: '8px', background: '#f9fafb', borderRadius: '4px' }}>
                      <p style={{ fontWeight: '600', marginBottom: '4px' }}>Debug Info:</p>
                      <p>Start: ({Math.round(currentTrajectory.startX)}, {Math.round(currentTrajectory.startY)})</p>
                      <p>End: ({Math.round(currentTrajectory.endX)}, {Math.round(currentTrajectory.endY)})</p>
                      <p>Start X%: {Math.round((currentTrajectory.startX - 40) / 340 * 100)}%</p>
                    </div>
                  )}
                </div>
              )}

              {/* No selection message */}
              {!selectedPlayer && !currentTrajectory && (
                <p style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                  Step 1: Click a player on the court to select them
                </p>
              )}

              {/* Selected but no trajectory */}
              {selectedPlayer && !currentTrajectory && (
                <p style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                  Step 2: Draw on the court to create a trajectory
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
                  disabled={!selectedPlayer && !currentTrajectory}
                  style={{
                    padding: '12px 24px',
                    fontSize: '16px',
                    fontWeight: 600,
                    cursor: (selectedPlayer || currentTrajectory) ? 'pointer' : 'not-allowed',
                    background: (selectedPlayer || currentTrajectory) ? '#ef4444' : '#e0e0e0',
                    color: (selectedPlayer || currentTrajectory) ? '#ffffff' : '#999',
                    border: 'none',
                    borderRadius: '8px',
                    width: '100%'
                  }}
                >
                  Clear Selection
                </button>
              </div>

              {/* Saved Attempts List */}
              {contextState.savedAttempts.length > 0 && (
                <div style={{ padding: '20px', borderTop: '2px solid #e5e7eb' }}>
                  <h4 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>
                    📋 Saved Attempts ({contextState.savedAttempts.length})
                  </h4>
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {contextState.savedAttempts.map((attempt, index) => (
                      <div
                        key={index}
                        style={{
                          padding: '8px',
                          marginBottom: '8px',
                          background: '#f9fafb',
                          borderRadius: '4px',
                          fontSize: '12px',
                          borderLeft: `4px solid ${
                            attempt.result === 'kill' ? '#10b981' :
                            attempt.result === 'ace' ? '#f59e0b' :
                            attempt.result === 'error' ? '#ef4444' : '#3b82f6'
                          }`
                        }}
                      >
                        <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                          #{attempt.attempt_number} - {attempt.player_name}
                        </div>
                        <div style={{ color: '#666' }}>
                          {attempt.type.toUpperCase()} → {attempt.result.replace('_', ' ').toUpperCase()}
                        </div>
                        {attempt.hit_position && (
                          <div style={{ color: '#666', fontSize: '11px' }}>
                            Position: {attempt.hit_position}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
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

/**
 * Wrapper component with OpponentTrackingProvider
 */
export default function VisualTrackingPage() {
  return (
    <OpponentTrackingProvider>
      <VisualTrackingPageContent />
    </OpponentTrackingProvider>
  );
}
