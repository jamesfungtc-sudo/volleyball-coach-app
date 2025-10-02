# Quick Start Guide: InGame Stats Implementation

**For Frontend Developer Agent**
**Last Updated:** 2025-10-01

---

## Getting Started

### 1. Read These Documents (in order)

1. **IMPLEMENTATION_PLAN_InGameStats.md** (main plan) - READ FIRST
2. **OldTool/InGameTrend_PointWinLoss_ACTUAL_Structure.md** - Exact data structure
3. **OldTool/InGameTrend_COMPLETE_REBUILD_SPEC.md** - UI specification
4. **OldTool/InGameTrend_DATABASE_Architecture.md** - Database schema

### 2. Phase 1 Checklist (Week 1)

**Before you start coding:**
- [ ] Read all documentation files above
- [ ] Review current `src/pages/StatsPage.jsx`
- [ ] Understand the ACTION_TYPES structure
- [ ] Familiarize with project structure

**TypeScript Setup:**
```bash
npm install -D typescript @types/react @types/react-dom
```

**Create these files first:**
1. `src/types/inGameStats.types.ts` - All TypeScript types
2. `src/constants/actionTypes.ts` - ACTION_TYPES constant (copy from docs)
3. `src/features/inGameStats/` - Directory structure

**Verification:**
```bash
npm run type-check  # Should pass with no errors
```

---

## Phase Implementation Order

### Phase 1: Foundation (Week 1)
**Focus:** Types, constants, directory structure
**Key Deliverable:** TypeScript types and ACTION_TYPES constant
**Acceptance:** TypeScript compiles without errors

### Phase 2: Point Entry (Week 2-3)
**Focus:** Build the decision tree form UI
**Key Deliverable:** Working point entry form with validation
**Acceptance:** Can add a point through all 5 steps

### Phase 3: Statistics (Week 4-5)
**Focus:** Point list view and summary stats
**Key Deliverable:** Point-by-point list with color coding
**Acceptance:** List displays correctly, stats calculate

### Phase 4: Database (Week 6-7)
**Focus:** Supabase integration
**Key Deliverable:** Real database persistence
**Acceptance:** Points save to Supabase, real-time updates work

---

## Critical Requirements

### Must-Have Features

1. **Point Entry Decision Tree**
   - Win/Loss toggle → Category → Subcategory → Location/Tempo (conditional) → Player
   - Location/Tempo ONLY shows for: Att., Ser., Op. Att., Op. Ace, Sp. E.
   - Location/Tempo HIDDEN for: Blo., Other, Ser. E.

2. **Point List Display**
   - 3 columns: Score (black) | Home Action (blue) | Opponent Action (red)
   - Reverse chronological order (newest first)
   - Virtual scrolling for 100+ points

3. **Statistics Dashboard**
   - 3 summary stats: Opponent Errors, Aces, Attacks
   - 8 charts in 2x4 grid layout
   - All charts use consistent player colors

4. **Performance**
   - Point entry response: <100ms
   - Statistics calculation: <500ms
   - Chart rendering: <500ms total

---

## Key Code Patterns

### 1. Conditional Location/Tempo Logic

```typescript
// From formHelpers.ts
export function shouldShowLocationTempo(
  winLoss: 'Win' | 'Loss' | null,
  category: string | null
): boolean {
  if (!winLoss || !category) return false;

  const categoryData = ACTION_TYPES
    .find(t => t.type === winLoss)
    ?.categories[category];

  return !!categoryData?.locationTempo;
}
```

### 2. Point Text Formatting

```typescript
// Home team wins
function formatHomeAction(point: PointData): string {
  if (point.winning_team !== 'home') return '';

  // Example: "Amei Ser.Ace (On floor)"
  if (point.action_type === 'Ser.') {
    return `${point.home_player_name} ${point.action_type}${point.action_category}`;
  }

  // Example: "[20 Oriana] Setting error" (opponent error)
  if (point.action_type === 'Op. E.') {
    return `[${jerseyNumber} ${opponent_name}] ${point.action_category}`;
  }

  return point.action_category;
}
```

### 3. Statistics Calculation (Memoized)

