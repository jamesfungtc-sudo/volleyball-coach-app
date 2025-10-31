import React from 'react';
import { OpponentLineup } from '../../types/opponentTracking.types';
import { HitPosition } from '../../types/opponentTracking.types';

interface LineupSheetProps {
  lineup: OpponentLineup;
  highlightedPosition?: HitPosition | null;
  onPositionClick?: (position: keyof OpponentLineup) => void;
  disabled?: boolean;
}

export const LineupSheet: React.FC<LineupSheetProps> = ({
  lineup,
  highlightedPosition = null,
  onPositionClick,
  disabled = false
}) => {
  const frontRow: Array<keyof OpponentLineup> = ['P4', 'P3', 'P2'];
  const backRow: Array<keyof OpponentLineup> = ['P5', 'P6', 'P1'];

  const handleClick = (position: keyof OpponentLineup) => {
    if (!disabled && onPositionClick) {
      onPositionClick(position);
    }
  };

  const renderPosition = (position: keyof OpponentLineup) => {
    const isHighlighted = highlightedPosition === position;
    const player = lineup[position];

    return (
      <div
        key={position}
        className={`lineup-position ${isHighlighted ? 'highlighted' : ''} ${
          disabled ? 'disabled' : ''
        } ${player ? 'has-player' : 'empty'}`}
        onClick={() => handleClick(position)}
        role={onPositionClick ? 'button' : undefined}
        tabIndex={onPositionClick && !disabled ? 0 : undefined}
      >
        <div className="position-label">{position}</div>
        <div className="player-number">
          {player || '—'}
        </div>
      </div>
    );
  };

  return (
    <div className="lineup-sheet">
      <div className="lineup-label">Opponent Lineup</div>
      <div className="lineup-rows">
        <div className="lineup-row front-row">
          <div className="row-label">Front</div>
          <div className="positions">
            {frontRow.map(pos => renderPosition(pos))}
          </div>
        </div>
        <div className="lineup-row back-row">
          <div className="row-label">Back</div>
          <div className="positions">
            {backRow.map(pos => renderPosition(pos))}
          </div>
        </div>
      </div>
      <div className="net-indicator">
        <div className="net-line"></div>
        <span className="net-label">NET</span>
      </div>
    </div>
  );
};
