// Where a figure is standing. The engine decides, the renderer only draws it (CLAUDE.md T2 3.3).
//
// A station is a string so the state stays plain JSON: 'bench', 'machine:<specId>', 'rack',
// 'gate', 'office' or 'idle'.

import {
  GATE_LAYOUT,
  PALLET_LAYOUT,
  SHEETS_PER_TRIP,
  WELFARE_IN_THE_CANTEEN,
  roomDoorCell,
} from './constants';
import { isSold, itemStandsInTheHall } from './machines';
import type { Cell } from './pipes';
import type { Equipment, GameState, TaskInstance } from './types';
import { covers, footprintCells, isFree } from './walk';

export const STATION_BENCH = 'bench';
export const STATION_RACK = 'rack';
export const STATION_GATE = 'gate';
export const STATION_OFFICE = 'office';
/** At the desk with the phone in his hand. The same cell as the office: what it says is which
 *  sheet the figure plays (PIOTR, 15.09; CLAUDE.md T11 3.11). */
export const STATION_PHONE = 'phone';
export const STATION_IDLE = 'idle';
/** Sweeping the floor. It is its own station and not the bench, because a man with a broom is not
 *  a man at a bench: the renderer plays the sweep sheet at it (CLAUDE.md T20 2.8). Where he stands
 *  is unchanged, his own home cell, which is what the bench station fell through to. */
export const STATION_CLEANING = 'cleaning';
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

/** The second man of a job, at the second place of the very item the first man is standing at:
 *  two men on one bench, the first in front of it and the second behind it (CLAUDE.md T16 2.1,
 *  T17 2.10). This one names the item and not the family, because it is that bench and no other. */
export function secondStation(equipmentId: string): string {
  return `second:${equipmentId}`;
}

/** The item a man is standing at as the second of two, or null when he is not. */
export function stationSecondAt(station: string): string | null {
  return station.startsWith('second:') ? station.slice('second:'.length) : null;
}

/** A place at an item beyond the two the station table draws by name. Place 0 is the operator's
 *  cell and place 1 is the waiting cell at a machine, or the second place at a bench; from place
 *  2 the men stand on along the same side, one cell further out each time, so twenty on one job
 *  do not stack on one tile (PIOTR, 17.09; CLAUDE.md T19 2.5). The string names the item and not
 *  the family, because it is that bench and that saw and no other. The renderer resolves the
 *  string through `benchCellsAt` and `queueCellsAt` below. */
export function placeStation(equipmentId: string, place: number): string {
  return `place:${equipmentId}:${place}`;
}

/** The item and the place a station names, or null when it is not a place station. */
export function stationPlaceAt(station: string): { id: string; place: number } | null {
  if (!station.startsWith('place:')) return null;
  const rest = station.slice('place:'.length);
  const cut = rest.lastIndexOf(':');
  if (cut <= 0) return null;
  const place = Number(rest.slice(cut + 1));
  if (!Number.isFinite(place) || place < 0) return null;
  return { id: rest.slice(0, cut), place };
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
      return STATION_CLEANING;
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
//
// `out` moves a cell a further cell away from the body (CLAUDE.md T19 2.4, PIOTR: "he stands on
// the bench, not at it"). Every delivered sprite was measured against its own footprint for this
// turn and not one of them is drawn bigger than the canvas the contract gives it, and the alpha
// at the foot point of every operator, waiting and second cell is zero: nobody's feet are inside
// a drawn body. What the measurement did show is the other half of the same complaint, that the
// cells at the RIGHT and the MIDDLE of a front edge put the man exactly where the body leans on
// this 2:1 dimetric, so half to four fifths of him is painted over the machine and he reads as
// standing on it. Those cells are the ones that carry `out: 1`, each with its figure in the
// report's table; the cells at the left of a front edge (the bench's own operator cell, 18.9% of
// him over his bench) and the back cells (9.4%) are left where they are, because a man leaning
// over his own bench is what a joiner looks like and a metre further out reads as a man who has
// stepped away from it.
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
    // One cell out from the front: at the table itself 62.1% of the man was painted over the saw
    // (60.3% industrial, 64.2% pro), and a cell further out is 16.8% (CLAUDE.md T19 2.4).
    operator: { side: 'front', along: 'right', out: 1 },
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
    // And one cell out from it: 68.8% of the man over the bander at the machine, 7.3% a cell out.
    operator: { side: 'front', along: 1, out: 1 },
    waiting: { side: 'front', along: 0 },
    second: null,
  },
  cnc: {
    // No picture has been delivered for a CNC, so this row is by the saw's geometry and not by a
    // measurement: the right hand end of a front edge is where the body leans.
    operator: { side: 'front', along: 'right', out: 1 },
    waiting: { side: 'front', along: 'middle' },
    second: { side: 'back', along: 'middle' },
  },
  sprayBooth: {
    // The same, and it is the cell 2.6 puts the sprayer on.
    operator: { side: 'front', along: 'middle', out: 1 },
    waiting: { side: 'front', along: 0 },
    second: null,
  },
  workbench: {
    // The bench's own two places stay where they are: 18.9% of the man over his bench in front of
    // it and 9.4% behind it, which is a joiner leaning over his work. The waiting cell at the
    // right hand end was 59.3% and is 11.2% a cell out.
    operator: { side: 'front', along: 0 },
    waiting: { side: 'front', along: 'right', out: 1 },
    second: { side: 'back', along: 'right' },
  },
  sheetRack: { operator: 'freeSide', waiting: null, second: null },
  extractor: { operator: 'freeSide', waiting: null, second: null },
};

