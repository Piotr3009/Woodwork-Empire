# Mockups for Turn 28

Drawn by Claude Code on 05.10.2026, before the code that makes them true (CLAUDE.md T28 section
9). Each page is the game's own markup in the game's own classes, made by the game's own functions
(`renderEvent`, `renderEventFooter`, `renderTopbar`, `renderWarningStrip`, `renderBoard`,
`renderCatalogue`, `renderWorkPlan` and the job card's lines in `jobCard.ts`, every shell through
`syncModals`), from states the engine built, linked to `src/ui/styles.css`, with the change of
tonight written into it, and shot in headless Chromium. The page around each shell is the mockup's
own layout and no game style; a list modal is shown whole, its body unscrolled. No new CSS token or
class is used anywhere. No art was asked for before the code.

Where tonight's code does not exist yet, the five families, the three cutter sets and the five
timber templates were pushed into the engine's own tables in the generating process only, from
the figures of 2.4 to 2.6, so the catalogue's class cards, the board's tiles and the job card are
drawn by the renderers that will draw them; nothing under `src/` was edited. Every date is the
game calendar's (30 day months, day 1 Mon 1 March 2025), with the closures of 2.2 counted out.

The pictures of the five families are not in `public/sprites/` yet: the planer's cards point at
the art side's files where they are tonight, `../../art/incoming/t28/planer.<class>.png`. Once C1
has moved them the HTML page shows empty boxes there and the PNG keeps the picture as it was shot.

1. `closure-cards.html` (and `closure-cards.png`): 2.2, 2.2.1 and 2.2.2, the event modal's small
   folder of every one choice event. First the `Tax is coming` card of Fri 1 December 2025 as the
   engine raises it today (`raiseTaxWarning`, 48,000 in the account) beside the same card with its
   one new sentence before `Invest, or pay.`: `The workshop is closed from 22 December, so the
   last day to spend is Thu 21 December.` Then the `Christmas break` card queued after it, with
   one `Right`, in credit and under nought (the overdrawn sentence on the end). Then the first day
   back, Fri 6 January 2026: `Tax for 2025` as the engine books it on 30 December (`runTaxDay`)
   and after it `Back from the Christmas break`, `14 days closed. Rent, rates and the bills ran
   anyway: £3,480 out.`, one `Back to work`; beside them the `Weekend` card the game raised on a
   real Monday, for size. The £3,480 is the brief's example figure; the 14 days are counted (Fri
   22 December to Thu 5 January, Thu 21 open and Fri 6 open). Under them the top bar and the
   strip on Mon 11 December 2025: with cash to tax the strip is the tax's line, drawn by
   `renderWarningStrip` as today; with nothing to tax it is `Closed from 22 December: 9 working
   days left`, in the strip's own markup with the key `closureComing`; and on Mon 18 July 2026,
   with no tax in sight, `Closed from 1 August: 10 working days left`. Written by hand: the tax
   card's sentence, both break cards and the two closure lines.
   Nearest existing: `docs/mockups/t27/tax-cards.png`, `docs/report-t27/02-the-tax-is-coming-card.png`,
   `docs/report-t27/04-the-card-after-30-december.png`; for the strip
   `docs/report-t27/03-the-strip-line-in-december.png` and `docs/mockups/t27/warning-strip.png`.

2. `timber-tiles.html` (and `timber-tiles.png`): 2.6 and 2.10, the order board in its own folder,
   for three companies in the 800 m² hall with a spindle moulder and a booth, a handleless
   kitchen drawn beside the timber tiles as the board draws a sheet tile today. (a) The six
   machines and the sash cutters: the `Sash windows` tile live with its Accept, and `Casement
   windows` greyed `Cannot take this: no casement window cutter set`. (b) The same hall without
   the sash cutters: the same tile locked, `Needs sash window cutter set`, the lock line
   `lockReasonFor` writes, and no Accept, since a timber job is never by hand. (c) No cross cut
   saw and no planer: `Patio doors` greyed `Cannot take this: no cross cut saw, four sided
   planer`. A greyed tile carries `Open the catalogue`, the link every kit reason has; a live
   locked tile carries none, as today. Each deadline is the old rule's days and twelve working
   days on top. Written by hand: the lock and block reasons, by the rule of 2.6 (the solid wood
   branch passed over, the cutters counted among the kit, in `kitBlockFor`'s order), and the
   twelve days. The tile's `Needs` line names the six machines and the template's cutter set after
   them, and its sheets line counts the boards only, the material less the glass's 0.35 (changed
   after the review of the timber tasks, and the page written again to say so).
   Nearest existing: `docs/report-t26/10-big-job-red-and-green.png`, `docs/report-t15/02-order-board.jpg`.

