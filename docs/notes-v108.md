# Notes from v108: the door line's own pictures

Built in chat on 18.10.2026 on v107 (STATE_VERSION 51, not changed). Piotr, 18.10, sent the art
side's pack P3 (`Woodwork-Empire-P3-PODGLAD-2026-10-18.zip`) and said: "for now swap in only the
door graphics" ("narazie zamień tylko grafikę drzwi"). Nothing else of the game changed.

## 1. The pack

- **Its status.** P3 is marked PODGLĄD: a preview waiting for Piotr's acceptance, with no
  `approval.json` and not FINAL. Piotr's word above is taken as his use of it. The art side's rule
  is that a FINAL keeps the accepted files byte for byte, so the files here can be checked against
  it with `docs/art/pack-p3-1810/checksums.sha256` the day it comes.
- **Kept in `docs/art/pack-p3-1810/`** (not served): the handoff, the README, `dimensions.json`,
  the pack's checksums, its seven sheet JSONs, and the door pallet's 90 degree view
  (`sprites-2x/90/doorPallet.standard.png`), which nothing turns, as the window pallet's stays in
  its pack (docs/art/SPRITES.md 16). The masters, models, frames, sources, reports and previews stay
  in the delivered ZIP.
- **Taken into `public/sprites/` unchanged**, 30 files, each checked against the pack's checksums:
  - `doorLine1.standard.png` to `doorLine6.standard.png` (view 0, the pack's `sprites-2x/0/`) and
    their `.r.png` (view 90, `sprites-2x/90/`), on the window modules' canvas of 448 by 376;
  - `doorLine1.standard.work.sheet.png` to `doorLine6`: 12 frames in cells of 448 by 376, 6 a second,
    anchored at 296, 368, the window line's figures, so `MACHINE_WORK_SHEETS` serves both kinds
    with its one entry;
  - `doorLine6.standard.stack01.png` to `stack10.png`, the doors on module 6's pallet;
  - `doorPallet.standard.png`: the art side's new four way pallet with ten door sets, view 0,
    2 x 1 x 1.75 m, 160 by 172, anchored at 104, 164, the window pallet's box at the gate;
  - `vehicle.forklift.driveLoadedDoor.sheet.png`: the line's forklift of L3 with the door pallet
    on its forks, the same cells as its two sheets (272 by 256, anchored at 136, 192, 6 frames at 8
    a second, rows `sw`, `se`, `nw`, `ne`).
- `manifest.json` regenerated: 361 sprites.
- The contract's own record of them is `docs/art/SPRITES.md` section 19.

## 2. What the code does with them

- **The grey stand in of v107 goes, whole**: `BORROWED_SPRITES` and `borrowedSprite`
  (`src/render/sprites.ts`), `DOOR_LINE_FILTER`, `DOOR_LINE_CARD_FILTER` and `doorLineFilter`
  (`src/render/hall.ts`), and the card's grey in `pictureSlot` (`src/ui/machine.ts`, back to its
  v106 form). A door line's modules, sheets and stacks are drawn from their own files by the paths
  every line module takes.
- **The gate** draws each kind's own full pallet, `LINE_KINDS[kind].palletSprite` (`windowPallet`,
  `doorPallet`; a new field of `LineKindSpec`).
- **The forklift** (`src/render/forklift.ts`) knows its line's kind and on the way out drives that
  kind's loaded sheet: `FORKLIFT_LOADED_BY_KIND` in `src/engine/constants.ts`, the window pallet's
  sheet with the pallet's middle 1.225 m ahead of its anchor (as Turn 31), the door pallet's with
  it 1.0 m ahead (`loadCenterAheadM` of the P3 forklift JSON). It stops short of the gate's
  pallets by its own kind's figure, and the pallet it hides at the gate while that pallet is on
  its forks is the newest of its own kind among the drawn ones (the windows' first, then the
  doors', two at most), or none when no pallet of its kind is drawn. In v107 it hid the newest of
  every kind, so one kind's forklift could hide the other kind's pallet.
- **Module 6's stack**: one overlay at a time from the line's `onPallet`, `stack01` to `stack09`,
  as the window line's. The tenth sends the pallet to the gate, so `stack10` is on disk and not
  drawn. The sheet's loop is not tied to the minute a door is made, as on the window line (L2).
- **The sprite check page** lists the door pallet beside the window pallet and the loaded door
  forklift's sheet beside the other two.
- **APP_VERSION** 'v108'. No state change: STATE_VERSION stays 51 and no save is lifted.

## 3. Tests

- `tests/ui/v107Door.test.ts`, flipped to the door line's own pictures: its card's picture is its
  own file with no filter; the hall draws its own module 3 and the window line as it was, with no
  door line filter anywhere; module 6's overlay of six doors (`stack06`); the gate's door pallet
  its own picture; and its forklift: it stops 1 m short of the pallets' middle, drives the loaded
  door sheet out, and hides the door pallet and not the window pallet.
- Pins flipped, one line of reason each: APP_VERSION 'v108' (`version`, `saveCheck`); 116 turned
  files and no pallet's turn among them (`rotate`); the class pictures checked 119, turned 116, 12
  work sheets, 20 overlays, the three forklift sheets (`spriteClasses`); every line module's sheet
  and both module 6 overlays (`t30Pictures`); the sprite check's wanted set with
  `doorPallet.standard` (`spriteCheck`).

## 4. Seen and left

- The gate's label still sits over the pallets, and a line standing at y 7 has its engineers'
  path over the gate's pallet place. Both were so before v108.

## 5. What chat decided and Piotr has not confirmed

1. The pack used while it is PODGLĄD, on Piotr's word "zamień tylko grafikę drzwi".
2. The door forklift's drop a metre ahead, the art side's own figure for its pallet.
