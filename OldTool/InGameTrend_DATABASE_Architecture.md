# InGame Trend - Database Architecture Analysis

## Executive Summary

The OldTool Retool application uses **Google Sheets as a pseudo-database**, storing all point-by-point match data as a **single JSON string in cell A1** of the `StatsTableInGameTrends` sheet. This approach has significant limitations but allowed rapid prototyping without proper database infrastructure.

---

## Current Architecture: Google Sheets JSON Storage

### 1. Data Storage Mechanism

**Location**: Google Sheets spreadsheet
**Sheet Name**: `StatsTableInGameTrends`
**Storage Cell**: `A1`
**Format**: JSON string (serialized)

```javascript
// Example data structure stored in cell A1:
[
  {
    "set_number": 1,
    "points": [
      {
        "point_number": 1,
        "winning_team": "home",
        "action_type": "Att.",
        "action": "Hard Spike",
        "locationTempo": "OH (Line)",
        "home_player": "Player 1",
        "opponent_player": "Player 2",
        "home_score": 1,
        "opponent_score": 0
      },
      {
        "point_number": 2,
        "winning_team": "opponent",
        "action_type": "Op. Att.",
        "action": "Tip",
        "locationTempo": "MB (Quick)",
        "home_player": "",
        "opponent_player": "Player 5",
        "home_score": 1,
        "opponent_score": 1
      }
      // ... more points
    ]
  },
  {
    "set_number": 2,
    "points": [...]
  }
  // ... more sets
]
```

### 2. Data Write Operations (Retool → Google Sheets)

Based on the Retool export analysis, data is written through **Google Sheets API queries**:

#### Write Query Pattern (Inferred)
```javascript
// Retool Query: updateInGameTrendData
// Method: Update cell value via Google Sheets API
// Target: Sheet 'StatsTableInGameTrends', Cell A1
// Data: JSON.stringify(allPointsData)

// Pseudo-code of write operation:
function savePointData(newPoint) {
  // 1. Read current JSON from A1
  const currentData = JSON.parse(sheet.getRange('A1').getValue());

  // 2. Add new point to appropriate set
  const currentSet = currentData.find(s => s.set_number === activeSet);
  currentSet.points.push(newPoint);

  // 3. Write entire JSON back to A1
  sheet.getRange('A1').setValue(JSON.stringify(currentData));
}
```

#### Key Characteristics:
- **Read-Modify-Write Pattern**: Every point addition requires reading entire dataset
- **No Transactions**: Race conditions possible with multiple users
- **Full Serialization**: Entire match data serialized on every write
- **No Indexing**: Linear search through all points to find specific data

### 3. Data Read Operations (Google Sheets → Statistics)

**Processing Function**: `generateStatsTables()` (from Tables.rtf)

```javascript
function generateStatsTables() {
  // 1. READ: Fetch JSON from cell A1
  var sheet = SpreadsheetApp.getActiveSpreadsheet()
                .getSheetByName('StatsTableInGameTrends');
  var cellData = sheet.getRange('A1').getValue();

  // 2. PARSE: Convert JSON string to JavaScript object
  var data = JSON.parse(cellData);

  // 3. PROCESS: Loop through all sets and points
  data.forEach(function(set) {
    set.points.forEach(function(point) {
      // Categorize and aggregate statistics
      if (point.winning_team === 'home') {
        // Count successful actions
        homePoints++;
        if (point.action_type === 'Att.') {
          homeAttacks.push(point);
        }
      } else {
        // Count opponent actions
        opponentPoints++;
      }

      // Track errors
      if (point.action_type === 'Sp. E.' ||
          point.action_type === 'Ser. E.' ||
          point.action_type === 'Other') {
        errors.push(point);
      }
    });
  });

  // 4. OUTPUT: Write to 5 separate sheets
  writeToSheet('Total Errors', errorsData);
  writeToSheet('Total Points Won', pointsData);
  writeToSheet('Total Successful Attacks', attacksData);
  writeToSheet('Home Player Attacks', homePlayerData);
  writeToSheet('Opponent Player Attacks', opponentPlayerData);
}
```

**Generated Output Sheets** (5 total):

1. **Total Errors**
   - Columns: `Team`, `Error Type`, `Count`
   - Aggregates: Sp. E., Ser. E., Other (Pass Error)

2. **Total Points Won**
   - Columns: `Team`, `Win Type`, `Count`
   - Aggregates: Att., Ser., Blo., Op. E., Other

