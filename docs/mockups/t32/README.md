# Mockups for Turn 32

Drawn by Claude Code on 13.10.2026, before the code that makes them true (CLAUDE.md T32 section 9).
Piotr asked for this turn in one go and has not seen these: they are built only of what the game
already draws. Each page is the game's own markup in the game's own classes, made by the game's own
functions (`renderLaptop` with `renderMaterials`; `renderWorkPlan` with the job card of
`jobCard.ts`; `renderContracts` and `renderBoard` with `tabBar`; `renderCatalogue`; `hallScene` and
`sceneHtml` of `src/render/hall.ts`; every shell through `syncModals` with the spec `app.ts` writes),
from states the engine built, linked to `src/ui/styles.css`, and shot in headless Chromium
(playwright 1.56.1) from a static server on 127.0.0.1 that served the stylesheet, the pictures and
the fonts, so the folder paper, the hand font and the pictures load. The page around each shell is
the mockup's own layout (the `mock-*` rules of the earlier turns' pages; the hall page carries Turn
30's block with `.mock-hall` and `.mock-cell`, copied unchanged) and no game style. Each new screen
stands beside the same screen as it is today, each under its own caption. No new CSS token or class
is used anywhere, no page holds an em or en dash, and no picture was drawn: the two glass racks are
drawn by the game's own fallback for kit whose picture has not landed.

Every page was generated from a snapshot of commit 4ec7a65 (T32-A1: housekeeping and v96, before any
Turn 32 code), exported to a scratch folder, so the lead's work in progress was never read; "Today
(v96)" on a page is v95's game with the version bumped, as Turn 31 labelled its pages `Today (v92)`
after its A1. Where tonight's code does not exist yet, the lines no renderer writes yet were written
by hand into the rendered markup, in the classes the neighbouring lines use, or the two glass rack
specs were pushed into the engine's own tables in the generating process only; each entry says
which. The words and figures follow the brief and the lead's readings for the mockups and the code,
kept beside them as `decisions.md`; readings the mockups had to take are marked [TUNE: mock] and
gathered at the end. Nothing under `src/`, `tests/` or `public/` was edited by a mockup, and nothing
outside `docs/mockups/t32/` was written in the repo. Every date is the game calendar's (30 day
months, day 1 Monday 1 March 2025). The generators are in the session's scratchpad, not in the
repo, and no server or browser of a shoot was left running.

**The pictures the pages point at.** The hall page (4) and the catalogue page (6) draw the game's
own `/sprites/` URLs in their markup (the timber rack, the machines, the people), and the stylesheet
reads the folder paper from `/sprites/ui.folder.png` and the hand font from `/fonts/`; these load
only with `public/` served at the root, as they were for the shots. The PNGs keep what was shot.

