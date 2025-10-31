# Opponent Tracking Module - Implementation Plan

**Version**: 1.0
**Date**: 2025-10-29
**Target**: Integration into In-Game Stats Page (StatsPage.tsx)
**Total Estimated Time**: 20-24 hours

---

## Overview

This implementation plan breaks down the development of the Opponent Tracking Module into 8 sequential phases. Each phase is self-contained, testable, and builds upon the previous phase.

**Architecture Decision**: We will build this as a **new feature within the existing InGameStats feature**, not a separate top-level feature, since it's tightly coupled to point entry workflow.

---

## Phase 1: Create OpponentTracking Types and Interfaces

**Goal**: Define all TypeScript interfaces and types for opponent tracking

**Duration**: 1-2 hours

**Priority**: P0 (Foundation - must be done first)

---

### Tasks

#### 1.1 Create Type Definition File

**File**: `/src/features/inGameStats/types/opponentTracking.types.ts` (NEW)

```typescript
/**
 * Opponent Tracking Type Definitions
 * Used for recording opponent serve and attack patterns during matches
 */

// ============== CORE TYPES ==============

/**
 * Hitting position on volleyball court
 * P1, Pipe = Back row attacks
 * P2, P3, P4 = Front row attacks
 */
export type HitPosition = 'P1' | 'Pipe' | 'P2' | 'P3' | 'P4';

/**
 * Result of opponent action
 * - 'in_play': Rally continued after this action
 * - 'kill': Point ended, opponent won via attack
 * - 'ace': Point ended, opponent won via serve
 */
export type OpponentAttemptResult = 'in_play' | 'kill' | 'ace';

/**
 * Type of opponent action
 */
export type OpponentAttemptType = 'serve' | 'attack';

// ============== INTERFACES ==============

/**
 * Single opponent action (serve or attack) during a point
 */
export interface OpponentAttempt {
  // Metadata
  attempt_number: number;        // 1, 2, 3... within this point
  type: OpponentAttemptType;     // 'serve' | 'attack'

  // Serve-specific fields (when type === 'serve')
  serve_position?: number;       // 0-4 (dropdown index: 0=left, 4=right)
  serve_player_id?: string;      // Player ID (e.g., "opp_12")
  serve_player_name?: string;    // Display name (e.g., "#12")

  // Attack-specific fields (when type === 'attack')
  hit_position?: HitPosition;    // 'P1' | 'Pipe' | 'P2' | 'P3' | 'P4'
  hit_player_id?: string;        // Player ID
  hit_player_name?: string;      // Display name

  // Landing location (required for both types)
  landing_grid_x: number;        // 0-5 (x-coordinate on home court)
  landing_grid_y: number;        // 0-5 (y-coordinate on home court)

  // Result
  result: OpponentAttemptResult; // 'in_play' | 'kill' | 'ace'

  // Timestamp
  timestamp: number;             // Unix timestamp (ms)
}

/**
 * Current state of opponent lineup (6 positions)
 */
export interface OpponentLineup {
  P1: string | null;  // Right back (serving position in rotation 1)
  P2: string | null;  // Right front (opposite)
  P3: string | null;  // Middle front (middle blocker)
  P4: string | null;  // Left front (outside hitter)
  P5: string | null;  // Left back
  P6: string | null;  // Middle back (setter position in most rotations)
}

/**
 * Player with role information (for smart lineup tracking)
 */
export interface OpponentPlayer {
  id: string;
  name: string;         // Display name (e.g., "#7")
  number: string;       // Jersey number
  role: PlayerRole;     // Position type
}

/**
 * Volleyball position roles
 */
export type PlayerRole = 'OH' | 'MB' | 'S' | 'Opp' | 'L';
// OH = Outside Hitter
// MB = Middle Blocker
// S = Setter
// Opp = Opposite
// L = Libero

/**
 * Team roster with role assignments
 */
export interface OpponentRoster {
  outsideHitters: OpponentPlayer[];   // 2 players
  middleBlockers: OpponentPlayer[];   // 2 players
  setter: OpponentPlayer | null;      // 1 player
  opposite: OpponentPlayer | null;    // 1 player
  libero: OpponentPlayer | null;      // 1 player
  allPlayers: OpponentPlayer[];       // Full roster
}

/**
 * Component state for opponent tracking module
 */
export interface OpponentTrackingState {
  // Current input selections
  selectedServePosition: number | null;     // 0-4
  selectedServePlayer: OpponentPlayer | null;
  selectedHitPosition: HitPosition | null;
  selectedHitPlayer: OpponentPlayer | null;
  selectedGridCell: { x: number; y: number } | null;

  // Lock states
  serveDropdownsLocked: boolean;    // True after first serve recorded

  // Temporary storage (not yet submitted to PointData)
  attemptQueue: OpponentAttempt[];  // In-memory queue for current point

  // Lineup tracking
  currentLineup: OpponentLineup;    // Current 6 positions

  // Metadata
  currentAttemptNumber: number;     // Counter for next attempt
}

/**
 * Grid cell data (for heatmap/visualization)
 */
export interface GridCellData {
  x: number;
  y: number;
  count: number;        // Number of times ball landed here
  attempts: OpponentAttempt[];  // All attempts that landed in this cell
}

// ============== HELPER TYPES ==============

/**
 * Props for grid cell component
 */
export interface GridCellProps {
  x: number;
  y: number;
  isSelected: boolean;
  count?: number;
  onClick: (x: number, y: number) => void;
  disabled?: boolean;
}

/**
 * Props for lineup position cell
 */
export interface LineupCellProps {
  position: keyof OpponentLineup;  // 'P1' | 'P2' | ... | 'P6'
  player: OpponentPlayer | null;
  isHighlighted: boolean;
  onClick?: (position: keyof OpponentLineup) => void;
}
```

