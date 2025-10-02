# IMPLEMENTATION PLAN: InGame Stats Feature Rebuild

**Document Version:** 1.0
**Created:** 2025-10-01
**Status:** Ready for Implementation
**Target:** Rebuild OldTool InGame Trend feature in React PWA

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Phase-by-Phase Implementation](#phase-by-phase-implementation)
4. [Technical Decisions](#technical-decisions)
5. [Component Breakdown](#component-breakdown)
6. [Data Flow Architecture](#data-flow-architecture)
7. [Testing Strategy](#testing-strategy)
8. [File Structure](#file-structure)
9. [Dependencies & Libraries](#dependencies--libraries)
10. [Migration Strategy](#migration-strategy)

---

## Executive Summary

### Objective
Transform the InGame Trend feature from the OldTool Retool application into a modern, production-ready React component with full offline support, real-time capabilities, and proper database architecture.

### Current State
- **Existing:** Mock UI in `src/pages/StatsPage.jsx` with basic layout
- **Tech Stack:** React 19, Vite, CSS3, PWA-enabled
- **Data:** No backend integration yet (mock data only)

### Target State
- **Full Implementation:** Point-by-point entry with decision tree UI
- **Statistics Dashboard:** 2 view modes (list view + stats view) with 8 analytical charts
- **Database:** Supabase/PostgreSQL with real-time subscriptions
- **Offline-First:** IndexedDB cache with background sync
- **TypeScript:** Full type safety across all components

### Success Criteria
1. Record 100+ points per match with <100ms response time
2. Calculate 3 summary stats + 8 charts in <500ms
3. Support offline point entry with auto-sync when online
4. Match OldTool feature parity 100%
5. Pass accessibility audit (WCAG AA)

---

## Architecture Overview

### 1. Component Hierarchy

```
StatsPage (Route Component)
├── GameHeader
│   ├── GameInfo
│   └── ScoreDisplay
├── SetTabs (Set 1, Set 2, Set 3, Set 4, Set 5, Total)
├── ViewToggle (Hide info / Show info)
│
├── VIEW 1: Point Entry + List View
│   ├── PointEntryForm
│   │   ├── WinLossToggle (Point WIN / Point LOSS)
│   │   ├── CategorySelector (Segmented Control)
│   │   ├── SubcategoryDropdown
│   │   ├── LocationTempoDropdown (conditional)
│   │   └── PlayerDropdown
│   ├── PointByPointList
│   │   └── PointRow[] (Score | Home Action | Opponent Action)
│   └── UndoButton
│
└── VIEW 2: Statistics Dashboard
    ├── SummaryStats (3 metrics in row)
    │   ├── OpponentErrors
    │   ├── Aces
    │   └── Attacks
    ├── ChartsGrid (2x4 layout)
    │   ├── HitVsAceChart (Home)
    │   ├── HitVsAceChart (Opponent)
    │   ├── AttackKDChart (Home)
    │   ├── AttackKDChart (Opponent)
    │   ├── KillZonesChart (Home)
    │   ├── KillZonesChart (Opponent)
    │   ├── AttackPositionsChart (Home)
    │   └── AttackPositionsChart (Opponent)
    └── ChartLegend
```

### 2. State Management Strategy

**Recommended: React Context API + useReducer**

Rationale:
- App is not complex enough to justify Redux/Zustand
- Context provides sufficient performance with memoization
- useReducer handles complex state updates (point entry workflow)
- Easy to understand for future maintenance

```typescript
// State Context Structure
InGameStatsContext
├── matchState (current match data)
├── pointsState (all points across sets)
├── uiState (selected set, view mode)
└── actions (addPoint, undoPoint, setView, etc.)
```

**Alternative: Local State + Custom Hooks**
- For simpler implementation without Context complexity
- Use `useInGameStats()` hook to encapsulate all logic
- Memoized calculations with `useMemo` and `useCallback`

### 3. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      User Interface                         │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   PointEntryForm                            │
│  Decision Tree: Win/Loss → Category → Subcategory →        │
│                 Location/Tempo → Player                     │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Form Validation                            │
│  - Required fields check                                    │
│  - ACTION_TYPES schema validation                           │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│               Context Dispatch (addPoint)                   │
│  Optimistic update → Local state + IndexedDB                │
└───────────────────────────┬─────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                ↓                       ↓
┌──────────────────────┐   ┌──────────────────────┐
│  PointByPointList    │   │ StatisticsDashboard  │
│  (View 1)            │   │ (View 2)             │
│  - Real-time update  │   │ - Memoized calcs     │
│  - Color coding      │   │ - Chart rendering    │
└──────────────────────┘   └──────────────────────┘
                │                       │
                └───────────┬───────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                Background Sync (Online)                     │
│  IndexedDB → Supabase API → PostgreSQL                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase-by-Phase Implementation

### PHASE 1: Foundation & Data Structures (Week 1)

**Goal:** Set up TypeScript types, constants, and basic project structure

#### Tasks

**1.1 TypeScript Setup**
- [ ] Install TypeScript: `npm install -D typescript @types/react @types/react-dom`
- [ ] Configure `tsconfig.json` for React 19
- [ ] Rename `.jsx` files to `.tsx` incrementally (start with new files)

**1.2 Create Type Definitions**

File: `src/types/inGameStats.types.ts`

```typescript
// Point data structure
export interface PointData {
  id: string;
  set_id: string;
  point_number: number;
  winning_team: 'home' | 'opponent';
  home_score: number;
  opponent_score: number;
  recorded_at: string;

  // Action details
  action_type: string;
  action_category: string;
  location_tempo: string | null;

  // Players
  home_player_id: string | null;
  opponent_player_id: string | null;
  home_player_name?: string;
  opponent_player_name?: string;

  // Metadata
  notes?: string;
}

// Set data
export interface SetData {
  id: string;
  match_id: string;
  set_number: number;
  home_score: number;
  opponent_score: number;
  is_completed: boolean;
  points: PointData[];
}

// Match data
export interface MatchData {
  id: string;
  match_date: string;
  home_team: TeamData;
  opponent_team: TeamData;
  sets: SetData[];
}

// Team and player types
export interface TeamData {
  id: string;
  name: string;
  players: PlayerData[];
}

export interface PlayerData {
  id: string;
  name: string;
  jersey_number: number;
  position: string;
}

// UI State
export interface InGameStatsUIState {
  selectedSet: number | 'Total';
  viewMode: 'list' | 'stats';
  isLoading: boolean;
  error: string | null;
}

// Statistics output types
export interface SummaryStats {
  homeErrors: number;
  opponentErrors: number;
  homeAces: number;
  opponentAces: number;
  homeAttacks: number;
  opponentAttacks: number;
}

export interface PlayerStat {
  player: string;
  count: number;
  color: string;
}

export interface HitAceData {
  aces: PlayerStat[];
  hits: PlayerStat[];
}

export interface PlayerKDData {
  player: string;
  kills: number;
  errors: number;
  attempts: number;
  efficiency: number;
  color: string;
}

export interface KillZoneData {
  zone: string;
  players: PlayerStat[];
}

export interface AttackPositionData {
  position: 'OH' | 'MB' | 'Oppo' | 'BackRow';
  players: PlayerStat[];
}
```

**1.3 Create Action Types Constant**

File: `src/constants/actionTypes.ts`

```typescript
// Exact structure from InGameTrend_PointWinLoss_ACTUAL_Structure.md
export const ACTION_TYPES = [
  {
    type: 'Win',
    categories: {
      'Att.': {
        category: 'Attack (Sp.)',
        subcategories: ['Hard Spike', 'Tip/Roll', 'Touch Out', 'Setter Dump'],
        locationTempo: [
          'OH (Line)', 'OH (Cross)', 'Oppo (Line)', 'Oppo (Cross)',
          'MB (A)', 'MB (B)', 'MB (C)', 'MB (Slide)', 'MB (2)',
          'Back Row - Pipe', 'Back Row - P1', '2nd Tempo', 'Other'
        ]
      },
      // ... (copy complete structure from documentation)
    }
  },
  {
    type: 'Loss',
    categories: {
      // ... (copy complete structure from documentation)
    }
  }
] as const;

// Helper types derived from ACTION_TYPES
export type WinLossType = typeof ACTION_TYPES[number]['type'];
export type CategoryKey = keyof typeof ACTION_TYPES[0]['categories'] |
                          keyof typeof ACTION_TYPES[1]['categories'];
```

**1.4 File Structure Setup**

Create directory structure:
```bash
src/
├── features/
│   └── inGameStats/
│       ├── components/
│       ├── hooks/
│       ├── utils/
│       ├── context/
│       └── types/
├── types/
│   └── inGameStats.types.ts
└── constants/
    └── actionTypes.ts
```

#### Files to Create
- `src/types/inGameStats.types.ts`
- `src/constants/actionTypes.ts`
- `src/features/inGameStats/context/InGameStatsContext.tsx`
- `src/features/inGameStats/utils/validation.ts`

#### Acceptance Criteria
- [x] TypeScript compiles without errors
- [x] ACTION_TYPES constant matches OldTool exactly
- [x] All types properly exported and importable
- [x] Directory structure created

---

### PHASE 2: Point Entry UI with Decision Tree (Week 2-3)

**Goal:** Build the multi-step point entry form with conditional rendering

#### Tasks

**2.1 Create PointEntryForm Component**

File: `src/features/inGameStats/components/PointEntryForm.tsx`

Key features:
- Step 1: Win/Loss toggle buttons
- Step 2: Category segmented control (conditional based on Win/Loss)
- Step 3: Subcategory dropdown (conditional based on category)
- Step 4: Location/Tempo dropdown (conditional - only for certain categories)
- Step 5: Player dropdown (filtered by team)
- Form validation and error states
- Clear/Reset functionality

**2.2 Create Sub-Components**

Files to create:
- `WinLossToggle.tsx` - Two-button toggle for Point WIN / Point LOSS
- `SegmentedControl.tsx` - Generic segmented control (reusable)
- `ConditionalDropdown.tsx` - Dropdown that shows/hides based on conditions
- `PlayerSelector.tsx` - Player dropdown with search/filter

**2.3 Implement Form State Management**

Use `useReducer` pattern for complex form state:

```typescript
interface PointEntryState {
  winLoss: 'Win' | 'Loss' | null;
  category: string | null;
  subcategory: string | null;
  locationTempo: string | null;
  player: string | null;
  isValid: boolean;
  errors: Record<string, string>;
}

type PointEntryAction =
  | { type: 'SET_WIN_LOSS'; payload: 'Win' | 'Loss' }
  | { type: 'SET_CATEGORY'; payload: string }
  | { type: 'SET_SUBCATEGORY'; payload: string }
  | { type: 'SET_LOCATION_TEMPO'; payload: string }
  | { type: 'SET_PLAYER'; payload: string }
  | { type: 'RESET_FORM' }
  | { type: 'VALIDATE' };

function pointEntryReducer(
  state: PointEntryState,
  action: PointEntryAction
): PointEntryState {
  // Implementation
}
```

**2.4 Implement Conditional Rendering Logic**

Create utility function:

File: `src/features/inGameStats/utils/formHelpers.ts`

```typescript
export function shouldShowLocationTempo(
  winLoss: WinLossType | null,
  category: string | null
): boolean {
  if (!winLoss || !category) return false;

  const categoryData = ACTION_TYPES
    .find(t => t.type === winLoss)
    ?.categories[category];

  return !!categoryData?.locationTempo;
}

export function getAvailableCategories(
  winLoss: WinLossType | null
): string[] {
  if (!winLoss) return [];
  const typeData = ACTION_TYPES.find(t => t.type === winLoss);
  return Object.keys(typeData?.categories || {});
}

// Similar helpers for subcategories, location/tempo, players
```

**2.5 Styling**

File: `src/features/inGameStats/components/PointEntryForm.css`

Design requirements:
- iPad-optimized layout (primary target)
- Large touch targets (minimum 44x44px)
- Clear visual hierarchy (progressive disclosure)
- Disabled state styling for incomplete steps
- Validation error states (red borders, error messages)

#### Files to Create
- `PointEntryForm.tsx` (main component)
- `WinLossToggle.tsx`
- `SegmentedControl.tsx`
- `ConditionalDropdown.tsx`
- `PlayerSelector.tsx`
- `formHelpers.ts` (utilities)
- `formValidation.ts` (validation logic)
- `PointEntryForm.css`

#### Acceptance Criteria
- [x] User can select Win/Loss and see appropriate categories
- [x] Category selection shows correct subcategories
- [x] Location/Tempo only appears for applicable categories (Att., Ser., Op. Att., Op. Ace, Sp. E.)
- [x] Location/Tempo HIDDEN for: Blo., Other, Ser. E.
- [x] Player dropdown filters by team (home vs opponent)
- [x] Form cannot be submitted until all required fields filled
- [x] Form resets after successful submission
- [x] Touch targets meet 44x44px minimum

---

### PHASE 3: Statistics Dashboard (Week 4-5)

**Goal:** Build both view modes - Point List and Statistics Charts

#### 3.1 Point-by-Point List View

**File:** `src/features/inGameStats/components/PointByPointList.tsx`

Features:
- 3-column layout: Score | Home Team Action | Opponent Team Action
- Color coding: Black (score), Blue (home wins), Red (opponent wins)
- Dynamic text formatting based on action type
- Reverse chronological order (newest first)
- Virtual scrolling for performance (react-window)

**Text Formatting Rules:**

```typescript
function formatHomeAction(point: PointData): string {
  if (point.winning_team !== 'home') return '';

  // Pattern 1: Home player scored
  if (point.action_type === 'Att.' || point.action_type === 'Ser.' || point.action_type === 'Blo.') {
    return `${point.home_player_name} ${point.action_type}${point.action_category}`;
  }

  // Pattern 2: Opponent error gave home a point
  if (point.action_type === 'Op. E.') {
    return `[${getJerseyNumber(point.opponent_player_id)} ${point.opponent_player_name}] ${point.action_category}`;
  }

  // Pattern 3: Other
  return point.action_category;
}

function formatOpponentAction(point: PointData): string {
  if (point.winning_team !== 'opponent') return '';

  // Similar logic but for opponent wins
}
```

#### 3.2 Summary Statistics

**File:** `src/features/inGameStats/components/SummaryStats.tsx`

Calculate 3 key metrics:

```typescript
function calculateSummaryStats(points: PointData[]): SummaryStats {
  return {
    homeErrors: points.filter(p =>
      p.winning_team === 'opponent' &&
      ['Sp. E.', 'Ser. E.', 'Other'].includes(p.action_type)
    ).length,

    opponentErrors: points.filter(p =>
      p.winning_team === 'home' &&
      p.action_type === 'Op. E.'
    ).length,

    homeAces: points.filter(p =>
      p.winning_team === 'home' &&
      p.action_type === 'Ser.' &&
      p.action_category.includes('Ace')
    ).length,

    opponentAces: points.filter(p =>
      p.winning_team === 'opponent' &&
      p.action_type === 'Op. Ace'
    ).length,

    homeAttacks: points.filter(p =>
      p.winning_team === 'home' &&
      p.action_type === 'Att.'
    ).length,

    opponentAttacks: points.filter(p =>
      p.winning_team === 'opponent' &&
      p.action_type === 'Op. Att.'
    ).length
  };
}
```

UI Layout:
```
┌─────────────────────────────────────────────┐
│  9        Opponent Errors           12      │
│  3        Aces                       3       │
│  13       Attacks                    6       │
└─────────────────────────────────────────────┘
```

#### 3.3 Chart Implementation

**Chart Library Choice: Chart.js**

Install:
```bash
npm install chart.js react-chartjs-2
```

Rationale:
- More flexible than Recharts for custom designs
- Better performance with large datasets
- Excellent documentation
- Active maintenance

**Chart Components:**

1. **HitVsAceChart.tsx** - Stacked horizontal bar chart
2. **AttackKDChart.tsx** - Stacked vertical bar with text overlay
3. **KillZonesChart.tsx** - Stacked vertical bar
4. **AttackPositionsChart.tsx** - Stacked vertical bar

**Shared Chart Utilities:**

File: `src/features/inGameStats/utils/chartHelpers.ts`

```typescript
// Color assignment for players
const PLAYER_COLORS = [
  '#3B82F6', '#10B981', '#EF4444', '#F59E0B',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
  '#6366F1', '#84CC16'
];

export function getPlayerColor(playerName: string): string {
  const hash = playerName.split('').reduce(
    (acc, char) => char.charCodeAt(0) + ((acc << 5) - acc),
    0
  );
  return PLAYER_COLORS[Math.abs(hash) % PLAYER_COLORS.length];
}

// Chart.js configuration presets
export function getChartDefaults(): ChartOptions {
  return {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { position: 'bottom' },
      tooltip: { enabled: true }
    }
  };
}
```

#### 3.4 Statistics Calculation Functions

**File:** `src/features/inGameStats/utils/statsCalculations.ts`

Implement all calculation functions from the specification:
- `calculateHitVsAce(points, team)`
- `calculateAttackKD(points, team)`
- `calculateKillZones(points, team)`
- `calculateAttackPositions(points, team)`

Use memoization for performance:

```typescript
export const useStatistics = (points: PointData[]) => {
  return useMemo(() => ({
    summary: calculateSummaryStats(points),
    hitVsAce: {
      home: calculateHitVsAce(points, 'home'),
      opponent: calculateHitVsAce(points, 'opponent')
    },
    attackKD: {
      home: calculateAttackKD(points, 'home'),
      opponent: calculateAttackKD(points, 'opponent')
    },
    killZones: {
      home: calculateKillZones(points, 'home'),
      opponent: calculateKillZones(points, 'opponent')
    },
    attackPositions: {
      home: calculateAttackPositions(points, 'home'),
      opponent: calculateAttackPositions(points, 'opponent')
    }
  }), [points]);
};
```

#### Files to Create
- `PointByPointList.tsx`
- `PointRow.tsx`
- `SummaryStats.tsx`
- `StatisticsDashboard.tsx`
- `HitVsAceChart.tsx`
- `AttackKDChart.tsx`
- `KillZonesChart.tsx`
- `AttackPositionsChart.tsx`
- `statsCalculations.ts`
- `chartHelpers.ts`

#### Acceptance Criteria
- [x] Point list displays all points in reverse chronological order
- [x] Color coding matches specification (blue/red/black)
- [x] Virtual scrolling works smoothly with 100+ points
- [x] Summary stats calculate correctly
- [x] All 8 charts render with correct data
- [x] Charts use consistent player colors
- [x] Chart legends display properly
- [x] Statistics recalculate in <500ms when set changes

---

### PHASE 4: Database Integration - Supabase (Week 6-7)

**Goal:** Replace mock data with real Supabase backend

#### 4.1 Supabase Setup

**Create Supabase Project:**
1. Go to https://supabase.com
2. Create new project: `volleyball-coach-app`
3. Save credentials to `.env.local`

**Environment Variables:**

File: `.env.local`
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Install Supabase Client:**
```bash
npm install @supabase/supabase-js
```

#### 4.2 Database Schema

Execute SQL schema from `InGameTrend_DATABASE_Architecture.md`:

```sql
-- Tables: matches, sets, points, point_details, teams, players
-- Views: v_points_full, v_set_stats
-- Indexes for query performance
```

File: `supabase/schema.sql`

Run in Supabase SQL Editor.

#### 4.3 Supabase Client Setup

**File:** `src/lib/supabaseClient.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

#### 4.4 API Layer

**File:** `src/features/inGameStats/api/pointsAPI.ts`

```typescript
import { supabase } from '@/lib/supabaseClient';
import type { PointData, NewPointData } from '@/types/inGameStats.types';

export async function addPoint(data: NewPointData): Promise<PointData> {
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

export async function getSetPoints(setId: string): Promise<PointData[]> {
  const { data, error } = await supabase
    .from('v_points_full')
    .select('*')
    .eq('set_id', setId)
    .order('point_number', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function undoLastPoint(setId: string): Promise<void> {
  // Get last point
  const { data: lastPoint } = await supabase
    .from('points')
    .select('*')
    .eq('set_id', setId)
    .order('point_number', { ascending: false })
    .limit(1)
    .single();

  if (!lastPoint) return;

  // Delete point (cascade deletes point_details)
  await supabase
    .from('points')
    .delete()
    .eq('id', lastPoint.id);
}
```

**File:** `src/features/inGameStats/api/matchesAPI.ts`

Similar API functions for matches, sets, teams, players.

#### 4.5 Real-time Subscriptions

**File:** `src/features/inGameStats/hooks/useRealtimePoints.ts`

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { PointData } from '@/types/inGameStats.types';

export function useRealtimePoints(setId: string) {
  const [points, setPoints] = useState<PointData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initial fetch
    fetchPoints();

    // Subscribe to changes
    const channel = supabase
      .channel(`set_${setId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'points',
          filter: `set_id=eq.${setId}`
        },
        (payload) => {
          setPoints(prev => [...prev, payload.new as PointData]);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [setId]);

  async function fetchPoints() {
    setIsLoading(true);
    const { data } = await supabase
      .from('v_points_full')
      .select('*')
      .eq('set_id', setId);
    setPoints(data || []);
    setIsLoading(false);
  }

  return { points, isLoading, refetch: fetchPoints };
}
```

#### Files to Create
- `.env.local` (gitignored)
- `src/lib/supabaseClient.ts`
- `src/features/inGameStats/api/pointsAPI.ts`
- `src/features/inGameStats/api/matchesAPI.ts`
- `src/features/inGameStats/hooks/useRealtimePoints.ts`
- `supabase/schema.sql`

#### Acceptance Criteria
- [x] Supabase project created and configured
- [x] Database schema deployed successfully
- [x] Environment variables loaded correctly
- [x] Point creation persists to database
- [x] Points load from database on page refresh
- [x] Real-time updates work across browser tabs
- [x] Error handling for network failures

---

## Technical Decisions

### 1. TypeScript vs JavaScript

**DECISION: TypeScript**

**Rationale:**
- Type safety prevents runtime errors in complex state management
- Better IDE autocomplete for ACTION_TYPES and form states
- Self-documenting code (interfaces serve as documentation)
- Easier refactoring with confidence
- Industry best practice for React applications

**Implementation:**
- Incremental adoption (new files in TS, old files stay JS)
- Start with `.tsx` for all new components
- Convert existing files if time permits

**Trade-offs:**
- Learning curve for developers unfamiliar with TS
- Initial setup time
- More verbose code

**Verdict:** Benefits far outweigh costs for a feature this complex.

---

### 2. Chart Library: Chart.js vs Recharts

**DECISION: Chart.js (with react-chartjs-2)**

**Comparison:**

| Feature | Chart.js | Recharts |
|---------|----------|----------|
| Bundle Size | 200KB | 450KB |
| Performance | Excellent (Canvas) | Good (SVG) |
| Customization | High | Medium |
| React Integration | Via wrapper | Native |
| Documentation | Excellent | Good |
| Stacked Bars | Built-in | Built-in |
| Text Overlays | Easy | Moderate |
| Learning Curve | Low | Medium |

**Rationale:**
- Smaller bundle size (important for PWA)
- Better performance with large datasets (100+ points)
- More flexible for custom chart designs
- Easier to add text overlays on bars (K/D chart requirement)
- Active community and maintenance

**Alternative Considered:** Recharts
- More "React-like" API
- Better for simple use cases
- Heavier and slower for complex charts

**Verdict:** Chart.js better suited for our performance and customization needs.

---

### 3. State Management: Context API vs Zustand vs Redux

**DECISION: React Context API + useReducer**

**Rationale:**
- App scope is single-feature (not global state needed)
- Context sufficient for passing match/points data down tree
- useReducer ideal for complex form state transitions
- No external dependencies needed
- Easier for team to maintain

**Implementation:**

```typescript
// Context structure
InGameStatsContext
├── matchState
├── pointsState
├── uiState
└── dispatch (for actions)
```

**Alternative Considered: Zustand**
- Simpler API than Redux
- Better performance than Context
- Worth considering if app grows significantly

**Verdict:** Start with Context, migrate to Zustand if performance issues arise.

---

### 4. Form Validation Strategy

**DECISION: Custom validation with zod schema**

**Install zod:**
```bash
npm install zod
```

**Implementation:**

```typescript
import { z } from 'zod';

const pointEntrySchema = z.object({
  winLoss: z.enum(['Win', 'Loss']),
  category: z.string().min(1),
  subcategory: z.string().min(1),
  locationTempo: z.string().nullable(),
  player: z.string().min(1)
}).refine(
  (data) => {
    // Custom validation: location/tempo required for certain categories
    const requiresLocation = shouldShowLocationTempo(data.winLoss, data.category);
    if (requiresLocation && !data.locationTempo) return false;
    return true;
  },
  { message: 'Location/Tempo is required for this action type' }
);
```

**Alternative Considered: react-hook-form**
- Overkill for this use case
- Adds complexity for a simple 5-field form

**Verdict:** Zod provides perfect balance of type safety and validation.

---

### 5. Offline Strategy

**DECISION: IndexedDB cache + Background Sync API**

**Architecture:**

```
User Action → Optimistic UI Update → IndexedDB Write → Background Sync Queue
                                                                ↓
                                                        (When online)
                                                                ↓
                                                          Supabase API
```

**Implementation:**

Use `idb` library for IndexedDB:
```bash
npm install idb
```

**File:** `src/lib/offlineStorage.ts`

```typescript
import { openDB } from 'idb';

const DB_NAME = 'volleyball_coach_db';
const POINTS_STORE = 'points';
const SYNC_QUEUE_STORE = 'sync_queue';

export async function initDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(POINTS_STORE, { keyPath: 'id' });
      db.createObjectStore(SYNC_QUEUE_STORE, { autoIncrement: true });
    }
  });
}

export async function cachePoint(point: PointData) {
  const db = await initDB();
  await db.put(POINTS_STORE, point);
}

export async function queueForSync(action: SyncAction) {
  const db = await initDB();
  await db.add(SYNC_QUEUE_STORE, {
    action,
    timestamp: Date.now(),
    retries: 0
  });
}
```

**Service Worker for Background Sync:**

File: `public/sw.js`

```javascript
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-points') {
    event.waitUntil(syncPendingPoints());
  }
});

async function syncPendingPoints() {
  // Fetch from IndexedDB sync queue
  // POST to Supabase API
  // Remove from queue on success
}
```

**Trade-offs:**
- More complexity than online-only approach
- Requires service worker for background sync
- Potential for sync conflicts (rare with volleyball data)

**Verdict:** Essential for PWA use case (coaches at gyms with spotty WiFi).

---

## Component Breakdown

### Core Components (17 total)

#### 1. StatsPage (Page Component)
**Responsibility:** Top-level page container, routing, layout
**Props:** None (route component)
**State:**
- `selectedSet: number | 'Total'`
- `viewMode: 'list' | 'stats'`
**Exports:** Default component

---

#### 2. GameHeader
**Responsibility:** Display match metadata and current score
**Props:**
```typescript
interface GameHeaderProps {
  homeTeam: string;
  opponentTeam: string;
  homeScore: number;
  opponentScore: number;
  matchDate: string;
  currentSet: number;
}
```
**Reusability:** High (can be used in other match views)

---

#### 3. SetTabs
**Responsibility:** Tab navigation for sets (1-5 + Total)
**Props:**
```typescript
interface SetTabsProps {
  currentSet: number | 'Total';
  availableSets: number[];
  onSetChange: (set: number | 'Total') => void;
}
```
**Reusability:** High

---

#### 4. ViewToggle
**Responsibility:** Toggle between list and stats view
**Props:**
```typescript
interface ViewToggleProps {
  viewMode: 'list' | 'stats';
  onViewChange: (mode: 'list' | 'stats') => void;
  labels?: { list: string; stats: string };
}
```
**Reusability:** High (generic toggle component)

---

#### 5. PointEntryForm
**Responsibility:** Multi-step form for entering point data
**Props:**
```typescript
interface PointEntryFormProps {
  currentSet: number;
  homeTeam: TeamData;
  opponentTeam: TeamData;
  currentScore: { home: number; opponent: number };
  onPointAdded: (point: PointData) => void;
}
```
**State:** Complex (managed by useReducer)
**Reusability:** Low (highly specialized)

---

#### 6. WinLossToggle
**Responsibility:** Binary toggle for Win/Loss selection
**Props:**
```typescript
interface WinLossToggleProps {
  value: 'Win' | 'Loss' | null;
  onChange: (value: 'Win' | 'Loss') => void;
  disabled?: boolean;
}
```
**Reusability:** Medium

---

#### 7. SegmentedControl
**Responsibility:** Generic segmented control UI component
**Props:**
```typescript
interface SegmentedControlProps {
  options: Array<{ key: string; label: string }>;
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}
```
**Reusability:** Very High (generic component)

---

#### 8. ConditionalDropdown
**Responsibility:** Dropdown that shows/hides based on condition
**Props:**
```typescript
interface ConditionalDropdownProps {
  label: string;
  options: string[];
  value: string | null;
  onChange: (value: string) => void;
  show: boolean;
  required?: boolean;
  placeholder?: string;
}
```
**Reusability:** Very High

---

#### 9. PlayerSelector
**Responsibility:** Player selection dropdown with search
**Props:**
```typescript
interface PlayerSelectorProps {
  players: PlayerData[];
  value: string | null;
  onChange: (playerId: string) => void;
  placeholder?: string;
  required?: boolean;
}
```
**Reusability:** High

---

#### 10. PointByPointList
**Responsibility:** Display chronological list of all points
**Props:**
```typescript
interface PointByPointListProps {
  points: PointData[];
  onUndoPoint?: (pointId: string) => void;
}
```
**Reusability:** Medium
**Performance:** Uses react-window for virtualization

---

#### 11. PointRow
**Responsibility:** Single point display (3-column layout)
**Props:**
```typescript
interface PointRowProps {
  point: PointData;
  showUndo?: boolean;
  onUndo?: () => void;
}
```
**Reusability:** Low (specific formatting)

---

#### 12. SummaryStats
**Responsibility:** Display 3 key metrics comparison
**Props:**
```typescript
interface SummaryStatsProps {
  stats: SummaryStats;
}
```
**Reusability:** Medium

---

#### 13. StatisticsDashboard
**Responsibility:** Container for all charts (2x4 grid)
**Props:**
```typescript
interface StatisticsDashboardProps {
  points: PointData[];
}
```
**Reusability:** Low

---

#### 14. HitVsAceChart
**Responsibility:** Stacked horizontal bar chart (aces vs hits by player)
**Props:**
```typescript
interface HitVsAceChartProps {
  data: HitAceData;
  team: 'home' | 'opponent';
  title: string;
}
```
**Reusability:** Medium

---

#### 15. AttackKDChart
**Responsibility:** K/D efficiency vertical bar chart
**Props:**
```typescript
interface AttackKDChartProps {
  data: PlayerKDData[];
  team: 'home' | 'opponent';
  title: string;
}
```
**Reusability:** Medium

---

#### 16. KillZonesChart
**Responsibility:** Kill distribution by court zone
**Props:**
```typescript
interface KillZonesChartProps {
  data: KillZoneData[];
  team: 'home' | 'opponent';
  title: string;
}
```
**Reusability:** Medium

---

#### 17. AttackPositionsChart
**Responsibility:** Attack distribution by position (OH/MB/Oppo/BackRow)
**Props:**
```typescript
interface AttackPositionsChartProps {
  data: AttackPositionData[];
  team: 'home' | 'opponent';
  title: string;
}
```
**Reusability:** Medium

---

### Reusability Summary

**Very High (4):** SegmentedControl, ConditionalDropdown, GameHeader, SetTabs
**High (3):** ViewToggle, PlayerSelector, PointByPointList
**Medium (7):** WinLossToggle, SummaryStats, HitVsAceChart, AttackKDChart, KillZonesChart, AttackPositionsChart
**Low (3):** PointEntryForm, PointRow, StatisticsDashboard

---

## Data Flow Architecture

### 1. Point Entry Flow

```
User fills form (5 steps)
        ↓
Form validation (zod schema)
        ↓
Submit button click
        ↓
Dispatch ADD_POINT action
        ↓
┌───────────────────┬───────────────────┐
↓                   ↓                   ↓
Context Update   IndexedDB Cache    UI Optimistic Update
    ↓                   ↓                   ↓
Background Sync   (If offline)       Immediate display
    ↓
Supabase API (when online)
    ↓
Real-time subscription triggers
    ↓
Other clients receive update
```

### 2. Statistics Calculation Flow

```
User changes set filter
        ↓
Context updates selectedSet
        ↓
useMemo triggers recalculation
        ↓
Filter points by set_number
        ↓
┌────────┬────────┬────────┬────────┐
↓        ↓        ↓        ↓        ↓
Summary  HitAce   AttackKD Zones   Positions
Stats    Calc     Calc     Calc    Calc
        ↓
All calculations memoized
        ↓
Charts re-render with new data
```

**Performance Optimization:**
- Memoize calculation functions
- Only recalculate when points array changes
- Use shallow equality checks for arrays
- Debounce rapid set changes

### 3. Real-time Update Flow

```
Coach A adds point on iPad 1
        ↓
Supabase API receives INSERT
        ↓
PostgreSQL triggers notification
        ↓
Supabase broadcasts via WebSocket
        ↓
Coach B's iPad 2 receives message
        ↓
useRealtimePoints hook updates state
        ↓
UI re-renders with new point
        ↓
Statistics auto-recalculate
```

### 4. Offline → Online Sync Flow

```
User is offline
        ↓
Adds 5 points
        ↓
Each point → IndexedDB + Sync Queue
        ↓
UI updates optimistically
        ↓
User comes back online
        ↓
Service Worker detects network
        ↓
Triggers 'sync' event
        ↓
Process sync queue sequentially
        ↓
POST each point to Supabase
        ↓
On success → remove from queue
        ↓
On error → increment retry count
        ↓
Notify user of sync completion
```

**Conflict Resolution:**
- Volleyball points are append-only (no updates)
- Undo creates a new "deletion" record
- Last-write-wins for score updates
- Display warning if scores diverge

---

## Testing Strategy

### Unit Tests

**Tools:** Vitest + React Testing Library

**Install:**
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

**Configure:** `vite.config.ts`
```typescript
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts'
  }
});
```

**Coverage Targets:**
- Calculation functions: 100%
- Form validation: 100%
- Components: 80%
- Hooks: 90%

**Example Tests:**

```typescript
// statsCalculations.test.ts
import { describe, it, expect } from 'vitest';
import { calculateSummaryStats } from './statsCalculations';

