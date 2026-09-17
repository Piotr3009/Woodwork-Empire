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
