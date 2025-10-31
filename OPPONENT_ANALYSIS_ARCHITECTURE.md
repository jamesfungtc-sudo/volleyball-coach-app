# Opponent Analysis Feature: Comprehensive Architectural Analysis

**Document Version:** 1.0
**Date:** 2025-10-28
**Status:** Architecture Review & Recommendation

---

## Executive Summary

This document provides a comprehensive architectural analysis for the proposed Opponent Analysis feature in the volleyball coaching app. After evaluating the current codebase, existing patterns, and proposed enhancements, this analysis recommends a **phased evolutionary approach** that starts with a refined 6x6 grid system and progressively adds precision features based on user feedback.

**Key Recommendation:** Start with Phase 1-2 (Enhanced Grid + Dual Storage), then evaluate user needs before investing in complex canvas/gesture features. The current architecture supports offline-first PWA usage, and any solution must maintain this constraint.

**Architectural Impact Assessment:** MEDIUM-HIGH
- New feature domain with distinct data models
- Requires careful state management for live input scenarios
- Performance-critical for hundreds of events per match
- Must maintain offline-first architecture

---

## 1. Current Architecture Context

### 1.1 Technology Stack
- **Frontend:** React 19.1.1, TypeScript 5.9.3, React Router 7.9.3
- **Build System:** Vite 7.1.2
- **State Management:** React Context API (MatchContext pattern)
- **Data Storage:** IndexedDB (implied by offline-first PWA)
- **Backend Integration:** Google Sheets API (Apps Script backend)
- **Charting:** Recharts 3.2.1
- **Offline Support:** Workbox 7.3.0 (Service Workers)
- **Validation:** Zod 4.1.11

### 1.2 Existing Patterns

**Data Flow Architecture:**
```
User Input → Context State → Local IndexedDB → (Batch) → Google Sheets
```

**Court Visualization Components:**
- `VolleyballCourt.jsx`: Simple position-based visualization (6 positions)
- `AdvancedVolleyballCourt.jsx`: Enhanced with team/formation support

**Point Entry Pattern:**
- Multi-step form with reducer pattern
- Conditional field display based on workflow
- Validation with Zod schemas
- Optimistic UI updates with deferred persistence

**Key Architectural Strengths:**
1. Clean separation of concerns (features/ directory structure)
2. Context-based state management for match data
3. Offline-first with sync capability
4. TypeScript types with Zod runtime validation
5. Component reusability pattern established

---

## 2. Feature Prioritization: MVP vs Future Enhancements

### 2.1 MVP Features (Phase 1-2) - RECOMMENDED START

**Priority: HIGH - Must Have**

1. **Starting Line-up Tracking**
   - Record 6 player positions per set
   - Store rotation number
   - Visual court representation
   - Historical view of line-ups across sets

2. **Serving Pattern - Enhanced Grid**
   - 6x6 button grid (36 zones)
   - Workflow: Select player → Select serve type → Select location
   - Store: `{x: number, y: number, serve_type, player, result}`
   - Simple frequency heatmap (cell-based coloring)

3. **Hitting Pattern - Enhanced Grid**
   - Same 6x6 grid for attack locations
   - Workflow: Select player → Select hit type → Select location
   - Store: `{x: number, y: number, hit_type, player, result}`
   - Zone-based statistics

4. **Dual Coding Storage** (Future-proof)
   - Store both grid coordinates AND normalized float coordinates
   - Example: `{gridX: 2, gridY: 3, normalizedX: 0.33, normalizedY: 0.50}`
   - Enables backward compatibility and future precision

**Rationale:**
- Minimal complexity for live-game scenarios
- Proven pattern (matches existing InGame Stats workflow)
- Offline-first compatible
- Fast input speed (critical during live matches)
- Foundation for future enhancements

### 2.2 Phase 3 Features - Nice to Have (Defer)

**Priority: MEDIUM - Evaluate After MVP**

5. **Progressive Precision (Zoom refinement)**
   - Tap zone → Zoom to 3x3 sub-grid → Tap precise location
   - Increases precision without initial complexity
   - Store: `{coarseX: 2, coarseY: 3, fineX: 1, fineY: 2}` → converts to normalized

6. **Confidence Metadata**
   - Capture input timing (immediate vs delayed)
   - Store input method (touch vs pencil if available)
   - Schema: `{confidence: 'high' | 'medium' | 'low', inputDelay: number}`

7. **Semantic Zone Labels**
   - Map coordinates to volleyball semantics
   - Examples: "deep line", "sharp cross", "seam", "off-blocker"
   - Computed field: `semantic_label: computeSemanticZone(x, y, hit_type)`

### 2.3 Phase 4 Features - Advanced (Future)

**Priority: LOW - Significant Complexity**

8. **Vector Gestures (Trajectory)**
   - Drag from origin to landing point
   - Requires canvas or SVG path handling
   - Store: `{originX, originY, landingX, landingY, curveType: 'arc' | 'line'}`
   - Complexity: Touch event handling, gesture recognition

9. **Free-tap Canvas with Snapping**
   - Tap anywhere on court, visually snap to landmarks
   - Store exact float coordinates
   - Requires: Canvas layer, coordinate transformation, landmark detection

10. **KDE/Hexbin Heatmaps**
    - Kernel Density Estimation for smooth heatmaps
    - Hexagonal binning instead of rectangular grid
    - Requires: d3-hexbin library, complex rendering

11. **Trajectory Curves (Tips vs Drives)**
    - Capture ball flight path
    - Distinguish shot types by trajectory
    - Requires: Advanced gesture recognition, physics modeling

12. **Dual Input Mode (Pencil + Finger)**
    - Apple Pencil for annotation, finger for pan/zoom
    - Requires: Apple Pencil API integration, complex input handling

**Rationale for Deferral:**
- High implementation complexity
- Questionable value for live-game scenarios (speed > precision)
- Better suited for video review workflows
- Risk of over-engineering without validated user needs

---

## 3. Data Model Design

### 3.1 Recommended Schema (Phase 1-2)

**Core Principle:** Store raw data with dual coordinates, compute semantics at query time.

