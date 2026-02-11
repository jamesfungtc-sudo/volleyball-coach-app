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
}

/**
 * Update only the game state (quick update for live scoring)
 */
function updateGameState(matchId, gameState) {
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
}

/**
 * Update rotation config for a specific set
 */
function updateRotationConfig(matchId, setNumber, config) {
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
}

/**
 * Update trajectories (append new trajectories)
 */
function updateTrajectories(matchId, newTrajectories) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEETS.IN_GAME_TRENDS);
  const data = sheet.getDataRange().getValues();

  // Find row with matching ID
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === matchId) {
      // Get existing trajectories
      const existingTrajectories = parseJSON(data[i][COLUMNS.TRAJECTORIES], []);

      // Append new trajectories (avoid duplicates by ID)
      const existingIds = new Set(existingTrajectories.map(t => t.id));
      const uniqueNewTrajectories = newTrajectories.filter(t => !existingIds.has(t.id));
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
 */
function addPoint(matchId, setNumber, pointData) {
  // Get current match data
  const matchResponse = getMatch(matchId);
  const match = JSON.parse(matchResponse.getContent()).data;

  if (!match) {
    return createResponse({ error: 'Match not found' }, 404);
  }

  // Find the set and add point
  const sets = match.sets;
  const setIndex = sets.findIndex(s => s.set_number === setNumber);

  if (setIndex === -1) {
    return createResponse({ error: 'Set not found' }, 404);
  }

  sets[setIndex].points.push(pointData);

  // Update match
  return updateMatch(matchId, {
    homeTeam: match.homeTeam,
    opponentTeam: match.opponentTeam,
    gameDate: match.gameDate,
    sets: sets
  });
}

/**
 * Undo last point in a set
 */
function undoLastPoint(matchId, setNumber) {
  // Get current match data
  const matchResponse = getMatch(matchId);
  const match = JSON.parse(matchResponse.getContent()).data;

  if (!match) {
    return createResponse({ error: 'Match not found' }, 404);
  }

  // Find the set and remove last point
  const sets = match.sets;
  const setIndex = sets.findIndex(s => s.set_number === setNumber);

  if (setIndex === -1) {
    return createResponse({ error: 'Set not found' }, 404);
  }

  if (sets[setIndex].points.length === 0) {
    return createResponse({ error: 'No points to undo' }, 400);
  }

  sets[setIndex].points.pop();

  // Update match
  return updateMatch(matchId, {
    homeTeam: match.homeTeam,
    opponentTeam: match.opponentTeam,
    gameDate: match.gameDate,
    sets: sets
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

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
