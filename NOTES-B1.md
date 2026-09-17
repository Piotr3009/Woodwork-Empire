# Notes from B1 (the figures) for the integrator, Turn 19

Everything here is a change B1 needs in a file that Turn 13 froze for phase B. None of it has
been made; each entry names the file, the place and the exact code.

## Numbers chosen (B1)

Every figure B1 picked itself. The constants phase A already put in `constants.ts` are used
wherever one exists, so this list is short.

### 2.1 The movement

- `WALK_CORNER_CELLS = 2` [TUNE], in `src/render/walkers.ts`. How long a run of cells in one
  world direction has to be before it counts as a corner and turns the man, rather than being
  swallowed into the leg's own heading. The brief's own words are "the path turns ninety degrees
  for more than two cells", so the figure is the brief's and only its name is chosen here. It
  belongs beside `WALK_STRIDE_METRES` in `src/engine/constants.ts`; it is in `walkers.ts` because
  `constants.ts` is frozen for phase B.
- The locomotion frame rate is not a chosen figure: it is derived,
  `frames * WALK_CELLS_PER_SECOND / WALK_STRIDE_METRES`, both of which are already constants
  (1.0 PIOTR, 1.4 [TUNE] phase A). With the delivered 8 frame sheets that is 5.7143 fps.
- Two decimals on the walker's transform. Not a constant: it is the smallest precision at which
  no frame of a 60 fps walk rounds to a standstill (0.2 px a frame is the smallest real step),
  and a third decimal would only lengthen the string.

### 2.4 At the bench, not on it

- `out: 1` on `tableSaw.operator`, `cnc.operator`, `sprayBooth.operator`, `edgebander.operator`
  and on the free side operator cell of a rack or an extractor (`waiting` there goes to `out: 2`).
  Every one of them is measured in the report's sprite table, not guessed.
- `workbench.operator` and `workbench.second` keep `out: 0`: measured, the man overlaps his own
  bench by 18.9% and 9.4%, which is a man leaning over his bench, and a metre further out would
  read as a man who has stepped away from it.

### 2.3 The doors

- The hinge is the left jamb of each room door and the leaf swings out into the hall, which is
  what `docs/art/SPRITES.md` 9.3 says the room doors do. Not a number, but a choice.
- `DOOR_SWING_MS` 400 and `DOOR_CLOSE_MS` 600 are the brief's own figures and phase A's
  constants; the half state is at `DOOR_SWING_MS / 2`.

### 2.2 The owner in the office

- `OFFICE_OWNER_BOX` [TUNE] in `src/render/office.ts`: where the owner is drawn on the office
  canvas. Measured off `officeDesk.png` and the region table, in the clear wall strip left of the
  door, so he is behind the desk's far edge and clear of every region button. The office picture
  has no desk region to read this off (`OFFICE_REGIONS` is workPlan, orders, door, clock, laptop,
  catalogue, binder, company), so it is a new box and not a number out of `SPRITES.md` 8.

## For the integrator: changes wanted in frozen files

### 1. `src/ui/styles.css`, the stale Turn 2 comment (2.1)

Around line 268 there is a comment promising "A figure slides between its stations instead of
jumping (CLAUDE.md T2 3.3)", followed by an unrelated `.view-note` rule. There is no transition
on `.figure`, `.figure-art` or `.figure-flip` anywhere, and there must not be one: a CSS
transition on the transform would fight the walker's per frame write and lag the man behind his
own feet. Delete the comment.

### 2. `src/ui/styles.css`, the door leaf and the opening (2.3)

The three leaves of a door are all in the markup and the stylesheet shows exactly one, which is
what keeps the swing off the render path. The class names wanted, with what each should do:

```css
/* 2.3 The doors open (CLAUDE.md T19 2.3). Three leaves in the markup, one shown. */
.door-opening { fill: var(--ink-900, #14110d); opacity: 0.85; }
.door-leaf { display: none; fill: var(--door-leaf, #6b4f33); stroke: var(--ink-700, #2a2118); stroke-width: 1; }
[data-door-state='closed'] .door-leaf[data-state='closed'] { display: block; }
[data-door-state='half'] .door-leaf[data-state='half'] { display: block; }
[data-door-state='open'] .door-leaf[data-state='open'] { display: block; }
```

Without these rules every door draws all three leaves at once. B1 did not add them because
`styles.css` is frozen; the render tests assert the markup, not the paint.

### 3. `src/ui/styles.css`, the owner at his desk in the office view (2.2)

```css
/* 2.2 The owner is at his desk when the player follows him in (CLAUDE.md T19 2.2). */
.office-figure { position: absolute; pointer-events: none; }
```

`pointer-events: none` is not decoration: the live slot is the last child of `.office-stack`, so
without it the figure covers the region buttons and every click in the office is eaten.

### 4. `src/ui/app.ts`, the door driver (2.3)

The doors are driven exactly as the walkers are, and for the same reason: `patchInto` strips any
attribute the fresh markup does not carry, so the swing state has to be re-applied after every
render and stepped on every frame.

```ts
// beside the walker imports, around line 88
import { resetDoors, stepDoors, syncDoors } from '../render/doors';
```

```ts
// in render(), immediately after syncFigures(nowMs()) at line 1004
syncDoors(parts.page, nowMs());
```

```ts
// in frame(), between stepWalkers and playCharacters at lines 2327-2328
stepDoors(root, now);
```

```ts
// beside every resetWalkers() call (lines 1166, 1184, 1637, 1652, 1788)
resetDoors();
```

Until this is applied the doors are drawn in the state the hall computes for the frame the page
was built in (closed, or open when somebody stands in the doorway) and they do not swing. Every
render test passes either way; the swing test drives `syncDoors`/`stepDoors` directly.

### 5. `src/ui/app.ts`, the canteen door's click (2.3)

`runClick` matches `closest('[data-van],[data-kit],[data-door]')` before it tests the room
footprints, and `handleSceneClick` returns false for a door it does not know. The canteen now has
a `[data-door="canteen"]` group, so without this branch a click on the canteen door does nothing
at all where it used to write the canteen's note. Beside the `element.dataset.door === 'office'`
branch (around line 1837):

```ts
if (element.dataset.door === 'canteen') {
  setNote(roomById('canteen')?.tooltip ?? '');
  return true;
}
```

Use whatever the canteen block's own click does today, so there is one code path and not two.
