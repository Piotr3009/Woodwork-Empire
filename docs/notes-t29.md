# Notes from Turn 29

One writer, serial, no worktrees: the lead agent made every change under `src/` and `tests/`, every
commit and every push, task by task in the order of the brief's section 5. Sub-agents built the
mockups, measured the five axis CNC's ports, reviewed the diffs and wrote this file and
`docs/art/REQUESTS-T29.md`; none of them committed, and none ran the suite while the lead's check
was running (CLAUDE.md T29 2.0, section 3). This file is what did not fit in `REPORT-T29.md`'s two
lines a task: where each piece of the turn lives, the readings of the brief that were not the only
possible one, what of section 8 the turn touched, and how to read the line before touching it. It
was written after T29-C7; the scenarios, the cross check, the pictures and the report (E2 to E5)
are in `REPORT-T29.md`.

D1, the logo, was skipped whole: `docs/logo-incoming/` is not on main, so none of the four places
of 2.13 was touched and the mockups have no page (7).

---

## 1. Where each task lives

| Task | What it built | Where |
| --- | --- | --- |
| B1 | the glass the next working day; the timber deadline three days on | `constants.ts`: `GLASS_DELIVERY_WORKING_DAYS` 1, `TIMBER_STANDS` moved in from `jobs.ts`, `TIMBER_LEAD_DAYS` written as their sum |
| B2 | one cutter set of a kind | `game.ts` `canBuy`, the `CUTTER_SETS` refusal beside the tool changer's |
| B3 | four joiners to a contract; STATE_VERSION 42 | `contracts.ts`: `contractCrewFull`, `contractCrewFullLine`, `contractCrewLine`, `contractAssignCheck`, `contractMenNeeded`, `contractHallCapacity` (`capped`), `contractHallLine`; `ui/contracts.ts` for both tabs; `migrate.ts` `liftToVersion42`; `text.ts` `inWords` |
| C1 | the 22 pictures | `public/sprites/`, the manifest, `docs/art/SPRITES.md` 13, `tests/ui/t29Families.test.ts` |
| C2 | the unit a spec names; a ladder of three; where a timber stage is done; stand ins; the five axis CNC | `types.ts` `minUnitM2`; `canBuy`; `stages.ts` `stageFamilyIn`, `cnc5Runs`, `stageSpeed`; `catalog.ts` `missingEquipment`, `wantedKit`, `wantedName`, `stoodInFor`; `constants.ts` `TIMBER_STAND_INS`, `CNC5_VARIANTS`, `CNC5_STAGE_FACTOR`, `BIG_KIT_UNIT_M2`, `BUILT_TO_ORDER`; `ports.ts` six lines; `orders.ts` and `ui/shopping.ts` for the order that is not called off |
| C3 | the spraying robot | `constants.ts` `SPRAY_ROBOT`, `SPRAY_ROBOT_FINISH_FACTOR`; `machines.ts` `sprayRobotRuns`, `onTheMachineSheets`; `stageSpeed`; `ui/machine.ts` its own card line |
| C4 | the line engineer | `types.ts` `WorkerRole`; `constants.ts` his hire spec, `LINE_ENGINEER_MONTHLY_WAGE`, `LINE_ENGINEERS_MAX`; `staff.ts` `hasALine`, `lineEngineers`, `carriedByAManager`, `NEVER_ON_THE_HALL`; `usage.ts` `USAGE_TRADES`, `NOBODY_WORDS`; `ui/spriteCheck.ts` `CHARACTER_ROLES` |
| C5 | the line, and what it costs to own | `constants.ts` `LINE_MODULES`, `LINE_MODULES_KEPT`, `LINE_COVERS`, `LINE_FACTOR`, `LINE_BOARD_SAVING`, `WINDOW_LINE_ORIGIN`, `LINE_MODULE_POWER_PER_DAY`, the `line` tab; `machines.ts` the line's functions (section 4 below), `classPaceOf`, `isServiced`, `overdueBreakdownChance`, `productionLineLine`; `game.ts` `lineModuleCell`, `lineModuleFloorCheck`, `laterModuleHeld`; `layout.ts` `LINE_STANDS_WHERE_BUILT`; `materials.ts` `boardsForJob`; `insurance.ts` `lineValue`; `security.ts`; `warnings.ts` `lineNeedsEngineer`; `render/hall.ts` the `(service due)` label |
| C6 | the timber stores | `machines.ts` `boardCapacityOf`, `boardsHeld`, `sheetsOnCounter`, `boardRoom`, `freeBoardRoom`; `materials.ts` `isBoards`, `canUnload`, `stockFree`, `unloadIntoStock`, `boardsOnStore`, `boardsLine`, `loadWords`; `stations.ts` `unloadFarStation`, `firstTimberRack`; `board.ts` `enquiryBoards`, `storesHoldCheck`; `jobs.ts` `dropJob`; `warnings.ts` `boardsAtTheGate`; `ui/materials.ts` the `Timber boards` row |
| C7 | windows and doors as standing contracts | `constants.ts` the three pieces, `CONTRACT_TIMBER_WEAR_FAMILY`; `contracts.ts` `pieceStaged`, `timberReferencePace`, `contractFamiliesOf`, `contractRoundOf`; `board.ts` `timberOnTheBoard`; `drawn.ts`; `text.ts` `pluralOf` for the contract's name |

