# Report, Turn 23: a man works when the boss says so, a manager who earns his keep, a canteen with eight lockers

Woodwork Empire, Turn 23. Built against `CLAUDE.md` of 20.09.2026 (first line "Turn 23").
Branch `claude/busy-archimedes-fznv89`, off `cd51383`, the tree this turn opened on and the tree
`origin/main` stands on. `APP_VERSION` v35 to v36, `STATE_VERSION` 19 to 20.

This file is written as the turn goes: two lines a task, in the order of section 5, each with the
commit it sits in. The cross check, the pictures and the closing figures are added by phase C.

## The tasks

**T23-A1 Housekeeping and v36, `a914677`.** `docs/turn-22-brief.md` is `git show 8fecd36:CLAUDE.md`
byte for byte, 27,410 bytes, off the Turn 22 merge commit, with `diff` silent. The README's brief
list, its report range and its art request list carry Turn 22 and Turn 23, and its ten minute walk
through drops the cordless drill from the day one order and the hand tools from the day two van,
because Turn 23 takes both off the hall. `APP_VERSION` `'v35'` to `'v36'` with the two tests that
name it, `tests/ui/version.test.ts` and `tests/ui/saveCheck.test.ts`.
`docs/art/REQUESTS-T23.md` asks the art side for **nothing**: section 9 of the brief has no pack in
it, because the canteen's five layers landed on 20.09 and are in the repo. The page records what
landed, the two pictures this turn deletes and nobody is to redraw, and the backlog earlier turns
are still owed. `npm run check` before the commit, off its own exit code: exit 0, 209 test files,
2,052 tests and 1 todo.

**T23-A2 Phase A, `cbc6403`.** Section 3's list in one commit: `STATE_VERSION` 20 with
`liftToVersion20` (the empty `monthlyReports`, the saved manager made experienced, every drill and
seat off the books standing or on order with one ledger line each, the hand tool set's cell gone,
the staff management chore off the list); the manager's four tiered specs through `tieredSpecs`
with an optional wage table and his four constant tables; the deletion of `staffManagement` and its
`assign` day band, of the drill from the catalogue, the ladders and eight product specs, of the
canteen seat from the catalogue, the welfare kit and the joiner's prerequisites; the hand tool set
given a nought zone so it holds no hall cell; and the canteen's rectangles and text sizes copied
from the art side's JSON, every figure of which was checked against
`docs/mockups/t23/canteen-regions.json` by the lead and matches.
It also did three things the brief does not spell out, each of them forced: `'drill'` struck from
eight `requiredEquipment` lists, the `assign` band deleted so 2.2's day meter line could go, and
the playthrough's manager hire moved to the best grade the script has earned, which moves four of
its figures (day 120 to 121, -15,681 to -15,333, 1 day below the limit to 2, and the last wages
line -7,300 to -6,300) and two thirty day balances (2,789 to 2,829 and -466 to -386).
`npm run check` before the commit, off its own exit code: exit 0, 210 test files, 2,063 tests and
1 todo, the new file being `tests/engine/canteenRegions.test.ts`.
