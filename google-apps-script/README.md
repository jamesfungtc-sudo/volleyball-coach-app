# Google Apps Script Setup Instructions

This directory contains the Google Apps Script code that acts as a backend API for your React app to connect to Google Sheets.

## 📋 Prerequisites

- Google Account with access to your volleyball stats Google Sheet
- Google Sheet ID: `1SAdTpnh_uhOK0BKpM8PU5nyrqm8BqR3ZfUpXQIIYIGo`

## 🚀 Setup Steps

### Step 1: Open Google Apps Script Editor

1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1SAdTpnh_uhOK0BKpM8PU5nyrqm8BqR3ZfUpXQIIYIGo/edit
2. Click **Extensions** > **Apps Script**
3. Delete any default code in the editor

### Step 2: Add the Code

1. Copy the entire contents of `Code.gs` file
2. Paste it into the Apps Script editor
3. Verify the `SHEET_ID` constant matches your sheet ID
4. Update `SHEETS` constant if your sheet tab names are different:
   ```javascript
   const SHEETS = {
     IN_GAME_TRENDS: 'InGameTrends',  // Your actual tab name
     TEAMS: 'Teams',
     PLAYERS: 'Players',
     MATCHES: 'Matches'
   };
   ```

### Step 3: Deploy as Web App

1. Click **Deploy** > **New deployment**
2. Click the gear icon ⚙️ next to "Select type"
3. Select **Web app**
4. Fill in the settings:
   - **Description**: "Volleyball Stats API v1"
   - **Execute as**: Me (your email)
   - **Who has access**: Anyone
5. Click **Deploy**
6. Click **Authorize access**
7. Select your Google account
8. Click **Advanced** > **Go to [Project name] (unsafe)**
9. Click **Allow**
10. **Copy the Web App URL** - it looks like:
    ```
    https://script.google.com/macros/s/AKfycbx.../exec
    ```

### Step 4: Test the API

Test in your browser by visiting:
```
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=health
```

You should see:
```json
{
  "status": 200,
  "data": {
    "status": "ok",
    "timestamp": "2025-10-06T..."
  }
}
```

### Step 5: Add to React App

1. Create a `.env` file in your React app root (if it doesn't exist)
2. Add the Web App URL:
   ```
   VITE_GOOGLE_SHEETS_API_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
   ```
3. Restart your dev server

## 📝 Google Sheets Structure

Your Google Sheet should have these tabs:

### InGameTrends
| Id | Data | HomeTeam | OpponentTeam | GameDate |
|----|------|----------|--------------|----------|
| UUID | JSON | Team Name | Team Name | YYYY-MM-DD |

**Data column** contains JSON:
```json
[
  {
    "set_number": 1,
    "points": [
      {
        "point_number": 1,
        "winning_team": "home",
        "action_type": "Att.",
        "action": "Hard Spike",
        "locationTempo": "OH (Line)",
        "home_player": "Player 5",
        "opponent_player": "",
        "home_score": 1,
        "opponent_score": 0
      }
    ]
  }
]
```

### Teams (Optional)
| Id | Name | ... |
|----|------|-----|
| UUID | Team Name | ... |

### Players (Optional)
| Id | TeamId | Name | JerseyNumber | Position |
|----|--------|------|--------------|----------|
| UUID | Team UUID | Player Name | 5 | OH |

## 🔧 API Endpoints

### GET Requests

#### Get Match
```
GET /exec?action=getMatch&matchId=YOUR_MATCH_ID
```

#### Get All Matches
```
GET /exec?action=getAllMatches
```

#### Get Teams
```
GET /exec?action=getTeams
```

#### Get Players
```
GET /exec?action=getPlayers&teamId=TEAM_ID
```

#### Health Check
```
GET /exec?action=health
```

### POST Requests

#### Save New Match
```
POST /exec
Content-Type: application/json

{
  "action": "saveMatch",
  "data": {
    "homeTeam": "Eagles",
    "opponentTeam": "Hawks",
    "gameDate": "2025-10-06",
    "sets": []
  }
}
```

#### Update Match
```
POST /exec
Content-Type: application/json

{
  "action": "updateMatch",
  "matchId": "YOUR_MATCH_ID",
  "data": {
    "homeTeam": "Eagles",
    "opponentTeam": "Hawks",
    "gameDate": "2025-10-06",
    "sets": [...]
  }
}
```

#### Add Point
```
POST /exec
Content-Type: application/json

{
  "action": "addPoint",
  "matchId": "YOUR_MATCH_ID",
  "setNumber": 1,
  "point": {
    "point_number": 1,
    "winning_team": "home",
    ...
  }
}
```

#### Undo Last Point
```
POST /exec
Content-Type: application/json

{
  "action": "undoLastPoint",
  "matchId": "YOUR_MATCH_ID",
  "setNumber": 1
}
```

## 🔄 Updating the Deployment

When you make changes to the code:

1. Save the changes in Apps Script editor
2. Click **Deploy** > **Manage deployments**
3. Click the edit icon ✏️ next to your deployment
4. Change **Version** to "New version"
5. Click **Deploy**

The Web App URL stays the same!

## 🐛 Troubleshooting

### "Authorization required" error
- Re-run the deployment authorization steps
- Make sure "Execute as: Me" is selected

### "Script function not found" error
- Check that function names in Code.gs match exactly
- Verify you copied the entire file

### CORS errors in React app
- The Apps Script automatically handles CORS
- If issues persist, check browser console for details

### Data not saving
- Check Google Sheets permissions
- Verify sheet tab names match SHEETS constant
- Check Execution log in Apps Script (View > Executions)

## 📚 Resources

- [Google Apps Script Documentation](https://developers.google.com/apps-script)
- [Web Apps Guide](https://developers.google.com/apps-script/guides/web)
- [Spreadsheet Service](https://developers.google.com/apps-script/reference/spreadsheet)
