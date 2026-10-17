/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// v103: the large timber shelter [PIOTR, 17.10: "a mega timber shelter outside for 500k, for 3,000
// timber, like the one for glass"]: 3,000 boards behind the rear wall, counted with the timber
// stores, standing in for a timber store on the board, drawn as kit with no picture for now.

import { describe, expect, it } from 'vitest';
import { missingEquipment, template } from '../../src/engine/catalog';
import { standsBehindTheWall } from '../../src/engine/layout';
import { boardCapacityOf, findSpec, roomFor, stockKindOf } from '../../src/engine/machines';
import { restockCheck } from '../../src/engine/materials';
import type { GameState } from '../../src/engine/index';
import { act, buyNow, buyStartingKit, newGame, nextDay } from '../helpers';

/** The 800 m2 unit: 40 m of rear wall, where an 18 m shelter has room. */
function hall(): GameState {
  let state = newGame({ difficulty: 'veryEasy' });
  state.cash = 9000000;
  state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
  state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'second' }));
  state = buyStartingKit(state);
  state.cash = 2000000;
  return state;
}

describe('the large timber shelter (v103)', () => {
  it('is a family of one class in the storage tab, 3,000 boards for £500,000', () => {
    expect(findSpec('timberShelterLarge')).toMatchObject({
      name: 'Large timber shelter',
      folder: 'Large timber shelters',
      tab: 'storage',
      price: 500000,
      deliveryDays: 15,
      width: 18,
      depth: 3,
      boardCapacity: 3000,
    });
    expect(standsBehindTheWall('timberShelterLarge')).toBe(true);
  });

  it('stands behind the rear wall, holds boards and nothing else, and stands in for a timber store', () => {
    const sash = template('sashWindows');
    expect(missingEquipment(hall(), sash)).toContain('timberRack');
    const state = buyNow(hall(), 'timberShelterLarge');
    const shelter = state.equipment.find((item) => item.specId === 'timberShelterLarge');
    if (shelter === undefined) throw new Error('the shelter is wanted');
    expect(shelter.anchorY).toBeLessThan(0);
    expect(boardCapacityOf(shelter)).toBe(3000);
    expect(stockKindOf(shelter)).toBe('boards');
    expect(roomFor(state, 'boards')).toBe(3000);
    expect(restockCheck(state, 'boards').ok).toBe(true);
    expect(missingEquipment(state, sash)).not.toContain('timberRack');
  });
});
