# Phase B2 notes: the people (CLAUDE.md T21 2.5, 2.7, 2.8, 2.9, 2.10)

Branch `claude/determined-tesla-e90ze6`, on top of phase A (89fe38f) and phase B1 (0c0768d). Four
commits, T21-B2a to T21-B2d. Everything the lead has to know: the frozen file changes to apply, the
figures chosen, what the brief calls one thing and the code another, and two lines a task.

## Frozen file changes for the lead to apply

Nothing in this section has been applied by this agent.

### 1. `src/engine/constants.ts`: four comment lines that still carry Turn 20's words (T21-B2a)

Section 7's cross check is `grep -rn "1\.4\|super experienced\|extremely experienced" src`: nothing.
Four comments in the frozen constants still answer it. Two of them name the old words to say they are
gone, which is honest prose and a grep hit all the same; two of them use the old word as if it were
still the game's, which is wrong in itself.

**(a) The take off comment, line 653.** The word is simply out of date.

Exact old text:

```
 *  another, so a man with no experience spends 37 minutes over it and an extremely experienced one
```

Exact new text:

```
 *  another, so a man with no experience spends 37 minutes over it and an excellent one
```

(The figures still hold: 30 over 0.8 is 37 and 30 over 1.2 is 25, so the 21 beside it is Turn 20's
1.4 arithmetic. The honest pair is 50 and 25: 30 over 0.6 is 50 minutes for the man with no
experience and 30 over 1.2 is 25 for the excellent one. Both figures are wrong in the file as it
stands, so the whole clause wants replacing:

```
 *  another, so a man with no experience spends 50 minutes over it and an excellent one 25, and he
 *  does as many a day as his minutes allow. */
```

in place of the two lines ending `21, and he does as many a day as his minutes allow. */`.)

**(b) `TIER_MIN_REPUTATION`, line 3311.** The same out of date word.

Exact old text:

```
 *  always comes, and the extremely experienced one does not look at a workshop under 60
```

Exact new text:

```
 *  always comes, and the excellent one does not look at a workshop under 60
```

**(c) `TIER_WORDS`, line 3287.** This one is prose about the change and is only a grep hit.

Exact old text:

```
 *  excellent**, and Turn 20 printed "super experienced" and "extremely experienced" instead, which
 *  are Claude's words and not his (PIOTR, 19.09; CLAUDE.md T21 2.9). */
```

Exact new text:

```
 *  excellent**, and Turn 20 printed two words of its own for the top two instead, which were
 *  Claude's and not his (PIOTR, 19.09; CLAUDE.md T21 2.9). */
```

**(d) `WORKER_RATES`, line 3299.** The same: prose about the change, and the one `1.4` in the file
that really is a tier rate, even as history.

Exact old text:

```
 *  [PIOTR, 19.09: 0.6, 0.8, 1.0, 1.2]. Turn 20 ran 0.8 / 1.0 / 1.2 / 1.4, which was Claude's
```

Exact new text:

```
 *  [PIOTR, 19.09: 0.6, 0.8, 1.0, 1.2]. Turn 20 ran a ladder one step higher all the way up, which
```

with the line after it, `*  reading and one step too high all the way up. One table for every role that has a rate, so an`,
becoming `*  was Claude's reading and not his. One table for every role that has a rate, so an`.

Reason for all four: the cross check of section 7 is a grep, and a grep cannot tell a history line
from a live one. (a) and (b) are wrong whatever the grep says.

### 2. `src/engine/game.ts`: the day's production minute goes through `placeHand` (T21-B2c, 2.7)

**This is the most important note in this file. Until it is applied, 2.7 is not live for the
player:** the day loop keeps its own copy of the production minute, and the scheduler, the moves and
the article in "waiting for the table saw" are only on the path `workMinute` serves, which is the
night shift and the tests. The night shift already has all of it.

Five edits, all in `runProductionMinute` and the helpers above it.

**(a) The loop over the hands.** Exact old text:

```ts
  for (const hand of working) {
    if (!canWorkOn(state, hand.job)) {
      releaseMachines(state, hand.who);
      lose(hand.job.blockedBy === 'waiting for material' ? 'noMaterial' : 'noMachine');
      continue;
    }
    const stage = jobStage(state, hand.job, cncOptions(state, hand.who, hand.job));
    if (stage === null) continue;
    const at = takeMachines(state, hand);
    if (at.waitingFor !== null) {
      // He stands at the machine until the man on it is done with it (CLAUDE.md T7 3.1).
      hand.job.blockedBy = waitingLine(at.waitingFor);
      lose('noMachine');
      continue;
    }
    atWork.push({ hand, stage, machine: at.machine });
  }
```