```typescript
export const useStatistics = (points: PointData[]) => {
  return useMemo(() => ({
    summary: calculateSummaryStats(points),
    hitVsAce: {
      home: calculateHitVsAce(points, 'home'),
      opponent: calculateHitVsAce(points, 'opponent')
    },
    // ... more calculations
  }), [points]);
};
```

---

## Common Pitfalls to Avoid

### 1. ACTION_TYPES Structure
**WRONG:**
```typescript
// Don't hardcode subcategories
const subcategories = ['Hard Spike', 'Tip/Roll'];
```

**RIGHT:**
```typescript
// Always derive from ACTION_TYPES constant
const categoryData = ACTION_TYPES.find(t => t.type === winLoss)
  ?.categories[selectedCategory];
const subcategories = categoryData?.subcategories || [];
```

### 2. Showing Location/Tempo
**WRONG:**
```typescript
// Don't show for all categories
{selectedCategory && <LocationTempoDropdown />}
```

**RIGHT:**
```typescript
// Only show when locationTempo exists in ACTION_TYPES
{shouldShowLocationTempo(winLoss, category) && <LocationTempoDropdown />}
```

### 3. Point List Color Coding
**WRONG:**
```typescript
// Don't use static colors
<div style={{ color: 'blue' }}>{homeAction}</div>
```

**RIGHT:**
```typescript
// Use conditional rendering and CSS classes
<div className={`home-action ${point.winning_team === 'home' ? 'visible' : 'hidden'}`}>
  {point.winning_team === 'home' && formatHomeAction(point)}
</div>
```

---

## Testing Requirements

### Unit Tests (Priority 1)
- [ ] `statsCalculations.test.ts` - All calculation functions
- [ ] `formValidation.test.ts` - Form validation logic
- [ ] `formHelpers.test.ts` - shouldShowLocationTempo, etc.

### Integration Tests (Priority 2)
- [ ] `PointEntryForm.integration.test.tsx` - Full workflow
- [ ] `StatisticsDashboard.integration.test.tsx` - Data flow

### E2E Tests (Priority 3)
- [ ] `inGameStats.spec.ts` - Complete match recording

**Run tests:**
```bash
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests
npm run test:e2e         # End-to-end tests
npm run test:coverage    # Coverage report
```

---

## File Creation Order

**Week 1 (Foundation):**
1. `src/types/inGameStats.types.ts`
2. `src/constants/actionTypes.ts`
3. `src/features/inGameStats/utils/formHelpers.ts`
4. `src/features/inGameStats/utils/formValidation.ts`

**Week 2 (Point Entry Components):**
5. `src/features/inGameStats/components/WinLossToggle.tsx`
6. `src/features/inGameStats/components/SegmentedControl.tsx`
7. `src/features/inGameStats/components/ConditionalDropdown.tsx`
8. `src/features/inGameStats/components/PlayerSelector.tsx`
9. `src/features/inGameStats/components/PointEntryForm.tsx`

**Week 3 (Point List):**
10. `src/features/inGameStats/components/PointRow.tsx`
11. `src/features/inGameStats/components/PointByPointList.tsx`

**Week 4 (Statistics):**
12. `src/features/inGameStats/utils/statsCalculations.ts`
13. `src/features/inGameStats/components/SummaryStats.tsx`

**Week 5 (Charts):**
14. `src/features/inGameStats/utils/chartHelpers.ts`
15. `src/features/inGameStats/components/charts/HitVsAceChart.tsx`
16. `src/features/inGameStats/components/charts/AttackKDChart.tsx`
17. `src/features/inGameStats/components/charts/KillZonesChart.tsx`
18. `src/features/inGameStats/components/charts/AttackPositionsChart.tsx`
19. `src/features/inGameStats/components/StatisticsDashboard.tsx`

**Week 6-7 (Database):**
20. `.env.local` (Supabase credentials)
21. `src/lib/supabaseClient.ts`
22. `supabase/schema.sql`
23. `src/features/inGameStats/api/pointsAPI.ts`
24. `src/features/inGameStats/hooks/useRealtimePoints.ts`

---

## Decision Tree Reference

