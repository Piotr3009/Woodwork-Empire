// Insurance (CLAUDE.md T13 3.15): the two covers, the premiums, the uninsured accident and the
// burglary payout. Phase A: the shape and the entry points; phase B1 fills them.

import {
  BURGLARY_PAYOUT_DAYS,
  LIABILITY_BASE_YEARLY,
  LIABILITY_PER_EMPLOYEE_YEARLY,
  PROPERTY_INSURANCE_RATE_YEARLY,
  SHEET_VALUE,
  UNINSURED_CLAIM_MAX,
  UNINSURED_CLAIM_MIN,
} from './constants';
import { charge } from './economy';
import { queueEvent } from './events';
import { int } from './rng';
import type { GameState } from './types';

/** What the property cover is written on: every machine in the hall at what it cost, and the
 *  stock at its value. Recomputed on every purchase and every stock change (CLAUDE.md T13 3.15). */
export function insuredValue(state: GameState): number {
  let value = 0;
  for (const item of state.equipment) {
    if (item.soldOnDay !== null) continue;
    value += item.purchasePrice;
  }
  value += state.stock.sheets * SHEET_VALUE;
  return Math.round(value);
}

export function propertyPremiumYearly(state: GameState): number {
  return Math.round(insuredValue(state) * PROPERTY_INSURANCE_RATE_YEARLY * 100) / 100;
}

/** Hired people: everybody on the books. */
export function liabilityPremiumYearly(state: GameState): number {
  return LIABILITY_BASE_YEARLY + state.workers.length * LIABILITY_PER_EMPLOYEE_YEARLY;
}

/** Both covers held: the gate to commercial work (CLAUDE.md T13 3.15). */
export function coversHeld(state: GameState): boolean {
  return state.insurance.property && state.insurance.liability;
}

export function setInsurance(state: GameState, cover: 'property' | 'liability', on: boolean): void {
  state.insurance[cover] = on;
  state.insurance.insuredValue = insuredValue(state);
}

/** Keeps the insured value the tab shows in step with the hall. Called on every purchase and
 *  stock change by the one place those happen (settle). */
export function refreshInsuredValue(state: GameState): void {
  state.insurance.insuredValue = insuredValue(state);
}

/** The 1st: a twelfth of each yearly premium (CLAUDE.md T13 3.15). */
export function runInsuranceMonth(state: GameState): void {
  if (state.insurance.property) {
    const premium = Math.round((propertyPremiumYearly(state) / 12) * 100) / 100;
    charge(state, 'insurance', 'Property insurance', -premium, { unavoidable: true });
  }
  if (state.insurance.liability) {
    const premium = Math.round((liabilityPremiumYearly(state) / 12) * 100) / 100;
    charge(state, 'insurance', 'Public liability insurance', -premium, { unavoidable: true });
  }
}

/** Every day: the payouts still coming in land a slice at a time (CLAUDE.md T13 3.17). */
export function runInsuranceDay(state: GameState): void {
  for (const payout of state.insurance.payouts) {
    if (payout.daysLeft <= 0) continue;
    charge(state, 'claim', payout.label, payout.perDay);
    payout.daysLeft -= 1;
  }
  state.insurance.payouts = state.insurance.payouts.filter((payout) => payout.daysLeft > 0);
}

/** The accident event fired with no liability cover: a claim, drawn once (CLAUDE.md T13 3.15). */
export function onAccident(state: GameState, workerName: string): void {
  if (state.insurance.liability) return;
  const claim = int(state, UNINSURED_CLAIM_MIN, UNINSURED_CLAIM_MAX);
  charge(state, 'claim', `Injury claim: ${workerName}`, -claim, { unavoidable: true });
  queueEvent(state, {
    kind: 'insuranceClaim',
    title: 'Injury claim',
    body:
      `${workerName} has a solicitor. With no liability cover the claim is the company's: ` +
      `${claim.toLocaleString('en-GB')} out.`,
    data: { claim },
  });
}

/** A burglary with property cover and at least an alarm is paid out over ten days; with no alarm
 *  the cover pays nothing (CLAUDE.md T13 3.15, 3.17). True when a payout was booked. */
export function claimBurglary(state: GameState, lostValue: number): boolean {
  if (!state.insurance.property || state.security.level < 1 || lostValue <= 0) return false;
  state.insurance.payouts.push({
    label: 'Insurance payout: burglary',
    perDay: Math.round((lostValue / BURGLARY_PAYOUT_DAYS) * 100) / 100,
    daysLeft: BURGLARY_PAYOUT_DAYS,
  });
  return true;
}
