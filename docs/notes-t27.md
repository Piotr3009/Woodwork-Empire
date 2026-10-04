# Notes from Turn 27

One agent, serial, no worktrees. This file is what did not fit in `REPORT-T27.md`'s two lines a
task: the readings of the brief that were not the only possible one, what the changes found in the
engine, and what a later turn will want to know before it touches the same code.

---

## 1. The calendar the tax lives on

The game's months are thirty days and its weeks seven, so the weekdays walk round the dates. Day 1
is Monday 1 March 2025, and in the first year:

| what | day | date |
| --- | --- | --- |
| the first working day of December, the warning | 271 | Friday 1 December 2025 |
| the last working day before the tax, the month's wages | 299 | Friday 29 December 2025 |
| the tax | 300 | Saturday 30 December 2025 |
| the first day of 2026 | 301 | Sunday 1 January 2026 |
| the first working day of January, December's report | 302 | Monday 2 January 2026 |

So the first tax is booked on a weekend day, in the clock's walk over the weekend (`advanceToNextDay`
runs `runDayCosts` for every day it steps over), and the player meets its card on Monday morning,
before the weekend's own card and December's report. In 2026 the 30th is a Tuesday (day 660) and the
tax is the first thing of that working day's open, before its rent. `runDayCosts` is the one place
every calendar day's money is settled, so the tax is its first line and there is no second path.

## 2. The year is on the bar and nowhere else

`formatDate` was the bar's line and also the laptop's home line (`.screen-clock`). The brief puts the
year on the bar and the tax's words alone tonight, so the laptop prints `formatCalendarDay` and
`formatTime` and reads as it did [TUNE]; `topbar.ts` itself is not touched, because `formatDate` carries
the year. The mockup's date is the brief's `Wed 30 September 2027`; in the game's calendar that 30th is
a Thursday (day 900) and Wednesday 30 September is 2026 (day 570). All weekday names are three
letters, so the width is the same: 227 px of date over the knobs' 268 px row, and nothing else on the
bar moves.

## 3. Why the tax has two fields of its own

Section 4 asked the ledger first. It cannot say two things: that the warning was given (a card is not
a ledger line) and that a year was settled with nothing taken (an account at nought books nothing).
It also keeps only its last 2,000 lines. So `finance.taxPaidForYear` is the last year whose 30
December has been settled, a tax of nothing included, and `finance.taxWarnedForYear` the last year
the player was told; STATE_VERSION 40 adds both as null. A v39 save is warned on its next open in
December (asserted on a save of Wednesday 10 December 2026) and charged on the next 30 December it
plays through; a save in January has no 30 December behind it to be charged for.

## 4. Readings of the brief

- An account at nought or under pays nothing and is told nothing on the 30th; the warning says
  `Nothing as it stands today.` and the strip says nothing [TUNE: chat asked Piotr and has no answer
  yet]. The warning's sentence about the figure is its own sentence after a full stop when it is
  nothing, and after a colon when it is a figure, as the brief writes the figure [TUNE].
- The warning is raised at the open of the first working day of December after November's report,
  and its figure is the tax on the account after that day's own rent, rates, power and draw.
- The strip's line stands under `spendingOverEarning` and above `crewFull` [TUNE, the brief's], and
  the strip shows one line, the most urgent: a week that spends more than it earns hides the tax.
- The card at the tax is raised with the booking, so it is the first card the player meets after it,
  whenever he is next at the page.

## 5. What the tax does and does not see

It is a quarter of `state.cash` and of nothing else, as Piotr gave it: a loan drawn in December is
cash in the account and is taxed with it, and so are the deposits clients have paid for work not yet
made. Section 8 parks whether it should spare the deposits; nothing here does. Money spent before the
30th is not seen: a machine bought on Friday 29 December takes its price out of what is taxed
(asserted: 48,000 less a 7,000 saw pays 10,250 and not 12,000). Buying to dodge and selling in
January loses: a machine sells for half its price (`SALE_FRACTION` 0.5), so each pound spent saves
25p of tax and brings back 50p at best.

## 6. The prices

- The extension is 250,000 [PIOTR]. With the landlord's month of the bigger rent beside it, a company
  on the starting rent needs 252,400 in the account at the click.
- The fourteen prices are written into the variant tables as the figures (1.2 times v80's), not as a
  factor applied on top, so the table and the card read one number. What reads a catalogue price
  follows it: the insurance line of the class card (2% a year), and for a machine bought from tonight
  its service (a tenth), its repair (a twentieth), its wear on a contract and its sale price (half),
  all off its own `purchasePrice`. A machine already owned keeps the price it was bought at, so
  nothing of a played hall moves. The contract entry point reads the standard class and the machine
  tip the used one, so no contract price moved; the hire card's missing kit reads the cheapest class.

## 7. What A0 found beyond the figures

- **The three month playthrough loses its production manager to v77.** On v77 and v78 the bank closed
  it on day 89 (measured on v78's tree, as chat measured it); v79's tenth on the owner's base and its
  40 courier carry it to the end again, but month 2 closes at -2,713 and no working day of month 3 has
  a manager's month of pay in the account, so there is no manager and no holiday, as on v60 to v62.
- **A novice's month is now nearly the whole band between the limit and the floor.** On Very easy the
  overdraft limit is -10,000 and the bank's floor -15,000; the novice's 4,550 on the month's last
  working day is 91% of that 5,000. (jj) had to write its company 1,800 under the limit and not 1,000
  (v77's contract price of 83 brought the account back over the limit on day 25), and the wages of day
  30 then leave it 132 inside the floor. Any later change to the wages or the contract price will move
  it again.
- **The best machine of a family is filled first (v70).** A man at a family stands at its best class,
  so T13's (x), which put one man on the first saw bought, runs three men to have both saws worked.
- **v79 left the minutes of a 400 job at 218.18.** Two Work Plan tests that put the clock on a whole
  minute price their job 440, whose 240 minutes are whole again on 352 a day.

## 8. The copyright header

Piotr's rule of 22.09 (Petros, `petros/zasady`) puts the Skylon Development Ltd header on every new
code file of every project, Woodwork Empire among them. Tonight's new files carry it
(`src/engine/tax.ts`, `tests/engine/tax.test.ts`, `tests/engine/topClassPrices.test.ts`,
`tests/ui/taxCards.test.ts`, `scripts/balance-t27.ts` and the new scenario file); no older file of
this repo has it and there is no `LICENSE`, which is Piotr's to decide and was not touched.

## 9. The measurement

`docs/balance-t27.md` (T27-C3): twelve years of a new company played by the script, with the tax
inside them.
