// Game time. The clock covers the working day only: 08:00 to 17:00, which is the 480 minutes of
// work with the hour of dinner between them, and then overtime to 19:00 at the latest. The break
// is the one part of the day nobody works through, unless the owner says he will, and then the
// hour is his and nobody else's.
// Weekends are skipped by the day advance in game.ts, which still charges their calendar costs.

import {
  BREAK_MINUTES,
  BREAK_START_MINUTE,
  DAYS_PER_MONTH,
  DAYS_PER_WEEK,
  DAY_END_MINUTE,
  DAY_START_HOUR,
  MAX_CLOCK_MINUTES_PER_DAY,
  MINUTES_PER_WORKING_DAY,
  MONTHS_PER_YEAR,
  OVERTIME_END_MINUTE,
  REAL_SECONDS_PER_DAY_AT_1X,
  WEEKDAY_NAMES,
  WORKING_DAYS_PER_WEEK,
} from './constants';
import type { Clock, Speed } from './types';

/** 0 is Monday. Day 1 is a Monday (CLAUDE.md 6.1). */
export function weekday(day: number): number {
  return (day - 1) % DAYS_PER_WEEK;
}

export function weekdayName(day: number): string {
  return WEEKDAY_NAMES[weekday(day)] ?? 'Mon';
}

export function isWorkingDay(day: number): boolean {
  return weekday(day) < WORKING_DAYS_PER_WEEK;
}

export function isFriday(day: number): boolean {
  return weekday(day) === WORKING_DAYS_PER_WEEK - 1;
}

/** Monday morning, when the week starts clean (PIOTR: the overtime debt resets at the weekend). */
export function isMonday(day: number): boolean {
  return weekday(day) === 0;
}

/** 1-based week of the game calendar. Day 1 to day 7 is week 1. */
export function weekOfDay(day: number): number {
  return Math.floor((day - 1) / DAYS_PER_WEEK) + 1;
}

/** 1-based month of the game calendar. */
export function monthOfDay(day: number): number {
  return Math.floor((day - 1) / DAYS_PER_MONTH) + 1;
}

/** 1-based day inside the month. */
export function dayOfMonth(day: number): number {
  return ((day - 1) % DAYS_PER_MONTH) + 1;
}

export function isFirstOfMonth(day: number): boolean {
  return dayOfMonth(day) === 1;
}

/** The last day of the month the workshop is open, which is where a monthly summary lands
 *  (CLAUDE.md T4 3.6). */
export function isLastWorkingDayOfMonth(day: number): boolean {
  if (!isWorkingDay(day)) return false;
  const month = monthOfDay(day);
  for (let next = day + 1; monthOfDay(next) === month; next += 1) {
    if (isWorkingDay(next)) return false;
  }
  return true;
}

/** 1-based year of the game calendar. */
export function yearOfDay(day: number): number {
  return Math.floor((day - 1) / (DAYS_PER_MONTH * MONTHS_PER_YEAR)) + 1;
}

/** The minute of the game so far, for putting in order two things that happened on different
 *  days. Not a clock reading the player ever sees. */
export function minuteStamp(clock: Clock): number {
  return clock.day * MAX_CLOCK_MINUTES_PER_DAY + clock.minute;
}

/** True while the workshop is at dinner. Nothing is worked on, nothing is produced, and nobody's
 *  day is spent. */
export function isBreak(minute: number): boolean {
  return minute >= BREAK_START_MINUTE && minute < BREAK_START_MINUTE + BREAK_MINUTES;
}

/** How much of the break this point of the clock is past. */
export function breakMinutesBefore(minute: number): number {
  if (minute <= BREAK_START_MINUTE) return 0;
  return Math.min(BREAK_MINUTES, minute - BREAK_START_MINUTE);
}

/** The minutes of work the day has had by this point of the clock. Everything that measures a
 *  day's work counts in these and not in clock minutes, so a break that is taken costs the work
 *  nothing and only moves the end of the day later. A break that is skipped is worked, which is
 *  the 60 minutes the owner buys himself (CLAUDE.md T6 3.4). */
export function workedMinutesOfDay(minute: number, breakSkipped = false): number {
  return breakSkipped ? minute : minute - breakMinutesBefore(minute);
}

/** True from 17:00 on: the working day is behind everybody, break or no break. */
export function isOvertime(minute: number): boolean {
  return minute >= DAY_END_MINUTE;
}

/** True at 19:00: the tools go down whoever wants what. */
export function isDayExhausted(minute: number): boolean {
  return minute >= OVERTIME_END_MINUTE;
}

export function formatTime(minute: number): string {
  const total = DAY_START_HOUR * 60 + minute;
  const hours = Math.floor(total / 60) % 24;
  const minutes = total % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function formatDate(clock: Clock): string {
  return `${weekdayName(clock.day)}, day ${clock.day} · ${formatTime(clock.minute)}`;
}

/** The next day the workshop is open. */
export function nextWorkingDay(day: number): number {
  let next = day + 1;
  while (!isWorkingDay(next)) next += 1;
  return next;
}

/** The last day the workshop was open before this one. 0 when there is none. */
export function previousWorkingDay(day: number): number {
  let previous = day - 1;
  while (previous > 0 && !isWorkingDay(previous)) previous -= 1;
  return previous;
}

/** The day `count` working days after `day`. */
export function addWorkingDays(day: number, count: number): number {
  let result = day;
  for (let i = 0; i < count; i += 1) {
    result = nextWorkingDay(result);
  }
  return result;
}

/** Every calendar day strictly between `from` and `to`. */
export function daysBetween(from: number, to: number): number[] {
  const days: number[] = [];
  for (let day = from + 1; day < to; day += 1) days.push(day);
  return days;
}

/** Game minutes that pass in a real second at the given speed. */
export function gameMinutesPerRealSecond(speed: Speed): number {
  if (speed === 0) return 0;
  return (MINUTES_PER_WORKING_DAY / REAL_SECONDS_PER_DAY_AT_1X) * speed;
}
