/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// v105 [PIOTR, 18.10]: five rows behind the rear wall ("add up to 5 rows behind the hall"); a store
// behind the wall made twice the size where it stands, once, for its class's price again ("for the
// same again, more shelves and twice the room in one shelter; the easiest, the colour just changes
// to red"); and a machine whose life bar is red replaced by a new one of its class in the same
// place ("we wait as long as it takes, we pay what it costs, but the old one disappears and the new
// one appears in exactly the same place").

import { describe, expect, it } from 'vitest';
import { LIFE_LOW_FRACTION, LINE_MODULES, REAR_YARD_ROWS, STORE_EXPANSION_FACTOR } from '../../src/engine/constants';
import { rearRowOf, rearYardPlaceFor } from '../../src/engine/layout';
import { capacityOf, enduranceHoursFor, roomFor, salePriceFor } from '../../src/engine/machines';
import { dueDayFor } from '../../src/engine/orders';
import { expandStoreCheck, lifeIsLow, replaceCheck, replacementPrice } from '../../src/engine/renewal';
import type { Equipment, GameEvent, GameState } from '../../src/engine/index';
import { act, buyStartingKit, newGame, nextDay, placeEquipment } from '../helpers';

/** The 800 m2 hall made a hundred metres long. */
function long(): GameState {
  let state = newGame({ difficulty: 'veryEasy' });
  state.cash = 1e9;
  state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
  state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'second' }));
  for (let n = 0; n < 6; n += 1) state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'long' }));
  return state;
}

/** The starting hall with a timber shelter behind its rear wall. */
function withShelter(specId = 'timberShelter'): { state: GameState; store: Equipment } {
  const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
  state.cash = 2000000;
  state.activeEvent = null;
  state.eventQueue = [];
  // The large timber shelter is longer than the starting hall's wall: it is stood behind it by
  // hand, since where it stands says nothing about what it holds.
  const at = rearYardPlaceFor(state, specId) ?? { x: 0, y: -4 };
  const store = placeEquipment(state, specId, { x: at.x, y: at.y, id: 'kit-store' });
  return { state, store };
}

function itemOf(state: GameState, id: string): Equipment {
  const item = state.equipment.find((entry) => entry.id === id);
  if (item === undefined) throw new Error(`no ${id}`);
  return item;
}

describe('five rows behind the rear wall (v105)', () => {
  it('fills the five, each a row and a metre further back, and then has no place', () => {
    const state = long();
    expect(state.unit.widthCells).toBe(100);
    expect(REAR_YARD_ROWS).toBe(5);
    const rows: number[] = [];
    let at = rearYardPlaceFor(state, 'glassShelter');
    while (at !== null && rows.length < 100) {
      rows.push(rearRowOf(at.y + 3));
      // Every place in a row behind the first stands no nearer the gate end than it stands back
      // from the wall, so it is never off the top of the picture (v101).
      if (rows[rows.length - 1] !== 0) expect(at.x + at.y).toBeGreaterThanOrEqual(0);
      placeEquipment(state, 'glassShelter', { x: at.x, y: at.y, id: `kit-shelter-${rows.length}` });
      at = rearYardPlaceFor(state, 'glassShelter');
    }
    expect([0, 1, 2, 3, 4].map((row) => rows.filter((entry) => entry === row).length)).toEqual([7, 6, 5, 5, 4]);
    // The fourth and the fifth rows' fronts, a row and a metre behind the third's.
    const fronts = state.equipment
      .filter((item) => item.specId === 'glassShelter')
      .map((item) => item.anchorY + 3);
    expect(new Set(fronts)).toEqual(new Set([-1, -5, -9, -13, -17]));
  });
});

