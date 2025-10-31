import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import PageLayout from '../components/layout/PageLayout';
import { MatchProvider, useMatch } from '../features/inGameStats/context/MatchContext';
import { PointEntryForm } from '../features/inGameStats/components/PointEntryForm';
import { PointByPointList } from '../features/inGameStats/components/PointByPointList';
import { StatsDashboard } from '../features/inGameStats/components/StatsDashboard';
import { getMatch, getPlayersByTeam, getTeams, type Player } from '../services/googleSheetsAPI';
import type { MatchData } from '../types/inGameStats.types';
import './StatsPage.css';

/**
 * Mock match data for development
 */
function createMockMatch(): MatchData {
  return {
    id: 'match-1',
    match_date: '2025-10-01',
    home_team: {
      id: 'team-home',
      name: 'Eagles',
      players: [
        { id: 'p1', name: 'Amei', jersey_number: 1, position: 'OH' },
        { id: 'p2', name: 'Toby', jersey_number: 2, position: 'S' },
        { id: 'p3', name: 'Elly', jersey_number: 3, position: 'MB' },
        { id: 'p4', name: 'Player 4', jersey_number: 4, position: 'Oppo' },
        { id: 'p5', name: 'Player 5', jersey_number: 5, position: 'OH' },
        { id: 'p6', name: 'Player 6', jersey_number: 6, position: 'L' }
      ]
    },
    opponent_team: {
      id: 'team-opponent',
      name: 'Hawks',
      players: [
        { id: 'op1', name: 'Oriana', jersey_number: 20, position: 'S' },
        { id: 'op2', name: 'Katie', jersey_number: 16, position: 'OH' },
        { id: 'op3', name: 'Yan', jersey_number: 8, position: 'MB' },
        { id: 'op4', name: 'Opp 4', jersey_number: 12, position: 'Oppo' },
        { id: 'op5', name: 'Opp 5', jersey_number: 7, position: 'L' },
        { id: 'op6', name: 'Opp 6', jersey_number: 11, position: 'OH' }
      ]
    },
    sets: [
      {
        set_number: 1,
        points: []
      },
      {
        set_number: 2,
        points: []
      },
      {
        set_number: 3,
        points: []
      },
      {
        set_number: 4,
        points: []
      },
      {
        set_number: 5,
        points: []
      }
    ]
  };
}

/**
 * ViewToggle - Toggle switch component shared in context
 */
const ViewModeContext = React.createContext<{
  viewMode: 'list' | 'stats';
  setViewMode: (mode: 'list' | 'stats') => void;
} | null>(null);

function ViewToggle() {
  const context = React.useContext(ViewModeContext);
  if (!context) return null;
  const { viewMode, setViewMode } = context;

  return (
    <div className="view-toggle">
      <button
        type="button"
        className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
        onClick={() => setViewMode('list')}
      >
        Hide info
      </button>
      <button
        type="button"
        className={`view-toggle-btn ${viewMode === 'stats' ? 'active' : ''}`}
        onClick={() => setViewMode('stats')}
      >
        Show info
      </button>
    </div>
  );
}

/**
 * StatsPageContent - Inner component with access to Match context
 */
function StatsPageContent() {
  const [viewMode, setViewMode] = useState<'list' | 'stats'>('list');
  const { currentSetData, dispatch, state, opponentRoster } = useMatch();

  const currentSet = state.currentSet;

  const handleSetChange = (setNumber: number) => {
    dispatch({ type: 'SET_CURRENT_SET', payload: setNumber });
  };

  const handleUndo = () => {
    dispatch({ type: 'UNDO_LAST_POINT' });
  };

  return (
    <ViewModeContext.Provider value={{ viewMode, setViewMode }}>
      {/* Set Tabs and View Toggle */}
      <div className="tabs-container">
        <div className="set-tabs">
          {[1, 2, 3, 4, 5].map((setNum) => (
            <button
              key={setNum}
              className={`set-tab ${currentSet === setNum ? 'active' : ''}`}
              onClick={() => handleSetChange(setNum)}
            >
              Set {setNum}
            </button>
          ))}
          <button
            className={`set-tab ${currentSet === 'Total' ? 'active' : ''}`}
            onClick={() => handleSetChange('Total' as any)}
          >
            Total
          </button>
        </div>

        <ViewToggle />
      </div>

      <div className="stats-page-content">
        {/* Point Entry & List View */}
        {viewMode === 'list' && (
          <div className="list-view">
            <PointEntryForm />
            <PointByPointList points={currentSetData} onUndo={handleUndo} />
          </div>
        )}

        {/* Statistics Dashboard View */}
        {viewMode === 'stats' && (
          <div className="stats-view">
            <StatsDashboard />
          </div>
        )}
      </div>
    </ViewModeContext.Provider>
  );
}

