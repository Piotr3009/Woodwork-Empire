# Turn 20, phase A: what was done, what was chosen, and what phase B has to know

Three commits, T20-A1, T20-A2 and T20-A3 (the review below), each with `npm run check` green on
its own exit code. Phase C folds this file into REPORT-T20.md.

## 1. The figures chosen, with their tags

Every one of these is in `src/engine/constants.ts` with the same tag in its comment.

| Constant | Value | Tag and why |
|---|---|---|
| `APP_VERSION` | `'v29'` | The one bump of the turn. |
| `STATE_VERSION` | 17 | Section 4 of the brief. |
| `TIER_WORDS` | no experience, experienced, super experienced, extremely experienced | [PIOTR, 18.09]. The one table the game prints a tier from. |
| `WORKER_RATES` | 0.8 / 1.0 / 1.2 / 1.4 | [PIOTR] the 0.8 and the 1.2; [TUNE] the master's 1.4 as the step above it. |
| `TIER_MIN_REPUTATION` | -50 / 15 / 35 / 60 | [PIOTR] the 60; [TUNE] the 15 and the 35. `REPUTATION_MIN` for the man with no experience, who always answers. |
| `JOINER_WEEKLY_WAGE_EXPERIENCED` | 600 | [PIOTR] 1,000 for the top of the ladder; [TUNE] the rest, which makes the experienced man 600. |
| `TIER_WAGE_FACTOR` | 450/600, 1, 800/600, 1000/600 | [TUNE]. The joiner's own ladder, applied to every tiered role from its experienced man's wage, which is what the brief asks for in 2.5. |
| `tierWeeklyWage` rounding | to the nearest five pounds | [TUNE]. It makes the joiner's ladder exactly 450, 600, 800, 1,000. |
| `ESTIMATOR_WEEKLY_WAGE_EXPERIENCED` | 610 | [TUNE]. His 2,600 a month over `WEEKS_PER_MONTH` is 606.67, to the nearest ten. His four tiers come out 460, 610, 815, 1,015. |
| `SPRAYER_WEEKLY_WAGE_EXPERIENCED` | 630 | [TUNE]. His 2,700 a month over `WEEKS_PER_MONTH` is 630 exactly. His tiers: 475, 630, 840, 1,050. |
| `DRAFTSMAN_WEEKLY_WAGE` | 560 | [TUNE]. His 2,400 a month over `WEEKS_PER_MONTH` is 560 exactly. |
| `PRODUCTION_MANAGER_WEEKLY_WAGE` | 795 | [TUNE]. His 3,400 a month is 793.33, to the nearest five. |
| Office admin | 445 a week | [TUNE]. His 1,900 a month is 443.33, to the nearest five. |
| Purchasing clerk | 395 a week | [TUNE]. His 1,700 a month is 396.67, to the nearest five. |
| Salesman | 515 a week | [TUNE]. His 2,200 a month is 513.33, to the nearest five. |
| Helper | 420 a week | Unchanged. |
| `CONTRACT_PIECES` | 50 / 52 / 160 a piece, 45 / 60 / 240 minutes | [PIOTR] the whole table (T20 2.2). `labour` is price less material: 20, 26, 100. |

## 2. Names in the brief that are not the names in the code

- **"the Equipment group"** of the laptop (2.9) did not exist. The laptop had one group, Office.
  A second group heading, `EQUIPMENT_GROUP` in `src/ui/laptop.ts`, sits under it with the one
  Machines tile on it, drawn with the same `.screen-group` and `.screen-small-tile` the Office
  group uses. No new class and no new token.
