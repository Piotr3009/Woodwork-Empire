# Notes from Turn 31

One writer, serial, no worktrees: the lead agent made every change under `src/` and `tests/`, every
commit and every push, task by task in the order of the brief's section 5. Sub-agents built the
mockups, reviewed the diffs and wrote this file and `docs/art/REQUESTS-T31.md`; none of them
committed, and none ran the suite while the lead's check was running (CLAUDE.md T31 section 3). This
file is what did not fit in `REPORT-T31.md`'s two lines a task: where each piece of the turn lives,
the save, the readings of the brief that were not the only possible one, what was built for each of
chat's choices in section 10, what of section 8 the turn touched and what the work found and left,
and the questions for Piotr. It was written after T31-C3 (committed as 608d53b, with the second
reader's findings on it put right before the commit); the scenarios, the cross check, the pictures and
the report (E2 to E5) come after it and are in `REPORT-T31.md`.

---

## 1. Where each task lives

| Task | What it built | Where |
| --- | --- | --- |
| A0 | the suite on v91 | `npm run check` on main as it stood (v91, state 43): green, 2,849 tests in 297 files (two more than the 2,847 the brief names for the end of Turn 30). Nothing moved, so no commit |
| A1 | v92 | `constants.ts` `APP_VERSION`; the pins in `tests/ui/saveCheck.test.ts` and `tests/ui/version.test.ts`; `README.md` names `docs/turn-30-brief.md` and `REPORT-T31.md` |
| A2 | the nine mockups of section 9 | `docs/mockups/t31/`: `line-running-block`, `strip`, `production-line-tab`, `hall-lane`, `premises-long-extension`, `hall-longer`, `shelter-behind-wall`, `contract-lost` and `forklift`, each an `.html` and its `.png`; the `README.md`, and the lead's readings for the mockups and the code, `decisions.md` |
| B1 | the line's timber and glass; STATE_VERSION 44 | `constants.ts`: `LINE_BOARDS_PER_WINDOW` 2, `LINE_GLASS_PER_WINDOW` 1, `LINE_GLASS_WINDOWS_MAX` 40, `LINE_ORDER_WINDOWS` 20, `LINE_REORDER_DAYS` 2, `STATE_VERSION` 44; `lineContract.ts`: `lineBoardsPerWindowCost`, `lineGlassPerWindowCost`, `lineTimberBatch`, `lineTimberBatchCost`, `lineGlassBatchCost`, `lineShortOf`, `lineGlassWindows`, `lineBoardsOnTheWay`, `lineGlassOnTheWay`, `lineTimberCheck`, `lineGlassCheck`, `orderLineTimber`, `orderLineGlass`, `arriveLineGlass`, `lineReorderWindows`, `officeOrdersLineMaterial`, `writeOffLineMaterial`, and `lineMakesWindows`, `runLineMinute`, `makeWindow`, `lineOfferBody`, `runLineDay`, `answerLineOffer` changed; `machines.ts` `boardsHeld`; `materials.ts` `reservedSheets`, `pendingStockSheets`, `createDelivery` (the `line` mark), `arriveDeliveries` (the task's words), `loadWords`, `lineLoadInWords`, `unloadIntoStock`; `orders.ts` `shoppingList`; `game.ts` `ORDER_LINE_TIMBER`, `ORDER_LINE_GLASS`, `arriveLineGlass` at the open, `deliveryCardBody`, `cancelOrder`, `sellMachine`; `warnings.ts` `lineNeedsMaterial`, and `boardsAtTheGate` naming the line; `ui/contracts.ts` `lineContractBlock`, `lineMaterialRows`; `ui/materials.ts` `lineGlassRow`; `render/hall.ts` the words on the line's pallet at the gate; `ui/app.ts` the two clicks; `migrate.ts` `liftToVersion44`, `giveTheLineItsFirstBatch`; `types.ts` (section 2) |
| B2 | the line's books | `src/engine/lineBooks.ts` (new): `LineColumn`, `LineBooks`, `lineBooks`, `lineBooksShown`, `lineMonthPace`, `linePaidBack`; `lineContract.ts`: `emptyLineDay`, `emptyLineSince`, `lineEngineersPerDay`, `linePowerPerDay`, `lineCoverPerDay`, `lineToday`, `openLineDay`, `lineLostTo`, `bookLineMinute`, and the window's share in `makeWindow`; `constants.ts` `LINE_DAYS_KEPT` 400; `game.ts` `openLineDay` beside `runDayCosts` in `startDay` and on each weekend day in `advanceToNextDay`; `ui/accounting.ts` `AccountingTab` `'line'`, `tabsFor`, `lineTab`, `lineColumn`, `lineMoneyRow`, `efficiencyWords`, `lostWords`, `LOST_WORDS` |
| C1 | the shelter behind the rear wall | `constants.ts` `STARTING_LAYOUT.timberShelter` with `rear: true`, `TIMBER_SHELTER_VARIANTS` and the spec at 6 by 3 with the zone 6 by 3, the words `outside behind the hall`; `public/sprites/timberShelter.standard.png` and `.r.png` changed places by `git mv` through a temporary name; `render/hall.ts` `rackCount` hangs the plate of a store behind the wall over the wall's top; `migrate.ts` the shelter's step in `migrateState`; `stations.ts` one comment; SPRITES.md 13 |
| C2 | the forklift's lane | `constants.ts` `FORKLIFT_LANE_CELLS` 2, `LINE_FRONT_CELLS` 1; `layout.ts` `forkliftLane`, `lineLane`, `linePlace`, `lineFits`, `standingOnTheLane`, `FORKLIFT_LANE_REFUSAL`, `LINE_NO_ROOM`, and `canPlaceSpec`, `lineSite`, `canPlaceLine`, `lineNeedsRoom` changed; `game.ts` the order's refusal (`LINE_NO_ROOM`); `warnings.ts` `laneBlocked`; `render/hall.ts` `laneArt`, `LANE_STROKE`; `styles.css` `--lane-yellow` |
| C4 | the line's forklift and the pallet standing alone (L3) | the three pictures by `git mv` from `docs/pictures-l3/` into `public/sprites/`, and the manifest; `constants.ts` `VehicleSheetFigures`, `FORKLIFT_SHEETS`, `FORKLIFT_CELLS_PER_SECOND` 3, `FORKLIFT_LOAD_AHEAD` 1.225, `LINE_PALLETS_DRAWN` 2; `src/render/forklift.ts` (new): `forkliftPoints`, `forkliftArt`, `stepForklift`, `syncForklift`, `resetForklift`, `forkliftNow`; `render/walkers.ts` `placeAmongDrawables`, taken out of `resortFigures` so the figures and the forklift share one insertion; `render/hall.ts` the forklift's drawable and the pallets at the gate from `windowPallet.standard.png`; `ui/app.ts` `stepForklift` in `runFrame`, `syncForklift` at the end of `render()`, `resetForklift` beside every `resetWalkers` and `resetDoors`; `ui/spriteCheck.ts` the pallet among `spriteTargets` and `vehicleSection`; SPRITES.md 16 |
| C1, C2 review | a second reader's findings | `layout.ts` `canBeMoved`, `laneTrouble`, and the comments of `standsOutside` and `standsBehindTheWall`; `warnings.ts` the left wall's words; `render/hall.ts` `RACK_COUNT_OVER_WALL` 0.3 to 0.6; `ui/catalogue.ts` `ownedTile` asks `canBeMoved`; the shelter's lift asserted on raw saves in `tests/cloud/migrate.test.ts` |
| D1 | contracts that can be lost | `constants.ts` `CONTRACT_CLIENT_LEAVES_CHANCE` 0.03, `CONTRACT_QUIET_DAYS_MIN` 14 and `_MAX` 21, `CONTRACT_RENEWAL_CUT_CHANCE` 0.25, `CONTRACT_RENEWAL_CUT_MIN` 5 and `_MAX` 15; `contracts.ts` `CONTRACT_LOSS_SALT` 2, `CONTRACT_CUT_SALT` 9, `contractSideCarrier`, `isSheetContract`, `contractsQuiet`, `clientGoesElsewhere`, `lostToAnother`, `renewalCut`, `cutPrice`, `offerSentence`, and `offerContract`, `renewContractCheck`, `renewContract`, `endedLine`, `closingBody`, `endContract`, `runContractDay` changed; `types.ts` `endedBy` `'lost'`, `contractQuietUntilDay`; `ui/contracts.ts` `endedBlock` |
| C3 | the hall that grows | `constants.ts` `UNIT_LONG_EXTENSION_CELLS` 10, `UNIT_LONG_EXTENSION_PRICE` 600,000, `UNIT_LONG_EXTENSION_GROWTH` 1.2, `UNIT_SECOND_EXTENSION_M2` 800, `unitCostFactor` by the area, `CANTEEN_LOCKERS_PER_LONG_EXTENSION` 8; `layout.ts` `canteenLockers`; `premises.ts` the `'long'` stage in `extensionStatus`, `addsAlongTheWall`, `secondExtensionAreaM2`, `unitWith`, `extensionPrice`, `extendUnitCheck`, `extendUnit`, `secondOpened`, `openStage`, `openExtension`; `types.ts` `LongExtension`, `ExtensionStage` `'long'`, `UnitState.longExtensions` and `longExtension`; `ui/premises.ts` `squareMetres`, `longOffer`, the card `extendLong`; `ui/app.ts` `extendUnit` with `data-stage="long"`; `ui/insurance.ts` and `ui/security.ts` the area in thousands; `render/hall.ts` `HALL_CANVAS_LONG`, `HALL_CANVAS_END`, `HALL_GROUND_TILE`, three layers in `HALL_WIDE_LAYERS`, `longPiecesOf`, `alongTheHall`, `hallFrameCanvas`, `hallLayersOf`, the ground's pattern in `hallScene`; `scripts/hall-long.py`; `public/sprites/hallBackgroundLong.png`, `hallBackgroundEnd.png`, `hallBackgroundGround.png`; SPRITES.md 9.9 |

