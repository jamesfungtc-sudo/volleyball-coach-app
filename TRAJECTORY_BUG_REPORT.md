# Trajectory Drawing — Bug Report

**Date:** 2026-04-28
**Analyst:** Claude (claude-sonnet-4-6)
**Status:** Pending fixes

---

## Overview

Analysis of the trajectory drawing system in `VisualTrackingPage` and related files. 9 bugs found across performance, data integrity, and UX categories. Bug #1 is the primary source of in-game lag and should be fixed first.

**Files analyzed:**
- `src/pages/VisualTrackingPage.tsx` — main drawing logic
- `src/features/inGameStats/components/VisualTracking/utils.ts` — coordinate helpers
- `src/features/inGameStats/components/VisualTracking/TrajectoryArrow.tsx` — arrow renderer
- `src/features/inGameStats/components/VisualTracking/coordinateCalculations.ts` — analysis logic
- `src/features/inGameStats/services/trajectoryStorage.ts` — localStorage persistence

---

## Bug Summary

| # | Severity | Description | File |
|---|----------|-------------|------|
| 1 | CRITICAL | `handleMove` causes full page re-render on every pixel moved | VisualTrackingPage.tsx:1293 |
| 2 | CRITICAL | Drawing handlers not wrapped in `useCallback` | VisualTrackingPage.tsx:1267 |
| 3 | HIGH | `preventDefault` skipped when `isDragging` is stale — page scrolls on iPad | VisualTrackingPage.tsx:1293 |
| 4 | HIGH | localStorage quota exceeded silently drops trajectory data | trajectoryStorage.ts:56 |
| 5 | HIGH | `changedTouches` not used in touchend fallback — coords snap to (0,0) | utils.ts:61 |
| 6 | HIGH | No schema validation when parsing stored trajectories | trajectoryStorage.ts:91 |
| 7 | MEDIUM | `landingArea` always assumes ball lands on opposite court — wrong for errors | coordinateCalculations.ts:302 |
| 8 | MEDIUM | `scoringHistory` accumulates full lineup snapshots unbounded in memory | VisualTrackingPage.tsx:1046 |
| 9 | LOW | Zero-length trajectory flashes on screen during quick taps | VisualTrackingPage.tsx:1267 |

---

## Detailed Findings

---

### BUG 1 — CRITICAL: `handleMove` triggers full page re-render on every pixel

**File:** `src/pages/VisualTrackingPage.tsx:1293`

**Description:**
`handleMove` calls `setCurrentTrajectory` on every single `mousemove`/`touchmove` event. This re-renders the entire `VisualTrackingPage` component (40k+ tokens of JSX, dozens of state variables, child modals, charts, court) at ~60fps during drawing. This is the #1 source of lag during a game.

**Problematic code:**
```ts
const handleMove = (event: ...) => {
  if (!isDragging || !svgRef.current) return;
  event.preventDefault();

  const coords = getCoordinates(event, svgRef.current);
  const clamped = clampToViewBox(coords.x, coords.y);

  setCurrentTrajectory(prev => prev ? {   // ← triggers re-render on EVERY pixel
    ...prev,
    endX: clamped.x,
    endY: clamped.y,
    endInBounds: isInBounds(clamped.x, clamped.y)
  } : null);
};
```

**Fix:**
Store the in-progress draw in a `useRef` and mutate the SVG element directly (no React state). Only call `setCurrentTrajectory` once on `handleEnd` to commit the final trajectory:

```ts
const liveTrajectoryRef = useRef<Trajectory | null>(null);

const handleMove = useCallback((event: ...) => {
  if (!isDraggingRef.current || !svgRef.current) return;
  event.preventDefault();

  const coords = getCoordinates(event, svgRef.current);
  const clamped = clampToViewBox(coords.x, coords.y);

  // Mutate the ref — NO React state update, NO re-render
  if (liveTrajectoryRef.current) {
    liveTrajectoryRef.current.endX = clamped.x;
    liveTrajectoryRef.current.endY = clamped.y;
    liveTrajectoryRef.current.endInBounds = isInBounds(clamped.x, clamped.y);
  }

  // Update the SVG line directly via DOM ref
  if (previewLineRef.current) {
    previewLineRef.current.setAttribute('x2', String(clamped.x));
    previewLineRef.current.setAttribute('y2', String(clamped.y));
  }
}, []);

const handleEnd = useCallback((event: ...) => {
  if (!isDraggingRef.current) return;
  event.preventDefault();
  isDraggingRef.current = false;

  // Only now commit to React state (single re-render on release)
  if (liveTrajectoryRef.current) {
    const dist = calculateDistance(...);
    if (dist >= 10) {
      setCurrentTrajectory({ ...liveTrajectoryRef.current });
    }
  }
}, []);
```

