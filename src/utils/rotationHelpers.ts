/**
 * Rotation helper utilities for Visual Tracking
 * Bridges volleyballSystems.js with TypeScript components
 */

import {
  VOLLEYBALL_SYSTEMS,
  makeStartingOrder,
  getRotations,
  getRallyLineup
} from './volleyballSystems';
import { rotateClockwise as rotatePositions } from '../features/inGameStats/components/VisualTracking/positions';
import type {
  TeamRotationConfig,
  TeamLineup,
  PlayerInPosition,
  PlayerRole,
  LiberoSubstitution,
  RotationUpdate,
  createPlayerInPosition
} from '../features/inGameStats/types/rotation.types';
import type { VolleyballPosition } from '../features/inGameStats/types/opponentTracking.types';
import type { Player } from '../services/googleSheetsAPI';
import {
  getPlayerId,
  getJerseyNumber,
  getPlayerDisplayName,
  deserializePlayerReference,
  type PlayerReference
} from '../types/playerReference.types';

/**
 * Initialize lineup from team configuration
 * UPDATED: Uses PlayerReference for type-safe player lookup
 * Supports optional manual libero swap role override and serving status
 */
export function initializeLineup(
  config: TeamRotationConfig,
  teamId: string,
  roster: Player[],  // Now REQUIRED parameter
  manualSwapRole?: PlayerRole | null,  // NEW: Optional manual swap override
  isServing?: boolean  // NEW: Whether this team is serving (affects P1 libero swap)
): TeamLineup {
  // Defensive check for config
  if (!config || !config.system) {
    console.error('❌ [initializeLineup] Invalid config - missing system:', config);
    // Return empty lineup
    return {
      P1: null, P2: null, P3: null, P4: null, P5: null, P6: null
    };
  }

  const systemOrder = VOLLEYBALL_SYSTEMS[config.system];

  // Defensive check for systemOrder
  if (!systemOrder) {
    console.error(`❌ [initializeLineup] Unknown system "${config.system}". Valid systems:`, Object.keys(VOLLEYBALL_SYSTEMS));
    return {
      P1: null, P2: null, P3: null, P4: null, P5: null, P6: null
    };
  }

  // Defensive check for startingP1
  if (!config.startingP1 || !systemOrder.includes(config.startingP1)) {
    console.error(`❌ [initializeLineup] Invalid startingP1 "${config.startingP1}" for system "${config.system}". Valid roles:`, systemOrder);
    return {
      P1: null, P2: null, P3: null, P4: null, P5: null, P6: null
    };
  }

  const rotationOrder = makeStartingOrder(systemOrder, config.startingP1);

  // Include libero in the team object for getRotations()
  // getRotations() expects teamObj["L"] to exist for libero substitution logic
  const teamObjWithLibero = {
    ...config.players,
    ...(config.libero ? { L: config.libero } : {})  // Add libero if configured
  };

  // Pass liberoReplacementTargets to getRotations() for substitution logic
  // NEW: Also pass manualSwapRole for manual swap override and isServing status
  const allRotations = getRotations(
    teamObjWithLibero,
    rotationOrder,
    config.liberoReplacementTargets || [],
    manualSwapRole || null,  // NEW: Manual swap role override
    isServing || false  // NEW: Serving status
  );

  // Get first rotation (Rotation 1)
  // For opponent team, we need to use the rotation as-is (rotation 0 in array)
  // The rotation system already accounts for the correct orientation
  const firstRotation = allRotations[0];

  // Convert to TeamLineup format
  const positions: VolleyballPosition[] = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'];
  const lineup: Partial<TeamLineup> = {};

  positions.forEach((pos, index) => {
    const roleData = firstRotation[index];

    // Get player reference - check if it's libero (role 'L')
    const playerRef = roleData.role === 'L'
      ? config.libero  // Get libero from config.libero
      : config.players[roleData.role as PlayerRole];  // Get regular player

    console.log(`🔍 [initializeLineup] Processing ${pos} for ${teamId}:`, {
      role: roleData.role,
      roleDataName: roleData.name,
      playerRef: playerRef ? `${playerRef.type} - ${playerRef.displayName}` : 'UNDEFINED',
      rosterSize: roster.length,
      isLibero: roleData.role === 'L'
    });

    // Check if playerRef is undefined (shouldn't happen with migration, but be defensive)
    if (!playerRef) {
      console.error(`❌ [initializeLineup] playerRef is undefined for role ${roleData.role}!`, {
        pos,
        role: roleData.role,
        configPlayers: config.players
      });
      // Create fallback custom reference
      const fallbackRef = {
        type: 'custom' as const,
        jerseyNumber: index + 1,
        displayName: `Player ${index + 1}`,
        syntheticId: `FALLBACK:${index + 1}`
      };
      lineup[pos] = {
        reference: fallbackRef,
        position: pos,
        roleInSystem: roleData.role as PlayerRole,
        isLibero: roleData.role === 'L',
        playerId: fallbackRef.syntheticId,
        jerseyNumber: fallbackRef.jerseyNumber,
        playerName: fallbackRef.displayName
      };
      return;
    }

    // Create PlayerInPosition from PlayerReference
    lineup[pos] = {
      reference: playerRef,
      position: pos,
      roleInSystem: roleData.role as PlayerRole,
      isLibero: roleData.role === 'L',
      originalRole: roleData.originalRole as PlayerRole | undefined,  // Track original role for libero
      // Backward compatibility - populate deprecated fields
      playerId: getPlayerId(playerRef),
      jerseyNumber: getJerseyNumber(playerRef),
      playerName: getPlayerDisplayName(playerRef)
    };

    console.log(`  → ✅ Created player:`, {
      jersey: lineup[pos]!.jerseyNumber,
      name: lineup[pos]!.playerName,
      id: lineup[pos]!.playerId
    });
  });

  return lineup as TeamLineup;
}

