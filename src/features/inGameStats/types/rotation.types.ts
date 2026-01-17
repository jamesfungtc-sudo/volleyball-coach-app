/**
 * Rotation Tracking Type Definitions
 * Used for tracking volleyball rotations in Visual Tracking page
 */

import type { VolleyballPosition } from './opponentTracking.types';
import type { PlayerReference } from '../../../types/playerReference.types';
import { getPlayerId, getJerseyNumber, getPlayerDisplayName } from '../../../types/playerReference.types';

// ============== CORE ROTATION TYPES ==============

/**
 * Volleyball system type
 */
export type VolleyballSystem = '5-1 (OH>S)' | '5-1 (MB>S)' | '6-2' | '4-2';

/**
 * Player role in rotation system
 */
export type PlayerRole =
  | 'S'           // Setter
  | 'OH'          // Outside Hitter
  | 'OH (w.s)'    // Outside Hitter (weak side)
  | 'MB'          // Middle Blocker
  | 'MB (w.s)'    // Middle Blocker (weak side)
  | 'Oppo'        // Opposite
  | 'L'           // Libero
  | 'S1/OPP1'     // Setter/Opposite 1 (6-2 system)
  | 'S2/OPP2'     // Setter/Opposite 2 (6-2 system)
  | 'MB1'         // Middle Blocker 1 (6-2 system)
  | 'MB2'         // Middle Blocker 2 (6-2 system)
  | 'OH1'         // Outside Hitter 1 (6-2 system)
  | 'OH2';        // Outside Hitter 2 (6-2 system)

/**
 * Formation type
 */
export type FormationType = 'serving' | 'rally';

// ============== PLAYER AND LINEUP TYPES ==============

/**
 * Extended player data with rotation info
 * UPDATED: Uses PlayerReference as primary field for type safety
 */
export interface PlayerInPosition {
  reference: PlayerReference;                    // NEW: Primary field with full type safety
  position: VolleyballPosition;
  roleInSystem?: PlayerRole;        // Player's role in rotation system
  isLibero?: boolean;                // Quick check for libero
  originalRole?: PlayerRole;         // For libero substitution tracking

  // Deprecated fields (keep for backward compatibility)
  /** @deprecated Use reference.playerId via getPlayerId() */
  playerId?: string;
  /** @deprecated Use reference.jerseyNumber via getJerseyNumber() */
  jerseyNumber?: string | number;
  /** @deprecated Use reference.displayName via getPlayerDisplayName() */
  playerName?: string;
}

/**
 * Team lineup with all 6 positions
 */
export interface TeamLineup {
  P1: PlayerInPosition | null;
  P2: PlayerInPosition | null;
  P3: PlayerInPosition | null;
  P4: PlayerInPosition | null;
  P5: PlayerInPosition | null;
  P6: PlayerInPosition | null;
}

// ============== CONFIGURATION TYPES ==============

/**
 * Team rotation configuration (set-specific)
 * UPDATED: Uses PlayerReference instead of ambiguous strings
 */
export interface TeamRotationConfig {
  system: VolleyballSystem;
  players: Record<PlayerRole, PlayerReference>;  // Role → PlayerReference mapping (FIXED!)
  startingP1: PlayerRole;                        // Which role starts in P1
  libero: PlayerReference | null;                // Libero player reference (FIXED!)
  liberoReplacementTargets: PlayerRole[];        // Which roles does libero replace? (e.g., ['MB', 'MB (w.s)'])
  currentRotation: number;                       // 1-6
}

/**
 * Rotation state for match
 */
export interface RotationState {
  // Current set
  currentSet: number;  // 1-5

  // Team configurations (per set)
  homeConfig: TeamRotationConfig;
  opponentConfig: TeamRotationConfig;

  // Current lineups (live state)
  homeLineup: TeamLineup;
  opponentLineup: TeamLineup;

  // Serving state
  servingTeam: 'home' | 'opponent';

  // Formation toggle
  formationType: FormationType;

  // Configuration per set (stored)
  setConfigurations: {
    [setNumber: number]: {
      home: TeamRotationConfig;
      opponent: TeamRotationConfig;
    };
  };
}

/**
 * Rotation history entry (for undo)
 */
export interface RotationHistoryEntry {
  timestamp: number;
  pointNumber: number;
  action: 'auto_rotate' | 'manual_rotate' | 'manual_adjust';
  previousState: {
    homeLineup: TeamLineup;
    opponentLineup: TeamLineup;
    homeRotation: number;
    opponentRotation: number;
    servingTeam: 'home' | 'opponent';
  };
  newState: {
    homeLineup: TeamLineup;
    opponentLineup: TeamLineup;
    homeRotation: number;
    opponentRotation: number;
    servingTeam: 'home' | 'opponent';
  };
}

// ============== LIBERO SUBSTITUTION ==============

/**
 * Libero substitution record
 */
export interface LiberoSubstitution {
  position: VolleyballPosition;
  liberoPlayer: PlayerInPosition;
  replacedPlayer: PlayerInPosition;
  timestamp: number;
}

// ============== SET CONFIGURATION STORAGE ==============

/**
 * Per-set configuration storage (localStorage)
 */
export interface SetConfigurationStorage {
  matchId: string;
  setConfigurations: {
    [setNumber: number]: {
      home: TeamRotationConfig;
      opponent: TeamRotationConfig;
      startingServer: 'home' | 'opponent';
      configuredAt: number; // timestamp
    };
  };
}

// ============== ROTATION UPDATE ==============

/**
 * Rotation update result
 */
export interface RotationUpdate {
  servingTeam: 'home' | 'opponent';
  homeLineup: TeamLineup;
  opponentLineup: TeamLineup;
  rotationChanged: boolean;
  newHomeRotation: number;      // New rotation number for home team (1-6)
  newOpponentRotation: number;  // New rotation number for opponent team (1-6)
}

// ============== HELPER FUNCTIONS ==============

/**
 * Create PlayerInPosition from PlayerReference
 * Handles both new (reference-based) and deprecated fields for backward compatibility
 */
export function createPlayerInPosition(
  reference: PlayerReference,
  position: VolleyballPosition,
  roleInSystem?: PlayerRole
): PlayerInPosition {
  return {
    reference,
    position,
    roleInSystem,
    isLibero: roleInSystem === 'L',
    // Backward compatibility - populate deprecated fields
    playerId: getPlayerId(reference),
    jerseyNumber: getJerseyNumber(reference),
    playerName: getPlayerDisplayName(reference)
  };
}
