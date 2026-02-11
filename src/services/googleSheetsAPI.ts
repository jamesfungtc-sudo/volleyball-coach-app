/**
 * Google Sheets API Service
 * Handles all communication with Google Apps Script Web App backend
 */

import type { MatchData, PointData, SetData } from '../types/inGameStats.types';
import type { StoredTrajectory } from '../features/inGameStats/services/trajectoryStorage';

// API Base URL from environment variable
const API_URL = import.meta.env.VITE_GOOGLE_SHEETS_API_URL;

if (!API_URL) {
  console.warn('⚠️ VITE_GOOGLE_SHEETS_API_URL not configured. Using mock data mode.');
}

// ============================================================================
// API Response Types
// ============================================================================

interface APIResponse<T> {
  status: number;
  data: T;
}

interface APIError {
  error: string;
}

// ============================================================================
// Game State Types
// ============================================================================

export interface GameState {
  currentSet: number;
  homeScore: number;
  opponentScore: number;
  pointNumber: number;
  attemptNumber?: number;
  servingTeam: 'home' | 'opponent';
  status: 'in_progress' | 'completed';
}

export interface MatchDataFull extends MatchData {
  gameState: GameState | null;
  rotationConfigs: Record<string, any> | null;
  trajectories: StoredTrajectory[];
}

// ============================================================================
// Data Normalization Helpers
// ============================================================================

/**
 * Normalize point data from Google Sheets format to our PointData format
 * Handles both old format (score: {home, opponent}) and new format (home_score, opponent_score)
 */
function normalizePointData(point: any): PointData {
  return {
    point_number: point.point_number,
    winning_team: point.winning_team,
    action_type: point.action_type,
    action: point.action,
    locationTempo: point.locationTempo || null,
    home_player: point.home_player || '',
    opponent_player: point.opponent_player || '',
    // Handle both formats
    home_score: point.home_score !== undefined ? point.home_score : point.score?.home || 0,
    opponent_score: point.opponent_score !== undefined ? point.opponent_score : point.score?.opponent || 0
  };
}

/**
 * Normalize match data from Google Sheets
 */
function normalizeMatchData(rawMatch: any): MatchData {
  const sets = rawMatch.sets?.map((set: any) => ({
    set_number: set.set_number,
    points: set.points?.map(normalizePointData) || []
  })) || [];

  return {
    id: rawMatch.id,
    match_date: rawMatch.gameDate || rawMatch.match_date,
    home_team: {
      id: typeof rawMatch.homeTeam === 'string' ? rawMatch.homeTeam : rawMatch.home_team?.id,
      name: typeof rawMatch.homeTeam === 'string' ? 'Home Team' : rawMatch.home_team?.name,
      players: []
    },
    opponent_team: {
      id: typeof rawMatch.opponentTeam === 'string' ? rawMatch.opponentTeam : rawMatch.opponent_team?.id,
      name: typeof rawMatch.opponentTeam === 'string' ? 'Opponent Team' : rawMatch.opponent_team?.name,
      players: []
    },
    sets
  };
}

/**
 * Normalize full match data including game state, rotation configs, and trajectories
 */
function normalizeMatchDataFull(rawMatch: any): MatchDataFull {
  const baseMatch = normalizeMatchData(rawMatch);

  return {
    ...baseMatch,
    gameState: rawMatch.gameState || null,
    rotationConfigs: rawMatch.rotationConfigs || null,
    trajectories: rawMatch.trajectories || []
  };
}

// ============================================================================
// GET Operations (Read)
// ============================================================================

/**
 * Health check - verify API is accessible
 */
