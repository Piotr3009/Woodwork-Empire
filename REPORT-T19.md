# Report, Turn 19: the men move like men

Woodwork Empire, Turn 19. Built against `CLAUDE.md` of 17.09.2026 (first line "Turn 19").
Branch `claude/zealous-cori-ghbf7j`. `APP_VERSION` v26 to v27, `STATE_VERSION` 15 to 16.

`npm run check` on the finished tree, read off its own exit code: **exit 0**, **173 test files,
1,740 tests** and one todo, up from 168 files and 1,638 tests at the end of Turn 18. Four agents
(one for phase A and phase C, three for phase B in their own worktrees), `npm run check` green on
its own exit code before every one of the twenty commits.

## 0. Blockers, and where the session did not follow the brief to the letter

**Nothing stopped the build.** Everything in sections 2.1 to 2.13 is built, tested and
photographed, and nothing on the "do not" list of section 6 was done. Seven things are worth
Piotr's eye, and every one of them is a decision rather than an accident.

1. **The branch.** The brief's section 5 says "Branch turn-19-the-men-move-like-men from main".
   The session's own standing instruction names `claude/zealous-cori-ghbf7j` as the branch to
   develop on and forbids pushing to any other without permission, so that is the branch this turn
   is on. The base is the tip that carries the Turn 18 merge (PR #18, commit 93959d4) plus the
   Turn 19 brief. Both preconditions were checked against it: the first line said "Turn 19" and
   `APP_VERSION` was `'v26'`. Turn 18's report says the same thing about Turn 18, and `main` in
   this repository is still two commits.

2. **Phase A did more than section 3 lists, on purpose, and the report says which.** Three pieces
   of work were pulled forward into it because they cross a file Turn 13 froze for phase B and
   would otherwise have become notes for the integrator to apply blind: section **2.11** in full
   (it crosses `types.ts` and `constants.ts`), the whole of **`src/ui/sound.ts`** (both B1 and B3
   depend on it and one file cannot be two agents'), and the **actions and click routes** the
   three groups would need. Section 2.11 therefore does not appear on B3's list.

3. **Two bugs older than this turn were found and fixed.** Neither is Turn 19's, and both were
   uncovered by Turn 19's own work rather than looked for. The ledger's merged contract line
   re-stamped an older entry with the current bank and left it where it was, so the running
   balance down the ledger meant nothing from day 8 of every run and a month could close on the
   wrong figure (T19-A3). And Turn 13's rename of the `living` and `ducting` ledger categories
   left the running totals keyed by the old names, so a lifted save printed raw keys at the player
   on the Accounts page (T19-A4). Both touch `src/engine/economy.ts` and `src/engine/migrate.ts`,
   which section 6 fences ("no change to the economy beyond 2.11"): no money moves differently in
   either, and both are reporting faults rather than economy changes.

4. **An adversarial review of phase A's own diff was run, and it paid.** Thirteen claims, four
   survived refutation, and three more were confirmed by hand and fixed anyway. The worst was not
   in Turn 19's code at all: `frame(now)` in `app.ts` asks for the next frame at the **end** of
   itself, so anything that threw inside it stopped the game dead for the rest of the session. It
   has been true since the loop was written; `driveSound` only added a new way to reach it. The
   body runs inside a `try` now and the next frame is always asked for (T19-C1c).

5. **The brief's premise for 2.4 was not what the art does, and B1 says so.** Every delivered
   sprite matches the `SPRITES.md` section 2 canvas to the pixel, and the alpha at the foot point
   of every operator cell is zero. The real cause of Piotr's joiner standing on his bench was
   routing: `STATION_BENCH` had no branch in `stationCell` and fell through onto the man's own
   cell, which for a joiner is his bench's own anchor. The measured half of 2.4 was done as well:
   the cells that put half a man over a machine now carry `out: 1`, with the figures in the table.

6. **`render/doors.ts` imports `play` from `ui/sound.ts`.** That is a new direction of dependency,
   render on ui. B1 took it because the swing lives on the renderer's clock, no engine state
   carries it, and the engine is silent until the first click. The alternative, reporting the
   swing through `hallOneShots` and letting the frame play it, is still available.

7. **Two agents each touched one file outside their own list, and both said so.** B3 edited
   `src/ui/modal.ts`, because `taskStartAction` is the one control a laptop task row carries and
   both its callers are B3's; writing the new button anywhere else would have made two code paths
   for one button. B2's `placeStation` and `stationPlaceAt` went into `production.ts` because
   `stations.ts` was B1's; phase C moved them to `stations.ts` where they belong.

## The tasks

### T19-A1 Housekeeping and v27

- `docs/turn-18-brief.md` written byte for byte out of the Turn 18 merge commit's own CLAUDE.md
  (`git show 93959d4:CLAUDE.md`, 8,930 bytes, verified with `cmp`); the README's archive line and
  its art requests line now name it, `REPORT-T19.md` and `docs/art/REQUESTS-T19.md`.
- `APP_VERSION` is `'v27'` in `src/engine/constants.ts` and nowhere else in `src`;
  `docs/art/REQUESTS-T19.md` lists the seven recordings of section 9, the sprayer's sheet, the
  doors and what is still outstanding from Turns 13 and 17. `public/sounds/` exists with a README
  that says what goes in it and that nothing there is shipped.

### T19-A2 Phase A: the contracts

The six files Turn 13 froze for phase B (`src/engine/types.ts`, `src/engine/constants.ts`,
`src/engine/index.ts`, `src/engine/game.ts`, `src/ui/app.ts`, `src/ui/styles.css`) were all
written in this task and are frozen from here to the end of phase B.

- **State (section 4).** `STATE_VERSION` 15 to 16. `Job.assignedTo` and `Job.secondAssignee` are
  gone; `Job.assignees: string[]` replaces them, the owner as `'owner'`, in the order people were
  put on. `SettingsState.sound: { volume, muted }`. `GameState.hallSetUp: boolean`.
  `WorkerRole` gains `'sprayer'`.
- **The migration.** `liftToVersion16` turns the two old fields into the list (first man first,
  second man second, the same man never twice), deletes them, sets the sound to
  `SOUND_VOLUME_DEFAULT` unmuted, and sets `hallSetUp` true when anything unsold stands in the
  hall. Every v26 save loads; `tests/cloud/migrate.test.ts` drives the chain from v18 up.
- **The list, read everywhere.** Every one of the 40 reads of the two old fields in `src` was
  converted by hand, not by a rule: `leadAssignee(job)`, `isOnJob(job, who)`,
  `removeAssignee(job, who)` and `jobMen(job)` are the readers, and `jobMen` is now the list
  itself. `grep -rn "assignedTo\|secondAssignee" src` answers with the migration and two comments
  and nothing else (section 7's first grep).
- **New engine writes, so phase B never needs a frozen file.** `addToJob`, `takeOffJob` and
  `canBuild` in `jobs.ts`; `queueTaskNext` in `tasks.ts`; the actions `ADD_TO_JOB`,
  `REMOVE_FROM_JOB`, `QUEUE_TASK_NEXT` and `SET_SOUND` in `types.ts` with their routing in
  `game.ts`.
- **The sprayer's constants.** `SPRAYER_MONTHLY_WAGE` (2,300 / 2,700 / 3,100 [TUNE]),
  `SPRAYER_REPUTATION`, `JOINER_SPRAY_RATE` 0.7 [TUNE], `SPRAYER_SPRAY_RATE` 1.0,
  `SPRAYER_BENCH_RATE` 0.6 [TUNE], and three rows in `HIRING_SPECS` on the workshop tab.
- **The sound engine.** `src/ui/sound.ts` is written in phase A and not in phase B, because both
  B1 (the hall's hooks) and B3 (the Settings side) depend on it and one file cannot be two
  agents'. It carries the `SOUNDS` table, the Web Audio graph built on the first click, the
  synthesised stand ins, the master gain, the one shot thinning and an injectable context factory
  for the fake context test. `app.ts` unlocks it on the one click handler and drives it once a
  frame from `hallLoops(state)` and `hallOneShots(state)`, which `render/hall.ts` computes.
- **`hallSetUp`** is set in `endSetup` the first time setup mode is left with anything unsold in
  the hall. The first steps line that reads it is T19-B3b's.
- **`styles.css`** gained the Turn 19 class names with empty rules, as Turn 13's phase A rule asks.

`npm run check` exit 0: 168 files, 1,638 tests.

### T19-A3 Design time from the value (2.11), and a ledger bug it uncovered

**2.11.** `designMinutes(basePrice, tier)` in `tasks.ts` is now
`round(max(DESIGN_MIN_MINUTES 30, DESIGN_MINUTES_PER_1000 24 * basePrice / 1000) * softwareFactor)`.
The per product `designMinutes` is gone off `ProductTemplate` and off all nine product rows, and
the size multiplier is no longer read for drawing time at all: a job's price already carries its
size, and two figures for one thing is what made a set of shelves cost a day at the desk. Piotr's
three figures hold: GBP 2,500 is 60 minutes, GBP 10,000 is 240, GBP 20,000 is 480, and the floor
is 30. The software still divides (basic 1.0, standard 0.5, pro 0.2), so GBP 2,500 on pro is 12
minutes.

This was done in phase A rather than by B3, because it crosses `types.ts` and `constants.ts`,
which are frozen for phase B. B3's list is section 2.9, 2.12, 2.13 and the Settings side of 2.10.

**The ledger bug.** The shorter drawings changed the playthrough's path and the three month
report stopped adding up: month 2 closed 38 out. It is not a Turn 19 bug; it is as old as the
standing contracts' merged ledger line (Turn 13 3.16), and the new path simply walked into it.

`addLedger`'s merge branch finds the day's open line for the same category and words, adds the
piece to it, and re-stamps it with the bank and the minute of *now*. The entry stayed where the
day's first piece had put it, so it held a later balance than every entry written after it. The
running balance down the ledger meant nothing from day 8 of the run, and a month whose last piece
was booked after its last other entry closed on the wrong figure.

Fixed in two places, and no money moves differently:

- `addLedger`: a merged line is moved to the end of the ledger, where its own new stamp says it
  was written. The day still holds one line per contract, which is the whole point of the merge.
- `monthReport`: the bank at the open and at the close are read off the ledger's written order
  (where `balance` means something), and the lines the player reads down the page off the clock.
  Reading both off the sorted list was the second half of the same mistake.

The playthrough's month end reconciliation passes on all three months.

**Two scenario figures re-measured**, both a direct consequence of 2.11 and both recorded with
their reason in the test:

- `thirtyDays`: the owner's day 2 is 300 minutes, not 332. The day's small piece is drawn in the
  half hour the floor sets instead of the hours the template asked for.
- `turn13 (w)`: the night shift works 2 nights, not more than 3. The desk is no longer the
  bottleneck, so this script draws its whole book in the first days, thirteen of the fourteen
  jobs are finished by day 5 and the rack is down to one sheet: there is nothing for the night
  man to stand at. The claim the test is really making, that the premium is paid for every
  working day the shift was on whether or not he had work, is untouched and still passes.

`npm run check` exit 0: 168 files, 1,638 tests.

### T19-A4 A second migration bug, found by reviewing phase A

An adversarial review of the phase A diff turned up one more defect in the migration, again older
than this turn. `liftToVersion14` renames the ledger's `living` category to `ownerDraw` and
`ducting` to `pipes`, but `finance.day`, `finance.week` and `finance.month` each carry a
`byCategory` record keyed by the same names, and it was left alone. `categoryLabel` in the
Accounts modal has no word for either old name and falls back on the key, so a lifted v19 save
printed `living` and `ducting` at the player as row labels.

The lift now renames the three periods' totals with the ledger, adding the old name's figure to
the new name's when a period already carries both. A period with neither is left exactly as it
was. `tests/cloud/migrate.test.ts` gained a case covering all three.

`npm run check` exit 0: 168 files, 1,639 tests.

### T19-B1a The movement (2.1)

- Diagnosed first and in its own commit, then fixed: the whole of it is the section **The
  movement** below, with the before log, what was measured, what was changed and the after log.
  The four causes were the whole pixel transform (144 frames of 240 with no movement in x at all),
  the walk sheet playing 1.67 times faster across the floor than its own stride, the facing read
  off every cell instead of off the leg, and the render that runs inside the same frame as the
  walker and put a walking man back to his station's face and to frame 0 up to thirty times a
  second.
- After the fix: no frame of a second's walking stands still, the step is the same 0.4 px by
  0.2 px every frame, a twelve cell staircase is walked with one facing and an L turns him once at
  its corner, the walk plays at 5.7143 fps instead of 3.4286, and a page written in the middle of a
  leg changes neither the facing, nor the frame, nor the mirror, nor the place. Two tests outside
  this task's files were re-measured, one line each and both named in the section.

### T19-B1b At the bench, not on it (2.4)

- The brief's premise was measured and is not what the art does: every delivered PNG is exactly
  the canvas `docs/art/SPRITES.md` section 2 gives its footprint, to the pixel, and the alpha at
  the foot point of every operator, waiting and second cell of every family is zero. The real
  cause of Piotr's joiner standing on his bench is a routing one: `STATION_BENCH` had no branch in
  `stationCell` and fell through onto the cell the engine keeps for the man, which for a joiner is
  his bench's own anchor cell, a cell the bench stands on. The helper's corner is the fan's anchor
  cell and was the same bug. One fix for both: whatever item a man's own cell belongs to, the
  station table says where to stand at it.
- The second half is the measured one: the cells at the right hand end and the middle of a front
  edge put the man where the body leans on this 2:1 dimetric, so half to four fifths of him was
  painted over the machine. Those cells carry `out: 1` now, with the table below; the bench's own
  operator and second places are deliberately left where they are. `queueCellsAt` and
  `benchCellsAt` are exported from `stations.ts` for 2.5's queue of men.

#### The sprite table (family, sprite extent, footprint, cell chosen)

Measured by decoding every delivered PNG and sampling its alpha through the exact `spriteBox`
placement the hall draws with: "floor" is how much of a cell's floor diamond opaque sprite pixels
cover, "foot" is the alpha at the cell centre, which is where the figure's feet go, and "man over"
is how much of a 1.8 m joiner standing on that cell is painted over the machine, composited from
`character.joiner.bench.sheet.png` at the facing the station table gives him.

| family.class | footprint | sprite file | canvas the contract asks for | cell chosen | floor / foot | man over, at the table | man over, a cell out |
|---|---|---|---|---|---|---|---|
| tableSaw.used | 2x1x1 | 160x136 | 160x136 | operator, front right, **out 1** | 0% / 0 | 67.8% | 0.0% |
| tableSaw.budget | 2x1x1 | 160x136 | 160x136 | operator, front right, **out 1** | 0% / 0 | 33.1% | 12.1% |
| tableSaw.standard | 3x1x1 | 208x160 | 208x160 | operator, front right, **out 1** | 0% / 0 | 62.1% | 16.8% |
| tableSaw.pro | 3x2x1 | 256x184 | 256x184 | operator, front right, **out 1** | 0% / 0 | 64.2% | 36.2% |
| tableSaw.industrial | 4x2x1.2 | 304x217 | 304x217 | operator, front right, **out 1** | 0% / 0 | 60.3% | 9.7% |
| edgebander.standard | 3x1x1.2 | 208x169 | 208x169 | operator, front along 1, **out 1** | 5.0% / 0 | 68.8% | 7.3% |
| edgebander.pro | 3x1x1.3 | 208x174 | 208x174 | operator, front along 1, **out 1** | 12.3% / 0 | 43.3% | 10.6% |
| edgebander.industrial | 4x1x1.4 | 256x203 | 256x203 | operator, front along 1, **out 1** | 3.8% / 0 | 65.6% | 15.2% |
| workbench.standard | 2x1x0.9 | 160x131 | 160x131 | operator, front along 0, out 0 (kept) | 2.8% / 0 | 18.9% | 0.0% |
| workbench.standard | 2x1x0.9 | 160x131 | 160x131 | second, back right, out 0 (kept) | 30.9% / 0 | 9.4% | 0.0% |
| workbench.standard | 2x1x0.9 | 160x131 | 160x131 | waiting, front right, **out 1** | 0% / 0 | 59.3% | 11.2% |
| workbench.industrial | 3x1x0.9 | 208x155 | 208x155 | operator, front along 0, out 0 (kept) | 23.8% / 0 | 15.8% | 0.0% |
| sheetRack.standard | 2x1x1.8 | 160x174 | 160x174 | free side, middle, **out 1** | 0% / 0 | 52.2% | 2.4% |
| sheetRack.pro | 3x1x2 | 208x208 | 208x208 | free side, middle, **out 1** | 0.9% / 0 | 67.8% | 24.5% |
| sheetRack.industrial | 4x1x2.2 | 256x241 | 256x241 | free side, middle, **out 1** | 12.0% / 0 | 83.2% | 26.7% |
| extractor.standard | 2x1x2 | 160x184 | 160x184 | free side, middle, **out 1** | 0% / 0 | 52.5% | 0.3% |
| extractor.pro | 3x1x2.5 | 208x232 | 208x232 | free side, middle, **out 1** | 15.8% / 0 | 68.6% | 3.7% |
| compressor.standard | 2x1x1.5 | 160x160 | 160x160 | operator, front along 0, out 0 (kept) | 2.8% / 0 | 0.0% | 0.0% |
| compressor.standard | 2x1x1.5 | 160x160 | 160x160 | waiting, front along 1, **out 1** (default row) | 0.9% / 0 | 70.3% | 0.1% |
| pelletiser.standard | 2x2x2.5 | 208x232 | 208x232 | default row, front along 0 | 0% / 0 | 0.0% | 0.0% |
| dustSystem / flexiSystem | 3x2x4 | 256x328 | 256x328 | default row, front along 0 | 0% / 0 | 0.0% | 0.0% |
| thicknesser, spindleMoulder, cnc, sprayBooth, solidWoodTools, drill | 2x1x1 to 4x3x2 | no file | - | see below | n/a | n/a | n/a |

Not one delivered file is bigger than the canvas the contract gives it, and the foot alpha is zero
everywhere: no man's feet were ever inside a drawn body. Six families have no picture at all and
are drawn as the placeholder box or the extruded footprint, which never leaves the diamond, so
their rows can only be chosen by geometry: `cnc.operator` and `sprayBooth.operator` take `out: 1`
because they are the saw's geometry (the right hand end and the middle of a front edge);
`thicknesser` keeps its left end, along the machine, which is where the man feeds it;
`spindleMoulder` keeps the left of its front edge, which is the bench's own geometry and measured
at 15 to 19%.

A man is 28 px each side of his feet and 71.5 px above them and a cell is 48 by 24, so he overlaps
something at every cell in the hall. `out: 1` takes the worst cases from 60 to 83% down to 0 to
27%; it does not take them to zero and nothing here promises that.

### T19-B1c The doors open, and the owner is in both rooms (2.3 and 2.2)

- **2.3.** `roomDoor` draws the office door and the canteen door as a dark opening in the face with
  a leaf hung on the left jamb, in three states: flat in the face, forty five degrees out, and
  square out into the hall, which is the way the room doors open (`SPRITES.md` 9.3). All three
  leaves are in the markup and the stylesheet shows the one `data-door-state` names, so the swing
  costs a render nothing. The driver is `src/render/doors.ts`, the walker's own shape and for the
  walker's own reason: the hall says what each door wants off the state, the driver says when, and
  it puts its phase back after every render because the patch writes every attribute back. A man
  arriving opens it over `DOOR_SWING_MS`, a door with somebody in it never leaves open, and one he
  has left waits `DOOR_CLOSE_MS` and then swings back. Each step plays `door` from the sound
  engine: `doors.ts` calls `play` from `src/ui/sound.ts` directly, which is a new dependency of
  `render` on `ui` at run time and the one this turn takes, because the swing is the renderer's own
  clock and no engine state carries it; the engine is silent until the first click unlocks it, so
  nothing plays before then. The door is its own drawable, keyed off the cell a man stands in it
  on, so an open leaf is painted in front of the wall and behind him. Only the office door carries
  `data-door`, because only the office door is a control: the canteen block still answers a click
  with its own note, which giving it the control's hook would have taken away.
- **2.2.** In the hall nothing had to change: the owner at the office or the phone already stands
  on `roomDoorCell('office')` facing in, and nothing anywhere drops a figure for being at a desk.
  What was missing was the office view, which drew no people at all. `officeFigure` puts him on the
  canvas in the live part, so sitting down never rebuilds the room, at `OFFICE_OWNER_BOX` [TUNE],
  measured off the picture: the strip of wall between the Work Plan board and the laptop on the
  desk, his feet at the floor line behind the desk's far edge. The room is drawn from the owner's
  own chair, so he cannot be at the desk without standing in front of his own eyes; at the wall
  behind it is the readable compromise, and a test holds the box clear of every region the player
  clicks. The tests are the three door states and their geometry, the swing on a fake clock, the
  hall with him in the open doorway, and the office with him at his desk. 2.3's "Done" also asks
  for an app test that the door opens when the owner goes to the office and closes when he comes
  out: the swing is driven from `app.ts`, which is frozen for phase B, so `NOTES-B1.md` carries
  the four lines that wire it and the swing is tested here against the real hall markup instead.
  Until those lines land the doors are drawn in the state the hall computes for the frame, open
  with a man in the doorway and closed without one, and they do not swing.

### T19-B1d The hall's own sound (2.10, the hooks)

- Phase A's first versions were checked against the real state and three were wrong. The spray
  booth was hooked to "a lacquered job is at its finishing stage", which is heard in a workshop
  that owns no booth and therefore cannot spray at all: it is now `takenBy` on a booth, the same
  predicate as the saw. The extraction was hooked to a machine that wants a pipe being in use,
  which says nothing about the fan: it is now the extraction item's own `machineInUse`, which is
  exactly what makes its fan breathe on the hall, so what is heard and what is seen cannot
  disagree, and a broken or sold unit is silent. And the bench sounds read `assignees[0]`, which
  can be a man who is off sick: they now take the first man on the job who is actually at work.
  The saw was right and is unchanged: `takenBy` on an unbroken saw standing in the hall.
- The brief's "fitting" is not a stage in this code. `StageId` is cutting, machining, cnc,
  assembly, finishing and delivery, and the fitting of a carcass, its hinges and its runners,
  happens inside assembly, so the drill is hooked to assembly beside the hammer and the code's own
  names are used. Two figures phase A put in `constants.ts` are still dead: `HAMMER_EVERY_SECONDS`
  and `DRILL_EVERY_SECONDS`. Both one shots fire at the shared `SOUND_ONE_SHOT_GAP_MS` of one
  second instead of the brief's "every few seconds"; the thinning is the engine's and the engine is
  B3's file, so it is written up in `NOTES-B1.md` for whoever lands 2.10's engine side.

### T19-B2a Assign to this job, no limit (2.5)

- `Job.assignees` is now the only list anybody reads, and the Work Plan row draws it as chips with
  a cross apiece beside one blue `Assign to this job` button, exactly as variant A of
  `docs/mockups/t19` draws it. The list behind the button offers you, every joiner and every
  sprayer, with a man already on this job greyed as "already on this job", a man on another greyed
  with that job's name, the helper greyed with "helpers do not build", and no limit at all on how
  many go on one job. The Turn 17 "on it: You | Gary" chips and the "Second man: Alone | Gary"
  line are gone from the row, and so is the "on it:" text in the head, which said the same thing a
  third time.
- **The rule for the men and the machines, in one sentence:** one machine is one man's, so a stage
  at a machine goes at the speed of the man who holds it however many are on the job, and everyone
  else stands in the queue and books nothing into that stage; a bench stage gives every man on the
  job his own full minute at his own rate, so three men on assembly go three times as fast. The
  tests assert both: three men and one saw cut at one man's speed to four decimal places, and the
  same three assemble at more than two and a half times one man's.

Also in this task, three places where phase A's straight conversion of the two old fields was too
wide, all of them the same shape: `releaseJob` empties the whole list now, so calling it to take
ONE man off took everybody off. `assignJob` (the previous job the new man was on), `takeOverJob`
(the job the owner steps off), `staff.hurtWorker` (the man who has had an accident) and
`contracts.assignToContract` (the man put on a standing contract) all use `takeOffJob` instead,
which frees his machines, clears his `jobId` and drops the job back to `'ready'` only when the
list actually empties. `releaseJob` is left for what it now means, everybody off: `completeJob`
and `assignJob(jobId, null)`.

`endOwnerTakeOver` read `assignees[1] === OWNER`, so an owner who had been added third or tenth
was never taken off at dusk. There is no state to record the takeover with (`types.ts` is frozen),
so it is derived instead, and deliberately: **the evening gives back every job the owner is on
that somebody else leads**, wherever he stands in the list, and never a job he leads himself.
`ownerTookOver` is the same predicate and the row's "You are on it tonight" reads off it.

Three more judgement calls, all recorded here rather than guessed at later. The list prints the
game's own tier words, "poor / normal / super joiner", and not the mockup's "ok" and "good": Our
team has said poor, normal and super since Turn 6 and two vocabularies for one thing is what 2.9
is fixing elsewhere tonight. `assignSecond` is kept as a shim over `addToJob` and `takeOffJob`,
because `ASSIGN_SECOND` lives in the frozen `types.ts` and `game.ts`; the three of them go
together in phase C (NOTES-B2.md 2). And the third man and beyond get a station string of their
own, `place:<equipmentId>:<n>`, place 0 being the operator's cell, 1 the waiting cell or the
bench's second place and 2 upward the free cells along the same side; the renderer's half of that
is NOTES-B2.md 5, so until phase C lands it a third man is still drawn on the first man's cell.

The whole of the Assign list is inert in the running game until the four click routes of
NOTES-B2.md 1 are applied to `src/ui/app.ts`, which is frozen. `tests/ui/app.test.ts` (not B2's
file) asserted a click on the old `assignJob` chip; it now asserts the new markup instead, and
goes back to clicking when that note lands.

### T19-B2b The sprayer (2.6)

- A `sprayer` is hired off the Workshop tab like a joiner, in three tiers, paid by the month at
  `SPRAYER_MONTHLY_WAGE`, listed in Our team as "sprayer, normal" and counted against the floor's
  crew limit. The Assign list of 2.5 offers him for every job and prints "sprayer" beside his name
  so the player sees who is who. He is drawn as a capsule until his sheet is delivered, which
  wanted no code: a role with no character sheet falls to `capsuleBody` on its own.
- The one new mechanism is `tradeFactor(role, family)` in `stages.ts`, beside `labourPerMinute`:
  a sprayer is worth `SPRAYER_SPRAY_RATE` at the booth and `SPRAYER_BENCH_RATE` anywhere else, and
  a joiner, or the owner, is worth `JOINER_SPRAY_RATE` at the booth and his whole rate everywhere
  else. It multiplies the man's rate and never the machine's speed, so nothing about Output or the
  rate changes away from the booth (CLAUDE.md T19 6). The cross check of section 7 is asserted:
  the same lacquered wardrobe at its finishing stage takes labour faster with a sprayer on it than
  with a joiner, in the ratio of the two rates to four decimal places, and the joiner alone still
  finishes it.

A joiner's whole path through the code, checked place by place, and what was decided for each.
**In:** `WorkerRole`, `HIRING_SPECS` (three tiers, phase A), `TRADE_OF_ROLE` and `ROLE_WORDS`
(phase A), `FLOOR_ROLES` so the floor counts him, `benchAnchor` so he stands at the booth and not
at (1, 1), which is inside the office block, `BUILDING_ROLES` so the Assign list offers him and
`addToJob` takes him, and `production.hands` so his minutes reach a job at all.
**Out, and why:** `shortfallForHire` still returns nothing for him, so no bench, locker, seat,
cabinet or tool set is bought before he starts and he can be hired into a hall with no booth,
where he will simply spray nothing [TUNE: the brief asks for no gate and a booth gate would block
the (bb) scenario]. `availableJoiners` and `autoAssignJobs` are joiner only, so the hall never
hands him a job by itself: the player puts him on one. `shiftOf` keeps him on the day, so he is
never on the night shift, which is right as it stands because `nightPremiumFor` divides a weekly
wage and his is nought. `contractAssignCheck` stays joiner only: a standing contract is saw work.
`HELPER_REQUIRED_FROM_JOINERS` counts joiners only, so he does not pull a helper into the hall.
He takes no `cleaning`, `unload` or `emptyBags`: those are the helper's.

One defect fixed while passing: `jobLabourCost` priced a man's minutes off his weekly wage, which
is nought for anybody paid by the month, so the job card would have quoted a sprayer's labour at
nothing. It reads the monthly wage over `WEEKS_PER_MONTH` when the weekly one is nought.

The day shift still does not run him: `game.ts` carries a hand written second copy of the hand
list and the labour arithmetic, and it is frozen. The three lines are NOTES-B2.md 6, and one of
them (`possibleSeats`) is a silent wrong if it is applied without the others, so they are named
together. The engine's own path, which the night shift and every engine test drive, is right.

### T19-B2c The labourer cleans, and the bench can be sold (2.7, 2.8)

- **2.7.** The brief's premise is out of date: the engine half of T17 2.3 did land and works.
  `runHelperClean` raises the cleaning task itself the moment the hall's dust passes
  `HELPER_CLEAN_DUST_BAND`, which is the band the Clean up chip appears for, and the helper takes
  it at his next free minute. What was missing is the chip: the hall still read "The hall is
  dirty, somebody will get hurt in this" with a Clean up button on it while the labourer was
  already sweeping, so the player was still being asked. `cleanerAtWork(state)` in `tasks.ts` is
  the one selector that says who is sweeping this minute; the sentence and the dropped button are
  `render/hall.ts` and `src/ui/app.ts`, neither of them B2's, and both are written out in
  NOTES-B2.md 7. **"Once per dirtying" needed no new field:** an open cleaning task IS the flag,
  because `ensureTask` raises one and only one while the dust is up and finishing it puts the dust
  back to nought, so the band is clean again until the hall dirties afresh. The tests assert the
  brief's two claims: a hall that turns dirty with a helper on the books is clean again by the end
  of the day with no action from the player, and without a helper no cleaning task is created at
  all.
- **2.8.** `isSellableFamily` admits the bench, which is the whole of it: the rest of the sell path
  was already family blind, so the Owned tab and the bench's own card draw Sell at the catalogue's
  own resale rule (`SALE_FRACTION`, or `SALE_FRACTION_USED` for one bought second hand) and
  `canSell` refuses a bench somebody is standing at with "Somebody is standing at it", because a
  man holds his bench from the first minute of a job to the last and lets go of it when the day
  ends. No new constant, and no second code path.

Two judgement calls. The refusal is drawn the way every other family's has been drawn since Turn
8, as `Cannot sell it: <reason>` in place of the button, rather than as a greyed button: it is one
code path, it is the wording the player already knows, and a disabled button is the one thing
`lockedButton` is reserved for. And the hall's own click on a bench still does nothing, because
the category gate that opens a machine's card lives in the frozen `src/ui/app.ts`; the three line
change is NOTES-B2.md 8, and until it lands the Sell is reached from the Owned tab.

One cross section flag for phase C. `src/engine/warnings.ts` still reads `has(state, 'workbench')`
as "the hall has been set up", so a workshop that sells its last bench would flip the first steps
line of T18 2.7 back on. T19 2.13 (`state.hallSetUp`, B3's) removes that read. If 2.13 lands there
is nothing to do; if it does not, this is a blocker. `warnings.ts` is not B2's file and was not
touched.

### T19-B3a Reputation is a total, and the board says so (2.9)

- The Reputation sheet's headline is the total and nothing else: the label over the figure was
  `this week` and is now `the total to date` [TUNE], the figure is still `effectiveReputation`, and
  the heading with the figure reads the same `Reputation 40` the office wall prints off
  `companyTotals`, asserted against it so the two can never drift. The `Start of the week, carried
  over` row is gone, the list's head is `What moved it this week`, and the weeks before this one
  keep their `Week N` labels under it: the brief takes away the weekly reading, not the history
  Turn 15 built the sheet around.
- The arithmetic at the bottom is the week's own pluses and minuses, then the week's net in its own
  span (`−5 this week`, `+0 this week`) beside the total, which holds the whole `Reputation 40`.
  The net is never in the total's place and the total never carries a week's wording, which was the
  whole of Piotr's complaint. The rows no longer add up to the figure at the top and are not meant
  to: the log is trimmed at `REPUTATION_LOG_MAX`, so no honest sum of the visible rows could reach
  it. `tests/ui/companyBoard.test.ts` carries five cases, including a bad week that leaves the
  total standing. `npm run check` exit 0: 168 files, 1,639 tests.

### T19-B3b Add as next, and the hall has been set up (2.12, 2.13)

- **2.12.** A laptop row whose Start the engine refuses with `Busy with X` used to offer
  `Put that down`, which is what Piotr was pressing all evening: the only way to get at a second
  job of work was to drop the first. It now offers `Add as next`, which dispatches
  `QUEUE_TASK_NEXT` and puts this one behind the one in his hands; the running row's own button
  is relabelled from `Pause` to `Put that down`, which is what the brief calls it, and keeps
  `data-do="pauseTask"`. A row already in the queue reads `Next in the queue` with no button, so
  the button is never pressed twice for nothing. `Add as next` is offered on that one refusal and
  no other: `queueTaskNext` does not ask `startTaskCheck`, so a job of work refused for a licence
  or a full rack would sit at the head of the queue and stop everything behind it. The change is
  one function, `taskStartAction` in `src/ui/modal.ts`, so the Drawings page gets the same button
  on the same terms, which is right: the Drawings page is on the laptop.
- **2.13.** `firstStepsWarning` reads `state.hallSetUp`; `hallIsSetUp` and its hunt for a
  workbench are gone, and `has` with them. The line no longer says the hall is set up the moment
  the day 1 kit is delivered, before the player has put anything down. Two blockers for phase C,
  both written out in `NOTES-B3.md`: `src/ui/app.ts` has no `case 'queueTaskNext':`, so the new
  button is inert until phase C adds the four lines given there, and the tests assert the markup
  and the engine's half rather than the click; and `src/ui/modal.ts` is not on B3's own list and
  was edited anyway, because both callers of `taskStartAction` are B3's and writing the button
  anywhere else would have made two code paths for one button. `npm run check` exit 0: 168 files,
  1,644 tests.

### T19-B3c Sound: the Settings side, the table's cadences and the fake context test (2.10)

- **Settings.** Two rows in the shape of the tips row above them: a mute (`On` / `Off`, one chip
  lit, `data-do="setSound"`) and a volume (`Quieter`, the figure, `Louder`, `data-do="setVolume"`,
  each step carrying the volume it would set). No slider: every control in this game is one click,
  the stylesheet has no rule for a range input anywhere, the page is written again every frame and
  a thumb held on a thumbnail does not enjoy that, and a stepper can print the volume itself
  (`70%`) instead of the nearest of a handful of named steps, which `SOUND_VOLUME_DEFAULT` 0.7 is
  not. `VOLUME_STEP` 0.1 [TUNE] lives in `settings.ts` because `constants.ts` is frozen; the end
  of the travel is the one allowed disabled button with its reason on it, so neither step is ever
  a click that does nothing. `src/ui/app.ts` is frozen and has no route for either control: the
  two cases are written out in `NOTES-B3.md` and the tests assert the markup, not the click.
- **The engine, read right through, and three things put right.** The hammer and the drill now
  read `HAMMER_EVERY_SECONDS` 3 and `DRILL_EVERY_SECONDS` 4 through a new optional `gapMs` on
  `SoundSpec`; both were dead exports and the brief asks for knocks every few seconds, not every
  second. A finished one shot now lets go of its own nodes through `onended`, so an hour of
  knocking no longer leaves an hour of finished gains hanging off the master. And a mute now takes
  the running loops down as well as putting the master to nought: it used to leave them in the
  engine's list, so the list said the saw was going while nothing could be heard, and a loop that
  could not start while the mute was on was left out when it came off. `tests/ui/sound.test.ts`
  (14 cases, a hand rolled `AudioLike` fake through `setAudioContextFactory`) proves the context
  is never so much as built before `unlockSound`, that the volume reaches the master gain, that
  mute silences everything and unmuting brings it back, that `setLoops` runs exactly the hall's
  loops and stops the ones that drop out, that the saw is heard only while somebody is at it, that
  a one shot offered every frame comes out twice in four seconds, and that with no recordings in
  `public/sounds/` every sound in the table falls back to its stand in and none of them throws.
  `npm run check` exit 0.

### T19-C1a Phase B3 merged, and its notes applied

`turn-19-b3` merged. The six changes B3 wrote into `NOTES-B3.md` because they fall in a file Turn
13 froze for phase B are applied here, by the integrator, exactly as written:

- `src/ui/app.ts`: `case 'setSound'` and `case 'setVolume'` beside `setTips`, and
  `case 'queueTaskNext'` beside `doTheseTasks`. Until these landed the three new controls drew
  correctly and did nothing when pressed, which is why B3's own tests assert the markup and the
  engine's half rather than the click.
- `src/engine/constants.ts`: `TIPS.settings` no longer says "Nothing else here tonight", which
  stopped being true the moment the sound rows landed.
- `src/ui/styles.css`: the four rules phase A left empty for 2.9, 2.10 and 2.12 are filled.

B3 also edited `src/ui/modal.ts`, which was not on its list, and said so: `taskStartAction` is the
one control a laptop task row carries and both its callers are B3's, so writing the new button
anywhere else would have made two code paths for one button. Accepted.

`npm run check` exit 0: 169 files, 1,661 tests.

### T19-C1b The clicks B3 could not test, now that the routes are in

B3's three new controls had no `data-do` route while `src/ui/app.ts` was frozen under it, so its
own tests assert the markup and the engine's half and stop short of the click. With the routes
applied, four cases are added that press them the way the player does:

- `tests/ui/settings.test.ts`: the mute goes on and off from the row and the lit chip follows the
  setting; the volume steps down and up by `VOLUME_STEP` and stops at nought with the last step
  disabled rather than dead; the one cross still closes the modal.
- `tests/ui/laptopPages.test.ts`: `Add as next` on a second job of work leaves the running one in
  the owner's hands, puts the second in `taskQueue`, and takes its own button off that row.

The laptop case sits at the end of its block on purpose: these tests drive one mounted game in
sequence, and a case that leaves a task running changes what the next case can click.

`npm run check` exit 0: 169 files, 1,665 tests.

### T19-C1c Three defects in the sound engine and the frame loop, from the review

An adversarial review of phase A's own diff found three, all real, all now fixed with a test each:

1. **`unlockSound` latched before it knew there was anything to play through.** `unlocked = true`
   was set above the null check, so one first click that could not build a context (a browser with
   audio off, a page in a sandboxed frame) left the game silent for the whole session with no
   second try. The latch goes down on success now, and the next click gets its own go.
2. **A stand in that could not be built leaked a gain, once a frame, for ever.** `standInFor`
   connected its gain to the master before asking for the noise buffer and returned null without
   letting go of it; a loop that cannot start is asked for again on the next frame, so a context
   whose `createBuffer` throws built 121 master-connected gains in 60 frames and disconnected
   none. It disconnects on the way out now.
3. **Anything that threw inside the frame killed the game.** `frame(now)` asks for the next frame
   at the end of itself, so one exception meant no figure moved, no minute ran and no page was
   written again for the rest of the session. This is older than Turn 19 and `driveSound` only
   added a new way to reach it. The body is `runFrame(now)` now, called inside a `try`, and the
   next frame is asked for whatever happened. A third fix went with it: `noiseBuffer` dereferenced
   the buffer outside its own `try`, so a context that answers with `undefined` threw a TypeError
   rather than falling back.

`npm run check` exit 0: 169 files, 1,668 tests.

### T19-C1d SET_SOUND refuses a volume that is not a number

Clamping alone let `NaN` through, because `Math.max(0, NaN)` is `NaN`, and a `NaN` on the master
gain throws in Web Audio, which before T19-C1c would have taken the whole frame loop with it. The
action tests `Number.isFinite` now. A test covers `NaN`, `Infinity` and both ends of the clamp.

### T19-C1e B2's frozen file notes applied: the assign list can be clicked

`turn-19-b2` merged, and the changes B2 wrote into `NOTES-B2.md` are applied:

- `src/ui/app.ts`: `openAssign`, `closeAssign`, `assignAdd` and `assignOff`, with `ui.assignOpen`
  and `renderWorkPlan(state, dropConfirm, assignOpen)`. **Until this landed the whole of 2.5 drew
  correctly and could not be clicked**, which is why B2's own tests assert the markup.
- `src/ui/styles.css`: the ten rules phase A stubbed for 2.5, with `position: relative` on
  `.plan-head` so the list sits over the row rather than in the flow of it. B2's figures were kept
  except the two pixel font sizes, which the type scale test rightly refuses: they read the
  `--fs-small` and `--fs-tiny` tokens.
- `src/engine/index.ts`: `BUILDING_ROLES`, `canBuild`, `jobMen`, `addToJob`, `takeOffJob`,
  `tradeFactor`, `SPRAY_BOOTH`, `cleanerAtWork`, `placeStation` and `stationPlaceAt` go out
  through the barrel, so `jobCard.ts` stops reaching round it.
- `src/engine/game.ts`: the day's own hand loop, which Turn 13 declined to fold into
  `production.ts`, now reads `BUILDING_ROLES` rather than `role === 'joiner'` in both
  `handsAtWork` and `possibleSeats` (the second is the efficiency denominator, and missing it
  would have read the day's Efficiency low with no cause line), and `runProductionMinute`
  multiplies by `tradeFactor`. Without these three the sprayer sprayed on the night shift only.
- `src/ui/spriteCheck.ts`: the sprayer joins `CHARACTER_ROLES`, so the sprite check page asks the
  art side for his frames.
- **The second man's action is deleted.** `ASSIGN_SECOND`, its case in `game.ts`, its re-export
  and the shim B2 left in `jobs.ts` all go together: a job carries a list now and the second man
  is simply the second name on it.

### T19-C1f B1's frozen file notes applied: the doors swing

`turn-19-b1` merged, and the four changes B1 wrote into `NOTES-B1.md` are applied:

- `src/ui/styles.css`: the door's three leaves and its dark opening, with exactly one leaf shown
  per state, so a swing is one attribute on the door and never a piece of the page built again.
  Without them every door drew all three leaves at once. `.office-figure` gets
  `pointer-events: none`, which is not decoration: the live slot is the last child of the office
  stack, so without it the owner at his desk ate every click in the room.
- `src/ui/styles.css`: the stale Turn 2 comment promising that "a figure slides between its
  stations" is deleted. There is no such rule and there must not be one: a CSS transition on the
  transform would fight the walker's per frame write and lag a man behind his own feet.
- `src/ui/app.ts`: `syncDoors` after the figures in `render`, `stepDoors` beside `stepWalkers` in
  the frame, and `resetDoors` beside every `resetWalkers`. Until this landed the doors were drawn
  in whatever state the hall computed for the frame the page was built in, and never swung.

B1's fifth note, the hammer's and the drill's own cadences, was already done: B3 had put `gapMs`
on the `SOUNDS` row while B1 was writing the note.

**One cross group failure, and it was the test that was wrong.** B3's sound test asserted that a
lacquered job at its finishing stage sounds the booth. B1's reading of the hall is stricter and
right: the booth hisses while somebody is standing at a booth, not while a lacquered job happens
to be at that stage, because a workshop with no booth cannot spray and must not be heard to. The
test now builds the booth and puts a man at it, and asserts the silence at each step on the way.

`npm run check` exit 0: 172 files, 1,728 tests.

### T19-C1g B2's last three notes: the third man's cell, the cleaning chip, the bench click

- **The third man stood on the first man's cell.** B2's engine gives every man past the second a
  station of his own, `place:<equipmentId>:<n>`, and B1's `queueCellsAt` and `benchCellsAt` say
  where those places are, but the two halves were written in different worktrees and nothing
  joined them: `stationCell` had no branch for the prefix, so a third man fell through to the
  bench fallback and was drawn on top of the first. `stationCell` resolves it now, `stationLabel`
  names it, and `animationForStation` puts him on bench work like the two in front of him. The
  pair `placeStation` / `stationPlaceAt` moved from `production.ts`, where B2 had to write them
  because `stations.ts` was B1's, to `stations.ts` beside `secondStation` where they belong.
  `tests/engine/assignees.test.ts` now asserts what the engine could not: three men, three cells,
  none of them shared.
- **The cleaning chip** reads `The hall is dirty, Dave is cleaning it` with no button once the
  helper has it in hand, and goes back to the question when nobody has. `HallProblem.inHand` is
  what `chipAction` reads. Tested both ways.
- **The bench's card** was reachable from the Owned tab and not from the hall: `handleSceneClick`
  gated on `machine` and `extraction` and the bench is category `bench`. It opens from the hall
  now, with its Sell on it. Tested.

`npm run check` exit 0: 172 files, 1,730 tests.

### T19-C1h Add as next can no longer stall the laptop

The last of the four findings the adversarial review of phase A confirmed. `startTaskCheck` tests
"Busy with X" **above** the licence, the unloading and the take off, so a job of work that could
not start even with free hands still reads only "Busy with X". B3's button was already gated on
that refusal, which was the right instinct and not enough: the hidden second reason came with it,
`startNextQueued` calls `startTask`, `startTask` refuses, and the head of the queue sits there
with everything behind it for the rest of the day.

`startTaskCheck` takes an `ignoreBusy` flag now and `canQueueTask(state, taskId)` asks it the
question that matters: would this start if only his hands were free? The button is gated on it,
and so is `queueTaskNext` itself, so no other way in can park a dead task at the head either. The
pre-existing tick-several queue of T17 2.16 could reach the same state; it cannot now.

`npm run check` exit 0: 172 files, 1,731 tests.

### T19-C2 The scenarios

**The sixteen months of Turns 2 to 13 stand**, re-run under the new rules with no change beyond
the two figures T19-A3 re-measured with their reason: `thirtyDays.test.ts`, `turn13.test.ts`,
`turn17.test.ts` and the 10.4 playthrough are all green.

`turn17.test.ts`'s (y) now puts its second man on with `ADD_TO_JOB` instead of `ASSIGN_SECOND`.
`addToJob` pushes where `assignSecond` spliced, which for a two man job is the same second name,
so every claim (y) makes stands untouched. That was the last caller of the second man's own
action anywhere, so the action, its case, its shim and its type went with it.

**Three new months in `tests/scenarios/turn19.test.ts`:**

- **(aa) three men on one job.** One opening state, three runs off it: one man, two, three. All
  three finish the GBP 9,000 piece, so what is measured is the day it was finished on, and every
  man put on it brings that day forward. The piece is the same piece: same value, same price, and
  the same production minutes to within a hundred, because what three men buy is the calendar and
  not the work. The ceiling is asserted too: three men never beat one man by more than three to
  one, and the machine stages mean they do not come close.
- **(bb) a lacquered kitchen, by a joiner and by a sprayer.** One hall with a booth, a moulder and
  dry air (the dryer is deliberate: month (r) of `thirtyDays` measures wet air and this one
  measures the man), and one kitchen set to the top of its finishing stage so the only stage
  either man works is the one the trade is about. Over three working days the joiner gets through
  510.72 of the 900 the stage carries and the sprayer 729.60. That is **1.4286 to one, and
  `SPRAYER_SPRAY_RATE / JOINER_SPRAY_RATE` is 1.4285714**: the month and the constant are one
  number and neither can drift from the other unnoticed. The joiner moves it, so a workshop
  without a sprayer is slower at the booth and never stuck, which is the whole of 2.6.
  A note on why the run starts at the finishing stage: a sprayer is slower than a joiner at a
  bench, so a run from the beginning measures the cutting and the assembly as well and says the
  joiner was faster overall. That is true and it is not what 2.6 is about.
- **The cleaning day of 2.7**, which is one of section 7's own cross checks. A hall run to the
  dirty band with a helper on the books and the script's own `cleanAbove` set out of the dust's
  reach, so the scripted player can never press Clean up. The hall ends clean, the cleaning task
  was made by the engine, and it was done by the helper. The control, the same day with no helper,
  makes no cleaning task at all and ends as dirty as it started.

`npm run check` exit 0: 173 files, 1,740 tests.

### T19-C4 Look and shoot

Ten pictures in `docs/report-t19/`, every one the real app in headless Chromium at 1280 by 800 at
one device pixel, driven by clicks, standing in front of saves the game's own `encodeSaveFile`
wrote and its own Continue button opened. Each was looked at, one by one, and **two things the
pictures showed were wrong are fixed**:

1. **The half open door was a sliver.** The leaf swings on its hinge at 0, 45 and 90 degrees in
   world space, and this dimetric puts screen x at `(x - y) * 24`, so a leaf at exactly 45 degrees
   runs equally in +x and +y and projects to **no width at all**. The middle of every swing read
   as nothing. `DOOR_HALF_ANGLE` is 60 degrees [TUNE] now, past the degenerate angle, and the
   three states read as a door, a door caught on its way, and a door open. The test asserts every
   leaf is at least a quarter of the closed leaf's width, so it cannot creep back.
2. **The assign chips were dark pills on a cream card.** B2 wrote them in the dark panel palette,
   which is right everywhere except the one place they are drawn: the Work Plan wears the board
   skin, whose cards are paper. They read off `--card`, `--card-2`, `--card-line`, `--card-ink`
   with the panel palette as the fallback now, and the cross no longer sits over the last letter
   of a name (`white-space: nowrap`, and the cross does not shrink).

The ten:

1. `01-joiner-at-the-bench.png` (2.4, and 2.5 and 2.2 with it). The whole hall: three joiners at
   one bench, one in front of it, one behind it and one along its side, every one of them with his
   feet on the floor beside the bench and not one standing on its top. Piotr is in the open office
   doorway in the same frame.
2. `02-owner-in-the-open-door.png` (2.2, 2.3). The owner standing in the office doorway, the leaf
   swung out and the dark opening behind him.
3. `03-owner-at-his-desk.png` (2.2). The office view, with the owner in the room. See the note
   below on where he stands.
4. `04-door-three-states.png` (2.3). The real door drawn by the real stylesheet in its three
   states, side by side, framed from the door's own `getBBox`.
5. `05-assign-list-open.png` (2.5). "Who goes on TV unit?" with You and `add`, and Liam, Callum
   and Ravi greyed with "on Garage shelves".
6. `06-three-men-on-one-job.png` (2.5). Garage shelves with three chips and a cross apiece, one
   `Assign to this job`, and the bar reading "for Liam, Callum and Ravi". The TV unit above it
   says "Nobody is on it" in red. No "Second man" line anywhere.
7. `07-sprayer-in-our-team.png` (2.6). Our team, with "Ravi, sprayer (normal), on TV unit,
   GBP 2,700 a month" beside the two joiners.
8. `08-reputation-total.png` (2.9). `Reputation 45`, "the total to date", "WHAT MOVED IT THIS
   WEEK" with the week's rows and no carried over row, and the arithmetic reading
   `+10  -10  +0 this week   Reputation 45`.
9. `09-settings-sound.png` (2.10). Tips, Sound on and off, and Volume with Quieter, 70% and
   Louder.
10. `10-laptop-add-as-next.png` (2.12). Bookkeeping running with `Put that down`, every other row
    offering `Add as next`, **and the Material take off row offering nothing**, because the
    drawing comes first: the picture shows T19-C1h's fix doing its job.

**One thing the pictures showed that is not fixed, and is Piotr's to say.** In
`03-owner-at-his-desk.png` the owner stands against the back wall of the office rather than at the
desk. The office picture is shot from the desk, so there is no floor behind it to stand a man on;
B1's `OFFICE_OWNER_BOX` [TUNE] puts him on the visible floor to the left of the door. The brief's
claim, that a player who follows him through the door finds him, holds. If Piotr wants him nearer
the desk, that box is the one number to move.

`npm run check` exit 0: 173 files, 1,740 tests.

## The movement (CLAUDE.md T19 2.1, PIOTR: "they walk like robots and shake like a leaf")

This section was written, and committed, before a line of `src/render/walkers.ts` or
`src/render/characters.ts` was changed. Everything in it was measured on the code as it stood at
the end of phase A (commit f33ca68), by a probe test driving the real walker with a fake clock at
60 fps: `tests/render/zzprobe.test.ts`, deleted once the numbers were taken and replaced by the
permanent assertions in `tests/render/walkers.test.ts`.

### What was measured

The probe drove three cases. (a) A plain leg: a joiner sent from his bench to the saw, path
`(8,4) (7,4) (7,3) (7,2) (6,2)`, 240 frames of `1000/60` ms. (b) A staircase diagonal of twelve
cells. The path finder does not produce one on open floor, so it had to be supplied: `walkPath`'s
`STEPS` is ordered `+x, -x, +y, -y` and its BFS takes the first cell found, so `(6,6)` to `(10,10)`
comes back as `(6,6)(7,6)(8,6)(9,6)(10,6)(10,7)(10,8)(10,9)(10,10)`, an L and not a staircase. A
staircase is what the floor forces when equipment is in the way, so the probe injected one through
the third argument of `syncWalkers`. (c) The walk sheet's own numbers, read out of
`public/sprites/characters.json`.

### 1. The transform is rounded every frame. This is the shake.

`translateOf` wrote `translate(Math.round(feet.x),Math.round(feet.y))`. At
`WALK_CELLS_PER_SECOND` 1.0 and 60 fps a man advances 1/60 of a cell a frame, which on
`TILE_WIDTH` 48 and `TILE_HEIGHT` 24 is 0.4 px of screen x and 0.2 px of screen y. Rounded to
whole pixels that is not a step at all on most frames. The before log, the first twenty frames of
the leg:

```
f1  at=(7.9833,4.0000) t=(96,156) d=( 0.00, 0.00) face=nw
f2  at=(7.9667,4.0000) t=(95,156) d=(-1.00, 0.00) face=nw
f3  at=(7.9500,4.0000) t=(95,155) d=( 0.00,-1.00) face=nw
f4  at=(7.9333,4.0000) t=(94,155) d=(-1.00, 0.00) face=nw
f5  at=(7.9167,4.0000) t=(94,155) d=( 0.00, 0.00) face=nw
f6  at=(7.9000,4.0000) t=(94,155) d=( 0.00, 0.00) face=nw
f7  at=(7.8833,4.0000) t=(93,155) d=(-1.00, 0.00) face=nw
f8  at=(7.8667,4.0000) t=(93,154) d=( 0.00,-1.00) face=nw
f9  at=(7.8500,4.0000) t=(92,154) d=(-1.00, 0.00) face=nw
f10 at=(7.8333,4.0000) t=(92,154) d=( 0.00, 0.00) face=nw
f11 at=(7.8167,4.0000) t=(92,154) d=( 0.00, 0.00) face=nw
f12 at=(7.8000,4.0000) t=(91,154) d=(-1.00, 0.00) face=nw
```

The pattern repeats every five frames: `(-1,0) (0,-1) (-1,0) (0,0) (0,0)`. He moves on three
frames out of five and stands still on two, and the two axes never move together. Over the whole
240 frames: **144 of 240 frames have dx = 0 and 192 of 240 have dy = 0**. That is a man who
twitches five times a second instead of sliding, and the hall's camera scale (1.2 at the opening
zoom, up to 4) multiplies every twitch.

### 2. The sheet and the floor are not tied. This is the skating.

`character.joiner.walk` and `character.owner.walk` are both **8 frames at 3.4286 fps**, so a full
cycle is **2.3333 s**. At `WALK_CELLS_PER_SECOND` 1.0 and one metre a cell, one cycle of the sheet
carries the man **2.333 m** of floor. Eight frames is two steps, so the sheet was being asked for
a 1.17 m step. `docs/art/SPRITES.md` section 10 gives frames, fps, the cell, the anchor, the
padding and `metresPerCell`, and **no stride at all**, so one had to be chosen: phase A put
`WALK_STRIDE_METRES` 1.4 [TUNE] in `constants.ts`, which is a 1.8 m man's two steps at an
unhurried pace. The feet were therefore being dragged past where they plant by a factor of
**2.3333 / 1.4 = 1.67**.

Two knobs could close that gap. `WALK_CELLS_PER_SECOND` is Piotr's own figure of 17.09 (T18 2.1,
and a test asserts it is exactly 1.0), so it is the fps that moves: the locomotion animations play
at `frames * WALK_CELLS_PER_SECOND / WALK_STRIDE_METRES` = `8 * 1.0 / 1.4` = **5.7143 fps**
instead of the sheet's 3.4286. The manifest is untouched (section 6 freezes it); this is a
renderer decision, which is what `SPRITES.md` 10.4 leaves to the renderer. Everything that is not
locomotion keeps the sheet's own fps: bench 5, idle 1, phone, carry-at-rest.

### 3. A turn at every cell. This is the robot.

`facingFromScreen` was read inside the `while` loop of `stepWalkers`, once for every cell of the
path consumed in that frame, and the last value of the frame was what was written. On the injected
**staircase of twelve cells the facing changed twelve times**: it alternated `se` and `sw` on every
single cell (ten changes), plus one off the page's rest facing at the start and one back to the
arrival's rest facing at the end. A `se` to `sw` change is a mirror flip of the whole figure, so on
a staircase the man flips a full mirror image of himself once a second.

On open floor the L-shaped path makes this read differently but no better: the man marches four
cells down-right, snaps to his mirror image, marches three cells down-left. On the measured plain
leg the facing changed twice: `nw` for `(8,4)->(7,4)`, `ne` for the `-y` run, `nw` again for the
last cell. That is the dog-leg march Piotr called robotic.

### 4. The order of the writes, and the fifth thing the log showed

`app.ts` `frame(now)` runs `stepWalkers`, then `playCharacters`, then `driveSound`, then the
batched clock, all inside one `requestAnimationFrame` callback. The browser paints after the
callback returns, so those three cannot be seen half updated against each other: point 4 of the
brief, checked and **not** a defect.

The defect is one cell further on, and it is bigger than the rounding. The batched clock calls
`advanceMinutes`, which calls `requestRender`, and `requestRender` inside a batch renders at the
end of it: **`render()` runs inside the same rAF callback, after both walker writes and before the
paint**. Every figure lives in the scene's live part, so `patchInto` rewrites each figure's
attributes out of markup `hall.ts` has just built for a man standing at his station: `data-facing`
the rest facing, `data-anim` the rest animation, `data-frame` "0", the `figure-flip` transform for
the rest facing. `syncFigures` then puts the transform back, but it called `dress(node, walker)`
with the heading defaulted to `null`, so it never put the facing back, and the
`setCharacterAnimation(art, 'walk')` it does call really fires (the patch had just written the
rest animation) and resets `data-frame` to "0" and the view box to frame 0.

Measured, on a joiner thirty frames into a walk to the saw:

```
MID WALK:       anim=walk face=nw frame=1 fps=3.4286 flip=scale(1,1)
AFTER A RENDER: anim=walk face=ne frame=0 fps=3.4286 flip=scale(1,1)
```

A render happens once for every whole game minute, so once a real second at x1, four times at x4
and up to thirty times a second at x30. At every one of them the painted figure is mirror-flipped
back to his station's facing and his walk cycle is restarted at frame 0. **That is the leaf.**

### What was changed

1. **`translateOf` writes two decimals** and lets the browser interpolate; `transform` now reads
   `translate(95.60,155.80)`. The sprite inside the group is untouched and stays anchored on the
   sheet's own anchor, which was already written to two decimals. `hall.ts`'s freshly built markup
   keeps its `Math.round`: a station cell is a whole cell, `centreOf` of a whole cell is a whole
   pixel, so the rounding there is a no-op that two render tests pin as an exact string.
   `setOffFrom` stops rounding what the walker remembers; only the cell handed to the path finder
   is rounded, because the network is a grid of whole cells.
2. **`walkFps(sheet, cellsPerSecond)`** in `characters.ts` derives the locomotion frame rate,
   `frames * WALK_CELLS_PER_SECOND / WALK_STRIDE_METRES` = `8 * 1.0 / 1.4` = **5.7143 fps**, and
   the two places that write `data-fps` (`characterArt` and `setCharacterAnimation`) use it for
   `walk` and `carry` and the sheet's own fps for everything else. One rule in one place;
   `playCharacters` reads `data-fps` off the figure and did not have to change. Nothing is written
   back into the manifest, which section 6 freezes: the fps a figure plays at is the renderer's,
   which is what `SPRITES.md` 10.4 leaves to it. `WALK_CELLS_PER_SECOND` is untouched at 1.0.
3. **The facing is chosen once per leg**, in `setOff`, and kept on the walker as one facing per
   cell of the path. `legHeadings(from, path)` gives the whole leg the facing of its overall
   screen direction and gives any run of more than `WALK_CORNER_CELLS` (2) cells in one world
   direction its own, so the L the path finder returns on open floor turns him exactly once, at
   its corner, and a staircase reads as one direction from end to end. `stepWalkers` looks the
   facing up by the cell it is walking to instead of recomputing it.
4. **A page written mid leg no longer undoes the walk.** `syncWalkers` passes `walker.facings[0]`
   to `dress`, so the walking facing and its mirror are put back after every render, and it then
   calls `playCharacters` on that one figure with the same clock the frame uses, so the walk cycle
   is put back to the frame real time is on instead of being left at the 0 the fresh markup
   carries. `setCharacterAnimation` also keeps the frame it finds (wrapped into the new sheet's
   count) rather than writing 0, so a walk that becomes a carry is the same man still walking.

### The after log

The same leg, the same fake clock, after the fix. `at` is the walker's fractional cell, `t` is the
transform as it is written, `d` is the change from the frame before:

```
f1  at=(7.9833,4.0000) t=(95.60,155.80) d=(-0.40,-0.20) face=ne
f2  at=(7.9667,4.0000) t=(95.20,155.60) d=(-0.40,-0.20) face=ne
f3  at=(7.9500,4.0000) t=(94.80,155.40) d=(-0.40,-0.20) face=ne
f4  at=(7.9333,4.0000) t=(94.40,155.20) d=(-0.40,-0.20) face=ne
f5  at=(7.9167,4.0000) t=(94.00,155.00) d=(-0.40,-0.20) face=ne
f6  at=(7.9000,4.0000) t=(93.60,154.80) d=(-0.40,-0.20) face=ne
...
f40 at=(7.3333,4.0000) t=(80.00,148.00) d=(-0.40,-0.20) face=ne
f80 at=(7.0000,3.6667) t=(80.00,140.00) d=( 0.40,-0.20) face=ne
f240 at=(6.0000,2.0000) t=(96.00,108.00) d=(-0.40,-0.20) face=ne
```

**Zero dx frames: 0 of 240. Zero dy frames: 0 of 240.** Every frame of the second moves, by the
same 0.4 px of x and 0.2 px of y, which is exactly one cell a second at 60 frames a second. The
facing changed **0 times** over the whole leg, where it changed twice before: the leg runs up and
to the right on the screen and he faces up and to the right for the whole of it, instead of
turning for the one cell at its start and turning back.

The twelve cell staircase: **one facing for the whole leg, 0 changes**, and the mirror flip never
moves either, where before it alternated on every cell. The L of four cells and four cells: **one
turn, at its corner**. A walking figure now carries `data-fps` 5.7143 and not 3.4286.

And the render mid leg, measured the same way as the before log:

```
MID WALK:       anim=walk face=ne frame=2 fps=5.714285714285714
AFTER A RENDER: anim=walk face=ne frame=2 fps=5.714285714285714
```

The permanent assertions are in `tests/render/walkers.test.ts` under "The movement (CLAUDE.md
T19 2.1)": no zero step and a near constant step over a second of walking, one facing over a
staircase, one turn over an L, the derived fps, and a page written mid leg that changes neither
the facing, nor the frame, nor the mirror, nor the place.

### What was found and not changed

- **The painter's order follows the station, not the feet.** `hall.ts` sorts a figure by
  `depthKey` of his standing cell, so for the whole of a walk he is painted in the depth order of
  where he is going: he can pass behind a machine he should be in front of and pop into place on
  arrival. It is real and it is part of "the men move like men", but the fix is a re-sort of the
  live drawables every frame, which is a change to the scene assembly and not to the walker, and
  it would have put this task across `hall.ts`'s drawable order on the same night three agents
  share that file. It is written up here rather than done, for a later turn.
- `styles.css` line 268 carries a stale comment promising that "a figure slides between its
  stations instead of jumping", left over from Turn 2. There is no such rule and there must not be
  one: a CSS transition on the transform would fight the per frame write and lag the man behind
  his own feet. The comment is in a frozen file; it is in `NOTES-B1.md` for the integrator.

---

## Numbers chosen

Every figure this session picked itself, grouped by the brief's section. Each one carries a
`[TUNE]` tag at its declaration, and all of them live in `src/engine/constants.ts`: the two that
phase B had to declare elsewhere, because that file was frozen under it, were moved home in
phase C (`WALK_CORNER_CELLS` out of `walkers.ts`, `SOUND_VOLUME_STEP` out of `settings.ts`).

**2.1 The movement**

- `WALK_STRIDE_METRES` **1.4** m. How far a man travels in one full cycle of the walk sheet.
  `docs/art/SPRITES.md` 10 gives frames, fps, cell, anchor, padding and `metresPerCell`, and no
  stride at all, so one had to be chosen: 1.4 m is a 1.8 m man's two steps at an unhurried pace.
  Everything else about the locomotion frame rate is derived from it and from Piotr's own
  `WALK_CELLS_PER_SECOND` 1.0: `frames * cells a second / metres a stride`, which on the delivered
  8 frame sheets is **5.7143 fps** against the manifest's 3.4286.
- `WALK_CORNER_CELLS` **2**. How long a run of cells in one world direction has to be before it
  counts as a corner. The figure is the brief's own ("the path turns ninety degrees for more than
  two cells"); only its name was chosen.
- **Two decimals** on the walker's transform. Not a constant: it is the smallest precision at
  which no frame of a 60 fps walk rounds to a standstill, since 0.2 px a frame is the smallest
  real step, and a third decimal would only lengthen the string.

**2.2 The owner in the office**

- `OFFICE_OWNER_BOX` `{ x: 392, y: 378, width: 165, height: 222 }` in `src/render/office.ts`,
  in canvas pixels: the strip of floor between the Work Plan board, which ends at x 385, and the
  laptop, which begins at x 558. The office picture has no desk region to read this off, so it is
  a new box. See the note under T19-C4 about where he ends up standing.

**2.3 The doors**

- `DOOR_SWING_MS` **400** and `DOOR_CLOSE_MS` **600**: the brief's own figures. The half state is
  at `DOOR_SWING_MS / 2`.
- `DOOR_HALF_ANGLE` **60 degrees**, in `src/render/hall.ts`. Not 45: a leaf at world 45 degrees
  projects to exactly no width in this dimetric. Found by looking at the picture (T19-C4).

**2.4 At the bench, not on it**

- `out: 1` on the operator cell of the table saw, the CNC, the spray booth and the edgebander, and
  on the free side cell of a rack or an extractor (whose waiting cell goes to `out: 2`). Every one
  measured against the sprite's own drawn alpha, in the table under T19-B1b.
- The workbench's own operator and second places keep `out: 0`: measured, the man overlaps his own
  bench by 18.9% and 9.4%, which is a man leaning over his bench.

**2.6 The sprayer**

- `SPRAYER_MONTHLY_WAGE` **2,300 / 2,700 / 3,100** a month, the brief's own figures, paid monthly
  like the office roles because he is hired on a trade rate and not the workshop's weekly one.
- `SPRAYER_REPUTATION` **-50 / 10 / 40**: the ladder the joiners climb, because he is a floor man
  like them.
- `JOINER_SPRAY_RATE` **0.7**, the brief's own figure. `SPRAYER_SPRAY_RATE` **1.0**, likewise.
- `SPRAYER_BENCH_RATE` **0.6**: what a sprayer is worth at anything that is not spraying. He can
  stand at a bench and help, and he is not a joiner.

**2.10 Sound**

- `SOUND_VOLUME_DEFAULT` **0.7**, unmuted, the brief's own figure.
- `SOUND_VOLUME_STEP` **0.1**: nought to full in ten presses.
- `STAND_IN_GAIN` **0.15**, the brief's own figure.
- `SOUND_ONE_SHOT_GAP_MS` **1,000**, which is the brief's "at most one a second".
- `HAMMER_EVERY_SECONDS` **3** and `DRILL_EVERY_SECONDS` **4**, which is the brief's "every few
  seconds"; both are longer than the second the cap sets, so the cap still holds at x10 and x30.
- The per sound `gain`, `hz` and `seconds` of the `SOUNDS` table, which shape the stand ins. They
  stop mattering the day Piotr's recordings land.

**2.11 Design time**

- `DESIGN_MIN_MINUTES` **30** and `DESIGN_MINUTES_PER_1000` **24**, both the brief's own figures.

**Wordings chosen**

- `the total to date` over the reputation figure (2.9), which is the pair of words that stops it
  being read as a week.
- `Next in the queue` on a laptop row already queued (2.12), a reason and not a button, so a
  second press is never a dead click.
- `The hall is dirty, Dave is cleaning it` on the chip, with no button (2.7), which is the brief's
  own sentence.
- `alongside, on the next place` for the third man's station in the hall's tooltip (2.5).

---

## Cross check (section 7)

**1. The movement section of the report exists, was written before the fix, and its after log
shows no zero steps between nonzero ones and no facing change on a straight leg.** It is the last
section of this report. It is verifiable from git and not only from the word of it: `cbec175`
**T19-B1a The movement: the diagnosis, before any fix** is a separate and earlier commit than
`d0ef285` **T19-B1a The movement: the fix**. The after log reads **0 zero dx frames of 240 and 0
zero dy frames of 240**, against 144 and 192 before, at a constant 0.40 px of x and 0.20 px of y
a frame; the facing changes **0 times** over a twelve cell staircase, against 12 before.

**2. `grep -rn "assignedTo\|secondAssignee" src`: nothing outside the migration.** Eight hits, and
every one of them is either the lift or a comment naming what the field used to be:
`src/engine/migrate.ts` lines 173 and 250 to 256 (the two lifts), `src/engine/jobs.ts` line 225
and `src/engine/types.ts` line 516 (two comments).

**3. The sprayer: a lacquered job with a sprayer finishes its finishing stage faster than the same
job with a joiner, asserted.** `tests/scenarios/turn19.test.ts`, scenario (bb): over three working
days at the booth the joiner gets through 510.72 of the 900 the stage carries and the sprayer
729.60, and the test asserts the ratio equals `SPRAYER_SPRAY_RATE / JOINER_SPRAY_RATE` to three
places. The engine's own unit assertion is in `tests/engine/` beside it.

**4. The helper: a scenario day with a dirty hall and a helper ends clean with no player action.**
`tests/scenarios/turn19.test.ts`, the cleaning day. The script's own `cleanAbove` is set to 101 so
the scripted player can never press Clean up; the hall ends clean, the cleaning task was made by
the engine and `doneBy` is the helper. The control with no helper makes no cleaning task at all
and ends as dirty as it started.

**5. The owner is in the hall's doorway while in the office, and at the desk in the office view.**
`tests/render/hallRoom.test.ts`, "the owner in the office doorway": he is never absent from the
hall, he stands in the doorway and faces in. `tests/render/officeRoom.test.ts` draws him in the
office view. Pictures 2 and 3.

**6. Sound: nothing plays before the unlock; mute silences; the saw loop is on only while somebody
is at the saw.** `tests/ui/sound.test.ts`, 18 cases against a fake audio context:
"does not so much as build the audio context" (the fake is never even constructed before
`unlockSound`), "silences everything when it is muted, and brings it back when it is not", and
"is on at the saw only while somebody is at the saw".

**7. The ten pictures.** In `docs/report-t19/`, listed under T19-C4, every one looked at, and two
faults they showed fixed.

---

## Names the brief uses that the code does not

- **"fitting"** (2.10) is not a stage in this code. The stages are `cutting`, `machining`, `cnc`,
  `assembly`, `finishing` and `delivery` (`StageId` in `src/engine/types.ts`), and the fitting of
  a carcass happens inside assembly. The hammer and the drill are both hooked to assembly, at
  their own cadences.
- **"the office picture's desk region"** (2.2) does not exist. `OFFICE_REGIONS` is workPlan,
  orders, door, clock, laptop, catalogue, binder and company; the desk is the whole foreground of
  the picture and is not a region. A new box was measured for the owner instead.
- **"`job.assignedTo` and `job.secondAssignee` become `job.assignees`"** (2.5) is exactly what was
  done, and the brief's `secondAssignee` has no successor: there is no second man any more, only
  the second name on a list.
- **"the band Clean up appears for"** (2.7) is `dustBand(state.dust).label === 'dirty'` and above.
- The mockup's **"ok joiner"** and **"good joiner"** are not the game's words. Our team has said
  **poor, normal and super** since Turn 6, and the assign list says the same, so the player reads
  one vocabulary and not two.
- The mockup's **blue** `Assign to this job` button is the mockup's own palette. The game's accent
  button is the house amber, and that is what the button wears.

---

## What was not done tonight, and why

- **The painter's order still follows a figure's station and not his feet.** `hall.ts` sorts a
  figure by the `depthKey` of the cell he is walking to, so for the whole of a walk he is painted
  in the depth order of where he is going: he can pass behind a machine he should be in front of
  and pop into place on arrival. It is real, and it is part of "the men move like men". The fix is
  a per frame re-sort of the live drawables, which is a change to the scene assembly and not to
  the walker, in a file three agents shared tonight. Written up by B1 rather than done.
- **The mockup's two man cap** is gone, as Piotr asked. The note at the foot of
  `docs/mockups/t19/workplan-assign-A.html` still says "up to two men on a job (the bench has two
  places)"; `docs/mockups/t19/README.md` and section 6 of the brief overrule it, and the mockup
  file is on the do not touch list, so it still says so.
- **No recordings were invented.** `public/sounds/` carries a README and nothing else; every sound
  in the game tonight is a synthesised stand in at `STAND_IN_GAIN`. The seven files Piotr is to
  record are listed in `docs/art/REQUESTS-T19.md`.
- **The sprayer has no character sheet**, so he is drawn by the capsule, which is what 2.6 asks
  for. His sheets are requested in `docs/art/REQUESTS-T19.md` 2.

---

## Patch v28 (Claude, in the chat, 18.09): the Assign list can be shut, and moves men

Piotr could not close the Assign to this job list (no cross, Escape and a click outside did
nothing) and could not move a man off another job without unpinning him first. `APP_VERSION`
`v28`, no state change:

1. The list has the cross every modal has (`closeButton('closeAssign')`, scaled down, hung off its
   top right), Escape shuts it before the modal under it, and a click anywhere outside it shuts it
   (the opener toggles as before).
2. A man on another job is no longer greyed: his row says `leaves <job>` and a `Move here` button
   takes him off that job and puts him on this one in one click (`assignMove`: REMOVE_FROM_JOB
   then ADD_TO_JOB). Greyed stays for: already on this job, helpers, not in the hall today.
3. The contract bar on the Work Plan is assigned like a job: the men on it as chips with a cross
   (`assignContract` with `on=0`), an `Assign to this contract` button opening the same kind of
   list (joiners only; the engine's `contractAssignCheck` says why for the rest), sharing
   `ui.assignOpen`. The bar moved under the jobs so the modal's lead never covers it.

Tests: `app.test.ts` (cross, Escape, click outside), `assignees.test.ts` (Move here off another
job), `contracts.test.ts` (the bar's chips, button, list and place). The rule this comes from:
every new modal, popover or list has the cross, Escape and click outside (PIOTR, 18.09).

Also in v28: **the helper's character sheets** from Piotr's GPT pack (18.09), built into the game's
sheet format by the same rule as the joiner's (scale 0.1957, padding 8, four rows sw, se, nw, ne,
the anchor at the projected ground origin): `character.helper.walk` (8 frames, 3.43 fps),
`character.helper.idle` (2, 1 fps), `character.helper.carry` (8, 3.43 fps, the wider 800 by 736
canvas like the joiner's carry) and `character.helper.sweep` (8, 5 fps, a broom in hand). The
manifest is regenerated. `sweep` is delivered but not yet played: the game has no `sweep`
animation, so the cleaning station plays `bench` until Turn 20 adds it. No bench sheet is in the
pack, so at a bench the helper falls back as the fallback rule says. The helper's frames are laid
out from the pack's own anchors, so his cell (110 by 146, anchor 55 by 115) is not the joiner's
(112 by 151, anchor 56 by 143); the renderer places by the anchor, so both stand on the floor,
but the helper may draw up to a tenth taller than the joiner and that is to be judged on the hall.
