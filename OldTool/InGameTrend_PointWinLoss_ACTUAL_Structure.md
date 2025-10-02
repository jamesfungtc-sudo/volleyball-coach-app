# 🏐 IN-GAME TREND: POINT WIN/LOSS **ACTUAL** STRUCTURE
**Based on Real ActionTypes Data from Retool App**

---

## 📋 EXECUTIVE SUMMARY

This document contains the **EXACT input options** from your OldTool Retool application's ActionTypes state variable. These are the real categories, subcategories, and location/tempo options used in production.

**Source**: Retool `ActionTypes` state default value

---

## 🏆 POINT WIN CATEGORIES (When Home Team Scores)

### **Win Categories (5 total)**:

```
┌─────────────────────────────────────┐
│  How did your team win this point?  │
│                                      │
│  ○ Att.    (Attack)                  │
│  ○ Ser.    (Serve)                   │
│  ○ Blo.    (Block)                   │
│  ○ Op. E.  (Opponent Error)          │
│  ○ Other   (Other)                   │
│                                      │
└─────────────────────────────────────┘
```

---

## 📊 WIN: COMPLETE OPTION BREAKDOWN

### **1. Att. - Attack (Sp.)**

**Subcategories** (4 options):
- Hard Spike
- Tip/Roll
- Touch Out
- Setter Dump

**Location/Tempo** (13 options):
- OH (Line)
- OH (Cross)
- Oppo (Line)
- Oppo (Cross)
- MB (A)
- MB (B)
- MB (C)
- MB (Slide)
- MB (2)
- Back Row - Pipe
- Back Row - P1
- 2nd Tempo
- Other

**Player Selection**: Home team players

---

### **2. Ser. - Serve (Ser.)**

**Subcategories** (2 options):
- Ace (On floor)
- Ace (Touch)

**Location/Tempo** (6 options):
- Zone P1
- Zone P2
- Zone P3
- Zone P4
- Zone P5
- Zone P6

**Player Selection**: Home team players (server)

---

### **3. Blo. - Block (Blo.)**

**Subcategories** (3 options):
- Kill Blocked (on floor)
- Kill Blocked (with touches)
- Overpass kill

**Location/Tempo**: ❌ NONE (no locationTempo field)

**Player Selection**: Home team players (blocker)

---

### **4. Op. E. - Opponent Error (Op. E.)**

**Subcategories** (7 options):
- Ser (Net)
- Ser (Out)
- Hit (Net)
- Hit (Out)
- Setting error
- Ball handling
- Other fault

**Location/Tempo** (13 options):
- OH (Line)
- OH (Cross)
- Oppo (Line)
- Oppo (Cross)
- MB (A)
- MB (B)
- MB (C)
- MB (Slide)
- MB (2)
- Back Row - Pipe
- Back Row - P1
- 2nd Tempo
- Other

**Player Selection**: Opponent team players (who made error)

---

### **5. Other - Other**

**Subcategories** (2 options):
- Referee decision
- Others

**Location/Tempo**: ❌ NONE (no locationTempo field)

**Player Selection**: Optional (may be N/A)

---

## 💔 POINT LOSS CATEGORIES (When Opponent Scores)

### **Loss Categories (5 total)**:

```
┌─────────────────────────────────────┐
│  How did your team lose this point? │
│                                      │
│  ○ Op. Att.  (Opponent Attack)       │
│  ○ Op. Ace   (Opponent Ace)          │
│  ○ Sp. E.    (Spike Error)           │
│  ○ Ser. E.   (Serve Error)           │
│  ○ Other     (Pass Error/Other)      │
│                                      │
└─────────────────────────────────────┘
```

---

## 📊 LOSS: COMPLETE OPTION BREAKDOWN

### **1. Op. Att. - Op. Play (Opponent Attack)**

**Subcategories** (5 options):
- Hard Spike
- Tip/Roll
- Tool/Block Out
- Setter Dump
- Other

**Location/Tempo** (13 options):
- OH (Line)
- OH (Cross)
- Oppo (Line)
- Oppo (Cross)
- MB (A)
- MB (B)
- MB (C)
- MB (Slide)
- MB (2)
- Back Row - Pipe
- Back Row - P1
- 2nd Tempo
- Other

**Player Selection**: Opponent team players (who attacked)

---

### **2. Op. Ace - Op. Ace (Opponent Service Ace)**

**Subcategories** (2 options):
- Ace (on floor)
- Ace (with Touch)

**Location/Tempo** (6 options):
- Zone 1 (Deep)
- Zone 2 (Short)
- Zone 3 (Short)
- Zone 4 (Short)
- Zone 5 (Deep)
- Zone 6 (Deep)

**Player Selection**: Opponent team players (who served)

---

