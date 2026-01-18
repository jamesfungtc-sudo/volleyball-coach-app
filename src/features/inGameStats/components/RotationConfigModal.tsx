import React, { useState } from 'react';
import type {
  TeamRotationConfig,
  VolleyballSystem,
  PlayerRole
} from '../types/rotation.types';
import type { Player } from '../../../services/googleSheetsAPI';
import { VOLLEYBALL_SYSTEMS } from '../../../utils/volleyballSystems';
import {
  createRosterReference,
  createCustomReference,
  getJerseyNumber,
  type PlayerReference
} from '../../../types/playerReference.types';
import './RotationConfigModal.css';

interface RotationConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (homeConfig: TeamRotationConfig, opponentConfig: TeamRotationConfig, startingServer: 'home' | 'opponent') => void;
  initialHomeConfig?: TeamRotationConfig;
  initialOpponentConfig?: TeamRotationConfig;
  currentSet: number;
  homeTeamName: string;
  opponentTeamName: string;
  homeRoster?: Player[];
  opponentRoster?: Player[];
  onResetConfiguration?: () => void;
}

// Default empty configuration
function createEmptyConfig(system: VolleyballSystem): TeamRotationConfig {
  const roles = VOLLEYBALL_SYSTEMS[system];
  const players: Record<string, PlayerReference> = {};

  roles.forEach((role: string) => {
    players[role] = createCustomReference(0, '');
  });

  return {
    system,
    players: players as Record<PlayerRole, PlayerReference>,
    startingP1: roles[0] as PlayerRole,
    libero: null,
    liberoReplacementTargets: [],
    currentRotation: 1
  };
}

