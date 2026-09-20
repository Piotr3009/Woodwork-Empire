// v33 (PIOTR, 19.09): the pipe drawing is gone from the hall. This table still routes a run by
// `cell`, and the Sprite check page still prints `px, py` as the measured points, so nothing here
// is dead; the drawing that read them is the only thing removed.
// Where the extraction goes onto a machine and into an extractor: one number per picture, never a
// rule guessed from the footprint (PIOTR, 19.09; CLAUDE.md T22 2.8).
//
// GPT's nine pipe tiles did not meet each other because every joint was a guess. The answer is two
// halves: a run is one continuous path, drawn by `src/render/pipes.ts`, and every point that path
// starts or ends at is a measured pixel of a delivered picture, which is this table. Piotr's rule
// of 19.09: "every connection point is a number in a table, per picture file". A file with no line
// keeps the rule the game had before tonight (the footprint's first cell, no hose) and the Sprite
// check page prints `no port data` in red beside it, so a missing measurement is visible rather
// than quietly wrong.
//
// `PORTS` is keyed by **sprite file name**, one line per picture, because that is the thing a
// measurement belongs to: the day `extractor.pro.r.png` lands it brings its own numbers and no code
// changes (docs/art/REQUESTS-T22.md 2). The engine's `portCell` in `src/engine/pipes.ts` and the
// drawing in `src/render/pipes.ts` both read this one table, so the routing of Turn 13 starts and
// ends exactly where the pipe is painted.
//
// The numbers are pixels of the **2x file, the whole file including its 8 px of padding on every
// side**, as the sheets in `docs/mockups/t22` print them. `spriteAnchorIn` in
// `src/render/sprites.ts` is the arithmetic that turns them into hall coordinates: it is the same
// arithmetic that places the picture, so the point lands on the same pixel of the picture at any
// zoom.
//
// This file imports nothing from the rest of the engine and knows nothing about the game state:
// it is a table and the pure questions asked of it.

import manifest from '../../public/sprites/manifest.json';
import type { Orientation } from './types';

/** The file names the art side has delivered, read off the manifest the build writes. The engine
 *  needs them because Piotr's rule of 19.09 ties the routing to the drawing: a pipe starts on a
 *  measured pixel of the picture the hall really draws, and which picture that is depends on which
 *  turned files have landed. It is static data the game ships with, like the catalogue, and this is
 *  the one place it is read: `src/render/sprites.ts` takes its own list from here, so the loader and
 *  the routing cannot disagree about what exists. */
const DELIVERED: readonly string[] = manifest;

/** The file names the art side has delivered, sorted. */
export function deliveredFiles(): string[] {
  return DELIVERED.slice().sort((left, right) => left.localeCompare(right));
}

/** Which way an extractor's mouth opens on screen. `+x` is down and to the right, `+y` is down and
 *  to the left: the two directions a cell's neighbour lies in on the hall's 2 to 1 dimetric
 *  (docs/art/SPRITES.md 1). A machine's drop has no `faces`: it comes straight down. */
export type PortFaces = '+x' | '+y';

/** One measured connection point on one picture (CLAUDE.md T22 2.8). */
export interface Port {
  /** Pixels from the left edge of the 2x file, padding included. */
  px: number;
  /** Pixels from the top edge of the 2x file, padding included. */
  py: number;
  /** The cell of the route this point belongs to, as an offset from the corner of the item's own
   *  footprint in the item's own orientation: for a machine the cell the drop stands on, which is
   *  inside its footprint; for an extractor the cell in front of its mouth, which is not. */
  cell: { x: number; y: number };
  /** Which way an extractor's mouth opens. Absent for a machine's drop. */
  faces?: PortFaces;
  /** The drop vanishes behind the body of the picture: the vertical is drawn down to `py` and
   *  stops there, with no hose and no ring (PIOTR's pick B for the saw,
   *  docs/mockups/t22/saw-port-B.png). */
  hidden?: boolean;
}

/** Every measured picture in the game, keyed by its file name.
 *
 *  The extractors and the saws are Piotr's own, approved on 19.09 ("all the dots are fine") off
 *  `docs/mockups/t22/ports-extractors.png` and `docs/mockups/t22/ports-saws.png`. The spindle
 *  moulders are Claude's measurements off `docs/mockups/t22/ports-spindle-moulders.png` and the
 *  three edgebanders were measured the same way with no sheet of their own, so both families are
 *  **[TUNE] until Piotr confirms them** from the pictures of T22-C4 (CLAUDE.md T22 2.8).
 *
 *  The two hand edgebanders (`used`, `budget`) want no extraction at all
 *  (`EXTRACTION_DEMAND` 0) and have no line, which is the one case where a missing line is right.
 *  The thicknesser, the solid wood tools and the CNC have an extraction demand and no picture yet,
 *  so there is nothing to measure; `docs/art/REQUESTS-T22.md` 6 asks for the pictures. */
