import React, { useState, useMemo } from 'react';
import PageLayout from '../components/layout/PageLayout';
import { MatchProvider, useMatch } from '../features/inGameStats/context/MatchContext';
import { PointEntryForm } from '../features/inGameStats/components/PointEntryForm';
import { PointByPointList } from '../features/inGameStats/components/PointByPointList';
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
        id: 'set-1',
        match_id: 'match-1',
        set_number: 1,
        home_score: 0,
        opponent_score: 0,
        is_completed: false,
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
  const { currentSetData, dispatch } = useMatch();

  const handleUndo = () => {
    dispatch({ type: 'UNDO_LAST_POINT' });
  };

  return (
    <ViewModeContext.Provider value={{ viewMode, setViewMode }}>
      {/* Set Tabs and View Toggle */}
      <div className="tabs-container">
        <div className="set-tabs">
          <button className="set-tab active">Set 1</button>
          <button className="set-tab">Set 2</button>
          <button className="set-tab">Set 3</button>
          <button className="set-tab">Set 4</button>
          <button className="set-tab">Set 5</button>
          <button className="set-tab">Total</button>
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
            <div className="coming-soon">
              <h3>Statistics Dashboard</h3>
              <p>Phase 3: Charts and analytics coming soon...</p>
            </div>
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
 * Provides match context and wraps the content
 */
export default function StatsPage() {
  const mockMatch = useMemo(() => createMockMatch(), []);

  return (
    <MatchProvider initialMatch={mockMatch}>
      <div className="stats-page">
        <GameHeader />
        <StatsPageContent />
      </div>
    </MatchProvider>
  );
}