describe('a store behind the wall made twice the size (v105)', () => {
  it('doubles its room where it stands, for its class s price again, once', () => {
    const { state, store } = withShelter();
    expect(capacityOf(store, 'boards')).toBe(400);
    const room = roomFor(state, 'boards');
    const sale = salePriceFor(store);
    expect(expandStoreCheck(state, store.id)).toEqual({ ok: true, reason: '' });
    const next = act(state, { type: 'EXPAND_STORE', equipmentId: store.id });
    const bigger = itemOf(next, store.id);
    expect(bigger.expanded).toBe(true);
    expect(next.cash).toBe(state.cash - 18000);
    expect(next.ledger.find((entry) => entry.label === 'Timber shelter made bigger')?.amount).toBe(-18000);
    expect(capacityOf(bigger, 'boards')).toBe(400 * STORE_EXPANSION_FACTOR);
    expect(roomFor(next, 'boards')).toBe(room + 400);
    // Where it stands, its class and its id are what they were; what it cost carries the shelves.
    expect({ x: bigger.anchorX, y: bigger.anchorY, variant: bigger.variantId }).toEqual({
      x: store.anchorX,
      y: store.anchorY,
      variant: store.variantId,
    });
    expect(bigger.purchasePrice).toBe(36000);
    expect(salePriceFor(bigger)).toBe(sale * 2);
    // Once.
    expect(expandStoreCheck(next, store.id)).toEqual({ ok: false, reason: 'Made bigger already' });
    expect(act(next, { type: 'EXPAND_STORE', equipmentId: store.id }).cash).toBe(next.cash);
  });

  it('is offered on the three stores behind the wall and refused on everything else and without the cash', () => {
    for (const [specId, kind, holds] of [
      ['glassShelter', 'glass', 3200],
      ['timberShelterLarge', 'boards', 3000],
    ] as const) {
      const { state, store } = withShelter(specId);
      const next = act(state, { type: 'EXPAND_STORE', equipmentId: store.id });
      expect(capacityOf(itemOf(next, store.id), kind)).toBe(holds * 2);
    }
    const { state, store } = withShelter();
    const rack = placeEquipment(state, 'timberRack', { x: 2, y: 2, id: 'kit-rack' });
    expect(expandStoreCheck(state, rack.id)).toEqual({ ok: false, reason: 'It cannot be made bigger' });
    expect(capacityOf({ ...rack, expanded: true }, 'boards')).toBe(80);
    const sheets = state.equipment.find((item) => item.specId === 'sheetRack');
    if (sheets !== undefined) expect(expandStoreCheck(state, sheets.id).ok).toBe(false);
    state.cash = state.finance.overdraftLimit + 17999;
    expect(expandStoreCheck(state, store.id)).toEqual({ ok: false, reason: 'Not enough cash' });
    expect(expandStoreCheck(state, 'kit-nothing')).toEqual({ ok: false, reason: 'No such store' });
  });
});

/** The starting hall with its saw near the end of its life. */
function worn(): { state: GameState; saw: Equipment } {
  const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
  state.cash = 2000000;
  state.activeEvent = null;
  state.eventQueue = [];
  const saw = state.equipment.find((item) => item.specId === 'tableSaw');
  if (saw === undefined) throw new Error('the saw is wanted');
  saw.hoursUsed = saw.enduranceHours * (1 - LIFE_LOW_FRACTION / 2);
  return { state, saw };
}

