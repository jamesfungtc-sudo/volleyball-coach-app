import React, { useState, useMemo } from 'react';
import { CourtHeatmap } from './CourtHeatmap';
import {
  getTrajectories,
  getFilteredTrajectories,
  getPlayersWithTrajectories,
  getPlayerStats,
  type StoredTrajectory,
} from '../../services/trajectoryStorage';
import './PlayerStatsModal.css';

interface PlayerStatsModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** The match ID to load trajectories for */
  matchId: string;
  /** Current set number (for default filter) */
  currentSet: number;
  /** Home team name */
  homeTeamName: string;
  /** Opponent team name */
  opponentTeamName: string;
  /** Home team roster for dropdown */
  homeRoster: { playerId: string; playerName: string; jerseyNumber: number }[];
  /** Opponent team roster for dropdown */
  opponentRoster: { playerId: string; playerName: string; jerseyNumber: number }[];
}

type ResultFilter = 'all' | 'in_play' | 'kill_ace' | 'error';

/**
 * PlayerStatsModal - Modal showing serving and hitting location maps
 *
 * Layout: 4 maps total (2 per team)
 * - Home team: Serves | Attacks
 * - Opponent team: Serves | Attacks
 *
 * Features:
 * - Player selector dropdown per team
 * - Set filter (All sets or specific set)
 * - Result filter (All, In Play, Kill/Ace, Error)
 * - Real-time updates when trajectories are saved
 */
