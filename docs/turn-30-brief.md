# Turn 30: the line bought whole, its windows contract, its upgrades and its moving pictures

Woodwork Empire. Autonomous session brief for Claude Code (cloud, one writer, serial, effort
high). Owner: Piotr. Programmer: Claude. Spec author: Claude (chat), written 11.10.2026 from
Piotr's words of 10 and 11.10, against main at v88, and checked against v88 by a second reader
before it was sent.

Read this whole file (first line must say "Turn 30"; if the root CLAUDE.md does not, stop and
report), then REPORT-T29.md section 0 and its "what was not done", then docs/notes-t29.md, then
docs/ui-style.md, then docs/art/SPRITES.md sections 2, 13 and 14, then the archived briefs in
docs/ (docs/turn-29-brief.md is the last, and this ZIP put it there). Where files disagree, this
one wins. All standing rules apply (no em or en dashes anywhere, scope 1:1, one code path,
constants never in the UI, [TUNE] for every figure you choose and [PIOTR] for his, kill
background processes, PR without merge, end the session, no PR watching, npm run check gated on
its own exit code, every click single, one APP_VERSION bump, delete the old track and never
write a parallel one, flip a test and never keep it beside a new one, the Skylon Development Ltd
header on every new code file). The rule relaxed in Turn 26 stays relaxed [PIOTR, 01.10]: a
scenario figure that moves is restated with ONE line of reason; a test that pins an exact pound of
a played month may be loosened to a range when the exact figure says nothing about the rule under
test, and the comment says so.

Before a line is written: clone, read what is there, and build with it. Every screen, card, tile,
tab, row and strip line this turn needs already has its kind in the repo (the catalogue's folders
and class cards with their locked Buy and the reason under it, the event card, the Owned tab's
tiles and their sale, the Contracts tab's running contract block, the finished goods drawn at the
gate with their label, the figures' frame sheets and `playCharacters`). Nothing here asks for a
second version of any of them, and none is to be written [PIOTR, 18.09: one game, one look].

Precondition. main carries v88: APP_VERSION 'v88', STATE_VERSION 42. If APP_VERSION is not 'v88',
stop and report. Turn 29 ended green (2,762 tests in 287 files). Chat then shipped four small
versions straight to main, each checked with the type check, the lint and the tests it touched,
but NOT the full suite: v85 (the presses and the logo), v86 (the start screen without the sketch,
and the tick), v87 (`crewByFamily`: one pass over the crew for a whole hall), v88 (the speed of a
big hall: `MAX_CATCH_UP_MS`, the paced redraw at 30x and over, the sprite cache headers in
`vercel.json`). Task A0 runs the whole suite on v88 before anything is touched.

The four rules of 18.09 bind every agent: one game, one look; nothing visual without a mockup;
no sound without a recorded file; every modal, popover and list has the cross, Escape and click
outside (the event card with two choices is the game's one standing exception, 2.6). The mockups
this turn needs are in section 9, into docs/mockups/t30/ before the code that makes them true.
Piotr asked for this turn in one go tonight and has not seen those mockups: they are built only
of what the game already draws, and the report shows each beside its nearest existing screen so
he can judge them afterwards.

**What chat decided for Piotr and he has not yet confirmed** is marked [TUNE: chat] throughout
and gathered in section 10, so the report can repeat it in one place. His own words are [PIOTR].

**The root CLAUDE.md of Turn 29 built the line as five modules bought one by one, standing where
the game put them and never moved.** That was Turn 29's design and it is replaced here: this file
is the brief now.

## 0. What this turn is for (PIOTR, 10 and 11.10)

Piotr played Turn 29 and said, on 10.10 in the evening:

**Moving it.** "I cannot move the production line, why?", and "and what is connected to the
production line?". Told why, he said: "yes, move it".

**What the line is.** "The CNC should be part of the line, after the module that cuts the timber
into pieces; then the CNC, then the sander and so on, and at the end the spraying; then the window
parts are hung and travel on the hanging conveyor by themselves to the glazing table, then a
robot packs them and stacks them on a pallet, and out." On the money: "about 1,500 pounds a window
on average, a standing order, material 40, labour 20, the rest profit, one window every two
hours." And: "a view of the windows moving along the line, of the arms working, and the rest?"

**The pallet.** "When the pallet of windows is stacked, ten of them, the forklift takes it to the
door, and there it disappears the next day."

The art side then drew the line again from chat's order: six modules of 6 by 3 by 3 metres (L1,
which Piotr accepted on 11.10 with the word "super") and their working motion as frame sheets,
with ten pictures of the windows stacking on the last module's pallet (L2). The pallet standing
alone and the forklift (L3) are not drawn yet.

On 11.10, past midnight, Piotr answered chat's seven questions:

1. "Yes": while the line's contract runs, the line makes only its windows; without one, it speeds
   the window jobs as it does today.
2. "Yes": the contract only with the whole line and two engineers, one window every two hours.
3. "Yes": the line no longer asks for a five axis CNC or a frame press of its own.
4. "Make it more, make the whole cost 10 million."
5. "Yes": the material, 40 per cent, is booked for each window made, and no boards are delivered
   for it; the labour, 20 per cent, is the two engineers' wages.
6. "Yes": the full pallet goes to the gate and the client takes it the next day, at no cost.
7. "Write the whole zip now, and put the animation pictures into the code and the zip, so that
   Code can run tonight."

And beside them: "I think the line should be a little different: it should be one whole, and
later add ons can be bought, better new knives, better software, so that it later speeds up to
one window an hour. Think what to add later."

There is also one piece of housekeeping. On 09.10 Piotr pushed the art side's pack 1 (five
sanders in two views and three cutter cases, approved by him that day: "ok, but remember to keep
to the angles, it is mega important; code it") into the root of the repo, where it overwrote the
game's README. None of it is in the game yet.

What this turn is not: any change to a normal job's crew, a sheet job, a wage, the tax, the loan,
the bank, the standing contracts the joiners make (the three sheet pieces and the three windows
and doors of Turn 29), or the game's speed machinery of v87 and v88; no picture drawn by an agent;
and not the forklift or the pallet standing alone (L3), which are not drawn yet.

## 1. Rules restated (short)

Everything from Turns 1 to 29 and the chat fixes to v88. Tonight in addition:

- APP_VERSION = 'v89'. STATE_VERSION 43, once (section 4); every save that loads today loads
  (`OLDEST_SAVE_VERSION` is 12), the fixtures in tests/fixtures among them.
- **A job takes as many men as the boss puts on it** [PIOTR, 17.09 and 05.10]. Nothing of
  `addToJob`, `assignJob` or `canBuild` is touched.
- **The sheet department is not touched.**
- **The art side's pictures go in as they are** [PIOTR, 05.10 and 11.10]. No agent draws,
  repaints, trims or scales a picture. Chat renamed the line's 90 degree views to `.r` and touched
  no pixel (2.2).
- **No em or en dash anywhere**, the art side's own text files among them: in every text file of
  the art side that this turn moves (listed in 2.1), each em or en dash is replaced by a colon or
  a comma, and nothing else of the file is edited. Chat has already done so in the two notes of
  `docs/pictures-t30/`.

## 2. Changes to the design (the contract)

### 2.0 What v88 left (for A0's reasons)

- The full suite was last run green at the end of Turn 29. v85 to v88 changed the presses'
  pictures, the logo, the start screen, `crewByFamily` and the frame loop, each with the tests it
  touched green, and `npm run check` was not run on any of them.
- `tests/ui/app.test.ts` plays the game in real time and failed beside a sub-agent's run in Turn
  28. Tonight no sub-agent runs `npm test`, `npm run build` or `npm run check` while the lead's
  check is running (section 3).
- `tests/ui/t28Families.test.ts` asserts that `docs/art` holds no folder called `incoming`. The
  pictures of this turn are therefore in `docs/pictures-t30/` (2.2).
- The art side's pack 1 of 09.10 stands in the repo's root (commit 46713f3), and the game's
  README is the pack's (2.1).

### A. The suite and the house

**2.0.1 A0.** Run `npm run check` on main as it stands. A failing test is handled exactly as Turn
27's A0 handled it: a moved figure re-pinned with one line of reason, a real fault fixed if the
fix is plain and otherwise left red, that thread stopped and put first in section 0 of the report.
Nothing of the engine is touched in A0 beyond that. One commit, or none if nothing moved.

**2.1 Pack 1 of 09.10: the sanders, the cutter cases and the root [PIOTR, 09.10].** In the root
since commit 46713f3: `sprites-2x/0/` (eight files) and `sprites-2x/90/` (five), and the pack's
records. Chat checked the thirteen pictures against the game: each sander's canvas and anchors are
exactly the sprite contract's for the metres the game already gives that class (used 2 x 1 x 1,
budget 2 x 1 x 1.25, standard 2 x 1 x 1.5, pro 3 x 2 x 1.75, industrial 6 x 2 x 2), and the
pack's 90 view turns the model `(x, y, z)` to `(y, w - x, z)` (its `camera-QA.md`), which is the
game's own `.r`. The three cutter cases are 112 by 112, anchor 56, 104: the contract's canvas for
the 1 x 1 x 1 the three cutter sets declare.

