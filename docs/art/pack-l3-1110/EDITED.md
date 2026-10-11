# What was edited in this pack

The art side's L3 of 11.10.2026 (the pallet of ten wrapped windows standing alone, and the line's
forklift with its driver, empty and loaded, in four directions), approved by Piotr that evening
("akceptacja jest", `approval.json`), was brought into the repo by chat for Turn 31 (CLAUDE.md T31
2.10) as it was delivered, with these exceptions:

- **The three pictures the game draws** were put in `docs/pictures-l3/` for task T31-C4 to move into
  `public/sprites/`, byte for byte: `sprites-2x/0/windowPallet.standard.png` and the two sheets of
  `sheets/`, `vehicle.forklift.drive.sheet.png` and `vehicle.forklift.driveLoaded.sheet.png`. Their
  JSONs stay here in `sheets/`, and the game writes their figures once as a constant. The pallet's
  90 degree view stays here in `sprites-2x/90/` and is not served: nothing turns the pallet.
- **Left out of the repo**, and kept by Piotr in the delivered ZIP
  (`Woodwork-Empire-L3-FINAL-2026-10-11.zip`): `masters/` (the renders at six times the game's
  scale), `models/` (the meshes), `frames/` (the 48 cells of the two sheets as single files, the
  same pixels as the sheets) and `reference/` (copies of chat's order of 11.10, of its drawings, of
  the L2 source and of the game's own forklift picture).
- **The game writes no em or en dash anywhere** (a standing rule of the project), so in five text
  files each one was replaced by a colon, a comma or the word "to", and nothing else of the file was
  touched: `HANDOFF-CLAUDE.md` (2), `README.md` (2), `camera-QA.md` (1), `source/validate_l3.py` (2)
  and `source/render3d.py` (1).

`checksums.sha256` is the art side's own and was not edited, so its lines for those five files no
longer match them, and its lines for the files left out or moved name them where they stood in the
delivered ZIP.
