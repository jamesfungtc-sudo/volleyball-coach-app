import React, { useReducer, useEffect } from 'react';
import { WinLossToggle } from './WinLossToggle';
import { SegmentedControl, type SegmentedControlOption } from './SegmentedControl';
import { ConditionalDropdown } from './ConditionalDropdown';
import { PlayerSelector } from './PlayerSelector';
import type { PointEntryState } from '../../../types/inGameStats.types';
import type { WinLossType } from '../../../constants/actionTypes';
import {
  getAvailableCategories,
  getAvailableSubcategories,
  getAvailableLocationTempo,
  shouldDisplayLocationTempo,
  isFormComplete,
  getPlayerTeam,
  resetDependentFields,
  resetCategoryDependentFields
} from '../utils/formHelpers';
import { validatePointEntry, getValidationErrors } from '../utils/formValidation';
import { useMatch } from '../context/MatchContext';
import './PointEntryForm.css';

type PointEntryAction =
  | { type: 'SET_WIN_LOSS'; payload: WinLossType }
  | { type: 'SET_CATEGORY'; payload: string }
  | { type: 'SET_SUBCATEGORY'; payload: string }
  | { type: 'SET_LOCATION_TEMPO'; payload: string }
  | { type: 'SET_PLAYER'; payload: string }
  | { type: 'SET_ERRORS'; payload: Record<string, string> }
  | { type: 'RESET_FORM' };

function pointEntryReducer(state: PointEntryState, action: PointEntryAction): PointEntryState {
  switch (action.type) {
    case 'SET_WIN_LOSS':
      return {
        ...state,
        winLoss: action.payload,
        ...resetDependentFields(state),
        isValid: false
      };

    case 'SET_CATEGORY':
      return {
        ...state,
        category: action.payload,
        ...resetCategoryDependentFields(state),
        isValid: false
      };

    case 'SET_SUBCATEGORY':
      return {
        ...state,
        subcategory: action.payload,
        player: null,
        errors: {},
        isValid: false
      };

    case 'SET_LOCATION_TEMPO':
      return {
        ...state,
        locationTempo: action.payload,
        errors: {},
        isValid: false
      };

    case 'SET_PLAYER':
      return {
        ...state,
        player: action.payload,
        errors: {}
      };

    case 'SET_ERRORS':
      return {
        ...state,
        errors: action.payload,
        isValid: false
      };

    case 'RESET_FORM':
      return {
        winLoss: null,
        category: null,
        subcategory: null,
        locationTempo: null,
        player: null,
        isValid: false,
        errors: {}
      };

    default:
      return state;
  }
}

const initialState: PointEntryState = {
  winLoss: null,
  category: null,
  subcategory: null,
  locationTempo: null,
  player: null,
  isValid: false,
  errors: {}
};

/**
 * PointEntryForm - Multi-step form for entering point data
 *
 * 5-step workflow:
 * 1. Win/Loss selection
 * 2. Action Type (category) selection
 * 3. Action Category (subcategory) selection
 * 4. Location/Tempo selection (conditional)
 * 5. Player selection
 */
