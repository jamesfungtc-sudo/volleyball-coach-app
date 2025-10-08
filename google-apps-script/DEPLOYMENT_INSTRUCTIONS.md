# Google Apps Script Deployment Instructions

## Critical Fixes Applied

### Issue 1: CORS Preflight Error (FIXED)
**Problem:** POST requests from the React app were failing with CORS error because the Google Apps Script didn't handle OPTIONS preflight requests properly.

**Solution:** Added `doOptions()` handler with correct CORS headers and JSON MIME type to all responses.

### Issue 2: React Infinite Loop (FIXED)
**Problem:** `PointEntryForm.tsx` had an infinite render loop in useEffect at line 128.

**Solution:** Changed dependency array from `[state]` to specific fields that affect form completion.

## The Complete Fix

The Code.gs now includes:
1. **doOptions() handler** - Handles CORS preflight requests
2. **CORS headers on all responses** - Ensures GET and POST work from browsers
3. **JSON MIME type** - Critical for browser CORS handling

## Deployment Steps

### Step 1: Update Google Apps Script Code

1. Open your Google Sheet:
   - URL: https://docs.google.com/spreadsheets/d/1SAdTpnh_uhOK0BKpM8PU5nyrqm8BqR3ZfUpXQIIYIGo/edit

2. Open Apps Script Editor:
   - Click **Extensions** > **Apps Script**

3. Replace ALL code with the updated `Code.gs`:
   - Copy the entire contents of this repository's `google-apps-script/Code.gs`
   - Paste into the Apps Script editor, replacing all existing code
   - Click **Save** (💾 icon)

### Step 2: Deploy the Web App

**IMPORTANT:** You MUST create a NEW version for changes to take effect!

#### Option A: Update Existing Deployment (Recommended)

1. Click **Deploy** > **Manage deployments**
2. Click the pencil icon ✏️ next to your active deployment
3. Under **Version**, click "New version"
4. Add description: "CORS fix + latest updates"
5. Click **Deploy**
6. The URL will remain the same - no need to update .env
7. Click **Done**

#### Option B: Create New Deployment

If you prefer a fresh deployment:

1. Click **Deploy** > **New deployment**
2. Click the gear icon ⚙️ next to "Select type"
3. Choose **Web app**
4. Configure deployment:
   - **Description:** "CORS fix + latest updates"
   - **Execute as:** Me (your email)
   - **Who has access:** Anyone
5. Click **Deploy**
6. Copy the new Web App URL
7. Update your `.env.local` with the new URL
8. Click **Done**

### Step 3: Update React App (if needed)

If you created a new deployment (Option B), update `.env.local`:

```bash
VITE_GOOGLE_SHEETS_API_URL=https://script.google.com/macros/s/YOUR_NEW_DEPLOYMENT_ID/exec
```

If you updated existing deployment (Option A), no changes needed.

### Step 4: Restart React Development Server

```bash
# Stop the dev server (Ctrl+C)
# Then restart it
npm run dev
```

## Testing the Fix

### Test 1: Verify GET Requests Still Work

Open browser console and run:

```javascript
fetch('https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=health')
  .then(r => r.json())
  .then(d => console.log('GET test:', d));
```

Expected result:
```json
{
  "status": 200,
  "data": {
    "status": "ok",
    "timestamp": "..."
  }
}
```

### Test 2: Verify POST Requests Work

Open browser console and run:

```javascript
fetch('https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'saveMatch',
    data: {
      gameDate: '2025-10-08',
      homeTeam: 'TEST_HOME',
      opponentTeam: 'TEST_OPPONENT',
      sets: []
    }
  })
})
  .then(r => r.json())
  .then(d => console.log('POST test:', d));
```

Expected result:
```json
{
  "status": 200,
  "data": {
    "success": true,
    "matchId": "...",
    "message": "Match saved successfully"
  }
}
```

### Test 3: Verify No Infinite Loop in React

