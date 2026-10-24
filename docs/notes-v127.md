# Notes from v127: the engine's minute and the day's turn made light again

Built in chat on 24.10.2026 on v126 (STATE_VERSION 53, unchanged), as agreed with Piotr the same
evening: "do 126 first and 127 after it". v126 wrote the hall again only where it had changed; v127
is the engine's own work at every game minute and at the turn of a day. Nothing of the game's rules,
figures, words or pictures moved, and nothing on the screen looks any different.

## 0. What was measured first

On Piotr's save of day 8,464, in Node, a game minute one a call as the game plays it at every speed
up to 10x: 57 ms, of which

1. **the copy of the whole state** (`clone`, v104) 32 ms, and the clearing up of what it left behind
   most of another 19 ms. Every minute the whole state was copied, 7.8 million characters of it as
   a save, so the minute could be played on the copy. Two parts of it are 85% of it: the closed days
   of every line's book (65%, 78 lines with up to 400 days each) and the months' reports (19%).
   Neither is ever written once it is there.
2. **the minute's own work** 17 ms, the production minute 12 ms of it, three of whose readings of the
   hall (its factor, its extraction and its air) each worked out again who stands at which machine.

And the turn of a day: 102 ms on his factory and 432 ms on it four times over, the open of the lines'
day growing with the square of the lines: every line asked which lines stand, which engineers are
whose and what its own modules are worth, each time from the whole hall.

## 1. The copy of the state (`src/engine/game.ts`)

`clone` shares the state's two histories with it: the closed days of every line's book
(`windowLines[].days`) and the months' reports (`monthlyReports`). Each entry of them is copied the
first time, so it is in JSON's shape as everything copied is (a number JSON cannot write is null, a
key it leaves out is left out), and that copy is handed on from copy to copy from then on. The lists
themselves and everything else in the state are copied as before.

Why it is safe: a day of a line's book is written by `lineToday` alone, the day in hand, and once it
is closed into the book nothing writes it again; a month's report is pushed at the month's end and
only read. A test plays a month with every closed day and every report frozen after every call: a
write into any of them would have stopped it, and the month played is the month played unfrozen.

## 2. The turn of a day (`src/engine/lineContract.ts`, `src/engine/insurance.ts`)

- `openLineDay` closes every line's day as before, then reads what every line's new day takes (its
  engineers, its power, its cover) for all of them at once with the state pinned, and writes it
  after. Nothing a line's day book takes changes what another line's reads.
- `lineValueOf` (what a line's modules cost, which its cover is written from) is worked out for
  every line from one reading of the kit while the state is pinned, and the long way otherwise.

## 3. The production minute (`src/engine/game.ts`, `src/engine/production.ts`)

The hall's factor, its extraction, its air and who stands for want of air are asked together with
the state pinned, in the day's minute and in the night shift's alike: nothing is written between
them.

## 4. Measured

v126 against v127, one after the other on the same machine. Node in the test runner; the browser is
headless Chromium with no graphics card, ten seconds a window, each from the same moment of Piotr's
save (Mon 4 September, 14:29).

| A game minute, one a call (Node) | v126 | v127 |
|---|---|---|
| Piotr's factory | 57 ms | 22 ms |
| Twice over | 93 ms | 37 ms |
| Four times | 182 ms | 79 ms |
| Eight times | 390 ms | 186 ms |

| Piotr's minute, in parts (Node) | v126 | v127 |
|---|---|---|
| The copy of the state | 32 ms | 8 ms |
| Clearing up memory (all of the minute's) | 19 ms | 5 ms |
| The production minute | 12 ms | 10 ms |

| The turn of a day (Node) | v126 | v127 |
|---|---|---|
| Piotr's factory | 102 ms | 47 ms |
| Four times over | 432 ms | 145 ms |
| The open of the lines' day, four times over | 182 ms | 25 ms |

| The browser, Piotr's factory | v126 | v127 |
|---|---|---|
| A game minute in the engine | 42 to 48 ms | 20 to 24 ms |
| Its copy of the state | 25 ms | 6 to 7 ms |
| 1x, ten seconds: long tasks, the longest | 1,113 ms, 146 ms | 832 ms, 107 ms |
| 4x, ten seconds: long tasks, the longest | 3,623 ms, 140 ms | 2,614 ms, 121 ms |
| 10x, ten seconds: long tasks, the longest | 5,037 ms, 255 ms | 3,421 ms, 161 ms |
| 10x: game minutes played in the ten seconds | 41 | 54 |

What is left, measured in the same windows:

- **The frame's own work**: 12 to 15 ms a frame, 7 to 9 ms of it the 252 engineers walked and put in
  the painter's order. The animations themselves: v128, if Piotr wants it.
- **The page**: 54 to 70 ms a page written, the hall's drawing about 24 ms of it and bringing its
  live layer into line about 19 ms.

## 5. The same answers

- 700 minutes played one a call on a new game and Piotr's saves of days 2,811, 4,300 and 8,464: the
  same state, byte for byte.
- 11,000 minutes played ten a call on his saves of days 2,811, 4,300 and 8,464, each across at least
  one month's end and its report and three to five weeks of the lines' books: the same state.
- Every page of six saves, 107 pages each: identical. The hall's live layer and its shell after every
  minute of 40 on six saves, the hall moved, a machine sold, turned and moved back between the
  minutes: identical, and the state at the end the same.

## 6. Tests

- `tests/engine/v127Engine.test.ts` (5): a month played with every closed day and every report frozen
  is the month played; a copy is what JSON gives, an entry copied the first time and shared from then
  on while everything else is the copy's own; a day new to the book written as JSON writes it on its
  first copy; the open of a day gives every line the engineers, power and cover each is given alone,
  and takes nothing twice; every line's worth the same pinned as the long way.
- Flipped: `APP_VERSION` v127 (`tests/ui/version.test.ts`, `tests/ui/saveCheck.test.ts`).
