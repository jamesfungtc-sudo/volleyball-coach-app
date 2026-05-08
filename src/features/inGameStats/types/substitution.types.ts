/**
 * Regular player substitution types
 * (Libero swaps are handled separately by LiberoSwapState)
 */

import type { VolleyballPosition } from './opponentTracking.types';
import type { PlayerRole } from './rotation.types';

export interface Substitution {
  id: string;
  team: 'home' | 'opponent';
  setNumber: number;
  pointNumber: number;
  /** Player leaving the court */
  subOutJersey: number;
  subOutName: string;
  subOutRole: PlayerRole | undefined;
  /** Player entering the court */
  subInJersey: number;
  subInName: string;
  subInRole: PlayerRole | undefined;
  /** Court position affected */
  courtPosition: VolleyballPosition;
  timestamp: number;
}

export interface TeamSubstitutionState {
  /** How many subs have been used this set (max 6 per FIVB rules) */
  count: number;
  history: Substitution[];
}

export const MAX_SUBSTITUTIONS = 6;

export const emptySubState = (): TeamSubstitutionState => ({
  count: 0,
  history: []
});