3. **Total Successful Attacks**
   - Columns: `Team`, `Attack Type`, `Location/Tempo`, `Count`
   - Filtered: Only `action_type === 'Att.'`

4. **Home Player Attacks**
   - Columns: `Player`, `Action Type`, `Action`, `Location/Tempo`, `Point Number`
   - All attack data for home team players

5. **Opponent Player Attacks**
   - Same structure as home player attacks

### 4. Data Lifecycle Flow

```
┌─────────────────┐
│   Retool UI     │
│  (User Input)   │
└────────┬────────┘
         │ New point data
         ↓
┌─────────────────────────┐
│  Google Sheets API      │
│  Write to Cell A1       │
│  (Full JSON replace)    │
└────────┬────────────────┘
         │
         ↓
┌─────────────────────────┐
│  Cell A1                │
│  [{"set_number":1,...}] │
│  (JSON String)          │
└────────┬────────────────┘
         │
         │ Manual trigger
         ↓
┌─────────────────────────┐
│  Google Apps Script     │
│  generateStatsTables()  │
└────────┬────────────────┘
         │
         ↓
┌─────────────────────────┐
│  5 Output Sheets        │
│  (Statistics Tables)    │
└────────┬────────────────┘
         │
         ↓
┌─────────────────────────┐
│  Retool UI              │
│  (Display Charts)       │
└─────────────────────────┘
```

---

## Limitations of Current Approach

### 1. **Scalability Issues**
- **Cell Size Limit**: Google Sheets cells max at ~50,000 characters
- **Performance Degradation**: Reading/writing entire JSON on every point becomes slow
- **Example**: A 5-set match with 150 points × 200 bytes/point = 30KB (approaching limit)

### 2. **Concurrency Problems**
- **No Locking**: Multiple coaches updating simultaneously causes race conditions
- **Last Write Wins**: Earlier updates can be overwritten
- **No Conflict Resolution**: Data loss possible

### 3. **Query Limitations**
- **No Filtering**: Must load entire dataset to find specific points
- **No Joins**: Can't correlate with player data, rotation data, etc.
- **No Aggregations**: Must process all data in client/script

### 4. **Data Integrity**
- **No Validation**: Invalid JSON can break entire system
- **No Constraints**: Can't enforce required fields or data types
- **No Relationships**: No foreign keys to players, teams, matches

### 5. **Operational Issues**
- **Manual Processing**: Statistics require manual function execution
- **No Real-time Updates**: Changes don't reflect immediately
- **No Backup/Versioning**: Overwriting cell A1 loses previous state
- **No Audit Trail**: Can't track who changed what when

---

## Proposed New Architecture: Relational Database

### Database Options for React PWA

#### Option 1: **Supabase** (PostgreSQL) ⭐ RECOMMENDED
**Pros:**
- Full PostgreSQL database with relational integrity
- Real-time subscriptions (live updates across devices)
- Row-level security for multi-user access
- Built-in authentication
- Generous free tier (500MB database, 2GB bandwidth)
- Excellent React integration

**Cons:**
- Requires internet connection (offline sync more complex)
- Learning curve for PostgreSQL

#### Option 2: **Firebase Realtime Database / Firestore**
**Pros:**
- Excellent offline support with automatic sync
- Real-time updates out of the box
- Simple NoSQL structure
- Good free tier

**Cons:**
- NoSQL can be less efficient for complex queries
- Limited query capabilities compared to SQL
- Pricing can escalate with heavy usage

#### Option 3: **Local-First with IndexedDB + Sync**
**Pros:**
- Perfect offline support
- No external dependencies
- Complete data privacy

**Cons:**
- Must build entire sync system manually
- No built-in authentication
- Complex conflict resolution

### Recommended: **Supabase** for volleyball-coach-app

---

## New Database Schema Design

### Entity-Relationship Model

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Matches   │────1:N──│    Sets     │────1:N──│   Points    │
└─────────────┘         └─────────────┘         └─────────────┘
      │                                                 │
      │                                                 │
      │                                                 │
      1:N                                              1:1
      │                                                 │
      ↓                                                 ↓
┌─────────────┐                                ┌───────────────┐
│   Teams     │                                │  PointDetails │
└─────────────┘                                └───────────────┘
      │
      1:N
      │
      ↓
