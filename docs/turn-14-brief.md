# Turn 14: the laptop is a computer

Woodwork Empire. Autonomous session brief for Claude Code (Opus 5, effort ultracode, cloud).
Owner: Piotr. Programmer: Claude. Spec author: Claude (chat), 15.09.2026, from Piotr playing v19
and choosing mockup C out of six (Petros: software/woodwork-empire, STAN entries T14-A to T14-D).

Read this whole file (first line must say "Turn 14"; if the root `CLAUDE.md` does not, stop and
report), then `REPORT-T13.md` in full, then `docs/art/SPRITES.md` sections 8 and 11, then the
archived briefs in `docs/`. Where files disagree, this one wins. All standing rules apply (no em or
en dashes anywhere, scope 1:1, one code path, constants never in the UI, `[TUNE]` for every figure
you choose and `[PIOTR]` for his, kill background processes, PR without merge, end the session, no
PR watching, `npm run check` gated on its own exit code, every click single, one `APP_VERSION`
bump).

**Precondition.** `main` carries Turn 13 merged: `APP_VERSION` is `'v20'`, `MODAL_SKINS` exists in
`src/ui/modal.ts`, the laptop has the Admin group (Website, Insurance, Security, the Joinery Core
software line) and the top bar has the Settings gear. If `APP_VERSION` is not `'v20'`, stop and
report: this brief is written against the Turn 13 model. Where this brief names a Turn 13 thing by
the Turn 13 brief's name and `REPORT-T13.md` says it was built under another name, use the built
one and say so in the report.

This is a short turn on purpose: one evening of Piotr's notes after playing. Nothing in it is
deep. Do every piece exactly as written and nothing more.

---

## 0. What this turn is for (Piotr, 15.09)

Piotr opened the laptop in the office and got a paper folder. His words: "I am opening a computer,
so everything in it should be a computer." The laptop screen is the one place in the game that is
software and not paper, and it has to look like it. At the same time: the orange rectangles that
light up on the laptop and the door in the office "look awful" and go; the office door on the hall
opens the Team board instead of the office and that is wrong; and he wants a speed of x30.

Four changes, one sentence each:

1. The laptop screen is a computer: a home screen of tiles, a system font, a cool background, and
   no cream, no folder, no handwriting inside the screen.
2. Hovering a thing in the office lights the thing, not a rectangle around it, and names it.
3. The office door on the hall walks into the office.
4. Speed x30 next to 1, 2, 4 and 10.

Plus one check: a game started fresh in this build saves and loads (Petros T12-L).

---

## 1. Rules restated (short)

Everything from Turns 1 to 13. Tonight in addition:

- **`APP_VERSION = 'v21'`.** `STATE_VERSION` does **not** bump: nothing in this turn changes the
  shape of a save. If you find you need a new field on the state, stop that piece, write it in
  the report, and do the rest; do not bump.
- **Two worlds, one seam.** Outside the laptop screen the game is paper and steel (the folder
  skin, the board skin, Patrick Hand on titles). Inside the laptop screen it is software: the
  system font stack, a cool light background, flat tiles. The seam is the laptop's bezel. Nothing
  paper crosses it inward; nothing screen crosses it outward.
- **Hover is CSS.** The game writes no hover state and never did (CLAUDE.md T9 3.4, T11 3.5). The
  new glow and label are `:hover` rules and nothing else, so nothing can blink with the clock.
- **Order is the contract.** The three big tiles are Tasks, Stock, Drawings, in that order, left
  to right, with a gap between them. Not a different order, not four, not two.

---

## 2. Changes to the design (the contract)

### 2.1 The laptop screen, mockup C `[PIOTR]`

**The skin.** A third modal skin `screen` joins `folder` and `board` in `MODAL_SKINS`, and the
laptop is the only modal that uses it. The screen skin is: the modal is full page (`modal-full`,
the rule of T9 3.14 for every list and board); a dark bezel (`#1c1c1e` `[TUNE]`) with a rounded
top and a hinge strip at the bottom, drawn in CSS; inside it the screen, background
`#e9eee9` to `#dfe6df` `[TUNE]`, font `var(--font-ui)` (the system stack), colour `#222`.
`--font-title` (Patrick Hand) is not used anywhere inside `.laptop-screen`; a test computes the
font family of every heading inside the screen and asserts it is not the title font. The laptop's
boot of five minutes once a day (T7, chat fix 2) stays exactly as it is.

