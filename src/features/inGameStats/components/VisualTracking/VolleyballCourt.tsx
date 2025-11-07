import React from 'react';
import './VolleyballCourt.css';

/**
 * Court dimensions (SVG viewBox coordinates)
 *
 * Total viewBox: 420×800 (1:2 aspect ratio)
 * Playing surface: 360×720 (9m × 18m regulation court)
 * Out-of-bounds zones: 30px on all sides
 *
 * Critical measurements:
 * - Net at y=400 (center)
 * - Attack lines at y=280 (top, 3m from net) and y=520 (bottom, 3m from net)
 * - These attack lines are CRITICAL for determining front/back court
 */
export const COURT_DIMENSIONS = {
  viewBoxWidth: 420,
  viewBoxHeight: 800,

  // Playing surface boundaries
  courtLeft: 30,
  courtRight: 390,
  courtTop: 40,
  courtBottom: 760,
  courtWidth: 360,
  courtHeight: 720,

  // Court center (net position)
  netY: 400,

  // Attack lines (3 meters from net = 120px in our scale)
  // 720px court height / 18m = 40px per meter
  // 3m × 40px/m = 120px from net
  attackLineTop: 280,     // 400 - 120 = 280 (3m from net, opponent side)
  attackLineBottom: 520,  // 400 + 120 = 520 (3m from net, home side)

  // Out-of-bounds zones
  outOfBoundsMargin: 30
};

interface VolleyballCourtProps {
  /** Whether drawing is currently active */
  isDrawing?: boolean;
  /** Additional CSS class names */
  className?: string;
  /** Children to render on top of the court (e.g., player markers, trajectories) */
  children?: React.ReactNode;
  /** Which side to disable: 'home' | 'opponent' | null */
  disabledSide?: 'home' | 'opponent' | null;
  /** Mouse down event handler */
  onMouseDown?: (event: React.MouseEvent<SVGSVGElement>) => void;
  /** Mouse move event handler */
  onMouseMove?: (event: React.MouseEvent<SVGSVGElement>) => void;
  /** Mouse up event handler */
  onMouseUp?: (event: React.MouseEvent<SVGSVGElement>) => void;
  /** Mouse leave event handler */
  onMouseLeave?: (event: React.MouseEvent<SVGSVGElement>) => void;
  /** Touch start event handler */
  onTouchStart?: (event: React.TouchEvent<SVGSVGElement>) => void;
  /** Touch move event handler */
  onTouchMove?: (event: React.TouchEvent<SVGSVGElement>) => void;
  /** Touch end event handler */
  onTouchEnd?: (event: React.TouchEvent<SVGSVGElement>) => void;
  /** Ref to access the SVG element */
  svgRef?: React.RefObject<SVGSVGElement>;
}

/**
 * VolleyballCourt - SVG representation of a volleyball court
 *
 * Features:
 * - Accurate 9m × 18m court dimensions
 * - 3-meter attack lines for front/back court detection
 * - Out-of-bounds zones (light blue)
 * - Playing surface (orange/clay color)
 * - Net divider
 * - Team side labels
 */
