# Report, Turn 31: the line's timber and glass, its books, the forklift's lane, the hall that grows, the shelter behind the wall, and contracts that can be lost

Woodwork Empire, Turn 31. Built against `CLAUDE.md` of 11.10.2026 (first line "Turn 31").

This report is written task by task as the turn is built (two lines a task); section 0 is written
last, in T31-E5.

## The tasks

**T31-A0 The suite on v90.** `npm run check` on main as it stood (v90, STATE_VERSION 43): lint and
build clean, 2,847 tests in 297 files green, exit code 0. Nothing red, so no commit.

**T31-A1 Housekeeping and v91.** `CLAUDE.md` is this turn's brief and `docs/turn-30-brief.md` was
already in `docs/`, both put there by the ZIP; the README names the Turn 30 brief and the reports to
`REPORT-T31.md`. `APP_VERSION` is `v91`, and its pins are flipped (`tests/ui/saveCheck.test.ts`,
`tests/ui/version.test.ts`, the latter's `written in constants.ts and nowhere else` too); the state
stays 43 until B1 lifts it.

**T31-A2 The mockups.** Eight pages of section 9 in `docs/mockups/t31/`, each the game's own markup
from engine states beside the same screen today, shot in headless Chromium, with a README naming
which is which: the line's running block with its material rows and buttons, the strip, the
Production line tab, the hall with the lane, the long extension card, a longer hall in outline, the
shelter behind the wall, and the lost and cut contract. Found while drawing: the timber's refusal for
want of room cannot show with today's stores (a rack holds 40), and the shelter's roof shows over the
wall at the hall's camera, as the plant's does.

**T31-B1 The line's timber and glass, its orders, the office's orders, what the player reads.**
A window takes two boards (held on the timber stores, on the one counter, counted by `boardsHeld`
and `reservedSheets` only) and a window's glass at module 6, and the line stands at any minute it
has not a window's worth; `makeWindow` books only the £1,500. `Order timber: 40 boards, £8,000` (one
lorry the next working day, `line: true`, unloaded whole onto the stores or left at the gate) and
`Order glass: 20 windows, £4,000` (at module 6 the next working open) sit in a row under the running
block's rows, each locked with its reason under the row; the office admin on duty orders at the
open, after every window and, beyond the brief [TUNE], the minute the contract is taken, the timber
only into free room less every load of boards coming. `lineNeedsMaterial` sits directly under
`lineNeedsEngineer` (and is not said while the line is being moved); the Materials page has `Glass
at the line`; the line's sale writes its timber and glass off, calls off its loads on the road for
their price and writes off a load already at the gate. STATE_VERSION 44 in `liftToVersion44` with
every new field of the turn, and a running line given one batch of each, free. New tests:
`tests/engine/t31Material.test.ts`, `tests/ui/t31Line.test.ts`, and the v43 saves in
`tests/cloud/migrate.test.ts`; flipped: the version pins, the offer card's sentence, the material
line of a window (`t30Contract`, `turn30` (eee)), the material wanted by `t30Upgrades`,
`t30Sheets`, `t30Line` and `turn30` (fff, ggg), `WARNING_ORDER` and the windowLine shape of the v42
lift.
