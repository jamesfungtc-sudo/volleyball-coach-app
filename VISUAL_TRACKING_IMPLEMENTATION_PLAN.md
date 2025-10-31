# Visual Opponent Tracking - Implementation Plan

## Document Info
- **Version**: 1.0
- **Date**: 2025-10-31
- **Status**: Implementation Ready
- **Approach**: Step-by-step, systematic build

---

## Design Decisions (Finalized)

### Key Clarifications from User:

1. **Serve vs Attack Determination:**
   - ✅ Auto-calculate from drawing start point (behind baseline = serve)
   - ✅ ALSO use game metadata (serving team, point outcomes) for validation
   - ✅ Right panel controls confirm/override if needed

2. **Serve Zone Calculation:**
   - ✅ Auto-calculate from startX coordinate (divide court into 5 zones)
   - ✅ Use raw coordinates directly for statistics

3. **Hit Position Calculation:**
   - ✅ Auto-calculate from start coordinates
   - ✅ **Must differentiate front court vs back court using 3-meter line**
   - ✅ Court dimensions: Net → 3m line = front court, 3m line → baseline = back court

4. **Player Display:**
   - ✅ Show ALL 12 players (6 home + 6 opponent)
   - ✅ Single court with ONE net in middle
   - ✅ Use prototype court background (orange playing surface, light blue out zones)
   - ✅ Players displayed as clickable elements (not buttons - circles with numbers)

5. **Rotation & Substitution:**
   - ✅ Rotation logic needed (players rotate clockwise after side-out)
   - ✅ Substitution control in right panel (after player selected)
   - ✅ Complex logic - implement in later phase

---

## Implementation Phases (10 Phases)

### 🟢 **PHASE 1: Page Structure & Layout** (Foundation)
**Goal:** Create page skeleton with correct landscape layout, no scrolling

**Tasks:**
1. Create `/src/pages/VisualTrackingPage.tsx`
2. Set up 2-column CSS Grid layout (60% court / 40% panel)
3. Force landscape orientation (CSS + warning for portrait)
4. Ensure no scrolling (height: 100vh, overflow: hidden)
5. Add navigation route in App.tsx
6. Create placeholder sections (header, court, panel)

**Deliverables:**
- ✅ Page loads at `/in-game-stats/:matchId/visual-tracking`
- ✅ Layout fills entire iPad screen in landscape
- ✅ No scrolling
- ✅ Placeholder boxes for all major sections

**Testing:**
- Open page on iPad (landscape mode)
- Verify no scrollbar appears
- Check all sections visible without scrolling

**Time Estimate:** 1-2 hours

---

### 🟢 **PHASE 2: SVG Court Rendering** (Visual Foundation)
**Goal:** Render volleyball court with correct dimensions, lines, and zones