1. `materials-page.html` (and `materials-page.png`): 2.3 and 2.7, the laptop's Stock page (the
   Materials page), drawn by the game's own `renderLaptop` on page `stock`, so `renderMaterials`,
   with its shell through `syncModals` using the spec `app.ts` writes for the laptop (`id 'laptop'`,
   `Laptop`, `full`, the screen skin). The panels are at `mock-wide` width, because the game's laptop
   is `min(96vw, 1400px)` wide. The page's first use bubble is marked seen.
   - **The company the engine built.** Seed 20260911, `veryEasy`, the 800 m² unit (both
     `EXTEND_UNIT` stages bought and opened the next mornings), the day one kit with its budget sheet
     rack of 50, and the timber machines and the three cutter sets, placed as `bigUnit` of
     `tests/engine/t29Line.test.ts` places them, without the shelter or the CNC. One timber rack of
     40 boards was bought through `buyNow`, and 10 sheets are on the sheet rack. A casement window
     job of £9,000 (`materialCost` £3,600, 12 boards) was taken through `acceptNow` on Wed 3 March
     2025 and its boards ordered with `orderForJob`; they came in at the open of Thu 4 March and the
     owner unloaded them through the engine's own unload task (`doTask`), so the job holds 12. Its
     glass was then ordered from the glazier with `orderGlass` (here on Fri 5 March). The page is
     drawn at Thu 4 March 2025, 08:45, with the enquiries cleared.
   - **Today (v96):** the engine's page as it is. The one head row, `Stock`, has the sheets' field
     (placeholder 40), `40 sheets at £180 = £7,200` and `Restock: 40 sheets, £7,200`. Under it come
     the MFC line (`Free 10`, `Reserved 0`, `Total 10 of 50`) and the boards row (`Held 12`,
     `Room 28`, `Total 12 of 40`). The project row reads `12 of 12 boards of timber in hand` and
     `Glass ordered, here on Fri 5 March`. Deliveries reads `Nothing on the way.`
   - **After (a), the same minute:** three blocks in the order sheets, boards, glass, each a
     `row stock-head` with `data-stock-head`, followed by its own `stock-list`.
     - **How this company came to that minute under the new rules, said in its caption.** From Turn
       32 a window wants a glass rack on the board (2.1), so one stood, empty, when the job was taken
       on Wed 3 March. The job held its 12 boards at the click from free boards on the timber rack,
       bought for stock before, and its 7 glass units were short. The glass rack, still empty, was
       then sold, which the sale's stranding rule allows while it holds no glass, and on Thu 4 March
       the glass alone was ordered for the job (2.4 orders a shortfall of glass alone, the boards in
       hand, the same way), on a lorry for Fri 5 March. `orderForJobCheck` asks no question of room,
       as today, so the order is taken with no glass rack standing; the lorry will wait at the gate
       with its card until one is bought.
     - `Sheets` is today's control, with the field empty.
     - `Timber boards` has `60` typed in `stockBoards`. It shows `60 boards at £170 = £10,200` and
       `60 boards: 28 on the stores, 32 to storage at £150`, and the offered
       `Restock: 60 boards, £10,200`. Its line reads `Timber boards` `TMB-63-RED-876`, `Free 0`,
       `Reserved 12`, `Total 12 of 40`, with the badge `Low stock, under 4`.
     - `Glass` is shown because the job's shortfall of 7 glass units is on a lorry. No glass rack
       stands, so the field holds the placeholder 0 and there is no price or storage line. The
       Restock is `lockedButton('Restock', 'No glass rack')`, with the reason in its title. Its line
       reads `Sealed glass units` `IGU-4-16-4-877`, `Free 0`, `Reserved 0`, `Total 0 of 0`, with no
       badge (no room).
     - The project row reads `12 of 12 boards of timber in hand`, then the red
       `7 of 7 glass units short` (`data-glass="1"`), then `Order for this job` locked with
       `On its way already`. Deliveries reads `7 glass units`, `arrives Fri 5 March`.
   - **After (b), the same minute:** the same company, had a glass rack of 40 (which a window wants
     on the board from Turn 32) been bought and 20 glass units restocked onto it before the job was
     taken, so the job held its 7 at the click.
     - The boards' field is empty, so the block shows `28 boards at £190 = £5,320` and
       `Restock: 28 boards, £5,320`.
     - Glass has `30` typed. It shows `30 glass units at £200 = £6,000`,
       `30 glass units: 20 on the racks, 10 to storage at £150` and
       `Restock: 30 glass units, £6,000`. Its line reads `Free 13`, `Reserved 7`, `Total 20 of 40`.
     - The project row reads `7 of 7 glass units in hand`, green. Deliveries reads
       `Nothing on the way.`
   - **The figures.** A glass unit costs £200, which is £1,500 x 0.4 less 2 x £200 and equals the
     snapshot's `lineGlassPerWindowCost()`. The window takes 7 units: £3,600 x 0.35 = £1,260, over
     £200 and rounded up. The boards are priced on `sheetPriceFor` and `stockCostFor`, and storage
     costs `TEMP_STORAGE_COST`.
   - **Written by hand,** in the classes of today's head row and stock line, each figure worked in
     the generator from the engine's own state and constants: the three blocks; the job's glass
     figure and its locked button; the load of glass in Deliveries. The (b) state is hand figures
     only: no glass rack spec was pushed into the engine, since nothing on this page draws the rack
     itself. The page head, the sheets' figures, the project's name and boards, and the shell are
     the engine's.
   - **[TUNE: mock] choices.** The stock numbers' digits: the boards use the `solidWood` offset (+2)
     and the glass +3. The fields' aria labels are `Boards to order` and `Glass units to order`.
     Each Restock button carries `data-kind`. The sheet line's `data-stock` is `sheets`, as
     decisions.md 1 says; today's code writes `sheet`, so a test reading it would flip. The project
     row's `12 boards` figure is kept as today, with no glass units added to it. The paid storage
     hint is not drawn: neither state has anything in paid storage. After (a)'s history above.
   - **For the lead.**
     - The boards' line wears the low badge whenever the job holds every board on the stores (free 0
       with a room of 40). That is the rule as written.
     - At `mock-mid` (980) a first shot crowded the boards' head row: the name wrapped onto two
       lines and so did the ladder and storage lines. A sheet restock quoted past the rack would do
       the same at that width today.
     - Today's glazier makes no Delivery, so today's Deliveries is empty while After (a) shows the
       lorry.
     - The thumbnail's key: once a line's kind is `sheets`, `thumbnail()` can no longer build its
       key as `` `thumb.${line.kind}` ``; the sheets keep `thumb.sheet` and the boards map to
       `thumb.solidWood`.
     - Found and left: the thumbnails' labels (MFC, TMB, IGU) are drawn in #e8e6e1 on #f3ecdc and
       can hardly be read, in Today as well. That is the engine's placeholder, not the mock's, and no
       picture or style is changed tonight.
     - `laptop-screen` is not a class of `styles.css`: it is the hook `laptop.ts` writes.
   - Shot at 2880 wide, full page (2880 by 1956), Today and After (a) side by side and After (b)
     under them; re-shot after the After (a) caption was written. Generator (scratch, not in the
     repo): `scratchpad/mock-materials/gen.ts` (it stops if the page holds a dash), shot by
     `scratchpad/mock-final/shoot.cjs` from its own server on 127.0.0.1:8745, stopped with the
     browser.

   Nearest existing: `docs/report-t29/14-the-materials-page-with-the-boards.png`,
   `docs/report-t31/04-the-materials-page-line.png`,
   `docs/report-t24/07-the-materials-tab-with-the-storage-line.png`,
   `docs/report-t23/16-the-materials-tab-at-sixty-sheets.png`,
   `docs/report-t13/23-laptop-materials.jpg`.

