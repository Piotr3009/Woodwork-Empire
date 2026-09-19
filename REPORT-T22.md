# Report, Turn 22: a bank that means it, pipes that join, a hall you can turn

Woodwork Empire, Turn 22. Built against `CLAUDE.md` of 19.09.2026 (first line "Turn 22").
Branch `claude/turn-22-session-thklml`, off `17903f0`, the tree this turn opened on.
`APP_VERSION` v31 to v32, `STATE_VERSION` 18 to 19.

Two lines a task, in the order of section 5, each with the commit it sits in. The sections below
are filled in as the turn runs; the blockers, the cross check, the pictures and the numbers chosen
come at the end.

## The tasks

**T22-A1 Housekeeping and v32.** The Turn 21 brief archived byte for byte from the Turn 21 merge
commit (`git show 60b6f56:CLAUDE.md`, 18,243 bytes, `diff` silent), the README's two lists brought
up to date, `APP_VERSION` `'v31'` to `'v32'` with its two tests, and `docs/art/REQUESTS-T22.md`
written from section 9.
One baseline red was fixed with it and it was not this turn's doing, exactly as Turn 21's own T21-A1
recorded of its own: `tests/engine/rotate.test.ts` asserted that `toolCabinet.standard.r.png` was
the only turned file in the game, and Piotr's own commit `17903f0` delivered the other four classes'
`.r` files (and their `.rr` and `.rrr`) between the turns. The test now asserts what the loader
always promised, for all five classes: a cabinet turned is drawn from its own file and never
mirrored, and every other class still mirrors. Without this the turn had no green check to build on.