describe('calculateSummaryStats', () => {
  it('should count home errors correctly', () => {
    const points = [
      { winning_team: 'opponent', action_type: 'Sp. E.' },
      { winning_team: 'opponent', action_type: 'Ser. E.' },
      { winning_team: 'home', action_type: 'Att.' }
    ];
    const stats = calculateSummaryStats(points);
    expect(stats.homeErrors).toBe(2);
  });

  // ... more test cases
});

// PointEntryForm.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { PointEntryForm } from './PointEntryForm';

describe('PointEntryForm', () => {
  it('should show categories after selecting Win', () => {
    render(<PointEntryForm {...defaultProps} />);

    fireEvent.click(screen.getByText('Point WIN'));

    expect(screen.getByText('Att.')).toBeInTheDocument();
    expect(screen.getByText('Ser.')).toBeInTheDocument();
  });

  it('should hide location/tempo for Block category', () => {
    render(<PointEntryForm {...defaultProps} />);

    fireEvent.click(screen.getByText('Point WIN'));
    fireEvent.click(screen.getByText('Blo.'));

    expect(screen.queryByText('Location/Tempo')).not.toBeInTheDocument();
  });
});
```

### Integration Tests

**Scope:** Test component interactions and data flow

```typescript
// PointEntry.integration.test.tsx
describe('Point Entry Integration', () => {
  it('should complete full point entry workflow', async () => {
    const onPointAdded = vi.fn();
    render(<PointEntryForm onPointAdded={onPointAdded} {...props} />);

    // Step 1: Select Win
    fireEvent.click(screen.getByText('Point WIN'));

    // Step 2: Select Category
    fireEvent.click(screen.getByText('Att.'));

    // Step 3: Select Subcategory
    fireEvent.change(screen.getByLabelText('Action'), {
      target: { value: 'Hard Spike' }
    });

    // Step 4: Select Location
    fireEvent.change(screen.getByLabelText('Location/Tempo'), {
      target: { value: 'OH (Line)' }
    });

    // Step 5: Select Player
    fireEvent.change(screen.getByLabelText('Player'), {
      target: { value: 'player-1' }
    });

    // Submit
    fireEvent.click(screen.getByText('Add Point'));

    await waitFor(() => {
      expect(onPointAdded).toHaveBeenCalledWith(
        expect.objectContaining({
          action_type: 'Att.',
          action_category: 'Hard Spike',
          location_tempo: 'OH (Line)'
        })
      );
    });
  });
});
```

### E2E Tests

**Tools:** Playwright

**Install:**
```bash
npm install -D @playwright/test
npx playwright install
```

**Test Scenarios:**

```typescript
// e2e/inGameStats.spec.ts
import { test, expect } from '@playwright/test';

