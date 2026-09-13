# Turn 7: production in stages, the shop, and time that always runs

Woodwork Empire. Autonomous session brief for Claude Code (Opus 5, effort ultracode, cloud).
Owner: Piotr. Programmer: Claude. Spec author: Claude (chat), 13.09.2026.

Read this whole file (first line must say "Turn 7"; if the root `CLAUDE.md` does not, stop and
report), then `docs/art/SPRITES.md` in full, then `REPORT-T6.md`, then the archived briefs in
`docs/`. Where files disagree, this one wins. All standing rules apply (no em or en dashes, scope
1:1, one code path, constants never in the UI, retag `[TUNE]` to `[PIOTR]`, kill background
processes, PR without merge, end the session, no PR watching, `npm run check` gated on its own exit
code).

Scope note: this turn merges what was planned as Turns 7 and 8. Order matters: engine first
(stages, queues, zones, classes, CNC), then the UI (Gantt, shop modal, empty office, Accounting),
and the "nothing in paused time" rule last, because it touches every button. Compressed air and
extraction capacity are **Turn 8** (later) and are not started tonight.

---

## 0. What this turn is for

1. Piotr: "Do we have work progress in the Work Plan?" Not yet. The whiteboard in the office shows
   Cutting, Machining, Assembly, Finishing, Delivery as a Gantt; the engine has one production bar.
   Tonight production becomes stages, each on its machine, and the Work Plan becomes that Gantt. (3.1)
2. Piotr: "A machine speeds up only its own stage, only for the man on it. A machine serves one
   person at a time; with six joiners you need two saws or they stand." (3.1, 3.2)
3. Piotr: "A saw itself is about 4 m² but the space around it is what counts: 9 m² for a small one,
   up to 20 m² for the big one." Working zones. (3.3)
4. Piotr: "When you buy a CNC the saws suddenly free up: one CNC replaces three saws and cuts bench
   time by half." (3.4)
5. The twenty equipment sprites land in `public/sprites/` with this turn; the engine's class
   footprints must match the files. (3.5)
6. Piotr: "Every family in five classes, like the saw." Benches, racks and edgebanders get their
   classes as data. (3.6)
7. Piotr: "I imagined the equipment modal as browser tabs at the top; inside a tab, folders for the
   families; on every machine a frame that says owned." (3.7)
8. Piotr: "When the game starts there is no desk and no laptop; the catalogue lies on the floor.
   The catalogue object is a machine catalogue that says Equipment, not a table." (3.8)
9. Piotr: "Accounting also needs this year." (3.9)
10. Piotr, mega important: "You cannot make any purchase or any move without time running. A
    purchase takes at least an hour. You cannot open the computer while time is paused." (3.10)
11. Boss meeting above 20 k and the admin covering missing specialists. (3.11, 3.12)

---

## 1. State of the repo

`main` after PR #7 (Turn 6). If PR #7 is not merged when you start, stop and report. Piotr adds the
sprite files together with this brief (`public/sprites/tableSaw.*.png`, `workbench.*.png`,
`sheetRack.*.png`, `sheetRackBetter.standard.png`, `edgebander.*.png`). If they are missing, the
Sprite check page shows "no file" and every test below still runs against placeholder boxes.

---

## 2. Rules restated (short)

Everything from Turns 1 to 6. Tonight in addition:

- **A machine is either free or taken by one person.** No "capacity" numbers anywhere after
  tonight; `capacity` and the Turn 6 per-day hours formula are deleted. Hours are the minutes
  somebody stood at the machine.
- **A zone is floor the player cannot build on; a footprint is what the picture stands on.** Both
  live on the class, both are in metres, the zone contains the footprint.

---

## 3. Changes to the design (the contract)

### 3.1 Production in stages `[PIOTR]` with `[TUNE]` shares

| Stage | Share `[TUNE]` | Station | Machine family |
|---|---|---|---|
| Cutting | 0.25 | table saw (CNC when owned, see 3.4) | tableSaw |
| Machining | 0.15 | edgebander (sheet) or solid wood tools (timber); CNC when owned | edgebander or solidWoodTools |
| Assembly | 0.45 | bench | workbench (one per worker) |
| Finishing | 0.15 | bench (laminate) or spray booth (lacquer) | none or sprayBooth |
| Delivery | 0 | gate | none (Turn 2 transport, unchanged) |

