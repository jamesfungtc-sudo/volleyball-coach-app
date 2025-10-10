import React, { useMemo } from 'react';
import type { PointData } from '../../../types/inGameStats.types';
import type { Player } from '../../../services/googleSheetsAPI';
import { calculatePlayerAttackContributions } from '../utils/statsCalculations';
import { getPlayerName, getPlayerColor } from '../utils/playerHelpers';
import './PlayerHitAceRatioChart.css';

interface PlayerHitAceRatioChartProps {
  points: PointData[];
  homeRoster: Player[];
  opponentRoster: Player[];
  homeTeamName: string;
  opponentTeamName: string;
}

/**
 * PlayerHitAceRatioChart - Stacked horizontal bar chart showing player contributions
 * to hits (attacks) and aces, separated by team
 *
 * Shows 2 rows per team (Aces, Hits) with each row at 100%, segmented by player
 */
export function PlayerHitAceRatioChart({
  points,
  homeRoster,
  opponentRoster,
  homeTeamName,
  opponentTeamName
}: PlayerHitAceRatioChartProps) {
  const contributions = useMemo(() => calculatePlayerAttackContributions(points), [points]);

  const homeContributions = contributions.filter(c => c.team === 'home');
  const opponentContributions = contributions.filter(c => c.team === 'opponent');

  // Calculate totals for percentage
  const homeTotalAttacks = homeContributions.reduce((sum, c) => sum + c.attacks, 0);
  const homeTotalAces = homeContributions.reduce((sum, c) => sum + c.aces, 0);
  const opponentTotalAttacks = opponentContributions.reduce((sum, c) => sum + c.attacks, 0);
  const opponentTotalAces = opponentContributions.reduce((sum, c) => sum + c.aces, 0);

  const renderBar = (
    contributions: typeof homeContributions,
    roster: Player[],
    total: number,
    type: 'attacks' | 'aces'
  ) => {
    if (total === 0) {
      return <div className="empty-bar">No data</div>;
    }

    return (
      <div className="stacked-bar">
        {contributions.map((contrib, index) => {
          const value = type === 'attacks' ? contrib.attacks : contrib.aces;
          if (value === 0) return null;

          const percentage = (value / total) * 100;
          const playerName = getPlayerName(contrib.playerId, roster);
          const color = getPlayerColor(contrib.playerId, index);

          return (
            <div
              key={`${contrib.playerId}-${type}`}
              className="bar-segment"
              style={{
                width: `${percentage}%`,
                backgroundColor: color
              }}
              title={`${playerName}: ${value} (${percentage.toFixed(1)}%)`}
            >
              {percentage > 8 && ( // Only show label if segment is wide enough
                <span className="bar-label">{value}</span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderLegend = (contributions: typeof homeContributions, roster: Player[]) => {
    return (
      <div className="chart-legend">
        {contributions.map((contrib, index) => {
          const playerName = getPlayerName(contrib.playerId, roster);
          const color = getPlayerColor(contrib.playerId, index);

          return (
            <div key={contrib.playerId} className="legend-item">
              <div className="legend-color" style={{ backgroundColor: color }} />
              <span className="legend-label">{playerName}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="player-hit-ace-ratio-chart">
      <h3 className="chart-title">Hit vs Ace Ratio</h3>

      <div className="teams-container">
        {/* Home Team */}
        <div className="team-section">
          <h4 className="team-title">{homeTeamName}</h4>

          <div className="ratio-row">
            <div className="row-label">Aces</div>
            <div className="row-bar">
              {renderBar(homeContributions, homeRoster, homeTotalAces, 'aces')}
            </div>
            <div className="row-total">{homeTotalAces}</div>
          </div>

          <div className="ratio-row">
            <div className="row-label">Hits</div>
            <div className="row-bar">
              {renderBar(homeContributions, homeRoster, homeTotalAttacks, 'attacks')}
            </div>
            <div className="row-total">{homeTotalAttacks}</div>
          </div>

          {renderLegend(homeContributions, homeRoster)}
        </div>

        {/* Opponent Team */}
        <div className="team-section">
          <h4 className="team-title">{opponentTeamName}</h4>

          <div className="ratio-row">
            <div className="row-label">Aces</div>
            <div className="row-bar">
              {renderBar(opponentContributions, opponentRoster, opponentTotalAces, 'aces')}
            </div>
            <div className="row-total">{opponentTotalAces}</div>
          </div>

          <div className="ratio-row">
            <div className="row-label">Hits</div>
            <div className="row-bar">
              {renderBar(opponentContributions, opponentRoster, opponentTotalAttacks, 'attacks')}
            </div>
            <div className="row-total">{opponentTotalAttacks}</div>
          </div>

          {renderLegend(opponentContributions, opponentRoster)}
        </div>
      </div>
    </div>
  );
}
