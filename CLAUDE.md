# Turn 32: one store for every material: sheets, boards and glass bought and kept the same way, the glass racks, and the line fed from the stores

Woodwork Empire. Autonomous session brief for Claude Code (cloud, one writer, serial, effort
high). Owner: Piotr. Programmer: Claude. Spec author: Claude (chat), written 13.10.2026 from
Piotr's words of 12.10 evening and 13.10 morning, against main at v95 (commit `7735455`).

Read this whole file (first line must say "Turn 32"; if the root CLAUDE.md does not, stop and
report), then REPORT-T31.md section 0, then docs/notes-t31.md, docs/notes-v93.md, docs/notes-v94.md
and docs/notes-v95.md, then docs/ui-style.md, then docs/art/SPRITES.md sections 1 to 3 and 13, then
the archived briefs in docs/ (docs/turn-31-brief.md is the last, and this ZIP put it there). Where
files disagree, this one wins. All standing rules apply (no em or en dashes anywhere, scope 1:1, one
code path, constants never in the UI, [TUNE] for every figure you choose and [PIOTR] for his, kill
background processes, PR without merge, end the session, no PR watching, npm run check gated on its
own exit code, every click single, one APP_VERSION bump, delete the old track and never write a
parallel one, flip a test and never keep it beside a new one, the Skylon Development Ltd header on
every new code file). The rule relaxed in Turn 26 stays relaxed [PIOTR, 01.10]: a scenario figure
that moves is restated with ONE line of reason; a test that pins an exact pound of a played month
may be loosened to a range when the exact figure says nothing about the rule under test, and the
comment says so.

Before a line is written: clone, read what is there, and build with it. Every screen, card, row,
button and strip line this turn needs already has its kind in the repo: the Materials page's head
row with its field, its ladder line, its storage line and its Restock button, and its stock lines;
the job card's material line; the line's running block and its count rows; the timber stores'
specs, catalogue cards, stations and plates; the lorry's card; the paid store and its fetch chore.
Nothing here asks for a second version of any of them, and none is to be written [PIOTR, 18.09: one
game, one look].

Precondition. main carries v95: APP_VERSION 'v95', STATE_VERSION 47. If either is not so, stop and
report. Turn 31 ended green (2,965 tests in 307 files). v93, v94 and v95 were built in chat after it
and checked with the type check, the lint and the tests they touched only: task A0 runs the whole
suite on v95 before anything is touched.

The four rules of 18.09 bind every agent: one game, one look; nothing visual without a mockup; no
sound without a recorded file; every modal, popover and list has the cross, Escape and click
outside (the event card with two choices is the game's standing exception). The mockups this turn
needs are in section 9, into docs/mockups/t32/ before the code that makes them true. Piotr asked
for this turn in one go and has not seen those mockups: they are built only of what the game
already draws, and the report shows each beside its nearest existing screen.

**What chat decided for Piotr and he has not yet confirmed** is marked [TUNE: chat] throughout and
gathered in section 10. His own words are [PIOTR].

## 0. What this turn is for (PIOTR, 12.10 evening and 13.10 morning)

Piotr played v95 and said: "in this game there is no storage for glass at all, and ordering the
timber for the windows and the glass should work identically to the sheets. I do not understand
why you keep it in another place and why it is a different system of ordering. As much storage as
we have, that much material there should be, like the sheets."

Chat checked the code of v95 and found three systems where there should be one:

1. **Sheets**: stand on the sheet racks; bought ahead for stock with Restock up to the racks' room
   or past it; a job holds what it needs from the free stock and its shortfall is ordered for it,
   by the owner's button or by the office admin; what does not fit on the racks goes to the paid
   store for the night and is fetched in the morning.
2. **Boards**: never stock. Ordered only for one timber job (or by a line's own button), on the
   same counter as the sheets (`state.stock.sheets`) although they lie on the timber stores; a load
   comes in whole or waits at the gate; a job is refused on the board when the stores could not
   hold its boards even empty.
3. **Glass**: no place in the hall at all. Ordered for one job from the glazier, who carries it to
   the benches the next working day; a line's glass stands at its module 6, for 40 windows at most,
   ordered by the line's own button.

Chat proposed one system, the sheets' system, for all three materials, and Piotr answered (13.10):

- A glass rack for 40 glass units at £1,500 and a large one for 200 at £6,000, and until the art
  side draws them the game draws them as it draws any kit with no picture: **"yes"**.
- What a glass unit is and costs: **"no, the prices and the quantity of glass are already set by
  the existing code for the production line"**. So nothing new is invented: a glass unit is the
  glass of one window, at what the line's code makes it, £200 (`lineGlassPerWindowCost`: the
  line's £600 of a window less its two boards at `SHEET_VALUE`), and a window takes one
  (`LINE_GLASS_PER_WINDOW`). How many units a timber job takes is derived from those and from the
  glass share the job's material already has (2.4) [TUNE: chat].
- Boards and glass that do not fit go to the paid store, as sheets do: **"yes"**.
- Glass comes by lorry and is unloaded, as sheets are: **"yes"**.
- The line loses its two order buttons and the 40 windows' glass at module 6, and takes its boards
  and glass from the stores as a standing contract takes its sheets: **"yes"**.
- As a turn for Claude Code: **"yes, give the ZIP"**.

What this turn is not: any change to a sheet job's material, a sheet contract's material, the
sheets' price ladder, the paid store's fee, a timber job's stages, nights or deadline, the line's
contract's price, minutes, pallet, offer, books or forklift, the timber contracts of Turn 29 (the
client's own timber and glass), the solid wood of a sheet product (the oak table's timber is still
ordered for its job and lies on the sheet racks, as today), any machine, any wage, the tax, the
loan, the bank, the hall's extensions; no picture drawn by an agent.

## 1. Rules restated (short)

Everything from Turns 1 to 31 and the chat fixes to v95. Tonight in addition:

- APP_VERSION = 'v96'. STATE_VERSION 48, once (section 4); every save that loads today loads.
- **One store, three materials.** Whatever the sheets do, the boards and the glass do, through the
  same functions taking the material as an argument, never through a copy of them. Where a rule of
  Turns 28, 29 or 31 made the boards or the glass behave otherwise, it goes, and 2.8 lists each.
- **A job takes as many men as the boss puts on it.** Nothing of `addToJob`, `assignJob` or
  `canBuild` is touched.
- **The sheet department is not touched**: what a sheet job or a sheet contract holds, draws,
  orders and pays is what it was, to the pound, in every pinned scenario.
- **No agent draws.** The two glass racks have no picture tonight, and the game draws them as it
  draws any kit whose picture has not landed (2.1).

## 2. Changes to the design (the contract)

### A. The suite

**2.0 A0.** Run `npm run check` on main as it stands. A failing test is handled as Turn 27's A0
handled it: a moved figure re-pinned with one line of reason, a real fault fixed if the fix is plain
and otherwise left red, that thread put first in section 0 of the report. One commit, or none.

### B. The store

**2.1 The glass racks [PIOTR: "yes"].** Two families, in the timber stores' shape (two specs of one
class each, as `timberRack` and `timberShelter` are), in the catalogue's `storage` tab, a folder of
their own, `Glass racks`:

| Spec | Name | Holds | Price | Footprint w x d x h | Zone | Delivery |
|---|---|---|---|---|---|---|
| `glassRack` | Glass rack | 40 glass units | £1,500 [PIOTR] | 2 x 1 x 2 m [TUNE: chat] | 2 x 2 [TUNE] | 3 working days [TUNE] |
| `glassRackLarge` | Large glass rack | 200 glass units | £6,000 [PIOTR] | 4 x 2 x 2.5 m [TUNE: chat] | 4 x 3 [TUNE] | 5 working days [TUNE] |

- Both stand on the hall floor, in any hall [TUNE: chat]; neither is rear or yard kit. A new field
  `glassCapacity` on the spec and the class, read through `glassCapacityOf` beside
  `sheetCapacityOf` and `boardCapacityOf`; nought for everything else.
- Everything the timber stores have, the glass racks have, through the same tables: an entry in the
  table of hours (100,000, they book none), `STATION_TABLE` (`freeSide`, as every rack), the plate
  and the name's count on the hall (`rackCount`, `glassOnRack(state, item)`: the glass spread over
  the racks in the order they were bought, as `boardsOnStore` spreads the boards), the sale's
  stranding rule (`glassStrandedBySale`, the boards' rule), and never serviced (category
  `storage`). Effect texts in the timber stores' tone [TUNE]: `Holds the glass units of the windows
  and doors on the hall floor, upright in their frames.` and `Holds five times a glass rack's units
  on twice its floor.`
- **The board asks for one.** A window or a door wants a glass rack as it wants a timber store, last
  of its list: `wantedKit` adds `GLASS_RACK_WANTED` (`glassRack`) after `TIMBER_STORE_WANTED`,
  `wantedName` names it `glass rack`, and either family satisfies it (`TIMBER_STAND_INS` gains
  `glassRack: ['glassRackLarge']` and `glassRackLarge: ['glassRack']`) [TUNE: chat].
- **No picture.** `spriteKey` `glassRack` and `glassRackLarge`, and no file: the hall draws each as
  `objectArt` draws kit with no picture (its last branch: the flat box in the kit's colours, with
  its name), and the catalogue's card shows the empty picture slot the cutter sets showed. No entry
  in `PLACEHOLDER_SPRITES`, no file in `public/sprites/`, nothing drawn. The art side is asked for
  them in E1 (2.9).

**2.2 Three counters [PIOTR: "as much storage as we have, that much material, like the
sheets"].** `StockState` becomes:

```ts
export interface StockState {
  sheets: number;
  boards: number;
  glass: number;
  tempStorageSheets: number;
  tempStorageBoards: number;
  tempStorageGlass: number;
}
```

and a new type `StockKind = 'sheets' | 'boards' | 'glass'` names the three wherever one function
serves all three [TUNE: the names]. `MaterialKind` (a template's material, `sheet` or `solidWood`)
is not touched.

- **Where each lies**: the sheets on the sheet racks (`rackCapacity`), the boards on the timber
  stores (`boardRoom`), the glass on the glass racks (`glassRoom`, new, the same sum over
  `glassCapacityOf`). One function gives a kind's room (`roomFor(state, kind)`) and one its free
  places (`freeRoomFor(state, kind)`: the room less what is on that counter, never below nought),
  and the three old ones that do this for one kind (`stockFree`, `freeBoardRoom`) are folded into
  them.
- **The boards' own counter.** `state.stock.sheets` holds sheets only from tonight.
  `sheetsOnCounter` (the counter less `boardsHeld`) and `boardsHeld` as a count of what is on the
  counter go: the sheets are `state.stock.sheets` and the boards `state.stock.boards`. Every reader
  of the old pair reads the counter of its kind (the racks' and the stores' plates, the Materials
  page, the rack's sale, the low stock card, the bubble that reads the sheets).
- **Held and free, per kind**: `reservedFor(state, kind)` and `freeFor(state, kind)` in place of
  `reservedSheets` and `freeSheets` for every caller that is not the sheets', and the sheets' callers
  read `kind` `sheets`, so what a sheet job and a sheet contract can hold is to the sheet what it
  was. What holds what:

| Kind | Held by |
|---|---|
| sheets | a sheet job's `sheetsReserved` (`job.timber` not true), a sheet contract's `sheetsReserved` |
| boards | a timber job's `sheetsReserved` (its boards, as today), a running line contract's `boardsReserved` (2.5) |
| glass | a timber job's `glassReserved` (2.4), a running line contract's `glassReserved` (2.5) |

- **The insurer** counts all three (`insuredStockValue`): the sheets and the boards at
  `SHEET_VALUE`, the glass at `glassUnitPrice()` (2.3). The boards are on the insured value today
  through the shared counter; the glass is new on it [TUNE: chat].
- **The burglar** takes the free sheets as today and nothing of the other two [TUNE: chat].

**2.3 Buying for stock: Restock for each kind [PIOTR: "identically to the sheets"].**

- `RESTOCK` carries the kind: `{ type: 'RESTOCK'; kind: StockKind; sheets?: number }` (the count
  keeps its field name), and `restockSheets`, `restockSplit`, `restockCheck`, `buyStock` and
  `pendingStockSheets` take the kind. Each does for the boards and the glass exactly what it does
  for the sheets: the typed number whole, or with nothing typed what fills that kind's free places
  less what of that kind is already on its way for stock; the split onto the stores and into the
  paid store, quoted before the click; the refusals in the same order, the first in the kind's own
  words: `No shelving yet` (sheets, as today), `No timber store` (boards), `No glass rack` (glass)
  [TUNE]; `N boards are on the way`, `N glass units are on the way`; `Not enough cash`.
- **The price.** The boards on the sheets' ladder (`sheetPriceFor`, `stockCostFor`), which is what a
  timber job's own order of boards already pays today (`orderForJobCost`) [TUNE: chat]. The glass
  at one price, the line's: `glassUnitPrice()`, a new function in `materials.ts` written from the
  line's constants as `lineGlassPerWindowCost` is (`LINE_WINDOW_PRICE` x `LINE_MATERIAL_SHARE` less
  `LINE_BOARDS_PER_WINDOW` x `SHEET_VALUE`: £200), and `lineGlassPerWindowCost` goes, its readers
  reading this [PIOTR: "the prices are set by the existing code for the line"]. No ladder for glass.
- **The ledger**: `40 sheets for stock` as today, `40 boards for stock`, `20 glass units for stock`,
  each on the material line; with `, ordered by Anna` when the office placed it (2.5).
- **The low stock badge** on each of the three stock lines, under the same `LOW_STOCK_SHEETS`, asked
  only while that kind has a room (`stockIsLow(state, kind)`) [TUNE: chat]. The weekly low stock
  card stays the sheets' alone, in its words of today [TUNE: chat].

**2.4 A timber job's boards and glass come off the stores [PIOTR: "ordering the timber for the
windows and the glass should work identically to the sheets"].**

- **How many.** The boards as today (`boardsForJob`, the line's saving and all). The glass units:
  `glassForJob(materialCost, timber)`, the job's glass share (`glassCostOf`, `GLASS_SHARE` of its
  material, as today) over `glassUnitPrice()`, rounded up, nought for a job that is not timber
  [TUNE: chat]: a 9,000 casement window job has 3,600 of material, 1,260 of it glass, so 7 glass
  units; the board's tile and the job read the one function. The job's `materialCost` is not
  touched, so its price, its labour and its books are what they were.
- **The job's fields.** `sheets`, `sheetsUsed` and `sheetsReserved` stay and are its boards, as
  today. `glass: GlassState` and `glassDay` go; in their place `glassUnits` (what it needs),
  `glassReserved` and `glassUsed`, all nought on a job that is not timber. `GlassState` goes.
- **Held at the click, as a sheet job's sheets are.** `takeEnquiry` holds the job's boards from the
  free boards and its glass from the free glass at once (`reserveSheetsFor` serves the boards of a
  timber job as it serves the sheets of a sheet job: its guard becomes a sheet job or a timber job,
  not bespoke, so the oak table, solid wood and not timber, still holds nothing and is ordered in as
  today; `reserveGlassFor` beside it), and every
  unloading, fetch from the paid store and restock lets the jobs with a shortfall hold what they
  can, in the order they were taken, as `reserveShortfalls` does for the sheets, then the line
  (2.5). A bespoke timber job's boards are never off the stores and are ordered in, as a bespoke
  sheet job's sheets are; its glass is the stores' glass [TUNE: chat].
- **The shortfall** is `shortfallOf(job)` for its boards (as today) and `glassShortfallOf(job)` for
  its glass. A job is `ready` on its boards, as today; its glass is wanted at its Glazing (below).
- **Ordered as a sheet job's shortfall is.** `Order for this job` orders both shortfalls in one
  click: the boards on one lorry at the ladder's price as today (bespoke uplift and days as today),
  the glass on another at `glassUnitPrice()` a unit, both in at the next working day's open
  (`deliveryDay`, standard; glass is never bespoke), each paid on the material line at the click:
  `Material for Oak Lane: boards` and `Material for Oak Lane: glass` [TUNE] (a sheet job's line is
  `Material for ...` as today). `orderForJobCheck`
  says `Nothing short` when neither is, and `On its way already` while any load of the job is not
  unloaded. `orderForJobCost` is the two together, and the button prints that sum. The office admin
  orders both by himself at the same minute he orders the boards today (`autoOrderMaterial`), with
  his name in both lines. A shortfall of glass alone (the boards in hand) is ordered the same way.
- **Used at the Glazing.** The job takes its whole glass off the racks the minute its Glazing (the
  `assembly` stage) starts: what it holds first, then free glass. A job at its Glazing that cannot
  take all its glass stops there, `waiting for glass`, as it does today (`hallStops`), and moves on
  the minute it can. Nothing else of the stage changes.
- **Dropped** (`dropJob`): a timber job's boards and glass are dealt with exactly as a sheet job's
  sheets are, each on its own counter: what it took off the stores and did not use goes back on
  them free, and what was ordered in for it is written off as a sheet job's is. The Turn 29 branch
  that took the boards off the counter and called the job's loads off goes, and the glass written off
  as `Glass written off` goes with the glass state. The drop card's figure reads the same rule.

**2.5 The line takes its boards and glass from the stores [PIOTR: "yes": as a standing contract
takes its sheets].**

- **What goes**: the two buttons `Order timber` and `Order glass` and their row and reasons; the
  actions `ORDER_LINE_TIMBER` and `ORDER_LINE_GLASS`; `orderLineTimber`, `orderLineGlass`,
  `lineTimberCheck`, `lineGlassCheck`, `lineTimberBatch`, `lineTimberBatchCost`,
  `lineGlassBatchCost`, `lineBoardsOnTheWay`, `lineGlassOnTheWay`, `arriveLineGlass`,
  `lineGlassWindows`, `writeOffLineMaterial`; the line's own `boards`, `glass` and `glassOnTheWay`
  (`LineGlassOnTheWay` with them); `LINE_GLASS_WINDOWS_MAX` and `LINE_ORDER_WINDOWS`; a delivery's
  `line` mark and every branch that reads it (the line's load in `unloadIntoStock`,
  `pendingStockSheets`, `loadWords`, `lineLoadInWords`, the lorry's card, the unloading's label).
- **What it holds**, as a sheet contract holds the week's sheets (`reserveContractSheets`): a running
  line contract (`LineContract`, two new fields `boardsReserved` and `glassReserved`) holds, from the
  free boards and the free glass, what the windows left in the week in hand want: `lineWindowsAWeek`
  less `windowsThisWeek`, times `LINE_BOARDS_PER_WINDOW` and `LINE_GLASS_PER_WINDOW`. It holds at the
  open of every working day (`runLineDay`, after the jobs have had theirs, as `runContractDay` holds
  the sheet contracts' after them), the minute it is taken, and after every unloading, fetch and
  restock, after the jobs. What it holds goes back free when the contract ends, by `End it` or by the
  line's sale: the contract is gone and its fields with it.
- **What a window takes.** `makeWindow` takes 2 boards and 1 glass unit off the counters, out of what
  the contract holds first, then the free ones, as `drawContractSheets` does. `lineShortOf` asks the
  same: what it holds and what is free, of each. Nothing else of the window changes: its price, its
  books (the £600 of material used, as today), its pallet.
- **The office still orders it [PIOTR, 11.10: "the office admin orders by himself when two days are
  left", kept] [TUNE: chat: as a restock].** `officeOrdersLineMaterial` is what it was, on the new
  store: while a line's contract runs and an office admin is on duty, at the open of every working
  day, the minute the contract is taken and after every window made, when the boards the line could
  have (what it holds, the free boards, and the boards on their way for stock) are fewer than two
  working days of its windows' boards (`lineReorderWindows` x `LINE_BOARDS_PER_WINDOW`), he places
  the boards' Restock with nothing typed, which fills the stores' free places less what is on its
  way and so never goes to the paid store, when `restockCheck` allows it and it buys at least one;
  the same for the glass. His name in the ledger line. With no admin on duty nothing happens, and the
  strip says why (`lineNeedsMaterial`, as today). The admin restocks for the line and for nothing
  else: a sheet job, a timber job and a sheet contract are as they were.
- **A line sold** writes nothing off: the boards and glass are the company's stock, and what the
  contract held is free again.
- **The offer card's sentence** `The timber and the glass cost £600 a window, ordered ahead: on the
  Contracts tab, or by the office.` becomes `The timber and the glass cost £600 a window, taken from
  your timber stores and glass racks: restock them on the Materials page, or the office does.`; the
  running block's `£1,500 a window; the timber and the glass £600 a window, ordered ahead` becomes
  `... £600 a window, from the stores`; its two rows become `Timber held: 24 boards, for 12 windows`
  and `Glass held: for 8 windows` (what the contract holds), and the row of buttons and its reasons
  go. Its `Standing still` row and the strip's `lineNeedsMaterial` keep their words.

**2.6 Deliveries, unloading and the paid store, for all three [PIOTR: "yes" to the lorry and to the
paid store].**

- **A delivery carries its kind.** `Delivery.material: StockKind` in place of `boards?: true` and
  `line?: number` [TUNE: the name]. `createDelivery` takes it; `isBoards` goes, every reader asking
  `delivery.material`. A load for a job is that job's (`jobId`), a load for stock has none, as today.
- **Glass by lorry.** A load of glass comes at the open of the next working day
  (`GLASS_DELIVERY_WORKING_DAYS`, 1, which `deliveryDay` reads for glass) on a lorry like any load:
  `arriveDeliveries` puts its unloading on the task list (`Unload 7 glass units`), the lorry's card
  is raised as for any load, and the unloading takes `unloadMinutes` of its count as any load does
  [TUNE]. `arriveGlass` and the glazier go.
- **Unloaded as sheets are** (`unloadIntoStock`, one path for all three): what fits on that kind's
  free places goes on its counter, the rest goes to that kind's paid store at `TEMP_STORAGE_COST` for
  the load (`moveOverflowToStorage`, `Temporary storage for 12 boards`), a job's own load is held for
  that job first, and then every shortfall holds what it can (2.4, 2.5). The Turn 29 rule that a load
  of boards comes in whole or waits at the gate goes. A load of a kind with no room at all (no
  timber store, no glass rack) waits at the gate as a load of sheets with no rack waits, and the
  lorry's card says so in its kind's words: `... there is no timber store to put them on. Buy one
  from the catalogue.`, `... there is no glass rack to put them on. Buy one from the catalogue.`
- **The fetch.** One chore in the morning brings back all three from the paid store
  (`fetchFromStorage`), its label naming what it brings: `Fetch 12 sheets, 30 boards and 5 glass
  units from storage` [TUNE]. The Materials page's hint names all three.
- **Where the unloading walks.** `unloadFarStation`: a load of sheets to the sheet rack as today, of
  boards to the first timber rack or the gate as today, of glass to the first glass rack of either
  family on the floor (`STATION_GLASS_RACK`) [TUNE].

**2.7 What the player reads.**

- **The Materials page** (mockup 1). The one head row of today, `Stock` with the sheets' field and
  Restock, becomes three blocks in the same markup, one a kind, in the order sheets, boards, glass:
  each a `row stock-head` with its name (`Sheets`, `Timber boards`, `Glass`) and its control (the
  field, the ladder line or the glass's price line `20 glass units at £200 = £4,000`, the storage
  line, the Restock button), and under it the kind's stock line (thumbnail, name, number, `Free`,
  `Reserved`, `Total N of room`, the badge). The fields are `stockSheets` (as today),
  `stockBoards` and `stockGlass`, each remembered by the page as the sheets' field is. The boards'
  block and the glass block are shown once a store of their kind stands or anything of their kind is
  on the counter, on its way or in the paid store, as the boards' row is today [TUNE]. The boards'
  stock line takes the place of today's boards row; the per line glass rows go. Names and numbers
  [TUNE wording]: `Timber boards`, `TMB-63-RED`; `Sealed glass units`, `IGU-4-16-4`; thumbnails
  `thumb.solidWood` and `thumb.glass` through the one placeholder function, as today. The
  `No shelving yet` warning stays the sheets'.
- **The job card's material line** (mockup 2): the boards' figure as today (`12 of 12 boards of
  timber in hand`, or red `5 of 12 boards of timber short`), and beside it the glass's in the same
  classes (`7 of 7 glass units in hand`, or red `3 of 7 glass units short`), one `Order for this job`
  button with the sum. The hint `Timber is ordered for the job: the racks hold sheets.` goes, and so
  do `Glass not ordered`, `Glass ordered, here on ...`, `Glass is in` and the `Order glass` button.
- **The board's tile**: a window's or a door's material line reads `12 boards and 7 glass units of
  material` [TUNE]; the red line `N boards, and the timber stores hold M` goes with its rule (2.8).
- **The strip**: `glassNotOrdered` and `boardsAtTheGate` go from `WARNING_ORDER` and from the code
  (2.8). Nothing new.
- **The hall**: each glass rack drawn as kit with no picture is, its name and its plate `7 / 40`, as
  a timber rack's.

### C. What goes, in one list

**2.8 The rules of Turns 28, 29 and 31 that made the boards and the glass behave otherwise go**
[TUNE: chat: each follows from Piotr's "identically"; section 10 repeats them]:

1. The glazier: `ORDER_GLASS`, `orderGlass`, `orderGlassFor`, `orderGlassCheck`, `arriveGlass`,
   `GlassState`, `job.glass` and `job.glassDay`, the job card's glass figures and button, the
   `glassNotOrdered` strip line, the drop's `Glass written off` line.
2. The boards' "whole or at the gate": the branch in `unloadIntoStock`, `canUnload`'s whole load
   question, the `boardsAtTheGate` strip line, the lorry card's `They wait at the gate until a job
   uses its boards or another store is bought.`
3. The board's refusal of a window the stores could not hold even empty: `storesHoldCheck`, its
   tile line and its place in `canAccept`. A job bigger than the stores is taken as a sheet job
   bigger than the racks is, and what does not fit goes to the paid store.
4. The line's own material (2.5's first point), and the Materials page's glass rows of each line.
5. The one counter of sheets and boards (2.2).

Each goes with its tests flipped to say what is true now, never kept beside them.

### D. The art side

**2.9 The request.** `docs/art/REQUESTS-T32.md`: G1, the two glass racks, one class each, views 0
and 90, in the contract of SPRITES.md sections 1 to 3: the glass rack 2 x 1 x 2 m (file 160 by
184, anchor 104, 176) and the large glass rack 4 x 2 x 2.5 m (file 304 by 280, anchor 200, 272),
each holding upright sealed units in an A frame or a slotted rack, in the timber racks' steel, no
floor, no shadow. Checked against `spriteFileSize` and `spriteAnchorIn` before it is written; the
figures in the request are the code's. Nothing else is asked tonight; S1 (the outside sheet store)
is named as still owed.

## 3. How to run this session

**One writer.** Only the lead agent edits files under `src/` and `tests/`, changes STATE_VERSION or
APP_VERSION, commits and pushes, and it does the tasks strictly in the order of section 5, one at a
time. No worktrees and no parallel branches.

**Sub-agents are allowed, under that one rule.** They may only do work that touches no file another
agent is touching: read the repo and report; build the mockups of section 9 under
docs/mockups/t32/; draft test cases; review each finished task's diff against this brief and
section 7 before its commit; write docs/notes-t32.md and docs/art/REQUESTS-T32.md. A sub-agent
never commits, never asks a question and never waits for an answer, and never runs `npm test`,
`npm run build` or `npm run check` while the lead's own check is running (`tests/ui/app.test.ts`
plays the game in real time).

**Do not stop and do not ask.** Piotr is not watching and nobody will answer a question. Where this
brief leaves a choice open, take the simplest reading that fits what is already in the repo, mark it
[TUNE] in the code and list it in the report. The only reasons to stop are the brief's own: the
first line of CLAUDE.md is not "Turn 32", or APP_VERSION on main is not 'v95'. A red test is not a
reason to stop the session: handle it as 2.0 says.

**Push after every task**, so that nothing is lost if the session ends early. If the session runs
short: stop cleanly at the end of a task, never in the middle of one, and say first in section 0 of
the report which tasks were not reached. Section 5 is in the order of what matters and every
stopping place is a whole game.

## 4. State

STATE_VERSION 48, once, in B2. A raw lift `liftToVersion48` in `src/engine/migrate.ts`, gated by
the version as every lift, then one whole state step after the lifts where it needs the whole state.
A v47 save opens with:

- **The counters split.** `stock.boards` is the boards the timber jobs held (every job with `timber`
  true and not completed, its `sheetsReserved`) plus every line record's `boards`; `stock.sheets`
  is the old counter less that, never below nought; `stock.glass` is what 2.4 and the line give it
  below; the three `tempStorage` fields with `tempStorageSheets` as it was and the other two 0.
- **The jobs.** Every job gets `glassUnits` (`glassForJob` of its `materialCost` and `timber`),
  `glassReserved` and `glassUsed`, and then, by what its glass was:
  - `in`, and its Glazing has started (its current stage is `assembly` or after, or it is past
    production, as `currentStage` and the job's stage read it): `glassUsed` = `glassUnits`, nothing
    on the counter for it; the glass is in the window.
  - `in` before its Glazing, or `ordered`: its glass units are added to `stock.glass` and held for
    it (`glassReserved` = `glassUnits`); the glass on the glazier's way is in at once, its price
    already paid [TUNE: chat: no load is made in a lift].
  - `toOrder`: it holds nothing, and its shortfall is ordered as 2.4 orders it.
  - `none`: noughts.
  `glass` and `glassDay` go from every job. Where telling the Glazing apart needs the whole state, it
  is done in the whole state step and not in the raw lift.
- **The lines.** Each line record's `boards` stay on `stock.boards` as free boards (counted above),
  its `glass` and every entry of its `glassOnTheWay` go onto `stock.glass` free (its price already
  paid) [TUNE: chat], and `boards`, `glass` and `glassOnTheWay` go from the record. A running
  contract gets `boardsReserved` and `glassReserved` 0, and holds its week at its first open.
- **The deliveries.** Each gets `material`: `boards` where `boards` was true, where `line` was set,
  or where its job is a timber job; `sheets` otherwise. A line's load on its way becomes a load of
  boards for stock (`jobId` null), its price already paid. `boards` and `line` go.
- **Turn 31's first batch** for a v43 save whose line contract ran (`giveTheLineItsFirstBatch`, the
  whole state step gated `version < 44`, which runs after every raw lift and so finds the new shape):
  it gives the 40 boards to `stock.boards` and the 20 glass units to `stock.glass`, free, in place of
  the line's own fields [TUNE: chat]. The figures stay written from the constants that remain
  (`LINE_BOARDS_PER_WINDOW` and `LINE_GLASS_PER_WINDOW` times 20); `LINE_ORDER_WINDOWS` is gone, so
  the 20 is the lift's own constant with its line of reason.
- Nothing else changed.

Every save that loads today loads, the fixtures among them. Assert the lift on raw saves in
tests/cloud/migrate.test.ts: one with a timber job holding boards and its glass in, one with its
glass ordered, one with a running line holding boards, glass and glass on its way and a line load on
the road, one with neither (the defaults); and a v43 save with a running line (the first batch on
the counters). Say in the report what the lift does and list the version pins flipped.

## 5. Task queue, in order

Branch turn-32-one-store from main. One commit per task, npm run check green on its own exit code
before each, the branch pushed after each, two report lines per task in REPORT-T32.md.

T32-A0 The suite on v95 (2.0).
T32-A1 Housekeeping and v96: docs/turn-31-brief.md is already in docs/ (this ZIP put it there),
this file as CLAUDE.md, the README's lines (the brief, REPORT-T32.md, REQUESTS-T31.md and
REQUESTS-T32.md), APP_VERSION 'v96' and its pins (the pins of STATE_VERSION go with B2).
T32-A2 The mockups of section 9 into docs/mockups/t32/ with a README.
T32-B1 2.1: the two glass racks, their capacity, tables, stations, plates, sale rule, and the board's
wanting one. No state change.
T32-B2 2.2 to 2.8: the three counters, Restock for each kind, the timber job's boards and glass off
the stores, the line off the stores and the office's restock, the deliveries, the unloading and the
paid store for all three, every page they touch, everything 2.8 lists gone, with STATE_VERSION 48
and the lift of section 4. One task: a game with half of the store moved is not a whole game.
T32-E1 notes (docs/notes-t32.md: where each rule lives, the save, section 10 as built, what was
found and left, questions for Piotr) and docs/art/REQUESTS-T32.md (2.9).
T32-E2 scenarios, one line a moved figure, and three new ones. (mmm): a company in the 800 m² hall
with one timber rack (40 boards) and one glass rack (40 units) restocks 60 boards and 30 glass units
(the ladder's price for the boards, £200 a unit for the glass, the 20 boards past the rack's room
into the paid store and fetched the next morning), takes a casement window job that
holds 12 boards and 7 glass units at once, makes it through its Glazing taking its glass there, and
a second one, taken with the stores empty, has its shortfall of both ordered by the office admin and
in on the next working day's two lorries. (nnn): a line on its contract with an office admin and
both stores runs a played month without standing for material, every board and glass unit it used
bought by his restocks; the same with no admin stands with `no timber` once the stores run dry, and
a player's Restock of each sets it going. (ooo): a v95 save of a running line with its boards, its
glass at module 6, glass on its way and a timber job with its glass ordered opens on v96 and plays a
week: nothing lost, nothing bought twice, the line and the job carry on.
T32-E3 cross check (section 7). T32-E4 look and shoot: the pictures of section 7 into
docs/report-t32/.
T32-E5 report (REPORT-T32.md, section 0 first: what was not reached, what is red, section 10's list
with what was built) and PR titled `Turn 32: one store for every material: sheets, boards and glass
bought and kept the same way, the glass racks, and the line fed from the stores`, do not merge, end
the session.

**Tests chat already knows will move.** Found by name on v95; a start and not the whole. Each is
flipped to say what is true now, never kept beside a new one.

- A1: `tests/ui/saveCheck.test.ts` and `tests/ui/version.test.ts` (every pin of 'v95').
- B2, the pins of STATE_VERSION 47: `tests/ui/saveCheck.test.ts`, `tests/engine/v67.test.ts`,
  `tests/engine/types.test.ts`, `tests/cloud/v94Lanes.test.ts`, `tests/engine/v93Lines.test.ts`
  and the lifted versions in `tests/cloud/migrate.test.ts` (`contracts.test.ts`'s `toBe(47)` is a
  count of minutes, not the version: leave it).
- B2, the line's own material: `tests/engine/t31Material.test.ts`, `tests/ui/t31Material.test.ts`,
  `tests/engine/v93Lines.test.ts`, `tests/scenarios/turn31.test.ts`, `tests/scenarios/turn30.test.ts`,
  `tests/engine/t30Contract.test.ts`, `tests/engine/t30Upgrades.test.ts`, `tests/ui/t30Line.test.ts`,
  `tests/render/t30Sheets.test.ts`, `tests/engine/t31Books.test.ts`, `tests/engine/t31Shelter.test.ts`.
- B2, the glazier and the glass state: `tests/engine/t28Timber.test.ts`,
  `tests/scenarios/turn28.test.ts`, `tests/engine/catalog.test.ts`, `tests/engine/tasks.test.ts`,
  `tests/engine/warnings.test.ts` (`WARNING_ORDER` whole).
- B2, the boards' counter, the gate and the stores' refusal: `tests/engine/t29Stores.test.ts`,
  `tests/engine/t29CrossCheck.test.ts`, `tests/scenarios/turn29.test.ts`.
- B1: anything that lists every family of the catalogue or of its storage tab, and the board's
  wanted list of a window (`Needs ... timber store` gains `glass rack`).

## 6. Do not (tonight)

- Nothing of a sheet job's or a sheet contract's material, to the pound: what they hold, draw, order
  and pay; nothing of `SHEET_PRICE_LADDER`, `TEMP_STORAGE_COST`, `LOW_STOCK_SHEETS` or the low stock
  card.
- No limit on the men of a normal job, and nothing of `addToJob`, `assignJob`, `canBuild`.
- No change to a timber job's stages, shares, nights or deadline (`TIMBER_LEAD_DAYS` stays as it
  is written), or to its `materialCost`.
- No change to the line's contract's price, minutes, pallet, offer, upgrades, engineers, books,
  lane, forklift or day book, beyond 2.5.
- No change to the timber contracts of Turn 29 (the client's own timber and glass), or to the oak
  table's timber.
- No picture drawn, repainted, trimmed or scaled by an agent; no placeholder painted for the glass
  racks (the game's own fallback draws them); no new CSS token; no sound; no new screen.
- No change to the tax, the loan, the overdraft, the bank, the wages, the reputation, the insurance's
  rate, the hall's extensions.
- No storage access outside src/cloud/store.ts; no PixiJS, mobile, Steam, Electron.
- No watch loops, nothing left running.

## 7. The cross check (before the PR)

- `npm run check` green on its own exit code; the count of tests and files in the report; every
  `it.skip` listed with its line of reason (the aim is none).
- Store: three counters; the sheets' counter holds sheets only; each kind's room, free places, held
  and free from one function each; the insured value counts all three. Asserted.
- Restock: each kind refused in its words in the sheets' order; the typed number whole, the empty
  field filling the free places less what is on its way; the boards on the ladder and the glass at
  £200; the overflow quoted and sent to the paid store; nothing of the sheets' restock moved by a
  pound. Asserted.
- Jobs: a timber job holds its boards and glass at the click from the free stock; its glass units as
  2.4 reckons them (7 for 3,600 of material); its shortfall of both ordered by one click and by the
  office admin, on two lorries, at the two prices; its glass taken whole at the start of its Glazing
  and the job stopped there without it; a drop puts back what it held and writes off what was
  ordered in, on each counter. Asserted.
- Line: no order buttons, no line material fields; the contract holds the week's boards and glass
  after the jobs; a window takes 2 and 1, held first; the admin's restock at two days left, only into
  free places, his name on the line; with no admin nothing is bought and the strip says `no timber`
  or `no glass`; ending or selling the line frees what it held and writes nothing off. Asserted.
- Deliveries: glass comes by lorry and is unloaded; every kind's overflow goes to its paid store at
  one fee a load and comes back at the morning's one fetch; a kind with no room waits at the gate
  with its card. Asserted.
- Racks: both glass racks in the catalogue at their figures, on the floor, drawn by the fallback
  with their plate, never serviced, refused for sale while their glass would be stranded; a window
  on the board wants a glass rack and either family satisfies it. Asserted.
- Gone: every name of 2.8 absent from `src/`. Asserted by a test that searches `src/` for them.
- The lift of section 4 on raw saves. Asserted.
- `git diff main --stat -- src/ui/styles.css` shows nothing; every changed screen in the report
  beside its nearest existing one.
- The pictures: the Materials page with the three blocks (a restock quoted past the room, a kind
  refused); the job card's material line with boards and glass, in hand and short; the line's
  running block without its buttons; the hall with a glass rack of each family and their plates; the
  board's tile of a window; the lorry's card of a load of glass with no glass rack; the catalogue's
  storage tab with the two glass racks.

## 8. Parked

- The outside sheet store of 1,000 sheets at about 100,000 [PIOTR, 11.10] (S1, REQUESTS-T31 1).
- An office admin who restocks the sheets for the sheet contracts as he restocks for the line: not
  asked; chat asks Piotr.
- The burglar and the boards and glass (2.2).
- Everything Turn 31 parked.

## 9. Mockups (docs/mockups/t32/)

Before the code, each in the classes of the screen it belongs to and beside that screen as it is
today: (1) the Materials page with its three blocks, a restock of boards quoted past the stores'
room and the glass block refused `No glass rack`, beside the page of v95; (2) the job card's
material line of a window, boards and glass in hand, and both short with the one button, beside the
card of v95 with its glass figure and its `Order glass`; (3) the line's running block with `Timber
held` and `Glass held` and no buttons, beside v95's; (4) the hall with a glass rack and a large one
drawn as kit with no picture is, with their plates, beside a timber rack; (5) the board's tile of a
window with its boards and glass units, beside v95's; (6) the catalogue's storage tab with the
`Glass racks` folder. A README names which is which.

## 10. What chat decided and Piotr has not confirmed

For the report to repeat, each with what was built:

1. A timber job's glass units: its glass share of its material (`GLASS_SHARE`) over £200, rounded
   up (7 for a 9,000 casement job); the £200 and the one unit a window are the line's own figures.
2. The boards restocked on the sheets' ladder, as a timber job's boards are already priced; the
   glass at a flat £200 a unit, with no ladder.
3. The glass racks: 2 x 1 x 2 m and 4 x 2 x 2.5 m, 3 and 5 working days, on the floor of any hall;
   a window or a door on the board wants one, either family.
4. The admin's ordering for the line (Piotr's of 11.10) kept, as a restock of each kind that fills
   the stores, for the line only.
5. Gone with "identically": the glazier and his button, the `Glass not ordered` and `Boards at the
   gate` strip lines, the boards' whole load rule, the board's refusal of a window too big for the
   stores, the line's buttons and its glass at module 6.
6. A bespoke timber job's boards ordered in as bespoke sheets are; its glass from the racks.
7. A job's glass taken whole when its Glazing starts.
8. The lift: the glass on the glazier's way and a line's glass on its way put on the counter at once;
   a line's boards and glass become free stock; Turn 31's first batch given to the counters.
9. The insurer counts the glass; the burglar takes sheets only, as today.
10. The low stock badge on each kind's line; the weekly low stock card the sheets' alone.
11. The words: `glass units`, `Sealed glass units` `IGU-4-16-4`, `Timber boards` `TMB-63-RED`, the
    three block names, the restock and storage lines, the fetch's label.

End of brief.
