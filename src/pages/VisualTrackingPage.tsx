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

  // TODO: Re-enable OpponentTrackingContext after fixing require() issue
  // const {
  //   selectPlayer,
  //   setActionType: setContextActionType,
  //   setTrajectory,
  //   saveVisualAttempt,
  //   state: contextState
  // } = useOpponentTracking();

  // Player selection state
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerInPosition | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<'home' | 'opponent' | null>(null);

  // Action type state
  const [actionType, setActionType] = useState<'attack' | 'serve' | 'block' | 'dig'>('serve'); // Start with serve

  // Drawing state
  const [currentTrajectory, setCurrentTrajectory] = useState<Trajectory | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Point/Rally tracking state
  const [pointNumber, setPointNumber] = useState(1); // Current point number
  const [attemptNumber, setAttemptNumber] = useState(1); // Attempt within current point
  const [isServePhase, setIsServePhase] = useState(true); // True = waiting for serve, False = rally phase
  const [homeScore, setHomeScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);

  // Save attempts for current point (local storage until point ends)
  const [currentPointAttempts, setCurrentPointAttempts] = useState<any[]>([]);

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
   * Save the current attempt and handle point workflow
   */
  const handleSaveAttempt = (result: OpponentAttemptResult) => {
    if (!selectedPlayer || !currentTrajectory || !selectedTeam || !trajectoryAnalysis) {
      console.warn('Cannot save: missing player, trajectory, team, or analysis');
      return;
    }

    // Create attempt data
    const attemptData = {
      pointNumber,
      attemptNumber,
      actionType,
      player: `#${selectedPlayer.jerseyNumber} ${selectedPlayer.playerName}`,
      team: selectedTeam,
      result,
      trajectory: {
        start: [currentTrajectory.startX, currentTrajectory.startY],
        end: [currentTrajectory.endX, currentTrajectory.endY],
        distance: trajectoryAnalysis.distance,
        speed: trajectoryAnalysis.speed,
        landingArea: trajectoryAnalysis.landingArea,
        hitPosition: trajectoryAnalysis.hitPosition,
        serveZone: trajectoryAnalysis.serveZone
      }
    };

    // Add to current point attempts
    setCurrentPointAttempts(prev => [...prev, attemptData]);

    console.log(`📝 Point ${pointNumber}, Attempt ${attemptNumber}:`, attemptData);

    // Check if point ended
    const pointEnded = result === 'ace' || result === 'kill' || result === 'error';

    if (pointEnded) {
      // Update score
      if (result === 'error') {
        // Error by selected team = point to other team
        if (selectedTeam === 'home') {
          setOpponentScore(prev => prev + 1);
          console.log('📊 Opponent scores! (Home error)');
        } else {
          setHomeScore(prev => prev + 1);
          console.log('📊 Home scores! (Opponent error)');
        }
      } else {
        // Kill or Ace = point to selected team
        if (selectedTeam === 'home') {
          setHomeScore(prev => prev + 1);
          console.log('📊 Home scores! (Kill/Ace)');
        } else {
          setOpponentScore(prev => prev + 1);
          console.log('📊 Opponent scores! (Kill/Ace)');
        }
      }

      // Start new point
      console.log(`🏐 Point ${pointNumber} ended. Starting Point ${pointNumber + 1}`);
      console.log('All attempts in point:', [...currentPointAttempts, attemptData]);

      setPointNumber(prev => prev + 1);
      setAttemptNumber(1);
      setIsServePhase(true);
      setActionType('serve');
      setCurrentPointAttempts([]); // Clear attempts for new point
      setSelectedPlayer(null);
      setSelectedTeam(null);
    } else {
      // Point continues - rally phase
      setAttemptNumber(prev => prev + 1);
      setIsServePhase(false);
      setActionType('attack'); // Default to attack for rally
      setSelectedPlayer(null); // Force reselect player
      setSelectedTeam(null);
      console.log('▶️ Point continues - select next player');
    }

    // Clear trajectory
    setCurrentTrajectory(null);
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
   * Get available result buttons based on current action type
   */
  const getResultButtons = () => {
    if (actionType === 'serve') {
      return [
        { result: 'in_play' as OpponentAttemptResult, label: '▶️ In Play', color: '#3b82f6' },
        { result: 'ace' as OpponentAttemptResult, label: '🎯 Ace', color: '#f59e0b' },
        { result: 'error' as OpponentAttemptResult, label: '❌ Error', color: '#ef4444' }
      ];
    } else if (actionType === 'attack') {
      return [
        { result: 'in_play' as OpponentAttemptResult, label: '▶️ In Play', color: '#3b82f6' },
        { result: 'kill' as OpponentAttemptResult, label: '⚡ Kill', color: '#10b981' },
        { result: 'error' as OpponentAttemptResult, label: '❌ Error', color: '#ef4444' }
      ];
    } else if (actionType === 'block') {
      return [
        { result: 'in_play' as OpponentAttemptResult, label: '▶️ In Play', color: '#3b82f6' },
        { result: 'kill' as OpponentAttemptResult, label: '🛡️ Stuff', color: '#10b981' },
        { result: 'error' as OpponentAttemptResult, label: '❌ Error', color: '#ef4444' }
      ];
    } else if (actionType === 'dig') {
      return [
        { result: 'in_play' as OpponentAttemptResult, label: '▶️ In Play', color: '#3b82f6' },
        { result: 'error' as OpponentAttemptResult, label: '❌ Error', color: '#ef4444' }
      ];
    }
    return [];
  };

  /**
   * Clear selection and reset to player selection mode
   */
  const handleClear = () => {
    setCurrentTrajectory(null);
    setSelectedPlayer(null);
    setSelectedTeam(null);
    // Keep action type as-is (don't reset)
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

  return (
    <div className="visual-tracking-page">
      {/* Header */}
      <header className="visual-tracking-header">
        <button
          onClick={() => navigate('/in-game-stats')}
          className="btn-back-arrow"
        >
          ← Back
        </button>
        <div className="header-info" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          {/* Scoreboard */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            fontSize: '24px',
            fontWeight: '700'
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              minWidth: '80px'
            }}>
              <span style={{ fontSize: '14px', fontWeight: '400', color: '#666' }}>Home</span>
              <span style={{ fontSize: '32px', color: '#2563eb' }}>{homeScore}</span>
            </div>
            <span style={{ fontSize: '20px', color: '#999' }}>-</span>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              minWidth: '80px'
            }}>
              <span style={{ fontSize: '14px', fontWeight: '400', color: '#666' }}>Opponent</span>
              <span style={{ fontSize: '32px', color: '#dc2626' }}>{opponentScore}</span>
            </div>
          </div>
          {/* Point/Attempt Info */}
          <div style={{
            fontSize: '12px',
            color: '#666',
            background: '#f3f4f6',
            padding: '4px 12px',
            borderRadius: '12px',
            fontWeight: '500'
          }}>
            Point #{pointNumber} • Attempt #{attemptNumber} • {isServePhase ? '🏐 SERVE' : '⚡ RALLY'}
          </div>
        </div>
        <div className="header-actions">
          <button className="btn-icon" title="Settings">⚙️</button>
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

                  {/* Action Type Selector - Only show in rally phase */}
                  {!isServePhase && (
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
                  )}

                  {/* Show serve indicator during serve phase */}
                  {isServePhase && (
                    <div style={{
                      marginTop: '16px',
                      padding: '12px',
                      background: '#fef3c7',
                      borderRadius: '8px',
                      border: '2px solid #f59e0b',
                      textAlign: 'center'
                    }}>
                      <p style={{ fontWeight: '600', color: '#92400e', fontSize: '14px' }}>
                        🏐 SERVE PHASE
                      </p>
                    </div>
                  )}

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

                  {/* Result Buttons - Dynamic based on action type */}
                  <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '2px solid #e5e7eb' }}>
                    <p style={{ fontWeight: '600', marginBottom: '12px', fontSize: '14px' }}>
                      📝 Save Attempt:
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: getResultButtons().length === 2 ? '1fr 1fr' : '1fr 1fr', gap: '8px' }}>
                      {getResultButtons().map((btn) => (
                        <button
                          key={btn.result}
                          onClick={() => handleSaveAttempt(btn.result)}
                          style={{
                            padding: '12px',
                            fontSize: '14px',
                            fontWeight: '600',
                            border: `2px solid ${btn.color}`,
                            background: btn.color,
                            color: 'white',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            gridColumn: getResultButtons().length === 2 && btn.result === 'error' ? 'span 2' : 'auto'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.opacity = '0.8';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.opacity = '1';
                          }}
                        >
                          {btn.label}
                        </button>
                      ))}
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

              {/* TODO: Re-enable saved attempts list after fixing context */}
              {/* Saved Attempts List */}
              {/* {contextState.savedAttempts.length > 0 && (...)} */}
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
 * Export main component directly (OpponentTrackingProvider temporarily disabled)
 */
export default VisualTrackingPageContent;
