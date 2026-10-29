# Volleyball Coach App — Review & Rebuild Plan

Oct 26, 2026 · @James

## Executive Summary

The Volleyball Coach App is a React 19 + Vite 7 progressive web app that lets coaches track live match statistics, manage team rosters, plan rotations, and sync data to Google Sheets. It is deployed to GitHub Pages and works offline through a service worker and local write queue.

The app today is functional but has grown organically: the core match-tracking page (`VisualTrackingPage.tsx`) is 4,368 lines of tightly coupled state, the navigation is a hamburger menu that hides all features behind a tap, two of six pages are placeholders, and the visual design is dark-only with no light theme. The rotation planner and match tracker operate as separate workflows with no shared context.

This review proposes a rebuild around three coach-facing modes — **Live Match**, **Post-Match Analysis**, and **Opponent Scouting** — with the rotation viewer folded into Live mode, a quick-entry option for head coaches alongside the existing detailed entry, multi-team support, dark and light themes, and offline-first architecture throughout.

**Revised Oct 28, 2026:** the backend moves from Google Sheets to a Postgres database (Neon) behind the app's own API, hosted on Vercel (Phase 1.5). Google Sheets keeps working in parallel until the new backend is proven on real matches, then is retired. The schema and API are designed from the start for multiple users, so the app can later be shared with other coaches and gain user-specific features without another migration.

**What stays**: the SVG court rendering system, the rotation calculation logic, the offline-first approach (local storage + ordered sync outbox), and the Google Sheets backend *until* the Neon cutover is verified.

**What changes**: information architecture, navigation, every page layout, the component structure, the state management approach, theming, the CSS foundation, and (from Phase 1.5) the backend and hosting.

**Rollback point:** tag `pre-rebuild-2026-10-26` (commit `04eac72`) is the last version before the rebuild.

## Current State Review

All screenshots taken at iPad landscape (1180 x 820, 2x). The app has seven accessible routes and one orphan page.

### Rotations Page (Home `/`)

Two-column layout: Team Configuration table on the left (position, Team A, Team B), Rotation Map Viewer on the right with numbered rotation buttons (1–6) and court diagrams for Serving and In-Rally formations. Player markers on the court show names, positions and jersey numbers, with blue circles for one team and red for the other.

**Findings**: Player markers show `???` for unset values, which is confusing. The page header ("Rotation Analysis") uses a large centered card that wastes vertical space. The two-column layout does not adapt to portrait. The Team A/B naming is generic and does not connect to saved teams. Court diagram backgrounds use a cream/beige color that clashes with the dark UI.

### Teams Page (`/teams`)

Page header card + empty state ("No teams yet") with an "+ Add Team" button in the top-right corner.

**Findings**: The empty state is minimal but adequate. The "+ Add Team" button is small and placed far from the empty-state message. No indication of what team data looks like once populated. The page header card takes 15% of screen height for two lines of text.

### Statistics Page (`/statistics`)

Placeholder: "Statistics Tracking Coming Soon" with a bullet list of planned features and a "Phase 2" badge.

**Findings**: This is dead space in the nav. A placeholder page with no functionality adds cognitive load to the navigation without providing value.

### Match List Page (`/in-game-stats`)

"Matches" heading with "+ New Match" button. Empty state: "No matches yet / Tap 'New Match' to start tracking your first game."

**Findings**: Clean layout. The "+ New Match" button is appropriately placed. No filtering or search visible for when the list grows. No indication of which team a match belongs to.

### Match Setup Page (`/in-game-stats/setup`)

Form with Match Date (pre-filled), Home Team dropdown, Opponent Team dropdown, Cancel and Start Match buttons. Clean centered card layout.

**Findings**: Simple and clear. Missing: venue field, set format (best of 3 or 5), initial rotation/lineup selection. The Cancel and Start Match buttons have nearly identical styling, making the primary action unclear.

### Analytics Page (`/analytics`)

Placeholder: "Analytics / Analytics page coming soon..." in small centered text.

**Findings**: Another dead nav item. Even less content than the Statistics placeholder. Should be removed or merged.

### Visual Tracking Page (`/in-game-stats/:matchId/visual`)

Full-screen landscape layout. Left side: SVG volleyball court with opponent/home labels and dashed attack lines. Right side: Set selector dropdown, control buttons (stats, Set Up, settings, Saved indicator), serve-first selector (Home/Opponent), scoreboard (HOME 0 – OPP 0), player selector area ("No Player / Click a player on the court to begin"), and a drawing area prompt.

**Findings**: This is the app's core and most complex screen. The layout is landscape-oriented and fills the viewport, which is correct for iPad use. Issues: (1) The "Who serves first?" prompt with a red border is visually alarming for a routine question. (2) The scoreboard is small relative to the court. (3) The right panel has too many controls stacked vertically with inconsistent spacing. (4) The purple Set selector dropdown clashes with the blue/teal court palette. (5) No visible way to exit back to the match list without the browser back button. (6) The court takes only about 40% width, leaving 60% for controls that could be more compact. (7) Touch targets for the control buttons at top-right are small for finger use.

### Stats Page (`/in-game-stats/:matchId`)

When a match ID is not found: centered "Match not found" error in red text with a "Back to Matches" button.

**Findings**: Error state is functional but bare. The red text on dark background has moderate contrast. When a real match loads, this page contains the form-based point entry, stats dashboard, and charts — a parallel workflow to the Visual Tracking page.

### Opponent Analysis Page (orphan route)

