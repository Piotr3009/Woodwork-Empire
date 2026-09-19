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
  // The saws: the rear base outlet, with the drop vanishing behind the body [PIOTR's pick B].
  'tableSaw.used.png': { px: 100, py: 43, cell: { x: 1, y: 0 }, hidden: true },
  'tableSaw.budget.png': { px: 97, py: 62, cell: { x: 1, y: 0 }, hidden: true },
  'tableSaw.standard.png': { px: 137, py: 62, cell: { x: 1, y: 0 }, hidden: true },
  'tableSaw.pro.png': { px: 139, py: 80, cell: { x: 1, y: 0 }, hidden: true },
  'tableSaw.industrial.png': { px: 155, py: 86, cell: { x: 2, y: 0 }, hidden: true },
  // The spindle moulders: the hood on the guard, which the hose reaches down to [TUNE].
  'spindleMoulder.used.png': { px: 107, py: 28, cell: { x: 1, y: 0 } },
  'spindleMoulder.budget.png': { px: 95, py: 40, cell: { x: 1, y: 0 } },
  'spindleMoulder.standard.png': { px: 92, py: 24, cell: { x: 1, y: 0 } },
  'spindleMoulder.pro.png': { px: 151, py: 67, cell: { x: 1, y: 0 } },
  'spindleMoulder.industrial.png': { px: 106, py: 65, cell: { x: 1, y: 0 } },
  // The three floor edgebanders: the top of the machine [TUNE].
  'edgebander.standard.png': { px: 104, py: 70, cell: { x: 1, y: 0 } },
  'edgebander.pro.png': { px: 117, py: 95, cell: { x: 1, y: 0 } },
  'edgebander.industrial.png': { px: 122, py: 97, cell: { x: 2, y: 0 } },
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

/** The line for this file, or null when nothing has been measured on it. */
export function portFor(file: string | null, ports: Record<string, Port> = PORTS): Port | null {
  if (file === null) return null;
  return ports[file] ?? null;
}

/** A port read off a picture the hall is mirroring, turned round with it: `px` counts from the
 *  other edge of the file, a `+x` mouth becomes a `+y` one, and the cell is mirrored across the
 *  footprint, whose width in the mirrored orientation is `footprintWidth` (CLAUDE.md T22 2.8). */
export function mirroredPort(port: Port, fileWidth: number, footprintWidth: number): Port {
  return {
    ...port,
    px: fileWidth - port.px,
    faces: port.faces === undefined ? undefined : port.faces === '+x' ? '+y' : '+x',
    cell: { x: footprintWidth - 1 - port.cell.x, y: port.cell.y },
  };
}

/** The port of a thing standing in the hall, with the mirror already applied where the hall is
 *  mirroring the picture, or null when nothing has been measured for the picture it is drawn with.
 *
 *  `fileWidth` is the width of the 2x file in pixels, which is the renderer's arithmetic
 *  (`spriteFileSize`) and not the table's, so the caller hands it in; `footprintWidth` is the
 *  item's own footprint in the orientation being asked about. Both are read on the mirrored path
 *  only. The engine's routing wants the cell alone and asks `portCellIn` instead, which needs no
 *  file size at all. */
export function portOf(
  files: readonly string[],
  item: { spriteKey: string; variantId?: string | null; orientation?: Orientation },
  size: { fileWidth: number; footprintWidth: number },
  ports: Record<string, Port> = PORTS,
): Port | null {
  const orientation = item.orientation ?? 0;
  const picture = pictureFor(files, item.spriteKey, item.variantId, orientation);
  const port = portFor(picture.file, ports);
  if (port === null) return null;
  return picture.mirrored ? mirroredPort(port, size.fileWidth, size.footprintWidth) : port;
}

/** The cell of the route this item's port belongs to, as an offset from the corner of its own
 *  footprint, or null when nothing has been measured for the picture it is drawn with. The one
 *  question the engine's routing asks of this table (CLAUDE.md T22 2.8): the drawing asks `portOf`
 *  for the pixel as well, and the two read the same line, so the pipe is painted where it is
 *  routed. */
export function portCellIn(
  files: readonly string[],
  item: { spriteKey: string; variantId?: string | null; orientation?: Orientation },
  footprintWidth: number,
  ports: Record<string, Port> = PORTS,
): { x: number; y: number } | null {
  const orientation = item.orientation ?? 0;
  const picture = pictureFor(files, item.spriteKey, item.variantId, orientation);
  const port = portFor(picture.file, ports);
  if (port === null) return null;
  if (!picture.mirrored) return { x: port.cell.x, y: port.cell.y };
  return { x: footprintWidth - 1 - port.cell.x, y: port.cell.y };
}

/** Every file name the table has a line for, sorted: what the Sprite check page and the tests
 *  count. */
export function measuredFiles(ports: Record<string, Port> = PORTS): string[] {
  return Object.keys(ports).sort((left, right) => left.localeCompare(right));
}
