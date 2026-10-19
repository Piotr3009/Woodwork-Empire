# Notes from v114: the timber frame house factory

Built in chat on 18 and 19.10.2026 on v113 (STATE_VERSION 53, not changed). Piotr, 18.10, with the
art side's concept P4-A (`Woodwork-Empire-P4-A-cala-linia-2026-10-18.zip`, CONCEPT_FOR_REVIEW):
"masz grafikę, jedyne co GPT zrobił odwrotnie to strona deliver zrobionego domu", then "5 tak
zakoduj" to chat's three points: layout A with the stations drawn as boxes until the art side's
files come, the finished house waiting at the lane's gate end and collected the next working day,
and the art side's order for the game's files (`docs/art/REQUESTS-P4.md`).

## 1. A third kind of line (`LINE_KINDS.house`, `src/engine/constants.ts`)

`LineKind` is `window` | `door` | `house`. Every money figure of the house factory is the window
line's times `HOUSE_LINE_FACTOR` (5), and a house takes a window's minutes times
`HOUSE_LINE_MINUTES_FACTOR` (8), so a house's price and its material, a window's times both, earn
what five window lines earn on fifty million paid in: the rule of v107 ("one to one as the windows,
only bigger money"), asserted in `tests/engine/v114House.test.ts`.

| | Window line | House factory |
|---|---|---|
| Price | £10,000,000 | **£50,000,000**: shares 10, 12.5, 6.25, 6.25, 7.5 and 7.5 million |
| Modules | 6 x (6 x 3 x 3 m), 36 m | **6 stations x (14 x 10 x 10 m), 84 m**, `houseLine1` to `houseLine6`, built to order in **60 working days** |
| Unit | a window, £1,500, 60 minutes | **a house, £60,000, 480 minutes** (a working day) |
| Material | £600: 2 boards, 1 glass unit | **£24,000: 80 boards, 40 glass units**, off the same stores |
| Upgrades | £400k, 300k, 500k, 600k, 10 minutes each | **£2.0M, 1.5M, 2.5M, 3.0M, 80 minutes each**, to 160 minutes a house |
| Engineers | 2 | **10**: 0, 1, 1, 2, 3, 3, 4, 4, 5 and 6 modules with one to ten on duty |
| Power | £360 a day | **£1,800 a day** (£300 a station) |
| Pallet | 10 windows at the gate, by forklift | **one house**, on its own lane, no forklift |
| Contract | Windows off line N, A window company | **Houses off line N, A housebuilder** |
| Sale | whole, for half | whole, for half: £25,000,000 |

- The upgrades' names [TUNE: chat]: Diamond tooling, Factory software, Second nailing bridge, Second
  vacuum crane. The stations' names, sentences and card rows are the art side's six stages of P4-A:
  the floor, the frame, the services and the insulation, the roof, the finishing, and the inspection
  and the handover [TUNE: chat: the words].
- A house factory serves no timber job (`servesJobs` false), as the door line.
- What one house takes off the stores is more than one small store holds: 80 boards want two timber
  racks or a shelter, 40 glass units one glass rack. Short of either, the factory stands and the
  strip says `Line 3 stands: no timber for its next house`.

## 2. Where it stands (`src/engine/layout.ts`)

Every function of a line's ground takes the line's kind (`lineBox`, `lineGround`, `laneTrouble`,
`forkliftLane`, `lineFits`, `lineSite`, `lineDepthCells`, `lineNeedsRoom`, `laneTarget`), read from
two new fields of a kind: `laneCells` (the forklift's 2 m, or the house factory's 10 m) and
`collection` (`gate`: full pallets carried to the gate by the line's forklift along its two strips;
`lane`: each house waits on the line's own lane, no forklift, no left strip).

- **The ground of a house factory**: the metre behind it, its 84 m by 10 m, the engineers' metre in
  front, and a 10 m lane in front of that from x 0 to its end: 22 m in depth and its 84 m along the
  hall, clear of the rooms and the way to the gate. Its lane is ground of its own kind (`drive`),
  refused in its own words
  (`That is the house factory's lane`), and shared with other lines' lanes as two lanes are.
- **Where the order puts it**: as any line, the first place where it and its ground are clear
  (`lineSite`). In a hall of 90 m by 27 m (the 800 m2 unit, five long extensions and one wide one)
  it stands at the rear wall beside the rooms, x 5 to 89, its lane from y 11 to 21.
- **Piotr's save of day 4,300** (130 m by 48 m, seventeen lines) has no room for one: the order is
  refused `No room in the hall for the line and its lane` until the hall grows or lines are moved.

## 3. What the player sees

- **The catalogue's Production line tab**: a third folder, `Timber frame house factory, from
  £50,000,000`; its card in the line card's markup: its six rows (`Module 1: the floor: the joists,
  the insulation and the decking on the house's transporter`), `With ten engineers it makes a house
  every 8 hours on a contract of its own`, the sale line, £50,000,000, `Power £1,800 a day`, `Takes
  84 m by 10 m`, its sentence; and its four upgrade cards (`Takes 80 minutes off each house of the
  line's contract`). The picture slot is empty until the art side's files come.
- **The offer card**: `A housebuilder will take every house line 3 makes, at £60,000 a house. ... The
  line makes one every 8 hours, about 5 a week, and the client collects each house from the line's
  lane the next working day.`
- **The Contracts tab**: the running block in its words; in place of the pallet rows, `On the lane
  for collection: 1 house` while one waits.
- **The hall**: each station drawn as kit with no picture is drawn, a box of 14 m by 10 m by 10 m
  with its name, until the files land (`houseLine1.standard.png` and the rest: no code then). Its lane
  outlined in the lane's yellow, a rectangle with no left strip. Its ten engineers walk the metre in
  front in five pairs. A finished house waits at the lane's gate end, a box of the transporter's 10 m
  by 7.5 m, 5.5 m high, three drawn at the most side by side from the left wall, with the label
  `Houses for collection: 2` on the floor in front of the first; at the gate itself nothing of it.
- **The depth of a station**: a station is sorted among the hall's drawables at its own cell and
  its 10 m of depth (`kitDepth`, `src/render/hall.ts`), and a waiting house at its corner and its
  7.5 m, so the rooms' doors beside the first station are drawn behind it and the houses on the lane
  in front of the stations. The window and door lines' modules are sorted at their cells as before.
- **The hire card**: `Keeps a production line running. A window line takes two: one keeps up to
  three modules, two keep all six. A door line takes four, a house factory ten.`

## 4. The save

No state change: a line's record has carried its kind since v107, and a house factory's record is a
line's record. STATE_VERSION stays 53.

## 5. Tests

- `tests/engine/v114House.test.ts` (8): the factory in the table, five times the window line in money
  and eight in minutes, the kept modules; its six stations, built to order in sixty days, no work
  sheet; its ground (84 by 10, 22 deep, the lane from x 0, no left strip, no forklift) and its place
  in a 90 by 27 m hall, refused in the 800 m2 unit; its lane refused in its own words; ordered whole
  for fifty million under the next number, due in sixty working days; the offer in a housebuilder's
  words; a house off 80 boards and 40 glass units at £60,000 waiting on the lane, drawn there and not
  at the gate, said on the Contracts tab, and gone the next working morning; the catalogue's folder
  and card.
- Flipped: the geometry's new kind argument (`v94Lanes`, `t29Line`, `t31Lane`, `v93Lines`,
  `v95Wider`); the loaded forklift table, a house factory having none (`v107Door`); eighteen line
  modules (`v107Door`); the line tab's three folders (`t29Line`, `catalogueTabs`, ui `v107Door`); the
  stations' metres (`metres`); the engineer's sentence (`t29Engineer`); the work sheets on disk, the
  window and door lines' only (`t30Pictures`); the waiting house on the sprite check page
  (`spriteCheck`); APP_VERSION 'v114' (`version`, `saveCheck`).
- The full check (`npm run check`: the lint, the build and every test) run on its own exit code: 333
  files, 3,202 tests, green.

## 6. Found and left

- The hall's frame is its painting's canvas (section 9 of docs/art/SPRITES.md): its top edge is six
  metres above the floor at the rear wall's left corner and half a metre higher for every metre
  along the wall. A station 10 m high standing at the rear wall from x 5, where the order puts the
  first factory in a hall like the test's, has the top of its first three metres cut by the frame,
  a metre and a half at the most. Seen in Chromium; the box and the art side's gantry alike.

## 7. What chat decided and Piotr has not confirmed

1. The figures: five times the window line's money and eight times its minutes, a house £60,000 in a
   working day, ten engineers, sixty working days of delivery.
2. The names: `Timber frame house factory`, `House line, module N`, `Houses off line N`, `A
   housebuilder`, the four upgrades, the stations' sentences and rows.
3. The lane 10 m deep from the left wall, the house waiting at its gate end, three drawn at the most.
4. No forklift and no pallet for a house; the house collected off the lane the next working day.