Rules:
- Minutes of a stage for a given person = share × job labour minutes ÷ the person's rate ÷ the
  machine's output factor (the class factor from Turn 3) × the day's labour factor (Turn 6). The
  factor of a machine applies **only** to the stage done on it and only to the person on it.
- The person is at the stage's station for those minutes; the figure walks there. The Turn 2
  station cycle (15 at the bench, 5 at the saw) is deleted.
- **One person per machine.** A machine is `free` or `takenBy: <workerId>`. Someone arriving at a
  taken machine waits at it with the status "waiting for table saw" (or edgebander, spray booth);
  the engine gives him the first free machine of the family if there are several. Benches are one
  per worker (the Turn 4 rule) so they never queue.
- By hand (no machine of the family): Cutting and Machining run at the bench at the Turn 1 factor
  (1.5x time). No queue.
- Machine hours accrue only while taken; bags, service and endurance count those minutes. Delete
  `capacity` and the Turn 6 hours-per-day formula and their tests.
- A stage records its start and end (day and minute) for the Gantt. The five-step row (Turn 3)
  shows the current stage name inside the Production step.
- Hand edgebander (the only class today): used at the bench, no queue, its factor applies to
  Machining.

Tests: shares sum to 1; a 1,600 job at 640 owner minutes with an industrial saw (1.30) has a
Cutting stage of 123 minutes and a total of about 557 with the three top machines (numbers per the
class factors in constants); two joiners and one saw: the second waits with the right status and the
Gantt shows the gap; six joiners and two saws: no gap longer than 10 minutes over a month
(scenario); hours accrue only while taken; the by-hand job has no machine gaps.

### 3.2 Work Plan as a Gantt `[PIOTR: the whiteboard]`

- One row per open job, ordered by deadline. Columns are days from acceptance to the deadline plus
  3, today marked, the deadline as a red line.
- Bars per stage in the whiteboard's colours: Cutting green, Machining blue, Assembly amber,
  Finishing red, Delivery purple. Done part filled, remaining part hatched, projected end from the
  remaining minutes at the assigned worker's rate with the machines he will get. A stage waiting for
  a machine is a grey gap with the reason on hover.
- Left of the bars: job name, price, who is on it, the Start production button (unchanged).
- Wide modal like the board. No filter.
- Tests: five bars for a job in Finishing with the first three filled; a waiting job shows a gap;
  the deadline line sits on the right day.

### 3.3 Working zones `[PIOTR]`

- Every class has `footprint` (w × d × h, what the sprite stands on) and `zone` (w × d, the floor it
  reserves). `canPlace` and setup mode work on the zone; the sprite is anchored at the footprint's
  bottom corner, the footprint centred inside the zone. The Sprite check page draws both.
- Table saw classes `[PIOTR: the zones]`: used 2 × 1 in a 3 × 3 zone; budget 2 × 1 in 3 × 3;
  standard 3 × 1 in 4 × 3; pro 3 × 2 in 6 × 3; industrial 4 × 2 in 5 × 4 (20 m², "max 20").
- Other families tonight (single class): workbench 2 × 1 × 0.9 in a 2 × 2 zone (1 m of corridor in
  front `[PIOTR]`); sheetRack 2 × 1 × 1.5 in 2 × 2; sheetRackBetter 2 × 1 × 1.8 in 2 × 2; extractor
  1 × 1 × 2 in 1 × 1; compressor 1 × 1 × 1 in 1 × 1; thicknesser 2 × 1 × 1 in 4 × 2 (infeed and
  outfeed `[TUNE]`); solidWoodTools 2 × 1 × 1 in 3 × 2 `[TUNE]`; CNC 3 × 2 × 1 in 5 × 4 `[TUNE]`;
  sprayBooth 3 × 2 × 1.5 in 4 × 3 `[TUNE]`; dustSystem, flexiSystem 2 × 2 × 2 in 2 × 2; pelletiser
  1 × 1 × 1.5 in 2 × 2; toolCabinet 1 × 1 × 1 in 1 × 1; hand edgebander none (in a cabinet).
- The starting layout is redone with zones; the "buy everything" test still fits the 174 cells.
- Tests: two saws whose zones would overlap cannot both be placed; a bench can be placed edge to
  edge with another (zones touch, do not overlap); the sprite anchor for a pro saw sits inside its
  6 × 3 zone at the footprint's bottom corner.

### 3.4 CNC `[PIOTR]`

