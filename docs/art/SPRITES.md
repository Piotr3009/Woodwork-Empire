# Sprite contract: Woodwork Empire

This file is the single contract between the art side (GPT, generating PNG sprites) and the code side
(Claude Code, loading them). Both read it. Neither changes it without Piotr.

Author: Claude (chat), 12.09.2026. Footprints and keys copied from `src/engine/constants.ts` on `main`
after Turn 2. If a footprint changes in the engine, this file is updated in the same PR.

---

## 1. Camera and projection (fixed, one camera only)

- 2D isometric in the game sense: a 2:1 dimetric projection. The floor tile is a diamond twice as wide
  as it is tall. Screen tile: 48 px wide, 24 px tall. One vertical world unit ("one tile of height")
  rises 24 px on screen.
- The camera looks from the south-east corner of the hall towards the north-west. On screen, the
  world x axis runs down-right, the world y axis runs down-left, up is up.
- Light comes from the upper left of the screen. Left-facing surfaces are lit, right-facing surfaces
  are in shade, tops are the brightest. Every sprite must agree with this or it will look pasted on.
- No cast shadows in the sprite. The game draws a soft contact shadow under every object. A sprite
  with its own shadow gets a double shadow.
- No ground, no floor, no grid in the sprite. Transparent background, straight alpha.

## 2. Resolution and canvas size per object

Sprites are delivered at **2x**: one screen tile = 96 × 48 px in the file. The loader scales down by
half, which hides generation noise and keeps edges clean.

For an object with footprint `w` tiles (along world x) by `d` tiles (along world y) and height `h`
tiles, the 2x canvas is:

- canvas width `W = (w + d) × 48` px
- canvas height `H = (w + d) × 24 + h × 48` px
- plus 8 px of transparent padding on every side, so the file is `W + 16` by `H + 16`.

The **anchor** is the bottom corner of the footprint diamond: the lowest point of the object's floor
outline. It sits at pixel `(8 + w × 48, H + 8)` counted from the top-left of the file, 8 px above the
bottom edge, which is the canvas's middle only when `w` and `d` are equal; in a turned `.r` file the
footprint is `d` by `w` and the anchor is at `(8 + d × 48, H + 8)` (the code has placed it so since
14.09, `spriteAnchorIn` in `src/render/sprites.ts`). The loader places that pixel on the tile corner.
If the object is drawn off its anchor, it will stand in the wrong place in the hall; check this
before delivering.

The floor outline of the object must fill its footprint diamond: a 4 × 2 machine occupies a diamond
that is 4 tiles along one edge and 2 along the other, with the long side running down-right. Objects
that are visually smaller than their footprint (a compressor on a 2 × 2 tile) still get the full canvas
and sit centred on the diamond.

## 3. Naming and format

- File name = `spriteKey` from the engine exactly, then `.png`. Lower camel case as in the engine:
  `tableSaw.png`, `sheetRackBetter.png`. No spaces, no capitals at the start, no suffixes.
- Files go to `public/sprites/` on branch `art/sprites`. One PR per batch.
- PNG, 8-bit RGBA, transparent background, no colour profile, no metadata needed.
- Machine tiers (from Turn 3) use `spriteKey` plus the tier suffix: `tableSaw.used.png`,
  `tableSaw.budget.png`, `tableSaw.standard.png`, `tableSaw.pro.png`, `tableSaw.industrial.png`.
  When a tier file is missing the loader falls back to the plain key, then to the placeholder box.

## 4. Style sheet (paste into every prompt)

Realistic, not cartoon, not pixel art, not clip art. A photographed-looking small industrial object,
rendered clean. Think of a product photo of workshop equipment, re-drawn as a game asset.

- Materials read as what they are: painted steel (slightly worn), cast iron tables (dull grey),
  laminated chipboard (pale wood grain, thin edge band), plywood, rubber hoses, yellow safety marks.
- Colours muted and slightly desaturated; no neon, no glossy plastic look.
- Fine detail present but not busy: bolts, switches, a brand plate without any real brand name, a bit
  of sawdust on flat surfaces of machines.
- Edges crisp, no outline stroke, no black cartoon lines.
- No people, no text, no logos, no real brands, no numbers.
- Same light every time: upper left, soft, one key light, gentle ambient.

## 5. Prompt template

Fill the three brackets, paste the rest unchanged.

```
Isometric game sprite of a [OBJECT DESCRIPTION], for a realistic 2D workshop management game.
Strict 2:1 isometric projection (dimetric, floor diamond twice as wide as tall), camera from the
south-east looking north-west, object rotated so its long side runs down-right on screen.
Realistic materials, not cartoon, not pixel art: [MATERIALS]. Muted, slightly desaturated colours.
Soft light from the upper left; left faces lit, right faces in shade, top brightest. No cast shadow.
No floor, no ground, no grid, no background of any kind: fully transparent PNG. No people, no text,
no logos, no brands. Crisp edges, no outline strokes. The object fills a floor footprint of
[W] by [D] tiles and stands about [H] tiles tall; centre it on the canvas with the lowest point of
its base exactly at the bottom centre. Single object only.
```

Canvas: ask for the exact pixel size from the table below, or crop and pad afterwards to that size.

## 6. First batch (priority order) with canvas sizes at 2x

| # | spriteKey | Object | w × d × h | Canvas W × H (before 16 px padding) | Description for the prompt |
|---|---|---|---|---|---|
| 1 | tableSaw | Table saw (cabinet saw) | 4 × 2 × 2 | 288 × 240 | cast iron table saw with a rip fence, sliding side extension table, blade guard, painted steel cabinet base, dust port hose |
| 2 | workbench | Joiner's workbench | 3 × 2 × 1 | 240 × 168 | heavy beech top workbench with a front vice, tool shelf underneath, a few clamps hanging |
| 3 | edgebander | Hand edgebander | 3 × 2 × 2 | 240 × 216 | small bench-top hand edgebander on a steel stand, roll of edge band, glue pot, painted steel |
| 4 | extractor | Dust extractor | 2 × 2 × 3 | 192 × 240 | mobile single-bag dust extractor, tall filter bag on top, collection bag below, flexible hose, painted steel frame on castors |
| 5 | sheetRack | Cheap sheet rack | 4 × 1 × 2 | 240 × 216 | simple vertical A-frame rack holding a few chipboard and MDF sheets on edge, galvanised steel |
| 6 | compressor | Small compressor | 2 × 2 × 1 | 192 × 144 | small portable piston compressor with a horizontal tank, wheels, gauge, coiled air hose |
| 7 | desk | Office desk with laptop | 3 × 2 × 1 | 240 × 168 | plain office desk, laminate top, an open laptop, a phone, a folder, mug |
| 8 | chair | Office chair | 1 × 1 × 1 | 96 × 96 | basic black swivel office chair |
| 9 | locker | Staff locker | 1 × 1 × 2 | 96 × 144 | single narrow steel locker, grey, one door, vent slots |
| 10 | canteenSeat | Canteen seat | 1 × 1 × 1 | 96 × 96 | simple plastic canteen chair, one seat |
| 11 | sheetRackBetter | Better sheet rack | 4 × 1 × 2 | 240 × 216 | heavier cantilever rack with more sheets, painted steel, labelled bays without text |
| 12 | van | Van | 4 × 2 × 2 | 288 × 240 | white medium panel van, rear doors, roof bars, slightly dirty, no livery |
| 13 | forklift | Forklift | 2 × 2 × 2 | 192 × 192 | small counterbalance forklift, mast up front, orange or yellow paint, black tyres, no driver |
| 14 | thicknesser | Thicknesser | 3 × 2 × 2 | 240 × 216 | planer-thicknesser on a steel stand, cast iron tables, extraction hood, hand wheel |
| 15 | solidWoodTools | Solid wood tool set | 3 × 2 × 2 | 240 × 216 | router table with a hand router, belt sander and a rack of sash clamps grouped together on a low stand |

Later batches: `roomOffice`, `roomWc`, `roomCanteen` (4 × 4 × 2, 384 × 288, drawn as small rooms with a
door facing south-east), `forkliftBetter`, `cnc` (5 × 3 × 2, 384 × 288), `cncHead`, `sprayBooth`
(5 × 3 × 3, 384 × 336), `dustSystem` (3 × 3 × 4, 288 × 336), `pelletiser` (2 × 2 × 2.5, 192 × 216), the
office desk items (`laptop`, `ledgerFolder`, `materialsBinder`, `catalogue`, `teamBoard`, `phone`),
`drill`, `handToolSet`, and the machine tier variants of the table saw.

From v56 (PIOTR, 25.09) the CNC tool changer head has no picture of its own: it is bolted to the
CNC, and the hall draws a CNC that carries one as `cncToolChanger.<class>.png` and its `.r`, on the
CNC's own canvas and anchor, with the extraction outlet on the same pixel (the art side's pack of
24.09, delivered as `cnc.<class>.with-toolchanger`). The spray booths are the size of their pictures:
3 × 2 × 2.5 m used (drawn 3 × 1.6 and stood at the front of its 3 × 2), 3 × 2 × 2.6 budget,
4 × 3 × 3 standard, 5 × 3 × 3.2 pro and 6 × 4 × 3.4 industrial.

## 7. Acceptance checklist (Piotr and Claude use this before merging a batch)

1. File name equals the `spriteKey`, `.png`, in `public/sprites/`.
2. Transparent background, no floor or shadow baked in.
3. Projection reads as 2:1: the base diamond is twice as wide as tall, long side down-right.
4. Light from the upper left, right faces darker.
5. Canvas size and anchor per the table: base's lowest point at bottom centre, 8 px padding.
6. Style matches the sheet: realistic, muted, no outlines, no text, no brand.
7. On the `/sprites` test page in the game, the sprite sits on its footprint without floating or
   sinking and matches the neighbours in scale.

A sprite that fails 3, 4 or 5 is regenerated, not edited around in code.

---

## 8. Office view (approved by Piotr, 12.09.2026): a room, not a sprite

The office is the one exception to the isometric contract. It is a full-screen photoreal room seen
from the owner's chair, in the spirit of the room screens of Airline Tycoon. The hall stays isometric.
The two never share a screen, so the two styles never meet.

### 8.1 Layers

Three PNG layers on one shared canvas, **1672 × 941 px**, aligned at origin (0, 0), stacked in this
order. The game scales the whole stack uniformly to fit the viewport below the top bar, keeping the
aspect ratio, letterboxed on the page background.

