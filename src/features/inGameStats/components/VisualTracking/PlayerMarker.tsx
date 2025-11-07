import React from 'react';
import './PlayerMarker.css';

export interface PlayerMarkerProps {
  // Player data
  playerId: string;
  jerseyNumber: string | number;
  playerName?: string;
  team: 'home' | 'opponent';

  // Position
  x: number;
  y: number;

  // Visual state
  isSelected?: boolean;
  isFaded?: boolean;

  // Interaction
  onClick?: (playerId: string) => void;
}

/**
 * PlayerMarker - Circle with jersey number for player positioning
 *
 * Visual states:
 * - Default: White circle with black text
 * - Hover: Blue border
 * - Selected: Blue fill with white text
 * - Faded: 30% opacity (when another player selected)
 */
export function PlayerMarker({
  playerId,
  jerseyNumber,
  playerName,
  team,
  x,
  y,
  isSelected = false,
  isFaded = false,
  onClick
}: PlayerMarkerProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering drawing events
    onClick?.(playerId);
  };

  const circleClasses = [
    'player-marker',
    team === 'home' ? 'player-marker-home' : 'player-marker-opponent',
    isSelected ? 'player-marker-selected' : '',
    isFaded ? 'player-marker-faded' : ''
  ].filter(Boolean).join(' ');

  return (
    <g
      className={circleClasses}
      transform={`translate(${x}, ${y})`}
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
    >
      {/* Circle */}
      <circle
        cx="0"
        cy="0"
        r="20"
        className="player-marker-circle"
      />

      {/* Jersey Number */}
      <text
        x="0"
        y="0"
        textAnchor="middle"
        dominantBaseline="central"
        className="player-marker-number"
        fontSize="14"
        fontWeight="600"
      >
        {jerseyNumber}
      </text>

      {/* Optional: Player name label (shown on hover) */}
      {playerName && (
        <title>{playerName}</title>
      )}
    </g>
  );
}
