# 🏐 IN-GAME TREND: POINT WIN/LOSS COMPLETE STRUCTURE
**Comprehensive UI Input Options & Decision Tree**

---

## 📋 EXECUTIVE SUMMARY

This document maps out **EVERY possible input option** a coach has when recording a point during a volleyball match in the InGame Trend functionality. It shows the complete decision tree from "Point Won" or "Point Lost" through all conditional UI options.

**Purpose**: Define exact UI behavior for React app migration - what dropdowns appear, what options they contain, and when they're shown based on previous selections.

---

## 🎯 DATA STRUCTURE COLLECTED PER POINT

```typescript
interface Point {
  point_number: number;              // Sequential number within set
  winning_team: 'home' | 'opponent'; // Which team won
  action_type: string;               // Main category (e.g., "Sp.", "E.Serve")
  action: string;                    // Subcategory detail
  locationTempo: string;             // Where/how the action happened
  home_player: string;               // Player name (home team)
  opponent_player: string;           // Player name (opponent team)
  score: {
    home: number;
    opponent: number;
  };
  rotation?: string;                 // Optional: current rotation
  timestamp?: string;                // Optional: when recorded
}
```

---

## 🔄 COMPLETE USER FLOW & DECISION TREE

### **Step 1: Win or Loss Selection**

```
┌─────────────────────────────────────┐
│   Did your team win or lose         │
│   this point?                        │
│                                      │
│   [ Point WIN ]  [ Point LOSS ]     │
│                                      │
└─────────────────────────────────────┘
         │                  │
         ↓                  ↓
    WinningTeamIndex    WinningTeamIndex
         = 0                 = 1
         │                  │
         ↓                  ↓
    POINT WIN TREE     POINT LOSS TREE
```

**Component**: `button371`
**Sets**: `WinningTeamIndex.value`
**Logic**:
- WIN → `winning_team = "home"`, shows WIN action categories
- LOSS → `winning_team = "opponent"`, shows LOSS action categories

---

## 🏆 POINT WIN TREE (When Home Team Scores)

### **Step 2A: How did we win the point?**

**Component**: `segmentedControl3` (Action Category)
**Options**: (Based on standard volleyball scoring)

```
┌─────────────────────────────────────┐
│  How did your team win this point?  │
│                                      │
│  ○ Sp.     (Spike/Attack Kill)       │
│  ○ Ser.    (Service Ace)             │
│  ○ Bl.     (Block Kill)               │
│  ○ Op. E.  (Opponent Error)          │
│  ○ Def.    (Defensive Win)           │
│                                      │
└─────────────────────────────────────┘
```

**Detailed Categories**:

#### **Sp. - Spike/Attack Kill**
```
Point won by successful attack/spike that lands in opponent's court

→ Step 3: What type of spike?
   ├─ Hard Spike (power attack)
   ├─ Soft Spike (placement shot)
   ├─ Tip/Dink (soft touch over block)
   ├─ Roll Shot (high arc shot)
   ├─ Wipe Off (hit off opponent's block out)
   └─ Tool (intentionally off block out of bounds)

→ Step 4: Where/how was the attack?
   ├─ P4-High (Outside left, high set)
   ├─ P4-Quick (Outside left, quick set)
   ├─ P3-Quick (Middle, quick set)
   ├─ P3-Slide (Middle, slide attack)
   ├─ P2-High (Right side, high set)
   ├─ P2-Quick (Right side, quick set)
   ├─ Back Row-P1 (Back right attack)
   ├─ Back Row-P6 (Back middle attack)
   ├─ Back Row-P5 (Back left attack)
   ├─ Pipe (Back middle quick)
   └─ D-Ball (Back left high)

→ Step 5: Which player attacked?
   [Dropdown: Home Team Players]
```

#### **Ser. - Service Ace**
```
Point won by serve that lands in bounds without opponent touch

→ Step 3: What type of serve?
   ├─ Jump Serve (aggressive jump)
   ├─ Jump Float (jump with no spin)
   ├─ Standing Float (standing, no spin)
   ├─ Top Spin (standing with spin)
   └─ Short Serve (drop serve)

→ Step 4: Where did serve land?
   ├─ Zone 1 (back right)
   ├─ Zone 2 (front right)
   ├─ Zone 3 (front middle)
   ├─ Zone 4 (front left)
   ├─ Zone 5 (back left)
   ├─ Zone 6 (back middle)
   └─ Deep Corner

→ Step 5: Which player served?
   [Dropdown: Home Team Players]
```

