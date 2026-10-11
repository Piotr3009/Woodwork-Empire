# Report, Turn 30: the line bought whole, its windows contract, its upgrades and its moving pictures

Woodwork Empire, Turn 30. Built against `CLAUDE.md` of 11.10.2026 (first line "Turn 30").

- **Branch:** `claude/adoring-johnson-xgldp2`, off `2c6032c`, the tree `main` stands on (v88,
  STATE_VERSION 42). The brief names `turn-30-line-whole`; the session was given this branch to
  develop and push on, and every task went to it.
- **Versions:** `APP_VERSION` v88 to v89, `STATE_VERSION` 42 to 43, once each (A1 and C1).
  `OLDEST_SAVE_VERSION` stays 12.
- **How it was run:** one writer, serial, no worktrees, one commit a task, the branch pushed after
  each. `npm run check` was green on its own exit code before every commit.
- **Tests at the end:** 2,847 in 297 files, none skipped (2,771 in 290 at A0).
- **Sub-agents:** they built the mockups, measured the sanders' ports, reviewed each task's diff,
  cross checked section 7 and wrote the notes and the art requests. None of them edited `src/` or
  `tests/`, committed, or ran the suite.

## 0. What Piotr should read first

**Not reached: nothing.** Every task of section 5, T30-A0 to T30-E5, is done in the brief's order,
one commit each. The line is bought whole, stands, moves as one, speeds the window jobs, runs its
own contract with the pallet and the gate, takes its four upgrades and plays its pictures.

**Red: nothing.** The last full check passed on its own exit code: lint, the build, and 2,847 tests
in 297 files. No `.skip`, `.only`, `.todo`, `xit` or `xdescribe` anywhere in the tree. A0 found one
red on v88 (two comments of v87 said `hover`, which a test forbids), mended in A0.
`tests/ui/app.test.ts`, the real time test, passed in every check; no sub-agent ran the suite.

**The money of the line, from the built game.** Played whole days through one calendar month (30
days, 22 of them working days) in the 800 m² unit, with the line's contract running from the 1st,
two engineers on the books and the upgrades fitted cheapest first:

| A window every | Upgrades fitted | Windows | In | Timber and glass | Engineers | Power | A month | Months to pay back | With the property cover held |
|---|---|---|---|---|---|---|---|---|---|
| 120 min | none | 88 | 132,000 | 52,800 | 30,000 | 10,800 | 38,400 | 260 (21.7 years) for 10,000,000 | 5,067 a month: 1,974 (164 years) |
| 105 min | Line software | 100 | 150,000 | 60,000 | 30,000 | 10,800 | 49,200 | 209 (17.4 years) for 10,300,000 | 15,867: 649 |
| 90 min | and Diamond tooling | 117 | 175,500 | 70,200 | 30,000 | 10,800 | 64,500 | 166 (13.8 years) for 10,700,000 | 31,167: 343 |
| 75 min | and Servo press | 140 | 210,000 | 84,000 | 30,000 | 10,800 | 85,200 | 131 (11.0 years) for 11,200,000 | 51,867: 216 |
| 60 min | all four | 176 | 264,000 | 105,600 | 30,000 | 10,800 | 117,600 | 100 (8.4 years) for 11,800,000 | 84,267: 140 (11.7 years) |

- The engineers are 15,000 each, the power 360 a day for the six on every calendar day, and the
  property cover on the line, if the company holds it, 33,333 a month (2 per cent a year of
  10,000,000, twice in that unit). The upgrades are not insured.
- The month played had 22 working days, so it has a little more than chat's month of 21.43 (88
  windows against 85.7 at 120 minutes). The windows carry their minutes over from one day to the
  next, so 105 minutes is 100 windows and not a whole number a day.
- At Piotr's figures the line pays back slowly: about 22 years with no upgrade and about 8 with
  all four, and the property cover, held, eats almost the whole month at 120 minutes. The knobs are
  constants (section 8): `LINE_WINDOW_PRICE`, `LINE_WINDOW_MINUTES`, `LINE_MODULE_SHARES`, and the
  second shift, which the line does not work tonight.

