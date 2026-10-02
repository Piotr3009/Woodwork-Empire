# Report, Turn 26: one kind of man on the floor, and a hall that looks like a workshop

## The tasks

**T26-A0 The suite settled on v62.** On main as it stands the full suite failed 30 of 2,388: 27
were scenario and UI figures the v61 arithmetic (a man's grade times the hall's points) moved and
v61 did not re-pin, one was v62's Assign list of free men only (`v38.test.ts`), and two were the
turned sprite count, 67 and not 66, because `palletTruck.standard.png` and its `.r` (renamed
`forklift.used.*` in v54, listed in v61's DELETED.txt) are still on disk and the build's manifest
counts what is on disk; v59 already failed one side of that pair, the manifest's own test. Each was
re-pinned with one line of reason; nothing of the engine was touched, and `npm run check` is green.
Deleting the two pallet truck files was refused by this session's permissions, so they are left
for Piotr: deleting them and putting 66 back in `rotate.test.ts` and `spriteClasses.test.ts` closes it.

**T26-A1 Housekeeping and v63.** `docs/turn-25-brief.md` was already in `docs/` (Piotr's
`1a58cfb`) and `CLAUDE.md` is this turn's brief (first line "Turn 26"), so nothing was moved; the
README names the Turn 25 brief, `REPORT-T26.md` and `docs/art/REQUESTS-T26.md`, and `APP_VERSION`
goes v62 to v63 with the two tests that name it flipped (`STATE_VERSION` is phase A's).
`docs/art/REQUESTS-T26.md` takes the sprayer's four sheets off the list (2.6) and restates the
labourer's bench sheet, the backs of every floor family but the tool cabinet, and the seven recordings.

**T26-A2 The four mockups.** `docs/mockups/t26/` with its README: the day 53 hall before and after
2.1 and 2.2 and a man behind the moulder before and after 2.4, drawn with `renderHall` and shot in
headless Chromium, and the Pace sheet's head and the agency's card as HTML in the game's own
classes. The tree has no day 53 save, so `day53Hall` in `tests/helpers.ts` stands Piotr's hall of
01.10 up from his words (six joiners, a CNC, a pro saw, two edgebanders, a moulder, a booth, the
labourer, the office, and Nathan on a contract); it is the day 53 fixture wherever the brief names it.

**T26-A3 One kind of man, the labourer's name, the draftsman's grades, the admin's desk, STATE_VERSION
34.** The three trades are gone from `WorkerRole`, `HIRING_SPECS`, the tabs, the task tables, the
Output sheet and the answer skew, with `tradeFactor` and the three spray rates: a booth minute is
the man's grade times the hall's points. The site survey is the draftsman's (and the owner's), the
meeting his then the salesman's, the drawings his at 0.8, 1.0 or 1.2 by grade on his own gate
(15, 50, 90) and wages (2,400, 2,900, 3,400 [TUNE]); the take off and the orders are the admin's
at the owner's speed, Joinery Core's line counted for her. Two rules this needed and the brief did
not write: a draftsman takes a job's drawing only once its meeting and survey are done, and the
survey is created before the drawing, or he had the drawing in hand and no hand free for the
survey; and the draftsman moved to the Technical tab, which would otherwise hire nobody. Every
word a player reads says labourer (`helperOnDuty` and the `HELPER_*` names renamed too; the id
`helper` and the sheets stay). `liftToVersion34` does section 4. The three month playthrough now
goes to the bank on day 89 (no take off man's site measures, no quarter of answer skew).

**T26-B1 The crew limit is joiners.** `crewCount` counts the joiners and nobody else, the owner
included, and the line reads `Joiners 4 / 8, the unit takes 8 joiners`; `crewFull` is never true
for anybody but a joiner; the canteen's lockers, its plates and its hiring gate count the joiners
and the labourer only (`LOCKER_ROLES`), so the office and the manager pass eight on the books.
Two things the brief did not settle and this left as they were: the unit's bench slots (six on
very easy, four on easy and hard) refuse a seventh joiner at the hire card before the eight is
reached, and the eight lockers still hold eight joiners and labourers between them; T23's (nn),
nine men under a novice, is reachable through the hire card from tonight and is flipped to say so.

**T26-B2 Reputation is earned slower.** `changeReputation` books a gain at `REPUTATION_GAIN_FACTOR`
0.5 [TUNE] and a loss at its whole, and nowhere else; the log line is the points booked, and the
client's own rating on the delivery card is what he said. A month of eight on time jobs and two
late ones books 5 where it booked 17. Moved figures, one line each in the tests: thirty days on Easy
ends at 11.5 (23 at half), its lowest balance 2,741 (2,746) and the short handed month's -680 (-862);
the fan month is read by the value delivered, the big fan's standing taking bigger jobs; the three
month playthrough trades to day 92 again (months 7,350, 398, -12,999, an experienced manager on day 65).

**T26-B3 At most three standing contracts.** `CONTRACTS_MAX` 3 [PIOTR]: `offerContract` draws
nothing while three run, the weekly offer owed or not, and `acceptContractCheck` refuses a fourth
already on the board, the Contracts tab's card and the laptop's tile showing `3 contracts running:
the most the shop takes on` where the take button was (the one click of `takeContract` asks it
first). No scenario moved: none of them runs more than one contract.

**T26-B4 The advertising agency and the big jobs.** `src/engine/agency.ts`: the switch on the
Website page under the ladder, in the software card's classes, taken on from a standing of 50 (the
lock is mine, so a shop never pays for a board it cannot be shown [TUNE]); `AGENCY_MONTHLY_FEE`
5,000 on the 1st as the software's, ledger `agency` on the `Software, website and advertising`
month line, no sales; one big job on the board at a time, on a side stream of the day, from 50
[TUNE], 100,000 to 1,000,000 in steps of 10,000 [PIOTR range, TUNE step], a template the hall can
make, standard sheets [TUNE], the ordinary deadline rule; `bigJobJoinersFor` 4 to 8 [PIOTR, TUNE
slope]; `canAccept` says `Wants 4 joiners free: you have 2` (red on the card, green once there),
and the client's yes puts the first free joiners on it, who stand by it until it is ready and it
goes into production with them. Note: at the deadline cap of 30 days the top of the range cannot
be made on time (D2 measures it).

