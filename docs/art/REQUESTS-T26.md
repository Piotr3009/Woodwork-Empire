# Art and recordings requested after Turn 26

The shape `docs/art/REQUESTS-T25.md` left. Section 9 of the Turn 26 brief asks for **nothing new**
and takes one thing off the list: the hall's changes (a machine drawing as many men as it keeps
busy, a cell of his own for every man, the walk between the machines and the depth order) are
rules of the engine and the renderer, and the agency's card reuses the software card, so no
picture is wanted and no sprite is touched (CLAUDE.md T26 section 6).

Everything below is read off `public/sprites` and `public/sounds` as they stand on this branch, so
nothing is asked for twice.

## 1. The sprayer's four sheets: no longer wanted

There is no sprayer from Turn 26: the joiner does everything physical, the booth included
(CLAUDE.md T26 2.6). `character.sprayer.idle`, `.walk`, `.bench` and `.carry` were never
delivered and are not to be made.

## 2. The labourer's bench sheet

`character.helper.bench` (8 frames, all four rows): the labourer at a bench, on the joiner's bench
contract, in his yellow shirt. The player reads `labourer` from Turn 26 (CLAUDE.md T26 2.7); the
sheets keep the name `helper` the art side's files already carry, so the file name is unchanged.
He has walk, idle, carry and sweep, and falls back at a bench, which is the one gap left in him.

## 3. The backs of every floor family

The `.rr` and `.rrr` quarter turns, true turns and not mirrors, on the canvas the turned footprint
dictates. Only the tool cabinet has them (`toolCabinet.<class>.rr.png` and `.rrr.png`, all five
classes). The table saw, the spindle moulder, the edgebander, the thicknesser, the CNC and its
tool changer, the spray booth, the bench, the rack, the compressor and the five extractors have
their front and their `.r` turn and nothing further. Until they land each family turns between 0
and 1 as it does today.

## 4. The seven recordings

Unchanged from `docs/art/REQUESTS-T20.md` 1; `public/sounds` holds its README alone. The hall is
silent, and this turn adds no sound of any kind. The door is still the one to record first.
