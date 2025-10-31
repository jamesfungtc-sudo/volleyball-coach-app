import React, { useEffect } from 'react';
import { useOpponentTracking } from '../../context/OpponentTrackingContext';
import { ServeLocationSelector } from './ServeLocationSelector';
import { HittingPositionSelector } from './HittingPositionSelector';
import { LandingGrid } from './LandingGrid';
import { LineupSheet } from './LineupSheet';
import { InPlayButton } from './InPlayButton';
import { OpponentPlayer, HitPosition } from '../../types/opponentTracking.types';
import './OpponentTracking.css';

interface OpponentTrackingModuleProps {
  opponentPlayers: OpponentPlayer[];
  disabled?: boolean;
  onAttemptsChange?: (attempts: any[]) => void;
}

export const OpponentTrackingModule: React.FC<OpponentTrackingModuleProps> = ({
  opponentPlayers,
  disabled = false,
  onAttemptsChange
}) => {
  const {
    state,
    setServePosition,
    setHitPosition,
    setGridCell,
    saveAttempt,
    canSaveAttempt,
    getCurrentAttemptType
  } = useOpponentTracking();

  // Notify parent component when attempts change
  useEffect(() => {
    if (onAttemptsChange) {
      onAttemptsChange(state.attemptQueue);
    }
  }, [state.attemptQueue, onAttemptsChange]);

  // Handle serve position selection
  const handleServeSelect = (position: number, player: OpponentPlayer) => {
    setServePosition(position, player);
  };

  // Handle hit position selection
  const handleHitSelect = (position: HitPosition) => {
    // For now, just set the position without player
    // Phase 7 will add smart lineup tracking
    setHitPosition(position, null);
  };

  // Handle grid cell selection
  const handleGridCellClick = (x: number, y: number) => {
    setGridCell(x, y);
  };

  // Handle in-play button click
  const handleInPlayClick = () => {
    if (canSaveAttempt()) {
      saveAttempt('in_play');
    }
  };

  // Calculate if button should be disabled
  const isInPlayDisabled = !canSaveAttempt() || disabled;

  return (
    <div className="opponent-tracking-module">
      {/* Header */}
      <div className="opponent-tracking-header">
        <h3 className="opponent-tracking-title">
          Opponent Tracking
          {state.attemptQueue.length > 0 && (
            <span className="attempt-count"> ({state.attemptQueue.length})</span>
          )}
        </h3>
      </div>

      {/* Main Grid Layout */}
      <div className="opponent-tracking-grid">

        {/* LEFT COLUMN: Serve/Hit Selectors + Lineup Sheet */}
        <div className="left-column">
          {/* Serve Location Selector */}
          <div className="selector-section">
            <div className="serve-section-label">Serve Location</div>
            <ServeLocationSelector
              players={opponentPlayers}
              selectedPosition={state.selectedServePosition}
              selectedPlayer={state.selectedServePlayer}
              onSelect={handleServeSelect}
              disabled={state.serveDropdownsLocked || disabled}
            />
          </div>

          {/* Hitting Position Selector */}
          <div className="selector-section">
            <div className="hitting-section-label">Hit Position</div>
            <HittingPositionSelector
              selectedPosition={state.selectedHitPosition}
              onSelect={handleHitSelect}
              disabled={disabled}
            />
          </div>

          {/* Lineup Sheet */}
          <LineupSheet
            lineup={state.currentLineup}
            highlightedPosition={state.selectedHitPosition}
            disabled={disabled}
          />
        </div>

        {/* CENTER COLUMN: Landing Grid */}
        <div className="center-column">
          <LandingGrid
            selectedCell={state.selectedGridCell}
            onCellClick={handleGridCellClick}
            previousAttempts={state.attemptQueue}
            disabled={disabled}
          />
        </div>

        {/* RIGHT COLUMN: In-Play Button + Instructions */}
        <div className="right-column">
          <InPlayButton
            onClick={handleInPlayClick}
            disabled={isInPlayDisabled}
            attemptCount={state.attemptQueue.length}
          />

          {/* Current Selection Display */}
          <div className="selection-display">
            <div className="selection-item">
              <span className="selection-label">Type:</span>
              <span className="selection-value">
                {getCurrentAttemptType() || '—'}
              </span>
            </div>

            {state.selectedServePosition !== null && (
              <div className="selection-item">
                <span className="selection-label">Serve:</span>
                <span className="selection-value">
                  Zone {state.selectedServePosition}
                  {state.selectedServePlayer && ` • ${state.selectedServePlayer.name}`}
                </span>
              </div>
            )}

            {state.selectedHitPosition && (
              <div className="selection-item">
                <span className="selection-label">Hit:</span>
                <span className="selection-value">
                  {state.selectedHitPosition}
                  {state.selectedHitPlayer && ` • ${state.selectedHitPlayer.name}`}
                </span>
              </div>
            )}

            {state.selectedGridCell && (
              <div className="selection-item">
                <span className="selection-label">Landing:</span>
                <span className="selection-value">
                  ({state.selectedGridCell.x}, {state.selectedGridCell.y})
                </span>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="instructions">
            <div className="instruction-title">Quick Guide:</div>
            <ol className="instruction-list">
              <li>Select serve position OR hit position</li>
              <li>Click landing zone on grid</li>
              <li>Click "In Play" for non-terminal attempts</li>
              <li>For kills/aces, submit point directly</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Serve Lock Indicator */}
      {state.serveDropdownsLocked && (
        <div className="serve-lock-notice">
          🔒 Serve recorded for this point. Only attacks can be tracked now.
        </div>
      )}
    </div>
  );
};