Listed in the navigation drawer as "Opponent Analysis" but the route `/opponent-analysis` is not defined in `App.jsx`. Clicking it navigates to the hash route but renders nothing (falls through to the Rotations page via the `/` catch-all).

**Findings**: Broken navigation link. The feature has components built (`OpponentAnalysisPage.tsx`, `EventEntryWorkflow.tsx`, `CourtGrid.tsx`) but was never wired into the router.

## UX & Visual Design Findings

### Navigation

The app uses a hamburger menu that slides in from the right. Every feature is hidden behind a tap, with no persistent navigation visible. On iPad landscape, this wastes the wide screen: a sidebar or tab bar would keep all five destinations visible at all times. The hamburger icon is the only navigation affordance on screen. The navigation drawer lists six items, two of which (Statistics, Analytics) are placeholders, and one (Opponent Analysis) is broken. This means half the nav leads nowhere.

The purple gradient on the nav bar (`linear-gradient(135deg, #667eea, #764ba2)`) does not appear anywhere else in the app. It creates a visual disconnect between the header and the dark blue content area.

### Layout

Every page except the Visual Tracking page uses a centered page header card that takes 80–120px of vertical space for a title and subtitle. On iPad, this pushes the actual content below the fold unnecessarily. The content areas use full-width containers with no maximum width constraint, so on wider screens text lines run very long.

The Visual Tracking page uses a fixed two-column layout (roughly 40/60 split) that fills the viewport. This is the right approach for live match tracking on iPad landscape but does not adapt to portrait or phone screens.

### Typography

The app uses the system font stack (no custom fonts loaded). Heading sizes are inconsistent: page titles in the header cards use `text-2xl` to `text-3xl`, while the Visual Tracking page uses a mix of sizes for its controls. Body text is generally readable at `text-sm` to `text-base`, but some labels on the court diagram and control buttons are too small for touch use.

### Color

The dark theme uses a navy/dark-blue base (`hsl(222, 47%, 7%)`) with blue accents (`hsl(217, 91%, 60%)`). This is a reasonable foundation, but several issues:

- The court diagram uses a cream/beige fill that clashes with the dark UI
- The nav bar purple gradient has no relationship to the blue theme
- The "Who serves first?" prompt uses a red border that reads as an error, not a prompt
- The Set selector uses a purple background, adding a third accent color
- Success (green), warning (amber), and destructive (red) semantic colors are defined but not consistently applied
- There is no light theme, making outdoor use difficult

### Touch Targets

Several interactive elements are below the 44x44px minimum recommended for touch:

- Control buttons at the top-right of the Visual Tracking page (stats, Set Up, settings icons)
- Rotation number buttons (1–6) on the Rotations page are adequate but tightly packed
- The hamburger menu icon is 24x24px, below minimum
- The "+ New Match" and "+ Add Team" buttons have adequate height but are placed in corners, far from thumb reach on iPad

### Accessibility

- No visible focus indicators beyond browser defaults
- The hamburger button has an `aria-label` (good), but the nav drawer lacks `role="dialog"` or focus trap
- Color contrast: white text on the dark background generally passes WCAG AA, but muted text (`hsl(215, 20%, 65%)`) on the dark background (`hsl(222, 47%, 7%)`) is borderline at 4.4:1
- Court diagrams rely on color alone (blue vs red circles) to distinguish teams, with no shape or pattern alternative
- No skip-to-content link
- No `aria-live` regions for score updates

### Responsiveness

The app targets iPad but does not handle portrait or phone gracefully:

- The Rotations page two-column layout stacks poorly on narrow screens
- The Visual Tracking page is fixed landscape with no portrait adaptation
- The nav drawer width (288–320px) is appropriate for tablets but covers most of a phone screen
- No responsive breakpoints defined beyond the drawer width adjustment
- The PWA manifest allows "any" orientation but the core feature only works in landscape

## Code Architecture Findings

### File Structure

The codebase uses a feature-based directory layout (`features/inGameStats/`, `features/opponentAnalysis/`, `features/rotations/`, `features/shared/`) alongside a `pages/` directory and a top-level `services/` directory. This is a reasonable structure, but the boundaries are blurred: `VisualTrackingPage.tsx` (4,368 lines) lives in `pages/` but contains logic that belongs in `features/inGameStats/`. The `features/shared/` directory has two volleyball court components that duplicate the one in `features/inGameStats/components/VisualTracking/`.

The project mixes `.jsx` and `.tsx` files. Older pages (Rotations, Teams, Statistics) are JavaScript; newer features (InGameStats, Visual Tracking) are TypeScript. ESLint is configured for JS/JSX only, so TypeScript files are not linted.

### State Management

Three React Context + `useReducer` stores handle match state, opponent tracking, and opponent analysis. There is no global state library. The main problem is `VisualTrackingPage.tsx`, which carries 40+ `useState` calls for scores, rotation configs, lineup positions, libero swaps, substitutions, point history, sync status, and drawing state. This makes the component nearly impossible to test, refactor, or split.

Local storage is used extensively for rotation configs, set scores, trajectory data, and the pending sync queue. The keys are not namespaced consistently (`match_{id}_rotations`, `match_{id}_set_scores`), and there is no migration or cleanup strategy.

### Component Sizes

| File | Lines | Concern |
| --- | --- | --- |
| VisualTrackingPage.tsx | 4,368 | Court rendering, scoring, rotation, substitution, sync, drawing, opponent tracking, point history, libero management |
| StatsPage.tsx | \~800 | Point entry, stats dashboard, match loading, navigation |
| RotationConfigModal.tsx | \~600 | Rotation setup with system selection, player assignment, position mapping |
| OpponentTrackingModule.tsx | \~400 | Opponent serve/attack entry with court grid |

