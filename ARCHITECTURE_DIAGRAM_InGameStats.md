# InGame Stats Architecture Diagram

**Visual reference for system architecture**
**Date:** 2025-10-01

---

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    VOLLEYBALL COACH PWA                      │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              InGame Stats Feature                      │  │
│  │                                                         │  │
│  │  ┌──────────────────────────────────────────────────┐ │  │
│  │  │          User Interface Layer                     │ │  │
│  │  │  - StatsPage (route component)                    │ │  │
│  │  │  - PointEntryForm (decision tree UI)              │ │  │
│  │  │  - PointByPointList (3-column display)            │ │  │
│  │  │  - StatisticsDashboard (8 charts)                 │ │  │
│  │  └──────────────────┬───────────────────────────────┘ │  │
│  │                     │                                   │  │
│  │  ┌──────────────────▼───────────────────────────────┐ │  │
│  │  │       State Management (Context API)             │ │  │
│  │  │  - InGameStatsContext                            │ │  │
│  │  │  - useReducer for complex state                  │ │  │
│  │  │  - Memoized statistics calculations              │ │  │
│  │  └──────────────────┬───────────────────────────────┘ │  │
│  │                     │                                   │  │
│  │  ┌──────────────────▼───────────────────────────────┐ │  │
│  │  │          Business Logic Layer                     │ │  │
│  │  │  - formValidation.ts (zod schemas)                │ │  │
│  │  │  - statsCalculations.ts (all metrics)             │ │  │
│  │  │  - chartHelpers.ts (player colors, configs)       │ │  │
│  │  │  - actionTypesHelpers.ts (decision tree logic)    │ │  │
│  │  └──────────────────┬───────────────────────────────┘ │  │
│  │                     │                                   │  │
│  │  ┌──────────────────▼───────────────────────────────┐ │  │
│  │  │            API Layer                              │ │  │
│  │  │  - pointsAPI.ts (CRUD for points)                 │ │  │
│  │  │  - matchesAPI.ts (match management)               │ │  │
│  │  │  - setsAPI.ts (set management)                    │ │  │
│  │  │  - Real-time subscriptions (WebSocket)            │ │  │
│  │  └──────────────────┬───────────────────────────────┘ │  │
│  │                     │                                   │  │
│  │  ┌──────────────────▼───────────────────────────────┐ │  │
│  │  │         Offline Storage Layer                     │ │  │
│  │  │  - IndexedDB cache (local persistence)            │ │  │
│  │  │  - Sync queue (background sync API)               │ │  │
│  │  │  - Conflict resolution logic                      │ │  │
│  │  └──────────────────┬───────────────────────────────┘ │  │
│  └────────────────────┬┴───────────────────────────────┘  │
└────────────────────────┼──────────────────────────────────┘
                         │
                         │ Network Boundary
                         │
        ┌────────────────▼────────────────┐
        │                                  │
        │      Supabase Backend           │
        │                                  │
        │  ┌────────────────────────────┐ │
        │  │   PostgreSQL Database      │ │
        │  │                            │ │
        │  │  Tables:                   │ │
        │  │  - matches                 │ │
        │  │  - sets                    │ │
        │  │  - points                  │ │
        │  │  - point_details           │ │
        │  │  - teams                   │ │
        │  │  - players                 │ │
        │  │                            │ │
        │  │  Views:                    │ │
        │  │  - v_points_full           │ │
        │  │  - v_set_stats             │ │
        │  └────────────────────────────┘ │
        │                                  │
        │  ┌────────────────────────────┐ │
        │  │   Real-time Engine         │ │
        │  │  - WebSocket server         │ │
        │  │  - PostgreSQL triggers      │ │
        │  │  - Broadcast channels       │ │
        │  └────────────────────────────┘ │
        │                                  │
        │  ┌────────────────────────────┐ │
        │  │   REST API                 │ │
        │  │  - Auto-generated from DB   │ │
        │  │  - Row-level security       │ │
        │  └────────────────────────────┘ │
        │                                  │
        └──────────────────────────────────┘
