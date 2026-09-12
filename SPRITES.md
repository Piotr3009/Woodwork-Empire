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
