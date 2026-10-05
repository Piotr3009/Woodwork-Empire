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

**T29-A2 The mockups.** Six pages of section 9 into `docs/mockups/t29/` with a README, each the
game's own markup by its own renderers beside the same screen today: four to a contract and the
trimmed save's card; the five axis CNC and the robot; the Production line tab; the engineer and the
strip; the timber stores; the sash window contract. (7), the logo, is not drawn: no
`docs/logo-incoming/` on main.

**T29-B1 The glass the next working day.** `GLASS_DELIVERY_WORKING_DAYS` is 1 [PIOTR, 05.10], and
`TIMBER_LEAD_DAYS` is written as `GLASS_DELIVERY_WORKING_DAYS + Object.keys(TIMBER_STANDS).length`,
3, with `TIMBER_STANDS` moved from `jobs.ts` into `constants.ts`; the comments and the three test
literals (10, 12, 12) say so, and the glass's "day before it is due" half flipped to "ordered today,
in at the next working day's open". A greyed timber enquiry of an old save drawn with +12 now has 3
taken off for its hands and may turn takeable at the next settle (stored days, read as stored).
