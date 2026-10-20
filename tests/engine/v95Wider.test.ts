/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// v95: the hall made wider [PIOTR, 12.10: "the extension of the hall I have only along the
// length, and where is the width?"; "3 ok" to seven metres at a time, £3,000 a square metre and 20
// per cent more for every extension after, long and wide counted together]. Seven metres more of
// depth along the whole front at a time, one at a time and one builder at a time with the long
// one, the next working morning, nothing moved, and everything the floor sets up with it.

import { describe, expect, it } from 'vitest';
import {
  LINE_MODULES,
  UNIT_EXTENSION_PRICE_PER_M2,
  UNIT_LONG_EXTENSION_GROWTH,
  UNIT_WIDE_EXTENSION_CELLS,
  WINDOW_LINE_ORIGIN,
  unitCostFactor,
} from '../../src/engine/constants';
import { standingPowerPerDay } from '../../src/engine/economy';
import { placeEquipmentOrder } from '../../src/engine/game';
import type { GameEvent, GameState } from '../../src/engine/index';
import { premiumYearlyFor } from '../../src/engine/insurance';
import {
  canPlaceSpec,
  canteenLockers,
  cellIsFloor,
  crewLimit,
  laneTrouble,
  lineLanes,
  linePlace,
  lineSite,
} from '../../src/engine/layout';
import { lineState } from '../../src/engine/lineContract';
import { extendUnitCheck, extensionTerms } from '../../src/engine/premises';
import { securitySubscriptionMonthly } from '../../src/engine/security';
import { isFree } from '../../src/engine/walk';
import { act, buyNow, newGame, nextDay, placeEquipment } from '../helpers';

/** A company in the 800 m² unit with its canteen enlarged, a van on the apron, a saw in the hall,
 *  and the money for the hall made wider. */
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

/** The hall made seven metres wider: paid for today, open the next working morning. */
function wider(state: GameState, events: GameEvent[] = []): GameState {
  return nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'wide' }), events);
}

function longer(state: GameState): GameState {
  return nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'long' }));
}

