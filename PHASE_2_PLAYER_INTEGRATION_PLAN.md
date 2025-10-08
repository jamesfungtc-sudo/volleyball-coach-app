# Phase 2: Player Data Integration Plan

## Problem Statement

Currently, the StatsPage uses **mock player data** for point entry. When users select a real match from Google Sheets, the app needs to:

1. Load the correct players for each team (home and opponent)
2. Filter player dropdowns to show only relevant team players
3. Display player info: PreferredName (#JerseyNumber) MainPosition

## Data Structure Understanding

### PlayerInfo Sheet
```json
{
  "Id": "46c90cd3-1f46-43b9-94a9-593ba8f717b2",
  "PreferredName": "Alice",
  "MainPosition": "Outside",
  "SecondaryPosition": "Middle",
  "TeamId": "c2acb531-9e4b-40be-8c76-8c9ee7239620",
  "JerseyNumber": 5
}
```

### Key Relationships
- **PlayerInfo.TeamId** → **TeamInfo.Id** (UUID link)
- **InGameTrends.homeTeam** → **TeamInfo.Id**
- **InGameTrends.opponentTeam** → **TeamInfo.Id**

### Data Flow
```
Match Selected
  ↓
Load Match Data (home_team.id, opponent_team.id)
  ↓
Filter Players: WHERE TeamId = home_team.id
Filter Players: WHERE TeamId = opponent_team.id
  ↓
Store in MatchContext: { homeRoster: [...], opponentRoster: [...] }
  ↓
PointEntry uses filtered lists in dropdowns
```

## Implementation Tasks

### Task 1: API Layer Enhancement
**File**: `src/services/googleSheetsAPI.ts`

Add new function:
```typescript
export async function getPlayersByTeam(teamId: string): Promise<Player[]> {
  const allPlayers = await getPlayers();
  return allPlayers
    .filter(p => p.TeamId === teamId)
    .map(p => ({
      id: p.Id,
      name: p.PreferredName || `#${p.JerseyNumber}`,
      jerseyNumber: p.JerseyNumber,
      position: p.MainPosition || 'Unknown'
    }));
}
```

### Task 2: Match Context Enhancement
**File**: `src/contexts/MatchContext.tsx`

Update MatchContext to include:
```typescript
interface MatchContextType {
  match: MatchData;
  homeRoster: Player[];      // NEW
  opponentRoster: Player[];  // NEW
  updateMatch: (updates: Partial<MatchData>) => void;
  // ... existing methods
}
```

### Task 3: StatsPage Player Loading
**File**: `src/pages/StatsPage.tsx`

When match loads, fetch team rosters:
```typescript
async function loadMatch() {
  const matchData = await getMatch(matchId);

  // Load players for both teams
  const [homeRoster, opponentRoster] = await Promise.all([
    getPlayersByTeam(matchData.home_team.id),
    getPlayersByTeam(matchData.opponent_team.id)
  ]);

  setMatch(matchData);
  setHomeRoster(homeRoster);
  setOpponentRoster(opponentRoster);
}
```

### Task 4: PointEntry Component Update
**File**: `src/components/in-game-stats/PointEntry.tsx`

Replace mock player data with context:
```typescript
const { homeRoster, opponentRoster } = useMatchContext();

// Home player dropdown
<select value={homePlayer} onChange={handleHomePlayerChange}>
  <option value="">Select Player</option>
  {homeRoster.map(p => (
    <option key={p.id} value={p.id}>
      {p.name} (#{p.jerseyNumber}) - {p.position}
    </option>
  ))}
</select>

// Opponent player dropdown
<select value={opponentPlayer} onChange={handleOpponentPlayerChange}>
  <option value="">Select Player</option>
  {opponentRoster.map(p => (
    <option key={p.id} value={p.id}>
      {p.name} (#{p.jerseyNumber}) - {p.position}
    </option>
  ))}
</select>
```

### Task 5: Match Setup Screen (New Matches)
**File**: `src/pages/MatchSetupPage.tsx` (NEW)

For creating new matches, allow team selection:
```typescript
export default function MatchSetupPage() {
  const [teams, setTeams] = useState([]);
  const [homeTeamId, setHomeTeamId] = useState('');
  const [opponentTeamId, setOpponentTeamId] = useState('');
  const [matchDate, setMatchDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    async function loadTeams() {
      const data = await getTeams();
      setTeams(data);
    }
    loadTeams();
  }, []);

  async function handleCreateMatch() {
    // Create new match with selected teams
    // Navigate to /in-game-stats/new?homeTeam={id}&opponentTeam={id}
  }

  return (
    <div className="match-setup-page">
      <h1>New Match Setup</h1>

      <label>Home Team</label>
      <select value={homeTeamId} onChange={e => setHomeTeamId(e.target.value)}>
        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>

      <label>Opponent Team</label>
      <select value={opponentTeamId} onChange={e => setOpponentTeamId(e.target.value)}>
        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>

      <label>Match Date</label>
      <input type="date" value={matchDate} onChange={e => setMatchDate(e.target.value)} />

      <button onClick={handleCreateMatch}>Start Match</button>
    </div>
  );
}
```

## Simplified Phase 2 Flow

### User Journey for Existing Match
1. User clicks match card on MatchListPage
2. App navigates to `/in-game-stats/{matchId}`
3. StatsPage loads:
   - Match data from InGameTrends
   - Home team roster from PlayerInfo (filtered by home_team.id)
   - Opponent team roster from PlayerInfo (filtered by opponent_team.id)
4. PointEntry dropdowns show correct players
5. User records points with real player data

### User Journey for New Match
1. User clicks "+ New Match" on MatchListPage
2. App navigates to `/in-game-stats/setup` (NEW SCREEN)
3. User selects:
   - Home team (from TeamInfo)
   - Opponent team (from TeamInfo)
   - Match date
4. App creates match ID and navigates to `/in-game-stats/new?homeTeam={id}&opponentTeam={id}`
5. StatsPage loads players for both teams
6. User records points

## Data Types

### Player Type
```typescript
interface Player {
  id: string;
  name: string;
  jerseyNumber: number;
  position: string;
}
```

### Enhanced MatchData
```typescript
interface MatchData {
  id: string;
  match_date: string;
  home_team: {
    id: string;
    name: string;
    players: Player[];  // Populated from PlayerInfo
  };
  opponent_team: {
    id: string;
    name: string;
    players: Player[];  // Populated from PlayerInfo
  };
  sets: SetData[];
}
```

## Implementation Order

1. ✅ **API Enhancement** - Add `getPlayersByTeam()` function
2. ✅ **Match Context Update** - Add roster state
3. ✅ **StatsPage Loading** - Fetch players when match loads
4. ✅ **PointEntry Update** - Use real player dropdowns
5. ✅ **Match Setup Screen** - New match creation flow
6. ✅ **Testing** - Verify end-to-end workflow

## Success Criteria

- [ ] Selecting existing match loads correct players for both teams
- [ ] Point entry dropdowns show only relevant team players
- [ ] Player display format: "Name (#Jersey) - Position"
- [ ] New match creation allows team selection
- [ ] No mock data used in point entry
- [ ] Players filtered by TeamId correctly

## Notes

- Keep implementation simple - no complex roster management yet
- Focus on read-only player data for now
- Future Phase 3 could add: player substitutions, lineup management, etc.
