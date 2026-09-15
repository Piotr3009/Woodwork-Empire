// The extraction pipes the game routes for the player (PIOTR; CLAUDE.md T13 3.19): Manhattan on
// the grid, the long leg first, a tee onto an existing run where that is shorter, charged by the
// metre, a layer above the floor that occupies no cell. The player never draws a pipe.

import { describe, expect, it } from 'vitest';
import { PIPE_PRICE_PER_METRE, PIPE_TILE_KEYS } from '../../src/engine/constants';
import { canPlaceSpec, freeFloorM2 } from '../../src/engine/layout';
import {
  connectCheck,
  connectExtraction,
  disconnectExtraction,
  dropOrphanPipes,
  isConnected,
  nearestTarget,
  pathBetween,
  pipeCostFor,
  pipeRunFor,
  portCell,
  routePipe,
  tileKeysFor,
  unconnectedMachines,
} from '../../src/engine/pipes';
import type { Equipment, GameState, PipeRun } from '../../src/engine/index';
import { newGame, placeEquipment } from '../helpers';

/** A small hall: one standard fan at the right, and nothing on the extraction yet. The helper
 *  connects what it stands for free, so the runs are cleared and the tests connect by hand. */
function hall(): { state: GameState; fan: Equipment } {
  const state = newGame({ difficulty: 'veryEasy' });
  const fan = placeEquipment(state, 'extractor', { variantId: 'standard', x: 18, y: 3, id: 'kit-fan' });
  state.pipes = [];
  return { state, fan };
}

/** A standard saw stands 3 by 1 in a 4 by 3 zone: its port is one cell down from its anchor. */
function saw(state: GameState, id: string, x: number, y: number): Equipment {
  // The helper connects everything it finds unconnected: the runs are what they were before.
  const pipes = state.pipes.slice();
  const item = placeEquipment(state, 'tableSaw', { variantId: 'standard', x, y, id });
  state.pipes = pipes;
  return item;
}

function keys(run: PipeRun | null): string[] {
  return (run?.tiles ?? []).map((tile) => tile.key);
}

function last(run: PipeRun | null): { x: number; y: number; key: string } | undefined {
  return run?.tiles[run.tiles.length - 1];
}

describe('the path between two cells', () => {
  it('is straight along a row or a column, both ends included', () => {
    expect(pathBetween({ x: 2, y: 5 }, { x: 5, y: 5 })).toEqual([
      { x: 2, y: 5 },
      { x: 3, y: 5 },
      { x: 4, y: 5 },
      { x: 5, y: 5 },
    ]);
    expect(pathBetween({ x: 4, y: 6 }, { x: 4, y: 3 }).map((cell) => cell.y)).toEqual([6, 5, 4, 3]);
    expect(pathBetween({ x: 4, y: 6 }, { x: 4, y: 6 })).toEqual([{ x: 4, y: 6 }]);
  });

  it('turns once, the long leg first, and along x on a tie', () => {
    // Ten along x and three along y: x first, then the short turn at the end.
    const long = pathBetween({ x: 8, y: 6 }, { x: 18, y: 3 });
    expect(long).toHaveLength(14);
    expect(long.slice(0, 11).every((cell) => cell.y === 6)).toBe(true);
    expect(long.slice(11).every((cell) => cell.x === 18)).toBe(true);
    // Two along x and five along y: y first.
    const tall = pathBetween({ x: 3, y: 1 }, { x: 5, y: 6 });
    expect(tall.slice(0, 6).every((cell) => cell.x === 3)).toBe(true);
    expect(tall.slice(6).every((cell) => cell.y === 6)).toBe(true);
    // A tie goes along x first.
    const tie = pathBetween({ x: 0, y: 0 }, { x: 3, y: 3 });
    expect(tie[1]).toEqual({ x: 1, y: 0 });
    // Every path is a metre a cell: Manhattan plus the cell it starts on.
    expect(long).toHaveLength(10 + 3 + 1);
    expect(tall).toHaveLength(2 + 5 + 1);
  });
});

