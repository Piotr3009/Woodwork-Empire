# Report, Turn 30: the line bought whole, its windows contract, its upgrades and its moving pictures

Woodwork Empire, Turn 30. Built against `CLAUDE.md` of 11.10.2026 (first line "Turn 30").

## The tasks

**T30-A0 The suite on v88.** `npm run check` on v88 as it stood: lint and build clean, 2,770 of
2,771 tests in 290 files green. One red, `tests/ui/officeHover.test.ts` (`no pointer word in the
TypeScript of the views or the renderers`): two comments v87 wrote into `src/render/hall.ts` said
a machine's `hover`. A plain fault, mended by calling it the machine's `tooltip` in both comments;
no code changed. The check then passed on its own exit code, 2,771 tests in 290 files.

**T30-A1 Housekeeping and v89.** `CLAUDE.md` is this turn's brief (its first line says "Turn 30")
and `docs/turn-29-brief.md` was already in `docs/`, both put there by the ZIP. `APP_VERSION` is
`v89`, and its two pins are flipped (`tests/ui/saveCheck.test.ts`, `tests/ui/version.test.ts`, the
latter's `written in constants.ts and nowhere else` too); the state stays 42 until C1 lifts it.

**T30-A2 The mockups.** Seven pages of section 9 in `docs/mockups/t30/`, each the game's own markup
from engine states, beside the same screen today, shot in headless Chromium, with a README naming
which is which and every line written by hand: the Production line tab and the line's card in four
states with the four upgrade cards, the offer card beside End of day, the Contracts tab's running
block, the hall with the line whole and a pallet at the gate, setup mode dragging the line, the
Owned tile's `Sell the line for £5,000,000`, and the card of a lifted save. No CSS token or class.

**T30-B1 Pack 1 of 09.10.** The thirteen pictures are in `public/sprites/` byte for byte (each
matches the pack's own SHA256 line): the five sanders and their `.r` over Turn 28's, and the three
cutter cases, which the catalogue's tile and the Sprite check page now draw where they showed an
empty box and `no file yet` (`tests/ui/t28Families.test.ts` flipped; the measured class files 107
to 110 in `tests/render/spriteClasses.test.ts`). The eight sander ports are measured again, off
the art side's own mesh through the pack's own matrix and checked by eye (`src/engine/ports.ts`,
[TUNE until Piotr confirms]); no test pinned the old figures. The root is as it was before 09.10:
the game's README is back with this turn's lines, and the rest of the pack is in
`docs/art/pack-0910/` with `EDITED.md` (the five files whose eleven em dashes were replaced, and
`SHA256SUMS.txt` left as delivered). SPRITES.md section 15.1 carries the thirteen files.

**T30-C1 The line bought whole, STATE_VERSION 43.** Six modules of 6 by 3 by 3 m at their shares
of `LINE_PRICE`, 10,000,000 written as their sum, with no `requires`; one folder on the line tab
(module 1's, `from £10,000,000`) and one card, the line's, drawn by `renderLine` in place of a class
card; one click orders the six on one due day at the first clear 36 by 3 from (2, 14)
(`lineSite`, `canPlaceBox`, the one placement check `canPlaceSpec` now reads too), the cash down
once on `Window production line ordered`; sold whole from any module's tile on one line and one
card; modules 5 and 6 do the Finishing and the Glazing (`LINE_COVERS`), `LINE_FACTOR` to 2.4 on
the Finishing on module 5, 33 places each, 18 per cent of the boards, the booth still asked, and
`lineLevelForJobs`. The 28 pictures are in, byte for byte; no code reads the manifest by pattern,
so the two new kinds of file needed no teaching in `src/`, and the two counts that filter by name
(`rotate.test.ts`, `spriteClasses.test.ts`) now say so. The lift: `liftToVersion43` writes
`state.windowLine` whole with its defaults, and `takeTheLineBack` (gated `version < 43`) refunds
Turn 29's modules on one `Production line refunded: it is sold whole now` line and queues the
`lineRefunded` card; a module sold and waiting is left for its van, which pays its own half.

**T30-C2 The line moved as one.** In setup mode any module, or the outline of one on order, takes
the whole line: `canPlace` asks the 36 by 3 at the new place clear of everything but the line
(`canPlaceLine`, through `canPlaceBox`) and refuses with `The line needs a clear 36 m by 3 m`, or
`The line is never turned` for a turn; `moveItem` moves the six or none, a man at a module with it;
`MOVE_ITEM` records the six, so Done reads `Moving 6 machines takes 6 h` (a module heavy for that
question alone, its delivery still built in) and Put them back puts the six back. The ghost is the
36 by 3 with each module drawn in it (`Ghost.parts`); the app's guard and `LINE_STANDS_WHERE_BUILT`
are gone. New: `tests/engine/t30Move.test.ts` and the drag in `tests/ui/t30Line.test.ts`.

**T30-C3 The line's contract, its windows, the pallet and the gate.** A record of its own
(`state.windowLine.contract`, `src/engine/lineContract.ts`), never one of `state.contracts` and
drawing nothing off the seeded stream: offered by the `lineContractOffered` card (two choices, so no
cross and no Escape) at the end of `startDay` once the six stand and two engineers are on the books,
and a week on after `Not now` or an end. While it runs, `runLineMinute` (beside the men's minute in
`advanceMinute`) moves the window on in the day's working minutes only, with two engineers on duty
and nothing being moved: £1,500 in on the contract line and £600 out on the material line a window,
each one growing line a day, the material past the overdraft floor; the tenth window sends the
pallet to the gate (`LINE_PALLET_LAYOUT`, one box a pallet and the label), taken at the next working
open with no ledger line; a part pallet goes on `End it` or the sale. The Contracts tab shows its
block first; the line's card says it can work one. The scenarios (zz) and (bbb) of Turn 29 end or
turn the offer down, since they are about the jobs and the joiners' contract.

**T30-C4 The sheets and the windows on the pallet.** `MACHINE_WORK_SHEETS` holds the art side's one
set of figures for the six; a module that works (`moduleWorks`: the clock running, and the
contract's window minutes or a man drawn at it) is drawn by `sheetArt` in place of its picture, in
the same box, anchor and shadow, marked `data-sheet`. `playSheets` (in `src/render/sprites.ts`, the
shape of `playCharacters`) writes only the frame and the view box, only when the frame changes, on
real time at 6 a second, holds while the clock stands, and is called in `runFrame` and at the end
of `render()`, so a page written mid loop keeps its frame. Module 6 draws the one overlay of the
windows on its pallet, `stack01` to `stack09`, in its own drawable; none on an empty pallet.

**T30-C5 The four upgrades.** `LINE_UPGRADES` (Diamond tooling 400,000, Line software 300,000,
Servo press 500,000, Second spraying robot 600,000) is a table of its own and not kit: bought from
four cards under the line's card in its folder, in the class card's classes with no picture, the
cash down at the click on `Line upgrade: <name>`, fitted `LINE_UPGRADE_DAYS` (10) working days on
and kept on `state.windowLine.upgrades`. `lineWindowMinutes` takes `LINE_UPGRADE_MINUTES` (15) off
for each fitted, never below 60, so the offer card, the running block and the line's minute read
120, 105, 90, 75 and 60; nothing of the jobs changes. Refused in the card's order (`Needs the
production line`, `Being fitted: ready on <day>`, `Fitted`, `Not enough cash`); emptied for nothing
when the line is sold. The line's card now ends `...its price; the upgrades go with it`. New:
`tests/engine/t30Upgrades.test.ts`.

**T30-E1 Notes and the art side's requests.** `docs/notes-t30.md`: where each task lives, the lift,
the readings of the brief the code marks [TUNE], section 10's thirteen choices each with what was
built, how to read the line (`lineModules`, `lineLevel`, the new `lineLevelForJobs`), what of
section 8 the turn touched and the questions for Piotr. `docs/art/REQUESTS-T30.md`: L3 (the pallet
of ten wrapped windows standing alone, proposed at 2 by 1 by 1.75 m, 160 by 172, anchor 104, 164,
and the forklift with its driver in four directions, empty and loaded, as one row sheets), whether
the servo press and the second robot are drawn, the line's 90 degree convention, and what to look
for on the hall (the seams, the conveyor at 0.9 m, module 5's clear roof, the boxes at the gate).
