# Notes from v124: the catalogue light again on a big hall

Built in chat on 24.10.2026 on v123 (STATE_VERSION 53, unchanged). Piotr: "check my whole code and
tell me why it stutters so badly the moment I open the catalogue and want to buy something, and
above all when I open shopping for the production lines: the whole computer hangs for a minute or
two"; then, with his save of day 8,464, "code it". Nothing of the game's rules, figures, words or
pictures moved: every answer is the one v123 gave, worked out faster.

## 0. The save, and why it stood

Day 8,464: a hall of 360 m by 97 m, 506 pieces of kit, 57 lines, 18 things on order, a state of
7.8 MB.

- The catalogue's page is written again every game minute (a second at 1x), as every page is, the
  clock running under it.
- Every card of a folder asks whether it can be ordered (`orderEquipmentCheck`). With anything on
  order the question is asked of a copy of the whole state with every order landed
  (`afterTheTrips`): one copy a card, 48 to 95 ms each on this save.
- That copy was never pinned, so nothing worked out for it was kept. A line's card asks where a line
  of its kind would go (`lineSite`): every place on the floor, about 30,000 for a window line, each
  asking every one of the 506 things and every line's ground, worked out again for each place
  (`claimedGround`, one line at a time).
- His hall has no room for another line of any kind, so the search runs to its end: 44 to 48
  seconds for the window line's folder, 48 for the door line's, for one page. The next page was due
  long before it was done, so the browser never came back.

## 1. The floor in buckets (`src/engine/layout.ts`)

- While the state is pinned, the things on the floor (`hallItems`, then `reservedItems`, in that
  order) and every line's ground (`claimedGround`) go once into buckets of 8 m by 8 m
  (`floorIndex`, kept by `keptWhilePinned` as v104's floor map is) [TUNE: chat: the 8 m]. A box asks
  only the buckets it covers or touches.
- `canPlaceBox`, `canPlaceSpec`'s ground and `lineFits`'s ground ask the buckets while the state is
  pinned, and the long way otherwise, which is cheaper than building the buckets for one look.
- What is found is what the long way finds: the first thing in the long way's order, so the reason
  read out is the same (`On the table saw`, `... that is on order`), and the first ground box in
  `claimedGround`'s order; a box of no width, or no depth, is found as the long way finds it.

## 2. The searches pinned for their own length (`src/engine/layout.ts`)

`lineSite`, `bestLineSite`, `nearestLanePlace` and `firstFreeCell` pin the state they search for as
long as the search takes (`whilePinned`, v104), so the buckets are built once for their thousands of
places, or shared with the page that asks. Each changes nothing of the state, and the pin goes with
the search: what is put down after one is seen by the next.

## 3. The hall after the trips copied once a page (`src/engine/game.ts`)

`afterTheTrips` is kept while the page's state is pinned (`pinned`), so the cards of a page make one
copy between them and not one each; unpinned, as at a click, it is made afresh as before. The order's
check (`orderEquipmentCheck`) asks `canBuy` of that copy with the copy pinned, so its searches keep
what they work out. Nothing asked of the copy changes it.

## 4. Measured

v123 against v124 on Piotr's save, one after the other on the same machine (Node in the test
runner, no browser), each page written as the game writes it, pinned and from nothing; v124's three
pages one after the other:

| | v123 | v124 |
|---|---|---|
| The window line's folder, a page | 48.0 s | 0.15 to 0.26 s |
| The door line's folder | 48.5 s | 0.11 to 0.16 s |
| The house factory's folder | 3.1 s | 0.08 to 0.09 s |
| The yacht line's folder (no search: the cash is short of one) | 35 ms | 29 to 39 ms |
| The table saw's folder | 416 ms | 48 to 71 ms |
| The sheet rack's folder | 399 ms | 46 to 58 ms |
| `Room for` in Set up hall, window, door, house, yacht | 9.6, 9.5, 3.7, 2.7 s | 1.6, 1.5, 1.5, 1.3 s |
| Every question of the comparison below, day 8,464 | 238.7 s | 6.3 s |

What is left of a line folder's page: the one copy of the state (50 to 95 ms on this save) and one
search of the floor on it.

**The same answers.** Every question asked of six saves (a new game, Piotr's saves of days 999,
2,811, 4,300 and 8,464, and day 4,300's hall widened to 210 m by 69 m and filled with twenty more
window lines), written out by v123 and by v124 and compared byte for byte: identical. Asked: where
each kind of line would go, `canBuy`, the order's check and the best site for each kind; the first
free cell of every class of kit that stands in the hall (133); single checks of a box and of a
machine across the floor, every third row and every fifth cell, reasons and all (4,818 on day
8,464); and every catalogue page, each tab, the Owned tab and each folder (on day 8,464 the folders
of the four lines, the saw and the rack).

**Left as it was.** `Room for` (`bestLineSite`) keeps its own scan of every place, 1.3 to 1.6 s a
press on this save, once a press and kept until something moves. The Owned tab writes every piece of
kit in 0.4 to 0.6 s a page (v123: 0.6 to 0.8 s). Neither is touched tonight.

## 5. Tests

`tests/engine/v124Floor.test.ts` (5), on a hall of 90 m by 41 m made by the game's own extensions,
with a house factory and a window line standing and a door line and a saw on order: the hall has
every kind of ground and things standing and on order; every box (five sizes, one of no width, one
of no depth, one over many things at once, with nothing, a standing saw or a saw on order left out)
and every machine (a saw, a rack, a line's module) refused pinned as the long way refuses it, for the
same reason, at every cell; every kind of line fitting pinned where it fits the long way, with a line
and the lines left out of it as well; the searches pinned for their own length only; one copy for the
page answering every card of the catalogue as a copy of its own did. Each of the three ways of
getting the buckets wrong (a line left out ignored, the first thing found in the buckets' order
instead of the long way's, a bucket at a box's edge missed) was tried and is caught.

Flipped: `APP_VERSION` v124 (`tests/ui/version.test.ts`, `tests/ui/saveCheck.test.ts`).
