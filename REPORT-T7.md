# Report: Turn 7

Production in stages, the shop, and time that always runs.

Branch `claude/nifty-lamport-vk2rbo` (the cloud environment names the branch; the brief's task
queue would have called it `turn-7-production-shop-time`). Base: Piotr's commit `41f8c45`, which
put this brief and the twenty sprite files into the repository. 730 tests green, `npm run check`
clean on its own exit code before every commit.

---

## 1. Done

| Task | Commit | What went in |
|---|---|---|
| T7-01 Housekeeping | `581c198` | `docs/turn-6-brief.md` out of git history and into the README; the manifest picks up the twenty delivered PNGs and the two tests that said the folder was empty now say what was delivered. |
| T7-02 Stages in the engine | `c509c18` | `src/engine/stages.ts`: the shares, the family each stage is done on, and what that family does to the minutes. Where a job has got to is still one number and the stage is read off it. |
| T7-03 One person per machine | `be8b98d` | `Equipment.takenBy`. He takes the machine of the stage he is at and lets it go when he moves on; the next man stands at it and waits. `capacity`, the share of it, the hours a day formula and the saw ratio are deleted. |
| T7-04 Classes for every family | `43e0798` | Five classes each for the bench, the rack and the edgebander, with Piotr's prices, factors, capacities, footprints and zones. `sheetRackBetter` deleted. `STATE_VERSION` 6. |
| T7-05 Working zones | `1f80dda` | Footprint and zone on every class, in metres. Placement, the drag ghost, the painting, the catalogue's refusals and the Sprite check page all read them. The starting layout redone; the buy everything test still fits 174 cells. |
| T7-06 CNC | `3a7034a` | Cutting and machining of a sheet job as one CNC stage at 2.0, assembly at half; the tool changer head takes the stage to 2.1. Saw fallback on the job card. The flat "labour minus 20%" is gone with the field that held it. |
| T7-07 Boss meeting and admin cover | `d4786ef` | Four hours at the client's before anything is drawn on a job over 20,000, the salesman from reputation 40, and an office admin covering the specialists the company has not taken on at half the speed. |
| T7-08 Work Plan as a Gantt | `c640bfa` | `src/engine/plan.ts` and a rewritten Work Plan: one row a job, a bar a stage in the whiteboard's colours, done filled and remaining hatched, a grey gap with its reason, today marked and the deadline a red line. |
| T7-09 Figures at stations | `f5cb6a4` | The figure stands at the machine of his stage for as long as the stage takes, or beside it with "waiting for table saw" under his name. The Turn 2 shuttle is deleted. |
| T7-10 Equipment modal | `c74a729` | Tabs in Piotr's order, a folder per family inside a tab, the classes inline inside a folder, the owned frame and the count, the filter scoped to the open folder. The separate machine modal is gone. |
| T7-11 Empty office | `c969c1b` | A new game opens on a room with no desk, no chair and no laptop, and a catalogue on the floor by the door with "Equipment" on its cover. The desk brings the binder, the laptop brings the board. |
| T7-12 Accounting this year | `06a901f` | A fourth Summary column added up out of the ledger the state carries, and a month selector on the Days tab. |
| T7-13 Sprites per class | `112864f` | The class id is the loader tier for every family; the file each class owes measures what the table of 3.5 works out from its footprint; the anchor of every class lands on the bottom corner of that footprint. |
| T7-14 Nothing in paused time | `11a93a2` | Every purchase, licence and hire is an order the owner goes out for, in his own minutes, booked when he gets back. The acting modals and setup mode do not open on a stopped clock. `STATE_VERSION` 7. |
| T7-15 Scenarios | `e33fbb0` | The months carry the shopping minutes, the stages and the meeting, and two new ones answer Piotr's saw question. |
| T7-16 Report and PR | this commit | This file, and the one performance guard section 6 turned up. |

---

## 2. Not done or partial

1. **Compressed air and extraction capacity are untouched**, as the brief says: Turn 8.
2. **There is no way to sell a machine.** 3.10 lists "sale of a machine" among the things that
   cost owner minutes and need the clock running. The game has never had a sell action, so there
   was nothing to gate and nothing to charge. When selling arrives it goes through `placeOrder`
   like everything else. Open question 1.
3. **The floor catalogue has no picture.** 3.8 allows exactly this: the game draws the object
   itself, and the report asks GPT for one. Open question 2.
4. **`sheetRackBetter.standard.png` is now an unused file.** The brief says to leave it on disk and
   note it, and a test asserts that no engine class resolves to it.