export function PointEntryForm() {
  const [state, dispatch] = useReducer(pointEntryReducer, initialState);
  const { dispatch: matchDispatch, currentScore, homeTeam, opponentTeam, currentSetData } = useMatch();

  // Check if form is complete
  useEffect(() => {
    const complete = isFormComplete(state);
    if (complete !== state.isValid) {
      dispatch({ type: 'SET_ERRORS', payload: {} });
    }
  }, [state]);

  // Get available options based on current state
  const categories = getAvailableCategories(state.winLoss);
  const subcategories = getAvailableSubcategories(state.winLoss, state.category);
  const locationTempoOptions = getAvailableLocationTempo(state.winLoss, state.category);
  const showLocationTempo = shouldDisplayLocationTempo(state.winLoss, state.category);

  // Get players for current team context
  const playerTeam = getPlayerTeam(state.winLoss, state.category);
  const availablePlayers =
    playerTeam === 'home'
      ? homeTeam?.players || []
      : playerTeam === 'opponent'
      ? opponentTeam?.players || []
      : [];

  // Category options - always show 5 buttons (placeholder when no Win/Loss selected)
  const categoryOptions: SegmentedControlOption[] =
    categories.length > 0
      ? categories.map((cat) => ({ key: cat, label: cat }))
      : [
          { key: 'placeholder-1', label: '—', disabled: true },
          { key: 'placeholder-2', label: '—', disabled: true },
          { key: 'placeholder-3', label: '—', disabled: true },
          { key: 'placeholder-4', label: '—', disabled: true },
          { key: 'placeholder-5', label: '—', disabled: true }
        ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const validation = validatePointEntry(state);

    if (!validation.success) {
      dispatch({ type: 'SET_ERRORS', payload: getValidationErrors(validation.error) });
      return;
    }

    if (!isFormComplete(state)) {
      return;
    }

    // Create new point (simplified structure matching OldTool)
    const newPoint = {
      point_number: currentSetData.length + 1,
      winning_team: state.winLoss === 'Win' ? ('home' as const) : ('opponent' as const),
      action_type: state.category || '',
      action: state.subcategory || '',
      locationTempo: state.locationTempo,
      home_player:
        playerTeam === 'home'
          ? homeTeam?.players.find((p) => p.id === state.player)?.name || ''
          : '',
      opponent_player:
        playerTeam === 'opponent'
          ? opponentTeam?.players.find((p) => p.id === state.player)?.name || ''
          : '',
      home_score:
        state.winLoss === 'Win' ? currentScore.home + 1 : currentScore.home,
      opponent_score:
        state.winLoss === 'Loss' ? currentScore.opponent + 1 : currentScore.opponent
    };

    // Add point to context
    matchDispatch({ type: 'ADD_POINT', payload: newPoint });

    // Reset form
    dispatch({ type: 'RESET_FORM' });
  };

  return (
    <form className="point-entry-form" onSubmit={handleSubmit}>
      <h3 className="form-title">Point Entry</h3>

      {/* Step 1: Win/Loss Toggle */}
      <WinLossToggle
        value={state.winLoss}
        onChange={(value) => dispatch({ type: 'SET_WIN_LOSS', payload: value })}
      />

      {/* Step 2: Category Selection - Always visible after Win/Loss */}
      <div className="form-section">
        <label className="section-label">Action Type</label>
        <SegmentedControl
          options={categoryOptions}
          value={state.category}
          onChange={(value) => dispatch({ type: 'SET_CATEGORY', payload: value })}
          ariaLabel="Select action type"
          disabled={!state.winLoss}
        />
      </div>

      {/* Step 3 & 4: Subcategory and Location/Tempo in same row - Always visible */}
      <div className="form-row">
        <ConditionalDropdown
          label="Action"
          options={subcategories}
          value={state.subcategory}
          onChange={(value) => dispatch({ type: 'SET_SUBCATEGORY', payload: value })}
          show={true}
          required={true}
          placeholder="Select action..."
          error={state.errors.subcategory}
          disabled={!state.category}
        />

        {/* Only Location/Tempo is conditionally shown */}
        {showLocationTempo && locationTempoOptions ? (
          <ConditionalDropdown
            label="Location/Tempo"
            options={locationTempoOptions}
            value={state.locationTempo}
            onChange={(value) => dispatch({ type: 'SET_LOCATION_TEMPO', payload: value })}
            show={true}
            required={true}
            placeholder="Select location/tempo..."
            error={state.errors.locationTempo}
            disabled={!state.subcategory}
          />
        ) : (
          <div></div>
        )}
      </div>

      {/* Step 5: Player Selection - Always visible */}
      <PlayerSelector
        players={availablePlayers}
        value={state.player}
        onChange={(value) => dispatch({ type: 'SET_PLAYER', payload: value })}
        teamType={playerTeam || undefined}
        error={state.errors.player}
        disabled={!state.subcategory}
      />

      {/* Submit Button */}
      <button
        type="submit"
        className="submit-btn"
        disabled={!isFormComplete(state)}
      >
        Add Point
      </button>

      {/* Form validation errors */}
      {Object.keys(state.errors).length > 0 && (
        <div className="form-errors">
          {Object.entries(state.errors).map(([field, error]) => (
            <div key={field} className="error-item">
              {error}
            </div>
          ))}
        </div>
      )}
    </form>
  );
}