```

---

## Component Hierarchy (Detailed)

```
StatsPage.tsx (Route: /in-game-stats)
│
├── GameHeader.tsx
│   ├── Match metadata (teams, date)
│   └── ScoreDisplay (home vs opponent)
│
├── SetTabs.tsx
│   └── Tabs: Set 1, Set 2, Set 3, Set 4, Set 5, Total
│
├── ViewToggle.tsx
│   └── Buttons: Hide info. | Show info.
│
├── [VIEW 1: List View] (when viewMode === 'list')
│   │
│   ├── PointEntryForm.tsx
│   │   │
│   │   ├── WinLossToggle.tsx
│   │   │   └── Buttons: Point WIN | Point LOSS
│   │   │
│   │   ├── SegmentedControl.tsx (Category selector)
│   │   │   └── Options: Att. | Ser. | Blo. | Op. E. | Other (Win)
│   │   │   └── Options: Op. Att. | Op. Ace | Sp. E. | Ser. E. | Other (Loss)
│   │   │
│   │   ├── ConditionalDropdown.tsx (Subcategory)
│   │   │   └── Dynamic options based on selected category
│   │   │
│   │   ├── ConditionalDropdown.tsx (Location/Tempo)
│   │   │   └── Shows ONLY if category has locationTempo
│   │   │   └── Options: OH (Line), OH (Cross), MB (A), etc.
│   │   │
│   │   ├── PlayerSelector.tsx
│   │   │   └── Dropdown with search
│   │   │   └── Filtered by team (home vs opponent)
│   │   │
│   │   └── Submit Button
│   │       └── Validates → Adds point → Resets form
│   │
│   ├── PointByPointList.tsx
│   │   │
│   │   └── PointRow.tsx (repeated for each point)
│   │       ├── Column 1: Score (black text)
│   │       ├── Column 2: Home Action (blue text)
│   │       ├── Column 3: Opponent Action (red text)
│   │       └── Undo Button (optional)
│   │
│   └── UndoButton (last point)
│
└── [VIEW 2: Stats View] (when viewMode === 'stats')
    │
    ├── SummaryStats.tsx
    │   ├── Metric 1: Opponent Errors (home vs opponent)
    │   ├── Metric 2: Aces (home vs opponent)
    │   └── Metric 3: Attacks (home vs opponent)
    │
    └── StatisticsDashboard.tsx
        │
        ├── ChartsGrid (2x4 layout)
        │   │
        │   ├── Row 1:
        │   │   ├── HitVsAceChart.tsx (Home)
        │   │   └── HitVsAceChart.tsx (Opponent)
        │   │
        │   ├── Row 2:
        │   │   ├── AttackKDChart.tsx (Home)
        │   │   └── AttackKDChart.tsx (Opponent)
        │   │
        │   ├── Row 3:
        │   │   ├── KillZonesChart.tsx (Home)
        │   │   └── KillZonesChart.tsx (Opponent)
        │   │
        │   └── Row 4:
        │       ├── AttackPositionsChart.tsx (Home)
        │       └── AttackPositionsChart.tsx (Opponent)
        │
        └── ChartLegend (player colors)
```

---

## Data Flow: Point Entry

```
┌─────────────────────────────────────────────────────────────┐
│  1. USER INTERACTION                                         │
│                                                               │
│  User fills form:                                            │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐ │
│  │ Win/Loss │ → │ Category │ → │Subcategory│ → │  Player  │ │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘ │
│                                                               │
│                 (Location/Tempo if applicable)               │
│                                                               │
│                    Clicks "Add Point"                        │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  2. FORM VALIDATION (zod)                                    │
│                                                               │
│  ✓ All required fields filled?                               │
│  ✓ Location/Tempo provided if needed?                        │
│  ✓ Player selected from correct team?                        │
│                                                               │
│  Invalid → Show error message                                │
│  Valid → Continue                                            │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  3. STATE UPDATE (Context dispatch)                          │
│                                                               │
│  Action: ADD_POINT                                           │
│  Payload: {                                                  │
│    set_id,                                                   │
│    point_number,                                             │
│    winning_team,                                             │
│    action_type,                                              │
│    action_category,                                          │
│    location_tempo,                                           │
│    player_id,                                                │
│    home_score,                                               │
│    opponent_score                                            │
│  }                                                           │
└───────────────────────────┬─────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
            ↓               ↓               ↓
