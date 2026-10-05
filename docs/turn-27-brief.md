# Turn 27: the year, the taxman, and dearer top machines

Woodwork Empire. Autonomous session brief for Claude Code (cloud, one agent, serial, effort high).
Owner: Piotr. Programmer: Claude. Spec author: Claude (chat), written 04.10.2026 from Piotr's
words of 03.10 and of that morning, against main at v80.

Read this whole file (first line must say "Turn 27"; if the root CLAUDE.md does not, stop and
report), then REPORT-T26.md section 0 and its "what was not done", then docs/ui-style.md, then the
archived briefs in docs/ (docs/turn-26-brief.md is the last). Where files disagree, this one wins.
All standing rules apply (no em or en dashes anywhere, scope 1:1, one code path, constants never
in the UI, [TUNE] for every figure you choose and [PIOTR] for his, kill background processes, PR
without merge, end the session, no PR watching, npm run check gated on its own exit code, every
click single, one APP_VERSION bump, delete the old track and never write a parallel one, flip a
test and never keep it beside a new one). The rule relaxed in Turn 26 stays relaxed [PIOTR,
01.10: "too much time and tokens go on tests"]: a scenario figure that moves is restated with ONE
line of reason, not the ledger by category; a test that pins an exact pound of a played month may
be loosened to a range when the exact figure says nothing about the rule under test, and the
comment says so.

Precondition. main carries Turn 26 merged and the chat fixes v63 to v80: APP_VERSION 'v80',
STATE_VERSION 39. If APP_VERSION is not 'v80', stop and report. The chat fixes v64 to v80 went
onto main with their own test files run and the full suite run seldom or not at all (chat's own
note has it last run around v67), on purpose: task A0 below runs it and settles it before
anything else is touched. What they changed is listed in section 2.0, so a moved figure can be
given its reason.

One thing runs beside this session. Piotr's logo is being put on the start screen, the menu and
the page's head by a chat fix while this session works, and it will land on main before or after
this PR. So that the two never meet in one line, this session does not touch `index.html`,
`src/ui/start.ts`, the `.start` and `.menu-pop` rules of `src/ui/styles.css`, the menu's markup in
`src/ui/topbar.ts` (the date of 2.1 is the only thing of that file this turn changes), or anything
under `public/brand/`. The chat fix does not bump APP_VERSION.

The four rules of 18.09 bind every agent: one game, one look; nothing visual without a mockup;
no sound without a recorded file; every modal, popover and list has the cross, Escape and click
outside. The mockups this turn needs are in section 9, into docs/mockups/t27/ before the code
that makes them true.

## 0. What this turn is for (PIOTR, 03.10 and 04.10)

Piotr's day 806 company has £1,470,000 in the account and nothing to do with it: "the money just
piles up". On 03.10 he said what the late game is to get, and on the morning of 04.10 which of it
goes in now: "Launch the tax. The extension. Leave the debt as it is. Machines 20% up, but only
the two highest; leave the cheap ones as they are. Leave those pipes."

So, four things, and two pieces of housekeeping round them.

**The year.** "We write the years as well; we start from 2025." The game opens on 1 March 2025
and the date on the bar says which year it is.

**The taxman.** "The tax on 31 December, 25 per cent of the cash that is in the account. A month
before the tax a warning: the tax is coming, are you investing in new machines or in growth?"
The point is the choice in December: spend it on the workshop, or hand a quarter of it over.

**The extension costs more.** The second half of the hall is £250,000 and not £120,000.

**The top machines cost more.** The two highest classes of every machine are twenty per cent
dearer; the three under them are what they were.

**The suite.** Seventeen chat fixes went onto main with little more than their own test files
run. A0 runs everything and settles it.

**A measurement.** The first months of a new company lose money, and Piotr found the start
"impossible to get through" on v78; v79 gave the owner ten per cent and a cheaper courier. Nobody
has measured where a new company stands after that, or with a tax at the year's end. Task C3
measures it and changes nothing.

Nothing about the pace arithmetic of v61, the wages of v77, the owner's base and the courier of
v79, the loan, the overdraft, the pipes, the contracts, the agency, the canteen or the walking
changes tonight, except where a section below says so by name.

## 1. Rules restated (short)

