# Visual Opponent Tracking Page - Complete Specification

## Document Version
- **Version**: 1.0
- **Date**: 2025-10-31
- **Status**: Draft for Review
- **Author**: Claude (AI Assistant)
- **Reviewer**: User (Coach/Product Owner)

---

## Table of Contents
1. [Purpose & Goals](#purpose--goals)
2. [Page Overview](#page-overview)
3. [Layout Specification](#layout-specification)
4. [Component Breakdown](#component-breakdown)
5. [User Interaction Flow](#user-interaction-flow)
6. [Drawing System Specification](#drawing-system-specification)
7. [Data Model](#data-model)
8. [Use Cases & Scenarios](#use-cases--scenarios)
9. [Technical Requirements](#technical-requirements)
10. [Differences from Current System](#differences-from-current-system)
11. [Open Questions](#open-questions)

---

## 1. Purpose & Goals

### Primary Purpose
Create a **visual-first opponent tracking system** that records opponent serve and attack trajectories using **trajectory drawing** (click-and-drag arrows) instead of discrete grid selection.

### Key Goals
1. **Intuitive Visual Entry** - Draw ball paths naturally, mimicking actual ball flight
2. **Rich Visual Data** - Capture precise trajectory coordinates for replay and analysis
3. **Tactical Clarity** - Generate visual scouting reports with arrow overlays
4. **Flexible Use** - Support both live match tracking and post-game video review
5. **Complete Integration** - Maintain all existing functionality (player tracking, multiple attempts, point submission)

### Success Criteria
- Coaches prefer drawing over grid-clicking for visual analysis
- Entry time acceptable for live match use (<5 seconds per trajectory)
- Trajectories accurately represent ball flight paths
- Data exports to visual reports (PNG/PDF with arrows)
- Zero data loss compared to current grid system

### Non-Goals (Out of Scope)
- ❌ Video synchronization (future feature)
- ❌ Animated rally playback (future feature)
- ❌ Multi-trajectory heatmaps (future feature)
- ❌ Home team tracking (opponent only)

---

## 2. Page Overview

### Page Identity
- **Route**: `/in-game-stats/:matchId/visual-tracking`
- **Navigation**: Accessible from main StatsPage via toggle button
- **Title**: "Visual Opponent Tracking"
- **Icon**: 🎯 or arrow icon

### Page Purpose Statement
> "Record opponent serve and attack trajectories with visual drawing. Track where opponents serve from, where they hit from, and where the ball lands on your court. Draw arrows to capture exact ball flight paths for detailed tactical analysis."

### Target Users
1. **Primary**: Coaches tracking matches in real-time or reviewing video
2. **Secondary**: Assistant coaches, video analysts, players reviewing own matches

### Device Support
- **Optimized for**: iPad Pro (12.9"), iPad (10.2"), tablets in landscape
- **Supported**: Desktop browsers (Chrome, Safari, Firefox)
- **Limited**: Mobile phones (too small for precise drawing)

---

## 3. Layout Specification

### Overall Layout: 2-Column Grid

```
┌─────────────────────────────────────────────────────────────┐
│ Header: Visual Opponent Tracking        [Settings] [Back]   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ ┌─────────────────────────┬─────────────────────────────┐  │
│ │ LEFT COLUMN (50%)       │ RIGHT COLUMN (50%)          │  │
│ │                         │                             │  │
│ │ ┌─────────────────────┐ │ ┌─────────────────────────┐ │  │
│ │ │ SERVE LOCATION      │ │ │ OPPONENT LINEUP         │ │  │
│ │ │ [▼] [▼] [▼] [▼] [▼] │ │ │ ┌───┬───┬───┐           │ │  │
│ │ └─────────────────────┘ │ │ │P4 │P3 │P2 │ Front     │ │  │
│ │                         │ │ │#12│#7 │#3 │           │ │  │
│ │ ┌─────────────────────┐ │ │ └───┴───┴───┘           │ │  │
│ │ │ HIT POSITION        │ │ │ ┌───┬───┬───┐           │ │  │
│ │ │ [P1] [Pipe]         │ │ │ │P5 │P6 │P1 │ Back      │ │  │
│ │ │ [P2] [P3] [P4]      │ │ │ │#9 │#11│#15│           │ │  │
│ │ └─────────────────────┘ │ │ └───┴───┴───┘           │ │  │
│ │                         │ │ │─────────────────────│   │ │  │
│ │ ┌─────────────────────┐ │ │ │      NET LINE       │   │ │  │
│ │ │                     │ │ │ └─────────────────────┘ │  │
│ │ │   VOLLEYBALL COURT  │ │ │                         │  │
│ │ │   (SVG DRAWING)     │ │ │ ┌─────────────────────┐ │  │
│ │ │                     │ │ │ │ IN-PLAY BUTTON      │ │  │
│ │ │   [Orange court     │ │ │ │                     │ │  │
│ │ │    with lines]      │ │ │ │    → IN PLAY        │ │  │
│ │ │                     │ │ │ │                     │ │  │
│ │ │   Draw arrows here  │ │ │ └─────────────────────┘ │  │
│ │ │                     │ │ │                         │  │
│ │ │   [Court labels:    │ │ │ ┌─────────────────────┐ │  │
│ │ │    Net, Baseline]   │ │ │ │ CURRENT SELECTION   │ │  │
│ │ │                     │ │ │ │ Type: Serve         │ │  │
│ │ │                     │ │ │ │ Zone: Left-Center   │ │  │
│ │ │                     │ │ │ │ Landing: (x, y)     │ │  │
│ │ │                     │ │ │ │ Attempts: 2         │ │  │
│ │ └─────────────────────┘ │ │ └─────────────────────┘ │  │
│ │                         │ │                         │  │
│ │ [↻ Undo Last]          │ │ [🗑️ Clear All]          │  │
│ │                         │ │                         │  │
│ └─────────────────────────┘ └─────────────────────────┘  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Responsive Breakpoints

**Desktop (>1200px):**
- 2-column: 50% / 50%
- Court: 400px wide × 800px tall
- All controls visible

**Tablet Landscape (768px - 1200px):**
- 2-column: 45% / 55%
- Court: 300px wide × 600px tall
- Slightly smaller buttons

**Tablet Portrait (600px - 768px):**
- 1-column: Stacked vertically
- Court first, then controls
- Court: 100% width, aspect ratio preserved

**Mobile (<600px):**
- Warning message: "This page works best on tablets in landscape mode"
- Limited functionality (too small for precise drawing)

---

## 4. Component Breakdown

### 4.1 Page Header

**Location:** Top of page, full width

**Elements:**
```
┌────────────────────────────────────────────────────────┐
│ ← Back to Stats  |  Visual Opponent Tracking  |  ⚙️📥  │
└────────────────────────────────────────────────────────┘
```

**Components:**
1. **Back Button**
   - Icon: ← arrow
   - Text: "Back to Stats"
   - Action: Navigate to `/in-game-stats/:matchId`
   - Confirm if unsaved changes exist

2. **Page Title**
   - Text: "Visual Opponent Tracking"
   - Subtitle: "Eagles vs Hawks • Set 1"
   - Font: 20px bold

3. **Action Buttons**
   - ⚙️ Settings: Toggle options (grid overlay, snap-to-grid, etc.)
   - 📥 Export: Download current point data as JSON/PNG

**Styling:**
- Background: White
- Border-bottom: 2px solid #e0e0e0
- Padding: 16px 24px
- Sticky: Yes (stays visible on scroll)

---

### 4.2 LEFT COLUMN Components

#### 4.2.1 Serve Location Selector

**Purpose:** Select which serve zone the opponent served from (spatial zones behind baseline)

**Layout:**
```
┌────────────────────────────────────┐
│ Serve Location                     │
├────────────────────────────────────┤
│ [Left] [L-Ctr] [Ctr] [R-Ctr] [Rgt]│
│   ▼      ▼      ▼      ▼      ▼   │
└────────────────────────────────────┘
```

**Elements:**
- **Label:** "Serve Location" (14px, bold)
- **5 Dropdowns:**
  - Labels: "Left", "Left-Center", "Center", "Right-Center", "Right"
  - Each dropdown shows opponent players:
    ```
    ┌────────────┐
    │ Ser.       │ ← Default (no selection)
    ├────────────┤
    │ #7 Katie   │
    │ #11 Oriana │
    │ #12 Yan    │
    └────────────┘
    ```
  - Selected state: Bold text, blue border
  - Locked state: 🔒 icon, grayed out (after first serve recorded)

**Behavior:**
- Only ONE dropdown can be selected at a time
- Selecting a dropdown:
  - Highlights that zone
  - Clears any hit position selection (serve OR hit, not both)
  - Enables court drawing mode
- After saving first serve attempt:
  - All dropdowns lock (one serve per point rule)
  - Show lock icon 🔒

**Data Captured:**
- `serve_position`: 0-4 (index of zone)
- `serve_player_id`: Selected player ID
- `serve_player_name`: Player name/number

---

#### 4.2.2 Hit Position Selector

**Purpose:** Select which position the opponent attacked from (P1, Pipe, P2, P3, P4)

**Layout:**
```
┌────────────────────────────────────┐
│ Hit Position                       │
├────────────────────────────────────┤
│        [P1]  [Pipe]                │ ← Back row
│                                    │
│     [P2]  [P3]  [P4]              │ ← Front row
└────────────────────────────────────┘
```

**Elements:**
- **Label:** "Hit Position" (14px, bold)
- **5 Buttons:**
  - Back row: P1, Pipe (smaller buttons, 60px wide)
  - Front row: P2, P3, P4 (larger buttons, 80px wide)
  - Default state: White background, gray border
  - Selected state: Blue background (#2196F3), white text
  - Hover state: Light blue background

**Behavior:**
- Only ONE button can be selected at a time
- Selecting a button:
  - Highlights that position
  - Clears any serve selection (serve OR hit, not both)
  - Enables court drawing mode
  - Auto-suggests player based on lineup rotation (future enhancement)

**Data Captured:**
- `hit_position`: 'P1' | 'Pipe' | 'P2' | 'P3' | 'P4'
- `hit_player_id`: Auto-suggested or manually selected
- `hit_player_name`: Player name/number

**Visual Feedback:**
- When hit position selected → Highlight corresponding position in Lineup Sheet (right column)

---

#### 4.2.3 Volleyball Court (SVG Drawing Canvas)

**Purpose:** Visual representation of volleyball court where users draw ball trajectories

**Dimensions:**
- **SVG ViewBox:** 420 × 800 (maintains 1:2 volleyball court aspect ratio)
- **Rendered Size (Desktop):** 400px wide × 800px tall
- **Rendered Size (Tablet):** 300px wide × 600px tall

**Court Layout:**
```
┌────────────────────────────┐
│ Out of Bounds (Blue)       │ 40px
├────────────────────────────┤
│                            │
│      Orange Court          │
│      (Playing Surface)     │ 720px
│                            │
│   [White center line]      │
│   [Dashed attack lines]    │
│                            │
├────────────────────────────┤
│ Out of Bounds (Blue)       │ 40px
└────────────────────────────┘
   ←─────── 360px ─────→
```

**Court Elements:**

1. **Out-of-Bounds Zones:**
   - Top zone: y=0 to y=40 (40px)
   - Bottom zone: y=760 to y=800 (40px)
   - Left zone: x=0 to x=30 (30px)
   - Right zone: x=390 to x=420 (30px)
   - Color: Light blue (#4a9fb8)

2. **Playing Surface:**
   - Area: x=30-390, y=40-760
   - Color: Orange (#d4956c)
   - Border: White 2px stroke

3. **Court Lines:**
   - **Center Line:** Horizontal line at y=400 (middle)
     - Color: White, 3px stroke
     - Label: "NET" (12px, white text)
   - **Attack Lines:** Horizontal dashed lines at y=160 and y=640
     - Color: White, 2px stroke, dashed (10px dash, 5px gap)

4. **Baseline Labels:**
   - **Net (Top):** "NET (Near)" at y=50
   - **Baseline (Bottom):** "BASELINE (Far)" at y=750
   - Font: 11px, white text, bold

5. **Position Markers (Optional):**
   - Small circles showing P1-P6 rotation positions
   - Toggle on/off in settings
   - Color: Semi-transparent white (#ffffff80)

**Drawing Interaction:**

**Mouse/Touch Events:**
1. **mousedown/touchstart:**
   - Check if serve OR hit position selected
   - If not selected → Show error toast: "Select serve zone or hit position first"
   - If selected → Start drawing
   - Record start coordinates (startX, startY)
   - Show preview arrow (red, thin line)

2. **mousemove/touchmove:**
   - Update end coordinates (endX, endY)
   - Redraw preview arrow in real-time
   - Arrow color: Red (#ff6b6b)
   - Arrow width: 2px
   - Arrowhead: 15px length, 30° angle

3. **mouseup/touchend:**
   - Finalize trajectory
   - Record end coordinates
   - Check if endpoint is in-bounds or out-of-bounds
   - Change arrow color: Blue (#2563eb)
   - Draw endpoint circle:
     - Green (#22c55e) if in-bounds
     - Red (#ef4444) if out-of-bounds
   - Auto-calculate grid cell from endpoint
   - Enable "In-Play" button

**Visual Feedback:**
- **Preview State (dragging):**
  - Arrow: Red, 2px stroke
  - Start point: Small circle (5px radius, red)
  - End point: Follows cursor, no circle yet

- **Finalized State (after release):**
  - Arrow: Blue, 3px stroke
  - Start point: Circle (8px radius, blue border, white fill)
  - End point: Circle (8px radius, colored border based on in/out)
    - Green border + green fill if in-bounds
    - Red border + red fill if out-of-bounds

**Trajectory Data Structure:**
```typescript
interface TrajectoryData {
  startX: number;        // SVG coordinate (30-390)
  startY: number;        // SVG coordinate (40-760)
  endX: number;          // SVG coordinate (0-420)
  endY: number;          // SVG coordinate (0-800)
  startInBounds: boolean; // Always true (must start on court)
  endInBounds: boolean;   // Check if endpoint in playing surface
}
```

**Coordinate System:**
- Origin: Top-left (0, 0)
- X-axis: Left (0) to Right (420)
- Y-axis: Top (0) to Bottom (800)
- Court bounds: x ∈ [30, 390], y ∈ [40, 760]

**SVG Rendering:**
```html
<svg viewBox="0 0 420 800" className="volleyball-court">
  <!-- Out-of-bounds zones -->
  <rect x="0" y="0" width="420" height="40" fill="#4a9fb8" />
  <rect x="0" y="760" width="420" height="40" fill="#4a9fb8" />

  <!-- Playing surface -->
  <rect x="30" y="40" width="360" height="720" fill="#d4956c" stroke="white" stroke-width="2" />

  <!-- Center line (net) -->
  <line x1="30" y1="400" x2="390" y2="400" stroke="white" stroke-width="3" />

  <!-- Attack lines -->
  <line x1="30" y1="160" x2="390" y2="160" stroke="white" stroke-width="2" stroke-dasharray="10 5" />
  <line x1="30" y1="640" x2="390" y2="640" stroke="white" stroke-width="2" stroke-dasharray="10 5" />

  <!-- Trajectories (dynamically added) -->
  {trajectories.map(t => (
    <g key={t.id}>
      <line x1={t.startX} y1={t.startY} x2={t.endX} y2={t.endY}
            stroke="#2563eb" stroke-width="3" />
      <polygon points={calculateArrowhead(t)} fill="#2563eb" />
      <circle cx={t.startX} cy={t.startY} r="8" stroke="#2563eb" fill="white" stroke-width="2" />
      <circle cx={t.endX} cy={t.endY} r="8"
              stroke={t.endInBounds ? "#22c55e" : "#ef4444"}
              fill={t.endInBounds ? "#22c55e" : "#ef4444"} />
    </g>
  ))}
</svg>
```

**Undo Last Trajectory:**
- Button: "↻ Undo Last" (below court)
- Action: Remove last drawn trajectory from array
- Keyboard shortcut: Ctrl+Z (Cmd+Z on Mac)

---

### 4.3 RIGHT COLUMN Components

#### 4.3.1 Opponent Lineup Sheet

**Purpose:** Visual reference of opponent's current rotation/lineup

**Layout:**
```
┌─────────────────────────────────┐
│ Opponent Lineup                 │
├─────────────────────────────────┤
│ Front Row:                      │
│ ┌─────┬─────┬─────┐            │
│ │ P4  │ P3  │ P2  │            │
│ │ #12 │ #7  │ #3  │            │
│ │ OH  │ MB  │ Opp │ ← Roles    │
│ └─────┴─────┴─────┘            │
│                                 │
│ Back Row:                       │
│ ┌─────┬─────┬─────┐            │
│ │ P5  │ P6  │ P1  │            │
│ │ #9  │ #11 │ #15 │            │
│ │ L   │ S   │ OH  │            │
│ └─────┴─────┴─────┘            │
│                                 │
│ ────────────────────            │
│       NET LINE                  │
└─────────────────────────────────┘
```

**Elements:**
- **Title:** "Opponent Lineup" (14px, bold)
- **Front Row Positions:**
  - P4 (left), P3 (middle), P2 (right)
  - Each cell: 80px × 80px
  - Shows: Position label, Jersey #, Role
- **Back Row Positions:**
  - P5 (left), P6 (middle), P1 (right)
  - Each cell: 80px × 80px
  - Shows: Position label, Jersey #, Role
- **Net Line:** Visual separator between front and back

**Cell States:**
1. **Normal:** White background, gray border
2. **Highlighted:** Blue background (#2196F3), white text
   - Highlights when corresponding hit position selected
   - Example: User clicks "P4" button → P4 cell highlights
3. **Empty:** Dashed border, "—" placeholder
   - When no player assigned to position

**Behavior:**
- **Click on cell:** Opens player selector dropdown
  - Lists all opponent players
  - Assigns selected player to that position
  - Updates lineup state
- **Auto-rotation (future):** Suggest lineup based on volleyball rotation rules
- **Manual override:** Coach can always change assignments

**Data Model:**
```typescript
interface OpponentLineup {
  P1: string | null;  // Player ID or null
  P2: string | null;
  P3: string | null;
  P4: string | null;
  P5: string | null;
  P6: string | null;
}
```

---

#### 4.3.2 In-Play Button

**Purpose:** Save current attempt as "in-play" (non-terminal action)

**Layout:**
```
┌─────────────────────────────────┐
│                                 │
│          → IN PLAY              │
│                                 │
└─────────────────────────────────┘
```

**Button Specs:**
- **Size:** Full width (100%), 60px height
- **Colors:**
  - Enabled: Purple gradient (#9C27B0 → #7B1FA2)
  - Disabled: Light gray (#e0e0e0)
  - Hover: Lighter purple (#AB47BC)
- **Text:** "→ IN PLAY" (18px, bold, white)
- **Icon:** → arrow before text

**Enable Conditions:**
All of the following must be true:
1. Serve position OR hit position selected
2. Trajectory drawn (startX, startY, endX, endY recorded)
3. No pending errors

**Disabled Conditions:**
- No serve/hit selection → Show hint: "Select serve zone or hit position"
- No trajectory drawn → Show hint: "Draw trajectory on court"
- Serve locked (already recorded) → Show hint: "Serve already recorded for this point"

**Click Action:**
1. Validate all data present
2. Create `OpponentAttempt` object:
   ```typescript
   {
     attempt_number: currentAttemptNumber,
     type: isServe ? 'serve' : 'attack',
     serve_position: selectedServePosition,
     serve_player_id: selectedServePlayer?.id,
     hit_position: selectedHitPosition,
     hit_player_id: selectedHitPlayer?.id,
     landing_grid_x: autoCalculatedX,
     landing_grid_y: autoCalculatedY,
     trajectory: {
       startX, startY, endX, endY,
       startInBounds, endInBounds
     },
     result: 'in_play',
     timestamp: Date.now()
   }
   ```
3. Add attempt to queue
4. Lock serve dropdowns if this was a serve
5. Reset selections (serve/hit cleared)
6. Clear trajectory from court
7. Increment attempt counter
8. Show success toast: "Attempt #X recorded"

**Keyboard Shortcut:** Space bar

---

#### 4.3.3 Current Selection Display

**Purpose:** Show what's currently selected before saving

**Layout:**
```
┌─────────────────────────────────┐
│ Current Selection               │
├─────────────────────────────────┤
│ Type:     Serve                 │
│ Zone:     Left-Center           │
│ Player:   #11 Oriana            │
│ Landing:  (x: 2, y: 4)          │
│ In/Out:   ✓ In Bounds           │
│ Attempts: 2 recorded            │
└─────────────────────────────────┘
```

**Fields:**
1. **Type:** Serve or Attack (based on selection)
2. **Zone:** Show serve zone label OR hit position
3. **Player:** Show selected player name/number
4. **Landing:** Auto-calculated grid coordinates (0-5, 0-5)
5. **In/Out:** Check mark if in-bounds, X if out
6. **Attempts:** Counter of saved attempts for current point

**Styling:**
- Background: Light gray (#f9f9f9)
- Border: 1px solid #e0e0e0
- Padding: 12px
- Font: 13px

---

#### 4.3.4 Clear All Button

**Purpose:** Reset all selections and trajectories for current attempt

**Layout:**
```
[🗑️ Clear All]
```

**Button Specs:**
- Size: Full width (100%), 40px height
- Color: Light gray background, red text (#ef4444)
- Text: "🗑️ Clear All" (14px)
- Position: Below Current Selection Display

**Click Action:**
1. Show confirmation dialog: "Clear all attempts for this point?"
2. If confirmed:
   - Clear all trajectories from court
   - Reset serve/hit selections
   - Clear attempt queue
   - Unlock serve dropdowns
   - Reset attempt counter to 0

**Warning:** This does NOT delete already-submitted points, only current in-progress point data

---

## 5. User Interaction Flow

### 5.1 Recording a Serve Attempt

**Scenario:** Opponent serves from left-center zone, ball lands in-bounds at zone (2, 4)

**Step-by-Step:**

1. **User Action:** Click "Left-Center" serve dropdown
   - **System Response:**
     - Dropdown opens, shows opponent players
     - Other serve dropdowns remain inactive
     - Hit position buttons grayed out (can't select both)

2. **User Action:** Select "#11 Oriana" from dropdown
   - **System Response:**
     - Dropdown shows "Ser. #11" (abbreviated)
     - "Left-Center" zone visually highlighted
     - Court canvas enabled (cursor changes to crosshair)
     - Status: "Ready to draw trajectory"

3. **User Action:** Click on court near baseline (serve origin), drag to front court, release
   - **System Response (during drag):**
     - Red preview arrow follows cursor
     - Arrow updates in real-time (60fps)
     - Start point shows small red circle
   - **System Response (on release):**
     - Arrow turns blue
     - Start point gets blue circle outline
     - End point gets green circle (in-bounds)
     - Auto-calculates landing grid: x=2, y=4
     - "In-Play" button turns purple (enabled)
     - Current Selection updates:
       ```
       Type:     Serve
       Zone:     Left-Center
       Player:   #11 Oriana
       Landing:  (x: 2, y: 4)
       In/Out:   ✓ In Bounds
       ```

4. **User Action:** Click "→ IN PLAY" button
   - **System Response:**
     - Attempt saved to queue
     - Success toast: "Serve attempt #1 recorded"
     - All serve dropdowns lock (🔒 icons appear)
     - Trajectory clears from court
     - Selection display resets
     - Attempt counter: "1 recorded"
     - Ready for next action (attack only)

**Data Captured:**
```json
{
  "attempt_number": 1,
  "type": "serve",
  "serve_position": 1,
  "serve_player_id": "opp_11",
  "serve_player_name": "#11 Oriana",
  "landing_grid_x": 2,
  "landing_grid_y": 4,
  "trajectory": {
    "startX": 210,
    "startY": 720,
    "endX": 210,
    "endY": 200,
    "startInBounds": true,
    "endInBounds": true
  },
  "result": "in_play",
  "timestamp": 1698765432100
}
```

---

### 5.2 Recording an Attack Attempt

**Scenario:** Opponent attacks from P4, ball lands out-of-bounds

**Step-by-Step:**

1. **User Action:** Click "P4" hit position button
   - **System Response:**
     - P4 button highlights (blue background)
     - P4 cell in lineup sheet highlights
     - Serve dropdowns grayed out (locked already from serve)
     - Court canvas enabled
     - Status: "Ready to draw trajectory"

2. **User Action:** Draw trajectory from left front (P4 area) to out-of-bounds zone
   - **System Response (during drag):**
     - Red preview arrow follows cursor
     - Arrow extends beyond court boundaries
   - **System Response (on release):**
     - Arrow turns blue
     - Start point: blue circle
     - End point: RED circle (out-of-bounds!)
     - Auto-calculates landing grid: x=-1, y=5 (out marker)
     - "In-Play" button turns purple
     - Current Selection updates:
       ```
       Type:     Attack
       Position: P4 (Outside)
       Player:   #12 (auto-suggested from lineup)
       Landing:  Out of Bounds
       In/Out:   ✗ Out of Bounds
       ```

3. **User Action:** Click "→ IN PLAY" button
   - **System Response:**
     - Attempt saved to queue
     - Success toast: "Attack attempt #2 recorded"
     - Trajectory clears from court
     - Selection resets
     - Attempt counter: "2 recorded"
     - Ready for next action

**Data Captured:**
```json
{
  "attempt_number": 2,
  "type": "attack",
  "hit_position": "P4",
  "hit_player_id": "opp_12",
  "hit_player_name": "#12",
  "landing_grid_x": -1,
  "landing_grid_y": -1,
  "trajectory": {
    "startX": 80,
    "startY": 200,
    "endX": 10,
    "endY": 150,
    "startInBounds": true,
    "endInBounds": false
  },
  "result": "in_play",
  "timestamp": 1698765435600
}
```

---

### 5.3 Recording a Kill (Terminal Action)

**Scenario:** Opponent's attack results in a kill (point won by opponent)

**Step-by-Step:**

1. **Follow steps 1-2 from "Recording an Attack Attempt"** (draw trajectory)

2. **DIFFERENT:** Do NOT click "In-Play" button
   - **Why?** A kill is a terminal action (point ends)
   - Must go to main Point Entry Form to finalize point

3. **User Action:** Scroll down to Point Entry Form (below this module)
   - **System Response:**
     - Point Entry Form visible
     - Current attempt data automatically attached to form context

4. **User Action:** Fill out Point Entry Form:
   - Select: "Loss" (opponent won)
   - Category: "Attack"
   - Subcategory: "Kill"
   - Player: #12 (opponent)
   - Click: "Submit Point"

5. **System Response:**
   - Point saved with:
     - Main point data (win/loss, action, player, scores)
     - Attached opponent attempts (all 3 attempts from rally)
   - Last attempt auto-updated: `result: "kill"` (instead of "in_play")
   - Visual tracking module resets completely:
     - Attempt queue cleared
     - Serve dropdowns unlocked
     - Attempt counter: "0"
     - Ready for next point

**Data Flow:**
```
Visual Tracking Module → OpponentTrackingContext
    ↓
Attempt Queue: [serve_attempt, attack_attempt, attack_attempt]
    ↓
Point Entry Form → MatchContext
    ↓
Point Submission → Google Sheets
    ↓
Final Point Data:
{
  point_number: 5,
  winning_team: 'opponent',
  action_type: 'Attack',
  action: 'Kill',
  opponent_player: 'opp_12',
  home_score: 4,
  opponent_score: 5,
  opponent_attempts: [
    { attempt #1: serve },
    { attempt #2: attack in-play },
    { attempt #3: attack KILL }  ← Auto-updated
  ]
}
```

**Key Point:** Visual tracking captures rally progression, Point Entry Form captures final outcome

---

### 5.4 Correcting a Mistake (Undo)

**Scenario:** User accidentally draws wrong trajectory or selects wrong position

**Option A: Undo Last Trajectory (Before Saving)**

1. **User Action:** Realize trajectory is wrong right after drawing
2. **User Action:** Click "↻ Undo Last" button (or press Ctrl+Z)
3. **System Response:**
   - Last trajectory removed from court
   - Selection display clears landing coordinates
   - "In-Play" button disabled again
   - Ready to redraw

**Option B: Clear All Attempts (Nuclear Option)**

1. **User Action:** Click "🗑️ Clear All" button
2. **System Response:**
   - Confirmation dialog: "Clear all attempts for this point?"
3. **User Action:** Click "Yes, clear"
4. **System Response:**
   - ALL trajectories cleared
   - ALL selections reset
   - Attempt queue emptied
   - Serve dropdowns unlocked
   - Start point from scratch

**Option C: Delete Specific Attempt (After Saving)**

1. **Future Enhancement:** Show list of saved attempts
2. **User Action:** Click trash icon next to attempt #2
3. **System Response:**
   - Remove attempt from queue
   - Renumber subsequent attempts (3 → 2, 4 → 3)
   - If deleted serve, unlock serve dropdowns

---

### 5.5 Complete Rally Example (6-hit rally)

**Scenario:** Long rally with 1 serve + 5 attacks

**Rally Breakdown:**
1. Opponent serve (in-play)
2. Home team passes back
3. Opponent attack #1 (in-play)
4. Home team digs
5. Opponent attack #2 (in-play)
6. Home team digs again
7. Opponent attack #3 (KILL - point ends)

**Visual Tracking Captures:**
- Attempt #1: Serve trajectory
- Attempt #2: Attack #1 trajectory
- Attempt #3: Attack #2 trajectory
- Attempt #4: Attack #3 trajectory (terminal)

**User Flow:**

```
[Serve] → Draw → [In-Play] → Attempt #1 saved
    ↓
Serve dropdowns LOCK 🔒
    ↓
[P4 Attack] → Draw → [In-Play] → Attempt #2 saved
    ↓
[P2 Attack] → Draw → [In-Play] → Attempt #3 saved
    ↓
[P4 Attack] → Draw → DO NOT click In-Play
    ↓
Scroll to Point Entry Form
    ↓
Select: Loss / Attack / Kill / #12
    ↓
[Submit Point]
    ↓
All 4 attempts attached to point
Last attempt auto-marked as "kill"
Module resets for next point
```

**Time Estimate:**
- Attempt #1 (serve): ~4 seconds (select + draw + save)
- Attempt #2 (attack): ~3 seconds (select + draw + save)
- Attempt #3 (attack): ~3 seconds (select + draw + save)
- Attempt #4 (attack): ~3 seconds (select + draw, no save)
- Point Entry Form: ~5 seconds (select options + submit)
- **Total: ~18 seconds** for 6-hit rally

**Compare to Grid System:**
- Attempt #1: ~3 seconds (select + click grid + save)
- Attempt #2-4: ~2 seconds each (click button + grid + save)
- Point Entry Form: ~5 seconds
- **Total: ~14 seconds**

**Trade-off:** +4 seconds for visual richness (acceptable)

---

## 6. Drawing System Specification

### 6.1 SVG Coordinate Transformation

**The Critical Function:**
```typescript
function getCoordinates(
  clientX: number,
  clientY: number,
  svg: SVGSVGElement
): { x: number; y: number } {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;

  // Magic: Transforms screen coordinates to SVG coordinates
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };

  const transformed = pt.matrixTransform(ctm.inverse());

  return {
    x: transformed.x,
    y: transformed.y
  };
}
```

**Why This Matters:**
- User clicks at screen pixel (e.g., 850px, 450px)
- SVG viewBox uses different coordinates (e.g., 210, 375)
- This function handles ALL scaling, translation, aspect ratio adjustments
- Works on any screen size (iPad, desktop, mobile)

**Matrix Transformation Breakdown:**
```
Screen Space (pixels)          SVG Space (viewBox units)
┌─────────────────┐            ┌─────────────┐
│ 800 × 1200      │  ───────→  │ 420 × 800   │
│ (physical px)   │  transform │ (SVG units) │
└─────────────────┘            └─────────────┘

Example:
- Click at (400, 600) screen pixels
- SVG is 50% scaled, 10px offset
- Transform: (400 - 10) / 0.5 = 780
- Result: (210, 390) SVG coordinates
```

---

### 6.2 Touch Event Handling

**Challenges:**
1. Touch events don't have `clientX/clientY` directly
2. Must prevent default scrolling behavior
3. Need to handle multi-touch (ignore all but first finger)

**Implementation:**
```typescript
function handleTouchStart(e: React.TouchEvent<SVGSVGElement>) {
  e.preventDefault(); // CRITICAL: Prevent page scroll

  if (e.touches.length !== 1) return; // Only single touch

  const touch = e.touches[0];
  const svg = e.currentTarget;
  const { x, y } = getCoordinates(touch.clientX, touch.clientY, svg);

  // Validate: Must start on court
  if (!isInCourtBounds(x, y)) {
    showError("Please start drawing on the court surface");
    return;
  }

  setIsDragging(true);
  setCurrentTrajectory({
    startX: x,
    startY: y,
    endX: x,
    endY: y,
    startInBounds: true,
    endInBounds: true
  });
}

function handleTouchMove(e: React.TouchEvent<SVGSVGElement>) {
  e.preventDefault();
  if (!isDragging) return;

  const touch = e.touches[0];
  const svg = e.currentTarget;
  const { x, y } = getCoordinates(touch.clientX, touch.clientY, svg);

  setCurrentTrajectory(prev => ({
    ...prev,
    endX: x,
    endY: y,
    endInBounds: isInCourtBounds(x, y)
  }));
}

function handleTouchEnd(e: React.TouchEvent<SVGSVGElement>) {
  e.preventDefault();
  setIsDragging(false);

  // Finalize trajectory
  if (currentTrajectory) {
    finalizeTrajectory(currentTrajectory);
  }
}
```

**CSS Requirements:**
```css
.volleyball-court {
  touch-action: none; /* Disable browser touch handling */
  user-select: none;  /* Prevent text selection */
  -webkit-user-select: none;
  cursor: crosshair;
}
```

---

### 6.3 Arrow Rendering Math

**Arrow Components:**
1. Line shaft (from start to end)
2. Arrowhead triangle (at end point)

**Arrowhead Calculation:**
```typescript
function calculateArrowhead(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  headLength: number = 15,
  headAngle: number = 30 // degrees
): string {
  // Vector from start to end
  const dx = endX - startX;
  const dy = endY - startY;

  // Angle of the line
  const angle = Math.atan2(dy, dx);

  // Convert head angle to radians
  const angleRad = (headAngle * Math.PI) / 180;

  // Calculate two points for arrowhead base
  const leftX = endX - headLength * Math.cos(angle - angleRad);
  const leftY = endY - headLength * Math.sin(angle - angleRad);

  const rightX = endX - headLength * Math.cos(angle + angleRad);
  const rightY = endY - headLength * Math.sin(angle + angleRad);

  // Return polygon points string
  return `${endX},${endY} ${leftX},${leftY} ${rightX},${rightY}`;
}
```

**Visual Example:**
```
        endPoint (tip)
            •
           /|\
          / | \
         /  |  \
        /   |   \
       /    |    \
      /     |     \
     •------+------•
  left   shaft   right
        base
```

**SVG Rendering:**
```tsx
<line
  x1={startX}
  y1={startY}
  x2={endX}
  y2={endY}
  stroke={isDragging ? "#ff6b6b" : "#2563eb"}
  strokeWidth={isDragging ? 2 : 3}
/>
<polygon
  points={calculateArrowhead(startX, startY, endX, endY)}
  fill={isDragging ? "#ff6b6b" : "#2563eb"}
/>
```

---

### 6.4 Bounds Checking

**In-Bounds Logic:**
```typescript
function isInCourtBounds(x: number, y: number): boolean {
  const COURT_LEFT = 30;
  const COURT_RIGHT = 390;
  const COURT_TOP = 40;
  const COURT_BOTTOM = 760;

  return (
    x >= COURT_LEFT &&
    x <= COURT_RIGHT &&
    y >= COURT_TOP &&
    y <= COURT_BOTTOM
  );
}
```

**Visual Feedback:**
```typescript
function getEndpointColor(endInBounds: boolean): string {
  return endInBounds ? "#22c55e" : "#ef4444"; // Green : Red
}
```

**Grid Cell Calculation:**
```typescript
function trajectoryToGridCell(
  endX: number,
  endY: number
): { x: number; y: number } {
  // If out of bounds, return special marker
  if (!isInCourtBounds(endX, endY)) {
    return { x: -1, y: -1 }; // Out marker
  }

  // Map SVG coordinates to 6×6 grid
  const COURT_LEFT = 30;
  const COURT_WIDTH = 360;
  const COURT_TOP = 40;
  const COURT_HEIGHT = 720;

  // Normalize to 0.0 - 1.0
  const normalizedX = (endX - COURT_LEFT) / COURT_WIDTH;
  const normalizedY = (endY - COURT_TOP) / COURT_HEIGHT;

  // Map to 0-5 grid
  const gridX = Math.floor(normalizedX * 6);
  const gridY = Math.floor(normalizedY * 6);

  // Clamp to valid range
  return {
    x: Math.max(0, Math.min(5, gridX)),
    y: Math.max(0, Math.min(5, gridY))
  };
}
```

**Example Mappings:**
```
SVG (endX, endY)  →  Grid (x, y)
───────────────────────────────
(30, 40)          →  (0, 0)  Top-left
(210, 40)         →  (3, 0)  Top-center
(390, 40)         →  (5, 0)  Top-right
(30, 400)         →  (0, 3)  Middle-left
(210, 400)        →  (3, 3)  Center
(390, 760)        →  (5, 5)  Bottom-right
(10, 100)         →  (-1, -1) Out of bounds
```

---

### 6.5 Performance Optimization

**Challenge:** Real-time arrow updates (60fps) while dragging

**Solution 1: RequestAnimationFrame**
```typescript
const rafRef = useRef<number | null>(null);

function handleMouseMove(e: MouseEvent) {
  if (rafRef.current) {
    cancelAnimationFrame(rafRef.current);
  }

  rafRef.current = requestAnimationFrame(() => {
    updateTrajectory(e.clientX, e.clientY);
  });
}
```

**Solution 2: Debounce (Alternative)**
```typescript
import { debounce } from 'lodash';

const debouncedUpdate = debounce(
  (x: number, y: number) => updateTrajectory(x, y),
  16 // ~60fps
);
```

**Solution 3: Minimal Re-renders**
```typescript
// Only re-render when trajectory actually changes
const MemoizedArrow = React.memo(({ trajectory }) => {
  return (
    <g>
      <line x1={trajectory.startX} ... />
      <polygon points={...} />
    </g>
  );
}, (prevProps, nextProps) => {
  // Custom comparison
  return (
    prevProps.trajectory.endX === nextProps.trajectory.endX &&
    prevProps.trajectory.endY === nextProps.trajectory.endY
  );
});
```

---

## 7. Data Model

### 7.1 Enhanced OpponentAttempt Type

**Extended from original to include trajectory:**
```typescript
interface OpponentAttempt {
  // Existing fields (unchanged)
  attempt_number: number;
  type: 'serve' | 'attack';

  // Serve fields
  serve_position?: number;      // 0-4 (zone index)
  serve_player_id?: string;
  serve_player_name?: string;

  // Attack fields
  hit_position?: HitPosition;   // 'P1' | 'Pipe' | 'P2' | 'P3' | 'P4'
  hit_player_id?: string;
  hit_player_name?: string;

  // Landing (discrete grid - STILL CALCULATED)
  landing_grid_x: number;       // 0-5 (or -1 for out)
  landing_grid_y: number;       // 0-5 (or -1 for out)

  result: 'in_play' | 'kill' | 'ace';
  timestamp: number;

  // NEW: Trajectory data (visual coordinates)
  trajectory: {
    startX: number;       // SVG coordinate (30-390)
    startY: number;       // SVG coordinate (40-760)
    endX: number;         // SVG coordinate (0-420)
    endY: number;         // SVG coordinate (0-800)
    startInBounds: boolean; // Always true (must start on court)
    endInBounds: boolean;   // False if ball landed out
  };
}
```

**Key Points:**
- `landing_grid_x/y` STILL captured (for statistics compatibility)
- `trajectory` is ADDITIONAL data (visual layer)
- Both calculated from same endpoint (endX, endY)
- Grid is auto-calculated, trajectory is user-drawn

---

### 7.2 Context State Structure

**OpponentTrackingContext (Visual Mode):**
```typescript
interface VisualTrackingState {
  // Selection state
  selectedServePosition: number | null;     // 0-4
  selectedServePlayer: OpponentPlayer | null;
  selectedHitPosition: HitPosition | null;  // 'P1' | 'Pipe' | etc.
  selectedHitPlayer: OpponentPlayer | null;

  // Drawing state
  currentTrajectory: TrajectoryData | null; // In-progress trajectory
  isDragging: boolean;                      // Mouse/touch down?

  // Queue of saved attempts
  attemptQueue: OpponentAttempt[];          // Multiple per point

  // Rules enforcement
  serveDropdownsLocked: boolean;            // One serve per point

  // Lineup tracking
  currentLineup: OpponentLineup;            // P1-P6 assignments

  // UI state
  currentAttemptNumber: number;             // Counter (1, 2, 3...)
  errors: string[];                         // Validation errors
}
```

**Actions:**
```typescript
type VisualTrackingAction =
  | { type: 'SET_SERVE_POSITION'; payload: { position: number; player: OpponentPlayer } }
  | { type: 'SET_HIT_POSITION'; payload: { position: HitPosition; player: OpponentPlayer | null } }
  | { type: 'START_DRAWING'; payload: { startX: number; startY: number } }
  | { type: 'UPDATE_TRAJECTORY'; payload: { endX: number; endY: number } }
  | { type: 'FINALIZE_TRAJECTORY'; payload: TrajectoryData }
  | { type: 'SAVE_ATTEMPT'; payload: { result: 'in_play' | 'kill' | 'ace' } }
  | { type: 'UNDO_LAST_TRAJECTORY' }
  | { type: 'CLEAR_ALL' }
  | { type: 'RESET_FOR_NEW_POINT' }
  | { type: 'UPDATE_LINEUP'; payload: Partial<OpponentLineup> };
```

---

### 7.3 Data Persistence (Google Sheets)

**Storage Format:**
```typescript
// Points sheet row
{
  point_number: 5,
  set_number: 1,
  winning_team: 'opponent',
  action_type: 'Attack',
  action: 'Kill',
  opponent_player: 'opp_12',
  home_score: 4,
  opponent_score: 5,
  timestamp: '2025-10-31T12:34:56Z',

  // JSON string in one column
  opponent_attempts: JSON.stringify([
    {
      attempt_number: 1,
      type: 'serve',
      serve_position: 1,
      serve_player_id: 'opp_11',
      landing_grid_x: 2,
      landing_grid_y: 4,
      trajectory: {
        startX: 210,
        startY: 720,
        endX: 210,
        endY: 200,
        startInBounds: true,
        endInBounds: true
      },
      result: 'in_play',
      timestamp: 1698765432100
    },
    {
      attempt_number: 2,
      type: 'attack',
      hit_position: 'P4',
      hit_player_id: 'opp_12',
      landing_grid_x: 0,
      landing_grid_y: 5,
      trajectory: {
        startX: 80,
        startY: 200,
        endX: 50,
        endY: 700,
        startInBounds: true,
        endInBounds: true
      },
      result: 'kill',
      timestamp: 1698765435600
    }
  ])
}
```

**Column Schema:**
- Existing columns unchanged
- `opponent_attempts` column stores JSON array as text
- Backend parses JSON when loading match
- Frontend serializes JSON when saving

---

## 8. Use Cases & Scenarios

### Use Case 1: Live Match Tracking (Speed-Critical)

**Actor:** Head coach during live match

**Goal:** Record opponent patterns without falling behind play

**Scenario:**
1. Opponent serves ace from right zone
2. Coach draws serve trajectory (3 sec)
3. Clicks "In-Play" (1 sec)
4. Point ends immediately (opponent scored)
5. Scrolls to Point Entry Form (2 sec)
6. Selects Loss/Serve/Ace (2 sec)
7. Submits point (1 sec)
8. **Total: 9 seconds** before next serve

**Success Criteria:**
- Entry time < 15 seconds (time between points)
- No missed data
- Coach keeps up with match pace

**Potential Issues:**
- Drawing too slow → Falls behind
- **Mitigation:** Provide "Quick Grid" toggle for emergency speed

---

### Use Case 2: Post-Game Video Review (Quality-Critical)

**Actor:** Assistant coach reviewing match video

**Goal:** Create detailed visual scouting report with precise trajectories

**Scenario:**
1. Pause video at serve
2. Draw exact serve trajectory (5 sec)
3. Pause video at pass
4. Draw attack trajectory (5 sec)
5. Repeat for all touches in rally
6. Export point with 8 trajectories as PNG
7. Add to scouting report PowerPoint

**Success Criteria:**
- Trajectories match video exactly
- Visual clarity for team review
- Exportable to presentation format

**Potential Issues:**
- None (unlimited time available)

---

### Use Case 3: Tendency Analysis (Data-Critical)

**Actor:** Data analyst creating opponent scouting report

**Goal:** Identify opponent serve/attack patterns

**Scenario:**
1. Filter all opponent serves from left zone
2. Visualize heatmap of landing locations
3. Notice 80% of serves go to zone (1, 2)
4. Create strategic recommendation: "Stack passers in zone 2"
5. Export heatmap to report

**Success Criteria:**
- Grid coordinates enable statistical aggregation
- Trajectory data enables visual heatmap
- Both datasets work together

**Potential Issues:**
- If ONLY trajectories (no grid) → Hard to aggregate
- **Solution:** Always calculate both

---

### Use Case 4: Player Self-Review (Educational)

**Actor:** Middle blocker reviewing own match

**Goal:** Understand opponent's attack patterns to improve blocking

**Scenario:**
1. Open visual tracking page
2. Filter: "Show all P3 attacks against me"
3. See 15 trajectories overlaid on court
4. Notice: 12/15 attacks went cross-court (zone 4-5)
5. Insight: "I need to shift block angle right"

**Success Criteria:**
- Easy filtering by position
- Clear visual patterns
- Actionable insights

**Potential Issues:**
- Too many overlapping arrows → Cluttered
- **Solution:** Heatmap view (density colors)

---

### Use Case 5: Emergency Speed Mode (Fallback)

**Actor:** Coach overwhelmed during fast-paced match

**Goal:** Keep recording data without falling behind

**Scenario:**
1. Rally has 8 touches
2. Coach realizes drawing is too slow
3. Clicks "⚙️ Settings"
4. Toggles: "Grid Mode" (temporary fallback)
5. Uses old 6×6 grid for speed
6. Submits point quickly
7. Toggles back to visual mode when caught up

**Success Criteria:**
- Seamless mode switching
- No data loss
- Coach maintains control

**Potential Issues:**
- Mode switching confusing
- **Solution:** Clear toggle UI, persistent setting

---

## 9. Technical Requirements

### 9.1 Browser Compatibility

**Minimum Requirements:**
- Chrome 90+ (2021)
- Safari 14+ (2020)
- Firefox 88+ (2021)
- Edge 90+ (2021)

**Required Features:**
- SVG 2.0 support
- Touch Events API
- CSS Grid Layout
- ES2020 JavaScript

**Not Supported:**
- Internet Explorer (any version)
- Chrome < 70
- Safari < 12

---

### 9.2 Performance Targets

**Metrics:**

1. **Initial Page Load:**
   - Target: < 2 seconds (3G connection)
   - Includes: React bundle, SVG assets, fonts

2. **Drawing Latency:**
   - Target: < 50ms (imperceptible)
   - Measured: Time from touch to arrow update

3. **Frame Rate (While Dragging):**
   - Target: 60 FPS
   - Method: `requestAnimationFrame`

4. **Save Operation:**
   - Target: < 200ms (to context)
   - Target: < 2 seconds (to Google Sheets)

5. **Memory Usage:**
   - Target: < 100 MB (for entire page)
   - Includes: 50+ trajectories, match data

**Optimization Strategies:**
1. Use `React.memo` for trajectory arrows
2. Debounce mouse/touch move events (16ms)
3. Lazy load trajectory viewer (code splitting)
4. Compress trajectory data (round coordinates to integers)

---

### 9.3 Accessibility (A11y)

**Keyboard Navigation:**
- Tab: Navigate between serve dropdowns, hit buttons, court, In-Play button
- Arrow keys: Move focus between lineup cells
- Space/Enter: Activate buttons
- Ctrl+Z: Undo last trajectory
- Esc: Cancel current drawing

**Screen Reader Support:**
- ARIA labels on all interactive elements
- Status announcements: "Serve zone selected", "Trajectory drawn", "Attempt saved"
- Role="application" on court SVG (alert screen readers to custom interactions)

**Visual Accessibility:**
- High contrast mode support
- Color-blind friendly (red/green replaced with shapes for in/out)
- Font size: Minimum 12px (scalable)
- Touch targets: Minimum 44px × 44px

**Limitations:**
- Drawing with screen reader: Not feasible (visual-only interaction)
- Alternative: Provide audio description of key trajectories

---

### 9.4 Data Backup & Recovery

**Auto-Save Strategy:**
```typescript
// Save to localStorage every 30 seconds
useEffect(() => {
  const intervalId = setInterval(() => {
    localStorage.setItem(
      `visual-tracking-backup-${matchId}`,
      JSON.stringify({
        attemptQueue: state.attemptQueue,
        currentLineup: state.currentLineup,
        timestamp: Date.now()
      })
    );
  }, 30000); // 30 seconds

  return () => clearInterval(intervalId);
}, [matchId, state.attemptQueue, state.currentLineup]);

// Restore on page load
useEffect(() => {
  const backup = localStorage.getItem(`visual-tracking-backup-${matchId}`);
  if (backup) {
    const data = JSON.parse(backup);
    // Show prompt: "Restore unsaved data from 2 minutes ago?"
    if (confirm('Restore unsaved tracking data?')) {
      restoreBackup(data);
    }
  }
}, [matchId]);
```

**Data Loss Scenarios:**
1. **Browser crash:** Auto-save protects last 30 seconds
2. **Accidental refresh:** Backup prompt on page load
3. **Power loss:** Last submitted points safe in Google Sheets
4. **Network error:** Retry queue (up to 3 attempts)

---

## 10. Differences from Current System

### Side-by-Side Comparison

| Feature | Current (Grid) | New (Visual) |
|---------|---------------|--------------|
| **Landing Selection** | Click 6×6 grid cell | Draw trajectory, auto-calculate grid |
| **Visual Output** | Abstract grid highlight | Arrow with start/end points |
| **Input Method** | Mouse click | Click-and-drag gesture |
| **Precision** | Discrete zones (6×6) | Pixel-perfect coordinates |
| **Speed** | Fast (1 click) | Slower (draw gesture, ~3-5 sec) |
| **Learning Curve** | Low (click grid) | Medium (draw accurately) |
| **Replay Value** | Low (just grid cell) | High (visual trajectory animation) |
| **Export** | Grid coordinates only | Grid + trajectory SVG |
| **Touch Optimization** | Adequate | Excellent (gesture-based) |
| **Data Size** | Small (2 numbers) | Larger (4 numbers + bounds) |
| **Statistics** | Easy (aggregate grid cells) | Same (grid still calculated) |
| **Use Case** | Live match (speed) | Video review (quality) |

### Migration Strategy

**Option 1: Replace Grid Completely (Not Recommended)**
- Remove LandingGrid component
- Replace with VolleyballCourt component
- Risk: Too slow for live matches

**Option 2: Separate Page (Chosen)**
- Keep current StatsPage with grid (backup)
- Create new VisualTrackingPage with drawing
- Toggle between pages via navigation
- Benefit: Safety net, A/B testing

**Option 3: Hybrid Toggle (Future)**
- Single page with mode toggle
- Grid mode: Fast clicks (live matches)
- Visual mode: Draw trajectories (video review)
- Best of both worlds

---

## 11. Open Questions

### Questions for User Review

**Q1: Court Orientation**
> Should the court be rotated so net is horizontal (left-right) instead of vertical (top-bottom)?
>
> **Current:** Net at top, baseline at bottom (vertical)
> **Alternative:** Net on left, baseline on right (horizontal)
>
> Pros of horizontal: Matches real court view from sideline
> Cons: Requires landscape-only mode

**User Decision:** [ ] Keep vertical  [ ] Switch to horizontal  [ ] Make it toggleable

---

**Q2: Lineup Auto-Suggestion**
> How should the system auto-suggest which player hit from each position?
>
> **Option A:** Based on volleyball rotation rules (complex, accurate)
> **Option B:** Based on last known positions (simple, error-prone)
> **Option C:** No auto-suggestion (coach always manually selects)
>
> Trade-off: Accuracy vs. simplicity

**User Decision:** [ ] Option A  [ ] Option B  [X] Option C (for now, add Option A later)

---

**Q3: Multiple Trajectories Display**
> When there are 5+ attempts in a rally, how should trajectories be displayed?
>
> **Option A:** All overlaid (can get cluttered)
> **Option B:** Numbered labels on arrows (1, 2, 3...)
> **Option C:** Show only last trajectory (clear previous)
> **Option D:** Tabbed view (serve, attack #1, attack #2...)
>
> Which is clearest?

**User Decision:** [ ] A  [X] B  [ ] C  [ ] D

---

**Q4: Undo Granularity**
> What should "Undo" do?
>
> **Option A:** Undo last trajectory only (keep selection)
> **Option B:** Undo last save (remove from attempt queue)
> **Option C:** Both (two separate undo buttons)
>
> Current spec: Option A

**User Decision:** [X] A  [ ] B  [ ] C

---

**Q5: Out-of-Bounds Handling**
> If ball lands out-of-bounds, should we still require grid coordinates?
>
> **Option A:** Use (-1, -1) as out marker (current spec)
> **Option B:** Use nearest edge cell (e.g., out at x=0 → grid x=0)
> **Option C:** No grid coordinates for out (null)
>
> Affects statistics: Can we count "out to left" vs "out to right"?

**User Decision:** [ ] A  [X] B  [ ] C

---

**Q6: Export Format**
> What file format(s) for exporting visual reports?
>
> **Needed:**
> - [ ] PNG (image)
> - [ ] PDF (document)
> - [ ] SVG (vector, editable)
> - [ ] JSON (raw data)
> - [ ] CSV (spreadsheet)
>
> Which are highest priority?

**User Decision:** Check all that apply

---

**Q7: Mobile Phone Support**
> Should we support phones (< 600px width)?
>
> **Challenge:** Drawing precise trajectories on 5-inch screen is difficult
>
> **Option A:** Block entirely, show "Tablet required" message
> **Option B:** Allow but warn "Best on tablets"
> **Option C:** Full support with simplified UI
>
> Resource cost: Option C requires significant extra work

**User Decision:** [X] A  [ ] B  [ ] C

---

**Q8: Trajectory Color Coding**
> Should trajectories have different colors based on type?
>
> **Option A:** All blue (current spec)
> **Option B:** Serve = green, Attack = blue, Kill = red
> **Option C:** Color by result (in-play = blue, kill = red, ace = green)
> **Option D:** Color by player (each opponent gets unique color)
>
> Trade-off: More colors = more information, but potentially confusing

**User Decision:** [X] A  [ ] B  [ ] C  [ ] D

---

**Q9: Real-Time Collaboration**
> Should multiple coaches be able to track simultaneously?
>
> **Scenario:** Head coach tracks serves, assistant tracks attacks
> **Requires:** WebSocket connection, real-time sync, conflict resolution
> **Complexity:** High (2-3 weeks extra work)
>
> Priority: P0 (now) or P1 (later)?

**User Decision:** [ ] P0 (must have)  [X] P1 (nice to have)

---

**Q10: Gesture Shortcuts**
> Should we support advanced gestures?
>
> **Possibilities:**
> - Two-finger tap: Undo
> - Long press: Open context menu
> - Pinch: Zoom court (for precision)
> - Swipe: Clear trajectory
>
> Which gestures feel natural?

**User Decision:** List preferred gestures below:
- _________________________
- _________________________
- _________________________

---

## 12. Next Steps (After Approval)

### Implementation Phases

**Phase 1: Core Components (Week 1)**
- [ ] Create VisualTrackingPage shell
- [ ] Port VolleyballCourt SVG component from prototype
- [ ] Implement trajectory drawing (mouse + touch)
- [ ] Add serve/hit position selectors
- [ ] Basic state management (Context API)

**Phase 2: Data Integration (Week 1-2)**
- [ ] Auto-calculate grid cells from trajectories
- [ ] Connect to OpponentTrackingContext
- [ ] Save attempts to queue
- [ ] Integrate with Point Entry Form
- [ ] Test end-to-end workflow

**Phase 3: UI Polish (Week 2)**
- [ ] Lineup sheet component
- [ ] In-Play button with validation
- [ ] Current selection display
- [ ] Undo/Clear functionality
- [ ] Error handling & toasts

**Phase 4: Testing & Refinement (Week 3)**
- [ ] iPad testing (landscape + portrait)
- [ ] Desktop browser testing
- [ ] Performance profiling (60fps check)
- [ ] User acceptance testing (coach feedback)
- [ ] Bug fixes

**Phase 5: Documentation & Launch (Week 3-4)**
- [ ] User guide with screenshots
- [ ] Video tutorial (2-3 min)
- [ ] Update navigation to include new page
- [ ] Soft launch to 2-3 test coaches
- [ ] Collect feedback, iterate

**Total Timeline:** 3-4 weeks for P0 features

---

## 13. Approval Checklist

Before implementation begins, confirm:

- [X] Layout approved (2-column: serve/hit/court | lineup/button)
- [ ] Drawing system understood (SVG coordinates, touch events, arrow math)
- [ ] Data model reviewed (trajectory + grid coordinates)
- [ ] Use cases validated (live match, video review, analysis)
- [ ] Open questions answered (see Section 11)
- [ ] Performance targets acceptable (< 50ms latency, 60fps)
- [ ] Accessibility requirements agreed upon
- [ ] Timeline realistic (3-4 weeks)

**Approval Signature:**
- User: _______________________ Date: _______
- Developer: Claude AI        Date: 2025-10-31

---

## Document Change Log

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-10-31 | Initial specification | Claude AI |

---

**END OF SPECIFICATION**

Total Pages: 35
Word Count: ~12,000
Review Status: Awaiting User Feedback
