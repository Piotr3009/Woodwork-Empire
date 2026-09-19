# Phase B1 notes: the money (CLAUDE.md T22 2.1, 2.2, 2.3, 2.4)

Branch `t22-b1`, off phase A (992d2d8). Four commits, T22-B1a to T22-B1d. Everything below is what
the lead has to know: the changes made in files that are not this agent's, the changes still owed in
files this agent could not touch, every figure chosen here, and two lines a task.

## 1. Changes still owed in files that are not B1's

The cross check of section 7 wants `grep -rn "arrears\|bailiff" src` to find nothing but the
migration. Two lines in two files B1 does not own still answer it. Both are comments; neither is
code.

### (a) `src/engine/machines.ts`: `seizableMachines` and its comment (B3's file)

2.1 says "`seizableMachines` if nothing else calls it". Nothing calls it now: `runBailiff` was its
one caller and it is gone. The whole function should go with its comment.

Exact old text (machines.ts 476 to 482):

```ts
/** What the bailiff can take: machines, cheapest first (CLAUDE.md T2 3.4). The extraction kit is
 *  not a machine and is never taken. */
export function seizableMachines(state: GameState): Equipment[] {
  return state.equipment
    .filter((item) => MACHINE_SPECS.includes(item.specId))
    .sort((left, right) => left.purchasePrice - right.purchasePrice);
}
```

Exact new text: delete those seven lines. `MACHINE_SPECS` is used elsewhere in the file, so nothing
else follows from it. If deleting an exported function is not wanted in B3's commit, the comment
alone has to lose the word, and the cross check's grep has to be read with that one line named.

### (b) `src/engine/stages.ts`: one word in a comment (B2's file)

Exact old text (stages.ts 166 to 168):

```ts
/** Machines bought and standing in the hall, cheapest first: what a workshop's capacity really is.
 *  A machine is what makes a stage faster than a man's hands (CLAUDE.md T2 3.4), so buying one opens
 *  up work already on the books and losing one to the bailiff slows it down again. */
```

Exact new text:

```ts
/** Machines bought and standing in the hall, cheapest first: what a workshop's capacity really is.
 *  A machine is what makes a stage faster than a man's hands (CLAUDE.md T2 3.4), so buying one opens
 *  up work already on the books and selling one slows it down again. */
```

## 2. Changes B1 made in files that are not on its list

Each of these had to be made for the tree to compile or for the cross check's grep, and each is the
smallest edit that does it. They are written out here with the exact old and new text so the lead
can re-apply any one of them if another group's branch touches the same lines.

### (a) `src/ui/app.ts` (B3's file for 2.10 and 2.13): six deletions, no additions

The engine has no `PAY_ARREARS` action and `renderAccounting` has lost its arrears argument, so the
tree does not compile with these in it. Every one is a deletion.

1. The `arrearsAmount: string;` field of the `Ui` interface (beside `stockSheets`).
2. Its default, `arrearsAmount: '500',` in the initial ui object.
3. The `ui.arrearsAmount,` argument in the `accounting` case of `renderModalBody`.
4. The whole `case 'openArrears':` of the click handler, with the four line comment over it.
5. The whole `case 'payArrears': {` block of the row action handler.
6. The `if (field === 'arrearsAmount') { ... }` block of the field handler.

### (b) `src/ui/styles.css`: the owes plate removed, two comments reworded

The plate itself is gone from the top bar (2.1), so `.owes-plate`, `.owes-plate:hover`,
`.owes-figure`, `.owes-line` and `@keyframes owes-pulse` are deleted with the section comment over
them: 53 lines, and nothing else in the file moves. `git diff main --stat -- src/ui/styles.css`
therefore shows deletions only and no new token of any kind.

Two comments that named the plate are reworded, because the grep reads this file too and because a
comment about a thing that is gone is a lie:

- `.name-plate`'s `flex: none` comment: "the owes plate beside it squeezed the cash into a column"
  becomes "a plate beside it squeezed the cash into a column". The rule itself stands.
- `.day-meter`'s `flex: 0 1 340px` comment loses the sentence about the plate's 212 px and the words
  "while a company was in arrears"; it now says a hard minimum put the buttons off the page on a
  crowded bar. The rule itself stands.

### (c) `src/engine/constants.ts` outside the arrears region: three comments