2. `job-card-material.html` (and `job-card-material.png`): 2.4 and 2.7, the job card's material
   line of a window. The page shows the Work Plan in its board skin on its Jobs tab, drawn by
   `renderWorkPlan` with its shell through `syncModals` and the spec `app.ts` writes (`Work Plan`,
   `full`, width `mock-mid`). Each row's head is the job card of `jobCard.ts`. There are four panels,
   two to a row, today on the left; each row's own caption says what both of its panels show.
   - **The company the engine built.** The 800 m² unit (both extensions), the day one kit, the timber
     machines, the three cutter sets, and one timber rack of 40 bought through the engine. A casement
     window of £9,000 was taken on Wed 3 March 2025 (`acceptNow`); its drawing and site measure were
     done that day and its take off at the open of Thu 4 March (`doTask`). Its material is £3,600:
     12 boards, and £1,260 of glass, which 2.4 makes 7 glass units at £200. The first use bubble is
     marked seen. From Turn 32 a window wants a glass rack on the board as it wants a timber store
     (2.1), so the lead text and both After captions stand a glass rack beside the timber rack.
   - **Today (v96), short, Thu 4 March 2025, 08:30.** The engine's card:
     `12 of 12 boards of timber short`, then the hint
     `Timber is ordered for the job: the racks hold sheets.`, then `Glass not ordered` in red, then
     two buttons, `Order for this job, £2,280` and `Order glass, £1,260`.
   - **After (a), both short, the same minute.** Had the timber rack held 7 free boards and the glass
     rack 4 free glass units when the job was taken, the job has held them since the click. The card
     reads `5 of 12 boards of timber short` and `3 of 7 glass units short`, both
     `row-figure bad shortfall`, then one `Order for this job, £1,600` (`data-do="orderForJob"`):
     the boards' 5 at £200 on the ladder (£1,000) and the glass's 3 at £200 (£600). The hint is gone.
   - **Today (v96), in hand, Fri 5 March 2025, 08:45.** Both orders were placed from the card on Thu
     4 March (`orderShortfall`, `orderGlassFor`); the lorry was unloaded by the owner and the
     glazier's glass came in. The card reads `12 of 12 boards of timber in hand` and `Glass is in`,
     both green.
   - **After (b), both in hand, the same minute.** The boards on the timber rack and the 7 glass
     units on the glass rack, both held for the job: `12 of 12 boards of timber in hand` and
     `7 of 7 glass units in hand`, both `row-figure good sheets-reserved`, with no button.
   - **Written by hand,** into the engine's markup: the glass figure (`data-glass="1"`, in the boards'
     figure's classes, placed right after it); the £1,600 label, made with the game's own `button()`;
     and, in (a), taking out the hint and the glazier's button.
   - **Pushed into the engine's state in this process only:** in (a), the job's `sheetsReserved` is
     set to 7 and the counter gets 7 more, standing for the 7 boards held at the click, so the boards'
     figure, the stage, the lifecycle steps and `Start production, 5 boards of timber short` are the
     engine's own; in both After panels, `job.glass` is set to `none`, so v96's glass line is not
     drawn.
   - **[TUNE: mock] choices.** In (a) the job holds 7 of its boards and 4 of its glass units, from the
     figures decisions.md 2 gives. The glass figure sits beside the boards' figure on the same line,
     wrapping when the head is narrow. Today's short card is shown as v96 really draws it, all 12
     boards short: a v96 timber job never holds anything from the stores, so it cannot be 5 short.
   - The After panels were relettered after the review, so (a) (both short, the upper row) comes
     before (b) (both in hand, the lower row), and their captions name the glass rack.
   - Shot at 2100 wide, full page (2100 by 1809). Generator (scratch, not in the repo):
     `scratchpad/mock-jobcard/gen-card.ts`, with `company.ts` and `shell.ts`, shot by
     `scratchpad/mock-final/shoot.cjs` (127.0.0.1:8745).

   Nearest existing: `docs/report-t28/10-a-timber-job-card-and-its-glass.png`,
   `docs/mockups/t28/glass-job-card.png`, `docs/report-t25/09-the-work-plan-s-line.png`.

