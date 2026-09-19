# Notes from agent B2, Turn 22: the people (2.5 and 2.6)

For the lead. Everything here is either a change B2 made outside its own files, with the exact old
and new text, or a figure B2 chose for itself. The two tasks are T22-B2a (2.5, the mark over the
head) and T22-B2b (2.6, nobody is moved between jobs).

---

## T22-B2a, 2.5: the mark over the head

**What was built, in two lines.** The bubble of Turn 21 became a 14 px disc with an exclamation in
it, drawn in the figure's own group 6 px over the crown of the head with the paper bubble's own
two triangle tail, and drawn only for the four red states of `BUBBLES`
(`waitingForMachine`, `noCutParts`, `noMaterial`, `nothingToDo`); a man working, a helper at his
chore, a man at his lunch, in the office or out measuring carries nothing at all, and the green,
the plain paper and the dashed grey classes are gone with the three second memory, the speed gate
and the bubbles at the door. The words come up on the hover of the figure group, from the same
`BUBBLES` table, as the paper line of Turn 21 in a `foreignObject` beside the disc, shown by one
CSS rule and no JavaScript, so the hover works at x1 and at x30 and survives every rewrite of the
page.

### `BubbleTone` was deleted, and why

`BubbleTone` had one value left (`wait`), so it is gone, and with it `Bubble.tone`, the `tone`
column of `BUBBLES` (now `Record<BubbleKey, string>`, a table of words), `TONE_CLASS` in
`src/render/hall.ts`, the `data-tone` attribute on the drawing, and the classes `.bubble-wait`,
`.bubble-chore` and `.bubble-away` in `src/ui/styles.css`. A type with one value, a record with one
key and an attribute with one possible value are three ways of saying the one thing the section
already says in words: a mark is drawn only when something is wrong, so every mark is red. The red
of `.bubble-wait` was folded into `.bubble` itself (`border: 2px solid var(--bad)` and the tail's
`border-top-color: var(--bad)`), so the paper of the hover line is red by being the only paper
there is. No new token and no new value: `--bad`, `--cream`, `--font-title`, `--fs-hand-small` and
`--fs-tiny` were all on `:root` already.

### Changes outside B2's files (please check on the merge)