describe('the tiles of a run', () => {
  it('are the drop, the straights and the elbows named by their arms, then the inlet or the tee', () => {
    // East along the row, then south down the column: the corner has a west arm and a south arm.
    const cells = [
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      { x: 5, y: 2 },
      { x: 5, y: 3 },
      { x: 5, y: 4 },
      { x: 5, y: 5 },
    ];
    expect(tileKeysFor(cells, 'inlet').map((tile) => tile.key)).toEqual([
      'pipe.drop',
      'pipe.ew',
      'pipe.ew',
      'pipe.sw',
      'pipe.ns',
      'pipe.ns',
      'pipe.inlet',
    ]);
    // North up the column, then east: a south arm and an east arm.
    const up = [
      { x: 5, y: 5 },
      { x: 5, y: 4 },
      { x: 5, y: 3 },
      { x: 6, y: 3 },
      { x: 7, y: 3 },
    ];
    expect(tileKeysFor(up, 'tee').map((tile) => tile.key)).toEqual([
      'pipe.drop',
      'pipe.ns',
      'pipe.se',
      'pipe.ew',
      'pipe.tee',
    ]);
    // West then north: an east arm and a north arm; east then north: west and north.
    expect(tileKeysFor([{ x: 4, y: 4 }, { x: 3, y: 4 }, { x: 3, y: 3 }, { x: 3, y: 2 }], 'inlet')[1]?.key).toBe('pipe.ne');
    expect(tileKeysFor([{ x: 2, y: 4 }, { x: 3, y: 4 }, { x: 3, y: 3 }, { x: 3, y: 2 }], 'inlet')[1]?.key).toBe('pipe.nw');
    // Every key a run can carry is one of the eight the art side is asked for.
    for (const tile of tileKeysFor(cells, 'tee')) expect(PIPE_TILE_KEYS).toContain(tile.key);
  });
});