3. `line-running-block.html` (and `line-running-block.png`): 2.5, the Order board in its folder on
   its Contracts tab, drawn by `renderContracts` with `tabBar('boardTab', ...)`, the shell through
   `syncModals` with the spec `app.ts` writes for the board (`Order board`, `full`, `mock-mid` width),
   as `docs/mockups/t31/line-running-block.html` drew it. The panels stand two to a row, today on the
   left.
   - **The company the engine built.** `bigUnit` of `tests/engine/t30Contract.test.ts`: the 800 m²
     unit, the day one kit and industrial air. A timber rack was bought through `buyNow`, so today's
     `Order timber` has a store and is offered. The six modules stand from (2, 14), placed as that
     test places them; Kev and Lee are the two line engineers on the books. The line's boards are on
     the one counter and its glass at module 6, set as `withLine` sets them (120 boards and glass for
     60 windows), so the days played never stand. The offer card came at the open of Thu 4 March 2025
     and was answered `Take it`; the engine then played in ten minute steps, answering every card
     with its first choice. Two states came out of that:
     - **Running.** Played to Tue 9 March 2025, 17:00, the week's eighth window; the line's material
       was then set to 24 boards and glass for 8 windows, the counter moved with the boards, as
       `withLine` does it, and the engine played on to Wed 10 March 2025, 09:30. The block reads
       `This week: 8 windows. In all: 16` and `On the pallet` / `6 of 10`.
     - **Standing.** At Tue 9 March 2025, 12:00, the week's sixth window, the material was set to 0
       boards and glass for 14 windows, and the engine played on to 14:30 with the line standing.
       The block reads `This week: 6 windows. In all: 14` and `On the pallet` / `4 of 10`.
     - In both, the enquiries are cleared, the seeded sheet contract on offer is left off, and the
       `board` and `contracts` bubbles are marked seen.
     - The After company stands a glass rack beside its timber rack, as a window on the board wants
       one from Turn 32 (2.1) and as the line's glass now lies on one: the boards held are on the
       timber rack and the glass held on the glass rack. The lead text and both After captions say so.
   - **Today (v96), running:** the engine's block. The figures line ends
     `the timber and the glass £600 a window, ordered ahead`; the rows read `Timber on the stores` /
     `24 boards, for 12 windows` and `Glass at module 6` / `for 8 windows`; under them is the row of
     `Order timber: 40 boards, £8,000` and `Order glass: 20 windows, £4,000`, both offered.
   - **After, running:** the figures line ends
     `£1,500 a window; the timber and the glass £600 a window, from the stores`; the rows read
     `Timber held` / `24 boards, for 12 windows` and `Glass held` / `for 8 windows`; there is no row
     of buttons and no `p.lock`.
   - **Today (v96), standing still:** the engine's own red row `Standing still` / `no timber`, then
     `Timber on the stores` / `0 boards, for 0 windows` and `Glass at module 6` / `for 14 windows`,
     with both buttons offered.
   - **After, standing still:** `Standing still` / `no timber` keeps its words and place, then
     `Timber held` / `0 boards, for 0 windows` and `Glass held` / `for 14 windows`. No buttons.
   - **Written by hand,** into the engine's markup: `, ordered ahead` became `, from the stores`; the
     two rows' labels and figures were rewritten in the markup of the private `countRow`; the button
     row and any `p.lock` were removed. The generator checks that none of `ordered ahead`,
     `Timber on the stores`, `Glass at module 6`, `orderLineTimber`, `orderLineGlass` or
     `class="lock"` is left in an After panel. Every other line is the engine's.
   - **[TUNE: mock] choices.** The figures agree with what 2.5 makes the contract hold: the windows
     left in the week (about 20 a week) times 2 boards and 1 glass unit. Running: 8 made leaves 12,
     so 24 boards held for all 12, and glass for only 8 (the glass is short). Standing: 6 made leaves
     14, so glass held for all 14 and no boards. The figures keep today's form
     (`N boards, for M windows`, `for M windows`), and the zero form is T31's
     `0 boards, for 0 windows`.
   - Shot at 2100 wide, full page (2100 by 1589). Generator (scratch, not in the repo):
     `scratchpad/mock-line-block/gen.ts`, with `company.ts` and `page.ts`, shot by
     `scratchpad/mock-final/shoot.cjs` (127.0.0.1:8745).

   Nearest existing: `docs/report-t31/01-the-line-running-block-material.png`,
   `docs/mockups/t31/line-running-block.png`,
   `docs/report-t30/08-the-contracts-tab-with-the-line-running.png`,
   `docs/report-t30/09-the-contracts-tab-standing-still.png`.

