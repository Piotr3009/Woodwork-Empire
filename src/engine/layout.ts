// Where things stand on the hall floor. Pure geometry over the state, so the setup view can ask
// before it drops and the catalogue can ask before it buys (CLAUDE.md T2 3.10).

import {
  CANTEEN_LOCKERS,
  CANTEEN_LOCKERS_DEEP,
  CANTEEN_LOCKERS_PER_LONG_EXTENSION,
  CANTEEN_LOCKERS_WIDE,
  FORKLIFT_LANE_CELLS,
  GATE_LANE,
  LINE_BEHIND_CELLS,
  LINE_FRONT_CELLS,
  LINE_KINDS,
  LINE_PALLET_LAYOUT,
  LOCKER_SLOT_LAYOUT,
  LOCKER_SLOT_LAYOUT_WIDE,
  M2_PER_PERSON,
  WELFARE_IN_THE_CANTEEN,
  REAR_YARD_GAP_CELLS,
  REAR_YARD_ROWS,
  REAR_YARD_ROW_CELLS,
  STARTING_LAYOUT,
  UNIT_AREA_M2,
  UNIT_SECOND_EXTENSION_M2,
  WINDOW_LINE_ORIGIN,
  YARD_WIDTH_CELLS,
  lineModulesOf,
  roomsOf,
  secondExtensionOf,
} from './constants';
import type { LayoutSlot } from './constants';
import {
  findSpec,
  isLineModule,
  isSold,
  itemStandsInTheHall,
  lineKindOf,
  lineModuleIndex,
  lineNumbers,
  lineOf,
  moduleKind,
  standsInTheHall,
  zoneOf,
} from './machines';
import { reservedItems } from './orders';
import { pinned } from './pinned';
import { standsOutsideTheHall } from './walk';
import type { Equipment, GameState, LineKind, OnOrderItem, Orientation } from './types';

export interface PlaceCheck {
  ok: boolean;
  reason: string;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  depth: number;
}

const OK: PlaceCheck = { ok: true, reason: '' };

function overlaps(left: Box, right: Box): boolean {
  return (
    left.x < right.x + right.width &&
    right.x < left.x + left.width &&
    left.y < right.y + right.depth &&
    right.y < left.y + left.depth
  );
}

/** The cells inside the shutter that nothing may stand on. Fixed geometry of the painted hall,
 *  not worked out from the unit any more (docs/art/SPRITES.md 9.3). */
export function gateLane(): Box {
  return { x: GATE_LANE.x, y: GATE_LANE.y, width: GATE_LANE.width, depth: GATE_LANE.depth };
}

/** Everything standing on the hall floor: what a move can bump into. The office furniture lives
 *  in the office view and the van stands in the yard, so neither is in the way. */
export function hallItems(state: GameState): Equipment[] {
  return state.equipment.filter((item) => {
    const spec = findSpec(item.specId);
    if (!spec || spec.category === 'furniture') return false;
    // A locker stands inside the canteen, so it takes no hall cell at all: nothing may bump into
    // it and it eats none of the floor the crew is limited by. The seat that stood beside it went
    // with Turn 23, which gave the canteen a table and two stools of its own
    // (PIOTR, 17.09 and 20.09; CLAUDE.md T17 2.2, T23 2.11).
    if (WELFARE_IN_THE_CANTEEN.includes(item.specId)) return false;
    if (!itemStandsInTheHall(item)) return false;
    return !standsOutsideTheHall(state, item);
  });
}

/** The floor a thing of this class takes up where it is put: its working zone, which is what
 *  nothing else may stand on (CLAUDE.md T7 3.3). */
export function boxOf(
  specId: string,
  x: number,
  y: number,
  variantId?: string,
  orientation: Orientation = 0,
): Box {
  const zone = zoneOf(specId, variantId, orientation);
  return { x, y, width: zone.width, depth: zone.depth };
}

/** The floor something already in the hall takes up, turned the way it stands (T10 3.8). */
function boxOfItem(
  item: { specId: string; variantId: string; orientation: Orientation },
  x: number,
  y: number,
): Box {
  return boxOf(item.specId, x, y, item.variantId, item.orientation);
}

/** True for the kit that stands outside and not on the hall floor: the two central systems, the
 *  pelletiser, the timber shelter and the van (`STARTING_LAYOUT`). */
export function standsOutside(specId: string): boolean {
  return STARTING_LAYOUT[specId]?.yard === true;
}

/** True for the kit that stands outside behind the rear wall: the two central systems, from v83
 *  the pelletiser beside them, and from v92 the timber shelter. On the apron at the end of the hall
 *  they stood in front of the benches and hid them, and behind the wall they hide nothing (PIOTR,
 *  03.10, 05.10 and 11.10; v73, CLAUDE.md T28 2.1, T31 2.8). The van stays on the apron alone. */
export function standsBehindTheWall(specId: string): boolean {
  return STARTING_LAYOUT[specId]?.rear === true;
}

/** Where the next thing of this kind stands outside, or null when there is no room for it: behind
 *  the rear wall for the plant, on the apron for the van. */
export function outsidePlaceFor(
  state: GameState,
  specId: string,
  variantId?: string,
  ignoreId: string | null = null,
): { x: number; y: number } | null {
  return standsBehindTheWall(specId)
    ? rearYardPlaceFor(state, specId, variantId, ignoreId)
    : apronPlaceFor(state, specId, variantId, ignoreId);
}

/** The row behind the rear wall a thing whose front edge is at this y stands in: 0 for the first
 *  row, a metre back from the wall, then 1 and 2, each a row and a metre further back (v101). */
export function rearRowOf(front: number): number {
  return Math.max(0, Math.round((-REAR_YARD_GAP_CELLS - front) / (REAR_YARD_ROW_CELLS + REAR_YARD_GAP_CELLS)));
}

/** Where the next plant stands behind the rear wall, or null when the wall has no length left for
 *  it: a metre back from the hall's first row, which is the wall's own, the first of them near
 *  the far end of the hall and each one after it a metre nearer the gate. The far end is left
 *  clear by the plant's own width and depth, so that nothing of it is seen past the end of the
 *  wall. What is on its way holds its place like what has landed (v73). When the first row has no
 *  length left, the second row behind it, and then the third, each its front a metre behind the
 *  row before; a row behind the first stands no nearer the gate end than it stands back from the
 *  wall, so that it is never off the top of the picture (PIOTR, 17.10; v101). */
