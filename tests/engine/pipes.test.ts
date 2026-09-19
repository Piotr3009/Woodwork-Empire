// The extraction pipes the game routes for the player (PIOTR; CLAUDE.md T13 3.19): Manhattan on
// the grid, the long leg first, a tee onto an existing run where that is shorter, charged by the
// metre, a layer above the floor that occupies no cell. The player never draws a pipe.

import { describe, expect, it } from 'vitest';
import { PIPE_PRICE_PER_METRE } from '../../src/engine/constants';
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

/** A standard saw stands 3 by 1 in a 4 by 3 zone, and its port is the cell `PORTS` measured on
 *  `tableSaw.standard.png`: one cell in from the corner of its own footprint, which is one cell
 *  right of the zone's corner (CLAUDE.md T22 2.8). Every test below asks `portCell` where the run
 *  starts rather than working it out from the anchor, because the table is the answer now and a
 *  measurement Piotr retunes must not move a test's arithmetic. */
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

describe('the cells of a run and its two ends (CLAUDE.md T22 2.7)', () => {
  it('is the drop, the cells between, and the inlet or the tee, with no direction on any of them', () => {
    // East along the row, then south down the column. Which way the pipe lies over a cell was a
    // tile key until tonight, because each was a picture of its own; a run is one path now and the
    // path works its corners out from the cells, so the key says only which end is which.
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
      'pipe.run',
      'pipe.run',
      'pipe.run',
      'pipe.run',
      'pipe.run',
      'pipe.inlet',
    ]);
    // The cells themselves are kept in order, which is what the drawing and the routing read.
    expect(tileKeysFor(cells, 'inlet').map((tile) => ({ x: tile.x, y: tile.y }))).toEqual(cells);
    // A run that tees onto another says so on its last cell, whichever way it came.
    const up = [
      { x: 5, y: 5 },
      { x: 5, y: 4 },
      { x: 5, y: 3 },
      { x: 6, y: 3 },
      { x: 7, y: 3 },
    ];
    expect(tileKeysFor(up, 'tee').map((tile) => tile.key)).toEqual([
      'pipe.drop',
      'pipe.run',
      'pipe.run',
      'pipe.run',
      'pipe.tee',
    ]);
    // The seven drawn tiles of Turn 13 are gone: nothing names an elbow or a straight any more.
    const keys = new Set(tileKeysFor(cells, 'tee').map((tile) => tile.key));
    for (const gone of ['pipe.ns', 'pipe.ew', 'pipe.ne', 'pipe.nw', 'pipe.se', 'pipe.sw']) {
      expect(keys.has(gone as never), gone).toBe(false);
    }
    // A run of one cell is its own drop and nothing else.
    expect(tileKeysFor([{ x: 3, y: 3 }], 'inlet').map((tile) => tile.key)).toEqual(['pipe.drop']);
  });
});

