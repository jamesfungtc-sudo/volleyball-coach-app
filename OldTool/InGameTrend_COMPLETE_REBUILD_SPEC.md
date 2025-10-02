# 🏐 IN-GAME TREND FEATURE: COMPLETE REBUILD SPECIFICATION
**From Retool to React - Implementation-Ready Documentation**

---

## 📋 DOCUMENT PURPOSE

This is the **definitive specification** for rebuilding the In-Game Trend feature from the OldTool Retool app into the new volleyball-coach-app React application. It combines analysis of the UI screenshots, data structures, processing logic, and user workflows into an implementation-ready plan.

**Status**: ✅ Complete Analysis | 📐 Ready for Implementation

---

## 🎯 FEATURE OVERVIEW

### What It Does
The In-Game Trend feature allows volleyball coaches to:
1. **Record** point-by-point match data in real-time during games
2. **View** chronological list of all points with scores and actions
3. **Analyze** comprehensive statistics and performance metrics
4. **Compare** home team vs opponent across multiple dimensions

### Two Primary Views

**View 1: Point-by-Point List** (Hide info.)
- Chronological list of all points
- Shows score progression
- Displays player actions with color coding
- 3-column layout: Score | Home Team Action | Opponent Team Action

**View 2: Statistics Dashboard** (Show info.)
- Summary statistics (3 key metrics)
- 8 analytical charts (4 chart pairs)
- Player-specific breakdowns
- Zone and position analysis

---

## 📊 VIEW 1: POINT-BY-POINT LIST SPECIFICATION

### Layout Structure

```
┌──────────────────────────────────────────────────────────────┐
│  ← Back        In-Game Trend                          SAVE    │
├──────────────────────────────────────────────────────────────┤
│ [Set 1] Set 2  Set 3  Set 4  Set 5  Total                   │
│                                                               │
│ [Hide info.]  Show info.                                     │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Score          Home Team Action        Opponent Team Action │
│  ──────         ────────────────        ──────────────────── │
│  25 - 22        Amei Ser.Ace (On floor)                      │
│  24 - 22        Att.Tip/Roll                                 │
│  23 - 22        [20 Oriana] Setting error                    │
│  22 - 22                                Toby OtherNet touch  │
│  22 - 21        Toby Att.Hard Spike                          │
│  21 - 21                                [16 Katie] Op. Att.  │
│  ...                                                          │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### Data Display Rules

**Score Column (Left - Black Text)**
- Format: `${homeScore} - ${opponentScore}`
- Always displayed, regardless of who won
- Shows cumulative score after each point

**Home Team Actions (Center - Blue Text)**
- Displayed when: `winning_team === 'home'`
- Format patterns:
  - `${playerName} ${actionType}.${action}` (e.g., "Amei Ser.Ace (On floor)")
  - `[${jerseyNumber} ${opponentPlayerName}] ${errorType}` (when opponent error)
- Color: `#0066CC` (blue)

**Opponent Team Actions (Right - Red Text)**
- Displayed when: `winning_team === 'opponent'`
- Format patterns:
  - `${playerName} ${actionType}.${action}` (e.g., "Yan Ser. E.OUT")
  - `[${jerseyNumber} ${playerName}] Op. ${attackType}` (opponent scored)
  - `[null]` when player data missing
- Color: `#FF0000` (red)

### Examples from Screenshot

| Score | Blue (Home Win) | Red (Opponent Win) |
|-------|----------------|-------------------|
| 25-22 | Amei Ser.Ace (On floor) | |
| 24-22 | Att.Tip/Roll | |
| 23-22 | [20 Oriana] Setting error | |
| 22-22 | | Toby OtherNet touch |
| 22-21 | Toby Att.Hard Spike | |
| 21-21 | | [16 Katie] Op. Att.Hard Spike |
| 21-20 | Elly Att.Hard Spike | |
| 20-20 | | Yan Ser. E.OUT |

### Component Structure

