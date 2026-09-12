# Report: Turn 4

The office as a room, calls that interrupt, and moves that cost.
Branch `claude/turn-4-execution-m95488` (the cloud environment named it, not `turn-4-office-room`:
CLAUDE.md 4 allows for that and asks for it to be said here).
Base: `main` at `e53baec`, which is PR #4 plus Piotr's office artwork and the Turn 4 brief itself.

---

## 1. Done

T4-01 `d27b480` Housekeeping. `docs/turn-3-brief.md` is the root CLAUDE.md as of the PR #4 merge
(`9314a03`), copied out of git history with no edits. The office art had landed on `main` after
Turn 3 without the manifest being regenerated, so two sprite tests that asserted
`public/sprites` was empty were red before a line of Turn 4 was written. They now assert what they
were always about: the manifest is what is on disk, the loader reads the manifest and never the
network, and a folder that is not there reads empty.

T4-02 `b52aabf` The design task. Reproduced first, then fixed. Cause in one sentence: when Turn 3
moved the design queue out of the laptop and onto the roll, the Start button went with it but the
sight of the task the owner is already holding did not, and `startTask` refuses silently while he
holds one, so the drawing sat at its full minutes for ever. `startTaskCheck` is now the one place
the refusals are written down; `startTask` asks it and nothing else, and every task row asks it too,
so a Start the engine would refuse is never drawn. The row says "Busy with Bookkeeping" and offers
to put that down where the player is standing.

T4-03 `d15e0d7` Calls as interrupting events. Calls are not a gate: nothing on the Start production
list mentions them, the material order waits on the drawing alone, and the Calls step of a job card
is only amber while the client is actually on the line. Every job gets a diary at acceptance: one
call in each slice of its expected span, at a random working minute from the seeded RNG. When one
comes due the clock stops and the owner answers or lets it ring. Answering is fifteen minutes that
come out of whatever he was holding, and he goes back to it afterwards; a man at the bench walks
back to the bench. A salesman with a day left in him takes every call without being asked. Letting
it ring once costs a note on the card and a second attempt the next working day; from the second
miss on it takes a tenth off what the client will say about the job and a point off the rating
itself. The job card says "Calls: 1 of 3 taken, 1 missed".

T4-04 `dfa705b` Bench required. A hall with a saw, extraction and no bench makes nothing. The reason
sits straight after "no extraction" in the one precedence list, so the job card, the Work here
control in the hall and the line under the job all say the same words out of the same check. Benches
are taken one man to one bench, in the order the jobs went to them. A joiner with work waiting and
nowhere to do it stands at the canteen door and says "no bench"; so does the owner.

T4-05 `6c00ced` Moving machines. Leaving setup mode with anything shifted puts a move on the hall's
list: an hour an item, carried by the owner, or by a joiner or the helper while he is not in. The
clock runs itself at 4x until it is done, the top bar says "Moving machines" instead of the speed
chips, the speed control is refused, and every bench stands still. Every moved machine that is
ducted into the extraction is reconnected at 800, charged when the kit is back down, one ledger
line a machine; setup mode shows the running bill before Done. The flexi extraction system at
50,000 joins the extraction family beside the central one: everything the central system does, and
the reconnection never costs again. The pelletiser works off either.

T4-06 `7d2f095` Summary cadence. `summaryCadence` sits in the state and the control sits in two
places, on the summary itself and in the Menu. Daily is the default; weekly lands on the Friday with
the week's figures, monthly on the last working day of the month with the month's. The title says
which span it is carrying. Whatever the cadence, the day ends exactly as before: only the modal is
skipped.

T4-07 `c2392b6` The office as a room. Three layers on the 1672 by 941 canvas, scaled by one value to
whatever room the page has under the top bar, centred and letterboxed. The seven regions of
SPRITES.md 8.2 are transparent rectangles in canvas coordinates with a `data-do` hook and the region
name as a tooltip; the clock is the one that opens nothing, because it is the live clock. The clock
digits and the company name are drawn by the game over the blank areas the artwork leaves, and ride
the same scale. A layer the art side has not delivered is a flat rectangle with its name on it. The
laptop has the four tabs, the jobs on the books hang on the Work Plan board, and the job card moved
into a module the board and the gate list share.

