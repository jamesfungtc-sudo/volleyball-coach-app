import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllMatches } from '../services/googleSheetsAPI';
import './MatchListPage.css';

/**
 * MatchListPage - Landing page showing all matches
 * Simple implementation: List of matches with ability to open or create new
 */
export default function MatchListPage() {
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load matches on mount
  useEffect(() => {
    loadMatches();
  }, []);

  async function loadMatches() {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllMatches();
      setMatches(data);
    } catch (err) {
      console.error('Failed to load matches:', err);
      setError('Failed to load matches. Check your connection.');
    } finally {
      setLoading(false);
    }
  }

  function openMatch(matchId) {
    navigate(`/in-game-stats/${matchId}`);
  }

  function createNewMatch() {
    navigate('/in-game-stats/new');
  }

  // Calculate match status from sets
  function getMatchStatus(sets) {
    if (!sets || sets.length === 0) return 'new';

    let homeWins = 0;
    let opponentWins = 0;

    sets.forEach(set => {
      if (set.points && set.points.length > 0) {
        const lastPoint = set.points[set.points.length - 1];
        if (lastPoint.home_score >= 25 || lastPoint.opponent_score >= 25) {
          if (lastPoint.home_score > lastPoint.opponent_score) {
            homeWins++;
          } else {
            opponentWins++;
          }
        }
      }
    });

    if (homeWins >= 3 || opponentWins >= 3) return 'completed';
    if (homeWins > 0 || opponentWins > 0) return 'ongoing';
    return 'new';
  }

  // Format date
  function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // Get current score for ongoing matches
  function getCurrentScore(sets) {
    if (!sets || sets.length === 0) return '0-0';

    let homeWins = 0;
    let opponentWins = 0;

    sets.forEach(set => {
      if (set.points && set.points.length > 0) {
        const lastPoint = set.points[set.points.length - 1];
        if (lastPoint.home_score >= 25 || lastPoint.opponent_score >= 25) {
          if (lastPoint.home_score > lastPoint.opponent_score) {
            homeWins++;
          } else {
            opponentWins++;
          }
        }
      }
    });

    return `${homeWins}-${opponentWins}`;
  }

  if (loading) {
    return (
      <div className="match-list-page">
        <div className="match-list-loading">
          <div className="spinner"></div>
          <p>Loading matches...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="match-list-page">
        <div className="match-list-error">
          <p>{error}</p>
          <button onClick={loadMatches} className="btn-retry">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="match-list-page">
      <div className="match-list-header">
        <h1>Matches</h1>
        <button onClick={createNewMatch} className="btn-new-match">
          + New Match
        </button>
      </div>

      {matches.length === 0 ? (
        <div className="match-list-empty">
          <p>No matches yet</p>
          <p className="empty-hint">Tap "New Match" to start tracking your first game</p>
        </div>
      ) : (
        <div className="match-list-grid">
          {matches.map((match) => {
            const status = getMatchStatus(match.sets);
            const isOngoing = status === 'ongoing';
            const isCompleted = status === 'completed';

            return (
              <div
                key={match.id}
                className={`match-card ${status}`}
                onClick={() => openMatch(match.id)}
              >
                <div className={`status-badge ${status}`}>
                  {isOngoing ? 'ONGOING' : isCompleted ? 'COMPLETED' : 'NEW'}
                </div>

                <div className="match-card-teams">
                  {match.home_team?.name || 'Home Team'} vs {match.opponent_team?.name || 'Opponent'}
                </div>

                <div className="match-card-info">
                  {isOngoing ? (
                    <>
                      <span className="match-status">Live Match</span>
                      <span className="match-score">{getCurrentScore(match.sets)}</span>
                    </>
                  ) : (
                    <>
                      <span className="match-date">{formatDate(match.match_date)}</span>
                      {isCompleted && (
                        <span className="match-score">{getCurrentScore(match.sets)}</span>
                      )}
                    </>
                  )}
                </div>

                <button className={`btn-open ${status}`}>
                  {isOngoing ? 'Continue' : isCompleted ? 'View Stats' : 'Start'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