```typescript
interface PointListProps {
  points: PointData[];
}

const PointByPointList: React.FC<PointListProps> = ({ points }) => {
  return (
    <div className="point-list">
      {points.map((point, index) => (
        <PointRow key={index} point={point} />
      ))}
    </div>
  );
};

const PointRow: React.FC<{ point: PointData }> = ({ point }) => {
  const { home_score, opponent_score, winning_team, home_player, opponent_player, action_type, action } = point;

  return (
    <div className="point-row">
      <div className="score">{home_score} - {opponent_score}</div>
      <div className="home-action" style={{ color: winning_team === 'home' ? '#0066CC' : 'transparent' }}>
        {winning_team === 'home' && formatHomeAction(point)}
      </div>
      <div className="opponent-action" style={{ color: winning_team === 'opponent' ? '#FF0000' : 'transparent' }}>
        {winning_team === 'opponent' && formatOpponentAction(point)}
      </div>
    </div>
  );
};
```

---

## 📈 VIEW 2: STATISTICS DASHBOARD SPECIFICATION

### Layout Structure

```
┌────────────────────────────────────────────────────────────┐
│  ← Back        In-Game Trend                        SAVE   │
├────────────────────────────────────────────────────────────┤
│ [Set 1] Set 2  Set 3  Set 4  Set 5  Total                 │
│                                                             │
│ Hide info.  [Show info.]                                   │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  9               Opponent Errors               12          │
│  3               Aces                          3           │
│  13              Attacks                       6           │
│                                                             │
├─────────────────────────────────┬──────────────────────────┤
│  Home Hit vs Ace Ratio          │  Opponent Hit vs Ace     │
│  [Stacked Horizontal Bar Chart] │  [Stacked Horizontal]    │
├─────────────────────────────────┼──────────────────────────┤
│  Home Attack K/D Efficiency     │  Opponent Attack K/D     │
│  [Stacked Vertical Bar Chart]   │  [Stacked Vertical]      │
├─────────────────────────────────┼──────────────────────────┤
│  Home Kill Zones by Player      │  Opponent Kill Zones     │
│  [Stacked Vertical Bar Chart]   │  [Stacked Vertical]      │
├─────────────────────────────────┼──────────────────────────┤
│  Home Attack Attempts Position  │  Opponent Attack Pos     │
│  [Stacked Vertical Bar Chart]   │  [Stacked Vertical]      │
└────────────────────────────────────────────────────────────┘
```

### Summary Statistics (Top Section)

**Three Metrics:**

1. **Opponent Errors**
   - Left value: Count of opponent errors that gave home team points
   - Right value: Count of home team errors that gave opponent points
   - Calculation:
     ```typescript
     const homeErrors = points.filter(p =>
       p.winning_team === 'home' && p.action_type === 'Op. E.'
     ).length;

     const opponentErrors = points.filter(p =>
       p.winning_team === 'opponent' &&
       (p.action_type.includes('E.') && p.action_type !== 'Op. E.')
     ).length;
     ```

2. **Aces**
   - Left value: Home team aces
   - Right value: Opponent team aces
   - Calculation:
     ```typescript
     const homeAces = points.filter(p =>
       p.winning_team === 'home' &&
       p.action_type === 'Ser.' &&
       p.action.includes('Ace')
     ).length;

     const opponentAces = points.filter(p =>
       p.winning_team === 'opponent' &&
       p.action_type === 'Op. Ace'
     ).length;
     ```

3. **Attacks**
   - Left value: Home team successful attacks
   - Right value: Opponent team successful attacks
   - Calculation:
     ```typescript
     const homeAttacks = points.filter(p =>
       p.winning_team === 'home' &&
       p.action_type === 'Att.'
     ).length;

     const opponentAttacks = points.filter(p =>
       p.winning_team === 'opponent' &&
       p.action_type === 'Op. Att.'
     ).length;
     ```

### Chart 1 & 2: Hit vs Ace Ratio

**Chart Type:** Stacked Horizontal Bar Chart (100%)

**Purpose:** Show player contribution to team's aces vs successful attacks

**Data Structure:**
```typescript
interface HitAceData {
  aces: Array<{ player: string; count: number; color: string }>;
  hits: Array<{ player: string; count: number; color: string }>;
}
```

**Calculation:**
```typescript
function calculateHitVsAce(points: PointData[], team: 'home' | 'opponent'): HitAceData {
  const filteredPoints = points.filter(p => p.winning_team === team);

  // Group by player
  const playerAces = groupBy(
    filteredPoints.filter(p =>
      (team === 'home' ? p.action_type === 'Ser.' : p.action_type === 'Op. Ace') &&
      p.action.includes('Ace')
    ),
    team === 'home' ? 'home_player' : 'opponent_player'
  );

  const playerHits = groupBy(
    filteredPoints.filter(p =>
      team === 'home' ? p.action_type === 'Att.' : p.action_type === 'Op. Att.'
    ),
    team === 'home' ? 'home_player' : 'opponent_player'
  );

  return {
    aces: Object.entries(playerAces).map(([player, points]) => ({
      player,
      count: points.length,
      color: getPlayerColor(player)
    })),
    hits: Object.entries(playerHits).map(([player, points]) => ({
      player,
      count: points.length,
      color: getPlayerColor(player)
    }))
  };
}
```

