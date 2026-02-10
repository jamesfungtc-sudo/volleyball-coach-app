/**
 * Trajectory Storage Service
 * Persists trajectory data to localStorage for player location maps
 */

export interface StoredTrajectory {
  id: string;
  matchId: string;
  setNumber: number;
  pointNumber: number;
  attemptNumber: number;

  // Player info
  playerId: string;
  playerName: string;
  jerseyNumber: number;
  team: 'home' | 'opponent';

  // Action info
  actionType: 'serve' | 'attack';
  result: 'in_play' | 'ace' | 'kill' | 'error';

  // Coordinates (SVG viewBox units: 420x800)
  startX: number;
  startY: number;
  endX: number;
  endY: number;

  // Analysis
  serveZone?: 1 | 2 | 3 | 4 | 5;
  hitPosition?: string;
  landingArea: 'front' | 'back';

  timestamp: number;
}

const STORAGE_KEY_PREFIX = 'trajectories_';

/**
 * Get localStorage key for a match
 */
function getStorageKey(matchId: string): string {
  return `${STORAGE_KEY_PREFIX}${matchId}`;
}

/**
 * Generate a unique ID for a trajectory
 */
function generateId(): string {
  return `traj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Save a single trajectory to storage
 */
export function saveTrajectory(
  matchId: string,
  trajectory: Omit<StoredTrajectory, 'id' | 'matchId' | 'timestamp'>
): StoredTrajectory {
  const key = getStorageKey(matchId);
  const existing = getTrajectories(matchId);

  const newTrajectory: StoredTrajectory = {
    ...trajectory,
    id: generateId(),
    matchId,
    timestamp: Date.now(),
  };

  existing.push(newTrajectory);

  try {
    localStorage.setItem(key, JSON.stringify(existing));
  } catch (e) {
    console.error('Failed to save trajectory to localStorage:', e);
  }

  return newTrajectory;
}

/**
 * Get all trajectories for a match
 */
export function getTrajectories(matchId: string): StoredTrajectory[] {
  const key = getStorageKey(matchId);

  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored) as StoredTrajectory[];
    }
  } catch (e) {
    console.error('Failed to load trajectories from localStorage:', e);
  }

  return [];
}

/**
 * Get trajectories filtered by player and optionally action type
 */
export function getPlayerTrajectories(
  matchId: string,
  playerId: string,
  actionType?: 'serve' | 'attack'
): StoredTrajectory[] {
  const all = getTrajectories(matchId);

  return all.filter(t => {
    const matchesPlayer = t.playerId === playerId;
    const matchesAction = actionType ? t.actionType === actionType : true;
    return matchesPlayer && matchesAction;
  });
}

/**
 * Get trajectories filtered by team
 */
export function getTeamTrajectories(
  matchId: string,
  team: 'home' | 'opponent'
): StoredTrajectory[] {
  const all = getTrajectories(matchId);
  return all.filter(t => t.team === team);
}

/**
 * Get trajectories with multiple filters
 */
export function getFilteredTrajectories(
  matchId: string,
  filters: {
    playerId?: string;
    team?: 'home' | 'opponent';
    actionType?: 'serve' | 'attack';
    setNumber?: number;
    results?: ('in_play' | 'ace' | 'kill' | 'error')[];
  }
): StoredTrajectory[] {
  const all = getTrajectories(matchId);

  return all.filter(t => {
    if (filters.playerId && t.playerId !== filters.playerId) return false;
    if (filters.team && t.team !== filters.team) return false;
    if (filters.actionType && t.actionType !== filters.actionType) return false;
    if (filters.setNumber && t.setNumber !== filters.setNumber) return false;
    if (filters.results && filters.results.length > 0 && !filters.results.includes(t.result)) return false;
    return true;
  });
}

/**
 * Clear all trajectories for a match
 */
export function clearTrajectories(matchId: string): void {
  const key = getStorageKey(matchId);
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error('Failed to clear trajectories from localStorage:', e);
  }
}

/**
 * Delete a single trajectory by ID
 */
export function deleteTrajectory(matchId: string, trajectoryId: string): void {
  const key = getStorageKey(matchId);
  const existing = getTrajectories(matchId);
  const filtered = existing.filter(t => t.id !== trajectoryId);

  try {
    localStorage.setItem(key, JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to delete trajectory from localStorage:', e);
  }
}

/**
 * Get unique players who have trajectory data
 */
export function getPlayersWithTrajectories(
  matchId: string,
  team?: 'home' | 'opponent'
): { playerId: string; playerName: string; jerseyNumber: number; team: 'home' | 'opponent' }[] {
  const all = getTrajectories(matchId);
  const filtered = team ? all.filter(t => t.team === team) : all;

  const playerMap = new Map<string, { playerId: string; playerName: string; jerseyNumber: number; team: 'home' | 'opponent' }>();

  for (const t of filtered) {
    if (!playerMap.has(t.playerId)) {
      playerMap.set(t.playerId, {
        playerId: t.playerId,
        playerName: t.playerName,
        jerseyNumber: t.jerseyNumber,
        team: t.team,
      });
    }
  }

  return Array.from(playerMap.values()).sort((a, b) => a.jerseyNumber - b.jerseyNumber);
}

/**
 * Get trajectory statistics for a player
 */
export function getPlayerStats(
  matchId: string,
  playerId: string,
  actionType: 'serve' | 'attack'
): { total: number; inPlay: number; kills: number; aces: number; errors: number } {
  const trajectories = getPlayerTrajectories(matchId, playerId, actionType);

  return {
    total: trajectories.length,
    inPlay: trajectories.filter(t => t.result === 'in_play').length,
    kills: trajectories.filter(t => t.result === 'kill').length,
    aces: trajectories.filter(t => t.result === 'ace').length,
    errors: trajectories.filter(t => t.result === 'error').length,
  };
}
