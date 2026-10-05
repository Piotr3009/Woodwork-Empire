# Report, Turn 29: the production line, the five axis CNC, the timber stores, and four to a contract

Woodwork Empire, Turn 29. Built against `CLAUDE.md` of 05.10.2026 (first line "Turn 29").
Branch `turn-29-the-line` off `5b05355`, the tree `origin/main` stands on (v83, STATE_VERSION 41).

## The tasks

**T29-A0 The suite on v83.** On main as it stands `npm run check` is green on its own exit code:
lint, the build and 2,652 tests in 278 files, none failing and none skipped, so nothing moved and
nothing was changed; no commit.

**T29-A1 Housekeeping and v84.** `docs/turn-28-brief.md` was already in `docs/` and `CLAUDE.md` is
this turn's brief (first line "Turn 29"), so nothing was moved; the README names the Turn 28 brief,
`REPORT-T29.md` and `docs/art/REQUESTS-T29.md`. `APP_VERSION` goes v83 to v84 with the two tests
that name it flipped (`version.test.ts`, `saveCheck.test.ts`); `STATE_VERSION` is B3's.

**T29-A2 The mockups.** Six pages of section 9 into `docs/mockups/t29/` with a README, each the
game's own markup by its own renderers beside the same screen today: four to a contract and the
trimmed save's card; the five axis CNC and the robot; the Production line tab; the engineer and the
strip; the timber stores; the sash window contract. (7), the logo, is not drawn: no
`docs/logo-incoming/` on main.

**T29-B1 The glass the next working day.** `GLASS_DELIVERY_WORKING_DAYS` is 1 [PIOTR, 05.10], and
`TIMBER_LEAD_DAYS` is written as `GLASS_DELIVERY_WORKING_DAYS + Object.keys(TIMBER_STANDS).length`,
3, with `TIMBER_STANDS` moved from `jobs.ts` into `constants.ts`; the comments and the three test
literals (10, 12, 12) say so, and the glass's "day before it is due" half flipped to "ordered today,
in at the next working day's open". A greyed timber enquiry of an old save drawn with +12 now has 3
taken off for its hands and may turn takeable at the next settle (stored days, read as stored).