---

### BUG 2 — CRITICAL: Drawing handlers not in `useCallback`

**File:** `src/pages/VisualTrackingPage.tsx:1267`

**Description:**
`handleStart`, `handleMove`, `handleEnd` are plain functions recreated on every render. During drawing (Bug #1 causes many renders), child components that receive these handlers as props also re-render unnecessarily.

**Fix:**
Wrap all three handlers in `useCallback`. Combined with Bug #1 fix (using refs), this also eliminates the stale closure risk on `isDragging`.

---

### BUG 3 — HIGH: `preventDefault` skipped when `isDragging` is stale on iPad

**File:** `src/pages/VisualTrackingPage.tsx:1293`

**Description:**
```ts
const handleMove = (...) => {
  if (!isDragging || !svgRef.current) return;  // exits before preventDefault
  event.preventDefault();
```

On iPad, React's state updates are asynchronous. If `isDragging` hasn't updated yet when the first `touchmove` fires (a one-frame race), the early return fires and `preventDefault()` is never called — the browser interprets the gesture as a scroll/pan instead of a draw. This is a real risk during fast touch interactions in a game.

**Fix:**
If using the ref-based approach from Bug #1, replace `isDragging` state with `isDraggingRef.current` (synchronous). Alternatively, call `preventDefault()` unconditionally before the early return check.

---

### BUG 4 — HIGH: localStorage quota silently drops trajectory data

**File:** `src/features/inGameStats/services/trajectoryStorage.ts:56`

**Description:**
`saveTrajectory` always appends to the stored array with no size limit. The `localStorage` quota is ~5MB per domain. Over a full match (hundreds of trajectories with coordinates + metadata), this can be exceeded. The `try/catch` silently swallows `QuotaExceededError` and the trajectory is permanently lost with no warning shown to the coach.

**Problematic code:**
```ts
try {
  localStorage.setItem(key, JSON.stringify(existing));
} catch (e) {
  console.error('Failed to save trajectory to localStorage:', e);
  // ← no user-facing warning, data is lost
}
```

**Fix:**
1. Catch `QuotaExceededError` specifically and surface a toast/warning to the user.
2. Optionally cap trajectories per match (e.g., drop oldest if over 500) to prevent the issue proactively.
3. Since trajectories are also synced to Google Sheets, consider clearing old localStorage entries after a successful sync.

---

### BUG 5 — HIGH: `changedTouches` not used — touchend coordinates snap to (0,0)

**File:** `src/features/inGameStats/components/VisualTracking/utils.ts:61`

**Description:**
On `touchend`, the lifted finger is removed from `event.touches` (which becomes empty), but is available in `event.changedTouches`. The current code returns `{x:0, y:0}` when `event.touches` is empty.

`handleEnd` doesn't currently call `getCoordinates`, so this doesn't crash today. But it's a landmine — any future code that calls `getCoordinates` from a touchend handler will silently snap the endpoint to the top-left corner of the screen (SVG coordinates (0,0)).

**Problematic code:**
```ts
if (event.touches.length > 0) {
  clientX = event.touches[0].clientX;
  clientY = event.touches[0].clientY;
} else {
  return { x: 0, y: 0 };  // ← should be changedTouches fallback
}
```

**Fix:**
```ts
if (event.touches.length > 0) {
  clientX = event.touches[0].clientX;
  clientY = event.touches[0].clientY;
} else if ('changedTouches' in event && event.changedTouches.length > 0) {
  clientX = event.changedTouches[0].clientX;
  clientY = event.changedTouches[0].clientY;
} else {
  return { x: 0, y: 0 };
}
```

---

### BUG 6 — HIGH: No schema validation on stored trajectory parse

**File:** `src/features/inGameStats/services/trajectoryStorage.ts:91`

**Description:**
Trajectories are loaded from localStorage with a blind type cast:
```ts
return JSON.parse(stored) as StoredTrajectory[];
```

If the data was stored by an older version of the app (e.g., missing `landingArea`, old coordinate system, different field names), the cast silently succeeds but downstream code crashes or produces corrupted analytics.

**Fix:**
Add a minimal field validation on parse. Any trajectory missing required fields should be filtered out with a warning:
```ts
const parsed = JSON.parse(stored);
return parsed.filter((t: any) =>
  typeof t.id === 'string' &&
  typeof t.startX === 'number' &&
  typeof t.endX === 'number' &&
  typeof t.landingArea === 'string'
) as StoredTrajectory[];
```

---

### BUG 7 — MEDIUM: `landingArea` always assumes ball lands on opposite court

**File:** `src/features/inGameStats/components/VisualTracking/coordinateCalculations.ts:302`

**Description:**
```ts
const landingArea = getCourtArea(endY, team === 'home' ? 'opponent' : 'home');
```

This hardcodes the assumption that the ball always lands on the opponent's court. For attack errors (ball hits net, or lands out of bounds on attacker's own side), the end coordinate is on the same team's side. Passing the hardcoded opposite team to `getCourtArea` produces incorrect `landingArea` values in stored data.