| Layer | File in `public/sprites/` | Format | Contents |
|---|---|---|---|
| 1 | `officeBackground.png` | RGB, opaque | walls, floor, door, Work Plan whiteboard with the Joinery Core sign, Orders corkboard, clock casing |
| 2 | `officeDesk.png` | RGBA | desk top, product catalogue (left), blue Accounting binder (right) |
| 3 | `officeLaptop.png` | RGBA | laptop with a blank screen |

GPT's delivery names (`office-background.png`, `office-desk.png`, `office-laptop.png`) are renamed
to the keys above before they enter the repository. `office-preview.png` is a review composite and
does not go into `public/sprites/`.

The desk, catalogue and binder upgrade together (one layer). The laptop upgrades on its own. A later
office (bigger, nicer, as the company grows) is a new set of three files with a suffix
(`officeBackground.large.png` and so on) and the same canvas size and regions unless this section
is updated.

### 8.2 Click regions (in canvas pixels, before scaling)

The game draws no visible buttons on the room. Hover lightens the region a little and shows the
name; click opens the modal. Regions are simple rectangles in canvas coordinates; the game converts
them through the same scale it applies to the layers.

| Region | Rectangle (x, y, w, h) | Opens |
|---|---|---|
| Work Plan board | 20, 10, 365, 515 | jobs in progress modal (every job with its five-step row and Start production) |
| Orders board | 1290, 20, 372, 500 | order board modal (enquiries) |
| Door | 640, 15, 305, 585 | the hall view |
| Clock | 1040, 88, 122, 58 | nothing; it is the live clock (8.3) |
| Laptop | 558, 449, 557, 443 | laptop modal: tabs Tasks, Materials, Team, Drawings |
| Catalogue | 60, 680, 445, 210 | equipment catalogue |
| Accounting binder | 1170, 620, 435, 280 | accounting modal |

