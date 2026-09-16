# Turn 15: the boards read like a ledger

Woodwork Empire. Autonomous session brief for Claude Code (Opus 5, effort ultracode, cloud).
Owner: Piotr. Programmer: Claude. Spec author: Claude (chat), 16.09.2026, from Piotr playing v21
with five screenshots and one page of mockups (Petros: software/woodwork-empire, STAN 16.09).

Read this whole file (first line must say "Turn 15"; if the root `CLAUDE.md` does not, stop and
report), then `REPORT-T14.md` in full, then `docs/mockups/t15/README.md` and open the two HTML
files it names in a browser (they are the design; the screenshots next to them are the before),
then `docs/art/SPRITES.md` sections 8 and 11, then the archived briefs in `docs/`. Where files
disagree, this one wins. All standing rules apply (no em or en dashes anywhere, scope 1:1, one
code path, constants never in the UI, `[TUNE]` for every figure you choose and `[PIOTR]` for his,
kill background processes, PR without merge, end the session, no PR watching, `npm run check`
gated on its own exit code, every click single, one `APP_VERSION` bump).

**Precondition.** `main` carries Turn 14 merged: `APP_VERSION` is `'v21'`, `STATE_VERSION` is
14, `MODAL_SKINS` has `screen` and the laptop has `laptopHome(state)` in `src/engine/laptop.ts`.
If `APP_VERSION` is not `'v21'`, stop and report.

One agent, serial. Short turn. Every piece is small and most of them touch `styles.css`,
`company.ts`, `laptop.ts` and `app.ts`, so parallel agents would only wait on each other.

---

## 0. What this turn is for (Piotr, 16.09)

Piotr played v21 for a morning and wrote five things down. Every one of them is about reading,
not about rules of the game. His words, in order:

1. Company board: "I do not understand the layout. I wanted one clear column on the left and one
   on the right. On the right every plus and minus in one column and the result at the top over a
   line, like Excel. Why is it three columns. The close cross is tiny in the corner and does not
   work." And the board "hangs in the corner instead of in the middle between the door and the
   corner of the walls, exactly in the middle."
2. Orders board: "When you underline something important do not put it in a black box, nothing
   can be read." Tips: "add a nice graphic exclamation mark before the sentence and move it to
   the bottom of the card where there is room. The top is for important information, not tips."
3. Laptop: a red count in the top right corner of each big tile, gone when there is nothing to
   do; the line at the bottom of the tile stays. "The mockup had icons on the small tiles and now
   there are none."
4. Team: "The page layout is great, everything clear. But it is in the catalogue style and we are
   in the laptop, so it does not match. Every page in the laptop must have a back button."
5. Work Plan: "This looks great, but the job cards must not be crooked. Straight, nice boxes. It
   is an interactive board."

And one across the whole game: "the descriptions are too small". Font up, everywhere.

One thing Piotr decided **not** to change, after asking twice: what goes into the Output number.
The hall's own lines make the number; a man's rate acts on his minutes and a class of machine on
the stage it does; nobody is counted twice (`outputBreakdown`, `machines.ts`). The engine stays.
The board shows both kinds, under two rules, so the player still sees why a better saw is worth
the money. That is section 2.1 and it is a change to `company.ts` and `styles.css` only.

---

## 1. Rules restated (short)

Everything from Turns 1 to 14. Tonight in addition:

- **`APP_VERSION = 'v22'`.** `STATE_VERSION` does not bump: nothing here changes the shape of a
  save. If you think you need a new field on the state, stop that piece, write it in the report,
  do the rest.
- **The mockups are the contract for the look.** `docs/mockups/t15/fixes-1609.html` has four
  tabs: Company, Orders, Laptop, Team. Build what they show. Where a mockup and this text
  disagree, this text wins; where this text is silent, the mockup decides.
- **Boards of figures are straight.** A board the player reads numbers off is not a pin board of
  scraps. The tilt of `.modal-board` cards stays only where this brief does not remove it.
