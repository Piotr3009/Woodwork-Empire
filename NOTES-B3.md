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

---

## 2. Numbers chosen

| Figure | Value | Module | Tag and why |
|---|---|---|---|
| `DUST_PER_SAWDUST_PILE` | 10 | `src/engine/machines.ts` | [TUNE]. Not a new number: it is the ten `sawdust()` in `src/render/hall.ts` has divided the dust by since Turn 2, given a name so the piles drawn and the dirt the helper answers are one reading (2.8). Phase C moves it into `constants.ts` beside `DUST_BANDS`. |

## 3. CSS needed

Nothing yet: no new class has been used.

## 4. Names

| The brief says | The code says | Which was used |
|---|---|---|
| `bagChange` (2.8.1) | `emptyBags` (the task kind; `bagChange` is the pre v18 name the lift drops) | `emptyBags`. See note 2: its autoRoles already carry the helper. |

## 5. Tests changed

- `tests/render/frameFallbacks.test.ts`: `playableAnimation('owner', 'sweep')` was
  `{ animation: 'idle' }` and is `{ animation: 'bench' }`, with the joiner asserted beside him.
  The brief changes it: 2.8.2 says a role with no sweep sheet falls to `bench`.

## 6. What could not be done

- The one line of 2.8's fix, because it is in the frozen `src/engine/game.ts`. It is note 1.
