# Report, Turn 29: the production line, the five axis CNC, the timber stores, and four to a contract

Woodwork Empire, Turn 29. Built against `CLAUDE.md` of 05.10.2026 (first line "Turn 29").

- **Branch:** `turn-29-the-line`, off `5b05355`, the tree `origin/main` stands on (v83,
  STATE_VERSION 41).
- **Versions:** `APP_VERSION` v83 to v84, `STATE_VERSION` 41 to 42, once each.
- **How it was run:** one writer, serial, no worktrees, one commit a task. `npm run check` was
  green on its own exit code before each commit.
- **Tests at the end:** 2,762 in 287 files, none skipped.
- **Sub-agents:** read-only. They built the mockups, measured the five axis CNC's ports, reviewed
  each task's diff, mapped section 7 to the tests and wrote the notes and the art requests. None
  of them edited `src/` or `tests/`, committed, or ran the suite beside the lead's check.

## 0. What Piotr should read first

**The logo was not done.** `docs/logo-incoming/` is not on main, so 2.13 was skipped whole. None
of its four places was touched: the start screen, the menu, the icon and the title are as on v83.
The mockup (7) is not drawn. Put the pack there and the section can be done on its own.

**Not reached: nothing else.** Every other task of section 5, T29-A0 to T29-E5, is done in the
brief's order, one commit each, and the branch was pushed after each. A0 had nothing to commit (v83
was green), and D1 is the skipped logo. E3 carries the review's fixes. The line can be bought and
runs, and the timber stores, the four to a contract and the windows on a contract are in.

**Red: nothing.** The last full check passed on its own exit code: lint, the build, and 2,762
tests in 287 files. No `.skip`, `.only`, `.todo`, `xit` or `xdescribe` is anywhere in the tree.
`tests/ui/app.test.ts`, the real time test that failed beside a sub-agent's run in Turn 28, passed
in every check tonight; no sub-agent ran the suite.

**What chat decided and you have not confirmed (section 10), with what was built:**

1. **Glass the next working day; the timber deadline twelve days to three.** Built so:
   `TIMBER_LEAD_DAYS` is written as the glass's one day plus the two nights, so it cannot drift
   again. Enquiries and jobs keep the days they were drawn with. The lift brings a glass on its
   way forward to the next working day.
2. **A second cutter set of a kind is refused:** `One set serves every moulder`, owned or on order.
   A save holding two keeps both.
3. **A save over four is trimmed, the hall line counts four, and every piece is still paid.**
   - A save over four on a contract keeps the first four put on it. The rest are freed and named
     on a `Contracts take four joiners` card at the first settle.
   - The hall line of an offer counts the four joiners with the highest rate, four at the
     machine, and reads `with four on it`. It is v83's to the figure at four joiners or fewer.
   - Every piece is still paid, past the week's order too. The payment is not touched.
4. **The five axis CNC.** 150,000, 300,000 and 500,000. The Moulding goes four times as fast in
   every class. It keeps 12, 20 and 32 men busy, stands only in the 800 m² unit, and its order
   cannot be called off. The rest of 2.6's table is built as written: delivery 45, 45 and 60
   days, extraction 2,000, 2,400 and 3,000, power 16, 24 and 36.
5. **The robot.** 120,000, one for the hall (a second is refused), and the Finishing at the booth
   twice as fast. A lacquered sheet job's Finishing is faster too: the one thing of tonight a
   sheet job feels.
6. **The engineer.** He is on the Workshop tab, at 15,000 a month. Before a module stands or is on
   order he is refused with `The company has no production line`; a third is refused with `Two
   engineers keep the whole line`. One keeps three modules and two keep five. He is never drawn,
   never carried by the manager and never called idle, and his tile says how much of the line
   runs.
