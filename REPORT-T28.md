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

**T28-B1 The pelletiser behind the wall, STATE_VERSION 41.** `STARTING_LAYOUT.pelletiser` has
`yard: true, rear: true` [PIOTR, 05.10], and everything the systems have behind the wall follows by
the code that was there: its place (`rearYardPlaceFor`, a metre further back than a system's, its
zone being 3 by 3), the refusal `No room behind the hall`, no cell of the floor, no walking,
dragging or turning, and the clip at the wall; it is in neither `DUCT_SYSTEMS` nor
`CENTRAL_EXTRACTION_SPECS`. `canBuy` no longer asks free floor of anything `standsOutside` is
true of (the pelletiser, the two systems and the van) [TUNE: chat]. `STATE_VERSION` 41:
`liftToVersion41` marks the saves, and `standThePlantBehindTheWall` takes an `only` filter so its
second gate (`version < 41`, after the `< 38` one) moves the pelletiser alone, on the floor or on
order, writing the anchor and booking no moving time (a drag of it not yet confirmed is
forgotten); a system an older lift left on the apron is not tried again, and on the `< 38` path
the pelletiser goes after the systems, so it never takes a system's place. It stays on the floor
when the wall has no length left: in a 200 m² unit with four systems already behind the wall, and
in the 400 and 800 m² units only with nine. A pelletiser turned on the floor keeps its turn
behind the wall, where nothing can turn it back. It breathes behind the wall in
`machineFx.test.ts` as it did at 14, 7; SPRITES.md section 6 and the first batch test say
2 × 2 × 2.5 and 192 × 216, and the whole catalogue stands 18 things on the floor and not 19.
