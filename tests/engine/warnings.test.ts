// The warning strip's list: one engine function, the problems the game sees, the most urgent
// first, and nothing at all when nothing is wrong (CLAUDE.md T13 3.22).

import { describe, expect, it } from 'vitest';
import { NO_INSURANCE_REASON, WORKER_RATES } from '../../src/engine/constants';
import { bagStore, crewFull, crewLimit, workPlan } from '../../src/engine/index';
import type { GameState, Worker } from '../../src/engine/index';
import { WARNING_ORDER, warnings } from '../../src/engine/warnings';
import {
  acceptNow,
  buyStartingKit,
  fillBags,
  fillRack,
  firstJob,
  newGame,
  placeEnquiry,
} from '../helpers';

/** A hall with the day 1 kit and an empty board: nothing is wrong with it. */
function quietHall(): GameState {
  const state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
  state.enquiries = [];
  return state;
}

function joiner(index: number): Worker {
  return {
    id: `staff-${index}`,
    name: `Joiner ${index}`,
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
    monthMinutes: 0,
    monthDaysOff: 0,
    anchorX: 4 + index * 2,
    anchorY: 6,
  };
}

function withBagsFull(state: GameState): GameState {
  fillBags(state);
  expect(bagStore(state).full).toBe(true);
  return state;
}

function withStartedJobNobodyOn(state: GameState): GameState {
  const enquiry = placeEnquiry(state, { price: 4000, deadlineDays: 90 });
  const next = acceptNow(state, enquiry.id);
  const job = firstJob(next);
  job.stage = 'inProduction';
  job.assignedTo = null;
  return next;
}

function withDeadlineAtRisk(state: GameState): GameState {
  // A big job due tomorrow: the last day it could have been started has gone.
  const enquiry = placeEnquiry(state, { price: 40000, deadlineDays: 1, name: 'Boardroom table' });
  const next = acceptNow(state, enquiry.id);
  const row = workPlan(next).rows.find((entry) => entry.name === 'Boardroom table');
  expect(row?.late || row?.overdue).toBe(true);
  return next;
}

function withUninsuredCommercial(state: GameState): GameState {
  placeEnquiry(state, {
    name: 'Shop fit out',
    kind: 'commercial',
    unreachable: true,
    blockReason: NO_INSURANCE_REASON,
  });
  return state;
}

function withCrewAtTheLimit(state: GameState): GameState {
  const limit = crewLimit(state);
  expect(limit).toBeGreaterThan(0);
  for (let index = 1; index <= limit; index += 1) state.workers.push(joiner(index));
  expect(crewFull(state, 'joiner')).toBe(true);
  return state;
}

describe('the list', () => {
  it('is empty when nothing is wrong', () => {
    expect(warnings(quietHall())).toEqual([]);
  });

  it('says the bags are full', () => {
    const found = warnings(withBagsFull(quietHall()));
    expect(found.map((warning) => warning.key)).toEqual(['bagsFull']);
    expect(found[0]?.text).toContain('bags are full');
  });

  it('names a started job nobody is on', () => {
    const found = warnings(withStartedJobNobodyOn(quietHall()));
    expect(found.map((warning) => warning.key)).toEqual(['nobodyAssigned']);
    expect(found[0]?.text).toBe('Garage shelves is started and nobody is on it');
  });

  it('names a job whose deadline is at risk, off the work plan', () => {
    const found = warnings(withDeadlineAtRisk(quietHall()));
    expect(found.map((warning) => warning.key)).toEqual(['deadlineAtRisk']);
    expect(found[0]?.text).toContain('Boardroom table');
    expect(found[0]?.text).toContain('deadline');
  });

  it('says nothing about a deadline that is comfortable', () => {
    const state = quietHall();
    const enquiry = placeEnquiry(state, { price: 400, deadlineDays: 60 });
    expect(warnings(acceptNow(state, enquiry.id))).toEqual([]);
  });

  it('names a commercial enquiry greyed for want of insurance', () => {
    const found = warnings(withUninsuredCommercial(quietHall()));
    expect(found.map((warning) => warning.key)).toEqual(['noInsurance']);
    expect(found[0]?.text).toContain('Shop fit out');
    expect(found[0]?.text).toContain('no insurance');
  });

  it('says the crew is at the floor limit, in the crew line', () => {
    const state = withCrewAtTheLimit(quietHall());
    const found = warnings(state);
    expect(found.map((warning) => warning.key)).toEqual(['crewFull']);
    expect(found[0]?.text).toMatch(/^Crew \d+ \/ \d+, floor limited: no floor for another person$/);
  });
});

describe('the order of urgency', () => {
  it('is bags, then the started job, then the deadline, then the insurance, then the crew', () => {
    expect(WARNING_ORDER).toEqual([
      'bagsFull',
      'nobodyAssigned',
      'deadlineAtRisk',
      'noInsurance',
      'crewFull',
    ]);
  });

  it('puts every problem in that order when the hall has them all at once', () => {
    let state = quietHall();
    state = withStartedJobNobodyOn(state);
    state = withDeadlineAtRisk(state);
    state = withUninsuredCommercial(state);
    state = withCrewAtTheLimit(state);
    state = withBagsFull(state);
    expect(warnings(state).map((warning) => warning.key)).toEqual([...WARNING_ORDER]);
  });

  it('shows the next one down once the most urgent is dealt with', () => {
    let state = quietHall();
    state = withStartedJobNobodyOn(state);
    state = withUninsuredCommercial(state);
    state = withBagsFull(state);
    expect(warnings(state)[0]?.key).toBe('bagsFull');
    state.bagFillM3 = 0;
    expect(warnings(state)[0]?.key).toBe('nobodyAssigned');
    firstJob(state).assignedTo = 'owner';
    expect(warnings(state)[0]?.key).toBe('noInsurance');
  });
});
