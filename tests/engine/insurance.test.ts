// Insurance (CLAUDE.md T13 3.15): the property premium follows the insured value on a purchase,
// the uninsured accident books a claim in the band and the insured one does not, the level 0
// payout is zero and the level 1 payout lands a slice a day over ten days.

import { describe, expect, it } from 'vitest';
import {
  BURGLARY_PAYOUT_DAYS,
  DAYS_PER_MONTH,
  LIABILITY_BASE_YEARLY,
  LIABILITY_PER_EMPLOYEE_YEARLY,
  PROPERTY_INSURANCE_RATE_YEARLY,
  SHEET_VALUE,
  UNINSURED_CLAIM_MAX,
  UNINSURED_CLAIM_MIN,
} from '../../src/engine/constants';
import {
  claimBurglary,
  coversHeld,
  firstPremiumFor,
  insuranceCheck,
  insuredValue,
  liabilityPremiumYearly,
  monthlyPremiums,
  onAccident,
  propertyCoverVoid,
  propertyPremiumYearly,
  runInsuranceDay,
  runInsuranceMonth,
  setInsurance,
} from '../../src/engine/insurance';
import type { GameState, LedgerCategory, LedgerEntry } from '../../src/engine/index';
import { act, buyNow, buyStartingKit, fillRack, hireNow, newGame, runToDay } from '../helpers';

function linesOf(state: GameState, category: LedgerCategory): LedgerEntry[] {
  return state.ledger.filter((entry) => entry.category === category);
}

function pence(value: number): number {
  return Math.round(value * 100) / 100;
}

/** The day 1 kit with ten sheets on the rack, settled so the insured value is written down. */
function hall(): GameState {
  const state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 10);
  return act(state, { type: 'SET_SPEED', speed: 1 });
}

describe('the insured value and the property premium', () => {
  it('is every machine at what it cost and the stock at its value, written down after settle', () => {
    const state = hall();
    const machines = state.equipment.reduce((total, item) => total + item.purchasePrice, 0);
    expect(machines).toBeGreaterThan(0);
    expect(insuredValue(state)).toBe(machines + 10 * SHEET_VALUE);
    expect(state.insurance.insuredValue).toBe(insuredValue(state));
    expect(propertyPremiumYearly(state)).toBe(pence(insuredValue(state) * PROPERTY_INSURANCE_RATE_YEARLY));
  });

  it('follows a purchase and a change of stock', () => {
    const state = hall();
    const before = state.insurance.insuredValue;
    const bought = buyNow(state, 'thicknesser');
    const machine = bought.equipment.find((item) => item.specId === 'thicknesser');
    expect(machine).toBeDefined();
    expect(bought.insurance.insuredValue).toBe(before + (machine?.purchasePrice ?? 0));
    bought.stock.sheets += 5;
    const restocked = act(bought, { type: 'SET_SPEED', speed: 1 });
    expect(restocked.insurance.insuredValue).toBe(bought.insurance.insuredValue + 5 * SHEET_VALUE);
    expect(propertyPremiumYearly(restocked)).toBeGreaterThan(propertyPremiumYearly(state));
  });

  it('leaves a sold machine out', () => {
    const state = hall();
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    if (!saw) throw new Error('a saw is wanted');
    const before = insuredValue(state);
    saw.soldOnDay = state.clock.day;
    expect(insuredValue(state)).toBe(before - saw.purchasePrice);
  });
});

describe('public liability', () => {
  it('is the base plus so much a head', () => {
    const state = hall();
    state.reputation = 40;
    expect(liabilityPremiumYearly(state)).toBe(LIABILITY_BASE_YEARLY);
    // The helper needs no bench and no cabinet, so he is the one hire the day 1 hall allows.
    const hired = hireNow(state, 'helper', null);
    expect(hired.workers).toHaveLength(1);
    expect(liabilityPremiumYearly(hired)).toBe(LIABILITY_BASE_YEARLY + LIABILITY_PER_EMPLOYEE_YEARLY);
    hired.workers.push({ ...hired.workers[0], id: 'staff-two', name: 'Two' } as (typeof hired.workers)[number]);
    expect(liabilityPremiumYearly(hired)).toBe(LIABILITY_BASE_YEARLY + 2 * LIABILITY_PER_EMPLOYEE_YEARLY);
  });
});

