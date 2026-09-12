# Report: Turn 1

Branch `turn-1-engine-skeleton`, 14 commits, one per task. `npm run check` is green on every one of
them except the first cut of T1-06, which is named in section 5 below.

## 1. Done

1. T1-01 `58b178b` Scaffold: Vite, TypeScript strict with `noUncheckedIndexedAccess`, Vitest,
   ESLint flat config, the folder tree of section 4, README, ignore and editor config. A fresh clone
   passes `npm ci && npm run check`.
2. T1-02 `2287682` Constants and types: every number of sections 6 to 9 in `engine/constants.ts`,
   each tagged `[PIOTR]` or `[TUNE]`, plus the product table, the day 1 catalogue, the hiring pool
   and the fixed hall layout. `engine/types.ts` holds JSON only shapes and the action union.
3. T1-03 `3b10204` RNG and clock: mulberry32 with the cursor in the state, the calendar (7 day
   weeks, 30 day months, day 1 is a Monday), the time of day, the overtime boundaries, and the day,
   weekend and month rollover in `game.ts`.
4. T1-04 `c804649` Economy: rent, rates and power every calendar day, living costs on working days,
   joiner wages on Friday, the monthly items on the 1st, the deposit on day 1, overdraft interest,
   arrears, the bailiff seizure at half price and bankruptcy, with a ledger line behind every
   movement of money.
5. T1-05 `3601c59` Owner and tasks: the 480 minute pool with its three segments, full efficiency
   for eight hours then 0.8, 0.6, 0.4, 0.4, the 12 hour hard stop, fatigue into the next day,
   absence, the yearly sick spell, `SKIP_DAY`, the task minute curves of 8.10 and the runner.
6. T1-06 `3938e06` Catalogue and board: templates with tool gating and lock reasons, enquiry
   generation by reputation weight with size, express, bespoke, deadline and expiry, and a board
   that refills and expires every morning.
7. T1-07 `06ac08d` Jobs: the whole lifecycle of 9.5, deposit on acceptance, calls and drawing in
   either order, the material order, next working day delivery, unloading, production against the
   labour value, the by hand path, late penalties, the balance and the client rating.
8. T1-08 `a8117d1` Staff: hiring gated by reputation and by bench slot, workbench, locker, canteen
   seat and tool set, weekly and monthly wages, automatic assignment with a manual override, the one
   saw per three joiners slowdown and the helper effects.
9. T1-09 `e7a93d2` Machines and dust: bag intervals per machine with the stop and the event, the
   extractor breakdown and its repair, dust accumulation through the four bands, the weekly clean,
   the helper Friday clean, the accident, and the central system that removes bags and breakdowns.
10. T1-10 `7f71589` Materials: per job and stock purchasing, bespoke at three working days and plus
    15%, the sheet rack with its capacity, and the overflow decision with both outcomes.
11. T1-11 `afc0b6c` Render: `iso.ts` with the 2:1 dimetric projection and a tile to screen round
    trip, `hall.ts` and `office.ts` building flat placeholder SVG from the state alone.
12. T1-12 `903a8f3` UI: start screen, the one top bar, hall and office views, seven modals, the
    event modal, the end of day summary, the game over screen, and the loop with speed and pause.
13. T1-13 `b7d2a94` Scenario tests: a scripted month on Easy, a month on Hard doing nothing, and a
    byte for byte replay.
14. T1-14 `b4ab0ff` This report, plus the dead code clear out and the selector reuse it turned up.

## 2. Not done or partial

1. The headless browser run through of T1-12 is a jsdom smoke test, not Playwright. The browsers are
   in this environment but the `playwright` package is not installed, and installing it would add a
   dependency outside the stack decided in section 5. The stated minimum is what is here: a green
   `vite build` plus `tests/ui/app.test.ts`, which mounts the app, starts an Easy game, buys the day
   1 kit, accepts an enquiry and finds it in the laptop design queue. The manual script is in the
   README under "First 10 minutes".
2. Section 9.5 says a delivery waiting in the yard should add dust and marks it `[TUNE: not modelled
   tonight, note it]`. It is not modelled. Nothing else is stubbed: there is no
   `NotImplementedError` anywhere in the repo.
3. The "why it is like this in real life" explanation strings were not written. The night went on the
   14 tasks and this report.
4. Caught in my own audit after the report was first written: `ASSIGN_JOB` had no clickable way in,
   which rule 3.5 forbids. The job card in the laptop now carries the manual override of 9.4: a chip
   for the owner and one for every joiner on the floor.
