// Security in five levels, and the burglary (CLAUDE.md T13 3.17): fixed costs the player feels,
// a firm that scales with the hall, and level 5 at zero risk, where zero means zero (PIOTR).

import { describe, expect, it } from 'vitest';
import {
  BURGLARY_MACHINES_MAX,
  BURGLARY_MACHINES_MIN,
  BURGLARY_PAYOUT_DAYS,
  SECURITY_LEVELS,
  SECURITY_SCALE_AREA_M2,
  SECURITY_SCALE_VALUE,
  SHEET_VALUE,
} from '../../src/engine/constants';
import { claimBurglary, insuredValue } from '../../src/engine/insurance';
import { float } from '../../src/engine/rng';
import {
  burglaryPaidOut,
  burglaryTargets,
  burgle,
  rollBurglary,
  runSecurityMonth,
  securitySubscriptionMonthly,
  securitySubscriptionParts,
} from '../../src/engine/security';
import type { GameState } from '../../src/engine/index';
import { act, newGame, placeEquipment } from '../helpers';

/** A hall with three machines of three prices, a fan, twenty sheets and six of them reserved. */
function shop(): GameState {
  const state = newGame({ difficulty: 'veryEasy' });
  placeEquipment(state, 'extractor', { variantId: 'standard', x: 18, y: 3, id: 'kit-fan' });
  placeEquipment(state, 'tableSaw', { variantId: 'industrial', x: 2, y: 1, id: 'kit-dear' });
  placeEquipment(state, 'tableSaw', { variantId: 'standard', x: 8, y: 1, id: 'kit-middle' });
  placeEquipment(state, 'tableSaw', { variantId: 'used', x: 13, y: 1, id: 'kit-cheap' });
  state.stock.sheets = 20;
  state.jobs.push({
    ...({} as GameState['jobs'][number]),
    id: 'job-1',
    stage: 'ready',
    sheets: 6,
    sheetsReserved: 6,
    sheetsUsed: 0,
  });
  return state;
}

