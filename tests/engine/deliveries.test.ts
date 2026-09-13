// Deliveries by class: the cash leaves at the click, the trip is the owner's own minutes, and the
// thing itself turns up days later (CLAUDE.md T8 3.2).

import { describe, expect, it } from 'vitest';
import {
  DELIVERY_DAYS_BY_CLASS,
  EQUIPMENT_UNLOAD_MINUTES,
  EQUIPMENT_SPECS,
  SHOPPING_MINUTES,
} from '../../src/engine/constants';
import { canPlaceSpec, firstFreeCell } from '../../src/engine/layout';
import { deliveryDaysFor, isHeavy } from '../../src/engine/machines';
import { addWorkingDays } from '../../src/engine/clock';
import { renderHall } from '../../src/render/hall';
import type { GameEvent, GameState } from '../../src/engine/index';
import { act, buyStartingKit, clearEvents, fillRack, newGame, runClock } from '../helpers';

/** A hall with the day 1 kit in it and money in the bank, the way the shop leaves it. */
function shop(): GameState {
  return fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
}

/** Orders one thing through the shop counter and runs the trip out. */
function order(state: GameState, specId: string, variantId?: string): GameState {
  const out = act(state, { type: 'BUY_EQUIPMENT', specId, variantId });
  return runClock(out, SHOPPING_MINUTES);
}

/** Plays whole days, answering everything with its first choice and keeping what it answered,
 *  until this absolute day has started. */
function toDay(state: GameState, day: number, seen: GameEvent[] = []): GameState {
  let next = clearEvents(state, seen);
  let guard = 0;
  while (next.clock.day < day && guard < 4000) {
    next = clearEvents(runClock(next, 30), seen);
    if (next.clock.minute >= 540 && next.activeEvent === null && !next.owner.wentHome) {
      next = clearEvents(act(next, { type: 'END_DAY' }), seen);
    }
    guard += 1;
  }
  return clearEvents(next, seen);
}

describe('the days a class waits', () => {
  it('is the class ladder where the family has one, and the family figure where it has not', () => {
    expect(deliveryDaysFor('tableSaw', 'used')).toBe(1);
    expect(deliveryDaysFor('tableSaw', 'standard')).toBe(5);
    expect(deliveryDaysFor('tableSaw', 'pro')).toBe(7);
    expect(deliveryDaysFor('tableSaw', 'industrial')).toBe(12);
    expect(deliveryDaysFor('cnc', 'standard')).toBe(45);
    expect(deliveryDaysFor('sprayBooth', 'standard')).toBe(20);
    expect(deliveryDaysFor('dustSystem', 'standard')).toBe(25);
    expect(deliveryDaysFor('flexiSystem', 'standard')).toBe(25);
    expect(deliveryDaysFor('van', 'standard')).toBe(3);
    expect(deliveryDaysFor('forklift', 'standard')).toBe(5);
    expect(deliveryDaysFor('thicknesser', 'standard')).toBe(5);
    // The hand tools, the furniture and the storage come back with the owner from the trip.
    for (const specId of ['desk', 'chair', 'laptop', 'drill', 'toolCabinet', 'locker', 'canteenSeat', 'handToolSet']) {
      expect(deliveryDaysFor(specId, 'standard'), specId).toBe(0);
    }
    // A hand edgebander is in the boot of the car; a floor one is ordered in.
    expect(deliveryDaysFor('edgebander', 'budget')).toBe(0);
    expect(deliveryDaysFor('edgebander', 'standard')).toBe(7);
    expect(deliveryDaysFor('edgebander', 'industrial')).toBe(20);
    // Every class of every family carries a figure of its own, and never a negative one.
    for (const spec of EQUIPMENT_SPECS) {
      for (const variant of spec.variants) {
        expect(typeof variant.deliveryDays, `${spec.id}.${variant.id}`).toBe('number');
        expect(deliveryDaysFor(spec.id, variant.id), `${spec.id}.${variant.id}`).toBeGreaterThanOrEqual(0);
      }
    }
    // The ladder in the table is the ladder the engine hands out.
    for (const [specId, ladder] of Object.entries(DELIVERY_DAYS_BY_CLASS)) {
      for (const [variantId, days] of Object.entries(ladder)) {
        expect(deliveryDaysFor(specId, variantId), `${specId}.${variantId}`).toBe(days);
      }
    }
  });
});