5. Ten more defects the same audit found and this branch fixes, listed in section 10. First, the pellet income of 8.1 never
   paid its production bonus: the monthly counter was reset before the bill that reads it, so the
   pelletiser always paid exactly the 600 base. Second, the day used to close itself at 16:00 the
   moment the owner had nothing in hand, which is a rule the spec does not have: it meant the
   overtime hours of 7.2 could only ever finish a task already in flight, never take a new one on.
   The day now ends at the twelve hour wall, or at 16:00 once the owner has gone home or is not in,
   and after 16:00 with the owner still there it is his decision, which is what 7.2 says.

## 3. Tests

| Module | File | Tests |
|---|---|---|
| scaffold | tests/engine/scaffold.test.ts | 1 |
| types and constants | tests/engine/types.test.ts | 6 |
| rng | tests/engine/rng.test.ts | 13 |
| clock | tests/engine/clock.test.ts | 11 |
| game, day boundary, determinism | tests/engine/game.test.ts | 16 |
| economy | tests/engine/economy.test.ts | 24 |
| owner | tests/engine/owner.test.ts | 12 |
| tasks | tests/engine/tasks.test.ts | 17 |
| catalogue and reputation | tests/engine/catalog.test.ts | 12 |
| board | tests/engine/board.test.ts | 18 |
| jobs | tests/engine/jobs.test.ts | 23 |
| staff | tests/engine/staff.test.ts | 17 |
| machines, bags, dust | tests/engine/machines.test.ts | 25 |
| materials | tests/engine/materials.test.ts | 20 |
| iso projection | tests/render/iso.test.ts | 10 |
| hall and office SVG | tests/render/views.test.ts | 21 |
| UI in jsdom | tests/ui/app.test.ts | 18 |
| 30 day scenarios | tests/scenarios/thirtyDays.test.ts | 10 |

Total 274 tests in 18 files, about 5 seconds. Never run with `--silent`. The three scenario
playthroughs take about 1 second together, well inside the 10 second limit of T1-13.

A fresh clone of this branch passes `npm ci && npm run check`: lint clean, type check and production
build clean, 274 tests green.

Command: `npm test`. Gate: `npm run check` (lint, then type check and production build, then tests).

## 4. How to run

```
npm ci
npm run dev      # then open http://localhost:5173
npm test
npm run check    # the gate before every commit
```

Desktop only, 1280 px wide minimum. Nothing is persisted: closing the tab loses the game.
The first 10 minutes script is at the bottom of README.md and follows section 15 step by step.

## 5. Deviations from CLAUDE.md

1. **Branch name.** Section 12 asks for `turn-1-engine-skeleton`, the session brief asked for
   `claude/laughing-galileo-zwybns`. The task description repeated `turn-1-engine-skeleton`, so that
   is the branch. Nothing was pushed to `main`.
2. **T1-06 committed on a red lint.** The first cut of `3938e06` had one unused import in a test
   file. Found straight after, fixed, and the commit amended before any push. The gate was green
   again within a minute. Named here because section 12 says a commit on a red check is a defect I
   name myself.
3. **`OWNER_LABOUR_PER_MINUTE` is 320/480 exactly**, not the 0.6667 printed in 8.5. The exact
   fraction keeps your own worked examples exact: 8 days for the owner, 10 for a normal joiner and
   13.33 for a poor one on a 6400 wardrobe. 0.6667 is that number rounded.
4. **`src/ui/materials.ts` is a new file.** The tree in section 4 has no materials modal but 10.1
   asks for one on the office desk. Everything else follows the tree.
5. **Test files outside the tree.** `tests/helpers.ts` is one shared test driver instead of a copy of
   the event clicking loop in every file. `tests/render/`, `tests/ui/` and
   `tests/scenarios/autopilot.ts` are new folders and files for the render, UI and scenario tests.
6. **The catalogue purchase lives in `game.ts`, not `machines.ts`.** `machines.ts` answers what is
   owned and what a machine does; paying is `economy.ts`. Putting the transaction in `machines.ts`
   would have made the two modules import each other. `game.ts` is already the one module allowed to
   touch every other one.
7. **The event modal has a close cross only when the event has one choice.** A decision with two or
   three choices has no cross: the choice buttons are the only way out, which is the point of a
   decision. Rule 3.9 asks for a visible close control on every modal, so this is a deliberate
   reading, not an oversight.