**T29-B2 One cutter set of a kind.** `canBuy` refuses a cutter set of a kind the company has or has
on order, in the tool changer's shape (owned and not sold, plus on order), with `One set serves
every moulder`; the card shows its locked `Buy another` and the words under it with no change to the
card, and a save that holds two keeps both. Asserted in `t28Families.test.ts`, owned and on order.

**T29-B3 Four joiners to a contract, and STATE_VERSION 42.** `CONTRACT_MAX_JOINERS` 4 [PIOTR,
05.10], asked in `contractAssignCheck` after the man's own check and passed by a man already on it,
so a full contract always lets a man off and a refused mover stays where he was; `contractCrewLine`
puts `On it` on both tabs, the Orders board locks a free man's `Put on it` with `A contract takes
four joiners at the most`, the Work Plan puts that reason in place of `Assign to this contract` and
never draws the list for a full contract (and the click that fills it shuts the list, so Escape is
not swallowed); `contractMenNeeded` is four at the most, and the hall line counts the four of the
highest rate with four at the machine and reads `with four on it` for a company of more than four
(v83 to the figure at four or fewer). The lift to 42 trims a running contract to the first four,
frees the rest and queues `contractsTrimmed` for the first settle; it brings a glass on its way
forward to the next working day. `contractHall.test.ts` restated for six joiners: 144 to 104, 144
and 180 to 104 and 128, 162 and 144 to 128 and 104, 156 and 168 to 112 and 128.

**T29-C1 The 22 pictures.** `git mv` from `docs/pictures-t29/` into `public/sprites/`, the
manifest regenerated (280 pictures), the folder and its JSON gone, `docs/art/SPRITES.md` section 13
written (the table, why the names changed, the shelter's two views, module 1 drawn with no saw, the
stores drawn full). The two pins of turned files go 96 to 107; the measured class count moves as
each family lands. No pixel touched. `tests/ui/t29Families.test.ts` holds the 22 on disk.

**T29-C2 The unit a spec names, a ladder of three, where a timber stage is done, stand ins, and
the five axis CNC.** `minUnitM2` on a spec, refused in `canBuy` straight after the reputation with
`Needs the 800 m² unit`. A ladder family is an unbroken run of `CLASS_ORDER` of two or more
(`variants.test.ts` and `machine.test.ts` flipped by name), `TIPS.catalogue` reworded.
`stageFamilyIn(state, job, stage)` beside `familyForStage` (untouched) answers a timber job's stage
off the hall, and `stageSpeed` and `stagePlanFor` read it, so the plan, the places, the men drawn
and the Work Plan follow. `TIMBER_STAND_INS` is the one table of stand ins; `missingEquipment` reads
it for a timber product only, and the tile's `Needs` line prints the one `wantedKit` list whole.
`cnc5` in every side table, its six ports measured off the pictures, its card line from
`CNC5_STAGE_FACTOR`, its order built to order (`BUILT_TO_ORDER`, `Built to order: it cannot be
called off`). Pins: the CNC centre tab, ports 37 to 40 and 84 to 90, measured classes 96 to 99, the
catalogue's metres; the two buy-everything tests pass over what the 200 m² unit refuses for its
size.

**T29-C3 The spraying robot.** `sprayRobot`, one class, 120,000, 30 working days, 8 a day, 2 by 1
by 2.25 in a zone of 3 by 2, `requires: ['sprayBooth']`, carried in, no places, nought dust, no
extraction, air or ducting of its own. `SPRAY_ROBOT_FINISH_FACTOR` 2 is written once, in
`stageSpeed`, on the Finishing at a booth that runs while a robot stands that is not broken or away
(`sprayRobotRuns`); a lacquered sheet job's Finishing feels it and nothing else of it moves. A second
is refused with `The hall has its spraying robot`. Its card's own line stands in place of Output;
it has no line on the Output sheet and no row in `machineSavings` (`onTheMachineSheets`). Pins:
measured classes 99 to 100, `hallItems` 23 to 24 (it found its 3 by 2 on the 200 m² floor).

**T29-C4 The line engineer.** `lineEngineer`, one grade, 15,000 a month [PIOTR], no reputation
asked, hired on the Workshop tab by the tile every role has, his two refusals in `hiringOptions`
before the bank's line: `The company has no production line` while no module stands or is on order,
`Two engineers keep the whole line` at two. He is on `ROLE_WORDS`, `ROLE_WORDS_MANY`,
`NOBODY_WORDS`, `TRADE_OF_ROLE`, `USAGE_TRADES`, `CHARACTER_ROLES` and `NEVER_ON_THE_HALL`, and
`menCarried` and Our team's `carriedBy` pass over him through one predicate. Nobody can hire him yet:
his tile stands refused until C5 lands the modules. Pins flipped by name: `boothJoiner.test.ts` (the
set of roles), `spriteCheck.test.ts` (`CHARACTER_ROLES`), `capsule.test.ts` (the roles with no
figure, and never drawn), `team.test.ts` (the Workshop tab's candidates) and `v72.test.ts` (Our
team's tiles, not in the brief's list).

**T29-C5 The production line, and what it costs to own.** Five families `windowLine1` to `5`, one
class each, 6 by 3 by 2.5 in their own footprint, in the twelfth tab `Production line`, 1,500,000,
750,000, 750,000, 1,000,000 and 1,000,000, thirty working days each, sixty a day of power, only in
the 800 m² unit. `canBuy` asks the unit, what each requires (module 1 a five axis CNC and a frame
press), one of each (`The line has this module`), the cash, then its own cells (`Move the four
sided planer and the sheet rack off the line's 6 m by 3 m`, or the half shifted refusal), and
`anchorFor` stands module N at x 5 + 6 (N - 1), y 14. Never moved or turned (`canPlace`, both
branches; no Turn row; setup mode does not lift it), built in on its day, sold only from the end.
`lineModules` (the unbroken run) and `lineLevel` (what one or two engineers on duty keep: 3 and 5);
`stageFamilyIn` asks the line's module first, `classPaceOf` answers the industrial pace for a
module, `stageSpeed` multiplies every timber stage but the Finishing by `LINE_FACTOR` and the
Moulding on module 2 by four as well; 33 places a module for 1 to 4. One `boardsForJob` count for
the tile and the job, 3 per cent fewer boards a module. The modules' cards say what they cover;
the Output sheet and the top bar's plate carry one `Production line, N modules` line; no module on
the Machines page or in `machineSavings`. Not serviced, never broken down by day or night, never a
burglar's target, out of the security firm's price (the Security page says so in one clause),
insured like everything, built to order. The engineer is hired from here (`at the line`, his week
booked as worked, his Our team sentence `The line runs as 3 of its 5 modules.`), and the strip's
`lineNeedsEngineer` sits directly under `nobodyAssigned`. The hall's `(service due)` asks
`isServiced`, so a bench, a rack or a cabinet older than 180 days no longer carries it. Pins: the
eleven tabs to twelve, `WARNING_ORDER` and its all at once list, the catalogue's metres, measured
classes 100 to 105.

