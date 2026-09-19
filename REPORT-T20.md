# Report, Turn 20: contracts that pay, people you can run

Woodwork Empire, Turn 20. Built against `CLAUDE.md` of 18.09.2026 (first line "Turn 20").
Branch `claude/woodwork-empire-t20-3a7zg6`, off the v28 tree (`d35e9b5`). `APP_VERSION` v28 to
v29, `STATE_VERSION` 16 to 17.

`npm run check` on the finished tree, read off its own exit code: **exit 0**, **196 test files,
1,887 tests** and one todo, up from 173 test files on the v28 tree this turn opened on, whose own
last count was 1,740 tests at the end of Turn 19. Six sets of hands: one agent for phase A, three
for phase B in three worktrees on three branches of their own, an adversarial reading of every
phase's own diff, an integrator who merged the three in three merge commits, and one agent for
phase C. `npm run check` green on its own exit code before every one of the twenty six commits of
work and on each of the three merges.

Two lines a task, in the order of section 5, each with the commit it sits in. This report is the
turn's one document: phase A's notes and the three phase B groups' notes are folded into it and
their four files are deleted, so what the session chose, what it could not do and what is left for
Piotr is in here and nowhere else.

## 0. Blockers, and where the session did not follow the brief to the letter

**Nothing stopped the build.** Everything in sections 2.1 to 2.16 is built, tested and
photographed, nothing on the "do not" list of section 6 was done, and every v28 save loads: a v28
save is written out in `tests/cloud/migrate.test.ts` and lifted, with five tests on it. Ten things
want Piotr's eye, and the first is one of his own figures that had to move.

1. **The wardrobe front draws 0.3 of a sheet now and not 1.1, and that deviates from the letter of
   2.2. It is the one thing in this turn Piotr most needs to rule on.** The piece table's own rule
   is material = `sheets` x `SHEET_VALUE` (200), and two of the three pieces obey it to the penny:
   the cut sheet pack 0.15 x 200 = 30, the drawer box 0.13 x 200 = 26. The wardrobe front did not.
   2.2 sets its material at 60 and says in as many words that "`sheets` per piece stays what it
   is", which for this piece is v28's 1.1, worth 220 off the rack. In v28 the pair agreed (material
   220 beside sheets 1.1); this turn moved the price and the material and left the sheets. Left
   apart, the offer card would print `Material a piece -£60` and `Margin a piece +£100` for a piece
   that really draws about £220 of stock and loses about £90, and the closing report would
   understate its material by the same factor: a tab whose whole purpose (2.1) is to tell the
   player whether a contract pays before he takes it would report **the opposite sign** on one of
   the three pieces. T20-C1 set the sheets to 0.3 (60 over `SHEET_VALUE`), tagged [TUNE] with the
   deviation written out in plain words in the comment above the table, and
   `tests/engine/contractPrices.test.ts` now holds every piece's `sheets` x `SHEET_VALUE` within a
   pound of its `material`, so the two readings of one piece can never part company again. **The
   other answer is Piotr's**: keep 1.1 sheets and move the material and the price together, about
   220 of material and about 320 a piece, which holds the same margin an hour and the same 22 to 30
   band. One of the two has to be true, and either is one line.

2. **A contract piece is worked at its first stage only, so half of 2.2's promise about machines is
   not kept.** The engine, the offer card and the machine tip all read `piece.stages[0]`, so the
   wardrobe front, whose stages are cutting and finishing, is a cutting job: a CNC or a saw
   shortens it and a spray booth buys nothing on it. The engine and the card agree with each other,
   so nothing on screen lies about the figures the player is shown, and the three margins an hour
   by hand are what 2.2 asks for. What is missing is the rest of that sentence, the edgebander and
   the spray booth on the other stages taking the same pieces to 40 and 60 an hour. Putting it
   right means a piece that moves from stage to stage inside the minute loop, with the station and
   the hall following it, which is a turn's work of its own.

3. **The branch, and the base every diff is read against.** Section 5 says "Branch
   turn-20-contracts-that-pay from main". The session's own standing instruction names
   `claude/woodwork-empire-t20-3a7zg6` and forbids any other, so that is the branch this turn is
   on, as Turns 18 and 19 say of their own. `main` in this repository, local and origin alike, is a
   stale two commit branch of unrelated history with no source on it at all (`276f494 Create
   CLAUDE.md`, `d7b8084 Initial commit`), so it is not the base either: the base of this turn is
   `d35e9b5` ("t20"), which carried `APP_VERSION` `'v28'`, `STATE_VERSION` 16, `assignMove` in
   `src/ui/jobCard.ts`, the helper's walk sheet and the Turn 20 brief. Both preconditions of the
   brief were checked against it before a line was written. Every "diff main" of section 7 was run
   against `d35e9b5`, and the cross check says so where it answers them.

4. **2.14 was built by B2, although the task queue gives it to B3.** The one word ("0 h" where the
   Machines column said "none") lives in `src/ui/company.ts`: section 3 of the brief gives the
   company rows to B2 and the task queue lists 2.14 under B3's T20-B3c. B2 did it, so that one file
   had one owner for the night, and B3 wrote it out as a note with the exact old and new text
   rather than edit a file outside its own list. Phase C found the note already answered. What the
   pictures then caught in it, a week the machines cost the workshop time reading as a nought, is
   finding 11 of the look and shoot.

5. **Phase B ran in three worktrees, and the six frozen files stayed phase A's and phase C's.** The
   three groups worked on three branches in three git worktrees off this one, and an integrator
   merged them in three merge commits (`4d18f34`, `589d463`, `419bc39`), each branch checked file
   by file before its merge. Not one phase B commit touches `src/engine/types.ts`,
   `src/engine/constants.ts`, `src/engine/index.ts`, `src/engine/game.ts`, `src/ui/app.ts` or
   `src/ui/styles.css`; what phase B needed in them it wrote out as notes with the exact old and
   new text, and T20-C1 (`32960b6`) applied every one after verifying it against the merged code.
   That is why several paragraphs of this report read as phase B left them and then say what landed
   afterwards.

6. **The owner is costed on an offer and cannot be put on one.** 2.1.1 asks for "the owner and
   every joiner on the books" in the picker, and he is there: pick him and every figure on the card
   is worked out for him, his minutes at rate 1, his labour at his draw (`ownerDrawPerDay` over the
   working day, which makes him the dearest man in the hall on a contract), his day drawn as
   blocks. What he does not get is `Take it, <name> on it`: his row says `A contract is work for a
   joiner: you cannot be put on one` and his button is a plain `Take it`, which accepts the offer
   and nothing else. Carrying him further would be a rewrite of the contract minute loop around a
   man who is not a `Worker` (`assignContract` looks the man up in `state.workers`, where the owner
   is not; `contractHands` returns `Worker[]`; `runContractMinute` reads `worker.rate`,
   `worker.station` and `worker.jobId`), which is a long way outside what 2.1 states line by line.
   **For Piotr: should he be able to stand at a contract himself?**

7. **The overflow of a job's own delivery is held on its pallet, and nothing is charged for it.**
   2.16 offers either home, "the `moveOverflowToStorage` path, one charge" or "held on the pallet
   until the rack has room". B1 took the pallet: the 65 sheets a £50,000 job's lorry cannot fit on
   a 50 place rack stand on the job's own pallet, `reservedSheets` takes them off the job's
   reservation so the rack's free count stays the rack's, `landPalletSheets` puts them on the rack
   as the saw makes room without a click and without a task, and `writeOffSheetsLeftOutside` passes
   the pallet over. A stock lorry's overflow is still the yard question of Turn 2, storage, charge
   and all.

