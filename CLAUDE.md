# Claude Code Instructions for volleyball-coach-app

## CRITICAL: Working Directory

**ALWAYS** work in:
```
/Users/tszchiujamesfung/Documents/GitHub/volleyball-coach-app
```

**NEVER** use `/private/tmp/vball-fresh` or any other temp directory.

Before ANY file operation (read, write, edit), verify the path starts with:
`/Users/tszchiujamesfung/Documents/GitHub/volleyball-coach-app/`

## Project Overview
Volleyball coaching app with rotation tracking, player management, and game statistics.

## Node.js - REQUIRED
```bash
source ~/.nvm/nvm.sh && nvm use 22
```

## Git Workflow - CRITICAL

### When Asked to Commit and Push:

1. **Work directory**: `/Users/tszchiujamesfung/Documents/GitHub/volleyball-coach-app` ONLY
2. **Never create temp clones** - push directly from this repo
3. **Always verify** the GitHub Actions build succeeds after push

### Push Command Sequence:
```bash
git status
git add -A
git commit -m "<message>

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
git push origin main
# Wait and verify build
sleep 50 && curl -s "https://api.github.com/repos/jamesfungtc-sudo/volleyball-coach-app/actions/runs?per_page=1" | grep -E '"status"|"conclusion"'
```

### If Git Push Fails with Signal 10:
This indicates repo corruption. Do NOT work around it with temp clones.
Instead: `git gc --prune=now` or inform user repo needs repair.

## Node.js Version
This project requires Node.js 22+. Always use:
```bash
source ~/.nvm/nvm.sh && nvm use 22
```

## Key Files
- `src/pages/VisualTrackingPage.tsx` - Main game tracking UI
- `src/types/playerReference.types.ts` - Player reference type system (DO NOT SIMPLIFY)
- `src/features/inGameStats/components/RotationConfigModal.tsx` - Rotation configuration
- `src/utils/rotationHelpers.ts` - Rotation calculation logic
- `src/utils/volleyballSystems.js` - Volleyball system definitions

## Deployment
- GitHub Pages: https://jamesfungtc-sudo.github.io/volleyball-coach-app/
- Auto-deploys on push to main via GitHub Actions
