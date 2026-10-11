# Mockups for Turn 30

Drawn by Claude Code on 11.10.2026, before the code that makes them true (CLAUDE.md T30 section 9).
Piotr asked for this turn in one go and has not seen these: they are built only of what the game
already draws. Each page is the game's own markup in the game's own classes, made by the game's own
functions (`renderCatalogue` with `renderOpenFolder`, `renderMachine`'s class cards and the Owned
tab's `ownedTile` and `turnAndSellRows`; `renderEvent` and `renderEventFooter`; `renderContracts`;
`hallScene` and `sceneHtml` of `src/render/hall.ts`; every shell through `syncModals`), from states
the engine built, linked to `src/ui/styles.css`, and shot in headless Chromium with `public/` served
at the root so the folder paper, the hand font and the pictures load. The page around each shell is
the mockup's own layout (the `mock-*` block of Turn 28's and Turn 29's pages, copied unchanged; the
two hall pages add only `.mock-hall` and `.mock-cell` to it) and no game style. Each new screen
stands beside the same screen as it is today (v88), each under its own caption. No new CSS token or
class is used anywhere, no page holds an em or en dash, and no art was asked of the art side before
the code: what is asked of it afterwards goes into `docs/art/REQUESTS-T30.md` (task T30-E1).

Where tonight's code does not exist yet, the line bought whole (the sixth module, the 3 m height,
the price of the six, the 36 m by 3 m floor, the folder `Production line`, no `requires`) was pushed
into the engine's own tables in the generating process only, the two new kinds of event card were
made there too, and the lines no renderer writes yet were written by hand into the rendered markup,
in the classes the neighbouring lines use; each entry says which. Nothing under `src/`, `tests/` or
`public/` was edited by a mockup. Pages 4, 6 and 7 were generated from a snapshot of the last
commit, so the lead's work in progress on T30-C1 was never read. Every date is the game calendar's
(30 day months, day 1 Monday 1 March 2025). Each generator ran with `npx vite-node` from a scratch
folder outside the repo, and no server or browser of the shoot was left running.

**The line's new pictures.** They were shot from `docs/pictures-t30/`, where the ZIP put them. Task
T30-C1 has since moved them into `public/sprites/`, byte for byte (all 28 checked against the hashes
in `docs/art/pack-1110/pictures-t30.json`), so pages 1, 4 and 5 now point at
`../../../public/sprites/windowLine<N>.standard.png` (and `windowLine6.standard.stack07.png`) in
place of `../../pictures-t30/`; page 6 already did. Shot again after that change, the three PNGs are
the same as before, pixel for pixel. The pages' own lead paragraphs still name `docs/pictures-t30/`,
as they were written when shot. **The today sides** draw the game's own `/sprites/` URLs, which
served T30-B1's files when shot (Turn 29's modules of 2.5 m, and pack 1's sander already). Once
T30-C1 is committed, `/sprites/windowLine1` to `windowLine5` are the new 3 m pictures, so the today
sides of pages 4, 5 and 6 show them in Turn 29's boxes in the HTML; the PNGs keep v88's modules as
they were shot.

