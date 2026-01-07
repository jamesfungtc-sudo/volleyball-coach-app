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

  // Debug info toggle
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  // Point/Rally tracking state
  const [pointNumber, setPointNumber] = useState(1); // Current point number
  const [attemptNumber, setAttemptNumber] = useState(1); // Attempt within current point
  const [isServePhase, setIsServePhase] = useState(true); // True = waiting for serve, False = rally phase
  const [homeScore, setHomeScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);

  // Serving team tracking (volleyball rules: winner of previous point serves)
  const [servingTeam, setServingTeam] = useState<'home' | 'opponent'>('home'); // Default: home serves first

  // Track if first player has been selected (to hide serve selector)
  const [firstPlayerSelected, setFirstPlayerSelected] = useState(false);

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
      // Determine point winner and update score + serving team
      let pointWinner: 'home' | 'opponent';

      if (result === 'error') {
        // Error by selected team = point to other team
        pointWinner = selectedTeam === 'home' ? 'opponent' : 'home';
        if (selectedTeam === 'home') {
          setOpponentScore(prev => prev + 1);
          console.log('📊 Opponent scores! (Home error)');
        } else {
          setHomeScore(prev => prev + 1);
          console.log('📊 Home scores! (Opponent error)');
        }
      } else {
        // Kill or Ace = point to selected team
        pointWinner = selectedTeam;
        if (selectedTeam === 'home') {
          setHomeScore(prev => prev + 1);
          console.log('📊 Home scores! (Kill/Ace)');
        } else {
          setOpponentScore(prev => prev + 1);
          console.log('📊 Opponent scores! (Kill/Ace)');
        }
      }

      // Update serving team (winner serves next)
      setServingTeam(pointWinner);
      console.log(`🏐 ${pointWinner} wins the point and will serve next`);

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
   * During serve phase: Only allow selecting players from serving team
   */
  const handlePlayerClick = (playerId: string, team: 'home' | 'opponent') => {
    // Enforce serving team rule during serve phase
    if (isServePhase && team !== servingTeam) {
      console.log(`⚠️ Cannot select ${team} player - ${servingTeam} is serving`);
      return; // Block selection of non-serving team during serve
    }

    const lineup = team === 'home' ? homeLineup : opponentLineup;
    const player = Object.values(lineup).find(p => p?.playerId === playerId);

    if (player) {
      setSelectedPlayer(player);
      setSelectedTeam(team);
      // Clear any existing trajectory when selecting new player
      setCurrentTrajectory(null);

      // Mark first player as selected (hides serve selector for rest of set)
      if (!firstPlayerSelected) {
        setFirstPlayerSelected(true);
      }
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

    // Show serve selector again if we're still at the start (0-0, Point 1)
    if (pointNumber === 1 && homeScore === 0 && opponentScore === 0) {
      setFirstPlayerSelected(false);
    }
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
      {/* Main Content - 2 Column Grid */}
      <div className="visual-tracking-content">
        {/* Left Column: Volleyball Court */}
        <div className="court-section">
          <VolleyballCourt
            svgRef={svgRef}
            isDrawing={isDragging}
            disabledSide={disabledSide}
            servingTeam={servingTeam}
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

        {/* Right Column: 3 Sectors */}
        <div className="panel-section">
          {/* TOP SECTOR (40%): Scoreboard + Stats */}
          <div className="stats-panel" style={{ position: 'relative' }}>
            {/* First Serve Selector - Show only before first player selected */}
            {!firstPlayerSelected && (
              <div style={{
                padding: '12px',
                background: '#fef3c7',
                border: '2px solid #f59e0b',
                borderRadius: '8px',
                marginBottom: '12px'
              }}>
                <div style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#92400e',
                  marginBottom: '8px',
                  textAlign: 'center'
                }}>
                  Who serves first?
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px'
                }}>
                  <button
                    onClick={() => setServingTeam('home')}
                    style={{
                      padding: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      background: servingTeam === 'home' ? '#7c3aed' : '#f3f4f6',
                      color: servingTeam === 'home' ? 'white' : '#333',
                      border: servingTeam === 'home' ? '2px solid #5b21b6' : '2px solid #d1d5db',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    🏠 Home
                  </button>
                  <button
                    onClick={() => setServingTeam('opponent')}
                    style={{
                      padding: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      background: servingTeam === 'opponent' ? '#ef4444' : '#f3f4f6',
                      color: servingTeam === 'opponent' ? 'white' : '#333',
                      border: servingTeam === 'opponent' ? '2px solid #dc2626' : '2px solid #d1d5db',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    🏐 Opponent
                  </button>
                </div>
              </div>
            )}

            {/* Scoreboard Section */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              gap: '16px',
              alignItems: 'center',
              margin: 0,
              padding: '16px',
              background: '#f9fafb',
              borderRadius: '8px'
            }}>
              {/* Home Score */}
              <div style={{
                background: '#7c3aed',
                color: 'white',
                padding: '8px',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '12px', fontWeight: '400', opacity: 0.9 }}>
                  Home{servingTeam === 'home' ? ' (Serving)' : ''}
                </div>
                <div style={{ fontSize: '28px', fontWeight: '700' }}>{homeScore}</div>
              </div>

              {/* Reset Button */}
              <button
                onClick={() => {
                  if (window.confirm('Reset scoreboard to 0-0?')) {
                    setHomeScore(0);
                    setOpponentScore(0);
                    setPointNumber(1);
                    setAttemptNumber(1);
                    setIsServePhase(true);
                    setActionType('serve');
                    setServingTeam('home'); // Reset to home serves first
                    setFirstPlayerSelected(false); // Show serve selector again
                    setCurrentPointAttempts([]);
                    setSelectedPlayer(null);
                    setSelectedTeam(null);
                    setCurrentTrajectory(null);
                  }
                }}
                style={{
                  padding: '12px 20px',
                  fontSize: '14px',
                  fontWeight: '600',
                  background: '#f3f4f6',
                  border: '2px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                🔄 Reset
              </button>

              {/* Opponent Score */}
              <div style={{
                background: '#ef4444',
                color: 'white',
                padding: '8px',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '12px', fontWeight: '400', opacity: 0.9 }}>
                  Opponent{servingTeam === 'opponent' ? ' (Serving)' : ''}
                </div>
                <div style={{ fontSize: '28px', fontWeight: '700' }}>{opponentScore}</div>
              </div>
            </div>

            {/* Debug Info Toggle Button - Top Right Corner */}
            <div style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              zIndex: 10
            }}>
              <button
                onClick={() => setShowDebugInfo(!showDebugInfo)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '2px solid #d1d5db',
                  background: showDebugInfo ? '#7c3aed' : '#f3f4f6',
                  color: showDebugInfo ? 'white' : '#666',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                }}
                title="Toggle debug info"
              >
                i
              </button>
            </div>
          </div>

          {/* MIDDLE SECTOR (15%): Action Bar */}
          <div className="action-bar">
            {/* Selected Player Button */}
            {selectedPlayer ? (
              <button
                onClick={handleReselectPlayer}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  fontSize: '18px',
                  fontWeight: '700',
                  background: selectedTeam === 'home' ? '#7c3aed' : '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  minWidth: '120px',
                  justifyContent: 'center'
                }}
              >
                <span>←</span>
                <span>#{selectedPlayer.jerseyNumber}</span>
              </button>
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px 16px',
                fontSize: '14px',
                color: '#999',
                background: '#f3f4f6',
                borderRadius: '6px',
                minWidth: '120px',
                justifyContent: 'center'
              }}>
                No Player
              </div>
            )}

            {/* Action Type Buttons - Show only in rally phase */}
            {!isServePhase && selectedPlayer && (
              <div style={{
                display: 'flex',
                gap: '8px',
                flex: 1
              }}>
                <button
                  onClick={() => setActionType('attack')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    fontSize: '14px',
                    fontWeight: '600',
                    border: actionType === 'attack' ? '3px solid #059669' : '2px solid #e5e7eb',
                    background: actionType === 'attack' ? '#059669' : 'white',
                    color: actionType === 'attack' ? 'white' : '#333',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  ⚡ Hit
                </button>
                <button
                  onClick={() => setActionType('block')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    fontSize: '14px',
                    fontWeight: '600',
                    border: actionType === 'block' ? '3px solid #7c3aed' : '2px solid #e5e7eb',
                    background: actionType === 'block' ? '#7c3aed' : 'white',
                    color: actionType === 'block' ? 'white' : '#333',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  🛡️ Block
                </button>
                <button
                  onClick={() => setActionType('dig')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    fontSize: '14px',
                    fontWeight: '600',
                    border: actionType === 'dig' ? '3px solid #0891b2' : '2px solid #e5e7eb',
                    background: actionType === 'dig' ? '#0891b2' : 'white',
                    color: actionType === 'dig' ? 'white' : '#333',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  💪 Dig
                </button>
              </div>
            )}

            {/* Serve indicator during serve phase */}
            {isServePhase && selectedPlayer && (
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                fontWeight: '600',
                color: '#92400e',
                background: '#fef3c7',
                borderRadius: '6px',
                padding: '10px',
                border: '2px solid #f59e0b'
              }}>
                🏐 SERVE PHASE
              </div>
            )}

            {/* Instructions - Show when no player or no trajectory */}
            {!selectedPlayer && (
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                color: '#999',
                background: '#f9fafb',
                borderRadius: '6px',
                padding: '10px',
                border: '2px dashed #d1d5db'
              }}>
                👆 Click a player on the court to begin
              </div>
            )}
            {selectedPlayer && !currentTrajectory && !isServePhase && (
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                color: '#999',
                background: '#f9fafb',
                borderRadius: '6px',
                padding: '10px',
                border: '2px dashed #d1d5db'
              }}>
                ✏️ Draw a trajectory on the court
              </div>
            )}

            {/* Settings Button */}
            <button
              style={{
                width: '40px',
                height: '40px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                background: '#ffffff',
                fontSize: '18px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Settings"
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#f5f5f5';
                e.currentTarget.style.borderColor = '#ccc';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.borderColor = '#ddd';
              }}
            >
              ⚙️
            </button>
          </div>

          {/* BOTTOM SECTOR (45%): Result Buttons + Hit Zones */}
          <div className="controls-panel">
            {trajectoryAnalysis ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', height: '100%' }}>
                {/* Left: Result Buttons (Vertical Stack) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#666' }}>
                    📝 Result
                  </h3>
                  {getResultButtons().map((btn) => (
                    <button
                      key={btn.result}
                      onClick={() => handleSaveAttempt(btn.result)}
                      style={{
                        flex: getResultButtons().length === 2 && btn.result === 'error' ? 2 : 1,
                        padding: '16px',
                        fontSize: '16px',
                        fontWeight: '700',
                        border: `3px solid ${btn.color}`,
                        background: btn.color,
                        color: 'white',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.opacity = '0.85';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.opacity = '1';
                      }}
                    >
                      {btn.label}
                    </button>
                  ))}
                  <p style={{ fontSize: '11px', color: '#999', textAlign: 'center', marginTop: 'auto' }}>
                    💡 Press Space for "In Play"
                  </p>
                </div>

                {/* Right: Hit Zone Grid (3x3) - Only show for attacks */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#666' }}>
                    🎯 Hit Zone
                  </h3>
                  {actionType === 'attack' ? (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gridTemplateRows: 'repeat(3, 1fr)',
                      gap: '8px',
                      flex: 1
                    }}>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((zone) => {
                        const row = Math.floor((zone - 1) / 3);
                        const col = (zone - 1) % 3;
                        const isSelected = trajectoryAnalysis.gridCell.row === row && trajectoryAnalysis.gridCell.col === col;

                        return (
                          <button
                            key={zone}
                            style={{
                              padding: '12px',
                              fontSize: '18px',
                              fontWeight: '700',
                              background: isSelected ? '#7c3aed' : '#f3f4f6',
                              color: isSelected ? 'white' : '#666',
                              border: isSelected ? '3px solid #5b21b6' : '2px solid #d1d5db',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.background = '#e5e7eb';
                              }
                            }}
                            onMouseOut={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.background = '#f3f4f6';
                              }
                            }}
                          >
                            {zone}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#f9fafb',
                      borderRadius: '8px',
                      color: '#999',
                      fontSize: '14px',
                      border: '2px dashed #d1d5db'
                    }}>
                      Hit zones available for attacks only
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#999'
              }}>
                <p style={{ fontSize: '16px', marginBottom: '8px' }}>Draw a trajectory to see result buttons</p>
                <p style={{ fontSize: '12px' }}>Select a player and draw on the court</p>
              </div>
            )}
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

      {/* Debug Info Modal */}
      {showDebugInfo && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowDebugInfo(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '700px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#333' }}>
                Debug Information
              </h3>
              <button
                onClick={() => setShowDebugInfo(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '2px solid #d1d5db',
                  background: '#f3f4f6',
                  color: '#666',
                  fontSize: '18px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ fontSize: '14px', color: '#666' }}>
              {/* Grid Layout for top section */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                marginBottom: '16px',
                paddingBottom: '16px',
                borderBottom: '2px solid #e5e7eb'
              }}>
                {/* Point/Attempt Info */}
                <div>
                  <p style={{ fontWeight: '700', color: '#333', marginBottom: '8px' }}>Point & Phase</p>
                  <p><strong>Point:</strong> #{pointNumber}</p>
                  <p><strong>Attempt:</strong> #{attemptNumber}</p>
                  <p><strong>Phase:</strong> {isServePhase ? 'SERVE' : 'RALLY'}</p>
                </div>

                {/* Player Info */}
                {selectedPlayer ? (
                  <div>
                    <p style={{ fontWeight: '700', color: '#333', marginBottom: '8px' }}>Selected Player</p>
                    <p><strong>Player:</strong> #{selectedPlayer.jerseyNumber} {selectedPlayer.playerName}</p>
                    <p><strong>Position:</strong> {selectedPlayer.position}</p>
                    <p><strong>Team:</strong> {selectedTeam === 'home' ? 'Home' : 'Opponent'}</p>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontWeight: '700', color: '#333', marginBottom: '8px' }}>Selected Player</p>
                    <p style={{ color: '#999' }}>No player selected</p>
                  </div>
                )}
              </div>

              {/* Trajectory Analysis */}
              {trajectoryAnalysis && currentTrajectory && (
                <>
                  <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '2px solid #e5e7eb' }}>
                    <p style={{ fontWeight: '700', color: '#333', marginBottom: '8px' }}>Bounds Check</p>
                    <p><strong>Start:</strong> {trajectoryAnalysis.startInBounds ? '✅ In bounds' : '❌ Out of bounds'}</p>
                    <p><strong>Landing:</strong> {trajectoryAnalysis.endInBounds ? '✅ In bounds' : '❌ Out of bounds'}</p>
                  </div>

                  <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '2px solid #e5e7eb' }}>
                    <p style={{ fontWeight: '700', color: '#333', marginBottom: '8px' }}>Trajectory Metrics</p>
                    <p><strong>Distance:</strong> {Math.round(trajectoryAnalysis.distance)}px</p>
                    <p><strong>Speed:</strong> {trajectoryAnalysis.speed.toUpperCase()}</p>
                    <p><strong>Landing Area:</strong> {trajectoryAnalysis.landingArea} court</p>
                  </div>

                  {actionType === 'serve' && trajectoryAnalysis.serveZone && (
                    <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '2px solid #e5e7eb' }}>
                      <p style={{ fontWeight: '700', color: '#333', marginBottom: '8px' }}>Serve Info</p>
                      <p><strong>Serve Zone:</strong> {trajectoryAnalysis.serveZone}</p>
                    </div>
                  )}

                  {actionType === 'attack' && trajectoryAnalysis.hitPosition && (
                    <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '2px solid #e5e7eb' }}>
                      <p style={{ fontWeight: '700', color: '#333', marginBottom: '8px' }}>Attack Info</p>
                      <p><strong>Hit Position:</strong> {trajectoryAnalysis.hitPosition}</p>
                    </div>
                  )}

                  <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '2px solid #e5e7eb' }}>
                    <p style={{ fontWeight: '700', color: '#333', marginBottom: '8px' }}>Grid Cell</p>
                    <p><strong>Location:</strong> Row {trajectoryAnalysis.gridCell.row + 1}, Col {trajectoryAnalysis.gridCell.col + 1}</p>
                  </div>

                  <div>
                    <p style={{ fontWeight: '700', color: '#333', marginBottom: '8px' }}>Raw Coordinates</p>
                    <p><strong>Start:</strong> ({Math.round(currentTrajectory.startX)}, {Math.round(currentTrajectory.startY)})</p>
                    <p><strong>End:</strong> ({Math.round(currentTrajectory.endX)}, {Math.round(currentTrajectory.endY)})</p>
                    <p><strong>Start X%:</strong> {Math.round((currentTrajectory.startX - 40) / 340 * 100)}%</p>
                  </div>
                </>
              )}

              {!trajectoryAnalysis && !currentTrajectory && (
                <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                  Draw a trajectory to see debug information
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Export main component directly (OpponentTrackingProvider temporarily disabled)
 */
export default VisualTrackingPageContent;
