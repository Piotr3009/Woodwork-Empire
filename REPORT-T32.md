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

**T32-B1 The glass racks.** `glassRack` (40 units, £1,500, 2 x 1 x 2 m) and `glassRackLarge` (200,
£6,000, 4 x 2 x 2.5 m), a family each in the storage tab, drawn by `objectArt`'s last branch with
their name and plate, never serviced, sold by the racks' one rule; a window or a door wants one.
One function each for a kind's capacity, room, spread over its racks and stranding at a sale
(`capacityOf`, `roomFor`, `stockOnItem`, `stockStrandedBySale`); 3,020 tests in 313 files green.

**T32-B2 One store.** Three counters (`sheets`, `boards`, `glass`, each with its paid store) read
through one function each for room, free places, held and free; Restock for each kind; a window's
boards and glass held at the click, ordered as one shortfall on two lorries, its glass taken whole at
its Glazing; the line holding its week off the stores and the admin's restock of each; glass by
lorry; everything of 2.8 gone; STATE_VERSION 48 and its lift. 3,046 tests in 315 files green.

The src review found a window could pass its Glazing holding glass that lay in the paid store, and a
dropped job's load at the gate left with no unloading: both fixed. Queueing a second lorry's "Unload
now" behind the first was tried and taken out, because it moved the sheet playthrough (section 0).

**T32-E1 Notes and the art request.** `docs/notes-t32.md`: where each rule lives, the save, the
readings of the brief, section 10 as built, what was found and fixed or left, and four questions for
Piotr. `docs/art/REQUESTS-T32.md`: G1, the two glass racks, their files and anchors checked against
`spriteFileSize` and `spriteAnchorIn`; S1 named as still owed.

**T32-E2 Scenarios.** `tests/scenarios/turn32.test.ts`: (mmm) the restock of 60 boards and 30 glass
units past one rack each, the window holding 12 and 7 at the click and taking its glass at its
Glazing, a second ordered by the admin on two lorries; (nnn) a line fed by the admin's restocks for a
played month and standing for nothing, and with no admin standing `no timber` until the player
restocks; (ooo) a v95 save of a running line and a window with its glass ordered, played a week on
v96. Each moved figure of the older scenarios was restated in B2 with its line of reason.

**T32-E3 Cross check.** Four read-only agents mapped every claim of section 7 to the tests that
assert it: 118 facts asserted, 29 in part and 22 not. The 51 were closed with
`tests/engine/t32CrossCheck.test.ts` (16 tests) and additions to `t32Store` (engine and ui),
`t31Material`, `migrate` and `turn32`; the "what goes" search now also covers `migrate.ts`.
No skip anywhere, `styles.css` untouched; 3,085 tests in 317 files green.

**T32-E4 Look and shoot.** Seven pictures in `docs/report-t32/`, every one the game's own markup
from its own render functions over states the engine built and played, shot in headless Chromium,
each v96 screen beside v95's same screen built from the A1 snapshot. The generators are in the
session's scratchpad, not in the repo, and no server or browser was left running.
