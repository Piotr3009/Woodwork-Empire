# Turn 23, group B3: the canteen

Agent B3. Worktree `/home/user/Woodwork-Empire/.claude/worktrees/wf_78302112-c21-3`, branch
`worktree-wf_78302112-c21-3`, off `cbc6403` "T23-A2 Phase A".

Sections built: 2.9 (the canteen opens as a room), 2.10 (eight lockers, eight men), 2.11 (the
canteen seat goes, the screens and the words half).

This file is the record of what B3 wrote outside its own files, of every decision the brief left
open, and of every figure B3 chose.

---

## 0. A correction the lead needs to know about

The worktree was not made off the phase A commit. It was checked out on `main` at `cd51383`
("tura 23"), which is v35, STATE_VERSION 19, with `CANTEEN_SLOT_LAYOUT` and the `canteenSeat`
spec still in the game. `cd51383` is an ancestor of `cbc6403`, so nothing was lost: the branch
was moved forward to `cbc6403` with `git reset --hard cbc6403` on a clean tree before any work
started, and every commit below sits on the phase A commit as intended. Nothing was pulled,
rebased, pushed or merged, and no other worktree was touched.

---

## 1. The decision the brief left to the agent: a sibling, or one generalised room

**Generalised, into a new third file.** `src/render/room.ts` is new and holds everything both
rooms do. `src/render/office.ts` keeps the office itself and `src/render/canteen.ts` is the
canteen. One code path, two tables.

Why not a sibling that copies the office's machinery: the office's scaling, letterboxing, scene
key, placeholder rule, region markup, label pill and lit overlay would then exist twice, and a
second copy of a rule is the thing this repo forbids. Why not put the machinery in office.ts and
import it from the canteen: `tests/render/deskItemsGone.test.ts` reads `src/render/office.ts` as
text and counts the `<svg>` in it, and the office's own regions carry two drawn objects
(the company board and the floor catalogue) that the canteen has no use for. A third file that
neither room owns keeps both of those honest.

What moved out of `src/render/office.ts` into `src/render/room.ts`, unchanged in behaviour:
`OFFICE_CANVAS` (now `ROOM_CANVAS`), `OFFICE_LIVE_SLOT` (`ROOM_LIVE_SLOT`), `officeScale`
(`roomScale`), `round` (`roundScale`), `boxStyle`, `layerHtml`, `litHtml`, `labelHtml`,
`regionHtml`, `fitOfficeStack` (`fitRoomStack`), the layer/region/lit/textbox interfaces and the
scene assembly (`roomScene`, `renderRoom`). `src/render/office.ts` re-exports every name its
callers and its tests already used (`OFFICE_CANVAS`, `OFFICE_LIVE_SLOT`, `officeScale`,
`fitOfficeStack`, `OfficeLayer`, `OfficeLitLayer`, `OfficeRegion`, `OfficeTextBox`, `Viewport`),
so no existing import anywhere changed.

`officeFigure` stayed in `src/render/office.ts`. It is the office's own man at his own desk, and
`deskItemsGone.test.ts` reads that file for it.

### The two things the shared machinery had to learn

1. **A lit overlay says which layer it is painted over.** `RoomLitLayer.over` is a layer key,
   and left out it means the first layer. The office's lit door is painted into the background,
   so it stays over the background and the markup it produces is byte for byte what it was. The
   canteen's lit bank is a lit copy of `canteenLockers`, so it must go over the bank and under
   the table that stands in front of it; drawn the office's way it would have been buried under
   the very layer it lights and nothing would ever have shown.
2. **The placeholder colours cycle.** `office-placeholder-${(index % 3) + 1}` instead of
   `index + 1`. The stylesheet has three placeholder colours and the office has three layers, so
   the office's output is unchanged; the canteen has four and its fourth would otherwise have
   been a class with no rule behind it, which is an invisible layer. No new colour was added to
   the stylesheet, which is what the modulo is for.

### The naming decision, and why the canteen wears `office-` classes

The canteen's markup uses the office's class names (`.office-room`, `.office-stack`,
`.office-layer`, `.office-region`, `.office-label`, `.office-lit`, `.office-live`,
`.office-placeholder-n`) and the office's click hook (`data-do="officeRegion"`,
`data-office="<id>"`).