---

#### 1.2 Update Existing PointData Interface

**File**: `/src/types/inGameStats.types.ts` (MODIFY)

**Changes**:
```typescript
import { OpponentAttempt } from '../features/inGameStats/types/opponentTracking.types';

export interface PointData {
  // ... existing fields ...

  // NEW: Opponent tracking data
  opponent_attempts?: OpponentAttempt[];  // Optional, defaults to []
}
```

---

### Acceptance Criteria

- ✅ All TypeScript interfaces compile without errors
- ✅ Types are exported and importable from other modules
- ✅ OpponentAttempt interface matches spec exactly
- ✅ PointData interface extended with opponent_attempts field

---

## Phase 2: Build Core UI Components

**Goal**: Create reusable UI components for the opponent tracking module

**Duration**: 4-6 hours

**Priority**: P0 (Core functionality)

**Dependencies**: Phase 1 (types)

---

### Component Architecture

```
OpponentTrackingModule/
├── components/
│   ├── ServeLocationSelector.tsx
│   ├── HittingPositionSelector.tsx
│   ├── LandingGrid.tsx
│   ├── LineupSheet.tsx
│   └── InPlayButton.tsx
└── OpponentTrackingModule.css
```

---

### Tasks

#### 2.1 Create ServeLocationSelector Component

**File**: `/src/features/inGameStats/components/OpponentTracking/ServeLocationSelector.tsx` (NEW)

**Purpose**: 5 dropdowns for selecting serve position and player

**Props**:
```typescript
interface ServeLocationSelectorProps {
  players: OpponentPlayer[];          // All opponent players
  selectedPosition: number | null;    // 0-4
  selectedPlayer: OpponentPlayer | null;
  onSelect: (position: number, player: OpponentPlayer) => void;
  disabled: boolean;                  // True when locked after serve recorded
}
```

**Features**:
- 5 identical dropdowns labeled "Ser. ▼"
- Each dropdown shows all opponent players
- When player selected from dropdown X, calls `onSelect(X, player)`
- Gray out all dropdowns when `disabled === true`
- Show lock icon when disabled

**Implementation**:
```tsx
export const ServeLocationSelector: React.FC<ServeLocationSelectorProps> = ({
  players,
  selectedPosition,
  selectedPlayer,
  onSelect,
  disabled
}) => {
  const positions = [0, 1, 2, 3, 4];
  const labels = ['Left', 'Left-Center', 'Center', 'Right-Center', 'Right'];

  return (
    <div className="serve-location-selector">
      <div className="serve-dropdowns">
        {positions.map((pos) => (
          <select
            key={pos}
            className={`serve-dropdown ${disabled ? 'disabled' : ''} ${
              selectedPosition === pos ? 'selected' : ''
            }`}
            value={selectedPosition === pos && selectedPlayer ? selectedPlayer.id : ''}
            onChange={(e) => {
              const player = players.find(p => p.id === e.target.value);
              if (player) onSelect(pos, player);
            }}
            disabled={disabled}
          >
            <option value="">
              {disabled ? '🔒 Ser.' : `Ser. ${labels[pos]}`}
            </option>
            {players.map(player => (
              <option key={player.id} value={player.id}>
                {player.name}
              </option>
            ))}
          </select>
        ))}
      </div>
    </div>
  );
};
```

---

#### 2.2 Create HittingPositionSelector Component

**File**: `/src/features/inGameStats/components/OpponentTracking/HittingPositionSelector.tsx` (NEW)

**Purpose**: 5 buttons for selecting hitting position

**Props**:
```typescript
interface HittingPositionSelectorProps {
  selectedPosition: HitPosition | null;
  onSelect: (position: HitPosition) => void;
  disabled?: boolean;
}
```

**Features**:
- 2 rows: [P1] [Pipe] (back row), [P2] [P3] [P4] (front row)
- Radio button behavior (only one selected at a time)
- Selected button highlighted with purple background

**Implementation**:
```tsx
export const HittingPositionSelector: React.FC<HittingPositionSelectorProps> = ({
  selectedPosition,
  onSelect,
  disabled = false
}) => {
  const backRowPositions: HitPosition[] = ['P1', 'Pipe'];
  const frontRowPositions: HitPosition[] = ['P2', 'P3', 'P4'];

  return (
    <div className="hitting-position-selector">
      <div className="hit-row back-row">
        {backRowPositions.map(pos => (
          <button
            key={pos}
            className={`hit-button ${selectedPosition === pos ? 'selected' : ''}`}
            onClick={() => onSelect(pos)}
            disabled={disabled}
          >
            {pos}
          </button>
        ))}
      </div>
      <div className="hit-row front-row">
        {frontRowPositions.map(pos => (
          <button
            key={pos}
            className={`hit-button ${selectedPosition === pos ? 'selected' : ''}`}
            onClick={() => onSelect(pos)}
            disabled={disabled}
          >
            {pos}
          </button>
        ))}
      </div>
    </div>
  );
};
```

---

#### 2.3 Create LandingGrid Component

**File**: `/src/features/inGameStats/components/OpponentTracking/LandingGrid.tsx` (NEW)

**Purpose**: 6×6 grid for ball landing location