**What chat decided and you have not confirmed (section 10), with what was built:**

1. **The shares of the 10 million.** 2, 2.5, 1.25, 1.25, 1.5 and 1.5 million, `LINE_PRICE` written
   as their sum; the order is one ledger line, `Window production line ordered`.
2. **The catalogue.** The `Production line` tab has one folder, module 1's, `from £10,000,000`.
   Opened, it holds the line's one card and the four upgrade cards under it. Modules 2 to 6 have
   no folder; each keeps its Owned tile.
3. **The place, the move, the turn.** Ordered at the first clear 36 m by 3 m from x 2, y 14,
   then cell by cell, refused `No free 36 m by 3 m in the hall`. Moved as one in setup mode, refused
   `The line needs a clear 36 m by 3 m`; a turn refused `The line is never turned`. The move card
   reads `Moving 6 machines takes 6 h`, and Put them back puts the six back.
4. **Sold whole for half.** Every module's tile reads `Sell the line for £5,000,000` and then
   `Confirm sale`; the six go on one van the next working morning, one line (`Sold: Window
   production line`) and one card (`Window production line collected`); the upgrades go with it for
   nothing and a running contract ends that day.
5. **Without the contract.** Modules 5 and 6 do the Finishing and the Glazing (`assembly`) of a
   window; `LINE_FACTOR` tops at 2.4 and acts on the Finishing while module 5 does it; 33 places a
   module; 18 per cent of the boards saved; the lacquer's night kept; the spray booth still asked
   for every window (a window is not takeable without one).
6. **The contract.** A record of its own (`state.windowLine.contract`), not one of the three, drawing
   nothing off the seeded stream; offered by the `Windows off the line` card at the first working
   open once the six stand and two engineers are on the books; again a week after `Not now` or `End
   it`; no client's name, no week to meet, no term, no short week.
7. **The windows.** One every `lineWindowMinutes`, only with two engineers on duty, by day in the
   men's working minutes (not the dinner hour, not after five, not on the second shift, not while
   the line is being moved); the hall's crowding does not slow it and it books nothing to any man
   or machine.
8. **The money of a window.** £1,500 in on the contract line and £600 out on the material line,
   each one growing line a day; the material is paid past the overdraft floor.
9. **The pallet.** The tenth window sends it to the gate, drawn as one box a pallet (two at the
   most) at x 0 to 1, y 10 with `Windows for collection: 1 pallet`; the client takes it at the next
   working open, with no ledger line; a part pallet goes to the gate when the contract ends.
10. **The four upgrades.** Diamond tooling 400,000, Line software 300,000, Servo press 500,000,
    Second spraying robot 600,000; 15 minutes each off the contract's window, so 105, 90, 75 and
    60; fitted 10 working days after the order; not kit, not insured, not drawn.
11. **The money.** Chat's arithmetic gave about 36,300 a month at 120 minutes and about 113,500 at
    60. The built game gives 38,400 and 117,600 for its month of 22 working days (the table above).
12. **The sheets.** A module plays its sheet only while the clock runs, and then all six in the
    contract's window minutes, or without the contract a module a man is drawn at; 6 frames a
    second of real time at any speed, in step; held the moment the clock stops; `stack10` is on disk
    and not drawn.
