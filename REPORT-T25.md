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

**T25-B4 2.8 and the breakdown.** `placesSummary(state)` in `production.ts` counts the day plan
(the owner and the crew): `4 men working · 1 with no place at the saw`, a part per family with
men standing for it, and `0 men working` while nobody is on anything: a line that came and went
shifted the board under the pointer, and `tests/ui/oneClick.test.ts` caught it, so it is always drawn. The Work Plan's Jobs tab draws it
over the jobs in the `hint` class, with `warn` while anybody has no place; nothing else on the
screen moves. The top bar's efficiency plate keeps its five lost minute lines (`No place` among
them, A2) and gains `paceLines(state)` under them, one line a family whose pace is not 1.00:
`Saw, industrial` and `+12%`, in the plate's own `efficiency-line` spans (name left, figure
right, so the brief's colon is the plate's column and not a character). `tests/ui/placesLines.test.ts`
asserts the line at a used and an industrial saw, the line without a `no place` part, `0 men working`, and the plate's `+12%`, `-5%` and no line at 1.00.

**T25-B5 the words.** No string the game prints says "waiting for" a machine or "no bench": A2
took the bubbles (`noBench`, `waitingForMachine`), the job rows' `waiting for the ...` and the
`NO_BENCH` station, and this task sweeps what was left, which was comments only. The section 7
grep (`waiting for the\|waitingStation\|heldMachine\|takenBy`) now finds the migration, the dead
field's declaration and one more line: `waitingForBoss: 'waiting for the boss'`, the Turn 23 mark
over a man nobody has put on anything. It is about the boss and not a machine, so it stays, and it
is named here so the grep's one extra line is not a surprise. `tests/ui/noQueueWords.test.ts`
draws the hall, both Work Plan tabs, the top bar, the Company board, the Owned tab, the machines
page, the team page, the day end, every job row, every machine card and every person card over a
crowded saw and a crowded bench, and asserts none of them (text or hover) carries the old words
and that the new one, `no place at the`, is there.

**T25-B6 2.6, the men spread over the machines.** The code is A2's: `stationCell` resolves a
working man's own place through `menAtPlaces` (his rank among the working men of his family in
the plan's order, then `machineForPlace`) and `placeCellsAt`, the one list of a machine's place
cells for every family, benches included, and the figure loop and the owner's figure both call it
with the man's id. Nothing new was wanted in `characters.ts` beyond A2's removal of the queue
stations. `tests/render/placesFigures.test.ts` asserts it: two men at a two place saw at two
cells; four men over two standard saws at four different cells, the third and fourth at the
second saw, each beside the saw that holds him, `machineForPlace` giving the first saw's two
places, the second's first and nothing past the fourth; three men at an industrial bench's three
cells; a man with no place at his own home cell.

**T25-B7 2.7, what the hall makes of a contract.** `contractHallCapacity(state, contract)` in
`contracts.ts`: the piece's stage and family as the day plan reads them (the CNC's when the hall
has one), the hall's pace at it (`stageSpeed`, 2.4), the joiners on the books in hire order up to
the places the hall has at the family (`hallPlaces`, 2.3; the owner is not in it, because a
contract is work for a joiner and `contractManCheck` refuses him), each man's minutes a piece
rounded the way his own card rounds them, over the minutes of a working week. `contractHallLine`
words it: `Your hall makes about 26 of these a week at full crew; this term wants 20`. It is drawn
green (`good`) or red (`bad`, when the term wants more) on the offer tile of the Contracts board
and on the Contracts tab's offer card, above v51's `This contract is for 2 men at the least`,
which stays. The game has no acceptance dialog of its own: the Accept and `Take it` buttons are
on those two cards, so the line is on the card the click is made on, before it is made, and the
engine's `acceptContract` is unchanged, as "no new rule" asks. `tests/engine/contractHall.test.ts`
asserts the figure's arithmetic, a one saw hall at a third of a three saw hall, the red past the
figure and the green at it, the figure halving when one of two saws is sold, the industrial
saw's pace in it, and both cards green and red with the men line kept.

**T25-C1 notes.** `docs/notes-t25.md`: why the plan runs at every settle and every minute and
still gives the brief's once a day answer; the `hallStopped` cause beside `noPlace`; the owner
never taking a place from a man by his own choice; the pace ladder's moves, the CNC's class now in
its stage and the solid wood tools among the paced families; the by hand lead of REPORT-T24 now at
0.67 with the rest of the job; the day 53 fixture that is not in the history; the one boss line the
grep still finds; the Work Plan line drawn at nought; the reading of "the acceptance check".

