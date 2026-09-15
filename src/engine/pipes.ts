// The extraction pipes the game routes for the player (CLAUDE.md T13 3.19). The player decides
// where the machines stand, not how the pipes are drawn (PIOTR): a click on Connect routes a run
// from the machine's port to the nearest extractor, or to the nearest cell of a run that already
// goes to it where a tee is shorter, charges the metres, and never asks him to place an elbow.
//
// The model. A run is an ordered list of cells over the floor from the machine's port to where
// it ends: the unit's inlet, or a tee on another run. The pipe is a layer above the floor: it
// occupies no cell and blocks nothing under it, so the route is plain Manhattan on the grid with
// one elbow at most, the long leg first. The tile keys are worked out from each cell's two
// neighbours, so a straight run reads ns or ew, a corner reads by its two arms, the first cell is
// the drop and the last the inlet or the tee. When a run goes (a move, a sale, a burglary), a
// branch that joined it takes over its tail, so no pipe is ever left hanging in the air.

import { PIPE_PRICE_PER_METRE } from './constants';
import { canAfford, charge } from './economy';
import { extractionCapacityOf, extractionDemandOf } from './media';
import {
  findSpec,
  hasCentralExtraction,
  isSold,
  itemFootprint,
  itemStandsInTheHall,
  itemZone,
  ductingIsFree,
} from './machines';
import { makeId } from './rng';
import type { Equipment, GameState, PipeRun, PipeTile, PipeTileKey } from './types';

export interface PipeCheck {
  ok: boolean;
  reason: string;
}

export interface Cell {
  x: number;
  y: number;
}

/** The extraction units a pipe can run to: every fan and every central system standing in the
 *  hall or on the apron (CLAUDE.md T10 3.4, T13 3.19). */
export function pipeTargets(state: GameState): Equipment[] {
  return state.equipment.filter(
    (item) => !isSold(item) && itemStandsInTheHall(item) && extractionCapacityOf(item) > 0,
  );
}

/** True for a machine that wants a pipe at all: one with an extraction demand above zero. */
export function wantsExtraction(item: { specId: string; variantId: string }): boolean {
  return extractionDemandOf(item) > 0;
}

/** Where a machine's own footprint stands: its class's footprint, centred inside the working zone
 *  it reserves, so the anchor cell is the zone's corner and the picture is inside it
 *  (CLAUDE.md T7 3.3). A class that holds no floor is kept in a tool cabinet: its picture stands
 *  on the cell the cabinet stands on, with nothing to centre it in (T7 3.6). The one arithmetic
 *  for it: the hall draws by it and the pipe drops by it. */
export function footprintOrigin(item: {
  specId: string;
  variantId: string;
  rotated?: boolean;
  anchorX: number;
  anchorY: number;
}): { x: number; y: number; width: number; depth: number; height: number } {
  const stands = itemFootprint(item);
  const zone = itemZone(item);
  const inZone = zone.width > 0 && zone.depth > 0;
  return {
    x: item.anchorX + (inZone ? (zone.width - stands.width) / 2 : 0),
    y: item.anchorY + (inZone ? (zone.depth - stands.depth) / 2 : 0),
    width: stands.width,
    depth: stands.depth,
    height: stands.height,
  };
}

/** The cell the drop lands on: the first cell of the machine's own footprint, where its port is
 *  (CLAUDE.md T13 3.19). The gate collar sits on the same cell (T13 3.11). The same question of
 *  a unit gives the cell its inlet is on. */
export function portCell(item: {
  specId: string;
  variantId: string;
  rotated?: boolean;
  anchorX: number;
  anchorY: number;
}): Cell {
  const origin = footprintOrigin(item);
  return { x: Math.floor(origin.x), y: Math.floor(origin.y) };
}

export function pipeRunFor(state: GameState, equipmentId: string): PipeRun | null {
  return state.pipes.find((run) => run.equipmentId === equipmentId) ?? null;
}

