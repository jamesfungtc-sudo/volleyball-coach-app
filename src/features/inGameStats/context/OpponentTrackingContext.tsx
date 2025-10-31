import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import {
  OpponentTrackingState,
  OpponentAttempt,
  OpponentPlayer,
  OpponentLineup,
  HitPosition,
  OpponentAttemptResult
} from '../types/opponentTracking.types';

// ============================================
// ACTION TYPES
// ============================================

type OpponentTrackingAction =
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
  selectedServePosition: null,
  selectedServePlayer: null,
  selectedHitPosition: null,
  selectedHitPlayer: null,
  selectedGridCell: null,
  serveDropdownsLocked: false,
  attemptQueue: [],
  currentLineup: {
    P1: null,
    P2: null,
    P3: null,
    P4: null,
    P5: null,
    P6: null
  },
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

  // Action creators
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