The desk itself and the floor are not clickable. The Joinery Core sign is part of the Work Plan
board region and is not a separate control: it is the brand of the management software the player
buys in the game (Piotr's decision: it is the advert).

### 8.3 Live text drawn by the game over the layers

Two texts are rendered by the game as HTML positioned in canvas coordinates and scaled with the
stack. The artwork leaves these areas blank on purpose.

| Text | Rectangle (x, y, w, h) | Content and style |
|---|---|---|
| Clock digits | 1050, 96, 102, 40 | game time `HH:MM`, seven-segment look, amber on the dark casing, 28 px at scale 1 |
| Company name | 200, 92, 170, 46 | the player's company name, dark grey marker lettering, right of the "Work Plan" title, 22 px at scale 1, one line, ellipsis if longer |

Everything else on the boards (the Gantt bars, the pinned sheets, the catalogue and binder labels)
is illustrative artwork and stays static. Live job data lives in the modals the boards open.

### 8.4 What moved where (compared to the Turn 3 desk)

The Turn 3 office had seven desk items. The room has four clickable objects, two boards and a door.
Mapping approved by Piotr:

- Laptop: office tasks (as before) **plus Materials, Team and Drawings as tabs inside the laptop**.
  The separate desk items `materialsBinder`, `teamBoard`, `drawings` and `phone` go away with the
  room; their modals stay and open from the laptop tabs (one path per modal, only the entry moves).
- Catalogue: the equipment catalogue (as before).
- Blue binder: Accounting (as before; `ledgerFolder`).
- Work Plan board: jobs in progress (the laptop's "Jobs on the books" list moves here).
- Orders board: the order board (the same modal the top bar Board button opens).
- Door: back to the hall (the same view switch the top bar toggle does).

### 8.5 Acceptance for office layers

1. Exactly 1672 × 941, all three files; layers 2 and 3 with real alpha (no baked checkerboard).
2. Stacked at origin they reproduce `office-preview.png`.
3. The clock face and the strip right of "Work Plan" are free of baked text.
4. No people, no real brand except the Joinery Core sign.
5. On the game's office view at 1280 px wide, every region in 8.2 opens the right modal and the
   two live texts sit inside their blank areas.

---

## 9. Hall (approved by Piotr, 13.09.2026): painted background on the game grid

The hall is a painted isometric background with two movable room layers, registered to the game
grid. Measured against the template: front edges 26.6 and 26.7 degrees (2:1), floor corners within
3 px, rooms and shutter within 3 px. Machines, benches, racks and figures stay sprites placed on the
grid on top of it.

### 9.1 World unit changes to 1 metre

From this section on, **one grid cell is 1 m × 1 m**, not 0.5 m. The starting hall is 20 × 10 m
= 200 cells (x = 0..20 along the rear wall, y = 0..10 along the left wall, origin at the rear-left
corner). Every footprint given in tiles earlier in this file is in 0.5 m tiles: divide by two to get
metres (table saw 4 × 2 × 2 tiles = 2 × 1 × 1 m). The engine's footprints are re-expressed in
metres in the same turn that adopts this hall.

Screen scale at 1x: 1 m = 48 × 24 px (the tile the game already draws), 1 m of height = 24 px.
Sprite files stay at 2x: 1 m = 96 × 48 px, 1 m of height = 48 px. The canvas formula of section 2
holds with `w`, `d`, `h` in metres. Objects therefore draw at half the on-screen size they had on
the 60 m² hall; that is the price of 200 m² on one screen and it was accepted.

### 9.2 Projection constants (identical in the template, the art and `render/iso.ts`)

For world (x, y, z) in metres, on the 2x canvas:
`sx = ox + (x - y) × 48`, `sy = oy + (x + y) × 24 - z × 48`, with `ox = 600`, `oy = 288` on the
1680 × 1128 canvas (padding 120 px, wall height 3.5 m). At 1x the game divides everything by two and
offsets to its own viewport. Floor corners on the canvas: (0,0) = 600, 288; (20,0) = 1560, 768;
(0,10) = 120, 528; (20,10) = 1080, 1008.

### 9.3 Layers

| Layer | File in `public/sprites/` | Format | Contents | Position |
|---|---|---|---|---|
| 1 | `hallBackground.png` | RGB, opaque | floor, rear and left walls, front kerbs, roller shutter, personnel door, the fixed WC block | canvas origin |
| 2 | `hallOffice.png` | RGBA | the office block only | canvas origin; footprint x 1..3, y 0..4, height 2.7 m |
| 3 | `hallCanteen.png` | RGBA | the canteen block only | canvas origin; footprint x 3..5, y 0..4, height 2.7 m |
| review | `hallPreview.png` | RGB | the three stacked | not in the repository |

Canvas 1680 × 1128, all layers aligned at (0, 0). Draw order: background, office, canteen, then
sprites and figures sorted by (x + y) as today. The office and canteen layers are pre-registered to
their footprints; if a later turn lets the player move or enlarge a room, the room becomes a
footprint-anchored sprite like any other object and gets its own canvas per section 2.

Fixed geometry the engine must know (cells): WC x 0..1, y 0..2 (2 cells); office x 1..3, y 0..4
(8 cells); canteen x 3..5, y 0..4 (8 cells); roller shutter on the left wall at y 6..9, 3 m wide,
3 m high; personnel door on the left wall at y 4.5..5.5; gate lane x 0..2, y 6..10 kept clear
(8 cells); room doors on the y = 4 faces (office and canteen) and the y = 2 face (WC), centred,
opening into the hall. Free cells for equipment: 200 minus 18 for rooms minus 8 for the gate lane
= 174.

### 9.4 Accepted quirk

The front kerbs are painted about 0.4 m inside the floor line along the two front edges (y = 10 and
x = 20). The last row of cells along those edges is placeable; an object placed there overlaps the
kerb by a few pixels. Piotr accepted this (13.09.2026); no placement restriction is added for it.

### 9.5 Live text and labels

No text is baked in. The game draws: the company name on the rear wall beside the shutter (canvas
box x 300..560, y 130..200, dark lettering, scaled with the scene), and room labels ("WC", "Office",
"Canteen", or the names Piotr chooses later) as small text on each room's front face. All as HTML
positioned in canvas coordinates.

### 9.6 Acceptance (done for this delivery)

1. 1680 × 1128 all layers; office and canteen with real alpha. Passed.
2. Registration to the template: floor corners, walls, rooms, shutter within 3 px. Passed.
3. No text, logo, people, machines. Passed.
4. Style matches section 4 (realistic, muted, upper-left light). Passed.

### 9.7 The extended hall (v67, PIOTR 03.10.2026: "do we need new art, or will you just double what is there")

A unit that has been extended is 40 × 10 m, and its canteen can be enlarged to 4 × 4 m (x 3..7,
y 0..4, the door where it was, on the y = 4 face at x 4). Two more layers, both made of the three
pictures of 9.3 by `scripts/hall-wide.py` and of nothing else, so nothing was painted for them:

| File in `public/sprites/` | Format | Contents | Used |
|---|---|---|---|
| `hallBackgroundWide.png` | RGB, 2640 × 1608 | the background with its own floor and rear wall carried on to x = 40 | in place of `hallBackground.png` once the unit is extended |
| `hallCanteenWide.png` | RGBA, 1680 × 1128 | the canteen block stood beside itself, the second door walled up, one roof | in place of `hallCanteen.png` once the canteen is enlarged |

The wide background keeps the origin of 9.2 (`ox = 600`, `oy = 288`), so the office and canteen
layers sit on it unchanged; its canvas is the first one plus 20 m: 960 px wider and 480 px taller.
Floor corners on it: (40,0) = 2520, 1248; (40,10) = 2040, 1488. If the art side repaints any of the
three layers of 9.3, run the script again and then `npm run sprites:manifest`.

### 9.8 The 800 m2 hall (v82, PIOTR 04.10.2026: "the extension for timber, the next 400 m2 for a million")

A unit that has had its second extension is 40 × 20 m. One more layer, made of
`hallBackgroundWide.png` by `scripts/hall-deep.py` and of nothing else, so nothing was painted for
it:

| File in `public/sprites/` | Format | Contents | Used |
|---|---|---|---|
| `hallBackgroundDeep.png` | RGB, 3120 × 1848 | the wide background with its floor, its left wall and its kerbs carried on to y = 20 | in place of `hallBackgroundWide.png` once the unit has had its second extension |

The floor grows towards the camera, which is down and to the left on the screen, so this canvas
has an origin of its own: `ox = 1080`, `oy = 288`, which is 480 px further along than 9.2. The
game lays every layer down by its own origin, so the office and canteen layers sit on it
unchanged. Floor corners on it: (0,20) = 120, 768; (40,0) = 3000, 1248; (40,20) = 2040, 1728. If
the art side repaints any of the three layers of 9.3, run `scripts/hall-wide.py`, then this
script, and then `npm run sprites:manifest`.

### 9.9 The hall that grows (Turn 31, PIOTR 11.10.2026: "adding 200 m² at a time")

From its second extension the hall can be made 10 m longer along the rear wall as many times as
the player wants (CLAUDE.md T31 2.7): 50 × 20 m, 60 × 20 m and on. Nothing is painted for it. Three
pieces are cut out of `hallBackgroundDeep.png` by `scripts/hall-long.py`, pixel for pixel, none of
them scaled:

| File in `public/sprites/` | Format | Contents | Cut from 9.8's canvas at |
|---|---|---|---|
| `hallBackgroundLong.png` | RGBA, 1490 × 914 | ten metres of the hall, x 28 to 39 at every depth: the floor, the rear wall and its top, the front kerb, the first metre (28 to 29) coming in from nothing | x 1462, y 790 |
| `hallBackgroundEnd.png` | RGBA, 1060 × 700 | the end of the hall, everything of it from x 39 on: the kerb under the end, the end of the rear wall and of its top, the corner of the front kerb, coming in over the metre before it (38 to 39) | x 1942, y 1030 |
| `hallBackgroundGround.png` | RGB, 480 × 240 | the flat ground the picture is painted on outside the hall (34, 36, 40), one step of the hall's growth, from its top right corner | x 2640, y 0 |

On the wall and above it a piece is cut along the screen's upright, where the wall at x stands; on
the floor and below it along the floor's own x. The two cuts meet on the foot of the rear wall,
which a step of ten metres along the hall lays on itself. The sky over the wall and the ground in
front of the kerb are the picture's flat ground, and that is left out of the long piece and the end
(transparent): the ground piece under them is the same colour, and a feathered metre over flat
ground drew a line one level darker than the ground on either side of it.

**The cut the picture asked for.** The brief's piece was the hall from x 30 to 40, feathered over
its first metre. The painted floor stops at x 39.06, where the kerb under the end of the hall
begins, and the wall's corner shade is at 39.7 to 40. A piece cut to 40 would leave a kerb and a
shade across the floor every ten metres. So the piece is cut ten metres long from 29 to 39, with
its feathered metre 28 to 29. Laid ten metres further along than the one before, its feather comes
in over floor that is there, and its first whole metre covers the kerb under the end of the one
before it. The end comes in over the metre 38 to 39, which is the last piece's last metre and the
same metre of the picture, so the last piece and the end meet as they were drawn: cut hard at the
same x, the two edges, each drawn and scaled on its own, let the ground show through the join.

**The ground.** The longer scene is a bigger rectangle, and at its top right and its bottom left it
shows more ground and sky than any number of pieces laid along the hall can cover: those corners
grow with every piece. So a third piece, the picture's own flat ground, is laid edge to edge under
all of it (an SVG pattern of the file at its own size, nothing stretched). Whatever the long pieces
and the end leave is the picture's own ground.

**How the game lays them.** For a hall of `40 + 10n` m the scene is 9.8's picture, then the ground
under it all, then `n` long pieces, the k-th (from 0) laid 480 × 240 px (2x) further along than the
cut's own place for each of `k + 1` steps, then the end, laid `n` steps along. The office and the
canteen layers sit on top unchanged. The frame of the scene, which the camera's bounds and the zoom
that fits the hall read, is 9.8's canvas and 480 × 240 px more for each piece: `-540 -144 2040 1164`
at 1x for 60 m, `-540 -144 3000 1644` for 100 m. If `hallBackgroundDeep.png` is made again, run
`scripts/hall-long.py` after `scripts/hall-deep.py`, then `npm run sprites:manifest`.

### 9.10 The hall made wider (v95, PIOTR 12.10.2026: "and where is the width?")

From its second extension the hall can also be made 7 m deeper along its whole front, as many
times as the player wants, one at a time: 40 × 27 m, 40 × 34 m and on, longer as well as wider
(60 × 34 m). Nothing is painted for it. Six pieces are cut out of `hallBackgroundDeep.png` by
`scripts/hall-wider.py`, pixel for pixel, none of them scaled:

| File in `public/sprites/` | Format | Contents | Cut from 9.8's canvas at |
|---|---|---|---|
| `hallBackgroundWider.png` | RGBA, 2256 × 1310 | a band of the hall from y 11 to 19 (the floor, and on the left wall its face and its top) from the left wall to x 39, the first metre (11 to 12) coming in from nothing | x 168, y 370 |
| `hallBackgroundWiderFront.png` | RGBA, 1972 × 1166 | the front of the hall, everything of it from y 18 on as far as x 39: the front kerb and the end of the left wall, coming in over the metre 18 to 19 | x 116, y 538 |
| `hallBackgroundLongWider.png` | RGBA, 912 × 456 | the band of a long piece (9.9), x 28 to 39, its first metre along (28 to 29) coming in too | x 1512, y 1224 |
| `hallBackgroundLongWiderFront.png` | RGBA, 626 × 312 | the front of a long piece | x 1462, y 1392 |
| `hallBackgroundEndWider.png` | RGBA, 482 × 242 | the band of the end, from x 38 on: the kerb under the end of the hall | x 1992, y 1464 |
| `hallBackgroundEndWiderFront.png` | RGBA, 196 × 98 | the front of the end: the corner where the two kerbs meet | x 1942, y 1632 |

On the left wall and above it a piece is cut along the screen's upright, where the wall at y
stands; on the floor and below it along the floor's own y. The flat ground is left out of all six:
9.9's ground piece is under them.

**The cut the picture asked for.** The painted floor ends at y 19.06, where the front kerb begins,
as it ends at x 39.06 along the hall (9.9). So a band is cut from 11 to 19 and laid seven metres
further towards the camera than the one before: its feathered metre (11 to 12) comes in over floor
that is there, at 18 to 19, and its first whole metre covers the front kerb of the one before. The
front comes in over the metre 18 to 19, which is the last band's last metre and the same metre of
the picture. The hall's own band and front stop at x 39, where its floor stops, and the end's start
at 38, as the long piece and the end of 9.9 do. The first cut ran the hall's own band and front to
the end of the picture: where a long piece's band lay over it, the two feathers each let a little
of what is under them through, and the kerb under the end showed as a dark patch a metre square at
x 39 of every row.

**How the game lays them.** For a hall `20 + 7m` m deep, after 9.9's composition (the picture, the
long pieces and the end), `m` rows: the j-th (from 1) is the hall's band, every long piece's band
and the end's band, each laid `j` steps of 336 × 168 px (2x) towards the camera, which is down and
to the left on the screen, and a long piece's and the end's as far along as theirs. The end's band
is laid at the end of the hall whether it is longer than 40 m or not. Then the fronts at the m-th
row: the hall's own, every long piece's and the end's. The office and the canteen layers sit on top
unchanged. The frame of the scene grows 168 × 84 at 1x, to the left and down, for every row:
`-708 -144 1728 1008` for 40 × 27 m, `-876 -144 1896 1092` for 40 × 34 m, `-708 -144 2208 1248`
for 60 × 27 m. If `hallBackgroundDeep.png` is made again, run `scripts/hall-wider.py` after
`scripts/hall-long.py`, then `npm run sprites:manifest`.

---

## 10. Characters (accepted by Piotr, 13.09.2026): frame sheets from the 3D model

People are not isometric boxes any more. A character is a **frame sheet** rendered from Piotr's rigged
model in the hall camera (orthographic, azimuth 45, elevation 30, 2:1). GPT renders the frames from
the GLB; Claude normalises them to the sheet below. The game plays the sheet.

### 10.1 Files

Per character and animation, two files in `public/sprites/`:
- `character.<role>.<animation>.sheet.png`, RGBA, straight alpha, no shadow, no floor.
- `character.<role>.<animation>.json`, the manifest (10.3).

Roles tonight: `joiner` (green shirt). Later: `owner`, `helper`, `admin`, `clerk`, `salesman`, each a
recolour or a different model through the same pipeline. Animations: `walk` (8 frames), `idle`
(2 frames), `bench` (8 frames, working at a bench), `carry` (8 frames, walking with a sheet in both
hands; the game draws the sheet). No run.

### 10.2 The cell (same contract as a 1 × 1 × 1.8 m object, section 2)

- One cell per frame: 96 × 135 px plus 8 px of padding on every side = **112 × 151** at 2x.
- The figure stands 1.8 m tall, so about 86 to 93 px in the cell; scale from the source render is
  0.1957 (520 source px per model unit, model 0.98 units for 1.8 m, elevation 30).
- **Anchor** = the projection of the model's ground origin, at (56, 143) in the cell (bottom centre,
  8 px above the bottom edge). It is the same pixel in every frame: the source anchor (240, 545) on
  the 480 × 660 render, never the silhouette's bottom. The game places the anchor on the figure's
  tile point and scales the cell by 0.5 like every sprite.
- Sheet layout: **one row per direction, one column per frame**. Row order: `sw`, `se`, `nw`, `ne`
  (down-left, down-right, up-left, up-right on screen). A sheet may carry fewer rows; the manifest
  says which. The game mirrors `sw` for a missing `se` and `ne` for a missing `nw` (the light flips
  sides; at this size it is accepted).

### 10.3 Manifest (the shape `src/render/characters.ts` reads; flat fields)

```
{
  "cellWidth": 112,
  "cellHeight": 151,
  "anchorX": 56,
  "anchorY": 143,
  "frames": 8,
  "fps": 3.43,
  "rows": { "sw": 0, "se": 1, "nw": 2, "ne": 3 },
  "spriteKey": "character.joiner",
  "animation": "walk",
  "loop": true,
  "directions": ["sw", "se", "nw", "ne"],
  "padding": 8,
  "metresPerCell": { "width": 1, "depth": 1, "height": 1.8 },
  "scaleFromSource": 0.1957
}
```

The loader reads `cellWidth`, `cellHeight`, `anchorX`, `anchorY`, `frames`, `fps` and `rows`; the
rest is on record for the art side. `npm run sprites:manifest` folds every `character.*.json` into
`public/sprites/characters.json` keyed by file name without the extension.

