# Notes from Turn 30

One writer, serial, no worktrees: the lead agent made every change under `src/` and `tests/`, every
commit and every push, task by task in the order of the brief's section 5. Sub-agents built the
mockups, measured the sanders' ports, reviewed the diffs and wrote this file and
`docs/art/REQUESTS-T30.md`; none of them committed, and none ran the suite while the lead's check
was running (CLAUDE.md T30 2.0, section 3). This file is what did not fit in `REPORT-T30.md`'s two
lines a task: where each piece of the turn lives, the readings of the brief that were not the only
possible one, what was built for each of chat's choices in section 10, what of section 8 the turn
touched, and the questions left for Piotr. It was written after T30-C5; the scenarios, the cross
check, the pictures and the report (E2 to E5), and the month of the line from the built game, are in
`REPORT-T30.md`.

---

## 1. Where each task lives

| Task | What it built | Where |
| --- | --- | --- |
| A0 | the suite on v88: one red, two comments that said `hover` | `src/render/hall.ts`, the two comments now say `tooltip`; no code changed |
| A1 | v89 | `constants.ts` `APP_VERSION`; the pins in `tests/ui/saveCheck.test.ts` and `tests/ui/version.test.ts` |
| A2 | the seven mockups of section 9 | `docs/mockups/t30/`, with its README |
| B1 | pack 1 of 09.10 | the ten sander files and the three cutter cases in `public/sprites/` and the manifest; `ports.ts` eight lines; the game's `README.md` back; the rest of the pack in `docs/art/pack-0910/` with `EDITED.md`; SPRITES.md 15.1 |
| C1 | the line bought whole; STATE_VERSION 43 | `constants.ts`: `LINE_MODULE_SHARES`, `LINE_PRICE` (their sum), `LINE_MODULES`, `LINE_MODULES_KEPT` `[0, 3, 6]`, `WINDOW_LINE_ORIGIN` (2, 14), `LINE_FACTOR`, `LINE_COVERS` (with `finishing: 5`, `assembly: 6`), `LINE_ROW_TAIL`, `LINE_NAME`, `LINE_DESCRIPTION`, 33 places for modules 5 and 6; `game.ts` `lineBuyCheck`, `placeLineOrder`, the instant purchase, `canSell`, `sellMachine`, `collectSoldMachines`; `layout.ts` `canPlaceBox` (the one placement check `canPlaceSpec` reads too), `lineBox`, `lineSite`, `lineModuleCell`; `machines.ts` `lineItems`, `lineStandsWhole`, `lineLevelForJobs`, `lineContractRuns`, `lineSalePrice`, `productionLineWhere`; `stages.ts` the Finishing on module 5; `catalog.ts` the stand ins; `migrate.ts` `liftToVersion43`, `takeTheLineBack`; `ui/machine.ts` `renderLine`, `lineCard`, `lineLines`, `lineCostLines`; `ui/catalogue.ts` the folder's `from £10,000,000` and `Sell the line for`; the 28 pictures, the manifest and SPRITES.md 15.2 |
| C2 | the line moved as one | `layout.ts` `canPlaceLine`, `moveLine`, `lineGroup`, `LINE_NEVER_TURNED`, `lineNeedsRoom`; `game.ts` the `MOVE_ITEM` reducer records the six, and a module heavy for the move card alone; `ui/app.ts` the guard gone, the ghost's `parts` |
| C3 | the line's own contract, the pallet and the gate | `src/engine/lineContract.ts` (new); `game.ts` `runLineDay` at the end of `startDay`, `runLineMinute` in `advanceMinute`, the offer card's answer, `END_LINE_CONTRACT`; `constants.ts` `LINE_WINDOW_PRICE`, `LINE_MATERIAL_SHARE`, `LINE_WINDOW_MINUTES`, `LINE_PALLET_WINDOWS`, `LINE_PALLET_LAYOUT`, `LINE_CONTRACT_NAME`; `ui/contracts.ts` `lineContractBlock`; `render/hall.ts` the boxes at the gate (`data-line-pallet`) |
| C4 | the sheets and the windows on the pallet | `constants.ts` `MACHINE_WORK_SHEETS`, `WorkSheetFigures`; `render/sprites.ts` `sheetArt`, `playSheets`; `render/hall.ts` `moduleWorks`, `workingArt`, `palletStack`; `ui/app.ts` `clockRuns` and the two calls of `playSheets` (in `runFrame` and at the end of `render()`) |
| C5 | the four upgrades | `constants.ts` `LINE_UPGRADES`, `LINE_UPGRADE_MINUTES`, `LINE_WINDOW_MINUTES_MIN`, `LINE_UPGRADE_DAYS`; `lineContract.ts` `lineWindowMinutes`, `lineUpgradeCheck`, `buyLineUpgrade`, `emptyLineUpgrades`; `game.ts` `BUY_LINE_UPGRADE`; `ui/machine.ts` `upgradeCard` |

