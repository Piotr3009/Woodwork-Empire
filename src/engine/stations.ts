// Where a figure is standing. The engine decides, the renderer only draws it (CLAUDE.md T2 3.3).
//
// A station is a string so the state stays plain JSON: 'bench', 'machine:<specId>', 'rack',
// 'gate', 'office' or 'idle'.

import {
  GATE_LAYOUT,
  PALLET_LAYOUT,
  SHEETS_PER_TRIP,
  WELFARE_IN_THE_CANTEEN,
  type RoomId,
  roomDoorCell,
} from './constants';
import { isBreak } from './clock';
import { OWNER, isSold, itemStandsInTheHall, sheetCapacityOf, sheetsStrandedBySale } from './machines';
import { plural } from './text';
import type { Cell } from './pipes';
import type { Equipment, GameState, TaskInstance } from './types';
import { covers, footprintCells, isFree, isWalkable } from './walk';

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
/** Standing at his home cell and not working: the hall has no place for him at the machine his
 *  work wants, or the hall or the rack has stopped his job. The cell is the one the bench station
 *  falls through to, his own bench's; what the station says is that he is standing there and not
 *  at work, so his figure stands still under its red mark (CLAUDE.md T22 2.5, T25 2.3). */
export const STATION_HOME = 'home';
/** Standing at the canteen door: a joiner with no bench of his own in a hall with work waiting
 *  (CLAUDE.md T4 3.4), and a man on a standing contract that has no sheets for him
 *  (CLAUDE.md T24 2.3). Named for where he stands and not for a bench, because a bench is a
 *  family with places from v52 like any other (CLAUDE.md T25 2.2). */
export const STATION_DOOR = 'door';
/** In the canteen for the dinner hour, and off the hall while it lasts (PIOTR, 19.09;
 *  CLAUDE.md T21 2.12). It is its own station and not the idle one the day loop writes for the
 *  hour, because those two men are not the same man: one is behind the canteen door eating and the
 *  other is standing about in front of it where the player is meant to see him and the red bubble
 *  over his head (CLAUDE.md T4 3.4, T21 2.6). `stationNow` below is where the hour is read. */
export const STATION_LUNCH = 'lunch';

export function machineStation(specId: string): string {
  return `machine:${specId}`;
}

