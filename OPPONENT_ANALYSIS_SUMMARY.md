# Opponent Analysis Feature - Executive Summary

**Quick Reference Guide**
**Last Updated:** 2025-10-28

---

## TL;DR - Key Recommendations

### What to Build First (MVP)
Start with **Phase 1-2** (4 weeks):
- Starting line-up tracker
- 6×6 grid for serving patterns
- 6×6 grid for hitting patterns
- Dual-coordinate storage (grid + normalized float)
- Simple cell-based heatmaps

**DON'T build (yet):**
- Canvas/free-tap input
- Gesture recognition/trajectories
- KDE heatmaps
- Zoom-to-refine
- Apple Pencil support

**Why:** Speed is critical for live games. Simple grid input meets 90% of needs with 10% of complexity.

---

## MVP Data Model (Phase 1-2)

```typescript
// Store both grid AND normalized coordinates (future-proof)
interface LocationEvent {
  id: string;
  match_id: string;
  set_number: number;

  // Dual coordinates
  grid_x: number;        // 0-5 (simple grid)
  grid_y: number;        // 0-5
  normalized_x: number;  // 0.0-1.0 (future precision)
  normalized_y: number;  // 0.0-1.0

  opponent_jersey_number: number;
  result: 'ace' | 'kill' | 'error' | 'in-play';
}

interface ServeEvent extends LocationEvent {
  event_type: 'serve';
  serve_type: 'float' | 'jump' | 'topspin' | 'hybrid';
}

interface HitEvent extends LocationEvent {
  event_type: 'hit';
  hit_type: 'hard-spike' | 'roll-shot' | 'tip' | 'tool' | 'cut';
}
```

---

## MVP User Workflow (Live Game)

**Target: < 5 seconds per event**

### Serve Entry
```
[Serve Event Button]
   ↓
[Select Player: 12, 20, 8, 7, 16, 11]
   ↓
[Serve Type: Float | Jump | Topspin | Hybrid]
   ↓
[Tap Grid Location] (6×6 court visual)
   ↓
[Result: Ace | In-play | Error]
   ↓
Auto-submit, form resets
```

### Hit Entry
```
[Hit Event Button]
   ↓
[Select Player]
   ↓
[Hit Type: Hard Spike | Roll | Tip | Tool | Cut]
   ↓
[Tap Grid Location]
   ↓
[Result: Kill | In-play | Error]
   ↓
Auto-submit
```

---

## Technical Stack (MVP)

| Component | Technology | Why |
|-----------|-----------|-----|
| Court Grid | HTML/CSS (36 buttons) | Simplest, fastest, most reliable |
| State | React Context + useReducer | Matches existing pattern |
| Storage | IndexedDB | Offline-first PWA requirement |
| Sync | Google Sheets API | Already integrated |
| Heatmaps | CSS background-color | O(36) cells, < 1ms render |
| Validation | Zod | Already in use |

**NO Canvas/SVG for MVP** - Add later only if needed for trajectories.

---

## Architecture Diagram (MVP)

```
┌─────────────────────────────────────┐
│   Opponent Analysis Page            │
│  [Line-up] [Serving] [Hitting]      │
└───────────┬─────────────────────────┘
            │
┌───────────▼──────────────┐
│ OpponentAnalysisContext  │  ← Same pattern as MatchContext
│   (useReducer)           │
└───────────┬──────────────┘
            │
┌───────────▼──────────────┐
│   IndexedDB              │  ← Auto-save (debounced 1s)
└───────────┬──────────────┘
            │
┌───────────▼──────────────┐
│   Google Sheets API      │  ← Background sync
└──────────────────────────┘
```

---

## File Structure

```
src/features/opponentAnalysis/
├── components/
│   ├── LineupTracker.tsx          ← Phase 1
│   ├── CourtGrid.tsx              ← Phase 2 (reusable)
│   ├── ServeEntryForm.tsx         ← Phase 2
│   ├── HitEntryForm.tsx           ← Phase 2
│   ├── EventList.tsx              ← Phase 2
│   └── CellHeatmap.tsx            ← Phase 2
│
├── context/
│   └── OpponentAnalysisContext.tsx
│
├── utils/
│   ├── coordinateConversion.ts
│   └── heatmapCalculations.ts
│
└── types/
    └── opponentAnalysis.types.ts
```

---

## Phase Breakdown

### Phase 1: Foundation (Week 1-2)
- [ ] Data types + Zod schemas
- [ ] OpponentAnalysisContext
- [ ] IndexedDB setup
- [ ] Line-up tracker component
- [ ] Basic navigation

**Success:** Can record starting line-ups for each set

### Phase 2: Grid Input (Week 3-4)
- [ ] Serve entry workflow
- [ ] Hit entry workflow
- [ ] 6×6 CourtGrid component
- [ ] Cell-based heatmap
- [ ] Event list view
- [ ] Google Sheets sync

**Success:** Can record serves/hits in < 5 seconds, offline-first works

### Phase 3: Progressive Precision (Week 5-6) - **DEFER**
- Zoom-to-refine (coarse → fine)
- Confidence metadata
- Semantic zone labels
- Enhanced visualizations

**Decision Point:** Only proceed if 6×6 grid proven insufficient

### Phase 4: Advanced Features (Week 7+) - **DEFER**
- Trajectory capture (drag gestures)
- Free-tap canvas
- KDE heatmaps
- Apple Pencil support

**Decision Point:** Only proceed with validated user need

---

## Performance Targets

