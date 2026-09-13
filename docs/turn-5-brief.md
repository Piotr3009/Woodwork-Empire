# Turn 5 brief (archived, never reached the session): the 200 m² hall, a day with a break, and a screen that stops blinking

Woodwork Empire. Autonomous session brief for Claude Code (Opus 5, effort ultracode, cloud).
Owner: Piotr. Programmer: Claude. Spec author: Claude (chat), 13.09.2026, from Piotr's fourth play,
his answers of 13.09, and the hall art accepted the same day (`docs/art/SPRITES.md` section 9).

Read this whole file, then `docs/art/SPRITES.md` in full (sections 8 and 9 are contracts this turn
implements), then the archived briefs in `docs/` (Turn 4's root `CLAUDE.md` goes to
`docs/turn-4-brief.md` in T5-01). Where files disagree, this one wins. All standing rules apply (no em
or en dashes, scope 1:1, one code path, constants never in the UI, new feature = visible entry, retag
`[TUNE]` to `[PIOTR]` when a number becomes the owner's, kill background processes, PR without merge,
end the session, no PR watching).

---

## 0. What Piotr said after playing Turn 4

1. "Sometimes I have to click twice. Everything blinks in the rhythm of the clock." (3.1)
2. The hall is now 200 m² on a 1 m grid, with painted layers from GPT, registered and accepted. (3.2)
3. "The hand edgebander takes no floor space. Every worker needs a tool cabinet, 1 m², where the
   hand edgebander and the hand tools are kept." (3.3)
4. "We start at 8, work until 17 with an hour's break. You can skip the break but tomorrow your
   output drops 3%. At 17 a window: end of day, stay for overtime? Up to 19:00, tomorrow 10% weaker,
   cumulative every day, reset at the weekend." (3.4)
5. "The catalogue needs tabs: sheet machines, timber machines, spraying, sanding, hand tools,
   extraction, computers, CNC, CNC centre, handling, storage. And a tab with what we own and the
   state of each machine: hours worked." Plus: "a machine that can serve three men, used by one, gets
   8 hours in 3 days; used by two, in 1.5 days." (3.5)
6. "Too much time on jobs. 500 pounds cannot have 12 days, max 5. A 15 k kitchen 15 to 20 days,
   express 10 to 12." (3.6)
7. "Machines add to the rate. Show the average earned labour hour: alone I earn 40, with a machine
   at +2% it is 40.8, a poor joiner with me earns 32." (3.7)
8. "The day summary should always be in Accounting. Detailed accounting split by day, income and
   outcome, and at the bottom whether the day is plus or minus." (3.8)
9. Left over from the Turn 4 audit: the cadence control is missing from the Menu; the company name
   is cut to "Woodwork E..." on the office board. (3.9)

---

## 1. State of the repo

`main` after PR #5 (Turn 4) plus Piotr's push of the hall layers: `public/sprites/hallBackground.png`,
`hallOffice.png`, `hallCanteen.png` (1680 × 1128) and `docs/art/SPRITES.md` with section 9. 513 tests
green before that push; if the sprite tests are red because of the new files, T5-01 fixes them the
way Turn 4 did. Office layers from Turn 4 stay as they are.

---

## 2. Rules restated (short)

Everything from Turns 1 to 4. Tonight in addition:

- **The unit of the grid is 1 metre from this turn on.** Every footprint, layout slot, capacity and
  projection helper speaks metres. There is no 0.5 m tile anywhere after T5-02. A test greps for
  the old `24 × 10` hall constants and fails if they survive.
- **Difficulty no longer changes the unit.** Every difficulty starts in the same 200 m² hall; only the
  starting cash differs `[PIOTR: 200 m² is the starting hall]`. The Very easy "bigger unit" of Turn 1
  is gone.

---

## 3. Changes to the design (the contract)

### 3.1 Rendering without flicker `[PIOTR: bug]`

Cause: every game minute the whole view (and the open modal body) is rebuilt with new DOM, so
buttons under the pointer are replaced mid-click and the screen blinks.

Fix, one path, no framework:
- Render only when the rendered state changed. Each view and each modal body computes its HTML from
  the state; if the string equals the previous string, nothing is touched. The clock text in the top
  bar and the live clock in the office update through targeted text nodes, not by re-rendering the
  bar.
