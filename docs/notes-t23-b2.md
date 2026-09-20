# Notes from B2, the hall and the money (Turn 23)

Who wrote what, for the lead who merges the three phase B branches by hand if a merge conflicts.
Every change I made **outside the files section 3 of CLAUDE.md gives my group** is written out
below with its old and its new text. My group's own files are
`src/engine/machines.ts`, `src/engine/materials.ts`, `src/engine/media.ts`, `src/render/hall.ts`,
`src/ui/machinesPage.ts`, `src/ui/machineCard.ts`, `src/ui/catalogue.ts`, `src/ui/finance.ts`,
`src/ui/accounting.ts` and `src/ui/monthEnd.ts`. I never touched `src/render/hall.ts`,
`src/ui/machineCard.ts` or `src/ui/styles.css` at all: `git diff main --stat -- src/ui/styles.css`
is empty, so there is no new token and no new class in the stylesheet.

My worktree is `/home/user/Woodwork-Empire/.claude/worktrees/wf_78302112-c21-2` on branch
`worktree-wf_78302112-c21-2`.

---

## 0. The worktree was not where the task said it was

The task says my worktree was made off `cbc6403`, "T23-A2 Phase A". It was not: it was made off
`cd51383` "tura 23", which is two commits earlier, with `APP_VERSION` still `v35`,
`STATE_VERSION` still 19 and none of phase A's names in it. `cd51383` is an ancestor of
`cbc6403`, so I fast forwarded my own branch onto `cbc6403` with `git reset --hard` before
writing a line. Nothing was rebased, pulled, pushed or merged, and no other worktree was
touched. The other phase B worktree, `wf_78302112-c21-1`, was on the same stale commit when I
looked, so **the lead should check that the other two agents are on phase A and not on
`cd51383`.**

The baseline on `cbc6403` measured exactly what the task said: `npm run check` exit 0, 210 test
files, 2,063 passed, 1 todo.

---

## 1. Decisions the brief left open, and two places it could not be built as written

### 1.1 2.7: a compressor that is short of litres does not stand a man still

2.7 says a man at a bench stands "without a compressor, **or on one that is short**". I built
the first half and not the second, and this is the arithmetic that rules it out.

A used compressor gives 150 l/min, of which 127.5 may be drawn (`AIR_HEADROOM` 0.85). One man
sanding draws 200 and one man at a bench draws 30; through the trade's diversity factor
(`AIR_DIVERSITY` 0.6) that is 138, which is past 127.5. **So a used compressor is short the
moment two men work.** Read literally, the day one hall could never finish anything: the
scripted short handed month delivers no job at all in thirty days and ends 2,499 further into
the overdraft, measured, not guessed.

Three things in the brief itself settle it the other way:

- The Done clause of 2.7 says "a used compressor bought: work resumes the next minute". Under the
  literal reading a used compressor usually would not resume it.
- The hover line the brief gives is `no compressor`, which would be a lie printed over a man with
  a compressor standing beside him.
- The cross check of section 7 and phase C's scenario (oo) both name only "a bench and no
  compressor".

So the stop is **no compressor in the hall, or one that will not give the six bar the bench
wants** (`AIR_BENCH_DEMAND.bar`, read and never typed). A compressor short of litres keeps rule 2
of T10 3.2 untouched: every pneumatic consumer on it, the bench among them, runs at
`LOW_AIR_FACTOR` for that minute. If Piotr wants the harder reading, the change is one line in
`benchHasAir` in `src/engine/media.ts` and the scripted months will have to be retuned around it.

### 1.2 2.7: the worker's minute is booked to `noMachine`, not to a cause of its own

2.7 says "his minutes idle with that reason". The reason exists in two of the three places it
could: the mark over his head (`BUBBLES.noCompressor`, "no compressor") and the owner's day
meter (`OWNER_IDLE_REASONS` gains "No air at the bench"). The third is the workshop's lost
minute, and `LostMinuteCause` is the four lines of the efficiency plate. **Section 6 says no
change to Efficiency**, so I did not add a fifth line to it; a bench standing for want of air
books its minute to `noMachine`, which is the cause `placeHand` already books every minute a man
stands at a job he cannot advance. B1 is adding a `Manager: +5%` line to the same breakdown, so
the lead should look at the two together if Piotr wants a fifth cause after all.

