# Phase 3C: Advanced Stats Dashboard Plan

## Analysis of Target Screenshot (IMG_0082.PNG)

### Current Implementation Status
Based on our existing StatsDashboard.tsx and statsCalculations.ts:

#### ✅ Already Implemented (Phase 3A & 3B)
- Summary cards (Kill Ratio, Ace Ratio, Blocks, Kills, Aces, Opp Errors)
- Momentum indicator
- Point progression chart
- Scoring runs chart
- Action breakdown chart

#### ❌ Missing from Screenshot Analysis

### Required Visualizations from Screenshot

#### 1. **Top Summary Row** (3 stat cards)
- **Left**: Opponent Errors (9 vs 12)
- **Middle**: Aces (3 vs 3)
- **Right**: Attacks (13 vs 6)

Status: ✅ **Partially implemented** - We have these in summary cards but layout needs adjustment

---

#### 2. **Hit vs Ace Ratio** (Stacked Horizontal Bar Charts)
Shows attack attempts breakdown by player with kills vs errors

**Home Hit vs Ace Ratio:**
- X-axis: Percentage (0% to 100%)
- Y-axis: Two rows - Aces and Hits
- Stacked bars showing different players in different colors
- Example: "Yan: 4, Elly: 3, Toby: 2, Toby: 2, Alice: 1"

**Opponent Hit vs Ace Ratio:**
- Same layout for opponent team
- Example: "07 Zoe: 3, 16 Katie: 1, 18 Gioia: 1, 04 Juliana: 1"

Status: ❌ **NOT IMPLEMENTED**

**Data Required:**
- Player-level attack attempts (kills + errors)
- Player-level aces
- Grouped by team
- Percentage calculation per player

---

#### 3. **Attack K/D Efficiency** (Vertical Bar Charts)
Shows individual player attack efficiency with kills/errors/attempts breakdown

**Home Attack K/D Efficiency:**
- X-axis: Player names
- Y-axis: Value (0 to 1)
- Each bar shows:
  - Kills count
  - Errors count
  - Attempts count
  - Efficiency value (K-E)/Attempts
- Example: "Yan: Kills 4, Errors 4, Attempts 4"

**Opponent Attack K/D Efficiency:**
- Same layout
- Side label shows: "Kills: 3, Errors: 2, Attempts: 5"

Status: ✅ **IMPLEMENTED** - Function `calculatePlayerKDStats()` exists but needs UI component

---

#### 4. **Kill Zones by Player** (Stacked Horizontal Bar Charts)
Shows where players are scoring kills by court zone

**Home Kill Zones by Player:**
- X-axis: Player names vertically
- Y-axis: Count (0 to 4)
- Stacked bars showing different zones
- Zones: OH (Line), OH (Cross), MB (2), 2nd Tempo, MB (B), Oppo (Line)
- Players color-coded in legend

**Opponent Kill Zones by Player:**
- Same layout for opponent

Status: ✅ **IMPLEMENTED** - Function `calculateKillZones()` exists but needs UI component

---

#### 5. **Attack Attempts by Position** (Stacked Horizontal Bar Charts)
Shows distribution of attacks by court position

**Home Attack Attempts by Position:**
- X-axis: Position (OH, MB, Oppo, BackRow)
- Y-axis: Count (0 to 8)
- Stacked bars by player
- Player names in legend

**Opponent Attack Attempts by Position:**
- Same layout

Status: ✅ **IMPLEMENTED** - Function `calculateAttackDistribution()` exists but needs UI component

---

## Implementation Plan

### Phase 3C Tasks

#### Task 1: Create PlayerHitAceRatioChart Component
**Priority: HIGH**

**What to build:**
- Stacked horizontal bar chart showing player contributions to:
  - Ace row: Player ace counts
  - Hit row: Player attack counts (kills + errors)
- Show both home and opponent teams
- Color-code each player differently
- Show counts inside bars

**Data source:**
- Extend `calculatePlayerKDStats()` to include aces
- Create new `calculatePlayerAttackContributions()` function

**Files to create:**
- `/src/features/inGameStats/components/PlayerHitAceRatioChart.tsx`
- `/src/features/inGameStats/components/PlayerHitAceRatioChart.css`

---

#### Task 2: Create AttackKDEfficiencyChart Component
**Priority: HIGH**

**What to build:**
- Vertical bar chart showing player attack efficiency
- Each bar displays:
  - Kills (top label)
  - Errors (middle label)
  - Attempts (bottom label)
- Calculate efficiency: (Kills - Errors) / Attempts
- Show both home and opponent teams side by side

**Data source:**
- Use existing `calculatePlayerKDStats()` function
- Already has kills, errors, attempts, efficiency

**Files to create:**
- `/src/features/inGameStats/components/AttackKDEfficiencyChart.tsx`
- `/src/features/inGameStats/components/AttackKDEfficiencyChart.css`

---

#### Task 3: Create KillZonesByPlayerChart Component
**Priority: MEDIUM**

