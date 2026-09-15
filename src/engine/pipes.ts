// The extraction pipes the game routes for the player (CLAUDE.md T13 3.19). Phase A: the
// connection model and a straight Manhattan route, so the rule that an unconnected machine is not
// served holds from tonight; phase B4 writes the real routing (straight runs preferred, a tee onto
// an existing run where cheaper) and the rendering.

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
 *  (CLAUDE.md T13 3.19). The gate collar sits on the same cell (T13 3.11). */
export function portCell(item: {
  specId: string;
  variantId: string;
  rotated?: boolean;
  anchorX: number;
  anchorY: number;
}): { x: number; y: number } {
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

function manhattan(a: { anchorX: number; anchorY: number }, b: { anchorX: number; anchorY: number }): number {
  return Math.abs(a.anchorX - b.anchorX) + Math.abs(a.anchorY - b.anchorY);
}

/** The nearest unit to this machine, by the walk of the pipe. Null with no unit in the hall. */
export function nearestTarget(state: GameState, item: Equipment): Equipment | null {
  let best: Equipment | null = null;
  let bestLength = Infinity;
  for (const target of pipeTargets(state)) {
    const length = manhattan(item, target);
    if (length < bestLength) {
      best = target;
      bestLength = length;
    }
  }
  return best;
}

/** Phase A's route: along x then along y, one tile a cell, a drop at the machine and an inlet at
 *  the unit. Phase B4 replaces it with the real algorithm (straight runs preferred, tees onto an
 *  existing run) and keeps this signature. */
export function routePipe(state: GameState, item: Equipment, target: Equipment): PipeRun {
  const tiles: PipeTile[] = [];
  let x = item.anchorX;
  let y = item.anchorY;
  tiles.push({ x, y, key: 'pipe.drop' });
  const stepX = Math.sign(target.anchorX - x);
  const stepY = Math.sign(target.anchorY - y);
  while (x !== target.anchorX) {
    x += stepX;
    const key: PipeTileKey = x === target.anchorX && y !== target.anchorY
      ? (stepY > 0 ? (stepX > 0 ? 'pipe.sw' : 'pipe.se') : (stepX > 0 ? 'pipe.nw' : 'pipe.ne'))
      : 'pipe.ew';
    tiles.push({ x, y, key });
  }
  while (y !== target.anchorY) {
    y += stepY;
    tiles.push({ x, y, key: 'pipe.ns' });
  }
  const last = tiles[tiles.length - 1];
  if (last !== undefined && tiles.length > 1) last.key = 'pipe.inlet';
  return {
    id: makeId(state, 'pipe'),
    equipmentId: item.id,
    extractorId: target.id,
    tiles,
    metres: Math.max(1, manhattan(item, target)),
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

/** Moving a machine disconnects it and refunds nothing (CLAUDE.md T13 3.19). */
export function disconnectExtraction(state: GameState, equipmentId: string): void {
  state.pipes = state.pipes.filter((run) => run.equipmentId !== equipmentId);
}

/** A run whose machine or unit has gone is gone with it. */
export function dropOrphanPipes(state: GameState): void {
  const ids = new Set(state.equipment.map((item) => item.id));
  state.pipes = state.pipes.filter((run) => ids.has(run.equipmentId) && ids.has(run.extractorId));
}
