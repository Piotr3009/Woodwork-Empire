# Report: Turn 16

The men walk the floor: Piotr's three notes on the hall of v22 and the Projects chip, built in
one session, one agent, serial, in the chat with Piotr (not in Claude Code), 16.09.2026.

Base: `52a4de7` on `main`, the Turn 15 merge, `APP_VERSION` `v22`, `STATE_VERSION` 14, which is
the brief's precondition. The work is delivered as files for Piotr to put on a branch and push
himself, so there is no branch name and no PR from this session; the PR title the brief asks for
is `Turn 16: the men walk the floor`. 1,495 tests green and three todo in 152 files, up from 1,481
and three todo in 148 files at the end of Turn 15. `npm run check` green on its own exit code on
the finished tree (lint, `tsc`, the build, the suite).

`STATE_VERSION` stays at 14. No field was added to the state: a figure's cell and path are render
state in `src/render/walkers.ts`, rebuilt from the stations on a fresh view.

---

## 0. Blockers

None that stop the build. Two things the brief asks for could not be done from this chat:

1. **The ten pictures of T16-07.** The chat's container has no Chromium and no Playwright, so
   `docs/report-t16/` is not delivered. The tests of section 8 stand in for the look, and the
   pictures are the first thing to take after the merge (section 10).
2. **`docs/mockups/t16/`** is not on `main` (the Turn 16 pack was not pushed before this session),
   so the brief's reading list could not be followed for the drawing; the contract in the brief
   itself, section 2, was built as written.

---

## 1. Done

- **T16-01 Housekeeping and v23.** `docs/turn-15-brief.md` is the root `CLAUDE.md` of the Turn 15
  merge commit, byte for byte (`git show 52a4de7:CLAUDE.md`); the README's briefs line names it;
  `APP_VERSION = 'v23'`; the root `CLAUDE.md` is the Turn 16 brief. Done: the version tests read
  `v23`.
- **T16-02 The Projects chip.** `Projects: N` between the day meter and `Orders: N`, `N` from
  `openJobs(state).length`, `data-modal="workPlan"`, there at `Projects: 0` from day one, pulsing
  on `news.projects` (never set tonight, section 2). Done: `tests/ui/projectsChip.test.ts`.
- **T16-03 The station table.** `STATION_TABLE` in `src/engine/stations.ts`, `standingCell`,
  `facingAt`, `facingTowards`, `freeSideOf`, `palletCell`, `facingAtPallet`; `frontOf` and
  `FIGURE_FACING` deleted from `hall.ts`; `stationCell` returns the cell and the facing and every
  figure is drawn on it, facing its item. Done: `tests/engine/stationTable.test.ts` (ten tests:
  every row the brief names, the rack on five placements, the pallet cell and its fallback, the
  facing rule) and the render tests in `figures.test.ts` and `views.test.ts`.
- **T16-04 The network.** `src/engine/walk.ts`: `isFree`, `walkPath` (breadth first over the four
  neighbours, the straight line when boxed in), `footprintCells`, `straightLine`. Done:
  `tests/engine/walk.test.ts` (round a footprint, round the rooms, down the gate lane, the fallback).
- **T16-05 The walker.** `src/render/walkers.ts`: one walker per figure, `syncWalkers` after every
  render and `stepWalkers` on every frame, real time at `WALK_CELLS_PER_SECOND`, never more than a
  cell a frame, carry on the legs `legCarries` names, the unloading loop with its legs kept in
  order, the log of arrivals and loops; the `.figure` CSS transition and the Turn 2 slides in
  `app.ts` deleted. Done: `tests/render/walkers.test.ts` (a fake clock: cell by cell to the saw at
  the constant's pace, no jump on a station change mid walk, five loops for ten sheets and the
  loop closed before the bench); the sixty tick stability test still green.
- **T16-06 The pipes.** `src/render/pipes.ts`: `pipeTile` for the nine kinds, `gateCollarArt`,
  `portRing`; `pipeCellArt` in `hall.ts` picks the delivered file and otherwise the helper; the
  Turn 4 `ductRun`, `ductDrop`, `ductDrops`, their CSS and constants deleted; `centralRunArt` draws
  a central system through the same helper; `portRings` and `notConnectedLabel` mark a machine
  with no pipe; the `unconnected` tip under the hall through `withTip`. Done:
  `tests/render/pipesOnTheHall.test.ts` (the 2.3 test as written) and `hall.test.ts` updated; the
  office hover test still green.
