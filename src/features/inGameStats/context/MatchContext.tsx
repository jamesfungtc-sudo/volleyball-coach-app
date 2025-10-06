import React, { createContext, useContext, useReducer, useMemo, ReactNode } from 'react';
import type {
  MatchData,
  PointData,
  TeamData,
  PlayerData,
  InGameStatsUIState
} from '../../../types/inGameStats.types';

// Context State
interface MatchState {
  match: MatchData | null;
  currentSet: number;
  uiState: InGameStatsUIState;
}

// Context Actions
type MatchAction =
  | { type: 'SET_MATCH'; payload: MatchData }
  | { type: 'ADD_POINT'; payload: PointData }
  | { type: 'UNDO_LAST_POINT' }
  | { type: 'SET_CURRENT_SET'; payload: number | 'Total' }
  | { type: 'SET_VIEW_MODE'; payload: 'list' | 'stats' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

// Context Value
interface MatchContextValue {
  state: MatchState;
  dispatch: React.Dispatch<MatchAction>;
  // Computed values
  currentSetData: PointData[];
  homeTeam: TeamData | null;
  opponentTeam: TeamData | null;
  currentScore: { home: number; opponent: number };
}

// Create Context
const MatchContext = createContext<MatchContextValue | undefined>(undefined);

// Reducer
function matchReducer(state: MatchState, action: MatchAction): MatchState {
  switch (action.type) {
    case 'SET_MATCH':
      return {
        ...state,
        match: action.payload
      };

    case 'ADD_POINT': {
      if (!state.match) return state;

      const updatedSets = state.match.sets.map((set) => {
        if (set.set_number === state.currentSet) {
          return {
            ...set,
            points: [...set.points, action.payload]
          };
        }
        return set;
      });

      return {
        ...state,
        match: {
          ...state.match,
          sets: updatedSets
        }
      };
    }

    case 'UNDO_LAST_POINT': {
      if (!state.match) return state;

      const updatedSets = state.match.sets.map((set) => {
        if (set.set_number === state.currentSet && set.points.length > 0) {
          const points = set.points.slice(0, -1);
          return {
            ...set,
            points
          };
        }
        return set;
      });

      return {
        ...state,
        match: {
          ...state.match,
          sets: updatedSets
        }
      };
    }

    case 'SET_CURRENT_SET':
      return {
        ...state,
        currentSet: typeof action.payload === 'number' ? action.payload : state.currentSet
      };

    case 'SET_VIEW_MODE':
      return {
        ...state,
        uiState: {
          ...state.uiState,
          viewMode: action.payload
        }
      };

    case 'SET_LOADING':
      return {
        ...state,
        uiState: {
          ...state.uiState,
          isLoading: action.payload
        }
      };

    case 'SET_ERROR':
      return {
        ...state,
        uiState: {
          ...state.uiState,
          error: action.payload
        }
      };

    default:
      return state;
  }
}

// Initial State
const initialState: MatchState = {
  match: null,
  currentSet: 1,
  uiState: {
    selectedSet: 1,
    viewMode: 'list',
    isLoading: false,
    error: null
  }
};

// Provider Component
interface MatchProviderProps {
  children: ReactNode;
  initialMatch?: MatchData;
}

export function MatchProvider({ children, initialMatch }: MatchProviderProps) {
  const [state, dispatch] = useReducer(
    matchReducer,
    initialMatch ? { ...initialState, match: initialMatch } : initialState
  );

  // Computed values
  const currentSetData = useMemo(() => {
    if (!state.match) return [];
    const currentSet = state.match.sets.find((set) => set.set_number === state.currentSet);
    return currentSet?.points || [];
  }, [state.match, state.currentSet]);

  const homeTeam = useMemo(() => state.match?.home_team || null, [state.match]);
  const opponentTeam = useMemo(() => state.match?.opponent_team || null, [state.match]);

  const currentScore = useMemo(() => {
    if (currentSetData.length === 0) {
      return { home: 0, opponent: 0 };
    }
    const lastPoint = currentSetData[currentSetData.length - 1];
    return {
      home: lastPoint.home_score,
      opponent: lastPoint.opponent_score
    };
  }, [currentSetData]);

  const value: MatchContextValue = {
    state,
    dispatch,
    currentSetData,
    homeTeam,
    opponentTeam,
    currentScore
  };

  return <MatchContext.Provider value={value}>{children}</MatchContext.Provider>;
}

// Hook to use Match Context
export function useMatch() {
  const context = useContext(MatchContext);
  if (context === undefined) {
    throw new Error('useMatch must be used within a MatchProvider');
  }
  return context;
}

// Helper hooks
export function useMatchData() {
  const { state } = useMatch();
  return state.match;
}

export function useCurrentSet() {
  const { state } = useMatch();
  return state.currentSet;
}

export function useCurrentSetData() {
  const { currentSetData } = useMatch();
  return currentSetData;
}

export function useTeams() {
  const { homeTeam, opponentTeam } = useMatch();
  return { homeTeam, opponentTeam };
}

export function useCurrentScore() {
  const { currentScore } = useMatch();
  return currentScore;
}

export function useUIState() {
  const { state } = useMatch();
  return state.uiState;
}