┌──────────────────┐ ┌──────────────┐ ┌──────────────────┐
│  4a. UI UPDATE   │ │4b. INDEXEDDB │ │4c. API CALL      │
│  (Optimistic)    │ │    CACHE     │ │  (Background)    │
│                  │ │              │ │                  │
│ - Add to points  │ │ - Store      │ │ - POST to        │
│   array          │ │   locally    │ │   Supabase       │
│ - Increment      │ │ - Add to     │ │ - Insert point   │
│   score          │ │   sync queue │ │ - Insert details │
│ - Render new     │ │              │ │ - Update set     │
│   PointRow       │ │              │ │   scores         │
│                  │ │              │ │                  │
│ - Reset form     │ │              │ │ (If offline:     │
│                  │ │              │ │  queue for       │
│                  │ │              │ │  later sync)     │
└──────────────────┘ └──────────────┘ └────────┬─────────┘
                                               │
                                               ↓
                                    ┌──────────────────────┐
                                    │ 5. REAL-TIME         │
                                    │    BROADCAST         │
                                    │                      │
                                    │ Supabase triggers    │
                                    │ WebSocket message    │
                                    │                      │
                                    │ Other clients        │
                                    │ receive update       │
                                    │                      │
                                    │ useRealtimePoints    │
                                    │ hook adds point      │
                                    │ to their state       │
                                    └──────────────────────┘
```

---

## Data Flow: Statistics Calculation

```
┌─────────────────────────────────────────────────────────────┐
│  TRIGGER: User changes set filter                            │
│           (e.g., clicks "Set 2" tab)                         │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Context updates: selectedSet = 2                            │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  useMemo detects dependency change                           │
│  Re-runs: filteredPoints = points.filter(p => p.set_id === 2)│
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  useStatistics hook triggers                                 │
│                                                               │
│  Parallel calculations:                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ calculateSummaryStats(filteredPoints)                │   │
│  │ → { homeErrors, opponentErrors, aces, attacks }      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ calculateHitVsAce(filteredPoints, 'home')            │   │
│  │ → { aces: [...], hits: [...] }                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ calculateAttackKD(filteredPoints, 'home')            │   │
│  │ → [{ player, kills, errors, attempts, efficiency }]  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ calculateKillZones(filteredPoints, 'home')           │   │
│  │ → [{ zone, players: [...] }]                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ calculateAttackPositions(filteredPoints, 'home')     │   │
│  │ → [{ position, players: [...] }]                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  (Same calculations for 'opponent' team)                     │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Results memoized and returned                               │
│  No recalculation unless filteredPoints changes              │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Components re-render with new data                          │
│                                                               │
│  - SummaryStats updates numbers                              │
│  - All 8 charts re-render with new datasets                  │
│  - Chart.js animates transitions                             │
└─────────────────────────────────────────────────────────────┘