- When the string differs, patch instead of replace: reuse the existing root element and update its
  children with a minimal diff (a small `patch(root, html)` helper that walks both trees, keeps
  matching elements and only swaps changed text and attributes). No `innerHTML` replacement of a
  container that holds interactive elements while the clock runs.
- Clicks never get lost: a test simulates a click dispatched on a button in the same tick as a state
  change and asserts the action fired once.
- Scroll and focus preservation from T3-02 keeps working on top of this; the T3-02 tests stay green.
- Tests: no DOM node replaced across 60 ticks of an idle hall (node identity compared); the top bar
  clock updates without the Board button being re-created; the modal body patch leaves an open
  `<details>` open.

### 3.2 The 200 m² hall on a 1 m grid `[PIOTR]` with `[TUNE]` where tagged

Engine:
- Hall 20 × 10 cells (x 0..20 along the rear wall, y 0..10 along the left wall). Fixed cells per
  SPRITES.md 9.3: WC x 0..1, y 0..2; office x 1..3, y 0..4; canteen x 3..5, y 0..4; gate lane x 0..2,
  y 6..10; shutter on the left wall y 6..9; personnel door y 4.5..5.5. Free cells 174.
- Footprints in metres (Turn 1 values halved, rounded up where needed): table saw 2 × 1 × 1,
  workbench 2 × 1 × 0.5, hand edgebander 0 (lives in a tool cabinet, 3.3), extractor 1 × 1 × 1.5,
  sheet rack 2 × 1 × 1, better rack 2 × 1 × 1, compressor 1 × 1 × 0.5, thicknesser 2 × 1 × 1, solid
  wood tools 2 × 1 × 1, van 2 × 1 × 1 (outside the hall: parked on the apron by the shutter, not on
  the grid), forklift 1 × 1 × 1 (on the grid when not unloading), CNC 3 × 2 × 1, spray booth 3 × 2 ×
  1.5, dust system 2 × 2 × 2, flexi system 2 × 2 × 2, pelletiser 1 × 1 × 1.5, tool cabinet 1 × 1 × 1
  (3.3). Lockers and canteen seats live inside the canteen and take no grid cell.
- `STARTING_LAYOUT` re-done for the new hall: benches along the rear wall from x 6, saw near the
  middle, rack beside the gate lane, extractor by the rear wall. Setup mode (Turn 2) and moving costs
  (Turn 4) work unchanged on the new grid; `canPlace` refuses room cells and the gate lane.
- Rent 2,400 per month `[PIOTR: 12 per m²]`, deposit 2,400 paid on day 1 only `[PIOTR]`, business
  rates 1,500 per month `[TUNE]`, power base 8 per day `[TUNE]`. Difficulty cash unchanged.
- `SHEET_STOCK_CAPACITY` stays as the rack's property (50 cheap, 75 better).
- Finished pieces (Turn 2) stand on the apron outside the shutter, not on grid cells.

Render:
- The hall view becomes a stack like the office: `hallBackground.png`, `hallOffice.png`,
  `hallCanteen.png` at canvas origin, scaled uniformly to the viewport, letterboxed; then an SVG (or
  positioned elements) layer for the grid overlay, sprites, placeholder boxes, figures, dust piles,
  effects and the delivery van, drawn with the projection of SPRITES.md 9.2 divided by two for the
  game's 48 × 24 tile, then multiplied by the stack's scale. One scale value for everything.
- The grid overlay is faint and shown only in setup mode and on the Sprite check page.
- Live text: company name on the rear wall beside the shutter (canvas box x 300..560, y 130..200)
  and room labels "WC", "Office", "Canteen" on the room fronts, positioned in canvas coordinates,
  scaled with the stack.
- Placeholder layers when the files are missing from the manifest: flat rectangles with the layer
  name, as for the office.
- Clicking the office block opens the office view (as before); WC and canteen show their one-line
  tooltips.
- The old SVG hall (floor polygon, wall boxes, room boxes) is deleted; the sprite and figure drawing
  code is kept and re-anchored.
- Tests: `canPlace` refuses the three rooms and the gate lane; the starting layout fits without
  overlap; the stack scales to 1280 × 800 with the right factor; a sprite at cell (10, 5) lands at
  the canvas point the 9.2 formula gives; the company name and the three labels render.

### 3.3 Tool cabinets and the edgebander `[PIOTR]`