**The home screen.** When the laptop opens it shows **home**: the company name and the game's
date and time in one small line at the top (`Hale Joinery Ltd, Tuesday 14 March, 09:42`, from the
state, no new formatter), then **three big tiles** in one row with a gap of `TILE_GAP` 24 px
`[TUNE]` between them:

| Tile | Colour | Big line | Small line (live, from the state) |
|---|---|---|---|
| Tasks | the game's green | Tasks | `3 open, 1 due today` |
| Stock | `#2c6a86` `[TUNE]` | Stock | `46 sheets free, 2 low` with the low count in the game's red when above zero, `all stocked` when zero |
| Drawings | `#6d4c2f` `[TUNE]` | Drawings | `2 waiting for a list` (jobs accepted and without their material list yet, the Turn 13 estimator's queue), `nothing waiting` when zero |

Each tile has a flat line icon (inline SVG, white, from the mockup: a list, a rack, a drawing).
Under the three, a thin rule and a group headed **Office** of **small tiles** in one row: Team,
Website, Insurance, Security, Joinery Core, Settings. Each opens what it opens in Turn 13: Team
opens the Team modal; Website, Insurance and Security open those Admin pages; Joinery Core opens
the software line (the purchase of the estimator's software and its extensions, 3.8 of T13);
Settings opens the Settings modal. If Turn 13 built the Admin pages as tabs of one page, a small
tile opens that page on that tab.

The counts on the three tiles come from **one engine function** `laptopHome(state)` returning
`{ tasksOpen, tasksDueToday, sheetsFree, lowLines, drawingsWaiting }`; the UI prints them and
computes nothing. The function reads what the game already knows: the open tasks and their due
day, the stock page's free count and its low lines (T13 3.2), the jobs without a material list
(T13 3.8).

**Navigation.** A click on a big tile opens that page **full screen inside the laptop** with a
back arrow at the top left (`← Home`, the arrow is a glyph, not a dash) that returns to home. The
pages are the ones that exist today: the tasks list, the Turn 13 stock page, the drawings page.
They are not restyled tonight beyond inheriting the screen skin (the system font, the cool
background, no cream); their content and their controls are as Turn 13 left them. The tab bar the
laptop has today (`tabBar('laptopTab', ...)`) is **deleted**: the tiles are the navigation, there
is no second one. The laptop opens on home every time `[TUNE: no memory of the last page]`.

**Type.** `LaptopTab` becomes `LaptopPage = 'home' | 'tasks' | 'stock' | 'drawings'`, the UI
state field renamed with it, `'home'` the default. The `'team'` value and the route in `app.ts`
that opened the Team modal from the tab bar go: the Office tile does it.

**Tips.** Turn 13's first use bubble for the laptop (T13 3.22) fires on home; the pages behind the
tiles keep whatever bubbles Turn 13 gave them.

### 2.2 Hover in the office: light the thing, name it `[PIOTR]`

Today every office region is a transparent rectangle over the room photograph with a 2 px orange
outline on hover. That outline is **deleted** from `.office-region:hover` and
`.office-region:focus-visible` (keep the `outline: 2px solid transparent` base and a visible
focus ring for the keyboard: on `:focus-visible` only, a 2 px ring in the accent, because the
keyboard has nothing else). On mouse hover, two things and nothing else:

1. **The glow.** The laptop is its own PNG layer (`officeLaptop`, T4 3.1), so when the laptop
   region is hovered, that layer gets a soft glow in the shape of the laptop:
   `filter: drop-shadow(0 0 14px rgba(245,239,226,.75)) drop-shadow(0 0 30px rgba(224,115,30,.45))`
   `[TUNE]`. This is CSS only: the region and the layer are siblings or the layer is inside the
   region; pick the one that works with `:hover` or `:has()` and no JavaScript, and say which in
   the report. The door, the two wall boards, the binder and the catalogue are painted into
   layers they share with other things, so a shaped glow is not possible for them tonight; they
   get a **soft light spot**: a radial gradient ellipse fitted to the region
   (`radial-gradient(ellipse at center, rgba(245,239,226,.28), transparent 70%)` `[TUNE]`) on
   hover, no edge, no rectangle. An art request in section 8 asks GPT for a "door lit" overlay
   PNG; when `public/sprites/officeDoorLit.png` exists the door uses it the way the laptop uses
   its layer, through the same file check every sprite goes through, and the spot otherwise.
2. **The label.** A handwritten pill in the title font, dark green on cream
   (`background rgba(16,37,24,.85)`, `color var(--cream)`, rotated `-3deg`) `[TUNE]`, appears at
   the top right of the region on hover with the region's name: `Laptop`, `To the hall` (the
   door), `Work plan`, `Orders`, `Company board`, `Accounts`, `Catalogue`. The label text comes
   from the region table in `office.ts`, one place; every region has one, none is invented in
   CSS. The label is a child of the region rendered every time, hidden until `:hover`, so the
   60 tick stability test of `tests/ui/hallClock.test.ts` still finds every region node and its
   markup unchanged.

A test walks every office region and asserts: the label child exists with the table's text; the
stylesheet has no `outline-color` rule for `.office-region:hover`; and the laptop's glow rule
targets the laptop layer.

### 2.3 The office door on the hall walks into the office `[PIOTR]`

Turn 10 3.6 made the office door on the hall open the Team board, and REPORT-T10 named it as a
deviation ("the office door on the hall is the Team, next to it is the office"). Piotr reverses
it: a click on the door with `data-door="office"` does exactly what the top bar's Office button
does, through the same function, and nothing else. Team is reachable from the laptop's Office
tile (2.1) and from wherever else Turn 13 left it. The door's tooltip reads `To the office`. The
test that asserts the Team modal opens on the door is **flipped** to assert the office view
opens, not kept beside a new one (the four laws of deletion, Petros 30.08).

### 2.4 Speed x30 `[PIOTR]`

`SPEEDS` becomes `[0, 1, 2, 4, 10, 30]` and the `Speed` type joins `30`. The chip on the top bar
and the cadence control in the Menu both show it, off the one table, in the same style as x10.
`gameMinutesPerRealSecond(30)` is 30, so a working day of 480 minutes runs in 16 real seconds.
Everything that stops the clock (an event with a choice, the end of the day, dinner, the owner
out modal) stops it at x30 as it does at x10: the speed test of `tests/ui/speedTen.test.ts` is
extended to x30, and a new case runs a full day at x30 and asserts the day end summary comes up
once and the clock stops on it. Skip ahead stays at 4x (T8) and the machine move jump stays as it
is `[PIOTR: unchanged]`. The single click test (200 clicks with a render between every two) is
run once at x30 as well.

### 2.5 The save check (Petros T12-L)

A fresh game started in this build (new company, difficulty Easy, day 1) saves through the
browser store, the file and the cloud row, and loads back through Continue, Load from file and the
cloud, at day 1 and again after thirty minutes of play. A v20 save (make a fixture from a short
run on `main` before your first commit, `tests/fixtures/save-v20.woodwork.json`) loads too. If
any of these is red, fix it in this turn and name the cause in the report under its own heading
"T12-L"; if all are green, the report says so in one line.

---

## 3. State

No change to the shape of the state. `STATE_VERSION` stays. The laptop's page is UI state
(`ui.laptopPage`), not game state, as the tab was.

---

## 4. Task queue, in order

Branch `turn-14-the-laptop-is-a-computer` from `main`. One commit per task, `npm run check` green
on its own exit code before each, two report lines per task in `REPORT-T14.md`.

**T14-01 Housekeeping and v21.** `docs/turn-13-brief.md` from git history, byte for byte the
`CLAUDE.md` of the Turn 13 merge commit (the typo in its line 26 stays: archives are copies);
the README's briefs line; `APP_VERSION = 'v21'`; the v20 fixture of 2.5. Done: the version test.

**T14-02 Speed x30.** 2.4. Done: the tests.

**T14-03 The office door.** 2.3. Done: the flipped test.

**T14-04 The screen skin and the home screen.** 2.1: the `screen` skin, the laptop on it, the home
screen with `laptopHome(state)`, the three big tiles and the Office group, the tab bar deleted,
`LaptopPage`. Done: the tests (home first; the three tiles in order with the counts of a known
state; the low count red above zero and the words when zero; every Office tile opens its thing;
back returns to home; the laptop modal carries `modal-screen` and neither `modal-folder` nor
`modal-board`; no title font inside the screen; the `laptopTab` route and `tabBar` call gone).

**T14-05 The pages inherit the skin.** 2.1, the tasks, stock and drawings pages inside the screen
with the back arrow, content untouched. Done: the tests (each page opens from its tile, the back
arrow works, the Turn 13 stock page's controls still work inside the screen).

**T14-06 Hover in the office.** 2.2. Done: the tests.

**T14-07 The save check.** 2.5. Done: green, or fixed and named.

**T14-08 Report and PR.** `REPORT-T14.md` in the usual structure plus "Numbers chosen", "Deleted"
and "T12-L". Kill background processes, push, PR titled `Turn 14: the laptop is a computer`, do
not merge, end the session.

---

## 5. Do not (tonight)

1. No touching `docs/art/SPRITES.md`, `CLAUDE.md`, the archived briefs, the sprite files or the
   font file. Art requests go in `docs/art/REQUESTS-T14.md` only.
2. No `STATE_VERSION` bump. No new field on the game state.
3. No restyling of the tasks, stock or drawings pages beyond the screen skin. No new controls on
   them. No change to the Team modal, the Admin pages or the Settings modal.
4. No JavaScript hover state. No `mouseenter`, no `mouseover`, no class toggled by the pointer.
5. No second navigation inside the laptop: the tab bar goes, nothing replaces it but the tiles and
   the back arrow.
6. No change to Skip ahead, the move jump, or what stops the clock.
7. No storage access outside `src/cloud/store.ts`; no PixiJS, sound, mobile, Steam, Electron.
8. No watch loops, nothing left running.

---

## 6. Parked

1. The laptop remembering its last page across opens.
2. A shaped glow on the door, the boards, the binder and the catalogue: needs art (section 8).
3. Everything parked by Turn 13.

---

## 7. The cross check (before the PR)

- **Three skins, one each.** `MODAL_SKINS` has `folder`, `board` and `screen`; the laptop is the
  only `screen`; `tests/ui/modalSkins.test.ts` asserts a modal carries exactly one skin class.
- **One home function.** Every number on the home tiles comes from `laptopHome(state)`; grep the
  laptop UI for arithmetic on the state and there is none.
- **One door path.** The door's click and the Office button call the same function; grep for a
  second way into the office view and there is none.
- **One speed table.** The chips, the Menu control and `gameMinutesPerRealSecond` read `SPEEDS`;
  no `30` typed anywhere but the table.
- **Hover is CSS.** grep `src/ui` and `src/render` for `mouseenter`, `mouseover`, `hover` in
  TypeScript: nothing.
- **The look.** Open the office, hover the laptop and the door, open the laptop, click each of the
  nine tiles, go back: nine screenshots into the report folder. If the inside of the laptop has
  any cream, any folder, any handwriting, it is a bug.

---

## 8. Art requested (contents of `docs/art/REQUESTS-T14.md`)

For GPT, on `art/sprites`, PNG in `public/sprites/`, with alpha.

1. **`officeDoorLit.png`**: the office door alone, on the office room canvas (1672 by 941, the
   same frame as `officeBackground`), painted as if lit from inside, everything else transparent.
   The code lays it over the room on hover and nothing else changes.
2. The same for the two wall boards and the binder if cheap: `officeWorkPlanLit.png`,
   `officeOrdersLit.png`, `officeBinderLit.png`. Optional; the light spot covers them until then.

End of brief.