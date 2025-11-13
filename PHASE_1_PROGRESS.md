# Phase 1 Progress Report: Hybrid Visual Tracking Implementation

## Completed ✅

### 1. Extended Type System (`opponentTracking.types.ts`)

**New Types Added:**
```typescript
// Extended action types
type OpponentAttemptType = 'serve' | 'attack' | 'block' | 'dig';

// Extended result types
type OpponentAttemptResult = 'in_play' | 'kill' | 'ace' | 'error';

// New types for visual tracking
type VolleyballPosition = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6';
type TrajectorySpeed = 'short' | 'medium' | 'long';
type CourtArea = 'front' | 'back';
```

**New Interfaces:**
```typescript
// Trajectory data from visual drawing
interface TrajectoryData {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  startInBounds: boolean;
  endInBounds: boolean;
  distance: number;
  angle: number;
  speed: TrajectorySpeed;
  landingArea: CourtArea;
}

// Rotation state for both teams
interface RotationState {
  homeLineup: TeamLineup;
  opponentLineup: TeamLineup;
  homeServerPosition: VolleyballPosition | null;
  opponentServerPosition: VolleyballPosition | null;
}
```

**Updated OpponentAttempt Interface:**
- ✅ Added `trajectory?: TrajectoryData` for visual tracking
- ✅ Made player info required: `player_id`, `player_name`, `player_jersey`
- ✅ Added `player_position?: VolleyballPosition`
- ✅ Extended type to include 'block' and 'dig'
- ✅ Extended result to include 'error'

**Updated OpponentTrackingState:**
- ✅ Added visual tracking fields: `selectedPlayer`, `selectedTeam`, `selectedActionType`, `currentTrajectory`
- ✅ Added `firstServerLocked` and `firstServerPlayerId` for server locking
- ✅ Changed `attemptQueue` to `savedAttempts` (immediate save model)
- ✅ Added undo/redo stacks: `undoStack`, `redoStack`
- ✅ Added `rotation: RotationState` for both teams
- ✅ Added `isDrawing` flag

---

## In Progress 🚧

### 2. Extend OpponentTrackingContext

**What Needs to be Done:**

#### A. Update Initial State
```typescript
const initialState: OpponentTrackingState = {
  // Visual tracking (NEW)
  selectedPlayer: null,
  selectedTeam: null,
  selectedActionType: 'attack', // Default to attack
  currentTrajectory: null,
  isDrawing: false,

  // Attempt storage (CHANGED)
  savedAttempts: [], // Changed from attemptQueue

  // Undo/Redo (NEW)
  undoStack: [],
  redoStack: [],

  // Server locking (NEW)
  firstServerLocked: false,
  firstServerPlayerId: null,

  // Rotation (NEW)
  rotation: {
    homeLineup: { P1: null, P2: null, P3: null, P4: null, P5: null, P6: null },
    opponentLineup: { P1: null, P2: null, P3: null, P4: null, P5: null, P6: null },
    homeServerPosition: null,
    opponentServerPosition: null
  },

  // OLD approach (keep for backwards compatibility)
  selectedServePosition: null,
  selectedServePlayer: null,
  selectedHitPosition: null,
  selectedHitPlayer: null,
  selectedGridCell: null,
  serveDropdownsLocked: false,
  currentAttemptNumber: 1
};
```

#### B. Add New Actions
```typescript
type OpponentTrackingAction =
  // Visual tracking actions (NEW)
  | { type: 'SELECT_PLAYER'; payload: { player: OpponentPlayer; team: 'home' | 'opponent' } }
  | { type: 'SET_ACTION_TYPE'; payload: OpponentAttemptType }
  | { type: 'SET_TRAJECTORY'; payload: TrajectoryData }
  | { type: 'CLEAR_TRAJECTORY' }
  | { type: 'START_DRAWING' }
  | { type: 'STOP_DRAWING' }

  // Attempt management (NEW)
  | { type: 'SAVE_VISUAL_ATTEMPT'; payload: { result: OpponentAttemptResult } }
  | { type: 'UNDO_LAST_ATTEMPT' }
  | { type: 'REDO_ATTEMPT' }

  // Server locking (NEW)
  | { type: 'LOCK_FIRST_SERVER'; payload: string } // player_id
  | { type: 'UNLOCK_FIRST_SERVER' }
  | { type: 'VALIDATE_SERVE_ACTION' } // Auto-detect and force serve

  // Rotation management (NEW)
  | { type: 'SET_HOME_LINEUP'; payload: TeamLineup }
  | { type: 'SET_OPPONENT_LINEUP'; payload: TeamLineup }
  | { type: 'ROTATE_HOME_CLOCKWISE' }
  | { type: 'ROTATE_OPPONENT_CLOCKWISE' }
  | { type: 'SET_HOME_SERVER'; payload: VolleyballPosition }
  | { type: 'SET_OPPONENT_SERVER'; payload: VolleyballPosition }

  // OLD actions (keep)
  | { type: 'SET_SERVE_POSITION'; payload: { position: number; player: OpponentPlayer } }
  | { type: 'SET_HIT_POSITION'; payload: { position: HitPosition; player: OpponentPlayer | null } }
  | { type: 'SET_GRID_CELL'; payload: { x: number; y: number } }
  | { type: 'CLEAR_GRID_CELL' }
  | { type: 'SAVE_ATTEMPT'; payload: { result: OpponentAttemptResult } }
  | { type: 'UPDATE_LINEUP'; payload: Partial<OpponentLineup> }
  | { type: 'RESET_CURRENT_ATTEMPT' }
  | { type: 'RESET_FOR_NEW_POINT' }
  | { type: 'LOCK_SERVE_DROPDOWNS' }
  | { type: 'SET_ATTEMPT_RESULT'; payload: { attemptNumber: number; result: OpponentAttemptResult } };
```

