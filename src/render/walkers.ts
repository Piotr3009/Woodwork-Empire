// The walker (CLAUDE.md T16 2.2). One walker per figure on the page: the cell it is at, the path
// it is on, and where it goes next. The engine says where and along which cells (the figure's
// standing cell, on the group as data-cell, and walkPath over the free cells); the walker says
// when: on every frame it advances along its path at a man's pace in real seconds, whatever the
// game's clock is doing, sets the figure's transform to the point between two cells, plays carry
// on a leg that carries material and walk on the rest, and faces the way it is going. On arrival
// it plays the station's animation and faces the item. A figure never jumps: when the engine
// sends it somewhere else it sets off from wherever it had got to, and only a view built from
// nothing (a load, a scene change) starts it at its station's cell.
//
// An unloading is a loop he never stands on (PIOTR, 16.09): the page gives both ends, the pallet
// and the rack, and the walker touches one and goes to the other, with the sheet on the way to
// the rack and empty handed on the way back, for as long as the engine has him unloading. As many
// trips as the time allows; a farther rack is fewer trips. When the engine moves him on, he
// finishes the leg he is on and goes to his new station. A machine off the lorry is the same
// loop with the far end somewhere else and no station on it: from the gate to the floor held for
// the machine and back, empty handed both ways (CLAUDE.md T17 2.4).
//
// Nothing here is game state. A rebuilt page finds the walkers still here and puts every figure
// back where it had actually got to (the same reason the slides of Turn 2 lived in the app).

import { FIGURE_DEPTH_OFFSET, WALK_CORNER_CELLS } from '../engine/constants';
import { STATION_GATE, STATION_RACK, isBehindTheDoor } from '../engine/stations';
import {
  type Animation,
  type Facing,
  faceCharacter,
  facingFromScreen,
  legCarries,
  playCharacters,
  setCharacterAnimation,
  walkPace,
} from './characters';
import { centreOf, depthKey } from './iso';

export interface Cell {
  x: number;
  y: number;
}

interface Goal {
  cell: Cell;
  station: string;
}

export interface Arrival {
  cell: Cell;
  station: string;
}

/** The two ends of an unloading: where he touches the pallet and the far end he goes to and
 *  comes back from. A load of sheets goes to the rack, which is what the far end is when the
 *  page names no other; a machine off the lorry goes to the floor held for it and is at no
 *  station at all when he gets there, so the leg is a plain walk (CLAUDE.md T16 2.2, T17 2.4). */
export interface Loop {
  gate: Cell;
  rack: Cell;
  farStation: string;
}

export interface Walker {
  key: string;
  /** Where his feet are now, in cells, fractional between two cells while he walks. */
  at: { x: number; y: number };
  /** The cells still to walk through to the goal he is on, the next one first. */
  path: Cell[];
  /** The way he faces walking to each of those cells, one for one with `path`: chosen once when
   *  the leg is set off on and never re-read per cell (CLAUDE.md T19 2.1). */
  facings: Facing[];
  /** The station he is walking to, or standing at. */
  station: string;
  /** The station he set off from, for the leg's animation. */
  fromStation: string;
  /** The loop he is on, or null: while it is set he never stands. */
  loop: Loop | null;
  /** Where the engine wants him once the leg he is on is done: set when the loop ends mid leg. */
  after: Goal | null;
  /** The last goal the page gave him, so a rebuilt page is not a new order. */
  lastGoal: string;
  lastMs: number;
  /** Every goal he arrived at, in order: the test's log. */
  arrivals: Arrival[];
  /** Trips of the unloading completed: arrivals at the pallet after a visit to the far end. */
  loops: number;
  sawFarEnd: boolean;
}

export type PathFinder = (from: Cell, to: Cell) => Cell[];

const walkers = new Map<string, Walker>();
let pathFinder: PathFinder = (from, to) => [from, to];

/** Forgets every walker: the view is being built from nothing. */
export function resetWalkers(): void {
  walkers.clear();
}