**Visual Specs:**
- Two horizontal bars (one for aces, one for hits)
- Each bar divided into colored segments (one per player)
- Number displayed inside each segment
- Legend showing player names with their colors

### Chart 3 & 4: Attack K/D Efficiency

**Chart Type:** Stacked Vertical Bar Chart with Text Labels

**Purpose:** Show each player's attack efficiency (kills, errors, attempts)

**Data Structure:**
```typescript
interface PlayerKDData {
  player: string;
  kills: number;
  errors: number;
  attempts: number;
  efficiency: number;  // (kills - errors) / attempts
  color: string;
}
```

**Calculation:**
```typescript
function calculateAttackKD(points: PointData[], team: 'home' | 'opponent'): PlayerKDData[] {
  const players = getUniquePlayers(points, team);

  return players.map(player => {
    const playerPoints = points.filter(p =>
      team === 'home' ? p.home_player === player : p.opponent_player === player
    );

    const kills = playerPoints.filter(p =>
      p.winning_team === team &&
      (team === 'home' ? p.action_type === 'Att.' : p.action_type === 'Op. Att.')
    ).length;

    const errors = playerPoints.filter(p =>
      p.winning_team !== team &&
      p.action_type === 'Sp. E.'
    ).length;

    const attempts = kills + errors + playerPoints.filter(p =>
      /* count attempts that resulted in play continuing */
    ).length;

    return {
      player,
      kills,
      errors,
      attempts,
      efficiency: attempts > 0 ? (kills - errors) / attempts : 0,
      color: getPlayerColor(player)
    };
  });
}
```

**Visual Specs:**
- X-axis: Player names
- Y-axis: Efficiency ratio (0 to 1.0)
- Bar divided into 3 sections (visually stacked)
- Text overlay on each bar: "Kills: X, Errors: Y, Attempts: Z"
- Legend showing players with colors

**Example from Screenshot:**
- Yan: Kills 4, Errors 2, Attempts 4
- Toby: Kills 2, Errors 3
- Elly: Kills 3, Errors 3

### Chart 5 & 6: Kill Zones by Player

**Chart Type:** Stacked Vertical Bar Chart

**Purpose:** Show where on the court players are scoring kills

**Data Structure:**
```typescript
interface KillZoneData {
  zone: string;  // 'OH (Line)', 'OH (Cross)', 'MB (A)', etc.
  players: Array<{
    player: string;
    count: number;
    color: string;
  }>;
}
```

**Calculation:**
```typescript
function calculateKillZones(points: PointData[], team: 'home' | 'opponent'): KillZoneData[] {
  const kills = points.filter(p =>
    p.winning_team === team &&
    (team === 'home' ? p.action_type === 'Att.' : p.action_type === 'Op. Att.')
  );

  const zones = getUniqueZones(kills);

  return zones.map(zone => {
    const zoneKills = kills.filter(p => p.locationTempo === zone);
    const playerCounts = groupBy(
      zoneKills,
      team === 'home' ? 'home_player' : 'opponent_player'
    );

    return {
      zone,
      players: Object.entries(playerCounts).map(([player, points]) => ({
        player,
        count: points.length,
        color: getPlayerColor(player)
      }))
    };
  });
}
```

**Zones from Screenshot:**
- OH (Line) - Outside hitter line shot
- OH (Cross) - Outside hitter cross-court
- MB (2) - Middle blocker 2-ball
- MB (A/B/C) - Middle blocker quick sets
- MB (Slide) - Middle blocker slide
- 2nd Tempo - Second tempo sets
- Oppo (Line/Cross) - Opposite attacks
- Back Row - Pipe, P1 back row attacks

**Visual Specs:**
- X-axis: Attack zones
- Y-axis: Count of kills
- Stacked bars (each color = different player)
- Legend with player names

### Chart 7 & 8: Attack Attempts by Position

