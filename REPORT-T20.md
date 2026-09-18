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