export function rearYardPlaceFor(
  state: GameState,
  specId: string,
  variantId?: string,
  ignoreId: string | null = null,
): { x: number; y: number } | null {
  const taken: Box[] = [];
  for (const item of state.equipment) {
    if (item.id === ignoreId || item.anchorY >= 0) continue;
    taken.push(boxOfItem(item, item.anchorX, item.anchorY));
  }
  for (const held of state.onOrder) {
    if (held.id === ignoreId || held.anchorY >= 0) continue;
    taken.push(boxOfItem(held, held.anchorX, held.anchorY));
  }
  return yardPlaceAmong(state.unit.widthCells, taken, specId, variantId);
}

/** The floor a thing in the yard takes where it is put: its footprint turned the way it stands. */
export function yardBoxOf(thing: { specId: string; variantId: string; orientation: Orientation }, x: number, y: number): Box {
  return boxOfItem(thing, x, y);
}

/** The yard's own rule, with what already stands there given: the first clear length of the first
 *  row that has one, from the far end of a wall this long, as `rearYardPlaceFor` reads it; the
 *  yard laid out whole asks it a thing at a time (v111). */
export function yardPlaceAmong(
  widthCells: number,
  taken: readonly Box[],
  specId: string,
  variantId?: string,
): { x: number; y: number } | null {
  const own = boxOf(specId, 0, 0, variantId);
  for (let row = 0; row < REAR_YARD_ROWS; row += 1) {
    const y = -REAR_YARD_GAP_CELLS - row * (REAR_YARD_ROW_CELLS + REAR_YARD_GAP_CELLS) - own.depth;
    // A metre is kept between two of them: a box a metre longer than the plant has to be clear.
    const clear = (x: number): boolean =>
      x >= 0 &&
      !taken.some((other) =>
        overlaps({ x: x - REAR_YARD_GAP_CELLS, y, width: own.width + 2 * REAR_YARD_GAP_CELLS, depth: own.depth }, other),
      );
    // The far end left clear by the plant's own width and how far back it stands; the first row's
    // is its depth and a metre, as it always was.
    const first = widthCells - own.width + y;
    const last = row === 0 ? 0 : -y;
    for (let x = first; x >= last; x -= 1) {
      if (clear(x)) return { x, y };
    }
  }
  return null;
}

/** Where the next thing of this kind stands on the apron, or null when the apron has no room for
 *  it: its own place when nothing is on it, and from there the nearest clear place up and down the
 *  apron, a length of itself at a time. Until v72 everything of one kind was given the one place,
 *  so a second flexi system stood on the first (PIOTR, 03.10); from v73 the plant is behind the
 *  rear wall and the apron is the van's. What is on its way holds its place like what has landed.
 *  `ignoreId` is the thing being stood again, which is not in its own way. */
export function apronPlaceFor(
  state: GameState,
  specId: string,
  variantId?: string,
  ignoreId: string | null = null,
): { x: number; y: number } | null {
  const slot = STARTING_LAYOUT[specId];
  if (slot === undefined || slot.yard !== true) return null;
  const kerb = state.unit.widthCells;
  const taken: Box[] = [];
  for (const item of state.equipment) {
    if (item.id === ignoreId || item.anchorX < kerb || findSpec(item.specId)?.category === 'furniture') continue;
    taken.push(boxOfItem(item, item.anchorX, item.anchorY));
  }
  for (const held of state.onOrder) {
    if (held.id === ignoreId || held.anchorX < kerb) continue;
    taken.push(boxOfItem(held, held.anchorX, held.anchorY));
  }
  const x = kerb + slot.x;
  const own = boxOf(specId, x, slot.y, variantId);
  const clear = (y: number): boolean => {
    if (y < 0 || y + own.depth > state.unit.depthCells) return false;
    if (x + own.width > kerb + YARD_WIDTH_CELLS) return false;
    const box = { ...own, y };
    return !taken.some((other) => overlaps(box, other));
  };
  if (clear(slot.y)) return { x, y: slot.y };
  for (let step = 1; step * own.depth <= state.unit.depthCells; step += 1) {
    for (const y of [slot.y + step * own.depth, slot.y - step * own.depth]) {
      if (clear(y)) return { x, y };
    }
  }
  // Anywhere at all, for a thing its neighbours are not a whole length of itself from.
  for (let y = 0; y + own.depth <= state.unit.depthCells; y += 1) {
    if (clear(y)) return { x, y };
  }
  return null;
}

/** Is this cell a cell of the floor at all: inside the hall or on the apron beside it, off every
 *  room and off the way to the gate? It asks nothing about what is standing there, because the
 *  pipe layer is above the hall and nothing collides with it: the one thing the inlet of an
 *  extractor needs is a cell in front of its mouth to come down in (CLAUDE.md T22 2.8). */
export function cellIsFloor(state: GameState, cell: { x: number; y: number }): boolean {
  const box = { x: cell.x, y: cell.y, width: 1, depth: 1 };
  if (cell.x < 0 || cell.y < 0) return false;
  // The apron beyond the front kerb counts: the two central systems stand on it, and a fan may be
  // pushed out there as well (CLAUDE.md T10 3.4).
  if (cell.x >= state.unit.widthCells + YARD_WIDTH_CELLS) return false;
  if (cell.y >= state.unit.depthCells) return false;
  if (overlaps(box, gateLane())) return false;
  return !roomsOf(state.unit).some((room) =>
    overlaps(box, { x: room.x, y: room.y, width: room.width, depth: room.depth }),
  );
}

/** Can a thing of this kind stand here? `ignoreItemId` is the item being moved, which never
 *  collides with itself. */
export function canPlaceSpec(
  state: GameState,
  specId: string,
  x: number,
  y: number,
  ignoreItemId: string | null,
  variantId?: string,
  orientation: Orientation = 0,
): PlaceCheck {
  const spec = findSpec(specId);
  if (!spec) return { ok: false, reason: 'Not in the catalogue' };
  if (!standsInTheHall(specId, variantId)) {
    return { ok: false, reason: 'It lives in a tool cabinet' };
  }
  const box = boxOf(specId, x, y, variantId, orientation);
  // The welfare kit lives inside the canteen and nowhere else: a man's locker belongs out of the
  // dust, and it takes no hall cell at all (PIOTR, 17.09; CLAUDE.md T17 2.2, T23 2.11).
  const ignore = new Set(ignoreItemId === null ? [] : [ignoreItemId]);
  const check = canPlaceBox(state, box, ignore, WELFARE_IN_THE_CANTEEN.includes(specId));
  if (!check.ok) return check;
  // Nothing but a line's modules stands on a line's ground, its lane, its engineers' metre and the
  // metre behind it, while the line stands or is on order. It is asked here and only here, so a
  // line's own ground never refuses the line's move (CLAUDE.md T31 2.6; v93).
  if (!isLineModule(specId)) {
    const taken = claimedGround(state).find((ground) => overlaps(box, ground.box));
    if (taken !== undefined) return { ok: false, reason: GROUND_REFUSALS[taken.kind] };
  }
  return OK;
}