- A CNC takes both Cutting and Machining of sheet jobs as one stage "CNC" with output factor 2.0
  `[PIOTR: it replaces three saws; net about 20% of the whole job, as in Turn 3]`, and Assembly of
  those jobs runs at 0.5 of its minutes `[PIOTR: bench time cut by half]` because parts arrive cut
  and drilled. One person per CNC; timber jobs still use the saw and the solid wood tools.
- With a CNC the saws and the edgebander are used only by jobs that cannot go on it (timber) or when
  the CNC is taken and the player has set "allow saw fallback" on the job card `[TUNE: default on]`.
- The Turn 3 "labour minus 20%" of the CNC and the tool changer head are replaced by this; the head
  raises the CNC factor to 2.1 `[TUNE]`.
- Tests: a sheet job with a CNC has one CNC stage of the right minutes and an Assembly of half; a
  timber job ignores the CNC; the saw is free while the CNC works the sheet jobs.

### 3.5 Sprites per class

Files Piotr adds tonight, canvas per SPRITES.md section 2 with footprints in metres:

| File | Footprint w × d × h | Canvas |
|---|---|---|
| tableSaw.used / budget | 2 × 1 × 1.0 | 160 × 136 |
| tableSaw.standard | 3 × 1 × 1.0 | 208 × 160 |
| tableSaw.pro | 3 × 2 × 1.0 | 256 × 184 |
| tableSaw.industrial | 4 × 2 × 1.2 | 304 × 217 |
| workbench.used / budget / standard / pro | 2 × 1 × 0.9 | 160 × 131 |
| workbench.industrial | 3 × 1 × 0.9 | 208 × 155 |
| sheetRack.used / budget | 2 × 1 × 1.5 | 160 × 160 |
| sheetRack.standard, sheetRackBetter.standard | 2 × 1 × 1.8 | 160 × 174 |
| sheetRack.pro | 3 × 1 × 2.0 | 208 × 208 |
| sheetRack.industrial | 4 × 1 × 2.2 | 256 × 241 |
| edgebander.used / budget (hand) | 1 × 1 × 0.5 | 112 × 88 |
| edgebander.standard | 3 × 1 × 1.2 | 208 × 169 |
| edgebander.pro | 3 × 1 × 1.3 | 208 × 174 |
| edgebander.industrial | 4 × 1 × 1.4 | 256 × 203 |

With the classes of 3.6 every file is used: the loader tier is the class id for every family.
`sheetRackBetter.standard.png` becomes unused when `sheetRackBetter` is deleted; leave the file, note
it in the report.
Tests: the loader resolves each engine class to its file when present; the anchor of each class
lands at its footprint's bottom corner (checked for the pro saw and the hand edgebander in a cabinet
slot).

### 3.6 Five classes for benches, racks and edgebanders `[PIOTR: the classes and the art]` with `[TUNE]` numbers