```typescript
// Opponent Analysis Types
export interface OpponentLineup {
  id: string;
  match_id: string;
  set_number: number;
  rotation_number: 1 | 2 | 3 | 4 | 5 | 6;
  players: OpponentPlayer[];
  timestamp: string;
  notes?: string;
}

export interface OpponentPlayer {
  position: 1 | 2 | 3 | 4 | 5 | 6;  // Court position
  jersey_number: number;
  name?: string;  // Optional - may not know all names
  role?: 'S' | 'OH' | 'MB' | 'Oppo' | 'L';  // Position role
}

// Location Event Base (shared by serves and hits)
export interface LocationEvent {
  id: string;
  match_id: string;
  set_number: number;
  point_number: number;
  timestamp: string;

  // Dual coordinate storage (future-proof)
  grid_x: number;        // 0-5 (grid column)
  grid_y: number;        // 0-5 (grid row)
  normalized_x: number;  // 0.0-1.0 (precise location)
  normalized_y: number;  // 0.0-1.0 (precise location)

  // Event metadata
  opponent_jersey_number: number;
  result: 'ace' | 'kill' | 'error' | 'in-play';

  // Optional confidence metadata (Phase 3)
  confidence?: 'high' | 'medium' | 'low';
  input_delay_ms?: number;
}

export interface ServeEvent extends LocationEvent {
  event_type: 'serve';
  serve_type: 'float' | 'jump' | 'topspin' | 'hybrid';
  serve_result: 'ace' | 'error' | 'in-play';
  receive_quality?: 0 | 1 | 2 | 3;  // 0=ace, 3=perfect pass
}

export interface HitEvent extends LocationEvent {
  event_type: 'hit';
  hit_type: 'hard-spike' | 'roll-shot' | 'tip' | 'tool' | 'cut';
  tempo?: 'high' | 'medium' | 'quick' | 'back-quick' | 'slide';
  approach_zone?: 'OH' | 'MB' | 'Oppo' | 'BackRow' | 'Pipe';

  // Phase 4: Trajectory data (optional)
  trajectory?: {
    origin_x: number;
    origin_y: number;
    curve_type: 'arc' | 'line';
  };
}

// Aggregate for efficient querying
export interface OpponentAnalysisData {
  id: string;
  match_id: string;
  lineups: OpponentLineup[];
  serves: ServeEvent[];
  hits: HitEvent[];
  metadata: {
    created_at: string;
    updated_at: string;
    opponent_team_name: string;
    notes?: string;
  };
}
```

### 3.2 Data Model Design Rationale

**Dual Coordinate Storage:**
- `grid_x/grid_y`: Integer coordinates (0-5) for 6x6 grid
- `normalized_x/normalized_y`: Float coordinates (0.0-1.0) for future precision
- Conversion: `normalized_x = (grid_x + 0.5) / 6.0`
- Enables backward compatibility with grid system while supporting future precision

**Separation of Concerns:**
- `OpponentLineup`: Who is playing (relatively stable)
- `ServeEvent`/`HitEvent`: What they did (high volume)
- Separate storage enables efficient queries (e.g., "Show all serves by #12")

**Denormalized Jersey Numbers:**
- Store jersey number directly in events (not player ID)
- Rationale: Opponent rosters may be incomplete/unknown
- Trade-off: Slight redundancy for significantly simpler queries

**Optional Fields:**
- Confidence metadata, trajectories: Optional to avoid blocking MVP
- Can be added incrementally without schema migration

### 3.3 Backward Compatibility Strategy

**If Existing 6x6 Data Exists:**

```typescript
// Migration function for legacy data
function migrateLegacyGridData(legacyEvent: LegacyEvent): LocationEvent {
  return {
    ...legacyEvent,
    grid_x: legacyEvent.x,
    grid_y: legacyEvent.y,
    normalized_x: (legacyEvent.x + 0.5) / 6.0,
    normalized_y: (legacyEvent.y + 0.5) / 6.0,
    confidence: 'medium',  // Assume medium confidence for legacy data
  };
}

// Query layer handles both formats transparently
function getLocationEvents(matchId: string): LocationEvent[] {
  const events = db.getEvents(matchId);
  return events.map(e => {
    if (!e.normalized_x) {
      return migrateLegacyGridData(e);
    }
    return e;
  });
}
```

**Migration Strategy:**
1. No immediate migration required (lazy migration)
2. Read old format, convert on-the-fly
3. Write new format going forward
4. Background job can migrate old data if needed

---

## 4. Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Deliverables:**
- [ ] Opponent Analysis data types and Zod schemas
- [ ] IndexedDB schema for opponent data
- [ ] OpponentAnalysisContext (matches MatchContext pattern)
- [ ] Basic navigation: Add "Opponent Analysis" page
- [ ] Starting line-up tracker component
- [ ] Basic 6x6 grid court component (reusable)

**Technical Approach:**
- Extend existing MatchContext pattern
- Create `src/features/opponentAnalysis/` directory
- Reuse existing court visualization patterns
- Simple state management (no complex gestures yet)

**Acceptance Criteria:**
- Can record starting line-up for each set
- Can view historical line-ups
- Data persists to IndexedDB
- Offline-first functionality maintained

### Phase 2: Enhanced Grid Input (Week 3-4)

**Deliverables:**
- [ ] Serve event input workflow
- [ ] Hit event input workflow
- [ ] 6x6 grid with dual coordinate storage
- [ ] Basic heatmap visualization (cell-based)
- [ ] Event list view (similar to PointByPointList)
- [ ] Google Sheets sync for opponent data

**Technical Approach:**
- Similar workflow to PointEntryForm
- Multi-step form: Select player → Select type → Select location
- Store both grid and normalized coordinates
- Simple CSS-based heatmap (background-color intensity)

**Acceptance Criteria:**
- Can record serves and hits during live match
- Sub-5-second entry time per event
- Heatmap shows frequency by zone
- Data syncs to Google Sheets
- Undo last entry functionality

### Phase 3: Progressive Precision (Week 5-6)

**Deliverables:**
- [ ] Zoom-to-refine workflow
- [ ] Confidence metadata capture
- [ ] Semantic zone labeling
- [ ] Enhanced heatmap with smooth gradients
- [ ] Filter by player/type/result