┌─────────────┐
│   Players   │
└─────────────┘
```

### SQL Schema

```sql
-- ============================================================
-- TABLE: matches
-- Stores overall match metadata
-- ============================================================
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  match_date DATE NOT NULL,
  home_team_id UUID REFERENCES teams(id),
  opponent_team_id UUID REFERENCES teams(id),
  match_type VARCHAR(50), -- 'Practice', 'League', 'Tournament', etc.
  location VARCHAR(255),
  notes TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  final_score_home INTEGER,
  final_score_opponent INTEGER
);

-- ============================================================
-- TABLE: sets
-- Each match has 1-5 sets
-- ============================================================
CREATE TABLE sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL CHECK (set_number BETWEEN 1 AND 5),
  home_score INTEGER DEFAULT 0,
  opponent_score INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,

  UNIQUE(match_id, set_number)
);

-- ============================================================
-- TABLE: points
-- Core point-by-point data
-- ============================================================
CREATE TABLE points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id UUID NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
  point_number INTEGER NOT NULL,
  winning_team VARCHAR(10) NOT NULL CHECK (winning_team IN ('home', 'opponent')),
  home_score INTEGER NOT NULL,
  opponent_score INTEGER NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(set_id, point_number)
);

-- ============================================================
-- TABLE: point_details
-- Extended point information (Win/Loss specifics)
-- ============================================================
CREATE TABLE point_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  point_id UUID NOT NULL REFERENCES points(id) ON DELETE CASCADE UNIQUE,

  -- Action categorization
  action_type VARCHAR(50) NOT NULL, -- 'Att.', 'Ser.', 'Blo.', 'Op. E.', 'Other', etc.
  action_category VARCHAR(100), -- 'Hard Spike', 'Float', 'Roof', etc.
  location_tempo VARCHAR(100), -- 'OH (Line)', 'MB (Quick)', 'Zone 1', etc.

  -- Players involved
  home_player_id UUID REFERENCES players(id),
  opponent_player_id UUID REFERENCES players(id),

  -- Additional context
  notes TEXT
);

-- ============================================================
-- TABLE: teams
-- Team information
-- ============================================================
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_home_team BOOLEAN DEFAULT TRUE -- Distinguish our team from opponents
);

-- ============================================================
-- TABLE: players
-- Player roster
-- ============================================================
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  jersey_number INTEGER,
  position VARCHAR(50), -- 'S', 'OH', 'MB', 'Oppo', 'L'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- INDEXES for query performance
-- ============================================================
CREATE INDEX idx_sets_match ON sets(match_id);
CREATE INDEX idx_points_set ON points(set_id);
CREATE INDEX idx_point_details_point ON point_details(point_id);
CREATE INDEX idx_players_team ON players(team_id);
CREATE INDEX idx_matches_date ON matches(match_date);

-- ============================================================
-- VIEWS for common queries
-- ============================================================

-- View: Complete point data with all details
CREATE VIEW v_points_full AS
SELECT
  p.id,
  p.point_number,
  s.set_number,
  m.match_date,
  p.winning_team,
  p.home_score,
  p.opponent_score,
  pd.action_type,
  pd.action_category,
  pd.location_tempo,
  hp.name AS home_player_name,
  op.name AS opponent_player_name,
  p.recorded_at
FROM points p
JOIN sets s ON p.set_id = s.id
JOIN matches m ON s.match_id = m.id
LEFT JOIN point_details pd ON p.id = pd.point_id
LEFT JOIN players hp ON pd.home_player_id = hp.id
LEFT JOIN players op ON pd.opponent_player_id = op.id;

-- View: Set statistics summary
CREATE VIEW v_set_stats AS
SELECT
  s.id AS set_id,
  s.match_id,
  s.set_number,
  COUNT(p.id) AS total_points,
  SUM(CASE WHEN p.winning_team = 'home' THEN 1 ELSE 0 END) AS home_points,
  SUM(CASE WHEN p.winning_team = 'opponent' THEN 1 ELSE 0 END) AS opponent_points
FROM sets s
LEFT JOIN points p ON s.id = p.set_id
GROUP BY s.id, s.match_id, s.set_number;
```

---

## Data Migration Strategy

### Phase 1: Export from Google Sheets

```javascript
// Script to export existing data to JSON files
function exportToJSON() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet()
                .getSheetByName('StatsTableInGameTrends');
  var data = JSON.parse(sheet.getRange('A1').getValue());

  // Save to Google Drive as backup
  var file = DriveApp.createFile(
    'volleyball_data_export_' + new Date().toISOString() + '.json',
    JSON.stringify(data, null, 2),
    MimeType.PLAIN_TEXT
  );

  Logger.log('Export complete: ' + file.getUrl());
}
```

### Phase 2: Transform Data for Relational Schema

```javascript
// Node.js script to transform JSON to SQL inserts
const fs = require('fs');

