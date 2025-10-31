import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import {
  OpponentAnalysisData,
  LocationEvent,
  StartingLineup,
  EventType,
  EventResult
} from '../types';

/**
 * OpponentAnalysisContext - State management for opponent analysis feature
 * Pattern follows MatchContext from inGameStats
 */

interface OpponentAnalysisState {
  // Current match data
  matchId: string | null;
  opponentTeamId: string | null;
  opponentTeamName: string | null;

  // Analysis data
  lineups: StartingLineup[];
  events: LocationEvent[];

  // UI state
  selectedSet: number | 'total';  // 1-5 or 'total'
  selectedEventType: EventType;   // 'serve' or 'attack'
  selectedPlayerId: string | null; // Sticky player selection
}

type Action =
  | { type: 'LOAD_ANALYSIS'; payload: OpponentAnalysisData }
  | { type: 'SET_MATCH'; payload: { matchId: string; opponentTeamId: string; opponentTeamName: string } }
  | { type: 'SET_SELECTED_SET'; payload: number | 'total' }
  | { type: 'SET_EVENT_TYPE'; payload: EventType }
  | { type: 'SET_SELECTED_PLAYER'; payload: string | null }
  | { type: 'ADD_EVENT'; payload: LocationEvent }
  | { type: 'UPDATE_EVENT'; payload: { id: string; updates: Partial<LocationEvent> } }
  | { type: 'DELETE_EVENT'; payload: string }
  | { type: 'SET_LINEUP'; payload: StartingLineup }
  | { type: 'RESET' };

const initialState: OpponentAnalysisState = {
  matchId: null,
  opponentTeamId: null,
  opponentTeamName: null,
  lineups: [],
  events: [],
  selectedSet: 1,
  selectedEventType: 'serve',
  selectedPlayerId: null
};

