# Notes, Turn 23, group B1: the men and the boss

Written by the B1 agent in its own worktree,
`/home/user/Woodwork-Empire/.claude/worktrees/wf_78302112-c21-1`, branch
`worktree-wf_78302112-c21-1`, off the phase A commit `cbc6403`.

Sections built: 2.1, 2.2 (the check only), 2.3, 2.4's behaviour, 2.13.

This file carries, for the lead: every change made **outside** the files section 3 of CLAUDE.md
gives this group, with the old text and the new; every decision the brief left open, with the
reason; and every figure chosen, with its [TUNE] tag.

The group's own files, where no old and new text is given below because the lead expects the
change: `src/engine/staff.ts`, `src/engine/production.ts`, `src/engine/jobs.ts`,
`src/engine/plan.ts` (not touched in the end), `src/ui/team.ts`, `src/ui/workPlan.ts`, the hire
cards (`src/ui/team.ts`), the efficiency breakdown and the person card.

---

## 0. The worktree was made off the wrong commit

The worktree arrived on `cd51383` ("tura 23"), not on the phase A commit `cbc6403` the task names.
`cbc6403` is a direct descendant of `cd51383` and the tree was clean, so the branch was
fast forwarded onto it with `git reset --hard cbc6403` before any work began. The baseline was then
measured and matched the task exactly: **exit 0, 210 test files, 2,063 passed, 1 todo**.

---

## 1. Changes outside this group's files

### 1.1 `src/engine/types.ts` (frozen since Turn 13; four additions)

**a. A man's own idle reasons.** 2.1 asks for his minutes to be "counted as idle on the day meter
with that reason", and nothing in the state held them: only the owner had `idleMinutes` and
`idleByReason`, from Turn 21's 2.8.

Added after `OwnerIdleReason`:

```ts
export type WorkerIdleReason = 'waitingForBoss' | 'noMachine' | 'noMaterial';
```

**b. The fifth bubble key.** Old:

```ts
export type BubbleKey = 'waitingForMachine' | 'noCutParts' | 'noMaterial' | 'nothingToDo';
```

New:

```ts
export type BubbleKey =
  | 'waitingForMachine'
  | 'noCutParts'
  | 'noMaterial'
  | 'nothingToDo'
  | 'waitingForBoss';
```

**c. Three fields on `Worker`**, after `dayLog`:

```ts
  idleMinutes: number;
  idleByReason: Record<WorkerIdleReason, number>;
  accidents: number;
```

**d. One field on `HiringOption`**, `duties: string`, so the hire card can print the spec's own
sentence (see 2.3 below).

**B2 must know:** 2.7 ("no bench work without air") wants a man's minutes booked idle with the
reason `no compressor`. The key is **not** in `WorkerIdleReason` above, because booking it is 2.7
and 2.7 is B2's. The whole change for it is two lines:

- `src/engine/types.ts`: add `| 'noCompressor'` to `WorkerIdleReason`.
- `src/engine/constants.ts`: add `{ id: 'noCompressor', label: 'No compressor' }` to
  `WORKER_IDLE_REASONS`.

and then one branch in `workerIdleReason` in `src/engine/production.ts`. Every `idleByReason`
literal in the tests is written out in full, so adding a key means adding it in the 33 fixtures
too; the one line script that did it for `waitingForBoss` is in section 4.

### 1.2 `src/engine/constants.ts` (phase A's file)

Added, all of them beside the family they belong to:

- `WORKER_IDLE_REASONS`, beside `OWNER_IDLE_REASONS`.
- `waitingForBoss: 'waiting for the boss'` in `BUBBLES`, and the comment over it says five lines
  where it said four.
- `MANAGER_AHEAD_DAYS`, `MANAGER_BEHIND_DAYS`, `MANAGER_REPLAN_MINUTES`, beside phase A's four
  manager tables. See section 3 for the figures.