T4-08 `e4faa63` The desk items are deleted. `DESK_LAYOUT`, `DeskObjectSpec` and `OFFICE_TILES` are
gone from the constants and the office objects they placed with them.
`tests/render/deskItemsGone.test.ts` reads every source file in the repository and fails on any
mention of the layout, the keys or the old hooks, and asserts the office renderer draws no SVG at
all.

T4-09 `9b52d6f` Sprite check page. The three office layers get their own section: each one full
width, scaled to the page, with its key, its 1672 by 941 canvas and whether the file is there.

T4-10 `8fe87fd` Scenarios. The Easy month says what the phone did to it; the short handed month says
the joiner had a bench of his own. A sixth month shifts the saw and the edgebander on day 3 and
asserts the two hours, the forced 4x for every minute of it, the benches standing still, and the
1,600 in two ledger lines.

T4-10b `c08c955` A tidy up before the report: the task row control moved out of the laptop into the
row primitives, which broke an import cycle between the laptop and the drawings, and the catalogue
region's tooltip now says what it opens.

T4-11 This report, and the defects that came out of writing it and of putting the whole diff
through a five way adversarial review (contract, correctness, UI, tests, conventions). Every
finding was checked against the code before it counted. What was fixed:

1. A move the day ended in the middle of was never picked up again: `finishDay` takes the owner off
   what he is holding, nothing re-assigned it, and because the hall cannot be set out while a move
   is on the list, "Set up hall" was dead for the rest of the game and the ducting was never
   charged. The morning picks it up now, the owner first, a joiner or the helper if he is not in.
2. `resumeTaskId` outlived the interruption that set it, so a call that found the owner holding
   nothing sent him back to whatever an earlier interruption had left behind. An interruption now
   always writes down what it interrupted, holding nothing included, and a finished move sends him
   back the same way a finished call does.
3. Benches were handed out in the order the jobs sit on the books rather than the order the men got
   to them, so a job started later but accepted earlier turned a man off the bench he was already
   standing at. A job writes down the minute it took a bench, and the oldest claim wins.
4. Answering the phone used to release whatever the owner was holding, the way putting it down on
   purpose does. It is not the same thing: he is coming back in fifteen minutes and nobody else may
   pick it up, and a call in the middle of a move leaves the move in hand, so the clock stays
   forced at 4x for the whole span.
5. Setup mode was blocked only while somebody was actually carrying a move, so an owner at home
   could have set the hall out a second time and had the second batch ride on the first one's
   minutes. It is blocked while any move is on the list.
6. An item dragged away and dragged back inside one setup session was still charged 800. A move now
   remembers the tile the item started on and takes it off the list when it goes back, which is
   what the comment always claimed.
7. The clock stayed at 4x after a move. It goes back to the speed the player was on before he
   opened setup mode.
8. A salesman with less than fifteen minutes of his day left took a call he could not finish,
   leaving a part done job of work that survived into later days. He only takes one he can see out;
   otherwise the owner is asked.
9. The weekly and monthly summary said "End of week 1" over a minutes column and a hall column that
   were still the day's. The money column carries the span, and the other two headings say "today",
   because the state keeps no weekly count of a man's minutes.
10. A second client ringing while the owner was on the first call overwrote what the first call
    had interrupted, so the work under both was dropped. One phone at a time: the next client rings
    when he is off it.
11. The room was scaled from the window size and nothing redrew it when the window changed, so a
    resize with the clock stopped left the room at the old scale. `mount` listens for a resize.
12. The company name could never be ellipsised: `text-overflow` does nothing to a flex container's
    own text. It sits in a block inside the box now, which is what SPRITES.md 8.3 asks for.
13. The office scale was worked out from a copy of the stylesheet's numbers, and `TOPBAR_HEIGHT`
    matched nothing in it. The room is measured from its own box once it is on the page, so the
    stylesheet is the authority and no copy of it can be wrong. Checked in the browser: the stack
    now fits its box exactly, and follows a resize.
14. The new laptop tab bar had no CSS rule at all, so the four chips butted together.
15. Switching tabs landed the player part way down the new one, because all four share one modal
    shell and its scroll memory. A new tab starts at the top; a re-render a minute later still does
    not, which is what that memory is for.
16. `clampToViewport` and the anchor parameter of `openModal` died with the desk items: every
    surviving caller passed null. Both are gone.
17. The job card called an accepted job "calls and drawing" when the calls stopped gating anything.
    It says "drawing to do".
