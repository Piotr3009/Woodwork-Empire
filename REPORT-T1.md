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

## 3. Tests

| Module | File | Tests |
|---|---|---|
| scaffold | tests/engine/scaffold.test.ts | 1 |
| types and constants | tests/engine/types.test.ts | 6 |
| rng | tests/engine/rng.test.ts | 13 |
| clock | tests/engine/clock.test.ts | 11 |
| game, day boundary, determinism | tests/engine/game.test.ts | 14 |
| economy | tests/engine/economy.test.ts | 23 |
| owner | tests/engine/owner.test.ts | 12 |
| tasks | tests/engine/tasks.test.ts | 16 |
| catalogue and reputation | tests/engine/catalog.test.ts | 11 |
| board | tests/engine/board.test.ts | 15 |
| jobs | tests/engine/jobs.test.ts | 23 |
| staff | tests/engine/staff.test.ts | 15 |
| machines, bags, dust | tests/engine/machines.test.ts | 23 |
| materials | tests/engine/materials.test.ts | 15 |
| iso projection | tests/render/iso.test.ts | 10 |
| hall and office SVG | tests/render/views.test.ts | 14 |
| UI in jsdom | tests/ui/app.test.ts | 13 |
| 30 day scenarios | tests/scenarios/thirtyDays.test.ts | 10 |

Total 245 tests in 18 files. `npm test` runs in about 3.3 seconds, never with `--silent`. The three
scenario playthroughs run in about 1.0 second together, well inside the 10 second limit of T1-13.

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

"How many code paths do the same job?" One, everywhere I looked. What I found and removed on the way:

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
| T1-14 | see the commit | see the commit |

About 6,200 lines of source under `src/` and about 3,500 lines of tests.

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
