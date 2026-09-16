// The network the men walk on (CLAUDE.md T16 2.2): free cells, a breadth first search over the
// four neighbours, and the straight line when nothing else is possible.

import { describe, expect, it } from 'vitest';
import { PALLET_LAYOUT, ROOM_LAYOUT } from '../../src/engine/constants';
import { footprintCells, isFree, straightLine, walkPath } from '../../src/engine/walk';
import type { GameState } from '../../src/engine/index';
import { newGame, placeEquipment } from '../helpers';

/** An empty hall: the rooms, the pallet's cell and nothing else on the floor. */
function emptyHall(): GameState {
  const state = newGame({ difficulty: 'veryEasy' });
  state.equipment = [];
  state.pipes = [];
  return state;
}

function isPath(cells: Array<{ x: number; y: number }>): void {
  for (let index = 1; index < cells.length; index += 1) {
    const before = cells[index - 1];
    const cell = cells[index];
    if (!before || !cell) throw new Error('short path');
    expect(Math.abs(cell.x - before.x) + Math.abs(cell.y - before.y), `step ${index}`).toBe(1);
  }
}

describe('a free cell', () => {
  it('is inside the unit, in no room, not on the pallet and on no footprint', () => {
    const state = emptyHall();
    expect(isFree(state, { x: 10, y: 5 })).toBe(true);
    expect(isFree(state, { x: -1, y: 5 })).toBe(false);
    expect(isFree(state, { x: state.unit.widthCells, y: 5 })).toBe(false);
    const office = ROOM_LAYOUT.find((room) => room.id === 'office');
    if (!office) throw new Error('no office');
    expect(isFree(state, { x: office.x, y: office.y })).toBe(false);
    expect(isFree(state, { x: office.x, y: office.y + office.depth })).toBe(true);
    expect(isFree(state, { x: PALLET_LAYOUT.x, y: PALLET_LAYOUT.y })).toBe(false);
    const saw = placeEquipment(state, 'tableSaw', { variantId: 'standard', x: 8, y: 4 });
    const stands = footprintCells(saw);
    expect(isFree(state, { x: stands.x, y: stands.y })).toBe(false);
    expect(isFree(state, { x: stands.x + stands.width - 1, y: stands.y + stands.depth - 1 })).toBe(false);
    // The working zone round the machine is free: a man walks through a zone.
    expect(isFree(state, { x: 8, y: 4 })).toBe(true);
  });
});

describe('the walk between two cells', () => {
  it('is one cell at a time, from the first to the last inclusive, and shortest', () => {
    const path = walkPath(emptyHall(), { x: 6, y: 5 }, { x: 10, y: 8 });
    expect(path[0]).toEqual({ x: 6, y: 5 });
    expect(path[path.length - 1]).toEqual({ x: 10, y: 8 });
    expect(path).toHaveLength(8);
    isPath(path);
    expect(walkPath(emptyHall(), { x: 3, y: 3 }, { x: 3, y: 3 })).toEqual([{ x: 3, y: 3 }]);
  });

  it('goes round a footprint and never through it', () => {
    const state = emptyHall();
    const saw = placeEquipment(state, 'tableSaw', { variantId: 'standard', x: 8, y: 4 });
    const stands = footprintCells(saw);
    const path = walkPath(state, { x: stands.x - 2, y: stands.y }, { x: stands.x + stands.width + 1, y: stands.y });
    isPath(path);
    for (const cell of path.slice(1, -1)) expect(isFree(state, cell), `${cell.x},${cell.y}`).toBe(true);
    expect(path.length).toBeGreaterThan(stands.width + 3);
  });

  it('goes round a room, through the gate lane, and falls back to the line when boxed in', () => {
    const state = emptyHall();
    const canteen = ROOM_LAYOUT.find((room) => room.id === 'canteen');
    if (!canteen) throw new Error('no canteen');
    // From beside the canteen to below the WC: the rooms are in the way, so he goes under them.
    const round = walkPath(state, { x: canteen.x + canteen.width, y: 1 }, { x: 0, y: 5 });
    isPath(round);
    for (const cell of round) expect(isFree(state, cell), `${cell.x},${cell.y}`).toBe(true);
    expect(round.length).toBeGreaterThan(canteen.x + canteen.width + 4);
    // Down the lane from the pallet's neighbour to the far end of it.
    const lane = walkPath(state, { x: 2, y: 7 }, { x: 0, y: 9 });
    isPath(lane);
    expect(lane[lane.length - 1]).toEqual({ x: 0, y: 9 });
    // A target inside a room has no free path: the straight line, so he still gets somewhere.
    const boxed = walkPath(state, { x: 10, y: 8 }, { x: canteen.x, y: canteen.y });
    expect(boxed).toEqual(straightLine({ x: 10, y: 8 }, { x: canteen.x, y: canteen.y }));
    isPath(boxed);
  });
});
