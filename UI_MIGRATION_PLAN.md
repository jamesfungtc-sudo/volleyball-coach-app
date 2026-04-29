# UI Migration Plan: shadcn/ui + Tailwind CSS (Dark Theme)

**Date:** 2026-04-28
**Status:** Phase 1 — Not started

---

## Goal

Replace 43 hand-rolled CSS files with Tailwind CSS v4 + shadcn/ui components.
- Dark theme throughout
- Mobile/tablet first (iPad in landscape during games)
- Less custom code, more consistent UI
- SVG court drawing area is UNTOUCHED — logic is too custom

---

## Tech Stack

| Tool | Version | Reason |
|------|---------|--------|
| Tailwind CSS | v4 | Native Vite plugin, faster than v3 PostCSS, works with Vite 7 + React 19 |
| shadcn/ui | latest | Components copied into codebase, fully customizable, dark theme built-in |
| @tailwindcss/vite | latest | Vite 7 native plugin (replaces postcss setup) |

---

## Color Tokens (Dark Theme)

Keep the volleyball app's existing palette, mapped to dark backgrounds:

| Token | Dark Value | Usage |
|-------|-----------|-------|
| Background | `#0f1117` | Page background |
| Surface | `#1a1d27` | Cards, panels |
| Surface raised | `#22263a` | Modals, dropdowns |
| Border | `#2e3348` | Dividers, input borders |
| Primary | `#3b82f6` | Buttons, focus, links |
| Primary hover | `#2563eb` | Button hover |
| Success | `#10b981` | Kill, Ace, Win |
| Danger | `#ef4444` | Error, Loss |
| Warning | `#f59e0b` | Caution states |
| Text primary | `#f1f5f9` | Main text |
| Text secondary | `#94a3b8` | Labels, subtitles |
| Text muted | `#64748b` | Placeholder, disabled |
| Nav gradient start | `#667eea` | Keep existing brand |
| Nav gradient end | `#764ba2` | Keep existing brand |

---

## shadcn/ui Components to Install

| Component | Replaces | Used in |
|-----------|---------|--------|
| `Button` | All custom `.btn-*` classes | Everywhere |
| `Dialog` | All custom modal overlays | RotationConfigModal, MatchInfoModal, SetEndModal |
| `Select` | `ConditionalDropdown`, custom `<select>` | PointEntryForm, RotationConfig, MatchSetup |
| `Tabs` | Custom segmented controls | StatsPage, AnalyticsPage |
| `Badge` | Score chips, result labels | VisualTrackingPage, MatchList |
| `Card` | Panel/surface containers | All pages |
| `Switch` | WinLossToggle | PointEntryForm |
| `Separator` | `<hr>` / border dividers | Multiple |
| `ScrollArea` | Custom overflow containers | PointByPointList, MatchList |
| `Toast` (Sonner) | No current toast — needed for Bug #4 (localStorage quota warning) | trajectoryStorage |

---

## Files: What Changes vs What Stays

### STAYS UNTOUCHED (SVG / drawing logic)
- `src/features/inGameStats/components/VisualTracking/VolleyballCourt.tsx` + `.css`
- `src/features/inGameStats/components/VisualTracking/TrajectoryArrow.tsx`
- `src/features/inGameStats/components/VisualTracking/PlayerMarker.tsx`
- All SVG coordinate/calculation logic

### MIGRATED (CSS replaced by Tailwind + shadcn)
Every `.css` file listed below will be deleted after its component is migrated.

```
src/index.css                          → keep (Tailwind base + CSS variables)
src/App.css                            → migrate → Tailwind classes
src/components/navigation/NavigationBar.css   → migrate
src/components/layout/PageLayout.css         → migrate
src/pages/VisualTrackingPage.css             → migrate (layout only, not SVG)
src/pages/MatchSetupPage.css                 → migrate
src/pages/StatsPage.css                      → migrate
src/pages/MatchListPage.css                  → migrate
src/pages/RotationsPage.css                  → migrate
src/pages/TeamsPage.css                      → migrate
src/pages/StatisticsPage.css                 → migrate
src/pages/AnalyticsPage.css                  → migrate
src/pages/OpponentAnalysisPage.css           → migrate
src/features/inGameStats/components/*.css    → migrate all (except VisualTracking)
```

---

## Phase Plan

### Phase 1: Foundation
**Goal:** Install and configure the stack. Nothing visible changes yet.

Steps:
1. Install `@tailwindcss/vite` and configure in `vite.config.js`
2. Replace `src/index.css` content with Tailwind v4 imports + CSS variables for dark theme tokens
3. Run `shadcn init` — configure: dark theme, CSS variables, src directory
4. Install shadcn components: `button`, `dialog`, `select`, `tabs`, `badge`, `card`, `switch`, `separator`, `scroll-area`
5. Install `sonner` (toast notifications) for Bug #4 fix
6. Verify dev server still runs with no visual regressions

**Done when:** App loads, dark background appears globally, shadcn components importable.

---

### Phase 2: Navigation + Global Layout
**Goal:** The app shell looks dark and polished.

