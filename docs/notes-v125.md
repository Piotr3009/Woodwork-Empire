# Notes from v125: what grew four times over for twice the factory, made to grow with it

Built in chat on 24.10.2026 on v124 (STATE_VERSION 53, unchanged). After the evening's audit of
Piotr's save of day 8,464 and of copies of his factory two, four and eight times over (the hall as
many times longer, every machine, line, line record, man and open job copied), he said: "code it so
that everything speeds up". Nothing of the game's rules, figures, words or pictures moved; the
browser's save is now kept where it was not.

## 0. What the audit found, and what v125 takes

1. **The browser's save.** The browser's key store takes about 5.2 million characters and his save
   is 7.8 million: from some day on nothing was being kept, silently, and a page opened again
   offered an old game.
2. **The line minute**, four times the time for twice the lines: every line asked which lines stand
   and how many engineers are on duty, two or three times, the whole kit and every man each time.
3. **The engineers in every frame**, the same: each engineer stepping on to a new cell read every
   drawable of the hall to find his place in the painter's order, a quarter of the processor with
   the clock stopped.
4. **The rings round a cell**: a man whose places were taken had the whole list of cells out to the
   hall's width made for him, about 260,000 on a hall of 360 m, before the first was taken.
5. **The Owned and Contracts tabs**: who stands at which machine worked out again for every tile,
   and a contract's piece speed for every joiner.

Left for v126: the copy of the whole state at every step of the clock, the production minute and the
day's turn. Left for later, and asked of Piotr first: the hall drawn whole however little of it is
on the screen.

## 1. The browser's save (`src/cloud/store.ts`, `src/ui/app.ts`)

- The save goes into the browser's IndexedDB (`packedSaveStore`, one slot), packed with gzip where
  the browser packs: his save is 252 KB there in place of 7.8 MB of text. Its head (company, day,
  version, in the file's own shape) goes under a key of its own (`SAVE_HEAD_KEY`), so the start
  screen says at once what is waiting (`peekSave` reads `peek`).
- The game in hand is the store's own copy, written there at once and read from there; it is packed
  and put away in the background, one write after another, the last one standing. A write or a
  clear made before the database has answered wins over what it holds.
- Continue waits for the whole save when it is still coming out of the database (`loaded`,
  `whenLoaded`); the start screen is said again once it is in, in case the head was of a save the
  browser has since thrown away.
- A save under the old key (`SAVE_KEY`, any build before this one) is the game until the first
  write and is moved across. Where the browser has no database, the old key holds what it can, as
  before: the tests' browser is one.
- The file save and the cloud row are what they were.

## 2. The line minute (`src/engine/lineContract.ts`, `src/engine/machines.ts`)

`runLineMinute` works every line's level out once at the start of the minute, pinned (`lineLevel`,
`whilePinned`), and hands it to the day book (`bookLineMinute`, `lineLostTo`) and to
`lineMakesWindows`. Nothing a line does in its minute stands or sells a module or puts an engineer on
or off duty, so the levels are what each line was asked before. The engineers on duty are kept
while the state is pinned (`engineersOnDuty`), which the level of every line reads.

## 3. The engineers, the forklifts and the men in every frame (`src/render/walkers.ts`)

`placeAmongDrawables` takes a batch (`DrawableBatch`): the drawables under a parent read once, in
document order, and kept in step with every move the batch makes. The engineers, the forklifts and
the men (`resortFigures`) each put themselves in order with one batch a frame. The order left on the
page is the one the old reading left, move for move (the slot rule, `figureSlot`, is the same). A
batch reads the page again when a drawable has been taken away or put in under it.

## 4. The rings round a cell (`src/engine/stations.ts`)

`ringCells` hands its cells out one at a time, in the same order, and `standingCellsFor` stops asking
when it has as many as it wants.

## 5. The Owned and Contracts tabs (`src/engine/machines.ts`, `layout.ts`, `contracts.ts`, `media.ts`)