**Technical Approach:**
- Two-step grid: Coarse (6x6) → Fine (3x3 subdivision)
- Optional zoom triggered by "Refine" button
- Semantic labels computed from coordinates + event type
- Recharts for enhanced visualizations

**Acceptance Criteria:**
- Can optionally refine location to 18x18 effective resolution
- Semantic labels appear in event list
- Filter controls work smoothly
- Performance remains acceptable (< 100ms render)

### Phase 4: Advanced Features (Week 7-8+)

**Deliverables:**
- [ ] Trajectory capture (drag gestures)
- [ ] Free-tap canvas with landmark snapping
- [ ] KDE heatmaps
- [ ] Advanced analytics (tendency detection)
- [ ] Export to PDF report

**Technical Approach:**
- SVG-based canvas for trajectories
- d3-contour for KDE heatmaps
- Touch event API for gesture recognition
- jsPDF for report generation

**Acceptance Criteria:**
- Can capture trajectory for hits
- Heatmaps are smooth and visually appealing
- Reports are sharable and printable

---

## 5. Technical Approach

### 5.1 Court Visualization: Canvas vs SVG vs Hybrid

**Recommendation: Hybrid Approach**

**Phase 1-2: HTML/CSS Grid**
```tsx
<div className="volleyball-court-grid">
  {Array.from({ length: 36 }, (_, i) => {
    const x = i % 6;
    const y = Math.floor(i / 6);
    const intensity = getHeatmapIntensity(x, y, events);

    return (
      <button
        key={i}
        className="grid-cell"
        style={{ backgroundColor: getHeatColor(intensity) }}
        onClick={() => handleLocationSelect(x, y)}
      >
        {/* Optional: Count display */}
      </button>
    );
  })}
</div>
```

**Pros:**
- Extremely simple implementation
- Fast rendering (< 10ms for 36 buttons)
- Touch-friendly (large hit targets)
- No library dependencies
- Works perfectly offline

**Cons:**
- Limited visual sophistication
- Hard to add trajectories later
- Fixed grid structure

**Phase 3-4: SVG Overlay**
```tsx
<div className="court-container">
  {/* Base court image or CSS */}
  <div className="court-background" />

  {/* Interactive grid layer */}
  <div className="grid-layer">{/* HTML/CSS grid */}</div>

  {/* SVG overlay for advanced features */}
  <svg className="court-overlay">
    {/* Trajectories, annotations, etc. */}
    {trajectories.map(t => (
      <path d={generatePath(t)} stroke="red" />
    ))}
  </svg>
</div>
```

**Rationale:**
- Start simple (HTML/CSS) for MVP speed
- Add SVG layer only when needed (Phase 4)
- Keeps DOM light for performance
- Progressive enhancement approach

**Canvas Alternative (NOT Recommended for MVP):**
- More complex hit testing
- Harder to integrate with React state
- Accessibility challenges
- Better suited for 60fps animations (not needed here)

### 5.2 State Management Strategy

**Recommendation: Extend Context Pattern**

```tsx
// src/features/opponentAnalysis/context/OpponentAnalysisContext.tsx

interface OpponentAnalysisState {
  currentOpponentLineup: OpponentLineup | null;
  serveEvents: ServeEvent[];
  hitEvents: HitEvent[];
  selectedSet: number;
  filters: {
    player?: number;
    eventType?: 'serve' | 'hit';
    result?: string;
  };
}

type OpponentAnalysisAction =
  | { type: 'SET_LINEUP'; payload: OpponentLineup }
  | { type: 'ADD_SERVE_EVENT'; payload: ServeEvent }
  | { type: 'ADD_HIT_EVENT'; payload: HitEvent }
  | { type: 'UNDO_LAST_EVENT' }
  | { type: 'SET_FILTERS'; payload: Partial<OpponentAnalysisState['filters']> }
  | { type: 'LOAD_MATCH_DATA'; payload: OpponentAnalysisData };

function opponentAnalysisReducer(
  state: OpponentAnalysisState,
  action: OpponentAnalysisAction
): OpponentAnalysisState {
  // Reducer logic (similar to MatchContext)
}

export function OpponentAnalysisProvider({ children, matchId }: Props) {
  const [state, dispatch] = useReducer(opponentAnalysisReducer, initialState);

  // Auto-save to IndexedDB on state changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      saveToIndexedDB(matchId, state);
    }, 1000);
    return () => clearTimeout(timer);
  }, [state, matchId]);

  return (
    <OpponentAnalysisContext.Provider value={{ state, dispatch }}>
      {children}
    </OpponentAnalysisContext.Provider>
  );
}
```

**Rationale:**
- Matches existing MatchContext pattern (consistency)
- Reducer pattern for complex state transitions
- Auto-save with debouncing for performance
- Easy to test and reason about

**Alternative Considered: Zustand/Redux**
- Pro: Better DevTools, time-travel debugging
- Con: Additional dependency, learning curve, overkill for this scope
- Verdict: Not needed given existing Context pattern success

### 5.3 Touch/Gesture Handling

**Phase 1-2: Button onClick (Recommended)**
```tsx
function GridCell({ x, y, onSelect }: GridCellProps) {
  return (
    <button
      className="grid-cell"
      onClick={() => onSelect(x, y)}
      onTouchEnd={(e) => {
        e.preventDefault(); // Prevent double-tap zoom
        onSelect(x, y);
      }}
    >
      {/* Cell content */}
    </button>
  );
}
```

**Phase 4: Advanced Gestures (If Needed)**
```tsx
function CourtCanvas({ onDrag }: CourtCanvasProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const point = getCourtCoordinates(touch.clientX, touch.clientY);
    setDragStart(point);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !dragStart) return;
    const touch = e.touches[0];
    const point = getCourtCoordinates(touch.clientX, touch.clientY);
    // Draw temporary trajectory preview
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging || !dragStart) return;
    const touch = e.changedTouches[0];
    const point = getCourtCoordinates(touch.clientX, touch.clientY);
    onDrag(dragStart, point);
    setIsDragging(false);
    setDragStart(null);
  };

  return (
    <svg
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Court rendering */}
    </svg>
  );
}
```