The new tests are six files, each with the Skylon Development Ltd header: `t30Contract`, `t30Move`
and `t30Upgrades` under `tests/engine/`, `t30Sheets` under `tests/render/`, and `t30Line` and
`t30Pictures` under `tests/ui/`. One new file under `src/`: `src/engine/lineContract.ts`, with the
header.

## 2. The save

STATE_VERSION 43, once, in C1, written whole so that C3 and C5 needed no second lift.

- **`liftToVersion43`** (`migrate.ts`, the raw lift beside `liftToVersion42`) writes
  `state.windowLine` with every part at its default when a save has none: `{ contract: null,
  nextOfferDay: null, minutes: 0, onPallet: 0, palletsAtGate: 0, upgrades: [] }`
  (`emptyWindowLine` in `lineContract.ts`).
- **`takeTheLineBack`** runs on the whole state after the raw lifts, gated `version < 43`, the road
  `takeTheTimberToolsBack` took in v53. Every module of Turn 29 that stands unsold goes for its
  `purchasePrice`, every order for its `pricePaid`, on one line of the books, `Production line
  refunded: it is sold whole now`. What points at a module taken goes with it: its record in
  `movedItems`, its pipe runs and its place in `gates`. A module
  already sold and waiting for its van is left for the van, which pays its own half the next
  morning, as any machine (`collectSoldMachines` takes the line on one van only when all six go).