**Props**:
```typescript
interface LandingGridProps {
  selectedCell: { x: number; y: number } | null;
  onCellClick: (x: number, y: number) => void;
  previousAttempts?: OpponentAttempt[];  // For heatmap (optional)
  disabled?: boolean;
}
```

**Features**:
- 36 cells (6×6) with coordinates displayed
- y=5 at top (net), y=0 at bottom (baseline)
- x=0 at left (P4 side), x=5 at right (P2 side)
- Show cell count from previousAttempts (optional heatmap)

**Implementation**:
```tsx
export const LandingGrid: React.FC<LandingGridProps> = ({
  selectedCell,
  onCellClick,
  previousAttempts = [],
  disabled = false
}) => {
  // Calculate cell counts for heatmap
  const getCellCount = (x: number, y: number): number => {
    return previousAttempts.filter(
      a => a.landing_grid_x === x && a.landing_grid_y === y
    ).length;
  };

  // Render grid from top (y=5) to bottom (y=0)
  const renderGrid = () => {
    const rows = [];
    for (let y = 5; y >= 0; y--) {
      const cells = [];
      for (let x = 0; x < 6; x++) {
        const count = getCellCount(x, y);
        const isSelected = selectedCell?.x === x && selectedCell?.y === y;

        cells.push(
          <button
            key={`${x}-${y}`}
            className={`grid-cell ${isSelected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
            onClick={() => !disabled && onCellClick(x, y)}
            disabled={disabled}
          >
            <span className="cell-coord">({x},{y})</span>
            {count > 0 && <span className="cell-count">{count}</span>}
          </button>
        );
      }
      rows.push(
        <div key={y} className="grid-row">
          {cells}
        </div>
      );
    }
    return rows;
  };

  return (
    <div className="landing-grid">
      <div className="grid-label top">← Net (Near) →</div>
      <div className="grid-container">{renderGrid()}</div>
      <div className="grid-label bottom">← Baseline (Far) →</div>
    </div>
  );
};
```

---

#### 2.4 Create LineupSheet Component

**File**: `/src/features/inGameStats/components/OpponentTracking/LineupSheet.tsx` (NEW)

**Purpose**: Display opponent lineup with 6 positions

**Props**:
```typescript
interface LineupSheetProps {
  lineup: OpponentLineup;
  highlightedPosition: keyof OpponentLineup | null;  // Which position to highlight
  onPositionClick?: (position: keyof OpponentLineup) => void;  // For manual override
}
```

**Features**:
- Shows 6 positions in 2 rows (front/back)
- Highlighted position shown with purple background
- Clickable for manual player override (future)

**Implementation**:
```tsx
export const LineupSheet: React.FC<LineupSheetProps> = ({
  lineup,
  highlightedPosition,
  onPositionClick
}) => {
  const frontRow: (keyof OpponentLineup)[] = ['P4', 'P3', 'P2'];
  const backRow: (keyof OpponentLineup)[] = ['P5', 'P6', 'P1'];

  const renderPosition = (position: keyof OpponentLineup) => {
    const player = lineup[position];
    const isHighlighted = highlightedPosition === position;

    return (
      <div
        key={position}
        className={`lineup-cell ${isHighlighted ? 'highlighted' : ''} ${
          onPositionClick ? 'clickable' : ''
        }`}
        onClick={() => onPositionClick?.(position)}
      >
        <div className="position-label">{position}</div>
        <div className="player-number">{player || '—'}</div>
      </div>
    );
  };

  return (
    <div className="lineup-sheet">
      <div className="lineup-header">--- Opponent ---</div>
      <div className="lineup-row front-row">
        {frontRow.map(renderPosition)}
      </div>
      <div className="lineup-row back-row">
        {backRow.map(renderPosition)}
      </div>
    </div>
  );
};
```

---

#### 2.5 Create InPlayButton Component

**File**: `/src/features/inGameStats/components/OpponentTracking/InPlayButton.tsx` (NEW)

**Purpose**: Large button to save attempt and continue rally

**Props**:
```typescript
interface InPlayButtonProps {
  disabled: boolean;    // Disabled if required fields not filled
  onClick: () => void;
}
```

**Implementation**:
```tsx
export const InPlayButton: React.FC<InPlayButtonProps> = ({
  disabled,
  onClick
}) => {
  return (
    <button
      className={`in-play-button ${disabled ? 'disabled' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      In-play
    </button>
  );
};
```

---

#### 2.6 Create Component Styles

**File**: `/src/features/inGameStats/components/OpponentTracking/OpponentTracking.css` (NEW)

**Key styles**:
```css
/* Serve Location Selector */
.serve-location-selector {
  margin-bottom: 12px;
}

.serve-dropdowns {
  display: flex;
  gap: 8px;
  justify-content: space-between;
}

.serve-dropdown {
  flex: 1;
  padding: 8px 12px;
  border: 2px solid #e5e7eb;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  background: white;
}

.serve-dropdown.selected {
  border-color: #3b82f6;
  background: #eff6ff;
}

.serve-dropdown.disabled {
  background: #f3f4f6;
  color: #9ca3af;
  cursor: not-allowed;
}

/* Hitting Position Selector */
.hitting-position-selector {
  margin-bottom: 12px;
}

.hit-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.hit-button {
  flex: 1;
  padding: 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.hit-button.selected {
  background: #8b5cf6;
  border-color: #8b5cf6;
  color: white;
}

.hit-button:hover:not(.selected) {
  border-color: #8b5cf6;
}

/* Landing Grid */
.landing-grid {
  margin-bottom: 12px;
}

.grid-container {
  border: 2px solid #374151;
  display: inline-block;
}

.grid-row {
  display: flex;
}

.grid-cell {
  width: 60px;
  height: 60px;
  border: 1px solid #e5e7eb;
  background: white;
  cursor: pointer;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.grid-cell:hover:not(.disabled) {
  background: #f3f4f6;
}

.grid-cell.selected {
  background: #8b5cf6;
  color: white;
  border-color: #6d28d9;
}

.cell-coord {
  font-size: 0.625rem;
  color: #9ca3af;
}

.cell-count {
  position: absolute;
  top: 2px;
  right: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #3b82f6;
}

.grid-label {
  text-align: center;
  font-size: 0.75rem;
  color: #6b7280;
  margin: 4px 0;
}

/* Lineup Sheet */
.lineup-sheet {
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
}

.lineup-header {
  text-align: center;
  font-weight: 600;
  margin-bottom: 12px;
  color: #374151;
}

.lineup-row {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-bottom: 8px;
}

.lineup-cell {
  width: 60px;
  height: 60px;
  border: 2px solid #e5e7eb;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: white;
}

.lineup-cell.highlighted {
  background: #8b5cf6;
  border-color: #8b5cf6;
  color: white;
}

.lineup-cell.clickable {
  cursor: pointer;
}

.lineup-cell.clickable:hover {
  border-color: #8b5cf6;
}

.position-label {
  font-size: 0.625rem;
  font-weight: 600;
  margin-bottom: 2px;
}

.player-number {
  font-size: 1rem;
  font-weight: 700;
}

/* In-Play Button */
.in-play-button {
  width: 100%;
  padding: 16px;
  background: #8b5cf6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.in-play-button:hover:not(.disabled) {
  background: #7c3aed;
}

.in-play-button.disabled {
  background: #d1d5db;
  cursor: not-allowed;
}
```

---

### Acceptance Criteria

- ✅ All 5 components render without errors
- ✅ ServeLocationSelector shows 5 dropdowns with player options
- ✅ HittingPositionSelector shows correct layout (2 rows)
- ✅ LandingGrid shows 36 cells with correct coordinates (y=5 top, y=0 bottom)
- ✅ LineupSheet shows 6 positions in 2 rows
- ✅ InPlayButton is styled correctly
- ✅ Components respond to click events
- ✅ Selected states display correctly (purple highlights)

---

## Phase 3: Implement OpponentTracking State Management

**Goal**: Create context and hooks for managing opponent tracking state

**Duration**: 3-4 hours

**Priority**: P0 (Core functionality)

**Dependencies**: Phase 1 (types), Phase 2 (components)

---

### Tasks

#### 3.1 Create OpponentTracking Context

**File**: `/src/features/inGameStats/context/OpponentTrackingContext.tsx` (NEW)

**Purpose**: Manage opponent tracking state separate from main MatchContext

**State Structure**:
```typescript
interface OpponentTrackingContextValue {
  state: OpponentTrackingState;

  // Actions
  selectServePosition: (position: number, player: OpponentPlayer) => void;
  selectHitPosition: (position: HitPosition) => void;
  selectGridCell: (x: number, y: number) => void;
  saveAttempt: () => void;  // Saves to attemptQueue and resets inputs
  clearAttempts: () => void; // Clears attemptQueue (when point ends)

  // Helpers
  canSubmitAttempt: () => boolean;  // Validation for [In-play] button
  getAttemptQueue: () => OpponentAttempt[];
  finalizeLastAttempt: (result: OpponentAttemptResult) => void; // For kills/aces
}
```

**Implementation**:
```typescript
import React, { createContext, useContext, useReducer } from 'react';
import { OpponentTrackingState, OpponentAttempt, HitPosition, OpponentPlayer } from '../types/opponentTracking.types';

type Action =
  | { type: 'SELECT_SERVE_POSITION'; payload: { position: number; player: OpponentPlayer } }
  | { type: 'SELECT_HIT_POSITION'; payload: HitPosition }
  | { type: 'SELECT_GRID_CELL'; payload: { x: number; y: number } }
  | { type: 'SAVE_ATTEMPT' }
  | { type: 'CLEAR_ATTEMPTS' }
  | { type: 'FINALIZE_LAST_ATTEMPT'; payload: OpponentAttemptResult };

const initialState: OpponentTrackingState = {
  selectedServePosition: null,
  selectedServePlayer: null,
  selectedHitPosition: null,
  selectedHitPlayer: null,
  selectedGridCell: null,
  serveDropdownsLocked: false,
  attemptQueue: [],
  currentLineup: {
    P1: null, P2: null, P3: null, P4: null, P5: null, P6: null
  },
  currentAttemptNumber: 1
};

function reducer(state: OpponentTrackingState, action: Action): OpponentTrackingState {
  switch (action.type) {
    case 'SELECT_SERVE_POSITION':
      return {
        ...state,
        selectedServePosition: action.payload.position,
        selectedServePlayer: action.payload.player,
        // Clear hit selection if serve selected
        selectedHitPosition: null,
        selectedHitPlayer: null
      };

    case 'SELECT_HIT_POSITION':
      return {
        ...state,
        selectedHitPosition: action.payload,
        // Auto-populate player from lineup
        selectedHitPlayer: null, // Will be set by lineup logic
        // Clear serve selection if hit selected
        selectedServePosition: null,
        selectedServePlayer: null
      };

    case 'SELECT_GRID_CELL':
      return {
        ...state,
        selectedGridCell: action.payload
      };

    case 'SAVE_ATTEMPT': {
      // Build attempt object
      const newAttempt: OpponentAttempt = {
        attempt_number: state.currentAttemptNumber,
        type: state.selectedServePlayer ? 'serve' : 'attack',
        timestamp: Date.now(),
        landing_grid_x: state.selectedGridCell!.x,
        landing_grid_y: state.selectedGridCell!.y,
        result: 'in_play', // Default, can be changed later

        // Serve fields
        ...(state.selectedServePlayer && {
          serve_position: state.selectedServePosition!,
          serve_player_id: state.selectedServePlayer.id,
          serve_player_name: state.selectedServePlayer.name
        }),

        // Attack fields
        ...(state.selectedHitPlayer && {
          hit_position: state.selectedHitPosition!,
          hit_player_id: state.selectedHitPlayer.id,
          hit_player_name: state.selectedHitPlayer.name
        })
      };

      return {
        ...state,
        attemptQueue: [...state.attemptQueue, newAttempt],
        // Reset inputs
        selectedServePosition: null,
        selectedServePlayer: null,
        selectedHitPosition: null,
        selectedHitPlayer: null,
        selectedGridCell: null,
        // Lock serve dropdowns if this was a serve
        serveDropdownsLocked: newAttempt.type === 'serve' || state.serveDropdownsLocked,
        currentAttemptNumber: state.currentAttemptNumber + 1
      };
    }

    case 'CLEAR_ATTEMPTS':
      return {
        ...initialState,
        currentLineup: state.currentLineup // Preserve lineup
      };

    case 'FINALIZE_LAST_ATTEMPT': {
      if (state.attemptQueue.length === 0) return state;

      const updatedQueue = [...state.attemptQueue];
      updatedQueue[updatedQueue.length - 1].result = action.payload;

      return {
        ...state,
        attemptQueue: updatedQueue
      };
    }

    default:
      return state;
  }
}

const OpponentTrackingContext = createContext<OpponentTrackingContextValue | null>(null);

export function OpponentTrackingProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const value: OpponentTrackingContextValue = {
    state,

    selectServePosition: (position, player) => {
      dispatch({ type: 'SELECT_SERVE_POSITION', payload: { position, player } });
    },

    selectHitPosition: (position) => {
      dispatch({ type: 'SELECT_HIT_POSITION', payload: position });
    },

    selectGridCell: (x, y) => {
      dispatch({ type: 'SELECT_GRID_CELL', payload: { x, y } });
    },

    saveAttempt: () => {
      dispatch({ type: 'SAVE_ATTEMPT' });
    },

    clearAttempts: () => {
      dispatch({ type: 'CLEAR_ATTEMPTS' });
    },

    canSubmitAttempt: () => {
      const hasPlayerSelected = state.selectedServePlayer || state.selectedHitPlayer;
      const hasGridSelected = state.selectedGridCell !== null;
      return hasPlayerSelected && hasGridSelected;
    },

    getAttemptQueue: () => state.attemptQueue,

    finalizeLastAttempt: (result) => {
      dispatch({ type: 'FINALIZE_LAST_ATTEMPT', payload: result });
    }
  };

  return (
    <OpponentTrackingContext.Provider value={value}>
      {children}
    </OpponentTrackingContext.Provider>
  );
}

export function useOpponentTracking() {
  const context = useContext(OpponentTrackingContext);
  if (!context) {
    throw new Error('useOpponentTracking must be used within OpponentTrackingProvider');
  }
  return context;
}
```

---

### Acceptance Criteria

- ✅ Context provides all required actions
- ✅ State updates correctly when actions dispatched
- ✅ `saveAttempt()` creates OpponentAttempt object with correct fields
- ✅ Serve dropdowns lock after first serve saved
- ✅ `canSubmitAttempt()` validates required fields
- ✅ `clearAttempts()` resets state properly

---

## Phase 4: Create Main OpponentTrackingModule Container

**Goal**: Assemble all components into one cohesive module

**Duration**: 2-3 hours

**Priority**: P0 (Core functionality)

**Dependencies**: Phase 1-3 (types, components, context)

---

### Tasks

#### 4.1 Create OpponentTrackingModule Component

**File**: `/src/features/inGameStats/components/OpponentTracking/OpponentTrackingModule.tsx` (NEW)

**Purpose**: Main container that orchestrates all child components

**Implementation**:
```tsx
import React from 'react';
import { useOpponentTracking } from '../../context/OpponentTrackingContext';
import { ServeLocationSelector } from './ServeLocationSelector';
import { HittingPositionSelector } from './HittingPositionSelector';
import { LandingGrid } from './LandingGrid';
import { LineupSheet } from './LineupSheet';
import { InPlayButton } from './InPlayButton';
import './OpponentTracking.css';

interface OpponentTrackingModuleProps {
  opponentPlayers: OpponentPlayer[];  // All opponent players
  previousAttempts?: OpponentAttempt[]; // For heatmap
}

export const OpponentTrackingModule: React.FC<OpponentTrackingModuleProps> = ({
  opponentPlayers,
  previousAttempts = []
}) => {
  const {
    state,
    selectServePosition,
    selectHitPosition,
    selectGridCell,
    saveAttempt,
    canSubmitAttempt
  } = useOpponentTracking();

  // Determine which lineup position to highlight
  const getHighlightedPosition = (): keyof OpponentLineup | null => {
    if (state.selectedHitPosition) {
      // Map hit position to lineup position
      const positionMap: Record<HitPosition, keyof OpponentLineup> = {
        'P1': 'P1',
        'Pipe': 'P6',
        'P2': 'P2',
        'P3': 'P3',
        'P4': 'P4'
      };
      return positionMap[state.selectedHitPosition];
    }
    return null;
  };

  return (
    <div className="opponent-tracking-module">
      <div className="module-header">
        <h3>Opponent Tracking</h3>
        <span className="attempt-counter">
          Attempts: {state.attemptQueue.length}
        </span>
      </div>

      {/* Serve Location Selection */}
      <div className="module-section">
        <ServeLocationSelector
          players={opponentPlayers}
          selectedPosition={state.selectedServePosition}
          selectedPlayer={state.selectedServePlayer}
          onSelect={selectServePosition}
          disabled={state.serveDropdownsLocked}
        />
      </div>

      {/* Hitting Position Selection */}
      <div className="module-section">
        <HittingPositionSelector
          selectedPosition={state.selectedHitPosition}
          onSelect={selectHitPosition}
        />
      </div>

      {/* Grid + Lineup Side-by-Side */}
      <div className="module-section grid-lineup-row">
        <div className="grid-container">
          <LandingGrid
            selectedCell={state.selectedGridCell}
            onCellClick={selectGridCell}
            previousAttempts={previousAttempts}
          />
        </div>

        <div className="lineup-container">
          <LineupSheet
            lineup={state.currentLineup}
            highlightedPosition={getHighlightedPosition()}
          />
        </div>
      </div>

      {/* In-Play Button */}
      <div className="module-section">
        <InPlayButton
          disabled={!canSubmitAttempt()}
          onClick={saveAttempt}
        />
      </div>
    </div>
  );
};
```

---

#### 4.2 Add Module Container Styles

**File**: `/src/features/inGameStats/components/OpponentTracking/OpponentTracking.css` (ADD TO EXISTING)

```css
/* Module Container */
.opponent-tracking-module {
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.module-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid #e5e7eb;
}

.module-header h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 700;
  color: #111827;
}

.attempt-counter {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 600;
}

.module-section {
  margin-bottom: 16px;
}

.module-section:last-child {
  margin-bottom: 0;
}

/* Grid + Lineup Layout */
.grid-lineup-row {
  display: grid;
  grid-template-columns: 1fr 200px;
  gap: 16px;
}

.grid-container {
  display: flex;
  justify-content: center;
}

.lineup-container {
  display: flex;
  align-items: center;
}
```

---

### Acceptance Criteria

- ✅ OpponentTrackingModule renders all child components
- ✅ Grid and lineup sheet positioned side-by-side
- ✅ Attempt counter shows correct count
- ✅ All interactions work (serve select, hit select, grid click, in-play)
- ✅ [In-play] button enables/disables based on validation
- ✅ Module is self-contained and reusable

---

## Phase 5: Integrate Module into StatsPage

**Goal**: Add OpponentTrackingModule to StatsPage above point entry form

**Duration**: 2-3 hours

**Priority**: P0 (Core integration)

**Dependencies**: Phase 1-4 (complete module)

---

### Tasks

#### 5.1 Wrap StatsPage with OpponentTrackingProvider

**File**: `/src/pages/StatsPage.tsx` (MODIFY)

**Changes**:
```tsx
import { OpponentTrackingProvider } from '../features/inGameStats/context/OpponentTrackingContext';
import { OpponentTrackingModule } from '../features/inGameStats/components/OpponentTracking/OpponentTrackingModule';

function StatsPageContent() {
  // Existing code...
  const { homeTeam, opponentTeam, homeRoster, opponentRoster } = useMatch();

  return (
    <div className="stats-page">
      {/* Existing header/navigation */}
      <div className="stats-header">
        {/* ... existing header content ... */}
      </div>

      {/* NEW: Opponent Tracking Module */}
      <OpponentTrackingModule
        opponentPlayers={opponentRoster.map(p => ({
          id: p.player_id,
          name: p.number ? `#${p.number}` : p.name,
          number: p.number || '',
          role: 'OH' // TODO: Get from player data
        }))}
      />

      {/* Existing point entry form */}
      <PointEntryForm />

      {/* Existing stats dashboard */}
      {viewMode === 'stats' && <StatsDashboard />}
    </div>
  );
}