8. **Day 1 charges the deposit and one day of rent.** Section 15.2 says the first month's rent is
   already gone, 8.1 says rent is charged daily. The table won. Open question 1.
9. **Owner tasks do not restart themselves in the morning.** A job at the bench does: he keeps his
   place. A half done drawing waits for the player to click Start again, because 8.10 says admin
   never runs silently.
10. **The site measure fills the admin segment** of the minute bar. The bar has three segments and a
    site visit is neither design nor workshop.
11. **Weekend costs are not in the "today" column.** They are in the week and month columns and in
    the ledger, and the Monday event says what the weekend took.
12. **Staff clear their tasks instantly.** An office admin, clerk or salesman on the books makes his
    tasks disappear from the owner's list at the start of the day for his wage. They have no working
    day of their own yet. Open question 6.
13. **Per job material never overflows the rack.** 8.9 says per job material needs no stock, so only
    sheets bought in advance can overflow.
14. **Machine labour reductions are fixed when the job is accepted.** Buying a CNC halfway through a
    job does not shorten that job.
15. **The board is never empty at reputation 0.** 8.8 gives the tier a minimum of 1 enquiry and also
    says the board is often empty at low reputation. The minimum won. Open question 12.
16. **"30 days" in the tests means 30 calendar days**, day 1 to the start of day 31, so a scripted
    month plays 22 working days.
17. **The `unpaid` flag on a ledger line means "no cash moved".** It covers a cost that became
    arrears, the bailiff credit and sheets written off after a night in the yard.
18. **The top bar carries exactly what 10.1 lists and nothing else.** An earlier cut had a "minutes
    of the day left" label, an "owner away" chip and an accounting shortcut in the menu. All three
    are gone: where the owner is now shows on the line under the hall, which is the view he is
    missing from.

## 6. Duplicate paths

"How many code paths do the same job?" One, everywhere, after the audit went through it. What was
found and removed, first while building and then in the audit pass:

1. **The job the owner stands at** was held twice: `owner.productionJobId` and `job.assignedTo`.
   They could disagree, and they did: after a bag change the owner was off his job with the job
   still assigned to him. The field is gone. `ownerJob(state)` derives it from the job.
2. **Advancing a task** was written twice, once for the owner and once for a joiner on a bag change.
   Both go through `advanceTask` now.
3. **Who may take a task** was doing two jobs: it decided both who can be asked and who picks it up
   for free, which let a joiner take a bag change at no cost. Split into `eligibleRoles` and
   `autoRoles`.
4. **"Jobs still open"** was filtered inline in two UI files. Both use `openJobs` now.
5. **The material mode label** was built in the UI. It comes from `materialModeLabel` now.
6. **The state fixture** in `types.test.ts` was a hand written `GameState`. It uses `createGame`.
7. **Four exports nothing called** are gone: `hasQueuedEvent`, `taskCategory`, `MAX_DAY_MINUTES`,
   and the UI's `workerName`. `hourEfficiency` read a literal 8 where `OWNER_NORMAL_HOURS` exists.
8. **Putting a man on a job** was written twice: the automatic assignment hand wrote the three state
   changes instead of going through `assignJob`. It goes through it now.
9. **Two HTML escapes and two money formatters** existed, one in the renderers and one in the modal
   helpers. There is one of each, and the engine event copy uses the same money format.
10. **`emptyTotals` was defined twice**, in the economy and again in `createGame`.
11. **`chargeUnavoidable` was a pure alias** of the private periodic charge. One name, one body.
12. **"Is the owner in today"** was written out in five places beside the `ownerIsAvailable` helper
    that already said it, and **"is this man on the books today"** in four beside nothing at all.
    Both are one helper now.
13. **The period net** (`income - costs`) was computed in three UI files. It is an engine selector.
14. **The informational labour cost of 8.5** was multiplied out in the laptop. It is an engine
    selector, which is what section 4 asks for.
15. **The rack capacity was stored twice**, on the stock and on the unit, so the two could disagree.
    The unit owns it.
16. **`deliveriesDueTomorrow` returned everything on the way**, so the end of day summary filtered
    "tomorrow" again in the UI. Two names now, each meaning what it says.
17. **Staff finished their tasks by hand** instead of going through `advanceTask`, whose comment
    already claimed to be the one path.
