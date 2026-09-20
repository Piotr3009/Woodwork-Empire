# Turn 23: a man works when the boss says so, a manager who earns his keep, a canteen with eight lockers

Woodwork Empire. Autonomous session brief for Claude Code (Opus 5, effort ultracode, cloud, agent
teams expected, a whole day of it). Owner: Piotr. Programmer: Claude. Spec author: Claude (chat),
20.09.2026, from Piotr's decisions of 19.09 and 20.09 (Petros: software/woodwork-empire, STAN,
the blocks "WSAD T23" and "DECYZJE PIOTRA DO T23").

Read this whole file (first line must say "Turn 23"; if the root CLAUDE.md does not, stop and
report), then REPORT-T22.md in full (section 0 and "What was not done tonight"), then
docs/mockups/t23/README.md and its picture, then docs/ui-style.md, then the archived briefs in
docs/. Where files disagree, this one wins. All standing rules apply (no em or en dashes anywhere,
scope 1:1, one code path, constants never in the UI, [TUNE] for every figure you choose and
[PIOTR] for his, kill background processes, PR without merge, end the session, no PR watching,
npm run check gated on its own exit code, every click single, one APP_VERSION bump).

Precondition. main carries Turn 22 merged and three chat fixes: APP_VERSION 'v35',
STATE_VERSION 19, no pipe drawing on the hall (v33), the extraction margin said out loud (v34),
the specification under the rule of a machine's card (v35), every floor family with a true
quarter turn in `public/sprites`, and the canteen room's five layers (`canteenBackground.png`,
`canteenKitchen.png`, `canteenLockers.png`, `canteenTable.png`, `canteenLockersLit.png`, 1672 by
941 each) in `public/sprites` and in the manifest, with their regions in
docs/mockups/t23/canteen-regions.json. If APP_VERSION is not 'v35' or a layer is missing, stop
and report.

The four rules of 18.09 bind every agent: **one game, one look** (read the repo first, build with
what is there, `docs/ui-style.md` is the guide, phase C compares every changed screen with its
nearest existing one); **nothing visual without a mockup** (the canteen room as delivered, its
concept and the team cards in docs/mockups/t23 are the pictures this turn builds from, and 2.9 says what is still
placeholder; every other section states its change line by line on screens that exist); **no
sound without a recorded file** (there are none; the hall stays silent); **every modal, popover
and list has the cross, Escape and click outside**, and the popover test keeps proving it.

## 0. What this turn is for (Piotr, 20.09)

Today a joiner with nothing to do helps himself to the oldest job on the list, so the owner is
never needed and the production manager, who exists since Turn 13, changes nothing while the owner
is in. Piotr wants it the way it is in a real shop of his size: **a man works when the boss puts
him on a job.** Without a manager, a free man waits for the owner's word, which is a click in the
Work Plan and nothing else; the owner, when his office is empty, goes to the bench himself and
never stands with his hands in his pockets. With a manager the assigning is his, in four grades
from "the oldest job first" to "every deadline kept", and the grade says how many men he can
carry. The visible difference between the two states is what sells the manager.

Around that, four tidy ups Piotr asked for while looking at his hall, and one new room: the
cordless drill goes, the hand tools go into the cabinet where they belong, a bench without air
stands still, the extractor is serviced like the machines it serves, and the canteen opens as a
room of its own with eight lockers, one per worker, and no more than eight men on the books until
there is a bigger one.

## 1. Rules restated (short)

Everything from Turns 1 to 22. Tonight in addition:

- APP_VERSION = 'v36'. STATE_VERSION bumps to 20 in phase A, once, for section 4; every v33, v34
  and v35 save loads.
- **Nobody takes a job by himself without a manager on duty** [PIOTR, 20.09]. The owner's click
  in the Work Plan costs nobody any minutes. A man carries on yesterday's job without a click and
  works an assigned job to its end.
- **The manager assigns, in his grade's way, up to his grade's number of men** [PIOTR].
- **The owner never stands idle** [PIOTR]: an empty office queue sends him to the bench.
- **Eight lockers, eight men** [PIOTR]: the canteen's lockers are the cap on the crew.