test('complete match recording workflow', async ({ page }) => {
  await page.goto('/in-game-stats');

  // Create new match
  await page.click('text=New Match');
  await page.fill('input[name="homeTeam"]', 'Eagles');
  await page.fill('input[name="opponentTeam"]', 'Hawks');
  await page.click('text=Start Match');

  // Record 5 points
  for (let i = 0; i < 5; i++) {
    await page.click('text=Point WIN');
    await page.click('text=Att.');
    await page.selectOption('select[name="subcategory"]', 'Hard Spike');
    await page.selectOption('select[name="locationTempo"]', 'OH (Line)');
    await page.selectOption('select[name="player"]', 'Player 1');
    await page.click('text=Add Point');
  }

  // Verify point list
  const pointRows = await page.locator('.point-row').count();
  expect(pointRows).toBe(5);

  // Switch to stats view
  await page.click('text=Show info.');

  // Verify charts rendered
  const charts = await page.locator('canvas').count();
  expect(charts).toBeGreaterThanOrEqual(8);

  // Verify summary stats
  const homeAttacks = await page.locator('text=Attacks').locator('xpath=..').locator('.stat-value').first().textContent();
  expect(homeAttacks).toBe('5');
});

test('offline point entry with sync', async ({ page, context }) => {
  await page.goto('/in-game-stats');

  // Go offline
  await context.setOffline(true);

  // Add point
  await page.click('text=Point WIN');
  // ... complete form
  await page.click('text=Add Point');

  // Verify optimistic UI update
  expect(await page.locator('.point-row').count()).toBe(1);

  // Go back online
  await context.setOffline(false);

  // Wait for sync
  await page.waitForSelector('text=Synced');

  // Refresh page and verify data persists
  await page.reload();
  expect(await page.locator('.point-row').count()).toBe(1);
});
```

### Performance Tests

**Metrics to Track:**

```typescript
// performance.test.ts
import { performance } from 'perf_hooks';

