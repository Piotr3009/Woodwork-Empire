/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// v101: a second and a third row behind the rear wall [PIOTR, 17.10: "a second and a third row
// outside for the shelters and the other machines"], and the insurer's factor stopped at the 800 m2
// unit's two [PIOTR, 17.10: "the insurance is still too high", A].

import { describe, expect, it } from 'vitest';
import { insurerUnitFactor, unitCostFactor } from '../../src/engine/constants';
import { premiumYearlyFor } from '../../src/engine/insurance';
import { rearRowOf, rearYardPlaceFor } from '../../src/engine/layout';
import type { GameState } from '../../src/engine/index';
import { act, newGame, nextDay, placeEquipment } from '../helpers';

function deep(): GameState {
  let state = newGame({ difficulty: 'veryEasy' });
  state.cash = 9000000;
  state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
  state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'second' }));
  return state;
}

describe('three rows behind the rear wall (v101)', () => {
  it('fills the first row as before, then the second and the third, each a row and a metre further back', () => {
    const state = deep();
    const places: Array<{ x: number; y: number } | null> = [];
    for (let n = 0; n < 5; n += 1) {
      const at = rearYardPlaceFor(state, 'glassShelter');
      places.push(at);
      if (at !== null) placeEquipment(state, 'glassShelter', { x: at.x, y: at.y, id: `kit-shelter-${n}` });
    }
    // The first row a metre behind the wall, 3 m deep; the second's front a metre behind the
    // first's back, the third's a metre behind the second's.
    expect(places).toEqual([
      { x: 24, y: -4 },
      { x: 11, y: -4 },
      { x: 20, y: -8 },
      { x: 16, y: -12 },
      null,
    ]);
    expect([-4, -8, -12].map((y) => rearRowOf(y + 3))).toEqual([0, 1, 2]);
    // A plant 2 m deep in the first row is in the first row too.
    expect(rearRowOf(-3 + 2)).toBe(0);
  });

  it('puts nothing in the second row while the first has a length for it', () => {
    const state = deep();
    expect(rearYardPlaceFor(state, 'dustSystem')).toEqual({ x: 34, y: -3 });
  });
});

describe('the insurer s factor stopped at two (v101)', () => {
  it('is the unit s factor up to the 800 m2 unit, and two past it, while a flat security level reads the whole', () => {
    expect(insurerUnitFactor({ areaM2: 400, secondExtension: 'none' })).toBe(1);
    expect(insurerUnitFactor({ areaM2: 800, secondExtension: 'open' })).toBe(2);
    expect(insurerUnitFactor({ areaM2: 2430, secondExtension: 'open' })).toBe(2);
    expect(unitCostFactor({ areaM2: 2430, secondExtension: 'open' })).toBeCloseTo(6.075, 9);
    const state = deep();
    const before = premiumYearlyFor(state, 'liability');
    const longer = nextDay(act({ ...state, cash: 9000000 }, { type: 'EXTEND_UNIT', stage: 'long' }));
    expect(longer.unit.areaM2).toBe(1000);
    expect(premiumYearlyFor(longer, 'liability')).toBe(before);
  });
});
