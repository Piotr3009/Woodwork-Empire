# Report: Turn 1

## 1. Done

T1-01 Scaffold: Vite, TypeScript strict, Vitest, ESLint, folder tree from section 4, README, ignore files.
Fresh clone passes `npm ci && npm run check` with one trivial test.

T1-02 Constants and types: `engine/constants.ts` holds every number of sections 6 to 9, each tagged
`[PIOTR]` or `[TUNE]`. `engine/types.ts` holds JSON only shapes and the action union.

T1-03 RNG and clock: mulberry32 in `engine/rng.ts` with the cursor in the state, calendar and time
helpers in `engine/clock.ts`, and the day, weekend and month rollover in `engine/game.ts`.

T1-04 Economy: daily, weekly and monthly cadences, the day 1 deposit, overdraft interest, arrears,
the bailiff seizure and bankruptcy, with a ledger entry behind every movement of money.

T1-05 Owner and tasks: the 480 minute pool, overtime efficiency, fatigue, the 12 hour hard stop,
absence, sick leave, `SKIP_DAY`, the task minute curves and the runner that spends owner minutes.

T1-06 Catalogue and board: product templates with tool gating and lock reasons, enquiry generation
with size, express, bespoke and expiry, and a board that refills and expires every morning.

T1-07 Jobs: the full lifecycle from accepted through calls, drawing, material order, next day
delivery, unloading, production, payment and rating, with late penalties and the by hand path.

T1-08 Staff: hiring gated by reputation and by bench, locker, seat and tool set, weekly and monthly
wages, automatic assignment with a manual override, the saw ratio slowdown and the helper effects.

T1-09 Machines and dust: bag intervals per machine with the stop and the event, extractor breakdown
and repair, dust accumulation with the bands, cleaning, the helper Friday clean and the accident.

T1-10 Materials: per job and stock purchasing, the bespoke three day wait with its uplift, the sheet
rack with its capacity, and the overflow decision with both outcomes.

T1-11 Render: `render/iso.ts` holds the 2:1 dimetric projection with a tile to screen round trip,
`render/hall.ts` and `render/office.ts` build flat placeholder SVG from the state alone.