/**
 * Get lineup for specific rotation number (1-6)
 * UPDATED: Uses PlayerReference for type-safe player lookup
 * Supports optional manual libero swap role override and serving status
 */
export function getLineupForRotation(
  config: TeamRotationConfig,
  rotationNumber: number,
  teamId: string,
  roster: Player[],  // Now REQUIRED parameter
  manualSwapRole?: PlayerRole | null,  // NEW: Optional manual swap override
  isServing?: boolean  // NEW: Whether this team is serving (affects P1 libero swap)
): TeamLineup {
  // Defensive check for config
  if (!config || !config.system) {
    console.error('❌ [getLineupForRotation] Invalid config - missing system:', config);
    return {
      P1: null, P2: null, P3: null, P4: null, P5: null, P6: null
    };
  }

  const systemOrder = VOLLEYBALL_SYSTEMS[config.system];

  // Defensive check for systemOrder
  if (!systemOrder) {
    console.error(`❌ [getLineupForRotation] Unknown system "${config.system}". Valid systems:`, Object.keys(VOLLEYBALL_SYSTEMS));
    return {
      P1: null, P2: null, P3: null, P4: null, P5: null, P6: null
    };
  }

  // Defensive check for startingP1
  if (!config.startingP1 || !systemOrder.includes(config.startingP1)) {
    console.error(`❌ [getLineupForRotation] Invalid startingP1 "${config.startingP1}" for system "${config.system}". Valid roles:`, systemOrder);
    return {
      P1: null, P2: null, P3: null, P4: null, P5: null, P6: null
    };
  }

  const rotationOrder = makeStartingOrder(systemOrder, config.startingP1);

  // Include libero in the team object for getRotations()
  const teamObjWithLibero = {
    ...config.players,
    ...(config.libero ? { L: config.libero } : {})
  };

  // Pass liberoReplacementTargets to getRotations() for substitution logic
  // NEW: Also pass manualSwapRole for manual swap override and isServing status
  const allRotations = getRotations(
    teamObjWithLibero,
    rotationOrder,
    config.liberoReplacementTargets || [],
    manualSwapRole || null,  // NEW: Manual swap role override
    isServing || false  // NEW: Serving status
  );

  // Get specific rotation (0-indexed)
  const rotation = allRotations[rotationNumber - 1];

  // Convert to TeamLineup format
  const positions: VolleyballPosition[] = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'];
  const lineup: Partial<TeamLineup> = {};

  positions.forEach((pos, index) => {
    const roleData = rotation[index];

    // Get player reference - check if it's libero (role 'L')
    let playerRef: PlayerReference | null = null;
    if (roleData.role === 'L') {
      playerRef = config.libero;  // Get libero from config.libero (may be null)
    } else {
      playerRef = config.players[roleData.role as PlayerRole];  // Get regular player
    }

    // Skip if playerRef is null (shouldn't happen if config is valid)
    if (!playerRef) {
      console.warn(`⚠️ [getLineupForRotation] No player reference for role ${roleData.role} at ${pos}`);
      return;
    }

    // Create PlayerInPosition from PlayerReference
    lineup[pos] = {
      reference: playerRef,
      position: pos,
      roleInSystem: roleData.role as PlayerRole,
      isLibero: roleData.role === 'L',
      originalRole: roleData.originalRole as PlayerRole | undefined,  // Track original role for libero
      // Backward compatibility - populate deprecated fields
      playerId: getPlayerId(playerRef),
      jerseyNumber: getJerseyNumber(playerRef),
      playerName: getPlayerDisplayName(playerRef)
    };
  });

  return lineup as TeamLineup;
}

