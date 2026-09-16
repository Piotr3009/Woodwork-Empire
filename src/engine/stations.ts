// Where a figure is standing. The engine decides, the renderer only draws it (CLAUDE.md T2 3.3).
//
// A station is a string so the state stays plain JSON: 'bench', 'machine:<specId>', 'rack',
// 'gate', 'office' or 'idle'.

import { GATE_LAYOUT, PALLET_LAYOUT, SHEETS_PER_TRIP } from './constants';
import { itemStandsInTheHall } from './machines';
import type { Cell } from './pipes';
import type { Equipment, GameState, TaskInstance } from './types';
import { footprintCells, isFree } from './walk';

export const STATION_BENCH = 'bench';
export const STATION_RACK = 'rack';
export const STATION_GATE = 'gate';
export const STATION_OFFICE = 'office';
/** At the desk with the phone in his hand. The same cell as the office: what it says is which
 *  sheet the figure plays (PIOTR, 15.09; CLAUDE.md T11 3.11). */
export const STATION_PHONE = 'phone';
export const STATION_IDLE = 'idle';
/** Standing at the canteen door because there is no bench to work at (CLAUDE.md T4 3.4). */
export const STATION_NO_BENCH = 'noBench';

export function machineStation(specId: string): string {
  return `machine:${specId}`;
}

/** The machine a station names, or null when it is not a machine station. */
export function stationMachine(station: string): string | null {
  return station.startsWith('machine:') ? station.slice('machine:'.length) : null;
}

/** Standing at a machine somebody else has, waiting for him to finish with it. The Turn 2 cycle
 *  of fifteen minutes at the bench and five at the saw is gone: a man is at the station of the
 *  stage he is working, for as long as that stage takes (CLAUDE.md T7 3.1). */
export function waitingStation(specId: string): string {
  return `waiting:${specId}`;
}

/** The machine a man is waiting for, or null when he is not waiting for one. */
export function stationWaitingFor(station: string): string | null {
  return station.startsWith('waiting:') ? station.slice('waiting:'.length) : null;
}

/** How many trips a load of sheets is between the pallet at the gate and the rack, so many
 *  sheets a trip, and never fewer than one (CLAUDE.md T13 3.21). */
export function unloadTrips(sheets: number): number {
  return Math.max(1, Math.ceil(sheets / SHEETS_PER_TRIP));
}

/** Which leg of the walk the unloading man is on at this point of the task: a trip is a leg to
 *  the rack with the sheets and a leg back to the pallet, and the task's minutes are shared out
 *  over every leg, so the minutes still total the handling table's figure however many sheets
 *  are on the pallet (CLAUDE.md T13 3.21). Even legs are at the gate, odd ones at the rack. */
export function unloadLegAt(task: { minutesTotal: number; minutesRemaining: number }, sheets: number): number {
  const legs = unloadTrips(sheets) * 2;
  const elapsed = Math.max(0, task.minutesTotal - task.minutesRemaining);
  if (task.minutesTotal <= 0) return 0;
  return Math.min(legs - 1, Math.floor((elapsed / task.minutesTotal) * legs));
}

/** Where the man unloading a load of sheets stands at this point of it: the pallet at the gate
 *  on an even leg, the rack on an odd one. The "walking in the corner" of Turn 8 is gone: he
 *  walks the path the character system already uses, back and forth (CLAUDE.md T13 3.21). */
export function unloadStation(task: TaskInstance, sheets: number): string {
  return unloadLegAt(task, sheets) % 2 === 0 ? STATION_GATE : STATION_RACK;
}

/** Where a job of work puts the figure doing it. */
export function stationForTask(state: GameState, task: TaskInstance): string {
  switch (task.kind) {
    case 'unload': {
      // A load of sheets is a walk between the pallet and the rack; a machine off the lorry is
      // got off at the gate and stands where the floor was held for it (CLAUDE.md T13 3.21).
      const delivery = task.deliveryId
        ? state.deliveries.find((entry) => entry.id === task.deliveryId)
        : null;
      return delivery ? unloadStation(task, delivery.sheets) : STATION_GATE;
    }
    case 'deliver':
      return STATION_GATE;
    case 'fetchStorage':
      return STATION_RACK;
    case 'emptyBags': {
      // The bags are on the extractor: he stands at the first fan in the hall (T12 2.3).
      const fan = state.equipment.find(
        (item) => item.specId === 'extractor' && itemStandsInTheHall(item),
      );
      return fan ? machineStation(fan.specId) : STATION_BENCH;
    }
    case 'service':
    case 'repair': {
      const machine = task.equipmentId
        ? state.equipment.find((item) => item.id === task.equipmentId)
        : null;
      if (!machine || !itemStandsInTheHall(machine)) return STATION_BENCH;
      return machineStation(machine.specId);
    }
    case 'cleaning':
      return STATION_BENCH;
    case 'clientCall':
      return STATION_PHONE;
    default:
      // Emails, bookkeeping, ordering, drawings and site measures are all desk work.
      return STATION_OFFICE;
  }
}

