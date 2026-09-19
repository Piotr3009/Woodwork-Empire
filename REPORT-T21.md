# Report, Turn 21: debt you can see, people who do not wait for you

Woodwork Empire, Turn 21. Built against `CLAUDE.md` of 19.09.2026 (first line "Turn 21").
Branch `claude/determined-tesla-e90ze6`, off `edf3ae1`, the tree this turn opened on.
`APP_VERSION` v29 to v30, `STATE_VERSION` 17 to 18.

`npm run check` on the finished tree, read off its own exit code: **exit 0**, **208 test files,
2,027 tests** and one todo, up from 196 files and 1,887 tests on the v29 tree this turn opened on.
Twenty commits of work, every one of them with a green check of its own before it. Six sets of
hands: one agent for phase A's reading, the lead for phase A itself, three for the three phase B
groups one after another, one for the scenarios and one for the pictures, with the lead applying
every frozen file note as its group landed and looking at every picture after it was taken.

`git diff edf3ae1 --stat`: 131 files changed, 8,379 insertions, 889 deletions.

Two lines a task, in the order of section 5, each with the commit it sits in. This report is the
turn's one document: phase A's reading and the three phase B groups' notes are folded into it, and
the three notes files stay in `docs/` because they carry the exact old and new text of every frozen
file change, which is the record of who wrote what.

## 0. Blockers, and where the session did not follow the brief to the letter

**Nothing stopped the build.** Everything in sections 2.1 to 2.13 is built, tested and photographed,
nothing on the "do not" list of section 6 was done, and every v29 save loads. Two clauses of 2.7 and
one figure of 2.13 could not be built as the brief writes them, and each is item 1, 4 or 18 below
with the arithmetic that rules it out; nothing was faked in their place.

The items below want Piotr's eye. The first four are decisions the brief left open or that the code
would not take as written; the rest are consequences of decisions the brief did make.

1. **The tool cabinet's working zone is its own footprint and not the brief's 3 by 2, and this is
   the one place phase A departs from the letter of 2.13.** The footprint is `width 2, depth 1,
   height 1` exactly as asked, because the picture Piotr's art side delivered on 19.09 is plainly a
   two metre unit: drawers, two doors and a bench top over them. The zone is a different question
   and the brief tags its figure [TUNE]. Three sums rule 3 by 2 out. **First**, the zone is what
   nothing else may stand on (`canPlaceSpec` works on the zone, not the footprint), and a 3 by 2
   zone on the cabinet row at y 3 reaches down into y 4, which is the workbench row
   (`BENCH_SLOT_LAYOUT`), so the day one hall could not be laid out at all. **Second**, it reaches
   three cells across, so no two cabinets could stand side by side in a row that holds six or seven
   of them. **Third**, the zone is also what the crew's floor limit is measured against
   (`freeFloorM2`), so six cabinets at six cells instead of two would take 24 m2 off the free floor,
   which at `M2_PER_PERSON` 24 is exactly one man. If Piotr wants the metre of standing room in
   front of a cabinet drawn, it is two lines in the spec plus a new cabinet row, and the crew limit
   moves with it.

2. **The delivered cabinet picture is drawn on the one cell canvas and wants redrawing.** Measured
   off the PNG headers: `toolCabinet.standard.png` and `toolCabinet.standard.r.png` are both
   112 by 112, which is the contract size (`docs/art/SPRITES.md` 2 and 6) for a 1 by 1 by 1. A
   2 by 1 by 1 wants **160 by 136**, which is what `spindleMoulder.standard.png` is already drawn
   at. So the drawing is of a two metre cabinet and the export is of a one metre one, and until the
   two files land at 160 by 136 the hall draws a one cell picture on a two cell footprint. This is
   not excused in the test suite: `tests/render/spriteClasses.test.ts` asserts the delivered size
   and the owed size by name, so the day the redrawn files arrive that test fails and its entry is
   deleted rather than quietly kept. The request is section 2 of `docs/art/REQUESTS-T21.md`.

3. **The wider cabinet costs the two saw hall a man.** A cabinet takes one cell more of floor than
   it did, and the crew limit is `Math.floor(freeFloorM2 / M2_PER_PERSON)` with `M2_PER_PERSON` 24.
   The hall of scenario (b) in `tests/scenarios/thirtyDays.test.ts` was sitting on that boundary
   with four cabinets in it, so it now holds the owner and **two** joiners where it held the owner
   and three. Nothing about the crew rule itself moved. The lever, if Piotr wants the third man
   back, is `M2_PER_PERSON`, and it is one line.

4. **2.7's first clause cannot be built as written, and was not faked.** The brief asks the
   scheduler to look for "another stage of the same job that needs no machine or a free one". There
   is no such thing in this code: a job's position is one number, `job.labourRemaining`, and its
   stage is derived from that by `stageAt`, so a job is at exactly one stage and the stages are
   consumed in order. The same fact makes the brief's "assembly never starts before the cutting
   stage of its job is complete" already true by construction rather than a gate to add. What was
   built is the rest of the sentence, and it is written up under T21-B2c.

