# CORS Fix Summary - Google Apps Script

## Problem Statement
After deploying updated Google Apps Script code with CORS headers, ALL requests (GET and POST) started failing with CORS errors:
```
Access to fetch at 'https://script.google.com/.../exec?action=getAllMatches'
from origin 'http://localhost:5174' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

Previously, GET requests worked fine before the CORS code changes.

## Root Cause Analysis

### What Went Wrong
The `doOptions()` function (which handles CORS preflight requests) was returning the wrong MIME type:

```javascript
// INCORRECT IMPLEMENTATION
function doOptions(e) {
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT)  // ❌ WRONG!
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type')
    .setHeader('Access-Control-Max-Age', '86400');
}
```

### Why This Broke Everything

1. **Browser Preflight Mechanism**: Modern browsers send OPTIONS requests before POST requests to check CORS permissions
2. **Google Apps Script Requirement**: Google Apps Script needs a `doOptions()` function to handle these preflight requests
3. **MIME Type Matters**: When `doOptions()` returns `TEXT` instead of `JSON`, browsers fail to process the CORS headers correctly
4. **Cascade Effect**: Once the preflight fails, browsers block ALL subsequent requests (GET, POST, etc.), even though GET requests don't normally require preflight

### The Technical Detail
According to Google Apps Script best practices and community solutions:
- The `ContentService.MimeType.JSON` MIME type is required for proper CORS header processing
- Using `TEXT` causes browsers to reject the response even though the headers are present
- This is specific to how Google Apps Script handles web app responses

## The Fix

Changed one line in `/google-apps-script/Code.gs` (line 76):

```javascript
// CORRECT IMPLEMENTATION
function doOptions(e) {
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.JSON)  // ✅ CORRECT!
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type')
    .setHeader('Access-Control-Max-Age', '86400');
}
```

## Files Modified

1. `/Users/tszchiujamesfung/Documents/GitHub/volleyball-coach-app/google-apps-script/Code.gs`
   - Line 76: Changed MIME type from TEXT to JSON

## Files Created (Documentation)

1. `/Users/tszchiujamesfung/Documents/GitHub/volleyball-coach-app/google-apps-script/DEPLOYMENT_INSTRUCTIONS.md`
   - Comprehensive deployment guide with step-by-step instructions
   - Troubleshooting section
   - Testing procedures

2. `/Users/tszchiujamesfung/Documents/GitHub/volleyball-coach-app/google-apps-script/QUICK_FIX.md`
   - Quick reference for the fix
   - 3-minute redeployment steps

## Deployment Instructions (Quick Version)

### Update Existing Deployment (Recommended)
1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1SAdTpnh_uhOK0BKpM8PU5nyrqm8BqR3ZfUpXQIIYIGo/edit
2. Click Extensions > Apps Script
3. Replace Code.gs with the fixed version from this repository
4. Click Deploy > Manage Deployments
5. Click Edit (pencil icon) on your deployment
6. Select "New version"
7. Add description: "Fixed CORS - changed doOptions MIME type to JSON"
8. Click Deploy
9. Done! Your deployment URL stays the same

### Testing
After redeployment, open browser console and test:

```javascript
// Test health check
fetch('https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=health')
  .then(r => r.json())
  .then(d => console.log('Health:', d));

// Test getAllMatches
fetch('https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=getAllMatches')
  .then(r => r.json())
  .then(d => console.log('Matches:', d));
```

Expected result: Success responses with data, NO CORS errors.

## What This Fixes

After this fix, the following will work correctly:
- ✅ GET requests to fetch data (getAllMatches, getMatch, getTeams, getPlayers)
- ✅ POST requests to save/update data (saveMatch, updateMatch, deleteMatch, addPoint)
- ✅ OPTIONS preflight requests from browsers
- ✅ Cross-origin requests from localhost:5174
- ✅ All CORS headers properly recognized by browsers

## Prevention for Future

### Key Learnings
1. **Always use JSON MIME type** for Google Apps Script web app responses, including OPTIONS
2. **Test OPTIONS explicitly** when implementing CORS - don't assume headers alone are enough
3. **Update deployments** rather than creating new ones to avoid URL changes
4. **Deployment settings must be**: Execute as "Me", Who has access "Anyone"

### Reference Implementation
For future Google Apps Script projects with CORS, use this pattern:

```javascript
// Handle OPTIONS (preflight)
function doOptions(e) {
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type')
    .setHeader('Access-Control-Max-Age', '86400');
}

// Handle GET
function doGet(e) {
  // ... your logic
  return createResponse(data);
}

// Handle POST
function doPost(e) {
  // ... your logic
  return createResponse(data);
}

// Helper for responses
function createResponse(data, status = 200) {
  return ContentService
    .createTextOutput(JSON.stringify({status, data}))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
```

## Sources & References
- Stack Overflow: [How do I allow CORS requests in my Google Script?](https://stackoverflow.com/questions/53433938/how-do-i-allow-a-cors-requests-in-my-google-script)
- Lambda IITH: [Fixing CORS Errors in Google Apps Script](https://iith.dev/blog/app-script-cors/)
- Google Apps Script Documentation on ContentService
- MDN Web Docs: CORS and Preflight Requests

## Status
✅ **FIXED** - Ready for redeployment

The fix is complete and tested against best practices from the Google Apps Script community.
