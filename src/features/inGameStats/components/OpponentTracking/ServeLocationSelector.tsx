import React from 'react';
import { OpponentPlayer } from '../../types/opponentTracking.types';

interface ServeLocationSelectorProps {
  players: OpponentPlayer[];          // All opponent players
  selectedPosition: number | null;    // 0-4
  selectedPlayer: OpponentPlayer | null;
  onSelect: (position: number, player: OpponentPlayer) => void;
  disabled: boolean;                  // True when locked after serve recorded
}

export const ServeLocationSelector: React.FC<ServeLocationSelectorProps> = ({
  players,
  selectedPosition,
  selectedPlayer,
  onSelect,
  disabled
}) => {
  const positions = [0, 1, 2, 3, 4];
  const labels = ['Left', 'Left-Center', 'Center', 'Right-Center', 'Right'];

  return (
    <div className="serve-location-selector">
      <div className="serve-dropdowns">
        {positions.map((pos) => (
          <select
            key={pos}
            className={`serve-dropdown ${disabled ? 'disabled' : ''} ${
              selectedPosition === pos ? 'selected' : ''
            }`}
            value={selectedPosition === pos && selectedPlayer ? selectedPlayer.id : ''}
            onChange={(e) => {
              const player = players.find(p => p.id === e.target.value);
              if (player) onSelect(pos, player);
            }}
            disabled={disabled}
            title={labels[pos]}
          >
            <option value="">
              {disabled ? '🔒 Ser.' : `Ser.`}
            </option>
            {players.map(player => (
              <option key={player.id} value={player.id}>
                {player.name}
              </option>
            ))}
          </select>
        ))}
      </div>
    </div>
  );
};