/** The depth key a figure has this frame: the cell his feet are actually on, and not the station
 *  he is walking to (PIOTR; CLAUDE.md T20 2.11). For the whole of a walk the hall used to paint
 *  him in the order of where he was going, so a man crossing the floor passed behind a machine he
 *  was in front of and snapped into place on arrival. */
export function figureDepth(walker: Walker): number {
  return depthKey(walker.at.x, walker.at.y) + FIGURE_DEPTH_OFFSET;
}

/** The depth the scene wrote on a drawable, or null for one that carries none. */
function depthOf(node: Element): number | null {
  const raw = node.getAttribute('data-depth');
  if (raw === null) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

/** Puts every figure back in the painter's order for the cell his feet are on this frame. The
 *  cheap re-sort Turn 19's report proposed and did not do (REPORT-T19, "What was not done
 *  tonight"): a figure is swapped with the sibling before or after it only when its own depth key
 *  has crossed that sibling's, so a frame in which nothing crosses moves nothing at all and the
 *  scene is never sorted again. A sibling with no depth on it is a boundary and is not crossed.
 *
 *  Returns how many figures were moved, which is what the stability test counts. */
export function resortFigures(root: ParentNode): number {
  let moved = 0;
  for (const node of Array.from(root.querySelectorAll('[data-figure]'))) {
    const key = node.getAttribute('data-figure');
    const walker = key === null ? undefined : walkers.get(key);
    if (walker === undefined) continue;
    const depth = figureDepth(walker);
    node.setAttribute('data-depth', String(Math.round(depth * 1000) / 1000));
    const parent = node.parentNode;
    if (parent === null) continue;
    let shifted = false;
    // Up the list while the drawable before him is painted after him.
    for (let guard = 0; guard < 64; guard += 1) {
      const before = node.previousElementSibling;
      const value = before === null ? null : depthOf(before);
      if (before === null || value === null || value <= depth) break;
      parent.insertBefore(node, before);
      shifted = true;
    }
    // And down it while the drawable after him is painted before him.
    for (let guard = 0; guard < 64; guard += 1) {
      const after = node.nextElementSibling;
      const value = after === null ? null : depthOf(after);
      if (after === null || value === null || value >= depth) break;
      parent.insertBefore(after, node);
      shifted = true;
    }
    if (shifted) moved += 1;
  }
  return moved;
}

/** The walker of a figure, for the tests and nobody else. */
export function walkerOf(key: string): Walker | undefined {
  return walkers.get(key);
}

/** Every figure the walker is driving, for the doors and for the tests. */
export function walkerKeys(): string[] {
  return Array.from(walkers.keys());
}

/** True while this man has gone through a door: his walk is over, his feet are in a doorway, and the
 *  station he walked to is inside that very room. The hall leaves him out of the drawing from that
 *  moment and the door counts him through (PIOTR, 18.09 and 19.09; CLAUDE.md T20 2.12, T21 2.11,
 *  2.12). The station is his own goal off the page, which is why a man standing about at the canteen
 *  door is still drawn and a man eating behind it is not. */
export function walkerIsThroughADoor(walker: Walker): boolean {
  return walker.path.length === 0 && isBehindTheDoor(walker.station, walker.at);
}

function goalKey(cell: Cell, station: string): string {
  return `${cell.x},${cell.y}|${station}`;
}

function cellOf(raw: string): Cell | null {
  const [x, y] = raw.split(',').map(Number);
  if (x === undefined || y === undefined || Number.isNaN(x) || Number.isNaN(y)) return null;
  return { x, y };
}

/** The loop the page put on a figure: "px,py;rx,ry" for the sheets, and "px,py;mx,my;station"
 *  when the far end is somewhere else with a station of its own. */
function loopOf(node: Element): Loop | null {
  const raw = node.getAttribute('data-loop');
  if (raw === null) return null;
  const [gateRaw, rackRaw, stationRaw] = raw.split(';');
  const gate = cellOf(gateRaw ?? '');
  const rack = cellOf(rackRaw ?? '');
  if (gate === null || rack === null) return null;
  return { gate, rack, farStation: stationRaw ?? STATION_RACK };
}

/** Where the figure's group sits this frame, written to two decimals and not to whole pixels
 *  (PIOTR, 17.09: "they shake like a leaf"; CLAUDE.md T19 2.1). At one cell a second and 60 frames
 *  a second a man covers 0.4 px of screen x and 0.2 px of screen y in a frame, so rounding to
 *  whole pixels made him stand still on two frames out of every five and jump a pixel on the
 *  others. Two decimals is enough for the smallest real step and the browser interpolates the
 *  rest; the sprite inside the group stays anchored on the sheet's own anchor, so nothing is
 *  drawn off its pixel. */
function translateOf(at: { x: number; y: number }): string {
  const feet = centreOf(at.x, at.y, 1, 1);
  return `translate(${feet.x.toFixed(2)},${feet.y.toFixed(2)})`;
}

function sameCell(a: Cell, b: { x: number; y: number }): boolean {
  return a.x === b.x && a.y === b.y;
}

/** The cell to set off from: the next cell of the path he is on, so a man mid stride finishes it
 *  and turns, or the cell he stands on. Where he stands is not rounded here: the path finder is
 *  handed a whole cell in `setOff`, and rounding what the walker remembers would teleport a man
 *  stopped mid cell by up to half a cell (CLAUDE.md T19 2.1). */
function setOffFrom(walker: Walker): Cell {
  const next = walker.path[0];
  if (next !== undefined) return next;
  return { x: walker.at.x, y: walker.at.y };
}

/** The way a step reads on the screen, as the sign of its world direction. */
function screenFacing(from: { x: number; y: number }, to: { x: number; y: number }): Facing {
  const a = centreOf(from.x, from.y, 1, 1);
  const b = centreOf(to.x, to.y, 1, 1);
  return facingFromScreen(b.x - a.x, b.y - a.y);
}

/** The facing to walk each cell of a leg with: one per cell of `path`, chosen once (CLAUDE.md
 *  T19 2.1).
 *
 *  A man does not turn his shoulders for every cell of a staircase. The leg's own direction, from
 *  the cell he sets off from to the cell he is going to, is what he faces for the whole of it; a
 *  run of more than `WALK_CORNER_CELLS` cells in one world direction is a genuine corner and is
 *  faced its own way, so the L the path finder gives on open floor turns him exactly once and a
 *  staircase reads as one direction from end to end. */
export function legHeadings(from: Cell, path: readonly Cell[]): Facing[] {
  if (path.length === 0) return [];
  const last = path[path.length - 1] as Cell;
  const leg =
    last.x === from.x && last.y === from.y
      ? screenFacing(from, path[0] as Cell)
      : screenFacing(from, last);
  // The runs of the path: consecutive cells going the same way in the world.
  const facings: Facing[] = new Array(path.length).fill(leg) as Facing[];
  let runStart = 0;
  let runX = 0;
  let runY = 0;
  let at: { x: number; y: number } = from;
  const closeRun = (end: number): void => {
    // A short run is a wobble inside the leg and is walked the leg's way; a long one is a corner
    // and is walked its own, from its first cell to its last.
    if (end - runStart <= WALK_CORNER_CELLS) return;
    const facing = screenFacing(path[runStart] as Cell, path[end - 1] as Cell);
    for (let index = runStart; index < end; index += 1) facings[index] = facing;
  };
  for (let index = 0; index < path.length; index += 1) {
    const cell = path[index] as Cell;
    const stepX = Math.sign(cell.x - at.x);
    const stepY = Math.sign(cell.y - at.y);
    if (index > 0 && (stepX !== runX || stepY !== runY)) {
      closeRun(index);
      runStart = index;
    }
    runX = stepX;
    runY = stepY;
    at = cell;
  }
  closeRun(path.length);
  return facings;
}

/** Starts a walker on the way to a goal along the network. */
function setOff(walker: Walker, goal: Goal): void {
  const from = setOffFrom(walker);
  // The network is a grid of whole cells: it is asked about the cell he is in, and the fraction
  // of a cell he has walked into it stays on the walker.
  const cells = pathFinder({ x: Math.round(from.x), y: Math.round(from.y) }, goal.cell);
  // The path starts on the cell he is on: nothing to walk for that one.
  const first = cells[0];
  if (first !== undefined && cells.length > 1 && sameCell(first, walker.at)) cells.shift();
  walker.path = cells;
  walker.facings = legHeadings(from, cells);
  walker.fromStation = walker.station;
  walker.station = goal.station;
}

/** The other end of the loop from where he is: the far end after the pallet, the pallet after
 *  the far end, and the far end first when he is anywhere else. */
function nextEnd(walker: Walker, loop: Loop): Goal {
  if (walker.station === loop.farStation) return { cell: loop.gate, station: STATION_GATE };
  return { cell: loop.rack, station: loop.farStation };
}

/** Reads the figures the page has just been built with and gives every walker its orders: a new
 *  figure stands where the page put it; a known one is put back where it had got to and, when the
 *  engine has sent it somewhere else, sets off from there. A figure with a loop on it walks the
 *  loop and nothing else until the loop is taken off. */
export function syncWalkers(root: ParentNode, nowMs: number, pathFor: PathFinder): void {
  pathFinder = pathFor;
  const seen = new Set<string>();
  for (const node of Array.from(root.querySelectorAll('[data-figure]'))) {
    const key = node.getAttribute('data-figure');
    const cell = cellOf(node.getAttribute('data-cell') ?? '');
    if (key === null || cell === null) continue;
    seen.add(key);
    const station = node.getAttribute('data-station') ?? '';
    const loop = loopOf(node);
    const goal = goalKey(cell, station);
    let walker = walkers.get(key);
    if (walker === undefined) {
      walker = {
        key,
        at: { x: cell.x, y: cell.y },
        path: [],
        facings: [],
        station,
        fromStation: station,
        loop,
        after: null,
        lastGoal: goal,
        lastMs: nowMs,
        arrivals: [],
        loops: 0,
        sawFarEnd: false,
      };
      walkers.set(key, walker);
      // Born on the loop: off he goes.
      if (loop !== null) setOff(walker, nextEnd(walker, loop));
      continue;
    }
    if (loop !== null) {
      // On the loop: the engine's own station changes between the gate and the rack are not
      // orders, the loop is. A man standing still on it is sent to the other end.
      walker.loop = loop;
      walker.after = null;
      walker.lastGoal = goal;
      if (walker.path.length === 0) setOff(walker, nextEnd(walker, loop));
    } else if (walker.loop !== null) {
      // The loop is over: he finishes the leg he is on and then goes where the engine put him.
      walker.loop = null;
      walker.lastGoal = goal;
      const next: Goal = { cell, station };
      if (walker.path.length === 0) setOff(walker, next);
      else walker.after = next;
    } else if (goal !== walker.lastGoal) {
      walker.lastGoal = goal;
      walker.after = null;
      setOff(walker, { cell, station });
    }
    // The page was built with him at his station: put him back where he had actually got to, and
    // face him and play him the way he already was. The fresh markup carries his station's facing,
    // his station's animation and frame 0, so a page written in the middle of a leg used to be
    // painted with a mirrored man restarting his walk, once a second at x1 and thirty times a
    // second at x30 (PIOTR, 17.09: "shake like a leaf"; CLAUDE.md T19 2.1).
    node.setAttribute('transform', translateOf(walker.at));
    dress(node, walker, walker.facings[0] ?? null);
    playCharacters(node, nowMs);
  }
  for (const key of Array.from(walkers.keys())) {
    const walker = walkers.get(key);
    // A man the page has stopped drawing because he has gone through a door is still there, on
    // the other side of it: his walker waits on the doorway cell so that he walks out of the door
    // when the engine sends him somewhere, instead of appearing at the far end of the hall
    // (CLAUDE.md T20 2.12). Every other figure the page has dropped is gone.
    if (!seen.has(key) && (walker === undefined || !walkerIsThroughADoor(walker))) {
      walkers.delete(key);
    }
  }
  // The page has just been written in the order the state put everybody in; the men are where the
  // walker has actually got them, so the painter's order is put back with them (T20 2.11).
  resortFigures(root);
}

/** The animation and the facing a figure shows now: the leg's while it walks, the station's
 *  when it stands. Attributes on elements already there, nothing rebuilt (CLAUDE.md T9 3.8). */
function dress(node: Element, walker: Walker, heading: Facing | null = null): void {
  const art = node.querySelector('[data-character]');
  if (art === null) return;
  if (walker.path.length > 0) {
    const carrying = legCarries(walker.fromStation, walker.station);
    setCharacterAnimation(art, carrying ? 'carry' : 'walk');
    if (heading !== null) faceCharacter(art, heading);
    return;
  }
  const rest = (node.getAttribute('data-rest') ?? 'idle') as Animation;
  setCharacterAnimation(art, rest);
  const facing = node.getAttribute('data-facing-rest') as Facing | null;
  if (facing !== null) faceCharacter(art, facing);
}

/** He has arrived at the goal he was on: the log, the trip count, and straight on to the other end
 *  of the loop, or to where the engine wants him after it. */
function arrive(walker: Walker): void {
  walker.arrivals.push({ cell: { x: walker.at.x, y: walker.at.y }, station: walker.station });
  const far = walker.loop?.farStation ?? STATION_RACK;
  if (walker.station === far) walker.sawFarEnd = true;
  if (walker.station === STATION_GATE && walker.sawFarEnd) {
    walker.loops += 1;
    walker.sawFarEnd = false;
  }
  if (walker.loop !== null) {
    setOff(walker, nextEnd(walker, walker.loop));
    return;
  }
  const after = walker.after;
  if (after !== null) {
    walker.after = null;
    setOff(walker, after);
  }
}

/** Moves every walker on by the real time since the last frame, at a man's pace, never more than
 *  one cell in one frame, and writes the transform, the animation and the facing on the figure
 *  that is already on the page. It answers how many figures the frame's re-sort moved, which is
 *  what the depth order's own test measures: the re-sort is inside the frame, so counting it
 *  afterwards counts nothing (CLAUDE.md T20 2.11). Every caller but a test ignores it. */
export function stepWalkers(root: ParentNode, nowMs: number): number {
  for (const node of Array.from(root.querySelectorAll('[data-figure]'))) {
    const key = node.getAttribute('data-figure');
    if (key === null) continue;
    const walker = walkers.get(key);
    if (walker === undefined) continue;
    const seconds = Math.max(0, (nowMs - walker.lastMs) / 1000);
    walker.lastMs = nowMs;
    if (walker.path.length === 0) continue;
    let left = Math.min(1, seconds * walkPace());
    let heading: Facing | null = null;
    while (left > 0 && walker.path.length > 0) {
      const next = walker.path[0] as Cell;
      // The facing was chosen for the whole leg when he set off on it, and is only looked up
      // here: reading it back off every cell was what flipped him on every step of a staircase
      // (CLAUDE.md T19 2.1).
      heading = walker.facings[0] ?? heading;
      const dx = next.x - walker.at.x;
      const dy = next.y - walker.at.y;
      const distance = Math.hypot(dx, dy);
      if (distance <= left) {
        walker.at = { x: next.x, y: next.y };
        walker.path.shift();
        walker.facings.shift();
        left -= distance;
        if (walker.path.length === 0) arrive(walker);
      } else {
        walker.at = {
          x: walker.at.x + (dx / distance) * left,
          y: walker.at.y + (dy / distance) * left,
        };
        left = 0;
      }
    }
    node.setAttribute('transform', translateOf(walker.at));
    dress(node, walker, heading);
  }
  // He is painted where his feet are: the order is checked against his neighbours every frame and
  // changed only where it has crossed one (PIOTR; CLAUDE.md T20 2.11).
  return resortFigures(root);
}
