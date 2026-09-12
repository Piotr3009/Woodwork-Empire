# Turn 2: playability, balance from the owner, and the moving workshop

Woodwork Empire. Autonomous overnight session brief for Claude Code (Opus 5, effort ultracode, cloud).
Owner: Piotr (product owner, not a programmer). Programmer: Claude.
Spec author: Claude (chat), 12.09.2026, from the Petros memory store (biznes/nowe-pomysly, entry
"Woodwork Empire", parts 5 and the night 1 result) and from Piotr's first play of the Turn 1 build.

Read this whole file, then `docs/turn-1-brief.md`, before touching anything. The Turn 1 brief is the base
design and still law. This file changes, extends and overrides it. Where the two disagree, this file
wins. Everything else in the Turn 1 brief (rules of the repo, architecture, stack, art direction,
report format, the do-not list) applies tonight unchanged unless a section below says otherwise.

There is no time cap. Turn 1 finished in an hour and idled for seven; this turn is sized so that does
not happen. Work through every task. Zero questions. Skip-and-note as in Turn 1 section 12.

---

## 0. What Piotr said after playing

Verbatim decisions, translated. These are the reason this turn exists.

1. "Time runs far too fast. It is frustrating." One game minute per real second at 1x.
2. "I want to set up the hall myself." Drag and drop of machines and benches.
3. "The board is a list, one job under another. You cannot see the choice at all." Full-page modal with
   tiles.
4. "A Start production button: he goes to the hall and works. A little square, but I see the square."
5. "The squares stay, but they have to move." Figures move between bench and machines.

Plus his answers to the 19 open questions of `REPORT-T1.md` section 8, worked into section 3 below.

---

## 1. State of the repo you start from

- `main` after PR #1: 65 files, ~6,400 lines under `src/`, ~3,900 lines of tests, 279 tests green,
  CI workflow `.github/workflows/check.yml` running `npm ci && npm run check` on push and PR.
- `docs/turn-1-brief.md`: the Turn 1 CLAUDE.md, archived. Read it.
- `REPORT-T1.md`: the night 1 report. Read sections 5 (deviations) and 8 (open questions) so you
  know what was decided and what Piotr has now answered.
- Deployed on Vercel from `main` (no env, pure front end). Nothing in this turn may break the build
  with missing env: everything that touches the network degrades to "feature not available" when the
  env is absent (section 3.14).

Audit findings on the Turn 1 build that this turn must fix (section 3.11):
- Hall labels are unreadable at 1280 px: the SVG scales through its viewBox so the 11 px font renders
  at about 7 px.
- The laptop prints the job name twice ("Garage shelves · Garage shelves £580").
- "1 enquiries waiting": wrong plural.

---

## 2. Standing rules, restated with two additions

All of Turn 1 section 2 and 3 apply (English only, no em or en dashes anywhere, scope 1:1, immutable
decisions, one code path, constants never in the UI, new feature = visible entry, search before
writing, never invent, never blame the environment, modals scrollable and draggable, clear cross on
filters, contrast, no spinners, tombstones max 2 lines, line balance in the report).

Two additions from night 1:

- **Kill your own background processes before you end.** A stuck bash task blocked the session input
  for eight hours after the work was done. Before the PR: `jobs`, kill anything still running, and do
  not start a watch loop on the PR. Open the PR, write the report, end the session.
- **Every number Piotr gave in section 3 is `[PIOTR]`.** Where you must invent a bridging value, tag
  it `[TUNE]` as before. Where a Turn 1 `[TUNE]` is replaced by a `[PIOTR]` value tonight, replace it
  and retag it; do not keep both.

---

## 3. Changes to the design (this is the contract)

### 3.1 Clock `[PIOTR]`

- `REAL_SECONDS_PER_DAY_AT_1X = 480`. One game minute = one real second at 1x. A working day is 8 real
  minutes at 1x, 4 at 2x, 2 at 4x. Speeds stay 0, 1, 2, 4.