**T26-B5 The Pace sheet says the real number.** The head is `workshopOutputToday`, `every worked
minute today was worth`, the number the top bar carries; the note that carried it under the hall's
own figure is gone, and the hall's total of its lines is the sum under `What moves it` and nowhere
above it. A man on a standing contract takes his `machines` from `contractPieceSpeed`, the figure
`runContractMinute` books him at, and his place's machine in the words (Nathan `CNC, pro ... 0.80 ×
(1.00 + n machines ...)`), so the row multiplies out to its figure; a job man's row is v61's.

**T26-C1 Places are the capacity.** `MACHINE_PLACES` is deleted; `placesOf` reads `MACHINE_CAPACITY`,
which takes the bench's row as it stood, and `capacityOf` and `hallCapacity` went with it, the same
reading twice (`hallPlaces` is the one); `CAPACITY_FAMILIES` is the table less the bench, so the
shortage lines (`Too few saws: capacity 2, 4 men`) keep their arithmetic and no bench line appears.
A machine books one minute a clock minute however many men are at it, the dust on the same minutes
(collapsing both is my reading [TUNE]: eight men at a CNC is one CNC running), and a contract's wear
is charged on its own `machineMinutes` (lifted from its man minutes). No scenario figure moved; the
unit tests that wanted "a saw of one place" stand a used saw now, and the day 128 and 149 places are re-pinned.

**T26-C2 A cell of his own for every man.** `standingCellsFor(state, anchorCells, count, taken)`
in `src/engine/stations.ts` is the one rule: the anchors in order, then the rings round the first,
never a cell twice and never one another figure has this minute. `placeCellsAt` gives it the
operator's cell, the second place, the worked side at the operator's distance and then the rings
(worked side, ends, far side); the renderer's `figureStandings` hands every figure its cell in one
pass (places machine by machine, then the owner and the crew in order, the door's queue through
`doorQueueCell`, the gate and the home cells through the same call), and a man going into a room
walks through its door and stands on no cell. Asserted on the day 53, 128 and 149 halls and a door
queue of four; the bench's fifth place is now its end and not a second row in front of it.

**T26-C3 Walking between the machines.** Every delivered front picture of a floor class is the
canvas its footprint gives, to a pixel (62 files measured on 02.10, six of them a pixel off), so the
overhang is what a footprint
centred in its zone reaches into the cells round `footprintCells`: `pictureCovers` counts a cell a
machine's drawn footprint covers half of or more (`PICTURE_COVER_SHARE` 0.5 [TUNE]), a machine's
and not a bench's or a rack's, whose fronts are where men stand. `walkRoute` walks the floor with no
footprint and no picture, the long way when it has to, then through an overhang only when the floor
has no way at all, and the straight line only for a boxed in cell; standing cells avoid pictures
too. Over every pair of figures on the fixtures: day 53 90 floor, 20 overhang, 0 straight; day 128
20, 0, 0; day 149 20, 0, 0. The 20 are the moulder's corner of my day 53 stand-in, sealed by the
saw's and the booth's half cells.

**T26-C4 Hidden by what he walks behind.** The keys are what they were, and honouring them alone
could not do it: the moulder's key is the back corner of its zone (18 on the day 53 hall) and a
man on the row behind its table has 18.2, so a sort by key paints him over it whatever the re-sort.
`figureSlot` (src/render/iso.ts) puts a figure after everything he is in front of and before every
thing whose drawn footprint he stands behind (`standsBehind`: his feet short of its front on both
axes), the thing he is behind winning a conflict; the scene places its figures by it once and
`resortFigures` does a full insertion by it every frame, the kits carrying `data-foot`. A stepped
walker behind the moulder is before it on every frame he is behind it (it failed at frame 6 with
the v62 re-sort); the T20 walk past the saw moves him on two frames now and not one.

**T26-C5 A shade quicker.** `WALK_CELLS_PER_SECOND` 1.25 to 1.5 [PIOTR] and
`WALK_CELLS_PER_SECOND_FAST` 1.5 to 1.8 [TUNE, the x1 pace's own fifth more]; the walk sheet plays
at `frames * pace / WALK_STRIDE_METRES` as before, so the feet stay planted. The staircase test's
frame count is restated for the shorter walk (479 frames at 60 a second for twelve cells).

**T26-D1 Notes.** `docs/notes-t26.md`: the day 53 stand-in, the bench slots and the lockers in
front of the crew limit, the draftsman's tab and order of work, the agency's readings and the
measured workload of a big job (from about 250,000 no crew the unit holds makes the deadline), the
overhang as measured, the depth keys against the order, the dust on machine minutes, and what is
left for Piotr.

**T26-D2 Scenarios.** The figures that moved were restated where they moved, one line each: B2's
(thirty days on Easy 11.5, 2,741 and -680, the fan month by value, the playthrough 7,350, 398 and
-12,999 trading to day 92) and nothing in phase C. (tt) is new: the playthrough asks for the agency
every morning from day 31 and is refused (standing 3 on Easy, 4 on Very easy, on day 91), so no
fee and no big job; and in `tests/scenarios/turn26.test.ts` the day 53 hall at a standing of 60
takes Bookcases x 233 (210,000, wanting four) on day 106, stands its four by for the drawings to
day 127, puts eight men on it, makes it on day 180, 22 working days late, and the bank closes the
company on day 181 with it at the gate (the late days would have taken the whole 108,310 balance).

**T26-D3 Cross check.** Section 7, point by point, each asserted: the two greps (kept as
`tests/engine/turn26CrossCheck.test.ts`; the trades are named in the migration and its test alone,
`helper` is the id and the sheets); no two figures on a cell, every man at his family, and the CNC
holding the men whose turn it is up to its places on the day 53, 128 and 149 halls
(`tests/render/noSharedCells.test.ts`); the walk from the bench to the saw and the stepped walker
behind the moulder (`walkBetween`, `depthBehind`); one machine hour a clock hour with three and more
at the CNC (`placesAreCapacity`); the ninth joiner and nobody else (`staffCrewLimit`); the draftsman's
grades (`draftsmanSurvey`, `team`); a month of ratings at half (`companyBoard`); the fourth contract
(`contractsMax`); the agency (`agency`, `agencyCard`); the Pace head and Nathan's `machines`
(`paceHead`); every scenario green; `git diff main --stat -- src/ui/styles.css` empty.

**T26-D4 Look and shoot.** Ten pictures in `docs/report-t26/`, drawn by the game's own renderer and
UI functions in the game's stylesheet and shot in headless Chromium: the day 53 hall at 13:01 (four
at the CNC, every figure on a cell of his own), Frank behind the moulder at 13:10, a door queue of
four, the CNC's card at `Places: 3 of 8 in use`, the hire cards, the labourer's card, the Pace
sheet's head (0.96 on the stand-in, not Piotr's 2.20), Nathan's `machines`, the agency card off and
on, and the big job red and green. The red never showed in the first shot: the folder inks every
paragraph of a tile, so the colour went on a span inside the line (no new style).