test('statistics calculation performance', () => {
  const largeDataset = generateMockPoints(200); // 200 points

  const start = performance.now();
  const stats = calculateAllStatistics(largeDataset);
  const duration = performance.now() - start;

  expect(duration).toBeLessThan(100); // < 100ms
});

test('chart rendering performance', async () => {
  const { container } = render(<StatisticsDashboard points={mockPoints} />);

  const start = performance.now();
  await waitFor(() => {
    expect(container.querySelectorAll('canvas').length).toBe(8);
  });
  const duration = performance.now() - start;

  expect(duration).toBeLessThan(500); // < 500ms
});
```

### Test Coverage Goals

| Category | Target Coverage |
|----------|----------------|
| Calculation Functions | 100% |
| Form Validation | 100% |
| API Layer | 90% |
| React Components | 80% |
| Hooks | 90% |
| Overall | 85% |

### CI/CD Integration

**GitHub Actions Workflow:**

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit

      - name: Run integration tests
        run: npm run test:integration

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

      - name: Run E2E tests
        run: npx playwright test

      - name: Upload E2E artifacts
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-screenshots
          path: test-results/
```

---

## File Structure

### Complete Directory Tree

```
volleyball-coach-app/
├── src/
│   ├── features/
│   │   └── inGameStats/
│   │       ├── components/
│   │       │   ├── PointEntryForm.tsx
│   │       │   ├── PointEntryForm.css
│   │       │   ├── WinLossToggle.tsx
│   │       │   ├── SegmentedControl.tsx
│   │       │   ├── ConditionalDropdown.tsx
│   │       │   ├── PlayerSelector.tsx
│   │       │   ├── PointByPointList.tsx
│   │       │   ├── PointRow.tsx
│   │       │   ├── SummaryStats.tsx
│   │       │   ├── SummaryStats.css
│   │       │   ├── StatisticsDashboard.tsx
│   │       │   ├── StatisticsDashboard.css
│   │       │   ├── charts/
│   │       │   │   ├── HitVsAceChart.tsx
│   │       │   │   ├── AttackKDChart.tsx
│   │       │   │   ├── KillZonesChart.tsx
│   │       │   │   ├── AttackPositionsChart.tsx
│   │       │   │   └── ChartContainer.tsx
│   │       │   ├── GameHeader.tsx
│   │       │   ├── SetTabs.tsx
│   │       │   └── ViewToggle.tsx
│   │       ├── hooks/
│   │       │   ├── useInGameStats.ts
│   │       │   ├── useRealtimePoints.ts
│   │       │   ├── useStatistics.ts
│   │       │   └── usePointEntry.ts
│   │       ├── context/
│   │       │   ├── InGameStatsContext.tsx
│   │       │   └── InGameStatsProvider.tsx
│   │       ├── api/
│   │       │   ├── pointsAPI.ts
│   │       │   ├── matchesAPI.ts
│   │       │   ├── setsAPI.ts
│   │       │   ├── teamsAPI.ts
│   │       │   └── playersAPI.ts
│   │       ├── utils/
│   │       │   ├── formHelpers.ts
│   │       │   ├── formValidation.ts
│   │       │   ├── statsCalculations.ts
│   │       │   ├── chartHelpers.ts
│   │       │   ├── formatters.ts
│   │       │   └── actionTypesHelpers.ts
│   │       └── types/
│   │           └── index.ts (exports all types)
│   ├── types/
│   │   └── inGameStats.types.ts
│   ├── constants/
│   │   └── actionTypes.ts
│   ├── lib/
│   │   ├── supabaseClient.ts
│   │   └── offlineStorage.ts
│   ├── pages/
│   │   └── StatsPage.tsx (updated)
│   └── test/
│       ├── setup.ts
│       ├── mocks/
│       │   ├── mockPoints.ts
│       │   ├── mockTeams.ts
│       │   └── mockPlayers.ts
│       └── utils/
│           └── testHelpers.ts
├── supabase/
│   ├── schema.sql
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── seed.sql (test data)
├── e2e/
│   ├── inGameStats.spec.ts
│   └── helpers/
│       └── testData.ts
├── public/
│   └── sw.js (updated for offline support)
├── .env.local (gitignored)
├── .env.example
├── tsconfig.json
├── vite.config.ts (updated for tests)
└── playwright.config.ts
```