Everything from Turns 1 to 26 and the chat fixes to v80. Tonight in addition:

- APP_VERSION = 'v81'. STATE_VERSION 40 in task B2, once, and only if the tax needs a field of
  its own (section 4); every v25 to v39 save loads, the fixtures in tests/fixtures among them.
- **The game has a year, and it starts in 2025** [PIOTR, 03.10].
- **A quarter of the account goes to the taxman at the year's end** [PIOTR, 03.10, 04.10].
- **The player is told a month before, and told what he can do about it** [PIOTR].
- **The loan is as it is** [PIOTR, 04.10: "leave the debt as it is"]. No minimum repayment, no
  new warning, nothing of `finance.ts`'s loan touched.
- **The pipes are as they are** [PIOTR, 04.10].

## 2. Changes to the design (the contract)

### 2.0 What the chat fixes v64 to v80 changed (for A0's reasons)

Each of these was pushed with `tsc`, lint and its own test files green; the comments in the
source carry the version, `(v71)`, beside what it changed.

- v64 to v66: small fixes after Turn 26 (a big job's emails counted at a capped price, v65).
- v67: the unit's extension and the enlarged canteen. v68: the CNC no longer stands in for the
  saw, reversing v62. v69: the high capacity rack. v70: the Break card's `Do not ask again`.
  v71: a man walks into a booth and into nothing else. v72: Our team's tiles by trade.
- v73: the drying racks (`dryingRacks`, storage, one per booth, six times the booth's places,
  £40,000, fifteen days), the Drawings page's `Take over`, the extraction plant drawn behind the
  rear wall. STATE_VERSION 38.
- v74: the day one list is ticked by a central system for the extractor and by the high rack for
  the rack (`DAY_ONE_STAND_INS`).
- v75: the office admin, the salesman and the draftsman are never drawn on the hall; the manager
  on the hall wears white; unloading takes longer by the hundred sheets and the sweep by the
  size of the crew (`unloadMinutes`, `cleaningMinutes`).
- v76: four vans and the electric pallet truck have pictures; houses 4 to 8 are new pictures and
  the house card is a wide picture.
- v77: every wage is up by 6,860 over 2,940 (a joiner 4,550 / 5,765 / 6,860 / 7,815), so that
  labour is forty per cent of the price at a pace of one. STATE_VERSION 39; a save's men are
  lifted to today's wages. Thirteen scenario assertions in `playthrough`, `turn13`, `turn20` and
  `turn22` were left red for this session, by name.
- v78: a title on the speed chips; a new line on the warning strip, `drawingDone`, under the
  deadlines.
- v79: the owner's base is 352 of labour a day and not 320, and every man is counted from it; a
  courier is £40 for a job of up to £10,000 (`courierCostFor`); a client's deadline is counted
  from the same base, so it is about a tenth shorter.
- v80: the two better forklifts, the air dryer, the desk, chair, laptop and locker have pictures;
  the enlarged canteen is a room of its own with sixteen plates at once, and the line that
  turned its page is gone.

### A. The suite

**2.0.1 A0.** Run `npm run check` on main as it stands. Every failing test is one of three
things, and the report says which for each:

1. A figure one of the fixes above moved: re-pin it, one line of reason naming the fix.
2. A scenario whose company the bank now closes before the scenario's own end (v77 made the
   first months dearer; the three month playthrough was closed on day 89 when chat measured it
   on v77). That is not a figure to re-pin. Give the scripted player the smallest change, in the
   scenario's own policy and never in the engine, that lets the months run (a loan taken a day
   sooner, a hire a week later, a second job open), say it in one line, and re-pin what follows.
   If no such change lets it run, mark that one scenario `it.skip` with one line of reason and
   list it under "what was not done"; that is the only place tonight a test may be skipped.
3. A real fault a fix introduced, which no test file it ran could see. Fix it if the fix is
   plainly what the chat fix meant; otherwise leave the test red, stop that thread, and put it
   first in section 0 of the report.

Nothing of the engine is touched in A0 beyond case 3. One commit.

### B. The game

