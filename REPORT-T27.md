# Report, Turn 27: the year, the taxman, and dearer top machines

Woodwork Empire, Turn 27. Built against `CLAUDE.md` of 04.10.2026 (first line "Turn 27").
Branch `claude/turn-27-the-taxman-fqshvp`, the name this session's harness gave the brief's
`turn-27-the-taxman` (pushes go to that branch and no other), off `52b808a`, the tree `origin/main`
stands on (v80, STATE_VERSION 39).

## The tasks

**T27-A0 The suite settled on v80.** On main as it stands `npm run check` failed 49 of 2,524 tests in
22 of 268 files, lint and build green. Every one is case 1, a figure a chat fix moved: 35 by v79 (the
owner's base of 352, every man counted from it, the 40 courier), 12 by v77 (the wages), one by v70
(the best machine of a family filled first) and one by v80 (the air dryer's picture). 41 are re-pinned
where they stand with one line of reason; in three setups the fix had moved the premise the test was
built on, and the smallest change was made to the test's own input and said in one line: (x) runs
three men and not two at the saws (v70), (jj) writes the account 1,800 under the limit and not 1,000
(v77, as v40 did), and two Work Plan bar tests price their job 440 and not 400 so its minutes stay
whole (v79). The three month playthrough was closed by the bank on day 89 on v77 and v78 (measured on
v78's tree), but v79 carries it to the end again, so no case 2 is left on v80 and nothing is skipped;
no case 3 was found and nothing of the engine was touched.

| file | test | case | the fix and what moved |
| --- | --- | --- | --- |
| engine/air | runs every pneumatic consumer ... at 0.7 | 1 | v79: twenty bench minutes 10.6667 of labour, not 9.6970 |
| engine/assignees | runs a cutting stage at three men s speed less the saw s line | 1 | v79: 6.94 and 17.89, not 6.31 and 16.27 |
| engine/cnc | stands the two men at the CNC and the benches | 1 | v79: the owner's hour at the CNC 49.91, not 45.37 |
| engine/day128 | spreads the four men over the kitchen s machines | 1 | v79: the half hour 78.84, not 71.67 |
| engine/earnedRate | earns ... an hour with the used saw | 1 | v79: his hour is 44 and not 40, so 38.66, not 35.14 |
| engine/earnedRate | earns ... an hour with the standard saw | 1 | v79: 39.53, not 35.93 |
| engine/earnedRate | a joiner with no experience earns ... 0.6 of the owner | 1 | v79: 23.72, not 21.56 |
| engine/earnedRate | counts the two of them in the same minute as two people minutes | 1 | v79: 31.62, not 28.75 |
| engine/machineHours | has one place at a budget saw | 1 | v79: the novice's hour 23.47, not 21.33 |
| engine/serviceRule | takes the saw s places from the call to the end of the day | 1 | v79: 0.0387 and 0.0352 of the job, not 0.0351 and 0.0320 |
| engine/staff | takes a joiner with no experience 12 days to make a 6400 wardrobe | 1 | v79: 12.12, 7.27 and 9.09 days, not 13.33, 8 and 10 |
| engine/staff | produces at the tier rate | 1 | v79: 26.40, not 24.00 |
| engine/staff | drops the output of everyone the owner is not there to run | 1 | v79: 18.48, not 16.80 |
| engine/staff | lets two men cut at the budget saw s two places | 1 | v79: 25.42, not 23.11 |
| engine/stages | counts what is left of the job at its one pace | 1 | v79: a 400 job 245.45 minutes, not 270 |
| engine/stages | takes a whole job in the minutes its stages add up to | 1 | v79: a quarter is 54.55 of his minutes, not 60 |
| engine/stages | writes down each run at a stage | 1 | v79: the cutting's run ends on minute 61, not 67 |
| engine/types | matches the owner productivity example from CLAUDE.md 8.5 | 1 | v79: the 6,400 wardrobe 7.27 days, not 8 |
| engine/variants | moves the cutting quarter and leaves the other three alone | 1 | v79: 245.45 minutes, not 270 |
| scenarios/playthrough | has the crew, the kit and the paper | 1 | v77: no production manager and no holiday (month 2 closes under) |
| scenarios/playthrough | went to the bank in week 2 | 1 | v77 and v79: months 5,383, -2,713, -10,198, not 7,350, 398, -12,999 |
| scenarios/playthrough | keeps the efficiency above 55% | 1 | v77 and v79: month 3 reads 82, not 92 |
| scenarios/playthrough | took the first contract its crew could keep up with | 1 | v77: 83 a piece, not 66 |
| scenarios/playthrough | pays every trade by the month | 1 | v77: two on the books, no manager |
| scenarios/thirtyDays | reaches day 31 without going under | 1 | v79: the lowest balance 3,379, not 2,741 |
| scenarios/thirtyDays | ends above the reputation it started on | 1 | v79: eight jobs out and 13, not seven and 11.5 |
| scenarios/thirtyDays | a month short handed reaches the end of the month | 1 | v79: the lowest balance -805, not -3,281 |
| scenarios/thirtyDays | gets four of the book out on two saws and three on one | 1 | v79: four and three, 3,872 ahead, not three and two, 4,368 |
| scenarios/turn13 | (v) renegotiates from the history | 1 | v77: 84, not 67 |
| scenarios/turn13 | (x) counts a gated saw only while it runs | 1 | v70: the one man stands at the standard saw, and both saws take three men (input) |
| scenarios/turn17 | (y) finishes the piece in about half the days | 1 | v79: 28 and 14 days, not 32 and 15 |
| scenarios/turn17 | (y) makes what the floor lets him | 1 | v79: week 5 makes the 21 and week 6 the 20 |
| scenarios/turn17 | (z) prints the engine s own number on the Company board | 1 | v79: 38.29 under 44, not 34.81 under 40 |
| scenarios/turn17 | (z) drops by itself when the shop stands two of the five days | 1 | v79: 23.19, not 21.09 |
| scenarios/turn19 | (aa) is the same piece and the same labour, done sooner | 1 | v79: 14,514 and 11,467 minutes, not 16,026 and 12,622 |
| scenarios/turn19 | (bb) is the better joiner who gets through it faster | 1 | v79: 546.66, not 496.96 |
| scenarios/turn20 | (cc) ends the month barely in profit after his wages | 1 | v77: 10,266 taken, his 5,765, 961 over; the report 2,645.50 |
| scenarios/turn20 | (ff) takes the saw out for one working day each time | 1 | v79: 281.60 and 309.27, not 256.00 and 281.16 |
| scenarios/turn22 | (jj) stands the trading company up | 1 | v77: the novice 4,550, 83 a piece; written 1,800 under (input) |
| scenarios/turn22 | (jj) keeps trading under the limit for twenty nine days | 1 | v77: -13,486 on the 29th morning (input) |
| scenarios/turn22 | (jj) is closed on the thirtieth morning | 1 | v77: -13,295, 1,705 inside the floor (input) |
| scenarios/turn22 | (jj) paid a month of wages out of an account already under | 1 | v77: 4,550 from -10,318 to -14,868 (input) |
| scenarios/turn22 | (jj) was trading the whole way | 1 | v77: the same 131 pieces, 10,873 at 83 |
| scenarios/turn23 | (ll) puts the whole of every man s day into the jobs | 1 | v79: 3,683.36, not 3,337.80 |
| scenarios/turn23 | (mm) puts more into the jobs than (ll) | 1 | v79: 3,879.33, not 3,510.60 |
| scenarios/turn23 | (oo) puts no bench minutes into the job at all | 1 | v79: the day ends at 206.34, not 157.32 |
| ui/machine | gives every tile a picture slot | 1 | v80: the air dryer has its picture; the box is shown on the undrawn pallet |
| ui/planBar | keeps its outline and fills green from the left | 1 | v79: the job priced 440 so half of it is 135 whole minutes (input) |
| ui/workPlan | shows the minutes done of the minutes it takes | 1 | v79: the job priced 440 so it is 240 whole minutes (input) |

**T27-A1 Housekeeping and v81.** `docs/turn-26-brief.md` was already in `docs/` and `CLAUDE.md` is this
turn's brief (first line "Turn 27"), so nothing was moved; the README names the Turn 26 brief and
`REPORT-T27.md` and says Turn 27 asks no art, `APP_VERSION` goes v80 to v81 with the two tests that
name it flipped (`STATE_VERSION` is B2's). The two dead files `public/sprites/palletTruck.standard.png`
and `.r.png` are `git rm`ed (the permissions let it through tonight), the manifest is 215 sprites and
not 217, and the two turned counts read 75 and not 76 (`rotate.test.ts`, `spriteClasses.test.ts`).

**T27-A2 The mockups.** `docs/mockups/t27/` with its README: the top bar at 1,280 wide before and after
2.1 (the date with its year is 227 px against the knobs' 268, so nothing else on the bar moves), the
two tax cards in the event modal's small folder beside December's report in the month end's middle
folder with its `Tax` line, and the warning strip with the `taxComing` line, all of them the game's
own markup made by its own functions, in its own classes, with tonight's change written in.

**T27-B1 The year.** `START_YEAR` 2025 [PIOTR] and `calendarYearOf(day)` in `clock.ts`, counted off
`START_MONTH` and the twelve thirty day months: day 1 to 300 are 2025, day 301 is 1 January 2026;
`yearOfDay` is untouched. `formatDate`, the top bar's line, reads `Mon 1 March 2025 · 08:00`, so
`topbar.ts` itself is not touched; `formatCalendarDay` has no year. One reading of the brief
[TUNE]: the laptop's home line also printed `formatDate`, so it now prints `formatCalendarDay` and
`formatTime` and keeps its old words, because the year is the bar's and the tax's alone tonight.

**T27-B2 The tax and its warning, STATE_VERSION 40.** `src/engine/tax.ts`: at the open of 30 December,
first in `runDayCosts` and so before the day's rent whether it is worked or not (in 2025 it is a
Saturday), `TAX_RATE` 0.25 [PIOTR] of `state.cash`, rounded to the pound, one ledger line under `tax`,
`Tax for 2025`, and the card `Tax for 2025` once; nothing is booked or said from an account at nought
or under [TUNE: chat asked Piotr and has no answer yet]. Its own `Tax` line on the month report before
`Everything else`, `Tax` in Accounting, in neither `SPEND_WARNING_CATEGORIES` nor the sales. The
warning `Tax is coming` at the open of the first working day of December, after November's report,
its figure the tax on the account that morning (`. Nothing as it stands today.` at nought [TUNE: the
join]), and the strip's `taxComing` under `spendingOverEarning` and above `crewFull` [TUNE] from it to
the tax while there is cash to tax. State: the two fields of section 4, `finance.taxPaidForYear` and
`finance.taxWarnedForYear`, null in a v39 save (`liftToVersion40`), because the ledger cannot say a
warning was given or a tax of nothing settled, and it keeps only its last 2,000 lines. Buying a
machine to dodge the tax and selling it in January loses more than the tax: it sells for half
(`SALE_FRACTION` 0.5), so a pound spent saves 25p of tax and brings back 50p at best.

**T27-B3 The extension at £250,000.** `UNIT_EXTENSION_PRICE` 120,000 to 250,000 [PIOTR]; the Premises
card, the deposit beside it (2,400 on the starting rent) and the refusal read the constant, so the card
says `£250,000 · and £2,400 more deposit. Needs £252,400 in the account.` and nothing else of it moved;
a unit already extended stays extended. The three tests that named the price are flipped in place.

**T27-B4 The fourteen prices.** The pro and the industrial class of the seven machine families of five
classes are 1.2 times their v80 price, written into the variant tables [PIOTR: the 20%; the figures
are its arithmetic]: the saw 18,000 and 30,000, the edgebander 19,200 and 38,400, the compressor 10,800
and 26,400, the thicknesser 13,200 and 26,400, the moulder 19,200 and 33,600, the CNC 90,000 and 144,000,
the booth 38,400 and 66,000. What moved beside them: the insurance line of those fourteen cards (2% of
the price a year, the pro saw's 300 to 360), and for one bought from tonight its service (a tenth),
repair (a twentieth), contract wear and sale price (half), all read off its own `purchasePrice`, so a
machine already owned moves by nothing; in the suite, the industrial saw month of `thirtyDays` pays
30,000 on day 1 and nothing else of that month moved, and five catalogue and purchase tests are
re-pinned. The contract entry point reads the standard class and the tips the used one, so no contract
price moved.

**T27-C1 Notes.** `docs/notes-t27.md`: the calendar the tax lives on (the first falls on a Saturday, so
it is booked in the clock's walk over the weekend), the year on the bar alone and the laptop's line,
why the tax has two fields of its own, the readings of the brief, what the tax does and does not see
(a loan drawn in December and clients' deposits are cash and are taxed), the prices, what A0 found
beyond its figures, and the copyright header Piotr's rule of 22.09 puts on tonight's new files.

**T27-C2 Scenarios.** (uu) in `tests/scenarios/turn27.test.ts`: the day one hall bought on Tuesday 28
November 2025 with 48,000 in the account [TUNE: the brief's figure], played by the careful script to
Monday 2 January 2026, is warned on Friday 1 December with the tax on that morning's account, carries
the strip's line at every step of all 21 working days to the 29th and at none outside them, pays on
Saturday 30 December a quarter of the £43,315.50 it held that moment, £10,829, as the first line of
the day, meets that card first on the Monday and December's report after it with its `Tax` line; the
same hall at minus 3,000 [TUNE], idle so it stays under nought, is told `Nothing as it stands today.`,
has no line and pays nothing. No scenario figure moved in C2; the one tonight moved is restated in its
own commit (B4: the industrial saw month of `thirtyDays` pays 30,000 on day 1).

**T27-C3 The measurement.** `docs/balance-t27.md`: the first year, 1 March 2025 to the end of
February 2026, of a new company on each difficulty with four crews, twelve tables of a row a month
(money in, material, couriers, wages, the draw, rent, rates, power, the rest, and kit, loan and tax as
columns of their own [TUNE]), each with its first month in the black, the bank's day and the tax, and
a line for the same year on two more seeds; then one page of what they say, with no number proposed.
The script, `scripts/balance-t27.ts`, is run by hand (`npx vite-node`) and is not part of `npm test`;
it drives the autopilot of the suite and changes nothing of the game. Its limits are at the top of
the file, each [TUNE]: it takes any residential sheet job whose client pays for its material and
labour and never haggles, keeps two jobs open a man, pays the software by the month, writes the books
up once a month, borrows the bank's one loan when the month's wages would take the account under
nought (on Hard at the open of day 1), takes its crew on as the account allows, and gives the four
experienced men a standing of 15 and the machines a month of their wages allows. Its first runs found
three things that were the script's and not the year's, each said there: the one off licence runs out
after thirty jobs and the script never bought it again (every drawing refused from about day 108),
the playthrough's margin of a fifth turned a third of a new company's offers away, and the books left
to wait cost 6,600 of `Late accounts` in the year. What the tables say: only the owner alone on Very
easy lives the year, on all three seeds; no month of any run on the suite's seed is in the black;
Hard is closed in its second month whoever is on the books; and the tax was paid by four companies
in thirty six, each out of what was left of its starting 50,000.
