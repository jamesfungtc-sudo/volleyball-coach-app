import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllMatches, getTeams } from '../services/googleSheetsAPI';
import './MatchListPage.css';

/**
 * MatchListPage - Landing page showing all matches
 * Simple implementation: List of matches with ability to open or create new
 */
export default function MatchListPage() {
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load matches and teams on mount
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const [matchesData, teamsData] = await Promise.all([
        getAllMatches(),
        getTeams()
      ]);
      console.log('Loaded teams:', teamsData);
      console.log('First team structure:', teamsData[0]);
      console.log('Loaded matches:', matchesData);
      console.log('First match structure:', matchesData[0]);
      setMatches(matchesData);
      setTeams(teamsData);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load matches. Check your connection.');
    } finally {
      setLoading(false);
    }
  }

  // Get team name by ID or from nested object (handles both old and new format)
  function getTeamName(teamData) {
    console.log('Getting team name for:', teamData);

    // If it's an object with id property (old format), look up by ID
    if (teamData && typeof teamData === 'object' && teamData.id) {
      const team = teams.find(t => t.Id === teamData.id);
      console.log('Found team by object.id:', team);
      return team?.Name || teamData.name || `Unknown Team (${teamData.id})`;
    }

    // If it's a team ID string (new format)
    if (typeof teamData === 'string') {
      const team = teams.find(t => t.Id === teamData);
      console.log('Found team by ID:', team);
      return team?.Name || `Unknown Team (${teamData})`;
    }

    return 'Unknown Team';
  }

  // Get match date from various formats
  function getMatchDate(match) {
    // New format: gameDate as string
    if (match.gameDate) return match.gameDate;

    // Old format: match_date as string or date object
    if (match.match_date) {
      if (typeof match.match_date === 'string') return match.match_date;
      if (match.match_date instanceof Date) return match.match_date.toISOString();
    }

    return null;
  }

  function openMatch(matchId) {
    navigate(`/in-game-stats/${matchId}`);
  }

  function createNewMatch() {
    navigate('/in-game-stats/setup');
  }

  // Calculate match status from gameState or sets
  function getMatchStatus(match) {
    // First, check gameState from Google Sheets (new 8-column format)
    if (match.gameState) {
      if (match.gameState.status === 'completed') return 'completed';
      if (match.gameState.status === 'in_progress') return 'ongoing';
      // If there are scores, it's ongoing
      if (match.gameState.homeScore > 0 || match.gameState.opponentScore > 0) return 'ongoing';
    }

    // Fallback to calculating from sets
    const sets = match.sets;
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

  // Resume match - navigate to visual tracking page
  function resumeMatch(event, match) {
    event.stopPropagation(); // Prevent card click
    const currentSet = match.gameState?.currentSet || 1;
    navigate(`/in-game-stats/${match.id}/visual?set=${currentSet}`);
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
          <button onClick={loadData} className="btn-retry">
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
            const status = getMatchStatus(match);
            const isOngoing = status === 'ongoing';
            const isCompleted = status === 'completed';
            const hasGameState = match.gameState && (match.gameState.homeScore > 0 || match.gameState.opponentScore > 0);

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
                  {getTeamName(match.homeTeam || match.home_team)} vs {getTeamName(match.opponentTeam || match.opponent_team)}
                </div>

                <div className="match-card-info">
                  {isOngoing && hasGameState ? (
                    <>
                      <span className="match-status">
                        Set {match.gameState.currentSet} • {match.gameState.homeScore}-{match.gameState.opponentScore}
                      </span>
                    </>
                  ) : isOngoing ? (
                    <>
                      <span className="match-status">Live Match</span>
                      <span className="match-score">{getCurrentScore(match.sets)}</span>
                    </>
                  ) : (
                    <>
                      <span className="match-date">{formatDate(getMatchDate(match))}</span>
                      {isCompleted && (
                        <span className="match-score">{getCurrentScore(match.sets)}</span>
                      )}
                    </>
                  )}
                </div>

                <div className="match-card-actions">
                  {isOngoing && (
                    <button
                      className="btn-resume"
                      onClick={(e) => resumeMatch(e, match)}
                    >
                      ▶ Resume
                    </button>
                  )}
                  <button className={`btn-open ${status}`}>
                    {isOngoing ? 'View Stats' : isCompleted ? 'View Stats' : 'Start'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
