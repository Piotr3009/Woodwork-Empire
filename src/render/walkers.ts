// The walker (CLAUDE.md T16 2.2). One walker per figure on the page: the cell it is at, the path
// it is on, and the goals still to walk to. The engine says where and along which cells (the
// figure's standing cell, on the group as data-cell, and walkPath over the free cells); the
// walker says when: on every frame it advances along its path at a man's pace in real seconds,
// whatever the game's clock is doing, sets the figure's transform to the point between two
// cells, plays carry on a leg that carries material and walk on the rest, and faces the way it
// is going. On arrival it plays the station's animation and faces the item. A figure never
// jumps: when the engine sends it somewhere else it sets off from wherever it had got to, and
// only a view built from nothing (a load, a scene change) starts it at its station's cell.
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
  /** The goals queued behind the one he is on: the legs of an unloading, kept in order. */
  goals: Goal[];
  /** The last goal the page gave him, so a rebuilt page is not a new order. */
  lastGoal: string;
  /** He was on the loop between the pallet and the rack when the page was last built. */
  unloading: boolean;
  /** The pallet's goal as the page last gave it while he was unloading, so a loop cut short by
   *  the engine is still walked back to the pallet before he goes elsewhere. */
  pallet: Goal | null;
  lastMs: number;
  /** Every goal he arrived at, in order: the test's log. */
  arrivals: Arrival[];
  /** Loops of the unloading completed: arrivals at the pallet after a visit to the rack. */
  loops: number;
  sawRack: boolean;
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

function cellOf(node: Element): Cell | null {
  const raw = node.getAttribute('data-cell') ?? '';
  const [x, y] = raw.split(',').map(Number);
  if (x === undefined || y === undefined || Number.isNaN(x) || Number.isNaN(y)) return null;
  return { x, y };
}

function translateOf(at: { x: number; y: number }): string {
  const feet = centreOf(at.x, at.y, 1, 1);
  return `translate(${Math.round(feet.x)},${Math.round(feet.y)})`;
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
  if (
    first !== undefined &&
    cells.length > 1 &&
    first.x === walker.at.x &&
    first.y === walker.at.y
  ) {
    cells.shift();
  }
  walker.path = cells;
  walker.fromStation = walker.station;
  walker.station = goal.station;
}

/** Reads the figures the page has just been built with and gives every walker its orders: a new
 *  figure stands where the page put it; a known one is put back where it had got to and, when the
 *  engine has sent it somewhere else, sets off from there. A figure on the loop of an unloading
 *  keeps its legs in order: a new leg goes behind the one it is on, never in front of it. */
export function syncWalkers(root: ParentNode, nowMs: number, pathFor: PathFinder): void {
  pathFinder = pathFor;
  const seen = new Set<string>();
  for (const node of Array.from(root.querySelectorAll('[data-figure]'))) {
    const key = node.getAttribute('data-figure');
    const cell = cellOf(node);
    if (key === null || cell === null) continue;
    seen.add(key);
    const station = node.getAttribute('data-station') ?? '';
    const unloading = node.getAttribute('data-unloading') === '1';
    const goal = goalKey(cell, station);
    let walker = walkers.get(key);
    if (walker === undefined) {
      walker = {
        key,
        at: { x: cell.x, y: cell.y },
        path: [],
        station,
        fromStation: station,
        goals: [],
        lastGoal: goal,
        unloading,
        pallet: unloading && station === STATION_GATE ? { cell, station } : null,
        lastMs: nowMs,
        arrivals: [],
        loops: 0,
        sawRack: false,
      };
      walkers.set(key, walker);
      continue;
    }
    if (goal !== walker.lastGoal) {
      walker.lastGoal = goal;
      const next: Goal = { cell, station };
      if (unloading && station === STATION_GATE) walker.pallet = next;
      const onALoop = walker.unloading || unloading;
      if (onALoop) {
        if (!unloading) {
          // The unloading is over: the engine finished before he did, so he walks the legs still
          // queued, one loop a trip, finishes the loop he is on back at the pallet, and then goes
          // to his new station (CLAUDE.md T16 2.2).
          const lastStation = walker.goals[walker.goals.length - 1]?.station ?? walker.station;
          if (lastStation !== STATION_GATE && walker.pallet !== null) walker.goals.push(walker.pallet);
          walker.pallet = null;
        }
        if (walker.path.length === 0 && walker.goals.length === 0) {
          setOff(walker, next);
        } else {
          walker.goals.push(next);
        }
      } else {
        walker.goals = [];
        setOff(walker, next);
      }
    }
    walker.unloading = unloading;
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

/** He has arrived at the goal he was on: the log, the loop count, and the next goal if there is
 *  one. */
function arrive(walker: Walker): void {
  walker.arrivals.push({ cell: { x: walker.at.x, y: walker.at.y }, station: walker.station });
  if (walker.station === STATION_RACK) walker.sawRack = true;
  if (walker.station === STATION_GATE && walker.sawRack) {
    walker.loops += 1;
    walker.sawRack = false;
  }
  const next = walker.goals.shift();
  if (next !== undefined) setOff(walker, next);
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
