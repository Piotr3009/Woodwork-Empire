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

**T28-B2 The company's holidays.** `closureOf(day)` in `clock.ts` is the one rule: Christmas from
22 December to 5 January from December 2025, and 1 to 14 August from 2026 [PIOTR: the fortnights
and the years; TUNE: chat: the 22nd and the first fortnight], off `CLOSURES` in constants;
`isWorkingDay` is false on a closed day, so the day loop steps over a closure as over a weekend and
runs its bills, and every deadline, delivery, courier, return from service and first day of a new
man steps over it. Done on top of that: the owner's draw on every weekday (`isWeekday`), closed or
open, so his house keeps its tier; `workingDayIndex` and `dayOfWorkingIndex` count the days
`isWorkingDay` is true of (a kept count, so the Work Plan pays nothing per call); the first day
back has its own card, `closureOver` (`Back from the Christmas break`, `14 days closed ... £X
out.`, `Back to work`), in place of the Weekend card and after the tax's, its money everything that
left the account on the stepped over days but the tax; the overtime debt is cleared on it
(`closureBefore`); and `Tax is coming` says `The workshop is closed from 22 December, so the last
day to spend is Thu 21 December.` before `Invest, or pay.`. The card before, `closureComing`
(`Christmas break`, every date computed, the overdrawn sentence under nought), is raised after the
tax's on the first working day of December and of July from 2026, once (`state.closureWarnedFor`,
null in a v40 save, so a save loaded in the window is told on its next open), and the strip's
`closureComing` line, `Closed from 22 December: 9 working days left` [TUNE: `1 working day left`
on the last], stands directly under `taxComing`. The Team page's line on the draw says `paid Monday
to Friday` and not `paid every working day`, which a closure made untrue. Re-dated honestly, to the
last working day before the break and the first day back: `tax.test.ts` (the quarter is now of
what the eight closed days before the 30th leave, read off the ledger), `taxCards.test.ts` and the
(uu) scenario (15 working days with the strip's line and not 21); the test of a working 30
December is flipped to say every 30th is closed, and the order pins of `warnings.test.ts` and
`tax.test.ts` take `closureComing`. 22 new tests in `tests/engine/t28Closures.test.ts`, drafted by
a sub-agent against the API and checked here.

**T28-C1 The pictures in.** The 42 files of `docs/art/incoming/t28/` are `git mv`ed into
`public/sprites/` as they came [PIOTR, 05.10]: no pixel of them was touched. The manifest is 258
sprites and not 216, and the two counts of turned pictures read 96 and not 75 (`rotate.test.ts`,
`spriteClasses.test.ts`). `docs/art/SPRITES.md` section 12 carries their table (file, metres, file
size, anchor, pack) and says what they are: pack 1 rendered to the contract, the sanders as
delivered and off the contract's projection, the presses and the glue table chat's stand ins. Its
section 2 now says the anchor is at `8 + w × 48` (and `8 + d × 48` in a `.r` file), as the code has
had it since 14.09; sections 5 and 7 still describe the bottom centre and are left for the art
side's next brief. The incoming folder and its JSON are gone.
