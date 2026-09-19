# One game, one look

What the game already has, read out of the code as it stands on v29. CLAUDE.md T20 section 1 is
the rule this file serves: **before any agent builds or changes a screen it reads this and uses
what is here, never a new version of it.** Every value below was read out of the file named
beside it. Nothing here is invented, and nothing here is a proposal.

The two files this is written from are `src/ui/modal.ts` (the helpers) and `src/ui/styles.css`
(the tokens and the classes). Where a screen is named, its renderer is named with it.

---

## 1. The three skins

`ModalSkin` in `src/ui/modal.ts` is `'folder' | 'board' | 'screen'` and nothing else. The table
`MODAL_SKINS` there says which modal wears which, and a modal that is on none of them is a test
failure. As it stands:

| Modal id | Skin | Renderer |
|---|---|---|
| `board` (the order board) | folder | `src/ui/board.ts` |
| `accounting` | folder | `src/ui/accounting.ts` |
| `catalogue` | folder | `src/ui/catalogue.ts` |
| `event` | folder | `src/ui/eventModal.ts` |
| `daySummary` | folder | `src/ui/dayEnd.ts` |
| `settings` | folder | `src/ui/settings.ts` |
| `machineCard` | folder | `src/ui/machineCard.ts` |
| `workPlan` | board | `src/ui/workPlan.ts` |
| `shopping` | board | `src/ui/shopping.ts` |
| `company` | board, and the one felt modal | `src/ui/company.ts` |
| `laptop` | screen | `src/ui/laptop.ts` |

`FELT_MODALS` in the same file holds `company` alone: it adds `modal-felt` on top of the board
skin, which is the one skin that is a picture and not CSS.

**folder** (`.modal-folder`, styles.css 2029): the kraft folder picture
`/sprites/ui.folder.png` as the background, no border, no shadow, a fixed 3:2 box
(`height: min(92vh, 880px)`, `width: min(96vw, calc(min(92vh, 880px) * 1.5))`) with the body
scrolling inside the paper. Its own tokens, defined on the skin and not on `:root`:
`--paper: #f5efe2`, `--paper-2: #fbf8f1`, `--paper-line: #cdbf9f`, `--ink: #1d2a22`,
`--ink-2: #4d5a52`, `--green: #1f5a3a`, `--green-dark: #123822`.

