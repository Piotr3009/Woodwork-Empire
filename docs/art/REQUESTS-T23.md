# Art and recordings requested after Turn 23

The shape `docs/art/REQUESTS-T22.md` left. Section 9 of the Turn 23 brief asks for **no new pack at
all**: the canteen room's five layers landed on 20.09 and are in the repo, so everything on this
page is either a note about what landed or a backlog item an earlier turn is still owed.
`docs/art/SPRITES.md` itself is not touched by this turn, and neither is any sprite file but
`drill.png` and `handToolSet.png`, which this turn **deletes** and nobody is to redraw
(CLAUDE.md T23 2.5, 2.6, section 6).

## 1. What Piotr delivered between the turns, and what Turn 23 did with it

Read off `public/sprites/manifest.json` as it stands, so the list below asks for nothing that is
already in. Landed since Turn 22 closed:

- **The canteen room, five layers**, each 1672 by 941 on the office room's own contract
  (`docs/art/SPRITES.md` 8): `canteenBackground.png` (the room, RGB opaque),
  `canteenKitchen.png` (the kitchenette), `canteenLockers.png` (two banks of four, eight closed
  doors with a blank plate on each), `canteenTable.png` (the table and two stools) and
  `canteenLockersLit.png` (layer three painted as if lit, for hover). CLAUDE.md T23 2.9 is built
  on them: a click on the canteen block on the hall now opens the room the way the office door
  opens the office, and the game prints the live text over the layers.
- **`docs/mockups/t23/canteen-regions.json`**, the art side's own measurement of its layers in
  canvas pixels: the door, the lockers, the kitchen, the table, the eight plate rectangles in
  reading order and the counter rectangle. It is copied figure for figure into `CANTEEN_REGIONS`,
  `CANTEEN_PLATES` and `CANTEEN_COUNTER` in `src/engine/constants.ts`, which is the only place
  those numbers live.
- **`docs/mockups/t23/canteen-room-delivered.png`**, the five layers composited for review, and
  **`docs/mockups/t23/canteen-view-concept.png`**, the concept Piotr approved on 20.09.

## 2. Nothing asked of the art side for the canteen tonight

The room draws from the first morning. One thing is worth Piotr's eye for a later pack and is
**his call, not a request this turn makes**: on `canteen-room-delivered.png` the two locker banks
and the table read as pasted against the room's own vanishing lines. A perspective pass on
`canteenLockers.png`, `canteenLockersLit.png` and `canteenTable.png`, aligned to the background's
horizon, would settle it. Nothing in the game changes when those files are replaced: the layers
are keyed by name and the regions live in the JSON above.

The office's flat placeholder stays the rule for any layer that is ever missing (CLAUDE.md T7 3.8),
so a file can be pulled and redelivered at any time without a line of code moving.

## 3. Two pictures this turn deletes, and nobody redraws

- **`drill.png`**. The cordless drill is out of the game (CLAUDE.md T23 2.5): no spec, no
  catalogue line, no placement, no picture. A save that holds one loses it with a ledger line and
  no refund.
- **`handToolSet.png`**. A hand tool set is still bought, one a man and one for the owner, and it
  still takes a cabinet slot, but from this turn it is **not a thing on the hall** (CLAUDE.md T23
  2.6): it lives in the cabinet, which has its own picture, and it has no cell, no slot on the
  floor and no placeholder of its own.

Neither is to be redrawn.

## 4. The extractors turned, still owed from Turn 22

Unchanged from `docs/art/REQUESTS-T22.md` 2, and not one of the fifteen files has landed. For each
of `extractor.used`, `extractor.budget`, `extractor.standard`, `extractor.pro` and
`extractor.industrial`: `.r.png` (a true quarter turn clockwise, not a mirror), `.rr.png` (the back
of the unit) and `.rrr.png` (three quarter turns), on the canvas the turned footprint dictates,
with the anchor at `8 + w x 48` from the left edge and 8 px above the bottom for that orientation's
width. Until they land the five extractors turn between 0 and 1 like everything else, which is
where CLAUDE.md T23 section 8 parks them. Each new file also wants its own `px`, `py` and `faces`
in `PORTS`, measured by Claude off the delivered picture and not by the art side.

## 5. The two port sheets Piotr has not confirmed

Unchanged from `docs/art/REQUESTS-T22.md` 3. The five spindle moulders and the three edgebanders
with an extraction demand are Claude's own measurements and are tagged `[TUNE]` in
`src/engine/ports.ts` until Piotr says otherwise. Nothing this turn moved them:
`src/engine/ports.ts` is parked in CLAUDE.md T23 section 8 until something draws it again.

## 6. Still outstanding from earlier turns

- **The sprayer's four sheets**, from the owner's model with a white shirt:
  `character.sprayer.idle` (2 frames), `character.sprayer.walk` (8), `character.sprayer.bench`
  (8), `character.sprayer.carry` (8), all four rows (sw, se, nw, ne). Until they land he is drawn
  by the capsule, which is what the player sees today.
- **The helper's bench sheet**, `character.helper.bench` (8 frames, all four rows): the helper at
  a bench, on the joiner's bench contract, in his yellow shirt. He has walk, idle, carry and sweep
  from the v28 pack and falls back at a bench, which is the one gap left in him.
- **The painted door leaves** of `docs/art/REQUESTS-T19.md` 3, closed state only:
  `door.office.closed` and `door.canteen.closed`. The half and open frames are not wanted.
- **Roles without sheets**: the office admin, the purchasing clerk, the draftsman, the salesman,
  the estimator and the production manager still fall back to the capsule
  (`docs/art/REQUESTS-T13.md` 5 stands). The production manager is a ladder of four grades from
  this turn (CLAUDE.md T23 2.4) and one sheet would serve all four, because a grade is a chip on
  his card and not a different man.
- **The thicknesser** has no sprite, so its Machines page row draws the Turn 19 placeholder. It has
  an extraction demand and no picture, so it has no `PORTS` line either, and it wants both.
- **The welfare kit inside the canteen** of `docs/art/REQUESTS-T17.md` 2 is **closed**: the canteen
  is a room with its own table, its own two stools and its own eight lockers now, and the seat a
  player used to buy is deleted (CLAUDE.md T23 2.11). Nothing is drawn on the hall for welfare any
  more.

## 7. The recordings

Unchanged from `docs/art/REQUESTS-T20.md` 1, and not one of the seven has landed. The hall is
silent, `play` and `loop` do nothing while the named file is missing, and this turn adds no sound
of any kind (CLAUDE.md T23 section 6). The door is still the one to record first.