| Family | Class | Price `[TUNE]` | Output | Footprint | Zone | Extra |
|---|---|---|---|---|---|---|
| workbench | used | 120 | 0.95 | 2 × 1 × 0.9 | 2 × 2 | |
| workbench | budget | 250 | 1.00 | 2 × 1 × 0.9 | 2 × 2 | today's bench |
| workbench | standard | 450 | 1.02 | 2 × 1 × 0.9 | 2 × 2 | |
| workbench | pro | 900 | 1.05 | 2 × 1 × 0.9 | 2 × 2 | |
| workbench | industrial | 2,200 | 1.08 | 3 × 1 × 0.9 | 3 × 2 | |
| sheetRack | used | 200 | | 2 × 1 × 1.5 | 2 × 2 | 30 sheets |
| sheetRack | budget | 400 | | 2 × 1 × 1.5 | 2 × 2 | 50 sheets (today's cheap rack) |
| sheetRack | standard | 900 | | 2 × 1 × 1.8 | 2 × 2 | 75 sheets (today's better rack) |
| sheetRack | pro | 1,800 | | 3 × 1 × 2.0 | 3 × 2 | 110 sheets |
| sheetRack | industrial | 4,500 | | 4 × 1 × 2.2 | 4 × 2 | 160 sheets |
| edgebander | used | 500 | 0.95 | none (hand, in a cabinet) | none | bags twice as often |
| edgebander | budget | 900 | 1.00 | none (hand, in a cabinet) | none | today's hand edgebander |
| edgebander | standard | 7,500 | 1.10 | 3 × 1 × 1.2 | 5 × 3 | floor machine, needs extraction, one person at a time |
| edgebander | pro | 16,000 | 1.20 | 3 × 1 × 1.3 | 5 × 3 | |
| edgebander | industrial | 32,000 | 1.35 | 4 × 1 × 1.4 | 6 × 3 | |

- `sheetRackBetter` is deleted; the rack is one family with classes; the starting layout and the
  scenarios buy `sheetRack.budget`. Endurance factors as the saw's (0.25 / 1.0 / 1.2 / 1.5 / 2.0).
  A floor edgebander needs extraction and ducting like any machine and queues like the saw; a hand
  one lives in a cabinet and never queues. The loader tier for each class is the class id (the Turn 7
  `budget` exception for the hand edgebander goes away with the classes).
- Tests: every family has five classes with footprint and zone; a floor edgebander needs extraction
  and a free 5 × 3; a hand one needs a cabinet; rack capacity follows the class; the modal (3.7)
  shows five tiles for each family.

### 3.7 The equipment modal `[PIOTR]`

- Top row: tabs like a browser's, one per category in this order: Sheet machines, Timber machines,
  Spraying, Sanding, Hand tools, Extraction, Computers, CNC, CNC centre, Handling, Storage, Owned.
  Every item has a category (the Turn 6 `tab` field; a test asserts it).
- Inside a category: **folders**, one per family (Sheet machines: Table saws, Edgebanders; Storage:
  Racks, Benches, Tool cabinets; and so on). A folder opens to the class tiles of that family (the
  Turn 3 machine modal content, now inline): name, price, effects, footprint and zone ("takes 3 × 1 m
  on a 5 × 3 m zone" or "kept in a tool cabinet"), picture through the loader, Buy with reasons.
- **Owned frame:** a tile the hall already has is drawn with a highlighted frame and the word
  "Owned" (plus "× 2" when there are two); the family folder shows a small owned count.
- Owned tab: as in Turn 6 (hours, endurance, service, state, Service and Repair).
- The filter with its clear cross stays, scoped to the open folder.
- Tests: tabs render in order; a folder lists its family's classes; the owned frame appears after a
  purchase; the filter narrows within the folder.

### 3.8 Empty office at the start, the catalogue on the floor `[PIOTR]`

- A new game starts with no desk, no chair, no laptop. The office view shows the room with the
  desk and laptop layers hidden until bought; the catalogue lies on the floor by the door (a
  catalogue object drawn where the desk's catalogue was, lowered to floor level, with the label
  "Equipment"). It is clickable and opens the equipment modal; it is the only thing that works in
  the office until the desk exists.
- Buying the desk shows the desk layer (with the catalogue and the binder on it); buying the laptop
  shows the laptop layer. The board on the wall works once the laptop exists (the top bar Board
  button too); Accounting once the desk (binder) exists; the Drawings tab once the laptop exists.
- The catalogue object in the hall and the office is a machine catalogue with the word "Equipment"
  on its cover, never a table. If the office art needs a separate floor catalogue picture, use the
  desk layer's catalogue region as a placeholder and note it for GPT in the report.
- Tests: a fresh Easy game shows no desk and no laptop layers; the catalogue region opens the modal;
  the board region is inert until the laptop is bought; buying the desk reveals the desk layer.

### 3.9 Accounting "this year" `[PIOTR]`

The Summary tab shows today, this week, this month and this year; the Days tab gets a month
selector for the current year. Tests: the year total equals the sum of the months.

### 3.10 Nothing happens in paused time `[PIOTR, "mega important"]`

- Every purchase, hire, order, sale of a machine, setup change and every modal that acts on the
  world costs owner minutes and needs the clock running. With the clock paused, the laptop, the
  catalogue, the board, Accounting actions, the hiring modal and setup mode do not open; the click
  shows a one-line toast "Time is paused" and the top bar's Pause button pulses once. Reading is
  still allowed where nothing can be changed: the Work Plan and the Sprite check page open paused.
- Costs in owner minutes `[PIOTR: at least an hour per purchase]`: buying a machine or a piece of
  furniture 60; buying software 30; hiring 60 (the interview); ordering material as today; opening
  the laptop 5 (booting) and each action inside as today; setup mode: the Turn 4 move costs.
  Buying several items in one visit: 60 for the first and 15 for each further one in the same
  hour `[TUNE]`. The minutes are taken as a task that runs while the modal is open; the modal shows
  "Shopping: 42 of 60 min" and the purchase is booked when the task completes (the cash leaves
  then).
- Events that pause the game (Turn 1) still pause it and still let the player decide inside them.
- Tests: with the clock paused the catalogue does not open and the toast shows; a purchase takes
  60 owner minutes before the cash leaves; two purchases in one visit take 75; the Work Plan opens
  paused.

### 3.11 Boss meeting above 20 k `[PIOTR]`

A job with P > 20,000 has a stage before design: "Client meeting", 240 minutes `[PIOTR: 4 h]`, the
owner's, or the salesman's when reputation is at least 40 `[TUNE threshold; PIOTR: from a certain
reputation]`. The five-step row becomes six for those jobs; Start production reasons gain "meeting
not held" ahead of "design not done". Tests: a 25 k job blocks design until the meeting; the
salesman takes it at 40 and not at 39.

### 3.12 The office admin covers for missing specialists `[PIOTR]`

With no salesman, client calls go to the admin at 30 minutes each (twice the salesman); with no
purchasing clerk, per-job material orders go to the admin at twice the clerk's minutes (about 8 a
day). When the specialist is hired the task goes to him from that day. The admin's 480 minutes
bound it all. Tests: a call costs 30 admin minutes and none of the owner's; hiring the salesman
moves the next call to him.

---

## 4. Task queue, in order

Branch `turn-7-production-shop-time` from `main`. One commit per task, `npm run check` green on its
own exit code before each, two report lines per task. Engine first, UI second, paused-time last.

**T7-01 Housekeeping.** `docs/turn-6-brief.md` from git history; README lists it; sprite tests
green with the new files. Done.

**T7-02 Stages in the engine.** 3.1 without queues. Done: the share and minute tests.

**T7-03 One person per machine.** 3.1 queues, hours while taken, `capacity` deleted. Done: the
waiting tests.

**T7-04 Classes for every family.** 3.6 data; `sheetRackBetter` deleted; version bump. Done: the
tests of 3.6 except the modal one.

**T7-05 Working zones.** 3.3 with the class zones of 3.6. Done: the zone tests, the starting layout,
the buy-everything test.

**T7-06 CNC.** 3.4. Done: the tests.

**T7-07 Boss meeting and admin cover.** 3.11 and 3.12. Done: the tests.

**T7-08 Work Plan as a Gantt.** 3.2. Done: the Gantt tests.

**T7-09 Figures at stations.** A worker's figure stands at his stage's machine or waits at it; the
Turn 2 cycle deleted. Done: the snapshot.

**T7-10 Equipment modal.** 3.7. Done: the tests, the 3.6 modal test.

**T7-11 Empty office and the catalogue on the floor.** 3.8. Done: the tests.

**T7-12 Accounting this year.** 3.9. Done: the test.

**T7-13 Sprites per class.** 3.5 with the class ids as loader tiers. Done: the anchor tests.

**T7-14 Nothing in paused time.** 3.10. Last on purpose. Done: the tests.

**T7-15 Scenarios.** Update the nine months for stages, zones, classes, the shopping minutes and
the meeting; add (j) six joiners with two saws (no long gaps) and (k) six joiners with one saw
(gaps, lower cash than (j)).

**T7-16 Report and PR.** `REPORT-T7.md` in the usual structure plus "Numbers chosen" (every `[TUNE]`
with its value) and "Deleted" (capacity, hours per day, station cycle, the CNC flat 20%,
`sheetRackBetter`). Kill background processes, push, PR titled `Turn 7: production in stages, the
shop, and time that always runs`, do not merge, end the session.

---

## 5. Do not (tonight)

1. No touching `docs/art/SPRITES.md`, `CLAUDE.md`, the archived briefs, or the sprite files.
2. No compressed air or extraction capacity (Turn 8, later). No new families beyond the classes in
   3.6.
3. No sprites in code, no placeholder PNGs.
4. No PixiJS, sound, mobile.
5. No persistence changes other than `STATE_VERSION`.
6. No watch loops, nothing left running.

---

## 6. Parked

1. Turn 8: compressed air (bar, l/min, compressor classes, assignment) and extraction capacity
   (m³/h, under-extraction penalties), with Piotr's tables.
2. House 100 k and villa 500 k templates, 180 degree view, movable rooms, rates and power for 200 m².

End of brief.
