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
