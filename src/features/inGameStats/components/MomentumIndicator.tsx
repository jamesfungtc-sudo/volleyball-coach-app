import React from 'react';
import './MomentumIndicator.css';

interface MomentumIndicatorProps {
  lastPoints: Array<{ winning_team: 'home' | 'opponent'; action: string }>;
  currentRun: { team: 'home' | 'opponent' | null; count: number };
  homeTeamName: string;
  opponentTeamName: string;
}

/**
 * MomentumIndicator - Shows last N points and current scoring run
 * Critical for coaches to identify momentum shifts and timeout opportunities
 */
export function MomentumIndicator({
  lastPoints,
  currentRun,
  homeTeamName,
  opponentTeamName
}: MomentumIndicatorProps) {
  return (
    <div className="momentum-indicator">
      <div className="momentum-header">
        <h3 className="momentum-title">Momentum</h3>
        {currentRun.team && currentRun.count > 1 && (
          <div className={`current-run ${currentRun.team}-run`}>
            <span className="run-team">
              {currentRun.team === 'home' ? homeTeamName : opponentTeamName}
            </span>
            <span className="run-count">{currentRun.count}-0 Run</span>
          </div>
        )}
      </div>

      <div className="last-points">
        <span className="last-points-label">Last {lastPoints.length} Points:</span>
        <div className="points-strip">
          {lastPoints.map((point, index) => (
            <div
              key={index}
              className={`point-indicator ${point.winning_team}`}
              title={`${point.winning_team === 'home' ? homeTeamName : opponentTeamName} - ${point.action}`}
            >
              {point.winning_team === 'home' ? 'W' : 'L'}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