#### C. Add New Reducer Cases

Key reducer logic to implement:

1. **SELECT_PLAYER**: Store selected player and team
2. **SET_ACTION_TYPE**: Update action type, auto-validate serve if needed
3. **SET_TRAJECTORY**: Store trajectory data from drawing
4. **SAVE_VISUAL_ATTEMPT**: Create OpponentAttempt with trajectory, add to savedAttempts, update undo stack
5. **UNDO_LAST_ATTEMPT**: Pop from savedAttempts, push to redoStack
6. **REDO_ATTEMPT**: Pop from redoStack, push back to savedAttempts
7. **LOCK_FIRST_SERVER**: Lock first server after first serve
8. **VALIDATE_SERVE_ACTION**: Auto-detect if trajectory is serve (from back court)
9. **ROTATE_HOME_CLOCKWISE/ROTATE_OPPONENT_CLOCKWISE**: Rotate lineup positions
10. **SET_HOME_SERVER/SET_OPPONENT_SERVER**: Mark which position is serving

#### D. Add New Context Functions

```typescript
interface OpponentTrackingContextValue {
  state: OpponentTrackingState;

  // Visual tracking functions (NEW)
  selectPlayer: (player: OpponentPlayer, team: 'home' | 'opponent') => void;
  setActionType: (type: OpponentAttemptType) => void;
  setTrajectory: (trajectory: TrajectoryData) => void;
  clearTrajectory: () => void;
  startDrawing: () => void;
  stopDrawing: () => void;

  // Attempt management (NEW)
  saveVisualAttempt: (result: OpponentAttemptResult) => void;
  undoLastAttempt: () => void;
  redoAttempt: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Server management (NEW)
  lockFirstServer: (playerId: string) => void;
  unlockFirstServer: () => void;
  validateServeAction: () => void;

  // Rotation management (NEW)
  setHomeLineup: (lineup: TeamLineup) => void;
  setOpponentLineup: (lineup: TeamLineup) => void;
  rotateHomeClockwise: () => void;
  rotateOpponentClockwise: () => void;
  setHomeServer: (position: VolleyballPosition) => void;
  setOpponentServer: (position: VolleyballPosition) => void;

  // OLD functions (keep)
  setServePosition: (position: number, player: OpponentPlayer) => void;
  setHitPosition: (position: HitPosition, player: OpponentPlayer | null) => void;
  setGridCell: (x: number, y: number) => void;
  clearGridCell: () => void;
  saveAttempt: (result: OpponentAttemptResult) => void;
  updateLineup: (lineup: Partial<OpponentLineup>) => void;
  resetCurrentAttempt: () => void;
  resetForNewPoint: () => void;
  lockServeDropdowns: () => void;
  setAttemptResult: (attemptNumber: number, result: OpponentAttemptResult) => void;
  canSaveAttempt: () => boolean;
  getCurrentAttemptType: () => 'serve' | 'attack' | null;
}
```

---

## Next Steps 📋

### Immediate (Today):
1. ✅ Complete OpponentTrackingContext extension
2. ✅ Test rotation logic
3. ✅ Test undo/redo system

### Tomorrow:
4. Integrate visual tracking components into StatsPage
5. Add result buttons ([In Play] [Kill] [Ace] [Error])
6. Connect player markers to real rosters
7. Implement server locking UI

### End of Week:
8. Full workflow testing
9. Keyboard shortcuts (Space bar)
10. iPad touch optimization
11. Point submission with all attempts

---

## Key Design Decisions Made

1. **Immediate Save Model**: Attempts saved to context immediately when result button clicked
2. **Undo System**: Circular buffer, last 20 attempts
3. **Server Locking**: Lock first server's player ID, not position (allows rotation)
4. **Auto-Serve Detection**: Option A - Force change to "Serve" if trajectory from back court
5. **Rotation**: Auto-advance on point end, manual override available
6. **Result Buttons**: [In Play] [Kill] [Ace] [Error]
7. **Backwards Compatibility**: Keep OLD approach fields for gradual migration

---

## Files Modified

- ✅ `/src/features/inGameStats/types/opponentTracking.types.ts`
- 🚧 `/src/features/inGameStats/context/OpponentTrackingContext.tsx` (in progress)

---

## Estimated Time Remaining

- Context extension: 2-3 hours
- Phase 2 (StatsPage integration): 1 day
- Phase 3 (Rotation & locking): 1 day
- Phase 4 (UX polish): 1 day

**Total: 3-4 days to complete hybrid system**
