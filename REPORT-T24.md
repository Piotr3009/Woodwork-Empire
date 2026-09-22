# Report, Turn 24: the number says who made it, the boss has a bench, nine leftovers closed

Woodwork Empire, Turn 24. Built against `CLAUDE.md` of 22.09.2026 (first line "Turn 24").

Two lines a task, in the order of section 5, each with the commit it sits in.

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
