# Notes from Turn 32

One writer, serial, no worktrees: the lead agent made every change under `src/` and `tests/`, every
commit and every push, task by task in the order of the brief's section 5. Sub-agents read the repo
and reported, built the mockups, drafted test flips in scratch copies of their own, reviewed the
diffs and drafted `docs/art/REQUESTS-T32.md`; none of them committed, and none ran the suite while
the lead's check was running (CLAUDE.md T32 section 3). This file is what did not fit in
`REPORT-T32.md`'s two lines a task: where each piece of the turn lives, the save, the readings of the
brief that were not the only possible one, what was built for each of chat's choices in section 10,
what the work found and left, and the questions for Piotr. It was written after T32-B2 (committed as
2fa2f41); the scenarios, the cross check, the pictures and the report (E2 to E5) come after it and
are in `REPORT-T32.md`.

---

## 1. Where each task lives

| Task | What it built | Where |
| --- | --- | --- |
| A0 | the suite on v95 | `npm run check` on main as it stood (v95, state 47): green, 3,013 tests in 312 files. Nothing moved, so no commit |
| A1 | v96 | `constants.ts` `APP_VERSION`; the pins in `tests/ui/saveCheck.test.ts` and `tests/ui/version.test.ts`; `README.md` names `docs/turn-31-brief.md`, `REPORT-T32.md`, `REQUESTS-T31.md` and `REQUESTS-T32.md` |
| A2 | the six mockups of section 9 | `docs/mockups/t32/`: `materials-three-blocks`, `jobcard-material-line`, `line-running-block`, `hall-glass-racks`, `board-window-tile` and `catalogue-storage-glass`, each an `.html` and its `.png` beside the same screen of v95; the `README.md`, and the lead's readings for the mockups and the code, `decisions.md` |
| B1 | the two glass racks | `types.ts` `StockKind`, `glassCapacity` on the spec and the class; `constants.ts` `GLASS_RACK_VARIANTS`, `GLASS_RACK_LARGE_VARIANTS`, the two specs (folders `Glass racks` and `Large glass racks`), their 100,000 hours, `VARIANTS_BY_FAMILY`, `TIMBER_STAND_INS` (either family for the other), `GLASS_RACKS`, `GLASS_RACK_WANTED`; `machines.ts` `glassCapacityOf`, `capacityOf`, `stockKindOf`, `stockWords`, `roomFor`, `stockStrandedBySale`; `materials.ts` `stockOnItem`, `rackCapacity` as the sheets' `roomFor`; `stations.ts` `STATION_GLASS_RACK`, `STATION_OF_KIND`, `firstStoreOf`, the racks' `freeSide` rows of `STATION_TABLE`, one `storageSaleBlock`; `catalog.ts` `wantedKit` and `wantedName`; `render/hall.ts` the name's count and the plate by kind; `ui/machine.ts` the holds line |
| B2 | one store for the three kinds; STATE_VERSION 48 | see the next table |

What B2 built, by the brief's sections:

| Section | Where |
| --- | --- |
| 2.2 three counters | `types.ts` `StockState` (`sheets`, `boards`, `glass` and their three `tempStorage` fields); `machines.ts` `freeRoomFor` beside `roomFor`; `materials.ts` `jobStockKind`, `reservedFor`, `freeFor`, `TEMP_STORAGE_KEY`; `insurance.ts` `insuredStockValue` counts the three; `security.ts` the burglar reads `freeFor(state, 'sheets')`; `bubbles.ts`, `contracts.ts`, `laptop.ts` read the sheets' counter or `freeFor(state, 'sheets')`. Gone: `boardsHeld`, `sheetsOnCounter`, `sheetsOnRack`, `boardsOnStore`, `boardRoom`, `freeBoardRoom`, `stockFree`, `reservedSheets`, `freeSheets`, `sheetsStrandedBySale`, `boardsStrandedBySale` |
| 2.3 Restock for each kind | `types.ts` `RESTOCK` carries `kind`; `materials.ts` `pendingStockSheets`, `restockSheets`, `restockSplit`, `restockCheck`, `buyStock`, `stockCostFor`, `unitPriceFor`, all by kind; `glassUnitPrice` (the line's own `lineMaterialPerWindow` less `lineBoardsPerWindowCost`, over `LINE_GLASS_PER_WINDOW`: 200); `stockIsLow` by kind; `game.ts` the `RESTOCK` case; `checkLowStock` the sheets' alone |
| 2.4 a window's boards and glass off the stores | `types.ts` `Job.glassUnits`, `glassReserved`, `glassUsed`; `materials.ts` `glassForJob`, `glassShortfallOf`, `reserveSheetsFor` (a sheet job or a timber job, not bespoke), `reserveGlassFor`, `reserveShortfalls`, `releaseReservation`, `orderForJob` (a load a kind, `Material for X: boards` and `: glass`), `orderForJobCost`, `glassAtHand`, `drawGlassFor`, `deliveryDay` by kind; `jobs.ts` `takeEnquiry`, `refreshJob`, `autoOrderMaterial`, `orderForJobCheck`, `orderShortfall`, `refreshMaterial` (the glass alone), `droppedMaterial` and `dropJob`, `hallStops` (the Glazing's stop); `production.ts` `canWorkOn` takes the glass whole at the start of the Glazing and stands without it |
| 2.5 the line off the stores | `types.ts` `LineContract.boardsReserved`, `glassReserved`; `lineContract.ts` `PER_WINDOW`, `openTo`, `lineShortOf`, `reserveLineMaterial`, `reserveEveryLinesMaterial`, `takeForWindow` in `makeWindow`, `officeOrdersLineMaterial` as a Restock of each kind, `runLineDay` (the windows hold first through `materials.ts` `reserveWindowsShortfalls`, then the lines), `answerLineOffer`, `lineOfferBody`; `ui/contracts.ts` `lineMaterialRows` (`Timber held`, `Glass held`) and the figures line |
| 2.6 deliveries for all three | `types.ts` `Delivery.material`; `materials.ts` `createDelivery`, `arriveDeliveries`, `loadWords`, `canUnload` (a kind with no room at all waits at the gate), `unloadIntoStock` (one path), `moveOverflowToStorage`, `storedWords`, `fetchFromStorage` (every kind at one fetch); `game.ts` the fetch chore's label, `deliveryCardBody` and its `NO_KIT_WORDS`, `cancelOrder`; `stations.ts` `unloadFarStation` by kind; `orders.ts` the Orders list's detail; `render/hall.ts` the pallet's words and the station cells by kind |
| 2.7 what the player reads | `ui/materials.ts` the three blocks (`stockBlock`, the fields `stockSheets`, `stockBoards`, `stockGlass`, the hint); `materials.ts` `StockLine.kind`, `stockKindShown`, `stockLine`, `stockLines`, `stockNumberFor` by kind; `constants.ts` `STOCK_KINDS`, `STOCK_LINE_NAME`, `STOCK_NUMBER_PREFIX`; `ui/jobCard.ts` `materialLine` (the glass figure, one button); `ui/board.ts` the tile's material line; `ui/dropCard.ts` the drop's figure from `droppedMaterial`; `ui/laptop.ts` and `ui/app.ts` the two new fields and the Restock click by kind |
| 2.8 what goes | `ORDER_GLASS`, `ORDER_LINE_TIMBER`, `ORDER_LINE_GLASS`; `orderGlass`, `orderGlassFor`, `orderGlassCheck`, `arriveGlass`, `GlassState`; `isBoards`; `storesHoldCheck`, `enquiryBoards`; `glassNotOrdered` and `boardsAtTheGate` (`warnings.ts`); every line material function of 2.5's first point and `LineGlassOnTheWay`, `LINE_GLASS_WINDOWS_MAX`, `LINE_ORDER_WINDOWS`. `tests/engine/t32Store.test.ts` searches `src/` for every one of them (`migrate.ts` aside, where the lift names the old fields it takes off) |
| section 4 the save | `migrate.ts` `liftToVersion48`, `putTheGlassInTheWindows`, `forgetTheLiftsMarks`, `giveTheLineItsFirstBatch` on the new counters, `FIRST_BATCH_WINDOWS` |

