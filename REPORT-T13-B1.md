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
| T13-B1b Insurance | (this commit) | `insurance.ts`: the insured value split into the machines' share and the stock's (`insuredMachinesValue`, `insuredStockValue`); `premiumYearlyFor`, `premiumMonthlyFor`, `monthlyPremiums`; taking a cover pays the rest of the month at once (`firstPremiumFor`, pro rata by the days left, the whole twelfth on the 1st) and is refused with the reason when the cash cannot cover it (`insuranceCheck`, `setInsurance` returns the check); dropping refunds nothing; `runInsuranceMonth` charges a twelfth per cover held, once a day; `onAccident` books the uninsured claim in the band and returns it (zero with cover); `claimBurglary` books the ten day payout with cover and an alarm, nothing at level 0 (`propertyCoverVoid`); `runInsuranceDay` lands the slices. Nothing touches the reputation. `src/ui/insurance.ts`: the tab under Admin, one block per cover with the basis in words, the premium a year and the twelfth in red, Take (with the first premium on the button, locked with the reason) or Drop; the red line at level 0 with property held; the commercial gate line; the payouts coming in. | `tests/engine/insurance.test.ts` (the value and the premium follow a purchase and the stock, a sold machine drops out; liability is base plus a head; taking pays the rest of the month, dropping refunds nothing, the refusals; no reputation; the 1st charges once whatever the hooks, through the game on day 1, 31, 61 and the Sunday 91; the uninsured accident in the band with the event, nothing insured; the level 0 payout is nothing, the level 1 payout is ten slices through `runInsuranceDay` and lands a slice a day through the day start); `tests/ui/insurance.test.ts` (the blocks, the controls on and off, the locked Take, the red alarm line only at level 0 with cover, the gate line, the payout row, the laptop tab) |

---

## 2. Numbers chosen

| Number | Value | Where | Note |
|---|---|---|---|
| (none in B1a) | | | The loan's arithmetic reads `LOAN_MAX`, `LOAN_RATE_YEARLY`, `LOAN_MONTHS`, `OVERDRAFT_RATE_YEARLY` and `DAYS_PER_YEAR` from `constants.ts`. |
| first premium on taking a cover | the twelfth pro rata by the days left in the month, the whole twelfth on the 1st | `firstPremiumFor` in `insurance.ts` | a rule, not a figure: "charged as a twelfth each month" left the day a cover is taken free, and a cover could have been switched on for a day to take a commercial job or a burglary for nothing. Nothing is free (T13 1). |

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

---

## 7. Cross check notes

- `charge()` is the one write; the `cash +=` and `cash -=` in `economy.ts` are inside `charge`,
  `pay` and `receive`. The grep of `src/` is in the final section of this report.