### 1.3 2.8: "the extraction" is the extractors, not the whole extraction category

2.8 says "`serviceableMachines` takes the extraction in". I read that as the extractor family and
not `category === 'extraction'`. The central dust system and the flexi system are in that
category, and their own catalogue lines promise the player "No more bags **and no breakdown**";
everything on `serviceableMachines` is rolled for a breakdown every morning it is past its
service, so the wide reading would make that promise a lie and would be a change to the dust
rules, which section 6 forbids. Every concrete sentence of 2.8 names the extractor, and its Done
clause asks for "a fan that ran three weeks". The predicate is `isServiced` in
`src/engine/machines.ts` and widening it is one line.

### 1.4 2.12: what the bank counts as a sale

"The invoiced sales... off the ledger" is `SALES_CATEGORIES` in `constants.ts`: `jobDeposit`,
`jobBalance`, `contract`, `pellets`. A loan drawn, an insurance payout and the landlord's deposit
coming back are money in and are not turnover, and there is a test that says so. The twelve
calendar months are this month and the eleven before it, so a sale in the thirteenth month back
is off the books.

### 1.5 2.12: **the biggest thing in this branch, and it is Piotr's to rule on**

The bank lends a company on its first morning the floor, ten thousand. The scripted three month
playthrough of 10.4 borrowed twenty five thousand on day 8 and now takes ten, and fifteen
thousand less capital changes the run: month 1 still closes in the black at 6,550, month 2 closes
at -5,018 where it closed in the black, month 3 at -15,847, **the production manager of 10.4 is
never affordable at all** and so the holiday that wants him to cover is never taken, the contract
term makes thirteen of its seventeen weeks and the client's renegotiation at the end of it is
never reached, and the bank pulls the overdraft on the morning of day 91.

I wrote the run down as it plays and tuned nothing to make it read better. The test carries a
long comment at the head of its describe saying so. What Piotr has to decide is whether ten
thousand is the right floor, or whether the script of 10.4 should buy a cheaper saw and fan to
live inside it.

I measured one way out before restating: the rule allows free early repayment, so an attentive
owner could repay the floor and redraw a bigger loan as his books grow. **He cannot.** Three
months of this company's sales never lift a quarter of them above the floor he already has, so
the redraw never fires. The code that tried it is not in any commit.

### 1.6 2.16: "the take off's order line says its own"

I read this as the order line showing its own cost, which it already does through
`orderForJobCost`, and that figure now comes off the ladder. I did not add a per sheet price to
the button, because a job's order carries the bespoke uplift where the material is bespoke and
"at 200 a sheet" would be wrong on those jobs.

### 1.7 2.17: the words of the bench refusal

2.17 says the gate asks for a place "the way it asks for a tool slot", which is through
`shortfallForHire` and the words `Buy first: ...`; its Done clause asks for the refusal
`No place at a bench`. Both are true now, off the one shortfall: when the bench is the **only**
thing the hall is short of, the words are `No place at a bench`; when it is short of other things
too, the player is told what to buy, as he always was. A hall with nothing in it at all is still
told to buy a workbench, a locker, a cabinet and a set of tools.

### 1.8 2.17: the owner's place at a bench

The crew fill the benches in the order they were hired and **the owner takes what is left over**.
The gate counts places against the men on the books, the owner not counted, which is 2.17's own
wording, so a man the player has paid for a bench for is never the one standing at the canteen
door. On the first morning there is no crew and the whole bench is the owner's. The reverse
order (owner first) starves every joiner in a hall with one bench and was measured to break
nineteen tests, so it is not the reading.

---

## 2. Figures I chose, all tagged [TUNE] in the source

