import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  VolleyballCourt,
  COURT_DIMENSIONS,
  TrajectoryArrow,
  PlayerMarker,
  getCoordinates,
  clampToViewBox,
  isInBounds,
  calculateDistance,
  getPositionCoordinates,
  analyzeTrajectory,
  type Trajectory,
  type TeamLineup,
  type PlayerInPosition,
  type TrajectoryAnalysis
} from '../features/inGameStats/components/VisualTracking';
import {
  OpponentTrackingProvider,
  useOpponentTracking
} from '../features/inGameStats/context/OpponentTrackingContext';
import type {
  OpponentPlayer,
  TrajectoryData,
  OpponentAttemptResult
} from '../features/inGameStats/types/opponentTracking.types';
import { getMatch, getPlayersByTeam, getTeams, type Player } from '../services/googleSheetsAPI';
import type { MatchData } from '../types/inGameStats.types';
import { RotationConfigModal } from '../features/inGameStats/components/RotationConfigModal';
import { MatchInfoModal } from '../features/inGameStats/components/MatchInfoModal';
import type {
  TeamRotationConfig,
  RotationHistoryEntry,
  PlayerRole
} from '../features/inGameStats/types/rotation.types';
import {
  initializeLineup,
  handlePointEnd,
  saveSetConfiguration,
  loadSetConfiguration,
  manualRotateForward,
  manualRotateBackward,
  convertToRallyFormation
} from '../utils/rotationHelpers';
import {
  getPlayerId,
  getJerseyNumber,
  getPlayerDisplayName
} from '../types/playerReference.types';
import { PlayerStatsModal } from '../features/inGameStats/components/LocationMaps';
import { saveTrajectory } from '../features/inGameStats/services/trajectoryStorage';
import {
  loadSession,
  updateGameState,
  saveTrajectoryWithSync,
  saveRotationConfigForSet,
  type MatchSession
} from '../features/inGameStats/services/matchSessionService';
import {
  getSyncStatus,
  onSyncStatusChange,
  type SyncStatus
} from '../features/inGameStats/services/syncService';
import type { GameState } from '../services/googleSheetsAPI';
import './VisualTrackingPage.css';

/**
 * VisualTrackingPage - Visual opponent tracking with trajectory drawing
 *
 * Layout:
 * - Left column (40%): SVG volleyball court with player markers and drawing
 * - Right column (60%): Stats panel (top) + Controls panel (bottom)
 * - Landscape orientation only, no scrolling
 *
 * Drawing system ported from: CourtDrawing Protopype/src/CourtDrawing.jsx
 */
