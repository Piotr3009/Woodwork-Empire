// Insurance (CLAUDE.md T13 3.15): the two covers, the premiums, the uninsured accident and the
// burglary payout. Property cover is written on every machine at what it cost and the stock at its
// value, recomputed on every purchase and every stock change, and charged a twelfth a month;
// public liability is a base plus so much a head, charged monthly. Going without is allowed, and
// an accident or a burglary then costs what it costs. Nothing here touches the reputation.

import {
  BURGLARY_PAYOUT_DAYS,
  DAYS_PER_MONTH,
  LIABILITY_BASE_YEARLY,
  LIABILITY_PER_EMPLOYEE_YEARLY,
  PROPERTY_INSURANCE_RATE_YEARLY,
  SHEET_VALUE,
  UNINSURED_CLAIM_MAX,
  UNINSURED_CLAIM_MIN,
} from './constants';
import { dayOfMonth } from './clock';
import { canAfford, charge, formatMoney } from './economy';
import { queueEvent } from './events';
import { int } from './rng';
import type { GameState } from './types';

export type InsuranceCover = 'property' | 'liability';

export interface InsuranceCheck {
  ok: boolean;
  reason: string;
}

const OK: InsuranceCheck = { ok: true, reason: '' };

function pence(value: number): number {
  return Math.round(value * 100) / 100;
}

export const COVER_LABELS: Record<InsuranceCover, string> = {
  property: 'Property insurance',
  liability: 'Public liability insurance',
};

/** The machines' share of the insured value: every machine in the hall at what it cost. */
export function insuredMachinesValue(state: GameState): number {
  let value = 0;
  for (const item of state.equipment) {
    if (item.soldOnDay !== null) continue;
    value += item.purchasePrice;
  }
  return Math.round(value);
}

/** The stock's share: the sheets on the rack at their value. */
export function insuredStockValue(state: GameState): number {
  return Math.round(state.stock.sheets * SHEET_VALUE);
}

/** What the property cover is written on: every machine in the hall at what it cost, and the
 *  stock at its value. Recomputed on every purchase and every stock change (CLAUDE.md T13 3.15). */
export function insuredValue(state: GameState): number {
  return insuredMachinesValue(state) + insuredStockValue(state);
}

export function propertyPremiumYearly(state: GameState): number {
  return pence(insuredValue(state) * PROPERTY_INSURANCE_RATE_YEARLY);
}

/** Hired people: everybody on the books. */
export function liabilityPremiumYearly(state: GameState): number {
  return LIABILITY_BASE_YEARLY + state.workers.length * LIABILITY_PER_EMPLOYEE_YEARLY;
}

export function premiumYearlyFor(state: GameState, cover: InsuranceCover): number {
  return cover === 'property' ? propertyPremiumYearly(state) : liabilityPremiumYearly(state);
}

/** A twelfth of the year: what the 1st takes for one cover. */
export function premiumMonthlyFor(state: GameState, cover: InsuranceCover): number {
  return pence(premiumYearlyFor(state, cover) / 12);
}

/** What the 1st takes for the covers held: a twelfth of each yearly premium. */
export function monthlyPremiums(state: GameState): number {
  let total = 0;
  if (state.insurance.property) total += premiumMonthlyFor(state, 'property');
  if (state.insurance.liability) total += premiumMonthlyFor(state, 'liability');
  return pence(total);
}

/** What taking a cover today costs: the rest of this month at the monthly rate, the whole month
 *  on the 1st. Cover is never free for a day, and the next twelfth goes out on the 1st. */
export function firstPremiumFor(state: GameState, cover: InsuranceCover): number {
  const daysLeft = DAYS_PER_MONTH - dayOfMonth(state.clock.day) + 1;
  return pence((premiumMonthlyFor(state, cover) * daysLeft) / DAYS_PER_MONTH);
}

/** Both covers held: the gate to commercial work (CLAUDE.md T13 3.15). */
export function coversHeld(state: GameState): boolean {
  return state.insurance.property && state.insurance.liability;
}