5. **Names in the brief that are not the names in the code.** The session used the code's name
   everywhere and this is the list: `state.arrears` is `state.finance.arrearsAmount`; the months
   counter is `state.finance.arrearsMonths`; `ARREARS_BAILIFF_MONTHS` is `ARREARS_MONTHS_BAILIFF`;
   `runAutoAssign` is `assignStaffTasks` in `src/engine/tasks.ts`, and the job half of it is
   `autoAssignJobs` in `src/engine/staff.ts`; `BANKRUPTCY_LIMIT_FACTOR`, `dropReputationCost`,
   `BUBBLES` and `state.daysBelowOverdraft` did not exist and are new tonight. The brief's three
   difficulties "easy, very easy and normal" are the code's `easy`, `veryEasy` and **`hard`**: there
   is no `normal`, and `hard` is the one whose -5,000 overdraft gives the brief's -7,500.

6. **The bankruptcy check runs at the day's open and not its close.** 2.2 says "Checked at the
   day's close, as today". In the code `checkBankruptcy` is the last line of `runDayCosts`, and
   `runDayCosts` is called from `startDay`. "As today" governs: the cadence is once a calendar day
   and nothing about it moved. The thirty day count is kept in the same place for the same reason.

7. **One baseline red was fixed that was not this turn's doing.** `tests/engine/rotate.test.ts`
   asserted that the art side had delivered no second orientation for anything, and Piotr's own
   commit `d26f66f` delivered `toolCabinet.standard.r.png` between the turns. The test now asserts
   what the loader always promised: the cabinet turned is drawn from its own file and every other
   class still mirrors. Without this the turn could not have had a green check to build on.

8. **The precondition was checked against the working branch and not against `main`.** The brief
   says "main carries Turn 20 merged: APP_VERSION 'v29'". `origin/main` is at `a0a7d37` and carries
   `APP_VERSION` 'v28' and `STATE_VERSION` 16; Turn 20 was never merged into it. The branch this
   session is told to develop on, `claude/determined-tesla-e90ze6`, does carry Turn 20 merged
   (`7982787`, the merge of pull request 20) together with Piotr's own two commits of 19.09, and it
   read `APP_VERSION` 'v29', `STATE_VERSION` 17, the Contracts tab and `docs/ui-style.md`. So the
   substance of the precondition held where the work is being done, and the session went on. **For
   Piotr: Turn 20's pull request is still open, and this turn is stacked on top of it.**

9. **The branch is the session's own and not the brief's.** Section 5 says "Branch
   turn-21-debt-you-can-see from main". The session's standing instruction names
   `claude/determined-tesla-e90ze6` and forbids any other, so that is the branch, as Turns 18, 19
   and 20 each recorded of their own.

