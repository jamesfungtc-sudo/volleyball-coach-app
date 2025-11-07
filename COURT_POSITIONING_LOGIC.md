# Court Positioning Logic Documentation

## Overview

This document provides a comprehensive explanation of the court positioning and coordinate calculation logic implemented in the Visual Opponent Tracking feature of the Volleyball Coach App.

---

## Table of Contents

1. [Coordinate System](#coordinate-system)
2. [Player Positions](#player-positions)
3. [Hit Position Detection Algorithm](#hit-position-detection-algorithm)
4. [The X-Axis Inversion Problem](#the-x-axis-inversion-problem)
5. [Serve Zone Calculation](#serve-zone-calculation)
6. [Court Area Detection](#court-area-detection)
7. [Grid System for Heatmaps](#grid-system-for-heatmaps)
8. [Trajectory Analysis](#trajectory-analysis)
9. [Visual Side Restrictions](#visual-side-restrictions)

---

## Coordinate System

### SVG ViewBox

The volleyball court is rendered in an SVG with the following dimensions:

```
ViewBox: 420 × 800 (width × height)
Aspect Ratio: 1:2 (matching regulation volleyball court proportions)
```

### Court Boundaries

```typescript
const COURT_DIMENSIONS = {
  viewBoxWidth: 420,
  viewBoxHeight: 800,

  // Playing surface boundaries
  courtLeft: 30,
  courtRight: 390,
  courtTop: 40,
  courtBottom: 760,
  courtWidth: 360,   // 9 meters in real life
  courtHeight: 720,  // 18 meters in real life

  // Court center (net position)
  netY: 400,  // 50% of viewBox height

  // Attack lines (3 meters from net)
  attackLineTop: 280,     // Opponent side: netY - 120
  attackLineBottom: 520,  // Home side: netY + 120

  // Out-of-bounds zones
  outOfBoundsMargin: 30
};
```

### Scale Factor

```
Real court: 9m × 18m
SVG court: 360px × 720px
Scale: 40 pixels per meter (720px ÷ 18m = 40px/m)
```

This means:
- 3-meter attack line = 120px from net (3m × 40px/m)
- Front court = 0-3m from net (0-120px)
- Back court = 3m+ from net (120px+)

### Critical Y-Coordinates

```
Y = 0    : Top edge of SVG
Y = 40   : Opponent baseline (court start)
Y = 280  : Opponent attack line (3m from net)
Y = 400  : NET (center divider)
Y = 520  : Home attack line (3m from net)
Y = 760  : Home baseline (court end)
Y = 800  : Bottom edge of SVG
```

### Critical X-Coordinates

```
X = 0    : Left edge of SVG
X = 30   : Left court boundary
X = 102  : Left zone (20% of court width from left boundary)
X = 210  : Center (50% of court width)
X = 318  : Right zone (80% of court width from left boundary)
X = 390  : Right court boundary
X = 420  : Right edge of SVG
```

---

## Player Positions

### Volleyball Position System

In volleyball, there are 6 player positions numbered 1-6:

**Position Numbers (Standard Volleyball Notation):**
```
Back Row:
- Position 1 (P1): Back-right
- Position 6 (P6): Back-center
- Position 5 (P5): Back-left

Front Row:
- Position 2 (P2): Front-right
- Position 3 (P3): Front-center / Middle
- Position 4 (P4): Front-left / Outside

Special:
- Pipe: Back row center attack (P6 area)
```

### Position Coordinates

#### Opponent Team Positions (Top Half)

```typescript
OPPONENT_POSITIONS = {
  // Front row (2 meters from net = 80px)
  P4: { x: leftX, y: netY - 80 },      // Front-left
  P3: { x: centerX, y: netY - 80 },    // Front-center
  P2: { x: rightX, y: netY - 80 },     // Front-right

  // Back row (6 meters from net = 240px)
  P5: { x: leftX, y: netY - 240 },     // Back-left
  P6: { x: centerX, y: netY - 240 },   // Back-center
  P1: { x: rightX, y: netY - 240 }     // Back-right
};
```

#### Home Team Positions (Bottom Half)

```typescript
HOME_POSITIONS = {
  // Front row (2 meters from net = 80px)
  P4: { x: leftX, y: netY + 80 },      // Front-left
  P3: { x: centerX, y: netY + 80 },    // Front-center
  P2: { x: rightX, y: netY + 80 },     // Front-right

  // Back row (6 meters from net = 240px)
  P5: { x: leftX, y: netY + 240 },     // Back-left
  P6: { x: centerX, y: netY + 240 },   // Back-center
  P1: { x: rightX, y: netY + 240 }     // Back-right
};
```

Where:
```typescript
const leftX = 102;    // 20% from left boundary (30 + 360 * 0.2)
const centerX = 210;  // 50% from left boundary (30 + 360 * 0.5)
const rightX = 318;   // 80% from left boundary (30 + 360 * 0.8)
```

### Visual Layout

```
            OPPONENT SIDE
╔═══════════════════════════════╗
║  (Y: 160)                     ║  ← Back Row
║    P1         P6         P5   ║
║  (right)   (center)   (left)  ║
║                               ║
║  (Y: 320)                     ║  ← Front Row
║    P2         P3         P4   ║
║  (right)   (center)   (left)  ║
║                               ║
╠═══════════════════════════════╣  ← NET (Y: 400)
║                               ║
║  (Y: 480)                     ║  ← Front Row
║    P4         P3         P2   ║
║  (left)    (center)   (right) ║
║                               ║
║  (Y: 640)                     ║  ← Back Row
║    P5         P6         P1   ║
║  (left)    (center)   (right) ║
║                               ║
╚═══════════════════════════════╝
             HOME SIDE
```

---

## Hit Position Detection Algorithm

### Core Challenge: The X-Axis Inversion Problem

The most critical aspect of hit position detection is understanding that **both teams share the same SVG coordinate space, but face opposite directions**.

### The Algorithm (Step by Step)

```typescript
function calculateHitPosition(x: number, y: number, team: 'home' | 'opponent'): HitPosition {
  // Step 1: Determine if this is a back row attack
  const isBackRow = team === 'opponent'
    ? y < attackLineTop      // Opponent: y < 280
    : y > attackLineBottom;  // Home: y > 520

  // Step 2: Calculate X position as percentage (0-1 from left to right)
  const relativeX = x - courtLeft;  // Remove left margin
  let percentage = relativeX / courtWidth;  // 0-1 scale

  // Step 3: CRITICAL - Determine court side using Y-coordinate
  const isOpponentSide = y < netY;  // y < 400 = opponent side

  // Step 4: INVERT X-axis for opponent side
  if (isOpponentSide) {
    percentage = 1 - percentage;  // Mirror the X coordinate
  }

  // Step 5: Map percentage to position zones
  if (isBackRow && percentage >= 0.375 && percentage <= 0.625) {
    return 'Pipe';  // Center back row attack
  }

  if (percentage < 0.33) {
    // Left zone (0-33%)
    return isBackRow ? 'P5' : 'P4';
  } else if (percentage < 0.67) {
    // Center zone (33-67%)
    return 'P3';
  } else {
    // Right zone (67-100%)
    return isBackRow ? 'P1' : 'P2';
  }
}
```

### Why Y-Coordinate Determines Inversion

The key insight: **Use Y-coordinate (not team parameter) to determine which side we're on.**

```
Reasoning:
1. Both teams exist in the same SVG space
2. Y-coordinate tells us which physical side of the court
3. Y < 400 (netY) = opponent side = needs inversion
4. Y > 400 (netY) = home side = no inversion
```

### Example Calculations

#### Example 1: Opponent P4 Attack

```
Input: x = 318, y = 320, team = 'opponent'
Step 1: isBackRow = (320 < 280) = false → FRONT ROW
Step 2: relativeX = 318 - 30 = 288
        percentage = 288 / 360 = 0.8 (80%)
Step 3: isOpponentSide = (320 < 400) = true
Step 4: percentage = 1 - 0.8 = 0.2 (20%) ← INVERTED
Step 5: 0.2 < 0.33 → LEFT ZONE
        Front row → P4 ✓

Result: P4 (Front-left from opponent's perspective)
```

#### Example 2: Home P2 Attack

```
Input: x = 318, y = 480, team = 'home'
Step 1: isBackRow = (480 > 520) = false → FRONT ROW
Step 2: relativeX = 318 - 30 = 288
        percentage = 288 / 360 = 0.8 (80%)
Step 3: isOpponentSide = (480 < 400) = false
Step 4: NO INVERSION (home side)
Step 5: 0.8 > 0.67 → RIGHT ZONE
        Front row → P2 ✓

Result: P2 (Front-right from home's perspective)
```

#### Example 3: Opponent Pipe Attack

```
Input: x = 210, y = 200, team = 'opponent'
Step 1: isBackRow = (200 < 280) = true → BACK ROW
Step 2: relativeX = 210 - 30 = 180
        percentage = 180 / 360 = 0.5 (50%)
Step 3: isOpponentSide = (200 < 400) = true
Step 4: percentage = 1 - 0.5 = 0.5 (50%) ← INVERTED (stays center)
Step 5: Back row AND (0.5 >= 0.375 AND 0.5 <= 0.625) → PIPE ✓

Result: Pipe (Back-center attack)
```

### Position Zone Mapping

```
After X-axis inversion (if needed):

0%                    33%              67%                   100%
├─────────────────────┼────────────────┼─────────────────────┤
│      LEFT ZONE      │   CENTER ZONE  │     RIGHT ZONE      │
│                     │                │                     │
│  Front: P4          │   Front: P3    │     Front: P2       │
│  Back:  P5          │   Back:  Pipe  │     Back:  P1       │
└─────────────────────┴────────────────┴─────────────────────┘
```

---

## The X-Axis Inversion Problem

### Why Inversion is Necessary

Both teams exist in the same SVG coordinate space, but they face opposite directions:

```
PROBLEM:
Physical court layout (bird's eye view):
  Opponent's LEFT (P4) = Physical RIGHT side of screen
  Opponent's RIGHT (P2) = Physical LEFT side of screen

  Home's LEFT (P4) = Physical LEFT side of screen
  Home's RIGHT (P2) = Physical RIGHT side of screen
```

### Solution: Y-Based Conditional Inversion

```typescript
// Use Y-coordinate to determine which side of net
const isOpponentSide = y < netY;  // y < 400

// Invert X percentage for opponent side
if (isOpponentSide) {
  percentage = 1 - percentage;  // Mirror across center
}
```

### Why Not Use `team` Parameter?

Initially, we might think to use the `team` parameter:
```typescript
// ❌ WRONG APPROACH
if (team === 'opponent') {
  percentage = 1 - percentage;
}
```

**Problem:** This assumes the trajectory starts from the correct side. But the function needs to work regardless of where the trajectory actually starts (for validation purposes).

**Correct Approach:** Use the actual Y-coordinate to determine which side we're on, independent of which team is supposed to be attacking.

### Visual Demonstration

```
Without inversion (raw SVG coordinates):
┌─────────────────────────────────┐
│ X: 318 (80%) → Shows as "right" │  Opponent side
│ But opponent's "right" is P2    │
│ Should be P4 (their left)! ❌   │
├─────────────────────────────────┤  NET
│ X: 318 (80%) → Shows as "right" │  Home side
│ Home's "right" is P2 ✓          │
└─────────────────────────────────┘

With Y-based inversion:
┌─────────────────────────────────┐
│ X: 318 → 1-0.8 = 0.2 (20%)      │  Opponent side (inverted)
│ 20% = left zone = P4 ✓          │
├─────────────────────────────────┤  NET
│ X: 318 → 0.8 (80%)              │  Home side (not inverted)
│ 80% = right zone = P2 ✓         │
└─────────────────────────────────┘
```

---

## Serve Zone Calculation

### Zone Layout

The serving area is divided into 5 zones:

```
        OPPONENT COURT
┌───────────────────────────┐
│                           │
│                           │
│                           │
│                           │
│                           │
│                           │
├───────────────────────────┤ ← NET
│                           │
│                           │
│                           │
│         Landing           │
│          Zones            │
│                           │
├───┬───┬───┬───┬───────────┤ ← Attack Line
│ 1 │ 2 │ 3 │ 4 │ 5         │
└───┴───┴───┴───┴───────────┘
        SERVING AREA
```

### Algorithm

```typescript
function calculateServeZone(x: number, y: number): ServeZone | null {
  // Must be in serving area (beyond attack line on home side)
  if (y <= attackLineBottom) return null;

  // Calculate X percentage
  const relativeX = x - courtLeft;
  const percentage = relativeX / courtWidth;

  // Map to zones (equal 20% divisions)
  if (percentage < 0.2) return 1;
  if (percentage < 0.4) return 2;
  if (percentage < 0.6) return 3;
  if (percentage < 0.8) return 4;
  return 5;
}
```

### Zone Boundaries

```
Zone 1: 0-20%   (X: 30-102)
Zone 2: 20-40%  (X: 102-174)
Zone 3: 40-60%  (X: 174-246)
Zone 4: 60-80%  (X: 246-318)
Zone 5: 80-100% (X: 318-390)
```

---

## Court Area Detection

### Front Court vs Back Court

```typescript
function calculateCourtArea(y: number): 'front' | 'back' {
  // Opponent side
  if (y < netY) {
    return y < attackLineTop ? 'back' : 'front';
  }
  // Home side
  else {
    return y > attackLineBottom ? 'back' : 'front';
  }
}
```

### Visual Representation

```
Y = 40  ─────────────────  Opponent baseline
          BACK COURT
          (Y: 40-280)
Y = 280 ═════════════════  Opponent attack line
         FRONT COURT
          (Y: 280-400)
Y = 400 █████████████████  NET
         FRONT COURT
          (Y: 400-520)
Y = 520 ═════════════════  Home attack line
          BACK COURT
          (Y: 520-760)
Y = 760 ─────────────────  Home baseline
```

---

## Grid System for Heatmaps

### 6×6 Grid

The court is divided into a 6×6 grid (36 cells) for heatmap visualization:

```typescript
function calculateGridCell(x: number, y: number): { row: number; col: number } {
  const relativeX = x - courtLeft;
  const relativeY = y - courtTop;

  const col = Math.floor((relativeX / courtWidth) * 6);  // 0-5
  const row = Math.floor((relativeY / courtHeight) * 6); // 0-5

  return {
    row: Math.min(Math.max(row, 0), 5),  // Clamp to 0-5
    col: Math.min(Math.max(col, 0), 5)   // Clamp to 0-5
  };
}
```

### Grid Layout

```
Opponent Side:
┌─────┬─────┬─────┬─────┬─────┬─────┐
│ 0,0 │ 0,1 │ 0,2 │ 0,3 │ 0,4 │ 0,5 │  Row 0
├─────┼─────┼─────┼─────┼─────┼─────┤
│ 1,0 │ 1,1 │ 1,2 │ 1,3 │ 1,4 │ 1,5 │  Row 1
├─────┼─────┼─────┼─────┼─────┼─────┤
│ 2,0 │ 2,1 │ 2,2 │ 2,3 │ 2,4 │ 2,5 │  Row 2
╞═════╪═════╪═════╪═════╪═════╪═════╡  ← NET
│ 3,0 │ 3,1 │ 3,2 │ 3,3 │ 3,4 │ 3,5 │  Row 3
├─────┼─────┼─────┼─────┼─────┼─────┤
│ 4,0 │ 4,1 │ 4,2 │ 4,3 │ 4,4 │ 4,5 │  Row 4
├─────┼─────┼─────┼─────┼─────┼─────┤
│ 5,0 │ 5,1 │ 5,2 │ 5,3 │ 5,4 │ 5,5 │  Row 5
└─────┴─────┴─────┴─────┴─────┴─────┘
Home Side

Each cell: 60px × 120px (1.5m × 3m in real life)
```

---

## Trajectory Analysis

### Complete Analysis Function

```typescript
function analyzeTrajectory(
  startX: number, startY: number,
  endX: number, endY: number,
  team: 'home' | 'opponent',
  actionType: 'serve' | 'attack' | 'block' | 'dig',
  startInBounds: boolean,
  endInBounds: boolean
): TrajectoryAnalysis {
  // 1. Hit position (for attacks only, uses START coordinates)
  const hitPosition = actionType === 'attack'
    ? calculateHitPosition(startX, startY, team)
    : undefined;

  // 2. Serve zone (uses END coordinates - where ball lands)
  const serveZone = actionType === 'serve'
    ? calculateServeZone(endX, endY)
    : undefined;

  // 3. Landing area
  const landingArea = calculateCourtArea(endY);

  // 4. Grid position (uses END coordinates)
  const gridCell = calculateGridCell(endX, endY);

  // 5. Distance calculation
  const distance = calculateDistance(startX, startY, endX, endY);

  // 6. Angle calculation
  const angle = calculateAngle(startX, startY, endX, endY);

  // 7. Speed classification
  const speed = classifySpeed(distance);

  return {
    hitPosition,
    serveZone,
    landingArea,
    gridCell,
    distance,
    angle,
    speed,
    startInBounds,
    endInBounds
  };
}
```

### Important Notes

1. **Hit Position**: Uses START coordinates (where attack originates)
2. **Serve Zone**: Uses END coordinates (where ball lands)
3. **Landing Area**: Uses END Y-coordinate
4. **Grid Cell**: Uses END coordinates (landing position)

### Speed Classification

```typescript
function classifySpeed(distance: number): 'short' | 'medium' | 'long' {
  if (distance < 200) return 'short';   // Tips, short attacks
  if (distance < 400) return 'medium';  // Normal attacks
  return 'long';                         // Deep attacks, serves
}
```

---

## Visual Side Restrictions

### Purpose

Prevent users from accidentally drawing trajectories from the wrong side of the court while maintaining flexibility for the ball to cross the net.

### Implementation

```typescript
const disabledSide: 'home' | 'opponent' | null = useMemo(() => {
  // No restriction if no player selected
  if (!selectedTeam) return null;

  // Once user starts drawing, remove overlay (ball can cross net)
  if (isDragging || currentTrajectory) return null;

  // Before drawing: restrict the starting side
  // Opponent player → disable home side
  // Home player → disable opponent side
  return selectedTeam === 'opponent' ? 'home' : 'opponent';
}, [selectedTeam, isDragging, currentTrajectory]);
```

### Behavior Flow

```
1. User selects opponent player
   ↓
   [Home side dimmed with overlay: "HOME SIDE - Cannot draw here"]
   ↓
2. User clicks on opponent side to start drawing
   ↓
   [Overlay disappears immediately - isDragging becomes true]
   ↓
3. User drags across net to home side
   ↓
   [Full court visible - ball can land anywhere]
   ↓
4. User releases to complete trajectory
   ↓
   [Overlay stays hidden - currentTrajectory exists]
   ↓
5. User clicks "Clear" or "Reselect Player"
   ↓
   [Overlay returns - back to step 1]
```

### Why This Design?

**Problem to solve:** In volleyball, players attack from their own side, but the ball must land on the opponent's side to score. We need to:
1. Guide users to start from the correct side
2. Allow the trajectory to cross to the other side (realistic)
3. Prevent accidental errors

**Solution:** Visual guidance before drawing, freedom during and after drawing.

### Visual Overlay

```tsx
{disabledSide && (
  <g>
    {/* Semi-transparent overlay */}
    <rect
      x={courtLeft}
      y={disabledSide === 'opponent' ? courtTop : netY}
      width={courtWidth}
      height={disabledSide === 'opponent'
        ? (netY - courtTop)
        : (courtBottom - netY)}
      fill="rgba(0, 0, 0, 0.5)"
      pointerEvents="none"
    />

    {/* Warning text */}
    <text>
      {disabledSide === 'opponent' ? 'OPPONENT SIDE' : 'HOME SIDE'}
    </text>
    <text>Cannot draw here</text>
  </g>
)}
```

---

## Summary

### Key Takeaways

1. **Coordinate System**: 420×800 SVG viewBox with 40px/meter scale
2. **Critical Lines**: Net at y=400, attack lines at y=280 and y=520
3. **X-Axis Inversion**: Use Y-coordinate to determine side, invert X for opponent
4. **Hit Position**: 6 positions (P1-P5, Pipe) based on front/back + left/center/right
5. **Serve Zones**: 5 equal zones in serving area
6. **Grid System**: 6×6 cells for heatmap generation
7. **Visual Restrictions**: Guide starting point, allow ball to cross net

### Why This Matters for Coaches

This positioning logic enables:
- **Accurate opponent scouting**: Track where attacks originate and land
- **Pattern recognition**: Identify tendencies by position and rotation
- **Strategic planning**: Understand opponent's preferred positions and zones
- **Data-driven decisions**: Use heatmaps and statistics for game planning

### Code Location

- **Coordinate calculations**: `src/features/inGameStats/components/VisualTracking/coordinateCalculations.ts`
- **Position definitions**: `src/features/inGameStats/components/VisualTracking/positions.ts`
- **Court rendering**: `src/features/inGameStats/components/VisualTracking/VolleyballCourt.tsx`
- **Main implementation**: `src/pages/VisualTrackingPage.tsx`

---

## Version History

- **v1.0** (2025-11-07): Initial implementation with Phase 6 features
  - Coordinate calculation system
  - Hit position detection with X-axis inversion
  - Visual side restrictions
  - Trajectory analysis integration
