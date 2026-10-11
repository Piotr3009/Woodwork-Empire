# Art and recordings requested after Turn 31

The shape `docs/art/REQUESTS-T30.md` left. Written 11.10.2026, the night Turn 31 put the art side's
L3 into the game (CLAUDE.md T31 2.10 and T31-E1). Piotr's words that evening, on L3: "akceptacja
jest", and "won't we add it to this turn?". So its three pictures are in `public/sprites/` byte for
byte as they came (each matches its line in `docs/art/pack-l3-1110/checksums.sha256`), moved there by
`git mv` from `docs/pictures-l3/`, which is gone; `docs/art/SPRITES.md` 16 lists them with their
canvases, anchors and rows; the rest of the pack is in `docs/art/pack-l3-1110/`. The hall's longer
background of Turn 31 was cut from the 800 m² picture by `scripts/hall-long.py` and painted by nobody
(SPRITES.md 9.9), and the timber shelter's two files only changed places back (SPRITES.md 13). No
agent has altered a pixel of any picture (CLAUDE.md T31 section 1).

**Nothing new is asked of the art side tonight** (CLAUDE.md T31-E1). This page names what chat's
order of 11.10 asked and is still to come, the outside sheet store (S1), so the next turn can take
it in; puts the forklift family's own pictures before Piotr; and lists what of tonight may sit badly
on the hall, for T31-E4's pictures to be read for. No request here is [CRITICAL]: the game is whole
tonight without any of them.

Every figure below is worked from the contract's own arithmetic (`docs/art/SPRITES.md` 2) and the
camera `sx = ox + 48 x (X - Y)`, `sy = oy + 24 x (X + Y) - 48 x Z` at 2x (the game's
`tileToScreen` is the same at half the pixels), or read off the pack's own reports, which are named.

| # | Priority | What | Asked or for Piotr |
|---|---|---|---|
| 1 | [HIGH] | S1: the outside store of 1,000 sheets | asked on 11.10, still to come |
| 2 | [MEDIUM] | What may sit badly on the hall: the forklift's depth and its corner, the pallet's turn as it is set down, the pallet at the gate and the finished goods' label, the shelter's roof over the wall, the longer hall's join | to be checked in T31-E4's pictures |
| 3 | [LOW] | The forklift family's own pictures, a 1 by 1 by 1 m frame beside L3's forklift at true size | for Piotr, not to be drawn yet |
| 4 | [LOW] | Still outstanding from earlier turns | unchanged |

**What landed of `REQUESTS-T30.md`.** Its 1 and 2, L3, came on 11.10 as one approved pack and are in
the game from Turn 31 (C4). Where the delivery differs from what that page proposed:

- **The pallet standing alone** is `windowPallet.standard.png` (the page proposed
  `linePallet.standard.png`), at the page's own figures: 2 by 1 by 1.75 m, 160 by 172 px, anchor
  104, 164. Its wooden base is 1.45 by 1 m with its top at 0.228 m, and its ten windows are L2's
  `stack10` with no scaling (the pack's `HANDOFF-CLAUDE.md`). A 90 degree view came too (anchor 56,
  164, in the game's own convention `(x, y, z) -> (y, w - x, z)`, the pack's `camera-QA.md`); it stays
  in the pack and is not served, since nothing turns the pallet. Of 1.4's two things, the simplest
  was taken for both: a part pallet is drawn as the full one with the label counting pallets, and the
  second pallet stands beside the first along x, at x 2 to 3, y 10 [TUNE: chat].
- **The forklift** came as two sheets of four rows each, one row a direction, where the page proposed
  eight sheets of one row: `vehicle.forklift.drive.sheet.png` (forks empty) and
  `vehicle.forklift.driveLoaded.sheet.png` (the pallet of ten on its forks), each 1,632 by 1,024,
  cells of 272 by 256, six frames at 8 a second, rows `sw` 0, `se` 1, `nw` 2, `ne` 3, the forks
  pointing the way it drives, none mirrored. In place of the proposed square frame of 3 by 3 by 2.25
  m anchored on its diamond (304 by 268, anchor 152, 260), the anchor is 136, 192 in every cell: one
  point of the floor under the middle of the forklift with its load, the same in both sheets, so the
  empty forklift is not centred on it. By the pack's own bounds (`reports/vehicle.forklift.drive.json`)
  it is about 3.9 m from its counterweight to its fork tips (1.95 m behind the anchor, 1.94 ahead),
  1.36 m wide and 2.2 m high, longer than the "within 3 m" the page guessed. Its driver wears a
  reflective vest (the pack's `README.md`), where the page proposed the crew's green shirt unless
  Piotr said otherwise; Piotr approved it as it is.
- **The page's two questions** (2.4) were answered by the brief with the simplest of each [TUNE:
  chat]: the forklift is the line's own, and its driver is part of the picture and takes no man's
  time. The optional sheets of the forks lifting and setting down (2.3) were not drawn, and the game
  draws none: the pack says the lane, the trips and the lifting are the game's.
