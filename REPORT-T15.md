# Report: Turn 15

The boards read like a ledger: one morning of Piotr's notes after playing v21, built in one
session, one agent, serial.

Branch `claude/amazing-pasteur-hue30s` (the cloud environment names the branch; the brief's task
queue would have called it `turn-15-the-boards-read-like-a-ledger`, which is the PR title's job, as
in Turns 13 and 14). Base: `286d62f` on `main`, the Turn 15 brief merged on top of the Turn 14 merge
`a5b725e`, with `APP_VERSION` `v21`, `STATE_VERSION` 14, `MODAL_SKINS` carrying `screen` and
`laptopHome(state)` in `src/engine/laptop.ts`, which is the brief's precondition. Eight commits on
top of it, one per task of section 4. 1,481 tests green and three todo in 148 files, up from
1,459 and three todo in 144 files at the end of Turn 14. `npm run check` green on its own exit code
before every commit.

`STATE_VERSION` stays at 14. Nothing in `src/engine` changed but the version line: the diff of
`src/engine` against the base is one insertion and one deletion, `APP_VERSION`. No field was added
to the state.

---

## 0. Blockers

None. Every piece of section 2 is built as written. Where the brief asks for something the game
cannot supply without an engine change or a new field (a client's name on a rating, a second line
under a hall line), section 4 says what was done instead and why.

---

## 1. Done

