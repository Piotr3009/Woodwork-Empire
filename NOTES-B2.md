# NOTES-B2: the frozen files phase C has to open for the people (Turn 19, B2)

Everything here is a change B2 could not make, because the file is one of the six Turn 13 froze
(`src/engine/types.ts`, `src/engine/constants.ts`, `src/engine/index.ts`, `src/engine/game.ts`,
`src/ui/app.ts`, `src/ui/styles.css`) or belongs to another phase B agent. Each entry says the
file, the place and the code. Nothing here is written into those files by B2.

---

## 1. `src/ui/app.ts`: the Assign to this job list has no click route (CLAUDE.md T19 2.5)

Without this the chips draw, the list draws when it is asked for, and nothing on either can be
clicked in the running game. The engine actions (`ADD_TO_JOB`, `REMOVE_FROM_JOB`) and the render
(`renderWorkPlan(state, dropConfirm, assignOpen)`) are both in place already.

**(a) `UiState`, beside `dropConfirm` (about line 190):**

```ts
  /** The job whose Assign to this job list is open, or null. One list is open at a time, and a
   *  click on the button that opened it shuts it again (CLAUDE.md T19 2.5). */
  assignOpen: string | null;
```

**(b) the initial `ui` object, beside `dropConfirm: null` (about line 321):**

```ts
    assignOpen: null,
```

**(c) the render switch, `case 'workPlan'` (about line 443):**

```ts
      return renderWorkPlan(current, ui.dropConfirm, ui.assignOpen);
```

**(d) `runAction`, replacing the whole of `case 'assignJob'` and `case 'assignSecond'`
(about lines 1565 to 1572). Every one of them is a single click:**

```ts
    // The men on a job, and no limit on how many (PIOTR, 17.09; CLAUDE.md T19 2.5).
    case 'openAssign':
      ui.assignOpen = id;
      break;
    case 'closeAssign':
      ui.assignOpen = null;
      break;
    case 'assignAdd':
      ui.assignOpen = null;
      dispatch({ type: 'ADD_TO_JOB', jobId: id, workerId: element.dataset.worker ?? 'owner' });
      return;
    case 'assignOff':
      dispatch({ type: 'REMOVE_FROM_JOB', jobId: id, workerId: element.dataset.worker ?? '' });
      return;
```

**(e) with (d) in place, `tests/ui/app.test.ts` ("assigning work by hand") can go back to
clicking rather than asserting the markup. B2 left it asserting the markup and said so in the
report.**

---

## 2. `src/engine/types.ts` and `src/engine/game.ts`: the second man action is dead

`Job.assignedTo` and `Job.secondAssignee` are gone and `job.assignees` has no limit, so there is
no second man to name. `assignSecond` in `src/engine/jobs.ts` is now a shim over `addToJob` and
`takeOffJob` so that one old action still works and there is one code path; the three of them go
together:

- `src/engine/types.ts`, the `GameAction` union (about line 1182): delete
  `| { type: 'ASSIGN_SECOND'; jobId: string; workerId: string | null }`.
- `src/engine/game.ts` (about line 2121): delete `case 'ASSIGN_SECOND'`.
- `src/engine/game.ts` (about line 163): drop `assignSecond` from the re-export block.
- `src/engine/jobs.ts`: delete `assignSecond` (B2's file; left in place only so the frozen files
  still compile).
- `tests/scenarios/turn17.test.ts` dispatches `ASSIGN_SECOND` twice and would move to
  `ADD_TO_JOB`. That file is not B2's.

---

## 3. `src/engine/index.ts`: what the UI has to reach round the barrel for

`src/ui/jobCard.ts` imports `BUILDING_ROLES`, `canBuild` and `jobMen` straight off
`../engine/jobs`, and `OWNER` off `../engine/machines`, with the established
`// T13-C1: export from index.ts` marker (the convention `src/ui/team.ts` already follows for
`monthlyPay`). Export from `./jobs`: `BUILDING_ROLES`, `canBuild`, `jobMen`, `addToJob`,
`takeOffJob`. Export from `./staff`: `tradeFactor` (2.6). Export from `./tasks`: `cleanerAtWork`
(2.7). Then the module-path imports can be tidied back onto the barrel.