### Win Categories
1. **Att.** (Attack) → Subcategories → **Location/Tempo** → Player
2. **Ser.** (Serve) → Subcategories → **Location/Tempo** → Player
3. **Blo.** (Block) → Subcategories → NO Location/Tempo → Player
4. **Op. E.** (Opponent Error) → Subcategories → **Location/Tempo** → Player
5. **Other** → Subcategories → NO Location/Tempo → Player (optional)

### Loss Categories
1. **Op. Att.** (Opponent Attack) → Subcategories → **Location/Tempo** → Player
2. **Op. Ace** (Opponent Ace) → Subcategories → **Location/Tempo** → Player
3. **Sp. E.** (Spike Error) → Subcategories → **Location/Tempo** → Player
4. **Ser. E.** (Serve Error) → Subcategories → NO Location/Tempo → Player
5. **Other** (Pass Error) → Subcategories → NO Location/Tempo → Player

**Key Rule:** Location/Tempo shows for 6 out of 10 categories.

---

## Resources

### Documentation Files (Project Root)
- `IMPLEMENTATION_PLAN_InGameStats.md` - Full implementation plan (2,330 lines)
- `OldTool/InGameTrend_PointWinLoss_ACTUAL_Structure.md` - ACTION_TYPES source
- `OldTool/InGameTrend_COMPLETE_REBUILD_SPEC.md` - UI specification
- `OldTool/InGameTrend_DATABASE_Architecture.md` - Database schema

### Current Implementation
- `src/pages/StatsPage.jsx` - Current mock UI (will be replaced)
- `src/components/layout/PageLayout.jsx` - Reusable layout wrapper

### External Resources
- React 19 Docs: https://react.dev
- Chart.js Docs: https://www.chartjs.org/docs/latest/
- Supabase Docs: https://supabase.com/docs
- TypeScript Handbook: https://www.typescriptlang.org/docs/

---

## Questions to Ask if Stuck

1. **ACTION_TYPES Structure**
   - "Does this category have locationTempo field in ACTION_TYPES?"
   - "What are the exact subcategories for this category?"

2. **Component Logic**
   - "Should this component use local state or Context?"
   - "Does this calculation need to be memoized?"

3. **UI Behavior**
   - "What happens when user clicks Win then switches to Loss?"
   - "Should the form reset after submission?"

4. **Performance**
   - "Is this calculation running on every render?"
   - "Should I use virtual scrolling here?"

---

## Success Checkpoints

### After Phase 1
- [ ] TypeScript compiles with no errors
- [ ] ACTION_TYPES constant matches docs exactly
- [ ] All type definitions created

### After Phase 2
- [ ] Can add a point through entire flow
- [ ] Location/Tempo shows/hides correctly
- [ ] Form validates all required fields

### After Phase 3
- [ ] Point list displays with correct colors
- [ ] Summary stats calculate correctly
- [ ] Virtual scrolling works with 100+ points

### After Phase 4
- [ ] Points persist to Supabase
- [ ] Real-time updates work across tabs
- [ ] Offline mode saves to IndexedDB

---

## Emergency Contacts

**If you get stuck:**
1. Review the relevant section in IMPLEMENTATION_PLAN_InGameStats.md
2. Check the OldTool documentation for exact specifications
3. Look for similar patterns in existing codebase
4. Ask the architect-review agent for clarification

**Critical files to reference:**
- `OldTool/InGameTrend_PointWinLoss_ACTUAL_Structure.md` - Lines 282-356 (ACTION_TYPES)
- `IMPLEMENTATION_PLAN_InGameStats.md` - Lines 196-496 (Phase 2 details)

---

## Final Notes

### Code Style
- Use TypeScript for all new files
- Follow existing CSS patterns (see StatsPage.css)
- Use functional components with hooks
- Memoize expensive calculations

### Git Workflow
- Create feature branch: `feature/in-game-stats`
- Commit after each component completion
- Use descriptive commit messages
- Push regularly to avoid losing work

### Communication
- Update progress after each major milestone
- Ask questions early if specifications unclear
- Document any deviations from the plan

---

**Good luck! Start with Phase 1, and work through systematically.**

**Remember:** The main implementation plan has all the details. This is just a quick reference.
