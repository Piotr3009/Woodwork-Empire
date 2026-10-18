/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// v111: the yard behind the hall laid out in its standing order [PIOTR, 18.10: "arrange those
// shelters somehow", then "koduj" to chat's order]: from the far end of the hall towards the gate,
// row after row, the plant first, then the timber shelters, the glass shelters and the large timber
// shelters; laid out again after a purchase, an order, a sale collected and an order called off, and
// once when an older save opens.

import { describe, expect, it } from 'vitest';
import { REAR_YARD_GAP_CELLS, YARD_ORDER, YARD_ORDER_LARGE_FIRST } from '../../src/engine/constants';
import { applyAction } from '../../src/engine/index';
import { migrateState } from '../../src/engine/migrate';
import type { GameState } from '../../src/engine/index';
import { rearRowOf, yardBoxOf } from '../../src/engine/layout';
import { tidyYard } from '../../src/engine/premises';
import { act, buyNow, newGame, nextDay } from '../helpers';

/** The 800 m² unit, forty metres of rear wall, with money for anything; and ten metres more for
 *  every long extension asked. */
function longWall(longer = 0): GameState {
  let state = newGame({ difficulty: 'veryEasy' });
  state.cash = 90000000;
  state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
  state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'second' }));
  for (let stage = 0; stage < longer; stage += 1) {
    state.cash = 90000000;
    state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'long' }));
  }
  expect(state.unit.widthCells).toBe(40 + 10 * longer);
  return state;
}

interface Placed {
  id: string;
  specId: string;
  x: number;
  y: number;
  row: number;
}

/** Everything in the yard, landed or on its way, read from the far end of the first row towards
 *  the gate, then the second row, and so on. */
function yard(state: GameState): Placed[] {
  return [...state.equipment, ...state.onOrder]
    .filter((thing) => thing.anchorY < 0)
    .map((thing) => ({
      id: thing.id,
      specId: thing.specId,
      x: thing.anchorX,
      y: thing.anchorY,
      row: rearRowOf(thing.anchorY),
    }))
    .sort((left, right) => left.row - right.row || right.x - left.x);
}

function rankIn(kinds: readonly string[], specId: string): number {
  return Math.max(0, kinds.indexOf(specId));
}

const SHELTERS = ['timberShelter', 'glassShelter', 'timberShelterLarge'];

/** The yard as it stands is the yard laid out: laying it out again moves nothing, and it reads in
 *  the order of kinds asked, never back. */
function expectLaidOut(state: GameState, kinds: readonly string[] = YARD_ORDER): void {
  const before = yard(state);
  const again = structuredClone(state);
  tidyYard(again);
  expect(yard(again)).toEqual(before);
  const ranks = before.map((thing) => rankIn(kinds, thing.specId));
  expect(ranks).toEqual([...ranks].sort((left, right) => left - right));
}