- **Its 3** (what sat badly) was read in T30-E4's pictures (`REPORT-T30.md`): the modules meet end to
  end, module 5's clear roof shows its robot, and the box at the gate stood over the start of the
  finished goods' label. L3's pallet stands in that box's place at its height, so the last is still to
  be read (2.4 below). **Its 4** holds: the pallet's 90 degree view is in the game's convention. **Its
  5 and 6** are unchanged (4 below).

---

## 1. S1: the outside sheet store [HIGH]

### 1.1 What was asked, and where it is

Piotr, 11.10: "An outside store for sheets too, but dear: 1,000 sheets, about 100k" (CLAUDE.md T31
section 0). Chat ordered it from the art side on 11.10 as S1, in the same order as L3: the pack's own
command for checking itself names that order `reference/brief-1110/zamowienie-gpt-l3-s1-1110.md`.
The pack's `reference/` folder was left out of the repo and is kept by Piotr in the delivered ZIP
(`docs/art/pack-l3-1110/EDITED.md`), so S1's own figures are not here. The pack's `README.md` and
`HANDOFF-CLAUDE.md` say S1 is the art side's next stage. It is not here tonight (CLAUDE.md T31
section 8): nothing of it is in the code, and no placeholder was drawn for it (CLAUDE.md T31 section
6). It is not asked again: this section is what the turn that takes it in will read.

### 1.2 What the turn that takes it in will want from the delivery

Nothing beyond the contract, which already says it:

- the metres it is drawn for, `w` by `d` by `h`, and from them the file, `(w + d) x 48 + 16` by `(w + d)
  x 24 + h x 48 + 16` px, with the anchor at `8 + w x 48` from the left edge and 8 px above the bottom;
