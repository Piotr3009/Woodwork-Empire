# Report, Turn 31: the line's timber and glass, its books, the forklift's lane and its forklift, the hall that grows, the shelter behind the wall, and contracts that can be lost

Woodwork Empire, Turn 31. Built against `CLAUDE.md` of 11.10.2026 (first line "Turn 31").

## 0. What Piotr should read first

Written at the end of the session (T31-E5). Until then this file carries the two lines of each task
as it is done, so that nothing is lost if the session ends early.

## The tasks

**T31-A0 The suite on v91.** `npm run check` on main as it stood (v91, state 43): lint and build
clean, 2,849 tests in 297 files green. Nothing moved, so no commit.

**T31-A1 Housekeeping and v92.** `APP_VERSION` is `v92` and its pins are flipped
(`tests/ui/saveCheck.test.ts`, `tests/ui/version.test.ts`); the README names `docs/turn-30-brief.md`
and `REPORT-T31.md`. The brief was already `CLAUDE.md`, and the Turn 30 brief already in `docs/`.

**T31-A2 The mockups.** The nine mockups of section 9 in `docs/mockups/t31/`, each the game's own
markup from engine states beside the same screen today, shot in headless Chromium, with a README
and the lead's decisions file (`decisions.md`). Built off a snapshot of the A1 commit by sub-agents.

**T31-B1 The line's timber and glass, STATE_VERSION 44.** Two boards and one glass a window, the
boards held on the timber stores (`boardsHeld`, `reservedSheets`), the glass at module 6 up to 40;
`Order timber: 40 boards, £8,000` and `Order glass: 20 windows, £4,000` on the running block with
their refusals; the office admin orders at two days left (and the minute a contract is taken); a
line short of either stands, said by `lineNeedsMaterial` and the `Standing still` row; written off
at the sale. The lift `liftToVersion44` writes every new field, and a running line gets one batch.

**T31-B2 The line's books.** The line's own day book in `windowLine` (`today`, `days` kept 400 days,
`since`): a window booked as it is made, each working minute of its contract as possible or lost by
cause, and a calendar day's engineers, power and property cover at its open (beside the ledger's
`runDayCosts`, weekends among them, while the line stands). The fifth tab of the Accounting page,
`Production line`, once the line has stood: four columns in the Summary's classes, the month's pace,
a year at it, paid back, and what the month lost; selectors in `src/engine/lineBooks.ts`.

**T31-C1 The timber shelter behind the rear wall.** `STARTING_LAYOUT.timberShelter` has `rear: true`,
so `rearYardPlaceFor` stands it with the plant (`No room behind the hall` its refusal) and the van
stands alone on the apron; declared 6 m along the wall by 3 m deep, its zone its footprint, its words
`outside behind the hall`; its two files changed places back by `git mv` through a temporary name;
its plate hung over the wall's top above it; a save's shelter on the apron moved by
`standThePlantBehindTheWall(state, 'timberShelter')`, gated `version < 44`. SPRITES.md 13 put right.