- `git mv -f sprites-2x/0/sander.<class>.png public/sprites/sander.<class>.png` and
  `git mv -f sprites-2x/90/sander.<class>.png public/sprites/sander.<class>.r.png`, for the five
  classes, over the files there today (`-f`, because every destination exists). The pack draws
  all five again, the two of Turn 28 that stood off their anchors among them (Turn 29 section 8).
- `git mv sprites-2x/0/cutters<Kind>.standard.png public/sprites/` for Sash, Casement and Door.
  They are catalogue pictures: the cutter sets hold no floor and are never drawn on the hall (Turn
  28 2.5). The catalogue's class tile then draws the picture where it draws an empty box today,
  and the Sprite check row stops saying `no file yet`: `tests/ui/t28Families.test.ts` 370 to 385
  asserts the empty box and is flipped to the picture.
- The sanders' ports are measured again off the new pictures, eight lines in
  `src/engine/ports.ts` (the used sander has a vacuum of its own and still has none), as Turn 28
  measured them, and the Sprite check page shows no red port line [TUNE until Piotr confirms them
  on the hall].
- The game's README comes back: `git show 46713f3^:README.md` is the game's, with this turn's
  lines added (its briefs, reports and requests).
- Everything else of the pack goes, as it is, into `docs/art/pack-0910/`: the pack's README (as
  `docs/art/pack-0910/README.md`), `HANDOFF-CLAUDE.md`, `SHA256SUMS.txt`, `approval.json`,
  `approved-previews/`, `camera-QA.md`, `dimensions.json`, `masters-6x/`, `qa/`, `source/` and
  `validation.json`. The empty `sprites-2x/` goes. The root then holds what it held before 09.10.
- The dashes in the moved text files are replaced (section 1): `HANDOFF-CLAUDE.md` (4), the
  pack's `README.md` (4), `camera-QA.md` (1), `source/README.md` (1), `source/validate.py` (1).
  Five lines of `SHA256SUMS.txt` then no longer match their files: it is not edited, and a short
  `docs/art/pack-0910/EDITED.md` names the five files and says why.
- SPRITES.md section 15 (2.2) carries the thirteen files in a short table of its own.

### B. The line, bought whole

**2.2 The line's pictures [PIOTR, 11.10: "super"; "put the animation pictures into the code"].**
In `docs/pictures-t30/`, put there by this ZIP and untracked until the session adds them, with
`pictures-t30.json` (every file's size, anchor, metres, kind and hash, checked by chat; its
`problems` list is empty):

| Files | What they are |
|---|---|
| `windowLine1.standard.png` to `windowLine6.standard.png` | the six modules, view 0: 448 by 376, anchor 296, 368, 6 x 3 x 3 m |
| `windowLine1.standard.r.png` to `windowLine6.standard.r.png` | the art side's 90 degree views, renamed `.r` by chat: same canvas, anchor 152, 368 |
| `windowLine1.standard.work.sheet.png` to `windowLine6...` | the working motion: 5,376 by 376, twelve cells of 448 by 376 in one row, 6 frames a second, a loop of two seconds |
| `windowLine1.standard.work.json` to `windowLine6...` | the sheets' figures, the same six times: `{"frames":12,"fps":6,"frameWidth":448,"frameHeight":376,"anchorX":296,"anchorY":368,"loop":true}` |
| `windowLine6.standard.stack01.png` to `stack10.png` | one to ten wrapped windows standing on module 6's pallet: 448 by 376, anchor 296, 368, view 0 only, the windows alone (no pallet, floor or shadow) |
| `HANDOFF-L1.md`, `README-L2.md`, `dimensions-L1.json` | the art side's own notes (Polish) and measurements |

`README-L2.md` calls the motion a working draft for Piotr to judge. He has judged it: his answer 7
of 11.10 is "put the animation pictures into the code". It goes in tonight.

What chat checked: every canvas is the contract's for 6 x 3 x 3 m (`(6 + 3) x 48 + 16` = 448 by
`(6 + 3) x 24 + 3 x 48 + 16` = 376, anchors `8 + 48 x 6` = 296 and `8 + 48 x 3` = 152 at
`376 - 8`); every file is RGBA; the first cell of each sheet is identical, pixel for pixel, to
that module's picture. From the art side: the conveyor runs through every module at 0.9 m, in at
(80, 144.8) and out at (368, 288.8) in view 0, and the overhead rail of modules 5 and 6 at 2.8 m,
(80, 53.6) to (368, 197.6); the next module stands at (+288, +144) px, which is six metres along x,
so modules placed six cells apart meet end to end (Turn 29's stood about 38 px short and showed a
gap). The overlays are cumulative: each holds the windows of the ones before it, and the game
draws ONE of them, never several. Module 5's roof is clear so that its robot shows, and module 6
has an empty pallet on the floor at the end of its rollers, which the overlays stand on.

The 90 degree views turn the model the other way from the game's `.r`: the art side's is
`X = 3 - y, Y = x`, the game's `X = y, Y = w - x`. The line is never turned (2.4), so the six
`.r` files are on disk for the tests and the Sprite check page and are never drawn on the hall,
as the shelter's and the van's are. SPRITES.md says so.

To do, in task C1 with the six modules (a picture of 3 m standing over a spec of 2.5 m would fail
`tests/render/spriteClasses.test.ts`, and a sixth picture needs its family):

