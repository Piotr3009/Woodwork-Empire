# Art and recordings requested after Turn 20

Two lists, in the shape `docs/art/REQUESTS-T19.md` left. The first is for Piotr, in his own
workshop, with a phone: the sound files the game now waits for. The second is the art still
outstanding, for GPT, on `art/sprites`, PNG in `public/sprites/`, on the character sheet contract
of `docs/art/SPRITES.md` 10. `docs/art/SPRITES.md` itself is not touched by this turn.

## 1. The recordings (PIOTR, 18.09; CLAUDE.md T20 section 9)

Mono, 44.1 kHz, `.ogg`, in `public/sounds/`, named exactly:

- `door.ogg`: an internal door, open then close, two seconds.
- `tableSaw.ogg`: ten seconds of steady cut, loopable (no start, no stop; the engine loops it).
- `extractor.ogg`: ten seconds, loopable.
- `hammer.ogg`: three knocks.
- `drill.ogg`: one screw.
- `sander.ogg`: five seconds, loopable.
- `sprayBooth.ogg`: five seconds, loopable.

Record with the phone a metre from the tool, in the empty hall, nothing else running.

**What changed tonight.** Turn 19 played a synthesised stand in until a file landed. Piotr heard
them and said no: **no sound plays without a recorded file he has heard** (PIOTR, 18.09). So the
stand ins go, and the hall is silent until these files are in `public/sounds/`. Each one is
played to Piotr on a sample page before the game uses it. No code change is needed when a file
lands: the sound engine looks for `public/sounds/<name>.ogg` and stays silent when it is not
there.

## 2. The character sheets

Same pipeline and same contract as the joiner's and the helper's sheets
(`docs/art/SPRITES.md` 10): the sheet at 2x, one row per direction (sw, se, nw, ne), one column
per frame, the anchor at the projected ground origin, a JSON of the numbers beside the PNG.

- `character.helper.bench` (8 frames, all four rows): the helper at a bench, on the joiner's
  bench contract, in his yellow shirt. He has walk, idle, carry and sweep from the v28 pack and
  falls back at a bench, which is the one gap left in him.
- The sprayer's four sheets, from the owner's model with a white shirt:
  `character.sprayer.idle` (2 frames), `character.sprayer.walk` (8), `character.sprayer.bench`
  (8), `character.sprayer.carry` (8), all four rows. Until they land he is drawn by the capsule,
  which is what the player sees today.

## 3. Still outstanding from earlier turns

- **The welfare kit inside the canteen**, as `docs/art/REQUESTS-T17.md` 2 asks.
- **The pipe tiles** of `docs/art/REQUESTS-T13.md` 1 and 2.
- **The painted door leaves** of `docs/art/REQUESTS-T19.md` 3, now for the closed state only:
  Turn 20 draws a door closed and always closed, and a figure goes through it rather than
  standing in it (CLAUDE.md T20 2.12). So `door.office.closed` and `door.canteen.closed` are the
  two wanted; the half and open frames are not.
- **Roles without sheets**: the office admin, the purchasing clerk, the draftsman, the salesman,
  the estimator and the production manager still fall back to the capsule
  (`docs/art/REQUESTS-T13.md` 5 stands).
