# Notes from v110: the two shelters' pictures

Built in chat on 18.10.2026 on v109 (STATE_VERSION 51, not changed). Piotr, 18.10: "you have the
rest of the art, code it one picture at a time". The first of them, the art side's P1
(`Woodwork-Empire-P1-PODGLAD-2026-10-18.zip`): the pictures of the glass shelter (v100) and the
large timber shelter (v103), the two stores behind the rear wall that the game drew as kit with no
picture.

- **The files**: `glassShelter.standard.png` and `timberShelterLarge.standard.png`, view 0 from the
  pack's `sprites-2x/0/` and their `.r.png` from `sprites-2x/90/`, byte for byte (each checked
  against the pack's checksums), on the contract's canvases for 12 x 3 x 3 m and 18 x 3 x 4 m, the
  specs' own metres. `manifest.json` regenerated: 365 sprites. The pack's notes and figures in
  `docs/art/pack-p1-1810/`; the contract's record in `docs/art/SPRITES.md` section 20.
- **No code changed** but the two specs' comments and APP_VERSION 'v110': the hall draws a store
  behind the wall from its picture the day the file is in the manifest, clipped at the wall's crown,
  with its plate, and red when it is made bigger (v105). Seen in Chromium with both in the first row
  and a glass shelter made bigger in the second.
- **The status**: P1 is PODGLĄD, with no `approval.json`; Piotr's word above is taken as his use of
  it. A FINAL is to keep the same bytes, and the checksums tell.
- **Tests**: `v100GlassShelter` (its picture both ways round, flipped from none), the header of
  `v103TimberShelterLarge`, the turned files 118 (`rotate`), the class pictures 121 and the turned
  118 (`spriteClasses`), APP_VERSION (`version`, `saveCheck`). Run: the lint and the type check whole,
  and those with `spriteCheck`, `catalogueTabs`, `machine`, `metres`, `v105Renewal`, `t29Stores`,
  `t31Shelter`, `t31Hall`, `layout` and `v101RearRows`: 16 files, 137 tests, green. The full suite
  was not run.