describe('the yard behind the hall, laid out in its order (v111)', () => {
  it('stands what is bought in the order, whatever order it was bought in', () => {
    expect(YARD_ORDER).toEqual(['dustSystem', 'flexiSystem', 'pelletiser', ...SHELTERS]);
    let state = longWall(4);
    for (const specId of ['timberShelterLarge', 'glassShelter', 'timberShelter', 'glassShelter', 'timberShelter']) {
      state = buyNow(state, specId);
    }
    expectLaidOut(state);
    const shelters = yard(state).filter((thing) => SHELTERS.includes(thing.specId));
    expect(shelters.map((thing) => thing.specId)).toEqual([
      'timberShelter',
      'timberShelter',
      'glassShelter',
      'glassShelter',
      'timberShelterLarge',
    ]);
    // Side by side with the yard's metre between two, in a row: the second timber shelter a metre
    // past the first towards the gate.
    const [first, second] = shelters;
    if (first === undefined || second === undefined) throw new Error('two timber shelters are wanted');
    expect(second.row).toBe(first.row);
    const firstBox = yardBoxOf({ specId: first.specId, variantId: 'standard', orientation: 0 }, first.x, first.y);
    expect(first.x - (second.x + firstBox.width)).toBe(REAR_YARD_GAP_CELLS);
  });

  it('stands the large shelters first where the wall is too short for the order', () => {
    expect(YARD_ORDER_LARGE_FIRST).toEqual(['dustSystem', 'flexiSystem', 'pelletiser', 'timberShelterLarge', 'glassShelter', 'timberShelter']);
    let state = longWall();
    for (const specId of ['timberShelterLarge', 'glassShelter', 'timberShelter', 'glassShelter', 'timberShelter']) {
      state = buyNow(state, specId);
    }
    // Forty metres: the large shelter does not fit the shorter rows behind the first once the
    // others have taken the first, so it goes first.
    expectLaidOut(state, YARD_ORDER_LARGE_FIRST);
    expect(yard(state).filter((thing) => SHELTERS.includes(thing.specId)).map((thing) => thing.specId)).toEqual([
      'timberShelterLarge',
      'glassShelter',
      'glassShelter',
      'timberShelter',
      'timberShelter',
    ]);
  });

  it('holds an order s place in the order, and closes up when it is called off', () => {
    let state = buyNow(buyNow(longWall(), 'timberShelter'), 'timberShelterLarge');
    state = act(state, { type: 'BUY_EQUIPMENT', specId: 'glassShelter' });
    const held = state.onOrder.find((order) => order.specId === 'glassShelter');
    if (held === undefined) throw new Error('the glass shelter is on order');
    expectLaidOut(state);
    // The glass shelter's outline stands before the large timber shelter, which made room for it.
    const order = yard(state).filter((thing) => SHELTERS.includes(thing.specId)).map((thing) => thing.specId);
    expect(order).toEqual(['timberShelter', 'glassShelter', 'timberShelterLarge']);
    const large = yard(state).find((thing) => thing.specId === 'timberShelterLarge');
    state = act(state, { type: 'CANCEL_ORDER', orderId: held.id });
    expect(state.onOrder.some((order) => order.id === held.id)).toBe(false);
    expectLaidOut(state);
    const after = yard(state).find((thing) => thing.specId === 'timberShelterLarge');
    expect(after).not.toEqual(large);
  });

  it('closes up when a shelter sold is collected', () => {
    let state = longWall();
    for (const specId of ['timberShelter', 'timberShelter', 'glassShelter']) state = buyNow(state, specId);
    const sold = yard(state).find((thing) => thing.specId === 'timberShelter');
    if (sold === undefined) throw new Error('a timber shelter is wanted');
    const glassBefore = yard(state).find((thing) => thing.specId === 'glassShelter');
    state = applyAction(state, { type: 'SELL_MACHINE', equipmentId: sold.id });
    for (let day = 0; day < 4 && state.equipment.some((item) => item.id === sold.id); day += 1) state = nextDay(state);
    expect(state.equipment.some((item) => item.id === sold.id)).toBe(false);
    expectLaidOut(state);
    expect(yard(state).find((thing) => thing.specId === 'glassShelter')).not.toEqual(glassBefore);
  });

  it('lays an older save s yard out when it opens', () => {
    let state = longWall();
    for (const specId of ['glassShelter', 'timberShelter', 'timberShelterLarge']) state = buyNow(state, specId);
    // As a v51 save had it: the shelters where they happened to land, the large one first and the
    // timber shelter in the second row.
    const raw = structuredClone(state) as GameState & { version: number };
    const large = raw.equipment.find((item) => item.specId === 'timberShelterLarge');
    const timber = raw.equipment.find((item) => item.specId === 'timberShelter');
    const glass = raw.equipment.find((item) => item.specId === 'glassShelter');
    if (large === undefined || timber === undefined || glass === undefined) throw new Error('three shelters are wanted');
    [large.anchorX, large.anchorY] = [12, -4];
    [glass.anchorX, glass.anchorY] = [20, -8];
    [timber.anchorX, timber.anchorY] = [10, -12];
    raw.version = 51;
    const opened = migrateState(raw, 51);
    if (opened === null) throw new Error('the save opens');
    expectLaidOut(opened);
    expect(yard(opened).filter((thing) => SHELTERS.includes(thing.specId)).map((thing) => thing.specId)).toEqual([
      'timberShelter',
      'glassShelter',
      'timberShelterLarge',
    ]);
  });
});
