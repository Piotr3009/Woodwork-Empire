# Report, Turn 19: the men move like men

Woodwork Empire, Turn 19. Built against `CLAUDE.md` of 17.09.2026 (first line "Turn 19").
Branch `claude/zealous-cori-ghbf7j`. `APP_VERSION` v26 to v27, `STATE_VERSION` 15 to 16.

## Blockers

None so far.

## Note on the branch name

The brief's section 5 says "Branch turn-19-the-men-move-like-men from main". The session's own
standing instruction names `claude/zealous-cori-ghbf7j` as the branch to develop on and forbids
pushing to any other without permission, so that is the branch this turn is on. The base is the
tip that carries the Turn 18 merge (PR #18, commit 93959d4) plus the Turn 19 brief. Nothing else
about section 5 changes.

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
