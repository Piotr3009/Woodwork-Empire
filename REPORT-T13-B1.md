# Report: Turn 13, phase B, group B1 (Money and paper)

Branch `t13-b1`, from phase A's `9dcfc9a`. Sections 3.14 (finance), 3.15 (insurance), 3.16
(contracts) and 3.20 (the month end) of CLAUDE.md T13. Files owned: `src/engine/economy.ts`,
`src/engine/finance.ts`, `src/engine/insurance.ts`, `src/engine/contracts.ts`,
`src/ui/accounting.ts`, `src/ui/finance.ts`, `src/ui/insurance.ts`, `src/ui/contracts.ts`,
`src/ui/monthEnd.ts`, and the tests that match them by name.

---

## 1. Done

| Task | Commit | What went in | Proved by |
|---|---|---|---|
| T13-B1a Finance | `af46e53` | `finance.ts`: the loan counts its instalments off the calendar (one for every 1st since it was drawn), so the month runs once however many hooks ask; the sixtieth instalment takes whatever is left, so a principal that does not divide by sixty still closes; a part repayment keeps the term and lowers the instalment, a full one closes the loan; `repayCheck` and `nextInstalmentFor` for the tab. `economy.ts`: `runFinanceMonth` and `runInsuranceMonth` now run inside `runMonthlyItems`, which runs for every calendar 1st (weekends included) and after the day's and the month's totals are emptied, so the top bar's "today" and the Summary tab count them; `charge()` takes `merge: true` (one line a day per category and label, for the contracts); `monthReport()` and its table `MONTH_LINE_OF` (for B1d). `src/ui/finance.ts`: the Finance tab: balance, next instalment (capital and interest named), interest paid, months left, Take the loan with the typed amount, Repay and Repay it all, locked with the reason when refused; the overdraft's limit, rate, accrued interest and a red line while the account is below zero. `src/ui/accounting.ts`: the "Monthly bills" line names the loan instalment, the covers and the accrued overdraft interest. `insurance.ts`: `runInsuranceMonth` charges once a day (it is called from two hooks until phase C removes one) and `monthlyPremiums()`. | `tests/engine/finance.test.ts` (sixty instalments sum to the principal and to the interest the monthly balances imply; one instalment a month however often the 1st runs and none before it; the lines dated the 1st in plain English; early repayment closes at no penalty; a part repayment re-amortises; a second loan refused; the overdraft accrues a day below zero and not above, is charged on the 1st as one line, and on a weekend 1st too); `tests/ui/finance.test.ts` (the tab's rows, colours and controls, the binder's tab and the "what is coming" line) |
| T13-B1b Insurance | `5cf9086` | `insurance.ts`: the insured value split into the machines' share and the stock's (`insuredMachinesValue`, `insuredStockValue`); `premiumYearlyFor`, `premiumMonthlyFor`, `monthlyPremiums`; taking a cover pays the rest of the month at once (`firstPremiumFor`, pro rata by the days left, the whole twelfth on the 1st) and is refused with the reason when the cash cannot cover it (`insuranceCheck`, `setInsurance` returns the check); dropping refunds nothing; `runInsuranceMonth` charges a twelfth per cover held, once a day; `onAccident` books the uninsured claim in the band and returns it (zero with cover); `claimBurglary` books the ten day payout with cover and an alarm, nothing at level 0 (`propertyCoverVoid`); `runInsuranceDay` lands the slices. Nothing touches the reputation. `src/ui/insurance.ts`: the tab under Admin, one block per cover with the basis in words, the premium a year and the twelfth in red, Take (with the first premium on the button, locked with the reason) or Drop; the red line at level 0 with property held; the commercial gate line; the payouts coming in. | `tests/engine/insurance.test.ts` (the value and the premium follow a purchase and the stock, a sold machine drops out; liability is base plus a head; taking pays the rest of the month, dropping refunds nothing, the refusals; no reputation; the 1st charges once whatever the hooks, through the game on day 1, 31, 61 and the Sunday 91; the uninsured accident in the band with the event, nothing insured; the level 0 payout is nothing, the level 1 payout is ten slices through `runInsuranceDay` and lands a slice a day through the day start); `tests/ui/insurance.test.ts` (the blocks, the controls on and off, the locked Take, the red alarm line only at level 0 with cover, the gate line, the payout row, the laptop tab) |
| T13-B1c Contracts | (this commit) | `contracts.ts`: the offer (`drawContract`, `offerContract`: from the second tier up, on working days, one on the board at a time, on the day's chance, standing `CONTRACT_OFFER_DAYS`); accept opens the term from today (`endDay` the term's weeks on) and the week in hand, pro rata for a first or last part week (`weekWanted`); `assignContract` puts a joiner on it and only a joiner, takes him off his job (which goes back to ready) and marks him `contract:<id>` in `jobId` so the jobs leave him alone (`contractHands` restores the marker every minute and drops a man the player put on a job); `runContractMinute` (called every production minute by phase A's hook) advances the piece in hand at the man's rate, the owner away factor, the hall factor and the class of the saw he actually got, through `claimMachine` so the saw stays in the general queue, the CNC when free through `cncOptions`, the by hand penalty through `stageSpeed` when the hall has no saw, resting at dinner and after five with the owner gone and with the bags full, wearing the saw and making dust through `accumulateMachineMinute`; a finished piece books `+price` and `-material` on the `contract` category, one line a day each through `charge(..., { merge: true })`; `closeWeek` on the Monday with the short week's reputation hit written down; `endContract` with the renegotiated price (`renegotiatedPriceFor`: a percent up a full week, two down a short one, whole pounds), the men off it and the `contractEnded` event carrying the closing report; `renewContract` opens a fresh term at the new price or lets it go; `closingReport`, `contractStationFor`, `contractMen`, `contractCounterLine`. `src/ui/contracts.ts`: the tab (the offer tile with Accept and Decline, the active contract with the counter, the people with Put on it and Take off, the delivered weeks, the ended one with the report and Renew or Let it go) and `renderContractBar` on the Work Plan ("31 / 60 this week" with a fill). `economy.test.ts`: the merge. | `tests/engine/contracts.test.ts` (the offer in the bands, one at a time, off the board after five days, never below the tier or on a weekend, declined; accept opens the term pro rata; a joiner on and off, the owner and the office refused, the job goes back to ready, the marker survives a minute of the clock and he is not handed a ready job, a man taken by a job is dropped; the pieces at the saw's class with the ledger, the wear and the station, one line a day, more on a pro saw without a click, waiting while somebody has the saw, stopped by full bags and dinner; the week closes on the Monday with the point of reputation, the renegotiation arithmetic, the closing report, the end of the term with the event, renew and let go); `tests/ui/contracts.test.ts` (the empty lines, the offer tile, the active block and its controls and history, the ended block's figures and buttons, the bar on the Work Plan); `tests/engine/economy.test.ts` (the merge: one line a day, the balance and the totals, a fresh line on a new day, never into an unpaid line) |

---

## 2. Numbers chosen

| Number | Value | Where | Note |
|---|---|---|---|
| (none in B1a) | | | The loan's arithmetic reads `LOAN_MAX`, `LOAN_RATE_YEARLY`, `LOAN_MONTHS`, `OVERDRAFT_RATE_YEARLY` and `DAYS_PER_YEAR` from `constants.ts`. |
| first premium on taking a cover | the twelfth pro rata by the days left in the month, the whole twelfth on the 1st | `firstPremiumFor` in `insurance.ts` | a rule, not a figure: "charged as a twelfth each month" left the day a cover is taken free, and a cover could have been switched on for a day to take a commercial job or a burglary for nothing. Nothing is free (T13 1). |
| `CONTRACT_OFFER_CHANCE_PER_DAY` | 0.15 | `contracts.ts` (T13-C1: move to `constants.ts`) | with no offer on the board and the reputation for one, the chance each working day that a shop rings; about one offer a fortnight, so the playthrough's "take the first contract offered" lands in month 1 |
| `CONTRACT_QUANTITY_STEP` | 5 | `contracts.ts` (T13-C1) | the quantity a week is drawn in fives, so an offer reads as a round number |
| `CONTRACT_CLIENTS` | six shop names | `contracts.ts` (T13-C1) | wording |
| renegotiated price | whole pounds | `renegotiatedPriceFor` | a rule, not a figure: a price a piece is printed by the one money formatter, which has no pence, so the engine rounds the offer to the pound and the two agree (two full weeks on 38 read 39; one reads 38) |
| labour at cost on the closing report | `workerMinuteCost` of the joiners' average weekly wage | `closingReport` | the job card's own figure for a joiner minute, so the report and the card cost a minute the same way; the normal joiner's wage when nobody is on the books |

---

## 3. Notes for phase C

### 3.1 `src/engine/game.ts`, `startDay`: delete the two calls that `runMonthlyItems` now makes

Phase A ran the finance and insurance months from `startDay`, before `runDayCosts`. Two things
were wrong with that: `startDay` runs on working days only, so a 1st on a weekend (day 91, a
Sunday; day 181, a Saturday) never charged the instalment or the premium; and `runDayCosts`
empties `state.finance.day` and `state.finance.month` a moment later, so the top bar's "today"
and the Summary tab never showed the loan on the 1st. Both now run from `runMonthlyItems` in
`economy.ts`, which `runDayCosts` calls for every calendar 1st after emptying the totals. Both
functions are safe to call twice on the same day (the loan counts instalments off the calendar,
the premium checks the day's ledger), so nothing double charges until this is applied, but the
first call still lands in the wrong totals. Apply:

```ts
  if (firstOfMonth(state.clock.day)) {
    runFinanceMonth(state);      // delete: runs from runMonthlyItems (economy.ts)
    runInsuranceMonth(state);    // delete: runs from runMonthlyItems (economy.ts)
    runSecurityMonth(state);
  }
```

becomes

```ts
  if (firstOfMonth(state.clock.day)) runSecurityMonth(state);
```

and the imports of `runFinanceMonth` and `runInsuranceMonth` go from `game.ts`. B4's
`runSecurityMonth` has the same two faults (a weekend 1st is skipped, and its charge lands before
the totals are emptied); the fix is the same line in `runMonthlyItems` after `runInsuranceMonth`,
with `import { runSecurityMonth } from './security'` in `economy.ts`, once B4's function is safe to
call twice on one day or the `startDay` call is gone.

### 3.2 `src/engine/index.ts`: exports

```ts
export {
  accrueOverdraftInterest,
  loanCapitalForMonth,
  loanCheck,
  loanInstalmentFor,
  loanInterestForMonth,
  nextInstalmentFor,
  overdraftInterestForDay,
  repayCheck,
  repayLoan,
  runFinanceMonth,
  takeLoan,
} from './finance';
```

(`loanCapitalForMonth`, `nextInstalmentFor`, `overdraftInterestForDay` and `repayCheck` are new;
`src/ui/finance.ts` and `src/ui/accounting.ts` import them from the module path with the
`T13-C1` comment.) To the `./economy` list add `MONTH_LINES`, `MONTH_LINE_OF`, `monthReport`,
and the types `MonthLine`, `MonthLineId`, `MonthReport`. The `./insurance` list becomes:

```ts
export {
  COVER_LABELS,
  claimBurglary,
  coversHeld,
  firstPremiumFor,
  insuranceCheck,
  insuredMachinesValue,
  insuredStockValue,
  insuredValue,
  liabilityPremiumYearly,
  monthlyPremiums,
  onAccident,
  premiumMonthlyFor,
  premiumYearlyFor,
  propertyCoverVoid,
  propertyPremiumYearly,
  refreshInsuredValue,
  runInsuranceDay,
  runInsuranceMonth,
  setInsurance,
} from './insurance';
export type { InsuranceCheck, InsuranceCover } from './insurance';
```

(`src/ui/insurance.ts` and `src/ui/accounting.ts` import from the module path with the `T13-C1`
comment until then.)

### 3.3 CSS

```css
.finance-loan,
.finance-overdraft,
.insurance-line {
  margin-bottom: 12px;
}

.insurance-line h3 .badge {
  margin-left: 6px;
  vertical-align: middle;
}
```

### 3.4 `game.ts`: the returns of `setInsurance`, `onAccident` and `claimBurglary`

`setInsurance` returns an `InsuranceCheck` now (the refusal and its reason), `onAccident` the claim
booked (zero with cover) and `claimBurglary` true when a payout was booked. `game.ts` ignores all
three today, which is fine; B4's burglary (what is taken, and the event) should read
`claimBurglary`'s answer to say whether the insurer pays.

### 3.5 `game.ts`, `runProductionMinute`: the men on a contract keep their saw, count in the
efficiency, fill the bags and make the hall dusty

Phase A's hook calls `runContractMinute(state)` and throws its answer away. It returns
`{ worked, bagsFilled }` now, and the men on a contract are not in `working`, so the
`releaseMachinesExcept` at the top of the minute walks them off the saw every minute (they take
it back inside `runContractMinute`, so the pieces are made, but a job hand who reaches the saw
first in that minute gets it: jobs have priority over contracts on a machine until this is
applied). Apply, with `import { contractMen, runContractMinute } from './contracts'`:

```ts
  // was: releaseMachinesExcept(state, working.map((hand) => hand.who));
  releaseMachinesExcept(state, [...working.map((hand) => hand.who), ...contractMen(state)]);
  ...
  // was: runContractMinute(state);
  const contract = runContractMinute(state);
  if (contract.bagsFilled) raiseBagsFull(state);
  // was: if (atWork.length === 0) { tallyEfficiency(state, 0, lost); return; }
  if (atWork.length === 0 && contract.worked === 0) {
    tallyEfficiency(state, 0, lost);
    return;
  }
  ...
  // was: tallyEfficiency(state, worked, lost);
  tallyEfficiency(state, worked + contract.worked, lost);
```

`contract.worked` is the staff minutes at the owner away factor, the same figure `worked` carries
for a job hand, so the efficiency's worked minutes and the meters agree (T13 10.3). With the early
return changed, a minute in which only contract men worked still runs `addDust`, the month's
production minutes and the hall factor, as it should.

### 3.6 `src/engine/production.ts` (B2's), `menAtJobs`: the men on a contract

`releaseIdleMachines` (after every action) reads `menAtJobs`, which lists the men at jobs only,
so a contract man is walked off his saw after every click. Apply, with
`import { contractMen } from './contracts'`:

```ts
  for (const hand of hands(state, { owner: false })) atJobs.push(hand.who);
  atJobs.push(...contractMen(state));   // add
  return atJobs;
```

`production.ts` does not import `contracts.ts` today and `contracts.ts` imports `jobs.ts`, not
`production.ts`, so there is no cycle.

### 3.7 `game.ts`, `updateStations`: where a contract man stands

A man on a contract has no job behind his `jobId`, so `updateStations` puts him at the canteen
door or at idle. `runContractMinute` writes his station every minute it runs (at the saw, waiting
at it, or at his bench), and `updateStations` overwrites it after every action. Apply, with
`import { contractStationFor } from './contracts'`, in the workers loop just before the `stuck`
line:

```ts
    const onContract = contractStationFor(state, worker);
    if (onContract !== null) {
      worker.station = onContract;
      continue;
    }
```

### 3.8 `src/engine/staff.ts` (B2's), `runNightShift`: contracts at night

Not built: `runContractMinute` counts day shift men only. If B2's night shift is to put men on
a contract, its minute loop calls `runContractMinute` too (the function reads `worker.shift`,
so the one place to lift the day shift rule is `contractHands`).

### 3.9 `src/engine/index.ts`: the contracts exports

```ts
export {
  CONTRACT_CLIENTS,
  CONTRACT_MARKER,
  CONTRACT_OFFER_CHANCE_PER_DAY,
  CONTRACT_QUANTITY_STEP,
  acceptContract,
  activeContracts,
  assignContract,
  closeWeek,
  closingReport,
  contractAssignCheck,
  contractCounterLine,
  contractHands,
  contractMarker,
  contractMen,
  contractOfWorker,
  contractPiece,
  contractStationFor,
  contractsAllowed,
  declineContract,
  drawContract,
  endContract,
  endedContracts,
  findContract,
  fullWeeksOf,
  offerCarrier,
  offerContract,
  offeredContract,
  renegotiatedPriceFor,
  renewContract,
  runContractDay,
  runContractMinute,
  shortWeeksOf,
  termWeeksFor,
  weekOfTerm,
  weekWanted,
} from './contracts';
export type { ClosingReport, ContractCheck, ContractMinute } from './contracts';
```

(the three constants move to `constants.ts` first, per their `T13-C1` comments, and are then
exported from there.)

### 3.10 CSS for the contracts

```css
.contract-bar {
  background: var(--panel-2);
  border: 1px solid var(--border);
  border-radius: 6px;
  margin-bottom: 10px;
  padding: 6px 10px;
}

.contract-count {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.contract-track {
  background: var(--border);
  border-radius: 3px;
  height: 6px;
  margin: 4px 0;
  overflow: hidden;
}

.contract-fill {
  background: var(--good);
  display: block;
  height: 100%;
}

.contract-fill.is-full {
  background: var(--good);
}

.contract-active,
.contract-ended {
  margin-bottom: 14px;
}
```

---

## 4. Foreign test edits

None.

---

## 5. Art requested

Nothing drawn in B1a.

---

## 6. Not done

- Nothing of 3.14 is missing. Built differently: a part repayment keeps the sixty month term
  and lowers every instalment still to come (the brief says only that early repayment is allowed
  at no penalty; one rule for the month was wanted, and re-amortising over the same term keeps
  "months left" honest).
- 3.15: the board gate (`NO_INSURANCE_REASON` in `refreshLocks`) is B3's and reads `coversHeld`,
  which is unchanged. The burglary itself (what is taken, and the event) is B4's; `claimBurglary`
  is the payout side only. Built differently: taking a cover pays the rest of the month at once
  (section 2 says why); the yearly liability premium counts everybody on the books, including a
  man whose start day is still ahead, because the insurer writes him in when he is hired.
- 3.16: the contract's material is money, not sheets. A piece books its `material` figure
  through the ledger and takes nothing off the rack: the shop's cut packs come from the shop's
  own boards, which is what "sold at 38 with 30 of material" says. Built differently, and said
  so: the material goes on the `contract` category (a negative line a day) and not on `material`,
  so the month end's "contract revenue and margin" line can be read off the ledger alone; the
  labour is in the wages line, so the month end's margin is revenue less material, and the
  closing report's margin takes the labour off as well (both say which). Only joiners are put on
  a contract: the owner has his own jobs and the office its desks. Men on the night shift are not
  counted (3.8 above). The event's answer needs no `resolveEvent` case: the renew question lives
  on the Contracts tab. The offer is drawn off a stream of its own (`offerCarrier`: seeded from
  the game's seed and the day, through the same `chance`, `pick` and `int`), not off the main
  stream, and a contract is named by the day it was offered rather than through `makeId`: a
  draw a day off the main stream from day 1 (the tier allows one at reputation 0, phase A's
  `CONTRACT_MIN_TIER` 1) moved every roll after it, and the sixteen measured months lost their
  figures (the Easy month came out at reputation 14 on six jobs instead of 21 on seven). The
  same game still rings the same shop on the same day, and a replay is byte for byte the same.
  Phase C may fold the draw into the main stream when it re-measures for T13-C2.

---

## 7. Cross check notes

- `charge()` is the one write; the `cash +=` and `cash -=` in `economy.ts` are inside `charge`,
  `pay` and `receive`. The grep of `src/` is in the final section of this report.
- One set of rules about people (10.3): a man on a contract is not at a job (`hands()` and
  `handsAtWork` skip him because his `jobId` finds no job; `availableJoiners` skips him because
  it is not null), the minutes he works go on `dayStats.workMinutes` and his own
  `productionMinutes` like a job hand's, and the efficiency's worked minutes will count him once
  3.5 is applied. Until 3.5 and 3.6 are applied a contract man is walked off the saw at the top
  of every minute and after every click and takes it back inside `runContractMinute`: the pieces
  are right, the queue gives jobs the machine first.
- One model of dust (10.1): the contract's saw minutes go through `accumulateMachineMinute`, so
  the family's dust figure, the hall's bags and the saw's hours read the same for a cut pack as
  for a job. The hall's own dust band (`addDust`) is game.ts's and runs only in a minute a job
  hand also worked, until 3.5 is applied.
- The offer's draws come off `offerCarrier` (the seed and the day), so the main stream reads
  the same with and without contracts and phase A's sixteen months keep their figures. It is the
  one place the engine draws off anything but `state.rng`; section 6 says why, and phase C may
  fold it into the main stream when it re-measures for T13-C2.
