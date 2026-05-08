/**
 * Volleyball Coach App - Google Apps Script Web App
 * Backend API for React app to interact with Google Sheets
 *
 * SETUP INSTRUCTIONS:
 * 1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID
 * 2. Click Extensions > Apps Script
 * 3. Delete default code and paste this entire file
 * 4. Update SHEET_ID constant below with your actual Sheet ID
 * 5. Click Deploy > New Deployment
 * 6. Select "Web app" type
 * 7. Execute as: Me
 * 8. Who has access: Anyone
 * 9. Click Deploy and copy the Web App URL
 * 10. Add the URL to your React app's .env file
 *
 * COLUMN STRUCTURE (InGameTrends - 8 columns):
 * A: Id              - UUID match identifier
 * B: Data            - JSON array of sets with points
 * C: HomeTeam        - Team ID
 * D: OpponentTeam    - Team ID
 * E: GameDate        - Date string
 * F: GameState       - JSON object with live game state
 * G: RotationConfigs - JSON object with per-set rotation configs
 * H: Trajectories    - JSON array of trajectory data
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

// Your Google Sheet ID (from the URL)
// Example: https://docs.google.com/spreadsheets/d/1SAdTpnh_uhOK0BKpM8PU5nyrqm8BqR3ZfUpXQIIYIGo/edit
const SHEET_ID = '1SAdTpnh_uhOK0BKpM8PU5nyrqm8BqR3ZfUpXQIIYIGo';

// Sheet names (tabs in your Google Sheet)
// Only the sheets needed for In-Game Stats tracking
const SHEETS = {
  IN_GAME_TRENDS: 'InGameTrends',
  TEAMS: 'TeamInfo',
  PLAYERS: 'PlayerInfo'
};

// Column indices (0-based) for InGameTrends
const COLUMNS = {
  ID: 0,
  DATA: 1,
  HOME_TEAM: 2,
  OPPONENT_TEAM: 3,
  GAME_DATE: 4,
  GAME_STATE: 5,
  ROTATION_CONFIGS: 6,
  TRAJECTORIES: 7
};

// ============================================================================
// MAIN WEB APP HANDLERS
// ============================================================================

/**
 * Handle GET requests
 * Usage: GET https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=getMatch&matchId=123
 */
function doGet(e) {
  try {
    const action = e.parameter.action;

    switch (action) {
      case 'getMatch':
        return getMatch(e.parameter.matchId);

      case 'getMatchFull':
        return getMatchFull(e.parameter.matchId);

      case 'getAllMatches':
        return getAllMatches();

      case 'getTeams':
        return getTeams();

      case 'getPlayers':
        return getPlayers(e.parameter.teamId);

      case 'saveMatch':
        // Parse JSON data from URL parameter
        const saveData = JSON.parse(e.parameter.data || '{}');
        return saveMatch(saveData);

      case 'updateMatch':
        // Parse JSON data from URL parameter
        const updateData = JSON.parse(e.parameter.data || '{}');
        return updateMatch(e.parameter.matchId, updateData);

      case 'updateGameState':
        const gameStateData = JSON.parse(e.parameter.data || '{}');
        return updateGameState(e.parameter.matchId, gameStateData);

      case 'updateRotationConfig':
        const rotationData = JSON.parse(e.parameter.data || '{}');
        return updateRotationConfig(e.parameter.matchId, rotationData.setNumber, rotationData.config);

      case 'updateTrajectories':
        const trajData = JSON.parse(e.parameter.data || '{}');
        return updateTrajectories(e.parameter.matchId, trajData.trajectories);

      case 'createTeam':
        const newTeamData = JSON.parse(e.parameter.data || '{}');
        return createTeam(newTeamData);

      case 'updateTeam':
        const updTeamData = JSON.parse(e.parameter.data || '{}');
        return updateTeam(e.parameter.teamId, updTeamData);

      case 'deleteTeam':
        return deleteTeam(e.parameter.teamId);

      case 'createPlayer':
        const newPlayerData = JSON.parse(e.parameter.data || '{}');
        return createPlayer(newPlayerData);

      case 'updatePlayer':
        const updPlayerData = JSON.parse(e.parameter.data || '{}');
        return updatePlayer(e.parameter.playerId, updPlayerData);

      case 'deletePlayer':
        return deletePlayer(e.parameter.playerId);

      case 'addPoint':
        const addPointData = JSON.parse(e.parameter.data || '{}');
        return addPoint(e.parameter.matchId, parseInt(e.parameter.setNumber), addPointData);

      case 'undoLastPoint':
        return undoLastPoint(e.parameter.matchId, parseInt(e.parameter.setNumber));

      case 'health':
        return createResponse({ status: 'ok', timestamp: new Date() });

      default:
        return createResponse({ error: 'Invalid action' }, 400);
    }
  } catch (error) {
    return createResponse({ error: error.toString() }, 500);
  }
}

