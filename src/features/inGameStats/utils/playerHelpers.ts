import type { Player } from '../../../services/googleSheetsAPI';

/**
 * Get player display name from player ID
 * Falls back to jersey number or "Unknown" if not found
 */
export function getPlayerName(playerId: string | undefined, roster: Player[]): string {
  if (!playerId) return 'Unknown';

  const player = roster.find(p => p.id === playerId);
  if (!player) return 'Unknown';

  // Prefer PreferredName, fall back to jersey number
  return player.name || `#${player.jerseyNumber}`;
}

/**
 * Get player display name with jersey number
 */
export function getPlayerNameWithNumber(playerId: string | undefined, roster: Player[]): string {
  if (!playerId) return 'Unknown';

  const player = roster.find(p => p.id === playerId);
  if (!player) return 'Unknown';

  return `${player.jerseyNumber} ${player.name}`;
}

/**
 * Generate consistent color for a player across charts
 * Uses player ID to generate deterministic color
 */
export function getPlayerColor(playerId: string, playerIndex: number): string {
  const colors = [
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#14B8A6', // teal
    '#F97316', // orange
    '#6366F1', // indigo
    '#84CC16', // lime
  ];

  return colors[playerIndex % colors.length];
}
