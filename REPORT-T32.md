# Report, Turn 32: one store for every material: sheets, boards and glass bought and kept the same way, the glass racks, and the line fed from the stores

Woodwork Empire, Turn 32. Built against `CLAUDE.md` of 13.10.2026 (first line "Turn 32").

- **Branch:** `turn-32-one-store`, off `1b55aa6`, the tree `main` stands on (v95, STATE_VERSION 47),
  as the brief names it.
- **Versions:** `APP_VERSION` v95 to v96 (A1), `STATE_VERSION` 47 to 48 (B2), once each.
- **How it was run:** one writer, serial, no worktrees, one commit a task, the branch pushed after
  each. `npm run check` was green on its own exit code before every commit.
- **Tests at the end:** 3,085 in 317 files, none skipped (3,013 in 312 at A0).
- **Sub-agents:** they mapped the code before B2, built the mockups, drafted the test flips in
  scratch copies of their own, reviewed B2's source, cross checked section 7, shot the pictures and
  drafted the art request. None of them edited `src/` or `tests/`, committed, or ran the suite while
  the lead's check ran.

## 0. What Piotr should read first

**Not reached: nothing.** Every task of section 5, T32-A0 to T32-E5, is done in the brief's order,
one commit each.

**Red: nothing.** The last full check passed on its own exit code: lint, the build, and 3,085 tests
in 317 files. No `.skip`, `.only` or `.todo` anywhere in the tree, so there is no skip to list. A0
found the suite green on v95 (3,013 in 312), so v93 to v95, built in chat, needed no fix.
`git diff main --stat -- src/ui/styles.css` shows nothing.