- **One type scale.** Every `font-size` in `styles.css` reads a token from `:root`. No pixel
  size is typed twice. Nothing in the game is below the smallest token.

---

## 2. Changes to the design (the contract)

### 2.1 The Company board, two sheets like a ledger `[PIOTR]`

The felt board in the oak frame stays (the `company` modal, `FELT_MODALS`), the week line at the
top stays (`Week 2 · +4 · Workshop 67% · Calls 2% ...`). Everything under it is rebuilt as **two
cream sheets side by side**, each pinned with one pin at the top centre, **straight, no rotation**
`[TUNE: the tilt rule of .modal-board is switched off for the company sheets]`. The three columns
and the two paragraphs of explanation are deleted.

**Left sheet: Reputation.** Title `Reputation` in the title font. Under it the total line: the
word `this week` small and dim on the left, the reputation figure big on the right (the display
token, the game's green), a 2 px rule under the line. Under the rule a small dim heading row
`Who said what · points`, then **every rating the company has had, newest first, one row each**:
the job's name and the verdict (`Garage shelves: on time`), a second small dim line with the day
and the client (`day 8, Mr Cole`; the client's name if the job has one, the job's id line
otherwise), and the points on the right in bold: green above zero, red below, dim at zero. The
carry over from the previous week is one row `Start of the week · carried over` with its figure.
Weeks are separated by a thin dim label row `Week 2` `[TUNE]`; the sheet scrolls inside itself
when the list is long, the total line does not scroll. At the bottom a right aligned sum line
`+9  -3  = 6`, the three figures of this week only.

**Right sheet: Output.** Title `Output`. Total line: `every minute of production is multiplied
by it` small and dim on the left, the figure big on the right (`0.67`), the 2 px rule. Then two
groups:

1. **The hall's lines**, the ones with `hall: true` in `outputBreakdown`: `Base 1.00` first
   (dim), then every hall line with its points (`Hall dirty -0.15`, `Extraction working +0`,
   `No room at the gate -0.10` and so on), each with a small dim second line where the existing
   tips and warnings tables have matching wording (`sweep it, or hire a helper`), otherwise none.
   Under them the Excel sum line right aligned: `+0.00  -0.15  = 0.85`, off `plus`, `minus` and
   `total` of the breakdown.
2. **A second rule** and a dim heading `Act where they are, not in the number above`, then every
   line with `hall: false`: the owner's overtime and dinner, each worker with his rate, each
   family of machine with the best class in the hall, each with its points in the same colours
   and the `where` text as the small second line (`your own minutes`, `his own minutes`, `the
   stage it does`). No sum line under this group.

Nothing about the numbers changes: the sheet prints `outputBreakdown(state)` and computes
nothing. The point of the second group is that Piotr, and the player, can see why a class 3 saw
was worth buying. Do not drop it, do not fold it into the sum.

**The cross.** The tiny `modal-close` in the corner of the felt is replaced on this modal by a
big decorative one: a cream disc `CLOSE_DISC` 54 px `[TUNE]` with a 3 px oak border, a shadow,
and a ✕ glyph in the title font at 34 px `[TUNE]`, sitting on the top right corner of the oak
frame, half outside it. It is the same `data-do` as every other close. **It works:** today the
cross on the company board does not close it. Find out why (the felt picture layer over the
button, a z-index, a missing handler on this skin) and fix it at the root, not with a second
handler; write the cause in the report.

**Where it hangs.** The board picture is its own sprite (`officeCompanyBoard.png`) drawn at the
region's box in `src/render/office.ts`. Today the region is `x 1000, y 168, width 280`, which
runs 60 px past the corner of the two walls and hugs the door frame: that is "in the corner".
Measured on `officeBackground.png` at y 300: the door frame's right edge is at x 970 and the
corner of the rear and right walls at x 1220, so the free wall is 250 px wide with its centre at
x 1095 (the clock above it is centred at 1101, which agrees). Set the region to `width 180,
height 180, x 1005, y 168` `[TUNE]`: 35 px of wall on each side, square like the picture, under
the clock. Put the four figures in one `COMPANY_BOARD_BOX` constant with the two measurements in
its comment. Verify the measurement yourself before you commit (a one off script reading the
pixel columns is fine; do not commit it) and adjust by at most 5 px if the wall says so. The
hover glow and label of Turn 14 follow the region and need no change.

### 2.2 The Orders board: badges you can read, tips at the bottom `[PIOTR]`

**Badges.** `.badge` (`Bespoke material`, `Site measure`, and the `Express` flag if it shares
the class) is today `var(--panel)` with a 1 px border and 11 px text, which on the folder paper
renders dark on dark. It becomes: background the game's red (`var(--bad)`), text white, bold,
the body token, padding `4px 10px`, radius 4 px, letter spacing 0.2 px `[PIOTR: the red one of
the three in the mockup; TUNE the metrics]`. `Express` keeps its own place at the top right of
the card and takes the accent orange instead of red `[TUNE]`, so a rush is not a warning.
Wherever else `.badge` is used in the game, it gets the same treatment; if a use is not a
warning (grep first), give it its own class and leave it as it was, and list those in the
report.

**Tips.** `renderTip` is today prepended to the modal body, so the first thing on every screen
is the tip. It moves to the **bottom** of the body: `modalBody(...) + renderTip(...)` in
`app.ts` (and the three other call sites: contracts, finance, house), one helper so the order
cannot differ between screens. The bubble gets a **graphic exclamation mark** before the
sentence: an inline SVG disc in the accent orange, 34 px `[TUNE]`, with a white `!` in the title
font, followed by the sentence in the body token, the `Right` button on the right as a pill. The
bubble is the last child of the body and does not float over the content; on a screen that
scrolls, it scrolls with it. Same rule inside the laptop screen: the tip is the last child of
the page, styled to the screen skin (white panel, system font, the same disc).

### 2.3 The laptop: counts on the tiles, icons on the small ones, every page a laptop page `[PIOTR]`

**Counts.** Each of the three big home tiles gets a **red round count badge** in its top right
corner: `TILE_COUNT` 34 px tall, min width 34 px, `var(--bad)`, white bold at the lead token, a
2 px white ring and a shadow `[TUNE]`. The figure is: Tasks, the open tasks (`tasksOpen`);
Stock, the low lines (`lowLines`); Drawings, the jobs waiting for a list (`drawingsWaiting`), all
off `laptopHome(state)` and nothing else. **When the figure is zero the badge is not rendered at
all**, not hidden, not rendered: no element. The live line at the bottom of the tile stays
exactly as Turn 14 left it.

**Icons.** The six Office tiles get the line icons of the mockup (people, globe, shield, lock,
monitor, gear), inline SVG in the game's green, 30 px `[TUNE]`, above the label. They were in
mockup C and Turn 14 left them out; they are not optional.

**Every page a laptop page.** Turn 14 put Tasks, Stock, Drawings and the three Admin tabs inside
the screen behind `← Home`. **Team was left as the folder modal**, opened from the Office tile:
that is the catalogue look Piotr saw. Tonight Team becomes a laptop page like the others:
`LaptopPage` gains `'team'`, the Team tile opens it inside the screen with `← Home` at the top
left in the same place as on every other page, the Team renderer's output sits inside the screen
skin, the four tabs (`Workshop`, `Office`, `Technical`, `Management`) render as the screen's
segmented control, the draw chips as the screen's buttons, the hire cards as white panels with
the `Hire` button in the game's green. Its content and its controls are as Turn 13 and 14 left
them: hiring, the draw tiers, holiday, the second shift line all work from inside the screen,
proved by the existing team tests run through the laptop page. The separate `team` modal is
**deleted**: its `ModalSpec`, its `MODAL_SKINS` line, the `case 'team'` route and every
`openModal('team')`; every place that opened it (the top bar's link if any, a warning strip's
link, the hall's Start production path if it goes there) opens the laptop on the team page
through one function `openLaptopPage('team')`. Grep for `'team'` in `src/ui` and account for
every hit in the report.

**Back on every page.** A test opens every `LaptopPage` but `home` and asserts the `← Home`
control is the first child of the page header, with the same class, and that clicking it lands
on home. If any page is missing it, that is the bug.

**Settings** stays a modal of its own (it is the top bar's gear, not a laptop thing); the Office
tile opens it as today.

### 2.4 Work Plan: straight cards `[PIOTR]`

The tilt rules in `styles.css` (`.modal-board .plan-row:not(.plan-scale-row):nth-of-type(3n + 1)`
and its two siblings) lose the `.plan-row` selector: Work Plan rows render with no transform.
The colours, the axis, the bars, the ticks and the deadline marks are untouched. The `.card`,
`.row` and `.tile` selectors of the same three rules **stay** for the Shopping board `[TUNE:
Piotr named the Work Plan only; Shopping is a shop window, not a ledger]`. The Company sheets
are straight through 2.1. A test reads the stylesheet and asserts no rule transforms
`.plan-row`.

### 2.5 The type scale: the descriptions go up everywhere `[PIOTR]`

`styles.css` has 24 places at 12 px, 11 at 11 px, 5 at 10 px, 9 at 13 px and a scatter of larger
sizes, each typed by hand. Tonight:

1. Define a type scale on `:root`: `--fs-tiny: 12px` (the floor: figures on a bar, axis labels),
   `--fs-small: 13px` (second lines, meta, table heads), `--fs-body: 15px` (every description,
   card line, row, tip sentence, button), `--fs-lead: 18px` (card titles in the system font,
   section heads), `--fs-title: 26px`, `--fs-display: 34px` (the ledger totals) `[TUNE the
   names, not the idea]`. Titles in the title font keep their own two or three sizes as tokens
   too.
2. Replace **every** `font-size` in `styles.css` with a token. Nothing below `--fs-tiny`. What
   was 10 or 11 becomes tiny; what was 12 becomes small or body by its job (a description is
   body, a unit under a figure is small); what was 13 becomes body. A table in the report lists
   every old size and the token it went to, with the count.
3. Then look. Every modal, the top bar, the day end summary, the event modal, the machine card,
   the catalogue, the shopping board, the work plan, the laptop home and its pages, at the game's
   minimum width of 1280 px: nothing overflows its box, nothing wraps into a third line that was
   one, no button loses its label. Where something breaks, fix the box, not the size (a wider
   column, a wrap, a scroll), and list it. The one exception allowed: a figure on a work plan bar
   or a tick label may stay tiny.
4. Twelve screenshots of the look after, in `docs/report-t15/`, one per screen named above.

---

## 3. State

No change to the shape of the state. `STATE_VERSION` stays at 14.

---

## 4. Task queue, in order

Branch `turn-15-the-boards-read-like-a-ledger` from `main`. One commit per task, `npm run check`
green on its own exit code before each, two report lines per task in `REPORT-T15.md`.

**T15-01 Housekeeping and v22.** `docs/turn-14-brief.md` from git history, byte for byte the
`CLAUDE.md` of the Turn 14 merge commit; the README's briefs line; `APP_VERSION = 'v22'`;
`docs/mockups/t15/` is already in the repo through this brief's pack and is not touched. Done:
the version test.

**T15-02 The type scale.** 2.5 points 1 and 2 only: the tokens and the replacement, the mapping
table in the report. Done: a test reads `styles.css` and asserts every `font-size` value is a
`var(--fs-...)` and every token is at or above 12 px. (Looking, point 3, is done last, in
T15-08, once every other change is in.)

**T15-03 Work Plan straight.** 2.4. Done: the stylesheet test.

**T15-04 Tips at the bottom, with the mark.** 2.2 tips. Done: a test opens three screens with
an unseen tip and asserts the bubble is the last child of the body, has the SVG disc, and the
`Right` button dismisses it as before.

**T15-05 Badges.** 2.2 badges. Done: a test computes the badge's background and colour off the
stylesheet on an enquiry card with both flags, asserts red and white and the body token, and
that `Express` is orange.

**T15-06 The Company board.** 2.1: the two sheets, the ledger totals, the two groups on the
right, the big cross that works, the region moved. Done: tests (two sheets and no third column;
the reputation total equals the state's; every rating present newest first with its points and
colour; the hall lines and their sum equal `outputBreakdown` `plus`, `minus`, `total`; every
`hall: false` line under the second rule with its `where`; the cross closes the modal from a
real click; the region box equals `COMPANY_BOARD_BOX`; the office hover test still passes).

**T15-07 The laptop.** 2.3: counts, icons, Team as a page, the modal deleted, back on every
page. Done: tests (a badge on Tasks and Stock with a known state and none on Drawings at zero,
as elements; six icons; Team opens inside the screen from the tile and from every former
`openModal('team')` caller; the team tests green through the page; `'team'` gone from
`MODAL_SKINS` and the modal routes; the back test of 2.3).

**T15-08 Look, fix, shoot.** 2.5 points 3 and 4 across every screen, with the fixes listed.
Done: the twelve pictures, `npm run check` green.

**T15-09 Report and PR.** `REPORT-T15.md` in the usual structure plus "Numbers chosen", "Type
scale mapping", "Deleted" and "Why the cross did not close". Kill background processes, push, PR
titled `Turn 15: the boards read like a ledger`, do not merge, end the session.

---

## 5. Do not (tonight)

1. No change to `outputBreakdown`, `hallProductivityFactor`, the class factors of machines, the
   rates of men, or anything else in `src/engine`: this turn has no engine task. `laptopHome` is
   read, not changed.
2. No `STATE_VERSION` bump. No new field on the state.
3. No touching `docs/art/SPRITES.md`, `CLAUDE.md`, the archived briefs, the mockup files, the
   sprite files or the font file.
4. No change to what the Orders board says or does beyond the badges and the tip. No change to
   the Work Plan beyond the tilt. No change to the Team page's content or controls beyond the
   skin and the frame.
5. No tilt back on the Company sheets or the Work Plan rows; no tilt removed from Shopping.
6. No pixel `font-size` left in `styles.css`; no size below the tiny token anywhere.
7. No second handler on the company cross; the root cause is fixed.
8. No storage access outside `src/cloud/store.ts`; no PixiJS, sound, mobile, Steam, Electron.
9. No watch loops, nothing left running.

---

## 6. Parked

1. Whether machines and men should enter the Output number at all (Piotr, 16.09: "to think
   about"; Petros "WAZNE DO PRZEGADANIA"). Not tonight, not by you.
2. Shopping board tilt.
3. Everything parked by Turns 13 and 14.

---

## 7. The cross check (before the PR)

- **Two sheets.** The company body has exactly two `.sheet` children and no `.col`, no third
  block, no paragraph of explanation.
- **The number is the engine's.** grep `company.ts` for arithmetic on points: none; every figure
  is a field of `outputBreakdown` or a rating's points.
- **One close.** The company cross uses the same `data-do` as every other modal close, and a
  real click closes it in the test.
- **One home function.** Every count on the tiles is a field of `laptopHome(state)`.
- **Team once.** `grep -rn "'team'" src/ui` shows only the `LaptopPage` value and
  `openLaptopPage('team')` calls; no `ModalSpec`, no skin, no route.
- **Back everywhere.** The back test of 2.3 is green for every page.
- **Tips last.** Every `renderTip` call site puts the tip after the body, through the one
  helper.
- **Type scale.** The stylesheet test of T15-02 is green; the mapping table is in the report.
- **Straight.** No rule in `styles.css` transforms `.plan-row` or the company sheets.
- **The look.** The twelve pictures are in `docs/report-t15/`; the Company board hangs centred
  on the wall under the clock in the office picture.

---

## 8. Art requested

None tonight. `docs/art/REQUESTS-T14.md` stands (the lit door and the optional lit boards).

End of brief.
