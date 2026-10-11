# Report, Turn 30: the line bought whole, its windows contract, its upgrades and its moving pictures

Woodwork Empire, Turn 30. Built against `CLAUDE.md` of 11.10.2026 (first line "Turn 30").

## The tasks

**T30-A0 The suite on v88.** `npm run check` on v88 as it stood: lint and build clean, 2,770 of
2,771 tests in 290 files green. One red, `tests/ui/officeHover.test.ts` (`no pointer word in the
TypeScript of the views or the renderers`): two comments v87 wrote into `src/render/hall.ts` said
a machine's `hover`. A plain fault, mended by calling it the machine's `tooltip` in both comments;
no code changed. The check then passed on its own exit code, 2,771 tests in 290 files.

**T30-A1 Housekeeping and v89.** `CLAUDE.md` is this turn's brief (its first line says "Turn 30")
and `docs/turn-29-brief.md` was already in `docs/`, both put there by the ZIP. `APP_VERSION` is
`v89`, and its two pins are flipped (`tests/ui/saveCheck.test.ts`, `tests/ui/version.test.ts`, the
latter's `written in constants.ts and nowhere else` too); the state stays 42 until C1 lifts it.

**T30-A2 The mockups.** Seven pages of section 9 in `docs/mockups/t30/`, each the game's own markup
from engine states, beside the same screen today, shot in headless Chromium, with a README naming
which is which and every line written by hand: the Production line tab and the line's card in four
states with the four upgrade cards, the offer card beside End of day, the Contracts tab's running
block, the hall with the line whole and a pallet at the gate, setup mode dragging the line, the
Owned tile's `Sell the line for £5,000,000`, and the card of a lifted save. No CSS token or class.

**T30-B1 Pack 1 of 09.10.** The thirteen pictures are in `public/sprites/` byte for byte (each
matches the pack's own SHA256 line): the five sanders and their `.r` over Turn 28's, and the three
cutter cases, which the catalogue's tile and the Sprite check page now draw where they showed an
empty box and `no file yet` (`tests/ui/t28Families.test.ts` flipped; the measured class files 107
to 110 in `tests/render/spriteClasses.test.ts`). The eight sander ports are measured again, off
the art side's own mesh through the pack's own matrix and checked by eye (`src/engine/ports.ts`,
[TUNE until Piotr confirms]); no test pinned the old figures. The root is as it was before 09.10:
the game's README is back with this turn's lines, and the rest of the pack is in
`docs/art/pack-0910/` with `EDITED.md` (the five files whose eleven em dashes were replaced, and
`SHA256SUMS.txt` left as delivered). SPRITES.md section 15.1 carries the thirteen files.