describe('the ladder', () => {
  it('is five levels over nothing, class 5 at zero risk, and the risk falls every step', () => {
    expect(SECURITY_LEVELS.map((spec) => spec.level)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(SECURITY_LEVELS[5]?.risk).toBe(0);
    for (let index = 1; index < SECURITY_LEVELS.length; index += 1) {
      expect(SECURITY_LEVELS[index]?.risk).toBeLessThan(SECURITY_LEVELS[index - 1]?.risk ?? 0);
    }
    expect(SECURITY_LEVELS[1]).toMatchObject({ name: 'Alarm', price: 500 });
  });

  it('charges the one off price on the way up, nothing on the way down, and the monthly on the 1st', () => {
    let state = newGame({ difficulty: 'veryEasy' });
    const start = state.cash;
    state = act(state, { type: 'SET_SECURITY_LEVEL', level: 2 });
    expect(state.security.level).toBe(2);
    expect(state.cash).toBe(start - 1500);
    expect(state.ledger[state.ledger.length - 1]).toMatchObject({ category: 'security', amount: -1500 });
    // The same click again does nothing (CLAUDE.md T13 1).
    state = act(state, { type: 'SET_SECURITY_LEVEL', level: 2 });
    expect(state.cash).toBe(start - 1500);
    state = act(state, { type: 'SET_SECURITY_LEVEL', level: 1 });
    expect(state.security.level).toBe(1);
    expect(state.cash).toBe(start - 1500);
    // The dogs are fed monthly on top of the bars bought once.
    state = act(state, { type: 'SET_SECURITY_LEVEL', level: 3 });
    expect(state.cash).toBe(start - 1500 - 2500);
    const before = state.cash;
    runSecurityMonth(state);
    expect(state.cash).toBe(before - 150);
    expect(state.ledger[state.ledger.length - 1]).toMatchObject({ category: 'security', amount: -150 });
  });
});

describe('the subscription of a firm', () => {
  it('scales with the area over 200 and one plus the insured value over 100,000', () => {
    const state = newGame({ difficulty: 'veryEasy' });
    state.equipment = [];
    state.stock.sheets = 0;
    expect(insuredValue(state)).toBe(0);
    state.unit.areaM2 = SECURITY_SCALE_AREA_M2;
    expect(securitySubscriptionMonthly(state, 4)).toBe(250);
    expect(securitySubscriptionMonthly(state, 5)).toBe(600);
    state.unit.areaM2 = SECURITY_SCALE_AREA_M2 * 2;
    expect(securitySubscriptionMonthly(state, 4)).toBe(500);
    // Kit worth the reference value doubles it again.
    placeEquipment(state, 'tableSaw', { variantId: 'industrial', x: 2, y: 1, id: 'kit-a' });
    const saw = state.equipment.find((item) => item.id === 'kit-a');
    if (!saw) throw new Error('no saw');
    saw.purchasePrice = SECURITY_SCALE_VALUE;
    expect(insuredValue(state)).toBe(SECURITY_SCALE_VALUE);
    expect(securitySubscriptionMonthly(state, 4)).toBe(1000);
    expect(securitySubscriptionMonthly(state, 5)).toBe(2400);
    const parts = securitySubscriptionParts(state, 5);
    expect(parts).toEqual({
      base: 600,
      areaM2: 400,
      areaFactor: 2,
      insured: SECURITY_SCALE_VALUE,
      valueFactor: 2,
      monthly: 2400,
    });
    // The one off levels never scale.
    expect(securitySubscriptionMonthly(state, 3)).toBe(150);
    expect(securitySubscriptionMonthly(state, 1)).toBe(0);
  });
});

describe('the roll', () => {
  it('never burgles at level 5 over ten thousand months, with the stream advancing', () => {
    const state = newGame({ difficulty: 'veryEasy', seed: 7 });
    state.security.level = 5;
    let hits = 0;
    for (let month = 0; month < 10000; month += 1) {
      if (rollBurglary(state)) hits += 1;
      float(state, 0, 1);
    }
    expect(hits).toBe(0);
  });

  it('does burgle at level 0 sooner or later, and less often at level 1', () => {
    const count = (level: number): number => {
      const state = newGame({ difficulty: 'veryEasy', seed: 11 });
      state.security.level = level;
      let hits = 0;
      for (let day = 0; day < 10000; day += 1) if (rollBurglary(state)) hits += 1;
      return hits;
    };
    expect(count(0)).toBeGreaterThan(0);
    expect(count(1)).toBeLessThan(count(0));
  });
});

describe('what a burglary takes', () => {
  it('goes for the dearest machines first, one or two of them, never the fan', () => {
    const state = shop();
    expect(burglaryTargets(state, 1).map((item) => item.id)).toEqual(['kit-dear']);
    expect(burglaryTargets(state, 2).map((item) => item.id)).toEqual(['kit-dear', 'kit-middle']);
    expect(burglaryTargets(state, 5).map((item) => item.id)).toEqual(['kit-dear', 'kit-middle', 'kit-cheap']);
    expect(BURGLARY_MACHINES_MIN).toBe(1);
    expect(BURGLARY_MACHINES_MAX).toBe(2);
  });

  it('takes them and the free stock, leaves the reserved sheets, and says what went', () => {
    const state = shop();
    const dear = state.equipment.find((item) => item.id === 'kit-dear');
    const middle = state.equipment.find((item) => item.id === 'kit-middle');
    if (!dear || !middle) throw new Error('no saw');
    state.gates.push('kit-dear');
    expect(state.pipes.some((run) => run.equipmentId === 'kit-dear')).toBe(true);
    const lost = burgle(state);
    const gone = ['kit-dear', 'kit-middle', 'kit-cheap'].filter(
      (id) => !state.equipment.some((item) => item.id === id),
    );
    expect(gone[0]).toBe('kit-dear');
    expect(gone.length).toBeGreaterThanOrEqual(BURGLARY_MACHINES_MIN);
    expect(gone.length).toBeLessThanOrEqual(BURGLARY_MACHINES_MAX);
    expect(state.equipment.some((item) => item.id === 'kit-fan')).toBe(true);
    // The free fourteen sheets go; the six the job reserved are what is left.
    expect(state.stock.sheets).toBe(6);
    const machines = gone.length === 1 ? dear.purchasePrice : dear.purchasePrice + middle.purchasePrice;
    expect(lost).toBe(machines + 14 * SHEET_VALUE);
    // The pipe and the gate went with the saw.
    expect(state.pipes.some((run) => run.equipmentId === 'kit-dear')).toBe(false);
    expect(state.gates).toEqual([]);
    expect(state.security.lastBurglaryDay).toBe(state.clock.day);
    // A line of the ledger that moved no cash, and the event that tells the player.
    const line = state.ledger[state.ledger.length - 1];
    expect(line).toMatchObject({ category: 'burglary', amount: -lost, unpaid: true });
    const event = state.eventQueue[state.eventQueue.length - 1];
    expect(event?.kind).toBe('burglary');
    expect(event?.body).toContain('industrial table saw');
    expect(event?.body).toContain('14 sheets of stock');
    expect(event?.body).toContain('No property cover');
    expect(event?.data.paid).toBe(false);
  });

  it('is paid out at level 1 with property cover, and not at all at level 0', () => {
    const insured = shop();
    insured.insurance.property = true;
    expect(burglaryPaidOut(insured)).toBe(false);
    const lost = burgle(insured);
    expect(claimBurglary(insured, lost)).toBe(false);
    expect(insured.insurance.payouts).toEqual([]);
    expect(insured.eventQueue[insured.eventQueue.length - 1]?.body).toContain('no alarm');

    const alarmed = shop();
    alarmed.insurance.property = true;
    alarmed.security.level = 1;
    expect(burglaryPaidOut(alarmed)).toBe(true);
    const value = burgle(alarmed);
    expect(claimBurglary(alarmed, value)).toBe(true);
    expect(alarmed.insurance.payouts).toHaveLength(1);
    expect(alarmed.insurance.payouts[0]?.daysLeft).toBe(BURGLARY_PAYOUT_DAYS);
    expect(alarmed.insurance.payouts[0]?.perDay).toBe(Math.round((value / BURGLARY_PAYOUT_DAYS) * 100) / 100);
    expect(alarmed.eventQueue[alarmed.eventQueue.length - 1]?.body).toContain('pays it out');
  });
});
