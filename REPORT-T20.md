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

## Phase B, B1: the money

**T20-B1a The prices that pay (2.2).** `CONTRACT_PIECES` came from phase A at Piotr's figures and
this task proved them: by hand a cut sheet pack makes £26.67 an hour of margin, a drawer box £26
and a wardrobe front £25, each inside the band of 22 to 30, and the wardrobe front is four hours
of work and no longer three days. `tests/engine/contractPrices.test.ts` prints the three figures
for this report and asserts the band, and it prints what one piece comes to for each of the four
tiers, by hand and with a used saw.
`npm run check` green on its own exit code.

**T20-B1b The contract fills the day first, and the client who ends it (2.1.4, 2.1.6).** A man
assigned to a contract keeps the job he is standing on: the contract books his pieces from 8:00
until the day's share of the week is made and the job has what is left of the day, which is one
predicate, `contractWantsToday`, read by the job's hands, by the contract's minute and by the tab.
A second short week in a term now ends the contract, the client's own ending, with the closing
report marked `ended by the client`.
`npm run check` green on its own exit code.

**T20-B1c The Contracts tab (2.1.1 to 2.1.3, 2.1.5).** The Work Plan's second folder: every offer
as a card costed for the man who would do it, with his day drawn 8:00 to 17:00 a block a piece,
the next best man's day beside it, the one machine that would shorten the piece most with its
figures computed, and `Take it, <name> on it` in one click; Running with the week live, the amber
minutes that go to his job and `End the contract`; Ended greyed. The v28 contract bar left the
Jobs tab, it was not copied.
`npm run check` green on its own exit code.

**T20-B1d A job's own delivery is the job's, rack or no rack (2.16).** What would not fit on the
rack stays on the job's pallet instead of being lost, `shortfallOf` counts it and the pallet lands
as the saw makes room, so a £50,000 bespoke job is one order, one unload and nothing short after
it. A stock lorry's overflow is still the yard question of Turn 2.
`npm run check` green on its own exit code.

**T20-B1 reviewed.** An adversarial reading of the B1 diff gave six findings. Three stood and were
put right: a contract short of sheets used to freeze the man off his job as well and stand him at
his bench all day, the Orders page still called a contract the client had walked away from "the
term is over", and two clock positions were typed into the day track. One stood and is a line in a
frozen file, note 1.1 of `NOTES-B1.md`. Two are put in front of Piotr below.
`npm run check` green on its own exit code. Each finding, confirmed or refused, is in
`NOTES-B1.md` under "REVIEW".

### Two things Piotr has to answer

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
   Note 1.5 of `NOTES-B1.md` has the change and the test.
2. **A contract piece is worked at its first stage only.** The engine, the card and the machine
   tip all read `piece.stages[0]`, so the wardrobe front is a cutting job: a CNC or a saw shortens
   it and a spray booth buys nothing on it, against the sentence of 2.2. The engine and the card
   agree with each other, so nothing lies to the player about the figures he is shown; what is
   missing is the second half of 2.2's promise. Putting it right means a piece that moves from
   stage to stage inside the minute loop, with the station and the hall following it, which is a
   turn's work of its own.
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

---

## Phase B3, the hall

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
write it: it is note 1 of `NOTES-B3.md` for phase C, with its exact old and new text, and the
characterisation test above keeps asserting today's behaviour until that note lands.

### 2.8 The fix, the bags and the broom

**The fix is a note, and the characterisation test still asserts today's behaviour.** The cause is
one line of `runHelperClean` in `src/engine/game.ts`, which is one of the six frozen files, so B3
wrote it out as note 1 of `NOTES-B3.md` with its exact old and new text, its two import lines and
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

### 2.9 Machines: the inventory, the bar of life and the service that buys it

**The page.** A row a machine, under Equipment on the laptop: the sprite's own cell small on the
left, the name and the class, then the bar of its life with `2,140 of 3,600 h` under it, then
Service with its price on it. The row is the game's own row and the bar is the game's own bar, the
one a contract's week is drawn with, because a life against a total and a week against its
quantity are the same picture (docs/ui-style.md 11, 13). The row says `broken`, `in service`,
`past its life` or `service due` where the class is, and where the button would be it says why
there is none. Four CSS rules are wanted for it, all of them modifiers on families that exist and
all of them on tokens that exist; they are in NOTES-B3.md for phase C, and the page reads
correctly without them.

**The service rule.** A service extends the machine's life by half of its **original** life the
first time, a quarter the second, an eighth the third, counted off `serviceCount` and worked out
from the original every time, so a machine serviced ten times and a lifted save come out at the
same figure and the bar's total grows with each one. It costs `SERVICE_COST_FRACTION` of what the
machine cost; that constant is in the frozen `constants.ts` and still reads 0.02, so the tenth is
note 4 for phase C and every line of code and every test reads the constant instead of the figure.
The machine is out from the call until the next working day, the first service included: nothing
runs on it (`freeMachines` passes it over), its stage stops the way a broken machine's does
(`familyStopped` answers `service` beside `broken` and `bags`), and the chip under the hall says
`The table saw is in for a service, nothing runs on it today` with no button on it. Past the end
of its life the machine does not vanish and is not scrapped: it goes on working and gives up
twice as often for every week of its own clock it runs past the end, capped at a certainty, and
the row says `past its life`.

**What was left, and why.** 2.9 says the rule "replaces Turn 8's 30 minutes at 2%", and its four
numbered points say what a service gives, costs and takes and what happens past the end. None of
the four takes the half hour of somebody's time away, so it was left: the service is still the
task the morning raises and somebody works off, and all four points are true of it. The machine
goes out when the service is done rather than when the button is pressed, which is half an hour
apart. If Piotr means the half hour to go, it is three places in the frozen `game.ts` and it is
written out in full as note 7 of NOTES-B3.md, as a decision and not as a fix.

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