export const PlayerStatsModal: React.FC<PlayerStatsModalProps> = ({
  isOpen,
  onClose,
  matchId,
  currentSet,
  homeTeamName,
  opponentTeamName,
  homeRoster,
  opponentRoster,
}) => {
  // Filter state
  const [setFilter, setSetFilter] = useState<number | 'all'>('all');
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all');

  // Selected players
  const [selectedHomePlayer, setSelectedHomePlayer] = useState<string>('all');
  const [selectedOpponentPlayer, setSelectedOpponentPlayer] = useState<string>('all');

  // Get all trajectories (refreshes when modal opens)
  const allTrajectories = useMemo(() => {
    if (!isOpen) return [];
    return getTrajectories(matchId);
  }, [isOpen, matchId]);

  // Get players who have trajectory data
  const homePlayers = useMemo(() => {
    return getPlayersWithTrajectories(matchId, 'home');
  }, [matchId, allTrajectories]);

  const opponentPlayers = useMemo(() => {
    return getPlayersWithTrajectories(matchId, 'opponent');
  }, [matchId, allTrajectories]);

  // Convert result filter to array
  const getResultArray = (filter: ResultFilter): StoredTrajectory['result'][] | undefined => {
    switch (filter) {
      case 'in_play':
        return ['in_play'];
      case 'kill_ace':
        return ['kill', 'ace'];
      case 'error':
        return ['error'];
      default:
        return undefined; // All results
    }
  };

  // Filter trajectories for home team serves
  const homeServes = useMemo(() => {
    return getFilteredTrajectories(matchId, {
      team: 'home',
      actionType: 'serve',
      playerId: selectedHomePlayer === 'all' ? undefined : selectedHomePlayer,
      setNumber: setFilter === 'all' ? undefined : setFilter,
      results: getResultArray(resultFilter),
    });
  }, [matchId, selectedHomePlayer, setFilter, resultFilter, allTrajectories]);

  // Filter trajectories for home team attacks
  const homeAttacks = useMemo(() => {
    return getFilteredTrajectories(matchId, {
      team: 'home',
      actionType: 'attack',
      playerId: selectedHomePlayer === 'all' ? undefined : selectedHomePlayer,
      setNumber: setFilter === 'all' ? undefined : setFilter,
      results: getResultArray(resultFilter),
    });
  }, [matchId, selectedHomePlayer, setFilter, resultFilter, allTrajectories]);

  // Filter trajectories for opponent team serves
  const opponentServes = useMemo(() => {
    return getFilteredTrajectories(matchId, {
      team: 'opponent',
      actionType: 'serve',
      playerId: selectedOpponentPlayer === 'all' ? undefined : selectedOpponentPlayer,
      setNumber: setFilter === 'all' ? undefined : setFilter,
      results: getResultArray(resultFilter),
    });
  }, [matchId, selectedOpponentPlayer, setFilter, resultFilter, allTrajectories]);

  // Filter trajectories for opponent team attacks
  const opponentAttacks = useMemo(() => {
    return getFilteredTrajectories(matchId, {
      team: 'opponent',
      actionType: 'attack',
      playerId: selectedOpponentPlayer === 'all' ? undefined : selectedOpponentPlayer,
      setNumber: setFilter === 'all' ? undefined : setFilter,
      results: getResultArray(resultFilter),
    });
  }, [matchId, selectedOpponentPlayer, setFilter, resultFilter, allTrajectories]);

  // Calculate stats for display
  const getStats = (trajectories: StoredTrajectory[], actionType: 'serve' | 'attack') => {
    const total = trajectories.length;
    const inPlay = trajectories.filter(t => t.result === 'in_play').length;
    const kills = trajectories.filter(t => t.result === 'kill').length;
    const aces = trajectories.filter(t => t.result === 'ace').length;
    const errors = trajectories.filter(t => t.result === 'error').length;

    if (actionType === 'serve') {
      return { total, aces, errors, inPlay };
    }
    return { total, kills, errors, inPlay };
  };

  if (!isOpen) return null;

  return (
    <div className="player-stats-modal-overlay" onClick={onClose}>
      <div className="player-stats-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="player-stats-modal-header">
          <h2>Player Location Stats</h2>
          <button className="close-button" onClick={onClose}>
            &times;
          </button>
        </div>

        {/* Filters */}
        <div className="player-stats-filters">
          <div className="filter-group">
            <label>Set:</label>
            <select
              value={setFilter}
              onChange={(e) => setSetFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
            >
              <option value="all">All Sets</option>
              {[1, 2, 3, 4, 5].map((set) => (
                <option key={set} value={set}>
                  Set {set}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Result:</label>
            <select
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value as ResultFilter)}
            >
              <option value="all">All Results</option>
              <option value="in_play">In Play (Blue)</option>
              <option value="kill_ace">Kill / Ace (Red)</option>
              <option value="error">Error (Gray)</option>
            </select>
          </div>
        </div>

        {/* Content - 2 columns for Home and Opponent */}
        <div className="player-stats-content">
          {/* Home Team Section */}
          <div className="team-section">
            <h3 className="team-title">{homeTeamName || 'HOME TEAM'}</h3>

            <div className="player-selector">
              <label>Player:</label>
              <select
                value={selectedHomePlayer}
                onChange={(e) => setSelectedHomePlayer(e.target.value)}
              >
                <option value="all">All Players</option>
                {homePlayers.map((p) => (
                  <option key={p.playerId} value={p.playerId}>
                    #{p.jerseyNumber} {p.playerName}
                  </option>
                ))}
                {/* Also include roster players who may not have data yet */}
                {homeRoster
                  .filter((r) => !homePlayers.some((p) => p.playerId === r.playerId))
                  .map((p) => (
                    <option key={p.playerId} value={p.playerId}>
                      #{p.jerseyNumber} {p.playerName}
                    </option>
                  ))}
              </select>
            </div>

            <div className="maps-row">
              <div className="map-container">
                <CourtHeatmap
                  trajectories={homeServes}
                  actionType="serve"
                  title="SERVES"
                />
                <div className="map-stats">
                  {(() => {
                    const stats = getStats(homeServes, 'serve');
                    return (
                      <>
                        <span className="stat">Total: {stats.total}</span>
                        <span className="stat ace">Aces: {stats.aces}</span>
                        <span className="stat error">Errors: {stats.errors}</span>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="map-container">
                <CourtHeatmap
                  trajectories={homeAttacks}
                  actionType="attack"
                  title="ATTACKS"
                />
                <div className="map-stats">
                  {(() => {
                    const stats = getStats(homeAttacks, 'attack');
                    return (
                      <>
                        <span className="stat">Total: {stats.total}</span>
                        <span className="stat kill">Kills: {stats.kills}</span>
                        <span className="stat error">Errors: {stats.errors}</span>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Opponent Team Section */}
          <div className="team-section">
            <h3 className="team-title">{opponentTeamName || 'OPPONENT TEAM'}</h3>

            <div className="player-selector">
              <label>Player:</label>
              <select
                value={selectedOpponentPlayer}
                onChange={(e) => setSelectedOpponentPlayer(e.target.value)}
              >
                <option value="all">All Players</option>
                {opponentPlayers.map((p) => (
                  <option key={p.playerId} value={p.playerId}>
                    #{p.jerseyNumber} {p.playerName}
                  </option>
                ))}
                {/* Also include roster players who may not have data yet */}
                {opponentRoster
                  .filter((r) => !opponentPlayers.some((p) => p.playerId === r.playerId))
                  .map((p) => (
                    <option key={p.playerId} value={p.playerId}>
                      #{p.jerseyNumber} {p.playerName}
                    </option>
                  ))}
              </select>
            </div>

            <div className="maps-row">
              <div className="map-container">
                <CourtHeatmap
                  trajectories={opponentServes}
                  actionType="serve"
                  title="SERVES"
                />
                <div className="map-stats">
                  {(() => {
                    const stats = getStats(opponentServes, 'serve');
                    return (
                      <>
                        <span className="stat">Total: {stats.total}</span>
                        <span className="stat ace">Aces: {stats.aces}</span>
                        <span className="stat error">Errors: {stats.errors}</span>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="map-container">
                <CourtHeatmap
                  trajectories={opponentAttacks}
                  actionType="attack"
                  title="ATTACKS"
                />
                <div className="map-stats">
                  {(() => {
                    const stats = getStats(opponentAttacks, 'attack');
                    return (
                      <>
                        <span className="stat">Total: {stats.total}</span>
                        <span className="stat kill">Kills: {stats.kills}</span>
                        <span className="stat error">Errors: {stats.errors}</span>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="player-stats-legend">
          <span className="legend-item">
            <span className="legend-dot" style={{ background: '#3b82f6' }}></span>
            In Play
          </span>
          <span className="legend-item">
            <span className="legend-dot" style={{ background: '#ef4444' }}></span>
            Kill / Ace
          </span>
          <span className="legend-item">
            <span className="legend-dot" style={{ background: '#9ca3af' }}></span>
            Error
          </span>
        </div>
      </div>
    </div>
  );
};

export default PlayerStatsModal;