- **`serviceMachine`** already exists as an action and already dispatches `SERVICE_MACHINE`
  (the machine card's Service button). B3 does not need a new route for 2.9, only the new rule
  behind the engine action.
- **`ESTIMATOR_RATES`** is gone. It held 0.8 / 1 / 1.2, which is `WORKER_RATES` exactly now, so
  the estimator reads the one table like everybody else (`src/engine/tasks.ts`).
- **`SPRAYER_MONTHLY_WAGE`, `SPRAYER_REPUTATION`, `ESTIMATOR_MONTHLY_WAGE`,
  `ESTIMATOR_REPUTATION`, `DRAFTSMAN_MONTHLY_WAGE`, `PRODUCTION_MANAGER_MONTHLY_WAGE`** are
  gone, replaced by the weekly figures above and by `TIER_MIN_REPUTATION`.
- **`monthlyPay`** in `src/engine/staff.ts` is now **`monthlyWageOf`**, and it is the one place a
  week is turned into a month. Nothing multiplies by `WEEKS_PER_MONTH` twice.

## 3. What phase B must know

**B1, the money.**
- `renderWorkPlan(state, tab, dropConfirm, assignOpen)` takes the tab first now. `WorkPlanTab` is
  `'jobs' | 'contracts'`, `workPlanTabFrom` parses it, the folder's own `tabBar` draws it, and
  `ui.workPlanTab` in `src/ui/app.ts` holds it (action `workPlanTab`, one click). The Jobs tab is
  exactly what the modal was, **including the v28 contract bar**: 2.1.5 moves it, and that move
  is yours.
- The Contracts tab renders one line, `The contracts are still on the Jobs tab.` Replace the
  whole of it with 2.1.1 to 2.1.3.
- `ui.contractMan` holds the man an offer card is worked out for (null for the card's own first
  choice). The action `pickContractMan` sets it from `data-worker`.
- `takeContract` dispatches `ACCEPT_CONTRACT` then `ASSIGN_CONTRACT` with `data-id` and
  `data-worker`, which is 2.1's one click. Render the button, and **decide the owner's card
  first**: `contractAssignCheck` (`src/engine/contracts.ts`) refuses anybody who is not a joiner
  on the books, and the owner is not in `state.workers` at all, so on the card 2.1.1 draws when
  there are no joiners the accept goes through and the assign is dropped without a word. Either
  the button is a joiner's button and the owner's row says so, or the check takes the owner; and
  the route should say what it was refused instead of throwing the `ContractCheck` away. That is
  a decision about the card, which is yours.
- `contract.endedBy` is on the type, `'term' | 'player' | 'client'`, and every contract is
  created with `'term'`. The engine does not yet set `'player'` or `'client'`: `endContract`
  (2.1.6) and the second short week are yours.
- **The wardrobe front's material and its sheets no longer agree.** The brief sets its material
  at 60 and says the sheet count stays, so it draws 1.1 sheets off the rack (worth 220 at
  `SHEET_VALUE`) and is costed at 60. The two small pieces still agree.
  `tests/engine/contracts.test.ts` says so in as many words. If Piotr wants them to agree, it is
  the sheet count that has to move, and that is a decision, not a fix.
- The margin an hour by hand, with the new table: 20/0.75 h = 26.67, 26/1 h = 26.00,
  100/4 h = 25.00. All three are inside the 22 to 30 band of 2.2, and the test for it is yours.

**B2, the people.**
- `Worker.monthlyWage` is gone. `weeklyWage` is the one field and every role in `HIRING_SPECS`
  carries one, so `weeklyWageBill` already pays the office, the sprayer and the manager on
  Friday. **`monthlySalaryBill` and the month end's "Office salaries" line are deleted**: keeping
  them would have paid the office twice. The printed copy of 2.6 (`£600 a week (about £2,600 a
  month)`) is yours: the hire card and Our team print the week only at the moment, through
  `wageLine` in `src/ui/team.ts` and `monthlyWageOf` on the Our team row.
- `Worker.leavesOnDay: number | null` is on the type, null everywhere, and the `letGo` action has
  a route in `src/ui/app.ts` that does nothing yet, with the comment saying so. Nothing renders a
  control for it. The week's notice, the payroll while he works it out, the jobs and contracts
  dropping him, and the hiring gate and crew limit counting him are all yours.
- `HIRING_SPECS` is built by `tieredSpecs(role, label, experiencedWeekly, duties)` for the joiner,
  the estimator and the sprayer: four rows each, off `TIER_WAGE_FACTOR` and `TIER_MIN_REPUTATION`.
  Add the hire card's missing line (`extremely experienced joiners come from reputation 60`)
  against `TIER_MIN_REPUTATION`, which is already what `hiringOptions` refuses on.
- Every printed tier goes through `TIER_WORDS`: `src/ui/team.ts` (the hire card label, the crew
  row, the Our team row), `src/ui/jobCard.ts` (`assigneeTrade`), `src/ui/contracts.ts` (the
  assign list) and `src/engine/machines.ts` (the Company board's "act where they are" line).
- **The Output list keeps every man with a rate, and by rule it should keep only the men who
  produce.** The guard in `src/engine/machines.ts` used to stop at a rate of 1 as well, which at
  the new ladder threw out the experienced joiner, the senior and the master and left the board
  saying `Nobody on the books`; that half of it is gone (T20-A3). It now keeps everybody whose
  rate is above 0, which is the joiners, the sprayers and the estimators. 2.3.3 wants the rule
  written as a rule, who produces, and the estimator off the list, so write it.
- `ESTIMATOR_JOBS_PER_DAY` is untouched: 2.3.1 is yours.

**B3, the hall.**
- `Animation` and `ANIMATIONS` carry `'sweep'`. `animationForStation` is untouched, as the brief
  says: `animationForStation('cleaning')` returning `sweep` is yours, with the fallback rule.
  `playableAnimation('helper', 'sweep')` already returns the sweep sheet, and every other role
  falls back to idle; `tests/render/frameFallbacks.test.ts` asserts both.
- `Equipment.serviceCount` (0) and `Equipment.inServiceUntilDay` (null) are on the type, on every
  new machine in `src/engine/game.ts` and on every lifted one.
- The Machines page is `src/ui/machinesPage.ts`, `renderMachinesPage(state)`, reached by
  `laptopPage` with `data-id="machines"` off the Equipment group's tile, titled `Machines`, with
  the same back arrow as every other page. It renders one empty line today.
- `serviceMachine` needs no new route (see section 2).
- `tests/render/capsule.test.ts` was **red on the base commit**: the v28 patch delivered the
  helper's sheets and left the Turn 19 test saying only the owner and the joiner have any. It now
  says the three men who have sheets are drawn from them and measures the placeholder on the
  sprayer, who has none.

**Everybody.** `data-popover` is on the four popovers that exist: `assign-job`
(`src/ui/jobCard.ts`), `assign-contract` (`src/ui/contracts.ts`), `menu` (`src/ui/topbar.ts`) and
`why` (the "i" link's popover in `src/ui/app.ts`, tagged in T20-A3). Every new popover carries
one, and phase C's test is the rule. **The why popover has no cross**: Escape and a click outside
shut it from tonight, and the `.modal-close` is left to 2.15, because a 54 px disc on a 340 px
popover is a look and this turn has no mockup for it.
`docs/ui-style.md` is the look written out of the code; read it before the first UI commit.

## 4. The tests changed, and why

Behaviour the brief changed, so the test was moved to the new truth:

- `tests/ui/version.test.ts`, `tests/ui/saveCheck.test.ts`, `tests/engine/types.test.ts`,
  `tests/cloud/migrate.test.ts`: `v29` and state version 17.
- The tier ids `poor`, `normal` and `super` became `novice`, `experienced` and `senior`
  throughout the tests, and `WORKER_RATES.poor` and friends with them.
- `tests/ui/team.test.ts`, `tests/ui/teamCrew.test.ts`, `tests/engine/hiringGate.test.ts`: the
  `data-candidate` ids (`joiner.novice`), the fourth tile per tiered role, and the rate on the
  card (80% of the owner where it read 60%).
- `tests/engine/staff.test.ts`: the reputation ladder (15, 35, 60), the joiner's 450 a week, and
  a joiner with no experience taking 10 days over the 6,400 wardrobe where he took 13.3.
- `tests/engine/earnedRate.test.ts` (25.20 to 33.60 an hour), `tests/engine/rate.test.ts`
  (26 to 28), `tests/engine/types.test.ts` (8 and 10 days, not 10 and 13.3): the tier ladder.
- `tests/engine/economy.test.ts`, `tests/scenarios/turn13.test.ts`: the office is paid on Friday
  and the month end's salary line is gone.
- `tests/ui/ourTeam.test.ts`, `tests/engine/sprayer.test.ts`: the tier words, the four tiers, and
  the sprayer paid by the week.
- `tests/engine/contracts.test.ts`, `tests/ui/contracts.test.ts`: the new prices (50 a piece, the
  wardrobe front four hours, six a week), and the margin ladder, which now thins as the tier
  rises because the wage ladder is steeper than the speed ladder.
- `tests/ui/spriteCheck.test.ts`, `tests/render/frameFallbacks.test.ts`: `sweep`.
- `tests/ui/laptopHome.test.ts`, `tests/ui/laptopTeam.test.ts`,
  `tests/ui/officeRegions.test.ts`: the Equipment group and its Machines tile.
- `tests/engine/assignees.test.ts`, `tests/engine/dropJob.test.ts`, `tests/ui/workPlan.test.ts`,
  `tests/ui/workPlanStraight.test.ts`, `tests/ui/contracts.test.ts`: `renderWorkPlan` takes the
  tab first.

Scenario anchors re-measured, because the crew are faster and the figures they were written
against moved. Every one of them says what was measured and why, in the test:

- `(y)` two men on one job: 19 days alone and 8 together, so the band is 0.4 to 0.7 and the floor
  on the days alone is 15.
- `(aa)` three men on one job: the minutes are compared as a fraction (six parts in a thousand
  apart) and the three to one ceiling is asserted to the day, because a finished day is a whole
  day. The arithmetic itself is still asserted exactly in `tests/engine/assignees.test.ts`.
- `(bb)` the booth: two working days instead of three, because at the new rates the sprayer
  finishes the stage inside three and the reading hits a ceiling. The joiner gets 425.60 of the
  900 and the sprayer 608.00, which is the 1.4286 the constants name.
- The month of six joiners behind two saws: both months now get the whole book out inside the
  thirty days, so the second saw buys the calendar. The book finishes sooner with it, and the
  saw has all but paid for itself: 120 behind on 1,800 spent.
- `(w)` the night shift: one night of work for the night man, not two.
- The three month playthrough hires an estimator with no experience, because an experienced one
  wants reputation 15 and the workshop has not earned it by day 31.

## 5. What phase A did not do

Nothing from section 2 of the brief but the shapes. No engine behaviour was written for 2.1, 2.3,
2.4, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 2.13, 2.14, 2.15 or 2.16. `src/ui/styles.css` was not
touched at all: `git diff --stat -- src/ui/styles.css` is empty, so no colour, font, radius or
shadow value moved.

## 6. Phase A review (T20-A3)

Three adversarial readings of the phase A diff gave fourteen findings. Every one was checked
against the code before it was acted on. Eleven stood, two were rejected because what they ask
for is a decision that belongs to a later phase or to Piotr, and one was the same finding twice.
`npm run check` after them: **exit 0, 173 test files, 1,750 tests and one todo.**

**Confirmed and put right.**

1. **The lift left an old tier id inside an interview.** `liftToVersion17` walked the workers, the
   equipment and the contracts but not `state.tasks`. A `hiring` task carries its `TaskOrder`, and
   the order carries the tier: a v28 save taken while the owner was sitting in an interview kept
   `poor`, `normal` or `super` in it, no `HIRING_SPEC` has those ids tonight, so `canHire` would
   answer `No such job`, `hire` would return null and `settleOrders` would throw the answer away.
   The owner spends the hour and nobody is taken on, without a word. The lift now renames the
   orders with the same `TIER_LIFT` table. This was the blocker.
2. **A save lifted mid month pays the office twice that month.** True and unavoidable: the office
   and the sprayer had their whole month taken on the 1st under the old rule, and the lift gives
   them a weekly wage that goes out again on the Fridays that are left. Following the Turn 17
   precedent, where Joinery Core was paid twice and nothing was given back (`liftToVersion15`),
   the lift's doc comment now says so plainly, so phase C's cross check does not read it as a bug.
   Every month after the bump is right.
3. **Nothing tested the lift.** The three fixtures under `tests/fixtures` carry no crew, no hire
   order and no running contract, so not one line of tonight's lift was asserted. A v28 save is
   now written out in `tests/cloud/migrate.test.ts` (a joiner at each old tier, a sprayer and an
   office admin on a monthly wage, a machine with hours on it, a running contract and an open
   interview) and five tests read the lifted tiers and rates, the derived weekly wages, the
   renamed hire order, `leavesOnDay`, `serviceCount`, `inServiceUntilDay` and `endedBy`.
4. **The Company board's crew list went empty.** `outputBreakdown` skipped a man whose rate was
   1 or more, which was written when no tier reached the owner. At tonight's ladder that is the
   experienced man, the senior and the master, so a workshop of experienced joiners with no
   machines was told `Nobody on the books and no machines in the hall.` and the master's +0.40,
   the one figure that shows a man beating the owner, appeared nowhere. The guard is now
   `rate <= 0` alone. Section 3's handover sentence was wrong about which men were being dropped
   and says the right thing now; 2.3.3's rule, the estimator off the list, is still B2's.
5. **The Accounting page promised a salary bill nothing charges.** `monthlyBillsLine` was a hard
   coded `['salaries', 'software', 'waste']` and phase A deleted the charge. `'salaries'` is out
   of it; the `Wages, <Friday>` row above carries the whole payroll now. (Two of the three
   reviewers found this one.)
6. **Two reputation figures gated two screens.** `hiringOptions` refused a tier on
   `state.reputation` while the board, the catalogue and every other tier table read
   `effectiveReputation`, whose own comment calls it the one function they read. With the new
   gates at 15, 35 and 60 the card could say `Nobody of this standing answers yet, reputation 60`
   on a screen showing 60. It reads `effectiveReputation(state)` now.
7. **Piotr's 1,000 a week was asserted nowhere.** The tests compared `HIRING_SPECS` against the
   same `tierWeeklyWage` call that built it, which cannot fail. `tests/engine/staff.test.ts` now
   pins the joiner's ladder as the four figures, 450, 600, 800 and 1,000, with the reputation
   gates beside them. `ESTIMATOR_WEEKLY_WAGE`, which nothing read at all, is deleted;
   `JOINER_WEEKLY_WAGE` and `SPRAYER_WEEKLY_WAGE` stay as the sample data two test files use.
8. **The offer card did not redraw when the player picked another man.** `pickContractMan` set
   `ui.contractMan` and returned, so it neither dispatched nor rendered, and with the clock
   stopped, which is exactly when a man is picked, the card kept the last man's figures. It
   breaks now, into the `requestRender()` every pure UI case falls through to.
9. **The why popover was missed by the `data-popover` pass.** It is a fourth popover on screen
   today and it had no tag, so phase C's 2.15 test would have walked straight past it. It carries
   `data-popover="why"` now, Escape shuts it above the modal under it, and a click outside shuts
   it as it shuts the menu and the assign list. The `.modal-close` is deliberately left to 2.15:
   a 54 px disc on a 340 px popover is a look, and this turn has no mockup for it.
10. **The lift claimed a contract could only have ended on its term.** v28 had `END_CONTRACT` and
    `endContractNow`, so it could not. The comment now says what is true: a lifted save cannot
    tell a term that ran out from an end the player called himself, and both are recorded as
    `term`.
11. **Phase A left no lines in REPORT-T20.md**, which the README already advertised.
    `REPORT-T20.md` is open with two lines each for T20-A1, T20-A2 and T20-A3, and this file is
    folded into it by phase C as it always said it would be.

**Rejected.**

- **The wardrobe front's 1.1 sheets against its costed 60.** The reading is right and section 3
  above already records it, but the fix asks for `sheets: 0.3`, and 2.2 says in as many words that
  `sheets` per piece stays what it is. Changing Piotr's table is his decision, not a fix, and
  costing the piece at the sheets it really draws is the Contracts tab's, which is T20-B1c.
- **`takeContract` swallowing the assign refusal.** The reading is right: the owner is not in
  `state.workers`, so on the card 2.1.1 draws when there are no joiners the accept lands and the
  assign is dropped. But the fix is to decide the owner's case, and the offer card is 2.1.1,
  which is T20-B1c's. Nothing renders the button yet, so nothing can reach it; the handover in
  section 3 now names the trap and asks B1c to decide it before the button is drawn.

**The same finding twice.** Two reviewers wrote up the Accounting page's salary line; it is
number 5 above.