| Metric | Target | Approach |
|--------|--------|----------|
| Event entry time | < 5 seconds | Large touch targets, no confirmations |
| UI response | < 100ms | Simple HTML/CSS, no complex rendering |
| Heatmap render (100 events) | < 200ms | Pre-computed cell counts, memoization |
| Auto-save delay | 1 second | Debounced IndexedDB write |
| Sync to Google Sheets | < 3 seconds | Background, non-blocking |

**Expected Data Volume:**
- ~75 events per set (25 serves + 50 hits)
- ~375 events per match (5 sets)
- ~185KB per match
- No performance concerns with this volume

---

## Backward Compatibility

**If prototype data exists:**

```typescript
// Lazy migration: Read old format, write new format
function loadEvent(raw: any): LocationEvent {
  if (!raw.normalized_x) {
    // Legacy format: convert on-the-fly
    return {
      ...raw,
      grid_x: raw.x,
      grid_y: raw.y,
      normalized_x: (raw.x + 0.5) / 6.0,
      normalized_y: (raw.y + 0.5) / 6.0,
    };
  }
  return raw;
}
```

**No migration required** - Transparent conversion at read time.

---

## Risk Mitigation

### Top 3 Risks

1. **Too slow for live games**
   - Mitigation: Speed-first workflow, large touch targets, skip confirmations
   - Target: < 5 seconds per event

2. **Offline sync conflicts**
   - Mitigation: Timestamp-based resolution, manual merge UI
   - Prevention: Auto-save every 1 second

3. **Grid too coarse**
   - Mitigation: Dual-coordinate storage enables future precision
   - Strategy: Start with 6×6, add refinement in Phase 3 if needed

---

## Decision Points

### After Phase 1 (Week 2)
**Question:** Is line-up tracker usable?
- If yes → Proceed to Phase 2
- If no → Iterate on Phase 1

### After Phase 2 (Week 4)
**Questions:**
1. Is 6×6 grid sufficient precision?
2. Is input speed acceptable for live games?
3. Are coaches using the feature?

**Decisions:**
- If yes to all → Focus on analytics/visualizations
- If precision insufficient → Proceed to Phase 3
- If too slow → Simplify workflow further

### After Phase 3 (Week 6)
**Question:** Do users actually use zoom-to-refine?
- If usage < 30% → Don't build Phase 4
- If usage > 30% → Consider Phase 4 advanced features

---

## API Quick Reference

### Context API

```typescript
const { state, dispatch, addServeEvent, addHitEvent } =
  useOpponentAnalysis();

// Add serve
addServeEvent({
  match_id: 'match-123',
  set_number: 1,
  grid_x: 2,
  grid_y: 3,
  opponent_jersey_number: 12,
  serve_type: 'jump',
  result: 'ace'
});

// Add hit
addHitEvent({
  match_id: 'match-123',
  set_number: 1,
  grid_x: 4,
  grid_y: 1,
  opponent_jersey_number: 20,
  hit_type: 'hard-spike',
  result: 'kill'
});
```

### Coordinate Utilities

```typescript
// Grid (0-5) → Normalized (0.0-1.0)
const { x, y } = gridToNormalized(2, 3, 6);
// Returns: { x: 0.417, y: 0.583 }

// Normalized → Grid
const { x, y } = normalizedToGrid(0.417, 0.583, 6);
// Returns: { x: 2, y: 3 }
```

---

## Next Steps

### Immediate (This Week)
1. [ ] Validate assumptions with user (is 6×6 sufficient?)
2. [ ] Create Phase 1 project board
3. [ ] Set up feature branch: `feature/opponent-analysis`
4. [ ] Create type definitions in `opponentAnalysis.types.ts`

### Week 1-2 (Phase 1)
1. [ ] Build OpponentAnalysisContext
2. [ ] Create IndexedDB schema
3. [ ] Build LineupTracker component
4. [ ] Add navigation to page

### Week 3-4 (Phase 2)
1. [ ] Build CourtGrid component (reusable)
2. [ ] Build ServeEntryForm workflow
3. [ ] Build HitEntryForm workflow
4. [ ] Add cell-based heatmap
5. [ ] Integrate Google Sheets sync

---

## Success Metrics

### Phase 1 Success
- [ ] Line-up recorded in < 60 seconds per set
- [ ] Zero data loss incidents
- [ ] Works offline

### Phase 2 Success
- [ ] Event entry in < 5 seconds
- [ ] Heatmap renders < 200ms
- [ ] Coaches report usable during live games
- [ ] Offline sync works reliably

---

## Questions to Validate Before Building

1. **Is 6×6 precision sufficient for meaningful analysis?**
   - If yes → Proceed with MVP
   - If no → Consider starting with 12×12 grid (still simple HTML/CSS)

2. **Primary use case: Live game or video review?**
   - If live → Speed is critical, keep workflow simple
   - If review → Can add refinement features earlier

3. **Do coaches know opponent jersey numbers during live games?**
   - If yes → Current workflow is fine
   - If no → Add "Player A/B/C" placeholders with later renaming

4. **How often do they analyze opponents?**
   - If frequently → Invest in analytics features
   - If rarely → Keep MVP minimal

---

## References

- Full architecture document: `OPPONENT_ANALYSIS_ARCHITECTURE.md`
- Existing InGame Stats: `IMPLEMENTATION_PLAN_InGameStats.md`
- Current court components: `src/features/shared/components/VolleyballCourt.jsx`

---

**Remember:** Start simple. Validate with users. Add complexity only when proven necessary.