5. **`tableSaw.png` and the other family files were never delivered.** Only the class files were,
   which is what the loader asks for; the family key on its own falls back to the placeholder box
   and a test says so.

---

## 3. Production in stages, which is most of the turn

Turn 6 ran a job as one bar of labour with one machine factor multiplied over the lot. Tonight it
is five stages, each on its own machine, each at the speed of the man standing at that machine.

The whole of it hangs on one decision: **a job still carries one number**. `labourRemaining` is
what it always was, and `stagePlanFor` turns it into the boundaries of the stages. Nothing carries
a second copy of where a job has got to, so nothing can disagree with anything. The stage runs the
Gantt draws are a record of what happened, written as each stage opens and closes, and they are
never read back to decide where the job is.

The second decision: **a machine is free, or one man is standing at it**. `takenBy` is one field
and `claimMachine` is one function. Everything else fell out of it:

- Hours are the minutes somebody stood there, so an extractor and a compressor never come due for
  a service, because nobody ever stands at one.
- The Turn 6 capacity model, the share of a machine and the hours a day formula had nothing left to
  say and are deleted, and so is the Turn 1 saw ratio that slowed a fourth joiner down: he stands
  and waits now, which is the real thing that happens.
- The Turn 2 station cycle (15 at the bench, 5 at the saw) is deleted: a figure is at the station
  of the stage he is working, for as long as that stage takes.
- A machine stops the stage it does and no other. A broken edgebander no longer stops a job that is
  still being cut.

`claimMachine` takes the **best** free machine of the family, not literally the first. The brief
says "the first free machine of the family", and first would make the projection on the job card a
lie whenever the hall has a used saw and an industrial one: the card would promise the factor of
whichever machine happened to be earlier in the array. Deviation 3.

---

## 4. The shop, and the day that has to be running

Piotr, mega important: "You cannot make any purchase or any move without time running. A purchase
takes at least an hour. You cannot open the computer while time is paused."

Every purchase, every software licence and every hire is now an **order**. The order goes on a task
in the owner's own minutes; nothing is booked and no cash leaves until that task is done. One path:
`placeOrder`, and the `BUY_EQUIPMENT`, `BUY_SOFTWARE` and `HIRE` actions all come through it.

- An order is checked against the hall **as it will be when he gets back**, not the hall he is
  standing in. Buying a tool cabinet and a hand edgebander on the same visit works, because the
  cabinet is in by the time the bander arrives, and the cash for both is already gone. This is
  `afterTheTrips`, which settles a copy of the pending orders and asks the ordinary `canBuy` of
  that.
- The catalogue asks the same question the buy asks, so a button the engine would refuse is never
  drawn, and a tile that would have been locked on the old check is open when the thing it needs
  is on the same visit.
- The errands are run in the order he committed to them. Ordering a joiner's kit and then the
  joiner puts the interview behind the shopping, so the bench, the locker and the cabinet are on
  the floor before the man who needs them sits down.
- He goes back to whatever he put down when the last errand is over, the way the telephone works.

On a stopped clock the catalogue, the board, the books and the laptop do not open, and the hall
cannot be set out. The click leaves one line saying "Time is paused" and the Pause button beats
once. The Work Plan and the Sprite check page open on a stopped clock, because nothing on either of
them changes anything. Buying stock, ordering transport and paying the arrears refuse outright.

A new game still opens paused, so the player's first click in the office is the one that teaches
him the rule. Changing the starting speed was not in the brief and I have left it alone; it is
open question 3.

---

## 5. Deviations from the contract

1. **The branch name.** `claude/nifty-lamport-vk2rbo`, not `turn-7-production-shop-time`: the
   environment names the branch and the session may only push to the one it was given.
2. **The worked example in 3.1 does not add up.** "a 1,600 job at 640 owner minutes with an
   industrial saw (1.30) has a Cutting stage of 123 minutes". 123 is right **for a job of 640
   owner minutes**: 640 x 0.25 / 1.30 = 123.08. It is not right for a job worth 1,600, which
   carries 640 of labour value and is 960 owner minutes at Piotr's 800 a day. I tested the arith-
   metic the number belongs to, on a job of 640 owner minutes, and the test says so in its name.
3. **"the first free machine of the family" is the best free one.** Section 3 above.
4. **"no gap longer than 10 minutes over a month" holds, but only for a workshop that is not in
   lock step.** Six joiners behind two saws, each on his own job, with the book of work at six
   different points of its making: the longest anybody stands at a taken saw all month is one
   minute. Six *identical* jobs started in the same minute give day long waits with two saws and
   with six, because a man holds the saw for the whole of his cutting stage, which is Piotr's own
   rule. The scenario stands the hall up the way a running workshop looks on any given morning and
   says so in a comment. If Piotr meant the lock step case, the rule that would have to change is
   "one person per machine", not the scenario.
