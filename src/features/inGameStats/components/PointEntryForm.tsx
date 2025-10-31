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
import { useMatch, useTeamRosters } from '../context/MatchContext';
import { useOpponentTracking } from '../context/OpponentTrackingContext';
import { saveMatch, updateMatch } from '../../../services/googleSheetsAPI';
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
  const { dispatch: matchDispatch, currentScore, homeTeam, opponentTeam, currentSetData, state: matchState } = useMatch();
  const { homeRoster, opponentRoster } = useTeamRosters();
  const { state: opponentTrackingState, resetForNewPoint, setAttemptResult } = useOpponentTracking();
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  // Check if form is complete
  // Only depend on the specific fields that affect form completion, not the entire state
  useEffect(() => {
    const complete = isFormComplete(state);
    if (complete !== state.isValid) {
      dispatch({ type: 'SET_ERRORS', payload: {} });
    }
  }, [state.winLoss, state.category, state.subcategory, state.locationTempo, state.player, state.isValid]);

  // Get available options based on current state
  const categories = getAvailableCategories(state.winLoss);
  const subcategories = getAvailableSubcategories(state.winLoss, state.category);
  const locationTempoOptions = getAvailableLocationTempo(state.winLoss, state.category);
  const showLocationTempo = shouldDisplayLocationTempo(state.winLoss, state.category);

  // Get players for current team context
  // Use roster data from Google Sheets if available, otherwise fall back to match data
  const playerTeam = getPlayerTeam(state.winLoss, state.category);
  const availablePlayers =
    playerTeam === 'home'
      ? (homeRoster.length > 0 ? homeRoster : homeTeam?.players || [])
      : playerTeam === 'opponent'
      ? (opponentRoster.length > 0 ? opponentRoster : opponentTeam?.players || [])
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

    // Determine if this is a kill/ace (terminal action by opponent)
    const isOpponentKill = state.winLoss === 'Loss' && state.category === 'Attack';
    const isOpponentAce = state.winLoss === 'Loss' && state.category === 'Serve';

    // Update opponent tracking attempts with terminal result if applicable
    if ((isOpponentKill || isOpponentAce) && opponentTrackingState.attemptQueue.length > 0) {
      const lastAttempt = opponentTrackingState.attemptQueue[opponentTrackingState.attemptQueue.length - 1];
      const result = isOpponentAce ? 'ace' : 'kill';
      setAttemptResult(lastAttempt.attempt_number, result);
    }

    // Create new point (simplified structure matching OldTool)
    // Store player ID (not name) - will be looked up from roster when displaying
    const newPoint = {
      point_number: currentSetData.length + 1,
      winning_team: state.winLoss === 'Win' ? ('home' as const) : ('opponent' as const),
      action_type: state.category || '',
      action: state.subcategory || '',
      locationTempo: state.locationTempo,
      home_player: playerTeam === 'home' ? state.player || '' : '',
      opponent_player: playerTeam === 'opponent' ? state.player || '' : '',
      home_score:
        state.winLoss === 'Win' ? currentScore.home + 1 : currentScore.home,
      opponent_score:
        state.winLoss === 'Loss' ? currentScore.opponent + 1 : currentScore.opponent,
      // Include opponent tracking attempts (if any)
      opponent_attempts: opponentTrackingState.attemptQueue.length > 0
        ? opponentTrackingState.attemptQueue
        : undefined
    };

    // Add point to context (updates UI immediately)
    matchDispatch({ type: 'ADD_POINT', payload: newPoint });

    // Reset opponent tracking for new point
    resetForNewPoint();

    // Reset form
    dispatch({ type: 'RESET_FORM' });
  };

  const handleSave = async () => {
    const match = matchState.match;
    if (!match) {
      console.error('No match data available');
      return;
    }

    const isNewMatch = match.id.startsWith('new-match-');

    try {
      setIsSaving(true);
      setSaveError(null);

      if (isNewMatch) {
        // For new matches, save the entire match
        console.log('=== SAVING NEW MATCH ===');
        console.log('Match data:', JSON.stringify(match, null, 2));

        // Convert to Google Sheets format (camelCase field names)
        const payload = {
          gameDate: match.match_date,
          homeTeam: match.home_team.id,  // Google Sheets expects team ID
          opponentTeam: match.opponent_team.id,  // Google Sheets expects team ID
          sets: match.sets
        };

        console.log('Payload being sent:', JSON.stringify(payload, null, 2));

        const result = await saveMatch(payload);

        console.log('Save result:', result);

        // Update match ID in context
        matchDispatch({
          type: 'SET_MATCH',
          payload: { ...match, id: result.matchId }
        });

        console.log('✅ Match saved successfully with ID:', result.matchId);
        setSaveError(null);
      } else {
        // For existing matches, update the whole match
        console.log('=== UPDATING EXISTING MATCH ===');
        console.log('Match ID:', match.id);
        console.log('Sets data:', JSON.stringify(match.sets, null, 2));

        // Convert to Google Sheets format
        const payload = {
          gameDate: match.match_date,
          homeTeam: match.home_team.id,
          opponentTeam: match.opponent_team.id,
          sets: match.sets
        };

        await updateMatch(match.id, payload);

        console.log('✅ Match updated successfully');
        setSaveError(null);
      }
    } catch (error: any) {
      console.error('❌ Failed to save match');
      console.error('Error type:', typeof error);
      console.error('Error object:', error);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);

      if (error?.response) {
        console.error('API Response:', error.response);
      }

      setSaveError(`Failed to save: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
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

      {/* Save Button */}
      <button
        type="button"
        className="save-btn"
        onClick={handleSave}
        disabled={isSaving || currentSetData.length === 0}
      >
        {isSaving ? 'Saving...' : 'Save to Google Sheets'}
      </button>

      {/* Save status */}
      {saveError && (
        <div className="save-status error">
          ⚠️ {saveError}
        </div>
      )}

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