10. **2.9 makes every man a whole step slower for very nearly the same money, and three measured
    things change with it. This is the item Piotr most needs to rule on after the cabinet.** The
    rates moved down one rung (0.8 / 1.0 / 1.2 / 1.4 becomes 0.6 / 0.8 / 1.0 / 1.2) while the pay
    moved from Turn 20's weekly figures to Piotr's monthly ones, which for the experienced joiner is
    £600 a week (£2,571 a month by the game's own conversion) against £2,600 a month. So the wage is
    within thirty pounds of where it was and the output is three quarters of what it was. What that
    measured out as, each figure read off the test that asserts it:
    - **A contract piece no longer pays by hand at any tier.** A cut sheet pack is £50 with £30 of
      material; the four tiers take 113, 84, 68 and 56 minutes of bench work at
      £0.1896, £0.2528, £0.3403 and £0.4210 a minute, so the margins are **-£1.42, -£1.23, -£3.14
      and -£3.57**. With one used saw all four are well up again: +£5.02, +£5.09, +£4.01, +£3.58.
      Half of Turn 20's 2.2 ("pays a little by hand and well with machines") therefore no longer
      holds, and `tests/engine/contractPrices.test.ts` now asserts what is true (negative by hand,
      positive with the saw) instead of what was. The piece prices are Piotr's and section 6 of this
      brief forbids touching them, so nothing was retuned to hide it.
    - **The bottom two rungs of the ladder now cost the same per point of speed.** 1,950 over 0.6
      and 2,600 over 0.8 are both £3,250, so an experienced joiner's margin on a piece comes out
      about 7p **above** a man with no experience rather than below him.
      `tests/engine/contracts.test.ts` asserted the old ordering and now asserts that the two are
      within a tenth of a penny of each other, with the reason written out; the excellent man is
      still the dearest per point and is still asserted so.
    - **Scenario (cc), a contract month with an experienced joiner, ends £560 in profit where it
      ended £1,560.** He makes 59 minutes a piece and eight packs a day against a week that wants
      eight, so one week comes up 38 of 40 and costs a point of reputation; 158 packs instead of
      198, £7,900 of revenue, £4,740 of material, and one pay day of £2,600 in place of four
      Fridays of £600. It still ends in profit after his wages, which is what the Turn 20 cross
      check asked of it, so `PACKS_A_WEEK` was left at 40 rather than retuned.

11. **The night premium and the informational minute cost moved with the wage, and both are within a
    few pence of where they were.** A man's minute for the job card is now his monthly wage over
    `WORKER_MINUTES_PER_MONTH` (10,285.71), so an experienced joiner's minute goes from 25p to
    25.3p. The night premium is his monthly wage over `WORKER_HOURS_PER_MONTH` (171.43) rather than
    his week over forty, so a novice's shift premium goes from £24 to £22.75.

12. **A save lifted through both bumps comes back within a pound of itself, and one figure is a
    pound out.** Turn 20 took the monthly wage away and divided it into a week; Turn 21 gives the
    month back and multiplies. A sprayer on £2,700 comes out at exactly £2,700; an office admin on
    £1,900 comes out at £1,899, because £1,900 over 4.2857 was rounded to a whole £443 on the way
    down. `tests/cloud/migrate.test.ts` asserts both, so the rounding is on the record rather than a
    surprise.

13. **The three month arrears ladder is now nearly unreachable by playing badly, and the bailiff
    with it.** 2.2 closes a company whose net position passes 1.5 times its overdraft, and a company
    whose debt keeps growing passes that inside a fortnight. So the final warning at two months
    (`ARREARS_MONTHS_FINAL_WARNING`) and the bailiff at three (`ARREARS_MONTHS_BAILIFF`) can now only
    be reached by a company that missed one bill and was then paid by a client: solvent, but with an
    old unpaid bill still on the books. Both ladder tests in `tests/engine/economy.test.ts` build
    their company that way now, and the day 71 three months bankruptcy is kept. Nothing was removed
    and the bailiff still takes the cheapest machine; it is simply a rarer visitor than it was.
    **For Piotr: is that what he wants, or should the bailiff come before the bank does?**

14. **Doing nothing on Hard is now a dead company on day 22.** The overdraft fills on day 11, the
    bills go unpaid from there, and on day 22 the net position of -£7,778 passes the -£7,500 the
    bank allows. That is exactly the rule he asked for, so `tests/scenarios/thirtyDays.test.ts`
    asserts it rather than working around it.

15. **The mockup and the brief disagree about what a drop costs, and the brief won.**
    `docs/mockups/t21/debt.html` part 2 says "-10 up to £5,000, then -1 per £2,000 to -30" and draws
    -30 on a commercial job of about £51,000. CLAUDE.md 2.4 is Piotr's own of 19.09: ten, then a
    point per £1,000 over £5,000, capped at fifty, and half again for a commercial client. The brief
    wins where the two differ, which the README of the mockup folder says as well, so that job costs
    **50** and the picture's -30 is the older number.

16. **Four readings in 2.1 and 2.3 the drawing did not settle, each tagged [TUNE] in the source.**
    (a) The owes plate says `bailiff due` at three months of arrears, where the drawing's
    `bailiff in 2` counts down: there is nothing left to count and "bailiff in 0" is not English.
    (b) The warning line fires only when the net position has really passed what the bank allows,
    not on the softer "any arrears with the account below zero": the drawing's own sentence says the
    company is past the line, and a line that said so while it was not true would be the old top
    bar's lie the other way about. (c) A company that missed a bill and was since paid is not below
    zero, so the line drops the drawing's "Account below zero and" and opens on the arrears instead.
    (d) 2.3's "a small job shows the same card with green figures" is built as the account figure on
    the `You have` row, green in the black and red in the overdraft: three of the card's four figures
    are costs, and a cost is red everywhere in this game. **If Piotr meant the costs themselves
    green, that is a new rule about colour and wants his word.**

17. **The page behind the bankruptcy card is untouched.** 2.2 asks for `Start again` and
    `Load a save` on the card, and they are on it. `renderGameOver`, the game over page the card sits
    over, still offers `Start again` alone, because the brief asks for the two buttons on the card
    and nothing about the page.

18. **2.7's "another job he is assigned to" is empty in this game, and what was built is the move
    instead. This is a reading Piotr should confirm.** A man is an assignee of exactly one job,
    always: `assignJob` sets `job.assignees = [workerId]` and `addToJob` takes him off every other
    job first, and its own comment is the rule, "Nobody is on two jobs at once" (Turn 19). So the
    set the brief's clause asks the scheduler to look through is empty for every man in the game.
    What T21-B2c built is the **move**: when a man's job is blocked on a machine somebody else has,
    the scheduler puts him on the other job through that same one path, so the chip on his Work Plan
    row, the cell he stands on and the job his minute goes into stay one fact. The other reading, a
    man on several jobs at once, undoes the Turn 19 rule and wants Piotr's word.

19. **What 2.7 is worth, measured.** In the section's own scene, four men, one saw and two jobs (one
    at cutting, one at assembly), the hall works **four minutes where it worked three**. In a hall of
    six men, one saw and six jobs with a man each, measured over an hour, it is **300 worked and 60
    lost, before and after**: every one of those men is the last man on his job, and the scheduler
    never moves the last man off a job, because a job with nobody on it goes back to the ready list
    and nothing would bring him back to it. That is the limit of 2.7 as built, and it is the honest
    shape of the rule rather than a shortfall in it.