- **T16-07 Look and shoot.** Not done from the chat (section 0).
- **T16-08 Report.** This file. No push, no PR: Piotr pushes.

---

## 2. Numbers chosen

| Number | Value | Where | Note |
|---|---|---|---|
| `WALK_CELLS_PER_SECOND` | 1.6 | `constants.ts` | the brief's figure [TUNE] |
| `PIPE_DIAMETER` | 0.2 m | `constants.ts` | the brief's figure [TUNE]; drawn as a 5 px stroke at the rise of a metre |
| `PORT_RING` | 8 px | `constants.ts` | the brief's figure [TUNE]; the pulse breathes it between 6 and 8 |
| `EDGE_LIFT` | 2 px | `render/pipes.ts` | the lighter top edge, a third of the stroke [TUNE] |
| the pipe joint | half the stroke | `render/pipes.ts` | a disc where the arms of an elbow or a tee meet, so it reads as one bent pipe [TUNE] |
| the drop's ring | 5 px | `render/pipes.ts` | the port a drop lands on, the stroke's width [TUNE] |
| the inlet's collar | 1.5 times the stroke | `render/pipes.ts` | [TUNE] |
| `news.projects` | never true | `topbar.ts` | the brief left the pulse open ("or never"); the field is there and nothing sets it |
| the tip's words | as the brief wrote them | `constants.ts` `TIPS.unconnected` | [TUNE the words] |
| the pallet's facing | the pallet's centre | `stations.ts` | west from the first cell, south from the fallback, as the brief says, computed and not written |
| the office and canteen door facings | north at the office door, south west at the canteen door | `hall.ts` | not in the brief; a man at a door faces the door, a man idle at the canteen faces the hall |

---

## 3. The station table as built

Offsets from the whole cells the footprint is counted on (`footprintCells`: the cell the origin is
in, as many cells as the class is wide and deep). `front` is `y + depth`, `back` is `y - 1`,
`left` is `x - 1`, `right` is `x + width`; `along` counts from the item's first cell, `right` is
the last, `middle` is `floor(extent / 2)`; `out` is cells beyond the first.

| Family | Operator | Waiting | Second |
|---|---|---|---|
| tableSaw | front, right | front, 0 | none |
| thicknesser | left, 0 | left, 0, out 1 | none |
| spindleMoulder | front, 0 | front, right | none |
| edgebander | front, 1 | front, 0 | none |
| cnc | front, right | front, middle | back, middle |
| sprayBooth | front, middle | front, 0 | none |
| workbench | front, 0 | front, right | back, right |
| sheetRack | the free side, middle | the free side, middle, out 1 | none |
| extractor | the free side, middle | the free side, middle, out 1 | none |
| anything else | front, 0 | front, 1 | none |

The free side is the side with the most free cells in the two rows beyond it, front first on a
tie. The fallback for a taken cell is the same offset turned to the first free side in the order
front, back, left, right; when nothing is free the table's cell stands and the straight line walk
still gets him there. The edgebander row is written as "the second cell" and reads the width off
the footprint, so a 4 by 1 edgebander later needs no change to the row.

Facing: `facingTowards(from, to)` is the same arithmetic as `facingFromScreen` (world +x is
down-right on the screen, world +y is down-left), without the renderer, so the engine can say
which way a man faces.

---

## 4. Deleted

