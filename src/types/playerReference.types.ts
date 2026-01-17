import type { Player } from '../services/googleSheetsAPI';

/**
 * PlayerReference - A unified way to reference players across the app
 * Supports both roster-based players (with full data) and custom/opponent players
 */
export type PlayerReference = {
  type: 'roster';
  playerId: string;
  teamId: string;
} | {
  type: 'custom';
  jerseyNumber: number;
  name: string;
};

/**
 * Create a reference to a player from the roster
 */
export function createRosterReference(playerId: string, teamId: string): PlayerReference {
  return {
    type: 'roster',
    playerId,
    teamId
  };
}

/**
 * Create a reference to a custom player (e.g., opponent team player)
 */
export function createCustomReference(jerseyNumber: number, name: string): PlayerReference {
  return {
    type: 'custom',
    jerseyNumber,
    name
  };
}

/**
 * Get the player ID from a reference (returns empty string for custom players)
 */
export function getPlayerId(ref: PlayerReference | null | undefined): string {
  if (!ref) return '';
  if (ref.type === 'roster') return ref.playerId;
  return '';
}

/**
 * Get the jersey number from a reference
 */
export function getJerseyNumber(ref: PlayerReference | null | undefined): number {
  if (!ref) return 0;
  if (ref.type === 'custom') return ref.jerseyNumber;
  return 0;
}

/**
 * Get the display name for a player reference
 * For roster players, looks up the name from the roster
 * For custom players, returns the stored name
 */
export function getPlayerDisplayName(
  ref: PlayerReference | null | undefined,
  roster?: Player[]
): string {
  if (!ref) return '';

  if (ref.type === 'custom') {
    return ref.name || `#${ref.jerseyNumber}`;
  }

  if (ref.type === 'roster' && roster) {
    const player = roster.find(p => p.id === ref.playerId);
    return player?.name || '';
  }

  return '';
}

/**
 * Serialize a player reference to a string for storage
 */
export function serializePlayerReference(ref: PlayerReference): string {
  return JSON.stringify(ref);
}

/**
 * Deserialize a player reference from a string
 */
export function deserializePlayerReference(str: string): PlayerReference | null {
  try {
    const parsed = JSON.parse(str);
    if (parsed.type === 'roster' || parsed.type === 'custom') {
      return parsed as PlayerReference;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Check if a player reference is valid (has required data)
 */
export function isValidPlayerReference(ref: PlayerReference | null | undefined): boolean {
  if (!ref) return false;
  if (ref.type === 'roster') return !!ref.playerId && !!ref.teamId;
  if (ref.type === 'custom') return ref.jerseyNumber > 0 || !!ref.name;
  return false;
}
