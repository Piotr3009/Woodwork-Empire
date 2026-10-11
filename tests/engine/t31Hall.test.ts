/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// Turn 31, 2.7: the hall that grows [PIOTR, 11.10: "adding 200 m² at a time, each time 20 per cent
// dearer than the present price for 200, and of course everything goes up automatically"; "from
// 600"; "as many as the player wants"; "yes, more people"]. Ten metres more along the rear wall at
// a time, one at a time, the next working morning, the apron moved out with it, and everything the
// floor sets up with it (CLAUDE.md T31 2.7, section 7).

import { describe, expect, it } from 'vitest';
import {
  UNIT_LONG_EXTENSION_CELLS,
  UNIT_LONG_EXTENSION_GROWTH,
  UNIT_LONG_EXTENSION_PRICE,
  unitCostFactor,
} from '../../src/engine/constants';
import { standingPowerPerDay } from '../../src/engine/economy';
import type { GameEvent, GameState } from '../../src/engine/index';
import { premiumYearlyFor } from '../../src/engine/insurance';
import { canPlaceSpec, canteenLockers, crewLimit, lockersInWords } from '../../src/engine/layout';
import { extendUnitCheck, extensionTerms } from '../../src/engine/premises';
import { securitySubscriptionMonthly, securitySubscriptionParts } from '../../src/engine/security';
import { isFree } from '../../src/engine/walk';
import { act, buyNow, newGame, nextDay, placeEquipment, testJoiner } from '../helpers';

/** A company in the 800 m² unit with its canteen enlarged, a van on the apron, a saw in the hall,
 *  and the money for a long extension. */
function deep(): GameState {
  let state = newGame({ difficulty: 'veryEasy' });
  state.cash = 9000000;
  state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
  state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'second' }));
  state = act(state, { type: 'ENLARGE_CANTEEN' });
  placeEquipment(state, 'van', { x: state.unit.widthCells, y: 7, id: 'kit-van' });
  placeEquipment(state, 'tableSaw', { variantId: 'pro', x: 12, y: 6, id: 'kit-saw' });
  state.cash = 5000000;
  return state;
}

/** The hall a long extension longer: paid for today, open the next working morning. */
function longer(state: GameState, events: GameEvent[] = []): GameState {
  return nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'long' }), events);
}

describe('the offer of the hall that grows (CLAUDE.md T31 2.7)', () => {
  it('waits for the second extension, and money is then its only condition', () => {
    let state = newGame({ difficulty: 'veryEasy' });
    state.cash = 9000000;
    expect(extendUnitCheck(state, 'long')).toEqual({ ok: false, reason: 'Extend the unit along the front first' });
    state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
    expect(extendUnitCheck(state, 'long').ok).toBe(false);
    const ready = deep();
    expect(extendUnitCheck(ready, 'long')).toEqual({ ok: true, reason: '' });
    const short = deep();
    short.cash = extensionTerms(short, 'long').total - 1;
    expect(extendUnitCheck(short, 'long')).toEqual({ ok: false, reason: 'Not enough in the account' });
  });

  it('costs 600,000, 720,000, 864,000 and 1,036,800, each with the deposit on the bigger rent', () => {
    let state = deep();
    const prices: number[] = [];
    for (let n = 0; n < 4; n += 1) {
      const terms = extensionTerms(state, 'long');
      prices.push(terms.price);
      expect(terms.price).toBe(Math.round(UNIT_LONG_EXTENSION_PRICE * UNIT_LONG_EXTENSION_GROWTH ** n));
      expect(terms.deposit).toBe(terms.rentThen - terms.rentNow);
      const cash = state.cash;
      const paid = act(state, { type: 'EXTEND_UNIT', stage: 'long' });
      expect(paid.cash).toBe(cash - terms.total);
      state = nextDay(paid);
    }
    expect(prices).toEqual([600000, 720000, 864000, 1036800]);
  });

  it('is one at a time: the builders are in until the morning, and then the next is offered', () => {
    const paid = act(deep(), { type: 'EXTEND_UNIT', stage: 'long' });
    expect(paid.unit.longExtension).toBe('building');
    expect(paid.unit.widthCells).toBe(40);
    expect(extendUnitCheck(paid, 'long')).toEqual({ ok: false, reason: 'The builders are in' });
    expect(act(paid, { type: 'EXTEND_UNIT', stage: 'long' }).cash).toBe(paid.cash);
    const open = nextDay(paid);
    expect(open.unit).toMatchObject({ longExtensions: 1, longExtension: 'none' });
    expect(extendUnitCheck(open, 'long')).toEqual({ ok: true, reason: '' });
  });

  it('has no limit', () => {
    let state = deep();
    state.cash = 1e9;
    for (let n = 0; n < 8; n += 1) state = longer(state);
    expect(state.unit.widthCells).toBe(40 + 8 * UNIT_LONG_EXTENSION_CELLS);
    expect(extendUnitCheck(state, 'long')).toEqual({ ok: true, reason: '' });
    expect(extensionTerms(state, 'long').price).toBe(Math.round(600000 * 1.2 ** 8));
  });
});

