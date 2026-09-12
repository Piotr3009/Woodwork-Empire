// The owner: his minute pool, the efficiency of an overtime hour, fatigue, absence and sick leave.
// His 480 minutes a day are the core resource of the game (CLAUDE.md 1.3).

import {
  ABSENCE_OUTPUT_FACTOR,
  ABSENCE_OUTPUT_FACTOR_EXCEPTIONAL_CEO,
  ABSENCE_OUTPUT_FACTOR_WITH_CEO,
  DAYS_PER_YEAR,
  FATIGUE_PER_OVERTIME_HOUR,
  MINUTES_PER_WORKING_DAY,
  MIN_OWNER_EFFICIENCY,
  OVERTIME_EFFICIENCY,
  OWNER_NORMAL_HOURS,
  SICK_DAYS_MAX,
  SICK_DAYS_MIN,
} from './constants';
import { hourIndex, isWorkingDay, yearOfDay } from './clock';
import { queueEvent } from './events';
import { int } from './rng';
import type { GameState } from './types';

/** Hours 1 to 8 are full, then 0.8, 0.6, 0.4, 0.4 (CLAUDE.md 7.2). */
export function hourEfficiency(minute: number): number {
  const hour = hourIndex(minute);
  if (minute < MINUTES_PER_WORKING_DAY) return 1;
  return OVERTIME_EFFICIENCY[hour - OWNER_NORMAL_HOURS] ?? 0.4;
}

/** Work done per clock minute the owner spends. Yesterday's overtime is subtracted. */
export function ownerEfficiency(state: GameState): number {
  return Math.max(MIN_OWNER_EFFICIENCY, hourEfficiency(state.clock.minute) - state.owner.fatigue);
}

/** Minutes of the normal working day still ahead. Overtime is not in the pool. */
export function ownerMinutesLeft(state: GameState): number {
  return Math.max(0, MINUTES_PER_WORKING_DAY - state.clock.minute);
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
  if (state.clock.minute >= MINUTES_PER_WORKING_DAY) owner.overtimeMinutes += 1;
}

/** Called when the day closes: each whole overtime hour worked today costs efficiency tomorrow
 *  (CLAUDE.md 7.2). A part hour is not charged. */
export function setTomorrowFatigue(state: GameState): void {
  const hours = Math.floor(state.owner.overtimeMinutes / 60);
  state.owner.fatigue = hours * FATIGUE_PER_OVERTIME_HOUR;
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
