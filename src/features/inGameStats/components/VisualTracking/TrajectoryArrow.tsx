import React from 'react';

interface TrajectoryArrowProps {
  /** Start X coordinate (SVG viewBox coordinates) */
  startX: number;
  /** Start Y coordinate (SVG viewBox coordinates) */
  startY: number;
  /** End X coordinate (SVG viewBox coordinates) */
  endX: number;
  /** End Y coordinate (SVG viewBox coordinates) */
  endY: number;
  /** Whether start point is within court bounds */
  startInBounds: boolean;
  /** Whether end point is within court bounds */
  endInBounds: boolean;
  /** Whether this is a preview (currently drawing) or finalized arrow */
  isDragging?: boolean;
}

/**
 * TrajectoryArrow - Renders an arrow showing ball trajectory
 *
 * Features:
 * - Arrow with calculated arrowhead based on angle
 * - Color-coded start/end points (green = in bounds, red = out of bounds)
 * - Different colors for preview (red) vs finalized (blue) arrows
 *
 * Ported from prototype: CourtDrawing Protopype/src/CourtDrawing.jsx
 */
export const TrajectoryArrow: React.FC<TrajectoryArrowProps> = ({
  startX,
  startY,
  endX,
  endY,
  startInBounds,
  endInBounds,
  isDragging = false
}) => {
  // Calculate arrow head angle and points
  const angle = Math.atan2(endY - startY, endX - startX);
  const arrowLength = 15;

  // Calculate arrowhead triangle points (30 degree angle from main line)
  const arrowPoint1X = endX - arrowLength * Math.cos(angle - Math.PI / 6);
  const arrowPoint1Y = endY - arrowLength * Math.sin(angle - Math.PI / 6);
  const arrowPoint2X = endX - arrowLength * Math.cos(angle + Math.PI / 6);
  const arrowPoint2Y = endY - arrowLength * Math.sin(angle + Math.PI / 6);

  // Color scheme
  const arrowColor = isDragging ? "#ff6b6b" : "#2563eb"; // Red for preview, blue for final
  const startColor = startInBounds ? "#22c55e" : "#ef4444"; // Green if in, red if out
  const endColor = endInBounds ? "#22c55e" : "#ef4444";

  return (
    <g className={isDragging ? 'preview-arrow' : 'trajectory-arrow'}>
      {/* Main arrow line */}
      <line
        x1={startX}
        y1={startY}
        x2={endX}
        y2={endY}
        stroke={arrowColor}
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Arrow head (triangle) */}
      <polygon
        points={`${endX},${endY} ${arrowPoint1X},${arrowPoint1Y} ${arrowPoint2X},${arrowPoint2Y}`}
        fill={arrowColor}
      />

      {/* Start point indicator - color coded for in/out bounds */}
      <circle
        cx={startX}
        cy={startY}
        r="8"
        fill={startColor}
        opacity="0.9"
        stroke="white"
        strokeWidth="2"
      />

      {/* End point indicator - color coded for in/out bounds */}
      <circle
        cx={endX}
        cy={endY}
        r="8"
        fill={endColor}
        opacity="0.9"
        stroke="white"
        strokeWidth="2"
      />
    </g>
  );
};

export default TrajectoryArrow;
