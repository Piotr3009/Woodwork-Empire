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
