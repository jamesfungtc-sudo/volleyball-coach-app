# Manual Testing Checklist - InGame Stats Feature

## Prerequisites
- Node.js version 20.19+ or 22.12+ installed
- Run `npm run dev` and open browser to `http://localhost:5173/volleyball-coach-app/`
- Navigate to "Stats" page (click Stats in navigation bar)

---

## Test Suite 1: Basic UI Loading

| Test ID | Test Case | Expected Result | Status | Notes |
|---------|-----------|----------------|--------|-------|
| UI-001 | Page loads without errors | Stats page displays with game header | ⬜ |  |
| UI-002 | Check browser console | No errors or warnings | ⬜ |  |
| UI-003 | Game header shows | "Eagles vs Hawks", Set 1, Date visible | ⬜ |  |
| UI-004 | Score display shows | 0-0 initial score | ⬜ |  |
| UI-005 | Set tabs visible | Set 1, Set 2, Set 3 tabs displayed | ⬜ |  |
| UI-006 | Point entry form visible | All form elements render | ⬜ |  |

---

## Test Suite 2: Win Point - Attack (Att.)

| Test ID | Test Case | Steps | Expected Result | Status | Notes |
|---------|-----------|-------|----------------|--------|-------|
| WIN-001 | Home team attack kill | 1. Click "Point WIN"<br>2. Click "Att."<br>3. Select "Hard Spike"<br>4. Select "OH (Line)"<br>5. Select "#1 Amei - OH"<br>6. Click "Add Point" | Score: 1-0<br>Blue point added to list: "Amei Att.Hard Spike (OH (Line))" | ⬜ |  |
| WIN-002 | Location/Tempo required | Same as WIN-001 but skip step 4 | "Add Point" button disabled | ⬜ |  |
| WIN-003 | All locations available | Step 4 dropdown shows | 13 options (6 OH, 4 MB, 3 Oppo) | ⬜ |  |
| WIN-004 | Tip attack | 1. Point WIN<br>2. Att.<br>3. Select "Tip"<br>4. Select "MB (5)"<br>5. Select player<br>6. Add Point | Point shows "Tip (MB (5))" | ⬜ |  |

---

## Test Suite 3: Win Point - Serve (Ser.)

| Test ID | Test Case | Steps | Expected Result | Status | Notes |
|---------|-----------|-------|----------------|--------|-------|
| WIN-005 | Serve ace | 1. Point WIN<br>2. Ser.<br>3. Select "Ace"<br>4. Select "Zone 1"<br>5. Select player<br>6. Add Point | Score increments, shows "Ace (Zone 1)" | ⬜ |  |
| WIN-006 | Serve zones | Check Location/Tempo dropdown | Shows 6 zones (Zone 1-6) | ⬜ |  |

---

## Test Suite 4: Win Point - Block (Blo.)

| Test ID | Test Case | Steps | Expected Result | Status | Notes |
|---------|-----------|-------|----------------|--------|-------|
| WIN-007 | Block kill | 1. Point WIN<br>2. Blo.<br>3. Select "Kill Blocked (on floor)" | Location/Tempo dropdown DOES NOT APPEAR | ⬜ | Critical |
| WIN-008 | Block point complete | Continue from WIN-007<br>4. Select player<br>5. Add Point | Point added without location/tempo | ⬜ |  |

---

## Test Suite 5: Win Point - Opponent Error (Op. E.)

| Test ID | Test Case | Steps | Expected Result | Status | Notes |
|---------|-----------|-------|----------------|--------|-------|
| WIN-009 | Opponent hit out | 1. Point WIN<br>2. Op. E.<br>3. Select "Hit (Out)"<br>4. Select "OH (Cross)"<br>5. Select opponent player "#20 Oriana - S"<br>6. Add Point | Blue text shows "[20 Oriana] Hit (Out) (OH (Cross))" | ⬜ |  |
| WIN-010 | Opponent player selected | Check player dropdown | Shows opponent players (Oriana, etc.) | ⬜ |  |

---

## Test Suite 6: Win Point - Other

| Test ID | Test Case | Steps | Expected Result | Status | Notes |
|---------|-----------|-------|----------------|--------|-------|
| WIN-011 | Free ball error | 1. Point WIN<br>2. Other<br>3. Select "Free Ball Error (FBE)" | Location/Tempo DOES NOT APPEAR | ⬜ | Critical |
| WIN-012 | Other point complete | 4. Select player<br>5. Add Point | Point added without location | ⬜ |  |

---

## Test Suite 7: Loss Point - Opponent Attack (Op. Att.)

| Test ID | Test Case | Steps | Expected Result | Status | Notes |
|---------|-----------|-------|----------------|--------|-------|
| LOSS-001 | Opponent kills | 1. Point LOSS<br>2. Op. Att.<br>3. Select "Hard Spike"<br>4. Select "MB (Quick)"<br>5. Select opponent player<br>6. Add Point | Red text point added, score 1-1 | ⬜ |  |
| LOSS-002 | Location/Tempo shows | Step 4 | Dropdown visible with 13 locations | ⬜ |  |