- `git add docs/pictures-t30`, then `git mv -f` the twelve pictures, the six sheets and the ten
  overlays into `public/sprites/` (the pictures over Turn 29's five modules and their `.r`), and
  run `npm run sprites:manifest`.
- The six JSONs are not served: their one set of figures is written once as a constant (2.11).
  The JSONs, `pictures-t30.json`, the two notes and `dimensions-L1.json` go to
  `docs/art/pack-1110/`, and `docs/pictures-t30/` is deleted.
- **Two new kinds of file.** A work sheet (`<family>.<class>.work.sheet.png`) and a stack overlay
  (`<family>.<class>.stackNN.png`) are neither a class's picture nor a turned one. Every place
  that lists, counts or picks files learns them: `pictureFor` and `pickSprite` build
  `${spriteKey}${tier}${suffix}.png` and never pick one, but the count of class pictures, the
  count of turned pictures, the Sprite check page's list and anything else that reads the
  manifest by pattern must be checked and taught, and the report says where. The characters'
  manifest is built from `character.*.json` only and is not touched.
- SPRITES.md section 15, `The production line of six modules, its motion and pack 1 of 09.10
  (Turn 30, 11.10.2026)`: the table of the 28 pictures of the line and the 13 of pack 1, the 90
  degree note, the sheets and the overlays and how the game uses them (2.11, 2.12), and that
  section 13's five modules are replaced. Section 13 keeps its history with one line pointing to
  15.

**2.3 Six modules, one purchase [PIOTR, 11.10: "one whole", "the whole cost 10 million", "3:
yes"].**

*2.3.1 The six.* `LINE_MODULES` is `windowLine1` to `windowLine6`. Each is a family of one class,
`standard`, 6 x 3 x 3 m (the height 2.5 of the specs and of `lineModuleVariants` becomes the art
side's 3), its zone its footprint, category `machine`, tab `line`, the 800 m² unit (`minUnitM2`),
built to order (`BUILT_TO_ORDER` gets the sixth), delivered in 30 working days. Their prices are
the share of the whole that each carries for the insurance, the books and the sale [PIOTR: the
whole is 10 million; TUNE: chat: the shares]:

| Family | Name | Share | What it is (from the pictures) | Its stage (2.5) |
|---|---|---|---|---|
| `windowLine1` | Window line, module 1 | 2,000,000 | A cross cut saw at the infeed and a planer behind it: each board is fed, stopped at the blade, cut to length and planed on all four faces. | Cross cutting, Planing |
| `windowLine2` | Window line, module 2 | 2,500,000 | A five axis CNC built into the line, a gantry over the conveyor with a tilting head and a carousel of tools: the profiles and the joints of every frame. | Moulding |
| `windowLine3` | Window line, module 3 | 1,250,000 | Through feed sanding: brush heads and a belt over the conveyor, the parts going in at one end and out sanded at the other. | Sanding |
| `windowLine4` | Window line, module 4 | 1,250,000 | A frame press: the four sides cramped and the frame squared, then it opens and the next frame comes in. | Pressing |
| `windowLine5` | Window line, module 5 | 1,500,000 | A spraying robot in a closed cabin with a clear roof: each frame is lacquered and hung on the overhead rail. | Finishing |
| `windowLine6` | Window line, module 6 | 1,500,000 | The glazing table: a frame comes off the rail onto the table, suction cups lower the glass into it, and a robot wraps the window and stacks it on a pallet. | Glazing |

`LINE_PRICE` is the sum of the six, 10,000,000, written as the sum and never as a literal of its
own. Module 1 is drawn with its saw now: the Turn 29 caveat that it was drawn with no saw goes from
the code, the card and SPRITES.md. The sentences of the table are each module's `description`.

*2.3.2 No requires.* Module 1 no longer asks for a five axis CNC and a frame press [PIOTR, 11.10:
"3: yes"], and no module asks for the one before it: every module's `requires` is empty. A five
axis CNC or a press the company has stays and does what it does (2.5).

*2.3.3 The catalogue sells the line as one thing* [TUNE: chat: module 1's family stands for the
line in the catalogue, so no new kind of catalogue line is written]. The `line` tab shows ONE
folder: module 1's, whose `folder` is now `Production line` and whose `effect` is `Makes windows
from the board to the pallet: six modules in one line, 36 m long.`; its line reads `from
£10,000,000` (`LINE_PRICE`, by a case in `renderFolders`, since module 1's own price is its share).
Opened (`renderOpenFolder` prints the folder's name as its heading), it holds one card, the line,
drawn by a case of its own in `renderMachine` in place of module 1's class card: `Window production
line`, `LINE_PRICE`; a row a module, `Module 1: cross cutting and planing` and so on, from 2.3.1's
names and `LINE_COVERS`, with module 5's row reading `Module 5: the Finishing, sprayed and hung on
the overhead rail` and module 6's `Module 6: the Glazing, then wrapped and stacked on a pallet`;
a line for what it does without its contract (`With two engineers, timber work goes 2.4 times as
fast`, from `LINE_FACTOR`) and one for the contract (`It can make windows on a contract of its own:
one every 2 hours`, from 2.7); `Sold whole, for half its price; the upgrades go with it`; the costs
every card prints (the wait, the power of the six, the insurance of the whole, the floor `36 m by
3 m`); one Buy. Turn 29's `lineModuleLines` (whose `the Finishing excepted` is no longer true from
level 5) is replaced by this card. Below the line's card, in the same folder, the four upgrades
(2.10). Modules 2 to 6 have no folder and no card anywhere in the catalogue's tabs; each keeps its
tile on the Owned tab, as every machine has, with its name and state.

*2.3.4 Buying it.* `canBuy` asked of `windowLine1` is the line's check. Its refusals, in order:

1. `Needs the 800 m² unit`, straight after the reputation's (Turn 29 2.5.1).
2. `The company has its production line`, while any module stands unsold or is on order [TUNE].
3. `Not enough cash`, against `LINE_PRICE`.
4. `The kit is half shifted. Finish the move first`, while anything is half shifted.
5. `No free 36 m by 3 m in the hall` (2.4).

`canBuy` asked of `windowLine2` to `windowLine6` refuses with `It comes with the line`, and no
screen offers them.

The order path that a Buy click takes puts the six on order in one click: six `OnOrderItem`s on
one due day, each at its cell (2.4), each with its share as `pricePaid`; the cash leaves once,
`LINE_PRICE`; the ledger books one line, `Window production line ordered` [TUNE: chat] (if that
path cannot book one line without a second track, it books one a module and the report says so).
It is built to order: no module's order is called off, and each order tile says `Built to order:
it cannot be called off`, as today. On the due day the six stand in their places by themselves
(built in by the fitters, not heavy kit, no unloading, no picture at the gate), as Turn 29's
modules do. `buyEquipment`, the instant purchase the tests' `buyNow` uses, stands the six at once
in the same places for the same price when it is asked for `windowLine1`.

*2.3.5 Selling it.* The line is sold whole [TUNE: chat]:

- `canSell` of a module asks the six: `Somebody is standing at it` while a man stands at any of
  them, `Sold, collection tomorrow` once sold. `Sell the module after it first` and
  `laterModuleHeld` go.
- On every module's Owned tile the button reads `Sell the line for £5,000,000` (half of what the
  six cost, `salePriceFor` summed), and the tile's own `Confirm sale` step follows as it does
  today.
- `sellMachine` of a module marks all six sold, for the next working day.
- `collectSoldMachines` takes the six together: one ledger line, `Sold: Window production line`,
  for the six halves, and one `machineCollected` card, `Window production line collected`.
- The upgrades (2.10) are emptied at the sale, for nothing, and a running line contract ends that
  day (2.6).

*2.3.6 Its engineers* (Turn 29 2.8, otherwise unchanged). One keeps three modules and two keep
all six: `LINE_MODULES_KEPT` is `[0, 3, 6]`, and the duties read `Keeps the production line
running. One keeps up to three modules, two keep all six.` The Our team tile already counts the
modules that stand (`The line runs as 3 of its 6 modules.`).

*2.3.7 What it costs to own* (Turn 29 2.10, for six). Kept by its engineers (not serviced, no
life, never breaks down by day or at night), never a burglar's target, out of the security firm's
price, in the insured value, 60 a day of power a module, extraction of its own, built to order.
So a month in the 800 m² unit: two engineers 30,000, power 10,800 (six modules, 60 a day, thirty
days), and the property cover on 10,000,000 if the company holds it, about 33,333 (2 per cent a
year, twice in that unit). Print the built game's own figures in the report.

**2.4 Where it stands, and moving it [PIOTR, 10.10: "yes, move it"].**

*At the order.* The six take the first clear run of 36 by 3 cells at orientation 0, module N at
x + 6 (N - 1): asked at `WINDOW_LINE_ORIGIN`, which becomes (2, 14) (the line along the middle
of the front half of the 800 m² hall, cells x 2 to 37, y 14 to 16), and then cell by cell in the
order `firstFreeCell` searches a machine's place. Clear is what `canPlaceSpec` asks of one
machine, asked of the 36 by 3: inside the hall, no room, not the gate lane, nothing standing or
held for a delivery on it. None found: `No free 36 m by 3 m in the hall` [TUNE: chat]. Turn 29's
fixed place and its refusal that names what stands on it (`lineModuleFloorCheck`, `Move the ...
off the line's 6 m by 3 m`) go.

*Moved as one.* In setup mode the player takes hold of any module, or of the outline of one on
order, and the whole line comes with it: all six by the same cells. While it is dragged the hall
draws the six at the drag together, in the one place it draws a dragged item. The drop is the
engine's: `moveItem` of a module moves the six or none, through `canPlace`, which for a module
asks the whole 36 by 3 at the new place, clear of everything but the line itself, and refuses
with `The line needs a clear 36 m by 3 m` [TUNE]. The guard in the setup drag
(`if (isLineModule(item.specId)) return false;` in `src/ui/app.ts`), `LINE_STANDS_WHERE_BUILT`
and its two refusals in `canPlace` go.

*The move's books.* The `MOVE_ITEM` reducer records a move for the dragged item only today
(`recordMove`, in `src/engine/game.ts`): for a module it records all six. `endSetup` asks about
the heavy items it recorded (`itemIsHeavy`): for this question a module counts as heavy too, so
the card reads `Moving 6 machines takes 6 h`, without a module becoming heavy kit anywhere else
(its delivery is still built in, with no unloading) [TUNE: chat]. `Put them back` puts back every
recorded item, so the six. The line makes no window while it is being moved (2.7).

*Never turned.* A turn of a module is refused, `The line is never turned` [TUNE: chat]: its
conveyor runs one way, and its `.r` pictures are the other turn (2.2).

*The walk.* A 36 m line in a 40 m hall leaves two ends of two metres for the men to walk round to
its front, where they stand at it (`STATION_TABLE`, the front). Nothing of the walk changes
tonight: the report shows a man walking round the line, and says so if a piece of kit standing at
an end cuts the front off.

**2.5 What the six do without a contract [PIOTR, 11.10: "1: yes", without one it speeds the window
jobs as today].** Turn 29 2.9.4 to 2.9.8 hold for six modules, with these changes:

| Stage of a timber job (its id) | Done on, from level |
|---|---|
| Cross cutting, Planing (`crossCutting`, `planing`) | `windowLine1`, from 1 |
| Moulding (`moulding`) | `windowLine2`, from 2 (four times, as Turn 29) |
| Sanding (`sanding`) | `windowLine3`, from 3 |
| Pressing (`pressing`) | `windowLine4`, from 4 |
| Finishing (`finishing`) | `windowLine5`, from 5 (new: the line sprays now [PIOTR, 10.10]) |
| Glazing (`assembly`, labelled `Glazing` on a timber job) | `windowLine6`, from 6 (new) |

- `LINE_COVERS` gains `finishing: 5` and `assembly: 6`. There is no stage id called `glazing`: a
  timber job's Glazing is the `assembly` stage (`TIMBER_STAGES`), and `LINE_COVERS` is asked only
  of a timber job (`stageFamilyIn`), so a sheet job's assembly at the bench is untouched. With a
  line bought whole only levels 0, 3 and 6 happen (no engineer, one, two); the table is written
  for every level all the same.
- `LINE_FACTOR` is `[1, 1.4, 1.6, 1.8, 2.1, 2.4, 2.4]` [TUNE: chat: the whole line gives what Turn
  29's five gave]. It acts on every stage of a timber job as in Turn 29, and on the Finishing too
  while module 5 does it; below level 5 the Finishing is at the booth with no factor, as on v88.
- The night the lacquer dries stands as it stands: module 5 brings none of it forward [TUNE].
- `MACHINE_CAPACITY` gives modules 5 and 6 thirty three places each, as 1 to 4 have, so the line is
  never what a hall is short of. While module 5 does the Finishing, the men on timber are counted
  at its places and not at the booths', for that time.
- **The spray booth is still always asked** [TUNE: chat]. A window or a door is lacquered, and the
  three places that ask for a booth by name (`kitBlockFor` in `src/engine/board.ts`,
  `availableFinishes` in `src/engine/catalog.ts`, and the `no spray booth` stop of `hallStops` in
  `src/engine/jobs.ts`) are not changed: the booth is where a window's Finishing goes back to
  whenever the line does not run whole or runs its contract, and a job must never stop for want
  of one. So module 5 stands in for nothing on the board. Modules 1 to 4 stand in as in Turn 29
  (`TIMBER_STAND_INS`), while the line stands whole (`lineModules` is 6) whatever the engineers
  keep today, and not while the line's contract runs (2.6).
- Boards: `LINE_BOARD_SAVING` 3 per cent a module, 18 with the line [TUNE: chat]; none for a job
  taken while the line's contract runs.
- The tables Turn 29 gave the five give the sixth: `TIMBER_FAMILIES`, `STATION_TABLE` (the front),
  `MACHINE_SHORT_WORDS` (`line module`), `DUST_OUTPUT_M3_PER_HOUR` (nought), `BUILT_TO_ORDER`.
  `isServiced`, `overdueBreakdownChance`, `burglaryTargets`, `lineValue` and the Machines page
  read `isLineModule` and so take it with no line of their own.
- The Output sheet and the top bar's plate keep one line for the line (`Production line, 6
  modules`, `3 modules`, `standing still`). While the line's contract runs the line reads
  `Production line, on its contract` and gives the jobs nothing [TUNE].

One function says what of the line the jobs get: `lineLevelForJobs(state)`, nought while the
line's contract runs and `lineLevel(state)` otherwise. `lineModuleFor` and `lineFactor` read it;
`lineLevel` itself is unchanged and is what the engineers' tile, the strip, `familyRuns` and the
contract read.

### C. The line's own contract

**2.6 The contract [PIOTR, 10.10: "about 1,500 pounds a window, a standing order, material 40,
labour 20, the rest profit, one window every two hours"; 11.10: "1, 2, 5, 6: yes"].**

*A record of its own* [TUNE: chat]. The line's contract is not one of `state.contracts`: it is
not counted against `CONTRACTS_MAX`, no man is put on it, it has no week to meet, no short week,
no reputation, no term, no renewal and no price drawn off a band, and it draws nothing off the
seeded stream, so no other offer, job or event of any save moves by a step. Nothing of
`contracts.ts` changes for it. It lives in the state's own field (section 4) and its own small
module of the engine (`src/engine/lineContract.ts` [TUNE: the name]).

*Offered.* At the open of a working day, when all six modules stand, two line engineers are on
the books, no line contract is offered or running, and the day is not before `nextOfferDay`
(null until the first offer; set a week on, `DAYS_PER_WEEK` days, whenever an offer is turned
down or a contract ends [TUNE]). The step sits at the end of `startDay`, after the day's kit has
landed and its cards are queued, so a line that lands with two engineers already hired is offered
its contract that morning. It is offered by an event card, a new `GameEventKind`,
`lineContractOffered`, in the event modal as it is: title `Windows off the line`, body `A window
company will take every window your line makes, at £1,500 a window. The timber and the glass for
each one are bought as it is made, £600 a window. The line makes one every 2 hours, about 20 a
week, and the client collects each pallet of ten the next working day. It runs until you end it.`,
the figures from the constants and `lineWindowMinutes`; two choices, `Take it` and `Not now`. As
for every card of two choices today (`End of day`), it has no cross and Escape does not close it:
the player answers it. Taken, it runs from that minute. The client has no name [TUNE: chat]: the
contract's name is `Windows off the line`.

*Its terms* [PIOTR]. `LINE_WINDOW_PRICE` 1,500. `LINE_MATERIAL_SHARE` 0.4, so 600 of material a
window, written from the two and never as a literal. The labour, 20 per cent, is the two
engineers' wages, which the month already pays: there is no charge of its own for it.

*While it runs, the line makes only its windows* [PIOTR, "1: yes"]. `lineLevelForJobs` is nought,
so no module does a stage of any job or of a timber contract piece, `LINE_FACTOR` is 1 for them,
no module stands in on the board (a window job then wants the company's own machines, and its tile
names the missing ones as for any missing kit) and a job taken gets no boards saved. A job in
production at the minute the contract is taken goes on at its stages' old machines, or by hand,
from that minute: nobody waits, as when an engineer is away in Turn 29.

*Ended.* By the player at any time, with the running block's `End it`, at one click and asking
nothing, as the Contracts tab ends a contract today; or when the line is sold. Ended, it is
offered again a week later (`nextOfferDay`).

**2.7 How a window is made.**

- `LINE_WINDOW_MINUTES` 120 [PIOTR: "one window every two hours"], less `LINE_UPGRADE_MINUTES` 15
  for each upgrade fitted (2.10), never below `LINE_WINDOW_MINUTES_MIN` 60 [PIOTR: "up to one window
  an hour"]. One function gives the minutes a window, `lineWindowMinutes(state)`, and the card, the
  running block and the minute all read it: C3 writes it as 120 and C5 teaches it the upgrades,
  so C3 is a whole game without them.
- The line's minute runs from `advanceMinute`, beside `runProductionMinute`, and asks for itself
  what `runContractMinute` asks: not the dinner hour (`isBreak`, since production runs through it
  when the owner skips his break) and not after five (`crewHasGoneHome`, since production runs on
  while the owner stays), on a working day. In such a minute the window in hand moves on by one
  while the line runs whole: `lineLevel` is 6, which is two engineers on duty. With one on duty the
  line runs as three modules and makes no window that minute; with none it stands still; while it
  is being moved (`movingMachines`) it makes none. Not on the second shift: the engineers work by
  day [TUNE: chat]. The hall's crowding, its dust and its labourer do not touch the line's minute:
  it is the line's own [TUNE].
- At `lineWindowMinutes` the window is made and the minutes over carry into the next one, across
  days: four a working day at 120, eight at 60.
- A window made books £1,500 in on the contract line, one growing line a day, as a contract piece
  is booked (`charge(state, 'contract', 'Windows off the line: windows', price, { merge: true })`),
  and £600 out on the material line, one growing line a day: `charge(state, 'material', 'Windows
  off the line: timber and glass', -material, { unavoidable: true, merge: true })` (`pay` never
  merges, and without `unavoidable` the overdraft floor would refuse it in silence). The bank
  counts the 1,500 as sales, as it counts every contract piece.
- Nothing is ordered, delivered or unloaded; nothing comes off the racks or the timber stores; no
  glass is ordered and no night is stood [PIOTR, "5: yes"]. No man works on it and no minute of
  any man, no labour value and no hour of any machine is booked for it: the rate and the
  efficiency are the men's.
- The window goes onto the pallet (2.8).

**2.8 The pallet and the gate [PIOTR, 10.10: "ten of them, the forklift takes it to the door, and
there it disappears the next day"; 11.10: "6: yes"].**

- `LINE_PALLET_WINDOWS` 10. Each window made stands on the pallet at module 6, drawn by its overlay
  (2.12). The tenth sends the pallet to the gate at once, and the next window starts a new one.
- At the gate the full pallets wait for the client. They are drawn at `LINE_PALLET_LAYOUT`,
  `{ x: 0, y: 10, width: 2, depth: 1, height: 1.75 }`: the first row of the floor the second
  extension added, along the left wall just past the end of the gate lane [TUNE: chat]. The lane
  itself is no place for them: the lorry, the pallet of sheets and the machines waiting to be
  unloaded (drawn from y 7 down, at their own footprints) and the finished goods (y 9) all draw
  there already. They are drawn in the way the finished goods are drawn: one box a pallet in the
  kit stock colours, two at the most, and one label, `Windows for collection: 1 pallet` or `2
  pallets`, hung so that it does not sit on the finished goods' label. Nothing holds those cells:
  if kit stands there, the boxes are drawn with it in the depth order, and the report shows it.
  That stands until the art side's pallet and forklift (L3) come: no forklift is drawn and no man
  carries the pallet tonight, and the forklift the company may own is not used.
- At the open of the next working day (`startDay` runs on working days only) every pallet at the
  gate is gone, taken by the client at no cost and with no line in the ledger: its windows were
  paid as they were made.
- A part pallet when the contract ends goes to the gate as it is and is taken the next working
  day.

**2.9 What the player reads.**

- **The Orders board's Contracts tab**: the running line contract first, in the classes a running
  contract's block has there and through the rows the tab already writes: its name, `Windows off
  the line`; `£1,500 a window; the timber and the glass £600 a window`; `One window every 2 hours:
  about 20 a week` (from `lineWindowMinutes`; with an upgrade, `every 1 h 45 min: about 22 a week`,
  the week's windows rounded down); `This week: 7 windows. In all: 112`; `On the pallet: 7 of 10`;
  `At the gate for collection: 1 pallet` while there is one; `Standing still: one engineer on
  duty` or `no engineer on duty` while the line does not run whole; and `End it`. The Work Plan's
  Contracts tab does not show it: nobody is put on it.
- **The warning strip**: `lineNeedsEngineer` as Turn 29 wrote it. Nothing new.
- **The hall**: the six play their sheets while they work (2.11), module 6 shows the windows on its
  pallet (2.12), the pallets at the gate wait with their label (2.8).
- **The month**: the windows in the contract line and their material in the material line.
  Nothing new.

### D. The upgrades

**2.10 Four upgrades to one window an hour [PIOTR, 11.10: "later add ons can be bought, better new
knives, better software, so that it later speeds up to one window an hour; think what to add
later"; TUNE: chat: the four, their prices, the fifteen minutes each and everything below].**

| id | Name | Price | What it is (its card's sentence) |
|---|---|---|---|
| `lineTooling` | Diamond tooling | 400,000 | Diamond tipped knives and cutters for modules 1 and 2: the timber feeds faster and the tools are changed less often. |
| `lineSoftware` | Line software | 300,000 | One program for the whole line: each window's cutting list and profiles go to every module in turn, with no stop between sizes. |
| `linePress` | Servo press | 500,000 | Servo cramps and a second table in module 4: one frame is squared while the next is loaded. |
| `lineSprayRobot` | Second spraying robot | 600,000 | A second robot in module 5 and a warm drying run on the overhead rail: the lacquer is no longer the slowest step. |

1,800,000 for the four; each takes `LINE_UPGRADE_MINUTES` 15 off every window of the line's
contract, so 120 becomes 105, 90, 75 and 60.

- **Not kit.** No spec in `EQUIPMENT_SPECS`, no picture, footprint, place, power, insurance or
  service: a table of their own, `LINE_UPGRADES`, and on the state the list of those fitted or on
  their way, each with the day it is fitted (section 4).
- **Bought in the line's folder**, under the line's card, one card each in the class card's
  classes: its name, its price, its sentence, `Takes 15 minutes off each window of the line's
  contract` (from the constant), `Fitted 10 working days after the order` (`LINE_UPGRADE_DAYS`
  10), and Buy. A refusal shows as the locked Buy with its reason under it, as for kit: `Needs the
  production line` until the six stand, `Being fitted: ready on <day>` while on its way, `Fitted`
  once fitted, `Not enough cash`. One of each. The cash leaves at the click (`Line upgrade:
  Diamond tooling`); never called off, never sold on its own.
- **What it does**: the windows of the line's contract only, through `lineWindowMinutes`. Nothing
  of the jobs, `LINE_FACTOR` or the boards changes with it.
- **Sold with the line**: the line sold, the list is emptied, with nothing back.
- **Not drawn**: the modules stay as the art side drew them. Whether the second robot and the
  servo press should be drawn is on the art side's list (E1).

### E. The moving pictures

**2.11 The work sheets [PIOTR, 10.10: "a view of the windows moving along the line, of the arms
working"; 11.10: "put the animation pictures into the code"].**

- `MACHINE_WORK_SHEETS`: the six modules' sheets and their one set of figures (twelve frames, 6 a
  second, cells of 448 by 376, anchor 296, 368), written once, from the art side's JSON.
- **When a module works** [TUNE: chat]: only while the clock runs (the test `driveSound` makes:
  `state.speed > 0`, no event open, the game not over), and then: while the line's contract runs
  and the line runs whole, all six, in the minutes the line makes windows (2.7); without the
  contract, a module the hall already reads as in use, `machineInUse` (a man drawn at it this
  minute: the one test the hall's blades, chips and breathing read, so what moves and what is
  seen are one picture). Otherwise it stands on its picture. Frame 0 is that picture, pixel for
  pixel, so the change is never seen as a jump.
- A module that works is drawn from its sheet in place of its picture: the same box, the same
  anchor, the same shadow and name, an `<svg>` clipped to one cell by its view box over an
  `<image>` of the whole sheet, exactly as a man's figure is drawn (`characterArt`, `cellBox`),
  marked `data-sheet` with its frame, frames and fps.
- One function moves every sheet on to the frame the moment asks, in the shape of
  `playCharacters` (`playSheets`): it writes the frame and the view box on elements that are
  already there, only when the frame changes, and builds nothing. It is called in two places, and
  both are needed. In `runFrame`, beside `playCharacters`. And at the end of `render()`, beside
  `syncFigures` and `syncDoors`: every page written patches the hall's live part from fresh markup
  that carries frame 0, and `render()` runs after `runFrame`'s own call in the same frame, so
  without the second call the six would flash back to frame 0 on every page written, once a minute
  below 30x and five times a second above it. That is the "shake like a leaf" the figures had
  (PIOTR, 17.09; CLAUDE.md T19 2.1), and `syncFigures` is how the figures were cured of it.
- The frame comes from real time, the same for all six, so the line plays in step, as the art side
  made it to be seen. At any speed of the clock a sheet plays at its own 6 frames a second
  [TUNE]. The moment the clock stops, `playSheets` holds every sheet where it is (it is told by
  the same test), and the next page written draws the six from their pictures.
- Nothing else of the v87 and v88 frame loop changes.

**2.12 The windows on the pallet.** Module 6, standing with N windows on its pallet (1 to 9), is
drawn with `windowLine6.standard.stackNN.png` over it, in the same box and anchor and in the same
drawable as the module, so that nothing is painted between them; with an empty pallet, with none.
The overlay is drawn whether the module plays its sheet or stands on its picture. `stack10` is on
disk and is not drawn tonight: the tenth window sends the pallet to the gate (2.8). It waits for
the forklift of L3.

## 3. How to run this session

**One writer.** Only the lead agent edits files under `src/` and `tests/`, changes STATE_VERSION
or APP_VERSION, commits and pushes, and it does the tasks strictly in the order of section 5, one
at a time. No worktrees and no parallel branches.

**Sub-agents are allowed, under that one rule** [PIOTR, as in Turns 28 and 29]. They may only do
work that touches no file another agent is touching: read the repo and report; build the mockups
of section 9 under docs/mockups/t30/; measure the sanders' ports off the new pictures and hand the
numbers to the lead; draft test cases for the lead to add; review each finished task's diff
against this brief and section 7 before its commit; write docs/art/REQUESTS-T30.md and
docs/notes-t30.md. A sub-agent never commits, and never runs `npm test`, `npm run build` or `npm
run check` while the lead's own check is running (2.0). If a sub-agent's result disagrees with
this brief, the brief wins.

**Do not stop and do not ask.** Piotr is not watching and nobody will answer a question. Where
this brief leaves a choice open, take the simplest reading that fits what is already in the repo,
mark it [TUNE] in the code and list it in the report. The only reasons to stop are the brief's
own: the first line of CLAUDE.md is not "Turn 30", or APP_VERSION on main is not 'v88'. A red
test is not a reason to stop the session: handle it as 2.0.1 says.

**Push after every task**, so that nothing is lost if the session ends early. If the session runs
short: stop cleanly at the end of a task, never in the middle of one, and say first in section 0
of the report which tasks were not reached. Section 5 is in the order of what matters and is built
so that every stopping place is a whole game.

## 4. State

STATE_VERSION 43, once, in the first task that needs it (C1). C1 writes the whole of the new state
field with every part's default, the parts that C3 and C5 will use among them, so that the one
lift is the only one. A v42 save opens with:

- **The new field**, with its defaults: the line's contract (none), the next offer day (none), the
  minutes into the window in hand (0), the windows on the pallet (0), the pallets at the gate (0),
  the upgrades fitted or on their way (none). Chat's names, which the session may better:
  `state.windowLine = { contract, nextOfferDay, minutes, onPallet, palletsAtGate, upgrades }`,
  with `contract` either null or `{ status: 'offered' | 'active', startDay, windowsThisWeek,
  weekStartDay, windowsMade, revenue, materialCost }`, and `upgrades` a list of `{ id,
  fittedOnDay }`. It is added by the raw lift, `liftToVersion43`, beside `liftToVersion42`.
- **Turn 29's modules taken back, and their money given back.** Every module of the line in the
  save (`windowLine1` to `windowLine5`) that stands unsold or is on order is removed: an order
  gives back its `pricePaid`, a standing module what it cost (`purchasePrice`). A module already
  sold and waiting for its van is left for the van, which pays its half the next morning as today
  (`sellMachine` marks it, `collectSoldMachines` pays). The raw lift works on JSON and cannot book
  a line: the money goes back on the whole state after the raw lifts, the road
  `takeTheTimberToolsBack` took in v53, gated `version < 43`, through `receive(state, 'equipment',
  'Production line refunded: it is sold whole now', back)` [TUNE: chat: the words], one line for
  the whole of it. The module's reservation, its record in `movedItems` and anything else that
  points at it go with it.
- **The player is told once**, by an event card at the first settle after the save is loaded, a
  new `GameEventKind`, `lineRefunded`, pushed onto the queue as Turn 29's `contractsTrimmed` is
  (or queued with `queueEvent` in the whole state step, whichever is the smaller): title `The
  production line is sold whole`; body `The line is bought as one now: six modules for
  £10,000,000.`, then one sentence for each thing removed, `Your order for Window line, module 1
  is cancelled and £1,500,000 is back in the bank.` or `Window line, module 3 is taken back and
  £750,000 is back in the bank.`, and last, only when there are any, `Your line engineers stay on
  the books.`; one choice, `Right`. No card for a save with no module removed.
- **Nothing else changed**: no job, man, machine, board, price or place of a save is touched. The
  engineers stay; the five axis CNC and the robot stay.

Piotr's own save is the case to test: day 999, the 800 m² unit, `windowLine1` on order. A save of
that shape must open with 1,500,000 more in the bank, no module, and the card. Assert it on a raw
save in tests/cloud/migrate.test.ts, as Turn 29's lift is asserted. Every save that loads today
loads, the fixtures among them. Say in the report what the lift does, what fields were added and
where, and list the version pins flipped.

## 5. Task queue, in order

Branch turn-30-line-whole from main. One commit per task, npm run check green on its own exit code
before each, the branch pushed after each, two report lines per task in REPORT-T30.md.

T30-A0 The suite on v88 (2.0.1).
T30-A1 Housekeeping and v89: docs/turn-29-brief.md is already in docs/ (this ZIP put it there),
this file as CLAUDE.md, APP_VERSION 'v89', the version pins. The README's lines go in with B1,
which brings the game's README back.
T30-A2 The mockups of section 9 into docs/mockups/t30/ with a README.
T30-B1 2.1 pack 1 of 09.10: the sanders and their ports, the cutter cases, the root, the README
(its lines for Turn 30: docs/turn-29-brief.md among the briefs, REPORT-T30.md among the reports,
docs/art/REQUESTS-T30.md among the requests).
T30-C1 2.2, 2.3, the place at the order of 2.4, and 2.5: the line's 28 pictures in with the two
new kinds of file and SPRITES.md section 15, six modules of 3 m sold as one, bought, sold, what
the six do without a contract; with STATE_VERSION 43 and the whole lift of section 4. The line is
bought, stands and speeds the window jobs at the end of this task, and not before: do not land a
line that can be bought and does nothing.
T30-C2 2.4's move: the line moved as one in setup mode, its books, never turned.
T30-C3 2.6 to 2.9: the line's contract, its windows, the pallet and the gate, what the player
reads.
T30-C4 2.11 and 2.12: the sheets and the windows on the pallet.
T30-C5 2.10: the four upgrades.
T30-E1 notes (docs/notes-t30.md) and docs/art/REQUESTS-T30.md: L3, the pallet of ten wrapped
windows standing alone (its windows as the overlays' are: 1.10 by 0.08 by 1.44 m each, 0.082 m
apart along Y, their bottom at 0.228 m: README-L2) and the forklift with a driver carrying it, in
four directions, empty and loaded; whether the four upgrades should be drawn (the second robot in
module 5, the servo press in module 4); the line's 90 degree convention for any picture that may
one day turn; anything that sits badly on the hall, a seam between two modules among it.
T30-E2 scenarios, one line a moved figure, and five new ones. (ccc): a v42 save shaped as Piotr's
(the 800 m² unit, module 1 on order) opens with 1,500,000 back and the card; one with no module
opens with no card. (ddd): a company in the 800 m² unit with 10,000,000 is refused the line in a
400 m² unit, with too little cash and with no free 36 by 3; buys it in one click; the six stand on
one morning at cells x 2 to 37, y 14 to 16; are moved as one in setup mode, refused onto a rack and
refused a turn, and put back; two engineers are hired; a window job's Cross cutting is on module
1, its Finishing on module 5 and its Glazing on module 6, at the engine's own pace. (eee): the
offer card comes at the first working morning with the six standing and two engineers on the
books; taken; a window every 120 minutes and four a working day, each £1,500 in and £600 out;
none in the dinner hour when the owner works through it; the tenth goes to the gate and is gone
the next working morning; with one engineer away no window is made that day; a window job taken
while it runs gets no line and no boards saved; ended, the jobs have the line again and the card
comes back a week later. (fff): the four upgrades bring the window to 60 minutes and eight a
day; the line sold takes them with it, for 5,000,000 on one ledger line. (ggg): the hall draws the
six from their sheets while the contract runs and the clock runs, and from their pictures once the
clock is paused and the page written again; module 6 shows the overlay of the windows on its
pallet, and none when it is empty.
T30-E3 cross check. T30-E4 look and shoot: the pictures of section 7 into docs/report-t30/.
T30-E5 report (REPORT-T30.md, section 0 first: what was not reached, what is red, section 10's
list with what was built, and the month of the line from the built game: at 120, 105, 90, 75 and
60 minutes a window, the windows, the money in, the material, the engineers, the power, the
property cover if held, and the months to pay back the line and the upgrades bought) and PR titled
`Turn 30: the line bought whole, its windows contract, its upgrades and its moving pictures`, do
not merge, end the session.

**Tests chat already knows will move.** This list was checked against v88; it is a start and not
the whole, and the lines are v88's. Each is flipped to say what is true now, never kept beside a
new one.

- A1: `tests/ui/saveCheck.test.ts` 138 and 139; `tests/ui/version.test.ts` 59 and 75;
  `tests/engine/v67.test.ts` 100; `tests/engine/types.test.ts` 53; `tests/cloud/migrate.test.ts`
  152, and its pins of the lifted version at 297, 429, 648, 740, 836, 863, 875, 889, 908, 939,
  997, 1109, 1158, 1197, 1248, 1279 and 1406 (every pin of 'v88' and of STATE_VERSION 42).
- B1: `tests/ui/t28Families.test.ts` 370 to 385 (the cutter card's empty picture box and the
  Sprite check row's `no file yet`); `tests/engine/ports.test.ts` (the sanders' lines).
- C1: `tests/engine/rotate.test.ts` 252 and `tests/render/spriteClasses.test.ts` 215 and 255 (the
  counts of 107); `tests/render/spriteClasses.test.ts` 172 to 191 (each picture's box against its
  class's metres: the modules at 3 m); `tests/ui/t29Families.test.ts` 36 (the 22 pictures of Turn
  29, of which the five modules change size and a sixth comes); `tests/engine/t29CrossCheck.test.ts`
  97 (the eleven Sprite check targets, read off `LINE_MODULES`); `tests/engine/metres.test.ts` (the
  modules' metres); `tests/engine/t29Line.test.ts` (bought one by one, the requires, the fixed
  place and its refusal, never moved, sold from the end, three of five);
  `tests/engine/t29Engineer.test.ts`; `tests/scenarios/turn29.test.ts` (zz);
  `tests/ui/catalogueTabs.test.ts` (the line tab's folders); `tests/engine/dust.test.ts` (a row
  for the sixth).
- Not moving, though they buy the whole catalogue: `tests/engine/layout.test.ts` and
  `tests/engine/zones.test.ts` already pass over kit the unit refuses for its size, and no module
  is ever bought in their 200 m² unit. Leave them alone.

## 6. Do not (tonight)

- No limit on the men of a normal job, and nothing of `addToJob`, `assignJob`, `canBuild`.
- No change to the standing contracts the joiners make: their offer, stream, price, bands, term,
  short week, renewal, four men and payment. The line's contract is a record of its own (2.6).
- No change to a sheet template, a sheet stage, its shares, or a sheet job's plan.
- No change to the places, pace, price or power of any family but the six modules; no change to
  what asks for a spray booth (2.5).
- No change to the tax, the loan, the overdraft, the bank, the wages, the owner's base, the
  reputation, the insurance's rate, or the security firm's price (the line stays out of it, as in
  Turn 29).
- No change to `crewByFamily`, `MAX_CATCH_UP_MS`, the paced redraw or the sprite cache headers of
  v87 and v88, beyond the two calls of `playSheets` (2.11).
- No picture drawn, repainted, trimmed or scaled by an agent; no placeholder drawn for a forklift;
  no figure for the engineer; no sound; no new screen or CSS token. The new kinds of event card
  are two: `lineContractOffered` and `lineRefunded`.
- No storage access outside src/cloud/store.ts; no PixiJS, mobile, Steam, Electron.
- No watch loops, nothing left running.

## 7. The cross check (before the PR)

- `npm run check` green on its own exit code; the count of tests and files in the report; every
  `it.skip` in the tree listed with its line of reason (the aim is none).
- Pack 1: the ten sander files and the three cutter cases in `public/sprites/` and the manifest,
  byte for byte the pack's; the root holds no file of the pack; `docs/art/pack-0910/` holds the
  rest with `EDITED.md`; the README is the game's with this turn's lines; the Sprite check page
  shows the sanders with no red port line and the cutter cases with their pictures.
- The line's 28 pictures in `public/sprites/` and the manifest; `docs/pictures-t30/` gone; no
  count of class pictures or turned pictures counts a sheet or an overlay; the Sprite check page
  shows the six modules on their footprints.
- A company below the 800 m² unit is refused the line with `Needs the 800 m² unit`; the line's
  refusals in the order of 2.3.4; modules 2 to 6 alone refused with `It comes with the line` and
  offered by no screen; the catalogue's line tab has one folder, one line card and four upgrade
  cards. Asserted.
- One click: six on order on one due day, the cash down by 10,000,000 once, each module's
  `pricePaid` its share, no order called off; the six stand on the due day at the first clear 36 by
  3 from (2, 14); `buyEquipment` of module 1 stands the six. Asserted.
- Moved as one: every module by the same cells, or none; refused onto anything but itself, out of
  the hall and on the gate lane, in the words of 2.4; a turn refused; the move card counts six
  machines; Put them back puts the six back. Asserted.
- Sold whole: the six marked sold together, refused while a man stands at any of them, taken the
  next working morning on one ledger line and one card for 5,000,000; the upgrades emptied; a
  running contract ended. Asserted.
- Without a contract, with two engineers: each stage of 2.5 on its module, the Finishing on module
  5 and the Glazing (`assembly`) on module 6; a sheet job's assembly still at the bench;
  `LINE_FACTOR` at level 6 on every timber stage, the Finishing on module 5 among them; a window
  still not takeable without a spray booth; 18 per cent of the boards saved. With one engineer,
  levels and stages as Turn 29 for three modules. Asserted.
- The line's contract: offered only with six standing and two engineers on the books, by the card,
  not drawn off the seeded stream (the seeded offers of the scenarios pinned today are unchanged);
  not in `state.contracts` and not counted against the three; a window every
  `lineWindowMinutes` in the men's working minutes and none in the dinner hour (the owner working
  through it or not), after five (the owner staying or not), on the second shift, with fewer than
  two engineers on duty or while the line is moved; £1,500 in and £600 out a window, each on one
  growing line a day, the material paid past the overdraft floor; nothing ordered, unloaded or
  taken off a rack or a store; no minute booked to any man or machine; while it runs no job stage
  on a module, no factor, no stand in, no boards saved; ended by `End it` and by the sale; offered
  again a week later. Asserted.
- The pallet: the tenth window sends it to the gate, the eleventh starts a new one; the pallets at
  the gate are gone at the next working day's open with no ledger line; a part pallet goes to the
  gate when the contract ends. Asserted.
- The upgrades: each 15 minutes off, 60 with all four and never less; refused in the words of 2.10;
  fitted ten working days after the order; nothing of the jobs changes with them. Asserted.
- The sheets: a working module is drawn from its sheet with `data-sheet` and the right view box; a
  module that is not working, or any module while the clock stands, is drawn from its picture;
  `playSheets` changes only the frame and the view box, only when the frame changes, holds while
  the clock stands, and runs after every page written, so a page written mid loop keeps the frame
  real time asks for; module 6 draws the overlay of the windows on its pallet, one file, the right
  one, and none for an empty pallet. Asserted.
- The lift: a v42 save with module 1 on order opens with its `pricePaid` back on one ledger line,
  no module, and the `lineRefunded` card at its first settle; one with a module sold and waiting
  keeps it for the van; one with no module opens with no card. Asserted, on a raw save in
  tests/cloud/migrate.test.ts.
- `git diff main --stat -- src/ui/styles.css` shows no new token; every changed screen is in the
  report beside its nearest existing one.
- The pictures: the Production line tab with its one folder, the line's card locked and unlocked
  and the four upgrade cards; the offer card; the Contracts tab with the line's running block (a
  pallet at the gate; standing still for want of an engineer); the 800 m² hall with the line
  standing whole, its six modules meeting end to end, at x1 and at the closest zoom; module 6 with
  seven windows on its pallet; a pallet at the gate with its label; setup mode with the line
  dragged, allowed and refused; the card of the lifted save; the Sprite check page's sanders,
  cutter cases and modules; and a strip of frames of the line playing, if the session can make
  one.

## 8. Parked

- **The money of the line.** At Piotr's figures the line pays back slowly (section 10, item 11).
  The knobs are constants: the window's price, its minutes, the line's price, the second shift.
  Piotr's to decide once he has seen the report's month.
- **The property cover on 10 million**, about 33,333 a month if held (2.3.7). Unchanged tonight.
- **The forklift's trip and the pallet standing alone** (L3): the boxes at the gate stand in.
- **Module 5 in place of the booth**, so that a company with the line needs no booth for its
  windows: left out tonight, because the booth is where a window's Finishing goes back to when the
  line is short of an engineer or on its contract (2.5).
- **The line on the second shift**, and more upgrades past one window an hour.
- **Drawing the upgrades** on the modules.
- **The line turned**: its 90 degree pictures are the other turn (2.2).
- Still parked from Turn 29: a spindle moulder takes three men at most; the tax and an order that
  is called off (closed for the line and the five axis CNC only); a spraying robot for each booth;
  timber bought ahead; the frames drying on the floor; the products drawn on the hall; a figure for
  the engineer; the thicknesser's stage; the night's breakdown roll on a bench; a sheet job dropped
  with its load at the gate; four men on one window at standard timber machines all on the floor
  of 0.25; the spraying robot's life; a man walked out to the shelter; the stores drawn empty; the
  board after a closure; the owner's forced holidays, accidents, the crisis; Piotr's questions
  after v82.
- From v88: the engine's own minute at 100x in a big hall (the day plan worked out twice a minute,
  a plan a man, the whole state cloned on each call). Not tonight.

## 9. Mockups (docs/mockups/t30/)

Before the code, each in the classes of the screen it belongs to and beside that screen as it is
today: (1) the Production line tab with its one folder, and inside it the line's card as a 200 m²
company sees it, as an 800 m² company short of cash sees it, and as one that can buy it, with the
four upgrade cards under it (needing the line, offered, being fitted, fitted), beside a folder of
the CNC centre tab; (2) the offer card of the line's contract, beside the card of two choices the
game has (`End of day`); (3) the Contracts tab with the line's running block, with a pallet at the
gate and standing still for want of an engineer, beside a running contract's block; (4) the 800 m²
hall with the line standing whole, module 6 with seven windows on its pallet and a pallet at the
gate with its label, beside the finished goods at the gate; (5) setup mode with the line dragged as
one, allowed and refused; (6) a module's Owned tile with `Sell the line for £5,000,000`, beside a
machine's tile; (7) the card a lifted save opens with, beside Turn 29's `Contracts take four
joiners`. A README names which is which. No art is asked of the art side before the code; what is
asked of it afterwards is in docs/art/REQUESTS-T30.md.

## 10. What chat decided and Piotr has not confirmed

For the report to repeat, each with what was built:

1. The shares of the 10 million: 2, 2.5, 1.25, 1.25, 1.5 and 1.5 million; one ledger line for the
   order.
2. The catalogue sells the line through module 1's folder: one folder, one card; modules 2 to 6
   only on the Owned tab.
3. The line's place at the order: the first clear 36 m by 3 m from x 2, y 14; moved as one in setup
   mode, never turned; a move counts as six machines, six hours.
4. Sold whole for half, from any module's tile, on one ledger line and one card; the upgrades go
   with it for nothing.
5. Without a contract: modules 5 and 6 do the Finishing and the Glazing of window jobs;
   `LINE_FACTOR` tops at 2.4 and acts on the Finishing on module 5; 33 places a module; 18 per
   cent of the boards saved; the lacquer's night kept; the spray booth still asked for every
   window.
6. The contract: a record of its own, outside the three; offered by a card once the six stand and
   two engineers are on the books; again a week after it is turned down or ended; no client's name,
   no week, no term, no short week; ended at any time with `End it`.
7. A window only with two engineers on duty (none with one); by day only; the line's minute is not
   slowed by the hall and books nothing to the men.
8. The material booked as money at 600 a window on the material line; the windows' money on the
   contract line.
9. The pallet at the gate drawn as the finished goods are, at x 0 to 1, y 10; taken at the next
   working day's open with no ledger line; a part pallet sent when the contract ends.
10. The four upgrades (diamond tooling 400,000, line software 300,000, servo press 500,000, second
    spraying robot 600,000), 15 minutes each, fitted in 10 working days, the contract's windows
    only, not insured, not drawn.
11. **The money, from chat's arithmetic at Piotr's figures** (a month is 21.43 working days, 480
    minutes each; the report replaces these with the built game's): at 120 minutes a window, 85.7
    windows, 128,571 in, 51,429 of material, 30,000 of engineers, 10,800 of power, so about 36,300
    a month, and about 23 years to pay back 10,000,000. At 60 minutes, with the four upgrades, 171.4
    windows and about 113,500 a month, about 9 years for 11,800,000. With the property cover held,
    about 33,300 a month less in both.
12. The sheets play only while the clock runs and a module works (the contract's minutes, or a man
    drawn at it), at 6 frames a second of real time at any speed; `stack10` is not drawn.
13. The lift: Turn 29's modules taken back at what they cost, on one ledger line, with a card; a
    module already sold left for its van.

End of brief.
