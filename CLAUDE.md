# Turn 19: the men move like men

Woodwork Empire. Autonomous session brief for Claude Code (Opus 5, effort ultracode, cloud, agent
teams expected). Owner: Piotr. Programmer: Claude. Spec author: Claude (chat), 17.09.2026, from
Piotr playing v26 and the day's talk (Petros: software/woodwork-empire, STAN V27-1 to V27-4 and
T19).

Read this whole file (first line must say "Turn 19"; if the root CLAUDE.md does not, stop and
report), then REPORT-T18.md and REPORT-T17.md in full, then docs/mockups/t19/README.md and open
workplan-assign-A.html in a browser, then docs/art/SPRITES.md sections 9 and 10, then the archived
briefs in docs/. Where files disagree, this one wins. All standing rules apply (no em or en dashes
anywhere, scope 1:1, one code path, constants never in the UI, [TUNE] for every figure you choose
and [PIOTR] for his, kill background processes, PR without merge, end the session, no PR watching,
npm run check gated on its own exit code, every click single, one APP_VERSION bump).

Precondition. main carries Turn 18 merged (PR #18): APP_VERSION 'v26', STATE_VERSION 15. If
APP_VERSION is not 'v26', stop and report.

## 0. What this turn is for (Piotr, 17.09)

Piotr watched v26 and said the men "walk like robots and shake like a leaf"; that his own figure
vanishes when he goes into the office; that the joiner stands on the bench, not at it; that the
work plan's way of putting people on a job is unreadable; that the labourer still does not clean;
that a workshop is silent and should not be; and that the doors should open. And four things
from the day: reputation is a total and should read as one, drawings take far too long, the
laptop should queue tasks, and there is no sprayer.

The name of the turn is the first of these. One agent's whole job tonight is to find out why the
figures move badly and make them move well; nothing else that agent does matters if that is not
done.

## 1. Rules restated (short)

Everything from Turns 1 to 18. Tonight in addition:

- APP_VERSION = 'v27'. STATE_VERSION bumps to 16 in phase A, once, for section 4's fields; every
  v26 save loads.
- **Sound is in** [PIOTR]. The standing "no sound" line of every brief since Turn 4 is withdrawn
  for this and later turns. The rule that replaces it: one sound engine (`src/ui/sound.ts`, Web
  Audio), one table of sounds by event and by station, a volume and a mute in Settings, and
  nothing that plays before the player's first click (browsers refuse it). Real recordings are
  Piotr's to make in his own workshop (section 9); the engine ships with quiet synthesised stand
  ins so every hook can be heard tonight.
- Nobody stands on a thing. A standing cell is a cell the figure's feet can be seen on the floor
  of; if a sprite's drawn body covers the table's cell, the cell moves, the sprite does not.
- Art is not this session's beyond vectors: doors, the sprayer's capsule, the stand in sounds.
  Requests in docs/art/REQUESTS-T19.md.

## 2. Changes to the design (the contract)

### The figures

**2.1 The movement, diagnosed and fixed [PIOTR: "like robots, shaking like a leaf"].** This is a
diagnosis first and a fix second, by one agent, written up in the report as its own section
("The movement") before any code is changed. What to look at, in this order, and measure:

1. **The transform is rounded every frame.** `translateOf` in walkers.ts writes
   `Math.round(feet.x), Math.round(feet.y)`: a figure moving 1.0 cell a second at 60 fps moves
   0.4 px a frame and the rounding makes it step 0 px, 0 px, 1 px, 0 px, 1 px. That is the
   shake. Measure it (log the transform for one second of walking) and, if it is the cause,
   write sub pixel positions (two decimals) and let the browser interpolate; the figure's own
   sprite stays pixel aligned inside the group by the sheet's anchor.
2. **The frame clock and the walk are not tied.** `characters.ts` picks the frame from
   `nowMs * fps`, the walk advances by cells a second: a stride in the sheet does not match a
   cell on the floor, so the feet slide. Measure the walk sheet's stride (how far the figure
   should travel per full cycle at the sheet's fps, from SPRITES.md 10) and tie
   `WALK_CELLS_PER_SECOND` to it, or the fps to the speed, so the feet plant where the floor
   moves. If the sheet gives no stride, choose one [TUNE] and say so.
3. **A turn at every cell.** `facingFromScreen` is re-read on every cell of the path, and a
   diagonal on the grid is a staircase of one cell steps, so the figure flips facing every cell.
   Fix: the facing is chosen per leg from the leg's overall screen direction (from the cell he
   set off from to the cell he is going to), not per cell; a genuine corner (the path turns
   ninety degrees for more than two cells) turns him.