- Audit the game loop after the change: the accumulator must not drop minutes, events must still
  pause the clock on the minute they fire, and 4x must not skip a minute boundary. Add a test that
  1000 real seconds at 4x advance exactly 4000 game minutes across day boundaries.
- Weekend skip stays instant. A day off with nobody in the hall (no worker present, owner at home)
  jumps straight to the next morning at 08:00 with the end-of-day summary `[PIOTR]`. A day off with
  staff working runs at the selected speed as before.

### 3.2 Order board as tiles `[PIOTR]`

- The board opens as a full-page modal: `min(96vw, 1400px)` wide, `min(92vh, 900px)` high, centred,
  scrollable body, draggable header, close cross.
- Enquiries are tiles in a responsive grid: 3 columns at 1280 px, 4 at 1600 px, min tile width 300 px.
- Each tile: template name (large), price (largest text on the tile), finish, deadline in days,
  express badge (top right, warning colour), expiry ("expires in 2 days"), material as sheets
  (section 3.6: "12 sheets"), owner days to make it (engine selector: labour value / owner labour per
  day, rounded to one decimal, shown as "about 2.1 owner days"), required tools, and either an
  Accept button (outlined; the single accent button of the modal is not on a tile) or the lock
  reason as text with the "By hand, +50% time" Accept variant where the template allows it.
- A locked tile is greyed with the reason. A tile the player cannot afford the deposit for is not a
  thing: deposits are received, not paid.
- Empty board: one line, "Nothing on the board. Reputation brings enquiries." No button.
- Board also shows, in the header, reputation as a number on the new scale (section 3.4) and the
  count with a correct plural ("1 enquiry", "3 enquiries").

### 3.3 Start production and moving figures `[PIOTR]`

- Every job card (laptop, "Jobs on the books") gets a **Start production** button when the job is
  `ready for production` or `in production` and unassigned. Click: assigns the owner to the job,
  closes the laptop, switches to the hall view. The button is the single accent button of the card.
- The hall's "Work here" button stays and does the same for the oldest ready job.
- **Figures move.** Each worker and the owner has a current station in the state: `bench`, `machine:<id>`,
  `rack`, `gate`, `idle`. The engine sets it: while producing, a figure spends 15 game minutes at the
  bench, then 5 at the table saw, then 15 at the bench, then 5 at the edgebander, repeating
  `[TUNE cycle]`; unloading puts the figure at the gate; fetching sheets puts it at the rack; a bag
  change puts it at that machine; idle workers stand at the canteen door. The owner on a laptop task
  stands at the office door.
- The renderer places the figure at its station's anchor tile and animates the change with a CSS
  transition on the SVG group's `transform` (0.8 s linear `[TUNE]`). No sprite animation, no walking
  cycle: the square slides. That is what Piotr asked for tonight.
- A figure at a machine shows the machine label in the figure tooltip ("Piotr, table saw").
- Test: after 20 minutes of production the owner's station is `machine:tableSaw`; after 35 it is
  `bench` again; a snapshot of the hall SVG contains the transform for the machine tile.

### 3.4 Balance changes from Piotr's answers `[PIOTR]` unless tagged

