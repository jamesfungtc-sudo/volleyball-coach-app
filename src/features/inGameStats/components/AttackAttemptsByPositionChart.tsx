import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { PointData, Player } from '../types';
import './AttackAttemptsByPositionChart.css';

interface AttackAttemptsByPositionChartProps {
  points: PointData[];
  roster: Player[];
  teamName: string;
  team: 'home' | 'opponent';
}

// Helper function to get player name from ID
const getPlayerName = (playerId: string | undefined, roster: Player[]): string => {
  if (!playerId) return 'Unknown';
  const player = roster.find(p => p.id === playerId.trim());
  return player ? player.name : playerId;
};

// Parse position from locationTempo
const getPosition = (tempo: string = ""): string | null => {
  const l = tempo.toLowerCase();
  if (l.includes("oh")) return "OH";
  if (l.includes("mb")) return "MB";
  if (l.includes("oppo")) return "Oppo";
  if (l.includes("back")) return "BackRow";
  return null;
};

// Generate consistent color for each player
const PLAYER_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'
];

export const AttackAttemptsByPositionChart: React.FC<AttackAttemptsByPositionChartProps> = ({
  points,
  roster,
  teamName,
  team
}) => {
  const chartData = useMemo(() => {
    // Filter attack attempts based on team
    const attackPoints = points.filter(p => {
      const { action_type, winning_team } = p;

      if (team === 'home') {
        const isValidAttack = action_type === 'Att.' && winning_team === 'home';
        const isAttackError = action_type === 'Sp. E.';
        return isValidAttack || isAttackError;
      } else {
        const isValidAttack = action_type === 'Op. Att.' && winning_team === 'opponent';
        const isAttackError = action_type === 'Op. E.' && p.action?.includes('Hit');
        return isValidAttack || isAttackError;
      }
    });

    // Build position map: { OH: { playerId: count, ... }, MB: {...}, ... }
    const positionMap: { [position: string]: { [playerId: string]: number } } = {};

    attackPoints.forEach(point => {
      const playerId = team === 'home'
        ? point.home_player?.trim()
        : point.opponent_player?.trim();

      const position = getPosition(point.locationTempo);

      if (!playerId || !position) return;

      if (!positionMap[position]) {
        positionMap[position] = {};
      }
      positionMap[position][playerId] = (positionMap[position][playerId] || 0) + 1;
    });

    // Define all positions
    const allPositions = ["OH", "MB", "Oppo", "BackRow"];

    // Get all unique players
    const allPlayerIds = Array.from(
      new Set(
        Object.values(positionMap)
          .flatMap(p => Object.keys(p))
      )
    );

    // Transform to Recharts format: array of objects
    // Each object: { position: "OH", "Player1": 5, "Player2": 3, ... }
    const data = allPositions.map(position => {
      const dataPoint: any = { position };

      allPlayerIds.forEach(playerId => {
        const playerName = getPlayerName(playerId, roster);
        dataPoint[playerName] = positionMap[position]?.[playerId] || 0;
      });

      return dataPoint;
    });

    // Get player names for bars
    const playerNames = allPlayerIds.map(playerId => getPlayerName(playerId, roster));

    return { data, playerNames };
  }, [points, roster, team]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{label}</p>
          {payload.map((entry: any, index: number) => (
            entry.value > 0 && (
              <p key={index} style={{ color: entry.color }}>
                {entry.name}: {entry.value}
              </p>
            )
          ))}
        </div>
      );
    }
    return null;
  };

  if (chartData.data.length === 0 || chartData.playerNames.length === 0) {
    return (
      <div className="attack-attempts-by-position-chart">
        <h3 className="chart-title">Attack Attempts by Position - {teamName}</h3>
        <div className="empty-state">No attack data available</div>
      </div>
    );
  }

  return (
    <div className="attack-attempts-by-position-chart">
      <h3 className="chart-title">Attack Attempts by Position - {teamName}</h3>

      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={chartData.data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="position" />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {chartData.playerNames.map((playerName, index) => (
            <Bar
              key={playerName}
              dataKey={playerName}
              fill={PLAYER_COLORS[index % PLAYER_COLORS.length]}
              stackId="a"
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