describe('the hall ten metres longer the next working morning (CLAUDE.md T31 2.7)', () => {
  it('is 50 by 20 m, the apron and what stands on it moved out, the plant behind the wall where it stood', () => {
    // The timber shelter bought, which stands behind the rear wall with the plant (2.8).
    let before = buyNow(deep(), 'timberShelter');
    // A second van bought, on order for the apron, and a man standing out there.
    before = act(before, { type: 'BUY_EQUIPMENT', specId: 'van', variantId: 'standard' });
    const coming = before.onOrder.find((item) => item.specId === 'van');
    if (coming === undefined) throw new Error('the van on order is wanted');
    expect(coming.anchorX).toBeGreaterThanOrEqual(40);
    const man = testJoiner('w-out', 'Out', 41, 5);
    before.workers.push(man);
    const shelter = before.equipment.find((item) => item.specId === 'timberShelter');
    if (shelter === undefined) throw new Error('the shelter is wanted');
    const behind = { anchorX: shelter.anchorX, anchorY: shelter.anchorY };
    expect(behind.anchorY).toBeLessThan(0);
    const events: GameEvent[] = [];
    const open = longer(before, events);
    expect(open.unit).toMatchObject({ widthCells: 50, depthCells: 20, areaM2: 1000 });
    expect(open.equipment.find((item) => item.id === 'kit-van')).toMatchObject({ anchorX: 50, anchorY: 7 });
    expect(open.equipment.find((item) => item.id === shelter.id)).toMatchObject(behind);
    expect(open.onOrder.find((item) => item.id === coming.id)?.anchorX).toBe(coming.anchorX + 10);
    expect(open.workers.find((worker) => worker.id === 'w-out')?.anchorX).toBe(51);
    expect(open.equipment.find((item) => item.id === 'kit-saw')).toMatchObject({ anchorX: 12, anchorY: 6 });
    const said = events.filter((event) => event.kind === 'unitExtended');
    expect(said.map((event) => event.title)).toEqual(['The hall is ten metres longer']);
    expect(said[0]?.body).toContain('The hall is 50 by 20 m now, 1,000 m², with room for 40 joiners and 30 benches.');
    expect(said[0]?.body).toContain('The canteen holds 40 lockers now.');
    // The new floor takes a machine and a man.
    expect(canPlaceSpec(before, 'tableSaw', 44, 6, null).ok).toBe(false);
    expect(canPlaceSpec(open, 'tableSaw', 44, 6, null).ok).toBe(true);
    expect(isFree(open, { x: 49, y: 19 })).toBe(true);
  });

  it('opens on a working morning: a Friday s click is the Monday s hall', () => {
    let state = deep();
    while ((state.clock.day - 1) % 7 !== 4) state = nextDay(state);
    const paid = act(state, { type: 'EXTEND_UNIT', stage: 'long' });
    const monday = nextDay(paid);
    expect((monday.clock.day - 1) % 7).toBe(0);
    expect(monday.unit.widthCells).toBe(50);
  });
});

describe('everything goes up with the floor (CLAUDE.md T31 2.7)', () => {
  it('the rent, the rates, the benches, the power and the joiners by the area', () => {
    const before = deep();
    const terms = extensionTerms(before, 'long');
    expect([terms.rentNow, terms.rentThen, terms.ratesNow, terms.ratesThen]).toEqual([9600, 12000, 1800, 2250]);
    expect([terms.powerNow, terms.powerThen]).toEqual([16, 20]);
    expect([terms.joiners, terms.benches, terms.lockers]).toEqual([40, 30, 40]);
    const open = longer(before);
    expect(open.unit).toMatchObject({ rentMonthly: 12000, ratesMonthly: 2250, benchSlots: 30 });
    expect(standingPowerPerDay(open.unit)).toBe(20);
    expect(crewLimit(open)).toBe(40);
    const third = longer(longer(open));
    expect(third.unit).toMatchObject({ widthCells: 70, areaM2: 1400, rentMonthly: 16800, ratesMonthly: 3150, benchSlots: 42 });
    expect(standingPowerPerDay(third.unit)).toBe(28);
    expect(crewLimit(third)).toBe(56);
  });

  it('the insurer and a flat security level by the area over 400, and a firm s month by the area', () => {
    const before = deep();
    const open = longer(before);
    expect(unitCostFactor(before.unit)).toBe(2);
    expect(unitCostFactor(open.unit)).toBe(2.5);
    expect(premiumYearlyFor(open, 'liability')).toBeCloseTo(premiumYearlyFor(before, 'liability') * 1.25, 6);
    expect(premiumYearlyFor(open, 'property')).toBeCloseTo(premiumYearlyFor(before, 'property') * 1.25, 1);
    // The dogs are 150 a month flat, 300 in the 800 m² unit, and 375 at 1,000 m²; a firm's month is
    // the area's, five times 200.
    expect(securitySubscriptionMonthly(open, 3)).toBe(375);
    expect(securitySubscriptionParts(open, 5).areaFactor).toBe(5);
    expect(securitySubscriptionMonthly(open, 5)).toBeCloseTo(securitySubscriptionMonthly(before, 5) * 1.25, 6);
  });

  it('eight lockers more in the enlarged canteen for every 200 m² past 800, said in figures', () => {
    const open = longer(deep());
    expect(canteenLockers(open)).toBe(40);
    expect(lockersInWords(open)).toBe('40');
    const third = longer(longer(open));
    expect(canteenLockers(third)).toBe(56);
    // A canteen that was never enlarged holds its eight, however long the hall.
    const narrow: GameState = { ...third, unit: { ...third.unit, canteenWide: false } };
    expect(canteenLockers(narrow)).toBe(8);
  });
});