export const PORTS: Record<string, Port> = {
  // The extractors: the mouth of the fan, and which way it opens [PIOTR, 19.09].
  'extractor.used.png': { px: 89, py: 61, faces: '+x', cell: { x: 1, y: 0 } },
  'extractor.budget.png': { px: 89, py: 64, faces: '+x', cell: { x: 1, y: 0 } },
  'extractor.standard.png': { px: 28, py: 67, faces: '+y', cell: { x: 0, y: 1 } },
  'extractor.pro.png': { px: 16, py: 127, faces: '+y', cell: { x: 0, y: 1 } },
  'extractor.industrial.png': { px: 22, py: 64, faces: '+y', cell: { x: 0, y: 1 } },
  // The extractors' true quarter turns (the art side's corrected equipment v2, 20.09; v33): the
  // mouth swaps its side with the turn, so the cell and the direction are the axis swap of the base
  // line; the pixels are the base pixel reflected about the turned anchor as a stand in [TUNE: to
  // be read off the turned pictures, Petros T23].
  'extractor.used.r.png': { px: 23, py: 61, faces: '+y', cell: { x: 0, y: 1 } },
  'extractor.budget.r.png': { px: 23, py: 64, faces: '+y', cell: { x: 0, y: 1 } },
  'extractor.standard.r.png': { px: 84, py: 67, faces: '+x', cell: { x: 1, y: 0 } },
  'extractor.pro.r.png': { px: 96, py: 127, faces: '+x', cell: { x: 1, y: 0 } },
  'extractor.industrial.r.png': { px: 90, py: 64, faces: '+x', cell: { x: 1, y: 0 } },
  // The saws: the rear base outlet, with the drop vanishing behind the body [PIOTR's pick B].
  'tableSaw.used.png': { px: 100, py: 43, cell: { x: 1, y: 0 }, hidden: true },
  'tableSaw.budget.png': { px: 97, py: 62, cell: { x: 1, y: 0 }, hidden: true },
  'tableSaw.standard.png': { px: 137, py: 62, cell: { x: 1, y: 0 }, hidden: true },
  'tableSaw.pro.png': { px: 139, py: 80, cell: { x: 1, y: 0 }, hidden: true },
  'tableSaw.industrial.png': { px: 155, py: 86, cell: { x: 2, y: 0 }, hidden: true },
  // The saws' true quarter turns (the art side's table saws v2, 19.09; v33): the rear base outlet
  // behind the blade, read off the turned pictures by Claude in chat [TUNE until Piotr confirms on
  // a picture]. The base lines above were read off the pictures these replaced and are due the
  // same re-reading (Petros, T23).
  'tableSaw.used.r.png': { px: 86, py: 46, cell: { x: 0, y: 1 }, hidden: true },
  'tableSaw.budget.r.png': { px: 78, py: 46, cell: { x: 0, y: 1 }, hidden: true },
  'tableSaw.standard.r.png': { px: 100, py: 77, cell: { x: 0, y: 1 }, hidden: true },
  'tableSaw.pro.r.png': { px: 124, py: 92, cell: { x: 0, y: 1 }, hidden: true },
  'tableSaw.industrial.r.png': { px: 150, py: 96, cell: { x: 0, y: 2 }, hidden: true },
  // The spindle moulders: the hood on the guard, which the hose reaches down to [TUNE].
  'spindleMoulder.used.png': { px: 107, py: 28, cell: { x: 1, y: 0 } },
  'spindleMoulder.budget.png': { px: 95, py: 40, cell: { x: 1, y: 0 } },
  'spindleMoulder.standard.png': { px: 92, py: 24, cell: { x: 1, y: 0 } },
  'spindleMoulder.pro.png': { px: 151, py: 67, cell: { x: 1, y: 0 } },
  'spindleMoulder.industrial.png': { px: 106, py: 65, cell: { x: 1, y: 0 } },
  // Their true quarter turns (v33): rough stand ins, the hood near the middle of the file [TUNE, to
  // be read off the turned pictures, Petros T23].
  'spindleMoulder.used.r.png': { px: 80, py: 28, cell: { x: 0, y: 1 } },
  'spindleMoulder.budget.r.png': { px: 80, py: 40, cell: { x: 0, y: 1 } },
  'spindleMoulder.standard.r.png': { px: 80, py: 24, cell: { x: 0, y: 1 } },
  'spindleMoulder.pro.r.png': { px: 100, py: 67, cell: { x: 0, y: 1 } },
  'spindleMoulder.industrial.r.png': { px: 150, py: 65, cell: { x: 0, y: 1 } },
  // The three floor edgebanders: the top of the machine [TUNE].
  'edgebander.standard.png': { px: 104, py: 70, cell: { x: 1, y: 0 } },
  'edgebander.pro.png': { px: 117, py: 95, cell: { x: 1, y: 0 } },
  'edgebander.industrial.png': { px: 122, py: 97, cell: { x: 2, y: 0 } },
  // Their true quarter turns (v33): rough stand ins, the top near the middle of the file [TUNE, to
  // be read off the turned pictures, Petros T23].
  'edgebander.standard.r.png': { px: 100, py: 70, cell: { x: 0, y: 1 } },
  'edgebander.pro.r.png': { px: 100, py: 95, cell: { x: 0, y: 1 } },
  'edgebander.industrial.r.png': { px: 130, py: 97, cell: { x: 0, y: 2 } },
};

