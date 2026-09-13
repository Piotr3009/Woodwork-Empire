# Turn 6: the rest of Turn 5, and a hall you can zoom into

Woodwork Empire. Autonomous session brief for Claude Code (Opus 5, effort ultracode, cloud).
Owner: Piotr. Programmer: Claude. Spec author: Claude (chat), 13.09.2026.

Why this turn exists: the Turn 5 brief never reached the repository, so the Turn 5 session (PR #6)
built the hall, the metre grid, the flicker fix and a minimal break from the PR title and
`docs/art/SPRITES.md` section 9 alone, and said so in `REPORT-T5.md` section 0. Everything else the
owner decided for Turn 5 is still undone. This brief is that remainder, plus what Piotr saw on the
new hall. `docs/turn-5-brief.md` (created in T6-01 from the file Piotr now adds) is the original
text for reference; where it and this file differ, this file wins.

Read this whole file, then `docs/art/SPRITES.md` in full, then `REPORT-T5.md` (sections 0, 4, 5, 8,
9: what was chosen without a brief and must now follow the owner's rules), then the archived briefs.
All standing rules apply (no em or en dashes, scope 1:1, one code path, constants never in the UI,
retag `[TUNE]` to `[PIOTR]`, kill background processes, PR without merge, end the session, no PR
watching).

---

## 0. What Piotr said on the Turn 5 hall

1. "I enter the office through the canteen." Clicking where the canteen stands opens the office.
   (3.1)
2. "The company name is not on the wall at an angle." It must follow the wall plane. (3.2)
3. "Everything is too far away; I have no way to zoom into details, and there should be one." (3.3)
4. Room labels sit over the doors and the name is dark on dark. (3.2)

And from his Turn 5 answers that the session never saw: the working day (3.4), tool cabinets (3.5),
catalogue tabs and machine hours (3.6), deadlines (3.7), earned rate (3.8), accounting by day (3.9),
the two audit leftovers (3.10).

---

## 1. State of the repo

`main` after PR #6: 562 tests, hall on a 1 m grid from three painted layers, no flicker, a 30 minute
break on top of the 480 minutes, the old overtime model (0.8/0.6/0.4/0.4 and fatigue 0.05) still in
place, `STATE_VERSION` 4. `REPORT-T5.md` section 8 lists the numbers the session chose; several of
them are replaced below by the owner's.

---

## 2. Rules restated (short)

Everything from Turns 1 to 5. Tonight in addition:

- **The owner's numbers replace the session's guesses.** Where `REPORT-T5.md` section 8 chose a value
  and this brief gives Piotr's, Piotr's wins and is tagged `[PIOTR]`. The old constants are deleted,
  not kept beside the new.

---

## 3. Changes to the design (the contract)

### 3.1 Office entered through the canteen (bug) `[PIOTR]`

Reproduce on `main`: click the canteen block, then the office block, and record which view opens.
The likely cause is the click regions of the room layers: the office and canteen layers share one
canvas, so the transparent part of the canteen layer sits over the office block and catches the
click, or the footprint polygons are swapped. Fix: hit-testing uses the room footprint polygons in
canvas coordinates (office x 1..3, y 0..4; canteen x 3..5, y 0..4; WC x 0..1, y 0..2), never the
layer images. Test: a click at the projected centre of each room's front face opens the right thing.

### 3.2 Company name on the wall, labels off the doors `[PIOTR]`

- The company name is painted onto the rear wall plane: SVG text with a transform that skews it into
  the wall (the rear wall runs along world x, so the text baseline follows the (x, 0, z) plane: a
  `matrix` that maps 1 m along x to (+24, +12) at 1x and 1 m of height to (0, -24)). Box per
  SPRITES.md 9.5 (canvas x 300..560, y 130..200). Colour: dark warm grey on the off-white wall with a
  1 px lighter outline so it reads on the blockwork. Fit-to-width as in Turn 5, minimum 11 px.
- Room labels move off the doors: each label sits on the room's front face **above the door**, in
  the top third of the face, also skewed into that face's plane (the y = 4 faces run along world x).
  Contrast as above.
- Test: the name's transform maps its baseline onto the wall plane (two projected points checked);
  no label rectangle intersects a door rectangle.

### 3.3 Zoom and pan in the hall `[PIOTR]`

- Mouse wheel over the hall zooms around the pointer: scale from "fit" (the current letterboxed
  scale) to 4x fit, in steps of 1.2. Drag with the left button on empty floor (or hold space) pans.
  Buttons under the hall: "Fit", "+", "-". Double click on an object zooms to 2x centred on it.
- The zoom is one transform on the scene group (painting, sprites, figures, effects, text). Nothing
  is re-laid out; hit-testing uses the same transform. Setup mode drag works at any zoom.
- Zoom and pan are UI state, not game state: they do not go into `GameState` and reset to fit when
  the hall is re-entered `[TUNE: reset or remember; report it]`.
- Test (jsdom): wheel events change the scene transform within the bounds; Fit restores it; a click
  on an object at 2x resolves to the same object as at fit.

### 3.4 The working day `[PIOTR]` (replaces the Turn 5 session's break and the Turn 1 overtime)

- Clock 08:00 to 17:00. Break 60 minutes at 12:00 `[PIOTR: an hour]`. The 480 working minutes stay
  untouched by the break (the session's `workedMinutesOfDay` helper is right, keep it). The day now
  ends at 17:00, not 16:30.
- At 12:00 an event: "Break. Take it / Skip it". Skipping gives the owner 60 more working minutes
  today and sets tomorrow's labour factor to 0.97 for the owner `[PIOTR]`. Staff always take it.
- At 17:00 an event: "End of day. Go home / Stay for overtime". Overtime until 19:00 at the latest
  (Menu "End day" ends it earlier). Any day with overtime adds 0.10 to an overtime debt;
  tomorrow's labour factor = 1 minus debt (times 0.97 if the break was skipped), cumulative, floor
  0.5 `[TUNE]`, reset to zero on Monday morning `[PIOTR]`.
- Delete `OVERTIME_EFFICIENCY`, `FATIGUE_PER_OVERTIME_HOUR`, the twelve hour wall and their tests.
  Staff overtime: 1.5x pay, up to 2 hours, within 17:00 to 19:00 (Turn 1 rule kept).
- The top bar shows "Output 0.87" when the factor is below 1.
- Tests: break skip 0.97 then 1.0; three overtime days give 0.7 on the fourth morning; Monday resets;
  the clock never passes 19:00; the day ends at 17:00 with no overtime.

### 3.5 Tool cabinets and the edgebander `[PIOTR]`

- Catalogue item `toolCabinet`, 1 × 1 × 1 m, 350 `[TUNE]`, Storage tab. One per worker and one for
  the owner are prerequisites: hiring needs a free cabinet; the hand edgebander and the hand tool set
  cannot be bought without one ("needs a tool cabinet").
- The hand edgebander has no footprint and no cell; it is stored in a cabinet and used at the bench.
  Bag interval and effects unchanged; no machine ratio applies to it.
- Tests: hiring blocked without a cabinet; the edgebander cannot be placed and cannot be bought
  without a cabinet.

### 3.6 Catalogue tabs, Owned tab, machine hours by capacity `[PIOTR]`

- Catalogue tabs in this order: Sheet machines, Timber machines, Spraying, Sanding, Hand tools,
  Extraction, Computers, CNC, CNC centre, Handling, Storage. Every item has a `tab`; a test asserts
  it. Empty tabs say "Nothing here yet". The filter and its clear cross stay, scoped to the tab.
- **Owned** tab: every machine and item the hall has: variant, hours used, endurance hours, next
  service day, state (running, stopped: bag full, broken, no extraction), Service or Repair buttons
  (same actions as the hall).
- **Machine hours by capacity:** each family has `capacity` (table saw 3 `[PIOTR]`, others 2
  `[TUNE]`). Hours per day = min(workers using it today, capacity) / capacity × 8 `[PIOTR]`. Bags,
  service and endurance all count these hours; replace the Turn 3 accumulation.
- Tests: one worker on the saw for 3 days gives 8 hours, two workers 1.5 days; Owned lists hours and
  state; every item has a tab.

### 3.7 Deadlines `[PIOTR]`

- Deadline days = round(ownerDays × 0.9 + 3) clamped to 3..30, plus slack: P up to 3,000: random
  0 to 2 days `[PIOTR: 3 to 5 total for small jobs]`; above: plus 10 to 15% of the formula. Express:
  0.6 × the standard result, minimum 3.
- `ownerDays` = labour value / owner labour per day with the machines the hall has now.
- The per-template deadline ranges are deleted.
- Tests: 500 shelves give 3 to 5 days; a 15,000 kitchen 18 to 23 standard, 11 to 14 express;
  deterministic per seed.

### 3.8 Earned labour rate `[PIOTR]`

Selector `earnedRate(state, span)`: labour value produced divided by people-hours worked, machines
included, weighted by hours actually worked. Shown in Accounting ("Earned labour rate: today 38.4 /
h, this month 35.9 / h") and on the end of day summary. Tests: owner alone with the used saw 38.0;
standard saw 42.0; owner 4 h at 42 plus a poor joiner 8 h at 25.2 gives 30.8.

### 3.9 Accounting by day `[PIOTR]`

Accounting modal: **Days** tab (one row per day of the month: income, outcome, net with plus or
minus colour, expandable to the ledger lines, the day's summary opens from the row), **Summary** tab
(today, week, month, earned rate), **Ledger** (last 200). The end of day summary modal is the same
component the Days tab opens. Tests: day nets equal the ledger; a past day's summary opens.

### 3.10 Leftovers

- Cadence control (day / week / month) in the Menu as well as in the summary.
- Office board company name: shrink to fit before ellipsis (same helper as the hall).

### 3.11 Table saw sprites (art side note, no code beyond the loader)

GPT delivered approved *previews* of four saw classes (`tableSaw.budget/standard/pro/industrial`,
1536 × 1024 RGB). They are not sprites yet: the loader expects RGBA cut-outs on the contract canvas
(2 × 1 × 1 m: 144 × 120 plus 16 px padding, anchor per SPRITES.md 2). Nothing to do tonight; when
the cut-outs land in `public/sprites/` the machine modal and the hall show them through the loader
that exists. Do not add placeholder PNGs.

---

## 4. Task queue, in order

Branch `turn-6-rest-of-five` from `main`. One commit per task, `npm run check` green (checked on the
command's own exit code, never through a pipe) before each, two report lines per task.

**T6-01 Housekeeping.** `docs/turn-5-brief.md` = the file Piotr adds beside this brief (if he adds
it as `docs/turn-5-brief.md` already, verify and skip); README lists it. Done.

**T6-02 Office through the canteen.** 3.1. Done: the test.

**T6-03 Name on the wall, labels above the doors.** 3.2. Done: the tests.

**T6-04 Zoom and pan.** 3.3. Done: the tests.

**T6-05 Working day.** 3.4. Done: the tests; old overtime constants deleted.

**T6-06 Tool cabinets.** 3.5. Done: the tests.

**T6-07 Machine hours by capacity.** 3.6 engine side. Done: the two hour tests.

**T6-08 Catalogue tabs and Owned.** 3.6 UI side. Done: tab tests, Owned test.

**T6-09 Deadlines.** 3.7. Done: the tests; ranges deleted.

**T6-10 Earned rate and Accounting by day.** 3.8 and 3.9. Done: the tests.

**T6-11 Leftovers.** 3.10. Done: cadence in the Menu (jsdom), name fit test.

**T6-12 Scenarios.** Update the seven months for the new day, cabinets and deadlines; add (h) a
month on Easy that skips two breaks and works overtime three days running and asserts the labour
factor path.

**T6-13 Report and PR.** `REPORT-T6.md` in the usual structure plus "Replaced session choices"
(every `REPORT-T5.md` section 8 value replaced by an owner value). Kill background processes, push,
PR titled `Turn 6: the rest of Turn 5, and a hall you can zoom into`, do not merge, end the session.

---

## 5. Do not (tonight)

1. No touching `docs/art/SPRITES.md`, `CLAUDE.md`, or the archived briefs.
2. No sprites in code, no placeholder PNGs.
3. No PixiJS, sound, mobile.
4. No new machine variants or templates.
5. No persistence changes other than `STATE_VERSION`.
6. No watch loops, nothing left running.

---

## 6. Parked

1. House 100 k and villa 500 k templates. 2. A 180 degree hall view. 3. Movable or larger rooms.
4. Business rates and power for 200 m² (`[TUNE]` 1,500 and 8 until Piotr gives them). 5. Boss
meeting for jobs above 20 k (4 h, salesman from a reputation threshold). 6. Office admin covering
calls and per-job orders at double time when the specialist is missing. 7. Everything parked before.

End of brief.
