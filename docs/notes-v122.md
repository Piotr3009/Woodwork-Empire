# Notes from v122: the hall's extensions grow 10 per cent a time, and the hall stays on the page

Built in chat on 20.10.2026 on v121 (STATE_VERSION 53, unchanged). Piotr, playing on with v116's
1.15: "we have to go back to 1.1, because even with 1.15 it gets harder and harder later".

`UNIT_LONG_EXTENSION_GROWTH` 1.15 to **1.1** (`src/engine/constants.ts`); the first two extensions
keep their fixed prices. The long ones of a hall twenty deep are 600,000, 660,000, 726,000, 798,600
(v116: 600,000, 690,000, 793,500, 912,525); after twenty four extensions the multiplier is 9.85
(v116: 28.6; 1.2: 79.5): on Piotr's 210 m hall the next seven metres about 43 million, the one after
about 48, ten metres more length about 20.

Pins flipped with a line each, the same files as v116: `tests/engine/t31Hall.test.ts`,
`tests/ui/t31Hall.test.ts`, `tests/engine/v95Wider.test.ts`, `tests/ui/v95Wider.test.ts`,
`tests/scenarios/turn31.test.ts`; `APP_VERSION` v122.

## 2. The blink (PIOTR, 20.10: "do something about the blinking: the graphic still disappears and
comes back, maybe the house line, probably the same problem the other lines had once, the program
works it out again every moment; look at the door and window lines")

He was right that it was the whole hall and not the house line. Measured in Chromium on v121 with
a mutation observer on the page: the hall's `<svg>` was taken out of `<main>` and put back at every
page written, eight times in eight seconds at 1x, seventy six at 10x, on every hall, window and door
lines included.

- **Why.** The page's markup leaves an empty `<div data-scene-slot>` where the scene goes, and
  `mountScene` carries the scene (the hall's `<svg>`, marked `data-scene-slot` too) from page to page
  so its pictures are loaded once (CLAUDE.md T9 3.8). The patch was meant to leave the slot alone,
  and `patchNode` does, but `isSame` asked first and told the two apart by their tags, `svg` and
  `div`: so the patch put the empty div in the hall's place and `mountScene` put the hall back.
  Every picture of the hall was painted again from nothing at every page, the whole hall laid out
  and rastered again; a small picture is decoded at once, a big one (a megabyte decoded and more:
  a station of the house factory is five, the waiting house two and a half) is painted first
  without its picture and then with it. That is the blink, and the reason it was the house line's
  above all.
- **The fix** (`src/ui/patch.ts`): two nodes marked `data-scene-slot` are the same thing whatever
  their tags, one marked and one not never are. The hall now stays where it is; a scene of another
  key (the office, the canteen, Set up hall's grid) still takes its place, once.
- **And two more for the big pictures** (`src/render/sprites.ts`, `src/render/prefetch.ts`): every
  sprite is drawn `decoding="sync"`, so a picture whose decode is not in the browser's keeping is
  painted when decoded, the old tile standing until then, and never as an empty tile first; and the
  house factory's frames are held as blobs and no longer decoded as they land (v120 decoded all a
  hundred and two, five hundred megabytes decoded, which pushed the pictures on the screen out of
  the browser's keeping): the one frame each station shows next is decoded ahead (`warm`, once in
  five seconds at the most).
- **Measured** on the same harness (a 90 by 27 m hall with the house factory running, its ten
  engineers walking, a processor four times slower): the hall never taken out of the page at 1x or
  10x (was 8 and 76 times in 8 s); the stations written only at their frame changes; and at 10x 38
  frames a second, a frame of 17 ms in the middle and 17 frames over 50 ms in 8 s, where v121 made
  20, 50 ms and 55. At 1x 55 and 4 over 50 ms (v121: 53 and 9). On Piotr's own save (210 by 69 m, 39
  lines, 370 pieces of kit) the hall is never taken out either; its frame rate on a slow processor
  is no better for it (2 to 4 frames a second at 1x and 10x, as on v121): that is the engine's
  minute and the page's markup for 370 things, a turn of its own.

## 3. Tests

`tests/ui/v122Scene.test.ts` (3): the slot matched whatever its tag and left alone inside, one
marked and one not never the same; the hall the same node through five pages, never taken out of
`<main>`; the office the same, and a scene of another key taking its place once.
`tests/render/v122Warm.test.ts` (4): a blob held and nothing decoded; the frame decoded ahead from
its blob, not before it is held, once in five seconds; the one frame each station shows next and
nothing else; every sprite `decoding="sync"`. v120's and v121's tests unchanged and green.