**Rationale:**
- Start with simple onClick for speed
- Add gesture handling only when trajectory capture is needed
- Prevent iOS double-tap zoom with preventDefault
- Use React synthetic events (cross-browser)

### 5.4 Heatmap Generation Strategy

**Phase 1-2: Client-Side Cell Coloring**

```tsx
function getHeatmapIntensity(x: number, y: number, events: LocationEvent[]): number {
  const cellEvents = events.filter(e => e.grid_x === x && e.grid_y === y);
  return cellEvents.length;
}

function getHeatColor(intensity: number, maxIntensity: number): string {
  const ratio = Math.min(intensity / maxIntensity, 1);
  // Color scale: white → yellow → orange → red
  const hue = 60 - (ratio * 60); // 60 (yellow) to 0 (red)
  const saturation = 100;
  const lightness = 100 - (ratio * 50); // 100 (white) to 50 (dark)
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function HeatmapGrid({ events }: HeatmapGridProps) {
  const maxIntensity = Math.max(...getCellCounts(events));

  return (
    <div className="heatmap-grid">
      {Array.from({ length: 36 }, (_, i) => {
        const x = i % 6;
        const y = Math.floor(i / 6);
        const intensity = getHeatmapIntensity(x, y, events);

        return (
          <div
            key={i}
            className="heatmap-cell"
            style={{ backgroundColor: getHeatColor(intensity, maxIntensity) }}
          >
            {intensity > 0 && <span className="cell-count">{intensity}</span>}
          </div>
        );
      })}
    </div>
  );
}
```

**Performance:**
- 36 cells × O(n) filter = O(36n) per render
- With 100 events: ~3,600 operations (< 1ms on modern devices)
- Acceptable for Phase 1-2

**Phase 3-4: KDE Heatmap (Recharts/D3)**

```tsx
import { ContourPlot } from 'recharts'; // Or custom D3

function KDEHeatmap({ events }: KDEHeatmapProps) {
  const density = useMemo(() => {
    return computeKDE(
      events.map(e => [e.normalized_x, e.normalized_y]),
      { bandwidth: 0.1, gridSize: 50 }
    );
  }, [events]);

  return (
    <ResponsiveContainer>
      <ContourPlot data={density} />
    </ResponsiveContainer>
  );
}
```

**Trade-offs:**
- **Client-side Pro:** No server required, works offline, instant updates
- **Client-side Con:** CPU-bound for large datasets (> 1000 events)
- **Server-side:** Only beneficial if > 1000 events per visualization
- **Recommendation:** Client-side for Phase 1-3, evaluate server-side for Phase 4

---

## 6. Backward Compatibility

### 6.1 Data Format Evolution

**Current State:** No existing opponent analysis data (new feature)

**Future Migration Path:**

```typescript
// Version 1: Grid coordinates only
interface LocationEventV1 {
  x: number;  // 0-5
  y: number;  // 0-5
}

// Version 2: Dual coordinates (Phase 2)
interface LocationEventV2 {
  grid_x: number;
  grid_y: number;
  normalized_x: number;
  normalized_y: number;
}

// Version 3: With trajectory (Phase 4)
interface LocationEventV3 extends LocationEventV2 {
  trajectory?: TrajectoryData;
}

// Versioned schema
interface LocationEvent {
  schema_version: 1 | 2 | 3;
  // ... fields based on version
}

// Adapter pattern for reading
function readLocationEvent(raw: any): LocationEventV3 {
  switch (raw.schema_version) {
    case 1:
      return {
        ...raw,
        grid_x: raw.x,
        grid_y: raw.y,
        normalized_x: (raw.x + 0.5) / 6.0,
        normalized_y: (raw.y + 0.5) / 6.0,
        schema_version: 3
      };
    case 2:
      return { ...raw, schema_version: 3 };
    case 3:
      return raw;
    default:
      throw new Error('Unknown schema version');
  }
}
```

### 6.2 Grid System Compatibility

**Supporting Multiple Grid Resolutions:**

```typescript
type GridResolution = '6x6' | '12x12' | '18x18';

interface GridConfig {
  resolution: GridResolution;
  cellCount: number;  // 36, 144, 324
  normalizedCellSize: number;  // 0.167, 0.083, 0.056
}

function convertToNormalized(
  gridX: number,
  gridY: number,
  resolution: GridResolution
): { x: number; y: number } {
  const cellSize = 1.0 / parseInt(resolution.split('x')[0]);
  return {
    x: (gridX + 0.5) * cellSize,
    y: (gridY + 0.5) * cellSize
  };
}

function convertToGrid(
  normalizedX: number,
  normalizedY: number,
  resolution: GridResolution
): { x: number; y: number } {
  const gridSize = parseInt(resolution.split('x')[0]);
  return {
    x: Math.floor(normalizedX * gridSize),
    y: Math.floor(normalizedY * gridSize)
  };
}
```

**Rationale:**
- Normalized coordinates (0.0-1.0) are resolution-independent
- Can render at any grid resolution for display
- Future-proof for arbitrary precision (free-tap canvas)

---

## 7. UX Flow Design

### 7.1 Live Game Scenario (Speed-First)

**Goal: < 5 seconds per event entry**

**Workflow: Serve Entry**
```
1. Tap "Serve Event" button (pre-selected if previous was serve)
   ↓
2. Quick player selector (jersey numbers in 3x2 grid)
   [12] [20] [8]
   [7]  [16] [11]
   ↓
3. Serve type (4 buttons)
   [Float] [Jump] [Topspin] [Hybrid]
   ↓
4. Tap location on 6x6 grid (court visual)
   [Court grid with 36 zones]
   ↓
5. Quick result (3 buttons)
   [Ace] [In-play] [Error]
   ↓ (Auto-submit)
6. Event recorded, form resets
```

**Optimization for Speed:**
- Pre-select previous player (if same rally)
- Large touch targets (minimum 44x44pt per Apple HIG)
- No confirmation dialogs (use undo instead)
- Keyboard shortcuts for common actions (optional)

