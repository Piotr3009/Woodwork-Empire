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

**T25-B1 2.3, who has a place.** The plan of A2 is the one answer every reader takes: it is
worked out again whenever anything it is made of changes (every settle, so every assign,
unassign, buy, sell, move, breakdown and repair) and at the top of every production minute, and it
is deterministic, so between two such events it gives the same answer minute after minute, which
is what "once a day and not once a minute" asks and is asserted over thirty minutes. The person
card now says the plan's words in the warn red (`Kitchen (cutting), no place at the saw`), the same
phrase as the mark. `tests/engine/dayPlan.test.ts` asserts the hire order, the owner first, the
place handed on the minute a man is taken off, a second saw's places, a breakdown taking them away
and the repair giving them back, a stage moving to another family, a family the hall does not own
wanting no place, a contract man in the same order, and four men at a used saw for a full day: one
man's output and three days of `noPlace` (two men work at a standard saw).

**T25-B2 2.4, the hall's pace, and the Output sheet's `<why>`.** `outputFactor` is gone from
every class of every family and from `EquipmentVariant`: one ladder, `MACHINE_PACE`, read through
`classPaceOf` for the families a man works at (`PACED_FAMILIES`: the places table's seven and the
solid wood tools, whose class was a speed on v51 too), and 1 for everything else.
`paceOf` adds the gate's 2% as before; `hallPace(state, family)` is the best of the family
standing unbroken and not away for its service (`bestMachineOf`, which now skips a broken or
serviced machine), and `stageSpeed` reads it for every stage, the CNC's included (its head times
its pace). `bestOutputFactor`, `outputFactorOf` and the dead `machineOutputFactor` are deleted.
What moves: the top of every machine ladder falls from 1.30 (the edgebander 1.35) to 1.12 and the
pro class from 1.15 to 1.08, which are Piotr's figures; the bench's Turn 23 column
(1.03/1.06/1.10) folds into the ladder (1.05/1.08/1.12). A machine's savings row reads the hall's
pace, because every hour at any saw ran at it. The `<why>` of a man's row on the Output sheet is
`saw, industrial` (the family's short word and the class that sets the pace), `at the bench` and
`by hand` as before. Tests flipped: the industrial saw's cutting quarter (143 minutes of 640, was
123), the thirty day industrial month's cutting at 1.12, the class card's `Output +12%`, the
bench card's `+5%/+8%/+12% pace`, the CNC tests on a budget CNC (pace 1.00, so the head's figures
hold); new: a used and an industrial saw cut at 1.12 and at 0.95 while the good one is broken or
away, and the `<why>` of the day 128 save and of a two saw hall.

**T25-B3 2.5, who is at a machine.** One engine line, `placesLine(state, item, form)` in
`machines.ts`, read off `menAtMachine`, which is the day plan's: `Places: 2 of 2 in use, Pete and
Eddie` on the machine's own card (`renderMachineCard` draws `ownedTile` in its `card` form) and
in its hover `<title>` on the hall, `2 of 2 in use` on the Owned tab's tile, `Free` on both while
nobody is at it, nothing on a thing nobody works at and nothing on a broken, serviced or sold
machine, whose card already says why it stands. The bench's old hover words (`Workbench (free)`,
`Workbench: Ben`, read off a man's anchor cell and not off any plan) are deleted for it, so every
family says its places the one way; the two render tests that read them are flipped.
`andList` joins the names. `tests/ui/placesCard.test.ts` asserts the card, the tile and the hover
of a two place saw with two men, one man, none, a broken saw and a fan.