| Item | Turn 1 | Now |
|---|---|---|
| Rent | 1200 per month for 60 m² | 12 per m² per month: 720 for 60 m², 1080 for 90 m². Rent is charged daily (monthly / 30). Later stages will use 15 to 20 per m² (parked). |
| Deposit | 2400 on day 1 | One month of rent, paid on day 1, leaves the cash entirely. It is returned when the company moves to another unit or ends the tenancy (both parked; model the `depositHeld` field and return nothing tonight). |
| Day 1 charges | deposit + one day of rent | The same, confirmed: deposit + daily rent. No month in advance. |
| Business rates | 450 per month `[TUNE]` | Unchanged, still `[TUNE]`. |
| Overdraft limit | 10000 everywhere | Hard: 5000. Easy: 10000 `[TUNE, Piotr's answer was unclear, confirm in report]`. Very easy: 10000 `[TUNE]`. |
| Arrears repayment | never | Action `PAY_ARREARS` from the Accounting modal: pays arrears from cash (all or a typed amount), the arrears ladder is reset when arrears reach zero. Interest on arrears: 1% per month on the arrears balance while arrears exceed one month of fixed costs `[PIOTR: "large arrears"; the threshold is TUNE]`. |
| Bailiff | takes the dearest machine | Takes the **cheapest** machine first. Everything slows but the company carries on. |
| Software | one-off 900 for 30 jobs, subscription 60 per month | The basic subscription at 60 is too little: the company needs a bundle. Subscription bundle 150 per month. One-off bundle = two years of the subscription, 3600, and it keeps the 30-job limit from Turn 1 `[PIOTR gave both; report it as open question if the combination plays badly]`. Design speed tiers remain unanswered: keep factor 1.0 and list it in the report. |
| Express | +20% on price, penalty 30% per day, 10% chance | Price +20% but **material and labour are computed from the base (100%) price**, so the uplift is pure profit. At most **one express enquiry on the board per week**. Chance formula stays but capped by the weekly rule. |
| Reputation scale | 0 to 5, floor at minus 5 | **Minus 50 to 100.** Start at 0. Weights times ten: on time +3, express on time +5, per day late minus 1. At minus 50 the board still draws enquiries, but "barely profitable": price multiplier 0.85 on every enquiry while reputation is below minus 25 `[TUNE band and factor]`. Better reputation, better enquiries: the template gates and the hiring gates are on the new scale (table below). On-time bonus is forfeited when late (confirmed). |
| By hand path | switched off when the tools exist | Confirmed: with the tools in the hall the job always takes the most efficient path. |
| Fatigue | whole overtime hours only | Pro rata: 30 minutes of overtime cost 0.025. |
| Reputation gates | 0 / 0.5 / 1 / 1.5 / 2.5 | Templates: shelves minus 50, bookcase minus 50, TV unit 5, wardrobe 10, kitchen 20, oak table 10. Hiring: poor joiner minus 50, helper minus 50, normal joiner 10, office admin 5, purchasing clerk 10, salesman 15, super joiner 40. Board size bands: below 0: 1 to 2; 0 to 20: 2 to 3; above 20: 3 to 5. Express chance: 0.10 + 0.05 × floor(reputation / 10), min 0.05, max 0.30 `[TUNE mapping of the Turn 1 formula]`. |

### 3.5 Emails and bookkeeping penalties `[PIOTR]` with `[TUNE]` amounts

- The generic daily "Emails 60 min" task is replaced by **per-job emails**: each accepted job carries
  emails with the same count curve as calls (2 for P up to 1000, 3 up to 3000, 4 above), 10 minutes
  each `[TUNE]`, doable by the owner or the office admin, in any order with calls and design. They are
  not required for the material order (calls and design are).
- Unanswered emails at delivery: payment reduced by 1% of P per unanswered email, max 5%
  `[PIOTR: "up to 5%"]`, and the rating gain multiplied by (1 minus 0.2 × unanswered), min 0.
- **Bookkeeping skipped:** the daily bookkeeping task stays. If a working day ends without it, the
  books fall behind by one day. On the 1st of the month, if the books are behind by any days, a "Late
  accounts" charge of 100 × (consecutive months behind) is paid. While behind, the Accounting modal
  shows the figures frozen at the last bookkeeping day with a banner "Books not up to date since
  day N", and the top bar's "today" figure is replaced by "?" `[PIOTR: play blind]`. Doing the
  bookkeeping task catches up all days at once (one task, 60 minutes).

### 3.6 Materials as sheets `[PIOTR]`

- Material cost stays **one number: 40% of the job price**, charged when the material order task is
  done. Nothing is itemised.