**T25-C2 scenarios, and the figures restated.** `tests/scenarios/turn25.test.ts`: (qq) four men
and one used saw, thirty days: the first man hired works 10,560 minutes (22 days of 480), the
other three nought, and their three months, 31,680 minutes, are all `noPlace`; `no place at the
saw` over the three. (rr) the same four and an industrial saw: three men at 10,560 each at the
hall's 1.12, the fourth's month all `noPlace`, the line over him. (ss) cut sheet packs: the used
saw's hall makes 30 a week and the industrial's 105; a term of 31 is red on the offer tile and the
Contracts tab of the first and green on the second's, unsigned. The scenarios that turned on the
queue were flipped in A2 (turn21's (gg), the crew month, nobodyMoved) and their comments, and the
policies' notes in `autopilot.ts`, now speak of places.

The thirty day months, v51 (`3eb8ef2`) against v52, played by the same script and read off the
ledger by category: Easy careful 2,829 and 2,829; Hard idle -7,778 and -7,778 (the bank on day 22
both); Very easy big saw 7,613 and 7,613; short handed 49 and 49; with a helper 32,277 and 32,277;
thicknesser on one bag 20,950 and 20,950; lacquer on wet air 11,704 and 11,704, every line of their
ledgers the same. Three moved. Six joiners behind two saws 12,888.50 to 13,215 (+2.5%, under 5%:
deposits +355, balances -28.50). Two men on the short fan 8,466.50 to 7,500 (-11.4%) and on the
big fan 6,544.50 to 7,993.50 (+22.1%): both halls work more minutes (7,880 and 9,169 against 6,917
and 6,233), and the cash moves by which jobs the script takes, one whenever it has fewer than
three open. The short fan takes 14 jobs and not 16, its first two garage shelves finishing on day
12 where the bag of work had them on day 10 (deposits -1,030, material -230, balances +293.50);
the big fan takes 16 either way, bookcases and a TV unit where v51 took garage shelves (deposits
+1,385, balances +524, material -460). Measured, not guessed: with v51's pace table put back, or
with every saw at one place, the short fan's month still takes 14, so the move is 2.2's (each
man on his own job's current stage). The reason is in the test's comment.

The three month playthrough (A2's figures, unmoved by B1 to B7): month closes 6,482, -3,675 and
-10,404 on v51 against 7,272, 948 and -15,551, the bank on day 91. Month 1 +790: contract +990
(the joiner cutting beside the owner at the standard saw's second place), material -200. Month 2
+3,827 on the month's own ledger: contract +1,518, deposits +2,605, balances +162.50, material
-460. Month 3 -9,763: wages -2,400 (the novice manager of day 73, whom a month 2 in the black
could carry), balances -3,032.90 and deposits -2,325 (9 jobs delivered against 11, the name from
26 to 7 on the jobs late in the owner's week away), material -3,110 and storage -300 (two loads
in temporary storage on days 80 and 81), contract +1,056, repair +150 (v51's day 75 extractor
repair is not in this run), transport +240, overdraft interest -24.53, insurance -16.66.

**T25-C3 the cross check.** The section 7 grep finds the migration (lines 749 to 772), the dead
field's declaration (`types.ts:288`) and `waitingForBoss: 'waiting for the boss'` (B5, the Turn 23
boss mark), and nothing else. `tests/engine/crossCheckT25.test.ts` opens every save the tree has
(the three day fixtures and the v18 to v20 saves; there is no day 53 save, notes 6) and runs one
minute: no queue station survives, `takenBy` is null on every item, and no two men on the floor
stand on one cell. It found one thing on its first run, and it is fixed here: on the day 128 save
Eddie, Pete and Callum have no place at the saw and share one industrial bench as home, and all
three stood on its first cell, because `homeCellOf` gave a joiner his bench's anchor. It now gives
him his own place at it (`benchPlaceOf`, the place `benchOf` always counted, and `placeCellsAt`),
so men who share a bench stand at its places. Two render tests built their two and three marks
over one cell from exactly that heap; they are rebuilt at the canteen door (contract men with no
sheets, T24 2.3), where marks still meet, and `v38.test.ts`'s home cell reads the place.
The rest of section 7 is asserted in the task tests: four men at a used saw for a full day and
two at a standard one (`dayPlan.test.ts`), the place handed on the next minute (`dayPlan`,
`nobodyMoved`), used plus industrial at 1.12 (`variants.test.ts`), four men over two saws at four
places (`placesFigures.test.ts`), the contract figure halving when a saw is sold
(`contractHall.test.ts`). Every scenario is green; `git diff 3eb8ef2 --stat -- src/ui/styles.css`
is empty, so no token and no rule was added.

**T25-C4 look and shoot.** Eleven pictures into `docs/report-t25/`, every one the real app (the
Vite dev server) in headless Chromium at 1280 by 800 at one device pixel, in front of a save
written by the game's own `encodeSaveFile` and opened by its own Continue button, the clock on the
game's own Pause; every one asserts in the script that the words it is named for are on the page
before it is saved, and every one logs the speed knob, which reads `Pause` on all eleven (opening a
machine card and walking to the office start the clock at 1x, so the script presses Pause again
before those two shots). The halls were stood up with the engine's own helpers; the staging
scripts are not committed, as Turns 21 to 24 did not commit theirs. Looking found one thing, fixed
here: the capacity line of 2.7 was a `hint` with `good` or `bad` on it, and the board's skin inks
a hint in its own grey whatever its class, so on the Contracts tab it was neither green nor red.
It is a row now, the hall on the left and `this term wants 40` as its figure, which the board
prints green and red (`.modal-board .row-figure.good/.bad`), with no new style. v51's men line
under it (`This contract is for 2 men at the least`, `hint contract-hands bad`) has the same grey
and is left as it is: it is v51's, and section 1's scope does not reach it.

## The eleven pictures

The third column is the nearest existing picture of the same screen, and the one thing each pair
differs by is what this turn did to it.

| picture | what it shows | beside |
| --- | --- | --- |
| `01-four-men-and-one-used-saw.png` | Pete at the used saw's one place, Eddie, Ben and Callum each at his own place along the industrial bench with a red mark, Ben's paper up: `no place at the saw`; Efficiency 20% | `report-t22/05-the-hover-line-over-a-mark.png`: the same mark over a man at the saw's waiting cell reading `waiting for the saw`. Here nobody waits at the saw: the three stand at home and say they have no place |
| `02-the-same-four-with-an-industrial-saw.png` | Pete, Eddie and Ben at the industrial saw's three places, Callum at the bench with the mark and his paper `no place at the saw`; Efficiency 60% | picture 1: one place there, three here, the same four men |
| `03-a-two-place-saw-with-two-men-at-it.png` | Eddie and Pete at the standard saw's two places, one at each end, nobody behind anybody | `report-t24/03-a-contract-man-at-the-canteen-door.png`: one man at a saw, the others off it. Two at one saw, both working, is new tonight |
| `04-two-saws-with-the-men-spread-over-both.png` | two standard saws, four men: two at the first saw's places and two at the second's, four cells | picture 3: the third and fourth man go to the second saw and not in a heap at the first |
| `05-the-day-115-save-after-one-minute.png` | the day 115 save (seven people, three saws, the table saw away for its service): Frank at a saw, Dave and Jack at the CNC, the owner, Liam and Adam at the benches, nobody on another man's cell | the day 115 save has no earlier picture; it stands in for the day 53 one the brief names and the tree does not have (notes 6) |
| `06-a-machine-card-with-its-places.png` | the standard saw's own card, opened by a click on it: `Places: 2 of 2 in use, Pete and Eddie` under `running` | `report-t22/13-the-cabinets-card.png`: the same card frame, whose tool cabinet says `Holds 1 man's tools · 1 in use`. The saw says who is at it the same way |
| `07-the-owned-tile-short-form.png` | the catalogue's Owned tab, the standard saw's tile: `2 of 2 in use`, beside the tool cabinet's `Holds 1 man's tools · 1 in use` | picture 6: the long form on the card, the short one on the tile |
| `08-the-efficiency-plate-with-the-saw-s-pace.png` | the efficiency plate opened: `No people 50%`, `No place 50%`, `No material`, `Hall stopped`, `Owner away` at 0%, and `Saw, industrial +12%` in green | `report-t13/33-efficiency-plate.jpg`: the plate with its four lost minute lines and nothing about the machines. `No machine` is `No place`, `Hall stopped` is new, and the pace line is new |
| `09-the-work-plan-s-line.png` | the Work Plan's Jobs tab: under the crew column, `1 man working · 3 with no place at the saw` over the jobs | `report-t23/02-the-work-plan-crew-column.png`: the same tab with the crew column straight onto the jobs |
| `10-a-contract-card-the-hall-can-keep-up-with.png` | the Contracts tab's offer card, cut sheet packs, 100 a week: `Your hall makes about 105 of these a week at full crew;` and `this term wants 100` in green, v51's `This contract is for 3 men at the least` under it | `report-t20/01-contracts-on-offer.png`: the same offer card with nothing about the hall. The men line says the men; the new row says the hall |
| `11-a-contract-card-the-hall-cannot-keep-up-with.png` | the same card in a one used saw hall, 40 a week: `Your hall makes about 30 of these a week at full crew;` and `this term wants 40` in red | picture 10: the green against the red, before the contract is signed |
