# Tactic Board — Defence Shadow Mode (Plan)

Status: scoping. Branch: `feature/tactic-board`.

## Goal

A tactic board that runs on phone, tablet and PC. It is built first around one
feature that most boards don't have: **live defence zones**. When the coach drags
the blockers or the hitter, the board immediately redraws which parts of our
court the block covers and which parts are still open for the attack. It also
suggests where the defenders should stand.

## v1 scope

- Full court in portrait, with correct markings: 9 × 18 m, the net, the 3 m lines,
  the centre line and the free zone. Our court is at the bottom.
- Zoom toggle:
  - **Full court**
  - **Defence view**: fits the hitter and the whole of our court
- Draggable icons for home players (numbered), opponents and the ball. Works with
  touch and mouse.
- **Defence shadow mode**: shows the block shadow, the line, cross and seam lanes,
  and suggested defender positions.
- Hit-type overlay: **Hard / Roll / Tip**.
- Defender suggestions can be dragged anywhere, and one button resets them to the
  suggestion.
- Simple drawing: freehand lines and arrows, undo, clear.

Out of scope for v1: other modes (serve receive, transition, attack), save/load,
animation, and the 3D hands model.

## Model (2D)

- Coordinates are in **metres**. x is 0–9 across the court. y is 0–18 down the
  court, with the net at y = 9 and our court at y 9–18. The board is rendered as SVG
  with `viewBox` in metres, so it scales cleanly on any screen.
- **Hitter**: a point on the opponent side, which is the floor projection of the
  contact point.
- **Blocker**: a segment along the net line (y = 9), centred on the icon, of width
  `BLOCK_WIDTH`. In 2D, a blocker icon can only be dragged along the net.
- **Shadow**: every blocker's shadow is a wedge from the hitter's point through the
  ends of its segment, and all the wedges start at the hitter. Each shadow is
  therefore just an **angle interval** seen from the hitter:
  - Merge the overlapping intervals into one solid block. Blockers that touch
    leave no seam.
  - The gaps between merged intervals are the **seams**.
  - The rest of the hitter's reachable fan, clipped to our court, is the **line**
    lane and the **cross** lane.
- The 2D shadow runs all the way to the end line. Later, the 3D model will make it
  end at a finite depth.

### Hit-type zones (first-pass constants, to tune)

Depths are measured from the net.

| Type | Where it can land |
|------|-------------------|
| Hard | Open lanes (line, cross, seams), any depth |
| Roll | Over the block into the shadow, about 2–6 m deep |
| Tip  | 0–3 m, around and just behind the block |

### Defender suggestion (heuristic)

1. Work out the open lanes and their areas (only the parts inside the court).
2. Assign each defender who is not blocking to one target:
   - line lane, deep
   - cross lane, deep
   - widest seam, if it is wider than a threshold
   - tip/roll coverage, short behind the block
3. Put each defender at the centre of their lane at the target depth for that
   lane.
4. Moving a defender by hand overrides the suggestion. **Reset** goes back to the
   suggestion.

## Open notes / to revisit

- **Block sizes (`BLOCK_SIZES` in `engine/defence.ts`).** Tap one of our blockers
  and pick L / M / S. Each size sets two things: how wide the hands are along the
  net, and how far the shadow reaches past the hands, measured along the ball's
  path. Everything past that reach is an "OVER" zone, where a hard hit that clears
  the hands can land.

  | Size | Hand width | Shadow reach |
  |---|---|---|
  | Large | 0.6 m | to the end line |
  | Medium (default) | 0.5 m | 7.5 m |
  | Small | 0.4 m | 5.5 m |

  - Two Small blockers whose icons only touch leave a seam (gap 0.28 m, wider than
    the 0.21 m ball). Tapping a hitter sets the default block squeezed tight
    enough to close it.
  - Where hands overlap, the longer reach wins. A gap too narrow for the ball takes
    the shorter reach of the two blockers beside it.
  - Auto D treats the biggest OVER zone like a seam when there is no real seam.
  - All of these numbers are guesses; tune them against real footage.

- **`BLOCK_WIDTH` = 0.5 m per blocker (hands + forearms).** This is a first guess,
  and it controls almost everything in this mode. Revisit it with real footage.
  Candidate changes:
  - a different width when the arms penetrate over the net than when they reach
    wide
  - a width set per blocker
  - the hands angled toward the court instead of square to the net
- Blockers that are not on the net (late closing or a step back) are not modelled
  yet.
- **3D model**: contact height, the height of the block hands and the downward
  angle of the hit. Together these give a shadow of finite length and deep shots
  over the block.
- How far the hitter can turn the ball: limit the angles the hitter can actually
  hit, instead of the whole court.

## Architecture

The feature is self-contained so that it can be moved into, or out of, any of our
apps:

```
src/features/tacticBoard/
  engine/        pure TS: geometry, shadow intervals, lanes, suggestions (unit-tested)
  components/    Court, Icon, DefenceOverlay, DrawLayer, Toolbar
  state/         board state (icons, mode, zoom, drawings) — local reducer
  TacticBoardPage.tsx
```