#### **Bl. - Block Kill**
```
Point won by block that returns ball to opponent's floor

→ Step 3: What type of block?
   ├─ Stuff Block (hard direct block down)
   ├─ Soft Block (slower block)
   ├─ Single Block (1 blocker)
   ├─ Double Block (2 blockers)
   └─ Triple Block (3 blockers)

→ Step 4: Where was the block?
   ├─ P2 (right front)
   ├─ P3 (middle front)
   └─ P4 (left front)

→ Step 5: Which player(s) blocked?
   [Dropdown: Home Team Players]
   Note: For multiple blockers, primary blocker
```

#### **Op. E. - Opponent Error**
```
Point won because opponent made an error

→ Step 3: What was the opponent's error?
   ├─ Service Error (serve out/net)
   ├─ Attack Error (hit out/net)
   ├─ Ball Handling Error (lift/double contact)
   ├─ Rotation Error (out of position)
   ├─ Net Violation (touched net)
   ├─ Centerline Violation (foot over)
   ├─ Back Row Attack (illegal attack)
   ├─ 4 Hits (too many touches)
   └─ Other Violation

→ Step 4: Location/Tempo
   ├─ N/A (most errors)
   └─ [Specific location if applicable]

→ Step 5: Which opponent player made error?
   [Dropdown: Opponent Team Players]
```

#### **Def. - Defensive Win**
```
Point won through exceptional defense/dig that leads to counter-attack

→ Step 3: Type of defensive play?
   ├─ Dig to Set (perfect defensive pass)
   ├─ Pancake Save (hand on floor)
   ├─ Diving Dig (full extension)
   ├─ Overpass Win (opponent overpasses, we capitalize)
   └─ Free Ball Conversion (easy ball converted to point)

→ Step 4: Where did the dig occur?
   ├─ P1 (back right)
   ├─ P5 (back left)
   ├─ P6 (back middle)
   └─ Off Court (out of bounds save)

→ Step 5: Which player made the key dig?
   [Dropdown: Home Team Players]
```

---

## 💔 POINT LOSS TREE (When Opponent Scores)

### **Step 2B: How did we lose the point?**

**Component**: `segmentedControl3` (Action Category)
**Options**:

```
┌─────────────────────────────────────┐
│  How did your team lose this point? │
│                                      │
│  ○ E.Serve   (Service Error)         │
│  ○ E.Attack  (Attack Error)          │
│  ○ E.Rec     (Reception Error)       │
│  ○ E.Set     (Setting Error)         │
│  ○ E.Bl      (Block Error)           │
│  ○ E.Def     (Defensive Error)       │
│  ○ E.BH      (Ball Handling Error)   │
│  ○ E.Viol    (Violation)             │
│  ○ Op. Play  (Opponent Successful)   │
│                                      │
└─────────────────────────────────────┘
```

**Detailed Categories**:

#### **E.Serve - Service Error**
```
Lost point due to our serve going out or into net

→ Step 3: What type of serve error?
   ├─ Into Net
   ├─ Long (over end line)
   ├─ Wide Left
   ├─ Wide Right
   ├─ Foot Fault
   └─ Service Order Error

→ Step 4: Location N/A
   └─ N/A

→ Step 5: Which player served?
   [Dropdown: Home Team Players]
```

#### **E.Attack - Attack Error**
```
Lost point due to our attack going out or into net

→ Step 3: What type of attack error?
   ├─ Into Net
   ├─ Long (out back)
   ├─ Wide Left
   ├─ Wide Right
   ├─ Blocked Out (hit opponent's block and out)
   └─ Antenna Touch

→ Step 4: Where was the attack from?
   ├─ P4-High
   ├─ P4-Quick
   ├─ P3-Quick
   ├─ P3-Slide
   ├─ P2-High
   ├─ P2-Quick
   ├─ Back Row-P1
   ├─ Back Row-P6
   ├─ Back Row-P5
   ├─ Pipe
   └─ D-Ball

→ Step 5: Which player attacked?
   [Dropdown: Home Team Players]
```

#### **E.Rec - Reception Error**
```
Lost point due to bad pass on opponent's serve

→ Step 3: What type of reception error?
   ├─ Shanked Pass (poor contact, unplayable)
   ├─ Overpass (passed directly over to opponent)
   ├─ Ace'd (couldn't touch the serve)
   ├─ Out of Bounds Pass
   └─ Net Touch on Receive

→ Step 4: Where was the serve received?
   ├─ Zone 1
   ├─ Zone 2
   ├─ Zone 3
   ├─ Zone 4
   ├─ Zone 5
   └─ Zone 6

→ Step 5: Which player received?
   [Dropdown: Home Team Players]
```