7. **The line.**
   - Five million for the whole line, shared 1.5, 0.75, 0.75, 1 and 1 million.
   - A twelfth tab, `Production line`, and the 800 m² unit only.
   - 30 working days for every module; the cells x 5 to 34, y 14 to 16.
   - Never moved or turned, and sold only from the end.
   - Module 1 does the Cross cutting and the Planing (it is drawn with no saw), module 2 the
     Moulding, 3 the Sanding, 4 the Pressing, and 5 no stage. A covered stage goes at the
     industrial pace.
   - 33 places a module; the stand ins for the board as listed.
   - `LINE_FACTOR` 1.4, 1.6, 1.8, 2.1 and 2.4 on every timber stage but the Finishing.
   - Three per cent fewer boards a module, so 19 boards become 18 with one module and 16 with five.
   - What the built game gives, against the same crew's windows in a hall with industrial
     machines and no line (2.9.6's second row):

| Five axis CNC beside it | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| standard | +32% | +47% | +61% | +80% | +98% |
| pro (the brief's row: +32, +46, +60, +79, +97) | +32% | +47% | +60% | +80% | +97% |
| industrial | +32% | +46% | +60% | +79% | +97% |

8. **What the line costs to own.**
   - Not serviced, never broken down by day or on the second shift, never burgled, and out of
     the security firm's price. The Security page says `the production line is not in it`.
   - Insured like everything; 60 a day of power a module; extraction of its own.
   - An order for a module or a five axis CNC cannot be called off.
   - A month in the 800 m² unit, from the built game:

| Modules | Engineers | Power | Property cover (if held) | Liability premium |
|---|---|---|---|---|
| 1 | 15,000 | 1,800 | 5,000 | +30 |
| 2 | 15,000 | 3,600 | 7,500 | +30 |
| 3 | 15,000 | 5,400 | 10,000 | +30 |
| 4 | 30,000 | 7,200 | 13,333 | +60 |
| 5 | 30,000 | 9,000 | 16,667 | +60 |

   The security firm's price is the same with five modules as without: 3,560.50 and 8,545.20 a
   month for the standard hall the figures were taken in.
9. **The timber stores.** A rack of 40 boards at 1,200 and a shelter of 400 at 18,000, the
   shelter outside on the apron.
   - Boards go only onto a store, and a window is not takeable without one, nor while its boards
     are more than the stores hold.
   - A load of boards comes in whole or waits at the gate, never into the paid store, and the strip
     says so with `boardsAtTheGate`.
   - A dropped window's boards and its load are gone.
10. **Windows and doors on a contract.** Casement 150, sash 190 and French door 180 minutes. The
    client sends the timber and the glass: no nights, nothing ordered. They are made on the whole
    timber plan, offered only in the 800 m² unit, and no machine is asked.
    - Priced at 218, 249 and 241 a piece (179, 226 and 214 minutes, two a day for the experienced
      man at standard machines).
    - Four men make 17 sash windows a week in a hall of standard timber machines, and 109 with the
      whole line (scenario (bbb)).
11. **The logo:** not done (above).
12. **Small things:**
    - The catalogue's first tip no longer says every family has five classes.
    - The five axis CNC, the robot and the modules each say what they do in a line of their own.
    - The card of a load that cannot be unloaded is raised with a labourer on duty too, sheets with
      no rack among them.
    - The false `(service due)` is gone from every kit that is never serviced: benches, racks,
      cabinets.

**The two halls section 8 asks to be printed.**
- *Four men on one window at standard timber machines* (Output sheet, built game).
  - `Too few booths`, `cross cut saws`, `planers`, `sanders` and `presses`, `capacity 2, 4 men`,
    each −0.17.
  - Four `no experience joiner` lines at −0.40.
  - Six `best in the hall` lines at +0.05, and the table saw at −0.05.
  - So every man in that hall is on the floor of 0.25. Picture 08, a hall of the same kind with
    module 1 standing, reads 0.25 too.
- *The 800 m² hall with the whole line, a pro five axis CNC, industrial machines and twenty men on
  timber* (with the owner, 21).
  - It is short of the booths and nothing else: one industrial booth keeps 4 against 21, −0.27 on
    every man.
  - No module is short, since 33 places hold the whole company.
  - It would take six industrial booths to carry them.

**The choices this session made beyond the brief, each marked [TUNE] in the code:**
- The board asks the stores' room only once a store stands, so a company with none reads `Needs
  timber store`.
- The `Timber boards` row on the Materials page shows once a store stands or a board is held.
- The engineer:
  - his minutes at the line are booked under the desk's band, so his week reads full;
  - his tile reads `The line is not built yet.` while no module stands;
  - his work column reads `waiting for the line` while his module is on order;
  - Our team with none reads `Nobody. The line does not run without one.`;
  - his tile is last on Our team.
- `inWords` says counts to twelve in words.
- The line factor also lifts a timber stage done by hand for want of its machine; a job made by hand
  feels none of it.
- A line with no engineer reads `Production line, standing still` on the Output sheet, and has no
  line on the top bar's plate.
- A window or a door on a contract:
  - goes round the bench too, for the Glazing;
  - is worn at the standard four sided planer for its price, the dearest of the timber plan's
    standard machines;
  - is shown on the card as worn on `the timber machines`.
- The five axis CNC's ports are measured off its six pictures and await your eye on the hall.

**One fault found in v83's arithmetic and mended.** An offer's hall line read a pace driven below
nought by its shortages as full pace (`speed > 0 ? speed : 1`). No sheet piece can go below nought,
but a window's four men short at five families do. A hall on the floor of 0.25 then read 40 a week
where it makes 12. It now takes the floor, as the minute always did.

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

**T29-E3 Cross check.** Four read-only auditors mapped every clause of section 7 to the test that
asserts it. Every clause was already built; seventeen were asserted only in part or not at all.
The rest are asserted in a new file, `tests/engine/t29CrossCheck.test.ts` (13 tests), as section
7 words them:
- the Sprite check page draws a file, a footprint and no red port line for all 11 new classes;
- the five axis CNC and every module are refused in the 400 m² unit as well as the 200, and the
  robot and both stores are sold there;
- exactly the six big families name a unit, so the two catalogue tests pass over those six only;
- the reputation is asked before the unit;
- a sheet job, laminate and lacquered, keeps its plan family for family in one hall that has the
  five axis CNC, the robot, a whole running line and both stores, against one with none of it,
  and only the robot moves it, at the Finishing;
- a module's requires is asked before one of each, and one of each before the cash;
- five modules ordered in one morning stand on the morning they are due, natural days played,
  and none the evening before;
- the Planing's speed at every level, and the Pressing on module 4 at levels 4 and 5;
- 33 real men on timber work with the whole line raise no `Too few` for a module, while the
  booths are short;
- the engineer's played week is booked at 90 per cent and more, his tile says how much of the line
  runs, and Our team never says `Near full` or `standing most of the week` of him;
- a load of sheets past full racks overflows to the paid store, as on v83, and never onto a
  store with room;
- a dropped window's load still on the road goes too;
- a raw v41 save with a window holding its boards and no store opens and draws them all.

Review fixes folded in:
- `LINE_ENGINEERS_MAX` tagged [PIOTR] and [TUNE: chat].
- The tile's and the taken job's boards asserted equal with 0, 1 and 5 modules (19, 18, 16).
- A line with no engineer reads `Production line, standing still` at nought on the Output sheet,
  in place of `0 modules` [TUNE], and has no line on the top bar's plate, like any machine at
  nought.
- C7's tidy-ups: the closing report's timber wear asserted against the card's rate, the
  `pluralOf` comment pointing at the tests that check it, and the hall line guard's comment.

Checked by hand:
- `git diff main` shows no changed line in `tests/engine/assignees.test.ts`,
  `tests/scenarios/turn19.test.ts` or `tests/ui/workPlan.test.ts`.
- No `.skip`, `.only`, `.todo`, `xit` or `xdescribe` anywhere in `tests/` or `src/`.
- `git diff main --stat -- src/ui/styles.css` is empty.
- `APP_VERSION` 'v84', `STATE_VERSION` 42, `OLDEST_SAVE_VERSION` 12.

**T29-E4 Look and shoot.** Twenty three pictures in `docs/report-t29/`. Every one is drawn by
the game's own app: it is mounted in jsdom, the state is set up by the engine or the tests'
helpers, and the app is clicked to the screen through its own `data-do` handlers. The page is
saved with the game's stylesheet and shot in headless Chromium. Nothing in the markup is written
by hand. For a modal shot whole, `.modal`, `.modal-full`, `.modal-body` and `.ledger-list` were
let out to their full height, so nothing hides behind the modal's own scroll.

Three things about how they were shot:
- The two store plates were shot at twice the pixel density so they can be read; that is the
  game's own drawing at a finer screen, and no picture was rescaled.
- The hall shot with module 1 alone was drawn in an app of its own. The hall walks its figures
  from where they last stood, and with the clock stopped they would have stayed where the whole
  line's picture had them.
- The pages were served by a static server inside the shooting script, which stopped it before
  it exited. The shooting scripts were throwaway files in the scratchpad and are not committed.

What the pictures show that the report must say:
- **Pace 0.68 and 0.25 in the hall shots.** These are section 8's halls: six and four men on one
  window at standard timber machines, short at five families at once.
- **The pallet at the gate is v83's placeholder** (`pallet.sheets`): the pallet has never been
  painted.
- **Both stores are drawn full whatever they hold:** the rack's plate reads 0 under a full load
  (2.4, and on the art side's list).

**T29-E5 Report and PR.** This file, section 0 first, and the pull request titled `Turn 29: the
production line, the five axis CNC, the timber stores, and four to a contract`, against main and
not merged. Nothing was left running:
- the checks, the scenario runs, the reviews and the audit ran to their ends;
- the shooting script stopped its own server;
- no watcher or server is up.

## The pictures

The third column is the nearest existing picture of the same screen. Where the tree has none, it is
the mockup of section 9 drawn before the code. What each pair differs by is what this turn did to
that screen.

| picture | what it shows | beside |
| --- | --- | --- |
| `01-the-cnc-centre-tab.png` | the CNC centre tab, empty until tonight, with the Five axis CNCs folder open on its three classes: each card's places, its pace, `The Moulding of windows and doors goes 4 times as fast on it`, dust, extraction and air | `report-t28/06-the-planer-folder.png`; `mockups/t29/cnc5-and-robot.png` |
| `02-the-production-line-tab.png` | the twelfth tab, its five folders, from £1,500,000 to £1,000,000 | `report-t28/05-the-timber-machines-tab.png`; `mockups/t29/production-line-tab.png` |
| `03-module-1-with-no-five-axis-cnc.png` | module 1's card in the 800 m² unit with no five axis CNC: `Needs Five axis CNC first`, the locked Buy | `mockups/t29/production-line-tab.png` |
| `04-module-1-in-the-200-m2-unit.png` | the same card in the 200 m² unit: `Needs the 800 m² unit` | `mockups/t29/production-line-tab.png` |
| `05-module-1-that-can-be-bought.png` | the same card with the CNC and the press beside it: Buy | `report-t28/08-a-cutter-set-card.png`; `mockups/t29/production-line-tab.png` |
| `06-module-1-refused-for-what-stands-on-its-cells.png` | `Move the four sided planer and the sheet rack off the line's 6 m by 3 m` | `mockups/t29/production-line-tab.png` |
| `07-the-800-m2-hall-with-the-whole-line.png` | the whole line standing at x 5 to 34, y 14 to 16, a pro five axis CNC, the robot by the booth, six men on a window drawn at modules 1 to 4, the booth and a bench; the shelter on the apron. Pace 0.68: the booth is short of places for six, as section 8 says of the line | `report-t28/12-the-800-m2-hall-with-the-timber-machines.png` |
| `08-the-same-hall-with-module-1-alone.png` | module 1 alone under one engineer: a man at it, one at the five axis CNC (the Moulding), one at the booth, one at a bench. Pace 0.25: four men at standard machines, the floor | `report-t28/12-the-800-m2-hall-with-the-timber-machines.png` |
| `09-the-engineer-refused-with-no-line.png` | the engineer's hire tile on the Workshop tab, refused with `The company has no production line` | `report-t26/05-hire-cards.png`; `mockups/t29/line-engineer.png` |
| `10-the-engineer-offered-with-module-1-on-order.png` | the same tile with module 1 on order: Hire | `report-t26/05-hire-cards.png`; `mockups/t29/line-engineer.png` |
| `11-the-strip-with-no-engineer.png` | the strip: `The line stands still: no engineer on duty` | `report-t28/03-the-strip-line-in-july.png`; `mockups/t29/line-engineer.png` |
| `12-the-output-sheet-with-the-line.png` | the Pace sheet with one line for the line, `Production line, 3 modules`, +0.80, `timber work, the Finishing excepted`, and none for a module | `report-t26/07-pace-sheet-head.png` |
| `13-a-timber-rack-and-the-shelter.png` | a timber rack on the floor and the shelter on the apron, shot at twice the pixel density: the 19 boards on the shelter, bought first, and 0 on the rack; both drawn full (2.4) | `report-t28/12-the-800-m2-hall-with-the-timber-machines.png`; `mockups/t29/timber-stores.png` |
| `14-the-materials-page-with-the-boards.png` | the Stock page: the MFC line counting sheets only, the new `Timber boards` row (`Held 19`, `Room 421`, `Total 19 of 440`), and the window's row in boards | `report-t24/07-the-materials-tab-with-the-storage-line.png`; `mockups/t29/timber-stores.png` |
| `15-the-lorry-card-with-no-timber-store.png` | `19 boards have arrived and there is no timber store to put them on. Buy one from the catalogue.`, `Leave it at the gate`, the strip's line above it | `mockups/t29/timber-stores.png` |
| `16-the-lorry-card-with-the-stores-too-full.png` | `19 boards have arrived and the timber stores have room for 16. They wait at the gate until a job uses its boards or another store is bought.` | `mockups/t29/timber-stores.png` |
| `17-the-strip-with-boards-at-the-gate.png` | `Boards at the gate, no timber store: Sash windows for the vicarage` | `report-t28/03-the-strip-line-in-july.png`; `mockups/t29/timber-stores.png` |
| `18-a-window-the-stores-cannot-hold.png` | a 113 board window with the red `113 boards, and the timber stores hold 40` and no Accept, beside a 19 board one with its Accept; both `Needs` lines end `timber store` | `report-t28/09-timber-tiles-live-locked-and-greyed.png`; `mockups/t29/timber-stores.png` |
| `19-a-full-contract-on-the-orders-board.png` | `On it 4 of 4, the most a contract takes`, and Joiners 5 and 6 with the locked `Put on it` | `report-t20/02-contracts-running.png`; `mockups/t29/contracts-four.png` |
| `20-a-full-contract-on-the-work-plan.png` | the four chips and `A contract takes four joiners at the most` in place of `Assign to this contract`, `On it 4 of 4` | `report-t26/08-contract-row-machines.png`; `mockups/t29/contracts-four.png` |
| `21-the-offer-of-a-sash-window-contract.png` | `Sash windows for Harbour Windows`, £249 a piece, `190 minutes of work a piece on the timber machines. The client sends the timber and the glass: nothing comes off your racks.`, the hall line short at 6 against 12 | `report-t20/01-contracts-on-offer.png`; `mockups/t29/sash-window-contract.png` |
| `22-the-card-of-the-trimmed-save.png` | a v41 save with seven on a contract, opened: `Contracts take four joiners`, `Taken off Cut sheet packs for Northgate Interiors: Joiner 5, Joiner 6 and Ravi. They are waiting for work.`, `Right` | `report-t28/02-the-christmas-break-card-in-december.png`; `mockups/t29/contracts-four.png` |
| `23-the-security-page-with-the-line.png` | the firm's sentence for a company with the whole line: `£413,550 insured, the production line is not in it` | none in the tree; the clause is the only change |

## The state: STATE_VERSION 42

Lifted once, in B3, by `liftToVersion42` in `migrate.ts`. A v41 save is changed in two ways:

- **A running contract with more than four on it** keeps the first four of `assigned`, in the
  order they were put on. Every man taken off has his `contract:` marker cleared from `jobId`, so
  the lists of free men see him from the first minute. The lift pushes one whole `contractsTrimmed`
  event onto `eventQueue` with the next id, and the first settle opens it. A save with nobody taken
  off gets no card. Asserted on a raw save in `tests/cloud/migrate.test.ts` and, played, in (xx).
- **A glass `ordered` for a day later than the next working day** is brought forward to it.

Nothing else of a save is touched: no job, man, machine, board, price or place. The timber stores
need no lift (2.11.4). Every save that loaded on v83 loads (`OLDEST_SAVE_VERSION` 12), the
fixtures among them.

Fields added, all optional so no save needs them:
- `minUnitM2` on `EquipmentSpec`;
- `boardCapacity` on `EquipmentSpec` and `EquipmentVariant`;
- `boards` on `Delivery` (a load without it is read from its job);
- `timber` on `ContractPieceSpec`.

Kinds added: `lineEngineer` on `WorkerRole`, `line` on `EquipmentTab`, `contractsTrimmed` on
`GameEventKind`, and the warning keys `lineNeedsEngineer` and `boardsAtTheGate`.

Version pins flipped: `tests/ui/version.test.ts` (v84 and 42), `tests/ui/saveCheck.test.ts`,
`tests/cloud/migrate.test.ts` (the lifts' `toBe(41)` to 42), `tests/engine/types.test.ts` and
`tests/engine/v67.test.ts`.

## Tests flipped, by name

Each was flipped to say what is true now; none was kept beside a new one.

- **The roles:**
  - `boothJoiner.test.ts`: `hires no trade of its own`, the set of roles with `lineEngineer`;
  - `spriteCheck.test.ts` and `capsule.test.ts`: the roles with no figure, the engineer after the
    office's three;
  - `team.test.ts`: the Workshop tab's candidates end `lineEngineer.`;
  - `v72.test.ts`: Our team's tiles.
- **The catalogue and the pictures:**
  - `variants.test.ts` and `machine.test.ts`: a ladder is an unbroken run of two classes or more;
  - `catalogueTabs.test.ts`: the CNC centre's folder, the twelve tabs, the Storage tab's folders;
  - `ports.test.ts`: 40 measured classes, and ninety files;
  - `metres.test.ts`: every new catalogue line on its lists;
  - `rotate.test.ts` and `spriteClasses.test.ts`: 96 to 107 turned files and measured classes;
  - `zones.test.ts` and `layout.test.ts`: the two that buy the catalogue into the 200 m² unit pass
    over what it refuses for its size; `hallItems` 23 to 25.
- **The strip:** `warnings.test.ts`, `WARNING_ORDER` and the all-at-once list, for
  `lineNeedsEngineer` and `boardsAtTheGate`.
- **The contracts:**
  - `contractHall.test.ts`: six joiners restated as four on it;
  - `contracts.test.ts`: the 200 seeds draw the three sheet pieces, and the name is written with
    `pluralOf`;
  - `contractPrices.test.ts`: the three sheet pieces.
- **The timber stores:** `t28Timber.test.ts` (`timberHall` and `bigHall` given a shelter; the Needs
  line; `boards of material`), `t28Families.test.ts` (the second cutter set), and `turn28.test.ts`
  (`windowCompany` given a shelter; the glass a day).

The three tests of section 1 are untouched (`git diff main` shows no line in any of them).

## What was not done tonight

- **Section 8's parked list, untouched.** The spindle moulder's three men (its places stay 2, 4, 4,
  6, 8). The tax and an order called off, for every machine but the modules and the five axis CNC.
  Whether the 5 million is the whole line, and the split. A robot for each booth and the line's
  lacquer hall. Timber bought ahead, and a contract on the company's own timber. Frames drying on
  the floor; the grade of the timber; remedial visits. The products on the hall, a figure for the
  engineer, Turn 28's stand-ins and the sanders off their anchors (asked in `REQUESTS-T29.md`). The
  thicknesser's stage.
- **The night's breakdown roll for kit that is not a module.** A bench can still break down at
  night after 180 days, as on v83.
- **A sheet job dropped with its delivery at the gate** still leaves the load; it is mended for
  boards only.
- **The robot's life**, which does not run down.
- **A man walked to the shelter**: with only a shelter, the man unloading stays at the gate.
- **The stores drawn empty.**
- **The day summary's word for tomorrow's boards**: it still says `sheets`.
- **Your open questions after v82**, and Turn 27's three.
- **Seen in the pictures and left:**
  - Picture 08, four men on one window at standard machines, sits on the floor of 0.25, as section
    8 says. Picture 07, with the whole line, reads 0.68, its booth short of places.
  - The pallet at the gate is still v83's unpainted placeholder.
  - Kit that stands within two metres behind a module may be painted over it: not seen tonight.
  - The modules stand about 38 px short of their corners, so a narrow gap may show between them
    (SPRITES.md 13, asked of the art side).
