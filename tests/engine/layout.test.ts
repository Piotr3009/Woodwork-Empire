import { describe, expect, it } from 'vitest';
import {
  EQUIPMENT_SPECS,
  FINISHED_GOODS_LAYOUT,
  GATE_LAYOUT,
  STARTING_LAYOUT,
  roomById,
} from '../../src/engine/constants';
import { findSpec } from '../../src/engine/machines';
import {
  canPlace,
  canPlaceSpec,
  firstFreeCell,
  gateLane,
  hallItems,
} from '../../src/engine/layout';
import { act, buyNow, buyStartingKit, newGame } from '../helpers';
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
    const free = firstFreeCell(state, 'tableSaw');
    expect(free).not.toBeNull();
    expect(canPlace(state, saw, free?.x ?? 0, free?.y ?? 0).ok).toBe(true);
    expect(canPlace(state, saw, -1, 6)).toEqual({ ok: false, reason: 'Off the floor' });
    // One cell short of the room the saw needs, on each side in turn. Taken from its own
    // footprint, so the assertion survives a footprint or a hall that changes size.
    const spec = findSpec('tableSaw');
    const width = spec?.width ?? 1;
    const depth = spec?.depth ?? 1;
    expect(canPlace(state, saw, state.unit.widthCells - width + 1, 6).reason).toBe('Off the floor');
    expect(canPlace(state, saw, 2, state.unit.depthCells - depth + 1).reason).toBe('Off the floor');
  });

  it('refuses to drop a bench on the office', () => {
    const state = buyStartingKit(newGame());
    const bench = itemOf(state, 'workbench');
    const office = roomById('office');
    const check = canPlace(state, bench, office.x, office.y);
    expect(check.ok).toBe(false);
    expect(check.reason).toBe('On the office');
    // And on the canteen, and the WC.
    const wc = roomById('wc');
    const canteen = roomById('canteen');
    expect(canPlace(state, bench, wc.x, wc.y).reason).toBe('On the wc');
    expect(canPlace(state, bench, canteen.x, canteen.y).reason).toBe('On the canteen');
  });

  it('never lets two machines overlap', () => {
    let state = buyStartingKit(newGame());
    const saw = itemOf(state, 'tableSaw');
    const rack = state.equipment.find((item) => item.specId === 'sheetRack');
    expect(rack).toBeDefined();
    const check = canPlace(state, saw, rack?.anchorX ?? 0, rack?.anchorY ?? 0);
    expect(check.ok).toBe(false);
    expect(check.reason).toBe('On the sheet rack');
    // The move is refused, so the saw stays where it was.
    const before = state.equipment.find((item) => item.id === saw);
    state = act(state, {
      type: 'MOVE_ITEM',
      itemId: saw,
      x: rack?.anchorX ?? 0,
      y: rack?.anchorY ?? 0,
    });
    const after = state.equipment.find((item) => item.id === saw);
    expect(after?.anchorX).toBe(before?.anchorX);
    expect(after?.anchorY).toBe(before?.anchorY);
  });

  it('keeps the way to the gate clear, and says so', () => {
    const state = buyStartingKit(newGame());
    const lane = gateLane();
    // Eight cells of the two hundred, x 0 to 2 and y 6 to 10 (docs/art/SPRITES.md 9.3).
    expect(lane).toEqual({ x: 0, y: 6, width: 2, depth: 4 });
    const saw = itemOf(state, 'tableSaw');
    const check = canPlace(state, saw, lane.x, lane.y);
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
      tier: 'novice',
      rate: 0.6,
      monthlyWage: 1950,
      leavesOnDay: null,
      startDay: 1,
      jobId: null,
      taskId: null,
      minutesWorked: 0,
      ordersToday: 0,
    overtimeMinutes: 0,
    overtimeMinutesWeek: 0,
    overtimeDays: 0,
    tiredOfOvertime: false,
      station: 'idle',
      productionMinutes: 0,
      absentDaysRemaining: 0,
      shift: 'day',
      dayLog: [],
      monthMinutes: 0,
      monthDaysOff: 0,
      idleMinutes: 0,
      idleByReason: { waitingForBoss: 0, noPlace: 0, noMaterial: 0, noCompressor: 0, hallStopped: 0 },
      working: false,
      noPlaceFor: '',
      accidents: 0,
      anchorX: bench?.anchorX ?? 0,
      anchorY: bench?.anchorY ?? 0,
    });
    const free = firstFreeCell(state, 'workbench');
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
    const state = buyNow(buyStartingKit(newGame()), 'van');
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
    const slot = STARTING_LAYOUT.tableSaw;
    expect(first?.anchorX).toBe(slot?.x);
    expect(first?.anchorY).toBe(slot?.y);
    state = buyNow(state, 'tableSaw');
    const saws = state.equipment.filter((item) => item.specId === 'tableSaw');
    expect(saws).toHaveLength(2);
    const second = saws[1];
    expect(second?.anchorX !== first?.anchorX || second?.anchorY !== first?.anchorY).toBe(true);
    const free = firstFreeCell(buyStartingKit(newGame()), 'tableSaw');
    expect(second?.anchorX).toBe(free?.x);
    expect(second?.anchorY).toBe(free?.y);
    expect(canPlaceSpec(state, 'tableSaw', second?.anchorX ?? 0, second?.anchorY ?? 0, second?.id ?? null).ok)
      .toBe(true);
  });
});

describe('the whole workshop fits on the painted floor', () => {
  it('stands the day 1 kit, a full crew and the big machines side by side', () => {
    let state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    // Everything a workshop can own, bought without caring what it costs.
    for (const spec of EQUIPMENT_SPECS) {
      if (spec.category === 'furniture') continue;
      const have = state.equipment.filter((item) => item.specId === spec.id).length;
      const want = spec.perWorker ? 6 : 1;
      for (let index = have; index < want; index += 1) {
        state.cash += 100000;
        state = buyNow(state, spec.id);
      }
    }
    // Nothing overlaps anything, nothing sits on a room and nothing blocks the lane.
    for (const item of hallItems(state)) {
      const check = canPlaceSpec(state, item.specId, item.anchorX, item.anchorY, item.id);
      expect(check, `${item.specId} at ${item.anchorX},${item.anchorY}`).toEqual({
        ok: true,
        reason: '',
      });
    }
    // And every one of them actually found room: none fell back to nowhere.
    expect(hallItems(state).length).toBeGreaterThan(20);
  });

  it('stands the lorry on the lane, where nothing of the player is allowed', () => {
    const state = buyStartingKit(newGame());
    // The lorry comes in through the shutter and stands on the cells kept clear for it.
    expect(GATE_LAYOUT.x).toBe(gateLane().x);
    expect(GATE_LAYOUT.y).toBe(gateLane().y);
    expect(GATE_LAYOUT.width).toBeLessThanOrEqual(gateLane().width);
    const saw = itemOf(state, 'tableSaw');
    expect(canPlace(state, saw, GATE_LAYOUT.x, GATE_LAYOUT.y).reason).toBe(
      'Blocking the way to the gate',
    );
    // The finished pieces stand at the far end of the same lane, clear of the lorry.
    expect(FINISHED_GOODS_LAYOUT.y).toBeGreaterThanOrEqual(GATE_LAYOUT.y + GATE_LAYOUT.depth);
    expect(FINISHED_GOODS_LAYOUT.x + FINISHED_GOODS_LAYOUT.width).toBeLessThanOrEqual(
      gateLane().x + gateLane().width,
    );
  });
});