13. **The lift.** Turn 29's modules taken back at what they cost, on one ledger line, `Production
    line refunded: it is sold whole now`, with the `The production line is sold whole` card; a
    module already sold is left for its van, which pays its own half.

**The choices this session made beyond the brief, each marked [TUNE] in the code:**
- Two engineers "on the books" for the offer are two hired and started, in today or not; the
  windows themselves ask two on duty.
- An offer taken runs only while the line still stands whole at the click; otherwise it is as `Not
  now`.
- `End it` drops the minutes of the window in hand; the part pallet goes to the gate.
- The week's count on the running block starts again at the first working open of a calendar week.
- The instant purchase the tests use books `Window production line`; the order books `Window
  production line ordered`. Both once, for `LINE_PRICE`.
- The line's card sentence (`LINE_DESCRIPTION`) is Claude's reading of the six pictures; the module
  sentences are the brief's.
- The line's card reads the window's minutes off the upgrades fitted: with one fitted it says `one
  every 1 h 45 min`.
- No code reads the manifest by pattern, so the two new kinds of file (the work sheet and the stack
  overlay) needed no teaching under `src/`; the two tests that count pictures by name
  (`rotate.test.ts`, `spriteClasses.test.ts`) now say a sheet and an overlay are neither.

**Seen in the pictures, and what it means:**
- **The modules meet end to end** (picture 11): module 1's outfeed runs into module 2's infeed with
  no gap, as the art side made them six cells apart.
- **Module 5's clear roof** lets its robot show (pictures 12, 13, 21), as the art side meant.
- **Module 6's pallet** carries the white wrapped stack of seven windows (picture 13).
- **The pallet at the gate** stands at x 0, y 10 with its label (picture 14). With finished goods
  at the gate too (y 9), the box stands in front of them and over the start of their label, as the
  mockup showed; nothing holds those cells.
- **A man walks round the line** (picture 22): Tom, at work on a window, walks from the canteen
  along the back wall and down the two metres between the left wall and module 1, to the front of
  module 1. Nothing stood at that end in this hall.
- **The setup drag** (pictures 15, 16): the ghost is the whole 36 m by 3 m with each module in it,
  green with `Drop it here`, red with `The line needs a clear 36 m by 3 m` over a rack.
- **The Sprite check** shows the sanders with no red port line, the cutter cases with their
  pictures, and the six modules on their 6 m by 3 m footprints (pictures 18 to 20).

## The tasks

**T30-A0 The suite on v88.** `npm run check` on v88 as it stood: lint and build clean, 2,770 of
2,771 tests in 290 files green. One red, `tests/ui/officeHover.test.ts` (`no pointer word in the
TypeScript of the views or the renderers`): two comments v87 wrote into `src/render/hall.ts` said
a machine's `hover`. A plain fault, mended by calling it the machine's `tooltip` in both comments;
no code changed. The check then passed on its own exit code, 2,771 tests in 290 files.

**T30-A1 Housekeeping and v89.** `CLAUDE.md` is this turn's brief (its first line says "Turn 30")
and `docs/turn-29-brief.md` was already in `docs/`, both put there by the ZIP. `APP_VERSION` is
`v89`, and its two pins are flipped (`tests/ui/saveCheck.test.ts`, `tests/ui/version.test.ts`, the
latter's `written in constants.ts and nowhere else` too); the state stays 42 until C1 lifts it.

**T30-A2 The mockups.** Seven pages of section 9 in `docs/mockups/t30/`, each the game's own markup
from engine states, beside the same screen today, shot in headless Chromium, with a README naming
which is which and every line written by hand: the Production line tab and the line's card in four
states with the four upgrade cards, the offer card beside End of day, the Contracts tab's running
block, the hall with the line whole and a pallet at the gate, setup mode dragging the line, the
Owned tile's `Sell the line for £5,000,000`, and the card of a lifted save. No CSS token or class.

**T30-B1 Pack 1 of 09.10.** The thirteen pictures are in `public/sprites/` byte for byte (each
matches the pack's own SHA256 line): the five sanders and their `.r` over Turn 28's, and the three
cutter cases, which the catalogue's tile and the Sprite check page now draw where they showed an
empty box and `no file yet` (`tests/ui/t28Families.test.ts` flipped; the measured class files 107
to 110 in `tests/render/spriteClasses.test.ts`). The eight sander ports are measured again, off
the art side's own mesh through the pack's own matrix and checked by eye (`src/engine/ports.ts`,
[TUNE until Piotr confirms]); no test pinned the old figures. The root is as it was before 09.10:
the game's README is back with this turn's lines, and the rest of the pack is in
`docs/art/pack-0910/` with `EDITED.md` (the five files whose eleven em dashes were replaced, and
`SHA256SUMS.txt` left as delivered). SPRITES.md section 15.1 carries the thirteen files.

**T30-C1 The line bought whole, STATE_VERSION 43.** Six modules of 6 by 3 by 3 m at their shares
of `LINE_PRICE`, 10,000,000 written as their sum, with no `requires`; one folder on the line tab
(module 1's, `from £10,000,000`) and one card, the line's, drawn by `renderLine` in place of a class
card; one click orders the six on one due day at the first clear 36 by 3 from (2, 14)
(`lineSite`, `canPlaceBox`, the one placement check `canPlaceSpec` now reads too), the cash down
once on `Window production line ordered`; sold whole from any module's tile on one line and one
card; modules 5 and 6 do the Finishing and the Glazing (`LINE_COVERS`), `LINE_FACTOR` to 2.4 on
the Finishing on module 5, 33 places each, 18 per cent of the boards, the booth still asked, and
`lineLevelForJobs`. The 28 pictures are in, byte for byte; no code reads the manifest by pattern,
so the two new kinds of file needed no teaching in `src/`, and the two counts that filter by name
(`rotate.test.ts`, `spriteClasses.test.ts`) now say so. The lift: `liftToVersion43` writes
`state.windowLine` whole with its defaults, and `takeTheLineBack` (gated `version < 43`) refunds
Turn 29's modules on one `Production line refunded: it is sold whole now` line and queues the
`lineRefunded` card; a module sold and waiting is left for its van, which pays its own half.

**T30-C2 The line moved as one.** In setup mode any module, or the outline of one on order, takes
the whole line: `canPlace` asks the 36 by 3 at the new place clear of everything but the line
(`canPlaceLine`, through `canPlaceBox`) and refuses with `The line needs a clear 36 m by 3 m`, or
`The line is never turned` for a turn; `moveItem` moves the six or none, a man at a module with it;
`MOVE_ITEM` records the six, so Done reads `Moving 6 machines takes 6 h` (a module heavy for that
question alone, its delivery still built in) and Put them back puts the six back. The ghost is the
36 by 3 with each module drawn in it (`Ghost.parts`); the app's guard and `LINE_STANDS_WHERE_BUILT`
are gone. New: `tests/engine/t30Move.test.ts` and the drag in `tests/ui/t30Line.test.ts`.

**T30-C3 The line's contract, its windows, the pallet and the gate.** A record of its own
(`state.windowLine.contract`, `src/engine/lineContract.ts`), never one of `state.contracts` and
drawing nothing off the seeded stream: offered by the `lineContractOffered` card (two choices, so no
cross and no Escape) at the end of `startDay` once the six stand and two engineers are on the books,
and a week on after `Not now` or an end. While it runs, `runLineMinute` (beside the men's minute in
`advanceMinute`) moves the window on in the day's working minutes only, with two engineers on duty
and nothing being moved: £1,500 in on the contract line and £600 out on the material line a window,
each one growing line a day, the material past the overdraft floor; the tenth window sends the
pallet to the gate (`LINE_PALLET_LAYOUT`, one box a pallet and the label), taken at the next working
open with no ledger line; a part pallet goes on `End it` or the sale. The Contracts tab shows its
block first; the line's card says it can work one. The scenarios (zz) and (bbb) of Turn 29 end or
turn the offer down, since they are about the jobs and the joiners' contract.

**T30-C4 The sheets and the windows on the pallet.** `MACHINE_WORK_SHEETS` holds the art side's one
set of figures for the six; a module that works (`moduleWorks`: the clock running, and the
contract's window minutes or a man drawn at it) is drawn by `sheetArt` in place of its picture, in
the same box, anchor and shadow, marked `data-sheet`. `playSheets` (in `src/render/sprites.ts`, the
shape of `playCharacters`) writes only the frame and the view box, only when the frame changes, on
real time at 6 a second, holds while the clock stands, and is called in `runFrame` and at the end
of `render()`, so a page written mid loop keeps its frame. Module 6 draws the one overlay of the
windows on its pallet, `stack01` to `stack09`, in its own drawable; none on an empty pallet.

**T30-C5 The four upgrades.** `LINE_UPGRADES` (Diamond tooling 400,000, Line software 300,000,
Servo press 500,000, Second spraying robot 600,000) is a table of its own and not kit: bought from
four cards under the line's card in its folder, in the class card's classes with no picture, the
cash down at the click on `Line upgrade: <name>`, fitted `LINE_UPGRADE_DAYS` (10) working days on
and kept on `state.windowLine.upgrades`. `lineWindowMinutes` takes `LINE_UPGRADE_MINUTES` (15) off
for each fitted, never below 60, so the offer card, the running block and the line's minute read
120, 105, 90, 75 and 60; nothing of the jobs changes. Refused in the card's order (`Needs the
production line`, `Being fitted: ready on <day>`, `Fitted`, `Not enough cash`); emptied for nothing
when the line is sold. The line's card now ends `...its price; the upgrades go with it`. New:
`tests/engine/t30Upgrades.test.ts`.

**T30-E1 Notes and the art side's requests.** `docs/notes-t30.md`: where each task lives, the lift,
the readings of the brief the code marks [TUNE], section 10's thirteen choices each with what was
built, how to read the line (`lineModules`, `lineLevel`, the new `lineLevelForJobs`), what of
section 8 the turn touched and the questions for Piotr. `docs/art/REQUESTS-T30.md`: L3 (the pallet
of ten wrapped windows standing alone, proposed at 2 by 1 by 1.75 m, 160 by 172, anchor 104, 164,
and the forklift with its driver in four directions, empty and loaded, as one row sheets), whether
the servo press and the second robot are drawn, the line's 90 degree convention, and what to look
for on the hall (the seams, the conveyor at 0.9 m, module 5's clear roof, the boxes at the gate).

**T30-E2 The scenarios.** `tests/scenarios/turn30.test.ts`, (ccc) to (ggg), played through the
engine and answered as a player answers: (ccc) a v42 save of Piotr's shape opens with 1,500,000
back, no module and the `lineRefunded` card as the first thing seen, and one with no module raises
none; (ddd) the three refusals, one click for 10,000,000 on one line, the six standing on their due
morning at x 2 to 37, y 14 to 16, moved as one, refused onto a rack and a turn, put back, two
engineers hired and a window's Cross cutting, Finishing and Glazing on modules 1, 5 and 6 at the
engine's own sum; (eee) the offer at the first working morning with both on the books, a window
every 120 minutes and four a day for 6,000 in and 2,400 out, none in the dinner hour worked
through, the tenth to the gate and gone the next working morning, none with one engineer away, a
window job taken while it runs with no line and no boards saved, and the card again a week after
`End it`; (fff) the four upgrades to 60 minutes and eight windows a day, then the line sold for
5,000,000 on one line and one card, the upgrades gone; (ggg) the sheets while the clock runs, the
pictures once paused, module 6's `stack07` and none on an empty pallet. The moved figures of
earlier scenarios, each restated with one line of reason in C1 and C3: (zz) of Turn 29 (the line
bought whole: 10,000,000, the six at x 2 + 6 (N - 1), level 3 with one engineer, sold from any
module, the contract ended because (zz) is about the jobs) and (bbb) (the line's offer turned down
for the year, since the week measures the joiners' contract).

**T30-E3 The cross check.** Section 7 read bullet by bullet against the code and the tests by a
read only sub-agent, and the mechanical checks run: no `.skip`, `.only`, `.todo`, `xit` or
`xdescribe` in the tree; the thirteen pictures of pack 1 and the line's 28 byte for byte against the
packs' own hashes and all in the manifest; no file of the pack in the root; `docs/pictures-t30/`
gone; `git diff main --stat -- src/ui/styles.css` empty; no em or en dash in any file changed since
main; the Skylon header on every new code file; v89, 43 and 12. What it found and this task mended:
the offer's seeded stream check compared a state the play never changes, so it could not fail (now
the morning with the card against the same morning with the offer put off: the same stream and the
same enquiries drawn); and five things of section 7 were true in the code with no assertion, now
asserted: no window on the second shift, nothing ordered or unloaded and no man's minute booked
(against the same day with no contract), the material paid past the overdraft floor, the contract
offered and taken with three standing contracts running, and `playSheets` in the frame loop itself
(a mutation of that call turns the test red). The README's one sentence beyond the brief's lines
(on the packs) is taken out.

**T30-E4 Look and shoot.** Twenty two pictures in `docs/report-t30/`. Every one is drawn by the
game's own app, mounted in jsdom, its state set up by the engine and the tests' helpers and clicked
to the screen through its own `data-do` handlers, then saved with the game's stylesheet and shot in
headless Chromium. Nothing in the markup is written by hand. How they were shot:
- A modal shot whole is let out to its full height (`.modal`, `.modal-body`), as in Turn 29.
- The closer views are the app's own camera: `zoomTo` and `cameraTransform` written on the scene
  as `applyCamera` writes it, the closest at 4, the wheel's limit.
- The setup drags are the app's own mouse handlers, as `tests/ui/t30Line.test.ts` drives them.
- The strip of frames is six moments of real time (frames 0, 2, 4, 6, 8 and 10) put through the
  app's own `render()` and `playSheets`; the walk is the renderer's own `stepWalkers` and
  `playCharacters`, the two steps of the frame loop, with no game minute between them. Both
  strips are crops of the game's own shots laid side by side, not scaled.
- The Sprite check pictures are the page's own cells for the sanders, the cutter cases and the six
  modules, taken out of the app's page whole.
- The shooting scripts were throwaway files in the scratchpad and are not committed; their static
  server was stopped before the session went on.

**T30-E5 The report and the pull request.** This file, section 0 first, and the pull request titled
`Turn 30: the line bought whole, its windows contract, its upgrades and its moving pictures`,
against main and not merged. Nothing was left running: the checks, the scenario runs, the reviews
and the cross check ran to their ends; the shooting scripts stopped their own server; no watcher or
server is up.

## The pictures

Each beside its nearest existing screen (`docs/report-t29/`, `docs/report-t28/`) and the mockup of
section 9 it makes true (`docs/mockups/t30/`).

| Picture | What it shows | Beside |
|---|---|---|
| `01-the-production-line-tab.png` | the line tab with its one folder, `Production line`, `from £10,000,000` | `report-t29/02-the-production-line-tab.png`, `report-t29/01-the-cnc-centre-tab.png`; `mockups/t30/production-line-tab.png` |
| `02-the-line-in-the-200-m2-unit.png` | the line's card locked, `Needs the 800 m² unit`, and the four upgrades `Needs the production line` | `report-t29/04-module-1-in-the-200-m2-unit.png`; the same mockup |
| `03-the-line-short-of-cash.png` | the 800 m² company with 1,000: `Not enough cash` | `report-t29/03-module-1-with-no-five-axis-cnc.png`; the same mockup |
| `04-the-line-that-can-be-bought.png` | the line's card with its Buy, its six rows, the two lines of what it gives, the sale, the costs | `report-t29/05-module-1-that-can-be-bought.png`; the same mockup |
| `05-the-four-upgrades-fitted-being-fitted-offered.png` | the line owned: Diamond tooling `Fitted`, Line software `Being fitted: ready on Wed 17 March`, the other two with Buy; the line's card reads `one every 1 h 45 min` | the same mockup |
| `06-the-owned-tab-selling-the-line.png` | the Owned tab's line tiles, each `Sell the line for £5,000,000` | `mockups/t30/owned-tile-sell.png` |
| `07-the-offer-card.png` | `Windows off the line`, its body from the constants, `Take it` and `Not now`, no cross | `report-t29/21-the-offer-of-a-sash-window-contract.png`; `mockups/t30/line-contract-offer.png` (beside End of day) |
| `08-the-contracts-tab-with-the-line-running.png` | the running block first: the week's 7 and 112 in all, the price and the material, one every 2 hours, 7 of 10 on the pallet, 1 pallet at the gate, `End it` | `report-t29/19-a-full-contract-on-the-orders-board.png`; `mockups/t30/line-contract-running.png` |
| `09-the-contracts-tab-standing-still.png` | the same with one engineer on duty: `Standing still`, and no gate row | the same |
| `10-the-800-m2-hall-with-the-line-whole.png` | the hall at the fit, the six end to end at x 2 to 37, y 14 to 16, the pallet at the gate | `report-t29/07-the-800-m2-hall-with-the-whole-line.png`; `mockups/t30/hall-line-whole.png` |
| `11-two-modules-meeting-at-the-closest-zoom.png` | modules 1 and 2 meeting, at zoom 4 | the hall mockup's closest row |
| `12-the-line-whole-closer.png` | the middle of the line at zoom 2.2, module 5's clear roof | the same |
| `13-module-6-with-seven-windows-on-its-pallet.png` | module 6 at zoom 4 with `stack07` on its pallet | the same |
| `14-a-pallet-at-the-gate-with-its-label.png` | the gate at zoom 4: one box and `Windows for collection: 1 pallet` | `report-t29/07-...`, the finished goods at the gate; the hall mockup's gate row |
| `15-setup-the-line-dragged-allowed.png` | setup mode, module 3 taken hold of: the whole line's ghost, green, `Drop it here` | `report-t29/06-module-1-refused-for-what-stands-on-its-cells.png`; `mockups/t30/setup-drag.png` |
| `16-setup-the-line-dragged-refused.png` | the same over a rack: red, `The line needs a clear 36 m by 3 m` | the same |
| `17-the-card-of-the-lifted-save.png` | a v42 save of Piotr's shape opened: `The production line is sold whole`, module 1's order cancelled and 1,500,000 back, the engineers kept, `Right` | `report-t29/22-the-card-of-the-trimmed-save.png`; `mockups/t30/lifted-save-card.png` |
| `18-sprite-check-the-sanders.png` | the five sanders of pack 1, both views, their ports | `report-t28/13-the-sprite-check-rows.png` |
| `19-sprite-check-the-cutter-cases.png` | the three cutter cases with their pictures, no `no file yet` | `report-t28/08-a-cutter-set-card.png`, `report-t28/13-...` |
| `20-sprite-check-the-six-modules.png` | the six modules on their 6 m by 3 m footprints, 3 m high | `report-t28/13-...` |
| `21-a-strip-of-frames-of-the-line-playing.png` | modules 5 and 6 at frames 0, 2, 4, 6, 8 and 10 of their sheets, the contract running and the clock at 1x | none: the first machine that moves |
| `22-a-man-walking-round-the-line.png` | Tom walking from the canteen round the left end of the line to module 1's front, five moments | none |

## The state: STATE_VERSION 43

- **The new field**, `state.windowLine` (`WindowLineState` in `src/engine/types.ts`): `contract`
  (null, or `{ status: 'offered' | 'active', startDay, windowsThisWeek, weekStartDay, windowsMade,
  revenue, materialCost }`), `nextOfferDay`, `minutes`, `onPallet`, `palletsAtGate` and `upgrades`
  (`{ id, fittedOnDay }`). Written whole in C1 with every default, so C3 and C5 needed no second
  lift. New event kinds: `lineContractOffered`, `lineRefunded`. New actions: `END_LINE_CONTRACT`,
  `BUY_LINE_UPGRADE`.
- **The lift.** `liftToVersion43` (beside `liftToVersion42` in `src/engine/migrate.ts`) writes the
  field with its defaults. `takeTheLineBack`, on the whole state after the raw lifts and gated
  `version < 43` (the road `takeTheTimberToolsBack` took), removes every module of Turn 29 that
  stands unsold (for its `purchasePrice`) or is on order (for its `pricePaid`), with its records in
  `movedItems`, the pipes and the gates, books the whole on one line, `Production line refunded: it
  is sold whole now`, and queues the `lineRefunded` card for the first settle. A module already sold
  is left for its van. Nothing else of a save is touched.
- **Piotr's save** (day 999, the 800 m² unit, module 1 on order) opens with 1,500,000 more, no module
  and the card: asserted on a raw save in `tests/cloud/migrate.test.ts` and played in scenario (ccc).
  Every save that loaded on v88 loads, the fixtures among them.
- **Version pins flipped:** `tests/cloud/migrate.test.ts` (18: STATE_VERSION and every lifted
  version to 43), `tests/ui/saveCheck.test.ts` (2), `tests/ui/version.test.ts` (2, `v89`),
  `tests/engine/v67.test.ts` (1), `tests/engine/types.test.ts` (1).

## Tests flipped, by name

- `tests/ui/officeHover.test.ts`: not flipped; the two comments it caught were mended (A0).
- `tests/ui/t28Families.test.ts`: the cutter card's empty picture box and the Sprite check row's
  `no file yet` flipped to the pictures (B1).
- `tests/render/spriteClasses.test.ts`: the counts of class files (107 to 111) and of turned
  pictures (108), each picture's box against its class's metres with the modules at 3 m, and a sheet
  and an overlay counted as neither (B1, C1).
- `tests/engine/rotate.test.ts`: the turned pictures, 108, none a sheet or an overlay (C1).
- `tests/ui/t29Families.test.ts`: Turn 29's pictures, the five modules at their new size and the sixth
  (C1).
- `tests/engine/t29CrossCheck.test.ts`: the Sprite check targets read off `LINE_MODULES`, twelve now,
  and the six landing on one morning (C1).
- `tests/engine/metres.test.ts`: the modules' metres, 6 by 3 by 3 (C1).
- `tests/engine/t29Line.test.ts`: rewritten for the line bought whole (one purchase, no requires, the
  first clear 36 by 3, moved, sold whole, levels 0, 3 and 6, the Finishing and the Glazing on 5 and
  6, the card); its sale line reads `...; the upgrades go with it` from C5.
- `tests/engine/t29Engineer.test.ts`: one keeps three modules and two keep all six (C1).
- `tests/ui/catalogueTabs.test.ts`: the line tab's one folder, module 1's (C1).
- `tests/scenarios/turn29.test.ts`: (zz) flipped to the line bought whole, its own contract ended
  because (zz) is about the jobs; (bbb) puts the line's offer off for a year, since the week measures
  the joiners' contract (C1, C3).
- `tests/engine/t30Contract.test.ts`: its seeded stream check, which compared a state the play never
  changes, flipped to compare the morning with the card against the morning without it (E3).
- `tests/engine/dust.test.ts`, `tests/engine/ports.test.ts`, `tests/engine/layout.test.ts`,
  `tests/engine/zones.test.ts`: not flipped. The dust test reads the table whole, no test pinned the
  sanders' old ports, and the last two never buy a module in their 200 m² unit, as the brief said.

New: `tests/engine/t30Contract.test.ts`, `tests/engine/t30Move.test.ts`,
`tests/engine/t30Upgrades.test.ts`, `tests/render/t30Sheets.test.ts`, `tests/ui/t30Line.test.ts`,
`tests/ui/t30Pictures.test.ts` and `tests/scenarios/turn30.test.ts`, each with the Skylon
Development Ltd header.

## What was not done tonight

- **Nothing of section 5 was left out.**
- As the brief parks it (section 8): the forklift and the pallet standing alone (L3, asked of the
  art side in `docs/art/REQUESTS-T30.md`); `stack10` is on disk and not drawn; the line on the second
  shift and more upgrades past one window an hour; the upgrades drawn; the line turned (its `.r`
  pictures are the other turn, on disk for the tests and the Sprite check only); module 5 in place
  of the booth; the property cover's rate on the line.
- Nothing of the standing contracts the joiners make, a sheet job, the wages, the tax, the loan, the
  bank, `crewByFamily`, `MAX_CATCH_UP_MS`, the paced redraw or the sprite cache headers was changed,
  beyond the two calls of `playSheets`. `git diff main --stat -- src/ui/styles.css` is empty.