- `WorkerIdleReason` added to the type import at the top of the file.
- The nine `duties` strings of `HIRING_SPECS` are rewritten: see 2.3 below.

### 1.3 `src/engine/owner.ts`

`managerOnDuty` was one function; it is three now, because machines.ts needs the manager's grade
for the breakdown line of 2.4 and machines.ts sits **below** staff.ts, which imports it. owner.ts
is the module with no engine imports below the clock, so it is the one place every layer can ask.

Old:

```ts
export function managerOnDuty(state: GameState): boolean {
  return state.workers.some(
    (worker) =>
      worker.role === 'productionManager' &&
      worker.startDay <= state.clock.day &&
      worker.absentDaysRemaining === 0,
  );
}
```

New: `managerOnDutyNow(state): Worker | null` with that body, `managerOnDuty(state): boolean`
reading it, and `managerTier(state): WorkerTier | null` reading it too. The type import gained
`Worker` and `WorkerTier`.

### 1.4 `src/engine/machines.ts` (B2's file)

One block added inside `outputBreakdown`, immediately before `const families = new Set(`:

```ts
  const tier = managerTier(state);
  if (tier !== null) {
    lines.push({
      label: 'Manager',
      points: roundPoints(PRODUCTION_MANAGER_PACE[tier] - 1),
      hall: false,
      where: 'the minutes of the men he carries',
    });
  }
```

with `PRODUCTION_MANAGER_PACE` added to the constants import and
`import { managerTier } from './owner';` added after the economy import. Nothing else in the file
is touched. **If this conflicts, the intent is one line of the sheet, not a factor on the hall:**
`hall: false`, so it is outside the hall's own total and nothing is multiplied twice.

### 1.5 `src/engine/tasks.ts`

Two lines inside `bookWeekMinutes`, so a man's idle minute is booked the way the owner's already
was in the same loop. Old:

```ts
      const band = bandOf(state, worker.taskId, worker.jobId);
      bookOne(state, worker, week, band, jobNameOf(state, worker.jobId));
```

New:

```ts
      const band = bandOf(state, worker.taskId, worker.jobId);
      const sample = bookOne(state, worker, week, band, jobNameOf(state, worker.jobId));
      if (sample !== null && !sample.worked) bookWorkerIdleMinute(state, worker);
```

and the import on line 52 becomes
`import { bookOwnerIdleMinute, bookWorkerIdleMinute } from './production';`.

### 1.6 `src/engine/bubbles.ts`

The last two lines of `bubbleFor` gained the waiting man. Old:

```ts
  if (who !== OWNER && contractOfWorker(state, who) !== null) return onAContract(who, station);
  return bubble(who, 'nothingToDo');
```

New: the same, then

```ts
  const worker = who === OWNER ? null : state.workers.find((entry) => entry.id === who) ?? null;
  if (worker !== null && waitsForTheBoss(state, worker)) return bubble(who, 'waitingForBoss');
  return bubble(who, 'nothingToDo');
```

and `import { isWorkingToday, waitsForTheBoss } from './staff';`.

### 1.7 `src/engine/migrate.ts`

Three lines inside `liftToVersion20`, in the loop phase A already wrote:

```ts
    worker.idleMinutes = 0;
    worker.idleByReason = { waitingForBoss: 0, noMachine: 0, noMaterial: 0 };
    worker.accidents = 0;
```

and two bullets added to the comment over the function. Phase A's own lines are untouched.

### 1.8 `src/engine/game.ts`

Two calls added in `settle`, after `autoAssignJobs(state)` and before `updateStations(state)`:

```ts
  managerReplans(state);
  ownerTakesAJob(state);
```

with `ownerTakesAJob` added to the `./production` import and `managerReplans` to the `./staff`
import. **The order matters and is the intent:** the men are served first, so with a manager on
duty the crew take what there is and the owner takes what is left over.

### 1.9 `src/ui/app.ts`

