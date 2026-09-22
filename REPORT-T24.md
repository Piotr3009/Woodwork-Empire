# Report, Turn 24: the number says who made it, the boss has a bench, nine leftovers closed

Woodwork Empire, Turn 24. Built against `CLAUDE.md` of 22.09.2026 (first line "Turn 24").
Branch `claude/turn-24-who-made-it-0y4n5p`, off `473f279`, the tree `origin/main` stands on.
`APP_VERSION` v49 to v50, `STATE_VERSION` 25 to 26.

`npm run check` on the finished tree, read off its own exit code: **exit 0**, **234 test files,
2,292 tests**, 2,291 of them passed and one the standing todo of Turn 12's blocker, up from 223
files and 2,227 tests on the tree this turn opened on. Seven commits, every one of them with a
green check of its own before it. One agent, serial, no worktrees and no agent teams.

`git diff main --stat`: 64 files changed, 2,663 insertions, 338 deletions, of which this report,
`docs/notes-t24.md` and the eight pictures are a good share. `src` alone is 512 insertions against
174 deletions over 16 files; the tests are 1,616 against 147 over 43.
`git diff main --stat -- src/ui/styles.css` is **empty**: no new token, no new colour and no new
class.

Two lines a task, in the order of section 5, each with the commit it sits in.

## 0. Blockers, and where the session did not follow the brief to the letter

**Nothing stopped the build.** Everything in sections 2.1 to 2.10 is built, tested and
photographed, nothing on the "do not" list of section 6 was done, and every v25 save loads, the
two fixtures among them.

The items below want Piotr's eye. The first two are the turn's own findings; the rest are readings
of the brief that were not the only possible one, or consequences of decisions the brief did make.

