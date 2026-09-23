# Report, Turn 25: places at the machines, and no man ever queues again

Woodwork Empire, Turn 25. Built against `CLAUDE.md` of 23.09.2026 (first line "Turn 25").
Branch `turn-25-places-at-the-machines`, off `3eb8ef2`, the tree `origin/main` stands on.
`APP_VERSION` v51 to v52, `STATE_VERSION` 27 to 28.

## The tasks

**T25-A1 Housekeeping and v52.** `docs/turn-24-brief.md` is `git show 885d3e3:CLAUDE.md` byte for
byte (`cmp` silent); `CLAUDE-T24.md` was already gone from the root, deleted by Piotr's own
`3eb8ef2` with this brief, so there was nothing left of it to delete. The README names the new
archive, `REPORT-T25.md` and `docs/art/REQUESTS-T25.md`; `APP_VERSION` v51 to v52 with the two
tests that name it flipped, and `STATE_VERSION` left for A2 as section 1 says.
`docs/art/REQUESTS-T25.md` asks for nothing new (section 9) and restates the backlog read off
`public/sprites`: the sprayer's four sheets, the helper's bench sheet, the backs of every floor
family but the tool cabinet, and the seven recordings.

**T25-A2 Phase A: places, the plan, the deletions, STATE_VERSION 28.** `MACHINE_PLACES` (the table
of 2.1, the bench's row being Turn 23's `WORKBENCH_PLACES` folded in) and `MACHINE_PACE` (2.4) in
`constants.ts`; `placesOf`, `placedMachines`, `hallPlaces`, `machineForPlace` and `menAtPlaces` in
`machines.ts`; `placeCellsAt` in `stations.ts`; `Worker.working` and `Worker.noPlaceFor` and the
owner's two, written by `planPlaces` in `production.ts`, the day plan every reader reads. Deleted:
`takenBy` as a claim (a dead optional field the lift clears), `heldMachine(s)`, `claimMachine`,
`releaseMachines(Except)`, `freeMachines`, `takeMachines`, `familiesWanted`, `machineAtWork`,
`menAtJobs`, `releaseIdleMachines`, `contractMenAtWork`, `waitingStation`, `stationWaitingFor`,
`secondStation`, `placeStation`, `queueCellsAt`, `benchCellsAt`, `benchPlaceAt`, `benchPlacesOf`,
`stageFor`, `stationFreeFor`, `stageMayStart`, `stageAtTheBench`, `standsForBench`, `NO_BENCH`,
`waitingWordsFor`, `waitingLine`, `jobHasWorkFor` and the waiting role of the station table.
`liftToVersion28` clears the claims, gives every man the two fields, stands a man at a waiting
cell at his home cell, clears the rows that waited, moves the queue's lost minutes to `noPlace`
today, on every closed day and in every monthly report, and the lift then runs the day plan.
Every test that asserted the queue was flipped to the places and none kept beside it; the three
month playthrough now ends with the bank on day 91, measured and explained in its test and in
C2. The four men and one used saw case holds from this commit: one cuts, three say
`no place at the saw`.
