# Turn 20, phase A: what was done, what was chosen, and what phase B has to know

Two commits, T20-A1 and T20-A2, both with `npm run check` green on its own exit code. Phase C
folds this file into REPORT-T20.md.

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
- `takeContract` is wired and complete: it dispatches `ACCEPT_CONTRACT` then `ASSIGN_CONTRACT`
  with `data-id` and `data-worker`, which is 2.1's one click. Render the button.
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
- **The Output list already drops most of the office by accident**, not by rule: that line in
  `src/engine/machines.ts` keeps a man whose `rate` is above 0 and below 1, and an experienced
  man is exactly 1.0 now. 2.3.3 wants the rule written as a rule (who produces), not left to the
  rate, so write it.
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

**Everybody.** `data-popover` is on the three popovers that exist: `assign-job`
(`src/ui/jobCard.ts`), `assign-contract` (`src/ui/contracts.ts`) and `menu`
(`src/ui/topbar.ts`). Every new popover carries one, and phase C's test is the rule.
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