export default function StatsPage() {
  // Existing match loading logic...

  return (
    <PageLayout>
      <MatchProvider initialMatch={match}>
        <OpponentTrackingProvider>  {/* NEW: Wrap with provider */}
          <StatsPageContent />
        </OpponentTrackingProvider>
      </MatchProvider>
    </PageLayout>
  );
}
```

---

#### 5.2 Update Page Styles for Layout

**File**: `/src/pages/StatsPage.css` (MODIFY)

**Changes**:
```css
.stats-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  max-width: 1400px;
  margin: 0 auto;
}

.stats-header {
  /* Existing styles, make more compact */
  padding: 12px;
  margin-bottom: 0; /* Remove extra margin */
}

/* Ensure opponent module is above point entry */
.opponent-tracking-module {
  order: 1; /* First */
}

.point-entry-form {
  order: 2; /* Second */
}

.stats-dashboard {
  order: 3; /* Third */
}
```

---

### Acceptance Criteria

- ✅ OpponentTrackingModule appears at top of StatsPage
- ✅ Module positioned above PointEntryForm
- ✅ Opponent players populate serve dropdowns
- ✅ No layout issues or overlapping elements
- ✅ Page is scrollable if content overflows

---

## Phase 6: Connect to MatchContext and Point Submission

**Goal**: Link opponent tracking data to point submission flow

**Duration**: 3-4 hours

**Priority**: P0 (Critical integration)

**Dependencies**: Phase 1-5 (module integrated)

---

### Tasks

#### 6.1 Update MatchContext to Include Opponent Attempts

**File**: `/src/features/inGameStats/context/MatchContext.tsx` (MODIFY)

**Changes**:
```typescript
// Add to MatchContext actions
addPoint: (
  pointData: Omit<PointData, 'point_number'>,
  opponentAttempts: OpponentAttempt[]  // NEW parameter
) => void;
```

**Implementation**:
```typescript
case 'ADD_POINT': {
  const newPoint: PointData = {
    ...action.payload.pointData,
    point_number: getNextPointNumber(state),
    opponent_attempts: action.payload.opponentAttempts || []  // NEW field
  };

  // Rest of existing logic...
}
```

---

#### 6.2 Update PointEntryForm to Submit Opponent Attempts

**File**: `/src/features/inGameStats/components/PointEntryForm.tsx` (MODIFY)

**Changes**:
```tsx
import { useOpponentTracking } from '../context/OpponentTrackingContext';