/** What setup mode and every purchase's search say of a cell of the forklift's lane (CLAUDE.md T31
 *  2.6) [TUNE]. */
export const FORKLIFT_LANE_REFUSAL = 'That is the forklift\'s lane';

/** The kinds of ground a line claims beside its own 36 m by 3 m (v93): the forklift's lane, the
 *  metre in front where its engineers walk, and the metre behind it (PIOTR, 12.10); and the house
 *  factory's lane in place of a forklift's, where its houses drive out and wait (v114). */
export type GroundKind = 'lane' | 'drive' | 'path' | 'behind';

/** What setup mode and every purchase's search say of a cell of each kind [TUNE: the words]. */
export const GROUND_REFUSALS: Readonly<Record<GroundKind, string>> = {
  lane: FORKLIFT_LANE_REFUSAL,
  drive: 'That is the house factory\'s lane',
  path: 'That is the engineers\' path',
  behind: 'That is the metre behind the line',
};

/** True for a lane's ground, a forklift's or a house factory's: what two lines may share (v93;
 *  v114). */
function isLaneGround(kind: GroundKind): boolean {
  return kind === 'lane' || kind === 'drive';
}

/** One box of a line's ground, by its line and its kind. */
export interface GroundBox {
  line: number;
  kind: GroundKind;
  box: Box;
}

/** The ground a line of a kind claims with module 1 at this cell (PIOTR, 12.10: "1 metre for the
 *  engineers, 2 for the forklift, and add one more metre of free space"): the metre behind it,
 *  towards the rear wall, where nothing stands (none for a line at the rear wall); its modules end to
 *  end; the metre in front where its engineers walk; and its lane in front of that from x 0 to the
 *  line's end: the forklift's two metres, with the left strip up the left wall between the lane and
 *  the pallets at the gate, two metres wide [TUNE: chat: no strip round the line's end]; or the house
 *  factory's ten, with no strip, along the line alone, from its first station to its last, its houses
 *  waiting at the lane's gate side end [PIOTR, 19.10: "change only the condition that it has to be
 *  near the gate"; v118: until then from x 0 as a forklift's lane is, which kept a factory off every
 *  hall whose free floor did not touch the gate wall]. Seven metres in depth a window line, so two
 *  lines stand one behind the other in the 800 m2 hall, or side by side along a longer one; twenty
 *  two a house factory. Null where the lane cannot be: off the floor, or on the way to the gate
 *  (CLAUDE.md T31 2.6; v93). */
export function lineGround(
  state: GameState,
  at: { x: number; y: number },
  kind: LineKind,
): { behind: Box | null; line: Box; path: Box; front: Box; left: Box | null } | null {
  const depth = state.unit.depthCells;
  const spec = LINE_KINDS[kind];
  const line = lineBox(at, kind);
  const behind: Box | null =
    line.y >= LINE_BEHIND_CELLS ? { x: line.x, y: line.y - LINE_BEHIND_CELLS, width: line.width, depth: LINE_BEHIND_CELLS } : null;
  const path: Box = { x: line.x, y: line.y + line.depth, width: line.width, depth: LINE_FRONT_CELLS };
  const front: Box =
    spec.collection === 'lane'
      ? { x: line.x, y: path.y + path.depth, width: line.width, depth: spec.laneCells }
      : { x: 0, y: path.y + path.depth, width: line.x + line.width, depth: spec.laneCells };
  let left: Box | null = null;
  if (spec.collection === 'gate') {
    const pallets = LINE_PALLET_LAYOUT;
    const top = Math.min(pallets.y, front.y);
    const bottom = Math.max(pallets.y + pallets.depth, front.y + front.depth);
    left = { x: 0, y: top, width: FORKLIFT_LANE_CELLS, depth: bottom - top };
  }
  if (front.y + front.depth > depth || front.x + front.width > state.unit.widthCells || line.x < 0 || line.y < 0) return null;
  return { behind, line, path, front, left };
}

/** A line's lane as boxes: its front strip, and its left strip where it has one (v114). */
function stripsOf(ground: { front: Box; left: Box | null }): Box[] {
  return ground.left === null ? [ground.front] : [ground.front, ground.left];
}

/** Why a line standing at this cell has no lane: too near the front wall for its engineers' metre
 *  and the front strip; too near the rear wall, its lane on the way to the gate; or over the left
 *  strip, the lane crossing the line itself. Null when it has one (CLAUDE.md T31 2.6; v93). */
export function laneTrouble(
  state: GameState,
  at: { x: number; y: number },
  kind: LineKind,
): 'frontWall' | 'rearWall' | 'leftWall' | null {
  const ground = lineGround(state, at, kind);
  if (ground === null) return 'frontWall';
  const strips = stripsOf(ground);
  // The lane never crosses the way to the gate [TUNE].
  if (strips.some((strip) => overlaps(strip, gateLane()))) return 'rearWall';
  if (strips.some((strip) => overlaps(strip, ground.line) || overlaps(strip, ground.path))) return 'leftWall';
  return null;
}

/** The forklift's lane of a line of a kind whose module 1 is at this cell: its front strip and its
 *  left strip, or null where the line can have none, or has no forklift: the house factory, whose
 *  houses drive out on their own transporters (CLAUDE.md T31 2.6; v93; v114). */
export function forkliftLane(state: GameState, at: { x: number; y: number }, kind: LineKind): Box[] | null {
  const ground = lineGround(state, at, kind);
  if (ground === null || ground.left === null || laneTrouble(state, at, kind) !== null) return null;
  return [ground.front, ground.left];
}

/** True for an item the player can take hold of in setup mode: its own place is good, or the only
 *  thing wrong with it is a line's ground, kit that stood there before the line, or a line whose
 *  ground is blocked or cannot be, which is exactly what the strip tells him to move (CLAUDE.md T31
 *  2.6). */