`VisualTrackingPage` handles at least 10 distinct responsibilities. It should be decomposed into a page shell with hooks and child components for scoring, rotation, drawing, and sync.

### Type Safety

The TypeScript coverage is partial. The `playerReference.types.ts` file implements a discriminated union pattern for player IDs (roster vs custom players) with factory functions, serialization, and legacy migration. This is well-designed and should be preserved. However, several components pass untyped props or use `any` implicitly because they are `.jsx` files that interact with typed services.

### Offline Support

The offline architecture has three layers: (1) `vite-plugin-pwa` generates a service worker with NetworkFirst caching; (2) `syncService.ts` maintains a pending-write queue in localStorage that auto-retries on `window.online`; (3) `writeQueue.ts` serializes all Google Sheets writes to prevent race conditions. This is a solid foundation. The gap is that the app does not store full match state locally — it depends on fetching from Google Sheets on load, so opening the app offline without a prior session fails.

### Data Layer

`googleSheetsAPI.ts` exports 18 functions covering teams, players, matches, points, game state, rotations, and trajectories. All communication goes through a single Google Apps Script web app URL. The `writeQueue.ts` singleton ensures writes are serialized. This layer is clean and well-separated from the UI.

Limits of Sheets as a backend: no user accounts or per-user data, the Apps Script URL is public and unauthenticated, every write is a GET request with JSON in the query string, there are no relational constraints or indexes, and concurrent writes need the client-side `writeQueue` to avoid lost updates. These are acceptable for one coach but block sharing the app. Phase 1.5 replaces it with Postgres; see **Backend Architecture** below.

### Build and Tooling

Vite 7, React 19, Tailwind CSS v4 (configured via `@theme inline` in CSS, no `tailwind.config.js`), and shadcn/ui components (Radix primitives). The build is fast and modern. PWA support is configured but the manifest uses a generic Material Blue theme color that does not match the app's palette. Vitest is configured but the `test/` directory has only a setup file with no actual tests.

## Proposed Information Architecture

The rebuild reorganizes the app around the coach's three workflows, with team management and settings as supporting screens.

### Navigation Model

Replace the hamburger menu with a persistent bottom tab bar (iPad) or side rail (landscape). Five tabs:

1. **Live** — active match tracking (quick or detailed mode)
2. **Matches** — match history and post-match analysis
3. **Teams** — team and roster management
4. **Scouting** — opponent tendencies (served from data captured in Live mode)
5. **Settings** — theme, sync, default lineup systems

The tab bar stays visible during match setup and match history browsing. During active live tracking, the tab bar hides to maximize screen space, with a small exit button in the corner.

### Screen Inventory

| Screen | Tab | Route | Purpose |
| --- | --- | --- | --- |
| Match Setup | Live | `/live/new` | Create match: pick teams, date, venue, format, starting lineup |
| Live Quick Mode | Live | `/live/:matchId/quick` | Head coach: tap Win/Loss per rally, auto-rotation, score display |
| Live Detailed Mode | Live | `/live/:matchId/detailed` | Statistician: court drawing, player selection, action types, opponent tracking |
| Rotation Overlay | Live | (drawer within live) | Current rotation diagram, manual rotation controls, libero swaps |
| Match List | Matches | `/matches` | All matches grouped by team, filterable by date range |
| Match Detail | Matches | `/matches/:matchId` | Post-match stats dashboard: charts, point-by-point, set summaries |
| Team List | Teams | `/teams` | All teams with player counts |
| Team Detail | Teams | `/teams/:teamId` | Roster management, default rotation system, player profiles |
| Scouting Dashboard | Scouting | `/scouting` | Opponent tendencies aggregated across matches |
| Scouting Detail | Scouting | `/scouting/:teamId` | Per-opponent heatmaps, serve patterns, attack tendencies |
| Settings | Settings | `/settings` | Theme toggle, sync status, data export, about |

### Mode Relationships

**Live mode** is the primary workflow. When a match starts, the coach chooses Quick or Detailed mode. Quick mode records only the point outcome (our point / their point) and who served, advancing the rotation automatically. Detailed mode adds player selection, action type, court trajectory drawing, and opponent tracking per rally. The coach can switch between modes mid-match.

**Rotation viewer** is a drawer within Live mode, not a separate page. It shows the current rotation number, the court formation (serving vs rally), and allows manual rotation overrides and substitutions. It opens with a tap on the rotation indicator in the scoreboard area.

**Opponent scouting** data is captured in Live Detailed mode as part of each rally: where the opponent hit from, where it landed, which player attacked. This data flows into the Scouting tab as aggregated tendencies per opponent team. The standalone Opponent Analysis page from the current app is removed; its court-grid and event-entry components are reused within Live Detailed mode.

**Post-match analysis** consumes the data recorded in Live mode. The Match Detail screen shows the same charts the current `StatsPage` and `StatsDashboard` components render, plus set-by-set breakdowns, rotation-level stats, and the point-by-point timeline.

## Screen Designs

All layouts target iPad landscape (1180 x 820) as the primary viewport, with adaptations for portrait and phone noted.

### Match Setup

A single-step form inside the Live tab. Layout: centered card (max-width 600px) with stacked fields.