**board** (`.modal-board`, styles.css 2254): steel,
`background: linear-gradient(#4a4f54, #3a3f44)`, `border: 1px solid #1b1e21`,
`box-shadow: inset 0 0 0 5px #24282c, 0 10px 30px rgba(0, 0, 0, 0.5)`, `color: #eceff1`. Its
tokens: `--card: #f5efe2`, `--card-2: #fbf8f1`, `--card-line: #cdbf9f`, `--card-ink: #1d2a22`,
`--card-ink-2: #4d5a52`, `--magnet-red: #c0392b`, `--magnet-blue: #2f6fb0`,
`--steel-line: #24282c`. A card, a plan row and a row PINNED TO THE BOARD (one that is the modal
body's own child) are paper on steel: that is what `--card` is for, and it is why `.assign-chip`
and `.assign-list` read `var(--card-2, var(--panel-2))` and fall back to the dark panel anywhere
else. A row inside one of those cards is a line of that card and not a second card: no paper of
its own, no magnet, ruled in `--card-line` (CLAUDE.md T20 1, T20-C5). The magnet also tilts what
it holds by a degree or so, on every board but the Work Plan, which is read for numbers and is
straight (PIOTR, 16.09), and `tests/ui/workPlanStraight.test.ts` is that rule.

**felt** (`.modal-board.modal-felt`, styles.css 2486): green felt in an oak frame, over the board
skin. Tokens: `--oak: #b9793a`, `--oak-2: #8a5424`, `--felt-green: #1f4a36`, `--felt-green-2: #173a2a`,
`--sheet: #f7f1e4`, `--sheet-ink: #2b2a26`, `--sheet-dim: #6f6a60`, `--sheet-line: #d9d2c2`,
`--sheet-green: #1f5a3a`, `--pin-blue: #1e4f9a`, `--pin-blue-2: #7fb3ff`. Its head is hidden and
the company name on the felt is the title instead (`.felt`, `.felt-head`, `.felt-name`,
`.felt-line`). A pinned sheet of paper on it is `.sheet` with `.pin`.

**screen** (`.modal-screen`, styles.css 3489): the laptop, and only the laptop. A bezel in CSS
with a cool screen inside it. Tokens: `--bezel: #1c1c1e`, `--screen: #e9eee9`,
`--screen-2: #dfe6df`, `--screen-ink: #222`, `--screen-line: #c5cec5`, `--screen-dim: #5a625a`,
`--screen-accent: #2b6cb0`, `--screen-green: #1f5a3a`, `--screen-tile-gap: 24px`,
`--tile-tasks: var(--good)`, `--tile-stock: #2c6a86`, `--tile-drawings: #6d4c2f`. The screen is
drawn by `.modal-screen::before` and the hinge by `.modal-screen::after`. Nothing of paper goes
across the bezel.

## 2. The shell of a modal

`renderModal` in `src/ui/modal.ts` builds `.modal` with three children and nothing else:
`.modal-head[data-drag="1"] > h2`, `.modal-body` and `.modal-foot`. `fillModal` is the only path
that touches it afterwards; the body is patched through `patchInto` (`src/ui/patch.ts`) so a
control the player has his finger on keeps its node, and the body keeps its scroll position.
`syncModals` brings the whole layer into line and is the one path for every modal in the game.

Sizes, off `modalClass`: `.modal-full` (the whole page: board, laptop, workPlan, accounting,
catalogue, shopping, company), `.modal-wide` (the middle folder: machineCard), and the plain
`.modal` for anything small. The two tables that decide it are `MODAL_IS_FULL` and
`MODAL_IS_WIDE` in `src/ui/app.ts`. `.modal-centred` is added when the player has not dragged it
anywhere.

## 3. Every helper in src/ui/modal.ts

| Helper | What it produces |
|---|---|
| `escapeHtml` | `escapeText` off `src/render/hall.ts`. The one escape in the game. |
| `money(value)` | `formatMoney` off the engine: pounds, "£2,600". |
| `minutes(value)` | `"45 min"`, rounded, never below zero. |
| `plural(n, one, many)` | re-exported from the engine, because the event copy needs it too. |
| `days(value)` | `"3 days"` through `plural`. |
| `signClass(value)` | `'good'` above zero, `'bad'` below it, `''` at it. |
| `signedMoney(value)` | `"+£300"`, `"-£2,699"`, `"£0"`. |
| `signedFigure(text, value)` | `<span class="figure good\|bad">` with the text inside it. |
| `closeButton(action = 'closeModal')` | `<button class="modal-close" data-do="...">×</button>`. The one cross. |
| `filterField(key, value, placeholder)` | `.field > input.filter-input` with a `.field-clear` cross when it has text. |
| `tabBar(action, tabs, current)` | `<div class="tabs">` of `.chip`, the current one `.chip.is-on`, each with `data-do` and `data-id`. |
| `emptyLine(text)` | `<p class="empty">`. |
| `button(action, text, extra)` | `<button class="btn" data-do="...">`. |
| `primaryButton(action, text, extra)` | `<button class="btn btn-primary" data-do="...">`. |
| `lockedButton(text, reason)` | the one allowed disabled button, the reason in its `title`. |
| `whyLink(state, key)` | `.why-link`, the real life note beside a decision, a text link and never an icon. |
| `reasonLabel(reason)` | `<span class="reason">`: what a row says instead of a control it cannot offer. |
| `tripLine(state)` | `<p class="warn trip">` while an interview is running. |
| `taskStartAction(state, task, label)` | the one control a task row carries: Start, "Put that down", or the reason with `Add as next` (`.task-queue-next`). |

Rule that comes with them: a control the engine would refuse is never drawn. Either a button that
does something, or `reasonLabel` saying why not.

## 4. The tokens of src/ui/styles.css

All on `:root` at the top of the file, lines 2 to 78. **No new colour, font, radius or shadow
value is added by any turn**; a screen reads these.

Palette: `--page: #23262b`, `--panel: #2d3138`, `--panel-2: #363b43`, `--border: #454b55`,
`--text: #e8e6e1`, `--text-dim: #a8adb6`, `--accent: #c98a3b`, `--good: #6ba368`,
`--bad: #c05a4e`, `--cream: #f3ecdc`.

The cross: `--close-disc: 54px`, `--close-out: -11px`, `--close-face: #f7f1e4`,
`--close-edge: #8a5424`, `--close-ink: #1f5a3a`.

The type scale, and every `font-size` in the file reads one of these, nothing is typed twice and
nothing is below the smallest: `--fs-tiny: 12px` (figures on a bar, axis labels, the version in
the corner), `--fs-small: 13px` (second lines, meta, units), `--fs-body: 15px` (every
description, card line, row, tip sentence and button), `--fs-lead: 18px` (a card title in the
system font, a section head), `--fs-title: 26px`, `--fs-display: 34px` (a ledger total).

The title hand keeps its own three: `--fs-hand-small: 20px` (a card name or a date),
`--fs-hand: 26px` (a cash figure or a label pill), `--fs-hand-big: 30px` (the head of a modal).

The placeholder art colours (`--concrete`, `--yard`, `--grid`, `--zone`, `--room*`, `--kit-*`,
`--stopped`, `--locked`, `--sawdust`, `--worker`, `--owner`) are the renderer's and belong to
`src/render`, not to a screen.

Radii: the file uses `3px` on `.btn`, `.chip`, `.card` and `.plan-chart`, `4px` on `.badge`,
`6px` on `.assign-row` and the screen's rounded boxes, `8px` on `.assign-list`, `14px` on
`.assign-chip` and `50%` on `.modal-close` and `.assign-off`. There is no radius token: match the
family you are sitting in.

Shadows: `.modal-close` has `0 4px 10px rgba(0, 0, 0, 0.4)`; `.assign-list` has
`0 8px 24px rgb(0 0 0 / 35%)`; `.modal-board` has
`inset 0 0 0 5px #24282c, 0 10px 30px rgba(0, 0, 0, 0.5)`. There is no shadow token either: match
the family.

## 5. The two fonts

- **The system stack**, `--font-ui: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`
  (styles.css 25), on `body` and on everything inside the laptop's screen.
- **The title hand**, `--font-title: 'Patrick Hand', 'Segoe Print', 'Comic Sans MS', cursive`
  (styles.css 2769, under the `@font-face` at 2760 that self hosts
  `/fonts/PatrickHand-Regular.ttf`, OFL). It is worn by exactly this selector list (styles.css
  2772): `.modal-head h2`, `.tile-name`, `.card-main h3`, `.folder-head h3`, `.board-week h4`,
  `.painted-text`, `.menu-pop h3`, and by `.modal-close` for its glyph. Nothing else takes it.

No third font is loaded and none is to be.

## 6. The buttons

- `.btn` and `.chip` share the base (styles.css 452): `background: var(--panel-2)`,
  `border: 1px solid var(--border)`, `border-radius: 3px`, `color: var(--text)`,
  `font: inherit`, `padding: 5px 10px`. Hover puts `border-color: var(--text-dim)` on both.
- `.btn[disabled]`: `color: var(--text-dim)`, `cursor: not-allowed`, `opacity: 0.65`. Only
  `lockedButton` draws one.
- `.btn-primary`: `background` and `border-color` `var(--accent)`, `color: #1c1f24`,
  `font-weight: 600`. The house amber is the accent button, everywhere. A blue button is the
  mockups' palette and not the game's.
- `.btn-big`: `font-size: var(--fs-lead)`, `padding: 9px 18px`, `width: 100%`.
- `.chip`: `font-size: var(--fs-body)`, `padding: 3px 8px`. `.chip.is-on` is the amber fill,
  `.chip.is-warn` is the red outline.
- The skins restyle these in place (`.modal-folder .chip`, `.modal-board .chip`,
  `.modal-folder button:not(.chip):not(.modal-close)`), so a `.btn` inside a folder is already
  paper. Never write a second button class to get a skin's look.

## 7. The cross

`closeButton()` and `.modal-close` (styles.css 966) are the one close control in the game: a
cream disc of `var(--close-disc)` 54 px, `3px solid var(--close-edge)`, `border-radius: 50%`,
the glyph in the title hand at `var(--fs-display)`, `position: absolute` at
`right/top: var(--close-out)` (-11 px), `z-index: 3`. The cross is a child of the modal itself
and not of its head, so every skin hangs it in the same place. Hover turns it
`color: var(--accent)`.

The Assign list wears the same disc, scaled (`.assign-list .modal-close`, styles.css 4014:
`right: -14px`, `top: -14px`, `transform: scale(0.72)`).

**Every modal, popover and list has the cross, Escape and a click outside** (PIOTR, 18.09). From
Turn 20 every popover also carries `data-popover` on its outer element, and the test of
CLAUDE.md T20 2.15 is the rule.

## 8. The top bar (src/ui/topbar.ts, styles.css 511)

`.topbar` is a machine cabinet drawn in CSS: four rivets as radial gradients and
`linear-gradient(#102518, #0a1a10)` under them, `border-top: 1px solid #2b4436`,
`border-bottom: 2px solid #050d08`. On it, left to right: `.name-plate` with `.cash` and
`.net.good|.bad`, `.clock-block` with `.date`, the `.day-meter` (`.day-head`, `.lamp`,
`.day-line`, `.day-count`, `.day-bar` of `.seg.seg-<band>`, and the `.day-tip` of `.tip-row`),
the `.efficiency` details plate, the `.speeds` of `.chip.knob` (`.knob.is-on` for the speed that
is running), `.spacer`, and the push buttons.

A push button is `.push` (styles.css 768), and `.push.is-new` is the orange light it takes when
something new is behind it. The Menu pops `.menu-pop` (styles.css 799):
`background: var(--panel)`, `border: 1px solid var(--border)`, `border-radius: 3px`,
`position: absolute`, `right: 12px`, `top: 42px`, `z-index: 40`. It is a popover, so it has the
cross (`closeButton('closeMenu')`), Escape and a click outside, and `data-popover`.

`.version-corner` (styles.css 1913) prints `APP_VERSION` at `--fs-tiny` in the bottom right.

## 9. The laptop (src/ui/laptop.ts)

Home is `.screen-status` (`.screen-company`, `.screen-clock`), then `.screen-tiles` of three big
`.screen-tile.screen-tile-<page>` buttons, each with an optional `.screen-tile-count` red disc,
an inline `.screen-icon` svg, `.screen-tile-big` and `.screen-tile-small`. Under
`<hr class="screen-rule" />` comes `<h3 class="screen-group">` and `.screen-small-tiles` of
`.screen-small-tile` with `.screen-small-label`.

Every page but home is `pageHead(page)`: `.screen-page-head` holding `.screen-back`
("← Home", the glyph and never a dash) and `.screen-page-title`. The tiles are the whole of the
navigation; the laptop has no tab bar. A new page goes in `LaptopPage`, in `PAGES`, in
`PAGE_TITLES`, in a tile table (`HOME_TILES` or a group beside `OFFICE_GROUP`) and in `pageBody`,
and it is reached through `openLaptopPage` in `src/ui/app.ts` and nowhere else.

## 10. The Company board (src/ui/company.ts)

Sheets of paper pinned to felt. `.felt` holds `.felt-head` with `.felt-name` and `.felt-line`;
each column is `<section class="sheet" data-sheet="...">` with a `.pin`. Inside a sheet:
`.ledger-total` (`.ledger-total-label`, `.ledger-total-figure`), `.ledger-head`, `.ledger-list`
of `.ledger-row` (`.ledger-main`, `.ledger-points`), `.ledger-week`, `.ledger-sum`,
`.ledger-rule`, and `.rate-figure` with `.rate-big` and `.rate-side`. Colour on a sheet comes
from `--sheet-ink`, `--sheet-dim` and `--sheet-green`, never from the dark palette.

## 11. The Work Plan (src/ui/workPlan.ts)

One row a job: `.plan-row[data-plan=<jobId>]` holding `.plan-head` and `.plan-chart`.
`.plan-head` is `flex: 0 0 42%` and `position: relative`, because the Assign list sits over the
row and not in the flow of it. Inside the head, in this order: `.row-main` (the name and the
price), the lifecycle row, two `.row-figure` spans (the stage, the day it is due), the calls
line, the material line, the assign controls, the take over control and the drop control, and
last a `.row-action` with the job's one button.

The chart carries `.plan-now`, `.plan-bar` (with `.plan-done` inside it, `.is-projected` before
it is started, `.is-late` past the deadline, and `.plan-late` beside it), `.plan-due`,
`.plan-start`, `.plan-figures` and `.plan-rate`. The scale row is `.plan-row.plan-scale-row` with
`.plan-scale` and `.plan-day` ticks and the `.plan-now-label`.

The shared row vocabulary, used here and on every list in the game: `.row`, `.row-main`,
`.row-figure` (right aligned, `.good` green and `.bad` red), `.row-action` (`min-width: 90px`,
right aligned), `.reason`, `.hint` and `.empty` (both `var(--text-dim)` at `--fs-body`), `.warn`
(`var(--bad)`), `.figures` and `.figures.dim`, `.card` with `.card-main` and `.badges` of
`.badge`.

## 12. The assign chips and the assign list (src/ui/jobCard.ts, src/ui/contracts.ts)

`.assign-line` inside a `.row-action` holds `.assign-none` ("Nobody is on it") when it is empty,
then one `.assign-chip` per man, each with an `.assign-off` round cross that takes him off, then
the one `.btn.btn-primary.assign-open` that toggles the list.

`.assign-chip` (styles.css 3960): `border-radius: 14px`, `padding: 3px 6px 3px 10px`,
`font-size: var(--fs-small)`, `background: var(--card-2, var(--panel-2))`,
`border: 1px solid var(--card-line, var(--border))`, `white-space: nowrap`. `.assign-off` is an
18 by 18 disc that turns `var(--bad)` on hover.

`.assign-list` (styles.css 3998) is the popover: `position: absolute`, `z-index: 2`,
`left: 12px`, `right: 12px`, `margin-top: 6px`, `padding: 8px`, `border-radius: 8px`,
`background: var(--card, var(--panel-2))`, the shadow above. It opens with `closeButton(
'closeAssign')` and a `.row-figure` asking who goes on, then one `.assign-row` per candidate:
the name, an `.assign-tier` under it, and either a `.chip` that does it in one click or an
`.assign-why` saying why not, with `.assign-row.is-busy` for the greyed ones.

One list is open at a time: `ui.assignOpen` in `src/ui/app.ts` holds the id, the opener toggles
it, Escape shuts it before the modal under it and a click outside shuts it.

## 13. The rule

A new screen, a new tab, a new page or a new card uses what is in this file and never a second
version of it. No new colour, font, radius or shadow value. A new class only when no existing one
does the job, and then named for its family and placed in the stylesheet beside that family.
Every new or changed screen is put beside the closest existing screen in the turn's report, with
what differs written out; any difference that is not in the brief is a bug to fix before the PR.