- `src/render/hall.ts`: `frontOf`, `FIGURE_FACING`, `ductRun`, `ductDrop`, `ductDrops`, the local
  `PALLET_LAYOUT` (now the engine's constant, re-exported), the `Facing` import from characters.
- `src/engine/constants.ts`: `DUCT_SPAN`, `DUCT_WIDTH`, `DUCT_DEPTH`, `DUCT_THICKNESS`,
  `DUCT_SPRITE_SUFFIX` (the four sizes were read only by `ductRun`).
- `src/ui/app.ts`: `FIGURE_SLIDE_MS`, `slides`, `translateOf`, `pointOf`, `positionAt`,
  `slideFigures`, the local `Point` interface, and the imports of `faceCharacter`,
  `facingFromScreen`, `setCharacterAnimation` (the walker does that now).
- `src/ui/styles.css`: the `.figure` transition, `.duct-run`, `.duct-drop line`, `.duct-port`,
  `.duct-drop.is-flexi .duct-port`, and the placeholder rules for `.pipe-tile` and `.gate-collar`.
- `tests/render/ducts.test.ts` (replaced by `tests/render/pipesOnTheHall.test.ts`).
- The `(no pipe)` suffix on a machine's name in the hall (now the `not connected` token under it).

Nothing else was removed. `ductSystemOf` and `DUCT_SYSTEMS` stay as the engine's knowledge of what
is a central system; `DUCT_HEIGHT` stays as the height of every pipe.

---

## 5. Deviations from the contract

1. **Built in the chat, delivered as files.** No branch, no PR, no screenshots (section 0).
2. **`footprintCells` counts a class's whole width from the cell its origin is in**, not every
   cell its half metres touch. A 2 by 1 centred in a 3 by 3 zone starts half a cell in; counting
   every touched cell would make it three wide and put the saw man's "right cell" a cell to the
   right of the machine's end. Counting from the origin keeps him on the cells the port and the
   old front cell were counted on (`portCell`, `frontOf`), which is what the figures test of Turn 7
   asserts about "the front edge of the saw itself".
3. **The unloading loop at high speed walks every queued leg,** not only "the loop it is on". The
   brief says both that the number of loops is `ceil(sheets / SHEETS_PER_TRIP)` and that the
   walker "finishes the loop it is on"; when the engine finishes first the queued legs are the
   loops the sheets still owe, so they are walked, the loop is closed at the pallet, and then he
   goes to the new station. The test asserts five loops for ten sheets and the bench last.
4. **The flag of the loop is on the page, not on the walker's own reading of stations.** The hall
   marks a figure `data-unloading="1"` while a delivery is arrived and not unloaded and his
   station is the gate or the rack. A man fetching sheets from the rack while a pallet waits for
   somebody else carries the flag too; the only effect is that a new order queues behind the leg
   he is on instead of turning him, which is what a man carrying a sheet would do anyway.
5. **The central system's run** is one `pipe.ew` tile per cell along the rear wall at the pipes'
   height, and a run of `pipe.ns` from each machine's port up to it ending in a `pipe.tee` (a
   `pipe.drop` alone when the port is on the wall row), keyed by `tileKeysFor` so the tiles obey
   the same rule as the routed runs. The brief says "a drop to every machine"; a drop with no run
   to the wall would hang in the air, so the run is drawn.
6. **The tip under the hall** comes through `withTip('', state, 'unconnected')`, the one helper
   `tipsLast.test.ts` insists on, as the last child of the view, after the notes and the controls.
7. **`OFFICE_REGION_MODALS` is exported** from `app.ts` so the chip test can prove the chip and the
   office board open the same id without clicking through the office.
8. **The facings at the office door, the canteen door and a bare bench** are not in the brief's
   table (it has no row for them); they are set once in `stationCell` (section 2).
9. **Two existing tests were rewritten rather than deleted:** `app.test.ts` "the sliding figures"
   is now "the walking figures" with the same assertion (the rebuilt node starts where he had got
   to), and `store.test.ts` and `app.test.ts` look for the work plan modal inside `.modal-layer`,
   because `[data-modal="workPlan"]` now also matches the chip.
10. **`tests/engine/stationTable.test.ts` is a new file** beside the existing
    `tests/engine/stations.test.ts`, which is unchanged.

---

## 6. Walks the scenarios hit that had no free path

Not instrumented. The scenarios do not run the walker (it lives in the renderer and the scenario
harness does not build the page), and `walkPath` is called by nothing in the engine, so no
scenario can hit the fallback. The fallback is exercised by `tests/engine/walk.test.ts` (a target
inside a room). Instrumenting the sixteen months for it would mean rendering the hall in every
month, which the brief does not ask for and the suite's three minutes would not thank.

