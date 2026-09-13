// Game time. The clock covers the working day only: 08:00 until the 480 minutes of work are done,
// plus overtime up to 12 hours of work. The break is the one part of the day nobody works through,
// so the clock reads half an hour further on than the work done, and 16:00 became 16:30.
// Weekends are skipped by the day advance in game.ts, which still charges their calendar costs.

import {
  BREAK_MINUTES,
  BREAK_START_MINUTE,
  DAYS_PER_MONTH,
  DAYS_PER_WEEK,
  DAY_START_HOUR,
  MAX_CLOCK_MINUTES_PER_DAY,
  MAX_MINUTES_PER_DAY,
  MINUTES_PER_WORKING_DAY,
  MONTHS_PER_YEAR,
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
 *  day's work, the hour bands, the pool, the hard stop, counts in these and not in clock minutes,
 *  so the break costs the work nothing and only moves the end of the day later. */
export function workedMinutesOfDay(minute: number): number {
  return minute - breakMinutesBefore(minute);
}

/** Whole hours of work done so far. 0 for the first hour. */
export function hourIndex(minute: number): number {
  return Math.floor(workedMinutesOfDay(minute) / 60);
}

/** True once the owner has done his 8 hours of work. */
export function isOvertime(minute: number): boolean {
  return workedMinutesOfDay(minute) >= MINUTES_PER_WORKING_DAY;
}

/** True when the owner has to go home: 12 hours of work is the hard stop. */
export function isDayExhausted(minute: number): boolean {
  return workedMinutesOfDay(minute) >= MAX_MINUTES_PER_DAY;
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
