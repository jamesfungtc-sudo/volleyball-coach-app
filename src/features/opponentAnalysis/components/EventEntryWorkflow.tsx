import React, { useState, useEffect } from 'react';
import { EventResult } from '../types';
import { CourtGrid } from './CourtGrid';
import { OpponentPlayerSelector, OpponentPlayer } from './OpponentPlayerSelector';
import { useOpponentAnalysis } from '../context/OpponentAnalysisContext';
import './EventEntryWorkflow.css';

/**
 * EventEntryWorkflow - Complete workflow for entering opponent events
 * Steps: 1) Select player 2) Click court location 3) Select result
 */

export const EventEntryWorkflow: React.FC = () => {
  const {
    state,
    setSelectedPlayer,
    addEvent,
    getCurrentEvents
  } = useOpponentAnalysis();

  const [recentPlayers, setRecentPlayers] = useState<OpponentPlayer[]>([]);
  const [pendingLocation, setPendingLocation] = useState<{ x: number; y: number } | null>(null);
  const [currentPlayerName, setCurrentPlayerName] = useState<string>('');

  // Extract unique players from events
  useEffect(() => {
    const currentEvents = getCurrentEvents();
    const uniquePlayers = new Map<string, OpponentPlayer>();
    currentEvents.forEach(event => {
      if (!uniquePlayers.has(event.player_id)) {
        uniquePlayers.set(event.player_id, {
          id: event.player_id,
          name: event.player_name
        });
      }
    });
    setRecentPlayers(Array.from(uniquePlayers.values()));
  }, [state.events, state.selectedSet, state.selectedEventType, getCurrentEvents]);

  // Update current player name when selection changes
  useEffect(() => {
    if (state.selectedPlayerId) {
      const player = recentPlayers.find(p => p.id === state.selectedPlayerId);
      if (player) {
        setCurrentPlayerName(player.name);
      }
    } else {
      setCurrentPlayerName('');
    }
  }, [state.selectedPlayerId, recentPlayers]);

  const handlePlayerSelect = (player: OpponentPlayer) => {
    setSelectedPlayer(player.id || null);
    setCurrentPlayerName(player.name);
    setPendingLocation(null);
  };

  const handleCellClick = (gridX: number, gridY: number) => {
    if (!state.selectedPlayerId || !currentPlayerName) {
      alert('Please select a player first');
      return;
    }
    setPendingLocation({ x: gridX, y: gridY });
  };

  const handleResultSelect = (result: EventResult) => {
    if (!pendingLocation || !state.selectedPlayerId || !currentPlayerName) {
      return;
    }

    addEvent(
      state.selectedPlayerId,
      currentPlayerName,
      pendingLocation.x,
      pendingLocation.y,
      result
    );

    // Reset pending location, keep player selected (sticky)
    setPendingLocation(null);
  };

  const handleCancelLocation = () => {
    setPendingLocation(null);
  };

  const currentEvents = getCurrentEvents();

  return (
    <div className="event-entry-workflow">
      {/* Player Selection */}
      <div className="workflow-step">
        <OpponentPlayerSelector
          recentPlayers={recentPlayers}
          selectedPlayerId={state.selectedPlayerId}
          onPlayerSelect={handlePlayerSelect}
        />
      </div>

      {/* Court Location */}
      <div className="workflow-step">
        <CourtGrid
          events={currentEvents}
          onCellClick={handleCellClick}
          disabled={!state.selectedPlayerId}
          showHeatmap={!pendingLocation}
        />
      </div>

      {/* Result Selection (appears after location clicked) */}
      {pendingLocation && (
        <div className="workflow-step result-step">
          <div className="result-selection">
            <h4 className="result-title">
              {currentPlayerName} • ({pendingLocation.x}, {pendingLocation.y})
            </h4>
            <div className="result-buttons">
              <button
                className="result-btn result-kill"
                onClick={() => handleResultSelect('kill')}
              >
                ✓ Kill
              </button>
              <button
                className="result-btn result-in-play"
                onClick={() => handleResultSelect('in_play')}
              >
                → In Play
              </button>
              <button
                className="result-btn result-error"
                onClick={() => handleResultSelect('error')}
              >
                ✗ Error
              </button>
            </div>
            <button
              className="cancel-btn"
              onClick={handleCancelLocation}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
