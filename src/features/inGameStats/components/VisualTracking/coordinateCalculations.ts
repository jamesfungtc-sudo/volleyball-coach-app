import { COURT_DIMENSIONS } from './VolleyballCourt';

/**
 * coordinateCalculations.ts
 *
 * Coordinate-based logic for analyzing trajectories and player actions.
 * Provides intelligence for serve zones, hit positions, court areas, etc.
 */

const { courtLeft, courtRight, courtTop, courtBottom, netY, attackLineTop, attackLineBottom } = COURT_DIMENSIONS;

// ========== SERVE ZONE CALCULATOR ==========

/**
 * Serve zones divide the court width into 5 equal sections
 * Zone 1 (leftmost) to Zone 5 (rightmost)
 */
export type ServeZone = 1 | 2 | 3 | 4 | 5;

/**
 * Calculate which serve zone a coordinate falls into
 * Divides court width into 5 equal zones
 *
 * @param x - X coordinate in SVG viewBox units
 * @returns Serve zone number (1-5)
 */
export function calculateServeZone(x: number): ServeZone {
  const courtWidth = courtRight - courtLeft;
  const zoneWidth = courtWidth / 5;

  // Clamp x to court bounds
  const clampedX = Math.max(courtLeft, Math.min(courtRight, x));

  // Calculate zone (1-5)
  const relativeX = clampedX - courtLeft;
  const zone = Math.floor(relativeX / zoneWidth) + 1;

  // Ensure zone is between 1-5
  return Math.max(1, Math.min(5, zone)) as ServeZone;
}

// ========== HIT POSITION CALCULATOR ==========

/**
 * Hit positions in volleyball attack (relative to attacking team's perspective)
 *
 * Volleyball position layout (viewing from above):
 *   P1(right)  P6(center)  P5(left)    <- Back row
 *   P2(right)  P3(center)  P4(left)    <- Front row
 *   ========== NET ==========
 *
 * Attack positions (based on court location + front/back row):
 * - P4/Outside: Left side FRONT row attack
 * - P5: Left side BACK row attack
 * - P3/Middle: Center FRONT row attack
 * - Pipe: Center BACK row attack (P6 area)
 * - P2: Right side FRONT row attack
 * - P1/Pin: Right side BACK row attack
 */
export type HitPosition = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'Pipe';

/**
 * Calculate hit position based on trajectory START point (where attack originates)
 * Uses x-coordinate for lateral position and y-coordinate to detect back row (Pipe)
 *
 * Court X-axis mapping (both teams):
 * - Left (leftX ~20%): P4/P5 positions
 * - Center (centerX ~50%): P3/P6 positions
 * - Right (rightX ~80%): P2/P1 positions
 *
 * @param x - X coordinate of attack origin (START point)
 * @param y - Y coordinate of attack origin (START point)
 * @param team - Which team is attacking ('home' or 'opponent')
 * @returns Hit position label
 */
export function calculateHitPosition(x: number, y: number, team: 'home' | 'opponent'): HitPosition {
  const courtWidth = courtRight - courtLeft;

  // Check if back row attack
  // For opponent: y < attackLineTop (280) means further from net (back row)
  // For home: y > attackLineBottom (520) means further from net (back row)
  const isBackRow = team === 'opponent' ? y < attackLineTop : y > attackLineBottom;

  // Calculate X position (left to right: 0-1)
  const relativeX = x - courtLeft;
  let percentage = relativeX / courtWidth;

  // CRITICAL: Invert X-axis for opponent side
  // Opponent team faces opposite direction, so their left/right is inverted
  // Determine court side based on Y-coordinate (net is at y=400)
  const isOpponentSide = y < netY;  // Top half = opponent side

  if (isOpponentSide) {
    // Invert percentage for opponent side
    // Physical left (low %) becomes their RIGHT, physical right (high %) becomes their LEFT
    percentage = 1 - percentage;
  }

  // If back row attack near center (P6 position area), it's a Pipe
  // Center is at 50%, allow 25% margin (37.5% - 62.5%)
  if (isBackRow && percentage >= 0.375 && percentage <= 0.625) {
    return 'Pipe';
  }

  // Front row or back row non-center attacks
  // After inversion, both teams use identical logical mapping:
  // - Left (0-33%): P4 (front) / P5 (back)
  // - Center (33-67%): P3 (front) / P6 (back, returned as Pipe above)
  // - Right (67-100%): P2 (front) / P1 (back)

  if (percentage < 0.33) {
    // Left third: P4/P5 area (Outside/Left)
    // P4 is FRONT-left, P5 is BACK-left
    // Must check front/back row to distinguish P4 from P5
    if (isBackRow) {
      return 'P5';  // Back-left (position 5)
    } else {
      return 'P4';  // Front-left (position 4)
    }
  } else if (percentage < 0.67) {
    // Middle third: P3/P6 area (Middle/Center)
    // If back row here, already returned Pipe above
    return 'P3';
  } else {
    // Right third: P2/P1 area
    // P2 is FRONT-right, P1 is BACK-right
    // Must check front/back row to distinguish P2 from P1
    if (isBackRow) {
      return 'P1';  // Back-right (position 1)
    } else {
      return 'P2';  // Front-right (position 2)
    }
  }
}

// ========== COURT AREA DETECTOR ==========

/**
 * Detect if coordinate is in front court or back court
 * Front court = between net and 3-meter line
 * Back court = between 3-meter line and baseline
 */