describe('the offer of the hall made wider (v95)', () => {
  it('waits for the second extension, and money is then its only condition', () => {
    let state = newGame({ difficulty: 'veryEasy' });
    state.cash = 9000000;
    expect(extendUnitCheck(state, 'wide')).toEqual({ ok: false, reason: 'Extend the unit along the front first' });
    state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
    expect(extendUnitCheck(state, 'wide')).toEqual({ ok: false, reason: 'Extend the unit along the front first' });
    expect(extendUnitCheck(deep(), 'wide')).toEqual({ ok: true, reason: '' });
    const short = deep();
    short.cash = extensionTerms(short, 'wide').total - 1;
    expect(extendUnitCheck(short, 'wide')).toEqual({ ok: false, reason: 'Not enough in the account' });
  });

  it('costs £3,000 a square metre: 840,000 for the first 280 m², and 20 per cent more for the next', () => {
    expect(UNIT_EXTENSION_PRICE_PER_M2).toBe(3000);
    let state = deep();
    const first = extensionTerms(state, 'wide');
    expect(first).toMatchObject({ price: 840000, addsM2: 280, areaM2: 1080, widthCells: 40, depthCells: 27 });
    // With the landlord's deposit on the bigger rent, as the other extensions.
    expect(first.deposit).toBe(first.rentThen - first.rentNow);
    const cash = state.cash;
    const paid = act(state, { type: 'EXTEND_UNIT', stage: 'wide' });
    expect(paid.cash).toBe(cash - first.total);
    expect(paid.ledger.at(-2)).toMatchObject({ category: 'unitExtension', label: 'Extension of the unit, 280 m²', amount: -840000 });
    state = nextDay(paid);
    // 1,008,000 until v116, 966,000 until v122: the growth is 1.1 (PIOTR, 20.10).
    expect(extensionTerms(state, 'wide')).toMatchObject({ price: 924000, addsM2: 280, depthCells: 34 });
  });

  it('counts the long ones and the wide ones together, each priced by the square metres it adds', () => {
    // Wider first: the long one after it is ten metres of a hall twenty seven deep, the second of
    // the two.
    const widerFirst = wider(deep());
    expect(extensionTerms(widerFirst, 'long')).toMatchObject({ price: 891000, addsM2: 270, widthCells: 50, depthCells: 27 });
    // Longer first: the wide one after it is seven metres of a hall fifty long.
    const longerFirst = longer(deep());
    expect(extensionTerms(longerFirst, 'wide')).toMatchObject({ price: 1155000, addsM2: 350, widthCells: 50, depthCells: 27 });
    expect(Math.round(UNIT_EXTENSION_PRICE_PER_M2 * 350 * UNIT_LONG_EXTENSION_GROWTH)).toBe(1155000);
    // And the long ones of a hall twenty deep cost what they cost before.
    expect(extensionTerms(deep(), 'long').price).toBe(600000);
    expect(extensionTerms(longerFirst, 'long').price).toBe(660000);
  });

  it('is one at a time, and the long one waits while the builders are in for it, and the other way', () => {
    const paid = act(deep(), { type: 'EXTEND_UNIT', stage: 'wide' });
    expect(paid.unit.wideExtension).toBe('building');
    expect(paid.unit.depthCells).toBe(20);
    expect(extendUnitCheck(paid, 'wide')).toEqual({ ok: false, reason: 'The builders are in' });
    expect(extendUnitCheck(paid, 'long')).toEqual({ ok: false, reason: 'The builders are in' });
    expect(act(paid, { type: 'EXTEND_UNIT', stage: 'long' }).cash).toBe(paid.cash);
    const open = nextDay(paid);
    expect(open.unit).toMatchObject({ wideExtensions: 1, wideExtension: 'none', longExtensions: 0, longExtension: 'none' });
    expect(extendUnitCheck(open, 'wide')).toEqual({ ok: true, reason: '' });
    expect(extendUnitCheck(open, 'long')).toEqual({ ok: true, reason: '' });
    const building = act(deep(), { type: 'EXTEND_UNIT', stage: 'long' });
    expect(extendUnitCheck(building, 'wide')).toEqual({ ok: false, reason: 'The builders are in' });
  });

  it('has no limit', () => {
    let state = deep();
    state.cash = 1e9;
    for (let n = 0; n < 5; n += 1) state = wider(state);
    expect(state.unit.depthCells).toBe(20 + 5 * UNIT_WIDE_EXTENSION_CELLS);
    expect(extendUnitCheck(state, 'wide')).toEqual({ ok: true, reason: '' });
    expect(extensionTerms(state, 'wide').price).toBe(Math.round(3000 * 280 * 1.1 ** 5));
  });
});

describe('the hall seven metres wider the next working morning (v95)', () => {
  it('is 40 by 27 m, nothing moved, the apron as long as the hall is deep, and a card that says so', () => {
    const before = buyNow(deep(), 'timberShelter');
    const shelter = before.equipment.find((item) => item.specId === 'timberShelter');
    if (shelter === undefined) throw new Error('the shelter is wanted');
    const events: GameEvent[] = [];
    const open = wider(before, events);
    expect(open.unit).toMatchObject({ widthCells: 40, depthCells: 27, areaM2: 1080 });
    expect(open.equipment.find((item) => item.id === 'kit-van')).toMatchObject({ anchorX: 40, anchorY: 7 });
    expect(open.equipment.find((item) => item.id === 'kit-saw')).toMatchObject({ anchorX: 12, anchorY: 6 });
    expect(open.equipment.find((item) => item.id === shelter.id)).toMatchObject({ anchorX: shelter.anchorX, anchorY: shelter.anchorY });
    const said = events.filter((event) => event.kind === 'unitExtended');
    expect(said.map((event) => event.title)).toEqual(['The hall is seven metres wider']);
    expect(said[0]?.body).toBe(
      'The builders are out. The hall is 40 by 27 m now, 1,080 m², with room for 43 joiners and 32 benches. ' +
        'The rent, the rates and the power are charged on the bigger unit from today, and the insurer and the ' +
        'security charge for it from the 1st. The canteen holds 43 lockers now.',
    );
    // The new floor takes a machine and a man, and the apron past the end of the hall is as long as
    // the hall is deep.
    expect(canPlaceSpec(before, 'tableSaw', 12, 23, null).ok).toBe(false);
    expect(canPlaceSpec(open, 'tableSaw', 12, 23, null).ok).toBe(true);
    expect(isFree(open, { x: 39, y: 26 })).toBe(true);
    expect(cellIsFloor(before, { x: 41, y: 24 })).toBe(false);
    expect(cellIsFloor(open, { x: 41, y: 24 })).toBe(true);
  });

  it('opens on a working morning: a Friday s click is the Monday s hall', () => {
    let state = deep();
    while ((state.clock.day - 1) % 7 !== 4) state = nextDay(state);
    const monday = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'wide' }));
    expect((monday.clock.day - 1) % 7).toBe(0);
    expect(monday.unit.depthCells).toBe(27);
  });
});