Performance Target: < 500ms for 200 points
```

---

## Offline Sync Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  SCENARIO: User is OFFLINE                                   │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  1. User adds point (same UI flow)                           │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  2. API call fails (network error)                           │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  3. IndexedDB operations                                     │
│                                                               │
│  a) Cache point data:                                        │
│     db.points.put({                                          │
│       id: uuid(),                                            │
│       ...pointData,                                          │
│       _syncStatus: 'pending'                                 │
│     })                                                       │
│                                                               │
│  b) Add to sync queue:                                       │
│     db.syncQueue.add({                                       │
│       action: 'INSERT',                                      │
│       table: 'points',                                       │
│       data: pointData,                                       │
│       timestamp: Date.now(),                                 │
│       retries: 0                                             │
│     })                                                       │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  4. UI shows "Offline - Changes saved locally"               │
│     Point appears in list with "pending sync" indicator      │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  User adds 4 more points (all queued)                        │
│  UI remains fully functional with optimistic updates         │
└─────────────────────────────────────────────────────────────┘

                  ... Time passes ...

┌─────────────────────────────────────────────────────────────┐
│  SCENARIO: User comes back ONLINE                            │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  5. Service Worker detects network                           │
│                                                               │
│     navigator.onLine === true                                │
│     Triggers 'sync' event                                    │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  6. Background Sync Handler                                  │
│                                                               │
│  async function syncPendingPoints() {                        │
│    const queue = await db.syncQueue.getAll();                │
│                                                               │
│    for (const item of queue) {                               │
│      try {                                                   │
│        // POST to Supabase                                   │
│        await supabase.from('points').insert(item.data);      │
│                                                               │
│        // Success: remove from queue                         │
│        await db.syncQueue.delete(item.id);                   │
│                                                               │
│        // Update sync status                                 │
│        await db.points.update(item.data.id, {                │
│          _syncStatus: 'synced'                               │
│        });                                                   │
│                                                               │
│      } catch (error) {                                       │
│        // Increment retry count                              │
│        item.retries++;                                       │
│                                                               │
│        if (item.retries > 3) {                               │
│          // Move to failed queue for manual review           │
│          await db.failedSync.add(item);                      │
│        } else {                                              │
│          // Keep in queue for retry                          │
│          await db.syncQueue.update(item.id, item);           │
│        }                                                     │
│      }                                                       │
│    }                                                         │
│  }                                                           │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  7. UI updates                                               │
│                                                               │
│  - Show "Synced!" notification                               │
│  - Remove "pending sync" indicators                          │
│  - Points now have database IDs                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema (ER Diagram)

```
┌─────────────────┐
│     teams       │
│─────────────────│
│ id (PK)         │───────┐
│ name            │       │
│ is_home_team    │       │ 1:N
└─────────────────┘       │
                          │
                          ↓
                  ┌─────────────────┐
                  │    players      │
                  │─────────────────│
                  │ id (PK)         │
                  │ team_id (FK)    │
                  │ name            │
                  │ jersey_number   │
                  │ position        │
                  └─────────────────┘

┌─────────────────┐
│    matches      │
│─────────────────│
│ id (PK)         │───────┐
│ match_date      │       │
│ home_team_id    │       │ 1:N
│ opponent_id     │       │
│ match_type      │       │
└─────────────────┘       │
                          ↓
                  ┌─────────────────┐
                  │      sets       │
                  │─────────────────│
                  │ id (PK)         │───────┐
                  │ match_id (FK)   │       │
                  │ set_number      │       │ 1:N
                  │ home_score      │       │
                  │ opponent_score  │       │
                  └─────────────────┘       │
                                            ↓
                                    ┌─────────────────┐
                                    │     points      │
                                    │─────────────────│
                                    │ id (PK)         │───────┐
                                    │ set_id (FK)     │       │
                                    │ point_number    │       │ 1:1
                                    │ winning_team    │       │
                                    │ home_score      │       │
                                    │ opponent_score  │       │
                                    │ recorded_at     │       │
                                    └─────────────────┘       │
                                                              ↓
                                                      ┌─────────────────┐
                                                      │ point_details   │
                                                      │─────────────────│
                                                      │ id (PK)         │
                                                      │ point_id (FK)   │
                                                      │ action_type     │
                                                      │ action_category │
                                                      │ location_tempo  │
                                                      │ home_player_id  │
                                                      │ opponent_plyr_id│
                                                      └─────────────────┘

