import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTeams } from '../services/googleSheetsAPI';
import './MatchSetupPage.css';

/**
 * MatchSetupPage - Create new match with team selection
 */
export default function MatchSetupPage() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [homeTeamId, setHomeTeamId] = useState('');
  const [opponentTeamId, setOpponentTeamId] = useState('');
  const [matchDate, setMatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadTeams() {
      try {
        setLoading(true);
        const data = await getTeams();
        setTeams(data);
      } catch (err) {
        console.error('Failed to load teams:', err);
        setError('Failed to load teams. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    loadTeams();
  }, []);

  function handleCreateMatch() {
    if (!homeTeamId || !opponentTeamId) {
      setError('Please select both home and opponent teams');
      return;
    }

    if (homeTeamId === opponentTeamId) {
      setError('Home and opponent teams must be different');
      return;
    }

    // Navigate to new match with team params
    navigate(`/in-game-stats/new?homeTeam=${homeTeamId}&opponentTeam=${opponentTeamId}&date=${matchDate}`);
  }

  function handleCancel() {
    navigate('/in-game-stats');
  }

  if (loading) {
    return (
      <div className="match-setup-loading">
        <div className="spinner"></div>
        <p>Loading teams...</p>
      </div>
    );
  }

  return (
    <div className="match-setup-page">
      <div className="match-setup-header">
        <button onClick={handleCancel} className="btn-back-arrow">
          ← Back
        </button>
        <h1>New Match Setup</h1>
      </div>

      <div className="match-setup-form">
        {error && (
          <div className="error-banner">
            {error}
          </div>
        )}

        <div className="form-section">
          <label htmlFor="match-date">Match Date</label>
          <input
            id="match-date"
            type="date"
            value={matchDate}
            onChange={(e) => setMatchDate(e.target.value)}
            className="form-input"
          />
        </div>

        <div className="form-section">
          <label htmlFor="home-team">Home Team *</label>
          <select
            id="home-team"
            value={homeTeamId}
            onChange={(e) => {
              setHomeTeamId(e.target.value);
              setError(null);
            }}
            className="form-select"
          >
            <option value="">Select Home Team</option>
            {teams.map((team) => (
              <option key={team.Id} value={team.Id}>
                {team.Name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-section">
          <label htmlFor="opponent-team">Opponent Team *</label>
          <select
            id="opponent-team"
            value={opponentTeamId}
            onChange={(e) => {
              setOpponentTeamId(e.target.value);
              setError(null);
            }}
            className="form-select"
          >
            <option value="">Select Opponent Team</option>
            {teams.map((team) => (
              <option
                key={team.Id}
                value={team.Id}
                disabled={team.Id === homeTeamId}
              >
                {team.Name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-actions">
          <button onClick={handleCancel} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleCreateMatch}
            className="btn-primary"
            disabled={!homeTeamId || !opponentTeamId}
          >
            Start Match
          </button>
        </div>
      </div>
    </div>
  );
}