The `personCard` modal, in the six tables a modal lives in (`ModalId`, `Ui`, `freshUi`,
`MODAL_TITLES`, `MODAL_IS_FULL`, `MODAL_IS_WIDE`) and in `renderModalBody`; `modalTitleOf` gained
a branch so the head is the man's own name and trade; `openPersonCard(who)` beside
`openMachineCard`; three cases in `handleAction` (`openPersonCard`, `openPersonAssign`,
`openOffice`); two blocks in `handleSceneClick` for `data-worker` and `data-owner`; and the scene
selector widened.

The scene selector is the one line that could bite. Old:

```ts
  const scene = dataElement(target.closest('[data-van],[data-kit],[data-door]'));
```

New:

```ts
  const scene = dataElement(
    target.closest('[data-van],[data-kit],[data-door],[data-worker],[data-owner]'),
  );
```

`data-worker` and `data-owner` are hooks the hall has drawn on every figure since Turn 19; nothing
new is drawn for this. A click on a figure inside a MODAL cannot reach here: `handleAction` runs
first and returns whenever the click found a `data-do`, and every `data-worker` in a modal is on a
control that has one.

### 1.10 `src/ui/modal.ts`

One line in `MODAL_SKINS`: `personCard: 'folder'`, which is the machine card's own skin, as 2.13
asks. This is what puts the card in `tests/ui/popovers.test.ts`'s census, so it is covered by the
cross, Escape and the click outside without a line of its own.

### 1.11 `src/ui/styles.css`

94 lines added at the end of the file, one block, headed with the section number. **No new colour,
font, radius or shadow token**: the two new segment classes read `var(--good)` and `var(--bad)`,
and the capsule placeholder reads `var(--worker)`, all three of them already on `:root`. The new
classes are `.person-column`, `.person-tile`, `.person-body`, `.person-portrait`,
`.person-portrait.is-capsule`, `.person-chips`, `.person-now`, `.person-day`, `.person-figures`,
`.person-wage`, `.person-rule`, `.person-actions`, `.seg-worked` and `.seg-stood`. The last two sit
beside `.seg-idle` of Turn 21, which is the grey the dinner hour is drawn in here as well.

`git diff main --stat -- src/ui/styles.css` is therefore 94 insertions and 0 deletions, all of them
classes.

### 1.12 New file: `src/ui/personCard.ts`

The whole of 2.13's drawing. It exports `renderPerson(state, who, view)` (the one function that
draws both the tile and the card), `renderOurTeam`, `personCardTitle`, `isPerson`, `portrait`,
`workerDoing` and `NEEDS_A_JOB`.

`workerDoing` and `NEEDS_A_JOB` **moved here out of `src/ui/team.ts`**, because the tile, the card,
the crew column of the Work Plan and the crew rows of the trade tabs must all say the same sentence
about the same man, and team.ts already imports this file for `renderOurTeam`, so the arrow can
only point one way. `src/ui/workPlan.ts` imports them from here now:

```ts
import { NEEDS_A_JOB, workerDoing } from './personCard';
import { ROLE_WORDS } from './team';
```

### 1.13 New test files

`tests/engine/waitsForTheBoss.test.ts` (8), `tests/engine/ownerTakesAJob.test.ts` (7),
`tests/engine/managerGrades.test.ts` (15), `tests/ui/personCard.test.ts` (10).

---

## 2. Decisions the brief left open

### 2.1 Who the manager carries: not himself

2.4 says "the men on the books, the owner not counted, in the order they were hired". Read to the
letter that includes the manager, who is on the books. He is **excluded**, for two reasons: a
manager does not manage himself, and phase C's scenario (nn) is "nine men and a novice: the ninth
waits every day". A novice carries eight; with nine joiners and the manager counted, the eighth and
the ninth would both wait, and the brief says it is the ninth.

### 2.2 The Work Plan's crew column is a `.card` and not a new layout