- **The card.** `takeTheLineBack` queues one `lineRefunded` card with `queueEvent`, opened at the first
  settle: `The production line is sold whole`; `The line is bought as one now: six modules for
  £10,000,000.`, one sentence a thing taken back in the line's order, and `Your line engineers stay
  on the books.` when any is; one choice, `Right`. A save with nothing taken back gets none.

Fields added: `windowLine` on `GameState`, of type `WindowLineState`, with `LineContract` (`status`
`offered` or `active`, `startDay`, `windowsThisWeek`, `weekStartDay`, `windowsMade`, `revenue`,
`materialCost`) and `LineUpgrade` (`id`, `fittedOnDay`), all in `types.ts`. Kinds added:
`lineRefunded` and `lineContractOffered` on `GameEventKind`; `END_LINE_CONTRACT` and
`BUY_LINE_UPGRADE` on the actions. Nothing else of a save is touched: no job, man, machine, board,
price or place; the engineers, the five axis CNC and the robot stay.

## 3. Readings of the brief

These are the choices the code made beyond the brief's own figures and section 10, each marked
[TUNE] in the code.

- **On the books** (`engineersOnTheBooks`, `lineContract.ts`) is two line engineers hired and started,
  in today or not, so a day off does not stop the offer; the line's minute asks two on duty.
- **The offer taken** runs only while the line still stands whole at the click; otherwise the answer
  is as `Not now`, and it is offered again a week on.
- **The end** (`endLineContract`) sends a part pallet to the gate, drops the minutes of the window in
  hand, and sets the next offer a week on; an offer still waiting for its answer goes too.
- **The week's count** starts again at the first working open of a new calendar week (`weekOfDay`).
- **The pallets at the gate** are cleared first thing in `runLineDay`, at every working open, before
  the offer is asked.
- **An upgrade counts** from the open of the day it is fitted on, and `lineWindowMinutes` asks it at
  every minute. The week's windows the block prints are `lineWindowsAWeek`, five days of 480 minutes
  over the window's minutes, rounded down: 20, 22, 26, 32 and 40 at 120, 105, 90, 75 and 60.
- **The Output sheet and the plate** read `Production line, standing still` in place of `0 modules`
  while no engineer is on duty, and `Production line, on its contract` while it runs; what the line
  acts on reads `timber work` from the level module 5 sprays at, and `timber work, the Finishing
  excepted` below it (`productionLineWhere`).
- **The move.** A module counts as heavy for the move card's question alone (`Moving 6 machines takes
  6 h`), its delivery still built in with no unloading [TUNE: chat]. A man standing at a module moves
  with it. The ghost is the 36 by 3 with each module drawn in it.
- **The books of a purchase.** The order books `Window production line ordered`; the instant purchase
  the tests use books `Window production line`. Both once, for `LINE_PRICE`.
- **The refusal for want of floor** is built from the line's own box (`metresBy(lineBox(...))`), so
  its words follow the line's size: `No free 36 m by 3 m in the hall`, and in setup mode `The line
  needs a clear 36 m by 3 m`.
- **The line's card's own sentence** (`LINE_DESCRIPTION`) is Claude's, read off the six pictures; the
  module sentences are the brief's.
- **The two new kinds of file** needed no teaching under `src/`: no code reads the manifest by
  pattern, and every picture is picked by its exact name. The two tests that count by name
  (`rotate.test.ts`, `spriteClasses.test.ts`) now say so (REPORT-T30.md, C1).

## 4. What chat decided, and what was built (CLAUDE.md T30 section 10)

1. **The shares of the 10 million.** Built: `LINE_MODULE_SHARES` 2,000,000, 2,500,000, 1,250,000,
   1,250,000, 1,500,000 and 1,500,000; `LINE_PRICE` their sum; one ledger line for the order,
   `Window production line ordered`.
2. **The catalogue through module 1's folder.** Built: one folder, `Production line`, `from
   £10,000,000`; one card, the line's (`renderLine`), with the four upgrade cards under it; modules 2
   to 6 have no folder and keep their Owned tiles.
3. **The place, the move, the turn.** Built: the first clear 36 m by 3 m from x 2, y 14 (`lineSite`),
   else cell by cell; moved as one in setup mode (`canPlaceLine`, `moveLine`), refused `The line
   needs a clear 36 m by 3 m`; a turn refused `The line is never turned`; a move counts as six
   machines and six hours; `Put them back` puts the six back.
4. **Sold whole for half.** Built: `Sell the line for £5,000,000` on every module's tile; all six
   marked sold for the next working day; one van, one line (`Sold: Window production line`), one
   card (`Window production line collected`); the upgrades emptied for nothing and a running
   contract ended at the sale.
5. **Without a contract.** Built: the Finishing on module 5 and the Glazing (`assembly`) on module 6
   (`LINE_COVERS`); `LINE_FACTOR` to 2.4, and on the Finishing while module 5 does it; 33 places for
   modules 5 and 6; 18 per cent of the boards with the line standing whole (`LINE_BOARD_SAVING` 3 a
   module), none for a job taken while the contract runs. Nothing written for the lacquer's night,
   which stands as it stood, nor for the spray booth, which is still asked for every window.
6. **The contract, a record of its own.** Built: `state.windowLine.contract`, never one of
   `state.contracts`, drawing nothing off the seeded stream; offered by the `lineContractOffered`
   card at the end of `startDay` once the six stand and two engineers are on the books; again a week
   after `Not now` or an end; no client's name, no week to meet, no term; ended at one click with `End
   it` on the Contracts tab's block.
7. **A window with two engineers on duty, by day, on the line's own minute.** Built:
   `lineMakesWindows` asks a working day, not the dinner hour, not after five, nothing being moved,
   and `lineLevel` at six; none on the second shift; `runLineMinute` runs beside the men's minute and
   books nothing to any man or machine.
8. **The money of a window.** Built: £1,500 in on the contract line and £600 out on the material line
   (`lineMaterialPerWindow`, the price times `LINE_MATERIAL_SHARE`), each one growing line a day, the
   material past the overdraft floor.
9. **The pallet at the gate.** Built: one box a pallet at `LINE_PALLET_LAYOUT` (x 0, y 10), two at the
   most, with the label `Windows for collection: N pallets`; taken at the next working open with no
   ledger line; a part pallet sent at the end.
10. **The four upgrades.** Built: `LINE_UPGRADES` at 400,000, 300,000, 500,000 and 600,000, 15 minutes
    each, fitted 10 working days after the order, the contract's windows only, not kit, not insured,
    not drawn; refused `Needs the production line`, `Being fitted: ready on <day>`, `Fitted`, `Not
    enough cash`.
11. **The money.** Chat's arithmetic at Piotr's figures was about 36,300 a month at 120 minutes, about
    23 years to pay back the line, and about 113,500 a month at 60 minutes with the four upgrades,
    about 9 years for 11,800,000, both less about 33,300 a month with the property cover held. For the
    built game's figures, see REPORT-T30.md, the section on the month of the line.
12. **The sheets.** Built: `moduleWorks` plays a module only while the clock runs (`clockRuns`), and
    then all six in the contract's window minutes, or without the contract a module a man is drawn
    at; 6 frames a second of real time at any speed, in step; held the moment the clock stops;
    `playSheets` after every frame and every page written; module 6's overlay `stack01` to `stack09`;
    `stack10` not drawn.
13. **The lift.** Built: Turn 29's modules taken back at what they cost, on one ledger line, with the
    `lineRefunded` card; a module already sold left for its van (2 above).

## 5. How to read the line from Turn 30

Turn 29's two numbers stand, and a third sits on top of them.

- **`lineModules(state)`** (`machines.ts`) is unchanged: the unbroken run from module 1 of modules
  standing, not sold. With the line bought and sold whole it is 6 or 0. **`lineStandsWhole`** asks it
  at six, and is what the board's stand ins, the boards saved, the offer and the upgrades' check
  read.
- **`lineLevel(state)`** is unchanged: `LINE_MODULES_KEPT[n]` for the n engineers on duty, 0, 3 and
  6, never more than `lineModules`. It is what the engineers' tile, the strip, `familyRuns` and the
  contract's minute read (the line makes a window only at six).
- **`lineLevelForJobs(state)`** is new: nought while the line's contract runs, and `lineLevel`
  otherwise. `lineModuleFor`, `lineFactor` and `productionLineWhere` read it, so while the contract
  runs no stage of any job is on a module, the factor is 1 and the Output sheet says so.
- **The stand ins** (`stoodInFor`, `catalog.ts`) ask `lineStandsWhole` and that the contract is not
  running, whatever the engineers keep today: so a day off never locks the board, and while the
  contract runs a window job wants the company's own machines, and its tile names the missing ones.
- **The pace.** `stageSpeed` multiplies `lineFactor` onto every stage of a timber job, the stages the
  line does not cover among them, and onto the Finishing only while module 5 does it. With one
  engineer (level 3) the Cross cutting, the Planing, the Moulding and the Sanding are on modules 1 to
  3; the Pressing is at the press and the Glazing at the bench; all of them at 1.8, and the Finishing
  at the booth with no factor.

## 6. Section 8, and what of it this turn touched

- **The money of the line, its property cover, the second shift, more upgrades past one an hour,
  drawing the upgrades, the line turned, module 5 in place of the booth.** All parked and none built:
  the knobs are constants (`LINE_WINDOW_PRICE`, `LINE_WINDOW_MINUTES`, `LINE_MODULE_SHARES`), the
  insurance's rate is untouched, the line's minute runs by day only, `LINE_WINDOW_MINUTES_MIN` is 60,
  the modules are drawn as the art side drew them, a turn is refused, and the booth is still asked.
- **The forklift's trip and the pallet standing alone (L3).** Not drawn; the boxes at the gate stand
  in. Asked of the art side in `docs/art/REQUESTS-T30.md` 1 and 2.
- **The tax and an order called off.** Still closed for the line (built to order) and the five axis
  CNC only.
- **A figure for the engineer, the products on the hall, the stores drawn empty.** Still parked; on
  `docs/art/REQUESTS-T30.md` 6.
- **The rest of Turn 29's list and v88's engine minute at 100x** are unchanged. Nothing of
  `crewByFamily`, `MAX_CATCH_UP_MS`, the paced redraw or the sprite cache headers was touched beyond
  the two calls of `playSheets`.

## 7. Open questions for Piotr

- **The money of the line.** At his figures the line pays back slowly: chat's sums made it about 23
  years at a window every two hours and about 9 with the four upgrades. The built game's month, at
  120, 105, 90, 75 and 60 minutes a window, is in REPORT-T30.md, the section on the month of the
  line. The knobs: the window's price, its minutes, the line's price, and the second shift.
- **The property cover on 10 million.** About 33,333 a month if the company holds it (2 per cent a
  year, twice in the 800 m² unit), as for any kit; unchanged tonight. Whether the line should carry
  a rate of its own is his.
- **Module 5 in place of the booth**, so that a company with the line needs no booth for its windows.
  Left out because the booth is where a window's Finishing goes back to when the line is short of an
  engineer or on its contract.
- **The line on the second shift.** The engineers work by day, so the line's contract makes no window
  at night; a second shift for the line would double its windows.
- **The line turned.** Its 90 degree pictures are the other turn (`docs/art/REQUESTS-T30.md` 4), so a
  turn wants six new views.
- **From the art side's page**: whose forklift carries the pallet and who drives it, how a part
  pallet is drawn, and whether the servo press and the second robot are drawn
  (`docs/art/REQUESTS-T30.md` 1.4, 2.4 and 5).
- **Chat's choices of section 10** (4 above) all stand as built until he says otherwise.

## 8. What the work found and left

- **The boxes at the gate** stand 1.75 m high at y 10, in front of the finished goods (y 9) and over
  the start of their label, `At the gate: N` (the mockup of the hall shows it). L3's pallet in the
  same place would do the same; where the labels hang is the code's.
- **Module 5's clear roof** is part transparent (about 11,000 pixels, 4,033 of them at 20 per cent),
  so what the hall draws behind it shows through. To be read in E4's pictures.
- **Without the contract** one module can play its sheet beside a still one, since a module plays
  only while a man is drawn at it; the art side made the six to be seen in step.
- **The mockups' HTML pages** of the hall, the tab and the drag point at `public/sprites/` since C1;
  their lead paragraphs still name `docs/pictures-t30/`, as written when shot.
- **Kit standing within two metres behind a module** can still be painted over it, as behind any long
  machine (Turn 29's note). The modules are 3 m high from tonight, half a metre taller.
- **A man walks round the line** by its two ends of two metres in a 40 m hall; kit standing at an end
  can cut the front off. E4's pictures show the walk.
- **`tests/ui/app.test.ts`** plays the game in real time and fails under a heavy load on the machine,
  as Turns 28 and 29 found. Nothing of tonight touches it.
