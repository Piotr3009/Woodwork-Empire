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