#### **E.Set - Setting Error**
```
Lost point due to bad set

→ Step 3: What type of setting error?
   ├─ Double Contact (illegal set)
   ├─ Lift (illegal set)
   ├─ Over Net (set went over on 2nd touch)
   ├─ Poor Set (unplayable set)
   └─ Out of Rotation

→ Step 4: Location
   └─ N/A

→ Step 5: Which player set?
   [Dropdown: Home Team Players]
```

#### **E.Bl - Block Error**
```
Lost point due to blocking violation

→ Step 3: What type of block error?
   ├─ Net Violation (touched net)
   ├─ Reached Over (illegal block over plane)
   ├─ Back Row Block (illegal back row block)
   ├─ Touched and Out (touched but went out)
   └─ Centerline Violation

→ Step 4: Where was the block attempt?
   ├─ P2
   ├─ P3
   └─ P4

→ Step 5: Which player blocked?
   [Dropdown: Home Team Players]
```

#### **E.Def - Defensive Error**
```
Lost point due to defensive breakdown

→ Step 3: What type of defensive error?
   ├─ Missed Dig (should have gotten it)
   ├─ Poor Dig (shanked defense)
   ├─ Coverage Error (no one covered tip/roll)
   ├─ Positioning Error (out of position)
   └─ Communication Error (collision/both went)

→ Step 4: Where did the ball land?
   ├─ P1
   ├─ P5
   ├─ P6
   ├─ Between Players
   └─ Open Court

→ Step 5: Which player's responsibility?
   [Dropdown: Home Team Players]
```

#### **E.BH - Ball Handling Error**
```
Lost point due to illegal ball contact

→ Step 3: What type of ball handling?
   ├─ Double Contact
   ├─ Lift/Carry
   ├─ Four Hits (too many touches)
   └─ Assisted Hit (illegal assist)

→ Step 4: Location
   └─ N/A

→ Step 5: Which player committed?
   [Dropdown: Home Team Players]
```

#### **E.Viol - Violation**
```
Lost point due to rule violation

→ Step 3: What type of violation?
   ├─ Rotation Error
   ├─ Net Violation
   ├─ Centerline Violation
   ├─ Delay of Game
   ├─ Back Row Attack (illegal)
   ├─ Screening (illegal screen on serve)
   └─ Other

→ Step 4: Location
   └─ N/A

→ Step 5: Which player (if applicable)?
   [Dropdown: Home Team Players or N/A]
```

#### **Op. Play - Opponent Successful Play**
```
Lost point due to opponent's good play (not our error)

→ Step 3: What did opponent do?
   ├─ Spike Kill (opponent attacked successfully)
   ├─ Service Ace (opponent aced us)
   ├─ Block Kill (opponent blocked us)
   ├─ Tip/Dink (opponent soft shot)
   └─ Roll Shot (opponent placement)

→ Step 4: Where did it land on our side?
   ├─ P1 Zone
   ├─ P2 Zone
   ├─ P3 Zone
   ├─ P4 Zone
   ├─ P5 Zone
   ├─ P6 Zone
   └─ Between Players

→ Step 5: Which opponent player scored?
   [Dropdown: Opponent Team Players]
```

---

## 🎨 UI COMPONENT MAPPING

### **Complete Input Flow**:

```
┌────────────────────────────────────────────────────────────────┐
│                  InGame Trend Data Entry Screen                 │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Set Number:  [Dropdown: Set 1, Set 2, Set 3, Set 4, Set 5]   │
│               Component: select40                               │
│                                                                 │
│  Point #: 15              Score: 10-5                          │
│  (auto-incremented)       (auto-calculated)                    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Point Result:                                           │  │
│  │  [ Point WIN ]  [ Point LOSS ]                          │  │
│  │  Component: button371                                    │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Action Category: (Segmented Control)                    │  │
│  │  [conditional based on Win/Loss]                         │  │
│  │  Component: segmentedControl3                            │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Action Detail:  [Dropdown - conditional]                      │
│                  Component: select34                            │
│                                                                 │
│  Location/Tempo: [Dropdown - conditional]                      │
│                  Component: select41                            │
│                                                                 │
│  Player:         [Dropdown - conditional]                      │
│                  Component: select31 (home) or                 │
│                            select35 (opponent)                 │
│                                                                 │
│  [Submit Point]                                                │
│  Component: button372                                          │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## 🔧 CONDITIONAL LOGIC RULES

### **Rule 1: Action Category Options**
```javascript
if (WinningTeamIndex.value === 0) {  // WIN
  showCategories = ["Sp.", "Ser.", "Bl.", "Op. E.", "Def."];
} else {  // LOSS
  showCategories = ["E.Serve", "E.Attack", "E.Rec", "E.Set",
                    "E.Bl", "E.Def", "E.BH", "E.Viol", "Op. Play"];
}
```

### **Rule 2: Action Detail Options**
```javascript
actionDetail.options = ActionTypes.value
  .find(item => item.type === (isWin ? 'Win' : 'Loss'))
  .categories[selectedCategory]
  .subcategories;