**T29-C6 The timber stores.** `timberRack` (40 boards, 1,200, 3 days, on the floor) and
`timberShelter` (400 boards, 18,000, 15 days, on the apron at its first cell x 0, y 1, refused with
`No room on the apron`), each a `boardCapacity` and never a `sheetCapacity`. One counter read two
ways: `boardsHeld` (what the timber jobs hold) and `sheetsOnCounter` (the rest), so the sheet racks'
plates, `stockFree`, the Materials page's sheet line, the Low stock card, the rack's sale and the
contract man's mark count sheets only, and a store's plate and the new `Timber boards` row count
boards. A load is marked `boards` when it is ordered for a timber job; `canUnload` asks by its kind,
and boards come off whole onto the stores or wait at the gate, never into the paid store; the card
of a load that cannot come in is raised whoever unloads, `startTaskCheck` asks the room before the
labourer, `boardsAtTheGate` sits under `glassNotOrdered`, and the pallet drawn is the first load that
can come in. The man unloading boards walks to the first timber rack, and stays at the gate with
only a shelter. A dropped window takes its boards and its loads with it. The board asks for a
`timber store` last of its list and `canAccept` refuses a window whose boards the stores could not
hold even empty (`113 boards, and the timber stores hold 40`, red on the tile, asked once a store
stands). The words `boards` on the task, the pallet, the ledger, the Orders list, the Materials
rows and the tile. The outline of kit on order outside is refused `It stands in the yard`. Pins:
the Storage tab's folders, the catalogue's metres, measured classes 105 to 107, `hallItems` 24 to 25
(the timber rack finds its 4 m by 2 m on the 200 m² floor; the shelter is outside), `WARNING_ORDER`
and its all at once list; `timberHall`, `bigHall` and `windowCompany` given a shelter on the apron,
the tile's `Needs` line and its `boards of material`.

**T29-C7 Windows and doors as standing contracts.** Three pieces appended to `CONTRACT_PIECES`:
`casementWindow` 150, `sashWindow` 190 and `frenchDoor` 180 minutes. Each has the mark
`timber: true`, the seven stage ids of `TIMBER_STAGES`, and material and sheets of nought, because
the client sends the timber and the glass. Nothing comes off the racks or the stores, nothing is
ordered, and no night is stood.

A piece is worked as a timber job of labour value 1 (`pieceStaged`), at the one pace of the whole
plan (`jobPace`), so the five axis CNC, the robot and the line show in it. Its men are counted
against every family of the plan (`contractFamiliesOf`, read by `crewAtFamily` and by the offer's
hall line). They go round the plan's families, the Glazing at the bench (`contractRoundOf`), and
are drawn only at them (`drawnPlaces`). The wear is spread over the plan's machines by the stages'
shares, for the card and the closing report alike. No machine tip is given.

The six `stagedJob(0, 'sheet', false)` sites now ask the piece which kind it is; a sheet piece is
worked exactly as on v83. Windows and doors are drawn only in the 800 m² unit (`timberOnTheBoard`),
and `pick` is one draw whatever the length of the list, so a smaller unit draws what v83 drew. That
is asserted on 200 seeds.

Prices are at the timber plan's pace at the standard class, worn at the standard four sided
planer (`CONTRACT_TIMBER_WEAR_FAMILY`, [TUNE]): 179, 226 and 214 minutes, two a day, at 218, 249
and 241 a piece. A novice by hand makes one a day. Contracts are named with `pluralOf`
(`Drawer boxes for ...`).

