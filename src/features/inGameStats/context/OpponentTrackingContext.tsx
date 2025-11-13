import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import {
  OpponentTrackingState,
  OpponentAttempt,
  OpponentPlayer,
  OpponentLineup,
  HitPosition,
  OpponentAttemptResult,
  OpponentAttemptType,
  TrajectoryData,
  TeamLineup
} from '../types/opponentTracking.types';

// ============================================
// ACTION TYPES
// ============================================

type OpponentTrackingAction =
  // NEW: Core visual tracking actions
  | { type: 'SELECT_PLAYER'; payload: { player: OpponentPlayer; team: 'home' | 'opponent' } }
  | { type: 'SET_ACTION_TYPE'; payload: OpponentAttemptType }
  | { type: 'SET_TRAJECTORY'; payload: TrajectoryData }
  | { type: 'CLEAR_TRAJECTORY' }
  | { type: 'SAVE_VISUAL_ATTEMPT'; payload: { result: OpponentAttemptResult } }

  // OLD: Keep existing actions for backwards compatibility
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

// ============================================
// INITIAL STATE
// ============================================

const initialState: OpponentTrackingState = {
  // NEW: Visual tracking state
  selectedPlayer: null,
  selectedTeam: null,
  selectedActionType: 'attack', // Default to attack
  currentTrajectory: null,
  isDrawing: false,

  // NEW: Attempt storage (immediate save model)
  savedAttempts: [],

  // NEW: Placeholders for future features
  undoStack: [],
  redoStack: [],
  firstServerLocked: false,
  firstServerPlayerId: null,
  rotation: {
    homeLineup: {
      P1: null,
      P2: null,
      P3: null,
      P4: null,
      P5: null,
      P6: null
    },
    opponentLineup: {
      P1: null,
      P2: null,
      P3: null,
      P4: null,
      P5: null,
      P6: null
    },
    homeServerPosition: null,
    opponentServerPosition: null
  },

  // OLD: Keep for backwards compatibility
  selectedServePosition: null,
  selectedServePlayer: null,
  selectedHitPosition: null,
  selectedHitPlayer: null,
  selectedGridCell: null,
  serveDropdownsLocked: false,

  // Metadata
  currentAttemptNumber: 1
};

// ============================================
// REDUCER
// ============================================

