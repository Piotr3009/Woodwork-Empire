# Notes from v97: the line's pace, and the page asked once

Built in chat on 14.10.2026 on v96 (STATE_VERSION 48, unchanged). Two things of one evening, one
check at the end (3,092 tests in 318 files green on its own exit code).

## 1. The line's pace (PIOTR, 14.10: "give the bigger tempo of making windows, especially once we
have everything upgraded")

Chat read the line's books off the constants of v96: a line of ten million at a window every two
hours makes four a day, about 86 a month, and after its engineers (30,000), its cover (33,333: two
per cent of ten million, times two for the big hall) and its power (10,800) keeps about 3,000 a
month in a month with nothing lost; one lost day puts it under. Piotr: "there is too little profit".

- `LINE_WINDOW_MINUTES` 120 to **60**: eight windows a working day, about 40 a week, about 171 a
  month, about 80,000 a month kept.
- `LINE_UPGRADE_MINUTES` 15 to **10**, `LINE_WINDOW_MINUTES_MIN` 60 to **20**: the four upgrades
  take the hour to 50, 40, 30 and 20 minutes. All four fitted: 24 a day, about 120 a week, about
  514 a month, about 390,000 a month kept, the line and its upgrades (11.8 million) back in about
  two and a half years.
- Nothing else of the line moved: the price (1,500), the material (600), the upgrades' prices
  (1.8 million), the cover, the power, the engineers.
- **What the player meets**: at 20 minutes the line eats 48 boards and 24 glass units a day. One
  timber rack (40) and one glass rack (40) cannot keep it: the office restocks once a day, the
  lorry comes in the morning, and the line stands `no timber` in the afternoon. The full pace wants
  the timber shelter (400) and the large glass rack (200). At the hour a rack of each still does.
- **Parked, for Piotr** (said the same evening): the company's own sawmill, bought from the
  catalogue later on, which takes ten per cent off the material; the line's cover at one per cent
  without the hall's factor; the window's price rising with reputation.

Tests flipped, each with its line of reason: the words `every 2 hours: about 20 a week` and `1 h 45
min` (t30Line, t30Contract, t30Upgrades), the minutes `120, 105, 90, 75, 60` to `60, 50, 40, 30,
20`, the card's `Takes 10 minutes off`, and every figure that follows from forty windows a week in
place of twenty: what a contract holds (80 boards and 40 units of a week), the office's two days
(16 windows, 32 boards), the scenarios of turns 30 to 32 (eight a day; 24 with all four, whose
scenario now stands a shelter and a large rack for the day). The twenty four a day test and the
(fff) scenario give the day its stores, because the figure under test is the pace and not the
racks.

## 2. The page asked once, and nothing written for a frame in which nothing moves

Measured on v96 in headless Chromium, an 800 m² hall with the line, 34 pieces of kit and 11
people: at 10x 27 to 38 frames a second with frames of 200 ms; on a processor four times slower
(Piotr's laptop, near enough) 36 at 1x, 16 at 4x, 4 at 10x. And a paused game took forty per cent
of a processor.

- **`src/engine/pinned.ts`** (new). The page and the sound ask the same questions of the same
  state over and over: `drawnPlaces` once a machine (`machineInUse` for every machine of the hall
  when it is painted, and sixty times a second for the sound through `familyInUse`), and
  `standingModuleMasks` tens of thousands of times a second through the stage plans (28,663 calls
  a second at 1x, 61,171 at 10x, the biggest single function of the profile). The page pins its
  state for one writing of the page (`render`) and one frame's sound (`driveSound`), with
  `pinState(null)` in a `finally`, and `drawnPlaces`, `drawnInUse` and `standingModuleMasks` come
  through `pinned`: once a page each. The pin never outlives the call: the tests write into the
  object the page holds, and the engine's own minute, on the clone it writes into, is never pinned.
  Nothing is ever stale.
- **`writeAttribute`** (`src/render/walkers.ts`): an attribute written only when its value would
  change. The forklift (`draw`), the engineers (`draw`) and every moving thing's depth
  (`placeAmongDrawables`, which also keeps where each thing was last put and reads none of its
  neighbours for the same feet) go through it. A forklift that waits and a figure that stands write
  nothing in a frame.
- **Measured again, v96 against v97, the same hall, the same harness, one after the other**
  (script time of the main thread in eight seconds; the frame rate at 10x):

  | | v96 | v97 |
  |---|---|---|
  | paused | 0.74 s | 0.28 s |
  | 1x | 1.49 s | 0.77 s |
  | 4x | 1.92 s | 1.11 s |
  | 10x | 3.26 s, 36 fps, 16 frames over 50 ms | 2.15 s, 47 fps, 3 frames over 50 ms |
  | 10x, processor four times slower | 4 fps | 7 fps |
  | 1x, processor four times slower | 34 fps | 50 fps |

- **What is left, for a turn of its own**: every game minute the whole page and the whole hall
  are composed afresh as markup and compared with what is on the page (about 20 ms a time on a
  fast processor for this hall; at 10x ten times a second), and the hall's picture is painted again
  whenever anything in it moves. Those two are the rest of the cost at 10x, and are not touched
  tonight. The engineers walk their lines in real time whether the clock runs or stands (v94), so a
  paused hall still paints: by design, and Piotr's to say.
