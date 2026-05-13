/**
 * rotationDerivation.ts
 * Pure utilities for converting position→player assignments into TeamRotationConfig.
 *
 * VOLLEYBALL_SYSTEMS defines roles in rotation order, where index 0 = setter role.
 * Given which P1-P6 position the setter occupies, all other roles are derived
 * via modular arithmetic: roleIdx = (positionIdx - setterIdx + 6) % 6
 */

import type { VolleyballSystem, PlayerRole, TeamRotationConfig } from '../features/inGameStats/types/rotation.types';
import type { PlayerReference } from '../types/playerReference.types';
import type { VolleyballPosition } from '../features/inGameStats/types/opponentTracking.types';

// Mirror of volleyballSystems.js (kept local to avoid circular dep with JS file)
const SYSTEM_ROLES: Record<string, string[]> = {
  '5-1 (OH>S)': ['S', 'OH (w.s)', 'MB', 'Oppo', 'OH', 'MB (w.s)'],
  '5-1 (MB>S)': ['S', 'MB (w.s)', 'OH', 'Oppo', 'MB', 'OH (w.s)'],
  '4-2':        ['S1', 'OH1', 'MB1', 'S2', 'OH2', 'MB2'],
  '6-2':        ['S1/OPP1', 'MB1', 'OH1', 'S2/OPP2', 'MB2', 'OH2'],
};

export const VOLLEYBALL_POSITIONS: VolleyballPosition[] = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'];

export const EMPTY_POSITIONS: Record<VolleyballPosition, PlayerReference | null> = {
  P1: null, P2: null, P3: null, P4: null, P5: null, P6: null
};

/**
 * Given position assignments + which position has the setter,
 * return the role→player map needed by TeamRotationConfig.
 * Works for all 4 systems (5-1/6-2/4-2) without special casing.
 */
export function deriveRolesFromPositions(
  system: VolleyballSystem,
  assignments: Record<VolleyballPosition, PlayerReference | null>,
  setterPosition: VolleyballPosition
): Record<PlayerRole, PlayerReference> {
  const roles = SYSTEM_ROLES[system];
  const setterIdx = VOLLEYBALL_POSITIONS.indexOf(setterPosition);
  const result: Partial<Record<PlayerRole, PlayerReference>> = {};
  VOLLEYBALL_POSITIONS.forEach((pos, i) => {
    const ref = assignments[pos];
    if (!ref) return;
    const roleIdx = (i - setterIdx + 6) % 6;
    result[roles[roleIdx] as PlayerRole] = ref;
  });
  return result as Record<PlayerRole, PlayerReference>;
}

/**
 * Derive which role occupies P1 given the setter's position.
 * This is the `startingP1` field in TeamRotationConfig.
 */
export function deriveStartingP1(
  system: VolleyballSystem,
  setterPosition: VolleyballPosition
): PlayerRole {
  const roles = SYSTEM_ROLES[system];
  const setterIdx = VOLLEYBALL_POSITIONS.indexOf(setterPosition);
  return roles[(0 - setterIdx + 6) % 6] as PlayerRole;
}

/**
 * Default libero replacement targets per system.
 * Returns the MB roles (the players the libero most commonly swaps with).
 */
export function getDefaultLiberoTargets(system: VolleyballSystem): PlayerRole[] {
  const roles = SYSTEM_ROLES[system] as PlayerRole[];
  const mb = roles.filter(r => r === 'MB' || r === 'MB (w.s)' || r === 'MB1' || r === 'MB2');
  if (mb.length > 0) return mb;
  // 4-2 has no MB roles — fall back to first non-setter role
  return roles.filter(r => !r.startsWith('S')).slice(0, 1);
}

/**
 * Build a complete TeamRotationConfig from drawer state.
 */
export function buildTeamRotationConfig(
  system: VolleyballSystem,
  positionAssignments: Record<VolleyballPosition, PlayerReference | null>,
  setterPosition: VolleyballPosition,
  libero: PlayerReference | null,
  liberoReplacementTargets: PlayerRole[]
): TeamRotationConfig {
  return {
    system,
    players: deriveRolesFromPositions(system, positionAssignments, setterPosition),
    startingP1: deriveStartingP1(system, setterPosition),
    libero,
    liberoReplacementTargets,
    currentRotation: 1,
  };
}

/**
 * Invert an existing TeamRotationConfig back into position→player assignments.
 * Used to pre-populate the drawer when editing an existing config.
 */
export function buildDraftPositionsFromConfig(
  config: TeamRotationConfig
): Record<VolleyballPosition, PlayerReference | null> {
  const roles = SYSTEM_ROLES[config.system] as PlayerRole[];
  const startingP1Idx = (roles as string[]).indexOf(config.startingP1);
  const result = { ...EMPTY_POSITIONS } as Record<VolleyballPosition, PlayerReference | null>;
  VOLLEYBALL_POSITIONS.forEach((pos, i) => {
    const role = roles[(startingP1Idx + i) % 6];
    result[pos] = config.players[role as PlayerRole] || null;
  });
  return result;
}

/**
 * Find which P1-P6 position the setter occupies in an existing config.
 * Useful for pre-selecting the setter chip when re-editing.
 */
export function getSetterPositionFromConfig(
  config: TeamRotationConfig
): VolleyballPosition | null {
  const roles = SYSTEM_ROLES[config.system] as PlayerRole[];
  const startingP1Idx = (roles as string[]).indexOf(config.startingP1);
  // setter is at roles[0]; position i where (startingP1Idx + i) % 6 === 0
  const setterPosIdx = (6 - startingP1Idx) % 6;
  return VOLLEYBALL_POSITIONS[setterPosIdx] ?? null;
}
