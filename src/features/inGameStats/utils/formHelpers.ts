import type { WinLossType } from '../../../constants/actionTypes';
import {
  getCategories,
  getSubcategories,
  getLocationTempo,
  shouldShowLocationTempo
} from '../../../constants/actionTypes';
import type { PointEntryState } from '../../../types/inGameStats.types';

/**
 * Get available categories based on Win/Loss selection
 */
export function getAvailableCategories(winLoss: WinLossType | null): string[] {
  return getCategories(winLoss);
}

/**
 * Get available subcategories based on Win/Loss and category
 */
export function getAvailableSubcategories(
  winLoss: WinLossType | null,
  category: string | null
): string[] {
  return getSubcategories(winLoss, category);
}

/**
 * Get available location/tempo options based on Win/Loss and category
 */
export function getAvailableLocationTempo(
  winLoss: WinLossType | null,
  category: string | null
): string[] | null {
  return getLocationTempo(winLoss, category);
}

/**
 * Check if location/tempo field should be displayed
 */
export function shouldDisplayLocationTempo(
  winLoss: WinLossType | null,
  category: string | null
): boolean {
  return shouldShowLocationTempo(winLoss, category);
}

/**
 * Check if form is complete and valid
 */
export function isFormComplete(state: PointEntryState): boolean {
  const { winLoss, category, subcategory, locationTempo, player } = state;

  // All required fields must be filled
  if (!winLoss || !category || !subcategory || !player) {
    return false;
  }

  // If location/tempo is required, it must be filled
  if (shouldShowLocationTempo(winLoss, category) && !locationTempo) {
    return false;
  }

  return true;
}

/**
 * Get the team that should be shown for player selection
 * Win = home team, Loss = depends on category
 */
export function getPlayerTeam(
  winLoss: WinLossType | null,
  category: string | null
): 'home' | 'opponent' | null {
  if (!winLoss) return null;

  // For Win scenarios
  if (winLoss === 'Win') {
    // Opponent Error means we select opponent player
    if (category === 'Op. E.') {
      return 'opponent';
    }
    // All other Win scenarios select home player
    return 'home';
  }

  // For Loss scenarios
  if (winLoss === 'Loss') {
    // Opponent actions mean we select opponent player
    if (category === 'Op. Att.' || category === 'Op. Ace') {
      return 'opponent';
    }
    // Home team errors mean we select home player
    return 'home';
  }

  return null;
}

/**
 * Reset form state when Win/Loss changes
 */
export function resetDependentFields(state: PointEntryState): Partial<PointEntryState> {
  return {
    category: null,
    subcategory: null,
    locationTempo: null,
    player: null,
    errors: {}
  };
}

/**
 * Reset fields dependent on category change
 */
export function resetCategoryDependentFields(
  state: PointEntryState
): Partial<PointEntryState> {
  return {
    subcategory: null,
    locationTempo: null,
    player: null,
    errors: {}
  };
}

/**
 * Format action text for display in point list
 */
export function formatActionText(
  actionType: string,
  actionCategory: string,
  locationTempo: string | null
): string {
  let text = `${actionType}${actionCategory}`;
  if (locationTempo) {
    text += ` (${locationTempo})`;
  }
  return text;
}