describe('a machine replaced (v105)', () => {
  it('is offered once its bar is red, and only then', () => {
    const { state, saw } = worn();
    expect(lifeIsLow(saw)).toBe(true);
    expect(replaceCheck(state, saw.id)).toEqual({ ok: true, reason: '' });
    saw.hoursUsed = saw.enduranceHours / 2;
    expect(lifeIsLow(saw)).toBe(false);
    expect(replaceCheck(state, saw.id)).toEqual({ ok: false, reason: 'It has life left in it' });
    // Past its life it is red too.
    saw.hoursUsed = saw.enduranceHours * 3;
    expect(replaceCheck(state, saw.id).ok).toBe(true);
    state.cash = state.finance.overdraftLimit + replacementPrice(saw) - 1;
    expect(replaceCheck(state, saw.id)).toEqual({ ok: false, reason: 'Not enough cash' });
  });

  it('is paid at the click, at the class s price, and comes when buying one would', () => {
    const { state, saw } = worn();
    const price = replacementPrice(saw);
    expect(price).toBeGreaterThan(0);
    const due = dueDayFor(state, saw.specId, saw.variantId);
    const ordered = act(state, { type: 'REPLACE_MACHINE', equipmentId: saw.id });
    expect(ordered.cash).toBe(state.cash - price);
    expect(ordered.ledger.some((entry) => entry.label.endsWith(', a new one for the old') && entry.amount === -price)).toBe(true);
    expect(itemOf(ordered, saw.id).replacementDay).toBe(due);
    expect(replaceCheck(ordered, saw.id)).toEqual({ ok: false, reason: 'A new one is on its way' });
    expect(act(ordered, { type: 'REPLACE_MACHINE', equipmentId: saw.id }).cash).toBe(ordered.cash);
  });

  it('stands where the old one stood on the morning it comes, the same machine made new, and the old one works until then', () => {
    const { state, saw } = worn();
    saw.orientation = 1;
    saw.serviceCount = 2;
    saw.broken = true;
    const before = { x: saw.anchorX, y: saw.anchorY, orientation: saw.orientation, id: saw.id };
    let next = act(state, { type: 'REPLACE_MACHINE', equipmentId: saw.id });
    // A repair it was waiting for.
    next.tasks.push({
      id: 'repair-old-saw',
      kind: 'repair',
      category: 'workshop',
      label: 'Repair the table saw',
      minutesTotal: 30,
      minutesRemaining: 30,
      jobId: null,
      equipmentId: saw.id,
      deliveryId: null,
      orderIds: [],
      day: next.clock.day,
      done: false,
      doneDay: null,
      doneBy: null,
      orders: [],
    });
    const due = itemOf(next, saw.id).replacementDay ?? 0;
    const seen: GameEvent[] = [];
    while (next.clock.day < due) {
      const old = itemOf(next, saw.id);
      expect(old.hoursUsed).toBeGreaterThan(0);
      expect(old.replacementDay).toBe(due);
      next = nextDay(next, seen);
    }
    const made = itemOf(next, saw.id);
    expect(next.equipment.filter((item) => item.specId === 'tableSaw')).toHaveLength(1);
    expect({ x: made.anchorX, y: made.anchorY, orientation: made.orientation, id: made.id }).toEqual(before);
    expect(made.replacementDay).toBeUndefined();
    expect(made.enduranceHours).toBe(enduranceHoursFor(saw.specId, saw.variantId));
    expect(made.serviceCount).toBe(0);
    expect(made.broken).toBe(false);
    expect(made.servicedDay).toBe(due);
    expect(made.purchasePrice).toBe(replacementPrice(saw));
    expect(lifeIsLow(made)).toBe(false);
    expect(next.tasks.some((task) => task.id === 'repair-old-saw')).toBe(false);
    expect(seen.some((event) => event.kind === 'machineReplaced' && event.title === 'New table saw in')).toBe(true);
  });

  it('is not offered on a module of the line, on a store or on a sold machine', () => {
    const { state, saw } = worn();
    const module = placeEquipment(state, LINE_MODULES[0] ?? '', { x: 2, y: 14, id: 'kit-line-1' });
    module.enduranceHours = 100;
    module.hoursUsed = 99;
    expect(replaceCheck(state, module.id)).toEqual({ ok: false, reason: 'It is not replaced' });
    const rack = state.equipment.find((item) => item.specId === 'sheetRack');
    if (rack !== undefined) expect(replaceCheck(state, rack.id)).toEqual({ ok: false, reason: 'It is not replaced' });
    saw.soldOnDay = state.clock.day + 1;
    expect(replaceCheck(state, saw.id)).toEqual({ ok: false, reason: 'Sold' });
  });
});
