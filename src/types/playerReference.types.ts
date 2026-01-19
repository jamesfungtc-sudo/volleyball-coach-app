/**
 * Player Reference Type System
 * Resolves player identification ambiguity with discriminated union types
 */

import type { Player } from '../services/googleSheetsAPI';

// ============== CORE TYPES ==============

/**
 * Discriminated union for explicit player identification
 * - RosterPlayerReference: Player from team roster (guaranteed full data)
 * - CustomPlayerReference: Quick entry fallback (jersey number only)
 */
export type PlayerReference =
  | RosterPlayerReference
  | CustomPlayerReference;

/**
 * Player from roster (guaranteed full data)
 */
export interface RosterPlayerReference {
  type: 'roster';
  playerId: string;          // PlayerInfo.Id from database
  jerseyNumber: number;      // Actual jersey number (e.g., 5, 12, 7)
  displayName: string;       // PreferredName || #${jerseyNumber}
  teamId: string;            // TeamInfo.Id
}

/**
 * Custom player (not in roster - jersey number fallback)
 */
export interface CustomPlayerReference {
  type: 'custom';
  jerseyNumber: number;      // REQUIRED identifier
  customName?: string;       // Optional custom name
  displayName: string;       // Display value
  syntheticId: string;       // Generated ID: "CUSTOM:7"
}

// ============== FACTORY FUNCTIONS ==============

/**
 * Create reference from roster player
 * Converts Player object to type-safe PlayerReference
 */
export function createRosterReference(player: Player): RosterPlayerReference {
  return {
    type: 'roster',
    playerId: player.id,
    jerseyNumber: typeof player.jerseyNumber === 'number'
      ? player.jerseyNumber
      : parseInt(player.jerseyNumber as string, 10),
    displayName: player.name || `#${player.jerseyNumber}`,
    teamId: player.teamId
  };
}

/**
 * Create reference for custom player (jersey number fallback)
 */
export function createCustomReference(
  jerseyNumber: number,
  customName?: string
): CustomPlayerReference {
  return {
    type: 'custom',
    jerseyNumber,
    customName,
    displayName: customName || `#${jerseyNumber}`,
    syntheticId: `CUSTOM:${jerseyNumber}`
  };
}

// ============== ACCESSOR FUNCTIONS ==============

/**
 * Get unique ID for any player reference
 * Returns playerId for roster players, syntheticId for custom players
 */
export function getPlayerId(ref: PlayerReference): string {
  return ref.type === 'roster' ? ref.playerId : ref.syntheticId;
}

/**
 * Get display name for any player reference
 */
export function getPlayerDisplayName(ref: PlayerReference): string {
  return ref.displayName;
}

/**
 * Get jersey number for any player reference
 */
export function getJerseyNumber(ref: PlayerReference): number {
  return ref.jerseyNumber;
}

// ============== SERIALIZATION ==============

/**
 * Serialize player reference for localStorage/database storage
 * Stores only the minimal identifier (playerId or syntheticId)
 */
export function serializePlayerReference(ref: PlayerReference): string {
  return ref.type === 'roster' ? ref.playerId : ref.syntheticId;
}

/**
 * Deserialize from storage with roster lookup
 * Handles backward compatibility with legacy string-based player references
 *
 * Migration strategy:
 * 1. Check if custom format (CUSTOM:7)
 * 2. Try to find in roster by ID
 * 3. Fallback: try to find by name (legacy data)
 * 4. Last resort: parse as jersey number or create custom player
 */
export function deserializePlayerReference(
  stored: string,
  roster: Player[]
): PlayerReference {
  // Check if custom format (CUSTOM:7)
  if (stored.startsWith('CUSTOM:')) {
    const jerseyNumber = parseInt(stored.split(':')[1], 10);
    return createCustomReference(jerseyNumber);
  }

  // Try to find in roster by ID (primary lookup)
  const player = roster.find(p => p.id === stored);
  if (player) {
    return createRosterReference(player);
  }

  // Fallback: try to find by name (legacy data migration)
  const playerByName = roster.find(p => p.name === stored);
  if (playerByName) {
    return createRosterReference(playerByName);
  }

  // Last resort: treat as jersey number (if numeric)
  const jerseyNum = parseInt(stored, 10);
  if (!isNaN(jerseyNum)) {
    return createCustomReference(jerseyNum);
  }

  // Unknown format, create custom with jersey 0 and stored value as name
  return createCustomReference(0, stored);
}

// ============== TYPE GUARDS ==============

/**
 * Type guard to check if roster player
 * Use for conditional logic based on player source
 */
export function isRosterPlayer(ref: PlayerReference): ref is RosterPlayerReference {
  return ref.type === 'roster';
}

/**
 * Type guard to check if custom player
 */
export function isCustomPlayer(ref: PlayerReference): ref is CustomPlayerReference {
  return ref.type === 'custom';
}