- **Date**: date picker, pre-filled to today
- **Home Team**: dropdown populated from saved teams
- **Opponent Team**: dropdown, or "+ Add opponent" inline to create a one-off team
- **Venue**: optional text field
- **Format**: segmented control — Best of 3 / Best of 5
- **Starting Lineup**: button to open the Rotation Config drawer (optional; can be set after match starts)
- **Mode**: segmented control — Quick / Detailed (sets the default; switchable during match)
- **Start Match**: primary action button, full width at bottom of card

On phone, the card stretches to full width with 16px side gutters.

### Live Quick Mode

Designed for the head coach to record \~2 seconds per point. Full-screen landscape layout, no tab bar.

**Top strip** (56px): Home Team name (left), set indicator ("Set 2"), Opponent name (right), gear icon (opens settings/rotation drawer).

**Center**: large scoreboard. Home score on the left (large number, 72px font), opponent score on the right, set scores (small badges) below each. The serving team is indicated by a filled circle next to their score.

**Bottom half**: two large tap zones filling the remaining space, divided vertically.

- **Left zone (green tint)**: "Our Point" — tapping records a won rally, increments home score, and rotates if the team just won serve
- **Right zone (red tint)**: "Their Point" — tapping records a lost rally, increments opponent score, and rotates if opponent just won serve

**Bottom bar** (44px): Undo button (left), rotation indicator showing current rotation number (center, tappable to open rotation drawer), "Switch to Detailed" button (right).

On phone portrait, the two tap zones stack vertically instead of side by side. The scoreboard moves to a compact top bar.

### Live Detailed Mode

The current Visual Tracking page's concept, rebuilt with cleaner separation. Full-screen landscape, no tab bar.

**Left column (45%)**: SVG volleyball court filling the height. Player markers (circles with jersey numbers) positioned according to the current rotation and formation (serving vs rally). The court background uses the theme's surface color, not a separate cream palette. Touch/draw on the court to record a trajectory arrow.

**Right column (55%)**: stacked panels.

