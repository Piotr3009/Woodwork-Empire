// Game time. The clock covers the working day only, 08:00 to 16:00, plus overtime up to 12 hours.
// Weekends are skipped by the day advance in game.ts, which still charges their calendar costs.

import {
  DAYS_PER_MONTH,
  DAYS_PER_WEEK,
  DAY_START_HOUR,
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

/** 1-based year of the game calendar. */
export function yearOfDay(day: number): number {
  return Math.floor((day - 1) / (DAYS_PER_MONTH * MONTHS_PER_YEAR)) + 1;
}

/** Whole hours of the day worked so far. 0 for the first hour. */
export function hourIndex(minute: number): number {
  return Math.floor(minute / 60);
}

/** True once the owner has done his 8 hours. */
export function isOvertime(minute: number): boolean {
  return minute >= MINUTES_PER_WORKING_DAY;
}

/** True when the owner has to go home: 12 hours is the hard stop. */
export function isDayExhausted(minute: number): boolean {
  return minute >= MAX_MINUTES_PER_DAY;
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
