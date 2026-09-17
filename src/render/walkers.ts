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

import { WALK_CELLS_PER_SECOND } from '../engine/constants';
import { STATION_GATE, STATION_RACK } from '../engine/stations';
import {
  type Animation,
  type Facing,
  faceCharacter,
  facingFromScreen,
  legCarries,
  setCharacterAnimation,
} from './characters';
import { centreOf } from './iso';

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

/** The walker of a figure, for the tests and nobody else. */
export function walkerOf(key: string): Walker | undefined {
  return walkers.get(key);
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

function translateOf(at: { x: number; y: number }): string {
  const feet = centreOf(at.x, at.y, 1, 1);
  return `translate(${Math.round(feet.x)},${Math.round(feet.y)})`;
}

function sameCell(a: Cell, b: { x: number; y: number }): boolean {
  return a.x === b.x && a.y === b.y;
}

/** The cell to set off from: the next cell of the path he is on, so a man mid stride finishes it
 *  and turns, or the cell he stands on. */
function setOffFrom(walker: Walker): Cell {
  const next = walker.path[0];
  if (next !== undefined) return next;
  return { x: Math.round(walker.at.x), y: Math.round(walker.at.y) };
}

/** Starts a walker on the way to a goal along the network. */
function setOff(walker: Walker, goal: Goal): void {
  const from = setOffFrom(walker);
  const cells = pathFinder(from, goal.cell);
  // The path starts on the cell he is on: nothing to walk for that one.
  const first = cells[0];
  if (first !== undefined && cells.length > 1 && sameCell(first, walker.at)) cells.shift();
  walker.path = cells;
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
    // The page was built with him at his station: put him back where he had actually got to.
    node.setAttribute('transform', translateOf(walker.at));
    dress(node, walker);
  }
  for (const key of Array.from(walkers.keys())) {
    if (!seen.has(key)) walkers.delete(key);
  }
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
 *  that is already on the page. */
export function stepWalkers(root: ParentNode, nowMs: number): void {
  for (const node of Array.from(root.querySelectorAll('[data-figure]'))) {
    const key = node.getAttribute('data-figure');
    if (key === null) continue;
    const walker = walkers.get(key);
    if (walker === undefined) continue;
    const seconds = Math.max(0, (nowMs - walker.lastMs) / 1000);
    walker.lastMs = nowMs;
    if (walker.path.length === 0) continue;
    let left = Math.min(1, seconds * WALK_CELLS_PER_SECOND);
    let heading: Facing | null = null;
    while (left > 0 && walker.path.length > 0) {
      const next = walker.path[0] as Cell;
      const dx = next.x - walker.at.x;
      const dy = next.y - walker.at.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 0) {
        const from = centreOf(walker.at.x, walker.at.y, 1, 1);
        const to = centreOf(next.x, next.y, 1, 1);
        heading = facingFromScreen(to.x - from.x, to.y - from.y);
      }
      if (distance <= left) {
        walker.at = { x: next.x, y: next.y };
        walker.path.shift();
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
}