4. **Frame changes on the wrong frame.** If `playCharacters` and `stepWalkers` run in the same
   frame but write the transform and the frame at different points, the figure can be seen half
   updated. Check the order and the DOM writes.
5. **Anything else the log shows.** The report says what was measured, what was found, what
   was changed and what the new log looks like.

Done: a test with a fake clock that asserts, over one second of walking, that the transform's x
and y each change by a near constant amount every frame (no zero steps between nonzero ones),
that the facing does not change on a straight diagonal leg, and a screen recording is not asked
for: the log in the report stands in for it.

**2.2 The owner in the office [PIOTR].** When the owner's station is the office or the phone, the
hall draws him standing in the office doorway, the door open (2.3), facing in; he is never absent
from the hall. The office view draws him at his desk (the office picture's desk region), so a
player who follows him through the door finds him. Done: the render tests for both views.

**2.3 Doors open [PIOTR].** The office door and the canteen door are drawn in three states by a
vector on the door control: closed, half, open (a door leaf swung on its hinge in the hall's
dimetric, the dark opening behind it). A figure whose leg ends at a door cell opens it as he
arrives (closed to half to open over `DOOR_SWING_MS` 400 [TUNE]), stands in it while his station
is the room, and the door closes after `DOOR_CLOSE_MS` 600 [TUNE] when he leaves the cell; a
door with somebody standing in it stays open. Each swing plays the door sound (2.10). Done: a
render test of the three states and the app test that the door opens when the owner goes to the
office and closes when he comes out.

**2.4 At the bench, not on it [PIOTR].** The joiner at a bench is drawn with his feet on the
bench's front cell; on the hall his body covers the table's top because the bench sprite is drawn
larger than its footprint and the standing cell is inside the drawn body. Measure the bench
sprite's drawn extent against its footprint (SPRITES.md 9) and put the operator's cell on the
first cell whose floor is visible in front of the drawn body (one cell further out if it must,
`out: 1` in the station table row), the same for the second man at the back, and check every
other family's operator cell against its sprite the same way: a table of family, sprite extent,
footprint, cell chosen, in the report. Done: the station table test updated to the new rows and
a screenshot of a joiner at a bench with his feet on the floor.

### The people

**2.5 Assign to this job, no limit [PIOTR; docs/mockups/t19].** The work plan row's "on it:
Gary · You | Gary" and "Second man: Alone | Gary" go. In their place, as drawn: the people on the
job as chips (each with a cross that takes him off) and one blue button `Assign to this job`
that opens a list: You, every joiner and every sprayer (2.9), with the ones already on another job
greyed and unclickable, with the job's name after theirs ("Callum · on Garage shelves"), the ones
already on this job greyed with "already on this job", and the helper greyed with "helpers do not
build". No limit on how many go on a job. Engine: `job.assignedTo` and `job.secondAssignee` become
`job.assignees: string[]` (the owner as 'owner'), every place that read the two reads the list;
a stage at a machine takes the first man free at the machine's operator cell and the rest at the
waiting cell (and, when the waiting cell is taken, the next free cell along the same side, one
out); a bench stage takes the first at the operator's cell, the second at the second place, and
the rest at the next free cells along the front; all of them book minutes into the job at their
own rates, so twenty men do make it go faster, and the machine stage goes no faster than one man
at the machine plus what the others do on the bench work that stage allows. Migration: the two
old fields become the list. Done: the engine tests (three men, one saw: the cutting stage is one
man's speed, the assembly stage is three men's), the work plan test, the migration test.

**2.6 The sprayer [PIOTR].** A new role `sprayer`: hired like a joiner with three tiers, pay
`[TUNE 2,300 / 2,700 / 3,100 a month]`, a capsule until his sheet is delivered, listed in Our
team and the crew limit. The finishing stage of a lacquered job (`sprayBooth`) is his at rate
1.0; a joiner may still do it at `JOINER_SPRAY_RATE` 0.7 [TUNE], so a workshop without a sprayer
is slower there, not stuck. The assign list (2.5) offers sprayers for every job (they can help on
a bench) and marks them "sprayer" so the player sees who is who. Done: the tests.

**2.7 The labourer cleans without being asked [PIOTR, the half of T17 2.3 that was not done].**
A `cleaning` task exists today only after the player presses Clean up; the helper takes it the
moment it exists, but nothing creates it. Tonight: when the hall's dust band reaches dirty (the
band Clean up appears for) and a helper is on duty, the engine creates the cleaning task itself,
once per dirtying, and the helper does it at his next free minute; the chip under the hall reads
`The hall is dirty, Dave is cleaning it` with no button. Without a helper nothing changes. Done:
an engine test (a hall that turns dirty with a helper on the books is clean again by the end of
the day with no action from the player; without a helper the task is not created).