8. **"the week's result: pieces x margin, less his wages for the days it takes" is the pieces times
   the margin, and his wages are not taken off twice.** The margin a piece already has his labour
   in it, two lines earlier in the same paragraph of 2.1.1 (`margin = price less material less what
   his minutes cost`), so taking the days' wages off the product would count the same wages a
   second time. The mockup settles it: its own row reads `Week: 40 pieces x £9 - his 4 days' wages
   already counted` and its figure is 40 x 9. The card says the same in the game's words, `The
   week: 40 pieces, 4 days of wages already counted`, and the figure is the product. Where the
   wages are taken off in full is the month: scenario (cc) counts the four Fridays one by one off
   the payroll, not off the card.

9. **The Efficiency plate on the top bar wears no cross, and that is a judgement call.** 2.15 says
   every modal, popover and list has the cross, Escape and a click outside. The plate is the body
   of a native `<details>`, opened and shut by the same summary it hangs from, and section 6 of
   this brief forbids any change to Efficiency, so it was left as it is and written into the
   popover test's own list of things that float over the page and are not popovers, each with its
   reason. If Piotr wants it a popover it is a cross and a line in `ESCAPE_ORDER`.

10. **Only the owner goes through a door; the rest of the crew stand at the doorway.** 2.12 says a
    figure whose leg ends at a door cell goes through it. The office view draws one man, the owner,
    in one box measured for him in T19 2.2, so an estimator sent through the door would be on
    neither picture: B3's review caught exactly that, an estimator at a take off vanishing off the
    hall and not appearing in the room. The going through is the owner's, through one predicate
    (`figureGoesThroughDoors` in `src/render/doors.ts`), and everybody else stands at the doorway
    as he did in Turn 19. Nothing visual is built without a mockup (PIOTR, 18.09), and the crew's
    desks are a drawing nobody has made; the day it lands, that predicate is the one line that
    changes.

Everything the three groups' notes listed as not done is in **What was not done tonight, and why**
below, each with its reason.


## Phase A

**T20-A1 Housekeeping and v29, `331cbf5`.** The Turn 19 brief was archived byte for byte from the
Turn 19 merge commit (`58987d1`) into `docs/turn-19-brief.md`, the README's lines were moved on,
`APP_VERSION` became `'v29'` (the one bump of the turn), `docs/art/REQUESTS-T20.md` was written from
section 9 and `docs/ui-style.md` was written out of the code as it stands: the three modal skins,
the tokens, the buttons, the chips, the one cross, the fonts and the two figure sizes, each with its
CSS class.
`npm run check` green on its own exit code.

**T20-A2 Phase A proper, `7663175`.** Section 4's state: `STATE_VERSION` 17, the four tier ids
through the types with every compile error fixed by the rename, `weeklyWage` as the one wage field
with `monthlyWage` gone, `leavesOnDay`, `serviceCount`, `inServiceUntilDay`, `contract.endedBy`, and
the version 16 to 17 lift behind them; `CONTRACT_PIECES` at the prices of 2.2; `sweep` in
`ANIMATIONS`; the Work Plan's two tabs and the Machines page routed but empty; `data-popover` on the
popovers that exist.
`npm run check` green on its own exit code. Every figure it chose is in **Numbers chosen** below,
and what phase B had to know went into the three worktrees with them.

**T20-A3 Phase A reviewed, `712694c`.** Three adversarial readings of the phase A diff gave fourteen
findings; eleven stood and were put right, two were rejected because the decision behind them
belongs to a later phase or to Piotr, and one was the same finding twice. The
blocker was the lift: an interview the owner was sitting in when a v28 save was taken carried the
old tier id in its hire order, so the hour was spent and nobody was taken on. The rest were the
Company board's crew lines going empty at the new rates, the Accounting page still promising a
salary bill nothing charges, the offer card not redrawing when the player picked another man, the
why popover missed by the `data-popover` pass, the hiring gate reading a different reputation
figure from the board, and the lift with no test behind it.
`npm run check` green on its own exit code. Each of the fourteen findings, confirmed or rejected,
is written out one by one in that commit's own message.

## Phase B, B1: the money

**T20-B1a The prices that pay (2.2), `0a8eeb5`.** `CONTRACT_PIECES` came from phase A at Piotr's
figures and this task proved them: by hand a cut sheet pack makes £26.67 an hour of margin, a drawer
box £26 and a wardrobe front £25, each inside the band of 22 to 30, and the wardrobe front is four
hours of work and no longer three days. `tests/engine/contractPrices.test.ts` prints the three
figures for this report and asserts the band, and it prints what one piece comes to for each of the
four tiers, by hand and with a used saw.
`npm run check` green on its own exit code.

**T20-B1b The contract fills the day first, and the client who ends it (2.1.4, 2.1.6),
`7fbbbc3`.** A man
assigned to a contract keeps the job he is standing on: the contract books his pieces from 8:00
until the day's share of the week is made and the job has what is left of the day, which is one
predicate, `contractWantsToday`, read by the job's hands, by the contract's minute and by the tab.
A second short week in a term now ends the contract, the client's own ending, with the closing
report marked `ended by the client`.
`npm run check` green on its own exit code.

**T20-B1c The Contracts tab (2.1.1 to 2.1.3, 2.1.5), `b5ac625`.** The Work Plan's second folder:
every offer as a card costed for the man who would do it, with his day drawn 8:00 to 17:00 a block a
piece, the next best man's day beside it, the one machine that would shorten the piece most with its
figures computed, and `Take it, <name> on it` in one click; Running with the week live, the amber
minutes that go to his job and `End the contract`; Ended greyed. The v28 contract bar left the Jobs
tab, it was not copied.
`npm run check` green on its own exit code.

**T20-B1d A job's own delivery is the job's, rack or no rack (2.16), `960406a`.** What would not fit
on the rack stays on the job's pallet instead of being lost, `shortfallOf` counts it and the pallet
lands as the saw makes room, so a £50,000 bespoke job is one order, one unload and nothing short
after it. A stock lorry's overflow is still the yard question of Turn 2.
`npm run check` green on its own exit code.

**T20-B1 reviewed, `f9fae91`.** An adversarial reading of the B1 diff gave six findings. Three stood
and were put right: a contract short of sheets used to freeze the man off his job as well and stand
him at his bench all day, the Orders page still called a contract the client had walked away from
"the term is over", and two clock positions were typed into the day track. One stood and was a line
in a frozen file, the Work Plan handing the picked man to the tab, which T20-C1 applied. Two are put
in front of Piotr below.
`npm run check` green on its own exit code. Each finding, confirmed or refused, is written out one
by one in that commit's own message.

### Two things Piotr has to answer

Both are in section 0 above, where the blockers are. They are kept here as well, in the words of the
agent that found them, because this is where the money was built.

1. **The wardrobe front is costed at £60 of material and draws about £220 of sheets.** 2.2 sets it
   at `material: 60` and says `sheets` per piece stays what it is, which for this piece is 1.1
   sheets, and a sheet is £200. The card therefore prints a margin of +£100 a piece on a piece
   that empties the rack three and a half times faster than that. The other two pieces agree with
   themselves (30 against 0.15 of a sheet, 26 against 0.13). One number settles it: the wardrobe
   front's `sheets` at 0.3, and **T20-C1 moved it**, tagged [TUNE] with its reason beside the
   table: everything else in 2.2 (the material of 60, the stated margin of 100 a piece, the band of
   22 to 30) and the whole purpose of 2.1 need the table to agree with itself, and a tab built to
   tell the player whether a contract pays would otherwise have reported the opposite sign on one
   of the three pieces. It **deviates from the letter** of 2.2's "sheets per piece stays what it
   is", and that is the deviation of this turn Piotr most needs to rule on: the other way of
   settling it, keeping 1.1 and moving the material and the price together, is his to take.
   Section 0.1 above has the change, the test behind it and the other answer.
2. **A contract piece is worked at its first stage only.** The engine, the card and the machine
   tip all read `piece.stages[0]`, so the wardrobe front is a cutting job: a CNC or a saw shortens
   it and a spray booth buys nothing on it, against the sentence of 2.2. The engine and the card
   agree with each other, so nothing lies to the player about the figures he is shown; what is
   missing is the second half of 2.2's promise. Putting it right means a piece that moves from
   stage to stage inside the minute loop, with the station and the hall following it, which is a
   turn's work of its own.
---


## Phase B2, the people (2.3, 2.4, 2.5, 2.6, 2.7, 2.14)

**T20-B2a Four tiers in the words the game prints, and everybody paid by the week (2.5, 2.6),
`72f63d5`.**
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

**T20-B2b The estimator works by his minutes, goes on site, and is off the Output list (2.3),
`180b5ed`.**
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

**T20-B2c Let go: a week's notice, paid, and the plan shows the hole (2.4), `0207f23`.** Our team
carries `Let go` on every worker's row and never on the owner's. One click gives him seven days of
notice [TUNE]: he stays on the books, on his job and on his contract, and Friday pays him. The
morning after his last day the day start walks him out, off the job, off the contract, with whatever
he was holding back on the list, and the plan draws his work with nobody on it. No reputation moves,
and the crew limit and the hiring gate count him until he has gone.
`npm run check` green on its own exit code. The click itself wants three lines in the frozen files
(the action, the reducer case and the route); they were written out for phase C and landed in
T20-C1, and the row was already drawn with the `data-do="letGo"` phase A left open.

**T20-B2d Our team says what the week was, and a machine nobody stood at says 0 h (2.7, 2.14),
`82422ad`.**
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

**T20-B2 reviewed, `0af99ff`.** A reviewer read the four commits and reported eight things. Three
stood and are fixed: the week's meters booked a minute for every man the clock ran over, worked or
not, so an evening of the owner's overtime put two hours into every man's week and a joiner at an
empty rack read a full day at the bench, and the sampler now credits a band only when the man's own
counters rose and leaves the crew out of the evening altogether; 2.7's own test asserted the formula
against itself and now pins the jobs band to the engine's count of the minutes he made something in;
and the week was drawn as a second `.row` under a man instead of the second line inside his own row
that the rest of the game uses. Two more are fixed as far as my files reach: the Technical tab
worked Joinery Core out for an experienced man whoever was at the desk, and now names the estimator
on the books and prints his day. Three are rejected, with the reasons written out one by one in that
commit's own message: the dead `Let go` click is three lines in three frozen files and hiding the
button would break 2.4; the eligible list test carries the roles the brief names and is a content
check; and the take off's minutes want `src/engine/jobs.ts`, which is not mine, in the same commit
as the override they replace.
`npm run check` green on its own exit code. Two new engine tests and one new UI test, all three red
on the old code.

---

## Phase B3, the hall

The six tasks and the review first, then what each one built.

**T20-B3a Why the helper stands beside the dirt (2.8), `735480a`.** The diagnosis in its own commit
and before a line of the fix: the cause is the dust band, and the whole of it is the section **The
helper: why he stood beside the dirt** below, with the figures it measured, the three causes it
refuted and the scenario that proved it.
`npm run check` green on its own exit code, with `tests/engine/helperDirtyHall.test.ts` asserting
the fault exactly as it stood before anything was changed.

**T20-B3b The helper empties the bags and sweeps with a broom (2.8.1, 2.8.2), `366a3ae`.** The chip
under the hall reads `Dave is emptying the bags` with no button on it, driven by the open task and
the man holding it and not by the role table; cleaning became a station of its own so that
`animationForStation('cleaning')` returns `sweep` and the helper plays the broom sheet the v28 patch
delivered, with a role that has no sweep sheet falling to `bench` through one table.
`npm run check` green on its own exit code.

**T20-B3c Machines: the inventory, the bar of life and the service that buys it (2.9), `9000a19`.**
The new laptop page under a new Equipment group, a row a machine with its own sprite cell, its
class, the bar of its life and Service with its price on it; the service rule of 2.9.1 to 2.9.4
behind it, worked out from the original life every time so a lifted save and a machine serviced ten
times come out at the same figure.
`npm run check` green on its own exit code.

**T20-B3d The rack can be sold, when it is empty and nobody is at it (2.10), `0c3461b`.**
`isSellableFamily` takes the storage family, and two refusals in one sentence each read by the
button and by the engine behind it.
`npm run check` green on its own exit code.

**T20-B3e The door is a door you go through, and the hall is silent until the files (2.12, 2.13),
`acd5936`.** The swing of Turn 19 and its two open frames are deleted, a door is drawn closed
always, the owner goes through it to his desk in the office view, and the synthesised stand ins are
gone so that the hall makes no sound at all until Piotr's recordings land.
`npm run check` green on its own exit code.

**T20-B3f A figure is painted where his feet are (2.11), `ce046b2`.** The depth key is computed from
the cell a walker's feet are on this frame, and the re-sort is the cheap swap among siblings that
REPORT-T19 proposed, asserted with the fake clock both ways: one move on the crossing frame, none on
sixty quiet ticks.
`npm run check` green on its own exit code.

**T20-B3 reviewed, `fd9e7fa`.** An adversarial reading of the B3 diff gave eight findings. Five
stood and were fixed in B3's own files, and the blocker was the worst thing in the turn: 2.12 took a
figure off the hall at the office doorway while the office view draws the owner alone, so an
estimator at a take off, an admin on the books or a draftsman at the board was on neither picture.
The going through a door is the owner's now, through one predicate, and everybody else stands at the
doorway as he did in Turn 19. With it: the sixty tick stability test was measuring a second, always
idempotent re-sort and now reads the count `stepWalkers` returns; `sheetsStrandedBySale` counted
racks that were already sold, so the last two racks could both be sold in one day with the sheets
still on them; a man sweeping was labelled "waiting" because `stationLabel` had no word for the new
station; and the day a service costs had no test, because the scripted player defers it to the last
hour. Two were confirmed as facts whose fix sat in a file B3 may not edit and became notes that
T20-C1 applied (the service paid and the machine out at the press of the button, and 2.14's `0 h`),
and one was a note already.
`npm run check` green on its own exit code. Each finding, confirmed or refused, is written out one
by one in that commit's own message.

### 2.9 Machines: the inventory, the bar of life and the service that buys it

**The page.** A row a machine, under Equipment on the laptop: the sprite's own cell small on the
left, the name and the class, then the bar of its life with `2,140 of 3,600 h` under it, then
Service with its price on it. The row is the game's own row and the bar is the game's own bar, the
one a contract's week is drawn with, because a life against a total and a week against its
quantity are the same picture (docs/ui-style.md 11, 13). The row says `broken`, `in service`,
`past its life` or `service due` where the class is, and where the button would be it says why
there is none. Four CSS rules are wanted for it, all of them modifiers on families that exist and
all of them on tokens that exist; they were written out for phase C, landed in T20-C1, and the page
read correctly without them.

**The service rule.** A service extends the machine's life by half of its **original** life the
first time, a quarter the second, an eighth the third, counted off `serviceCount` and worked out
from the original every time, so a machine serviced ten times and a lifted save come out at the
same figure and the bar's total grows with each one. It costs `SERVICE_COST_FRACTION` of what the
machine cost; that constant was in the frozen `constants.ts` and still read 0.02 when B3 wrote this,
so the tenth was a note for phase C, which T20-C1 applied. Every line of code and every test reads
the constant and never the figure, so both readings were true of the same code.
The machine is out from the call until the next working day, the first service included: nothing
runs on it (`freeMachines` passes it over), its stage stops the way a broken machine's does
(`familyStopped` answers `service` beside `broken` and `bags`), and the chip under the hall says
`The table saw is in for a service, nothing runs on it today` with no button on it. Past the end
of its life the machine does not vanish and is not scrapped: it goes on working and gives up
twice as often for every week of its own clock it runs past the end, capped at a certainty, and
the row says `past its life`.

**The half hour at the spanner, and where it went.** 2.9 says the rule "replaces Turn 8's 30
minutes at 2%", and its four numbered points say what a service gives, costs and takes and what
happens past the end. B3 read none of the four as taking the half hour of somebody's time away and
left it standing, with the three places in the frozen `game.ts` written out as a note in case Piotr
meant it to go. The review overruled that reading: "paid when called" and "out for one working day
from the call" leave no room for a man to work it off first, and the note was raised from a question
into a required change. T20-C1 applied it. A service is called in now, from the Machines page or
from the choice on its own event, and the press pays for it, takes the machine out and closes the
reminder in the same minute; `applyTaskCompletion` has no service case left, and the reminder stays
on the Do these list so the player can see the machine is due, with `Call it in on the Machines
page` where its Start used to be. T20-C3 found the last of the old path, a Start still drawn on that
row, and `startTaskCheck` refuses it.

**The scripted player was re-scripted, and nothing was re-measured.** A service now costs the
machine a working day, so the careful owner of `tests/scenarios/autopilot.ts` leaves the service
event until the last hour of the day instead of taking the spanner at once. Without that, the
three month playthrough loses the day its saw is serviced in the middle of month 2 and the seeded
run never earns the standing of 10 that a production manager wants, although it delivers the same
29 jobs: the manager and the five days away both fall over. Every assertion of the playthrough
stands as it was written.

### 2.10 The rack can be sold

`isSellableFamily` takes the storage now, so the rack and the tool cabinet stand beside the
machines, the extraction and the bench; the office furniture is still a fitting. Two refusals come
with it and they are one sentence each, read by the button and, once note 8 lands, by the engine
behind it: `Empty it first, 24 sheets on it` while the hall's stock would have nowhere to go
without this rack, and `Somebody is standing at it` while anybody's station is the rack, which is
the question to ask of a rack because nobody ever claims one the way a man claims a machine. The
sale itself is the sale the game already has: one Sell, the second click to mean it, the buyer's
van in the morning.

### 2.12 The door is a door you go through, and 2.13 the hall is silent until the files

**The door.** A door is drawn closed, always: one leaf lying flat in the face of the room, hung on
the left jamb, and the two open frames of Turn 19 are deleted with the sixty degree half angle
that made them. The swing driver in `src/render/doors.ts` is gone with them; the file's three
hooks, which the frozen `app.ts` calls, keep their names and their beat and do the door's new job,
which is bookkeeping: who is through a door this frame, and how many men have gone in or come out
since the ui layer last asked.

**A man goes through it.** When a figure's leg ends on the office's doorway cell he leaves the
hall's drawing: he is not standing in the doorway and he is not in a corner, he is in the room, and
the office view draws him at his desk, which is Turn 19's office half kept as it was. The walk to
the door is still seen, because the two halves are both asked: the engine has to have him behind
the door and his walker has to have got him there. His walker waits on the doorway cell while the
page is not drawing him, so a man who comes out comes out of the door and walks on from it instead
of appearing at the far end of the hall. Turn 19's `is never absent from the hall` is therefore
the opposite of what it was, and it says so.

**Only the office.** The canteen's door cell is deliberately not one a man goes through. It is
where a man with nothing to do, and a joiner with no bench to work at, stands about (T4 3.4,
T11 3.4), which is the hall and not the room behind it; nothing behind that door is drawn, so a
man sent through it would be nowhere at all, and the player would lose sight of his own crew at
dinner. The office is the one room this game draws behind a door.

**The silence.** The synthesised stand ins are deleted: `play` and `loop` make nothing at all
while the named file is not in `public/sounds/`, and there are no files, so the hall is silent.
The Settings controls stay exactly as they are, every hook stays where it is, and the day Piotr's
recordings land they are heard with no code change: the loader asks for a file once, on the first
play, and remembers what it found. The door's knock is fired through `hallOneShots`, which the ui
layer plays, so `src/render` no longer imports `src/ui/sound.ts`: the names of the sounds now
belong to the render layer, which is what reports the events, and the ui layer reads them from
there. `grep -rn "from '../ui/sound'" src/render` returns nothing, and a test in
`tests/render/doors.test.ts` is that grep.

### 2.11 A figure is painted where his feet are

REPORT-T19 wrote this one up and did not do it: the hall sorted a figure by the depth key of the
cell he was walking TO, so for the whole of a walk he was painted in the order of where he was
going, passed behind a machine he was in front of, and snapped into place on arrival. It is done
now, and it is the cheap re-sort that report proposed rather than a sort of the scene.

Every drawable the hall builds carries the depth it was sorted at, written on its own first tag as
`data-depth`. A figure's own key is `depthKey` of the cell his feet are on this frame plus the one
`FIGURE_DEPTH_OFFSET` the hall has always painted him in front of his cell with. After the walkers
have moved, and again after every render, each figure is compared with the sibling before it and
the sibling after it and swapped only where its key has crossed one: a frame in which nothing
crosses moves nothing, and a drawable with no depth on it is a boundary that is not crossed. The
walk from behind a machine to in front of it therefore changes the painter's order exactly once,
as his feet cross it, and sixty ticks of a hall in which nothing crosses move nothing at all. Both
are asserted, with the fake clock, in `tests/render/depthOrder.test.ts`.

## Phase C

**T20-C1 The notes applied: the frozen files brought into line with phase B, `32960b6`.** Every note
the three groups wrote for the six files Turn 13 freezes, verified against the merged code before it
was applied, and the one decision the integrator left. B1's: the Work Plan hands the picked man to
the tab, so the offer card's figures follow the chips, `takeContract` reads the check it is given,
and `CONTRACT_SHORT_WEEKS_ALLOWED` came home to `constants.ts`. B2's: the `LET_GO` action, its case
in the reducer and its route, which is the click 2.4 draws, and the week's meters and the contract's
piece counter declared on the types they are saved with; the sixth of its notes, a line of its own
in `settle` for the week's sampler, was left where it is and says below why. B3's eleven, among
them: `runHelperClean` asks `hallLooksDirty(state.dust)`, `SERVICE_COST_FRACTION` is a
tenth, `callServiceIn` pays for a service and takes the machine out in the same minute, `canSell`
refuses a rack with sheets on it or a man at it in the Owned tab's own words, `rackCapacity` passes
over a rack that leaves in the morning, a job card says `is in for a service` instead of "broken",
and the Machines page's four CSS rules landed on the families they modify. With them: the three dead
estimator constants deleted, `PRODUCING_ROLES` moved home so the Output list is filtered at the
source and the board's own filter went, the twelve figures of **Numbers chosen** brought into
`constants.ts` with it, `DOOR_SWING_MS`, `DOOR_CLOSE_MS` and `STAND_IN_GAIN` deleted with the swing and the
stand ins, and the wardrobe front's `sheets` set to 0.3 so that the piece table agrees with itself
(section 0.1).
`npm run check` green on its own exit code. New tests with it, `tests/ui/machineService.test.ts`
among them: one press of Service pays, takes the machine out and leaves no task for anybody to stand
at.

**T20-C2 Every popover has the cross, and the test is the rule (2.15).** The rule is now a file,
`tests/ui/popovers.test.ts`, and it finds the popovers in the source instead of being told them:
it reads every `data-popover` in `src/ui` and `src/render`, checks that list both ways against the
one table in the test, proves that the only writer of a modal shell is `src/ui/modal.ts`, and
walks the stylesheet for anything that floats over the page with a `z-index`, which must either
wear the cross or carry its reason for not being a popover. Then it opens every one of them and
counts the crosses inside it, ignoring the crosses of a popover nested in another (an Assign list
sits inside the modal it hangs off, and its cross is the list's, not the modal's).
`npm run check` green on its own exit code.

**What it caught, and what was put right.** Two things. The why bubble, the real life note behind
an "i" link, carried `data-popover` from phase A but no cross at all: it was shut by a "Right"
button of its own, which is exactly the second way out of a popover that T18 2.5 took out of the
rest of the game. It now wears `closeButton('closeWhy')`, the same disc as the Assign list, off
the one CSS rule, and the "Right" button is gone. And Escape did not shut the Menu at all, and
took the day summary before the Assign list, where 2.15 asks for the Assign list first. Escape now
reads one table, `ESCAPE_ORDER` in `src/ui/app.ts`, which the test reads too, so the order is
written down once: assign list, why, day summary, modal, menu. The why bubble sits between the
first two because it is painted over everything and is never opened from inside an Assign list.
The click outside was already there for the list, the Menu and the bubble, and is now tested for
all three, as is the cross on each.

**The popovers the test found**, which is the list it prints on every run:

| Popover | Written in | Its cross |
|---|---|---|
| the modal shell, worn by all 11 modals | `src/ui/modal.ts` | `closeModal` |
| `assign-job`, who goes on this job | `src/ui/jobCard.ts` | `closeAssign` |
| `assign-contract`, who goes on this contract | `src/ui/contracts.ts` | `closeAssign` |
| `menu`, off the top bar | `src/ui/topbar.ts` | `closeMenu` |
| `why`, the real life note | `src/ui/app.ts` | `closeWhy` |

Two things wear no cross on purpose, and the test says so in its own words. A decision modal
(`closable: false`) has none, because a decision is answered and not closed, which is older than
this rule. The first use bubble has none, because it is the last child of a modal's body and
floats over nothing: a cross in it would be a second cross inside its modal. The test also prints
the layers that float over the page and are not popovers, each with its reason: the modal layer,
the cross itself, the hover note on the day meter, the version in the corner, the felt board's
head, the hall's strip and its zoom, and the Efficiency plate. **The Efficiency plate is the one
judgement call for Piotr**: it is the body of a native `<details>` on the top bar, opened and shut
by the same summary, and section 6 of the brief says nothing about Efficiency changes tonight, so
it was left as it is rather than given a cross.

**The test is the rule for what comes next.** A popover written in a later turn fails here and not
in front of Piotr: a new `data-popover` with no line in the table fails the census, a popover with
no cross fails the walk, and a new floating layer in the stylesheet fails until it is either given
the cross or written down with its reason. All three were checked by breaking them on purpose and
watching the test go red.

**T20-C3 The scenarios: the months on weekly pay, and the four of this turn, `d6ead9c`.** The
scripted player of `tests/scenarios/autopilot.ts` takes all four tiers now and nobody in it is
called poor; two months that traded a cut sheet pack at a price of their own, 100, written in Turn
13 when the table said 38, trade at the piece's own 50, so every month runs on the prices the board
really offers; and the three month playthrough gained an assertion that every trade on the books,
the joiner, the estimator and the production manager, is paid on a Friday at his own weekly wage
with no monthly salary line left. The four of the brief are `tests/scenarios/turn20.test.ts`, each
printing the figures this report quotes: (cc) the contract month, (dd) the helper's dirty hall day,
(ee) the fifty thousand pound bespoke job, (ff) three services on one saw at 375, 188 and 93 hours.
`npm run check` green on its own exit code. One defect found on the way and fixed: a service task
could still be started by the owner although `applyTaskCompletion` had lost its service case, so the
Do these list drew a Start that bought nothing; `startTaskCheck` refuses it now and the row says
where the one path is.

**T20-C4 The cross check of section 7, answered line by line, `d639857`.** Its own section below,
with the command that answered every line and the output it gave. It found one thing to fix in the
stylesheet and two paragraphs of this report that phase B wrote true and T20-C1 had made false.

**T20-C5 Look and shoot: twelve pictures, and what they showed was wrong, `d747d19`.** Its own
section below. Twelve pictures into `docs/report-t20/`, each beside the closest screen the game
already has, and twelve differences that are not in this brief fixed before the shutter came down
again, the crooked Contracts tab first.

**T20-C6 The report, this file.** Phase A's notes and the three groups' notes folded in and their
four files deleted, so the tree carries one document; the comments in `src` and `tests` that pointed
at those files point at this one. Two stale places went with them: a constant whose comment still
described the rule 2.8 replaced, and the sprayer's test file, which said he is hired in three tiers
and paid by the month.
`npm run check` green on its own exit code: 196 test files, 1,887 tests, one todo.

---

## The helper: why he stood beside the dirt (2.8)

The diagnosis T20-B3a wrote before anything was fixed, then the fix. It is the one section of this
report that is a piece of detective work rather than a piece of building, and it is here in the
words it was written in, with the paragraph that says where the fix landed added at the end of it.

### 2.8 The helper: why he stands beside the dirt

**The cause is (c) of the four the brief lists: the dust band.** The floor the player looks at and
the figure the engine tests are two different things, and they are eight times apart.

`sawdust()` in `src/render/hall.ts` (line 907) paints one pile of sawdust on the floor for every
ten points of dust: `const piles = Math.round(state.dust / 10)`. At 5 points of dust there is one
pile beside the saw, at 30 there are three, at 41 there are four. `runHelperClean` in
`src/engine/game.ts` (line 799) asks a different question:
`if (!dustAtLeast(state.dust, HELPER_CLEAN_DUST_BAND)) return;`, and
`HELPER_CLEAN_DUST_BAND` is `'messy'` (`src/engine/constants.ts` line 3484), which
`DUST_BANDS` starts past 40. So between 5 points of dust and 40 there is dirt on the floor, the
player can see it, and no cleaning task is ever made for the helper to take. He stands.

How long that lasts: `addDust(state, 1)` is called once per clock minute of production
(`src/engine/game.ts` line 1698 and `src/engine/production.ts` line 449), not once per man, and
`DUST_PER_PRODUCTION_MINUTE` is 0.02, so a whole working day of production adds 9.6 points however
many men are on the floor. The first pile is on the floor half way through the first day; the
helper is not asked for a broom until the fifth. With `HELPER_CLEAN_WEEKDAY` sweeping on Friday
anyway, the working week Piotr plays is four days of dirt he can see and a labourer with nothing
to do about it, which is the complaint word for word.

**How it was proved.** `tests/engine/helperDirtyHall.test.ts` builds the brief's scenario: a
helper on the books and in today, a lorry in the yard from 08:00, the hall dirtied at 10:00 to 30
points. It counts the piles off the drawing itself (the `var(--sawdust)` ellipses in the hall's
SVG, not the number they are computed from): three at 10:00, three when the men go home, no
cleaning task raised all day.

**The other three causes are all false, and the same test shows it in the same day.** (a) The
delivery does not swallow him: the unloading is his, he takes it at 08:00 without the owner being
asked, and it is finished and the pallet gone before 10:00. (b) `helperOnDuty` is true at 10:00
and true in the evening. (d) The cleaning is not made for the owner's queue: when the hall is
dirtied past the band instead, the task is made for nobody (`doneBy` null), `assignStaffTasks`
hands it to the helper because `cleaning` carries `helper` in its `autoRoles`, and the owner's
`currentTaskId` stays null.

**A second half of the same complaint, found on the way.** While he does sweep, he is not seen to
sweep: `stationForTask` returns `STATION_BENCH` for a cleaning task (`src/engine/stations.ts`),
`animationForStation('bench')` is `'bench'`, so for the two hours of `CLEANING_MINUTES` the
helper is drawn at a bench doing bench work. That is what 2.8.2 puts right, with the cleaning
station and the sweep sheet.

**The fix** is one line in `runHelperClean`: the helper answers the dirt the player can see
instead of a band of his own. `src/engine/game.ts` is one of the six frozen files, so B3 did not
write it: it was its first note for phase C, with its exact old and new text, and the
characterisation test above keeps asserting today's behaviour until that note lands.

### 2.8 The fix, the bags and the broom

**The fix is a note, and the characterisation test still asserts today's behaviour.** The cause is
one line of `runHelperClean` in `src/engine/game.ts`, which is one of the six frozen files, so B3
wrote it out as its first note for phase C with its exact old and new text, its two import lines and
the tests it moves. What B3 could build is the half the note stands on:
`hallLooksDirty(dust)` and `sawdustPiles(dust)` in `src/engine/machines.ts`, off one named
`DUST_PER_SAWDUST_PILE` [TUNE] of 10, and `sawdust()` in `src/render/hall.ts` now draws its piles
from that same count, so the dirt the player sees and the dirt the helper is asked about are one
figure and cannot drift apart again. The note was applied to a scratch copy and the whole suite
run against it: exit 0, and two test files move, both written out in the note.

**The note landed in T20-C1**, which is why the paragraph above reads as B3 left it and the game
does not: `runHelperClean` asks `hallLooksDirty(state.dust)` now, and
`tests/engine/helperDirtyHall.test.ts` is flipped with it, so the broom is in the helper's hands at
10:01 and the hall is clean when the men go home. Scenario (dd) plays the whole day out, and the
cross check of section 7 quotes it.

**The bags.** 2.8.1 asks for `bagChange` to gain the helper as an autoRole. There is no
`bagChange`: the kind is `emptyBags` and it has carried `autoRoles: ['helper']` since Turn 12,
and `raiseBagsFull` already delegates to him instead of putting the question to the owner. The
half that was missing is the chip, and it is built: with the store full and the helper holding
the job of work, the chip under the hall reads `Dave is emptying the bags` and carries no button,
the way the cleaning chip has said who is sweeping since Turn 19. It is driven by its own input,
the open task and the man holding it, and not by the role table.

**The broom.** Cleaning is a station of its own now, `STATION_CLEANING`, instead of falling in with
the bench: `stationForTask` sends a cleaning task to it, `animationForStation('cleaning')` returns
`sweep`, and the helper plays the broom sheet the v28 patch delivered. Where he stands has not
moved a cell: the new station falls through `stationCell` exactly where the bench station did. A
role with no broom sheet falls to `bench` and not to idle, through one table `INSTEAD_OF` in
`src/render/characters.ts` beside the Turn 19 fallbacks, so the owner and a joiner sweeping are men
working with their hands rather than men standing about.

---

## Numbers chosen

Every figure this session picked itself, grouped by the brief's section, with its tag. All of them
live in `src/engine/constants.ts`: the twelve a phase B agent had to declare in its own module,
because that file was frozen under it, were moved home in T20-C1 (`DAY_TRACK_TICK_MINUTES` and
`CONTRACT_SHORT_WEEKS_ALLOWED` out of `contracts.ts`, `MATERIAL_TAKE_OFF_MINUTES` and the two
Joinery Core factors out of `tasks.ts`, `LET_GO_NOTICE_DAYS` and `WEEK_JOBS_KEPT` out of `staff.ts`,
`DUST_PER_SAWDUST_PILE`, `SERVICE_LIFE_EXTENSION` and `PAST_LIFE_WEEK_HOURS` out of `machines.ts`,
`LIFE_LOW_FRACTION` out of `machinesPage.ts`, `FIGURE_DEPTH_OFFSET` out of `walkers.ts`). Nothing
appears to the player as a setting.

**The state and the version**

- `APP_VERSION` `'v29'` and `STATE_VERSION` **17**: the brief's own, one bump each.

**2.1 The contracts tab, and the contract's day**

- `CONTRACT_SHORT_WEEKS_ALLOWED` **2** [TUNE, Piotr's decision still open]. 2.1.6's own rule: the
  first short week costs a point of reputation, the second ends the contract, no third. It is one
  named number so that changing his mind is one line and not a rule written twice.
- `DAY_TRACK_TICK_MINUTES` **120** [TUNE]. The clock under a day track is marked every two hours
  from 8:00, which is what the drawing has; the last mark is left off when the end of the day is
  nearer than half of it, so 16:00 and 17:00 never sit on top of each other.
- `OWNER_RATE` **1** in `src/engine/contracts.ts`, not a tunable and not in constants: the ladder of
  the tiers is measured against the owner, so he is 1 by definition (2.5). It is named rather than
  typed into the arithmetic.
- Everything else on the tab reads a figure the game already had: `MINUTES_PER_WORKING_DAY`,
  `BREAK_START_MINUTE`, `BREAK_MINUTES`, `DAY_END_MINUTE`, `WORKING_DAYS_PER_WEEK`, `DAYS_PER_WEEK`,
  `CONTRACT_FREE_END_DAYS`, `CONTRACT_OFFER_DAYS`, `WORKER_MINUTE_RATE_DIVISOR` (through
  `workerMinuteCost`) and `OWNER_DRAW_TIERS` (through `ownerDrawPerDay`).

**2.2 The prices**

- `CONTRACT_PIECES`, the whole table [PIOTR]: 50 / 52 / 160 a piece, 45 / 60 / 240 minutes by hand,
  30 / 26 / 60 of material. `labour` is the price less the material: 20, 26, 100.
- The wardrobe front's `sheets` **0.3** [TUNE, and the deviation of section 0.1, Piotr's to rule
  on]: 60 over `SHEET_VALUE` 200, so the piece draws off the rack exactly what the card costs it at.

**2.3 The estimator**

- `MATERIAL_TAKE_OFF_MINUTES` **30** [PIOTR, 18.09: "when I did it, it took 30 minutes"]. At the
  man's own rate that is 37.5 minutes for a man with no experience and 21.4 for the top man.
- `JOINERY_CORE_TAKE_OFF_FACTOR` **0.5** [TUNE], from Piotr's own 16 a day bare and 32 with the
  software.
- `JOINERY_CORE_EXTENSION_TAKE_OFF_FACTOR` **0.75** [TUNE]. "Each extension takes a further quarter
  off": 42 a day with one, 56 with both.

**2.4 Let go**

- `LET_GO_NOTICE_DAYS` **7** [TUNE, Piotr's decision open: he said a week's wage]. Seven days puts
  exactly one Friday inside the notice, so the week he works is the week he is paid for.

**2.5 The four tiers**

- `TIER_WORDS`: **no experience, experienced, super experienced, extremely experienced** [PIOTR,
  18.09]. The one table the game prints a tier from, ids `novice`, `experienced`, `senior`,
  `master`.
- `WORKER_RATES` **0.8 / 1.0 / 1.2 / 1.4**: [PIOTR] the 0.8 and the 1.2, [TUNE] the master's 1.4 as
  the step above it.
- `TIER_MIN_REPUTATION` **-50 / 15 / 35 / 60**: [PIOTR] the 60, [TUNE] the 15 and the 35.
  `REPUTATION_MIN` for the man with no experience, who always answers an advertisement.
- `JOINER_WEEKLY_WAGE_EXPERIENCED` **600** and `TIER_WAGE_FACTOR` 450/600, 1, 800/600, 1000/600:
  [PIOTR] the 1,000 for the top of the ladder, [TUNE] the rest, which makes the experienced man 600.
  `tierWeeklyWage` rounds to the nearest five pounds [TUNE], which makes the joiner's ladder exactly
  450, 600, 800 and 1,000.

**2.6 Pay by the week**

Every role's weekly figure is its old monthly one over `WEEKS_PER_MONTH`, which is 30 days over 7
and so 4.2857 and not the brief's 4.33, rounded [TUNE], so
nobody's pay moved in this turn by more than the rounding:

- estimator **610** a week (2,600 a month over 4.2857 is 606.67, to the nearest ten; his four tiers
  are 460, 610, 815 and 1,015), sprayer **630** (2,700 a month, exactly 630; 475, 630, 840, 1,050),
  draftsman **560** (2,400 a month, exactly), production manager **795** (3,400 a month is 793.33),
  office admin **445** (1,900 is 443.33), purchasing clerk **395** (1,700 is 396.67), salesman
  **515** (2,200 is 513.33), helper **420**, unchanged.
- `WEEKS_PER_MONTH` is the one conversion, through `monthlyWageOf`, for the hiring gate, the month
  end's salary line, the Company board's per man rate and the insurance premium.

**2.7 The week line**

- `WEEK_JOBS_KEPT` **4** [TUNE]. How many job names a man's week line carries: enough to read, not a
  paragraph.

**2.8 The helper**

- `DUST_PER_SAWDUST_PILE` **10** [TUNE], and not a new number: it is the ten `sawdust()` in
  `src/render/hall.ts` has divided the dust by since Turn 2, given a name so that the piles on the
  floor and the dirt the helper answers are one reading and cannot drift apart again.

**2.9 The machines**

- `SERVICE_LIFE_EXTENSION` **0.5** [PIOTR, 18.09]. Half of the original life the first time and half
  of the last extension after that, which is 2.9.1 word for word.
- `SERVICE_COST_FRACTION` **0.10** [PIOTR], a tenth of what the machine cost, paid when it is called
  in. It was 0.02 in Turn 8.
- `LIFE_LOW_FRACTION` **0.1** [PIOTR, 18.09: "red when under a tenth is left"].
- `PAST_LIFE_WEEK_HOURS` **18.46 h**, `SERVICE_INTERVAL_HOURS / WEEKS_PER_MONTH` [TUNE]: a week of a
  machine's own clock, for the doubling of 2.9.4. No new figure of its own, since 80 hours is the
  month a one man shop puts on a saw (T6 3.6).
- The doubling past the end of the life: **2** for every whole week of its own clock, capped at a
  certainty [TUNE, named in the brief]. The first week past the end is the Turn 8 chance unchanged.
- The machine is out **from the call until the next working day**, the first service included
  [PIOTR the rule, TUNE the reading, since 2.9.3 leaves the first one open].

**2.11 The depth key**

- `FIGURE_DEPTH_OFFSET` **0.2** [TUNE], and not a new number either: it is the 0.2 `hall.ts` has
  painted a figure in front of his own cell with since Turn 16, given a name so that the scene and
  the re-sort read one figure.

**Wordings chosen**

Every one of them is the game's own voice and none is a constant on a screen:

- `extremely experienced joiners come from reputation 60` on a hire card the standing has not
  earned, off `TIER_MIN_REPUTATION` and the trade's own plural.
- `£600 a week (about £2,571 a month)` on the hire card, the crew row and Our team, through one
  `wageText`.
- `A contract is work for a joiner: you cannot be put on one` beside the owner on an offer.
- `The week: 40 pieces, 4 days of wages already counted`, which says where his wages went.
- `8 pieces, 210 min left at the end` under a day track, and `8 pieces, then 210 min on Hall
  panelling` when he has a job to go to as well, which is the drawing's own line.
- `the client has ended it after 2 short weeks` in the closing report and its event.
- `Dave is emptying the bags` and `The hall is dirty, Dave is cleaning it` on the chip, neither with
  a button.
- `Dave, sweeping the floor` in the hall's own tooltip, beside the bench's line.
- `The table saw is in for a service, nothing runs on it today` under the hall, and
  `Call it in on the Machines page` where a service row's Start used to be.
- `past its life`, `service due`, `in service` and `broken` on a Machines page row.
- `Empty it first, 24 sheets on it` and `Somebody is standing at it` on a rack that cannot go.
- `leaves on Wed 24 March` on the row of a man who has been let go.

---

## The three margins an hour by hand

Section 7's first line, printed by `tests/engine/contractPrices.test.ts` on every run and asserted
figure by figure as well as against the band:

| Piece | Stages | Minutes by hand | Price | Material | Margin a piece | An hour |
|---|---|---|---|---|---|---|
| Cut sheet pack | cutting | 45 | £50 | £30 | £20 | **£26.67** |
| Drawer box | cutting, assembly | 60 | £52 | £26 | £26 | **£26** |
| Wardrobe front | cutting, finishing | 240 | £160 | £60 | £100 | **£25** |

All three are inside the 22 to 30 of 2.2, each is well under a job's £40 an hour and well over a
joiner's £14 of wage, and the wardrobe front is four hours of work and no longer three days.

Two things to read beside them. **The margin in this table is the price less the material**, which
is 2.2's own column: it is what a piece is worth before anybody is paid for making it. The offer
card's margin is the one with the man in it, his minutes at his own weekly wage through
`workerMinuteCost`, so an experienced joiner at £600 a week costs £0.25 a minute, a cut sheet pack
of his costs £11.25 of his time, and the card's margin on his row is £8.75 with the week's result
that figure times his pieces. **And by hand means by hand**: the tip under the card names the one
machine the hall has not got that would shorten the piece most, with the minutes it would take, the
pieces it would make in a day and what the week would gain by it, all three computed and none typed.

---

## Names the brief uses that the code does not

- **`bagChange`** (2.8.1) does not exist. The task kind is **`emptyBags`**, and it has carried
  `helper` in its `autoRoles` since Turn 12, so the role half of 2.8.1 was already true: what was
  missing was the chip, and that is what was built.
- **`HELPER_CLEAN_DUST_BAND`** (2.8) is the band the Turn 17 rule waited for, and it is what the
  diagnosis found wrong. The helper now answers `hallLooksDirty(state.dust)`, off the same count the
  floor paints its piles from; the constant stays because the tests of 2.8 measure the new rule
  against the old band, and nothing in the game reads it any more.
- **`dayStats`** (2.7) does not carry the minutes by category: it carries the day's efficiency, its
  dust and its night minutes. The six bands of a man's week are a new `WeekCategory` in
  `src/engine/types.ts` with the meters beside it, and the mapping from a task kind is
  `WEEK_CATEGORY_OF_TASK` in `src/engine/tasks.ts`: the office and the drawing board are the desk,
  the van and the rack are the unloading, the broom and the spanner are the cleaning, the tape is
  the site.
- **`ESTIMATOR_JOBS_PER_DAY`** (2.3) went, and so did `ESTIMATOR_JOBS_WITH_JOINERY_CORE` and
  `JOINERY_CORE_EXTENSION_JOBS` with it: five a day, ten with the software and five an extension are
  not figures any more, they are what his minutes allow. `ESTIMATOR_RATES` went too, because its 0.8
  / 1 / 1.2 is `WORKER_RATES` exactly, so the estimator reads the one ladder like everybody else.
- **`JoineryCoreOffer.extensionJobs`** went the same way: an extension is not "+5 jobs" now, it is a
  shorter half hour, so the offer carries `extensionCapacities: number[]` and `minutesEach: number`.
- **`monthlyPay`** is now **`monthlyWageOf`**, the one place a week is turned into a month, and
  `monthlyWage` the field is gone. `WEEKS_PER_MONTH` is 30 days over 7, which is **4.2857** and not
  the brief's 4.33, so 2.6's hiring gate of "a month's pay in the bank" is 4.2857 weeks of it.
- **"the Equipment group"** of the laptop (2.9) did not exist: the laptop had one group, Office. A
  second group heading, `EQUIPMENT_GROUP` in `src/ui/laptop.ts`, sits under it with the Machines
  tile on it, drawn with the same `.screen-group` and `.screen-small-tile` the Office group uses.
- **`serviceMachine`** (2.9) already existed as an action and already dispatched `SERVICE_MACHINE`
  off the machine card's Service button, so the page needed no new route, only the new rule behind
  the action. `serviceMachine` in `src/engine/machines.ts` is the rule; `callServiceIn` in
  `src/engine/game.ts` is what a press does: it pays, it takes the machine out, and it closes the
  reminder.
- **"hours of life"** (2.9) is `Equipment.enduranceHours`, which is the life the machine has now,
  extensions and all, with `originalLifeOf(item)` for the life it left the shop with. The bar's
  total is `enduranceHours`, so it grows with every service, which is what 2.9.1 asks for.
- **"the contract bar"** (2.1.5) is gone and not emptied: `renderContractBar` in
  `src/ui/contracts.ts` no longer exists, and its chips, its `Assign to this contract` button, its
  assign list and its week bar are the Running section of the tab, so there is one of them and not
  two.
- **`contractResultFor(contract, worker)`** is now `contractResultFor(state, contract, worker)` and
  returns the whole of the card: the minutes, the labour, the material, the margin, the pieces a
  day, the pieces the client wants a day, the days of his week, the free minutes, the pieces a week,
  the week's result and the term's. `null` in the worker's place is the owner. The Orders page reads
  the same function, so the two screens cannot disagree.
- **`contractAssignCheck(contract, worker)`** is now `contractAssignCheck(state, contract, who)`,
  with the rule about the man on its own as `contractManCheck(state, who)`, because the offer card
  needs that rule before the contract is active.
- **`contractPiece` minutes over his rate** (2.1.1) is `contractWantsToday(state, workerId)` and
  `piecesDueBy(contract, day)` for the day, and `contractMinuteCost` for the money: a worker's
  minute is his weekly wage through the job card's own `workerMinuteCost`, and the owner's is
  `ownerDrawPerDay(state)` over the working day.
- **"the closing report marked `ended by the client`"** (2.1.6) is `contract.endedBy === 'client'`
  in the state and, in the words the report and the event both print, `the client has ended it after
  2 short weeks`. `endedLine(contract)` is the one place those words are written.
- **`moveOverflowToStorage`** (2.16) exists and is still the stock lorry's path. A job's own
  overflow does not use it: it stays on the job's pallet, read off the delivery's own
  `overflowSheets` by `jobSheetsOnPallet`, so no new field was wanted on `Job`.
- **"poor", "normal" and "super"** (2.5) are gone as ids and as words. The ids are `novice`,
  `experienced`, `senior` and `master`; the words are `TIER_WORDS`. `grep` finds the three old ids
  in one line of code, the migration's own map, and in five comments that say why the word went.
- **`ROLE_WORDS`** moved from `src/ui/team.ts` into `src/engine/staff.ts`, because the hire card's
  refusal is written in the engine and names the trade; `src/ui/team.ts` re-exports it, and
  `ROLE_WORDS_MANY` beside it is the same trades in the plural (a salesman is not a "salesmans").
- **`estimatorCapacity(state, tier)`** keeps its name and answers a new question: how many take offs
  his minutes allow, not how many the table allowed.
- **"the Output list"** (2.3.3) is the second half of the Company board's Output sheet, the rows
  under `Act where they are, not in the number above`. The rule is one table, `PRODUCING_ROLES`,
  read at the source in `outputBreakdown` and by `produces` in `src/engine/staff.ts`; the board's
  own `isAtADesk` filter is gone, so there is one rule and not two.
- **`rolesForTask(kind)`** is new in `src/engine/tasks.ts`: the one reading of a task kind's
  eligible and auto lists from outside the module, which is what the site measure of 2.3.2 is
  asserted through.

---

## What was not done tonight, and why

Everything the four sets of notes carried as not done, in one list. The first two are in section 0
because they are Piotr's to rule on; the rest are the session's own reasons.

- **A contract piece is worked at its first stage only** (section 0.2), so the machines of 2.2 pay
  on the cutting and nowhere else.
- **The owner cannot stand at a contract** (section 0.6), although the card costs him.
- **The day's line is read forward and there is no catch up.** 2.1.4 says "the week's quantity
  spread over the days left in the week". `piecesDueBy(contract, day)` is that line read forward: on
  schedule the two readings are identical, and behind it the contract asks for the catch up at once
  instead of spreading it over the days that are left. A day start count on the contract would want
  a field, and `types.ts` was frozen when it was written; it is stateless as it stands, and one
  function that the engine and the tab both read.
- **A man on a contract with no job of work to go to keeps making pieces after the day's share is
  made**, as he did in v28, because the client pays for every piece. The day's line orders his day;
  it does not cap a man who has nothing else to stand at.
- **Two men on one contract share one day's line**, so each man's track can show the same remaining
  pieces. The engine is right (the line is the contract's, and the first man to make the pieces
  closes it); it is the second man's drawing that is optimistic.
- **The night shift is not in a man's week.** `runNightShift` runs its own minute loop and never
  settles, so the week's sampler never sees those minutes. A night man's week therefore reads
  nothing, which is true, rather than a day that was somebody else's. Nothing in 2.7 asks for the
  night.
- **The week's sampler hangs off `assignStaffTasks` and not off a line of its own in `settle`.**
  That hook is the one the day already runs over the whole crew every minute, and the sample is
  guarded by the day and the minute it was taken on, so nothing is counted twice. A second hook
  would be a second code path for one reading.
- **A man under notice is still given new work.** 2.4 does not say he should not be, so nothing
  stops the Work Plan putting him on a job he will not be there to finish; the morning he goes the
  job simply has nobody on it, which is what the brief asks for.
- **A man let go leaves under the `workerQuit` event kind.** It was written for the overtime quit of
  Turn 8, which went with the evenings in Turn 17, and nothing else raises it, so a man who is let
  go goes out by the same gate. A kind of his own (`workerLetGo`) would read better in the log, and
  it is a line in `GameEventKind`.
- **`sheetsStrandedBySale` and `rackCapacity` are the same sum in two modules.** Both add
  `sheetCapacityOf` over the racks that stand in the hall and are not sold, and both had the same
  hole in them until B3's review found it; one is in `machines.ts` and one in `materials.ts` because
  `materials.ts` reads `machines.ts` and not the other way about. Bringing them into one wants the
  import direction thought about, and it is written on both of them.
- **A man who has gone is taken off the contracts inside `staff.ts`**, by filtering
  `contract.assigned`, and not through `assignContract`: `contracts.ts` reads `staff.ts` and the two
  cannot read each other.
- **The crew have no desks in the office view, so only the owner goes through a door.** Section
  0.10. And the owner in the office stands against the wall beside the door rather than at his desk:
  Turn 19 raised it, 2.12 keeps T19 2.2's office half as it is, and `OFFICE_OWNER_BOX` is the one
  number to move if he should be nearer.
- **The canteen's door is not a door a man goes through.** It is where a man with nothing to do
  stands about (T4 3.4, T11 3.4), which is the hall and not the room behind it; nothing behind it is
  drawn, so a man sent through would be nowhere at all and the player would lose sight of his crew
  at dinner.
- **There is no sound.** No recording was invented and no stand in survives: `play` and `loop` do
  nothing while the named file is not in `public/sounds/`, and the folder holds a README. The seven
  files Piotr is to record are in `docs/art/REQUESTS-T20.md`, the door first.
- **No art was drawn.** The thicknesser has no sprite, so its Machines page row draws the Turn 19
  placeholder; the helper still has no bench sheet and the sprayer none at all, so both fall back as
  the fallback rule says. Both requests are in `docs/art/REQUESTS-T20.md`.
- **Everything section 8 parks stays parked**, the walk itself above all: it wants the animated
  mockup first, and nothing visual is built without one.
- **Three things the pictures found are older than tonight and were left**, each with its reason in
  the look and shoot: two hall labels sitting on top of each other where two tool cabinets stand
  together, a hire card blocked by kit saying the list twice in different words, and the drawing's
  two columns against the game's one.

---

## Cross check (section 7)

**T20-C4.** Every line of section 7, with the command that answered it and what came back. Nothing
here is a summary of a test: it is the test's own output, run on the branch as it stands.

**The base of the diff is `d35e9b5`, not `main`.** Local `main` and `origin/main` are the same
stale two commit branch (`276f494 Create CLAUDE.md`, `d7b8084 Initial commit`): no source on it at
all. The v28 the brief means, the precondition this turn opened on, is `d35e9b5`, which carries
`STATE_VERSION = 16` and `APP_VERSION = 'v28'`. Every diff of this cross check is against it, and
section 7's last line was read that way.

### 1. The three margins an hour by hand, between 22 and 30

`npx vitest run tests/engine/contractPrices.test.ts` (4 passed):

```
MARGIN AN HOUR BY HAND
Cut sheet pack: 45 min by hand, £50 a piece, £30 of material, £20 of margin, £26.67 an hour
Drawer box: 60 min by hand, £52 a piece, £26 of material, £26 of margin, £26 an hour
Wardrobe front: 240 min by hand, £160 a piece, £60 of material, £100 of margin, £25 an hour
```

£26.67, £26 and £25: the three of them inside the band, and the test asserts each figure as well as
the band, so a price that moves has to move the test with it. The same file prints what a piece
draws off the rack, which is the pair the wardrobe front used to break:

```
WHAT A PIECE DRAWS OFF THE RACK
Cut sheet pack: 0.15 of a sheet, £30 of stock, costed at £30
Drawer box: 0.13 of a sheet, £26 of stock, costed at £26
Wardrobe front: 0.3 of a sheet, £60 of stock, costed at £60
```

The wardrobe front's 0.3 is T20-C1's change and **the deviation of this turn that is Piotr's to
rule on**: it deviates from the letter of 2.2's "sheets per piece stays what it is" so that the
piece table agrees with itself. The B1 section above has it in full.

### 2. A contract month with an experienced joiner ends in profit after his wages

The brief's line says "a normal joiner"; since 2.5 that tier is called **experienced**, and the
scenario is named for it. `npx vitest run tests/scenarios/turn20.test.ts` (11 passed), scenario
(cc):

```
(cc) A CONTRACT MONTH WITH AN EXPERIENCED JOINER
piece: Cut sheet pack at £50, 40 a week over 4 weeks
the man: Liam, experienced, £600 a week
pieces made 198, revenue £9,900, material £5,940, his wages £2,400
PROFIT AFTER HIS WAGES £1,560
the closing report's own margin £1,567 over 159.5 hours at the bench
```

Asserted, not printed only: `expect(profit).toBe(1560)` and `expect(profit).toBeGreaterThan(0)`,
with the four Fridays counted one by one (`expect(wages.fridays).toHaveLength(TERM_WEEKS)`, and
TERM_WEEKS is 4) so the wage side
is the payroll's own and not a multiplication.

### 3. `grep -rn "poor\|'normal'\|'super'" src`

```
src/engine/constants.ts:80: *  Bumped in Turn 20: the four tiers are named again and nobody is "poor"; every man is paid by
src/engine/constants.ts:3219:/** The four tiers, in the order a man climbs them. Nobody is "poor" any more: Piotr would not
src/engine/constants.ts:3220: *  have the word in his workshop, and a man with no experience is not a poor man (PIOTR, 18.09;
src/engine/migrate.ts:277:  poor: 'novice',
src/engine/types.ts:129: *  TIER_WORDS and never here: nobody in Piotr's workshop is called poor (PIOTR, 18.09;
src/engine/types.ts:130: *  CLAUDE.md T20 2.5). A v28 save's poor, normal and super are lifted to the first three. */
```

One line of code, `migrate.ts:277`, the old id mapped to the new one. The other five are comments:
the two at `constants.ts:3219` and `3220` are the tier words table's own, and the three others say
in prose why the word is gone. Nothing reads an old id. The stricter grep,
`grep -rn "'poor'\|\"poor\"\|'normal'\|\"normal\"\|'super'\|\"super\"" src`, returns only the two
comment lines that carry the word in quotation marks, so no old id survives as a literal anywhere
in the game.

### 4. `grep -rn "monthlyWage" src`

```
src/ui/team.ts:46:  monthlyWageOf,
src/ui/team.ts:148:  return `${money(weeklyWage)} a week (about ${money(monthlyWageOf({ weeklyWage }))} a month)`;
src/engine/staff.ts:169:export function monthlyWageOf(pay: { weeklyWage: number }): number {
src/engine/staff.ts:394:    } else if (state.cash < monthlyWageOf(spec)) {
src/engine/staff.ts:399:      blockReason = `Not enough in the bank: needs ${formatMoney(monthlyWageOf(spec))}`;
src/engine/migrate.ts:309:    const monthly = typeof worker.monthlyWage === 'number' ? worker.monthlyWage : 0;
src/engine/migrate.ts:311:    delete worker.monthlyWage;
src/engine/types.ts:405:   *  CLAUDE.md T20 2.6). What a month of him costs is `monthlyWageOf`. */
```

The **field** is gone: `grep -rn "monthlyWage" src | grep -v "monthlyWageOf"` returns the two
migration lines and nothing else, and both of them are the migration deleting it. Everything else
is `monthlyWageOf`, the function 2.6 asks for: the one place a week is turned into a month, for the
hiring gate and for the line the hire card prints. The substring is the same, the field is not.

### 5. The helper's day: a dirty hall at 10:00 with a delivery in the yard

`npx vitest run tests/scenarios/turn20.test.ts`, scenario (dd):

```
(dd) THE HELPER S DIRTY HALL DAY
bags at the brim at 08:55, in his hands at 09:15; dirtied to 75 at 10:00, broom in hand at 10:01
dust at the end of the day 4.799999999999986, band "clean"
bags 0.09775 of 1 m3
Callum did: Unload 60 sheets, Unload the delivery: 2 machines, Weekly clean, Weekly clean, Weekly clean, Weekly clean, Weekly clean, Sweep the hall, Unload 12 sheets, Empty the bags (1 bag, 15 min), Sweep the hall
chips that asked the owner: 0, minutes of it in the owner's hands: 0
```

Clean at the end of the day, the bags emptied by him, the owner never asked: no chip with a button
and no minute of it in his hands. **The diagnosis names the cause that was found**, and it is cause
(c) of the brief's four, the dust band: the floor paints its first pile of sawdust at 5 points of
dust (`sawdust()` in `src/render/hall.ts`) and `runHelperClean` used to wait for the messy band,
which starts past 40, so between the two there was dirt on the floor and no cleaning task for
anybody to take. The fix is `hallLooksDirty(state.dust)` in `runHelperClean`
(`src/engine/game.ts`), landed in T20-C1, and `tests/engine/helperDirtyHall.test.ts` (3 passed)
holds the two figures to one count so they cannot drift apart again.

### 6. The bespoke job: one order, one unload, no shortfall

`npx vitest run tests/scenarios/turn20.test.ts`, scenario (ee):

```
(ee) THE FIFTY THOUSAND POUND BESPOKE JOB
sheets the job wants 115, places on the rack 50
orders 1, unloads 1, unloaded on day 12
the minute the lorry was empty: 50 on the rack, 65 on its pallet, shortfall 0, written off in the yard 0
```

One order, one unload, shortfall 0, and the 65 sheets the rack had no room for are on the job's own
pallet rather than lost in the yard.

### 7. `grep -rn "from '../ui/sound'" src/render`

Nothing, exit status 1. The wider `grep -rn "ui/sound\|from '.*sound'" src/render` returns four
lines, all of them comments (`src/render/doors.ts:11`, `src/render/hall.ts:126`, `1967` and `2062`)
saying that the render layer reports the event and the ui layer plays it. No import, no call.

### 8. The popover test, and the list it prints

`npx vitest run tests/ui/popovers.test.ts` (16 passed):

```
The popovers of the game, 5 of them, each with the one cross:
  modal            src/ui/modal.ts        closeModal   the one modal shell, worn by all 11 modals
  assign-job       src/ui/jobCard.ts      closeAssign  who goes on this job, off the Work Plan job card
  assign-contract  src/ui/contracts.ts    closeAssign  who goes on this contract, off Running on the Contracts tab
  menu             src/ui/topbar.ts       closeMenu    the Menu, off the top bar
  why              src/ui/app.ts          closeWhy     the real life note, off an "i" link