1. **The by hand rule is not applied to the man who holds a bench, and 2.1 printed it on its first
   night. This is the first thing to settle.** `stagePlanFor` gives every stage of a by hand job
   the 0.67 penalty of rule 9.5. `runProductionMinute` then throws that figure away for any man
   who is holding a machine: `speed = machine === null ? stage.speed : outputFactorOf(machine)`.
   The lead of a job holds his own bench at a bench stage, so **the lead of a by hand job runs at
   his bench's class and never at 0.67**; the men behind him, who hold no bench of their own, run
   at 0.67. On Piotr's own day 149 save that is Eddie at 1.10 and Pete and Callum at 0.67, on the
   same job, in the same minute, and it is in picture 1.
   Nothing was changed: section 6 forbids touching what a minute is worth or the by hand rule of
   9.5, and section 8 parks the question ("a by hand job runs at 0.67 at a saw the hall owns:
   keep, or let the saw count?"). What the row says is what the minute actually was, because a row
   whose two figures did not multiply out to the one beside them would be the very defect 2.1
   exists to cure. **Piotr has to rule on which of the two readings is the game**, and the sheet
   now shows him the disagreement every day.
2. **`<why>` reads the machine before the by hand penalty, for the same reason.** 2.1 words the
   rule "by hand for a by hand job or a by hand stage, the class of the machine he stands at for a
   machine stage". Read in that order, a man at an industrial bench on a by hand job would read
   `by hand, 14 min: 0.80 times 1.10`, which is a sentence that contradicts itself. The rule built
   is: the class of the machine he stands at when he stands at one, the by hand penalty when he
   stands at none and his stage falls back to a pair of hands, and `at the bench` otherwise. On a
   hall with no saw and no solid wood tools, which is what "four men on a by hand job" means, all
   four read `by hand`, and the engine test asserts it.
3. **There is no day 141 fixture.** Section 4 names the two fixtures in `tests/fixtures` as day128
   and day149; 2.1, section 7 and C4 all say "the day 141 fixture". Everything the brief hangs on
   it is hung on **day149**, which is the hall the mockup was drawn from: four men, the oak table
   by hand, the owner at a saw, the note naming the oak table and the solid wood tools. Its sum is
   the hall's own, 0.81, and not the mockup's illustrative 0.75; what is asserted is that the sum
   is the figure the top bar carries, which is the invariant the mockup's figure stands for.
4. **The mockup and the sheet differ in three places, and the brief wins each time
   (section 1: "where files disagree, this one wins").**
   `docs/mockups/v47/output-who-made-it.html` writes the crew's grades as the engine's own keys
   ("Pete, senior joiner", "Callum, master joiner"); `TIER_WORDS` is the game's one vocabulary and
   the same sheet's own lines already print "very experienced" and "excellent", so the rows print
   the game's words. The mockup's note carries a second sentence ("Solid wood tools would put it
   on the machines.") that 2.1's template does not; the template is what is built, because 2.1
   says at most one sentence and gives its words. The mockup writes the Hall row's figure with no
   tone class; 2.1 says the figure goes through the sheet's own `tone`, which gives `dim` at 1.00.
5. **2.8 took a dead track with it, and it was Turn 2's.** A restock is bought whole and its
   overflow goes into the store on landing, so `unloadIntoStock` never hands an overflow back, and
   `raiseStockOverflow`, the `stockOverflow` event and `writeOffSheetsLeftOutside` had no caller
   left. They are deleted rather than left as a screen the game can never show. What goes with
   them is CLAUDE.md 8.9's "leave them out and lose them": **a player can no longer choose to lose
   sheets in the yard.** He had no door to that choice from v38 either, because the restock cap
   made the event unreachable from every button the game draws (`BUY_STOCK` is an action with no
   control on it), which is what "[open since v38]" in 2.8 is about. If Piotr wants the choice
   back it belongs on the Restock click, where the tab is already quoting him the storage.
6. **The central systems are serviced and still never break down.** 2.7 asks for "the same due
   point, the same card button, the same day out" and says nothing about breakdowns. Everything on
   the service list is rolled for a breakdown every morning it is past its service, and the two
   systems' own catalogue line is "No more bags and no breakdown", which a player has read before
   he spends 35,000. `overdueBreakdownChance` returns nought for them. Both halves of the line are
   kept: a plant that is serviced, and a plant that does not give up.
7. **REPORT-T23 0.13's "a few pixels high" does not reproduce.** `canteenLockers.png` was decoded
   and the painted label strips measured; the far bank's four plates sit on their strips' centres
   to 1.1 px and the worst of all eight is 1.4 px, in the **near** bank. One plate moved, by one
   pixel. The eight measurements are T24-B6 below and `docs/notes-t24.md` 3.
8. **2.2 cost every hall in the suite one place at a bench, and one scenario a class of bench.**
   Twenty one test halls that hire a joiner wanted a second place; each was flipped, none kept
   beside a new one. A unit owns no more benches than its bench slots (six), so **a 200 m2 hall on
   one place benches now tops out at five joiners and the boss**; the six joiner scenario buys the
   two place class instead, which is why its figures did not move. The scripted player of
   `autopilot.ts` picks the class the crew it means to hire will fit on, and that is the only
   reason the playthrough of 10.4 is unchanged by 2.2.
9. **2.8 moved the three month playthrough, for the better.** The scripted player's twenty sheet
   restock is no longer trimmed, so the hall stops running dry: month 1 is unchanged at 9,120,
   month 2 is 381 worse at -2,547 for the storage fees, month 3 is 7,297 better at -3,751, the
   efficiency of month 3 rises from 75 to 77, and the run ends on day 122 at -11,502 where it
   ended at -14,893, which is 3,391 less of the overdraft. Every figure is measured on the
   finished tree and written into the test with its reason; nothing was tuned.
10. **The mark over the contract man at the canteen door cannot be hovered.** The room's own hit
    polygon lies over the doorway cell he stands on, so pointing at the disc points at the canteen
    and the paper stays down. The disc is drawn and is in picture 3; the words are in the markup
    and are asserted there. It is the same family of thing as REPORT-T22 15 and REPORT-T23 11
    about where the disc sits, and it wants one rule about what takes the pointer in the hall.
11. **The Output sheet gives the new block about two rows of window at 1280 by 800.** The sheet
    now carries two `ledger-list`s and they share its height, so "Who made it today" shows its
    head and two rows and the player scrolls for the rest. Pictures 1 and 8 are the head and the
    foot of the same block. Nothing in 2.1 says the sheet should grow and nothing was changed;
    Piotr should see it once and say whether the block wants the window.
12. **`tests/ui/laptopPages.test.ts` was a flake and is not one now.** It starts its game through
    the start screen, which seeds itself, and two of its tests reached for the first open job of
    work by index; on a draw where that one could not be started they failed. It failed once in
    this session's checks, on a file this turn does not otherwise touch. The two tests now press
    the buttons the page actually draws, which is the player's own reading and the rule of
    docs/ui-style.md 3. Five runs in a row green, and the full check green after it.
13. **The branch is the session's own and not the brief's.** Section 5 says "Branch
    turn-24-who-made-it from main". The session's standing instruction names
    `claude/turn-24-who-made-it-0y4n5p` and forbids any other, so that is the branch, as Turns 18
    to 23 each recorded of their own.
14. **`docs/turn-23-brief.md` came off `cd51383` and not off `main`.** A1 says "byte for byte from
    main's CLAUDE.md", which was written before Piotr committed the Turn 24 brief as `CLAUDE.md`
    in `473f279`. `cd51383` is the last tree whose `CLAUDE.md` began "Turn 23" and is what the
    archive is, with `diff` silent.

## The tasks

**T24-A1 Housekeeping and v50.** `docs/turn-23-brief.md` is `git show cd51383:CLAUDE.md` byte for
byte, 29,506 bytes, with `diff` silent; `cd51383` is the last commit whose `CLAUDE.md` began
"Turn 23", because `main` already carries this turn's brief as `CLAUDE.md` (`473f279`).
`APP_VERSION` v49 to v50 with the two tests that name it, `STATE_VERSION` 25 to 26, the
`dayStats.byMan` field of section 4, `liftToVersion26` writing `{}` into it, and the migration
test that opens both of Piotr's day fixtures on the new version.

**T24-B1 2.1 Who made it today.** `dayStats.byMan` is written a minute at a time by
`bookOutputMinute`, which gains the man's id; the day loop, the night loop and the contract minute
all book through it and there is no second path. `workshopBreakdownToday(state)` in machines.ts
returns the rows as data (the man's line, his words, his minutes, his worth a minute, the hall's
row and the one sentence) and `outputSheet` prints them in the sheet's own classes with nothing new
in the stylesheet, under `Workshop today` and over `What moves it`, as
docs/mockups/v47/output-who-made-it.png has it.
The pure tail of `takeMachines` became `machineAtWork` in production.ts so the man who is placed
and the row that says what he made read one answer; eight engine tests and six board tests, the
day 128 and day 149 fixtures among them.

**T24-B2 2.2 The gate counts the owner's place.** `benchPlacesNeeded(state, hiring)` in staff.ts is
the joiners on the books, the man at the door and the owner, and `shortfallForHire` counts the
bench in those places exactly as it counts the cabinet in slots; the refusal is
`No place at a bench for him: the owner needs one too`. A save whose crew already fills the benches
loads as it is and only the next hire is refused, asserted.
Five card tests and two engine tests; the rule moved twenty-one halls in the existing suite, every
one of them flipped rather than kept beside a new one, and section 0 item 2 has the two
consequences Piotr should see.

**T24-B3 2.3 A contract man with nothing to do stands at the canteen door.** `contractStationFor`
asks `contractMenAtWork` first and returns `STATION_NO_BENCH`, the cell a man with no bench stands
on, whenever the list does not carry him; `bubbleFor` hands him `noMaterial` with the contract's
own name, so the mark reads `no sheets for <contract>` and never `waiting for the saw` over a man
with two saws idle.
The station and the mark are read off the one `contractMenAtWork`, so where he stands and what is
wrong with him cannot disagree; four engine tests and two render tests, the empty rack, the
delivery the next minute and five o'clock among them.

**T24-B4 2.4 Wear on the machine minutes only.** `pieceMachineShare` in contracts.ts is the share
of a piece's minutes worked at a machine of its family, its machine stage's own share over the
stages the piece actually has, off `PRODUCTION_STAGES`; `contractResultFor` and `closingReport`
both multiply by it, so the card and the term's report cannot disagree.
A cut sheet pack is all saw and reads 1, so its figures do not move to the pence, asserted; a
wardrobe front is cut and then finished and reads 0.625, so its wear falls to its cutting minutes;
a piece made by hand still shows `Machine wear a piece, by hand` at nought.

**T24-B5 2.5 The men at a bench stand on its front row.** `benchCellsAt` is one `fillAlong` of the
bench's front, so the operator, the second man and the third take the front cells of the first,
second and third columns of the bench's own footprint; the table's `second` offset moved from the
back right cell to the second front one and `stationCell` reads a bench's second place off the same
list as its third. Four render tests: a standard bench at 8,6 puts its two men on 8,7 and 9,7, an
industrial one puts three on 8,7, 9,7 and 10,7, and no class of bench ever puts a man behind it.

**T24-B6 2.6 The canteen's plates read across.** `CANTEEN_PLATES` and
docs/mockups/t23/canteen-regions.json are lettered across both banks: the near bank's top row, the
far bank's top row, then the two bottom rows.
The far bank's four were re-measured off `public/sprites/canteenLockers.png` by decoding the PNG and
reading the painted label strips. Strip centres and plate centres, in pixels: 272.4 against 273.5,
275.0 against 275.0, 449.0 against 449.0, 443.6 against 444.0. So REPORT-T23 0.13's "a few pixels
high" does not reproduce: the far bank's plates sit on their strips to about a pixel, and only the
first of them moves, from y 260 to 259. The near bank's four measure 265.1 against 266.5, 269.1
against 270.0, 477.7 against 478.0 and 461.9 against 462.0, and are left as the art side wrote
them.

**T24-B7 2.7 Central systems serviced like extractors.** `isServiced` takes
`CENTRAL_EXTRACTION_SPECS` in, so `dustSystem` and `flexiSystem` book their hours from the duct run
the day loop already reads, come due on the same 80 hours, carry the same `Service · £X` button on
the Machines page and go out for the same working day. `overdueBreakdownChance` returns nought for
them, which keeps the half of their own catalogue line that says "no breakdown"; eleven tests,
including the extractor left exactly where Turn 23 left it.

**T24-B8 2.8 A restock is never trimmed to the rack.** `restockSheets` hands back the number the
player typed, whole; `restockSplit` says what lands on the rack, what goes to the store and what
the store charges, and the Materials tab prints it before the click
(`60 sheets: 40 on the rack, 20 to storage at £150`). `unloadIntoStock` sends a stock lorry's
overflow into the store exactly as it has sent a job's since Turn 20, so nothing is left in the
yard and nothing is asked twice. Six tab and engine tests; the dead yard track is section 0 item 5.

**T24-B9 2.9 Two deletions and one sentence.** `oldestOpenJob` and `weekEfficiency` are gone with
their exports and the two assertions that were their only readers;
`grep -rn "oldestOpenJob\|weekEfficiency" src tests` is silent. docs/art/SPRITES.md 10.4 no longer
says a man does not walk faster at x10: it names `WALK_CELLS_PER_SECOND` and
`WALK_CELLS_PER_SECOND_FAST` and says which applies when.

**T24-B10 2.10 The cheap start, a year of it.** `tests/scenarios/turn24.test.ts` plays (pp): Easy,
the day one list in the cheapest class of every family, one joiner on day 1 and one a quarter after
that, the first standing contract the crew can keep up with, and the bank on the first day the
account is under. It asserts nothing about survival; what it asserts is that the bank lends the
floor and that a year was actually played, and it prints the table. The company did not reach month
twelve, and the table is section 3 of this report.

**T24-C1 Notes.** `docs/notes-t24.md`: the engine's new import rings and what would break them,
the by hand finding in full, the eight pixel measurements of the canteen plates, the two things
the brief named that the tree does not have, what 2.2 did to the scripted player, and what a later
turn should pick up.

**T24-C2 The scenarios re run.** Every scenario is green. 2.2 moved nothing, because the scripted
player buys the class of bench his intended crew will fit on (section 0 item 8). 2.4 moved nothing
outside the contract tests: no scenario runs a contract whose piece has a bench stage on it. 2.8
moved the three month playthrough of 10.4, for the better, and the five figures are restated in
the test with their reason (section 0 item 9). The six joiner month of `thirtyDays` keeps its six
men and its figures; what changed there is that the seventh man's shortfall no longer names a
bench, because that hall now buys two place ones.

**T24-C3 The cross check of section 7.** `tests/ui/turn24Check.test.ts` is section 7 read down in
one file, ten tests: the four rows and the figure the top bar carries, the note naming the oak
table and the solid wood tools, the hall row reading `extractor on service`, the third joiner
refused with the owner's line and taken on once a used bench is bought, the two men of a standard
bench on its two front cells, the wardrobe front's wear against the cut sheet pack's, the dust
system due after three weeks, sixty sheets into a rack with room for forty, the grep for the two
deleted selectors, and the stylesheet with no name of this turn's in it.
`git diff main --stat -- src/ui/styles.css` is empty.

**T24-C4 Look and shoot.** Eight pictures into `docs/report-t24/`, every one the real app in
headless Chromium at 1280 by 800 at one device pixel, in front of a save the game's own writer
produced and its own Continue button opened, driven by real clicks with the clock stopped by the
game's own pause; every one asserts in the script that the words it is named for are on the page
before it is saved, and every one logs the speed knob, which reads `Pause` on all eight. The
staging script is not committed, as Turns 21, 22 and 23 did not commit theirs.

**T24-C5 Report and PR.** This file, and the pull request titled
`Turn 24: the number says who made it, the boss has a bench, nine leftovers closed`, not merged.

## The eight pictures

The third column is the nearest existing picture of the same screen, and the one thing each pair
differs by is what this turn did to it.

| picture | what it shows | beside |
| --- | --- | --- |
| `01-the-output-sheet-who-made-it-today.png` | the company board's Output sheet with `WHO MADE IT TODAY, 913 MIN WORKED` / `A MINUTE` under the workshop's 0.81, and the first rows: `Piotr, cutting Small kitchen (6 units), commercial` at `professional table saw, 1 min: your 0.97 times 1.17` and 1.14, `Eddie, experienced joiner, assembling Oak dining table, commercial` at `industrial assembly bench` and 0.88 | `report-t23/05-the-manager-on-the-output-sheet.png`: the same sheet with nothing at all under the workshop's figure. Eddie's `industrial assembly bench` beside Pete's and Callum's `by hand` on the same job is section 0 item 1 |
| `08-the-who-made-it-block-at-its-foot.png` | the foot of that same block: the `Hall` row reading `clean, extraction working` at 1.00, the sum `= 0.81`, and the sentence `Oak dining table, commercial was taken by hand: no solid wood tools in the hall, so every stage of it runs at 0.67, the saw included.` | picture 1, scrolled. Two frames because the sheet gives its two lists a share of its height each, which is section 0 item 11 |
| `02-the-hire-card-refused-for-the-owners-place.png` | the Team page's Workshop tab, the `Joiner, no experience` card with `On the books x 2`, `To make this hire possible: Workbench · £120` and, where the Hire button would be, `No place at a bench for him: the owner needs one too` | `report-t23/12-the-hire-card-with-no-locker-for-him.png`: the same card refusing the same way in the same place; the thing that is short there is a locker and here it is the boss's own place at a bench |
| `03-a-contract-man-at-the-canteen-door.png` | the hall with Ben on the canteen door cell and the red mark over his head, no saw held and nobody queueing at one | `report-t22/05-the-hover-line-over-a-mark.png`: a mark over a man at a machine's waiting cell reading `waiting for the saw`. Here he is off the saw altogether. The paper is down because the canteen's own hit polygon takes the pointer, which is section 0 item 10 |
| `04-two-men-at-a-standard-bench-and-three-at-an-industrial-one.png` | the hall zoomed to the benches: three men in a row along the front of the industrial bench, one at the front of the standard one, and the fifth at his machine | `report-t23/17-two-men-at-one-standard-bench.png`: two men at one bench there, the second drawn off its top corner; here every man is on a front cell of the bench's own footprint and they read as a row |
| `05-the-canteen-plates-read-across.png` | the canteen, `6 of 8 lockers in use`, the plates lettered `Liam` and `Callum` on the near bank's top row, `Ravi` and `Adam` on the far bank's top row, then `Ben` and `Harry` on the near bank's bottom row | `report-t23/09-the-canteen-room-with-the-names-on-the-plates.png`: the same wall lettered bank by bank, where the fifth name jumped to the far bank's top row instead of carrying on along the near bank's bottom one |
| `06-a-dust-systems-card-with-its-service.png` | the Machines page with the `Central dust extraction system` row: `service due`, `120 of 5,000 h`, and a `Service · £3,500` button beside the saw's, the compressor's and the extractor's | `report-t23/08-the-extractors-card-with-its-service.png`: the fan got hours, a due point and a button in Turn 23 and the two central systems did not; they have all four now |
| `07-the-materials-tab-with-the-storage-line.png` | the Stock tab with `60` typed, `60 sheets at £170 = £10,200`, `60 sheets: 40 on the rack, 20 to storage at £150` and the button reading `Restock: 60 sheets, £10,200` | `report-t23/16-the-materials-tab-at-sixty-sheets.png`: the same tab with the same sixty typed, where the button read forty because the click was trimmed to the rack and nothing said where the other twenty went |

## The year of the cheap start, (pp)

Easy, the day one list in the cheapest class of every family, one joiner on day 1 and one a
quarter after that, the first standing contract the crew can keep up with, and the bank on the
first day the account is under, against the 10,000 loan floor of Turn 23's 2.12. The scenario
asserts nothing about survival: this table is what it is for.

| month | cash | reputation | crew | machines | delivered |
| --- | --- | --- | --- | --- | --- |
| 1 | 11,853 | 6 | 1 joiner | 14 | 11 |
| 2 | 10,667 | 13 | 1 joiner | 14 | 12 |
| 3 | 3,856 | 27 | 1 joiner | 14 | 14 |
| 4 | 1,914 | 54 | 2 joiners | 18 | 12 |
| 5 | -7,510 | 58 | 2 joiners | 18 | 12 |
| 6 | -13,755 | 63 | 2 joiners | 18 | 11 |

**The bank closed the company on day 190**: "You cannot pay what you owe and the bank has pulled
the overdraft." It did not reach month twelve.

What the table says is that the cheap start is not slow, it is thin. The hall delivers eleven to
fourteen pieces a month from month 1 and the reputation climbs from 6 to 63 in six months, which
is a company doing its work well; what kills it is that a used saw, a used fan and a used
compressor turn out about half of what better kit does, and the rent, the rates and two men's
wages do not care. The second man of month 4 costs 1,950 a month and adds less than he costs at
that pace. Whether the answer is a higher floor, a cheaper opening or a better used ladder is
Piotr's, and the figures are here to rule on.
