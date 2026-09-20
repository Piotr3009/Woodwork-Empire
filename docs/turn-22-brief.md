# Turn 22: a bank that means it, pipes that join, a hall you can turn

Woodwork Empire. Autonomous session brief for Claude Code (Opus 5, effort ultracode, cloud, agent
teams expected). Owner: Piotr. Programmer: Claude. Spec author: Claude (chat), 19.09.2026, from
Piotr's audit of Turn 21 and his decisions of 19.09 (Petros: software/woodwork-empire, STAN,
the block "WSAD T22").

Read this whole file (first line must say "Turn 22"; if the root CLAUDE.md does not, stop and
report), then REPORT-T21.md in full (section 0's nine items and "What was not done tonight"),
then docs/mockups/t22/README.md and every picture in that folder, then docs/ui-style.md, then
the archived briefs in docs/. Where files disagree, this one wins. All standing rules apply (no
em or en dashes anywhere, scope 1:1, one code path, constants never in the UI, [TUNE] for every
figure you choose and [PIOTR] for his, kill background processes, PR without merge, end the
session, no PR watching, npm run check gated on its own exit code, every click single, one
APP_VERSION bump).

Precondition. main carries Turn 21 merged and one chat fix: APP_VERSION 'v31', STATE_VERSION 18,
the tool cabinet's five classes in `public/sprites` and in the manifest, each in four pictures
(`toolCabinet.<class>.png`, `.r.png`, `.rr.png`, `.rrr.png`: a true quarter turn each, from the
art side's packs of 19.09), waiting for 2.11 and 2.12; `src/engine/ports.ts` does not exist yet. If APP_VERSION is
not 'v31', stop and report.

The four rules of 18.09 bind every agent: **one game, one look** (read the repo first, build with
what is there, `docs/ui-style.md` is the guide, phase C compares every changed screen with its
nearest existing one); **nothing visual without a mockup** (the pictures in docs/mockups/t22 are
the only ones this turn builds from; every other section states its change line by line); **no
sound without a recorded file** (there are none; the hall stays silent); **every modal, popover
and list has the cross, Escape and click outside**, and the popover test keeps proving it.

## 0. What this turn is for (Piotr, 19.09)

Turn 21 built two bank rules and only one of them can fire: `canAfford` stops every spend at the
overdraft limit, so the account parks on the limit, the arrears pile up beside it, and "thirty
days below the limit" is a sentence nobody can reach. Piotr's answer: the costs he does not
choose go through the limit and drag the account under it, the bank closes a company for being
too deep or too long, and the arrears ladder with its bailiff goes to the bin. One track for
money, not two.

The bubbles of Turn 21 are, in his words, a nightmare: three times too big and always on. They
become a mark the size of a coin with an exclamation in it, drawn only when something is wrong,
and the words come on hover.

The pipes: Piotr's screenshot of 19.09 showed GPT's nine pipe tiles not meeting each other. The
tiles go. A run is drawn by code as one continuous path, so every joint is exact by construction,
and each machine and each extractor gets its connection point as numbers read off its own picture.
The Rotate button, which today loses its setting the moment a machine is picked up, works; and an
item whose art has a picture for every side can be turned to any of the four. The tool cabinet,
whose five pictures arrived on 19.09, becomes a ladder of five that hold one, one, two, four and
eight men's tools, and a click on it opens a card that says so, turns it and sells it.

## 1. Rules restated (short)

Everything from Turns 1 to 21. Tonight in addition:

- APP_VERSION = 'v32'. STATE_VERSION bumps to 19 in phase A, once, for section 4's fields; every
  v30 and v31 save loads.
- **A cost the player did not choose is paid whatever the balance** [PIOTR, 19.09]. The
  overdraft limit stays the floor for what he buys.
- **The bank closes for too deep or too long** [PIOTR]: 1.5 times the overdraft, or the thirtieth
  day in a row under the limit. Nothing else closes a company.
- **Nobody is moved between jobs** [PIOTR, 19.09: "he is assigned to it, so he works on it; the
  production manager will do the moving, later"]. Turn 21's transfer is reversed.
- **Every connection point is a number in a table, per picture file**, never a rule guessed
  from the footprint [PIOTR, 19.09]. A file without numbers is a warning on the Sprite check
  page, not a guess on the hall.
- Pipes are drawn, never tiled. The nine `pipe.*.png` files are the one exception to "no
  touching the sprite files": phase A deletes them.

## 2. Changes to the design (the contract)

### The money

**2.1 Forced costs go through the limit [PIOTR].** `chargeUnavoidable` charges the cash in full
every time, below the limit included; the branch that turns the remainder into arrears goes. The
list of what is forced does not change: every caller of `chargeUnavoidable` today (wages, rent,
rates, power, the insurance premium, repairs, storage, material already ordered, the deposit
returned on a drop, a contract's penalty) stays a caller; every caller of `pay` behind
`canAfford` (machines, orders, hires, marketing, everything bought) stays behind it. The arrears
go in full: `state.arrears`, `payArrears`, the arrears leg of `refund` (a refund is cash again),
`ARREARS_BAILIFF_MONTHS`, the bailiff event and its card, the months of arrears counter, the
`owes` tile of Turn 21's 2.1 and its `bailiff in 2` line, the arrears line of Accounting's
Summary, the arrears figure of the month end. One grep at the end: `grep -rn "arrears\|bailiff"
src` finds nothing but the migration of 4. Done: the economy tests (wages on the last working day
with £200 in the bank and a £10,000 limit leave the account at its true figure below the limit;
a machine bought at the limit is still refused; a refund lands in cash).

**2.2 The bank closes for too deep or too long [PIOTR].** `checkBankruptcy` keeps two rules and
reads cash alone, since there is nothing else to read:

1. `cash <= BANKRUPTCY_LIMIT_FACTOR * overdraftLimit`, the factor 1.5 as today.
2. The **thirtieth calendar day in a row** with `cash < overdraftLimit`; a day at or above the
   limit resets `daysBelowOverdraft`. Now that 2.1 lets the account go under, this rule is
   reachable and its scenario (jj) proves it.

Checked in the morning, as today [PIOTR: ok]. The card of the drawing keeps its skin and says
three figures instead of four: `in the bank`, `the bank allowed`, `days below the limit`; the
working days kept, the orders taken and built, `Start again`, `Load a save` stay. Under the top
bar, while `cash < overdraftLimit`, the warning strip carries one line: `Account -£18,200 is
below the bank's -£10,000 limit: day 12 of 30.` with the day from `daysBelowOverdraft`; the line
about arrears goes. Done: the engine tests (thirty days under with wages paid through the limit
ends the game on the thirtieth morning and not the twenty ninth; one day above resets; 1.5x
alone still ends it), the warnings test, the card's render test.

**2.3 The drop card without arrears [PIOTR: the figures stay red].** The card of Turn 21's 2.3
keeps its two ends and its colours. The red box, shown when the deposit cannot be paid from cash
plus the remaining overdraft, reads: `You cannot pay the deposit back from the overdraft. The
account goes to -£33,000 against the bank's -£15,000. Dropping this job closes the company at
tomorrow's check.` The figures are `cash - deposit` and `BANKRUPTCY_LIMIT_FACTOR *
overdraftLimit`; `tomorrow's check` only when 2.2's rule 1 would fire on it; otherwise the last
sentence is `The bank counts every day below its limit.` Done: the app test (both texts).

**2.4 The month end and Accounting without the arrears line.** The month end card and the
Summary tab drop their arrears rows; nothing else on them moves. Done: the two render tests.

### The people

**2.5 The mark over the head [PIOTR; docs/mockups/t22/bubbles-v2.png, the red column and the
hover].** The bubble of Turn 21's 2.6 becomes a **14 px disc with an exclamation mark** in the
title hand, 6 px over the head, with the same tail, moved by the walker and depth sorted as
today, and **it is drawn only when something is wrong** [PIOTR, 19.09: "when all is fine, no
bubble; only when it is bad"]: the red class of Turn 21 alone, a man waiting for a taken
machine, waiting for cut parts, without sheets for his job, or standing with nothing to do. A
man working, a helper at his chore, a man at lunch, in the office or out measuring gets **no
mark at all**: the green and the dashed grey classes go, and so does the paper bubble of a new
stage. **The words come on hover**: while the pointer is over the disc or the figure, the one
line paper bubble of Turn 21, red, sits above the disc, from the `BUBBLES` table, which keeps
only its red lines. Two marks over two men at one machine stand side by side, 7 px apart
[TUNE], never on top of each other; at x10 and x30 the discs are drawn, the hover line too.
Done: the render test (a red mark for each of the four states, none for a working man, a helper
sweeping, a man at lunch or in the office; the side by side), the hover test, and `grep -rn
"bubble-chore\|bubble-away\|bubble-stage\|three second" src`: nothing.

**2.6 Nobody is moved between jobs [PIOTR].** Turn 21's 2.7 transfer (the move of a man to
another job when his stage needs a taken machine) goes, with its tests; the man stays with his
job at the waiting cell with the red mark, the plan's bar and the job card keep saying `waiting
for the saw`, and the queue at the machine is the queue of Turn 11. Two rules of
Turn 21 stay as they are: assembly never starts before its job's cutting is complete (the man
waits with `no cut parts yet`), and the contract's man is the contract's for the day. The day
meter's idle segment of Turn 21's 2.8 keeps counting the wait; that is the point. Done: the
engine test (four men, one saw, two jobs: the second job's men wait, nobody is moved; the idle
minutes are counted), the scenario (gg) rewritten to that.

### The hall

**2.7 A run is one drawing [PIOTR; docs/mockups/t22/pipes-A-one-path.png, variant A].**
`src/render/pipes.ts` draws a pipe run as **one SVG path**: through the centre of every cell of
the run at `DUCT_HEIGHT`, straight between them, with the quadratic bend of Turn 17 at every
corner (edge middle, cell centre, edge middle). Five strokes of the one path, in this order:
the dark rim (`PIPE_STROKE + 2`), the body, the underside shade (a third of the stroke, offset
down), the lit edge (offset up), the specular line (a tenth of the stroke, offset up); a
vertical drop is shaded left to right instead of top to bottom. The greys are four tokens in
`constants.ts` (`PIPE_RIM`, `PIPE_BODY`, `PIPE_SHADE`, `PIPE_LIGHT`) [TUNE: galvanised, from the
mockup; the purple of Turn 16 goes]. No joint discs, no clips, no shadow under the run [PIOTR:
"what are those circles for; remove"]. A branch (Turn 13's tee) is its own path from its drop to
the centre of the cell where it meets the main run; the main run is drawn first, the branch over
it. The seven tile kinds (`ns`, `ew`, `ne`, `nw`, `se`, `sw`, `tee`), `pipeTile`, the per cell
sprite lookup for pipes and the `pipe.*.png` entries of the manifest go; `pipe.drop` and
`pipe.inlet` become the drop and the inlet of 2.8. `DUCT_HEIGHT` becomes **3.2** [PIOTR: "a bit
higher"; the wall is 3.5]. The central system's run along the rear wall (Turn 16) is the same
path. Done: the render test (a run of six cells with one corner is one `<path>` and no `<image>`;
a tee is two paths; the six cells' centres lie on the path), the pipes-on-the-hall test rewritten
to paths, `ls public/sprites | grep pipe`: nothing.

**2.8 Every connection point is a number [PIOTR; docs/mockups/t22/ports-*.png, saw-port-B.png,
extractor-inlet-C.png].** New file `src/engine/ports.ts`: one table `PORTS`, keyed by sprite
file name, one line per picture. A machine line: `{ px, py, cell, hidden }`; an extractor line:
`{ px, py, faces, cell }`. `px, py` are pixels of the 2x file (the whole file, padding
included); `cell` is the cell of the item's footprint, in the item's own orientation, that the
drop or the inlet's vertical occupies for routing; `hidden` says the drop vanishes behind the
body; `faces` is `'+x'` (the mouth opens down right on screen) or `'+y'` (down left). The
render converts `px, py` to hall coordinates through `spriteAnchorIn` (the same arithmetic
that places the picture), so the point lands on the same pixel of the picture at any zoom.

- **A machine's drop** comes down at `px` from `DUCT_HEIGHT`. `hidden: true` [the saw, PIOTR's
  pick B]: the vertical is drawn from the run to `py` only, and there it stops; the body of the
  picture covers what would be below. Visible ports [the spindle moulder's hood, the
  edgebander's top]: the vertical stops 0.5 m above `py` and a **hose** joins it to the port: one
  quadratic curve, `HOSE_COLOUR` [PIOTR: "like the floor, a touch darker"; TUNE from the floor
  token], the stroke `PIPE_STROKE * 0.7`, dark outline. The port ring of Turn 16 goes.
- **An extractor's inlet**, variant C [PIOTR]: the vertical stands **0.25 m in front of the
  mouth** along `faces`, from `DUCT_HEIGHT` down to the mouth's height, then an elbow (the Turn
  17 bend) turns into the mouth and ends at `px, py`. The route's last cell is `cell`. If `cell`
  is not floor (the mouth faces a wall), Connect says `No room in front of the extractor's inlet:
  turn it or move it` and runs nothing.
- **Mirror** (an orientation drawn by mirroring, 2.11): `px` becomes `fileWidth - px`, `faces`
  swaps `+x` and `+y`, `cell` is mirrored across the footprint.
- **A file without a line** keeps today's rule (the footprint's first cell at the machine's
  height, no hose) and the Sprite check page prints `no port data` in red beside it.
- **The engine's `portCell`** reads the table: the routing of Turn 13 starts and ends where the
  drawing does. One table, read by both.

The table, as measured by Claude from the pictures on 19.09. Extractors and saws are approved by
Piotr [PIOTR, 19.09: "all the dots are fine"]; spindle moulders and edgebanders are Claude's
measurements for him to confirm from the pictures of C4 [TUNE until he does]:

| file | px | py | faces | cell | hidden |
| --- | --- | --- | --- | --- | --- |
| extractor.used.png | 89 | 61 | +x | 1,0 | |
| extractor.budget.png | 89 | 64 | +x | 1,0 | |
| extractor.standard.png | 28 | 67 | +y | 0,1 | |
| extractor.pro.png | 16 | 127 | +y | 0,1 | |
| extractor.industrial.png | 22 | 64 | +y | 0,1 | |
| tableSaw.used.png | 100 | 43 | | 1,0 | yes |
| tableSaw.budget.png | 97 | 62 | | 1,0 | yes |
| tableSaw.standard.png | 137 | 62 | | 1,0 | yes |
| tableSaw.pro.png | 139 | 80 | | 1,0 | yes |
| tableSaw.industrial.png | 155 | 86 | | 2,0 | yes |
| spindleMoulder.used.png | 107 | 28 | | 1,0 | |
| spindleMoulder.budget.png | 95 | 40 | | 1,0 | |
| spindleMoulder.standard.png | 92 | 24 | | 1,0 | |
| spindleMoulder.pro.png | 151 | 67 | | 1,0 | |
| spindleMoulder.industrial.png | 106 | 65 | | 1,0 | |
| edgebander.standard.png | 104 | 70 | | 1,0 | |
| edgebander.pro.png | 117 | 95 | | 1,0 | |
| edgebander.industrial.png | 122 | 97 | | 2,0 | |

`cell` for an extractor with `faces +y` is the cell in front of its footprint at the mouth's
column (0,1 means x 0, y 1 for a 1 deep footprint); with `faces +x` it is the cell to the right
(1,0). A `cell` inside a machine's own footprint is where the drop stands; the pipe layer is above
the hall and nothing collides with it. The used and budget edgebanders want no extraction
(`EXTRACTION_DEMAND` 0) and have no line. Done: a test that every file named in
`EXTRACTION_DEMAND` with a picture in the manifest has a line, and the two without demand do not;
a test that `portCell` and the drawing's landing point agree for the standard saw and the
standard extractor; the Sprite check test for `no port data` on a file removed from the table in
the test.

**2.9 Machines with a pipe on them do not breathe [PIOTR: "the extractor pulsing will tear the
pipe"].** `fx-breathe` (Turn 3) is not applied to an item that has a line in `PORTS`, whether or
not it is connected; the saw, the spindle moulder, the edgebander and the extractor stand still
while they run. Items without a line breathe as today. Done: the hall render test.

**2.10 Rotate works [PIOTR, 19.09: "it does nothing"].** Today `turnGhost` arms `ui.rotate` and
`onSetupPointerDown` overwrites it with the item's own orientation the moment the item is picked
up, so the button (and R with nothing in hand) does nothing, and only R while the mouse is held
turns anything. The fix: `ui.armTurn` is the armed quarter turn; Rotate or R with nothing in
hand toggles it and the button lights while it is set; on pick up the item's orientation is read
and `armTurn` is applied to it once and cleared; Rotate or R with the item in hand turns what is
in hand, as today. The words under the button are already right. Done: the app test (arm, pick
up, drop: turned; pick up, R, drop: turned; arm twice, pick up, drop: not turned).

**2.11 Four orientations where the pictures exist [PIOTR: "I need two more turns, we have four
walls"].** `rotated: boolean` becomes `orientation: 0 | 1 | 2 | 3` on every placed item and
reservation (quarter turns clockwise from the picture as drawn); the footprint swaps width and
depth at 1 and 3, `footprintOf(spec, variant, orientation)`. The picture for an orientation:
0 the base file; 1 the `.r` file, or the base mirrored when there is none (today's rule); 2 the
`.rr` file; 3 the `.rrr` file. **Rotate cycles only through the orientations that have a
picture**: every item has 0 and 1; an item with `.rr` and `.rrr` has all four [TUNE: Claude's
rule, so that no wrong picture ever stands on the hall]. The five tool cabinets are the first
items with all four, tonight; the anchor of every orientation is the one `spriteAnchorIn` gives
for that orientation's footprint, which is the corner the pack's `projection.json` names. `PORTS` is keyed by file, so a `.rr`
file brings its own numbers the day it arrives. The Sprite check page lists, per family and
class, which orientations have a file. Migration: `rotated true` becomes `orientation 1`, false
becomes 0. Done: the tests (the cycle on an item with two pictures is 0, 1, 0; with four it is 0,
1, 2, 3, 0, proven on the standard cabinet; the footprint at each; a v31 save with a rotated
cabinet loads at orientation 1), and
`grep -rn "rotated" src`: nothing but the migration.

**2.12 The tool cabinet has a class ladder [PIOTR, 19.09; the pictures are in the repo].** The
cabinet becomes a family of five like the machines, `TOOL_CABINET_VARIANTS`, and what a class is
for is **how many men's hand tools it holds**: used 1, budget 1, standard 2, pro 4, industrial 8
[PIOTR: "weak 1, middle 1, then doubling: 2, 4, 8"]. Footprints and heights are the pictures'
(the pack's README of 19.09): used and budget 1 by 1 by 1 (file 112 by 112), standard 2 by 1 by 1
(160 by 136), pro 2 by 1 by 1.8 (160 by 175), industrial 3 by 1 by 2 (208 by 208); every class
has a true `.r`. Prices double up the ladder from the standard's 350: **90, 175, 350, 700, 1,400**
[TUNE; PIOTR: "doubling"]. `perWorker` goes from the cabinet: the hiring gate of Turn 17's 2.11
and the hand tool set's `requires` count **free slots**, the sum of the capacities of the
cabinets standing on the hall minus the hand tool sets bought; the owner's own set takes a slot
too. The catalogue's `Tool cabinets` folder lists the five with `Holds 4 men's tools` in the
effect line; the class ladder words are the machines'. Migration: every cabinet in a save is the
standard class. The `spriteClasses` test's loop measures the four new class files (the count
becomes 43) and its turned files assertion already names the five. Done: the tests (the slots
sum, the gate at 2 cabinets of 1 and 1 set bought, the catalogue folder, the migration).

**2.13 The card of a thing on the hall [PIOTR: "click it and a modal shows; sell it at half
price; how many men it holds"].** During play, a click on a tool cabinet on the hall opens its
card in the machine card's skin: the name and class in the title, `Holds 4 men's tools · 2 in
use`, and two rows at the bottom, `Turn` and `Sell for £175`. **Turn** stands it at ninety
degrees where it is, through `MOVE_ITEM` with the next orientation of 2.11, and costs the hour
a move costs; greyed with the reason when the turned footprint does not fit. **Sell** is the
catalogue's `sellAction` of Turn 8, moved into the engine's reach of the card: the same price
(`salePriceFor`, half for a machine bought new, 0.35 for a used one), the same second click
`Confirm sale`, the same refusal printed word for word, the same buyer in the morning. The
machine card gains the same two rows under what it has. One function draws the two rows for
both cards. Done: the app tests (the cabinet card opens on the click, the slots line, Turn
turns and charges the hour, Turn refused where it does not fit, Sell then Confirm marks it sold),
the popover test finds the card.

## 3. How to run this session (agents)

- **Phase A (one agent, serial):** section 4's fields, STATE_VERSION 19, the migrations
  (arrears into cash, orientation); `src/engine/ports.ts` with the table of 2.8 and `portCell`
  reading it; the four pipe greys and `HOSE_COLOUR`; `DUCT_HEIGHT` 3.2; the nine `pipe.*.png`
  deleted and `npm run sprites:manifest` run; `fx-breathe` gated on `PORTS`. The frozen files of
  Turn 13 are frozen for phase B after this.
- **Phase B (three agents):** B1 the money: 2.1, 2.2, 2.3, 2.4 (economy.ts, game.ts, warnings.ts,
  topbar.ts, dropCard.ts, eventModal.ts, monthEnd.ts, accounting.ts). B2 the people: 2.5, 2.6
  (bubbles.ts, hall.ts for the marks, walkers.ts, production.ts, plan.ts). B3 the hall: 2.7, 2.8's
  drawing, 2.9, 2.10, 2.11, 2.12, 2.13 (render/pipes.ts, render/hall.ts, render/sprites.ts,
  ui/app.ts, ui/machineCard.ts, ui/catalogue.ts, engine/machines.ts, engine/pipes.ts,
  constants.ts for the ladder through a note, spriteCheck.ts).
- **Phase C (one agent, serial):** the notes, the scenarios (the sixteen months with costs
  through the limit; (gg) rewritten to nobody moved; (jj) thirty days under the limit with wages
  paid through it, closed on the thirtieth morning; (kk) a £50,000 drop with £7,000 in the bank,
  closed at the next morning's check), the cross check of section 7, the pictures, the report,
  the PR.

## 4. State

STATE_VERSION 19. `state.arrears` gone: the migration subtracts it from `cash` and writes one
ledger line `Arrears carried into the account (v32)`; `state.daysBelowOverdraft` stays;
`item.orientation` replaces `item.rotated` on equipment and reservations; a cabinet without a
`variantId` is `standard`; the bubbles, the ports and the pipes need no field. Every v30 and v31 save loads.

## 5. Task queue, in order

Branch turn-22-a-bank-that-means-it from main. One commit per task, npm run check green on its
own exit code before each, two report lines per task in REPORT-T22.md.

T22-A1 Housekeeping and v32: docs/turn-21-brief.md byte for byte from the Turn 21 merge commit's
CLAUDE.md, the README's lines, APP_VERSION 'v32', docs/art/REQUESTS-T22.md (section 9).
T22-A2 Phase A as section 3 says.
T22-B1a 2.1. T22-B1b 2.2. T22-B1c 2.3. T22-B1d 2.4.
T22-B2a 2.5. T22-B2b 2.6.
T22-B3a 2.7. T22-B3b 2.8. T22-B3c 2.9. T22-B3d 2.10. T22-B3e 2.11. T22-B3f 2.12. T22-B3g 2.13.
T22-C1 notes. T22-C2 scenarios. T22-C3 cross check. T22-C4 look and shoot: thirteen pictures into
docs/report-t22/ (the warning line at day 12 of 30, the bankruptcy card with three figures, the
drop card's red box with the new text, a red mark over a waiting man beside a working man with no
mark, the hover line over a mark, a run with a corner and a tee drawn as paths at 3.2 m, the standard saw with
its hidden drop, the standard extractor with the elbow into its mouth, the used extractor with
the mouth to the right, the Sprite check page with `no port data` provoked in the test and the
orientation columns, the five cabinets in a row on the hall, the standard cabinet at all four orientations, the
cabinet's card with its slots line and the two rows). T22-C5 report and PR titled `Turn 22: a bank that means it, pipes that
join, a hall you can turn`, do not merge, end the session.

## 6. Do not (tonight)

- No change to Output, Efficiency, the rate, the contract prices, the design time, the tiers,
  the monthly pay.
- No sound; no new mockup built from words; no picture drawn by an agent.
- No touching docs/art/SPRITES.md, CLAUDE.md, the archived briefs, the mockup files, the
  character sheets, the font file, or any sprite file other than the nine `pipe.*.png` (deleted,
  never redrawn).
- No storage access outside src/cloud/store.ts; no PixiJS, mobile, Steam, Electron.
- No watch loops, nothing left running.

## 7. The cross check (before the PR)

- `grep -rn "arrears\|bailiff" src`: nothing but the migration.
- `grep -rn "rotated" src`: nothing but the migration.
- `ls public/sprites | grep -c pipe`: 0; `grep -rn "pipe\.ew\|pipe\.ns\|pipeTile" src`: nothing.
- Thirty days under the limit with wages paid through it: closed on the thirtieth morning,
  asserted; a company at the limit that buys nothing and pays wages goes under the limit that
  day, asserted.
- A run of six cells with a corner is one path; its six centres are on the path, asserted.
- Every file in `EXTRACTION_DEMAND` with a picture has a `PORTS` line, asserted.
- Arm, pick up, drop: the cabinet stands turned, asserted.
- Two used cabinets and one hand tool set: one free slot, asserted; `grep -rn "perWorker" src`
  finds no cabinet.
- Every changed screen beside its nearest existing one in the report, with the differences
  listed and none outside this brief; `git diff main --stat -- src/ui/styles.css` with no new
  token beyond the four greys, the hose and the mark.
- The thirteen pictures.

## 8. Parked

- The production manager as the hall's lever (moves men between jobs, tiers that speed the
  hall): Piotr's design and Claude's opinion are in Petros, to be settled before Turn 23.
- The weekly summary card: later, mockup first [PIOTR].
- Contracts worked at every stage; the owner at a contract: as in Turn 21.
- The extractor's `.r`, `.rr` and `.rrr` files, five classes: art (section 9). Until they land,
  extractors turn between 0 and 1 like everything else; the cabinets already turn four ways.
- The 3D render test of one machine (one camera, azimuth 45, elevation 30, the model squashed in
  Z by 0.816): Piotr's decision, not this turn.
- Three Turn 20 leftovers Piotr has not ruled on: the Efficiency chip without a cross, the
  Contracts tab in one column against the two of its mockup, the same rack sum in machines.ts and
  materials.ts.
- Sound files: Piotr's recordings.

## 9. Art requested (docs/art/REQUESTS-T22.md)

- The extractors turned: for each of the five classes a `.r` (a true quarter turn, not a mirror,
  as the tool cabinet pack of 19.09 did it), a `.rr` (the back) and a `.rrr`, on the canvas the
  footprint dictates, anchor as `spriteAnchorIn` reads it; with each file the inlet's `px, py` and
  `faces` are read off by Claude in chat, not by the art side.
- Still wanted from Turn 21: the sprayer's four sheets, the helper's bench sheet, the seven
  recordings.

End of brief.