### New Files Count by Category

| Category | Files | Lines (Est.) |
|----------|-------|--------------|
| Components | 17 | 2,500 |
| Hooks | 4 | 400 |
| API Layer | 5 | 600 |
| Utils | 6 | 800 |
| Types | 2 | 300 |
| Context | 2 | 200 |
| Tests | 10 | 1,000 |
| Config | 5 | 150 |
| Database | 3 | 500 |
| **TOTAL** | **54** | **~6,450** |

---

## Dependencies & Libraries

### Required npm Packages

**Core:**
```bash
npm install @supabase/supabase-js        # Database client
npm install chart.js react-chartjs-2     # Charts
npm install zod                          # Validation
npm install idb                          # IndexedDB wrapper
npm install react-window                 # Virtual scrolling
```

**Development:**
```bash
npm install -D typescript                # TypeScript
npm install -D @types/react              # React types
npm install -D @types/react-dom          # React DOM types
npm install -D vitest                    # Testing framework
npm install -D @testing-library/react    # React testing
npm install -D @testing-library/jest-dom # Jest matchers
npm install -D @testing-library/user-event # User interactions
npm install -D jsdom                     # DOM environment
npm install -D @playwright/test          # E2E testing
```

**Optional (Nice to Have):**
```bash
npm install date-fns                     # Date formatting
npm install clsx                         # Conditional classes
npm install @radix-ui/react-select       # Better select component
```