function opponentTrackingReducer(
  state: OpponentTrackingState,
  action: OpponentTrackingAction
): OpponentTrackingState {
  switch (action.type) {
    // ==== NEW: VISUAL TRACKING ACTIONS ====

    case 'SELECT_PLAYER':
      return {
        ...state,
        selectedPlayer: action.payload.player,
        selectedTeam: action.payload.team
      };

    case 'SET_ACTION_TYPE':
      return {
        ...state,
        selectedActionType: action.payload
      };

    case 'SET_TRAJECTORY':
      return {
        ...state,
        currentTrajectory: action.payload,
        isDrawing: false
      };

    case 'CLEAR_TRAJECTORY':
      return {
        ...state,
        currentTrajectory: null,
        isDrawing: false
      };

    case 'SAVE_VISUAL_ATTEMPT': {
      // Validate required data
      if (!state.selectedPlayer || !state.currentTrajectory || !state.selectedTeam) {
        console.warn('Cannot save visual attempt: missing player, team, or trajectory');
        return state;
      }

      // Import coordinate calculations
      const { calculateGridCell } = require('../components/VisualTracking/coordinateCalculations');

      // Calculate grid cell from trajectory end point
      const gridCell = calculateGridCell(
        state.currentTrajectory.endX,
        state.currentTrajectory.endY
      );

      // Auto-detect hit position/serve zone based on trajectory
      let hitPosition: HitPosition | undefined;
      let servePosition: number | undefined;

      if (state.selectedActionType === 'attack') {
        // Import from coordinate calculations
        const { calculateHitPosition } = require('../components/VisualTracking/coordinateCalculations');
        hitPosition = calculateHitPosition(
          state.currentTrajectory.startX,
          state.currentTrajectory.startY,
          state.selectedTeam
        );
      } else if (state.selectedActionType === 'serve') {
        // Import from coordinate calculations
        const { calculateServeZone } = require('../components/VisualTracking/coordinateCalculations');
        const zone = calculateServeZone(
          state.currentTrajectory.endX,
          state.currentTrajectory.endY
        );
        servePosition = zone ? zone - 1 : undefined; // Convert 1-5 to 0-4
      }

      // Create the hybrid attempt object
      const newAttempt: OpponentAttempt = {
        attempt_number: state.currentAttemptNumber,
        type: state.selectedActionType,

        // Player info (required)
        player_id: state.selectedPlayer.id,
        player_name: state.selectedPlayer.name,
        player_jersey: parseInt(state.selectedPlayer.number),

        // Position-specific fields
        hit_position: hitPosition,
        serve_position: servePosition,

        // Landing grid (discrete)
        landing_grid_x: gridCell.col,
        landing_grid_y: gridCell.row,

        // Trajectory data (continuous)
        trajectory: state.currentTrajectory,

        // Result
        result: action.payload.result,

        // Timestamp
        timestamp: Date.now()
      };

      return {
        ...state,
        savedAttempts: [...state.savedAttempts, newAttempt],
        currentAttemptNumber: state.currentAttemptNumber + 1,
        currentTrajectory: null,
        // Keep player selected for next attempt
        // selectedPlayer: null,
        // selectedTeam: null,
      };
    }

    // ==== OLD: BACKWARDS COMPATIBLE ACTIONS ====

    case 'SET_SERVE_POSITION':
      return {
        ...state,
        selectedServePosition: action.payload.position,
        selectedServePlayer: action.payload.player,
        // Clear hit selection when serve is selected
        selectedHitPosition: null,
        selectedHitPlayer: null
      };

    case 'SET_HIT_POSITION':
      return {
        ...state,
        selectedHitPosition: action.payload.position,
        selectedHitPlayer: action.payload.player,
        // Clear serve selection when hit is selected
        selectedServePosition: null,
        selectedServePlayer: null
      };

    case 'SET_GRID_CELL':
      return {
        ...state,
        selectedGridCell: action.payload
      };

    case 'CLEAR_GRID_CELL':
      return {
        ...state,
        selectedGridCell: null
      };

    case 'SAVE_ATTEMPT': {
      // Validate that we have required data
      const isServe = state.selectedServePosition !== null;
      const isAttack = state.selectedHitPosition !== null;

      if (!state.selectedGridCell || (!isServe && !isAttack)) {
        console.warn('Cannot save attempt: missing required data');
        return state;
      }

      // Create the attempt object
      const newAttempt: OpponentAttempt = {
        attempt_number: state.currentAttemptNumber,
        type: isServe ? 'serve' : 'attack',
        landing_grid_x: state.selectedGridCell.x,
        landing_grid_y: state.selectedGridCell.y,
        result: action.payload.result,
        timestamp: Date.now()
      };

      // Add serve-specific data
      if (isServe && state.selectedServePosition !== null) {
        newAttempt.serve_position = state.selectedServePosition;
        if (state.selectedServePlayer) {
          newAttempt.serve_player_id = state.selectedServePlayer.id;
          newAttempt.serve_player_name = state.selectedServePlayer.name;
        }
      }

      // Add attack-specific data
      if (isAttack && state.selectedHitPosition !== null) {
        newAttempt.hit_position = state.selectedHitPosition;
        if (state.selectedHitPlayer) {
          newAttempt.hit_player_id = state.selectedHitPlayer.id;
          newAttempt.hit_player_name = state.selectedHitPlayer.name;
        }
      }

      return {
        ...state,
        attemptQueue: [...state.attemptQueue, newAttempt],
        currentAttemptNumber: state.currentAttemptNumber + 1,
        // Lock serve dropdowns after first serve
        serveDropdownsLocked: isServe ? true : state.serveDropdownsLocked,
        // Reset selections for next attempt
        selectedServePosition: null,
        selectedServePlayer: null,
        selectedHitPosition: null,
        selectedHitPlayer: null,
        selectedGridCell: null
      };
    }

    case 'UPDATE_LINEUP':
      return {
        ...state,
        currentLineup: {
          ...state.currentLineup,
          ...action.payload
        }
      };

    case 'RESET_CURRENT_ATTEMPT':
      return {
        ...state,
        selectedServePosition: null,
        selectedServePlayer: null,
        selectedHitPosition: null,
        selectedHitPlayer: null,
        selectedGridCell: null
      };

    case 'RESET_FOR_NEW_POINT':
      return {
        ...initialState,
        // Preserve lineup across points
        currentLineup: state.currentLineup
      };

    case 'LOCK_SERVE_DROPDOWNS':
      return {
        ...state,
        serveDropdownsLocked: true
      };

    case 'SET_ATTEMPT_RESULT': {
      // Update result of a specific attempt (used when kill/ace detected in main point entry)
      const updatedQueue = state.attemptQueue.map(attempt =>
        attempt.attempt_number === action.payload.attemptNumber
          ? { ...attempt, result: action.payload.result }
          : attempt
      );

      return {
        ...state,
        attemptQueue: updatedQueue
      };
    }

    default:
      return state;
  }
}