5. **The trip keeps running when the modal is shut.** 3.10 says "a task that runs while the modal
   is open". The engine has no idea what modal is open and must not: the trip is an ordinary owner
   task, it shows on the laptop's task list like every other, and he can put it down and pick it
   back up. What the modal does is show it.
6. **"in the same hour" is "while the trip is still running".** A trip he walked away from at five
   o'clock and picks back up in the morning is still the same trip, so the next thing on it is a
   quarter of an hour and not a fresh hour. The alternative was a clock reading buried in the
   purchase, which is worse.
7. **An order needs the owner in.** He is the one who goes, so a day he stays home is a day nothing
   is bought. The brief does not say this; it falls out of the trip being his.
8. **The test helper `buyNow` books a purchase without the trip.** Roughly ninety places in the
   engine tests only want a saw standing in the hall; making each of them spend an hour of the
   owner's day would have changed what those tests measure. The helper says so in its docstring.
   The trip is played out in full where it matters: `tests/ui/pausedTime.test.ts`, the first ten
   minutes walkthrough, the office region tests and every scenario month.

---

## 6. What reviewing the diff turned up

No separate review task was in tonight's queue, so this is what re-reading the night's own diff
found rather than a four reader pass:

1. **`orderCheck` cloned the whole state for every catalogue tile of every render.** The catalogue
   asks it ten times a render and the page is rebuilt every game minute, so at 4x that was a
   hundred and sixty state clones a second for nothing. It now returns the state untouched unless
   something is actually on order. Fixed in this commit.
2. **The interview jumped the shopping.** Ordering a joiner's kit and then the joiner put the
   owner in the interview first, so the hire was refused at the end of it for want of the bench he
   had just bought and the order evaporated. Errands are a queue now (`startNextTrip`), and the
   scenario that hires six joiners is what caught it.
3. **The catalogue refused the laptop on the same visit as the desk.** The tile asked `canBuy` of
   the hall as it stood; the buy asked `orderCheck` of the hall as it would be. Two answers to one
   question, which is the rule this repository is built on. The tile asks `orderCheck` now.
4. **A flake in the first ten minutes walkthrough** (carried over from T7-08): the real app seeds
   from the clock, so day two can open on a breakdown instead of the rack alarm. The test asks the
   day's events for the alarm rather than the screen. Five green runs in a row before it was left.

---

## 7. Paths: how many code paths do the same job?

| Question | The one path |
|---|---|
| Where has this job got to? | `job.labourRemaining` against `stagePlanFor` |
| Which machine is this man at? | `stationForProduction`, off the stage |
| Is this machine free? | `item.takenBy` |
| What floor does this class hold? | `zoneOf`, and `footprintOf` for what stands on it |
| Can this be placed here? | `canPlaceSpec`, on the zone |
| May he buy this? | `orderCheck`, asked by the tile and by the action alike |
| Is the clock stopped? | `timeIsPaused` |
| What is the trip costing him? | the task's own `minutesTotal` and `minutesRemaining` |
| What is this class's picture? | `spriteUrl(spriteKey, variantId)` |

---

## 8. Numbers chosen

Every `[TUNE]` the brief left open, with the value it now has. They are `[TUNE]` in the source
where the brief tagged them and `[PIOTR]` where Piotr set them.

