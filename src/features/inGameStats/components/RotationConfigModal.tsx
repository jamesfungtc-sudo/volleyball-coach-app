import React, { useState } from 'react';
import { cn } from '@/lib/utils';
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
}

// Default empty configuration
function createEmptyConfig(system: VolleyballSystem): TeamRotationConfig {
  const roles = VOLLEYBALL_SYSTEMS[system];
  const players: Record<string, PlayerReference> = {};

  // Defensive check - if system is invalid, use default
  if (!roles || !Array.isArray(roles)) {
    console.error(`❌ [createEmptyConfig] Invalid system "${system}". Using default 5-1 (OH>S)`);
    const defaultRoles = VOLLEYBALL_SYSTEMS['5-1 (OH>S)'];
    defaultRoles.forEach((role: string) => {
      players[role] = createCustomReference(0, '');
    });
    return {
      system: '5-1 (OH>S)',
      players: players as Record<PlayerRole, PlayerReference>,
      startingP1: defaultRoles[0] as PlayerRole,
      libero: null,
      liberoReplacementTargets: [],
      currentRotation: 1
    };
  }

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

// Shared input/select styles for dark theme
const inputClasses =
  'w-full px-3 py-2 text-sm bg-card text-foreground border-2 border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary placeholder:text-muted-foreground transition-colors';

const numberInputClasses =
  'w-20 px-3 py-2 text-sm bg-card text-foreground border-2 border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors';

const selectClasses =
  'w-full px-3 py-2.5 text-sm bg-card text-foreground border-2 border-border rounded-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors';

const disabledInputClasses =
  'w-20 px-3 py-2 text-sm bg-secondary text-muted-foreground border-2 border-border rounded-md cursor-not-allowed';

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
  opponentRoster = []
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
        playerRef = createRosterReference(selectedPlayer);
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
    const mbRoles = roles.filter(r =>
      r === 'MB' || r === 'MB (w.s)' || r === 'MB1' || r === 'MB2'
    );

    if (mbRoles.length > 0) {
      return mbRoles;
    }

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
        playerRef = createRosterReference(selectedPlayer);
      } else {
        const existingJersey = currentLiberoRef ? getJerseyNumber(currentLiberoRef) : 0;
        playerRef = createCustomReference(existingJersey, value);
      }
    }

    const updatedConfig: TeamRotationConfig = {
      ...config,
      libero: playerRef
    };

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

    let newTargets: PlayerRole[];
    if (currentTargets.includes(role)) {
      newTargets = currentTargets.filter(r => r !== role);
    } else {
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
    return roles;
  };

  // Validate configuration
  const validateConfig = (config: TeamRotationConfig): boolean => {
    const roles = VOLLEYBALL_SYSTEMS[config.system];

    for (const role of roles) {
      const playerRef = config.players[role as PlayerRole];
      if (!playerRef) {
        return false;
      }
      const hasNumber = playerRef.jerseyNumber > 0;
      const hasName = playerRef.displayName !== '';
      if (!hasNumber && !hasName) {
        return false;
      }
    }

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
      <div className="bg-secondary/50 border-2 border-border rounded-lg p-5">
        <h3 className="m-0 mb-4 text-xl font-semibold text-foreground">{teamName}</h3>

        {/* System and Starting P1 - Compact row */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">System:</label>
            <select
              value={config.system}
              onChange={(e) => handleSystemChange(team, e.target.value as VolleyballSystem)}
              className={selectClasses}
            >
              <option value="5-1 (OH>S)">5-1 (OH&gt;S)</option>
              <option value="5-1 (MB>S)">5-1 (MB&gt;S)</option>
              <option value="6-2">6-2</option>
              <option value="4-2">4-2</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">Starting P1:</label>
            <select
              value={config.startingP1}
              onChange={(e) => handleStartingP1Change(team, e.target.value as PlayerRole)}
              className={selectClasses}
            >
              {roles.map((role: string) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="h-px bg-border my-3" />

        {/* Player Inputs - Compact */}
        <div className="mb-3">
          <h4 className="text-sm font-semibold mb-2.5 text-foreground">Players:</h4>
          <div className="grid items-center gap-x-3 gap-y-2.5" style={{ gridTemplateColumns: 'auto 1fr auto' }}>
            {/* Header Row */}
            <div className="font-bold text-[11px] text-muted-foreground">Role</div>
            <div className="font-bold text-[11px] text-muted-foreground">Name</div>
            <div className="font-bold text-[11px] text-muted-foreground w-20">Jersey #</div>

            {roles.map((role: string) => {
              const playerRef = config.players[role as PlayerRole];
              const isRosterPlayer = playerRef?.type === 'roster';
              const playerName = playerRef?.type === 'roster'
                ? (roster.find(p => p.id === playerRef.playerId)?.name || '')
                : (playerRef?.customName || '');
              const jerseyNum = playerRef ? getJerseyNumber(playerRef) : 0;

              return (
                <React.Fragment key={role}>
                  {/* Role Label */}
                  <div className="text-sm font-medium text-foreground">{role}:</div>

                  {/* Name Input with Datalist */}
                  <div className="relative">
                    <input
                      type="text"
                      list={`${team}-${role}-players`}
                      value={playerName}
                      onChange={(e) => handlePlayerNameChange(team, role as PlayerRole, e.target.value)}
                      placeholder={`Enter or select ${role} name`}
                      className={inputClasses}
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
                    className={isRosterPlayer ? disabledInputClasses : numberInputClasses}
                    title={isRosterPlayer ? 'Jersey number from roster (read-only)' : 'Enter jersey number'}
                  />
                </React.Fragment>
              );
            })}

            {/* Libero Row */}
            <div className="text-sm font-medium text-violet-400">L (Libero):</div>

            <div className="relative">
              <input
                type="text"
                list={`${team}-libero-players`}
                value={
                  config.libero && config.libero.type === 'roster'
                    ? (roster.find(p => p.id === (config.libero as any).playerId)?.name || '')
                    : (config.libero && config.libero.type === 'custom' ? config.libero.customName || '' : '')
                }
                onChange={(e) => handleLiberoNameChange(team, e.target.value)}
                placeholder="Enter or select Libero name"
                className={inputClasses}
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
              value={config.libero ? (getJerseyNumber(config.libero) === 0 ? '' : getJerseyNumber(config.libero)) : ''}
              onChange={(e) => {
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
              className={config.libero?.type === 'roster' ? disabledInputClasses : numberInputClasses}
              title={config.libero?.type === 'roster' ? 'Jersey number from roster (read-only)' : 'Enter jersey number'}
            />

            {/* Libero Replacement Targets - Compact checkboxes */}
            {config.libero && (
              <div className="col-span-full mt-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Libero replaces:
                </label>
                <div className="border-2 border-border rounded-md px-2.5 py-2 bg-card max-h-[120px] overflow-y-auto">
                  {getValidReplacementTargets(config.system).map((role) => {
                    const playerRef = config.players[role];
                    const displayName = playerRef?.displayName || 'Not assigned';
                    const jerseyNum = playerRef && getJerseyNumber(playerRef) > 0 ? `#${getJerseyNumber(playerRef)}` : '';
                    const isSelected = (config.liberoReplacementTargets || []).includes(role);

                    return (
                      <label
                        key={role}
                        className={cn(
                          'flex items-center px-1 py-1.5 cursor-pointer rounded transition-colors select-none',
                          isSelected ? 'bg-primary/20' : 'hover:bg-accent'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleLiberoTargetChange(team, role)}
                          className="w-4 h-4 mr-2 cursor-pointer accent-primary shrink-0"
                        />
                        <span className={cn('text-sm flex-1', isSelected ? 'text-foreground font-semibold' : 'text-foreground')}>
                          <span className="font-semibold">{role}</span>
                          <span className="text-muted-foreground ml-1.5">
                            {jerseyNum && `${jerseyNum} `}{displayName}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1 italic">
                  Tap to select (typically both MBs)
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Validation Status */}
        <div className="mt-4 px-3 py-2.5 rounded-md text-sm font-semibold">
          {validateConfig(config) ? (
            <span className="text-emerald-400 flex items-center gap-1.5">✓ All positions filled</span>
          ) : (
            <span className="text-red-400 flex items-center gap-1.5">⚠ Each player needs at least a name OR number</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-xl shadow-2xl max-w-[900px] w-[90%] max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b-2 border-border">
          <h2 className="m-0 text-2xl text-foreground font-bold">
            Rotation Configuration - Set {currentSet}
          </h2>
          <button
            className="bg-transparent border-none text-3xl leading-none text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer w-8 h-8 flex items-center justify-center rounded transition-colors"
            onClick={onClose}
            title="Close"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {renderTeamConfig('home', homeConfig, homeTeamName)}
            {renderTeamConfig('opponent', opponentConfig, opponentTeamName)}
          </div>

          <div className="p-5 bg-secondary/50 border-2 border-border rounded-lg">
            <label className="block text-base font-semibold text-foreground mb-3">Starting Serve:</label>
            <div className="flex flex-col md:flex-row gap-3 md:gap-6">
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer px-3 py-2 rounded-md hover:bg-accent transition-colors">
                <input
                  type="radio"
                  value="home"
                  checked={startingServer === 'home'}
                  onChange={() => setStartingServer('home')}
                  className="w-4 h-4 cursor-pointer accent-primary"
                />
                <span className="font-medium">{homeTeamName}</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer px-3 py-2 rounded-md hover:bg-accent transition-colors">
                <input
                  type="radio"
                  value="opponent"
                  checked={startingServer === 'opponent'}
                  onChange={() => setStartingServer('opponent')}
                  className="w-4 h-4 cursor-pointer accent-primary"
                />
                <span className="font-medium">{opponentTeamName}</span>
              </label>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end gap-3 px-6 py-5 border-t-2 border-border">
          <button
            className="px-6 py-3 text-base font-semibold bg-secondary hover:bg-accent text-foreground border-none rounded-md cursor-pointer transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-6 py-3 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground border-none rounded-md cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
            onClick={handleSave}
          >
            Start Set {currentSet}
          </button>
        </div>
      </div>
    </div>
  );
}
