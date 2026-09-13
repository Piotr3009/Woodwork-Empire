import { describe, expect, it } from 'vitest';
import {
  addWorkingDays,
  dayOfMonth,
  daysBetween,
  formatDate,
  formatTime,
  gameMinutesPerRealSecond,
  hourIndex,
  isBreak,
  isDayExhausted,
  isFirstOfMonth,
  isFriday,
  isLastWorkingDayOfMonth,
  isOvertime,
  isWorkingDay,
  monthOfDay,
  nextWorkingDay,
  weekday,
  weekdayName,
  workedMinutesOfDay,
  yearOfDay,
} from '../../src/engine/clock';
import {
  BREAK_MINUTES,
  BREAK_START_MINUTE,
  DAYS_PER_MONTH,
  MINUTES_PER_WORKING_DAY,
  REAL_SECONDS_PER_DAY_AT_1X,
} from '../../src/engine/constants';
import { showsDaySummary, summaryTitle } from '../../src/engine/game';
import { newGame } from '../helpers';

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

  it('counts hours of work done, and the break is not work', () => {
    expect(hourIndex(0)).toBe(0);
    expect(hourIndex(59)).toBe(0);
    expect(hourIndex(60)).toBe(1);
    // The break runs from 240 to 270, so the clock is half an hour ahead of the work from there.
    expect(hourIndex(BREAK_START_MINUTE - 1)).toBe(3);
    expect(hourIndex(BREAK_START_MINUTE + BREAK_MINUTES)).toBe(4);
    expect(hourIndex(479 + BREAK_MINUTES)).toBe(7);
    expect(hourIndex(480 + BREAK_MINUTES)).toBe(8);
  });

  it('stops the workshop for the break, and counts it against nobody', () => {
    expect(isBreak(BREAK_START_MINUTE - 1)).toBe(false);
    expect(isBreak(BREAK_START_MINUTE)).toBe(true);
    expect(isBreak(BREAK_START_MINUTE + BREAK_MINUTES - 1)).toBe(true);
    expect(isBreak(BREAK_START_MINUTE + BREAK_MINUTES)).toBe(false);
    // Work done, minute by minute: it stands still through the break and picks up after it.
    expect(workedMinutesOfDay(BREAK_START_MINUTE)).toBe(BREAK_START_MINUTE);
    expect(workedMinutesOfDay(BREAK_START_MINUTE + 10)).toBe(BREAK_START_MINUTE);
    expect(workedMinutesOfDay(BREAK_START_MINUTE + BREAK_MINUTES)).toBe(BREAK_START_MINUTE);
    expect(workedMinutesOfDay(BREAK_START_MINUTE + BREAK_MINUTES + 1)).toBe(
      BREAK_START_MINUTE + 1,
    );
  });

  it('marks overtime and the hard stop by the work, so the day ends at 16:30', () => {
    expect(isOvertime(479)).toBe(false);
    // 16:00 on the clock is no longer the end of the 480: the break is in the way.
    expect(isOvertime(480)).toBe(false);
    expect(isOvertime(479 + BREAK_MINUTES)).toBe(false);
    expect(isOvertime(480 + BREAK_MINUTES)).toBe(true);
    expect(formatTime(480 + BREAK_MINUTES)).toBe('16:30');
    expect(isDayExhausted(719 + BREAK_MINUTES)).toBe(false);
    expect(isDayExhausted(720 + BREAK_MINUTES)).toBe(true);
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

describe('the summary cadence', () => {
  it('shows every day, on Friday, or on the last working day of the month', () => {
    const state = newGame();
    expect(state.summaryCadence).toBe('daily');
    // Day 1 is a Monday, day 5 the Friday, days 6 and 7 the weekend.
    expect(showsDaySummary({ ...state, clock: { day: 1, minute: 0 } })).toBe(true);
    const weekly = { ...state, summaryCadence: 'weekly' as const };
    expect(showsDaySummary({ ...weekly, clock: { day: 1, minute: 0 } })).toBe(false);
    expect(showsDaySummary({ ...weekly, clock: { day: 5, minute: 0 } })).toBe(true);
    expect(showsDaySummary({ ...weekly, clock: { day: 12, minute: 0 } })).toBe(true);
    const monthly = { ...state, summaryCadence: 'monthly' as const };
    for (let day = 1; day <= DAYS_PER_MONTH; day += 1) {
      expect(showsDaySummary({ ...monthly, clock: { day, minute: 0 } })).toBe(
        isLastWorkingDayOfMonth(day),
      );
    }
    // Exactly one working day of the month carries it.
    const days: number[] = [];
    for (let day = 1; day <= DAYS_PER_MONTH; day += 1) days.push(day);
    const carried = days.filter((day) => isLastWorkingDayOfMonth(day));
    expect(carried).toHaveLength(1);
  });

  it('names the summary after the span of figures it carries', () => {
    const state = newGame();
    expect(summaryTitle({ ...state, clock: { day: 5, minute: 0 } })).toBe('End of day 5');
    expect(
      summaryTitle({ ...state, summaryCadence: 'weekly', clock: { day: 5, minute: 0 } }),
    ).toBe('End of week 1');
    expect(
      summaryTitle({ ...state, summaryCadence: 'monthly', clock: { day: 5, minute: 0 } }),
    ).toBe('End of month 1');
  });
});