/** Connected to the extraction: a run of pipe to a unit, or a hall on a central system whose
 *  ducts reach everything (CLAUDE.md T13 3.19, T10 3.4). A machine that wants no extraction is
 *  never unconnected. */
export function isConnected(state: GameState, item: Equipment): boolean {
  if (!wantsExtraction(item)) return true;
  if (hasCentralExtraction(state)) return true;
  return pipeRunFor(state, item.id) !== null;
}

/** The machines in the hall that want a pipe and have none. */
export function unconnectedMachines(state: GameState): Equipment[] {
  return state.equipment.filter(
    (item) => !isSold(item) && itemStandsInTheHall(item) && !isConnected(state, item),
  );
}

// ---------------------------------------------------------------------------
// The path: Manhattan on the grid, the long leg first, one elbow at most.
// ---------------------------------------------------------------------------

function sameCell(left: Cell, right: Cell): boolean {
  return left.x === right.x && left.y === right.y;
}

function manhattan(from: Cell, to: Cell): number {
  return Math.abs(from.x - to.x) + Math.abs(from.y - to.y);
}

/** Every cell from one to the other, both included: straight where they share a row or a column,
 *  an L with one corner otherwise, the longer leg first so the run reads as one straight length
 *  with a short turn at its end (CLAUDE.md T13 3.19: "preferring straight runs"). On a tie the
 *  run goes along x first. */
export function pathBetween(from: Cell, to: Cell): Cell[] {
  const cells: Cell[] = [{ x: from.x, y: from.y }];
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const xFirst = Math.abs(dx) >= Math.abs(dy);
  const walk = (axis: 'x' | 'y'): void => {
    const last = cells[cells.length - 1] ?? from;
    const step = Math.sign(axis === 'x' ? to.x - last.x : to.y - last.y);
    if (step === 0) return;
    let at = { ...last };
    while ((axis === 'x' ? at.x : at.y) !== (axis === 'x' ? to.x : to.y)) {
      at = axis === 'x' ? { x: at.x + step, y: at.y } : { x: at.x, y: at.y + step };
      cells.push(at);
    }
  };
  walk(xFirst ? 'x' : 'y');
  walk(xFirst ? 'y' : 'x');
  return cells;
}

/** Which way a neighbour lies from a cell: north is world minus y, east is world plus x
 *  (docs/art/SPRITES.md 1). */
function armTo(cell: Cell, neighbour: Cell): 'n' | 's' | 'e' | 'w' {
  if (neighbour.y < cell.y) return 'n';
  if (neighbour.y > cell.y) return 's';
  return neighbour.x > cell.x ? 'e' : 'w';
}

/** The tile a cell of a run is drawn with, from the arms it has (CLAUDE.md T13 3.19): the first
 *  cell is the drop to the machine, the last the inlet into the unit or the tee onto another run,
 *  and every cell between is straight or an elbow named by its two arms, the north or south arm
 *  first. */
export function tileKeysFor(cells: readonly Cell[], end: 'inlet' | 'tee'): PipeTile[] {
  return cells.map((cell, index): PipeTile => {
    if (index === 0) return { x: cell.x, y: cell.y, key: 'pipe.drop' };
    if (index === cells.length - 1) {
      return { x: cell.x, y: cell.y, key: end === 'tee' ? 'pipe.tee' : 'pipe.inlet' };
    }
    const before = cells[index - 1];
    const after = cells[index + 1];
    if (before === undefined || after === undefined) {
      return { x: cell.x, y: cell.y, key: 'pipe.ns' };
    }
    const arms = [armTo(cell, before), armTo(cell, after)];
    const vertical = arms.find((arm) => arm === 'n' || arm === 's');
    const horizontal = arms.find((arm) => arm === 'e' || arm === 'w');
    let key: PipeTileKey;
    if (vertical === undefined) key = 'pipe.ew';
    else if (horizontal === undefined) key = 'pipe.ns';
    else key = `pipe.${vertical}${horizontal}` as PipeTileKey;
    return { x: cell.x, y: cell.y, key };
  });
}

