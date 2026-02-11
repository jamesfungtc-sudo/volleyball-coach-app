/**
 * Match Session Service
 * Unified service to manage match session state, combining Google Sheets and localStorage
 */

import {
  getMatchFull,
  saveMatchFull,
  updateGameState as apiUpdateGameState,
  updateRotationConfig as apiUpdateRotationConfig,
  updateTrajectories as apiUpdateTrajectories,
  type GameState,
  type MatchDataFull
} from '../../../services/googleSheetsAPI';
import {
  syncGameState,
  syncRotationConfig,
  syncTrajectories,
  getLocalBackup,
  processPendingSync
} from './syncService';
import {
  getTrajectories,
  saveTrajectory,
  type StoredTrajectory
} from './trajectoryStorage';
import {
  loadSetConfiguration,
  saveSetConfiguration
} from '../../../utils/rotationHelpers';

// ============================================================================
// Types
// ============================================================================

export interface MatchSession {
  matchId: string;
  homeTeamId: string;
  opponentTeamId: string;
  gameDate: string;
  gameState: GameState;
  rotationConfigs: Record<number, any>;
  trajectories: StoredTrajectory[];
  isLoaded: boolean;
}

// ============================================================================
// Session Loading
// ============================================================================

/**
 * Load a match session from Google Sheets with localStorage fallback
 */
export async function loadSession(matchId: string): Promise<MatchSession | null> {
  // Try to load from Google Sheets first
  try {
    const fullMatch = await getMatchFull(matchId);

    if (fullMatch) {
      // Get trajectories from localStorage (will be migrated to Sheets)
      const localTrajectories = getTrajectories(matchId);

      // Merge trajectories (prefer Sheets, add any missing from localStorage)
      const sheetTrajectoryIds = new Set((fullMatch.trajectories || []).map(t => t.id));
      const mergedTrajectories = [
        ...(fullMatch.trajectories || []),
        ...localTrajectories.filter(t => !sheetTrajectoryIds.has(t.id))
      ];

      return {
        matchId: fullMatch.id,
        homeTeamId: fullMatch.home_team.id,
        opponentTeamId: fullMatch.opponent_team.id,
        gameDate: fullMatch.match_date,
        gameState: fullMatch.gameState || getDefaultGameState(),
        rotationConfigs: fullMatch.rotationConfigs || {},
        trajectories: mergedTrajectories,
        isLoaded: true
      };
    }
  } catch (error) {
    console.error('Failed to load session from API:', error);
  }

  // Fallback to localStorage
  const localBackup = getLocalBackup(matchId);
  if (localBackup) {
    console.log('Using local backup for session:', matchId);
    return {
      matchId,
      homeTeamId: localBackup.homeTeamId || '',
      opponentTeamId: localBackup.opponentTeamId || '',
      gameDate: localBackup.gameDate || new Date().toISOString().split('T')[0],
      gameState: localBackup.gameState?.data || getDefaultGameState(),
      rotationConfigs: localBackup.rotationConfigs || {},
      trajectories: getTrajectories(matchId),
      isLoaded: true
    };
  }

  return null;
}

/**
 * Create a new match session in Google Sheets
 */
export async function createSession(
  homeTeamId: string,
  opponentTeamId: string,
  gameDate: string
): Promise<{ matchId: string; session: MatchSession }> {
  const initialGameState: GameState = {
    currentSet: 1,
    homeScore: 0,
    opponentScore: 0,
    pointNumber: 1,
    attemptNumber: 1,
    servingTeam: 'home',
    status: 'in_progress'
  };

  // Create in Google Sheets
  const result = await saveMatchFull({
    homeTeam: homeTeamId,
    opponentTeam: opponentTeamId,
    gameDate,
    sets: [
      { set_number: 1, points: [] },
      { set_number: 2, points: [] },
      { set_number: 3, points: [] },
      { set_number: 4, points: [] },
      { set_number: 5, points: [] }
    ],
    gameState: initialGameState,
    rotationConfigs: {},
    trajectories: []
  });

  const session: MatchSession = {
    matchId: result.matchId,
    homeTeamId,
    opponentTeamId,
    gameDate,
    gameState: initialGameState,
    rotationConfigs: {},
    trajectories: [],
    isLoaded: true
  };

  return { matchId: result.matchId, session };
}