**1. `src/ui/app.ts` (B3's file for 2.10 and 2.13).** `src/render/bubbles.ts` is deleted, so the
import and the five calls of `resetBubbles` had to go with it or the branch would not compile. This
is the only edit B2 made to `app.ts`, it is mechanical, and it is six deleted lines.

- One import line removed:

  old: `import { resetBubbles } from '../render/bubbles';`
  new: (the line is gone)

- Five call sites, each the same two lines. In every one of them:

  old:
  ```
        resetDoors();
        resetBubbles();
  ```
  new:
  ```
        resetDoors();
  ```

  They are the `loadFromStore`, the new game, the two `loadGame` handlers and the file load
  (`resetWalkers(); resetDoors();` in each). Nothing else on those lines changed.

**2. `src/engine/index.ts` (the barrel, nobody's).** `BUBBLE_WORK_SECONDS` and
`BUBBLE_WORK_MAX_SPEED` are gone from the constants, so the re-export block had to lose them. Note
that B3's `PIPE_TILE_KEYS` is a few lines below this hunk, so a merge conflict here is likely and
harmless.

  old:
  ```
    // Turn 21 (CLAUDE.md T21 2.6, 2.8): the words the bubbles say and the reasons the owner stood.
    BUBBLES,
    BUBBLE_HEAD_GAP,
    BUBBLE_WORK_MAX_SPEED,
    BUBBLE_WORK_SECONDS,
    OWNER_IDLE_REASONS,
  ```
  new:
  ```
    // Turn 22 (CLAUDE.md T22 2.5) and Turn 21 (T21 2.8): the words of the mark over a man's head and
    // the reasons the owner stood.
    BUBBLES,
    BUBBLE_HEAD_GAP,
    OWNER_IDLE_REASONS,
  ```

**3. `src/render/hall.ts`, `stationLabel` (the line under a man's name, not the bubble region).**
The dinner hour used to read its words off the bubble table (`BUBBLES.atLunch.text`), and that line
of the table is gone. The words are now the station label's own, beside `'the office'` and
`'the bench'` in the same function.

  old:
  ```
    // In the canteen for the dinner hour: the words are the bubble's own, so the line under his name
    // and the paper over his head say the same thing once (CLAUDE.md T21 2.6, 2.12).
    if (station === STATION_LUNCH) return BUBBLES.atLunch.text;
  ```
  new:
  ```
    // In the canteen for the dinner hour (CLAUDE.md T21 2.12). The words were the bubble table's
    // until Turn 22 took the dinner hour off it: a man at his lunch has nothing wrong with him, so he
    // has no mark, and the hour is said on the line under his name alone (CLAUDE.md T22 2.5).
    if (station === STATION_LUNCH) return 'at lunch';
  ```

**4. `tests/render/doors.test.ts` (a test file, so B2 changed it).** Two assertions were Turn 21's
bubble at the office door, which 2.5 removes: they now assert that nothing is left at the door.
The test is otherwise untouched and green.

**5. `tests/scenarios/turn21.test.ts`, the (gg) bubble assertions (see below).**

### Figures B2 chose for itself

All of them are in `MARK` in `src/render/hall.ts`, beside `BUBBLE_BOX`, which is where Turn 21 put
the drawing's own geometry; the game's figure, `BUBBLE_HEAD_GAP` 6, stays in `constants.ts` and is
Piotr's.

- `MARK.size` **14** px, the diameter of the disc. `[PIOTR]`: the mockup says fourteen.
- `MARK.tail` **5** px and `MARK.tailHalf` **4** px, the ink triangle under the disc. `[TUNE]`, read
  off `docs/mockups/t22/bubbles-v2.png` at 3x (about 15 px of tail on a 42 px disc).
- `MARK.border` **2** px, how far inside the ink triangle the lighter one sits. `[TUNE]`, and it is
  the 2 px border the paper of `.bubble` itself wears, so the mark's tail and the paper's tail are
  built the same way.
- `MARK.glyphDrop` **4** px, the baseline of the exclamation below the centre of the disc at
  `--fs-tiny` in the title hand. `[TUNE]`, the same offset the pin board's own text uses.
- `MARK.step` **7** px, how far the second mark over one cell steps aside. The brief's figure,
  `[TUNE]` there and `[TUNE]` here.
- The glyph is drawn at `--fs-tiny` (12 px) in `var(--font-title)`: the smallest size on the type
  scale, which is what fits inside a 14 px disc. `[TUNE]`, no new value.
- **The fan is not centred.** The marks over one cell step 0, 7, 14 and so on as the hall meets
  them, so the first man's mark keeps the place the drawing gives a single mark, over his head, and
  the second and third step to the right of it. `[TUNE]`. A centred fan (each of two marks 3.5 px
  either side) would need the hall to know how many marks a cell has before it draws the first one,
  which means deriving twice which figures are drawn; this way the shift is a running count inside
  the one figure loop. Two men at one machine really do share a cell: the saw's waiting cell is one
  cell for every job that wants it, which is the scene the rule is for, and
  `tests/render/bubbles.test.ts` proves it on cell 5,2 with two jobs and one saw.

### Where the pieces went

- `src/render/bubbles.ts`: deleted (the three second memory, `bubbleIsFresh`, `bubbleNowMs`,
  `resetBubbles`).
- `HallOptions.nowMs` in `src/render/hall.ts`: deleted. It existed for the three seconds and
  nothing else, and no caller outside the old bubble test ever passed it.
- `bubbleArt` became `markArt(bubble, headTop, shift)`, exported for the test as before.
- The bubbles at the door (`behindDoors`, `atTheDoor`, the dedupe, the stack, `.figure-away`,
  `data-away-door`) are gone: a man behind a door has nothing wrong with him, so there is nothing
  to draw after him.
- `src/engine/bubbles.ts`: the chore, the work and the away branches are gone; a man on a standing
  contract who is not queueing for a machine now carries nothing, and the guard that says he is on
  a contract at all moved into `bubbleFor`, so he is not told he has nothing to do.

### Two other tests B2 had to change, and why

- **`tests/ui/lunchBreak.test.ts`** asserted `data-away-door="canteen"` and the words `at lunch` in
  the page during the dinner hour: both were the bubble at the door. It now asserts that nothing is
  left at the door and that the top bar says the hour is a `Break`. Nothing else in the file moved.
- **`tests/ui/officeHover.test.ts`** greps every file of `src/ui` and `src/render` for
  `mouseenter|mouseover|hover` and fails on a match, which is the rule that the pointer is the
  stylesheet's business and never the TypeScript's (T14 2.2). 2.5 obeys that rule exactly, and the
  grep is on the word: B2 changed no assertion there, and instead wrote the word out of the comments
  in `src/render/hall.ts` ("while the pointer is on the figure group", "the words under the
  pointer"). The stylesheet says `hover` in its own comment and its own selector, where it belongs.

---

## T22-B2b, 2.6: nobody is moved between jobs

**What was built, in two lines.** Turn 21's transfer is gone: `moveToOtherWork`, `otherWorkFor` and
the `moved` flag of `HandPlace` are deleted, `placeHand` reads a man's minute once instead of twice
(the hall, then the rack, then the machine of his stage) and the man stands at the machine's waiting
cell on the job he was assigned to, with the minute booked to `noMachine` for the day meter's idle
segment and the red mark over his head. Turn 21's own test of the transfer,
`tests/engine/nobodyWaits.test.ts`, is deleted and `tests/engine/nobodyMoved.test.ts` is written in
its place: four men, one saw and two jobs work three minutes of four, nobody's job changes, the
owner's own idle minute is booked to the machine he cannot have, and the queue's words and the
stage plan invariant of Turn 21 are kept and asserted with it.

**What it costs the hall, measured.** In the section's own scene, four men, one saw and two jobs
(one at cutting, one at assembly), the played day works **1,440 minutes of 2,400 where Turn 21
worked 1,920**, and 480 of them are lost to the one saw: the second man of the cutting job stands at
its waiting cell for all 479 readings of the day after 08:01. With nothing in the hall but the saw's
own work, nothing changes at all (480 worked, 1,440 lost, in both turns), because there was never
anywhere to move a man to. That is the whole of the difference 2.6 makes, and it is the queue Piotr
asked for.

### Changes outside B2's files (please check on the merge)

**1. `src/engine/game.ts`, the day's production minute (B1's file for 2.2).** A comment, and it is
now false: there is no scheduler inside `placeHand` any more. The two deleted lines of production.ts
say the same thing in their own words. Nothing about the code needs to change, so B2 left it.

  old (at `for (const hand of working) {` in the day's production minute):
  ```
      // One reading of a man's minute, the scheduler of CLAUDE.md T21 2.7 inside it: he is moved off a
      // queue he is standing in if there is anything else for him to do, and only then does he stand.
      // The night shift runs the same function through `workMinute` (CLAUDE.md T21 2.7).
  ```
  new:
  ```
      // One reading of a man's minute (CLAUDE.md T22 2.6): the job he is on, and the machine of its
      // stage, or the wait at it. Nobody is moved to another job, and the night shift runs the same
      // function through `workMinute`.
  ```

**2. `src/engine/contracts.ts`, `contractWantsToday` (nobody's this turn).** Another comment that
names the scheduler. The rule itself is untouched and stays as Turn 21 left it: the contract's man
is the contract's for the day, and the minute his job cannot use him the contract has him again.

  old:
  ```
    // His day's share is made and he has a job to go to, but the job cannot use the minute: its saw is
    // taken, its rack is empty or the hall has stopped it. He makes pieces rather than stand at it,
    // because the client pays for every piece he makes, and the contract is the third thing the
    // scheduler looks at before a man waits (PIOTR; CLAUDE.md T21 2.7). Asked fresh every minute off
  ```
  new:
  ```
    // His day's share is made and he has a job to go to, but the job cannot use the minute: its saw is
    // taken, its rack is empty or the hall has stopped it. He makes pieces rather than stand at it,
    // because the client pays for every piece he makes, and his contract is the last thing asked
    // before he stands (PIOTR; CLAUDE.md T20 2.1, T22 2.6). Asked fresh every minute off
  ```

**3. `src/engine/jobs.ts`, the doc comment of `jobHasWorkFor` (nobody's this turn).** The function
stays: `contracts.ts` is its one caller now. Its last sentence names the scheduler that is gone.

  old:
  ```
   *  Nothing here is claimed and nothing is written down, so the scheduler can ask it of every job in
   *  the hall before it moves anybody. */
  ```
  new:
  ```
   *  Nothing here is claimed and nothing is written down, so it can be asked of a job the man will
   *  not end up at: the contract asks it of the job beside it before it takes him back
   *  (CLAUDE.md T20 2.1, T22 2.6). */
  ```
  Its first line also still cites `CLAUDE.md T21 2.7`, which is the section that is reversed; the
  citation could become `T20 2.1`.

### Test files B2 changed for 2.6

- **`tests/engine/nobodyWaits.test.ts` deleted**, and `tests/engine/nobodyMoved.test.ts` written in
  its place: 8 tests.
- **`tests/scenarios/turn21.test.ts`, the (gg) scenario, rewritten in place.** The brief gives (gg)
  to phase C, and B2's instruction was to make the suite green on its own exit code and to say
  exactly what it changed, so it is changed here and phase C should read this list rather than
  re-derive it. Every figure below was measured on this build, in the file's own way.
  - `works every man of the four all day while the second job has bench work` became
    `works three of the four all day and stands the man who cannot have the saw`: worked 1,920
    becomes **1,440**, `lost.noMachine` 0 becomes **480**, and the three men who worked every minute
    are the man on the saw and the two at the other job's bench, while the fourth put in **0**.
    `possible` 2,400, `lost.noMaterial` 0, `lost.noPeople` 480 and `minutesWorked` 480 are
    unchanged.
  - `moves the man who could not have the saw to the other job s bench, and keeps him there` became
    `leaves every man on the job he was assigned to, all day`: both jobs keep the two men the player
    put on them, the man who stood is still on the cutting job, and the jobs took **480** and
    **960** minutes where they took 480 and 1,440.
  - `has nobody at a waiting cell all day but the two minutes before the scheduler s first look`
    became `has the man who cannot have the saw at its waiting cell every minute of the day`:
    **481** readings, of which the man on the saw is **2** (08:00 and 13:00, the top of each spell,
    as before) and the man behind him is **479**; every reading is `tableSaw`. The cutting job now
    ends the day saying `waiting for the saw` (`Cutting, waiting for the saw` on the bar) where it
    used to end it saying nothing, and the job with bench work still says nothing.
  - The marks test (rewritten in T22-B2a) now reads `['no cut parts yet', 'waiting for the saw']`
    for the man who waits, because over a whole day he is the first of the queue in some minutes and
    behind another man in others. The two men at the bench say nothing at all.
  - Three stale comments were reworded (the scheduler, the file name of the unit test, the header of
    the (gg) section). `(gg) the same hall with nothing in it but the saw s own work` passes
    unchanged, figures included: 480 worked, 1,440 lost, 962 readings, three men.
- **`tests/engine/assignees.test.ts`** and **`tests/engine/contractDay.test.ts`**: one comment each
  named the transfer or the deleted test file. No assertion changed and both files are green.

### Figures B2 chose for itself in 2.6

None. 2.6 deletes a rule and adds no number.