/**
 * GameHeader - Dynamic header component with live score
 */
function GameHeader() {
  const { homeTeam, opponentTeam, currentScore } = useMatch();

  if (!homeTeam || !opponentTeam) return null;

  return (
    <div className="game-header">
      <div className="game-info">
        <h2>
          {homeTeam.name} vs {opponentTeam.name}
        </h2>
        <p>Set 1 • 2025-10-01</p>
      </div>
      <div className="score-display">
        <div className="team-score home-score">
          <span className="team-name">{homeTeam.name}</span>
          <span className="score">{currentScore.home}</span>
        </div>
        <div className="score-separator">-</div>
        <div className="team-score opponent-score">
          <span className="score">{currentScore.opponent}</span>
          <span className="team-name">{opponentTeam.name}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * StatsPage - Main page component
 * Loads match from URL params and provides match context
 */
export default function StatsPage() {
  const { matchId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState<MatchData | null>(null);
  const [homeRoster, setHomeRoster] = useState<Player[]>([]);
  const [opponentRoster, setOpponentRoster] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMatch() {
      // New match with team selection from URL params
      if (matchId === 'new') {
        const homeTeamId = searchParams.get('homeTeam');
        const opponentTeamId = searchParams.get('opponentTeam');
        const matchDate = searchParams.get('date') || new Date().toISOString().split('T')[0];

        if (!homeTeamId || !opponentTeamId) {
          setError('Missing team selection');
          setLoading(false);
          return;
        }

        try {
          setLoading(true);

          // Load teams and players
          const [teams, homePlayers, opponentPlayers] = await Promise.all([
            getTeams(),
            getPlayersByTeam(homeTeamId),
            getPlayersByTeam(opponentTeamId)
          ]);

          const homeTeam = teams.find(t => t.Id === homeTeamId);
          const opponentTeam = teams.find(t => t.Id === opponentTeamId);

          if (!homeTeam || !opponentTeam) {
            setError('Teams not found');
            setLoading(false);
            return;
          }

          // Create new match with selected teams
          const newMatch: MatchData = {
            id: 'new-match-' + Date.now(),
            match_date: matchDate,
            home_team: {
              id: homeTeam.Id,
              name: homeTeam.Name,
              players: []
            },
            opponent_team: {
              id: opponentTeam.Id,
              name: opponentTeam.Name,
              players: []
            },
            sets: [
              { set_number: 1, points: [] },
              { set_number: 2, points: [] },
              { set_number: 3, points: [] },
              { set_number: 4, points: [] },
              { set_number: 5, points: [] }
            ]
          };

          setMatch(newMatch);
          setHomeRoster(homePlayers);
          setOpponentRoster(opponentPlayers);
          setLoading(false);
          return;
        } catch (err) {
          console.error('Failed to create new match:', err);
          setError('Failed to create new match');
          setLoading(false);
          return;
        }
      }

      // Existing match - load from Google Sheets
      if (!matchId) {
        setError('No match ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await getMatch(matchId);
        if (data) {
          setMatch(data);

          // Load players for both teams
          const [home, opponent] = await Promise.all([
            getPlayersByTeam(data.home_team.id),
            getPlayersByTeam(data.opponent_team.id)
          ]);

          setHomeRoster(home);
          setOpponentRoster(opponent);
        } else {
          setError('Match not found');
        }
      } catch (err) {
        console.error('Failed to load match:', err);
        setError('Failed to load match');
      } finally {
        setLoading(false);
      }
    }

    loadMatch();
  }, [matchId, searchParams]);

  if (loading) {
    return (
      <div className="stats-page-loading">
        <div className="spinner"></div>
        <p>Loading match...</p>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="stats-page-error">
        <p>{error || 'Match not found'}</p>
        <button onClick={() => navigate('/in-game-stats')} className="btn-back">
          Back to Matches
        </button>
      </div>
    );
  }

  return (
    <MatchProvider
      initialMatch={match}
      initialHomeRoster={homeRoster}
      initialOpponentRoster={opponentRoster}
    >
      <div className="stats-page">
        <div className="stats-page-header">
          <button onClick={() => navigate('/in-game-stats')} className="btn-back-arrow">
            ← Matches
          </button>
          <button
            onClick={() => navigate(`/in-game-stats/${matchId}/visual`)}
            className="btn-visual-tracking"
            style={{
              marginLeft: '12px',
              padding: '8px 16px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            📊 Visual Tracking
          </button>
        </div>
        <GameHeader />
        <StatsPageContent />
      </div>
    </MatchProvider>
  );
}