**Chart Type:** Stacked Vertical Bar Chart

**Purpose:** Show which positions are being used for attacks and by whom

**Data Structure:**
```typescript
interface AttackPositionData {
  position: 'OH' | 'MB' | 'Oppo' | 'BackRow';
  players: Array<{
    player: string;
    attempts: number;
    color: string;
  }>;
}
```

**Calculation:**
```typescript
function calculateAttackPositions(points: PointData[], team: 'home' | 'opponent'): AttackPositionData[] {
  // Map zones to positions
  const positionMap = {
    'OH': ['OH (Line)', 'OH (Cross)'],
    'MB': ['MB (A)', 'MB (B)', 'MB (C)', 'MB (Slide)', 'MB (2)'],
    'Oppo': ['Oppo (Line)', 'Oppo (Cross)'],
    'BackRow': ['Back Row - Pipe', 'Back Row - P1', 'Back Row - P5', '2nd Tempo']
  };

  const attacks = points.filter(p =>
    (team === 'home' ? p.action_type === 'Att.' : p.action_type === 'Op. Att.') ||
    (team === 'home' ? p.action_type === 'Sp. E.' : false)  // Include errors
  );

  return Object.entries(positionMap).map(([position, zones]) => {
    const positionAttacks = attacks.filter(p =>
      zones.includes(p.locationTempo)
    );

    const playerCounts = groupBy(
      positionAttacks,
      team === 'home' ? 'home_player' : 'opponent_player'
    );

    return {
      position,
      players: Object.entries(playerCounts).map(([player, points]) => ({
        player,
        attempts: points.length,
        color: getPlayerColor(player)
      }))
    };
  });
}
```

**Visual Specs:**
- X-axis: Positions (OH, MB, Oppo, BackRow)
- Y-axis: Number of attempts
- Stacked bars by player
- Shows total attempt distribution across positions

---

## 🎨 VISUAL DESIGN SYSTEM

### Color Palette

**Team Colors:**
```typescript
const COLORS = {
  homeTeam: '#0066CC',      // Blue
  opponentTeam: '#FF0000',  // Red
  scoreText: '#000000',     // Black
  neutralText: '#666666',   // Gray
};
```

**Player Colors (10-color palette):**
```typescript
const PLAYER_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#EF4444', // Red
  '#F59E0B', // Orange
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Deep Orange
  '#6366F1', // Indigo
  '#84CC16', // Lime
];

function getPlayerColor(playerName: string): string {
  // Use consistent hash to assign color
  const hash = playerName.split('').reduce((acc, char) =>
    char.charCodeAt(0) + ((acc << 5) - acc), 0
  );
  return PLAYER_COLORS[Math.abs(hash) % PLAYER_COLORS.length];
}
```

### Typography

```css
/* Page Title */
.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #000;
}

/* Tab Labels */
.tab-label {
  font-size: 16px;
  font-weight: 500;
}

/* Score Display */
.score {
  font-size: 18px;
  font-weight: 400;
  color: #000;
}

/* Player Names */
.player-name {
  font-size: 16px;
  font-weight: 500;
}

/* Action Text */
.action-text {
  font-size: 14px;
  font-weight: 400;
}

/* Chart Labels */
.chart-label {
  font-size: 12px;
  font-weight: 400;
}

/* Summary Stats */
.summary-value {
  font-size: 24px;
  font-weight: 600;
}

.summary-label {
  font-size: 14px;
  font-weight: 400;
  color: #666;
}
```

### Spacing System

```css
/* Spacing Variables */
:root {
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
}

/* Component Padding */
.page-container {
  padding: var(--spacing-md);
}

.summary-card {
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-sm);
}

.chart-container {
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.point-row {
  padding: var(--spacing-sm) var(--spacing-md);
  margin-bottom: var(--spacing-xs);
}
```

### Component Styling

```css
/* Buttons */
.button {
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s;
}

.button-active {
  background-color: #1F2937;
  color: white;
}

.button-inactive {
  background-color: #E5E7EB;
  color: #6B7280;
}

/* Tabs */
.tab {
  padding: 12px 20px;
  border-radius: 8px 8px 0 0;
  font-size: 16px;
  border: none;
  cursor: pointer;
}

.tab-active {
  background-color: #1F2937;
  color: white;
}

.tab-inactive {
  background-color: #F3F4F6;
  color: #6B7280;
}

/* Cards */
.card {
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: var(--spacing-md);
}

/* Summary Stat Card */
.summary-stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #F9FAFB;
  padding: var(--spacing-md);
  border-radius: 8px;
  margin-bottom: var(--spacing-sm);
}

.summary-stat-value {
  font-size: 24px;
  font-weight: 600;
  min-width: 60px;
  text-align: center;
}

.summary-stat-label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  flex: 1;
  text-align: center;
}
```

