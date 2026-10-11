# Mockups for Turn 31

Drawn by Claude Code on 11.10.2026, before the code that makes them true (CLAUDE.md T31 section 9).
Piotr asked for this turn in one go and has not seen these: they are built only of what the game
already draws. Each page is the game's own markup in the game's own classes, made by the game's own
functions (`renderContracts` with `tabBar`; `renderTopbar` and `renderWarningStrip`;
`renderAccounting`; `renderLaptop` with `renderPremises`; `renderEvent` and `renderEventFooter`;
`hallScene` and `sceneHtml` of `src/render/hall.ts`; every shell through `syncModals`), from states
the engine built, linked to `src/ui/styles.css`, and shot in headless Chromium (playwright 1.56.1)
from a static server on 127.0.0.1 that served the pictures and the fonts, so the folder paper, the
hand font and the pictures load. The page around each shell is the mockup's own layout (the `mock-*`
rules of the earlier turns' pages; the four hall pages carry Turn 30's block with `.mock-hall` and
`.mock-cell`, copied unchanged) and no game style. Each new screen stands beside the same screen as
it is today, each under its own caption. No new CSS token or class is used anywhere, no page holds
an em or en dash, and nothing new was asked of the art side. The lane's yellow is drawn as
`var(--lane-yellow, #e3b51f)`: `--lane-yellow` is the one token 2.6 allows, and until it is in
`styles.css` the fallback draws it.