---

## 4. `src/ui/styles.css`: the ten rules phase A stubbed are still empty

The classes are used exactly as stubbed. Without rules the chips and the list draw as plain
blocks: correct markup, no look. Use the game's own tokens and not the mockup's literal hex. The
`.plan-head` the list hangs inside needs `position: relative` for the list to sit over the row.

```css
.plan-head {
  position: relative;
}

.assign-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.assign-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 6px 3px 10px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--panel-2);
  font-size: 13px;
}

.assign-chip .assign-off {
  width: 18px;
  height: 18px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--panel);
  color: var(--text-dim);
  font-size: 13px;
  line-height: 18px;
  cursor: pointer;
}

.assign-chip .assign-off:hover {
  background: var(--bad);
  color: #fff;
}

.assign-open {
  white-space: nowrap;
}

.assign-list {
  position: absolute;
  z-index: 2;
  left: 12px;
  right: 12px;
  margin-top: 6px;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--panel-2);
  box-shadow: 0 8px 24px rgb(0 0 0 / 35%);
}

.assign-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 4px 6px;
  border-radius: 6px;
}

.assign-row:not(.is-busy):hover {
  background: var(--panel);
}

.assign-row.is-busy {
  color: var(--text-dim);
}

.assign-row .assign-tier {
  color: var(--text-dim);
  font-size: 12px;
}

.assign-row .assign-why {
  color: var(--text-dim);
  font-size: 12px;
  white-space: nowrap;
}

.assign-none {
  color: var(--bad);
}
```

---

## 5. `src/engine/stations.ts` and `src/render/hall.ts`: the third man's cell (B1's files)

The engine now gives every man past the second a station string of his own,
`place:<equipmentId>:<n>`, where n is the place at that item: 0 is the operator's cell, 1 is the
waiting cell (a machine) or the second place (a bench), and 2 and beyond are the free cells along
the same side, one out at a time. Places 0 and 1 still use the old `machine:` / `waiting:` /
`second:` strings, so a one man or two man job renders exactly as it did.

`placeStation` and `stationPlaceAt` are written in `src/engine/production.ts` because
`stations.ts` is B1's tonight. **They belong beside `secondStation` in `src/engine/stations.ts`**;
moving them is a cut and paste and an import change in `production.ts`.

The renderer does not handle the new prefix yet, so a third man falls through `stationCell` to the
bench fallback and is drawn where the first man is. In `src/render/hall.ts` `stationCell`, before
the `second:` branch (about line 871):

```ts
  // The third man and beyond, at a place of his own along the same side (CLAUDE.md T19 2.5).
  const placeAt = stationPlaceAt(station);
  if (placeAt !== null) {
    const item = state.equipment.find((entry) => entry.id === placeAt.id && !isSold(entry));
    if (item) {
      const cells = item.specId === BENCH
        ? benchCellsAt(state, item, placeAt.place + 1)
        : queueCellsAt(state, item, placeAt.place + 1);
      const cell = cells[placeAt.place] ?? standingCell(state, item, 'operator');
      return { ...cell, facing: facingAt(cell, item) };
    }
  }
```

and in `stationLabel` (about line 926), beside the `second:` line:

```ts
  const place = stationPlaceAt(station);
  if (place !== null) return 'the bench, along the front';
```

and in `src/render/characters.ts` `animationForStation`, the `place:` prefix maps to `'bench'`
exactly as `second:` does.

B1's `queueCellsAt` / `benchCellsAt` were not in `src/engine/stations.ts` when B2 wrote this, so
B2 wrote no fallback in `production.ts`: the engine only ever needs the place index, and the cells
are the renderer's own business. Nothing in the engine calls either helper.

---

## 6. `src/engine/game.ts`: the second hand loop, for the sprayer (CLAUDE.md T19 2.6)

`src/engine/production.ts` `hands` and `workMinute` are the night shift's path and the one the
engine tests drive; `game.ts` carries a hand written copy of the same loop for the day, which the
Turn 13 phase C declined to fold (REPORT-T13.md 10). Without these three the sprayer sprays only
on the night shift and looks dead in play.