The new tests are seven files, each with the Skylon Development Ltd header: `t29Contracts`,
`t29Kit`, `t29Engineer`, `t29Line`, `t29Stores` and `t29TimberContracts` under `tests/engine/`, and
`tests/ui/t29Families.test.ts`. No new file was made under `src/`.

## 2. The save

STATE_VERSION 42, once, in B3. `liftToVersion42` in `migrate.ts` does two things to a v41 save and
nothing else. A running contract with more than four on it keeps the first four of `assigned` (the
order they were put on), and every man taken off has his `contract:` marker cleared from `jobId`,
so the lists of free men see him from the first minute. And a glass `ordered` for a day later than
the next working day is brought forward to it. Of the brief's two ways of telling the player, the
lift takes the smaller: it pushes a whole `contractsTrimmed` event onto `eventQueue` itself, with
the next id, and the first settle opens it as it opens any queued event. A save in which nobody
was taken off gets no card.

Fields added, all optional so that no save needs them: `minUnitM2` on `EquipmentSpec`;
`boardCapacity` on `EquipmentSpec` and `EquipmentVariant`; `boards` on `Delivery` (a load of a save
without it is read from its job, `isBoards`); `timber` on `ContractPieceSpec`. Kinds added:
`lineEngineer` on `WorkerRole`, `line` on `EquipmentTab`, `contractsTrimmed` on `GameEventKind`.

## 3. Readings of the brief

The brief's own figures, and chat's [TUNE: chat] choices among them, are gathered in its section 10
and repeated in the report. These are the choices the code made beyond them, each marked [TUNE] in
the code.

- **The board asks the stores' room only once a store stands.** `storesHoldCheck` (`board.ts`)
  passes while no store stands, so a company with none reads `Needs timber store` and never `19
  boards, and the timber stores hold 0`.
- **The `Timber boards` row** of the Materials page is shown once a store stands or a board is
  held, and not before (`ui/materials.ts`, [TUNE: when]).
- **The engineer's words.** Our team's line for a company with none: `Nobody. The line does not run
  without one.` His tile's sentence while no module stands yet: `The line is not built yet.` His
  work column while his module is on order: `waiting for the line`. His tile is last on Our team,
  after the manager's.
- **The engineer's minute** at the line is booked under the desk's band, the band of a man who makes
  nothing with his hands; only the bands' sum is ever read (`usage.ts`). His full week is read in
  the band `fine` and never `full`, so his tile never asks for a second man in the near full amber.
- **Who may hire him.** `hasALine` asks module 1 alone, owned or on order: modules are ordered in
  sequence and sold from the end, so module 1 stands or is on order whenever any does.
- **A count in words.** `inWords` says the counts of a sentence in words to twelve and the figure
  past it: `four joiners`, `three modules`.
- **A window or a door on a contract** is a solid wood, lacquered timber `StagedJob` of labour value
  1 (`pieceStaged`). Solid wood and never sheet, so the sheet CNC never halves its bench stage.
  Its men go round every family of the plan in the order of its stages, a stage with no machine at
  the bench; the Glazing is at the bench, so the round is never empty (`contractRoundOf`).
- **The five axis CNC's ports** are Claude's measurements off the six pictures, marked [TUNE until
  Piotr confirms them on the hall]. The standard class is an open gantry with no duct stub drawn,
  so its line ends at the middle of the top of the head's carriage.
