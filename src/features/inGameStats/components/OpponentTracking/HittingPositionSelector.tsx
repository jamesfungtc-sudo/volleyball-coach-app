import React from 'react';
import { HitPosition } from '../../types/opponentTracking.types';

interface HittingPositionSelectorProps {
  selectedPosition: HitPosition | null;
  onSelect: (position: HitPosition) => void;
  disabled?: boolean;
}

export const HittingPositionSelector: React.FC<HittingPositionSelectorProps> = ({
  selectedPosition,
  onSelect,
  disabled = false
}) => {
  const backRowPositions: HitPosition[] = ['P1', 'Pipe'];
  const frontRowPositions: HitPosition[] = ['P2', 'P3', 'P4'];

  return (
    <div className="hitting-position-selector">
      <div className="hit-row back-row">
        {backRowPositions.map(pos => (
          <button
            key={pos}
            className={`hit-button ${selectedPosition === pos ? 'selected' : ''}`}
            onClick={() => onSelect(pos)}
            disabled={disabled}
          >
            {pos}
          </button>
        ))}
      </div>
      <div className="hit-row front-row">
        {frontRowPositions.map(pos => (
          <button
            key={pos}
            className={`hit-button ${selectedPosition === pos ? 'selected' : ''}`}
            onClick={() => onSelect(pos)}
            disabled={disabled}
          >
            {pos}
          </button>
        ))}
      </div>
    </div>
  );
};
