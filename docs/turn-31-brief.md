# Turn 31: the line's timber and glass, its books, the forklift's lane and its forklift, the hall that grows, the shelter behind the wall, and contracts that can be lost

Woodwork Empire. Autonomous session brief for Claude Code (cloud, one writer, serial, effort
high). Owner: Piotr. Programmer: Claude. Spec author: Claude (chat), written 11.10.2026 from
Piotr's words of that afternoon, against main at v90, and checked against v90 by a second reader
before it was sent; brought to v91 that evening (v91 changes only how the line's sheets are
played), and given the art side's L3 that evening: the line's forklift and its pallet (2.10).

Read this whole file (first line must say "Turn 31"; if the root CLAUDE.md does not, stop and
report), then REPORT-T30.md section 0, then docs/notes-t30.md, then docs/ui-style.md, then
docs/art/SPRITES.md sections 9.7, 9.8, 10, 13 and 15, then docs/art/REQUESTS-T30.md sections 1
and 2 (what L3 was asked to be), then the archived briefs in docs/
(docs/turn-30-brief.md is the last, and this ZIP put it there). Where files disagree, this one
wins. All standing rules apply (no em or en dashes anywhere, scope 1:1, one code path, constants
never in the UI, [TUNE] for every figure you choose and [PIOTR] for his, kill background
processes, PR without merge, end the session, no PR watching, npm run check gated on its own exit
code, every click single, one APP_VERSION bump, delete the old track and never write a parallel
one, flip a test and never keep it beside a new one, the Skylon Development Ltd header on every
new code file). The rule relaxed in Turn 26 stays relaxed [PIOTR, 01.10]: a scenario figure that
moves is restated with ONE line of reason; a test that pins an exact pound of a played month may be
loosened to a range when the exact figure says nothing about the rule under test, and the comment
says so.

Before a line is written: clone, read what is there, and build with it. Every screen, card, tile,
tab, row and strip line this turn needs already has its kind in the repo (the Contracts tab's
running and ended blocks and their buttons, the Accounting page's tabs and the Summary tab's four
columns, the Premises page's extension cards, the event card, the warning strip, the Materials
page's rows, the gate lane's rule that nothing stands on it, the figures' sheets and the walkers
that move them, the finished goods drawn at the gate with their label). Nothing here asks for a second
version of any of them, and none is to be written [PIOTR, 18.09: one game, one look].

