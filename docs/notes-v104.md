# Notes from v104: the game light again on a big company

Built in chat on 18.10.2026 on v103 (STATE_VERSION 49, unchanged). Piotr, with his save of day
4,300: "now that we have plenty of lines the whole program stutters every second and does not run
smoothly, there must be an awful lot of calculating at once, and every now and then our production
lines disappear"; then "give all these fixes here so it flies". Nothing of the game's rules, figures
or pictures moved: the same game, worked out and written faster.

## 0. The save

Day 4,300: seventeen lines, 34 engineers, 50 people, a hall of 130 by 48 m, 251 pieces of kit, 311
drawables in the hall's live layer, and a state of 4.4 MB, of which 5,396 finished tasks and 834
unloaded lorries going back to day 2 (1.6 MB) that nothing read again.

What a second at 1x cost on v103 (headless Chromium, the CPU profile of ten seconds): one long task
of 230 to 290 ms every game minute, which is the stutter. In it: the minute (`runMinutes`, 57 ms: the
copy of the state 20, the minute itself 37) and the page written whole (`writePage`, 74 ms); and in
every frame between, the engineers (88 ms a second: their paths asked of the kit twice a man a frame,
and every one of them put among the 311 drawables again in every frame he walked) and the
forklifts (20 ms a second). At 4x and 10x the page could not keep up at all (section 5).

The lines that blinked out: the page matched the hall's drawables by their place in the list. The
drawables are sorted by depth, and a man or an engineer walking past a module changes the order, so
the patch turned a module into the drawable that had stood before it, wrote its picture's `href`
again, and the browser drew nothing there until the picture was decoded again.

## 1. The hall's drawables matched by what they are (`src/ui/patch.ts`)

- A list whose nodes say what they are drawn for (`data-kit`, `data-engineer`,
  `data-forklift-line`, `data-figure`, `data-canteen-kit`, `data-lane`, `data-line-pallet`,
  `data-room`, `data-van`, `data-door-room`) is patched by what they are: each fresh node meets the
  old node drawn for the same thing wherever it stands, and is moved there, never turned into its
  neighbour. Two drawn for one thing are matched in their order; a node that says nothing is matched
  to the next old node that says nothing, as before. Only the nodes out of order are moved: the
  longest run of them already in order stays where it is.
- Every drawable carries the mark of its own markup (`data-sig`, 53 bits of hash, written beside its
  `data-depth` by `withDepth`). A drawable whose mark is what it was is the same inside: its own
  attributes are brought into line and nothing inside it is read or written, so a man's step and a
  machine's frame stay as the frame left them.
- Everything else of the page is patched as it always was: a control keeps its node while its
  `data-do` and `data-id` are the same (CLAUDE.md T9 3.8).

## 2. The frame (`src/render/engineers.ts`, `src/render/walkers.ts`, `src/ui/app.ts`)

- The frame's questions of the hall are pinned for the frame (`whilePinned` round `stepFrame`): which
  lines stand, where each one is (`linePlace`, one pass over the kit for every line), asked once a
  frame and not once a man.
- An engineer's path is read once a frame and handed to his drawing, and he is put among the
  drawables by the middle of the cell he is on, as a man walking between stations is: put again when
  he steps on to the next cell and not in every frame. Against the whole metres every thing on the
  floor stands on, the middle of his cell puts him where his own feet would.
- The floor each drawable stands on (`data-foot`) is read once and kept with the text it was read
  from.
- The page of a minute is written in the frame after the one the minute ran in, so the minute and the
  page are two frames and not one long one. A page owed since an earlier frame is written at once,
  and so are an event and the end of the game.

## 3. The engine's minute (`src/engine`)

- **The copy of the state** (`clone`): made by walking the state once, value for value what
  `JSON.parse(JSON.stringify(state))` gives (the state is plain JSON, types.ts), instead of writing
  it out as text and reading it back: three to four times as fast. A number JSON cannot write is
  null, minus nought is nought, a key with nothing in it is left out, as JSON makes them.
- **The pin for a call** (`whilePinned`, src/engine/pinned.ts): a call that changes nothing of the
  state pins it for its own length and puts back the pin there was before. The stage plan of a job
  (`stagePlanFor`), the crew at each family (`crewByFamily`), the day plan (`dayPlan`), the hall's
  own lines of the Output sheet (`hallLinesOf`) and a line's level (`lineLevel`) are such calls:
  inside each, which modules stand and which line the jobs get are worked out once, where they were
  worked out three times a stage of every plan. The engine's minute as a whole is never pinned:
  everything it writes is read afresh by the next question.