4. `hall-glass-racks.html` (and `hall-glass-racks.png`): 2.1 and section 9 (4), the hall of a
   company the engine built, drawn by the game's own `hallScene` and `sceneHtml` of
   `src/render/hall.ts`, each frame set by the game's own camera (`hallStartCamera`, `zoomTo`) in the
   game's view of 760 by 548. Today (v96) is on the left and after on the right, in three rows: the
   whole hall at the zoom the game opens at; the corner of the stores at zoom 3.5; and the two glass
   racks at zoom 4, the wheel's limit.
   - **The company the engine built.** The 800 m² unit, both extensions bought through `EXTEND_UNIT`
     and opened the next mornings, as `bigUnit` of `tests/engine/t29Line.test.ts` builds it; the day
     one kit, industrial air, the six timber machines at the standard class where `bigUnit` stands
     them, and the three cutter sets. The timber rack was bought through the engine, which stood it
     at x 2, y 6. A casement window job for Oak Lane at £9,000 was taken through `acceptNow` on Wed 3
     March 2025 and its 12 boards ordered with `orderForJob`; they came in at the open of Thu 4 March
     through the engine's own day (`nextDay`), the working day after the job was taken, as on pages 1
     and 2, and the owner unloaded them through the unloading task (`doTask`). 20 sheets were
     put on the sheet rack (v96's one counter: 32, of which 12 are the job's boards). The hall is
     drawn at Thu 4 March 2025, 08:45.
   - **Today (v96).** The timber rack is drawn from `timberRack.standard.png`; its plate reads `12`
     and its name `Timber rack: 12 / 40`. The sheet rack's plate reads `20`. There is no glass rack,
     and the floor in front of the timber rack is clear.
   - **After 2.1.** Only in the generating process, the two specs were pushed into the snapshot's
     `EQUIPMENT_SPECS` and `MACHINE_ENDURANCE_HOURS` (100,000), in the timber rack's shape, one class
     each: `glassRack`, 2 x 1 x 2 m, zone 2 x 2, `glassCapacity` 40, £1,500, 3 working days, folder
     `Glass racks`; `glassRackLarge`, 4 x 2 x 2.5 m, zone 4 x 3, 200, £6,000, 5 working days, folder
     `Large glass racks`. Both are category `storage`, with the sprite keys `glassRack` and
     `glassRackLarge`, no file in the manifest, and the effect and class sentences of the brief and
     decisions.md. Both were bought through the engine, the glass rack first, and moved through the
     engine's own `MOVE_ITEM`, which accepted both places: the glass rack to x 3, y 10 and the large
     one to x 7, y 10, on the floor in front of the timber rack. The game draws each as it draws kit
     with no picture (`objectArt`'s last branch): the flat box in `--kit-stock` and
     `--kit-stock-dark` with its name over it.
   - **Written by hand,** into the after scene, in the classes and figures of `rackCount` (copied
     from `src/render/hall.ts`, where they are private):
     - Each glass rack's count and room in its name and title, `Glass rack: 7 / 40` and
       `Large glass rack: 0 / 200`, as a timber rack's name reads `Timber rack: 12 / 40`. The
       window's 7 glass units are spread over the racks in the order they were bought, as
       `boardsOnStore` spreads boards.
     - Each glass rack's plate (`rect.rack-count-plate`, `text.rack-count`) on its front face at 0.55
       of its height, on the standard class's `CLASS_BADGE` colour, reading the count alone, `7` and
       `0`, as decisions.md 4 says and as `rackCount` letters the timber rack's `12`: a one figure
       count makes a one figure plate, at the width `rackCount` gives it (11 scene pixels). The row
       captions read `plates 7 and 0`. The first shot's plates read `7 / 40` and `0 / 200`; they
       were redrawn after the review.
     - Every other line is the engine's, the timber rack with its plate and name among them.
   - **[TUNE: mock] choices.**
     - **The glass racks' places.** The engine's first free cells for them are x 8, y 0 and x 10, y 0,
       side by side along the rear wall, where the large one stands beside the small one and nearer
       the camera, and its box hid the glass rack's front face, name and plate. So the mock moves
       them as a player would.
     - **The count is said twice.** On kit with no picture the name, and so its count, is drawn over
       the box, so until the pictures land each glass rack shows its count both in its name
       (`7 / 40`) and on its plate (`7`). A timber rack drawn from its picture shows only the plate.
   - Shot at 1600 wide, full page (1600 by 2249), deviceScaleFactor 1. Generator (scratch, not in
     the repo): `scratchpad/mock-hall-glass/gen.ts`, with `specs.ts` and `company.ts`, run with
     vite-node from `scratchpad/snap-a1`, and shot by `scratchpad/mock-final/shoot.cjs`
     (127.0.0.1:8745). The generator stops if the page holds a dash or if the markup it rewrites is
     not found.

   Nearest existing: `docs/report-t29/13-a-timber-rack-and-the-shelter.png`,
   `docs/mockups/t29/timber-stores.png`,
   `docs/report-t28/12-the-800-m2-hall-with-the-timber-machines.png`,
   `docs/report-t31/09-timber-shelter-behind-the-rear-wall.png`,
   `docs/mockups/t31/shelter-behind-wall.png`, `docs/mockups/t30/hall-line-whole.png`.

5. `board-tile-window.html` (and `board-tile-window.png`): 2.7 and 2.8.3, the order board's tiles,
   in its folder on its Enquiries tab: the board's `tabBar` over `renderBoard`, with its shell through
   `syncModals` and the spec `app.ts` writes (`Order board`, `full`, width `mock-mid`). Today on the
   left and After on the right.
   - **The company the engine built.** The same company as page 2, plus both covers held
     (`SET_INSURANCE`), so a commercial enquiry can be taken. At Wed 3 March 2025, 08:00, three
     enquiries are put on the board in the shape `buildEnquiry` makes them, each deadline taken from
     the engine's own `enquiryDeadlineDays` (with a fixed draw) and checked against `blockFor`:
     - a handleless kitchen of £9,000, a sheet product, whose tile this turn does not touch, as a
       control: it reads `18 sheets of material` on both sides;
     - the casement window of £9,000: 12 boards, 7 glass units;
     - `Sash windows, commercial` of £32,000: 42 boards, 23 glass units (£4,480 of glass).
   - **Today (v96).** The casement tile reads `12 boards of material · about 9.8 owner days`, and its
     Needs line ends `timber store`. The sash reads `42 boards of material · about 34.9 owner days`,
     then in red `42 boards, and the timber stores hold 40` (`data-stores="short"`), with no Accept,
     because `canAccept` refuses it on `storesHoldCheck`.
   - **After.** The casement reads `12 boards and 7 glass units of material · about 9.8 owner days`
     and the sash `42 boards and 23 glass units of material · about 34.9 owner days`; both Needs lines
     end `timber store, glass rack`; the red line is gone and the sash carries `Accept`. The After
     caption says a glass rack stands beside the timber rack, as 2.1 wants.
   - **Written by hand,** into the engine's markup in the tile's own classes: the glass units in the
     material line, `, glass rack` at the end of the Needs line, the red line taken out, and the
     sash's Accept (made with the game's own `button('acceptEnquiry', ...)`).
   - **[TUNE: mock] choices.** The sash for the red line is commercial at £32,000: the smallest price
     whose boards pass 40 (42) and whose deadline the owner alone can still meet; at £33,000 and up
     `blockFor` greys it `too few people for the deadline`. The agency never draws a window, and no
     residential window reaches 40 boards. The owner days are the engine's (9.8 and 34.9), which
     decisions.md 5 leaves to the engine (`about N owner days`).
   - **A note for the code.** Once B1 puts the glass rack on `wantedKit`, a company with no glass
     rack sees both window tiles greyed `Cannot take this: no glass rack`. That is why the After
     board stands one.
   - **Found and left.** The `badge-kind` plate `Commercial` can hardly be read in the folder skin, in
     both panels. It predates this turn and no CSS changes tonight.
   - The lead's wording was mended after the review (`a sheet product, whose tile this turn does not
     touch`). Shot at 2100 wide, full page (2100 by 1358). Generator (scratch, not in the repo):
     `scratchpad/mock-jobcard/gen-tile.ts`, with `company.ts` and `shell.ts`, shot by
     `scratchpad/mock-final/shoot.cjs` (127.0.0.1:8745).

   Nearest existing: `docs/report-t29/18-a-window-the-stores-cannot-hold.png`,
   `docs/report-t28/09-timber-tiles-live-locked-and-greyed.png`,
   `docs/mockups/t28/timber-tiles.png`, `docs/report-t26/10-big-job-red-and-green.png`.

6. `catalogue-storage-glass.html` (and `catalogue-storage-glass.png`): 2.1 (decisions.md 6), the
   equipment catalogue in its folder on its Storage tab, drawn by
   `renderCatalogue(state, '', 'storage', folder, 'all', null)` with its tab bar, the shell through
   `syncModals` with the spec `app.ts` writes for the catalogue (`Equipment catalogue`, `full`,
   `mock-narrow` width, as `docs/mockups/t28/timber-catalogue.html`). Two panels in the first row and
   three in the second.
   - **The company the engine built.** The same `bigUnit` as page 3 (the 800 m² unit, the day one
     kit, industrial air), with a timber rack bought through `buyNow`, at Wed 3 March 2025, 08:00.
     The day one list reads `Day one kit complete`, and the `catalogue` bubble is marked seen.
   - **The specs, pushed in the generating process only.** The two glass racks were built in the
     timber rack's shape, its spec and its one class copied, `boardCapacity` dropped, `glassCapacity`
     40 and 200 added, with page 4's figures: `Glass rack`, £1,500, 2 by 1 by 2 m, zone 2 by 2, 3
     working days; `Large glass rack`, £6,000, 4 by 2 by 2.5 m, zone 4 by 3, 5 working days. Both
     have a life of 100,000 hours, `spriteKey` `glassRack` and `glassRackLarge`, and no file. They
     are spliced into the snapshot's `EQUIPMENT_SPECS` straight after `timberShelter`, so the tab
     lists them after `Timber shelters`. The engine keeps its spec lookup (`specsById`) from its first
     call, so the two go in before anything else runs; today's two panels are drawn with them taken
     out of the list the folders walk.
   - **Today (v96):** the Storage tab lists `Benches`, `Racks`, `High capacity rack`, `Timber racks`
     (Owned 1), `Timber shelters`, `Tool cabinets` (Owned 1) and `Lockers`. Beside the new cards, as
     the nearest card, the Timber racks folder is open on its card: `Holds 40 boards`, £1,200,
     `Delivered in 3 working days`, `Takes 4 m by 1 m, works in 4 m by 2 m`, the picture,
     `Buy another`.
   - **After, the tab:** two folder cards after `Timber shelters`, in the folder card's own markup:
     `Glass racks` (`from £1,500 · 1 class · Holds the glass units of the windows and doors on the
     hall floor, upright in their frames.`) and `Large glass racks` (`from £6,000 · 1 class · Holds
     five times a glass rack's units on twice its floor.`).
   - **After, each folder open:** the `Glass rack` card shows the empty `tile-picture-box`, the box
     the catalogue draws while a class has no file (the stylesheet's flat slab in the machine kit's
     colours), as the T28 cutter set card showed it; then `Life about 100,000 hours`,
     `Holds 40 glass units`, £1,500, `Delivered in 3 working days`, `Insurance £60 a year`,
     `Takes 2 m by 1 m, works in 2 m by 2 m`, the sentence `A steel A frame holding the sealed units
     upright on rubber, two metres of it on the hall floor.` and `Buy`. The `Large glass rack` card:
     `Holds 200 glass units`, £6,000, `Delivered in 5 working days`, `Insurance £240 a year`,
     `Takes 4 m by 2 m, works in 4 m by 3 m`, `A slotted steel rack holding the sealed units upright
     in rows, four metres of it on the hall floor.` and `Buy`.
   - **Written by hand:** only `Holds 40 glass units` and `Holds 200 glass units`, each a
     `p.tile-figures`, last of the effect lines, where the timber rack's card writes
     `Holds 40 boards`. In v96 `holdsLine` in `src/ui/machine.ts` reads only sheets and boards, so the
     code needs a glass branch there. Every other line is the engine's, drawn from the pushed specs.
   - **[TUNE: mock] choices.** The insurance figures, `Life about 100,000 hours` and the primary `Buy`
     are what the engine makes of the copied timber rack shape and the brief's prices; none was
     chosen by the mock. The second folder's name `Large glass racks` is decisions.md 6's reading.
   - Not re-shot after the review: nothing on it changed. Shot at 2100 wide, full page (2100 by
     2573). Generator (scratch, not in the repo): `scratchpad/mock-catalogue-glass/gen.ts`, with
     `glassSpecs.ts` and `shoot.cjs` (127.0.0.1:8744); it shares `page.ts` and `company.ts` of
     `mock-line-block`.

   Nearest existing: `docs/mockups/t28/timber-catalogue.png`,
   `docs/report-t28/08-a-cutter-set-card.png`, `docs/report-t28/06-the-planer-folder.png`,
   `docs/report-t27/06-the-cnc-folder-at-90000-and-144000.png`.

