# Report: Turn 13, phase B, group B2 (people and shifts)

Branch `t13-b2`, from phase A's `9dcfc9a`. Sections 3.8, 3.9, 3.10 and 3.18 of CLAUDE.md T13:
the estimator and the material list, the production manager with the second shift and the
holiday, the floor limit on the crew, the owner's draw and the house. Files owned: `src/engine/
staff.ts`, `owner.ts`, `plan.ts`, `tasks.ts`, `production.ts`, `src/ui/team.ts`, `workPlan.ts`,
`ownerOut.ts`, `house.ts`, and the tests named after them.

The four tasks share three files (`staff.ts` carries the one predicate for who is in the hall,
`owner.ts` the absence and the draw, `team.ts` the one page), so the engine and the page of all
four land with T13-B2a; each later commit carries that task's tests in files of its own, named
after the module and the topic the way `staffOvertime.test.ts` is.

---

## 1. Done

| Task | Commit | What went in | Proved by |
|---|---|---|---|
| T13-B2a Estimator and the material list | see the list below | The take off verified line by line against 3.8: created at accept, gated behind the drawing for the owner and the estimator alike, the owner's until an estimator is in, five a day, ten with Joinery Core, five more per extension and never more than two (`estimatorCapacity` now caps), at the estimator's tier speed (`ESTIMATOR_RATES`) and the owner's own. `joineryCoreOffer(state)` in `tasks.ts` hands the Technical tab the capacities, the two yearly prices and the two refusals; the tab sells Joinery Core and its extensions beside the estimator (`data-do="buyJoineryCore"`, `data-do="buyJoineryCoreExtension"`). `TAKE_OFF_BUTTON_LABEL` "Create material list" in `tasks.ts` for the laptop's button (note 3.5). The estimator and the manager are hired without an office admin (`BEHIND_THE_ADMIN` in `staff.ts`, section 6). The consumables and materials chore verified: thirty minutes whatever the project count, the admin's when there is one. | `tests/engine/tasks.test.ts` "the material take off" (five cases); `tests/ui/team.test.ts` "the Technical tab" (two) |
| T13-B2b Production manager, second shift, holiday | see the list below | `isWorkingToday(state, worker, shift = 'day')` in `staff.ts` is the one predicate: on the books, fit, and on this shift; `shiftOf` puts everybody on the day unless the second shift can run (`secondShiftRuns`: the switch on and a manager on duty); `hands(state, { shift })` in `production.ts` lists a shift's men with the absence factor in their rate; `workMinute(state, hands, { night })` is the minute of production, the day's arithmetic factored out of `game.ts` onto exported functions; `runNightShift(state)` runs `SECOND_SHIFT_MINUTES` of it on the night crew after the day, writes every minute on the job as a night one (`job.nightMinutes`, `dayStats.nightMinutes`), books the premium as one `wagesNight` ledger line through `charge()`, releases every machine and rolls the night's accident at the doubled chance through `hurtWorker`, the one door a hurt man goes through. `nightShareOf` and `nightQualityPenalty` in `owner.ts` for the rating (note 3.6). The manager takes the assigning (verified: the task is his, his day meter shows it, the owner's never gains it). The cover verified: 1 with the owner in, 0.92 with him out and a manager, 0.7 without. `holidayCheck` and `startHoliday` in `owner.ts`, the countdown in `runOwnerDayStart` (today the first day, back the morning after the last), the Holiday buttons on the owner's card (`data-do="takeHoliday" data-days`), greyed with the reason without a manager, the line under the top bar while he is away (`ownerOut.ts`). The team page: the Second shift switch (`data-do="setSecondShift"`) on Workshop and Management, Day and Night chips on every joiner while it runs (`data-do="assignShift"`), the manager's own day meter, the night men named on the work plan rows (`plan.ts`). | `tests/engine/staffSecondShift.test.ts` (ten cases), `tests/engine/ownerHoliday.test.ts` (seven), `tests/engine/production.test.ts` (five, the parity of one minute by the clock and one by `workMinute`), `tests/ui/teamShift.test.ts` (four) |
| T13-B2c Crew limit | see the list below | Verified against 3.10: `crewLimit = floor(freeFloorM2 / M2_PER_PERSON)` (B4's `layout.ts`, read only), `crewCount` the owner plus the floor roles, the hire refused with `crewLine`; the 200 m2 hall with the standard set and four joiners reads "Crew 5 / 5, floor limited" and the fifth joiner and a helper are refused with it, the desks are not. The line printed on the Workshop and Management tabs (`.crew-limit`). The production manager counts against the floor (phase A's choice, kept: he runs the floor; section 6). | `tests/engine/staffCrewLimit.test.ts` (three cases), `tests/ui/teamCrew.test.ts` (two) |
| T13-B2d The owner's draw and the house | see the list below | `houseTierFor` verified: the highest threshold whose thirty day sum (`houseSumFor`: the draw over the 21 working days of a thirty day window) the ledger's paid `ownerDraw` lines inside the window come to; never the setting; unpaid lines and lines outside the window count for nothing; a fresh game reads tier 1 (section 6). The owner's card on the Workshop tab: the eight thresholds as eight chips (`data-do="setOwnerDraw" data-id`), the one held marked, the house tier with its name, the thirty day sum and what the next house wants; no slider, no suggestion. `renderHouseCard(state)` in `house.ts`: the full width picture from `placeholder('house.<tier>')` at 900 by 300, the tier's name, and the line "Resting at home now. See you at the workshop in the morning." word for word (`HOUSE_LINE`). | `tests/engine/ownerHouse.test.ts` (four cases, one of them a 32 day run), `tests/ui/teamDraw.test.ts` (three), `tests/ui/house.test.ts` (three) |

Commits, in order (the hashes are in the branch's log, `git log --oneline 9dcfc9a..t13-b2`):

1. `T13-B2a Estimator and the material list`: the engine and the page of all four tasks, and the B2a tests.
2. `T13-B2b Production manager, second shift, holiday`: the B2b tests.
3. `T13-B2c Crew limit`: the B2c tests.
4. `T13-B2d The owner's draw and the house`: the B2d tests and this report's final form.

