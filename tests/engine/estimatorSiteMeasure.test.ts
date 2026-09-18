// The estimator goes out with the tape when there is no owner free for it, and the day's travel
// minutes come off his own 480 and not the owner's (PIOTR; CLAUDE.md T20 2.3). A salesman can be
// sent as well, which is what the eligible list is for; the estimator is the one who goes without
// being asked.

import { describe, expect, it } from 'vitest';
import { SITE_MEASURE_MINUTES } from '../../src/engine/constants';
import { rolesForTask } from '../../src/engine/tasks';
import type { GameState, Worker } from '../../src/engine/index';
import {
  acceptNow,
  buyStartingKit,
  clearEvents,
  newGame,
  placeEnquiry,
  runClock,
} from '../helpers';

/** An estimator on the books this morning. He wants no bench and no kit. */
function estimatorOn(state: GameState): Worker {
  const worker: Worker = {
    id: 'e1',
    name: 'Ed',
    role: 'estimator',
    tier: 'experienced',
    rate: 1,
    weeklyWage: 610,
    startDay: 1,
    leavesOnDay: null,
    jobId: null,
    taskId: null,
    minutesWorked: 0,
    overtimeMinutes: 0,
    overtimeMinutesWeek: 0,
    overtimeDays: 0,
    tiredOfOvertime: false,
    ordersToday: 0,
    station: 'idle',
    productionMinutes: 0,
    absentDaysRemaining: 0,
    anchorX: 1,
    anchorY: 1,
    shift: 'day',
    dayLog: [],
    monthMinutes: 0,
    monthDaysOff: 0,
  };
  state.workers.push(worker);
  return worker;
}

/** A job on the books whose site has to be measured. */
function withAMeasure(): GameState {
  let state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
  state.enquiries = [];
  state.reputation = 15;
  const enquiry = placeEnquiry(state, { price: 4000, deadlineDays: 60, needsMeasure: true });
  state = acceptNow(state, enquiry.id, false);
  return state;
}

describe('the site measure', () => {
  it('is the estimator s and the salesman s to go on, and the estimator goes unasked', () => {
    expect(rolesForTask('siteMeasure').eligible).toContain('estimator');
    expect(rolesForTask('siteMeasure').eligible).toContain('salesman');
    expect(rolesForTask('siteMeasure').auto).toEqual(['estimator']);
  });

  it('lands on the estimator, and the travel minutes come off his day and not the owner s', () => {
    const state = withAMeasure();
    const worker = estimatorOn(state);
    const measure = state.tasks.find((task) => task.kind === 'siteMeasure');
    expect(measure?.minutesTotal).toBe(SITE_MEASURE_MINUTES);
    // The owner is at the bench: nothing of his is on the measure.
    expect(state.owner.currentTaskId).toBeNull();
    const ownerMinutes = state.owner.minutesWorked;
    const later = clearEvents(runClock(state, 20));
    const his = later.tasks.find((task) => task.kind === 'siteMeasure');
    expect(his?.doneBy).toBe(worker.id);
    const after = later.workers.find((entry) => entry.id === worker.id);
    // He is handed it in the first of the twenty minutes and spends the rest of them on it, so
    // the minutes on the task and the minutes of his day are the same figure.
    const spent = after?.minutesWorked ?? 0;
    expect(spent).toBe(19);
    expect(his?.minutesRemaining).toBe(SITE_MEASURE_MINUTES - spent);
    // And not one of them is the owner's: he was at the bench (CLAUDE.md T20 2.3).
    expect(later.owner.minutesWorked).toBe(ownerMinutes);
  });
});