- **The catalogue's sentences** of the robot, the five modules and the two stores are Claude's,
  written off the pictures; the five axis CNC's three are the brief's. Module 1's card builds
  `Needs a five axis CNC and a frame press beside it` from its own `requires`.
- **The Work Plan's list**: the click that puts the fourth man on a contract also shuts the list, so
  Escape is not swallowed by a list that no longer has a man to offer.
- **The robot's delivery** is a month and the five axis CNC is heavy kit unloaded as the CNC is:
  both from the brief, marked [TUNE] where they are written.

## 4. How to read the line

Everything of the line hangs off two numbers, and every reader asks one or the other.

- **`lineModules(state)`** (`machines.ts`) is how long the line is: the unbroken run from module 1
  of modules that stand on the floor, not sold. Modules 1, 2 and 4 standing are 2. What the
  engineers keep today does not shorten it. It is read where the line is a thing the company owns:
  the board's stand ins, the boards saved on a job taken, whether an engineer is `at the line`, his
  tile's sentence, and whether the Output sheet has a line for the line at all.
- **`lineLevel(state)`** is how much of that run runs today: `LINE_MODULES_KEPT[n]` for the n
  engineers on duty (0, 3 and 5, the last for two or more), never more than `lineModules`. On duty
  is started and not absent, and it holds for the second shift. It is read where the line does
  work: what each module covers, the factor, the strip's line and the label on the two sheets.
- **`LINE_FACTOR[level]`** is 1, 1.4, 1.6, 1.8, 2.1 and 2.4 for levels 0 to 5, read through
  `lineFactor(state)`. `stageSpeed` multiplies it onto every stage of a timber job but the
  Finishing, the stages the line does not cover among them. A job made by hand returns before it is
  read and feels none of it.
- **`LINE_COVERS`** gives each stage its module's place: the Cross cutting and the Planing 1, the
  Moulding 2, the Sanding 3, the Pressing 4. `lineModuleFor(state, stage)` answers the module while
  its place is within the level, and null otherwise.
- **`stageFamilyIn(state, job, stage)`** (`stages.ts`) is the one answer to where a stage is done.
  A sheet job is asked of `familyForStage`, as on v83, whatever stands. A timber job is asked, first
  that applies: the line's module (`lineModuleFor`), the five axis CNC for the Moulding while one
  runs (`cnc5Runs`), and `familyForStage`. `familyForStage` and its two arguments are untouched.
  `stageSpeed` and `stagePlanFor` read it, and through them `jobPace`, `crewAtFamily`, `drawnPlaces`,
  the Work Plan and a timber contract's piece.
- **The pace of a covered stage** comes out of `stageSpeed` on its own: `classPaceOf` answers
  `MACHINE_PACE.industrial` (1.12) for a module, so a covered stage is `LINE_FACTOR` times 1.12, and
  the Moulding on module 2 (or on a five axis CNC) is `CNC5_STAGE_FACTOR` times the hall's pace at
  it times the factor.
- **`TIMBER_STAND_INS`** (`constants.ts`) is the board's one table of who stands in for whom: module 1
  for the cross cut saw and the planer; the five axis CNC or module 2 for the spindle moulder;
  module 3 for the sander; module 4 for the frame press; and each timber store for the other. It is
  read by `stoodInFor` in `catalog.ts` for a timber product only. The CNC and the stores stand by
  `has`; a module stands while its place is within `lineModules`, never `lineLevel`, so an
  engineer's day off never locks the board. The words never change with a stand in: a lock names
  only what is missing with nothing in its place, and the tile's `Needs` line prints `wantedKit`
  whole, with `timber store` last.