/**
 * Rotate lineup clockwise (advances rotation)
 */
export function rotateLineup(lineup: TeamLineup): TeamLineup {
  return rotatePositions(lineup);
}

/**
 * Check if role is a middle blocker
 */
export function isMiddleBlocker(role?: PlayerRole): boolean {
  if (!role) return false;
  return ['MB', 'MB (w.s)', 'MB1', 'MB2'].includes(role);
}

/**
 * Check if role is a setter
 */
export function isSetter(role?: PlayerRole): boolean {
  if (!role) return false;
  return role === 'S' || role.includes('S1/OPP') || role.includes('S2/OPP');
}

/**
 * Check if role is an outside hitter
 */
export function isOutsideHitter(role?: PlayerRole): boolean {
  if (!role) return false;
  return ['OH', 'OH (w.s)', 'OH1', 'OH2'].includes(role);
}

/**
 * Check if player is libero
 */
export function isLibero(player?: PlayerInPosition): boolean {
  return player?.isLibero === true || player?.roleInSystem === 'L';
}

/**
 * Apply libero substitutions to lineup
 *
 * @deprecated This function is NO LONGER USED - libero substitution now happens
 * inside getRotations() in volleyballSystems.js. All rotation functions
 * (initializeLineup, getLineupForRotation, manual rotation) use getRotations()
 * which handles libero substitution based on config.liberoReplacementTarget.
 *
 * DO NOT CALL THIS FUNCTION - it will create duplicate liberos!
 */
