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

### Note 7 (a decision for Piotr, not a fix). The half hour with a spanner

2.9 says the new rule "replaces Turn 8's 30 minutes at 2%", and its four numbered points say what
a service now gives (the life), costs (a tenth), takes (a working day of the machine) and what
happens past the end of the life. **None of the four says the half hour of somebody's time goes**,
so B3 left it: the service is still the task `runServiceDue` raises and somebody works off, and
the four points are all true of it. The machine goes out for the working day from the moment the
service is done rather than the moment the button is pressed, which is half an hour apart.

If Piotr means the half hour to go as well, the change is three places in `src/engine/game.ts`,
and it is a decision and not a fix, so it is written here rather than applied:

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

With it, `TASK_DEFINITIONS.service` should lose its `eligibleRoles`, because a service task nobody
can work off must not offer a Start on the Tasks page.

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
- 2.14, the Machines column's `0 h`, which is B2's: `src/ui/company.ts` is theirs this phase.
- Nothing of 2.11 was left undone, and it wanted no note: the re-sort is the walker's own and the
  depth every drawable carries is written where the scene is built.
