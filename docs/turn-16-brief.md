# Turn 16: the men walk the floor

Woodwork Empire. Autonomous session brief for Claude Code (Opus 5, effort ultracode, cloud).
Owner: Piotr. Programmer: Claude. Spec author: Claude (chat), 16.09.2026, from Piotr playing v22
and correcting the hall drawing five times in one afternoon (Petros: software/woodwork-empire,
STAN 16.09; docs/mockups/t16/).

Read this whole file (first line must say "Turn 16"; if the root CLAUDE.md does not, stop and
report), then REPORT-T15.md in full, then docs/mockups/t16/README.md and open hall-grid-1609.html
in a browser (it is the design; the two piotr-marks-*.png are his red pen on earlier versions),
then docs/art/SPRITES.md sections 9 and 10, then the archived briefs in docs/. Where files
disagree, this one wins. All standing rules apply (no em or en dashes anywhere, scope 1:1, one
code path, constants never in the UI, [TUNE] for every figure you choose and [PIOTR] for his,
kill background processes, PR without merge, end the session, no PR watching, npm run check gated
on its own exit code, every click single, one APP_VERSION bump).

Precondition. main carries Turn 15 merged: APP_VERSION is 'v22', STATE_VERSION is 14,
src/engine/pipes.ts has pathBetween, pipeRunFor and isConnected, and src/render/characters.ts has
the walk, carry and idle animations with facingFromScreen. If APP_VERSION is not 'v22', stop and
report.

One agent, serial. Four pieces, and the first two share hall.ts, characters.ts and stations.ts, so
a team would wait on itself.

## 0. What this turn is for (Piotr, 16.09)

Three things Piotr saw on the hall in v22, in his words:

- Pipes: "I cannot see whether a machine is connected or not. Sometimes there is 'connected'
  written under it, sometimes not, so I do not know whether I have to connect it myself."
- Unloading: "The character walks in the corner, moving his legs but not moving. Show me on the
  grid how he walks from the unloading to the rack."
- Machines: "Show me on the grid how the worker stands at the saw and at the other machines,
  because right now it looks bad."

And one on the top bar: a Projects chip with the count of live jobs, opening the Work Plan, the
same board as in the office.

The drawing in docs/mockups/t16/hall-grid-1609.html is the answer he approved, with three rules he
added in red pen, quoted here because they are the contract:

1. "Facing the saw, back to us." An operator faces his machine, so his back is to the camera.
2. "The rack stands against a wall, so how is he supposed to walk between the wall and the rack?
   When it stands against a wall you come at it from the other side." The approach cell of any
   item is on its free side, never between the item and a wall, and the game picks the side.
3. "It is important that the points at the individual items are joined up." The standing points
   are nodes of one network over the free cells, and every walk is a path on it, never a jump.

## 1. Rules restated (short)

Everything from Turns 1 to 15. Tonight in addition:

- APP_VERSION = 'v23'. STATE_VERSION does not bump. Where a figure is on the floor at this second
  is presentation, real time, like the frame of his animation (SPRITES.md 10.4: "a man does not
  walk faster at x10"); it is not game state and is not saved. If you think you need a field on
  the state, stop that piece, write it in the report, do the rest.
- The engine says where and along which cells; the renderer says when. Paths, standing cells and
  facings are pure engine functions with tests on a small hall. The renderer moves the figure
  along them at real seconds and never decides a cell of its own.
- Real time, never game minutes, for the walk itself. At x30 a figure still walks at a man's
  pace; the engine's station changes run ahead and the walker catches up (2.2 says how).
- One drawing of a pipe. Every pipe tile, run and drop on the hall comes from one vector helper;
  the Turn 4 grey bar and its drops to every machine are deleted, not restyled.

## 2. Changes to the design (the contract)

### 2.1 Where a man stands: the station table and the free side [PIOTR]

Today stationCell in hall.ts has one rule for every item: the first cell in front of the footprint
(frontOf, y = stands.y + depth), and every figure faces south west (FIGURE_FACING). Tonight that
rule is deleted and replaced by a station table in src/engine/stations.ts, one row per family, read
by a new standingCell(state, item, role) and facingAt(state, cell, item):

| Family | Operator's cell | Waiting | Second place |
|---|---|---|---|
| Table saw (2 by 1) | front side, the right cell | front side, the left cell | none |
| Thicknesser (2 by 1) | the left end, facing along the machine | one cell further left | none |
| Spindle moulder (2 by 1) | front side, the left cell | front side, the right cell | none |
| Edgebander | front side, the second cell from the infeed end (the left) | the cell to its left | none |
| CNC (3 by 2) | panel: front side, the right cell | front side, the middle cell | loading: back side, the middle cell |
| Spray booth (3 by 2) | front side, the middle cell | front side, the left cell | none |
| Bench (2 by 1) | front side, the left cell | front side, the right cell | second: back side, the right cell, for a second man at the same bench |
| Sheet rack | the free side (below) | none | none |
| Extractor unit | the free cell on the bag side (the side away from the wall) | none | none |
| Anything else (lockers, seats, compressor, gates) | front side, the left cell, as today | none | none |

"Front" is the camera side, y + depth, as the code already means it. "Back" is y - 1. "Left end"
is x - 1 on the item's first row. Every cell in the table is stated as an offset from the
footprint's origin so the table reads without a picture; write the offsets once and the tests
read them back.

Facing. No table. A man at his cell faces the centre of the item's footprint, through the existing
facingFromScreen on the screen vector from his feet to that centre. That gives "back to the
camera" at every front cell and "along the machine" at every end cell for free. A figure that is
walking faces the way it is going (2.2). A figure that is idle faces the way it does today.

The free side. A cell in the table is only a preference. standingCell checks it against the hall:
a cell is free when it is inside the unit, on no footprint, in no room (ROOM_LAYOUT), and not the
pallet's own cells. If the preferred cell is not free, the function walks the sides in a fixed
order, front, back, left, right, and takes the first side with a free cell at the same position
along it; for the sheet rack the order is instead the side with the most free cells in the two
rows beyond it, which is the hall side when the rack stands against a wall or under a room.
Piotr's own case: a rack under the canteen's face has its front cell free, so the man stands at
y + depth facing north; a rack against the front kerb has no front cell, so he stands behind it
facing south. A test puts a rack against each of the four sides and under the canteen and asserts
the cell and the facing for each.

The pallet. The unloading man does not stand "at the back of the lorry inside the shutter" any
more. He stands in front of the pallet on the hall side: the cell east of the pallet's first row,
(GATE_LAYOUT.x + GATE_LAYOUT.width, GATE_LAYOUT.y + 1), facing the pallet (west). If that cell is
not free, the cell between the pallet and the office, (GATE_LAYOUT.x + 1, GATE_LAYOUT.y - 1),
facing south [PIOTR: "from the hall side, never from outside"].

Edgebander. Its footprint stays what it is in constants.ts tonight (1 by 1); Piotr drew it at 4 by
1 with an infeed and an outfeed and that is a catalogue change with prices and zones, parked
(section 6). The table's row is written for the footprint as it is and reads the width off the
footprint, so it needs no change when the footprint grows.

### 2.2 The men walk the floor [PIOTR]

The network. A new engine module src/engine/walk.ts: isFree(state, cell) as above, walkPath(state,
from, to): Cell[] a breadth first search over the four neighbours on free cells (the working zones
of machines are free, the gate lane is free, a pipe tile is free because it is in the air),
returning the cells from from to to inclusive, or the straight Manhattan line when no free path
exists (a boxed in man still gets somewhere, and the report lists any such case the scenarios
hit). Tests on a small hall: round a footprint, round a room, through the gate lane, a blocked
target falls back to the line. pathBetween in pipes.ts is for pipes over equipment and is not
reused; say so in a comment at both.

The walker. In src/render/characters.ts (or a sibling walkers.ts), one walker per figure on the
page: the cell it is at, the path it is on, and the real time it started that path. On every frame
(the same real time loop the frames use) the walker advances along its path at
WALK_CELLS_PER_SECOND 1.6 [TUNE], sets the figure's transform to the interpolated point between
two cells, plays carry when the leg carries material and walk otherwise, and faces the way it is
going through facingFromScreen. On arrival it plays the station's animation and faces the item
(2.1). The CSS transition on .figure is deleted: the walker owns the transform. When the engine
changes a figure's station, the walker computes the path from where the figure is now (mid walk
if it must) to the new standing cell and sets off; it never jumps unless the view is rebuilt from
scratch (a load, a scene change), in which case it starts at its station's cell.

