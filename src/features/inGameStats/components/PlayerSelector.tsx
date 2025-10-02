import React from 'react';
import type { PlayerData } from '../../../types/inGameStats.types';
import './PlayerSelector.css';

interface PlayerSelectorProps {
  players: PlayerData[];
  value: string | null;
  onChange: (playerId: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  teamType?: 'home' | 'opponent';
}

/**
 * PlayerSelector - Player selection dropdown with jersey numbers
 * Filters and displays players based on the current context
 */
export function PlayerSelector({
  players,
  value,
  onChange,
  placeholder = 'Select Player',
  required = true,
  disabled = false,
  error,
  teamType
}: PlayerSelectorProps) {
  return (
    <div className="player-selector">
      <label htmlFor="player-select" className="player-label">
        Player
        {required && <span className="required-indicator">*</span>}
        {teamType && <span className="team-indicator">({teamType})</span>}
      </label>
      <select
        id="player-select"
        className={`player-select ${error ? 'error' : ''}`}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || players.length === 0}
        required={required}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {players.map((player) => (
          <option key={player.id} value={player.id}>
            #{player.jersey_number} {player.name}
            {player.position && ` - ${player.position}`}
          </option>
        ))}
      </select>
      {error && <span className="error-message">{error}</span>}
      {players.length === 0 && !disabled && (
        <span className="warning-message">No players available</span>
      )}
    </div>
  );
}