---

## 🔧 STATE MANAGEMENT

### Global State Structure

```typescript
interface InGameTrendState {
  // Raw data
  sets: SetData[];
  allPoints: PointData[];
  players: {
    home: Player[];
    opponent: Player[];
  };
  teams: {
    home: Team;
    opponent: Team;
  };

  // UI state
  selectedSet: number | 'Total';
  viewMode: 'list' | 'stats';

  // Computed (memoized)
  filteredPoints: PointData[];
  statistics: Statistics;
}

interface SetData {
  set_number: number;
  points: PointData[];
  final_score: {
    home: number;
    opponent: number;
  };
}

interface PointData {
  point_number: number;
  winning_team: 'home' | 'opponent';
  action_type: string;
  action: string;
  locationTempo: string | null;
  home_player: string | null;
  opponent_player: string | null;
  home_score: number;
  opponent_score: number;
  rotation?: string;
  timestamp?: string;
}

interface Player {
  id: string;
  name: string;
  jerseyNumber: number;
  position: string;
  teamId: string;
}

interface Team {
  id: string;
  name: string;
  color: string;
}

interface Statistics {
  summary: SummaryStats;
  hitVsAce: { home: HitAceData; opponent: HitAceData };
  attackKD: { home: PlayerKDData[]; opponent: PlayerKDData[] };
  killZones: { home: KillZoneData[]; opponent: KillZoneData[] };
  attackPositions: { home: AttackPositionData[]; opponent: AttackPositionData[] };
}
```

### React Hooks Pattern

```typescript
// Main state hook
function useInGameTrend() {
  const [selectedSet, setSelectedSet] = useState<number | 'Total'>(1);
  const [viewMode, setViewMode] = useState<'list' | 'stats'>('list');
  const [allPoints, setAllPoints] = useState<PointData[]>([]);

  // Memoized filtered points
  const filteredPoints = useMemo(() => {
    if (selectedSet === 'Total') return allPoints;
    return allPoints.filter(p => p.set_number === selectedSet);
  }, [allPoints, selectedSet]);

  // Memoized statistics
  const statistics = useMemo(() => {
    return calculateAllStatistics(filteredPoints);
  }, [filteredPoints]);

  return {
    selectedSet,
    setSelectedSet,
    viewMode,
    setViewMode,
    filteredPoints,
    statistics,
    allPoints,
    setAllPoints,
  };
}

// Statistics calculation hook
function useStatistics(points: PointData[]) {
  return useMemo(() => ({
    summary: calculateSummaryStats(points),
    hitVsAce: {
      home: calculateHitVsAce(points, 'home'),
      opponent: calculateHitVsAce(points, 'opponent'),
    },
    attackKD: {
      home: calculateAttackKD(points, 'home'),
      opponent: calculateAttackKD(points, 'opponent'),
    },
    killZones: {
      home: calculateKillZones(points, 'home'),
      opponent: calculateKillZones(points, 'opponent'),
    },
    attackPositions: {
      home: calculateAttackPositions(points, 'home'),
      opponent: calculateAttackPositions(points, 'opponent'),
    },
  }), [points]);
}
```

---

## 🚀 IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Week 1)
- [ ] Set up component structure
- [ ] Create layout with header, tabs, toggle
- [ ] Implement set filtering logic
- [ ] Create mock data for testing
- [ ] Basic routing and navigation

### Phase 2: Point List View (Week 2)
- [ ] Build PointByPointList component
- [ ] Implement 3-column layout
- [ ] Add color coding system
- [ ] Format action text display
- [ ] Handle jersey numbers for opponents
- [ ] Add scrolling functionality

### Phase 3: Summary Statistics (Week 3)
- [ ] Calculate opponent errors
- [ ] Calculate aces count
- [ ] Calculate attacks count
- [ ] Build summary cards UI
- [ ] Implement comparison layout
- [ ] Add responsive sizing