/** The machine a station names, or null when it is not a machine station. */
export function stationMachine(station: string): string | null {
  return station.startsWith('machine:') ? station.slice('machine:'.length) : null;
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

/** The two rooms a man walks into and is off the hall's drawing while he is in: the office he does
 *  his desk work in and the canteen he takes his dinner in (PIOTR, 18.09 and 19.09; CLAUDE.md T20
 *  2.12, T21 2.11, 2.12). The WC is not one of them, because nothing in this game ever sends a man
 *  to it.
 *
 *  Turn 20 had the office alone, and its comment gave the reason: the canteen's door cell is also
 *  where a man with nothing to do, or with no bench to work at, stands about (CLAUDE.md T4 3.4,
 *  T11 3.4), nothing behind that door is drawn, and a man sent through it would have been nowhere at
 *  all, with the player losing sight of his crew. Turn 21 answers that rather than ignoring it: the
 *  bubble at the door is what keeps the player informed (CLAUDE.md T21 2.6, the dashed grey tone),
 *  and the standing man is told apart from the eating one by his station and not by his cell, which
 *  is `isBehindTheDoor` below. */
const DOORWAY_ROOMS: readonly RoomId[] = ['office', 'canteen'];

function isTheCell(cell: { x: number; y: number }, at: { x: number; y: number }): boolean {
  return at.x === Math.round(cell.x) && at.y === Math.round(cell.y);
}

/** The room whose doorway this cell is, or null for every other cell of the hall. */
export function roomAtDoorway(cell: { x: number; y: number }): RoomId | null {
  return DOORWAY_ROOMS.find((room) => isTheCell(cell, roomDoorCell(room))) ?? null;
}

/** True while this cell is a doorway at all (PIOTR, 18.09; CLAUDE.md T20 2.12, T21 2.12). The cell
 *  alone does not put a man through it, because one of the two doorways is where the hall parks a man
 *  it has nothing for; the station is the other half of the question. */
export function isDoorwayCell(cell: { x: number; y: number }): boolean {
  return roomAtDoorway(cell) !== null;
}

/** The room a man at this station is inside, behind its door, or null while he is out on the hall
 *  (CLAUDE.md T21 2.6, 2.11, 2.12). Desk work is in the office, the phone with it, and the dinner
 *  hour is in the canteen. Everything else, the idle station and the benchless one included, is the
 *  hall, however close to a door it stands: the bubble over a man who has gone somewhere is drawn at
 *  the door he went through, and this says which door that is. */
export function roomBehindStation(station: string): RoomId | null {
  if (station === STATION_OFFICE || station === STATION_PHONE) return 'office';
  if (station === STATION_LUNCH) return 'canteen';
  return null;
}

/** True while a man at this station, standing on this cell, has gone through a door and is off the
 *  hall's drawing: the station says which room he went into and the cell says his feet are in that
 *  room's doorway (PIOTR, 18.09 and 19.09; CLAUDE.md T20 2.12, T21 2.11, 2.12).
 *
 *  Both halves matter, and the canteen is why: an idle man and a man at his dinner stand on the very
 *  same cell, and only one of them is in the room. The walk is seen either way, because the cell is
 *  only reached at the end of it. */
export function isBehindTheDoor(station: string, cell: { x: number; y: number }): boolean {
  const room = roomBehindStation(station);
  return room !== null && roomAtDoorway(cell) === room;
}

/** The station this man is at for the drawing, and for the bubble over his head: the one the day
 *  loop wrote, or the canteen while the dinner hour lasts (PIOTR, 19.09; CLAUDE.md T21 2.12).
 *
 *  At the break the day loop puts the whole workshop on `STATION_IDLE` (`updateStations`), which is
 *  the same string it writes for a man it has no work for, so the hour has to be read somewhere to
 *  tell an eating man from a standing one. It is read here, in the one module that says where a
 *  figure is, and not in the renderer: the engine decides and the renderer draws (CLAUDE.md T2 3.3).
 *  A man who works through the break does not go: for the owner that is `breakSkipped`, and nobody
 *  else in the game may skip it. */
export function stationNow(state: GameState, who: string): string {
  const man = who === OWNER ? state.owner : state.workers.find((worker) => worker.id === who);
  const station = man?.station ?? STATION_IDLE;
  if (!isBreak(state.clock.minute)) return station;
  if (who === OWNER && state.owner.breakSkipped) return station;
  if (station !== STATION_IDLE && station !== STATION_DOOR) return station;
  return STATION_LUNCH;
}

/** True while anybody is standing at the rack this minute, the owner or a man on his feet: a
 *  rack is not sold out from under the man loading it (PIOTR, 18.09; CLAUDE.md T20 2.10). The
 *  rack has no places, so the question `canSell` asks of a machine, who is at its places, answers
 *  nothing about it and this is the question instead. */
export function somebodyAtTheRack(state: GameState): boolean {
  if (state.owner.station === STATION_RACK) return true;
  return state.workers.some((worker) => worker.station === STATION_RACK);
}

/** Why a rack cannot be sold yet, or an empty string. The one sentence: the button on the Owned
 *  tab prints it and the engine's own refusal reads it (CLAUDE.md T20 2.10). Anything that holds
 *  no sheets, a tool cabinet or a machine, is nothing to do with it. */
export function storageSaleBlock(state: GameState, item: Equipment): string {
  if (sheetCapacityOf(item) <= 0) return '';
  const stranded = sheetsStrandedBySale(state, item);
  if (stranded > 0) return `Empty it first, ${plural(stranded, 'sheet', 'sheets')} on it`;
  if (somebodyAtTheRack(state)) return 'Somebody is standing at it';
  return '';
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
// at the foot point of every operator and second cell is zero: nobody's feet are inside
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
export type StationRole = 'operator' | 'second';

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
  /** The second place, where the family puts its second man somewhere else than along the
   *  operator's own side; null lets the places run on along that side (CLAUDE.md T25 2.6). */
  second: StationOffset | null;
}

/** The station table, one row per family (CLAUDE.md T16 2.1). */
export const STATION_TABLE: Record<string, StationRow> = {
  tableSaw: {
    // One cell out from the front: at the table itself 62.1% of the man was painted over the saw
    // (60.3% industrial, 64.2% pro), and a cell further out is 16.8% (CLAUDE.md T19 2.4).
    operator: { side: 'front', along: 'right', out: 1 },
    second: null,
  },
  thicknesser: {
    operator: { side: 'left', along: 0 },
    second: null,
  },
  spindleMoulder: {
    operator: { side: 'front', along: 0 },
    second: null,
  },
  edgebander: {
    // The second cell from the infeed end, which is the left, read off the footprint's width so
    // the row needs no change when the footprint grows to 4 by 1 (CLAUDE.md T16 2.1, 6).
    // And one cell out from it: 68.8% of the man over the bander at the machine, 7.3% a cell out.
    operator: { side: 'front', along: 1, out: 1 },
    second: null,
  },
  cnc: {
    // No picture has been delivered for a CNC, so this row is by the saw's geometry and not by a
    // measurement: the right hand end of a front edge is where the body leans.
    operator: { side: 'front', along: 'right', out: 1 },
    second: { side: 'back', along: 'middle' },
  },
  sprayBooth: {
    // The same, and it is the cell the man at the booth stands on (CLAUDE.md T19 2.6).
    operator: { side: 'front', along: 'middle', out: 1 },
    second: null,
  },
  workbench: {
    // The bench's places are a row along its front, one to a column of its own footprint: the
    // operator at the first column, the second man at the second and the third at the third, an
    // industrial bench being three wide [REPORT-T23 0.12] (CLAUDE.md T24 2.5). The second place
    // was the back right cell until tonight, which on a two wide bench is a cell diagonally off
    // its top corner, and at the fit the second man read as standing past the end of the bench.
    // Every place after the first runs on along the front, which is what `placeCellsAt` does
    // with a row that names no second place.
    operator: { side: 'front', along: 0 },
    second: null,
  },
  sheetRack: { operator: 'freeSide', second: null },
  extractor: { operator: 'freeSide', second: null },
};

/** Anything not in the table: the front side, the left cell, as every item was placed before. */
const DEFAULT_ROW: StationRow = {
  operator: { side: 'front', along: 0 },
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
  // A locker is inside the canteen: a man at his stands in the doorway and is not drawn through
  // the wall (PIOTR, 17.09; CLAUDE.md T17 2.2, T23 2.11).
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
  } else {
    const wanted = role === 'operator' ? row.operator : row.second;
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

/** The side an item's places run along: the table's own side, or the free side of a rack or a
 *  fan. */
function queueSide(state: GameState, item: Equipment): Side {
  const row = stationRow(item.specId);
  return row.operator === 'freeSide' ? freeSideOf(state, item) : row.operator.side;
}

/** The key a cell is known by in a set of the cells taken this minute. */
export function cellKey(cell: Cell): string {
  return `${cell.x},${cell.y}`;
}

/** The side across a footprint from this one. */
const ACROSS: Record<Side, Side> = { front: 'back', back: 'front', left: 'right', right: 'left' };

/** The two ends of a footprint worked from this side: the sides across it the other way. */
const ENDS_OF: Record<Side, readonly Side[]> = {
  front: ['left', 'right'],
  back: ['left', 'right'],
  left: ['front', 'back'],
  right: ['front', 'back'],
};

/** The cells round a footprint one ring out at a time, from ring `first` (ring 0 touches it), in a
 *  fixed order: the side it is worked from first, then its two ends, then the far side, then the
 *  next ring (CLAUDE.md T26 2.2). The worked side and the far side carry the ring's corners. The
 *  rings run out as far as the unit is wide, which is further than any hall can need, or for
 *  `rings` of them when the caller wants so many and no more. */
export function ringCells(
  state: GameState,
  box: { x: number; y: number; width: number; depth: number },
  worked: Side,
  first = 0,
  rings = Number.POSITIVE_INFINITY,
): Cell[] {
  const cells: Cell[] = [];
  const reach = Math.min(Math.max(state.unit.widthCells, state.unit.depthCells), first + rings - 1);
  const extentOf = (side: Side): number => (side === 'front' || side === 'back' ? box.width : box.depth);
  for (let out = first; out <= reach; out += 1) {
    for (const side of [worked, ...ENDS_OF[worked], ACROSS[worked]]) {
      // The corners go with the worked side and the far side, so the ends run the footprint's own
      // length and no corner is listed twice.
      const corners = side === worked || side === ACROSS[worked] ? out + 1 : 0;
      for (let along = -corners; along < extentOf(side) + corners; along += 1) {
        cells.push(cellAt(box, { side, along, out }));
      }
    }
  }
  return cells;
}

/** The first `count` cells of `anchors`, in their order, that a man can stand on (no footprint, no
 *  machine's picture, no room, the unit's own floor; T26 2.3) and that no other figure has taken
 *  this minute; each one taken goes
 *  into `taken`, so the next man asked passes it over. When the anchors run out the cells round the
 *  first of them are taken a ring at a time. A cell is never handed out twice: two figures on one
 *  cell is the thing this is for [PIOTR, 02.10] (CLAUDE.md T26 2.2). The places at a machine, the
 *  canteen door's queue, the men at the gate and the home cells all come through here. */
export function standingCellsFor(
  state: GameState,
  anchors: readonly Cell[],
  count: number,
  taken: Set<string>,
  /** False for a caller that goes on to its own next cells when these run out (`placeCellsAt`). */
  spread = true,
): Cell[] {
  const found: Cell[] = [];
  const take = (cell: Cell): void => {
    if (found.length >= count) return;
    const key = cellKey(cell);
    if (taken.has(key) || !isWalkable(state, cell)) return;
    taken.add(key);
    found.push({ x: cell.x, y: cell.y });
  };
  for (const cell of anchors) take(cell);
  const centre = anchors[0];
  if (spread && centre !== undefined && found.length < count) {
    for (const cell of ringCells(state, { x: centre.x, y: centre.y, width: 1, depth: 1 }, 'front')) {
      if (found.length >= count) break;
      take(cell);
    }
  }
  return found;
}

/** The four ways a man steps off a cell. */
const STEPS: readonly Cell[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

/** The floor a man reaches from these cells a step at a time, nearest first and never through a
 *  footprint or across a machine's picture, as many as `limit` of them: where the men who do not
 *  fit beside a machine stand, in the next row on its own side of whatever else is on the floor.
 *  The rings of Turn 26 were drawn round the footprint with a compass, so the fourth man at a CNC
 *  with a dust collector at its end stood on the far side of the collector, by the canteen door
 *  [PIOTR, 02.10] (v65). The seeds themselves are not listed. */
export function floorFrom(state: GameState, seeds: readonly Cell[], limit: number): Cell[] {
  const seen = new Set<string>();
  const queue: Cell[] = [];
  for (const seed of seeds) {
    const key = cellKey(seed);
    if (seen.has(key)) continue;
    seen.add(key);
    if (isWalkable(state, seed)) queue.push(seed);
  }
  const found: Cell[] = [];
  for (let head = 0; head < queue.length && found.length < limit; head += 1) {
    const cell = queue[head] as Cell;
    for (const step of STEPS) {
      const next = { x: cell.x + step.x, y: cell.y + step.y };
      const key = cellKey(next);
      if (seen.has(key)) continue;
      seen.add(key);
      if (!isWalkable(state, next)) continue;
      queue.push(next);
      found.push(next);
      if (found.length >= limit) return found;
    }
  }
  return found;
}

/** The cells of an item's places, the first `count` of them: the operator's cell, the second
 *  place where the family's row names one, the side it is worked from at the operator's distance,
 *  then the rest of the ring round its footprint at that distance, the worked side first, then the
 *  ends, then the far side (CLAUDE.md T26 2.2). When more men are at it than stand beside it, the
 *  rest stand on the floor reached from those cells a step at a time (`floorFrom`; v65), and only
 *  a machine with no floor beside it at all falls back on the rings further out. A bench's places
 *  are a row along its front, one to a column of its own footprint (T24 2.5), and a machine's run
 *  along the side its operator stands on; it is one list for every family, benches included
 *  (CLAUDE.md T19 2.5, T25 2.6). A cell is never repeated, and none another figure has taken this
 *  minute (`taken`) is handed out: the list is shorter than `count` only in a hall with no floor
 *  left at all. */
export function placeCellsAt(
  state: GameState,
  item: Equipment,
  count: number,
  taken: Set<string> = new Set<string>(),
): Cell[] {
  if (count <= 0) return [];
  const row = stationRow(item.specId);
  const box = standsOn(item);
  const side = queueSide(state, item);
  const anchors: Cell[] = [standingCell(state, item, 'operator')];
  if (row.second !== null) anchors.push(standingCell(state, item, 'second'));
  // The operator's distance out: a cell out from a saw's table, hard against a bench's front, and a
  // cell out from a rack's or a fan's free side (CLAUDE.md T19 2.4).
  const out = row.operator === 'freeSide' ? 1 : (row.operator.out ?? 0);
  const extent = side === 'front' || side === 'back' ? box.width : box.depth;
  for (let along = 0; along < extent; along += 1) anchors.push(cellAt(box, { side, along, out }));
  anchors.push(...ringCells(state, box, side, out, 1));
  const cells = standingCellsFor(state, anchors, count, taken, false);
  if (cells.length >= count) return cells;
  // More men than stand beside it: the next rows, reached from beside it. Enough of them to pass
  // over every cell another figure has this minute.
  const further = floorFrom(state, anchors, count + taken.size + 8);
  cells.push(...standingCellsFor(state, further, count - cells.length, taken, false));
  if (cells.length >= count) return cells;
  cells.push(...standingCellsFor(state, ringCells(state, box, side, out + 1), count - cells.length, taken, false));
  return cells;
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