**2.1 The year [PIOTR, 03.10].** The company opens on 1 March 2025: `START_YEAR` 2025, and
`calendarYearOf(day)` in `clock.ts` is the calendar year of a game day, counted off `START_MONTH`
and the twelve thirty day months the calendar already has (day 1 to 300 are 2025, day 301 is
1 January 2026). `yearOfDay`, which counts game years from the opening, stays what it is for
whoever reads it. The date on the top bar carries the year, `Mon 26 May 2027 · 11:17`: that is
`formatDate`. `formatCalendarDay`, which every other screen prints a date with, stays short, with
no year; the year is on the bar, in the tax's own words (2.2, 2.3) and nowhere else tonight
[PIOTR: the year and 2025; TUNE: where it is printed]. Mockup first: the bar at 1,280 wide with
the longest date the calendar can make (section 9).

**2.2 The tax [PIOTR, 03.10, 04.10].** Once a calendar year, on the last day of December, the
taxman takes `TAX_RATE` 0.25 [PIOTR] of the cash in the account. The game's months have thirty
days, so the day is 30 December [PIOTR said the 31st; the calendar has none]. It is booked when
that day opens, on the cash as it stands that moment and before anything else of the day is
charged, weekend or not: one ledger entry, category `tax`, label `Tax for 2025` with the year it
is for, the amount a quarter of the cash rounded to the pound. With the account at nought or
under it there is nothing to take and nothing is booked [TUNE: chat asked Piotr and has no
answer yet; say so in the report].

What it is and is not: it is 25% of `state.cash` and of nothing else. It does not look at the
profit, the stock, the machines, the loan or the deposits clients have paid for work not yet
made. That is Piotr's rule as he gave it, and it is what makes December a decision: money spent
on a machine or on the extension before the 30th is money the taxman does not see. A machine
sold afterwards brings half its price (`salePriceFor`), so buying to dodge the tax and selling
in January loses more than the tax; nothing has to be done about that, and the report says so
in one line.

Where it shows: its own line on the month report (`MONTH_LINES`, `Tax`), so December's report,
drawn on the first working day of January, carries it. It is not one of
`SPEND_WARNING_CATEGORIES`, not a fixed cost of the workshop rate, and not turnover. The first
time the player is at the page after it is booked, an event card says it once: title
`Tax for 2025`, body `The taxman took 25% of the £48,000 in the account: £12,000.`, one choice
`Right`. No card when nothing was taken.

It is booked only on a 30 December the game plays through. A save loaded in a later month is
not charged for a year it has already left, and no save is charged twice for one year (section 4).

