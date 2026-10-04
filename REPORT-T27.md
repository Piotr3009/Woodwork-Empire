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
