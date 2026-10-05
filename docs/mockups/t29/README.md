# Mockups for Turn 29

Drawn by Claude Code on 05.10.2026, before the code that makes them true (CLAUDE.md T29 section 9).
Piotr asked for this turn in one go and has not seen these: they are built only of what the game
already draws. Each page is the game's own markup in the game's own classes, made by the game's own
functions (`renderContracts`, `renderWorkPlan`, `renderEvent`, `renderEventFooter`,
`renderCatalogue` and its class cards, `renderShopping`, `renderLaptop` through `renderTeam` and
`renderMaterials`, `renderTopbar`, `renderWarningStrip`, `renderBoard`, every shell through
`syncModals`), from states the engine built, linked to `src/ui/styles.css`, with the change of
tonight written into it, and shot in headless Chromium with `public/` served at the root so the
folder paper, the hand font and the pictures load. The page around each shell is the mockup's own
layout (the `mock-*` block of Turn 28's pages) and no game style. Each new screen stands beside the
same screen as it is today (v83). No new CSS token or class is used anywhere, and no art was asked
for before the code.

Where tonight's code does not exist yet, the new families, the role, the pieces and the tab were
pushed into the engine's own tables in the generating process only, and the lines no renderer
writes yet were written by hand into the rendered markup; each entry says which. Nothing under
`src/` or `tests/` was edited. Every date is the game calendar's (30 day months, day 1 Monday 1
March 2025). The new kit's pictures point at `../../pictures-t29/` where they were tonight: once
T29-C1 has moved them into `public/sprites/`, the HTML pages show empty boxes there and the PNGs
keep the pictures as they were shot.

**(7), the logo, is not drawn:** `docs/logo-incoming/` is not on main, so section 2.13 is skipped
whole (CLAUDE.md T29 2.13, section 9).

