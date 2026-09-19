# Phase B3 notes: the hall (CLAUDE.md T21 2.6, 2.11, 2.12, 2.13)

Branch `claude/determined-tesla-e90ze6`, on top of phase A, B1 and B2 (54ec86d). Three commits,
T21-B3a to T21-B3c. Everything the lead has to know: the frozen file changes to apply, the figures
chosen, what was overruled and why, and two lines a task.

## Frozen file changes for the lead to apply

Nothing in this section has been applied by this agent. **Nothing in this section is needed for any
part of 2.6, 2.11, 2.12 or 2.13 to work:** all three tasks are live and tested without them. Both
notes are tidying.

### 1. `src/ui/styles.css`: one class the bubble's box wants (T21-B3a, 2.6, optional)

The bubble is an HTML box inside a `foreignObject`, which is what phase A's own comment over
`.bubble` says it would be. A `foreignObject` has to be given a width and a height in scene pixels,
and the paper inside it sizes itself to its own words, so between the two there is a holder whose
only job is to centre the paper in the box and leave the tail's nine pixels under it. It is written
as three layout properties inline on the div (`src/render/hall.ts`, `bubbleArt`), because a class for
it is a stylesheet edit this agent may not make. No colour, font, radius or shadow is in it.

To move it into the stylesheet, add this beside the `.bubble` block at the end of the file:

```css
/* The box the paper hangs in: layout and nothing else, so the paper is centred over the head it
   points at and the tail's own nine pixels fall under it. No paint here (CLAUDE.md T21 2.6). */
.bubble-holder {
  align-items: flex-start;
  display: flex;
  height: 100%;
  justify-content: center;
}
```

and then in `src/render/hall.ts`, `bubbleArt`:

Exact old text:

```ts
    '<div xmlns="http://www.w3.org/1999/xhtml" class="bubble-holder" ' +
    'style="display:flex;justify-content:center;align-items:flex-start;height:100%">' +
```

Exact new text:

```ts
    '<div xmlns="http://www.w3.org/1999/xhtml" class="bubble-holder">' +
```

Reason: the same rule in the stylesheet instead of on every bubble in the hall. It is not urgent:
`tests/ui/popovers.test.ts` and the census tests pass either way, because the holder is neither
positioned nor given a `z-index`, which is the thing that test is about.

### 2. `src/ui/app.ts`: forgetting the bubbles with the walkers (T21-B3a, 2.6, cosmetic)

`src/render/bubbles.ts` keeps one line of memory a man (what he last said, and when he started
saying it), the way `walkers.ts` and `doors.ts` keep theirs, and it exports `resetBubbles()` for the
same reason they export theirs. The app never calls it. The whole consequence of that is this: if a
new game, or a save being loaded, puts the very same man on the very same words he was on before,
his paper bubble may be up to three seconds short on its first showing. Nothing else.

To close it: add `resetBubbles` to the import from `'../render/bubbles'` (there is no such import
yet, so the line is new) and put `resetBubbles();` under each of the five `resetDoors();` calls, at
lines 1220, 1239, 1775, 1791 and 1928 as the file stands at commit T21-B3a. Exact old and new text
is not given for these five because the two lines are identical at all five sites and no exact match
would be unique; each is `resetWalkers();` then `resetDoors();`, and the new line goes third.

Reason: the render layer's three pieces of memory are forgotten in one place, and one of them is
not. It is cosmetic, and it is worth skipping if the lead would rather touch app.ts once.

## What was overruled, and why the brief is right to

### `isDoorwayCell` let nobody through the canteen door (T21-B3b, 2.12)

`src/engine/stations.ts` tested the office door alone, and the comment said why in as many words:
the canteen's door cell is where a man with nothing to do, or with no bench to work at, stands
about (CLAUDE.md T4 3.4, T11 3.4); nothing behind that door is drawn, so a man sent through it
would be nowhere at all, and the player would lose sight of his crew.

