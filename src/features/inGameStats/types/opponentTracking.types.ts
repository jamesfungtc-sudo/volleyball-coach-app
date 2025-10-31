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
 */
export type OpponentAttemptResult = 'in_play' | 'kill' | 'ace';

/**
 * Type of opponent action
 */
export type OpponentAttemptType = 'serve' | 'attack';

// ============== INTERFACES ==============

/**
 * Single opponent action (serve or attack) during a point
 */
export interface OpponentAttempt {
  // Metadata
  attempt_number: number;        // 1, 2, 3... within this point
  type: OpponentAttemptType;     // 'serve' | 'attack'

  // Serve-specific fields (when type === 'serve')
  serve_position?: number;       // 0-4 (dropdown index: 0=left, 4=right)
  serve_player_id?: string;      // Player ID (e.g., "opp_12")
  serve_player_name?: string;    // Display name (e.g., "#12")

  // Attack-specific fields (when type === 'attack')
  hit_position?: HitPosition;    // 'P1' | 'Pipe' | 'P2' | 'P3' | 'P4'
  hit_player_id?: string;        // Player ID
  hit_player_name?: string;      // Display name

  // Landing location (required for both types)
  landing_grid_x: number;        // 0-5 (x-coordinate on home court)
  landing_grid_y: number;        // 0-5 (y-coordinate on home court)

  // Result
  result: OpponentAttemptResult; // 'in_play' | 'kill' | 'ace'

  // Timestamp
  timestamp: number;             // Unix timestamp (ms)
}

/**
 * Current state of opponent lineup (6 positions)
 */
export interface OpponentLineup {
  P1: string | null;  // Right back (serving position in rotation 1)
  P2: string | null;  // Right front (opposite)
  P3: string | null;  // Middle front (middle blocker)
  P4: string | null;  // Left front (outside hitter)
  P5: string | null;  // Left back
  P6: string | null;  // Middle back (setter position in most rotations)
}

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
 */
export interface OpponentTrackingState {
  // Current input selections
  selectedServePosition: number | null;     // 0-4
  selectedServePlayer: OpponentPlayer | null;
  selectedHitPosition: HitPosition | null;
  selectedHitPlayer: OpponentPlayer | null;
  selectedGridCell: { x: number; y: number } | null;

  // Lock states
  serveDropdownsLocked: boolean;    // True after first serve recorded

  // Temporary storage (not yet submitted to PointData)
  attemptQueue: OpponentAttempt[];  // In-memory queue for current point

  // Lineup tracking
  currentLineup: OpponentLineup;    // Current 6 positions

  // Metadata
  currentAttemptNumber: number;     // Counter for next attempt
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
