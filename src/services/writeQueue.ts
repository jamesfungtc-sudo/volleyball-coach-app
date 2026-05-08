/**
 * Write Queue
 *
 * Serialises all Google Sheets write operations so they execute one at a time.
 * This prevents the read-modify-write race that occurs when the coach taps
 * quickly (e.g. two addPoint calls both read the same stale row, then both
 * write back — the last writer wins and one point is silently lost).
 *
 * Local React state still updates immediately (optimistic UI).
 * The queue only controls when the network requests fire.
 */

type WriteTask = () => Promise<void>;

class WriteQueue {
  private queue: WriteTask[] = [];
  private processing = false;
  private _pendingCount = 0;
  private listeners: Array<(count: number) => void> = [];

  /**
   * Add a write task to the end of the queue.
   * If the queue is idle it starts processing immediately.
   */
  enqueue(task: WriteTask): void {
    this.queue.push(task);
    this._pendingCount++;
    this.notifyListeners();

    if (!this.processing) {
      this.processNext();
    }
  }

  /**
   * Number of tasks waiting + the one currently running.
   */
  get pendingCount(): number {
    return this._pendingCount;
  }

  /**
   * Subscribe to pending-count changes (used by the sync-status indicator).
   * Returns an unsubscribe function.
   */
  subscribe(listener: (count: number) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    const count = this._pendingCount;
    this.listeners.forEach(l => l(count));
  }

  private async processNext(): Promise<void> {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;
    const task = this.queue.shift()!;

    try {
      await task();
    } catch (err) {
      console.error('[WriteQueue] Task failed:', err);
    } finally {
      this._pendingCount = Math.max(0, this._pendingCount - 1);
      this.notifyListeners();
    }

    // Process the next task in a new microtask to avoid deep call stacks
    // on very long bursts of rapid scoring.
    Promise.resolve().then(() => this.processNext());
  }
}

/** Singleton queue shared across the whole app. */
export const writeQueue = new WriteQueue();

/**
 * Enqueue a Sheets write operation.
 *
 * Usage:
 *   enqueueWrite(() => addPoint(matchId, currentSet, pointRecord));
 *   enqueueWrite(() => updateGameState(matchId, newState));
 */
export function enqueueWrite(task: WriteTask): void {
  writeQueue.enqueue(task);
}