Exact new text:

```ts
  for (const hand of working) {
    // One reading of a man's minute, the scheduler of CLAUDE.md T21 2.7 inside it: he is moved off a
    // queue he is standing in if there is anything else for him to do, and only then does he stand.
    // The night shift runs the same function through `workMinute` (CLAUDE.md T21 2.7).
    const place = placeHand(state, hand);
    if (place.noMaterial) raiseNoMaterial(state);
    if (place.lost !== null) lose(place.lost);
    if (place.work === null) continue;
    atWork.push({ hand, stage: place.work.stage, machine: place.work.machine });
  }
```

**(b) The three helpers that are now somebody else's.** Delete `materialReady`, `canWorkOn` and
`waitingLine` from game.ts: `placeHand` does all three, in `src/engine/production.ts` and
`src/engine/jobs.ts`, and leaving these behind is the second copy this turn is closing. Exact old
text to delete (lines 1498 to 1519 and 1580 to 1583 as the file stands at commit T21-B2c):

```ts
/** The rack has to hand over what the next slice of work needs, or the job stands still and the
 *  joiners stand around (CLAUDE.md T2 3.6). */
function materialReady(state: GameState, job: Job): boolean {
  const ok = drawSheetsFor(state, job, jobProgress(job));
  if (!ok) {
    job.blockedBy = 'waiting for material';
    raiseNoMaterial(state);
  }
  return ok;
}

/** True when the job can be worked on this minute. Writes down why it cannot, either way. */
function canWorkOn(state: GameState, job: Job): boolean {
  const block = hallBlock(state, job);
  job.blockedBy = block;
  if (block !== '') return false;
  return materialReady(state, job);
}
```

and

```ts
/** What the hall says a man is waiting for, in the words the job card and the Work Plan use. */
function waitingLine(specId: string): string {
  return `waiting for ${(findSpec(specId)?.name ?? specId).toLowerCase()}`;
}
```

`raiseNoMaterial` stays exactly as it is: the loop above calls it now.

**(c) The import of `placeHand`.** Exact old text:

```ts
import {
  type Hand,
  jobOf,
  releaseIdleMachines,
  stationForProduction,
  takeMachines,
} from './production';
```

Exact new text:

```ts
import {
  type Hand,
  jobOf,
  placeHand,
  releaseIdleMachines,
  stationForProduction,
} from './production';
```

**(d) Four imports that nothing in game.ts reads any more.** Each is used exactly once today, in the
text deleted above, so each one left behind is a lint error. Remove the line `  hallBlock,` and the
line `  jobStage,` and the line `  jobProgress,` from the `from './jobs'` block; remove the line
`  drawSheetsFor,` from the `from './materials'` block; remove the line `  releaseMachines,` from the
`from './machines'` block; and in `import { type StagePlan, cncOptions, labourPerMinute, tradeFactor }
from './stages';` remove `cncOptions`, leaving
`import { type StagePlan, labourPerMinute, tradeFactor } from './stages';`. `findSpec` stays: five
other places in the file read it.

**(e) Three test assertions that carry the old wording.** They pass today because they drive the day
loop, which writes `waiting for table saw` from the copy being deleted. When (a) to (d) land they
each want the article putting in:

- `tests/engine/machineHours.test.ts:104`, `expect(waiting?.blockedBy).toBe('waiting for table saw')`
- `tests/engine/staff.test.ts:321`, `job.blockedBy === 'waiting for table saw'`
- `tests/render/figures.test.ts:76`, `expect(svg).toContain('waiting for table saw')`

`tests/engine/onOrderKit.test.ts` already carries the article: its sentence comes from
`src/engine/jobs.ts`, which is not frozen and was changed in this commit.

One more consequence of (a) to (d), and it is a good one: the day loop will then move men the way the
night shift does, so the efficiency figures of a hall with a queue on a job will rise. Two tests read
a figure that could move and both are about a hall of one man a job, which the scheduler never
touches: `tests/engine/efficiency.test.ts` ("books a man waiting for the one saw as no machine free")
and `tests/ui/topbar.test.ts` (the 50% beside the clock). They were run against the new scheduler
through `workMinute` and neither moved.