### Package.json Updates

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:unit": "vitest run",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:e2e": "playwright test",
    "test:coverage": "vitest run --coverage",
    "type-check": "tsc --noEmit"
  }
}
```

### Total Bundle Size Impact

| Library | Size (Gzipped) |
|---------|---------------|
| @supabase/supabase-js | ~30 KB |
| chart.js | ~60 KB |
| react-chartjs-2 | ~5 KB |
| zod | ~12 KB |
| idb | ~2 KB |
| react-window | ~7 KB |
| **TOTAL** | **~116 KB** |

**Current App Size:** 245 KB
**New App Size:** ~361 KB (still excellent for PWA)

---

## Migration Strategy

### Phase 1: Data Export from Google Sheets

**Script:** `scripts/exportOldData.js`

```javascript
// Google Apps Script to run in OldTool spreadsheet
function exportToJSON() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName('StatsTableInGameTrends');

  const cellData = sheet.getRange('A1').getValue();
  const data = JSON.parse(cellData);

  // Save to Google Drive
  const blob = Utilities.newBlob(
    JSON.stringify(data, null, 2),
    'application/json',
    `volleyball_export_${new Date().toISOString()}.json`
  );

  DriveApp.createFile(blob);
  Logger.log('Export complete!');
}
```

### Phase 2: Data Transformation

**Script:** `scripts/transformData.ts`

```typescript
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

