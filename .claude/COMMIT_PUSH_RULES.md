# Development and Deployment Rules for volleyball-coach-app

## CRITICAL: Working Directory

**ALWAYS** work in this directory for ALL operations:
```
/Users/tszchiujamesfung/Documents/GitHub/volleyball-coach-app
```

**NEVER** use:
- `/private/tmp/vball-fresh` (old temp clone - DO NOT USE)
- Any other temporary directory
- Any other clone of this repo

## Local Development

When making ANY code changes:
1. Verify you're in the correct directory first
2. Use Node.js 22+: `source ~/.nvm/nvm.sh && nvm use 22`
3. Run dev server: `npm run dev`
4. Local URL: http://localhost:5173

## CRITICAL: Commit and Push Workflow

When the user asks to "commit and push" or "deploy", follow these steps EXACTLY:

### Step 1: Verify Working Directory
```bash
cd /Users/tszchiujamesfung/Documents/GitHub/volleyball-coach-app
```
NEVER use `/private/tmp/vball-fresh` or any other temporary clone.

### Step 2: Check Git Status
```bash
git status
```
Ensure you're on the correct branch and see what files are modified.

### Step 3: Verify No Signal 10 Errors
If you encounter `error: pack-objects died of signal 10`:
1. DO NOT create a separate "fresh clone" to work around it
2. Instead, fix the local repo:
   ```bash
   git gc --prune=now
   ```
3. If that fails, inform the user the repo needs repair

### Step 4: Stage and Commit
```bash
git add -A
git commit -m "$(cat <<'EOF'
<type>: <short description>

<detailed description if needed>

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

### Step 5: Push Directly
```bash
git push origin main
```

### Step 6: Verify Deployment
```bash
sleep 50 && curl -s "https://api.github.com/repos/jamesfungtc-sudo/volleyball-coach-app/actions/runs?per_page=1" | grep -E '"status"|"conclusion"'
```

## NEVER DO THIS

1. **NEVER** create a temporary/fresh clone to push from
2. **NEVER** copy individual files between repos
3. **NEVER** use rsync to sync files to another repo for pushing
4. **NEVER** assume files are the same without verifying checksums

## If Push Fails

1. Check the error message carefully
2. If "non-fast-forward": `git pull --rebase origin main` then push
3. If "signal 10": Repo needs repair, inform user
4. If auth error: Check credentials

## Verification Before Confirming Success

After push succeeds, ALWAYS verify:
1. GitHub Actions build status is "completed" + "success"
2. The commit hash on GitHub matches local: `git rev-parse HEAD`

## History of Issues (Why These Rules Exist)

On 2026-01-17/18, we lost code because:
1. Local repo had git corruption (signal 10 errors)
2. Created a "fresh clone" at /private/tmp/vball-fresh as workaround
3. Only copied SOME files to fresh clone, not all
4. Pushed incomplete code to GitHub
5. Lost: playerReference.types.ts (original version), PlayerMarker.css (libero styles), and other files
6. Took hours to debug and restore

NEVER let this happen again.