- one class, `standard`, as the timber stores are (SPRITES.md 13);
- view 0 drawn in the game's convention, and the `.r` on the same canvas with its anchor at `8 + d x
  48` if it is ever to be turned; kit outside never is, so the shelter's and the van's `.r` are on disk
  for the tests and the Sprite check page only;
- no floor, no shadow, no text, as every picture.

### 1.3 Where it may stand, and what of it will be seen

Where it stands is the code side's and Piotr's, in the turn that takes it in. His rule for the timber
shelter was: "it hides our hall; rather where the extractors are, or behind them; nothing in the hall
may be hidden" (CLAUDE.md T31 2.8). If the sheet store stands behind the rear wall with the plant and
the shelter, it is drawn through the wall's clip, which shows what the screen puts above the back edge
of the wall's top (3.5 m, 0.9 m behind the wall's face). In the game's camera a metre further back
from that edge is drawn as high as a metre further up, so a thing there shows over the wall wherever
its height is more than 4.4 m less its distance behind the wall's face. The shelter, 3 m high on y -4
to -1, shows the back 2.6 m of its roof (2.5 below). A store standing there is seen mostly as its top
and the upper part of its end towards the camera; its plate, the sheets on it and its room, would hang over the
wall's top as the shelter's does. On the apron, at the end of the hall, it would be drawn whole, in
front of the hall's end, which is where the shelter stood and why it was moved. The art side may want
to know which before it draws.

## 2. What may sit badly: to be checked in T31-E4 [MEDIUM]

Nothing below is recorded as wrong. It is what T31-E4's pictures are to be read for, and
`REPORT-T31.md` will say what they showed. The positions are for the line at its order's place, x 2 to
37, y 14 to 16, in the 800 m² hall (40 by 20 m): its men at y 17, its lane's front strip at y 18 and 19
from x 0 to 38, its left strip at x 0 and 1 from y 10 to 19. The forklift waits at x 37, y 19, turns at
the corner x 1, y 19, and stops at x 1, y 11.725, where the middle of the pallet on its forks (1.225 m
ahead of its anchor, the pack's `loadCenterXM`) is over the middle of the first place at the gate.

### 2.1 The forklift's depth

The forklift is put among the hall's drawables by the one point its anchor is on, as a man is by his
feet (`placeAmongDrawables` in `src/render/walkers.ts`), while its body reaches about 1.95 m before and
behind that point along the way it drives. A man is half a metre wide; the forklift is nearly four
metres long. To be looked at:

- on the front strip, where it should be drawn over the six modules (y 14 to 16) and the men at their
  front (y 17), never under them;
- up the left strip beside module 1's end (x 2, y 14 to 16), where module 1 should be drawn over it,
  since the forklift is the further from the camera there;
- at the drop, beside the finished goods (x 0 and 1, y 9) and a second pallet (x 2 and 3, y 10);
- men walk the left strip too, the two metres between the left wall and module 1, and the forklift
  and a man pass through one another: neither knows the other.

### 2.2 The corner

A corner is a turn on the spot [TUNE: chat], about the anchor, and the lane is two metres wide. At the
corner (x 1, y 19) the forklift arriving loaded faces `nw`, so its forks and the pallet reach about x
-0.95, a metre past the left wall's line; turned to `ne`, its counterweight reaches about y 20.95, a
metre past the front of the hall. Coming back empty it arrives facing `sw` with its fork tips at about
y 20.94, and turned to `se` its counterweight at about x -0.95. To be seen whether that reads as a
forklift turning in a tight corner or as one through the walls.

### 2.3 The pallet's turn as it is set down

On the forks the pallet lies along them: its 1.45 m base and the windows' 1.10 m width run along the
way the forklift drives, and the ten of them are stacked across it (the pack's
`reports/load-contact-QA.json`, the load from 0.5 to 1.95 m ahead of the anchor and 1 m across). The
pack's own transforms (`reports/vehicle.forklift.driveLoaded.json`) turn the forklift to `ne` by `(x,
y) -> (y, -x)`, so on the left strip the pallet on its forks lies along y. At the gate the picture
stands it along x (view 0 on the 2 by 1 of `LINE_PALLET_LAYOUT`). So in the frame it is set down it
turns a quarter, and the newest pallet appears in view 0. The pack's 90 degree view is, by the game's
convention `(x, y, z) -> (y, w - x, z)`, the pallet as it lies on the forks there; it is not served,
and the place at the gate is 2 m along x by 1 m along y. On the front strip (`nw`) the pallet on the
forks is the view 0 pallet turned a half turn, its other faces towards the camera.

Two more things of the drop: over the drop the pallet on the forks reaches y 9.775, a quarter of a
metre into the finished goods' row (y 9); and with one pallet already at the gate, the forklift sets
the newest down over the first place and it is drawn at the second (x 2 to 3), two metres along.

What to do about any of it is Piotr's (`docs/notes-t31.md` 6): leave it, or have the pallet set down
along the forks, which would want the 90 degree view served and a place at the gate 1 m along x by 2
m along y, on the head of the left strip as the first place is now. Nothing is asked of the art side unless he chooses something that
needs a new picture.

### 2.4 The pallet at the gate and the finished goods' label

From Turn 30 (`REPORT-T30.md`): the box at the gate stood at y 10, 1.75 m high, in front of the
finished goods (y 9, 1 m high) and over the start of their label, `At the gate: N`. L3's pallet stands
in that place at that height, so it should do the same. Where the labels hang is the code side's, not
the art side's.

### 2.5 The shelter's roof over the wall

From Turn 31 the timber shelter stands behind the rear wall on 6 m by 3 m (y -4 to -1), 3 m high,
drawn through the wall's clip as the plant is, and its plate hangs 0.6 m over the wall's top. The brief
had it hidden by the wall (CLAUDE.md T31 2.8). By the arithmetic of 1.3 its open front is hidden and
the back 2.6 m of its roof shows over the wall at every zoom, the camera never turning. To be seen
whether that reads as a roof behind a wall, as the extractors' tops do, and whether the plate sits
clear of it.

### 2.6 The longer hall's join

The hall that grows (CLAUDE.md T31 2.7) is laid of three pieces cut from `hallBackgroundDeep.png` by
`scripts/hall-long.py` (SPRITES.md 9.9): ten metres of the hall (x 28 to 39, its first metre
feathered), its end (from x 39), and a tile of the picture's flat ground, 480 by 240, laid as a
pattern under the whole longer scene. The acceptance is the brief's: a 60 m and a 100 m hall at x1
with no seam seen, and a join at the closest zoom, in `REPORT-T31.md`. To be read also: the ground's
tile repeating where the longer scene shows more ground than the 800 m² picture holds. If a seam shows,
the cure would be a piece painted to be laid along the hall, which would be the art side's to draw;
nothing is asked tonight.

## 3. The forklift family's own pictures [LOW]

**For Piotr to decide; nothing is drawn until he says** (CLAUDE.md T31 section 8).

- **The family** is `forklift` in `src/engine/constants.ts`: five classes, `Hand pallet truck`,
  `Electric pallet truck`, `Forklift`, `Better forklift` and `Heavy forklift`, each declared 1 by 1 by
  1 m, a piece of kit that stands on the floor (its starting place is x 18, y 6) and makes the lorry's
  unloading faster. Its ten files, `forklift.<class>.png` and their `.r`, are the 1 by 1 by 1 m canvas,
  112 by 112 px with the anchor at 56, 104 (REQUESTS-T30 2.1). They are not touched tonight.
- **L3's forklift** is the line's own and no kit: about 3.9 m long, 1.36 m wide and 2.2 m high at true
  size (1 above). The pack says its model was made to look like `forklift.standard.png`: the green
  body, the dark mast, the open guard. A company that owns a forklift and the line has both on the hall
  at once, the one about a metre long and the other nearly four.
- **If Piotr wants the five drawn again at true size**, each class's metres change, and with them its
  footprint, its zone and where it may stand: a change to the family's spec, which tonight's brief
  forbids (CLAUDE.md T31 section 6) and which the turn that takes them would make. The art side would
  then draw them with the contract's arithmetic for their new metres, view 0 and `.r`.
- **The forks lifting and setting a pallet down** (REQUESTS-T30 2.3, optional) are parked with them.

## 4. Still outstanding from earlier turns [LOW]

Read off `public/sprites` and `public/sounds` tonight.

- **The two timber stores drawn empty** (`REQUESTS-T29.md` 3): not landed. `timberRack.standard.png`
  and `timberShelter.standard.png` and their `.r` are the full pictures of Turn 29; from Turn 31 the
  shelter's `.png` is the art side's 0 view again.
- **A figure for the line engineer** (`REQUESTS-T29.md` 5): still for Piotr, not to be drawn.
- **The products on the hall** (`REQUESTS-T29.md` 6): the stillage of finished windows at the end of
  the line is answered by L3's pallet; the pack of timber at the gate, the trolley of machined parts
  and the rack of frames drying are unchanged.
- **Whether the four upgrades are drawn** (`REQUESTS-T30.md` 5): unchanged, for Piotr.
- **The rest** (`REQUESTS-T29.md` 7): the labourer's bench sheet `character.helper.bench` (the helper
  has `carry`, `idle`, `sweep` and `walk`); the `.rr` and `.rrr` quarter turns of every floor family
  but the tool cabinet; and the seven recordings of `docs/art/REQUESTS-T20.md` 1, with
  `public/sounds` holding its README alone. This turn adds no sound (CLAUDE.md T31 section 6).
- **L2b.** The L3 pack names an optional L2b that needs Piotr's own yes and was not started; nothing
  in the repo says what it is.

## 5. Sources

Read for this page: `CLAUDE.md` (Turn 31) sections 0, 1, 2.6 to 2.8, 2.10, 5 (T31-E1), 6 and 8;
`REPORT-T31.md` (A0 to D1); `REPORT-T30.md`; `docs/art/REQUESTS-T30.md` and `REQUESTS-T29.md`;
`docs/art/SPRITES.md` sections 9.9, 13, 15 and 16; `docs/art/pack-l3-1110/README.md`,
`HANDOFF-CLAUDE.md`, `EDITED.md`, `camera-QA.md`, `dimensions.json`, `approval.json`,
`checksums.sha256`, `reports/load-contact-QA.json`, `reports/vehicle.forklift.drive.json` and
`reports/vehicle.forklift.driveLoaded.json`; `docs/mockups/t31/decisions.md`; `src/engine/constants.ts`
(`FORKLIFT_SHEETS`, `FORKLIFT_CELLS_PER_SECOND`, `FORKLIFT_LOAD_AHEAD`, `LINE_PALLET_LAYOUT`,
`LINE_PALLETS_DRAWN`, `FINISHED_GOODS_LAYOUT`, `FORKLIFT_VARIANTS`, `TIMBER_SHELTER_VARIANTS`,
`STARTING_LAYOUT`); `src/engine/layout.ts` (`forkliftLane`); `src/render/forklift.ts`;
`src/render/walkers.ts` (`placeAmongDrawables`); `src/render/hall.ts` (`REAR_WALL`, `rearWallClip`,
`rackCount`, the pallets at the gate, the longer hall's layers); `src/render/iso.ts`
(`tileToScreen`); `scripts/hall-long.py`; and the files `public/sprites/windowPallet.standard.png`,
`vehicle.forklift.drive.sheet.png`, `vehicle.forklift.driveLoaded.sheet.png`, `forklift.*.png`,
`timberShelter.standard.png` and the three `hallBackground*` pieces, whose sizes and checksums were
read off the files.