- A **sheet is a storage unit worth 200 of material value**, standing for everything (boards, edging,
  screws). Sheets for a job = ceil(0.40 × P / 200). A 10,000 job is 20 sheets.
- The rack holds `SHEET_STOCK_CAPACITY` sheets. Day 1 rack: **cheap shelving, 50 sheets**, bought from the
  catalogue for 400 `[TUNE]` (required before any delivery can be unloaded). Better shelving, 75
  sheets, 900 `[TUNE]`. Above that: no room (parked).
- Every delivery lands on the rack (per-job orders too, superseding the Turn 1 exception). The Turn 1
  overflow rule applies to all deliveries.
- **Material leaves the rack as the job progresses:** each production minute consumes sheets pro rata
  to labour progress, so a job 50% made has used 50% of its sheets. If the rack has fewer sheets
  than the job needs next, production on that job stops with the status "waiting for material" and a
  once-per-day event "Your joiners are standing around laughing. No material." Wages keep running.
- Low stock alarm: when the rack holds under 10% of capacity, a persistent line under the hall and a
  one-time event per week.
- Stock purchases (buy sheets in advance at the 0.34 rate) fill the rack directly on delivery, as in
  Turn 1.

### 3.7 Finished goods and transport `[PIOTR]`

- A completed job is no longer paid on completion. New status `awaiting transport`: the piece stands in
  front of the gate. The balance is paid when it is delivered to the client.
- **Order transport** action on the job card and on a new "At the gate" list in the laptop:
  without a van, courier 120 `[TUNE]` and delivered next working day; with a van, free but it takes a
  worker or the owner 90 minutes `[TUNE]` and delivers the same day.