Every page was generated from a snapshot of commit fa04ffd (T31-A1: v91's game with APP_VERSION
v92), exported to a scratch folder, so the lead's work in progress was never read; "Today (v92)" on
a page is the game of that commit. Where tonight's code does not exist yet, the lines no renderer
writes yet were written by hand into the rendered markup, in the classes the neighbouring lines use,
or pushed into the engine's own tables in the generating process only; each entry says which. The
words and figures follow the brief and the lead's decisions file for the mockups, kept beside them
as `decisions.md`; readings the mockups had to take are marked [TUNE:
mock] or [TUNE: the mock's reading]. Nothing under `src/`, `tests/` or `public/` was edited by a
mockup, and nothing outside `docs/mockups/t31/` was written in the repo. Every date is the game
calendar's (30 day months, day 1 Monday 1 March 2025). The generators are in the session's
scratchpad, not in the repo, and no server or browser of a shoot was left running.

**The pictures the pages point at.** The four hall pages (4, 6, 7 and 9) draw the game's own
`/sprites/` URLs, which load only with `public/sprites` served at the root, as they were for the
shots. Page 9 reads L3's three pictures from `../../pictures-l3/`, where this ZIP put them; T31-C4
moves them into `public/sprites/`, after which those three references no longer load. Page 7 draws
the shelter on the apron (today) from `/sprites/timberShelter.standard.png` and the shelter behind
the wall (after) from `/sprites/timberShelter.standard.r.png`, the art side's 0 view today; once
T31-C1 swaps the two files, the HTML shows each side in the other view. The PNGs keep what was shot.

1. `line-running-block.html` (and `line-running-block.png`): 2.2 and 2.4, the Orders board in its
   folder on its Contracts tab, drawn by `renderContracts` with `tabBar('boardTab', ...)`, the shell
   through `syncModals` with the spec `app.ts` writes for the board (`Order board`, `full`,
   `mock-mid` width).
   - **The company the engine built.** The 800 m² unit, the day one kit and industrial air; the six
     modules standing from (2, 14), placed as `tests/engine/t30Contract.test.ts` places them; Kev
     and Lee, two line engineers on the books. The line's offer card came at the open of Thu 4 March
     2025 and was answered `Take it`. The engine then ran the contract to Mon 6 April 2025, 15:30:
     `This week: 3 windows. In all: 91`, `On the pallet` / `1 of 10`, `At the gate for collection` /
     `1 pallet`. The seeded sheet contract on offer and the enquiries of those days are left off the
     page, and the tab's first use bubble is marked seen. The panels stand two to a row, today on the
     left.
   - **Today (v92), running whole:** the Turn 30 block as the code draws it. Its figures line ends
     `the timber and the glass £600 a window`.
   - **After (a), offered:** the figures line ends `the timber and the glass £600 a window, ordered
     ahead`. Under the Turn 30 rows come `Timber on the stores` / `24 boards, for 12 windows, 40 more
     on the way`; `Glass at module 6` / `for 8 windows`; and the row of two buttons, `Order timber:
     40 boards, £8,000` (`data-do="orderLineTimber"`) and `Order glass: 20 windows, £4,000`
     (`data-do="orderLineGlass"`), both plain `.btn`.
   - **After (b), locked:** the rows `24 boards, for 12 windows` and `for 8 windows, 20 more on the
     way`; both buttons are `lockedButton`s with the reason in the title; under the row, `p.lock`
     `The timber stores hold fewer than 40 boards` and then `p.lock` `Module 6 holds glass for 40
     windows`.
   - **After (c), Not enough cash:** the rows `10 boards, for 5 windows` and `for 5 windows`. Both
     buttons are locked, and one `p.lock` reads `Not enough cash` (the same reason said once).
   - **Today (v92), standing still:** the same minute with Kev away (`absentDaysRemaining` 1). The
     engine's own row reads `Standing still` / `one engineer on duty`, in red (`bad`).
   - **After (d), standing still:** both engineers on duty. The row `Standing still` / `no timber` is
     red (`bad`) and stands where today's standing still row stands, after the gate row. Then come
     `Timber on the stores` / `0 boards, for 0 windows` and `Glass at module 6` / `for 14 windows`,
     and both buttons are offered.
   - **Written by hand,** into the engine's markup in the classes the neighbouring lines use: the `,
     ordered ahead` ending; the material rows, in the markup of the private `countRow`; the button
     row, in the shape of the ended block's button row (`div.row > span.row-main` empty, then
     `span.row-action` holding the two controls); the locked buttons and the `p.lock` reasons; and
     the `Standing still: no timber` row. Every other line is the engine's.
   - **[TUNE: mock] choices.** The zero form is `0 boards, for 0 windows` (the plain plural), not
     `none`. The glass's on the way part is drawn in (b) and not in (a): with any glass at module 6,
     20 more on the way locks the button (8 + 20 + 20 = 48, over 40), so in (b) it is the reason for
     the lock. Only `for 0 windows, 20 more on the way` would leave the glass offered.
   - **Two notes for the code.** `boardRoom` is what the standing stores hold, and a timber rack
     holds 40 and a shelter 400, so with any store standing `The timber stores hold fewer than 40
     boards` cannot be said; only `No timber store` can. Panel (b) draws it because the brief names
     it. And with the line's contract running and no job, the strip's last line reads `You spend more
     than you earn: £34,910 out, £0 in this week`: `weekRate` counts labour only, so the line's
     windows are not in it. This was seen and left alone; it is outside tonight's scope.
   - Shot at 2100 wide, full page (2100 by 2362). Generator (scratch, not in the repo):
     `scratchpad/mock-running/gen.ts`, with `build.ts`.

   Nearest existing: `docs/report-t30/08-the-contracts-tab-with-the-line-running.png`,
   `docs/report-t30/09-the-contracts-tab-standing-still.png`,
   `docs/mockups/t30/line-contract-running.png`; for a block with a row of buttons,
   `docs/report-t29/19-a-full-contract-on-the-orders-board.png` and
   `docs/mockups/t29/contracts-four.png`; for a locked control with its reason under it,
   `docs/report-t28/09-timber-tiles-live-locked-and-greyed.png`.

2. `strip.html` (and `strip.png`): 2.4 and 2.6, the top bar and the warning strip under it, one per
   row in `.mock-bar`, drawn by `renderTopbar(state, 'hall')` and `renderWarningStrip`. The states
   are the same engine built company as page 1, at Mon 6 April 2025, 15:30, with the enquiries
   cleared.
   - **(a) `lineNeedsMaterial`, directly under `lineNeedsEngineer`.** Today (v92), Kev away: the
     engine's `The line runs as three modules: one engineer on duty`. After, both engineers on duty:
     `The line stands: no timber for its next window`, `The line stands: no glass for its next
     window` and `The line stands: no timber or glass for its next window`. After, Kev away and no
     timber at the same minute: the strip shows the engine's `lineNeedsEngineer`, the line directly
     above.
   - **(b) `laneBlocked`, directly under `boardsAtTheGate`.** Today (v92): the sheet rack moved to
     (20, 18) and the workbench to (24, 18), on the lane's front strip. A sash window was taken, as
     `t29Stores.test.ts` takes one, and its 19 boards arrived with no timber store, so the engine says
     `Boards at the gate, no timber store: Sash windows`. Nothing is said of the kit. After, the kit
     on the lane and no boards: `Kit stands on the forklift's lane: the sheet rack and a workbench`.
     After, the boards at the gate as well: the strip shows the engine's `boardsAtTheGate`, the line
     directly above. After, a Turn 30 line standing from (2, 15) (the same company built with the
     line at y 15): `The line stands too near the front wall for its lane: move it back`.
   - **Written by hand:** the five new strip lines, each a `div.warning-strip` with
     `data-warning="lineNeedsMaterial"` or `data-warning="laneBlocked"`. In every state the v92
     engine's own first line was `spendingOverEarning` or one of the two lines above, so nothing else
     would stand above the new lines. The kit names are the brief's example, verbatim. The top bars
     and the engine's strip lines are the game's own.
   - Shot at 1340 wide, full page (1340 by 1614). Generator: the same as page 1.

   Nearest existing: `docs/report-t29/11-the-strip-with-no-engineer.png`,
   `docs/report-t29/17-the-strip-with-boards-at-the-gate.png`, `docs/mockups/t29/line-engineer.png`
   (its strip panels), `docs/mockups/t29/timber-stores.png` (its part (d)),
   `docs/mockups/t27/warning-strip.png`.

3. `production-line-tab.html` (and `production-line-tab.png`): 2.5, the Accounting page in its
   folder, drawn by the game's own `renderAccounting` with its shell through `syncModals`, as
   `app.ts` asks for it (`id 'accounting'`, `full`, `mock-mid` width, two panels side by side).
   - **The company the engine built and ran.** The 800 m² unit with the day one kit and air. The
     line stands whole from x 2, y 14 from Mon 5 October 2026, with two line engineers at £15,000 a
     month. Both covers are held, and security is at level 1 (the alarm). The offer was put off to
     Fri 9 October by setting `nextOfferDay`, so the contract was taken at the open of Fri 9 October:
     a window every 120 minutes, four a working day. One engineer was away all of Wed 19 November
     (`absentDaysRemaining` 1 set at that day's open), so the line stood that day. The engine then
     played to Thu 27 November 2026 at 17:00, with the `End of day` card open and the fourth window
     of the day made. The books were written up with the engine's `writeUpBooks`, so no banner is
     drawn. No tip bubble is drawn either: a company 600 days in has seen it.
   - **Today (v92):** the Summary tab as the engine draws it. The line's windows are in `Contract
     work` (£108,000 for the month) and its £600 a window is in `Material` (-£43,200). The month
     shows `Net £6,276`.
   - **After 2.5.** The tab bar is the game's own `tabBar('accountingTab', ...)` with a fifth chip,
     `Production line`, selected. Four `.col` in `.cols`, headed `Today`, `This week`, `This month`
     and `This year`, each with the rows `Windows made` (no class), `Turnover` (good), `Timber and
     glass`, `Engineers`, `Power` and `Property cover` (bad, minus), `Net profit` (`.row.is-total`,
     good or bad) and `Efficiency` (no class). Under the columns, in `p.figures`: `A working day on
     average this month: 4 windows, -£101 net`; `A year at this month's pace: -£25,600 net`; `Paid
     back: -£8,569 of £10,000,000, 0%`. Then a `p.hint`: `Lost this month: 8 h for want of an
     engineer`. Kept from today's page: the head line (cash, overdraft, deposit) and `Copy state as
     JSON`.
   - **The daily shares.** Engineers: 2 x £15,000 / 30 = £1,000 a calendar day. Power: 6 x £60 =
     £360 a calendar day. Property cover: £10,000,000 (`lineValue`) x 0.02
     (`PROPERTY_INSURANCE_RATE_YEARLY`) x 2 (`unitCostFactor`) / 360 = £1,111.11 a calendar day. A
     working day: 4 x £1,500 = £6,000 in, and 4 x £600 = £2,400 of timber and glass.
   - **The four columns.**
     - **Today** (1 day): 4 windows; £6,000; -£2,400; -£1,000; -£360; -£1,111; net £1,129
       (1,128.89); `4 of 4, 100%`.
     - **This week** (Mon 24 to Thu 27, 4 days): 16; £24,000; -£9,600; -£4,000; -£1,440; -£4,444;
       net £4,516; `16 of 16, 100%`.
     - **This month** (1 to 27 November: 27 calendar days, 19 working days, one lost): 72; £108,000;
       -£43,200; -£27,000; -£9,720; -£30,000; net -£1,920; `72 of 76, 95%`.
     - **This year** (the company's year 2 by `yearOfDay`, as the Summary reckons it; the line from 5
       October: 53 calendar days, 35 working days of the contract): 136; £204,000; -£81,600;
       -£53,000; -£19,080; -£58,889; net -£8,569; `136 of 140, 97%`.
   - **The lines under the columns.** Average working day: 72 / 19 = 3.8, printed as 4 windows;
     -£1,920 / 19 = -£101. Year at this month's pace: -£1,920 / 27 x 360 = -£25,600. Paid back: the
     net of every day since the line stood. Lost: 480 minutes on 19 November, which is 8 h.
   - **Checked against the engine.** Every working day of the contract made 4 windows and 19
     November made none. November's `Windows off the line: windows` ledger lines come to £108,000,
     equal to the month's turnover, and `contract.windowsMade` is 136.
   - **Written by hand:** the whole of the tab's body (columns, rows, the three `p.figures` and the
     `p.hint`) in the Summary tab's classes, and the fifth chip's id `line`. No class or token is
     new.
   - **[TUNE: the mock's reading].** `Today` carries a whole calendar day's share from its open. The
     average number of windows is rounded to a whole window. A net that is behind is printed as
     signed money, with the share floored at 0%: `Paid back: -£8,569 ..., 0%`; the brief has no
     words for a line that is behind. Only one cause is lost this month, so the hint shows no join of
     two causes.
   - **For the lead and Piotr: the cover takes most of the line's margin.** With the cover held in
     the 800 m² unit, the cover on the line alone is £400,000 a year, more than its engineers cost.
     At 120 minutes a window an average full month nets only about £3,000: 21.4 working days x
     £3,600 is £77,143, less 30 x £2,471.11, which is £74,133. One lost engineer day turns November
     negative. This is Turn 30 section 8's parked point, and the figures here are the real ones.
   - **Two reckonings that differ.** The Summary's month (+£6,276) and this tab's month (-£1,920) are
     counted differently: the ledger books the whole company's premium (£33,510) on the 1st and the
     wages on payday (Fri 28), while the tab accrues each cost by the calendar day.
   - Shot at 2100 wide (2100 by 1356). Generator (scratch, not in the repo):
     `scratchpad/mock-books/gen-books.ts`, with `company.ts`, `page.ts` and `dom.ts`.

   Nearest existing: `docs/report-t13/17-accounting-summary.jpg`, `docs/report-t15/07-accounting.jpg`,
   `docs/report-t23/15-accountings-monthly-reports.png`, `docs/report-t13/20-accounting-finance.jpg`;
   for the line's figures, `docs/mockups/t30/line-contract-running.png` and
   `docs/report-t30/08-the-contracts-tab-with-the-line-running.png`.

4. `hall-lane.html` (and `hall-lane.png`): 2.6, the forklift's lane in the 800 m² hall. Each picture
   is the game's own hall scene (`hallScene` and `sceneHtml` in `src/render/hall.ts`).
   - **The company.** The 800 m² unit on Wed 3 March 2025 at 10:00, with the day one kit, Turn 28's
     timber machines at the standard class (cross cut, planer, spindle moulder, sander, frame press,
     spray booth) and the five axis CNC at (20, 9), all placed as `bigUnit` of
     `tests/engine/t29Line.test.ts` places them, but without its timber shelter. The line stands
     whole at `WINDOW_LINE_ORIGIN` (2, 14), x 2 to 37, y 14 to 16, and one pallet of windows is at the
     gate (`palletsAtGate` 1, drawn as Turn 30's box at `LINE_PALLET_LAYOUT`). The generator checks
     every piece of kit's `boxOf` against the lane's cells, and none stands on the lane.
   - **The frames.** Each is the game's view, 760 by 548, today on the left and after on the right,
     in five rows: the fit; `hallStartCamera`; the left strip up to the gate at zoom 2.5; the line's
     end at zoom 2.5; and the corner at the front wall at zoom 4, the wheel's limit.
   - **Today (v92).** The line and the pallet at the gate, and no lane.
   - **After 2.6.** The lane is drawn as two yellow lines along its outer edges: the inner edge runs
     (2, 10) to (2, 18) to (38, 18); the outer edge runs (0, 10) to (0, 20) to (38, 20); the two are
     joined at both ends, at (0, 10) to (2, 10) and at (38, 18) to (38, 20). So it covers the front
     strip, x 0 to 38 at y 18 and 19, and the left strip, x 0 and 1 from y 10 to 19. The line's
     pallet at the gate stands on the left strip's first row, y 10. Y 17, the metre in front of the
     line where its men stand, lies between the line and the lane.
   - **Written by hand:** only the lane, a `<g data-lane="1">` of four polylines put in as the first
     child of the scene's `data-live` group, so it lies under every piece of kit and every figure, as
     2.6 asks. The stroke is 2 in the scene's own units, about 1 px at the fit in a 760 frame and 8
     px at zoom 4, in `var(--lane-yellow, #e3b51f)`. The lines lie exactly on the cell edges; the
     outer edge at y 20 is the floor's front edge, so half of its stroke lies over the kerb [TUNE:
     mock].
   - **Known.** Line engineers are never drawn on the hall (`NEVER_ON_THE_HALL`), so no man stands at
     y 17 in these pictures.
   - Generator (scratch, not in the repo): `scratchpad/mock-hall/gen.ts`, run on a snapshot of
     fa04ffd (`scratchpad/mock-hall/snap`). Shot at 1600 wide, scale 1.

   Nearest existing: `docs/report-t30/10-the-800-m2-hall-with-the-line-whole.png`,
   `docs/report-t30/14-a-pallet-at-the-gate-with-its-label.png`, `docs/mockups/t30/hall-line-whole.png`,
   `docs/report-t29/07-the-800-m2-hall-with-the-whole-line.png`.

5. `premises-long-extension.html` (and `premises-long-extension.png`): 2.7, the laptop's Premises
   page, drawn by the game's own `renderLaptop` (page `premises`, so `renderPremises`) with its shell
   through `syncModals` (`id 'laptop'`, the screen skin, `mock-mid`). Four panels in two pairs, every
   company built by the engine.
   - **The 800 m² company.** Both extensions bought through `EXTEND_UNIT` and opened the next
     mornings, the day one kit, both covers held, and the flat level `Bars and dogs` bought through
     `setSecurityLevel`. Its canteen is not enlarged: the engine refuses `ENLARGE_CANTEEN` because
     the day one table saw stands beside it, so its card reads `Move the table saw off the 2 × 4 m
     beside it`, as the engine has it.
   - **(a) Today (v92), Wed 3 March 2025:** both cards read `Extended` with `Done`. The first reads
     `The first extension, to the right of the hall.` and the second `800 m², room for 32 joiners
     and 24 benches.`
   - **(b) After, offered:** a third card under the second, `Extend the hall: 200 m² more`. Price
     line: `£600,000 · and £2,400 more deposit. Needs £602,400 in the account.` Text: `Adds 200 m²
     along the rear wall: 50 m by 20 m, ready the next morning. Room for 40 joiners and 30 benches,
     and 40 lockers in the enlarged canteen. Rent £9,600 → £12,000 a month, rates £1,800 → £2,250,
     standing power £16 → £20 a day. Insurance £117 → £146 a month. Security £300 → £375 a month.`
     Control: an enabled `Extend` (cash £897,500).
   - **(c) Today, for comparison:** a 400 m² company on Tue 2 March 2025, the second extension's card
     offered as the engine draws it: `£1,000,000 · and £4,800 more deposit...`, `40 × 20 m`, `32
     lockers`, `Insurance £58 → £117`, `Security £150 → £300`.
   - **(d) After, being built:** the third card reads `Being built · paid for. It opens the next
     working morning.`, with `1000 m², 50 × 20 m, room for 40 joiners and 30 benches.` and the `Paid`
     badge.
   - **The sums for a 1,000 m² unit, 50 by 20 m** (the factor is 1,000 / 800 = 1.25). Rent 9,600 x
     1.25 = £12,000; rates 1,800 x 1.25 = £2,250; benches 24 x 1.25 = 30. Standing power: 4 x 1,000 /
     200 = £20. Joiners: 1,000 / 25 = 40. Lockers: 32 (an enlarged canteen in the 800 m² unit) + 8 =
     40. Deposit: £12,000 less the £9,600 held = £2,400. `unitCostFactor` 1,000 / 400 = 2.5.
     Insurance: the property cover on £5,050 insured is 5,050 x 0.02 x 2.5 = £252.50 a year, plus
     liability (£600 base, no one on the books) x 2.5 = £1,500 a year, which is £146.04 a month
     (£116.83 at 2). Security: £150 x 2.5 = £375 (£300 at 2).
   - **Written by hand:** the third card, in the markup of `premises.ts`'s private `card`, put before
     `<h3>Canteen</h3>`. [TUNE: the mock's reading]: the card's id is
     `data-premises="extendLong"`; its button is `button('extendUnit', 'Extend', 'data-stage="long"')`;
     its title stays the same whether offered or being built; and the figures at factor 2.5 and the
     40 lockers are worked by hand from the engine's own figures, because `unitCostFactor` and
     `canteenLockers` do not yet scale past 800 m².
   - **Two things the decisions file's words and the shared code do differently.** The decisions
     file's words `50 m by 20 m` are drawn as given, but the other two cards write the sides through
     `bySides` (`40 × 20 m`); the code might use `bySides` so that all three cards look alike. And the
     being built text keeps the code's raw `areaM2`, so it reads `1000 m²`, with no comma.
   - Shot at 2100 wide (2100 by 1862). Generator (scratch, not in the repo):
     `scratchpad/mock-books/gen-premises.ts`, with `premisesHelpers.ts`.

   Nearest existing: `docs/report-t27/05-the-premises-page-at-250000.png` (the only Premises page in
   the tree, the first extension offered); for the screen skin,
   `docs/report-t13/31-laptop-security.jpg`.

6. `hall-longer.html` (and `hall-longer.png`): 2.7, the hall ten metres longer, in A2 only as an
   outline. The company of page 4 plus the van, standing on the apron where `outsidePlaceFor` puts
   it (x 40, y 7). Two rows: the fit, then zoom 2 centred on (43, 10).
   - **Today (v92).** The 800 m² hall, 40 m by 20 m, in its own view box `-540 -144 1560 924`.
   - **After 2.7.** The first long extension, drawn as a dashed outline: the floor x 40 to 50, y 0 to
     20; the rear wall's face along it, up to 3.5 m; the wall's top, 0.9 m deep (`REAR_WALL`); and the
     words `200 m² more: the hall 50 m by 20 m`. The view box grows by ten metres along x, which is
     240 by 120 of the scene, the brief's 480 by 240 px at 2x, so the fit takes in the longer hall
     and the camera is clamped to it.
   - **Written by hand:** the wider view box; the outline, a `<g data-longer="1">` at the end of the
     live drawing, stroked `var(--accent)`, 2 wide, dashed `8 5`; and the words, as a plain `<text>`
     filled `var(--accent)` at 16 (the game's `label()` is dark ink, and it did not show on the dark
     ground past the kerb). No class or token is new.
   - **Not shown.** The apron, the van and everything at or past the old kerb move out with the
     extension (`moveTheApron`), but the van still stands inside the outline here. Past the 800 m²
     picture the frame shows the page, which is where the pieces of `scripts/hall-long.py` will lie in
     C3. The 60 m and 100 m pictures come with C3 into the report.
   - Generator: the same as page 4.

   Nearest existing: `docs/report-t28/12-the-800-m2-hall-with-the-timber-machines.png`,
   `docs/report-t30/10-the-800-m2-hall-with-the-line-whole.png`, `docs/mockups/t30/hall-line-whole.png`.
   Page 5 is the card that buys it: `docs/mockups/t31/premises-long-extension.png`.

7. `shelter-behind-wall.html` (and `shelter-behind-wall.png`): 2.8, the timber shelter behind the
   rear wall. The company of page 4 with this plant and van, each at the place the game gives it: a
   central dust system behind the rear wall at (34, -3), then a pelletiser at (30, -4), each placed
   by `rearYardPlaceFor` in turn; and the van on the apron at (40, 7). Three rows:
   `hallStartCamera`; zoom 2 on the far end of the hall; and zoom 4 on each shelter.
   - **Today (v92).** The shelter stands where `outsidePlaceFor` puts it on the apron, (40, 1), 3 by
     6, beside the van. It is drawn from `timberShelter.standard.png` (the art side's 90 view), with
     its plate `0` at 0.55 of its height.
   - **After 2.8.** Pushed into the engine's tables in the generating process only: the spec and its
     class are 6 wide, 3 deep, zone 6 by 3; `STARTING_LAYOUT.timberShelter` gets `rear: true`; the
     effect reads `Holds ten times a rack's boards outside behind the hall, and takes no floor of the
     hall.` With those, `rearYardPlaceFor` gives (23, -4), the next place along the wall after the
     plant, and the game itself draws it there with `data-behind-wall` and the rear wall's clip, as
     it draws the plant. The apron holds the van alone.
   - **Written by hand:** the picture's href is today's `timberShelter.standard.r.png`, the art
     side's 0 view, because the two files change places in C1. The plate is moved off 0.55 of its
     height and hung over the wall's top, centred above the middle of the shelter's 6 m, in the
     game's plate (`rect.rack-count-plate`, `text.rack-count`, `rackCount`'s figures, `CLASS_BADGE`
     colour). Its bottom edge sits a pixel clear of the wall's top line at its left corner: the line
     falls half a pixel for each pixel to the right, so a plate centred just over the line had its
     left corner cut off by the clip. The plate reads `0 / 400`, as the decisions file's section 6
     says [TUNE: mock]; today's `rackCount` letters the count alone (`0`), so `0 / 400` changes the
     plate's words, not only its place. Drawing it that way is the lead's call.
   - **Found, for the lead: the shelter is not hidden.** Drawn through the game's own clip, the 3 m
     shelter, standing 1 m to 4 m behind the 3.5 m wall, shows its roof and its far end over the
     wall; only its racks and boards are hidden. The scene lifts what stands further back: the
     roof's front edge (y -1, z 3) comes out about 10 px under the wall's top line, but its back edge
     (y -4, z 3) about 62 px over it. The brief's sentence "the shelter is 3 m high and is hidden
     behind the wall" does not hold on the picture: it reads as a grey corrugated roof behind the
     wall, as the plant does in `docs/report-t28/01-the-pelletiser-behind-the-wall.png`.
   - Generator: the same as page 4.

   Nearest existing: `docs/report-t29/13-a-timber-rack-and-the-shelter.png`,
   `docs/report-t28/01-the-pelletiser-behind-the-wall.png`, `docs/mockups/t30/hall-line-whole.png`
   (the shelter on the apron at its right edge),
   `docs/report-t30/10-the-800-m2-hall-with-the-line-whole.png`.

8. `contract-lost.html` (and `contract-lost.png`): 2.9, contracts that can be lost. Two kinds of
   screen. The first is a standing contract's closing card: the event modal's small folder, its
   shell through `syncModals` with the spec `app.ts` writes for an event, its body from
   `renderEvent` and its choices from `renderEventFooter`; it has one choice, `Right`, so it has the
   cross. The second is its ended block on the Orders board's Contracts tab: `renderContracts` in the
   board's shell through `syncModals` with `tabBar`, at `mock-mid` width. Today (v92) stands on the
   left of each pair and after on the right. Shot at 2100 wide.
   - **The company the engine played.** Seed 39, `veryEasy`, in the 200 m² unit, with the day one
     kit, air and extraction, a rack of 50 sheets, a name of 30, and three experienced joiners: Sam,
     Tom and Dan. The engine itself offered `Cut sheet packs for Northgate Interiors` at the open of
     Tue 2 March 2025: 40 a week for 13 weeks at £95 a piece. The contract was taken through
     `ACCEPT_CONTRACT`, the three were put on it through `ASSIGN_CONTRACT`, and the term was played
     day by day with the tests' `nextDay`. By hand, each morning the rack was topped up to 50 and the
     day's enquiries were cleared; any second offer was taken off the board too, and the page leaves
     off every seeded offer of those days. Every week, piece, pound, date, `Right`, the cross, the
     report rows and the comparison line are the engine's own.
   - **Today (v92), the card.** The term ends at the open of Tue 3 June 2025, 08:00, with 13 full
     weeks and 1 short. Title `Cut sheet packs for Northgate Interiors: the term is over`. Body: `Cut
     sheet packs for Northgate Interiors: the term is over. 564 pieces made, £53,580 of revenue,
     £16,920 of material, 1040 hours of labour at cost £34,974, £390 of machine wear, net margin
     £1,296. 13 full weeks and 1 short. The client offers £105 a piece for another term. Renew or let
     it go on the Contracts tab.`
   - **Today (v92), the block.** The same head, then the rows `Pieces made` 564, `Revenue` +£53,580,
     `Material` -£16,920, `Labour, 1040 hours at cost` -£34,974, `Machine wear over those hours`
     -£390 and `Net margin` +£1,296. Then `13 full weeks, 1 short. The client offers £105 a piece for
     another term of 13 weeks, +£10 on £95.` and the buttons `Renew at £105` (primary) and `Let it
     go`.
   - **After (a), the lost contract's card.** The same contract is lost at the close of its fourth
     week, Mon 29 March 2025, 08:00. All four weeks were full (53 of 32, 60, 42, 41 of 40). It was
     ended as `endedByClient` ends one: `endDay` set to today, `weekStartDay` set to null, then the
     engine's `endContract` with `endedBy` `'lost'`. That frees Sam, Tom and Dan, and
     `renegotiatedPrice` is set to null. Title: `Cut sheet packs for Northgate Interiors: the client
     went elsewhere`. Body: `Cut sheet packs for Northgate Interiors: the client went elsewhere. 196
     pieces made, £18,620 of revenue, £5,880 of material, 304 hours of labour at cost £10,223, £114
     of machine wear, net margin £2,403. 4 full weeks and 0 short. The client has found another
     supplier: there is no other term.` One `Right` and the cross, as today's card has.
   - **After (b), the lost contract's ended block.** Head `Cut sheet packs for Northgate Interiors:
     the client went elsewhere`, with the six report rows as today. The weeks line reads `4 full
     weeks, 0 short.` with no offer, and the button row holds one button, `Let it go`: today's plain
     `button('renewContract', 'Let it go', data-accept="0")`, unchanged.
   - **After (c), the renewal with the cut.** The same term's end, Tue 3 June 2025. The client offers
     9% under the £95 a piece it had, rounded to the pound: £86, in place of
     `renegotiatedPriceFor`'s £105. The card's last sentence: `The client offers £86 a piece for
     another term, 9% less than now: the market has turned.` The block is the engine's own
     `endedBlock` with £86 on the contract: `13 full weeks, 1 short. The client offers £86 a piece
     for another term of 13 weeks, -£9 on £95.`, `Renew at £86` and `Let it go`.
   - **Written by hand.**
     - **The lost card:** its title, and in its body the words after the name (`the client went
       elsewhere` in place of the snapshot's fallback `the term is over`). The tail `The client
       offers £99 a piece for another term. Renew or let it go on the Contracts tab.` is replaced by
       `The client has found another supplier: there is no other term.`, and `data.offered` is set
       to null. The snapshot's `endedLine` does not know `'lost'` yet.
     - **The lost block:** the h3's `the term is over` is replaced by `the client went elsewhere`,
       the offer sentence is cut from the weeks line, and `Renew at £95` is removed. With the price
       null, today's renderer would draw the old price there.
     - **The cut card:** the tail `The client offers £105 a piece for another term. Renew or let it
       go on the Contracts tab.` is replaced by the cut sentence, and `data.offered` is set to £86.
     - **The cut itself:** `contract.renegotiatedPrice = 86` was set on the state. The 9% is the
       mock's own draw [TUNE: mock], inside the brief's 5 to 15.
   - **Readings taken [TUNE: mock], for the lead.** The cards' last sentences: following the brief
     and the decisions file, the new sentence is drawn as the card's last sentence in both cards, so
     today's `Renew or let it go on the Contracts tab.` is not drawn after it. On the lost card it
     would be wrong anyway, because there is no Renew; on the cut card, keeping it after the new
     sentence is the other reading, and the smaller change to `closingBody`. The lone button: `Let it
     go` stays the plain button when it is the only one. The day of the loss: drawn at the close of
     week 4, so the card says the client left after four full weeks.
   - **Known, and the game's own.** The clip: on the lost card the hand title `Cut sheet packs for
     Northgate Interiors: the client went elsewhere` reaches the folder's binder clip, which covers
     the last letter of `elsewhere`; today's `...: the client has ended it after 2 short weeks` is
     longer still, so this is not new tonight. The greyed head: the ended block's head is drawn
     greyed by the folder's `.contract-ended` rule, as it is today.
   - **Also for the lead.** The Work Plan's Contracts tab has its own ended card (`endedCard` in
     `src/ui/contracts.ts`). It prints `endedLine` with `N full and M short` and has no offer and no
     buttons, so a lost contract needs only the new words there. It is not drawn on this page.
   - Generator (scratch, not in the repo): `scratchpad/mock-lost/gen.ts` with `build.ts`, run with
     vite-node on a `git archive` snapshot of fa04ffd in `scratchpad/mock-lost/snap/`, and shot with
     `scratchpad/mock-lost/shoot.cjs` through `scratchpad/mock-lost/serve.py`. The generator stops if
     any replaced text is not found or if the page holds a dash. Its full log is
     `scratchpad/mock-lost/report.txt`.

   Nearest existing: for the ended block, `docs/report-t20/03-contracts-ended.png` (the Work Plan's
   ended card), `docs/mockups/t20/contracts-tab.html` and `docs/report-t13/07-board-contracts.jpg`;
   for the closing card in the small folder with one choice and its cross,
   `docs/report-t29/22-the-card-of-the-trimmed-save.png`, `docs/mockups/t29/contracts-four.png`,
   `docs/mockups/t30/lifted-save-card.png` and
   `docs/report-t28/02-the-christmas-break-card-in-december.png`.

9. `forklift.html` (and `forklift.png`): 2.6 and 2.10, the line's forklift and its pallet on the
   forklift's lane. Every picture is the game's own hall scene (`hallScene` and `sceneHtml` in
   `src/render/hall.ts`).
   - **The company.** The 800 m² unit on Thu 4 March 2025 at 10:30, with the day one kit and the six
     modules end to end at x 2 to 37, y 14 to 16 (`WINDOW_LINE_ORIGIN` 2, 14). Two line engineers are
     on the books, Kev and Lee, and are not drawn, because line engineers are never drawn on the
     hall. The line's contract was taken at that morning's open and is running.
   - **The frames.** Each has the shape of the game's view (760 by 548, letterboxed as the game
     letterboxes it), today on the left and after on the right, in four rows: the whole hall at the
     zoom the game opens at (`hallStartCamera`); the gate at zoom 3; the line's end at zoom 3; and the
     front strip from half way along to the line's end at zoom 2, so that the forklift and module 6's
     pallet fit in one frame. The closer cameras are the game's own `zoomTo`.
   - **Today (v92; the page's own captions call it v91, since fa04ffd moved only APP_VERSION).**
     There is no lane. Module 6 has seven windows on its pallet. Two pallets wait at the gate, drawn
     as Turn 30's two boxes in the kit stock colours at x 0 and 1, y 10, with the label `Windows for
     collection: 2 pallets`. As the game draws it today, the second box (depth 11) is drawn after
     the label (depth 10.3) and hides the middle of it.
   - **After, the whole hall.** The moment of (a): the lane is drawn in yellow from the line's end to
     the gate, the forklift waits at the line's end, and two pallets stand at the gate.
   - **After (a).** The forklift waits empty on the front strip in front of module 6's pallet,
     facing `nw`. It is drawn from frame 0 of row 2 of `vehicle.forklift.drive.sheet.png`, marked
     `data-forklift="waiting"`, with its anchor at (36, 19), on the strip's middle line.
   - **After (b).** The forklift drives loaded, half way along the front strip, drawn from frame 0 of
     row 2 (`nw`) of `vehicle.forklift.driveLoaded.sheet.png`, with its anchor at (19, 19). Module
     6's pallet is empty (`onPallet` 0). In the engine the pallet is already at the gate
     (`palletsAtGate` 1); the newest pallet at the gate is not drawn while it is on the forks, so
     nothing stands at the gate and no label is drawn [TUNE: the mock's reading].
   - **After (c).** Two pallets stand at the gate, drawn from `windowPallet.standard.png`: the first
     at `LINE_PALLET_LAYOUT` (x 0 to 1, y 10) and the second at x 2 to 3, y 10. Each keeps
     `data-line-pallet` and its title `Windows for collection`, and the label is `Windows for
     collection: 2 pallets`. The forklift goes back empty down the left strip, facing `sw`, drawn
     from frame 0 of row 0 of the empty sheet, with its anchor at (1, 16.75).
   - **Changed in the state for the picture.** The state was built by the engine. Only
     `windowLine.onPallet` and `windowLine.palletsAtGate` were set by hand: 7 and 2 for today and
     (a), 0 and 1 for (b), 3 and 2 for (c). The contracts and enquiries lists were cleared.
   - **Written by hand into the live part.**
     - **The lane:** one closed outline, `<g data-lane="1">` with a `<polygon>` through (0,10)
       (2,10) (2,18) (38,18) (38,20) (0,20), the inner edge and the outer edge joined at the two
       ends. The stroke is `var(--lane-yellow, #e3b51f)`, 2 px wide, with no fill. It is put at the
       head of the live part, before the name and the clock on the wall and before every drawable, so
       it lies under every piece of kit and every man.
     - **The pallets:** Turn 30's boxes and their label were taken out of the live part. In their
       place each pallet is `<g data-line-pallet="N" data-foot="x,10,2,1"><title>Windows for
       collection</title>`, followed by `contactShadow(x, 10, 2, 1)` and then `spriteImage(picture,
       spriteBox(x, 10, 2, 1, 1.75))`, at `depthKey(x, 10)`. `spriteBox` gives 80 by 86 with the
       anchor at 52, 82, exactly the picture's 160 by 172 and anchor 104, 164, halved. The contact
       shadow is the one every picture on the floor has (`objectArt`) [TUNE].
     - **The label:** it keeps the game's own words and place (`centreOf` the first pallet's floor),
       but it is drawn at the last pallet's depth + 0.3, so the second pallet does not stand on it
       [TUNE: the mock's reading].
     - **The forklift:** drawn as a figure is drawn (`characterArt`). The group is `<g
       data-forklift="waiting|loaded|empty" data-facing data-frame="0" data-frames="6"
       data-fps="8" transform="translate(anchor on screen)">`; inside it, an `<svg>` at x -68, y -96,
       136 by 128, with `viewBox` = `cellBox(row, 0)`, over `<image href="sheet" x="0" y="0">`. Its
       depth is `depthKey` of its anchor's cell plus `FIGURE_DEPTH_OFFSET`, and it is placed by
       `figureSlot`, with its anchor as its feet, against the `data-depth` and `data-foot` each
       drawable carries. It has no title, because there is nothing new to read.
   - **[TUNE] readings.** The waiting place (36, 19): the art's reports give the forklift as 3.9 m
     long about its anchor (-1.95 to 1.95 along the way it drives) and 1.36 m wide, and module 6's
     pallet stands at about x 36.5 to 37.5, measured from stack10's bounds. An anchor at the pallet's
     x (37) would put the counterweight 0.95 m past the lane's end at 38; at 36 the forklift covers x
     34 to 38, all on the lane and in front of the pallet. "Half way along" in (b) is read as x 19 of
     the strip's 0 to 38. (c) is drawn 5 m down the strip from where the forklift sets the pallet
     down, so that the label reads.
   - **Found, for the lead.**
     - **The turn after setting down.** The load rides 0.5 to 1.95 m ahead of the anchor (centre
       1.225; `loadedAssemblyBoundsM` in
       `docs/art/pack-l3-1110/reports/load-contact-QA.json`). So the `ne` leg stops with its anchor at
       about (1, 11.7) for the pallet to be over `LINE_PALLET_LAYOUT`. A turn on the spot there to
       `sw` puts the empty forklift's body over y 9.8 to about 12, through the pallet just set down
       at y 10 to 11. This is E1's "the pallet's turn as it is set down".
     - **The forklift over the label.** The gate label lies over the left strip. The forklift is
       nearer the camera, so it is drawn over the label's first words while its anchor is between
       about y 11 and 16.5; a first draft at (1, 14) showed it.
     - **A depth check that passed.** A scratch check put the loaded forklift facing `ne` at (1,
       17.5) at zoom 4. There `figureSlot` reads the anchor alone against module 1 and draws the
       forklift after it, and no overlap with module 1's infeed showed. This check is not in the page.
     - **Where the lane's edges lie.** The outer edges lie on the foot of the left wall (x 0) and on
       the front edge of the floor slab (y 20). The inner edge at x 2 runs under module 1's infeed
       between y 14 and 17; it shows in (c).
   - **The pictures.** The page reads L3's three pictures from `../../pictures-l3/`; after T31-C4
     moves them into `public/sprites/`, those three references no longer load. The PNG was shot
     before that.
   - Generator (scratch, not in the repo): `scratchpad/mock-forklift/gen.ts`, run from the export in
     `scratchpad/mock-forklift/snap/`, and shot by `scratchpad/mock-forklift/shoot.cjs`.

   Nearest existing: `docs/report-t30/10-the-800-m2-hall-with-the-line-whole.png`,
   `docs/report-t30/13-module-6-with-seven-windows-on-its-pallet.png`,
   `docs/report-t30/14-a-pallet-at-the-gate-with-its-label.png`, `docs/mockups/t30/hall-line-whole.png`,
   and the art side's approved preview
   `docs/art/pack-l3-1110/approved-previews/L3-podglad-statyczny.png`.