The new tests are nine files, each with the Skylon Development Ltd header: `t31Material`, `t31Books`,
`t31Shelter`, `t31Lane`, `t31Contracts` and `t31Hall` under `tests/engine/`, `t31Forklift` under
`tests/render/`, and `t31Material` and `t31Hall` under `tests/ui/`. Two new files under `src/`, each
with the header: `src/engine/lineBooks.ts` and `src/render/forklift.ts`; and one script with it,
`scripts/hall-long.py`. E1 is this file and `docs/art/REQUESTS-T31.md`; E2 (the scenarios), E3 (the
cross check), E4 (the pictures) and E5 (the report and the PR) come after it.

The two new kinds of file of 2.10 were taught where files are listed or counted: the Sprite check
page (`spriteTargets` lists the pallet at the gate on its 2 by 1, `vehicleSection` draws the two
sheets whole with the anchor in every cell), `tests/ui/spriteCheck.test.ts` (the pallet wanted beside
the gate's pallet), `tests/render/spriteClasses.test.ts` and `tests/engine/rotate.test.ts` (neither a
vehicle's sheet nor the pallet is a class picture or a turned one). No code reads the manifest by
pattern, so nothing else under `src/` needed it.

## 2. The save

STATE_VERSION 44, once, in B1, written whole so that C1 and C3 and D1 needed no second lift.

- **`liftToVersion44`** (`migrate.ts`, the raw lift beside `liftToVersion43`) writes every new field
  of the turn where a save has none: on `windowLine`, `boards` 0, `glass` 0, `glassOnTheWay` [],
  `today` a day of noughts dated the save's own day, `days` [] and `since` all noughts with
  `firstDay` null; on `unit`, `longExtensions` 0 and `longExtension` `'none'`; and
  `contractQuietUntilDay` null. `liftToVersion43` no longer calls `emptyWindowLine()`: it writes Turn
  30's six parts as they were written then, so that the lift to 44 is the one that adds Turn 31's.
- **`giveTheLineItsFirstBatch`** runs on the whole state after the raw lifts, gated `version < 44`,
  on the road `takeTheTimberToolsBack` and `takeTheLineBack` took. A save whose line contract is
  `active` is given one batch of each, free: 40 boards on `windowLine.boards` and on
  `state.stock.sheets`, and glass for 20 windows. No ledger line and no cash move. Its boards may
  stand over the stores' room until they are used, as any load may.
- **The shelter's step** (C1) runs in `migrateState` after `takeTheLineBack`, gated `version < 44` and
  outside the chain of `else if` the plant's other moves are in:
  `standThePlantBehindTheWall(lifted, 'timberShelter')`. A shelter standing on the apron, or on its
  way to it, is given the next place behind the rear wall on its new 6 by 3 (anchored at y -4, its
  floor from y -4 to -1, the wall's metre clear in front of it); only its anchor is written, a drag of it not yet confirmed is forgotten, and no moving
  time is booked. One the wall has no length left for stays where it stands.

Fields added: on `WindowLineState`, `boards`, `glass`, `glassOnTheWay` (of `LineGlassOnTheWay`,
`windows` and `day`), `today` and `days` (of `LineDay`, with `LineLostMinutes`: `engineer`, `timber`,
`glass`, `timberAndGlass`, `move`) and `since` (of `LineSince`); on `UnitState`, `longExtensions` and
`longExtension` (of `LongExtension`, `'none' | 'building'`); on `GameState`, `contractQuietUntilDay`.
New optional values no save carries: a delivery's `line?: true`, a contract's `endedBy` `'lost'`, and
`'long'` among `ExtensionStage`. New actions `ORDER_LINE_TIMBER` and `ORDER_LINE_GLASS`; new strip
keys `lineNeedsMaterial` and `laneBlocked`. The forklift of 2.10 is the renderer's: no field and no
lift. Nothing else of a save is touched.

The lift is asserted on raw saves in `tests/cloud/migrate.test.ts` (from a game of today written raw,
its version set back to 43 and Turn 31's fields taken off): one with neither a running line nor a
shelter (the defaults and nothing else, the counter unchanged), one with a running line contract (40
boards, the counter 40 up, glass for 20, the cash unchanged), both in B1; and, in the review fix
commit after C4, one with a shelter on the apron and one on order (both behind the wall, y -4, the
van still on the apron) and one where the plant fills the 40 m wall (the shelter stays). The pins of
STATE_VERSION 43 were flipped in B1: `tests/ui/saveCheck.test.ts`, `tests/engine/v67.test.ts`,
`tests/engine/types.test.ts`, and `tests/cloud/migrate.test.ts` (the version and every lifted save's
`version`).

## 3. Readings of the brief

These are the choices the code made beyond the brief's own figures and section 10, each marked
[TUNE] in the code unless it says otherwise.

**The line's material (B1).**

- **`The timber stores hold fewer than 40 boards`** is written and tested (with `boardRoom` mocked to
  30), but cannot arise with today's stores: the smallest, the timber rack, holds exactly 40, which
  is not fewer than a batch, and the shelter holds 400. With no store the refusal is `No timber store`.
- **The office also orders at the moment the contract is taken** (`answerLineOffer`), beside the open
  of every working day and every window made, so a new contract does not wait a working day for its
  first material.
- **The checks' order.** The timber asks the contract, a store, room for a batch, then the cash; the
  glass asks the contract, the 40, then the cash. Their first answer, `The line has no contract
  running`, is never read: the block that holds the buttons is drawn only while the contract runs.
  Under the row of the two buttons, one `p.lock` a locked button, the same reason said once.
- **The line's load in its own words**: the task `Unload timber for the line: 40 boards`, the pallet at
  the gate `Timber for the line: 40 boards` (with no `Delivery:` before it), the Orders list's detail
  `for the line's contract`, the lorry's card and the refund `40 boards for the line`
  (`lineLoadInWords`), and the card's last sentence `They wait at the gate until the line or a job
  uses its boards or another store is bought.`
- **The strip's `lineNeedsMaterial`** is not said while the line is being moved: the move is what
  stops it then. The running block's `Standing still` row says the engineer first, as Turn 30 did,
  and the material only with both engineers on duty.
- **At the sale** the line's boards at a board's worth, its glass at the glass's share and any of its
  loads already at the gate at what was paid are written off on one line, `Material written off: the
  line's timber and glass`, and a load at the gate goes with its unloading task; a load still on the
  road and glass on its way are each given back on a line `Order cancelled: ...`.
- **The Materials page's glass row**, `Glass at the line`, reads `For 8 windows` and `Total 8 of 40`,
  in the stock line's markup with the placeholder thumb every stock row has, only while the six stand.

**The line's books (B2).**

- **The day book** holds a record only for a day that holds anything (the line standing, a window, or
  a working minute of the contract); the day in hand is closed into it when the clock leaves it, and
  records older than 400 days go.
- **The three costs** are taken at the open of every calendar day while the six stand whole, contract
  or not [TUNE: chat], weekends among them; the engineers are the line engineers started and not yet
  gone, each `monthlyWage` over 30.
- **The efficiency** counts a minute possible while the contract runs on a working day, outside the
  dinner hour and before the crew goes home, worth one window's share at that minute's pace; a minute
  the line cannot use is lost to the first of: no two engineers, the move, the timber, the glass, both.
  It reads `88 of 96, 92%` and never past 100, though a window in hand may cross a day.
- **What the month lost** is said in hours, and under the hour in minutes (`30 min`), the causes `for
  want of an engineer`, `for want of timber`, `for want of glass`, `for want of timber and glass` and
  `while it was moved`.
- **The tab** is shown once the line has stood and from then on, the line sold or not (`since.firstDay`
  kept); a save opened on the tab with no line reads the Days. **Paid back** reads `Paid back: £X of
  £10,000,000, N%`, with ` and the upgrades' £Y` before the per cent once one is bought (the brief's
  sample says `and the upgrades` alone).

**The shelter (C1).**

- **Its plate** is hung 0.6 m over the wall's top, at the shelter's middle along the wall and the wall's
  back edge, so that a plate of three figures clears the wall's clip at both lower corners (0.3 at C1,
  0.6 after the review). Every store standing behind the wall would hang its plate there.
- **A shelter the lift cannot move** stays on the apron, now on a 6 m along x footprint where the apron
  is 3 m wide (`YARD_WIDTH_CELLS`), so it sticks 3 m past the apron.
- **Its roof still shows over the wall.** The clip shows what the screen puts above the back edge of
  the wall's top (y -0.9, 3.5 m), and in the game's camera (`tileToScreen`: 24 px a metre along x
  less y, 12 along x plus y, 24 up) a metre further behind that edge is drawn as high as a metre
  further up. So a point shows over the wall when y is less than its height less 4.4: the shelter's 3 m
  top shows wherever it is more than 1.4 m behind the wall's face, which is the back 2.6 m of its 3 m
  depth (it stands at y -4 to -1), and at its back edge everything above 0.4 m. Its open front (y -1)
  is hidden. The camera never turns, so this is so at every zoom; E4's pictures show it. The brief's
  "the shelter is 3 m high and is hidden behind the wall" is so of its front, not of its roof.

**The lane (C2).**

- **`laneBlocked`** names kit as the catalogue does, each with `the` and joined as the game joins
  names (`Kit stands on the forklift's lane: the workbench and the sheet rack`), and has a third
  sentence beside the brief's two, for a line standing over the left strip: `The line stands on the
  way to the gate for its lane: move it along`.
- **Move is still offered** (`canBeMoved`) for kit standing on the lane and for a line whose lane is
  blocked or cannot be, since the strip tells the player to move them and the tile asked `canPlace`,
  which refuses both where they stand.
- **Every place of the line is refused while kit stands on the left strip, or on the front strip's
  first 36 m**: those cells are in the lane of every place the line could take, so the order says `No
  room in the hall for the line and its lane` and setup mode `The line needs a clear 36 m by 3 m and
  its lane` until the kit is moved.
- **The lines are drawn** as one closed outline of the L, 2 px at x1, in `--lane-yellow` (#e3b51f),
  first of the hall's live drawing.

**The forklift (C4).**

- **Its figures**: `FORKLIFT_CELLS_PER_SECOND` 3, twice a man's 1.5 [TUNE: chat]; `FORKLIFT_LOAD_AHEAD`
  1.225 m, the art side's `loadCenterXM`, so it stops with the pallet's middle over the middle of the
  first place at the gate (x 1, y 10.5); it waits 1 m short of the front strip's end (x 37, y 19 for the
  line at (2, 14)) [TUNE: chat: the cell]; one step covers at most one second of real time, so a frame
  that comes late never sends it across the hall. A trip there and back with the line at (2, 14) is
  86.6 cells, about 29 seconds of real time at any speed below 30x.
- **It is drawn** only when its empty sheet is in the manifest, placed among the drawables by the point
  its anchor is on, as a man is by his feet (`placeAmongDrawables`), its depth the cell under that
  point.
- **The drop** is always the first place at the gate. With one pallet already there the newest is
  drawn at the second place (x 2 to 3) once it is set down.

**Contracts (D1).**

- **The loss is drawn only while the term has days to come**: a term's last week, closed on the
  Monday after its last day, ends as the term and is offered another.
- **The cut is drawn only at a term's end** (`endedBy` `'term'`), never when the player or the client
  ended it. Its price is kept inside 5 to 15 per cent at the pound, so a 5 per cent cut of £90 is £85
  and not the £86 the rounding gives. Its sentence is the card's last: `The client offers £96 a piece
  for another term, 9% less than now: the market has turned.`, with no `Renew or let it go on the
  Contracts tab.` after it, as the mockup has it.
- **The salts 2 and 9** (`CONTRACT_LOSS_SALT`, `CONTRACT_CUT_SALT`) were chosen so that none of the 34
  draws the scenarios and tests made before Turn 31 comes up (2.9's "choose its seed"): no scenario
  moved. E2's (lll) chose its own seed, 20261012, to show the three: its played year of three sheet
  contracts has five losses and two renewal cuts.
- **The day's offer is drawn before the week closes**, as the open of the day always ran
  (`offerContract` before `runContractDay`), so an offer drawn on the morning a client leaves is on
  the board and stays takeable through the quiet days; the quiet days stop the draws, not the taking.
- **A second loss never shortens the quiet**: the later end stands. A renewal asked of a lost contract
  is refused in words, `The client has found another supplier`; `Let it go` lets it go.

**The hall that grows (C3).**

- **The cut** is the hall from x 28 to 39 (ten metres, 29 to 39, with its feathered metre 28 to 29)
  and the end from x 39, not the brief's 30 to 40: the painted floor stops at x 39.06, and a piece cut
  to 40 would lay a kerb and a shade across the floor every ten metres. The end comes in over the
  metre 38 to 39, which is the last piece's last metre and the same metre of the picture: cut hard at
  the same x, the two edges, each drawn and scaled on its own, let the ground show through the join
  (the second reader's finding, put right before the commit). The flat ground is left out of the long
  piece and the end, so no feathered metre lies over ground, where its rounding drew a line a level
  darker. A third piece, the picture's
  own flat ground (480 by 240), is laid under the whole longer scene as a pattern, because its corners
  show more ground than any number of pieces covers. SPRITES.md 9.9 says why.
- **The words**: the area grouped by thousands (`1,000 m²`) on the Premises page, the insurer's line
  and the security formula; the opening card's title `The hall is ten metres longer` (the figure written from
  `UNIT_LONG_EXTENSION_CELLS`) with the second
  extension's body; the refusal before the second extension is open, `Extend the unit along the front
  first` (the card is not drawn before then); the second's card keeps its name `Extend the unit to
  800 m²` and says the unit as it stands, since the long card is never done.
- **Only a deep hall** is laid of pieces (`longPiecesOf` is nought for a hall ten metres deep).

## 4. What chat decided, and what was built (CLAUDE.md T31 section 10)

1. **The split and the use.** Built: `lineBoardsPerWindowCost` 2 x `SHEET_VALUE` = 400 and
   `lineGlassPerWindowCost` the rest of `lineMaterialPerWindow`, 200, neither a figure of its own; two
   boards off `windowLine.boards` and the counter and one glass off module 6 in `makeWindow`, which
   books no material; `lineMakesWindows` and the window loop ask `lineShortOf`, so every minute without
   a window's worth is a minute the line stands.
2. **The two orders.** Built: `Order timber: 40 boards, £8,000` and `Order glass: 20 windows, £4,000` on
   the running block only, each paid at the click on the material line and refused past the overdraft
   (`canAfford`); the timber refused with no store, or with stores holding fewer than 40 boards between
  them (section 3), the glass
   when module 6's glass, what is on its way and a batch would pass 40, so a line with none takes two
   and is refused the third. At the contract's end `endLineContract` leaves the boards and the glass
   alone and the office orders nothing; at the sale `writeOffLineMaterial`.
3. **The office.** Built: `officeOrdersLineMaterial`, at the open of every working day, after every
   window and when the contract is taken, by the admin `firstOnDutyOf(state, MATERIAL_ORDER_ROLES)`,
   when the boards held and on their way are under two days' windows' boards (16 at 120 minutes, 32 at
   60), and the glass the same in windows; only through the buttons' own checks; the timber only when
   the free room less every load of boards on its way takes the batch; his name in the ledger line
   (`Timber for the line: 40 boards, ordered by Anna`). No admin on duty, nothing.
4. **The Production line tab.** Built: the fifth tab once the line has stood (`lineBooksShown`), read
   off the day book whether the books are up to date or not; the engineers, the power and the property
   cover taken at every calendar day's open while the line stands; `A year at this month's pace` the
   month's net over its days in the book times 360 (`DAYS_PER_YEAR`); `Paid back` over `LINE_PRICE` and
   the upgrades bought.
5. **The lane.** Built: `forkliftLane`, the front strip x 0 to the line's end at y D - 2 and D - 1, the
   left strip x 0 and 1 from y 10 to D - 1, nothing round the line's end; `canPlaceSpec` alone refuses
   everything but the line on it while the line stands or is on order (`linePlace` reads the order
   too); `laneBlocked` names what stood there and nothing is moved; a Turn 30 line at y 15 to 17 keeps
   its place with no lane and no forklift; `--lane-yellow` the one new token.
6. **The long extensions.** Built: 10 m along the rear wall each, from 600,000 by 1.2 a time, one at a
   time, no limit; `unitCostFactor` two times the area over 800 (the area over 400: 2 at 800 m², 2.5 at
   1,000), read by the insurer, a flat security level and the line's cover; `canteenLockers` 32 and 8
   more for every 200 m² past 800 in an enlarged canteen (56 at 1,400 m²); the picture cut from the
   800 m² one by `scripts/hall-long.py`.
7. **The shelter.** Built: `rear: true`, 6 by 3 with its zone, its two files back in their places, its
   plate over the wall, a save's moved by the lift (section 2). Its roof shows over the wall (section 3).
8. **The contracts.** Built: the lost card's title `...: the client went elsewhere` and last sentence
   `The client has found another supplier: there is no other term.`, its ended block with `Let it go`
   alone; `offerContract` draws nothing before `contractQuietUntilDay`, while a renewal and the line's
   offer go on; the cut one time in four, 5 to 15 per cent under the price a piece it had.
9. **The lift.** Built: `giveTheLineItsFirstBatch`, 40 boards and glass for 20 windows, free.
10. **The forklift.** Built: the line's own, no spec, place, power, insurance or card, its driver in
    the picture; waiting at the front strip's end in front of module 6's pallet facing `nw` on frame 0;
    nothing of lifting drawn, a corner a turn on the spot (`driveOn`).
11. **The trip.** Built: `src/render/forklift.ts`, the engine untouched (the pallet at the gate at once,
    as in Turn 30); the newest pallet hidden while on the forks (`visibility="hidden"`); 3 cells a
    second of real time in `runFrame`, paused or not; none from `WALK_SKIPPED_FROM_SPEED` (30x).
12. **The pallet at the gate.** Built: `windowPallet.standard.png` on `LINE_PALLET_LAYOUT`, the second
    at x 2 to 3, `LINE_PALLETS_DRAWN` 2, a part pallet drawn as a full one, the label as it was.

## 5. Section 8, and what the work found and left

- **The outside sheet store (S1).** Not built, no placeholder; named in `docs/art/REQUESTS-T31.md` 1.
- **The forklift family's own pictures and the forks lifting.** Not touched; `forklift.<class>.png` and
  their `.r` are the 1 by 1 by 1 m frame they were. REQUESTS-T31.md 3.
- **The renewal's own rise.** Not touched: `renegotiatedPriceFor` still adds 1 per cent a full week
  and takes 2 a short one. A cut replaces it only when it is drawn.
- **The money of the line and its property cover, and everything Turn 30 parked.** Not touched:
  `LINE_WINDOW_PRICE`, `LINE_MATERIAL_SHARE`, `LINE_WINDOW_MINUTES`, `LINE_PRICE` and the insurance's
  rate are as they were.

Found and left:

- **`You spend more than you earn`** weighs the week's wages, salaries and fixed charges against the
  labour the men earned (`weekRate`), so the line's engineers are in the "out" and its windows,
  which book no man's minute, are not in the "in". A company that lives off the line can be told it
  spends more than it earns. Untouched tonight.
- **The day end card** says tomorrow's lorries as `N sheets` (`deliveriesTomorrow` holds the counts
  alone), so the line's 40 boards, and a timber job's since Turn 29, read as sheets.
- **Test fixtures** that place a shelter by hand still put it where Turn 29 stood it, on the apron
  (`t28Timber`, `t29Kit`, `t29TimberContracts`, `t29CrossCheck`, at x 20 or 40, y 1), and two of
  tonight's put it in the hall (`t31Material`, `t31Books`, x 30, y 2). They test the boards, not the
  place, and pass.
- **The forklift at the corner.** By the art side's own bounds the forklift reaches about 1.95 m before
  and behind its anchor (3.9 m from its counterweight to its fork tips, 1.36 m wide, 2.2 m high). Its
  corner turn is on the spot at (1, 19), so facing `nw` its forks and load reach about x -0.95, a metre
  past the left wall's line, and facing `ne` its counterweight about y 20.95, a metre past the front
  of the hall. To be read in E4's pictures.
- **The pallet's quarter turn.** On the forks the pallet lies along them, so on the `ne` leg its 1.45 m
  base and the windows' width run along y; at the gate the picture stands them along x. It turns a quarter in
  the frame it is set down. On the forks over the drop it reaches y 9.775, a quarter of a metre into
  the finished goods' row (y 9). To be read in E4's pictures.
- **Men and the forklift** pass through one another on the left strip, the two metres between the left
  wall and module 1 that men walk round the line by: neither knows the other.

## 6. Open questions for Piotr

- **Chat's choices of section 10** all stand as built until he says otherwise. The ones most worth his
  eye: the 400 and 200 split of a window's £600 (1); the timber refused only for want of a batch's
  room, which today's stores never are (2); the admin ordering when the contract is taken as well as
  at the open and after each window (3); the costs accrued every calendar day the line stands,
  contract or not, which put a weekend and a line with no contract in the red (4); no lane round the
  line's end (5); the insurer and a flat security level by the area over 400, and 8 lockers a 200 m²
  (6); the shelter's roof reading over the wall (7); the cut at one in four (8); the free batch at the
  lift (9); the forklift waiting at the front strip's end, turning on the spot and setting the pallet
  down with no lifting (10, 11); the second pallet beside the first and a part pallet drawn full (12).
- **The renewal's own rise** (section 8): `renegotiatedPriceFor` raises a contract 1 per cent for every
  full week, so a six month term renewed twice in full is about 60 per cent dearer than it began. That
  is one reason the contracts pay so well after a while; tonight's loss and cut lean against it
  without touching it. Whether to cap it is his.
- **The forklift family's own pictures**: whether the five classes, drawn small in a 1 by 1 by 1 m
  frame, are to be drawn again at true size beside L3's forklift (REQUESTS-T31.md 3).
- **The sheet store** of 1,000 sheets at about 100,000: where it stands when it comes. By his rule for
  the shelter ("nothing in the hall may be hidden") it would stand behind the wall, where in the
  game's camera every metre a thing stands back from the wall shows a metre more of it over the wall,
  so a store as deep as the shelter shows most of its top, as the shelter does (REQUESTS-T31.md 1).
- **The pallet's quarter turn** at the gate (5 above): leave it, or have the pallet set down along
  the forks (REQUESTS-T31.md 2.3). The art side drew its 90 degree view already; it is in the pack
  and not served.
