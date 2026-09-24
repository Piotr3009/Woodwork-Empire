// What an hour of somebody's time earns the workshop, machines and all (CLAUDE.md T6 3.8).

import { describe, expect, it } from 'vitest';
import { WORKER_RATES } from '../../src/engine/constants';
import { earnedRate } from '../../src/engine/economy';
import { formatCalendarDay, tick } from '../../src/engine/index';
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
    tier: 'novice',
    rate: WORKER_RATES.novice,
    monthlyWage: 1950,
    leavesOnDay: null,
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
    monthMinutes: 0,
    monthDaysOff: 0,
    idleMinutes: 0,
    idleByReason: { waitingForBoss: 0, noPlace: 0, noMaterial: 0, noCompressor: 0, hallStopped: 0 },
    working: false,
    noPlaceFor: '',
    accidents: 0,
    anchorX: 0,
    anchorY: 4,
  });
  return state;
}

/** The job's one pace in the day 1 hall with a saw of this class: the cutting's quarter of the job
 *  at the saw's pace and the other three quarters at 1.00, the budget bench's and the hand
 *  edgebander's (PIOTR, 24.09; v53). */
function paceWithSaw(sawPace: number): number {
  return 1 / (0.25 / sawPace + 0.75);
}

describe('the owner on his own', () => {
  it('earns 39.48 an hour with the used saw', () => {
    const worked = tick(atTheBench('used'), 60);
    expect(worked.dayStats.workMinutes).toBe(60);
    // 38.00 until v53, the whole hour at the used saw's 0.95 because he was at the cutting. From
    // v53 a job is worked at one pace, and the used saw's 0.95 is on the cutting's quarter of it
    // only: 40 an hour times 0.9870.
    expect(earnedRate(worked, 'day')).toBe(Math.round(40 * paceWithSaw(0.95) * 100) / 100);
    expect(earnedRate(worked, 'day')).toBe(39.48);
  });

  it('earns 40.48 an hour with the standard saw', () => {
    const worked = tick(atTheBench('standard'), 60);
    // 42.00 until v53, the whole hour at the standard saw's 1.05; now the job's one pace, 1.0120.
    expect(earnedRate(worked, 'day')).toBe(Math.round(40 * paceWithSaw(1.05) * 100) / 100);
    expect(earnedRate(worked, 'day')).toBe(40.48);
  });

  it('earns nothing an hour before anybody has worked', () => {
    expect(earnedRate(newGame(), 'day')).toBe(0);
  });
});

describe('a joiner with no experience', () => {
  it('earns 24.29 an hour on the standard saw, which is 0.6 of the owner', () => {
    let state = withJoiner(atTheBench('standard'));
    // The job goes to the joiner, so the owner is in the workshop but not at a bench.
    state = act(state, { type: 'ASSIGN_JOB', jobId: firstJob(state).id, workerId: 'staff-1' });
    const worked = tick(state, 60);
    expect(worked.dayStats.workMinutes).toBe(60);
    // His tier is 0.6 of the owner (CLAUDE.md T21 2.9), so the hour he earns is 0.6 of the owner's:
    // 25.20 of 42.00 until v53, 24.29 of 40.48 now, the job's one pace. The owner and he are two
    // men against the standard saw's two places, so the hall has no saw line.
    expect(earnedRate(worked, 'day')).toBe(24.29);
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
    // (42.00 + 25.20) / 2 = 33.60 until v53; (40.48 + 24.29) / 2 = 32.39 now, the job's one pace
    // on both of them (v53).
    expect(earnedRate(worked, 'day')).toBe(32.39);
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
        title: `End of ${formatCalendarDay(1)}`,
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
        efficiency: { possible: 0, worked: 0, lost: { noPeople: 0, noPlace: 0, noMaterial: 0, hallStopped: 0, ownerAway: 0 } },
        nightMinutes: 0,
        paidHours: 0,
        expressUplift: 0,
        hallFactor: 1,
        outputToday: 1,
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
