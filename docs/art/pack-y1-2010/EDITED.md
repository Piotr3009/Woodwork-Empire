# The yacht line's pack of 19.10.2026, as the game took it (v123)

The art side's ZIP `Woodwork-Empire-Linia-Jachtow-Kod-do-gry.zip` (205 MB: 768 frames of twelve
stations in four views, 48 empty stations, 48 atlases, 64 transporter frames, a renderer of its own
with a patch for `src/render/hall.ts`, an installer, a preview, QA) stays with Piotr. Piotr, 20.10:
"now code the production, graphics only, of the yacht building": the game took its pictures and none
of its code. This folder keeps its notes (`README-PL.md`), its layout (`factory-layout.json`), an
excerpt of its catalogue (`catalog-excerpt.json`: the scale, the codec, the twelve stages, the
transporter's figures), and `checksums.sha256`: every file taken, its SHA-256 (the same as the
pack's own `PACKAGE-MANIFEST.json` gives it, checked file by file when it was taken), the game's
name for it, and the pack's own name. `tests/render/v123YachtFrames.test.ts` holds each file on disk
to that line.

## Taken byte for byte (216 files, 13.5 MB)

View 000 only: the line is never turned (`LINE_NEVER_TURNED`), so no turned file is owed.

- `assets/production/station-NN-view-000-frame-FF.webp` to
  `public/sprites/yachtLineN.standard.workFF.webp` (N 1 to 12, FF 00 to 15): the station with the
  yacht of its stage on its transporter, the robots and the crane at work, frame 0 the stage's start
  and frame 15 its end.
- `assets/production/station-NN-view-000-frame-15.webp` again as `public/sprites/yachtLineN.standard.webp`:
  the class picture is the finished stage.
- `assets/production/station-NN-view-000-empty.webp` to `public/sprites/yachtLineN.standard.empty.webp`:
  the station's crane and runway with its robots parked, no yacht and no transporter.

**WebP, and at half the game's scale.** The pack says it of itself: "Approved renders, uniformly
half-sized", WebP at quality 90 with its alpha at 100, Lanczos, uncropped. A station is 584 by 584,
half the 1,168 by 1,168 the game's contract gives a 14 by 10 by 12 m box (SPRITES.md 2), the
station's local origin at (244, 292), so its front corner (14, 10, 0) lands on (340, 580), half the
game's anchor (680, 1,160): the picture fills the station's box exactly as a file of the full canvas
would. Sharp at the hall's own size (a station is 584 by 584 of the hall's units); softer zoomed in
past it. The game draws a WebP where no PNG of the same name has landed (`deliveredFile`,
`src/engine/ports.ts`), so the full sized renders, sent later as PNGs under the same names, are
drawn in their place with no code. Kept as WebP because the PNG of a decoded lossy picture is about
five times its size (4.6 to 5.4 times, measured on eight of the files): 13.5 MB the twelve stations
as delivered.

## Edited: one file, moved on its canvas (not repainted, not scaled)

`assets/transport/yacht-transporter-loaded-steer-x-r000-f0.webp` (460 by 450, the pack's half scale,
the chassis floor centre at 230, 280) became `public/sprites/yachtWaiting.standard.png` (464 by 332:
half the game's canvas for a 13 by 6 by 4 m box, `YACHT_WAIT_LAYOUT`, whose front corner is at 316,
328). The box's front corner, local (6.5, 3, 0) about the chassis centre, lies at (314, 394) in the
pack's file, so the whole picture was shifted by (plus 2, minus 66) onto a transparent canvas of the
game's size: a translation and nothing else, every opaque pixel checked equal to its source after
the move and none clipped (the content lies at 12 to 451 by 18 to 316). Written as PNG, losslessly,
the decoded pixels of the source as they are. SHA-256 of the source:
`be0222d68408953e928af7dbc012a1029cc520ca2a7d120afb19a1a4ace55f22`. The yacht stands along the lane,
its transporter steering along x, as it drove out.

## Not taken

The three other views of every frame, the atlases, the 63 other transporter frames (the drive along
the lane is a turn of its own, as the house factory's is), the pack's renderer (`game/yacht-line.mjs`,
`game/yacht-svg.mjs`), its patch for `src/render/hall.ts` and its installer, its controllers
(`vendor/*.mjs`: the engine runs the line in `src/engine/lineContract.ts`, and the game has one code
path), its preview page, its 14 m delivery dock at the start of the line (the game's yachts wait on
the lane, as its houses do), and its hero picture.