function VisualTrackingPageContent() {
  const navigate = useNavigate();
  const { matchId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const svgRef = useRef<SVGSVGElement>(null);

  // Roster loading state
  const [loading, setLoading] = useState(true);
  const [homeRoster, setHomeRoster] = useState<Player[]>([]);
  const [opponentRoster, setOpponentRoster] = useState<Player[]>([]);

  // Team names
  const [homeTeamName, setHomeTeamName] = useState<string>('Home');
  const [opponentTeamName, setOpponentTeamName] = useState<string>('Opponent');

  // TODO: Re-enable OpponentTrackingContext after fixing require() issue
  // const {
  //   selectPlayer,
  //   setActionType: setContextActionType,
  //   setTrajectory,
  //   saveVisualAttempt,
  //   state: contextState
  // } = useOpponentTracking();

  // Player selection state
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerInPosition | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<'home' | 'opponent' | null>(null);

  // Action type state
  const [actionType, setActionType] = useState<'attack' | 'serve' | 'block' | 'dig'>('serve'); // Start with serve

  // Drawing state
  const [currentTrajectory, setCurrentTrajectory] = useState<Trajectory | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Debug info toggle
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  // Set tracking state - initialize from URL parameter if available
  const [currentSet, setCurrentSet] = useState(() => {
    const setParam = searchParams.get('set');
    const setNumber = setParam ? parseInt(setParam, 10) : 1;
    // Validate set number is between 1-5
    return setNumber >= 1 && setNumber <= 5 ? setNumber : 1;
  });

  // Point/Rally tracking state
  const [pointNumber, setPointNumber] = useState(1); // Current point number
  const [attemptNumber, setAttemptNumber] = useState(1); // Attempt within current point
  const [isServePhase, setIsServePhase] = useState(true); // True = waiting for serve, False = rally phase
  const [homeScore, setHomeScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);

  // Serving team tracking (volleyball rules: winner of previous point serves)
  const [servingTeam, setServingTeam] = useState<'home' | 'opponent'>('home'); // Default: home serves first

  // Track if first player has been selected (to hide serve selector)
  const [firstPlayerSelected, setFirstPlayerSelected] = useState(false);

  // Scoring modal state (for quick scoring without trajectories)
  const [scoringModalOpen, setScoringModalOpen] = useState(false);
  const [scoringTeam, setScoringTeam] = useState<'home' | 'opponent' | null>(null);
  const [scoringOption, setScoringOption] = useState<'team_error' | 'opponent_error' | null>(null);
  const [quickScorePlayerId, setQuickScorePlayerId] = useState<string | null>(null);

  // Save attempts for current point (local storage until point ends)
  const [currentPointAttempts, setCurrentPointAttempts] = useState<any[]>([]);

  // Scoring history for undo functionality
  const [scoringHistory, setScoringHistory] = useState<Array<{
    pointNumber: number;
    homeScore: number;
    opponentScore: number;
    servingTeam: 'home' | 'opponent';
  }>>([]);

  // OLD: Player configuration modal removed - now using RotationConfigModal

  // Full history modal state
  const [fullHistoryModalOpen, setFullHistoryModalOpen] = useState(false);

  // Set end modal state
  const [setEndModalOpen, setSetEndModalOpen] = useState(false);
  const [setWinner, setSetWinner] = useState<'home' | 'opponent' | null>(null);

  // Settings dropdown state
  const [settingsDropdownOpen, setSettingsDropdownOpen] = useState(false);

  // Match info modal state
  const [matchInfoModalOpen, setMatchInfoModalOpen] = useState(false);

  // Player stats modal state
  const [statsModalOpen, setStatsModalOpen] = useState(false);

  // Sync status state
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [sessionLoaded, setSessionLoaded] = useState(false);

  // Rotation configuration modal state
  const [rotationConfigModalOpen, setRotationConfigModalOpen] = useState(false);
  const [rotationConfigDismissed, setRotationConfigDismissed] = useState(false);

  // Rotation state
  const [rotationEnabled, setRotationEnabled] = useState(false);
  const [homeRotationConfig, setHomeRotationConfig] = useState<TeamRotationConfig | null>(null);
  const [opponentRotationConfig, setOpponentRotationConfig] = useState<TeamRotationConfig | null>(null);
  const [rotationHistory, setRotationHistory] = useState<RotationHistoryEntry[]>([]);

  // Formation type state (serving vs rally)
  const [homeFormationType, setHomeFormationType] = useState<'serving' | 'rally'>('serving');
  const [opponentFormationType, setOpponentFormationType] = useState<'serving' | 'rally'>('serving');

  // Point history for trend display (detailed tracking)
  interface PointHistoryEntry {
    pointNumber: number;
    homeScore: number;
    opponentScore: number;
    winningTeam: 'home' | 'opponent';
    actionType: 'attack' | 'serve' | 'block' | 'dig' | 'error' | 'team_error' | 'opponent_error';
    playerId: string; // Player who made the action
    team: 'home' | 'opponent'; // Team of the player
  }
  const [pointHistory, setPointHistory] = useState<PointHistoryEntry[]>([]);

  // Player lineups (loaded from rotation config)
  // Start with empty state - will be populated when rotation config loads
  const [homeLineup, setHomeLineup] = useState<TeamLineup>({
    P1: null,
    P2: null,
    P3: null,
    P4: null,
    P5: null,
    P6: null
  });

  const [opponentLineup, setOpponentLineup] = useState<TeamLineup>({
    P1: null,
    P2: null,
    P3: null,
    P4: null,
    P5: null,
    P6: null
  });

  // Libero swap state interface
  interface LiberoSwapState {
    isActive: boolean;              // Is there a swap active?
    replacedRole: PlayerRole | null; // Which role is libero replacing?
    isManualLock: boolean;          // TRUE = locked to specific player, FALSE = auto-swap mode
  }

  // Manual libero swap state (per team, resets each set)
  const [homeLiberoSwapState, setHomeLiberoSwapState] = useState<LiberoSwapState>({
    isActive: false,
    replacedRole: null,
    isManualLock: false
  });

  const [opponentLiberoSwapState, setOpponentLiberoSwapState] = useState<LiberoSwapState>({
    isActive: false,
    replacedRole: null,
    isManualLock: false
  });

  /**
   * Load rosters from match context (Google Sheets API)
   */
  useEffect(() => {
    async function loadRosters() {
      if (!matchId || matchId === 'new') {
        console.log('No match ID or new match, skipping roster load');

        // Clear any existing rotation configs for new matches
        if (matchId === 'new') {
          const rotationKey = `match_new_rotations`;
          localStorage.removeItem(rotationKey);
          console.log('🗑️ Cleared rotation configs for new match');
        }

        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log('Loading match:', matchId);

        const match = await getMatch(matchId);

        if (match) {
          console.log('Match loaded:', match);

          // Load teams, then players for both teams
          const [teams, home, opp] = await Promise.all([
            getTeams(),
            getPlayersByTeam(match.home_team.id),
            getPlayersByTeam(match.opponent_team.id)
          ]);

          console.log('Teams:', teams);
          console.log('Home roster:', home);
          console.log('Opponent roster:', opp);

          setHomeRoster(home);
          setOpponentRoster(opp);

          // Look up actual team names from teams list
          const homeTeam = teams.find((t: any) => t.Id === match.home_team.id);
          const oppTeam = teams.find((t: any) => t.Id === match.opponent_team.id);

          // Store team names (use actual names from Teams table, fallback to match data)
          setHomeTeamName(homeTeam?.Name || match.home_team.name || 'Home');
          setOpponentTeamName(oppTeam?.Name || match.opponent_team.name || 'Opponent');

          // SMART CONFIG LOADING - Don't clear if match has recorded data
          // Check if this match has any recorded points/data (indicating it's in progress)
          const hasRecordedData = homeScore > 0 || opponentScore > 0 || pointHistory.length > 0;

          if (!hasRecordedData) {
            // Fresh match - clear any stale configs from previous sessions
            const rotationKey = `match_${matchId}_rotations`;
            const existingData = localStorage.getItem(rotationKey);
            if (existingData) {
              console.log('🗑️ Fresh match detected - clearing previous rotation configurations');
              localStorage.removeItem(rotationKey);
            }

            // Reset all rotation-related state to empty for fresh start
            setHomeLineup({
              P1: null, P2: null, P3: null, P4: null, P5: null, P6: null
            });
            setOpponentLineup({
              P1: null, P2: null, P3: null, P4: null, P5: null, P6: null
            });
            setHomeRotationConfig(null);
            setOpponentRotationConfig(null);
            setRotationEnabled(false);
            console.log('✨ Ready for fresh rotation configuration');
          } else {
            // Match in progress - preserve existing config
            console.log('📊 Match in progress detected - preserving rotation configuration');
            console.log(`  Current score: Home ${homeScore} - ${opponentScore} Opponent`);
            console.log(`  Points recorded: ${pointHistory.length}`);
          }

          // NOTE: Lineups are now populated from rotation configuration (not from roster directly)
          // The rotation config modal will handle player assignment
          console.log('Rosters loaded successfully. Team names:', match.home_team.name, 'vs', match.opponent_team.name);
          console.log('Lineups will be populated when rotation config is loaded or configured.');
        } else {
          console.warn('Match not found');
        }
      } catch (error) {
        console.error('Failed to load rosters:', error);
      } finally {
        setLoading(false);
      }
    }

    loadRosters();
  }, [matchId]);

  /**
   * Load session state from Google Sheets (scores, game state)
   * This restores the game state after a page refresh
   */
  useEffect(() => {
    async function restoreSession() {
      if (!matchId || matchId === 'new' || loading || sessionLoaded) {
        return;
      }

      try {
        console.log('🔄 Loading session state from Google Sheets...');
        const session = await loadSession(matchId);

        if (session && session.gameState) {
          console.log('📦 Session restored:', session.gameState);

          // Restore game state
          const restoredSet = session.gameState.currentSet;
          setCurrentSet(restoredSet);
          setHomeScore(session.gameState.homeScore);
          setOpponentScore(session.gameState.opponentScore);
          setPointNumber(session.gameState.pointNumber);
          setServingTeam(session.gameState.servingTeam);

          // Update URL to reflect current set
          if (restoredSet !== currentSet) {
            setSearchParams({ set: restoredSet.toString() });
          }

          // Restore rotation config from Google Sheets if available
          if (session.rotationConfigs && Object.keys(session.rotationConfigs).length > 0) {
            console.log('📋 Rotation configs found in session:', session.rotationConfigs);

            // Get config for current set (key could be number or string)
            const setConfig = session.rotationConfigs[restoredSet] || session.rotationConfigs[restoredSet.toString()];

            if (setConfig && setConfig.home && setConfig.opponent) {
              console.log('🔄 Restoring rotation config for set', restoredSet, ':', setConfig);

              // Set rotation configs
              setHomeRotationConfig(setConfig.home);
              setOpponentRotationConfig(setConfig.opponent);
              setServingTeam(setConfig.startingServer || session.gameState.servingTeam);
              setRotationEnabled(true);

              // Initialize lineups from config (rosters should be loaded at this point)
              if (homeRoster.length > 0 && opponentRoster.length > 0) {
                console.log('🏐 Initializing lineups from restored config...');
                const isHomeServing = (setConfig.startingServer || session.gameState.servingTeam) === 'home';

                const homeLineupData = initializeLineup(
                  setConfig.home,
                  'home',
                  homeRoster,
                  null,
                  isHomeServing
                );
                const opponentLineupData = initializeLineup(
                  setConfig.opponent,
                  'opponent',
                  opponentRoster,
                  null,
                  !isHomeServing
                );

                setHomeLineup(homeLineupData);
                setOpponentLineup(opponentLineupData);

                console.log('✅ Lineups restored:', { home: homeLineupData, opponent: opponentLineupData });
              } else {
                console.log('⏳ Rosters not loaded yet, lineups will be initialized later');
              }
            } else {
              console.log('⚠️ No rotation config for set', restoredSet);
            }
          }

          console.log('✅ Session restored successfully');
        } else {
          console.log('📝 No existing session - starting fresh');
        }

        setSessionLoaded(true);
      } catch (error) {
        console.error('Failed to restore session:', error);
        setSessionLoaded(true); // Mark as loaded even on error to prevent retry loops
      }
    }

    restoreSession();
  }, [matchId, loading, sessionLoaded, homeRoster.length, opponentRoster.length]);

  /**
   * Subscribe to sync status changes
   */
  useEffect(() => {
    const unsubscribe = onSyncStatusChange((status) => {
      setSyncStatus(status);
    });

    return unsubscribe;
  }, []);

  /**
   * Load or prompt for rotation configuration when set changes
   */
  useEffect(() => {
    // Reset dismissed flag when set changes
    setRotationConfigDismissed(false);

    console.log('🔍 Rotation config check:', {
      matchId,
      loading,
      currentSet,
      rotationConfigModalOpen,
      rotationEnabled
    });

    if (!matchId || loading) {
      console.log('⏭️ Skipping rotation check - no matchId or still loading');
      return;
    }

    const existingConfig = loadSetConfiguration(matchId, currentSet, homeRoster, opponentRoster);
    console.log('📦 Existing config for set', currentSet, ':', existingConfig);

    // Validate that config is actually complete
    const isValidConfig = existingConfig &&
                         existingConfig.home &&
                         existingConfig.opponent &&
                         existingConfig.home.players &&
                         existingConfig.opponent.players &&
                         Object.keys(existingConfig.home.players).length > 0 &&
                         Object.keys(existingConfig.opponent.players).length > 0;

    console.log('✅ Config validation:', {
      hasConfig: !!existingConfig,
      hasHome: !!existingConfig?.home,
      hasOpponent: !!existingConfig?.opponent,
      homePlayers: existingConfig?.home?.players ? Object.keys(existingConfig.home.players).length : 0,
      opponentPlayers: existingConfig?.opponent?.players ? Object.keys(existingConfig.opponent.players).length : 0,
      isValid: isValidConfig
    });

    if (!isValidConfig && !rotationConfigModalOpen && !rotationConfigDismissed) {
      // No valid config for this set - open modal (unless user dismissed it)
      console.log(`✨ No valid rotation config for set ${currentSet}, opening modal`);
      setRotationConfigModalOpen(true);
    } else if (isValidConfig && existingConfig) {
      // Load existing configuration
      console.log(`📥 Loading existing rotation config for set ${currentSet}`);
      setHomeRotationConfig(existingConfig.home);
      setOpponentRotationConfig(existingConfig.opponent);
      setServingTeam(existingConfig.startingServer);
      setRotationEnabled(true);

      // Initialize lineups from config WITH ROSTER DATA
      // initializeLineup now includes libero substitution via getRotations()
      // Pass serving status to respect P1 serving position rules
      const homeLineupData = initializeLineup(
        existingConfig.home,
        'home',
        homeRoster,
        null,  // No manual swap role initially
        existingConfig.startingServer === 'home'  // Home is serving
      );
      const opponentLineupData = initializeLineup(
        existingConfig.opponent,
        'opponent',
        opponentRoster,
        null,  // No manual swap role initially
        existingConfig.startingServer === 'opponent'  // Opponent is serving
      );

      setHomeLineup(homeLineupData);
      setOpponentLineup(opponentLineupData);
    } else {
      console.log('⚠️ Config validation failed OR modal already open - not opening modal');
    }
  }, [currentSet, matchId, loading, rotationConfigModalOpen, homeRoster, opponentRoster]);

  /**
   * Helper function: Look up player by ID from rosters
   */
  const getPlayerById = (playerId: string, team: 'home' | 'opponent') => {
    const roster = team === 'home' ? homeRoster : opponentRoster;
    return roster.find(p => p.id === playerId);
  };

  /**
   * Helper function: Format player display string
   * Returns: "#1 Player Name" or "#1 Unknown" if not found
   */
  const formatPlayerDisplay = (playerId: string, team: 'home' | 'opponent') => {
    const player = getPlayerById(playerId, team);
    if (player) {
      return `#${player.jerseyNumber} ${player.name}`;
    }
    return `#? Unknown`;
  };

  /**
   * Helper function: Get player jersey number
   * Returns number or undefined if not found
   */
  const getPlayerJerseyNumber = (playerId: string, team: 'home' | 'opponent') => {
    const player = getPlayerById(playerId, team);
    return player?.jerseyNumber;
  };

  /**
   * Helper function: Get player name
   * Returns name or 'Unknown' if not found
   */
  const getPlayerName = (playerId: string, team: 'home' | 'opponent') => {
    const player = getPlayerById(playerId, team);
    return player?.name || 'Unknown';
  };

  /**
   * Handle rotation configuration save from modal
   */
  const handleRotationConfigSave = (
    homeConfig: TeamRotationConfig,
    opponentConfig: TeamRotationConfig,
    startingServer: 'home' | 'opponent'
  ) => {
    console.log('Saving rotation configuration for set', currentSet);

    // Save to state
    setHomeRotationConfig(homeConfig);
    setOpponentRotationConfig(opponentConfig);
    setServingTeam(startingServer);
    setRotationEnabled(true);

    // Save to localStorage AND sync to Google Sheets
    if (matchId && matchId !== 'new') {
      saveSetConfiguration(matchId, currentSet, homeConfig, opponentConfig, startingServer);

      // Sync rotation config to Google Sheets
      const fullConfig = {
        home: homeConfig,
        opponent: opponentConfig,
        startingServer
      };
      saveRotationConfigForSet(matchId, currentSet, fullConfig, homeRoster, opponentRoster)
        .then(() => console.log('✅ Rotation config synced to Google Sheets'))
        .catch((err) => console.error('❌ Failed to sync rotation config:', err));
    }

    // Initialize lineups from configuration WITH ROSTER DATA
    console.log('🔍 Initializing lineups with roster data:', {
      homeRosterSize: homeRoster.length,
      opponentRosterSize: opponentRoster.length,
      homeRosterSample: homeRoster[0],
      opponentRosterSample: opponentRoster[0]
    });

    console.log('📋 FULL HOME ROSTER:', homeRoster);
    console.log('📋 FULL OPPONENT ROSTER:', opponentRoster);

    console.log('⚙️ HOME CONFIG.players:', homeConfig.players);
    console.log('⚙️ OPPONENT CONFIG.players:', opponentConfig.players);

    // Initialize lineups with serving status to respect P1 serving position rules
    const homeLineupData = initializeLineup(
      homeConfig,
      'home',
      homeRoster,
      null,  // No manual swap role initially
      startingServer === 'home'  // Home is serving
    );
    const opponentLineupData = initializeLineup(
      opponentConfig,
      'opponent',
      opponentRoster,
      null,  // No manual swap role initially
      startingServer === 'opponent'  // Opponent is serving
    );

    console.log('✅ Lineups initialized:', {
      homeLineup: homeLineupData,
      opponentLineup: opponentLineupData
    });

    // initializeLineup now includes libero substitution via getRotations()
    setHomeLineup(homeLineupData);
    setOpponentLineup(opponentLineupData);

    console.log('🏐 Final lineups set with libero:', {
      home: homeLineupData,
      opponent: opponentLineupData
    });

    // Close modal
    setRotationConfigModalOpen(false);
  };

  /**
   * Reset rotation configuration - Clears localStorage and resets state
   */
  const handleResetConfiguration = () => {
    const rotationKey = `match_${matchId}_rotations`;
    localStorage.removeItem(rotationKey);

    // Reset all rotation-related state
    setHomeLineup({
      P1: null, P2: null, P3: null, P4: null, P5: null, P6: null
    });
    setOpponentLineup({
      P1: null, P2: null, P3: null, P4: null, P5: null, P6: null
    });
    setHomeRotationConfig(null);
    setOpponentRotationConfig(null);
    setRotationEnabled(false);

    // Open rotation config modal
    setRotationConfigModalOpen(true);

    console.log('🔄 Rotation configuration reset - please reconfigure');
  };

  /**
   * Manual rotation controls - Rotate team forward (+1)
   */
  const handleManualRotateForward = (team: 'home' | 'opponent') => {
    const swapState = team === 'home' ? homeLiberoSwapState : opponentLiberoSwapState;
    // Only pass manual swap role if it's a manual lock (not auto-swap mode)
    const manualSwapRole = (swapState.isActive && swapState.isManualLock) ? swapState.replacedRole : null;
    // Check if this team is serving
    const isServing = servingTeam === team;

    if (team === 'home' && homeRotationConfig) {
      const result = manualRotateForward(homeLineup, homeRotationConfig, homeRoster, 'home', manualSwapRole, isServing);
      setHomeLineup(result.lineup);
      setHomeRotationConfig({
        ...homeRotationConfig,
        currentRotation: result.newRotation
      });
      console.log(`Home team manually rotated forward to rotation ${result.newRotation} (serving: ${isServing})`);
    } else if (team === 'opponent' && opponentRotationConfig) {
      const result = manualRotateForward(opponentLineup, opponentRotationConfig, opponentRoster, 'opponent', manualSwapRole, isServing);
      setOpponentLineup(result.lineup);
      setOpponentRotationConfig({
        ...opponentRotationConfig,
        currentRotation: result.newRotation
      });
      console.log(`Opponent team manually rotated forward to rotation ${result.newRotation} (serving: ${isServing})`);
    }
  };

  /**
   * Manual rotation controls - Rotate team backward (-1)
   */
  const handleManualRotateBackward = (team: 'home' | 'opponent') => {
    const swapState = team === 'home' ? homeLiberoSwapState : opponentLiberoSwapState;
    // Only pass manual swap role if it's a manual lock (not auto-swap mode)
    const manualSwapRole = (swapState.isActive && swapState.isManualLock) ? swapState.replacedRole : null;
    // Check if this team is serving
    const isServing = servingTeam === team;

    if (team === 'home' && homeRotationConfig) {
      const result = manualRotateBackward(homeLineup, homeRotationConfig, homeRoster, 'home', manualSwapRole, isServing);
      setHomeLineup(result.lineup);
      setHomeRotationConfig({
        ...homeRotationConfig,
        currentRotation: result.newRotation
      });
      console.log(`Home team manually rotated backward to rotation ${result.newRotation} (serving: ${isServing})`);
    } else if (team === 'opponent' && opponentRotationConfig) {
      const result = manualRotateBackward(opponentLineup, opponentRotationConfig, opponentRoster, 'opponent', manualSwapRole, isServing);
      setOpponentLineup(result.lineup);
      setOpponentRotationConfig({
        ...opponentRotationConfig,
        currentRotation: result.newRotation
      });
      console.log(`Opponent team manually rotated backward to rotation ${result.newRotation} (serving: ${isServing})`);
    }
  };

  /**
   * Manual libero swap OUT - Swap libero back to bench, bring original player back
   */
  const handleLiberoSwapOut = (team: 'home' | 'opponent') => {
    console.log(`🔄 handleLiberoSwapOut called for ${team} team`);
    const lineup = team === 'home' ? homeLineup : opponentLineup;
    const config = team === 'home' ? homeRotationConfig : opponentRotationConfig;
    const swapState = team === 'home' ? homeLiberoSwapState : opponentLiberoSwapState;

    console.log('Swap OUT state:', { config: !!config, selectedPlayer, isLibero: selectedPlayer?.isLibero, swapState });

    if (!config || !selectedPlayer || !selectedPlayer.isLibero) {
      console.error('❌ Invalid swap OUT attempt', { hasConfig: !!config, hasPlayer: !!selectedPlayer, isLibero: selectedPlayer?.isLibero });
      return;
    }

    // Validate back row only
    if (!['P1', 'P5', 'P6'].includes(selectedPlayer.position)) {
      console.error('❌ Cannot swap OUT libero from front row');
      return;
    }

    // Get original player to bring back
    const originalRole = selectedPlayer.originalRole || swapState.replacedRole;
    if (!originalRole) {
      console.error('❌ No original role tracked');
      return;
    }

    const originalPlayerRef = config.players[originalRole];

    // Update lineup - bring original player back
    const newLineup = { ...lineup };
    newLineup[selectedPlayer.position] = {
      reference: originalPlayerRef,
      position: selectedPlayer.position,
      roleInSystem: originalRole,
      isLibero: false,
      playerId: getPlayerId(originalPlayerRef),
      jerseyNumber: getJerseyNumber(originalPlayerRef),
      playerName: getPlayerDisplayName(originalPlayerRef)
    };

    // Update state - clear all swap state (back to default auto-swap)
    if (team === 'home') {
      setHomeLineup(newLineup);
      setHomeLiberoSwapState({ isActive: false, replacedRole: null, isManualLock: false });
    } else {
      setOpponentLineup(newLineup);
      setOpponentLiberoSwapState({ isActive: false, replacedRole: null, isManualLock: false });
    }

    setSelectedPlayer(null);
    setSelectedTeam(null);

    console.log(`✅ Libero swapped OUT at ${selectedPlayer.position}`);
  };

  /**
   * Manual libero swap IN - Swap selected back row player with libero
   */
  const handleLiberoSwapIn = (team: 'home' | 'opponent') => {
    console.log(`🔄 handleLiberoSwapIn called for ${team} team`);
    const lineup = team === 'home' ? homeLineup : opponentLineup;
    const config = team === 'home' ? homeRotationConfig : opponentRotationConfig;
    const swapState = team === 'home' ? homeLiberoSwapState : opponentLiberoSwapState;

    console.log('Swap IN state:', { config: !!config, hasLibero: !!config?.libero, selectedPlayer, swapState });

    if (!config || !config.libero || !selectedPlayer) {
      console.error('❌ Invalid swap IN attempt', { hasConfig: !!config, hasLibero: !!config?.libero, hasPlayer: !!selectedPlayer });
      return;
    }

    // Validation 1: Back row only
    if (!['P1', 'P5', 'P6'].includes(selectedPlayer.position)) {
      console.error('❌ Can only swap IN libero for back row players');
      return;
    }

    // Validation 2: Libero not already on court (in back row)
    const liberoOnCourt = Object.values(lineup).some(p =>
      p && p.isLibero && ['P1', 'P5', 'P6'].includes(p.position)
    );

    if (liberoOnCourt) {
      console.error('❌ Libero already on court in back row');
      return;
    }

    // Create libero player at this position
    const liberoPlayer: PlayerInPosition = {
      reference: config.libero,
      position: selectedPlayer.position,
      roleInSystem: 'L',
      isLibero: true,
      originalRole: selectedPlayer.roleInSystem, // Track who libero replaced
      playerId: getPlayerId(config.libero),
      jerseyNumber: getJerseyNumber(config.libero),
      playerName: getPlayerDisplayName(config.libero)
    };

    // Update lineup
    const newLineup = { ...lineup };
    newLineup[selectedPlayer.position] = liberoPlayer;

    // Check if swapping with a default target (reverts to auto-swap mode)
    const isDefaultTarget = config.liberoReplacementTargets &&
                            config.liberoReplacementTargets.includes(selectedPlayer.roleInSystem!);

    // Update state
    if (team === 'home') {
      setHomeLineup(newLineup);
      setHomeLiberoSwapState({
        isActive: true,
        replacedRole: selectedPlayer.roleInSystem!,
        isManualLock: !isDefaultTarget  // FALSE if default target (auto-swap mode), TRUE if manual lock
      });
    } else {
      setOpponentLineup(newLineup);
      setOpponentLiberoSwapState({
        isActive: true,
        replacedRole: selectedPlayer.roleInSystem!,
        isManualLock: !isDefaultTarget  // FALSE if default target (auto-swap mode), TRUE if manual lock
      });
    }

    setSelectedPlayer(null);
    setSelectedTeam(null);

    const mode = isDefaultTarget ? 'AUTO-SWAP MODE' : 'MANUAL LOCK';
    console.log(`✅ Libero swapped IN at ${selectedPlayer.position} for ${selectedPlayer.roleInSystem} [${mode}]`);
  };

  /**
   * Toggle formation type between serving and rally
   */
  const handleFormationToggle = (team: 'home' | 'opponent', formationType: 'serving' | 'rally') => {
    if (team === 'home') {
      setHomeFormationType(formationType);
      console.log(`Home team formation set to: ${formationType}`);
    } else {
      setOpponentFormationType(formationType);
      console.log(`Opponent team formation set to: ${formationType}`);
    }
  };

  /**
   * Get the current lineup for a team based on formation type
   */
  const getCurrentLineup = (team: 'home' | 'opponent'): TeamLineup => {
    const lineup = team === 'home' ? homeLineup : opponentLineup;
    const formationType = team === 'home' ? homeFormationType : opponentFormationType;

    if (formationType === 'rally') {
      return convertToRallyFormation(lineup);
    }

    return lineup;
  };

  /**
   * Save the current attempt and handle point workflow
   */
  const handleSaveAttempt = (result: OpponentAttemptResult) => {
    if (!selectedPlayer || !currentTrajectory || !selectedTeam || !trajectoryAnalysis) {
      console.warn('Cannot save: missing player, trajectory, team, or analysis');
      return;
    }

    // Switch to rally formation if ball in play
    if (result === 'in_play') {
      // Switch BOTH teams to rally formation
      if (homeFormationType !== 'rally') {
        setHomeFormationType('rally');
        console.log('🏐 Home team → Rally formation (ball in play)');
      }
      if (opponentFormationType !== 'rally') {
        setOpponentFormationType('rally');
        console.log('🏐 Opponent team → Rally formation (ball in play)');
      }
    }

    // Create attempt data
    const attemptData = {
      pointNumber,
      attemptNumber,
      actionType,
      player: `#${selectedPlayer.jerseyNumber} ${selectedPlayer.playerName}`,
      team: selectedTeam,
      result,
      trajectory: {
        start: [currentTrajectory.startX, currentTrajectory.startY],
        end: [currentTrajectory.endX, currentTrajectory.endY],
        distance: trajectoryAnalysis.distance,
        speed: trajectoryAnalysis.speed,
        landingArea: trajectoryAnalysis.landingArea,
        hitPosition: trajectoryAnalysis.hitPosition,
        serveZone: trajectoryAnalysis.serveZone
      }
    };

    // Add to current point attempts
    setCurrentPointAttempts(prev => [...prev, attemptData]);

    // Save trajectory to localStorage AND sync to Google Sheets
    if (matchId && (actionType === 'serve' || actionType === 'attack')) {
      // Save to localStorage first (immediate)
      saveTrajectory(matchId, {
        setNumber: currentSet,
        pointNumber,
        attemptNumber,
        playerId: selectedPlayer.playerId || `custom_${selectedPlayer.jerseyNumber}`,
        playerName: selectedPlayer.playerName,
        jerseyNumber: selectedPlayer.jerseyNumber,
        team: selectedTeam,
        actionType,
        result,
        startX: currentTrajectory.startX,
        startY: currentTrajectory.startY,
        endX: currentTrajectory.endX,
        endY: currentTrajectory.endY,
        serveZone: trajectoryAnalysis.serveZone,
        hitPosition: trajectoryAnalysis.hitPosition,
        landingArea: trajectoryAnalysis.landingArea,
      });

      // Also sync to Google Sheets (async, non-blocking)
      if (matchId !== 'new') {
        saveTrajectoryWithSync(matchId, {
          setNumber: currentSet,
          pointNumber,
          attemptNumber,
          playerId: selectedPlayer.playerId || `custom_${selectedPlayer.jerseyNumber}`,
          playerName: selectedPlayer.playerName,
          jerseyNumber: selectedPlayer.jerseyNumber,
          team: selectedTeam,
          actionType,
          result,
          startX: currentTrajectory.startX,
          startY: currentTrajectory.startY,
          endX: currentTrajectory.endX,
          endY: currentTrajectory.endY,
          serveZone: trajectoryAnalysis.serveZone,
          hitPosition: trajectoryAnalysis.hitPosition,
          landingArea: trajectoryAnalysis.landingArea,
        }).catch(err => {
          console.error('Failed to sync trajectory:', err);
        });
      }
    }

    console.log(`📝 Point ${pointNumber}, Attempt ${attemptNumber}:`, attemptData);

    // Check if point ended
    const pointEnded = result === 'ace' || result === 'kill' || result === 'error';

    if (pointEnded) {
      // Point ended - switch BOTH teams back to serving formation
      setHomeFormationType('serving');
      setOpponentFormationType('serving');
      console.log('🏐 Both teams → Serving formation (point ended)');

      // Save current state to history before updating
      setScoringHistory(prev => [...prev, {
        pointNumber,
        homeScore,
        opponentScore,
        servingTeam
      }]);

      // Determine point winner and update score + serving team
      let pointWinner: 'home' | 'opponent';

      if (result === 'error') {
        // Error by selected team = point to other team
        pointWinner = selectedTeam === 'home' ? 'opponent' : 'home';
        if (selectedTeam === 'home') {
          setOpponentScore(prev => prev + 1);
          console.log('📊 Opponent scores! (Home error)');
        } else {
          setHomeScore(prev => prev + 1);
          console.log('📊 Home scores! (Opponent error)');
        }
      } else {
        // Kill or Ace = point to selected team
        pointWinner = selectedTeam;
        if (selectedTeam === 'home') {
          setHomeScore(prev => prev + 1);
          console.log('📊 Home scores! (Kill/Ace)');
        } else {
          setOpponentScore(prev => prev + 1);
          console.log('📊 Opponent scores! (Kill/Ace)');
        }
      }

      // Handle rotation if enabled
      if (rotationEnabled && homeRotationConfig && opponentRotationConfig) {
        const rotationUpdate = handlePointEnd(
          pointWinner,
          servingTeam,
          homeLineup,
          opponentLineup,
          homeRotationConfig,
          opponentRotationConfig,
          homeRoster,         // ADD roster parameters
          opponentRoster
        );

        if (rotationUpdate.rotationChanged) {
          // Update lineups
          setHomeLineup(rotationUpdate.homeLineup);
          setOpponentLineup(rotationUpdate.opponentLineup);

          // Update rotation numbers from the returned values
          setHomeRotationConfig({
            ...homeRotationConfig,
            currentRotation: rotationUpdate.newHomeRotation
          });
          setOpponentRotationConfig({
            ...opponentRotationConfig,
            currentRotation: rotationUpdate.newOpponentRotation
          });

          console.log(`🔄 Rotation: ${rotationUpdate.servingTeam} team rotated to rotation ${rotationUpdate.servingTeam === 'home' ? rotationUpdate.newHomeRotation : rotationUpdate.newOpponentRotation}`);
        }

        setServingTeam(rotationUpdate.servingTeam);

        // Auto libero swap during dead ball (after side-out for losing team)
        if (rotationUpdate.rotationChanged) {
          // Side-out occurred - check if losing team's libero should auto-swap back in
          const losingTeam = servingTeam; // The team that was serving and lost

          console.log(`🔍 Side-out check: losingTeam=${losingTeam}, servingTeam=${servingTeam}`);

          // Check home team
          if (losingTeam === 'home' && homeRotationConfig.libero && homeRotationConfig.liberoReplacementTargets) {
            const p1Player = rotationUpdate.homeLineup['P1'];
            console.log(`🔍 Home P1 player after rotation:`, p1Player);
            console.log(`🔍 Home libero config targets:`, homeRotationConfig.liberoReplacementTargets);
            console.log(`🔍 Home libero swap state:`, homeLiberoSwapState);

            // Check if P1 player's role matches configured libero replacement targets
            // Use manual swap role if active, otherwise use default targets
            const targetRoles = homeLiberoSwapState.isActive && homeLiberoSwapState.isManualLock
              ? [homeLiberoSwapState.replacedRole]
              : homeRotationConfig.liberoReplacementTargets;

            const shouldAutoSwap = p1Player?.roleInSystem &&
                                   targetRoles.includes(p1Player.roleInSystem) &&
                                   !p1Player?.isLibero;

            console.log(`🔍 Home shouldAutoSwap=${shouldAutoSwap} (roleInTargets=${targetRoles.includes(p1Player?.roleInSystem || '')}, notLibero=${!p1Player?.isLibero})`);

            if (shouldAutoSwap) {
              // Auto swap libero back in at P1
              const newHomeLineup = { ...rotationUpdate.homeLineup };
              newHomeLineup['P1'] = {
                reference: homeRotationConfig.libero,
                position: 'P1',
                roleInSystem: 'L',
                isLibero: true,
                originalRole: p1Player.roleInSystem,
                playerId: getPlayerId(homeRotationConfig.libero),
                jerseyNumber: getJerseyNumber(homeRotationConfig.libero),
                playerName: getPlayerDisplayName(homeRotationConfig.libero)
              };
              setHomeLineup(newHomeLineup);
              console.log(`🔄 Auto libero swap: Home libero → P1 (dead ball after side-out)`);
            }
          }

          // Check opponent team
          if (losingTeam === 'opponent' && opponentRotationConfig.libero && opponentRotationConfig.liberoReplacementTargets) {
            const p1Player = rotationUpdate.opponentLineup['P1'];
            console.log(`🔍 Opponent P1 player after rotation:`, p1Player);
            console.log(`🔍 Opponent libero config targets:`, opponentRotationConfig.liberoReplacementTargets);
            console.log(`🔍 Opponent libero swap state:`, opponentLiberoSwapState);

            // Check if P1 player's role matches configured libero replacement targets
            // Use manual swap role if active, otherwise use default targets
            const targetRoles = opponentLiberoSwapState.isActive && opponentLiberoSwapState.isManualLock
              ? [opponentLiberoSwapState.replacedRole]
              : opponentRotationConfig.liberoReplacementTargets;

            const shouldAutoSwap = p1Player?.roleInSystem &&
                                   targetRoles.includes(p1Player.roleInSystem) &&
                                   !p1Player?.isLibero;

            console.log(`🔍 Opponent shouldAutoSwap=${shouldAutoSwap} (roleInTargets=${targetRoles.includes(p1Player?.roleInSystem || '')}, notLibero=${!p1Player?.isLibero})`);

            if (shouldAutoSwap) {
              // Auto swap libero back in at P1
              const newOpponentLineup = { ...rotationUpdate.opponentLineup };
              newOpponentLineup['P1'] = {
                reference: opponentRotationConfig.libero,
                position: 'P1',
                roleInSystem: 'L',
                isLibero: true,
                originalRole: p1Player.roleInSystem,
                playerId: getPlayerId(opponentRotationConfig.libero),
                jerseyNumber: getJerseyNumber(opponentRotationConfig.libero),
                playerName: getPlayerDisplayName(opponentRotationConfig.libero)
              };
              setOpponentLineup(newOpponentLineup);
              console.log(`🔄 Auto libero swap: Opponent libero → P1 (dead ball after side-out)`);
            }
          }
        }
      } else {
        // No rotation enabled - just update serving team
        setServingTeam(pointWinner);
      }

      console.log(`🏐 ${pointWinner} wins the point and will serve next`);

      // Calculate new scores for point history
      const newHomeScore = pointWinner === 'home' ? homeScore + 1 : homeScore;
      const newOpponentScore = pointWinner === 'opponent' ? opponentScore + 1 : opponentScore;

      // Add to point history for trend display
      setPointHistory(prev => [...prev, {
        pointNumber,
        homeScore: newHomeScore,
        opponentScore: newOpponentScore,
        winningTeam: pointWinner,
        actionType: result === 'error' ? 'error' : actionType,
        playerId: selectedPlayer.playerId,
        team: selectedTeam
      }]);

      // Determine new serving team for game state sync
      const newServingTeam = pointWinner === servingTeam ? servingTeam : pointWinner;

      // Start new point
      console.log(`🏐 Point ${pointNumber} ended. Starting Point ${pointNumber + 1}`);
      console.log('All attempts in point:', [...currentPointAttempts, attemptData]);

      setPointNumber(prev => prev + 1);
      setAttemptNumber(1);
      setIsServePhase(true);
      setActionType('serve');
      setCurrentPointAttempts([]); // Clear attempts for new point
      setSelectedPlayer(null);
      setSelectedTeam(null);

      // Sync game state to Google Sheets (async, non-blocking)
      if (matchId && matchId !== 'new') {
        const newGameState: GameState = {
          currentSet,
          homeScore: newHomeScore,
          opponentScore: newOpponentScore,
          pointNumber: pointNumber + 1,
          servingTeam: newServingTeam,
          status: 'in_progress'
        };
        updateGameState(matchId, newGameState).catch(err => {
          console.error('Failed to sync game state:', err);
        });
      }
    } else {
      // Point continues - rally phase
      setAttemptNumber(prev => prev + 1);
      setIsServePhase(false);
      setActionType('attack'); // Default to attack for rally
      setSelectedPlayer(null); // Force reselect player
      setSelectedTeam(null);
      console.log('▶️ Point continues - select next player');
    }

    // Clear trajectory
    setCurrentTrajectory(null);
  };

  /**
   * Handle drawing start (mouse down or touch start)
   * Ported from prototype handleStart
   *
   * IMPORTANT: Only allow drawing if a player is selected
   */
  const handleStart = (event: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    event.preventDefault();

    // Block drawing if no player selected
    if (!selectedPlayer) return;

    if (!svgRef.current) return;

    const coords = getCoordinates(event, svgRef.current);
    const clamped = clampToViewBox(coords.x, coords.y);

    setIsDragging(true);
    setCurrentTrajectory({
      startX: clamped.x,
      startY: clamped.y,
      endX: clamped.x,
      endY: clamped.y,
      startInBounds: isInBounds(clamped.x, clamped.y),
      endInBounds: isInBounds(clamped.x, clamped.y)
    });
  };

  /**
   * Handle drawing move (mouse move or touch move)
   * Ported from prototype handleMove
   */
  const handleMove = (event: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    if (!isDragging || !svgRef.current) return;

    event.preventDefault();

    const coords = getCoordinates(event, svgRef.current);
    const clamped = clampToViewBox(coords.x, coords.y);

    setCurrentTrajectory(prev => prev ? {
      ...prev,
      endX: clamped.x,
      endY: clamped.y,
      endInBounds: isInBounds(clamped.x, clamped.y)
    } : null);
  };

  /**
   * Handle drawing end (mouse up or touch end)
   * Ported from prototype handleEnd
   */
  const handleEnd = (event: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    if (!isDragging) return;

    event.preventDefault();

    // Only keep trajectory if there's meaningful distance (minimum 10px)
    if (currentTrajectory) {
      const distance = calculateDistance(
        currentTrajectory.startX,
        currentTrajectory.startY,
        currentTrajectory.endX,
        currentTrajectory.endY
      );

      if (distance < 10) {
        // Too small, clear it
        setCurrentTrajectory(null);
      }
      // Otherwise keep the trajectory (don't clear it - user can redraw)
    }

    setIsDragging(false);
  };

  /**
   * Handle player selection
   * During serve phase: Allow serving team for actions, but also allow receiving team for substitutions
   */
  const handlePlayerClick = (playerId: string, team: 'home' | 'opponent') => {
    const lineup = team === 'home' ? homeLineup : opponentLineup;
    const player = Object.values(lineup).find(p => p?.playerId === playerId);

    if (player) {
      setSelectedPlayer(player);
      setSelectedTeam(team);
      // Clear any existing trajectory when selecting new player
      setCurrentTrajectory(null);

      // Mark first player as selected (hides serve selector for rest of set)
      if (!firstPlayerSelected) {
        setFirstPlayerSelected(true);
      }

      // Log warning if selecting receiving team during serve phase (for actions, not substitutions)
      if (isServePhase && team !== servingTeam) {
        console.log(`⚠️ Note: ${team} player selected during ${servingTeam} serve - available for substitution only`);
      }
    }
  };

  /**
   * Get available result buttons based on current action type
   */
  const getResultButtons = () => {
    if (actionType === 'serve') {
      return [
        { result: 'in_play' as OpponentAttemptResult, label: '▶️ In Play', color: '#3b82f6' },
        { result: 'ace' as OpponentAttemptResult, label: '🎯 Ace', color: '#f59e0b' },
        { result: 'error' as OpponentAttemptResult, label: '❌ Error', color: '#ef4444' }
      ];
    } else if (actionType === 'attack') {
      return [
        { result: 'in_play' as OpponentAttemptResult, label: '▶️ In Play', color: '#3b82f6' },
        { result: 'kill' as OpponentAttemptResult, label: '⚡ Kill', color: '#10b981' },
        { result: 'error' as OpponentAttemptResult, label: '❌ Error', color: '#ef4444' }
      ];
    } else if (actionType === 'block') {
      return [
        { result: 'in_play' as OpponentAttemptResult, label: '▶️ In Play', color: '#3b82f6' },
        { result: 'kill' as OpponentAttemptResult, label: '🛡️ Stuff', color: '#10b981' },
        { result: 'error' as OpponentAttemptResult, label: '❌ Error', color: '#ef4444' }
      ];
    } else if (actionType === 'dig') {
      return [
        { result: 'in_play' as OpponentAttemptResult, label: '▶️ In Play', color: '#3b82f6' },
        { result: 'error' as OpponentAttemptResult, label: '❌ Error', color: '#ef4444' }
      ];
    }
    return [];
  };

  /**
   * Handle quick scoring from modal (without trajectory drawing)
   */
  const handleQuickScore = (scoringOpt: 'team_error' | 'opponent_error', playerId: string) => {
    if (!scoringTeam) return;

    // Save current state to history before updating
    setScoringHistory(prev => [...prev, {
      pointNumber,
      homeScore,
      opponentScore,
      servingTeam
    }]);

    let pointWinner: 'home' | 'opponent';
    let errorTeam: 'home' | 'opponent';

    if (scoringOpt === 'team_error') {
      // Team that opened the modal made an error = point to other team
      pointWinner = scoringTeam === 'home' ? 'opponent' : 'home';
      errorTeam = scoringTeam;
      if (scoringTeam === 'home') {
        setOpponentScore(prev => prev + 1);
        console.log('📊 Opponent scores! (Home error - quick score)');
      } else {
        setHomeScore(prev => prev + 1);
        console.log('📊 Home scores! (Opponent error - quick score)');
      }
    } else {
      // Opponent of the team that opened the modal made an error = point to team
      pointWinner = scoringTeam;
      errorTeam = scoringTeam === 'home' ? 'opponent' : 'home';
      if (scoringTeam === 'home') {
        setHomeScore(prev => prev + 1);
        console.log('📊 Home scores! (Opponent error - quick score)');
      } else {
        setOpponentScore(prev => prev + 1);
        console.log('📊 Opponent scores! (Home error - quick score)');
      }
    }

    // Handle rotation if enabled
    if (rotationEnabled && homeRotationConfig && opponentRotationConfig) {
      const rotationUpdate = handlePointEnd(
        pointWinner,
        servingTeam,
        homeLineup,
        opponentLineup,
        homeRotationConfig,
        opponentRotationConfig,
        homeRoster,         // ADD roster parameters
        opponentRoster
      );

      if (rotationUpdate.rotationChanged) {
        // Update lineups
        setHomeLineup(rotationUpdate.homeLineup);
        setOpponentLineup(rotationUpdate.opponentLineup);

        // Update rotation numbers from the returned values
        setHomeRotationConfig({
          ...homeRotationConfig,
          currentRotation: rotationUpdate.newHomeRotation
        });
        setOpponentRotationConfig({
          ...opponentRotationConfig,
          currentRotation: rotationUpdate.newOpponentRotation
        });

        console.log(`🔄 Rotation: ${rotationUpdate.servingTeam} team rotated to rotation ${rotationUpdate.servingTeam === 'home' ? rotationUpdate.newHomeRotation : rotationUpdate.newOpponentRotation}`);
      }

      setServingTeam(rotationUpdate.servingTeam);
    } else {
      // No rotation enabled - just update serving team
      setServingTeam(pointWinner);
    }

    console.log(`🏐 ${pointWinner} wins the point and will serve next`);

    // Calculate new scores for point history
    const newHomeScore = pointWinner === 'home' ? homeScore + 1 : homeScore;
    const newOpponentScore = pointWinner === 'opponent' ? opponentScore + 1 : opponentScore;

    // Add to point history for trend display
    setPointHistory(prev => [...prev, {
      pointNumber,
      homeScore: newHomeScore,
      opponentScore: newOpponentScore,
      winningTeam: pointWinner,
      actionType: scoringOpt,
      playerId: playerId,
      team: errorTeam
    }]);

    // Start new point
    console.log(`🏐 Point ${pointNumber} ended (quick score). Starting Point ${pointNumber + 1}`);
    setPointNumber(prev => prev + 1);
    setAttemptNumber(1);
    setIsServePhase(true);
    setActionType('serve');
    setCurrentPointAttempts([]);
    setSelectedPlayer(null);
    setSelectedTeam(null);
    setCurrentTrajectory(null);

    // Close modal and reset state
    setScoringModalOpen(false);
    setScoringTeam(null);
    setScoringOption(null);
    setQuickScorePlayerId(null);
  };

  /**
   * Go back / Undo last point scored
   */
  const handleGoBack = () => {
    if (scoringHistory.length === 0) {
      console.log('⚠️ No scoring history to undo');
      return;
    }

    // Get the last state from history
    const lastState = scoringHistory[scoringHistory.length - 1];

    // Restore the previous state
    setPointNumber(lastState.pointNumber);
    setHomeScore(lastState.homeScore);
    setOpponentScore(lastState.opponentScore);
    setServingTeam(lastState.servingTeam);

    // ALWAYS reset to serving formation on undo
    setHomeFormationType('serving');
    setOpponentFormationType('serving');
    console.log('⏮️ Undo: Both teams → Serving formation');

    // Remove the last entry from history
    setScoringHistory(prev => prev.slice(0, -1));

    // Also remove the last point from point history (for trend display)
    setPointHistory(prev => prev.slice(0, -1));

    // Reset to serve phase
    setAttemptNumber(1);
    setIsServePhase(true);
    setActionType('serve');
    setCurrentPointAttempts([]);
    setSelectedPlayer(null);
    setSelectedTeam(null);
    setCurrentTrajectory(null);

    console.log(`⏪ Went back to Point ${lastState.pointNumber}, Score: ${lastState.homeScore}-${lastState.opponentScore}`);
  };

  /**
   * Clear selection and reset to player selection mode
   */
  const handleClear = () => {
    setCurrentTrajectory(null);
    setSelectedPlayer(null);
    setSelectedTeam(null);
    // Keep action type as-is (don't reset)
  };

  /**
   * Reselect player (keep current player, clear trajectory)
   */
  const handleReselectPlayer = () => {
    setCurrentTrajectory(null);
    setSelectedPlayer(null);
    setSelectedTeam(null);
    setActionType('attack');

    // Show serve selector again if we're still at the start (0-0, Point 1)
    if (pointNumber === 1 && homeScore === 0 && opponentScore === 0) {
      setFirstPlayerSelected(false);
    }
  };

  /**
   * Determine which side of the court should be disabled for drawing
   * Disabled side only shows when:
   * 1. A player is selected
   * 2. No trajectory has been started yet (user hasn't picked the starting point)
   *
   * Once user starts drawing (isDragging or currentTrajectory exists), the overlay disappears
   * because the ball can land on any side of the court.
   */
  const disabledSide: 'home' | 'opponent' | null = useMemo(() => {
    // No restriction if no player selected
    if (!selectedTeam) return null;

    // Once user starts drawing, remove the overlay (ball can cross to other side)
    if (isDragging || currentTrajectory) return null;

    // Before drawing starts: restrict the starting side
    // If opponent team selected, disable home side (they should start from opponent side)
    // If home team selected, disable opponent side (they should start from home side)
    return selectedTeam === 'opponent' ? 'home' : 'opponent';
  }, [selectedTeam, isDragging, currentTrajectory]);

  /**
   * Analyze current trajectory using coordinate calculations
   * Only calculate when trajectory exists and is not being dragged
   */
  const trajectoryAnalysis: TrajectoryAnalysis | null = useMemo(() => {
    if (!currentTrajectory || isDragging || !selectedTeam) return null;

    return analyzeTrajectory(
      currentTrajectory.startX,
      currentTrajectory.startY,
      currentTrajectory.endX,
      currentTrajectory.endY,
      selectedTeam,
      actionType,
      currentTrajectory.startInBounds,
      currentTrajectory.endInBounds
    );
  }, [currentTrajectory, isDragging, selectedTeam, actionType]);

  /**
   * Sync URL with current set number and reset libero swap state
   */
  useEffect(() => {
    const currentSetParam = searchParams.get('set');
    const expectedSetParam = currentSet.toString();

    // Only update URL if the set parameter is different
    if (currentSetParam !== expectedSetParam) {
      setSearchParams({ set: expectedSetParam }, { replace: true });
      console.log(`🔗 URL updated: set=${expectedSetParam}`);
    }

    // Reset libero swap state for new set
    setHomeLiberoSwapState({
      isActive: false,
      replacedRole: null,
      isManualLock: false
    });

    setOpponentLiberoSwapState({
      isActive: false,
      replacedRole: null,
      isManualLock: false
    });

    console.log(`🔄 Set ${currentSet}: Libero swap state reset`);
  }, [currentSet, searchParams, setSearchParams]);

  /**
   * Keyboard shortcut: Space bar for "In Play"
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only trigger if Space bar and we have a valid trajectory
      if (event.code === 'Space' && trajectoryAnalysis && selectedPlayer && currentTrajectory && selectedTeam) {
        event.preventDefault();
        handleSaveAttempt('in_play');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [trajectoryAnalysis, selectedPlayer, currentTrajectory, selectedTeam]);

  /**
   * Set end detection - Check if current set should end
   * Rules:
   * - First to 25 points wins (if ahead by 2+)
   * - Must win by 2 points
   * - No upper limit (can go to 26-24, 27-25, etc.)
   */
  useEffect(() => {
    // Only check if we have points scored
    if (homeScore === 0 && opponentScore === 0) return;

    const scoreDiff = Math.abs(homeScore - opponentScore);
    const maxScore = Math.max(homeScore, opponentScore);

    // Check if set should end
    if (maxScore >= 25 && scoreDiff >= 2) {
      const winner: 'home' | 'opponent' = homeScore > opponentScore ? 'home' : 'opponent';
      setSetWinner(winner);
      setSetEndModalOpen(true);
      console.log(`🏆 Set ${currentSet} ended! ${winner} wins ${homeScore}-${opponentScore}`);
    }
  }, [homeScore, opponentScore, currentSet]);

  /**
   * Handle set change with proper state reset
   */
  const handleSetChange = (setNum: number) => {
    // Warn if there's unsaved data (points recorded in current set)
    if (homeScore > 0 || opponentScore > 0 || pointHistory.length > 0) {
      const confirmed = window.confirm(
        `Changing sets will reset the current set's data. Continue?`
      );
      if (!confirmed) return;
    }

    // Update current set
    setCurrentSet(setNum);

    // Reset all game state for new set
    setHomeScore(0);
    setOpponentScore(0);
    setPointNumber(1);
    setAttemptNumber(1);
    setIsServePhase(true);
    setFirstPlayerSelected(false);

    // Clear point tracking
    setCurrentPointAttempts([]);
    setPointHistory([]);
    setScoringHistory([]);

    // Reset player selection
    setSelectedPlayer(null);
    setSelectedTeam(null);
    setCurrentTrajectory(null);

    // Reset action type to serve for new set
    setActionType('serve');

    // Reset formation to serving at start of new set
    setHomeFormationType('serving');
    setOpponentFormationType('serving');
    console.log(`🔄 Set ${setNum}: Both teams → Serving formation`);

    // Note: servingTeam is NOT reset - it should be set explicitly by user
    // or loaded from previous set data when that's implemented

    console.log(`Set changed to Set ${setNum} - All state reset`);
  };

  /**
   * Handle continuing to next set after set ends
   */
  const handleContinueToNextSet = () => {
    // Close the modal
    setSetEndModalOpen(false);

    // Move to next set if not already at set 5
    if (currentSet < 5) {
      const nextSet = currentSet + 1;
      setCurrentSet(nextSet);
      console.log(`📋 Moving to Set ${nextSet}`);
    } else {
      console.log('🏆 Match completed! All 5 sets played.');
    }

    // Reset game state for new set
    setHomeScore(0);
    setOpponentScore(0);
    setPointNumber(1);
    setAttemptNumber(1);
    setIsServePhase(true);
    setFirstPlayerSelected(false);

    // Clear point tracking
    setCurrentPointAttempts([]);
    setPointHistory([]);
    setScoringHistory([]);

    // Reset formation to serving at start of new set
    setHomeFormationType('serving');
    setOpponentFormationType('serving');
    console.log(`🔄 New set started: Both teams → Serving formation`);

    // Reset player selection
    setSelectedPlayer(null);
    setSelectedTeam(null);
    setCurrentTrajectory(null);

    // Reset action type to serve for new set
    setActionType('serve');

    // Reset set winner
    setSetWinner(null);
  };

  /**
   * Handle finishing the match after set ends
   */
  const handleFinishMatch = () => {
    // Close the modal
    setSetEndModalOpen(false);

    // Navigate back to stats page
    navigate(`/in-game-stats/${matchId}`);

    console.log('🏁 Match finished! Navigating back to stats page.');
  };

  return (
    <div className="visual-tracking-page">
      {/* Main Content - 2 Column Grid */}
      <div className="visual-tracking-content">
        {/* Left Column: Volleyball Court */}
        <div className="court-section">
          <VolleyballCourt
            svgRef={svgRef}
            isDrawing={isDragging}
            disabledSide={disabledSide}
            servingTeam={servingTeam}
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
          >
            {/* Render home team players - Always show, with selection/fade states */}
            {Object.values(getCurrentLineup('home')).map((player) => {
              if (!player) return null;
              const position = getPositionCoordinates('home', player.position);

              // Determine visual state
              const isThisPlayerSelected = selectedPlayer?.playerId === player.playerId && selectedTeam === 'home';
              const shouldFade = selectedPlayer !== null && !isThisPlayerSelected;

              // Use unique key combining playerId and position to prevent duplicates
              const uniqueKey = `home-${player.playerId}-${player.position}`;

              return (
                <PlayerMarker
                  key={uniqueKey}
                  playerId={player.playerId}
                  jerseyNumber={player.jerseyNumber}
                  playerName={player.playerName}
                  team="home"
                  isLibero={player.isLibero}
                  x={position.x}
                  y={position.y}
                  isSelected={isThisPlayerSelected}
                  isFaded={shouldFade}
                  onClick={(id) => handlePlayerClick(id, 'home')}
                />
              );
            })}

            {/* Render opponent team players - Always show, with selection/fade states */}
            {Object.values(getCurrentLineup('opponent')).map((player) => {
              if (!player) return null;
              const position = getPositionCoordinates('opponent', player.position);

              // Determine visual state
              const isThisPlayerSelected = selectedPlayer?.playerId === player.playerId && selectedTeam === 'opponent';
              const shouldFade = selectedPlayer !== null && !isThisPlayerSelected;

              // Use unique key combining playerId and position to prevent duplicates
              const uniqueKey = `opponent-${player.playerId}-${player.position}`;

              return (
                <PlayerMarker
                  key={uniqueKey}
                  playerId={player.playerId}
                  jerseyNumber={player.jerseyNumber}
                  playerName={player.playerName}
                  team="opponent"
                  isLibero={player.isLibero}
                  x={position.x}
                  y={position.y}
                  isSelected={isThisPlayerSelected}
                  isFaded={shouldFade}
                  onClick={(id) => handlePlayerClick(id, 'opponent')}
                />
              );
            })}

            {/* Render the trajectory arrow if exists */}
            {currentTrajectory && (
              <TrajectoryArrow
                startX={currentTrajectory.startX}
                startY={currentTrajectory.startY}
                endX={currentTrajectory.endX}
                endY={currentTrajectory.endY}
                startInBounds={currentTrajectory.startInBounds}
                endInBounds={currentTrajectory.endInBounds}
                isDragging={isDragging}
              />
            )}
          </VolleyballCourt>
        </div>

        {/* Right Column: 3 Sectors */}
        <div className="panel-section">
          {/* TOP SECTOR (40%): Scoreboard + Stats */}
          <div className="stats-panel" style={{ position: 'relative' }}>
            {/* Set Tabs with Settings Button */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
              borderBottom: '2px solid #e5e7eb',
              paddingBottom: '8px'
            }}>
              {/* Set Tab Buttons */}
              <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
                {[1, 2, 3, 4, 5].map((setNum) => (
                  <button
                    key={setNum}
                    onClick={() => handleSetChange(setNum)}
                    style={{
                      flex: 1,
                      padding: '8px 4px',
                      fontSize: '13px',
                      fontWeight: '700',
                      background: currentSet === setNum ? '#7c3aed' : '#f3f4f6',
                      color: currentSet === setNum ? 'white' : '#666',
                      border: currentSet === setNum ? '2px solid #5b21b6' : '2px solid #e5e7eb',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => {
                      if (currentSet !== setNum) {
                        e.currentTarget.style.background = '#e5e7eb';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (currentSet !== setNum) {
                        e.currentTarget.style.background = '#f3f4f6';
                      }
                    }}
                  >
                    Set {setNum}
                  </button>
                ))}
              </div>

              {/* Player Stats Button */}
              <button
                onClick={() => setStatsModalOpen(true)}
                style={{
                  width: '32px',
                  height: '32px',
                  border: '2px solid #d1d5db',
                  borderRadius: '6px',
                  background: 'white',
                  fontSize: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Player Location Stats"
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#f3f4f6';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'white';
                }}
              >
                📊
              </button>

              {/* Settings Dropdown Button */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setSettingsDropdownOpen(!settingsDropdownOpen)}
                  style={{
                    width: '32px',
                    height: '32px',
                    border: '2px solid #d1d5db',
                    borderRadius: '6px',
                    background: settingsDropdownOpen ? '#e5e7eb' : 'white',
                    fontSize: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Settings & Info"
                  onMouseOver={(e) => {
                    if (!settingsDropdownOpen) {
                      e.currentTarget.style.background = '#f3f4f6';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!settingsDropdownOpen) {
                      e.currentTarget.style.background = 'white';
                    }
                  }}
                >
                  ⚙️
                </button>

                {/* Settings Dropdown Menu */}
                {settingsDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '38px',
                      right: 0,
                      background: 'white',
                      border: '2px solid #d1d5db',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                      zIndex: 1000,
                      minWidth: '180px',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Debug Info Option */}
                    <button
                      onClick={() => {
                        setShowDebugInfo(!showDebugInfo);
                        setSettingsDropdownOpen(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: 'none',
                        background: 'white',
                        textAlign: 'left',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = '#f3f4f6'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                    >
                      <span>{showDebugInfo ? '✅' : '⬜'}</span>
                      <span>🐛 Debug Info</span>
                    </button>

                    {/* Match Info Option */}
                    <button
                      onClick={() => {
                        setMatchInfoModalOpen(true);
                        setSettingsDropdownOpen(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: 'none',
                        borderTop: '1px solid #e5e7eb',
                        background: 'white',
                        textAlign: 'left',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = '#f3f4f6'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                    >
                      <span>📊 Match Info & Summary</span>
                    </button>

                    {/* Rotation Configuration Option */}
                    {rotationEnabled && (
                      <button
                        onClick={() => {
                          setRotationConfigModalOpen(true);
                          setSettingsDropdownOpen(false);
                        }}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: 'none',
                          borderTop: '1px solid #e5e7eb',
                          background: 'white',
                          textAlign: 'left',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'background 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#f3f4f6'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                      >
                        <span>🔧 Rotation Config</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Sync Status Indicator */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '500',
                  background: syncStatus === 'synced' ? '#dcfce7' :
                             syncStatus === 'syncing' ? '#fef9c3' :
                             syncStatus === 'offline' ? '#fee2e2' :
                             '#fee2e2',
                  color: syncStatus === 'synced' ? '#166534' :
                         syncStatus === 'syncing' ? '#854d0e' :
                         syncStatus === 'offline' ? '#991b1b' :
                         '#991b1b'
                }}
                title={
                  syncStatus === 'synced' ? 'All data saved to cloud' :
                  syncStatus === 'syncing' ? 'Saving...' :
                  syncStatus === 'offline' ? 'Offline - data saved locally' :
                  'Error saving - will retry'
                }
              >
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: syncStatus === 'synced' ? '#22c55e' :
                             syncStatus === 'syncing' ? '#eab308' :
                             syncStatus === 'offline' ? '#f87171' :
                             '#ef4444',
                  animation: syncStatus === 'syncing' ? 'pulse 1.5s infinite' : 'none'
                }} />
                <span>
                  {syncStatus === 'synced' ? 'Saved' :
                   syncStatus === 'syncing' ? 'Saving...' :
                   syncStatus === 'offline' ? 'Offline' :
                   'Error'}
                </span>
              </div>
            </div>

            {/* First Serve Selector - Show only before first player selected */}
            {!firstPlayerSelected && (
              <div style={{
                padding: '12px',
                background: '#fef3c7',
                border: '2px solid #f59e0b',
                borderRadius: '8px',
                marginBottom: '12px'
              }}>
                <div style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#92400e',
                  marginBottom: '8px',
                  textAlign: 'center'
                }}>
                  Who serves first?
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px'
                }}>
                  <button
                    onClick={() => setServingTeam('home')}
                    style={{
                      padding: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      background: servingTeam === 'home' ? '#7c3aed' : '#f3f4f6',
                      color: servingTeam === 'home' ? 'white' : '#333',
                      border: servingTeam === 'home' ? '2px solid #5b21b6' : '2px solid #d1d5db',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    🏠 Home
                  </button>
                  <button
                    onClick={() => setServingTeam('opponent')}
                    style={{
                      padding: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      background: servingTeam === 'opponent' ? '#ef4444' : '#f3f4f6',
                      color: servingTeam === 'opponent' ? 'white' : '#333',
                      border: servingTeam === 'opponent' ? '2px solid #dc2626' : '2px solid #d1d5db',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    🏐 Opponent
                  </button>
                </div>
              </div>
            )}

            {/* Scoreboard Section */}
            {/* Scoreboard + All Controls - Single Row with Better Spacing */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: rotationEnabled && homeRotationConfig && opponentRotationConfig
                ? 'auto 1fr 1fr auto auto'
                : 'auto',
              gap: '12px',
              alignItems: 'center',
              padding: '10px 12px',
              background: '#f9fafb',
              borderRadius: '8px'
            }}>
              {/* Scoreboard Section */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', background: 'white', padding: '6px 8px', borderRadius: '6px', border: '2px solid #e5e7eb' }}>
                <button
                  onClick={() => {
                    setScoringTeam('home');
                    setScoringModalOpen(true);
                  }}
                  style={{
                    background: '#7c3aed',
                    color: 'white',
                    padding: '6px 12px',
                    borderRadius: '5px',
                    textAlign: 'center',
                    border: 'none',
                    cursor: 'pointer',
                    minWidth: '60px'
                  }}
                >
                  <div style={{ fontSize: '9px', fontWeight: '500', opacity: 0.9, marginBottom: '2px' }}>
                    {servingTeam === 'home' ? '● HOME' : 'HOME'}
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '700' }}>{homeScore}</div>
                </button>

                <button
                  onClick={handleGoBack}
                  disabled={scoringHistory.length === 0}
                  style={{
                    padding: '6px 10px',
                    fontSize: '16px',
                    background: scoringHistory.length === 0 ? '#e5e7eb' : '#f3f4f6',
                    border: '2px solid #d1d5db',
                    borderRadius: '5px',
                    cursor: scoringHistory.length === 0 ? 'not-allowed' : 'pointer',
                    opacity: scoringHistory.length === 0 ? 0.5 : 1
                  }}
                  title="Undo last point"
                >
                  ⏪
                </button>

                <button
                  onClick={() => {
                    setScoringTeam('opponent');
                    setScoringModalOpen(true);
                  }}
                  style={{
                    background: '#ef4444',
                    color: 'white',
                    padding: '6px 12px',
                    borderRadius: '5px',
                    textAlign: 'center',
                    border: 'none',
                    cursor: 'pointer',
                    minWidth: '60px'
                  }}
                >
                  <div style={{ fontSize: '9px', fontWeight: '500', opacity: 0.9, marginBottom: '2px' }}>
                    {servingTeam === 'opponent' ? '● OPP' : 'OPP'}
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '700' }}>{opponentScore}</div>
                </button>
              </div>

              {/* Rotation & Formation Controls */}
              {rotationEnabled && homeRotationConfig && opponentRotationConfig && (
                <>
                  {/* Home Rotation */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    background: '#ede9fe',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '2px solid #c4b5fd'
                  }}>
                    <div style={{ fontSize: '10px', fontWeight: '700', color: '#5b21b6', textAlign: 'center' }}>
                      HOME ROT {homeRotationConfig.currentRotation}
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => handleManualRotateBackward('home')}
                        style={{
                          flex: 1,
                          padding: '6px 8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          background: 'white',
                          border: '2px solid #d1d5db',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                        title="Rotate backward"
                      >
                        ↶
                      </button>
                      <button
                        onClick={() => handleManualRotateForward('home')}
                        style={{
                          flex: 1,
                          padding: '6px 8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          background: '#7c3aed',
                          color: 'white',
                          border: '2px solid #5b21b6',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                        title="Rotate forward"
                      >
                        ↷
                      </button>
                    </div>
                  </div>

                  {/* Opponent Rotation */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    background: '#fee2e2',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '2px solid #fecaca'
                  }}>
                    <div style={{ fontSize: '10px', fontWeight: '700', color: '#991b1b', textAlign: 'center' }}>
                      OPP ROT {opponentRotationConfig.currentRotation}
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => handleManualRotateBackward('opponent')}
                        style={{
                          flex: 1,
                          padding: '6px 8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          background: 'white',
                          border: '2px solid #d1d5db',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                        title="Rotate backward"
                      >
                        ↶
                      </button>
                      <button
                        onClick={() => handleManualRotateForward('opponent')}
                        style={{
                          flex: 1,
                          padding: '6px 8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          background: '#ef4444',
                          color: 'white',
                          border: '2px solid #dc2626',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                        title="Rotate forward"
                      >
                        ↷
                      </button>
                    </div>
                  </div>

                  {/* Home Formation */}
                  <button
                    onClick={() => handleFormationToggle('home', homeFormationType === 'serving' ? 'rally' : 'serving')}
                    style={{
                      padding: '8px 14px',
                      fontSize: '11px',
                      fontWeight: '700',
                      background: homeFormationType === 'serving' ? '#7c3aed' : '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      minWidth: '85px'
                    }}
                    title={`Home: ${homeFormationType} formation`}
                  >
                    <div style={{ fontSize: '9px', opacity: 0.9 }}>HOME</div>
                    <div>{homeFormationType === 'serving' ? 'SERVE' : 'RALLY'}</div>
                  </button>

                  {/* Opponent Formation */}
                  <button
                    onClick={() => handleFormationToggle('opponent', opponentFormationType === 'serving' ? 'rally' : 'serving')}
                    style={{
                      padding: '8px 14px',
                      fontSize: '11px',
                      fontWeight: '700',
                      background: opponentFormationType === 'serving' ? '#ef4444' : '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      minWidth: '85px'
                    }}
                    title={`Opponent: ${opponentFormationType} formation`}
                  >
                    <div style={{ fontSize: '9px', opacity: 0.9 }}>OPP</div>
                    <div>{opponentFormationType === 'serving' ? 'SERVE' : 'RALLY'}</div>
                  </button>
                </>
              )}
            </div>

            {/* Point Trend Display - Last 5 Points */}
            {pointHistory.length > 0 && (
              <div style={{
                marginTop: '20px',
                background: '#ffffff',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                {/* Header with View All button */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: '#f9fafb',
                  borderBottom: '2px solid #e5e7eb'
                }}>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#333' }}>
                    📊 Recent Points
                  </h4>
                  <button
                    onClick={() => setFullHistoryModalOpen(true)}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      background: '#7c3aed',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    View All
                  </button>
                </div>

                {/* Column Headers */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '80px 1fr 1fr',
                  gap: '8px',
                  padding: '8px 12px',
                  background: '#f3f4f6',
                  borderBottom: '1px solid #e5e7eb',
                  fontSize: '11px',
                  fontWeight: '700',
                  color: '#666',
                  textTransform: 'uppercase'
                }}>
                  <div>Score</div>
                  <div>Home</div>
                  <div>Opponent</div>
                </div>

                {/* Point Rows - Last 5 points */}
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {pointHistory.slice(-5).reverse().map((point, index) => {
                    // Format home action
                    const homeAction = point.winningTeam === 'home' && point.team === 'home'
                      ? `${formatPlayerDisplay(point.playerId, 'home')} ${
                          point.actionType === 'error' ? '❌ Error' :
                          point.actionType === 'serve' ? '🎯 Ace' :
                          point.actionType === 'attack' ? '⚡ Kill' :
                          point.actionType === 'block' ? '🛡️ Block' :
                          '✅ Point'
                        }`
                      : point.winningTeam === 'home' && point.team === 'opponent'
                      ? `${formatPlayerDisplay(point.playerId, 'opponent')} ❌ Error`
                      : '';

                    // Format opponent action
                    const opponentAction = point.winningTeam === 'opponent' && point.team === 'opponent'
                      ? `${formatPlayerDisplay(point.playerId, 'opponent')} ${
                          point.actionType === 'error' ? '❌ Error' :
                          point.actionType === 'serve' ? '🎯 Ace' :
                          point.actionType === 'attack' ? '⚡ Kill' :
                          point.actionType === 'block' ? '🛡️ Block' :
                          '✅ Point'
                        }`
                      : point.winningTeam === 'opponent' && point.team === 'home'
                      ? `${formatPlayerDisplay(point.playerId, 'home')} ❌ Error`
                      : '';

                    // Determine styling based on action type
                    const homeColor = point.winningTeam === 'home' && point.team === 'home'
                      ? '#10b981' // Green for home scoring
                      : point.winningTeam === 'home' && point.team === 'opponent'
                      ? '#ef4444' // Red for opponent error
                      : '#e5e7eb';

                    const opponentColor = point.winningTeam === 'opponent' && point.team === 'opponent'
                      ? '#10b981' // Green for opponent scoring
                      : point.winningTeam === 'opponent' && point.team === 'home'
                      ? '#ef4444' // Red for home error
                      : '#e5e7eb';

                    return (
                      <div
                        key={`point-${point.pointNumber}-${index}`}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '80px 1fr 1fr',
                          gap: '8px',
                          padding: '10px 12px',
                          borderBottom: '1px solid #f3f4f6',
                          fontSize: '13px'
                        }}
                      >
                        <div style={{ fontWeight: '700', color: '#666' }}>
                          {point.homeScore} - {point.opponentScore}
                        </div>
                        <div style={{
                          color: homeAction ? '#333' : '#d1d5db',
                          fontWeight: homeAction ? '600' : '400',
                          background: homeAction ? `${homeColor}15` : 'transparent',
                          padding: homeAction ? '4px 8px' : '0',
                          borderRadius: '4px',
                          borderLeft: homeAction ? `3px solid ${homeColor}` : 'none'
                        }}>
                          {homeAction || '—'}
                        </div>
                        <div style={{
                          color: opponentAction ? '#333' : '#d1d5db',
                          fontWeight: opponentAction ? '600' : '400',
                          background: opponentAction ? `${opponentColor}15` : 'transparent',
                          padding: opponentAction ? '4px 8px' : '0',
                          borderRadius: '4px',
                          borderLeft: opponentAction ? `3px solid ${opponentColor}` : 'none'
                        }}>
                          {opponentAction || '—'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* MIDDLE SECTOR (15%): Action Bar */}
          <div className="action-bar">
            {/* Selected Player Button */}
            {selectedPlayer ? (
              <button
                onClick={handleReselectPlayer}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  fontSize: '18px',
                  fontWeight: '700',
                  background: selectedTeam === 'home' ? '#7c3aed' : '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  minWidth: '120px',
                  justifyContent: 'center'
                }}
              >
                <span>←</span>
                <span>#{selectedPlayer.jerseyNumber}</span>
              </button>
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px 16px',
                fontSize: '14px',
                color: '#999',
                background: '#f3f4f6',
                borderRadius: '6px',
                minWidth: '120px',
                justifyContent: 'center'
              }}>
                No Player
              </div>
            )}

            {/* Action Type Buttons - Show only in rally phase */}
            {!isServePhase && selectedPlayer && (
              <div style={{
                display: 'flex',
                gap: '8px',
                flex: 1
              }}>
                <button
                  onClick={() => setActionType('attack')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    fontSize: '14px',
                    fontWeight: '600',
                    border: actionType === 'attack' ? '3px solid #059669' : '2px solid #e5e7eb',
                    background: actionType === 'attack' ? '#059669' : 'white',
                    color: actionType === 'attack' ? 'white' : '#333',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  ⚡ Hit
                </button>
                <button
                  onClick={() => setActionType('block')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    fontSize: '14px',
                    fontWeight: '600',
                    border: actionType === 'block' ? '3px solid #7c3aed' : '2px solid #e5e7eb',
                    background: actionType === 'block' ? '#7c3aed' : 'white',
                    color: actionType === 'block' ? 'white' : '#333',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  🛡️ Block
                </button>
                <button
                  onClick={() => setActionType('dig')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    fontSize: '14px',
                    fontWeight: '600',
                    border: actionType === 'dig' ? '3px solid #0891b2' : '2px solid #e5e7eb',
                    background: actionType === 'dig' ? '#0891b2' : 'white',
                    color: actionType === 'dig' ? 'white' : '#333',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  💪 Dig
                </button>
                <button
                  onClick={() => {
                    // Quick error - no trajectory needed
                    if (!selectedPlayer || !selectedTeam) return;

                    // Point ended - switch BOTH teams back to serving formation
                    setHomeFormationType('serving');
                    setOpponentFormationType('serving');
                    console.log('🏐 Both teams → Serving formation (point ended via error button)');

                    // Save to scoring history
                    setScoringHistory(prev => [...prev, {
                      pointNumber,
                      homeScore,
                      opponentScore,
                      servingTeam
                    }]);

                    // Determine winner (error means other team wins)
                    const pointWinner: 'home' | 'opponent' = selectedTeam === 'home' ? 'opponent' : 'home';

                    // Update scores
                    if (pointWinner === 'home') {
                      setHomeScore(prev => prev + 1);
                    } else {
                      setOpponentScore(prev => prev + 1);
                    }

                    // Calculate new scores for point history
                    const newHomeScore = pointWinner === 'home' ? homeScore + 1 : homeScore;
                    const newOpponentScore = pointWinner === 'opponent' ? opponentScore + 1 : opponentScore;

                    // Add to point history
                    setPointHistory(prev => [...prev, {
                      pointNumber,
                      homeScore: newHomeScore,
                      opponentScore: newOpponentScore,
                      winningTeam: pointWinner,
                      actionType: 'error',
                      playerId: selectedPlayer.playerId,
                      team: selectedTeam
                    }]);

                    // Update serving team
                    setServingTeam(pointWinner);

                    // Start new point
                    setPointNumber(prev => prev + 1);
                    setAttemptNumber(1);
                    setIsServePhase(true);
                    setActionType('serve');
                    setCurrentPointAttempts([]);
                    setSelectedPlayer(null);
                    setSelectedTeam(null);

                    console.log(`❌ ${selectedTeam} Error - Point to ${pointWinner}`);
                  }}
                  style={{
                    flex: 1,
                    padding: '10px',
                    fontSize: '14px',
                    fontWeight: '600',
                    border: '2px solid #e5e7eb',
                    background: '#ef4444',
                    color: 'white',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  ❌ Error
                </button>
              </div>
            )}

            {/* Libero Swap Button - Show when player selected and rotation enabled */}
            {selectedPlayer && rotationEnabled && (() => {
              const team = selectedTeam!;
              const config = team === 'home' ? homeRotationConfig : opponentRotationConfig;
              const swapState = team === 'home' ? homeLiberoSwapState : opponentLiberoSwapState;

              console.log('🔍 Libero button check:', {
                hasConfig: !!config,
                hasLibero: !!config?.libero,
                selectedPlayer: selectedPlayer?.jerseyNumber,
                position: selectedPlayer?.position,
                isLibero: selectedPlayer?.isLibero,
                roleInSystem: selectedPlayer?.roleInSystem,
                liberoReplacementTargets: config?.liberoReplacementTargets,
                swapState
              });

              if (!config || !config.libero) {
                console.log('❌ No config or libero - button hidden');
                return null;
              }

              const isBackRow = ['P1', 'P5', 'P6'].includes(selectedPlayer.position);

              // Check if libero is actually on the court (in back row positions)
              const lineup = team === 'home' ? homeLineup : opponentLineup;
              const liberoOnCourt = Object.values(lineup).some(p =>
                p && p.isLibero && ['P1', 'P5', 'P6'].includes(p.position)
              );

              console.log('🔍 Button state:', { isBackRow, swapActive: swapState.isActive, liberoOnCourt });

              // Case 1: Libero is selected
              if (selectedPlayer.isLibero) {
                console.log('✅ Showing Swap OUT button');

                return (
                  <button
                    onClick={() => handleLiberoSwapOut(team)}
                    disabled={!isBackRow}
                    style={{
                      padding: '10px 16px',
                      fontSize: '14px',
                      fontWeight: '600',
                      borderRadius: '6px',
                      border: '2px solid',
                      cursor: isBackRow ? 'pointer' : 'not-allowed',
                      opacity: isBackRow ? 1 : 0.5,
                      minWidth: '140px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      background: isBackRow ? '#f59e0b' : '#f3f4f6',
                      color: isBackRow ? 'white' : '#9ca3af',
                      borderColor: isBackRow ? '#f59e0b' : '#d1d5db',
                      transition: 'all 0.2s'
                    }}
                  >
                    <span>🔄</span>
                    <span>Swap OUT</span>
                  </button>
                );
              }

              // Case 2: ANY back row player selected, libero NOT on back row
              if (isBackRow && !liberoOnCourt) {
                console.log('✅ Showing Swap IN button (libero not on back row)');
                return (
                  <button
                    onClick={() => handleLiberoSwapIn(team)}
                    style={{
                      padding: '10px 16px',
                      fontSize: '14px',
                      fontWeight: '600',
                      borderRadius: '6px',
                      border: '2px solid',
                      cursor: 'pointer',
                      minWidth: '140px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      background: '#10b981',
                      color: 'white',
                      borderColor: '#10b981',
                      transition: 'all 0.2s'
                    }}
                  >
                    <span>🔄</span>
                    <span>Swap IN</span>
                  </button>
                );
              }

              // Case 3: Front row player - show disabled button for feedback
              if (!isBackRow) {
                console.log('⚪ Showing disabled button (front row)');
                return (
                  <button
                    disabled
                    style={{
                      padding: '10px 16px',
                      fontSize: '14px',
                      fontWeight: '600',
                      borderRadius: '6px',
                      border: '2px solid #d1d5db',
                      cursor: 'not-allowed',
                      opacity: 0.5,
                      minWidth: '140px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      background: '#f3f4f6',
                      color: '#9ca3af'
                    }}
                  >
                    <span>🔄</span>
                    <span>Libero Swap</span>
                  </button>
                );
              }

              console.log('❌ No button condition met - button hidden');
              return null;
            })()}

            {/* Serve indicator during serve phase */}
            {isServePhase && selectedPlayer && (
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                fontWeight: '600',
                color: '#92400e',
                background: '#fef3c7',
                borderRadius: '6px',
                padding: '10px',
                border: '2px solid #f59e0b'
              }}>
                🏐 SERVE PHASE
              </div>
            )}

            {/* Instructions - Show when no player or no trajectory */}
            {!selectedPlayer && (
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                color: '#999',
                background: '#f9fafb',
                borderRadius: '6px',
                padding: '10px',
                border: '2px dashed #d1d5db'
              }}>
                👆 Click a player on the court to begin
              </div>
            )}
            {selectedPlayer && !currentTrajectory && !isServePhase && (
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                color: '#999',
                background: '#f9fafb',
                borderRadius: '6px',
                padding: '10px',
                border: '2px dashed #d1d5db'
              }}>
                ✏️ Draw a trajectory on the court
              </div>
            )}
          </div>

          {/* BOTTOM SECTOR (45%): Result Buttons + Hit Zones */}
          <div className="controls-panel">
            {trajectoryAnalysis ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', height: '100%' }}>
                {/* Left: Result Buttons (Vertical Stack) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#666' }}>
                    📝 Result
                  </h3>
                  {getResultButtons().map((btn) => (
                    <button
                      key={btn.result}
                      onClick={() => handleSaveAttempt(btn.result)}
                      style={{
                        flex: getResultButtons().length === 2 && btn.result === 'error' ? 2 : 1,
                        padding: '16px',
                        fontSize: '16px',
                        fontWeight: '700',
                        border: `3px solid ${btn.color}`,
                        background: btn.color,
                        color: 'white',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.opacity = '0.85';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.opacity = '1';
                      }}
                    >
                      {btn.label}
                    </button>
                  ))}
                  <p style={{ fontSize: '11px', color: '#999', textAlign: 'center', marginTop: 'auto' }}>
                    💡 Press Space for "In Play"
                  </p>
                </div>

                {/* Right: Hit Zone Grid (3x3) - Only show for attacks */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#666' }}>
                    🎯 Hit Zone
                  </h3>
                  {actionType === 'attack' ? (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gridTemplateRows: 'repeat(3, 1fr)',
                      gap: '8px',
                      flex: 1
                    }}>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((zone) => {
                        const row = Math.floor((zone - 1) / 3);
                        const col = (zone - 1) % 3;
                        const isSelected = trajectoryAnalysis.gridCell.row === row && trajectoryAnalysis.gridCell.col === col;

                        return (
                          <button
                            key={zone}
                            style={{
                              padding: '12px',
                              fontSize: '18px',
                              fontWeight: '700',
                              background: isSelected ? '#7c3aed' : '#f3f4f6',
                              color: isSelected ? 'white' : '#666',
                              border: isSelected ? '3px solid #5b21b6' : '2px solid #d1d5db',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.background = '#e5e7eb';
                              }
                            }}
                            onMouseOut={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.background = '#f3f4f6';
                              }
                            }}
                          >
                            {zone}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#f9fafb',
                      borderRadius: '8px',
                      color: '#999',
                      fontSize: '14px',
                      border: '2px dashed #d1d5db'
                    }}>
                      Hit zones available for attacks only
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#999'
              }}>
                <p style={{ fontSize: '16px', marginBottom: '8px' }}>Draw a trajectory to see result buttons</p>
                <p style={{ fontSize: '12px' }}>Select a player and draw on the court</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Portrait Orientation Warning */}
      <div className="orientation-warning">
        <div className="warning-content">
          <h2>📱 Please Rotate Device</h2>
          <p>Visual tracking requires landscape orientation</p>
          <div className="rotate-icon">⤾</div>
        </div>
      </div>

      {/* Quick Scoring Modal */}
      {scoringModalOpen && scoringTeam && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => {
            setScoringModalOpen(false);
            setScoringTeam(null);
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#333' }}>
                Quick Score: {scoringTeam === 'home' ? 'Home' : 'Opponent'}
              </h3>
              <button
                onClick={() => {
                  setScoringModalOpen(false);
                  setScoringTeam(null);
                }}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '2px solid #d1d5db',
                  background: '#f3f4f6',
                  color: '#666',
                  fontSize: '18px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>

            {/* Show either error type selection or player selection */}
            {!scoringOption ? (
              <>
                <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
                  Select a scoring option to award a point:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Team Error Option */}
                  <button
                    onClick={() => setScoringOption('team_error')}
                    style={{
                      padding: '16px',
                      fontSize: '16px',
                      fontWeight: '700',
                      background: '#ef4444',
                      color: 'white',
                      border: '3px solid #dc2626',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'left'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'scale(1.02)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ fontSize: '18px', marginBottom: '4px' }}>❌ {scoringTeam === 'home' ? 'Home' : 'Opponent'} Error</div>
                    <div style={{ fontSize: '12px', opacity: 0.9 }}>
                      Point to {scoringTeam === 'home' ? 'Opponent' : 'Home'}
                    </div>
                  </button>

                  {/* Opponent Error Option */}
                  <button
                    onClick={() => setScoringOption('opponent_error')}
                    style={{
                      padding: '16px',
                      fontSize: '16px',
                      fontWeight: '700',
                      background: '#10b981',
                      color: 'white',
                      border: '3px solid #059669',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'left'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'scale(1.02)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ fontSize: '18px', marginBottom: '4px' }}>✅ {scoringTeam === 'home' ? 'Opponent' : 'Home'} Error</div>
                    <div style={{ fontSize: '12px', opacity: 0.9 }}>
                      Point to {scoringTeam === 'home' ? 'Home' : 'Opponent'}
                    </div>
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Player Selection Step */}
                <button
                  onClick={() => setScoringOption(null)}
                  style={{
                    padding: '8px 12px',
                    fontSize: '14px',
                    background: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    marginBottom: '16px'
                  }}
                >
                  ← Back
                </button>

                <p style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
                  {scoringOption === 'team_error'
                    ? `Which ${scoringTeam} player made the error?`
                    : `Which ${scoringTeam === 'home' ? 'Opponent' : 'Home'} player made the error?`
                  }
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                  {(() => {
                    // Determine which roster to show based on scoring option
                    const errorTeam = scoringOption === 'team_error' ? scoringTeam : (scoringTeam === 'home' ? 'opponent' : 'home');
                    const roster = errorTeam === 'home' ? homeRoster : opponentRoster;

                    return roster.map((player) => (
                      <button
                        key={player.Id}
                        onClick={() => handleQuickScore(scoringOption, player.Id)}
                        style={{
                          padding: '12px 8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          background: '#ffffff',
                          border: '2px solid #e5e7eb',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          textAlign: 'center'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = '#f3f4f6';
                          e.currentTarget.style.borderColor = '#7c3aed';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = '#ffffff';
                          e.currentTarget.style.borderColor = '#e5e7eb';
                        }}
                      >
                        <div style={{ fontSize: '18px', marginBottom: '4px' }}>#{player.jerseyNumber}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>{player.name}</div>
                      </button>
                    ));
                  })()}
                </div>
              </>
            )}
          </div>
        </div>
      )}


      {/* Full History Modal */}
      {fullHistoryModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setFullHistoryModalOpen(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '900px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              borderBottom: '2px solid #e5e7eb',
              paddingBottom: '12px'
            }}>
              <h3 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#333' }}>
                📊 Full Point History
              </h3>
              <button
                onClick={() => setFullHistoryModalOpen(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '2px solid #d1d5db',
                  background: '#f3f4f6',
                  color: '#666',
                  fontSize: '18px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>

            {pointHistory.length === 0 ? (
              <div style={{
                padding: '40px',
                textAlign: 'center',
                color: '#999'
              }}>
                <p style={{ fontSize: '16px', margin: 0 }}>No points recorded yet. Start playing to see history!</p>
              </div>
            ) : (
              <>
                <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
                  Showing all {pointHistory.length} point{pointHistory.length !== 1 ? 's' : ''} in chronological order (newest first).
                </p>

                {/* Column Headers */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '80px 1fr 1fr',
                  gap: '12px',
                  padding: '12px 16px',
                  background: '#f3f4f6',
                  borderRadius: '8px 8px 0 0',
                  fontSize: '12px',
                  fontWeight: '700',
                  color: '#666',
                  textTransform: 'uppercase',
                  borderBottom: '2px solid #e5e7eb'
                }}>
                  <div>Score</div>
                  <div>Home Team Action</div>
                  <div>Opponent Team Action</div>
                </div>

                {/* Scrollable Point List */}
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0 0 8px 8px'
                }}>
                  {pointHistory.slice().reverse().map((point, index) => {
                    // Format home action
                    const homeAction = point.winningTeam === 'home' && point.team === 'home'
                      ? `${formatPlayerDisplay(point.playerId, 'home')} ${
                          point.actionType === 'error' ? '❌ Error' :
                          point.actionType === 'serve' ? '🎯 Ace' :
                          point.actionType === 'attack' ? '⚡ Kill' :
                          point.actionType === 'block' ? '🛡️ Block' :
                          '✅ Point'
                        }`
                      : point.winningTeam === 'home' && point.team === 'opponent'
                      ? `${formatPlayerDisplay(point.playerId, 'opponent')} ❌ Error`
                      : '';

                    // Format opponent action
                    const opponentAction = point.winningTeam === 'opponent' && point.team === 'opponent'
                      ? `${formatPlayerDisplay(point.playerId, 'opponent')} ${
                          point.actionType === 'error' ? '❌ Error' :
                          point.actionType === 'serve' ? '🎯 Ace' :
                          point.actionType === 'attack' ? '⚡ Kill' :
                          point.actionType === 'block' ? '🛡️ Block' :
                          '✅ Point'
                        }`
                      : point.winningTeam === 'opponent' && point.team === 'home'
                      ? `${formatPlayerDisplay(point.playerId, 'home')} ❌ Error`
                      : '';

                    // Determine styling based on action type
                    const homeColor = point.winningTeam === 'home' && point.team === 'home'
                      ? '#10b981' // Green for home scoring
                      : point.winningTeam === 'home' && point.team === 'opponent'
                      ? '#ef4444' // Red for opponent error
                      : '#e5e7eb';

                    const opponentColor = point.winningTeam === 'opponent' && point.team === 'opponent'
                      ? '#10b981' // Green for opponent scoring
                      : point.winningTeam === 'opponent' && point.team === 'home'
                      ? '#ef4444' // Red for home error
                      : '#e5e7eb';

                    return (
                      <div
                        key={`full-point-${point.pointNumber}-${index}`}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '80px 1fr 1fr',
                          gap: '12px',
                          padding: '14px 16px',
                          borderBottom: index < pointHistory.length - 1 ? '1px solid #f3f4f6' : 'none',
                          fontSize: '14px'
                        }}
                      >
                        <div style={{ fontWeight: '700', color: '#666' }}>
                          {point.homeScore} - {point.opponentScore}
                        </div>
                        <div style={{
                          color: homeAction ? '#333' : '#d1d5db',
                          fontWeight: homeAction ? '600' : '400',
                          background: homeAction ? `${homeColor}15` : 'transparent',
                          padding: homeAction ? '6px 10px' : '0',
                          borderRadius: '6px',
                          borderLeft: homeAction ? `3px solid ${homeColor}` : 'none'
                        }}>
                          {homeAction || '—'}
                        </div>
                        <div style={{
                          color: opponentAction ? '#333' : '#d1d5db',
                          fontWeight: opponentAction ? '600' : '400',
                          background: opponentAction ? `${opponentColor}15` : 'transparent',
                          padding: opponentAction ? '6px 10px' : '0',
                          borderRadius: '6px',
                          borderLeft: opponentAction ? `3px solid ${opponentColor}` : 'none'
                        }}>
                          {opponentAction || '—'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Debug Info Modal */}
      {showDebugInfo && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowDebugInfo(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '700px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#333' }}>
                Debug Information
              </h3>
              <button
                onClick={() => setShowDebugInfo(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '2px solid #d1d5db',
                  background: '#f3f4f6',
                  color: '#666',
                  fontSize: '18px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ fontSize: '14px', color: '#666' }}>
              {/* Grid Layout for top section */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                marginBottom: '16px',
                paddingBottom: '16px',
                borderBottom: '2px solid #e5e7eb'
              }}>
                {/* Point/Attempt Info */}
                <div>
                  <p style={{ fontWeight: '700', color: '#333', marginBottom: '8px' }}>Point & Phase</p>
                  <p><strong>Point:</strong> #{pointNumber}</p>
                  <p><strong>Attempt:</strong> #{attemptNumber}</p>
                  <p><strong>Phase:</strong> {isServePhase ? 'SERVE' : 'RALLY'}</p>
                </div>

                {/* Player Info */}
                {selectedPlayer ? (
                  <div>
                    <p style={{ fontWeight: '700', color: '#333', marginBottom: '8px' }}>Selected Player</p>
                    <p><strong>Player:</strong> #{selectedPlayer.jerseyNumber} {selectedPlayer.playerName}</p>
                    <p><strong>Position:</strong> {selectedPlayer.position}</p>
                    <p><strong>Team:</strong> {selectedTeam === 'home' ? 'Home' : 'Opponent'}</p>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontWeight: '700', color: '#333', marginBottom: '8px' }}>Selected Player</p>
                    <p style={{ color: '#999' }}>No player selected</p>
                  </div>
                )}
              </div>

              {/* Trajectory Analysis */}
              {trajectoryAnalysis && currentTrajectory && (
                <>
                  <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '2px solid #e5e7eb' }}>
                    <p style={{ fontWeight: '700', color: '#333', marginBottom: '8px' }}>Bounds Check</p>
                    <p><strong>Start:</strong> {trajectoryAnalysis.startInBounds ? '✅ In bounds' : '❌ Out of bounds'}</p>
                    <p><strong>Landing:</strong> {trajectoryAnalysis.endInBounds ? '✅ In bounds' : '❌ Out of bounds'}</p>
                  </div>

                  <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '2px solid #e5e7eb' }}>
                    <p style={{ fontWeight: '700', color: '#333', marginBottom: '8px' }}>Trajectory Metrics</p>
                    <p><strong>Distance:</strong> {Math.round(trajectoryAnalysis.distance)}px</p>
                    <p><strong>Speed:</strong> {trajectoryAnalysis.speed.toUpperCase()}</p>
                    <p><strong>Landing Area:</strong> {trajectoryAnalysis.landingArea} court</p>
                  </div>

                  {actionType === 'serve' && trajectoryAnalysis.serveZone && (
                    <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '2px solid #e5e7eb' }}>
                      <p style={{ fontWeight: '700', color: '#333', marginBottom: '8px' }}>Serve Info</p>
                      <p><strong>Serve Zone:</strong> {trajectoryAnalysis.serveZone}</p>
                    </div>
                  )}

                  {actionType === 'attack' && trajectoryAnalysis.hitPosition && (
                    <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '2px solid #e5e7eb' }}>
                      <p style={{ fontWeight: '700', color: '#333', marginBottom: '8px' }}>Attack Info</p>
                      <p><strong>Hit Position:</strong> {trajectoryAnalysis.hitPosition}</p>
                    </div>
                  )}

                  <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '2px solid #e5e7eb' }}>
                    <p style={{ fontWeight: '700', color: '#333', marginBottom: '8px' }}>Grid Cell</p>
                    <p><strong>Location:</strong> Row {trajectoryAnalysis.gridCell.row + 1}, Col {trajectoryAnalysis.gridCell.col + 1}</p>
                  </div>

                  <div>
                    <p style={{ fontWeight: '700', color: '#333', marginBottom: '8px' }}>Raw Coordinates</p>
                    <p><strong>Start:</strong> ({Math.round(currentTrajectory.startX)}, {Math.round(currentTrajectory.startY)})</p>
                    <p><strong>End:</strong> ({Math.round(currentTrajectory.endX)}, {Math.round(currentTrajectory.endY)})</p>
                    <p><strong>Start X%:</strong> {Math.round((currentTrajectory.startX - 40) / 340 * 100)}%</p>
                  </div>
                </>
              )}

              {!trajectoryAnalysis && !currentTrajectory && (
                <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                  Draw a trajectory to see debug information
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Set End Modal */}
      {setEndModalOpen && setWinner && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
              textAlign: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              fontSize: '48px',
              marginBottom: '16px'
            }}>
              🏆
            </div>

            <h2 style={{
              margin: '0 0 12px 0',
              fontSize: '28px',
              fontWeight: '700',
              color: '#333'
            }}>
              Set {currentSet} Complete!
            </h2>

            <div style={{
              fontSize: '32px',
              fontWeight: '700',
              color: setWinner === 'home' ? '#7c3aed' : '#ef4444',
              marginBottom: '8px'
            }}>
              {setWinner === 'home' ? 'HOME' : 'OPPONENT'} WINS
            </div>

            <div style={{
              fontSize: '48px',
              fontWeight: '700',
              color: '#666',
              marginBottom: '24px',
              letterSpacing: '4px'
            }}>
              {homeScore} - {opponentScore}
            </div>

            <p style={{
              fontSize: '14px',
              color: '#666',
              marginBottom: '32px'
            }}>
              {currentSet < 5
                ? 'Would you like to continue to the next set or finish the match?'
                : 'This was the final set. Match complete!'}
            </p>

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center'
            }}>
              {currentSet < 5 && (
                <button
                  onClick={handleContinueToNextSet}
                  style={{
                    flex: 1,
                    padding: '14px 24px',
                    fontSize: '16px',
                    fontWeight: '700',
                    background: '#7c3aed',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = '#6d28d9';
                    e.currentTarget.style.transform = 'scale(1.02)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = '#7c3aed';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  Continue to Set {currentSet + 1}
                </button>
              )}

              <button
                onClick={handleFinishMatch}
                style={{
                  flex: currentSet < 5 ? 1 : undefined,
                  padding: '14px 24px',
                  fontSize: '16px',
                  fontWeight: '700',
                  background: '#f3f4f6',
                  color: '#333',
                  border: '2px solid #d1d5db',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#e5e7eb';
                  e.currentTarget.style.borderColor = '#9ca3af';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = '#f3f4f6';
                  e.currentTarget.style.borderColor = '#d1d5db';
                }}
              >
                Finish Match
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Match Info Modal */}
      <MatchInfoModal
        isOpen={matchInfoModalOpen}
        onClose={() => setMatchInfoModalOpen(false)}
        matchId={matchId || 'unknown'}
        homeTeamName={homeTeamName}
        opponentTeamName={opponentTeamName}
        currentSet={currentSet}
        homeScore={homeScore}
        opponentScore={opponentScore}
        pointHistoryLength={pointHistory.length}
        homeRotationConfig={homeRotationConfig}
        opponentRotationConfig={opponentRotationConfig}
        homeRoster={homeRoster}
        opponentRoster={opponentRoster}
        rotationEnabled={rotationEnabled}
        onResetConfiguration={handleResetConfiguration}
      />

      {/* Rotation Configuration Modal */}
      <RotationConfigModal
        isOpen={rotationConfigModalOpen}
        onClose={() => {
          setRotationConfigModalOpen(false);
          setRotationConfigDismissed(true);
        }}
        onSave={handleRotationConfigSave}
        initialHomeConfig={homeRotationConfig || undefined}
        initialOpponentConfig={opponentRotationConfig || undefined}
        onResetConfiguration={handleResetConfiguration}
        currentSet={currentSet}
        homeTeamName={homeTeamName}
        opponentTeamName={opponentTeamName}
        homeRoster={homeRoster}
        opponentRoster={opponentRoster}
      />

      {/* Player Stats Modal */}
      <PlayerStatsModal
        isOpen={statsModalOpen}
        onClose={() => setStatsModalOpen(false)}
        matchId={matchId || 'unknown'}
        currentSet={currentSet}
        homeTeamName={homeTeamName}
        opponentTeamName={opponentTeamName}
        homeRoster={homeRoster.map(p => ({
          playerId: p.Id,
          playerName: p.Name,
          jerseyNumber: parseInt(p.JerseyNumber) || 0
        }))}
        opponentRoster={opponentRoster.map(p => ({
          playerId: p.Id,
          playerName: p.Name,
          jerseyNumber: parseInt(p.JerseyNumber) || 0
        }))}
      />
    </div>
  );
}

/**
 * Export main component directly (OpponentTrackingProvider temporarily disabled)
 */
export default VisualTrackingPageContent;