export function canBeMoved(state: GameState, itemId: string): boolean {
  const item = state.equipment.find((entry) => entry.id === itemId);
  if (item === undefined) return false;
  const check = canPlace(state, itemId, item.anchorX, item.anchorY);
  const kind = moduleKind(item.specId);
  return (
    check.ok ||
    Object.values(GROUND_REFUSALS).includes(check.reason) ||
    (kind !== null && check.reason === lineNeedsRoom(kind)) ||
    check.reason === LINE_IN_THE_WAY
  );
}

/** Where module 1 of a line stands, not sold, or is held on order: the line's place, from which
 *  its ground is worked out. Null with no such line (CLAUDE.md T31 2.6; v93). */
export function linePlace(state: GameState, line: number): { x: number; y: number } | null {
  const at = linePlaces(state).get(line);
  return at === undefined ? null : { x: at.x, y: at.y };
}

/** Where module 1 of every line stands or is held on order, by line, the one standing first: one
 *  pass over the kit for every line, kept for as long as the state is pinned (v104). The hall's
 *  frame asked it of the kit once a line for each forklift and twice for each engineer, sixty
 *  times a second. */
function linePlaces(state: GameState): Map<number, { x: number; y: number }> {
  return pinned(state, 'linePlaces', () => {
    // Module 1 of a line of any kind (v107).
    const places = new Map<number, { x: number; y: number }>();
    for (const item of hallItems(state)) {
      if (lineModuleIndex(item.specId) !== 1 || isSold(item) || places.has(lineOf(item))) continue;
      places.set(lineOf(item), { x: item.anchorX, y: item.anchorY });
    }
    for (const item of reservedItems(state)) {
      if (lineModuleIndex(item.specId) !== 1 || places.has(lineOf(item))) continue;
      places.set(lineOf(item), { x: item.anchorX, y: item.anchorY });
    }
    return places;
  });
}

/** The lanes of every line that stands or is on order and has one, by line: for the hall's yellow
 *  lines and the forklifts (v93), and where a house factory's houses wait (v114); a house factory's
 *  lane has no left strip. */
export function lineLanes(state: GameState): { line: number; front: Box; left: Box | null }[] {
  const lanes: { line: number; front: Box; left: Box | null }[] = [];
  for (const line of lineNumbers(state)) {
    const at = linePlace(state, line);
    const kind = lineKindOf(state, line);
    const ground = at === null || laneTrouble(state, at, kind) !== null ? null : lineGround(state, at, kind);
    if (ground !== null) lanes.push({ line, front: ground.front, left: ground.left });
  }
  return lanes;
}

/** Every box of ground every line that stands or is on order claims beside its own modules, by
 *  line and kind: what refuses other kit, and what the strip names kit standing on (v93). The
 *  lines named by `except` are left out. */
export function claimedGround(state: GameState, except: ReadonlySet<number> = new Set()): GroundBox[] {
  // Every line's, kept for as long as the state is pinned: the strip asks it once a line (v104).
  if (except.size === 0) return pinned(state, 'claimedGround', () => groundOf(state, except));
  return groundOf(state, except);
}

function groundOf(state: GameState, except: ReadonlySet<number>): GroundBox[] {
  const boxes: GroundBox[] = [];
  for (const line of lineNumbers(state)) {
    if (except.has(line)) continue;
    const at = linePlace(state, line);
    const kind = lineKindOf(state, line);
    const ground = at === null || laneTrouble(state, at, kind) !== null ? null : lineGround(state, at, kind);
    if (ground === null) continue;
    // A house factory's lane is its own kind of ground, said in its own words (v114).
    const lane: GroundKind = LINE_KINDS[kind].collection === 'lane' ? 'drive' : 'lane';
    boxes.push({ line, kind: lane, box: ground.front });
    if (ground.left !== null) boxes.push({ line, kind: lane, box: ground.left });
    boxes.push({ line, kind: 'path', box: ground.path });
    if (ground.behind !== null) boxes.push({ line, kind: 'behind', box: ground.behind });
  }
  return boxes;
}

/** Can a line of a kind stand with module 1 at this cell: its modules, its engineers' metre, the
 *  metre behind it and its lane all clear as `canPlaceBox` asks, of everything standing or held for
 *  a delivery but what `ignore` names; and out of every other line's way: its own modules, its
 *  engineers' metre and the metre behind it off every other line's ground, and its lane off every
 *  other line's modules, metres and ground but the lanes, which two lines may share, a house
 *  factory's among them (v93; v114). The one question the order and the move ask (CLAUDE.md T31
 *  2.6). `line` is the line asking, left out of the others. */
export function lineFits(
  state: GameState,
  at: { x: number; y: number },
  kind: LineKind,
  ignore: ReadonlySet<string>,
  line: number | null = null,
  alsoLeftOut: ReadonlySet<number> = new Set(),
): boolean {
  const ground = lineGround(state, at, kind);
  if (ground === null || laneTrouble(state, at, kind) !== null) return false;
  const own = [ground.line, ground.path, ...(ground.behind === null ? [] : [ground.behind])];
  const strips = stripsOf(ground);
  for (const box of [...own, ...strips]) {
    if (!canPlaceBox(state, box, ignore).ok) return false;
  }
  const others = claimedGround(state, new Set([...(line === null ? [] : [line]), ...alsoLeftOut]));
  for (const other of others) {
    if (own.some((box) => overlaps(box, other.box))) return false;
    if (!isLaneGround(other.kind) && strips.some((strip) => overlaps(strip, other.box))) return false;
  }
  return true;
}

/** The nearest place along its own x, a row back or forward at a time and the nearer first, no
 *  further than `maxRows`, where a line can stand with its lane and its ground (`lineFits`), its own
 *  modules and outlines and those of the lines left out not counted: where a line that has no lane
 *  is put (v94). Null when no row that near takes it. */
export function nearestLanePlace(
  state: GameState,
  line: number,
  at: { x: number; y: number },
  leftOut: ReadonlySet<number> = new Set(),
  maxRows: number = state.unit.depthCells,
): { x: number; y: number } | null {
  const ignore = new Set<string>();
  for (const number of [line, ...leftOut]) {
    for (const id of [...lineGroup(state, false, number), ...lineGroup(state, true, number)]) ignore.add(id);
  }
  const kind = lineKindOf(state, line);
  for (let step = 1; step <= maxRows; step += 1) {
    for (const y of [at.y - step, at.y + step]) {
      if (y < 0) continue;
      if (lineFits(state, { x: at.x, y }, kind, ignore, line, leftOut)) return { x: at.x, y };
    }
  }
  return null;
}

/** What stands in the way of a line at this place, its own modules apart: the catalogue's ids of
 *  everything standing or on order on its 36 m by 3 m and its ground, each once; what the strip
 *  names for a line that has no lane (v94). */
