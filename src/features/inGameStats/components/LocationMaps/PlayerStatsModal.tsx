import React, { useState, useMemo } from 'react';
import { CourtHeatmap } from './CourtHeatmap';
import {
  getTrajectories,
  getFilteredTrajectories,
  getPlayersWithTrajectories,
  getPlayerStats,
  type StoredTrajectory,
} from '../../services/trajectoryStorage';

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

  const selectClasses =
    'w-full max-w-[200px] px-3 py-2 text-sm bg-card text-foreground border border-border rounded-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary';

  const filterSelectClasses =
    'px-2.5 py-1.5 text-xs bg-card text-foreground border border-border rounded-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary';

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-5 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-[900px] max-h-[90vh] overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-border bg-secondary rounded-t-xl">
          <h2 className="m-0 text-lg font-bold text-foreground">Player Location Stats</h2>
          <button
            className="w-8 h-8 flex items-center justify-center bg-accent text-foreground border-none rounded-md text-xl cursor-pointer hover:bg-accent/80 transition-colors"
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 px-5 py-3 bg-secondary/50 border-b border-border">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-muted-foreground">Set:</label>
            <select
              className={filterSelectClasses}
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

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-muted-foreground">Result:</label>
            <select
              className={filterSelectClasses}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5">
          {/* Home Team Section */}
          <div className="bg-secondary/50 border border-border rounded-lg p-4">
            <h3 className="m-0 mb-3 text-sm font-bold text-foreground uppercase tracking-wider text-center">
              {homeTeamName || 'HOME TEAM'}
            </h3>

            <div className="flex items-center gap-2 mb-4 justify-center">
              <label className="text-xs font-semibold text-muted-foreground">Player:</label>
              <select
                className={selectClasses}
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

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col items-center bg-card border border-border rounded-md p-2">
                <CourtHeatmap
                  trajectories={homeServes}
                  actionType="serve"
                  title="SERVES"
                />
                <div className="flex flex-wrap gap-2 justify-center mt-2 text-[11px]">
                  {(() => {
                    const stats = getStats(homeServes, 'serve');
                    return (
                      <>
                        <span className="px-1.5 py-0.5 bg-secondary text-muted-foreground rounded">Total: {stats.total}</span>
                        <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded">Aces: {stats.aces}</span>
                        <span className="px-1.5 py-0.5 bg-secondary text-muted-foreground rounded">Errors: {stats.errors}</span>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="flex flex-col items-center bg-card border border-border rounded-md p-2">
                <CourtHeatmap
                  trajectories={homeAttacks}
                  actionType="attack"
                  title="ATTACKS"
                />
                <div className="flex flex-wrap gap-2 justify-center mt-2 text-[11px]">
                  {(() => {
                    const stats = getStats(homeAttacks, 'attack');
                    return (
                      <>
                        <span className="px-1.5 py-0.5 bg-secondary text-muted-foreground rounded">Total: {stats.total}</span>
                        <span className="px-1.5 py-0.5 bg-destructive/20 text-red-300 rounded">Kills: {stats.kills}</span>
                        <span className="px-1.5 py-0.5 bg-secondary text-muted-foreground rounded">Errors: {stats.errors}</span>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Opponent Team Section */}
          <div className="bg-secondary/50 border border-border rounded-lg p-4">
            <h3 className="m-0 mb-3 text-sm font-bold text-foreground uppercase tracking-wider text-center">
              {opponentTeamName || 'OPPONENT TEAM'}
            </h3>

            <div className="flex items-center gap-2 mb-4 justify-center">
              <label className="text-xs font-semibold text-muted-foreground">Player:</label>
              <select
                className={selectClasses}
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

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col items-center bg-card border border-border rounded-md p-2">
                <CourtHeatmap
                  trajectories={opponentServes}
                  actionType="serve"
                  title="SERVES"
                />
                <div className="flex flex-wrap gap-2 justify-center mt-2 text-[11px]">
                  {(() => {
                    const stats = getStats(opponentServes, 'serve');
                    return (
                      <>
                        <span className="px-1.5 py-0.5 bg-secondary text-muted-foreground rounded">Total: {stats.total}</span>
                        <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded">Aces: {stats.aces}</span>
                        <span className="px-1.5 py-0.5 bg-secondary text-muted-foreground rounded">Errors: {stats.errors}</span>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="flex flex-col items-center bg-card border border-border rounded-md p-2">
                <CourtHeatmap
                  trajectories={opponentAttacks}
                  actionType="attack"
                  title="ATTACKS"
                />
                <div className="flex flex-wrap gap-2 justify-center mt-2 text-[11px]">
                  {(() => {
                    const stats = getStats(opponentAttacks, 'attack');
                    return (
                      <>
                        <span className="px-1.5 py-0.5 bg-secondary text-muted-foreground rounded">Total: {stats.total}</span>
                        <span className="px-1.5 py-0.5 bg-destructive/20 text-red-300 rounded">Kills: {stats.kills}</span>
                        <span className="px-1.5 py-0.5 bg-secondary text-muted-foreground rounded">Errors: {stats.errors}</span>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-6 px-5 py-3 bg-secondary/50 border-t border-border rounded-b-xl">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-3 h-3 rounded-full border-2 border-card shadow-sm" style={{ background: '#3b82f6' }} />
            In Play
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-3 h-3 rounded-full border-2 border-card shadow-sm" style={{ background: '#ef4444' }} />
            Kill / Ace
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-3 h-3 rounded-full border-2 border-card shadow-sm" style={{ background: '#9ca3af' }} />
            Error
          </span>
        </div>
      </div>
    </div>
  );
};

export default PlayerStatsModal;
