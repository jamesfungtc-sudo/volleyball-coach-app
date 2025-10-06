# 🏐 Google Sheets Database Setup Guide

This guide will help you connect your React app to Google Sheets as a database using Google Apps Script.

## 📋 Overview

**Architecture:**
```
React App (GitHub Pages)
    ↓ HTTPS
Google Apps Script Web App
    ↓ Direct Access
Google Sheets (Database)
```

**Benefits:**
- ✅ No separate backend infrastructure needed
- ✅ Free hosting
- ✅ Direct Google Sheets access
- ✅ Automatic authentication
- ✅ Real-time data sync

---

## 🚀 Quick Start (3 Steps)

### Step 1: Deploy Google Apps Script

1. **Open your Google Sheet**
   - Go to: https://docs.google.com/spreadsheets/d/1SAdTpnh_uhOK0BKpM8PU5nyrqm8BqR3ZfUpXQIIYIGo/edit

2. **Open Apps Script Editor**
   - Click **Extensions** → **Apps Script**

3. **Copy the code**
   - Delete any default code
   - Open: `google-apps-script/Code.gs`
   - Copy entire file and paste into Apps Script editor

4. **Deploy as Web App**
   - Click **Deploy** → **New deployment**
   - Click gear icon ⚙️ → Select **Web app**
   - Settings:
     - **Execute as**: Me
     - **Who has access**: Anyone
   - Click **Deploy**
   - **Authorize** the app (follow prompts)
   - **Copy the Web App URL** (looks like: `https://script.google.com/macros/s/AKfycbx.../exec`)

### Step 2: Configure React App

1. **Create .env file** (if you haven't already)
   ```bash
   cp .env.example .env
   ```

2. **Add your Web App URL to .env**
   ```
   VITE_GOOGLE_SHEETS_API_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
   ```

3. **Restart dev server**
   ```bash
   npm run dev
   ```

### Step 3: Test Connection

1. **Open browser console** (F12)
2. **In your app**, check for connection status
3. **Expected console message**:
   ```
   ✅ Google Sheets API connected
   ```

---

## 📊 Google Sheets Structure

Your Google Sheet needs these tabs (sheets):

### 1. **InGameTrends** (Main data)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| Id | Text | Unique match ID | `a1b2c3d4-...` |
| Data | JSON | Match data (sets & points) | `[{"set_number":1,"points":[...]}]` |
| HomeTeam | Text | Home team name | `Eagles` |
| OpponentTeam | Text | Opponent team name | `Hawks` |
| GameDate | Date | Match date | `2025-10-06` |

**Example Data column content:**
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
      },
      {
        "point_number": 2,
        "winning_team": "opponent",
        "action_type": "Op. Ace",
        "action": "Ace (on floor)",
        "locationTempo": "Zone P1",
        "home_player": "",
        "opponent_player": "Opp Player 3",
        "home_score": 1,
        "opponent_score": 1
      }
    ]
  },
  {
    "set_number": 2,
    "points": []
  }
]
```

### 2. **Teams** (Optional - for team management)

| Id | Name | CoachName | ... |
|----|------|-----------|-----|
| UUID | Eagles | Coach John | ... |
| UUID | Hawks | Coach Jane | ... |

### 3. **Players** (Optional - for player management)

| Id | TeamId | Name | JerseyNumber | Position |
|----|--------|------|--------------|----------|
| UUID | Team UUID | John Doe | 5 | OH |
| UUID | Team UUID | Jane Smith | 12 | MB |

---

## 🔧 API Reference

### Health Check
Test if API is working:
```
GET https://YOUR_DEPLOYMENT_URL/exec?action=health
```

**Response:**
```json
{
  "status": 200,
  "data": {
    "status": "ok",
    "timestamp": "2025-10-06T..."
  }
}
```

### Get Match
```
GET https://YOUR_DEPLOYMENT_URL/exec?action=getMatch&matchId=YOUR_MATCH_ID
```

### Get All Matches
```
GET https://YOUR_DEPLOYMENT_URL/exec?action=getAllMatches
```

### Save Match
```
POST https://YOUR_DEPLOYMENT_URL/exec
Content-Type: application/json