The new tests are four files, each with the Skylon Development Ltd header: `t32Racks` and `t32Store`
under `tests/engine/`, `t32Store` under `tests/ui/`, and (E2) `tests/scenarios/turn32.test.ts`. No
new file under `src/`.

## 2. The save

STATE_VERSION 48, once, in B2.

- **`liftToVersion48`** (`migrate.ts`, the raw lift beside `liftToVersion47`):
  - **The counters split.** `stock.boards` is the boards every timber job not completed held (its
    `sheetsReserved`) plus every line record's `boards`; `stock.sheets` is the old counter less that,
    never below nought; `stock.glass` is what the jobs and the lines give it below;
    `tempStorageSheets` as it was, `tempStorageBoards` and `tempStorageGlass` 0.
  - **The jobs.** Every job gets `glassUnits` (`glassForJob` of its `materialCost` and `timber`). A
    window past production (`awaitingTransport`, `completed`) with its glass `in` has it used. A window
    with its glass `ordered`, or `in` before its Glazing, has its units added to `stock.glass` and
    held for it, the glass on the glazier's way in at once, its price paid. `toOrder` holds nothing and
    its shortfall is ordered as any shortfall is. `none` is noughts. `glass` and `glassDay` go.
  - **The lines.** Each record's `boards` stay on `stock.boards` free (counted above), its `glass` and
    every entry of `glassOnTheWay` (its windows times `LINE_GLASS_PER_WINDOW`) go onto `stock.glass`
    free; the three fields go; a contract gets `boardsReserved` and `glassReserved` 0 and holds its
    week at its first open.
  - **The deliveries.** `material` is `boards` where `boards` was true, where `line` was set, or where
    the load's job is a timber job; `sheets` otherwise. A line's load on the road is a load of boards
    for stock (its `jobId` was already null). `boards` and `line` go.
- **`putTheGlassInTheWindows`**, the whole state step, gated `version < 48` and run after every raw
  lift: a window whose glass was `in` and whose current stage is the Glazing (`assembly`, the last of
  `TIMBER_STAGES`, so "the Glazing or after" short of past production) has its glass in the window,
  used and off the counter. The raw lift marks the windows it is to ask (`glassInBeforeTheLift`), and
  `forgetTheLiftsMarks` takes the mark off every job whatever the step could do, so a fragment of a
  state keeps its glass held and no mark is ever saved.
- **`giveTheLineItsFirstBatch`** (Turn 31's, gated `version < 44`, run after every raw lift so it
  finds the new shape) gives a v43 save's running line its 40 boards and 20 glass units on
  `stock.boards` and `stock.glass`, free, in place of the line's own fields. `FIRST_BATCH_WINDOWS` 20
  is the lift's own constant now that `LINE_ORDER_WINDOWS` is gone; the figures are still the
  constants that remain times it.
- **No cash moves, and no load is made in a lift** [TUNE: chat].

Asserted on raw saves in `tests/cloud/migrate.test.ts` (`a v47 save in this build`): the one counter
split with a window holding boards and its glass `in` before its Glazing and one at it; a window with
its glass ordered; a running line with boards, glass at module 6, glass on its way and a line load on
the road; a save with neither; and, in `a v43 save in this build`, the first batch on the counters.
The version pins flipped from 47 to 48: `tests/ui/saveCheck.test.ts`, `tests/engine/v67.test.ts`,
`tests/engine/types.test.ts`, `tests/cloud/v94Lanes.test.ts`, `tests/engine/v93Lines.test.ts` and the
twenty lifted versions and the `STATE_VERSION` pin of `tests/cloud/migrate.test.ts`.

## 3. Readings of the brief

Where the brief left a choice open, the simplest reading that fits the repo, each marked [TUNE] in
the code:

1. **One function for every kind, not one a kind.** The brief names `glassOnRack` and
   `glassStrandedBySale` beside `boardsOnStore`; the one store rule ("through the same functions taking
   the material as an argument, never through a copy") was read as folding all three into
   `stockOnItem(state, item)` and `stockStrandedBySale(state, item)`, the sheets' and the boards' own
   versions with them. What the sheet racks show and refuse is what they did.
2. **Two folders**, `Glass racks` and `Large glass racks`, as the two timber stores have one each.
3. **The large rack's sentence** `Holds five times a glass rack's units on twice its floor.` is the
   brief's own; its floor is in fact four times the small one's (8 m² to 2 m²), and the sentence was
   kept as written.
4. **The plate `7 / 40`** is read as the plate (`7`) and the name's count (`Glass rack: 7 / 40`)
   together, as a timber rack's (2.1: "the plate and the name's count on the hall").
5. **A job's own load is its own whether it fits or not**, for every kind, as the sheets' rule of
   Turn 20 has it: a window's boards past the stores' free places are held for it in the paid store
   until the fetch. Its glass in the paid store is held but not in hand: the Glazing waits for the
   fetch, as a cut waits for a sheet that is not on the rack.
6. **The line holds the windows left in the week in hand**, `lineWindowsAWeek` less
   `windowsThisWeek`, and no more: on a Friday it holds little, and the office's two days are read
   from what it could have (held, free and on its way), not from what it holds.
7. **The windows hold before the line at every open** (`reserveWindowsShortfalls` in `runLineDay`),
   so a line never takes the glass a window is short of; the sheet jobs are not asked there, so the
   sheets' order of the morning is what it was.
8. **A window's two loads say the road until both are at the gate** (`materialOrdered`, then
   `materialInYard`); a sheet job's one load says what it always said.
9. **The office's restock at the take** fills the stores' free places at once, as a Restock with
   nothing typed does: the shelter's 400 boards in one order on a big hall (question 3 below).
10. **The Restock's refusals** have a fourth, between the on its way and the cash, for a kind whose
    room is full and nothing on its way: `No room on the rack` (the sheets' of today), `No room on the
    timber stores`, `No room on the glass racks`.
11. **The Materials page** shows the boards' and the glass block once a store of their kind stands
    or anything of their kind is on the counter, on its way or in the paid store; the hint names only
    the kinds in the paid store.
12. **The lorry's card of a kind with no room** reads in the kind's words, the sheets' card as it
    was; a load of glass with no glass rack waits at the gate as a load of sheets with no rack waits.

## 4. Section 10, as built

| # | Chat's choice | Built |
| --- | --- | --- |
| 1 | a window's glass units: its glass share over £200, rounded up | `glassForJob`: 7 for a 9,000 casement window (3,600 of material, 1,260 of glass); the tile and the job read it; `materialCost` untouched |
| 2 | the boards on the sheets' ladder, the glass flat at £200 | `stockCostFor('boards', n)` is the ladder's; `glassUnitPrice()` is 200 from the line's own two functions; no ladder for glass |
| 3 | the racks' metres, days and halls; a window wants one, either family | 2 x 1 x 2 m (zone 2 x 2, 3 working days) and 4 x 2 x 2.5 m (zone 4 x 3, 5 working days), on the floor of any hall; `GLASS_RACK_WANTED` last of a window's list, either family through `TIMBER_STAND_INS` |
| 4 | the admin's ordering for the line, as a restock of each kind, for the line only | `officeOrdersLineMaterial`: at the open, at the take and after every window, when what the line could have of a kind is under two working days of its windows', the Restock of that kind with nothing typed, `, ordered by Anna`; never to the paid store; with no admin nothing, and the strip says `no timber` or `no glass` |
| 5 | gone with "identically" | every name of 2.8 gone from `src/`, asserted by a search |
| 6 | a bespoke window's boards ordered in, its glass from the racks | `reserveSheetsFor` holds nothing for a bespoke job; `reserveGlassFor` holds for it whatever its material |
| 7 | a window's glass taken whole when its Glazing starts | `drawGlassFor` in `canWorkOn`; `hallStops` and `canWorkOn` stand it `waiting for glass` while the racks cannot give all of it |
| 8 | the lift | as section 2 above |
| 9 | the insurer counts the glass; the burglar sheets only | `insuredStockValue` (sheets and boards at `SHEET_VALUE`, glass at 200); the burglar reads `freeFor(state, 'sheets')` |
| 10 | the badge on each kind's line, the weekly card the sheets' | `stockIsLow(state, kind)`, asked only while the kind has room; `checkLowStock` unchanged |
| 11 | the words | `glass units`; `Sealed glass units` `IGU-4-16-4`; `Timber boards` `TMB-63-RED`; `Sheets`, `Timber boards`, `Glass`; `20 glass units at £200 = £4,000`; `60 boards: 40 on the stores, 20 to storage at £150`; `Fetch 12 sheets, 30 boards and 5 glass units from storage` |

## 5. Found and left, and found and fixed

**Found and fixed** (the B2 review, before the commit):

- A window holding glass that lay in the paid store could pass its Glazing without taking it, and
  its units then turned free when it was completed: `hallStops` asked the racks only for a window
  short of what it held. It now asks them always, and `canWorkOn` stands the window when the draw
  fails.
- A job dropped while one of its loads stood at the gate took that load's unloading off the list,
  and the load stood at the gate for good (so on v95 for a sheet job; two loads a window made it
  likely). The unloading now stays on the list for stock, as a load still on the road lands [TUNE].
- The windows now hold before the line at the open, and a window short of its glass alone holds the
  free glass before the admin orders more (both were the line or the admin taking what a window could
  have had).

**Found and left:**

1. **Two lorries in one morning, and no labourer: the second card's `Unload now` does nothing.** The
   owner holds one task at a time, and the card's click is refused `Busy with Unload ...` without a
   word; the load stands until the player clicks its van. So it was on v95, rarely; from tonight a
   window's two loads and the office's restock of each come together every time. Putting the second
   unloading next in his queue (`queueTaskNext`, Turn 19's "Add as next") was built, and taken out
   again because it moved the pinned sheet playthrough (`tests/scenarios/playthrough.test.ts`, a day
   and its cash), which the brief does not allow tonight. The scenarios that play two loads keep a
   labourer, as many companies do. Question 1.
2. **A v95 save opens with no glass rack** (none could be bought): its glass is on the counter with no
   room. It is used as it lies, but a window whose glass was still to order has its glass ordered,
   and that load waits at the gate until a glass rack is bought; while it waits the window's `Order
   for this job` says `On its way already`. The office's glass restock for a line is refused `No glass
   rack`, so a lifted line stands with `no glass` once the lifted glass is used, the strip saying so.
3. **The engine's `RESTOCK` does not ask `restockCheck`**, as it did not for the sheets on v95: the
   page's button is locked, but a click that reached the engine past it would buy a kind with no kit,
   and the load would wait at the gate.
4. **The words of a count of one** are singular for every kind from tonight: `1 sheet for stock`,
   `Temporary storage for 1 sheet`, `Fetch 1 sheet from storage` (v95 wrote `1 sheets`). No pound
   moves and no pinned test read the plural.
5. **The day end card and the laptop's home**: the day end card's `Deliveries tomorrow` names every
   load in sheets (`7 sheets` for a load of seven glass units), because the day's record keeps the
   counts alone and changing it would change the save's day record beyond section 4; the laptop's
   home says the free sheets as it did, and its `Stock` count of low lines counts every kind's badge.
6. **The pallet at the gate** is Turn 13's placeholder for every load, a load of glass among them, and
   the glass racks are drawn as kit with no picture until G1 lands (`docs/art/REQUESTS-T32.md`).

## 6. Questions for Piotr

1. **The second lorry** (5, found and left 1): should the owner take the next unloading by himself
   when he finishes the first, as the queue does? It is one line, and it moves the sheet playthrough
   by a day.
2. **Section 10's eleven choices**, as built in section 4 above: each is chat's, and none is yours yet.
3. **The office's first restock** for a line on a big hall fills the shelter's 400 boards at once
   (£60,000, at the ladder's £150 a board): is that the office you want, or should it buy two days of
   windows and no more?
4. **Parked, still**: an office admin who restocks the sheets for the sheet contracts as he does for
   the line; the burglar and the boards and the glass; the outside sheet store of 1,000 sheets (S1).