What carries material. A leg carries material when it goes from the pallet to the rack (an unload
trip), from the rack to a machine or a bench (fetching a sheet), or from a machine to a bench (cut
parts). Every other leg is a walk. One function, legCarries(fromStation, toStation), says so, and
animationForStation keeps its job for the standing animation.

Unloading. While a figure's station is the gate and a delivery is being unloaded, the walker
loops: pallet cell, rack's standing cell, pallet cell, one loop per trip, SHEETS_PER_TRIP sheets
per trip as the engine already counts. The number of loops is ceil(sheets / SHEETS_PER_TRIP); at
high speed the engine finishes before the walker does, and the walker finishes the loop it is on
and then goes to the figure's new station. At the pallet he faces the pallet; at the rack, the
rack. The test drives a delivery of ten sheets by hand and asserts five loops on the walker's log.

Production. When a job's stage moves a man from the rack to the saw, or from the saw to the bench,
his station changes as it does today; the walker carries him there along the network with carry
on the legs 2.2 names. No new engine timing: a walk costs no game minutes tonight [PIOTR: the look
first; minutes for walking are a later decision].

The waiting man. A man waiting for a machine stands at the table's waiting cell and faces the
machine, as 2.1 says, and walks there like anybody else.

### 2.3 Pipes you can read [PIOTR]

One vector helper. src/render/pipes.ts: pipeTile(kind, cell) draws one tile of the run in the 2 to
1 dimetric as a vector: a round duct of PIPE_DIAMETER 0.2 m [TUNE] drawn as a rounded bar in the
game's duct grey (--kit-machine-dark) with a lighter top edge, for the eight kinds ns, ew, the
four elbows, tee, drop (the vertical down to the machine, drawn as a short vertical bar ending in
a ring on the port), and inlet (a collar at the extractor). The tiles sit in the air at
DUCT_HEIGHT over the floor exactly where the placeholder boxes sit today, sorted with the
equipment so a pipe over a saw draws over the saw. The placeholder green boxes for pipe tiles go:
placeholder.ts keeps serving everything else.

The Turn 4 ducting is deleted. ductRun and ductDrop in hall.ts, their CSS (.duct-run, .duct-drop,
.duct-port, .is-flexi), DUCT_SPRITE_SUFFIX and the sprite pick for it, and the tests that draw
them. A central system (dustSystem, flexiSystem) is drawn by the same vector helper: one run along
the rear wall at the same height, and a drop to every machine that wants extraction, because with a
central system every machine is connected and that is what the drawing has to say. DUCT_SYSTEMS
stays as the engine's knowledge of what is a central system.

Connected or not, on the hall. A machine that wants extraction (wantsExtraction) and has no run to
it (pipeRunFor null, and no central system) gets a red ring on its port cell, PORT_RING 8 px
[TUNE], pulsing at one second, and the label not connected in the small token under the machine's
name on the hall, in the game's red. A connected machine gets the drop and nothing else; a
connected word is not written anywhere on the hall. The machine card's Connected, 6 m of pipe and
Connect to extraction, £x stay as they are; the tip table gains one sentence for the first
unconnected machine: A red ring is a machine with no pipe to the extraction. Open its card to
connect it, or hire a production manager and it is done for you. [TUNE the words].

A test draws a hall with one extractor and two saws, one connected and one not, and asserts: one
drop, one red ring, one not connected label, no .duct-run, no green placeholder tile; then with a
central system, two drops and no ring.

### 2.4 The Projects chip on the top bar [PIOTR]

