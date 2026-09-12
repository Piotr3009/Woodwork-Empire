import { describe, expect, it } from 'vitest';
import { GATE_LANE_TILES, ROOM_LAYOUT } from '../../src/engine/constants';
import {
  canPlace,
  canPlaceSpec,
  firstFreeTile,
  gateLane,
  hallItems,
} from '../../src/engine/layout';
import { act, buyStartingKit, newGame } from '../helpers';
import type { GameState } from '../../src/engine/index';

function itemOf(state: GameState, specId: string): string {
  const item = state.equipment.find((entry) => entry.specId === specId);
  if (!item) throw new Error(`nothing of kind ${specId}`);
  return item.id;
}

describe('setting the hall out', () => {
  it('keeps everything inside the floor', () => {
    const state = buyStartingKit(newGame());
    const saw = itemOf(state, 'tableSaw');
    const free = firstFreeTile(state, 'tableSaw');
    expect(free).not.toBeNull();
    expect(canPlace(state, saw, free?.x ?? 0, free?.y ?? 0).ok).toBe(true);
    expect(canPlace(state, saw, -1, 6)).toEqual({ ok: false, reason: 'Off the floor' });
    expect(canPlace(state, saw, state.unit.widthTiles - 1, 6).reason).toBe('Off the floor');
    expect(canPlace(state, saw, 2, state.unit.depthTiles - 1).reason).toBe('Off the floor');
  });

  it('refuses to drop a bench on the office', () => {
    const state = buyStartingKit(newGame());
    const bench = itemOf(state, 'workbench');
    const office = ROOM_LAYOUT[0];
    const check = canPlace(state, bench, office.x, office.y);
    expect(check.ok).toBe(false);
    expect(check.reason).toBe('On the office');
    // And on the canteen, and the WC.
    expect(canPlace(state, bench, ROOM_LAYOUT[1].x, ROOM_LAYOUT[1].y).reason).toBe('On the wc');
    expect(canPlace(state, bench, ROOM_LAYOUT[2].x, ROOM_LAYOUT[2].y).reason).toBe('On the canteen');
  });

  it('never lets two machines overlap', () => {
    let state = buyStartingKit(newGame());
    const saw = itemOf(state, 'tableSaw');
    const bander = state.equipment.find((item) => item.specId === 'edgebander');
    expect(bander).toBeDefined();
    const check = canPlace(state, saw, bander?.anchorX ?? 0, bander?.anchorY ?? 0);
    expect(check.ok).toBe(false);
    expect(check.reason).toBe('On the hand edgebander');
    // The move is refused, so the saw stays where it was.
    const before = state.equipment.find((item) => item.id === saw);
    state = act(state, {
      type: 'MOVE_ITEM',
      itemId: saw,
      x: bander?.anchorX ?? 0,
      y: bander?.anchorY ?? 0,
    });
    const after = state.equipment.find((item) => item.id === saw);
    expect(after?.anchorX).toBe(before?.anchorX);
    expect(after?.anchorY).toBe(before?.anchorY);
  });

  it('keeps the way to the gate clear, and says so', () => {
    const state = buyStartingKit(newGame());
    const lane = gateLane(state);
    expect(lane.width).toBe(GATE_LANE_TILES);
    const saw = itemOf(state, 'tableSaw');
    const check = canPlace(state, saw, state.unit.widthTiles - 4, lane.y);
    expect(check.ok).toBe(false);
    expect(check.reason).toBe('Blocking the way to the gate');
  });

  it('moves the item and takes the man at the bench with it', () => {
    const state = buyStartingKit(newGame());
    const bench = state.equipment.find((item) => item.specId === 'workbench');
    state.workers.push({
      id: 'staff-1',
      name: 'Ben',
      role: 'joiner',
      tier: 'poor',
      rate: 0.6,
      weeklyWage: 480,
      monthlyWage: 0,
      startDay: 1,
      jobId: null,
      taskId: null,
      minutesWorked: 0,
      ordersToday: 0,
      station: 'idle',
      productionMinutes: 0,
      absentDaysRemaining: 0,
      anchorX: bench?.anchorX ?? 0,
      anchorY: bench?.anchorY ?? 0,
    });
    const free = firstFreeTile(state, 'workbench');
    expect(free).not.toBeNull();
    const moved = act(state, {
      type: 'MOVE_ITEM',
      itemId: bench?.id ?? '',
      x: free?.x ?? 0,
      y: free?.y ?? 0,
    });
    expect(moved.equipment.find((item) => item.specId === 'workbench')?.anchorX).toBe(free?.x);
    expect(moved.workers[0]?.anchorX).toBe(free?.x);
    expect(moved.workers[0]?.anchorY).toBe(free?.y);
  });

  it('leaves the office furniture and the yard alone', () => {
    const state = act(buyStartingKit(newGame()), { type: 'BUY_EQUIPMENT', specId: 'van' });
    expect(canPlace(state, itemOf(state, 'desk'), 2, 6).reason).toBe('It lives in the office');
    expect(canPlace(state, itemOf(state, 'van'), 2, 6).reason).toBe('It stands in the yard');
    expect(hallItems(state).some((item) => item.specId === 'desk')).toBe(false);
    expect(hallItems(state).some((item) => item.specId === 'van')).toBe(false);
    expect(hallItems(state).some((item) => item.specId === 'tableSaw')).toBe(true);
  });

  it('puts a purchase whose default tile is taken on the first free one', () => {
    let state = buyStartingKit(newGame());
    // Something is standing exactly where the second saw would like to be.
    const first = state.equipment.find((item) => item.specId === 'tableSaw');
    expect(first?.anchorX).toBe(0);
    expect(first?.anchorY).toBe(7);
    state = act(state, { type: 'BUY_EQUIPMENT', specId: 'tableSaw' });
    const saws = state.equipment.filter((item) => item.specId === 'tableSaw');
    expect(saws).toHaveLength(2);
    const second = saws[1];
    expect(second?.anchorX !== first?.anchorX || second?.anchorY !== first?.anchorY).toBe(true);
    const free = firstFreeTile(buyStartingKit(newGame()), 'tableSaw');
    expect(second?.anchorX).toBe(free?.x);
    expect(second?.anchorY).toBe(free?.y);
    expect(canPlaceSpec(state, 'tableSaw', second?.anchorX ?? 0, second?.anchorY ?? 0, second?.id ?? null).ok)
      .toBe(true);
  });
});
