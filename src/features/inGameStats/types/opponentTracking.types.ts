/**
 * Opponent Tracking Type Definitions
 * Used for recording opponent serve and attack patterns during matches
 */

// ============== CORE TYPES ==============

/**
 * Hitting position on volleyball court
 * P1, Pipe = Back row attacks
 * P2, P3, P4 = Front row attacks
 */
export type HitPosition = 'P1' | 'Pipe' | 'P2' | 'P3' | 'P4';

/**
 * Result of opponent action
 * - 'in_play': Rally continued after this action
 * - 'kill': Point ended, opponent won via attack
 * - 'ace': Point ended, opponent won via serve
 * - 'error': Opponent made an error (ball out, net violation, etc.)
 */
export type OpponentAttemptResult = 'in_play' | 'kill' | 'ace' | 'error';

/**
 * Type of opponent action
 */
export type OpponentAttemptType = 'serve' | 'attack' | 'block' | 'dig';

/**
 * Volleyball position (P1-P6)
 */
export type VolleyballPosition = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6';

/**
 * Speed classification for trajectory
 */
export type TrajectorySpeed = 'short' | 'medium' | 'long';

/**
 * Court area (front or back court)
 */
export type CourtArea = 'front' | 'back';

// ============== INTERFACES ==============

/**
 * Trajectory data from visual drawing
 */
export interface TrajectoryData {
  // Coordinates (SVG viewBox: 420×800)
  startX: number;
  startY: number;
  endX: number;
  endY: number;

  // Bounds validation
  startInBounds: boolean;
  endInBounds: boolean;

  // Calculated metrics
  distance: number;           // Pixel distance
  angle: number;              // Degrees (0-360)
  speed: TrajectorySpeed;     // 'short' | 'medium' | 'long'

  // Court analysis
  landingArea: CourtArea;     // 'front' | 'back'
}

/**
 * Single opponent action (serve or attack) during a point
 * HYBRID MODEL: Combines OLD approach (discrete data) with NEW approach (trajectory)
 */
export interface OpponentAttempt {
  // Metadata
  attempt_number: number;        // 1, 2, 3... within this point
  type: OpponentAttemptType;     // 'serve' | 'attack' | 'block' | 'dig'

  // Player information (required)
  player_id: string;             // Player ID (e.g., "opp_12")
  player_name: string;           // Display name (e.g., "#12 Katie")
  player_jersey: number;         // Jersey number
  player_position?: VolleyballPosition;  // Court position when action occurred (P1-P6)

  // Serve-specific fields (when type === 'serve')
  serve_position?: number;       // 0-4 (zone index: 0=left, 4=right)

  // Attack-specific fields (when type === 'attack')
  hit_position?: HitPosition;    // 'P1' | 'Pipe' | 'P2' | 'P3' | 'P4' | 'P5'

  // Landing location (discrete grid for OLD approach compatibility)
  landing_grid_x: number;        // 0-5 (x-coordinate on home court)
  landing_grid_y: number;        // 0-5 (y-coordinate on home court)

  // Trajectory data (NEW approach - optional for backwards compatibility)
  trajectory?: TrajectoryData;   // Full trajectory with coordinates and metrics

  // Result
  result: OpponentAttemptResult; // 'in_play' | 'kill' | 'ace' | 'error'

  // Timestamp
  timestamp: number;             // Unix timestamp (ms)
}

/**
 * Current state of team lineup (6 positions)
 * Maps position (P1-P6) to player ID
 */
export interface TeamLineup {
  P1: string | null;  // Right back (serving position in rotation 1)
  P2: string | null;  // Right front (opposite)
  P3: string | null;  // Middle front (middle blocker)
  P4: string | null;  // Left front (outside hitter)
  P5: string | null;  // Left back
  P6: string | null;  // Middle back (setter position in most rotations)
}

/**
 * Rotation state for both teams
 */
export interface RotationState {
  homeLineup: TeamLineup;
  opponentLineup: TeamLineup;
  homeServerPosition: VolleyballPosition | null;    // Which position is serving (P1-P6)
  opponentServerPosition: VolleyballPosition | null;
}

/**
 * Backwards compatibility alias
 */
export type OpponentLineup = TeamLineup;

/**
 * Player with role information (for smart lineup tracking)
 */
export interface OpponentPlayer {
  id: string;
  name: string;         // Display name (e.g., "#7")
  number: string;       // Jersey number
  role?: PlayerRole;    // Position type (optional for now)
}

/**
 * Volleyball position roles
 */
export type PlayerRole = 'OH' | 'MB' | 'S' | 'Opp' | 'L';
// OH = Outside Hitter
// MB = Middle Blocker
// S = Setter
// Opp = Opposite
// L = Libero

/**
 * Team roster with role assignments
 */
export interface OpponentRoster {
  outsideHitters: OpponentPlayer[];   // 2 players
  middleBlockers: OpponentPlayer[];   // 2 players
  setter: OpponentPlayer | null;      // 1 player
  opposite: OpponentPlayer | null;    // 1 player
  libero: OpponentPlayer | null;      // 1 player
  allPlayers: OpponentPlayer[];       // Full roster
}

/**
 * Component state for opponent tracking module
 * EXTENDED for visual tracking integration
 */
export interface OpponentTrackingState {
  // Current input selections (visual tracking)
  selectedPlayer: OpponentPlayer | null;          // Currently selected player
  selectedTeam: 'home' | 'opponent' | null;       // Which team player belongs to
  selectedActionType: OpponentAttemptType;        // 'attack' | 'serve' | 'block' | 'dig'
  currentTrajectory: TrajectoryData | null;       // Current drawn trajectory

  // OLD approach selections (for backwards compatibility)
  selectedServePosition: number | null;           // 0-4
  selectedServePlayer: OpponentPlayer | null;
  selectedHitPosition: HitPosition | null;
  selectedHitPlayer: OpponentPlayer | null;
  selectedGridCell: { x: number; y: number } | null;

  // Lock states
  serveDropdownsLocked: boolean;                  // True after first serve recorded
  firstServerLocked: boolean;                     // True after first server selected in point
  firstServerPlayerId: string | null;             // ID of locked first server

  // Attempt storage (immediate save)
  savedAttempts: OpponentAttempt[];               // Saved attempts for current point

  // Undo/Redo system (circular buffer, last 20)
  undoStack: OpponentAttempt[];                   // Stack for undo (max 20)
  redoStack: OpponentAttempt[];                   // Stack for redo

  // Rotation tracking (both teams)
  rotation: RotationState;                        // Current rotation for both teams

  // Metadata
  currentAttemptNumber: number;                   // Counter for next attempt
  isDrawing: boolean;                             // True while user is drawing trajectory
}

/**
 * Grid cell data (for heatmap/visualization)
 */
export interface GridCellData {
  x: number;
  y: number;
  count: number;        // Number of times ball landed here
  attempts: OpponentAttempt[];  // All attempts that landed in this cell
}

// ============== HELPER TYPES ==============

/**
 * Props for grid cell component
 */
export interface GridCellProps {
  x: number;
  y: number;
  isSelected: boolean;
  count?: number;
  onClick: (x: number, y: number) => void;
  disabled?: boolean;
}

/**
 * Props for lineup position cell
 */
export interface LineupCellProps {
  position: keyof OpponentLineup;  // 'P1' | 'P2' | ... | 'P6'
  player: string | null;
  isHighlighted: boolean;
  onClick?: (position: keyof OpponentLineup) => void;
}