## Readings to report

- **Two folders where the brief names one.** Brief 2.1 and section 9 (6) name one folder,
  `Glass racks`. The pages draw two, `Glass racks` and `Large glass racks`, one a family of one
  class each, as `Timber racks` and `Timber shelters` are (decisions.md 6) [TUNE].
- **`on twice its floor`.** The large glass rack's effect text is the brief's own [TUNE] wording and
  is kept. By the brief's own figures the large rack takes four times the glass rack's floor (8 m²
  against 2 m²) and three times its working zone (12 m² against 4 m²); if Piotr wants the words to
  match, `on four times its floor` [TUNE].
- **The plate.** The brief's "plate `7 / 40`" is read as the plate and the name's count together
  (decisions.md 4): the plate reads the count alone (`7`, `0`) and the name `Glass rack: 7 / 40`.
- **`Today (v96)`.** Section 9 says "beside the page of v95"; the pages say `Today (v96)`, the game of
  the A1 commit, which is v95's with the version bumped, as Turn 31 labelled its pages.
- **[TUNE: mock], page 1:** the stock numbers' digits (+2 boards, +3 glass); the aria labels
  `Boards to order` and `Glass units to order`; `data-kind` on each Restock; `data-stock="sheets"` on
  the sheet line (today writes `sheet`); the project row's `12 boards` kept without the glass; the
  paid storage hint not drawn; After (a)'s history (the boards held at the click, the empty glass rack
  sold, the glass alone ordered on Thu 4 March).
- **[TUNE: mock], page 2:** 7 boards and 4 glass units held in (a); the glass figure beside the boards'
  figure on one line; today's short card drawn all 12 short, as v96 draws it.
- **[TUNE: mock], page 3:** the held figures (24 boards for 12 windows and glass for 8 running; no
  boards and glass for 14 standing) and the zero form `0 boards, for 0 windows`.
- **[TUNE: mock], page 4:** the glass racks moved by `MOVE_ITEM` to x 3, y 10 and x 7, y 10, off the
  rear wall cells the engine picked; the count said twice on kit with no picture.
- **[TUNE: mock], page 5:** the commercial sash at £32,000 as the window bigger than the stores.
- **[TUNE: mock], page 6:** the second folder's name `Large glass racks`; the engine's own insurance,
  life and `Buy` from the copied timber rack shape.
- **Found and left, not the mock's:** the thumbnails' labels on the Materials page and the
  `Commercial` badge on the board tile can hardly be read, today as after; no picture or style is
  changed tonight.
