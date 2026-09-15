// Security in five levels, and the burglary (CLAUDE.md T13 3.17). Piotr's point: this is not a
// gamble on a burglary, it is to make fixed costs felt. Levels 1 to 3 are bought once, levels 4
// and 5 are a firm on a monthly subscription that scales with the hall and what is in it, and
// level 5 takes the risk to zero, and zero means zero.

import {
  BURGLARY_MACHINES_MAX,
  BURGLARY_MACHINES_MIN,
  DAYS_PER_MONTH,
  SECURITY_LEVELS,
  SECURITY_SCALE_AREA_M2,
  SECURITY_SCALE_VALUE,
  SHEET_VALUE,
} from './constants';
import type { SecurityLevelSpec } from './constants';
import { canAfford, charge, formatMoney, noteLoss } from './economy';
import { queueEvent } from './events';
import { insuredValue } from './insurance';
import { findSpec, isSold, itemStandsInTheHall, variantFor } from './machines';
import { freeSheets } from './materials';
import { disconnectExtraction } from './pipes';
import { chance, int } from './rng';
import { plural } from './text';
import type { Equipment, GameState } from './types';

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

/** The pieces of a scaled subscription, so the tab can print the formula in words with this
 *  hall's own figures in it: the base a month, the hall's area over the reference area, one plus
 *  the insured value over the reference value, and what they come to (CLAUDE.md T13 3.17). */
export interface SubscriptionParts {
  base: number;
  areaM2: number;
  areaFactor: number;
  insured: number;
  valueFactor: number;
  monthly: number;
}

export function securitySubscriptionParts(
  state: GameState,
  level = state.security.level,
): SubscriptionParts {
  const spec = securitySpec(level);
  const areaM2 = state.unit.areaM2;
  const insured = insuredValue(state);
  const areaFactor = spec.scaled ? areaM2 / SECURITY_SCALE_AREA_M2 : 1;
  const valueFactor = spec.scaled ? 1 + insured / SECURITY_SCALE_VALUE : 1;
  return {
    base: spec.monthly,
    areaM2,
    areaFactor: Math.round(areaFactor * 10000) / 10000,
    insured,
    valueFactor: Math.round(valueFactor * 10000) / 10000,
    monthly: Math.round(spec.monthly * areaFactor * valueFactor * 100) / 100,
  };
}

/** What a level costs a month: the flat figure, or for the two firms the base scaled by the
 *  hall's area and the insured equipment value (CLAUDE.md T13 3.17). */
export function securitySubscriptionMonthly(state: GameState, level = state.security.level): number {
  return securitySubscriptionParts(state, level).monthly;
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
 *  burglary overnight (CLAUDE.md T13 3.17). True on a hit. At level 5 there is no roll at all:
 *  zero means zero (PIOTR). */
export function rollBurglary(state: GameState): boolean {
  const risk = burglaryRiskMonthly(state);
  if (risk <= 0) return false;
  return chance(state, risk / DAYS_PER_MONTH);
}

// ---------------------------------------------------------------------------
// The burglary itself (CLAUDE.md T13 3.17, 3.15): one or two machines, the dearest first, and
// the free stock. Paid out by the property cover over ten days with an alarm or better; with no
// alarm the cover pays nothing, and with no cover nothing comes back at all.
// ---------------------------------------------------------------------------

/** True when a burglary tonight would be paid out: property cover held and at least an alarm
 *  (CLAUDE.md T13 3.15, 3.17). The same two conditions `claimBurglary` in insurance.ts books
 *  the payout on; this is the question the event and the tab ask before anything is taken. */
export function burglaryPaidOut(state: GameState): boolean {
  return state.insurance.property && state.security.level >= 1;
}

/** The machines a burglar goes for: what stands in the hall and is the company's, dearest first
 *  (CLAUDE.md T13 3.17). The extraction, the compressor and the fittings stay: a fan bolted to
 *  the wall is not what a van is backed up to the shutter for. */
export function burglaryTargets(state: GameState, count: number): Equipment[] {
  return state.equipment
    .filter(
      (item) =>
        !isSold(item) && itemStandsInTheHall(item) && findSpec(item.specId)?.category === 'machine',
    )
    .slice()
    .sort((left, right) => right.purchasePrice - left.purchasePrice)
    .slice(0, Math.max(0, count));
}

/** Takes a machine out of the hall for good: its pipe, its gate and every open job of work on it
 *  go with it. The one removal a burglary makes. */
function takeMachine(state: GameState, item: Equipment): void {
  disconnectExtraction(state, item.id);
  state.gates = state.gates.filter((id) => id !== item.id);
  state.equipment = state.equipment.filter((entry) => entry.id !== item.id);
  const orphaned = new Set(
    state.tasks
      .filter((task) => task.equipmentId === item.id && !task.done)
      .map((task) => task.id),
  );
  state.tasks = state.tasks.filter((task) => !orphaned.has(task.id));
  if (state.owner.currentTaskId !== null && orphaned.has(state.owner.currentTaskId)) {
    state.owner.currentTaskId = null;
  }
  for (const worker of state.workers) {
    if (worker.taskId !== null && orphaned.has(worker.taskId)) worker.taskId = null;
  }
}

/** What a burglary takes, the night the roll lands (CLAUDE.md T13 3.17): one or two machines at
 *  random by count, the dearest first, and the free stock, the reserved sheets being what is
 *  left. Returns the value lost, at what the machines cost and the stock is worth, for the
 *  property cover to pay out on or not; the loss is a line of the ledger that moved no cash.
 *  The event says what went and whether the insurer pays (CLAUDE.md T13 3.15). */
export function burgle(state: GameState): number {
  const count = int(state, BURGLARY_MACHINES_MIN, BURGLARY_MACHINES_MAX);
  const taken = burglaryTargets(state, count);
  for (const item of taken) takeMachine(state, item);
  const sheets = freeSheets(state);
  state.stock.sheets = Math.max(0, state.stock.sheets - sheets);
  const lost = taken.reduce((total, item) => total + item.purchasePrice, 0) + sheets * SHEET_VALUE;
  state.security.lastBurglaryDay = state.clock.day;
  const names = taken.map((item) =>
    (variantFor(item)?.name ?? findSpec(item.specId)?.name ?? item.specId).toLowerCase(),
  );
  const went = [...names, ...(sheets > 0 ? [`${plural(sheets, 'sheet', 'sheets')} of stock`] : [])];
  if (lost > 0) noteLoss(state, 'burglary', `Burglary: ${went.join(', ')}`, lost);
  const paid = burglaryPaidOut(state) && lost > 0;
  const insurer = paid
    ? 'The property cover pays it out over the next days.'
    : state.insurance.property
      ? 'Property cover, but no alarm: the insurer pays nothing.'
      : 'No property cover, so nothing comes back.';
  queueEvent(state, {
    kind: 'burglary',
    title: 'Broken into overnight',
    body:
      (went.length === 0
        ? 'The workshop was broken into overnight. They found nothing worth taking.'
        : `The workshop was broken into overnight. Gone: ${went.join(', ')}, ` +
          `${formatMoney(lost)} in all.`) +
      ` ${insurer}`,
    choices: [{ id: 'ok', label: 'Right' }],
    data: { lost, machines: taken.map((item) => item.specId).join(','), sheets, paid },
  });
  return lost;
}
