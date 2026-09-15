# Report: Turn 14

The laptop is a computer: one evening of Piotr's notes after playing v19, built in one session,
one agent, serial.

Branch `claude/wizardly-feynman-wscoo2` (the cloud environment names the branch; the brief's task
queue would have called it `turn-14-the-laptop-is-a-computer`). Base: `30f8d8e` on `main`, the
Turn 13 merge with its CLAUDE.md update, `APP_VERSION` `v20` and `MODAL_SKINS` in `src/ui/modal.ts`,
which is the brief's precondition. Eight commits on top of it, one per task of section 4.
1,459 tests green and three todo in 144 files, up from 1,421 and three todo in 139 files at the
end of Turn 13. `npm run check` green on its own exit code before every commit.

`STATE_VERSION` stays at 14. No field was added to the state; the laptop's page is UI state
(`ui.laptopPage`), as the tab was.

---

## 0. Blockers

None. Every piece of section 2 is built as written. Where the brief names a Turn 13 thing that
Turn 13 built under another shape, the built one is used and section 4 says so (the Admin pages
are tabs of the laptop, not pages of their own; the laptop has no first use bubble of its own;
the Menu has no speed control; Skip ahead has been ten since Turn 9).

---

## 1. Done

| Task | Commit | What went in | Proved by |
|---|---|---|---|
| T14-01 Housekeeping and v21 | `fd3fdd9` | `docs/turn-13-brief.md` byte for byte the `CLAUDE.md` of the Turn 13 merge commit `d176b7d` (the typo in its line 26 stays); the README's briefs, reports and art request lines; `APP_VERSION = 'v21'`; `tests/fixtures/save-v20.woodwork.json` from a short run on `main` before the first commit (Easy, seed 20260911, the day 1 kit ordered and landed, the licence, a bookcase accepted on day 2, thirty minutes of play: day 2, minute 30, 11 items, 5 tasks, 23 ledger lines); `docs/art/REQUESTS-T14.md`. | `tests/ui/version.test.ts` |
| T14-02 Speed x30 | `4525d88` | `SPEEDS` is `[0, 1, 2, 4, 10, 30]` and `Speed` joins 30; the top bar's chips come off the table as before and `speedFromString` now reads the table back instead of a typed list; `gameMinutesPerRealSecond(30)` is 30, so a working day of 480 minutes is 16 real seconds. Skip ahead and the move jump untouched. | `tests/ui/speedTen.test.ts` extended to x30: the sixth chip off the table in the style of ten, the event stop at ten and at thirty, and a full day at thirty on which the day end summary comes up once and the clock stops; `tests/ui/oneClick.test.ts` runs its 200 clicks once at x30 as well, a frame of thirty minutes between every two |
| T14-03 The office door | `cf36b43` | One function `walkTo(view)` in `app.ts` behind the top bar's Office button, the office block in the hall, the door in that block, the door of the room itself and Start production; the hall door's `data-door="office"` calls it and nothing else; the door's tooltip reads `To the office`. Team is on the laptop's Office tile and the board's own link. | `tests/ui/hallRooms.test.ts` (the door test flipped: the office view opens, no Team modal, and the top bar's button lands in the same room), `tests/ui/team.test.ts` (the door line flipped) |
| T14-04 The screen skin and the home screen | `7de62a8` | A third skin `screen` in `MODAL_SKINS`, the laptop alone on it; the laptop fills the page; the bezel, the hinge strip and the cool screen drawn in CSS; `--font-ui` defined once on `:root` and read by the body and the screen; every heading inside the screen in the system stack; `laptopHome(state)` in `src/engine/laptop.ts`; the home screen with the company and the clock line, the three big tiles Tasks, Stock, Drawings with their icons and live lines, the rule and the Office group; `LaptopTab` becomes `LaptopPage`, `ui.laptopPage`, home the default and home every time the lid is lifted; the tab bar and the `laptopTab` route deleted. | `tests/engine/laptopHome.test.ts`, `tests/ui/laptopHome.test.ts` (home first; the three tiles in order with the counts of a known state; the low count red above zero and the words when zero; every Office tile opens its thing; back returns to home; the laptop carries `modal-screen` and neither `modal-folder` nor `modal-board`; no title font on any heading inside the screen, computed off the stylesheet; the `laptopTab` route and the `tabBar` call gone); `tests/ui/modalSkins.test.ts` (three skins, exactly one class each, the screen the laptop's only) |
| T14-05 The pages inherit the skin | `149e988` | Nothing to build beyond T14-04's page frame: proof that the tasks, stock and drawings pages and the three Admin pages sit inside the screen behind the back arrow with their Turn 13 renderers' output byte for byte. | `tests/ui/laptopPages.test.ts` (each page opens from its tile and comes back home; the stock page's Low stock badge, Restock and Order for this job work inside the screen; a task and a drawing start and pause from inside it) |
| T14-06 Hover in the office | `cbea939` | The orange outline gone from the pointer, the accent ring kept for `:focus-visible` alone; the laptop layer glows in its own shape through `:has()` on the stack; the door, the boards, the binder and the catalogue get a soft light spot; the label pill with the region's name off the region table, a child of every region, hidden until the pointer; the lit door overlay laid over the room through the sprite file check when `officeDoorLit.png` lands, and listed on the sprite check page; no pointer word left in the TypeScript of `src/ui` and `src/render`. | `tests/ui/officeHover.test.ts`, `tests/render/officeRoom.test.ts` (tooltip case turned into the label case), `tests/ui/skinPaint.test.ts` (outline case flipped), `tests/ui/spriteCheck.test.ts` |
| T14-07 The save check | `84df8f0` | Section 6 below. All green, nothing to fix. | `tests/ui/saveCheck.test.ts` |
| T14-08 Report and PR | this commit | This file, the thirteen pictures in `docs/report-t14/`, the PR. | |

---

## 2. Numbers chosen

Every figure this turn chose, with its `[TUNE]` tag where it lives. The engine got no figure at
all: `laptopHome` counts and chooses nothing. Everything below is in `src/ui/styles.css`.

### The screen skin (T14 2.1)

| Number | Value | Note |
|---|---|---|
| `--bezel` | `#1c1c1e` | the brief's figure |
| `--screen` to `--screen-2` | `#e9eee9` to `#dfe6df` | the brief's figures |
| `--screen-ink` | `#222` | the brief's figure |
| `--screen-line` | `#c5cec5` | the rules and card edges on the screen |
| `--screen-dim` | `#5a625a` | dimmed text on the screen: hints, figures, done rows |
| `--screen-accent` | `#2b6cb0`, `#245d99` on hover | the one accent of the software: a chip that is on, the primary button, the back arrow, hover |
| `--screen-tile-gap` | 24 px | `TILE_GAP`, the brief's figure |
| `--tile-tasks`, `--tile-stock`, `--tile-drawings` | `var(--good)`, `#2c6a86`, `#6d4c2f` | the game's green and the brief's two |
| the bezel | radius 18 px at the top and 8 px at the bottom, padding 18 px and 30 px under, the hinge strip 10 px high across the middle 40%, 6 px from the bottom | mine |
| a big tile | at least 190 px high, radius 12 px, the big line 28 px, the small line 14 px, the icon 40 px | mine |
| a small tile | at least 132 px wide, padding 14 px by 16 px, radius 10 px, white with the screen line for an edge | mine |
| the head and the headings | the modal's head at 18 px, an h3 at 15 px, both in `--font-ui` at weight 600 | mine |
| the controls inside the screen | white buttons and chips with a `#b9c2b9` edge and 6 px corners; a disabled button `#eef1ee` on `#8a928a`; the Low stock badge in the game's red, Held in the game's green; the first use bubble a flat white note | mine |

### The office pointer (T14 2.2)

| Number | Value | Note |
|---|---|---|
| the light spot | `radial-gradient(ellipse at center, rgba(245, 239, 226, 0.28), transparent 70%)` | the brief's figure, as a background image so a drawn placeholder keeps its colour under it |
| the laptop's glow | `drop-shadow(0 0 14px rgba(245, 239, 226, 0.75)) drop-shadow(0 0 30px rgba(224, 115, 30, 0.45))` | the brief's figure |
| the focus ring | 2 px in the accent, on `:focus-visible` only | the brief's figure |
| the label pill | background `rgba(16, 37, 24, 0.85)`, colour `var(--cream)`, turned minus 3 degrees | the brief's figures |
| the label pill, the rest | the title hand at 26 canvas px, padding 7 px 18 px 9 px, a 999 px radius, 10 px in from the top right of the region, a 120 ms fade | mine |
| the lit overlay | a 120 ms fade in and out | mine |

---

## 3. Deleted

The four laws of deletion (Petros 30.08): every one of these is gone, not hidden, and no shim,
compatibility layer or dead export was left.

- The laptop's tab bar: the `tabBar('laptopTab', ...)` call in `src/ui/laptop.ts`, the `LaptopTab`
  type, `laptopTabFrom`, `ADMIN_TABS` and the `'team'` tab value. The `.tabs` rule stays for the
  catalogue, the books, the team and the board, which are still read in tabs.
- The `laptopTab` route in `app.ts` and the `ui.laptopTab` field (it is `ui.laptopPage` now, of
  type `LaptopPage`, with `laptopPageFrom` and the `laptopPage` route in their place).
- `MODAL_IS_FULL.laptop = false`: the screen fills the page.
- The orange outline on `.office-region:hover`, and the combined selector that put it on
  `:focus-visible` with it; the four pointer rules on the two painted objects and their drawn
  placeholders (`.office-floor-catalogue:hover`, `.office-company-board:hover`,
  `.office-company-board.is-art:hover`, `.office-floor-catalogue.is-art:hover`, the last two the
  orange drop shadows of Turn 11); the `title` tooltip on every office region.
- The Team behind the hall's office door: `openModal('team')` in `handleSceneClick` and the door's
  `<title>The team</title>`.
- The three writes of `ui.view` outside one function (the `setView` case, `handleRoomClick`, the
  office door region and Start production), folded into `walkTo`.
- The typed speed list in `speedFromString` (`1 || 2 || 4 || 10`): it reads `SPEEDS`.
- The word `hover` in two TypeScript comments and one variable name (`hall.ts`, `topbar.ts`).
- In the tests: the door case of `hallRooms.test.ts` is flipped, not kept beside a new one; the
  door line of `team.test.ts` is flipped; the "laptop tabs" describe of `officeRegions.test.ts` is
  the "laptop tiles" describe, and its case for the tab bar's rule is gone with the tab bar; the
  "two skins" of `modalSkins.test.ts` are three; the outline case of `skinPaint.test.ts` is
  flipped; the tooltip case of `officeRoom.test.ts` is the label case.

---

## 4. Deviations from the contract

1. **Branch name.** The environment names the branch `claude/wizardly-feynman-wscoo2`; the brief's
   `turn-14-the-laptop-is-a-computer` is the PR title's job, as in Turn 13.
2. **The Admin pages are pages of the laptop.** The brief types `LaptopPage` as four values and
   says "Website, Insurance and Security open those Admin pages", then "if Turn 13 built the Admin
   pages as tabs of one page, a small tile opens that page on that tab". Turn 13 built them as
   tabs of the laptop itself (REPORT-T13, T13-A2: "the laptop's Admin group"). The tab bar is
   gone, so the three small tiles open them as pages inside the laptop behind the back arrow, and
   `LaptopPage` has seven values: `home`, `tasks`, `stock`, `drawings`, `website`, `insurance`,
   `security`.
3. **Joinery Core opens the Team board on its Technical tab.** The brief's "the software line (the
   purchase of the estimator's software and its extensions, 3.8 of T13)" was built by Turn 13 on
   the Team board's Technical tab (REPORT-T13, T13-B2a), so that is what the tile opens. It goes
   through the existing `teamTab` route, which now also opens the board when the board is not the
   open modal; inside the board the chip is still just the tab. No new route.
4. **The Menu has no speed control.** 2.4 says "the chip on the top bar and the cadence control in
   the Menu both show it". The Menu's cadence control is the summary cadence of Turn 4 3.6 (day,
   week, month) and has nothing to do with speed; there has never been a speed control in the
   Menu. The chips on the top bar are the one place a speed is shown, off the one table, and no
   second control was added (scope 1:1). Section 12 asks Piotr whether he wants one.
5. **Skip ahead is ten, not four.** 2.4 says "Skip ahead stays at 4x (T8)". Turn 9 3.11 moved it
   to ten (`SKIP_SPEED = 10`, `tests/ui/speedTen.test.ts`), and "stays as it is" is what was done:
   nothing about it or the move jump changed.
6. **No first use bubble on home.** 2.1 says "Turn 13's first use bubble for the laptop fires on
   home". Turn 13 gave the laptop no bubble of its own: the twelve sentences of `TIPS` are keyed by
   screen (`stock`, `website`, `insurance`, `security` for the laptop's pages, none for the laptop).
   Home fires the key `laptop`, for which there is no sentence, so nothing shows there tonight and
   the pages keep theirs. No sentence was invented; section 12 asks for one.
7. **The catalogue and the company board get the spot as written.** 2.2 says they are painted into
   shared layers; in fact both have pictures of their own since the chat fixes of 14.09
   (`catalogueFloor.png`, `officeCompanyBoard.png` inside the region). The brief says spot, so spot
   it is, and their old orange drop shadows are gone (two things on the pointer and nothing else).
   A shaped glow for them is one rule each away; section 12.
8. **The sprite check page lists the lit door.** Not asked for; it is the acceptance page of every
   file the art side delivers (SPRITES.md 7, T4-09, T8 3.7), so `officeDoorLit` has a wide cell
   under "The office, lit", and the file goes through `pickSprite` like every sprite.
9. **"Due today".** A task carries the day it belongs to (`types.ts`: "Day the task belongs to.
   Daily tasks are created fresh each working day") and no other due day, and no field could be
   added. `tasksDueToday` counts the open tasks whose day is today: the day's chores, and the
   paperwork of a job taken on today.
10. **The region tooltips went with the outline.** The label pill names the thing on the pointer;
    a native tooltip beside it would be a third thing. The name is still in one place, the region
    table, and the label is the region's accessible name.
11. **Thirteen pictures, not nine.** Section 7 asks for nine screenshots of the nine tiles; the
    folder has those nine, plus the office with the laptop and with the door under the pointer,
    home before the tiles and home after the last back arrow.
12. **The floor catalogue's label** reads `Catalogue, on the floor` before there is a desk: the
    special name Turn 7 gave that variant, carried into the new wording, not a new one.
13. **The cloud load in the save check** is proved down to `openSavedRow`, the decoder `loadGame`
    hands the fetched row to: this build has no Supabase environment, so the query itself is dark
    (`tests/ui/cloud.test.ts` covers that).
14. **The save file in the headless DOM** has no `text()` method; the save check gives its files
    one that answers with the same bytes, so `onFileChosen` is driven as the browser drives it.

---

## 5. Cross check (section 7)

- **Three skins, one each.** `MODAL_SKINS` has `folder` (board, accounting, catalogue, team, event,
  daySummary, settings), `board` (workPlan, shopping, company) and `screen` (laptop). The laptop
  is the only `screen`, asserted in `tests/ui/modalSkins.test.ts`, which also opens every modal
  the room and the top bar reach and asserts it carries exactly one of the three skin classes.
- **One home function.** Every number on the three tiles is `laptopHome(state)`'s
  (`tests/ui/laptopHome.test.ts` compares the printed lines with the function's figures on a
  known state and after a minute of the clock). `grep` of `src/ui/laptop.ts` for arithmetic on the
  state: the home screen has none. The tasks page behind the Tasks tile keeps the one count Turn
  13 left it, the `At the gate, n pieces` heading, which is the length of the engine's
  `jobsAtGate(state)` list; its content is out of scope tonight (5.3).
- **One door path.** `ui.view = ` is written in two places in `app.ts`: inside `walkTo` and for
  the sprite check page (`'sprites'`, which is neither the hall nor the office). The door's click,
  the Office button, the office block, the door region of the room and Start production all call
  `walkTo`; `tests/ui/hallRooms.test.ts` presses the door and the button and lands in the same
  room. There is no second way into the office view.
- **One speed table.** `SPEEDS` is read by the top bar's chips and by `speedFromString`;
  `gameMinutesPerRealSecond` reads the speed the table gave the state. `30` as a speed is typed in
  `SPEEDS` and in the `Speed` type and nowhere else (`grep -rnw 30 src` filtered to speed lines
  finds only those two). `tests/ui/speedTen.test.ts` asserts the chips are the table, in order.
- **Hover is CSS.** `grep -rni "mouseenter\|mouseover\|hover" src/ui src/render --include=*.ts`
  finds nothing; `tests/ui/officeHover.test.ts` runs the same grep and asserts it. The glow, the
  spot, the lit overlay and the label are `:hover`, `:has()` and `:focus-visible` rules and nothing
  else; `tests/ui/hallClock.test.ts` still finds every region node and its markup unchanged sixty
  ticks later.
- **The look.** `docs/report-t14/`, thirteen JPEGs at 1440 by 900 off `npm run build` served from
  `dist/`, with the v20 fixture in the browser's store and Continue pressed: the office with the
  laptop under the pointer (the glow along the lid and the `Laptop` pill, no rectangle), the
  office with the door under the pointer (the light spot and `To the hall`), the laptop's home
  (the bezel, the cool screen, the company and the clock line, the three tiles with their icons
  and lines, `0 sheets free, 1 low` with the low count in red, `1 waiting for a list`, the Office
  group), then Tasks, Stock, Drawings, Team, Website, Insurance, Security, Joinery Core and
  Settings off their tiles, and home again. Inside the laptop there is no cream, no folder and no
  handwriting on any page: the head, the headings, the rows, the cards, the buttons and the tip
  bubble are the system font on the cool screen. The one warm patch inside it is the MFC board
  thumbnail on the stock page, a picture of a white board drawn by the placeholder helper
  (`thumb` fill `#f3ecdc`, Turn 13 9.8): it is the content of the stock page and not a paper
  element, and it is left as Turn 13 painted it (5.3); section 12 asks whether it should be whiter.
  Team, Joinery Core and Settings open the Team board and the Settings modal, which are paper and
  stay paper: they are outside the bezel.

---

## 6. T12-L

All green: a fresh game on Easy on day 1 saves through the browser store, the file and the cloud
row, and loads back through Continue, Load from file and the row's decoder, at day 1 and again
after thirty minutes of play, and the v20 fixture loads through all three and runs
(`tests/ui/saveCheck.test.ts`, six cases). Nothing was fixed.

What the test does: the start screen with Easy picked and Start pressed; `readStore` and
`peekSave` on the store the game writes as it is played; `encodeSaveFile` and `decodeSaveFile` on
the file the Menu saves; `openSavedRow` on a row holding the same bytes; a fresh page with Continue
pressed; `onFileChosen` with the file the Menu would download; the same five after thirty minutes
of the clock and a modal shut; the v20 fixture through the file, the row, the store, thirty ticks
of the engine, Continue on a fresh page and Load from file. The store is written at most once a
second (T11 3.2), so the test lets a coalesced write land before it reads.

---

## 7. Art requested

`docs/art/REQUESTS-T14.md`: `officeDoorLit.png`, the office door alone on the 1672 by 941 office
canvas, lit from inside, everything else transparent; and, if cheap, `officeWorkPlanLit.png`,
`officeOrdersLit.png` and `officeBinderLit.png` the same way. How the code places them: an overlay
is laid over the background layer and under the desk and the laptop layers while the pointer is
on its region, through `OFFICE_LIT_LAYERS` in `src/render/office.ts` and the same manifest check
every sprite goes through; the stack carries `data-lit` with the regions whose overlay has landed,
so those regions lose the light spot; the sprite check page shows each one under "The office, lit".
The boards and the binder are one line each in that table when their files land. Nothing in
`docs/art/SPRITES.md` was touched.

---

## 8. Tests

1,459 tests green and three todo in 144 files, up from 1,421 and three todo in 139 files at the
end of Turn 13: 1,421 after T14-01, 1,425 after T14-02 and T14-03, 1,441 in 141 files after
T14-04, 1,446 in 142 after T14-05, 1,453 in 143 after T14-06, 1,459 in 144 after T14-07. The three
todo entries are Turn 12's thicknesser month and the two expectations of Turn 13's playthrough.
Five test files were added (`tests/engine/laptopHome.test.ts`, `tests/ui/laptopHome.test.ts`,
`tests/ui/laptopPages.test.ts`, `tests/ui/officeHover.test.ts`, `tests/ui/saveCheck.test.ts`),
none deleted. `npm run check` is lint, the sprite manifest, `tsc` and the build, then the suite; it
ran green on its own exit code before every one of the eight commits.

Two tests compute what a browser would: the no handwriting test loads the stylesheet into the
headless DOM and reads the cascaded font family of every heading inside the screen, walking up to
the nearest ancestor that sets one, with the custom properties written out; the office pointer
test reads the computed style of every region at rest and of every label.

Run it: `npm run check`. The pictures were taken with `playwright-core` against `npm run build`
served from `dist/`; the script is not in the repository, as in Turn 13.

---

## 9. How to run

`npm ci`, `npm run dev`, `npm test`, `npm run check`. The README's first ten minutes still hold;
from this turn the laptop opens on its home screen and the desk work is behind its Tasks tile.

---

## 10. Duplicate paths

- Into the office view: one (`walkTo`).
- Into a laptop page: one (`laptopPage`, the tiles and the back arrow are the same click).
- The home counts: one (`laptopHome`).
- A speed: one table (`SPEEDS`), read by the chips and read back by `speedFromString`.
- The system font: one definition (`--font-ui` on `:root`), read by the body and the screen.
- A modal's skin: one table (`MODAL_SKINS`), one class per modal.
- The pointer in the office: none in TypeScript; the stylesheet alone.

---

## 11. Line balance

| Task | Files | Added | Removed |
|---|---|---|---|
| T14-01 | 6 | 758 | 6 |
| T14-02 | 5 | 174 | 40 |
| T14-03 | 4 | 43 | 22 |
| T14-04 | 22 | 1,099 | 168 |
| T14-05 | 1 | 197 | 0 |
| T14-06 | 9 | 412 | 68 |
| T14-07 | 1 | 218 | 0 |
| T14-08 | this file and thirteen pictures | | |

T14-01's 758 are the archived Turn 13 brief (724) and the fixture; T14-04's are the laptop
rewritten, the screen skin in the stylesheet and two new test files.

---

## 12. Open questions for Piotr

1. **A speed control in the Menu.** 2.4 says the Menu's cadence control should show x30 too. The
   Menu has only the summary cadence (day, week, month) and has never had a speed control; the
   chips on the top bar are the one place. If you want the speeds in the Menu as well, it is the
   same `speedChips` off the same table, one line in `renderMenu`.
2. **The catalogue and the company board.** Both have pictures of their own, so a shaped glow like
   the laptop's is one rule each: tonight they get the light spot as the brief says.
3. **A sentence for home.** The laptop's home screen fires the tip key `laptop`, which has no
   sentence; Turn 13 gave the laptop no bubble of its own. One line in `TIPS` and it shows.
4. **The red on the Stock tile.** `1 low` is in the game's red on the teal tile as asked, and the
   contrast is low. A paler red, or the count on a small white pill, if it reads badly to you.
5. **The board thumbnail.** The MFC picture on the stock page is a warm off white
   (`#f3ecdc`, the placeholder helper's `thumb` fill) and is the one warm patch inside the screen.
   A whiter board is one figure in `src/render/placeholder.ts`.
6. **The pill.** 26 canvas pixels, ten in from the top right of the region, turned three degrees;
   every one of those is a guess against the photograph and easy to move.
7. **`:has()`.** The laptop's glow and the lit door use it (Chromium 105, Firefox 121 and Safari
   15.4 or newer). On an older browser the label and the spot still work; only the glow and the
   overlay would not show. A fallback would need the layer inside the region, which changes the
   click target.

---

## 13. Known risks

- The glow is subtle over the photograph at 1440 wide: a drop shadow on a mostly opaque PNG shows
  along the lid's edges and not behind the whole machine. The two figures are the brief's and are
  `[TUNE]`.
- `:has()` support, above.
- The full day at x30 is measured in frames of thirty minutes; a frame that ends on a question
  runs short, so the day takes the sixteen frames of work, two of dinner and one per question,
  which the test allows for.
- The screenshot script is not in the repository, as in Turn 13.

---

## 14. Parked, carried forward

Everything in the brief's section 6: the laptop remembering its last page across opens (tonight
it opens on home every time); a shaped glow on the door, the boards, the binder and the catalogue
until the art lands (the lit door is wired, the rest are one line each in the same table);
everything parked by Turn 13. Added tonight: the dead `stockSheets` field the laptop view still
carries (REPORT-T13 section 10), and the sentence of question 3.