**What to build:**
- Stacked vertical bar chart
- X-axis: Kill zones (OH Line, OH Cross, MB 2, 2nd Tempo, MB B, Oppo Line, etc.)
- Y-axis: Count
- Stack bars by player
- Color-code each player
- Show both home and opponent teams

**Data source:**
- Use existing `calculateKillZones()` function
- Group by zone, then by player
- Aggregate counts

**Files to create:**
- `/src/features/inGameStats/components/KillZonesByPlayerChart.tsx`
- `/src/features/inGameStats/components/KillZonesByPlayerChart.css`

---

#### Task 4: Create AttackAttemptsByPositionChart Component
**Priority: MEDIUM**

**What to build:**
- Stacked vertical bar chart
- X-axis: Positions (OH, MB, Oppo, BackRow)
- Y-axis: Count
- Stack bars by player
- Color-code each player
- Show both home and opponent teams

**Data source:**
- Use existing `calculateAttackDistribution()` function
- Need to enhance to include player-level data
- Currently only returns position-level aggregates

**Files to update:**
- Extend `calculateAttackDistribution()` to include player breakdown
- Create `/src/features/inGameStats/components/AttackAttemptsByPositionChart.tsx`
- Create `/src/features/inGameStats/components/AttackAttemptsByPositionChart.css`

---

#### Task 5: Update StatsDashboard Layout
**Priority: HIGH**

**What to update:**
- Reorganize to match screenshot layout
- Top: Summary cards (Opponent Errors, Aces, Attacks)
- Section 2: Hit vs Ace Ratio charts (side by side)
- Section 3: Attack K/D Efficiency charts (side by side)
- Section 4: Kill Zones by Player charts (side by side)
- Section 5: Attack Attempts by Position charts (side by side)
- Add "Show info" / "Hide info" toggle to control visibility

**Files to update:**
- `/src/features/inGameStats/components/StatsDashboard.tsx`
- `/src/features/inGameStats/components/StatsDashboard.css`

---

#### Task 6: Add Player Data Integration
**Priority: CRITICAL**

**Problem:** Current point data stores player IDs, but chart components need player names

**Solution:**
- Ensure MatchContext provides player roster lookup
- Create utility function `getPlayerName(playerId, roster)`
- Use in all chart components to display names instead of IDs

**Files to update:**
- `/src/features/inGameStats/utils/playerHelpers.ts` (new file)
- All chart components

---

## Data Format Reference

### Point Data Structure (from InGameTrends sheet)
```typescript
{
  point_number: number,
  winning_team: 'home' | 'opponent',
  action_type: string,  // 'Att.', 'Ser.', 'Blo.', 'Op. E.', etc.
  action: string,       // 'Kill', 'Tip/Roll', 'Ace', etc.
  locationTempo: string, // 'OH (Line)', 'MB (2)', etc.
  home_player: string,   // Player ID
  opponent_player: string, // Player ID
  home_score: number,
  opponent_score: number
}
```

### Player Data Structure (from PlayerInfo sheet)
```typescript
{
  Id: string,
  PreferredName: string,
  JerseyNumber: number,
  MainPosition: string,
  TeamId: string
}
```

---

## Technical Considerations

### Chart Library
- Continue using existing chart setup (likely Chart.js or custom SVG)
- Ensure consistent styling with Phase 3B charts
- Add responsive sizing for mobile view

### Performance
- Memoize all stat calculations with `useMemo`
- Only recalculate when `currentSetData` changes
- Avoid recalculating entire stats on every render

### Color Palette
- Define consistent color scheme for players
- Use distinct colors for 6-8 players per team
- Ensure colors are accessible (WCAG AA contrast)

### Toggle Functionality
- Add "Show info" / "Hide info" button at top
- Store visibility state in component state
- Animate chart appearance/disappearance

---

## Testing Strategy

1. **Use match ID: dcd06919-7d7b-48a4-9e4a-56cf3b182687**
   - This is the sample data from InGameTrends sheet
   - Should match the screenshot visualization

2. **Test with current match data**
   - Record new points in active match
   - Verify charts update in real-time

3. **Edge cases:**
   - No data (empty match)
   - Single player dominating (one player has all attacks)
   - Tie scores
   - Missing player data

---

## Success Criteria

✅ All 5 chart types from screenshot are implemented
✅ Charts display correct data from sample match
✅ Player names display correctly (not IDs)
✅ Charts are responsive on mobile
✅ Toggle "Show/Hide info" works smoothly
✅ Performance: No lag when recording points
✅ Visual design matches screenshot style

---

## Estimated Effort

- **Task 1** (Hit/Ace Ratio): 4 hours
- **Task 2** (K/D Efficiency): 3 hours
- **Task 3** (Kill Zones): 4 hours
- **Task 4** (Attack by Position): 3 hours
- **Task 5** (Dashboard Layout): 2 hours
- **Task 6** (Player Integration): 2 hours

**Total: ~18 hours**

---

## Next Steps

1. Review this plan with user
2. Confirm data format from InGameTrends sheet
3. Start with Task 1 (Hit/Ace Ratio) as proof of concept
4. Iterate and get feedback before completing all charts
