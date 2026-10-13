# Turn 32: one store for every material

Report of the autonomous session, written as the tasks went. Section 0 is written last (T32-E5).

## The tasks

**T32-A0 The suite on v95.** `npm run check` on main as it stood (v95, state 47): lint and build
clean, 3,013 tests in 312 files green. Nothing moved, so no commit.

**T32-A1 Housekeeping and v96.** `APP_VERSION` is `v96` and its two pins are flipped
(`tests/ui/saveCheck.test.ts`, `tests/ui/version.test.ts`); the README names `docs/turn-31-brief.md`,
`REPORT-T32.md`, `REQUESTS-T31.md` and `REQUESTS-T32.md`.

**T32-A2 The mockups.** The six mockups of section 9 in `docs/mockups/t32/`, each the game's own
markup from engine states of a snapshot of the A1 commit beside the same screen today, shot in
headless Chromium, with a README and the lead's readings (`decisions.md`); built and reviewed by
sub-agents, the review's findings put right before the commit.