### 3. `src/engine/constants.ts`: the drawing's short word for a machine (T21-B2c, 2.6, 2.7)

The drawing says `waiting for the saw / the CNC / the booth`
(docs/mockups/t21/bubbles.html). What is built says `waiting for the table saw`, because the machine's
own name is the only name the game has and a second table of words is what the rules forbid. To reach
the drawing exactly, that second table has to exist, and it is the smallest one that could:

```ts
/** What a man calls a machine when he is standing about waiting for it: the trade's own short word,
 *  not the catalogue's name [PIOTR's drawing, 19.09: "waiting for the saw"]. Only the families a man
 *  ever queues for are on it, and a family that is not on it is called by its catalogue name
 *  (CLAUDE.md T21 2.6, 2.7). */
export const MACHINE_SHORT_WORDS: Record<string, string> = {
  tableSaw: 'saw',
  panelSaw: 'saw',
  cnc: 'CNC',
  sprayBooth: 'booth',
  edgebander: 'edgebander',
  planerThicknesser: 'planer',
};
```

and then in `src/engine/jobs.ts`, `waitingLine` reads it:

```ts
export function waitingLine(specId: string): string {
  const name = MACHINE_SHORT_WORDS[specId] ?? (findSpec(specId)?.name ?? specId).toLowerCase();
  return `waiting for the ${name}`;
}
```

This is not applied and not asserted anywhere, because the ids above want checking against the
catalogue before they are trusted, and because it is Piotr's call whether the hall should say "the
saw" while the Machines page says "Table saw". The article is applied and is what the tests assert.

## Names: the brief against the code

Confirmed again from the code, and used in these four commits:

- `runAutoAssign` is `assignStaffTasks` in `src/engine/tasks.ts`; the job assignment pass is
  `autoAssignJobs` in `src/engine/staff.ts`.
- `state.arrears` is `state.finance.arrearsAmount`, and the brief's "normal" difficulty is the code's
  `hard`.
- `WEEKS_PER_MONTH` is gone; `WORKER_HOURS_PER_MONTH` and `WORKER_MINUTES_PER_MONTH` are what a month
  of a man is measured in now.

## The two greps of section 7, run on this commit

```
$ grep -rn "weeklyWage\|WEEKS_PER_MONTH" src
src/engine/migrate.ts:23: *  seven. Turn 21 deleted `WEEKS_PER_MONTH` from the constants because nothing in the game converts
src/engine/migrate.ts:26:const WEEKS_PER_MONTH_V17 = 30 / 7;
src/engine/migrate.ts:316:    const weekly = typeof worker.weeklyWage === 'number' ? worker.weeklyWage : 0;
src/engine/migrate.ts:318:    worker.weeklyWage = weekly > 0 ? weekly : Math.round(monthly / WEEKS_PER_MONTH_V17);
src/engine/migrate.ts:349: *  - **The wage.** `weeklyWage` becomes `monthlyWage` at `weeklyWage * 30 / 7`, which is the
src/engine/migrate.ts:380:    const weekly = typeof worker.weeklyWage === 'number' ? worker.weeklyWage : 0;
src/engine/migrate.ts:382:    worker.monthlyWage = monthly > 0 ? monthly : Math.round(weekly * WEEKS_PER_MONTH_V17);
src/engine/migrate.ts:383:    delete worker.weeklyWage;
```

Nothing but the migration, which is what the brief allows. Line 316 to 318 is the Turn 20 lift
(version 16 to 17) and has to keep writing the field the lift after it reads.

```
$ grep -rn "1\.4\|super experienced\|extremely experienced" src
src/ui/styles.css:372:  line-height: 1.4;
src/ui/contracts.ts:528: (CLAUDE.md T20 2.1.4)
src/engine/production.ts:112: (PIOTR; CLAUDE.md T20 2.1.4)
src/engine/constants.ts:347: which is 171.43
src/engine/constants.ts:653: an extremely experienced one
src/engine/constants.ts:1563:    height: 1.4,
src/engine/constants.ts:3256: 1.4 m is a 1.8 m man's stride
src/engine/constants.ts:3261:export const WALK_STRIDE_METRES = 1.4;
src/engine/constants.ts:3287: "super experienced" and "extremely experienced"
src/engine/constants.ts:3299: Turn 20 ran 0.8 / 1.0 / 1.2 / 1.4
src/engine/constants.ts:3311: the extremely experienced one
src/engine/contracts.ts:152, 350, 552, 561, 581, 608, 614, 626, 707, 723, 938, 957: CLAUDE.md T20 2.1.4
src/render/pipes.ts:171: PIPE_STROKE * 1.4
```