The tile, the offer card and the running bar carry the timber words and no sheet word. A fault
found and fixed: the hall line read a pace that the shortages had taken below nought as full pace
(`speed > 0 ? speed : 1`). It now takes the floor, as the minute does. A sheet piece never goes
below nought, so its figures do not move.

Flipped: `contracts.test.ts` (the 200 seeds draw the three sheet pieces; the name is written with
`pluralOf`) and `contractPrices.test.ts` (the three sheet pieces). New:
`tests/engine/t29TimberContracts.test.ts`, 15 tests.

**T29-D1 The logo.** Not done: `docs/logo-incoming/` is not on main, so the section was skipped
whole and none of its four places was touched (CLAUDE.md T29 2.13). No commit.

**T29-E1 Notes and requests.** `docs/notes-t29.md` covers four things:
- where each task lives;
- what the lift does and the fields added;
- the readings of the brief taken beyond its figures;
- how to read the line and the one counter of stock, and what of section 8 the turn touched.

`docs/art/REQUESTS-T29.md` asks the art side for:
- the line modules, which stand about 38 px short of their corners;
- a saw at module 1's infeed;
- the two timber stores drawn empty;
- Turn 28's twelve stand-ins and three cutter sets, again.

It leaves two things for Piotr to decide: a figure for the line engineer, and the products on the
hall. Both files were written by a sub-agent from the repo and read by the lead.

**T29-E2 Scenarios.** The five new scenarios are in `tests/scenarios/turn29.test.ts` (15 tests).

- **(xx)** A whole v41 save with seven on one contract is opened through `migrateState`. It holds
  the first four. The other three have no marker and are on `freeJoiners`, and the
  `contractsTrimmed` card opens at the first minute, naming them. A fifth man is refused at the
  check, on the Orders board's tab (the locked `Put on it`) and on the Work Plan's (the reason in
  place of the button, no list), and by the action itself. One man is taken off and the fifth is
  put on.
- **(yy)** The 800 m² company buys a five axis CNC and a robot through `BUY_EQUIPMENT`. The
  window's Moulding is on the CNC and its pace is the engine's own sum. With the CNC sent for its
  service, the Moulding is at the moulders that day. A lacquered kitchen's plan differs only in a
  Finishing twice as fast.
- **(zz)** Module 1 is refused for a sheet rack on its cells, then refused while the kit is half
  shifted. After `END_SETUP` it is ordered (1,500,000, at x 5, y 14). The engineer is hired while
  it is on order, and the module stands by itself on its due day, 30 working days on, played day by
  day with nobody to unload it. The Cross cutting and the Planing are on it at 1.4 x 1.12, and the
  window's pace is the engine's sum. All five with two engineers run at level 5. Each engineer is
  then let go and his notice worked out: one left gives three modules and the strip's line; none
  gives `The line stands still` and the old machines at their own pace. Module 3 cannot be sold
  while 4 stands.
- **(aaa)** Played by the careful script with a labourer on duty. The window's boards arrive with
  no store. The card's words and `Leave it at the gate` show, and the strip names the job. A whole
  day passes with nothing unloaded and nothing sent to the paid store. A timber rack is bought (3
  working days) and the labourer takes the load in onto it, while the sheet rack's plate counts its
  20 sheets only. A second window of more boards than the room left stands at the gate, and a third
  is dropped with its load at the gate, leaving no load, no task and no board. The first window then
  draws its own, and the second load comes in whole, never over the rack's 40 and never into the
  paid store.
- **(bbb)** The 800 m² company is offered `Sash windows for ...` by the weekly ring, declining the
  other offers, and takes it with four men. Every window is paid at the price with nothing off the
  counter and nothing ordered. **17 a week without the line and 109 with all five** and two
  engineers: four men on standard timber machines sit on the floor of section 8's hall. A 400 m²
  company is offered 120 days of contracts, none a window or a door, each the piece v83's three give
  off the same stream.

One scenario figure moved: (vv)'s glass waits to the next working day and not ten, restated in B1.
(vv)'s company was given a shelter on the apron in C6, and no figure of it moved.