| figure | where | what |
| --- | --- | --- |
| `LOAN_FLOOR` 10,000 | constants.ts | the brief's own figure, tagged as it asks |
| `LOAN_SHARE_OF_SALES` 0.25 | constants.ts | Piotr's quarter |
| `LOAN_SALES_MONTHS` 12 | constants.ts | Piotr's twelve months |
| `SHEET_PRICE_LADDER`, eight bands | constants.ts | the brief's table, every figure [TUNE] |
| `WORKBENCH_PLACES` 1, 1, 2, 2, 3 | constants.ts | the brief's table [TUNE] |
| bench `outputFactor` 0.95, 1.00, 1.03, 1.06, 1.10 | constants.ts | the brief's re tune [TUNE] |
| `NO_AIR_LINE` "No air: the benches stand still" | constants.ts | my words; the old line said the old rule |
| `OWNER_IDLE_REASONS` "No air at the bench" | constants.ts | my words for the fifth reason |
| "It is not serviced" | machines.ts | my words; "It is repaired, never serviced" had to go |

---

## 3. Every change outside my group's files, old text and new

### `src/engine/constants.ts` (phase A's file; B1 and B3 also write here)

1. **`NO_AIR_FACTOR` deleted and `NO_AIR_LINE` reworded** (2.7).
   Old:
   ```
   /** What every pneumatic consumer on a compressor that is short of litres runs at, for that minute
    *  (PIOTR, CLAUDE.md T10 3.2). */
   /** What a bench is worth with no compressor in the hall at all: the nailer and the driver are no
    *  use and the assembly is screwed together by hand [TUNE] (PIOTR, 15.09; CLAUDE.md T11 3.8). */
   export const NO_AIR_FACTOR = 0.67;

   /** What the hall says while there is no air in the hose at all. */
   export const NO_AIR_LINE = 'No air: screws by hand';

   export const LOW_AIR_FACTOR = 0.7;
   ```
   New: `NO_AIR_FACTOR` is gone; `NO_AIR_LINE = 'No air: the benches stand still'`;
   `LOW_AIR_FACTOR = 0.7` keeps its value and gains a sentence saying a man at a bench is not on
   that ladder any more.

2. **`OWNER_IDLE_REASONS` gains a fifth row** (2.7), between `noMaterial` and `nothingAssigned`:
   `{ id: 'noCompressor', label: 'No air at the bench' },`

3. **`BUBBLES` gains a fifth line** (2.7), between `noMaterial` and `nothingToDo`:
   `noCompressor: 'no compressor',`
   **B1 is adding `waiting for the boss` to this same table.** Both lines are additions to the
   same object literal and the merge is a two line one.

4. **`LOAN_MAX` deleted** (2.12), replaced by `LOAN_SHARE_OF_SALES`, `LOAN_FLOOR`,
   `LOAN_SALES_MONTHS` and `SALES_CATEGORIES`. `constants.ts` gains `LedgerCategory` on its type
   import for `SALES_CATEGORIES`.

5. **`LEDGER_VISIBLE_ENTRIES` deleted** (2.14): it said how many lines the Ledger tab showed and
   there is no Ledger tab. `LEDGER_MAX_ENTRIES` is untouched.

6. **`SHEET_PRICE_STOCK` and `SHEET_PRICE_AD_HOC` deleted** (2.16), replaced by
   `SHEET_PRICE_LADDER`.

7. **`WORKBENCH_PLACES` added and the bench `outputFactor` column re tuned** (2.17): 1.02, 1.05
   and 1.08 become 1.03, 1.06 and 1.10 on the three classes priced 450, 900 and 2,200. No other
   family's factors were touched.

8. **`BUILDING_ROLES` moved here from `jobs.ts`** (2.17), because `machines.ts` has to fill the
   benches with these men and cannot reach `jobs.ts`. `jobs.ts` re-exports it, so every caller
   still reads it from where it has always been.

### `src/engine/types.ts`

- `OwnerIdleReason` gains `'noCompressor'`; `BubbleKey` gains `'noCompressor'`; the comment above
  `BubbleKey` reads "five things" where it read "four".

### `src/engine/owner.ts`

- `emptyOwnerIdle()` gains `noCompressor: 0`.

### `src/engine/migrate.ts`

- The literal it resets `state.owner.idleByReason` to gains `noCompressor: 0`. I left it a
  literal rather than importing `emptyOwnerIdle`, because `migrate.ts` imports nothing but
  `constants` and `types` on purpose and `owner.ts` would pull `events.ts` and `rng.ts` into the
  migration path. `emptyEfficiency` in the same file is a literal for the same reason.