They are what the stylesheet calls this family of screen and what the one click handler in
`src/ui/app.ts` is named for. Renaming them to `room-` would have been a large diff in
`src/ui/styles.css` and `src/ui/app.ts`, both of which B1 and B2 are also editing, for no change
in behaviour, and it would have touched `tests/ui/officeHover.test.ts`,
`tests/ui/officeRegions.test.ts` and `tests/render/officeRoom.test.ts` as well. Reusing them is
also what makes the canteen's lighting under the pointer the office's lighting with no new CSS at
all. **If the lead wants the family renamed, it is a mechanical rename of those seven class names
and the two data attributes and it should be done in one commit of its own, not inside this
turn.**

What was added so the two rooms can be told apart: every room's outer element now carries
`data-room-view="office"` or `data-room-view="canteen"`. The stylesheet does not read it; the
tests and the click handling do.

---

## 2. Decisions the brief left open, with the reason

- **Whose name goes on which plate.** The i-th locker bought belongs to the i-th man hired.
  `canteenPlateNames` takes `min(lockers owned, men on the books)` and letters that many plates
  from `state.workers` in order. A locker bought with nobody to put in it is a blank plate; a man
  taken on before his locker has landed has no plate until it has. Lockers **on order** do not
  count: a plate is a compartment that is standing in the room, not a promise.
- **What "in use" means on the counter.** The number of plates that carry a name, which is the
  same `min` above. The counter and the plates can therefore never disagree, which is the whole
  reason it is one function.
- **A name longer than the plate.** Cut to the eight characters the art side measured, with no
  ellipsis: an ellipsis would have eaten three of the eight. `CANTEEN_PLATE_TEXT.maxCharacters`
  is the figure and it is phase A's, off the JSON.
- **The counter's wording.** `5 of 8 lockers in use`, the brief's own sentence with the count and
  `CANTEEN_LOCKERS` substituted. It reads "1 of 8 lockers in use" with one man, which is right:
  the plural belongs to the eight, not to the one.
- **The kitchenette and the table** "do nothing yet", so they are `opens: false` quiet
  rectangles, exactly as the office's clock is. They take no click and show no label pill.
- **The lockers open the laptop's team page** through `openLaptopPage('team')`, with no gate of
  its own. The brief says the lockers open the team page and says nothing about needing a laptop
  to open it on, so nothing was added.
- **The locker's catalogue id in `src/render/canteen.ts`** is a local `const LOCKER = 'locker'`,
  the way `src/render/office.ts` writes `has(state, 'desk')` and `'laptop'`. No new exported spec
  id constant was invented for it.
- **The two refusal sentences are literals at the two refusal sites**, which is the house habit
  (`'No free bench slot in this unit'`, `'Not enough cash'`). They spell the eight as a word,
  which `CANTEEN_LOCKERS` cannot give them, so `tests/engine/eightLockers.test.ts` and
  `tests/ui/eightLockersLine.test.ts` both assert `CANTEEN_LOCKERS === 8` beside the words: a
  bigger canteen breaks those two tests and the words get changed with the figure.

## 3. Figures chosen

None. Every figure the canteen draws by is phase A's, copied from
`docs/mockups/t23/canteen-regions.json`: the four region rectangles, the eight plates, the
counter, 18 px and eight characters on a plate, 24 px on the counter, and the 1672 by 941 canvas,
which is `OFFICE_CANVAS`. `CANTEEN_LOCKERS` is `CANTEEN_PLATES.length` and so is not a figure
either. There is no `[TUNE]` in anything B3 wrote.

---

## 4. Changes outside B3's own files, with the exact old and new text

B3's own files, per section 3 of CLAUDE.md, are `src/render/office.ts` (and its new siblings
`src/render/room.ts` and `src/render/canteen.ts`), `src/ui/app.ts`, `src/ui/catalogue.ts` and
`src/engine/staff.ts`. `src/ui/catalogue.ts` was not changed at all: the catalogue greys the
ninth locker through `orderEquipmentCheck` and needed no edit.

### 4.1 `src/engine/constants.ts` (phase A's file; the eight is B3's, as briefed)

Inserted immediately **before** `export const CANTEEN_COUNTER`:

```ts
/** How many compartments this canteen has, which is the one figure the room letters, the
 *  catalogue greys the ninth locker by and the hiring gate refuses the ninth man by. It is the
 *  plates the art side painted and not a second opinion about them: eight doors, eight lockers,
 *  eight men, until there is a bigger canteen [PIOTR, 20.09; CLAUDE.md T23 2.10]. */
export const CANTEEN_LOCKERS = CANTEEN_PLATES.length;

```

Nothing else in `constants.ts` was touched.

### 4.2 `src/engine/game.ts` (B2's file)

Two changes, both in `canBuy`, which is where every other "there is nowhere for it" refusal
lives.