Both halves of that were true and one of them still is. What Turn 21 changes is that the player no
longer loses sight of anybody: **the bubble at the door is what keeps him informed**, which is the
whole of 2.6's grey tone, and the drawing says it in as many words ("dashed grey, drawn at the door
he went through"). So the door is opened, and the reason it was shut is answered rather than
ignored.

The other half, that an idle man stands on that very cell, is not answered by a door at all, and
this is the one piece of design in B3b worth the lead's eye: **the cell cannot tell an eating man
from an idle one, so the station does it.** `STATION_LUNCH` is a station of its own, `stationNow`
is the one place the dinner hour is read, and `isBehindTheDoor(station, cell)` asks both halves:
the station says which room he went into and the cell says his feet are in that room's doorway. An
idle man is still drawn at the canteen door with his red `nothing to do` over his head, which is
the drawing's own last line, and a man at his dinner is behind the door with `at lunch` over it.

`isDoorwayCell(cell)` keeps its name and its meaning and now answers for both doors, which is what
the brief asked for; `tests/render/doors.test.ts` asserts that, and asserts the pair that the cell
alone is not enough.

### The doors no longer ask who a man is (T21-B3b, 2.11)

`figureGoesThroughDoors(key)` was `key === 'owner'`, and its own comment said that widening it was
one line. Making it true for everybody leaves it with nothing to answer, so it is gone rather than
left as a function that returns `true`: what decides now is `roomBehindStation(station)`, because
the question was never really who the man is but where he has gone. Every reader of it
(`figureIsThroughADoor`, `readDoors`) reads the station instead, and both take the station as an
argument now.

## Numbers and readings chosen

Listed under each task below. The words of the bubbles, the three seconds, the six pixels of gap and
the speed above which the paper ones are not drawn are all phase A's off Piotr's drawing, and
nothing here changed any of them.

## T21-B3a: 2.6, the men say why they stand