### `src/engine/production.ts` (B1's file)

Four changes:

1. `ownerIdleReason`: the one line
   `return rackCanSupply(state, job, jobProgress(job)) ? 'noMachine' : 'noMaterial';`
   becomes four lines that return `'noMaterial'` first, then ask `standsForAir` and return
   `'noCompressor'` or `'noMachine'`.
2. `workMinute`: after `const air = hallAirCheck(state);` a loop filters `atWork` into `running`,
   losing a `noMachine` minute for every man `standsForAir` is true of, and returning early when
   `running` is empty. The two loops below it read `running` where they read `atWork`.
3. `workMinute`: the extraction books its hours, six lines before the owner away loop.
4. `takeMachines` and `stationForProduction` read `benchOf` and `benchPlaceAt` where they read
   `heldMachine(..., BENCH)`; `takeMachines` gains a `family === BENCH` branch before its last
   line. Imports gain `benchOf`, `benchPlaceAt`, `isServiced`, `extractionKit`,
   `extractionRunning` and `standsForAir`.

### `src/engine/game.ts`

1. `runProductionMinute`, the day's twin of `workMinute`, gets the same two inserts as 2 and 3
   above, word for word. **Phase C's standing job of folding the two onto one function would
   remove the duplicate.**
2. `raiseMonthEnd` gains one line, `state.monthlyReports.push(monthlyReportFor(state, month - 1));`,
   immediately after `state.monthEndShownFor = month;`. **It has to be there**: three lines later
   `startMachineMeters` zeroes the machines' month clocks and the savings on the card are read off
   them.
3. Imports gain `monthlyReportFor`, `isServiced`, `extractionKit`, `extractionRunning` and
   `standsForAir`.

### `src/engine/bubbles.ts`

- `onAJob` hoists the stage it already computed and asks `standsForAir` before it asks
  `waitingWordsFor`; imports gain `standsForAir` from `./media`. **B1 will add the
  `waiting for the boss` mark to this same file**, in `bubbleFor` rather than `onAJob`.

### `src/engine/economy.ts`

- `monthlyReportFor(state, month)` added beside the `MonthlyReport` interface phase A wrote, and
  the three type-only imports of `MonthEfficiency`, `MachineSavings` and `WorkshopRate` become
  value imports of `monthEfficiency`, `machineSavings` and `monthRate` beside them.

### `src/engine/finance.ts`

- `salesLastTwelveMonths`, `loanLimit` and `loanLimitLine` added; `loanCheck`'s cap line
  `if (amount > LOAN_MAX) return { ok: false, reason: \`The bank lends up to ${LOAN_MAX}\` };`
  becomes `if (amount > loanLimit(state)) return { ok: false, reason: loanLimitLine(state) };`.

### `src/engine/staff.ts` (B1 and B3 both write here)

**Three changes, and B3 is changing the same function.** `hiringOptions`'s `blockReason` chain is
where B3's `No locker for him: the canteen holds eight` goes, and my bench branch is inside the
existing `missing.length > 0` arm, so the two do not collide unless B3 rewrites the chain.

1. `shortfallForHire`, the `has` ternary:
   old
   ```
   const has =
     specId === TOOL_CABINET
       ? toolSlotsOwnedOrOnOrder(state)
       : countOwnedOrOnOrder(state, specId);
   ```
   new
   ```
   const has =
     specId === TOOL_CABINET
       ? toolSlotsOwnedOrOnOrder(state)
       : specId === BENCH
         ? benchPlacesOwnedOrOnOrder(state)
         : countOwnedOrOnOrder(state, specId);
   ```
2. `hiringOptions`, the last arm:
   old `blockReason = \`Buy first: ${missing.join(', ')}\`;`
   new: the same line under a ternary on `missingForHire(state, spec.role)`, giving
   `'No place at a bench'` when the bench is the only thing short.
3. `benchAnchor`, the joiner's home cell:
   old
   ```
   const index = joiners(state).length;
   const bench = state.equipment.filter((item) => item.specId === 'workbench')[index];
   ```
   new `const bench = benchAtPlace(state, joiners(state).length);`
   Imports gain `BENCH`, `benchAtPlace` and `benchPlacesOwnedOrOnOrder`.

