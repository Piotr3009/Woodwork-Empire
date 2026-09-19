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

**T22-A2 Phase A.** Section 3's list in one commit. `STATE_VERSION` 19 with `liftToVersion19`;
`src/engine/ports.ts` with the eighteen measured lines of 2.8 and the pure questions asked of them;
`portCell` reading the table, so the routing of Turn 13 starts where the drawing starts;
`item.orientation` in place of `item.rotated` on every placed item, every reservation, every moved
item and every signature that carried it, in twelve source files and eight test files;
`DUCT_HEIGHT` 3 to 3.2; `PIPE_RIM`, `PIPE_BODY`, `PIPE_SHADE`, `PIPE_LIGHT` and `HOSE_COLOUR` in
the constants, with the Turn 16 purple out of `src/ui/styles.css` and the four greys written onto
the strokes instead; the nine `pipe.*.png` deleted and `npm run sprites:manifest` run (84 sprites,
no pipe entry); and `fx-breathe` gated on a measured port, so no extractor breathes under a pipe.
It also did four things section 3 does not list, each to leave the tree green in one commit, and
each written up in section 0 below: it carried the rename to the point of compiling; it added an
`other` ledger category for the lift's own line, because there was no line for it and the word
`arrears` is going; it made the v19 lift zero the three arrears fields rather than delete them,
which is where B1's 2.1 takes over; and it split one claim of the three month playthrough, which
had been passing on one day of luck since Turn 21.