export async function healthCheck(): Promise<boolean> {
  if (!API_URL) return false;

  try {
    const response = await fetch(`${API_URL}?action=health`);
    const data: APIResponse<{ status: string }> = await response.json();
    return data.status === 200 && data.data.status === 'ok';
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
}

/**
 * Get a single match by ID
 */
export async function getMatch(matchId: string): Promise<MatchData | null> {
  if (!API_URL) {
    console.warn('API URL not configured');
    return null;
  }

  try {
    const response = await fetch(`${API_URL}?action=getMatch&matchId=${matchId}`);
    const data: APIResponse<any> = await response.json();

    if (data.status !== 200) {
      throw new Error((data.data as unknown as APIError).error);
    }

    // Normalize the data to match our PointData structure
    return normalizeMatchData(data.data);
  } catch (error) {
    console.error('Failed to get match:', error);
    throw error;
  }
}

/**
 * Get all matches (includes gameState for resume functionality)
 */
export async function getAllMatches(): Promise<(MatchData & { gameState?: GameState | null })[]> {
  if (!API_URL) {
    console.warn('API URL not configured');
    return [];
  }

  try {
    const response = await fetch(`${API_URL}?action=getAllMatches`);
    const data: APIResponse<any[]> = await response.json();

    if (data.status !== 200) {
      throw new Error((data.data as unknown as APIError).error);
    }

    // Normalize all match data and include gameState
    return data.data.map(rawMatch => ({
      ...normalizeMatchData(rawMatch),
      gameState: rawMatch.gameState || null
    }));
  } catch (error) {
    console.error('Failed to get matches:', error);
    throw error;
  }
}

/**
 * Get a single match with all data (full session data including gameState, rotationConfigs, trajectories)
 */
export async function getMatchFull(matchId: string): Promise<MatchDataFull | null> {
  if (!API_URL) {
    console.warn('API URL not configured');
    return null;
  }

  try {
    const response = await fetch(`${API_URL}?action=getMatchFull&matchId=${matchId}`);
    const data: APIResponse<any> = await response.json();

    if (data.status !== 200) {
      throw new Error((data.data as unknown as APIError).error);
    }

    return normalizeMatchDataFull(data.data);
  } catch (error) {
    console.error('Failed to get full match:', error);
    throw error;
  }
}

/**
 * Get all teams
 */
export async function getTeams(): Promise<any[]> {
  if (!API_URL) {
    console.warn('API URL not configured');
    return [];
  }

  try {
    const response = await fetch(`${API_URL}?action=getTeams`);
    const data: APIResponse<any[]> = await response.json();

    if (data.status !== 200) {
      throw new Error((data.data as unknown as APIError).error);
    }

    return data.data;
  } catch (error) {
    console.error('Failed to get teams:', error);
    throw error;
  }
}

/**
 * Player type from Google Sheets PlayerInfo
 */
export interface Player {
  id: string;
  name: string;
  jerseyNumber: number | string;
  position: string;
  teamId: string;
}

/**
 * Raw player data from Google Sheets
 */
interface RawPlayerData {
  Id: string;
  PreferredName: string;
  FirstName: string;
  LastName: string;
  MainPosition: string;
  SecondaryPosition: string;
  TeamId: string;
  JerseyNumber: number | string;
}

/**
 * Get all players
 */
export async function getPlayers(): Promise<RawPlayerData[]> {
  if (!API_URL) {
    console.warn('API URL not configured');
    return [];
  }

  try {
    const response = await fetch(`${API_URL}?action=getPlayers`);
    const data: APIResponse<RawPlayerData[]> = await response.json();

    if (data.status !== 200) {
      throw new Error((data.data as unknown as APIError).error);
    }

    return data.data;
  } catch (error) {
    console.error('Failed to get players:', error);
    throw error;
  }
}

/**
 * Get players for a specific team, formatted for UI display
 */
export async function getPlayersByTeam(teamId: string): Promise<Player[]> {
  if (!API_URL) {
    console.warn('API URL not configured');
    return [];
  }

  try {
    const allPlayers = await getPlayers();

    return allPlayers
      .filter(p => p.TeamId === teamId)
      .map(p => ({
        id: p.Id,
        name: p.PreferredName || `#${p.JerseyNumber}`,
        jerseyNumber: p.JerseyNumber,
        position: p.MainPosition || 'Unknown',
        teamId: p.TeamId
      }))
      .filter(p => p.name && p.jerseyNumber !== 'null'); // Filter out incomplete player data
  } catch (error) {
    console.error('Failed to get players by team:', error);
    throw error;
  }
}

// ============================================================================
// POST Operations (Write)
// ============================================================================

/**
 * Save a new match
 */
export async function saveMatch(matchData: Partial<MatchData>): Promise<{ matchId: string }> {
  if (!API_URL) {
    console.warn('API URL not configured');
    throw new Error('API not configured');
  }

  try {
    // Use GET with URL parameters to avoid CORS issues with POST
    const params = new URLSearchParams({
      action: 'saveMatch',
      data: JSON.stringify(matchData)
    });

    const response = await fetch(`${API_URL}?${params}`);
    const data: APIResponse<{ success: boolean; matchId: string }> = await response.json();

    if (data.status !== 200) {
      throw new Error((data.data as unknown as APIError).error);
    }

    return { matchId: data.data.matchId };
  } catch (error) {
    console.error('Failed to save match:', error);
    throw error;
  }
}

/**
 * Update an existing match
 */
export async function updateMatch(matchId: string, matchData: Partial<MatchData>): Promise<void> {
  if (!API_URL) {
    console.warn('API URL not configured');
    throw new Error('API not configured');
  }

  try {
    // Use GET with URL parameters to avoid CORS issues with POST
    const params = new URLSearchParams({
      action: 'updateMatch',
      matchId,
      data: JSON.stringify(matchData)
    });

    const response = await fetch(`${API_URL}?${params}`);
    const data: APIResponse<{ success: boolean }> = await response.json();

    if (data.status !== 200) {
      throw new Error((data.data as unknown as APIError).error);
    }
  } catch (error) {
    console.error('Failed to update match:', error);
    throw error;
  }
}

/**
 * Delete a match
 */
export async function deleteMatch(matchId: string): Promise<void> {
  if (!API_URL) {
    console.warn('API URL not configured');
    throw new Error('API not configured');
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'deleteMatch',
        matchId
      })
    });

    const data: APIResponse<{ success: boolean }> = await response.json();

    if (data.status !== 200) {
      throw new Error((data.data as unknown as APIError).error);
    }
  } catch (error) {
    console.error('Failed to delete match:', error);
    throw error;
  }
}

