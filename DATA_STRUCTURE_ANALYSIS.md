# Data Structure Inconsistency Analysis

## Problem Statement
- **New match data**: Player names show correctly in Recent Points and charts
- **Old match data** (match ID: dcd06919-7d7b-48a4-9e4a-56cf3b182687): All players show as "Unknown"

## Root Cause: Different Player Data Structures

### 1. **Point Data Structure** (Consistent across old and new)

Both old and new matches store player IDs in point data:
```typescript
{
  home_player: "player-uuid-here",      // Always a player ID
  opponent_player: "player-uuid-here"   // Always a player ID
}
```

✅ **This is consistent** - not the problem.

---

### 2. **Player/Roster Data Structure** (INCONSISTENT)

There are **THREE different Player type definitions** in the codebase:

#### A. `Player` interface (googleSheetsAPI.ts)
```typescript
export interface Player {
  id: string;
  name: string;
  jerseyNumber: number | string;
  position: string;
  teamId: string;
}
```

#### B. `PlayerData` interface (inGameStats.types.ts)
```typescript
export interface PlayerData {
  id: string;
  name: string;
  jersey_number: number;   // ⚠️ SNAKE_CASE
  position: string;
}
```

#### C. `RawPlayerData` interface (googleSheetsAPI.ts)
```typescript
interface RawPlayerData {
  Id: string;              // ⚠️ CAPITALIZED
  PreferredName: string;
  FirstName: string;
  LastName: string;
  MainPosition: string;
  SecondaryPosition: string;
  TeamId: string;
  JerseyNumber: number | string;  // ⚠️ CAPITALIZED
}
```

---

### 3. **How PointByPointList Works (Shows names correctly)**

Looking at `/src/features/inGameStats/components/PointByPointList.tsx:76-81`:

```typescript
const homePlayer = homeRoster.find(p => p.id === point.home_player);
const opponentPlayer = opponentRoster.find(p => p.id === point.opponent_player);

const homePlayerName = homePlayer?.name;
const opponentPlayerName = opponentPlayer?.name;
const opponentJersey = opponentPlayer?.jerseyNumber || opponentPlayer?.jersey_number;
```

**Key observation**: It tries BOTH property names:
- `opponentPlayer?.jerseyNumber` (camelCase)
- `opponentPlayer?.jersey_number` (snake_case)

This is **defensive programming** that handles both old and new formats!

---

### 4. **How New Charts Fail (Show "Unknown")**

Looking at `/src/features/inGameStats/utils/playerHelpers.ts:7-14`:

```typescript
export function getPlayerName(playerId: string | undefined, roster: Player[]): string {
  if (!playerId) return 'Unknown';

  const player = roster.find(p => p.id === playerId);
  if (!player) return 'Unknown';

  // Prefer PreferredName, fall back to jersey number
  return player.name || `#${player.jerseyNumber}`;
}
```

**Problem**:
- It expects `player.name` and `player.jerseyNumber` (camelCase)
- Old roster data might have different property names
- It doesn't fall back to check alternative property names

---

### 5. **Data Flow Comparison**

#### For NEW matches (recorded with current code):
```
Point Data → Player ID → useTeamRosters() → Player object with camelCase properties → ✅ Works
```

#### For OLD matches (dcd06919-7d7b-48a4-9e4a-56cf3b182687):
```
Point Data → Player ID → useTeamRosters() → Player object with ??? properties → ❌ "Unknown"
```

**Question**: What format does `useTeamRosters()` return for old match data?

---

### 6. **Checking useTeamRosters() Implementation**

Need to verify what `getPlayersByTeam()` returns:

From `/src/services/googleSheetsAPI.ts:229-245`:

```typescript
export async function getPlayersByTeam(teamId: string): Promise<Player[]> {
  try {
    const allPlayers = await getPlayers();

    return allPlayers
      .filter(p => p.TeamId === teamId)
      .map(p => ({
        id: p.Id,
        name: p.PreferredName || `#${p.JerseyNumber}`,
        jerseyNumber: p.JerseyNumber,
        position: p.MainPosition || 'Unknown',
        teamId: p.TeamId
      }))
      .filter(p => p.name && p.jerseyNumber !== 'null');
  }
}
```

**This SHOULD work correctly** - it transforms raw data to camelCase `Player` format.

---

### 7. **Hypothesis: The Real Issue**

The problem is likely **NOT** with the chart components or playerHelpers. The issue is probably:

1. **Old match data has team IDs that don't exist in the current TeamInfo sheet**, OR
2. **Old match data has player IDs that don't exist in the current PlayerInfo sheet**, OR
3. **`useTeamRosters()` is not loading rosters for old matches** (only loads for new matches based on match setup)

---

## Evidence Needed

To confirm the hypothesis, we need to check in the browser console:

```javascript
// When viewing the old match (dcd06919-7d7b-48a4-9e4a-56cf3b182687):
console.log('Home Roster:', homeRoster);
console.log('Opponent Roster:', opponentRoster);
console.log('Point data sample:', currentSetData[0]);
```

Expected findings:
- If rosters are **empty arrays**: Problem is in `useTeamRosters()` not loading data
- If rosters have **data but wrong IDs**: Player IDs in old match don't match current PlayerInfo sheet
- If rosters have **data with correct structure**: The `getPlayerName()` function logic issue

---

## Summary

### Why PointByPointList Works:
✅ Uses defensive programming with fallback property names (`jerseyNumber || jersey_number`)

### Why New Charts Don't Work:
❌ `getPlayerName()` only checks `player.name` and `player.jerseyNumber` (no fallbacks)

### Most Likely Root Cause:
The old match (dcd06919-7d7b-48a4-9e4a-56cf3b182687) was created with a different data structure where:
- Player objects had different property names, OR
- Player IDs in that match don't exist in the current PlayerInfo sheet, OR
- `useTeamRosters()` doesn't load rosters when viewing old saved matches (only loads for newly created matches)

---

## Recommendation

Don't make changes yet. First verify:

1. Open browser console when viewing old match
2. Check `homeRoster` and `opponentRoster` values
3. Check a sample point's `home_player` ID
4. Verify if that ID exists in the roster

This will tell us exactly what's broken and what needs to be fixed.
