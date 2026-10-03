// The network the men walk on (CLAUDE.md T16 2.2). The standing points at the items are nodes of
// one network over the free cells of the floor, and every walk is a path on it, never a jump
// (PIOTR, red pen, 16.09). The engine says where and along which cells; the renderer says when.
//
// A cell is free when it is inside the unit, on no footprint, in no room, and not the pallet's
// own cells. The working zones of machines are free (a man walks through a zone), the gate lane
// is free, and a pipe tile is free because it is in the air. From Turn 26 a walk goes between the
// machines: over the free cells no machine's picture covers, the long way round when it has to,
// and the straight line only for a cell boxed in on every side (CLAUDE.md T26 2.3).
//
// This is the path finder for men. `pathBetween` in pipes.ts is the one for pipes: a pipe goes
// over equipment in the air and never round it, so the two are not the same search and are not
// shared (CLAUDE.md T16 2.2).

import { PALLET_LAYOUT, PICTURE_COVER_SHARE, roomsOf } from './constants';
import { findSpec, isSold, itemStandsInTheHall } from './machines';
import { footprintOrigin } from './pipes';
import type { Cell } from './pipes';
import type { GameState, Orientation } from './types';

export type { Cell };

/** The whole cells a footprint is counted on: from the cell its origin is in, as many cells as it
 *  is wide and deep. A 2 by 1 centred in a 3 by 3 zone starts half a cell in and is counted on the
 *  two cells from there, the same two the port and the old front cell were counted on
 *  (src/engine/pipes.ts portCell), so a man's cell beside it is the cell beside those. */
export function footprintCells(item: {
  specId: string;
  variantId: string;
  orientation?: Orientation;
  anchorX: number;
  anchorY: number;
}): { x: number; y: number; width: number; depth: number } {
  const origin = footprintOrigin(item);
  return {
    x: Math.floor(origin.x),
    y: Math.floor(origin.y),
    width: Math.max(1, Math.ceil(origin.width)),
    depth: Math.max(1, Math.ceil(origin.depth)),
  };
}

/** Whether a box of whole cells holds this cell: the one test for "is the thing standing on it"
 *  (CLAUDE.md T16 2.2, T19 2.4). */
export function covers(
  box: { x: number; y: number; width: number; depth: number },
  cell: Cell,
): boolean {
  return cell.x >= box.x && cell.x < box.x + box.width && cell.y >= box.y && cell.y < box.y + box.depth;
}

/** True for a thing that stands outside the hall and on none of its floor: out on the apron past
 *  the end of it, or behind the rear wall (v73). The one test: the floor a man walks, the floor a
 *  machine is moved over and the setting out of the hall all leave such a thing alone. */
export function standsOutsideTheHall(state: GameState, item: { anchorX: number; anchorY: number }): boolean {
  return item.anchorX >= state.unit.widthCells || item.anchorY < 0;
}

/** Inside the painted floor at all. */
export function insideUnit(state: GameState, cell: Cell): boolean {
  return cell.x >= 0 && cell.y >= 0 && cell.x < state.unit.widthCells && cell.y < state.unit.depthCells;
}

/** Can a man stand here: inside the unit, on no footprint, in no room, not on the pallet. */
export function isFree(state: GameState, cell: Cell): boolean {
  if (!insideUnit(state, cell)) return false;
  if (covers(PALLET_LAYOUT, cell)) return false;
  for (const room of roomsOf(state.unit)) {
    if (covers(room, cell)) return false;
  }
  for (const item of state.equipment) {
    if (isSold(item) || !itemStandsInTheHall(item)) continue;
    if (standsOutsideTheHall(state, item)) continue;
    if (covers(footprintCells(item), cell)) return false;
  }
  return true;
}

/** Whether a machine's picture covers this cell on the floor: its drawn footprint over at least
 *  `PICTURE_COVER_SHARE` of the cell. The pictures are drawn on their own footprints and no bigger
 *  (every delivered file is the canvas docs/art/SPRITES.md 2 gives its class's footprint, measured
 *  on 02.10), and a footprint stands centred in its working zone, so it may reach part of the way
 *  into the cells round `footprintCells`: what it covers of them is the picture's overhang, and a
 *  man walking across it would cross the table on screen (CLAUDE.md T26 2.3). */
export function pictureCovers(
  item: { specId: string; variantId: string; orientation?: Orientation; anchorX: number; anchorY: number },
  cell: Cell,
): boolean {
  const drawn = footprintOrigin(item);
  const across = Math.min(drawn.x + drawn.width, cell.x + 1) - Math.max(drawn.x, cell.x);
  const along = Math.min(drawn.y + drawn.depth, cell.y + 1) - Math.max(drawn.y, cell.y);
  if (across <= 0 || along <= 0) return false;
  return across * along >= PICTURE_COVER_SHARE - 1e-9;
}

/** Can a man walk across here: a cell he can stand on (`isFree`) that no machine's picture covers
 *  either, so a man never crosses a saw's table on screen (PIOTR, 02.10: "they walk over the
 *  machines"; CLAUDE.md T26 2.3). The rest of the working zones are walked as they always were, and
 *  the two ends of a walk are taken as they are. */
