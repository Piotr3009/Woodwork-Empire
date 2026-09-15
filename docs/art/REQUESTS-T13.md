# Art requested by Turn 13

For GPT, on `art/sprites`, PNG in `public/sprites/`. Written by the code side on 15.09.2026 from
CLAUDE.md T13 section 9; the code draws a flat placeholder for every item below until the file
lands, through the one `placeholder(kind, size)` helper in `src/render/placeholder.ts`. Nothing in
this file changes `docs/art/SPRITES.md`, which stays the contract for canvas, anchor and style.

**Every item in the hall's 2:1 dimetric**, matching `docs/art/SPRITES.md` 9.1: floor diamond
twice as wide as tall, camera from the south east, light from the upper left. Anything drawn
straight on will look crooked on our angle, the way some of the furniture still does.

## 1. Pipe tiles, eight

The extraction pipe the game routes over the floor (CLAUDE.md T13 3.19). Dark green steel, a
lighter top edge, no cast shadow. Each tile is sized to one cell (1 m by 1 m at 96 by 48 in the
file, plus the usual 8 px padding), drawn at the pipe's height above the floor so that a tile
placed on a cell reads as a pipe over that cell. File name is the key.

| Key | What it is |
|---|---|
| `pipe.ns` | a straight run along world y (down left on screen) |
| `pipe.ew` | a straight run along world x (down right on screen) |
| `pipe.ne` | an elbow joining a north arm to an east arm |
| `pipe.nw` | an elbow joining a north arm to a west arm |
| `pipe.se` | an elbow joining a south arm to an east arm |
| `pipe.sw` | an elbow joining a south arm to a west arm |
| `pipe.tee` | a tee, three arms |
| `pipe.drop` | the vertical drop from the run down to a machine's port |
| `pipe.inlet` | the inlet into the extractor unit |

**Drawn in the hall's 2:1 dimetric and never straight on.** North is world minus y, east is world
plus x, as in SPRITES.md 1.

## 2. Gate collar, one

`gate.collar`: the automatic blast gate, a short collar on the drop tile (CLAUDE.md T13 3.11).
Sits on `pipe.drop`, same cell size.

## 3. House cards, eight

`house.1` to `house.8`, landscape, the width of the day end card (about 900 by 300 at 1x, so
1800 by 600 in the file). Still pictures, no animation, no text. From a run down flat in the middle
of nowhere at tier 1 to a villa at tier 8, each with the owner's car outside growing with the tier,
and a garden from tier 4 (CLAUDE.md T13 3.18). The tiers, in the words the game uses:

| Tier | Draw a day | Home |
|---|---|---|
| 1 | 200 | a bedsit over a shop |
| 2 | 400 | a rented flat |
| 3 | 800 | a two bed terrace |
| 4 | 1,500 | a semi with a garden |
| 5 | 3,000 | a detached house |
| 6 | 5,000 | a house with a double garage |
| 7 | 7,500 | a house in the country |
| 8 | 10,000 | a villa |

## 4. Pallet of sheets, and a pallet truck

`pallet`: a pallet of boards at the gate, 1 by 1 by 1 m, the material delivery as what it is
(CLAUDE.md T13 3.21). `palletTruck`: a hand pallet truck, 1 by 1 by 1 m, a handling item like the
forklift, on the handling templates.

## 5. The production manager and the estimator

`character.productionManager.*` and `character.estimator.*`: character sheets in the Turn 11
character contract (SPRITES.md 10): `walk` (8 frames), `idle` (2), `bench` (8), `carry` (8), and
for the manager `phone` (8) as the owner has. The manager in a hi vis over a shirt, the estimator
in office clothes with a tablet. Same cell, same anchor, same fps as the joiner's sheets.

## 6. Spindle moulder, five classes

`spindleMoulder.used`, `spindleMoulder.budget`, `spindleMoulder.standard`, `spindleMoulder.pro`,
`spindleMoulder.industrial`, on the machine templates: a spindle moulder with a sliding table and a
fence, cast iron top, painted steel base, extraction hood at the back. Footprint 2 by 1 by 1 m
(canvas 288 by 192 before padding). The industrial one heavier, with a power feed.

## 7. Missing character frames

The code side lists every state the character system can be in and the frame key it wants
(CLAUDE.md T13 3.23). A missing frame falls back to `idle` rather than to nothing. What the roles
on `main` are missing, as the code reads the delivered manifests:

- `character.owner.*`: `walk`, `idle`, `bench`, `carry` (only `phone` exists tonight).
- `character.helper.*`: everything (`walk`, `idle`, `bench`, `carry`).
- `character.officeAdmin.*`, `character.purchasingClerk.*`, `character.salesman.*`,
  `character.draftsman.*`: everything, though an office role never leaves the office block, so
  `idle` alone would do for each.
- `character.joiner.phone`: not wanted, a joiner never takes a call.
- `home`: no sheet is wanted; the state exists so a figure going home is drawn as `idle` walking
  off the floor.

The report's section on frames lists the same, updated by phase C from the code.

## 8. Stock thumbnails

Code side, no art: the stock page draws a flat coloured board with a fake photo frame per material
kind through the placeholder helper.
