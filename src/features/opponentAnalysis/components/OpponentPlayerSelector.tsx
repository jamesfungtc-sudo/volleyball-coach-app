import React, { useState } from 'react';
import './OpponentPlayerSelector.css';

/**
 * OpponentPlayerSelector - Select opponent player for event entry
 * Allows quick entry of player names or selection from recent players
 */

export interface OpponentPlayer {
  id: string;
  name: string;
}

interface OpponentPlayerSelectorProps {
  recentPlayers: OpponentPlayer[];
  selectedPlayerId: string | null;
  onPlayerSelect: (player: OpponentPlayer) => void;
}

export const OpponentPlayerSelector: React.FC<OpponentPlayerSelectorProps> = ({
  recentPlayers,
  selectedPlayerId,
  onPlayerSelect
}) => {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');

  const handleQuickAdd = () => {
    if (newPlayerName.trim()) {
      const newPlayer: OpponentPlayer = {
        id: `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: newPlayerName.trim()
      };
      onPlayerSelect(newPlayer);
      setNewPlayerName('');
      setIsAddingNew(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleQuickAdd();
    } else if (e.key === 'Escape') {
      setIsAddingNew(false);
      setNewPlayerName('');
    }
  };

  return (
    <div className="opponent-player-selector">
      <div className="selector-header">
        <h4>Select Opponent Player</h4>
        {selectedPlayerId && (
          <button
            className="clear-selection-btn"
            onClick={() => onPlayerSelect({ id: '', name: '' })}
            title="Clear selection"
          >
            ✕
          </button>
        )}
      </div>

      {/* Recent/Existing Players */}
      {recentPlayers.length > 0 && (
        <div className="recent-players">
          <div className="player-chips">
            {recentPlayers.map(player => (
              <button
                key={player.id}
                className={`player-chip ${selectedPlayerId === player.id ? 'selected' : ''}`}
                onClick={() => onPlayerSelect(player)}
              >
                {player.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add New Player */}
      <div className="add-player-section">
        {!isAddingNew ? (
          <button
            className="add-player-btn"
            onClick={() => setIsAddingNew(true)}
          >
            + Add Player
          </button>
        ) : (
          <div className="add-player-form">
            <input
              type="text"
              className="player-name-input"
              placeholder="Enter player name or #"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              onKeyDown={handleKeyPress}
              autoFocus
            />
            <div className="form-actions">
              <button
                className="btn-confirm"
                onClick={handleQuickAdd}
                disabled={!newPlayerName.trim()}
              >
                Add
              </button>
              <button
                className="btn-cancel"
                onClick={() => {
                  setIsAddingNew(false);
                  setNewPlayerName('');
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Selected Player Display */}
      {selectedPlayerId && (
        <div className="selected-player-display">
          <span className="selected-label">Selected:</span>
          <span className="selected-name">
            {recentPlayers.find(p => p.id === selectedPlayerId)?.name || 'Unknown'}
          </span>
        </div>
      )}
    </div>
  );
};