export function applyLiberoSubstitutions(
  lineup: TeamLineup,
  config: TeamRotationConfig,
  roster: Player[]  // ADD roster parameter for lookups
): { lineup: TeamLineup; substitutions: LiberoSubstitution[] } {
  if (!config.libero || !config.liberoReplacementTargets || config.liberoReplacementTargets.length === 0) {
    return { lineup, substitutions: [] };
  }

  const liberoRef = config.libero;
  const targetRoles = config.liberoReplacementTargets;

  // Create libero player object with CORRECT data from PlayerReference
  const liberoPlayer: PlayerInPosition = {
    reference: liberoRef,
    position: 'P1', // Will be updated per substitution
    roleInSystem: 'L',
    isLibero: true,
    // Backward compatibility
    playerId: getPlayerId(liberoRef),
    jerseyNumber: getJerseyNumber(liberoRef),  // ← Now gets actual jersey number!
    playerName: getPlayerDisplayName(liberoRef)
  };

  console.log(`🔄 [applyLiberoSubstitutions] Libero data:`, {
    jersey: liberoPlayer.jerseyNumber,
    name: liberoPlayer.playerName,
    id: liberoPlayer.playerId,
    replacesRoles: targetRoles
  });

  // Prioritize P5 for libero substitution (then P6, then P1)
  const backRowPositions: VolleyballPosition[] = ['P5', 'P6', 'P1'];
  const updatedLineup = { ...lineup };
  const substitutions: LiberoSubstitution[] = [];

  // Only substitute libero for ONE player (the first found in priority order)
  let liberoSubstituted = false;

  for (const pos of backRowPositions) {
    if (liberoSubstituted) break;

    const player = lineup[pos];
    if (!player) continue;

    // Check if player matches any of the configured replacement target roles
    if (player.roleInSystem && targetRoles.includes(player.roleInSystem)) {
      // Create libero for this position
      const liberoAtPosition: PlayerInPosition = {
        ...liberoPlayer,
        position: pos,
        originalRole: player.roleInSystem
      };

      // Record substitution
      substitutions.push({
        position: pos,
        liberoPlayer: liberoAtPosition,
        replacedPlayer: player,
        timestamp: Date.now()
      });

      // Replace in lineup
      updatedLineup[pos] = liberoAtPosition;

      console.log(`  → Substituted libero at ${pos} for ${player.roleInSystem}`);
      liberoSubstituted = true;
    }
  }

  return { lineup: updatedLineup, substitutions };
}

/**
 * Convert serving lineup to rally lineup
 */
export function convertToRallyFormation(
  servingLineup: TeamLineup
): TeamLineup {
  const positions: VolleyballPosition[] = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'];

  // Extract player array in serving formation
  const occupantObjs = positions.map(pos => ({
    role: servingLineup[pos]?.roleInSystem || '',
    name: servingLineup[pos]?.playerName || '',
    originalRole: servingLineup[pos]?.originalRole || null  // Track who libero is replacing
  }));

  // Use existing getRallyLineup logic from volleyballSystems.js
  const rallyPlayerNames = getRallyLineup(occupantObjs);

  // Create new lineup with rally positions
  const rallyLineup: Partial<TeamLineup> = {};

  positions.forEach((pos, index) => {
    const rallyPlayerName = rallyPlayerNames[index];

    // Skip if no player assigned to this rally position (e.g., libero on bench during serve)
    if (!rallyPlayerName) {
      return;
    }

    // Find which serving player this maps to
    const matchingServingPos = positions.find(
      p => servingLineup[p]?.playerName === rallyPlayerName
    );

    if (matchingServingPos) {
      rallyLineup[pos] = {
        ...servingLineup[matchingServingPos]!,
        position: pos // Update position
      };
    }
  });

  return rallyLineup as TeamLineup;
}

/**
 * Detect side-out (when scoring team is different from serving team)
 */
export function detectSideOut(
  previousServingTeam: 'home' | 'opponent',
  scoringTeam: 'home' | 'opponent'
): boolean {
  return scoringTeam !== previousServingTeam;
}

/**
 * Handle point end and determine if rotation is needed
 * UPDATED: Uses getLineupForRotation() like manual rotation (not rotateLineup())
 * Respects serving team status for P1 libero substitution
 */