function opponentAnalysisReducer(
  state: OpponentAnalysisState,
  action: Action
): OpponentAnalysisState {
  switch (action.type) {
    case 'LOAD_ANALYSIS':
      return {
        ...state,
        matchId: action.payload.match_id,
        opponentTeamId: action.payload.opponent_team_id,
        opponentTeamName: action.payload.opponent_team_name,
        lineups: action.payload.lineups,
        events: action.payload.events
      };

    case 'SET_MATCH':
      return {
        ...state,
        matchId: action.payload.matchId,
        opponentTeamId: action.payload.opponentTeamId,
        opponentTeamName: action.payload.opponentTeamName
      };

    case 'SET_SELECTED_SET':
      return {
        ...state,
        selectedSet: action.payload
      };

    case 'SET_EVENT_TYPE':
      return {
        ...state,
        selectedEventType: action.payload
      };

    case 'SET_SELECTED_PLAYER':
      return {
        ...state,
        selectedPlayerId: action.payload
      };

    case 'ADD_EVENT':
      return {
        ...state,
        events: [...state.events, action.payload]
      };

    case 'UPDATE_EVENT':
      return {
        ...state,
        events: state.events.map(event =>
          event.id === action.payload.id
            ? { ...event, ...action.payload.updates }
            : event
        )
      };

    case 'DELETE_EVENT':
      return {
        ...state,
        events: state.events.filter(event => event.id !== action.payload)
      };

    case 'SET_LINEUP':
      return {
        ...state,
        lineups: state.lineups.some(l => l.set_number === action.payload.set_number)
          ? state.lineups.map(l =>
              l.set_number === action.payload.set_number ? action.payload : l
            )
          : [...state.lineups, action.payload]
      };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

interface OpponentAnalysisContextValue {
  state: OpponentAnalysisState;

  // Match setup
  setMatch: (matchId: string, opponentTeamId: string, opponentTeamName: string) => void;
  loadAnalysis: (data: OpponentAnalysisData) => void;

  // UI state
  setSelectedSet: (set: number | 'total') => void;
  setEventType: (type: EventType) => void;
  setSelectedPlayer: (playerId: string | null) => void;

  // Event management
  addEvent: (
    playerId: string,
    playerName: string,
    gridX: number,
    gridY: number,
    result: EventResult
  ) => void;
  updateEvent: (id: string, updates: Partial<LocationEvent>) => void;
  deleteEvent: (id: string) => void;

  // Lineup management
  setLineup: (setNumber: number, lineup: Partial<StartingLineup>) => void;

  // Filtered data
  getCurrentEvents: () => LocationEvent[];
  getCurrentLineup: () => StartingLineup | undefined;

  // Reset
  reset: () => void;
}

const OpponentAnalysisContext = createContext<OpponentAnalysisContextValue | undefined>(
  undefined
);

export function OpponentAnalysisProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(opponentAnalysisReducer, initialState);

  // Auto-save to localStorage (debounced in real implementation)
  useEffect(() => {
    if (state.matchId) {
      const data: OpponentAnalysisData = {
        match_id: state.matchId,
        opponent_team_id: state.opponentTeamId || '',
        opponent_team_name: state.opponentTeamName || '',
        lineups: state.lineups,
        events: state.events,
        created_at: Date.now(),
        updated_at: Date.now()
      };
      localStorage.setItem(
        `opponent_analysis_${state.matchId}`,
        JSON.stringify(data)
      );
    }
  }, [state.matchId, state.lineups, state.events, state.opponentTeamId, state.opponentTeamName]);

  const value: OpponentAnalysisContextValue = {
    state,

    setMatch: (matchId, opponentTeamId, opponentTeamName) => {
      dispatch({
        type: 'SET_MATCH',
        payload: { matchId, opponentTeamId, opponentTeamName }
      });
    },

    loadAnalysis: (data) => {
      dispatch({ type: 'LOAD_ANALYSIS', payload: data });
    },

    setSelectedSet: (set) => {
      dispatch({ type: 'SET_SELECTED_SET', payload: set });
    },

    setEventType: (type) => {
      dispatch({ type: 'SET_EVENT_TYPE', payload: type });
    },

    setSelectedPlayer: (playerId) => {
      dispatch({ type: 'SET_SELECTED_PLAYER', payload: playerId });
    },

    addEvent: (playerId, playerName, gridX, gridY, result) => {
      const event: LocationEvent = {
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        match_id: state.matchId || '',
        set_number: state.selectedSet === 'total' ? 1 : state.selectedSet,
        player_id: playerId,
        player_name: playerName,
        event_type: state.selectedEventType,
        result,
        grid_x: gridX,
        grid_y: gridY,
        normalized_x: (gridX + 0.5) / 6,
        normalized_y: (gridY + 0.5) / 6,
        confidence: 'high',
        timestamp: Date.now()
      };
      dispatch({ type: 'ADD_EVENT', payload: event });
    },

    updateEvent: (id, updates) => {
      dispatch({ type: 'UPDATE_EVENT', payload: { id, updates } });
    },

    deleteEvent: (id) => {
      dispatch({ type: 'DELETE_EVENT', payload: id });
    },

    setLineup: (setNumber, lineup) => {
      const fullLineup: StartingLineup = {
        id: `lineup_${state.matchId}_set${setNumber}`,
        match_id: state.matchId || '',
        set_number: setNumber,
        timestamp: Date.now(),
        ...lineup
      };
      dispatch({ type: 'SET_LINEUP', payload: fullLineup });
    },

    getCurrentEvents: () => {
      if (state.selectedSet === 'total') {
        return state.events.filter(e => e.event_type === state.selectedEventType);
      }
      return state.events.filter(
        e => e.set_number === state.selectedSet && e.event_type === state.selectedEventType
      );
    },

    getCurrentLineup: () => {
      if (state.selectedSet === 'total') {
        return undefined;
      }
      return state.lineups.find(l => l.set_number === state.selectedSet);
    },

    reset: () => {
      dispatch({ type: 'RESET' });
    }
  };

  return (
    <OpponentAnalysisContext.Provider value={value}>
      {children}
    </OpponentAnalysisContext.Provider>
  );
}

export function useOpponentAnalysis() {
  const context = useContext(OpponentAnalysisContext);
  if (!context) {
    throw new Error('useOpponentAnalysis must be used within OpponentAnalysisProvider');
  }
  return context;
}
