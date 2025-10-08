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

      case 'getAllMatches':
        return getAllMatches();

      case 'getTeams':
        return getTeams();

      case 'getPlayers':
        return getPlayers(e.parameter.teamId);

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
 * Get a single match by ID
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
        sets: JSON.parse(rowData.Data || '[]')
      };

      return createResponse(matchData);
    }
  }

  return createResponse({ error: 'Match not found' }, 404);
}

/**
 * Get all matches
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

    matches.push({
      id: rowData.Id,
      homeTeam: rowData.HomeTeam,
      opponentTeam: rowData.OpponentTeam,
      gameDate: rowData.GameDate,
      sets: JSON.parse(rowData.Data || '[]')
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
 * Save a new match
 */
function saveMatch(matchData) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEETS.IN_GAME_TRENDS);

  // Generate new ID if not provided
  const matchId = matchData.id || Utilities.getUuid();

  // Prepare row data
  const rowData = [
    matchId,
    JSON.stringify(matchData.sets || []),
    matchData.homeTeam,
    matchData.opponentTeam,
    matchData.gameDate
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
 * Update an existing match
 */
function updateMatch(matchId, matchData) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEETS.IN_GAME_TRENDS);
  const data = sheet.getDataRange().getValues();

  // Find row with matching ID
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === matchId) {
      // Update row
      sheet.getRange(i + 1, 1, 1, 5).setValues([[
        matchId,
        JSON.stringify(matchData.sets || []),
        matchData.homeTeam,
        matchData.opponentTeam,
        matchData.gameDate
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
 * Create JSON response with CORS headers
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