function transformToSQL(oldData) {
  const matchId = generateUUID();
  const sqlStatements = [];

  // Create match
  sqlStatements.push(`
    INSERT INTO matches (id, match_date, home_team_id, opponent_team_id)
    VALUES ('${matchId}', NOW(),
            (SELECT id FROM teams WHERE is_home_team = TRUE LIMIT 1),
            (SELECT id FROM teams WHERE is_home_team = FALSE LIMIT 1));
  `);

  // Create sets and points
  oldData.forEach(set => {
    const setId = generateUUID();

    sqlStatements.push(`
      INSERT INTO sets (id, match_id, set_number, home_score, opponent_score)
      VALUES ('${setId}', '${matchId}', ${set.set_number},
              ${getMaxScore(set.points, 'home')},
              ${getMaxScore(set.points, 'opponent')});
    `);

    set.points.forEach(point => {
      const pointId = generateUUID();

      sqlStatements.push(`
        INSERT INTO points (id, set_id, point_number, winning_team,
                           home_score, opponent_score)
        VALUES ('${pointId}', '${setId}', ${point.point_number},
                '${point.winning_team}', ${point.home_score},
                ${point.opponent_score});
      `);

      sqlStatements.push(`
        INSERT INTO point_details (point_id, action_type, action_category,
                                   location_tempo)
        VALUES ('${pointId}', '${point.action_type}', '${point.action}',
                '${point.locationTempo}');
      `);
    });
  });

  return sqlStatements.join('\n');
}
```

### Phase 3: Import into Supabase

```javascript
// React component for one-time migration
import { createClient } from '@supabase/supabase-js';

async function migrateData(oldJsonData) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // 1. Create match
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .insert({
      match_date: new Date(),
      home_team_id: HOME_TEAM_ID,
      opponent_team_id: OPPONENT_TEAM_ID
    })
    .select()
    .single();

  // 2. Create sets and points
  for (const set of oldJsonData) {
    const { data: newSet } = await supabase
      .from('sets')
      .insert({
        match_id: match.id,
        set_number: set.set_number,
        home_score: Math.max(...set.points.map(p => p.home_score)),
        opponent_score: Math.max(...set.points.map(p => p.opponent_score))
      })
      .select()
      .single();

    for (const point of set.points) {
      const { data: newPoint } = await supabase
        .from('points')
        .insert({
          set_id: newSet.id,
          point_number: point.point_number,
          winning_team: point.winning_team,
          home_score: point.home_score,
          opponent_score: point.opponent_score
        })
        .select()
        .single();

      await supabase
        .from('point_details')
        .insert({
          point_id: newPoint.id,
          action_type: point.action_type,
          action_category: point.action,
          location_tempo: point.locationTempo
        });
    }
  }

  console.log('Migration complete!');
}
```

---

## React Implementation: Database Operations

### 1. Adding a New Point

```typescript
// src/api/pointsAPI.ts
import { supabase } from './supabaseClient';

interface NewPointData {
  setId: string;
  pointNumber: number;
  winningTeam: 'home' | 'opponent';
  homeScore: number;
  opponentScore: number;
  actionType: string;
  actionCategory: string;
  locationTempo?: string;
  homePlayerId?: string;
  opponentPlayerId?: string;
}

