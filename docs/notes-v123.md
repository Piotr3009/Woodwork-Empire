# Notes from v123: the yacht line

Built in chat on 20.10.2026 on v122 (STATE_VERSION 53, unchanged). Piotr, on the art side's pack of
the yacht line delivered on 19.10: "now code the production, graphics only, of the yacht building".
Read as the pictures only: the game takes the pack's pictures and none of its code (its renderer,
its patch of `hall.ts`, its installer, its controllers), and the yacht line is built in the engine
as the house factory is. Piotr gave no figures; every one below is chat's, [TUNE: chat], for his
word.

## 1. A fourth kind of line (`LINE_KINDS.yacht`, `src/engine/constants.ts`)

`LineKind` is `window` | `door` | `house` | `yacht`. The rule of v107 and v114 (every money figure
the window line's times a factor, a unit the window's minutes times a minutes factor, so the line
pays back what a window line pays back), the house factory's figures twice over, as its twelve
stations are the house factory's six twice over; and the house's rule of v115 for the unit's price.

| | House factory | Yacht line |
|---|---|---|
| Price | £50,000,000 | **£100,000,000**: twelve shares, 10, 10, 12.5, 12.5, 6.25 four times, 7.5 four times million |
| Stations | 6 x (14 x 10 x 10 m), 84 m | **12 x (14 x 10 x 12 m), 168 m**, `yachtLine1` to `yachtLine12`, built to order in **90 working days** |
| Unit | a house, £100,000, 480 minutes | **a yacht, £400,000** (five thirds of 240,000, the house's v115 ratio), **960 minutes**: two working days |
| Material | £24,000: 80 boards, 40 glass units | **£96,000: 320 boards, 160 glass units**, off the same stores |
| Upgrades | £2.0M, 1.5M, 2.5M, 3.0M | **£4.0M, 3.0M, 5.0M, 6.0M**, 160 minutes off each yacht, to 320 minutes |
| Engineers | 10 | **10**, not the rule's twenty: the pack's stations are worked by its green robots and gantry cranes, and every man walking costs the hall its pace (on v121 the house factory's ten took it from 31 to 21 frames a second at 10x on a processor four times slower, measured 19.10). 0, 1, 2, 3, 4, 6, 7, 8, 9, 10 and 12 stations kept with nought to ten on duty |
| Power | £1,800 a day | **£7,200 a day** (£600 a station, the window module's ten times over) |
| Contract | Houses off line N, A housebuilder | **Yachts off line N, A yacht dealer** |
| Collection | on its own 10 m lane | **the same**, three yachts drawn at the most, `Yachts for collection: 2` |

- The names and the words [TUNE: chat]: `Yacht production line`, `Yacht line, module N`, the twelve
  stations' rows and sentences from the pack's twelve stages (the mould, the lamination, the vacuum
  infusion, the demoulding, the structure, the engines, the services, the mahogany interior, the
  deck and the superstructure, the glazing, the finishing, the inspection and the handover), the four
  upgrades: Heated moulds, Yard software, Second laminating robot, Second finishing robot.
- Its month, reckoned from the constants as v115 reckoned the house factory's (21.7 working days of
  480 minutes; engineers £150,000, power £216,000, cover £166,667 at one per cent and the insurer's
  factor of two; chat's arithmetic, not a test): with no upgrade about 10.8 yachts, £4.33M in, £1.04M
  of material, about £2.76M kept, three years to pay back; with the four (another £18M) about 32.5
  yachts and £9.3M kept, the line and its upgrades back in about thirteen months, as a house factory
  with all of its (12.7 months each).
- A yacht takes its 320 boards and 160 glass units at once, and the line stands until what it holds
  and what is free reach them (`lineShortOf`): the stores must hold that much at one time, a timber
  shelter (400 boards) or eight timber racks, and a large glass rack (200 units) or four glass racks.
  A large timber shelter holds nine yachts' boards, a glass shelter twenty yachts' glass.
- Where it stands: one block of **168 m by 22 m** (168 by 21 at the rear wall), its lane along the
  line (v118). `Room for` in Set up hall draws it (v119). In a hall 180 m by 27 m it stands at the rear
  wall from x 5. In the hall of Piotr's save of 19.10, 210 m by 69 m, no such block is free: the
  best place, at x 38 and y 46, has the 36 modules of six lines in it (`bestLineSite`).

## 2. Its pictures (docs/art/pack-y1-2010/, docs/art/SPRITES.md 23)

- 216 files byte for byte, view 000: sixteen frames a station, the empty station, and the class
  picture (frame 15 again), each held to the pack's own SHA-256. **WebP, half the contract's scale**
  (the pack's own pictures are "uniformly half-sized"): 584 by 584 for a station that owes 1,168 by
  1,168, drawn into the station's box exactly as a full file would be, sharp at the hall's own scale
  and softer zoomed in past it; 13.5 MB the lot, where PNGs of the same pixels would be about five
  times that (measured on eight of them).
- The picture rule takes a WebP where no PNG of the name has landed, the PNG first where both have
  (`deliveredFile`, `src/engine/ports.ts`; `pictureFor` and `hasOwnPicture` ask through it), and the
  build's manifest lists PNG and WebP (`pickPictures`, `scripts/sprites-manifest.mjs`). Full sized
  renders sent later as PNGs under the same names are drawn with no code.
- The waiting yacht, `yachtWaiting.standard.png`: the pack's loaded transporter moved onto half the
  game's canvas for a 13 by 6 by 4 m box by a shift of (plus 2, minus 66) and nothing else, every
  opaque pixel checked, written as PNG.
- The frames, as the house factory's: a kind says its frames (`stationFrames`, 16 the house's and the
  yacht's, null the window's and the door's) and where its units wait (`wait`, the house's transporter
  and the yacht's), and the hall, the prefetch and the sprite check read them off the kind
  (`stationFramesOf`, `prefetchStationFrames`, the waiting loop of `hallScene`, `spriteTargets`)
  where they read the house's constants. A yacht is sixteen hours of the line, so a frame is an hour
  of the game's clock.

## 3. Tests

- `tests/engine/v123Yacht.test.ts`: the line in the table (ten and sixteen, £100M, the twelve shares,
  £400,000 and £96,000, 320 and 160, ten engineers, the lane, the wait, the frames, the upgrades, the
  power, the words); the kept stations; the twelve stations' specs, built to order, no work sheet; the
  block of 168 by 22 and its place in a 180 by 27 m hall; refused without it in the words of v119;
  ordered whole under the next number, due in ninety working days; the offer in a yacht dealer's
  words, one every 16 hours, about 2 a week; a yacht off 320 boards and 160 glass units at £400,000
  waiting on the lane, drawn from its file, said on the Contracts tab; the catalogue's folder.
- `tests/render/v123YachtFrames.test.ts`: the 216 files, WebP at half the canvas, the class picture
  the last frame, every file held to the pack's record, the waiting yacht's PNG at half its canvas,
  the picture rule's WebP and its PNG first, the stations drawn by their frames and empty, each in its
  box and decoded before it is painted. `tests/yachtLine.ts`: the hall both build.
- Flipped, each with its line of reason: the manifest's PNG and WebP and a WebP answering for its
  name (`render/sprites`); the twelve stations' metres (`engine/metres`); no work sheet for a kind
  whose stations have frames (`ui/t30Pictures`); the yacht line's folder after the house factory's
  (`engine/t29Line`, `ui/catalogueTabs`, `engine/v114House`, `ui/v107Door`); thirty line modules
  (`engine/v107Door`, `engine/v114House`); the waiting yacht among the sprite check's keys
  (`ui/spriteCheck`); the engineer's duties, `a yacht line ten` (`engine/t29Engineer`); v123
  (`ui/saveCheck`, `ui/version`).
