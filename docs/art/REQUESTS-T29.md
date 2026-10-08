# Art and recordings requested after Turn 29

The shape `docs/art/REQUESTS-T28.md` left. Written 05.10.2026, the night Turn 29 put the five axis
CNC, the spraying robot, the production line and the timber stores into the game (CLAUDE.md T29
2.4 and T29-E1). Piotr's words of that afternoon: "you have it in the zip", "put everything into
the next turn". So the 22 files of the three packs (the robot and the five axis CNC; the line's five
modules; the two timber stores) are in `public/sprites/` as they came, renamed by chat as the game
names them, `docs/art/SPRITES.md` 13 lists them with their metres, canvases and anchors, and no
agent has altered a pixel of any of them (CLAUDE.md T29 section 1). All 22 are rendered from models,
exact to the contract, in the plainer look of Turn 28's pack 1; Piotr has seen that and it stays for
now. Everything this page asks for is a redraw or a new file by the art side, never an edit in the
code.

Six things, in the order of need: the line's five modules again, so that they meet end to end, with
a saw at module 1's infeed in the same delivery (1 and 2); the two timber stores drawn empty (3);
Turn 28's twelve stand ins and three cutter sets, still wanted (4); and two that are Piotr's to
decide and are not to be drawn yet, a figure for the line engineer (5) and the products on the hall
(6).

Every figure below is worked from the contract's own arithmetic (`docs/art/SPRITES.md` 2), as
`REQUESTS-T28.md` did: for a class of `w` by `d` by `h` metres, the file is `(w + d) x 48 + 16` by
`(w + d) x 24 + h x 48 + 16` px, the anchor (the bottom corner of the floor diamond) is at
`8 + w x 48` from the left edge and 8 px above the bottom, and the `.r` file is the same canvas with
`d` and `w` swapped, so its anchor is at `8 + d x 48`. What a picture is seen to do on its
footprint is said only where the repo records it; where nothing is recorded, this page says it is
to be checked on the Sprite check page.

A file that is redelivered keeps its name and its canvas. It replaces the file of that name in
`public/sprites/`, `npm run sprites:manifest` is run, and nothing else in the code moves unless a
section says otherwise. The modules, the robot and the stores make no dust and have no line in
`src/engine/ports.ts`, so a redelivery of any of them is the file and the manifest.

## 1. What sits badly on its footprint

The five line modules again, **asked** (1.1 to 1.4): `windowLine1.standard.png` to
`windowLine5.standard.png`, each with its `.r`, ten files. The five axis CNC, the robot and the two
stores, **to be checked** (1.5).

### 1.1 What is recorded of the modules

`docs/art/SPRITES.md` 13: **the five modules stand short of their footprint's side corners by about
38 px in both views**, about 0.8 m, so two modules butted end to end may show a narrow gap between
them on the hall. The game stands the line in one place: module N at the cell x = 5 + 6 x (N - 1),
y = 14, six cells along x and three along y, at orientation 0, so the five take the cells x 5 to 34,
y 14 to 16 and meet on their 3 m ends (CLAUDE.md T29 2.9.2). They are never moved or turned, so the
`.r` files are on disk for the tests and the Sprite check page and are not drawn on the hall today.