interface OldPointData {
  point_number: number;
  winning_team: string;
  action_type: string;
  action: string;
  locationTempo: string;
  home_player: string;
  opponent_player: string;
  home_score: number;
  opponent_score: number;
}

interface OldSetData {
  set_number: number;
  points: OldPointData[];
}

async function transformData(oldData: OldSetData[]) {
  const matchId = uuidv4();
  const sqlStatements: string[] = [];

  // Create match
  sqlStatements.push(`
    INSERT INTO matches (id, match_date, home_team_id, opponent_team_id)
    VALUES (
      '${matchId}',
      NOW(),
      (SELECT id FROM teams WHERE name = 'Home Team' LIMIT 1),
      (SELECT id FROM teams WHERE name = 'Opponent Team' LIMIT 1)
    );
  `);

  // Process each set
  for (const set of oldData) {
    const setId = uuidv4();
    const maxHomeScore = Math.max(...set.points.map(p => p.home_score));
    const maxOpponentScore = Math.max(...set.points.map(p => p.opponent_score));

    sqlStatements.push(`
      INSERT INTO sets (id, match_id, set_number, home_score, opponent_score)
      VALUES ('${setId}', '${matchId}', ${set.set_number}, ${maxHomeScore}, ${maxOpponentScore});
    `);

    // Process each point
    for (const point of set.points) {
      const pointId = uuidv4();

      sqlStatements.push(`
        INSERT INTO points (id, set_id, point_number, winning_team, home_score, opponent_score)
        VALUES (
          '${pointId}',
          '${setId}',
          ${point.point_number},
          '${point.winning_team}',
          ${point.home_score},
          ${point.opponent_score}
        );
      `);

      sqlStatements.push(`
        INSERT INTO point_details (point_id, action_type, action_category, location_tempo)
        VALUES (
          '${pointId}',
          '${point.action_type}',
          '${point.action}',
          ${point.locationTempo ? `'${point.locationTempo}'` : 'NULL'}
        );
      `);
    }
  }

  // Write to file
  fs.writeFileSync('migration.sql', sqlStatements.join('\n'));
  console.log('Migration SQL generated!');
}

// Run
const oldData = JSON.parse(fs.readFileSync('volleyball_export.json', 'utf-8'));
transformData(oldData);
```

### Phase 3: Import to Supabase

**Steps:**
1. Run `node scripts/transformData.ts`
2. Open Supabase SQL Editor
3. Copy contents of `migration.sql`
4. Execute SQL
5. Verify data with: `SELECT COUNT(*) FROM points;`

### Phase 4: Validation

**Script:** `scripts/validateMigration.ts`

```typescript
import { supabase } from '../src/lib/supabaseClient';
import fs from 'fs';

