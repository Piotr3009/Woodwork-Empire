# Report, Turn 29: the production line, the five axis CNC, the timber stores, and four to a contract

Woodwork Empire, Turn 29. Built against `CLAUDE.md` of 05.10.2026 (first line "Turn 29").
Branch `turn-29-the-line` off `5b05355`, the tree `origin/main` stands on (v83, STATE_VERSION 41).

## The tasks

**T29-A0 The suite on v83.** On main as it stands `npm run check` is green on its own exit code:
lint, the build and 2,652 tests in 278 files, none failing and none skipped, so nothing moved and
nothing was changed; no commit.

**T29-A1 Housekeeping and v84.** `docs/turn-28-brief.md` was already in `docs/` and `CLAUDE.md` is
this turn's brief (first line "Turn 29"), so nothing was moved; the README names the Turn 28 brief,
`REPORT-T29.md` and `docs/art/REQUESTS-T29.md`. `APP_VERSION` goes v83 to v84 with the two tests
that name it flipped (`version.test.ts`, `saveCheck.test.ts`); `STATE_VERSION` is B3's.
