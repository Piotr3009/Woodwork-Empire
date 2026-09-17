# Art and recordings requested after Turn 19

Two lists. The first is for Piotr, in his own workshop, with a phone: the sounds the engine is
built around. The second is the art still outstanding, for GPT, on `art/sprites`, PNG in
`public/sprites/`, everything in the hall's 2:1 dimetric as `docs/art/SPRITES.md` 9.1 asks.
`docs/art/SPRITES.md` itself is not touched by this turn.

## 1. The recordings (PIOTR, CLAUDE.md T19 section 9)

Mono, 44.1 kHz, `.ogg` (or `.m4a`), in `public/sounds/`, named exactly:

- `door.ogg`: an internal door opened and closed, two seconds, the open first.
- `tableSaw.ogg`: the saw cutting a sheet, ten seconds of steady cut, loopable (no start, no
  stop; the engine loops it).
- `extractor.ogg`: the extraction running, ten seconds, loopable.
- `hammer.ogg`: three knocks of a hammer on a carcass, one second.
- `drill.ogg`: a cordless drill driving one screw, one second.
- `sander.ogg`: hand sanding a panel, five seconds, loopable.
- `sprayBooth.ogg`: the spray gun on a panel, five seconds, loopable.

Record with the phone a metre from the tool, in the empty hall, nothing else running. The engine
picks each file the moment it is there; until then it plays a quiet synthesised stand in, so
every hook can already be heard in the build. No code change is needed when a file lands: the
sound engine looks for `public/sounds/<name>.ogg` first and falls back to the stand in.

## 2. The sprayer's character sheet

A new role stands in the hall from tonight: `sprayer`. Wanted, from the owner's model with a
white shirt, the same pipeline and the same contract as the joiner's sheets
(`docs/art/SPRITES.md` 10):

- `character.sprayer.idle` (2 frames), `character.sprayer.walk` (8), `character.sprayer.bench`
  (8), `character.sprayer.carry` (8), all four rows (sw, se, nw, ne).

Until the files land the sprayer is drawn by the capsule, in his own colour, which is what the
player sees today. The moment the files are in `public/sprites/` the loader picks them up like
every other sheet; no code change is needed.

## 3. The doors

The office door and the canteen door are drawn tonight by a vector on the door control, in three
states (closed, half, open: a leaf swung on its hinge with the dark opening behind it). A painted
door leaf per room, on the room's own front face and registered to the room block, would replace
the vector tile for tile:

- `door.office.closed`, `door.office.half`, `door.office.open`
- `door.canteen.closed`, `door.canteen.half`, `door.canteen.open`

Not urgent: the vector reads at this size and Piotr accepted it for the turn.

## 4. Still outstanding from earlier turns

- **The helper's character sheet** (`character.helper.*`, yellow shirt), as
  `docs/art/REQUESTS-T17.md` 1 asks. He is on the hall floor all day and he now cleans the hall
  without being asked, so he is the one worth drawing first.
- **The welfare kit inside the canteen**, as `docs/art/REQUESTS-T17.md` 2 asks.
- **The pipe tiles** of `docs/art/REQUESTS-T13.md` 1 and 2.
- **Roles without sheets**: the office admin, the purchasing clerk, the draftsman, the salesman,
  the estimator and the production manager still fall back to the capsule
  (`docs/art/REQUESTS-T13.md` 5 stands).
