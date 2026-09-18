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
   front's `sheets` at 0.3. It is not moved tonight because it is Piotr's own figure and the
   brief says the sheets stay. Note 1.5 of `NOTES-B1.md` has the exact change and the test.
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