- Built: the words, the paper and the three seconds. **The words**: `src/engine/bubbles.ts`,
  `bubblesFor(state)` and `bubbleFor(state, who)`, one bubble a man or none, read off the table
  `BUBBLES` phase A put in the constants with every `{slot}` filled from the state and no second
  table of words anywhere. Nothing in it decides anything: the machine a man cannot have is
  `waitingWordsFor` (B2's, in production.ts) and the phrase is the very phrase `waitingLine` builds,
  the rack is `job.blockedBy`, the chore is the kind of the job of work in his hands, the stage is
  `currentStage`, and the pieces are `contract.piecesThisWeek` against `weekWanted`, which is what
  the Contracts tab prints. **The paper**: `bubbleArt` in `src/render/hall.ts`, a `foreignObject`
  holding the HTML box phase A wrote the CSS for, hung `BUBBLE_HEAD_GAP` over the top of whichever
  man was drawn (the sheet's own cell through the new `characterTop` in characters.ts, the capsule's
  crown through `CAPSULE_HEAD_TOP`), as a child of the figure's own group, so the walker carries it
  and the depth sort keeps it with him; it has no `data-character`, so `dress` and `playCharacters`
  do not touch it, and `pointer-events="none"`, so the man under it keeps his own `<title>` line.
  **The three seconds**: `src/render/bubbles.ts`, one line of memory a man in the render layer, the
  shape `walkers.ts` and `doors.ts` use, read against a real clock (`bubbleNowMs`, or
  `HallOptions.nowMs` for a test). A paper bubble is not drawn at all above `BUBBLE_WORK_MAX_SPEED`.
  A man who is off the hall gets his grey bubble at the door he went through, in its own drawable at
  that cell. Two new words in the engine for the drawing's sake: `stageDoing` in stages.ts (the stage
  as an act, "assembling", beside `stageLabel`'s "Assembly") and `pluralOf` in text.ts ("drawer
  boxes"). Tests: `tests/engine/bubbles.test.ts` (15) and `tests/render/bubbles.test.ts` (10).
- Left: nothing of 2.6. No test was weakened, skipped or deleted, and none needed rewriting: the
  bubble is new markup inside a group every test reads by attribute. One comment in `src/render/hall.ts`
  had to lose the word "hover" (it now says what it means, the group's own `<title>`), because
  `tests/ui/officeHover.test.ts` is a census that forbids that word anywhere in the TypeScript of
  `src/ui` and `src/render`. Two notes for the lead above, both optional and neither needed for the
  section to work.

### The station a man is at for his dinner, which 2.6 needed before 2.12 could use it

`STATION_LUNCH` and `stationNow(state, who)` are in this commit and not in B3b's, because the
`at lunch` bubble is 2.6's and it cannot be said without a state that says a man is at his dinner.
The day loop puts the whole workshop on `STATION_IDLE` for the hour (`updateStations` in the frozen
`src/engine/game.ts`), which is the same string it writes for a man it has nothing for, so the hour
is read in `src/engine/stations.ts`, the one module that says where a figure is. Nothing about the
drawing changed in this commit: both stations resolve to the canteen door cell, so the man stands
exactly where he stood, with `at lunch` over his head and under his name instead of `waiting`. B3b
is what takes him through the door.

### Numbers and readings chosen (T21-B3a)

- **The box: `line` 34, `tail` 9, `char` 12, `pad` 26 scene pixels** [TUNE]. `line` is the paper's
  own height at `--fs-hand-small` with the padding and border the stylesheet gives it (23 + 3 + 3 +
  2 + 2) and `tail` is the nine pixels `.bubble::before` hangs below the box; `char` and `pad` are a
  generous guess at the width of the words in the title hand, and the box is drawn
  `overflow="visible"` so a guess that is too narrow cannot clip the paper and one that is too wide
  is invisible and catches no mouse.
- **The head is the crown and not the centre** [TUNE]. The brief names
  `-px(CAPSULE_PARTS.headCentre)`; the crown is the centre plus the head's own radius, and six pixels
  over the centre would put the tail's point in his hair. Both figures are read off `capsuleBody`'s
  own two fractions, so there is no third copy of them. A figure drawn from a delivered sheet is
  taller than the capsule (the joiner's bench cell is 71.5 scene pixels over his feet against the
  capsule's 42.3), so his own cell top is used and the two are never mixed up.
- **One bubble a door, deduped by its words, stacked a box at a time** [TUNE]. Three men behind the
  office door all saying "in the office" are one thing being said, and the drawing's table has no
  words for how many men are behind a door. Two different things said at one door (a man measuring
  and a man at a desk) stack up the wall.
- **The words are recorded for every bubble and only the paper ones come down** [TUNE]. So a man who
  stood waiting for the saw and then got it is saying something new when he says "cutting Small
  kitchen" again, and is given his three seconds for it.
- **`stageDoing`: cutting, machining, cutting (the CNC), assembling, spraying or sanding** [TUNE for
  the words]. The drawing's "spraying" is true of a lacquered job and of no other, so a job with any
  other finish says "sanding": that is the division the hall's own sound already makes (`hallLoops`
  sends lacquer to the booth and everything else to the sander). The CNC stage says "cutting",
  because that is what a man at a CNC is doing to a sheet.
- **`pluralOf`: "es" after a hiss and "s" after everything else** [TUNE]. Not a dictionary: it is
  right for all three pieces in the game and it is asserted on all three.
- **A man on a job of work the drawing has no words for says nothing**: a service, a repair, a
  delivery, an interview. The player can see him at a named station and the drawing gives him no
  line. Same for a man whose job is stopped by something the table has no line for (the bags full, a
  broken saw): the warning strip and the hall's chips say those, and a bubble saying "cutting" over a
  job that has stopped would be the one thing 2.6 is against.
- **`clientMeeting` is not `off to measure`.** A man at a meeting at the client's is off the
  building as surely as a man measuring, but the drawing's words are "off to measure" and inventing a
  second line for him would be building something visual out of words. He says "in the office",
  which is where his station puts him. One line for Piotr if he wants a word for it.
- **The bubble reads `job.blockedBy` for the rack and not the shortfall.** The drawing's table says
  "the job's shortfall is above zero"; what the engine writes down, every minute a man is on the job,
  is `waiting for material`, which is the same fact a minute fresher and is what the Work Plan reads.

## T21-B3b: 2.11 and 2.12, the crew go through the doors, and lunch in the canteen

- Built: both, and the two rules they overrule are in "What was overruled" above.
  **2.11**: `figureGoesThroughDoors(key)` is gone and `roomBehindStation(station)` is what decides,
  so an estimator at a take off, an admin at the emails, a clerk at his orders and a draftsman at his
  drawings (all of them `stationForTask`'s office station) go through the office door and are off the
  hall until they come out; their grey bubble sits at the door. `figureIsThroughADoor(key, cell,
  station)` and `walkerIsThroughADoor(walker)` both read the station now, so the walker of a man
  behind a door is still kept at the doorway and he walks out of it rather than appearing at his
  bench. `officeFigure` in `src/render/office.ts` was read and left exactly as it is: the office view
  is one box measured for the owner (CLAUDE.md T19 2.2), and it is now asserted to draw him and
  nobody else however many of the crew are at a desk.
  **2.12**: `isDoorwayCell` answers for the canteen as well, `STATION_LUNCH` is what the dinner hour
  puts a man on (`stationNow`, landed in B3a for the bubble), and `stationCell` sends that station to
  the canteen door cell, which is the cell an idle man already walks to, so the walk is the walk the
  hall already had and no new one was invented. At the break every man on the floor and the owner
  walk there, go through, and come out when it ends; the owner's `breakSkipped` keeps him on the
  floor by himself.
- Left: nothing of 2.11 or 2.12. Three tests were rewritten to the new truth and none was weakened:
  `tests/render/doors.test.ts` asserted that the canteen's door cell was not a doorway and that the
  estimator was drawn standing in it, and now asserts what Turn 21 does and the pair that tells the
  eating man from the idle one; the comment in `tests/render/hallRoom.test.ts` that said "the canteen
  is not a room the game draws, so nobody goes through that one" says what is true now, with its
  assertion (an idle owner is still drawn) unchanged, because that is still the rule for an idle man.
  New: the office view test in `tests/render/officeRoom.test.ts` and `tests/ui/lunchBreak.test.ts`
  (2), an app test that runs the clock into the dinner hour and finds nobody on the floor and
  everybody back after it.

### One bug this task found in B3a, and where it was

`stationCell` in `src/render/hall.ts` had no case for `STATION_LUNCH`, so a man at his dinner was
drawn at his own bench with `at lunch` over his head: the words were right and the cell was wrong.
It is one line, beside the idle and the benchless stations, and it is what makes the walk to the
canteen the walk the hall already had.

### Numbers and readings chosen (T21-B3b)

- **Nothing new is a number here.** The one reading is which stations are behind which door
  (`roomBehindStation`): the office station and the phone are in the office, the lunch station is in
  the canteen, and everything else is the hall. The WC is behind no station at all, because nothing
  in the game ever sends a man to it.
- **A man who is off sick or not working today is not sent to lunch either**, because he is not on
  the hall's own list for the day. He is still drawn at the canteen door all day, marked "(off)",
  which is what Turn 11 did with him and is not this turn's to change.

## T21-B3c: 2.13, the tool cabinet stands two metres wide

- Built: the checks the brief asks for, as tests rather than as paragraphs, and the migration case
  phase A left. `tests/engine/toolCabinet.test.ts`, which is Turn 6's file and keeps its eight tests,
  gains six: the footprint of a standing cabinet and of a turned one (1 by 2, which is what a rotated
  2 by 1 is anywhere); that `canPlaceSpec` places and refuses it as any other
  2 by 1 with no rule of its own (a cabinet one cell along is refused with "On the tool cabinet", two
  cells along is the next slot and free, and the last slot ends exactly at the hall's own width);
  that the whole row lays out with nothing overlapping, nothing on the bench row under it, nothing on
  a room and nothing off the floor; and that the station table has no row for a cabinet, so it takes
  `DEFAULT_ROW` and the man stands beside it and never on either of its two cells. The
  `zone 3 by 2` arithmetic is its own describe, with the numbers in it. `tests/cloud/migrate.test.ts`
  gains the case the brief names: a v29 hall with one cabinet more than the row holds comes out with
  the first six on the row two cells apart and the seventh in the yard at (20, 0), with a sold one
  left exactly where it was because it is not in the hall to be laid out.
- Left: nothing of 2.13, and nothing was weakened. `tests/render/spriteClasses.test.ts` gained one
  test rather than losing one: its loop measures one file a class and said so, which left the
  cabinet's turned picture unmeasured, so that file is now measured too, mismatch and all.

### Phase A's `zone 3 by 2` arithmetic, checked: it holds

The brief tags the 3 by 2 zone [TUNE] and asks for the arithmetic to be checked rather than trusted.
It is checked, in `tests/engine/toolCabinet.test.ts`, and **phase A's reading is confirmed on all
three counts. This is a line Piotr has to rule on.**

1. **It stands on the workbenches.** The cabinet row is at y 3 (`CABINET_SLOT_LAYOUT`) and the bench
   row is at y 4 (`BENCH_SLOT_LAYOUT`). A zone two cells deep at y 3 covers y 3 and y 4, so the first
   cabinet's zone is on the first bench, and the day one hall cannot be laid out at all.
2. **No two cabinets can stand side by side.** The slots are two cells apart, because the cabinet is
   two cells wide; a zone three cells wide overlaps its neighbour's. A row of three cell zones from
   x 8 holds **four** of them in a hall twenty cells wide, and a six man crew wants seven.
3. **It costs the player a man.** The zone is what the free floor is measured against
   (`freeFloorM2`), and the crew limit is that floor over `M2_PER_PERSON`, 24. A cabinet takes 2 m2
   today and would take 6, so four more each; six cabinets is 24 m2, which is exactly one man.
   Measured on the day one hall: adding a second cabinet takes 2 m2 off the free floor today.

If Piotr wants the metre of standing room in front of a cabinet drawn after all, it is two lines in
the spec plus a cabinet row that is three cells apart and clear of the benches, and the crew limit
moves with it, which is a balance change and not a footprint change.

### What the 2.13 checks measured

- **The spec and the row**: `width 2, depth 1, height 1`, zone equal to the footprint; six slots at
  x 8, 10, 12, 14, 16, 18, all at y 3, the last ending at x 20, which is the hall's own width. A
  seventh cabinet falls back to the first free cell the way any purchase does (`anchorFor`).
- **Placement**: no change was needed. `canPlaceSpec` works on the zone, and the zone is the
  footprint, so a 2 by 1 is placed and refused as any other 2 by 1. Asserted.
- **The station table**: no change was needed. There is no `toolCabinet` row in `STATION_TABLE`, so
  it takes `DEFAULT_ROW`, whose offsets count off `footprintCells(item)`; the man stands off one of
  the four sides and never on either cell of the cabinet. Asserted for all three roles.
- **The picture**: **the delivered art does not match the new footprint.** Measured off the PNG
  headers, `toolCabinet.standard.png` is **112 by 112** and `toolCabinet.standard.r.png` is **112 by
  112**; the contract (`spriteFileSize`, docs/art/SPRITES.md 2) wants **160 by 136** for a 2 by 1 by
  1, which is what `spindleMoulder.standard.png` is already drawn at. 112 by 112 is the canvas of a
  1 by 1 by 1. Until the two are redrawn the hall draws a square one cell picture in the two cell box:
  `spriteImage` fits it `xMidYMax meet`, so it is scaled to the box's height and centred across its
  width, and it does not sit over its own two cells the way a two cell picture would. Neither the
  sprite files nor `docs/art/SPRITES.md` was touched (CLAUDE.md T21 section 6); the request is already
  written up in `docs/art/REQUESTS-T21.md` 2, phase A asserts the unturned file by name in
  `tests/render/spriteClasses.test.ts` and this task adds the turned one beside it, so the day the
  redrawn pictures land those assertions fail and the entries are deleted.
- **The migration**: a v29 hall whose cabinets stood one cell apart comes out on the new row, a save
  with more of them than the row holds puts the extras in the yard, and a sold one is left alone.