VIEWS:
┌─────────────────────────────────────────────┐
│ v_points_full                                │
│ (JOIN of points + point_details + players)  │
│                                              │
│ Returns complete point data with names       │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ v_set_stats                                  │
│ (Aggregated statistics per set)             │
│                                              │
│ Returns: total_points, home_wins, opp_wins   │
└─────────────────────────────────────────────┘
```

---

## TypeScript Type Hierarchy

```
┌─────────────────────────────────────────────┐
│         inGameStats.types.ts                │
└─────────────────────────────────────────────┘
                    │
      ┌─────────────┼─────────────┐
      │             │             │
      ↓             ↓             ↓
┌──────────┐  ┌──────────┐  ┌──────────┐
│PointData │  │ SetData  │  │MatchData │
│          │  │          │  │          │
│ id       │  │ id       │  │ id       │
│ set_id   │  │ match_id │  │ teams    │
│ point_#  │  │ set_#    │  │ sets[]   │
│ team     │  │ points[] │  │ date     │
│ action   │  │ scores   │  └──────────┘
│ player   │  └──────────┘
└──────────┘
      │
      └────────────┐
                   ↓
            ┌──────────────┐
            │ TeamData     │
            │ PlayerData   │
            └──────────────┘

┌─────────────────────────────────────────────┐
│         Statistics Types                     │
└─────────────────────────────────────────────┘
      │
      ├─→ SummaryStats
      ├─→ HitAceData
      ├─→ PlayerKDData
      ├─→ KillZoneData
      └─→ AttackPositionData

┌─────────────────────────────────────────────┐
│         UI State Types                       │
└─────────────────────────────────────────────┘
      │
      ├─→ InGameStatsUIState
      ├─→ PointEntryState
      └─→ FormErrors

┌─────────────────────────────────────────────┐
│         ACTION_TYPES Constant               │
└─────────────────────────────────────────────┘
      │
      ├─→ WinLossType ('Win' | 'Loss')
      ├─→ CategoryKey (string literal union)
      └─→ ActionTypesStructure (const assertion)
```

---

## Chart Data Transformation Flow

```
┌─────────────────────────────────────────────────────────────┐
│  INPUT: PointData[] (filtered by set)                        │
│                                                               │
│  Example:                                                    │
│  [                                                           │
│    { winning_team: 'home', action_type: 'Att.',             │
│      home_player_name: 'Yan', ... },                        │
│    { winning_team: 'home', action_type: 'Ser.',             │
│      home_player_name: 'Amei', action: 'Ace (On floor)' },  │
│    ...                                                       │
│  ]                                                           │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  TRANSFORMATION: calculateHitVsAce(points, 'home')           │
│                                                               │
│  Step 1: Filter aces                                         │
│    aces = points.filter(p =>                                 │
│      p.winning_team === 'home' &&                            │
│      p.action_type === 'Ser.' &&                             │
│      p.action.includes('Ace')                                │
│    )                                                         │
│    // Result: [Amei: 1 ace]                                  │
│                                                               │
│  Step 2: Filter hits                                         │
│    hits = points.filter(p =>                                 │
│      p.winning_team === 'home' &&                            │
│      p.action_type === 'Att.'                                │
│    )                                                         │
│    // Result: [Yan: 3 hits, Toby: 2 hits, Elly: 1 hit]       │
│                                                               │
│  Step 3: Group by player                                     │
│    acesGrouped = groupBy(aces, 'home_player_name')           │
│    hitsGrouped = groupBy(hits, 'home_player_name')           │
│                                                               │
│  Step 4: Assign colors                                       │
│    aces.map(player => ({                                     │
│      player: player.name,                                    │
│      count: player.points.length,                            │
│      color: getPlayerColor(player.name)                      │
│    }))                                                       │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  OUTPUT: HitAceData                                          │
│                                                               │
│  {                                                           │
│    aces: [                                                   │
│      { player: 'Amei', count: 1, color: '#3B82F6' }          │
│    ],                                                        │
│    hits: [                                                   │
│      { player: 'Yan', count: 3, color: '#10B981' },          │
│      { player: 'Toby', count: 2, color: '#EF4444' },         │
│      { player: 'Elly', count: 1, color: '#F59E0B' }          │
│    ]                                                         │
│  }                                                           │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  CHART.JS DATASET TRANSFORMATION                             │
│                                                               │
│  const chartData = {                                         │
│    labels: ['Aces', 'Hits'],                                 │
│    datasets: [                                               │
│      {                                                       │
│        label: 'Amei',                                        │
│        data: [1, 0],  // 1 ace, 0 hits                       │
│        backgroundColor: '#3B82F6'                             │
│      },                                                      │
│      {                                                       │
│        label: 'Yan',                                         │
│        data: [0, 3],  // 0 aces, 3 hits                      │
│        backgroundColor: '#10B981'                             │
│      },                                                      │
│      // ... more players                                     │
│    ]                                                         │
│  }                                                           │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  RENDERED CHART                                              │
│                                                               │
│  ┌────────────────────────────────────┐                     │
│  │ Home Hit vs Ace Ratio              │                     │
│  ├────────────────────────────────────┤                     │
│  │ Aces  [Amei:1]                     │                     │
│  │ Hits  [Yan:3][Toby:2][Elly:1]      │                     │
│  └────────────────────────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Performance Optimization Strategy