Import list, old:

```ts
  CABINET_SLOT_LAYOUT,
  DAY_LOGS_KEPT,
```

new:

```ts
  CABINET_SLOT_LAYOUT,
  CANTEEN_LOCKERS,
  DAY_LOGS_KEPT,
```

In `canBuy`, old:

```ts
  if (specId === 'workbench' && countOf(state, 'workbench') >= state.unit.benchSlots) {
    return { ok: false, reason: 'No free bench slot in this unit' };
  }
```

new:

```ts
  if (specId === 'workbench' && countOf(state, 'workbench') >= state.unit.benchSlots) {
    return { ok: false, reason: 'No free bench slot in this unit' };
  }
  // The canteen was built with eight compartments and a bigger one is not built yet, so there is
  // nowhere for a ninth locker to stand (PIOTR, 20.09; CLAUDE.md T23 2.10, 8).
  if (specId === 'locker' && countOf(state, 'locker') >= CANTEEN_LOCKERS) {
    return { ok: false, reason: 'The canteen has eight lockers' };
  }
```

**Note for the merge:** B2 may be rewriting the `workbench` line above for 2.17 (a bench holds
more than one man, so the count is against places and not benches). The locker block does not
depend on it and can be reapplied under whatever that line becomes.

### 4.3 `src/engine/staff.ts` (B3's file, but B1 and B2 are both in it)

Import list, old:

```ts
  ACCIDENT_CHANCE_PER_DAY,
  ACCIDENT_DAYS_OFF,
  HELPER_HOME_CELL,
```

new:

```ts
  ACCIDENT_CHANCE_PER_DAY,
  ACCIDENT_DAYS_OFF,
  CANTEEN_LOCKERS,
  HELPER_HOME_CELL,
```

In `hiringOptions`, one branch inserted between `crewFull` and `missing`. Old:

```ts
    } else if (crewFull(state, spec.role)) {
      // The floor limits the crew: one person per so many square metres of free floor
      // (PIOTR; CLAUDE.md T13 3.10).
      blockReason = crewLine(state);
    } else if (missing.length > 0) {
```

new:

```ts
    } else if (crewFull(state, spec.role)) {
      // The floor limits the crew: one person per so many square metres of free floor
      // (PIOTR; CLAUDE.md T13 3.10).
      blockReason = crewLine(state);
    } else if (state.workers.length >= CANTEEN_LOCKERS) {
      // And so does the canteen: it was built with eight compartments, every man on the books
      // keeps his things in one of them, and the owner needs none. This comes before the
      // shortfall below, because a ninth locker cannot be bought either and "Buy first: Locker"
      // would send the player to a greyed line (PIOTR, 20.09; CLAUDE.md T23 2.10).
      blockReason = 'No locker for him: the canteen holds eight';
    } else if (missing.length > 0) {
```

It was put there deliberately and not beside the bench slot line above it, because **B2 is
editing that bench slot line for 2.17**. The ordering that matters is only that it comes before
`missing`.

### 4.4 `src/ui/topbar.ts` (nobody's declared file)

Old:

```ts
  view: 'hall' | 'office' | 'sprites',
```

new:

```ts
  view: 'hall' | 'office' | 'canteen' | 'sprites',
```

The body of `renderTopbar` needed nothing: it already reads `view === 'hall' ? 'Office' : 'Hall'`
for the label and the same for `data-view`, so from inside the canteen the one button says Hall
and goes to the hall, which is what the office does.

### 4.5 `src/engine/types.ts` (nobody's declared file; 2.11's words)

Old:

```ts
  /** One per worker (workbench, locker, canteen seat, hand tool set). */
  perWorker: boolean;
```

new:

```ts
  /** One per worker (workbench, locker, hand tool set). The canteen seat was on that list
   *  until Turn 23 took the seat out of the game (CLAUDE.md T23 2.11). */
  perWorker: boolean;
```

### 4.6 `src/ui/styles.css` (contended: B1 and B2 may both add to it)

**No new token: no new colour, font, radius or shadow value.** The two new classes use
`var(--page)` for their ink, which is an existing root token, and take their two font sizes off
phase A's constants on the element, exactly as `.office-clock` does.

Three changes, all inside the office room block.

(a) The block's heading comment, old:

```css
/* --------------------------------------------------------------------------
   The office room (docs/art/SPRITES.md 8)
   -------------------------------------------------------------------------- */
```

new:

```css
/* --------------------------------------------------------------------------
   The rooms the player walks into (docs/art/SPRITES.md 8)

   The office was the only one until Turn 23, when the canteen became the second (CLAUDE.md T23
   2.9). Both are built by src/render/room.ts and both wear these classes: the family is named
   for the room that came first, and a second set of names for the same markup would be a second
   code path. What is the canteen's alone is at the end of the block.
   -------------------------------------------------------------------------- */
```

(b) The lit lockers get the same two rules the lit door has. Old:

```css
.office-stack .office-region[data-office="laptop"]:hover,
.office-stack[data-lit~="door"] .office-region[data-office="door"]:hover {
  background-image: none;
}
```

new:

```css
.office-stack .office-region[data-office="laptop"]:hover,
.office-stack[data-lit~="lockers"] .office-region[data-office="lockers"]:hover,
.office-stack[data-lit~="door"] .office-region[data-office="door"]:hover {
  background-image: none;
}
```

and old:

```css
.office-stack:has(.office-region[data-office="door"]:hover) .office-lit[data-lit="door"] {
  opacity: 1;
}
```

new:

```css
.office-stack:has(.office-region[data-office="door"]:hover) .office-lit[data-lit="door"],
.office-stack:has(.office-region[data-office="lockers"]:hover) .office-lit[data-lit="lockers"] {
  opacity: 1;
}
```

(c) Two new classes, inserted immediately **before** the comment
`/* The office layers are full width pictures, not sprites on a tile (CLAUDE.md T4 4). */`:

```css
/* The canteen's two live texts, in the blank areas its layers leave for them: the name on each of
   the eight locker door plates and the counter over the banks (CLAUDE.md T23 2.9). The art side
   painted the plates blank and measured them, so both sizes come in on the element off
   CANTEEN_PLATE_TEXT and CANTEEN_COUNTER_TEXT, exactly as the office's clock does. The ink is the
   page's own dark, which is what reads on a cream label and on the pale wall over the banks. */
.canteen-plate,
.canteen-counter {
  align-items: center;
  color: var(--page);
  display: flex;
  overflow: hidden;
  pointer-events: none;
  position: absolute;
  white-space: nowrap;
}

/* The plate is a label with a name on it, so the name sits in the middle of it. */
.canteen-plate {
  justify-content: center;
}

```

### 4.7 `src/ui/app.ts` (B3's file, but B1 is in it too for 2.13)

Six changes, each small.

1. The import, one line added above the office's:
   `import { canteenScene } from '../render/canteen';`
2. `Ui.view`, old:
   ```ts
     /** The sprite check is a page of its own, reached from the Menu (CLAUDE.md T3 3.6). */
     view: 'hall' | 'office' | 'sprites';
   ```
   new:
   ```ts
     /** The rooms the player walks into, and the sprite check, which is a page of its own reached
      *  from the Menu (CLAUDE.md T3 3.6). The canteen became the second room in Turn 23 (2.9). */
     view: 'hall' | 'office' | 'canteen' | 'sprites';
   ```
3. `sceneFor`, old last line `return officeScene(current, officeViewport());`, new:
   ```ts
     if (ui.view === 'canteen') return canteenScene(current, roomViewport());
     return officeScene(current, roomViewport());
   ```
4. `officeViewport` renamed to `roomViewport` (its two doc comments say "a room view" and "the
   office or the canteen" instead of "the office"). It has exactly one other caller, which is
   point 3. Nothing else reads it.
5. The `officeRegion` case, a second early branch after the door's:
   ```ts
         // The lockers are the men's, one each, so they open the page the men are on
         // (PIOTR, 20.09; CLAUDE.md T23 2.9).
         if (region === 'lockers') {
           openLaptopPage('team');
           break;
         }
   ```
6. `walkTo` takes `'hall' | 'office' | 'canteen'`, and `handleRoomClick`, old:
   ```ts
   function handleRoomClick(room: RoomId): void {
     if (room === 'office') {
       walkTo('office');
     } else if (room === 'wc') {
       setNote(roomById('wc').tooltip);
     } else {
       setNote(roomById('canteen').tooltip);
     }
     requestRender();
   }
   ```
   new:
   ```ts
   function handleRoomClick(room: RoomId): void {
     if (room === 'office') {
       walkTo('office');
     } else if (room === 'canteen') {
       walkTo('canteen');
     } else {
       setNote(roomById('wc').tooltip);
     }
     requestRender();
   }
   ```

### 4.8 Tests changed, not added

- `tests/ui/hallRooms.test.ts`: `opens the canteen, not the office, where the canteen is painted`
  becomes `walks into the canteen, ...` and asserts the room instead of the note.
  `leaves the floor alone` used the canteen's note as the thing a floor click must not clear;
  the canteen has no note any more, so it asks with the **WC**, which is the last room that is
  still a line under the hall, and aims at `frontFaceAboveTheDoor('wc')` rather than
  `frontFaceCentre('wc')`. That is not a fudge: the office block is painted in front of the
  middle of the WC's face (`src/render/hall.ts` says so in its own comment), so the middle of the
  WC's face resolves to the office and always did.
- `tests/ui/hallZoom.test.ts`: `resolves to the same room at 2x as at the fit` now walks into the
  canteen, comes back through the top bar and re-zooms between the two clicks, and asserts
  `[data-room-view="canteen"]` instead of the note. Its now unused local `notes()` helper is
  deleted.

### 4.9 A stale comment B3 did **not** fix, for the lead or phase C

`src/render/hall.ts` still says, in three places, "a seat and a locker" about the welfare kit and
"the canteen door is a door and the block behind it is still the way to the canteen's own note":

- line ~358, the `roomDoor` comment: "the canteen door is a door and the block behind it is still
  the way to the canteen's own note, and giving it the control's hook would have taken that click
  away from it". The behaviour is still right (the block is the way in, and the door has no hook
  of its own), but the words say "note" where it is now "room".
