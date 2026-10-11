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