export const VolleyballCourt: React.FC<VolleyballCourtProps> = ({
  isDrawing = false,
  className = '',
  children,
  disabledSide = null,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  svgRef
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
    attackLineBottom
  } = COURT_DIMENSIONS;

  return (
    <svg
      ref={svgRef}
      className={`volleyball-court ${className} ${isDrawing ? 'drawing-mode' : ''}`}
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      preserveAspectRatio="xMidYMid meet"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        width: '100%',
        height: '100%',
        maxHeight: '100%',
        cursor: isDrawing ? 'crosshair' : 'default'
      }}
    >
      {/* ========== OUT OF BOUNDS AREAS ========== */}

      {/* Top out-of-bounds */}
      <rect x="0" y="0" width={viewBoxWidth} height={courtTop} fill="#4a9fb8" />

      {/* Bottom out-of-bounds */}
      <rect x="0" y={courtBottom} width={viewBoxWidth} height={viewBoxHeight - courtBottom} fill="#4a9fb8" />

      {/* Left out-of-bounds */}
      <rect x="0" y={courtTop} width={courtLeft} height={courtHeight} fill="#4a9fb8" />

      {/* Right out-of-bounds */}
      <rect x={courtRight} y={courtTop} width={viewBoxWidth - courtRight} height={courtHeight} fill="#4a9fb8" />

      {/* ========== COURT PLAYING SURFACE ========== */}

      {/* Main court surface (orange/clay) */}
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

      {/* ========== COURT LINES ========== */}

      {/* Net (center line) - CRITICAL divider */}
      <line
        x1={courtLeft}
        y1={netY}
        x2={courtRight}
        y2={netY}
        stroke="white"
        strokeWidth="4"
      />

      {/* Attack line - TOP (3m from net) - CRITICAL for front/back court */}
      <line
        x1={courtLeft}
        y1={attackLineTop}
        x2={courtRight}
        y2={attackLineTop}
        stroke="white"
        strokeWidth="2"
        strokeDasharray="10,5"
      />

      {/* Attack line - BOTTOM (3m from net) - CRITICAL for front/back court */}
      <line
        x1={courtLeft}
        y1={attackLineBottom}
        x2={courtRight}
        y2={attackLineBottom}
        stroke="white"
        strokeWidth="2"
        strokeDasharray="10,5"
      />

      {/* ========== LABELS ========== */}

      {/* Opponent label at top baseline */}
      <text
        x={viewBoxWidth / 2}
        y={25}
        textAnchor="middle"
        fill="white"
        fontSize="20"
        fontWeight="bold"
        opacity="0.8"
      >
        OPPONENT
      </text>

      {/* Home label at bottom baseline */}
      <text
        x={viewBoxWidth / 2}
        y={785}
        textAnchor="middle"
        fill="white"
        fontSize="20"
        fontWeight="bold"
        opacity="0.8"
      >
        HOME
      </text>

      {/* Net visual indicator */}
      <g opacity="0.6">
        {/* Net posts */}
        <rect x={courtLeft - 5} y={netY - 2} width="5" height="4" fill="#333" />
        <rect x={courtRight} y={netY - 2} width="5" height="4" fill="#333" />

        {/* Net mesh pattern (simplified) */}
        <line
          x1={courtLeft}
          y1={netY}
          x2={courtRight}
          y2={netY}
          stroke="#333"
          strokeWidth="1"
          strokeDasharray="2,2"
        />
      </g>

      {/* ========== DISABLED SIDE OVERLAY ========== */}
      {disabledSide && (
        <g>
          {/* Dim the disabled side with a semi-transparent overlay */}
          <rect
            x={courtLeft}
            y={disabledSide === 'opponent' ? courtTop : netY}
            width={courtWidth}
            height={disabledSide === 'opponent' ? (netY - courtTop) : (courtBottom - netY)}
            fill="rgba(0, 0, 0, 0.5)"
            pointerEvents="none"
          />

          {/* Add a "Not Available" message */}
          <text
            x={viewBoxWidth / 2}
            y={disabledSide === 'opponent' ? (courtTop + (netY - courtTop) / 2) : (netY + (courtBottom - netY) / 2)}
            textAnchor="middle"
            fill="white"
            fontSize="24"
            fontWeight="bold"
            opacity="0.9"
            pointerEvents="none"
          >
            {disabledSide === 'opponent' ? 'OPPONENT SIDE' : 'HOME SIDE'}
          </text>
          <text
            x={viewBoxWidth / 2}
            y={disabledSide === 'opponent' ? (courtTop + (netY - courtTop) / 2 + 30) : (netY + (courtBottom - netY) / 2 + 30)}
            textAnchor="middle"
            fill="white"
            fontSize="16"
            opacity="0.8"
            pointerEvents="none"
          >
            Cannot draw here
          </text>
        </g>
      )}

      {/* ========== CHILDREN (Player markers, trajectories, etc.) ========== */}
      {children}
    </svg>
  );
};

export default VolleyballCourt;
