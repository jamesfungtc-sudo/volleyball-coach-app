import React, { useEffect } from 'react';
import PageLayout from '../components/layout/PageLayout';
import { OpponentAnalysisProvider, useOpponentAnalysis } from '../features/opponentAnalysis/context/OpponentAnalysisContext';
import { EventEntryWorkflow } from '../features/opponentAnalysis/components/EventEntryWorkflow';
import './OpponentAnalysisPage.css';

/**
 * OpponentAnalysisPage - Main page for opponent pattern analysis
 * Features:
 * 1. Starting line-up tracker per set
 * 2. Serving pattern analysis with location map
 * 3. Hitting pattern analysis with location map
 */

function OpponentAnalysisContent() {
  const {
    state,
    setMatch,
    setSelectedSet,
    setEventType,
    getCurrentEvents,
    getCurrentLineup
  } = useOpponentAnalysis();

  // Initialize with demo match (temporary - will be replaced with match selector)
  useEffect(() => {
    if (!state.matchId) {
      setMatch('demo_match_001', 'opponent_team_001', 'Opponent Team');
    }
  }, [state.matchId, setMatch]);

  const currentEvents = getCurrentEvents();
  const currentLineup = getCurrentLineup();

  return (
    <div className="opponent-analysis-page">
      {/* Combined Header Container */}
      <div className="unified-header">
        <div className="opponent-info">
          <h2 className="opponent-name">
            {state.opponentTeamName || 'Opponent'}
          </h2>
          <p className="match-info">{state.matchId || 'N/A'}</p>
        </div>

        <div className="set-navigation">
          <div className="set-tabs">
            {[1, 2, 3, 4, 5].map(set => (
              <button
                key={set}
                className={`set-tab ${state.selectedSet === set ? 'active' : ''}`}
                onClick={() => setSelectedSet(set)}
              >
                S{set}
              </button>
            ))}
            <button
              className={`set-tab ${state.selectedSet === 'total' ? 'active' : ''}`}
              onClick={() => setSelectedSet('total')}
            >
              All
            </button>
          </div>
        </div>

        <div className="event-type-selector">
          <button
            className={`event-type-btn ${state.selectedEventType === 'serve' ? 'active' : ''}`}
            onClick={() => setEventType('serve')}
          >
            🏐 Serve
          </button>
          <button
            className={`event-type-btn ${state.selectedEventType === 'attack' ? 'active' : ''}`}
            onClick={() => setEventType('attack')}
          >
            ⚡ Attack
          </button>
        </div>
      </div>

      {/* Main Content Area - Full Width */}
      <div className="analysis-content">
        {/* Main Workflow Area */}
        <div className="workflow-area">
          <EventEntryWorkflow />
        </div>

        {/* Stats and Events Row Below */}
        <div className="stats-events-row">
          {/* Events Summary */}
          <section className="events-summary">
            <h3>Stats</h3>
            <div className="summary-stats">
              <div className="stat-card">
                <span className="stat-label">Total</span>
                <span className="stat-value">{currentEvents.length}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Kills</span>
                <span className="stat-value">
                  {currentEvents.filter(e => e.result === 'kill').length}
                </span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Errors</span>
                <span className="stat-value">
                  {currentEvents.filter(e => e.result === 'error').length}
                </span>
              </div>
              <div className="stat-card">
                <span className="stat-label">In Play</span>
                <span className="stat-value">
                  {currentEvents.filter(e => e.result === 'in_play').length}
                </span>
              </div>
            </div>
          </section>

          {/* Event List */}
          <section className="events-list">
            <h3>Recent</h3>
            {currentEvents.length > 0 ? (
              <div className="event-items">
                {currentEvents.slice(-10).reverse().map(event => (
                  <div key={event.id} className="event-item">
                    <span className="event-player">{event.player_name}</span>
                    <div className="event-details">
                      <span className="event-location">
                        ({event.grid_x}, {event.grid_y})
                      </span>
                      <span className={`event-result ${event.result}`}>
                        {event.result === 'in_play' ? 'play' : event.result}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '0.75rem', color: '#9ca3af', textAlign: 'center', padding: '20px' }}>
                No events yet
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default function OpponentAnalysisPage() {
  return (
    <PageLayout className="opponent-analysis-layout">
      <OpponentAnalysisProvider>
        <OpponentAnalysisContent />
      </OpponentAnalysisProvider>
    </PageLayout>
  );
}