- lines ~748, ~1462, ~1529, the welfare kit comments, say "a seat and a locker" where there is
  only a locker.

`src/engine/layout.ts` (~50, ~125), `src/engine/stations.ts` (~433), `src/engine/game.ts`
(~1213), `src/engine/machines.ts` (~725) and `src/engine/constants.ts` (~1147, ~2493) say the
same thing. None of them changes behaviour and every one of them is in a file B1, B2 or phase A
owns, so B3 left them. They are one word each.

---

## 5. What the tests cover

New files:

- `tests/render/canteenRoom.test.ts` (16): the canvas and the scale; `data-room-view`; the five
  layers in order with the lit bank between the bank and the table; a placeholder for a layer
  taken out of the list; nothing but placeholders before any art; the four regions, two buttons
  and two quiet; every region at the art side's measurement; the label pills; the eight plates at
  their rectangles, blank in a new shop; the names in the order the lockers were bought; an empty
  compartment and a man with no locker; a name cut to eight; the counter's words, box and hand;
  the counter and the plates agreeing; and the scene key, which a new man does not rebuild.
- `tests/ui/canteenRegions.test.ts` (5): the block on the hall opens the room; the door goes back
  to the hall; the lockers open the laptop's team page and the room is still behind it; the
  kitchenette and the table do nothing; the top bar has one button and it says Hall.
- `tests/engine/eightLockers.test.ts` (8): `CANTEEN_LOCKERS` is the plates' own length and is 8;
  the ninth locker refused and the eighth not; the ninth man refused with the words and the
  eighth not; every line of the hire card refused for the same reason; the owner not counted; and
  the canteen named rather than the shopping list.
- `tests/ui/eightLockersLine.test.ts` (3): the eighth locker has a Buy button, the ninth is
  `.is-locked` with the sentence in its `.lock` line and in the disabled button's title.
- `tests/ui/noCanteenSeat.test.ts` (6): no seat on any catalogue tab, on the Owned tab or on the
  shopping list; the joiner's prerequisites; the words at the top of `staff.ts`; and the id gone
  from every file of `src/engine`, `src/render` and `src/ui` but `migrate.ts`.

## 5a. One tidy-up folded into the last commit

`canteenLockersInUse` was written in `src/render/canteen.ts` for T23-B3a and nothing ever called
it: the counter takes its figure from `canteenPlateNames` so that it and the plates cannot
disagree. It was deleted with T23-B3c rather than left as a dead export.

## 6. One thing the lead should know about the eight

The floor limit gets to the men on the floor long before the canteen does. The hall is 200 m2 at
`M2_PER_PERSON` 24, which is eight people counting the owner with an empty floor, and the benches
and cabinets a crew wants eat into it: measured on the very easy game with a bench, a set and a
locker bought per man, the gate refuses the sixth joiner with `Crew 6 / 6, floor limited`.

So the canteen's eight only bites for a crew that includes office staff, who are not floor
limited. That is not a contradiction with the brief, which makes the lockers the cap on the crew
and says nothing about which cap is reached first, and it is why
`tests/engine/eightLockers.test.ts` reaches nine on the books with office admins through the
gate itself rather than by writing men into the state. It is worth Piotr knowing that today the
floor, and not the canteen, is what stops him hiring his sixth joiner.