**What the line does when it stands still.** At level 0 every stage goes back to `familyForStage`
or to the five axis CNC, at the old machines' pace or by hand. `productionLineLine` still answers
for a line that stands, so the Output sheet and the top bar's plate read `Production line, 0
modules` at nought while the strip's `lineNeedsEngineer` says why. That is how the code reads
today; E4's pictures show whether it wants hiding.

**One counter, read two ways.** The engine keeps one figure for sheets and boards,
`state.stock.sheets`, and from tonight reads it twice (`machines.ts`, `materials.ts`):

- `boardsHeld` is what the timber jobs that are not finished hold (`sheetsReserved`). A board is
  never free stock, so this is every board in the workshop.
- `sheetsOnCounter` is the counter less `boardsHeld`, never below nought: the sheets.
- `boardRoom` is what the timber stores that stand hold between them, and `freeBoardRoom` that less
  `boardsHeld`.
- From those: `stockFree` (the racks' room, counted without the boards), the sheet line of the
  Materials page, the Low stock card and the rack's sale read sheets only; `boardsOnStore` spreads
  the boards over the stores in the order bought, the last taking any overflow, so a store's plate
  can read over its figure as a rack's does; `canUnload(state, delivery)` asks a load of boards for
  `freeBoardRoom` of the whole load, and a load of sheets for a rack, as it always did.

Anything new that counts stock asks which of the two it means. A second counter would be the
simpler code and is forbidden (CLAUDE.md T29 section 6).

## 5. Section 8, and what of it this turn touched

- **The tax and an order called off.** Closed for the five modules and the five axis CNC only
  (`BUILT_TO_ORDER`, `Built to order: it cannot be called off`). Every other machine is still
  refunded in full until the lorry comes.
- **The night's breakdown roll.** `overdueBreakdownChance` is nought for a module, so the line never
  breaks by day or at night. A workbench can still break down at night once 180 days have passed:
  the roll still asks nothing of what kind of kit it is. The hall's `(service due)` now asks
  `isServiced`, so benches, racks and cabinets lost the false label; their night roll is unchanged.
- **A dropped job's load at the gate.** Mended for boards only: `dropJob` takes a timber job's boards
  off the counter and its loads not yet unloaded off the road and the gate. A sheet job dropped with
  its load at the gate still leaves it there for ever.
- **Four men on a window in a hall of standard timber machines** are still short at five families
  at once. A timber contract's four men are counted against every family of the plan
  (`contractFamiliesOf`) and do the same.
- **The booths a company with the line needs.** Untouched: the Finishing is at the booth at every
  level, and every man on timber is counted against the booths' places.
- **The spraying robot's life** does not run down: nobody stands at it, so no hours are booked to it.
- **A man walked out to the shelter.** Not done: with a shelter and no rack, the man unloading boards
  stays at the gate (`unloadFarStation`).
- **The stores drawn empty, the products on the hall, a figure for the engineer, Turn 28's stand
  ins and sanders.** All in `docs/art/REQUESTS-T29.md`.
- **The day summary's word for tomorrow's boards** still says `sheets`.
- **The spindle moulder's places** stay 2, 4, 4, 6 and 8. A five axis CNC takes the Moulding off them
  for a timber job; a sheet job's Moulding stays at the moulder.
- **The line's 5 million and the second engineer** were built as chat read them: the whole line at
  1.5, 0.75, 0.75, 1 and 1 million, one engineer for three modules and two for five.
- **A robot for each booth** was not built: one for the hall.
- **Timber bought ahead, and a contract on the company's own timber**, were not built: a timber
  contract's timber and glass are the client's, and nothing is ordered for it.

## 6. What the work found and left

- **An old save's greyed timber enquiry** drawn with the old twelve days now has three taken off for
  its hands, and may turn takeable at the next settle. The days are stored and read as stored, so
  the enquiry keeps its deadline (B1).
- **The hall line of a contract's offer** read a pace that the shortages had taken below nought as
  full pace (`speed > 0 ? speed : 1`). It now takes the floor, as the minute does. A sheet piece's
  pace never goes below nought, so its figures do not move (C7).
- **Boards a v41 save has in the paid store** come back at the morning's fetch, as they always did.
  Until then the plates read high by them, and a count of sheets is never printed below nought.
- **Two loads of boards begun in the same hour** can leave a store over its figure until a job
  draws; the plate says so, as a rack's does.
- **The mockups' HTML pages** point at `../../pictures-t29/`, which C1 moved into `public/sprites/`.
  The pages now show empty boxes where the new kit was; the PNGs beside them keep the pictures as
  they were shot.
- **Kit standing within two metres behind a module** can be painted over it, as behind any long
  machine. Known, and not mended (CLAUDE.md T29 2.9.3).
- **`tests/ui/app.test.ts`** plays the game in real time and fails under a heavy load on the
  machine, as Turn 28 found. Nothing of tonight touches it.