// ---------------------------------------------------------------------------
// Where a man stands at an item: the station table and the free side (CLAUDE.md T16 2.1). One
// row per family, every cell an offset from the whole cells the footprint covers. "Front" is the
// camera side, y + depth; "back" is y - 1; the "left end" is x - 1 on the item's first row and
// the "right end" x + width. A cell in the table is a preference: it has to be free, and when it
// is not the sides are tried in a fixed order, front, back, left, right, at the same position
// along the side. A rack, and the extractor by its bags, take the side with the most free cells
// in the two rows beyond it instead, which is the hall side when it stands against a wall
// (PIOTR, red pen, 16.09: "when it stands against a wall you come at it from the other side").
// ---------------------------------------------------------------------------

export type Side = 'front' | 'back' | 'left' | 'right';
export type StationRole = 'operator' | 'waiting' | 'second';

/** A cell beside a footprint: which side, how far along it, and how many cells out from it. */
export interface StationOffset {
  side: Side;
  /** Position along the side, from the item's first cell. Negative and beyond the width are
   *  allowed: "the cell to the left of the operator" on a one cell edgebander is at minus one. */
  along: number | 'right' | 'middle';
  /** Cells out from the footprint beyond the first: "one cell further left" is out 1. */
  out?: number;
}

export interface StationRow {
  operator: StationOffset | 'freeSide';
  waiting: StationOffset | null;
  second: StationOffset | null;
}

/** The station table, one row per family (CLAUDE.md T16 2.1). */
export const STATION_TABLE: Record<string, StationRow> = {
  tableSaw: {
    operator: { side: 'front', along: 'right' },
    waiting: { side: 'front', along: 0 },
    second: null,
  },
  thicknesser: {
    operator: { side: 'left', along: 0 },
    waiting: { side: 'left', along: 0, out: 1 },
    second: null,
  },
  spindleMoulder: {
    operator: { side: 'front', along: 0 },
    waiting: { side: 'front', along: 'right' },
    second: null,
  },
  edgebander: {
    // The second cell from the infeed end, which is the left, read off the footprint's width so
    // the row needs no change when the footprint grows to 4 by 1 (CLAUDE.md T16 2.1, 6).
    operator: { side: 'front', along: 1 },
    waiting: { side: 'front', along: 0 },
    second: null,
  },
  cnc: {
    operator: { side: 'front', along: 'right' },
    waiting: { side: 'front', along: 'middle' },
    second: { side: 'back', along: 'middle' },
  },
  sprayBooth: {
    operator: { side: 'front', along: 'middle' },
    waiting: { side: 'front', along: 0 },
    second: null,
  },
  workbench: {
    operator: { side: 'front', along: 0 },
    waiting: { side: 'front', along: 'right' },
    second: { side: 'back', along: 'right' },
  },
  sheetRack: { operator: 'freeSide', waiting: null, second: null },
  extractor: { operator: 'freeSide', waiting: null, second: null },
};

/** Anything not in the table: the front side, the left cell, as every item was placed before. */
const DEFAULT_ROW: StationRow = {
  operator: { side: 'front', along: 0 },
  waiting: { side: 'front', along: 1 },
  second: null,
};

export function stationRow(specId: string): StationRow {
  return STATION_TABLE[specId] ?? DEFAULT_ROW;
}

/** The whole cells an item stands on, for the offsets to count from. */
export function standsOn(item: Equipment): { x: number; y: number; width: number; depth: number } {
  return footprintCells(item);
}

const SIDES: readonly Side[] = ['front', 'back', 'left', 'right'];

function alongOf(along: number | 'right' | 'middle', extent: number): number {
  if (along === 'right') return extent - 1;
  if (along === 'middle') return Math.floor(extent / 2);
  // A number is kept as written: the table's "second cell from the left" on a one cell machine is
  // still the second cell, off the footprint, which is where the man stands.
  return along;
}

/** The cell an offset names beside this footprint. */
export function cellAt(
  box: { x: number; y: number; width: number; depth: number },
  offset: StationOffset,
): Cell {
  const out = offset.out ?? 0;
  switch (offset.side) {
    case 'front':
      return { x: box.x + alongOf(offset.along, box.width), y: box.y + box.depth + out };
    case 'back':
      return { x: box.x + alongOf(offset.along, box.width), y: box.y - 1 - out };
    case 'left':
      return { x: box.x - 1 - out, y: box.y + alongOf(offset.along, box.depth) };
    case 'right':
      return { x: box.x + box.width + out, y: box.y + alongOf(offset.along, box.depth) };
    default:
      return { x: box.x, y: box.y + box.depth };
  }
}

