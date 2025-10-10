import type { PointData, PlayerData } from '../../../types/inGameStats.types';

/**
 * Summary statistics for the match
 */
export interface SummaryStats {
  home: {
    kills: number;
    killErrors: number;
    aces: number;
    serviceErrors: number;
    blocks: number;
    opponentErrors: number;
  };
  opponent: {
    kills: number;
    killErrors: number;
    aces: number;
    serviceErrors: number;
    blocks: number;
    opponentErrors: number;
  };
}

/**
 * Player K/D (Kills/Deaths) statistics
 */
export interface PlayerKDStats {
  player: string;
  kills: number;
  errors: number;
  attempts: number;
  efficiency: number;
  team: 'home' | 'opponent';
}

/**
 * Kill zone data by location
 */
export interface KillZoneData {
  zone: string;
  count: number;
  player: string;
  team: 'home' | 'opponent';
}

/**
 * Attack distribution by position
 */
export interface AttackDistributionData {
  position: string;
  count: number;
  percentage: number;
  team: 'home' | 'opponent';
}

/**
 * Momentum data
 */
export interface MomentumData {
  lastNPoints: Array<{ winning_team: 'home' | 'opponent'; action: string }>;
  currentRun: { team: 'home' | 'opponent' | null; count: number };
  momentumScore: number;
  sideOutPercentage: { home: number; opponent: number };
}

/**
 * Error breakdown data
 */
export interface ErrorBreakdownData {
  team: 'home' | 'opponent';
  attackErrors: number;
  serviceErrors: number;
  otherErrors: number;
  total: number;
}

/**
 * Points by action type
 */
export interface PointsByActionData {
  actionType: string;
  count: number;
  percentage: number;
  team: 'home' | 'opponent';
}

/**
 * Calculate summary statistics from point data
 */
export function calculateSummaryStats(points: PointData[]): SummaryStats {
  const stats: SummaryStats = {
    home: { kills: 0, killErrors: 0, aces: 0, serviceErrors: 0, blocks: 0, opponentErrors: 0 },
    opponent: { kills: 0, killErrors: 0, aces: 0, serviceErrors: 0, blocks: 0, opponentErrors: 0 }
  };

  points.forEach((point) => {
    const isHomeWin = point.winning_team === 'home';

    // Count kills (attacks that won points)
    if (point.action_type === 'Att.' && isHomeWin) {
      stats.home.kills++;
    } else if (point.action_type === 'Op. Att.' && !isHomeWin) {
      stats.opponent.kills++;
    }

    // Count kill errors (spike errors)
    if (point.action_type === 'Sp. E.' && !isHomeWin) {
      stats.home.killErrors++;
    } else if (point.action_type === 'Op. E.' && !isHomeWin && point.action.includes('Hit')) {
      stats.opponent.killErrors++;
    }

    // Count aces
    if (point.action_type === 'Ser.' && isHomeWin) {
      stats.home.aces++;
    } else if (point.action_type === 'Op. Ace' && !isHomeWin) {
      stats.opponent.aces++;
    }

    // Count service errors
    if (point.action_type === 'Ser. E.' && !isHomeWin) {
      stats.home.serviceErrors++;
    } else if (point.action_type === 'Op. E.' && !isHomeWin && point.action.includes('Ser')) {
      stats.opponent.serviceErrors++;
    }

    // Count blocks
    if (point.action_type === 'Blo.' && isHomeWin) {
      stats.home.blocks++;
    } else if (point.action_type === 'Op. Att.' && isHomeWin && point.action.includes('Block')) {
      stats.home.blocks++;
    }

    // Count opponent errors (errors that gave us points)
    if (point.action_type === 'Op. E.' && isHomeWin) {
      stats.home.opponentErrors++;
    } else if ((point.action_type === 'Sp. E.' || point.action_type === 'Ser. E.') && !isHomeWin) {
      stats.opponent.opponentErrors++;
    }
  });

  return stats;
}

/**
 * Calculate player K/D statistics
 */
