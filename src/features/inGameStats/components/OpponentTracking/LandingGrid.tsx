import React from 'react';
import { OpponentAttempt } from '../../types/opponentTracking.types';

interface LandingGridProps {
  selectedCell: { x: number; y: number } | null;
  onCellClick: (x: number, y: number) => void;
  previousAttempts?: OpponentAttempt[];  // For heatmap (optional)
  disabled?: boolean;
}

export const LandingGrid: React.FC<LandingGridProps> = ({
  selectedCell,
  onCellClick,
  previousAttempts = [],
  disabled = false
}) => {
  // Calculate cell counts for heatmap
  const getCellCount = (x: number, y: number): number => {
    return previousAttempts.filter(
      a => a.landing_grid_x === x && a.landing_grid_y === y
    ).length;
  };

  // Render grid from top (y=5, net) to bottom (y=0, baseline)
  const renderGrid = () => {
    const rows = [];
    for (let y = 5; y >= 0; y--) {
      const cells = [];
      for (let x = 0; x < 6; x++) {
        const count = getCellCount(x, y);
        const isSelected = selectedCell?.x === x && selectedCell?.y === y;

        cells.push(
          <button
            key={`${x}-${y}`}
            className={`grid-cell ${isSelected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
            onClick={() => !disabled && onCellClick(x, y)}
            disabled={disabled}
          >
            <span className="cell-coord">({x},{y})</span>
            {count > 0 && <span className="cell-count">{count}</span>}
          </button>
        );
      }
      rows.push(
        <div key={y} className="grid-row">
          {cells}
        </div>
      );
    }
    return rows;
  };

  return (
    <div className="landing-grid">
      <div className="grid-label top">← Net (Near) →</div>
      <div className="grid-container">{renderGrid()}</div>
      <div className="grid-label bottom">← Baseline (Far) →</div>
    </div>
  );
};