### `src/engine/jobs.ts`

- `export const BUILDING_ROLES: readonly WorkerRole[] = ['joiner', 'sprayer'];` becomes
  `export { BUILDING_ROLES };` with the name added to the `./constants` import.

### `src/engine/index.ts`

New exported names, so the lead can see at a glance whether two groups named the same thing:
`isServiced`, `benchOf`, `benchPlaces`, `benchPlacesOf`, `loanLimit`, `loanLimitLine`,
`LOAN_FLOOR`, `LOAN_SALES_MONTHS`, `LOAN_SHARE_OF_SALES`, `SHEET_PRICE_LADDER`, `sheetPriceFor`,
`monthlyReportFor`, `monthName` (already there), and the type `MonthlyReport`.
Removed: `LOAN_MAX`, `SHEET_PRICE_STOCK`, `SHEET_PRICE_AD_HOC`.

### `src/ui/app.ts` (B3's file for the canteen click and view)

Five inserts, all of them the day summary's own pattern copied one layer along:

1. `interface` gains `monthlyReport: number | null;` after `daySummary`.
2. The initial UI state gains `monthlyReport: null,`.
3. A modal spec block pushed after the laptop's, before the drop card's.
4. `closeModal` gains an `if (which === 'monthlyReport')` arm after the day summary's.
5. `ESCAPE_ORDER` gains `{ name: 'monthly report', ... }` after the day summary's and before the
   drop card's, and the outside click handler gains a block after the drop card's.
6. One import line changes to `import { renderMonthEnd, renderMonthlyReport } from './monthEnd';`
   and `monthName` is added to the engine import.

### `src/ui/machine.ts`

- `benchLine(spec, variant)` added and pushed into `effectLines` after `holdsLine`; imports gain
  `benchPlacesOf`.

### `src/ui/materials.ts`

- `ladderLine(sheets)` added, and `restockControl` prints it between the field and the button in a
  plain `.row-figure` with a `data-ladder` hook. **No new class and no new CSS.**

---

## 4. Tests outside my group's own, and why each one moved

- `tests/engine/economy.test.ts`, `tests/engine/board.test.ts`,
  `tests/engine/companyBoard.test.ts`: three stale mentions of the cordless drill. Two of them
  bought one, which since phase A is a line that buys nothing.
- `tests/engine/toolCabinet.test.ts`, `tests/ui/catalogueTabs.test.ts`: the hand tool set's own
  describe, the gate's specification line, the extractor's card.
- `tests/engine/lacquerAirRotate.test.ts`: "runs the assembly at 0.67" becomes "works no assembly
  at all", plus the 2.7 describe.
- `tests/ui/topbar.test.ts`, `tests/cloud/migrate.test.ts`, `tests/engine/bubbles.test.ts`: the
  fifth idle reason and the fifth mark.
- `tests/engine/machineHours.test.ts`, `tests/engine/serviceRule.test.ts`,
  `tests/ui/machinesPage.test.ts`: the fan's hours and its service.
- `tests/engine/finance.test.ts`, `tests/ui/finance.test.ts`: a loan now has to be earned, so the
  tests give the company the turnover that carries one.
- `tests/engine/materials.test.ts`, `tests/engine/jobs.test.ts`, `tests/ui/materials.test.ts`: the
  ladder.
- `tests/engine/hiringGate.test.ts`, `tests/engine/machines.test.ts`,
  `tests/engine/assignees.test.ts`, `tests/render/views.test.ts`: the bench places.
- `tests/ui/monthEnd.test.ts`, `tests/ui/popovers.test.ts`, `tests/ui/app.test.ts`,
  `tests/ui/modalScroll.test.ts`: the monthly reports, and two tests that read individual ledger
  lines off the tab that is gone and now read them off the day they were written on.
- `tests/scenarios/turn13.test.ts`, `tests/scenarios/turn22.test.ts`,
  `tests/scenarios/playthrough.test.ts`, `tests/scenarios/thirtyDays.test.ts`: restated figures,
  each with the line of the brief that moved it written beside it. **Phase C owns these files and
  should read the four restatements before it rewrites them for 2.1.**
