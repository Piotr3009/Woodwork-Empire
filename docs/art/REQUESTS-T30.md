# Art and recordings requested after Turn 30

The shape `docs/art/REQUESTS-T29.md` left. Written 11.10.2026, the night Turn 30 put the art side's
L1 and L2 (the line of six modules, their working motion and the windows stacking on module 6's
pallet) and pack 1 of 09.10 (the five sanders and the three cutter cases) into the game (CLAUDE.md
T30 2.1, 2.2 and T30-E1). Piotr's words: "super" for the six modules, "put the animation pictures
into the code and the zip", and for pack 1 "ok, but remember to keep to the angles, it is mega
important; code it". So the 28 files of the line and the 13 of pack 1 are in `public/sprites/` as
they came, `docs/art/SPRITES.md` 15 lists them with their canvases and anchors, and no agent has
altered a pixel of any of them (CLAUDE.md T30 section 1). Everything this page asks for is a new file
or a redraw by the art side, never an edit in the code.

Every figure below is worked from the contract's own arithmetic (`docs/art/SPRITES.md` 2), as
`REQUESTS-T29.md` did: for a class of `w` by `d` by `h` metres, the file is `(w + d) x 48 + 16` by
`(w + d) x 24 + h x 48 + 16` px, the anchor (the bottom corner of the floor diamond) is at
`8 + w x 48` from the left edge in view 0 and 8 px above the bottom (the file's height less 8), and
a turned `.r` file is the same canvas with its anchor at `8 + d x 48`. The camera is the one pack 1
measured itself against: `sx = ox + 48 x (X - Y)`, `sy = oy + 24 x (X + Y) - 48 x Z`.

**No request here is [CRITICAL]**: the game is whole tonight without any of them. Six things, in the
order of need:

| # | Priority | What | Asked or for Piotr |
|---|---|---|---|
| 1 | [HIGH] | L3: the pallet of ten wrapped windows standing alone | asked |
| 2 | [HIGH] | L3: the forklift with a driver, four directions, empty and loaded | asked, with two questions for Piotr |
| 3 | [MEDIUM] | What sits badly on the hall: the seams, the conveyor, module 5's roof, the boxes at the gate | to be checked in T30-E4's pictures |
| 4 | [MEDIUM] | The line's 90 degree convention, for any picture that may one day turn | a rule, nothing to draw |
| 5 | [LOW] | Whether the four upgrades are drawn | for Piotr and the art side, not to be drawn yet |
| 6 | [LOW] | Still outstanding from earlier turns | unchanged |

**What landed of `REQUESTS-T29.md`.** Its 1 and 2 (the modules drawn again to meet end to end, and a
saw at module 1's infeed) came as L1, under the same names, with a sixth module and the height 3 m:
SPRITES.md 15.2 says the gap is gone and module 1 is drawn with its saw. Its 4: the twelve frame press
and glue table files came on 08.10 (in the game from v85, still not exact by the art side's own
check, `REQUESTS-T28.md` 1), and the three cutter sets and the five sanders came as pack 1 of 09.10
(Turn 30, B1). Its 3, 5, 6 and 7 are in 6 below.

---

## 1. L3: the pallet of ten wrapped windows standing alone [HIGH]

### 1.1 What the game does tonight

The line's contract makes a window every 120 minutes (60 with the four upgrades). Each one stands on
module 6's pallet, drawn by the one overlay of that many, `windowLine6.standard.stack01.png` to
`stack09.png`. The tenth sends the pallet to the gate at once, and the next window starts a new one;
a part pallet goes to the gate as it is when the contract ends (CLAUDE.md T30 2.8, 2.12).

At the gate the full pallets wait for the client until the open of the next working day, when they
are gone at no cost and with no line in the ledger. They stand at `LINE_PALLET_LAYOUT` in
`src/engine/constants.ts`, `{ x: 0, y: 10, width: 2, depth: 1, height: 1.75 }`: the first row of
the floor the second extension added, along the left wall just past the end of the gate lane. The
game draws them as it draws the finished goods (`src/render/hall.ts`, `data-line-pallet`): one box
of 1 by 1 by 1.75 m a pallet in the kit stock colours, two at the most side by side along x in that
2 by 1, and one label, `Windows for collection: 1 pallet` or `2 pallets`. That box is a stand in,
and this is the picture to replace it. `stack10.png` is on disk and is not drawn tonight: it waits
for the forklift (2).

### 1.2 What it shows

The same pallet module 6's picture draws on the floor at the end of its rollers, standing alone,
with ten wrapped windows on it as the overlays draw them: the same wrap, the same corners, the same
light. The windows are the overlays' own (`docs/art/pack-1110/README-L2.md`): each 1.10 by 0.08 by
1.44 m, standing 0.082 m apart along Y, their bottom at Z 0.228 m, their faces along X and towards
the camera's left as on module 6. No floor, no shadow, no text, no forklift.

### 1.3 Its metres, canvas and anchor

Proposed **2 by 1 by 1.75 m** [TUNE: the size is the art side's to confirm]:

- along x, 2 m: a window is 1.10 m wide and does not fit a cell of 1 m, so the pallet takes two;
- along y, 1 m: ten windows 0.082 m apart, each 0.08 thick, are 9 x 0.082 + 0.08 = 0.818 m deep;
- up, 1.75 m: the windows' top is at 0.228 + 1.44 = 1.668 m, under the stand in box's 1.75.

| File | Metres, w by d by h | File, px | Anchor, view 0 |
|---|---|---|---|
| `linePallet.standard.png` | 2 by 1 by 1.75 | 160 by 172 | 104, 164 |

Worked: `(2 + 1) x 48 + 16` = 160; `(2 + 1) x 24 + 1.75 x 48 + 16` = 72 + 84 + 16 = 172; anchor
`8 + 48 x 2` = 104, at `172 - 8` = 164. The floor diamond, in px of the file:

| File | Left corner | Bottom corner (anchor) | Right corner | Far corner |
|---|---|---|---|---|
| `linePallet.standard.png` | 8, 116 | 104, 164 | 152, 140 | 56, 92 |

View 0 only, no `.r`: nothing at the gate is ever turned, as the overlays have none. The name is a
proposal; the turn that takes it in fixes it.

### 1.4 Two things that follow, for the code side and Piotr

- **Two pallets at the gate.** A pallet of 2 by 1 fills `LINE_PALLET_LAYOUT` alone, where tonight's
  two boxes of 1 by 1 share it. The second pallet's place (beside it along x, or behind it at y 11)
  is the code side's to fix in the turn that takes L3 in, clear of the gate lane and the finished
  goods (y 9).
- **A part pallet.** When the contract ends, a pallet of one to nine windows goes to the gate. Either
  the game draws the full pallet for it too, and the label says what it is (the simplest), or the
  art side draws the pallet empty and ten overlays on its canvas, `linePallet.standard.stack01.png`
  to `stack10.png`, in the way module 6's are. **For Piotr to choose**; until he does, the full
  pallet serves.

## 2. L3: the forklift with a driver [HIGH]

### 2.1 The forklift the game has

`forklift` in `src/engine/constants.ts` is one family of five classes (the hand pallet truck, the
electric pallet truck, the `Forklift`, the better forklift and the heavy forklift), every class
declared **1 by 1 by 1 m** (the family's spec: width 1, depth 1, height 1), a vehicle that stands on the
floor and makes the lorry's unloading faster. Its ten files (`forklift.<class>.png` and their `.r`)
are the 1 by 1 by 1 canvas, 112 by 112 with the anchor at 56, 104 (`(1 + 1) x 48 + 16` = 112 both
ways, `8 + 48 x 1` = 56, `112 - 8` = 104). `forklift.standard.png` is a green counterbalance forklift
with no driver, drawn small enough to fill that frame. Tonight it does nothing for the line: no
forklift carries a pallet and no man does (CLAUDE.md T30 2.8).

### 2.2 Why L3's forklift wants a bigger frame

Taken at the game's 1 by 1 by 1, the forklift stands a metre high, lower than the figures (1.8 m,
SPRITES.md 10.2) and than the pallet it would carry (1.75 m, 1.3 above). A forklift that lifts module
6's pallet beside module 6, at module 6's scale, cannot be drawn in that frame. So L3's forklift is
asked at true scale, in a frame of its own [TUNE: the art side to confirm the metres]:

- a small counterbalance forklift (about 1.8 to 2 m to the fork face, about 1.1 m wide, about 2.1 m
  to the top of its guard), with its driver;
- loaded with the pallet of 1, carried low on the forks, the whole within 3 m in any direction;
- **one frame for all eight sheets, 3 by 3 by 2.25 m**, square so that the anchor is the same pixel
  in every direction, and the forklift and its load centred on the diamond in every frame.

| Frame | Metres, w by d by h | Cell, px | Anchor in the cell | Centre of the diamond |
|---|---|---|---|---|
| L3's forklift, every sheet | 3 by 3 by 2.25 | 304 by 268 | 152, 260 | 152, 188 |

Worked: `(3 + 3) x 48 + 16` = 304; `(3 + 3) x 24 + 2.25 x 48 + 16` = 144 + 108 + 16 = 268; anchor
`8 + 48 x 3` = 152, at `268 - 8` = 260; the diamond's corners are 8, 188 (left), 152, 260 (bottom),
296, 188 (right) and 152, 116 (far).

The game's own forklift pictures stay as they are, for the catalogue and the kit on the floor.
Whether L3's forklift is that kit or its own is 2.4.

### 2.3 The sheets

Eight sheets, each **one row of cells**, in the shape of the line's work sheets
(`windowLineN.standard.work.sheet.png`, SPRITES.md 15.2), each with a JSON of the same figures:

| Files | What they are |
|---|---|
| `lineForklift.standard.<dir>.empty.sheet.png`, four | the forklift driving with its forks empty |
| `lineForklift.standard.<dir>.loaded.sheet.png`, four | the forklift driving with the full pallet on its forks |
| `lineForklift.standard.<dir>.<load>.json`, eight | `{"frames":N,"fps":F,"frameWidth":304,"frameHeight":268,"anchorX":152,"anchorY":260,"loop":true}` |

- `<dir>` is the figures' four screen directions (SPRITES.md 10.2): `sw` (down left, along +y), `se`
  (down right, along +x), `nw` (up left, along -x), `ne` (up right, along -y). All four drawn, none
  mirrored: a mirror puts the driver on the other side and the light on the wrong side.
- The frames and the fps are the art side's to set; the line's sheets are 12 frames at 6 a second
  and a figure's walk is 8 at 3.43. Frame 0 of each sheet is the forklift standing, so the game can
  draw it still from the same file.
- The cells are not trimmed; the anchor is the same pixel in every cell.
- The names are proposals; the turn that takes them in fixes them.
- **Optional, [LOW]**: two short sheets that do not loop, the forks lifting the pallet at module 6
  and setting it down at the gate, in the same cell.

### 2.4 Two questions for Piotr, before the sheets are drawn

- **Whose forklift.** Tonight the forklift the company may own is not used (CLAUDE.md T30 2.8).
  Either the trip needs the company's own forklift (and a company with only a hand pallet truck, or
  none, sends no pallet), or the line comes with a forklift of its own, so every company with the
  line has one. The simplest is the line's own.
- **Who drives.** The line's windows book no minute to any man (CLAUDE.md T30 2.7). If the driver is
  part of the line's picture he takes no man's time; if he is one of the crew, the trip takes a man
  off his work. The simplest is the first, and he is dressed as the crew are (the green shirt of
  SPRITES.md 10.1) unless Piotr says otherwise.

### 2.5 What the game will do with them (the turn that takes L3 in, not tonight)

- The ninth window on module 6's pallet is drawn by `stack09` as tonight; the tenth by `stack10`,
  which is on disk for this.
- The forklift drives empty from where it waits to module 6's pallet, takes it (`stack10` goes),
  drives loaded to the gate and sets the pallet down at its place, drawn there by
  `linePallet.standard.png`, then drives back empty. The line can be moved in setup mode, so the
  route starts wherever module 6 stands: at the order, module 6 is at x 32 to 37, y 14 to 16, and the
  gate place at x 0 to 1, y 10, so the trip is mostly `nw` loaded and `se` empty, with a short `ne`
  and `sw` at each end. Its speed, and whether a window waits for it, are the code side's.
- The pallet waits at the gate with its label until the open of the next working day, when the
  client takes it, at no cost and with no line in the ledger. The client comes at the open, before
  the hall is seen, so no lorry of his is asked.
- Module 6's picture has its empty pallet drawn in, so the moment the full one is lifted off a fresh
  empty pallet is seen at the end of the rollers. It reads as a new pallet put down; the art side
  says if it would rather it read otherwise, which would mean a change to the picture Piotr approved.

## 3. What sits badly on the hall: to be checked in T30-E4 [MEDIUM]

Nothing below is recorded as wrong. It is what T30-E4's pictures are to be read for, and the report
(REPORT-T30.md) will say what it saw. A fault found there is added to this page, with its pixels,
before the art side is asked to redraw anything. The mockup `docs/mockups/t30/hall-line-whole.png`
was shot before T30-C1 and T30-C4 (the line's place and pictures pushed in by hand, no sheet
playing), so E4's shots are the ones to read.

- **The seams between modules.** At the order the game stands module N at x 2 + 6 (N - 1), y 14,
  orientation 0, when that 36 m by 3 m is clear (`WINDOW_LINE_ORIGIN`), so the six take x 2 to 37,
  y 14 to 16; wherever the line stands or is moved, module N + 1 is six cells along x from module N
  and is drawn (+288, +144) px from it. The art side's own figures put the conveyor out of module N at
  (368, 288.8) and into module N + 1 at (80, 144.8) + (288, 144) = (368, 288.8), the same pixel, and
  the overhead rail of modules 5 and 6 likewise at (368, 197.6). So they should meet end to end with
  no gap. To check at x1 and at the closest zoom, at each of the five seams: no gap and no overlap of
  the rollers; no two posts doubled into a block; and, since module N + 1 stands nearer the camera
  and is drawn after module N, nothing of module N that stands in front at the seam is cut off.
- **The conveyor at 0.9 m.** All six carry their rollers at 0.9 m and the rail of 5 and 6 at 2.8 m
  (`docs/art/pack-1110/HANDOFF-L1.md`). To check that the rollers step neither up nor down at a seam,
  and that the rail reads as starting on module 5's own frame (module 4 has none).
- **Module 5's clear roof.** Measured off `windowLine5.standard.png` tonight: 10,996 of its pixels
  are part transparent, 4,033 of them at alpha 51 (20 per cent): the clear roof and the cabin's clear
  panels, drawn so that its robot shows. Whatever the hall draws before module 5 in the depth order
  shows through them: the floor, the module's own contact shadow, and a man or a piece of kit
  standing behind it. To check that the robot reads and that nothing seen through the roof looks
  wrong; the same of module 5's sheet while it plays.
- **A module playing alone.** Without the contract, a module plays its sheet only while a man is
  drawn at it (CLAUDE.md T30 2.11), so one module can play beside a still one, and a part leaving
  its end stops at the seam. The art side made the six to be seen in step, which they are while the
  contract runs. To check that it reads; its README-L2 says the loop is a picture of work and not the
  process's times.
- **The robot and the count.** Module 6's robot puts a window on the pallet every loop, two seconds
  of real time, while the overlay's count steps once a window is made. The art side planned it so
  (README-L2: the carried window goes in the last frame, and the count is the overlay's).
- **The boxes at the gate.** Until L3, the pallets at the gate are the stand in boxes of 1.1, 1.75 m
  high at y 10. In the mockup they stand in front of the finished goods (y 9, 1 m high) and hide the
  start of their label, `At the gate: 3`. L3's pallet at 1.75 m in the same place would hide it the
  same way: where the labels hang is the code side's, not the art side's.

## 4. The line's 90 degree convention [MEDIUM]

A rule for every delivery from now; nothing to draw tonight.

- **The art side's 90 degree view of the line** (L1, `docs/art/pack-1110/HANDOFF-L1.md`) turns the
  model to `X = 3 - y, Y = x, Z = z`, a positive physical turn, the next module at (-288, +144) px in
  that view.
- **The game's `.r`** turns it to `X = y, Y = w - x, Z = z` (SPRITES.md 15.2), the anchor at
  `8 + d x 48` on the same canvas. Pack 1 of 09.10 drew its sanders that way: its `camera-QA.md` says
  `(x, y, z)` to `(y, w - x, z)`.
- For a module of 6 by 3 the two differ by a half turn: the art side's view is the game's `.r`
  seen from the other side, its conveyor running across the picture the other way: in at 368, 144.8
  and out at 80, 288.8, where the game's `.r`, worked from the camera above, would take it in at 80,
  288.8 and out at 368, 144.8.
- The line is never turned (CLAUDE.md T30 2.4), so its six `.r` files are on disk for the tests and
  the Sprite check page and are never drawn on the hall, as the shelter's and the van's are. They
  were renamed `.r` by chat and no pixel was touched.
- **Any picture that may one day turn is drawn in the game's convention**, as pack 1 was. If the
  line is ever turned (parked, CLAUDE.md T30 section 8), its six turned views are wanted again in the
  game's convention, with their sheets and module 6's overlays turned the same way.
- L3's pallet is view 0 only (1.3). L3's forklift does not turn on a footprint: its four directions
  are directions of travel, the figures' screen directions (2.3).

## 5. Whether the four upgrades are drawn [LOW]

**For Piotr and the art side to decide; nothing is drawn until he says.** Turn 30 sells four
upgrades of the line (CLAUDE.md T30 2.10; `LINE_UPGRADES` in `src/engine/constants.ts`), each
taking 15 minutes off a window of the line's contract. They are not kit, and the modules stay as the
art side drew them. Their cards in the line's folder draw no picture.

| Upgrade | What its card says | A picture? |
|---|---|---|
| Diamond tooling, 400,000 | Diamond tipped knives and cutters for modules 1 and 2 | none: knives in the heads are not seen at the hall's size |
| Line software, 300,000 | One program for the whole line | none: a program has no shape |
| Servo press, 500,000 | Servo cramps and a second table in module 4 | a question |
| Second spraying robot, 600,000 | A second robot in module 5 and a warm drying run on the overhead rail | a question |

If the servo press and the second robot are to be seen, either way below, same canvas (448 by 376),
same anchor (296, 368) and, for a sheet, the same figures and phase as the module's own:

- **(a) An overlay on the module**, drawn over it in its box, as module 6's windows are:
  `windowLine4.standard.servoPress.png` and `windowLine5.standard.sprayRobot.png`, view 0, with
  `windowLine4.standard.servoPress.work.sheet.png` and `windowLine5.standard.sprayRobot.work.sheet.png`
  if they move. An overlay lies over the whole module, so a robot inside module 5's clear cabin would
  be painted over the cabin's front posts and panels unless the overlay carries them again in front
  of it.
- **(b) The whole module drawn again** under a key of its own, the house's way for a machine with a
  part fitted: the CNC with its tool changer is `cncToolChanger.<class>.png` (v56), the whole machine
  drawn again on the same canvas. So `windowLine4Servo.standard.png` and
  `windowLine5Robots.standard.png`, each with its `.r` (for the tests and the Sprite check page) and
  its `.work.sheet.png`. A family's classes are the five or `standard` alone (SPRITES.md 13), so a
  second class of the module would be a key of its own in this way rather than a sixth class name.

(b) is the cleaner of the two for module 5, because of its clear cabin. The names are proposals.

Whether the four cards in the catalogue should have a picture of their own, catalogue only as the
cutter cases are (112 by 112, the 1 by 1 by 1 canvas, anchor 56, 104), is the same question for
Piotr.

## 6. Still outstanding from earlier turns [LOW]

Read off `public/sprites` and `public/sounds` tonight.

- **The two timber stores drawn empty** (`REQUESTS-T29.md` 3): not landed. `timberRack.standard.png`
  and `timberShelter.standard.png` and their `.r` are still the full pictures of Turn 29.
- **A figure for the line engineer** (`REQUESTS-T29.md` 5): still for Piotr to decide, not to draw.
  From Turn 30 there are two of them for the whole line of six.
- **The products on the hall** (`REQUESTS-T29.md` 6): still for Piotr. The stillage of finished
  windows at the end of the line is answered, for the line's contract, by L3's pallet (1); the pack
  of timber at the gate, the trolley of machined parts and the rack of frames drying are unchanged.
- **The rest** (`REQUESTS-T29.md` 7): the labourer's bench sheet `character.helper.bench` (the
  helper has `carry`, `idle`, `sweep` and `walk`); the `.rr` and `.rrr` quarter turns of every floor
  family but the tool cabinet; and the seven recordings of `docs/art/REQUESTS-T20.md` 1, with
  `public/sounds` holding its README alone. This turn adds no sound of any kind (CLAUDE.md T30
  section 6).

## 7. Sources

Read for this page: `CLAUDE.md` (Turn 30) sections 0, 2.2, 2.4, 2.8, 2.10 to 2.12, 5 (T30-E1), 6
and 8; `REPORT-T30.md` (A0 to C5); `docs/art/REQUESTS-T28.md`; `docs/art/REQUESTS-T29.md`;
`docs/art/SPRITES.md` sections 1, 2, 3, 6, 10, 13 and 15; `docs/art/pack-1110/README-L2.md`,
`HANDOFF-L1.md` and `dimensions-L1.json`; `docs/art/pack-0910/camera-QA.md` and `EDITED.md`;
`docs/mockups/t30/README.md` and `hall-line-whole.png`; `src/engine/constants.ts`
(`LINE_MODULE_SHARES`, `LINE_PRICE`, `WINDOW_LINE_ORIGIN`, the `LINE_` constants, `LINE_PALLET_LAYOUT`,
`LINE_UPGRADES`, `MACHINE_WORK_SHEETS`, `FORKLIFT_VARIANTS` and the `forklift` spec,
`FINISHED_GOODS_LAYOUT`, `CNC_TOOL_CHANGER_SPRITE`); `src/engine/lineContract.ts`;
`src/render/hall.ts` (`moduleWorks`, `workingArt`, `palletStack`, the `data-line-pallet` boxes);
and the files `public/sprites/forklift.*.png`, `windowLine5.standard.png`,
`windowLine6.standard.png` and `windowLine6.standard.stack10.png`, whose sizes and alpha were read
off the files.