---

## Test Suite 8: Loss Point - Opponent Ace (Op. Ace)

| Test ID | Test Case | Steps | Expected Result | Status | Notes |
|---------|-----------|-------|----------------|--------|-------|
| LOSS-003 | Opponent ace | 1. Point LOSS<br>2. Op. Ace<br>3. Select "Ace"<br>4. Select "Zone 5"<br>5. Select opponent player<br>6. Add Point | Red point shows "Ace (Zone 5)" | ⬜ |  |

---

## Test Suite 9: Loss Point - Spike Error (Sp. E.)

| Test ID | Test Case | Steps | Expected Result | Status | Notes |
|---------|-----------|-------|----------------|--------|-------|
| LOSS-004 | Spike out | 1. Point LOSS<br>2. Sp. E.<br>3. Select "Out"<br>4. Select "Oppo (Line)"<br>5. Select home player<br>6. Add Point | Red point shows "Out (Oppo (Line))" | ⬜ |  |
| LOSS-005 | Player team correct | Step 5 | Shows home team players | ⬜ |  |

---

## Test Suite 10: Loss Point - Serve Error (Ser. E.)

| Test ID | Test Case | Steps | Expected Result | Status | Notes |
|---------|-----------|-------|----------------|--------|-------|
| LOSS-006 | Serve into net | 1. Point LOSS<br>2. Ser. E.<br>3. Select "NET" | Location/Tempo DOES NOT APPEAR | ⬜ | Critical |
| LOSS-007 | Serve error complete | 4. Select home player<br>5. Add Point | Point added, shows "NET" only | ⬜ |  |

---

## Test Suite 11: Loss Point - Other (Pass Error)

| Test ID | Test Case | Steps | Expected Result | Status | Notes |
|---------|-----------|-------|----------------|--------|-------|
| LOSS-008 | Freeball error | 1. Point LOSS<br>2. Other<br>3. Select "Free Ball Error (FBE)" | Location/Tempo DOES NOT APPEAR | ⬜ | Critical |
| LOSS-009 | Other loss complete | 4. Select player<br>5. Add Point | Point added without location | ⬜ |  |

---

## Test Suite 12: Conditional Logic Validation

**CRITICAL: Location/Tempo Field Visibility**

| Action Type | Should Show Location/Tempo? | Test Status | Notes |
|-------------|----------------------------|-------------|-------|
| Win: Att. | ✅ YES | ⬜ |  |
| Win: Ser. | ✅ YES | ⬜ |  |
| Win: Blo. | ❌ NO | ⬜ | **Critical** |
| Win: Op. E. | ✅ YES | ⬜ |  |
| Win: Other | ❌ NO | ⬜ | **Critical** |
| Loss: Op. Att. | ✅ YES | ⬜ |  |
| Loss: Op. Ace | ✅ YES | ⬜ |  |
| Loss: Sp. E. | ✅ YES | ⬜ |  |
| Loss: Ser. E. | ❌ NO | ⬜ | **Critical** |
| Loss: Other | ❌ NO | ⬜ | **Critical** |

---

## Test Suite 13: Form Validation

| Test ID | Test Case | Steps | Expected Result | Status | Notes |
|---------|-----------|-------|----------------|--------|-------|
| VAL-001 | Empty form submit | Click "Add Point" without any selections | Button disabled (grayed out) | ⬜ |  |
| VAL-002 | Partial form | 1. Point WIN<br>2. Att.<br>3. Try to submit | Button disabled | ⬜ |  |
| VAL-003 | Missing location | Fill all except location/tempo (when required) | Button disabled | ⬜ |  |
| VAL-004 | Complete form | Fill all required fields | Button enabled (clickable) | ⬜ |  |

---

## Test Suite 14: Point-by-Point List Display

| Test ID | Test Case | Steps | Expected Result | Status | Notes |
|---------|-----------|-------|----------------|--------|-------|
| LIST-001 | 3-column layout | Add several points | Layout: Score | Home | Opponent | ⬜ |  |
| LIST-002 | Color coding | Add mix of win/loss | Blue=home win, Red=opponent win, Black=score | ⬜ |  |
| LIST-003 | Reverse order | Add points 1, 2, 3 | Display shows 3, 2, 1 (newest first) | ⬜ |  |
| LIST-004 | Score display | Check left column | Format: "1-0", "1-1", "2-1" | ⬜ |  |
| LIST-005 | Empty state | Before adding any points | Shows "No points recorded" message | ⬜ |  |

---

## Test Suite 15: Undo Functionality