async function validateMigration() {
  // Load original data
  const oldData = JSON.parse(fs.readFileSync('volleyball_export.json', 'utf-8'));
  const oldPointCount = oldData.reduce((sum, set) => sum + set.points.length, 0);

  // Count new data
  const { count: newPointCount } = await supabase
    .from('points')
    .select('*', { count: 'exact', head: true });

  console.log(`Old points: ${oldPointCount}`);
  console.log(`New points: ${newPointCount}`);

  if (oldPointCount === newPointCount) {
    console.log('✅ Migration successful!');
  } else {
    console.log('❌ Point count mismatch!');
  }

  // Validate sample point
  const oldFirstPoint = oldData[0].points[0];
  const { data: newFirstPoint } = await supabase
    .from('v_points_full')
    .select('*')
    .eq('set_number', 1)
    .eq('point_number', 1)
    .single();

  console.log('Old first point:', oldFirstPoint);
  console.log('New first point:', newFirstPoint);
}

validateMigration();
```

---

## Implementation Timeline

### Week-by-Week Breakdown

**Week 1: Foundation**
- [ ] TypeScript setup
- [ ] Type definitions
- [ ] ACTION_TYPES constant
- [ ] Directory structure
- [ ] Context boilerplate

**Week 2-3: Point Entry**
- [ ] PointEntryForm component
- [ ] All sub-components
- [ ] Form validation
- [ ] Styling
- [ ] Unit tests

**Week 4: Point List View**
- [ ] PointByPointList component
- [ ] PointRow component
- [ ] Virtual scrolling
- [ ] Color coding
- [ ] Formatting logic

**Week 5: Statistics**
- [ ] SummaryStats component
- [ ] All calculation functions
- [ ] Unit tests for calculations
- [ ] Performance optimization

**Week 6: Charts**
- [ ] Chart.js setup
- [ ] All 4 chart components
- [ ] Chart styling
- [ ] Responsive design

**Week 7: Supabase**
- [ ] Database schema
- [ ] Supabase client
- [ ] API layer
- [ ] Real-time subscriptions

**Week 8: Offline Support**
- [ ] IndexedDB setup
- [ ] Background sync
- [ ] Service worker updates
- [ ] Conflict resolution

**Week 9: Testing**
- [ ] Unit tests (100 tests)
- [ ] Integration tests
- [ ] E2E tests
- [ ] Performance tests

**Week 10: Polish**
- [ ] Accessibility audit
- [ ] Performance optimization
- [ ] Documentation
- [ ] Code review

---

## Risk Assessment

### High-Risk Items

**1. Offline Sync Complexity**
- **Risk:** Conflict resolution failures
- **Mitigation:** Volleyball data is append-only; conflicts rare
- **Fallback:** Display warning, manual resolution

**2. Chart Performance**
- **Risk:** Slow rendering with 200+ points
- **Mitigation:** Memoization, lazy loading, pagination
- **Fallback:** Show "Calculating..." loader

**3. TypeScript Learning Curve**
- **Risk:** Team unfamiliar with TS
- **Mitigation:** Incremental adoption, pair programming
- **Fallback:** Stick to JavaScript, add JSDoc types

### Medium-Risk Items

**4. Supabase Free Tier Limits**
- **Risk:** Exceed 500MB database
- **Mitigation:** Monitor usage, implement data archiving
- **Fallback:** Upgrade to $25/month Pro plan

**5. Real-time Subscription Reliability**
- **Risk:** WebSocket disconnections
- **Mitigation:** Auto-reconnect, fallback to polling
- **Fallback:** Manual refresh button

---

## Success Metrics

### Functional Metrics
- [x] 100% feature parity with OldTool
- [x] Support 5-set matches (150+ points)
- [x] All 8 charts render correctly
- [x] Offline mode works reliably

### Performance Metrics
- [x] Point entry response time: <100ms
- [x] Statistics calculation: <500ms for 200 points
- [x] Chart rendering: <500ms total
- [x] App bundle size: <400KB

### Quality Metrics
- [x] Test coverage: >85%
- [x] WCAG AA accessibility compliance
- [x] Zero console errors/warnings
- [x] Lighthouse PWA score: >90

### User Metrics (Post-Launch)
- [ ] 90% user satisfaction
- [ ] <5% error rate
- [ ] Average session: 30+ minutes (full match)
- [ ] Offline usage: >20% of sessions

---

## Next Steps

### Immediate Actions (Before Starting)
1. Review and approve this plan
2. Create Supabase account
3. Set up GitHub project board
4. Schedule weekly progress reviews
5. Assign frontend-developer agent to Phase 1

### Phase 1 Kickoff (Day 1)
1. Create feature branch: `feature/in-game-stats`
2. Install TypeScript dependencies
3. Configure tsconfig.json
4. Create type definition files
5. Run first build to verify setup

### Communication Plan
- Daily standup (async via comments)
- Weekly demo of progress
- Bi-weekly code reviews
- Final demo before each phase completion

---

## Appendix

### A. Keyboard Shortcuts (Future Enhancement)

```typescript
// Recommended shortcuts for power users
const KEYBOARD_SHORTCUTS = {
  'W': 'Select Point WIN',
  'L': 'Select Point LOSS',
  '1-9': 'Select category (numbered)',
  'Enter': 'Submit point',
  'Esc': 'Reset form',
  'Ctrl+Z': 'Undo last point',
  'Tab': 'Next field',
  'Shift+Tab': 'Previous field'
};
```

### B. Accessibility Checklist

- [ ] All interactive elements focusable
- [ ] Tab order logical
- [ ] ARIA labels on all inputs
- [ ] Color contrast meets WCAG AA
- [ ] Screen reader tested (VoiceOver/NVDA)
- [ ] Keyboard navigation works
- [ ] Touch targets ≥44x44px
- [ ] Error messages announced

### C. Browser Compatibility

| Browser | Version | Support |
|---------|---------|---------|
| Safari (iOS) | 14+ | Full |
| Chrome (Android) | 90+ | Full |
| Safari (macOS) | 14+ | Full |
| Chrome (Desktop) | 90+ | Full |
| Firefox | 88+ | Full |
| Edge | 90+ | Full |

### D. API Rate Limits (Supabase)

- **Free Tier:** 500 requests/second
- **Pro Tier:** 1000 requests/second
- **Typical Usage:** ~5 requests/minute (well within limits)

### E. Estimated Costs

| Service | Free Tier | Paid (if needed) |
|---------|-----------|------------------|
| Supabase | 500MB DB, 1GB bandwidth | $25/month (Pro) |
| GitHub Pages | Unlimited | Free |
| Total | **$0/month** | **$25/month** (if scaling) |

---

## Document Changelog

**v1.0 (2025-10-01)**
- Initial comprehensive implementation plan
- All 4 phases defined
- Technical decisions documented
- Component breakdown complete
- Testing strategy included

---

**Status:** READY FOR IMPLEMENTATION
**Next Review:** After Phase 1 completion
**Approval Required:** Yes
**Estimated Total Effort:** 8-10 weeks (1 developer)

---

**END OF DOCUMENT**