**One thing found and left that you will meet in play: two lorries in one morning.** From tonight a
window's boards and glass come on two lorries, and the office's restock of each for the line too.
With no labourer on the books the owner answers the first lorry's card with `Unload now` and starts
on it; the second card's `Unload now` is then refused (his hands are full) without a word, and that
load stands at the gate until you click its lorry again. So it was on v95, when two loads in one
morning were rare. Putting the second unloading next in his queue (Turn 19's "Add as next") is one
line; it was built, and taken out again, because it moved the pinned sheet playthrough's days and
its cash, which tonight's brief does not allow. With a labourer every load comes in by itself, and
the turn's scenarios keep one. Whether the owner should take the next unloading by himself is the
first question below.

**The line's month from the built game** (scenario (nnn)): the line at (2, 14) in the 800 m² unit,
its contract taken at its card, two engineers and an office admin, one timber rack of 40 boards and
one glass rack of 40 units, the office restocking each kind at two working days left; the windows
counted over the 30 days after the morning its first loads were in, the restocks from the take:

| Windows | Possible | Minutes lost to material | The office's restocks | Boards bought | Glass bought | The paid store |
|---|---|---|---|---|---|---|
| 80 | 80 | 0 | 10 (7 of boards, 3 of glass) | 196 for £36,840 | 106 units for £21,200 | never |

- The boards are on the sheets' ladder (40 at £180, 26 at £190), the glass at £200 a unit; each
  restock fills the stores' free places less what is on its way, so with one rack of 40 the office
  orders every few days. The line's books still count £600 a window used.
- It loses its first day: the contract is taken at a card at the open, and its first loads come the
  next working morning.
- With no admin the line buys nothing, stands `no timber` (said on the strip and on its running
  block) once the stores run dry, and goes again on the working day after the player restocks each
  kind from the Materials page.

**What chat decided and you have not confirmed (section 10), with what was built:**

1. **A window's glass units:** its glass share (`GLASS_SHARE`, 0.35 of its material) over £200, rounded
   up: 7 for a 9,000 casement window (3,600 of material, 1,260 of glass). The job's price, labour and
   books are what they were; the player pays 7 at £200, £1,400, where v95's glazier charged £1,260.
2. **The prices:** the boards on the sheets' ladder, as a window's boards were already priced; the
   glass flat at £200 a unit (`glassUnitPrice`, written from the line's own two functions), no ladder.
3. **The glass racks:** 2 x 1 x 2 m (zone 2 x 2, 3 working days) and 4 x 2 x 2.5 m (zone 4 x 3, 5
   working days), on the floor of any hall, a folder each in the storage tab; a window or a door on
   the board wants one, last of its list, either family.
4. **The office's ordering for the line**, your rule of 11.10 kept, as a Restock of each kind with
   nothing typed: at the open, at the take and after every window, when what the line could have
   (held, free and on its way) is under two working days of its windows; never to the paid store;
   `40 boards for stock, ordered by Anna`. For the line and nothing else.
5. **Gone with "identically":** the glazier and his button, the `Glass not ordered` and `Boards at the
   gate` strip lines, the boards' whole load rule, the board's refusal of a window bigger than the
   stores, the line's two buttons and its glass at module 6. A test searches `src/` for every name.
6. **A bespoke window's boards** ordered in, as bespoke sheets are; its glass from the racks.
7. **A window's glass taken whole** at the start of its Glazing; it stands there, `waiting for
   glass`, while the racks cannot give it all, the glass it holds in the paid store included.
8. **The lift:** the glazier's glass on its way and a line's glass on its way put on the counter at
   once, their price paid; a line's boards and glass free stock; Turn 31's first batch onto the
   counters. No cash moves and no load is made.
9. **The insurer counts the glass** at £200 a unit; the burglar takes sheets only, as today.
10. **The low stock badge** on each kind's line while it has a rack; the weekly card the sheets' alone.
11. **The words:** `glass units`; `Sealed glass units` `IGU-4-16-4`; `Timber boards` `TMB-63-RED`; the
    blocks `Sheets`, `Timber boards`, `Glass`; `20 glass units at £200 = £4,000`; `60 boards: 40 on
    the stores, 20 to storage at £150`; `Fetch 12 sheets, 30 boards and 5 glass units from storage`.

**The choices this session made beyond the brief, each marked [TUNE] in the code** (the whole list
is section 3 of `docs/notes-t32.md`):
- One function for every kind: `stockOnItem` and `stockStrandedBySale` in place of the brief's
  `glassOnRack` and `glassStrandedBySale`, the sheets' and the boards' own versions folded in.
- Two folders, `Glass racks` and `Large glass racks`, as the timber stores have one each.
- A job's own load is its own whether it fits or not, every kind, as the sheets' rule has it; glass
  held in the paid store is held but not in hand until the fetch.
- The line holds the windows left in the week in hand and no more; the windows hold before the line
  at every open, the sheet jobs not asked there.
- A window's two loads say `material ordered` until both are at the gate.
- The Restock's fourth refusal for a full kit with nothing on its way: `No room on the rack` (today's),
  `No room on the timber stores`, `No room on the glass racks`.
- The boards' and the glass block shown once their kit stands or anything of the kind is about.
- A dropped job's load at the gate keeps its unloading, for stock (on v95 it stood there for good).

**Seen in the pictures and in the play, and what it means** (the pictures are listed below):
- **The Materials page loses its green and red** on the laptop (01): `12 of 12 boards of timber in
  hand` and `7 of 7 glass units short` come out in the screen's dim ink, because the screen's own
  rule for a row figure comes later in `styles.css` than `.good` and `.bad`. So it was on v95; the
  stylesheet is not touched tonight.
- **The boards' and the glass's refusal has no visible words** (01): `No timber store` and `No glass
  rack` are the locked button's hover title only; the sheets' `No shelving yet` paragraph stays the
  sheets', as the brief keeps it.
- **A window's glass can be ordered before its site measure** by `Order for this job`, as a sheet job's
  material can; v95's glazier waited for the paperwork. The office still waits for the take off.
- **The locked `Start production`** of a window short of both says only `5 boards of timber short` (02):
  a job is ready on its boards and its glass is wanted at the Glazing, as the brief has it.
- **Where a new glass rack lands** (04): two bought one after the other stand side by side along the
  rear wall, and the large one hides the small one's front face, its plate and the end of its name;
  the player moves them. Until the art lands each glass rack shows its count twice, in its name and
  on its plate.
- **The large rack's sentence**, `Holds five times a glass rack's units on twice its floor.` (07), is
  the brief's; by its figures its floor is four times the small one's.
- **A window's tile** (05) wraps `owner days` onto a second line, one line taller than v95's.
- **The day end card's `Deliveries tomorrow`** names every load in sheets (`7 sheets` for seven glass
  units): the day's record keeps the counts alone.
- **A v95 save opens with no glass rack** (none could be bought): its glass is used as it lies, but
  new glass waits at the gate and the office's glass restock for a line is refused `No glass rack`
  until one is bought.

**Questions for Piotr** (section 6 of `docs/notes-t32.md`): whether the owner takes the next
unloading by himself (above); the section 10 choices; whether the office's first restock for a line
on a big hall should fill the shelter's 400 boards at once (£60,000) or buy two days of windows; and,
parked, an office admin who restocks the sheets for the sheet contracts, the burglar and the boards
and glass, and the outside sheet store of 1,000 sheets (S1).

## The tasks

**T32-A0 The suite on v95.** `npm run check` on main as it stood (v95, state 47): lint and build
clean, 3,013 tests in 312 files green. Nothing moved, so no commit.

**T32-A1 Housekeeping and v96.** `APP_VERSION` is `v96` and its two pins are flipped
(`tests/ui/saveCheck.test.ts`, `tests/ui/version.test.ts`); the README names `docs/turn-31-brief.md`,
`REPORT-T32.md`, `REQUESTS-T31.md` and `REQUESTS-T32.md`.

**T32-A2 The mockups.** The six mockups of section 9 in `docs/mockups/t32/`, each the game's own
markup from engine states of a snapshot of the A1 commit beside the same screen today, shot in
headless Chromium, with a README and the lead's readings (`decisions.md`); built and reviewed by
sub-agents, the review's findings put right before the commit.

**T32-B1 The glass racks.** `glassRack` (40 units, £1,500, 2 x 1 x 2 m) and `glassRackLarge` (200,
£6,000, 4 x 2 x 2.5 m), a family each in the storage tab, drawn by `objectArt`'s last branch with
their name and plate, never serviced, sold by the racks' one rule; a window or a door wants one.
One function each for a kind's capacity, room, spread over its racks and stranding at a sale
(`capacityOf`, `roomFor`, `stockOnItem`, `stockStrandedBySale`); 3,020 tests in 313 files green.

**T32-B2 One store.** Three counters (`sheets`, `boards`, `glass`, each with its paid store) read
through one function each for room, free places, held and free; Restock for each kind; a window's
boards and glass held at the click, ordered as one shortfall on two lorries, its glass taken whole at
its Glazing; the line holding its week off the stores and the admin's restock of each; glass by
lorry; everything of 2.8 gone; STATE_VERSION 48 and its lift. 3,046 tests in 315 files green.

The src review found a window could pass its Glazing holding glass that lay in the paid store, and a
dropped job's load at the gate left with no unloading: both fixed. Queueing a second lorry's "Unload
now" behind the first was tried and taken out, because it moved the sheet playthrough (section 0).

**T32-E1 Notes and the art request.** `docs/notes-t32.md`: where each rule lives, the save, the
readings of the brief, section 10 as built, what was found and fixed or left, and four questions for
Piotr. `docs/art/REQUESTS-T32.md`: G1, the two glass racks, their files and anchors checked against
`spriteFileSize` and `spriteAnchorIn`; S1 named as still owed.

**T32-E2 Scenarios.** `tests/scenarios/turn32.test.ts`: (mmm) the restock of 60 boards and 30 glass
units past one rack each, the window holding 12 and 7 at the click and taking its glass at its
Glazing, a second ordered by the admin on two lorries; (nnn) a line fed by the admin's restocks for a
played month and standing for nothing, and with no admin standing `no timber` until the player
restocks; (ooo) a v95 save of a running line and a window with its glass ordered, played a week on
v96. Each moved figure of the older scenarios was restated in B2 with its line of reason.

**T32-E3 Cross check.** Four read-only agents mapped every claim of section 7 to the tests that
assert it: 118 facts asserted, 29 in part and 22 not. The 51 were closed with
`tests/engine/t32CrossCheck.test.ts` (16 tests) and additions to `t32Store` (engine and ui),
`t31Material`, `migrate` and `turn32`; the "what goes" search now also covers `migrate.ts`.
No skip anywhere, `styles.css` untouched; 3,085 tests in 317 files green.

**T32-E4 Look and shoot.** Seven pictures in `docs/report-t32/`, every one the game's own markup
from its own render functions over states the engine built and played, shot in headless Chromium,
each v96 screen beside v95's same screen built from the A1 snapshot. The generators are in the
session's scratchpad, not in the repo, and no server or browser was left running.

**T32-E5 The report and the pull request.** This file, section 0 first, and the pull request titled
`Turn 32: one store for every material: sheets, boards and glass bought and kept the same way, the
glass racks, and the line fed from the stores`, not merged. Nothing is left running.

## The cross check (section 7)

| Claim | Where it is asserted |
|---|---|
| `npm run check` green; no skip | the last check: 3,085 tests in 317 files; no `.skip`, `.only` or `.todo` in the tree |
| Store: three counters, the sheets' counter sheets only, one function each for room, free places, held and free, the insurer counts all three | `tests/engine/t32Store.test.ts` (`three counters`), `t29Stores`, `t29CrossCheck`, `t31Material` |
| Restock: each kind refused in its words in the sheets' order, the typed number whole, the empty field the free places less what is on its way, the boards on the ladder and the glass at £200, the overflow quoted and sent to the paid store, the sheets' restock unmoved | `t32Store` (`Restock for each kind`), `t32CrossCheck` (`the Restock s refusals`), `tests/ui/t32Store.test.ts`, `tests/ui/materials.test.ts`, `tests/ui/restockWhole.test.ts` |
| Jobs: held at the click from the free stock, 7 units for 3,600, both shortfalls ordered by one click and by the admin on two lorries at two prices, the glass taken whole at the Glazing and the job stopped without it, a drop on each counter | `t32Store`, `t32CrossCheck` (`a window s boards and glass, at their edges`, `a window dropped`), `t28Timber`, `tests/ui/t32Store.test.ts` (the drop card), `turn32` (mmm) |
| Line: no buttons, no fields of its own, the week held after the windows, two and one a window held first, the admin's restock at two days only into free places in his name, no admin no buying and the strip, the end and the sale freeing what was held | `t31Material`, `tests/ui/t31Material.test.ts`, `v93Lines`, `t32Store`, `turn31` (hhh), `turn32` (nnn) |
| Deliveries: glass by lorry and unloaded, every kind's overflow to its paid store at one fee a load and back at one fetch, a kind with no room at the gate with its card | `t32CrossCheck` (`a load of each kind at the gate`), `t28Timber`, `t29Stores`, `turn29` (aaa), `turn32` (mmm) |
| Racks: both in the catalogue at their figures, on the floor, drawn by the fallback with their plate, never serviced, refused for sale while their glass would be stranded; a window wants one, either family | `tests/engine/t32Racks.test.ts`, `t32CrossCheck` (`two glass racks with glass on them`), `t28Timber`, `t29Kit`, `catalogueTabs` |
| Gone: every name of 2.8 absent from `src/` | `t32Store` (`what goes`): the code names searched in every file of `src/`, the old fields' reads in every file but the lifts |
| The lift of section 4 on raw saves | `tests/cloud/migrate.test.ts` (`a v47 save in this build`, `a v43 save in this build`), `t29CrossCheck`, `v93Lines`, `turn32` (ooo) |
| `styles.css` untouched; every changed screen beside its nearest existing one | `git diff main --stat -- src/ui/styles.css` is empty; the pictures below |

## The pictures

Each the built game's own screen beside v95's same screen, from the A1 snapshot; the mockup of
section 9 each makes true is in `docs/mockups/t32/`.

| Picture | What it shows | Beside |
|---|---|---|
| `01-materials-page-three-blocks.png` | the Stock page's three blocks: the boards typed 60 against the stores' 20 free places (`60 boards: 20 on the stores, 40 to storage at £150`), the glass shown for a load on its way and its Restock refused `No glass rack`, a window's two figures and its glass on its way | v95's page, its one head row and its boards row; `mockups/t32/materials-page.png` |
| `02-job-card-material-line.png` | a casement window's card with both short (red, one `Order for this job, £1,600`) and both in hand (green, no button) | v95's card with its hint, `Glass not ordered`, `Order glass`, and `Glass is in`; `mockups/t32/job-card-material.png` |
| `03-line-running-block.png` | the running block with `Timber held: 30 boards, for 15 windows` and `Glass held: for 7 windows`, `... from the stores`, only `End it` | v95's block with its two order buttons; `mockups/t32/line-running-block.png` |
| `04-hall-glass-racks.png` | a glass rack and a large one drawn by the fallback, `Glass rack: 40 / 40` and `Large glass rack: 7 / 200` with their plates, beside the timber rack, at the opening zoom, zoom 3 and zoom 4, and where the engine stands them when bought | v95's hall with its timber rack alone; `mockups/t32/hall-glass-racks.png` |
| `05-board-tile-window.png` | a window's tile, `12 boards and 7 glass units of material`, its Needs line ending `timber store, glass rack`; a sash of 42 boards taken with 40 of room; the window greyed with no glass rack | v95's tiles, the sash refused in red; `mockups/t32/board-tile-window.png` |
| `06-lorry-card-glass-no-rack.png` | `7 glass units have arrived and there is no glass rack to put them on. Buy one from the catalogue.`, `Leave it at the gate` alone | v95's card of boards with no timber store |
| `07-catalogue-storage-glass-racks.png` | the storage tab with the `Glass racks` and `Large glass racks` folders and their cards: 40 and 200 units, £1,500 and £6,000, the empty picture slot | v95's storage tab and its timber racks; `mockups/t32/catalogue-storage-glass.png` |

## The state: STATE_VERSION 48

- **The new fields:** `stock.boards`, `stock.glass`, `stock.tempStorageBoards`,
  `stock.tempStorageGlass`; on a job `glassUnits`, `glassReserved`, `glassUsed`; on a line's contract
  `boardsReserved`, `glassReserved`; on a delivery `material` (`sheets`, `boards` or `glass`). The
  action `RESTOCK` carries `kind`. Gone: a job's `glass` and `glassDay`, a line record's `boards`,
  `glass` and `glassOnTheWay`, a delivery's `boards` and `line`, and the actions `ORDER_GLASS`,
  `ORDER_LINE_TIMBER` and `ORDER_LINE_GLASS`.
- **The lift.** `liftToVersion48` splits the one counter (the boards the windows held and the lines'
  boards onto `stock.boards`, the sheets' counter less them), gives every job its glass units, holds
  on the counter the glass of a window whose glass was ordered or in before its Glazing (the
  glazier's glass in at once, its price paid), puts the lines' glass and their glass on the way onto
  `stock.glass` free, gives every delivery its kind (a line's load on the road a load of boards for
  stock) and takes the old fields off. The whole state step `putTheGlassInTheWindows` (gated `version
  < 48`) puts in its window the glass of a window whose Glazing had begun, and Turn 31's first batch
  for a v43 save goes onto the two counters, free. No cash moves and no load is made.
- **Asserted on raw saves** in `tests/cloud/migrate.test.ts` (`a v47 save in this build`): a window
  holding boards with its glass in, before its Glazing and at it; a window with its glass ordered;
  one with its glass still to order; a running line with boards, glass at module 6, glass on its way
  and a line load on the road; a save with neither; and a v43 save with a running line. Every save
  that loaded on v95 loads, the fixtures among them.
- **Version pins flipped** (47 to 48): `tests/ui/saveCheck.test.ts`, `tests/engine/v67.test.ts`,
  `tests/engine/types.test.ts`, `tests/cloud/v94Lanes.test.ts`, `tests/engine/v93Lines.test.ts`, and
  in `tests/cloud/migrate.test.ts` `STATE_VERSION` and the twenty lifted versions. `contracts.test.ts`'s
  `toBe(47)`, a count of minutes, is left. `APP_VERSION` `v96` in `tests/ui/version.test.ts` and
  `tests/ui/saveCheck.test.ts` (A1). The whole account is section 2 of `docs/notes-t32.md`.

## Tests flipped, by name

Every flip says what is true now; no old test was kept beside its new one. A test was deleted only
where its whole subject is gone, and the file says so.

- **Deleted, their subject gone:** in `tests/engine/t28Timber.test.ts`, `is said on the strip while it
  is to order, directly under the drawing line` (the `glassNotOrdered` line) and `refuses the owner s
  click on Order glass before the paperwork is done` (the glazier's button); in
  `tests/engine/t31Material.test.ts`, the line's own orders: `is 40 boards for 8,000 ...`, `waits at
  the gate with no room on the stores ...`, `can be called off on the Orders list ...`, `is refused
  with no timber store, with stores of fewer than 40 boards, and past the overdraft floor`, `takes
  two batches into a line with none and refuses the third ...`; in `tests/ui/t31Material.test.ts`,
  `locks each button with its reason under it, a reason said once`.
- **The glazier and the glass state:** `tests/engine/t28Timber.test.ts` (the glass a count of units,
  ordered with the boards by the one click on a lorry of its own, in by lorry and stopping the
  Glazing until unloaded, written off with a drop as the boards are; the tile's figure), the oak
  table's noughts; `tests/scenarios/turn28.test.ts` (vv) (two lorries at the click, the glass taken
  whole at the Glazing, the late run waiting for the next working day's lorry);
  `tests/cloud/migrate.test.ts` (the v41 save's glass held for its window).
- **The boards' counter, the gate and the stores' refusal:** `tests/engine/t29Stores.test.ts` (a load
  of boards as a load of sheets: refused with no store and said on the card, onto the boards' own
  counter, the overflow to the paid store and fetched, a drop writing off and leaving what was held
  free, a window bigger than the stores taken), `tests/engine/t29CrossCheck.test.ts` (the counter
  read two ways, a dropped window's load landing as free boards, the v41 save split by the lift),
  `tests/scenarios/turn29.test.ts` (aaa).
- **The line's own material:** `tests/engine/t31Material.test.ts` (a window takes two boards and a
  glass unit off the counters, held first; the contract holds the week in hand after the jobs; the
  line's loads as restocks of each kind; the admin's restock at two days left, only what Restock
  allows; the end and the sale free what was held and write nothing off), `tests/ui/t31Material.test.ts`
  (the running block's two rows and no buttons, fed by the Materials page),
  `tests/engine/v93Lines.test.ts` (two lines holding their own week of the one store; the v44 save),
  `tests/engine/t30Contract.test.ts`, `tests/engine/t30Upgrades.test.ts`, `tests/engine/t31Books.test.ts`,
  `tests/engine/t31Shelter.test.ts`, `tests/render/t30Sheets.test.ts`, `tests/ui/t30Line.test.ts` (the
  line given its boards and glass on the stores; the offer card's and the running block's sentences),
  `tests/scenarios/turn30.test.ts` (eee) and `tests/scenarios/turn31.test.ts` (hhh) (the player's and the
  admin's restocks in place of the line's orders).
- **`WARNING_ORDER` whole:** `tests/engine/warnings.test.ts`, without `glassNotOrdered` and
  `boardsAtTheGate`.
- **The wanted list and the catalogue (B1):** `Needs ... timber store` gains `glass rack`
  (`t28Timber`, `t29Kit`, `t29Line`, `turn28`, `turn29`, `turn31`); the storage tab's families
  (`catalogueTabs`, `views`); a 200 m² hall with the glass racks has no room for the CNC (`layout`,
  `zones`).
- **Mechanical, no figure moved:** the restock's and the counters' functions by kind, a delivery's
  `material` and a job's three glass fields in the literals of `bespokeOrder`, `catalog`,
  `contracts`, `deliveries`, `dropJob`, `helper`, `helperDirtyHall`, `jobs`, `laptopHome`,
  `materials`, `stations`, `tasks`, `turn13Contracts`, `t31Contracts`, `t31Forklift`, `walkers`,
  `playthrough`, `turn13`, `turn17`, `turn20`, `turn24`, `dropCard`, `laptopPages`, `materials` (ui),
  `restockWhole`, `turn24Check`. The sheet department's figures in these are what they were, to the
  pound.

## What was not done tonight

- The second lorry's lost click (section 0) is left as v95 had it.
- No picture: the two glass racks are drawn by the fallback until G1 (`docs/art/REQUESTS-T32.md`)
  lands, and the pallet at the gate is still Turn 13's placeholder for every load.
- Section 8, parked by the brief and not touched: the outside sheet store of 1,000 sheets (S1); an
  office admin who restocks the sheets for the sheet contracts; the burglar and the boards and the
  glass; everything Turn 31 parked.
