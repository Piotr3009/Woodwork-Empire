import { describe, expect, it } from 'vitest';
import {
  addWorkingDays,
  dayOfMonth,
  daysBetween,
  formatDate,
  formatTime,
  gameMinutesPerRealSecond,
  hourIndex,
  isDayExhausted,
  isFirstOfMonth,
  isFriday,
  isOvertime,
  isWorkingDay,
  monthOfDay,
  nextWorkingDay,
  weekday,
  weekdayName,
  yearOfDay,
} from '../../src/engine/clock';
import { MINUTES_PER_WORKING_DAY, REAL_SECONDS_PER_DAY_AT_1X } from '../../src/engine/constants';

describe('the real time the clock runs at', () => {
  it('takes 480 real seconds for one game day at 1x', () => {
    expect(REAL_SECONDS_PER_DAY_AT_1X).toBe(480);
  });
});

describe('clock calendar', () => {
  it('starts on a Monday', () => {
    expect(weekday(1)).toBe(0);
    expect(weekdayName(1)).toBe('Mon');
    expect(isWorkingDay(1)).toBe(true);
  });

  it('knows the weekend', () => {
    expect(weekdayName(5)).toBe('Fri');
    expect(isFriday(5)).toBe(true);
    expect(isWorkingDay(6)).toBe(false);
    expect(isWorkingDay(7)).toBe(false);
    expect(isWorkingDay(8)).toBe(true);
    expect(weekdayName(8)).toBe('Mon');
  });

  it('rolls the month every 30 days', () => {
    expect(monthOfDay(1)).toBe(1);
    expect(dayOfMonth(30)).toBe(30);
    expect(monthOfDay(30)).toBe(1);
    expect(monthOfDay(31)).toBe(2);
    expect(dayOfMonth(31)).toBe(1);
    expect(isFirstOfMonth(31)).toBe(true);
    expect(isFirstOfMonth(32)).toBe(false);
  });

  it('rolls the year every 360 days', () => {
    expect(yearOfDay(360)).toBe(1);
    expect(yearOfDay(361)).toBe(2);
    expect(monthOfDay(361)).toBe(13);
  });

  it('walks over weekends when adding working days', () => {
    expect(nextWorkingDay(5)).toBe(8);
    expect(nextWorkingDay(1)).toBe(2);
    expect(addWorkingDays(4, 1)).toBe(5);
    expect(addWorkingDays(4, 2)).toBe(8);
    expect(addWorkingDays(4, 3)).toBe(9);
  });

  it('lists the days walked over', () => {
    expect(daysBetween(5, 8)).toEqual([6, 7]);
    expect(daysBetween(1, 2)).toEqual([]);
  });
});

describe('clock time of day', () => {
  it('shows 08:00 at minute 0 and 16:00 at minute 480', () => {
    expect(formatTime(0)).toBe('08:00');
    expect(formatTime(162)).toBe('10:42');
    expect(formatTime(480)).toBe('16:00');
    expect(formatTime(720)).toBe('20:00');
  });

  it('formats the date line', () => {
    expect(formatDate({ day: 6, minute: 162 })).toBe('Sat, day 6 · 10:42');
  });

  it('counts hours of the day', () => {
    expect(hourIndex(0)).toBe(0);
    expect(hourIndex(59)).toBe(0);
    expect(hourIndex(60)).toBe(1);
    expect(hourIndex(479)).toBe(7);
    expect(hourIndex(480)).toBe(8);
  });

  it('marks overtime and the hard stop', () => {
    expect(isOvertime(479)).toBe(false);
    expect(isOvertime(480)).toBe(true);
    expect(isDayExhausted(719)).toBe(false);
    expect(isDayExhausted(720)).toBe(true);
  });

  it('runs one game minute per real second at 1x, so a day is 8 real minutes', () => {
    expect(gameMinutesPerRealSecond(0)).toBe(0);
    expect(gameMinutesPerRealSecond(1)).toBe(1);
    expect(gameMinutesPerRealSecond(2)).toBe(2);
    expect(gameMinutesPerRealSecond(4)).toBe(4);
    expect(MINUTES_PER_WORKING_DAY / gameMinutesPerRealSecond(1) / 60).toBe(8);
    expect(MINUTES_PER_WORKING_DAY / gameMinutesPerRealSecond(4) / 60).toBe(2);
  });
});