- More than 3 pieces at the gate: a warning line under the hall ("Order transport, no room at the
  gate") and all production in the hall at 0.7 `[PIOTR: 30% slower, moving stuff around]`.
- The hall SVG shows finished pieces as amber boxes beside the gate, count in the label.

### 3.8 Office staff working day `[PIOTR]`

- Office admin, purchasing clerk and salesman each have their own 480 minutes a day. Their tasks
  consume their minutes with the same task runner as the owner (one path). Purchasing clerk cap: 16
  per-job material orders a day, then his day is full. What a staff member does not finish today
  stays in the list for tomorrow; the owner may take any of it himself.
- The laptop shows, per task, who is on it and their minutes left today.

### 3.9 Extractor, machines without extraction, service `[PIOTR]` with `[TUNE]` numbers

- A broken extractor no longer stops the hall: production continues at 0.25 and dust rises at 3×.
- Without an extractor in the hall, machines refuse to run: every machine job waits with the status
  "no extraction", the catalogue and the hall say so.
- **Service:** each machine has `serviceIntervalDays = 30` `[PIOTR: once a month]`. When due, an event
  "Service due: table saw" with a task of 30 owner minutes `[PIOTR]` (a joiner may do it, 30 of his
  minutes) and a cost of 2% of the machine price `[TUNE]`. A machine overdue for service has a
  breakdown chance of 2% per working day `[TUNE]`; broken machine: repair task 90 minutes, cost 5% of
  price `[TUNE]`, the machine is out until repaired. Machine endurance in hours is parked: the
  numbers will be agreed with Piotr per machine value.

### 3.10 Hall setup: drag and drop `[PIOTR]`

- A **Set up hall** button under the hall enters setup mode: the clock pauses, machines, benches and
  the rack become draggable on the tile grid. Rooms, walls and the gate are fixed.
- Engine: `canPlace(state, itemId, x, y)` is a pure function checking the footprint is inside the
  floor, not on a room, not on another item, and not blocking the gate lane (the two tile rows in
  front of the gate `[TUNE]`). `applyAction({ type: 'MOVE_ITEM', itemId, x, y })` moves it or refuses
  with a reason. Layout lives in the state; `STARTING_LAYOUT` is only the default for new purchases.
- Renderer: on drag, a ghost footprint follows the mouse, snapping to tiles, green when placeable and
  red with the reason when not. Drop applies the action. Escape cancels. A "Done" button leaves setup
  mode and resumes the clock.
- New purchases still land on their default tile; if that tile is taken, on the first free tile in
  row-major order.
- Tests: a bench cannot be dropped on the office, two machines cannot overlap, a move that blocks the
  gate lane is refused with the reason, and a purchase whose default tile is taken lands on the first
  free one.

### 3.11 Audit fixes from night 1

- Hall and office SVG render at 1 unit = 1 px: set `width` and `height` to the viewBox size and centre
  the SVG in its panel with overflow hidden, so text is never scaled. Labels 11 px minimum, figure
  names 12 px. If the hall no longer fits at 1280 px, reduce the tile to 48 × 24 in `iso.ts`
  constants, never the font.
- Job name printed once on every card and row.
- Plurals: "1 enquiry", "2 enquiries", "1 day", "2 days", "1 sheet", "2 sheets". One helper, one path.

### 3.12 "Why it is like this in real life" strings

- Turn 1 left them unwritten. Tonight: for the deposit, business rates, the daily rent, the deposit
  return, the bailiff, arrears interest, the deposit received on acceptance, late accounts, the
  extractor, service, finished goods at the gate, and the low stock alarm: two or three sentences
  each, plain English, in `engine/constants.ts` as `WHY: Record<string, string>`.
- UI: an "i" text link (not an icon) on the event modal and on the Accounting rows that have an entry.
  Click opens a small popover with the text. A checkbox in the start screen "Show real-life notes"
  (on by default) stored in the state, and a line in the Menu to toggle it.

### 3.13 Tile and layout constants

- 60 m² unit = 24 × 10 tiles as in Turn 1. Gate lane: the two tile rows in front of the gate.
  Rack default footprint 4 × 1 tiles. Finished goods area: the 3 tiles beside the gate, outside the
  floor polygon, drawn as a small apron.

### 3.14 Persistence, last and optional

Only after every other task is done and green. Skip entirely if anything above is unfinished.

- Supabase JS client (`@supabase/supabase-js`) with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
  If either is missing at build or runtime, the feature is hidden: the start screen shows no Sign in,
  the Menu shows no Save. Nothing else may change. The Vercel build has no env tonight and must
  still deploy.
- Auth: email magic link, one button "Sign in to save" on the start screen.
- Table `saves`: `user_id uuid references auth.users`, `slot smallint`, `state jsonb`,
  `state_version int`, `updated_at timestamptz`, primary key `(user_id, slot)`, RLS enabled, policies
  owner-only for select, insert, update, delete. Deliver the SQL as `supabase/001_saves.sql`. Do not
  try to apply it: Piotr runs it. The client must handle "table missing" as "save unavailable".
- Autosave into slot 1 at every end of day when signed in; "Save now" and "Load" in the Menu; the
  start screen offers "Continue" when a save exists.
- No localStorage, no sessionStorage, still.

---

## 4. Task queue for tonight, in order

Same discipline as Turn 1: `npm run check` green before every commit, one commit per task with the id
in the message (`T2-03: ...`), a two-line entry in `REPORT-T2.md` per task. Branch
`turn-2-playability` from `main`.

**T2-01 Clock.** Section 3.1. Definition of done: the constant, the loop audit, the new test, the
instant jump on an empty-hall day off. Existing tests updated where they assumed 180.

**T2-02 Balance.** Section 3.4, every row. Retag constants. Update every test that carried a Turn 1
value. Done: a test per row of the table, including reputation gates on the new scale, express from
100%, weekly express cap, bailiff cheapest first, `PAY_ARREARS`, arrears interest, pro-rata fatigue,
deposit as one month held in `depositHeld`.

**T2-03 Materials as sheets.** Section 3.6 with the rack items in the catalogue, consumption during
production, waiting for material, the laughing event, the low stock alarm. Done: a 10,000 job is 20
sheets, a job at 50% has used half, an empty rack stops production and raises the event once a day.

**T2-04 Finished goods and transport.** Section 3.7. Done: balance paid only after transport, the
courier cost without a van, the 90 minutes with one, the 0.7 factor above 3 pieces, the amber boxes
in the hall snapshot.

**T2-05 Emails and bookkeeping.** Section 3.5. Done: emails per job with the curve, the 1% per
unanswered email capped at 5%, the rating reduction, the late accounts charge, the frozen Accounting
modal with its banner and the "?" in the top bar.

**T2-06 Office staff working day.** Section 3.8. Done: a clerk stops at 16 orders, an admin's tasks
spill to tomorrow, the owner can take them, the laptop shows who is on what.

**T2-07 Extractor and service.** Section 3.9. Done: 0.25 production with a broken extractor, no
extraction means no machine work, service due events every 30 days with cost and minutes, overdue
breakdown, repair.

**T2-08 Board as tiles.** Section 3.2. Done: a jsdom test that the board modal renders one tile per
enquiry with price, sheets, owner days, express badge and the correct plural; a locked tile shows its
reason as text.

**T2-09 Start production and stations.** Section 3.3 engine side: stations in the state, the cycle,
the button and its action. Done: the station tests of 3.3.

**T2-10 Moving figures.** Section 3.3 render side: anchors per station, the transform transition,
tooltips. Done: snapshot test of the hall with the owner at the saw.

**T2-11 Hall setup.** Section 3.10. Done: the four tests listed there plus a jsdom test that setup
mode pauses the clock and Done resumes it.

**T2-12 Audit fixes.** Section 3.11. Done: a test asserting the hall SVG width equals its viewBox
width, the plural helper tests, no duplicated job name in any rendered card (grep in a test).

**T2-13 Why strings.** Section 3.12. Done: every key listed has a string, the popover opens from the
event modal in jsdom, the toggle hides the links.

**T2-14 Scenario tests.** Update the three Turn 1 scenarios to the new clock and balance; add (d) a
scripted month that hires a poor joiner, buys the shelving, runs out of sheets once, orders transport
twice and ends with books behind; assert the late accounts charge and the laughing event occurred.

**T2-15 Report and PR.** `REPORT-T2.md` in the Turn 1 structure, plus a section "Constants retagged"
listing every `[TUNE]` that became `[PIOTR]`. Kill background processes. Push. PR to `main` titled
`Turn 2: playability, balance from the owner, and the moving workshop`. Do not merge. End the session.

**T2-16 Persistence (optional).** Section 3.14, only if T2-01 to T2-15 are done and green. If you do
it, it is a separate commit and the SQL file is named in the PR description with "SQL BEFORE use".

If you finish everything: raise engine test coverage and stop. No new features.

---

## 5. Do not (tonight)

1. No PixiJS, canvas or sprite art. SVG boxes that slide.
2. No sound, no mobile layout, no i18n, no settings screen, no debug sliders.
3. No second shift, no cleaner role, no machine endurance hours, no empty-board-at-low-reputation
   tuning, no new products, no CEO, no designers, no risky clients, no veneer or lacquer.
4. No localStorage or sessionStorage.
5. No editing of `CLAUDE.md` or `docs/turn-1-brief.md`.
6. No watch loops, no polling of the PR, no background process left running at the end.

---

## 6. Parked (list them in the report)

1. Second shift for staff.
2. Cleaner as a paid role; hall cleanliness affecting canteen and WC.
3. Machine endurance hours and service costs per machine value (to be agreed with Piotr).
4. Empty board at low reputation.
5. Design speed tiers of the software bundle.
6. Unit change and deposit return; better locations at 15 to 20 per m².
7. Rack above 75 sheets.
8. Dust from deliveries left in the yard.
9. Everything parked in the Turn 1 brief section 14 that is not listed above as done tonight.

End of brief.