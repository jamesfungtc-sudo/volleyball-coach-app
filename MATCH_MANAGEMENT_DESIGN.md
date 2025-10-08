# Match Management UI/UX Design

Complete design specification for implementing match selection and creation workflow.

---

## 🎯 Quick Summary

**Goal**: Allow users to view existing matches and create new matches with minimal friction.

**Solution**: 3-screen flow optimized for iPad coaches:
1. **Match List** (Home) → See all matches, tap to open
2. **Match Setup** (Modal) → Quick team entry, start new match
3. **Stats Page** (Enhanced) → Your existing point entry + stats (add back button)

---

## 📊 Data Analysis Results

**Current Google Sheets Data**:
- ✅ 2 matches in InGameTrends sheet
- ✅ Match 1: 4 sets, 47 points in set 1
- ✅ Teams stored as UUIDs (need name resolver)
- ✅ Players stored as strings ("Toby", "04 Juliana")
- ❌ No Teams sheet exists yet

**Recommendation**: Keep it simple - use string team names, add Teams sheet later.

---

## 🚀 Implementation Plan

### Phase 1: Core Match Management (Week 1)
**Priority: HIGH - Start Here**

1. **Install React Router**
   ```bash
   npm install react-router-dom
   ```

2. **Create Match List Page**
   - `/src/pages/MatchListPage.tsx` - Main landing screen
   - `/src/features/matchManagement/components/MatchCard.tsx` - Match display cards
   - `/src/features/matchManagement/hooks/useMatchList.ts` - Fetch matches
   - `/src/utils/teamNameResolver.ts` - Convert UUIDs to readable names

3. **Enhance StatsPage Navigation**
   - Add back button to return to Match List
   - Add navigation bar component

4. **Test with Real Data**
   - Connect to Google Sheets API
   - Display your 2 existing matches
   - Navigate to existing match

**Deliverable**: Can view and navigate to existing matches ✅

---

### Phase 2: New Match Creation (Week 2)
**Priority: HIGH**

5. **Create Match Setup Screen**
   - `/src/pages/MatchSetupPage.tsx` - New match form
   - Simple text inputs for team names
   - Date picker (default today)
   - Optional: Quick-add players

6. **Implement Create Match API**
   - Call `saveMatch()` from googleSheetsAPI
   - Navigate to StatsPage with new match
   - Auto-save points to Google Sheets

**Deliverable**: Can create new matches and start tracking ✅

---

### Phase 3: Polish (Week 3+)
**Priority: MEDIUM**

- Match completion detection
- Edit/delete matches
- Player management UI
- Animations and loading states
- Teams/Players sheets (optional)

---

## 🎨 Screen Designs

### 1. Match List Screen (Landing Page)

```
+----------------------------------------------------------+
|  Volleyball Coach App                    [+ New Match]   |
+----------------------------------------------------------+
|                                                           |
|  Matches                                                  |
|                                                           |
|  +----------------+  +----------------+                   |
|  | ONGOING        |  | COMPLETED      |                   |
|  |                |  |                |                   |
|  | Eagles vs Hawks|  | Lions vs Tigers|                   |
|  |                |  |                |                   |
|  | Set 2 - Live   |  | Oct 5, 2025    |                   |
|  | 15-12          |  | W 3-1          |                   |
|  |                |  |                |                   |
|  | [Continue]     |  | [View Stats]   |                   |
|  +----------------+  +----------------+                   |
|                                                           |
+----------------------------------------------------------+
```

**Key Features**:
- **Status badges**: Orange (ongoing), Gray (completed)
- **Quick actions**: Continue ongoing match, View stats for completed
- **Prominent CTA**: "New Match" button top-right
- **2-3 column grid** on iPad

---

### 2. Match Setup Screen (Modal)