export async function addPoint(data: NewPointData) {
  // 1. Insert point
  const { data: point, error: pointError } = await supabase
    .from('points')
    .insert({
      set_id: data.setId,
      point_number: data.pointNumber,
      winning_team: data.winningTeam,
      home_score: data.homeScore,
      opponent_score: data.opponentScore
    })
    .select()
    .single();

  if (pointError) throw pointError;

  // 2. Insert point details
  const { error: detailsError } = await supabase
    .from('point_details')
    .insert({
      point_id: point.id,
      action_type: data.actionType,
      action_category: data.actionCategory,
      location_tempo: data.locationTempo,
      home_player_id: data.homePlayerId,
      opponent_player_id: data.opponentPlayerId
    });

  if (detailsError) throw detailsError;

  // 3. Update set scores
  await supabase
    .from('sets')
    .update({
      home_score: data.homeScore,
      opponent_score: data.opponentScore
    })
    .eq('id', data.setId);

  return point;
}
```

### 2. Fetching Set Statistics

```typescript
// src/api/statsAPI.ts
export async function getSetStats(setId: string) {
  const { data: points, error } = await supabase
    .from('v_points_full')
    .select('*')
    .eq('set_id', setId)
    .order('point_number', { ascending: true });

  if (error) throw error;

  // Calculate statistics
  const stats = {
    totalPoints: points.length,
    homeWins: points.filter(p => p.winning_team === 'home').length,
    opponentWins: points.filter(p => p.winning_team === 'opponent').length,

    homeAttacks: points.filter(p =>
      p.winning_team === 'home' && p.action_type === 'Att.'
    ).length,

    homeErrors: points.filter(p =>
      p.winning_team === 'opponent' &&
      ['Sp. E.', 'Ser. E.', 'Other'].includes(p.action_type)
    ).length,

    // ... more statistics
  };

  return { points, stats };
}
```

### 3. Real-time Updates

```typescript
// src/hooks/useRealtimePoints.ts
import { useEffect, useState } from 'react';
import { supabase } from '../api/supabaseClient';

export function useRealtimePoints(setId: string) {
  const [points, setPoints] = useState([]);

  useEffect(() => {
    // Initial fetch
    fetchPoints();

    // Subscribe to changes
    const subscription = supabase
      .channel(`set_${setId}`)
      .on('postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'points',
            filter: `set_id=eq.${setId}`
          },
          (payload) => {
            setPoints(prev => [...prev, payload.new]);
          }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [setId]);

  async function fetchPoints() {
    const { data } = await supabase
      .from('v_points_full')
      .select('*')
      .eq('set_id', setId);
    setPoints(data || []);
  }

  return points;
}
```

---

## Comparison: Old vs New Architecture

| Aspect | Google Sheets (Old) | Supabase (New) |
|--------|---------------------|----------------|
| **Storage** | Single JSON string in cell A1 | Relational tables with indexes |
| **Capacity** | ~50,000 characters | Unlimited (500MB free tier) |
| **Writes** | Full JSON replacement | Atomic row inserts |
| **Reads** | Parse entire JSON | Indexed queries with filters |
| **Concurrency** | Last write wins (unsafe) | Row-level locking (safe) |
| **Real-time** | Manual refresh | WebSocket subscriptions |
| **Offline** | No support | Can sync when reconnected |
| **Queries** | Client-side filtering | Server-side SQL queries |
| **Data Integrity** | None | Foreign keys, constraints |
| **Performance** | O(n) for all operations | O(log n) with indexes |

---

## Implementation Roadmap

### Week 1-2: Setup & Schema
- [ ] Create Supabase account and project
- [ ] Implement SQL schema with tables and views
- [ ] Set up row-level security policies
- [ ] Create Supabase client in React app

### Week 3-4: Core CRUD Operations
- [ ] Build API layer for matches, sets, points
- [ ] Implement `addPoint()` function
- [ ] Create `getSetStats()` function
- [ ] Add error handling and validation

### Week 5-6: Real-time Features
- [ ] Set up WebSocket subscriptions
- [ ] Implement real-time point updates
- [ ] Add optimistic UI updates
- [ ] Handle conflict resolution

### Week 7-8: Migration & Testing
- [ ] Export data from Google Sheets
- [ ] Transform old JSON to new schema
- [ ] Import historical data to Supabase
- [ ] Validate data integrity

### Week 9-10: Offline Support
- [ ] Implement local IndexedDB cache
- [ ] Build sync queue for offline changes
- [ ] Add conflict resolution UI
- [ ] Test offline → online sync

---

## Conclusion

The current Google Sheets JSON storage approach was suitable for prototyping but has reached its limits. Migrating to Supabase provides:

✅ **Scalability** - No data size limits
✅ **Performance** - Indexed queries are 100x+ faster
✅ **Real-time** - Live updates across all devices
✅ **Data Integrity** - Referential integrity and validation
✅ **Offline Support** - PWA can sync when reconnected
✅ **Developer Experience** - SQL queries vs JSON parsing

The proposed Supabase architecture aligns perfectly with the React PWA rebuild and sets a solid foundation for future features like advanced analytics, player tracking, and multi-user collaboration.