18. The hall banner and the top bar read two different predicates for the same state, so the hall
    claimed nothing was being made while nobody was carrying the move. The banner is for a move
    somebody is on; a move merely waiting takes the Set up hall button away and says why.

The tests came in for the same treatment, and were the worse for it. Seven of them were proved
hollow by mutating the code they were meant to guard and watching them stay green: the one test 3.6
asks for never read the figures the summary renders, the "Calls: 1 of 3 taken" line of 3.3 was
never rendered at all, the retry's day was never asserted, the rating penalty was only ever checked
at exactly two misses, the flexi system's "everything the central system has" asserted something
about the extractor instead, the ducting bill in setup mode had no test, and the Calls step was
never seen in the ringing state. Two more were tautologies and one scenario asserted a lower bound
where the brief asked for a span. All are rewritten, and every one of those mutations now fails.
Three more findings that were about the report rather than the code are fixed here: the test count,
the count of tests in one file, and the claim that both new drawings tests fail on the old code
(only the first does; the second is a regression test, which is what it is for).

And the conventions: a doc comment stranded on the wrong function, a comment claiming a number
matched the stylesheet when the stylesheet declares no such number, the ducting rule written out
twice, the flexi system with no tile of its own in the hall layout, two exports nothing outside
their module used, the cadence mapped to a period in the UI as well as the engine, and nine new CSS
rules that did not sort their properties the way the file does.

---

## 2. Not done or partial

1. **A joiner or the helper cannot be sent to a move from the UI.** The engine lets anybody eligible
   carry it (`assignWorkerTask`), and one is sent automatically when the owner is not in, but there
   is no control for the player to choose. The brief names who may do it, not a decision to be made;
   adding a chooser would be a new event, which was not asked for.
2. **Browser check: done for the room, not for the rest.** The office was driven in the Chromium
   this environment ships, over the DevTools protocol and with no new dependency, at a 1440 by 900
   window. The three layers stack and show the art, the stack comes out at 1322 by 744 inside a
   1416 by 751 box so it is letterboxed and never cropped, the page does not scroll in either
   direction, the clock reads 08:00 in amber on its casing, the region under the middle of the
   laptop hit tests as the laptop through the transform, the Work Plan board opens the Work Plan
   modal and the door goes back to the hall. What was not looked at: the hall at other window
   sizes, and the hover overlay, which needs a real pointer.

---

## 3. Tests

513 pass across 40 files; `npm run check` (lint, build, tests) is green and was green before every
commit. 454 was the Turn 3 count, of which two were failing on `main` before tonight (T4-01).

The tests the brief asks for by name:

- **3.2** `tests/ui/drawings.test.ts`, "says what the owner is busy with instead of a Start that
  cannot work". Written first and red on the old code, with the exact symptom: the roll offered a
  Start, the engine refused it, and nothing on the screen said so. Beside it, "draws the drawing to
  the end once the other job of work is put down", which passes on the old code too: it is the
  regression test, not the failing one.
- **3.3** `tests/engine/calls.test.ts`, ten tests: no call blocks production; an ignored first call
  changes nothing but the note and the second attempt; the second miss applies both penalties
  (3 x 0.9 - 1 on a delivered job); the salesman clears calls without an event; the schedule is the
  same for the same seed and different for another.
- **3.4** `tests/engine/machines.test.ts`, "will not start production with a saw and no bench, and a
  bench unblocks it", plus the precedence against "no extraction" and the joiner at the canteen door.
- **3.5** `tests/engine/moving.test.ts`: two machines charge 1,600 and take 120 minutes at forced
  4x; the flexi system charges zero and is the central system in everything else; a bench move
  charges nothing; and the running bill in setup mode carries the words the brief names, in
  `tests/ui/officeRegions.test.ts`.
- **3.6** `tests/ui/summary.test.ts`, "puts the summary up once in five working days, with the week
  in it", and "carries the figures of the week, not of the day".
- **3.1** `tests/render/officeRoom.test.ts` (scale, layers, placeholders, regions, live text) and
  `tests/ui/officeRegions.test.ts` (every region dispatches its action through the real app, the
  four tabs, one path per modal).
- **T4-08** `tests/render/deskItemsGone.test.ts` greps every `.ts`, `.css` and `.mjs` under `src`,
  `tests` and `scripts`.