- The `STATE_VERSION` doc for version 19 (phase A's own words) said "the arrears are gone from the
  game"; it now says "the unpaid balance a v18 save carried beside its cash is gone from the game".
  The lift it describes has not changed.
- `WORKING_DAYS_PER_MONTH`'s comment no longer says the arrears interest threshold is measured
  against it, because there is no such threshold.
- The 8.3 section header "Debt, arrears, bailiff, bankruptcy" becomes "Debt, the overdraft, the
  loan, bankruptcy".

And in the 3.12 `WHY` table, the two notes that exist only for the arrears are deleted whole:
`arrearsInterest` and `bailiff`. `tests/engine/why.test.ts` loses its one line about the bailiff
note; the table's own shape test (two or three sentences, no dashes, a full stop) is untouched and
still passes over what is left.

### (d) `src/engine/types.ts` outside the three fields: two comments

- The doc on the `other` ledger category (phase A's) no longer names the arrears; it says the lift
  rewrites "the two categories that word took with it", which is what it does.
- The doc on `LedgerEntry.unpaid` said "a cost that became arrears, or a credit applied against
  them". Nothing becomes arrears now, and the one writer left is `noteLoss`, so it says "a loss
  noted on the books, like sheets ruined in the yard overnight (`noteLoss`)".

## 3. What 2.1 took out, in full

`state.finance.arrearsAmount`, `arrearsMonths` and `firstArrearsDay`; the `arrears` and `seizure`
values of `LedgerCategory`; the `arrearsWarning`, `arrearsFinalWarning` and `bailiff` event kinds;
the `PAY_ARREARS` action, its `PAUSED_ACTIONS` entry and its reducer case; `payArrears`,
`arrearsCarryInterest`, `runArrearsEscalation`, `runBailiff` and `netPosition` in
`src/engine/economy.ts`, with `arrearsCarryInterest` off the barrel in `src/engine/index.ts`;
`ARREARS_MONTHLY_INTEREST`, `ARREARS_INTEREST_THRESHOLD_MONTHS`, `ARREARS_MONTHS_WARNING`,
`ARREARS_MONTHS_FINAL_WARNING`, `ARREARS_MONTHS_BAILIFF` and `BAILIFF_SEIZURE_FRACTION`; the
`arrearsInterest` and `bailiff` notes of `WHY`; the arrears leg of `refund`; the arrears interest of
the month's items; the owes plate of the top bar with its CSS; the arrears block of Accounting's
Summary with the `Arrears` and `Seized by the bailiff` category labels and the two `WHY_BY_CATEGORY`
lines that pointed at the two deleted notes; the `Arrears` and `Together` rows of the bank's card;
and `tests/ui/owesPlate.test.ts`, whose subject no longer exists.

`state.lateAccountsMonths` and `runLateAccounts` stay, as the brief says: the accountant's bill is
not arrears, and it now goes through the limit like every other forced cost.

`monthlyFixedCosts` stays. Its one caller in `src` was `arrearsCarryInterest`, but it is a reading of
the company's own fixed costs and it is exported from the barrel, so it was not deleted on the way
past; `tests/engine/economy.test.ts` no longer calls it.

The `interest` ledger category stays. Nothing writes it now (its one writer was the arrears
interest), but old saves carry lines under it and its label, `Interest`, is what they should print.
Its real life note is gone with the arrears, so `interest` is simply off `WHY_BY_CATEGORY`.

## 4. Figures and readings chosen here

- **[TUNE] the crew in the 2.1 wages test: five men at 2,600.** The brief's own clause is "wages on
  the last working day with 200 in the bank and a 10,000 limit leave the account at its true figure
  below the limit". 200 in the bank against a 10,000 limit is 10,200 of room, so a wage bill under
  10,200 does not put the account below the limit at all, and Turn 21 would have paid it too: the
  clause only bites with a bill bigger than the room. The test uses five men at the experienced
  joiner's 2,600, a bill of 13,000, which is over the room and short of the 15,200 that would take
  the company past the bank's own line the same morning. Piotr's 200 and 10,000 are kept.
  The measured figure: **the account ends the pay day at -13,099**, which is 200 less 13,000 of
  wages less the day's own 299 of rent, rates, power and the owner's draw. Turn 21 would have left
  it at -10,000 with 3,099 standing beside it.
- **The day an empty hall on Hard is closed is still day 22**, in `tests/scenarios/thirtyDays.test.ts`
  and `tests/scenarios/turn21.test.ts` alike. It does not move, because the arrears and the cash
  were the same pounds counted in two places: what changes is that the account now shows them. The
  count of days below the overdraft limit at the close is no longer nought, which is the answer to
  item 23 of REPORT-T21.md.
- **[TUNE] the strip's first day.** The count of days below the limit is taken once a calendar day,
  at the day's open, so on the afternoon a bill first takes the account under the limit
  `daysBelowOverdraft` still reads nought and the line would say "day 0 of 30", which is not
  English. The line reads `Math.max(1, days)`: the day the player is living through is the first of
  the thirty. Nothing about the count itself or about the close was changed for it.
- **Nothing else was chosen.** Every other figure in these four commits is Piotr's (the 1.5 of
  `BANKRUPTCY_LIMIT_FACTOR`, the 30 days, the 200 and the 10,000 of 2.1's clause, the 7,000 and the
  50,000 of the drop) or is measured off the run and asserted as measured.

## 5. Two lines a task

**T22-B1a, 2.1.** `chargeUnavoidable` pays in full, below the overdraft limit included, and the
account goes under the limit for it: `charge` refuses a cost past the floor only when the player
chose it, `pay` and `chargeUnavoidable` both go through that one path, and `refund` is cash again.
Everything in section 3 above went out with it, and `tests/engine/economy.test.ts` has a new
describe block in place of the arrears ladder: the wages paid through the limit, a company at the
limit going under it the same day, a machine still refused at the limit, and a refund landing in
cash.

**T22-B1b, 2.2.** The bank's two rules read the cash alone: `cash <= 1.5 * overdraftLimit`, and the
thirtieth calendar day in a row with `cash < overdraftLimit`, both looked at in the morning where
Turn 13 looked. The card says three figures, `In the bank`, `The bank allowed` and
`Days below the limit` (`12 of 30`, off the event, not money), and keeps its skin, its epitaph and
its two buttons. The strip carries one line while the account is under the limit:
`Account -£18,200 is below the bank's -£10,000 limit: day 12 of 30.`
Rule two is reachable by playing now, and there is a played test of it: a company trading below the
limit, its bills out of the account and a client paying what each day cost, stands there for
twenty nine days and is closed on the thirtieth morning, with the experienced joiner's 2,600 of
wages paid out of an account already under the limit on the way (asserted off the ledger line's own
balance). Its own three tests are in `tests/engine/bankruptcy.test.ts`, beside the reset and the 1.5x
rule, which stand as they were.

**T22-B1c, 2.3.** The drop card's red box, shown as before only when the deposit cannot be paid out
of the cash and the overdraft, now reads the account and not a debt: `You cannot pay the deposit back
from the overdraft. The account goes to -£18,000 against the bank's -£15,000.` The figures are
`cash - depositPaid` and `BANKRUPTCY_LIMIT_FACTOR * overdraftLimit`, through the renamed
`accountAfterDrop` (Turn 21's `netAfterDrop`, which read a state with the deposit on the arrears).
The last sentence is one of two and never a guess: `Dropping this job closes the company at
tomorrow's check.` when rule one would fire on the account the drop leaves, and otherwise
`The bank counts every day below its limit.`, which is the one thing true of every account below the
limit. Both texts are asserted whole in `tests/ui/dropCard.test.ts`, and the played (hh) scenario
asserts the first of them word for word.

**T22-B1d, 2.4.** The month end card and Accounting's Summary drop their arrears rows and nothing
else on either moves. `MonthReport.unpaid` is gone with the paragraph that printed it, because there
is no bill left that the bank did not pay; the one line of `monthReport` that keeps a line with no
cash behind it out of the month's figures stays, and `noteLoss` (sheets ruined in the yard) is the
only writer of one now. The Summary's arrears block went out in 2.1, where the field it read was
deleted. The two render tests are the ones 2.4 asks for: the month end card of a month played under
the overdraft limit carries no paragraph at all, no word of the arrears, and its head, its seventeen
lines, its three totals and its two cash rows are where they were, with the report still adding up
to the cash the month moved; and the Summary of a company 2,000 under its limit carries no arrears
text, no `payArrears` control and no typed field, with its four totals blocks, its earned rate line
and every row of what is coming still on it.

## 6. Two things phase C should know

- **`tests/scenarios/turn21.test.ts` was brought up to the new truth, not rewritten.** Its (hh) is
  the ancestor of Turn 22's (kk) and its (ii) of (jj), and C2 owns both. What B1 changed: (hh) now
  pays the deposit out of the account (the click leaves -18,000, the next morning's check closes the
  company at -18,307) and asserts the new box text; (ii) now asserts that the count of days below
  the limit does climb, and that for a company standing still it is still the amount that closes it,
  because at 307 a working day the room between the limit and 1.5 times it runs out around the
  twenty first day. The played thirtieth day is in `tests/engine/bankruptcy.test.ts`.
- **The scenario of (jj) needs a company that keeps earning.** A company that stands still cannot
  reach the thirtieth day on any difficulty: the room below the limit is half the limit again, and
  the standing costs alone eat it in about twenty days. What reaches it is a company trading at or
  near break even under the limit, which is what the engine test builds by having a client pay what
  each day cost.
