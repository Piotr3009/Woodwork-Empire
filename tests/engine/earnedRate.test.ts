// What an hour of somebody's time earns the workshop, machines and all (CLAUDE.md T6 3.8).

import { describe, expect, it } from 'vitest';
import { WORKER_RATES } from '../../src/engine/constants';
import { earnedRate } from '../../src/engine/economy';
import { tick } from '../../src/engine/index';
import type { GameState } from '../../src/engine/index';
import {
  acceptNow,
  act,
  buyStartingKit,
  withExtraction,
  fillRack,
  firstJob,
  newGame,
  placeEnquiry,
  twoMenOnSheetWork,
} from '../helpers';

/** A hall with the day 1 kit and one job of work on the bench. */
function atTheBench(sawVariant: string): GameState {
  // A fan big enough for the saw: this file is about what an hour earns, not about the extraction
  // sums, and a budget or standard saw on the cheapest extractor is short of air
  // (CLAUDE.md T10 3.1).
  const state = withExtraction(
    fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' }), { sawVariant })),
  );
  state.enquiries = [];
  const enquiry = placeEnquiry(state, { price: 40000, deadlineDays: 90 });
  const taken = acceptNow(state, enquiry.id, false);
  firstJob(taken).stage = 'ready';
  return act(taken, { type: 'WORK_HERE', jobId: null });
}

/** A poor joiner standing at his own bench, on the job the owner is not on. */
function withJoiner(state: GameState): GameState {
  state.workers.push({
    id: 'staff-1',
    name: 'Ben',
    role: 'joiner',
    tier: 'poor',
    rate: WORKER_RATES.poor,
    weeklyWage: 480,
    monthlyWage: 0,
    startDay: 1,
    jobId: null,
    taskId: null,
    minutesWorked: 0,
    ordersToday: 0,
    overtimeMinutes: 0,
    overtimeMinutesWeek: 0,
    overtimeDays: 0,
    tiredOfOvertime: false,
    station: 'idle',
    productionMinutes: 0,
    absentDaysRemaining: 0,
    shift: 'day',
    dayLog: [],
    anchorX: 0,
    anchorY: 4,
  });
  return state;
}

describe('the owner on his own', () => {
  it('earns 38.00 an hour with the used saw', () => {
    const worked = tick(atTheBench('used'), 60);
    expect(worked.dayStats.workMinutes).toBe(60);
    expect(earnedRate(worked, 'day')).toBe(38);
  });

  it('earns 42.00 an hour with the standard saw', () => {
    const worked = tick(atTheBench('standard'), 60);
    expect(earnedRate(worked, 'day')).toBe(42);
  });

  it('earns nothing an hour before anybody has worked', () => {
    expect(earnedRate(newGame(), 'day')).toBe(0);
  });
});

describe('a poor joiner', () => {
  it('earns 25.20 an hour on the standard saw, which is 0.6 of the owner', () => {
    let state = withJoiner(atTheBench('standard'));
    // The job goes to the joiner, so the owner is in the workshop but not at a bench.
    state = act(state, { type: 'ASSIGN_JOB', jobId: firstJob(state).id, workerId: 'staff-1' });
    const worked = tick(state, 60);
    expect(worked.dayStats.workMinutes).toBe(60);
    expect(earnedRate(worked, 'day')).toBe(25.2);
  });
});

describe('the two of them together', () => {
  it('counts the two of them in the same minute as two people minutes, not one', () => {
    // The owner at one bench and the joiner at the other, both on sheet work, for an hour of the
    // clock. That is two hours of somebody's time, and the rate is the two of them averaged.
    const worked = tick(twoMenOnSheetWork({ sawVariant: 'standard' }), 60);
    expect(worked.owner.productionMinutes).toBe(60);
    expect(worked.workers[0]?.productionMinutes).toBe(60);
    expect(worked.dayStats.workMinutes).toBe(120);
    expect(earnedRate(worked, 'day')).toBe((42 + 25.2) / 2);
  });

  it('weights by the hours each of them worked, four of the owner against eight of the joiner', () => {
    // The arithmetic of 3.8 on its own: four hours at 42 and eight at 25.2 come to 30.80 an hour.
    // What the engine puts into those two figures is the test above.
    const state = newGame();
    state.dayStats.workMinutes = 4 * 60 + 8 * 60;
    state.dayStats.labourValue = 4 * 42 + 8 * 25.2;
    expect(earnedRate(state, 'day')).toBe(30.8);
  });

  it('adds the days up over a week and a month', () => {
    const state = newGame();
    state.clock.day = 3;
    state.days = [
      {
        day: 1,
        title: 'End of day 1',
        minutesByCategory: { admin: 0, design: 0, workshop: 0 },
        minutesWorked: 0,
        minutesAvailable: 480,
        overtimeMinutes: 0,
        tomorrowFactor: 1,
        breakSkipped: false,
        spanLabel: 'daily',
        income: 0,
        costs: 0,
        cash: 0,
        jobsAdvanced: 0,
        jobsCompleted: [],
        dustAtStart: 0,
        dustAtEnd: 0,
        dustMadeM3: 0,
        deliveriesTomorrow: [],
        labourValue: 42 * 8,
        workMinutes: 480,
        dayLog: [],
        efficiency: { possible: 0, worked: 0, lost: { noPeople: 0, noMachine: 0, noMaterial: 0, ownerAway: 0 } },
        nightMinutes: 0,
      },
    ];
    state.dayStats.workMinutes = 480;
    state.dayStats.labourValue = 25.2 * 8;
    expect(earnedRate(state, 'day')).toBe(25.2);
    // Two full days, one at 42 and one at 25.2: the week comes to the middle of them.
    expect(earnedRate(state, 'week')).toBe(33.6);
    expect(earnedRate(state, 'month')).toBe(33.6);
  });
});

describe('the last minute of a job', () => {
  it('books what went into it, not what was offered', () => {
    let state = atTheBench('standard');
    // The job is all but done, so the rack has to cover every sheet of it before the last minute.
    state.stock.sheets = 500;
    const job = firstJob(state);
    job.labourRemaining = 0.2;
    state = tick(state, 1);
    expect(state.dayStats.workMinutes).toBe(1);
    expect(state.dayStats.labourValue).toBeCloseTo(0.2, 6);
    expect(firstJob(state).labourRemaining).toBe(0);
  });
});