export function handlePointEnd(
  scoringTeam: 'home' | 'opponent',
  currentServingTeam: 'home' | 'opponent',
  homeLineup: TeamLineup,
  opponentLineup: TeamLineup,
  homeConfig: TeamRotationConfig,
  opponentConfig: TeamRotationConfig,
  homeRoster: Player[],
  opponentRoster: Player[]
): RotationUpdate {
  // Check if side-out occurred
  if (detectSideOut(currentServingTeam, scoringTeam)) {
    // Side-out occurred - rotate new serving team
    let newHomeLineup = homeLineup;
    let newOpponentLineup = opponentLineup;
    let newHomeRotation = homeConfig.currentRotation;
    let newOpponentRotation = opponentConfig.currentRotation;

    if (scoringTeam === 'home') {
      // Home team won while receiving - rotate home (they become the server)
      // Use same logic as manual rotation
      newHomeRotation = (homeConfig.currentRotation % 6) + 1;
      // getLineupForRotation now includes libero substitution via getRotations()
      // Home will be serving after this rotation
      newHomeLineup = getLineupForRotation(homeConfig, newHomeRotation, 'home', homeRoster, null, true);

      console.log(`🔄 [handlePointEnd] Home team rotated to rotation ${newHomeRotation} (now serving)`);
    } else {
      // Opponent team won while receiving - rotate opponent (they become the server)
      // Use same logic as manual rotation
      newOpponentRotation = (opponentConfig.currentRotation % 6) + 1;
      // getLineupForRotation now includes libero substitution via getRotations()
      // Opponent will be serving after this rotation
      newOpponentLineup = getLineupForRotation(opponentConfig, newOpponentRotation, 'opponent', opponentRoster, null, true);

      console.log(`🔄 [handlePointEnd] Opponent team rotated to rotation ${newOpponentRotation} (now serving)`);
    }

    return {
      servingTeam: scoringTeam,
      homeLineup: newHomeLineup,
      opponentLineup: newOpponentLineup,
      rotationChanged: true,
      newHomeRotation,
      newOpponentRotation
    };
  }

  // No side-out - serving team scored, no rotation
  return {
    servingTeam: currentServingTeam,
    homeLineup: homeLineup,
    opponentLineup: opponentLineup,
    rotationChanged: false,
    newHomeRotation: homeConfig.currentRotation,  // Keep current rotation
    newOpponentRotation: opponentConfig.currentRotation
  };
}

/**
 * Save set configuration to localStorage
 */
export function saveSetConfiguration(
  matchId: string,
  setNumber: number,
  homeConfig: TeamRotationConfig,
  opponentConfig: TeamRotationConfig,
  startingServer: 'home' | 'opponent'
): void {
  const key = `match_${matchId}_rotations`;
  const existing = localStorage.getItem(key);
  const data = existing
    ? JSON.parse(existing)
    : { matchId, setConfigurations: {} };

  data.setConfigurations[setNumber] = {
    home: homeConfig,
    opponent: opponentConfig,
    startingServer,
    configuredAt: Date.now()
  };

  localStorage.setItem(key, JSON.stringify(data));
}

/**
 * Migrate legacy config to use PlayerReference
 * Handles backward compatibility with old string-based player references
 */