export function inTheWayAt(state: GameState, line: number, at: { x: number; y: number }): string[] {
  const ground = lineGround(state, at, lineKindOf(state, line));
  if (ground === null) return [];
  const found: string[] = [];
  const parts = [ground.line, ground.path, ...stripsOf(ground)];
  for (const box of [...parts, ...(ground.behind === null ? [] : [ground.behind])]) {
    for (const specId of standingOn(state, box)) {
      if (!isLineModule(specId) && !found.includes(specId)) found.push(specId);
    }
  }
  // And the modules of another line, said as the line.
  for (const other of lineNumbers(state)) {
    if (other === line) continue;
    const there = linePlace(state, other);
    if (there === null) continue;
    const box = lineBox(there, lineKindOf(state, other));
    if (parts.some((part) => overlaps(part, box))) found.push(`line:${other}`);
  }
  return found;
}

/** Where a line that has no lane would have it, the kit apart: along x past the left strip for a
 *  line over it, and otherwise the nearest row along its own x where its lane fits the hall (v94).
 *  Null when no row does. */
export function laneTarget(state: GameState, at: { x: number; y: number }, kind: LineKind): { x: number; y: number } | null {
  const trouble = laneTrouble(state, at, kind);
  if (trouble === null) return at;
  const x = trouble === 'leftWall' ? Math.max(at.x, FORKLIFT_LANE_CELLS) : at.x;
  if (laneTrouble(state, { x, y: at.y }, kind) === null) return { x, y: at.y };
  for (let step = 1; step < state.unit.depthCells; step += 1) {
    for (const y of [at.y - step, at.y + step]) {
      if (y >= 0 && laneTrouble(state, { x, y }, kind) === null) return { x, y };
    }
  }
  return null;
}

/** Moves a whole line by these cells with no question asked, its modules or its outlines on order
 *  and the men at it: for the save's lift, which has asked `nearestLanePlace` first (v94). */
export function shiftLine(state: GameState, onOrder: boolean, line: number, dx: number, dy: number): void {
  moveLine(state, onOrder, line, dx, dy);
}

/** What stands on a line's ground, standing or on order, every line's modules apart: the
 *  catalogue's ids, each once, for the strip (CLAUDE.md T31 2.6; v93). */
export function standingInTheWay(state: GameState, line: number): string[] {
  const found: string[] = [];
  for (const ground of claimedGround(state)) {
    if (ground.line !== line) continue;
    for (const specId of standingOn(state, ground.box)) {
      if (!isLineModule(specId) && !found.includes(specId)) found.push(specId);
    }
  }
  return found;
}

/** Can this piece of floor take a thing: inside the hall, on no room (the canteen excepted for the
 *  welfare kit), off the way to the gate, and on nothing standing or held for a delivery but what
 *  `ignore` names. The checks every placement asks, in one place: a machine's own and the whole
 *  line's 36 m by 3 m (CLAUDE.md T30 2.4). */
export function canPlaceBox(
  state: GameState,
  box: Box,
  ignore: ReadonlySet<string>,
  inTheCanteen = false,
): PlaceCheck {
  if (
    box.x < 0 ||
    box.y < 0 ||
    box.x + box.width > state.unit.widthCells ||
    box.y + box.depth > state.unit.depthCells
  ) {
    return { ok: false, reason: 'Off the floor' };
  }
  for (const room of roomsOf(state.unit)) {
    if (!overlaps(box, { x: room.x, y: room.y, width: room.width, depth: room.depth })) continue;
    if (room.id === 'canteen' && inTheCanteen) continue;
    return { ok: false, reason: `On the ${room.name.toLowerCase()}` };
  }
  if (overlaps(box, gateLane())) {
    return { ok: false, reason: 'Blocking the way to the gate' };
  }
  for (const item of hallItems(state)) {
    if (ignore.has(item.id)) continue;
    const other = findSpec(item.specId);
    if (!other) continue;
    // Zone against zone: two saws whose working room would overlap cannot both stand there, even
    // where the machines themselves would not touch (CLAUDE.md T7 3.3).
    if (overlaps(box, boxOfItem(item, item.anchorX, item.anchorY))) {
      return { ok: false, reason: `On the ${other.name.toLowerCase()}` };
    }
  }
  // The cells held for what is bought and not here yet are taken as surely as the cells a machine
  // stands on: it is coming, and it has to have somewhere to stand (CLAUDE.md T8 3.2).
  for (const item of reservedItems(state)) {
    if (ignore.has(item.id)) continue;
    const other = findSpec(item.specId);
    if (!other) continue;
    if (overlaps(box, boxOfItem(item, item.anchorX, item.anchorY))) {
      return { ok: false, reason: `On the ${other.name.toLowerCase()} that is on order` };
    }
  }
  return OK;
}

/** Module 1 of a kind of line, whose size every module of the kind has (v114). */
function firstModuleOf(kind: LineKind): ReturnType<typeof findSpec> {
  return findSpec(lineModulesOf(kind)[0] ?? '');
}

/** What the whole line of a kind takes with module 1 at this cell: its six modules end to end along
 *  x, at orientation 0, the line never being turned: 36 m by 3 m a window or a door line, 84 m by
 *  10 m a house factory (CLAUDE.md T30 2.4; v114). */
export function lineBox(at: { x: number; y: number }, kind: LineKind): Box {
  const module = firstModuleOf(kind);
  const width = module?.width ?? 0;
  return { x: at.x, y: at.y, width: width * lineModulesOf(kind).length, depth: module?.depth ?? 0 };
}

/** Where module N of a line stands whose module 1 is at this cell: a module's width along x from the
 *  one before, six metres a window or a door line's, fourteen a house factory's (CLAUDE.md T30 2.4;
 *  v107; v114). */
export function lineModuleCell(at: { x: number; y: number }, specId: string): { x: number; y: number } {
  const width = firstModuleOf(moduleKind(specId) ?? 'window')?.width ?? 0;
  return { x: at.x + width * Math.max(0, lineModuleIndex(specId) - 1), y: at.y };
}

/** The depth a line of a kind takes with its ground: the metre behind it, its modules' depth, its
 *  engineers' metre and its lane: seven a window line, twenty two a house factory (v93; v114). */
export function lineDepthCells(kind: LineKind): number {
  const module = firstModuleOf(kind);
  return LINE_BEHIND_CELLS + (module?.depth ?? 0) + LINE_FRONT_CELLS + LINE_KINDS[kind].laneCells;
}