1. `contracts-four.html` (and `contracts-four.png`): 2.3 and the contract half of section 4. A
   company of seven joiners with `Cut sheet packs for Northgate Interiors` running, Wed 3 March
   2025. The Orders board's Contracts tab (`renderContracts`, in its folder): today six on it and
   a seventh offered `Put on it`; after, four of four, the row `On it` reading `4 of 4, the most a
   contract takes` and every free joiner's `Put on it` locked (`lockedButton`) with `A contract
   takes four joiners at the most` in its title; and three of four, `On it` reading `3 of 4` with
   the free men's `Put on it` working. The Work Plan's Contracts tab (`renderWorkPlan`, on its
   board): today six chips under `Assign to this contract`; after, at four of four,
   `reasonLabel('A contract takes four joiners at the most')` in place of the button, so the list
   is never opened; at three of four the button as today; the `On it` row straight after the
   assign line. Then the card a trimmed save opens with (`renderEvent`, the event modal's small
   folder): `Contracts take four joiners`, `A standing contract takes four joiners at the most from
   now on. Taken off Cut sheet packs for Northgate Interiors: Ben and Pete. They are waiting for
   work.`, one `Right`; and with two contracts trimmed, one sentence each. Beside it, for size,
   today's `He has gone` card; a v41 save raises no card today. Written by hand: the four `On it`
   rows (`countRow` is private to `src/ui/contracts.ts`; the brief's `On it: 3 of 4` is the row's
   two halves), the three locked buttons, the reason in place of the opener, and the card's title,
   body and kind.
   Nearest existing: `docs/report-t13/07-board-contracts.jpg`; `docs/report-t20/02-contracts-running.png`
   and `docs/mockups/t20/contracts-tab.html`; `docs/report-t28/02-the-christmas-break-card-in-december.png`
   and `docs/mockups/t28/closure-cards.png` for the card.

2. `cnc5-and-robot.html` (and `cnc5-and-robot.png`): 2.5, 2.6 and 2.7, the catalogue in its
   folder. The CNC centre tab today, `Nothing here yet.`, beside it after with the folder `Five
   axis CNCs`, `from £150,000 · 3 classes`. The folder open on `standard`, `pro` and `industrial`
   for a company in the 800 m² unit, with the brief's figures (£150,000, £300,000, £500,000; 12, 20
   and 32 men; 2,000, 2,400 and 3,000 m³/h; £16, £24 and £36 a day; 45, 45 and 60 working days; 5 m
   by 3 m, 6 m by 3 m, 8 m by 4 m, each zone a metre more each way), each card carrying `The
   Moulding of windows and doors goes 4 times as fast on it` under its Output line; the renderer's
   own Output +5%, +8% and +12%, life 6,000, 7,500 and 10,000 hours, dust 0.06, air 6.5 bar and
   650 l/min; and the first use bubble in its new words, `A machine family comes in classes, up to
   five: the effects come first, then the costs, then what it is.` Beside it today's CNC folder on
   its five classes and today's bubble. The same folder for a company in the 400 m² unit, every
   class locked `Needs the 800 m² unit`. The Spraying tab today (Drying racks, Spray booths) beside
   it after, with `Spraying robots`, `from £120,000 · 1 class`; the robot's card with a booth (`The
   Finishing at the booth goes 2 times as fast` in place of the Output line, £120,000, 30 working
   days, £8 a day, 2 m by 1 m in 3 m by 2 m), with its robot standing (`Buy another` locked, `The
   hall has its spraying robot`), and with no booth (`Needs Spray booth first`, the `requires`
   refusal of today); beside it today's drying racks card. Written by hand: the two effect lines,
   the two family lines and the descriptions (the brief's sentences); the two refusals `canBuy`
   does not have yet were put through the spec's own locked path for one render each. The robot's
   card still prints the renderer's `Dust none` and `Life about 5,000 hours` (2.7, known).
   Nearest existing: `docs/report-t27/06-the-cnc-folder-at-90000-and-144000.png`,
   `docs/report-t28/06-the-planer-folder.png`, `docs/report-t28/07-the-sanding-tab.png`,
   `docs/mockups/t28/timber-catalogue.png`.

3. `production-line-tab.html` (and `production-line-tab.png`): 2.9.1, 2.9.2, 2.9.8 and 2.10, the
   catalogue and the On order list, Wed 3 March 2025, for a company in the 800 m² unit with Turn
   28's timber kit off the line's cells. Timber machines as today beside the twelfth tab,
   `Production line`, after `CNC centre`, with its five folders `Line module 1` to `Line module 5`
   from £1,500,000, £750,000, £750,000, £1,000,000 and £1,000,000. Module 1's card in the 200 m²
   unit, locked `Needs the 800 m² unit`; in the 800 m² unit with no five axis CNC, locked `Needs
   Five axis CNC first` (the `requires` words of today, the catalogue name as it is); and for the
   company that can buy it, with Buy, beside module 2 locked `Needs Window line, module 1 first`.
   Module 5 with Buy once module 4 is on order (an order meets a `requires`), its first line `Takes
   the finished frames off the line`. Module 1 refused while kit stands on its cells: `Move the four
   sided planer and the sheet rack off the line's 6 m by 3 m`, and while kit is half shifted: `The
   kit is half shifted. Finish the move first`. The On order list today beside it after, the
   modules and the five axis CNC reading `Built to order: it cannot be called off` where a planer
   keeps `Cancel order`. Every module card prints the price, the wait, £60 a day of power, the
   insurance (£60,000 a year for module 1 in the 800 m² unit, the 5,000 a month of 2.10) and the
   floor, and no Output, Dust, Life or `Keeps up to N men busy` line. Written by hand: each
   module's lines (`Does the Cross cutting and the Planing of windows and doors`, and the same for
   the Moulding, the Sanding and the Pressing; `With the line this long timber work goes 1.4 times
   as fast, the Finishing excepted`, with 1.6, 1.8, 2.1 and 2.4; on module 1, `Needs a five axis
   CNC and a frame press beside it` [TUNE: the mock's words]); the three refusals `canBuy` does not
   have yet, through the spec's own locked path (the cells refusal checked word for word against
   the brief's sentence, from the engine's `standingOn`, `andList` and `metresBy`); `Built to
   order: it cannot be called off` in the `reason` span the list already uses for `At the gate,
   too late to call off`.
   Nearest existing: `docs/report-t28/05-the-timber-machines-tab.png`,
   `docs/report-t28/06-the-planer-folder.png`, `docs/mockups/t28/timber-catalogue.png`; for the On
   order list `docs/report-t15/06-shopping-board.jpg`; for a refusal on a card
   `docs/report-t23/11-the-catalogues-greyed-ninth-locker.png`.

4. `line-engineer.html` (and `line-engineer.png`): 2.8 and 2.9.4, a company in the 800 m² unit on
   Mon 5 October 2026 with six joiners, a labourer and an office admin. The laptop's Team page,
   Workshop tab (`renderTeam`): today the joiners' tiles and the labourer's; after, Kev on the
   books, his crew row `Kev, line engineer` reading `at the line` and `£15,000 a month`, and his
   hire tile after the labourer's with the duties `Keeps the production line running. One keeps up
   to three modules, two keep all five.`, `£15,000 a month` and `Available from reputation -50`
   (the labourer's tile prints the same floor). The tile in its three other states: refused `The
   company has no production line` (no module stands, none on order); Hire (module 1 on order);
   refused `Two engineers keep the whole line` (`On the books × 2`). The strip under the top bar
   (`renderWarningStrip`): today `nobodyAssigned`; after, `The line stands still: no engineer on
   duty` and `The line runs as three modules: one engineer on duty`, and with both at once the
   strip shows `nobodyAssigned`, the line directly above the new one. Our team: today the labourer
   at 94%, amber, `Near full. More work of this kind wants a second man.`; after, the `Line
   engineer` tile at 100% with `The line runs as 3 of its 5 modules.`, his row with the capsule
   portrait (no figure exists for him), `at the line` and `this week 100% so far`. Written by hand:
   his hire tile (the figures are the engine's own `hiringOptions` option), his crew rows, the two
   strip lines, his Our team sentence and `at the line`; his full week drawn in the worked green
   and not the near full amber [TUNE: the mock's reading].
   Nearest existing: `docs/report-t26/05-hire-cards.png`,
   `docs/report-t23/12-the-hire-card-with-no-locker-for-him.png`; for the strip
   `docs/mockups/t27/warning-strip.png`, `docs/report-t28/03-the-strip-line-in-july.png`; for Our
   team `docs/report-t23/13-our-team-as-tiles.png`.

5. `timber-stores.html` (and `timber-stores.png`): 2.11, companies in the 800 m² unit on Wed 3
   March 2025 with the day one kit and Turn 28's timber kit. (a) The Storage tab today beside it
   after, `Timber racks` and `Timber shelters` after the high capacity rack; the Timber rack's card
   (£1,200, 3 working days, 4 m by 1 m in a zone of 4 by 2) beside the high capacity rack's, and the
   Timber shelter's (£18,000, 15 working days, `Takes 3 m by 6 m, works in 3 m by 6 m`, as the
   van's card says of kit outside). (b) The Materials page (laptop): today a sash window's 19 boards
   sit in the sheet line (`Reserved 29`, `Total 49 of 50`); after, the sheet line counts sheets only
   (`Reserved 10`, `Total 30 of 50`) and one row more, `Timber boards`, held and room. (c) The
   lorry's card (event modal): today `19 sheets have arrived. Nothing can be made until they are
   inside.` and the no shelving card, each beside its card after: `19 boards have arrived. Nothing
   can be made until they are inside.`, `19 boards have arrived and there is no timber store to put
   them on. Buy one from the catalogue.`, and `19 boards have arrived and the timber stores have
   room for 16. They wait at the gate until a job uses its boards or another store is bought.`, the
   last two with the one choice `Leave it at the gate`. (d) The strip: today `Glass not ordered:
   Sash windows for Mrs Patel`; after, `Boards at the gate, no timber store: Sash windows for Mrs
   Patel` and `Boards at the gate, no room on the stores: Sash windows for Mrs Patel`; with both at
   once the strip shows `glassNotOrdered`, the line directly above. (e) The order board: a sash
   window, a commercial sash window of 113 boards and an agency big job with its crew line, today
   and after; after, the window's `Needs` line ends `, timber store`, `boards of material`, the
   commercial window's red line `113 boards, and the timber stores hold 40` in the crew line's
   classes with no Accept; and with no store a window locked `Needs timber store` and one greyed
   `no timber store`. Written by hand: the family lines and descriptions, `Holds 40 boards` and
   `Holds 400 boards`, the `Timber boards` row, the board counts, the three lorry card bodies, the
   two strip lines, the board's Needs ending, the red line and the two lock words. The job is named
   `Sash windows for Mrs Patel` after the brief's example; the game names a job after its template.
   Nearest existing: `docs/mockups/t28/timber-catalogue.png`;
   `docs/report-t24/07-the-materials-tab-with-the-storage-line.png`;
   `docs/mockups/t28/closure-cards.png` (the small folder; no picture of the lorry's card exists);
   `docs/report-t28/03-the-strip-line-in-july.png`;
   `docs/report-t28/09-timber-tiles-live-locked-and-greyed.png`, `docs/report-t26/10-big-job-red-and-green.png`.

6. `sash-window-contract.html` (and `sash-window-contract.png`): 2.12, a company in the 800 m² unit
   with Turn 28's timber kit and two joiners. (a) The Orders board's offer tile: today `Cut sheet
   packs for Northgate Interiors`, £87 a piece, 50 a week; after, `Sash windows for Northgate
   Interiors`, £249 a piece, 18 a week for 13 weeks, the line `190 minutes of work a piece on the
   timber machines. The client sends the timber and the glass: nothing comes off your racks.` and
   its hall line. (b) The Work Plan's offer card worked out for the experienced joiner: today the cut
   sheet pack with its `Material a piece, from stock` row; after, the sash window with no material
   row, `Machine wear a piece, the timber machines`, two a day and no machine tip; and the same offer
   in the 800 m² unit with no timber machine: `Machine wear a piece, by hand`, one a day. (c) A
   running contract's block with `The timber machines stay in the general queue: better ones make
   more pieces without a click.` in place of the saw's sentence. (d) A contract drawn for drawer
   boxes: today `Drawer boxs for Ashcombe Retail`, after `Drawer boxes for Ashcombe Retail`, in the
   400 m² unit, whose draw never sees the timber pieces. The reference figures from the engine's
   own sums: 179, 226 and 214 minutes a piece at the reference, two a day each, £218, £249 and £241
   (casement window, sash window, French door). The three pieces were pushed into `CONTRACT_PIECES`
   in memory with the seven `TIMBER_STAGES` ids, and the timber rules of 2.12.3 and 2.12.5 were
   given to a snapshot of v83's `contracts.ts` in memory only. Written by hand: the timber
   `pieceLine`, the queue sentence, the removed material row, the `On it` row and the plural.
   Nearest existing: `docs/report-t20/01-contracts-on-offer.png`,
   `docs/report-t25/10-a-contract-card-the-hall-can-keep-up-with.png`,
   `docs/report-t13/07-board-contracts.jpg`, `docs/mockups/t29/contracts-four.png`.
