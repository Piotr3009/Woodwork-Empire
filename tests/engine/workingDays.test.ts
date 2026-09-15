// "Deadlines never count weekends, that makes no sense" (PIOTR, 13.09; CLAUDE.md T10 3.5).
// One pair of helpers answers every question about how far apart two days are: `addWorkingDays`,
// which Turn 8 wrote for the deliveries, and `workingDaysBetween`, which is its inverse.

import { describe, expect, it } from 'vitest';
import {
  addWorkingDays,
  dayOfWorkingIndex,
  isWorkingDay,
  weekdayName,
  workingDayIndex,
  workingDaysBetween,
} from '../../src/engine/clock';
import { deliverJob } from '../../src/engine/jobs';
import { acceptNow, firstJob, newGame, placeEnquiry } from '../helpers';

/** Day 1 is a Monday, so day 5 is the Friday of the first week and day 8 the Monday after it. */
const FRIDAY = 5;
const MONDAY = 8;

describe('counting working days', () => {
  it('makes a Friday plus three a Wednesday', () => {
    expect(weekdayName(FRIDAY)).toBe('Fri');
    const due = addWorkingDays(FRIDAY, 3);
    expect(weekdayName(due)).toBe('Wed');
    expect(due).toBe(10);
    expect(isWorkingDay(due)).toBe(true);
  });

  it('is its own inverse, on every day of three weeks', () => {
    for (let day = 1; day <= 21; day += 1) {
      for (let count = 0; count <= 10; count += 1) {
        const to = addWorkingDays(day, count);
        expect(workingDaysBetween(day, to), `${day} + ${count}`).toBe(count);
      }
    }
  });

  it('counts a weekend as no days at all, and reads backwards as the mirror of forwards', () => {
    // Friday to the Monday after it is one day, not three.
    expect(workingDaysBetween(FRIDAY, MONDAY)).toBe(1);
    expect(workingDaysBetween(FRIDAY, FRIDAY + 1)).toBe(0);
    expect(workingDaysBetween(FRIDAY, FRIDAY + 2)).toBe(0);
    expect(workingDaysBetween(MONDAY, FRIDAY)).toBe(-1);
    expect(workingDaysBetween(1, 8)).toBe(5);
  });

  it('lays the working days out as an axis with no gap in it', () => {
    expect(workingDayIndex(1)).toBe(1);
    expect(workingDayIndex(FRIDAY)).toBe(5);
    // Saturday and Sunday have no column of their own: they read as the Friday before them.
    expect(workingDayIndex(6)).toBe(5);
    expect(workingDayIndex(7)).toBe(5);
    expect(workingDayIndex(MONDAY)).toBe(6);
    for (let day = 1; day <= 40; day += 1) {
      if (!isWorkingDay(day)) continue;
      expect(dayOfWorkingIndex(workingDayIndex(day)), `day ${day}`).toBe(day);
    }
  });
});

describe('a deadline the client counts', () => {
  it('falls on a working day, whatever the days on it', () => {
    for (let deadlineDays = 1; deadlineDays <= 20; deadlineDays += 1) {
      const state = newGame();
      state.enquiries = [];
      const enquiry = placeEnquiry(state, { deadlineDays });
      const next = acceptNow(state, enquiry.id, false);
      const job = firstJob(next);
      expect(isWorkingDay(job.dueDay), `${deadlineDays} days`).toBe(true);
      expect(workingDaysBetween(next.clock.day, job.dueDay)).toBe(deadlineDays);
    }
  });
});

describe('a job that misses its deadline', () => {
  /** A job due on the Friday of week 1, delivered on a day the test names. */
  function delivered(on: number): number {
    const state = newGame();
    state.enquiries = [];
    const enquiry = placeEnquiry(state, { price: 4000, deadlineDays: 4 });
    const next = acceptNow(state, enquiry.id, false);
    const job = firstJob(next);
    expect(job.dueDay).toBe(FRIDAY);
    job.stage = 'awaitingTransport';
    next.clock.day = on;
    deliverJob(next, job);
    return job.daysLate;
  }

  it('is one day late over a weekend, and not three', () => {
    expect(delivered(FRIDAY)).toBe(0);
    // The calendar says three days; the workshop was open for one of them.
    expect(MONDAY - FRIDAY).toBe(3);
    expect(delivered(MONDAY)).toBe(1);
    expect(delivered(MONDAY + 1)).toBe(2);
    expect(delivered(MONDAY + 4)).toBe(5);
  });
});