- New catalogue item `toolCabinet`, 1 × 1 × 1 m, 350 `[TUNE]`, Storage tab. One per worker is a
  hiring prerequisite (beside the bench, locker, seat and hand tool set). The owner needs one too:
  without a tool cabinet the hand edgebander and the hand tool set cannot be bought ("needs a tool
  cabinet").
- The hand edgebander has no footprint and no place on the grid; it is stored in a cabinet and used
  at the bench. Its bag interval and effects are unchanged. The `1 saw per 3 joiners` style ratio
  does not apply to it.
- Tests: hiring blocked without a cabinet; the edgebander cannot be placed and cannot be bought
  without a cabinet.

### 3.4 The working day `[PIOTR]`

Replaces Turn 1 section 7.2 (the 8 + 4 hour model) and the fatigue rule of Turn 2.

- Clock 08:00 to 17:00. Break 12:00 to 13:00 `[TUNE: the hour]`: no work minutes are consumed, the
  owner's pool of 480 working minutes is unchanged, staff stop too. At 12:00 an event: "Break. Take
  it / Skip it". Skipping gives 60 more working minutes today and sets tomorrow's labour factor to
  0.97 for the owner `[PIOTR]`. Staff always take the break.
- At 17:00 an event: "End of day. Go home / Stay for overtime". Overtime runs until 19:00 at the
  latest (or earlier through the Menu "End day"). Every day with any overtime adds 0.10 to an
  overtime debt that multiplies tomorrow's labour: factor = 1 minus debt, cumulative day after day
  `[PIOTR: 10% weaker tomorrow, cumulative]`, floor 0.5 `[TUNE]`. The debt resets to zero on Monday
  morning `[PIOTR: reset at the weekend]`.
- Staff overtime: as Turn 1 (1.5x pay, up to 2 hours, then refusal), now within 17:00 to 19:00.
- The top bar shows the labour factor when it is below 1 ("Output 0.87").
- Tests: skipping the break gives 0.97 tomorrow and 1.0 the day after if the break is taken; three
  overtime days give 0.7 on the fourth morning; Monday resets; the clock never passes 19:00.

### 3.5 Catalogue tabs, the Owned tab, machine hours by capacity `[PIOTR]`

- Catalogue modal tabs in this order: Sheet machines, Timber machines, Spraying, Sanding, Hand tools,
  Extraction, Computers, CNC, CNC centre, Handling, Storage. Every catalogue item carries a `tab`
  field; unassigned items are a lint error (a test asserts every item has one). Empty tabs (Sanding,
  Computers, CNC centre may be empty tonight) show "Nothing here yet". The filter with its clear cross
  stays and filters within the tab.
- **Owned** tab: every machine and item the hall has, with: variant, hours used, endurance hours, next
  service day, state (running, stopped: bag full, broken, no extraction), and a Service or Repair
  button where applicable (same actions as the hall).
- **Machine hours by capacity:** each machine family has `capacity` (workers it can serve; table saw
  3 `[PIOTR]`, others 2 `[TUNE]`). Hours used per day = min(workers using it today, capacity) /
  capacity × 8 `[PIOTR]`. A machine used by one of three earns 2.67 hours a day. The bag interval,
  service interval and endurance all count these hours (one clock per machine). Replace the Turn 3
  `hoursUsed` accumulation with this.
- Tests: one worker on a capacity 3 saw for 3 days gives 8 hours; two workers 1.5 days; the Owned tab
  lists hours and state; every item has a tab.

### 3.6 Deadlines `[PIOTR]` with `[TUNE]` slack

- Deadline days = round(ownerDays × 0.9 + 3) clamped to 3..30, plus slack: for P up to 3,000 a random
  0 to 2 extra days `[PIOTR: 3 to 5 total for small jobs]`; above that, plus 10 to 15% of the formula
  `[PIOTR: proportionally more]`. Express: 0.6 × the standard result, minimum 3.
- `ownerDays` = labour value / owner labour per day with the machines the hall has now (the same
  selector the board tile shows).
- Replace the per-template deadline ranges with this one function; the ranges are deleted.
- Tests: 500 shelves give 3 to 5 days; a 15,000 kitchen gives 18 to 23 standard and 11 to 14 express;
  the outcome is deterministic per seed.

### 3.7 Earned labour rate `[PIOTR]`

- Selector `earnedRate(state, span)`: labour value produced in the span divided by the people-hours
  worked in it, machines included, weighted by hours (the owner's hours are what he actually spent in
  the workshop, not 8). Shown in Accounting as "Earned labour rate: today 38.4 / h, this month 35.9 /
  h" and on the end of day summary.
- Tests: the owner alone with the used saw earns 38.0; with a standard saw 42.0; owner 4 hours at 42
  plus a poor joiner 8 hours at 25.2 gives 30.8 (weighted).

### 3.8 Accounting by day `[PIOTR]`

- Accounting modal: a **Days** tab with one row per day (income, outcome, net, plus or minus
  colouring) for the current month, expandable to the day's ledger lines; the end of day summary of
  any past day opens from its row. A **Summary** tab with today, this week, this month as now, plus
  the earned rate. The ledger stays (last 200 lines).
- The end of day summary modal (whatever the cadence) is the same component the Days tab opens.
- Tests: the day row nets equal the ledger; a past day's summary opens from the tab.

### 3.9 Leftovers from the Turn 4 audit

- Cadence control in the Menu (Turn 4 3.6 asked for both places).
- The company name on the office board scales its font down to fit the box, minimum 12 px at scale 1,
  then ellipsis. Same helper for the hall's company name.

---

## 4. Task queue, in order

Branch `turn-5-hall-200` from `main`. One commit per task, `npm run check` green before each, two
report lines per task.

**T5-01 Housekeeping.** `docs/turn-4-brief.md` from git history; green check on `main` if the hall
push broke sprite tests. Done: both.

**T5-02 Render without flicker.** Section 3.1. Done: the four tests. This comes first because every
later test drives the UI.

**T5-03 Metre grid and hall engine.** Section 3.2 engine side: cells, fixed geometry, footprints in
metres, starting layout, rent and deposit, no difficulty unit, `canPlace` rules. Done: the engine
tests of 3.2 and the grep test of section 2.

**T5-04 Hall render as a stack.** Section 3.2 render side. Done: the render tests of 3.2, the old
SVG hall deleted.

**T5-05 Tool cabinets.** Section 3.3. Done: the tests.

**T5-06 Working day.** Section 3.4. Done: the tests; the old overtime constants deleted.

**T5-07 Catalogue tabs and Owned.** Section 3.5 UI side. Done: tab tests, Owned tab test.

**T5-08 Machine hours by capacity.** Section 3.5 engine side. Done: the two hour tests.

**T5-09 Deadlines.** Section 3.6. Done: the tests; template ranges deleted.

**T5-10 Earned rate and Accounting by day.** Sections 3.7 and 3.8. Done: the tests.

**T5-11 Leftovers.** Section 3.9. Done: cadence in the Menu (jsdom), name fit test.

**T5-12 Sprite check and scenarios.** The Sprite check page shows the hall layers full width with the
grid overlay; the six scripted months updated for the 200 m² hall, the new day, the deadlines and the
cabinets; add (g) a month on Easy that skips two breaks and takes overtime three days running and
asserts the labour factor path.

**T5-13 Report and PR.** `REPORT-T5.md` in the usual structure plus "Metre migration" (every constant
that changed unit, old and new) and "Deleted" (old hall SVG, old overtime, deadline ranges). Kill
background processes, push, PR titled `Turn 5: the 200 m² hall, a day with a break, and a screen that
stops blinking`, do not merge, end the session.

---

## 5. Do not (tonight)

1. No touching `docs/art/SPRITES.md`, `CLAUDE.md`, or the archived briefs.
2. No new sprites drawn in code; the hall is the three layers plus placeholder boxes for objects.
3. No PixiJS. No sound. No mobile.
4. No new machine variants, no new templates (the 100 k house and the 500 k villa are parked).
5. No persistence changes other than `STATE_VERSION` (it changes: metres, working day, hours).
6. No watch loops, nothing left running.

---

## 6. Parked

1. House 100 k and villa 500 k templates, gated on the full machine set.
2. A 180 degree alternate hall view.
3. Movable or larger rooms (they become footprint sprites when that comes).
4. Room labels chosen by Piotr ("Boss office" and the like).
5. Business rates and power for 200 m² are `[TUNE]` until Piotr gives them.
6. Everything parked in Turns 1 to 4.

End of brief.