### 10.4 What the game does with it (the loader contract for the code side)

- A figure with a sheet for its role replaces the capsule: `walk` while its station changes
  (direction from the screen vector of the move, held until the next move), `bench` while it is on a
  production stage at a bench, `carry` while it fetches sheets or unloads, `idle` otherwise. A
  missing animation falls back to `idle`, then to frame 0 of `walk`, then to the capsule.
- Playback at the manifest's fps in real time, independent of game speed. A man walks at
  `WALK_CELLS_PER_SECOND` while the clock runs at x1 and at `WALK_CELLS_PER_SECOND_FAST`, half as
  fast again, whenever it runs faster than that, which is Piotr's own rule of 21.09 and not the
  clock's own multiple (v44; CLAUDE.md T24 2.9). This line said a man did not walk faster at x10
  at all, which stopped being true with v44. Each sheet has its own fps and its own cell size: the
  loader never assumes them.
- The figure's name label and status line stay under the anchor as today.
- The Sprite check page shows every character sheet as a strip with the anchor marked.

### 10.5 Delivered (13.09, GPT batch 3 normalised by Claude)

| Sheet | Rows | Frames | fps | Cell | Anchor |
|---|---|---|---|---|---|
| `character.joiner.walk` | sw, se, nw, ne | 8 | 3.43 | 112 × 151 | 56, 143 |
| `character.joiner.idle` | sw, se, nw, ne | 2 | 1 | 112 × 151 | 56, 143 |
| `character.joiner.bench` | sw, se, nw, ne | 8 | 5 | 112 × 151 | 56, 143 |
| `character.joiner.carry` | sw, se, nw, ne | 8 | 3.43 | 173 × 160 | 86.5, 152 |

`carry` includes the sheet the joiner carries (GPT painted it into the frames), so its cell is wider
than the standard one; the manifest carries the cell and the anchor, and the loader reads them
rather than assuming 112 × 151. The fps values come from GPT's timing (walk and carry 8 frames per
7/3 s, bench 5 fps, idle 1 fps); the game plays each sheet at its own fps.

### 10.6 The suit of the spray booth (v71, PIOTR 03.10.2026: "the only machine I want a man to walk into, in a mask and a white suit")

| Sheet | Rows | Frames | fps | Cell | Anchor |
|---|---|---|---|---|---|
| `character.suit.spray` | sw, se, nw, ne | 8 | 5 | 112 × 151 | 56, 143 |

One sheet, played by every role that is drawn from sheets: the suit covers the man whoever he is,
so `suit` stands in the name where a role stands in every other sheet's, and `spray` is the
animation a figure at `machine:sprayBooth` rests in. He walks to the booth in his own clothes and
the suit is on him only while he stands inside it.

The sheet is not painted. `scripts/spray-suit.py` makes it from `character.joiner.bench`, cell for
cell: the clothes, the arms and the hair go to a shaded white, the lower half of the face to the
grey of a respirator, and the boots stay as they are. It reads well at the hall's size and is
coarse up close (the respirator is a handful of pixels). A painted sprayer delivered under the
same two names, `character.suit.spray.sheet.png` and `character.suit.spray.json`, replaces it with
no change to the code; the cell and the anchor above are the contract.

Where he stands is `boothPlaces` in `src/engine/stations.ts`: every booth is painted open along
one long side (the camera side as delivered, the right hand side in its `.r` picture), and a man
stands half a cell inside that side, facing the filter wall, one man to a cell from the second
cell of the doorway on. A repaint that moves the opening has to move that rule with it.

### 10.7 The production manager's white shirt (v75, PIOTR 03.10.2026: "in a white shirt, not green like the rest")

| Sheet | Rows | Frames | fps | Cell | Anchor |
|---|---|---|---|---|---|
| `character.productionManager.idle` | sw, se, nw, ne | 2 | 1 | 112 × 151 | 56, 143 |
| `character.productionManager.walk` | sw, se, nw, ne | 8 | as the joiner's | 112 × 151 | 56, 143 |

The production manager is the one man of the office the hall draws (`isSeenOnTheHall` in
`src/engine/staff.ts`); the admin, the salesman and the draftsman are behind the office door all
day and have no figure. He is told from the crew by his shirt.

The two sheets are not painted. `scripts/manager-shirt.py` makes them from `character.joiner.idle`
and `character.joiner.walk`, cell for cell: the green of the shirt goes to a shaded white and
everything else stays the joiner's. A painted manager delivered under the same four file names
replaces them with no change to the code. He has no bench, carry or phone sheet and needs none:
anything else he is asked to play falls back to idle, as section 10.4 says.

### 10.8 The line engineers' red shirts (v94, PIOTR 12.10.2026: "the same picture, only the shirts red")

| Sheet | Rows | Frames | fps | Cell | Anchor |
|---|---|---|---|---|---|
| `character.lineEngineer.idle` | sw, se, nw, ne | 2 | 1 | 112 × 151 | 56, 143 |
| `character.lineEngineer.walk` | sw, se, nw, ne | 8 | as the joiner's | 112 × 151 | 56, 143 |

The line engineers walk along the metre in front of their line, two at the most a line, as many as
are on duty for it, on a working day until the crew goes home (`src/render/engineers.ts`). They
are the renderer's, as the line's forklift is, and are not hall figures of `isSeenOnTheHall`.

The two sheets are not painted. `scripts/engineer-shirt.py` makes them from `character.joiner.idle`
and `character.joiner.walk`, cell for cell, as `scripts/manager-shirt.py` makes the manager's: the
green of the shirt goes to a shaded red and everything else stays the joiner's. A painted engineer
delivered under the same four file names replaces them with no change to the code.


---

## 11. UI art (GPT, 14.09.2026): the folder modal, the company board, the floor catalogue

Piotr chose the paper-on-a-folder look for the "paper" family of modals (catalogue, Team,
Accounting, Drawings, events) and the magnet board look ("I", see Petros) for the planning boards.
GPT delivered three assets with real alpha:

| File in `public/sprites/` | Size | What it is | Content rectangle |
|---|---|---|---|
| `ui.folder.png` | 1536 × 1024 | kraft folder with a stack of cream paper and a bulldog clip: the modal frame of the paper family | paper: x 103..1429, y 31..954 (6.7% / 3.0% / 7.0% / 6.8% insets) |
| `officeCompanyBoard.png` | 1254 × 1254 | green felt board in an oak frame with one cream sheet pinned by two green pins: the company board on the office wall and the modal it opens | pinned sheet: x 243..1011, y 510..1014; felt above it free for a title |
| `catalogueFloor.png` | 1683 × 861 | the green "Equipment catalogue" book, perspective, for the office floor region (Turn 8 3.7: x 60..500, y 700..900 on the office canvas) | whole image |

Rules for the code side (Turn 11):
- The paper family modal draws `ui.folder.png` as its background, scaled to the modal box (aspect
  3:2 kept, letterboxed inside the full page area), content laid out inside the paper rectangle;
  tabs and buttons in CSS in machine green (#1f5a3a) on cream (#f5efe2), hover orange (the top
  bar accent), locked grey; nothing else painted in code. Small event modals use the same file
  scaled down.
- The company board on the office wall is `officeCompanyBoard.png` skewed into the wall plane in the
  region right of the door; its modal uses the same picture full page with the live text on the
  pinned sheet and the week list on the felt.
- The floor catalogue goes through the existing slot (`FLOOR_CATALOGUE_SPRITE`).

## 12. The timber department's machines (Turn 28, 05.10.2026)