- **The review fixes** have a test each: "is picked up again in the morning, and charged when it is
  finished" and "comes back the moment the kit is down" and "is not a move either when he drags it
  away and drags it back again" and "takes the fifteen minutes and leaves the move forced at 4x all
  the way through" in `tests/engine/moving.test.ts`; "never turns a man off a bench he is already
  standing at" in `tests/engine/machines.test.ts`; "does not send him back to a task an earlier
  interruption had left behind" and "leaves the call to the owner once his day is too short to see
  it out" and "rings one client at a time, so the work under the call is not lost" in
  `tests/engine/calls.test.ts`; "keeps the company name on one line, with an ellipsis when it does
  not fit" in `tests/render/officeRoom.test.ts`; and the two headings in `tests/ui/summary.test.ts`.

The office SVG snapshot test went with the SVG: the `the office` block of `tests/render/views.test.ts`
and the office half of `tests/render/sizing.test.ts` are deleted.

---

## 4. How to run

```
npm ci
npm run check      # lint, build, 500 tests
npm run dev        # the game
```

In the game: Office from the top bar, then the boards and the objects on the room. The door goes
back to the hall. Menu holds the summary cadence and the sprite check page, where the three office
layers are at the bottom.

---

## 5. Deviations from CLAUDE.md

1. **T4-07 and T4-08 were split by what breaks, not by the brief's line.** The brief puts the render
   side in T4-07 and the laptop tabs in T4-08. Doing that literally would have left one commit in
   which the Materials, Team and Drawings modals had no entry at all, because their desk items are
   gone from the screen and their tabs do not exist yet. T4-07 therefore carries the whole of
   section 3.1 that has to move together (the room, the regions, the four tabs, the Work Plan
   modal) and T4-08 carries the deletion side (the constants, the sprite keys, the grep test).
   Every deliverable of both tasks is present.
2. **T4-01 also fixed two tests.** The brief says T4-01 is the archived brief and nothing else, but
   `npm run check` was red on `main` before the turn started and every task after it demands a green
   check. The fix is in the same commit and named in its message.
3. **`clientCallMinutes` and its curve are deleted.** 3.3 says a call is fifteen minutes. The old
   curve scaled a call with the price of the job, up to 200 minutes, and nothing reads it any more.
   `CLIENT_CALL_BASE_MINUTES` became `CLIENT_CALL_ANSWER_MINUTES`; `CLIENT_CALL_MINUTES_PER_1000`,
   `CLIENT_CALL_MINUTES_CAP` and `CLIENT_CALL_PRICE_STEP` are gone. The count curve
   (`CALLS_PRICE_BREAKS`) is unchanged, as the brief says.
4. **The Calls step of the five step row.** The brief removes calls from the Start production
   reasons and from the material order gate, and says nothing about the step row it also fed. A step
   that is done when every call has rung would sit amber for most of a job and make the row lie
   about what is in hand, so it is now done except while a client is actually on the line: the one
   statement that is true of a call that never blocks anything. The real figures are on the card
   underneath as "Calls: 1 of 3 taken".
5. **Nobody in the office means nobody to ring.** The brief does not say what happens to a call that
   comes due while the owner is at home and there is no salesman. It waits for a day somebody is in
   rather than being missed: a penalty taken behind the player's back would be the one thing he
   could not have answered.
6. **A new `requiresOneOf` field on a catalogue line.** The pelletiser had `requires: ['dustSystem']`
   and 3.5 says it works with either system. A second list beside `requires` says "one of these",
   which is one rule in one place rather than a special case in `canBuy`.
7. **A move is created only when an item actually changed tile.** An item dragged away and put back
   exactly where it stood is not a move and costs nothing. The brief says "at least one machine
   moved"; this is what moved means.
8. **The cloud autosave follows the day, not the summary modal.** It used to fire on the day end
   event, which 3.6 can now switch off. It fires once per day instead, so a weekly cadence does not
   quietly stop saving.
9. **Two tests lean on node's `fs` through a hand written declaration.** `tests/node-builtins.d.ts`
   declares the three functions the grep test uses, in the style of `scripts/sprites-manifest.d.mts`,
   rather than adding `@types/node` to the project for one test.

Nothing in `CLAUDE.md`, `docs/art/SPRITES.md`, `docs/turn-1-brief.md` or `docs/turn-2-brief.md` was
touched: `git diff --stat e53baec..HEAD` does not list them.

---

## 6. Paths

