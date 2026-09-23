# Art and recordings requested after Turn 25

The shape `docs/art/REQUESTS-T23.md` left. Section 9 of the Turn 25 brief asks for **nothing new**:
the places at the machines are a rule of the engine and the lines that say them sit on cards,
tiles and plates that already exist, so no picture is wanted for them and no sprite is touched
(CLAUDE.md T25 section 6). Turn 24 wrote no requests file of its own; what it listed as landed
(the house pictures of v48, the thicknessers, the van, the forklift, the pallet truck and the hand
tool set of v49) is in `public/sprites` and owes nothing.

Everything below is the backlog an earlier turn is still owed, read off `public/sprites` as it
stands on this branch, so nothing is asked for twice.

## 1. The sprayer's four sheets

From the owner's model with a white shirt: `character.sprayer.idle` (2 frames),
`character.sprayer.walk` (8), `character.sprayer.bench` (8), `character.sprayer.carry` (8), all
four rows (sw, se, nw, ne). None has landed; until they do he is drawn by the capsule.

## 2. The helper's bench sheet

`character.helper.bench` (8 frames, all four rows): the helper at a bench, on the joiner's bench
contract, in his yellow shirt. He has walk, idle, carry and sweep, and falls back at a bench,
which is the one gap left in him.

## 3. The backs of every floor family

The `.rr` and `.rrr` quarter turns (the back of the unit, and three quarter turns), true turns and
not mirrors, on the canvas the turned footprint dictates. Only the tool cabinet has them today
(`toolCabinet.<class>.rr.png` and `.rrr.png` for all five classes). Every other floor family has
its front and its `.r` turn and nothing further: the table saw, the spindle moulder, the
edgebander, the thicknesser, the CNC, the spray booth, the bench, the rack, the compressor and the
five extractors of `docs/art/REQUESTS-T22.md` 2 (whose `.r` has landed, so what is owed of them is
the `.rr` and the `.rrr`). Until they land each family turns between 0 and 1 as it does today.

## 4. The seven recordings

Unchanged from `docs/art/REQUESTS-T20.md` 1, and not one of the seven has landed (`public/sounds`
holds its README alone). The hall is silent, `play` and `loop` do nothing while the named file is
missing, and this turn adds no sound of any kind. The door is still the one to record first.
