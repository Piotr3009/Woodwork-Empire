# Art requested after Turn 17

For GPT, on `art/sprites`, PNG in `public/sprites/`. Everything in the hall's 2:1 dimetric,
matching `docs/art/SPRITES.md` 9.1; anything drawn straight on will look crooked on our angle.
`docs/art/SPRITES.md` itself is not touched by this turn: nothing here changes the contract, it
only lists what is still missing.

1. **A helper character sheet** (`character.helper.idle`, `character.helper.walk`,
   `character.helper.carry`, `character.helper.bench`), all four rows (sw, se, nw, ne) as
   SPRITES.md 3.13 asks, the yellow shirt of the hall's labourer. Until it lands the helper is
   drawn by the capsule, which Turn 17 made sure is a body and not a stroke
   (`src/render/characters.ts`, the placeholder path). The moment the files are in
   `public/sprites/` the sprite file check picks them, the way every sprite is picked; no code
   change is needed for it.
2. **The welfare kit inside the canteen.** From Turn 17 a canteen seat and a locker stand inside
   the canteen block and never on the hall floor, so what is wanted is either a top view through
   the canteen roof (`canteenSeat.inside`, `locker.inside`, drawn on the canteen's own cells) or
   a symbol on the block's front face. Until a file lands the seat and the locker are drawn by
   the one placeholder helper inside the canteen, which is what the player sees today.
3. **The pipe tiles** of Turn 13 stand as requested in `docs/art/REQUESTS-T13.md` 1 and 2
   (`pipe.ns`, `pipe.ew`, `pipe.ne`, `pipe.nw`, `pipe.se`, `pipe.sw`, `pipe.tee`, `pipe.drop`,
   `pipe.inlet`, and `gate.collar`). Turn 17 improved the vector helper that stands in for them
   (a wider bar with a darker underside, elbows on a quarter arc, a collar on the machine's top
   face, a flange at the inlet); the keys and the nine kinds are unchanged, so a delivered file
   still replaces the drawing tile for tile.
4. **Roles without sheets** after Turn 17: the office admin, the purchasing clerk, the draftsman,
   the salesman, the estimator and the production manager still fall back to the capsule
   (`docs/art/REQUESTS-T13.md` 5 stands). The helper is the one worth drawing first: he is the
   only one of them who is on the hall floor all day.