- Kept while the state is pinned, and asked the long way otherwise: which line the jobs get and at
  what level (`lineLevelForJobs`), the move being made (`movingMachines`), a man's home cell
  (`homeCellOf`), whether a line makes windows (`lineMakesWindows`), every line's ground
  (`claimedGround`), what stands on the floor (`standingOn`), and the floor itself, cell by cell
  (`isFree`, `isWalkable`): a map of the footprints and of the machines whose pictures cover each
  cell, built once a page.
- Read once where they were read once a man: a contract piece's plan in the crew's count and in the
  day plan, a job's round in the day plan, a contract piece's pace in its minute, and whether a line
  stands in the week's meters.
- The hall's factor (`hallProductivityFactor`) reads the hall's own lines of the Output sheet and no
  longer works out the whole sheet, every man's and every machine's line, twice a minute to throw
  them away. The sheet is what it was.
- `standsInTheHall` keeps its answers by family and then by class, with no key written for a
  question.

## 4. The history nothing reads (`forgetOldHistory`, src/engine/game.ts) [TUNE: chat: 30 days]

At the day's open, a task finished and a lorry unloaded more than `HISTORY_KEPT_DAYS` (30) days ago
go, unless an open job is theirs, somebody has the task in hand, or a task kept names the lorry.
Nothing read them after the day they were done: the laptop's desk shows today's finished tasks, the
shopping list the lorries not yet unloaded, a dropped job asks after its own loads, and those are
kept. Piotr's save keeps 51 tasks and 4 lorries of 5,402 and 834 at its next morning, and the state
is 2.9 MB in place of 4.4. Not touched: the line's day book of 400 days (its tab shows a year), the
monthly reports (the Accounting tab lists every month), the ledger (2,000 lines, as it was), the
finished jobs.

## 5. Measured

v103 against v104 on Piotr's save, one after the other on the same machine, headless Chromium
with no graphics card, ten seconds each (script time: the main thread's JavaScript; long tasks:
over 50 ms):

| | v103 | v104 |
|---|---|---|
| 1x, script time | 2.60 s | 1.18 s (1.17 s the morning after, history left behind) |
| 1x, long tasks | 8, six of 232 to 293 ms | 9, from 57 to 138 ms |
| 1x, a page written | 74 ms | 39 to 44 ms |
| 1x, a game minute | 57 ms (copy 20, minute 37) | 20 to 24 ms (copy 8 to 10, minute 12 to 14) |
| 1x, the engineers and the forklifts | 1.08 s | 0.18 to 0.22 s |
| 10x, script time | 7.83 s of 10.7 | 3.53 s (3.32 the morning after) |
| 10x, longest task | 3.47 s, the rest 228 to 412 ms | 173 ms |
| 10x, game minutes in ten seconds | 19 | 50 |
| 4x, game minutes in ten seconds | 10, a freeze of 3.55 s | 22, longest task 117 ms |
| 1x, twenty seconds: drawables turned into another | 1,371 | 0 |
| 1x, twenty seconds: kit pictures written again | 240, 177 of them a line's module | 6, module 6's pallet stack growing |

Without a graphics card this machine paints the hall six times a second however little the
JavaScript does (a paused game, no long task at all, six frames a second), so the game minutes in
ten seconds are the painting's ceiling here and not the game's: every frame may run at most a
tenth of a second of the clock. On a machine that paints sixty frames a second the clock keeps its
speed. What is left of a second at 1x: a page written once a game minute (about 40 ms: the hall's
markup 18, read and compared 15, the page around it 7) and the minute itself, in two frames.

## 6. Tests

- `tests/engine/v104Speed.test.ts`: the copy is JSON's to the value and shares nothing; the pin for a
  call keeps its answers, puts back the pin before it (a call that throws too) and is off when the
  call is over; the floor, the lines' places, their ground and what stands on it pinned are what
  they are the long way, cell by cell; the hall's factor is the sheet's total; the history left
  behind at the morning thirty days on, an open job's and a named lorry kept.
- `tests/ui/v104Patch.test.ts`: drawables moved and not rewritten when the order changes, their
  pictures untouched; one moved, one move; the new added, the gone dropped, two drawn for one thing
  and the nodes that say nothing matched in their order; a drawable with its mark unchanged left
  alone inside; every drawable of the hall marked, the same hall the same marks; an engineer put by
  the middle of his cell; the page of a minute written in the next frame.
- Flipped, each with its line of reason: (vv) of Turn 28 reads the sash window's two lorries as
  they stood the last minute the job was open, since the job takes longer than thirty days and its
  lorries are left behind after it (`tests/scenarios/turn28.test.ts`); the dirty hall's chip reads
  the words the hall shows and not its markup, whose marks are numbers nobody reads
  (`tests/render/views.test.ts`).
- Pins: APP_VERSION 'v104' (version, saveCheck).