export const PointEntryForm: React.FC = () => {
  const { addPoint } = useMatch();
  const {
    getAttemptQueue,
    clearAttempts,
    finalizeLastAttempt
  } = useOpponentTracking();

  // Existing state...

  const handleSubmit = () => {
    // Get opponent attempts
    const opponentAttempts = getAttemptQueue();

    // Finalize last attempt if needed
    if (opponentAttempts.length > 0) {
      const lastAttempt = opponentAttempts[opponentAttempts.length - 1];

      // If last attempt doesn't have result set (no [In-play] clicked)
      if (lastAttempt.result === 'in_play' && winLoss === 'loss') {
        // Determine if kill or ace
        if (actionType === 'Op. Att.') {
          finalizeLastAttempt('kill');
        } else if (actionType === 'Op. Ace') {
          finalizeLastAttempt('ace');
        }
      }
    }

    // Build point data
    const pointData: Omit<PointData, 'point_number'> = {
      // ... existing fields ...
    };

    // Submit with opponent attempts
    addPoint(pointData, opponentAttempts);

    // Clear opponent tracking
    clearAttempts();

    // Reset form...
  };

  // Rest of component...
};
```

---

#### 6.3 Update Google Sheets Save Function

**File**: `/src/services/googleSheetsAPI.ts` (MODIFY)

**Changes**:
```typescript
export async function updateMatch(matchId: string, matchData: MatchData): Promise<void> {
  // Existing code...

  // When saving points, serialize opponent_attempts as JSON
  const pointsData = matchData.sets.flatMap(set =>
    set.points.map(point => ({
      // ... existing fields ...
      opponent_attempts: JSON.stringify(point.opponent_attempts || [])  // NEW field
    }))
  );

  // Rest of save logic...
}
```

---

### Acceptance Criteria

- ✅ Point submission includes opponent_attempts array
- ✅ Last attempt result finalized correctly based on action type
- ✅ Opponent tracking state clears after point submission
- ✅ Data saves to Google Sheets correctly (JSON serialized)
- ✅ Serve dropdowns unlock after point submission

---

## Phase 7: Implement Smart Lineup Tracking

**Goal**: Auto-update lineup based on serve selection

**Duration**: 4-5 hours

**Priority**: P1 (Nice to have, can defer)

**Dependencies**: Phase 1-6 (core functionality complete)

---

### Tasks

#### 7.1 Create Lineup Calculation Utilities

**File**: `/src/features/inGameStats/utils/lineupCalculations.ts` (NEW)

**Functions**:
```typescript
/**
 * Calculate lineup positions based on serving player
 */
