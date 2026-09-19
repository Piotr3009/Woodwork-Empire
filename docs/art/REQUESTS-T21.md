# Art and recordings requested after Turn 21

The shape `docs/art/REQUESTS-T20.md` left. Section 9 of the Turn 21 brief asks for two sheets and
nothing else: the bubbles of 2.6 are vector, drawn by the game, and want no art at all.
`docs/art/SPRITES.md` itself is not touched by this turn.

## 1. What Piotr delivered between the turns

Read off `public/sprites/manifest.json` as it stands, so the list below asks for nothing that is
already in. Landed since Turn 20 closed:

- `spindleMoulder` in all five classes (`budget`, `used`, `standard`, `pro`, `industrial`), which
  closes the oldest placeholder family of `docs/art/REQUESTS-T13.md` 1.
- `toolCabinet.standard` and, the first of its kind in the game, a second orientation beside it:
  `toolCabinet.standard.r`. The loader takes it with no code change, exactly as
  `docs/art/SPRITES.md` 3 and CLAUDE.md T10 3.8 said it would; `tests/engine/rotate.test.ts` now
  asserts that the cabinet is drawn turned and not mirrored, and that every other class still
  mirrors. **Both files want redrawing at the two cell canvas: see section 2 below.**
- The nine pipe tiles (`pipe.ns`, `pipe.ew`, `pipe.ne`, `pipe.nw`, `pipe.se`, `pipe.sw`,
  `pipe.tee`, `pipe.inlet`, `pipe.drop`) and `gate.collar`, which closes
  `docs/art/REQUESTS-T13.md` 2.

## 2. The tool cabinet, at the size the spec now says

The one thing this turn asks the art side for that is not a character sheet, and it comes out of
2.13. The picture Piotr delivered on 19.09 is plainly a **two metre** cabinet: drawers, two doors
and a bench top over them. The spec said one metre square, which is why it looked wrong in the hall,
and Turn 21 made the spec follow the picture (`width 2, depth 1, height 1`).

The file, though, was exported on the **one cell** canvas. Measured off the PNG headers:

| File | Delivered | Wanted for a 2 by 1 by 1 |
|---|---|---|
| `toolCabinet.standard.png` | 112 by 112 | **160 by 136** |
| `toolCabinet.standard.r.png` | 112 by 112 | **160 by 136** |

160 by 136 is the contract size of `docs/art/SPRITES.md` 2 and 6 for a two by one by one, and it is
what `spindleMoulder.standard.png` is already drawn at, so there is a delivered file to measure
against. Until the two land at that size the hall draws the cabinet from a one cell picture on a two
cell footprint. `tests/render/spriteClasses.test.ts` asserts the mismatch and the owed size by name,
so the day the redrawn files arrive that test fails and its entry is deleted.

## 3. The character sheets still wanted

Same pipeline and same contract as the joiner's and the helper's sheets
(`docs/art/SPRITES.md` 10): the sheet at 2x, one row per direction (sw, se, nw, ne), one column
per frame, the anchor at the projected ground origin, a JSON of the numbers beside the PNG.

- **The sprayer's four sheets**, from the owner's model with a white shirt:
  `character.sprayer.idle` (2 frames), `character.sprayer.walk` (8), `character.sprayer.bench`
  (8), `character.sprayer.carry` (8), all four rows. Until they land he is drawn by the capsule,
  which is what the player sees today.
- **The helper's bench sheet**, `character.helper.bench` (8 frames, all four rows): the helper at
  a bench, on the joiner's bench contract, in his yellow shirt. He has walk, idle, carry and
  sweep from the v28 pack and falls back at a bench, which is the one gap left in him.

## 4. Nothing for the bubbles

The speech bubbles of CLAUDE.md T21 2.6 are drawn by the game as SVG in the hall's live layer:
the paper `--cream`, the ink of the border, the title hand, and the tail under the box. There is
no PNG to draw and none is wanted. The words are one table, `BUBBLES` in
`src/engine/constants.ts`, so a word Piotr wants changed is a line there and not a repaint.

## 5. Still outstanding from earlier turns

- **The welfare kit inside the canteen**, as `docs/art/REQUESTS-T17.md` 2 asks. It matters more
  after tonight: T21 2.12 walks the whole crew through the canteen door at the break, so the room
  behind it is now somewhere the player knows people are.
- **The painted door leaves** of `docs/art/REQUESTS-T19.md` 3, closed state only:
  `door.office.closed` and `door.canteen.closed`. The half and open frames are not wanted.
- **Roles without sheets**: the office admin, the purchasing clerk, the draftsman, the salesman,
  the estimator and the production manager still fall back to the capsule
  (`docs/art/REQUESTS-T13.md` 5 stands). After tonight they are off the hall while they work
  (T21 2.11), so the capsule is seen less often, not more.
- **The thicknesser** has no sprite, so its Machines page row draws the Turn 19 placeholder.

## 6. The recordings

Unchanged from `docs/art/REQUESTS-T20.md` 1, and not one of the seven has landed. The hall is
silent, `play` and `loop` do nothing while the named file is missing, and this turn adds no sound
of any kind (CLAUDE.md T21 section 6). The door is still the one to record first.