| Number | Value | Why |
|---|---|---|
| Stage shares | 0.25 / 0.15 / 0.45 / 0.15 | The brief's own table; they sum to 1 and a test says so. |
| `CNC_STAGE_FACTOR` | 2.0 | Piotr: it replaces three saws, about a fifth off the whole job. |
| `CNC_STAGE_FACTOR_WITH_HEAD` | 2.1 | The brief's number for the tool changer head. |
| `CNC_ASSEMBLY_FACTOR` | 2 (half the minutes) | Piotr: bench time cut by half. |
| `SAW_FALLBACK_DEFAULT` | on | The brief's default. |
| `MEETING_SALESMAN_REPUTATION` | 40 | The brief's threshold. |
| `ADMIN_COVER_RATE` | 0.5 | "twice the minutes", which is half the speed. |
| thicknesser zone | 4 x 2 | 2 x 1 of machine with a metre of infeed and a metre of outfeed. |
| solidWoodTools zone | 3 x 2 | 2 x 1 of bench tools with a metre to stand and swing a board. |
| CNC zone | 5 x 4 | 3 x 2 of bed with a metre all round for sheets in and parts out. |
| sprayBooth zone | 4 x 3 | 3 x 2 of booth with half a metre each side for the doors. |
| workbench prices | 120 / 250 / 450 / 900 / 2,200 | The brief's table. |
| workbench output | 0.95 / 1.00 / 1.02 / 1.05 / 1.08 | The brief's table; budget is the Turn 1 bench at 1.00. |
| sheetRack prices | 200 / 400 / 900 / 1,800 / 4,500 | The brief's table. |
| sheetRack sheets | 30 / 50 / 75 / 110 / 160 | The brief's table; budget is the Turn 1 rack and standard is the old better one. |
| edgebander prices | 500 / 900 / 7,500 / 16,000 / 32,000 | The brief's table. |
| edgebander output | 0.95 / 1.00 / 1.10 / 1.20 / 1.35 | The brief's table. |
| Endurance by class | 0.25 / 1.0 / 1.2 / 1.5 / 2.0 | The brief: "as the saw's". |
| `SHOPPING_MINUTES` | 60 | Piotr: at least an hour per purchase. |
| `SHOPPING_NEXT_MINUTES` | 15 | The brief's quarter of an hour for each further thing. |
| `SOFTWARE_SHOPPING_MINUTES` | 30 | The brief: buying software 30. |
| `HIRING_MINUTES` | 60 | The brief: hiring 60, the interview. |
| `LAPTOP_BOOT_MINUTES` | 5 | The brief: opening the laptop 5, booting. |
| `CREW_MAX_GAP` (scenario) | 10 minutes | The brief's own figure for month (j). |
| Crew month job sizes | 6,000 rising by a fifth a man | Six of one size started together lock step through the stages; a real book of work never is. Deviation 4. |

---

## 9. Deleted

| Gone | Where it was | Why |
|---|---|---|
| `EquipmentSpec.capacity`, `MACHINE_CAPACITY_DEFAULT` | Turn 6 3.7 | A machine is free or taken by one man. No capacity numbers anywhere after tonight. |
| `capacityShare`, `machineHoursInDay`, the hours a day formula | Turn 6 | Hours are the minutes somebody stood at the machine. |
| `JOINERS_PER_TABLE_SAW`, `OVER_SAW_RATIO_FACTOR` | Turn 1 8.7 | The fourth joiner stands and waits now instead of working slower. |
| The Turn 2 station cycle (`PRODUCTION_CYCLE`) | Turn 2 3.9 | A figure is at the station of his stage. |
| `EquipmentVariant.labourFactor` and `labourAppliesTo`, the CNC's flat 20% | Turn 3 | A machine speeds up its own stage, at its own output factor. |
| `sheetRackBetter` | Turn 1 | The rack is one family with five classes. |
| `Job.benchSince` | Turn 4 | The bench is a claim like any machine's. |
| `machineLabourFactor`, `bagBlocked`, `brokenMachineFor` | Turns 3 to 6 | Replaced by the per stage questions. |
| The separate machine modal | Turn 3 3.5 | Its content is inline in the catalogue folder. |

---

## 10. Open questions for Piotr

1. **Selling a machine.** 3.10 assumes it exists. Should a machine be sellable, at what fraction of
   what it cost, and does the buyer come to the hall (an hour of the owner) or does he take it away
   himself?
2. **A picture of the catalogue on the floor.** The office art has the catalogue on the desk. Until
   there is a floor one the game draws the object itself, lowered to the floor by the door, with
   "Equipment" on its cover. One more layer or one more sprite key, whichever suits GPT.
3. **Should a new game start running or paused?** It opens paused today, so the first click in the
   office is refused with "Time is paused". That teaches the rule, but it is also a dead screen for
   anybody who does not look at the top bar.
4. **The crew month says a second saw pays for itself inside a month.** Six poor joiners behind one
   saw stand at it for 1,632 minutes and finish five jobs; behind two saws they stand for eight
   minutes and finish six, and end with about 3,200 more in the bank. Is that the size of the
   difference you want, or should the second saw take longer to pay for itself?
5. **A trip that runs overnight.** He can start an hour's shopping at ten to five and finish it in
   the morning. Real enough, or should an unfinished trip be abandoned at the end of the day?
6. **Staff overtime pay** is still the paper rule of Turn 6 section 2.1.

---

## 11. Known risks

