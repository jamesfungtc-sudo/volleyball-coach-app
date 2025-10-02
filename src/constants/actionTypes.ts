import type { ActionType } from '../types/inGameStats.types';

/**
 * ACTION_TYPES constant - Exact structure from OldTool Retool application
 * Source: InGameTrend_PointWinLoss_ACTUAL_Structure.md
 *
 * This defines all possible action types, categories, subcategories, and location/tempo options
 * for point entry in volleyball match tracking.
 */
export const ACTION_TYPES: readonly ActionType[] = [
  {
    type: 'Win',
    categories: {
      'Att.': {
        category: 'Attack (Sp.)',
        subcategories: ['Hard Spike', 'Tip/Roll', 'Touch Out', 'Setter Dump'],
        locationTempo: [
          'OH (Line)',
          'OH (Cross)',
          'Oppo (Line)',
          'Oppo (Cross)',
          'MB (A)',
          'MB (B)',
          'MB (C)',
          'MB (Slide)',
          'MB (2)',
          'Back Row - Pipe',
          'Back Row - P1',
          '2nd Tempo',
          'Other'
        ]
      },
      'Ser.': {
        category: 'Serve (Ser.)',
        subcategories: ['Ace (On floor)', 'Ace (Touch)'],
        locationTempo: ['Zone P1', 'Zone P2', 'Zone P3', 'Zone P4', 'Zone P5', 'Zone P6']
      },
      'Blo.': {
        category: 'Block (Blo.)',
        subcategories: ['Kill Blocked (on floor)', 'Kill Blocked (with touches)', 'Overpass kill']
        // No locationTempo
      },
      'Op. E.': {
        category: 'Opponent Error (Op. E.)',
        subcategories: [
          'Ser (Net)',
          'Ser (Out)',
          'Hit (Net)',
          'Hit (Out)',
          'Setting error',
          'Ball handling',
          'Other fault'
        ],
        locationTempo: [
          'OH (Line)',
          'OH (Cross)',
          'Oppo (Line)',
          'Oppo (Cross)',
          'MB (A)',
          'MB (B)',
          'MB (C)',
          'MB (Slide)',
          'MB (2)',
          'Back Row - Pipe',
          'Back Row - P1',
          '2nd Tempo',
          'Other'
        ]
      },
      'Other': {
        category: 'Other',
        subcategories: ['Referee decision', 'Others']
        // No locationTempo
      }
    }
  },
  {
    type: 'Loss',
    categories: {
      'Op. Att.': {
        category: 'Op. Play',
        subcategories: ['Hard Spike', 'Tip/Roll', 'Tool/Block Out', 'Setter Dump', 'Other'],
        locationTempo: [
          'OH (Line)',
          'OH (Cross)',
          'Oppo (Line)',
          'Oppo (Cross)',
          'MB (A)',
          'MB (B)',
          'MB (C)',
          'MB (Slide)',
          'MB (2)',
          'Back Row - Pipe',
          'Back Row - P1',
          '2nd Tempo',
          'Other'
        ]
      },
      'Op. Ace': {
        category: 'Op. Ace',
        subcategories: ['Ace (on floor)', 'Ace (with Touch)'],
        locationTempo: [
          'Zone 1 (Deep)',
          'Zone 2 (Short)',
          'Zone 3 (Short)',
          'Zone 4 (Short)',
          'Zone 5 (Deep)',
          'Zone 6 (Deep)'
        ]
      },
      'Sp. E.': {
        category: 'Sp. E.',
        subcategories: [
          'Hit (NET)',
          'Hit (OUT)',
          'Use (NET)',
          'Use (OUT)',
          'Kill Blocked (on floor)',
          'Kill Blocked (with touches)',
          'Foot fault'
        ],
        locationTempo: [
          'OH (Line)',
          'OH (Cross)',
          'Oppo (Line)',
          'Oppo (Cross)',
          'MB (A)',
          'MB (B)',
          'MB (C)',
          'MB (Slide)',
          'MB (2)',
          'Back Row - Pipe',
          'Back Row - P1',
          '2nd Tempo',
          'Other'
        ]
      },
      'Ser. E.': {
        category: 'Ser. E.',
        subcategories: ['NET', 'OUT', 'Foot fault', '8 sec.']
        // No locationTempo
      },
      'Other': {
        category: 'Pass E.',
        subcategories: [
          'Ball Handling',
          'Block error',
          'Setting error',
          'Net touch',
          'Line fault',
          'Mis-judged',
          'Referee decision',
          'Other'
        ]
        // No locationTempo
      }
    }
  }
] as const;

// Helper types derived from ACTION_TYPES
export type WinLossType = (typeof ACTION_TYPES)[number]['type'];

// Get all category keys from both Win and Loss
type WinCategories = keyof (typeof ACTION_TYPES)[0]['categories'];
type LossCategories = keyof (typeof ACTION_TYPES)[1]['categories'];
export type CategoryKey = WinCategories | LossCategories;

/**
 * Helper function to get categories for a given win/loss type
 */
export function getCategories(winLoss: WinLossType | null): string[] {
  if (!winLoss) return [];
  const typeData = ACTION_TYPES.find((t) => t.type === winLoss);
  return Object.keys(typeData?.categories || {});
}

/**
 * Helper function to get subcategories for a given category
 */
export function getSubcategories(
  winLoss: WinLossType | null,
  category: string | null
): string[] {
  if (!winLoss || !category) return [];
  const typeData = ACTION_TYPES.find((t) => t.type === winLoss);
  const categoryData = typeData?.categories[category as keyof typeof typeData.categories];
  return categoryData?.subcategories || [];
}

/**
 * Helper function to get location/tempo options for a given category
 */
export function getLocationTempo(
  winLoss: WinLossType | null,
  category: string | null
): string[] | null {
  if (!winLoss || !category) return null;
  const typeData = ACTION_TYPES.find((t) => t.type === winLoss);
  const categoryData = typeData?.categories[category as keyof typeof typeData.categories];
  return categoryData?.locationTempo || null;
}

/**
 * Helper function to check if location/tempo should be shown
 */
export function shouldShowLocationTempo(
  winLoss: WinLossType | null,
  category: string | null
): boolean {
  return getLocationTempo(winLoss, category) !== null;
}