// ============================================================================
// Game State Updates
// ============================================================================

/**
 * Update game state (with sync to Google Sheets)
 */
export async function updateGameState(
  matchId: string,
  gameState: Partial<GameState>,
  currentState?: GameState
): Promise<GameState> {
  const newState: GameState = {
    ...(currentState || getDefaultGameState()),
    ...gameState
  };

  // Sync to Google Sheets (with offline fallback)
  await syncGameState(matchId, newState);

  return newState;
}

/**
 * Increment score and update game state
 */
export async function recordPoint(
  matchId: string,
  currentState: GameState,
  winner: 'home' | 'opponent',
  newServingTeam: 'home' | 'opponent'
): Promise<GameState> {
  const newState: GameState = {
    ...currentState,
    homeScore: winner === 'home' ? currentState.homeScore + 1 : currentState.homeScore,
    opponentScore: winner === 'opponent' ? currentState.opponentScore + 1 : currentState.opponentScore,
    pointNumber: currentState.pointNumber + 1,
    attemptNumber: 1,
    servingTeam: newServingTeam
  };

  await syncGameState(matchId, newState);

  return newState;
}

/**
 * Start a new set
 */
export async function startNewSet(
  matchId: string,
  currentState: GameState,
  newSetNumber: number,
  startingServer: 'home' | 'opponent'
): Promise<GameState> {
  const newState: GameState = {
    currentSet: newSetNumber,
    homeScore: 0,
    opponentScore: 0,
    pointNumber: 1,
    attemptNumber: 1,
    servingTeam: startingServer,
    status: 'in_progress'
  };

  await syncGameState(matchId, newState);

  return newState;
}

/**
 * Mark match as completed
 */
export async function completeMatch(matchId: string, currentState: GameState): Promise<GameState> {
  const newState: GameState = {
    ...currentState,
    status: 'completed'
  };

  await syncGameState(matchId, newState);

  return newState;
}

// ============================================================================
// Rotation Config Updates
// ============================================================================

/**
 * Save rotation config for a set (with sync to Google Sheets)
 */
export async function saveRotationConfigForSet(
  matchId: string,
  setNumber: number,
  config: any,
  homeRoster?: any[],
  opponentRoster?: any[]
): Promise<void> {
  // Save to localStorage (existing functionality)
  saveSetConfiguration(matchId, setNumber, config, homeRoster, opponentRoster);

  // Sync to Google Sheets
  await syncRotationConfig(matchId, setNumber, config);
}

/**
 * Load rotation config for a set (prefers Google Sheets, falls back to localStorage)
 */
export function loadRotationConfigForSet(
  matchId: string,
  setNumber: number,
  homeRoster?: any[],
  opponentRoster?: any[]
): any | null {
  // For now, use localStorage (will be enhanced to check Sheets first)
  return loadSetConfiguration(matchId, setNumber, homeRoster, opponentRoster);
}

// ============================================================================
// Trajectory Updates
// ============================================================================

/**
 * Save a trajectory (with sync to Google Sheets)
 */
export async function saveTrajectoryWithSync(
  matchId: string,
  trajectory: Omit<StoredTrajectory, 'id' | 'matchId' | 'timestamp'>
): Promise<StoredTrajectory> {
  // Save to localStorage first
  const saved = saveTrajectory(matchId, trajectory);

  // Sync to Google Sheets
  await syncTrajectories(matchId, [saved]);

  return saved;
}

/**
 * Batch save trajectories (with sync to Google Sheets)
 */
export async function saveTrajectoryBatch(
  matchId: string,
  trajectories: StoredTrajectory[]
): Promise<void> {
  // Sync to Google Sheets
  await syncTrajectories(matchId, trajectories);
}

// ============================================================================
// Helpers
// ============================================================================

function getDefaultGameState(): GameState {
  return {
    currentSet: 1,
    homeScore: 0,
    opponentScore: 0,
    pointNumber: 1,
    attemptNumber: 1,
    servingTeam: 'home',
    status: 'in_progress'
  };
}

/**
 * Process any pending syncs (call on app start or when coming back online)
 */
export async function syncPendingData(): Promise<{ success: number; failed: number }> {
  return processPendingSync();
}