describe('routing a machine to the extraction', () => {
  it('runs straight along the row when the port and the inlet share it', () => {
    const { state, fan } = hall();
    const inlet = portCell(fan);
    const item = saw(state, 'kit-saw-a', 4, inlet.y - 1);
    expect(portCell(item)).toEqual({ x: 4, y: inlet.y });
    const run = routePipe(state, item, fan);
    expect(run.equipmentId).toBe('kit-saw-a');
    expect(run.extractorId).toBe('kit-fan');
    expect(run.metres).toBe(inlet.x - 4);
    expect(run.tiles).toHaveLength(inlet.x - 4 + 1);
    expect(keys(run)[0]).toBe('pipe.drop');
    expect(keys(run)[keys(run).length - 1]).toBe('pipe.inlet');
    expect(keys(run).slice(1, -1).every((key) => key === 'pipe.ew')).toBe(true);
  });

  it('turns once when they do not, and the elbow reads by its arms', () => {
    const { state, fan } = hall();
    const inlet = portCell(fan);
    // The port three rows below the inlet and ten cells to its left: along the row, then up.
    const item = saw(state, 'kit-saw-b', inlet.x - 10, inlet.y + 2);
    const run = routePipe(state, item, fan);
    expect(run.metres).toBe(13);
    const elbows = run.tiles.filter((tile) => /pipe\.[ns][ew]/.test(tile.key));
    expect(elbows).toHaveLength(1);
    expect(elbows[0]).toEqual({ x: inlet.x, y: inlet.y + 3, key: 'pipe.nw' });
    expect(run.tiles.filter((tile) => tile.key === 'pipe.ew')).toHaveLength(9);
    expect(run.tiles.filter((tile) => tile.key === 'pipe.ns')).toHaveLength(2);
  });

  it('joins an existing run with a tee where that is shorter, to the same unit', () => {
    const { state, fan } = hall();
    const inlet = portCell(fan);
    const first = saw(state, 'kit-saw-a', 4, inlet.y - 1);
    expect(connectExtraction(state, first.id).ok).toBe(true);
    const second = saw(state, 'kit-saw-b', 8, inlet.y + 2);
    // Straight to the unit is thirteen metres; up to the run over its head is three.
    expect(connectCheck(state, second.id).cost).toBe(3 * PIPE_PRICE_PER_METRE);
    expect(connectExtraction(state, second.id).ok).toBe(true);
    const branch = pipeRunFor(state, second.id);
    expect(branch?.metres).toBe(3);
    expect(branch?.extractorId).toBe('kit-fan');
    expect(keys(branch)).toEqual(['pipe.drop', 'pipe.ns', 'pipe.ns', 'pipe.tee']);
    const tee = last(branch);
    expect(tee).toEqual({ x: 8, y: inlet.y, key: 'pipe.tee' });
    // The tee sits on a cell of the first run.
    expect(pipeRunFor(state, first.id)?.tiles.some((tile) => tile.x === 8 && tile.y === inlet.y)).toBe(true);
    expect(isConnected(state, second)).toBe(true);
  });

  it('never tees onto a run to another unit, and goes to the unit itself on a tie', () => {
    const { state, fan } = hall();
    const inlet = portCell(fan);
    const far = placeEquipment(state, 'extractor', { variantId: 'standard', x: 1, y: 9, id: 'kit-fan-far' });
    state.pipes = [];
    const first = saw(state, 'kit-saw-a', 2, 7);
    expect(nearestTarget(state, first)?.id).toBe(far.id);
    expect(connectExtraction(state, first.id).ok).toBe(true);
    // A saw beside the far fan's run but nearer the main fan: the run over its head goes to the
    // wrong unit for a tee to be cheaper than the walk it saves.
    const second = saw(state, 'kit-saw-b', 14, inlet.y - 1);
    const run = routePipe(state, second, fan);
    expect(run.extractorId).toBe('kit-fan');
    expect(last(run)?.key).toBe('pipe.inlet');
  });

  it('charges the metres at the price a metre, once, in the ledger', () => {
    const { state, fan } = hall();
    const inlet = portCell(fan);
    const item = saw(state, 'kit-saw-a', 4, inlet.y - 1);
    const metres = inlet.x - 4;
    const before = state.cash;
    expect(connectCheck(state, item.id)).toEqual({ ok: true, reason: '', cost: metres * PIPE_PRICE_PER_METRE });
    expect(pipeCostFor(state, routePipe(state, item, fan))).toBe(metres * PIPE_PRICE_PER_METRE);
    expect(connectExtraction(state, item.id).ok).toBe(true);
    expect(state.cash).toBe(before - metres * PIPE_PRICE_PER_METRE);
    const line = state.ledger[state.ledger.length - 1];
    expect(line?.category).toBe('pipes');
    expect(line?.amount).toBe(-metres * PIPE_PRICE_PER_METRE);
    expect(line?.label).toBe(`Extraction pipe: table saw, ${metres} m`);
    // A second click on Connect does nothing more (CLAUDE.md T13 1).
    expect(connectExtraction(state, item.id)).toMatchObject({ ok: false, reason: 'Connected already' });
    expect(state.cash).toBe(before - metres * PIPE_PRICE_PER_METRE);
    expect(unconnectedMachines(state)).toEqual([]);
  });

  it('occupies no cell and blocks nothing under it', () => {
    const { state, fan } = hall();
    const inlet = portCell(fan);
    const item = saw(state, 'kit-saw-a', 4, inlet.y - 1);
    const floor = freeFloorM2(state);
    expect(connectExtraction(state, item.id).ok).toBe(true);
    const run = pipeRunFor(state, item.id);
    // A cell under the middle of the run, clear of the saw's zone and of the fan.
    const under = run?.tiles[6];
    if (!under) throw new Error('no run');
    expect(canPlaceSpec(state, 'workbench', under.x, under.y, null, 'budget').ok).toBe(true);
    expect(freeFloorM2(state)).toBe(floor);
  });

  it('runs to the nearer of two extractors', () => {
    const { state, fan } = hall();
    const near = placeEquipment(state, 'extractor', { variantId: 'standard', x: 2, y: 8, id: 'kit-fan-near' });
    state.pipes = [];
    const item = saw(state, 'kit-saw-b', 8, 5);
    expect(nearestTarget(state, item)?.id).toBe(near.id);
    expect(connectExtraction(state, item.id).ok).toBe(true);
    expect(pipeRunFor(state, item.id)?.extractorId).toBe(near.id);
    expect(pipeRunFor(state, item.id)?.extractorId).not.toBe(fan.id);
  });

  it('refunds nothing on a disconnection and charges the new length on a reconnection', () => {
    const { state, fan } = hall();
    const inlet = portCell(fan);
    const item = saw(state, 'kit-saw-a', 4, inlet.y - 1);
    const start = state.cash;
    expect(connectExtraction(state, item.id).ok).toBe(true);
    const paid = start - state.cash;
    disconnectExtraction(state, item.id);
    expect(state.cash).toBe(start - paid);
    expect(pipeRunFor(state, item.id)).toBeNull();
    expect(isConnected(state, item)).toBe(false);
    // Moved nearer the fan: the new run is shorter and is charged at its own length.
    item.anchorX = 12;
    expect(connectExtraction(state, item.id).ok).toBe(true);
    const again = pipeRunFor(state, item.id);
    expect(again?.metres).toBe(inlet.x - 12);
    expect(state.cash).toBe(start - paid - (inlet.x - 12) * PIPE_PRICE_PER_METRE);
  });

  it('hands a trunk that goes to the branch on it, so no pipe is left hanging', () => {
    const { state, fan } = hall();
    const inlet = portCell(fan);
    const first = saw(state, 'kit-saw-a', 4, inlet.y - 1);
    expect(connectExtraction(state, first.id).ok).toBe(true);
    const second = saw(state, 'kit-saw-b', 8, inlet.y + 2);
    expect(connectExtraction(state, second.id).ok).toBe(true);
    expect(last(pipeRunFor(state, second.id))?.key).toBe('pipe.tee');
    // The first saw is moved: its run goes, and the branch takes over the tail to the inlet.
    disconnectExtraction(state, first.id);
    expect(pipeRunFor(state, first.id)).toBeNull();
    const branch = pipeRunFor(state, second.id);
    expect(branch).not.toBeNull();
    expect(isConnected(state, second)).toBe(true);
    expect(last(branch)).toEqual({ x: inlet.x, y: inlet.y, key: 'pipe.inlet' });
    expect(branch?.metres).toBe(3 + (inlet.x - 8));
    // Up the column, round the corner, along the row: the old tee is an elbow now.
    expect(keys(branch).slice(0, 4)).toEqual(['pipe.drop', 'pipe.ns', 'pipe.ns', 'pipe.se']);
    expect(keys(branch).slice(4, -1).every((key) => key === 'pipe.ew')).toBe(true);
    // Nothing was refunded and nothing charged for the hand over.
    expect(state.ledger.filter((line) => line.category === 'pipes')).toHaveLength(2);
  });

  it('drops every run whose machine or unit has gone', () => {
    const { state, fan } = hall();
    const inlet = portCell(fan);
    const first = saw(state, 'kit-saw-a', 4, inlet.y - 1);
    const second = saw(state, 'kit-saw-b', 8, inlet.y + 2);
    expect(connectExtraction(state, first.id).ok).toBe(true);
    expect(connectExtraction(state, second.id).ok).toBe(true);
    state.equipment = state.equipment.filter((item) => item.id !== fan.id);
    dropOrphanPipes(state);
    expect(state.pipes).toEqual([]);
    expect(unconnectedMachines(state)).toHaveLength(2);
  });

  it('refuses a machine that wants no extraction, and one already on a central system', () => {
    const { state } = hall();
    const bench = placeEquipment(state, 'workbench', { variantId: 'budget', x: 2, y: 8, id: 'kit-bench' });
    expect(connectCheck(state, bench.id)).toEqual({ ok: false, reason: 'It wants no extraction', cost: 0 });
    expect(isConnected(state, bench)).toBe(true);
    placeEquipment(state, 'dustSystem', { x: 20, y: 1, id: 'kit-central' });
    const item = saw(state, 'kit-saw-a', 4, 2);
    expect(connectCheck(state, item.id).reason).toBe('The ducts reach it already');
    expect(isConnected(state, item)).toBe(true);
  });
});