## 2. Changes to the design (the contract)

### The men and the boss

**2.1 A joiner waits for the boss [PIOTR, 20.09].** `autoAssignJobs` runs for the men on the
books only while a production manager is on duty (2.4). Without one, a man with no job **waits**:
at his home cell, with the red mark of Turn 22's 2.5 and the hover line `waiting for the boss`,
his minutes counted as idle on the day meter with that reason; the Work Plan shows him in the
crew column as `needs a job` and the job rows keep their Assign (the `ASSIGN_JOB` action and the
chips that already exist, one click, nothing new to build). Two things need no click: a man who
had a job yesterday carries on with it in the morning, and a man on a job stays on it to its end,
whatever else appears on the board. The second shift and the contracts keep their own rules
(CLAUDE.md T13 3.9, T20). Done: the engine test (a free man, an open job, no manager: nobody is
assigned in a day; the boss assigns him; the next morning he is still on it; a second job appears
and he does not move), the Work Plan test (`needs a job` in the crew column), the day meter test
(the idle reason), and every scenario of tests/scenarios rewritten to the boss's click: a
helper in the scenario harness that assigns every free man to the oldest open job at the start of
each day, which is what an attentive player does; the harness says so in one comment.

**2.2 The daily staff management task goes [PIOTR: "fewer problems for people"].** The task kind
`staffManagement`, `STAFF_MANAGEMENT_MINUTES_PER_JOINER`, `staffManagementMinutes`,
`staffManagementTaker`, its line on the team page and on both day meters, its daily raising, and
its tests are deleted. Nothing costs anybody minutes for assigning. Done: `grep -rn
"staffManagement" src tests`: nothing; the daily task list test rewritten.

**2.3 The owner takes a job himself [PIOTR: "he never stands doing nothing"].** Once a minute,
when the owner is available, on the hall side of the door, not on a task and not on a job, and
his office queue holds nothing he can do now (no open task of his), he takes the oldest job that
is `ready` or `inProduction` with nobody on it, as lead, the way a joiner did until tonight; a
job somebody else is on he does not join by day (the evening take over of Turn 17 stays as it
is). The player can move him off it in the Work Plan like anybody. He never takes a contract
[PIOTR, 19.09]. His own idle reason `nothingAssigned` therefore only fires when there is work he
cannot take (all of it somebody's); `officeEmpty` stays. Done: the engine test (empty office, an
open job: he is on it within a minute; an office task appears: he finishes the piece he is on and
goes to the office, as the owner's tasks already take him; nothing open: `officeEmpty`).

**2.4 The production manager in four grades [PIOTR, 20.09].** The manager becomes a tiered role
through `tieredSpecs`, the same four grades and cards as a joiner (`novice`, `experienced`,
`senior`, `master`), hired from the hire cards of Turn 21, one on the books at a time as today.
His grade says three things, three tables in `constants.ts`:

| grade | carries up to [TUNE] | how he assigns | pace of the men he carries [TUNE] | wage a month [TUNE] |
| --- | --- | --- | --- | --- |
| novice | 8 men | the oldest open job first | 1.03 | 2,400 |
| experienced | 12 | the soonest deadline first | 1.05 | 3,400 |
| senior | 18 | soonest deadline, and never two men queued at one machine when another job's bench work is open | 1.08 | 4,200 |
| master | 25 | senior's rule, and at every hour he re plans: a man whose job is comfortably ahead is moved to a job that is behind (the transfer of Turn 21's 2.7, gated behind this grade alone) | 1.10 | 5,200 |

"Carries" is the men on the books, the owner not counted, in the order they were hired: a man
past the manager's number is a man without a manager, who waits for the boss as in 2.1, so the
player sees what a better grade is for. The pace factor multiplies the production minutes of the
men he carries, the way a tier's rate does, and shows on the efficiency breakdown as one line
`Manager: +5%`. `autoAssignJobs` runs for the men he carries in his grade's order. The owner
away rule (8% instead of 30%) stays for every grade. His duties line on the card says the three
figures in words: `Assigns up to 12 men, soonest deadline first, +5% pace`. Migration: the
manager a save has is `experienced` (his wage today, 3,400). The one `productionManager` spec
with `tier: null`, `PRODUCTION_MANAGER_MONTHLY_WAGE` and `PRODUCTION_MANAGER_REPUTATION` become
the four tiered specs and their tables. Done: the engine tests (a novice with nine men: the ninth
waits for the boss; the orders of the four grades on a board of three jobs with three deadlines;
the master's move once a job is a day behind and another a day ahead; the factor on a man's
minutes), the hire card test (four manager cards), the breakdown test, the migration test.