export function RotationConfigModal({
  isOpen,
  onClose,
  onSave,
  initialHomeConfig,
  initialOpponentConfig,
  currentSet,
  homeTeamName,
  opponentTeamName,
  homeRoster = [],
  opponentRoster = [],
  onResetConfiguration
}: RotationConfigModalProps) {
  const [homeConfig, setHomeConfig] = useState<TeamRotationConfig>(
    initialHomeConfig || createEmptyConfig('5-1 (OH>S)')
  );
  const [opponentConfig, setOpponentConfig] = useState<TeamRotationConfig>(
    initialOpponentConfig || createEmptyConfig('5-1 (OH>S)')
  );
  const [startingServer, setStartingServer] = useState<'home' | 'opponent'>('home');

  if (!isOpen) return null;

  // Handle system change for a team
  const handleSystemChange = (team: 'home' | 'opponent', newSystem: VolleyballSystem) => {
    const newConfig = createEmptyConfig(newSystem);
    if (team === 'home') {
      setHomeConfig(newConfig);
    } else {
      setOpponentConfig(newConfig);
    }
  };

  // Handle player name selection/input (datalist autocomplete)
  const handlePlayerNameChange = (
    team: 'home' | 'opponent',
    role: PlayerRole,
    value: string
  ) => {
    const roster = team === 'home' ? homeRoster : opponentRoster;
    const config = team === 'home' ? homeConfig : opponentConfig;
    const currentPlayerRef = config.players[role];

    let playerRef: PlayerReference;

    if (value === '') {
      // Empty - preserve jersey number
      const existingJersey = currentPlayerRef ? getJerseyNumber(currentPlayerRef) : 0;
      playerRef = createCustomReference(existingJersey, '');
    } else {
      // Try to find player in roster by name
      const selectedPlayer = roster.find(p => p.name === value);
      if (selectedPlayer) {
        // Roster player selected - use their data (auto-fills jersey)
        playerRef = createRosterReference(selectedPlayer.id, selectedPlayer.teamId);
      } else {
        // Custom name - preserve existing jersey number
        const existingJersey = currentPlayerRef ? getJerseyNumber(currentPlayerRef) : 0;
        playerRef = createCustomReference(existingJersey, value);
      }
    }

    if (team === 'home') {
      setHomeConfig({
        ...homeConfig,
        players: { ...homeConfig.players, [role]: playerRef }
      });
    } else {
      setOpponentConfig({
        ...opponentConfig,
        players: { ...opponentConfig.players, [role]: playerRef }
      });
    }
  };

  // Handle jersey number change (only for custom players)
  const handlePlayerNumberChange = (
    team: 'home' | 'opponent',
    role: PlayerRole,
    jerseyNumber: string
  ) => {
    const config = team === 'home' ? homeConfig : opponentConfig;
    const currentPlayerRef = config.players[role];

    if (!currentPlayerRef) return;

    // Only allow editing jersey number for custom players
    if (currentPlayerRef.type === 'roster') {
      // Silently ignore - roster player jerseys are read-only
      return;
    }

    const jerseyNum = parseInt(jerseyNumber, 10) || 0;
    const customName = currentPlayerRef.customName || '';
    const updatedPlayerRef = createCustomReference(jerseyNum, customName);

    if (team === 'home') {
      setHomeConfig({
        ...homeConfig,
        players: { ...homeConfig.players, [role]: updatedPlayerRef }
      });
    } else {
      setOpponentConfig({
        ...opponentConfig,
        players: { ...opponentConfig.players, [role]: updatedPlayerRef }
      });
    }
  };

  // Get smart defaults for libero replacement targets (returns array of ALL MBs)
  const getSmartLiberoDefaults = (system: VolleyballSystem): PlayerRole[] => {
    const roles = VOLLEYBALL_SYSTEMS[system] as PlayerRole[];
    // Find ALL middle blocker roles in the system
    const mbRoles = roles.filter(r =>
      r === 'MB' || r === 'MB (w.s)' || r === 'MB1' || r === 'MB2'
    );

    if (mbRoles.length > 0) {
      return mbRoles;
    }

    // Fallback: first role that's not a setter
    const nonSetterRole = roles.find(r => r !== 'S' && !r.includes('S1') && !r.includes('S2'));
    return nonSetterRole ? [nonSetterRole] : [];
  };

  // Handle libero name change
  const handleLiberoNameChange = (team: 'home' | 'opponent', value: string) => {
    const roster = team === 'home' ? homeRoster : opponentRoster;
    const config = team === 'home' ? homeConfig : opponentConfig;
    const currentLiberoRef = config.libero;

    let playerRef: PlayerReference | null;

    if (value === '') {
      playerRef = null;
    } else {
      const selectedPlayer = roster.find(p => p.name === value);
      if (selectedPlayer) {
        playerRef = createRosterReference(selectedPlayer.id, selectedPlayer.teamId);
      } else {
        const existingJersey = currentLiberoRef ? getJerseyNumber(currentLiberoRef) : 0;
        playerRef = createCustomReference(existingJersey, value);
      }
    }

    // Set smart default for replacement target if not already set
    const updatedConfig: TeamRotationConfig = {
      ...config,
      libero: playerRef
    };

    // Set smart defaults if libero is being added and no targets configured yet
    if ((!config.liberoReplacementTargets || config.liberoReplacementTargets.length === 0) && playerRef) {
      updatedConfig.liberoReplacementTargets = getSmartLiberoDefaults(config.system);
    }

    if (team === 'home') {
      setHomeConfig(updatedConfig);
    } else {
      setOpponentConfig(updatedConfig);
    }
  };

  // Handle libero jersey number change
  const handleLiberoNumberChange = (team: 'home' | 'opponent', jerseyNumber: string) => {
    const config = team === 'home' ? homeConfig : opponentConfig;
    const currentLiberoRef = config.libero;

    if (!currentLiberoRef || currentLiberoRef.type === 'roster') return;

    const jerseyNum = parseInt(jerseyNumber, 10) || 0;
    const customName = currentLiberoRef.customName || '';
    const updatedPlayerRef = createCustomReference(jerseyNum, customName);

    if (team === 'home') {
      setHomeConfig({ ...homeConfig, libero: updatedPlayerRef });
    } else {
      setOpponentConfig({ ...opponentConfig, libero: updatedPlayerRef });
    }
  };

  // Handle starting position change
  const handleStartingP1Change = (team: 'home' | 'opponent', role: PlayerRole) => {
    if (team === 'home') {
      setHomeConfig({ ...homeConfig, startingP1: role });
    } else {
      setOpponentConfig({ ...opponentConfig, startingP1: role });
    }
  };

  // Handle libero replacement target change (multi-select)
  const handleLiberoTargetChange = (team: 'home' | 'opponent', role: PlayerRole) => {
    const config = team === 'home' ? homeConfig : opponentConfig;
    const currentTargets = config.liberoReplacementTargets || [];

    // Toggle role in/out of selection
    let newTargets: PlayerRole[];
    if (currentTargets.includes(role)) {
      // Remove role
      newTargets = currentTargets.filter(r => r !== role);
    } else {
      // Add role
      newTargets = [...currentTargets, role];
    }

    if (team === 'home') {
      setHomeConfig({ ...homeConfig, liberoReplacementTargets: newTargets });
    } else {
      setOpponentConfig({ ...opponentConfig, liberoReplacementTargets: newTargets });
    }
  };

  // Get valid replacement targets for libero based on system
  const getValidReplacementTargets = (system: VolleyballSystem): PlayerRole[] => {
    const roles = VOLLEYBALL_SYSTEMS[system] as PlayerRole[];
    // Return all roles (user can choose any player)
    return roles;
  };

  // Validate configuration
  // UPDATED: Allow players with either name OR number filled (not both required)
  const validateConfig = (config: TeamRotationConfig): boolean => {
    const roles = VOLLEYBALL_SYSTEMS[config.system];

    // Check all roles have at least name OR number filled
    for (const role of roles) {
      const playerRef = config.players[role as PlayerRole];
      if (!playerRef) {
        return false;
      }
      // Must have EITHER a valid jersey number OR a display name
      const hasNumber = playerRef.jerseyNumber > 0;
      const hasName = playerRef.displayName !== '';
      if (!hasNumber && !hasName) {
        return false;
      }
    }

    // Check libero exists and has at least name OR number
    if (!config.libero) {
      return false;
    }
    const liberoHasNumber = config.libero.jerseyNumber > 0;
    const liberoHasName = config.libero.displayName !== '';
    if (!liberoHasNumber && !liberoHasName) {
      return false;
    }

    return true;
  };

  // Handle save
  const handleSave = () => {
    if (!validateConfig(homeConfig)) {
      alert(`Please fill in at least a name OR jersey number for all players on ${homeTeamName}`);
      return;
    }

    if (!validateConfig(opponentConfig)) {
      alert(`Please fill in at least a name OR jersey number for all players on ${opponentTeamName}`);
      return;
    }

    onSave(homeConfig, opponentConfig, startingServer);
  };

  // Render team configuration section
  const renderTeamConfig = (
    team: 'home' | 'opponent',
    config: TeamRotationConfig,
    teamName: string
  ) => {
    const roles = VOLLEYBALL_SYSTEMS[config.system];
    const roster = team === 'home' ? homeRoster : opponentRoster;

    return (
      <div className="team-config-section">
        <h3>{teamName}</h3>

        {/* System and Starting P1 - Compact row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
              System:
            </label>
            <select
              value={config.system}
              onChange={(e) => handleSystemChange(team, e.target.value as VolleyballSystem)}
              className="system-select"
            >
              <option value="5-1 (OH>S)">5-1 (OH&gt;S)</option>
              <option value="5-1 (MB>S)">5-1 (MB&gt;S)</option>
              <option value="6-2">6-2</option>
              <option value="4-2">4-2</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
              Starting P1:
            </label>
            <select
              value={config.startingP1}
              onChange={(e) => handleStartingP1Change(team, e.target.value as PlayerRole)}
              className="starting-p1-select"
            >
              {roles.map((role: string) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="config-divider" style={{ margin: '12px 0' }}></div>

        {/* Player Inputs - Compact */}
        <div style={{ marginBottom: '12px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '10px', color: '#374151' }}>Players:</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '10px 12px', alignItems: 'center' }}>
            {/* Header Row */}
            <div style={{ fontWeight: 'bold', fontSize: '11px', color: '#6b7280' }}>Role</div>
            <div style={{ fontWeight: 'bold', fontSize: '11px', color: '#6b7280' }}>Name</div>
            <div style={{ fontWeight: 'bold', fontSize: '11px', color: '#6b7280', width: '80px' }}>Jersey #</div>

            {roles.map((role: string) => {
              const playerRef = config.players[role as PlayerRole];
              const isRosterPlayer = playerRef?.type === 'roster';
              const rosterPlayer = isRosterPlayer ? roster.find(p => p.id === playerRef.playerId) : null;
              const playerName = isRosterPlayer
                ? (rosterPlayer?.name || '')
                : (playerRef?.type === 'custom' ? playerRef.name || '' : '');
              const jerseyNum = isRosterPlayer
                ? (rosterPlayer?.jerseyNumber ? Number(rosterPlayer.jerseyNumber) : 0)
                : (playerRef ? getJerseyNumber(playerRef) : 0);

              return (
                <React.Fragment key={role}>
                  {/* Role Label */}
                  <div style={{ fontSize: '14px', fontWeight: '500' }}>{role}:</div>

                  {/* Name Input with Datalist */}
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      list={`${team}-${role}-players`}
                      value={playerName}
                      onChange={(e) => handlePlayerNameChange(team, role as PlayerRole, e.target.value)}
                      placeholder={`Enter or select ${role} name`}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        fontSize: '14px',
                        border: '2px solid #d1d5db',
                        borderRadius: '6px',
                        background: 'white',
                        color: '#111827'
                      }}
                    />
                    <datalist id={`${team}-${role}-players`}>
                      {roster.map((player) => (
                        <option key={player.id} value={player.name}>
                          #{player.jerseyNumber} {player.name}
                        </option>
                      ))}
                    </datalist>
                  </div>

                  {/* Jersey Number Input */}
                  <input
                    type="number"
                    value={jerseyNum === 0 ? '' : jerseyNum}
                    onChange={(e) => handlePlayerNumberChange(team, role as PlayerRole, e.target.value)}
                    placeholder="#"
                    disabled={isRosterPlayer}
                    style={{
                      width: '80px',
                      padding: '6px 10px',
                      fontSize: '14px',
                      border: '2px solid #d1d5db',
                      borderRadius: '6px',
                      background: isRosterPlayer ? '#f3f4f6' : 'white',
                      color: '#111827',
                      cursor: isRosterPlayer ? 'not-allowed' : 'text'
                    }}
                    title={isRosterPlayer ? 'Jersey number from roster (read-only)' : 'Enter jersey number'}
                  />
                </React.Fragment>
              );
            })}

            {/* Libero Row */}
            <div style={{ fontSize: '14px', fontWeight: '500' }}>L (Libero):</div>

            <div style={{ position: 'relative' }}>
              <input
                type="text"
                list={`${team}-libero-players`}
                value={
                  config.libero && config.libero.type === 'roster'
                    ? (roster.find(p => p.id === (config.libero as any).playerId)?.name || '')
                    : (config.libero && config.libero.type === 'custom' ? config.libero.name || '' : '')
                }
                onChange={(e) => handleLiberoNameChange(team, e.target.value)}
                placeholder="Enter or select Libero name"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '14px',
                  border: '2px solid #d1d5db',
                  borderRadius: '6px',
                  background: 'white',
                  color: '#111827'
                }}
              />
              <datalist id={`${team}-libero-players`}>
                {roster.map((player) => (
                  <option key={player.id} value={player.name}>
                    #{player.jerseyNumber} {player.name}
                  </option>
                ))}
              </datalist>
            </div>

            <input
              type="number"
              value={(() => {
                if (!config.libero) return '';
                if (config.libero.type === 'roster') {
                  const liberoPlayer = roster.find(p => p.id === config.libero!.playerId);
                  return liberoPlayer?.jerseyNumber ? Number(liberoPlayer.jerseyNumber) : '';
                }
                const jerseyNum = getJerseyNumber(config.libero);
                return jerseyNum === 0 ? '' : jerseyNum;
              })()}
              onChange={(e) => {
                // If libero is null, create empty custom reference first
                if (!config.libero) {
                  const team2 = team;
                  const newLibero = createCustomReference(parseInt(e.target.value, 10) || 0, '');
                  if (team2 === 'home') {
                    setHomeConfig({ ...homeConfig, libero: newLibero });
                  } else {
                    setOpponentConfig({ ...opponentConfig, libero: newLibero });
                  }
                } else {
                  handleLiberoNumberChange(team, e.target.value);
                }
              }}
              placeholder="#"
              disabled={config.libero?.type === 'roster'}
              style={{
                width: '80px',
                padding: '8px 12px',
                fontSize: '14px',
                border: '2px solid #d1d5db',
                borderRadius: '6px',
                background: config.libero?.type === 'roster' ? '#f3f4f6' : 'white',
                color: '#111827',
                cursor: config.libero?.type === 'roster' ? 'not-allowed' : 'text'
              }}
              title={config.libero?.type === 'roster' ? 'Jersey number from roster (read-only)' : 'Enter jersey number'}
            />

            {/* Libero Replacement Targets - Compact checkboxes */}
            {config.libero && (
              <div style={{ gridColumn: '1 / -1', marginTop: '8px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: '500',
                    color: '#6b7280',
                    marginBottom: '4px'
                  }}
                >
                  Libero replaces:
                </label>
                <div style={{
                  border: '2px solid #e5e7eb',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  background: '#ffffff',
                  maxHeight: '120px',
                  overflowY: 'auto'
                }}>
                  {getValidReplacementTargets(config.system).map((role) => {
                    const playerRef = config.players[role];
                    const displayName = playerRef?.displayName || 'Not assigned';
                    const jerseyNum = playerRef && getJerseyNumber(playerRef) > 0 ? `#${getJerseyNumber(playerRef)}` : '';
                    const isSelected = (config.liberoReplacementTargets || []).includes(role);

                    return (
                      <label
                        key={role}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '6px 4px',
                          cursor: 'pointer',
                          borderRadius: '4px',
                          transition: 'background-color 0.15s ease',
                          backgroundColor: isSelected ? '#f0f9ff' : 'transparent',
                          userSelect: 'none',
                          WebkitTapHighlightColor: 'transparent'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = '#f9fafb';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleLiberoTargetChange(team, role)}
                          style={{
                            width: '16px',
                            height: '16px',
                            marginRight: '8px',
                            cursor: 'pointer',
                            accentColor: '#3b82f6',
                            flexShrink: 0
                          }}
                        />
                        <span style={{
                          fontSize: '14px',
                          color: '#111827',
                          fontWeight: isSelected ? '600' : '400',
                          flex: 1
                        }}>
                          <span style={{ fontWeight: '600' }}>{role}</span>
                          <span style={{ color: '#6b7280', marginLeft: '6px' }}>
                            {jerseyNum && `${jerseyNum} `}{displayName}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: '#9ca3af',
                  marginTop: '4px',
                  fontStyle: 'italic'
                }}>
                  Tap to select (typically both MBs)
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Validation Status */}
        <div className="validation-status">
          {validateConfig(config) ? (
            <span className="valid">✓ All positions filled</span>
          ) : (
            <span className="invalid">⚠ Each player needs at least a name OR number</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="rotation-config-modal-overlay">
      <div className="rotation-config-modal">
        <div className="modal-header">
          <h2>Rotation Configuration - Set {currentSet}</h2>
          <button className="close-btn" onClick={onClose} title="Close">×</button>
        </div>

        <div className="modal-body">
          <div className="teams-container">
            {renderTeamConfig('home', homeConfig, homeTeamName)}
            {renderTeamConfig('opponent', opponentConfig, opponentTeamName)}
          </div>

          <div className="starting-server-section">
            <label>Starting Serve:</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  value="home"
                  checked={startingServer === 'home'}
                  onChange={() => setStartingServer('home')}
                />
                <span>{homeTeamName}</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  value="opponent"
                  checked={startingServer === 'opponent'}
                  onChange={() => setStartingServer('opponent')}
                />
                <span>{opponentTeamName}</span>
              </label>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
            <button className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            {onResetConfiguration && (
              <button
                className="reset-btn"
                onClick={() => {
                  if (window.confirm('This will clear all rotation data for all sets. Are you sure?')) {
                    onResetConfiguration();
                    onClose();
                  }
                }}
                style={{
                  padding: '10px 16px',
                  fontSize: '14px',
                  fontWeight: '600',
                  background: '#dc3545',
                  color: 'white',
                  border: '2px solid #bd2130',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#bd2130';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = '#dc3545';
                }}
              >
                🗑️ Clear All Rotations
              </button>
            )}
          </div>
          <button className="save-btn" onClick={handleSave}>
            Start Set {currentSet}
          </button>
        </div>
      </div>
    </div>
  );
}