1. `production-line-tab.html` (and `production-line-tab.png`): 2.3.3, 2.3.4 and 2.10, the equipment
   catalogue in its folder. Panels A to C and both panels of today are on Wed 3 March 2025. Panel A
   is a company in the 200 m² unit with the day one kit and £250,000. Panels B and C are companies
   in the 800 m² unit with the day one kit and £6,000,000 or £12,000,000. Panel D is the same
   company with the line standing on Mon 4 May 2025: the line was ordered Wed 3 March and stood Wed
   15 April, the diamond tooling was fitted Wed 29 April, and the line software was ordered that
   morning. It has £540,000, so with the overdraft limit of £10,000 the servo press is affordable
   and the second robot is not.
   - **The tab, today and after.** The Production line tab today (v88) shows its five folders, `Line
     module 1` to `Line module 5`, from £1,500,000, £750,000, £750,000, £1,000,000 and £1,000,000.
     After, it shows one folder, `Production line`, reading `from £10,000,000 · 1 class · Makes
     windows from the board to the pallet: six modules in one line, 36 m long.`
   - **The opened folder.** Its heading reads `Production line`, with `Back to Production line`. It
     holds one card, `Window production line`, in the class card's classes, with module 1's picture
     in the slot and nine lines: `Module 1: cross cutting and planing`; `Module 2: moulding`;
     `Module 3: sanding`; `Module 4: pressing`; `Module 5: the Finishing, sprayed and hung on the
     overhead rail`; `Module 6: the Glazing, then wrapped and stacked on a pallet`; `With two
     engineers, timber work goes 2.4 times as fast`; `It can make windows on a contract of its own:
     one every 2 hours`; `Sold whole, for half its price; the upgrades go with it`.
   - **The card's costs.** £10,000,000; `Delivered in 30 working days`; `Power £360 a day`;
     `Insurance £200,000 a year` in the 200 m² unit and `Insurance £400,000 a year` in the 800 m²
     unit; `Takes 36 m by 3 m, works in 36 m by 3 m`. Then the description and one Buy.
   - **The line card in four states.** Panel A: locked, `Needs the 800 m² unit`. Panel B: locked,
     `Not enough cash`. Panel C: Buy, the primary button. Panel D: locked, `The company has its
     production line`, with the class card's own Owned badge and frame.
   - **The four upgrade cards**, under the line's card in the same folder: `Diamond tooling`
     £400,000, `Line software` £300,000, `Servo press` £500,000 and `Second spraying robot`
     £600,000, each with its sentence and the two lines `Takes 15 minutes off each window of the
     line's contract` and `Fitted 10 working days after the order`. Panels A to C: all four locked,
     `Needs the production line`. Panel D: `Fitted`; `Being fitted: ready on Mon 18 May`; the servo
     press offered with Buy; `Not enough cash`.
   - **Today's nearest screen.** Beside them, the CNC centre tab today (v88), with the `Five axis
     CNCs` folder open on its three class cards.
   - **How the after panels were made.** Turn 30's line was pushed into module 1's own spec in the
     generating process only: its folder and effect, and no `requires`; the price £10,000,000, the
     sum of the six shares, on the spec and its class; 36 m by 3 m, 3 m high, the power of six
     modules; the name and the description; modules 2 to 5 taken off the tab; and
     `WINDOW_LINE_ORIGIN` at x 2. So these are the game's own: the folder line, the heading, the
     hint, the price, the wait, the power, the insurance, the floor, and the two refusals `Needs the
     800 m² unit` and `Not enough cash`; `canBuy` passes for the company with £12,000,000. Today's
     panels were drawn before anything was pushed.
   - **Written by hand:** the line's nine lines, in place of Turn 29's `lineModuleLines`; `The
     company has its production line`, put through the spec's own locked path in place of v88's `The
     line has this module`; that card's `Buy`, in place of the class card's `Buy another`; and the
     four upgrade cards. Each upgrade card is a `div.tile` (`is-locked` when refused) with
     `data-upgrade="<id>"`, then `h3.tile-name`, no picture slot, both lines in `.card-effects`,
     only `p.tile-price` in `.card-costs`, the sentence as `p.tile-text card-description`, the
     reason in `p.lock`, and `lockedButton('Buy', reason)` or the plain `button('buyLineUpgrade',
     'Buy', 'data-id="<id>"')`; the action name and the plain (not primary) button are the mock's
     own [TUNE: mock]. The upgrades go in the line's own `tile-grid` after its card, which the
     folder's one column puts under it (a second grid would touch the first with no gap). The ready
     day comes from `addWorkingDays` and `formatCalendarDay`, and the short of cash state from the
     engine's `canAfford`.
   - **Left as the renderer writes it, for the lead to decide.** The hint under the heading ends `1
     class to choose from.`, and with the line standing ` One is in the hall already.` follows it.
   - **Known, and the page layout's only.** On the tall panels the last card stands over the
     folder's bottom edge; the mock layout block is copied unchanged from Turn 29, and its tall
     pages do the same.
   - Generator (scratch, not in the repo): `scratchpad/mockups/line-tab/gen.ts`.

   Nearest existing: `docs/mockups/t29/production-line-tab.png`,
   `docs/report-t29/02-the-production-line-tab.png`,
   `docs/report-t29/04-module-1-in-the-200-m2-unit.png`,
   `docs/report-t29/05-module-1-that-can-be-bought.png`,
   `docs/report-t29/01-the-cnc-centre-tab.png`, `docs/mockups/t29/cnc5-and-robot.png`; for a refusal
   on a card, `docs/report-t28/06-the-planer-folder.png` and
   `docs/report-t28/08-a-cutter-set-card.png`.

2. `line-contract-offer.html` (and `line-contract-offer.png`): 2.6, the offer of the line's contract
   on the event modal's small folder, beside the card of two choices the game has today. Both cards
   come from the same path: the shell through `syncModals` with the spec `app.ts` writes for an
   event, `closable: event.choices.length === 1`, so neither card has a cross; the body through
   `renderEvent` and the choices through `renderEventFooter`, the first choice the primary button.
   The page is 1700 wide, so the two cards stand side by side at the size the game draws a small
   folder on a normal screen (520 by 780).
   - **Today (v88):** the engine's own `End of day`, raised by `askAboutGoingHome` at Mon 1 March
     2025, 17:00, on a new company's first day: two choices, `Go home` and `Stay for overtime`, and
     no cross.
   - **After 2.6:** `Windows off the line` at the open of a working day, Mon 5 October 2026, 08:00,
     the day the six modules stand and two line engineers are on the books. Body: `A window company
     will take every window your line makes, at £1,500 a window. The timber and the glass for each
     one are bought as it is made, £600 a window. The line makes one every 2 hours, about 20 a week,
     and the client collects each pallet of ten the next working day. It runs until you end it.` Two
     choices, `Take it` and `Not now`, and no cross, as on `End of day`. `whyKeyForEvent` gives the
     new kind no note, so no `i` link is drawn.
   - **The same card offered again** on Mon 26 October 2026, a week after the contract was ended,
     with one upgrade fitted: the figures come from `lineWindowMinutes` at 105, in the running
     block's words of 2.9, `one every 1 h 45 min, about 22 a week`. This variant is [TUNE: the
     mock's reading of the card's figures], because the brief gives no words for the card with an
     upgrade.
   - **Written by hand:** there is no line contract in the engine yet, so the event itself was made
     in the generating process: its kind `lineContractOffered`, its title, its body (the brief's
     words verbatim, and the second card's figures as above), and its two choices with ids `take`
     and `decline`. Every line of markup on the page is the game's renderers' own; none was written
     into the markup by hand.
   - Generator (scratch, not in the repo): `scratchpad/mockups/offer/gen.ts`.

   Nearest existing: `docs/report-t15/12-event-modal.jpg` (the event modal's folder over the desk);
   `docs/report-t28/02-the-christmas-break-card-in-december.png` and
   `docs/mockups/t28/closure-cards.png`; `docs/mockups/t27/tax-cards.png`;
   `docs/mockups/t29/contracts-four.png` (a card of one choice with its cross, for the contrast).

3. `line-contract-running.html` (and `line-contract-running.png`): 2.9, with the figures of 2.6 to
   2.8. The Orders board's Contracts tab in its folder (`renderContracts`, the shell through
   `syncModals` as `app.ts` asks for it, `mock-mid` width), drawn for a company the engine built:
   the 800 m² unit with the day one kit and Turn 28's timber kit at the standard class, four
   experienced joiners (Sam, Tom, Dan, Ben) and air and extraction. It took `Sash windows for
   Northgate Interiors` at £249 a piece, 18 a week for 13 weeks, at the open of Tue 11 November
   2026, with Sam and Tom on it. The engine ran it to the minute of each picture, so the counter,
   the `On it 2 of 4` row, the people rows and the `Delivered` row are the engine's own. The seeded
   offers of those days are left off the page.
   - **(a) Tue 18 November 2026, 16:10.** Today (v88) the tab holds the joiners' contract alone.
     After, `Windows off the line` comes first, straight under the tab's head line and above the
     standing contract, running whole with 1 pallet at the gate.
   - **(b) Thu 20 November 2026, 11:00**, the same pair. After, the line stands still with six
     windows on its pallet and no pallet at the gate.
   - **The line's block**, in the classes of a running contract's block (`activeBlock`,
     `div.contract-active`): the head row, `h3` `Windows off the line` and `End it` in `row-action`
     (an enabled `button()`, one click, asking nothing); `p.figures` with `<strong
     class="contract-count">This week: 7 windows. In all: 111</strong> · £1,500 a window; the timber
     and the glass £600 a window`; `p.hint` `One window every 2 hours: about 20 a week`; the rows
     `On the pallet` / `1 of 10` and `At the gate for collection` / `1 pallet`, in the markup of the
     private `countRow`; in (b), `This week: 12 windows. In all: 116`, `On the pallet` / `6 of 10`,
     no gate row, and `p.warn` `Standing still: one engineer on duty`. The block has no People, no
     `On it` and no week to meet: nobody is put on it.
   - **The figures hang together at 120 minutes a window:** four a working day, at 10:00, 12:00,
     15:00 and 17:00 (the dinner hour is 12:00 to 13:00). The contract was taken at the open of Fri
     9 October 2026, so 27 working days give 108 windows by the close of Mon 16 November. On the
     Tuesday the 110th, made at 12:00, sent its pallet to the gate, and the client takes it at the
     open of Wednesday.
   - **Written by hand:** the whole of the line's block, and where it stands. `On the pallet: 7 of
     10` and `At the gate for collection: 1 pallet` are each a row's two halves, as Turn 29 drew `On
     it: 3 of 4`. Three things are [TUNE: the mock's reading]: `End it` carries
     `data-do="endLineContract"`; the block is marked `data-line-contract="1"`, not `data-contract`;
     and the pallet and price lines are placed as above, with the counter first in the figures line
     as the tab's own block has it, and the standing still line last as a `p.warn`, the class the
     block already uses for `Nobody is on it`. No class or token is new.
   - **Two notes for the code.** The brief's example `On the pallet: 7 of 10` beside `At the gate
     for collection: 1 pallet` cannot happen at 120 minutes: a pallet at the gate went that same
     working day, and at four windows a day the new pallet then holds three at most (seven at most
     at 60 minutes, with the four upgrades). The mockup uses 1 of 10 with a pallet at the gate, and
     6 of 10 without one. And on v88 the `Delivered` rows print the game's own week number (`Week
     88`, from `weekOfDay`) while the head says `week 2 of 13`; it is drawn here as the engine does
     it, outside this turn's scope, but worth a line in the notes.
   - Shot in headless Chromium at 2100 wide, then cut to 2100 by 2369 at the end of the last folder.
     Generator (scratch, not in the repo): `scratchpad/mockups/running/gen.ts`.

   Nearest existing: `docs/report-t29/19-a-full-contract-on-the-orders-board.png`,
   `docs/report-t20/02-contracts-running.png`, `docs/mockups/t20/contracts-tab.html`,
   `docs/report-t13/07-board-contracts.jpg`, `docs/mockups/t29/contracts-four.png`,
   `docs/mockups/t29/sash-window-contract.png` (its part (c), the running sash window block).

4. `hall-line-whole.html` (and `hall-line-whole.png`): 2.2, 2.4 (the place at the order), 2.8 and
   2.12. The 800 m² hall of a company on Wed 3 March 2025 at 08:00, with the day one kit, Turn 28's
   timber machines, the five axis CNC and the timber shelter, all off the line's cells, and three
   finished pieces waiting at the gate for transport (`jobsAtGate`). Each picture is the game's own
   hall scene (`hallScene` and `sceneHtml` in `src/render/hall.ts`), shot with four cameras: the
   zoom the game opens at (`hallStartCamera`, a fifth past the fit); the line's end at zoom 2.5; two
   modules meeting at the closest zoom, 4; and the gate at zoom 4. Each frame is the shape of the
   game's own view (760 by 548, letterboxed as the game letterboxes it), today on the left and after
   on the right.
   - **Today (v88).** Turn 29's five modules of 2.5 m stand at `WINDOW_LINE_ORIGIN` (5, 14), six
     cells apart. At the gate the finished goods show two boxes at y 9 and the label `At the gate:
     3`; the second box already hides a letter of that label today.
   - **After.** The six modules of 6 m by 3 m by 3 m stand end to end at x 2 to 37, y 14 to 16,
     module N at x 2 + 6 (N - 1), orientation 0. At zoom 4, modules 1 and 2 meet and the conveyor
     runs from one into the next. Module 6 has seven windows on its pallet, and one pallet of
     windows stands at the gate.
   - **Changed in memory only.** The sixth family and the 3 m height were put into the engine's own
     tables in the generating process only: module 6 is a copy of module 5's family under module 6's
     id, name and picture, also added to `LINE_MODULES`, `TIMBER_FAMILIES`, `BUILT_TO_ORDER`,
     `MACHINE_SHORT_WORDS` and `DUST_OUTPUT_M3_PER_HOUR`. The page was generated from the last
     commit (T30-B1) exported to the scratch folder, because `src/engine/constants.ts` was being
     edited in the working tree; a check in the generator confirmed that today's line is v88's (five
     modules of 2.5 m from x 5, no module 6). Because that commit is T30-B1, the sander on both
     sides is already pack 1's picture.
   - **Written by hand:** module 6's seven wrapped windows, a second `<image>` of
     `windowLine6.standard.stack07.png` cloned from the module's own image so it has the same box
     and anchor, inside the module's own `data-kit` group straight after the picture, with
     `data-stack="7"`; the pallet at the gate, one box `<g data-line-pallet="0"><title>Windows for
     collection</title>` made with the game's own `box(boxPolygons(0, 10, 1, 1, 1.75),
     'var(--kit-stock)', 'var(--kit-stock-dark)')` as a finished goods box is made, put among the
     live drawables at `depthKey(0, 10)`; and the label `Windows for collection: 1 pallet`, made
     with the game's own `label()` at depth + 0.3 as the finished goods' label is, hung 14 px under
     the front corner of the pallet's floor at `tileToScreen(1, 11, 0)` so that it does not sit on
     the finished goods' label [TUNE: the mock's reading]. `LINE_PALLET_LAYOUT` `{ x: 0, y: 10,
     width: 2, depth: 1, height: 1.75 }` is the brief's.
   - **Found, for the lead.** The pallet's box is 1.75 m high and stands at y 10, just in front of
     the finished goods at y 9. It is drawn after their label (depth 10 against 9.3), so it hides
     the start of `At the gate: 3`; the gate crop at zoom 4 shows it. Two ways out: draw both labels
     after both rows of boxes, or move the pallet one cell further from the finished goods.
   - Generator (scratch, not in the repo): `scratchpad/mockups/hall-line-whole/gen.ts`, run from the
     export in `hall-line-whole/head/`.

   Nearest existing: `docs/report-t29/07-the-800-m2-hall-with-the-whole-line.png`,
   `docs/report-t29/08-the-same-hall-with-module-1-alone.png`,
   `docs/report-t28/12-the-800-m2-hall-with-the-timber-machines.png`. No picture of the finished
   goods at the gate exists yet: the today side of this page is the first.

5. `setup-drag.html` (and `setup-drag.png`): 2.4, the line moved as one in setup mode. The hall is
   the game's own scene in setup mode: `hallScene` with `setup: true` and a ghost, put through
   `sceneHtml`, which draws the grid over the painting and the ghost's outline and label on top of
   everything; the ghost is the one place the hall draws a dragged item. The company is in the 800
   m² unit on Wed 3 March 2025, with the clock stopped as `startSetup` stops it, the day one kit,
   Turn 28's timber machines, the five axis CNC and the timber shelter (`bigUnit` of
   `tests/engine/t29Line.test.ts`, as it is). Under the hall is its bottom column with Done, Rotate
   and the setup sentence, and the camera's three chips, as `hallBottom` places them. While a thing
   is dragged, the game leaves it drawn where it stands and draws its ghost at the mouse, green with
   `Drop it here` or red with the engine's refusal; a refused drop changes nothing.
   - **Today (v88).** Turn 29's five modules of 2.5 m stand from x 5, and setup mode never lifts
     them (`canPlace`: `The line stands where it is built`), so the sander is dragged instead. Its
     ghost is its zone (`boxOf`) and the verdict is `canPlace`'s own: from (20, 6) to (12, 10),
     green, `Drop it here`; onto the sheet rack at (11, 6), red, `On the sheet rack`.
   - **After.** The six modules of 6 m by 3 m by 3 m stand end to end at x 2 to 37, y 14 to 16. The
     line is taken by any of its modules; the ghost is the whole 36 m by 3 m at the drag, and the
     six stay drawn at y 14 until the drop. Dragged 3 m to the front, module 1 at (2, 17): the 36 by
     3 is clear of everything but the line itself, so the ghost is green, `Drop it here`. Dragged
     with module 1 at (2, 4): it lies over the workbench, the sheet rack, the spindle moulder, the
     sander, the frame press and the spray booth, so the ghost is red, `The line needs a clear 36 m
     by 3 m`. The verdict was worked out the way the brief puts it: `canPlaceSpec` of each module's
     6 by 3, on a copy of the hall with the line taken out; the refusal's words are the brief's,
     with the engine's `metresBy`.
   - **Layout of the page.** The four halls are shown at the fit; below them, the same four at zoom
     2, centred on the ghost's label. The closer frames leave out the bottom column so that it
     covers nothing.
   - **Changed in memory only.** The sixth family (module 5's under module 6's id, name and picture)
     and the 3 m height of all six were pushed into `EQUIPMENT_SPECS`, `TIMBER_FAMILIES`,
     `BUILT_TO_ORDER`, `LINE_MODULES`, `MACHINE_SHORT_WORDS` and `DUST_OUTPUT_M3_PER_HOUR` in the
     generating process only.
   - **Written by hand:** the line's ghost box, 36 by 3 from module 1's cell, passed to `hallScene`
     as its ghost [TUNE: the mock's reading of "the six at the drag together": one 36 by 3 outline,
     where the brief also allows six outlines]; the five joins of the six modules, lines across the
     ghost in its own colour and stroke inside its own `data-ghost` group; the refusal text, given
     as the ghost's `reason`; `setupControls` and `hallZoomControls` (both private to
     `src/ui/app.ts`), copied out word for word; and today's `ghostFor` (private), done again with
     `boxOf` and `canPlace`.
   - **Two things to know.** The game's own `.iso-label` rule draws the ghost's label in dark ink,
     not in the ghost's colour. At this frame width of 760 px the setup sentence wraps under the
     camera's `Fit` chip; that happens at a narrow width in the game too, and is not part of this
     change.
   - Generator (scratch, not in the repo): `scratchpad/mockups/setup-drag/gen.ts`.

   Nearest existing: no picture of setup mode exists in `docs/` yet, so the today side of this page
   is the first; for the turn, `docs/report-t22/12-the-standard-cabinet-at-all-four-turns.png`; for
   the hall drawn by `renderHall`, `docs/mockups/t26/hall-before.png` and
   `docs/mockups/t26/hall-after.png`; for Turn 29's modules refused in their place,
   `docs/mockups/t29/production-line-tab.png`; and `docs/mockups/t30/hall-line-whole.png` (mockup 4,
   the same hall with the line standing whole).

6. `owned-tile-sell.html` (and `owned-tile-sell.png`): 2.3.5, with the Move of 2.4. The catalogue's
   Owned tab, through `renderCatalogue` with its Owned tab, `ownedTile` and `turnAndSellRows`, in
   its shell through `syncModals`. The company is in the 800 m² unit on Wed 3 March 2025, with the
   day one kit, air enough for a CNC, a four sided planer at the standard class and two line
   engineers on the books; the hall's own extractor is put at the industrial class so that the
   planer's tile is not about short extraction. Each pair puts today (v88) on the left and after on
   the right, and the catalogue's own filter field (`planer`, `module 3`) shows one tile at a time:
   - **The Production line sub tab.** Today Turn 29's five modules stand on their fixed cells (x 5
     to 34, y 14): modules 1 to 4 read `Cannot sell it: Sell the module after it first` and module 5
     reads `Sell for £500,000`. After, the six stand whole at x 2 to 37, y 14 to 16, and every tile
     reads `Sell the line for £5,000,000` with `Move` on its action row.
   - **Before the click.** Today the ordinary machine, the four sided planer, reads `Sell for
     £14,000`. After, module 3 alone reads `Sell the line for £5,000,000`.
   - **After the first click.** Today the planer reads `Confirm sale`. After, module 3 reads
     `Confirm sale`, and the other five tiles keep their sale.
   - **A man at the kit.** Today Pete is at the planer and it reads `Cannot sell it: Somebody is
     standing at it`. After, Pete is at module 1 (the engine's `menAtMachine` does put him there)
     and module 3 is refused in the same words.
   - **Sold.** Today the planer reads `Sold, collection on Thu 4 March`. After, the six are marked
     sold together, and module 3's tile carries the tile's own two rows, `Sold, collection on Thu 4
     March` twice, as today's tile does for any sold machine (the Turn row and the Sell row).
   - **Pushed into the engine's tables, in the generating process only.** Module 6's family is a
     copy of module 5's, with `LINE_MODULES`, `BUILT_TO_ORDER` and every table keyed by
     `windowLine5` given `windowLine6`. The prices are the shares (2, 2.5, 1.25, 1.25, 1.5 and 1.5
     million), so `salePriceFor` summed over the six gives £5,000,000. The heights are 3 m, the
     `requires` are empty and the folder is `Production line`. The effects are module 1's `Makes
     windows from the board to the pallet: six modules in one line, 36 m long.`, and for modules 2
     to 6 the words of the lead's C1 work in progress (`Module 3 of the production line: sanding.`
     and so on).
   - **Written by hand into the rendered markup:** each module's sale row, `Sell the line for
     £5,000,000`, and `Confirm sale` on module 3, through the game's own `button('sellMachine',
     ...)`; the refusal on module 3, in the tile's `reason` span; and `Move` on each module's action
     row, through `button('startSetup', 'Move')` [TUNE: the mock's reading: the tile offers Move
     wherever `canPlace` accepts the item where it stands, which 2.4 makes true for a module]. A
     module still has no Turn row, as today [TUNE: the mock's reading]: the engine refuses the turn
     with `The line is never turned`, and v88's `turnAction` draws no row for a module.
   - **Where the pictures come from.** The generator ran on a snapshot of the last commit (v88's
     engine for the line), so the lead's work in progress was never read. By then T30-C1 had moved
     the art side's pictures into `public/sprites/`, so the module pictures after point at
     `../../../public/sprites/windowLine<N>.standard.png`, the 6 by 3 by 3 m pictures of 11.10.
     Today's tiles keep the game's own `/sprites/` URLs, served from the last commit for the shot,
     so the PNG shows Turn 29's 2.5 m pictures there.
   - Generator (scratch, not in the repo): `scratchpad/mockups/owned-tile-sell/gen.ts`.

   Nearest existing: `docs/report-t13/10-catalogue-owned.jpg`,
   `docs/report-t25/07-the-owned-tile-short-form.png`; for the Turn and Sell rows at the foot of a
   tile, `docs/report-t22/13-the-cabinets-card.png`.

7. `lifted-save-card.html` (and `lifted-save-card.png`): section 4, the card a lifted save opens
   with at its first settle (the event modal's small folder), drawn from a snapshot of the last
   commit (v89, STATE_VERSION 42) taken in the scratch folder, so the lead's half written `src/` was
   never read. Each card goes through the spec `app.ts` writes for an event, `syncModals`,
   `renderEvent` and `renderEventFooter`; with one choice it has the cross, and Escape and a click
   outside close it, as for every card of one choice.
   - **Today (v88):** a v42 save of Piotr's shape opens with no card, and `Window line, module 1` is
     still on order at £1,500,000. Beside the new card, for size and wording, is Turn 29's
     `Contracts take four joiners`, made by the engine itself: a whole v41 save with six joiners on
     `Cut sheet packs for Northgate Interiors`, lifted by `migrateState` (`liftToVersion42`) and
     settled one minute, as `tests/cloud/migrate.test.ts` does. It reads `A standing contract takes
     four joiners at the most from now on. Taken off Cut sheet packs for Northgate Interiors: Ben
     and Pete. They are waiting for work.`, with one `Right`.
   - **After, first card:** `The production line is sold whole` for Piotr's own save, Fri 9 December
     2027 (day 999): a company of today's build in the 800 m² unit with module 1 ordered through
     `placeEquipmentOrder` and one line engineer hired through `hireNow`. Body: `The line is bought
     as one now: six modules for £10,000,000. Your order for Window line, module 1 is cancelled and
     £1,500,000 is back in the bank. Your line engineers stay on the books.`, one choice, `Right`.
   - **After, second card:** a save with module 1 standing and module 2 on order. Body: `The line is
     bought as one now: six modules for £10,000,000. Window line, module 1 is taken back and
     £1,500,000 is back in the bank. Your order for Window line, module 2 is cancelled and £750,000
     is back in the bank. Your line engineers stay on the books.`
   - **Written by hand:** the two `lineRefunded` events (kind, title, the single `Right`, id
     `event-<nextId>`), made in the generating process because Turn 30's lift does not exist yet.
     The bodies were built from each save's own records: an order's `pricePaid` and a standing
     module's `purchasePrice`, the catalogue name from `findSpec`, `money()` for the figures, and
     the engineers' sentence because `lineEngineers` is not empty. The generator checked each body
     word for word against the brief's text and stops if one differs. The sentences follow the order
     of the modules [TUNE: the mock's order]. The page's lead paragraph names the refund's ledger
     line, `Production line refunded: it is sold whole now`, which is not drawn.
   - Shot at 1720 by 1500. Generator (scratch, not in the repo):
     `scratchpad/mockups/lifted-card/gen.ts`.

   Nearest existing: `docs/report-t29/22-the-card-of-the-trimmed-save.png` and
   `docs/mockups/t29/contracts-four.png` (Turn 29's card);
   `docs/report-t28/02-the-christmas-break-card-in-december.png` and
   `docs/mockups/t28/closure-cards.png` (the small folder);
   `docs/mockups/t30/line-contract-offer.png` (Turn 30's other new event card).
