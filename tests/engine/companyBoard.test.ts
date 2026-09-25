// The two things the company board is built out of: every point of reputation the company has
// gained or lost with the reason for it, and what the hall is turning out and why
// (PIOTR, 13.09; CLAUDE.md T9 3.10).

import { describe, expect, it } from 'vitest';
import {
  BREAK_SKIP_FACTOR,
  EXTRACTOR_BROKEN_OUTPUT_FACTOR,
  GATE_CROWD_FACTOR,
  RATING_ON_TIME,
  UNDER_EXTRACTION_OUTPUT_PENALTY,
} from '../../src/engine/constants';
import { monthOfDay } from '../../src/engine/clock';
import { hallProductivityFactor, machineSavings, minutesSavedBy, outputBreakdown } from '../../src/engine/machines';
import { applyRating, changeReputation } from '../../src/engine/reputation';
import { tick } from '../../src/engine/index';
import type { GameState } from '../../src/engine/index';
import {
  acceptNow,
  act,
  buyStartingKit,
  clearEvents,
  connectAll,
  fillRack,
  firstJob,
  newGame,
  placeEnquiry,
  runDays,
  runToDay,
  withExtraction,
} from '../helpers';

function hall(): GameState {
  return fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 60);
}

describe('the reputation log', () => {
  it('writes down the day, the reason and the points of every change', () => {
    const state = hall();
    expect(state.reputationLog).toEqual([]);
    const before = state.reputation;
    changeReputation(state, 3, 'Bookcase: on time');
    expect(state.reputation).toBe(before + 3);
    expect(state.reputationLog).toEqual([
      { day: state.clock.day, reason: 'Bookcase: on time', points: 3 },
    ]);
  });

  it('writes down what the company actually moved, not what was asked for', () => {
    const state = hall();
    state.reputation = 99;
    changeReputation(state, 5, 'Wardrobe: express, on time');
    // The scale stops at 100, so the line says what the company really gained.
    expect(state.reputation).toBe(100);
    expect(state.reputationLog[0]?.points).toBe(1);
  });

  it('records a job delivered on time, and the calls nobody answered beside it', () => {
    let state = hall();
    state.enquiries = [];
    const enquiry = placeEnquiry(state, { price: 1200, deadlineDays: 40 });
    state = clearEvents(acceptNow(state, enquiry.id, false));
    const job = state.jobs[0];
    if (job === undefined) throw new Error('no job');
    job.daysLate = 0;
    job.callsMissed = 0;
    job.emailsUnanswered = 0;
    const before = state.reputation;
    applyRating(state, job);
    expect(state.reputation).toBe(before + RATING_ON_TIME);
    const line = state.reputationLog[state.reputationLog.length - 1];
    expect(line?.reason).toBe(`${job.name}: on time`);
    expect(line?.points).toBe(RATING_ON_TIME);
    expect(line?.day).toBe(state.clock.day);
  });

  it('records a late job as late, with the days on the line', () => {
    let state = hall();
    state.enquiries = [];
    const enquiry = placeEnquiry(state, { price: 1200, deadlineDays: 40 });
    state = clearEvents(acceptNow(state, enquiry.id, false));
    const job = state.jobs[0];
    if (job === undefined) throw new Error('no job');
    job.daysLate = 3;
    applyRating(state, job);
    const line = state.reputationLog[state.reputationLog.length - 1];
    expect(line?.reason).toBe(`${job.name}: 3 days late`);
    expect(line?.points).toBeLessThan(0);
  });
});

