import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { PointData } from '../../../types/inGameStats.types';
import type { Player } from '../../../services/googleSheetsAPI';
import { getPlayerName, getPlayerColor } from '../utils/playerHelpers';
import './KillZonesByPlayerChart.css';

interface KillZonesByPlayerChartProps {
  points: PointData[];
  roster: Player[];
  teamName: string;
  team: 'home' | 'opponent';
}

/**
 * KillZonesByPlayerChart - Grouped bar chart showing kill locations by player
 * Based on Retool Plotly chart: Shows where each player gets their kills
 * X-axis: Location/Tempo zones
 * Y-axis: Number of kills
 * Grouped by player (each player has different colored bars)
 */
export function KillZonesByPlayerChart({
  points,
  roster,
  teamName,
  team
}: KillZonesByPlayerChartProps) {
  const chartData = useMemo(() => {
    // Filter to only this team's attack kills
    const attackPoints = points.filter(p => {
      if (team === 'home') {
        return p.winning_team === 'home' && p.action_type === 'Att.';
      } else {
        return p.winning_team === 'opponent' && p.action_type === 'Op. Att.';
      }
    });

    // Build locationTempo count by player
    const playerMap = new Map<string, Map<string, number>>();

    attackPoints.forEach(point => {
      const playerId = team === 'home'
        ? point.home_player?.trim()
        : point.opponent_player?.trim();
      const location = point.locationTempo?.trim();

      if (!playerId || !location) return;

      if (!playerMap.has(playerId)) {
        playerMap.set(playerId, new Map());
      }

      const locationCounts = playerMap.get(playerId)!;
      locationCounts.set(location, (locationCounts.get(location) || 0) + 1);
    });

    // Get all unique locations
    const allLocations = Array.from(
      new Set(attackPoints.map(p => p.locationTempo?.trim()).filter(Boolean))
    ).sort();

    // Transform to Recharts format: array of objects with location as key
    // Each object has { location: "OH (Line)", "Player1": 5, "Player2": 3, ... }
    const data = allLocations.map(location => {
      const dataPoint: any = { location };

      playerMap.forEach((locationCounts, playerId) => {
        const playerName = getPlayerName(playerId, roster);
        dataPoint[playerName] = locationCounts.get(location) || 0;
      });

      return dataPoint;
    });

    // Get player names for bars
    const playerNames = Array.from(playerMap.keys()).map(playerId =>
      getPlayerName(playerId, roster)
    );

    return { data, playerNames, playerMap };
  }, [points, roster, team]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-location">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="tooltip-stat" style={{ color: entry.color }}>
              {entry.name}: {entry.value} {entry.value === 1 ? 'kill' : 'kills'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (chartData.data.length === 0 || chartData.playerNames.length === 0) {
    return (
      <div className="kill-zones-by-player-chart">
        <h3 className="chart-title">Kill Zones by Player - {teamName}</h3>
        <div className="empty-state">No kill data available</div>
      </div>
    );
  }

  return (
    <div className="kill-zones-by-player-chart">
      <h3 className="chart-title">Kill Zones by Player - {teamName}</h3>

      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={chartData.data} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="location"
            angle={-45}
            textAnchor="end"
            height={100}
            tick={{ fontSize: 11, fill: '#6b7280' }}
          />
          <YAxis
            label={{ value: 'Number of Kills', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#6b7280' } }}
            tick={{ fontSize: 11, fill: '#6b7280' }}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: '10px' }}
            iconType="square"
          />
          {chartData.playerNames.map((playerName, index) => (
            <Bar
              key={playerName}
              dataKey={playerName}
              fill={getPlayerColor(playerName, index)}
              name={playerName}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
