# Notes from v126: the hall written again only where it has changed

Built in chat on 24.10.2026 on v125 (STATE_VERSION 53, unchanged). Piotr played v125 and said it
still stuttered: "I think recalculating every second makes no sense. Why can't you just let the
graphics loop and not recalculate? Recalculate only when something changes, when I add or remove
something." Agreed with him the same evening: the animations run as they run ("leave only the gifs
running"), the hall is written again only where something has changed (v126), and the engine's own
work at every game minute comes after it (v127). Nothing of the game's rules, figures, words or
pictures moved, and nothing on the screen looks any different.

## 0. What was measured first

On Piotr's save of day 8,464, in Node and in headless Chromium:

1. **The hall's live layer was written whole every game minute**: 820 drawables (460 pieces of kit,
   252 line engineers, 51 forklifts, 27 canteen pieces, 17 men and the rest), about 4,000 elements
   and 442,000 characters of markup, parsed by the browser and compared node for node with what
   stood.
2. **Of the 820, 1.6 a minute had changed** in the engine's own state (60 game minutes of his save).
   In the browser it was 252 a page: every engineer's markup carried where his walk had got to in
   real time, so every engineer was a changed drawable on every page, parsed and compared inside.
3. **Inside the hall's drawing**, worked out afresh where nothing had changed: the floor, cell by
   cell, for every page (a sixth of the drawing); every rack's share of the stock, reading the whole
   kit for every rack (a tenth); the list of 761 picture files read through for every station's
   frames (a tenth); and the men put in the painter's order with the whole list of drawables copied
   for each of them (a sixth).

## 1. The live layer piece by piece (`src/render/hall.ts`, `src/ui/patch.ts`, `src/ui/app.ts`)