Between the day meter and Orders: N, a chip Projects: N where N is openJobs(state).length, styled
as the other push buttons, opening the Work Plan modal (data-modal="workPlan", the same modal the
office board opens; grep for the board's data-do and use the same one). It pulses with the news
the other chips pulse with when a job changes stage [TUNE: or never]. Hidden until the workshop
has its first job? No: shown from day one at Projects: 0, so the player learns where it is. Test:
the chip's count, the modal it opens, and that it is the same modal as the office board.

## 3. State

No change to the shape of the state. STATE_VERSION stays at 14. The walker's cell and path are
render state, rebuilt from the stations on a fresh view.

## 4. Task queue, in order

Branch turn-16-the-men-walk-the-floor from main. One commit per task, npm run check green on its
own exit code before each, two report lines per task in REPORT-T16.md.

T16-01 Housekeeping and v23. docs/turn-15-brief.md byte for byte from the Turn 15 merge commit;
the README's briefs line; APP_VERSION = 'v23'. Done: the version test.

T16-02 The Projects chip. 2.4. Done: its test.

T16-03 The station table. 2.1: the table, standingCell, facingAt, the free side rule, the pallet
cell, frontOf and FIGURE_FACING deleted, every figure on the hall placed by the table and facing
its item. Done: the engine tests (every row of the table on a known layout, the rack on five
placements, the pallet cell and its fallback) and the render test (each figure's transform equals
its standing cell, its facing row is the one towards the item).

T16-04 The network. 2.2, walk.ts alone. Done: its tests.

T16-05 The walker. 2.2, the walker in the renderer, the CSS transition gone, carry on the material
legs, the unloading loop, the waiting man. Done: a test with a fake clock that steps real time,
asserting the figure's transform moves along the path cell by cell, the animation on each leg, the
five loops of a ten sheet delivery, and no jump on a station change; the sixty tick stability test
still green.

T16-06 The pipes. 2.3: the vector helper, the Turn 4 ducting deleted, the ring and the label, the
central system through the helper, the tip. Done: the test of 2.3 and the office hover test still
green.

T16-07 Look and shoot. Open the hall with: a rack under the canteen, a rack against the front kerb,
a saw with a man at it, a bench with two men, an extractor with one connected saw and one not, a
central system; a delivery of ten sheets unloaded by hand at x1 with the figure walking the loop.
Ten screenshots into docs/report-t16/, and a short screen recording is not asked for (the test log
stands in for it). Done: the pictures, npm run check green.

T16-08 Report and PR. REPORT-T16.md in the usual structure plus "Numbers chosen", "The station
table as built" (the offsets, one row per family), "Deleted" and "Walks the scenarios hit that had
no free path". Kill background processes, push, PR titled Turn 16: the men walk the floor, do not
merge, end the session.

## 5. Do not (tonight)

- No STATE_VERSION bump. No field on the state for a figure's position or path.
- No game minutes for walking. Nothing in production.ts, tasks.ts or stages.ts changes timing.
- No change to a footprint in constants.ts (the edgebander stays 1 by 1 tonight).
- No second path finder: walk.ts for men, pipes.ts for pipes, each with the comment of 2.2.
- No restyling of the Turn 4 ducting: it is deleted, and the central system is drawn by the pipe
  helper.
- No touching docs/art/SPRITES.md, CLAUDE.md, the archived briefs, the mockup files, the sprite
  files, the character sheets or the font file. Art requests go in docs/art/REQUESTS-T16.md only.
- No JavaScript hover state; the ring pulses on CSS.
- No storage access outside src/cloud/store.ts; no PixiJS, sound, mobile, Steam, Electron.
- No watch loops, nothing left running.

## 6. Parked

- The edgebander at 4 by 1 with an infeed and an outfeed (Piotr's drawing): a catalogue change
  with a price, a zone and the class ladder; its own turn.
- Minutes for walking: whether a long walk costs production time.
- GPT's eight pipe tiles (T13 3.19): the vector helper stands until then; when the tiles land the
  helper picks them through the sprite file check, the way every sprite does.
- Everything parked by Turns 13 to 15.

## 7. The cross check (before the PR)

- One rule per family. grep hall.ts for frontOf and FIGURE_FACING: gone. Every figure's cell comes
  from standingCell, every facing from facingAt or the walker.
- The free side. The rack tests of 2.1 are green on all five placements.
- One network. grep src/render for a breadth first search or a neighbour loop: none; the renderer
  calls walkPath and nothing else.
- No jump. The walker test asserts the transform never moves more than one cell between two frames
  after the first.
- Real time. The walker reads the frame clock (nowMs), never state.clock.
- One pipe drawing. grep src/render for duct-run, duct-drop, ductRun, ductDrop and for a pipe tile
  drawn by placeholder: none.
- Connected reads on the hall. The 2.3 test is green; the machine card's text is unchanged.
- The chip. Projects: N opens the same modal as the office board, proved by the test.
- The look. The ten pictures are in docs/report-t16/.

## 8. Art requested (contents of docs/art/REQUESTS-T16.md)

- The eight pipe tiles of T13 3.19 stand as requested; nothing new is needed for the pipes.
- character.joiner.carry facing the four ways is delivered; if nw or ne is missing from any role's
  carry or walk sheet, list the missing rows so the mirror rule of 3.13 is not carrying more than
  it should.

End of brief.
