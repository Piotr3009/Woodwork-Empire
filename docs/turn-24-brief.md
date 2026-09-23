# Turn 24: the number says who made it, the boss has a bench, nine leftovers closed

Woodwork Empire. Autonomous session brief for Claude Code (cloud, one agent, serial, effort
high). Owner: Piotr. Programmer: Claude. Spec author: Claude (chat), 22.09.2026, from Piotr's
decisions of 21.09 and 22.09 (Petros: software/woodwork-empire, STAN, the v40 to v49 blocks).

Read this whole file (first line must say "Turn 24"; if the root CLAUDE.md does not, stop and
report), then REPORT-T23.md section 0, docs/ui-style.md, and the pictures in docs/mockups/v47.
Where files disagree, this one wins. All standing rules apply (no em or en dashes anywhere, scope
1:1, one code path, constants never in the UI, [TUNE] for every figure you choose and [PIOTR]
for his, kill background processes, PR without merge, end the session, no PR watching, npm run
check gated on its own exit code, every click single, one APP_VERSION bump, delete the old track
and never write a parallel one, flip a test and never keep it beside a new one).

Precondition. main carries Turn 23 merged and the chat fixes v37 to v49: APP_VERSION 'v49',
STATE_VERSION 25. If APP_VERSION is not 'v49', stop and report.

The four rules of 18.09 bind: **one game, one look**; **nothing visual without a mockup** (2.1
builds from docs/mockups/v47/output-who-made-it.png; 2.5 and 2.6 are placement figures with the
rule written here and nothing new drawn); **no sound without a recorded file**; **every modal,
popover and list has the cross, Escape and click outside**.

## 0. What this turn is for (Piotr, 21.09 and 22.09)

Three days of playing v40 to v49 found the same thing four times: the game did something for a
reason and told the player a different reason, or none. "Output 0.75" with nothing under it (a
by hand job, a serviced extractor and a one man day all read 0.75); "waiting for the saw" over a
man with two saws idle; the owner standing all day because the hiring gate never counted his own
place at a bench. Piotr: "the player has no way of knowing what to fix." This turn makes the
Output number account for itself, closes the bench gap at the gate, and closes nine leftovers
Piotr ticked off the list on 22.09.

## 1. Rules restated (short)

Everything from Turns 1 to 23 and the chat fixes v37 to v49. Tonight in addition:

- APP_VERSION = 'v50'. STATE_VERSION bumps to 26 in phase A, once, for 2.1; every v25 save loads.
- **The Output sheet says who made today's number and why** [PIOTR, 22.09].
- **The owner has a place at a bench before a joiner is hired past him** [PIOTR, 22.09].
- **A contract man with nothing to do stands at the canteen door** [PIOTR, 22.09].
- **A contract's machine wear is charged on the minutes at the machine only** [PIOTR, 22.09].

## 2. Changes to the design (the contract)

### The number

**2.1 Who made it today [PIOTR, 22.09; docs/mockups/v47/output-who-made-it.png].** Under the
Output sheet's line `Workshop today, everybody and every machine, over the minutes worked` a new
block, in the sheet's own classes and nothing new in the stylesheet:

- A `ledger-head` reading `Who made it today, N min worked` with `a minute` on the right, N being
  `dayStats.workMinutes`.
- One `ledger-row` per person who has put a production minute in today, the owner first and then
  the crew in the order of `state.workers`. Main line `<Name>, <tier> <role>, <doing> <job>` in
  the words the person card already uses (`stageDoing`, the job's name; the owner is `Piotr,`
  with no tier). Second line `<why>, <his minutes> min: <his rate> times <his stage's speed>`,
  where `<why>` is `by hand` for a by hand job or a by hand stage, the class of the machine he
  stands at (`standard table saw`) for a machine stage, and `at the bench` for bench work. The
  figure on the right is his worth a minute averaged over his minutes today, red under 1.00 and
  green over it through the sheet's own `tone`.
- One row `Hall`, second line the hall's state in the words the breakdown lines already have
  (`clean, extraction working`; `extractor on service`; `dusty`; `bags full`), figure the hall
  factor.