**2.8 The bench can be sold [PIOTR].** The workbench's card gets Sell like every machine, at the
catalogue's resale rule; a bench somebody is working at cannot be sold until the day ends (the
button greyed with the reason). Done: its test.

### The desk

**2.9 Reputation is a total, and the board says so [PIOTR].** The reputation column of the
Company board reads "this week 40" with a "Start of the week, carried over" row, so it looks like
a weekly count that resets. It is not: the figure is the reputation now, cumulative. The column's
headline becomes `Reputation 40` (the total, `effectiveReputation`), the list under it is headed
`What moved it this week` with the week's rows and no carried over row, and the arithmetic under
the list shows the week's net (`+0 this week`) beside the total, never as the total. Done: the
company test.

**2.10 Sound [PIOTR].** `src/ui/sound.ts`: one engine on Web Audio, unlocked by the first click,
with `play(event)` for one shot sounds and `loop(station, on)` for the machines, a master volume
and a mute in Settings (saved). The table `SOUNDS` maps: `door` (2.3), `tableSaw` (loop while
somebody is at the saw), `extractor` (loop while the extraction pulls), `hammer` (short knocks at
a bench during assembly, every few seconds [TUNE]), `drill` (at a bench during fitting), `sander`
(at a bench during finishing without lacquer), `sprayBooth` (loop while somebody sprays). Each
entry names a file under `public/sounds/<name>.ogg`; when the file is there it plays, when it is
not the engine plays a synthesised stand in (a filtered noise for the saw and the extractor, a
click for the hammer, a buzz for the drill, a rasp for the sander, a soft thud for the door)
quietly, at `STAND_IN_GAIN` 0.15 [TUNE]. At x10 and x30 the loops play at their own pitch and
the one shots are thinned to at most one a second, so the game does not rattle. Done: a test
with a fake audio context that the right loops are on for a hall with a saw running and a bench
assembling, that nothing plays before the unlock, and that mute silences everything.

**2.11 Design time from the value [PIOTR].** Drawings take
`max(DESIGN_MIN_MINUTES 30, DESIGN_MINUTES_PER_1000 24 * basePrice / 1000)` minutes, times the
software factor as today (basic 1.0, standard 0.5, pro 0.2, confirmed). A £2,500 job is 60
minutes, £10,000 is four hours, £20,000 is eight. The per product `designMinutes` and the size
multiplier go. Done: the tests at the three figures and the minimum.

**2.12 Add as next [PIOTR].** On the laptop, while a task is running, the other tasks' buttons
read `Add as next` and queue the task behind the running one (the queue of T17 2.16), instead of
`Put that down` and replacing it. The running task keeps a `Put that down`. Done: the laptop test.