/** Where a new line of a kind is put at its order: `WINDOW_LINE_ORIGIN` when the line and its
 *  ground are clear there; then the row its own depth behind each line that stands or is on order,
 *  and the row its depth in front of it, at its x, so the next line stands behind the first (PIOTR,
 *  12.10); then cell by cell in the order `firstFreeCell` searches a machine's place, which finds a
 *  place beside a line along a longer hall. Null when the hall has none (CLAUDE.md T30 2.4, T31 2.6;
 *  v93; v114) [TUNE: chat]. */
export function lineSite(state: GameState, kind: LineKind): { x: number; y: number } | null {
  const none = new Set<string>();
  if (lineFits(state, WINDOW_LINE_ORIGIN, kind, none)) return { ...WINDOW_LINE_ORIGIN };
  const step = lineDepthCells(kind);
  for (const line of lineNumbers(state)) {
    const at = linePlace(state, line);
    if (at === null) continue;
    for (const y of [at.y - step, at.y + step]) {
      if (lineFits(state, { x: at.x, y }, kind, none)) return { x: at.x, y };
    }
  }
  const size = lineBox({ x: 0, y: 0 }, kind);
  for (let y = 0; y + size.depth <= state.unit.depthCells; y += 1) {
    for (let x = 0; x + size.width <= state.unit.widthCells; x += 1) {
      if (lineFits(state, { x, y }, kind, none)) return { x, y };
    }
  }
  return null;
}

/** Where a line of a kind would best go when the hall has no site for it: the place whose block
 *  (`lineGround`) has the fewest things in it, counting every item standing or on order in the
 *  block and every other line whose modules, metres or lane the block would take, the row nearer
 *  the rear wall first among equals; with what stands in the way, by item id and by line. `fits`
 *  is true at a clear place, which is then `lineSite`'s own. Null when the block does not go into
 *  the hall at all (v119) [PIOTR, 19.10: the player is shown, not told to guess]. */
export function bestLineSite(
  state: GameState,
  kind: LineKind,
): { at: { x: number; y: number }; fits: boolean; items: string[]; lines: number[] } | null {
  const site = lineSite(state, kind);
  if (site !== null) return { at: site, fits: true, items: [], lines: [] };
  const depth = state.unit.depthCells;
  // Everything standing or held, by the rows it stands on, so a block asks only of the rows it
  // covers: on a 210 by 69 m hall with 370 things the whole scan is a few hundred milliseconds,
  // once a click and kept until something moves (`src/render/roomFor.ts`).
  const things = [...hallItems(state), ...reservedItems(state)].map((item) => ({
    id: item.id,
    box: boxOfItem(item, item.anchorX, item.anchorY),
  }));
  const byRow: Array<Array<{ id: string; box: Box }>> = Array.from({ length: depth }, () => []);
  for (const thing of things) {
    for (let y = Math.max(0, thing.box.y); y < Math.min(depth, thing.box.y + thing.box.depth); y += 1) byRow[y]?.push(thing);
  }
  const grounds = claimedGround(state);
  const rooms = roomsOf(state.unit).map((room) => ({ x: room.x, y: room.y, width: room.width, depth: room.depth }));
  const gate = gateLane();
  const size = lineBox({ x: 0, y: 0 }, kind);
  const gateKind = LINE_KINDS[kind].collection === 'gate';
  let best: { at: { x: number; y: number }; items: string[]; lines: number[]; score: number } | null = null;
  for (let y = 0; y + size.depth <= depth; y += 1) {
    for (let x = 0; x + size.width <= state.unit.widthCells; x += 1) {
      const ground = lineGround(state, { x, y }, kind);
      if (ground === null) continue;
      // A forklift's lane may lie on the way to the gate or over its own line; a house factory's,
      // along the line in front of it, never does.
      if (gateKind && laneTrouble(state, { x, y }, kind) !== null) continue;
      const own = [ground.line, ground.path, ...(ground.behind === null ? [] : [ground.behind])];
      const strips = stripsOf(ground);
      const all = [...own, ...strips];
      // The rooms and the way to the gate never move: a block over them is no place at all.
      if (all.some((box) => rooms.some((room) => overlaps(box, room)) || overlaps(box, gate))) continue;
      const top = Math.min(...all.map((box) => box.y));
      const bottom = Math.max(...all.map((box) => box.y + box.depth));
      const items: string[] = [];
      for (let row = top; row < bottom; row += 1) {
        for (const thing of byRow[row] ?? []) {
          if (items.includes(thing.id)) continue;
          if (all.some((box) => overlaps(box, thing.box))) items.push(thing.id);
        }
      }
      const lines: number[] = [];
      for (const other of grounds) {
        const taken = own.some((box) => overlaps(box, other.box)) || (!isLaneGround(other.kind) && strips.some((strip) => overlaps(strip, other.box)));
        if (taken && !lines.includes(other.line)) lines.push(other.line);
      }
      const score = items.length + lines.length * 10;
      if (best === null || score < best.score) best = { at: { x, y }, items, lines, score };
    }
  }
  return best === null ? null : { at: best.at, fits: false, items: best.items, lines: best.lines };
}

/** The outline of something on order, which setup mode drags about like a machine. */
export function reservationById(state: GameState, itemId: string): OnOrderItem | null {
  return reservedItems(state).find((entry) => entry.id === itemId) ?? null;
}

/** The line's two refusals in setup mode [TUNE: chat]: it is never turned, its conveyor running one
 *  way and its turned pictures being the other turn, and it goes only where the whole of it has a
 *  clear 36 m by 3 m (CLAUDE.md T30 2.4). From v119 the refusal says the whole block, in metres,
 *  and where its lane runs [PIOTR, 19.10: "the player cannot be a clairvoyant"]. */
export const LINE_NEVER_TURNED = 'The line is never turned';

/** The block a line of a kind takes with its ground, in words: `84 m by 22 m` (v119). */
export function lineBlockWords(kind: LineKind): string {
  const box = lineBox({ x: 0, y: 0 }, kind);
  return `${box.width} m by ${lineDepthCells(kind)} m`;
}

/** What the block is made of, in words, for the refusals: the modules, the metres and the lane,
 *  and where the lane runs (v119). The wall is named by its gate, never by a side [PIOTR, 19.10:
 *  "write that it has to be the wall with the exit gate; left for me is the one on my side"]. */