Piotr's words of 05.10: "put the graphics in as you have them and we will refine them later". The
42 files below came from the art side on the night of 05.10 as two packs, were named as the game
names them, and went into `public/sprites/` as they were delivered (CLAUDE.md T28 2.11). No agent
altered a pixel of any of them. Every file is the engine's own canvas for its class (section 2:
`(w + d) × 48 + 16` by `(w + d) × 24 + h × 48 + 16`) with its anchor at `(8 + w × 48, H + 8)`, and
the `.r` file is the art side's 90 degree view of the same machine, its anchor at `(8 + d × 48,
H + 8)` on the same canvas. Metres are width, depth and height of the class in view 0.

| File in public/sprites/ (and its `.r`) | Metres | File, px | Anchor, view 0 / `.r` | Pack |
|---|---|---|---|---|
| `crossCut.used.png` | 2 × 1 × 1.25 | 160 × 148 | 104 / 56, 140 | 1 |
| `crossCut.budget.png` | 3 × 1 × 1.25 | 208 × 172 | 152 / 56, 164 | 1 |
| `crossCut.standard.png` | 4 × 1 × 1.5 | 256 × 208 | 200 / 56, 200 | 1 |
| `crossCut.pro.png` | 5 × 1 × 1.75 | 304 × 244 | 248 / 56, 236 | 1 |
| `crossCut.industrial.png` | 7 × 2 × 2 | 448 × 328 | 344 / 104, 320 | 1 |
| `planer.used.png` | 3 × 1 × 1.5 | 208 × 184 | 152 / 56, 176 | 1 |
| `planer.budget.png` | 3 × 1 × 1.5 | 208 × 184 | 152 / 56, 176 | 1 |
| `planer.standard.png` | 4 × 1 × 1.5 | 256 × 208 | 200 / 56, 200 | 1 |
| `planer.pro.png` | 5 × 1 × 1.75 | 304 × 244 | 248 / 56, 236 | 1 |
| `planer.industrial.png` | 6 × 2 × 2 | 400 × 304 | 296 / 104, 296 | 1 |
| `sander.used.png` | 2 × 1 × 1 | 160 × 136 | 104 / 56, 128 | 2 |
| `sander.budget.png` | 2 × 1 × 1.25 | 160 × 148 | 104 / 56, 140 | 2 |
| `sander.standard.png` | 2 × 1 × 1.5 | 160 × 160 | 104 / 56, 152 | 2 |
| `sander.pro.png` | 3 × 2 × 1.75 | 256 × 220 | 152 / 104, 212 | 2 |
| `sander.industrial.png` | 6 × 2 × 2 | 400 × 304 | 296 / 104, 296 | 2 |
| `framePress.used.png` | 2 × 1 × 1 | 160 × 136 | 104 / 56, 128 | 2, redrawn 08.10 |
| `framePress.budget.png` | 3 × 1 × 1.25 | 208 × 172 | 152 / 56, 164 | 2, redrawn 08.10 |
| `framePress.standard.png` | 3 × 1 × 2.25 | 208 × 220 | 152 / 56, 212 | 2, redrawn 08.10 |
| `framePress.pro.png` | 4 × 1 × 2.5 | 256 × 256 | 200 / 56, 248 | 2, redrawn 08.10 |
| `framePress.industrial.png` | 5 × 2 × 2.75 | 352 × 316 | 248 / 104, 308 | 2, redrawn 08.10 |
| `glueTable.standard.png` | 3 × 1 × 1 | 208 × 160 | 152 / 56, 152 | 2, redrawn 08.10 |

What they are:

- **Pack 1, `crossCut` and `planer`, 20 files:** rendered from a model by the art side, exact to
  the contract. Plainer than the September machines; Piotr has seen that and it stays for now.
- **Pack 2, `sander`, 10 files:** as the art side delivered them. They are not drawn to the
  contract's 2 to 1 projection: their rows climb flatter than the hall's, and the industrial pair
  stands low in its canvas, so the measured ports of these files are right on the picture and
  their cells approximate. Replaced in Turn 30 by the art side's pack 1 of 09.10, rendered from a
  model to the contract (section 15).
- **Pack 2, `framePress` and `glueTable`, 12 files:** the art side's files of 05.10 were cut wrong
  (half size, off the anchor, with pieces of the neighbouring machine), and chat's stand ins cut
  from the preview board took their place until v85. On 08.10 the art side delivered the twelve
  again (`docs/art/REQUESTS-T28.md` 1) and they are the files in the game from v85 (PIOTR, 08.10:
  "code these graphics in"). They are cut from the art side's approved illustrations, scaled
  whole and stood on each canvas and anchor, not rendered from a model: the art side's own check
  says `exactProjectionVerified: false` and `productionReady: false`, with some long edges
  climbing 0.39 to 0.62 px a px where the contract owes 0.5. Laid over their floor diamonds they
  stand on them, and far better than the stand ins did (whose edges climbed 0.07 to 0.34). A model
  render, as packs 1, 3 and 4 were made, is still the way to make them exact.

The ports of the classes that want extraction (every cross cut saw, every planer, and the sanders
from `budget` up; the used sander has a vacuum of its own and the presses and the glue table make
no dust) are measured off these files, one line a file, `.r` among them, in `src/engine/ports.ts`
[TUNE until Piotr confirms them on the hall]. The three cutter sets of 2.5 had no picture until
Turn 30, which put the art side's three cases of pack 1 in (section 15).

## 13. The five axis CNC, the spraying robot, the line and the timber stores (Turn 29, 05.10.2026)

The five modules of the line below are replaced by the six of Turn 30, 3 m high, with their motion
(section 15.2); what follows is kept as the history of Turn 29.

Piotr's words of 05.10: "you have it in the zip", "put everything into the next turn". The 22 files
below came from the art side in three packs (the robot and the five axis CNC; the line's five
modules; the two timber stores), were renamed by chat as the game names them, and went into
`public/sprites/` as they were delivered (CLAUDE.md T29 2.4). No agent altered a pixel of any of
them. Every file is the engine's own canvas for its class (section 2: `(w + d) × 48 + 16` by
`(w + d) × 24 + h × 48 + 16`) with its anchor at `(8 + w × 48, H + 8)`, and the `.r` file is the
art side's 90 degree view of the same thing, its anchor at `(8 + d × 48, H + 8)` on the same
canvas. Metres are width, depth and height of the class in view 0. All 22 fit the canvas and the
anchor with no table of pixels.

| File in public/sprites/ (and its `.r`) | Family | Metres | File, px | Anchor, view 0 / `.r` | The art side called it |
|---|---|---|---|---|---|
| `cnc5.standard.png` | `cnc5` | 5 × 3 × 2.5 | 400 × 328 | 248 / 152, 320 | the same |
| `cnc5.pro.png` | `cnc5` | 6 × 3 × 2.75 | 448 × 364 | 296 / 152, 356 | the same |
| `cnc5.industrial.png` | `cnc5` | 8 × 4 × 3 | 592 × 448 | 392 / 200, 440 | the same |
| `sprayRobot.standard.png` | `sprayRobot` | 2 × 1 × 2.25 | 160 × 196 | 104 / 56, 188 | the same |
| `windowLine1.standard.png` | `windowLine1` | 6 × 3 × 2.5 | 448 × 352 | 296 / 152, 344 | `windowLine.stage1` |
| `windowLine2.standard.png` | `windowLine2` | 6 × 3 × 2.5 | 448 × 352 | 296 / 152, 344 | `windowLine.stage2` |
| `windowLine3.standard.png` | `windowLine3` | 6 × 3 × 2.5 | 448 × 352 | 296 / 152, 344 | `windowLine.stage3` |
| `windowLine4.standard.png` | `windowLine4` | 6 × 3 × 2.5 | 448 × 352 | 296 / 152, 344 | `windowLine.stage4` |
| `windowLine5.standard.png` | `windowLine5` | 6 × 3 × 2.5 | 448 × 352 | 296 / 152, 344 | `windowLine.stage5` |
| `timberRack.standard.png` | `timberRack` | 4 × 1 × 2.5 | 256 × 256 | 200 / 56, 248 | `timberStorage.rack` |
| `timberShelter.standard.png` | `timberShelter` | 6 × 3 × 3 | 448 × 376 | 296 / 152, 368 | `timberStorage.shelter` (from Turn 31 its 0 view again) |

Why the names changed. A family in this game has the five classes or one class called `standard`
(the five axis CNC, from tonight, an unbroken run of three of them: `standard`, `pro`,
`industrial`). Five modules at five prices and two stores of two shapes are therefore seven
families of one class each, the way the high capacity rack is a family of its own beside the rack,
and their files carry `.standard`. Chat renamed them and touched no pixel.

The shelter's two views changed places in Turn 29 and changed back in Turn 31. The art side drew
it 6 m long by 3 m deep. Turn 29 stood it outside on the apron, which is 3 m wide, so the game
declared it 3 wide by 6 deep and drew the art side's 90 view. From Turn 31 it stands behind the rear
wall with the plant [PIOTR, 11.10: "it hides our hall; rather where the extractors are, or behind
them"], declared as the art side drew it, 6 m along the wall by 3 m deep, so
`timberShelter.standard.png` is the art side's 0 view again and its 90 view is the `.r` (the two
files changed places by `git mv` through a temporary name, nothing edited; CLAUDE.md T31 2.8). Kit
outside is never turned, so the shelter's `.r` (like the van's) is on disk for the tests and the
Sprite check page and is never drawn on the hall. Behind the wall it is drawn through the rear
wall's clip, as the plant is, and its plate is hung over the wall's top above it.

What they are:

- **All 22** are rendered from models by the art side, exact to the contract, in the plainer look
  of Turn 28's pack 1 and not in the look of the September machines; Piotr has seen that and it
  stays for now. The industrial five axis CNC is drawn blue with a grey cabinet where the standard
  and the pro are green.
- **The two timber stores are drawn full of timber**, with no empty picture and no layer: a store
  bought this morning shows a full load over a plate of `0 / 40`. Known and left tonight; the
  stores drawn empty are on `docs/art/REQUESTS-T29.md`.
- **The five modules stand short of their footprint's side corners** by about 38 px in both views
  (about 0.8 m), so two modules butted end to end may show a narrow gap between them on the hall.

The ports: only the five axis CNC wants extraction, so its six files (each class and its `.r`) have
one line each in `src/engine/ports.ts`, measured off these pictures and written in with the family
(T29-C2) [TUNE until Piotr confirms them on the hall]. The standard class is an open gantry with no duct stub drawn, so its line is the top
of the head's carriage. The robot, the modules and the stores make no dust and have no port.

## 14. The logo (PIOTR, 04.10 and 08.10.2026)

The art side's final pack, `Woodwork-Empire-Tycoon-Logo-FINAL` (08.10), is a set of bitmaps: seven
variants of the logo on a 2560 by 1024 canvas with a transparent margin, and the WE mark as square
icons from 32 to 1024 px. The game uses four files, in `public/brand/` and served at `/brand/`:

| File | Made from | What was done to it | Where it shows |
|---|---|---|---|
| `logo.webp` | `png/logo-for-dark-background.png` | scaled to 880 by 352, twice its size on screen | the start screen, 440 px wide, in place of the title's words (the sketch of the unit that stood under the title is off from v86, PIOTR 08.10); the top of the menu, 180 px wide, under the cross |
| `icon-32.png` | `icons/icon-32.png` | nothing, the pack's own file | the browser tab |
| `icon-128.png` | `icons/icon-128.png` | nothing, the pack's own file | the tab where a bigger icon is wanted, and a phone's home screen |
| `og.png` | `png/logo-for-light-background.png` | scaled to 1200 by 480 and laid on a 1200 by 630 card of the game's cream (`--cream`, #f3ecdc) | the picture a pasted link shows |

No letter, colour or edge of the logo was retouched. The start screen and the menu sit on the dark
panel (`--panel`, #2d3138), so the variant for a dark background is the one in the game. The
link's picture got a background of its own because the pack's README says the background is given
where the logo is used, and a pasted link's preview has none: some sites fill a transparent
picture with black. The other variants, the originals and the larger icons stay in the art side's
pack and are not in the repo. The tab's title is the logo's words, `Woodwork Empire Tycoon`.

## 15. The production line of six modules, its motion and pack 1 of 09.10 (Turn 30, 11.10.2026)

### 15.1 Pack 1 of 09.10: the sanders and the cutter cases

Piotr's words of 09.10: "ok, but remember to keep to the angles, it is mega important; code it".
The art side's pack 1 drew the five sanders again, in two views, and the three cutter cases. Piotr
pushed it into the root of the repo (commit 46713f3), and Turn 30 put the thirteen pictures into
`public/sprites/` byte for byte (CLAUDE.md T30 2.1): no agent altered a pixel. The rest of the pack
(its README, the handoff, the masters at six times the size, the sources, the meshes, the checks and
the art side's checksums) is kept as delivered in `docs/art/pack-0910/`, with `EDITED.md` naming
the five text files whose em dashes were replaced.

Each sander is the engine's own canvas for the metres the game already gives its class, its anchor
at `(8 + w × 48, H + 8)` in view 0 and `(8 + d × 48, H + 8)` in the `.r`. The pack's 90 view turns
the model `(x, y, z)` to `(y, w - x, z)` (its `camera-QA.md`), which is the game's own `.r`. Both
views are rendered from a model to the 2 to 1 projection (`exactProjectionVerified: true`), so the
two of Turn 28 that stood off their anchors stand on them now.

| File in public/sprites/ (and its `.r`) | Metres | File, px | Anchor, view 0 / `.r` | The pack called it |
|---|---|---|---|---|
| `sander.used.png` | 2 × 1 × 1 | 160 × 136 | 104 / 56, 128 | `sprites-2x/0/` and `90/sander.used.png` |
| `sander.budget.png` | 2 × 1 × 1.25 | 160 × 148 | 104 / 56, 140 | the same, `budget` |
| `sander.standard.png` | 2 × 1 × 1.5 | 160 × 160 | 104 / 56, 152 | the same, `standard` |
| `sander.pro.png` | 3 × 2 × 1.75 | 256 × 220 | 152 / 104, 212 | the same, `pro` |
| `sander.industrial.png` | 6 × 2 × 2 | 400 × 304 | 296 / 104, 296 | the same, `industrial` |
| `cuttersSash.standard.png` | 1 × 1 × 1 | 112 × 112 | 56, 104 (view 0 only) | `sprites-2x/0/cuttersSash.standard.png` |
| `cuttersCasement.standard.png` | 1 × 1 × 1 | 112 × 112 | 56, 104 (view 0 only) | `sprites-2x/0/cuttersCasement.standard.png` |
| `cuttersDoor.standard.png` | 1 × 1 × 1 | 112 × 112 | 56, 104 (view 0 only) | `sprites-2x/0/cuttersDoor.standard.png` |

The cutter cases are catalogue pictures: a cutter set holds no floor and is never drawn on the hall
(CLAUDE.md T28 2.5). The catalogue's class tile and the Sprite check page draw them. Their 1 × 1 × 1
frames the canvas and is not the case's size (the pack's own README says so).

The sanders' ports (the stub on the downdraught table, the duct of the edge sander, the hoods of the
through feed sanders; the used sander has a vacuum of its own and no port) are measured again off
these files, one line a file, `.r` among them, in `src/engine/ports.ts` [TUNE until Piotr confirms
them on the hall].

### 15.2 The line of six modules, its motion and the windows on its pallet

Piotr's words of 11.10: "super" for the six modules, and "put the animation pictures into the code
and the zip". The art side's L1 (the six modules in two views) and L2 (their working motion and the
windows stacking on module 6's pallet) came as 28 pictures, which Turn 30 put into `public/sprites/`
as they were delivered (CLAUDE.md T30 2.2). No agent altered a pixel. Chat renamed the art side's
90 degree views `.r` and touched nothing else. Their notes, the sheets' figures, the measurements and
chat's check (`pictures-t30.json`, every file's size, anchor, metres, kind and hash) are kept in
`docs/art/pack-1110/`.

| Files in public/sprites/ | What they are | File, px | Anchor |
|---|---|---|---|
| `windowLine1.standard.png` to `windowLine6.standard.png` | the six modules, view 0, 6 × 3 × 3 m each | 448 × 376 | 296, 368 |
| `windowLine1.standard.r.png` to `windowLine6.standard.r.png` | the art side's 90 degree views (see below) | 448 × 376 | 152, 368 |
| `windowLine1.standard.work.sheet.png` to `windowLine6.standard.work.sheet.png` | the working motion: twelve cells of 448 × 376 in one row, 6 frames a second, a loop of two seconds | 5,376 × 376 | 296, 368 in each cell |
| `windowLine6.standard.stack01.png` to `stack10.png` | one to ten wrapped windows standing on module 6's pallet, view 0 only, the windows alone (no pallet, floor or shadow) | 448 × 376 | 296, 368 |

Every canvas is the contract's for 6 × 3 × 3 m (section 2: `(6 + 3) × 48 + 16` = 448 by
`(6 + 3) × 24 + 3 × 48 + 16` = 376, the anchor at `8 + 48 × 6` = 296 in view 0 and `8 + 48 × 3` =
152 in the turned view, at `376 - 8`). The first cell of every sheet is its module's picture pixel
for pixel. The conveyor runs through every module at 0.9 m, in at (80, 144.8) and out at (368,
288.8) in view 0, and the overhead rail of modules 5 and 6 at 2.8 m, (80, 53.6) to (368, 197.6). The
next module stands at (+288, +144) px, six metres along x, so modules six cells apart meet end to
end: the gap Turn 29's five showed is gone. Module 5's roof is clear so that its robot shows, and
module 6 has an empty pallet on the floor at the end of its rollers, which the overlays stand on.
Module 1 is drawn with its saw.

**The 90 degree views are the other turn.** The art side's is `X = 3 - y, Y = x`, the game's `.r` is
`X = y, Y = w - x`. The line is never turned (CLAUDE.md T30 2.4), so its six `.r` files are on disk
for the tests and the Sprite check page and are never drawn on the hall, as the shelter's and the
van's are. A line that may one day turn wants its turned views drawn in the game's convention.

**Two new kinds of file.** A work sheet, `<family>.<class>.work.sheet.png`, and a stack overlay,
`<family>.<class>.stackNN.png`, are neither a class's picture nor a turned one: the game picks every
picture by its exact name (`pictureFor`, `pickSprite` build `${spriteKey}${tier}${suffix}.png`), and
no code reads the manifest by pattern, so neither kind is ever taken for a class picture or a turned
one. The tests that count class pictures and turned pictures say so. The characters' manifest is
built from `character.*.json` only and is not touched, and the six JSONs of the sheets' figures
are not served (they are in `docs/art/pack-1110/`): their one set of figures is a constant of the
game, `MACHINE_WORK_SHEETS`.

How the game uses them (CLAUDE.md T30 2.11, 2.12). A module that works is drawn from its sheet in
place of its picture: the same box, the same anchor, the same shadow and name, an `<svg>` clipped to
one cell by its view box over an `<image>` of the whole sheet, as a man's figure is drawn. It works
only while the clock runs, and then, while the line's contract runs, all six in the minutes the line
makes windows, and without the contract a module a man is drawn at this minute. A working module
plays its sheet at the speed the art side drew it, 6 frames a second in real time whatever the
speed of the clock, a loop of two seconds, but not all the time: one loop each time the game's
clock reaches the module's minute of the hour, and its picture (frame 0) between two loops
(`everyMinutes` 60 and `atMinute` in `MACHINE_WORK_SHEETS`). Module 1 starts at the hour and each
next module ten minutes after the one before it, so the motion travels down the line; at 1x a
module moves for two seconds once a minute, and from 30x the loops follow one another with no stop
[PIOTR, 11.10: "at the speed it was drawn, but started now and then and not all the time"] (v91;
v90's loop four times slower looked as if frames were dropped). The moment the clock stops every
sheet holds, and the next page written draws the six from their pictures. Module 6 with one to nine
windows on its pallet is drawn with
the one overlay of that many over it, in the same box and drawable, whether it plays or stands.
`stack10` is on disk and is not drawn: the tenth window sends the pallet to the gate, where from
Turn 31 the art side's pallet standing alone and the line's forklift (L3, section 16) take it.

## 16. The line's forklift and its pallet (L3, Turn 31, 11.10.2026)

Piotr approved the art side's L3 on the evening of 11.10 ("akceptacja jest") and asked for it in Turn
31 ("won't we add it to this turn?"). Its three pictures went into `public/sprites/` byte for byte
(each matches its line in `docs/art/pack-l3-1110/checksums.sha256`), moved by `git mv` from
`docs/pictures-l3/`, where the ZIP put them; the rest of the pack (its notes, figures, reports, the
approved previews, its source, the two sheets' JSONs and the pallet's 90 degree view, which nothing
turns and which is not served) is in `docs/art/pack-l3-1110/`, with `EDITED.md` (CLAUDE.md T31 2.10).
No agent altered a pixel.

| File in public/sprites/ | What it is | File, px | Anchor |
|---|---|---|---|
| `windowPallet.standard.png` | the pallet of ten wrapped windows standing alone, view 0, 2 × 1 × 1.75 m | 160 × 172 | 104, 164 |
| `vehicle.forklift.drive.sheet.png` | the line's forklift and its driver, forks empty: four rows of six cells | 1,632 × 1,024, cells 272 × 256 | 136, 192 in every cell |
| `vehicle.forklift.driveLoaded.sheet.png` | the same with the pallet of ten windows on its forks | 1,632 × 1,024, cells 272 × 256 | 136, 192 in every cell |

**The pallet.** The contract's canvas for 2 × 1 × 1.75 m (`(2 + 1) × 48 + 16` = 160 by `(2 + 1) × 24
+ 1.75 × 48 + 16` = 172, the anchor at `8 + 48 × 2` = 104, 172 - 8); its windows and its pallet are
module 6's (`stack10` and the pallet drawn in module 6's picture). The game draws it at
`LINE_PALLET_LAYOUT` (x 0, y 10, 2 by 1, view 0, on the box's nearest corner as every picture is), a
second beside it along x at x 2 to 3, two at the most, a part pallet drawn as a full one, with the
label `Windows for collection: N pallets`.

**The sheets.** Six frames at 8 a second, a loop of three quarters of a second; the rows are the
figures' four directions in the game's own sense: row 0 `sw` (along +y), row 1 `se` (+x), row 2 `nw`
(-x), row 3 `ne` (-y), as `facingTowards` gives them, the forks pointing the way it drives in every
row, none mirrored. Every cell of a row has the same bounds, so the forklift drives on the spot and
the game moves it. The anchor is one point of the floor under the forklift with its load, the same in
both sheets, so the empty forklift is not centred on it and is not to be centred again. The figures
are written once as `FORKLIFT_SHEETS` in `src/engine/constants.ts`, from the two JSONs, as
`MACHINE_WORK_SHEETS` was. The middle of the pallet on the forks is 1.225 m ahead of the anchor
(`loadCenterXM` in the pack's `reports/load-contact-QA.json`), written once as `FORKLIFT_LOAD_AHEAD`.

**True size.** The forklift is drawn at true size, as the art side's model is, where the forklift
family's own pictures (the five classes the company may own, which
unload the lorries) are a 1 × 1 × 1 m frame (`docs/art/REQUESTS-T30.md` 2.1). Those are not touched.

**Two new kinds of file.** A vehicle's sheet of four rows, `vehicle.<name>.<variant>.sheet.png`, and
the picture of a thing that is no family's class, `windowPallet.standard.png`. Neither is a class's
picture or a turned one: the game picks every picture by its exact name, and the tests that count
class pictures and turned ones say so (`tests/render/spriteClasses.test.ts`,
`tests/engine/rotate.test.ts`). The Sprite check page lists the pallet among its targets, at the gate
on its 2 by 1, and the two sheets whole with the anchor marked in every cell.

**How the game uses them** (CLAUDE.md T31 2.10). The forklift is the line's own: it comes with the
line and goes with it, costs nothing and is no kit, and its driver is part of the picture. It is the
renderer's, as the walkers and the doors are (`src/render/forklift.ts`), with no game state. It waits
on the lane's front strip in front of module 6's pallet, facing `nw`, on frame 0 of the empty sheet,
while the six stand and the line has its lane. Whenever a pallet leaves module 6 for the gate it
drives it there along the front strip (`nw`) and up the left strip (`ne`) until the pallet on its
forks is over its place at the gate, sets it down, and comes back empty (`sw`, then `se`), at three
cells a second of real time, a corner a turn on the spot, its six frames playing while it moves. The
newest pallet at the gate is not drawn while it is on the forks. Nothing is drawn of the forks lifting
or setting down, and from 30x no trip is drawn.


## 17. The two glass racks (G1, Turn 32; landed 14.10.2026, in the game from v98)

Asked in `docs/art/REQUESTS-T32.md` G1 the night Turn 32 gave the glass a store of its own, and
delivered by the art side the next evening, four files in one pack with a handoff note. Chat checked
each against the contract before they went in (section 2's arithmetic, `spriteFileSize` and
`spriteAnchorIn`): the pixel size, the lowest opaque pixel of the base on the anchor pixel, every
corner transparent, 8 px of padding at the top and sides, 7 below the anchor row, no pixel under the
base (no cast shadow), 8 bit RGBA with no colour profile. All four passed as delivered; no agent
altered a pixel of any of them. In the hall they stand beside the timber rack in its green steel,
the plate hung over the front face as on every rack.

| File in public/sprites/ | Family | Metres w × d × h | File, px | Anchor, view 0 / `.r` | The art side drew it |
|---|---|---|---|---|---|
| `glassRack.standard.png` (and `.r`) | `glassRack` | 2 × 1 × 2 | 160 × 184 | 104, 176 / 56, 176 | an A frame of dark green steel on grey feet, lightly loaded with upright sealed units |
| `glassRackLarge.standard.png` (and `.r`) | `glassRackLarge` | 4 × 2 × 2.5 | 304 × 280 | 200, 272 / 104, 272 | the same, two A frames long, lightly loaded |

Both are drawn lightly loaded whatever is on them, as the timber stores are drawn full: one picture
serves a rack however many units it holds, and the plate says the count. Until v98 the game drew
each as the flat box of kit with no picture; from v98 the manifest lists the four files and the hall
draws them, with no change to the code that stands them.

## 18. The office's six levels (PIOTR, 14.10 and 15.10.2026; v98)

Six pictures of the whole office from the art side, one a level, each the room's full canvas of
section 8.1, **1672 × 941 px**, RGB PNG, with the desk, the laptop, the catalogue and the binder
painted in. They are the refits of the office the player buys one after the other on the Premises
page (`OFFICE_LEVELS` in `src/engine/constants.ts`: the names, the prices, the reputation), and from
the first refit the room is that one picture: the day one layers of section 8.1 (the room, the desk,
the laptop) are put away and come back for no level. Nothing else of section 8 changes: the regions
of 8.2 are where they were on every level (the art side kept the layout: the work plan board, the
door to the hall, the clock, the company board, the orders board, the laptop, the catalogue and the
binder stand in their rectangles on all six, checked by overlay before the files went in), the live
text, the company board's own picture and the man at the desk are drawn over the picture as before,
and the door's light spot stands in for a lit layer, as it does today.

| File in public/sprites/ | Level | Name on the Premises page | The art side called it |
|---|---|---|---|
| `officeLevel1.png` | 1 | A first office | `01-Poczatki-firmy` |
| `officeLevel2.png` | 2 | A proper joinery office | `02-Porzadna-stolarnia` |
| `officeLevel3.png` | 3 | A growing firm | `03-Rozwijajaca-sie-firma` |
| `officeLevel4.png` | 4 | A big works | `04-Duzy-zaklad` |
| `officeLevel5.png` | 5 | A prestigious head office | `05-Prestizowa-siedziba` |
| `officeLevel6.png` | 6 | The empire | `06-Imperium-pelny-przepych` |

Chat renamed them as the game names them and touched no pixel. Known and left: on level 6 the
screen that stands in for the clock is painted about fifty canvas pixels under the clock's rectangle
of 8.2, so the time is written on the wall just above it; the art side may move the screen up in a
later pack, or the clock's box may be given a level of its own. The hall's six finishes the art side
previewed on the same day (one sheet, not game files) are not in the game: the hall's background is
one painting a size of hall (section 9), so a finish is a painting a size, and that is a request of
its own for a later turn.

## 19. The door line, its pallet and its forklift (P3, 18.10.2026; v108)

Piotr asked for a door line on 18.10 ("a door line, two times the windows; only the look of the line
different"; the game's in v107, drawn until then from the window line's pictures in grey), and the
art side delivered P3 the same evening, marked PODGLĄD: a preview waiting for his acceptance, with no
`approval.json`. Piotr: "for now swap in only the door graphics". Its thirty game files went into
`public/sprites/` byte for byte (each matches its line in `docs/art/pack-p3-1810/checksums.sha256`),
and the grey stand in went. The handoff, the README, the measurements, the checksums, the seven sheet
JSONs and the pallet's 90 degree view (which nothing turns and which is not served, as the window
pallet's) are kept in `docs/art/pack-p3-1810/`; the masters, models, frames, sources, reports and
previews stay in the delivered ZIP. No agent altered a pixel. A FINAL of P3 is to keep the same
bytes, and the checksums tell.

| Files in public/sprites/ | What they are | File, px | Anchor |
|---|---|---|---|
| `doorLine1.standard.png` to `doorLine6.standard.png` | the six modules, view 0, 6 × 3 × 3 m each, in light grey housings with blue doors: a cross cut saw and a four sided planer; a five axis CNC; brush heads and a sanding belt; a press closing from four sides; a spraying robot in its booth; the Glazing, the hanging and the packing, with a gantry that sets each door set on the pallet | 448 × 376 | 296, 368 |
| `doorLine1.standard.r.png` to `doorLine6.standard.r.png` | the 90 degree views, in the game's own turn `(x, y, z) -> (y, w - x, z)` | 448 × 376 | 152, 368 |
| `doorLine1.standard.work.sheet.png` to `doorLine6.standard.work.sheet.png` | the working motion: twelve cells of 448 × 376 in one row, 6 frames a second, a loop of two seconds | 5,376 × 376 | 296, 368 in each cell |
| `doorLine6.standard.stack01.png` to `stack10.png` | one to ten wrapped door sets on module 6's pallet, view 0 only, the doors alone | 448 × 376 | 296, 368 |
| `doorPallet.standard.png` | the pallet of ten door sets standing alone, view 0, 2 × 1 × 1.75 m | 160 × 172 | 104, 164 |
| `vehicle.forklift.driveLoadedDoor.sheet.png` | the line's forklift of section 16 with the door pallet on its forks | 1,632 × 1,024, cells 272 × 256 | 136, 192 in every cell |

**How the game uses them.** Every canvas, cell and anchor is the window line's of sections 15.2 and
16, so the code that draws a window line draws a door line with no figure of its own: the modules and
their sheets by the module's own key (one entry of `MACHINE_WORK_SHEETS` serves both kinds), module 6
with one to nine door sets on its pallet drawn with the one overlay of that many, and `stack10` on
disk and not drawn; the full pallet at the gate by the line's kind (`palletSprite` in `LINE_KINDS`);
and the forklift, on its way out, with its own kind's pallet (`FORKLIFT_LOADED_BY_KIND`). The door
pallet is the art side's new four way pallet (2 × 1 × 0.228 m, its deck's underside at 0.18 m, so
that the forks of L3 take it unchanged), carried crosswise with its middle 1.0 m ahead of the anchor
(`loadCenterAheadM` of its JSON), where the window pallet's is 1.225 m. The Sprite check page lists
the door pallet beside the window pallet and the loaded door sheet beside the other two.

## 20. The glass shelter and the large timber shelter (P1, 18.10.2026; v110)

The two stores behind the rear wall that had no picture (the glass shelter of v100 and the large
timber shelter of v103, drawn until then as kit with no picture) came from the art side as P1 the
same evening as P3, marked PODGLĄD: a preview waiting for Piotr's acceptance, with no
`approval.json`. Piotr: "you have the rest of the art, code it one picture at a time". Their four
game files went into `public/sprites/` byte for byte (each matches its line in
`docs/art/pack-p1-1810/checksums.sha256`), the 90 degree views named `.r`; the handoff, the README,
the camera notes, the measurements and the checksums are kept in `docs/art/pack-p1-1810/`, and the
masters, models, sources, reports and previews stay in the delivered ZIP. No agent altered a pixel.

| Files in public/sprites/ | What it is | Metres w × d × h | File, px | Anchor, view 0 / `.r` |
|---|---|---|---|---|
| `glassShelter.standard.png` (and `.r`) | a steel shelter in the S1 family with six A frames of sealed units under a lean to roof | 12 × 3 × 3 | 736 × 520 | 584, 512 / 152, 512 |
| `timberShelterLarge.standard.png` (and `.r`) | the same shelter, longer and higher, with grey cantilever arms and sixteen packs of boards on four levels | 18 × 3 × 4 | 1,024 × 712 | 872, 704 / 152, 704 |

Both are the contract's canvases for their metres (section 2), the views 90 the game's own turn
`(x, y, z) -> (y, w - x, z)`, with no floor, no cast shadow, no plate and no lettering: the game
draws the wall in front of them and their plate, and behind the wall only what stands above its
crown shows, as for every store there. The boards and units drawn are a picture of a full
store and not its count (`inventoryLiteral` false in the pack): the plate says what is in it. A
shelter made bigger (v105) is drawn through the store's red filter, picture and all.

## 21. The hall's six levels (P2, 18.10.2026; v113)

Piotr approved the art side's board of six hall finishes ("hala ok") and the production files came
as P2 the same evening, marked PODGLĄD: a preview waiting for his acceptance, with no
`approval.json`. Piotr: "you have the rest of the art, code it one picture at a time", then "5 koduj"
to chat's five points (a card on the Premises page, the prices, two points of reputation, the names,
and the art side's fix of the deep cutter). Level 1 is the hall as it was built: today's three layers
of section 9, untouched. Levels 2 to 6 are three layers each on the same canvas of **1680 × 1128 px**,
registered as today's (world (0, 0, 0) at (600, 288), X (48, 24), Y (-48, 24), Z (0, -48)): the
outside of the hall, the kerbs and the blocks' alpha are today's pixel for pixel, and only the
surfaces inside the outlines are repainted. Their fifteen files went into `public/sprites/` byte for
byte (each matches its line in `docs/art/pack-p2-1810/checksums.sha256`); the handoff, the README,
the measurements, the validation, the checksums, the cutter proposal and its diff are kept in
`docs/art/pack-p2-1810/`. No agent altered a pixel.

| Level | Name on the Premises page | Floor | Walls | Plinth |
|---|---|---|---|---|
| 2 | A proper joinery | clean grey concrete, joints every metre | cream blockwork | graphite, 0.6 m |
| 3 | A growing firm | light grey resin | off white blockwork | sage green, 0.8 m |
| 4 | A big works | grey resin | white panels | anthracite, 0.5 m |
| 5 | A factory | light polished concrete | white panels, brushed aluminium copings, a warm LED strip | dark green, 0.8 m |
| 6 | The empire | light terrazzo | white panels, the same copings and light | dark green, 0.8 m |

| Files in public/sprites/, N from 2 to 6 | What they are | File, px |
|---|---|---|
| `hallBackground.levelN.png` | the floor, the walls, the kerbs, the shutter, the door and the WC, RGB | 1680 × 1128 |
| `hallOffice.levelN.png`, `hallCanteen.levelN.png` | the two blocks, RGBA, the alpha of today's | 1680 × 1128 |
| `hallBackgroundWide.levelN.png` and the ten other pieces of sections 9.7 to 9.10 | the bigger halls, cut by the game's own scripts (below) | as today's, piece for piece |

**The bigger halls are cut by the game, not painted.** The four scripts of sections 9.7 to 9.10 take
the hall's level (`python3 scripts/hall-wide.py N`, then `hall-deep.py N`, `hall-long.py N` and
`hall-wider.py N`) and read and write `<layer>.levelN.png`; with no level they cut today's files,
byte for byte as they are in the repo (checked). For levels 2 to 6 the deep cutter takes the art
side's fix (`docs/art/pack-p2-1810/source/proposed-hall-deep-fix.diff`) [PIOTR: "yes", level 1 left as
it is]: the floor beside the left wall is painted out by the floor three metres along instead of two
and a half, so a floor jointed every metre keeps its joints, and the left wall's tone is taken from
the same height on both walls, 1.2 to 2.2 m, so a plinth or the LED does not tint the wall carried
on. Every piece of every level came out the size and at the offset of today's, so the canvases of
sections 9.7 to 9.10 serve every level. The ground round the hall is one colour at every level and is
not cut again: today's `hallBackgroundGround.png` serves.

**How the game uses them** (v113). The hall's level is the unit's (`hallLevel`, 1 to 6), bought on
the Premises page. Every layer is picked with the level as its tier (`hallLevelTier`, `level3`), so
`hallBackground` at level 3 is `hallBackground.level3.png`, and a layer that has no file of its level
falls back to today's, as every picture without its class falls back to its family's (`pictureFor`).
Everything drawn on the painting (the kit, the people, the lettering on the wall, the rooms' doors) is
drawn as it was.

## 22. The timber frame house factory (P4, 18.10.2026; v114; the files from v117)

Piotr took the art side's concept P4-A ("masz grafikę") as layout A, with one change: the finished
house is delivered towards the gate. The game has the factory from v114 (docs/notes-v114.md), each
station drawn as kit with no picture is drawn until its files landed. The concept's ZIP stays with
Piotr: it was a board for a decision, and nothing of it is a game file.

**The files landed on 19.10 (v117)** from the art side's P4 pack of robotic production
(`Woodwork-Empire-P4-A-robotyczna-produkcja-2026-10-19.zip`, its notes in docs/art/pack-p4-1910/):
the six stations in sixteen frames each and empty, all byte for byte on the game's canvas, and the
waiting house, the pack's loaded transporter moved onto the game's canvas by a shift alone
(pack-p4-1910/EDITED.md). The line is never turned, so no `.r` file is owed.

| Keys the game draws | What they are | Metres w x d x h | File, px | Anchor |
|---|---|---|---|---|
| `houseLine1.standard` to `houseLine6.standard` | the six stations under their gantry cranes, each with its stage's house finished on its transporter (frame 15 again): the class picture | 14 x 10 x 10 | 1,168 x 1,072 | 680, 1,064 |
| `houseLineN.standard.work00` to `.work15` | the station at work: the robots and the crane building the stage from its start (00) to its end (15) | 14 x 10 x 10 | 1,168 x 1,072 | 680, 1,064 |
| `houseLineN.standard.empty` | the station's crane and runway with the robots parked, no house and no transporter | 14 x 10 x 10 | 1,168 x 1,072 | 680, 1,064 |
| `houseWaiting.standard` | a finished house standing alone on its transporter, facing the gate (minus x) | 10 x 7.5 x 5.5 | 856 x 700 | 488, 692 |

**The frames (v117)** [PIOTR, 19.10: "I want the animation right away"]. A station is drawn by the
house in its hands: while the line's contract runs, the frame `floor(minutes of the house in hand /
the house's minutes x 16)`, capped at 15 (`lineUnitFrame`, `HOUSE_WORK_FRAMES`), so the six build
their stages over the cycle together, hold the finished stage from the last sixteenth of it, and
start again at 00 when the house is made; a line that stands (dinner, after five, no material, a
pause) holds its frame, since the house's minutes stand; a house's minutes done while the line waits
for material holds 15. With no contract the station is empty. The frame is a tier of the station's
class picture (`stationTier` in `src/render/hall.ts`), picked as any picture is, and the class
picture stands in where a frame's file is missing. Nothing plays in real time: the picture changes
with the game's minute, thirty minutes a frame at the factory's base pace, so a slow processor
reads one picture a station. No sheet: `MACHINE_WORK_SHEETS` holds the window and door lines only.
From v120 the frames are fetched ahead of their minute, the two wanted next first, and held in
memory as blobs the station is drawn from (`src/render/prefetch.ts`), so a swap never waits for
the network and the house on the station never blinks out [PIOTR, 19.10: "the houses disappear"].

**How the game uses them.** The six stations stand end to end along x at a 14 m pitch, station 1 at
the left, never turned, and each is drawn as one picture sorted at its own cell and its 10 m of depth
(`kitDepth` in `src/render/hall.ts`), so each file must hold everything of its own box and nothing
outside it, the runway beams cut at the boundaries (the pack's frames do: their content lies within
27 to 1,141 by 79 to 1,049). A house factory has no work sheet, no pallet on station 6 and no
forklift; the drive of the finished house along the lane to the gate is a turn of its own. A finished house waits on the line's own 10 m lane, which from v118 runs along the line alone
(from x 0 in v114), at its gate side end, three drawn at the most side by side from that end
(`HOUSE_WAIT_LAYOUT`, `HOUSES_WAITING_DRAWN`), by the kind's
`palletSprite`, `houseWaiting`; the lane's outline and the label `Houses for collection: 2` are the
game's. The Sprite check page lists the waiting house beside the two pallets.

## 23. The yacht line (the art side's pack of 19.10.2026; v123)

Piotr, 20.10: "now code the production, graphics only, of the yacht building": the game took the
pack's pictures and none of its code (docs/art/pack-y1-2010/EDITED.md). The yacht line is a fourth
kind of line built as the house factory is (docs/notes-v123.md): twelve stations of 14 m by 10 m by
12 m end to end along x, 168 m, never turned, its finished yachts waiting on its own 10 m lane at the
gate side end.

| Keys the game draws | What they are | Metres w x d x h | File, px | Anchor |
|---|---|---|---|---|
| `yachtLine1.standard` to `yachtLine12.standard` | the twelve stations under their gantry cranes, each with its stage's yacht finished on its transporter (frame 15 again): the class picture | 14 x 10 x 12 | 584 x 584 WebP (half of 1,168 x 1,168) | 340, 580 (half of 680, 1,160) |
| `yachtLineN.standard.work00` to `.work15` | the station at work, the stage built from its start (00) to its end (15) | 14 x 10 x 12 | 584 x 584 WebP | 340, 580 |
| `yachtLineN.standard.empty` | the station's crane and runway with the robots parked, no yacht and no transporter | 14 x 10 x 12 | 584 x 584 WebP | 340, 580 |
| `yachtWaiting.standard` | a finished yacht on its transporter, waiting on the lane | 13 x 6 x 4 | 464 x 332 PNG (half of 928 x 664) | 316, 328 (half of 632, 656) |

**Half the contract's scale, WebP.** The pack's pictures are the approved renders halved and saved
as WebP. A picture is drawn into the box its metres owe whatever its pixels (`spriteBox`,
`preserveAspectRatio`), so a file of exactly half the owed canvas stands exactly where a full one
would: sharp at the hall's size, softer zoomed in past it. The picture rule takes a WebP where no PNG
of the same name has landed and the PNG first where both have (`deliveredFile` in
`src/engine/ports.ts`), and the build's manifest lists both (`pickPictures`): the full sized renders
as PNGs under these names are drawn with no code. Asked of the art side the day Piotr wants the
yachts as sharp as the houses up close.

**The frames.** As the house factory's (section 22): the frame by how far the yacht in hand has come,
held on the last, the station empty with no contract, fetched ahead and held as blobs, the next one
decoded ahead (`src/render/prefetch.ts`). A yacht is sixteen hours of the line at its base pace, so a
frame is an hour of the game's clock.