**2.13 The hall has been set up, a flag [T18's blocker].** `state.hallSetUp` (boolean), set the
first time setup mode is left with anything placed; the first steps line of T18 2.7 reads it
instead of looking for a workbench. Migration: true when any equipment stands in the hall.

## 3. How to run this session (agents)

- **Phase A (one agent, serial):** section 4's fields, STATE_VERSION 16, the migration; the new
  role in `WorkerRole` and its constants; `assignees` in the types with every compile error fixed
  by reading the list; the sound engine's file and the Settings fields stubbed; `hallSetUp`. The
  six frozen files of Turn 13 are frozen for phase B after this; a B agent that needs one writes
  a note for phase C.
- **Phase B (three agents):** B1 the figures: 2.1 (the diagnosis first, written before the fix),
  2.2, 2.3, 2.4, 2.10 (the engine's hooks on the hall). B2 the people: 2.5, 2.6, 2.7, 2.8. B3 the
  desk: 2.9, 2.11, 2.12, 2.13 and the Settings side of 2.10.
- **Phase C (one agent, serial):** the notes, the scenarios (the sixteen months with assignees and
  the sprayer; plus (aa) a month with three men on one job; (bb) a lacquered kitchen with and
  without a sprayer), the cross check of section 7, the pictures, the report, the PR.

## 4. State

STATE_VERSION 16. `job.assignees: string[]` replacing `assignedTo` and `secondAssignee`;
`settings.sound: { volume: number; muted: boolean }`; `hallSetUp: boolean`; the sprayer as a
worker role (no new field). Every v26 save loads: assignees from the two old fields, sound at
0.7 unmuted [TUNE], hallSetUp from the equipment.

## 5. Task queue, in order

Branch turn-19-the-men-move-like-men from main. One commit per task, npm run check green on its
own exit code before each, two report lines per task in REPORT-T19.md.

T19-A1 Housekeeping and v27: docs/turn-18-brief.md byte for byte from the Turn 18 merge commit's
CLAUDE.md, the README's lines, APP_VERSION 'v27', docs/art/REQUESTS-T19.md (section 9).
T19-A2 Phase A as section 3 says.
T19-B1a 2.1 (diagnosis in the report first, then the fix). T19-B1b 2.4. T19-B1c 2.3 and 2.2.
T19-B1d 2.10's hooks on the hall.
T19-B2a 2.5. T19-B2b 2.6. T19-B2c 2.7 and 2.8.
T19-B3a 2.9 and 2.11. T19-B3b 2.12 and 2.13. T19-B3c 2.10's engine, table, Settings and tests.
T19-C1 notes. T19-C2 scenarios. T19-C3 cross check. T19-C4 look and shoot: ten pictures into
docs/report-t19/ (a joiner at a bench with his feet on the floor, the owner in the open office
door, the owner at his desk in the office view, the three door states, the assign list open,
three men on one job in the plan, the sprayer in Our team, the Company board's Reputation
headline, Settings with the sound controls, the laptop with Add as next). T19-C5 report and PR
titled `Turn 19: the men move like men`, do not merge, end the session.

## 6. Do not (tonight)

- No limit on assignees. Piotr said none.
- No change to Output, Efficiency, the rate or the economy beyond 2.11.
- No sound before the first click; no sound files invented (stand ins are synthesised).
- No touching docs/art/SPRITES.md, CLAUDE.md, the archived briefs, the mockup files, the sprite
  files, the character sheets or the font file.
- No storage access outside src/cloud/store.ts; no PixiJS, mobile, Steam, Electron.
- No watch loops, nothing left running.

## 7. The cross check (before the PR)

- The movement section of the report exists, was written before the fix, and its after log shows
  no zero steps between nonzero ones and no facing change on a straight leg.
- `grep -rn "assignedTo\|secondAssignee" src`: nothing outside the migration.
- The sprayer: a lacquered job with a sprayer finishes its finishing stage faster than the same
  job with a joiner, asserted.
- The helper: a scenario day with a dirty hall and a helper ends clean with no player action.
- The owner is in the hall's doorway while in the office, and at the desk in the office view.
- Sound: nothing plays before the unlock; mute silences; the saw loop is on only while somebody
  is at the saw.
- The ten pictures.

## 8. Parked

- Real sound recordings (section 9): Piotr.
- The sprayer's character sheet: GPT, from the owner's model, a white shirt [TUNE].
- The helper's character sheet: Piotr with GPT (yellow shirt), as before.
- Everything parked by Turns 13 to 18.

## 9. Recordings requested (docs/art/REQUESTS-T19.md, for Piotr, in his own workshop)

Mono, 44.1 kHz, `.ogg` (or `.m4a`), in `public/sounds/`, named exactly:

- `door.ogg`: an internal door opened and closed, two seconds, the open first.
- `tableSaw.ogg`: the saw cutting a sheet, ten seconds of steady cut, loopable (no start, no
  stop; the engine loops it).
- `extractor.ogg`: the extraction running, ten seconds, loopable.
- `hammer.ogg`: three knocks of a hammer on a carcass, one second.
- `drill.ogg`: a cordless drill driving one screw, one second.
- `sander.ogg`: hand sanding a panel, five seconds, loopable.
- `sprayBooth.ogg`: the spray gun on a panel, five seconds, loopable.

Record with the phone a metre from the tool, in the empty hall, nothing else running. The engine
picks each file the moment it is there; until then it plays a quiet stand in.

End of brief.