2.1 says "the Work Plan shows him in the crew column as `needs a job`". There was no crew column:
the Jobs tab is rows of jobs and nothing else. It is built as a `.card` at the head of the Jobs
tab, `data-plan-crew-column`, one `.row` per man with `data-plan-crew="<id>"`. On the board skin a
`.card` is already paper on steel, so **no CSS at all was added for it** and the column wears the
look every other block of that modal wears.

### 2.3 The hire card reads the spec, and the spec's words are the card's old words

Phase A found that the card printed `DUTIES[option.role]` out of a table in `src/ui/team.ts` and
that `HiringSpec.duties` was read by nothing, and handed the decision here. One code path is the
rule, so **the spec wins and `DUTIES` is deleted.**

To keep the change 1:1 with the brief, the nine sentences were moved the other way: the spec's
`duties` now holds the words that were on the card, so **no card's words change except the
manager's four**, which are `productionManagerDuties(tier)`, 2.4's own sentence. What was lost is
the spec's old per tier line ("Production at 0.60 of the owner speed"), which nothing rendered and
whose figure the card already prints on its own line as "60% of your speed".

### 2.4 The grade chip says TIER_WORDS, not the mockup's engine key

`docs/mockups/t23/team-cards.png` writes the grade chip as `novice ×0.6`. The game has called that
man **"no experience"** since Turn 21's 2.9, and `tests/ui/tierWords.test.ts` is the rule that the
words of a grade are `TIER_WORDS` and never Claude's own; CLAUDE.md 3 says plain English and never
the engine key. The chip therefore reads `no experience ×0.60`. The multiplication sign is `×`
(U+00D7), which is the one the rest of the game uses (`Owned × 2`, `.assign-off`). The two decimals
are the rate's own, so the excellent man reads `×1.20` and not `×1.2`.

### 2.5 A man's worked minutes for the day bar

The owner keeps two counters of his own and they are read straight. A man on the books keeps only
the minutes he stood (`idleMinutes`), because `worker.minutesWorked` is his TASK minutes and his
bench minutes are in `productionMinutes`, which never goes back to nought. So his worked minutes
are what is left of the day that has run once the dinner hour and the standing are taken out of it.
That is the same invariant the owner's own booking holds to. The one function is `dayMeterOf` in
`src/engine/staff.ts`, and both the tile and the card read it.

### 2.6 `nothingAssigned` had to be re read, or 2.3 would have killed it

2.3 says the owner's idle reason `nothingAssigned` "only fires when there is work he cannot take".
It was read off `oldestReadyJob`, which asks for a job at stage `ready`. From tonight a ready job
with nobody on it is one the owner takes within the minute, and a job he cannot take is one already
**in production** in somebody else's hands, so the old reading would have left `nothingAssigned`
unreachable. `ownerIdleReason` now reads a new selector `workIsAbout(state)` in `src/engine/jobs.ts`,
which counts a job at `ready` or `inProduction`. `officeEmpty` is untouched.

### 2.7 The accident count is a new field, because nothing held it

2.13 asks the card to print `accidents: 0`. Nothing in the state counted a man's accidents:
`hurtWorker` raises an event and sets his days off and that is all. Rather than print a fake nought,
`Worker.accidents` was added, raised in `hurtWorker`, seeded at 0 on hire and backfilled to 0 in the
lift. **This is one field beyond section 4's list** and the lead should know it.

### 2.8 The card's Assign opens the Work Plan

2.13 says Assign is "the list of Turn 19". That list, `assignList` in `src/ui/jobCard.ts`, is a
popover anchored to a JOB row and asks "who goes on this job"; there is no list anchored to a man.
The card's Assign therefore shuts the card and opens the Work Plan on its Jobs tab, where every job
row carries its Assign chips. Nothing is dispatched: the click is free, as 2.1 requires, and the
player makes the choice. A per man list would have been a second list doing the same work.

---

## 3. Every figure chosen, with its tag

