# Notes, Turn 22, agent B3: the hall

Sections 2.7 to 2.13 of `CLAUDE.md` (Turn 22). Two lines a task of what was built, every figure this
agent chose for itself, and, at the end, the exact old and new text of every change wanted in a file
or a region that is not this agent's to edit.

---

## T22-B3a, 2.7: a run is one drawing

- `src/render/pipes.ts` was rewritten: a run is one SVG path through the centre of every cell it
  passes at `DUCT_HEIGHT`, with the quadratic bend of Turn 17 at every corner, and that one path is
  stroked five times, darkest first: the rim at `PIPE_STROKE + 2`, the body, the shade a third of the
  stroke offset down, the lit edge offset up and the specular a tenth of the stroke offset up. A
  vertical is the same five strokes with the offset across the screen instead of down it.
- The seven drawn tile kinds, `pipeTile`, `PIPE_KINDS`, `PIPE_TILE_KEYS`, `pipeCellArt` (the per cell
  sprite lookup), the joint disc and the port ring are all gone; the gate collar is the one key of the
  layer that is still a picture and it kept its lookup in `gateCollarCellArt`.

### What was kept of `tileKeysFor` and `PipeTile`, and why

`PipeTile` and `PipeTileKey` are kept, and `PipeTileKey` is narrowed from nine kinds to four:
`'pipe.drop' | 'pipe.run' | 'pipe.inlet' | 'pipe.tee'`.

They are kept because `PipeRun.tiles` is **state** (`state.pipes`, section 4 of the brief says the
pipes need no field, so the shape does not move), and because four other things read it and none of
them reads a direction: `joinableCells` skips the drop, `removeRun` reads whether the last cell is a
tee, `bestPath` tees onto a cell of an existing run, and the drawing needs the cells in order. So
what the key carries now is which end of the run a cell is, and nothing else.

`'pipe.run'` is a new name for the middle cells, which had to be given something: the field is not
optional and a v31 save has a key on every cell. It is the one kind that is not one of the two ends.
The six directional kinds and the drawn tee are deleted, and `tests/engine/pipes.test.ts` asserts
that no cell of a run carries any of them.