export function isWalkable(state: GameState, cell: Cell, own: ReadonlySet<string> = new Set<string>()): boolean {
  if (!isFree(state, cell)) return false;
  for (const item of state.equipment) {
    if (isSold(item) || !itemStandsInTheHall(item)) continue;
    if (standsOutsideTheHall(state, item)) continue;
    if (own.has(item.id) || !isAMachine(item)) continue;
    if (pictureCovers(item, cell)) return false;
  }
  return true;
}

/** True for a machine, whose table a man is not to be drawn crossing: a bench's top reaching into
 *  its front row is where its men stand, and a rack or a fan is gone round by its own free side
 *  (CLAUDE.md T26 2.3: "a machine's drawn picture"). */
function isAMachine(item: { specId: string }): boolean {
  return findSpec(item.specId)?.category === 'machine';
}

/** The machines whose pictures cover either end of a walk: the one he steps off and the one he
 *  steps up to. He may walk along their covered cells, which is how a man in the middle of a row of
 *  places at a bench gets out of it; nobody else's (CLAUDE.md T26 2.3). */
function ownPictures(state: GameState, from: Cell, to: Cell): Set<string> {
  const own = new Set<string>();
  for (const item of state.equipment) {
    if (isSold(item) || !itemStandsInTheHall(item)) continue;
    if (isAMachine(item) && (pictureCovers(item, from) || pictureCovers(item, to))) own.add(item.id);
  }
  return own;
}

function keyOf(cell: Cell): string {
  return `${cell.x},${cell.y}`;
}

const STEPS: readonly Cell[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

/** The straight Manhattan line from one cell to the other, x first: what a boxed in man gets
 *  when no free path exists, so he still gets somewhere (CLAUDE.md T16 2.2). */
export function straightLine(from: Cell, to: Cell): Cell[] {
  const cells: Cell[] = [{ x: from.x, y: from.y }];
  let { x, y } = from;
  while (x !== to.x) {
    x += Math.sign(to.x - x);
    cells.push({ x, y });
  }
  while (y !== to.y) {
    y += Math.sign(to.y - y);
    cells.push({ x, y });
  }
  return cells;
}

/** How a walk was found: over the walkable floor, which is every walk the aim allows; through a
 *  picture's overhang when the walkable floor has no way to the cell; or the straight line, which
 *  is kept only for a cell with no free neighbour at all (CLAUDE.md T26 2.3). */
export type WalkKind = 'floor' | 'overhang' | 'straight';

/** A breadth first search over the four neighbours on the cells `open` allows: the first path
 *  found is a shortest one, however far round it goes. The two ends are taken as they are. Null
 *  when there is none. */
function search(from: Cell, to: Cell, open: (cell: Cell) => boolean): Cell[] | null {
  const target = keyOf(to);
  const cameFrom = new Map<string, Cell | null>();
  cameFrom.set(keyOf(from), null);
  const queue: Cell[] = [{ x: from.x, y: from.y }];
  let found = false;
  while (queue.length > 0 && !found) {
    const cell = queue.shift() as Cell;
    for (const step of STEPS) {
      const next = { x: cell.x + step.x, y: cell.y + step.y };
      const key = keyOf(next);
      if (cameFrom.has(key)) continue;
      if (key !== target && !open(next)) continue;
      cameFrom.set(key, cell);
      if (key === target) {
        found = true;
        break;
      }
      queue.push(next);
    }
  }
  if (!found) return null;
  const path: Cell[] = [];
  let cursor: Cell | null = { x: to.x, y: to.y };
  while (cursor !== null) {
    path.push(cursor);
    cursor = cameFrom.get(keyOf(cursor)) ?? null;
  }
  return path.reverse();
}

/** The cells from `from` to `to` inclusive, and how they were found: between the machines over the
 *  walkable floor, the long way round when that is what it takes (PIOTR, 02.10: "they should walk
 *  between the machines"); through a picture's overhang only when the floor has no way at all; and
 *  the straight line only for a cell boxed in on every side (CLAUDE.md T16 2.2, T26 2.3). */
export function walkRoute(state: GameState, from: Cell, to: Cell): { path: Cell[]; kind: WalkKind } {
  if (from.x === to.x && from.y === to.y) return { path: [{ x: from.x, y: from.y }], kind: 'floor' };
  const own = ownPictures(state, from, to);
  const floor = search(from, to, (cell) => isWalkable(state, cell, own));
  if (floor !== null) return { path: floor, kind: 'floor' };
  const overhang = search(from, to, (cell) => isFree(state, cell));
  if (overhang !== null) return { path: overhang, kind: 'overhang' };
  return { path: straightLine(from, to), kind: 'straight' };
}

/** The cells from `from` to `to` inclusive, the way `walkRoute` finds them. */
export function walkPath(state: GameState, from: Cell, to: Cell): Cell[] {
  return walkRoute(state, from, to).path;
}
