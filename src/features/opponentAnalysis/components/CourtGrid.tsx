import React from 'react';
import { LocationEvent } from '../types';
import './CourtGrid.css';

/**
 * CourtGrid - 6×6 grid representing one side of volleyball court
 * Grid coordinates: (0,0) is bottom-left, (5,5) is top-right
 * Y-axis: 0=near (our side), 5=far (opponent back line)
 * X-axis: 0=left, 5=right (from our perspective looking at opponent)
 */

interface CourtGridProps {
  events: LocationEvent[];
  onCellClick: (gridX: number, gridY: number) => void;
  disabled?: boolean;
  showHeatmap?: boolean;
}

export const CourtGrid: React.FC<CourtGridProps> = ({
  events,
  onCellClick,
  disabled = false,
  showHeatmap = true
}) => {
  // Calculate cell counts for heatmap
  const getCellCount = (x: number, y: number): number => {
    return events.filter(e => e.grid_x === x && e.grid_y === y).length;
  };

  // Get max count for normalization
  const maxCount = Math.max(
    ...Array.from({ length: 36 }, (_, i) => {
      const x = i % 6;
      const y = Math.floor(i / 6);
      return getCellCount(x, y);
    }),
    1 // Avoid division by zero
  );

  // Get heatmap intensity (0-1) for cell
  const getHeatmapIntensity = (x: number, y: number): number => {
    if (!showHeatmap || maxCount === 0) return 0;
    return getCellCount(x, y) / maxCount;
  };

  // Get cell background color based on intensity
  const getCellStyle = (x: number, y: number): React.CSSProperties => {
    const intensity = getHeatmapIntensity(x, y);
    if (intensity === 0) {
      return {};
    }
    // Blue gradient: lighter to darker based on intensity
    const alpha = 0.2 + intensity * 0.6; // Range: 0.2 to 0.8
    return {
      backgroundColor: `rgba(59, 130, 246, ${alpha})`,
      fontWeight: 600
    };
  };

  // Render grid from top to bottom (y=5 to y=0)
  // This makes y=5 appear at top (opponent back line) and y=0 at bottom (near side)
  const renderGrid = () => {
    const rows = [];
    for (let y = 5; y >= 0; y--) {
      const cells = [];
      for (let x = 0; x < 6; x++) {
        const count = getCellCount(x, y);
        const cellStyle = getCellStyle(x, y);

        cells.push(
          <button
            key={`${x}-${y}`}
            className={`court-cell ${disabled ? 'disabled' : ''}`}
            style={cellStyle}
            onClick={() => !disabled && onCellClick(x, y)}
            disabled={disabled}
            aria-label={`Court position ${x}, ${y}${count > 0 ? ` - ${count} events` : ''}`}
          >
            <span className="cell-coord">
              {x},{y}
            </span>
            {count > 0 && (
              <span className="cell-count">{count}</span>
            )}
          </button>
        );
      }
      rows.push(
        <div key={y} className="court-row">
          {cells}
        </div>
      );
    }
    return rows;
  };

  return (
    <div className="court-grid-container">
      {/* Court labels */}
      <div className="court-labels">
        <div className="label-top">← Opponent Back Line (Far) →</div>
      </div>

      {/* Grid */}
      <div className="court-grid">
        {renderGrid()}
      </div>

      {/* Bottom labels */}
      <div className="court-labels">
        <div className="label-bottom">← Net (Near) →</div>
      </div>
    </div>
  );
};