export function calculatePlayerKDStats(
  points: PointData[],
  homePlayers: PlayerData[],
  opponentPlayers: PlayerData[]
): PlayerKDStats[] {
  const playerStats = new Map<string, PlayerKDStats>();

  // Initialize stats for all players using player ID (or name for old data)
  [...homePlayers, ...opponentPlayers].forEach((player) => {
    const team = homePlayers.includes(player) ? 'home' : 'opponent';
    const playerId = player.id || player.name; // Use ID if available, fallback to name
    playerStats.set(playerId, {
      player: playerId,
      kills: 0,
      errors: 0,
      attempts: 0,
      efficiency: 0,
      team
    });
  });

  points.forEach((point) => {
    const isHomeWin = point.winning_team === 'home';

    // Home team attacks
    if (point.home_player) {
      const stats = playerStats.get(point.home_player);
      if (stats) {
        if (point.action_type === 'Att.' && isHomeWin) {
          stats.kills++;
          stats.attempts++;
        } else if (point.action_type === 'Sp. E.' && !isHomeWin) {
          stats.errors++;
          stats.attempts++;
        }
      }
    }

    // Opponent team attacks
    if (point.opponent_player) {
      const stats = playerStats.get(point.opponent_player);
      if (stats) {
        if (point.action_type === 'Op. Att.' && !isHomeWin) {
          stats.kills++;
          stats.attempts++;
        } else if (point.action_type === 'Op. E.' && isHomeWin && point.action.includes('Hit')) {
          stats.errors++;
          stats.attempts++;
        }
      }
    }
  });

  // Calculate efficiency for each player
  playerStats.forEach((stats) => {
    if (stats.attempts > 0) {
      stats.efficiency = (stats.kills - stats.errors) / stats.attempts;
    }
  });

  // Return only players with attempts
  return Array.from(playerStats.values()).filter((s) => s.attempts > 0);
}

/**
 * Calculate kill zones distribution
 */
export function calculateKillZones(points: PointData[]): KillZoneData[] {
  const zones = new Map<string, KillZoneData>();

  points.forEach((point) => {
    const isHomeWin = point.winning_team === 'home';
    const isKill = (point.action_type === 'Att.' && isHomeWin) ||
                   (point.action_type === 'Op. Att.' && !isHomeWin);

    if (isKill && point.locationTempo) {
      const player = isHomeWin ? point.home_player : point.opponent_player;
      const team = isHomeWin ? 'home' : 'opponent';
      const key = `${point.locationTempo}-${player}-${team}`;

      if (!zones.has(key)) {
        zones.set(key, {
          zone: point.locationTempo,
          count: 0,
          player,
          team
        });
      }
      zones.get(key)!.count++;
    }
  });

  return Array.from(zones.values());
}

/**
 * Calculate attack distribution by position
 */
export function calculateAttackDistribution(points: PointData[]): AttackDistributionData[] {
  const positions = new Map<string, { count: number; team: 'home' | 'opponent' }>();

  points.forEach((point) => {
    const isHomeAttack = point.action_type === 'Att.' || point.action_type === 'Sp. E.';
    const isOpponentAttack = point.action_type === 'Op. Att.' ||
                             (point.action_type === 'Op. E.' && point.action.includes('Hit'));

    if ((isHomeAttack || isOpponentAttack) && point.locationTempo) {
      const team = isHomeAttack ? 'home' : 'opponent';
      let position = 'Other';

      // Map location to position
      if (point.locationTempo.includes('OH')) position = 'OH';
      else if (point.locationTempo.includes('MB')) position = 'MB';
      else if (point.locationTempo.includes('Oppo')) position = 'Oppo';
      else if (point.locationTempo.includes('Back Row')) position = 'BackRow';

      const key = `${position}-${team}`;
      if (!positions.has(key)) {
        positions.set(key, { count: 0, team });
      }
      positions.get(key)!.count++;
    }
  });

  // Calculate percentages
  const homeTotal = Array.from(positions.values())
    .filter((p) => p.team === 'home')
    .reduce((sum, p) => sum + p.count, 0);
  const opponentTotal = Array.from(positions.values())
    .filter((p) => p.team === 'opponent')
    .reduce((sum, p) => sum + p.count, 0);

  return Array.from(positions.entries()).map(([key, data]) => {
    const position = key.split('-')[0];
    const total = data.team === 'home' ? homeTotal : opponentTotal;
    return {
      position,
      count: data.count,
      percentage: total > 0 ? (data.count / total) * 100 : 0,
      team: data.team
    };
  });
}

/**
 * Calculate momentum indicators
 */