function migrateConfigToPlayerReference(
  config: any,
  roster: Player[]
): TeamRotationConfig {
  console.log('🔄 [migrateConfig] Starting migration:', {
    system: config.system,
    playersRaw: config.players,
    liberoRaw: config.libero,
    rosterSize: roster.length
  });

  const roles = VOLLEYBALL_SYSTEMS[config.system];
  const migratedPlayers: Record<string, PlayerReference> = {};

  // Migrate each player role
  roles.forEach((role: string) => {
    const storedValue = config.players[role];
    console.log(`🔄 [migrateConfig] Processing role ${role}:`, {
      storedValue,
      type: typeof storedValue
    });

    if (typeof storedValue === 'string') {
      // Legacy format - deserialize from string
      migratedPlayers[role] = deserializePlayerReference(storedValue, roster);
      console.log(`✅ [migrateConfig] Migrated ${role}: "${storedValue}" →`, migratedPlayers[role]);
    } else if (storedValue && typeof storedValue === 'object' && 'type' in storedValue) {
      // Already in new format
      migratedPlayers[role] = storedValue as PlayerReference;
      console.log(`✅ [migrateConfig] ${role} already in new format:`, migratedPlayers[role]);
    } else {
      // Invalid/empty - create empty custom reference
      console.warn(`⚠️ [migrateConfig] ${role} has invalid value, creating fallback`);
      migratedPlayers[role] = {
        type: 'custom',
        jerseyNumber: 0,
        displayName: '',
        syntheticId: 'CUSTOM:0'
      };
    }
  });

  // Migrate libero
  let migratedLibero: PlayerReference | null = null;
  if (config.libero) {
    if (typeof config.libero === 'string') {
      // Legacy format
      migratedLibero = deserializePlayerReference(config.libero, roster);
      console.log(`🔄 [migrateConfig] Migrated libero: "${config.libero}" → PlayerReference`);
    } else if (typeof config.libero === 'object' && 'type' in config.libero) {
      // Already in new format
      migratedLibero = config.libero as PlayerReference;
    }
  }

  // Set smart defaults for liberoReplacementTargets if not already set
  // Default to BOTH middle blockers if they exist
  let liberoTargets: PlayerRole[] = [];

  // Check if already has new format (array)
  if (config.liberoReplacementTargets && Array.isArray(config.liberoReplacementTargets)) {
    liberoTargets = config.liberoReplacementTargets;
  }
  // Check if has old format (single value) - migrate it
  else if ((config as any).liberoReplacementTarget) {
    liberoTargets = [(config as any).liberoReplacementTarget];
    console.log(`🔄 [migrateConfig] Migrated single liberoReplacementTarget to array`);
  }
  // Set smart defaults if not configured and libero exists
  else if (liberoTargets.length === 0 && migratedLibero) {
    // Find all MB roles in the system
    const mbRoles = roles.filter((r: string) =>
      r === 'MB' || r === 'MB (w.s)' || r === 'MB1' || r === 'MB2'
    ) as PlayerRole[];

    if (mbRoles.length > 0) {
      liberoTargets = mbRoles;
      console.log(`🔄 [migrateConfig] Set smart default liberoReplacementTargets: [${mbRoles.join(', ')}]`);
    } else {
      // Fallback: first non-setter role
      const nonSetterRole = roles.find((r: string) => r !== 'S' && !r.includes('S1') && !r.includes('S2'));
      if (nonSetterRole) {
        liberoTargets = [nonSetterRole as PlayerRole];
        console.log(`🔄 [migrateConfig] Set fallback liberoReplacementTargets: [${nonSetterRole}]`);
      }
    }
  }

  return {
    system: config.system,
    players: migratedPlayers as Record<PlayerRole, PlayerReference>,
    startingP1: config.startingP1,
    libero: migratedLibero,
    liberoReplacementTargets: liberoTargets,
    currentRotation: config.currentRotation || 1
  };
}

/**
 * Load set configuration from localStorage
 * UPDATED: Migrates legacy configs to PlayerReference format
 */
export function loadSetConfiguration(
  matchId: string,
  setNumber: number,
  homeRoster: Player[],
  opponentRoster: Player[]
): { home: TeamRotationConfig; opponent: TeamRotationConfig; startingServer: 'home' | 'opponent' } | null {
  const key = `match_${matchId}_rotations`;
  const data = localStorage.getItem(key);

  if (!data) return null;

  const parsed = JSON.parse(data);
  const config = parsed.setConfigurations?.[setNumber];

  if (!config) return null;

  // Migrate both team configs
  const migratedHome = migrateConfigToPlayerReference(config.home, homeRoster);
  const migratedOpponent = migrateConfigToPlayerReference(config.opponent, opponentRoster);

  console.log('✅ [loadSetConfiguration] Migrated config:', {
    home: migratedHome,
    opponent: migratedOpponent
  });

  return {
    home: migratedHome,
    opponent: migratedOpponent,
    startingServer: config.startingServer
  };
}

/**
 * Helper: Apply libero without roster (for manual rotation)
 *
 * @deprecated This function is NO LONGER USED - libero substitution now happens
 * inside getRotations() in volleyballSystems.js.
 *
 * DO NOT CALL THIS FUNCTION - it will create duplicate liberos!
 */