/** The same position along another side: the offset turned to that side, with the along kept as
 *  written (the table's "right cell" is the right cell of whichever side is free). */
function turned(offset: StationOffset, side: Side): StationOffset {
  return { ...offset, side };
}

/** How many free cells there are in the two rows beyond a side of this footprint. */
function freeBeyond(state: GameState, box: { x: number; y: number; width: number; depth: number }, side: Side): number {
  let count = 0;
  for (let out = 0; out < 2; out += 1) {
    const extent = side === 'front' || side === 'back' ? box.width : box.depth;
    for (let along = 0; along < extent; along += 1) {
      if (isFree(state, cellAt(box, { side, along, out }))) count += 1;
    }
  }
  return count;
}

/** The side a man comes at a rack or a fan from: the one with the most free cells in the two rows
 *  beyond it, front first on a tie, which is the hall side when it stands against a wall or under
 *  a room (CLAUDE.md T16 2.1). */
export function freeSideOf(state: GameState, item: Equipment): Side {
  const box = standsOn(item);
  let best: Side = 'front';
  let most = -1;
  for (const side of SIDES) {
    const count = freeBeyond(state, box, side);
    if (count > most) {
      most = count;
      best = side;
    }
  }
  return best;
}

/** The cell a man stands on to use this item in this role: the table's cell where it is free, the
 *  first free side at the same position along it where it is not, and the table's cell as it
 *  stands when nothing is free at all (the straight line walk still gets him there). */
export function standingCell(state: GameState, item: Equipment, role: StationRole = 'operator'): Cell {
  const row = stationRow(item.specId);
  const box = standsOn(item);
  let offset: StationOffset;
  if (row.operator === 'freeSide') {
    const side = freeSideOf(state, item);
    // Half way along the free side, the way a man stands at a rack to reach it.
    offset = { side, along: 'middle' };
    if (role === 'waiting') offset = { side, along: 'middle', out: 1 };
  } else {
    const wanted = role === 'operator' ? row.operator : role === 'waiting' ? row.waiting : row.second;
    offset = wanted ?? row.operator;
  }
  const preferred = cellAt(box, offset);
  if (isFree(state, preferred)) return preferred;
  for (const side of SIDES) {
    if (side === offset.side) continue;
    const candidate = cellAt(box, turned(offset, side));
    if (isFree(state, candidate)) return candidate;
  }
  return preferred;
}

/** Where the man unloading the pallet stands: in front of it on the hall side, the cell east of
 *  its first row, facing the pallet; or, when that is taken, the cell between the pallet and the
 *  office, facing south. Never outside (PIOTR, 16.09; CLAUDE.md T16 2.1). */
export function palletCell(state: GameState): Cell {
  const first = { x: GATE_LAYOUT.x + GATE_LAYOUT.width, y: GATE_LAYOUT.y + 1 };
  if (isFree(state, first)) return first;
  return { x: GATE_LAYOUT.x + 1, y: GATE_LAYOUT.y - 1 };
}

/** The four ways a figure can face on the sheets. */
export type Facing = 'sw' | 'se' | 'nw' | 'ne';

/** Which way a man at this cell faces to look at this point of the floor: the screen vector from
 *  his feet to it, in the hall's own axes (world +x runs down-right on the screen, world +y runs
 *  down-left; docs/art/SPRITES.md 1), so a man at a front cell has his back to the camera and a
 *  man at an end looks along the machine for free (CLAUDE.md T16 2.1). Same arithmetic as
 *  facingFromScreen in src/render/characters.ts, without the renderer. */
export function facingTowards(from: { x: number; y: number }, to: { x: number; y: number }): Facing {
  const wx = to.x - from.x;
  const wy = to.y - from.y;
  const dx = wx - wy;
  const dy = wx + wy;
  if (dy >= 0) return dx >= 0 ? 'se' : 'sw';
  return dx >= 0 ? 'ne' : 'nw';
}

/** Which way a man at this cell faces to use this item: the centre of its footprint. */
export function facingAt(cell: Cell, item: Equipment): Facing {
  const box = standsOn(item);
  return facingTowards(
    { x: cell.x + 0.5, y: cell.y + 0.5 },
    { x: box.x + box.width / 2, y: box.y + box.depth / 2 },
  );
}

/** The pallet is a one cell box like any item: he faces its centre. */
export function facingAtPallet(cell: Cell): Facing {
  return facingTowards(
    { x: cell.x + 0.5, y: cell.y + 0.5 },
    { x: PALLET_LAYOUT.x + PALLET_LAYOUT.width / 2, y: PALLET_LAYOUT.y + PALLET_LAYOUT.depth / 2 },
  );
}