- `hallScene` hands its live layer in its pieces, one a drawable (`liveParts`), and the whole of it
  (`live`) is their join, made only for a caller that asks for it (the tests' among them).
- The page writes the hall's live layer with `patchPieces`, piece by piece:
  1. A piece whose node stands with the mark the piece carries (`data-sig`, v104) is not parsed: the
     node is kept as it stands, and only the depth it is sorted at is written.
  2. A piece whose node stands made of the same markup after its first tag (an engineer walked on, a
     man come into another cell, a machine's class) has only its first tag's attributes written, as
     a fresh node's would be. Nothing inside the node is read or written.
  3. Everything else is parsed and patched as before (`patchByIdentity`, v104 and v121).
- Path 2 is taken only where the browser reads the first tag exactly as the piece's own reading of
  it: the attributes the hall writes on a drawable (`data-*`, `transform`, `class`,
  `pointer-events` and a few more) whose values carry no entity but the five the game writes. Any
  other first tag is parsed (3).
- A figure already standing where it belongs is no longer taken out of the page and put back: v121
  put every engineer, man and forklift back at every page, wherever he stood.
- What the frame does between two pages (the walkers, the engineers, the forklifts, the doors, the
  machines' sheets) is untouched, and so is the rest of the page.

## 2. The hall's drawing (`src/engine/walk.ts`, `materials.ts`, `ports.ts`, `src/render/hall.ts`)

- **The floor** (`floorMap`, v104) is kept from page to page while the hall is laid out as it was:
  the unit's width and every thing's name, class, turn, place and sale the same. It is worked out
  again the moment any of them changes, a test's write into the state it holds included.
- **Every rack's share of its kind** (`stockOnItem`): worked out for the whole hall once a page,
  while the state is pinned (v97), and the long way otherwise.
- **The picture files** (`deliveredFile`): a list asked eight times is looked up by a set of its
  names from then on, made again whenever the list's length changes.
- **The men in the painter's order** (`placeFigures`): what `figureSlot` reads of the drawables is
  kept in step with them move for move, and not copied for every man.

## 3. Measured

v125 against v126, one after the other on the same machine. Node in the test runner; the browser is
headless Chromium with no graphics card, ten seconds a window, each window from the same moment of
Piotr's save (Mon 4 September, 14:29, the clock stopped and started at the speed asked).

| The hall's live layer worked out (Node) | v125 | v126 |
|---|---|---|
| Piotr's factory | 60 ms | 31 ms |
| Twice over | 134 ms | 73 ms |
| Four times | 314 ms | 139 ms |

| The live layer written into the page, 90 pages with the frame's work between (Node, jsdom) | v125 | v126 |
|---|---|---|
| Piotr's factory | 240 ms | 45 ms |
| His save of day 4,300 | 99 ms | 22 ms |
| His save of day 2,811 | 60 ms | 14 ms |

| The browser, Piotr's factory | v125 | v126 |
|---|---|---|
| A page written (the whole page, the hall in it) | 115 to 126 ms | 57 to 72 ms |
| The hall's live layer brought into line, of that | 54 to 60 ms | 19 to 26 ms |
| Drawables parsed a page | all 820 | about 11 |
| 1x, ten seconds: long tasks, the longest | 1,551 ms, 218 ms | 1,193 ms, 127 ms |
| 4x, ten seconds: long tasks, the longest | 4,796 ms, 195 ms | 3,697 ms, 131 ms |
| 10x, ten seconds: long tasks, the longest | 5,831 ms, 327 ms | 5,095 ms, 294 ms |

What is left, measured in the same windows:

- **The engine's game minute**: 40 to 42 ms in the browser on his save, the same in both builds, more
  than half of it the copy of the whole state (`clone`). This is v127, as agreed.
- **The frame's own work**: about 15 ms a frame at 1x, 9 ms of it the 252 engineers walked and put in
  the painter's order, 2 ms the hall's sound. Not touched tonight: it is the
  animations themselves.
- **The painting**: in this browser, with no graphics card, the hall is painted at six to ten frames
  a second even with the clock stopped. That is this machine's limit and says nothing about
  Piotr's computer.

## 4. The same answers

- The hall's live layer and its shell after every minute of 40, on six saves (a new game, Piotr's
  saves of days 999, 2,811, 4,300 and 8,464, and his factory twice over), with a machine moved, one
  sold, one turned, the unit made narrower and a machine moved back in the state itself between the
  minutes: v125 and v126 identical, byte for byte, and the state at the end the same.
- Every page of the same six saves, 107 pages each (the hall, the top bar and strip, the board, the
  Contracts tab, the Work Plan, every laptop page, every tab of the books, every catalogue tab and
  folder, the Owned tab, the orders, the company): identical.
- 700 minutes played one a call on a new game and Piotr's saves of days 2,811, 4,300 and 8,464:
  the same state.
- The live layer written whole (v125's way) and in its pieces, each in a process of its own, 90 pages
  of four saves with a bench bought and sold, and between the pages the frame's work as the game does
  it (the men given their orders and walked on, the engineers walked along their lines in real time):
  the layer identical, byte for byte, after every page and after every frame.

## 5. Tests

- `tests/ui/v126Pieces.test.ts` (7): sixty pages of things coming, going, changing and moving, some
  drawn twice for one thing, one drawn as two nodes, written whole and in pieces: the same page each
  time; a node whose piece carries its mark kept, untouched inside, only its depth written; an
  engineer walked on keeps his node and what the frame did inside him, only his first tag written;
  an attribute gone from the first tag taken off the node; a first tag the piece cannot be sure of
  reading as the browser does parsed as the whole writing would; the hall's pieces joined are its
  whole; a played hall written both ways for forty minutes, the same page each minute.
- `tests/engine/v126Speed.test.ts` (3): the floor kept while the hall is laid out as it was and worked
  out again for a machine moved, moved in place, turned, sold, a narrower unit and a new machine,
  each time as the long way gives it; every rack's, timber store's and glass rack's share the same
  pinned as the long way; a picture file found in a list asked many times as the list gives it, and
  in the list grown.
- Flipped: `APP_VERSION` v126 (`tests/ui/version.test.ts`, `tests/ui/saveCheck.test.ts`); in
  `tests/ui/v121Patch.test.ts` an engineer already standing where he belongs is no longer taken out
  and put back.
