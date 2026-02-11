/**
 * Sync Service
 * Handles offline queue and retry logic for data persistence
 * Provides resilient saving to Google Sheets with localStorage fallback
 */

import {
  updateGameState,
  updateRotationConfig,
  updateTrajectories,
  healthCheck,
  type GameState
} from '../../../services/googleSheetsAPI';
import type { StoredTrajectory } from './trajectoryStorage';

// ============================================================================
// Types
// ============================================================================

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

interface PendingSyncItem {
  id: string;
  matchId: string;
  type: 'gameState' | 'rotationConfig' | 'trajectories';
  data: any;
  timestamp: number;
  retryCount: number;
}

interface SyncState {
  status: SyncStatus;
  lastSyncTime: number | null;
  pendingCount: number;
  isOnline: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const PENDING_SYNC_KEY = 'pendingSync';
const MAX_RETRY_COUNT = 5;
const RETRY_DELAY_MS = 3000;

// ============================================================================
// State
// ============================================================================

let currentStatus: SyncStatus = 'synced';
let statusListeners: ((status: SyncStatus) => void)[] = [];

// ============================================================================
// localStorage Helpers
// ============================================================================

function getPendingSync(): PendingSyncItem[] {
  try {
    const stored = localStorage.getItem(PENDING_SYNC_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function savePendingSync(items: PendingSyncItem[]): void {
  try {
    localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save pending sync:', e);
  }
}

function addToPendingSync(item: Omit<PendingSyncItem, 'id' | 'timestamp' | 'retryCount'>): void {
  const pending = getPendingSync();
  pending.push({
    ...item,
    id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    retryCount: 0
  });
  savePendingSync(pending);
}

function removeFromPendingSync(id: string): void {
  const pending = getPendingSync();
  savePendingSync(pending.filter(item => item.id !== id));
}

// ============================================================================
// Status Management
// ============================================================================

function setStatus(status: SyncStatus): void {
  currentStatus = status;
  statusListeners.forEach(listener => listener(status));
}

/**
 * Subscribe to sync status changes
 */
export function onSyncStatusChange(listener: (status: SyncStatus) => void): () => void {
  statusListeners.push(listener);
  return () => {
    statusListeners = statusListeners.filter(l => l !== listener);
  };
}

/**
 * Get current sync status
 */
export function getSyncStatus(): SyncStatus {
  return currentStatus;
}

/**
 * Get full sync state
 */
export function getSyncState(): SyncState {
  const pending = getPendingSync();
  return {
    status: currentStatus,
    lastSyncTime: null, // Could be tracked in localStorage
    pendingCount: pending.length,
    isOnline: navigator.onLine
  };
}

// ============================================================================
// Online/Offline Detection
// ============================================================================

/**
 * Check if we're online (basic check)
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Check if API is reachable
 */
export async function isAPIReachable(): Promise<boolean> {
  if (!navigator.onLine) return false;

  try {
    return await healthCheck();
  } catch {
    return false;
  }
}

// ============================================================================
// Sync Operations with Retry
// ============================================================================

/**
 * Save game state with offline fallback
 */
export async function syncGameState(matchId: string, gameState: GameState): Promise<boolean> {
  setStatus('syncing');

  // Always save to localStorage backup
  saveLocalBackup(matchId, 'gameState', gameState);

  if (!navigator.onLine) {
    addToPendingSync({ matchId, type: 'gameState', data: gameState });
    setStatus('offline');
    return false;
  }

  try {
    await updateGameState(matchId, gameState);
    setStatus('synced');
    return true;
  } catch (error) {
    console.error('Failed to sync game state:', error);
    addToPendingSync({ matchId, type: 'gameState', data: gameState });
    setStatus('error');
    return false;
  }
}

/**
 * Save rotation config with offline fallback
 */
export async function syncRotationConfig(
  matchId: string,
  setNumber: number,
  config: any
): Promise<boolean> {
  setStatus('syncing');

  // Always save to localStorage backup
  saveLocalBackup(matchId, 'rotationConfig', { setNumber, config });

  if (!navigator.onLine) {
    addToPendingSync({ matchId, type: 'rotationConfig', data: { setNumber, config } });
    setStatus('offline');
    return false;
  }

  try {
    await updateRotationConfig(matchId, setNumber, config);
    setStatus('synced');
    return true;
  } catch (error) {
    console.error('Failed to sync rotation config:', error);
    addToPendingSync({ matchId, type: 'rotationConfig', data: { setNumber, config } });
    setStatus('error');
    return false;
  }
}

/**
 * Save trajectories with offline fallback
 */
export async function syncTrajectories(
  matchId: string,
  trajectories: StoredTrajectory[]
): Promise<boolean> {
  setStatus('syncing');

  // Always save to localStorage backup (handled by trajectoryStorage.ts)

  if (!navigator.onLine) {
    addToPendingSync({ matchId, type: 'trajectories', data: trajectories });
    setStatus('offline');
    return false;
  }

  try {
    await updateTrajectories(matchId, trajectories);
    setStatus('synced');
    return true;
  } catch (error) {
    console.error('Failed to sync trajectories:', error);
    addToPendingSync({ matchId, type: 'trajectories', data: trajectories });
    setStatus('error');
    return false;
  }
}

// ============================================================================
// Pending Sync Processing
// ============================================================================

/**
 * Process all pending sync items
 */
export async function processPendingSync(): Promise<{ success: number; failed: number }> {
  const pending = getPendingSync();

  if (pending.length === 0) {
    return { success: 0, failed: 0 };
  }

  if (!navigator.onLine) {
    return { success: 0, failed: pending.length };
  }

  let success = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      let syncSuccess = false;

      switch (item.type) {
        case 'gameState':
          await updateGameState(item.matchId, item.data);
          syncSuccess = true;
          break;

        case 'rotationConfig':
          await updateRotationConfig(item.matchId, item.data.setNumber, item.data.config);
          syncSuccess = true;
          break;

        case 'trajectories':
          await updateTrajectories(item.matchId, item.data);
          syncSuccess = true;
          break;
      }

      if (syncSuccess) {
        removeFromPendingSync(item.id);
        success++;
      }
    } catch (error) {
      console.error(`Failed to sync item ${item.id}:`, error);

      // Update retry count
      const updated = getPendingSync().map(p => {
        if (p.id === item.id) {
          return { ...p, retryCount: p.retryCount + 1 };
        }
        return p;
      });

      // Remove items that have exceeded max retries
      savePendingSync(updated.filter(p => p.retryCount < MAX_RETRY_COUNT));
      failed++;
    }
  }

  // Update status based on results
  if (failed === 0 && getPendingSync().length === 0) {
    setStatus('synced');
  } else if (failed > 0) {
    setStatus('error');
  }

  return { success, failed };
}

/**
 * Get count of pending sync items
 */
export function getPendingSyncCount(): number {
  return getPendingSync().length;
}

// ============================================================================
// Local Backup
// ============================================================================

/**
 * Save local backup for a match
 */
function saveLocalBackup(matchId: string, type: string, data: any): void {
  try {
    const key = `match_${matchId}_backup`;
    const existing = JSON.parse(localStorage.getItem(key) || '{}');
    existing[type] = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(existing));
  } catch (e) {
    console.error('Failed to save local backup:', e);
  }
}

/**
 * Get local backup for a match
 */
export function getLocalBackup(matchId: string): any | null {
  try {
    const key = `match_${matchId}_backup`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

/**
 * Clear local backup for a match
 */
export function clearLocalBackup(matchId: string): void {
  try {
    localStorage.removeItem(`match_${matchId}_backup`);
  } catch (e) {
    console.error('Failed to clear local backup:', e);
  }
}

// ============================================================================
// Auto-Retry on Reconnect
// ============================================================================

// Listen for online/offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', async () => {
    console.log('Network: Online - processing pending sync...');
    const result = await processPendingSync();
    console.log(`Pending sync complete: ${result.success} success, ${result.failed} failed`);
  });

  window.addEventListener('offline', () => {
    console.log('Network: Offline');
    setStatus('offline');
  });
}
