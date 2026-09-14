// The owner's day as a bar you can read: seven bands, in the order they happened, merged while he
// stays on the same thing, emptied every morning and kept for a week (CLAUDE.md T11 3.1).

import { describe, expect, it } from 'vitest';
import {
  DAY_CATEGORIES,
  DAY_CATEGORY_LABELS,
  DAY_CATEGORY_OF_TASK,
  dayCategoryOf,
  dayMinutesByCategory,
  dayPercentages,
  logDayMinute,
} from '../../src/engine/index';
import type { DayCategory, DayLogEntry, TaskKind } from '../../src/engine/index';
import {
  act,
  buyStartingKit,
  doTask,
  fillRack,
  newGame,
  nextDay,
  placeEnquiry,
  runClock,
  withAir,
  withExtraction,
} from '../helpers';

/** Every kind of task the engine can make, straight off the table the runner reads. */
const EVERY_KIND = Object.keys(DAY_CATEGORY_OF_TASK) as TaskKind[];

function logOf(pairs: Array<[DayCategory, number]>): DayLogEntry[] {
  const log: DayLogEntry[] = [];
  for (const [category, minutes] of pairs) {
    for (let minute = 0; minute < minutes; minute += 1) logDayMinute(log, category);
  }
  return log;
}

describe('the seven bands', () => {
  it('has one for every kind of task in the game, and each is one of the seven', () => {
    expect(EVERY_KIND.length).toBeGreaterThan(0);
    for (const kind of EVERY_KIND) {
      expect(DAY_CATEGORIES, kind).toContain(dayCategoryOf(kind));
    }
  });

  it('is seven bands and no more, each with a name the player reads', () => {
    expect(DAY_CATEGORIES).toHaveLength(7);
    expect([...DAY_CATEGORIES]).toEqual([
      'workshop',
      'calls',
      'emails',
      'meetings',
      'siteMeasure',
      'office',
      'fixing',
    ]);
    for (const category of DAY_CATEGORIES) {
      expect(DAY_CATEGORY_LABELS[category]).not.toBe('');
    }
  });

  it('puts the phone on calls, the drawings in the office and a bag change with the fixing', () => {
    expect(dayCategoryOf('clientCall')).toBe('calls');
    expect(dayCategoryOf('emails')).toBe('emails');
    expect(dayCategoryOf('design')).toBe('office');
    expect(dayCategoryOf('bookkeeping')).toBe('office');
    expect(dayCategoryOf('clientMeeting')).toBe('meetings');
    expect(dayCategoryOf('siteMeasure')).toBe('siteMeasure');
    expect(dayCategoryOf('bagChange')).toBe('fixing');
    expect(dayCategoryOf('cleaning')).toBe('fixing');
    expect(dayCategoryOf('unload')).toBe('fixing');
  });
});

describe('the log of a day', () => {
  it('joins consecutive minutes on the same thing into one segment', () => {
    const log = logOf([
      ['office', 30],
      ['calls', 6],
      ['office', 12],
    ]);
    expect(log).toEqual([
      { category: 'office', minutes: 30 },
      { category: 'calls', minutes: 6 },
      { category: 'office', minutes: 12 },
    ]);
  });

  it('adds the segments up per band, in the order the bands are painted', () => {
    const log = logOf([
      ['office', 30],
      ['calls', 6],
      ['office', 12],
      ['workshop', 52],
    ]);
    expect(dayMinutesByCategory(log)).toEqual([
      { category: 'workshop', minutes: 52 },
      { category: 'calls', minutes: 6 },
      { category: 'office', minutes: 42 },
    ]);
  });

  it('turns them into percentages that come to exactly a hundred', () => {
    const log = logOf([
      ['workshop', 100],
      ['calls', 100],
      ['office', 100],
    ]);
    const parts = dayPercentages(log);
    expect(parts.reduce((sum, part) => sum + part.percent, 0)).toBe(100);
    expect(parts.map((part) => part.percent).sort()).toEqual([33, 33, 34]);
  });

  it('comes to a hundred for any day at all, however awkward the thirds', () => {
    for (let workshop = 1; workshop <= 60; workshop += 1) {
      const log = logOf([
        ['workshop', workshop],
        ['calls', 7],
        ['emails', 3],
        ['meetings', 11],
        ['siteMeasure', 13],
        ['office', 17],
        ['fixing', 19],
      ]);
      const parts = dayPercentages(log);
      expect(parts, String(workshop)).toHaveLength(7);
      expect(parts.reduce((sum, part) => sum + part.percent, 0), String(workshop)).toBe(100);
    }
  });

  it('says nothing at all about a day with no minutes in it', () => {
    expect(dayPercentages([])).toEqual([]);
    expect(dayMinutesByCategory([])).toEqual([]);
  });
});

describe('the owner writing his own day', () => {
  it('books the bookkeeping to the office and the emails to the emails', () => {
    let state = newGame();
    state = doTask(state, 'bookkeeping');
    const bands = dayMinutesByCategory(state.owner.dayLog);
    expect(bands.map((band) => band.category)).toEqual(['office']);
    expect(bands[0]?.minutes).toBe(state.owner.minutesWorked);
  });

  it('books a minute at the bench to the workshop', () => {
    const start = withAir(
      withExtraction(fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 40)),
    );
    const enquiry = placeEnquiry(start, { price: 6000, deadlineDays: 40 });
    let state = act(start, { type: 'ACCEPT_ENQUIRY', enquiryId: enquiry.id, byHand: false });
    const job = state.jobs[0];
    if (job === undefined) throw new Error('no job on the books');
    job.stage = 'ready';
    state = act(state, { type: 'WORK_HERE', jobId: job.id });
    state = runClock(state, 20);
    const bands = dayMinutesByCategory(state.owner.dayLog);
    const workshop = bands.find((band) => band.category === 'workshop');
    expect(workshop?.minutes ?? 0).toBeGreaterThan(0);
  });

  it('empties the log every morning and keeps the day that closed', () => {
    let state = newGame();
    state = doTask(state, 'bookkeeping');
    expect(state.owner.dayLog.length).toBeGreaterThan(0);
    const day = state.clock.day;
    state = nextDay(state);
    expect(state.clock.day).toBeGreaterThan(day);
    expect(state.owner.dayLog).toEqual([]);
    const kept = state.dayLogs.find((entry) => entry.day === day);
    expect(kept).toBeDefined();
    expect((kept?.segments ?? []).length).toBeGreaterThan(0);
  });

  it('keeps a week of days and no more', () => {
    let state = newGame();
    for (let day = 0; day < 10; day += 1) state = nextDay(state);
    expect(state.dayLogs.length).toBeLessThanOrEqual(7);
    const days = state.dayLogs.map((entry) => entry.day);
    expect([...days].sort((a, b) => a - b)).toEqual(days);
  });

  it('writes the day onto the summary the evening keeps', () => {
    let state = newGame();
    state = doTask(state, 'bookkeeping');
    const day = state.clock.day;
    state = nextDay(state);
    const summary = state.days.find((entry) => entry.day === day);
    expect(summary).toBeDefined();
    const parts = dayPercentages(summary?.dayLog ?? []);
    expect(parts.reduce((sum, part) => sum + part.percent, 0)).toBe(100);
  });
});