// ============================================
// CONTEXT
// ============================================

interface OpponentTrackingContextValue {
  state: OpponentTrackingState;

  // NEW: Visual tracking functions
  selectPlayer: (player: OpponentPlayer, team: 'home' | 'opponent') => void;
  setActionType: (type: OpponentAttemptType) => void;
  setTrajectory: (trajectory: TrajectoryData) => void;
  clearTrajectory: () => void;
  saveVisualAttempt: (result: OpponentAttemptResult) => void;

  // OLD: Backwards compatible functions
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

const OpponentTrackingContext = createContext<OpponentTrackingContextValue | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================

interface OpponentTrackingProviderProps {
  children: ReactNode;
}

export const OpponentTrackingProvider: React.FC<OpponentTrackingProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(opponentTrackingReducer, initialState);

  // NEW: Visual tracking action creators
  const selectPlayer = (player: OpponentPlayer, team: 'home' | 'opponent') => {
    dispatch({ type: 'SELECT_PLAYER', payload: { player, team } });
  };

  const setActionType = (type: OpponentAttemptType) => {
    dispatch({ type: 'SET_ACTION_TYPE', payload: type });
  };

  const setTrajectory = (trajectory: TrajectoryData) => {
    dispatch({ type: 'SET_TRAJECTORY', payload: trajectory });
  };

  const clearTrajectory = () => {
    dispatch({ type: 'CLEAR_TRAJECTORY' });
  };

  const saveVisualAttempt = (result: OpponentAttemptResult) => {
    dispatch({ type: 'SAVE_VISUAL_ATTEMPT', payload: { result } });
  };

  // OLD: Backwards compatible action creators
  const setServePosition = (position: number, player: OpponentPlayer) => {
    dispatch({ type: 'SET_SERVE_POSITION', payload: { position, player } });
  };

  const setHitPosition = (position: HitPosition, player: OpponentPlayer | null) => {
    dispatch({ type: 'SET_HIT_POSITION', payload: { position, player } });
  };

  const setGridCell = (x: number, y: number) => {
    dispatch({ type: 'SET_GRID_CELL', payload: { x, y } });
  };

  const clearGridCell = () => {
    dispatch({ type: 'CLEAR_GRID_CELL' });
  };

  const saveAttempt = (result: OpponentAttemptResult) => {
    dispatch({ type: 'SAVE_ATTEMPT', payload: { result } });
  };

  const updateLineup = (lineup: Partial<OpponentLineup>) => {
    dispatch({ type: 'UPDATE_LINEUP', payload: lineup });
  };

  const resetCurrentAttempt = () => {
    dispatch({ type: 'RESET_CURRENT_ATTEMPT' });
  };

  const resetForNewPoint = () => {
    dispatch({ type: 'RESET_FOR_NEW_POINT' });
  };

  const lockServeDropdowns = () => {
    dispatch({ type: 'LOCK_SERVE_DROPDOWNS' });
  };

  const setAttemptResult = (attemptNumber: number, result: OpponentAttemptResult) => {
    dispatch({ type: 'SET_ATTEMPT_RESULT', payload: { attemptNumber, result } });
  };

  // Helper functions
  const canSaveAttempt = (): boolean => {
    const hasPosition = state.selectedServePosition !== null || state.selectedHitPosition !== null;
    const hasGridCell = state.selectedGridCell !== null;
    return hasPosition && hasGridCell;
  };

  const getCurrentAttemptType = (): 'serve' | 'attack' | null => {
    if (state.selectedServePosition !== null) return 'serve';
    if (state.selectedHitPosition !== null) return 'attack';
    return null;
  };

  const value: OpponentTrackingContextValue = {
    state,

    // NEW: Visual tracking functions
    selectPlayer,
    setActionType,
    setTrajectory,
    clearTrajectory,
    saveVisualAttempt,

    // OLD: Backwards compatible functions
    setServePosition,
    setHitPosition,
    setGridCell,
    clearGridCell,
    saveAttempt,
    updateLineup,
    resetCurrentAttempt,
    resetForNewPoint,
    lockServeDropdowns,
    setAttemptResult,
    canSaveAttempt,
    getCurrentAttemptType
  };

  return (
    <OpponentTrackingContext.Provider value={value}>
      {children}
    </OpponentTrackingContext.Provider>
  );
};

// ============================================
// HOOK
// ============================================

export const useOpponentTracking = (): OpponentTrackingContextValue => {
  const context = useContext(OpponentTrackingContext);
  if (!context) {
    throw new Error('useOpponentTracking must be used within OpponentTrackingProvider');
  }
  return context;
};