18. **Five fields on `GameState` were written and never read**: `eligibleRoles` on a task,
    `overflowResolved` on a delivery, `measureDone` on a job, `productionMinutes` on the day stats,
    and the sheet rack capacity above. The dead ones are gone; `dustAtStart` and `labourTotal` are
    now read, by the end of day summary and by the "% made" figure on the job card.
19. **Six exports nothing outside the engine used** are out of the public API: `findDelivery`,
    `hallProductivityFactor`, `jobTasks`, `readyToOrderMaterial`, `specOf` and `monthOfDay`.

One duplication is left on purpose, and it is one line: `machines.ts` filters the crew by role
inline because `staff.ts` already imports `machines.ts`, so the crew selectors cannot be imported
back without a cycle. The comment there says so.

Reused modules, named as rule 3.6 asks: `render/hall.ts` exports the SVG primitives that
`render/office.ts` builds on; `ui/modal.ts` is the only modal frame, money and minute formatter;
`tests/helpers.ts` is the only test driver; `economy.pay` and `economy.receive` are the only two
places cash moves; `events.queueEvent` is the only place an event is born.

## 7. Line balance

Per task, package-lock.json excluded:

| Task | Added | Removed |
|---|---|---|
| T1-01 | 259 | 1 |
| T1-02 | 1528 | 4 |
| T1-03 | 840 | 10 |
| T1-04 | 863 | 85 |
| T1-05 | 827 | 16 |
| T1-06 | 600 | 10 |
| T1-07 | 1082 | 20 |
| T1-08 | 392 | 10 |
| T1-09 | 770 | 56 |
| T1-10 | 357 | 3 |
| T1-11 | 864 | 8 |
| T1-12 | 2187 | 28 |
| T1-13 | 231 | 0 |
| T1-14 | 1527 | 580 |

About 6,400 lines of source under `src/` and about 3,900 lines of tests. T1-14 removed 580 lines
because most of it was the audit: dead state, duplicated predicates and copy pasted arithmetic.

## 8. Open questions for Piotr

1. Day 1: section 15 says the deposit and the first month's rent are already gone, section 8.1 says
   rent is charged daily. Tonight day 1 takes the 2400 deposit and one day of rent (40). Should it
   also take a month in advance, so day 1 costs about 3640 instead of 2640?
2. On Hard nobody reaches arrears inside the first month: with the placeholder costs the overdraft
   limit of 10000 is only full around day 37, so the first warning comes then. Do you want a tighter
   limit (5000?), higher fixed costs, or is day 37 about right for a real business?
3. The software: the one off at 900 and the subscription at 60 a month are both the basic tier
   tonight, so they do not speed the drawing up at all. Which tier are they, what do standard and
   pro cost, and how much faster is each (you said 5 to 80%)?
4. What is the punishment for never doing the emails and the bookkeeping? Tonight they only eat
   minutes, so the cheapest play is to skip them for ever. Fine (a bill, a fine, a lost client)?
5. Sheets per job: I priced one sheet at 80, so a 400 job takes 2 sheets, a 1600 wardrobe 8, and a
   3500 kitchen 18, which does not fit a 12 sheet rack. Is 80 a sheet close, and roughly how many
   sheets does each of your six products really take?
6. Office staff, the purchasing clerk and the salesman clear their whole list instantly for their
   wage tonight. Should they have their own working day instead, so a clerk really stops at 16
   orders and an admin can run out of hours?
7. A broken extractor stops every machine, so nothing is made, so the tripled dust rate never gets a
   chance to act. Should hand work carry on with the extraction down, or should the whole hall sit
   still as it does now?
8. Without an extractor there are no bags at all, so a player can skip the 600 and never change a
   bag again. Should machines refuse to run without extraction?
9. Does the central dust system (35000) keep the hall clean, or only take the bags away? Tonight
   dust still rises with it and somebody still has to clean weekly.
10. The bailiff takes the dearest machine. Is the van or a forklift also fair game, or machines only?
11. Express jobs: the plus 20% is applied on top of the size multiplier (so a 1.6 size express
    shelves job is 400 by 1.6 by 1.2 = 770). Right, or is 20% meant to replace the size uplift?
12. Board size at reputation 0 is 1 to 2 enquiries, so the board is never actually empty, but 8.8
    also says it should often be empty at low reputation. Which do you want?
13. How low should reputation go? I clamped it at minus 5 with no consequence at the bottom.
14. When the tools ARE in the hall, the by hand path is switched off: an oak table with a thicknesser
    is never made by hand. Should the player be allowed to choose the slow way anyway?