- **Score bar** (48px): Home score, set indicator, opponent score, serving indicator. Tapping either score opens a quick-result panel (same as Quick mode's two-zone concept but as buttons: "Our Point" / "Their Point").
- **Action panel** (variable): Appears after selecting a player on the court. Shows action type selector (Attack, Serve, Block, Dig, Set, Error), outcome (Kill, Error, In-play), and a confirm button. This replaces the current multi-dropdown approach with larger, tappable chips.
- **Opponent tracking** (collapsible): Where the opponent attacked from (position selector), where it landed (court grid), which opponent player. This section is collapsed by default and expands on tap. Data is captured per rally, not per touch.
- **Point history** (scrollable, bottom): Last 5 points as compact cards showing score, action, player. Swipe left on a card to undo.

**Floating controls**: Rotation indicator (bottom-left of court, tappable for drawer), Exit button (top-left corner), Set Up button (top-right).

On phone portrait: the court moves to the top third, controls to the bottom two-thirds, scrollable. The action panel uses a bottom sheet.

### Rotation Drawer

A slide-in panel (from the right, 400px wide on iPad) that overlays the live tracking screen.

- **Header**: "Rotation 3 of 6" with forward/back arrows
- **Court diagram**: compact court showing the current 6 positions with player names and jersey numbers
- **Formation toggle**: Serving / Rally formation view
- **Substitution section**: list of active substitutions ("Player A in for Player B"), plus a "+ Sub" button that opens a player picker
- **Libero section**: current libero status, swap button
- **Rotation system info**: which system is active (5-1, 6-2, etc.), link to change

### Match List (Post-Match)

The Matches tab. Layout: list of match cards, most recent first.

Each card shows: date, Home vs Opponent, final score (e.g., 3–1), set scores, match status badge (completed / in progress). Tapping a completed match opens Match Detail. Tapping an in-progress match resumes Live mode.

Filter bar at top: team selector dropdown + date range picker. When a team is selected, only that team's matches show.

### Match Detail (Post-Match Analysis)

A scrollable analysis page for a completed match. Sections:

1. **Match header**: teams, final score, date, venue, duration
2. **Set summary cards**: row of cards, one per set, showing set score and key stats per set
3. **Charts section** (tabs: Overview / Attack / Serve / Rotation):
   - Overview: point progression chart, momentum indicator, scoring runs
   - Attack: kill efficiency by player, attack distribution by position, kill zone heatmap
   - Serve: ace/error rates, serve location heatmap
   - Rotation: points won/lost per rotation number
4. **Point-by-point timeline**: expandable accordion per set, each point showing score, action, player, rotation number
5. **Opponent data**: opponent hitting patterns (heatmaps), serve tendencies (if captured in detailed mode)

### Team Management

The Teams tab. Two-level navigation: Team List and Team Detail.

**Team List**: cards showing team name, player count, and last match date. "+ New Team" button in the top-right. Each card is tappable.

**Team Detail**:

- **Header**: team name (editable inline), number of players
- **Roster table**: player list with columns for jersey number, name, position (OH, MB, S, Oppo, L), and height. Inline editing. "+ Add Player" row at bottom.
- **Default system**: dropdown to pick the rotation system (5-1, 6-2, 4-2) and default lineup assignment
- **Delete team**: destructive action at the bottom, behind a confirmation

### Settings

- **Theme**: toggle switch for Dark / Light, with system-auto option
- **Sync status**: last sync time, number of pending writes, force-sync button
- **Data**: export match data as CSV, clear local cache
- **About**: app version, link to GitHub repo

## Design System

### Color Tokens

Replace the current dark-only palette with a dual-theme system. All colors defined as CSS custom properties on `:root` (light) and `:root[data-theme="dark"]`, mapped to Tailwind utilities via `@theme inline`.

| Token | Light Value | Dark Value | Usage |
| --- | --- | --- | --- |
| `--background` | `hsl(0 0% 100%)` | `hsl(222 47% 7%)` | Page background |
| `--surface` | `hsl(210 20% 97%)` | `hsl(222 47% 11%)` | Card, panel backgrounds |
| `--surface-elevated` | `hsl(0 0% 100%)` | `hsl(222 47% 15%)` | Modals, drawers, popovers |
| `--foreground` | `hsl(222 47% 11%)` | `hsl(210 20% 95%)` | Primary text |
| `--foreground-muted` | `hsl(215 16% 47%)` | `hsl(215 20% 65%)` | Secondary text, labels |
| `--border` | `hsl(214 20% 88%)` | `hsl(222 30% 22%)` | Borders, dividers |
| `--primary` | `hsl(217 91% 50%)` | `hsl(217 91% 60%)` | Primary actions, active tab |
| `--primary-foreground` | `hsl(0 0% 100%)` | `hsl(0 0% 100%)` | Text on primary |
| `--success` | `hsl(152 69% 35%)` | `hsl(160 84% 39%)` | Won point, positive stat |
| `--destructive` | `hsl(0 72% 51%)` | `hsl(0 84% 60%)` | Lost point, errors, delete |
| `--warning` | `hsl(38 92% 50%)` | `hsl(38 92% 50%)` | Caution states |
| `--court` | `hsl(30 30% 90%)` | `hsl(222 30% 18%)` | Court background (theme-aware) |
| `--court-line` | `hsl(0 0% 100%)` | `hsl(0 0% 85%)` | Court boundary and net lines |
| `--team-home` | `hsl(217 91% 55%)` | `hsl(217 91% 60%)` | Home team markers |
| `--team-opponent` | `hsl(0 72% 55%)` | `hsl(0 84% 60%)` | Opponent markers |

The purple nav gradient is removed entirely. The nav bar uses `--surface-elevated` with a bottom border.

### Typography Scale

Use the system font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`) for all UI text. Tabular numbers (`font-variant-numeric: tabular-nums`) on all score displays.

| Name | Size | Weight | Usage |
| --- | --- | --- | --- |
| Score Display | 72px / 4.5rem | 700 | Main scoreboard numbers |
| Page Title | 24px / 1.5rem | 600 | Screen titles |
| Section Heading | 18px / 1.125rem | 600 | Panel headers, card titles |
| Body | 16px / 1rem | 400 | Default text, form labels |
| Body Small | 14px / 0.875rem | 400 | Secondary info, timestamps |
| Caption | 12px / 0.75rem | 500 | Badges, court position labels |

### Spacing

Base unit: 4px. All spacing uses multiples: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.

- Page padding: 16px (phone), 24px (tablet)
- Card padding: 16px
- Gap between cards: 12px
- Tab bar height: 56px (includes safe area)
- Top strip height in live mode: 48px
- Minimum touch target: 44 x 44px (all interactive elements)

### Component Inventory

Components built on shadcn/ui (Radix primitives), extended for volleyball-specific needs:

| Component | Source | Notes |
| --- | --- | --- |
| Button | shadcn/ui | Variants: primary, secondary, destructive, ghost. Min height 44px for touch. |
| Card | shadcn/ui | Surface background, border, rounded-lg. |
| SegmentedControl | Custom | For mode switches (Quick/Detailed, Best of 3/5). Uses `--primary` for active segment. |
| ScoreDisplay | Custom | Large tabular numbers with serving indicator dot. |
| TapZone | Custom | Full-area touch target for Quick mode. Success/destructive color tint on press. |
| CourtView | Custom (SVG) | Volleyball court with player markers, trajectory drawing. Theme-aware colors. |
| PlayerMarker | Custom (SVG) | Circle with jersey number. Uses `--team-home` / `--team-opponent`. 44px diameter minimum. |
| RotationIndicator | Custom | Compact badge showing "R3" that opens the rotation drawer. |
| ActionChip | Custom | Tappable pills for action types (Kill, Error, Ace). Min 44px height. |
| BottomTabBar | Custom | 5-tab navigation. Icons + labels. Active tab uses `--primary`. |
| Drawer | shadcn/ui + custom | Right slide-in panel for rotation viewer. 400px wide on tablet. |
| PointCard | Custom | Compact card for point history: score, action, player, rotation. |
| Dialog | shadcn/ui | Confirmation dialogs, settings. |
| Select | shadcn/ui | Team and player pickers. |
| Switch | shadcn/ui | Theme toggle. |

### Touch Target Sizes

All interactive elements meet 44 x 44px minimum on iPad. Critical live-tracking controls (TapZone, ScoreDisplay, ActionChip) use larger targets:

- Quick mode tap zones: full half-screen width x 300+ px height
- Score numbers: 72px tall, 80px wide tap area
- Action chips: 44px height, auto width with 16px horizontal padding
- Player markers on court: 44px diameter (scaled to court viewport)
- Bottom tab bar items: 56px height, equal-width distribution

## Backend Architecture

*Added Oct 28, 2026.*

### Decision: own API on Vercel + Neon Postgres (Option B)

*Confirmed Oct 29, 2026. Auth provider: Neon Auth.*

Two options were considered for replacing Google Sheets with the Neon Postgres database already used by the personal tracker (`playground` repo):

| | A. Add volleyball routes to the `playground` app | **B. Volleyball app gets its own API (chosen)** |
| --- | --- | --- |
| Setup cost | Lowest: reuses an existing Vercel project | A new Vercel project for this repo |
| Deploys | Coupled: a volleyball change redeploys the personal tracker and vice versa | Independent |
| Sharing with other coaches | Other users' traffic and data sit inside a personal app with no login | Built for it: own auth, own users |
| Security | `playground` API has no auth; exposing it more widely exposes personal health and family data | Isolated; volleyball credentials can only reach volleyball data |
| Scaling and limits | Shares function limits and cold starts with the tracker | Scales on its own |
| Same-origin | Needs CORS from GitHub Pages | Frontend and API on one origin, no CORS |

B is chosen because the goal includes sharing the app and adding user-specific features. A is cheaper today but would have to be undone at that point.

### Shape

- **Hosting:** the Vite app and its API deploy together as one Vercel project from this repo. The frontend is unchanged in kind (static SPA); the API is Vercel Functions in `api/`. GitHub Pages stays live until cutover, then redirects.
- **Database:** a **separate Neon project** (or at minimum a separate database) for volleyball, not a schema inside the personal tracker's database. This keeps other people's data away from personal data, allows separate backups, branches and limits, and lets the volleyball app be handed over or open-sourced later. Same stack as `playground`: `@neondatabase/serverless` + Drizzle ORM + drizzle-kit migrations.
- **Auth:** Neon Auth, with a login from day one even while there is only one user. Adding auth after data exists is a migration; adding users to an auth system that exists is configuration.
- **Validation:** every API input is validated with `zod` (already a dependency).
- **Offline:** unchanged. The app keeps writing locally first and syncing through the ordered outbox (`liveSyncEngine.ts`). Only the transport changes from Apps Script to the new API, and writes become idempotent (client-generated IDs) so retries can never duplicate a point.

### Data model (multi-user ready)

Ownership hangs off **teams**, not individual rows, so sharing works the way coaching staff do:

| Table | Key columns | Notes |
| --- | --- | --- |
| `users` | id, email, name | From the auth provider |
| `teams` | id, name, created_by | A coach's own team or a one-off opponent |
| `team_members` | team_id, user_id, role (`owner`, `coach`, `statistician`, `viewer`) | Sharing = adding a member |
| `players` | id, team_id, name, jersey, position, archived | Replaces PlayerInfo sheet |
| `matches` | id (client-generated), team_id, opponent_team_id, date, venue, format, status | Belongs to the home team |
| `sets` | match_id, number, home, opponent, first_serve, winner | |
| `points` | id (client-generated), match_id, set_number, number, winner, serving_before, rotation_before, action_type, action, player_id, opponent_player, payload jsonb, created_at | Quick and Detailed mode share this table |
| `rotation_configs` | match_id, set_number, config jsonb | Mirrors current per-set rotation data |
| `trajectories` | id, match_id, point_id, data jsonb | |

Every API query is scoped through `team_members` for the signed-in user. User-specific features (per-coach defaults, saved systems, preferences) attach to `users`; anything shared attaches to `teams`.

### Cutover rules

1. Sheets remains the source of truth until Neon has recorded real matches correctly.
2. During the transition the app can write to both backends (dual-write in the sync engine) and a comparison script checks they agree.
3. Existing Sheets data (teams, players, matches, points) is imported once with a script and verified by count and score per set.
4. `googleSheetsAPI.ts`, `writeQueue.ts` and `Code.gs` are only removed in Phase 7, after cutover.

## Phased Rebuild Plan

### Phase 0 — Foundation (1 week) ✅ Done

**Status:** merged Oct 27, 2026 (PR #1, `7281a97`).

**Goal:** New project skeleton, design tokens, and theme switching. No feature code yet.

| Task | Files | Effort |
| --- | --- | --- |
| Replace `index.css` with dual-theme token system (light default, dark toggle) | `src/index.css` | 2h |
| Add `ThemeProvider` context with localStorage persistence and system-preference detection | `src/providers/ThemeProvider.tsx` | 2h |
| Build bottom `TabBar` component (5 tabs: Live, Analysis, Scouting, Teams, Settings) | `src/components/TabBar.tsx` | 3h |
| Create `AppShell` layout (content area + TabBar, safe-area insets) | `src/components/AppShell.tsx` | 2h |
| Replace `HashRouter` routes with new IA (/, /analysis, /scouting, /teams, /settings) | `src/App.tsx` | 2h |
| Remove old `NavigationBar.jsx`, orphan routes, purple gradient | Delete `src/components/navigation/` | 1h |
| Add shared UI primitives: `SegmentedControl`, `ActionChip`, `ScoreDisplay` | `src/components/ui/` | 4h |

**Depends on:** Nothing. Start here.

**Exit criteria:** App loads with new shell, theme toggle works, all tabs route correctly, no features yet.

---

### Phase 1 — Live Match: Quick Mode (2 weeks) ✅ Done

**Status:** shipped Oct 27, 2026 (`28ecf59`). Built local-first: matches are stored on the device and synced through an ordered, persistent outbox (`src/features/live/services/liveSyncEngine.ts`) that retries until delivered. Quick-mode points are recorded with `action_type: "Quick"`. Not yet verified against the real Google Sheet.

**Goal:** Head coach can track a full match with two-tap scoring.

| Task | Files | Effort |
| --- | --- | --- |
| Create `MatchContext` with `useReducer` (replace 40+ useState calls) | `src/features/live/context/MatchContext.tsx` | 6h |
| Build `LiveShell` layout: score strip (48px) + content + action bar | `src/features/live/LiveShell.tsx` | 4h |
| Implement `QuickScoreView` with two full-width tap zones (We Scored / They Scored) | `src/features/live/views/QuickScoreView.tsx` | 4h |
| Build set management (Best of 3/5 toggle, auto-advance at 25, deuce logic) | `src/features/live/reducers/setReducer.ts` | 4h |
| Add point history sidebar (slide-in list of `PointCard` components) | `src/features/live/components/PointHistory.tsx` | 3h |
| Implement undo (last-point reversal from reducer history) | In `MatchContext` reducer | 2h |
| Build `MatchSetup` screen (team select, best-of, starting side, serve) | `src/features/live/MatchSetup.tsx` | 4h |
| Connect to existing Google Sheets sync (import `syncService`, `writeQueue` unchanged) | `src/features/live/hooks/useMatchSync.ts` | 3h |
| Wire offline queue with visual sync indicator | `src/features/live/components/SyncBadge.tsx` | 2h |

**Depends on:** Phase 0 (shell, tokens, routing).

**Exit criteria:** Full match recordable in Quick mode with offline support and sync.

**Untouched files:** `src/services/googleSheetsAPI.ts`, `src/services/writeQueue.ts`, `Code.gs`.

---

### Phase 1.5 — Backend Migration: Google Sheets → Neon (1.5 weeks)

**Goal:** Move storage to Postgres behind the app's own authenticated API, without losing data or breaking live tracking. See **Backend Architecture**.

| Task | Files | Effort |
| --- | --- | --- |
| Create Neon project for volleyball (with Neon Auth enabled); Vercel project for this repo with `DATABASE_URL` | Neon, Vercel | 1h |
| Drizzle schema + first migration (users, teams, team_members, players, matches, sets, points, rotation_configs, trajectories) | `db/schema.ts`, `drizzle/` | 4h |
| Auth: sign-in screen, session check on every API route, queries scoped via `team_members` | `api/_lib/auth.ts`, `src/features/auth/` | 5h |
| API routes with zod validation and idempotent writes (client-generated IDs) | `api/` | 8h |
| Typed API client for the new backend | `src/services/api.ts` | 3h |
| Switch `liveSyncEngine` transport to the new API; dual-write to Sheets during transition | `src/features/live/services/liveSyncEngine.ts` | 3h |
| One-off import of existing Sheets data + verification report (counts, per-set scores) | `scripts/import-sheets.ts` | 4h |
| Switch Teams and old match screens from `googleSheetsAPI.ts` to the new client | Various | 4h |
| Move deployment to Vercel; GitHub Pages redirects to the new URL | `vercel.json`, `vite.config.ts` (`base`), `.github/workflows/` | 2h |

**Depends on:** Phase 1 (sync outbox).

**Exit criteria:** At least two real matches recorded with Neon and Sheets in agreement; all historic Sheets data imported and verified; signing in is required; Sheets writes switched off (code kept until Phase 7).

**Rollback:** while dual-write is on, turning off the Neon transport returns the app to Sheets-only with no data loss.

---

### Phase 2 — Live Match: Detailed Mode + Court (2 weeks)

**Goal:** Statistician mode with per-action attribution, court visualization, and rotation tracking.

| Task | Files | Effort |
| --- | --- | --- |
| Build `DetailedScoreView` with action-type chips (Kill, Error, Ace, Block, etc.) | `src/features/live/views/DetailedScoreView.tsx` | 6h |
| Add player attribution step (tap player after selecting action) | `src/features/live/components/PlayerSelect.tsx` | 4h |
| Extract court SVG into standalone `CourtView` component (theme-aware) | `src/features/live/components/CourtView.tsx` | 4h |
| Implement trajectory drawing on court (pointer events, SVG paths) | `src/features/live/components/TrajectoryOverlay.tsx` | 6h |
| Build `RotationDrawer` (right slide-in, 400px, shows current formation) | `src/features/live/components/RotationDrawer.tsx` | 4h |
| Port rotation logic from `rotationHelpers.ts` (keep algorithm, new UI) | `src/features/live/hooks/useRotation.ts` | 3h |
| Add `RotationIndicator` badge in score strip that opens drawer | In `LiveShell.tsx` | 1h |
| Build substitution modal (swap player in/out of rotation) | `src/features/live/components/SubstitutionModal.tsx` | 3h |
| Add mode toggle (Quick ↔ Detailed) in score strip | `src/features/live/components/ModeToggle.tsx` | 1h |

**Depends on:** Phase 1 (match context, scoring, point history) and Phase 1.5 (built directly on the new API).

**Exit criteria:** Statistician can record actions with player, court location, and trajectory. Rotation tracks automatically on side-out.

---

### Phase 3 — Live Match: Opponent Scouting Overlay (1 week)

**Goal:** Capture opponent tendencies during live play without leaving the match screen.

| Task | Files | Effort |
| --- | --- | --- |
| Add opponent layer toggle in score strip (eye icon) | `src/features/live/components/OpponentToggle.tsx` | 2h |
| Build opponent court overlay (opponent markers on far side, different color) | `src/features/live/components/OpponentOverlay.tsx` | 4h |
| Implement tendency tagging (long-press opponent marker → action menu) | `src/features/live/components/TendencyMenu.tsx` | 4h |
| Store opponent data in match context (per-rotation, per-player) | Extend `MatchContext` reducer | 3h |
| Port existing `OpponentTrackingContext` data model (keep structure, new UI) | `src/features/live/context/opponentAdapter.ts` | 2h |

**Depends on:** Phase 2 (court view, rotation tracking).

**Exit criteria:** Coach can tag opponent tendencies by rotation during live match.

---

### Phase 4 — Post-Match Analysis (1.5 weeks)

**Goal:** Review completed matches with filterable stats and visualizations.

| Task | Files | Effort |
| --- | --- | --- |
| Build `AnalysisShell` with match picker | `src/features/analysis/AnalysisShell.tsx` | 3h |
| Create `MatchSummary` view (set scores, duration, key stats) | `src/features/analysis/views/MatchSummary.tsx` | 4h |
| Build `PlayerStats` view (per-player breakdowns, sortable table) | `src/features/analysis/views/PlayerStats.tsx` | 4h |
| Add `RotationAnalysis` view (efficiency by rotation, chart) | `src/features/analysis/views/RotationAnalysis.tsx` | 4h |
| Implement chart components with Recharts (theme-aware colors) | `src/features/analysis/components/Charts.tsx` | 4h |
| Build point replay timeline (scroll through match point-by-point) | `src/features/analysis/components/PointTimeline.tsx` | 3h |
| Add filter controls (by set, rotation, player, action type) | `src/features/analysis/components/Filters.tsx` | 3h |

**Depends on:** Phase 1 (match data model and sync).

**Exit criteria:** Coach can review any completed match with filtered stats and charts.

---

### Phase 5 — Opponent Scouting Report (1 week)

**Goal:** Dedicated scouting view to review and prepare against opponents.

| Task | Files | Effort |
| --- | --- | --- |
| Build `ScoutingShell` with opponent team picker | `src/features/scouting/ScoutingShell.tsx` | 3h |
| Create tendency heatmap (aggregate opponent data across matches) | `src/features/scouting/views/TendencyMap.tsx` | 6h |
| Build rotation-by-rotation breakdown (opponent patterns per rotation) | `src/features/scouting/views/RotationBreakdown.tsx` | 4h |
| Add scouting notes (free-text per opponent, per rotation) | `src/features/scouting/views/ScoutNotes.tsx` | 3h |

**Depends on:** Phase 3 (opponent data capture) and Phase 4 (chart components).

**Exit criteria:** Coach can review opponent tendencies aggregated across matches.

---

### Phase 6 — Teams & Settings (0.5 weeks)

**Goal:** Multi-team roster management and app configuration.

| Task | Files | Effort |
| --- | --- | --- |
| Rebuild `TeamsPage` with multi-team support (add/switch/edit teams) | `src/features/teams/TeamsPage.tsx` | 4h |
| Build player management (add/edit/archive players per team) | `src/features/teams/PlayerManagement.tsx` | 3h |
| Team sharing: invite another coach by email, assign role (coach, statistician, viewer) | `src/features/teams/TeamSharing.tsx`, `api/teams/members` | 4h |
| Create Settings screen (theme toggle, sync config, data export) | `src/features/settings/SettingsPage.tsx` | 3h |

**Depends on:** Phase 0 (shell, routing).

**Exit criteria:** Coach can manage multiple teams and configure app settings.

---

### Phase 7 — Polish & Migration (1 week)

**Goal:** Remove old code, verify PWA, responsive behavior, and deploy.

| Task | Files | Effort |
| --- | --- | --- |
| Delete all old page files (`RotationsPage`, `StatisticsPage`, `AnalyticsPage`, etc.) | `src/pages/` (delete entire directory) | 2h |
| Remove old feature directories replaced by new ones | `src/features/inGameStats/`, `src/features/opponentAnalysis/` | 2h |
| Convert remaining `.jsx` files to `.tsx` | Various | 3h |
| Verify PWA manifest, service worker, offline behavior | `vite.config.ts`, manifest | 2h |
| Test all breakpoints: iPad landscape (primary), iPad portrait, phone | Manual testing | 3h |
| Verify Neon sync end-to-end (create match, record points offline and online, sync) | Integration test | 2h |
| Retire Google Sheets: remove `googleSheetsAPI.ts`, `writeQueue.ts`, `Code.gs`; archive the spreadsheet read-only | Various | 2h |
| Remove the GitHub Pages workflow once the redirect has been live for a while | `.github/workflows/` | 1h |

**Depends on:** All previous phases.

**Exit criteria:** No old code remains. App is fully functional, responsive, and deployed.

---

### Timeline Summary

| Phase | Scope | Duration | Cumulative |
| --- | --- | --- | --- |
| 0 — Foundation ✅ | Tokens, theme, shell, routing | 1 week | 1 week |
| 1 — Quick Mode ✅ | Two-tap scoring, sync, offline | 2 weeks | 3 weeks |
| 1.5 — Backend Migration | Neon, own API, auth, Sheets import | 1.5 weeks | 4.5 weeks |
| 2 — Detailed Mode | Actions, court, rotations | 2 weeks | 6.5 weeks |
| 3 — Opponent Overlay | Live scouting capture | 1 week | 7.5 weeks |
| 4 — Analysis | Post-match stats and charts | 1.5 weeks | 9 weeks |
| 5 — Scouting Report | Opponent review views | 1 week | 10 weeks |
| 6 — Teams & Settings | Roster management, sharing, config | 0.5 weeks | 10.5 weeks |
| 7 — Polish | Cleanup, PWA, retire Sheets | 1 week | 11.5 weeks |

**Total estimated effort: 11.5 weeks** (solo developer, part-time adjust accordingly).

Phases 0–2 (including 1.5) are the critical path. Phase 6 can run in parallel with Phases 2–5. Phase 4 can start as soon as Phase 1 is done (independent of Phases 2–3).
