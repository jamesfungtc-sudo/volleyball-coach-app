# Opponent Tracking Module - Complete Specification

**Version**: 1.0
**Date**: 2025-10-29
**Status**: Ready for Implementation

---

## Table of Contents

1. [Overview](#overview)
2. [Module Purpose](#module-purpose)
3. [Coordinate Systems](#coordinate-systems)
4. [UI Layout & Components](#ui-layout--components)
5. [User Workflow](#user-workflow)
6. [Data Structure](#data-structure)
7. [Business Rules](#business-rules)
8. [Smart Lineup Tracking](#smart-lineup-tracking)
9. [Integration with Main Point Entry](#integration-with-main-point-entry)
10. [Use Cases & Examples](#use-cases--examples)
11. [Implementation Notes](#implementation-notes)

---

## Overview

The **Opponent Tracking Module** is an advanced feature integrated into the In-Game Stats page that allows coaches to record detailed opponent serving and attacking patterns during live volleyball matches. This module captures:

- **Serve locations** (5 horizontal zones behind baseline)
- **Attack positions** (P1, Pipe, P2, P3, P4)
- **Ball landing zones** (6×6 grid on home team's court)
- **Player identification** for each action
- **Multiple attempts per point** (serves and attacks during a rally)

This data enables post-game analysis of opponent tendencies, helping coaches develop defensive strategies.

---

## Module Purpose

### Goals
1. **Track opponent patterns** with precision during live games
2. **Minimize data entry friction** for coaches working courtside
3. **Support multiple attempts** per point (long rallies with multiple attacks)
4. **Integrate seamlessly** with existing point entry workflow
5. **Work without perfect rotation tracking** (forgiving/dynamic system)

### Non-Goals
- Full automatic rotation tracking (too complex, error-prone)
- Real-time strategy recommendations (analysis happens post-game)
- Tracking home team patterns (separate feature)

---

## Coordinate Systems

### 1. Serve Position Dropdowns (5 Zones)

**Orientation**: From **home team's perspective** watching the opponent serve

```
        OPPONENT'S SIDE OF COURT
        (behind their baseline)

[Dropdown 0] [Dropdown 1] [Dropdown 2] [Dropdown 3] [Dropdown 4]
     ↓            ↓            ↓            ↓            ↓
   LEFT      LEFT-CENTER    CENTER    RIGHT-CENTER    RIGHT
(Home sees                                           (Home sees
 on LEFT)                                             on RIGHT)
```

**Mapping**:
- `serve_position: 0` = Leftmost zone (appears left when watching opponent)
- `serve_position: 1` = Left-center zone
- `serve_position: 2` = Center zone
- `serve_position: 3` = Right-center zone
- `serve_position: 4` = Rightmost zone (appears right when watching opponent)

**IMPORTANT**: These are **spatial zones**, NOT volleyball rotation positions (P1-P6). A player in rotation position P1 could serve from any of the 5 zones.

---

### 2. Hitting Position Buttons (5 Positions)

**Standard Volleyball Positions**:

```
         NET (y=5)
    ─────────────────────
    P4  |  P3  |  P2     FRONT ROW
    OH  |  MB  |  Opp    (y=4-5)
    ─────────────────────
       3-METER LINE
    ─────────────────────
    P5  |  P6  |  P1     BACK ROW
        | Pipe |         (y=0-3)
    ─────────────────────
      BASELINE (y=0)
```

**Button Mapping**:
- **P1**: Back row, right back position (position 1)
- **Pipe**: Back row, middle back position (position 6) - behind setter
- **P2**: Front row, right front (opposite hitter position)
- **P3**: Front row, middle front (middle blocker position)
- **P4**: Front row, left front (outside hitter position)

**Notes**:
- P1 and Pipe = **Back row attacks** (must hit from behind 3-meter line)
- P2, P3, P4 = **Front row attacks**
- Position names match existing volleyball terminology in the app

---

### 3. Landing Grid (6×6 Court Grid)

**Represents**: HOME TEAM'S COURT (where opponent's serves/attacks land)

**Orientation**: From home team's bench perspective

```
       x=0     x=1     x=2     x=3     x=4     x=5
      (P4)                                    (P2)
y=5   [NET - NEAR SIDE - Front Court]
y=4
y=3
y=2
y=1
y=0   [BASELINE - FAR SIDE - Back Court]

LEFT ← (x-axis) → RIGHT (from home team's view)
NEAR ← (y-axis) → FAR (from net to baseline)
```

**Coordinate Mappings**:
- **x-axis**:
  - `x=0`: Left side (home team's P4 / outside hitter zone)
  - `x=5`: Right side (home team's P2 / opposite hitter zone)
- **y-axis**:
  - `y=5`: Net (near side, front court)
  - `y=0`: Baseline (far side, back court)

**Example Locations**:
- `(0, 5)` = Left corner at net (sharp angle attack)
- `(5, 5)` = Right corner at net
- `(2, 0)` = Center back (deep serve landing)
- `(0, 0)` = Left back corner (deep cross-court attack)

**CRITICAL**: This grid represents where the ball LANDS on the home team's side, not where the opponent hits from.

---

## UI Layout & Components

### Page Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Page Header (Score, Set Number, Timer, etc.)              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ╔═══════════════════════════════════════════════════════╗  │
│  ║   OPPONENT TRACKING MODULE (Always Visible)           ║  │
│  ╠═══════════════════════════════════════════════════════╣  │
│  ║                                                        ║  │
│  ║  ┌─ Serve Location Selection ─────────────────────┐  ║  │
│  ║  │ [Ser. ▼] [Ser. ▼] [Ser. ▼] [Ser. ▼] [Ser. ▼] │  ║  │
│  ║  │  (5 dropdowns - one per zone)                  │  ║  │
│  ║  └─────────────────────────────────────────────────┘  ║  │
│  ║                                                        ║  │
│  ║  ┌─ Hitting Position Selection ──────────────────┐   ║  │
│  ║  │ [P1] [Pipe]       (back row buttons)          │   ║  │
│  ║  │ [P2] [P3] [P4]    (front row buttons)         │   ║  │
│  ║  └─────────────────────────────────────────────────┘  ║  │
│  ║                                                        ║  │
│  ║  ┌─ Left: Landing Grid ──┬─ Right: Lineup Sheet ───┐ ║  │
│  ║  │                        │                         │ ║  │
│  ║  │  6×6 Grid (36 cells)  │  --- Opponent ---       │ ║  │
│  ║  │                        │  ┌───┬───┬───┐         │ ║  │
│  ║  │  [0,5] [1,5] ... [5,5]│  │ 5 │ 9 │26 │ (Front) │ ║  │
│  ║  │  [0,4] [1,4] ... [5,4]│  └───┴───┴───┘         │ ║  │
│  ║  │    ...                 │  ┌───┬───┬───┐         │ ║  │
│  ║  │  [0,0] [1,0] ... [5,0]│  │ 1 │ 4 │ 6 │ (Back)  │ ║  │
│  ║  │                        │  └───┴───┴───┘         │ ║  │
│  ║  │                        │   P5  P6  P1           │ ║  │
│  ║  └────────────────────────┴──────────────────────── ┘ ║  │
│  ║                                                        ║  │
│  ║  ┌─ Action Button ───────────────────────────────┐   ║  │
│  ║  │           [In-play] (Large button)            │   ║  │
│  ║  └─────────────────────────────────────────────────┘  ║  │
│  ╚═══════════════════════════════════════════════════════╝  │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─ MAIN POINT ENTRY SYSTEM ──────────────────────────┐   │
│  │                                                      │   │
│  │  Win/Loss Toggle:    [⚪ Win]  [🔴 Loss]           │   │
│  │                                                      │   │
│  │  Action Type:        [Att.] [Ser.] [Blo.] ...      │   │
│  │                                                      │   │
│  │  Action Dropdown:    [Hard Spike ▼]                │   │
│  │                                                      │   │
│  │  Player Selection:   [Select Player ▼]             │   │
│  │                                                      │   │
│  │  Terminal Actions:   [Point Win] [Point Lost]      │   │
│  │                                                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### Component Details

#### 1. Serve Location Dropdowns (5 identical dropdowns)

**Purpose**: Record opponent serve origin position

**Behavior**:
- Each dropdown contains all opponent players (#1, #4, #7, #9, etc.)
- Only ONE dropdown can be selected per point (one serve per point rule)
- After recording serve + clicking "In-play", ALL 5 dropdowns become **DISABLED**
- Dropdowns re-enable when point ends (Win/Loss clicked)

**Visual States**:
- **Default**: Gray, enabled, shows "Ser. ▼"
- **Selected**: Highlighted, shows player number (e.g., "#12 ▼")
- **Locked**: Gray, disabled, shows "🔒 Ser. ▼" (after serve recorded)

---

#### 2. Hitting Position Buttons (5 buttons in 2 rows)

**Purpose**: Record opponent attack origin position

**Layout**:
```
Row 1 (Back Row):  [P1]  [Pipe]
Row 2 (Front Row): [P2]  [P3]  [P4]
```

**Behavior**:
- Radio button behavior (only one can be selected at a time)
- Clicking a button highlights it AND highlights expected player on lineup sheet
- Buttons remain enabled throughout the point (multiple attacks allowed)
- Resets after "In-play" click

**Visual States**:
- **Default**: White background, gray border
- **Selected**: Purple/blue background, white text
- **Disabled**: (Never disabled, unlike serve dropdowns)

---

#### 3. Opponent Lineup Sheet (Right Side Panel)

**Purpose**: Visual confirmation of current opponent positions

**Layout**:
```
    --- Opponent ---

    ┌─────┬─────┬─────┐
    │  5  │  9  │ 26  │  ← Front Row (P5, P3=MB, P4=OH)
    └─────┴─────┴─────┘

    ┌─────┬─────┬─────┐
    │  1  │  4  │  6  │  ← Back Row (P5, P6=S, P1)
    └─────┴─────┴─────┘
```

**Behavior**:
- Shows current 6 players on court for opponent team
- When hitting position button clicked, corresponding position highlights (e.g., P4 button → #26 box highlights purple)
- Players can be manually updated if auto-suggestion is wrong
- Updates via smart rotation logic (see [Smart Lineup Tracking](#smart-lineup-tracking))

**Interactive**:
- Coach can click any player box to manually override
- Shows player number only (no names for space efficiency)

---

#### 4. Landing Grid (6×6 Grid, 36 cells)

**Purpose**: Record precise ball landing location

**Appearance**:
- Each cell shows coordinates in light gray: "(x,y)"
- Empty by default
- Cells light up on hover
- Selected cell highlights with border

**Behavior**:
- Click any cell to record landing location
- Can change selection before clicking "In-play"
- Must select grid cell before "In-play" button activates

**Visual Feedback**:
- **Heatmap mode** (optional): Show density of previous landings with blue gradient
- **Selected**: Bold border, highlighted background

---

#### 5. "In-play" Button

**Purpose**: Save current attempt and continue rally

**Appearance**:
- Large, full-width purple button
- Text: "In-play"

**Behavior**:
- **Enabled**: When all required fields filled (player + grid selected)
- **Disabled**: Gray, unclickable if fields incomplete
- **Click action**:
  1. Saves current attempt to temporary array
  2. Clears all selections (dropdowns, buttons, grid)
  3. Locks serve dropdowns (if serve was recorded)
  4. Increments attempt counter
  5. Ready for next attempt

---

## User Workflow

### Basic Workflow - Single Attack Point

```
┌─────────────────────────────────────────┐
│ POINT START: Opponent serves            │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ Step 1: Record Serve (Optional)         │
│ - Click appropriate serve dropdown      │
│ - Select serving player (#12)           │
│ - Click grid where ball landed (2, 1)   │
│ - Click [In-play]                        │
│   → Serve attempt saved                  │
│   → Serve dropdowns LOCK                 │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ RALLY: Home team receives & attacks     │
│ Opponent digs, sets to outside           │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ Step 2: Record Attack (Kill)            │
│ - Click [P4] button                      │
│   → Lineup highlights #7 in P4           │
│ - Confirm player (or manually override) │
│ - Click grid where ball landed (0, 4)   │
│ - Do NOT click [In-play] (this was kill)│
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ Step 3: Finalize Point in Main System   │
│ - Scroll to main point entry             │
│ - Click [Point Lost]                     │
│ - Select Action Type: "Op. Att."        │
│   → System marks last attempt as 'kill'  │
│ - Point saved with 2 attempts            │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ MODULE RESETS:                           │
│ - Serve dropdowns re-enable              │
│ - All selections clear                   │
│ - Ready for next point                   │
└─────────────────────────────────────────┘
```

---

### Advanced Workflow - Long Rally (Multiple Attempts)

```
SCENARIO: 7-touch rally ending in opponent kill

Point Start: Opponent Serve
  ↓
[1] Coach records serve
    - Dropdown 2 (center) → #12
    - Grid (2, 1)
    - Click [In-play] ✓
    → Attempt 1 saved (serve, in_play)
    → Serve dropdowns LOCK

Rally continues...
Home team attacks → Opponent digs & sets
  ↓
[2] Opponent first attack attempt
    - Click [P3] → #9 highlighted
    - Grid (3, 5)
    - Click [In-play] ✓
    → Attempt 2 saved (attack P3, in_play)
    → Module resets

Rally continues...
Home team digs → Opponent transitions
  ↓
[3] Opponent second attack attempt
    - Click [Pipe] → #10 highlighted
    - Grid (2, 3)
    - Click [In-play] ✓
    → Attempt 3 saved (attack Pipe, in_play)
    → Module resets

Rally continues...
Home team digs → Opponent sets outside
  ↓
[4] Opponent final attack (KILL)
    - Click [P4] → #7 highlighted
    - Grid (0, 4)
    - Do NOT click [In-play]
    ↓
Scroll to main point entry
    - Click [Point Lost]
    - Select Action Type: "Op. Att."
    - Select player (if needed for home defender)
    → Attempt 4 marked as 'kill'
    → Point finalized

DATA SAVED:
{
  point_number: 42,
  winning_team: 'opponent',
  opponent_attempts: [
    { attempt: 1, type: 'serve', position: 2, player: '#12',
      grid: (2,1), result: 'in_play' },
    { attempt: 2, type: 'attack', position: 'P3', player: '#9',
      grid: (3,5), result: 'in_play' },
    { attempt: 3, type: 'attack', position: 'Pipe', player: '#10',
      grid: (2,3), result: 'in_play' },
    { attempt: 4, type: 'attack', position: 'P4', player: '#7',
      grid: (0,4), result: 'kill' }
  ]
}
```

---

## Data Structure

### Primary Interface: OpponentAttempt

```typescript
interface OpponentAttempt {
  // Metadata
  attempt_number: number;        // 1, 2, 3... within this point
  type: 'serve' | 'attack';      // Type of action

  // Serve-specific fields (when type === 'serve')
  serve_position?: number;       // 0-4 (dropdown index, left to right)
  serve_player_id?: string;      // Opponent player ID (e.g., "opp_12")
  serve_player_name?: string;    // Display name (e.g., "#12")

  // Attack-specific fields (when type === 'attack')
  hit_position?: 'P1' | 'Pipe' | 'P2' | 'P3' | 'P4';
  hit_player_id?: string;        // Opponent player ID
  hit_player_name?: string;      // Display name (e.g., "#7")

  // Landing location (required for both types)
  landing_grid_x: number;        // 0-5 (x-coordinate on home court)
  landing_grid_y: number;        // 0-5 (y-coordinate on home court)

  // Result/Outcome
  result: 'in_play' | 'kill' | 'ace';
  // 'in_play': Rally continued after this action (clicked [In-play])
  // 'kill': Point ended, opponent won via attack (action_type = "Op. Att.")
  // 'ace': Point ended, opponent won via serve (action_type = "Op. Ace")

  // Timestamp
  timestamp: number;             // Unix timestamp (ms) when recorded
}
```

---

### Extended PointData Interface

```typescript
interface PointData {
  // ========== EXISTING FIELDS (unchanged) ==========
  point_number: number;          // Sequential point number in set
  set_number: number;            // Which set (1-5)
  winning_team: 'home' | 'opponent';

  // Action details (from main point entry system)
  action_type: string;           // "Att.", "Op. Att.", "Ser.", "Op. Ace", "Blo.", etc.
  action: string;                // "Hard Spike", "Tip", "Jump Serve", etc.

  // Player identification
  home_player: string;           // Home team player involved
  opponent_player: string;       // Opponent player (if home won, this is defender)

  // Score tracking
  home_score: number;            // Home team score after this point
  opponent_score: number;        // Opponent team score after this point

  // Metadata
  timestamp: number;             // When point was recorded

  // ========== NEW FIELD ==========
  opponent_attempts: OpponentAttempt[];  // Array of tracked opponent actions
  // Can be empty array [] if no tracking for this point
  // Can have 1 element (simple point)
  // Can have multiple elements (long rally)
}
```

---

### Example Data Objects

#### Example 1: Simple Point (Opponent Ace)

```json
{
  "point_number": 8,
  "set_number": 1,
  "winning_team": "opponent",
  "action_type": "Op. Ace",
  "action": "Jump Serve",
  "home_player": "",
  "opponent_player": "#12",
  "home_score": 4,
  "opponent_score": 5,
  "timestamp": 1698765432000,

  "opponent_attempts": [
    {
      "attempt_number": 1,
      "type": "serve",
      "serve_position": 2,
      "serve_player_id": "opp_12",
      "serve_player_name": "#12",
      "landing_grid_x": 2,
      "landing_grid_y": 1,
      "result": "ace",
      "timestamp": 1698765432000
    }
  ]
}
```

---

#### Example 2: Long Rally (3 Attacks, Opponent Wins)

```json
{
  "point_number": 23,
  "set_number": 2,
  "winning_team": "opponent",
  "action_type": "Op. Att.",
  "action": "Hard Spike",
  "home_player": "#8",
  "opponent_player": "#7",
  "home_score": 18,
  "opponent_score": 16,
  "timestamp": 1698765445000,

  "opponent_attempts": [
    {
      "attempt_number": 1,
      "type": "serve",
      "serve_position": 1,
      "serve_player_id": "opp_4",
      "serve_player_name": "#4",
      "landing_grid_x": 4,
      "landing_grid_y": 2,
      "result": "in_play",
      "timestamp": 1698765445000
    },
    {
      "attempt_number": 2,
      "type": "attack",
      "hit_position": "P3",
      "hit_player_id": "opp_9",
      "hit_player_name": "#9",
      "landing_grid_x": 3,
      "landing_grid_y": 5,
      "result": "in_play",
      "timestamp": 1698765445200
    },
    {
      "attempt_number": 3,
      "type": "attack",
      "hit_position": "P4",
      "hit_player_id": "opp_7",
      "hit_player_name": "#7",
      "landing_grid_x": 0,
      "landing_grid_y": 4,
      "result": "kill",
      "timestamp": 1698765445400
    }
  ]
}
```

---

#### Example 3: Home Team Wins (Opponent Attack Tracked)

```json
{
  "point_number": 15,
  "set_number": 1,
  "winning_team": "home",
  "action_type": "Att.",
  "action": "Hard Spike",
  "home_player": "#11",
  "opponent_player": "#26",
  "home_score": 10,
  "opponent_score": 9,
  "timestamp": 1698765438000,

  "opponent_attempts": [
    {
      "attempt_number": 1,
      "type": "serve",
      "serve_position": 3,
      "serve_player_id": "opp_12",
      "serve_player_name": "#12",
      "landing_grid_x": 5,
      "landing_grid_y": 3,
      "result": "in_play",
      "timestamp": 1698765438000
    },
    {
      "attempt_number": 2,
      "type": "attack",
      "hit_position": "P2",
      "hit_player_id": "opp_26",
      "hit_player_name": "#26",
      "landing_grid_x": 5,
      "landing_grid_y": 5,
      "result": "in_play",
      "timestamp": 1698765438100
    }
  ]
}
```
*Note: Home team won, but opponent attempts still tracked for scouting purposes*

---

#### Example 4: No Opponent Tracking (Home Ace)

```json
{
  "point_number": 3,
  "set_number": 1,
  "winning_team": "home",
  "action_type": "Ace (On floor)",
  "action": "Jump Serve",
  "home_player": "#5",
  "opponent_player": "",
  "home_score": 3,
  "opponent_score": 2,
  "timestamp": 1698765420000,

  "opponent_attempts": []
}
```
*Note: Empty array - opponent never touched the ball*

---

## Business Rules

### Rule 1: One Serve Per Point
- A volleyball point can only start with ONE serve
- After first serve recorded + [In-play] clicked, serve dropdowns LOCK
- Serve dropdowns remain disabled until point ends (Win/Loss clicked)
- System validation: If `opponent_attempts` contains `type: 'serve'`, prevent recording another serve

---

### Rule 2: Multiple Attacks Allowed
- A point can have unlimited attack attempts (long rallies)
- Hitting position buttons remain enabled throughout point
- Each [In-play] click records a separate attack attempt
- No limit on number of attacks per point

---

### Rule 3: Result Determination Logic

**When "In-play" clicked**:
```
attempt.result = 'in_play'
```

**When point ends (Win/Loss clicked in main system)**:
```
IF last_attempt exists AND did_not_click_in_play THEN
  IF action_type === 'Op. Att.' THEN
    last_attempt.result = 'kill'
  ELSE IF action_type === 'Op. Ace' THEN
    first_attempt.result = 'ace'  // (first attempt should be serve)
  END IF
END IF
```

**Example Flow**:
```
1. Opponent attacks from P4, lands at (0, 4)
2. Coach clicks P4 → player → grid
3. Coach does NOT click [In-play] (knows it's a kill)
4. Coach scrolls to main point entry
5. Coach clicks [Point Lost]
6. Coach selects Action Type: "Op. Att."
   → System detects: last attempt + action type "Op. Att." = KILL
   → Updates last_attempt.result = 'kill'
```

---

### Rule 4: Terminal vs Non-Terminal Actions

**Non-Terminal (Rally Continues)**:
- Opponent serve → home team passes successfully
- Opponent attack → home team digs successfully
- Opponent block touch → ball stays in play
→ Coach clicks [In-play]

**Terminal (Point Ends)**:
- Opponent ace (serve wins point)
- Opponent kill (attack wins point)
- Home team error during opponent action (net violation, foot fault, etc.)
→ Coach does NOT click [In-play], goes to main point entry

---

### Rule 5: Attempt Numbering
- Attempts numbered sequentially: 1, 2, 3...
- Numbering resets to 1 at start of each new point
- Numbering is independent of attempt type (serve is always #1, subsequent attacks are #2, #3, etc.)

---

### Rule 6: Data Validation

**Required fields for serve attempt**:
- `serve_position` (0-4)
- `serve_player_id`
- `landing_grid_x` (0-5)
- `landing_grid_y` (0-5)

**Required fields for attack attempt**:
- `hit_position` ('P1' | 'Pipe' | 'P2' | 'P3' | 'P4')
- `hit_player_id`
- `landing_grid_x` (0-5)
- `landing_grid_y` (0-5)

**[In-play] button disabled if**:
- No player selected (serve dropdown empty OR hit button not clicked)
- No landing grid cell selected

---

### Rule 7: Module Reset Conditions

**Module clears/resets when**:
1. [In-play] clicked (clears selections, keeps serve dropdowns locked if serve recorded)
2. [Point Win] or [Point Lost] clicked (full reset, re-enables serve dropdowns)

**Module does NOT reset when**:
- User navigates away and back (temporary state preserved)
- Set ends (state persists until explicitly cleared)

---

## Smart Lineup Tracking

### Overview

The system uses **role-based position logic** to auto-suggest which opponent player is in each position, without requiring perfect rotation tracking. This is a **hybrid approach**: smart enough to reduce clicks 80% of the time, flexible enough to handle missed rotations and substitutions.

---

### Pre-Match Setup (Required)

Before the set starts, coach provides:

```
Opponent Team Roster:
- 2× Outside Hitters (OH): #7, #11
- 2× Middle Blockers (MB): #9, #3
- 1× Setter (S): #5
- 1× Opposite (Opp): #26
- 1× Libero (L): #1

Starting 6 for Set 1:
- P1 (RB): #7 (OH1) ← Server at point 1
- P2 (RF): #26 (Opp)
- P3 (MF): #9 (MB1)
- P4 (LF): #11 (OH2)
- P5 (LB): #1 (L)
- P6 (MB): #5 (S)
```

This information is stored in the system before the set begins.

---

### Auto-Update Logic

**Trigger**: Coach selects a player from serve dropdown

**Process**:
1. System identifies selected player's role (e.g., #7 = OH1)
2. System knows volleyball rule: **Opposite positions are 3 rotations apart**
3. System calculates expected positions for all other players

**Volleyball Position Rules**:
- If OH1 is in P1 (back right) → OH2 must be in P4 (front left)
- If OH1 is in P4 (front left) → OH2 must be in P1 (back right)
- If MB1 is in P3 (front middle) → MB2 must be in P6 (back middle) OR replaced by Libero
- Setter and Opposite are always 3 rotations apart

---

### Example Auto-Update Sequence

**Scenario**: Coach selects #7 (OH1) from serve dropdown 0 (left position)

```
KNOWN:
- #7 is serving (confirmed by coach selection)
- #7 is OH1 (from roster data)
- #7 in back row (because serving)

INFERRED:
Step 1: Determine #7's rotation position
  - Serving from left side
  - Assume #7 is in P1 (right back from opponent's perspective)

Step 2: Calculate opposite positions
  - OH1 (#7) in P1 → OH2 (#11) must be in P4 (3 rotations away)
  - Update lineup sheet: P4 = #11

Step 3: Calculate other positions using rotation order
  - Starting 6 rotation: [#7, #26, #9, #11, #1, #5]
  - Current rotation (P1=#7): [P1=#7, P2=#26, P3=#9, P4=#11, P5=#1, P6=#5]

Step 4: Update entire lineup sheet
  FRONT ROW:
  - P4: #11 (OH2) ← Auto-filled
  - P3: #9 (MB1)
  - P2: #26 (Opp)

  BACK ROW:
  - P1: #7 (OH1) ← Confirmed by coach
  - P6: #5 (S)
  - P5: #1 (L)
```

**Result**: Lineup sheet updates automatically. When coach clicks [P4] button, #11 is highlighted as expected hitter.

---

### Manual Override

**When auto-suggestion is wrong** (due to substitution or missed rotation):

```
SCENARIO:
- System suggests #11 is in P4
- Coach sees #15 is actually hitting (substitution occurred)

USER ACTION:
1. Coach clicks P4 button
2. Lineup highlights #11 (wrong player)
3. Coach clicks on P4 cell in lineup sheet
4. Dropdown appears with all opponent players
5. Coach selects #15
6. System updates: P4 = #15
7. Coach continues with grid selection

FUTURE PREDICTIONS:
- System remembers #15 replaced #11
- Next rotation, system updates based on #15's role
```

---

### Libero Substitution Handling

**Volleyball Rule**: Libero can replace any back-row player (usually middle blocker) without counting as a substitution.

**System Behavior**:
```
SETUP:
- MB1 (#9) and MB2 (#3) in rotation
- Libero (#1) can sub for either

DETECTION:
- If coach manually sets back row MB position to Libero (#1)
- System remembers: Libero is replacing MB at this rotation
- When rotation continues, system expects Libero to move with MB rotation

EXAMPLE:
Rotation 1: P6 = #9 (MB1)
Rotation 2: P1 = #9 (MB1) → Coach overrides to #1 (L)
Rotation 3: P2 = (system predicts #1, as Libero follows MB rotation)
```

---

### Tracking Aids (Future Enhancement)

**Noted for future development**:

1. **Visual Warnings**:
   - Yellow highlight if selected player doesn't match expected rotation
   - "⚠️ Unexpected player - substitution?" tooltip

2. **Rotation Sync Points**:
   - "Update lineup?" prompt when discrepancy detected
   - Quick-sync button to realign system with actual court positions

3. **Substitution Log**:
   - Track when manual overrides occur
   - Display sub history: "#15 in for #11 at P4 (rotation 3)"

4. **Confidence Scoring**:
   - High confidence (✓): Player matches expected rotation
   - Low confidence (?): Multiple overrides detected, may need sync

---

## Integration with Main Point Entry

### System Architecture

```
┌─────────────────────────────────────────┐
│     OPPONENT TRACKING MODULE            │
│  (Temporary state during point)         │
│                                          │
│  State: {                                │
│    currentServe: { player, position }   │
│    currentAttacks: [ {...}, {...} ]     │
│    attemptCounter: 2                    │
│  }                                       │
└──────────────┬──────────────────────────┘
               │
               │ [In-play] clicked
               │ → Saves to temporary array
               │ → Resets input state
               │
┌──────────────▼──────────────────────────┐
│     TEMPORARY ATTEMPT STORAGE            │
│  (In-memory array, not saved to DB yet) │
│                                          │
│  attemptQueue: [                         │
│    { serve, result: 'in_play' },        │
│    { attack P3, result: 'in_play' },    │
│    { attack P4, result: undefined }     │
│  ]                                       │
└──────────────┬──────────────────────────┘
               │
               │ [Point Win/Lost] clicked
               │ → Finalizes result for last attempt
               │ → Packages all attempts
               │
┌──────────────▼──────────────────────────┐
│     MAIN POINT ENTRY SYSTEM              │
│  (Submits complete point to database)   │
│                                          │
│  PointData: {                            │
│    point_number: 42,                    │
│    winning_team: 'opponent',            │
│    action_type: 'Op. Att.',             │
│    opponent_attempts: [...]  ← Attached │
│  }                                       │
└──────────────────────────────────────────┘
```

---

### Data Flow Sequence

**During Rally**:
```
1. Coach records serve → [In-play] → Added to attemptQueue[]
2. Coach records attack #1 → [In-play] → Added to attemptQueue[]
3. Coach records attack #2 → [In-play] → Added to attemptQueue[]
4. Coach records attack #3 → (no [In-play], point ends)
```

**Point Finalization**:
```
5. Coach scrolls to main point entry
6. Coach clicks [Point Lost]
7. Coach selects Action Type: "Op. Att."
   ↓
8. System executes:
   - Checks attemptQueue[]
   - Last attempt in queue has no result set
   - action_type === 'Op. Att.'
   - Sets last_attempt.result = 'kill'
   - Packages all attempts: opponent_attempts = attemptQueue
   - Submits full PointData to database
   - Clears attemptQueue[]
   - Resets opponent tracking module
```

---

### Integration Points

#### 1. State Management

**Opponent Tracking Module State** (component-level):
```typescript
interface OpponentTrackingState {
  // Current input state
  selectedServePosition: number | null;     // 0-4
  selectedServePlayer: string | null;
  selectedHitPosition: string | null;       // 'P1' | 'Pipe' | etc.
  selectedHitPlayer: string | null;
  selectedGridCell: { x: number; y: number } | null;

  // Lock states
  serveDropdownsLocked: boolean;            // True after serve recorded

  // Temporary storage
  attemptQueue: OpponentAttempt[];          // In-memory queue

  // Lineup tracking
  currentLineup: OpponentLineup;            // 6 positions with player IDs
}
```

**Main Point Entry State** (existing):
```typescript
interface PointEntryState {
  pointNumber: number;
  winLoss: 'win' | 'loss';
  actionType: string;
  action: string;
  selectedPlayer: string;
  // ... other existing fields
}
```

**Integration**:
```typescript
function handlePointSubmit() {
  const pointData: PointData = {
    // ... existing fields from PointEntryState
    opponent_attempts: opponentTrackingState.attemptQueue  // ← Attach attempts
  };

  // Finalize last attempt result if needed
  if (pointData.opponent_attempts.length > 0) {
    const lastAttempt = pointData.opponent_attempts[pointData.opponent_attempts.length - 1];
    if (!lastAttempt.result) {
      if (pointData.action_type === 'Op. Att.') {
        lastAttempt.result = 'kill';
      } else if (pointData.action_type === 'Op. Ace') {
        lastAttempt.result = 'ace';
      } else {
        lastAttempt.result = 'in_play';  // Opponent action didn't end point
      }
    }
  }

  // Submit to database
  await savePoint(pointData);

  // Clear opponent tracking
  resetOpponentTracking();
}
```

---

#### 2. Action Type Mapping

**Existing Action Types** (relevant to opponent tracking):
- `"Op. Att."` → Opponent attack (kill)
- `"Op. Ace"` → Opponent ace serve
- `"Op. Blo."` → Opponent block (not tracked in this module)
- `"Att."` → Home team attack (opponent action was 'in_play')
- `"Ace"` → Home team ace (no opponent tracking)

**Result Determination Table**:

| Winning Team | Action Type | Last Attempt Result |
|--------------|-------------|---------------------|
| opponent     | "Op. Att."  | 'kill'              |
| opponent     | "Op. Ace"   | 'ace'               |
| opponent     | "Op. Blo."  | 'in_play' (*)       |
| home         | "Att."      | 'in_play'           |
| home         | "Blo."      | 'in_play'           |
| home         | "Op. Err."  | 'in_play'           |

(*) Block kills not tracked in current module version

---

#### 3. UI Positioning & Scroll Behavior

**Page Layout** (scroll positions):
```
┌─────────────────────────────────┐
│ [0px] Header (fixed)            │ ← Scroll position: top
├─────────────────────────────────┤
│ [60px] Opponent Tracking Module │ ← Always visible
│        (400px height)            │
├─────────────────────────────────┤
│ [460px] Main Point Entry System │ ← Scroll here for submit
│         (600px height)           │
└─────────────────────────────────┘
```

**Scroll Automation**:
```typescript
function scrollToPointEntry() {
  const mainPointEntry = document.getElementById('main-point-entry');
  mainPointEntry.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });
}

// Call when coach clicks final grid cell (no [In-play])
// OR when coach manually clicks "Finish Rally" button
```

---

## Use Cases & Examples

### Use Case 1: Simple Ace

**Scenario**: Opponent #12 serves ace from center position

```
RALLY:
- Opponent #12 serves from center
- Ball lands deep at (2, 0) - center back line
- Home team fails to receive
- POINT LOST

COACH ACTIONS:
1. Click Dropdown 2 (center) → Select #12
2. Click grid cell (2, 0)
3. Do NOT click [In-play] (knows it's an ace)
4. Scroll to main point entry
5. Click [Point Lost]
6. Select Action Type: "Op. Ace"

DATA RESULT:
{
  point_number: 5,
  winning_team: 'opponent',
  action_type: 'Op. Ace',
  opponent_attempts: [
    {
      attempt_number: 1,
      type: 'serve',
      serve_position: 2,
      serve_player_id: 'opp_12',
      landing_grid_x: 2,
      landing_grid_y: 0,
      result: 'ace'
    }
  ]
}
```

---

### Use Case 2: Attack Kill After Good Serve

**Scenario**: Opponent serves, home team receives, opponent kills

```
RALLY:
- Opponent #4 serves from left (dropdown 0)
- Ball lands at (1, 2) - home team receives
- Rally continues, opponent sets to P4
- Opponent #7 hits sharp angle at (0, 4)
- POINT LOST

COACH ACTIONS:
1. Click Dropdown 0 (left) → Select #4
2. Click grid (1, 2)
3. Click [In-play] ✓
   → Serve recorded, dropdowns LOCK
4. (Rally continues...)
5. Click [P4] button
   → Lineup highlights #7
6. Click grid (0, 4)
7. Do NOT click [In-play] (knows it's kill)
8. Scroll to main point entry
9. Click [Point Lost]
10. Select Action Type: "Op. Att."

DATA RESULT:
{
  point_number: 18,
  winning_team: 'opponent',
  action_type: 'Op. Att.',
  opponent_attempts: [
    {
      attempt_number: 1,
      type: 'serve',
      serve_position: 0,
      serve_player_id: 'opp_4',
      landing_grid_x: 1,
      landing_grid_y: 2,
      result: 'in_play'
    },
    {
      attempt_number: 2,
      type: 'attack',
      hit_position: 'P4',
      hit_player_id: 'opp_7',
      landing_grid_x: 0,
      landing_grid_y: 4,
      result: 'kill'
    }
  ]
}
```

---

### Use Case 3: Long Rally (4 Opponent Attacks, Home Wins)

**Scenario**: Extended rally with multiple opponent attacks, home team wins

```
RALLY:
- Opponent #12 serves center → (2, 1) → Home receives
- Opponent #9 attacks P3 → (3, 5) → Home digs
- Opponent #7 attacks P4 → (0, 3) → Home digs
- Opponent #26 attacks P2 → (5, 5) → Home digs
- Opponent #11 attacks P4 → (1, 4) → Home digs
- Home team attacks → Opponent can't dig
- POINT WON

COACH ACTIONS:
1. Dropdown 2 → #12 → Grid (2,1) → [In-play] ✓
2. [P3] → #9 → Grid (3,5) → [In-play] ✓
3. [P4] → #7 → Grid (0,3) → [In-play] ✓
4. [P2] → #26 → Grid (5,5) → [In-play] ✓
5. [P4] → #11 → Grid (1,4) → [In-play] ✓
6. Scroll to main point entry
7. Click [Point Win]
8. Select Action Type: "Att."
9. Select home player

DATA RESULT:
{
  point_number: 35,
  winning_team: 'home',
  action_type: 'Att.',
  home_player: '#11',
  opponent_attempts: [
    { attempt: 1, type: 'serve', position: 2, player: '#12',
      grid: (2,1), result: 'in_play' },
    { attempt: 2, type: 'attack', position: 'P3', player: '#9',
      grid: (3,5), result: 'in_play' },
    { attempt: 3, type: 'attack', position: 'P4', player: '#7',
      grid: (0,3), result: 'in_play' },
    { attempt: 4, type: 'attack', position: 'P2', player: '#26',
      grid: (5,5), result: 'in_play' },
    { attempt: 5, type: 'attack', position: 'P4', player: '#11',
      grid: (1,4), result: 'in_play' }
  ]
}
```
*Note: All opponent attempts marked 'in_play' because home team won*

---

### Use Case 4: Point Lost Without Opponent Attack (Net Violation)

**Scenario**: Opponent attacks, home team touches net during block, point lost

```
RALLY:
- Opponent #9 attacks P3 → (3, 5)
- Home team blocks but touches net
- Referee whistles, point to opponent
- POINT LOST (but not due to opponent kill)

COACH ACTIONS:
1. Click [P3] → #9 → Grid (3,5)
2. Click [In-play] ✓ (wasn't a kill)
3. Scroll to main point entry
4. Click [Point Lost]
5. Select Action Type: "Home Error" or "Net Touch"

DATA RESULT:
{
  point_number: 12,
  winning_team: 'opponent',
  action_type: 'Net Touch',
  opponent_attempts: [
    {
      attempt_number: 1,
      type: 'attack',
      hit_position: 'P3',
      hit_player_id: 'opp_9',
      landing_grid_x: 3,
      landing_grid_y: 5,
      result: 'in_play'  // ← NOT 'kill', because action_type != "Op. Att."
    }
  ]
}
```

---

### Use Case 5: No Opponent Tracking (Home Ace)

**Scenario**: Home team serves ace, opponent never touches ball

```
RALLY:
- Home #5 serves jump serve
- Ball lands in opponent court
- Opponent fails to receive
- POINT WON

COACH ACTIONS:
1. (Does not use opponent tracking module at all)
2. Scroll to main point entry
3. Click [Point Win]
4. Select Action Type: "Ace"
5. Select home player: #5

DATA RESULT:
{
  point_number: 8,
  winning_team: 'home',
  action_type: 'Ace',
  home_player: '#5',
  opponent_attempts: []  // ← Empty array, no tracking
}
```

---

### Use Case 6: Back Row Attack (Pipe Position)

**Scenario**: Opponent runs back row attack from middle back

```
RALLY:
- Home team serves
- Opponent receives and runs quick back row attack
- Opponent #10 (back row player) attacks from Pipe position
- Ball lands at (2, 4) - center, close to net
- POINT LOST

COACH ACTIONS:
1. Click [Pipe] button
   → Lineup highlights #10 (back row middle)
2. Click grid (2, 4)
3. Do NOT click [In-play] (was a kill)
4. Scroll to main point entry
5. Click [Point Lost]
6. Select Action Type: "Op. Att."

DATA RESULT:
{
  point_number: 21,
  winning_team: 'opponent',
  action_type: 'Op. Att.',
  opponent_attempts: [
    {
      attempt_number: 1,
      type: 'attack',
      hit_position: 'Pipe',  // ← Back row attack identifier
      hit_player_id: 'opp_10',
      landing_grid_x: 2,
      landing_grid_y: 4,
      result: 'kill'
    }
  ]
}
```

---

## Implementation Notes

### Technical Requirements

**Frontend**:
- React 18+ with TypeScript
- Component library: Existing UI components
- State management: React Context (extend existing MatchContext)
- Form validation: Required field checking before [In-play] enables
- Responsive design: Optimized for tablet (iPad size)

**Backend**:
- Google Sheets API integration (existing)
- Add `opponent_attempts` column to Points sheet
- Store as JSON string (serialize OpponentAttempt[] array)
- Backward compatible: Empty array `[]` for old points without tracking

**Performance**:
- Module must render in < 100ms
- [In-play] click must save attempt in < 50ms (local state only)
- No API calls during rally (all stored in memory until point ends)
- Final point submission: < 500ms (includes API call)

---

### Component Structure

```
OpponentTrackingModule/
├── OpponentTrackingModule.tsx          // Main container component
├── components/
│   ├── ServeLocationSelector.tsx       // 5 dropdowns for serve position
│   ├── HittingPositionSelector.tsx     // P1, Pipe, P2, P3, P4 buttons
│   ├── LandingGrid.tsx                 // 6×6 grid for ball landing
│   ├── LineupSheet.tsx                 // Opponent lineup display (right panel)
│   └── InPlayButton.tsx                // Large purple "In-play" button
├── hooks/
│   ├── useOpponentTracking.ts          // State management hook
│   ├── useLineupTracking.ts            // Smart lineup auto-update logic
│   └── useAttemptQueue.ts              // Temporary attempt storage
├── types/
│   └── opponentTracking.types.ts       // TypeScript interfaces
└── utils/
    ├── coordinateMapping.ts            // Grid coordinate helpers
    ├── resultDetermination.ts          // Kill/Ace/InPlay logic
    └── lineupCalculations.ts           // Rotation calculation helpers
```

---

### Key Algorithms

#### 1. Smart Lineup Calculation

```typescript
function calculateLineup(
  servingPlayer: Player,
  startingRotation: Player[]
): OpponentLineup {
  // Find serving player's index in starting rotation
  const serverIndex = startingRotation.findIndex(p => p.id === servingPlayer.id);

  // Rotate array so serving player is at position P1 (index 0)
  const currentRotation = rotateArray(startingRotation, serverIndex);

  // Map to court positions
  return {
    P1: currentRotation[0],  // Right back (serving)
    P2: currentRotation[1],  // Right front
    P3: currentRotation[2],  // Middle front
    P4: currentRotation[3],  // Left front
    P5: currentRotation[4],  // Left back
    P6: currentRotation[5]   // Middle back
  };
}
```

---

#### 2. Result Determination

```typescript
function determineAttemptResult(
  attempt: OpponentAttempt,
  pointOutcome: PointData
): 'in_play' | 'kill' | 'ace' {
  // If [In-play] was clicked, result is already set
  if (attempt.result) {
    return attempt.result;
  }

  // Otherwise, determine based on point outcome
  if (pointOutcome.winning_team === 'opponent') {
    if (attempt.type === 'serve' && pointOutcome.action_type === 'Op. Ace') {
      return 'ace';
    } else if (attempt.type === 'attack' && pointOutcome.action_type === 'Op. Att.') {
      return 'kill';
    }
  }

  // Default: rally continued
  return 'in_play';
}
```

---

#### 3. Grid Coordinate Validation

```typescript
function isValidGridCell(x: number, y: number): boolean {
  return x >= 0 && x <= 5 && y >= 0 && y <= 5;
}

function cellToCoordinates(cell: string): { x: number; y: number } {
  // Parse "(2,3)" string format
  const match = cell.match(/\((\d+),(\d+)\)/);
  if (!match) throw new Error('Invalid cell format');

  return {
    x: parseInt(match[1]),
    y: parseInt(match[2])
  };
}
```

---

### Testing Considerations

**Unit Tests**:
- Coordinate mapping functions
- Result determination logic
- Lineup rotation calculations
- Validation rules (one serve per point, required fields)

**Integration Tests**:
- Full workflow: serve + multiple attacks + point finalization
- Module reset after [In-play] and point end
- Serve dropdown locking mechanism
- Data persistence to PointData object

**User Acceptance Tests**:
- Speed test: Record 3-attack rally in < 15 seconds
- Accuracy test: Grid coordinates match actual ball landing zones
- Edge case: Handle missed rotation without breaking
- Recovery: Correct wrong player selection mid-rally

---

### Migration & Backward Compatibility

**Database Changes**:
```sql
-- Add new column to Points table (Google Sheets equivalent)
ALTER TABLE Points ADD COLUMN opponent_attempts TEXT;

-- Default value for existing rows
UPDATE Points
SET opponent_attempts = '[]'
WHERE opponent_attempts IS NULL;
```

**Data Format**:
- Store as JSON string: `"[{...}, {...}]"`
- Empty tracking: `"[]"`
- Parse on read: `JSON.parse(row.opponent_attempts)`

**Backward Compatibility**:
- Old app versions ignore `opponent_attempts` column
- New app versions handle missing column gracefully (default to `[]`)
- No breaking changes to existing point entry workflow

---

### Future Enhancements (Out of Scope for V1)

1. **Heatmap Visualization**: Show color-coded density on 6×6 grid
2. **Pattern Analysis**: Post-game reports on opponent tendencies
3. **Real-time Suggestions**: "Opponent targets zone (0,4) 60% from P4"
4. **Export to Video**: Sync tracking data with match video timestamps
5. **Multi-touch Gestures**: Swipe to record (serve → attack → grid in one motion)
6. **Voice Input**: "Opponent 7, P4, left corner" → auto-records
7. **Advanced Stats**: Kill percentage by zone, attack efficiency by position
8. **Comparison Mode**: Compare opponent patterns vs previous matches

---

## Appendix: Glossary

**Volleyball Terms**:
- **P1-P6**: Positions 1-6 in volleyball rotation (P1=right back, P4=left front, etc.)
- **Pipe**: Back row middle attack position (behind setter)
- **OH**: Outside Hitter (left front position, P4)
- **MB**: Middle Blocker (middle front position, P3)
- **Opp**: Opposite hitter (right front position, P2)
- **Libero**: Defensive specialist who can sub freely for back row players
- **Ace**: Serve that directly wins the point (opponent fails to return)
- **Kill**: Attack that directly wins the point (opponent fails to defend)
- **Rally**: Sequence of play from serve until point ends
- **3-meter line**: Line dividing front court from back court (affects attack rules)

**App-Specific Terms**:
- **Opponent Tracking Module**: The new UI component for recording opponent actions
- **Main Point Entry System**: The existing form for recording point outcomes
- **Attempt**: One serve or attack action by opponent during a point
- **Terminal action**: Action that ends the point (kill, ace, error)
- **Non-terminal action**: Action where rally continues (marked "in_play")
- **Landing grid**: 6×6 grid representing home team's court
- **Lineup sheet**: Visual display of opponent player positions

---

## Document Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-10-29 | Initial specification | AI Assistant |

---

**End of Specification Document**

This document serves as the complete source of truth for implementing the Opponent Tracking Module. All developers, designers, and QA testers should reference this document during implementation.