**Fix:**
Detect which side the endpoint actually falls on:
```ts
const landingSide = endY < COURT_DIMENSIONS.netY ? 'opponent' : 'home';
const landingArea = getCourtArea(endY, landingSide);
```

---

### BUG 8 — MEDIUM: `scoringHistory` grows unbounded with full lineup snapshots

**File:** `src/pages/VisualTrackingPage.tsx:1046`

**Description:**
Every point scored appends a full copy of `homeLineup` and `opponentLineup` to `scoringHistory`. Each lineup contains 6 `PlayerInPosition` objects with player references, names, positions, etc. Over a 5-set match (~150 points total), this accumulates 300 lineup snapshots in React state. On iPad with limited RAM this contributes to slower renders and potential memory pressure.

**Fix:**
- Cap undo history to the last 10 points: `setScoringHistory(prev => [...prev.slice(-9), newEntry])`.
- Or store only the rotation number + serving team (the minimal delta needed to undo), and recompute the lineup from that on undo.

---

### BUG 9 — LOW: Zero-length trajectory flashes on screen during quick taps

**File:** `src/pages/VisualTrackingPage.tsx:1267`

**Description:**
On a quick tap (touch down + touch up without move), `handleStart` creates a trajectory where `startX === endX` and `startY === endY`. For one render frame, `TrajectoryArrow` renders this as two overlapping dots. `handleEnd` clears it shortly after, but the flash is visible and confusing.

**Fix:**
Don't create the trajectory in `handleStart`. Instead, wait for the first `handleMove` that exceeds a minimum threshold (e.g., 5px from start) before creating the trajectory:
```ts
const handleMove = (...) => {
  if (!pendingStartRef.current) return;
  const dist = calculateDistance(pendingStartRef.current.x, pendingStartRef.current.y, clamped.x, clamped.y);
  if (dist < 5) return; // not yet a real draw
  setIsDragging(true);
  setCurrentTrajectory({ startX: pendingStartRef.current.x, ... });
};
```

---

## Fix Priority Order

1. **Bug 1 + 2** together (ref-based handleMove + useCallback) — eliminates all in-game lag
2. **Bug 3** (preventDefault before isDragging check) — prevents iPad scroll-while-drawing
3. **Bug 5** (changedTouches fallback) — prevents future landmine from triggering
4. **Bug 4** (localStorage quota handling) — prevents silent data loss in long matches
5. **Bug 6** (schema validation on parse) — prevents crashes from stale stored data
6. **Bug 7** (landingArea for errors) — fixes analytics accuracy
7. **Bug 8** (scoringHistory memory cap) — reduces memory pressure over long matches
8. **Bug 9** (zero-length flash) — minor visual polish