```
┌─────────────────────────────────────────────────────────────┐
│  OPTIMIZATION LAYER 1: Memoization                           │
│                                                               │
│  useMemo(() => {                                             │
│    return calculateStatistics(points);                       │
│  }, [points]);                                               │
│                                                               │
│  ✓ Only recalculates when points array changes               │
│  ✓ Prevents unnecessary re-renders                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  OPTIMIZATION LAYER 2: Virtual Scrolling                     │
│                                                               │
│  <FixedSizeList                                              │
│    height={600}                                              │
│    itemCount={points.length}                                 │
│    itemSize={50}                                             │
│  >                                                           │
│    {({ index, style }) => (                                  │
│      <PointRow point={points[index]} style={style} />        │
│    )}                                                        │
│  </FixedSizeList>                                            │
│                                                               │
│  ✓ Only renders visible rows                                 │
│  ✓ Handles 1000+ points smoothly                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  OPTIMIZATION LAYER 3: Code Splitting                        │
│                                                               │
│  const StatisticsDashboard = lazy(() =>                      │
│    import('./components/StatisticsDashboard')                │
│  );                                                          │
│                                                               │
│  ✓ Charts only loaded when user switches to stats view       │
│  ✓ Reduces initial bundle size                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  OPTIMIZATION LAYER 4: Debounced Calculations                │
│                                                               │
│  const debouncedCalculate = useMemo(                         │
│    () => debounce(calculateStats, 300),                      │
│    []                                                        │
│  );                                                          │
│                                                               │
│  ✓ Prevents rapid recalculations during rapid set changes    │
└─────────────────────────────────────────────────────────────┘

PERFORMANCE TARGETS:
┌──────────────────────────┬─────────┬──────────┐
│ Operation                │ Target  │ Method   │
├──────────────────────────┼─────────┼──────────┤
│ Point entry response     │ <100ms  │ Optimistic│
│ Statistics calculation   │ <500ms  │ Memoization│
│ Chart rendering (all 8)  │ <500ms  │ Lazy load│
│ Virtual scroll FPS       │ >60fps  │ react-window│
│ Bundle size (feature)    │ <400KB  │ Code split│
└──────────────────────────┴─────────┴──────────┘
```

---

**END OF ARCHITECTURE DIAGRAM**

This diagram complements the main implementation plan with visual representations of:
- System architecture
- Component hierarchy
- Data flows
- Database schema
- Type hierarchy
- Performance optimizations

Refer to IMPLEMENTATION_PLAN_InGameStats.md for detailed specifications.