/**
 * Handle POST requests
 * Usage: POST https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
 * Body: { action: 'saveMatch', data: {...} }
 */
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    switch (action) {
      case 'saveMatch':
        return saveMatch(payload.data);

      case 'updateMatch':
        return updateMatch(payload.matchId, payload.data);

      case 'deleteMatch':
        return deleteMatch(payload.matchId);

      case 'addPoint':
        return addPoint(payload.matchId, payload.setNumber, payload.point);

      case 'undoLastPoint':
        return undoLastPoint(payload.matchId, payload.setNumber);

      case 'updateGameState':
        return updateGameState(payload.matchId, payload.gameState);

      case 'updateRotationConfig':
        return updateRotationConfig(payload.matchId, payload.setNumber, payload.config);

      case 'updateTrajectories':
        return updateTrajectories(payload.matchId, payload.trajectories);

      case 'saveMatchFull':
        return saveMatchFull(payload.data);

      default:
        return createResponse({ error: 'Invalid action' }, 400);
    }
  } catch (error) {
    return createResponse({ error: error.toString() }, 500);
  }
}

// ============================================================================
// GET OPERATIONS (READ)
// ============================================================================

/**
 * Get a single match by ID (basic fields for backwards compatibility)
 */
function getMatch(matchId) {
  if (!matchId) {
    return createResponse({ error: 'matchId is required' }, 400);
  }

  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEETS.IN_GAME_TRENDS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  // Find row with matching ID
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowData = {};

    headers.forEach((header, index) => {
      rowData[header] = row[index];
    });

    if (rowData.Id === matchId) {
      // Parse JSON data field
      const matchData = {
        id: rowData.Id,
        homeTeam: rowData.HomeTeam,
        opponentTeam: rowData.OpponentTeam,
        gameDate: rowData.GameDate,
        sets: parseJSON(rowData.Data, []),
        // Include new fields if they exist
        gameState: parseJSON(rowData.GameState, null),
        rotationConfigs: parseJSON(rowData.RotationConfigs, null),
        trajectories: parseJSON(rowData.Trajectories, [])
      };

      return createResponse(matchData);
    }
  }

  return createResponse({ error: 'Match not found' }, 404);
}

/**
 * Get a single match with all data (full session data)
 */
function getMatchFull(matchId) {
  return getMatch(matchId);
}

/**
 * Get all matches (includes gameState for resume functionality)
 */
function getAllMatches() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEETS.IN_GAME_TRENDS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const matches = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowData = {};

    headers.forEach((header, index) => {
      rowData[header] = row[index];
    });

    // Skip rows with no ID
    if (!rowData.Id) continue;

    matches.push({
      id: rowData.Id,
      homeTeam: rowData.HomeTeam,
      opponentTeam: rowData.OpponentTeam,
      gameDate: rowData.GameDate,
      sets: parseJSON(rowData.Data, []),
      gameState: parseJSON(rowData.GameState, null)
    });
  }

  return createResponse(matches);
}