1. **Day 1 is mostly shopping now.** The eleven item kit plus the licence is one trip of 225
   minutes, so the owner's first day is half gone before he touches a tool. Every scenario month
   was re-measured against that and they all still trade, but it is the largest single change to
   the balance this turn made.
2. **A job the world made impossible while he was out is simply not bought.** The order is checked
   against the hall as it will be, so this needs the hall to change under him between the order and
   his return (a breakdown taking a machine's requirement away, say). The cash stays in the bank and
   nothing is said. A line in the day's summary would be better and was not in scope.
3. **Six classes of edgebander and five of everything else is a lot of catalogue.** The folders make
   it navigable; the Owned tab is the only place that lists what the hall actually has.
4. **The Gantt projects from the machines a job will get**, which assumes it gets them. A job that
   will queue draws a bar that is too short until the queue happens and the gap appears.

---

## 12. Line balance

| Task | Files touched | Lines added | Lines removed |
|---|---|---|---|
| Whole turn | 80 | 6,226 | 1,285 |

New modules: `src/engine/stages.ts`, `src/engine/production.ts`, `src/engine/plan.ts`.

---

## 13. Tests

730 green, up from the 650 at the end of Turn 6. Two of those 650 were red on this branch's base
commit, because the sprite files arrived with the brief and the tests still said the folder was
empty; T7-01 is what made them say what was delivered. New files:

- `tests/engine/stages.test.ts`: the shares sum to 1, a 640 minute job has a cutting stage of
  123.08 on an industrial saw, a machine speeds up its own stage and no other, half the man is
  twice the minutes, and by hand is half again as long with no machine touched.
- `tests/engine/cnc.test.ts`: one CNC stage of the right minutes and an assembly of half, a timber
  job that ignores the CNC, the saw free while the CNC works, and the fallback switch.
- `tests/engine/zones.test.ts`: two saws whose zones would overlap cannot both stand there while
  the machines themselves would not touch, two benches stand edge to edge, a floor edgebander wants
  extraction and a free 5 by 3, and the whole catalogue fits the 174 cells with every zone clear.
- `tests/engine/meeting.test.ts`: a 25k job blocks the drawing until the meeting is held, the
  salesman takes it at 40 and not at 39, and the admin covers a call at thirty minutes of his day
  and none of the owner's.
- `tests/ui/workPlan.test.ts`: five bars for a job in finishing with the first three filled, a
  waiting job with its grey gap and the reason on it, and the deadline line on the right day.
- `tests/ui/pausedTime.test.ts`: the catalogue does not open and the toast shows, the Work Plan
  does, a purchase takes 60 owner minutes before the cash leaves, two on one visit take 75,
  software on its own takes 30, the laptop costs 5 to lift the lid, and an interview costs 60.
- `tests/ui/accountingYear.test.ts`: the year total equals the sum of its months.
- `tests/render/spriteClasses.test.ts`: every class resolves to its own file, the file each owes
  measures what 3.5 says, and the anchor lands on the bottom corner of the footprint.
- `tests/render/figures.test.ts`: the figure at his stage's machine, and the waiter beside it.

Rewritten: the machine hours tests (the capacity model is gone), the saw ratio test (it is the
queue at the saw now), the station tests, and every test that bought kit through an action.

Two new scenario months, (j) and (k), and a tenth month for the meeting. The nine existing months
now also say what the day 1 trip cost and that every finished job wrote down all four of its
stages.

---

## 14. How to run

```
npm ci
npm run dev
```

`npm run check` is lint, type check, production build and the tests, and its own exit code is the
gate. Everything Turn 7 added is reachable from the game: press 1x before anything else, then the
catalogue on the office floor, its tabs and folders and the Owned frame on what you have, the
"Shopping: 42 of 225 min" line over it while the trip runs, the Work Plan on the office wall with
a bar per stage, the desk and the laptop appearing in the room as they are bought, the fourth
column on the Accounting summary, and the Sprite check page with the zone drawn under every
footprint.

---

## 15. Parked, carried forward

1. Turn 8: compressed air (bar, l/min, compressor classes, assignment) and extraction capacity
   (m3/h, under extraction penalties), with Piotr's tables.
2. House 100 k and villa 500 k templates, a 180 degree view, movable rooms, rates and power for
   200 m2.
3. Selling a machine (open question 1).
4. A floor catalogue picture, and pictures for the families that still draw as boxes: the CNC, the
   spray booth, the thicknesser, the solid wood tools, the extraction, the compressor, the
   pelletiser, the tool cabinet, the van and the forklifts.
5. Staff overtime pay.
6. Everything parked before.