describe('taking and dropping a cover', () => {
  it('pays the rest of the month at once, and refunds nothing on dropping', () => {
    const state = newGame();
    state.clock.day = 16;
    const monthly = pence(LIABILITY_BASE_YEARLY / 12);
    const rest = pence((monthly * 15) / DAYS_PER_MONTH);
    expect(firstPremiumFor(state, 'liability')).toBe(rest);
    const before = state.cash;
    expect(setInsurance(state, 'liability', true).ok).toBe(true);
    expect(state.insurance.liability).toBe(true);
    expect(state.cash).toBe(pence(before - rest));
    const lines = linesOf(state, 'insurance');
    expect(lines).toHaveLength(1);
    expect(lines[0]?.label).toBe('Public liability insurance, to the end of the month');
    expect(setInsurance(state, 'liability', false).ok).toBe(true);
    expect(state.insurance.liability).toBe(false);
    expect(state.cash).toBe(pence(before - rest));
    expect(linesOf(state, 'insurance')).toHaveLength(1);
  });

  it('is the whole twelfth on the 1st', () => {
    const state = newGame();
    expect(state.clock.day).toBe(1);
    expect(firstPremiumFor(state, 'liability')).toBe(pence(LIABILITY_BASE_YEARLY / 12));
  });

  it('refuses what the cash cannot cover, a cover already held, and dropping one not held', () => {
    const state = newGame();
    state.cash = state.finance.overdraftLimit + 10;
    expect(insuranceCheck(state, 'liability', true)).toEqual({
      ok: false,
      reason: 'Not enough cash for the first premium',
    });
    expect(setInsurance(state, 'liability', true).ok).toBe(false);
    expect(state.insurance.liability).toBe(false);
    state.cash = 5000;
    expect(setInsurance(state, 'liability', true).ok).toBe(true);
    expect(setInsurance(state, 'liability', true)).toEqual({ ok: false, reason: 'Already held' });
    expect(setInsurance(state, 'property', false)).toEqual({ ok: false, reason: 'Not held' });
  });

  it('never moves the reputation, and both held is the gate', () => {
    const state = newGame();
    const reputation = state.reputation;
    setInsurance(state, 'property', true);
    setInsurance(state, 'liability', true);
    expect(state.reputation).toBe(reputation);
    expect(state.reputationLog).toHaveLength(0);
    expect(coversHeld(state)).toBe(true);
    setInsurance(state, 'property', false);
    expect(coversHeld(state)).toBe(false);
  });
});

describe('the 1st', () => {
  it('charges a twelfth of each cover held, once, whatever the hooks ask', () => {
    const state = hall();
    setInsurance(state, 'property', true);
    setInsurance(state, 'liability', true);
    state.clock.day = 31;
    runInsuranceMonth(state);
    runInsuranceMonth(state);
    const first = linesOf(state, 'insurance').filter((entry) => entry.day === 31);
    expect(first.map((entry) => entry.label)).toEqual(['Property insurance', 'Public liability insurance']);
    expect(first[0]?.amount).toBe(-pence(propertyPremiumYearly(state) / 12));
    expect(first[1]?.amount).toBe(-pence(liabilityPremiumYearly(state) / 12));
    expect(monthlyPremiums(state)).toBe(pence(-(first[0]?.amount ?? 0) - (first[1]?.amount ?? 0)));
  });

  it('lands through the hooks of the day, and on a weekend 1st too', () => {
    let state = newGame();
    state = act(state, { type: 'SET_INSURANCE', cover: 'liability', on: true });
    expect(state.insurance.liability).toBe(true);
    const played = runToDay(state, 92).state;
    const premiums = linesOf(played, 'insurance').map((entry) => [entry.day, entry.amount]);
    // The first premium on day 1, then the 1st of each month: day 31, day 61 and day 91, which is
    // a Sunday (CLAUDE.md T13 3.15 with 3.14's "charged monthly").
    expect(premiums.map(([day]) => day)).toEqual([1, 31, 61, 91]);
    for (const [, amount] of premiums) expect(amount).toBe(-pence(LIABILITY_BASE_YEARLY / 12));
  });
});

