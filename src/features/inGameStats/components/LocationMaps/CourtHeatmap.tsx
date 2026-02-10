import React from 'react';
import type { StoredTrajectory } from '../../services/trajectoryStorage';

/**
 * Court dimensions (same as VolleyballCourt for consistency)
 */
const COURT = {
  viewBoxWidth: 420,
  viewBoxHeight: 800,
  courtLeft: 30,
  courtRight: 390,
  courtTop: 40,
  courtBottom: 760,
  courtWidth: 360,
  courtHeight: 720,
  netY: 400,
  attackLineTop: 280,
  attackLineBottom: 520,
};

/**
 * Get color based on result
 * - Blue = In Play
 * - Red = Kill / Ace
 * - Gray = Error
 */
function getResultColor(result: StoredTrajectory['result']): string {
  switch (result) {
    case 'in_play':
      return '#3b82f6'; // Blue
    case 'kill':
    case 'ace':
      return '#ef4444'; // Red
    case 'error':
      return '#9ca3af'; // Gray
    default:
      return '#3b82f6';
  }
}

interface CourtHeatmapProps {
  /** Trajectories to display */
  trajectories: StoredTrajectory[];
  /** Type of action being displayed */
  actionType: 'serve' | 'attack';
  /** Title displayed above the court */
  title?: string;
  /** Optional width override */
  width?: number;
  /** Optional height override */
  height?: number;
}

/**
 * CourtHeatmap - A simplified volleyball court SVG showing trajectory lines
 *
 * Features:
 * - Correct 9m x 18m ratio (1:2 aspect)
 * - Net line at center
 * - Attack lines (3m from net)
 * - Colored lines showing trajectory from start to end point
 * - Arrow heads indicating direction
 * - Color coding: Blue=In Play, Red=Kill/Ace, Gray=Error
 */
export const CourtHeatmap: React.FC<CourtHeatmapProps> = ({
  trajectories,
  actionType,
  title,
  width,
  height,
}) => {
  const {
    viewBoxWidth,
    viewBoxHeight,
    courtLeft,
    courtRight,
    courtTop,
    courtBottom,
    courtWidth,
    courtHeight,
    netY,
    attackLineTop,
    attackLineBottom,
  } = COURT;

  // Calculate sizes based on number of trajectories
  const strokeWidth = trajectories.length > 20 ? 3 : trajectories.length > 10 ? 4 : 5;
  const arrowSize = trajectories.length > 20 ? 8 : trajectories.length > 10 ? 10 : 12;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {title && (
        <div style={{
          fontSize: '12px',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '4px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          {title}
        </div>
      )}

      <svg
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        preserveAspectRatio="xMidYMid meet"
        style={{
          width: width || '100%',
          height: height || 'auto',
          maxWidth: '150px',
          aspectRatio: '420 / 800',
          border: '1px solid #e5e7eb',
          borderRadius: '4px',
          background: '#f9fafb',
        }}
      >
        {/* Court background */}
        <rect
          x={courtLeft}
          y={courtTop}
          width={courtWidth}
          height={courtHeight}
          fill="#d4956c"
        />

        {/* Court outline */}
        <rect
          x={courtLeft}
          y={courtTop}
          width={courtWidth}
          height={courtHeight}
          fill="none"
          stroke="white"
          strokeWidth="3"
        />

        {/* Net line (center) - thicker and more visible */}
        <line
          x1={courtLeft}
          y1={netY}
          x2={courtRight}
          y2={netY}
          stroke="white"
          strokeWidth="6"
        />

        {/* Net label */}
        <text
          x={viewBoxWidth / 2}
          y={netY - 10}
          textAnchor="middle"
          fill="white"
          fontSize="16"
          fontWeight="bold"
          opacity="0.9"
        >
          NET
        </text>

        {/* Attack line - TOP (3m from net) */}
        <line
          x1={courtLeft}
          y1={attackLineTop}
          x2={courtRight}
          y2={attackLineTop}
          stroke="white"
          strokeWidth="2"
          strokeDasharray="8,4"
          opacity="0.7"
        />

        {/* Attack line - BOTTOM (3m from net) */}
        <line
          x1={courtLeft}
          y1={attackLineBottom}
          x2={courtRight}
          y2={attackLineBottom}
          stroke="white"
          strokeWidth="2"
          strokeDasharray="8,4"
          opacity="0.7"
        />

        {/* Trajectory lines with arrows */}
        {trajectories.map((t, index) => {
          const color = getResultColor(t.result);
          // Calculate arrow head points
          const dx = t.endX - t.startX;
          const dy = t.endY - t.startY;
          const length = Math.sqrt(dx * dx + dy * dy);
          // Normalize direction
          const nx = dx / length;
          const ny = dy / length;
          // Perpendicular for arrow wings
          const px = -ny;
          const py = nx;
          // Arrow head points
          const arrowTip = { x: t.endX, y: t.endY };
          const arrowLeft = {
            x: t.endX - nx * arrowSize - px * arrowSize * 0.5,
            y: t.endY - ny * arrowSize - py * arrowSize * 0.5,
          };
          const arrowRight = {
            x: t.endX - nx * arrowSize + px * arrowSize * 0.5,
            y: t.endY - ny * arrowSize + py * arrowSize * 0.5,
          };

          return (
            <g key={t.id || index}>
              {/* Line from start to end */}
              <line
                x1={t.startX}
                y1={t.startY}
                x2={t.endX}
                y2={t.endY}
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                opacity="0.85"
              />
              {/* Arrow head */}
              <polygon
                points={`${arrowTip.x},${arrowTip.y} ${arrowLeft.x},${arrowLeft.y} ${arrowRight.x},${arrowRight.y}`}
                fill={color}
                opacity="0.85"
              />
              {/* Small circle at start point */}
              <circle
                cx={t.startX}
                cy={t.startY}
                r={strokeWidth}
                fill={color}
                opacity="0.6"
              />
            </g>
          );
        })}

        {/* Empty state message */}
        {trajectories.length === 0 && (
          <text
            x={viewBoxWidth / 2}
            y={viewBoxHeight / 2}
            textAnchor="middle"
            fill="#9ca3af"
            fontSize="20"
          >
            No data
          </text>
        )}
      </svg>
    </div>
  );
};

export default CourtHeatmap;
