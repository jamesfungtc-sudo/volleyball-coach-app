import { useEffect, useSyncExternalStore } from 'react'
import { getSyncSnapshot, requestFlush, subscribeSync, type SyncSnapshot } from '../services/liveSyncEngine'

/** Current Sheets sync status; also kicks a flush of anything left from a previous session. */
export function useMatchSync(): SyncSnapshot {
  useEffect(() => {
    requestFlush()
  }, [])
  return useSyncExternalStore(subscribeSync, getSyncSnapshot)
}