/** Anything not in the table: the front side, the left cell, as every item was placed before. The
 *  waiting cell is a cell out, because the second cell along a small item's front edge is the one
 *  the body leans over (a compressor hid 50 to 70% of the man, and 3.7% a cell out). */
const DEFAULT_ROW: StationRow = {
  operator: { side: 'front', along: 0 },
  waiting: { side: 'front', along: 1, out: 1 },
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
  // A seat and a locker are inside the canteen: a man at one of them stands in the doorway and is
  // not drawn through the wall (PIOTR, 17.09; CLAUDE.md T17 2.2).
  if (WELFARE_IN_THE_CANTEEN.includes(item.specId)) return roomDoorCell('canteen');
  const row = stationRow(item.specId);
  const box = standsOn(item);
  let offset: StationOffset;
  if (row.operator === 'freeSide') {
    const side = freeSideOf(state, item);
    // Half way along the free side and a cell out from it, the way a man stands at a rack to
    // reach it: hard against a standard rack 52.2% of him was painted over it and a cell out is
    // 2.4%, and a rack is the tallest thing in the hall (CLAUDE.md T19 2.4).
    offset = { side, along: 'middle', out: 1 };
    if (role === 'waiting') offset = { side, along: 'middle', out: 2 };
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

/** The item whose own footprint holds this cell, or null: what a man is standing on, if anything.
 *  The engine keeps a cell for every joiner, and for a joiner that cell is his bench's own anchor
 *  cell, which is a cell the bench stands on. Asking this question turns "his place" into "the
 *  item his place belongs to", and the caller then asks the station table where to put him
 *  (PIOTR, 17.09: "he stands on the bench, not at it"; CLAUDE.md T19 2.4). */
export function itemAtCell(state: GameState, cell: Cell): Equipment | null {
  return (
    state.equipment.find(
      (item) =>
        !isSold(item) && itemStandsInTheHall(item) && covers(footprintCells(item), cell),
    ) ?? null
  );
}

function sameCell(left: Cell, right: Cell): boolean {
  return left.x === right.x && left.y === right.y;
}

/** The side a queue of men lines up along at this item: the table's own side, or the free side of
 *  a rack or a fan. */
function queueSide(state: GameState, item: Equipment): Side {
  const row = stationRow(item.specId);
  return row.operator === 'freeSide' ? freeSideOf(state, item) : row.operator.side;
}

/** Fills a list of standing cells up to `count` from the cells along one side of an item, a row at
 *  a time outwards, taking only cells that are free and not already in the list. The list is never
 *  shorter than `count`: when the hall has nothing else left the last cell is repeated, because a
 *  man has to be drawn somewhere and two men in one place is better than a man with none. */
function fillAlong(
  state: GameState,
  item: Equipment,
  side: Side,
  cells: Cell[],
  count: number,
): Cell[] {
  const box = standsOn(item);
  const extent = side === 'front' || side === 'back' ? box.width : box.depth;
  for (let out = 0; cells.length < count && out < extent + count + 2; out += 1) {
    for (let along = 0; along < extent && cells.length < count; along += 1) {
      const cell = cellAt(box, { side, along, out });
      if (!isFree(state, cell)) continue;
      if (cells.some((taken) => sameCell(taken, cell))) continue;
      cells.push(cell);
    }
  }
  const last = cells[cells.length - 1];
  while (cells.length < count && last !== undefined) cells.push({ ...last });
  return cells;
}

/** Cells for a queue of men at an item: the first is the operator's cell, then the waiting cell,
 *  then the next free cells along the same side, one out at a time. Never fewer than `count`
 *  cells; a cell is repeated only when the hall leaves nothing else (CLAUDE.md T19 2.5). */
export function queueCellsAt(state: GameState, item: Equipment, count: number): Cell[] {
  if (count <= 0) return [];
  const cells: Cell[] = [standingCell(state, item, 'operator')];
  if (cells.length < count) {
    const waiting = standingCell(state, item, 'waiting');
    if (!cells.some((taken) => sameCell(taken, waiting))) cells.push(waiting);
  }
  return fillAlong(state, item, queueSide(state, item), cells, count);
}

/** The same for a bench: the operator's cell, the second place, then the next free cells along
 *  the front (CLAUDE.md T19 2.5). */
export function benchCellsAt(state: GameState, item: Equipment, count: number): Cell[] {
  if (count <= 0) return [];
  const cells: Cell[] = [standingCell(state, item, 'operator')];
  if (cells.length < count) {
    const second = standingCell(state, item, 'second');
    if (!cells.some((taken) => sameCell(taken, second))) cells.push(second);
  }
  // The rest are along the front, which is the side the bench is worked from and the side the
  // player sees: the second place is behind it and is the only man drawn at the back.
  return fillAlong(state, item, 'front', cells, count);
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