**A v30 or v31 save's middle cells still carry `pipe.ns`, `pipe.ew` or an elbow in the saved JSON.**
Nothing reads them: every test in the code is `=== 'pipe.drop'` or `=== 'pipe.tee'`, and a stale
middle key answers both exactly as `'pipe.run'` does, so an old save draws and reroutes correctly and
is rewritten to the new keys the first time its run is touched. The v19 migration was phase A's and
does not rewrite them; if the lead would rather the saved keys were tidied, it is one loop over
`state.pipes` in `src/engine/migrate.ts` (not this agent's file) and it changes no behaviour.

### Figures this agent chose in 2.7

- `BEND_SEGMENTS = 8` [TUNE]: how many straight lengths a bend is flattened into when the run is
  *measured* (which is how a drop finds the pipe above itself). A bend is half a metre of pipe, about
  twelve pixels, so eight segments is smooth to well under a pixel. It is not used for drawing: the
  drawing emits a real `Q`.
- `HOSE_BOW = 4` px [TUNE]: how far the flexible hose bows on its way into a visible port, so it
  reads as a hose and not as another length of steel.
- `ELBOW_RISE = 0.25` m [TUNE]: how high above the mouth the elbow of an extractor's inlet starts, so
  the elbow is square with the quarter metre the vertical stands in front of the mouth [PIOTR].
- `.pipe-spec` in `src/ui/styles.css`: a new class, no new value. The specular line is `PIPE_LIGHT`
  again at a tenth of the stroke and at full strength, where `.pipe-edge` is the same grey at 0.85,
  so the specular reads as the bright core of the lit edge. The brief allows four greys and the hose
  and no fifth colour, so the specular could not have one of its own.
- `PIPE_BAR_WIDEN = 1.5` and `EDGE_LIFT = max(1, PIPE_STROKE / 3)` are Turn 17's figures, kept.

### What the test asserts about "one path", and why it is not one `<path>` element

2.7's Done clause reads "a run of six cells with one corner is one `<path>`". A run is drawn as **one
path geometry**, and that geometry is stroked five times, so it is five `<path>` elements carrying the
identical `d`, with the offsets as `transform="translate(...)"` and never as a second set of numbers.
The test asserts exactly that: the set of `d` attributes of a run has size one, and a tee gives two
such geometries (the main run and the branch, the branch drawn second and so over it).

One `<path>` element per run is unreachable while 2.8 stands: 2.7 itself says "a vertical drop is
shaded left to right instead of top to bottom", and a drop shaded across itself cannot share the `d`
of a run shaded down itself. So a run's group holds the run's geometry, the drop's, and, at the
extractor end, the inlet's vertical and its elbow: four geometries at most, each one path, each
stroked five times, and no picture anywhere.

"The six cells' centres lie on the path" is asserted with one documented exception, which is the bend
of Turn 17 doing what a bend does. The centres of the five straight cells are on the path to within
0.01 px. The corner cell's centre is the control point of the quadratic, so the curve cuts the corner
and passes 6 px from it: the arms reach half a cell, which on the 2 to 1 dimetric is 12 px each way,
and the closest approach of a quadratic to its control point is a quarter of the sum of its arms,
which is 6. The test asserts the corner centre within `PIPE_STROKE` (7 px) and says so in a comment.
Tightening it to half a stroke would mean shortening the bend's arms to 0.29 of a cell, which is not
the bend the brief asks for.

---

## T22-B3b, 2.8: every connection point is a number

- The drawing reads the table: `portPointOf` in `src/render/hall.ts` turns a line's `px, py` into a
  screen point through `spriteBox` and `SPRITE_SCALE`, which is the very arithmetic that places the
  picture, so the pipe lands on the same pixel of the picture at any zoom. A machine's drop comes
  down from the run at that pixel's own screen x: `hidden` (the five saws) stops it at `py` and
  draws nothing else, and a visible port (the spindle moulders, the three floor edgebanders) stops
  half a metre above it and a hose in `HOSE_COLOUR` finishes the job. An extractor's inlet is
  Piotr's variant C: the vertical stands 0.25 m in front of the mouth, comes down to the mouth's
  height, and an elbow turns into the mouth and ends on the measured pixel.
- `connectCheck` refuses a run into a fan whose mouth faces a wall, in the brief's own words, and
  `needsPortData` in `src/engine/pipes.ts` is what the Sprite check page asks: a machine with an
  extraction demand or a fan a run goes into wants a line, and a file that wants one and has not got
  one is printed in red as `no port data`.

### The defect the coordinator found, fixed: the mirrored cell is the axis swap

`mirroredPort` and `portCellIn` mirrored a cell with `footprintWidth - 1 - cell.x`, which is the
reflection of a *row* and not of this projection. A mirror about the vertical screen axis on a 2 to 1
dimetric exchanges the two world axes, which is why the same sentence of 2.8 says `faces` swaps
`+x` and `+y`: the rule is `{ x: cell.y, y: cell.x }`. Both of the coordinator's worked examples come
out right under it and neither does under the old one:

| line | cell | old mirror | new mirror | what it means |
| --- | --- | --- | --- | --- |
| `tableSaw.standard` (3 by 1, turned 1 by 3) | 1,0 | -1,0 | 0,1 | a metre off the machine, against the middle cell of the turned footprint |
| `extractor.standard` (2 by 1, turned 1 by 2), `faces +y` | 0,1 | 0,1 | 1,0 | under the unit, against one cell along the axis the mouth now opens down |

`footprintWidth` is no part of the rule, so it is gone from `mirroredPort`, from `portCellIn` and
from `portOf`'s `size`, and `portCell` in `src/engine/pipes.ts` no longer hands it in.
`tests/engine/ports.test.ts` asserts the rule on both worked examples, and asserts of **every one of
the eighteen lines, at orientations 0 and 1**, that a machine's cell lands inside its own footprint
and an extractor's outside it. Nothing is clamped: the assertion is the guard.

### `portCell` and the measured pixel can be half a metre apart, and nothing is wrong

Worth Piotr's eye rather than a change. `portCell` is `Math.floor(footprint origin) + the line's
cell`, and a footprint is centred inside the zone it reserves (Turn 7 3.3), so a 3 by 1 saw in a
4 by 3 zone has its origin at x 4.5 and not 4.5 rounded anywhere. The standard saw at anchor 4,2
therefore routes to cell 5,3 while its measured pixel at px 137 lands at screen x 76.5, which is
4.5 px past the right edge of that cell and inside the next one along. Nothing in the drawing minds:
the drop hangs from the run at the pixel's own screen x and `runAbove` finds the run's y there, so
the pipe meets the run exactly and comes down exactly on the port. The only thing that is half a
metre out is which grid cell the *route* claims, and the run passes over both. Changing it means
changing `portCell`, which moves the length of every run on a centred footprint and the pipe bill
with it, so it was not changed tonight.

### Figures this agent chose in 2.8

- `needsPortData` excludes the two central systems [TUNE, Claude]: `dustSystem` and `flexiSystem`
  have an extraction capacity, so the plain rule would ask the art side for a measurement on them,
  and there is nothing to measure. A central system draws a run along the rear wall and a drop to
  each machine, and no inlet of its own anywhere (CLAUDE.md T16 2.3).
- The words on the Sprite check page: `no port data` is the brief's, in red through the one `.warn`
  class. A line that is there reads `drop at px 137, py 62 · cell 1,0, hidden behind the body`
  or `inlet, mouth +y at px 28, py 67 · cell 0,1` [TUNE: Claude's wording, the numbers are the
  table's].
- `INLET_STANDOFF` 0.25 m and the hose's 0.5 m and `PIPE_STROKE * 0.7` are the brief's own figures
  [PIOTR, and the brief].

---

## T22-B3c, 2.9: a machine with a pipe on it does not breathe

- Already built in phase A: `fx-breathe` is gated on `hasMeasuredPort` in `src/render/hall.ts`, so
  anything `PORTS` has a line for stands still while it runs. Nothing of the code was changed
  tonight; what this task did was make the test say what 2.9 says.
- `tests/render/machineFx.test.ts` now asserts both halves rather than one: a pelletiser standing in
  the hall while the saw runs beside it **does** breathe, and it is the only group in the hall that
  does, while the extractor beside it has a measured port and stands still. A second test walks every
  item of the hall with a measured port and asserts none of them wears the swell.

The gate is the table and not the family, which is the point: the saw, the spindle moulder and the
edgebander never breathed (the swell was the extractor's alone since Turn 3), so the rule bites on
the extractor today and on any family the day it gains a port line.

---

## T22-B3d, 2.10: Rotate works

- `ui.armTurn` is the armed quarter turn and `ui.rotate` is now only ever the orientation of the
  thing in hand. Rotate, or R with nothing in hand, toggles `armTurn` and the button lights while it
  is set; the pick up reads the item's own orientation, applies the armed turn to it once and clears
  the arming; R with the item in hand turns what is in hand, as it always did.
- `tests/ui/rotateHall.test.ts` is new and drives the whole thing through the real DOM: arm, pick up,
  drop gives a turned cabinet; arm twice, pick up, drop gives an unturned one; R with nothing in hand
  arms it too; R with the mouse held turns what is held; and a click that neither moved nor turned
  leaves the hall and the moved list exactly as they were.

### One thing the brief's wording cannot have, and why it is not a gap

2.10 says "Rotate or R with the item in hand turns what is in hand, as today". R does. **The button
cannot**, and could not before tonight either: a press on a button is a mouse up, and a mouse up
anywhere is the item going down (`onSetupPointerDown` listens on `window`). So with something in hand
there is no way to reach the button at all, and the press that seems to reach it is really the drop
followed by an arming for the next pick up. The test asserts exactly that behaviour rather than
pretending the button turns what is held.

### The test asks the engine where a cabinet may be turned

The row the game lays the cabinets out on (`CABINET_SLOT_LAYOUT`, y 3) is one cell deep with the
workbench row directly under it, so a cabinet turned to 1 by 2 stands on a bench and `canPlace`
rightly refuses it (CLAUDE.md T21 2.13). The test therefore asks `canPlace` for a cell that takes the
cabinet both ways round instead of naming one, so it measures Rotate and not the day one layout.

---

## T22-B3e, 2.11: Rotate cycles only through the orientations that have a picture

- `orientationsFor` and `nextOrientation` in `src/engine/ports.ts` are the cycle, pure and asked of
  a list of files so a test can ask them of a list that is not the one on disk; `spriteOrientations`
  and `nextSpriteOrientation` in `src/render/sprites.ts` ask them of the manifest. `turnGhost` and
  the pick up's armed turn both go through `turnedFrom` in `src/ui/app.ts`, which is the one place
  the ring is walked, so Rotate, R and 2.13's Turn row cannot disagree.
- The rest of 2.11 was phase A's: `orientation` on every item and reservation, the footprint swap,
  `pictureFor`, and the v19 migration. What this task added beside the cycle is the Sprite check
  page's orientation line (written in T22-B3b, tested there), the cycle's tests in
  `tests/engine/rotate.test.ts`, and a whole v31 game opened in `tests/cloud/migrate.test.ts` with a
  turned cabinet coming up at orientation 1, standing 1 by 2, still the standard class.

### The rule for which orientations exist, which is Claude's and not the brief's

0 and 1 always; 2 and 3 only where the art side has drawn the file [TUNE]. The reason is that a
quarter turn with no file of its own is the base picture mirrored about its anchor, which the hall
has done since Turn 10 and which reads correctly, while a half turn has no mirror that would be
right: the base picture stood at 2 would show the front of the machine where its back belongs. So
an item with no turned files has two orientations, one with an `.rr` has three, and one with both
has four. A family with no picture at all still has 0 and 1, because what the player is really
turning there is the footprint of a box.

An orientation that is not on the ring at all, which is what a save would carry if a `.rr` file were
ever deleted, comes back to the first one that is rather than leaving the item standing at a picture
that is not there.

---

## T22-B3f, 2.12: the tool cabinet has a class ladder

- `TOOL_CABINET_VARIANTS` and `TOOL_CABINET_SLOTS` are the five classes and what each holds: used 1,
  budget 1, standard 2, pro 4, industrial 8 [PIOTR], at 90, 175, 350, 700 and 1,400 [TUNE, doubling
  from the standard's 350 as Piotr asked]. The footprints and the heights are the delivered
  pictures' and were measured off the PNG headers before they were written down: 112 by 112,
  112 by 112, 160 by 136, 160 by 175 and 208 by 208. Every class states its own working zone, which
  is its own footprint. `perWorker` is gone from the cabinet.
- The free slots are one engine question read by everything: `toolSlots`, `toolSlotsInUse`,
  `freeToolSlots` and `slotsInUseIn` in `src/engine/staff.ts`, over `toolSlotsOf` in
  `src/engine/machines.ts`. `shortfallForHire` counts slots instead of cabinets, so a hall short of
  room is short a slot and one used cabinet at ninety pounds is the cheapest way to fill it, while
  one industrial cabinet fills eight at once.

### The cross check's "one free slot" is nought free, and why

Section 7 reads: "Two used cabinets and one hand tool set: one free slot". Section 2.12 reads: "the
sum of the capacities of the cabinets standing on the hall minus the hand tool sets bought; **the
owner's own set takes a slot too**". The two cannot both hold: two used cabinets hold two sets, one
set is bought and the owner's is in there as well, so 2 - 1 - 1 = **0**.

The code follows 2.12, which is the contract, and the arithmetic is then the same as the game has
had since Turn 6: the day one hall with one cabinet has no slot for a man, the second cabinet gives
him one, and the man after that wants a third. `tests/engine/toolCabinet.test.ts` asserts that whole
sequence and says in a comment that section 7's figure reads as nought under 2.12. If Piotr wants
his own tools to cost nothing, the change is one line (`toolSlotsInUse` drops its `+ 1`) and the
hiring gate's `toolSlotsNeeded` has to drop its `+ 1` with it, or the first hire would be allowed
with nowhere to put his tools.

### Figures this agent chose in 2.12

- The class names: `Used tool cabinet`, `Tool cabinet`, `Double tool cabinet`, `Tool wall`,
  `Tool store` [TUNE], and the three lines of description on each [TUNE]. The prices and the slots
  are Piotr's.
- `powerPerDay: 1` on all five [TUNE]: the sheet rack's figure, which is what every class of storage
  carries. Nothing reads it, because only a machine and the extraction draw power
  (`poweredMachines`), but every class in the game states a figure above nought and
  `tests/engine/variants.test.ts` is that rule.
- The fill order behind `slotsInUseIn` [TUNE]: the sets fill the cabinets in the order they were
  bought, the owner's first. It is the only rule that needs no new field, and it is what lets the
  card of one cabinet say `2 in use` without the game writing down whose tools are where.

### Two measured consequences, both of them arithmetic

- **The two saw hall gets its third joiner back.** The day one kit buys the cheapest class, which is
  a metre square again, where Turn 21's single class was two metres. The crew limit is
  `Math.floor(freeFloorM2 / M2_PER_PERSON)` with `M2_PER_PERSON` 24, and the four cabinets of
  scenario (b) in `tests/scenarios/thirtyDays.test.ts` were sitting exactly on the boundary: it held
  the owner and three until Turn 21, two through Turn 21, and three again tonight. This is item 3 of
  REPORT-T21.md section 0 undone by the ladder rather than by any change to the crew rule.
- **The bill on the hiring card is 820 and not 1,340.** `missingCost` is the cheapest way into each
  family, and the cheapest cabinet is 90: 120 + 80 + 40 + 400 + 90 x 2.
- **`toolCabinet.pro.png` is 175 px tall where the contract's 174.4 floors to 174.** The art side
  rounded the fraction up; `sheetRack.standard`, the other class whose height is 1.8 m, was rounded
  down to 174. `tests/render/spriteClasses.test.ts` now allows the whole pixel either side of a
  fractional owed height and says which two files those are. Nothing stands off its tile: the hall
  sizes a picture by the owed box and not by the file.

---

## Notes for the lead: changes wanted in files or regions that are not B3's

### 1. `src/engine/index.ts` (the barrel), applied by B3 because nothing compiles without it

`PIPE_TILE_KEYS` is deleted from `src/engine/constants.ts` by 2.7, so its re-export had to go with
it. One line removed:

old
```
  PIPE_TILE_KEYS,
```
new
```
```

It sits in the `export {` list that re-exports `./constants`. Nothing else in the barrel was touched.

### 2. `src/engine/ports.ts`: `mirroredPort`'s `px` rule is exact only for a square footprint

This is phase A's file and 2.8's Mirror clause, and the coordinator's message of tonight says the
`px` half stays as written, so **it has been left exactly as it is** and the drawing does not read it.
The arithmetic, for the record, because it will bite the day a family with no `.r` file is turned:

`objectArt` in `src/render/hall.ts` mirrors a picture with
`transform="translate(anchor.x * 2, 0) scale(-1, 1)"`, which reflects it about the vertical line
through **the anchor**, not about the middle of the file. In file pixels the anchor stands at
`8 + width * 48` (docs/art/SPRITES.md 2), so the reflection of a pixel `px` is
`2 * (8 + width * 48) - px`, and `fileWidth - px` is `16 + (width + depth) * 48 - px`. The two agree
only when `width === depth`.

Worked on the standard saw, which is the machine this really happens to (3 by 1, no `.r` file,
mirrored at orientation 1, drawn in the box of its turned 1 by 3 footprint): the file is 208 px wide,
the anchor of the turned footprint is at file pixel `8 + 1 * 48 = 56`, so the true reflection of the
measured `px 137` is `2 * 56 - 137 = -25` and `fileWidth - px` is `208 - 137 = 71`. That is 96 file
pixels apart, which is two metres of hall: half the length of the saw.

So `portPointOf` in `src/render/hall.ts` takes the pixel through the renderer's own transform
(`anchor.x * 2 - screenX`) and uses `mirroredPort` for nothing. `faces` is swapped there in two lines
of its own. If the lead would rather there were one rule, the change in `ports.ts` is to hand
`mirroredPort` the anchor pixel instead of the file width:

old
```
export function mirroredPort(port: Port, fileWidth: number, footprintWidth: number): Port {
  return {
    ...port,
    px: fileWidth - port.px,
```
new
```
export function mirroredPort(port: Port, anchorPx: number, footprintWidth: number): Port {
  return {
    ...port,
    px: anchorPx * 2 - port.px,
```
with the callers handing in `SPRITE_PADDING + footprintWidth * TILE_WIDTH` at 2x. B3 has not made
this change, because the coordinator's message names the `px` rule as staying.

### 3. `src/ui/machine.ts`, applied by B3 because 2.12 asks for it and nobody else owns the file

2.12: "The catalogue's `Tool cabinets` folder lists the five with `Holds 4 men's tools` in the effect
line". That line is written by `effectLines` in `src/ui/machine.ts`, which is not on B3's file list
and is not on B1's or B2's either. The change is one line and one name on an import, and the words
themselves come from `toolSlotsLine` in `src/engine/machines.ts`, which is B3's, so the lead can
check or revert it in a moment.

old
```
    line(holdsLine(spec, variant)),
    gateLine(spec, variant),
```
new
```
    line(holdsLine(spec, variant)),
    // What a class of tool cabinet is for: how many men's hand tools it holds, in the words the
    // rack's card uses for its sheets (PIOTR, 19.09; CLAUDE.md T22 2.12).
    line(toolSlotsLine(spec.id, variant.id)),
    gateLine(spec, variant),
```
and `toolSlotsLine` added to the `from '../engine/index'` import list beside `sheetCapacityOf`.

### 4. `src/engine/game.ts`: the hand tool set's own gate on a free slot, NOT applied

2.12 asks for two gates on the free slots: the hiring gate, which is B3's `shortfallForHire` and is
built, and "the hand tool set's `requires`", which is `canBuy` in `src/engine/game.ts`. That file is
B1's tonight, so this one is a note. `freeToolSlots` is exported from `src/engine/staff.ts` and from
the barrel, and `HAND_TOOL_SET` from `src/engine/constants.ts`, so the change is the block below and
an import.

In `canBuy`, straight after the `requires` loop and before `const oneOf = requiresOneOfFor(...)`:

old
```
  const oneOf = requiresOneOfFor(spec, variant);
```
new
```
  // A man's hand tool set has to have somewhere to live: the cabinets of the hall hold one, two,
  // four or eight sets by their class, and the sets already bought and the owner's own fill them
  // from the bottom (PIOTR, 19.09; CLAUDE.md T22 2.12).
  if (specId === HAND_TOOL_SET && freeToolSlots(state) <= 0) {
    return { ok: false, reason: 'No free slot in a tool cabinet' };
  }
  const oneOf = requiresOneOfFor(spec, variant);
```
with `HAND_TOOL_SET` added to the `from './constants'` import list and `freeToolSlots` to the
`from './staff'` one.

It is safe where it stands: `orderEquipmentCheck` lands everything on the road first
(`afterTheTrips`), so a cabinet ordered this morning counts towards the slot the set wants, and
`landOrder` does not call `canBuy` at all, so nothing already paid for can be refused off the lorry.
Without it, the only thing missing is that a player may buy a set with nowhere to keep it; the hiring
gate still counts the slots, so no man can start without one.
