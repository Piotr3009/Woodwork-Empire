# B3, the hall: the notes for phase C

Turn 20, phase B, group B3 (sections 2.8, 2.9, 2.10, 2.11, 2.12, 2.13). Everything below is
either a change B3 was not allowed to make (the six frozen files, and the two engine files that
belong to B2 this phase) or a figure, a class or a name phase C has to know about.

---

## 1. Notes for the frozen files

### Note 1. `src/engine/game.ts`, `runHelperClean`: the helper answers the dirt the player sees

**Why.** The diagnosis of 2.8, written out in REPORT-T20.md: the hall paints one pile of sawdust
for every ten points of dust, so the floor is dirty to the eye from 5 points, and
`runHelperClean` waits for the messy band, which starts past 40. Between the two the player sees
dirt and the helper is given nothing to do. It is cause (c) of the four the brief lists.

**The file.** `src/engine/game.ts`, the function `runHelperClean` (it sits just after
`runAccidentRoll`).

**Old text** (one line, the last guard of the function):

```ts
  if (!dustAtLeast(state.dust, HELPER_CLEAN_DUST_BAND)) return;
```

**New text:**

```ts
  if (!hallLooksDirty(state.dust)) return;
```

**And the imports with it,** or `tsc` fails on two unused ones:

- In the `import { ... } from './constants';` list at the top of `game.ts`, delete the line
  `  HELPER_CLEAN_DUST_BAND,`. `HELPER_CLEAN_WEEKDAY` on the line above it stays: the Friday
  clean is untouched.
