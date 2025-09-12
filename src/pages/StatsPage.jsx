import React, { useState } from 'react';
import PageLayout from '../components/layout/PageLayout';
import './StatsPage.css';

const StatsPage = () => {
  const [currentSet, setCurrentSet] = useState(1);
  const [homeScore, setHomeScore] = useState(12);
  const [opponentScore, setOpponentScore] = useState(8);
  
  // Mock data
  const mockGameData = {
    homeTeam: 'Eagles',
    opponentTeam: 'Hawks',
    date: '2025-09-12',
    homePlayers: ['Player 1', 'Player 2', 'Player 3', 'Player 4', 'Player 5', 'Player 6'],
    opponentPlayers: ['Opp 1', 'Opp 2', 'Opp 3', 'Opp 4', 'Opp 5', 'Opp 6']
  };

  const mockStats = {
    homeErrors: 3,
    opponentErrors: 5,
    homeAttacks: 8,
    opponentAttacks: 4,
    totalPoints: 20
  };

  const recentPoints = [
    { id: 1, point: 20, team: 'home', action: 'Sp.', player: 'Player 1', position: 'P4' },
    { id: 2, point: 19, team: 'opponent', action: 'E.Serve', player: 'Opp 2', position: 'P1' },
    { id: 3, point: 18, team: 'home', action: 'Block', player: 'Player 3', position: 'P3' },
    { id: 4, point: 17, team: 'home', action: 'Sp.', player: 'Player 4', position: 'P2' },
    { id: 5, point: 16, team: 'opponent', action: 'Op. Play', player: 'Opp 1', position: 'P4' }
  ];

  return (
    <PageLayout>
      <div className="stats-page">
        {/* Game Header */}
        <div className="game-header">
          <div className="game-info">
            <h2>{mockGameData.homeTeam} vs {mockGameData.opponentTeam}</h2>
            <p>Set {currentSet} • {mockGameData.date}</p>
          </div>
          <div className="score-display">
            <div className="team-score home-score">
              <span className="team-name">{mockGameData.homeTeam}</span>
              <span className="score">{homeScore}</span>
            </div>
            <div className="score-separator">-</div>
            <div className="team-score opponent-score">
              <span className="score">{opponentScore}</span>
              <span className="team-name">{mockGameData.opponentTeam}</span>
            </div>
          </div>
        </div>

        {/* Quick Stats Overview */}
        <div className="quick-stats">
          <div className="stat-card">
            <span className="stat-label">Home Errors</span>
            <span className="stat-value">{mockStats.homeErrors}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Opp Errors</span>
            <span className="stat-value">{mockStats.opponentErrors}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Home Attacks</span>
            <span className="stat-value">{mockStats.homeAttacks}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Opp Attacks</span>
            <span className="stat-value">{mockStats.opponentAttacks}</span>
          </div>
        </div>

        {/* Point Entry Section */}
        <div className="point-entry">
          <h3>Point Entry</h3>
          
          {/* Team Selection */}
          <div className="team-selection">
            <button className="team-btn home-btn active">
              {mockGameData.homeTeam}
            </button>
            <button className="team-btn opponent-btn">
              {mockGameData.opponentTeam}
            </button>
          </div>

          {/* Action Type Buttons */}
          <div className="action-buttons">
            <button className="action-btn spike-btn">Spike (Sp.)</button>
            <button className="action-btn error-btn">Error (E.)</button>
            <button className="action-btn block-btn">Block</button>
            <button className="action-btn serve-btn">Serve</button>
            <button className="action-btn play-btn">Op. Play</button>
            <button className="action-btn other-btn">Other</button>
          </div>

          {/* Player Selection */}
          <div className="player-selection">
            <select className="player-select">
              <option value="">Select Player</option>
              {mockGameData.homePlayers.map((player, index) => (
                <option key={index} value={player}>{player}</option>
              ))}
            </select>
          </div>

          {/* Court Position Selector (Simplified) */}
          <div className="position-selector">
            <h4>Court Position</h4>
            <div className="court-positions">
              <button className="pos-btn">P1</button>
              <button className="pos-btn">P2</button>
              <button className="pos-btn">P3</button>
              <button className="pos-btn">P4</button>
              <button className="pos-btn">P5</button>
              <button className="pos-btn">P6</button>
            </div>
          </div>

          {/* Add Point Button */}
          <button className="add-point-btn">Add Point</button>
        </div>

        {/* Recent Points */}
        <div className="recent-points">
          <h3>Recent Points</h3>
          <div className="points-list">
            {recentPoints.map(point => (
              <div key={point.id} className={`point-item ${point.team}-point`}>
                <span className="point-number">#{point.point}</span>
                <span className="point-action">{point.action}</span>
                <span className="point-player">{point.player}</span>
                <span className="point-position">{point.position}</span>
                <button className="undo-btn">↶</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default StatsPage;