Kept while the state is pinned, and asked the long way otherwise: who stands at which machine
(`menAtPlaces`), a line's modules (`lineItems`) and its group (`lineGroup`, one pass over the kit for
every line), the hall's compressors (`compressors`), the bag store (`bagStore`), and a contract's
piece speed, which is the hall's and not the man's (`contractResultFor`). Each caller of a list gets a
list of its own.

## 6. Measured

v124 against v125, one after the other on the same machine. The engine and the pages in Node in the
test runner; the browser is headless Chromium with no graphics card, ten seconds a window.

| The engine, a game minute (ten a call) | v124 | v125 |
|---|---|---|
| Piotr's factory | 30 ms | 18 ms |
| Twice over | 72 ms | 34 ms |
| Four times | 282 ms | 76 to 94 ms |
| Eight times | 1,131 ms | 200 to 269 ms |

| A page | v124 | v125 |
|---|---|---|
| The hall, Piotr's factory | 144 to 231 ms | 78 to 137 ms |
| The hall, twice over | 925 to 966 ms | 147 to 252 ms |
| The hall, four times | 7.9 to 8.7 s | 0.35 to 0.42 s |
| The Owned tab, Piotr's factory | 348 to 490 ms | 77 to 96 ms |
| The Owned tab, twice over | 1.3 to 1.6 s | 182 to 205 ms |
| The Contracts tab, Piotr's factory | 45 to 55 ms | 30 to 38 ms |

| The browser, ten seconds | v124 | v125 |
|---|---|---|
| Piotr's factory, clock stopped: long tasks | 1,760 ms | 57 ms |
| Piotr's factory, 1x: long tasks, the longest | 3,663 ms, 338 ms | 1,612 ms, 242 ms |
| Piotr's factory, 10x: long tasks, the longest | 6,230 ms, 426 ms | 5,666 ms, 400 ms |
| Twice over, clock stopped: long tasks | 8,176 ms | 2,295 ms |
| Twice over, 1x: the longest | 4,542 ms | 507 ms |
| Twice over, 10x: the longest | 4,804 ms | 826 ms |

At 10x what is left is the copy of the state at every step and the production minute (v126).

**The save in the browser.** Piotr's save loaded from its file: 252 KB packed in IndexedDB, its head
beside it, the old key empty; the page opened again offers `Continue · Prime Joinery, Mon 4
September` and continues the game.

## 7. The same answers

- The state after 700 minutes played one a call as the game plays them (a day's turn in them), every
  card answered with its first choice: a new game, Piotr's saves of days 2,811, 4,300 and 8,464, and
  his factory twice over: v124 and v125 identical, byte for byte. The same after 300 minutes ten a
  call on his factory and twice over, and after 100 minutes ten a call four and eight times over.
- Every page of six saves (the hall, the top bar and strip, the board, the Contracts tab, the Work
  Plan's two tabs, every laptop page, every tab of the books, every catalogue tab and folder, the
  Owned tab, the orders list, the company): identical. The hall's live layer and its shell on seven
  saves: identical.

## 8. Tests

- `tests/cloud/v125Store.test.ts` (6): a save bigger than the key store kept, packed to a twentieth,
  and given back to the next page head first; a save under the old key moved across; a write or a
  clear before the database answers wins; the old key where there is no database; a head that
  outlived its save says nothing is waiting; a text written without a head read as the whole was.
- `tests/render/v125Placement.test.ts` (2): forty frames of men placed in batches leave the order the
  one-at-a-time reading left, frame for frame; a batch reads the page again when it changed under it.
- `tests/engine/v125Speed.test.ts` (6): every line's level the same pinned as alone; levels worked out
  afresh every minute (two engineers off stand the line from the next minute, and it makes windows
  again when they are back); the rings in their order one at a time; a man's cell found in a hall of
  twenty kilometres; the men at places, the compressors, the bags and a contract's results pinned as
  the long way gives them; a line's modules and group the same, each caller a list of its own.
- Flipped: `APP_VERSION` v125 (`tests/ui/version.test.ts`, `tests/ui/saveCheck.test.ts`); the two
  stores the tests build inline answer the store's three new questions (`tests/cloud/migrate.test.ts`,
  `tests/ui/saveCheck.test.ts`).
