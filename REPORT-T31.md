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