### **3. Sp. E. - Sp. E. (Spike Error)**

**Subcategories** (7 options):
- Hit (NET)
- Hit (OUT)
- Use (NET)
- Use (OUT)
- Kill Blocked (on floor)
- Kill Blocked (with touches)
- Foot fault

**Location/Tempo** (13 options):
- OH (Line)
- OH (Cross)
- Oppo (Line)
- Oppo (Cross)
- MB (A)
- MB (B)
- MB (C)
- MB (Slide)
- MB (2)
- Back Row - Pipe
- Back Row - P1
- 2nd Tempo
- Other

**Player Selection**: Home team players (who made error)

---

### **4. Ser. E. - Ser. E. (Serve Error)**

**Subcategories** (4 options):
- NET
- OUT
- Foot fault
- 8 sec.

**Location/Tempo**: ❌ NONE (no locationTempo field)

**Player Selection**: Home team players (who served)

---

### **5. Other - Pass E. (Pass Error/Other)**

**Subcategories** (8 options):
- Ball Handling
- Block error
- Setting error
- Net touch
- Line fault
- Mis-judged
- Referee decision
- Other

**Location/Tempo**: ❌ NONE (no locationTempo field)

**Player Selection**: Home team players (who made error)

---

## 🎯 COMPLETE DATA STRUCTURE

```typescript
interface ActionTypes {
  type: 'Win' | 'Loss';
  categories: {
    [key: string]: {
      category: string;
      subcategories: string[];
      locationTempo?: string[];  // Optional - not all categories have this
    }
  }
}
```

### **ActionTypes State (Actual)**:

```javascript
ActionTypes.value = [
  {
    type: 'Win',
    categories: {
      'Att.': {
        category: 'Attack (Sp.)',
        subcategories: ['Hard Spike', 'Tip/Roll', 'Touch Out', 'Setter Dump'],
        locationTempo: ['OH (Line)', 'OH (Cross)', 'Oppo (Line)', 'Oppo (Cross)',
                        'MB (A)', 'MB (B)', 'MB (C)', 'MB (Slide)', 'MB (2)',
                        'Back Row - Pipe', 'Back Row - P1', '2nd Tempo', 'Other']
      },
      'Ser.': {
        category: 'Serve (Ser.)',
        subcategories: ['Ace (On floor)', 'Ace (Touch)'],
        locationTempo: ['Zone P1', 'Zone P2', 'Zone P3', 'Zone P4', 'Zone P5', 'Zone P6']
      },
      'Blo.': {
        category: 'Block (Blo.)',
        subcategories: ['Kill Blocked (on floor)', 'Kill Blocked (with touches)', 'Overpass kill']
        // No locationTempo
      },
      'Op. E.': {
        category: 'Opponent Error (Op. E.)',
        subcategories: ['Ser (Net)', 'Ser (Out)', 'Hit (Net)', 'Hit (Out)',
                        'Setting error', 'Ball handling', 'Other fault'],
        locationTempo: ['OH (Line)', 'OH (Cross)', 'Oppo (Line)', 'Oppo (Cross)',
                        'MB (A)', 'MB (B)', 'MB (C)', 'MB (Slide)', 'MB (2)',
                        'Back Row - Pipe', 'Back Row - P1', '2nd Tempo', 'Other']
      },
      'Other': {
        category: 'Other',
        subcategories: ['Referee decision', 'Others']
        // No locationTempo
      }
    }
  },
  {
    type: 'Loss',
    categories: {
      'Op. Att.': {
        category: 'Op. Play',
        subcategories: ['Hard Spike', 'Tip/Roll', 'Tool/Block Out', 'Setter Dump', 'Other'],
        locationTempo: ['OH (Line)', 'OH (Cross)', 'Oppo (Line)', 'Oppo (Cross)',
                        'MB (A)', 'MB (B)', 'MB (C)', 'MB (Slide)', 'MB (2)',
                        'Back Row - Pipe', 'Back Row - P1', '2nd Tempo', 'Other']
      },
      'Op. Ace': {
        category: 'Op. Ace',
        subcategories: ['Ace (on floor)', 'Ace (with Touch)'],
        locationTempo: ['Zone 1 (Deep)', 'Zone 2 (Short)', 'Zone 3 (Short)',
                        'Zone 4 (Short)', 'Zone 5 (Deep)', 'Zone 6 (Deep)']
      },
      'Sp. E.': {
        category: 'Sp. E.',
        subcategories: ['Hit (NET)', 'Hit (OUT)', 'Use (NET)', 'Use (OUT)',
                        'Kill Blocked (on floor)', 'Kill Blocked (with touches)', 'Foot fault'],
        locationTempo: ['OH (Line)', 'OH (Cross)', 'Oppo (Line)', 'Oppo (Cross)',
                        'MB (A)', 'MB (B)', 'MB (C)', 'MB (Slide)', 'MB (2)',
                        'Back Row - Pipe', 'Back Row - P1', '2nd Tempo', 'Other']
      },
      'Ser. E.': {
        category: 'Ser. E.',
        subcategories: ['NET', 'OUT', 'Foot fault', '8 sec.']
        // No locationTempo
      },
      'Other': {
        category: 'Pass E.',
        subcategories: ['Ball Handling', 'Block error', 'Setting error', 'Net touch',
                        'Line fault', 'Mis-judged', 'Referee decision', 'Other']
        // No locationTempo
      }
    }
  }
]
```