---

## 2. Numbers chosen

| Number | Value | Where | Note |
|---|---|---|---|
| `HOLIDAY_OPTIONS_DAYS` | 1, 3, 5, `HOLIDAY_MAX_DAYS` (10) | `owner.ts`, marked `T13-C1: move to constants.ts` | the lengths the Holiday buttons offer [TUNE]; the last is the cap the action applies |
| `TAKE_OFF_BUTTON_LABEL` | "Create material list" | `tasks.ts`, marked `T13-C1: move to constants.ts` | PIOTR's wording for the button; a string, not a figure |
| the night premium | `(NIGHT_RATE - 1)` of the hourly wage for `SECOND_SHIFT_MINUTES / 60` hours, a night | `nightPremiumFor` in `staff.ts` | a reading of "1.25 of salary for those hours", not a new figure: the weekly wage already pays a man's forty hours whichever shift they are on, so the night's extra is the quarter on top, 24 a night for a poor joiner; see section 7 for the alternative |
| the night accident chance | `ACCIDENT_CHANCE_PER_DAY * NIGHT_ERROR_FACTOR`, rolled once a night over the night crew in a dangerous hall | `rollNightAccident` in `staff.ts` | a reading of "the error chance is doubled": the game's one error roll that hurts people is the accident, and the night is a second roll of it at twice the chance |
| the night breakdown chance | `overdueBreakdownChance(machine) * NIGHT_ERROR_FACTOR` per machine the night ran | `rollNightBreakdowns` in `staff.ts` | written and tested for phase C to wire (note 3.1), not called tonight, because the repair task and the event it needs are private to `game.ts` |
| working days in the house window | 21 | `workingDaysInHouseWindow` in `owner.ts` | phase A's `round(30 * 5 / 7)`, kept: the draw is charged on working days, and a thirty day window holds 21 or 22 of them, so a steady draw reaches its tier once thirty calendar days of it have gone |

Nothing else was invented. Every other figure is phase A's constant, read where the brief says.

