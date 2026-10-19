# The P4 pack of 19.10.2026 (robotic production), as the game took it (v117)

The art side's ZIP `Woodwork-Empire-P4-A-robotyczna-produkcja-2026-10-19.zip` (328 MB: 384 frames of
six stations in four views, 24 empty stations, 24 atlases, 64 transporter frames, the NPZ models,
the renderer's source, previews, QA) stays with Piotr. This folder keeps its notes (`README.md`,
`HANDOFF-CLAUDE.md`), its layout (`factory-layout.json`), the transporter manifest's entry for the
one frame taken, and `checksums.sha256`: the pack's own SHA-256 of every file the game took, with
the game's name for it. `tests/render/v117HouseFrames.test.ts` holds each file on disk to that line.

## Taken byte for byte (108 files)

View 000 only: the line is never turned (`LINE_NEVER_TURNED`), so no `.r` file is owed.

- `assets/production/station-0N-view-000-frame-FF.png` to `public/sprites/houseLineN.standard.workFF.png`
  (N 1 to 6, FF 00 to 15): the station with the house of its stage on its transporter, the robots
  and the crane at work, frame 0 the stage's start and frame 15 its end.
- `assets/production/station-0N-view-000-frame-15.png` again as `public/sprites/houseLineN.standard.png`:
  the class picture (the catalogue's card, the Sprite check page, the hall's fallback) is the finished
  stage.
- `assets/production/station-0N-view-000-empty.png` to `public/sprites/houseLineN.standard.empty.png`:
  the station's crane and runway with its robots parked, no house and no transporter.

The pack's canvas is the game's: 1,168 by 1,072 px, 48 by 24 px a metre, the station's local origin
at (488, 488), so the point (14, 10, 0) lands on (680, 1,064), the anchor `spriteAnchorIn` gives a 14
by 10 by 10 box (SPRITES.md 22). No pixel of any of the 108 was touched.

## Edited: one file, moved on its canvas (not repainted)

`assets/transport/house-transporter-loaded-steer-x-r000-f0.png` (896 by 640, the chassis floor
centre at 448, 408) became `public/sprites/houseWaiting.standard.png` (856 by 700, the deck's front
corner at 488, 692: the game's canvas for a 10 by 7.5 by 5.5 box). The deck's front corner, local
(5, 3.75, 0), lies at (508, 618) in the pack's file, so the whole picture was shifted by (minus 20,
plus 74) onto a transparent canvas of the game's size: a translation and nothing else, no scaling,
no resampling, every opaque pixel checked equal to its source after the move and none clipped
(the content lies at 8 to 848 by 106 to 680). SHA-256 of the source:
`2ee56c75d81710a722fd5edf0b1a287eafa16387042758f5dfaaedde07fb8fe7`. The house faces the gate: its
door is on the gable towards minus x.

## Not taken

The three other views of every frame (090, 180, 270), the atlases, the 63 other transporter
frames (the drive to the gate is a turn of its own), the NPZ models, the pack's JS controllers
(`production-controller.mjs`, `delivery-route.mjs`, `delivery-visuals.mjs`: the engine runs the
line in `src/engine/lineContract.ts`, and the game has one code path), its 12 m delivery pad at the
start of the line (the game's houses wait on the lane), and its Python source.
