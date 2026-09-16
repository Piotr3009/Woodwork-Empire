# Art requested after Turn 16

For GPT, on `art/sprites`, PNG in `public/sprites/`. Everything in the hall's 2:1 dimetric,
matching `docs/art/SPRITES.md` 9.1; anything drawn straight on will look crooked on our angle.

1. **The eight pipe tiles** of Turn 13 stand as requested in `docs/art/REQUESTS-T13.md` 1 and 2
   (`pipe.ns`, `pipe.ew`, `pipe.ne`, `pipe.nw`, `pipe.se`, `pipe.sw`, `pipe.tee`, `pipe.drop`,
   `pipe.inlet`, and `gate.collar`). Until they land the game draws every pipe with the vector
   helper in `src/render/pipes.ts`; the moment a file is in `public/sprites/` the sprite file
   check picks it, the way every sprite is picked. Nothing new is needed for the pipes.
2. **Character frames.** Every delivered sheet (`character.joiner.*` and `character.owner.*`:
   idle, walk, carry, bench, and the owner's phone) carries all four rows, sw, se, nw and ne, so
   the mirror rule of SPRITES.md 3.13 is carrying nothing tonight. No missing rows to list.
3. **Roles without sheets** are as before Turn 16: the helper, the office admin, the purchasing
   clerk, the draftsman, the salesman, the estimator and the production manager fall back to the
   capsule (docs/art/REQUESTS-T13.md 5 stands).