describe('the accident', () => {
  it('books a claim in the band with no liability cover, and puts the event up', () => {
    const state = newGame();
    const before = state.cash;
    const claim = onAccident(state, 'Ben');
    expect(claim).toBeGreaterThanOrEqual(UNINSURED_CLAIM_MIN);
    expect(claim).toBeLessThanOrEqual(UNINSURED_CLAIM_MAX);
    expect(state.cash).toBe(before - claim);
    const lines = linesOf(state, 'claim');
    expect(lines).toHaveLength(1);
    expect(lines[0]?.amount).toBe(-claim);
    expect(lines[0]?.label).toBe('Injury claim: Ben');
    expect(state.eventQueue.some((event) => event.kind === 'insuranceClaim')).toBe(true);
  });

  it('books nothing with the cover held', () => {
    const state = newGame();
    setInsurance(state, 'liability', true);
    const before = state.cash;
    expect(onAccident(state, 'Ben')).toBe(0);
    expect(state.cash).toBe(before);
    expect(linesOf(state, 'claim')).toHaveLength(0);
    expect(state.eventQueue.some((event) => event.kind === 'insuranceClaim')).toBe(false);
  });
});

describe('the burglary payout', () => {
  it('is nothing without the cover, and nothing at security level 0 with it', () => {
    const state = newGame();
    expect(claimBurglary(state, 5000)).toBe(false);
    setInsurance(state, 'property', true);
    expect(state.security.level).toBe(0);
    expect(propertyCoverVoid(state)).toBe(true);
    expect(claimBurglary(state, 5000)).toBe(false);
    expect(state.insurance.payouts).toEqual([]);
  });

  it('is paid out over ten days at level 1, a slice a day through the day start', () => {
    const state = newGame();
    setInsurance(state, 'property', true);
    state.security.level = 1;
    expect(propertyCoverVoid(state)).toBe(false);
    expect(claimBurglary(state, 5000)).toBe(true);
    expect(state.insurance.payouts).toHaveLength(1);
    expect(state.insurance.payouts[0]?.perDay).toBe(500);
    expect(state.insurance.payouts[0]?.daysLeft).toBe(BURGLARY_PAYOUT_DAYS);
    const before = state.cash;
    for (let day = 0; day < BURGLARY_PAYOUT_DAYS; day += 1) runInsuranceDay(state);
    expect(state.cash).toBe(before + 5000);
    expect(state.insurance.payouts).toEqual([]);
    const slices = linesOf(state, 'claim');
    expect(slices).toHaveLength(BURGLARY_PAYOUT_DAYS);
    for (const slice of slices) expect(slice.amount).toBe(500);
    runInsuranceDay(state);
    expect(linesOf(state, 'claim')).toHaveLength(BURGLARY_PAYOUT_DAYS);
  });

  it('lands one slice a working day when the game runs', () => {
    const state = newGame();
    setInsurance(state, 'property', true);
    state.security.level = 1;
    claimBurglary(state, 3000);
    const played = runToDay(state, 5).state;
    const days = linesOf(played, 'claim').map((entry) => entry.day);
    expect(days.length).toBeGreaterThanOrEqual(3);
    expect(new Set(days).size).toBe(days.length);
    expect(played.insurance.payouts[0]?.daysLeft).toBe(BURGLARY_PAYOUT_DAYS - days.length);
  });
});