describe('a used saw ordered on day 1', () => {
  it('leaves the cash at the click, lands nothing in the hall, and turns up on day 2', () => {
    const start = shop();
    const cash = start.cash;
    let state = act(start, { type: 'BUY_EQUIPMENT', specId: 'tableSaw', variantId: 'used' });
    // The cash goes at the counter (chat fix 1), and the saw is on the trip, not in the hall.
    expect(cash - state.cash).toBe(1800);
    state = runClock(state, SHOPPING_MINUTES);
    const saws = state.equipment.filter((item) => item.specId === 'tableSaw').length;
    expect(state.onOrder).toHaveLength(1);
    expect(state.onOrder[0]?.specId).toBe('tableSaw');
    expect(state.onOrder[0]?.dueDay).toBe(2);
    expect(state.onOrder[0]?.pricePaid).toBe(1800);
    expect(state.equipment.filter((item) => item.specId === 'tableSaw')).toHaveLength(saws);
    // Day 2 at 08:00: the lorry is at the gate and the event asks who takes it off.
    const held = state.onOrder[0];
    if (!held) throw new Error('nothing on order');
    const seen: GameEvent[] = [];
    state = toDay(runClock(state, 600), 2, seen);
    expect(state.clock.day).toBe(2);
    const gate = seen.find(
      (event) => event.kind === 'deliveryArrived' && typeof event.data.orderId === 'string',
    );
    expect(gate).toBeDefined();
    expect(gate?.body).toContain('used table saw');
    // Two hours by hand, and then it stands on the cells that were held for it.
    const task = state.tasks.find((entry) => entry.orderId !== null && !entry.done);
    expect(task?.minutesTotal).toBe(EQUIPMENT_UNLOAD_MINUTES);
    if (!task) throw new Error('nothing at the gate');
    state = act(state, { type: 'START_TASK', taskId: task.id });
    state = clearEvents(runClock(state, EQUIPMENT_UNLOAD_MINUTES));
    expect(state.onOrder).toHaveLength(0);
    const landed = state.equipment.filter((item) => item.specId === 'tableSaw');
    expect(landed).toHaveLength(saws + 1);
    expect(landed[landed.length - 1]?.anchorX).toBe(held.anchorX);
    expect(landed[landed.length - 1]?.anchorY).toBe(held.anchorY);
  });
});

describe('a CNC ordered on day 1', () => {
  it('lands 45 working days later, which is nine weeks of the calendar', () => {
    const state = order(shop(), 'cnc');
    const cnc = state.onOrder.find((item) => item.specId === 'cnc');
    expect(cnc).toBeDefined();
    expect(cnc?.dueDay).toBe(addWorkingDays(1, 45));
    // Nine working weeks of the calendar, weekends and all.
    expect(cnc?.dueDay).toBe(64);
  });
});

describe('a cabinet ordered on day 1', () => {
  it('comes back with the owner from the trip and never goes on the list at all', () => {
    const state = order(shop(), 'toolCabinet');
    expect(state.onOrder).toHaveLength(0);
    expect(state.equipment.filter((item) => item.specId === 'toolCabinet').length).toBeGreaterThan(1);
  });
});

describe('the floor held for a delivery', () => {
  it('cannot be built on, and setup mode drags the outline about like a machine', () => {
    const state = order(shop(), 'tableSaw', 'industrial');
    const held = state.onOrder[0];
    if (!held) throw new Error('nothing on order');
    // Nothing else may stand on the zone it is holding.
    expect(canPlaceSpec(state, 'workbench', held.anchorX, held.anchorY, null, 'budget').ok).toBe(false);
    expect(canPlaceSpec(state, 'workbench', held.anchorX, held.anchorY, null, 'budget').reason).toContain('on order');
    // The outline is drawn on the hall, with what it is and when it is due on it.
    const svg = renderHall(state);
    expect(svg).toContain(`data-order="${held.id}"`);
    expect(svg).toContain(`Industrial table saw, due day ${held.dueDay}`);
    expect(held.dueDay).toBe(addWorkingDays(1, 12));
    // And it is dragged by the same hook a machine is.
    expect(svg).toContain(`data-kit="${held.id}"`);
    const to = firstFreeCell(state, 'tableSaw', 'industrial');
    if (!to) throw new Error('nowhere to drag it');
    const moved = act(state, { type: 'MOVE_ITEM', itemId: held.id, x: to.x, y: to.y });
    expect(moved.onOrder[0]?.anchorX).toBe(to.x);
    expect(moved.onOrder[0]?.anchorY).toBe(to.y);
    // Shifting an outline is not a move of the hall: there is nothing to carry and nothing to
    // unplug (CLAUDE.md T8 3.2).
    expect(moved.movedItems).toEqual([]);
  });
});

describe('what needs somebody at the gate', () => {
  it('is the heavy kit and nothing else', () => {
    expect(isHeavy('tableSaw', 'used')).toBe(true);
    expect(isHeavy('extractor', 'standard')).toBe(true);
    expect(isHeavy('cnc', 'standard')).toBe(true);
    expect(isHeavy('edgebander', 'standard')).toBe(true);
    // A hand edgebander is lifted onto a bench; a bench, a rack and a locker are carried.
    expect(isHeavy('edgebander', 'budget')).toBe(false);
    expect(isHeavy('workbench', 'budget')).toBe(false);
    expect(isHeavy('sheetRack', 'budget')).toBe(false);
    expect(isHeavy('locker', 'standard')).toBe(false);
    expect(isHeavy('toolCabinet', 'standard')).toBe(false);
    expect(isHeavy('van', 'standard')).toBe(false);
    expect(isHeavy('forklift', 'standard')).toBe(false);
    expect(isHeavy('desk', 'standard')).toBe(false);
  });

  it('lets a bench land on its own while the saw waits for somebody', () => {
    let state = order(shop(), 'workbench', 'budget');
    const benches = state.equipment.filter((item) => item.specId === 'workbench').length;
    state = toDay(runClock(state, 600), 2);
    // The bench stood itself in the hall at 08:00 and asked nobody anything.
    expect(state.equipment.filter((item) => item.specId === 'workbench')).toHaveLength(benches + 1);
    expect(state.onOrder).toHaveLength(0);
  });
});