### The hall

**2.5 The cordless drill goes [PIOTR].** The spec `drill`, its catalogue line, its placement,
`public/sprites/drill.png` (deleted, the manifest regenerated) and its tests. Migration: a drill
in a save vanishes, no refund, one ledger line `Cordless drill retired (v36)`. Done: `grep -rn
"'drill'" src`: nothing but the migration.

**2.6 The hand tools live in the cabinet [PIOTR].** A hand tool set is still bought, one per
worker and one for the owner, at its price, and still takes a cabinet slot (CLAUDE.md T22 2.12);
from tonight it is **not a thing on the hall**: no sprite, no cell, no slot on the floor, no
placeholder. `public/sprites/handToolSet.png` is deleted with the manifest regenerated; the
placement of a set on a cabinet's slot and its drawing go; the cabinet's card keeps `Holds 4
men's tools · 3 in use`, and a click on the set's line in the Owned tab opens nothing (there is
nothing to open). The hiring gate is unchanged: a man needs a free slot and a set. Migration: a
placed set keeps its record and loses its position. Done: the tests of 2.12 rewritten to sets
without cells, the hall render test (no set drawn), `grep -rn "handToolSet" src/render`:
nothing.

**2.7 No bench work without air [PIOTR].** A man at a bench needs a compressor on the hall with
litres to spare for him: the bench draws its 30 l/min at 6 bar (`AIR_BENCH_DEMAND`, unchanged)
and without a compressor, or on one that is short, he **stands** at the bench with the red mark
and the hover line `no compressor` (a fifth state on the list of Turn 22's 2.5), his minutes
idle with that reason. Today's rule (the bench draws air if there is any and works anyway) goes.
Done: the engine test (a bench, a job, no compressor: no work and the reason; a used compressor
bought: work resumes the next minute), the day meter test.

**2.8 The extractor is serviced like a machine [PIOTR].** An extractor books its hours while the
extraction runs (`extractionRunning`, every minute of it, whoever is at what), against the
endurance its class already has, and from those hours it is serviced exactly as a machine is:
the same due point, `service due` on the Machines page, `Service it` on its card, the call in
and the working day out, the same extension of life (CLAUDE.md T20 2.9). A breakdown is still a
repair, as today. The words `Repaired, never serviced` go from the game. `serviceableMachines`
takes the extraction in. Done: the engine test (a fan that ran three weeks has hours; service
due at the class's point; the call takes it out for the day and the hall is unserved that day),
the Machines page test, the card test.

### The canteen

**2.9 The canteen opens as a room [PIOTR, 20.09; docs/mockups/t23/canteen-view-concept.png].**
A click on the canteen block on the hall opens the canteen the way the office door opens the
office (CLAUDE.md T7 3.8, SPRITES.md 8): a full screen photoreal room on the same 1672 by 941
canvas, layers in `public/sprites`, the same scaling, letterboxing, regions and hover lighting,
built with the office view's own machinery (`src/render/office.ts` gains a sibling for the
canteen or is generalised to a room, one code path for both; the agent decides and says which in
the report). The layers, back to front, with the office's placeholder rule until each file lands:

| layer | file | needs |
| --- | --- | --- |
| the room | `canteenBackground.png` | nothing, from the first morning |
| the kitchenette | `canteenKitchen.png` | nothing |
| the two locker banks, eight closed doors | `canteenLockers.png` | nothing |
| the table and two stools | `canteenTable.png` | nothing (the seats are the room's, 2.11) |
| the lockers, lit | `canteenLockersLit.png` | hover on the lockers region |

Live text drawn by the game over the layers, as the office draws its clock and company name: the
**name of the worker on each of the eight door plates** whose locker it is (the lockers bought
per worker since Turn 17, in the order bought; an unbought locker's plate stays blank) and, on
the counter above the banks, `5 of 8 lockers in use`. Regions: the door returns to the hall; the
lockers open the team page; the kitchen and the table do nothing yet. The rectangles of the
regions, the eight plates and the counter live in one table in `constants.ts`
(`CANTEEN_REGIONS`, `CANTEEN_PLATES`, `CANTEEN_COUNTER`), **copied figure for figure from
docs/mockups/t23/canteen-regions.json** (the art side's own measurement of its layers: the
door at 1390, 0, 282 by 941; the lockers at 27, 170, 710 by 500; eight plates in reading order
starting 97, 250, 147 by 33; the counter at 95, 35, 450 by 65; the plate text 18 px, at most
eight characters, centred; the counter text 24 px). The five layers are in the repo tonight, so
the room draws them from the first picture; the office's flat placeholder stays the rule for a
layer that is ever missing (T7 3.8). Done: the render tests (five layers in order, a placeholder
for a file taken out of the list, the eight plates with the right names at their rectangles,
the counter line), the region tests (door, lockers), the popover test.

**2.10 Eight lockers, eight men [PIOTR].** This canteen has eight compartments, so a ninth
locker cannot be bought: the catalogue line greys with `The canteen has eight lockers`, and the
hiring gate (`canHire`), which already asks for a locker, therefore refuses the ninth man on
the books with `No locker for him: the canteen holds eight`. The owner needs no locker. A bigger
canteen is parked (section 8). Done: the engine tests (the ninth locker refused; the ninth hire
refused with the reason; eight is fine), the catalogue test.

**2.11 The canteen seat goes [PIOTR, 20.09: "too much micromanagement"].** The room has its table
and two stools from the first morning and breaks are taken in shifts, so nobody buys a seat: the
spec `canteenSeat`, its catalogue line, `CANTEEN_SLOT_LAYOUT`, the seat's place in the welfare
kit (`WELFARE_IN_THE_CANTEEN` keeps the locker alone), the seat in the hiring gate (a man needs a
bench, a locker and a set of tools; the seat is struck from `canHire` and from the header of
staff.ts) and its tests. The locker stays a purchase, one per worker at its price, and is the
eighth-man cap of 2.10. Migration: seats in a save vanish, no refund, one ledger line `Canteen
seats retired (v36)`. Done: `grep -rn "canteenSeat" src`: nothing but the migration; the hiring
gate test without a seat.

### The money

**2.12 The loan follows the turnover [PIOTR, 20.09].** `LOAN_MAX` stops being one figure.
The bank lends up to **a quarter of the last twelve months' sales** (the invoiced sales of the
rolling twelve calendar months before today, off the ledger), and never less than **10,000**
[TUNE], which is what a new company with no history gets; there is no upper cap [PIOTR: "no
upper limit"]. One loan at a time as today; the rate, the sixty instalments and the free early
repayment are unchanged (CLAUDE.md T13 3.14). The refusal and the finance card say where the
figure comes from: `The bank lends up to £30,000: a quarter of your last twelve months' sales`
and, under the floor, `The bank lends a new company up to £10,000`. `loanCheck` reads one
function `loanLimit(state)` and so does the card. Done: the engine tests (no sales: 10,000;
sales of 120,000 in the last twelve months: 30,000; a sale thirteen months old does not count; a
second loan refused while one runs), the finance card test with both sentences.

### The people on the screen

**2.13 A card for every person, and Our team made of them [PIOTR, 20.09: "made for an accountant,
not a player"; docs/mockups/t23/team-cards.png].** Two things drawn by one function. The **tile**:
the figure's portrait (the idle frame of his role's sheet, the capsule for a role with no sheet),
the name in the title hand, a chip for the role and a chip for the grade with its pace (`novice
×0.6`), one line `now: cutting Small kitchen at the table saw` (red in the `warn` token when he is
waiting, with the reason), the bar of his day (worked in `--good`, idle in `--bad`, the break in
grey, off the day meter of Turn 21's 2.8 and nothing else), under it `4 h 20 worked · 40 min idle
· 27 h this week`, the wage a month, and one button: `Let go` as today, `Assign` when he is waiting
for the boss, `Office` on the owner. `Our team` on the laptop becomes a column of these tiles, the
owner first; the accountant's lines of Turn 17 (`This week: 0 h worked, jobs 0 h, efficiency 0%`)
go, their figures live in the card. The **card**: the same tile grown into the machine card's
skin, opened by a click on a figure on the hall (in place of the bare assign list of Turn 19,
which becomes the card's Assign) and by a click on a tile: portrait, name, chips, started on and
days ago, wage, then under the rule `now:`, the day bar with its three figures, `this week` and
`last week` (worked and idle, off the week meters of Turn 17's 2.24), `on: Garage shelves
(assembly, 40% done)`, `days off this month · accidents`, and the two buttons `Assign` (the list
of Turn 19) and `Let go`; the owner's card has `Office` and no `Let go`. The cross, Escape and
the click outside as everywhere. Done: the render tests (the tile's parts, the owner's tile, the
waiting man's red line and Assign), the card tests (opens from the hall and from the tile; Assign
opens the list; Let go asks and does), the popover test, and `grep -rn "efficiency 0%" src`:
nothing.

**2.14 Monthly reports in place of the ledger [PIOTR, 20.09].** The month end card of Turn 17
is kept: every month end writes its figures (the same figures the card shows, as data) into
`state.monthlyReports`, one entry a month, and Accounting's `Ledger` tab becomes `Monthly
reports`: a list of the months, newest first, and a click opens that month's card, drawn by the
one function that draws it at the month end. The ledger stays in the engine as the record it is
(2.12 reads it; the summary tab reads it) and loses its own screen. A tip line under a report
(Piotr's example: transport over 5,000 a month → consider a driver and a van, with the sum) is
**parked**: the report is stored as figures tonight so that tips can be added to the drawing
later without touching the data. Done: the engine test (a month end appends one entry with the
card's figures; two months, two entries; a v35 save with no reports loads with an empty list),
the Accounting tests (the tab, the list, the click), the popover test.

**2.15 The gate says what it is for [PIOTR, 20.09].** On a machine's card the line
`Automatic gate: +2% output, and it counts toward the extraction only while it runs (frees
1,200 m³/h while it stands)` sits in the specification block of v35, in the `good` token, above
the `Automatic gate, £1,000` button; once fitted, the line of Turn 13 reads `Automatic gate
fitted: output +2%, counts only while running`. The two figures are `GATE_OUTPUT_BONUS` and the
machine's own demand. Done: the card test, both states.

### Material and benches

**2.16 The sheet's price follows the order [PIOTR, 20.09].** The two prices of Turn 13
(`SHEET_PRICE_STOCK` 175, `SHEET_PRICE_AD_HOC` 200) become one ladder by the number of sheets
in one order, whether the order is a job's take off or a restock, one function
`sheetPriceFor(sheets)` read by both [TUNE]:

| sheets in one order | a sheet |
| --- | --- |
| 1 to 9 | 200 |
| 10 to 29 | 190 |
| 30 to 49 | 180 |
| 50 to 99 | 170 |
| 100 to 199 | 160 |
| 200 to 499 | 150 |
| 500 to 999 | 135 |
| 1,000 and more | 120 |

The Materials tab says the price the typed number gets before the click (`60 sheets at £170 =
£10,200`), the take off's order line says its own. Nothing else about material changes: the
racks hold what they hold, the surplus goes to the temporary store as in Turn 20, `SHEET_VALUE`
stays 200. Done: the engine tests (9 sheets at 200; 10 at 190; 1,000 at 120; a take off of 6
pays 200), the Materials tab test with the line.

**2.17 Benches hold men [PIOTR, 20.09].** A bench class says how many men can work at it at
once, a second table on `WORKBENCH_VARIANTS` [TUNE]:

| class | men at it | pace | zone | price |
| --- | --- | --- | --- | --- |
| used | 1 | 0.95 | 2 by 2 | 120 |
| budget | 1 | 1.00 | 2 by 2 | 250 |
| standard | 2 | 1.03 | 2 by 2 | 450 |
| pro | 2 | 1.06 | 2 by 2 | 900 |
| industrial | 3 | 1.10 | 3 by 2 | 2,200 |

The pace is the class's `outputFactor` today, re tuned to top out at +10% (0.95, 1.00, 1.02,
1.05, 1.08 become the column above). The hiring gate, which asks for a bench, asks for **a free
place at a bench**: the sum of the classes' places over the benches on the hall against the men
on the books, the way it asks for a tool slot; a man's home bench is the first with a place
free. Two or three men at one bench each work their own job at that bench's pace; the
placement, the figures at the bench and the day meters follow the man, not the bench. The
catalogue line says `2 men, +3% pace`. Done: the engine tests (a standard bench hires two, the
third is refused with `No place at a bench`; the pace of each man at a pro bench), the render
test (two figures at one bench), the migration (nothing to migrate: the places are a rule).

## 3. How to run this session (agents)

- **Phase A (one agent, serial):** STATE_VERSION 20 and the migrations of section 4; the four
  manager specs and their three tables; the deletion of `staffManagement`, of the drill, of the
  canteen seat, of the set's placement; `public/sprites/drill.png` and `handToolSet.png` deleted and `npm run
  sprites:manifest` run; the canteen tables of 2.9. Frozen for phase B after this.
- **Phase B (three agents):** B1 the men and the boss: 2.1, 2.3, 2.4, 2.13 (staff.ts, production.ts,
  jobs.ts, plan.ts, team.ts, the hire cards, the breakdown, the person card). B2 the hall and the money: 2.6's drawing side, 2.7,
  2.8, 2.12, 2.14, 2.15, 2.16, 2.17 (machines.ts, materials.ts, media.ts, hall.ts, machinesPage.ts, catalogue.ts, finance.ts,
  accounting.ts, monthEnd.ts). B3 the canteen: 2.9, 2.10, 2.11
  (render/office.ts or its sibling, app.ts for the click and the view, catalogue.ts for the
  locker line, staff.ts for the gate's reason).
- **Phase C (one agent, serial):** the notes, the scenarios (every one rewritten to the boss's
  click as 2.1 says; (ll) three men, no manager, the boss assigns each morning: nobody idle past
  the first minute of a day; (mm) the same crew with a novice manager: the same output plus 3%
  and the owner never at the Work Plan; (nn) nine men and a novice: the ninth waits every day
  until the manager is experienced; (oo) a bench and no compressor: no bench minutes at all),
  the cross check of section 7, the pictures, the report, the PR.

## 4. State

STATE_VERSION 20. `state.monthlyReports` is added, empty in an old save; `worker.tier` is set on the manager (the migration writes `experienced`);
`item` records of specId `drill` and `canteenSeat` are removed; `handToolSet` items lose `anchorX`/`anchorY` and
keep their id and cabinet; `state.tasks` loses every `staffManagement`; nothing else changes.
Every v33, v34 and v35 save loads.

## 5. Task queue, in order

Branch turn-23-when-the-boss-says-so from main. One commit per task, npm run check green on its
own exit code before each, two report lines per task in REPORT-T23.md.

T23-A1 Housekeeping and v36: docs/turn-22-brief.md byte for byte from the Turn 22 merge commit's
CLAUDE.md, the README's lines, APP_VERSION 'v36', docs/art/REQUESTS-T23.md (section 9).
T23-A2 Phase A as section 3 says.
T23-B1a 2.1. T23-B1b 2.2 (whatever of it phase A left in the UI). T23-B1c 2.3. T23-B1d 2.4. T23-B1e 2.13.
T23-B2a 2.5 (the UI side). T23-B2b 2.6. T23-B2c 2.7. T23-B2d 2.8. T23-B2e 2.12. T23-B2f 2.14. T23-B2g 2.15. T23-B2h 2.16. T23-B2i 2.17.
T23-B3a 2.9. T23-B3b 2.10. T23-B3c 2.11.
T23-C1 notes. T23-C2 scenarios. T23-C3 cross check. T23-C4 look and shoot: seventeen pictures into
docs/report-t23/ (a man with the red mark and `waiting for the boss` on hover; the Work Plan crew
column with `needs a job`; the owner at a bench with an empty office; the four manager hire
cards; the efficiency breakdown with `Manager: +5%`; a ninth man waiting under a novice; a bench
with `no compressor`; the extractor's card with `Service it`; the canteen room with placeholders
or files, whichever is there, with names on the plates and the counter line; the hall with no
drill and no hand tool set anywhere; the catalogue's greyed ninth locker; the hire card refused
with `No locker for him`; Our team as tiles; a person's card opened from the hall; Accounting's
Monthly reports with a past month open; the Materials tab with `60 sheets at £170`; two men at one
standard bench). T23-C5 report and PR titled `Turn 23: a man works when the boss says
so, a manager who earns his keep, a canteen with eight lockers`, do not merge, end the session.

## 6. Do not (tonight)

- No change to Output, Efficiency, the rate, the contract prices, the design time, the joiners'
  tiers and pay, the extraction margin, the dust rules, `SHEET_VALUE`.
- No sound; no new mockup built from words; no picture drawn by an agent; the canteen's missing
  layers are the office's flat placeholders and nothing painted.
- No touching docs/art/SPRITES.md, CLAUDE.md, the archived briefs, the mockup files, the
  character sheets, the font file, or any sprite file other than `drill.png` and
  `handToolSet.png` (deleted, never redrawn).
- No bigger canteen, no owner's holidays, no second manager.
- No storage access outside src/cloud/store.ts; no PixiJS, mobile, Steam, Electron.
- No watch loops, nothing left running.

## 7. The cross check (before the PR)

- `grep -rn "staffManagement" src tests`: nothing.
- `grep -rn "'drill'\|canteenSeat" src`: nothing but the migration; `ls public/sprites | grep -c "drill\|handToolSet"`: 0.
- A free man, an open job, no manager, a full day: zero production minutes, asserted; the boss's
  click: production the next minute, asserted.
- A novice with nine men: the ninth has a full day of idle with `waiting for the boss`, asserted.
- The owner with an empty office and an open job: on it within a minute, asserted.
- A bench with no compressor: no bench minutes, asserted.
- A fan that ran three weeks: hours booked and a service due, asserted.
- Nine lockers: the ninth refused; nine men: the ninth refused, asserted.
- No sales: the bank lends 10,000; 120,000 of sales in twelve months: 30,000, asserted.
- Ten sheets at 190 and a thousand at 120, asserted; a third man at a standard bench refused, asserted.
- Every scenario green with the boss's click in the harness, and the thirty day figures of
  REPORT-T22 restated for the new rules in the report (they will move; say by how much and why).
- Every changed screen beside its nearest existing one in the report, with the differences
  listed and none outside this brief; `git diff main --stat -- src/ui/styles.css` with no new
  token.
- The seventeen pictures.

## 8. Parked

- A bigger canteen (twelve, sixteen lockers) that eats hall floor; the owner's holidays (after a
  year of play, PIOTR); a second manager or a second shift manager.
- The weekly summary card: mockup first [PIOTR]. Tips under a monthly report (2.14): Piotr's
  driver and van example is in Petros; later.
- Contracts worked at every stage; the owner at a contract: as in Turn 21.
- The extractors' backs (`.rr`, `.rrr`) and every family's backs: art.
- The port pixels of `src/engine/ports.ts`: nothing draws them; re read when something does.
- Three Turn 20 leftovers Piotr has not ruled on: the Efficiency chip without a cross, the
  Contracts tab in one column against the two of its mockup, the same rack sum in machines.ts and
  materials.ts.
- Sound files: Piotr's recordings.

## 9. Art requested (docs/art/REQUESTS-T23.md)

- The canteen room's layers landed on 20.09 and are in the repo (2.9). What the art side still
  owes for the room: nothing tonight; a perspective pass on the lockers and the table (they read
  as pasted against the room's vanishing lines) is Piotr's call for a later pack.
- Still wanted from earlier turns: the sprayer's four sheets, the helper's bench sheet, the seven
  recordings.

End of brief.