20. **Three men the scheduler never moves, each for a reason:** the owner, because nothing is handed
    to him behind his back; the last man on a job, for the reason above; and a man the contract still
    wants today, because the contract fills the day first (T20 2.1.4).

21. **The office will now spend the overdraft down to the last pound without asking.** 2.5.2 orders a
    job's material the minute its drawings are done, and with anybody at all in the office that
    happens without the owner. It cannot cross the overdraft limit: the guard is `canAfford`, which
    is that floor to the penny, and the money was going out anyway. What changed is the timing, and
    it is earlier. No scenario changed its ending.

22. **Two statements in the brief were not true of the code, and are reported rather than built
    around.** 2.5.3 says emails and calls wait for the 8:00 pass: they do not, the assignment pass
    already ran every clock minute from `settle`. What T21-B2b changed is the ordering inside a
    minute, so a task is handed out as it is created and no path can leave one lying. And 2.10 says
    the Company board's per man rate and the insurance's per employee premium "read" the wage: they
    do not. `perMan` is the earned labour rate over heads and the premium is a flat 180 a head, so
    there was nothing to migrate.

23. **Rule two of 2.2, the thirty days below the overdraft limit, cannot be reached by playing. This
    is the finding of the turn's second half and it wants Piotr's word.** It is built, it is tested
    and it works: `state.finance.daysBelowOverdraft` counts, a day at or above the limit puts it
    back to nought, and day thirty closes the company where day twenty nine does not. What T21-C2
    measured is that no company can get there. A company below the overdraft limit can pay nothing:
    `canAfford` floors every cost the player chooses, and every cost he does not choose becomes
    arrears instead of cash. So the account stops dead at the limit and the arrears climb, which
    means **rule one always fires first**. Played out on Hard, doing nothing: the account stops at
    -4,998, the count of days below the limit is nought on every single day of the month, and the
    company is closed on day 22 by the net position. Played out on very easy with the cash pushed
    100 past the limit: the count climbs to 21 of the 30 and the bank closes it on day 28 by the net
    position again. The only two costs in the game that are paid without the overdraft floor are a
    repair bill at the end of a repair task and the 150 of temporary storage, which is the only way a
    cash balance ever ends a day below the limit at all. **So rule two as it stands can only bite a
    company that is below the limit and still paying its way, and nothing in the game produces one.**
    Nothing was changed for this: it is a design call and not a phase B omission. If Piotr wants the
    thirty days to be a real second way to lose, the change is in what the overdraft floor lets
    through, not in 2.2.

24. **The £7,000 of scenario (hh) is the one figure in the three new scenarios that is written rather
    than played**, and it is Piotr's own from 18.09. The hall is played up to day 11 with the
    £50,000 job taken, drawn, costed and its hundred sheets ordered and unloaded; at that point
    £39,714 was still in the account, and playing it down to seven would have been measuring the
    shopping rather than the drop. Everything else in all three scenarios is played.
## The tasks

**T21-A1 Housekeeping and v30, `a4db83b`.** The Turn 20 brief archived byte for byte from the Turn 20
merge commit (`git show 7982787:CLAUDE.md`, 25,868 bytes, `diff` silent), the README's two lists
brought up to date, `APP_VERSION` `'v29'` to `'v30'` with its two tests, and `docs/art/REQUESTS-T21.md`
written from section 9.
One baseline red was fixed with it and it was not this turn's doing: `tests/engine/rotate.test.ts`
asserted that the art side had delivered no second orientation for anything, and Piotr's own commit
`d26f66f` delivered `toolCabinet.standard.r.png` between the turns. Without it the turn had no green
check to build on.

**T21-A2 Phase A, `89fe38f`.** Section 3's list in one commit. `TIER_WORDS` to Piotr's four words,
`WORKER_RATES` to his four rates, `weeklyWage` out and `monthlyWage` in across eleven source files
and thirty three test files, `WEEKS_PER_MONTH` deleted, the payroll moved to the last working day of
the month, `BANKRUPTCY_LIMIT_FACTOR` and `BANKRUPTCY_DAYS_BELOW_LIMIT`, `dropReputationCost`,
`STATE_VERSION` 18 with `liftToVersion18`, `state.finance.daysBelowOverdraft`, the owner's idle
store, the `BUBBLES` table and its types and CSS, the drop card routed as a folder modal, and the
tool cabinet at two cells with its row respread.
It also did three things section 3 does not list, each to leave the tree green in one commit: it
carried the wage rename to the point of compiling, it moved the payroll cadence with the field
(a monthly wage paid every Friday is not a state worth committing), and it took `dropConfirm` out of
`renderWorkPlan`, because the card took it.