3. `glass-job-card.html` (and `glass-job-card.png`): 2.9, the Work Plan in its board skin on Thu 28
   February 2027, every row's head the job card of `jobCard.ts`. Above, today: the oak dining
   table short of its boards with `Order for this job`, as the card draws a timber job now. Under
   it three timber jobs, the glass in its three states, in the classes the boards' line beside it
   wears: `Sash windows`, paperwork done and nothing ordered, `Glass not ordered` in red, and
   `Order glass, £1,960` (0.35 of its £5,600 of material) in the same `row-action` as `Order for
   this job, £3,610` (the boards, `sheetsForCost` of the other 0.65: 19); `Casement windows`,
   boards and glass ordered today, `Glass ordered, here on Thu 12 March`, ten working days on;
   `French doors` in production at its Sanding, `Glass is in` in green. Written by hand: the glass
   line and its button, and the stage word (the bar stands at the same share of the job on
   today's plan, whose word is swapped for 2.7's).
   Nearest existing: `docs/report-t25/09-the-work-plan-s-line.png`,
   `docs/report-t20/05-jobs-tab-without-the-contract-bar.png`.

4. `timber-catalogue.html` (and `timber-catalogue.png`): 2.4 and 2.5, the equipment catalogue in
   its folder. The Timber machines tab today (Thicknessers and Spindle moulders) beside it after
   tonight, the two it has and seven new folders: Cross cut saws, Four sided planers, Frame
   presses, Glue tables, Sash cutters, Casement cutters, Door cutters; the thicknesser's line loses
   the clause that promised it a stage. The Sanding tab today (`Nothing here yet.`) beside it with
   Sanders. The planer's folder open on its five classes, each in the one class card every family
   wears, with the brief's prices (6,000, 14,000, 28,000, 60,000, 120,000), places, extraction,
   life, power, delivery and floor, the brief's descriptions, and the art side's pictures as they
   came. Last, the sash cutter set's card: one class, £4,000, delivered in 5 working days, the
   empty picture box the catalogue shows for a missing file, and `Kept at the spindle moulders`
   where the hand tool set beside it, as today, says `Kept in a tool cabinet`. Written by hand:
   the family lines of the new folders are the mockup's words; `Kept at the spindle moulders`.
   Nearest existing: `docs/report-t27/06-the-cnc-folder-at-90000-and-144000.png`,
   `docs/report-t13/13-catalogue-thicknesser.jpg`, `docs/report-t15/04-catalogue.jpg`.

5. `work-plan-stops.html` (and `work-plan-stops.png`): 2.8 and 2.9 on the Work Plan. Above,
   today: a lacquered wardrobe at its Finishing with no booth in the hall, the row reading
   `Finishing, no spray booth`, the hall stop's reason as `hallStops` gives it and `stageText`
   writes it. Under it, Thu 28 February 2027: `Sash windows` has filled its Pressing and stands
   until the next working day opens, `Pressing, glue curing`, its two men left on it; its bar
   carries one working day for each night it has not yet stood (tonight, and the night after
   Finishing), two days on the outline. `Patio doors` has reached its Glazing with the glass
   ordered late, `Glazing, waiting for glass`, and its glass line says `Glass ordered, here on
   Thu 12 March`. Written by hand: the two reasons on `blockedBy`, the stage words of 2.7, the
   glass lines and the two days on the sash bar.
   Nearest existing: `docs/report-t25/09-the-work-plan-s-line.png`, `docs/report-t15/03-work-plan.jpg`.