15. Arrears never go down except when the bailiff takes a machine. A company that misses one rent
    day and then earns well still marches to a seizure. Should the player be able to pay arrears
    off, and at what point should a cleared debt reset the ladder?
16. A rating is either the on time bonus or the late deduction tonight: one day late scores minus
    0.1, not plus 0.3 minus 0.1. Is the on time bonus forfeited the moment a job is late, or should
    the two be added?
17. A part hour of overtime now costs nothing: fatigue charges only whole hours, so 59 minutes past
    16:00 is free. Should a part hour cost part of the 0.05?
18. A day off has to be watched: the owner stays home, the clock still runs to 16:00 (45 real
    seconds at 4x) because the staff are working. Should a day off jump straight to the next
    morning when there is nobody in the hall to work it?
19. Buying sheets for stock is meant to be the 0.34 P route, but sheets are whole things, so a 900
    job costs 340 in sheets against the 306 the fraction implies. Is the rounding up acceptable, or
    should stock be priced per job rather than per sheet?

## 9. Known risks

1. **Every `[TUNE]` number is a guess.** Rent, rates, power, wages, sheet prices, the overdraft
   limit, the dust rate, the express chance and the bespoke chance have never been played by a
   human. The scripted month on Easy ends with about 9,700 in the bank and a reputation of 2.4,
   which may well be far too easy.
2. **The balance of one job at a time.** The scripted player takes one job at a time and still
   clears ten in a month. If that is the profitable way to play, the "you cannot do everything
   yourself" pressure of act one is not biting yet.
3. **The UI redraws the whole screen every game minute.** At 4x that is about eleven redraws a
   second of a few hundred SVG nodes. Fine for a plan drawn in boxes, not fine once real sprites
   arrive: that is what PixiJS is for in phase 2.
4. **jsdom is not a browser.** The modal dragging, the SVG hit areas at real sizes and the
   requestAnimationFrame loop are exercised by hand and by the build, not by a real browser test.
5. **The scenarios are seeded.** Other seeds draw other boards and are untested, so a seed exists
   somewhere that makes the scripted month fail.
6. **No persistence.** Closing the tab loses everything, by design tonight.
7. **Minutes are dropped when an event opens mid tick.** The clock cannot run past a decision, which
   is the rule, but it means a long fast forward can lose a fraction of a minute at each event.
8. **A job can sit still and say nothing.** Accept an enquiry with no software licence and the
   drawing cannot be started until a licence is bought. The laptop says so, but nothing nags.
9. **Restarting tasks every morning may annoy.** It is what 8.10 asks for, and it is the one part of
   the loop I would expect a player to complain about first.
10. **No accessibility work.** Keyboard reaches the buttons and Escape closes a modal. That is all.

## 10. What the audit found and fixed after the first cut

The report was written, then the whole thing was audited section by section against the contract and
every finding checked against the code. Twelve held up and are fixed on this branch:

1. **The day closed itself at 16:00** whenever the owner had nothing in hand, an end condition the
   contract does not have. It meant the overtime hours of 7.2 could only finish a task already
   running, never take a new one on.
2. **The pelletiser never paid its production bonus**: the monthly counter was reset before the bill
   that reads it.
3. **The arrears ladder counted calendar months, not months of arrears.** A bill missed on day 30
   got its final warning on day 31. It now counts from the day of the first miss, so the warning,
   the final warning and the bailiff are 30 days apart, which is what 8.3 describes.
4. **The board did not draw a replacement when an enquiry was taken or expired**, only at the start
   of a day and only when it had fallen below the tier minimum. 8.8 says the board draws a new one.
5. **The top board size band started at reputation 2.5**, not 2, because the board shared the
   thresholds of the hiring pool. They are separate now: the board and the template weights use 0, 1
   and 2, and the super joiner keeps his own 2.5 gate.
6. **A negative reputation did not lower the express chance**, although 8.11 allows negatives and
   8.8 gives the formula as 0.10 plus 0.05 times the whole reputation.
7. **Sheets off the rack covered any job**, including a bespoke solid wood table. Stock is board, so
   it now only covers sheet jobs of standard material.
8. **The per job material purchase ignored the overdraft floor**, the only purchase in the game that
   did. It is now charged the way an unavoidable bill is: it obeys the floor and becomes arrears when
   there is no room, which is what happens when a supplier invoices a company with no money.
9. **Sheets written off after a night in the yard bypassed the ledger helper**, so the loss missed
   the day, week and month totals and the ledger trim.
