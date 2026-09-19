# Phase B2 notes: the people (CLAUDE.md T21 2.5, 2.7, 2.8, 2.9, 2.10)

Branch `claude/determined-tesla-e90ze6`, on top of phase A (89fe38f) and phase B1 (0c0768d). Four
commits, T21-B2a to T21-B2d. Everything the lead has to know: the frozen file changes to apply, the
figures chosen, what the brief calls one thing and the code another, and two lines a task.

## Frozen file changes for the lead to apply

Nothing in this section has been applied by this agent.

### 1. `src/engine/constants.ts`: four comment lines that still carry Turn 20's words (T21-B2a)

Section 7's cross check is `grep -rn "1\.4\|super experienced\|extremely experienced" src`: nothing.
Four comments in the frozen constants still answer it. Two of them name the old words to say they are
gone, which is honest prose and a grep hit all the same; two of them use the old word as if it were
still the game's, which is wrong in itself.

**(a) The take off comment, line 653.** The word is simply out of date.

Exact old text:

```
 *  another, so a man with no experience spends 37 minutes over it and an extremely experienced one
```

Exact new text:

```
 *  another, so a man with no experience spends 37 minutes over it and an excellent one
```

(The figures still hold: 30 over 0.8 is 37 and 30 over 1.2 is 25, so the 21 beside it is Turn 20's
1.4 arithmetic. The honest pair is 50 and 25: 30 over 0.6 is 50 minutes for the man with no
experience and 30 over 1.2 is 25 for the excellent one. Both figures are wrong in the file as it
stands, so the whole clause wants replacing:

```
 *  another, so a man with no experience spends 50 minutes over it and an excellent one 25, and he
 *  does as many a day as his minutes allow. */
```

in place of the two lines ending `21, and he does as many a day as his minutes allow. */`.)

**(b) `TIER_MIN_REPUTATION`, line 3311.** The same out of date word.

Exact old text:

```
 *  always comes, and the extremely experienced one does not look at a workshop under 60
```

Exact new text:

```
 *  always comes, and the excellent one does not look at a workshop under 60
```

**(c) `TIER_WORDS`, line 3287.** This one is prose about the change and is only a grep hit.

Exact old text:

```
 *  excellent**, and Turn 20 printed "super experienced" and "extremely experienced" instead, which
 *  are Claude's words and not his (PIOTR, 19.09; CLAUDE.md T21 2.9). */
```

Exact new text:

```
 *  excellent**, and Turn 20 printed two words of its own for the top two instead, which were
 *  Claude's and not his (PIOTR, 19.09; CLAUDE.md T21 2.9). */
```

**(d) `WORKER_RATES`, line 3299.** The same: prose about the change, and the one `1.4` in the file
that really is a tier rate, even as history.

Exact old text:

```
 *  [PIOTR, 19.09: 0.6, 0.8, 1.0, 1.2]. Turn 20 ran 0.8 / 1.0 / 1.2 / 1.4, which was Claude's
```

Exact new text:

```
 *  [PIOTR, 19.09: 0.6, 0.8, 1.0, 1.2]. Turn 20 ran a ladder one step higher all the way up, which
```

with the line after it, `*  reading and one step too high all the way up. One table for every role that has a rate, so an`,
becoming `*  was Claude's reading and not his. One table for every role that has a rate, so an`.

Reason for all four: the cross check of section 7 is a grep, and a grep cannot tell a history line
from a live one. (a) and (b) are wrong whatever the grep says.

## Names: the brief against the code

Confirmed again from the code, and used in these four commits:

- `runAutoAssign` is `assignStaffTasks` in `src/engine/tasks.ts`; the job assignment pass is
  `autoAssignJobs` in `src/engine/staff.ts`.
- `state.arrears` is `state.finance.arrearsAmount`, and the brief's "normal" difficulty is the code's
  `hard`.
- `WEEKS_PER_MONTH` is gone; `WORKER_HOURS_PER_MONTH` and `WORKER_MINUTES_PER_MONTH` are what a month
  of a man is measured in now.

## The two greps of section 7, run on this commit

```
$ grep -rn "weeklyWage\|WEEKS_PER_MONTH" src
src/engine/migrate.ts:23: *  seven. Turn 21 deleted `WEEKS_PER_MONTH` from the constants because nothing in the game converts
src/engine/migrate.ts:26:const WEEKS_PER_MONTH_V17 = 30 / 7;
src/engine/migrate.ts:316:    const weekly = typeof worker.weeklyWage === 'number' ? worker.weeklyWage : 0;
src/engine/migrate.ts:318:    worker.weeklyWage = weekly > 0 ? weekly : Math.round(monthly / WEEKS_PER_MONTH_V17);
src/engine/migrate.ts:349: *  - **The wage.** `weeklyWage` becomes `monthlyWage` at `weeklyWage * 30 / 7`, which is the
src/engine/migrate.ts:380:    const weekly = typeof worker.weeklyWage === 'number' ? worker.weeklyWage : 0;
src/engine/migrate.ts:382:    worker.monthlyWage = monthly > 0 ? monthly : Math.round(weekly * WEEKS_PER_MONTH_V17);
src/engine/migrate.ts:383:    delete worker.weeklyWage;
```