/** True while the property cover is held but the insurer would pay nothing: no alarm at all
 *  (security level 0), so a burglary is not covered whatever the premium (CLAUDE.md T13 3.15). */
export function propertyCoverVoid(state: GameState): boolean {
  return state.insurance.property && state.security.level < 1;
}

/** Why a cover cannot be switched the way asked, or that it can. */
export function insuranceCheck(state: GameState, cover: InsuranceCover, on: boolean): InsuranceCheck {
  if (state.insurance[cover] === on) {
    return { ok: false, reason: on ? 'Already held' : 'Not held' };
  }
  if (on && !canAfford(state, firstPremiumFor(state, cover))) {
    return { ok: false, reason: 'Not enough cash for the first premium' };
  }
  return OK;
}

/** Takes or drops a cover. Taking one pays the rest of the month's premium at once; dropping one
 *  refunds nothing. The insured value is written down with it, the way settle does after every
 *  purchase. Nothing here moves the reputation (CLAUDE.md T13 3.15). */
export function setInsurance(state: GameState, cover: InsuranceCover, on: boolean): InsuranceCheck {
  const check = insuranceCheck(state, cover, on);
  if (!check.ok) return check;
  if (on) {
    const first = firstPremiumFor(state, cover);
    if (first > 0) {
      charge(state, 'insurance', `${COVER_LABELS[cover]}, to the end of the month`, -first);
    }
  }
  state.insurance[cover] = on;
  state.insurance.insuredValue = insuredValue(state);
  return OK;
}

/** Keeps the insured value the tab shows in step with the hall. Called on every purchase and
 *  stock change by the one place those happen (settle). */
export function refreshInsuredValue(state: GameState): void {
  state.insurance.insuredValue = insuredValue(state);
}

/** True once a premium has gone out today: the month's premium is charged once however many
 *  times the day's hooks ask for it. */
function premiumChargedToday(state: GameState): boolean {
  for (let index = state.ledger.length - 1; index >= 0; index -= 1) {
    const entry = state.ledger[index];
    if (!entry || entry.day !== state.clock.day) return false;
    if (entry.category === 'insurance' && entry.amount < 0) return true;
  }
  return false;
}

/** The 1st: a twelfth of each yearly premium (CLAUDE.md T13 3.15). Runs with the monthly items
 *  in economy.ts, so a 1st on a weekend is charged too. */
export function runInsuranceMonth(state: GameState): void {
  if (premiumChargedToday(state)) return;
  for (const cover of ['property', 'liability'] as const) {
    if (!state.insurance[cover]) continue;
    charge(state, 'insurance', COVER_LABELS[cover], -premiumMonthlyFor(state, cover), {
      unavoidable: true,
    });
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

/** The accident event fired with no liability cover: a claim, drawn once in the band, that the
 *  company cannot refuse (CLAUDE.md T13 3.15). Zero with the cover held. */
export function onAccident(state: GameState, workerName: string): number {
  if (state.insurance.liability) return 0;
  const claim = int(state, UNINSURED_CLAIM_MIN, UNINSURED_CLAIM_MAX);
  charge(state, 'claim', `Injury claim: ${workerName}`, -claim, { unavoidable: true });
  queueEvent(state, {
    kind: 'insuranceClaim',
    title: 'Injury claim',
    body:
      `${workerName} has a solicitor. With no public liability cover the claim is the ` +
      `company's: ${formatMoney(claim)} out.`,
    data: { claim },
  });
  return claim;
}

/** A burglary with property cover and at least an alarm is paid out over ten days; with no alarm
 *  the cover pays nothing (CLAUDE.md T13 3.15, 3.17). True when a payout was booked. */
export function claimBurglary(state: GameState, lostValue: number): boolean {
  if (!state.insurance.property || propertyCoverVoid(state) || lostValue <= 0) return false;
  state.insurance.payouts.push({
    label: `Insurance payout: burglary, ${formatMoney(lostValue)} over ${BURGLARY_PAYOUT_DAYS} days`,
    perDay: pence(lostValue / BURGLARY_PAYOUT_DAYS),
    daysLeft: BURGLARY_PAYOUT_DAYS,
  });
  return true;
}
