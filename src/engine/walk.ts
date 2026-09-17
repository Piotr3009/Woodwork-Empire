// The network the men walk on (CLAUDE.md T16 2.2). The standing points at the items are nodes of
// one network over the free cells of the floor, and every walk is a path on it, never a jump
// (PIOTR, red pen, 16.09). The engine says where and along which cells; the renderer says when.
//
// A cell is free when it is inside the unit, on no footprint, in no room, and not the pallet's
// own cells. The working zones of machines are free (a man walks through a zone), the gate lane
// is free, and a pipe tile is free because it is in the air.
//
// This is the path finder for men. `pathBetween` in pipes.ts is the one for pipes: a pipe goes
// over equipment in the air and never round it, so the two are not the same search and are not
// shared (CLAUDE.md T16 2.2).

import { PALLET_LAYOUT, ROOM_LAYOUT } from './constants';
import { isSold, itemStandsInTheHall } from './machines';
import { footprintOrigin } from './pipes';
import type { Cell } from './pipes';
import type { GameState } from './types';

export type { Cell };

/** The whole cells a footprint is counted on: from the cell its origin is in, as many cells as it
 *  is wide and deep. A 2 by 1 centred in a 3 by 3 zone starts half a cell in and is counted on the
 *  two cells from there, the same two the port and the old front cell were counted on
 *  (src/engine/pipes.ts portCell), so a man's cell beside it is the cell beside those. */
export function footprintCells(item: {
  specId: string;
  variantId: string;
  rotated?: boolean;
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

/** Inside the painted floor at all. */
export function insideUnit(state: GameState, cell: Cell): boolean {
  return cell.x >= 0 && cell.y >= 0 && cell.x < state.unit.widthCells && cell.y < state.unit.depthCells;
}

/** Can a man stand here: inside the unit, on no footprint, in no room, not on the pallet. */
export function isFree(state: GameState, cell: Cell): boolean {
  if (!insideUnit(state, cell)) return false;
  if (covers(PALLET_LAYOUT, cell)) return false;
  for (const room of ROOM_LAYOUT) {
    if (covers(room, cell)) return false;
  }
  for (const item of state.equipment) {
    if (isSold(item) || !itemStandsInTheHall(item)) continue;
    if (item.anchorX >= state.unit.widthCells) continue;
    if (covers(footprintCells(item), cell)) return false;
  }
  return true;
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

/** The cells from `from` to `to` inclusive, over the four neighbours on free cells: a breadth
 *  first search, so the first path found is a shortest one. The two ends are taken as they are
 *  (a standing cell is free by construction, and a man who is somewhere odd still walks off it).
 *  Falls back to the straight line when no free path exists. */
export function walkPath(state: GameState, from: Cell, to: Cell): Cell[] {
  if (from.x === to.x && from.y === to.y) return [{ x: from.x, y: from.y }];
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
      if (key !== target && !isFree(state, next)) continue;
      cameFrom.set(key, cell);
      if (key === target) {
        found = true;
        break;
      }
      queue.push(next);
    }
  }
  if (!found) return straightLine(from, to);
  const path: Cell[] = [];
  let cursor: Cell | null = { x: to.x, y: to.y };
  while (cursor !== null) {
    path.push(cursor);
    cursor = cameFrom.get(keyOf(cursor)) ?? null;
  }
  return path.reverse();
}