{
  "action": "saveMatch",
  "data": {
    "homeTeam": "Eagles",
    "opponentTeam": "Hawks",
    "gameDate": "2025-10-06",
    "sets": [
      { "set_number": 1, "points": [] },
      { "set_number": 2, "points": [] },
      { "set_number": 3, "points": [] }
    ]
  }
}
```

---

## 🐛 Troubleshooting

### Issue: "API URL not configured" warning in console

**Solution:**
1. Check `.env` file exists in project root
2. Verify `VITE_GOOGLE_SHEETS_API_URL` is set
3. Restart dev server: `npm run dev`

### Issue: "Authorization required" error

**Solution:**
1. In Apps Script, click **Deploy** → **Manage deployments**
2. Click edit icon ✏️
3. Re-authorize the app
4. Ensure "Execute as: Me" is selected

### Issue: CORS errors in browser

**Solution:**
- Apps Script automatically handles CORS
- Ensure you're using the Web App URL (ends with `/exec`)
- Check that deployment is set to "Anyone" access

### Issue: Data not saving to Google Sheets

**Solution:**
1. Check sheet tab names match `SHEETS` constant in `Code.gs`
2. Verify Google Sheets permissions
3. Check **Executions** log in Apps Script:
   - View → Executions
   - Look for error messages

### Issue: Changes to Apps Script not reflecting

**Solution:**
1. Save the Apps Script file
2. Deploy new version:
   - Deploy → Manage deployments
   - Edit icon ✏️
   - Change "Version" to "New version"
   - Click Deploy
3. URL stays the same!

---

## 🔄 Updating Your Deployment

When you modify `Code.gs`:

1. **Save changes** in Apps Script editor
2. **Create new version**:
   - Deploy → Manage deployments
   - Click edit icon ✏️
   - Select "New version"
   - Click Deploy
3. **No need to update .env** - URL remains the same!

---

## 🔒 Security Notes

### What's Safe:
✅ Web App URL in `.env` file (not committed to git)
✅ Anyone can call the API (read/write)
✅ Data stays in your Google Account

### What to Protect:
⚠️ Never commit `.env` file to git
⚠️ `.env` is in `.gitignore` by default
⚠️ Only share Web App URL with your team

### Access Control:
- Apps Script runs as **YOU**
- Apps Script has **your** Google Sheets access
- Anyone with the URL can read/write (suitable for team app)
- For stricter control, modify Apps Script to check credentials

---

## 📝 Development vs Production

### Development (localhost)
- Uses `.env` file
- Hot reload works
- Console warnings if API not configured

### Production (GitHub Pages)
- Set environment variables in GitHub Secrets
- Update deployment workflow
- API calls work from browser

**To deploy to GitHub Pages with API:**
1. Add GitHub Secret: `VITE_GOOGLE_SHEETS_API_URL`
2. Update `.github/workflows/deploy.yml` to inject secret
3. Push to main branch

---

## 📚 Resources

- [Google Apps Script Docs](https://developers.google.com/apps-script)
- [Web Apps Guide](https://developers.google.com/apps-script/guides/web)
- [Spreadsheet Service Reference](https://developers.google.com/apps-script/reference/spreadsheet)
- [Sample Code](./google-apps-script/)

---

## ✅ Checklist

Before going live, verify:

- [ ] Google Apps Script deployed as Web App
- [ ] Web App URL copied
- [ ] `.env` file created with `VITE_GOOGLE_SHEETS_API_URL`
- [ ] Dev server restarted
- [ ] Health check passes (browser console)
- [ ] Google Sheet has correct tab names
- [ ] Test match can be created/saved
- [ ] `.env` file is in `.gitignore`

---

## 🆘 Need Help?

1. Check browser console for error messages
2. Check Apps Script **Executions** log (View → Executions)
3. Review `google-apps-script/README.md`
4. Test API with direct HTTP calls (Postman/curl)

**Common Issue: 404 on API calls**
→ Check that Web App URL is correct and ends with `/exec`

**Common Issue: 403 Forbidden**
→ Re-authorize the Apps Script deployment