- Nothing outside this folder is imported except shared UI primitives.
- The engine does not depend on React.
- The board is mounted as a single route or tab.

## Phases

1. ✅ Court rendering, portrait layout, zoom toggle, draggable icons.
   - The board is the **Tactics** tab (`/tactics`). Multi-touch drag works. The hitter
     is opponent 4 for now (dashed ring); picking a different hitter comes in Phase 2.
   - The view widens to fit the screen instead of letterboxing. On a portrait phone,
     Defence view only zooms in a little because the width limits it: our half is
     9 × 9 m and the screen is tall.
   - ⚠️ `vitest`/`jsdom`/`@testing-library/*` are referenced by `vitest.config.ts`
     but not installed. Add them before writing the Phase 2 engine tests.
2. ✅ Shadow engine (pure, with tests), plus the shadow and lane overlay.
   - **Blockers are detected automatically.** Any home player within 1 m of the net
     counts as a blocker, and snaps onto the net when you let go. Their hands
     (`BLOCK_WIDTH`) are drawn on the net.
   - **Choosing the hitter.** Tap an opponent to make them the hitter. A drag that
     moves less than 6 px counts as a tap.
   - **The ball has to fit through a gap.** Any gap at the net narrower than the
     ball (`BALL_DIAMETER` = 0.21 m) counts as closed. This applies to seams and to
     the slivers next to the antennae.
   - **Icon size is tied to block width.** `PLAYER_RADIUS` = 0.34 m, chosen so that
     blocker icons that touch on screen leave a gap smaller than the ball, so they
     read as a closed block. If `BLOCK_WIDTH` is changed, re-derive the radius from
     `2r - BLOCK_WIDTH < BALL_DIAMETER`.
   - **What the shadow is drawn from.** The shadow comes from the hitter icon, not
     the ball. Using the ball as the contact point is a possible later change.
   - **Lane naming.** "Line" is the lane along the hitter's own sideline, decided by
     which half of the court the hitter is in. For a middle attacker this split is
     arbitrary.
3. ✅ Hit-type overlays (Hard / Roll / Tip / All), in `engine/hitZones.ts`.
   - **Hard:** the open lanes (line, cross, seams), at any depth.
   - **Roll:** the block shadow cut to the band 2–6 m off the net (`ROLL_DEPTH`).
     A shadow that crosses the sideline before 2 m has no roll zone.
   - **Tip:** a box 0–3 m off the net (`TIP_DEPTH`), reaching 1.5 m beyond the
     block on each side (`TIP_SPREAD`). With no block, it covers the whole short
     area.
   - **Faded lanes:** in Roll and Tip, the hard lanes are drawn at 35% so the
     picture keeps its context.
   - On phones, the "Tap opponent…" hint is hidden to save room for the court.
   - To tune: `ROLL_DEPTH`, `TIP_DEPTH` and `TIP_SPREAD` are first guesses. A hard
     hit probably can't land very short, so the Hard view may need a minimum depth.
     Roll and tip zones should also depend on where the hitter is.
4. ✅ Defender suggestions and reset (`engine/defenders.ts`).
   - **Who defends:** every home player who isn't blocking.
   - **Spots, in priority order:**
     1. one digger per open lane of at least 1 m², biggest first, at the lane's
        centre 3.5–8.3 m off the net
     2. tip cover (the middle of the tip box)
     3. roll cover (the middle of the biggest roll zone)
     4. deep middle as a fallback
   - **Who goes where:** spots are matched to defenders by the smallest total
     distance, trying every pairing.
   - **Distance from the net:** spots are never placed within 1.5 m of the net.
     Otherwise a defender would land in the block zone and become a blocker
     (found by a test).
   - **Auto D (on by default):** defenders follow their spots, and glide there.
     - Drag a defender and it stays where you put it, with a dashed ghost on its
       suggested spot.
     - **Reset D** clears those overrides.
     - The board's ↺ resets everything but keeps the view settings.
   - **Replaced by defence systems (below):** the first version of Auto D placed
     players from the shape of the open zones alone.
6. ✅ Defence systems for Auto D: **Off / Perimeter / Rotational**. These are the
   systems the coach uses. Middle-up was left out on purpose.
   - **How spots are set.** Each system lists its jobs with a textbook spot for an
     attack from our right (`SYSTEM_ROLES` in `engine/defenders.ts`). The spots are
     mirrored for an attack from our left, then adjusted by the block shadow:
     - **Line and cross diggers** stand 0.5 m outside the shadow edge, where they
       can see the hitter. They are moved by at most 1.5 m (`MAX_SHADOW_NUDGE`).
     - **The tip player** stands 0.6 m inside the middle of the block, 2.6 m off the
       net.
     - **The seam player** moves into a split block's seam: deep middle in
       perimeter, deep cross in rotational.
   - **Number of defenders.** Jobs are listed in priority order. With 3 defenders
     (a triple block) the last job is dropped. With 5 (a single block) a fifth job
     is used: tip in perimeter, deep middle in rotational.
   - **Switching system** drops any hand placements, so defenders start again from
     the new system's spots.
   - **Toolbar position.** The drawing toolbar moved below the court; floating, it
     covered the deep line corner on phones.
   - **To check with the coach:**
     - the textbook spots;
     - whether the line digger should come up for tips when the block takes the
       line away completely (right now they stay near the sideline);
     - attacks from the middle, which use the same left/right logic split at
       x = 4.5.
   - **2D side effect:** the shadow runs all the way to the end line, so a deep
     digger is often pushed toward the sideline. The 3D hands model will fix this.