**T21-B1a 2.4, `a583085`.** `dropReputationCost` asserted at the brief's five prices and the
commercial cap: 10 at £3,000, 15 at £10,000, 25 at £20,000, 50 at £50,000 and 50 above it, with a
commercial job half again and still capped. The reputation the drop really takes off is asserted to
equal it, through the action and on the ledger's own line.

**T21-B1b 2.2, `6156026`.** `checkBankruptcy` reads the net position, cash less arrears, against one
and a half times the overdraft, and the thirty day count beside it; `netPosition(state)` is the new
reading and it sits beside `bankruptcyFloor`. The bank's card is the drawing's: the head, the date
and the month, the four figures, the epitaph, `Start again` and `Load a save`.

**T21-B1c 2.1, `23488f6`.** The red plate between the cash plate and the clock while
`state.finance.arrearsAmount > 0`, two lines, gone the day the arrears are cleared, and a click that
opens the books at their Summary. A new `WarningKey`, `pastTheLimit`, second in `WARNING_ORDER`,
above everything but the bags.

**T21-B1d 2.3, `15da791`.** The drop card finished against the drawing: the deposit, the material
really written off, the reputation off `dropReputationCost`, the overdraft line, and the red box only
when the deposit cannot be paid, with the word `today` in it only when the close would really fire.

**T21-B1 notes applied, `0c0768d`.** The bankruptcy card's paper, the owes plate's click and the drop
box's ink, plus the one test B1 could not write without them.

**T21-B2a 2.9 and 2.10, `f38a5b0`.** The tiers and the monthly wage proved: the four words, the four
rates, the four wages, the gate at 2,600, the migration, and both of section 7's greps run and
recorded.

**T21-B2b 2.5, `dc16801`.** The site measure to the estimator first and the salesman second, the
material ordered the minute the drawings are done by the clerk or the estimator or the admin, and a
task handed out as it is created.

**T21-B2c 2.7, `75ebd3d`.** `placeHand`: a man is moved to work he can do before he is left to stand.
The two clauses this model cannot say are in section 0 items 4 and 18.

**T21-B2d 2.8, `ce10177`.** The grey segment, the three figure label and the four reasons behind the
hover.

**T21-B2 notes applied, `54ec86d`.** The day's production minute through `placeHand`, so 2.7 is live
for the player and not only on the night shift; the hall's own copy of the waiting phrase replaced by
the one `waitingLine`; `MACHINE_SHORT_WORDS` so the line reads the drawing's "waiting for the saw";
and four comments in the constants that still answered section 7's grep.

**T21-B3a 2.6, `45848cd`.** `src/engine/bubbles.ts` chooses the bubble and fills its slots off the
state; `bubbleArt` draws it as a child of the man's own figure group, so the walker carries it and the
depth sort keeps it with him.

**T21-B3b 2.11 and 2.12, `76b7d6b`.** Everybody goes through doors now, the canteen is a door, and
`STATION_LUNCH` is what tells an eating man from an idle one standing on the same cell.

**T21-B3c 2.13, `ce889fa`.** Phase A's spec and row checked rather than trusted, the `zone 3 by 2`
arithmetic confirmed, the migration's yard case added, and the sprite mismatch measured.

**T21-B3 notes applied, `db8c5a6`.** The bubble's holder moved into the stylesheet and `resetBubbles`
put beside `resetWalkers` and `resetDoors`.

**T21-C1 The notes, `35a4f38`.** Every note of phase A and phase B was applied as its group landed,
in the three commits that say so. What was left for this task was three comments in the older
scenario files that still read Turn 20's tier ladder as the game's current one.

**T21-C2 The scenarios, `db7a7ac`.** `tests/scenarios/turn21.test.ts`, 17 tests: (gg) four men, one
saw, two jobs, played out; (hh) the £50,000 drop that closes the company; (ii) the thirtieth day. The
sixteen months of `thirtyDays.test.ts` counted and green, and the two three month runs of
`playthrough.test.ts` beside them, which is where monthly pay is asserted on days 30, 60 and 89.

**T21-C3 The cross check.** Its own section below, every line answered with the command that answered
it.

**T21-C4 Look and shoot, `f9f4676` and `7c4b20d`.** Ten pictures into `docs/report-t21/`, and four
things they showed, all four fixed.

**T21-C5 The report, this file.**
## Cross check (section 7)

**T21-C3.** Every line of section 7, with the command that answered it and what came back. Nothing
here is a summary of a test: it is the command's own output, run on the branch as it stands.