**2.3 The warning [PIOTR: "a month before the tax, a warning: the tax is coming, are you
investing in new machines or in growth?"].** On the first working day of December, once a year,
an event card: title `Tax is coming`, body `On 30 December the taxman takes 25% of whatever is in
the account: £12,000 as it stands today. Money spent on machines or on the workshop before then
is not taxed. Invest, or pay.`, one choice `Right`. The figure is the tax on today's cash; with
the account at nought or under, the sentence about the figure reads `Nothing as it stands today.`

And from that day until the tax is booked, a line on the warning strip, a new `WarningKey`
`taxComing`: `Tax on 30 December: 25% of the account, £12,000 as it stands`. It is said only
while there is cash to tax. Its place in `WARNING_ORDER` is under `spendingOverEarning` and above
`crewFull` [TUNE]: it has a date on it, where the crew line can stand for a year.

Mockup first: both cards and the strip line (section 9).

**2.4 The extension costs £250,000 [PIOTR, 04.10].** `UNIT_EXTENSION_PRICE` 120,000 becomes
250,000. The Premises page, the deposit beside it and the refusal for want of money read the
constant and change nothing else. A unit already extended is extended.

**2.5 The two top classes of a machine cost a fifth more [PIOTR, 04.10: "machines 20% up, but
only the two highest; leave the cheap ones as they are"].** The catalogue price of the `pro` and
the `industrial` class of every family whose category is `machine` and which has the five
classes goes up by exactly 20%. That is seven families, and these are the fourteen prices
[PIOTR: the 20%; the figures are its arithmetic]:

| Family | pro | industrial |
|---|---|---|
| tableSaw | 15,000 to 18,000 | 25,000 to 30,000 |
| edgebander | 16,000 to 19,200 | 32,000 to 38,400 |
| compressor | 9,000 to 10,800 | 22,000 to 26,400 |
| thicknesser | 11,000 to 13,200 | 22,000 to 26,400 |
| spindleMoulder | 16,000 to 19,200 | 28,000 to 33,600 |
| cnc | 75,000 to 90,000 | 120,000 to 144,000 |
| sprayBooth | 32,000 to 38,400 | 55,000 to 66,000 |

`used`, `budget` and `standard` of those seven are what they were. Every other family is what it
was: the extractors, the vans, the forklifts, the benches, the racks, the cabinets, the single
class kit (the central systems, the drying racks, the tool changer head, the pelletiser).
Whatever the game reads off a catalogue price follows it as it always has (insurance, the
refusal for want of money, the loan's reading of the kit if it has one); a machine already owned
keeps the `purchasePrice` it was bought at, so its sale price does not move. Say in the report
every figure beside the fourteen that moved.

### C. The measurement

**2.6 Where a new company stands (a report, no rule changed).** With everything above in, the
scripted player of `tests/scenarios/autopilot.ts` plays twelve months, 1 March 2025 to the end of
February 2026, so the first tax is inside it, on each of the three difficulties, four times: the
owner alone, with one joiner with no experience from day 1, with two, and with four experienced
joiners and the machines a careful player would buy them [TUNE: say which]. Twelve runs. For each,
`docs/balance-t27.md` has one table, a row a month: money in, material, couriers, wages, the
fixed costs (the draw, the rent, the rates, the power, the rest), the net, the account at the
month's end; and under the table the first month the company ended in the black, the day the
bank closed it if it did, and the tax it paid. Then one page of what the tables say, in plain
words, with no recommendation of a number: the levers are Piotr's. The script's limits are said
at the top (it takes the work it is told to and never haggles; a player does better). The runs
live in a scenario file that is not part of `npm test` (a script under `scripts/`, or a test
behind an environment flag), so the suite is not an hour longer for it.

## 3. How to run this session

One agent, serial, in the order of section 5. No worktrees, no agent teams. A0 first and alone,
one commit, `npm run check` green on its own exit code. Then the mockups of section 9, then B1
to B4 one commit each, then the scenarios, the measurement, the cross check of section 7, the
pictures, the report, the PR.

## 4. State

The tax must never be taken twice for one year and never for a year the save has left. If the
ledger alone can say that (an entry of category `tax` whose label carries the year), no field is
added and STATE_VERSION stays 39. If a field is cleaner (`finance.taxPaidForYear: number | null`,
and one for the warning card, `finance.taxWarnedForYear`), STATE_VERSION 40, once, in B2: a v39
save opens with both at `null`, and a save loaded in December after the first working day gets
its warning card on the next day's open and not never. Every v25 to v39 save loads, the fixtures
among them. Say in the report which of the two was chosen and why.

## 5. Task queue, in order

Branch turn-27-the-taxman from main. One commit per task, npm run check green on its own exit
code before each, two report lines per task in REPORT-T27.md.

T27-A0 The suite settled on v80 (2.0.1): nothing of the engine touched but a real fault.
T27-A1 Housekeeping and v81: docs/turn-26-brief.md is already in docs/ (this ZIP put it there),
this file as CLAUDE.md, the README's lines, APP_VERSION 'v81'. `git rm` the two dead files
`public/sprites/palletTruck.standard.png` and `public/sprites/palletTruck.standard.r.png`
(renamed in v54, listed for deletion since v61) and put the two turned sprite counts right; if
the session's permissions refuse the delete again, leave them, say so, and move on.
T27-A2 The mockups of section 9 into docs/mockups/t27/ with a README.
T27-B1 2.1 the year. T27-B2 2.2 and 2.3, the tax and its warning, and the state of section 4.
T27-B3 2.4 the extension. T27-B4 2.5 the fourteen prices.
T27-C1 notes (docs/notes-t27.md). T27-C2 scenarios, one line a moved figure; a new scenario
(uu): a company with cash played from 28 November 2025 to 2 January 2026 gets the card on the
first working day of December, the strip line every day of the month, the tax on the open of
30 December as a quarter of the cash that moment, the card that says so, and December's report
with the line; and the same company with the account under nought gets the card with `Nothing
as it stands today.`, no strip line and no tax. T27-C3 2.6, the measurement. T27-C4 cross check.
T27-C5 look and shoot: six pictures into docs/report-t27/ (the bar with the year; the warning
card; the strip line in December; the card on 30 December; the Premises page at £250,000; the
catalogue's CNC folder with £90,000 and £144,000). T27-C6 report (REPORT-T27.md) and PR titled
`Turn 27: the year, the taxman, and dearer top machines`, do not merge, end the session.

## 6. Do not (tonight)

- No change to the loan, the overdraft, the bankruptcy rules, or any repayment [PIOTR, 04.10].
- No change to the pipes, the extraction's routing, or what moving a fan does [PIOTR, 04.10].
- No change to the pace arithmetic, the wages, the owner's base, the courier, the deadlines'
  rule, the job templates' prices, the contracts, the agency, the reputation.
- No price moved but the fourteen of 2.5 and the extension's.
- No year printed anywhere but the top bar and the tax's own words.
- Nothing of `index.html`, `src/ui/start.ts`, the `.start` and `.menu-pop` rules, the menu's
  markup, `public/brand/` (the logo's chat fix, see the top of this file).
- No sound; no new screen; no picture drawn by an agent for the game; no sprite touched but the
  two deleted.
- No storage access outside src/cloud/store.ts; no PixiJS, mobile, Steam, Electron.
- No watch loops, nothing left running.

## 7. The cross check (before the PR)

- `npm run check` green on its own exit code; the count of tests and files in the report; every
  `it.skip` in the tree listed with its line of reason (the aim is none).
- Day 1 is `Mon 1 March 2025` on the bar, day 300 is in December 2025, day 301 is
  `1 January 2026`, asserted on `calendarYearOf` and on `formatDate`; `formatCalendarDay` prints
  no year, asserted.
- A company with £48,000 at the open of 30 December pays £12,000, once, under `tax`, labelled
  with its year; the same day opened twice (a save and a load) pays once, asserted.
- A company at nought and one at minus £3,000 pay nothing and are shown no card, asserted.
- A machine bought on 29 December takes its price out of what is taxed, asserted on the ledger.
- The warning card is raised once on the first working day of December and not again that year;
  a save loaded on 10 December that never saw it sees it on the next open, asserted.
- `taxComing` is on the strip from the card to the tax and not a day after, asserted; it sits
  under `spendingOverEarning` and above `crewFull` in `WARNING_ORDER`, asserted.
- December's month report carries a `Tax` line with the amount, asserted.
- `UNIT_EXTENSION_PRICE` is 250,000 and the Premises page says £250,000, asserted.
- The fourteen prices of 2.5, each asserted; the `standard` class of each of the seven families
  and the `pro` and `industrial` of the extractor, the van, the forklift, the bench, the rack and
  the cabinet are what they were, asserted; a `pro` saw bought before tonight sells for half its
  own `purchasePrice`, asserted.
- `git diff main --stat -- index.html src/ui/start.ts public/brand` is empty.
- Every scenario green or accounted for under 2.0.1; a moved figure restated with one line.
- `docs/balance-t27.md` has its twelve tables.
- Every changed screen beside its nearest existing one in the report; `git diff main --stat --
  src/ui/styles.css` with no new token.
- The six pictures.

## 8. Parked

- A minimum repayment of the loan at the month's end, with its warning [PIOTR, 03.10 raised it;
  04.10: "leave the debt as it is"].
- The third stage of the unit at a million; timber machines much dearer with better contracts;
  the holidays forced on the owner once he has a manager; accidents; the crisis; robots
  [PIOTR, 03.10: the scenario, later].
- The difficulty of the start: after 2.6's tables, in chat.
- The year on the other dates, the month report's title by the month's name and year.
- Whether the tax should spare clients' deposits, or count stock and machines.
- The pipes of a fan that was moved; the label over a man; the contract card's manager.

## 9. Mockups (docs/mockups/t27/)

Before the code: (1) the top bar at 1,280 wide with `Wed 30 September 2027 · 11:17`, before and
after, in the bar's own classes, so the longest date is seen to fit beside the speed chips;
(2) the warning card of 2.3 and the card of 2.2 in the event modal's own classes, beside the
month report's card for size; (3) the strip with the `taxComing` line. A README names which is
which. No art is asked of the art side tonight.

End of brief.