Escape shuts them topmost first: assign list, why, day summary, modal, menu
Floating over the page but not popovers, with the reason:
  .modal-layer             the layer the modal shells live on, not a thing in itself
  .modal-close             the cross itself
  .day-tip                 a hover note on the day meter: it takes no click and is gone with the pointer
  .version-corner          the version in the corner, which takes no pointer at all
  .modal-felt .modal-head  the felt board's own head, part of the modal it is in
  .efficiency-plate        the body of a native <details> on the top bar: the same summary opens and shuts it, and Turn 20 changes nothing about Efficiency (CLAUDE.md T20 6)
  .hall-bottom             the hall's own strip, always on the page
  .hall-zoom               the hall's own zoom controls, always on the page
```

### 9. The twelve pictures

T20-C5's line, not this one's. Noted here and answered there.

### 10. `src/ui/styles.css` against the real base

`git diff d35e9b5 --stat -- src/ui/styles.css`:

```
 src/ui/styles.css | 104 +++++++++++++++++++++++++++++++++++++++++++++++++++---
 1 file changed, 100 insertions(+), 4 deletions(-)
```

`git diff d35e9b5 -- src/ui/styles.css` read hunk by hunk, with every value checked against the
file it went into:

- **No new token.** `:root` is untouched; there is not one line of the diff in it. Every colour in
  the new rules is a token the game already had: `--good`, `--bad`, `--accent`, `--cream`,
  `--border`, `--panel-2`, `--text-dim`, `--screen-line`, and the card fallbacks
  `var(--card, var(--panel-2))`, `var(--card-line, var(--border))`, `var(--card-ink-2,
  var(--text-dim))`, which is the pattern `.assign-row .assign-why` already uses beside them.
- **One raw colour, and it is not new.** `.contract-day-block.is-job` puts `color: #1c1f24` on
  `background: var(--accent)`. That literal is the ink the game has always put on the accent:
  `grep -n "1c1f24" src/ui/styles.css` gives eight lines, seven of them older than this turn, and
  one of the seven is `.btn-primary` (line 477), exactly as the new rule's comment says.