1. Open your React app: http://localhost:5174
2. Navigate to the In-Game Stats page
3. Open browser DevTools Console
4. Look for any errors or infinite loop warnings
5. Try entering a point - form should work smoothly

## What Changed in Code.gs

### 1. Added doOptions() Handler (Lines 42-50)

```javascript
function doOptions(e) {
  return ContentService
    .createTextOutput()
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type')
    .setHeader('Access-Control-Max-Age', '86400');
}
```

This handles CORS preflight requests (OPTIONS) that browsers send before POST requests.

### 2. Updated createResponse() Function (Lines 396-408)

Added CORS headers to all responses:

```javascript
function createResponse(data, status = 200) {
  const response = {
    status: status,
    data: data
  };

  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
```

## What Changed in PointEntryForm.tsx

### Fixed useEffect Dependency Array (Line 131)

**Before:**
```typescript
useEffect(() => {
  const complete = isFormComplete(state);
  if (complete !== state.isValid) {
    dispatch({ type: 'SET_ERRORS', payload: {} });
  }
}, [state]); // ❌ Caused infinite loop
```

**After:**
```typescript
useEffect(() => {
  const complete = isFormComplete(state);
  if (complete !== state.isValid) {
    dispatch({ type: 'SET_ERRORS', payload: {} });
  }
}, [state.winLoss, state.category, state.subcategory, state.locationTempo, state.player, state.isValid]); // ✅ Only specific fields
```

**Why this fixes the infinite loop:**
- Before: Depended on entire `state` object → `state.errors` changes → triggers useEffect → changes state again → infinite loop
- After: Only depends on fields that actually affect form completion, breaking the cycle

## Troubleshooting

### CORS Error Still Occurring

1. **Did you deploy a new version?**
   - Apps Script changes don't take effect until you deploy a new version
   - Follow Step 2 carefully - must click "New version" or create new deployment

2. **Is the deployment set to "Anyone"?**
   - Open **Deploy** > **Manage deployments**
   - Verify "Who has access" is set to "Anyone"
   - NOT "Anyone with Google account"

3. **Are you using the correct URL?**
   - Check your `.env.local` file
   - The URL should end with `/exec`, not `/dev`
   - Make sure it's the current deployment URL

4. **Clear browser cache:**
   - CORS responses can be cached by browsers
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Or clear cache: Ctrl+Shift+Delete

### GET Works But POST Still Fails

1. Check browser console for the exact error message
2. Verify the POST request has `Content-Type: application/json` header
3. Try the POST test from the Testing section above
4. Make sure you deployed a NEW version (not just saved the code)

### React Infinite Loop Still Occurring

1. **Did you restart the dev server?**
   - Stop the server (Ctrl+C)
   - Clear Vite cache: `rm -rf node_modules/.vite`
   - Restart: `npm run dev`

2. **Check the file was saved:**
   - Open `/src/features/inGameStats/components/PointEntryForm.tsx`
   - Verify line 131 has the updated dependency array with specific fields

3. **Check browser console:**
   - Look for the error message "Maximum update depth exceeded"
   - If you see it, the fix wasn't applied correctly

## Summary

Both critical issues have been fixed:

1. **CORS Issue:**
   - Added `doOptions()` handler for preflight requests
   - Added CORS headers to all responses
   - Now GET and POST requests work from browsers

2. **Infinite Loop:**
   - Fixed useEffect dependency array in `PointEntryForm.tsx`
   - Changed from `[state]` to specific fields only
   - Form now renders correctly without infinite loops

Follow the deployment steps carefully, especially creating a NEW version for the Apps Script changes to take effect.

## Key Points

- **Google Apps Script:** Changes require creating a NEW deployment version
- **React App:** Changes require restarting the dev server
- **CORS:** The `doOptions()` handler is critical for POST requests
- **MIME Type:** Must be JSON for CORS to work correctly
- **Deployment Access:** Must be set to "Anyone" (not "Anyone with Google account")

If you encounter any issues, check the Troubleshooting section or review the test cases to verify each fix is working correctly.