Three, all in `src/engine/constants.ts` beside phase A's manager tables. Everything else in this
group is Piotr's own and carries [PIOTR] in the code where phase A put it.

| name | value | tag | why |
| --- | --- | --- | --- |
| `MANAGER_AHEAD_DAYS` | 1 | [TUNE] | Working days of slack a job must be projected to have before the master will take a man off it. One day is the case the brief's own test names ("the master's move once a job is a day behind and another a day ahead"), and a whole day is what stops him swapping a man every hour over a projection that moved by a minute. |
| `MANAGER_BEHIND_DAYS` | 1 | [TUNE] | The same the other way: working days past its deadline a job must be projected to land before he will put that man on it. |
| `MANAGER_REPLAN_MINUTES` | 60 | [TUNE], from PIOTR's "at every hour he re plans" | How often the master looks at the board again. |

Both gaps are read off the work plan's own axis (`PlanRow.duePoint - PlanRow.to`), so the master
uses the same projection the player is looking at and no second one of his own.

---

## 4. Figures that moved, for the report

Measured on this build, each one changed to what the game now does and never weakened.

**`tests/scenarios/thirtyDays.test.ts`, the short handed month's lowest running balance: -386 to
-439.** Nobody takes a job by himself any more, and the scripted owner makes the boss's round once,
at the start of the day (`assignFreeMen` in `tests/scenarios/autopilot.ts`). A job that comes ready
at eleven o'clock is therefore picked up the next morning instead of the same minute, and about half
a day of the month's work slips with it. It was -466 before Turn 23 and -386 after phase A took the
canteen seats out. It still never reaches the overdraft limit and nothing is left unpaid.

**`tests/engine/staffSecondShift.test.ts`, the night rate: `0.552` to `0.552 x 1.05`.** The night
men carry the manager's pace as the day men do: he runs that shift and the men on it are men he
carries. The assertion now names the three factors instead of two.

**No other scenario figure moved at all**, which was checked by running the whole of
`tests/scenarios` at every commit. In particular 2.3 moved nothing: the scripted owner already
pressed Work here every minute his hands were empty, so the engine now does for him what the script
was doing for itself.

The thirty day figures in the header comment of `tests/scenarios/thirtyDays.test.ts` were read and
none of the others needed restating.

The one line that fixed the 33 test fixtures when `Worker` gained its fields, kept here because B2
will want it if `noCompressor` is added:

```python
# for every line whose strip() is 'monthDaysOff: 0,', insert the new fields after it at the
# same indentation, over every .ts file under tests/
```

---

## 5. What is NOT done, and why

- **`weekEfficiency` in `src/engine/staff.ts` is now dead in `src`.** It was read only by the
  accountant's week line of Turn 17, which 2.13 deletes. The function, its export and its engine
  tests are left alone: 2.13 removes the LINES, not the week meters, and deleting an engine
  selector is outside this brief. The lead may want to park it for a later turn.
- **`weekLine`, `weekText`, `teamRow`, `ourTeamRows`, `letGoControl`, `startedText`, `hoursText`
  and `OWNER_START_DAY` are deleted from `src/ui/team.ts`**, with a comment in their place saying
  where they went. `.team-row`, `.team-when` and `.team-week` in the stylesheet are now unused;
  they were left in place rather than removed, because taking a class out of the stylesheet is a
  change to a file this brief tells three agents to keep their hands off, and an unused class costs
  nothing. The lead may sweep them in phase C.
- **`grep -rn "staffManagement" src tests` is not empty**, and cannot be. Section 7's cross check
  asks for nothing, but 2.2's own migration has to name the kind in order to strip it
  (`src/engine/migrate.ts:555`) and `tests/engine/tasks.test.ts:130` asserts the kind is gone by
  naming it. Those two, and the v19 save fixture in `tests/cloud/migrate.test.ts:710`, are every
  hit. Nothing in the UI, the task list, the day meters or the team page mentions it. This is the
  honest reading of 2.2's own "nothing but the migration".
