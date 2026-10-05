# Report, Turn 28: the timber department, the holidays, and the pelletiser outside

Woodwork Empire, Turn 28. Built against `CLAUDE.md` of 05.10.2026 (first line "Turn 28").
Branch `turn-28-timber` off `1624d33`, the tree `origin/main` stands on (v82, STATE_VERSION 40).

## The tasks

**T28-A0 The suite settled on v82.** On main as it stands `npm run check` is green on its own exit
code: lint, the build and 2,557 tests in 273 files, none failing and none skipped, so v82 moved no
figure a test pins, no scenario is closed by the bank and no fault was found; nothing was changed.

**T28-A1 Housekeeping and v83.** `docs/turn-27-brief.md` was already in `docs/` and `CLAUDE.md` is
this turn's brief (first line "Turn 28"), so nothing was moved; the README names the Turn 27 brief,
`REPORT-T28.md` and `docs/art/REQUESTS-T28.md`. `APP_VERSION` goes v82 to v83 with the two tests
that name it flipped (`version.test.ts`, `saveCheck.test.ts`); `STATE_VERSION` is B1's.

**T28-A2 The mockups.** `docs/mockups/t28/` with its README, five pages built by a sub-agent that
touched nothing else: the game's own markup made by its own functions (`renderEvent`,
`renderWarningStrip`, `renderBoard`, `renderCatalogue`, `renderWorkPlan`, the job card's lines),
in its own classes, with tonight's change written in, each beside its nearest existing screen: the
break's two cards beside `Tax is coming` and the strip with `closureComing`; the timber tile live,
locked and greyed; the job card's glass in its three states with `Order glass`; the Timber machines
and Sanding tabs with the planer's folder open and a cutter set's card; the Work Plan's rows
`glue curing` and `waiting for glass`.
