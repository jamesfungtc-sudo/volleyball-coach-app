import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import type { PointData } from '../../../types/inGameStats.types';
import type { Player } from '../../../services/googleSheetsAPI';
import { calculatePlayerKDStats } from '../utils/statsCalculations';
import { getPlayerName, getPlayerColor } from '../utils/playerHelpers';
import './AttackKDEfficiencyChart.css';

interface AttackKDEfficiencyChartProps {
  points: PointData[];
  homeRoster: Player[];
  opponentRoster: Player[];
  homeTeamName: string;
  opponentTeamName: string;
}

/**
 * AttackKDEfficiencyChart - Vertical bar chart showing player attack efficiency
 * Shows efficiency for both teams in a single chart for easy comparison
 * Now using Recharts for better interactivity and maintainability
 */
export function AttackKDEfficiencyChart({
  points,
  homeRoster,
  opponentRoster,
  homeTeamName,
  opponentTeamName
}: AttackKDEfficiencyChartProps) {
  const kdStats = useMemo(() => {
    const homePlayers = homeRoster.map(p => ({ id: p.id, name: p.name }));
    const opponentPlayers = opponentRoster.map(p => ({ id: p.id, name: p.name }));
    return calculatePlayerKDStats(points, homePlayers as any, opponentPlayers as any);
  }, [points, homeRoster, opponentRoster]);

  const homeStats = kdStats.filter(s => s.team === 'home' && s.attempts > 0);
  const opponentStats = kdStats.filter(s => s.team === 'opponent' && s.attempts > 0);

  // Combine both teams into one dataset with team indicator
  const chartData = useMemo(() => {
    const homeData = homeStats.map((stat, index) => ({
      name: getPlayerName(stat.player, homeRoster),
      efficiency: stat.efficiency * 100, // Allow negative values
      kills: stat.kills,
      errors: stat.errors,
      attempts: stat.attempts,
      team: homeTeamName,
      color: stat.efficiency >= 0 ? '#3b82f6' : '#ef4444' // Blue for positive, red for negative
    }));

    const opponentData = opponentStats.map((stat, index) => ({
      name: getPlayerName(stat.player, opponentRoster),
      efficiency: stat.efficiency * 100, // Allow negative values
      kills: stat.kills,
      errors: stat.errors,
      attempts: stat.attempts,
      team: opponentTeamName,
      color: stat.efficiency >= 0 ? '#10b981' : '#f97316' // Green for positive, orange for negative
    }));

    return [...homeData, ...opponentData];
  }, [homeStats, opponentStats, homeRoster, opponentRoster, homeTeamName, opponentTeamName]);

  // Calculate totals
  const homeTotalKills = homeStats.reduce((sum, s) => sum + s.kills, 0);
  const homeTotalErrors = homeStats.reduce((sum, s) => sum + s.errors, 0);
  const homeTotalAttempts = homeStats.reduce((sum, s) => sum + s.attempts, 0);

  const opponentTotalKills = opponentStats.reduce((sum, s) => sum + s.kills, 0);
  const opponentTotalErrors = opponentStats.reduce((sum, s) => sum + s.errors, 0);
  const opponentTotalAttempts = opponentStats.reduce((sum, s) => sum + s.attempts, 0);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="custom-tooltip">
          <p className="tooltip-name">{data.name}</p>
          <p className="tooltip-team">{data.team}</p>
          <p className="tooltip-stat">Efficiency: {data.efficiency.toFixed(0)}%</p>
          <p className="tooltip-stat">Kills: {data.kills}</p>
          <p className="tooltip-stat">Errors: {data.errors}</p>
          <p className="tooltip-stat">Attempts: {data.attempts}</p>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <div className="attack-kd-efficiency-chart">
        <h3 className="chart-title">Attack K/D Efficiency</h3>
        <div className="empty-state">No attack data</div>
      </div>
    );
  }

  return (
    <div className="attack-kd-efficiency-chart">
      <h3 className="chart-title">Attack K/D Efficiency</h3>

      <div className="summary-stats">
        <div className="team-summary">
          <span className="team-name">{homeTeamName}:</span>
          <span className="team-stat">K: {homeTotalKills} | E: {homeTotalErrors} | A: {homeTotalAttempts}</span>
        </div>
        <div className="team-summary">
          <span className="team-name">{opponentTeamName}:</span>
          <span className="team-stat">K: {opponentTotalKills} | E: {opponentTotalErrors} | A: {opponentTotalAttempts}</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="name"
            angle={-45}
            textAnchor="end"
            height={80}
            tick={{ fontSize: 11, fill: '#6b7280' }}
          />
          <YAxis
            domain={[-100, 100]}
            label={{ value: 'Efficiency (%)', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#6b7280' } }}
            tick={{ fontSize: 11, fill: '#6b7280' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#9ca3af" strokeWidth={2} strokeDasharray="3 3" />
          <Legend
            wrapperStyle={{ paddingTop: '10px' }}
            payload={[
              { value: `${homeTeamName} (Positive)`, type: 'square', color: '#3b82f6' },
              { value: `${homeTeamName} (Negative)`, type: 'square', color: '#ef4444' },
              { value: `${opponentTeamName} (Positive)`, type: 'square', color: '#10b981' },
              { value: `${opponentTeamName} (Negative)`, type: 'square', color: '#f97316' }
            ]}
          />
          <Bar dataKey="efficiency">
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