Nothing but the migration, which is what the brief allows. Line 316 to 318 is the Turn 20 lift
(version 16 to 17) and has to keep writing the field the lift after it reads.

```
$ grep -rn "1\.4\|super experienced\|extremely experienced" src
src/ui/styles.css:372:  line-height: 1.4;
src/ui/contracts.ts:528: (CLAUDE.md T20 2.1.4)
src/engine/production.ts:112: (PIOTR; CLAUDE.md T20 2.1.4)
src/engine/constants.ts:347: which is 171.43
src/engine/constants.ts:653: an extremely experienced one
src/engine/constants.ts:1563:    height: 1.4,
src/engine/constants.ts:3256: 1.4 m is a 1.8 m man's stride
src/engine/constants.ts:3261:export const WALK_STRIDE_METRES = 1.4;
src/engine/constants.ts:3287: "super experienced" and "extremely experienced"
src/engine/constants.ts:3299: Turn 20 ran 0.8 / 1.0 / 1.2 / 1.4
src/engine/constants.ts:3311: the extremely experienced one
src/engine/contracts.ts:152, 350, 552, 561, 581, 608, 614, 626, 707, 723, 938, 957: CLAUDE.md T20 2.1.4
src/render/pipes.ts:171: PIPE_STROKE * 1.4
```

Every hit, and why it is not a tier rate:

- `styles.css:372` is a line height, `constants.ts:1563` is a spec's height in metres,
  `constants.ts:3256` and `:3261` are a man's stride, `render/pipes.ts:171` is a stroke width, and
  `constants.ts:347` is 171.43 hours, which contains the digits and is not the number.
- Every `T20 2.1.4` and `T20 2.5` style hit is a citation of a brief section number.
- The three in `constants.ts` at 653, 3287, 3299 and 3311 are the four comment lines above, which
  the lead's note fixes. **None of them is a live tier rate**: `WORKER_RATES` itself is
  0.6 / 0.8 / 1.0 / 1.2 and `tests/engine/staff.test.ts` now asserts that table literally.
- The three hits in `src/engine/staff.ts` and `src/ui/team.ts` that this commit found were live
  prose about what the hire card says, and they are fixed in the source: the refusal really reads
  `excellent joiners come from reputation 60` now, so the comments quoting it were out of date.

## Numbers chosen

Nothing in T21-B2a: every figure of the tiers and the pay is Piotr's own of 19.09 or phase A's, and
this commit only asserted them. The figures chosen in the other three tasks are listed under each.

## T21-B2a: 2.9 and 2.10, the four tiers and monthly pay

- Built: the finishing and the proof of what phase A landed. The hiring gate reads `spec.monthlyWage`
  directly and its refusal names it, now asserted at Piotr's own 2,600 in
  `tests/engine/hiringGate.test.ts` (2,600 in the bank takes an experienced joiner on, 2,599 does
  not, and the card prints the same sentence with no week in it); the four tiers are asserted as
  tables, literally, in `tests/engine/staff.test.ts` (the ids, the four words, the four rates
  0.6 / 0.8 / 1.0 / 1.2, the excellent man from reputation 60, and nothing above 1.2); the v29
  fixture and its four tests are in `tests/cloud/migrate.test.ts` (the week converted to the month at
  the conversion the Turn 20 build printed, the very experienced man out at 1.0 and not 1.2, the two
  new fields at nought, and a whole v29 hall with men in it opened, run on and round tripped); the
  Summary's "What is coming" row is asserted in `tests/ui/accountingDays.test.ts` to be dated the
  last working day of the month with the month's bill beside it and no week anywhere on the page.
  Three live comments in `src/engine/staff.ts` and `src/ui/team.ts` that quoted the hire card's
  refusal as "extremely experienced joiners come from reputation 60" now quote what it really says.
- Left: the four comment lines in the frozen `src/engine/constants.ts`, as note 1 above. Nothing was
  migrated for the Company board's per man rate or the insurance's per employee premium, because
  neither reads a wage: `perMan` in `src/engine/rate.ts` is the workshop's earned labour rate divided
  by the heads on the books (pounds an hour over people, no wage in the sum), and
  `liabilityPremium` in `src/engine/insurance.ts` is `LIABILITY_BASE_YEARLY` plus a flat
  `LIABILITY_PER_EMPLOYEE_YEARLY` of 180 a head. The brief says these "read it"; they read the
  head count, and inventing a wage term in either would be a new rule and not this turn's. The night
  premium was checked and is right: `nightPremiumFor` is the monthly wage over
  `WORKER_HOURS_PER_MONTH`, for the eight hours of the shift, at the quarter the night rate adds,
  which is 22.75 for a joiner with no experience, and `tests/engine/staffSecondShift.test.ts` already
  asserts that figure and not the old one. No test was weakened or skipped in this commit.