/** The cells of a run, in order from the drop. */
export function runCells(run: PipeRun): Cell[] {
  return run.tiles.map((tile) => ({ x: tile.x, y: tile.y }));
}

/** The cells of a run a tee may land on: everything but its drop, which is the vertical to a
 *  machine and not a length of run. */
function joinableCells(run: PipeRun): Cell[] {
  return run.tiles.filter((tile) => tile.key !== 'pipe.drop').map((tile) => ({ x: tile.x, y: tile.y }));
}

/** The shortest way from a machine to a unit: straight to its inlet, or onto the nearest cell of
 *  a run that already goes to it, where that is shorter (CLAUDE.md T13 3.19). The cells, and how
 *  the run ends. On a tie the run goes to the unit itself: fewer tees. */
function bestPath(
  state: GameState,
  from: Cell,
  target: Equipment,
): { cells: Cell[]; end: 'inlet' | 'tee' } {
  const inlet = portCell(target);
  let best: { cells: Cell[]; end: 'inlet' | 'tee' } = { cells: pathBetween(from, inlet), end: 'inlet' };
  for (const run of state.pipes) {
    if (run.extractorId !== target.id) continue;
    for (const cell of joinableCells(run)) {
      // The run passes over the port itself: the tee goes on the next cell along, a metre off,
      // so the drop is still a drop and the tee still a tee.
      if (sameCell(cell, from)) continue;
      if (manhattan(from, cell) + 1 >= best.cells.length) continue;
      best = { cells: pathBetween(from, cell), end: 'tee' };
    }
  }
  return best;
}

/** What a run of these cells measures: the metres of pipe between the drop and the end, and never
 *  less than one. */
function metresOf(cells: readonly Cell[]): number {
  return Math.max(1, cells.length - 1);
}

/** The nearest unit to this machine, by the walk of the pipe, a tee onto one of its runs counted
 *  as the walk to that tee. Null with no unit in the hall. */
export function nearestTarget(state: GameState, item: Equipment): Equipment | null {
  const from = portCell(item);
  let best: Equipment | null = null;
  let bestLength = Infinity;
  for (const target of pipeTargets(state)) {
    const length = metresOf(bestPath(state, from, target).cells);
    if (length < bestLength) {
      best = target;
      bestLength = length;
    }
  }
  return best;
}

/** The run from this machine to this unit, routed by the game: the drop on the machine's port,
 *  the tiles over the floor, the inlet into the unit or the tee onto a run that already goes to
 *  it, and the metres the length is charged by (CLAUDE.md T13 3.19). Nothing is written to the
 *  state: `connectExtraction` does that once the cost is agreed. */
export function routePipe(state: GameState, item: Equipment, target: Equipment): PipeRun {
  const path = bestPath(state, portCell(item), target);
  return {
    id: makeId(state, 'pipe'),
    equipmentId: item.id,
    extractorId: target.id,
    tiles: tileKeysFor(path.cells, path.end),
    metres: metresOf(path.cells),
  };
}

/** What a run costs: its metres at the price a metre, and nothing with the flexi system, whose
 *  ducting never costs again (CLAUDE.md T4 3.5, T13 3.19). */
export function pipeCostFor(state: GameState, run: PipeRun): number {
  if (ductingIsFree(state)) return 0;
  return Math.round(run.metres * PIPE_PRICE_PER_METRE * 100) / 100;
}

/** Why this machine cannot be connected, or that it can, with what it would cost. */
export function connectCheck(state: GameState, equipmentId: string): PipeCheck & { cost: number } {
  const item = state.equipment.find((entry) => entry.id === equipmentId);
  if (!item) return { ok: false, reason: 'No such machine', cost: 0 };
  if (!wantsExtraction(item)) return { ok: false, reason: 'It wants no extraction', cost: 0 };
  if (!itemStandsInTheHall(item)) return { ok: false, reason: 'It lives in a tool cabinet', cost: 0 };
  if (hasCentralExtraction(state)) return { ok: false, reason: 'The ducts reach it already', cost: 0 };
  if (pipeRunFor(state, item.id) !== null) return { ok: false, reason: 'Connected already', cost: 0 };
  const target = nearestTarget(state, item);
  if (target === null) return { ok: false, reason: 'No extractor in the hall', cost: 0 };
  const cost = pipeCostFor(state, routePipe(state, item, target));
  if (!canAfford(state, cost)) return { ok: false, reason: 'Not enough cash', cost };
  return { ok: true, reason: '', cost };
}