**Workflow: Hit Entry**
```
1. Tap "Hit Event" button
   ↓
2. Player selector (jersey numbers)
   ↓
3. Hit type (5 buttons)
   [Hard Spike] [Roll] [Tip] [Tool] [Cut]
   ↓
4. Location on grid
   ↓
5. Result buttons
   [Kill] [In-play] [Error]
   ↓
6. Auto-submit
```

**Progressive Enhancement: "Refine" Button**
```
After step 4 (location selection):
[Use this location] [Refine →]

If "Refine" tapped:
→ Zoom to 3x3 sub-grid of selected cell
→ Tap precise location
→ Continue to step 5
```

### 7.2 Video Review Scenario (Precision-First)

**Goal: Maximum detail, speed less critical**

**Enhanced Workflow:**
```
1. Pause video at event moment
   ↓
2. Select event type + player (same as live)
   ↓
3. Tap approximate location on grid
   ↓
4. Auto-zoom to 3x3 sub-grid
   ↓
5. Tap precise location
   ↓
6. (Optional) Add trajectory by dragging
   ↓
7. Add result + notes
   ↓
8. Submit with confidence: HIGH
```

**Mode Toggle:**
```tsx
<SegmentedControl
  options={[
    { key: 'live', label: 'Live Game' },
    { key: 'review', label: 'Video Review' }
  ]}
  value={inputMode}
  onChange={setInputMode}
/>
```

**Behavior Changes by Mode:**
- **Live:** Auto-advance after location, no zoom
- **Review:** Auto-zoom, optional trajectory, notes field

### 7.3 Information Architecture

**Navigation:**
```
Opponent Analysis Page
├── Line-up Tracker Tab
│   ├── Current Set Line-up
│   ├── Historical Line-ups
│   └── Rotation Tracker
│
├── Serving Patterns Tab
│   ├── Input Mode Toggle (Live / Review)
│   ├── Serve Entry Form
│   ├── Event List
│   └── Heatmap Visualization
│
└── Hitting Patterns Tab
    ├── Input Mode Toggle
    ├── Hit Entry Form
    ├── Event List
    ├── Heatmap Visualization
    └── Filter Controls (Player, Type, Result)
```

---

## 8. Performance Considerations

### 8.1 Target Performance Metrics

**Critical Path (Live Game):**
- Event entry: < 5 seconds from tap to submit
- UI response: < 100ms from touch to visual feedback
- Heatmap render: < 200ms for 100 events
- Form reset: < 50ms

**Non-Critical (Review Mode):**
- Complex visualizations: < 1 second
- Data sync to Google Sheets: < 3 seconds (background)
- Historical data load: < 2 seconds

### 8.2 Optimization Strategies

**1. Debounced Auto-Save**
```tsx
const debouncedSave = useMemo(
  () => debounce((data) => saveToIndexedDB(data), 1000),
  []
);

useEffect(() => {
  debouncedSave(state);
}, [state]);
```

**2. Virtualized Event Lists**
```tsx
import { FixedSizeList } from 'react-window';

function EventList({ events }: EventListProps) {
  return (
    <FixedSizeList
      height={600}
      itemCount={events.length}
      itemSize={60}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <EventRow event={events[index]} />
        </div>
      )}
    </FixedSizeList>
  );
}
```

**3. Memoized Heatmap Calculations**
```tsx
const heatmapData = useMemo(() => {
  return computeHeatmap(events, filters);
}, [events, filters]);
```

**4. Lazy Component Loading**
```tsx
const KDEHeatmap = lazy(() => import('./KDEHeatmap'));

function VisualizationTab() {
  return (
    <Suspense fallback={<Spinner />}>
      <KDEHeatmap events={events} />
    </Suspense>
  );
}
```

### 8.3 Scalability Analysis

**Expected Data Volume:**
- Serve events per set: ~25 (one per point × 25 points average)
- Hit events per set: ~50 (2-3 hits per rally)
- Total events per match: ~375 (5 sets)
- Peak: ~600 events (long 5-set match)

**Storage Requirements:**
```typescript
// Size per event (estimated)
interface ServeEvent {
  // 8 UUIDs × 16 bytes = 128 bytes
  // 10 numeric fields × 8 bytes = 80 bytes
  // 5 string fields × 20 bytes = 100 bytes
  // Total: ~308 bytes
}

// Worst case: 600 events × 308 bytes = ~185 KB per match
// 100 matches × 185 KB = 18.5 MB (well within IndexedDB limits)
```

**Render Performance:**
```typescript
// 6x6 Grid: 36 DOM nodes
// With 600 events: 600 filter operations × 36 cells = 21,600 ops
// Modern device: ~0.5ms per 1000 ops = ~11ms total (acceptable)

// Optimization: Pre-compute cell counts
const cellCounts = useMemo(() => {
  const counts = new Map<string, number>();
  events.forEach(e => {
    const key = `${e.grid_x},${e.grid_y}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return counts;
}, [events]);

// Lookup: O(1) instead of O(n)
const intensity = cellCounts.get(`${x},${y}`) || 0;
```

**Verdict:** Performance is not a concern for expected data volumes. Simple client-side rendering is sufficient.

---

## 9. Migration Strategy

### 9.1 No Existing Data (Greenfield)

**Recommendation:** Start clean with dual-coordinate schema (Phase 2 data model)

**Benefits:**
- No migration complexity
- Optimal schema from day one
- Future-proof architecture

### 9.2 If Prototype Data Exists

**Scenario:** User has existing 6x6 grid data from prototype

**Lazy Migration Approach:**

```typescript
// 1. Detect legacy format
function isLegacyEvent(event: any): boolean {
  return 'x' in event && 'y' in event && !('grid_x' in event);
}

// 2. Migrate on read
function loadEvents(matchId: string): LocationEvent[] {
  const raw = db.getEvents(matchId);
  return raw.map(e => {
    if (isLegacyEvent(e)) {
      return {
        ...e,
        grid_x: e.x,
        grid_y: e.y,
        normalized_x: (e.x + 0.5) / 6.0,
        normalized_y: (e.y + 0.5) / 6.0,
        schema_version: 2,
        confidence: 'medium' // Assume medium for legacy
      };
    }
    return e;
  });
}

