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

**What else may move when it lands.** The helper sweeps about once a day now instead of once
every fifth day, 120 minutes of `CLEANING_MINUTES` a time, so any scenario that counts his
minutes or the day's dust may want re-measuring: `tests/engine/helper.test.ts`,
`tests/scenarios/turn17.test.ts` and `tests/scenarios/thirtyDays.test.ts`. What the note does to
each of them was measured before the note was written; the measurement is at the end of this
file, under "What was measured". Nothing else reads `HELPER_CLEAN_DUST_BAND`: it stays in
`constants.ts` for `tests/engine/helper.test.ts`, which reads it as the band it still is.

---

## 2. Numbers chosen

(see the end of this file)

## 3. CSS needed

(see the end of this file)

## 4. Names

(see the end of this file)

## 5. Tests changed

(see the end of this file)

## 6. What could not be done

(see the end of this file)