export function calculateLineupFromServer(
  servingPlayer: OpponentPlayer,
  roster: OpponentRoster
): OpponentLineup {
  // Implementation based on spec logic
  // Returns OpponentLineup with all 6 positions filled
}

/**
 * Rotate array to put serving player at P1
 */
function rotateToServerPosition(
  rotation: OpponentPlayer[],
  servingPlayer: OpponentPlayer
): OpponentPlayer[] {
  // Array rotation logic
}
```

---

#### 7.2 Add Lineup Update to OpponentTrackingContext

**Changes to context**:
```typescript
case 'SELECT_SERVE_POSITION': {
  // Existing code...

  // NEW: Calculate lineup
  const newLineup = calculateLineupFromServer(
    action.payload.player,
    roster // Need to pass roster to context
  );

  return {
    ...state,
    selectedServePosition: action.payload.position,
    selectedServePlayer: action.payload.player,
    currentLineup: newLineup  // Update lineup
  };
}
```

---

#### 7.3 Auto-populate Player on Hit Selection

**Changes to context**:
```typescript
case 'SELECT_HIT_POSITION': {
  const lineupPosition = mapHitPositionToLineup(action.payload);
  const player = state.currentLineup[lineupPosition];

  return {
    ...state,
    selectedHitPosition: action.payload,
    selectedHitPlayer: player ? findPlayerById(player) : null  // Auto-populate
  };
}
```

---

### Acceptance Criteria

- ✅ Selecting serve player updates lineup automatically
- ✅ Clicking hit position auto-populates expected player
- ✅ Lineup updates follow volleyball rotation rules
- ✅ System handles libero substitutions

---

## Phase 8: Validation, Testing, and Polish

**Goal**: Ensure robust error handling and smooth UX

**Duration**: 3-4 hours

**Priority**: P0 (Critical for production)

**Dependencies**: Phase 1-7 (all features complete)

---

### Tasks

#### 8.1 Add Input Validation

- ✅ Prevent multiple serves per point
- ✅ Require grid selection before [In-play]
- ✅ Show error messages for invalid states
- ✅ Disable irrelevant buttons at appropriate times

#### 8.2 Add User Feedback

- ✅ Toast notifications on attempt saved
- ✅ Visual confirmation when [In-play] clicked
- ✅ Show attempt count in module header
- ✅ Highlight newly added attempts briefly

#### 8.3 Handle Edge Cases

- ✅ No opponent players available (show message)
- ✅ Point submitted with no attempts (empty array)
- ✅ User navigates away mid-rally (preserve state or warn)
- ✅ Multiple rapid clicks on [In-play] (debounce)

#### 8.4 Performance Testing

- ✅ Test with 50+ points in a set
- ✅ Ensure grid renders quickly (< 100ms)
- ✅ Check memory usage with long rallies

#### 8.5 Cross-browser Testing

- ✅ Test on Safari (iOS)
- ✅ Test on Chrome (Android)
- ✅ Test on desktop browsers
- ✅ Verify touch targets are large enough (tablet)

---

### Acceptance Criteria

- ✅ No console errors or warnings
- ✅ All edge cases handled gracefully
- ✅ Module feels responsive and snappy
- ✅ Users can complete workflow in < 10 seconds per point

---

## Testing Plan

### Unit Tests

```typescript
// OpponentTrackingContext.test.tsx
describe('OpponentTrackingContext', () => {
  it('should lock serve dropdowns after first serve', () => {
    // Test logic
  });

  it('should clear state after clearAttempts()', () => {
    // Test logic
  });

  it('should finalize last attempt result correctly', () => {
    // Test logic
  });
});
```

### Integration Tests

```typescript
// OpponentTrackingModule.test.tsx
describe('OpponentTrackingModule Integration', () => {
  it('should complete serve → grid → in-play workflow', () => {
    // Test full workflow
  });

  it('should handle multiple attacks in one point', () => {
    // Test long rally scenario
  });
});
```

### Manual Testing Checklist

- [ ] Record serve ace (1 attempt, result: ace)
- [ ] Record serve + attack kill (2 attempts, last is kill)
- [ ] Record long rally (5+ attacks, all in_play except last)
- [ ] Record point with no opponent tracking (empty array)
- [ ] Verify serve dropdowns lock/unlock correctly
- [ ] Verify data saves to Google Sheets correctly
- [ ] Test on tablet device (iPad)

---

## Timeline Summary

| Phase | Duration | Priority | Can Defer? |
|-------|----------|----------|------------|
| Phase 1: Types | 1-2 hours | P0 | ❌ No |
| Phase 2: Components | 4-6 hours | P0 | ❌ No |
| Phase 3: Context | 3-4 hours | P0 | ❌ No |
| Phase 4: Module Container | 2-3 hours | P0 | ❌ No |
| Phase 5: Integration | 2-3 hours | P0 | ❌ No |
| Phase 6: Point Submission | 3-4 hours | P0 | ❌ No |
| Phase 7: Smart Lineup | 4-5 hours | P1 | ✅ Yes |
| Phase 8: Testing & Polish | 3-4 hours | P0 | ❌ No |

**Total Time (P0 only)**: 18-26 hours
**Total Time (including P1)**: 22-31 hours

---

## Risk Mitigation

### Risk 1: Grid Rendering Performance
- **Mitigation**: Use React.memo on GridCell components
- **Fallback**: Remove heatmap feature if too slow

### Risk 2: Complex State Management
- **Mitigation**: Keep OpponentTrackingContext separate from MatchContext
- **Fallback**: Use simple useState if context is overkill

### Risk 3: Data Serialization Issues
- **Mitigation**: Test JSON.stringify/parse thoroughly
- **Fallback**: Store as separate table in Google Sheets

### Risk 4: Mobile Touch Targets Too Small
- **Mitigation**: Minimum 44px touch targets (iOS guideline)
- **Fallback**: Increase cell size from 60px to 80px

---

## Success Metrics

**Definition of Done**:
- ✅ Coach can record serve + multiple attacks in < 15 seconds
- ✅ Data persists correctly to Google Sheets
- ✅ Zero console errors during normal workflow
- ✅ Module works on tablet (iPad 10.2" tested)
- ✅ All P0 acceptance criteria met

**Post-Launch Goals**:
- 80% of points have opponent tracking data
- Average rally recorded: 2.5 attempts per point
- < 5% error rate (failed submissions)
- User feedback rating > 4/5

---

## Next Steps After Implementation

1. **Phase 9: Analytics Dashboard** (Future)
   - Visualize opponent patterns post-game
   - Heatmaps by player
   - Tendency reports

2. **Phase 10: Export & Sharing** (Future)
   - Export opponent analysis to PDF
   - Share with assistant coaches
   - Video sync

3. **Phase 11: Advanced Features** (Future)
   - Voice input for hands-free recording
   - Gesture-based quick entry
   - Predictive suggestions based on patterns

---

**End of Implementation Plan**

This plan provides a clear roadmap for implementing the Opponent Tracking Module. Each phase is independent and testable, allowing for incremental progress and early validation.
