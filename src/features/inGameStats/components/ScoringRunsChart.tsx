import React, { useMemo } from 'react';
import type { PointData } from '../../../types/inGameStats.types';
import './ScoringRunsChart.css';

interface ScoringRunsChartProps {
  points: PointData[];
  homeTeamName: string;
  opponentTeamName: string;
}

interface ScoringRun {
  team: 'home' | 'opponent';
  count: number;
  startPoint: number;
  endPoint: number;
}

/**
 * ScoringRunsChart - Visualizes consecutive point scoring runs
 * Shows momentum shifts and streaks throughout the set
 */
export function ScoringRunsChart({
  points,
  homeTeamName,
  opponentTeamName
}: ScoringRunsChartProps) {
  const runs = useMemo(() => {
    if (points.length === 0) return [];

    const scoringRuns: ScoringRun[] = [];
    let currentRun: ScoringRun | null = null;

    points.forEach((point, index) => {
      if (!currentRun || currentRun.team !== point.winning_team) {
        // Start a new run
        if (currentRun) {
          scoringRuns.push(currentRun);
        }
        currentRun = {
          team: point.winning_team,
          count: 1,
          startPoint: index + 1,
          endPoint: index + 1
        };
      } else {
        // Continue current run
        currentRun.count++;
        currentRun.endPoint = index + 1;
      }
    });

    // Push the last run
    if (currentRun) {
      scoringRuns.push(currentRun);
    }

    // Filter runs of 2+ points for cleaner visualization
    return scoringRuns.filter((run) => run.count >= 2);
  }, [points]);

  if (runs.length === 0) {
    return (
      <div className="chart-container scoring-runs-chart">
        <h3 className="chart-title">Scoring Runs</h3>
        <div className="chart-empty">No significant runs yet (2+ consecutive points)</div>
      </div>
    );
  }

  const maxRunLength = Math.max(...runs.map((r) => r.count));

  return (
    <div className="chart-container scoring-runs-chart">
      <h3 className="chart-title">Scoring Runs (2+ Points)</h3>
      <div className="chart-legend">
        <span className="legend-item home">
          <span className="legend-color home"></span>
          {homeTeamName}
        </span>
        <span className="legend-item opponent">
          <span className="legend-color opponent"></span>
          {opponentTeamName}
        </span>
      </div>

      <div className="runs-bars-container">
        {runs.map((run, index) => {
          const percentage = (run.count / maxRunLength) * 100;
          return (
            <div key={index} className="run-bar-row">
              <div className="run-label">
                <span className="run-points">
                  Points {run.startPoint}-{run.endPoint}
                </span>
              </div>
              <div className="run-bar-track">
                <div
                  className={`run-bar ${run.team}`}
                  style={{ width: `${percentage}%` }}
                  title={`${run.team === 'home' ? homeTeamName : opponentTeamName}: ${run.count} points in a row`}
                >
                  <span className="run-count">{run.count}-0</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="chart-footer">
        <span className="footer-label">Consecutive points scored</span>
      </div>
    </div>
  );
}