Per removed desk item: where its modal is reached from now, and whether a second route survives.

| Desk item (Turn 3) | Modal it opened | Where it is now | Other routes |
|---|---|---|---|
| `desk` | none, a note only | gone; the desk is in the artwork | none |
| `laptop` | Laptop | Laptop region of the room (8.2) | none |
| `ledgerFolder` | Accounting | Accounting binder region | none |
| `materialsBinder` | Materials and stock | laptop, Materials tab | none |
| `catalogue` | Equipment catalogue | Catalogue region | none |
| `teamBoard` | Team board | laptop, Team tab | none |
| `phone` | Order board | Orders board region | the top bar Board button |
| `drawings` | Drawings | laptop, Drawings tab | none |

That is eight ids for the seven objects the brief counts, because `desk` is the desk itself and the
other seven stood on it.

Two more lists moved without losing a desk item:

| List | Where it is now | Other routes |
|---|---|---|
| Jobs on the books (was in the laptop) | Work Plan board region | none |
| Order transport on a finished piece | Work Plan card | the gate list in the laptop's Tasks tab |
| The hall | Door region | the top bar Hall/Office toggle, and the office block in the hall |

Order transport is the one route that was not counted: a piece standing at the gate is both on the
Work Plan board and in the gate list, so its button is drawn twice. That is inherited from the Turn
3 laptop, which held both lists, and 3.1 says nothing else changes about the jobs list, so it is
left as it was and put here rather than fixed.

The two rows the brief names are: "Menu keeps Board and Hall/Office
toggle as before (two ways to the same modal and view are entries, not paths)." Every other modal in
the game has exactly one way in. `ModalId` is down from seven to five (`board`, `laptop`, `workPlan`,
`accounting`, `catalogue`): Materials, Team and Drawings are no longer modals of their own at all,
which is why a second route to them cannot exist. `tests/ui/officeRegions.test.ts` asserts it.

---

## 7. Line balance

| | Added | Removed |
|---|---|---|
| Production (`src`) | 1,317 | 498 |
| Tests | 1,379 | 217 |
| Archived brief, manifest and this report | 603 | 1 |
| Total | 3,299 | 716 |

The biggest single removal is `src/ui/laptop.ts` (60 added, 155 removed): the jobs list went to
`workPlan.ts`, the job card to `jobCard.ts` and the task row control to `modal.ts`, and what is left
is the four tabs and the day's tasks. `src/render/office.ts` is 150 added against 62 removed and is
a different file: no SVG, no tile arithmetic, three layers and seven rectangles.

New modules: `src/engine/calls.ts` (the diary and what a taken or a missed call does),
`src/ui/jobCard.ts` (one job card, drawn the same way wherever it appears) and `src/ui/workPlan.ts`
(the board that holds them).

---

## 8. Constants retagged

New, all in `src/engine/constants.ts` with their provenance (the last row is a helper, not a constant):

| Constant | Value | Source |
|---|---|---|
| `CLIENT_CALL_ANSWER_MINUTES` | 15 | PIOTR, T4 3.3 |
| `CALL_MISSES_FREE` | 1 | PIOTR, T4 3.3 |
| `CALL_SATISFACTION_PENALTY` | 0.1 | PIOTR, T4 3.3 |
| `CALL_RATING_PENALTY` | 1 | [TUNE] |
| `MOVE_MINUTES_PER_ITEM` | 60 | [TUNE] |
| `DUCTING_RECONNECT_COST` | 800 | PIOTR, T4 3.5 |
| `NO_DUCTING_SPECS` | `['compressor']` | PIOTR, T4 3.5 |
| `MOVING_SPEED` | 4 | PIOTR, T4 3.5 |
| `minuteStamp` | derived | not a number, an ordering for the benches |
| `flexiSystem` price | 50,000 | PIOTR, T4 3.5 |

Deleted: `CLIENT_CALL_MINUTES_PER_1000`, `CLIENT_CALL_MINUTES_CAP`, `CLIENT_CALL_PRICE_STEP`,
`OFFICE_TILES`, `DESK_LAYOUT`, `DeskObjectSpec`. `STATE_VERSION` is 3: the state carries
`job.calls`, `job.callsMissed`, `job.benchSince`, `owner.resumeTaskId`, `movedItems`,
`speedBeforeMove` and `summaryCadence`, and a save
from the old shape is refused rather than half read, as Turn 3 left it.

