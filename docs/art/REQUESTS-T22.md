# Art and recordings requested after Turn 22

The shape `docs/art/REQUESTS-T21.md` left. Section 9 of the Turn 22 brief asks for one pack and
nothing else: the extractors turned, in three new orientations each. Everything else on this page
is what earlier turns are still owed. `docs/art/SPRITES.md` itself is not touched by this turn, and
neither is any sprite file but the nine `pipe.*.png`, which this turn **deletes** and nobody is to
redraw (CLAUDE.md T22 2.7, section 6).

## 1. What Piotr delivered between the turns, and what Turn 22 did with it

Read off `public/sprites/manifest.json` as it stands, so the list below asks for nothing that is
already in. Landed since Turn 21 closed:

- **The tool cabinet's five classes, each in four orientations**: `toolCabinet.<class>.png`,
  `.r.png`, `.rr.png` and `.rrr.png` for `used`, `budget`, `standard`, `pro` and `industrial`.
  Twenty files, each turned file a true quarter turn and not a mirror. This is the first family in
  the game that can be stood against any of the four walls, and CLAUDE.md T22 2.11 and 2.12 are
  built on it: the cabinet is a class ladder of five now, and Rotate cycles `0, 1, 2, 3` on it
  where everything else still cycles `0, 1`.
- **`toolCabinet.standard.png` and `.r.png` redrawn at 160 by 136**, which closed section 2 of
  `docs/art/REQUESTS-T21.md`. The other four classes arrived on their own canvases and the ladder
  of T22 2.12 takes them at those sizes: used and budget 112 by 112 (1 by 1 by 1), standard
  160 by 136 (2 by 1 by 1), pro 160 by 175 (2 by 1 by 1.8), industrial 208 by 208 (3 by 1 by 2).

## 2. The extractors turned, five classes, three orientations each

The one thing this turn asks for. It comes out of CLAUDE.md T22 2.11: `orientation` is `0 | 1 | 2 | 3`
now and Rotate cycles only through the orientations that have a picture, so that no wrong picture
ever stands on the hall. The five extractors turn between 0 and 1 tonight, like everything else,
and the day these files land they turn four ways with no code change at all, exactly as the tool
cabinet does.

For each of `extractor.used`, `extractor.budget`, `extractor.standard`, `extractor.pro` and
`extractor.industrial`, three files beside the one already delivered:

| File | What it is |
|---|---|
| `extractor.<class>.r.png` | a true quarter turn clockwise, not a mirror |
| `extractor.<class>.rr.png` | the back of the unit, half a turn |
| `extractor.<class>.rrr.png` | three quarter turns |

Same pipeline and same contract as the tool cabinet pack of 19.09:

- 2x art, 8 px of transparent padding on every side, no baked shadow
  (`docs/art/SPRITES.md` 2 and 6).
- **The canvas is the one the turned footprint dictates.** A quarter turn swaps the width and the
  depth, so a 1 by 3 extractor turned is 3 by 1 and its canvas is the canvas of a 3 by 1. The
  `.rr` file is the same canvas as the base file, because half a turn swaps nothing. The Sprite
  check page prints the owed canvas for every file the game can ask for, and it is the page to
  check a delivery against.
- The anchor where `spriteAnchorIn` reads it: `8 + w x 48` from the left edge of the file and 8 px
  above the bottom, for **that orientation's** width, which is the corner the pack's
  `projection.json` names.

**And with each file, the inlet's numbers.** `PORTS` in `src/engine/ports.ts` is keyed by file
name, one line per picture (CLAUDE.md T22 2.8), so every new file wants its own `px`, `py` and
`faces`. **Claude reads those off the picture in chat, not the art side**: the art side delivers the
PNG and Claude measures the mouth on it, the way the sheets of `docs/mockups/t22/ports-extractors.png`
were measured on 19.09. Until a file has a line, the Sprite check page prints `no port data` in red
beside it and the pipe falls back to the footprint's first cell with no elbow, which is visible and
wrong rather than quietly wrong.

## 3. The two port sheets Piotr has not confirmed

`docs/mockups/t22/ports-saws.png` and `docs/mockups/t22/ports-extractors.png` are approved
(PIOTR, 19.09: "all the dots are fine"). Two families in the `PORTS` table are Claude's own
measurements and are tagged `[TUNE]` in `src/engine/ports.ts` until Piotr says otherwise:

- **The five spindle moulders**, measured off `docs/mockups/t22/ports-spindle-moulders.png`: the
  hood on the guard, `px, py` of 107/28, 95/40, 92/24, 151/67 and 106/65.
- **The three edgebanders with an extraction demand** (`standard`, `pro`, `industrial`), measured
  the same way and with no sheet of their own yet: 104/70, 117/95 and 122/97. The used and the
  budget edgebanders are hand tools, want no extraction at all and have no line.

The pictures of T22-C4 are where he confirms them: the standard saw with its hidden drop and the
standard extractor with the elbow into its mouth are two of the thirteen.

## 4. Nothing for the pipes, ever again

The nine `pipe.*.png` tiles Piotr delivered for Turn 16 are **deleted** by this turn and are not to
be redrawn. Piotr's screenshot of 19.09 showed them not meeting each other, and the answer is not
better tiles: a run is one continuous SVG path now, drawn by `src/render/pipes.ts` in four grey
tokens with the quadratic bend of Turn 17 at every corner, so every joint is exact by construction
(CLAUDE.md T22 2.7, `docs/mockups/t22/pipes-A-one-path.png`, variant A). `gate.collar.png` stays
and is still the gate's own picture.

The hose from a visible port to the run is drawn the same way, in `HOSE_COLOUR`, and wants no art
either.

## 5. Nothing for the mark over the head

The mark of CLAUDE.md T22 2.5 is a 14 px disc with an exclamation in it, drawn by the game in the
hall's live layer, and the one line of words that comes up on hover is the Turn 21 paper bubble.
There is no PNG to draw and none is wanted. The words are one table, `BUBBLES` in
`src/engine/constants.ts`, so a word Piotr wants changed is a line there and not a repaint.

## 6. Still outstanding from earlier turns

- **The sprayer's four sheets**, from the owner's model with a white shirt:
  `character.sprayer.idle` (2 frames), `character.sprayer.walk` (8), `character.sprayer.bench`
  (8), `character.sprayer.carry` (8), all four rows (sw, se, nw, ne). Until they land he is drawn
  by the capsule, which is what the player sees today.
- **The helper's bench sheet**, `character.helper.bench` (8 frames, all four rows): the helper at
  a bench, on the joiner's bench contract, in his yellow shirt. He has walk, idle, carry and sweep
  from the v28 pack and falls back at a bench, which is the one gap left in him.
- **The welfare kit inside the canteen**, as `docs/art/REQUESTS-T17.md` 2 asks.
- **The painted door leaves** of `docs/art/REQUESTS-T19.md` 3, closed state only:
  `door.office.closed` and `door.canteen.closed`. The half and open frames are not wanted.
- **Roles without sheets**: the office admin, the purchasing clerk, the draftsman, the salesman,
  the estimator and the production manager still fall back to the capsule
  (`docs/art/REQUESTS-T13.md` 5 stands).
- **The thicknesser** has no sprite, so its Machines page row draws the Turn 19 placeholder. It has
  an extraction demand and no picture, so it has no `PORTS` line either, and it wants both.

## 7. The recordings

Unchanged from `docs/art/REQUESTS-T20.md` 1, and not one of the seven has landed. The hall is
silent, `play` and `loop` do nothing while the named file is missing, and this turn adds no sound
of any kind (CLAUDE.md T22 section 6). The door is still the one to record first.