Every hit, and why it is not a tier rate:

- `styles.css:372` is a line height, `constants.ts:1563` is a spec's height in metres,
  `constants.ts:3256` and `:3261` are a man's stride, `render/pipes.ts:171` is a stroke width, and
  `constants.ts:347` is 171.43 hours, which contains the digits and is not the number.
- Every `T20 2.1.4` and `T20 2.5` style hit is a citation of a brief section number.
- The three in `constants.ts` at 653, 3287, 3299 and 3311 are the four comment lines above, which
  the lead's note fixes. **None of them is a live tier rate**: `WORKER_RATES` itself is
  0.6 / 0.8 / 1.0 / 1.2 and `tests/engine/staff.test.ts` now asserts that table literally.
- The three hits in `src/engine/staff.ts` and `src/ui/team.ts` that this commit found were live
  prose about what the hire card says, and they are fixed in the source: the refusal really reads
  `excellent joiners come from reputation 60` now, so the comments quoting it were out of date.
- One more hit came up on the last run of the grep, after the greps above were written down:
  `src/engine/contracts.ts:350`, the comment over `contractResultFor`, still said "his own weekly
  wage" and named Turn 20's four wages against Turn 20's four rates. It is fixed in the T21-B2d
  commit, with Piotr's own figures: 1,950, 2,600, 3,500 and 4,330 a month against 0.6, 0.8, 1.0 and
  1.2 of the owner. The claim it makes is still true, because the wage ladder is still the steeper of
  the two (0.75, 1, 1.35, 1.67 against 0.75, 1, 1.25, 1.5).

## Numbers chosen

Nothing in T21-B2a: every figure of the tiers and the pay is Piotr's own of 19.09 or phase A's, and
this commit only asserted them. The figures chosen in the other three tasks are listed under each.

## T21-B2a: 2.9 and 2.10, the four tiers and monthly pay

- Built: the finishing and the proof of what phase A landed. The hiring gate reads `spec.monthlyWage`
  directly and its refusal names it, now asserted at Piotr's own 2,600 in
  `tests/engine/hiringGate.test.ts` (2,600 in the bank takes an experienced joiner on, 2,599 does
  not, and the card prints the same sentence with no week in it); the four tiers are asserted as
  tables, literally, in `tests/engine/staff.test.ts` (the ids, the four words, the four rates
  0.6 / 0.8 / 1.0 / 1.2, the excellent man from reputation 60, and nothing above 1.2); the v29
  fixture and its four tests are in `tests/cloud/migrate.test.ts` (the week converted to the month at
  the conversion the Turn 20 build printed, the very experienced man out at 1.0 and not 1.2, the two
  new fields at nought, and a whole v29 hall with men in it opened, run on and round tripped); the
  Summary's "What is coming" row is asserted in `tests/ui/accountingDays.test.ts` to be dated the
  last working day of the month with the month's bill beside it and no week anywhere on the page.
  Three live comments in `src/engine/staff.ts` and `src/ui/team.ts` that quoted the hire card's
  refusal as "extremely experienced joiners come from reputation 60" now quote what it really says.
- Left: the four comment lines in the frozen `src/engine/constants.ts`, as note 1 above. Nothing was
  migrated for the Company board's per man rate or the insurance's per employee premium, because
  neither reads a wage: `perMan` in `src/engine/rate.ts` is the workshop's earned labour rate divided
  by the heads on the books (pounds an hour over people, no wage in the sum), and
  `liabilityPremium` in `src/engine/insurance.ts` is `LIABILITY_BASE_YEARLY` plus a flat
  `LIABILITY_PER_EMPLOYEE_YEARLY` of 180 a head. The brief says these "read it"; they read the
  head count, and inventing a wage term in either would be a new rule and not this turn's. The night
  premium was checked and is right: `nightPremiumFor` is the monthly wage over
  `WORKER_HOURS_PER_MONTH`, for the eight hours of the shift, at the quarter the night rate adds,
  which is 22.75 for a joiner with no experience, and `tests/engine/staffSecondShift.test.ts` already
  asserts that figure and not the old one. No test was weakened or skipped in this commit.

## T21-B2b: 2.5, the office works without you

- Built: all three, in the unfrozen modules and with no frozen file touched.
  1. **The site measure.** `TASK_DEFINITIONS.siteMeasure.autoRoles` is `['estimator', 'salesman']`
     where it was `['estimator']`, and `bestTakerOf` already reads that list as a ranking, so the
     estimator goes first, the salesman second, and the owner only when there is neither on the
     books. The owner is never handed a task behind his back in this game (he starts what he does),
     so "the owner only when neither" is the absence of a taker and not a third rung.
  2. **The material.** `autoOrderMaterial(state, job)` in `src/engine/jobs.ts`, called from the one
     place a job becomes short with its paperwork behind it, the tail of `refreshJob`. It asks
     `firstOnDutyOf(state, MATERIAL_ORDER_ROLES)` for the purchasing clerk, then the estimator, then
     the office admin, and places the player's own order through the player's own `orderForJob`, at
     the ad hoc price, with `canAfford`'s overdraft floor deciding whether there is anything to order
     with. `orderForJob` takes a third argument, `orderedBy`, and writes
     `Material for <job>, ordered by <name>`.
  3. **The minute a task arrives.** `createTask` ends by running `assignStaffTasks(state)`, outside
     the dinner hour and behind an `assigning` guard.
  Tests: `tests/engine/officeWithoutYou.test.ts` (7, each of the two here with the person on the
  books and without, plus the overdraft floor and the dinner hour) and three new ones in
  `tests/engine/estimatorSiteMeasure.test.ts`.
- Left: nothing of 2.5. Two tests were rewritten to the new truth and neither was weakened.
  `tests/engine/estimatorSiteMeasure.test.ts` asserted `auto` was `['estimator']` alone and now
  asserts the pair in Piotr's order; `tests/engine/helper.test.ts` asserted a freshly created
  helper task had nobody on it, and now asserts what it was always about, that the task is never the
  joiner's, and that whoever holds it is the helper.

### What was already true, and what actually changed (2.5.3)

The brief says "`runAutoAssign` is called when a task is created, not only at 8:00". Read out of the
code as it stands, the pass is `assignStaffTasks` and it was **already** called every clock minute:
`settle` runs it through `delegateTasks` on every minute that is not the break, and `act` ends in
`settle` too, so a call that rang at 11:00 was taken at 11:00 and a task created by a player action
was taken in the same action. Nothing in the game waited for 08:00. What changed is the ordering
inside a minute: a task is now handed out **as it is created**, before the rest of whatever created
it has run, so no code path can create a task and leave it lying for the remainder of that minute.
This matters most where a task is created after `delegateTasks` has already run in the same settle,
which is every task `startDay` creates after its own `delegateTasks` line and every task an event's
completion creates. Reported here because the brief's sentence describes a bug that was not there.

### The ledger line, and why the name is in the label

`LedgerEntry` has `day`, `category`, `label` and `amount` and no field for a person, and adding one
is a frozen-file change (`types.ts`) that nothing else in the game would read. So the name goes in
the label, which is the string the Accounting page prints: `Material for Small kitchen, ordered by
Percy`. An order the owner places himself keeps the old label exactly, so the player can tell the two
apart by reading the line.

### What the auto order does not do, on purpose

It books nobody's minutes. Ordering the material for a job costs no minutes today either: the
player's `Order for this job` is one click and no task, and `materialOrderMinutes` is a curve the
Tasks page never creates a task from. Giving the clerk minutes for it would be a new rule about his
day, and the brief does not ask for one. The daily consumables chore (`dailyOrdering`) is untouched.

### The balance consequence Piotr should see

A workshop with anybody at all in the office now spends on material the minute a drawing is finished,
without being asked. On a company that is short of cash this is money leaving earlier than it used
to, and with phase B1's net position rule a company can now walk itself closer to the bank's limit
through its own office. Two things hold it: `canAfford` is the overdraft floor to the penny, so the
office cannot cross the limit; and the order was going to be placed anyway, because a job cannot be
made without its sheets. The whole test tree, the playthroughs included, came out green with no
scenario changing its ending, so the effect is timing and not outcome. It is worth one line to him
all the same: **the office will spend his overdraft down to the last pound without asking.**

## T21-B2c: 2.7, nobody waits while there is work

- Built: the scheduler, in `src/engine/production.ts`, as one function the day loop can call.
  `placeHand(state, hand)` is the whole of one man's minute: the hall, the rack, the machine of his
  stage, and between each of them the question of whether there is other work. `otherWorkFor` finds it
  and `moveToOtherWork` moves him through the game's own `addToJob`, so his chip on the Work Plan, the
  cell he stands on and the job his minute goes into are one fact. `jobHasWorkFor(state, job, who)` in
  `src/engine/jobs.ts` is the question asked of a job the man is not on: in production, the hall not
  stopping it, the rack able to cover its next slice, and its stage wanting no machine or a free one,
  with nothing claimed and nothing written down. The contract clause is one line in
  `contractWantsToday`, which is the one place the day's order is decided. The words: `waitingLine`
  moved into `src/engine/jobs.ts`, gained the drawing's article and is now read by `onOrderBlock` too,
  so the phrase exists once instead of twice; `waitingWordsFor` says what one man says, which is
  `waiting for the table saw` for the first man of a queue and `no cut parts yet` for the men behind
  him at a cutting stage. Tests: `tests/engine/nobodyWaits.test.ts` (8) and one in
  `tests/engine/contractDay.test.ts`.
- Left: the day loop. `src/engine/game.ts` is frozen for this agent and carries a second copy of the
  production minute, so **2.7 is live only on the path `workMinute` serves until note 2 above is
  applied**. Two tests were rewritten and neither was weakened:
  `tests/engine/assignees.test.ts` ("sends the men past the first to the waiting cell") now puts its
  three men in a hall with one job in it, because with other work about there is no queue left to
  look at, and `tests/engine/onOrderKit.test.ts` carries the article.

### What of 2.7 could not be built, and why

Two of the section's three clauses cannot be expressed by this model, and neither is faked.

1. **"Another stage of the same job that needs no machine or a free one."** A job's position is one
   number, `job.labourRemaining`, and its stage is derived from that by `stageAt` / `currentStage`.
   Every man on a job works the same stage, and the stages are consumed in order. There is no second
   stage of a job to be at. `tests/engine/nobodyWaits.test.ts` asserts the plan of a job is ordered
   and end to end, which is that fact written down.
2. **"The same on another job he is assigned to."** A man is an assignee of exactly one job, always:
   `assignJob` sets `job.assignees = [workerId]` and `addToJob` takes him off every other job first,
   and its comment is the rule, "Nobody is on two jobs at once". So "another job he is assigned to" is
   the empty set for every man in the game. What is built instead is the move: the scheduler puts him
   on the other job, through the same one path, and the Work Plan shows his chip there. Piotr should
   know that this is the reading, because the other reading, a man assigned to several jobs at once,
   is a change to a rule of Turn 19 and wants his word.

**"The scheduler treats that stage as not available to him"** (assembly before cutting) is already
true by construction: a job at a cutting stage has no assembly stage to offer, so `jobHasWorkFor` says
no to it while its saw is taken and the scheduler sends nobody. It is asserted as an invariant and not
added as a second gate that could one day disagree with the first.

### The three men the scheduler never moves, and why

- **The owner.** What he does next is his own decision and the game has always kept it so
  (CLAUDE.md T4 3.2). Nothing is handed to him behind his back.
- **The last man on a job.** `takeOffJob` puts a job with nobody left on it back on the ready list, and
  nothing would bring him back to it when the saw freed, so a hall of one man a job would collapse all
  its work onto whichever job happened to be workable. The man who holds the machine stays and the
  queue behind him moves, which is the scene the section is about.
- **A man the contract still wants today.** He is not among the job's hands at all.

### Numbers chosen (T21-B2c)

- **The order the scheduler looks in is the hall's own book order** [TUNE]: `state.jobs` is in the
  order the jobs were taken, so the oldest job that can use the minute gets him. Any other order
  would be a new rule about which job matters most.
- **The men behind the first in a queue say `no cut parts yet` only at a cutting stage** [TUNE, from
  the drawing's two men]. At any other stage every man of the queue says he is waiting for the
  machine, because "no cut parts" would be false of a job whose parts are cut and are in the booth.

### What this measures, for Piotr

- In the section's own scene, four men, one saw, two jobs, one at cutting and one at assembly: the
  hall works **four minutes where it worked three**, and the man who would have stood at the saw is at
  the other job's bench.
- In the six man, one saw hall with six jobs, one a man, it changes **nothing at all**: measured over
  an hour, 300 minutes worked and 60 lost to the saw, before the scheduler and after it. Every one of
  those men is the last man on his job, so moving him would take his job off the bench. **This is the
  limit of 2.7 as built and Piotr should hear it plainly: the scheduler empties a queue on a job, and
  it does not move a man who is working a job by himself.** Emptying that one too wants either a man
  on more than one job, or a scheduler that brings him back, and both are new rules.

## T21-B2d: 2.8, the day meter shows the idle

- Built: the booking and the drawing, with no frozen file needed for either.
  **The booking.** `ownerIdleReason(state)` in `src/engine/production.ts` hands back one of the four
  `OWNER_IDLE_REASONS` or null, and `bookOwnerIdleMinute(state)` books it. Rather than hunt for every
  place a minute of his can pass unworked, it is hung off the one hook that already knows whether the
  minute just gone was worked at all: `bookOne` inside `bookWeekMinutes` (`src/engine/tasks.ts`), which
  samples the owner every clock minute for his week's meters and computes `worked` off his own
  counters. `bookOne` now hands that flag back with the meters, and `bookWeekMinutes` books the idle
  minute when it is false. That means **every** unworked minute is caught, in the day loop as it
  stands, with no game.ts edit: the hook is called from `settle` on every minute that is not the
  dinner hour. The reasons: the rack and the machine are read the way the efficiency tally reads a
  lost minute, and the other two are the hall's list.
  **The drawing.** `segmentBar` puts one grey run after the worked bands, `dayMeter`'s figure reads
  `370 worked · 0 idle · 540` in place of `370 / 540 min`, and `segmentTooltip` adds the four reasons
  with their minutes, in `OWNER_IDLE_REASONS` order, in the same `.day-tip` and `.tip-row` markup, so
  there is one plate and not two. Phase A's `.seg-idle` is the grey and no CSS was wanted.
  Tests: `tests/engine/ownerIdle.test.ts` (9) and four new ones in `tests/ui/topbar.test.ts`.
- Left: nothing of 2.8. Four tests were rewritten to the new truth and none was weakened: three
  asserted the old two figure label (`tests/ui/topbar.test.ts` twice, `tests/ui/app.test.ts`,
  `tests/engine/breakTime.test.ts`) and one had a title that Turn 21 makes wrong
  ("leaves the break and the idle time unpainted", now "and the minutes nobody spent").

### The invariant, which is the whole of the arithmetic

A minute is either worked or stood and never both, and what the two come to can never be more than
the minutes of the day that have run, the dinner hour taken out of them unless he worked through it.
`bookOwnerIdleMinute` refuses to book past that cap, whatever calls it and however often, which is
what makes the figure safe in a game whose state settles many times a minute. It is asserted minute by
minute across a whole day, the break included, in `tests/engine/ownerIdle.test.ts`.

### Where the grey goes, and the band that was not added

The day log is the day in the order the minutes happened, and the minutes he stood are not in it: they
are counted in `owner.idleByReason` and nowhere else. So the grey is one run after the worked bands and
before the empty rest, which is exactly what the section describes ("between the worked green and the
empty rest"). The other reading, a `DayCategory` of its own in the log, would put the grey in the right
place in the order but it is a frozen file change (`types.ts` and `constants.ts` both) and it would
make the idle minutes part of `dayPercentages`, which the day end plate and the Company board print as
shares of the minutes worked. That would be a bigger change than the section asks for and it is not
made.

### Numbers and readings chosen (T21-B2d)

- **The split between `nothingAssigned` and `officeEmpty`** [TUNE]: there is an open job of work on the
  hall's list that nobody has taken, or a job standing ready for a bench, so there is work about and he
  is not on it, which is "Nothing assigned"; otherwise there is nothing at all and he is "In the office
  with nothing to do". Measured on a fresh Easy hall, a morning of doing nothing reads 100 minutes of
  Nothing assigned, because the morning's own list is sitting there untaken.
- **A minute he holds a task is never idle**, even if the task makes no progress: `spendOwnerMinute`
  has already booked it as worked, and a minute cannot be both.
- **The dinner hour books nothing**, which is the same rule the week's meters keep: an hour in the
  canteen is neither worked nor paid for.
- **All three figures are always printed**, so the label reads `370 worked · 0 idle · 540` on a day he
  stood through none of [TUNE]. The three are one sentence, and a sentence that loses a word on a good
  day reads as a different sentence.