/**
 * Get all teams
 */
function getTeams() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEETS.TEAMS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const teams = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const team = {};

    headers.forEach((header, index) => {
      team[header] = row[index];
    });

    teams.push(team);
  }

  return createResponse(teams);
}

/**
 * Get players for a team
 */
function getPlayers(teamId) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEETS.PLAYERS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const players = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const player = {};

    headers.forEach((header, index) => {
      player[header] = row[index];
    });

    // Filter by team if teamId provided
    if (!teamId || player.TeamId === teamId) {
      players.push(player);
    }
  }

  return createResponse(players);
}

// ============================================================================
// POST OPERATIONS (WRITE)
// ============================================================================

/**
 * Save a new match (8 columns)
 */
function saveMatch(matchData) {
  return withLock(function() {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEETS.IN_GAME_TRENDS);

    // Generate new ID if not provided
    const matchId = matchData.id || Utilities.getUuid();

    // Prepare row data (8 columns)
    const rowData = [
      matchId,
      JSON.stringify(matchData.sets || []),
      matchData.homeTeam,
      matchData.opponentTeam,
      matchData.gameDate,
      JSON.stringify(matchData.gameState || null),
      JSON.stringify(matchData.rotationConfigs || {}),
      JSON.stringify(matchData.trajectories || [])
    ];

    // Append new row
    sheet.appendRow(rowData);

    return createResponse({
      success: true,
      matchId: matchId,
      message: 'Match saved successfully'
    });
  });
}

/**
 * Save a new match with all data
 */
function saveMatchFull(matchData) {
  return saveMatch(matchData);
}

/**
 * Update an existing match (all 8 columns)
 */
function updateMatch(matchId, matchData) {
  return withLock(function() {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEETS.IN_GAME_TRENDS);
    const data = sheet.getDataRange().getValues();

    // Find row with matching ID
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === matchId) {
        // Preserve existing values for new columns if not provided
        const existingGameState = parseJSON(data[i][COLUMNS.GAME_STATE], null);
        const existingRotationConfigs = parseJSON(data[i][COLUMNS.ROTATION_CONFIGS], {});
        const existingTrajectories = parseJSON(data[i][COLUMNS.TRAJECTORIES], []);

        // Update row (8 columns)
        sheet.getRange(i + 1, 1, 1, 8).setValues([[
          matchId,
          JSON.stringify(matchData.sets || []),
          matchData.homeTeam,
          matchData.opponentTeam,
          matchData.gameDate,
          JSON.stringify(matchData.gameState !== undefined ? matchData.gameState : existingGameState),
          JSON.stringify(matchData.rotationConfigs !== undefined ? matchData.rotationConfigs : existingRotationConfigs),
          JSON.stringify(matchData.trajectories !== undefined ? matchData.trajectories : existingTrajectories)
        ]]);

        return createResponse({
          success: true,
          message: 'Match updated successfully'
        });
      }
    }

    return createResponse({ error: 'Match not found' }, 404);
  });
}

/**
 * Update only the game state (quick update for live scoring)
 */
function updateGameState(matchId, gameState) {
  return withLock(function() {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEETS.IN_GAME_TRENDS);
    const data = sheet.getDataRange().getValues();

    // Find row with matching ID
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === matchId) {
        // Update only GameState column (column F = index 6)
        sheet.getRange(i + 1, COLUMNS.GAME_STATE + 1).setValue(JSON.stringify(gameState));

        return createResponse({
          success: true,
          message: 'Game state updated successfully'
        });
      }
    }

    return createResponse({ error: 'Match not found' }, 404);
  });
}

/**
 * Update rotation config for a specific set
 */