describe('the company output breakdown', () => {
  it('adds up to what every minute of production is multiplied by', () => {
    const state = hall();
    const breakdown = outputBreakdown(state);
    expect(breakdown.base).toBe(1);
    const sum = breakdown.base + breakdown.plus + breakdown.minus;
    expect(Number(sum.toFixed(2))).toBe(Number(breakdown.total.toFixed(2)));
    expect(breakdown.total).toBe(hallProductivityFactor(state));
  });

  it('says what is wrong with a dirty hall with its extraction down', () => {
    const state = hall();
    state.dust = 80;
    const extractor = state.equipment.find((item) => item.specId === 'extractor');
    if (extractor === undefined) throw new Error('no extractor');
    extractor.broken = true;
    const breakdown = outputBreakdown(state);
    const labels = breakdown.lines.filter((line) => line.hall).map((line) => line.label);
    expect(labels).toContain('Extraction down');
    expect(labels.some((label) => label.startsWith('Hall '))).toBe(true);
    // Every hall line is worth what it takes off the running total, so they add up exactly.
    const sum = breakdown.base + breakdown.plus + breakdown.minus;
    expect(Number(sum.toFixed(4))).toBe(Number(breakdown.total.toFixed(4)));
    expect(breakdown.total).toBeLessThan(EXTRACTOR_BROKEN_OUTPUT_FACTOR + 0.001);
    expect(hallProductivityFactor(state)).toBe(breakdown.total);
  });

  it('shows the owner, the crew and the machines beside it, and does not count them twice', () => {
    const state = hall();
    state.owner.overtimeDebt = 0.1;
    state.owner.breakSkipped = true;
    const clean = outputBreakdown(state);
    // None of these three is the hall's own factor: they act on the man or the machine.
    const owner = clean.lines.filter((line) => line.where === 'your own minutes');
    expect(owner.map((line) => line.label)).toEqual([
      'Overtime, carried into today',
      'Dinner worked through',
    ]);
    expect(owner[0]?.points).toBe(-0.1);
    expect(owner[1]?.points).toBe(Number((BREAK_SKIP_FACTOR - 1).toFixed(4)));
    for (const line of owner) expect(line.hall).toBe(false);
    // The used saw of the day 1 kit is below a standard one, and it says so.
    const saw = clean.lines.find((line) => line.label.startsWith('Table saw'));
    expect(saw?.hall).toBe(false);
    expect(saw?.where).toBe('the stage it does');
    expect(saw?.points).toBeLessThan(0);
    // And the number itself is untouched by any of them.
    expect(clean.total).toBe(hallProductivityFactor(state));
  });

  it('counts the crowded gate the hall counts', () => {
    const state = hall();
    const before = outputBreakdown(state).total;
    for (let index = 0; index < 5; index += 1) {
      const enquiry = placeEnquiry(state, { price: 900, deadlineDays: 40 });
      const next = acceptNow(state, enquiry.id, false);
      Object.assign(state, next);
    }
    for (const job of state.jobs) job.stage = 'awaitingTransport';
    const crowded = outputBreakdown(state);
    expect(crowded.lines.some((line) => line.label === 'No room at the gate')).toBe(true);
    expect(crowded.total).toBeLessThan(before);
    expect(crowded.total).toBe(Number((before * GATE_CROWD_FACTOR).toFixed(10)));
  });
});

