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
