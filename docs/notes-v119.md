# Notes from v119: the player is shown where a line would go, a line moves in three hours, the clock runs at 100x

Built in chat on 19.10.2026 on v118 (STATE_VERSION 53, unchanged). Piotr, trying to buy a house
factory in a 172 by 36 m hall: "so the player has to be a clairvoyant?", "the player is always going
to be confused without a guide or a picture", and the same evening "a move of a line is three hours,
not six", "when there is a lot of moving let the clock run at 100, not 30", and "write that it has
to be the wall with the exit gate; left for me is the one on my side".

## 1. The words (`src/engine/layout.ts`)

- `lineBlockWords(kind)`: `36 m by 7 m`, `84 m by 22 m`. `lineBlockExplained(kind)`: the modules
  on their metres, a metre before and behind, and the lane: a window or door line's `running from
  the wall with the exit gate to its end`, a house factory's `in front, which the lanes of other
  lines may cross`. No text names a side.
- `lineNeedsRoom(kind)` (setup mode's refusal) is `The line needs a clear 36 m by 7 m: ...`.
- `lineNoRoom(kind)` (the order's refusal, on the catalogue card) is `No room in the hall for the
  line and its lane: it needs a clear 84 m by 22 m (...). Open Set up hall and press Room for:
  Timber frame house factory to see where it would go and what stands in the way`. `LINE_NO_ROOM`
  stays the first clause.

## 2. Room for (`bestLineSite`, `src/render/roomFor.ts`, Set up hall)

- `bestLineSite(state, kind)`: the order's own site where the line fits; otherwise the place whose
  block has the fewest things in it, every item standing or on order counted once and every other
  line whose modules, metres or lane the block would take counted ten, the row nearer the rear
  wall first among equals, off the rooms and the way to the gate; null where the block goes
  nowhere. On Piotr's 210 by 69 m hall with 370 things it is about 0.6 s once, and kept by the
  renderer until something moves (a memo keyed by the kind and where every piece of kit stands),
  so a drag asks nothing twice.
- Set up hall's bar has `Room for:` and one button a kind (`LINE_KIND_ORDER`), lit while its block
  is drawn; the same button again, another kind, or Done puts it away (`ui.roomFor`, renderer
  state, nothing saved). The hall draws the block (`data-room-for`, `data-room-fits` yes, no or
  none, `data-room-at`): dashed outline of the whole block, the line, its stations and its lane,
  green where it fits and red where it does not, each thing in the way marked red on the floor
  (`data-in-the-way`), and one label; the bar says the same words in plain text
  (`data-room-words`), readable at any zoom: `Timber frame house factory needs a clear 84 m by 22
  m. In the way here: 4 modules of line 28, 6 modules of line 35; the ground of line 24, 28, 34,
  35`, or `...: it would go here, 84 m by 22 m`, or `The hall is too small for a ...`.
- The pictures: docs/mockups/v119/ (the plan drawn for Piotr before the code, and the game on his
  save after it).

## 3. The move and the clock

- `LINE_MODULE_MOVE_MINUTES` 30: `moveMinutesOf(state, moved)` sums an hour a machine or bench and
  half an hour a module, so a whole line is `Moving 6 machines takes 3 h` (was 6 h); the task's
  minutes read the same sum. The setup bar's sentence says so.
- `SKIP_SPEED` 10 to 100: the clock the game runs for the player (a trip out, a move of the hall)
  is the 100x chip.

## 4. Tests and pins

New: `tests/engine/v119Room.test.ts` (11: the words, the best site fitting, null and blocked with
its items and lines, the drawing in and out of setup, green, red with its marks and words, too
small, the move's minutes, the clock) and `tests/ui/v119RoomFor.test.ts` (3: the buttons, the
toggle, Done). Flipped with a line each: every pin of the old refusal strings reads
`lineNoRoom(kind)` or `lineNeedsRoom(kind)` (t29Line, t30Move, t31Lane, v93Lines, v114House,
turn29, turn30, turn31); `Moving 6 machines takes 3 h` (t30Move, turn30); `SKIP_SPEED` 100
(speedTen); `APP_VERSION` v119.

## 5. Left

The pictures of a line's drive and the yacht line's files are turns of their own (notes-v117 4,
and chat of 19.10).