function updateRotationConfig(matchId, setNumber, config) {
  return withLock(function() {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEETS.IN_GAME_TRENDS);
    const data = sheet.getDataRange().getValues();

    // Find row with matching ID
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === matchId) {
        // Get existing rotation configs
        const existingConfigs = parseJSON(data[i][COLUMNS.ROTATION_CONFIGS], {});

        // Update config for this set
        existingConfigs[setNumber] = config;

        // Update RotationConfigs column (column G = index 7)
        sheet.getRange(i + 1, COLUMNS.ROTATION_CONFIGS + 1).setValue(JSON.stringify(existingConfigs));

        return createResponse({
          success: true,
          message: 'Rotation config updated successfully'
        });
      }
    }

    return createResponse({ error: 'Match not found' }, 404);
  });
}

/**
 * Update trajectories (append new trajectories)
 */
function updateTrajectories(matchId, newTrajectories) {
  return withLock(function() {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEETS.IN_GAME_TRENDS);
    const data = sheet.getDataRange().getValues();

    // Find row with matching ID
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === matchId) {
        // Get existing trajectories
        const existingTrajectories = parseJSON(data[i][COLUMNS.TRAJECTORIES], []);

        // Append new trajectories (avoid duplicates by ID)
        const existingIds = new Set(existingTrajectories.map(function(t) { return t.id; }));
        const uniqueNewTrajectories = newTrajectories.filter(function(t) { return !existingIds.has(t.id); });
        const allTrajectories = existingTrajectories.concat(uniqueNewTrajectories);

        // Update Trajectories column (column H = index 8)
        sheet.getRange(i + 1, COLUMNS.TRAJECTORIES + 1).setValue(JSON.stringify(allTrajectories));

        return createResponse({
          success: true,
          message: 'Trajectories updated successfully',
          count: allTrajectories.length
        });
      }
    }

    return createResponse({ error: 'Match not found' }, 404);
  });
}

/**
 * Delete a match
 */
function deleteMatch(matchId) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEETS.IN_GAME_TRENDS);
  const data = sheet.getDataRange().getValues();

  // Find and delete row
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === matchId) {
      sheet.deleteRow(i + 1);
      return createResponse({
        success: true,
        message: 'Match deleted successfully'
      });
    }
  }

  return createResponse({ error: 'Match not found' }, 404);
}

/**
 * Add a point to a specific set
 * NOTE: withLock is applied here AND inside updateMatch — that's intentional.
 * The GAS LockService is reentrant within the same execution, so the nested
 * call to updateMatch won't deadlock; it simply re-acquires the already-held lock.
 * However, to avoid confusion we do the read-modify-write inline here and call
 * a raw (unlocked) helper for the actual sheet write.
 */
function addPoint(matchId, setNumber, pointData) {
  return withLock(function() {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEETS.IN_GAME_TRENDS);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === matchId) {
        const sets = parseJSON(data[i][COLUMNS.DATA], []);
        const setIndex = sets.findIndex(function(s) { return s.set_number === setNumber; });

        if (setIndex === -1) {
          return createResponse({ error: 'Set not found' }, 404);
        }

        sets[setIndex].points.push(pointData);

        // Write only the Data column — avoids a second full-row read
        sheet.getRange(i + 1, COLUMNS.DATA + 1).setValue(JSON.stringify(sets));

        return createResponse({ success: true, message: 'Point added successfully' });
      }
    }

    return createResponse({ error: 'Match not found' }, 404);
  });
}

/**
 * Undo last point in a set
 */
function undoLastPoint(matchId, setNumber) {
  return withLock(function() {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEETS.IN_GAME_TRENDS);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === matchId) {
        const sets = parseJSON(data[i][COLUMNS.DATA], []);
        const setIndex = sets.findIndex(function(s) { return s.set_number === setNumber; });

        if (setIndex === -1) {
          return createResponse({ error: 'Set not found' }, 404);
        }

        if (sets[setIndex].points.length === 0) {
          return createResponse({ error: 'No points to undo' }, 400);
        }

        sets[setIndex].points.pop();

        // Write only the Data column
        sheet.getRange(i + 1, COLUMNS.DATA + 1).setValue(JSON.stringify(sets));

        return createResponse({ success: true, message: 'Point undone successfully' });
      }
    }

    return createResponse({ error: 'Match not found' }, 404);
  });
}