- **No new radius.** The one radius in the diff is `border-radius: 3px` on `.contract-day-track`,
  and `grep -o "border-radius: [^;]*" src/ui/styles.css | sort | uniq -c` shows 3px is the second
  most used radius in the file, 15 times now and 14 before tonight.
- **No new shadow and no new font.** No `box-shadow` line is added anywhere (the one in the cross's
  hunk is unchanged context), and every size in the diff is `var(--fs-tiny)`, a token.
- **Every new class beside its family.** `.tile-picture.is-small` sits immediately under
  `.tile-picture` and only changes its two sizes. `.contract-fill.is-low` sits with
  `.contract-fill.is-full`. The `.contract-day*` family sits under `.contract-track`, which the
  comment points at. `.contract-men .assign-tier` sits with `.assign-row .assign-why`. The cross on
  a popover that is not a modal is one rule for both, `.assign-list .modal-close, .why-pop
  .modal-close`, and not a second version of it.
- **The one thing that was wrong, and it is fixed.** `.modal-screen .contract-track` had been
  wedged between the `.modal-screen` family's own section comment and the family's first rule, so
  the comment that describes the whole laptop screen read as if it described the bar. The rule is
  moved down beside `.modal-screen .row` and `.modal-screen .row.is-running`, the two rules it
  belongs with, and the section comment leads its family again. Nothing else in the stylesheet
  moved and nothing changed value.