/**
 * Add a point to a specific set
 */
export async function addPoint(
  matchId: string,
  setNumber: number,
  pointData: PointData
): Promise<void> {
  if (!API_URL) {
    console.warn('API URL not configured');
    throw new Error('API not configured');
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'addPoint',
        matchId,
        setNumber,
        point: pointData
      })
    });

    const data: APIResponse<{ success: boolean }> = await response.json();

    if (data.status !== 200) {
      throw new Error((data.data as unknown as APIError).error);
    }
  } catch (error) {
    console.error('Failed to add point:', error);
    throw error;
  }
}

/**
 * Undo the last point in a set
 */
export async function undoLastPoint(matchId: string, setNumber: number): Promise<void> {
  if (!API_URL) {
    console.warn('API URL not configured');
    throw new Error('API not configured');
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'undoLastPoint',
        matchId,
        setNumber
      })
    });

    const data: APIResponse<{ success: boolean }> = await response.json();

    if (data.status !== 200) {
      throw new Error((data.data as unknown as APIError).error);
    }
  } catch (error) {
    console.error('Failed to undo point:', error);
    throw error;
  }
}

// ============================================================================
// Game State Operations
// ============================================================================

/**
 * Update only the game state (quick update for live scoring)
 */
export async function updateGameState(matchId: string, gameState: GameState): Promise<void> {
  if (!API_URL) {
    console.warn('API URL not configured');
    throw new Error('API not configured');
  }

  try {
    const params = new URLSearchParams({
      action: 'updateGameState',
      matchId,
      data: JSON.stringify(gameState)
    });

    const response = await fetch(`${API_URL}?${params}`);
    const data: APIResponse<{ success: boolean }> = await response.json();

    if (data.status !== 200) {
      throw new Error((data.data as unknown as APIError).error);
    }
  } catch (error) {
    console.error('Failed to update game state:', error);
    throw error;
  }
}

/**
 * Update rotation config for a specific set
 */
export async function updateRotationConfig(
  matchId: string,
  setNumber: number,
  config: any
): Promise<void> {
  if (!API_URL) {
    console.warn('API URL not configured');
    throw new Error('API not configured');
  }

  try {
    const params = new URLSearchParams({
      action: 'updateRotationConfig',
      matchId,
      data: JSON.stringify({ setNumber, config })
    });

    const response = await fetch(`${API_URL}?${params}`);
    const data: APIResponse<{ success: boolean }> = await response.json();

    if (data.status !== 200) {
      throw new Error((data.data as unknown as APIError).error);
    }
  } catch (error) {
    console.error('Failed to update rotation config:', error);
    throw error;
  }
}

/**
 * Update trajectories (append new trajectories to existing)
 */
export async function updateTrajectories(
  matchId: string,
  trajectories: StoredTrajectory[]
): Promise<void> {
  if (!API_URL) {
    console.warn('API URL not configured');
    throw new Error('API not configured');
  }

  try {
    const params = new URLSearchParams({
      action: 'updateTrajectories',
      matchId,
      data: JSON.stringify({ trajectories })
    });

    const response = await fetch(`${API_URL}?${params}`);
    const data: APIResponse<{ success: boolean; count?: number }> = await response.json();

    if (data.status !== 200) {
      throw new Error((data.data as unknown as APIError).error);
    }
  } catch (error) {
    console.error('Failed to update trajectories:', error);
    throw error;
  }
}

/**
 * Save a new match with full data (including gameState, rotationConfigs, trajectories)
 */
export async function saveMatchFull(matchData: {
  homeTeam: string;
  opponentTeam: string;
  gameDate: string;
  sets?: any[];
  gameState?: GameState;
  rotationConfigs?: Record<string, any>;
  trajectories?: StoredTrajectory[];
}): Promise<{ matchId: string }> {
  if (!API_URL) {
    console.warn('API URL not configured');
    throw new Error('API not configured');
  }

  try {
    const params = new URLSearchParams({
      action: 'saveMatch',
      data: JSON.stringify(matchData)
    });

    const response = await fetch(`${API_URL}?${params}`);
    const data: APIResponse<{ success: boolean; matchId: string }> = await response.json();

    if (data.status !== 200) {
      throw new Error((data.data as unknown as APIError).error);
    }

    return { matchId: data.data.matchId };
  } catch (error) {
    console.error('Failed to save full match:', error);
    throw error;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if API is configured
 */
export function isAPIConfigured(): boolean {
  return !!API_URL;
}

/**
 * Get API URL (for debugging)
 */
export function getAPIUrl(): string | undefined {
  return API_URL;
}