| Test ID | Test Case | Steps | Expected Result | Status | Notes |
|---------|-----------|-------|----------------|--------|-------|
| UNDO-001 | Undo last point | 1. Add point (score 1-0)<br>2. Click "Undo Last" | Score returns to 0-0, point removed | ⬜ |  |
| UNDO-002 | Undo multiple | Add 3 points, undo 3 times | All points removed, score 0-0 | ⬜ |  |
| UNDO-003 | Undo when empty | Click undo with no points | Button disabled or no error | ⬜ |  |
| UNDO-004 | Undo correct point | Add points A, B, C<br>Click undo | Point C removed (not A or B) | ⬜ |  |

---

## Test Suite 16: Set Navigation

| Test ID | Test Case | Steps | Expected Result | Status | Notes |
|---------|-----------|-------|----------------|--------|-------|
| SET-001 | Switch to Set 2 | 1. Add points to Set 1<br>2. Click "Set 2" tab | Empty point list, score 0-0 | ⬜ |  |
| SET-002 | Return to Set 1 | Click "Set 1" tab | Previous points visible | ⬜ |  |
| SET-003 | Independent sets | Add different points to Set 1, 2, 3 | Each set maintains its own data | ⬜ |  |

---

## Test Suite 17: Score Calculation

| Test ID | Test Case | Steps | Expected Result | Status | Notes |
|---------|-----------|-------|----------------|--------|-------|
| SCORE-001 | Home score increment | Add home win point | Home score increases by 1 | ⬜ |  |
| SCORE-002 | Opponent score increment | Add loss point | Opponent score increases by 1 | ⬜ |  |
| SCORE-003 | Accurate count | Add 5 home wins, 3 losses | Score shows 5-3 | ⬜ |  |
| SCORE-004 | Undo updates score | Score 5-3, undo last (opponent) | Score shows 5-2 | ⬜ |  |

---

## Test Suite 18: Responsive Design

| Test ID | Test Case | Viewport | Expected Result | Status | Notes |
|---------|-----------|----------|----------------|--------|-------|
| RESP-001 | iPad landscape | 1024x768 | All elements visible, buttons touchable | ⬜ |  |
| RESP-002 | iPad portrait | 768x1024 | No horizontal scroll, readable text | ⬜ |  |
| RESP-003 | iPhone | 375x667 | Usable on mobile (not primary target) | ⬜ |  |
| RESP-004 | Desktop | 1920x1080 | Layout looks good, not too stretched | ⬜ |  |

---

## Test Suite 19: Touch Targets (iPad Optimization)

| Test ID | Test Case | Element | Expected Result | Status | Notes |
|---------|-----------|---------|----------------|--------|-------|
| TOUCH-001 | Win/Loss toggle | Buttons | Min 60px height, easy to tap | ⬜ |  |
| TOUCH-002 | Action type buttons | Segmented control | Min 44px height | ⬜ |  |
| TOUCH-003 | Dropdowns | Select elements | Large enough for finger tap | ⬜ |  |
| TOUCH-004 | Add Point button | Primary button | Prominent, min 44px height | ⬜ |  |
| TOUCH-005 | Undo buttons | In point list | Tappable without mis-clicks | ⬜ |  |

---

## Test Suite 20: Form Reset Behavior

| Test ID | Test Case | Steps | Expected Result | Status | Notes |
|---------|-----------|-------|----------------|--------|-------|
| RESET-001 | After successful add | 1. Fill form<br>2. Add point<br>3. Check form | All fields reset to default | ⬜ |  |
| RESET-002 | Win/Loss preserved | After adding point | Win/Loss stays same for quick entry | ⬜ |  |
| RESET-003 | Multiple rapid adds | Add 5 points quickly | Each adds correctly, form resets | ⬜ |  |

---

## Critical Issues to Check

**Priority 1 (Blockers):**
- [ ] Location/Tempo MUST NOT show for: Blo., Other (Win), Ser. E., Other (Loss)
- [ ] Location/Tempo MUST show for: Att., Ser., Op. E., Op. Att., Op. Ace, Sp. E.
- [ ] Player team assignment correct (home vs opponent based on action)
- [ ] No TypeScript/console errors

**Priority 2 (Major):**
- [ ] Score calculates correctly
- [ ] Undo works properly
- [ ] Points display in correct color (blue/red)
- [ ] Form validation prevents incomplete submissions

**Priority 3 (Minor):**
- [ ] UI looks polished
- [ ] Touch targets adequate size
- [ ] Responsive on different screens
- [ ] Empty states show appropriate messages

---

## Test Execution Summary

**Date Tested:** __________

**Tested By:** __________

**Browser/Device:** __________

**Results:**
- Total Tests: 60+
- Passed: ______
- Failed: ______
- Blocked: ______

**Critical Bugs Found:**
1.
2.
3.

**Production Readiness:** ⬜ Ready | ⬜ Not Ready

**Notes:**