// 3. Write new format
function saveEvent(event: LocationEvent) {
  db.save({
    ...event,
    schema_version: 2
  });
}

// 4. Optional: Background migration
async function migrateAllLegacyData() {
  const allMatches = await db.getAllMatches();
  for (const match of allMatches) {
    const events = loadEvents(match.id); // Auto-migrates
    await db.saveEvents(match.id, events); // Writes new format
  }
}
```

**User Experience:**
- No disruption to existing data
- Gradual migration (lazy or background)
- Rollback possible (keep legacy format until confirmed)

### 9.3 Google Sheets Integration

**Schema Evolution in Google Sheets:**

```javascript
// Column structure (Google Apps Script)
const COLUMNS = {
  V1: ['id', 'x', 'y', 'event_type', 'player', 'result'],
  V2: ['id', 'grid_x', 'grid_y', 'normalized_x', 'normalized_y',
       'event_type', 'player', 'result', 'schema_version']
};

function saveEvent(event) {
  const sheet = getOpponentAnalysisSheet();

  // Auto-detect and upgrade sheet schema if needed
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (!headers.includes('schema_version')) {
    upgradeSheetSchema(sheet);
  }

  // Append event
  sheet.appendRow([
    event.id,
    event.grid_x,
    event.grid_y,
    event.normalized_x,
    event.normalized_y,
    event.event_type,
    event.player,
    event.result,
    event.schema_version
  ]);
}
```

---

## 10. Risk Assessment & Mitigation

### 10.1 Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Performance degradation with 500+ events** | Medium | Low | Pre-compute cell counts, lazy load visualizations, virtualize lists |
| **Offline sync conflicts** | High | Medium | Timestamp-based conflict resolution, manual merge UI for conflicts |
| **Touch input precision on small screens** | Medium | Medium | Minimum 44pt touch targets, zoom-to-refine workflow |
| **Complex gesture recognition bugs** | Medium | Medium | Defer to Phase 4, use simple onClick for MVP |
| **IndexedDB quota exceeded** | Low | Low | Expected usage ~20MB, quota typically 50MB+, add cleanup for old data |
| **Browser compatibility (older iPads)** | Medium | Low | Progressive enhancement, test on iPad 6th gen (2018) minimum |
| **Data loss during input** | High | Low | Auto-save every 1 second, optimistic UI updates, undo stack |

### 10.2 UX Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Too slow for live game input** | Critical | Medium | Speed-first workflow, large touch targets, skip confirmations |
| **Grid too coarse for useful analysis** | Medium | Medium | Dual-coordinate storage enables future precision, start with 6x6 based on user feedback |
| **Overcomplicated UI** | High | Low | Phase 1-2 focus on simplicity, defer advanced features |
| **Forgetting to save data** | High | Low | Auto-save with debouncing, prominent save indicator |
| **Difficult to correct mistakes** | Medium | Medium | Undo last entry, edit historical entries |

### 10.3 Architectural Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Tight coupling to grid system** | Medium | Low | Dual-coordinate storage, normalized values for future flexibility |
| **Difficult to add new event types** | Low | Low | Generic `LocationEvent` base, extensible type system |
| **Hard to migrate schema** | Medium | Low | Versioned schemas, adapter pattern, lazy migration |
| **Google Sheets API rate limits** | Medium | Low | Batch updates, debounced sync, retry with exponential backoff |
| **Poor code reusability** | Low | Low | Share components with InGame Stats, consistent patterns |

---

## 11. Recommended Architecture

### 11.1 Final Recommendation

**Start with Phase 1-2 (Enhanced Grid + Dual Storage)**

**Rationale:**
1. **Speed is critical** for live-game scenarios - simple grid meets this need
2. **Dual-coordinate storage** future-proofs without added complexity
3. **Proven patterns** from InGame Stats reduce implementation risk
4. **Offline-first** maintained with simple HTML/CSS approach
5. **User validation** needed before investing in advanced features

**Architecture Diagram:**

```
┌─────────────────────────────────────────────────────────────┐
│                     Opponent Analysis Page                   │
├─────────────────────────────────────────────────────────────┤
│  Navigation: [Line-up] [Serving] [Hitting]                  │
└─────────────────────────────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    ┌────▼────┐        ┌────▼────┐        ┌────▼────┐
    │ Line-up │        │ Serving │        │ Hitting │
    │ Tracker │        │ Patterns│        │ Patterns│
    └────┬────┘        └────┬────┘        └────┬────┘
         │                  │                   │
         └──────────────────┼───────────────────┘
                            │
                ┌───────────▼───────────┐
                │ OpponentAnalysisContext│
                │  (State Management)    │
                └───────────┬───────────┘
                            │
                ┌───────────▼───────────┐
                │   IndexedDB Layer     │
                │ (Offline-first cache) │
                └───────────┬───────────┘
                            │
                ┌───────────▼───────────┐
                │ Google Sheets API     │
                │  (Backend storage)    │
                └───────────────────────┘
```

### 11.2 Component Architecture

```
src/features/opponentAnalysis/
├── components/
│   ├── LineupTracker.tsx          (Phase 1)
│   ├── LineupHistory.tsx          (Phase 1)
│   ├── CourtGrid.tsx              (Phase 2, reusable)
│   ├── ServeEntryForm.tsx         (Phase 2)
│   ├── HitEntryForm.tsx           (Phase 2)
│   ├── EventList.tsx              (Phase 2)
│   ├── CellHeatmap.tsx            (Phase 2)
│   ├── ZoomableGrid.tsx           (Phase 3)
│   ├── KDEHeatmap.tsx             (Phase 4)
│   └── TrajectoryCanvas.tsx       (Phase 4)
│
├── context/
│   └── OpponentAnalysisContext.tsx (Phase 1)
│
├── utils/
│   ├── coordinateConversion.ts     (Phase 2)
│   ├── heatmapCalculations.ts      (Phase 2)
│   ├── semanticZones.ts            (Phase 3)
│   └── gestureRecognition.ts       (Phase 4)
│
├── hooks/
│   ├── useLineupTracker.ts         (Phase 1)
│   ├── useServeEvents.ts           (Phase 2)
│   └── useHitEvents.ts             (Phase 2)
│
└── types/
    └── opponentAnalysis.types.ts   (Phase 1)