describe('routing a machine to the extraction', () => {
  it('runs straight along the row when the port and the inlet share it', () => {
    const { state, fan } = hall();
    const inlet = portCell(fan);
    const item = saw(state, 'kit-saw-a', 4, inlet.y - 1);
    // The saw's own drop, and the fan's own inlet, on one row: the run is straight.
    const port = portCell(item);
    expect(port).toEqual({ x: 5, y: inlet.y });
    const run = routePipe(state, item, fan);
    expect(run.equipmentId).toBe('kit-saw-a');
    expect(run.extractorId).toBe('kit-fan');
    expect(run.metres).toBe(inlet.x - port.x);
    expect(run.tiles).toHaveLength(inlet.x - port.x + 1);
    expect(keys(run)[0]).toBe('pipe.drop');
    expect(keys(run)[keys(run).length - 1]).toBe('pipe.inlet');
    expect(keys(run).slice(1, -1).every((key) => key === 'pipe.run')).toBe(true);
  });

  it('turns once when they do not, and no cell of it names the turn', () => {
    const { state, fan } = hall();
    const inlet = portCell(fan);
    // The port three rows below the inlet and ten cells to its left: along the row, then up.
    const item = saw(state, 'kit-saw-b', inlet.x - 10, inlet.y + 2);
    const port = portCell(item);
    expect(port).toEqual({ x: inlet.x - 9, y: inlet.y + 3 });
    const run = routePipe(state, item, fan);
    // Nine cells along the row and three up it: the long leg first, one elbow.
    expect(run.metres).toBe(inlet.x - port.x + (port.y - inlet.y));
    expect(run.metres).toBe(12);
    // The corner is in the cells and nowhere else: the drawing finds it there
    // (CLAUDE.md T22 2.7). The turn is at the inlet's column on the port's row.
    expect(run.tiles.some((tile) => tile.x === inlet.x && tile.y === port.y)).toBe(true);
    expect(run.tiles.filter((tile) => tile.y === port.y)).toHaveLength(10);
    expect(run.tiles.filter((tile) => tile.x === inlet.x)).toHaveLength(4);
    expect(keys(run).slice(1, -1).every((key) => key === 'pipe.run')).toBe(true);
  });

  it('joins an existing run with a tee where that is shorter, to the same unit', () => {
    const { state, fan } = hall();
    const inlet = portCell(fan);
    const first = saw(state, 'kit-saw-a', 4, inlet.y - 1);
    expect(connectExtraction(state, first.id).ok).toBe(true);
    const second = saw(state, 'kit-saw-b', 8, inlet.y + 2);
    const port = portCell(second);
    // Straight to the unit is nine metres; up to the run over its head is three.
    expect(connectCheck(state, second.id).cost).toBe(3 * PIPE_PRICE_PER_METRE);
    expect(connectExtraction(state, second.id).ok).toBe(true);
    const branch = pipeRunFor(state, second.id);
    expect(branch?.metres).toBe(3);
    expect(branch?.extractorId).toBe('kit-fan');
    expect(keys(branch)).toEqual(['pipe.drop', 'pipe.run', 'pipe.run', 'pipe.tee']);
    const tee = last(branch);
    expect(tee).toEqual({ x: port.x, y: inlet.y, key: 'pipe.tee' });
    // The tee sits on a cell of the first run.
    expect(
      pipeRunFor(state, first.id)?.tiles.some((tile) => tile.x === port.x && tile.y === inlet.y),
    ).toBe(true);
    expect(isConnected(state, second)).toBe(true);
  });

  it('never tees onto a run to another unit, and goes to the unit itself on a tie', () => {
    const { state, fan } = hall();
    const inlet = portCell(fan);
    // Clear of the gate lane and one row in from the front kerb: the standard fan's mouth opens
    // down and to the left, so the cell in front of its inlet is the row below it, and that cell
    // has to be floor and not the way in from the shutter (CLAUDE.md T22 2.8).
    const far = placeEquipment(state, 'extractor', { variantId: 'standard', x: 3, y: 8, id: 'kit-fan-far' });
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
    const metres = inlet.x - portCell(item).x;
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
    const nearer = inlet.x - portCell(item).x;
    expect(connectExtraction(state, item.id).ok).toBe(true);
    const again = pipeRunFor(state, item.id);
    expect(again?.metres).toBe(nearer);
    expect(state.cash).toBe(start - paid - nearer * PIPE_PRICE_PER_METRE);
  });

  it('hands a trunk that goes to the branch on it, so no pipe is left hanging', () => {
    const { state, fan } = hall();
    const inlet = portCell(fan);
    const first = saw(state, 'kit-saw-a', 4, inlet.y - 1);
    expect(connectExtraction(state, first.id).ok).toBe(true);
    const second = saw(state, 'kit-saw-b', 8, inlet.y + 2);
    const port = portCell(second);
    expect(connectExtraction(state, second.id).ok).toBe(true);
    expect(last(pipeRunFor(state, second.id))?.key).toBe('pipe.tee');
    // The first saw is moved: its run goes, and the branch takes over the tail to the inlet.
    disconnectExtraction(state, first.id);
    expect(pipeRunFor(state, first.id)).toBeNull();
    const branch = pipeRunFor(state, second.id);
    expect(branch).not.toBeNull();
    expect(isConnected(state, second)).toBe(true);
    expect(last(branch)).toEqual({ x: inlet.x, y: inlet.y, key: 'pipe.inlet' });
    expect(branch?.metres).toBe(3 + (inlet.x - port.x));
    // Up the column, round the corner, along the row: the cells say so and no key does.
    expect(keys(branch)[0]).toBe('pipe.drop');
    expect(keys(branch).slice(1, -1).every((key) => key === 'pipe.run')).toBe(true);
    expect(branch?.tiles.slice(0, 3).every((tile) => tile.x === port.x)).toBe(true);
    expect(branch?.tiles.slice(3).every((tile) => tile.y === inlet.y)).toBe(true);
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
