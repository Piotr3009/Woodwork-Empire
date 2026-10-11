# Mockups for Turn 31

Drawn by Claude Code on 11.10.2026, before the code that makes them true (CLAUDE.md T31 section 9).
Piotr asked for this turn in one go and has not seen these: they are built only of what the game
already draws. Each page is the game's own markup in the game's own classes, made by the game's own
functions (`renderContracts` with its blocks; `renderTopbar` and `renderWarningStrip`;
`renderAccounting`; `renderLaptop` with `renderPremises`; `renderEvent` and `renderEventFooter`;
`hallScene` and `sceneHtml` of `src/render/hall.ts`; every shell through `syncModals`), from states
the engine built, linked to `src/ui/styles.css`, and shot in headless Chromium with `public/` served
at the root so the folder paper, the hand font and the pictures load. The page around each shell is
the mockup's own layout (the `mock-*` block of Turn 28's to Turn 30's pages, copied unchanged) and
no game style. Each new screen stands beside the same screen as it is today (v91, which is v90's
code), each under its own caption. No new CSS class or token is used anywhere (the lane's yellow is
a literal colour in the mockup's own SVG, where the code will write `--lane-yellow`), no page holds
an em or en dash, and no picture of the art side was drawn, repainted, trimmed or scaled.

Where tonight's code does not exist yet, the lines no renderer writes were written by hand into the
rendered markup, in the classes the neighbouring lines use, and the few figures v91 cannot know
were put into the engine's state or tables in the generating process only; each entry says which.
Nothing under `src/`, `tests/` or `public/` was edited by a mockup. The generators ran with
`npx vite-node` from scratch folders outside the repo, the board and books pages from a snapshot of
the T31-A1 commit, and no server or browser of the shoot was left running. Every date is the game
calendar's (30 day months, day 1 Monday 1 March 2025).

Seen while drawing them, for the code (each is taken up in the task named):

- **The timber's refusal for want of room cannot show with today's stores** (B1). 2.2 ties
  `The timber stores hold fewer than 40 boards` to the stores' room (`boardRoom`), and a timber rack
  holds 40 and a shelter 400, so the room is nought (`No timber store`) or a batch and more. Page 1
  draws it for its words; the code keeps the brief's rule.
- **Page 1's panel (a) and panel (b)** carry the brief's example: glass for 8 windows with 20 more
  on the way and a batch more is 48, over the 40, so the glass is refused in (b) and offered in (a)
  with nothing on the way.
- **An ended block reads the machine wear off today's machine** and the closing card off the day it
  ended (page 8): a saw that broke the morning the term ended showed £0 wear on the block and £760 on
  the card. v91's own behaviour, outside this turn; drawn with the saw mended so the two agree, and
  noted in `docs/notes-t31.md`.
- **The lost card's title** fits one line of the event folder, and its end runs under the clip.
- **The shelter behind the wall** (page 7) shows the top of its roof over the wall at the hall's
  camera: what stands more than a metre behind the 3.5 m wall rises over its top on the screen, as
  the plant behind it does.

1. `line-running-block.html` (and `line-running-block.png`): 2.1 to 2.4, the Orders board in its
   folder on its Contracts tab, `tabBar('boardTab', ...)` and `renderContracts`, the shell through
   `syncModals` with app.ts's spec for the board.
   - **The state.** A veryEasy company played by the engine to the 800 m² unit, with the day one
     kit, industrial air and extraction, £1,200,000 and a reputation of 40; the line stood whole at
     (2, 14) with `placeEquipment`, as `tests/ui/t30Line.test.ts` stands it; two standard timber
     racks of 40 boards at (30, 2) and (30, 5); two line engineers, Kev and Nathan, hired through the
     engine's own `HIRE`; no office admin. The engine's card offered the line's contract at the open
     of Fri 5 March 2025, it was taken, and the engine ran it to Tue 16 March 2025, 16:10: the counter
     (`This week: 7 windows. In all: 31`), the pace, `On the pallet 1 of 10` and `At the gate for
     collection 1 pallet` are the engine's own.
   - **Today (v91):** the block as `lineContractBlock` draws it.
   - **After, the same minute**, each panel with its own material: (a) both buttons offered, the
     timber `24 boards, for 12 windows, 40 more on the way` and the glass `for 8 windows`; (b) both
     locked for room, the glass `for 8 windows, 20 more on the way`, the timber locked `The timber
     stores hold fewer than 40 boards` and the glass `Module 6 holds glass for 40 windows`; (b) the
     account at -£3,000 against the limit of -£10,000, the timber locked `Not enough cash` and the
     glass offered; (b) no store, `Standing still: no timber`, the timber locked `No timber store`;
     (c) the stores standing and empty, `Standing still: no timber`, both offered.
   - **Written by hand:** the figures line's `, ordered ahead`; the rows `Timber on the stores` and
     `Glass at module 6` in the block's own `countRow` markup, after the `Standing still` row where
     Turn 30 puts it; the row of the two buttons in the ended block's button row shape (`<div
     class="row"><span class="row-main"></span><span class="row-action">`), plain
     `button('orderLineTimber', ...)` and `button('orderLineGlass', ...)` or `lockedButton(text,
     reason)`; and under the row one `<p class="lock">` a locked button, in the buttons' order. The
     folder skin draws `.lock` in its own ink.
   - **Today's nearest screen:** `docs/mockups/t30/line-contract-running.png`,
     `docs/report-t30/08-the-contracts-tab-with-the-line-running.png` and
     `09-the-contracts-tab-standing-still.png`; a reason under a locked control as on
     `docs/mockups/t30/production-line-tab.png` (panel D's upgrade cards).

2. `strip-material-and-lane.html` (and `strip-material-and-lane.png`): 2.2, 2.4 and 2.6, the top
   bar and the strip under it, `renderTopbar` and `renderWarningStrip`, for the company of page 1.
   - **Today (v91), from the engine:** `The line stands still: no engineer on duty`
     (`lineNeedsEngineer`, both engineers away) and `Boards at the gate, no room on the stores: Sash
     windows for Mrs Patel` (`boardsAtTheGate`, a sash window job taken through the engine and a load
     of 100 of its boards at the gate, more than the racks' 80), each the first of `warnings(state)`.
   - **After, written by hand in the strip's own markup** (`<div class="warning-strip"
     data-warning="KEY">`): `The line stands: no timber for its next window`, `The line stands: no
     glass for its next window` and `The line stands: no timber or glass for its next window`
     (`lineNeedsMaterial`); `Boards at the gate, no room on the stores: the line's timber`
     (`boardsAtTheGate`); `Kit stands on the forklift's lane: the sheet rack and a workbench` and `The
     line stands too near the front wall for its lane: move it back` (`laneBlocked`).
   - **Today's nearest screen:** `docs/report-t29/11-the-strip-with-no-engineer.png` and
     `docs/report-t29/17-the-strip-with-boards-at-the-gate.png`.

3. `production-line-tab.html` (and `production-line-tab.png`): 2.5, the Accounting page in its
   folder, `renderAccounting`, the shell through `syncModals` with app.ts's spec for it.
   - **The state.** Two companies the engine built and played, each `tests/engine/t30Contract.test.ts`'s
     `bigUnit` and `withLine` with an office admin to keep the books: the line whole at (2, 14) from
     Wed 3 March 2025, two line engineers on £15,000 a month, the line's contract taken at the open of
     Thu 4 March, every minute played to 17:00 on Thu 30 April 2025 at 120 minutes a window: 76
     windows in March and 88 in April's 22 working days, the ledger's turnover equal to the
     contract's £246,000. The second company holds the property cover from 3 March, has an engineer
     away 08:00 to 15:00 on Tue 14 April and the line standing 08:00 to 10:00 on Tue 21 April (played
     as an engineer away, since v91 has no timber rule, its cause written as timber by hand): 84
     windows in April.
   - **Today (v91):** the Summary tab of each company.
   - **After:** its `Production line` tab, the fifth chip after `Finance` (the game's own `tabBar`
     given the fifth entry), four columns `Today`, `This week`, `This month` and `This year` with the
     rows `Windows made`, `Turnover`, `Timber and glass`, `Engineers`, `Power`, `Property cover`,
     `Net profit` and `Efficiency`; under them `A working day on average this month`, `A year at this
     month's pace` and `Paid back`, and for the second company `Lost this month: 6 h for want of an
     engineer, 2 h for want of timber`. The first company's month: 88 windows, £132,000, -£52,800,
     -£30,000, -£10,800, £0, net £38,400, `88 of 88, 100%`; the second's cover -£33,333 a month and
     `84 of 88, 95%`.
   - **Written by hand:** the fifth chip's entry and the whole tab body, in the Summary's own markup
     (`div.cols` of `div.col` with an `h3` each, `totalsBlock`'s rows, `row is-total` for the net,
     `p.figures` for the lines under the columns, as `earnedRateLine` is). The figures were reckoned
     from the played ledger and the constants as 2.5 reckons them.
   - **Today's nearest screen:** the Summary panels of this page, and
     `docs/report-t23/15-accountings-monthly-reports.png`.

4. `hall-line-lane.html` (and `hall-line-lane.png`): 2.6, the forklift's lane, the game's own scene (`hallScene` and
   `sceneHtml`) in four rows of today beside after: the whole hall at `hallStartCamera`, the front
   left corner at zoom 2.5, the lane's end at the gate with the pallet at zoom 4, and its other end at
   x 38 at zoom 2.5.
   - **The state.** The 800 m² unit on Wed 3 March 2025 at 08:00 (`bigUnit` of
     `tests/engine/t30Move.test.ts`), the day one kit, Turn 28's timber machines and the five axis CNC
     (each a cell or two along from where Turn 30's mockup stood it, which overlapped the compressor;
     each passes `canPlace`); the line, the dust system and the pelletiser behind the rear wall and a
     used van on the apron, all bought through `buyEquipment`, the engine standing the line at
     `lineSite`, module 1 at (2, 14); `windowLine.onPallet` 7 and `palletsAtGate` 1 set by hand.
   - **Today (v91):** the line whole, x 2 to 38, y 14 to 17, and the pallet of windows at x 0, y 10.
   - **After:** the lane for the line at (2, 14) in the hall 20 m deep: the front strip x 0 to 38, y
     18 to 20, and the left strip x 0 to 2, y 10 to 20; two yellow lines along its outer edges with
     both ends joined, at x 38 and at y 10, under every piece of kit, every label and every man.
   - **Drawn by hand:** one SVG polygon, the L's outline (`<g data-forklift-lane="1">`), put at the
     head of the scene's live part so every drawable is painted over it; the yellow the painted gate
     marks' own, (224, 184, 64), written as a literal where the code writes `var(--lane-yellow)`, 3 px
     at 1x. Each line is 0.1 m inside the lane's cells, except the outer front line, drawn at the foot
     of the painted front kerb (y 19.05): the 800 m² picture's kerb covers the last 0.92 m of the floor
     along y 20, so a line at y 19.9 would lie on the kerb's face [TUNE: mock].
   - **Today's nearest screen:** `docs/mockups/t30/hall-line-whole.png` and
     `docs/report-t29/07-the-800-m2-hall-with-the-whole-line.png`.

5. `premises-long-extension.html` (and `premises-long-extension.png`): 2.7, the laptop's Premises
   page in its screen, `renderLaptop` with the page `premises` (`renderPremises`), the shell through
   `syncModals` with the laptop's spec.
   - **The state.** A veryEasy company: the first extension bought Mon 1 March 2025 and open Tue 2
     March, the canteen enlarged, the day one kit, industrial air, both covers and the basic security
     firm; the second extension open Wed 3 March 2025 (800 m², 40 by 20 m).
   - **Today (v91):** the 800 m² unit's page, both extension cards `Extended` with `Done`; and the
     same company a day earlier with the second extension offered, the card the new one is shaped on.
   - **After:** one card more under the second extension's, `Extend the hall: 200 m² more`,
     `£600,000 · and £2,400 more deposit`, adding 10 m along the rear wall (50 by 20 m), room for 40
     joiners and 30 benches, 40 lockers in the enlarged canteen, the rent £9,600 to £12,000 a month,
     the rates £1,800 to £2,250, the standing power £16 to £20 a day, the insurance £117 to £146 a
     month and the security £1,051 to £1,313; the same card while the builders are in (`Being built`,
     the Paid badge); and the morning it opens, 1,000 m², with the second long extension offered at
     £720,000 (60 by 20 m, 48 joiners, 36 benches, 48 lockers).
   - **Written by hand:** the long card, in the markup of `premises.ts`'s own card (`div.card`,
     `card-main`, `h3`, `p.figures` with `strong`, `p.figures dim`, `card-action`) and its own
     `Extend` button and Paid badge; in the third panel the second card's title kept as `Extend the
     unit to 800 m²` and the canteen's `40 lockers`, which v91 cannot know. Every figure from the
     engine's functions with the unit 10 m longer (`unitWith`, `unitDepositFor`, `crewLimit`,
     `standingPowerPerDay`, `securitySubscriptionMonthly`, `monthlyPremiums` with the factor the area
     over 400) and the brief's price, 600,000 times 1.2 to the n.
   - **Today's nearest screen:** the two Today panels of this page, and
     `docs/report-t27/05-the-premises-page-at-250000.png`.

6. `hall-longer-outline.html` (and `hall-longer-outline.png`): 2.7, the 800 m² hall with the ten metres more of
   a 1,000 m² hall drawn on it as an outline (the real picture comes with C3, cut from the 800 m²
   picture by `scripts/hall-long.py`, and the report shows it).
   - **The state.** Page 4's company without the pallets.
   - **Today (v91):** the scene at the fit, 1560 by 924 at 1x, shown at 0.75.
   - **After:** the same scene with its view box made larger by what 2.7 gives one ten metre piece,
     240 by 120 px at 1x (`-540 -144 1800 1044`), at the same 0.75, the picture laid down unscaled;
     over it, in the mockup's own SVG, dashed lines in the game's `--accent`: the floor from (40, 0) to
     (50, 0) to (50, 20) to (40, 20), the rear wall carried on (its face to the hall, its top at 3.5 m)
     and its new end at x 50; thinner, in `--text-dim`, the apron moved out to x 50 to 53 and the
     van's place at (50, 7); three labels, `200 m² more: the hall 50 m by 20 m`, `The rear wall
     carried on to x 50` and `The apron and the van, moved out`. A row more shows the end of the hall
     at zoom 2, today and after.
   - **Today's nearest screen:** `docs/report-t28/12-the-800-m2-hall-with-the-timber-machines.png`,
     and the earlier growth on `docs/mockups/t26/hall-after.png`.

7. `shelter-behind-wall.html` (and `shelter-behind-wall.png`): 2.8, the timber shelter behind the rear wall, in
   three rows of today beside after: the whole hall at `hallStartCamera`, the end of the hall at zoom
   2, and the plate at zoom 4.
   - **The state.** Page 4's company without the pallets, with a timber shelter bought through
     `buyEquipment` and a sash window job taken through `acceptNow`, its 19 boards held by hand
     (`sheetsReserved` 19, the counter 19 more), so the plate reads 19.
   - **Today (v91):** the engine stands the shelter on the apron at (40, 1), 3 wide by 6 deep, drawn
     with `timberShelter.standard.png` (the art side's 90 view), its plate at 0.55 of its height, the
     van beside it at (40, 7).
   - **After:** the tables pushed in the generating process only (`STARTING_LAYOUT.timberShelter`
     given `rear: true`; the family and its class 6 by 3 with the zone its footprint; the effect and
     the description saying `outside behind the hall`); a fresh company bought it, `rearYardPlaceFor`
     gave x 23 to 29, y -4 to -1, a metre clear of the pelletiser, and the engine drew it with the
     wall's clip as it draws the plant. The apron holds the van alone.
   - **Written by hand:** the shelter's picture swapped to `timberShelter.standard.r.png`, the art
     side's 0 view, which C1's `git mv` names `.png` (so once C1 is in, the HTML's two pictures each
     show the other's file; the PNG keeps them as shot); the engine's own plate, unchanged, moved
     inside the shelter's clickable group from 0.55 of its height to the middle of its floor at the
     wall's top, 3.5 m, where it stands over the wall [TUNE: mock].
   - **Seen:** the shelter is not wholly hidden. Its 3 m roof runs back to y -4, and the camera lifts
     what stands further back: about 62 of the roof's 72 px at 1x and the top of its end face show over
     the wall, as the plant's do. Nothing in the hall is hidden by it, which is what Piotr asked for.
   - **Today's nearest screen:** `docs/mockups/t30/hall-line-whole.png` (the shelter on the apron).

8. `lost-contract-and-cut.html` (and `lost-contract-and-cut.png`): 2.9, each row the event card's
   small folder (`renderEvent` and `renderEventFooter` through `syncModals`; one choice, `Right`, so
   it has the cross) beside the Orders board on its Contracts tab (`renderContracts`, its
   `endedBlock`).
   - **The state.** A veryEasy company with the day one kit, a second bench, 60 sheets on the rack,
     two experienced joiners, Sam and Tom, and £200,000; a contract made with `drawContract` and set
     by hand to `Cut sheet packs for Northgate Interiors`, £106 a piece (the brief's example), 30 a
     week, 26 weeks, accepted Mon 1 March 2025 with both men on it, and played day by day with the
     rack topped back to 60 each morning.
   - **Today (v91):** the engine's own closing card and ended block at the open of Mon 3 September
     2025: 1,072 pieces, net £12,577, 25 full weeks and 1 short, the client offering £130, `+£24 on
     £106`, with `Renew at £130` and `Let it go`.
   - **After:** (a) the same contract lost at the close of week 7 (the open of Mon 20 April 2025),
     ended as `endedByClient` ends one with the new `'lost'`: the card's title `Cut sheet packs for
     Northgate Interiors: the client went elsewhere` and its last sentence `The client has found
     another supplier: there is no other term.`; (b) its ended block with the same title, the figure
     rows and `7 full weeks, 0 short.`, no client's offer, and one button, `Let it go`; (c) a renewal
     with the cut, the card's `The client offers £96 a piece for another term, 9% less than now: the
     market has turned.` with `Renew or let it go on the Contracts tab.` kept after it [TUNE], and the
     renderer's own block for an offer of £96, `-£10 on £106`.
   - **Written by hand:** the lost card's title and last sentence, the lost block's title and its
     one button row, and the cut card's offer sentence; the cut block is the renderer's own.
   - **Today's nearest screen:** the Today row of this page, `docs/report-t20/03-contracts-ended.png`
     and `docs/mockups/t29/contracts-four.png` (a card of one choice with its cross).