**The base of every diff is `edf3ae1`**, the tree this turn opened on, and not `main`. `main` is at
`a0a7d37` and carries `APP_VERSION` `'v28'` and `STATE_VERSION` 16: Turn 20 was never merged into it,
so a diff against it would read as two turns of work and not one (section 0 item 8). Where a figure
against `main` is asked for it is given as well.

### 1. A £50,000 drop with £7,000 in the bank closes the company at that day's close, asserted

`npx vitest run tests/scenarios/turn21.test.ts -t "closes the company"`: **2 passed**. The scenario is
(hh) in `tests/scenarios/turn21.test.ts`, played: a hall stood up by the scripted player to day 11
with the job taken, drawn, costed and its hundred sheets ordered and unloaded, the cash written to
Piotr's own £7,000, and the drop made by pressing the red button on the card. The card before the
click reads -£25,000 deposit, -£20,000 material, -50 reputation and the red box ending `Dropping this
job closes the company today.`; after it the arrears are £25,000, the net -£18,000 against the
-£15,000 the bank allows, and the day's close sets `gameOver` with the four figures on the card. It
is picture 3 and picture 4.

### 2. `grep -rn "weeklyWage\|WEEKS_PER_MONTH" src`: nothing but the migration

Eight hits, all eight in `src/engine/migrate.ts`, which is what the line allows: three in the prose
of the two lifts, `WEEKS_PER_MONTH_V17` (the 30/7 the Turn 20 build converted with, written there and
only there because the constant is deleted), and the four reads and one delete of `weeklyWage` that
lift a v28 save up through v17 and on to v18. Nothing anywhere else in `src`.

### 3. `grep -rn "1\.4\|super experienced\|extremely experienced" src`: nothing

**"super experienced" and "extremely experienced": no hits at all.** Turn 20's two words are gone
from the game and from the comments about the game.

`1\.4` has 19 hits and not one is a tier rate. They are: a `line-height: 1.4` in `styles.css`; a spec
`height: 1.4` and `WALK_STRIDE_METRES = 1.4` with its comment in `constants.ts`; `171.43`, the hours
a month of a man is, in `constants.ts`; a `PIPE_STROKE * 1.4` in `render/pipes.ts`; and thirteen
citations of `CLAUDE.md T20 2.1.4` in `contracts.ts` and `production.ts`. `WORKER_RATES` is
0.6 / 0.8 / 1.0 / 1.2 and nothing in `src` says otherwise.

### 4. Four men, one saw, two jobs: nobody stands while bench work exists, asserted

`npx vitest run tests/scenarios/turn21.test.ts -t "four men"`: **6 passed**.
`npx vitest run tests/engine/nobodyWaits.test.ts`: **8 passed**. Scenario (gg) plays the day out: the
hall works **1,920 minutes of 2,400 and loses none to a machine**, every one of the four men puts in
all 480, and the man who cannot have the saw is on the second job by the end of the first minute. The
control, the same hall with both jobs at their cutting stage so there is no bench work to go to, is
**480 worked and 1,440 lost**, which is what the hall did before tonight.

### 5. No figure on the hall for a man in the office or at lunch; the owner alone in the office view

`npx vitest run tests/render/doors.test.ts tests/render/officeRoom.test.ts tests/ui/lunchBreak.test.ts`:
**31 passed**. It is picture 9: 12:25, not one figure on the hall floor, one dashed grey `at lunch` at
the canteen door.

### 6. Every changed screen beside its nearest existing one, and no new token in `src/ui/styles.css`

The screens are in **What the pictures showed** below, each beside the closest screen the game already
has, with the differences written out.

`git diff edf3ae1 --stat -- src/ui/styles.css`: **205 insertions, 2 deletions.**
`git diff edf3ae1 -- src/ui/styles.css | grep -E "^\+\s+--[a-z0-9-]+:"`: **nothing.** Not one colour,
font, radius or shadow value was added to `:root` or anywhere else; every new class reads a token
that was already there. Against `main` the same grep is also empty, over 375 insertions, because
Turn 20 added none either.

### 7. The ten pictures

`docs/report-t21/01` to `10`. Every one is the real app in headless Chromium at 1280 by 800 at one
device pixel, driven by real clicks, standing in front of saves the game's own `encodeSaveFile` wrote
and its own Continue button opened, with the clock stopped by the game's own pause. They are listed
one by one below, with what each showed.
## What the pictures showed

