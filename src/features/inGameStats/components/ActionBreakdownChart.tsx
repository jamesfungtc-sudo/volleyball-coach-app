import React, { useMemo } from 'react';
import type { PointData } from '../../../types/inGameStats.types';
import './ActionBreakdownChart.css';

interface ActionBreakdownChartProps {
  points: PointData[];
  homeTeamName: string;
  opponentTeamName: string;
}

interface ActionCount {
  actionType: string;
  count: number;
  percentage: number;
  color: string;
}

interface TeamActionData {
  home: ActionCount[];
  opponent: ActionCount[];
}

// Color palette for action types
const ACTION_COLORS: Record<string, string> = {
  'Att.': '#3b82f6',      // Blue
  'Ser.': '#10b981',      // Green
  'Blo.': '#f59e0b',      // Amber
  'Op. E.': '#8b5cf6',    // Purple
  'Other': '#6b7280',     // Gray
  'Op. Att.': '#ef4444',  // Red
  'Op. Ace': '#ec4899',   // Pink
  'Sp. E.': '#f97316',    // Orange
  'Ser. E.': '#14b8a6'    // Teal
};

/**
 * ActionBreakdownChart - Shows how points are won/lost by action type
 * Displays separate breakdowns for home and opponent
 */
export function ActionBreakdownChart({
  points,
  homeTeamName,
  opponentTeamName
}: ActionBreakdownChartProps) {
  const actionData = useMemo((): TeamActionData => {
    const homeCounts: Record<string, number> = {};
    const opponentCounts: Record<string, number> = {};
    let homeTotal = 0;
    let opponentTotal = 0;

    points.forEach((point) => {
      if (point.winning_team === 'home') {
        homeCounts[point.action_type] = (homeCounts[point.action_type] || 0) + 1;
        homeTotal++;
      } else {
        opponentCounts[point.action_type] = (opponentCounts[point.action_type] || 0) + 1;
        opponentTotal++;
      }
    });

    const createActionCounts = (counts: Record<string, number>, total: number): ActionCount[] => {
      return Object.entries(counts)
        .map(([actionType, count]) => ({
          actionType,
          count,
          percentage: total > 0 ? (count / total) * 100 : 0,
          color: ACTION_COLORS[actionType] || '#9ca3af'
        }))
        .sort((a, b) => b.count - a.count);
    };

    return {
      home: createActionCounts(homeCounts, homeTotal),
      opponent: createActionCounts(opponentCounts, opponentTotal)
    };
  }, [points]);

  if (points.length === 0) {
    return (
      <div className="chart-container action-breakdown-chart">
        <h3 className="chart-title">Action Breakdown</h3>
        <div className="chart-empty">No points to analyze</div>
      </div>
    );
  }

  const renderBreakdown = (actions: ActionCount[], teamName: string) => {
    if (actions.length === 0) {
      return <div className="no-data">No points won</div>;
    }

    return (
      <div className="breakdown-bars">
        {actions.map((action) => (
          <div key={action.actionType} className="breakdown-bar-row">
            <div className="breakdown-label">
              <span className="action-name">{action.actionType}</span>
              <span className="action-count">({action.count})</span>
            </div>
            <div className="breakdown-bar-track">
              <div
                className="breakdown-bar"
                style={{
                  width: `${action.percentage}%`,
                  backgroundColor: action.color
                }}
              >
                <span className="breakdown-percentage">{action.percentage.toFixed(0)}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="chart-container action-breakdown-chart">
      <h3 className="chart-title">Action Breakdown</h3>
      <div className="breakdown-subtitle">How points were won</div>

      <div className="breakdowns-grid">
        {/* Home Team Breakdown */}
        <div className="team-breakdown">
          <h4 className="team-name home">{homeTeamName}</h4>
          {renderBreakdown(actionData.home, homeTeamName)}
        </div>

        {/* Opponent Team Breakdown */}
        <div className="team-breakdown">
          <h4 className="team-name opponent">{opponentTeamName}</h4>
          {renderBreakdown(actionData.opponent, opponentTeamName)}
        </div>
      </div>
    </div>
  );
}