// ============================================================================
// TEAM & PLAYER CRUD
// ============================================================================

function createTeam(teamData) {
  return withLock(function() {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEETS.TEAMS);
    const id = Utilities.getUuid();
    sheet.appendRow([id, teamData.name]);
    return createResponse({ success: true, teamId: id });
  });
}

function updateTeam(teamId, teamData) {
  return withLock(function() {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEETS.TEAMS);
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === teamId) {
        sheet.getRange(i + 1, 2).setValue(teamData.name);
        return createResponse({ success: true });
      }
    }
    return createResponse({ error: 'Team not found' }, 404);
  });
}

function deleteTeam(teamId) {
  return withLock(function() {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEETS.TEAMS);
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === teamId) {
        sheet.deleteRow(i + 1);
        return createResponse({ success: true });
      }
    }
    return createResponse({ error: 'Team not found' }, 404);
  });
}

function createPlayer(playerData) {
  return withLock(function() {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEETS.PLAYERS);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const id = Utilities.getUuid();
    const row = headers.map(function(h) {
      if (h === 'Id') return id;
      if (h === 'PreferredName') return playerData.preferredName || '';
      if (h === 'FirstName') return '';
      if (h === 'LastName') return '';
      if (h === 'MainPosition') return playerData.mainPosition || '';
      if (h === 'SecondaryPosition') return playerData.secondaryPosition || '';
      if (h === 'TeamId') return playerData.teamId || '';
      if (h === 'JerseyNumber') return playerData.jerseyNumber || 0;
      return '';
    });
    sheet.appendRow(row);
    return createResponse({ success: true, playerId: id });
  });
}

function updatePlayer(playerId, playerData) {
  return withLock(function() {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEETS.PLAYERS);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const colMap = {};
    headers.forEach(function(h, i) { colMap[h] = i; });
    for (let i = 1; i < data.length; i++) {
      if (data[i][colMap['Id']] === playerId) {
        if (playerData.preferredName !== undefined) sheet.getRange(i + 1, colMap['PreferredName'] + 1).setValue(playerData.preferredName);
        if (playerData.jerseyNumber !== undefined) sheet.getRange(i + 1, colMap['JerseyNumber'] + 1).setValue(playerData.jerseyNumber);
        if (playerData.mainPosition !== undefined) sheet.getRange(i + 1, colMap['MainPosition'] + 1).setValue(playerData.mainPosition);
        if (playerData.secondaryPosition !== undefined) sheet.getRange(i + 1, colMap['SecondaryPosition'] + 1).setValue(playerData.secondaryPosition);
        return createResponse({ success: true });
      }
    }
    return createResponse({ error: 'Player not found' }, 404);
  });
}

function deletePlayer(playerId) {
  return withLock(function() {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEETS.PLAYERS);
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === playerId) {
        sheet.deleteRow(i + 1);
        return createResponse({ success: true });
      }
    }
    return createResponse({ error: 'Player not found' }, 404);
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Execute fn while holding the script-wide lock.
 * Prevents concurrent GAS executions from racing on the same spreadsheet row
 * (read-modify-write race on addPoint, updateMatch, etc.).
 * Waits up to 30 s; returns a 503 response if the lock cannot be acquired.
 */
function withLock(fn) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    return fn();
  } catch (e) {
    return createResponse({ error: 'Server busy – please retry' }, 503);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Safely parse JSON with a default value
 */
function parseJSON(jsonString, defaultValue) {
  if (!jsonString || jsonString === '' || jsonString === 'null' || jsonString === 'undefined') {
    return defaultValue;
  }
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    return defaultValue;
  }
}

/**
 * Create JSON response
 */
function createResponse(data, status = 200) {
  const response = {
    status: status,
    data: data
  };

  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}
