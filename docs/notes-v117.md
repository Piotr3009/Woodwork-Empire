# Notes from v117: the house factory's stations at work

Built in chat on 19.10.2026 on v116 (STATE_VERSION 53, unchanged). Piotr, on the art side's P4 pack
of robotic production delivered that night (384 frames of the six stations, the empty stations, the
transporter): "I want the animation right away".

## 1. The files (docs/art/pack-p4-1910/, docs/art/SPRITES.md 22)

108 files byte for byte, view 000 only (the line is never turned): sixteen frames a station
(`houseLineN.standard.work00` to `.work15`), the empty station (`houseLineN.standard.empty`) and
the last frame again as the class picture (`houseLineN.standard`). The pack's canvas is the game's
to the pixel: 1,168 by 1,072, the station's point (14, 10, 0) at (680, 1,064). The waiting house,
`houseWaiting.standard`, is the pack's loaded transporter (steer x, rotation 0, wheels at phase 0)
moved onto the game's 856 by 700 canvas by a shift of (minus 20, plus 74) and nothing else: every
opaque pixel checked equal after the move, none clipped (pack-p4-1910/EDITED.md). About 54 MB in
`public/sprites/`; a page fetches a frame the first time it shows it, half a megabyte each.

## 2. The frame by the house in hand

- `HOUSE_WORK_FRAMES` 16 (`src/engine/constants.ts`) [PIOTR; the art side's count].
- `lineUnitFrame(state, line, frames)` (`src/engine/lineContract.ts`): null without a running
  contract; otherwise `floor(record.minutes / lineWindowMinutes x frames)` capped at `frames - 1`.
  At the base pace of 480 minutes a house, thirty minutes a frame; frame 15 from minute 450, and
  held past the cycle while the line waits for material with a house's minutes done. A line that
  stands holds its frame, because its minutes stand. The house made, the minutes go to nought and so
  does the frame.
- `stationTier` (`src/render/hall.ts`): a house factory's station is drawn with the tier
  `standard.work08` or `standard.empty` in place of `standard`, through `objectArt` and `pictureFor`
  as every picture is, falling back to the class picture where the frame's file is not on disk;
  `data-station-frame` on the station's group says which. Nothing else of the hall's drawing moved:
  no sheet, no real time, no new drawable. Every other kit is drawn by its class as before.
- The waiting house is drawn from its file by the code of v114, unchanged.

## 3. Tests

`tests/render/v117HouseFrames.test.ts` (10): the frame's arithmetic and its edges, none without a
contract, the frame moving with the clock and starting again at the house made, the six stations
drawn by their frames and empty, the fallback, every other module untouched, the 108 files on the
station's canvas, the class picture the last frame, every file held to the pack's SHA-256, the
waiting house on its canvas and drawn from its file. Pins flipped with a line each: the class
pictures 121 to 127 (`tests/render/spriteClasses.test.ts`, with the 102 frames counted as neither
class nor turn), the comment of `tests/ui/t30Pictures.test.ts`, `APP_VERSION` v117.

## 4. Left for a turn of its own

The drive: the finished house leaving station 6 sideways onto the lane and along it to the gate end
on its transporter, in real time as the forklift drives a pallet (`src/render/forklift.ts`), from the
pack's 64 transporter frames (four rotations, four wheel phases, steer x and steer y, loaded and
empty). And the pack's 12 m delivery pad at the start of the line, which the game does not have: its
houses wait on the lane.
