import { useState } from 'react';
import { VOLLEYBALL_SYSTEMS, POSITION_LABELS, DEFAULT_TEAM_CONFIG } from '../../../utils/volleyballSystems';
import './TeamConfigPanel.css';

const TeamConfigPanel = ({ onConfigChange }) => {
  const [config, setConfig] = useState(DEFAULT_TEAM_CONFIG);

  const updateTeamConfig = (team, field, value) => {
    const newConfig = {
      ...config,
      [team]: {
        ...config[team],
        [field]: value
      }
    };
    setConfig(newConfig);
    onConfigChange(newConfig);
  };

  const updatePlayerName = (team, position, name) => {
    const newConfig = {
      ...config,
      [team]: {
        ...config[team],
        players: {
          ...config[team].players,
          [position]: name
        }
      }
    };
    setConfig(newConfig);
    onConfigChange(newConfig);
  };

  const getAvailableStartingPositions = (system) => {
    return VOLLEYBALL_SYSTEMS[system] || [];
  };

  return (
    <div className="team-config-panel">
      <div className="config-header">
        <h2>🏐 Team Configuration</h2>
      </div>

      <div className="config-table">
        <div className="config-row header-row">
          <div className="position-label">Line-up</div>
          <div className="team-column">Team A</div>
          <div className="team-column">Team B</div>
        </div>

        {/* Player Input Rows */}
        {POSITION_LABELS.map(({ key, label }) => (
          <div key={key} className="config-row">
            <div className="position-label">{label}</div>
            <div className="team-column">
              <input
                type="text"
                value={config.teamA.players[label] || ''}
                onChange={(e) => updatePlayerName('teamA', label, e.target.value)}
                placeholder={`Team A ${label}`}
                className="player-input"
              />
            </div>
            <div className="team-column">
              <input
                type="text"
                value={config.teamB.players[label] || ''}
                onChange={(e) => updatePlayerName('teamB', label, e.target.value)}
                placeholder={`Team B ${label}`}
                className="player-input"
              />
            </div>
          </div>
        ))}

        {/* System Selection Row */}
        <div className="config-row system-row">
          <div className="position-label">System</div>
          <div className="team-column">
            <select
              value={config.teamA.system}
              onChange={(e) => updateTeamConfig('teamA', 'system', e.target.value)}
              className="system-select"
            >
              {Object.keys(VOLLEYBALL_SYSTEMS).map(system => (
                <option key={system} value={system}>{system}</option>
              ))}
            </select>
          </div>
          <div className="team-column">
            <select
              value={config.teamB.system}
              onChange={(e) => updateTeamConfig('teamB', 'system', e.target.value)}
              className="system-select"
            >
              {Object.keys(VOLLEYBALL_SYSTEMS).map(system => (
                <option key={system} value={system}>{system}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Starting Rotation Row */}
        <div className="config-row">
          <div className="position-label">S. Rotation</div>
          <div className="team-column">
            <div className="starting-rotation">
              <span className="sr-label">P1</span>
              <select
                value={config.teamA.startingP1}
                onChange={(e) => updateTeamConfig('teamA', 'startingP1', e.target.value)}
                className="rotation-select"
              >
                {getAvailableStartingPositions(config.teamA.system).map(pos => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="team-column">
            <div className="starting-rotation">
              <span className="sr-label">P1</span>
              <select
                value={config.teamB.startingP1}
                onChange={(e) => updateTeamConfig('teamB', 'startingP1', e.target.value)}
                className="rotation-select"
              >
                {getAvailableStartingPositions(config.teamB.system).map(pos => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamConfigPanel;