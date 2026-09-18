# Turn 20, B2 the people: the notes for phase C

Sections 2.3, 2.4, 2.5, 2.6, 2.7 and 2.14, in four commits, every one of them with
`npm run check` green on its own exit code before it.

| Commit | What |
|---|---|
| T20-B2a | Four tiers in the words the game prints, and everybody paid by the week (2.5, 2.6) |
| T20-B2b | The estimator works by his minutes, goes on site, and is off the Output list (2.3) |
| T20-B2c | Let go: a week's notice, paid, and the plan shows the hole (2.4) |
| T20-B2d | Our team says what the week was, and a machine nobody stood at says 0 h (2.7, 2.14) |

---

## 1. Notes for the frozen files

Six changes are wanted in the six frozen files. Nothing below was made; every one is written out
so it can be applied blind, with the test that proves it.

### 1.1 `src/engine/types.ts`: the action that lets a man go (blocks 2.4's click)

In the `GameAction` union, under the `// People and shifts:` comment, beside
`| { type: 'ASSIGN_SHIFT'; workerId: string; shift: Shift }`, add:

```ts
  /** Gives this man a week's notice. He works it out, he is paid for it, and the morning after
   *  his last day he is off the books (PIOTR, 18.09; CLAUDE.md T20 2.4). */
  | { type: 'LET_GO'; workerId: string }
```

### 1.2 `src/engine/game.ts`: the reducer case (blocks 2.4's click)

In `applyAction`, beside `case 'ASSIGN_SHIFT':`, add:

```ts
    case 'LET_GO':
      letGo(next, action.workerId);
      break;
```

and add `letGo` to the existing `import { ... } from './staff';` block (it already imports
`hire`, `isWorkingToday`, `runStaffDayStart` and the rest from there).

### 1.3 `src/ui/app.ts`: the route (blocks 2.4's click)

Phase A left `case 'letGo': return;` with a comment saying phase B fills it. Replace those two
lines with:

```ts
    case 'letGo':
      dispatch({ type: 'LET_GO', workerId: id });
      return;
```

`id` is `element.dataset.id`, which the row carries: `button('letGo', 'Let go', 'data-id=...')`
in `src/ui/team.ts`.

**The test for 1.1, 1.2 and 1.3 together** (phase C, in an app test): render the laptop's Team
page on Our team with one joiner on the books, click `[data-do="letGo"]` once, and assert
`currentState().workers[0].leavesOnDay === clock.day + LET_GO_NOTICE_DAYS` and that the row now
reads `leaves on <date>` with no second button on it. The engine side of it is already tested in
`tests/engine/letGo.test.ts`; what these three lines add is the click.

### 1.4 `src/engine/types.ts`: the two week fields of 2.7 (tidying, nothing is blocked)

2.7 wants a store per man that no field carried. It is written and read through one accessor in
`src/engine/staff.ts` (`weekMetersOf`, `weekNowOf`, `weekBeforeOf`), which casts the holder to a
small local interface, because the state is saved as JSON and an extra field survives a save, a
load and `clone` exactly as any other does. To make it a declared field instead, add to `Worker`
and to `OwnerState`:

```ts
  /** His week and the week before it: the hours, the six bands they went into, the pieces of a
   *  standing contract and the jobs he stood at, for the second line of his Our team row
   *  (CLAUDE.md T20 2.7). */
  weekNow?: WeekMeters;
  weekBefore?: WeekMeters | null;
```

with `WeekMeters` moved from `src/engine/staff.ts` into types.ts beside `DayLog`, and then delete
the `HasWeek` interface and the three casts in `weekMetersOf`, `weekNowOf` and `weekBeforeOf`
(the third is `productionMinutes`, which a fresh week seeds its baseline off; both `Worker` and
`OwnerState` already declare it, so the cast goes with the interface).
Nothing else changes: every caller already goes through those three. Test: the existing
`tests/engine/staffWeek.test.ts` and `tests/ui/teamWeek.test.ts` stay green.

### 1.5 `src/engine/types.ts`: the contract's piece counter of 2.7 (tidying)

The week's sampler credits a man with the pieces his contract turned out while he was on it, by
watching `contract.piecesMade` rise. What it saw last is kept on the contract through the same
cast (`piecesSeenByTheWeek` in `src/engine/tasks.ts`). As a field, beside `piecesMade` in
`Contract`:

```ts
  /** What the week's meters had counted off this contract when they last looked
   *  (CLAUDE.md T20 2.7). */
  piecesSeenByTheWeek?: number;
```

The better home for this is B1's `finishPiece` in `src/engine/contracts.ts`, which knows the men
on the contract at the minute the piece is finished. If phase C moves it there, delete
`bookContractPieces` and the interface above it in `src/engine/tasks.ts` and credit
`weekMetersOf(worker, weekOfDay(state.clock.day)).pieces` in `finishPiece` instead.

### 1.6 `src/engine/game.ts`: the week's sampler wants a line of its own (tidying)

The sampler is called from the top of `assignStaffTasks` (`src/engine/tasks.ts`), because that is
the one hook `settle` already runs over the whole crew every minute and game.ts is frozen. It is
guarded by the day and the minute it last sampled, so the extra `settle` of every `applyAction`
cannot count a minute twice. Tidier, in `settle` in game.ts, beside `delegateTasks(state)`:

```ts
  // The week's meters: a sample of the minute that has just gone (CLAUDE.md T20 2.7).
  bookWeekMinutes(state);
  if (!isBreak(state.clock.minute)) delegateTasks(state);
```

and then take the `bookWeekMinutes(state);` line back out of `assignStaffTasks`. Note that the
night shift does not run `settle` per minute (`runNightShift` loops `workMinute` itself), so a
night man's minutes are not in his week either way; putting the call in `settle` does not change
that, and a night line would want a call inside `runNightShift`.

---

## 2. Notes for files that are not mine

### 2.1 `src/engine/jobs.ts`: the take off's minutes (2.3)

`createJobTasks` still asks for `minutes: Math.round(materialOrderMinutes(job.price))` on the
`materialTakeOff` task. The curve by price is gone: a take off is `MATERIAL_TAKE_OFF_MINUTES` of
the desk it is done at, whatever the job is worth. `createTask` in `src/engine/tasks.ts` sets the
figure itself for that one kind, so the game is right tonight whatever the caller asks for. To
put it where it belongs, in `src/engine/jobs.ts`:

- old: `minutes: Math.round(materialOrderMinutes(job.price)),`
- new: `minutes: takeOffMinutes(state),`
- and swap `materialOrderMinutes` for `takeOffMinutes` in its `import { ... } from './tasks';`

and then delete the three lines in `createTask` that force it (they are commented with this
note). Test: `tests/engine/tasks.test.ts` "is as many a day as his minutes allow" and
`tests/engine/staff.test.ts` "lets the estimator do as many take offs as his minutes allow, not
five" both stay green; add that a job worth 100,000 carries a take off of the same 30 minutes as
one worth 400.

`materialOrderMinutes` is still called at that one line, and what it answers is thrown away by
`createTask`. Once the swap above is made nothing but its own test reads it. It is the material
order curve of CLAUDE.md 8.10 and it is still exported from `src/engine/index.ts`, so it is left
where it is rather than deleted.

### 2.2 `src/engine/constants.ts`: three dead constants (2.3)

`ESTIMATOR_JOBS_PER_DAY`, `ESTIMATOR_JOBS_WITH_JOINERY_CORE` and `JOINERY_CORE_EXTENSION_JOBS`
are read by nothing now (`grep -rn "ESTIMATOR_JOBS_PER_DAY\|ESTIMATOR_JOBS_WITH_JOINERY_CORE\|
JOINERY_CORE_EXTENSION_JOBS" src tests` finds only their own three lines). 2.3 says
`ESTIMATOR_JOBS_PER_DAY` goes; delete all three, with the paragraph of comment above them.

### 2.3 `src/engine/machines.ts`: who is on the Output list (2.3)

`outputBreakdown` puts every man whose `rate` is above nought on the "act where they are" list.
2.3 wants only the men who produce, and tonight that reads as the rule `produces` in
`src/engine/staff.ts`. The board does the filtering (`isAtADesk` in `src/ui/company.ts`), because
machines.ts is B3's tonight and staff.ts cannot be imported from it without a cycle
(staff.ts already imports machines.ts). If phase C would rather have it at the source, in
`outputBreakdown`:

- old: `if (worker.rate <= 0) continue;`
- new: `if (!PRODUCING_ROLES.includes(worker.role)) continue;` with `PRODUCING_ROLES` moved into
  constants.ts (it is a table, not behaviour) and read by both modules

and then delete `isAtADesk` and its call in `src/ui/company.ts`. **One or the other, never both,
and the source is the one to apply.** The board's filter matches a line by the name it is written
under, and `nameFor` in `src/engine/staff.ts` only keeps names unique while `WORKER_NAMES` has a
free one; the pool holds 20 and the crew limit can pass 20 in a large unit, so a second Dave is
reachable, and then an estimator Dave would take a joiner Dave's line off the sheet with him. The
filter at the source reads the role and never the name, and the ambiguity goes with it.
Test: `tests/ui/staffOnTheBoard.test.ts` stays green either way; add a hall with two men of one
name, one at a desk and one at a bench, and assert the bench man keeps his line.

### 2.4 `src/ui/contracts.ts`: the engine key on the assign list (2.5, one word)

The Assign list of a contract prints
`worker.tier === null ? worker.role : ${TIER_WORDS[worker.tier]} ${worker.role}` (about line 272).
`worker.role` is the engine key, which CLAUDE.md 3 forbids on a screen; the job card's own list
(`assigneeTrade` in `src/ui/jobCard.ts`) reads `ROLE_WORDS`. It only shows joiners today, so
nothing reads badly yet, and a production manager on it would print `productionManager`.

- old: `worker.tier === null ? worker.role : \`${TIER_WORDS[worker.tier]} ${worker.role}\``
- new: `worker.tier === null ? ROLE_WORDS[worker.role] : \`${TIER_WORDS[worker.tier]} ${ROLE_WORDS[worker.role]}\``
- `import { ROLE_WORDS } from './team';` as `src/ui/jobCard.ts` does.

`src/engine/machines.ts` line 553 has the same raw key in the Company board's crew line. With the
list filtered to the men who produce it prints `joiner` and `sprayer`, which read as English, so
it is left alone.

---

## 3. Numbers chosen

Every figure is in the module named beside it, with the tag in its own comment. Phase C moves them
into `src/engine/constants.ts`.

| Figure | Value | Module | Tag and why |
|---|---|---|---|
| `MATERIAL_TAKE_OFF_MINUTES` | 30 | `src/engine/tasks.ts` | [PIOTR, 18.09: "when I did it, it took 30 minutes"]. At his own rate: 37.5 for a man with no experience, 21.4 for the top man. |
| `JOINERY_CORE_TAKE_OFF_FACTOR` | 0.5 | `src/engine/tasks.ts` | [TUNE], from Piotr's 16 a day bare and 32 with the software. |
| `JOINERY_CORE_EXTENSION_TAKE_OFF_FACTOR` | 0.75 | `src/engine/tasks.ts` | [TUNE]. "Each extension takes a further quarter off": 42 a day with one, 56 with both. |
| `LET_GO_NOTICE_DAYS` | 7 | `src/engine/staff.ts` | [TUNE, Piotr's decision is open: he said a week's wage]. Seven days puts exactly one Friday inside the notice, so the week he works is the week he is paid for. |
| `WEEK_JOBS_KEPT` | 4 | `src/engine/staff.ts` | [TUNE]. How many job names a man's week line carries: enough to read, not a paragraph. |

Nothing else new was typed. `MINUTES_PER_WORKING_DAY`, `WORKER_RATES`, `WEEKS_PER_MONTH`,
`TIER_WORDS`, `TIER_MIN_REPUTATION` and `JOINERY_CORE_MAX_EXTENSIONS` are imported from
constants.ts and never copied.

## 4. CSS needed

**None.** `git diff <base> --stat -- src/ui/styles.css` is empty for this branch. Everything new
is drawn with classes that already exist:

- the Let go control: `.row-action` with `button()` (`.btn`) or `reasonLabel()` (`.reason`).
- the week line: two `<small>` elements inside the man's own `.row-main`, wrapped in a span hooked
  by `data-team-week="<id>"` and carrying no class of its own. `small` is already
  `display: block; font-size: var(--fs-tiny); color: var(--text-dim)` in styles.css and
  `src/ui/contracts.ts` writes its second lines the same way, so no rule is wanted.
- the hire card's refusal: the tile's own `.lock` paragraph and `reasonLabel`, as before.

## 5. Names: the brief's word against the code's

- **"poor", "normal", "super"** are gone (phase A). The words the game prints are `TIER_WORDS`;
  the ids are `novice`, `experienced`, `senior`, `master`.
- **`ROLE_WORDS`** moved from `src/ui/team.ts` into `src/engine/staff.ts`, because the hire card's
  refusal is written in the engine and names the trade. `src/ui/team.ts` re-exports it, so
  `src/ui/jobCard.ts` and `tests/engine/sprayer.test.ts` still import it from there.
  `ROLE_WORDS_MANY` beside it is the same trades in the plural (a salesman is not a "salesmans").
- **`estimatorCapacity(state, tier = 'experienced')`** keeps its name (it is in the frozen
  `src/engine/index.ts`) and answers a new question: how many take offs his minutes allow.
- **`JoineryCoreOffer.extensionJobs`** is gone and `extensionCapacities: number[]` and
  `minutesEach: number` are in its place: an extension is not "+5 jobs" any more, it is a shorter
  half hour.
- **`rolesForTask(kind)`** is new in `src/engine/tasks.ts`: the one reading of the eligible and
  auto lists from outside the module.
- The brief's **"the Output list"** is the second half of the Company board's Output sheet, the
  rows under `Act where they are, not in the number above` (`src/ui/company.ts`).
- The brief's six bands of a man's week are `WeekCategory` in `src/engine/staff.ts`:
  `jobs`, `contracts`, `unloading`, `cleaning`, `desk`, `site`. The mapping from a task kind is
  `WEEK_CATEGORY_OF_TASK` in `src/engine/tasks.ts`: the desk is the office and the drawing board,
  the van and the rack are the unloading, the broom and the spanner are the cleaning, the tape is
  the site.

## 6. Tests changed, and why

- `tests/engine/staff.test.ts`
  - "opens up as the reputation rises": the refusal's wording is the brief's now
    (`extremely experienced joiners come from reputation 60`), so the filter reads
    `blockReason.includes('come from reputation')` where it read `startsWith('Nobody')`.
  - "stops the estimator at five take offs a day" became "lets the estimator do as many take offs
    as his minutes allow, not five": sixteen, and his day spent instead of a counter run out
    (2.3).
- `tests/engine/tasks.test.ts`
  - the five and ten a day test became "16 bare, 32 with Joinery Core, 42 and 56 with its
    extensions", plus a second test for the minutes a man of each class takes over one.
  - the Joinery Core offer test reads `capacity`, `baseCapacity`, `coreCapacity` and
    `extensionCapacities` (2.3).
- `tests/ui/team.test.ts`: the Technical tab prints `16 a day, 32 with Joinery Core`,
  `42 and 56 with its extensions` and, once bought, `15 min each, 32 take offs a day` (2.3).

Nothing was weakened and nothing was skipped.

New test files: `tests/engine/payrollWeek.test.ts`, `tests/engine/estimatorSiteMeasure.test.ts`,
`tests/engine/letGo.test.ts`, `tests/engine/staffWeek.test.ts`, `tests/ui/tierWords.test.ts`,
`tests/ui/staffOnTheBoard.test.ts`, `tests/ui/teamLetGo.test.ts`, `tests/ui/teamWeek.test.ts`.

## 7. What I could not do, and why

1. **The Let go click is not wired.** The action, the reducer case and the route are three lines
   in three frozen files (1.1 to 1.3). The button is drawn with `data-do="letGo"`, which is the
   route phase A left open, and the engine behind it is written and tested; until those three
   lines land the click does nothing.
2. **The week's meters are not declared fields** (1.4, 1.5). They are written and read through one
   accessor, and they save and load with the state, but `Worker`, `OwnerState` and `Contract` are
   in the frozen types.ts.
3. **A man let go leaves under the `workerQuit` event kind.** `GameEventKind` is in types.ts, so
   no new kind could be added; `workerQuit` was written for the overtime quit of Turn 8, which went
   with the evenings in Turn 17, and nothing else raises it. A kind of its own (`workerLetGo`)
   would read better if phase C wants to add one.
4. **The night shift is not in a man's week.** `runNightShift` runs its own minute loop and never
   calls `settle`, so the sampler never sees those minutes. The sampler therefore leaves a night
   man alone altogether rather than sampling him through the day he was asleep for: his week reads
   nothing, which is true, instead of a day that was somebody else's. Nothing in 2.7 asks for the
   night, and a line inside `runNightShift` (B3's and the frozen game.ts's) would be wanted for it.
5. **The take off's minutes are forced in `createTask`** instead of at the one caller in jobs.ts,
   which is not mine (2.1 above).
6. **A man under notice is still given new work.** 2.4 does not say he should not be, so nothing
   stops the Work Plan putting him on a job he will not be there to finish; the morning he goes the
   job simply has nobody on it, which is what the brief asks for.

---

## 8. Review: the eight findings, one by one

An adversarial reviewer read the four commits. Three findings stood and are fixed, two are fixed
as far as my files reach, three are rejected. Nothing below weakened or skipped a test.

### 8.1 Confirmed and fixed: the week's meters booked minutes nobody worked
(`src/engine/tasks.ts`, `bookWeekMinutes`)

True, in all three of the ways the finding names, and proved before the fix went in: a joiner at an
empty rack read 1 band minute for 1 minute of standing about, and an hour of the owner's evening
put 60 minutes into every man's week with the hall dark. The sampler read `worker.jobId` and
`worker.taskId`, which a man keeps whether or not the minute went anywhere.

The minute is sampled now only when it was somebody's to work:

- `bookWeekMinutes` skips the whole crew while `crewHasGoneHome(state)` is true, so the evening
  after five is the owner's alone on the meters as it is in the hall (CLAUDE.md T17 2.12), and it
  samples the day shift only. A night man is left out rather than counted through a day he was
  asleep for (7.4 above).
- `bookOne` credits a band only when the man's own counters rose since the last sample:
  `productionMinutes` for a bench or contract minute and `minutesWorked` for a task minute, read
  through the new `effortSoFar` in `src/engine/staff.ts`. The paid minute is booked either way,
  which is the point of the efficiency figure: a man at an empty rack is paid for the hour and his
  week says he made nothing in it.
- `WeekMeters` gains `seenBench` and `seenTask` for those two baselines. The bench counter never
  goes back, so a fresh week seeds it off the man; the task counter starts again every morning, so
  the first sample of a day takes a baseline and credits nothing. Both are exact in the game,
  where a man's week opens at the day start before he has touched anything.

Tests: `tests/engine/staffWeek.test.ts` gains "pays him for the hour he spends at an empty rack and
counts none of it as worked" and "leaves the evening to the owner". Both fail on the old sampler.

### 8.2 Confirmed and fixed: 2.7's Done test asserted the formula against itself
(`tests/engine/staffWeek.test.ts`)

True. `summed === weekWorkedMinutes(meters)` was the same reduce twice and the efficiency line
re-typed the function's body, so the over-counting above passed green. The first test now pins the
meters to the engine's own count: an hour at the bench raises the jobs band by exactly the sixty
minutes `worker.productionMinutes` rose by, the other five bands never open, and the hours are the
bands. The efficiency assertion is written against `productionMinutes`, not against the formula.

### 8.3 Confirmed and fixed: the week was a second row, not a second line
(`src/ui/team.ts`)

True, and against "one game, one look": `.row` carries a border and `space-between`, so a man was
drawn with a rule between him and his own week and the two sentences were pushed to the two ends.
The game already has the second line, a `<small>` inside `.row-main` (`src/ui/contracts.ts`), and
that is what the week uses now: `teamRow` takes the week as its last argument and puts it inside
the man's own main span, with `data-team-week` on a wrapping span so the tests still find it. No
new class and no new rule.

### 8.4 Confirmed and fixed: the Technical tab printed a stranger's day
(`src/engine/tasks.ts`, `src/ui/team.ts`)

True. `estimatorCapacity` scales with the man's class, but the offer filled every figure with the
experienced man, so a workshop with a no experience estimator at the desk was sold Joinery Core
against 16 and 32 when his own day is 12 and 25. `joineryCoreOffer` works the figures out for the
estimator on the books (`deskEstimator`), falls back to the experienced man when the desk is empty,
and carries his name and his tier; the line reads `Take offs for Ed, no experience: 12 a day, 25
with Joinery Core`, or `Take offs for an experienced man` with nobody there. `minutesEach` is his
half hour at his own rate, so the two halves of the sentence agree. Test: a new `it` in
`tests/ui/team.test.ts`.

### 8.5 Confirmed as a fact, rejected as a change: Let go is drawn and the click is phase C's
(`src/ui/team.ts`)

The fact is true and this file said so before the review (7.1, and REPORT-T20.md with it): the
action, the reducer case and the route are three lines in `src/engine/types.ts`,
`src/engine/game.ts` and `src/ui/app.ts`, which are three of the six frozen files, and they are
written out for phase C in 1.1 to 1.3. The remedy the finding proposes, not drawing the button
until then, is rejected: 2.4 says Our team gets `Let go` on every worker's row, T20-C5 asks for
the picture of it, and a brief's control that the branch hides is a worse lie than one that waits
three lines. The engine behind it and its two tests are done. Phase C applies the three lines and
adds the click test named in 1.3.

### 8.6 Rejected: the eligible list test reads the table it is checking
(`tests/engine/estimatorSiteMeasure.test.ts`)

Half true, and not a defect. The assertions carry the literal roles 2.3.2 names, so the test fails
if `salesman` or `estimator` is taken off the table: that is a content check, not the tautology of
8.2, which compared a function with a copy of itself and could not fail. That `eligibleRoles` is
read by nothing but `rolesForTask` is true and is the brief's own doing: 2.3.2 asks for the
salesman on the list and asks for no screen that sends him. Giving `assignWorkerTask` an
eligibility gate would change who may be put on every other kind of task as well, which this brief
does not ask for and which section 6 of it would call a second rule about the same thing.

### 8.7 Rejected here, already noted: `createTask` sets the take off's own minutes
(`src/engine/tasks.ts`)

The override is deliberate and commented, and 2.1 above hands phase C both halves of the change:
point `src/engine/jobs.ts` at `takeOffMinutes` and delete the override in the same commit.
`src/engine/jobs.ts` is not mine tonight, and deleting the override on its own would put the old
price curve back into the one take off the game creates, which is exactly what 2.3 removes. One
half of a two file change is not the smallest correct change; it is a bug.

### 8.8 Confirmed, and it is a note: the Output sheet matches a line by the man's name
(`src/ui/company.ts`, `src/engine/machines.ts`)

True and reachable: `nameFor` gives a second Dave out once the twenty names are used and the crew
limit can pass twenty, and then `isAtADesk` takes the joiner Dave's line off the sheet with the
estimator Dave's. The line carries no id, and `src/engine/machines.ts` is B3's tonight, so 2.3
above is now written as the fix to apply and not as an alternative: filter at the source on the
role, delete `isAtADesk` and its call, and the name never comes into it.