describe('the Machines column (CLAUDE.md T17 2.24)', () => {
  /** The day 1 kit with the standard saw, one big job and the owner standing at it. */
  function atTheSaw(): GameState {
    let state = connectAll(
      withExtraction(fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' }), { sawVariant: 'standard' }), 80)),
    );
    state.enquiries = [];
    const enquiry = placeEnquiry(state, { price: 40000, deadlineDays: 90 });
    state = acceptNow(state, enquiry.id, false);
    firstJob(state).stage = 'ready';
    return act(state, { type: 'WORK_HERE', jobId: null });
  }

  it('gives a row to every machine in the hall, with its class, its effect and the hours it ran', () => {
    const state = tick(atTheSaw(), 60);
    const savings = machineSavings(state, 'week');
    const saw = savings.rows.find((row) => row.name === 'Standard table saw');
    expect(saw).toBeDefined();
    // Half an hour at the standard saw, the owner's turn at it being the first half hour of the
    // two and a bench the second (v55): its class is worth 5% and the half hour saves a minute
    // and a half, which the column rounds to a whole two.
    expect(saw?.hours).toBe(0.5);
    expect(saw?.effect).toBeCloseTo(0.05, 4);
    expect(saw?.minutesSaved).toBe(2);
    expect(saw?.gate).toBe(false);
    expect(saw?.minus).toBe(0);
    // The owner's half hour at the bench with a nailer drew on the compressor, so it ran that half
    // hour of the clock (v55) and saved nothing, a compressor being no pace; the edgebander and
    // the hand tool set live in a cabinet and are not machines standing in the hall.
    const other = savings.rows.find((row) => row.name === 'Used compressor');
    expect(other?.hours).toBe(0.5);
    expect(other?.minutesSaved).toBe(0);
    expect(savings.rows.map((row) => row.name)).toEqual(['Standard table saw', 'Used compressor']);
    // And the total is the rows added up.
    expect(savings.minutesSaved).toBe(savings.rows.reduce((sum, row) => sum + row.minutesSaved, 0));
    expect(savings.hoursSaved).toBe(Math.round((savings.minutesSaved / 60) * 10) / 10);
  });

  it('puts the gate’s 2% in the row it is fitted to', () => {
    const state = tick(atTheSaw(), 60);
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    if (!saw) throw new Error('no saw');
    state.gates.push(saw.id);
    const row = machineSavings(state, 'week').rows.find((entry) => entry.id === saw.id);
    expect(row?.gate).toBe(true);
    expect(row?.effect).toBeCloseTo(1.05 * 1.02 - 1, 4);
  });

  it('shows the minus of a machine with no pipe to the extraction', () => {
    const state = tick(atTheSaw(), 60);
    state.pipes = [];
    const saw = machineSavings(state, 'week').rows.find((row) => row.name === 'Standard table saw');
    expect(saw?.minus).toBe(-UNDER_EXTRACTION_OUTPUT_PENALTY);
    expect(saw?.minusWhy).toBe('no pipe to the extraction');
  });

  it('starts the week’s hours again on a Monday and the month’s on the second working day', () => {
    // A day of work, then the days that follow it: the machine's own clocks are the ones the
    // column and the month end read, and the life clock never moves back.
    const friday = runToDay(atTheSaw(), 5).state;
    const worked = runDays(friday, 1);
    const saw = (state: GameState) => {
      const item = state.equipment.find((entry) => entry.specId === 'tableSaw');
      if (!item) throw new Error('no saw');
      return item;
    };
    expect(saw(worked.state).hoursThisWeek).toBe(0);
    expect(saw(worked.state).hoursUsed).toBeGreaterThan(0);
    // And what the week that has gone saved is written down on the Monday, at the class the saw
    // has that morning, so the sheet can say last week beside this week (PIOTR, 21.09; v40).
    expect(saw(friday).minutesSavedLastWeek).toBe(0);
    // The game opened on that Monday, so the saw's whole life is that one week's hours.
    const monday = saw(worked.state);
    expect(monday.minutesSavedLastWeek).toBe(minutesSavedBy(worked.state, monday, monday.hoursUsed));
    expect(saw(worked.state).minutesSavedLastWeek).toBeGreaterThan(0);
    expect(machineSavings(worked.state, 'week').hoursSavedLastWeek).toBe(
      Math.round((saw(worked.state).minutesSavedLastWeek / 60) * 10) / 10,
    );
    expect(machineSavings(worked.state, 'month').hoursSavedLastWeek).toBe(0);
    // The month: the first working day of month 2 still carries month 1, so the month end has
    // the month it reports on; the day after that starts the new one.
    const openingMonth2 = runToDay(atTheSaw(), 31).state;
    expect(monthOfDay(openingMonth2.clock.day)).toBe(2);
    expect(saw(openingMonth2).hoursThisMonth).toBeGreaterThan(0);
    const secondDay = runToDay(openingMonth2, 32).state;
    expect(saw(secondDay).hoursThisMonth).toBe(0);
  });
});