export type CourtArea = 'front' | 'back';

/**
 * Determine if coordinate is in front or back court
 *
 * @param y - Y coordinate in SVG viewBox units
 * @param team - Which team's court to check ('home' or 'opponent')
 * @returns 'front' or 'back'
 */
export function getCourtArea(y: number, team: 'home' | 'opponent'): CourtArea {
  if (team === 'opponent') {
    // Opponent court: front = between net and attack line
    return y >= attackLineTop && y <= netY ? 'front' : 'back';
  } else {
    // Home court: front = between net and attack line
    return y >= netY && y <= attackLineBottom ? 'front' : 'back';
  }
}

// ========== GRID CELL CALCULATOR ==========

/**
 * Grid cell for heatmap visualization
 * Divides court into grid for statistical analysis
 */
export interface GridCell {
  row: number;    // Row index (0-based)
  col: number;    // Column index (0-based)
  x: number;      // Center X coordinate
  y: number;      // Center Y coordinate
}

/**
 * Calculate which grid cell a coordinate falls into
 * Useful for heatmaps and statistical aggregation
 *
 * @param x - X coordinate in SVG viewBox units
 * @param y - Y coordinate in SVG viewBox units
 * @param rows - Number of rows to divide court into (default 6)
 * @param cols - Number of columns to divide court into (default 6)
 * @returns Grid cell information
 */
export function getGridCell(x: number, y: number, rows: number = 6, cols: number = 6): GridCell {
  const courtWidth = courtRight - courtLeft;
  const courtHeight = courtBottom - courtTop;

  const cellWidth = courtWidth / cols;
  const cellHeight = courtHeight / rows;

  // Calculate row and column (0-based)
  const col = Math.floor((x - courtLeft) / cellWidth);
  const row = Math.floor((y - courtTop) / cellHeight);

  // Clamp to valid range
  const clampedCol = Math.max(0, Math.min(cols - 1, col));
  const clampedRow = Math.max(0, Math.min(rows - 1, row));

  // Calculate cell center coordinates
  const centerX = courtLeft + (clampedCol + 0.5) * cellWidth;
  const centerY = courtTop + (clampedRow + 0.5) * cellHeight;

  return {
    row: clampedRow,
    col: clampedCol,
    x: centerX,
    y: centerY
  };
}

// ========== DISTANCE & TRAJECTORY METRICS ==========

/**
 * Calculate trajectory distance in pixels
 */
export function getTrajectoryDistance(startX: number, startY: number, endX: number, endY: number): number {
  const dx = endX - startX;
  const dy = endY - startY;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate trajectory angle in degrees
 * 0° = right, 90° = down, 180° = left, 270° = up
 */
export function getTrajectoryAngle(startX: number, startY: number, endX: number, endY: number): number {
  const dx = endX - startX;
  const dy = endY - startY;
  const radians = Math.atan2(dy, dx);
  const degrees = radians * (180 / Math.PI);
  return degrees;
}

/**
 * Calculate trajectory speed category based on distance
 * Short: < 100px
 * Medium: 100-200px
 * Long: > 200px
 */
export type TrajectorySpeed = 'short' | 'medium' | 'long';

export function getTrajectorySpeed(distance: number): TrajectorySpeed {
  if (distance < 100) return 'short';
  if (distance < 200) return 'medium';
  return 'long';
}

// ========== LANDING ZONE ANALYSIS ==========

/**
 * Analyze where a trajectory lands
 * Combines multiple metrics for comprehensive analysis
 */
export interface TrajectoryAnalysis {
  // Basic metrics
  distance: number;
  angle: number;
  speed: TrajectorySpeed;

  // Spatial analysis
  startInBounds: boolean;
  endInBounds: boolean;
  landingArea: CourtArea;

  // For serves
  serveZone?: ServeZone;

  // For attacks
  hitPosition?: HitPosition;

  // Grid position
  gridCell: GridCell;
}

/**
 * Perform comprehensive trajectory analysis
 *
 * @param startX - Start X coordinate
 * @param startY - Start Y coordinate
 * @param endX - End X coordinate
 * @param endY - End Y coordinate
 * @param team - Which team performed the action
 * @param actionType - Type of action ('serve' | 'attack' | 'block' | 'dig')
 * @returns Complete trajectory analysis
 */
export function analyzeTrajectory(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  team: 'home' | 'opponent',
  actionType: 'serve' | 'attack' | 'block' | 'dig',
  startInBounds: boolean,
  endInBounds: boolean
): TrajectoryAnalysis {
  const distance = getTrajectoryDistance(startX, startY, endX, endY);
  const angle = getTrajectoryAngle(startX, startY, endX, endY);
  const speed = getTrajectorySpeed(distance);

  // Landing area (based on endpoint)
  const landingArea = getCourtArea(endY, team === 'home' ? 'opponent' : 'home'); // Opposite team's court

  // Grid cell
  const gridCell = getGridCell(endX, endY);

  // Calculate serve zone if action is serve (based on landing point)
  const serveZone = actionType === 'serve' ? calculateServeZone(endX) : undefined;

  // Calculate hit position if action is attack (based on starting point - where attack originates)
  const hitPosition = actionType === 'attack' ? calculateHitPosition(startX, startY, team) : undefined;

  return {
    distance,
    angle,
    speed,
    startInBounds,
    endInBounds,
    landingArea,
    serveZone,
    hitPosition,
    gridCell
  };
}
