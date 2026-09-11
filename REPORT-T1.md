# Report: Turn 1

## 1. Done

T1-01 Scaffold: Vite, TypeScript strict, Vitest, ESLint, folder tree from section 4, README, ignore files.
Fresh clone passes `npm ci && npm run check` with one trivial test.

T1-02 Constants and types: `engine/constants.ts` holds every number of sections 6 to 9, each tagged
`[PIOTR]` or `[TUNE]`. `engine/types.ts` holds JSON only shapes and the action union.

T1-03 RNG and clock: mulberry32 in `engine/rng.ts` with the cursor in the state, calendar and time
helpers in `engine/clock.ts`, and the day, weekend and month rollover in `engine/game.ts`.