export function lineBlockExplained(kind: LineKind): string {
  const spec = LINE_KINDS[kind];
  const box = lineBox({ x: 0, y: 0 }, kind);
  const lane =
    spec.collection === 'lane'
      ? `its ${spec.laneCells} m lane in front, which the lanes of other lines may cross`
      : `its ${spec.laneCells} m lane running from the wall with the exit gate to its end`;
  return `its ${lineModulesOf(kind).length} modules on ${box.width} m by ${box.depth} m, a metre before and behind, and ${lane}`;
}

export function lineNeedsRoom(kind: LineKind): string {
  return `The line needs a clear ${lineBlockWords(kind)}: ${lineBlockExplained(kind)}`;
}
/** The move's refusal where another line's ground is: two lines never stand in one another's way
 *  (v93) [TUNE]. */
export const LINE_IN_THE_WAY = 'That is in another line\'s way';

/** The order's refusal for want of floor: the line and its ground (CLAUDE.md T31 2.6) [TUNE]. From
 *  v119 it says the block and sends the player to Set up hall, where `Room for` draws it. */
export const LINE_NO_ROOM = 'No room in the hall for the line and its lane';
export function lineNoRoom(kind: LineKind): string {
  return (
    `${LINE_NO_ROOM}: it needs a clear ${lineBlockWords(kind)} (${lineBlockExplained(kind)}). ` +
    `Open Set up hall and press Room for: ${LINE_KINDS[kind].name} to see where it would go and what stands in the way`
  );
}

/** The ids of a whole line as it stands this minute: its modules on the floor, or its outlines on
 *  order. They move together and never stand in one another's way (CLAUDE.md T30 2.4; v93: the
 *  line by its number). */
export function lineGroup(state: GameState, onOrder: boolean, line: number): string[] {
  const items = onOrder ? reservedItems(state) : hallItems(state);
  return items.filter((item) => isLineModule(item.specId) && lineOf(item) === line).map((item) => item.id);
}

/** Can the whole line stand with this module at this cell: never turned, and a clear 36 m by 3 m
 *  for the six with its ground, clear of everything but the line itself, asked as `canPlaceBox` asks
 *  one machine, and out of every other line's way (CLAUDE.md T30 2.4; v93). */
function canPlaceLine(
  state: GameState,
  module: { specId: string; line?: number },
  x: number,
  y: number,
  orientation: Orientation | undefined,
  onOrder: boolean,
): PlaceCheck {
  if (orientation !== undefined && orientation !== 0) return { ok: false, reason: LINE_NEVER_TURNED };
  const line = lineOf(module);
  const kind = moduleKind(module.specId) ?? 'window';
  const offset = lineModuleCell({ x: 0, y: 0 }, module.specId);
  const box = lineBox({ x: x - offset.x, y: y - offset.y }, kind);
  const ignore = new Set(lineGroup(state, onOrder, line));
  if (lineFits(state, box, kind, ignore, line)) return OK;
  // Its own ground clear and only another line's in the way: said so [TUNE].
  const ground = lineGround(state, box, kind);
  const ownClear =
    ground !== null &&
    [ground.line, ground.path, ...stripsOf(ground), ...(ground.behind === null ? [] : [ground.behind])].every(
      (part) => canPlaceBox(state, part, ignore).ok,
    );
  return { ok: false, reason: ownClear ? LINE_IN_THE_WAY : lineNeedsRoom(kind) };
}

/** Can this item stand here? An outline held for a delivery answers exactly as the machine it is
 *  holding the floor for would (CLAUDE.md T8 3.2). A module of the line, or the outline of one on
 *  order, answers for the whole line, which moves as one (CLAUDE.md T30 2.4). */
export function canPlace(
  state: GameState,
  itemId: string,
  x: number,
  y: number,
  orientation?: Orientation,
): PlaceCheck {
  const reserved = reservationById(state, itemId);
  if (reserved !== null) {
    // The outline of the line on order moves as the line does (CLAUDE.md T30 2.4).
    if (isLineModule(reserved.specId)) return canPlaceLine(state, reserved, x, y, orientation, true);
    // And the outline of kit on order that stands outside is refused as the kit itself is: a
    // shelter or a van on order is never dragged into the hall (CLAUDE.md T29 2.11.1).
    if (standsOutsideTheHall(state, reserved)) return { ok: false, reason: 'It stands in the yard' };
    return canPlaceSpec(
      state,
      reserved.specId,
      x,
      y,
      reserved.id,
      reserved.variantId,
      orientation ?? reserved.orientation,
    );
  }
  const item = state.equipment.find((entry) => entry.id === itemId);
  if (!item) return { ok: false, reason: 'Nothing to move' };
  const spec = findSpec(item.specId);
  if (spec?.category === 'furniture') return { ok: false, reason: 'It lives in the office' };
  // The welfare kit is placed by count, inside the canteen: there is no hall cell to drag it to
  // (CLAUDE.md T17 2.2).
  if (WELFARE_IN_THE_CANTEEN.includes(item.specId)) {
    return { ok: false, reason: 'It stands in the canteen' };
  }
  if (standsOutsideTheHall(state, item)) return { ok: false, reason: 'It stands in the yard' };
  // A module of a line answers for the whole line: moved as one, never turned (CLAUDE.md T30 2.4).
  if (isLineModule(item.specId)) return canPlaceLine(state, item, x, y, orientation, false);
  return canPlaceSpec(
    state,
    item.specId,
    x,
    y,
    item.id,
    item.variantId,
    orientation ?? item.orientation,
  );
}

/** Moves it, or says why not. The man at a bench goes with his bench. */
export function moveItem(
  state: GameState,
  itemId: string,
  x: number,
  y: number,
  orientation?: Orientation,
): PlaceCheck {
  const check = canPlace(state, itemId, x, y, orientation);
  if (!check.ok) return check;
  const reserved = reservationById(state, itemId);
  const taken = reserved ?? state.equipment.find((entry) => entry.id === itemId) ?? null;
  // The line goes as one: every module, or every outline of one on order, by the same cells
  // (CLAUDE.md T30 2.4).
  if (taken !== null && isLineModule(taken.specId)) {
    moveLine(state, reserved !== null, lineOf(taken), x - taken.anchorX, y - taken.anchorY);
    return OK;
  }
  if (reserved !== null) {
    // Nothing is carried and nothing is unplugged: the floor held for it is held somewhere else.
    reserved.anchorX = x;
    reserved.anchorY = y;
    if (orientation !== undefined) reserved.orientation = orientation;
    return OK;
  }
  const item = state.equipment.find((entry) => entry.id === itemId);
  if (!item) return check;
  const fromX = item.anchorX;
  const fromY = item.anchorY;
  item.anchorX = x;
  item.anchorY = y;
  if (orientation !== undefined) item.orientation = orientation;
  for (const worker of state.workers) {
    if (worker.anchorX === fromX && worker.anchorY === fromY) {
      worker.anchorX = x;
      worker.anchorY = y;
    }
  }
  return OK;
}