- In the `import { ... } from './machines';` list, delete the line `  dustAtLeast,` and add
  `  hallLooksDirty,` in its alphabetical place (between `has` and `hasCentralExtraction`, or
  wherever the list's own order puts it). `dustAtLeast` has no other caller in `game.ts`; it
  stays exported from `machines.ts` and `tests/engine/helper.test.ts` still reads it.

`hallLooksDirty` is exported from `src/engine/machines.ts` (B3's file, T20-B3b). It is the
renderer's own count of piles: `sawdustPiles(dust) > 0`, and `src/render/hall.ts` draws exactly
that many piles, so the dirt the player sees and the dirt the helper answers are one figure.

**The test that proves it.** `tests/engine/helperDirtyHall.test.ts`, which is a characterisation
test until this note lands. Flip these three, and the comment at the head of the file with them:

- `it('leaves a hall that dirties at 10:00 dirty when the men go home')`: rename it to
  `leaves a hall that dirties at 10:00 clean by the time the men go home`, and the three
  expectations marked FLIP become
  `expect(evening.tasks.some((task) => task.kind === 'cleaning' && task.done)).toBe(true);`,
  `expect(pilesDrawn(evening)).toBe(0);` and `expect(evening.dust).toBe(0);`.
- In `it('is not the lorry, not his day and not the owner s queue that stops him')`, the FLIP
  line `expect(theHelper(atTen).taskId).toBeNull();` becomes
  `expect(theHelper(atTen).taskId).not.toBeNull();` after one more minute of the clock (the
  cleaning is raised in `settle`, so read it from `runClock(atTen, 2)`).

**What else moves when it lands, measured and not guessed.** The note was applied on a scratch
copy of this tree and the whole suite was run against it. Two test files move and no others:
`tests/engine/helperDirtyHall.test.ts`, whose flips are written out above, and

- `tests/engine/machines.test.ts`, the test
  `is swept by the helper the moment the hall stops being clean, at no cost to the owner`, its
  last dust assertion:

```ts
    expect(
      friday.tasks.some((task) => task.kind === 'cleaning' && task.label === 'Weekly clean'),
    ).toBe(true);
```

  becomes

```ts
    expect(friday.tasks.some((task) => task.kind === 'cleaning' && !task.done)).toBe(true);
```

  with a line of comment saying why: the sweeping is raised the moment there is dirt on the floor
  now, so by Friday morning one of his is usually open already, `ensureTask` finds it and keeps
  its own label, `Sweep the hall`. The Friday clean still happens and is still his, which is what
  the test is about; the label is not. (This assertion is true today as well, so phase C can apply
  it with the note or before it.)

With those two, `npm run check` was **exit 0, 176 test files, 1,759 tests and one todo** on the
scratch copy. Nothing in `tests/scenarios` moved, and the helper's own file
`tests/engine/helper.test.ts` did not move either: the hall it leaves clean it still leaves clean.
Nothing else reads `HELPER_CLEAN_DUST_BAND`: it stays in `constants.ts` for
`tests/engine/helper.test.ts`, which reads it as the band it still is.

### Note 2. `src/engine/tasks.ts` (B2's this phase): nothing to do for the bags, and why

2.8.1 asks for "`bagChange` gains him as an autoRole". **There is no `bagChange` any more**: the
kind was renamed `emptyBags` (the v18 lift in `src/engine/migrate.ts` still drops the old one),
and `TASK_DEFINITIONS.emptyBags` has carried `autoRoles: ['helper']` since Turn 12. `raiseBagsFull`
in `game.ts` already delegates instead of asking the owner while `helperOnDuty` is true. So the
role line is already what the brief asks for and **no change is wanted in `tasks.ts`**; the
assertion that says so is in `tests/ui/helperBags.test.ts`
(`empties them without the owner being asked`). The chip is the half that was missing and it is
built.

### Note 3. `src/engine/tasks.ts` (B2's this phase): one selector for the man on a job of work

`cleanerAtWork(state)` in `tasks.ts` is "the man who has the one open cleaning in his hands", and
the bags chip of 2.8.1 wants exactly the same question asked of `emptyBags`. B3 could not edit
`tasks.ts`, so `manOnOpenTask(state, kind)` is written in `src/render/hall.ts`, just above
`hallProblems`, and the bags chip calls it. **Phase C should fold the two into one.** The tidy
shape:

- In `src/engine/tasks.ts`, rename `cleanerAtWork`'s body into
  `export function manOnOpenTask(state: GameState, kind: TaskKind): Worker | null` (the body is
  the same, with `entry.kind === kind` in place of `entry.kind === 'cleaning'`), and leave
  `export function cleanerAtWork(state: GameState): Worker | null { return manOnOpenTask(state, 'cleaning'); }`
  so nothing that reads it today changes. Export `manOnOpenTask` from `src/engine/index.ts` beside
  `cleanerAtWork`.
- In `src/render/hall.ts`, delete the local `manOnOpenTask` and its doc comment and import the
  engine's one beside `cleanerAtWork`.
- The test that proves it is the one that is there:
  `tests/ui/helperBags.test.ts > says Dave is emptying the bags, with no button, once he has them
  in hand`, plus `tests/ui/hallChips.test.ts`'s cleaning chip, which must keep saying
  `Dave is cleaning it`.

### Note 4. `src/engine/constants.ts`: the service costs a tenth [PIOTR]

**The file.** `src/engine/constants.ts`, the line after the comment
`/** [TUNE] the service bill, and what an overdue machine risks every working day. */`.

**Old text:**

```ts
export const SERVICE_COST_FRACTION = 0.02;
```

**New text:**

```ts
/** [PIOTR, 18.09] A service is a tenth of what the machine cost (CLAUDE.md T20 2.9.2). It was 2%
 *  from Turn 6 to Turn 19. */
export const SERVICE_COST_FRACTION = 0.1;
```

(the `[TUNE]` comment above it then covers `OVERDUE_BREAKDOWN_CHANCE` alone, so it reads
`/** [TUNE] What an overdue machine risks every working day. */`.)

**The test that proves it.** `tests/engine/serviceRule.test.ts` reads the constant and never the
figure, so it is green either side of this note; after it,
`serviceCostFor({ purchasePrice: 1800 })` is 180 and the day 1 saw's Service button on the
Machines page reads £180 instead of £36. Nothing else reads `SERVICE_COST_FRACTION`.

### Note 5. `src/engine/index.ts`: the service rule's own selectors

`src/ui/machinesPage.ts` reads four of them straight out of `src/engine/machines.ts`, the way
`src/ui/catalogue.ts` reads `serviceDueIn`, because the index is frozen tonight. Phase C should
put them on the index beside the machine selectors that are already there (`serviceCostFor`,
`serviceIsDue`, `familyStopped`), and the page can then read them from `../engine/index` like
everything else:

```
  hallLooksDirty,
  hoursPastLife,
  lifeAfterServices,
  machineIsOut,
  machinesInService,
  originalLifeOf,
  sawdustPiles,
  serviceCallCheck,
  weeksPastLife,
```

and the three constants `DUST_PER_SAWDUST_PILE`, `PAST_LIFE_WEEK_HOURS` and
`SERVICE_LIFE_EXTENSION`, which phase C is moving into `constants.ts` anyway (section 2 below).

### Note 6. `src/engine/jobs.ts`, `hallBlock`: the word for a machine that is away

`familyStopped` in `machines.ts` now answers `'service'` as well as `'broken'` and `'bags'`, so
the stage stops the same way for a machine that is away being serviced. `jobs.ts` is nobody's file
this phase, so it still prints the broken sentence for it. The line, at the end of `hallBlock`:

**Old text:**

```ts
  if (stopped.why === 'bags') return 'bags full';
  return `${(findSpec(stopped.item.specId)?.name ?? 'a machine').toLowerCase()} is broken`;
```

**New text:**

```ts
  if (stopped.why === 'bags') return 'bags full';
  const machine = (findSpec(stopped.item.specId)?.name ?? 'a machine').toLowerCase();
  // A machine away being serviced stops the stage the way a broken one does, and the card says
  // which of the two it is (CLAUDE.md T20 2.9.3).
  if (stopped.why === 'service') return `${machine} is in for a service`;
  return `${machine} is broken`;
```

**The test that proves it.** `tests/engine/serviceRule.test.ts` asserts
`familyStopped(state, 'tableSaw')` is `{ why: 'service' }` while the saw is out; add to it, or to
`tests/engine/jobs.test.ts`, that `hallBlock` of a job at the cutting stage then reads
`table saw is in for a service`.

### Note 7 (REQUIRED, raised from an open question by the review). `src/engine/game.ts`: the service is called in

**Why it is required and not a question.** 2.9.2 says the service "costs a tenth of the machine's
value, **paid when called**" and 2.9.3 says "the machine is **out for one working day from the
call**", and 2.9's own preamble says the rule "replaces Turn 8's 30 minutes at 2%". B3 first read
the four numbered points as silent about the half hour and left the Turn 8 task in place; that
reading does not survive the two words "the call". As the code stands, the Machines page's
`Service, £180` button raises a task and starts it, and `pay` and `serviceMachine` only run in
`applyTaskCompletion`, so the press costs nothing at the minute it is pressed, the machine goes on
cutting, and with nobody free the service never happens at all while the row goes on naming its
price. The button must pay and put the machine out in the same minute.

**Why B3 did not do it.** `src/engine/game.ts` is one of the six frozen files, and every one of
the three places is in it.

**The change, three places in `src/engine/game.ts`:**

1. a new helper beside `runServiceDue`:

```ts
/** The service called in: paid at the call, the machine out for the working day, and the reminder
 *  off the list (CLAUDE.md T20 2.9). The one path, for the event's choice and for the button. */
function callServiceIn(state: GameState, equipmentId: string): void {
  const machine = state.equipment.find((item) => item.id === equipmentId);
  if (!machine || !serviceCallCheck(state, machine.id).ok) return;
  const name = findSpec(machine.specId)?.name ?? machine.specId;
  pay(state, 'repair', `${name} service`, serviceCostFor(machine));
  serviceMachine(state, machine.id);
  for (const task of state.tasks) {
    if (task.kind !== 'service' || task.equipmentId !== machine.id || task.done) continue;
    task.done = true;
    task.doneDay = state.clock.day;
    if (state.owner.currentTaskId === task.id) state.owner.currentTaskId = null;
    for (const worker of state.workers) if (worker.taskId === task.id) worker.taskId = null;
  }
}
```

2. `case 'SERVICE_MACHINE':` in `applyAction` becomes
   `callServiceIn(next, action.equipmentId); break;` (the `ensureTask` and `startTask` lines go);
3. `case 'service':` in `applyTaskCompletion` is deleted, and `runServiceDue`'s event offers
   `{ id: 'service', label: `Call it in, ${formatMoney(serviceCostFor(machine))}` }` and
   `{ id: 'later', label: 'Leave it' }` in place of `adHocChoices(...)`, with `case 'serviceDue':`
   taken out of the `bagsFull`/`machineBroken` group in `resolveEvent` and given its own
   `if (choiceId === 'service') callServiceIn(state, String(event.data.equipmentId));`.

With it, `TASK_DEFINITIONS.service` should lose its `eligibleRoles` (`src/engine/tasks.ts`),
because a service task nobody can work off must not offer a Start on the Tasks page.

**The test that proves it.** An app test, `tests/ui/machineService.test.ts` (B3's own name space,
so phase C may write it there): open the Machines page on a hall with a saw, read the cash and
click the row's `Service` button once; in the same minute `state.cash` has fallen by
`serviceCostFor(saw)`, `saw.inServiceUntilDay` is `nextWorkingDay(state.clock.day)`,
`saw.serviceCount` is 1, and `state.tasks` has no open `service` task for it. And in
`tests/engine/serviceRule.test.ts`, the day the call costs is already measured
(`what the day costs when the machine goes out`); it will read the same after this note, because
it calls `serviceMachine` itself.

**What moves when it lands.** `tests/scenarios/autopilot.ts` answers the `serviceDue` event with
`later` and keeps the scripted owner off a `service` task until the last hour of the day (section 5
below); with this note the event's choices become `service` and `later`, so the `later` line stands
as it is and the `nextTask` guard has nothing left to guard, because there is no service task to
take. Phase C should run the three month playthrough after applying it.

### Note 8. `src/engine/game.ts`, `canSell`: a rack goes when it is empty and nobody is at it

2.10 lets `isSellableFamily` take the storage, which is `machines.ts` and is done. The two
refusals that come with it, the sheets on the rack and the man standing at it, belong in
`canSell`, which is in the frozen `game.ts`. Until this note lands the Owned tab reads the same
sentence itself (`sellAction` in `src/ui/catalogue.ts`), so the player is never offered a sale the
rule refuses; what is missing is the engine's own guard behind the button.

**The file.** `src/engine/game.ts`, `canSell`, the last two lines of it.

**Old text:**

```ts
  if (item.takenBy !== null) return { ok: false, reason: 'Somebody is standing at it' };
  return OK;
```

**New text:**

```ts
  if (item.takenBy !== null) return { ok: false, reason: 'Somebody is standing at it' };
  // A rack goes when it is empty and nobody is at it (PIOTR, 18.09; CLAUDE.md T20 2.10). The one
  // sentence: the Owned tab prints this very string.
  const storage = storageSaleBlock(state, item);
  if (storage !== '') return { ok: false, reason: storage };
  return OK;
```

**And the import:** `storageSaleBlock` joins the existing
`import { STATION_IDLE, STATION_NO_BENCH, stationForTask } from './stations';` at the top of
`game.ts`. With it in, `src/ui/catalogue.ts` can drop its own call and its comment and let
`canSell` answer, which is the tidier end state.

**The test that proves it.** `tests/engine/rackSale.test.ts`: add to
`it('will not go while it holds sheets, and says how many are on it')`

```ts
    expect(canSell(state, rack.id)).toEqual({
      ok: false,
      reason: 'Empty it first, 24 sheets on it',
    });
```

and the same for the man at the rack.

### Note 9 (housekeeping, not a fix). `src/ui/app.ts` and the door driver

`src/render/doors.ts` no longer swings anything: a door is drawn closed and the file's job is the
door's bookkeeping, who is through one and how many men have gone in or out. Its three exports
`resetDoors`, `syncDoors` and `stepDoors` are unchanged in name and in shape, so the frozen
`src/ui/app.ts` needed no note: it calls them where it always did and they now keep the count the
hall reports through `hallOneShots`. Nothing is wanted from phase C here; this note is so that a
reader of `app.ts` knows the calls changed meaning.

Two constants in `constants.ts` are left with no reader by 2.12 and 2.13: `DOOR_SWING_MS`,
`DOOR_CLOSE_MS` (the swing) and `STAND_IN_GAIN` (the synthesised sound). They are Piotr's figures
for things the game no longer does. Phase C may delete them with the rest of the turn's tidying;
B3 left them, because `constants.ts` is frozen and an unread constant harms nothing.

### Note 10 (raised by the review). `src/ui/company.ts`: the Machines column says `0 h`

2.14 is one word, it is on the turn's cross check list, and the two halves of the brief put it in
two places: the task queue gives it to B3 (`T20-B3c 2.10 and 2.14`) and section 3 gives
`company.ts rows` to B2. `src/ui/company.ts` is not in B3's file list, so B3 did not touch it; this
note is here so that the word is nobody's assumption. Phase C: if B2's diff does not carry it,
apply it.

**The file.** `src/ui/company.ts`, the helper `hours`, just above `percent`.

**Old text:**

```ts
/** Hours as the board writes them: "12.5 h", and "none" for a machine nobody stood at. */
function hours(value: number): string {
  return value <= 0 ? 'none' : `${value} h`;
}
```

**New text:**

```ts
/** Hours as the board writes them: "12.5 h", and "0 h" for a machine nobody stood at, because a
 *  column of hours reads in hours (PIOTR, 18.09; CLAUDE.md T20 2.14). */
function hours(value: number): string {
  return `${value <= 0 ? 0 : value} h`;
}
```

**The test that proves it.** `tests/ui/company.test.ts`: the Machines column of a board whose
machines have stood idle reads `0 h` and the word `none` is nowhere in it.

### Note 11 (raised by the review). `src/engine/materials.ts`, `rackCapacity`: a rack that leaves tomorrow is not room

`sheetsStrandedBySale` in `machines.ts` now passes over a rack that is sold and waiting for the
buyer's van, so the last two racks cannot both be sold on the same day with the sheets still on
them. `rackCapacity` in `materials.ts` sums `sheetCapacityOf` over every entry of
`state.equipment` with no such filter, so a delivery can still be unloaded onto a rack that leaves
in the morning. `materials.ts` is B1's file this phase, so B3 left it.

**Old text:**

```ts
  for (const item of state.equipment) capacity += sheetCapacityOf(item);
```

**New text:**

```ts
  // A rack that is sold stands in the hall until the van comes, and it is no room: nothing is
  // unloaded onto a rack that leaves in the morning (CLAUDE.md T20 2.10).
  for (const item of state.equipment) {
    if (isSold(item) || !itemStandsInTheHall(item)) continue;
    capacity += sheetCapacityOf(item);
  }
```

with `isSold` joining the `from './machines'` import beside `sheetCapacityOf` and
`itemStandsInTheHall`.

**The test that proves it.** `tests/engine/materials.test.ts`: with the hall's only rack sold and
not yet collected, `rackCapacity` is 0 and `canUnload` is false.

---

---

## 2. Numbers chosen

| Figure | Value | Module | Tag and why |
|---|---|---|---|
| `DUST_PER_SAWDUST_PILE` | 10 | `src/engine/machines.ts` | [TUNE]. Not a new number: it is the ten `sawdust()` in `src/render/hall.ts` has divided the dust by since Turn 2, given a name so the piles drawn and the dirt the helper answers are one reading (2.8). Phase C moves it into `constants.ts` beside `DUST_BANDS`. |
| `SERVICE_LIFE_EXTENSION` | 0.5 | `src/engine/machines.ts` | [PIOTR, 18.09]. Half of the original life the first time and half of the last extension after that, which is 2.9.1 word for word. Phase C moves it into `constants.ts` beside `SERVICE_INTERVAL_HOURS`. |
| `PAST_LIFE_WEEK_HOURS` | `SERVICE_INTERVAL_HOURS / WEEKS_PER_MONTH`, 18.46 h | `src/engine/machines.ts` | [TUNE]. A week of a machine's own clock, for the doubling of 2.9.4. No new figure: 80 hours is the month a one man shop puts on a saw (T6 3.6) and `WEEKS_PER_MONTH` is the game's own week. |
| the doubling past the life | 2 | `overdueBreakdownChance`, `src/engine/machines.ts` | [TUNE, named in the brief]. The chance doubles for every whole week past the end and is capped at a certainty. The first week past the end is the Turn 8 chance unchanged. |
| `LIFE_LOW_FRACTION` | 0.1 | `src/ui/machinesPage.ts` | [PIOTR, 18.09: "red when under a tenth is left"]. The share of the life left at which the bar turns from good to bad. |
| `FIGURE_DEPTH_OFFSET` | 0.2 | `src/render/walkers.ts` | [TUNE]. Not a new number: it is the 0.2 `hall.ts` has painted a figure in front of his own cell with since Turn 16, given a name so the scene and the re-sort read one figure (2.11). |
| the machine is out until | `nextWorkingDay(day of the call)` | `serviceMachine`, `src/engine/machines.ts` | [PIOTR, the rule; TUNE, the reading]. "Out for one working day from the call" is read as: out from the call, back the next working day, the first service included (2.9.3 leaves that one open). |

## 3. CSS needed

Four rules, all of them modifiers on families that exist, all of them using tokens that exist. No
new colour, font, radius or shadow value. The Machines page renders and reads correctly without
them; what it does not do until they land is look small, green and red.

```css
/* The picture on a row rather than on a card: the same slot at a row's height (CLAUDE.md T20
   2.9). Goes beside .tile-picture, styles.css 1107. */
.tile-picture.is-small {
  height: 48px;
  margin: 0;
  width: 64px;
}

/* A life that is nearly run out (CLAUDE.md T20 2.9). Goes beside .contract-fill.is-full,
   styles.css 2966. */
.contract-fill.is-low {
  background: var(--bad);
}

/* The bar of a life on a laptop page: the track is the screen's own line and not the dark
   palette's border. Goes with the other .modal-screen rules, styles.css 3777 and after. */
.modal-screen .contract-track {
  background: var(--screen-line);
}

/* The Machines page's middle column: the bar with its figures under it (CLAUDE.md T20 2.9).
   Goes beside .contract-track, styles.css 2954. */
.machine-life {
  display: flex;
  flex: 1 1 140px;
  flex-direction: column;
  gap: 2px;
}
```

## 4. Names

| The brief says | The code says | Which was used |
|---|---|---|
| `bagChange` (2.8.1) | `emptyBags` (the task kind; `bagChange` is the pre v18 name the lift drops) | `emptyBags`. See note 2: its autoRoles already carry the helper. |
| "hours of life" (2.9) | `Equipment.enduranceHours`, and `enduranceHoursFor(specId, variantId)` for the life it left the shop with | `enduranceHours` is the life it has now, extensions and all, and `originalLifeOf(item)` is the life it was born with. The bar's total is `enduranceHours`, so it grows with each service, which is what 2.9.1 asks for. |
| "2,140 of 3,600 h" (2.9) | the Owned tab prints `0 h of 750 h` through its own `hours()` | The page prints the brief's own shape, `lifeFigures` in `src/ui/machine.ts`: the thousands separator of `formatMoney` and the unit once. The Owned tab was left as it is, because its line is asserted by `tests/ui/catalogueTabs.test.ts` and 2.9 is about the new page. |

## 5. Tests changed

- `tests/render/frameFallbacks.test.ts`: `playableAnimation('owner', 'sweep')` was
  `{ animation: 'idle' }` and is `{ animation: 'bench' }`, with the joiner asserted beside him.
  The brief changes it: 2.8.2 says a role with no sweep sheet falls to `bench`.
- `tests/render/hallRoom.test.ts`, `tests/render/views.test.ts`, `tests/ui/app.test.ts`,
  `tests/engine/phoneAndCancel.test.ts`: the brief changes them. 2.12 takes the owner off the hall
  while he is behind the office door, so Turn 19's `is never absent from the hall: he stands in the
  doorway` is now `is off the hall altogether while he is in the office`; the figure count test
  reads the bench in place of the office; the app's tenth minute asserts he is not on the hall
  while the books are on his desk; and the phone sheet is read off the office view, which is where
  he is playing it. The three door states of Turn 19 are one closed leaf.
- `tests/render/doors.test.ts` was the swing's own test and is rewritten around 2.12 and 2.13: the
  closed leaf, the walk to the door, the walker kept at the doorway so he walks out of it, the
  knock counted once in and once out, and a grep of `src/render` for `from '../ui/sound'`.
- `tests/ui/sound.test.ts`: the stand ins are gone (2.13), so the tests that heard one now assert
  silence, and the tests about what the hall plays are run against a fake that can decode, which
  is the day Piotr's recordings land. `withRecordings` in that file is the whole of the change.
- `tests/render/depthOrder.test.ts`, `tests/render/doors.test.ts`,
  `tests/render/helperSweeps.test.ts`, `tests/engine/rackSale.test.ts` and
  `tests/engine/serviceRule.test.ts` each gained a case in the review pass (section 7): the
  measurement of the re-sort, the estimator at the office door, the sweeping man's own label, the
  rack that is already sold, and the day a service costs. Nothing was weakened and nothing removed.
- `tests/scenarios/autopilot.ts`, the scripted player, **re-scripted and not re-measured**, the
  way REPORT-T17 re-scripted him for the hiring gate. Under 2.9.3 a service takes the machine out
  until the next working day, so the careful owner does not stop his only saw in the middle of a
  cut: `answer` leaves a `serviceDue` event with `later` instead of taking the spanner at once,
  and `nextTask` passes over a `service` task until `SERVICE_FROM_MINUTE`, the last hour of the
  day. Both are commented in the file. Without them the three month playthrough loses the one day
  its saw is serviced on, in the middle of month 2, and the seeded run that follows never earns
  the standing of 10 a production manager wants: the manager and the five days away both fall
  over, on a run that delivers the same 29 jobs as before. Nothing was weakened: every assertion
  of `tests/scenarios/playthrough.test.ts` stands as it was written.

## 6. What could not be done

- The one line of 2.8's fix, because it is in the frozen `src/engine/game.ts`. It is note 1.
- The service's tenth, because `SERVICE_COST_FRACTION` is in the frozen `src/engine/constants.ts`.
  It is note 4, and every line of code and every test reads the constant, so both values are true
  of the same code.
- The word a job card gives for a machine that is away being serviced, because `src/engine/jobs.ts`
  is nobody's file this phase. It is note 6. Until it lands the card says the machine is broken,
  which stops the stage in exactly the right way and calls it by the wrong name.
- The engine's own guard on selling a rack with sheets on it, because `canSell` is in the frozen
  `game.ts`. It is note 8, and the Owned tab already refuses it in the same words, so nothing in
  the game offers the sale.
- The service paid and the machine out at the press of the button, because all three places are in
  the frozen `game.ts`. It is note 7, which the review raised from an open question to a required
  change.
- The unload's own reading of a sold rack, because `materials.ts` is B1's file this phase. It is
  note 11.
- 2.14, the Machines column's `0 h`: `src/ui/company.ts` is not in B3's file list and section 3
  gives the company rows to B2, while the task queue gives 2.14 to B3. It is written out as note 10
  so that the one word is nobody's assumption, and phase C applies it if B2's diff has not.
- Nothing of 2.11 was left undone, and it wanted no note: the re-sort is the walker's own and the
  depth every drawable carries is written where the scene is built.

---

## 7. Review: the findings that stood

An adversarial reviewer read B3's diff and reported eight findings. Each was checked against the
code before anything was written. Five were confirmed and fixed in B3's own files, two were
confirmed as facts whose fix is in a file B3 may not edit and are now notes, and one was already a
note before the review.

**1. `src/render/hall.ts`, every desk worker vanishes (blocker). Confirmed and fixed.** It was
true and it was B3's: `stationForTask` sends a material take off, the books, an order, a drawing, a
site measure and a client call to the office or the phone for a worker as well as for the owner,
`stationCell` gives all of them the office doorway, and the skip at the worker loop took him off
the hall, while `officeFigure` starts `if (!ownerIsAvailable(state)) return '';` and draws nobody
but the owner. So an estimator on a take off was on neither picture. The fix is one predicate in
`src/render/doors.ts`, `figureGoesThroughDoors(key)`, which `figureIsThroughADoor` and `readDoors`
both ask: the owner goes through a door, because the office view draws the owner alone (one box,
`OFFICE_OWNER_BOX`, measured for him in T19 2.2), and everybody else stands at the doorway as he
did in Turn 19. The crew's places in the office are a drawing nobody has made, and nothing visual
is built without a mockup (PIOTR, 18.09), so widening the office view was not the fix; the day that
mockup lands, the predicate is the one line that changes. The test is in
`tests/render/doors.test.ts`, `draws the estimator at the doorway ...`: it fails on the code as the
reviewer read it (`expected ... to contain 'data-worker="staff-38"'`) and passes on the fix.

**2. `src/ui/machinesPage.ts`, the Service button neither pays nor takes the machine out.
Confirmed; it is note 7, now required.** The reviewer read 2.9.2 and 2.9.3 correctly: "paid when
called" and "out for one working day from the call" leave no room for the Turn 8 half hour, and
2.9's preamble says the rule replaces it. B3's first reading was too kind to the old path. Every
one of the three places is in the frozen `src/engine/game.ts`, so nothing could be applied here:
note 7 above is rewritten from "a decision for Piotr" into a required change, with the exact text
and with the app test phase C must add (`tests/ui/machineService.test.ts`).

**3. `tests/render/depthOrder.test.ts`, the sixty tick stability test measured nothing. Confirmed
and fixed.** `stepWalkers` ends with `resortFigures(root)`, so the test's own second call always
answered 0 whatever the first had done. `stepWalkers` now returns the count from its own re-sort
(`: number` in place of `: void`; every caller but a test ignores it, and `src/ui/app.ts` needed no
change), the fake clock's `tick` answers it, and the two tests accumulate that: the walk past the
saw moves him in the order on exactly one frame, two further frames standing still move nothing,
and the sixty quiet ticks move nothing, measured and not assumed.

**4. `src/engine/machines.ts`, `sheetsStrandedBySale` counted racks that are already sold.
Confirmed and fixed.** A sold rack stands in `state.equipment` until `collectSoldMachines` takes it
in the morning, so two racks could both be sold on the same day with the sheets still on them. The
sum now passes over `isSold(other)` and `!itemStandsInTheHall(other)`. The new case is in
`tests/engine/rackSale.test.ts`. The same hole in `rackCapacity` (`src/engine/materials.ts`, B1's
file) is note 11.

**5. `src/render/hall.ts`, a man sweeping was labelled "waiting". Confirmed and fixed.** 2.8.2 made
the cleaning its own station and `stationLabel` had no case for it, so the helper with a broom read
`Dave, waiting` for the two hours of `CLEANING_MINUTES`. It now reads `Dave, sweeping the floor`,
beside the bench's own line, and `tests/render/helperSweeps.test.ts` asserts the title.

**6. `src/ui/company.ts`, 2.14 not done. Confirmed as a conflict in the brief, written as note 10,
not edited.** The task queue gives 2.14 to B3 and section 3 gives the company rows to B2;
`src/ui/company.ts` is not in B3's file list and the phase rule is "anything else: a note, not an
edit". Note 10 carries the exact old and new text and the test, so the word is nobody's assumption.

**7. `tests/scenarios/autopilot.ts`, the re-script hides what 2.9.3 costs. Confirmed, and answered
in B3's own file.** `tests/scenarios` is not B3's, and the scripted player's deferral is honest
(a careful owner does not stop his only saw mid-cut). What was missing was a test that the day off
costs a day, and it is now in `tests/engine/serviceRule.test.ts`,
`stops the stage from the call to the end of the day, and the day s work with it`: four hours of a
cutting job with the saw on the floor moves the job on, the same four hours with the saw away moves
it not at all (`jobProgress` is exactly 0), `familyStopped` reads `service` at the end of them, and
the machine is still out. It would fail the day the day-out were dropped.

**8. `src/engine/jobs.ts`, a card says "broken" for a machine in for a service. Confirmed; it was
already note 6.** `src/engine/jobs.ts` is nobody's file this phase, so the sentence could not be
fixed here. What the review adds is the assertion the note asked for, written as a FLIP line in
`tests/engine/serviceRule.test.ts`: it asserts today's wrong word, `table saw is broken`, with the
note's number on it, so phase C can see the note land.
