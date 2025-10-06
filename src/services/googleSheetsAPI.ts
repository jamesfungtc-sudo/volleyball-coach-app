/**
 * Google Sheets API Service
 * Handles all communication with Google Apps Script Web App backend
 */

import type { MatchData, PointData, SetData } from '../types/inGameStats.types';

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
    const data: APIResponse<MatchData> = await response.json();

    if (data.status !== 200) {
      throw new Error((data.data as unknown as APIError).error);
    }

    return data.data;
  } catch (error) {
    console.error('Failed to get match:', error);
    throw error;
  }
}

/**
 * Get all matches
 */
export async function getAllMatches(): Promise<MatchData[]> {
  if (!API_URL) {
    console.warn('API URL not configured');
    return [];
  }

  try {
    const response = await fetch(`${API_URL}?action=getAllMatches`);
    const data: APIResponse<MatchData[]> = await response.json();

    if (data.status !== 200) {
      throw new Error((data.data as unknown as APIError).error);
    }

    return data.data;
  } catch (error) {
    console.error('Failed to get matches:', error);
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
 * Get players for a team
 */
export async function getPlayers(teamId?: string): Promise<any[]> {
  if (!API_URL) {
    console.warn('API URL not configured');
    return [];
  }

  try {
    const url = teamId
      ? `${API_URL}?action=getPlayers&teamId=${teamId}`
      : `${API_URL}?action=getPlayers`;

    const response = await fetch(url);
    const data: APIResponse<any[]> = await response.json();

    if (data.status !== 200) {
      throw new Error((data.data as unknown as APIError).error);
    }

    return data.data;
  } catch (error) {
    console.error('Failed to get players:', error);
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
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'saveMatch',
        data: matchData
      })
    });

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
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'updateMatch',
        matchId,
        data: matchData
      })
    });

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