/** Connects the machine: the game routes the pipe and charges the length. The player never draws
 *  a pipe (PIOTR; CLAUDE.md T13 3.19). */
export function connectExtraction(state: GameState, equipmentId: string): PipeCheck {
  const check = connectCheck(state, equipmentId);
  if (!check.ok) return check;
  const item = state.equipment.find((entry) => entry.id === equipmentId);
  const target = item ? nearestTarget(state, item) : null;
  if (!item || !target) return { ok: false, reason: 'No extractor in the hall' };
  const run = routePipe(state, item, target);
  const cost = pipeCostFor(state, run);
  const name = findSpec(item.specId)?.name ?? item.specId;
  if (cost > 0) charge(state, 'pipes', `Extraction pipe: ${name.toLowerCase()}, ${run.metres} m`, -cost);
  state.pipes.push(run);
  return { ok: true, reason: '' };
}

/** True while some run other than the one named covers this cell. */
function coveredByAnother(state: GameState, cell: Cell, exceptId: string): boolean {
  return state.pipes.some(
    (run) => run.id !== exceptId && run.tiles.some((tile) => sameCell(tile, cell)),
  );
}

/** Takes a run out, and hands its tail to the branches that joined it, so the pipe that was paid
 *  for stays on the ceiling and every branch still reaches the unit: the branch nearest the end
 *  takes the whole tail, and a branch nearer the drop takes the tail up to the first cell another
 *  run now covers and ends in a tee on it. Refunds nothing (CLAUDE.md T13 3.19). */
function removeRun(state: GameState, runId: string): void {
  const run = state.pipes.find((entry) => entry.id === runId);
  if (!run) return;
  state.pipes = state.pipes.filter((entry) => entry.id !== run.id);
  const cells = runCells(run);
  const endKind: 'inlet' | 'tee' =
    run.tiles[run.tiles.length - 1]?.key === 'pipe.tee' ? 'tee' : 'inlet';
  const branches = state.pipes
    .map((branch) => {
      const last = branch.tiles[branch.tiles.length - 1];
      if (last === undefined || last.key !== 'pipe.tee') return null;
      const at = cells.findIndex((cell) => sameCell(cell, last));
      return at < 0 ? null : { branch, at };
    })
    .filter((entry): entry is { branch: PipeRun; at: number } => entry !== null)
    .sort((left, right) => right.at - left.at);
  for (const { branch, at } of branches) {
    const last = branch.tiles[branch.tiles.length - 1];
    if (last === undefined || coveredByAnother(state, last, branch.id)) continue;
    const own = runCells(branch);
    const tail: Cell[] = [];
    let end = endKind;
    for (const cell of cells.slice(at + 1)) {
      tail.push(cell);
      if (coveredByAnother(state, cell, branch.id)) {
        end = 'tee';
        break;
      }
    }
    const joined = [...own, ...tail];
    branch.tiles = tileKeysFor(joined, end);
    branch.metres = metresOf(joined);
  }
}

/** Moving a machine disconnects it and refunds nothing (CLAUDE.md T13 3.19). */
export function disconnectExtraction(state: GameState, equipmentId: string): void {
  for (const run of state.pipes.filter((entry) => entry.equipmentId === equipmentId)) {
    removeRun(state, run.id);
  }
}

/** A run whose machine or unit has gone is gone with it, and the branches on it take its tail. */
export function dropOrphanPipes(state: GameState): void {
  const ids = new Set(state.equipment.map((item) => item.id));
  for (const run of state.pipes.slice()) {
    if (ids.has(run.equipmentId) && ids.has(run.extractorId)) continue;
    removeRun(state, run.id);
  }
}
