import { COURT_DIMENSIONS } from './VolleyballCourt';

/**
 * Trajectory data structure
 */
export interface Trajectory {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  startInBounds: boolean;
  endInBounds: boolean;
}

/**
 * Check if a point is within the court playing surface bounds
 *
 * @param x - X coordinate in SVG viewBox coordinates
 * @param y - Y coordinate in SVG viewBox coordinates
 * @returns true if point is within court bounds
 */
export const isInBounds = (x: number, y: number): boolean => {
  const { courtLeft, courtRight, courtTop, courtBottom } = COURT_DIMENSIONS;

  return (
    x >= courtLeft &&
    x <= courtRight &&
    y >= courtTop &&
    y <= courtBottom
  );
};

/**
 * Get SVG coordinates from mouse/touch event
 *
 * Converts screen coordinates to SVG viewBox coordinates using SVG's built-in transformation matrix.
 * This is the CORRECT method from the prototype documentation.
 *
 * Why this approach:
 * - ✅ Handles all transformations automatically
 * - ✅ Works with any viewport size
 * - ✅ Accounts for preserveAspectRatio settings
 * - ✅ Most accurate method (avoids offset issues)
 *
 * Ported from prototype: CourtDrawing Protopype/src/CourtDrawing.jsx (lines 832-846)
 *
 * @param event - Mouse or touch event
 * @param svgElement - SVG element reference
 * @returns Object with x, y coordinates in SVG viewBox space
 */
export const getCoordinates = (
  event: React.MouseEvent | React.TouchEvent,
  svgElement: SVGSVGElement
): { x: number; y: number } => {
  // Handle both touch and mouse events
  let clientX: number;
  let clientY: number;

  if ('touches' in event) {
    // Touch event
    if (event.touches.length > 0) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      // Fallback for touch end events
      return { x: 0, y: 0 };
    }
  } else {
    // Mouse event
    clientX = event.clientX;
    clientY = event.clientY;
  }

  // Use SVG's built-in transformation matrix (CRITICAL for accuracy)
  const pt = svgElement.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;

  // Transform screen coordinates to SVG viewBox coordinates
  const screenCTM = svgElement.getScreenCTM();
  if (!screenCTM) {
    // Fallback if matrix is not available
    return { x: 0, y: 0 };
  }

  const svgP = pt.matrixTransform(screenCTM.inverse());

  return { x: svgP.x, y: svgP.y };
};

/**
 * Calculate distance between two points
 *
 * @param x1 - First point X
 * @param y1 - First point Y
 * @param x2 - Second point X
 * @param y2 - Second point Y
 * @returns Distance in pixels
 */
export const calculateDistance = (
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number => {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};