---

## 🎨 UI FLOW WITH ACTUAL OPTIONS

### **Example: Winning Point by Attack**

```
Step 1: User clicks [ Point WIN ]
   ↓
Step 2: Segmented Control shows:
   [ Att. | Ser. | Blo. | Op. E. | Other ]
   User selects: Att.
   ↓
Step 3: Dropdown shows subcategories:
   [ Hard Spike | Tip/Roll | Touch Out | Setter Dump ]
   User selects: Hard Spike
   ↓
Step 4: Dropdown shows location/tempo:
   [ OH (Line) | OH (Cross) | Oppo (Line) | Oppo (Cross) |
     MB (A) | MB (B) | MB (C) | MB (Slide) | MB (2) |
     Back Row - Pipe | Back Row - P1 | 2nd Tempo | Other ]
   User selects: OH (Line)
   ↓
Step 5: Dropdown shows players:
   [ Player 1 | Player 2 | Player 3 | ... ]
   (filtered by home team)
   User selects: Player 5
   ↓
Data saved:
{
  winning_team: "home",
  action_type: "Att.",
  action: "Hard Spike",
  locationTempo: "OH (Line)",
  home_player: "Player 5",
  ...
}
```

---

## 🔍 KEY INSIGHTS

### **Categories WITHOUT Location/Tempo**:
1. **Win**: Blo., Other
2. **Loss**: Ser. E., Other

These categories should NOT show the location/tempo dropdown.

### **Naming Conventions**:
- **Category keys**: `Att.`, `Ser.`, `Blo.`, `Op. E.`, `Other`, `Op. Att.`, `Op. Ace`, `Sp. E.`, `Ser. E.`
- **Display names**: Use the `category` field for UI display
- **Abbreviations**: Keep consistent (NET, OUT, etc.)

### **Location/Tempo Patterns**:
- **Attack locations**: OH (Line/Cross), Oppo (Line/Cross), MB (A/B/C/Slide/2), Back Row
- **Serve zones**: Zone 1-6 or Zone P1-P6
- **Depth indicators**: Deep vs Short for opponent serves

---

## ✅ IMPLEMENTATION CHECKLIST

### **React Component Structure**:

```typescript
// ActionTypes constant (from Retool state)
export const ACTION_TYPES = [/* paste actual data above */];

// Component logic
const [winLoss, setWinLoss] = useState<'Win' | 'Loss'>(null);
const [category, setCategory] = useState<string>(null);
const [subcategory, setSubcategory] = useState<string>(null);
const [locationTempo, setLocationTempo] = useState<string>(null);
const [player, setPlayer] = useState<string>(null);

// Get available categories based on Win/Loss
const categories = ACTION_TYPES.find(t => t.type === winLoss)?.categories;

// Get subcategories for selected category
const subcategories = categories?.[category]?.subcategories || [];

// Get location/tempo options (if exists)
const locationTempoOptions = categories?.[category]?.locationTempo || null;

// Conditional rendering
{locationTempoOptions && (
  <Select
    options={locationTempoOptions}
    value={locationTempo}
    onChange={setLocationTempo}
  />
)}
```

---

## 📝 ABBREVIATION GUIDE

| Abbreviation | Full Name | Context |
|--------------|-----------|---------|
| Att. | Attack | Win category |
| Ser. | Serve | Win/Loss category |
| Blo. | Block | Win category |
| Op. E. | Opponent Error | Win category |
| Op. Att. | Opponent Attack | Loss category |
| Op. Ace | Opponent Ace | Loss category |
| Sp. E. | Spike Error | Loss category |
| Ser. E. | Serve Error | Loss category |
| OH | Outside Hitter | Position/location |
| Oppo | Opposite | Position |
| MB | Middle Blocker | Position |

---

## ✅ STATUS

**Data Source**: ✅ Actual Retool ActionTypes state
**Completeness**: ✅ 100% - All categories, subcategories, and locations documented
**Ready for**: ✅ Direct implementation in React app

This is the **definitive source** for implementing the InGame Trend point entry UI!