- `game.ts` `handsAtWork` (about line 1534):
  `if (worker.role !== 'joiner' || worker.jobId === null) continue;` becomes
  `if (!BUILDING_ROLES.includes(worker.role) || worker.jobId === null) continue;`, importing
  `BUILDING_ROLES` from `./jobs`.
- `game.ts` `possibleSeats` (about line 1569): the same widening. This one is a silent wrong if it
  is missed while the first is applied: it is the efficiency denominator and `tallyEfficiency`
  clips with `Math.min(worked, possible)`, so the day's Efficiency would read low with no cause
  line.
- `game.ts` `runProductionMinute` (about line 1678):
  `const minute = labourPerMinute(hand.rate, speed) * hall;` becomes
  `const minute = labourPerMinute(hand.rate * tradeFactor(worker?.role ?? null, stage.family), speed) * hall;`,
  importing `tradeFactor` from `./staff`. Without it the day ignores 2.6's rates entirely.

---

## 7. `src/render/hall.ts` and `src/ui/app.ts`: the cleaning chip (CLAUDE.md T19 2.7)

The engine half is done: the cleaning task is created by the hall itself, the helper takes it, and
`cleanerAtWork(state)` in `src/engine/tasks.ts` says who is sweeping this minute. The chip still
reads "The hall is dirty, somebody will get hurt in this" and still carries a Clean up button
while the helper has it in hand.

**(a) `src/render/hall.ts`, `interface HallProblem` (about line 1666): one optional field.**

```ts
  /** Somebody is already on it, so the chip is a statement and not a question (T19 2.7). */
  inHand?: boolean;
```

**(b) `src/render/hall.ts`, `hallProblems`, the dust branch (about lines 1737 to 1745):**

```ts
  const band = dustBand(state.dust);
  if (band.label !== 'clean') {
    const cleaner = cleanerAtWork(state);
    if (cleaner !== null) {
      list.push({
        kind: 'dirty',
        equipmentId: null,
        text: `The hall is ${band.label}, ${cleaner.name} is cleaning it`,
        inHand: true,
      });
    } else {
      const risk =
        band.label === 'dirty' || band.label === 'dangerous'
          ? ', somebody will get hurt in this'
          : '';
      list.push({ kind: 'dirty', equipmentId: null, text: `The hall is ${band.label}${risk}` });
    }
  }
```

Keep the "somebody will get hurt in this" wording for the no helper case: `tests/render/views.test.ts`
asserts it.

**(c) `src/ui/app.ts`, the first line of `chipAction` (about line 548):**

```ts
  // Somebody is already on it: the chip tells him so and asks him nothing (CLAUDE.md T19 2.7).
  if (problem.inHand === true) return '';
```

---

## 8. `src/ui/app.ts`: a click on the bench opens its card (CLAUDE.md T19 2.8)

`isSellableFamily` now admits the bench, so the Owned tab draws its Sell and `canSell` refuses it
while somebody is standing at it. The hall's own click still falls through, because the category
gate in `handleSceneClick` (about lines 1863 to 1868) does not name the bench:

```ts
    const category = findSpec(item.specId)?.category;
    // The bench has a card of its own now, because it can be sold like a machine (T19 2.8).
    if (category === 'machine' || category === 'extraction' || category === 'bench') {
      openMachineCard(item.id);
      requestRender();
      return true;
    }
```

---

## 9. Numbers chosen by B2 (every one of them [TUNE] unless it is Piotr's)

B2 chose no new figure. Every constant used is one phase A added to `src/engine/constants.ts`
with its own `[TUNE]` tag: `SPRAYER_MONTHLY_WAGE`, `SPRAYER_REPUTATION`, `JOINER_SPRAY_RATE` 0.7,
`SPRAYER_SPRAY_RATE` 1.0, `SPRAYER_BENCH_RATE` 0.6, `SALE_FRACTION` / `SALE_FRACTION_USED` for
2.8's resale and `HELPER_CLEAN_DUST_BAND` for 2.7's band. The judgement calls B2 did make are in
REPORT-T19.md under the task they belong to.
