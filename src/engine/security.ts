// Security in five levels, and the burglary (CLAUDE.md T13 3.17). Phase A: the table, the level
// purchase and the monthly roll; phase B4 fills in the burglary itself and the tab.

import {
  DAYS_PER_MONTH,
  SECURITY_LEVELS,
  SECURITY_SCALE_AREA_M2,
  SECURITY_SCALE_VALUE,
} from './constants';
import type { SecurityLevelSpec } from './constants';
import { canAfford, charge } from './economy';
import { insuredValue } from './insurance';
import { chance } from './rng';
import type { GameState } from './types';

export function securitySpec(level: number): SecurityLevelSpec {
  return SECURITY_LEVELS.find((entry) => entry.level === level) ?? SECURITY_LEVELS[0] ?? {
    level: 0,
    name: 'Nothing',
    price: 0,
    monthly: 0,
    scaled: false,
    risk: 0,
  };
}

export function securityLevel(state: GameState): SecurityLevelSpec {
  return securitySpec(state.security.level);
}

/** What a level costs a month: the flat figure, or for the two firms the base scaled by the
 *  hall's area and the insured equipment value (CLAUDE.md T13 3.17). */
export function securitySubscriptionMonthly(state: GameState, level = state.security.level): number {
  const spec = securitySpec(level);
  if (!spec.scaled) return spec.monthly;
  const area = state.unit.areaM2 / SECURITY_SCALE_AREA_M2;
  const value = 1 + insuredValue(state) / SECURITY_SCALE_VALUE;
  return Math.round(spec.monthly * area * value * 100) / 100;
}

/** Risk of a burglary a month at the level held. Level 5 is zero, and zero means zero (PIOTR). */
export function burglaryRiskMonthly(state: GameState): number {
  return securityLevel(state).risk;
}

export interface SecurityCheck {
  ok: boolean;
  reason: string;
}

export function securityCheck(state: GameState, level: number): SecurityCheck {
  const spec = SECURITY_LEVELS.find((entry) => entry.level === level);
  if (!spec) return { ok: false, reason: 'No such level' };
  if (level === state.security.level) return { ok: false, reason: 'Already at this level' };
  if (!canAfford(state, spec.price)) return { ok: false, reason: 'Not enough cash' };
  return { ok: true, reason: '' };
}

/** Buys the level: the one off price at the click; the subscriptions run on the 1st. */
export function setSecurityLevel(state: GameState, level: number): SecurityCheck {
  const check = securityCheck(state, level);
  if (!check.ok) return check;
  const spec = securitySpec(level);
  if (spec.price > 0 && level > state.security.level) {
    charge(state, 'security', `Security: ${spec.name}`, -spec.price);
  }
  state.security.level = level;
  return check;
}

/** The 1st: the subscription of the level held (CLAUDE.md T13 3.17). */
export function runSecurityMonth(state: GameState): void {
  const monthly = securitySubscriptionMonthly(state);
  if (monthly <= 0) return;
  charge(state, 'security', `Security: ${securityLevel(state).name}`, -monthly, {
    unavoidable: true,
  });
}

/** Every working day the monthly risk is spread over the month's days and rolled; a hit is a
 *  burglary overnight (CLAUDE.md T13 3.17). Phase B4 writes what a burglary takes; phase A only
 *  rolls, so the seeded stream is the same shape from tonight on. True on a hit. */
export function rollBurglary(state: GameState): boolean {
  const risk = burglaryRiskMonthly(state);
  if (risk <= 0) return false;
  return chance(state, risk / DAYS_PER_MONTH);
}