---

## 7. Cross check (section 7)

- **One rule per family.** `grep -n "frontOf\|FIGURE_FACING" src/render/hall.ts`: nothing. Every
  figure's cell comes from `stationCell`, which reads `standingCell` and `palletCell`; every
  facing from `facingAt`, `facingAtPallet`, `facingTowards` or the walker.
- **The free side.** The rack tests: under the canteen (front, north), against the front kerb
  (back, south), against the left wall (not left), against the right wall (not right), in the open
  (front). Green.
- **One network.** `grep -rn "queue.shift\|neighbour\|STEPS" src/render`: nothing; the renderer
  calls `walkPath` through the path finder `syncWalkers` is given and nothing else.
- **No jump.** `walkers.test.ts` asserts the transform never moves more than one cell on the screen
  between two frames, on the walk to the saw and after a station change mid walk.
- **Real time.** `stepWalkers(root, nowMs)` reads the frame clock; `grep -n "clock" src/render/walkers.ts`: nothing.
- **One pipe drawing.** `grep -rn "duct-run\|duct-drop\|ductRun\|ductDrop" src/render src/ui/styles.css`:
  nothing; `grep -n "placeholder" src/render/pipes.ts`: nothing; `pipeCellArt` draws a pipe tile by
  the helper and never by `placeholder`.
- **Connected reads on the hall.** `pipesOnTheHall.test.ts` is green; `catalogue.ts` is untouched,
  so the machine card's `Connected, N m of pipe` and `Connect to extraction, £x` are as they were.
- **The chip.** `projectsChip.test.ts` proves `Projects: N` opens `workPlan` and that the office
  board's region opens the same id.
- **The look.** Not taken (section 0).

---

## 8. Tests

1,495 green, three todo, 152 files. New: `tests/engine/walk.test.ts` (4), `tests/engine/stationTable.test.ts` (10),
`tests/render/walkers.test.ts` (3), `tests/render/pipesOnTheHall.test.ts` (4),
`tests/ui/projectsChip.test.ts` (2). Updated for the new drawing: `tests/render/hall.test.ts`,
`tests/render/figures.test.ts`, `tests/render/views.test.ts`, `tests/ui/app.test.ts`,
`tests/ui/store.test.ts`, `tests/ui/spriteCheck.test.ts`, `tests/ui/tips.test.ts`,
`tests/ui/version.test.ts`, `tests/ui/saveCheck.test.ts`. Deleted: `tests/render/ducts.test.ts`.

---

## 9. How to run

`npm ci`, `npm run check`. The hall at `npm run dev`: place a saw and an extractor, connect one
saw and not the other, and watch the ring; order sheets and unload by hand at x1 to watch the loop.

---

## 10. What to do first after the merge

1. Take the ten pictures of T16-07 into `docs/report-t16/` and look at them: the joint discs on
   the elbows and the lighter edge are chosen by eye in the abstract and may want a pixel either
   way.
2. Push `docs/mockups/t16/` so the brief's reading list is whole.

---

## 11. Open questions for Piotr

1. The Projects chip never pulses tonight (`news.projects` is never set). Should a stage change
   set it, the way a new enquiry sets the Board's?
2. A man at the extractor to empty the bags stands on its free side; the brief says "the bag
   side (the side away from the wall)". Is the free side the bag side, or does the unit's picture
   have a bag side of its own that the table should name?
3. The thicknesser man faces along the machine towards +x (south east on the screen). If the
   infeed is at the other end on the picture, the row should say `right, 0` instead of `left, 0`.

---

## 12. Known risks

1. The walker's animation and facing are written with `setCharacterAnimation` and `faceCharacter`
   without options, so they read the real `characters.json`; the tests with custom sheets exercise
   the transform and the log, not the sheet swap. The sheet swap itself is Turn 9's code.
2. A path is computed when a figure sets off and not again; a machine placed on the path after
   that is walked over until the next station change.
3. At `x30` with a big delivery the queued legs can outlast the day: he keeps walking after the
   engine has moved on, which is what the brief asked for, and a load or a scene change resets him.