```
+----------------------------------------------------------+
|  [< Back]  New Match Setup                               |
+----------------------------------------------------------+
|                                                           |
|  Match Details                                            |
|  +------------------------------------------------------+ |
|  | Date:  [Oct 8, 2025 ▼]                               | |
|  +------------------------------------------------------+ |
|                                                           |
|  Teams                                                    |
|  +------------------------------------------------------+ |
|  | Home Team:     [Eagles            ]                  | |
|  +------------------------------------------------------+ |
|  +------------------------------------------------------+ |
|  | Opponent Team: [Hawks             ]                  | |
|  +------------------------------------------------------+ |
|                                                           |
|  Players (Optional - can add during game)                 |
|  +------------------------------------------------------+ |
|  | [+ Quick Add Players]                                | |
|  +------------------------------------------------------+ |
|                                                           |
|                        [Start Match]                      |
|                                                           |
+----------------------------------------------------------+
```

**Key Features**:
- **Minimal required fields**: Just teams + date
- **Player entry optional**: Can add during game
- **Large "Start Match" button**: Disabled until teams entered
- **Slide-up modal** presentation

---

### 3. Stats Page (Enhanced with Navigation)

```
+----------------------------------------------------------+
|  [< Matches]  Eagles vs Hawks               EAGLES  15   |
|                                                  -        |
|                                             HAWKS   12    |
+----------------------------------------------------------+
|  [Set 1] [Set 2] [Set 3] [Set 4] [Set 5]  [Add][Show]   |
+----------------------------------------------------------+
|                                                           |
|  [Your existing Point Entry Form]                        |
|  [Your existing Stats Dashboard]                         |
|                                                           |
+----------------------------------------------------------+
```

**Key Changes**:
- ✅ Add "< Matches" back button
- ✅ Auto-save points to Google Sheets
- ✅ Show sync status (checkmark/spinner)

---

## 📁 File Structure

### New Files to Create

```
/src
  /pages
    MatchListPage.tsx                    [NEW]
    MatchListPage.css                    [NEW]
    MatchSetupPage.tsx                   [NEW]
    MatchSetupPage.css                   [NEW]

  /features
    /matchManagement                     [NEW FEATURE]
      /components
        MatchCard.tsx
        MatchCard.css
        MatchList.tsx
        TeamSelector.tsx
      /hooks
        useMatchList.ts
        useCreateMatch.ts
      /context
        MatchListContext.tsx

  /components
    /navigation
      AppNavigationBar.tsx               [NEW]
      AppNavigationBar.css               [NEW]
    /common
      StatusBadge.tsx                    [NEW]
      EmptyState.tsx                     [NEW]

  /utils
    teamNameResolver.ts                  [NEW]
    matchStatusCalculator.ts             [NEW]
```

### Files to Modify

```
/src/pages/StatsPage.tsx               [ADD: Navigation bar]
/src/services/googleSheetsAPI.ts       [ADD: Status calculation]
/src/types/inGameStats.types.ts        [ADD: match status field]
/src/App.tsx                           [ADD: React Router routes]
```

---

## 🔧 Technical Implementation

### 1. Install Dependencies

```bash
npm install react-router-dom
npm install framer-motion  # Optional: for animations
```

### 2. Setup Routes

```typescript
// /src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter basename="/volleyball-coach-app">
      <Routes>
        <Route path="/" element={<MatchListPage />} />
        <Route path="/match/new" element={<MatchSetupPage />} />
        <Route path="/match/:matchId" element={<StatsPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### 3. Team Name Resolver Utility

```typescript
// /src/utils/teamNameResolver.ts

// Temporary mapping for UUID teams (until Teams sheet exists)
const TEAM_NAME_MAP: Record<string, string> = {
  'c2acb531-9e4b-40be-8c76-8c9ee7239620': 'Eagles',
  '9a6c6891-690d-44c1-95d9-352b55334e83': 'Hawks',
};

export function resolveTeamName(teamIdOrName: string): string {
  // If it's already a readable name, return it
  if (!teamIdOrName.includes('-')) {
    return teamIdOrName;
  }

  // Try to resolve from map
  return TEAM_NAME_MAP[teamIdOrName] || 'Unknown Team';
}
```

### 4. Match Status Calculator

```typescript
// /src/utils/matchStatusCalculator.ts