/** A whole line moved by these cells, its six modules or its six outlines, and a man at a module
 *  with it, as a man goes with his bench (CLAUDE.md T30 2.4; v93: the line by its number). */
function moveLine(state: GameState, onOrder: boolean, line: number, dx: number, dy: number): void {
  const ids = new Set(lineGroup(state, onOrder, line));
  const items = onOrder ? state.onOrder : state.equipment;
  const stood = new Set<string>();
  for (const item of items) {
    if (!ids.has(item.id)) continue;
    stood.add(`${item.anchorX},${item.anchorY}`);
    item.anchorX += dx;
    item.anchorY += dy;
  }
  if (onOrder) return;
  // Each man once, off the cells the modules stood on before any of them moved.
  for (const worker of state.workers) {
    if (!stood.has(`${worker.anchorX},${worker.anchorY}`)) continue;
    worker.anchorX += dx;
    worker.anchorY += dy;
  }
}

/** The floor nothing stands on: the hall's area less every room, the gate lane and the working
 *  zone of everything placed or held for a delivery, in square metres (CLAUDE.md T13 3.10). */
export function freeFloorM2(state: GameState): number {
  let taken = 0;
  for (const room of roomsOf(state.unit)) taken += room.width * room.depth;
  const lane = gateLane();
  taken += lane.width * lane.depth;
  for (const item of hallItems(state)) {
    const box = boxOfItem(item, item.anchorX, item.anchorY);
    taken += box.width * box.depth;
  }
  for (const item of reservedItems(state)) {
    const box = boxOfItem(item, item.anchorX, item.anchorY);
    taken += box.width * box.depth;
  }
  return Math.max(0, state.unit.widthCells * state.unit.depthCells - taken);
}

/** How many joiners the unit has room for: one per so many square metres of the whole unit, 200
 *  over 25 is eight (PIOTR, 20.09: "the whole hall over 24, simplest"; v37; 25 from v82, so that
 *  800 m2 is thirty two), and from Turn 26 the eight are joiners, whoever else is on the books
 *  (PIOTR, 02.10; CLAUDE.md T26 2.10).
 *  Until v37 it was the free floor after the machines' zones, which refused a fifth joiner on a
 *  working hall and left the canteen's eight lockers unreachable (REPORT-T23 items 1 and 6). The
 *  machines still take floor: a bench needs its place, and that is the only way they limit men. */
export function crewLimit(state: GameState): number {
  return Math.floor((state.unit.widthCells * state.unit.depthCells) / M2_PER_PERSON);
}

/** How many lockers this unit's canteen holds: the eight it was built with, sixteen once it has
 *  been enlarged, and thirty two in an enlarged canteen of the 800 m2 unit, a locker for every
 *  joiner that unit takes. The one figure the hiring gate, the catalogue and the room itself
 *  count by (PIOTR, 20.09, 03.10 and 04.10; CLAUDE.md T23 2.10; v67, v82). */
export function canteenLockers(state: GameState): number {
  if (!state.unit.canteenWide) return CANTEEN_LOCKERS;
  if (secondExtensionOf(state.unit) !== 'open') return CANTEEN_LOCKERS_WIDE;
  // Eight more for every 200 m2 past 800, for the joiners a longer hall takes (CLAUDE.md T31 2.7),
  // counted to the square metre: a hall made seven metres wider is not a whole 200 m2 more, and its
  // canteen keeps a locker for every joiner it takes all the same (v95).
  const past = (state.unit.areaM2 - UNIT_SECOND_EXTENSION_M2) * CANTEEN_LOCKERS_PER_LONG_EXTENSION;
  return CANTEEN_LOCKERS_DEEP + Math.max(0, Math.floor(past / UNIT_AREA_M2));
}

/** The figures a canteen can hold, in a word each. */
const LOCKERS_IN_WORDS: Record<number, string> = {
  [CANTEEN_LOCKERS]: 'eight',
  [CANTEEN_LOCKERS_WIDE]: 'sixteen',
  [CANTEEN_LOCKERS_DEEP]: 'thirty-two',
};

/** The same figure in a word, for the two sentences that say it: `eight`, `sixteen`,
 *  `thirty-two`. */
export function lockersInWords(state: GameState): string {
  const lockers = canteenLockers(state);
  return LOCKERS_IN_WORDS[lockers] ?? String(lockers);
}

/** Where the lockers stand inside the canteen, in the order they are bought (CLAUDE.md T17 2.2;
 *  v67). */
export function lockerSlots(state: GameState): readonly LayoutSlot[] {
  return state.unit.canteenWide ? LOCKER_SLOT_LAYOUT_WIDE : LOCKER_SLOT_LAYOUT;
}

/** What stands on this piece of floor, or has a place held on it for the day it is delivered: the
 *  catalogue lines, each once, in the order they stand in the hall. What has to be moved before
 *  anything else can have the floor (v67). */
export function standingOn(state: GameState, box: Box): string[] {
  const found: string[] = [];
  for (const thing of floorTakenBy(state)) {
    if (!overlaps(box, thing.box)) continue;
    if (!found.includes(thing.specId)) found.push(thing.specId);
  }
  return found;
}

/** Everything standing in the hall and everything held for a delivery, with the floor each takes,
 *  in the order they stand: kept for as long as the state is pinned, which the strip asks of every
 *  line's ground (v104). */
function floorTakenBy(state: GameState): Array<{ specId: string; box: Box }> {
  return pinned(state, 'floorTakenBy', () =>
    [...hallItems(state), ...reservedItems(state)].map((item) => ({
      specId: item.specId,
      box: boxOfItem(item, item.anchorX, item.anchorY),
    })),
  );
}

/** The first cell, reading along each row in turn, where a thing of this kind fits. */
export function firstFreeCell(
  state: GameState,
  specId: string,
  variantId?: string,
): { x: number; y: number } | null {
  const zone = zoneOf(specId, variantId);
  if (zone.width <= 0 || zone.depth <= 0) return null;
  for (let y = 0; y + zone.depth <= state.unit.depthCells; y += 1) {
    for (let x = 0; x + zone.width <= state.unit.widthCells; x += 1) {
      if (canPlaceSpec(state, specId, x, y, null, variantId).ok) return { x, y };
    }
  }
  return null;
}