Precondition. main carries v91: APP_VERSION 'v91', STATE_VERSION 43. This ZIP carries v91's seven
files as well (the line's motion at the speed it was drawn, one loop a game hour a module), so main
has it once the ZIP is pushed. If APP_VERSION is not 'v91', stop and report. Turn 30 ended green
(2,847 tests in 297 files); v90 and v91 were each checked with the type check, the lint and the
tests they touched. Task A0 runs the whole suite on v91 before anything is touched. This ZIP also
brings the art side's L3: three pictures in `docs/pictures-l3/` and the rest of its pack in
`docs/art/pack-l3-1110/` (2.10).

The four rules of 18.09 bind every agent: one game, one look; nothing visual without a mockup;
no sound without a recorded file; every modal, popover and list has the cross, Escape and click
outside (the event card with two choices is the game's standing exception). The mockups this turn
needs are in section 9, into docs/mockups/t31/ before the code that makes them true. Piotr asked
for this turn in one go tonight and has not seen those mockups: they are built only of what the
game already draws, and the report shows each beside its nearest existing screen.

**What chat decided for Piotr and he has not yet confirmed** is marked [TUNE: chat] throughout
and gathered in section 10. His own words are [PIOTR].

## 0. What this turn is for (PIOTR, 11.10, the afternoon)

Piotr played Turn 30 ("the look is super") and said:

**The line's material.** "There is no order timber and no order glass." Asked whether he meant
the books, he said: "the material is not about the bookkeeping, it is about storage and ordering,
so that it does not run out." He then said yes to chat's proposal: two boards and one glass a
window, £600 as now; boards on the timber stores, glass at module 6 for up to 40 windows; Order
timber and Order glass for 20 windows at a time, in on the next working day; the office admin
orders by himself when two days are left; a line short of material stands.

**The line's books.** "Show the finances please: in a tab in the finances, the production line's
account: the turnover, the materials, the engineers, the efficiency, the net profit, by the day and
by the year."

**The forklift's lane.** "Then a road will be needed: two yellow lines from the end of the
production line to the door, for the forklift that will drive with the pallet." Yes to chat's
route along the front wall and up the left wall to the gate, two metres wide, nothing standing on
it, "and the forklift driving". That evening the art side delivered the forklift and the pallet
standing alone (L3); Piotr approved them ("akceptacja jest") and asked: "won't we add it to this
turn?" (2.10).

**The hall.** "Add the expansion of the space in the factory: adding 200 m² at a time, each time
20 per cent dearer than the present price for 200, and of course everything goes up
automatically." From 600,000 [PIOTR: "from 600"], "as many as the player wants", and "yes, more
people".

**The timber shelter.** "The outside storage for timber somewhere else, because it hides our hall:
rather where the extractors are, or behind them. Nothing in the hall may be hidden."

**The sheet store.** "An outside store for sheets too, but dear: 1,000 sheets, about 100k." The
art side has been asked for it; it is not here tonight (section 8).

**The contracts.** "The profit from contracts should fall from time to time: we earn too much
money after a while. Something has to happen, like we lost a contract once in a while and there is
no new one for two or three weeks, or something else; think. I mean the contracts on sheets." Yes
to chat's three: a client leaves now and then, two or three quiet weeks after, and a renewal that
asks for less.

What this turn is not: any change to a normal job, a sheet job's plan, a wage, the tax, the loan,
the bank, the timber contracts of Turn 29, the line's contract's price, minutes, pallet and offer,
or the frame loop; no picture drawn by an agent (the hall's longer background is made of the 800 m²
picture by a script, as 9.7 and 9.8 were); not the sheet store.

## 1. Rules restated (short)

Everything from Turns 1 to 30 and the chat fixes to v91. Tonight in addition:

- APP_VERSION = 'v92'. STATE_VERSION 44, once (section 4); every save that loads today loads.
- **A job takes as many men as the boss puts on it.** Nothing of `addToJob`, `assignJob` or
  `canBuild` is touched.
- **The sheet department's jobs are not touched**; its standing contracts are, by 2.9 only.
- **The art side's pictures go in as they are.** No agent draws, repaints, trims or scales a
  picture. The shelter's two files change places (2.8), the hall's longer background is cut from
  the 800 m² picture by a script and painted by nobody (2.7), and L3's three pictures go in under
  their own names (2.10).

## 2. Changes to the design (the contract)

### 2.0 What v90 and v91 left (for A0's reasons)

- The full suite was last run green at the end of Turn 30. v90 and v91 changed only how the line's
  sheets are played, and their tests: from v91 each module plays one loop of its sheet, at the 6
  frames a second it was drawn at, each time the game's clock reaches its minute of the hour
  (`everyMinutes` and `atMinute` in `MACHINE_WORK_SHEETS`, read by `playSheets`), and stands on its
  picture between two loops [PIOTR, 11.10: "at the speed it was drawn, but started now and then and
  not all the time"].
- `tests/ui/app.test.ts` plays the game in real time: no sub-agent runs `npm test`, `npm run build`
  or `npm run check` while the lead's check is running.
- The line exists only in the 800 m² unit; its contract is `state.windowLine.contract`
  (`src/engine/lineContract.ts`), and each window made books £1,500 in and £600 of material out
  (`makeWindow`). That booking of the material is what 2.1 replaces.

### A. The suite

**2.0.1 A0.** Run `npm run check` on main as it stands. A failing test is handled as Turn 27's A0
handled it: a moved figure re-pinned with one line of reason, a real fault fixed if the fix is
plain and otherwise left red, that thread put first in section 0 of the report. One commit, or
none.

### B. The line's material and its books

**2.1 What a window takes [PIOTR: "yes" to chat's proposal].** A window takes
`LINE_BOARDS_PER_WINDOW` 2 boards and `LINE_GLASS_PER_WINDOW` 1 glass. The £600 of a window
(`lineMaterialPerWindow`, unchanged) is split: the boards at `SHEET_VALUE` each (2 x 200 = 400),
and the glass the rest (200), both written from those constants and never as figures of their own
[TUNE: chat: the split].

- **The boards** are the line's own, as a timber job's boards are the job's: a field
  `state.windowLine.boards`, the boards the line holds on the timber stores. They are on the one
  counter (`state.stock.sheets`) like every board, and held: `boardsHeld` adds them to what the
  timber jobs hold, and `reservedSheets` adds them too, so `sheetsOnCounter`, `freeSheets`,
  `freeBoardRoom`, the stores' plates (`boardsOnStore`) and the Materials page's boards row all
  count them, and no sheet job can ever take one. One place each; nothing else counts them.
- **The glass** stands at module 6 and on no store: a field `state.windowLine.glass`, the windows'
  glass there, at most `LINE_GLASS_WINDOWS_MAX` 40 [PIOTR: "yes"], with what is on its way kept
  beside it (`glassOnTheWay`: a list of `{ windows, day }`).
- **When it is used.** The window in hand moves on only while the line has a window's boards and
  glass: `lineMakesWindows` asks it, beside the engineers and the move, and a minute with too little
  is a minute the line stands. The boards and the glass come off when the window is made (2 off
  `windowLine.boards` and off the counter, 1 off `windowLine.glass`), in `makeWindow`, which no
  longer books the £600: the material was paid at its order (2.2).
- **When the contract ends** the material stays the line's, for the next contract, and nothing is
  ordered for it. **When the line is sold**, its boards come off the counter and its glass goes,
  written off on the material line (`Material written off: the line's timber and glass`, as a
  dropped job's are), and a line load or line glass still on its way is called off and its price
  given back, so no board is held for ever by a line that is gone [TUNE: chat].

**2.2 Ordering it [PIOTR: "storage and ordering, so that it does not run out"].** Two buttons on
the line's running block of the Orders board's Contracts tab. That block has only `End it` today,
in its head row: the two go in a row of buttons under its rows, as the ended block has one
[TUNE].

- `Order timber: 40 boards, £8,000`: `LINE_ORDER_WINDOWS` 20 windows' boards (40), at
  `SHEET_VALUE` each, paid at the click on the material line (`Timber for the line: 40 boards`),
  refused past the overdraft floor (`canAfford`) as every order the player places. One lorry, in at
  the open of the next working day (`deliveryDay`, standard), a load of boards (`boards: true`) for
  the line (`line: true`, a new optional mark; `jobId` null), unloaded as a timber job's boards are
  unloaded: whole, onto the timber stores, by the unloading task as it is handed out today, or left
  at the gate until there is room (Turn 29 2.11.2), with the card and `boardsAtTheGate` saying so,
  naming the line where they name a job (`Boards at the gate, no room on the stores: the line's
  timber`). Once unloaded the load is on the counter and the line's: `unloadIntoStock` gets a
  branch for it beside the timber job's, which adds the load to `windowLine.boards`. A line load is
  never stock: `pendingStockSheets` and every other reader of deliveries with no job pass over it,
  and its words are its own (`Timber for the line: 40 boards`, on the task, the pallet, the Orders
  list). It can be called off on the Orders list until its lorry comes, as any material order.
- `Order glass: 20 windows, £4,000`: 20 windows' glass, paid at the click on the material line
  (`Glass for the line: 20 windows`), in at the open of the next working day
  (`GLASS_DELIVERY_WORKING_DAYS`, beside `arriveGlass`), carried to module 6 by the glazier as a
  job's glass is carried to the benches: no lorry, no unloading, no store.
- Each button is locked with its reason under it, as the board's and the catalogue's are:
  `Not enough cash`; for the timber, `No timber store` with none, and `The timber stores hold fewer
  than 40 boards` while the stores that stand hold fewer than a batch between them (`boardRoom`);
  for the glass, `Module 6 holds glass for 40 windows` while the glass there and on its way and the
  batch would be more than 40 (so a line with none takes two batches and is refused the third).
- Neither is offered without the line's contract running [TUNE: chat]: the material is the
  contract's.

**2.3 The office orders it [PIOTR: "yes": the office admin orders by himself when two days are
left].** While the line's contract runs, at the open of every working day and after every window
made, the office admin on duty (`firstOnDutyOf(state, MATERIAL_ORDER_ROLES)`, as for a job's
material) orders a batch of timber when the line's boards and those on their way are fewer than two
working days of windows' boards (`LINE_REORDER_DAYS` 2: two days of windows at the minutes a window
takes today, `MINUTES_PER_WORKING_DAY / lineWindowMinutes`, so 8 windows and 16 boards at 120
minutes, 16 and 32 at 60), and a batch of glass on the same rule; through the same order functions
as the buttons, with his name in the ledger line (`Timber for the line: 40 boards, ordered by
Anna`). He orders only what the buttons allow at that minute, and one condition more of his own
for the timber [TUNE: chat]: the stores' free room, less every load of boards already on its way,
takes the whole batch, so that what he orders never waits at the gate. Otherwise he waits, as he
does for a job. With no admin on duty nothing happens here and the strip says why (2.4).

**2.4 What the player reads.**

- **The offer card and the running block** keep their words but the material's: the card's
  sentence `The timber and the glass for each one are bought as it is made, £600 a window.` becomes
  `The timber and the glass cost £600 a window, ordered ahead: on the Contracts tab, or by the
  office.`, and the block's row `£1,500 a window; the timber and the glass £600 a window` becomes
  `£1,500 a window; the timber and the glass £600 a window, ordered ahead`.
- **The running block** (Contracts tab), under its rows of Turn 30: `Timber on the stores: 24
  boards, for 12 windows`, with `, 40 more on the way` while a load is coming; `Glass at module 6:
  for 8 windows`, with `, 20 more on the way`; then the row of the two buttons. While the line
  stands for want of either, its `Standing still` row reads `Standing still: no timber`, `no glass`
  or `no timber or glass`.
- **The strip**: `lineNeedsMaterial`, directly under `lineNeedsEngineer` in `WARNING_ORDER`
  [TUNE]: `The line stands: no timber for its next window`, `no glass`, or `no timber or glass`.
  Said only while the contract runs, two engineers are on duty and the material is what stops it.
- **The Materials page**: the boards' row counts the line's boards as held (it reads `boardsHeld`);
  one row more in the rows it has, `Glass at the line`, its windows and the 40 it holds, shown
  only while the line stands.
- **The ledger**: the two orders on the material line at their click; no per window material line
  any more; the windows' £1,500 on the contract line as today.

**2.5 The line's books [PIOTR: "in a tab in the finances: the turnover, the materials, the
engineers, the efficiency, the net profit, by the day and by the year"].** A fifth tab on the
Accounting page, after `Finance`: `Production line` (`AccountingTab` gains `'line'`), shown only
once the company has had the line standing [TUNE], and shown whether or not the books are up to
date: it reads the line's own day book and not the ledger [TUNE]. In the classes the Summary tab's
four columns have, one column each for `Today`, `This week`, `This month` and `This year`, these
rows, each with what it is reckoned from:

| Row | Reckoned from |
|---|---|
| Windows made | the windows of the line's contract |
| Turnover | the windows at `LINE_WINDOW_PRICE`; equal to the pound to the `Windows off the line: windows` lines of the ledger |
| Timber and glass | the windows at `lineMaterialPerWindow`: the material used, not what was bought |
| Engineers | each line engineer on the books, his `monthlyWage` over `DAYS_PER_MONTH` for each calendar day |
| Power | the six modules' power, `LINE_MODULE_POWER_PER_DAY` each, for each calendar day |
| Property cover | while the property cover is held, `lineValue` at the cover's rate and the unit's factor (`unitCostFactor`) over `DAYS_PER_YEAR`, for each calendar day |
| Net profit | turnover less the four costs above |
| Efficiency | the windows made of the windows the line could have made in the working minutes its contract ran (`88 of 96, 92%`) |

Under the columns, three lines: `A working day on average this month: 4 windows, £1,520 net`;
`A year at this month's pace: £461,000 net` (this month's net over its days so far, times
`DAYS_PER_YEAR`) [TUNE: chat]; `Paid back: £1,240,000 of £10,000,000 and the upgrades, 12%` (the
net of every day since the line first stood, over what the line and its upgrades cost). And one
line of what the efficiency lost, when it lost any: `Lost this month: 6 h for want of an engineer,
2 h for want of timber` [TUNE].

The figures come from the line's own day book: `windowLine.today` (the day in hand: windows,
turnover, material, the possible minutes and the minutes lost by cause), `windowLine.days` (one
record a calendar day, written at the open of each working day for the days since the last one,
weekends among them, and kept for 400 days) and `windowLine.since` (the totals since the line first
stood). The engineers', power's and cover's shares accrue on every calendar day the line stands,
contract or not [TUNE: chat]. Asserted row by row against what each is reckoned from, and the
turnover against the ledger, for a played month.

### C. The line's lane, the shelter, the hall

**2.6 The forklift's lane [PIOTR: "two yellow lines from the end of the production line to the
door"; "yes" to chat's route].** Two metres wide, from the line to the gate:

- **Where it is**, for a line whose module 1 stands at (x, y), in a hall `D` cells deep: the front
  strip, from x 0 to the line's end (x + 36), y D - 2 and D - 1, along the front wall, from which the
  forklift will take the pallet at module 6's front; and the left strip, x 0 and 1, from
  `LINE_PALLET_LAYOUT`'s y (10) to D - 1, up the left wall to the pallets at the gate [TUNE: chat:
  no strip round the line's end, which would leave the line only one place along a 40 m hall]. One
  function gives the lane's boxes for a line's place (`forkliftLane(state, at)`); everything below
  reads it. The lane follows the line, not the hall's length.
- **The line's place asks for it.** The line, the metre in front of it where its men stand
  (`STATION_TABLE`, the front) and its lane never overlap one another, and all of them are inside
  the hall: so the line stands at y D - 6 at the most (14 in the 800 m² hall) and not over x 0 and 1
  below y 10. `lineSite` (at the order) and `canPlaceLine` (the move) take a place only where the
  line's 36 by 3 is clear as `canPlaceBox` asks today and every box of the lane that place would have
  is clear of everything standing or held for a delivery but the line itself; the line asks this of
  its new lane itself, and `canPlaceBox` does not learn the lane (or the line's present lane would
  refuse its own move). The refusals become `No room in the hall for the line and its lane` at the
  order and `The line needs a clear 36 m by 3 m and its lane` in setup mode [TUNE]. At
  `WINDOW_LINE_ORIGIN` (2, 14) in the 800 m² hall this is chat's sketch: the line x 2 to 37, its men
  at y 17, the lane at y 18 and 19 from x 0 to 38, and x 0 and 1 from y 10 up.
- **Nothing else stands on it.** While the line stands or is on order, `canPlaceSpec` (and only it)
  refuses every other thing a cell of the lane with `That is the forklift's lane` [TUNE], in setup
  mode and at every purchase's search for a free place, as it refuses the gate lane today. Men walk
  on it as on the gate lane.
- **What stands on it already** (a save, or kit put there before the line was ordered) is not
  moved: a strip line `laneBlocked`, directly under `boardsAtTheGate` [TUNE], `Kit stands on the
  forklift's lane: the sheet rack and a workbench` (the catalogue's names, as `standingOn` gives
  them, kit on order among them), until it is moved. A line of Turn 30 that stands where its lane
  cannot be (y 15 to 17) keeps its place, no lane is drawn, and the same line reads `The line
  stands too near the front wall for its lane: move it back` [TUNE]. The forklift of 2.10 drives on
  the lane; a line with no lane has none, and its pallets go to the gate as in Turn 30.
- **Drawn** as two yellow lines on the floor along the lane's outer edges, the corners joined,
  under every piece of kit and every man. The hall's painted shell is cached and drawn again only
  when its key changes, so the lane is drawn at the head of the hall's live drawing, where it
  follows a purchase and a move. One CSS token is allowed for its colour, `--lane-yellow` [TUNE],
  the one exception to "no new token" tonight.

**2.7 The hall that grows [PIOTR: "200 m² at a time, each 20 per cent dearer, from 600; as many as
the player wants; everything goes up automatically; yes, more people"].**

- **The offer.** Once the second extension is open, the Premises page has one more card, in the
  extension cards' shape: `Extend the hall: 200 m² more`. It can be bought again and again, one
  at a time; while the builders are in it reads as the other two read while they build (`Being
  built`, the Paid badge). Each adds `UNIT_LONG_EXTENSION_CELLS` 10 metres along the rear wall (the
  hall 50 by 20, then 60 by 20, and so on), opens the next working morning as the other two do, and
  moves the apron and everything at or past the old kerb out with it (`moveTheApron`). The plant
  behind the rear wall stays where it stands; the longer wall has room for more.
- **The price** of the n-th (n from 0): `UNIT_LONG_EXTENSION_PRICE` 600,000 times
  `UNIT_LONG_EXTENSION_GROWTH` 1.2 to the n, rounded to the pound: 600,000, 720,000, 864,000,
  1,036,800 and on. With the landlord's deposit on the bigger rent, as the other two. Money is the
  only condition, as for the other two. No limit.
- **Everything goes up with the floor**, through the functions that already scale: the rent, the
  rates and the bench slots by the area (`unitWith`); the standing power by the area; the joiners
  the unit takes by the area (`crewLimit`); a security firm by the area. Two that do not scale today
  are made to: `unitCostFactor` is the area over 400 past the 800 m² unit (2 at 800, as today; 2.5 at
  1,000) [TUNE: chat], for the insurer and a flat security level; and `canteenLockers` in an
  enlarged canteen is 32 and 8 more for every 200 m² past 800 [TUNE: chat], shown on as many pages of
  plates as it takes (`canteenPages` already pages by sixteen), its word the figure where
  `lockersInWords` has none. The card of each says what goes up, as the other two cards do.
- **State**: `unit.longExtensions` (how many are open) and `unit.longExtension`
  (`'none' | 'building'`) [TUNE: the names].
- **The picture.** Nothing is painted (as 9.7 and 9.8). A script, `scripts/hall-long.py`, cuts
  from `hallBackgroundDeep.png` what a longer hall is made of: a piece ten metres long of the hall
  as it is from x 30 to 40 (its floor, its rear wall, the sky over it, its front kerb and the ground
  in front of the kerb), with a feathered start of one metre so that the join with what is under it
  does not show, and the end of the hall (the kerb under its end at x 40 and the ground beyond it)
  to stand at the new end; RGBA, transparent outside what they are. The 800 m² picture is RGB and
  is the whole of the scene today: the longer scene is laid of it, then one piece for each ten
  metres past 40, each 480 by 240 px (2x) further along than the one before, then the end, and the
  pieces cover everything the longer scene shows past the 800 m² picture. The scene, the camera's
  bounds and the zoom that fits the hall all read the hall's own length. If the picture asks for
  another cut, the session takes it and says why in SPRITES.md 9.9; the rule is that everything is
  made of the 800 m² picture. Acceptance: the report shows a 60 m and a 100 m hall at x1 and a join
  at the closest zoom, with no seam seen at x1.

**2.8 The timber shelter behind the rear wall [PIOTR: "it hides our hall; rather where the
extractors are, or behind them; nothing in the hall may be hidden"].**

- It stands behind the rear wall with the plant: `STARTING_LAYOUT.timberShelter` gets `rear: true`,
  so `rearYardPlaceFor` gives it its place and `No room behind the hall` is its refusal. On the
  apron stays the van alone.
- It is declared as the art side drew it, 6 m along the wall by 3 m deep (Turn 29 declared it 3 by
  6 only because the apron is 3 m wide), its zone its footprint, and its two files change places
  back (the `.png` is the art side's 0 view again): `git mv` through a temporary name, nothing
  edited. SPRITES.md section 13's sentence on it is put right, and its effect and description
  texts no longer say `outside on the apron` but `outside behind the hall` [TUNE].
- Kit behind the wall is drawn clipped to what shows over the wall's top (3.5 m): the shelter is 3
  m high and is hidden behind the wall, which is what Piotr asked for. Its plate (the boards on it
  and its room) is hung over the wall's top above it, where the player can read and click it, in
  place of its place at 0.55 of its own height [TUNE: chat].
- Nothing else of it changes: its 400 boards, its price, its delivery, never moved or turned.

### D. Contracts that can be lost

**2.9 Three things that can happen to a sheet contract [PIOTR: "yes" to chat's three].** For the
standing contracts of sheet pieces only (a piece with no `timber` mark): never a window or a door
on a contract, never the line's contract.

- **A client leaves.** At each week's close of a running sheet contract (`runContractDay`, after
  the short week's rule), with `CONTRACT_CLIENT_LEAVES_CHANCE` 0.03 [PIOTR: "yes" to 3 per cent],
  the client ends it, exactly as `endedByClient` ends one (the week already closed by that close,
  `endDay` today, `weekStartDay` null, so no second and empty week is closed and no point of
  reputation is taken for it), with a new `endedBy`, `'lost'`. Its line reads `the client went
  elsewhere`; its closing card is the one an ended contract has, its title `Cut sheet packs for
  Northgate Interiors: the client went elsewhere`, and its last sentence, in place of the offer of
  another term, `The client has found another supplier: there is no other term.` No price is
  offered for another term (`renegotiatedPrice` null). The men on it are free.
- **What the Contracts tab shows of it.** The ended block of a lost contract is the ended block
  without the client's offer and without `Renew`: one button, `Let it go`, which takes it off the
  tab. Today a null `renegotiatedPrice` makes `renewContract` refuse even the letting go (`The term
  is not over`) while the block still draws an offer and `Renew`: both are put right for `'lost'`.
- **Quiet weeks.** From the day a contract is lost, no standing contract is offered for
  `CONTRACT_QUIET_DAYS` 14 to 21 days [PIOTR: "yes"], drawn once at the loss: `offerContract` draws
  nothing before `state.contractQuietUntilDay`, the weekly offer owed among it. A renewal is not an
  offer and is not stopped; the line's own contract is offered as before.
- **A renewal that asks for less.** When a sheet contract's term ends and the client offers another
  term, with `CONTRACT_RENEWAL_CUT_CHANCE` 0.25 [TUNE: chat] he offers 5 to 15 per cent less than the
  price a piece it had [PIOTR: "yes" to 5 to 15], rounded to the pound, in place of what
  `renegotiatedPriceFor` gives. The closing card's last sentence says so: `The client offers £96 a
  piece for another term, 9% less than now: the market has turned.` The ended block's comparison
  with the old price then reads the cut as it reads any offer.
- **The draws.** Every draw of the three is made off a side stream of its own, seeded from the
  save's seed, the contract's id and the day, the way `drawContract` draws its answer off a side
  stream: nothing is drawn off the main stream, so where none of the three happens no offer, job,
  event or price of any save moves by a step. Where one happens in a scenario that is pinned today,
  the scenario moves: re-pin it with one line of reason, as the relaxed rule says, or choose its seed
  so that it shows what it always showed, and say which in the report.

### E. The line's forklift and the pallet standing alone (L3)

**2.10 The forklift [PIOTR, 10.10: "when the pallet of windows is stacked, ten of them, the
forklift takes it to the door"; 11.10: "two yellow lines from the end of the production line to the
door, for the forklift that will drive with the pallet", "and the forklift driving"; that evening,
having approved the art side's L3 ("akceptacja jest"): "won't we add it to this turn?"].**

*The pictures.* In `docs/pictures-l3/`, put there by this ZIP, checked by chat:

| File | What it is |
|---|---|
| `windowPallet.standard.png` | the pallet of ten wrapped windows standing alone, view 0: 160 by 172, anchor 104, 164, 2 x 1 x 1.75 m |
| `vehicle.forklift.drive.sheet.png` | the line's forklift and its driver, forks empty: 1,632 by 1,024, four rows of six cells of 272 by 256 |
| `vehicle.forklift.driveLoaded.sheet.png` | the same with the pallet of ten windows on its forks |

The rest of the art side's pack is already in `docs/art/pack-l3-1110/`: its notes, figures and
reports, the previews Piotr approved, its source, the two sheets' JSONs, and the pallet's 90 degree
view, which nothing turns and which is not served; `EDITED.md` there says what chat left out and the
dashes it replaced. The two JSONs say the same: `{"cellWidth": 272, "cellHeight": 256, "anchorX":
136, "anchorY": 192, "frames": 6, "fps": 8, "rows": {"sw": 0, "se": 1, "nw": 2, "ne": 3}, "loop":
true}`.

What chat checked: the pallet's canvas and anchor are the contract's for 2 x 1 x 1.75 m, and its
windows and its pallet are module 6's (`stack10` and the pallet drawn in module 6's picture); the
rows are the figures' four directions in the game's own sense (`sw` along +y, `se` +x, `nw` -x,
`ne` -y, as `facingTowards` gives them), and in every row the forks point the way it drives; every
cell of a row has the same bounds, so the forklift drives on the spot and the game moves it; the
anchor is one point of the floor under the forklift with its load, the same in both sheets, so the
empty forklift is not centred on it and is not to be centred again. The forklift is drawn at true
size, where the forklift family's own pictures are a 1 by 1 by 1 m frame (REQUESTS-T30 2.1): those
are not touched tonight (E1).

*To do, in task C4.*

- `git add docs/pictures-l3` if they are not tracked yet, then `git mv` the three pictures into
  `public/sprites/` under their own names, run `npm run sprites:manifest`, and `docs/pictures-l3/`
  is gone.
- **Two more kinds of file**, as Turn 30 2.2 taught the work sheets and the overlays: a vehicle's
  sheet of four rows (`vehicle.<name>.<variant>.sheet.png`) and the picture of a thing that is no
  family's class (`windowPallet.standard.png`). Every place that lists, counts or picks files learns
  them: no count of class pictures or of turned pictures counts either, the Sprite check page lists
  them, and the report says where they were taught.
- Their figures written once as a constant (`FORKLIFT_SHEETS`, empty and loaded [TUNE: the name]),
  from the JSONs, as `MACHINE_WORK_SHEETS` was.
- SPRITES.md section 16, `The line's forklift and its pallet (L3, Turn 31, 11.10.2026)`: the table,
  the rows and their directions, the anchor, the true size, and how the game uses them.

*Whose it is, and who drives* [TUNE: chat: REQUESTS-T30 2.4's simplest]. The forklift is the line's
own: it comes with the line and goes with it, costs nothing, and is not a piece of kit (no spec, no
place, no power, no insurance, no catalogue card). It is not the company's forklift family, which
stays as it is and goes on unloading the lorries. Its driver is part of the picture and takes no
man's time.

*Where it waits.* On the lane's front strip (2.6) in front of module 6's pallet, empty and facing
`nw`, along the strip towards the left wall, standing still on frame 0 of its empty sheet's `nw`
row [TUNE: chat: the cell]. It is drawn while the six modules stand and the line has its lane: a line
with no lane (2.6) has no forklift, and its pallets go to the gate as in Turn 30.

*The trip.* Whenever a pallet leaves module 6 for the gate (the tenth window, or a part pallet at the
contract's end), the forklift takes it there along the lane and comes back:

1. Loaded, from where it waits: along the front strip (`nw`) to the lane's corner, then up the left
   strip (`ne`) until the pallet on its forks is over `LINE_PALLET_LAYOUT`. There the pallet is set
   down: the forklift's sheet becomes the empty one and the pallet standing alone is drawn at its
   place.
2. Empty: down the left strip (`sw`) and along the front strip (`se`) to where it waits, and it faces
   `nw` again.

The pallet comes off module 6 onto the forks at once: the engine already draws module 6's pallet
empty the moment the tenth window is made. Nothing is drawn of the forks lifting or setting down,
and a corner is a turn on the spot [TUNE: chat].

*The engine does not change* [TUNE: chat]. In the engine the pallet is at the gate the moment it
leaves module 6, as in Turn 30, so the Contracts tab, the client's collection at the next working
day's open and every engine test stay as they are. The forklift is the renderer's, as the walkers and
the doors are: a small module of its own in their shape (`src/render/forklift.ts` [TUNE: the
name]), with no game state, no lift and no minute booked. Its step runs in every frame with the
state, whatever page is open, so a trip goes on while the player reads another page and he finds the
forklift where it has got to; it sees a pallet leave when `palletsAtGate` goes up between two of its
steps on the same day. It is set again after every page written (as `syncFigures` and `syncDoors`
are), so a page written mid trip never puts it back where it waits; and it is forgotten, back where
it waits, wherever a view is built from nothing (the load, the new game and the new morning that call
`resetWalkers` and `resetDoors`), when the line is moved or sold, and when the clock goes to
`WALK_SKIPPED_FROM_SPEED` or over. While its loaded leg runs, the newest pallet at the gate is not
drawn: it is on the forks. A pallet sent while it is out is drawn at the gate at once [TUNE].

*Its pace.* `FORKLIFT_CELLS_PER_SECOND` 3 [TUNE: chat: twice a man's walk], in real time, at every
speed of the clock below `WALK_SKIPPED_FROM_SPEED`, and on while the clock is paused, as the men
walk on. From `WALK_SKIPPED_FROM_SPEED` no trip is drawn: the pallet is at the gate at once and the
forklift waits where it waits, as a man is put where he is going (v71). At 1x, with the line at
(2, 14) in the 800 m² hall, a trip there and back is about 30 seconds.

*How it is drawn.* From its sheet as a figure is (`characterArt`, `cellBox`: an `<svg>` clipped to
one cell by its view box over the whole sheet), marked `data-forklift` with its leg: its row the way
it is going, its six frames at the sheet's 8 a second while it moves and frame 0 while it stands; its
anchor on the middle line of the strip it is on; in the hall's live drawing with the figures, by depth
as a figure is, by the cell its anchor is on, so that it passes in front of and behind men and kit as
they stand. It is longer than a man is wide: if it is drawn under or over something it should not
be, the report shows it.

*The pallet at the gate.* Drawn from `windowPallet.standard.png` at `LINE_PALLET_LAYOUT` (2 by 1,
view 0, on the box's nearest corner as every picture is) in place of Turn 30's two boxes, with the
label as it is; a second pallet, the most that is drawn, beside it along x, at x 2 to 3, y 10 [TUNE:
chat]. Each keeps `data-line-pallet`. A part pallet is drawn as the full one, and the label counts
pallets (REQUESTS-T30 1.4's simplest) [TUNE].

*What the player reads.* Nothing new: no text, card, strip line or button.

## 3. How to run this session

**One writer.** Only the lead agent edits files under `src/` and `tests/`, changes STATE_VERSION
or APP_VERSION, commits and pushes, and it does the tasks strictly in the order of section 5, one
at a time. No worktrees and no parallel branches.

**Sub-agents are allowed, under that one rule.** They may only do work that touches no file another
agent is touching: read the repo and report; build the mockups of section 9 under
docs/mockups/t31/; draft `scripts/hall-long.py` and its pieces for the lead to run and check; draft
test cases; review each finished task's diff against this brief and section 7 before its commit;
write docs/notes-t31.md. A sub-agent never commits, never asks a question and never waits for an
answer, and never runs `npm test`, `npm run build` or `npm run check` while the lead's own check
is running. If a sub-agent's result disagrees with this brief, the brief wins.

**Do not stop and do not ask.** Piotr is not watching and nobody will answer a question. Where this
brief leaves a choice open, take the simplest reading that fits what is already in the repo, mark it
[TUNE] in the code and list it in the report. The only reasons to stop are the brief's own: the
first line of CLAUDE.md is not "Turn 31", or APP_VERSION on main is not 'v91'. A red test is not a
reason to stop the session: handle it as 2.0.1 says.

**Push after every task**, so that nothing is lost if the session ends early. If the session runs
short: stop cleanly at the end of a task, never in the middle of one, and say first in section 0 of
the report which tasks were not reached. Section 5 is in the order of what matters and is built so
that every stopping place is a whole game.

## 4. State

STATE_VERSION 44, once, in B1, the first task that needs it. B1 writes every new field of the turn
with its default (the parts later tasks use among them) in a raw lift, `liftToVersion44`, so that the
version moves once. A v43 save opens with:

- `windowLine` with `boards` 0, `glass` 0, `glassOnTheWay` [], `today` (all noughts), `days` []
  and `since` (all noughts). A save whose line contract is running is given one batch of each, free:
  40 boards on the line and on the counter, and glass for 20 windows, so that a line that ran on Turn
  30's rule does not stop on the morning the rule changes [TUNE: chat]; its boards may stand over
  the stores' room until they are used, and the plates say so as they do for any load. This needs
  the whole state, so it is done after the raw lifts, gated `version < 44`, on the road
  `takeTheTimberToolsBack` and Turn 30's `takeTheLineBack` took (`src/engine/migrate.ts`).
- `unit` with `longExtensions` 0 and `longExtension` `'none'`; `state.contractQuietUntilDay` null.
- A delivery's `line` mark and a contract's `'lost'` are new optional values that no save carries.
- In C1, not B1: a timber shelter on the apron, standing or on order, is moved behind the rear wall
  with the plant's own step (`standThePlantBehindTheWall(state, 'timberShelter')`), gated
  `version < 44` and outside the chain of `else if` the plant's other moves are in, its footprint
  the new 6 by 3; one that finds no room stays where it is and the report says so.
- The forklift of 2.10 is the renderer's: no field and no lift for it.
- Nothing else changed.

Every save that loads today loads, the fixtures among them. Assert the lift on raw saves in
tests/cloud/migrate.test.ts: one with a running line contract (the free batch; in B1), one with a
shelter on the apron (moved; in C1), one with neither (nothing but the defaults). Say in the report
what the lift does and list the version pins flipped.

## 5. Task queue, in order

Branch turn-31-line-books from main. One commit per task, npm run check green on its own exit code
before each, the branch pushed after each, two report lines per task in REPORT-T31.md.

T31-A0 The suite on v91 (2.0.1).
T31-A1 Housekeeping and v92: docs/turn-30-brief.md is already in docs/ (this ZIP put it there),
this file as CLAUDE.md, the README's lines (the brief, REPORT-T31.md), APP_VERSION 'v92' and its
pins (the pins of STATE_VERSION go with B1).
T31-A2 The mockups of section 9 into docs/mockups/t31/ with a README.
T31-B1 2.1 to 2.4: the line's timber and glass, its orders, the office's orders, what the player
reads, with STATE_VERSION 44 and the lift of section 4 but the shelter's.
T31-B2 2.5: the line's books, the Production line tab.
T31-C1 2.8: the timber shelter behind the rear wall, with its lift.
T31-C2 2.6: the forklift's lane.
T31-C4 2.10: the line's forklift and the pallet standing alone (L3), straight after C2, whose lane it
drives on.
T31-D1 2.9: contracts that can be lost.
T31-C3 2.7: the hall that grows, with its card, its scaling and its longer picture. One task: a
longer hall without its picture is not a whole game.
T31-E1 notes (docs/notes-t31.md), and docs/art/REQUESTS-T31.md: nothing new is asked of the art
side tonight; it names what chat's order of 11.10 asked and is still to come (the outside sheet
store of 1,000 sheets, S1) so the next turn can take it in; the forklift family's own pictures, a 1
by 1 by 1 m frame beside L3's forklift at true size, for Piotr to say whether they are drawn again;
and anything of tonight that sits badly (the forklift's depth against kit, the pallet's turn as it is
set down, if either shows).
T31-E2 scenarios, one line a moved figure, and five new ones. (hhh): a company with the line's
contract running and no admin orders timber and glass, is refused a third glass batch over 40, sees
the timber come on the next working day's lorry and go onto the stores, makes windows that take 2
boards and 1 glass each, and stands with `no timber` when it runs out; with an admin the line never
stands for material over a played month. (iii): the Production line tab after a played month reads
each row as 2.5 reckons it and the turnover as the ledger has it, and the efficiency below 100 per
cent on a day an engineer was away. (jjj): the line's lane refuses a rack put on it, the line moved
onto a place whose lane is blocked is refused, a save with a bench on the lane shows `laneBlocked`.
(kkk): the hall extended three times (600,000, 720,000, 864,000) is 70 by 20 m, its rent, rates,
power, insurance and security up with it, 56 lockers in its enlarged canteen, the van and the apron
moved out each time. (lll): over a played year of three sheet contracts with the seeds chosen to
show it, one is lost and is let go off the tab, no contract is offered for the quiet days after,
and a renewal comes in lower; a save where none of the three happens keeps every figure its
scenario pins today.
T31-E3 cross check. T31-E4 look and shoot: the pictures of section 7 into docs/report-t31/.
T31-E5 report (REPORT-T31.md, section 0 first: what was not reached, what is red, section 10's list
with what was built) and PR titled `Turn 31: the line's timber and glass, its books, the forklift's
lane and its forklift, the hall that grows, the shelter behind the wall, and contracts that can be
lost`, do not merge, end the session.

**Tests chat already knows will move.** Checked against v90, and against v91 for the files v91
changed; a start and not the whole; the lines are v91's. Each is flipped to say what is true now,
never kept beside a new one.

- A1: `tests/ui/saveCheck.test.ts` 141, `tests/ui/version.test.ts` 63 and 79 (every pin of 'v91').
- B1: the pins of STATE_VERSION 43: `tests/ui/saveCheck.test.ts` 142, `tests/engine/v67.test.ts`
  100, `tests/engine/types.test.ts` 54, and in `tests/cloud/migrate.test.ts` 154 and the lifted
  versions at 299, 431, 650, 742, 838, 865, 877, 891, 910, 941, 999, 1111, 1160, 1199, 1250, 1281,
  1408 and 1568 (`contracts.test.ts` 609 and `migrate.test.ts` 1443 pin a 43 that is not the
  version: leave them). And `tests/engine/t30Contract.test.ts` (a window books £600 of material
  as it is made; the offer card's sentence at 99), `tests/engine/t30Upgrades.test.ts` 110 to 119
  (eight windows a day want their material), `tests/render/t30Sheets.test.ts` 36 (`working()`: the
  sheets play only while the line makes windows, which now wants material, and every test of the
  file builds on it), `tests/ui/t30Line.test.ts` 163 to
  196 (the `Standing still` row), `tests/engine/warnings.test.ts` 400 to 455 (`WARNING_ORDER`
  whole) and `tests/scenarios/turn30.test.ts`.
- C1: `tests/engine/t29Stores.test.ts` and `tests/ui/t29Families.test.ts` (the shelter on the
  apron, 3 by 6), `tests/engine/metres.test.ts`.
- C2: `tests/engine/t30Move.test.ts` 51 to 56, 59 to 73, 88 to 90 and 96 (moves to y 17; the
  refusal's words), `tests/scenarios/turn30.test.ts` 290 (the words) and 311 to 321 (the rack at
  (20, 18) is on the new lane), `tests/engine/warnings.test.ts` again (`laneBlocked`).
- D1: the scenarios whose seeded sheet contracts meet a loss or a cut (2.9's last paragraph):
  `tests/scenarios/autopilot.ts` and the turn13, turn17, turn20 and turn29 scenarios may.
- C4: `tests/ui/t30Line.test.ts` 204 to 218 (the boxes at the gate become the pallet's picture,
  `data-line-pallet` kept, two drawn at the most), and any test that lists every file of
  `public/sprites/` or the Sprite check page's rows. The counts of class pictures and of turns
  (`tests/render/spriteClasses.test.ts` 218 and 260, `tests/engine/rotate.test.ts` 255) must not
  move: if one does, a new kind of file was not taught.
- C3: `tests/engine/v67.test.ts` 184 and 433 and `tests/ui/v67.test.ts` 292 to 326 (the 800 m²
  unit as the last), and the locker count of 32 as the most.

## 6. Do not (tonight)

- No limit on the men of a normal job, and nothing of `addToJob`, `assignJob`, `canBuild`.
- No change to the timber contracts of Turn 29, the line's contract's terms (its price, its
  minutes, its pallet, its offer) beyond its material and the two sentences of 2.4, or the three
  sheet pieces' price, bands, term, short week and payment beyond 2.9.
- No change to a sheet template, a sheet stage, its shares, or a sheet job's plan.
- No change to the places, pace, price or power of any family; no change to what asks for a spray
  booth.
- No change to the tax, the loan, the overdraft, the bank, the wages, the owner's base, the
  reputation, the insurance's rate.
- No change to `crewByFamily`, `MAX_CATCH_UP_MS`, the paced redraw, `playSheets` or the sprite cache
  headers.
- No picture drawn, repainted, trimmed or scaled by an agent (the longer hall is cut from the 800 m²
  picture by a script, and the shelter's two files only change places); no placeholder drawn for a
  sheet store, and no forklift but L3's; no sound; no new screen; no new CSS token but
  `--lane-yellow`.
- No change to the engine for the forklift (2.10): no state, no lift, no minute, no money; in the
  engine the pallet is at the gate the moment it leaves module 6, as in Turn 30.
- No storage access outside src/cloud/store.ts; no PixiJS, mobile, Steam, Electron.
- No watch loops, nothing left running.

## 7. The cross check (before the PR)

- `npm run check` green on its own exit code; the count of tests and files in the report; every
  `it.skip` listed with its line of reason (the aim is none).
- Material: a window takes 2 boards and 1 glass and is not made without them; the line's boards
  are held (never free sheets, never a sheet job's, counted on the stores' plates and the boards
  row); a timber order is one lorry on the next working day, unloaded whole onto the stores or left
  at the gate; a glass order is in at the next working day's open with no lorry; both paid at the
  click on the material line and refused past the overdraft; no £600 booked per window; the buttons'
  refusals in their words; the admin on duty orders at two days left, only what the buttons allow
  and the timber only into free room; with no admin, nothing is ordered by itself; the line's
  material stays at the contract's end and is written off at the line's sale, its loads on the way
  called off; `lineNeedsMaterial` sits directly under `lineNeedsEngineer` and is said only when
  material is what stops the line. Asserted.
- Books: the tab is there once the line has stood and not before; each row of each column as 2.5
  reckons it and the turnover equal to the ledger's for a played month; the efficiency's possible
  minutes are the contract's working minutes; the paid back line sums the days since the line first
  stood. Asserted.
- Lane: its boxes for the line at (2, 14) in the 800 m² hall are the ones of 2.6; a rack is refused
  on it; the line is refused at the order and in setup mode where its lane is not clear, and can move
  where it is; a bench already on it shows `laneBlocked` and is not moved; the two yellow lines are
  drawn under kit and men and follow a move. Asserted.
- Hall: the price of the first four long extensions; one at a time; the hall 10 m longer the next
  working morning; the apron moved; the rent, the rates, the power, the insurance, a flat security
  level and a firm's month, the joiners, the benches and the lockers each up as 2.7 says; no
  limit; a 100 m hall draws, with no seam seen at x1. Asserted, the picture in the report.
- Shelter: bought into the 800 m² unit, it stands behind the rear wall, 6 by 3, and never on the
  apron; its plate is read over the wall; a save's shelter on the apron is moved there. Asserted.
- Contracts: a sheet contract is lost only at a week's close and only by the side stream, with no
  second week closed; a lost contract is let go off the tab and offers no term; the quiet days stop
  every offer but the line's, and never a renewal; a renewal cut is 5 to 15 per cent under the price a
  piece it had; no timber piece and no line contract is ever touched; where none of the three
  happens, the seeded offers pinned today are unchanged. Asserted.
- Forklift: drawn waiting where 2.10 says only while the six stand and the line has its lane, and
  none with no lane; a pallet that leaves module 6 makes one trip, loaded `nw` then `ne`, empty `sw`
  then `se`, at 3 cells a second of real time, its row and frames as it goes and frame 0 standing;
  the newest pallet at the gate not drawn while it is on the forks and drawn once it is set down; a
  page written mid trip leaves it where it is; no trip from 30x, and a trip ended at a move, a sale, a
  load and a new morning; nothing of the engine changed; the pallet at the gate drawn from its
  picture, two at the most, with its label; the three files in `public/sprites/` byte for byte the
  art side's, and no count of class pictures or turns moved. Asserted.
- `git diff main --stat -- src/ui/styles.css` shows `--lane-yellow` and no other new token; every
  changed screen is in the report beside its nearest existing one.
- The pictures: the running block with the material rows and the two buttons (offered, locked); the
  strip with `lineNeedsMaterial`; the Production line tab after a played month; the 800 m² hall with
  the line and its lane; `laneBlocked`; the Premises page's long extension card; a 60 m and a 100 m
  hall, and a join at the closest zoom; the shelter behind the rear wall with its plate over the
  wall, and the apron with the van alone; the lost contract's card and its ended block; a renewal
  card with the cut; the forklift waiting at the line's end, loaded on the front strip, setting the
  pallet down at the gate, and the pallet standing at the gate with its label; and a strip of the
  forklift's frames on a trip, if the session can make one.

## 8. Parked

- **The outside sheet store** of 1,000 sheets at about 100,000 [PIOTR]: ordered from the art side
  on 11.10 (S1), for the turn after its delivery.
- **The forklift family's own pictures**, a 1 by 1 by 1 m frame beside L3's forklift at true size,
  and the forks lifting and setting a pallet down: not drawn; Piotr's to say.
- **The renewal's own rise**: `renegotiatedPriceFor` raises a contract 1 per cent for every full
  week, so a six month term renewed twice in full is about 60 per cent dearer than it began. That
  is one reason the contracts pay so well after a while. Not touched tonight: chat asks Piotr
  whether to cap it.
- The money of the line and its property cover (Turn 30 section 8).
- Everything Turn 30 parked.

## 9. Mockups (docs/mockups/t31/)

Before the code, each in the classes of the screen it belongs to and beside that screen as it is
today: (1) the line's running block with its material rows and the row of the two buttons, offered
and locked, and `Standing still: no timber`, beside the block of Turn 30; (2) the strip with
`lineNeedsMaterial` and with `laneBlocked`; (3) the Production line tab beside the Summary tab; (4)
the 800 m² hall with the line and its yellow lane, beside the hall of Turn 30; (5) the Premises
page with the long extension card beside the second extension's; (6) a longer hall: in A2 the 800 m²
hall with the ten metres more drawn as an outline on it, the real picture coming with C3 into the
report; (7) the shelter behind the rear wall with its plate over the wall, beside the shelter on
the apron; (8) the lost contract's card and its ended block, and a renewal card with the cut,
beside an ended contract's card and block; (9) the hall with the forklift waiting at the line's
end, the forklift loaded on the front strip, and the pallet standing at the gate with its label,
beside Turn 30's boxes at the gate. A README names which is which.

## 10. What chat decided and Piotr has not confirmed

For the report to repeat, each with what was built:

1. A window's £600 split 400 for two boards and 200 for its glass; the material used when a window
   is made, and the line standing at any minute it has not a window's worth.
2. The two orders offered only while the line's contract runs; the timber refused when the stores
   hold fewer than a batch, the glass when module 6 would be over 40; the line's material kept at
   the contract's end and written off at the line's sale.
3. The admin orders only what the buttons allow, at the day's open and after each window, and the
   timber only into free room.
4. The Production line tab: shown once the line has stood, whether the books are up to date or
   not; the costs accrued by the calendar day; the year's pace as this month's over its days times
   the game's 360; the paid back line over the line and its upgrades.
5. The lane: the front strip to the line's end and the left strip up to the gate, no strip round the
   line's end; nothing stands on it while the line stands or is on order; what stood there before is
   named on the strip and not moved; a Turn 30 line too near the front wall keeps its place with no
   lane; `--lane-yellow`.
6. The long extensions: 10 m along the wall each; the insurer's and a flat security level's factor
   the area over 400; 8 lockers more for every 200 m²; the picture cut from the 800 m² one.
7. The shelter behind the wall, declared 6 by 3, its files back in their places, its plate over the
   wall; a save's moved.
8. The contracts: a lost contract's card, words and ended block; no offer at all in the quiet days
   but the line's and the renewals; the renewal cut at a chance of one in four, under the price a
   piece it had.
9. The lift: a running line given one batch of timber and glass free.
10. The forklift: the line's own, its driver part of the picture; waiting on the front strip in front
    of module 6, facing `nw`; no lifting drawn, a corner a turn on the spot.
11. The trip drawn by the renderer alone: the engine's pallet at the gate at once, as in Turn 30, the
    newest pallet at the gate not drawn while it is on the forks; 3 cells a second of real time, on
    while the clock is paused, none from 30x.
12. The pallet at the gate: the second beside the first along x, a part pallet drawn as a full one.

End of brief.