Files:
- `src/components/navigation/NavigationBar.jsx` + delete `NavigationBar.css`
- `src/components/layout/PageLayout.jsx` + delete `PageLayout.css`
- `src/App.css` → migrate to Tailwind in `App.jsx`

Key details:
- Keep purple gradient on nav bar (`from-[#667eea] to-[#764ba2]`)
- Nav links: active state with white underline or highlight
- Burger menu: replace with shadcn `Sheet` component for mobile drawer
- Page container: `max-w-7xl mx-auto` with proper padding

**Done when:** All pages have dark shell, nav looks polished.

---

### Phase 3: VisualTrackingPage Controls
**Goal:** In-game UI is clean and responsive. This is the most important — used during live matches.

Files:
- `src/pages/VisualTrackingPage.tsx` — replace inline styles + className strings
- `src/pages/VisualTrackingPage.css` — delete after migration
- `src/features/inGameStats/components/RotationConfigModal.tsx` + `.css`
- `src/features/inGameStats/components/MatchInfoModal.tsx` + `.css`
- `src/features/inGameStats/components/SegmentedControl.tsx` + `.css`
- `src/features/inGameStats/components/WinLossToggle.tsx` + `.css`
- `src/features/inGameStats/components/PlayerSelector.tsx` + `.css`
- `src/features/inGameStats/components/SummaryCard.tsx` + `.css`

Key details:
- Layout: 40% court / 60% panel — preserve this exact split with Tailwind grid
- Action buttons (In Play, Kill, Ace, Error): large touch targets, min `h-14` (56px)
- Score display: prominent, high contrast
- RotationConfigModal → shadcn `Dialog` (replaces custom overlay + animation)
- SegmentedControl → shadcn `Tabs` variant
- WinLossToggle → shadcn `Switch` or segmented `Tabs`
- Player markers on court: stay as SVG, only wrapper/panel styling changes

**Done when:** Full game flow (select player → draw → save result → score) works with new UI.

---

### Phase 4: Remaining Pages
**Goal:** All other pages look consistent.

Order:
1. `MatchListPage` + `MatchSetupPage` (simple list + form)
2. `StatsPage` (charts — Recharts containers styled with Tailwind)
3. `RotationsPage` + `TeamsPage`
4. `StatisticsPage` + `AnalyticsPage` + `OpponentAnalysisPage`

**Done when:** All 43 CSS files deleted, zero custom CSS outside of `index.css` variables.

---

## Rules for Migration

1. **Never migrate logic — only styling.** If touching a `.tsx` file, only change `className` strings and remove CSS imports. No functional changes.
2. **SVG area is off limits.** `VolleyballCourt.tsx`, `TrajectoryArrow.tsx`, `PlayerMarker.tsx` — do not touch.
3. **Delete CSS file only after its component is fully migrated** — never delete first.
4. **Test the full game flow after Phase 3** before moving to Phase 4.
5. **Touch targets:** All interactive elements in VisualTrackingPage must be minimum `h-14 w-14` (56px) for iPad use.
6. **Incremental commits** — commit after each phase, not at the end.

---

## Installation Commands (Phase 1)

```bash
# Step 1: Install Tailwind v4 Vite plugin
source ~/.nvm/nvm.sh && nvm use 22
npm install tailwindcss @tailwindcss/vite

# Step 2: shadcn init (run from project root, answer prompts)
npx shadcn@latest init

# shadcn init answers:
# - Style: Default
# - Base color: Slate
# - CSS variables: Yes
# - Dark mode: class

# Step 3: Install components
npx shadcn@latest add button dialog select tabs badge card switch separator scroll-area

# Step 4: Install sonner (toasts)
npm install sonner
```

---

## vite.config.js Change (Phase 1)

```js
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),   // ← add this
    VitePWA({ ... })
  ]
})
```

---

## index.css Change (Phase 1)

```css
@import "tailwindcss";

@layer base {
  :root {
    --background: 222 47% 7%;
    --foreground: 213 31% 95%;
    --card: 222 47% 11%;
    --card-foreground: 213 31% 95%;
    --popover: 222 47% 14%;
    --popover-foreground: 213 31% 95%;
    --primary: 217 91% 60%;
    --primary-foreground: 0 0% 100%;
    --secondary: 222 47% 18%;
    --secondary-foreground: 213 31% 95%;
    --muted: 222 47% 18%;
    --muted-foreground: 215 20% 65%;
    --accent: 222 47% 18%;
    --accent-foreground: 213 31% 95%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;
    --border: 222 47% 20%;
    --input: 222 47% 20%;
    --ring: 217 91% 60%;
    --radius: 0.5rem;

    /* Volleyball app specific */
    --success: 160 84% 39%;
    --warning: 38 92% 50%;
  }
}

@layer base {
  * { @apply border-border; }
  body { @apply bg-background text-foreground; }
}
```

---

## Notes

- Recharts charts do NOT need restyling — they use their own SVG rendering. Only their wrapper containers change.
- The `VisualTrackingPage` landscape layout (40/60 split) must be preserved exactly — coaches rely on this during games.
- After Phase 1, run the app and check the browser console for any CSS import errors before proceeding.
- shadcn components live in `src/components/ui/` — do not edit these directly; extend via className props.
