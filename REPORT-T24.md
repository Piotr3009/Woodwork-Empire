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