/** The suffix each orientation's file carries: 0 the base picture, then a quarter turn at a time
 *  (docs/art/SPRITES.md 3; CLAUDE.md T22 2.11). */
const SUFFIX: Record<Orientation, string> = { 0: '', 1: '.r', 2: '.rr', 3: '.rrr' };

/** The file name for a picture at an orientation: pure string work, so it can be asked of a file
 *  list that is not the one on disk. */
export function spriteFileName(
  spriteKey: string,
  variantId: string | null | undefined,
  orientation: Orientation = 0,
): string {
  const tier = typeof variantId === 'string' && variantId !== '' ? `.${variantId}` : '';
  return `${spriteKey}${tier}${SUFFIX[orientation]}.png`;
}

/** Which file the hall really draws this picture with, and whether it has to mirror the base one to
 *  do it. The rule is the loader's own (`pickSprite` and `mirrorNeeded` in
 *  `src/render/sprites.ts`), written here as well so the engine can ask it of a plain list of file
 *  names: the orientation's own file where the art side has drawn one, the class file, then the
 *  family file. At orientation 1 with no `.r` file the base picture is mirrored, which is what the
 *  game has done since Turn 10. */
export function pictureFor(
  files: readonly string[],
  spriteKey: string,
  variantId: string | null | undefined,
  orientation: Orientation = 0,
): { file: string | null; mirrored: boolean } {
  const wanted = [
    spriteFileName(spriteKey, variantId, orientation),
    spriteFileName(spriteKey, null, orientation),
  ];
  for (const name of wanted) {
    if (files.includes(name)) return { file: name, mirrored: false };
  }
  // No file for this orientation. The base picture, mirrored where a quarter turn is what was
  // asked for; a half turn has no mirror that would be right, so it takes the base as it is.
  const base = [spriteFileName(spriteKey, variantId, 0), spriteFileName(spriteKey, null, 0)];
  for (const name of base) {
    if (files.includes(name)) return { file: name, mirrored: swapsFaces(orientation) };
  }
  return { file: null, mirrored: false };
}

/** True for the orientation the hall draws by mirroring the base picture about its anchor: the
 *  quarter turns, and only when no turned file was delivered (CLAUDE.md T10 3.8). */
function swapsFaces(orientation: Orientation): boolean {
  return orientation === 1 || orientation === 3;
}

/** The four orientations, in the order Rotate walks them. */
const ALL_ORIENTATIONS: readonly Orientation[] = [0, 1, 2, 3];

/** True when the art side has drawn a file for this orientation of this picture: the orientation's
 *  own class file or its family file, which are the two names `pictureFor` tries before it falls
 *  back to the base picture. */
function hasOwnPicture(
  files: readonly string[],
  spriteKey: string,
  variantId: string | null | undefined,
  orientation: Orientation,
): boolean {
  return (
    files.includes(spriteFileName(spriteKey, variantId, orientation)) ||
    files.includes(spriteFileName(spriteKey, null, orientation))
  );
}

/** The orientations a thing may be stood at: the ones Rotate can reach (PIOTR, 19.09: "I need two
 *  more turns, we have four walls"; CLAUDE.md T22 2.11).
 *
 *  **0 and 1 always.** A quarter turn with no file of its own is the base picture mirrored about
 *  its anchor, which the hall has done since Turn 10, and a family with no picture at all is a box
 *  whose footprint swaps all the same. **2 and 3 only where the file is there**, because a half
 *  turn has no mirror that would be right: the base picture stood at 2 would be the front of the
 *  machine where its back should be. That is Claude's rule rather than the brief's arithmetic
 *  [TUNE], and it is there so that no wrong picture ever stands on the hall.
 *
 *  The five tool cabinets are the first items in the game with all four (PIOTR's art, 19.09); the
 *  extractors join them the day `docs/art/REQUESTS-T22.md` 2 lands, with no code change. */