| Task | Commit | What went in | Proved by |
|---|---|---|---|
| T15-01 Housekeeping and v22 | `187eed7` | `docs/turn-14-brief.md` byte for byte the `CLAUDE.md` of the Turn 14 merge commit `a5b725e` (md5 `34ecec34`, the same as `git show a5b725e:CLAUDE.md`); the README's briefs and reports lines; `APP_VERSION = 'v22'`; the two assertions that spell the version (`version.test.ts`, `saveCheck.test.ts`). `docs/mockups/t15/` untouched. | `tests/ui/version.test.ts` |
| T15-02 The type scale | `709726a` | Nine tokens on `:root`: the six of the brief and three for the title hand; every one of the 84 `font-size` declarations in `styles.css` reading a token, mapped by the job of its selector (section 3); nothing below 12 px. | `tests/ui/typeScale.test.ts` (the six tokens at the brief's sizes; every token at or above 12 px; every `font-size` a `var(--fs-...)` of a token that exists; no pixel size in a `font` shorthand; no token nothing reads) |
| T15-03 Work Plan straight | `e5653fc` | `.plan-row` off the three tilt rules of the board family, which keep `.card`, `.row` and `.tile` for the Shopping board. Colours, axis, bars, ticks, deadline marks untouched. | `tests/ui/workPlanStraight.test.ts` (no rule on `.plan-row` carries a transform and none near it a rotate; the three tilt rules still name the card, the row and the tile; four rendered rows compute to no transform on the board while a shopping card still computes to a rotate) |
| T15-04 Tips at the bottom, with the mark | `1793d91` | One helper `withTip(body, state, key)` in `app.ts`, the one place `renderTip` is called, behind every screen with a bubble: the generic modal bubble, the board's contracts tab, the finance tab and the house card. The bubble is the last child of the body; an inline SVG disc in the accent orange with a white `!` in the title hand before the sentence; the `Right` button a pill on the right; inside the laptop the white panel of the software with the same disc. | `tests/ui/tipsLast.test.ts` (the disc, the sentence and the pill in that order; on the catalogue, the Work Plan and the order board the bubble is the last child of the body and not the first, in the flow, and `Right` dismisses it into the save; the same on the laptop's stock page on a white panel; `renderTip` called once in `app.ts`, inside the helper) |
| T15-05 Badges | `b596584` | `.badge` is a warning: the game's red, white bold text at the body token, `4px 10px`, radius 4, letter spacing 0.2 px. `Express` on its own class in the accent orange at the top right. `Not held` joins the red; `Held` on the insurance page wears `badge-held`, the green plate the website and security rungs wear. The badges that are not warnings keep their own class and the small plate they had: `badge-owned`, `badge-ordered`, `badge-class`, `badge-held`, and `Commercial` on a new `badge-kind`. `badge-warn` deleted. | `tests/ui/badges.test.ts` (on a card with both flags the two badges compute off the stylesheet to the red, white, weight 700 and the body token, with no border; `Express` computes to the accent and no red; `Commercial` to the old plate; every `class="badge ..."` the views write is one of the eight known; `badge-warn` gone; `Not held` red, `Held` green) |
| T15-06 The Company board | `01f727b` | Section 2.1 whole: the felt board in the oak frame drawn in CSS, full page; two cream sheets pinned straight; Reputation with the figure over a 2 px rule, `Who said what · points`, every rating newest first with its day under it and its points in the colour of its sign, the weeks labelled, `Start of the week · carried over` as the last row of this week, the balance at the bottom; Output with the figure, `Base 1.00` dim, the hall's lines, the Excel line off `plus`, `minus` and `total` of the breakdown, a second rule, `Act where they are, not in the number above` and every `hall: false` line with its `where`; the cream disc cross on the corner of the frame that works (section 6); the board moved on the wall in one `COMPANY_BOARD_BOX`, measured on the picture. | `tests/ui/companyBoard.test.ts` (the box and its centre off the two measurements; the region's style off the box; the wall's totals off the same box; the modal full page on `modal-felt` and `modal-board` with no picture in the CSS and the picture still on the wall; the cross's disc, the head above the body, a bubbling click shuts the board; exactly two sheets, no column, no paragraph, straight by rule and by computed transform; the week line; the fold newest first with plus, minus and total; the figure equal to the state's; every rating with its day, points and colour; the carry over and the balance; the empty case; the hall lines, base first and dim, the Excel line off the breakdown; every line under the second rule with its `where`; the output part of `company.ts` doing no arithmetic), `tests/render/officeRoom.test.ts` (the region table off the box) |
| T15-07 The laptop | `f017d21` | A red round count in the corner of each big tile off `laptopHome`, no element at zero; the six line icons of mockup C on the Office tiles; `LaptopPage` gains `'team'`; the Team a page of the laptop behind `← Home`, the four tabs the screen's segmented control, the draw chips the screen's buttons, the hire cards white panels with `Hire` in the game's green; the team modal deleted; one `openLaptopPage(page)` behind the tiles, the back arrow, the Joinery Core tile onto the Technical tab and the order board's `Open the team`; a page header with the back arrow first on every page but home. | `tests/ui/laptopTeam.test.ts` (the counts as elements on Tasks and Drawings with a known state and none on Stock at zero, then the other way round; the six icons in the green above the label; the Team inside the screen from its tile with the segments, from the Joinery Core tile on the Technical tab, and from the order board's link; the draw, the holiday, the second shift line and a hire through the page; no skin, no size, no route, no opener for a team modal; the back arrow first in the header of every page and home on the click), `tests/ui/laptopHome.test.ts`, `tests/ui/laptopPages.test.ts`, `tests/ui/officeRegions.test.ts`, `tests/ui/team.test.ts` (flipped, section 4) |
| T15-08 Look, fix, shoot | `96015d2` | Every screen looked at on the type scale at 1280 wide; two boxes fixed (section 7); the twelve pictures in `docs/report-t15/`. | the pictures, `npm run check` green |
| T15-09 Report and PR | this commit | This file, the PR. | |

---

## 2. Numbers chosen

Every figure this turn chose, with its `[TUNE]` tag where it lives. The engine got no figure at
all. Everything below is in `src/ui/styles.css` unless it says otherwise.

### The type scale (T15 2.5)

| Token | Value | Note |
|---|---|---|
| `--fs-tiny` | 12 px | the brief's, the floor |
| `--fs-small` | 13 px | the brief's |
| `--fs-body` | 15 px | the brief's |
| `--fs-lead` | 18 px | the brief's |
| `--fs-title` | 26 px | the brief's |
| `--fs-display` | 34 px | the brief's |
| `--fs-hand-small`, `--fs-hand`, `--fs-hand-big` | 20, 26, 30 px | mine: the three sizes the title hand had (a card name or a date, the cash figure or a label pill, the head of a modal), as tokens |

### Tips (T15 2.2)

| Number | Value | Note |
|---|---|---|
| the mark | 34 px, `var(--accent)`, the glyph at `--fs-title` in a 34 unit box | the disc is the brief's; the glyph size mine |
| the bubble | margin `16px 0 0`, padding `10px 14px`, radius 6 px, gap 12 px | mine |
| the pill | radius 999 px, padding `4px 14px` | mine |
| on the screen | white, a `#d5dcd5` edge, radius 12 px | mine, off the mockup |

### Badges (T15 2.2)

| Number | Value | Note |
|---|---|---|
| a warning | `var(--bad)`, white, weight 700, `--fs-body`, padding `4px 10px`, radius 4 px, letter spacing 0.2 px | the brief's, kept as written |
| Express | `var(--accent)` | the brief's |
| the plates that are not warnings | `--fs-tiny`, padding `1px 5px`, radius 2 px, weight 400 | the metrics they had |

### The Company board (T15 2.1)

| Number | Value | Note |
|---|---|---|
| the frame | `#b9793a` to `#8a5424`, 16 px, radius 6 px, shadow `0 14px 34px` | mine, off the mockup |
| the felt | radial `#1f4a36` to `#173a2a` | mine, off the mockup |
| a sheet | `#f7f1e4`, ink `#2b2a26`, dim `#6f6a60`, lines `#d9d2c2`, green `#1f5a3a`, padding `16px 18px 14px`, shadow `0 6px 14px` | mine, off the mockup |
| the gap between the sheets | 26 px | mine, off the mockup |
| a pin | 16 px, blue radial (`#7fb3ff`, `#1e4f9a`), 9 px above the sheet | mine, off the mockup |
| the total line | a 2 px rule, the figure at `--fs-display` in the sheet's green, the words at `--fs-body` dim | the brief's |
| the column head and the week label | `--fs-tiny`, uppercase, 0.6 px spacing | mine |
| the balance | `--fs-small`, dim, the total bold in ink, gap 14 px | mine |
| the cross | `CLOSE_DISC` 54 px, a 3 px border in the frame's dark oak, the glyph at `--fs-display` (34 px) in the title hand, at minus 27 px from the top and the right | the brief's; the offset mine |
| `COMPANY_BOARD_BOX` | `x 1002, y 168, width 180, height 180` | `src/render/office.ts`; the brief's `x 1005` moved 3 px after the measurement (section 4) |
| the wall's totals box | `x 1037, y 241, width 110, height 72`, 12 px at scale 1 | `src/render/office.ts`, derived from the box and the sheet's fractions; 18 px on the 280 board became 11.6 |

### The laptop (T15 2.3)

| Number | Value | Note |
|---|---|---|
| `TILE_COUNT` | 34 px tall, at least 34 wide, `var(--bad)`, white, weight 800 at `--fs-lead`, a 2 px white ring at 0.85, shadow `0 3px 8px`, 12 px in from the top right | the brief's; the corner offset and the weight mine, off the mockup |
| the Office icons | 30 px, `--screen-green` `#1f5a3a`, above the label, 8 px gap | the brief's; the green mine |
| the page header | gap 14 px, 12 px under; the title at `--fs-lead` weight 600 | mine, off the mockup |
| the back button | white, a `#cfd6cf` edge, radius 8 px, padding `6px 12px`, the green | mine, off the mockup |
| the segmented control | white, a `#cfd6cf` edge, radius 10 px, padding 4 px, segments radius 7 px at `7px 16px`, the one on in the green | mine, off the mockup |
| the draw and shift chips | `#eef2ee` with a `#cfd6cf` edge, radius 8 px, `7px 14px`, the one on in the green | mine, off the mockup |
| the Hire button | the green, hover `#2f6b48` | the brief's green; the hover mine |

---

## 3. Type scale mapping

What every hand typed size in `styles.css` became, by the job of its selector, at T15-02. 84
declarations in, 84 out, none left in pixels. The count is the number of declarations at that
size.

| Old size | Token | Count | Where |
|---|---|---|---|
| 7 px | tiny | 1 | the SVG lettering on a drawn pallet |
| 10 px | tiny | 5 | the Work Plan's Now label, the deadline and latest start ticks, the late note, the rate (the one exception the brief allows) |
| 11 px | tiny | 11 | the hall's iso labels, `small`, the speed knobs, the sprite check figures, a job's five steps, `.badge` (body from T15-05), the plan figures, the version in the corner, the air valve chips, the month head, the efficiency plate's hint |
| 12 px | small | 16 | figure and ghost labels, the net under the cash, the top bar's reason, the day meter's two lines, the legend rows, the output figure, a field label, a missing sprite, `.done`, a waiting tile, the felt's shares, a stock number, the efficiency summary and its lines |
| 12 px | body | 9 | the note under the hall, a chip, a card's figures, a card's text, `.figures`, a lock line, `.hint` and `.empty`, a row's figure, a reason |
| 13 px | body | 9 | the toast, the owner out line, `h3`, the why note, a sprite key, the warning strip, the tip bubble, the laptop's status line and its Office heading |
| 14 px | body | 4 | `body`, a tile's small line, a small tile, the back arrow |
| 14 px | lead | 1 | `.card h3` |
| 15 px | lead | 3 | `h2`, the big start button, an `h3` on the screen |
| 15 px | hand-small | 1 | the catalogue's pencil notes |
| 16 px | hand-small | 1 | the top bar's push buttons |
| 16 px | lead | 1 | the clear cross of a filter field |
| 17 px | lead | 1 | `.tile-name` (its title hand rule sets it again at hand-small) |
| 18 px | lead | 4 | the modal cross, the menu cross, the gear, the screen's head |
| 20 px | hand-small | 3 | the top bar's date, the felt modal's head, a tile name and a card's heading |
| 22 px | title | 1 | `h1` on the start screen |
| 22 px | hand | 3 | the folder's head, the day plate's heading, the felt's week line |
| 24 px | title | 1 | the price on a tile |
| 26 px | hand | 2 | the cash, the office label pill |
| 26 px | title | 1 | the drawn company board's lettering |
| 28 px | title | 3 | a drawn office layer, the drawn floor catalogue, the big line of a tile |
| 30 px | hand-big | 2 | the felt's company name, the modal head |
| 34 px | display | 1 | `.felt-total`, deleted at T15-06 |

After T15-02 the stylesheet gained rules that read the tokens directly (the ledger, the count
badge, the page header, the Team's segments): 94 `font-size` declarations at the end of the turn,
every one a token, held by `tests/ui/typeScale.test.ts`.

---

## 4. Deleted

The four laws of deletion (Petros 30.08): every one of these is gone, not hidden, and no shim,
compatibility layer or dead export was left.

- The `.plan-row:not(.plan-scale-row)` selector on the three tilt rules of `.modal-board`.
- `.badge-warn`; the `bad` colour class on the Low stock badge (it painted red on red once the
  plate went red); the `.modal-screen .badge` and `.modal-screen .badge-low` rules, which the red
  base makes redundant; `badge good` on the insurance page's Held.
- The separate team modal, whole: the `'team'` member of `ModalId`, its `MODAL_TITLES` line, its
  `MODAL_IS_FULL` line, its `TIP_KEY_OF_MODAL` line, the `case 'team'` of `modalBody`, its
  `MODAL_SKINS` line, the `openModal('team')` in the `teamTab` handler, the `renderTeam` import in
  `app.ts`, the `data-modal="team"` opener on the order board and the `openModal` action on the
  Team tile.
- The company board's three columns and two paragraphs: the `.board-columns`, `.board-column`,
  `.board-week` and `.board-line` rules and their 900 px media query; `.felt-weeks`, `.felt-sheet`,
  `.felt-totals`, `.felt-total`, `.felt-shares` and the felt head's fixed percentages; the picture
  `officeCompanyBoard.png` as the modal's background (it stays on the wall); `weekHtml`; the
  `Reputation started at` hint and the `never counted twice` paragraph; the `companyTotals` and
  `REPUTATION_START` imports of `company.ts`.
- The four `renderTip` prepends in `app.ts`, replaced by the one helper.
- `.menu-pop { position: relative }` from T13-C1, which had put the Menu popover into the page
  flow at full width (section 7).
- In the tests: `tests/ui/companyFelt.test.ts` folded into `companyBoard.test.ts` (its totals,
  week line, shares and day counted once cases carried; its felt total, pinned sheet and picture
  cases flipped, not kept beside); the `MODAL_IS_FULL.team` assertion of `team.test.ts` flipped to
  `laptopPageFrom('team')`; the Team cases of `laptopHome.test.ts`, `officeRegions.test.ts`,
  `app.test.ts` and `boardLively.test.ts` flipped to the page; the `MODAL_IS_FULL` table of
  `modalSize.test.ts` without `team`; the `bad` assertion of `materials.test.ts` flipped; the
  `font-size: 34px` assertion of the felt test flipped to the token before it was folded.

---

## 5. Deviations from the contract

1. **Branch name.** The environment names the branch `claude/amazing-pasteur-hue30s`; the brief's
   `turn-15-the-boards-read-like-a-ledger` is the PR title's job, as in Turns 13 and 14.
2. **The modal draws its own board.** 2.1 says the felt board in the oak frame stays, and it
   does, but drawn in CSS as the mockup draws it, not as the picture. The picture is 1254 square
   with one cream sheet painted across its middle and two green pins on it; two sheets side by
   side cannot sit on it without the painted sheet showing between them, and stretching a square
   picture across the full page width would bend the frame. The picture stays on the office wall,
   where it is the board. The `modal-felt` class and `FELT_MODALS` stay; what they mean is the
   CSS felt.
3. **The cross's glyph.** The brief says a `✕` glyph; the cross is the one `CROSS` button every
   modal gets from `fillModal`, whose glyph is `×`, so that is what the disc shows in the title
   hand. The disc, the border, the size and the place are the brief's, and it is the same
   `data-do` as every other close.
4. **The second line of a rating is the day alone.** 2.1 wants `day 8, Mr Cole`, the client's
   name if the job has one, the job's id line otherwise. A rating on the log is `day`, `reason`
   and `points` (`types.ts`, `ReputationEntry`) and a job carries no client's name; no field could
   be added tonight (rule 1). The reason already names the job, so the second line is `day 8`.
5. **No second line under a hall line.** 2.1 wants one where the tips and warnings tables have
   matching wording. Neither table has a sentence for a hall line: `sweep it, or hire a helper`
   and `bags fine` exist in the mockup and nowhere in the game. No sentence was invented, so the
   hall lines carry none; the `hall: false` lines carry their `where`.
6. **The balance and the carry over.** 2.1 wants `+9  -3  = 6`, the three figures of this week.
   Read like Excel, with the carry over as a row of this week, the pluses take the carry when it
   is positive (the minuses when it is not) and the total is the reputation at the top, so the
   rows add up to the figure over the rule. The carry over is the reputation now less what this
   week's rows did to it; while a level 4 or 5 website is held its standing is inside the carry.
7. **The one fold.** Section 7 asks for no arithmetic on points in `company.ts`. A sheet that has
   to print a week's pluses, minuses and its carry over needs them added up somewhere, and the
   engine could not change tonight, so the fold Turn 9 put in `company.ts` (`weeksOf`) does it,
   with `plus` and `minus` added to the week. The Output sheet computes nothing: every figure is a
   field of the breakdown, asserted by the test.
8. **The modal's own title is off the page on the felt board.** The board's title is the company
   name on the felt, as the mockup has it; the `h2` of the head is kept for a reader that cannot
   see, clipped to a pixel.
9. **The pins are blue.** The picture's pins are green; the mockup's are blue, and the text is
   silent, so the mockup decides.
10. **A page header.** 2.3 puts `← Home` "in the same place as on every other page" and the test
    asks for "the first child of the page header". Every page but home now has a header with the
    back arrow first and the page's name beside it, off the two tile tables; the content after it
    is its renderer's byte for byte, as `laptopPages.test.ts` still asserts.
11. **The Team's green.** The screen's accent is blue (T14); the mockup draws the Team's segments,
    chips and Hire in the game's green, so they are, on `--screen-green`. The other pages' chips
    stay on the accent.
12. **The laptop's bubble** is the last child of the modal body, after the page container, through
    the one helper; the container has no box of its own, so it reads as the last thing on the
    page.
13. **Insurance's Held** wears `badge-held`, the green plate the website and security rungs wear,
    instead of `badge good` (green text on the old grey plate): one look for Held.
14. **The wall's totals lettering** went from 18 to 12 px at scale 1 with the board from 280 to
    180 square, so it is small on the wall; the modal is where it is read.
15. **Twelve pictures.** 2.5 names "every modal, the top bar, the day end summary, the event modal,
    the machine card, the catalogue, the shopping board, the work plan, the laptop home and its
    pages": the twelve are the office with the top bar and the board on the wall, the order board,
    the Work Plan, the catalogue, a machine card, the shopping board, the accounting, the company
    board, the laptop's home, its Team page, the day end summary and an event modal.

---

## 6. Why the cross did not close

Reproduced first in Chromium against the v21 build, before any change: the company board open, a
real click at the centre of the cross, and the board stayed open. `document.elementFromPoint` at
that point answered `div.felt`, not the button.

The cause is the felt modal's own layout of Turn 11. On `.modal-felt` the head (`position:
absolute; top: 0`) and the body (`position: absolute; inset: 0`) are both taken out of the flow
with `z-index: auto`, and the body comes after the head in the DOM. Two positioned boxes with no
stacking order paint in DOM order, so the body, which fills the whole modal, painted over the head,
and the felt inside it took every click aimed at the cross. The `closeModal` handler was never
reached. Nothing was wrong with the handler, the skin table or the button: the jsdom tests dispatch
the click on the button itself, which has no hit testing, so they never saw it.

The fix is at that root: the head now stacks above the body (`z-index: 2`, the drag handle on the
frame's top bar) and the body is a flex child of the frame instead of an absolute box covering it.
No second handler, no listener on the felt. `tests/ui/companyBoard.test.ts` asserts the stacking
rule and shuts the board with a click that bubbles from the button; the same Chromium script on the
v22 build closes the board on a real click at the cross's centre.

---

## 7. Cross check (section 7)

- **Two sheets.** The company body has exactly two `.sheet` children, `reputation` and `output`,
  and no `.col`, no `.board-column`, no third block and no paragraph (`companyBoard.test.ts`
  "are exactly two, straight").
- **The number is the engine's.** `grep company.ts` for arithmetic on points finds the one fold,
  `weeksOf`, which adds a week's pluses, minuses and total, and the carry over off it (deviation
  7). The Output sheet has none: every figure is `breakdown.base`, a line's `points`,
  `breakdown.plus`, `breakdown.minus` or `breakdown.total`, asserted on the text of the file.
- **One close.** The cross is the one `CROSS` of `modal.ts` with `data-do="closeModal"`, the same
  on every modal; `companyBoard.test.ts` shuts the board with a real bubbling click, and the
  Chromium script confirms it on the build.
- **One home function.** Every count on the tiles is a field of `laptopHome(state)`: the red
  corners read `tasksOpen`, `lowLines` and `drawingsWaiting` off the `count` field of
  `HOME_TILES`, the lines read the rest. `grep src/ui/laptop.ts` for arithmetic on the state finds
  only the tasks page's filter Turn 13 left it.
- **Team once.** `grep -rn "'team'" src/ui` shows six hits: the `LaptopPage` value, its entry in
  `PAGES`, the Team tile's `data-id`, the `case 'team'` of the page body, the
  `openLaptopPage('team')` of the `teamTab` handler and the order board's `blockWhere === 'team'`
  branch onto the page. No `ModalSpec`, no skin, no route; `laptopTeam.test.ts` greps `src/ui` for
  `openModal('team')` and `data-modal="team"` and finds none.
- **Back everywhere.** `laptopTeam.test.ts` opens every `LaptopPage` but home and asserts the back
  control is the first child of the page header, with the same class and the same `data-do` and
  `data-id`, and that the click lands on home: green for all seven.
- **Tips last.** `renderTip` is called in one place in `app.ts`, inside `withTip`, which puts the
  bubble after the body; the generic modal bubble, the contracts tab, the finance tab and the house
  card all go through it (`tipsLast.test.ts` counts the call and the helper's uses).
- **Type scale.** `typeScale.test.ts` green; the mapping table is section 3.
- **Straight.** No rule in `styles.css` transforms `.plan-row` or `.sheet` (`workPlanStraight.test.ts`,
  `companyBoard.test.ts`, both by rule and by computed transform).
- **The look.** The twelve pictures are in `docs/report-t15/`, 1280 by 800 off `npm run build`
  served from `dist/`, with the v20 fixture in the browser's store (four ratings added to it so the
  ledger has rows) and Continue pressed. In `01-office-and-top-bar.jpg` the company board hangs
  centred on the free wall between the door frame and the corner, under the clock, square. Looked
  at on the scale at 1280: nothing overflows its box and no button loses its label; the order
  board's card lines and the catalogue's tab row wrap to two lines where they were one, which is
  the box wrapping as it should. Two things broke and were fixed in the box, not the size: the Low
  stock badge on the stock page showed no words (its old `bad` colour class painted red on the red
  plate; the class went), and the Menu popover stood in the page flow at full width pushing the
  room down (a `position: relative` rule from T13-C1 had undone the popover's `position: absolute`;
  the rule went). The second is in the Turn 13 pictures too, so it was not the scale's, but it was
  broken on the screen the look pass was for.

---

## 8. Tests

1,481 tests green and three todo in 148 files, up from 1,459 and three todo in 144 files at the
end of Turn 14: 1,459 after T15-01, 1,463 in 145 files after T15-02, 1,466 in 146 after T15-03,
1,470 in 147 after T15-04, 1,474 in 148 after T15-05, 1,474 in 147 after T15-06 (the felt test
folded in), 1,481 in 148 after T15-07 and T15-08. The three todo entries are Turn 12's thicknesser
month and the two expectations of Turn 13's playthrough. Five test files were added
(`tests/ui/typeScale.test.ts`, `tests/ui/workPlanStraight.test.ts`, `tests/ui/tipsLast.test.ts`,
`tests/ui/badges.test.ts`, `tests/ui/laptopTeam.test.ts`), one deleted
(`tests/ui/companyFelt.test.ts`). `npm run check` is lint, the sprite manifest, `tsc` and the
build, then the suite; it ran green on its own exit code before every one of the eight commits.

Four tests compute what a browser would, with the stylesheet on the page: the badge test reads the
computed background, colour, weight and size of a badge (the colours are written as `background-color`
longhands because jsdom drops a `background` shorthand that holds a `var()`); the straight rows
test reads the computed transform of a Work Plan row and a shopping card; the board test reads the
computed transform of a sheet and the computed stacking of the head; the tips test reads the
computed position and background of the bubble.

Run it: `npm run check`. The pictures were taken with the global `playwright` against `npm run
build` served from `dist/`; the script is not in the repository, as in Turns 13 and 14. Neither is
the one off script that read the pixel columns of `officeBackground.png` for the board's box.

---

## 9. How to run

`npm ci`, `npm run dev`, `npm test`, `npm run check`. The README's first ten minutes still hold;
from this turn the Team is behind the laptop's Team tile, inside the screen.

---

## 10. Duplicate paths

- Onto a page of the laptop: one (`openLaptopPage`; the tiles, the back arrow, the Joinery Core
  tile and the order board's link are the same click).
- A screen's bubble: one (`withTip`).
- The counts on the tiles: one (`laptopHome`).
- A modal's close: one (`CROSS`).
- The company board's box on the wall: one (`COMPANY_BOARD_BOX`, the totals box derived from it).
- A size of type: one table (the tokens on `:root`).
- Into the office view, a speed, a modal's skin, the pointer in the office: as Turn 14 left them.

---

## 11. Line balance

| Task | Files | Added | Removed |
|---|---|---|---|
| T15-01 | 5 | 283 | 6 |
| T15-02 | 3 | 187 | 85 |
| T15-03 | 2 | 97 | 4 |
| T15-04 | 4 | 219 | 27 |
| T15-05 | 4 | 199 | 27 |
| T15-06 | 7 | 743 | 410 |
| T15-07 | 21 | 625 | 111 |
| T15-08 | 16 | 6 | 7 |
| T15-09 | this file | | |

T15-01's 283 are the archived Turn 14 brief; T15-06's are the board rewritten, the ledger in the
stylesheet and the board test; T15-07's are the laptop, the Team's skin and a new test file, with
fourteen test files touched for the `teamTab` field of the laptop view and the page.

---

## 12. Open questions for Piotr

1. **The Commercial badge.** The brief says a badge that is not a warning keeps the look it had,
   so `Commercial` is still the dark grey plate on the cream card, the very box you could not read.
   One line makes it the red, or a cream plate with a green edge.
2. **A second line under a hall line.** `Hall dirty: sweep it, or hire a helper` wants a table of
   one sentence per hall line. It is not in the game; it is a small engine table when you want it.
3. **The client's name on a rating.** `day 8, Mr Cole` wants a name on the job and on the log,
   which is a field on the state and a `STATE_VERSION` bump. Tonight the line is the day.
4. **The wall's totals.** 12 px at scale 1 on the 180 board: readable on the wall at 1440, small at
   1280. A wider sheet fraction or a bigger token is one figure in `OFFICE_TEXTS`.
5. **The company name on the whiteboard** reads `Woodwork Empir` at 1280 and 1440: the box the art
   leaves for it is 170 px and the renderer cuts what it cannot shrink to fit. It is in the Turn 14
   pictures too. A wider box in `OFFICE_TEXTS.company` or a smaller floor than 12 px.
6. **The pins.** Blue as the mockup; the picture on the wall has green ones.
7. **The felt modal without the picture.** The board on the wall is GPT's picture and the modal is
   CSS. If you want the picture on the modal too, it needs a second picture with no sheet on it,
   or a wide one.

---

## 13. Known risks

- The carry over includes the website's standing while a level 4 or 5 site is held, so the row
  moves when the site is bought or lapses (deviation 6).
- The stacking fix for the cross relies on the head's `z-index` over the body; anything that gives
  the body a stacking context above 2 would cover the cross again. The test reads the rule.
- The Team page remembers its tab across opens (`ui.teamTab`, as the modal did); the laptop still
  opens on home every time.
- The screenshot script and the pixel script are not in the repository, as in Turns 13 and 14.

---

## 14. Parked, carried forward

Everything in the brief's section 6: whether machines and men should enter the Output number at
all (Piotr, 16.09: "to think about"; Petros "WAZNE DO PRZEGADANIA"); the Shopping board's tilt;
everything parked by Turns 13 and 14. Added tonight: the client's name on a rating (question 3),
the hall lines' second lines (question 2), and the laptop remembering its last page across opens,
still parked from Turn 14.