export function calculateMomentum(points: PointData[], windowSize: number = 10): MomentumData {
  const lastN = points.slice(-windowSize);

  // Calculate current run
  let currentRun = { team: null as 'home' | 'opponent' | null, count: 0 };
  for (let i = points.length - 1; i >= 0; i--) {
    const team = points[i].winning_team;
    if (currentRun.team === null) {
      currentRun.team = team;
      currentRun.count = 1;
    } else if (currentRun.team === team) {
      currentRun.count++;
    } else {
      break;
    }
  }

  // Calculate momentum score (weighted recent points)
  let momentumScore = 0;
  lastN.forEach((point, index) => {
    const weight = index + 1;
    momentumScore += point.winning_team === 'home' ? weight : -weight;
  });

  // Calculate side-out percentage (simplified - would need serve tracking for accuracy)
  const sideOutPercentage = { home: 0, opponent: 0 };

  return {
    lastNPoints: lastN.map((p) => ({ winning_team: p.winning_team, action: p.action_type })),
    currentRun,
    momentumScore,
    sideOutPercentage
  };
}

/**
 * Calculate error breakdown
 */
export function calculateErrorBreakdown(points: PointData[]): ErrorBreakdownData[] {
  const homeErrors = { attackErrors: 0, serviceErrors: 0, otherErrors: 0 };
  const opponentErrors = { attackErrors: 0, serviceErrors: 0, otherErrors: 0 };

  points.forEach((point) => {
    const isHomeError = !point.winning_team;

    if (point.action_type === 'Sp. E.') {
      homeErrors.attackErrors++;
    } else if (point.action_type === 'Ser. E.') {
      homeErrors.serviceErrors++;
    } else if (point.action_type === 'Op. E.' && !point.winning_team) {
      opponentErrors.attackErrors++;
    }
  });

  return [
    {
      team: 'home',
      ...homeErrors,
      total: homeErrors.attackErrors + homeErrors.serviceErrors + homeErrors.otherErrors
    },
    {
      team: 'opponent',
      ...opponentErrors,
      total: opponentErrors.attackErrors + opponentErrors.serviceErrors + opponentErrors.otherErrors
    }
  ];
}

/**
 * Player attack and ace contribution data
 */
export interface PlayerAttackContribution {
  playerId: string;
  team: 'home' | 'opponent';
  attacks: number;  // Total attack attempts (kills + errors)
  aces: number;     // Aces
}

/**
 * Calculate player attack and ace contributions for Hit vs Ace Ratio chart
 */
export function calculatePlayerAttackContributions(points: PointData[]): PlayerAttackContribution[] {
  const playerStats = new Map<string, PlayerAttackContribution>();

  points.forEach((point) => {
    const isHomeWin = point.winning_team === 'home';

    // Home team player
    if (point.home_player) {
      if (!playerStats.has(point.home_player)) {
        playerStats.set(point.home_player, {
          playerId: point.home_player,
          team: 'home',
          attacks: 0,
          aces: 0
        });
      }
      const stats = playerStats.get(point.home_player)!;

      // Count attacks (kills + errors)
      if (point.action_type === 'Att.' || point.action_type === 'Sp. E.') {
        stats.attacks++;
      }

      // Count aces
      if (point.action_type === 'Ser.' && isHomeWin) {
        stats.aces++;
      }
    }

    // Opponent team player
    if (point.opponent_player) {
      if (!playerStats.has(point.opponent_player)) {
        playerStats.set(point.opponent_player, {
          playerId: point.opponent_player,
          team: 'opponent',
          attacks: 0,
          aces: 0
        });
      }
      const stats = playerStats.get(point.opponent_player)!;

      // Count attacks (kills + errors)
      if (point.action_type === 'Op. Att.' || (point.action_type === 'Op. E.' && point.action.includes('Hit'))) {
        stats.attacks++;
      }

      // Count aces
      if (point.action_type === 'Op. Ace' && !isHomeWin) {
        stats.aces++;
      }
    }
  });

  // Return only players with activity
  return Array.from(playerStats.values()).filter(s => s.attacks > 0 || s.aces > 0);
}

/**
 * Calculate points won by action type
 */
export function calculatePointsByAction(points: PointData[]): PointsByActionData[] {
  const actionCounts = new Map<string, { count: number; team: 'home' | 'opponent' }>();

  points.forEach((point) => {
    const team = point.winning_team;
    const key = `${point.action_type}-${team}`;

    if (!actionCounts.has(key)) {
      actionCounts.set(key, { count: 0, team });
    }
    actionCounts.get(key)!.count++;
  });

  const homeTotal = points.filter((p) => p.winning_team === 'home').length;
  const opponentTotal = points.filter((p) => p.winning_team === 'opponent').length;

  return Array.from(actionCounts.entries()).map(([key, data]) => {
    const actionType = key.split('-')[0];
    const total = data.team === 'home' ? homeTotal : opponentTotal;
    return {
      actionType,
      count: data.count,
      percentage: total > 0 ? (data.count / total) * 100 : 0,
      team: data.team
    };
  });
}