```

### **Rule 3: Location/Tempo Options**
```javascript
locationOptions = ActionTypes.value
  .find(item => item.type === (isWin ? 'Win' : 'Loss'))
  .categories[selectedCategory]
  .locationTempo;

if (selectedCategory === "Op. E.") {
  locationOptions = ["N/A", ...locationOptions];
}
```

### **Rule 4: Player Selection**
```javascript
if (winningTeam === "home") {
  playerOptions = availablePlayers.filter(p => p.TeamId === homeTeamId);
} else {
  playerOptions = availablePlayers.filter(p => p.TeamId === opponentTeamId);
}
playerOptions.sort((a, b) => a.PreferredName.localeCompare(b.PreferredName));
```

### **Rule 5: Score Calculation**
```javascript
if (winningTeam === "home") {
  newScore.home = previousScore.home + 1;
  newScore.opponent = previousScore.opponent;
} else {
  newScore.home = previousScore.home;
  newScore.opponent = previousScore.opponent + 1;
}
```

---

## 📊 DATA VALIDATION RULES

### **Required Fields**:
1. ✅ Set Number (select40)
2. ✅ Winning Team (button371 → WinningTeamIndex)
3. ✅ Action Category (segmentedControl3)
4. ✅ Action Detail (select34)
5. ✅ Location/Tempo (select41) - except when N/A
6. ✅ Player (select31 or select35)

### **Optional Fields**:
- Rotation (auto-detected if available)
- Timestamp (auto-generated)
- Notes (if implemented)

### **Validation Logic**:
```javascript
function validatePointEntry(point) {
  if (!point.set_number) return "Set number required";
  if (!point.winning_team) return "Winning team required";
  if (!point.action_type) return "Action category required";
  if (!point.action) return "Action detail required";
  if (!point.locationTempo && point.action_type !== "Op. E.") {
    return "Location/tempo required";
  }
  if (!point.home_player && !point.opponent_player) {
    return "Player selection required";
  }
  return null; // Valid
}
```

---

## 🎯 MIGRATION CHECKLIST FOR REACT APP

### **Components to Build**:

1. **PointEntryForm Component**
   - [ ] Win/Loss button toggle
   - [ ] Dynamic action category selector
   - [ ] Conditional action detail dropdown
   - [ ] Conditional location/tempo dropdown
   - [ ] Conditional player selector
   - [ ] Auto-incrementing point counter
   - [ ] Auto-calculating score display
   - [ ] Submit button with validation

2. **ActionTypes State Management**
   - [ ] Define complete action type hierarchy
   - [ ] Implement Win/Loss category switching
   - [ ] Dynamic option loading based on category
   - [ ] Special handling for "Op. E." and "N/A"

3. **Player Selection Logic**
   - [ ] Filter players by team
   - [ ] Alphabetical sorting
   - [ ] Dynamic team switching

4. **Data Persistence**
   - [ ] Local state management
   - [ ] Set-based data structure
   - [ ] Score tracking per set
   - [ ] Save to backend (Supabase/Firebase)

5. **Validation & Error Handling**
   - [ ] Required field validation
   - [ ] Conditional field validation
   - [ ] User-friendly error messages
   - [ ] Undo/edit functionality

---

## 📝 COMPLETE ACTION TYPE HIERARCHY (To Define)

**Note**: The exact subcategories and location/tempo options need to be defined based on:
1. Your coaching preferences
2. Standard volleyball terminology
3. Level of detail you want to track

**Recommended Approach**:
- Start with common categories (shown in this document)
- Add more detailed subcategories as needed
- Allow custom options for flexibility
- Consider providing "Quick Entry" mode with fewer options for fast-paced games

---

## ✅ SUMMARY

This document provides the **complete structure** for point win/loss data entry including:

✅ **All input fields** and their components
✅ **Complete decision trees** for wins and losses
✅ **Conditional logic** showing what appears when
✅ **Data structure** for storage
✅ **Validation rules** for data quality
✅ **UI component mapping** for implementation
✅ **Migration checklist** for React app

**Status**: ✅ Structure Documented | ⏳ Awaiting Final Action Type Values
**Ready for**: React Component Implementation