describe('everything goes up with the floor (v95)', () => {
  it('the rent, the rates, the benches, the power, the joiners and the lockers by the area', () => {
    const before = deep();
    const terms = extensionTerms(before, 'wide');
    expect([terms.rentNow, terms.rentThen, terms.ratesNow, terms.ratesThen]).toEqual([9600, 12960, 1800, 2430]);
    expect([terms.powerNow, terms.powerThen]).toEqual([16, 21.6]);
    expect([terms.joiners, terms.benches, terms.lockers]).toEqual([43, 32, 43]);
    const open = wider(before);
    expect(open.unit).toMatchObject({ rentMonthly: 12960, ratesMonthly: 2430, benchSlots: 32 });
    expect(standingPowerPerDay(open.unit)).toBeCloseTo(21.6, 9);
    expect(crewLimit(open)).toBe(43);
    // A locker for every joiner the hall takes, counted to the square metre: 280 m² is not a whole
    // 200 more, and the canteen keeps up with the men all the same.
    expect(canteenLockers(open)).toBe(43);
    const twice = wider(open);
    expect(twice.unit).toMatchObject({ widthCells: 40, depthCells: 34, areaM2: 1360 });
    expect([crewLimit(twice), canteenLockers(twice)]).toEqual([54, 54]);
  });

  it('the insurer at two past the 800 m2 unit, a flat security level by the area over 400, and a firm s month by the area', () => {
    const before = deep();
    const open = wider(before);
    expect(unitCostFactor(before.unit)).toBe(2);
    expect(unitCostFactor(open.unit)).toBeCloseTo(2.7, 9);
    // The insurer's factor stops at two from v101 [PIOTR, 17.10].
    expect(premiumYearlyFor(open, 'liability')).toBeCloseTo(premiumYearlyFor(before, 'liability'), 6);
    expect(securitySubscriptionMonthly(open, 3)).toBe(405);
    expect(securitySubscriptionMonthly(open, 5)).toBeCloseTo(securitySubscriptionMonthly(before, 5) * 1.35, 6);
  });
});

describe('a production line in the seven metres (v95)', () => {
  /** Two lines in the 800 m² unit, the first at its own place and the second behind it, the day one
   *  kit at the rear wall out of their way. */
  function twoLines(state: GameState): GameState {
    for (const item of state.equipment) if (item.id === 'kit-saw') [item.anchorX, item.anchorY] = [20, 2];
    LINE_MODULES.forEach((id, index) => placeEquipment(state, id, { x: WINDOW_LINE_ORIGIN.x + 6 * index, y: WINDOW_LINE_ORIGIN.y, id: `kit-line-${index + 1}` }));
    for (const item of state.equipment) if (item.id.startsWith('kit-line-')) item.line = 1;
    lineState(state, 1);
    state.cash = 50000000;
    state.reputation = 40;
    expect(placeEquipmentOrder(state, 'windowLine1').ok).toBe(true);
    expect(linePlace(state, 2)).toEqual({ x: 2, y: 7 });
    return state;
  }

  it('has room for a third line in front of the first, with its lane along the new front', () => {
    const eight = twoLines(deep());
    expect(lineSite(eight, 'window')).toBeNull();
    const open = twoLines(wider(deep()));
    expect(lineSite(open, 'window')).toEqual({ x: 2, y: 21 });
    expect(laneTrouble(open, { x: 2, y: 21 }, 'window')).toBeNull();
    expect(placeEquipmentOrder(open, 'windowLine1').ok).toBe(true);
    expect(linePlace(open, 3)).toEqual({ x: 2, y: 21 });
    const lane = lineLanes(open).find((entry) => entry.line === 3);
    expect(lane?.front).toEqual({ x: 0, y: 25, width: 38, depth: 2 });
  });
});
