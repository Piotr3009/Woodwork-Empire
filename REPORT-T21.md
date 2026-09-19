# Report, Turn 21: debt you can see, people who do not wait for you

Woodwork Empire, Turn 21. Built against `CLAUDE.md` of 19.09.2026 (first line "Turn 21").
Branch `claude/determined-tesla-e90ze6`. `APP_VERSION` v29 to v30, `STATE_VERSION` 17 to 18.

Two lines a task, in the order of section 5, each with the commit it sits in. Filled in as the
turn runs; section 0, the numbers chosen, the cross check and the pictures are written at the end.

## Tasks

**T21-A1 Housekeeping and v30.** The Turn 20 brief archived byte for byte from the Turn 20 merge
commit (`git show 7982787:CLAUDE.md > docs/turn-20-brief.md`, 25,868 bytes, `diff` silent), the
README's two lists brought up to date (the brief, `REPORT-T21.md`, `REQUESTS-T21.md`),
`APP_VERSION` `'v29'` to `'v30'` in `src/engine/constants.ts` with its two tests, and
`docs/art/REQUESTS-T21.md` written from section 9: the sprayer's four sheets, the helper's bench
sheet, nothing for the bubbles.
One baseline red was fixed with it, and it was not this turn's doing:
`tests/engine/rotate.test.ts` asserted that no `.r.png` had ever been delivered, and Piotr's own
commit `d26f66f` delivered `toolCabinet.standard.r.png`. The test now asserts what the code always
promised: the cabinet turned is drawn from its own file, every other class still mirrors.

**T21-A2 Phase A: the state, the tiers, the monthly wage, the money, the bubbles and the cabinet.**
Section 3's list, in one commit, plus the three things it takes to leave the tree green. What phase A
owns, and what it deliberately left to phase B, is written out task by task below.

*The tiers and the pay (the constants half of 2.9 and 2.10).* `TIER_WORDS` now reads no experience,
experienced, **very experienced**, **excellent**; Turn 20's "super experienced" and "extremely
experienced" were Claude's words and are gone. `WORKER_RATES` is **0.6 / 0.8 / 1.0 / 1.2**, one step
down the ladder from Turn 20's 0.8 / 1.0 / 1.2 / 1.4. `weeklyWage` is gone from `Worker`,
`HiringOption` and `HiringSpec` and `monthlyWage` is back in its place; `JOINER_MONTHLY_WAGE_EXPERIENCED`
is 2,600 and `TIER_WAGE_FACTOR` lands the ladder exactly on Piotr's 1,950 / 2,600 / 3,500 / 4,330.
Every other role's monthly figure is the one its own Turn 20 comment already named, brought back out
of the comment and into the constant: estimator 2,600, sprayer 2,700, draftsman 2,400, production
manager 3,400, office admin 1,900, purchasing clerk 1,700, salesman 2,200. `WEEKS_PER_MONTH` is
deleted; `WORKER_HOURS_PER_MONTH` (171.43) and `WORKER_MINUTES_PER_MONTH` (10,285.71) replace it
where a month of a man is really wanted, and `WORKER_MINUTE_RATE_DIVISOR` is the second of those, so
an experienced joiner's informational minute moves from 25p to 25.3p and no further. The payroll runs
on `isLastWorkingDayOfMonth` with the ledger line `Monthly wages`.

*The money (the constants half of 2.2 and the whole of 2.4).* `BANKRUPTCY_OVERDRAFT_MULTIPLIER` is
gone and `BANKRUPTCY_LIMIT_FACTOR` (1.5) and `BANKRUPTCY_DAYS_BELOW_LIMIT` (30) are in;
`bankruptcyFloor` reads the new factor, which makes the line -15,000 on very easy and easy and -7,500
on hard. `dropReputationCost(job)` is the one function the drop and its card both read: ten points,
a point a thousand over five thousand, times 1.5 for a commercial client, capped at fifty, and
`dropJob` charges it in place of the flat ten.

*The state (section 4).* `STATE_VERSION` 18. `state.finance.daysBelowOverdraft`, and on the owner
`idleMinutes` and `idleByReason` with `spendOwnerIdleMinute` and `emptyOwnerIdle` beside
`spendOwnerMinute` in `src/engine/owner.ts`; the morning empties both. `liftToVersion18` lifts every
v29 save: the weekly wage becomes the monthly one at the conversion the Turn 20 build itself printed
beside every wage, the rate is recomputed from the tier because the rate is the tier's and not the
man's, the day count starts at nought because a save cannot say whether yesterday ended under the
limit, the idle minutes start at nought because they were never written down, and every tool cabinet
is laid out again.

*The bubbles (the table half of 2.6).* `BUBBLES` is one table of twelve lines, each a line of the
table in `docs/mockups/t21/bubbles.html`, with `{slot}` placeholders the renderer fills and a tone
that is the colour. `BUBBLE_WORK_SECONDS` 3, `BUBBLE_WORK_MAX_SPEED` 4, `BUBBLE_HEAD_GAP` 6. The
types `BubbleKey`, `BubbleTone` and `Bubble`, and the four CSS classes.

*The drop routed to the card (2.3's plumbing).* `Drop project` no longer drops: `dropControl(job)` is
one button, the inline "Confirm drop" row is gone, and the click opens the new `dropJob` card, a
folder modal pushed over the Work Plan it was opened from, with the cross, Escape (above the modal
under it in `ESCAPE_ORDER`) and a click outside, all three of which keep the job. `src/ui/dropCard.ts`
is the card.

*The cabinet (2.13's spec and migration).* The catalogue spec is `width 2, depth 1, height 1` and
`CABINET_SLOT_LAYOUT` is respread to seven slots two cells apart. **The brief's `zone 3 by 2` is not
built**, and that is the one place phase A departs from the letter of the brief; the reason is in
section 0 and in a comment beside the spec.

*Three things phase A did that section 3 does not list, each to leave the tree green in one commit.*
The wage rename cascades through eleven source files and thirty three test files, so phase A carried
it to the point of compiling and left 2.10's own tests, copy and gate to T21-B2a. The payroll cadence
moved with the field, because a monthly wage paid every Friday is not a state worth committing. And
`renderWorkPlan` lost its `dropConfirm` argument, because the card took it.