5. ✅ Drawing: lines, arrows, undo, clear (`engine/drawing.ts`, `components/DrawLayer.tsx`).
   - **Toolbar:** a floating bar at the bottom of the board with **Move / Pen /
     Arrow**, Undo and Clear.
   - **Drawing tools:**
     - Pen draws freehand, smoothed with curves through midpoints. Samples closer
       than 6 cm are dropped.
     - Arrow draws a straight line from where you press to where you let go.
     - A stroke shorter than 25 cm counts as a stray tap and is thrown away.
   - **Players while drawing:** with Pen or Arrow selected, players can't be
     grabbed, so a stroke can start right on top of one (for example, an arrow
     showing where a player runs). Switch back to Move to drag players again.
   - **Ink:** yellow with a dark outline, so it shows on every zone colour in both
     themes.
   - **Undo:** removes only drawings, not player moves.
   - **↺ (reset board):** clears drawings but keeps the selected tool.
   - Ideas for later: undo for player moves, several ink colours, saving and
     loading boards.
7. ✅ 3D view (`components/three/Viewer3D.tsx`, `engine/view3d.ts`, `engine/attack.ts`).
   Opened from the **3D** button or a defender on the 2D board; three.js only loads then.
   - **Layers:** Bird (whole court; starting angles Side / Above / Hitter, orbit
     on drag, zoom on pinch) → Follow N (third-person, just behind a defender:
     their body and the floor round them) → Eyes N (their own view: Ready crouch
     or Standing). The 2D page's **3D** button opens Bird; **View from N** on a
     defender opens Eyes. Back (‹, or Escape) always goes up one layer, ending
     on the 2D board. In Bird, tap a defender to select them and get
     **Follow N ›**, or double-tap them.
   - **Heights:** players by block size (L 1.9 / M 1.8 / S 1.6 m); blockers'
     arms over the net by L/M/S; men's 2.43 m or women's 2.24 m net (⋯ menu).
   - **Moving players:** drag any of our players, the hitter, or use the Adjust
     chips and arrows (hold to repeat). Blockers pulled off the net stop
     blocking; defenders dragged into the block zone snap on. Tap an opponent
     to make them the hitter (default block, Auto D, view re-aimed).
   - **Holding the viewer:** the defender you look through stays put while the
     block moves, so the camera doesn't jump; a banner shows the Auto D spot
     ("Go there"). Moving yourself keeps you hand-placed after leaving 3D.
   - **Contact height:** net + 0.15 to + 1.3 m, 5 cm steps (3D only for now).
   - **Attack animation:** ▶ Random or Choose… (tip, roll, hard at me / left /
     right / line / cross / seam, off the block). Real projectile motion, a
     trail, one bounce and a landing ring. Whether a hard hit is blocked
     follows the 2D shadow; blocked hits deflect (stuffed, short, up, out).
     Random is weighted to what's open. Speed ½× (default), ¼×, real. The
     attack survives a camera change, so Again replays it from another angle.
   - **First guesses to tune:** spike speed 24 / 20 m/s (men / women), hand
     penetration 25 / 15 / 8 cm (L / M / S), Random's mix, bounce.

## Ideas / roadmap

Not built yet, in rough order of value (coach's call). Recorded 2026-11-04.

### Tactics-board basics

1. **Save and share setups.** Named plays ("vs their 4, Perimeter, Small
   middle") that come back in one tap; a link to send one to a player. The
   biggest gap today: everything is lost on reset.
2. **Multi-step plays.** Step 1 serve receive → step 2 transition → step 3
   defence, with players animating between steps in 2D and 3D.
3. **Rotations and serve receive.** Pick rotation 1–6 and a system (5-1, 6-2)
   and the board places all six; reuse the app's existing rotation logic
   (`src/utils/rotationHelpers.ts`).
4. **Undo for player moves** (undo only covers drawings now).
5. **Names and roles.** Player names instead of numbers, libero colour,
   setter / OH / MB labels.

### 3D view

- **Sightline check:** can each defender see the hitter's arm at contact?
  ✓/✗ badges on the 2D defenders too. Warn first; maybe let Auto D nudge
  defenders later.
- **Defenders react** to the hit and move to dig, showing whether they can get
  there in time.
- **The set and the approach** before the hit (timing, reading the setter).
- **Blockers jump in time** with the hitter instead of hanging in the air.
- **Contact height drives the 2D shadow** (a higher hit makes a shorter
  shadow); now it only changes the 3D flight.
- **Left-handed hitters** (Left / Right toggle).
