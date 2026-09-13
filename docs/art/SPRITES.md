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
outline. It sits at pixel `(W / 2 + 8, H + 8)` counted from the top-left of the file, i.e. horizontally
centred, 8 px above the bottom edge. The loader places that pixel on the tile corner. If the object
is drawn off-centre, it will stand in the wrong place in the hall; check this before delivering.

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
(5 × 3 × 3, 384 × 336), `dustSystem` (3 × 3 × 4, 288 × 336), `pelletiser` (2 × 2 × 3, 192 × 240), the
office desk items (`laptop`, `ledgerFolder`, `materialsBinder`, `catalogue`, `teamBoard`, `phone`),
`drill`, `handToolSet`, and the machine tier variants of the table saw.

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
- Playback at the manifest's fps in real time, independent of game speed (a man does not walk faster
  at 4x; he covers ground faster because the move is shorter in real seconds). Each sheet has its
  own fps and its own cell size: the loader never assumes them.
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