**Tasks:**
1. Create `/src/components/VisualTracking/VolleyballCourt.tsx`
2. Port SVG court from prototype (420×800 viewBox)
3. Render court elements:
   - Out-of-bounds zones (light blue #4a9fb8)
   - Playing surface (orange #d4956c)
   - Net line (center, white)
   - 3-meter attack lines (dashed white) ← **CRITICAL for front/back court**
   - Baseline labels
4. Add court dimensions as constants:
   ```typescript
   const COURT = {
     viewBoxWidth: 420,
     viewBoxHeight: 800,
     courtLeft: 30,
     courtRight: 390,
     courtTop: 40,
     courtBottom: 760,
     netY: 400,           // Center line
     attackLineTop: 160,  // 3m from net (top side)
     attackLineBottom: 640 // 3m from net (bottom side)
   };
   ```

**Deliverables:**
- ✅ Court renders with correct aspect ratio (1:2)
- ✅ All lines visible (net, attack lines, boundaries)
- ✅ Colors match prototype (orange court, blue out-zones)
- ✅ 3-meter lines clearly marked (for front/back court logic)

**Testing:**
- Measure distances (3m lines should be at correct positions)
- Verify colors match prototype
- Check responsiveness (court scales properly)

**Time Estimate:** 2-3 hours

---

### 🟢 **PHASE 3: Player Positioning System** (Interactive Elements)
**Goal:** Display 12 player circles on court at volleyball rotation positions

**Tasks:**
1. Create `/src/components/VisualTracking/PlayerMarker.tsx`
   - Circle with jersey number inside
   - Size: 32px diameter (small, non-obstructive)
   - Click handler
2. Define volleyball position coordinates:
   ```typescript
   const POSITIONS = {
     // Opponent side (top half)
     opponent: {
       P4: { x: 80, y: 200 },   // Front-left
       P3: { x: 210, y: 200 },  // Front-center
       P2: { x: 340, y: 200 },  // Front-right
       P5: { x: 80, y: 320 },   // Back-left
       P6: { x: 210, y: 320 },  // Back-center
       P1: { x: 340, y: 320 }   // Back-right
     },
     // Home side (bottom half)
     home: {
       P4: { x: 80, y: 600 },
       P3: { x: 210, y: 600 },
       P2: { x: 340, y: 600 },
       P5: { x: 80, y: 480 },
       P6: { x: 210, y: 480 },
       P1: { x: 340, y: 480 }
     }
   };
   ```
3. Create player lineup state (6 home + 6 opponent)
4. Render 12 PlayerMarker components at positions
5. Add visual states:
   - Default: White circle, black text
   - Hover: Blue border
   - Selected: Blue fill, white text
   - Faded: 30% opacity (when another player selected)

**Deliverables:**
- ✅ 12 player circles visible on court
- ✅ Each shows jersey number
- ✅ Positioned at correct volleyball rotations
- ✅ Click changes visual state (not functional yet)

**Testing:**
- Click each player → circle highlights
- Verify positions match volleyball rotation diagram
- Check opponent vs home sides are correct

**Time Estimate:** 3-4 hours

---

### 🟢 **PHASE 4: Drawing System (Core Interaction)**
**Goal:** Enable trajectory drawing on court after player selected

**Tasks:**
1. Port drawing logic from prototype:
   - `getCoordinates()` - SVG coordinate transformation
   - Touch/mouse event handlers
   - Arrow rendering functions
2. Add drawing state management:
   ```typescript
   interface DrawingState {
     selectedPlayer: Player | null;
     isDrawingMode: boolean;  // True after player selected
     isDragging: boolean;      // True while drawing
     currentTrajectory: TrajectoryData | null;
   }
   ```
3. Implement drawing workflow:
   - **State A:** Player selection mode (all 12 circles visible)
   - **State B:** Drawing mode (circles fade to 10% opacity, drawing enabled)
   - **State C:** Trajectory finalized (arrow visible, waiting for action)
4. Add trajectory rendering:
   - Preview arrow (red, thin, while dragging)
   - Finalized arrow (blue, thick, after release)
   - Start/end point circles (green if in-bounds, red if out)
5. Prevent drawing until player selected

**Deliverables:**
- ✅ Click player → drawing mode activates
- ✅ Draw trajectory (click-drag-release) → arrow appears
- ✅ Arrow color changes (red preview → blue final)
- ✅ Players fade during drawing (clear canvas)
- ✅ In/out bounds detection works

**Testing:**
- Select player #7 → drawing enabled
- Draw trajectory from back court to front court → blue arrow appears
- Draw trajectory out-of-bounds → end point red
- Try drawing without selecting player → blocked (error message)

**Time Estimate:** 4-5 hours

---

### 🟢 **PHASE 5: Right Panel - Action Bar** (Controls)
**Goal:** Show action controls after player selected

**Tasks:**
1. Create `/src/components/VisualTracking/ActionBar.tsx`
2. Design action bar layout:
   ```
   ┌─────────────────────────┐
   │ #7 Selected             │
   │ [🔄 Reselect Player]   │
   ├─────────────────────────┤
   │ Action Type:            │
   │ • Attack (default)      │
   │ ○ Serve                 │
   │ ○ Block                 │
   │ ○ Dig                   │
   ├─────────────────────────┤
   │ [Substitution]          │
   └─────────────────────────┘
   ```
3. Add conditional rendering:
   - Show only when player selected
   - Hide when no selection
4. Add action type toggle:
   - Default: Attack
   - Click to change to Serve/Block/Dig
   - Store in state
5. Add reselect button:
   - Click → return to player selection mode
   - Clear current trajectory
   - Show all player circles again

**Deliverables:**
- ✅ Action bar appears when player clicked
- ✅ Shows selected player number
- ✅ Action type buttons work (toggle selection)
- ✅ Reselect button returns to player selection mode

**Testing:**
- Click player → action bar appears
- Click different action types → selection changes
- Click reselect → back to player selection mode
- No player selected → action bar hidden

**Time Estimate:** 2-3 hours

---

### 🟢 **PHASE 6: Coordinate-Based Logic (Intelligence)**
**Goal:** Auto-calculate serve zones, hit positions, front/back court

**Tasks:**
1. Create `/src/utils/coordinateCalculations.ts`
2. Implement serve zone calculator:
   ```typescript
   function calculateServeZone(startX: number, startY: number): number | null {
     // Check if behind baseline (serve)
     if (startY < COURT.courtTop || startY > COURT.courtBottom) {
       // Divide court width into 5 zones
       const zoneWidth = (COURT.courtRight - COURT.courtLeft) / 5;
       const zone = Math.floor((startX - COURT.courtLeft) / zoneWidth);
       return Math.max(0, Math.min(4, zone)); // Clamp 0-4
     }
     return null; // Not a serve
   }
   ```
3. Implement hit position calculator:
   ```typescript
   function calculateHitPosition(
     startX: number,
     startY: number,
     isOpponent: boolean
   ): HitPosition | null {
     const attackLineY = isOpponent
       ? COURT.attackLineTop
       : COURT.attackLineBottom;

     const netY = COURT.netY;

     // Determine front court vs back court
     const isFrontCourt = isOpponent
       ? startY > netY && startY < attackLineY
       : startY > attackLineY && startY < netY;

     // Calculate horizontal position
     const leftThird = COURT.courtLeft + (COURT.courtRight - COURT.courtLeft) / 3;
     const rightThird = COURT.courtRight - (COURT.courtRight - COURT.courtLeft) / 3;

     if (isFrontCourt) {
       // Front row: P4, P3, P2
       if (startX < leftThird) return 'P4';
       if (startX < rightThird) return 'P3';
       return 'P2';
     } else {
       // Back row: P1, Pipe
       if (startX < leftThird) return 'P1';
       if (startX < rightThird) return 'Pipe';
       return 'P1'; // Right back row (also P1)
     }
   }
   ```
4. Implement in/out bounds check:
   ```typescript
   function isInBounds(x: number, y: number): boolean {
     return (
       x >= COURT.courtLeft &&
       x <= COURT.courtRight &&
       y >= COURT.courtTop &&
       y <= COURT.courtBottom
     );
   }
   ```
5. Implement grid cell calculator (for statistics):
   ```typescript
   function trajectoryToGridCell(
     endX: number,
     endY: number
   ): { x: number; y: number } {
     if (!isInBounds(endX, endY)) {
       return { x: -1, y: -1 }; // Out-of-bounds marker
     }

     const normalizedX = (endX - COURT.courtLeft) / (COURT.courtRight - COURT.courtLeft);
     const normalizedY = (endY - COURT.courtTop) / (COURT.courtBottom - COURT.courtTop);

     return {
       x: Math.floor(normalizedX * 6),
       y: Math.floor(normalizedY * 6)
     };
   }
   ```
6. Add coordinate validation:
   - Check if serve detection matches serving team metadata
   - Warn if inconsistency detected

**Deliverables:**
- ✅ Drawing from behind baseline → auto-detects as serve
- ✅ Drawing from front court → auto-detects as attack (front row)
- ✅ Drawing from back court → auto-detects as attack (back row)
- ✅ Serve zone calculated (0-4)
- ✅ Hit position calculated (P1/Pipe/P2/P3/P4)
- ✅ Grid cell calculated for statistics

**Testing:**
- Draw serve from left → zone 0
- Draw serve from center → zone 2
- Draw serve from right → zone 4
- Draw attack from front-left → P4
- Draw attack from front-center → P3
- Draw attack from back-center → Pipe
- Verify 3-meter line logic correct

**Time Estimate:** 4-5 hours

---

### 🟢 **PHASE 7: Attempt Queue & Data Model** (State Management)
**Goal:** Save attempts to queue, prepare for point submission

**Tasks:**
1. Create data model:
   ```typescript
   interface VisualAttempt {
     attempt_number: number;
     player_id: string;
     player_number: string;
     team: 'home' | 'opponent';

     // Action
     action_type: 'serve' | 'attack' | 'block' | 'dig';

     // Coordinates (raw)
     trajectory: {
       startX: number;
       startY: number;
       endX: number;
       endY: number;
       startInBounds: boolean;
       endInBounds: boolean;
     };

     // Calculated fields
     serve_zone?: number;         // 0-4 (if serve)
     hit_position?: HitPosition;  // P1-P4/Pipe (if attack)
     landing_grid_x: number;      // 0-5 (for stats)
     landing_grid_y: number;      // 0-5 (for stats)

     // Result (determined later)
     result: 'in_play' | 'kill' | 'ace' | 'error';
     timestamp: number;
   }
   ```
2. Create context:
   ```typescript
   interface VisualTrackingState {
     // Player selection
     selectedPlayer: Player | null;
     selectedTeam: 'home' | 'opponent' | null;

     // Drawing
     drawingMode: boolean;
     currentTrajectory: TrajectoryData | null;

     // Action
     selectedActionType: 'serve' | 'attack' | 'block' | 'dig';

     // Queue
     attemptQueue: VisualAttempt[];
     currentAttemptNumber: number;

     // Lineup
     homeLineup: PlayerLineup;
     opponentLineup: PlayerLineup;
   }
   ```
3. Implement actions:
   - `SELECT_PLAYER`
   - `SET_ACTION_TYPE`
   - `START_DRAWING`
   - `UPDATE_TRAJECTORY`
   - `FINALIZE_TRAJECTORY`
   - `SAVE_ATTEMPT` (add to queue)
   - `UNDO_LAST`
   - `CLEAR_QUEUE`
   - `RESET_FOR_NEW_POINT`
4. Add "In-Play" button logic:
   - Validate: player selected + trajectory drawn
   - Calculate all derived fields (zone, position, grid)
   - Create VisualAttempt object
   - Add to attemptQueue
   - Reset selections (return to player selection mode)
   - Increment attempt counter

**Deliverables:**
- ✅ Context provider wraps page
- ✅ Attempts saved to queue
- ✅ Multiple attempts per point supported
- ✅ Data structure complete (coordinates + calculated fields)
- ✅ Queue persists until point submitted

**Testing:**
- Record serve → save to queue → attempt #1
- Record attack → save to queue → attempt #2
- Record attack → save to queue → attempt #3
- Verify queue has 3 attempts
- Check all fields calculated correctly

**Time Estimate:** 3-4 hours

---

### 🟢 **PHASE 8: Right Panel - Stats Display** (Information)
**Goal:** Show live match stats and current point info

**Tasks:**
1. Create `/src/components/VisualTracking/StatsPanel.tsx`
2. Display current match info:
   ```
   ┌─────────────────────────┐
   │ SCORE                   │
   │ Eagles: 15              │
   │ Hawks:  9               │
   ├─────────────────────────┤
   │ SET 1                   │
   │ Serving: Eagles         │
   ├─────────────────────────┤
   │ CURRENT POINT           │
   │ Attempts Recorded: 2    │
   │ - Serve (in-play)       │
   │ - Attack (in-play)      │
   └─────────────────────────┘
   ```
3. Connect to MatchContext:
   - Get current score (home/opponent)
   - Get current set number
   - Get serving team
4. Show attempt history for current point:
   - List each saved attempt
   - Show type, result, player number
5. Add visual indicators:
   - Serving team highlighted
   - Attempt types color-coded

**Deliverables:**
- ✅ Stats panel shows current score
- ✅ Shows serving team
- ✅ Lists attempts for current point
- ✅ Updates in real-time as attempts added

**Testing:**
- Verify score matches MatchContext
- Add attempt → see it appear in stats panel
- Check serving team indicator correct

**Time Estimate:** 2-3 hours

---

### 🟢 **PHASE 9: Point Submission Integration** (Data Flow)
**Goal:** Connect visual tracking to main point entry system

**Tasks:**
1. Add "End Point" button in right panel:
   - Shows after at least 1 attempt recorded
   - Opens point result modal
2. Create point result modal:
   ```
   ┌─────────────────────────┐
   │ Point Result            │
   ├─────────────────────────┤
   │ Winner:                 │
   │ ○ Home (Eagles)         │
   │ • Opponent (Hawks)      │
   ├─────────────────────────┤
   │ Winning Action:         │
   │ • Kill                  │
   │ ○ Ace                   │
   │ ○ Opponent Error        │
   ├─────────────────────────┤
   │ [Cancel] [Submit Point] │
   └─────────────────────────┘
   ```
3. On submit:
   - Update last attempt result (kill/ace/error)
   - Create PointData object:
     ```typescript
     const point: PointData = {
       point_number: currentSetData.length + 1,
       winning_team: selectedWinner,
       action_type: winningAction,
       action: winningAction,
       home_score: newHomeScore,
       opponent_score: newOpponentScore,
       opponent_attempts: attemptQueue, // All visual attempts
       timestamp: Date.now()
     };
     ```
   - Dispatch to MatchContext
   - Save to Google Sheets
   - Reset visual tracking state
   - Return to player selection mode
4. Handle serving team logic:
   - If opponent scored → opponent serves next
   - If home scored → home serves next
   - Update serving indicator

**Deliverables:**
- ✅ "End Point" button appears after attempts recorded
- ✅ Modal shows point result options
- ✅ Submit saves point with all visual attempts
- ✅ Data flows to MatchContext correctly
- ✅ Serving team updates automatically

**Testing:**
- Record 3 attempts → click "End Point"
- Select winner + action → submit
- Verify point saved in MatchContext
- Check opponent_attempts array has 3 items
- Verify serving team switched (if needed)

**Time Estimate:** 3-4 hours

---

### 🟡 **PHASE 10: Rotation Logic (Complex)** (Advanced Features)
**Goal:** Auto-rotate players after side-out

**Tasks:**
1. Create rotation rules:
   ```typescript
   function rotateClockwise(lineup: PlayerLineup): PlayerLineup {
     return {
       P1: lineup.P6,
       P2: lineup.P1,
       P3: lineup.P2,
       P4: lineup.P3,
       P5: lineup.P4,
       P6: lineup.P5
     };
   }
   ```
2. Trigger rotation after point:
   - Check if side-out occurred (serving team changed)
   - If yes, rotate receiving team clockwise
   - Update lineup state
   - Re-render player positions
3. Add manual rotation controls (right panel):
   - "Rotate Home ↻" button
   - "Rotate Opponent ↻" button
   - Override auto-rotation if needed
4. Add rotation history (undo):
   - Track rotation changes
   - Allow undo if mistake made
5. Handle substitution:
   - "Substitute" button (after player selected)
   - Show bench players
   - Swap player in lineup
   - Update position on court

**Deliverables:**
- ✅ Players auto-rotate after side-out
- ✅ Manual rotation buttons work
- ✅ Substitution changes player in position
- ✅ Rotation history for undo

**Testing:**
- Point ends with side-out → verify team rotates
- Click manual rotate → verify positions shift
- Substitute player → verify new player appears at position

**Time Estimate:** 5-6 hours (complex logic)

---

## File Structure (Final)

```
src/
├── pages/
│   └── VisualTrackingPage.tsx          [PHASE 1]
│       └── VisualTrackingPage.css
├── components/
│   └── VisualTracking/
│       ├── VolleyballCourt.tsx         [PHASE 2]
│       ├── PlayerMarker.tsx            [PHASE 3]
│       ├── TrajectoryArrow.tsx         [PHASE 4]
│       ├── ActionBar.tsx               [PHASE 5]
│       ├── StatsPanel.tsx              [PHASE 8]
│       ├── ControlPanel.tsx            [PHASE 9]
│       └── PointResultModal.tsx        [PHASE 9]
├── context/
│   └── VisualTrackingContext.tsx       [PHASE 7]
├── utils/
│   ├── coordinateCalculations.ts       [PHASE 6]
│   ├── rotationLogic.ts                [PHASE 10]
│   └── svgHelpers.ts                   [PHASE 4]
├── types/
│   └── visualTracking.types.ts         [PHASE 7]
└── constants/
    └── courtDimensions.ts              [PHASE 2]
```

---

## Testing Strategy (Per Phase)

### Unit Tests (Optional, but recommended)
- `coordinateCalculations.test.ts` - Test zone/position calculations
- `rotationLogic.test.ts` - Test rotation rules

### Integration Tests
- Player selection → drawing → save attempt (full flow)
- Multiple attempts → point submission → data in MatchContext

### Manual Testing Checklist
- [ ] Page loads without errors
- [ ] Court renders correctly (lines, colors, dimensions)
- [ ] 12 players visible at correct positions
- [ ] Click player → drawing mode activates
- [ ] Draw trajectory → arrow appears
- [ ] Coordinates calculated correctly (zone, position, grid)
- [ ] Action bar shows after player selected
- [ ] Save attempt → queue updates
- [ ] Multiple attempts work (3+ per point)
- [ ] Stats panel shows current data
- [ ] End point → modal appears
- [ ] Submit point → data saved to MatchContext
- [ ] Rotation works after side-out
- [ ] No scrolling on iPad landscape
- [ ] Touch events work smoothly

---

## Timeline Estimate

| Phase | Description | Hours | Cumulative |
|-------|-------------|-------|------------|
| 1 | Page Structure & Layout | 2 | 2h |
| 2 | SVG Court Rendering | 3 | 5h |
| 3 | Player Positioning | 4 | 9h |
| 4 | Drawing System | 5 | 14h |
| 5 | Action Bar | 3 | 17h |
| 6 | Coordinate Logic | 5 | 22h |
| 7 | Attempt Queue | 4 | 26h |
| 8 | Stats Panel | 3 | 29h |
| 9 | Point Submission | 4 | 33h |
| 10 | Rotation Logic | 6 | 39h |
| **TOTAL** | | **39 hours** | |

**Breakdown by Week:**
- **Week 1:** Phases 1-4 (Foundation + Drawing) = 14 hours
- **Week 2:** Phases 5-7 (Controls + Logic) = 12 hours
- **Week 3:** Phases 8-10 (Integration + Advanced) = 13 hours

**Realistic Timeline:** 3-4 weeks (part-time work)

---

## Dependencies & Prerequisites

### Required Before Starting:
- [x] MatchContext exists (for score, set data)
- [x] Google Sheets API connected (for saving points)
- [x] Opponent roster loaded (for player data)
- [x] Prototype court SVG code available

### External Libraries:
- React 18+
- TypeScript 4.9+
- No additional dependencies needed (pure SVG rendering)

---

## Risk Mitigation

### Potential Issues:

1. **Coordinate Miscalculation**
   - Risk: Front/back court logic incorrect
   - Mitigation: Test with real volleyball court diagram, validate 3m line position
   - Phase: 6

2. **Rotation Logic Bugs**
   - Risk: Players rotate incorrectly, out of sync
   - Mitigation: Manual override buttons, rotation undo
   - Phase: 10

3. **Touch Event Performance**
   - Risk: Drawing feels laggy on iPad
   - Mitigation: RequestAnimationFrame, debounce, React.memo
   - Phase: 4

4. **Data Consistency**
   - Risk: Attempts not syncing with MatchContext
   - Mitigation: Thorough integration testing
   - Phase: 9

5. **Orientation Lock**
   - Risk: Page unusable in portrait mode
   - Mitigation: CSS warning message, encourage landscape
   - Phase: 1

---

## Success Criteria (Definition of Done)

### Phase 1-4 (MVP - Core Drawing):
- ✅ Coach can select player and draw trajectory
- ✅ Arrow appears on court
- ✅ Coordinates calculated correctly

### Phase 5-7 (MVP - Data Capture):
- ✅ Multiple attempts can be recorded per point
- ✅ All metadata captured (zone, position, grid, bounds)
- ✅ Attempts stored in queue

### Phase 8-9 (MVP - Integration):
- ✅ Point can be submitted with all attempts
- ✅ Data flows to MatchContext and Google Sheets
- ✅ Stats display updates correctly

### Phase 10 (P1 - Advanced):
- ✅ Rotation works automatically after side-out
- ✅ Substitution feature functional
- ✅ Manual rotation override available

---

## Go/No-Go Decision Points

**After Phase 4:** Evaluate drawing system
- Is drawing smooth enough? (< 50ms latency)
- Are coordinates accurate?
- Decision: Continue or refine drawing

**After Phase 6:** Evaluate coordinate logic
- Are zones/positions calculated correctly?
- Does front/back court detection work?
- Decision: Continue or fix calculations

**After Phase 9:** Evaluate full workflow
- Can coach complete full point entry?
- Is data quality acceptable?
- Decision: Launch MVP or add Phase 10

---

## Next Steps

1. **User Approval:** Review this plan, approve approach
2. **Start Phase 1:** Create page structure and layout
3. **Iterative Build:** Complete each phase, test, move to next
4. **Weekly Check-ins:** Review progress, adjust plan if needed

---

**Plan Status:** ✅ Ready for Implementation

**User Sign-Off:** _________________________

**Date:** 2025-10-31