### What this check had to fix

One thing: the `.modal-screen .contract-track` rule, moved (check 10). Two things in this report
were true when phase B wrote them and are not true now, so they were put right rather than left to
mislead: the B1 section said the wardrobe front's sheets were not moved, and the B3 section said
the helper's fix was still a note. T20-C1 did both, and both paragraphs now say so and keep the
question that is Piotr's in front of him.

### The standing rules, checked with it

- No em dash and no en dash in any text of the tree: `grep -rl` for U+2013 and U+2014 over `src`,
  `tests`, `docs`, `README.md` and every report and note file finds one file, and it is
  `docs/report-t18/06-answer-margin.png`, a picture whose bytes happen to carry the codepoint.
- `APP_VERSION = 'v29'` and `STATE_VERSION = 17`, one bump each.
- `npm run check` green on its own exit code before the commit.

---

## Look and shoot (T20-C5)

**Twelve pictures in `docs/report-t20/`, and twelve things they showed.** Every one is the real
app in headless Chromium at 1280 by 800 at one device pixel, driven by real clicks, standing in
front of saves the game's own `encodeSaveFile` wrote and its own Continue button opened, with the
clock stopped by the game's own pause. The saves are played, not written: six halls stood up by
the scripted player of `tests/scenarios/autopilot.ts`, the same one the T20-C3 months run on, with
only the one situation each picture is about arranged by hand, the way those scenarios arrange
theirs. Two things in them could not be played and are said here so no figure in a picture is
taken for something it is not: the hours on the machines and the hours since their last service
(a machine's life is thousands of hours, and a fortnight of play leaves the bar a sliver), and the
three contracts, which the engine drew and which were then set to one piece of the table of 2.2
each, so the tab's three sections hold a wardrobe front, a drawer box and a cut sheet pack. The
staging is in the scratchpad and nothing of it is committed.

### What the pictures showed was wrong, and what was done about it

**1. The Contracts tab was a board of crooked notes, and the figures did not line up with their
words.** This is the one that mattered. On the board skin every `.row` is a cream card pinned by a
blue magnet and tilted up to a degree and a half; the tab's figure lines are rows INSIDE a card, so
each label sat on a tilted note of its own, its figure landed about thirty pixels lower at the far
end of it, and the column read as if every number belonged to the next line down. `£50` sat under
`Material a piece`, `-£30` under `Gary's labour`, and so on the whole way down both cards. Nothing
was wrong in the arithmetic; the picture was unreadable. The rule now says what it always meant: a
row that is the board's own child is a card on the board, and a row inside a card is a line of that
card. The Running and Ended blocks joined the offer's card as cards of the board, so each of the
three sections is one pinned sheet of paper, which is what the drawing has.

**2. And nothing on the Work Plan is crooked.** Piotr said it on 16.09 about this board, and it
held until tonight by accident of class names: the modal carried only plan rows, and the tilt lives
on the board family's cards, rows and tiles. The Contracts tab brought all three onto it. The three
tilt rules now hold the Work Plan out by name, `:not([data-modal='workPlan'])`, which is the
comment they already carried; the Shopping board keeps its tilt, because a shop window is not a
ledger. `tests/ui/workPlanStraight.test.ts` was brought up to the new rule and given a third case:
the Contracts tab's card is straight and the figure lines inside it carry no tilt and no shadow of
their own.

**3. The green and the red were gone.** `2.1.2` asks for `on course` in green and `short` in red.
The skin's own ink rule, `.modal-board .row-figure`, has the same weight as `.row-figure.good` and
is written later in the file, so every marked figure on the board was drawn in the card's plain
ink. It is the first thing the tab is for and it was invisible. Two rules under the skin's ink put
the green and the red back, in `--good` and `--bad`, which is what the Company board's own paper
sheets print their points in. The week now reads `24 of 40, short` in red and the margins in green.

**4. The week's bar had a dark bar behind it.** `.contract-track` is the dark palette's border,
which on a cream card is a dark slab. On the board it reads the card's own line colour now, the way
the laptop's reads the screen's.

**5. A man's dinner and his free time were dark panel blocks on paper.** The two blocks of the day
track that are not work now read the card palette with the dark panel as the fallback, the same
pattern the track they sit in already used.

**6. A contract's name was grey on cream.** An `h3` inside a row's main span took the dark
palette's heading colour and beat the skin. It is the card's ink now. The ended card's name and
labels take the card's dim ink with it, so a term that is over reads as past, which is what
`2.1.3`'s "greyed" asks for.

**7. The picker's chips were steel magnets on a paper card.** The same class of fault Turn 19 found
with the assign chips. A chip standing on one of the board's paper cards is paper now; the chip
that is on keeps the blue the game marks a chosen chip with everywhere else.

**8. Our team's week line squeezed a man's name into a column four lines deep.** The week was put
inside the name span, which is a flex item sharing the row with five figures. It is the last thing
in the row now and the row wraps, so the week runs the whole width under everything the row says
about him, which is what the page's own hint promises: "the line under each man is his week".

**9. A hire card said the same thing twice.** Every card a standing had not earned printed the
reason in red in the middle and again in grey where the Hire button would have been. It is said
once now, where the button would have been, which is the game's own way of refusing a control.

**10. The Machines page told the extractor that a service was due on it**, on the same row as "It
is repaired, never serviced". A service is never due on a thing that is never serviced: the label
is for the machines a service is called on.

**11. The Company board said "0 h" over a sum line reading "-0.1 hours".** `2.14` put "0 h" where
"none" used to be, and took every figure at or below nought with it, so a week the machines COST
the workshop time read as a nought at the top of a sheet that said so plainly at the bottom. Hours
the machines cost are said as they are; "0 h" stays for a machine nobody stood at, which is what
2.14 is about.

**12. The Work Plan's first use note followed the modal and not the tab.** "One row a job. A red
figure on a job is material it does not have yet." sat under the Contracts tab, where there are no
job rows. It belongs to the Jobs tab now, the way the order board's note already follows its tabs.

### The twelve, what each shows, and what it was put beside

| # | File | What it shows | Put beside | What differed |
|---|---|---|---|---|
| 1 | `01-contracts-on-offer.png` | On offer: the cut sheet pack at £50, the three men in the picker with Gary chosen, price, material, his labour, the margin, 10 of the 8 needed a day, the week at +£330, the term at +£8,580, the CNC tip, and both day tracks | the Jobs tab of the same modal | findings 1, 2, 3, 5, 6, 7 |
| 2 | `02-contracts-running.png` | Running: the drawer boxes, week 1 of 17, the week's bar, Ravi's chip and Assign to this contract, `24 of 40, short` in red, the margins in green, his day with eight pieces and the job in the accent after them | the same, and the v28 contract bar it replaces | findings 1, 2, 3, 4 |
| 3 | `03-contracts-ended.png` | Ended: the wardrobe fronts, the term over, one full week and one short, 15 pieces, £2,400 taken, £900 of stock, 67.8 hours of labour at cost, +£313 net | the closing report event of v28 | findings 1, 2, 6 |
| 4 | `04-take-it-with-the-man-picked.png` | The offer card after one click on Ravi: every figure, both tracks and the button follow him. 39 min a piece, 12 of the 8 needed, the week at +£280 against Gary's +£330, and `Take it, Ravi on it` | the drawing in `docs/mockups/t20` | the drawing is two columns, the card is one (see below) |
| 5 | `05-jobs-tab-without-the-contract-bar.png` | The Jobs tab: three job rows, the axis, the blue line, no contract bar anywhere, and the modal's own first use note | the v28 Work Plan | the bar is gone, as 2.1.5 asks; nothing else moved |
| 6 | `06-our-team-let-go-and-the-week.png` | Our team: the owner and four men, each with his week and the week before it under him, `Let go` on three of them and `leaves on Wed 24 March` on the estimator the button was pressed on | the v28 Our team rows | finding 8 |
| 7 | `07-hire-card-tiers-and-the-locked-master.png` | The four joiner classes at 450, 600, 800 and 1,000 a week and 80, 100, 120 and 140 per cent of the owner, two of them badged On the books, and the extremely experienced one with no Hire button and `extremely experienced joiners come from reputation 60` where it would be, beside a Helper and a Sprayer that do have one | the v28 hire cards, which had three classes | finding 9 |
| 8 | `08-machines-page-life-and-service.png` | The Machines page: five rows, each with the sprite's own cell, the class, the bar of life and Service with its price. The saw reads 663.8 of 1,125 h, which is its 750 plus the half a first service bought it; the edgebander is in the red at 4,464 of 4,800 and is the one row that says service due | the laptop's Stock and Drawings pages | finding 10 |
| 9 | `09-office-door-closed-and-the-owner-in-the-room.png` | The hall's office door drawn closed with nobody standing in it, over the room behind it with the owner in it. Two frames of the same minute, 08:56 | the same door in Turn 19's `02-owner-in-the-open-door.png` | the swing is gone and the doorway is empty, as 2.12 asks; see the note below on where he stands |
| 10 | `10-the-helper-sweeping.png` | Jack with a broom in his hands at the cleaning station, the dust at his feet, and the chip `The hall is dirty, Jack is cleaning it` | the helper idle beside the dirt, which is what Piotr saw in v28 | nothing: the sheet in his hands is `character.helper.sweep` |
| 11 | `11-the-helper-is-emptying-the-bags.png` | Jack at the extractor with the chip `Jack is emptying the bags`, and no button on it | the v28 chip, which asked the owner | nothing: 2.8's `bagChange` autoRole does what it says |
| 12 | `12-company-board-0h.png` | The Company board: the Machines column, and the Output sheet's "act where they are" rows, which list the two joiners and the machines and no estimator | the v28 board | finding 11, and 2.3.3 doing its job |

The halves of picture 9 were shot apart, because the hall and the room behind its door are two
views of the game and no screen holds both; they are put in one file unaltered, on the game's own
page colour, and nothing is drawn on them.

### What the pictures showed and was left alone, with the reason

- **The owner in the office stands against the wall beside the door, not at his desk.** Turn 19's
  report raised this and left it with Piotr, and 2.12 keeps T19 2.2's office half as it is. The
  room is drawn from the desk, so there is no floor behind it to stand a man on; `OFFICE_OWNER_BOX`
  is the one number to move if he should be nearer. Unchanged tonight.
- **`End the contract` is a locked button while the free month runs**, with its reason in its
  title. That is `lockedButton`, the one disabled button `src/ui/modal.ts` allows, and it is what
  the game does everywhere else; it is not a dead control drawn by mistake.
- **The thicknesser has no sprite**, so its row draws the Turn 19 placeholder. No new art tonight
  (section 6), and machine sheets are not in the section 9 requests.
- **Two labels in the hall sit on top of each other** where two tool cabinets stand together, and
  the drill's label crosses the hand tool set's. Older than tonight, and no hall label work is in
  this brief.
- **The strip says "The bags are full" while the chip says "Jack is emptying the bags".** Both are
  true, and the strip asks the owner for nothing, which is what 2.8 is about.
- **A hire card blocked by kit still says the list twice**, in different words: the red line
  carries the price of the kit and the grey reason carries none. Older than tonight.
- **The drawing is two columns and the card is one.** `docs/mockups/t20/contracts-tab.html` puts
  the figures left and the day tracks right. The game's card and row family is a single column, and
  a second grid family would be a new look, which section 1 forbids and no line of 2.1 asks for.
  Every figure and both tracks of the drawing are on the card, in its order.
- **`24 of 40, short` while his day track shows eight pieces.** The pace counts what is left of
  today and the days left in the week, so a morning lost queueing at the one saw is one piece short
  of the forty, and it says so in red. It is the engine's own reading and 2.1.2's own words.

### The check

`npm run check` green on its own exit code before the commit: 196 test files, 1,887 tests, 1 todo.
No server and no browser is left running.
