import React from 'react';
import type { PointData } from '../../../types/inGameStats.types';
import { formatActionText } from '../utils/formHelpers';
import { useMatch } from '../context/MatchContext';
import './PointByPointList.css';

interface PointByPointListProps {
  points: PointData[];
  onUndo?: () => void;
}

/**
 * Format home team action for display
 */
function formatHomeAction(point: PointData, opponentJersey?: number): string {
  if (point.winning_team !== 'home') return '';

  // Pattern: Opponent error gave home a point
  if (point.action_type === 'Op. E.') {
    const jerseyNumber = opponentJersey || '?';
    const playerName = point.opponent_player || 'Unknown';
    return `[${jerseyNumber} ${playerName}] ${point.action}`;
  }

  // Pattern: Home player scored
  const playerName = point.home_player || 'Unknown';
  return `${playerName} ${formatActionText(point.action_type, point.action, point.locationTempo)}`;
}

/**
 * Format opponent team action for display
 */
function formatOpponentAction(point: PointData, opponentJersey?: number): string {
  if (point.winning_team !== 'opponent') return '';

  // Pattern: Home error gave opponent a point
  if (
    point.action_type === 'Sp. E.' ||
    point.action_type === 'Ser. E.' ||
    (point.action_type === 'Other' && point.winning_team === 'opponent')
  ) {
    const playerName = point.home_player || 'Unknown';
    return `${playerName} ${formatActionText(point.action_type, point.action, point.locationTempo)}`;
  }

  // Pattern: Opponent player scored
  const jerseyNumber = opponentJersey || '?';
  const playerName = point.opponent_player || 'Unknown';
  return `[${jerseyNumber} ${playerName}] ${formatActionText(point.action_type, point.action, point.locationTempo)}`;
}

/**
 * PointRow - Single point display
 */
function PointRow({ point, opponentTeamPlayers }: { point: PointData; opponentTeamPlayers: any[] }) {
  // Look up opponent jersey number from roster
  const opponentPlayer = opponentTeamPlayers.find(p => p.name === point.opponent_player);
  const opponentJersey = opponentPlayer?.jersey_number;

  const homeAction = formatHomeAction(point, opponentJersey);
  const opponentAction = formatOpponentAction(point, opponentJersey);

  return (
    <div className="point-row">
      <div className="score-column">{`${point.home_score} - ${point.opponent_score}`}</div>
      <div className={`action-column home-action ${homeAction ? 'visible' : 'hidden'}`}>
        {homeAction}
      </div>
      <div className={`action-column opponent-action ${opponentAction ? 'visible' : 'hidden'}`}>
        {opponentAction}
      </div>
    </div>
  );
}

/**
 * PointByPointList - Chronological list of all points
 * 3-column layout: Score | Home Action | Opponent Action
 */
export function PointByPointList({ points, onUndo }: PointByPointListProps) {
  const { opponentTeam } = useMatch();

  // Reverse order for display (newest first)
  const reversedPoints = [...points].reverse();

  return (
    <div className="point-by-point-list">
      <div className="list-header">
        <h3 className="list-title">Recent Points</h3>
        {onUndo && points.length > 0 && (
          <button type="button" className="undo-btn" onClick={onUndo} title="Undo last point">
            Undo Last
          </button>
        )}
      </div>

      {points.length === 0 ? (
        <div className="empty-state">
          <p>No points recorded yet. Start by adding the first point above.</p>
        </div>
      ) : (
        <>
          <div className="list-column-headers">
            <div className="header-score">Score</div>
            <div className="header-home">Home Team Action</div>
            <div className="header-opponent">Opponent Team Action</div>
          </div>
          <div className="points-container">
            {reversedPoints.map((point, index) => (
              <PointRow
                key={`point-${point.point_number}-${index}`}
                point={point}
                opponentTeamPlayers={opponentTeam?.players || []}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