```

### 11.3 Data Flow

```
User Input (Touch/Click)
    ↓
Event Handler (Component)
    ↓
Validation (Zod schema)
    ↓
Dispatch Action (Context)
    ↓
Reducer (Update state + normalize coordinates)
    ↓
├─→ Optimistic UI Update (React re-render)
│
└─→ Debounced Auto-Save
        ↓
    IndexedDB Write (Immediate)
        ↓
    Background Sync Queue
        ↓
    Google Sheets API (When online)
```

### 11.4 Technology Choices

| Concern | Technology | Rationale |
|---------|-----------|-----------|
| **UI Framework** | React 19 | Already in use, hooks for state management |
| **State Management** | Context + useReducer | Proven pattern in codebase, sufficient for scope |
| **Validation** | Zod 4.1.11 | Already in use, runtime type safety |
| **Offline Storage** | IndexedDB | PWA requirement, supported by all modern browsers |
| **Backend Sync** | Google Sheets API | Already integrated, familiar to coaches |
| **Court Visualization** | HTML/CSS Grid (Phase 1-2) | Simplest, fastest, most reliable for MVP |
| **Court Visualization** | SVG Overlay (Phase 4) | Trajectories, annotations when needed |
| **Heatmaps (Phase 2)** | CSS background-color | O(36) DOM nodes, < 1ms render |
| **Heatmaps (Phase 4)** | Recharts + d3-contour | Smooth KDE, already have Recharts dependency |
| **Gesture Recognition** | Native Touch Events | No library needed for simple drag |
| **Virtualization** | react-window | If event lists exceed 100 items |

---

## 12. Next Steps

### 12.1 Immediate Actions (Week 1)

1. **[ ] Validate assumptions with user**
   - Confirm 6x6 grid meets precision needs
   - Validate workflow speed requirements
   - Clarify priority: live input vs video review

2. **[ ] Create Phase 1 project board**
   - Break down deliverables into tasks
   - Estimate effort (story points or hours)
   - Assign ownership

3. **[ ] Set up feature branch**
   ```bash
   git checkout -b feature/opponent-analysis
   ```

4. **[ ] Create type definitions**
   - `src/types/opponentAnalysis.types.ts`
   - Zod schemas for validation

5. **[ ] Design IndexedDB schema**
   - Define object stores
   - Create indexes for queries
   - Plan migration strategy

### 12.2 Decision Points

**After Phase 1 (Week 2):**
- Review user feedback on line-up tracker
- Decide: Continue to Phase 2 or pivot based on feedback

**After Phase 2 (Week 4):**
- Evaluate: Is 6x6 grid sufficient, or is progressive precision needed?
- Measure: Is input speed acceptable for live games?
- Decide: Invest in Phase 3 or iterate on Phase 2

**After Phase 3 (Week 6):**
- Assess: Do users actually use zoom-to-refine?
- Decide: Is Phase 4 worth the complexity?

### 12.3 Success Metrics

**Phase 1:**
- [ ] Line-up recorded in < 60 seconds per set
- [ ] Zero data loss incidents
- [ ] Works offline-first as expected

**Phase 2:**
- [ ] Serve/hit entry in < 5 seconds per event
- [ ] Heatmap renders in < 200ms for 100 events
- [ ] Coaches report workflow is usable during live games

**Phase 3:**
- [ ] > 30% of entries use zoom-to-refine
- [ ] Semantic zone labels are useful (user survey)

**Phase 4:**
- [ ] Trajectory capture provides actionable insights
- [ ] KDE heatmaps preferred over cell heatmaps

---

## 13. Conclusion

The Opponent Analysis feature represents a significant enhancement to the volleyball coaching app. By following a **phased, evolutionary approach**, we can deliver immediate value with Phase 1-2 while maintaining architectural flexibility for future precision enhancements.

**Key Takeaways:**

1. **Start Simple:** 6x6 grid with dual-coordinate storage provides 90% of value with 10% of complexity
2. **Speed Matters:** Live-game input must be < 5 seconds per event - simple HTML/CSS achieves this
3. **Future-Proof Storage:** Normalized coordinates enable arbitrary precision later without migration
4. **Consistent Patterns:** Reuse MatchContext pattern, PointEntryForm workflow, Google Sheets sync
5. **Offline-First:** Critical for coaching use cases, architecture supports this naturally
6. **Validate Incrementally:** Each phase ends with decision point based on user feedback

**Recommended Path Forward:**
1. Implement Phase 1 (Foundation + Line-up Tracker)
2. User testing and feedback
3. Implement Phase 2 (Enhanced Grid Input)
4. Evaluate: Is precision sufficient?
5. If yes: Iterate on analytics and visualizations
6. If no: Proceed to Phase 3 (Progressive Precision)
7. Phase 4 only if validated user need exists

**Architectural Confidence: HIGH**
- Low technical risk (proven patterns)
- Clear implementation path
- Incremental delivery
- Excellent backward compatibility strategy
- Performance headroom for future growth

---

## Appendix A: API Reference

### A.1 OpponentAnalysisContext API

```typescript
interface OpponentAnalysisContextValue {
  state: OpponentAnalysisState;
  dispatch: React.Dispatch<OpponentAnalysisAction>;

  // Computed values
  currentLineup: OpponentLineup | null;
  serveHeatmap: HeatmapData;
  hitHeatmap: HeatmapData;

  // Helper methods
  addServeEvent: (event: Omit<ServeEvent, 'id' | 'timestamp'>) => void;
  addHitEvent: (event: Omit<HitEvent, 'id' | 'timestamp'>) => void;
  undoLastEvent: () => void;
  setLineup: (lineup: OpponentLineup) => void;
  syncToGoogleSheets: () => Promise<void>;
}
```

### A.2 Coordinate Conversion Utilities

```typescript
// Grid to normalized (0.0-1.0)
function gridToNormalized(
  gridX: number,
  gridY: number,
  gridSize: number = 6
): { x: number; y: number };

// Normalized to grid
function normalizedToGrid(
  normalizedX: number,
  normalizedY: number,
  gridSize: number = 6
): { x: number; y: number };