---

## 3. Notes for phase C

Every one of these is a change to a file B2 does not own. Apply verbatim.

### 3.1 `src/engine/game.ts`, `finishDay`: the night's events

`runNightShift` returns a `NightReport`; the events it cannot raise (the raisers are private to
`game.ts`) are raised here. Replace

```ts
  // The second shift works after the day, with the owner gone (CLAUDE.md T13 3.9).
  runNightShift(state);
```

with

```ts
  // The second shift works after the day, with the owner gone (CLAUDE.md T13 3.9). What it
  // finished stands at the gate, what it filled is the bag store, and what it wore out can
  // give up at twice the day's chance.
  const night = runNightShift(state);
  for (const job of night.finished) raiseJobAtGate(state, job);
  if (night.bagsFull) raiseBagsFull(state);
  for (const machine of rollNightBreakdowns(state, night.usedMachineIds)) {
    raiseMachineBroken(state, machine);
  }
```

and add `rollNightBreakdowns` to the `from './staff'` import. Without this, a job finished at
night still stands at `awaitingTransport` and the job card offers the transport; the bags full
block still applies through `hallBlock`; the night runs no breakdown roll.

### 3.2 `src/engine/game.ts`, `runAccidentRoll`: one door for a hurt man

Replace the body after `if (!worker) return;` with `hurtWorker(state, worker);` and delete the
five lines it replaces (`worker.absentDaysRemaining = ...`, the `releaseJob`, the `queueEvent`
and the `onAccident` call). Add `hurtWorker` to the `from './staff'` import. `hurtWorker` does
exactly those five things (`tests/engine/staffSecondShift.test.ts` "puts a hurt man through the
one door"), so the day and the night hurt a man the same way.

### 3.3 `src/engine/game.ts`, `TAKE_HOLIDAY`: the day ends when the hall is empty

As `SKIP_DAY` does. Replace

```ts
    case 'TAKE_HOLIDAY':
      startHoliday(next, Math.min(HOLIDAY_MAX_DAYS, action.days));
      break;
```

with

```ts
    case 'TAKE_HOLIDAY':
      // A holiday with nobody in the hall is not worth watching: straight to the summary, as a
      // day off is (CLAUDE.md T13 3.9).
      if (startHoliday(next, Math.min(HOLIDAY_MAX_DAYS, action.days)).ok && hallIsEmpty(next)) {
        finishDay(next);
      }
      break;
```

### 3.4 `src/engine/game.ts`, `runProductionMinute`: one arithmetic (optional, recommended)

`workMinute` in `production.ts` is the day's production minute factored out onto the exported
functions, and `tests/engine/production.test.ts` proves one minute by it equals one minute by
the clock, job for job and machine for machine. To make the day call it, replace the whole of
`runProductionMinute` (from `const moving = ...` to the `accumulateMachineMinute` line) with

```ts
function runProductionMinute(state: GameState, ownerOnTask: boolean): void {
  // Every bench waits while the machines are being shifted about (CLAUDE.md T4 3.5).
  const moving = movingMachines(state) !== null;
  const working = handsAtWork(state, ownerOnTask, moving);
  const minute = workMinute(state, working);
  // The men on a standing contract put their minute in beside the jobs (CLAUDE.md T13 3.16).
  runContractMinute(state);
  for (const job of minute.finished) raiseJobAtGate(state, job);
  if (minute.noMaterial) raiseNoMaterial(state);
  if (minute.bagsFull) raiseBagsFull(state);
  tallyEfficiency(state, minute.worked, minute.lost);
}
```

with `workMinute` imported from `./production`, and delete the private `AtWork`, `waitingLine`,
`canWorkOn` and `materialReady` (they live in `production.ts` now). One difference to weigh:
today `runContractMinute` runs after the jobs' men have taken their machines and before the
labour goes in; after this it runs after the whole minute. B1 should say whether the contract's
men claim machines inside `runContractMinute`; if they do, the order of claims within a minute is
unchanged (the jobs' men first either way).

### 3.5 `src/ui/laptop.ts`, `taskRow` (B5's file): the button says "Create material list"

```ts
  const startLabel =
    task.kind === 'materialTakeOff'
      ? TAKE_OFF_BUTTON_LABEL
      : staffLine === ''
        ? 'Start'
        : 'Take it on';
  const action = taskStartAction(state, task, startLabel);
```

with `TAKE_OFF_BUTTON_LABEL` imported from `../engine/tasks` (or from the index once 3.8 is
applied).

### 3.6 `src/engine/reputation.ts`, `applyRating` (B3's file): the night's tier

After `const wet = job.wetFinish ? WET_AIR_FINISH_RATING : 0;` add

```ts
  // And a piece made on the second shift comes out a tier down for the share of it that was
  // (PIOTR, CLAUDE.md T13 3.9).
  const night = nightQualityPenalty(job);
```

change the rating line to `scaled - missed - dusty - wet - night`, and after the `wet` board line
add `if (night > 0) changeReputation(state, -night, \`${job.name}: made on the night shift\`);`.
Import `nightQualityPenalty` from `./owner` (no cycle: `owner.ts` imports no engine module that
imports `reputation.ts`). `nightQualityPenalty` is `NIGHT_QUALITY_TIER_DROP` times the night
share of the piece, one point for a piece made wholly at night, as the dusty hall's point is.

### 3.7 `src/ui/jobCard.ts`, `jobAssignControls` (B3's file): a night man can be given a job by day

Replace `.filter((worker) => isWorkingToday(state, worker))` with
`.filter((worker) => onTheBooksToday(state, worker))`, imported from `../engine/staff` (or the
index), so the chips offer the night men too; by day `isWorkingToday` is the day shift only.

### 3.8 `src/engine/index.ts`: exports

```ts
// staff
  hurtWorker, nightCrew, nightPremiumFor, onTheBooksToday, rollNightAccident,
  rollNightBreakdowns, runNightShift, secondShiftCheck, secondShiftRuns, shiftOf,
export type { NightReport } from './staff';
// owner
  HOLIDAY_OPTIONS_DAYS, holidayCheck, houseSumFor, nightQualityPenalty, nightShareOf,
  onHoliday, workingDaysInHouseWindow,
// tasks
  TAKE_OFF_BUTTON_LABEL, joineryCoreOffer, staffManagementTaker,
export type { JoineryCoreOffer } from './tasks';
// production
  WAITING_FOR_MATERIAL, canWorkOn, workMinute,
export type { MinuteReport } from './production';
```

Then the three imports marked `// T13-C1: export from index.ts` in `src/ui/team.ts` and the one
in `src/ui/ownerOut.ts` move onto `../engine/index`.

### 3.9 `src/engine/constants.ts`: two constants to move

`HOLIDAY_OPTIONS_DAYS` from `owner.ts` (section 3.9 of the brief, the holiday) and
`TAKE_OFF_BUTTON_LABEL` from `tasks.ts` (section 3.8 of the brief), each marked
`// T13-C1: move to constants.ts` above it.

### 3.10 `src/ui/styles.css`: the rules for the class names

The empty rules exist for `.holiday`, `.draw-tier`, `.shift-chip`, `.crew-limit`, `.house-card`,
`.house-line`, `.house-picture`; `.owner-card`, `.draw-tiers`, `.house-tier`, `.house-name`,
`.shift-control`, `.day-meter` and `.joinery-core` are new.

```css
.owner-card { margin-bottom: 12px; }
.draw-tiers { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
.draw-tier { min-width: 64px; }
.house-tier { margin-top: 4px; }
.holiday {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 8px;
}
.holiday .row-action { display: flex; flex-wrap: wrap; gap: 6px; }
.owner-out.holiday { margin-top: 0; }
.crew-limit { font-weight: 600; margin: 4px 0 8px; }
.shift-control .row-action { display: flex; gap: 6px; }
.shift-chip { min-width: 56px; }
.day-meter { font-variant-numeric: tabular-nums; }
.house-card { width: 100%; text-align: center; }
.house-picture { display: block; width: 100%; height: auto; border-radius: 6px; }
.house-name { margin: 8px 0 2px; font-weight: 600; }
.house-line { margin: 0 0 8px; }
```

### 3.11 `src/ui/dayEnd.ts` (B5's file): the night on the plate

`DaySummary.nightMinutes` is filled by the night (the summary is written after it). One line on
the day plate when it is above zero: `Night shift: ${minutes(summary.nightMinutes)}`.

### 3.12 Nothing to change in `handsAtWork`, `possibleSeats`, `hallIsEmpty`

They read `isWorkingToday(state, worker)`, which with no shift named is the day shift, so a night
man is not a hand, not a seat and not somebody in the hall by day (`tests/engine/
staffSecondShift.test.ts` "a man on the night shift is not on the day shift" asserts the seats
through the tally). The night is not in the efficiency number: it is reported as `nightMinutes`.
If phase C wants the night in the efficiency, the seats at night are `nightCrew(state).length`
and the worked minutes are `NightReport.minutes`; B2 read 3.5 as the day's number.

---

## 4. Foreign test edits

None. No test outside B2's ownership was changed; the suite is green at every commit.

---

## 5. Art requested

Nothing beyond `docs/art/REQUESTS-T13.md` 3 and 5, which B2's placeholders stand in for:

- `house.1` to `house.8` (section 3 of the requests file): drawn tonight by
  `placeholder('house.<tier>', { width: 900, height: 300 }, { label })` through `placeholderSvg`,
  the width of the day end card at 1x, so the file at 1800 by 600 lands as the request says. The
  card prints the tier's name under the picture; the picture itself wants no text.
- The production manager and the estimator character sheets (section 5): B2 draws no character;
  the hall's renderer (B4's) draws whatever the manifest has and falls back to idle. The team page
  shows both roles as rows and tiles, no picture.

---

## 6. Not done, and done differently

1. **The night breakdown roll is written, not wired.** `rollNightBreakdowns` breaks machines at
   twice the day's overdue chance and is tested for its contract, but `runNightShift` does not call
   it: a machine broken with no repair task and no event would sit broken in silence, and
   `ensureTask`, `adHocChoices` and `raiseMachineBroken` are private to `game.ts`. Note 3.1 wires
   it in one line.
2. **The night's job at the gate and bags full events** are returned, not raised, for the same
   reason (note 3.1). Both are harmless in the meantime: the job card offers the transport, and
   `hallBlock` reads the full store.
3. **The night premium is the quarter on top, not the whole 1.25.** Section 2 says why; section 7
   says the alternative. Piotr should say which he meant.
4. **The estimator and the manager are hired without an office admin.** The Turn 10 rule "nobody
   in the office before the one who runs it" stays for the purchasing clerk, the salesman and the
   draftsman, whose work the admin covers at double time until they are taken on. It does not
   cover a take off or the running of the hall, and the playthrough of CLAUDE.md T13 10.4 hires the
   estimator in month 2 and the manager in month 3 without an admin at all. `BEHIND_THE_ADMIN` in
   `staff.ts` names the three.
5. **The production manager counts against the floor.** Phase A put him in `FLOOR_ROLES`; the
   brief says the floor limits "headcount" and the office is in the office block. He runs the floor,
   he stands on it. Kept and tested (`staffCrewLimit.test.ts` "counts the owner, the men on the
   floor and the manager, and never the desks"). If Piotr wants him off the count it is one entry.
6. **The holiday's first day is the day of the click.** "The owner is away for N days" is read as
   today and N minus one working days after it; five days asked for on a Monday is Monday to
   Friday, and the next Monday he is back. A click at ten to five still spends today.
7. **A fresh game reads house tier 1**, on day 3 and on day 30 alike: tier 1 is the floor, there is
   nothing below the first threshold to be, and the first threshold's own thirty day sum at 200 a
   day only confirms it. The card says "tier 1 of 8" and the name.
8. **The Joinery Core purchase sits on the Technical tab**, next to the estimator whose day it
   lengthens, as this group's brief said; the brief's "a software line in Admin" (3.8) is not also
   built. If phase C wants the line in the laptop's Admin group as well, `joineryCoreOffer(state)`
   hands it everything and the two `data-do` handlers already exist.
9. **The manager's own day meter is a text line**, "Today: Assigning 60 min", on his row of the
   Management tab, from `dayMinutesByCategory(worker.dayLog)`. The painted bar the top bar draws for
   the owner is B5's and reads the owner's log; a second bar for the manager was not built.
10. **Section 3.9 point 4** (the auto connection on placement) was phase A's and is not touched.
11. **`docs/art/REQUESTS-T13.md`** is not edited (frozen); section 5 above is what phase C merges.

---

## 7. Cross check notes (CLAUDE.md 10.3)

What B2 verified:

- **One worker list, one predicate.** The crew limit (`crewCount`), the second shift (`nightCrew`,
  `hands(state, { shift })`), the manager's cover (`managerOnDuty`, `staffOutputFactor`), the
  estimator's capacity (`canTakeOn` reading `isWorkingToday`) and the day's hands and seats in
  `game.ts` all read `state.workers` through `isWorkingToday(state, worker, shift)` or
  `onTheBooksToday`. A joiner on the second shift is not on the day shift: he is not in `hands()`,
  not a seat of `possibleSeats`, not in `hallIsEmpty`'s hall, not staying for overtime, and he is
  in `hands(state, { shift: 'night' })` (`staffSecondShift.test.ts`).
- **One minute booking.** The night's minutes go into the job through `addLabour`, onto the machine
  through `accumulateMachineMinute`, onto `job.nightMinutes` and `dayStats.nightMinutes`, and
  the parity test proves `workMinute` is the clock's minute. The owner's day meter and the
  manager's day meter are both `dayLog` written by `logDayMinute`; the manager's assign minutes
  are the minutes the owner's meter no longer shows (`staffSecondShift.test.ts` "moves the assign
  minutes").
- **The efficiency tally and the meters agree on the day.** The minutes the tally counts as
  worked are the minutes `spendOwnerMinute(state, 'workshop', 'workshop')` books on the owner's
  meter (the parity test compares `dayLog` and `minutesWorked` after one minute by the clock and
  one by `workMinute`). The night is outside the tally by design (note 3.12).
- **One ledger.** The night premium is one `wagesNight` line through `charge()`, dated the night it
  is worked; nothing in B2's files writes `state.cash`.

What phase C must still check:

- **The contracts' people only assignment (B1's `contracts.ts`)** should read `onTheBooksToday`
  or `isWorkingToday` with the shift, not `startDay` and `absentDaysRemaining` directly; B2 could
  not read B1's worktree. A night man assigned to a contract by day would otherwise work it twice.
- **The weekly wage and the night premium.** `weeklyWageBill` (B1's `economy.ts`) pays every man
  with a weekly wage on Friday, night men included; B2 books the quarter on top nightly. The month
  end's "salaries (day and night separately)" is therefore the Friday wages and the night
  premiums. If Piotr meant the whole 1.25 of a night man's hours to be the night line, the change
  is in `weeklyWageBill` (exclude `shiftOf(state, worker) === 'night'`) and in `nightPremiumFor`
  (`NIGHT_RATE` instead of `NIGHT_RATE - 1`), two lines.
- **The playthrough (10.4)** hires the manager in month 3 and takes a five day holiday: the
  `TAKE_HOLIDAY` note (3.3) decides whether the empty hall skips to the summary or ticks to five.
- **The warning strip (B5's `warnings.ts`)**: "a started job with nobody assigned" should not fire
  for a night man's job by day; his job has `assignedTo` set, so it should be fine, but the row
  says "Tom, night shift" and phase C can eyeball it in 10.5.
- **`ASSIGN_JOB` by day for a night man** goes through `assignJob`, which does not read the
  shift: the job is his and moves tonight. The job card's chips need note 3.7 to offer him.
- **The `.gitignore`** rule `node_modules/` does not match a symlinked `node_modules` in a
  worktree; every B2 commit stages explicit paths. Nothing to change in the repository.