export function orientationsFor(
  files: readonly string[],
  spriteKey: string,
  variantId?: string | null,
): Orientation[] {
  return ALL_ORIENTATIONS.filter(
    (orientation) =>
      orientation === 0 || orientation === 1 || hasOwnPicture(files, spriteKey, variantId, orientation),
  );
}

/** The next orientation after this one, round the ones that have a picture: `0, 1, 0` for a thing
 *  with two, `0, 1, 2, 3, 0` for one with four (CLAUDE.md T22 2.11). An orientation that is not on
 *  the list at all, which is what a save made before its `.rr` file was deleted would carry, comes
 *  back to the first one on it. */
export function nextOrientation(
  files: readonly string[],
  spriteKey: string,
  variantId: string | null | undefined,
  orientation: Orientation,
): Orientation {
  const ring = orientationsFor(files, spriteKey, variantId);
  const at = ring.indexOf(orientation);
  return ring[(at + 1) % ring.length] ?? 0;
}

/** The line for this file, or null when nothing has been measured on it. */
export function portFor(file: string | null, ports: Record<string, Port> = PORTS): Port | null {
  if (file === null) return null;
  return ports[file] ?? null;
}

/** The cell of a port read off a picture the hall is mirroring, turned round with it: its two
 *  offsets exchanged (CLAUDE.md T22 2.8).
 *
 *  **The cell is the axis swap and not `width - 1 - x`.** A mirror about the vertical screen axis
 *  on the hall's 2 to 1 dimetric exchanges the roles of the two world axes, which is the very
 *  reason the same sentence of 2.8 says `faces` swaps `+x` and `+y`: a cell that lay one along x
 *  lies one along y afterwards. Both worked examples come out right only this way. The standard
 *  saw's table cell `1,0` on a 3 by 1 footprint becomes `0,1`, the middle cell of the turned 1 by 3
 *  footprint, where `width - 1 - x` gave `-1,0`, a metre outside the machine. The standard
 *  extractor's cell `0,1` with a `+y` mouth becomes `1,0` with a `+x` mouth, one cell along the
 *  axis the mouth now opens down, where `width - 1 - x` left it at `0,1`, under the unit itself.
 *
 *  Nothing is clamped either way. A machine's cell is inside its own footprint because the drop
 *  comes down onto its body; an extractor's is outside it, because the vertical stands in front of
 *  the mouth and not in it. `tests/engine/ports.test.ts` asserts both of those, per file, at every
 *  orientation.
 *
 *  The pixel and the mouth are mirrored where the mirror really happens, in `portPointOf` in
 *  `src/render/hall.ts`, and not here: the hall reflects a picture about its **anchor**
 *  (`objectArt`'s `translate(anchor.x * 2, 0) scale(-1, 1)`), so the reflection of a file pixel is
 *  `2 * (8 + width * 48) - px` and not 2.8's `fileWidth - px`, which reflects the file about its
 *  own middle. The two agree only where the footprint is square. On the standard saw turned, the
 *  one machine this really happens to, they are 96 file pixels apart, which is two metres of hall:
 *  the arithmetic is in docs/notes-t22-b3.md and in REPORT-T22.md section 0. One rule each, then:
 *  the cell here, where the engine routes by it, and the pixel there, where the hall's own
 *  transform defines it. */
export function mirroredCell(cell: { x: number; y: number }): { x: number; y: number } {
  return { x: cell.y, y: cell.x };
}

/** The cell of the route this item's port belongs to, as an offset from the corner of its own
 *  footprint, or null when nothing has been measured for the picture it is drawn with. The one
 *  question the engine's routing asks of this table (CLAUDE.md T22 2.8): the drawing asks `portOf`
 *  for the pixel as well, and the two read the same line, so the pipe is painted where it is
 *  routed. */
export function portCellIn(
  files: readonly string[],
  item: { spriteKey: string; variantId?: string | null; orientation?: Orientation },
  ports: Record<string, Port> = PORTS,
): { x: number; y: number } | null {
  const orientation = item.orientation ?? 0;
  const picture = pictureFor(files, item.spriteKey, item.variantId, orientation);
  const port = portFor(picture.file, ports);
  if (port === null) return null;
  if (!picture.mirrored) return { x: port.cell.x, y: port.cell.y };
  return { x: port.cell.y, y: port.cell.x };
}

/** Every file name the table has a line for, sorted: what the Sprite check page and the tests
 *  count. */
export function measuredFiles(ports: Record<string, Port> = PORTS): string[] {
  return Object.keys(ports).sort((left, right) => left.localeCompare(right));
}