### Phase 4: Charts Setup (Week 4)
- [ ] Choose and integrate Chart.js
- [ ] Create reusable chart components
- [ ] Implement player color system
- [ ] Set up chart grid layout
- [ ] Configure responsive chart sizing

### Phase 5: Hit vs Ace Charts (Week 5)
- [ ] Implement data calculation
- [ ] Create stacked horizontal bar chart
- [ ] Add segment labels with counts
- [ ] Build chart legend
- [ ] Test with real data

### Phase 6: Attack K/D Charts (Week 6)
- [ ] Calculate K/D efficiency metrics
- [ ] Create stacked vertical bar chart
- [ ] Add text overlays for stats
- [ ] Implement efficiency formula
- [ ] Style and polish

### Phase 7: Zone & Position Charts (Week 7)
- [ ] Build Kill Zones by Player charts
- [ ] Implement Attack Attempts by Position charts
- [ ] Map locations to zones
- [ ] Group zones by position
- [ ] Add legends and labels

### Phase 8: Polish & Testing (Week 8)
- [ ] Performance optimization (memoization)
- [ ] Add loading states
- [ ] Error handling
- [ ] Edge case handling (null data)
- [ ] Visual regression testing
- [ ] User acceptance testing

### Phase 9: Integration (Week 9)
- [ ] Connect to backend API
- [ ] Real-time data updates
- [ ] Save functionality
- [ ] Sync with other app features
- [ ] End-to-end testing

### Phase 10: Launch (Week 10)
- [ ] Final QA testing
- [ ] Performance benchmarks
- [ ] Accessibility audit
- [ ] Documentation
- [ ] Deployment

---

## ✅ ACCEPTANCE CRITERIA

### Functional Requirements
- [ ] Display point-by-point list with correct color coding
- [ ] Calculate all 3 summary statistics accurately
- [ ] Render all 8 charts with correct data
- [ ] Filter by set (1-5 and Total)
- [ ] Toggle between list and stats view
- [ ] Scroll smoothly in both views
- [ ] Handle null/missing data gracefully
- [ ] Display jersey numbers for opponents

### Visual Requirements
- [ ] Match color scheme from screenshots
- [ ] Use consistent player colors across charts
- [ ] Maintain iPad-optimized layout
- [ ] Responsive chart sizing
- [ ] Clear, readable text at all sizes
- [ ] Smooth transitions between states

### Performance Requirements
- [ ] Calculate stats for 100+ points in < 100ms
- [ ] Render charts in < 500ms
- [ ] Smooth scrolling with virtual list
- [ ] No lag when switching sets
- [ ] Efficient memoization of computed values

### Accessibility Requirements
- [ ] Keyboard navigation support
- [ ] ARIA labels on all interactive elements
- [ ] Color contrast meets WCAG AA standards
- [ ] Touch targets minimum 44x44px
- [ ] Screen reader compatible

---

## 📝 NOTES & CONSIDERATIONS

### Data Source Migration
- Current: Google Sheets with JSON in cell A1
- Target: Supabase/Firebase with proper relational structure
- Need migration script to convert existing data

### Offline Support (PWA)
- Cache point data locally
- Sync when online
- Handle conflicts gracefully
- Show offline indicator

### Real-time Updates
- Consider WebSocket for live updates during games
- Multiple coaches updating simultaneously
- Conflict resolution strategy

### Export Functionality
- PDF reports with charts
- CSV export of raw data
- Share links to specific games

---

## 🎓 TECHNICAL RECOMMENDATIONS

### Libraries
- **UI Framework**: React 18+
- **Charts**: Chart.js with react-chartjs-2
- **Styling**: Tailwind CSS or styled-components
- **State Management**: Zustand or React Context
- **Data Fetching**: TanStack Query
- **Virtual Scrolling**: react-window
- **TypeScript**: Strongly typed throughout

### Best Practices
- Memoize expensive calculations
- Virtual scroll for long lists
- Lazy load charts as needed
- Progressive image loading
- Code splitting by route
- Error boundaries for resilience

---

## 🏁 CONCLUSION

This specification provides everything needed to rebuild the In-Game Trend feature from the Retool app into a modern React application. All UI components, data structures, calculations, and user interactions have been documented with implementation-ready code examples.

**Next Steps:**
1. Review and approve this specification
2. Set up development environment
3. Begin Phase 1 implementation
4. Regular progress reviews

**Status**: ✅ **READY FOR DEVELOPMENT**