Not recorded, and to be checked on the hall with the whole line standing (T29-E4's pictures): that
the five read in order as one line, the infeed at module 1 and the frames coming off at module 5.

### 1.2 What each one is

The subjects are the art side's own and are not to be redesigned: only drawn out to their
footprint. What the game makes each one do, so the art side knows what the player is told it is
(CLAUDE.md T29 2.9.1, 2.9.5):

| File | Name in the game | What the game makes it do |
|---|---|---|
| `windowLine1.standard.png` | Window line, module 1 | the infeed and the planing: the Cross cutting and the Planing (2) |
| `windowLine2.standard.png` | Window line, module 2 | a CNC with two heads in the line: the Moulding |
| `windowLine3.standard.png` | Window line, module 3 | through feed sanding: the Sanding |
| `windowLine4.standard.png` | Window line, module 4 | a press and frame assembly: the Pressing |
| `windowLine5.standard.png` | Window line, module 5 | a robot takes the frames off into a buffer: no stage of its own |

The art side's own table gave module 1 the profiling as well. In the game the profiling is module
2's; nothing has to come out of module 1's picture for it.

### 1.3 The canvas, the anchor and the floor diamond

Every module is 6 by 3 by 2.5 m: the file is 448 by 352 px, the anchor 296, 344 in view 0 and
152, 344 in the `.r`. The four corners of the diamond, in px of the file; the far corner is the one
at the back, behind the module.

| File | Left corner | Bottom corner (anchor) | Right corner | Far corner |
|---|---|---|---|---|
| `windowLineN.standard.png` | 8, 200 | 296, 344 | 440, 272 | 152, 128 |
| `windowLineN.standard.r.png` | 8, 272 | 152, 344 | 440, 200 | 296, 128 |

### 1.4 The request

The ten redrawn to the contract of `REQUESTS-T28.md` 1.4 (2x art, 8 px of padding, no baked shadow,
no floor, no text, the hall's 2 to 1 camera, each `.r` a true quarter turn and not a mirror), the
same subjects in the same colours, each module filling its diamond to the side corners so that the
five laid end to end on the hall are one line with no gap between them.

### 1.5 The five axis CNC, the robot and the stores: to be checked

Nothing is recorded in the repo about how the other twelve files sit on their footprints, the `.r`
views of the pro and the industrial five axis CNC among them. `docs/art/SPRITES.md` 13 says all 22
fit the canvas and the anchor with no table of pixels: that is the file's size and the anchor's
place, not where the machine's feet stand. They are **to be checked on the Sprite check page**, and
a file a check finds off its anchor is added here, with its offsets, before the art side is asked
to redraw it. The diamonds the five axis CNC should fill:

| File | Metres, w by d by h | File, px | Left corner | Bottom corner (anchor) | Right corner | Far corner |
|---|---|---|---|---|---|---|
| `cnc5.standard.png` | 5 by 3 by 2.5 | 400 by 328 | 8, 200 | 248, 320 | 392, 248 | 152, 128 |
| `cnc5.standard.r.png` | | | 8, 248 | 152, 320 | 392, 200 | 248, 128 |
| `cnc5.pro.png` | 6 by 3 by 2.75 | 448 by 364 | 8, 212 | 296, 356 | 440, 284 | 152, 140 |
| `cnc5.pro.r.png` | | | 8, 284 | 152, 356 | 440, 212 | 296, 140 |
| `cnc5.industrial.png` | 8 by 4 by 3 | 592 by 448 | 8, 248 | 392, 440 | 584, 344 | 200, 152 |
| `cnc5.industrial.r.png` | | | 8, 344 | 200, 440 | 584, 248 | 392, 152 |

**One thing moves in the code the day any of the six is redrawn.** The five axis CNC wants
extraction, and its inlets are measured by Claude off the files in the game now, one line a file in
`src/engine/ports.ts`, keyed by the file's name. A redrawn file under the same name would keep a line
measured on the old picture and be quietly wrong, so it is measured again before it goes in, as
`docs/art/REQUESTS-T22.md` 2 settled. The standard class is an open gantry with no duct stub drawn,
and its line ends at the middle of the top of the head's carriage; a stub drawn there in a redraw
would give the line a mouth to end in.

## 2. A saw at module 1's infeed: asked

`windowLine1.standard.png` and `windowLine1.standard.r.png`, best in the same delivery as 1.

Module 1 is drawn as an infeed and a planer with no saw (CLAUDE.md T29 2.4). The game gives it the
Cross cutting all the same [TUNE: chat]: Piotr's first stage needs a five axis CNC and a press
beside it and nothing else, and with the Cross cutting left at the cross cut saws every man on the
line would still be counted against their two or three places. Its card says what the game does:
`Does the Cross cutting and the Planing of windows and doors`. So the picture is asked to show it:

- a cross cut saw at the infeed end the art side drew: a docking saw over the infeed conveyor with
  its fence and stops, where the rough boards come in and are cut to length before the planer;
- the planer and the rest of the module as they are drawn, in the same colours;
- the same canvas, the same anchors and the same diamond as 1.3.

## 3. The two timber stores drawn empty: asked; with a load: for Piotr to decide

`timberRack.standard.png` and `timberShelter.standard.png`, each with its `.r`.

### 3.1 What happens today

Both stores are drawn full of timber, with no empty picture and no layer (`docs/art/SPRITES.md` 13).
The game counts the boards on a store and prints them on its plate, so a store bought this morning
shows a full load over a plate of `0 / 40`, or `0 / 400` on the shelter. Known, and left in Turn 29.

### 3.2 The request

Each store drawn empty, the same subject in the same colours with its arms or its bays bare,
delivered under the same names to replace the full pictures: the plate carries the count, and an
empty store with a plate of `12 / 40` reads truer than a full one with `0 / 40`. The art side keeps
the full pictures.

Whether the game should also draw the load over an empty store, and in how many steps, is a rule of
the game and **for Piotr to decide**. If he says yes, the turn that takes it in fixes the file names
and the steps, and each load is drawn on the same canvas as its store so that it lies over it.

### 3.3 The canvas, the anchor and the floor diamond

| File | Metres, w by d by h | File, px | Anchor, view 0 | Anchor, `.r` |
|---|---|---|---|---|
| `timberRack.standard.png` | 4 by 1 by 2.5 | 256 by 256 | 200, 248 | 56, 248 |
| `timberShelter.standard.png` | 3 by 6 by 3 | 448 by 376 | 152, 368 | 296, 368 |

| File | Left corner | Bottom corner (anchor) | Right corner | Far corner |
|---|---|---|---|---|
| `timberRack.standard.png` | 8, 152 | 200, 248 | 248, 224 | 56, 128 |
| `timberRack.standard.r.png` | 8, 224 | 56, 248 | 248, 152 | 200, 128 |
| `timberShelter.standard.png` | 8, 296 | 152, 368 | 440, 224 | 296, 152 |
| `timberShelter.standard.r.png` | 8, 224 | 296, 368 | 440, 296 | 152, 152 |

**The shelter's two views changed places.** The art side drew it 6 m long by 3 m deep. It stands
outside on the apron, which is 3 m wide, so the game declares it 3 wide by 6 deep: the art side's
90 view is `timberShelter.standard.png` and its 0 view is the `.r`. A redelivery comes under the
game's names, in the game's views. Kit outside is never turned, so the shelter's `.r` is never drawn
on the hall; it is wanted all the same, for the tests and the Sprite check page.

## 4. Turn 28's requests, still wanted: asked again

Read off `public/sprites` on branch `turn-29-the-line`: nothing of `REQUESTS-T28.md` 1 to 3 has
landed.

- **The twelve frame press and glue table files** (`REQUESTS-T28.md` 1): delivered on 08.10 and in
  the game from v85, not exact by the art side's own check; the rest of this bullet is history. The files in the
  game are still chat's stand ins of commit `ec4a07d` (T28-C1), with the flat projection, the short
  tall classes and the industrial press off its anchor that 1.1 of that page measured. From Turn 29
  they matter more: module 1 of the line requires a frame press beside it, so the stand in press
  stands next to the line in every company that builds one.
- **The three cutter sets** (`REQUESTS-T28.md` 3), unchanged: `cuttersSash.standard.png`,
  `cuttersCasement.standard.png` and `cuttersDoor.standard.png`, catalogue pictures only, 112 by
  112, no `.r`. There is still no file, and the catalogue shows its empty picture box. From Turn 29
  a second set of a kind is refused, so the card shows its locked `Buy another` with `One set serves
  every moulder` under the empty box; and the five axis CNC cuts with the sets too, so a company with
  the CNC and no moulder buys them.
- **The sanders again** (`REQUESTS-T28.md` 2), optional and unchanged. A company whose line runs as
  three modules does its Sanding on module 3, but every company below it still sands at these.

## 5. For Piotr to decide, not to draw: a figure for the line engineer

The line engineer is on `NEVER_ON_THE_HALL` (`src/engine/staff.ts`): he is never drawn on the hall,
and the Sprite check page stands him as the capsule the office's admin, salesman and draftsman
stand as (`CHARACTER_ROLES`). No figure exists for him, and none is drawn by an agent (CLAUDE.md T29
section 6). Section 8 parks the figure.

**Nothing is drawn by the art side until Piotr says he wants him seen.** A yes needs a rule of the
game as well as a picture: where he stands (along the line's front, at a module's controls, walking
the line), while he is on duty and the line stands, and whether he is drawn at night, when the line
runs under the engineers of the day. Then the sheets follow from the character contract of
`docs/art/SPRITES.md` 10: four rows (sw, se, nw, ne), a cell of 112 by 151 px, the anchor at 56,
143, an `idle` and a `walk` at the least, and a working sheet if he is to be seen at the controls.
He would want to be told from the crew at a glance, as the production manager is by his white shirt
(`docs/art/SPRITES.md` 10.7); what marks him out is Piotr's to choose.

## 6. For Piotr to decide, not to draw: the products on the hall

Unchanged from `REQUESTS-T28.md` 4, and still parked (CLAUDE.md T29 section 8): a pack of timber at
the gate, a trolley of machined parts, a rack of frames drying, a stillage of finished windows.
**Nothing is drawn and no placeholder is made until Piotr says which he wants.** Turn 29 changes
three of the questions:

- **A pack of timber at the gate.** A load of boards can now stand at the gate for days, waiting for
  room on the timber stores (CLAUDE.md T29 2.11.2), and what is drawn there is the sheets' pallet
  with the plate `Delivery: 19 boards`. A pack of timber would stand in its place.
- **Where the boards are kept.** From Turn 29 the boards are on a timber rack in the hall or the
  shelter on the apron, and never on a sheet rack; the stores of 3 are the nearest the hall comes to
  showing them.
- **The end of the line.** Module 5 takes the finished frames off into a buffer. A stillage of
  finished windows, or frames standing at the end of the line, is part of the same question for a
  company with all five.

## 7. Still outstanding from earlier turns

Unchanged from `REQUESTS-T28.md` 5, and nothing of it has landed (read off `public/sprites` and
`public/sounds`): the labourer's bench sheet `character.helper.bench`; the `.rr` and `.rrr` quarter
turns of every floor family but the tool cabinet; and the seven recordings of
`docs/art/REQUESTS-T20.md` 1, with `public/sounds` holding its README alone. The five axis CNC, the
robot and the timber rack turn between 0 and 1 like every other floor family, and their backs are
not asked for tonight; the modules and the shelter never turn. This turn adds no sound of any kind
(CLAUDE.md T29 section 6).