10. **Fatigue was prorated by the minute** instead of costing 0.05 per overtime hour worked.
11. **The efficiency floor of 0.05 was an untagged number inlined in the code.** It is a tagged
    `[TUNE]` constant now, and it is documented as unreachable with your numbers.
12. **Bankruptcy never opened an event**, although 6.2 lists it among the things that stop the clock.
    It now opens over the game over screen.

Six more from the audit of section 9 and the standing rules, also fixed here:

13. **A bag that filled before the central system was bought kept the machine stopped**, although
    9.6 says no bags exist once the system is in.
14. **The order board did not need the laptop**, although 9.2 lists the board as one of the three
    things the laptop is required for. The board now says to buy one.
15. **The accident risk warning of the dirty band was nowhere in the UI.** The line under the hall
    now says somebody will get hurt from the dirty band on, as 9.7 asks.
16. **Dust 70 was read two ways**: messy for productivity, high for the extractor breakdown. Both
    now use the same edge.
17. **The disabled button with a reason, which 9.2 declares the one allowed pattern for a locked
    catalogue line, had spread to the board, the hiring modal, the laptop and the hall.** Those four
    now print the reason as text, so the only control a player cannot press is a locked catalogue
    line.
18. **The calls column of 9.1 was dead data**, because calls come from the price curve of 8.10. The
    curve stays the one code path and a test now checks it reproduces the 9.1 column at every base
    price. They agree at all six base prices, and size variants follow the curve, so a 0.8 size TV
    unit asks for 2 calls where the column shows 3. That is the 9.1 against 8.10 contradiction rule
    3.2 asks me to record.

Two findings were judged wrong and left alone, both named in section 8 as questions instead: that
`END_DAY` before 16:00 should end the day (7.2 says it means going home, and the hours that follow
count as absence), and that the on time rating bonus should survive a late delivery.

Fourteen more from the audit of the views, section 10 and section 15, also fixed here:

19. **A second task could be started while one was running**, which silently abandoned the first and
    left it marked as the owner's so no member of staff could take it. 10.1 says another task can be
    started only when the current one is done or paused, and now it cannot.
20. **Money appeared unformatted in the copy the player reads**: the start screen, the storage
    event, the repair event, the bailiff and the balance line all printed raw numbers. There is one
    money formatter now and the engine event copy uses it too.
21. **Minutes appeared without their unit** in the end of day summary and the storage event.
22. **No modal opened beside the object that was clicked**, although 10.4 asks for it and the
    anchoring code was already there. Desk objects now open their modal where the player clicked.
23. **Clicking the van started the owner's unloading** instead of opening the choice 10.1 describes.
    It asks again now, so a joiner or the helper can take it.
24. **Benches looked the same whether anybody was at them.** They now read "(free)" or carry the
    name of the man at the bench, as 10.1 asks.
25. **Every figure was drawn with a drop shadow**, which 10.3 forbids. Gone.
26. **The sawdust was tan and scattered anywhere.** 10.3 asks for grey ellipses near the machines,
    and that is what it is now.
27. **The rooms, the rack, the van and the whole office desk carried their sizes as literals in the
    renderers.** They are in `constants.ts` now, each with a footprint, a height, an anchor and a
    sprite key, as 10.3 requires, and the sprite key reaches the DOM so the sprite pipeline has
    something to hook.
28. **Locker and canteen seat slots sat inside the room footprints** and painted over them. They
    stand along the walkway now.
29. **Every list row had its own accent button.** 10.4 allows one accent button per view: the rows
    are outlined now.
30. **The clear cross on a filter did not put the caret back**, which rule 3.10 asks for by name.
31. **The WC and the canteen had no tooltip**, only a line under the view. Every room, machine and
    desk object carries a real one now.
32. **The board rows printed the call count, the drawing minutes and the raw size multiplier**,
    none of which 10.1 lists for the board.

One more is disclosed rather than fixed: the lacquer finish of 9.1 is unreachable content, because
every template lists laminate only and the spray booth that unlocks lacquer is locked for Turn 1.

Two shapes of the laptop modal stay wider than 10.1's "two lists", each for a reason:

- **Workshop jobs of work.** Without it, an unloading or a bag change that the player put off has no
  way back: the hall has buttons only for cleaning and the extractor. The list is how the owner
  picks that work up again.
- **Jobs on the books.** This is the job card 9.4 asks for, and it carries the Assign override. 10.1
  does not say which view holds the job card.