The office canvas, the seven region rectangles and the two text boxes are in
`src/render/office.ts`, not in the engine: they are the art contract of SPRITES.md 8, not game
numbers. The two layout numbers the room's scale needs (`TOPBAR_HEIGHT`, `VIEW_PADDING` in
`src/ui/app.ts`) carry a comment saying they have to agree with the stylesheet.

---

## 9. Sprite contract

`docs/art/SPRITES.md` is unchanged. Section 8 is implemented exactly: the canvas is 1672 by 941,
the three layer keys are `officeBackground`, `officeDesk` and `officeLaptop` and they stack back to
front at the origin, the seven regions are at the coordinates of 8.2, and the clock digits and the
company name sit in the two boxes of 8.3 at 28 px and 22 px at scale 1. The three files are on
`main` and in the manifest, so the room shows the art; with the manifest emptied every layer falls
back to a flat rectangle with its name and every region and both texts still work, which is what
`tests/render/officeRoom.test.ts` checks.

The flexi extraction system asks for a new key, `flexiSystem`, 3 by 3 by 4 tiles, canvas 288 by 336
plus the 8 px padding, which is the same canvas as `dustSystem`. It has no file yet and draws as a
placeholder box; the sprite check page lists it.

---

## 10. Open questions for Piotr

1. **Should the clock go back to the speed it was on when a move finishes?** It is left at 4x today
   (section 2.1).
2. **A call that rings while the owner is out.** It waits for a day he is in (section 5.5). The
   other reading is that it is missed and costs him, which would make staying home dearer.
3. **A missed call is re-scheduled once.** If the second attempt is answered, the first miss still
   stands on the card and still counts towards the second miss. That is what "the second attempt, if
   ignored, counts as the second miss" reads as, but the other reading is that answering the retry
   wipes the miss.
4. **One bench per man.** With one bench the owner and a joiner cannot both make something. The
   hiring rule already asks for a bench per joiner, so the only case is the owner joining in on a
   one bench hall. Is that the rule you want?
5. **"Woodwork Empire" does not fit the company name box.** SPRITES.md 8.3 gives the name 170 px
   at 22 px of marker lettering, and the default company name is drawn as "Woodwork E..." on the
   board. The game is doing what the contract says (one line, ellipsis if longer), and the contract
   is yours to change: a wider box, a smaller size, or a shorter default name.
6. **The Work Plan board and the Orders board both open a list.** The room's Work Plan board is the
   jobs on the books and the Orders board is the enquiries. The names on the artwork and the names
   in the game agree, but they are two boards a foot apart doing different things.

---

## 11. Known risks

1. **The office scale is worked out twice: once from the window, then again from the room's own
   box.** The first pass is what the renderer can do before the room exists and what the jsdom
   tests assert; the second corrects it the moment it is on the page and is what the player sees.
   In a headless DOM the box measures zero and the first pass stands, so the tests never exercise
   the correction. It was checked in a browser instead.
2. **A move job with nobody able to do it stands still for the rest of the day.** The clock is only
   forced while somebody is actually on the move, so the game does not lock; the moved machines
   carry their ducting bill into the morning, when the move is picked up again by whoever is in.
   The hall cannot be set out again while a move is on the list, carried or waiting, so a second
   batch of moves can never ride on the first one's minutes.
3. **The call schedule is drawn at acceptance from the job's expected span.** A job accepted with a
   long deadline and finished early still has calls in the diary, and they ring until the client has
   the piece. That is the brief ("from acceptance until delivery"), but it means a fast job can
   deliver with calls never made and nothing said about them.
4. **`summaryCadence` at weekly or monthly makes the day end silent.** The day still runs its costs,
   the wages, the bills and the events that need a decision: only the summary is skipped. A player
   who sets monthly will see the arrears warnings but not the daily net.
5. **The short handed month's rack was retuned, not its assertion.** Its ten sheets became eight
   because the material now reaches the rack sooner and ten lasted the month out. That is turning
   the input until the old outcome comes back, and it is worth saying plainly: the scenario still
   proves a workshop can run itself dry, but it does not prove the new rules made that more or less
   likely.

---

## 12. Parked, carried forward

1. Larger offices as the company grows: a new set of three layers with a suffix, same canvas and
   same regions (SPRITES.md 8.1).
2. Everything parked in Turns 1 to 3.
