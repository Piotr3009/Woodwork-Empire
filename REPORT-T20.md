# Report, Turn 20: contracts that pay, people you can run

Woodwork Empire, Turn 20. Built against `CLAUDE.md` of 18.09.2026 (first line "Turn 20").
Branch `claude/woodwork-empire-t20-3a7zg6`, off the v28 tree (`d35e9b5`). `APP_VERSION` v28 to
v29, `STATE_VERSION` 16 to 17.

Two lines a task, in the order of section 5. Phase C folds `PHASE-A-NOTES.md` into this file and
writes the rest of the report around it.

## Phase A

**T20-A1 Housekeeping and v29.** The Turn 19 brief was archived byte for byte from the Turn 19
merge commit (`58987d1`) into `docs/turn-19-brief.md`, the README's lines were moved on,
`APP_VERSION` became `'v29'` (the one bump of the turn), `docs/art/REQUESTS-T20.md` was written
from section 9 and `docs/ui-style.md` was written out of the code as it stands: the three modal
skins, the tokens, the buttons, the chips, the one cross, the fonts and the two figure sizes,
each with its CSS class.
`npm run check` green on its own exit code.

**T20-A2 Phase A proper.** Section 4's state: `STATE_VERSION` 17, the four tier ids through the
types with every compile error fixed by the rename, `weeklyWage` as the one wage field with
`monthlyWage` gone, `leavesOnDay`, `serviceCount`, `inServiceUntilDay`, `contract.endedBy`, and
the version 16 to 17 lift behind them; `CONTRACT_PIECES` at the prices of 2.2; `sweep` in
`ANIMATIONS`; the Work Plan's two tabs and the Machines page routed but empty; `data-popover` on
the popovers that exist.
`npm run check` green on its own exit code. What was chosen and what phase B must know is in
`PHASE-A-NOTES.md`.

**T20-A3 Phase A reviewed.** Three adversarial readings of the phase A diff gave fourteen
findings; eleven stood and were put right, two were rejected because the decision behind them
belongs to a later phase or to Piotr, and one was the same finding twice. The
blocker was the lift: an interview the owner was sitting in when a v28 save was taken carried the
old tier id in its hire order, so the hour was spent and nobody was taken on. The rest were the
Company board's crew lines going empty at the new rates, the Accounting page still promising a
salary bill nothing charges, the offer card not redrawing when the player picked another man, the
why popover missed by the `data-popover` pass, the hiring gate reading a different reputation
figure from the board, and the lift with no test behind it.
`npm run check` green on its own exit code. Each finding, confirmed or rejected, is in
`PHASE-A-NOTES.md` under "Phase A review".

---

## Phase B2, the people (2.3, 2.4, 2.5, 2.6, 2.7, 2.14)

**T20-B2a Four tiers in the words the game prints, and everybody paid by the week (2.5, 2.6).**
Every tier the player reads comes off the one `TIER_WORDS` table, and the hire card now says what
is missing in the game's own voice: `extremely experienced joiners come from reputation 60`, off
`TIER_MIN_REPUTATION` and the trade's own plural, through the existing `reasonLabel`. `ROLE_WORDS`
moved into `src/engine/staff.ts`, where that refusal is written, and `src/ui/team.ts` hands it on.
The week is the one unit of pay: the hire card, the crew row and Our team all print
`GBP600 a week (about GBP2,571 a month)` through one `wageText`, with `monthlyWageOf` the one
conversion wherever a month is asked for.
`npm run check` green on its own exit code. New tests: a sprayer, an estimator and the office in
Friday's wages, the month end's salary line equal to the four or five Fridays of that month, and
the cards offering and withholding by reputation with the reason on them.

**T20-B2b The estimator works by his minutes, goes on site, and is off the Output list (2.3).**
A material take off is thirty minutes of the desk it is done at [PIOTR], whatever the job is
worth, at the man's own rate: 37 minutes for a man with no experience, 21 for the top man. The
five a day is gone and his 480 minutes are the whole of the cap, which makes an experienced
estimator sixteen a day bare and thirty two with Joinery Core, and each extension takes a further
quarter off the minutes [TUNE], so 42 and 56. The site measure gained the estimator and the
salesman on its eligible list and the estimator on its auto list, so he goes when no owner is free
for it and the day's travel minutes come off his own day. The Company board's "act where they are"
rows are the men who produce, off the new `produces` rule.
`npm run check` green on its own exit code. New tests: the day's count at every class, the minutes
one take off costs each of them, the measure landing on the estimator with the owner at the bench,
and the board's rows holding the joiner and not the estimator.

**T20-B2c Let go: a week's notice, paid, and the plan shows the hole (2.4).** Our team carries
`Let go` on every worker's row and never on the owner's. One click gives him seven days of notice
[TUNE]: he stays on the books, on his job and on his contract, and Friday pays him. The morning
after his last day the day start walks him out, off the job, off the contract, with whatever he
was holding back on the list, and the plan draws his work with nobody on it. No reputation moves,
and the crew limit and the hiring gate count him until he has gone.
`npm run check` green on its own exit code. The click itself wants three lines in the frozen files
(the action, the reducer case and the route); they are written out in `NOTES-B2.md` for phase C,
and the row is already drawn with the `data-do="letGo"` phase A left open.

**T20-B2d Our team says what the week was, and a machine nobody stood at says 0 h (2.7, 2.14).**
Every row of Our team gained a second line for this week and last: the hours worked, the split
over the six bands (jobs, contracts, unloading, cleaning, desk, site), the pieces a standing
contract took off him, the jobs he stood at and the one efficiency figure of the week, which is
his rate times the minutes he spent making something over the minutes the company paid for. The
owner's row has it too. The minutes are sampled once a minute from the hook the day already runs
over the crew, guarded by the day and the minute so nothing is counted twice, and the bands add up
to the hours because they are the same minutes. The Machines column says `0 h` where it said
`none`.
`npm run check` green on its own exit code. New tests: the bench minutes into the jobs band with
the job named, a man on a contract into the contracts band, the week rolling over instead of
adding, the row printing the hours, the split, the job and the figure, and the machine nobody
stood at reading `0 h`.

**T20-B2 review: the findings that stood.** A reviewer read the four commits and reported eight
things. Three stood and are fixed: the week's meters booked a minute for every man the clock ran
over, worked or not, so an evening of the owner's overtime put two hours into every man's week and
a joiner at an empty rack read a full day at the bench, and the sampler now credits a band only
when the man's own counters rose and leaves the crew out of the evening altogether; 2.7's own test
asserted the formula against itself and now pins the jobs band to the engine's count of the
minutes he made something in; and the week was drawn as a second `.row` under a man instead of the
second line inside his own row that the rest of the game uses. Two more are fixed as far as my
files reach: the Technical tab worked Joinery Core out for an experienced man whoever was at the
desk, and now names the estimator on the books and prints his day. Three are rejected, with the
reasons in `NOTES-B2.md` section 8: the dead `Let go` click is three lines in three frozen files
and hiding the button would break 2.4; the eligible list test carries the roles the brief names
and is a content check; and the take off's minutes want `src/engine/jobs.ts`, which is not mine,
in the same commit as the override they replace.
`npm run check` green on its own exit code. Two new engine tests and one new UI test, all three
red on the old code.