- A `ledger-sum` with only the total: `= 0.75`, the same figure as the line above the block.
- One `ledger-note` sentence, only when there is something to say, and at most one, in this
  order: a by hand job among today's minutes (`<Job> was taken by hand: no <tools> in the hall,
  so every stage of it runs at 0.67, the saw included.`, `<tools>` off the enquiry's lock reason),
  else the hall under 1.00 (`The hall ran at 0.70 today: <reason>.`). Nothing else says anything:
  a low number made of slow men is what the rows above already say.

The engine keeps the figures and the sheet prints them, computing nothing (T15 0). New on
`dayStats`: `byMan: Record<string, { minutes: number; worth: number }>`, written by
`bookOutputMinute`, which gains the man's id; zeroed with the day's stats; a v25 save opens with
`{}`. `workshopBreakdownToday(state)` in machines.ts returns the rows as data (name, words,
minutes, worth, the hall row, the note); the day loop, the night loop and the contract minute all
book through the one `bookOutputMinute`. Done: the engine tests (four men on a by hand job for 14
minutes each: four rows, every one `by hand`, the sum equal to `workshopOutputToday` to the
pence; the extractor on service: the hall row says so and the note names it; nobody worked: no
rows and no note; the day 141 fixture after one minute: four rows and `= 0.75`), the board test
against the mockup's words, the migration test.

### The boss and his bench

**2.2 The gate counts the owner's place [PIOTR, 22.09].** `canHire` for a joiner asks for a free
place at a bench for him **and** one for the owner: places on the hall against the joiners on
the books plus one. The refusal line: `No place at a bench for him: the owner needs one too`. A
save whose crew already fills the benches loads as it is; the gate only refuses the next man.
Done: the engine test (one industrial bench, three places: the second joiner is hired, the third
refused with the line; a used bench bought: the third is hired), the hire card test.

**2.3 A contract man with nothing to do stands at the canteen door [PIOTR, 22.09].** v45 lets
him go of his saw while the contract waits for material or the crew have gone home;
`contractStationFor` still stands him at the saw's waiting cell. Tonight, whenever
`contractMenAtWork` does not list him, `contractStationFor` returns the canteen door cell, the
one a man with no bench stands on (`STATION_NO_BENCH` draws it), and the mark over his head is
`noMaterial` with the contract's name (`no sheets for <contract>`), through `bubbleFor`. Done:
the engine test (rack empty: at the canteen door with the mark; a delivery: at the saw the next
minute), the render test (the mark's words).

**2.4 Wear on the machine minutes only [PIOTR, 22.09].** A contract charges its machine wear on
the minutes the man actually stands at a machine of the piece's family, and none on a minute at
the bench or by hand. `contractResultFor` and the closing report read the same rule: the card's
`Machine wear a piece` is the piece's machine minutes times `machineWearPerMinute`, and a piece
made by hand shows `Machine wear a piece, by hand` at nought as it does today. The cut sheet
pack is all saw, so its figures do not move; a wardrobe front is cut and assembled, so its wear
falls to the cut minutes only. Done: the engine tests (a pack: unchanged to the pence; a front:
wear equal to its cutting minutes times the saw's wear a minute), tests/engine/contractPrices
restated where it moves.

### Nine leftovers

**2.5 The men at a bench stand on its front row [REPORT-T23 0.12].** The second and third man
at a bench stand on the front cells of the bench's own footprint, in a row: the operator on the
front cell of the first column, the second man on the front cell of the second column, the third
on the third (an industrial bench is three wide). `secondStation` and `placeStation` resolve to
those cells and to nothing off the footprint. Done: the render test (a standard bench at 8,6:
the two men on 8,7 and 9,7, both inside the footprint), the station test.

**2.6 The canteen's plates read across [REPORT-T23 0.13].** The eight plates are lettered in
reading order across both banks: the top row of the left bank, then the top row of the right, then
the two bottom rows. The right bank's plates sit at the height the picture has them: measured on
`canteenLockers.png` by the agent, the figures written into `CANTEEN_PLATES` and into
docs/mockups/t23/canteen-regions.json alike, the report says the pixels. Done: the render test.

**2.7 Central systems serviced like extractors [REPORT-T23 0.8].** `dustSystem` and
`flexiSystem` book their hours while the extraction runs and are serviced exactly as an
extractor is since T23 2.8: the same due point, the same card button, the same day out. Done: the
engine test (a system that ran three weeks has hours and comes due), the Machines page test.

**2.8 A restock is never trimmed to the rack [open since v38].** A restock larger than the rack's
free room is accepted in full: what fits goes on the rack, the rest goes to the temporary store
under T20's overflow rule, with its fee and its fetch task, and the Materials tab says so before
the click (`60 sheets: 40 on the rack, 20 to storage at £X`). Done: the engine test (a rack with
room for 40, an order of 60: 40 on the rack, 20 in storage, the fee charged), the tab test.

**2.9 Two deletions and one sentence.** `oldestOpenJob` (jobs.ts, no reader since v41) and
`weekEfficiency` (staff.ts, no reader since T23) are deleted with their exports and tests.
docs/art/SPRITES.md 10.4 says a man does not walk faster at x10; v44 made him walk at 1.5 cells a
second when the clock runs faster than x1: the one sentence is corrected and names
`WALK_CELLS_PER_SECOND_FAST`. Done: `grep -rn "oldestOpenJob\|weekEfficiency" src tests`:
nothing.

**2.10 The cheap start, a year of it [PIOTR, 20.09].** A scenario in tests/scenarios, (pp): a
year on Easy with the scripted player buying used machines only, hiring one joiner a quarter, and
taking the first contract its crew can keep up with, against the 10,000 loan floor. It asserts
nothing about survival: it prints the twelve month ends (cash, reputation, crew, machines) and
whether the bank closed the company, and the report carries the table, so Piotr can rule on the
floor with the figures in front of him. Done: the scenario green, the table in the report.

## 3. How to run this session

One agent, serial, in the order of section 5. Phase A first (STATE_VERSION 26, the migration,
`byMan`, the version bump), then 2.1 to 2.10, then the notes, the cross check, the pictures, the
report and the PR. No worktrees, no agent teams: nothing here is large enough to split.

## 4. State

STATE_VERSION 26. `dayStats.byMan` is added, `{}` in an old save; nothing else changes. Every
v25 save loads, the two fixtures in tests/fixtures (day128, day149) among them.

## 5. Task queue, in order

Branch turn-24-who-made-it from main. One commit per task, npm run check green on its own exit
code before each, two report lines per task in REPORT-T24.md.

T24-A1 Housekeeping and v50: docs/turn-23-brief.md byte for byte from main's CLAUDE.md, this
file as CLAUDE.md, APP_VERSION 'v50', STATE_VERSION 26 and the migration of section 4.
T24-B1 2.1. T24-B2 2.2. T24-B3 2.3. T24-B4 2.4. T24-B5 2.5. T24-B6 2.6. T24-B7 2.7.
T24-B8 2.8. T24-B9 2.9. T24-B10 2.10.
T24-C1 notes. T24-C2 the scenarios re run and the playthrough figures restated if they move
(2.4 and 2.8 may move them; say by how much and why). T24-C3 the cross check of section 7.
T24-C4 look and shoot into docs/report-t24/: the Output sheet with the block on the day 141
fixture (load it through the loader, play a minute, open the board); the hire card refused with
the owner's line; a contract man at the canteen door with `no sheets for` over him; two men on a
standard bench and three on an industrial one; the canteen with eight names in reading order; a
dust system's card with `Service it`; the Materials tab with the storage line. T24-C5 report and
PR titled `Turn 24: the number says who made it, the boss has a bench, nine leftovers closed`,
do not merge, end the session.

## 6. Do not (tonight)

- No change to what a production minute is worth, to the stage shares, to the bag of work, to the
  contract prices, to the walk speed, to the bench rule of v47, to the by hand rule of 9.5.
- No decision on the open questions of section 8: leave them as they are.
- No pipe elements, no van classes, no electric pallet truck: the art side's spare files stay out
  of the repository.
- No touching CLAUDE.md after A1, the archived briefs, the mockup files, the character sheets,
  the sprite files; docs/art/SPRITES.md only the one sentence of 2.9;
  docs/mockups/t23/canteen-regions.json only the figures of 2.6.
- No storage access outside src/cloud/store.ts; no PixiJS, mobile, Steam, Electron.
- No watch loops, nothing left running.

## 7. The cross check (before the PR)

- On the day 141 fixture after one minute: four rows under `Who made it today`, every one `by
  hand`, the sum `= 0.75` to the figure the top bar shows, the note naming the oak table and the
  solid wood tools, asserted.
- An extractor on service: the hall row reads `extractor on service`, asserted.
- One industrial bench, two joiners on the books: a third hire refused with the owner's line;
  a used bench bought: hired, asserted.
- A contract man with an empty rack: at the canteen door, no saw held, `no sheets for` over
  him, asserted.
- A wardrobe front's wear equals its cutting minutes times the saw's wear a minute, asserted; a
  cut sheet pack's card unchanged to the pence, asserted.
- Two men at a standard bench on its two front cells, asserted.
- A dust system that ran three weeks is due a service, asserted.
- Sixty sheets into a rack with room for forty: forty on the rack, twenty in storage, asserted.
- `grep -rn "oldestOpenJob\|weekEfficiency" src tests`: nothing.
- Every scenario green; the playthrough figures restated if 2.4 or 2.8 moved them, with the
  reason; the year of (pp) in the report as a table.
- Every changed screen beside its nearest existing one in the report; `git diff main --stat --
  src/ui/styles.css` with no new token.
- The pictures of C4.

## 8. Parked (Piotr has not ruled)

- A by hand job runs at 0.67 at a saw the hall owns (rule 9.5): keep, or let the saw count?
- A contract's day (201) equal to a job's (203), or lower it (T20 2.2)?
- The wardrobe front at 370 a piece, or a fractional daily target?
- Five van classes and an electric pallet truck (the art is in the pack of 22.09): a design
  turn, not tonight.

## 9. Art

- Landed since T23: the eight house pictures (v48), the thicknessers, the van, the forklift, the
  pallet truck and the hand tool set (v49). Nothing owed for them.
- Still wanted from earlier turns: the sprayer's four sheets, the helper's bench sheet, the seven
  recordings, a perspective pass on the canteen lockers.

End of brief.