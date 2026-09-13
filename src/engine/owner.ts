// The owner: his minute pool, what a day of overtime costs him tomorrow, absence and sick leave.
// His 480 minutes a day are the core resource of the game (CLAUDE.md 1.3).

import {
  ABSENCE_OUTPUT_FACTOR,
  ABSENCE_OUTPUT_FACTOR_EXCEPTIONAL_CEO,
  ABSENCE_OUTPUT_FACTOR_WITH_CEO,
  BREAK_MINUTES,
  BREAK_SKIP_FACTOR,
  DAYS_PER_YEAR,
  LABOUR_FACTOR_FLOOR,
  MINUTES_PER_WORKING_DAY,
  OVERTIME_DEBT_PER_DAY,
  SICK_DAYS_MAX,
  SICK_DAYS_MIN,
} from './constants';
import { isMonday, isOvertime, isWorkingDay, workedMinutesOfDay, yearOfDay } from './clock';
import { queueEvent } from './events';
import { int } from './rng';
import type { GameState } from './types';

/** Round to four places, which is where every factor in the engine stops. */
function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

/** What a morning's output is worth after last week's overtime and last night's dinner. An hour
 *  worked through costs 3% and a day with any overtime in it costs 10%, cumulative, floored
 *  (CLAUDE.md T6 3.4). */
export function labourFactorFor(overtimeDebt: number, breakSkipped: boolean): number {
  const factor = (1 - overtimeDebt) * (breakSkipped ? BREAK_SKIP_FACTOR : 1);
  return Math.max(LABOUR_FACTOR_FLOOR, round4(factor));
}

/** Work done per clock minute the owner spends. An overtime minute is worth as much as any other:
 *  what overtime costs is tomorrow, not tonight. */
export function ownerEfficiency(state: GameState): number {
  return state.owner.labourFactor;
}

/** The minutes of work the day holds for him: his 480, and the hour of dinner as well when he has
 *  decided to work through it. */
export function ownerMinutesToday(state: GameState): number {
  return MINUTES_PER_WORKING_DAY + (state.owner.breakSkipped ? BREAK_MINUTES : 0);
}

/** Minutes of the normal working day still ahead. Overtime is not in the pool. */
export function ownerMinutesLeft(state: GameState): number {
  const worked = workedMinutesOfDay(state.clock.minute, state.owner.breakSkipped);
  return Math.max(0, ownerMinutesToday(state) - worked);
}

/** True while the owner can pick up work. */
export function ownerIsAvailable(state: GameState): boolean {
  return state.owner.present && !state.owner.wentHome;
}

/** What an absent owner costs the company. CEO hiring is parked (CLAUDE.md 14.2), so Turn 1 always
 *  asks for the no CEO case, but the modelled numbers are here for the later turn. */
export function absenceFactor(hasCeo: boolean, exceptionalCeo: boolean): number {
  if (exceptionalCeo) return ABSENCE_OUTPUT_FACTOR_EXCEPTIONAL_CEO;
  if (hasCeo) return ABSENCE_OUTPUT_FACTOR_WITH_CEO;
  return ABSENCE_OUTPUT_FACTOR;
}

/** Staff output when the owner is not in the workshop (CLAUDE.md 7.3). */
export function staffOutputFactor(state: GameState): number {
  if (ownerIsAvailable(state)) return 1;
  return absenceFactor(false, false);
}

/** Books one worked clock minute against the pool. */
export function spendOwnerMinute(state: GameState, category: 'admin' | 'design' | 'workshop'): void {
  const owner = state.owner;
  owner.minutesWorked += 1;
  owner.minutesByCategory[category] += 1;
}

/** Books one minute of standing in the workshop past 17:00. Staying is the overtime, not what he
 *  fills it with: a day with any of it costs him tomorrow (CLAUDE.md T6 3.4). */
export function countOvertimeMinute(state: GameState): void {
  if (!isOvertime(state.clock.minute) || !ownerIsAvailable(state)) return;
  state.owner.overtimeMinutes += 1;
}

/** Called when the day closes: a day with any overtime in it, one minute or two hours, adds its
 *  0.10 to the debt (CLAUDE.md T6 3.4). */
export function chargeOvertimeDebt(state: GameState): void {
  if (state.owner.overtimeMinutes <= 0) return;
  state.owner.overtimeDebt = round4(state.owner.overtimeDebt + OVERTIME_DEBT_PER_DAY);
}

/** Sick leave lands once per game year, on a random working day (CLAUDE.md 7.3). */
export function scheduleSickLeave(state: GameState): void {
  const owner = state.owner;
  const year = yearOfDay(state.clock.day);
  if (owner.sickStartDay !== null) {
    if (owner.sickStartDay >= state.clock.day) return;
    if (yearOfDay(owner.sickStartDay) === year) return;
  }
  const firstDay = Math.max((year - 1) * DAYS_PER_YEAR + 1, state.clock.day + 1);
  const lastDay = year * DAYS_PER_YEAR;
  if (firstDay > lastDay) return;
  let day = int(state, firstDay, lastDay);
  while (!isWorkingDay(day) && day < lastDay) day += 1;
  owner.sickStartDay = day;
}

/** Runs at the start of every working day, before the player does anything. */
export function runOwnerDayStart(state: GameState): void {
  const owner = state.owner;
  owner.overtimeMinutes = 0;
  // The week starts clean, whatever last week cost him (PIOTR: reset at the weekend).
  if (isMonday(state.clock.day)) owner.overtimeDebt = 0;
  owner.labourFactor = labourFactorFor(owner.overtimeDebt, owner.breakSkipped);
  owner.breakSkipped = false;
  owner.breakAsked = false;
  owner.homeAsked = false;
  if (owner.sickDaysRemaining > 0) {
    owner.sickDaysRemaining -= 1;
    owner.present = false;
    return;
  }
  if (owner.sickStartDay === state.clock.day) {
    owner.sickDaysRemaining = int(state, SICK_DAYS_MIN, SICK_DAYS_MAX) - 1;
    owner.present = false;
    queueEvent(state, {
      kind: 'ownerSick',
      title: 'You are sick',
      body:
        'Flat on your back. The workshop runs without you for a few days and it shows in the ' +
        'output.',
      data: { days: owner.sickDaysRemaining + 1 },
    });
    return;
  }
  scheduleSickLeave(state);
}