// Screen coordinates to court coordinates
function screenToCourtCoordinates(
  screenX: number,
  screenY: number,
  courtBounds: DOMRect
): { x: number; y: number };

// Court coordinates to semantic zone
function coordinatesToSemanticZone(
  x: number,
  y: number,
  eventType: 'serve' | 'hit'
): string;
```

---

## Appendix B: Google Sheets Schema

### B.1 OpponentLineups Sheet

| Column | Type | Description |
|--------|------|-------------|
| `id` | String | UUID |
| `match_id` | String | Foreign key to Matches |
| `set_number` | Number | 1-5 |
| `rotation_number` | Number | 1-6 |
| `players_json` | String | JSON array of OpponentPlayer[] |
| `timestamp` | String | ISO 8601 |
| `notes` | String | Optional text |

### B.2 OpponentServes Sheet

| Column | Type | Description |
|--------|------|-------------|
| `id` | String | UUID |
| `match_id` | String | Foreign key |
| `set_number` | Number | 1-5 |
| `point_number` | Number | Point in set |
| `grid_x` | Number | 0-5 |
| `grid_y` | Number | 0-5 |
| `normalized_x` | Number | 0.0-1.0 |
| `normalized_y` | Number | 0.0-1.0 |
| `jersey_number` | Number | Opponent player |
| `serve_type` | String | float, jump, topspin, hybrid |
| `result` | String | ace, in-play, error |
| `receive_quality` | Number | 0-3 (optional) |
| `confidence` | String | high, medium, low (optional) |
| `timestamp` | String | ISO 8601 |

### B.3 OpponentHits Sheet

Similar to OpponentServes, with additional columns:
- `hit_type`: hard-spike, roll-shot, tip, tool, cut
- `tempo`: high, medium, quick, back-quick, slide (optional)
- `approach_zone`: OH, MB, Oppo, BackRow, Pipe (optional)
- `trajectory_json`: JSON string (Phase 4, optional)

---

## Appendix C: Testing Strategy

### C.1 Unit Tests

```typescript
describe('Coordinate Conversion', () => {
  it('converts grid to normalized correctly', () => {
    expect(gridToNormalized(0, 0, 6)).toEqual({ x: 0.083, y: 0.083 });
    expect(gridToNormalized(5, 5, 6)).toEqual({ x: 0.917, y: 0.917 });
  });

  it('round-trips grid → normalized → grid', () => {
    const original = { x: 3, y: 2 };
    const normalized = gridToNormalized(original.x, original.y);
    const roundTrip = normalizedToGrid(normalized.x, normalized.y);
    expect(roundTrip).toEqual(original);
  });
});

describe('OpponentAnalysisContext', () => {
  it('adds serve event with auto-generated ID', () => {
    const { result } = renderHook(() => useOpponentAnalysis());
    act(() => {
      result.current.addServeEvent({
        match_id: 'test',
        set_number: 1,
        grid_x: 2,
        grid_y: 3,
        // ...
      });
    });
    expect(result.current.state.serveEvents).toHaveLength(1);
    expect(result.current.state.serveEvents[0].id).toBeDefined();
  });

  it('calculates normalized coordinates automatically', () => {
    const { result } = renderHook(() => useOpponentAnalysis());
    act(() => {
      result.current.addServeEvent({
        match_id: 'test',
        set_number: 1,
        grid_x: 2,
        grid_y: 3,
        // ...
      });
    });
    const event = result.current.state.serveEvents[0];
    expect(event.normalized_x).toBeCloseTo(0.417, 2);
    expect(event.normalized_y).toBeCloseTo(0.583, 2);
  });
});
```

### C.2 Integration Tests

```typescript
describe('Serve Entry Workflow', () => {
  it('completes full serve entry workflow', async () => {
    const { getByText, getByLabelText, getByRole } = render(
      <OpponentAnalysisProvider>
        <ServeEntryForm />
      </OpponentAnalysisProvider>
    );

    // Select player
    await userEvent.click(getByText('12'));

    // Select serve type
    await userEvent.click(getByText('Jump'));

    // Select location (grid cell)
    await userEvent.click(getByLabelText('Cell 2,3'));

    // Select result
    await userEvent.click(getByText('Ace'));

    // Verify event was added
    expect(getByRole('list')).toContainElement(
      getByText(/Serve by #12.*Ace/)
    );
  });
});
```

### C.3 E2E Tests (Playwright)

```typescript
test('records serve events during live match', async ({ page }) => {
  await page.goto('/matches/test-match/opponent-analysis');

  // Navigate to serving patterns
  await page.click('text=Serving Patterns');

  // Enter 5 serve events rapidly
  for (let i = 0; i < 5; i++) {
    await page.click('[data-testid="player-12"]');
    await page.click('[data-testid="serve-jump"]');
    await page.click(`[data-testid="grid-cell-${i}-2"]`);
    await page.click('[data-testid="result-in-play"]');
  }

  // Verify all events recorded
  const eventList = page.locator('[data-testid="event-list"]');
  expect(await eventList.locator('li').count()).toBe(5);

  // Verify heatmap updated
  const heatmap = page.locator('[data-testid="serve-heatmap"]');
  expect(await heatmap.isVisible()).toBe(true);
});
```

### C.4 Performance Tests

```typescript
describe('Performance', () => {
  it('renders heatmap with 500 events in < 200ms', () => {
    const events = generateMockEvents(500);
    const startTime = performance.now();

    render(<CellHeatmap events={events} />);

    const renderTime = performance.now() - startTime;
    expect(renderTime).toBeLessThan(200);
  });

  it('handles rapid input without lag', async () => {
    const { result } = renderHook(() => useOpponentAnalysis());
    const startTime = performance.now();

    // Simulate 20 rapid event entries
    act(() => {
      for (let i = 0; i < 20; i++) {
        result.current.addServeEvent(generateMockServeEvent());
      }
    });

    const duration = performance.now() - startTime;
    expect(duration).toBeLessThan(100); // 5ms per event
  });
});
```

---

**End of Document**

*This architecture document should guide implementation through all phases. Revisit and update as new information emerges from user testing and technical discoveries.*
