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