function applyLiberoSubstitutionsWithoutRoster(
  lineup: TeamLineup,
  config: TeamRotationConfig
): { lineup: TeamLineup; substitutions: LiberoSubstitution[] } {
  if (!config.libero) {
    return { lineup, substitutions: [] };
  }

  // Find libero in current lineup
  const liberoPlayer = Object.values(lineup).find(p => p?.isLibero);
  if (!liberoPlayer) {
    // Libero not in lineup, can't substitute
    return { lineup, substitutions: [] };
  }

  // Apply substitution logic (same as main function)
  // Prioritize P5 for libero substitution (then P6, then P1)
  const backRowPositions: VolleyballPosition[] = ['P5', 'P6', 'P1'];
  const updatedLineup = { ...lineup };
  const substitutions: LiberoSubstitution[] = [];

  // Only substitute libero for ONE middle blocker (the first found in priority order)
  let liberoSubstituted = false;

  for (const pos of backRowPositions) {
    if (liberoSubstituted) break;

    const player = lineup[pos];
    if (!player || player.isLibero) continue;

    // Check if player is a middle blocker
    const isMB = isMiddleBlocker(player.roleInSystem);

    if (isMB) {
      // Create libero for this position
      const liberoAtPosition: PlayerInPosition = {
        ...liberoPlayer,
        position: pos,
        originalRole: player.roleInSystem
      };

      // Record substitution
      substitutions.push({
        position: pos,
        liberoPlayer: liberoAtPosition,
        replacedPlayer: player,
        timestamp: Date.now()
      });

      // Replace in lineup
      updatedLineup[pos] = liberoAtPosition;

      liberoSubstituted = true;
    }
  }

  return { lineup: updatedLineup, substitutions };
}

/**
 * Manually rotate team forward (+1 rotation)
 * UPDATED: Uses getLineupForRotation() to get correct rotation from system
 * Rotation is clockwise (P1→P2→P3→P4→P5→P6→P1) for both teams
 */
export function manualRotateForward(
  lineup: TeamLineup,
  config: TeamRotationConfig,
  roster: Player[],
  team: 'home' | 'opponent',
  manualSwapRole?: PlayerRole | null,  // NEW: Optional manual swap override
  isServing?: boolean  // NEW: Whether this team is serving (affects P1 libero swap)
): { lineup: TeamLineup; newRotation: number } {
  // Calculate new rotation number (1-6, wraps around)
  // Both teams rotate in the same direction around the court
  const newRotation = (config.currentRotation % 6) + 1;

  // Get the lineup for the new rotation directly from the system
  // getLineupForRotation now includes libero substitution via getRotations()
  // NEW: Pass manual swap role for override and serving status
  const newLineup = getLineupForRotation(config, newRotation, team, roster, manualSwapRole, isServing);

  return {
    lineup: newLineup,
    newRotation
  };
}

/**
 * Manually rotate team backward (-1 rotation)
 * UPDATED: Uses getLineupForRotation() to get correct rotation from system
 * Rotation is counter-clockwise (P1→P6→P5→P4→P3→P2→P1) for both teams
 */
export function manualRotateBackward(
  lineup: TeamLineup,
  config: TeamRotationConfig,
  roster: Player[],
  team: 'home' | 'opponent',
  manualSwapRole?: PlayerRole | null,  // NEW: Optional manual swap override
  isServing?: boolean  // NEW: Whether this team is serving (affects P1 libero swap)
): { lineup: TeamLineup; newRotation: number } {
  // Calculate new rotation number (1-6, wraps around)
  // Both teams rotate in the same direction around the court
  const newRotation = config.currentRotation === 1 ? 6 : config.currentRotation - 1;

  // Get the lineup for the new rotation directly from the system
  // getLineupForRotation now includes libero substitution via getRotations()
  // NEW: Pass manual swap role for override and serving status
  const newLineup = getLineupForRotation(config, newRotation, team, roster, manualSwapRole, isServing);

  return {
    lineup: newLineup,
    newRotation
  };
}