**T21-C4.** Ten pictures in `docs/report-t21/`, each beside the closest screen the game already has.
Every one is the real app in headless Chromium at 1280 by 800 at one device pixel, driven by real
clicks, standing in front of saves the game's own `encodeSaveFile` wrote and its own Continue button
opened, with the clock stopped by the game's own pause. The halls are played up by the scripted
player of `tests/scenarios/autopilot.ts`, the same one the scenarios run on; only the one situation
each picture is about is arranged by hand, the way those scenarios arrange theirs. What was arranged:
the cash in the two money halls (£7,000 and -£7,259, Piotr's own two figures of 18.09), the crew
hall's two jobs and where each had got to, and the standing of 40 on the hire card's hall so the
admin may be taken on and the excellent joiner may not. The staging is in the scratchpad and nothing
of it is committed.

| # | File | Beside | What it shows |
|---|---|---|---|
| 1 | `01-topbar-owes-and-warning.png` | the top bar of T11 3.1 | The red plate between the cash plate and the clock, `owes £25,000` over `arrears, 1 month · bailiff in 2`, and the warning line under the bar. |
| 2 | `02-drop-card-small-job.png` | the machine card of T17 2.6 | The same card on a £3,000 job: -£1,500, -£1,200, -10, the account green, no red box. |
| 3 | `03-drop-card-closes-you.png` | picture 2 | The £50,000 job with £7,000 in the bank: -£25,000, -£20,000, -50, and the box ending `Dropping this job closes the company today.` |
| 4 | `04-the-bank-has-closed-you.png` | the event modal of T13 3.20 | The dark card inside the folder: the four figures, the epitaph, `Start again` and `Load a save`. |
| 5 | `05-four-bubbles.png` | the hall of T19 2.5 | Four colours at once: red `waiting for the saw` and `no cut parts yet`, paper `assembling Garage shelves`, green `sweeping`, dashed grey `in the office` at the office door. |
| 6 | `06-day-meter-with-the-idle.png` | the day meter of T11 3.1 | `243 worked · 157 idle · 540`, the worked runs then the grey, and the hover listing the bands and the four reasons. |
| 7 | `07-hire-cards-four-tiers.png` | the hire cards of T20 2.5 | The four tiers in Piotr's words at £1,950, £2,600, £3,500 and £4,330 a month, at 60, 80, 100 and 120 per cent. |
| 8 | `08-our-team-monthly-pay.png` | Our team of T17 2.9 | Six rows, every one `£X a month`, and no week anywhere. |
| 9 | `09-canteen-door-at-lunch.png` | the hall of T20 2.12 | 12:25, not one figure on the floor, one dashed grey `at lunch` at the canteen door. |
| 10 | `10-tool-cabinet-two-cells.png` | the hall of T13 3.3 | Four cabinets beside four benches, each drawn at the bench's own width. |

### The four things they showed, and what was done

1. **The owes plate burst out of the top bar.** It could give way and its text could wrap, so at
   1280 it was squeezed to 103 px, its two lines wrapped to four, and the plate stood 110 px against
   the bar's 70: it hung 20 px above and below the bar, `bailiff in 2` sat behind the warning strip,
   and the cash plate broke `-£7,259` with the minus on its own line. `.name-plate` and `.owes-plate`
   are `flex: none` and the plate is `white-space: nowrap`; it stands 212 by 53 now, the height of
   the cash plate beside it.
2. **`Drop it anyway` was not red.** `.modal-folder button:not(.chip):not(.modal-close)` is three
   classes and an element and beats `.btn-danger`, which is one class, so the one red button in the
   game came out cream with green ink. A rule of the skin's own, `.modal-folder button.btn-danger
   :not(.chip)`, puts it back in `--bad`, which is the drawing's own colour, the way
   `.modal-board button.is-danger` has worked since Turn 17.
3. **The bank's card was cut in half by the fold.** The bankruptcy event took the small folder and
   its last line ended at "built 0 of". It takes the middle folder now, with the day end and the
   month end.
4. **The whole top bar fell off the page while the tile was up**, found by the lead looking at
   picture 1 after it was taken, and it is the one that mattered most. The plate is 212 px of bar
   that was not there before, and `.day-meter` carried `min-width: 340px`, which a flex row cannot
   shrink past, so the bar came to 1,452 px at 1280 and the Office button, the Menu button and the
   gear were off the right edge: three controls the player could not reach, in the one state of the
   game that most needs him to reach them. The meter is `flex: 0 1 340px` with `min-width: 0` now.
   **What that costs:** while the tile is up the meter is 154 px and its prose line is ellipsed away,
   leaving the lamp, the three figures of 2.8 and the bar. The figures are what this turn added and
   the prose is also on the Our team page. With no arrears the meter is 340 px and exactly what it
   was, which is picture 6.

### What the pictures showed and was left alone, with the reason

- **Two bubbles over two men at one machine overlap**, so in picture 5 `waiting for the saw` is
  mostly behind `no cut parts yet`. 2.6 gives a bubble a depth sort and an anchor over the head and
  no rule at all about moving one out of another's way, and the drawing happens to stand its men
  apart. It is worth Piotr's eye because the queue at the saw is the very scene 2.6 and 2.7 are
  about, and it is the first thing to fix in the bubbles next turn. The hall's name labels have
  collided in the same way since Turn 9.
- **A bubble sits about 30 screen pixels over the head and not 6.** The 6 is in the figure group's
  own space, over `characterTop`, and the camera scales it with everything else.
- **The bank's card says "took £0 in orders"** for a company whose one order was the £50,000 it
  dropped: the epitaph counts the jobs on the books and a dropped job is off them. It could be read
  off the ledger's own deposit lines instead, which needs no new field, but what the epitaph counts
  is not a thing 2.2 settles.
- **The drop card's three costs are red and only the account is green.** The [TUNE] reading of
  section 0 item 16(d), waiting on Piotr.
- **Older than tonight and left:** two hall labels on top of each other where two tool cabinets stand
  together (Turn 20 recorded it), `.seg-assigning` with no colour in the meter's legend (not on
  `main` either), and no Hire button in picture 7 because that hall is `Crew 5 / 5, floor limited`.
## Numbers chosen

Every figure this session chose for itself, grouped by the section it belongs to. Piotr's own
figures are not here: they are in the brief and they are tagged `[PIOTR]` in the source.

**2.1, the owes plate and the warning line.** The plate says `bailiff due` at three months of
arrears where the drawing counts down, because there is nothing left to count and "bailiff in 0" is
not English. The warning line fires on the net position alone and on nothing softer, because the
drawing's own sentence says the company is already past the line. A company that missed a bill and
was since paid is not below zero, so the line drops the drawing's "Account below zero and" and opens
on the arrears. The plate is 212 by 53 px, the height of the cash plate beside it, and the day meter
gives way to it at 154 px.

**2.3, the drop card.** "Green figures" on a small job is the account figure on the `You have` row,
green in the black and red in the overdraft: three of the card's four figures are costs, and a cost
is red everywhere in this game.

**2.5, the office.** A job's auto order goes on the ledger as `Material for <job>, ordered by <name>`,
because a ledger entry has no field for a person and adding one is a frozen file nothing else would
read.

**2.6, the bubbles.** `BUBBLE_BOX = { line: 34, tail: 9, char: 12, pad: 26 }` scene pixels. The head
the bubble hangs over is the crown and not the centre, because six pixels over the centre puts the
tail's point in a man's hair. One bubble a door, deduped by its words and stacked a box at a time,
because three men saying "in the office" are one thing said. Every bubble's words are remembered and
only the paper ones expire. `stageDoing` says spraying for a lacquered job and sanding for any other.
`clientMeeting` says "in the office", because inventing a line for a man at a client's is building
something visual out of words.

**2.7, the scheduler.** It looks through the jobs in the hall's own book order. `no cut parts yet` is
said at a cutting stage only; at any other stage the men of a queue are waiting for the machine.
`MACHINE_SHORT_WORDS` carries the five families a man can really queue for and leaves the edgebander
to its catalogue name, which is already the trade's word.

**2.8, the day meter.** All three figures are always printed, even on a day with no idle minute in
it. "Nothing assigned" is said when there is work about that he is not on; "in the office with
nothing to do" when there is not.

**2.9 and 2.10, the tiers and the pay.** The helper's £1,800 a month: he never had a monthly figure,
and 1,800 is his Turn 20 week over the month and a round number. Every other role's monthly wage is
the figure its own Turn 20 comment already named. `WORKER_HOURS_PER_MONTH` 171.43 and
`WORKER_MINUTES_PER_MONTH` 10,285.71 in place of `WEEKS_PER_MONTH`.

**2.13, the cabinet.** The zone is the footprint and not the brief's 3 by 2, for the arithmetic in
section 0 item 1. The row is six slots two cells apart starting at x 8, because the old first slot
covered the cell the man at the day one saw stands on.

---

## What was not done tonight, and why

- **The brief's `zone 3 by 2` for the tool cabinet** (section 0 item 1), and the `MACHINE_SHORT_WORDS`
  question of whether the hall should say "the saw" while the Machines page says "Table saw" is
  answered one way and is one line to answer the other.
- **2.7's "another stage of the same job"** and **"another job he is assigned to"** (section 0 items
  4 and 18): the first cannot be expressed by a job that stands at one stage, the second is an empty
  set in a game where nobody is on two jobs at once.
- **Rule two of 2.2 cannot be reached by playing** (section 0 item 23). It is built, tested and
  correct, and nothing in the game produces the company it would bite.
- **The bailiff is nearly out of the game** (section 0 item 13), as a consequence of 2.2 and not as
  a thing anybody removed.
- **Two bubbles at one machine overlap**, and the bubble sits about 30 screen pixels over the head
  rather than 6 (both in the pictures section).
- **The bankruptcy epitaph counts jobs on the books**, so a company that died of a drop took £0 in
  orders.
- **No art was drawn and no sound recorded.** The tool cabinet's two files want redrawing at
  160 by 136 (section 0 item 2), the sprayer's four sheets and the helper's bench sheet are still
  outstanding, and the seven recordings of `docs/art/REQUESTS-T20.md` are still seven.
  `docs/art/REQUESTS-T21.md` carries all of it.
- **Everything section 8 of the brief parks stays parked**, the walk above all: it wants the animated
  mockup first, and nothing visual is built without one.
