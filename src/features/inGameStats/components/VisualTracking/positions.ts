import { COURT_DIMENSIONS } from './VolleyballCourt';
import type {
  PlayerInPosition,
  TeamLineup
} from '../../types/rotation.types';
import type { VolleyballPosition } from '../../types/opponentTracking.types';

/**
 * Volleyball rotation positions on court
 *
 * Standard volleyball positions (looking from above):
 * - P4 (Position 4): Front-left
 * - P3 (Position 3): Front-center
 * - P2 (Position 2): Front-right
 * - P5 (Position 5): Back-left
 * - P6 (Position 6): Back-center
 * - P1 (Position 1): Back-right
 *
 * Coordinates are in SVG viewBox units (420×800)
 */

// Re-export types for backwards compatibility
export type { PlayerInPosition, TeamLineup, VolleyballPosition };

export interface PositionCoordinates {
  x: number;
  y: number;
}

export interface TeamPositions {
  P1: PositionCoordinates;
  P2: PositionCoordinates;
  P3: PositionCoordinates;
  P4: PositionCoordinates;
  P5: PositionCoordinates;
  P6: PositionCoordinates;
}

const { courtLeft, courtRight, courtTop, courtBottom, netY, attackLineTop, attackLineBottom } = COURT_DIMENSIONS;

// Calculate thirds of court width for left/center/right positioning
const courtWidth = courtRight - courtLeft;
const leftX = courtLeft + courtWidth * 0.2;   // 20% from left
const centerX = courtLeft + courtWidth * 0.5;  // Center
const rightX = courtLeft + courtWidth * 0.8;   // 20% from right

/**
 * Opponent positions (top half of court)
 * Net is at y=400, opponent plays from top
 * Court scale: 720px / 18m = 40px per meter
 * - Front row: 2m from net (80px)
 * - Back row: 6m from net (240px) - on the 6-meter line
 *
 * IMPORTANT: Opponent faces opposite direction, so left/right are FLIPPED from viewer's perspective
 * Layout (viewing from above, viewer's perspective):
 *   P1(right)  P6(center)  P5(left)    <- Back row
 *   P2(right)  P3(center)  P4(left)    <- Front row
 *   ========== NET ==========
 */
export const OPPONENT_POSITIONS: TeamPositions = {
  // Front row (between net and attack line)
  // Opponent's P4 (their left) appears on viewer's RIGHT, so use rightX
  // Opponent's P2 (their right) appears on viewer's LEFT, so use leftX
  P4: { x: rightX, y: netY - 80 },     // Front-left (from opponent's view) = viewer's RIGHT
  P3: { x: centerX, y: netY - 80 },    // Front-center (2m from net)
  P2: { x: leftX, y: netY - 80 },      // Front-right (from opponent's view) = viewer's LEFT

  // Back row (on the 6-meter line)
  // Opponent's P5 (their left) appears on viewer's RIGHT
  // Opponent's P1 (their right) appears on viewer's LEFT
  P5: { x: rightX, y: netY - 240 },    // Back-left (from opponent's view) = viewer's RIGHT
  P6: { x: centerX, y: netY - 240 },   // Back-center (6m from net)
  P1: { x: leftX, y: netY - 240 }      // Back-right (from opponent's view) = viewer's LEFT
};

/**
 * Home positions (bottom half of court)
 * Net is at y=400, home plays from bottom
 * Court scale: 720px / 18m = 40px per meter
 * - Front row: 2m from net (80px)
 * - Back row: 6m from net (240px) - on the 6-meter line
 *
 * Layout (viewing from above):
 *   ========== NET ==========
 *   P4(left)   P3(center)  P2(right)   <- Front row
 *   P5(left)   P6(center)  P1(right)   <- Back row
 */
export const HOME_POSITIONS: TeamPositions = {
  // Front row (between net and attack line)
  P4: { x: leftX, y: netY + 80 },      // Front-left (2m from net)
  P3: { x: centerX, y: netY + 80 },    // Front-center (2m from net)
  P2: { x: rightX, y: netY + 80 },     // Front-right (2m from net)

  // Back row (on the 6-meter line)
  P5: { x: leftX, y: netY + 240 },     // Back-left (6m from net)
  P6: { x: centerX, y: netY + 240 },   // Back-center (6m from net)
  P1: { x: rightX, y: netY + 240 }     // Back-right (6m from net)
};

/**
 * Get position coordinates for a team
 */
export function getPositionCoordinates(
  team: 'home' | 'opponent',
  position: VolleyballPosition
): PositionCoordinates {
  const positions = team === 'home' ? HOME_POSITIONS : OPPONENT_POSITIONS;
  return positions[position];
}

// PlayerInPosition and TeamLineup now imported from rotation.types.ts
// (see imports at top of file)

/**
 * Rotate lineup clockwise (after side-out)
 * P1→P2→P3→P4→P5→P6→P1
 */
export function rotateClockwise(lineup: TeamLineup): TeamLineup {
  return {
    P1: lineup.P6,
    P2: lineup.P1,
    P3: lineup.P2,
    P4: lineup.P3,
    P5: lineup.P4,
    P6: lineup.P5
  };
}

/**
 * Get all players in a lineup as array
 */
export function getPlayersArray(lineup: TeamLineup): PlayerInPosition[] {
  return Object.entries(lineup)
    .filter(([_, player]) => player !== null)
    .map(([position, player]) => ({
      ...player!,
      position: position as VolleyballPosition
    }));
}
