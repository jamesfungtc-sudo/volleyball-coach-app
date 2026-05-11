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
 * Get SVG coordinates from a pointer event (mouse, touch, or stylus).
 *
 * Uses pointer events instead of separate mouse/touch events because:
 * - ✅ No 300 ms ghost-click after touchend in iOS PWA standalone mode
 * - ✅ setPointerCapture keeps tracking even when finger drifts outside SVG
 * - ✅ Handles all transformations automatically
 * - ✅ Works with any viewport size
 * - ✅ Accounts for preserveAspectRatio settings
 * - ✅ Most accurate method (avoids offset issues)
 *
 * @param event - Pointer event (covers mouse, touch, and stylus)
 * @param svgElement - SVG element reference
 * @returns Object with x, y coordinates in SVG viewBox space
 */
export const getCoordinates = (
  event: React.PointerEvent,
  svgElement: SVGSVGElement
): { x: number; y: number } => {
  // Use SVG's built-in transformation matrix (CRITICAL for accuracy)
  const pt = svgElement.createSVGPoint();
  pt.x = event.clientX;
  pt.y = event.clientY;

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
 * Clamp coordinates to stay within SVG viewBox bounds
 *
 * @param x - X coordinate in SVG viewBox coordinates
 * @param y - Y coordinate in SVG viewBox coordinates
 * @returns Clamped coordinates
 */
export const clampToViewBox = (x: number, y: number): { x: number; y: number } => {
  const { viewBoxWidth, viewBoxHeight } = COURT_DIMENSIONS;

  return {
    x: Math.max(0, Math.min(viewBoxWidth, x)),
    y: Math.max(0, Math.min(viewBoxHeight, y))
  };
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
