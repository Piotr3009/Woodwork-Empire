# Turn 9: orders that arrive, a joiner who walks, and a board that says how the company is doing

Woodwork Empire. Autonomous session brief for Claude Code (Opus 5, effort ultracode, cloud).
Owner: Piotr. Programmer: Claude. Spec author: Claude (chat), 13.09.2026, from Piotr's play of
Turn 8 and the decisions of 13.09 (Petros: software/woodwork-empire, STAN, Tura 9 points 1 to 17).

Read this whole file (first line must say "Turn 9"; if the root `CLAUDE.md` does not, stop and
report), then `docs/art/SPRITES.md` in full (section 10 is the character contract), then
`REPORT-T8.md`, then the archived briefs in `docs/`. Where files disagree, this one wins. All
standing rules apply (no em or en dashes, scope 1:1, one code path, constants never in the UI,
retag `[TUNE]` to `[PIOTR]`, kill background processes, PR without merge, end the session, no PR
watching, `npm run check` gated on its own exit code).

Scope note: compressed air and extraction capacity, and the five classes of extractors and
compressors, are **Turn 10** (Piotr's table of numbers is still to come). The sprite files for them
are already in `public/sprites/`; only the `standard` class of each family shows tonight.

---

## 0. What Piotr said after playing Turn 8

1. "The owner never goes out. Everything we buy is an order; the desk and the laptop should be on
   the shopping list too. Ordering costs zero minutes." (3.2)
2. "The Orders board belongs by the entrance door of the hall, not on the office." (3.2)
3. "A strange transparent glow on the interactive things (door, laptop) that blinks with the
   clock." (3.4)
4. "There is no clock in the hall." (3.5)
5. "The Work Plan modal is too complicated. One bar, minutes under it, a blue line for now, a red
   line for the deadline. For a job not started, the bar shows how long it is and when we must
   start at the latest, at the workshop's average." (3.6)
6. "When there is material in stock and I press from stock, do not make me order again: take it
   from stock and tick the task green." (3.7)
7. "Why do I sometimes have to click twice?" (3.8)
8. "Drop project: reputation drops 10, drastically." (3.9)
9. "A company board on the office wall, week by week with plus and minus, and a column for the
   company's output, 0.7, and why: overtime, poor workers, poor machines, plus and minus in
   columns." (3.10)
10. "Speed times 10." (3.11)
11. "Big modals, not tiny ones." (3.12)
12. The joiner walks: the frame sheet is in the repository, the game has to play it. (3.13)

State of `main`: Turn 8 merged (PR #9), plus the art pack of 13.09 (15 extraction and air sprites,
`character.joiner.walk.sheet.png` and `.json`, `docs/art/SPRITES.md` section 10). 790 tests green,
`APP_VERSION` `v10`.

---

## 1. Rules restated (short)

Everything from Turns 1 to 8 and the three chat fixes of 13.09. Tonight in addition:

- **`APP_VERSION = 'v11'`.** One constant, one bump, the corner shows it.
- **Full page modals for anything that is a list or a board**: Work Plan, company board, shopping
  list, catalogue, order board. Small modals only for an event with a decision. A test asserts the
  modal size flag per modal id.

---

## 3. Changes to the design (the contract)

### 3.1 Nothing is left of the shopping trip `[PIOTR]`

- Delete the `shopping` task kind, `SHOPPING_MINUTES`, `SHOPPING_NEXT_MINUTES`,
  `SOFTWARE_SHOPPING_MINUTES`, the trip line in the catalogue, the "Out shopping" state of the
  owner-is-out component and every test that measured a trip. The hiring interview (60 minutes,
  Turn 7) stays: a person is interviewed, a machine is ordered.
- `placeOrder` for equipment and software: the cash leaves at the click (chat fix 1), the item is
  booked as **on order** immediately with its delivery days, and the reservation of its cells
  applies from that moment. Zero owner minutes `[PIOTR]`.
- Every class has `deliveryDays >= 1` now: desk, chair, laptop, tool cabinet, locker, canteen seat,
  drill, hand tool set, hand edgebanders, benches, used and budget racks, extractor, compressors:
  **1** (next working day 08:00) `[PIOTR: furniture and hand tools next day]`. Software: 0, it is
  down the wire at the click `[TUNE]`. All other classes keep the Turn 8 table.
- The starting kit therefore lands on day 2 at 08:00 as one delivery event with everything on it
  (one van, one unloading; furniture and hand tools need nobody, the saw needs the forklift or 120
  minutes). The first ten minutes in the README are rewritten: day 1 is ordering, day 2 is setting
  up.
- The empty office (Turn 7 3.8) shows the desk and laptop layers only once they are delivered.
- Tests: an order costs zero owner minutes; a desk ordered on day 1 is in the office on day 2 at
  08:00; the trip constants no longer exist (grep test); the owner-is-out component never says
  shopping.

### 3.2 The Orders board by the hall door `[PIOTR]`

- The pin board moves from the office front face to the wall beside the personnel door on the left
  wall (canvas region beside the door, SPRITES.md 9.3: door at y 4.5..5.5 on x = 0; board at
  y 3..4.5, 1.5 m up, skewed into that wall's plane). Clickable, opens the shopping list; label
  "Orders: n". The office front face carries nothing.
- Tests: the board's transform maps onto the left wall plane; clicking it opens the list.

### 3.3 Owner is out: measure, meeting, move only

- The component from Turn 8 stays for the site measure, the client meeting and a move of the hall.
  Skip ahead as in Turn 8. Test: it never appears for an order.

### 3.4 The blinking glow `[PIOTR: bug]`

Cause to confirm: the hover overlay of the office regions and the hall rooms is rendered as part
of the scene each minute, so it flashes when the DOM is patched. Fix: hover is CSS only (`:hover`
on the region element, transition 120 ms), no `mouseenter` state in `ui`, nothing about hover in
the rendered HTML. Test: the rendered HTML of the office contains no hover class or inline hover
style; a snapshot 60 ticks apart is byte identical with the pointer over a region (jsdom cannot
hover, so the test asserts the absence of hover markup).

### 3.5 A clock in the hall `[PIOTR]`

The same digital clock as the office, on the rear wall of the hall beside the company name (canvas
box right of the name, 1.6 m up, skewed into the wall), amber digits, live text. Test: it shows
the game time and updates without re-creating the node.

### 3.6 Work Plan, the simple one `[PIOTR: the mockup of 13.09]`

Replaces the Turn 7 Gantt. Full page modal.

- One row per open job, ordered by deadline. Left: job name, price, who is on it, current stage as
  text ("Assembly", "Cutting, waiting for table saw", "drawings not done"), the Start production
  button.
- Right: a time axis in days from the earliest acceptance to the latest deadline plus 3; a **blue
  vertical line "Now"** across all rows; per row **one bar** from the day production can start
  (material in) to the deadline, the done share filled green from the left, and a **red vertical
  tick "DL"** at the deadline. Under the bar: "396 of 640 min · Assembly".
- **Not started:** the bar is drawn empty with a length equal to the minutes the job needs, at the
  **workshop average rate** (labour value ÷ the average of the available hands' rates with the
  machines they would get: the earned rate selector of Turn 6 over the current crew), plus a
  **yellow tick "Latest start"** placed so that the bar ends at the deadline; label "at workshop
  average". If the job has an assigned worker, the length and the tick use his rate and the label
  says "for Tom". If the latest start is in the past, the tick is drawn at Now in red with "late".
- No stage colours, no five bars. Stage names appear only as text.
- Tests: a started job shows done minutes; a not started job shows a latest start at the right
  day at the average rate; assigning a poor joiner moves it earlier; a late job shows "late"; the
  modal is full page.

### 3.7 From stock, one click `[PIOTR]`

- On the job card and in the Materials tab, "From stock" is a button when the rack can supply the
  job (chat fix 3 rule, with the reservation): clicking it draws the job's sheets immediately from
  the rack (reserved for that job), marks the material order task done and green ("From stock"),
  and the job is ready. No second order, ever, for that job.
- When the rack cannot supply, the button says why and is disabled ("Rack has 4 of 12 sheets").
- Test: the click drains the rack by the job's sheets, ticks the task, and the job is ready.

### 3.8 The double click `[PIOTR: bug]`

- Reproduce in jsdom: a click dispatched while a render is scheduled in the same frame. Suspects:
  the render loop replacing the clicked button between `mousedown` and `click` (the T5 patch
  helper should keep nodes, but a container whose HTML string changed every second, like the
  shopping list count or the owner minute bar, still gets re-created); and buttons whose `data-do`
  handler reads `ui` state that the same click's render resets.
- Fix: render once per animation frame, never inside an event handler (handlers change state and
  request a frame); the top bar's changing texts (clock, minutes, counts) update through text
  nodes, never by re-rendering the bar; a `data-do` element keeps its identity across renders
  when its `data-do` and `data-id` are unchanged.
- Tests: 200 clicks on Start production over 200 ticks all land (one action each); the Board button
  node identity is stable across 60 ticks while the orders count changes.

### 3.9 Drop project `[PIOTR]`

- A "Drop project" button on the job card (confirm inside the card). The client's deposit is
  returned (cash leaves) `[PIOTR: accepted 13.09]`, the job is removed from the plan, its material
  stays on the rack if it came from stock or is written off if it was ordered per job, reputation
  minus 10 at once `[PIOTR: drastic]`, a ledger line and a company board line (3.10).
- Test: dropping a 1,600 job refunds 800, removes it, takes 10 reputation.

### 3.10 The company board `[PIOTR: the mockup of 13.09]`

- A third board on the office wall beside Work Plan and Orders (a new clickable region on the
  office canvas: the free wall right of the door, x 970..1280, y 60..520, drawn as live text on a
  painted-free rectangle until GPT paints a board). Opens a full page modal with two columns:
  - **Week by week:** for each week (newest first), the lines that changed reputation with their
    points (job on time +3, late minus per day, express on time +5, missed call minus 1, books
    behind minus 1, dropped project minus 10, and so on), the week's total, and under the list
    "Reputation now N (started at 0)". The engine keeps a `reputationLog` of {day, reason, points}.
  - **Company output:** the hall's current labour factor as a number and its breakdown in two
    columns, plus and minus: overtime debt, skipped break, each worker below 1.0 (poor joiner
    minus 0.1 per man `[TUNE]`), each machine class below standard (minus its shortfall), each
    class above standard (plus), extraction OK or under, hall clean or dusty; totals of each
    column and the line "1.00 base + plus minus = N". One selector `outputBreakdown(state)` that
    the existing `hallProductivityFactor` is refactored to use (one path).
- Tests: the log records an on time job; the breakdown's total equals the productivity factor to
  two decimals; the modal is full page.

### 3.11 Speed 10x `[PIOTR]`

A fifth speed chip: 10. Everything that forced 4x (Skip ahead) now runs at 10. Tests: 100 real
seconds at 10x advance 1,000 minutes across day boundaries; events still pause.

### 3.12 Big modals

`full: true` for board, catalogue, workPlan, shopping, company board, accounting. Test per id.

### 3.13 The joiner walks `[PIOTR]` (`docs/art/SPRITES.md` section 10 is the contract)

- `render/characters.ts`: loads `character.<role>.<animation>.json` + sheet through the manifest;
  for a figure with a sheet for its role, the capsule is replaced by an `<image>` clipped to one
  cell (nested `<svg viewBox>` per figure), anchored at the cell's anchor on the figure's tile
  point, scaled 0.5 like every sprite.
- Animation choice: `walk` while the figure's station changes (the slide of Turn 2 becomes a walk:
  the figure moves along the slide and plays walk frames), direction from the screen vector of the
  slide (`sw`, `se`, `nw`, `ne`), held after arrival; `bench` while on a production stage at a
  bench; `carry` while unloading or fetching sheets; `idle` otherwise. Missing animation: `idle`,
  then frame 0 of `walk`, then the capsule. Missing direction row: mirror (`se` from `sw`, `nw`
  from `ne`) with a horizontal flip transform.
- Playback at the manifest fps in **real time** (a `requestAnimationFrame` ticker that updates only
  the frame index attribute of visible figures; no re-render), independent of game speed.
- Roles tonight: joiners use `character.joiner`; the owner and the helper fall back to the capsule
  until their sheets exist.
- The Sprite check page shows each character sheet as a strip with the anchor marked, and plays it.
- Tests: a joiner with a sheet renders an `<image>` and no capsule; the direction for a slide
  down-right is `se` mirrored from `sw` when the sheet has only `sw`; frame index advances with
  real time and not with game minutes; the owner still renders a capsule.

---

## 4. Task queue, in order

Branch `turn-9-orders-and-the-walking-joiner` from `main`. One commit per task, `npm run check`
green on its own exit code before each, two report lines per task.

**T9-01 Housekeeping and v11.** `docs/turn-8-brief.md` from git history; `APP_VERSION = 'v11'`;
the modal size flags of 3.12. Done: the version and modal tests.

**T9-02 Orders without trips.** 3.1. Done: the tests; the trip constants gone.

**T9-03 Orders board by the door, owner-is-out narrowed.** 3.2 and 3.3. Done: the tests.

**T9-04 The double click.** 3.8. Done: the two tests. Early, because everything after it clicks.

**T9-05 The blinking glow and the hall clock.** 3.4 and 3.5. Done: the tests.

**T9-06 From stock, one click.** 3.7. Done: the test.

**T9-07 Drop project.** 3.9. Done: the test.

**T9-08 Reputation log and output breakdown.** 3.10 engine side. Done: the two engine tests.

**T9-09 Company board.** 3.10 UI side. Done: the modal test.

**T9-10 Work Plan, the simple one.** 3.6. Done: the tests; the Gantt code deleted.

**T9-11 Speed 10x.** 3.11. Done: the tests.

**T9-12 The joiner walks.** 3.13. Done: the four tests; Sprite check plays the sheet.

**T9-13 Scenarios.** Update the thirteen months for day 2 deliveries of the kit and for zero minute
orders; add (n) a month that drops a job on day 8 and asserts the refund, the reputation and the
board line.

**T9-14 Report and PR.** `REPORT-T9.md` in the usual structure plus "Deleted" (the trip, the Gantt)
and "Board lines" (every reputation reason the log can carry, with points). Kill background
processes, push, PR titled `Turn 9: orders that arrive, a joiner who walks, and a board that says
how the company is doing`, do not merge, end the session.

---

## 5. Do not (tonight)

1. No touching `docs/art/SPRITES.md`, `CLAUDE.md`, the archived briefs, or the sprite files.
2. No compressed air or extraction capacity; no new classes for extractors or compressors.
3. No sprites or character frames drawn in code; the capsule stays the fallback.
4. No PixiJS, sound, mobile.
5. No persistence changes other than `STATE_VERSION`.
6. No watch loops, nothing left running.

---

## 6. Parked

1. Turn 10: compressed air and extraction capacity with Piotr's tables; extractor and compressor
   classes as data; ducts drawn along the walls with the `ducts` sprites.
2. Owner, helper and office staff character sheets (GPT batch 3 and later); `bench`, `carry`,
   `idle` play as soon as their sheets land, the code is ready for them tonight.
3. The floor catalogue picture (GPT).
4. House 100 k and villa 500 k templates, 180 degree view, movable rooms, rates and power for 200 m².

End of brief.
