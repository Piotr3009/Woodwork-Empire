# Art and recordings requested after Turn 28

The shape `docs/art/REQUESTS-T26.md` left. Written 05.10.2026, the night Turn 28 put the timber
department's machines into the game (CLAUDE.md T28 2.11 and T28-D1). Piotr's words of that night:
"put the graphics in as you have them and we will refine them later". So the 42 files of the two
packs of 05.10 are in `public/sprites/` as they came, `docs/art/SPRITES.md` 12 lists them with
their metres, canvases and anchors, and no agent has altered a pixel of any of them (CLAUDE.md T28
section 1). Everything this page asks for is a redraw or a new file by the art side, never an edit
in the code.

Four things, in the order of need: the twelve frame press and glue table files again (1), because
what stands in the game is a stand in; the three cutter sets (3), because their catalogue cards
show an empty box; the sanders again (2), when there is time; and the products on the hall (4),
which are Piotr's to decide and are not to be drawn yet.

Every figure below is read off `public/sprites` as it stands on branch `turn-28-timber` and worked
from the contract's own arithmetic (`docs/art/SPRITES.md` 2): for a class of `w` by `d` by `h`
metres, the file is `(w + d) x 48 + 16` by `(w + d) x 24 + h x 48 + 16` px, the anchor (the
bottom corner of the floor diamond) is at `8 + w x 48` from the left edge and 8 px above the
bottom, and the `.r` file is the same canvas with `d` and `w` swapped, so its anchor is at
`8 + d x 48`. The slopes are measured on the lower outline of each file: the lowest opaque pixel
of every column, and the straight runs of its lower hull where the feet stand on the floor.

A file that is redelivered keeps its name and its canvas. It replaces the file of that name in
`public/sprites/`, `npm run sprites:manifest` is run, and nothing else in the code moves unless a
section says otherwise.

## 1. The frame presses and the glue table again: twelve files

`framePress.used`, `framePress.budget`, `framePress.standard`, `framePress.pro`,
`framePress.industrial` and `glueTable.standard`, each with its `.r`.

### 1.1 What happened to them

The art side's files of 05.10 were cut wrong: half size, off the anchor, and with pieces of the
neighbouring machine in them (CLAUDE.md T28 2.11). Chat cut them again from the preview board
Piotr approved, scaled each to its canvas and stood it on its anchor line by eye. Those twelve
stand ins are what the game draws tonight and what a player sees until the redelivery lands. They
have the right file size and their lowest pixel sits on the anchor line, but the registration is
by eye and not by geometry, and it shows when they are measured:

- **The projection is too flat.** On the contract's 2 to 1, a floor edge climbs 0.5 px for every
  px across. The cross cut saws and the planers of pack 1 measure 0.50 on their long edges (the
  industrial cross cut saw's conveyors excepted). The stand ins measure 0.07 to 0.34: each reads
  as seen from lower than the hall's camera, and, scaled to fill its canvas's width, its floor
  outline is wide and shallow and does not fill its footprint diamond.
- **The tall classes stand short.** The envelope's top is y 8 in every file; the 2.25, 2.5 and
  2.75 m presses reach only y 54, 76 and 180. The automatic press reads as a low conveyor.
- **The industrial press misses its anchor.** Its lowest corner is at x 313 where the anchor is
  248, and on its `.r` at x 32 where the anchor is 104.
- **`framePress.standard.png` carries two loose flecks**, pale grey and half transparent, on the
  floor in front of its base: 66 px at about x 50, y 172 and 43 px at about x 100, y 186. They
  belong to no part of the press.

| File in the game (and its `.r`) | Long edge climbs, px a px (0.5 owed) | Highest pixel, y (the envelope's top is y 8) |
|---|---|---|
| `framePress.used.png` | 0.28 / 0.34 | 24 / 21 |
| `framePress.budget.png` | 0.28 / 0.32 | 46 / 38 |
| `framePress.standard.png` | 0.24 / 0.26 | 54 / 50 |
| `framePress.pro.png` | 0.19 / 0.18 | 76 / 76 |
| `framePress.industrial.png` | 0.15 / 0.07 | 180 / 182 |
| `glueTable.standard.png` | 0.28 / 0.29 | 21 / 17 |

(A machine on legs need not reach y 8: the short height is a fault on the presses of 2.25 m and
over, where the frame is the machine.)

### 1.2 What each one is

The subjects are the ones on the preview board Piotr approved, in its colours, and they are not
to be redesigned: only redrawn to the contract. One sentence a class, from CLAUDE.md T28 2.4, and
what the approved picture shows.

| Class | CLAUDE.md T28 2.4 | What the approved picture shows |
|---|---|---|
| `framePress.used` | a bench with a handful of sash cramps | a timber topped bench on a green steel frame with a lower rail, a handful of sash cramps with red heads laid across the top |
| `framePress.budget` | a cramping table with long cramps fitted | a slatted aluminium cramping table on a light steel frame, long cramps fitted across the slats, a row of spare cramps hanging at one end |
| `framePress.standard` | a hand frame press | a green upright press: two posts on splayed feet, three horizontal beams, three screw spindles with T handles on the top beam, a screw cramp at each end |
| `framePress.pro` | a hydraulic frame press | the same green upright press with two hydraulic cylinders on the top beam, the hoses, an electrical cabinet at each end, a red stop button |
| `framePress.industrial` | an automatic window press with rollers in and out | a blue automatic press with three cylinders on its top beam, mesh guards at the sides, a control pedestal with a screen, and roller tables in and out |
| `glueTable.standard` | a glue table with a roller spreader | a steel topped table on a green frame with a lower shelf, a roller glue spreader on the top, a glue pot, a bucket on the shelf, a rack of cramps at one end |

### 1.3 The canvas and the anchor of each file

| File | Metres, w by d by h | Canvas (before padding) | File, px | Anchor, view 0 | Anchor, `.r` |
|---|---|---|---|---|---|
| `framePress.used.png` | 2 by 1 by 1 | 144 by 120 | 160 by 136 | 104, 128 | 56, 128 |
| `framePress.budget.png` | 3 by 1 by 1.25 | 192 by 156 | 208 by 172 | 152, 164 | 56, 164 |
| `framePress.standard.png` | 3 by 1 by 2.25 | 192 by 204 | 208 by 220 | 152, 212 | 56, 212 |
| `framePress.pro.png` | 4 by 1 by 2.5 | 240 by 240 | 256 by 256 | 200, 248 | 56, 248 |
| `framePress.industrial.png` | 5 by 2 by 2.75 | 336 by 300 | 352 by 316 | 248, 308 | 104, 308 |
| `glueTable.standard.png` | 3 by 1 by 1 | 192 by 144 | 208 by 160 | 152, 152 | 56, 152 |

The floor diamond the machine stands on, its four corners in px of the file. The anchor is the
bottom corner; the far corner is the one at the back, behind the machine.

| File | Left corner | Bottom corner (anchor) | Right corner | Far corner |
|---|---|---|---|---|
| `framePress.used.png` | 8, 80 | 104, 128 | 152, 104 | 56, 56 |
| `framePress.used.r.png` | 8, 104 | 56, 128 | 152, 80 | 104, 56 |
| `framePress.budget.png` | 8, 92 | 152, 164 | 200, 140 | 56, 68 |
| `framePress.budget.r.png` | 8, 140 | 56, 164 | 200, 92 | 152, 68 |
| `framePress.standard.png` | 8, 140 | 152, 212 | 200, 188 | 56, 116 |
| `framePress.standard.r.png` | 8, 188 | 56, 212 | 200, 140 | 152, 116 |
| `framePress.pro.png` | 8, 152 | 200, 248 | 248, 224 | 56, 128 |
| `framePress.pro.r.png` | 8, 224 | 56, 248 | 248, 152 | 200, 128 |
| `framePress.industrial.png` | 8, 188 | 248, 308 | 344, 260 | 104, 140 |
| `framePress.industrial.r.png` | 8, 260 | 104, 308 | 344, 188 | 248, 140 |
| `glueTable.standard.png` | 8, 80 | 152, 152 | 200, 128 | 56, 56 |
| `glueTable.standard.r.png` | 8, 128 | 56, 152 | 200, 80 | 152, 56 |

### 1.4 The contract they are drawn to

- 2x art, 8 px of transparent padding on every side, no baked shadow, no floor, no text, no
  brand, the style sheet and the light of `docs/art/SPRITES.md` 1 to 4.
- The hall's camera: a strict 2 to 1, the long side running down-right in view 0. Pack 1 is the
  model, and it is exact: `crossCut.budget.png` is the very envelope of `framePress.budget`
  (3 by 1 by 1.25, 208 by 172), and every diamond but the industrial press's has a pack 1 file
  standing on it already (2 by 1: `crossCut.used`; 3 by 1: `crossCut.budget` and `planer.used`;
  4 by 1: `crossCut.standard` and `planer.standard`). Lay the new file over the pack 1 file and
  the floor lines should meet.
- The machine fills its footprint diamond and its lowest point is the anchor; nothing stands
  outside the envelope, and nothing of a neighbouring machine or of the board it was cut from is
  in the file.
- The tall presses reach their height: 2.25 m for the hand press, 2.5 m for the hydraulic one,
  2.75 m for the automatic one, at 48 px a metre in the file.
- The working side faces the camera. The operator stands at the long side that faces the camera
  in view 0, the `front` side of `STATION_TABLE` (CLAUDE.md T28 2.4): the cramp screws, the
  press's controls and the spreader's handle are on that side.
- Each `.r` is a true quarter turn of the same machine and not a mirror (`docs/art/REQUESTS-T22.md`
  2), on the same canvas, with its anchor at `8 + d x 48`.
- No inlet is measured for them. The presses and the glue table make no dust and want no
  extraction, and the game draws no air line, so they have no line in `PORTS` and a redelivery is
  the file and the manifest.

## 2. The sanders again, when the art side next has time (optional)

The ten pack 2 sander files are in the game as the art side delivered them (CLAUDE.md T28 2.11)
and they stay until they are replaced. This is not urgent and not a rejection: they are the right
machines, and only the camera is wrong.

Looked at one by one, the subjects are right, class by class, and read as the five sentences of
CLAUDE.md T28 2.4: the used one is a sander on a timber topped bench with its own vacuum drum
under it; the budget one a downdraught table with a perforated top and its extraction
spigot; the standard one an edge belt sander with its long table and an extraction hose; the pro one a
through feed sander in a green enclosure with roller tables in and out; the industrial one a blue
sanding line of four sections, four extraction stubs on top, roller tables at each end. The
colours and the materials sit well with the pack 1 machines.

What is off:

- **They are drawn from lower than the hall's camera.** Their long floor edges climb 0.27 px a
  px (the industrial pair) to 0.43 (the budget `.r`), where the contract and every planer measure
  0.50. Beside a planer on the hall they look longer and flatter than it.
- **The pro and the industrial pairs stand off their anchors**, which follows from the flat
  projection: the lowest foot of `sander.pro.png` is at x 194 where the anchor is 152, of its
  `.r` at 57 where it is 104; of `sander.industrial.png` at 337 where it is 296, of its `.r` at 57
  where it is 104. The three small pairs are within 15 px.
- **The industrial pair stands low in its canvas.** Its highest pixel is at y 113 of 304, where
  `planer.industrial.png`, on the same 400 by 304 canvas and the same 6 by 2 by 2 envelope,
  reaches y 46. Both are 2 m in the engine, and the sanding line reads a good deal lower.

The request: the ten redrawn to the contract of 1.4 above, the same subjects in the same colours,
when the art side next has time.

| File | Metres, w by d by h | File, px | Anchor, view 0 | Anchor, `.r` |
|---|---|---|---|---|
| `sander.used.png` | 2 by 1 by 1 | 160 by 136 | 104, 128 | 56, 128 |
| `sander.budget.png` | 2 by 1 by 1.25 | 160 by 148 | 104, 140 | 56, 140 |
| `sander.standard.png` | 2 by 1 by 1.5 | 160 by 160 | 104, 152 | 56, 152 |
| `sander.pro.png` | 3 by 2 by 1.75 | 256 by 220 | 152, 212 | 104, 212 |
| `sander.industrial.png` | 6 by 2 by 2 | 400 by 304 | 296, 296 | 104, 296 |

**One thing moves in the code the day they land.** The sanders from `budget` up want extraction,
and their inlets are measured by Claude off the files in the game now, one line a file in
`src/engine/ports.ts`, keyed by the file's name (`docs/art/SPRITES.md` 12). A redrawn file under
the same name would keep a line measured on the old picture and be quietly wrong, so the lines of
the redrawn sanders are measured again before the files go in, as `docs/art/REQUESTS-T22.md` 2
settled: the art side delivers the PNG and Claude measures the mouth on it. The used sander has a
vacuum of its own and wants no line.

## 3. Three cutter sets: new pictures

From CLAUDE.md T28 2.5: a spindle moulder cuts a profile with the cutters it is given, and each
kind of product has its own set. Three families of one class each:

| File | Family | Name in the game |
|---|---|---|
| `cuttersSash.standard.png` | `cuttersSash` | Sash window cutter set |
| `cuttersCasement.standard.png` | `cuttersCasement` | Casement window cutter set |
| `cuttersDoor.standard.png` | `cuttersDoor` | Door cutter set |

They are kept at the spindle moulders. They hold no cell of the floor, nothing is drawn for them
on the hall and they are never sold, so they are **catalogue pictures only**. Until they land the
catalogue shows the empty picture box it shows for any file that is missing.

**The canvas.** The same as the one other kit in the game that is kept off the floor and has a
picture of its own: the hand tool set, `handToolSet.standard.png` of v49. That file is 112 by
112, the 1 by 1 by 1 canvas of `docs/art/SPRITES.md` 2 (96 by 96 and 8 px of padding), anchor
56, 104, and its open case fills the middle of it (x 23 to 87, y 25 to 89). The catalogue shows a
picture at its own size in a box 120 px high, so a 112 px file is shown whole and is not scaled.
Same treatment: drawn from the hall's camera and in the hall's light, so the card sits beside its
neighbours, transparent around the object, no shadow, no text. No `.r`: kit that never stands on
the floor never turns. Nothing is measured on them (no inlet, no station, no footprint).

**What each shows.** A set of profile cutters for a spindle moulder: the cutter heads (steel
bodies with their knives), the spacer collars, the key, laid in an open fitted case seen from the
hall's camera, or stood on a small steel rack; the same case or rack for all three, so they read
as one maker's range. The style sheet forbids text and numbers, so nothing is printed on the case
to say which set it is: what tells the three apart at catalogue size is what lies in them.

- **Sash window cutter set**: the most cutters in the case and the slimmest: the ovolo and lamb's
  tongue moulding and scribe for the glazing bars, the pair for the meeting rails.
- **Casement window cutter set**: fewer, chunkier blocks with stepped knives: the rebated
  casement profile and the frame profile, a pair each.
- **Door cutter set**: the stile and rail profile and its scribe, and a panel raiser, a wide disc
  with long angled knives, the largest piece in any of the three sets and the one that tells the
  door set apart at a glance.

## 4. For Piotr to decide, not to draw: the products on the hall

CLAUDE.md T28 section 8 parks them and T28-D1 asks for them to be written here. **Nothing is drawn
by the art side and no placeholder is made by an agent until Piotr says which he wants** (CLAUDE.md
T28 section 6). Each needs a rule of the game as well as a picture (when it appears, where it
stands, what it takes of the floor), so a yes from Piotr starts a design turn: the metres are
fixed then, and the canvas follows from them by `docs/art/SPRITES.md` 2 as every object's does.

- **A pack of timber at the gate.** A banded pack of window section timber on bearers, steel
  strapped, end grain showing. It would stand where the pallet of sheets stands today, inside the
  shutter on the lane, on the morning a timber job's boards are delivered, until the men carry
  them to the rack. Tonight a timber job's boards are delivered and unloaded as any order is
  (CLAUDE.md T28 2.9).
- **A trolley of machined parts.** A steel parts trolley with two or three shelves of profiled
  stiles and rails, stacked. It would stand beside the machine the job is at and follow the job
  from the planer to the moulders to the press. The question it opens: whether it takes a cell,
  and whether a man is drawn pushing it.
- **A rack of frames drying.** A mobile upright rack with frames standing in slots, still in
  their cramps after pressing or fresh from the booth. It would stand beside the frame press for
  the glue's night and beside the booth for the lacquer's (CLAUDE.md T28 2.8). This is the
  picture of the question section 8 parks, whether frames that are drying take floor or racks;
  tonight they take neither, and the booth's drying racks do nothing for a timber job.
- **A stillage of finished windows.** A steel A frame stillage with finished, glazed windows or
  doors standing on edge, padded and wrapped. It would stand at the gate on the day of delivery,
  until the van or the courier takes them.

## 5. Still outstanding from earlier turns

Unchanged from `docs/art/REQUESTS-T26.md` 2 to 4, and nothing of it has landed (read off
`public/sprites` and `public/sounds`): the labourer's bench sheet `character.helper.bench`; the
`.rr` and `.rrr` quarter turns of every floor family but the tool cabinet; and the seven
recordings of `docs/art/REQUESTS-T20.md` 1, with `public/sounds` holding its README alone. The
five timber families turn between 0 and 1 like every other family, and their backs are not asked
for tonight. This turn adds no sound of any kind (CLAUDE.md T28 section 6).