export function calculateMatchStatus(sets: SetData[]): 'ongoing' | 'completed' {
  const setsWon = { home: 0, opponent: 0 };

  sets.forEach(set => {
    if (set.points.length === 0) return;
    const lastPoint = set.points[set.points.length - 1];

    // Check if set is complete (25+ points with 2-point lead)
    if (lastPoint.home_score >= 25 || lastPoint.opponent_score >= 25) {
      if (lastPoint.home_score > lastPoint.opponent_score) {
        setsWon.home++;
      } else {
        setsWon.opponent++;
      }
    }
  });

  // Match complete when one team wins 3 sets
  return (setsWon.home >= 3 || setsWon.opponent >= 3) ? 'completed' : 'ongoing';
}
```

### 5. Enhanced Data Type

```typescript
// /src/types/inGameStats.types.ts

export interface MatchData {
  id: string;
  match_date: string;
  status: 'ongoing' | 'completed';  // ADD THIS
  home_team: TeamData;
  opponent_team: TeamData;
  sets: SetData[];
}
```

---

## 🎯 User Flows

### Flow 1: Start New Match (Pre-game)

```
User opens app
  ↓
Sees Match List (existing matches)
  ↓
Taps "New Match" button
  ↓
Match Setup screen appears
  ↓
Enters team names (Eagles vs Hawks)
  ↓
(Optional: Adds players)
  ↓
Taps "Start Match"
  ↓
Navigates to Stats Page (point entry)
  ↓
Starts recording points
```

**Estimated time**: 30 seconds

---

### Flow 2: Continue Existing Match (During game)

```
User opens app
  ↓
Sees Match List
  ↓
Taps "Continue" on ongoing match card
  ↓
Immediately opens Stats Page (point entry)
  ↓
Continues recording points
```

**Estimated time**: 5 seconds (2 taps)

---

### Flow 3: Review Past Match (Post-game)

```
User opens app
  ↓
Sees Match List
  ↓
Taps "View Stats" on completed match
  ↓
Opens Stats Page (defaults to "Show Info" view)
  ↓
Reviews statistics and charts
```

---

## 🔑 Key Design Decisions

### Decision 1: Match List as Landing Page
**Why**: Coaches need to see existing matches first. Common use case is continuing or reviewing matches.

### Decision 2: Simple Team Names (No Teams Sheet)
**Why**: Faster development, works with existing data, can upgrade later.

### Decision 3: Minimal Required Fields
**Why**: Coaches are busy pre-game. Only require teams + date. Players can be added during game.

### Decision 4: Auto-Calculate Match Status
**Why**: Always accurate, no manual "End Match" needed, survives app refresh.

### Decision 5: Modal for New Match
**Why**: Quick access, doesn't interrupt current context, standard iOS pattern.

---

## ✅ Success Metrics

- **Time to start new match**: < 30 seconds
- **Time to continue match**: < 5 seconds (2 taps)
- **Match list load time**: < 2 seconds
- **Point to API sync**: < 500ms

---

## 📝 Next Steps

### Immediate Action Items

1. **Review this design** - Confirm approach
2. **Install React Router** - Setup navigation
3. **Create MatchListPage skeleton** - Start with mock data
4. **Build MatchCard component** - Display single match
5. **Connect to Google Sheets** - Load real matches
6. **Test navigation** - Verify flow works

### Questions to Decide

- [ ] Do you want player management now or later?
- [ ] Should we create a Teams sheet or keep it simple?
- [ ] Any custom branding/colors for your team?
- [ ] iPad portrait, landscape, or both?

---

## 📚 Resources

- Full design spec: See agent response above
- Google Sheets API: [googleSheetsAPI.ts](./src/services/googleSheetsAPI.ts)
- Current StatsPage: [StatsPage.tsx](./src/pages/StatsPage.tsx)
- Data types: [inGameStats.types.ts](./src/types/inGameStats.types.ts)

---

**Ready to implement?** Let me know if you'd like me to start building Phase 1!
