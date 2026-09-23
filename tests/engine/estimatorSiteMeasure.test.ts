// The estimator goes out with the tape and the day's travel minutes come off his own 480 and not
// the owner's (PIOTR; CLAUDE.md T20 2.3). From Turn 21 nobody waits for the owner to have time for
// it: the estimator goes the minute the measure exists, the salesman goes when there is no estimator
// on the books, and the owner only when there is neither of them (PIOTR, 19.09: "they wait until I
// have time; stupid"; CLAUDE.md T21 2.5.1).

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

/** A man of this trade on the books this morning. He wants no bench and no kit. */
function officeManOn(
  state: GameState,
  role: Worker['role'],
  id: string,
  name: string,
): Worker {
  const worker: Worker = {
    id,
    name,
    role,
    tier: role === 'estimator' ? 'experienced' : null,
    rate: 1,
    monthlyWage: 2600,
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
    idleMinutes: 0,
    idleByReason: { waitingForBoss: 0, noPlace: 0, noMaterial: 0, noCompressor: 0, hallStopped: 0 },
    working: false,
    noPlaceFor: '',
    accidents: 0,
  };
  state.workers.push(worker);
  return worker;
}

/** The estimator of the Turn 20 tests, unchanged, through the one builder. */
function estimatorOn(state: GameState): Worker {
  return officeManOn(state, 'estimator', 'e1', 'Ed');
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
  it('is the estimator s first, the salesman s second, and nobody waits to be asked', () => {
    // The order of the auto list is the order of the section: the estimator, then the salesman, and
    // the owner is not on it at all, because he is not staff (CLAUDE.md T21 2.5.1).
    expect(rolesForTask('siteMeasure').eligible).toEqual(['estimator', 'salesman']);
    expect(rolesForTask('siteMeasure').auto).toEqual(['estimator', 'salesman']);
  });

  it('goes to the estimator the minute the measure exists, before any pass over the crew', () => {
    // Turn 20 handed it out at the next assignment pass. From tonight the task is handed to
    // whoever it belongs to as it is created, so a measure that comes onto the books at 11:00 is
    // the estimator's at 11:00 (CLAUDE.md T21 2.5.1, 2.5.3).
    let state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    state.enquiries = [];
    state.reputation = 15;
    const estimator = officeManOn(state, 'estimator', 'e1', 'Ed');
    const salesman = officeManOn(state, 'salesman', 's1', 'Sal');
    const enquiry = placeEnquiry(state, { price: 4000, deadlineDays: 60, needsMeasure: true });
    state = acceptNow(state, enquiry.id, false);
    const measure = state.tasks.find((task) => task.kind === 'siteMeasure');
    expect(measure?.doneBy).toBe(estimator.id);
    // And not the salesman, who is second and has the calls of the job instead.
    expect(measure?.doneBy).not.toBe(salesman.id);
    // None of it is the owner's: his day meter shows not a minute of the measure (T21 2.5).
    expect(state.owner.currentTaskId).toBeNull();
    expect(state.owner.minutesWorked).toBe(0);
  });

  it('goes to the salesman when there is no estimator on the books', () => {
    let state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    state.enquiries = [];
    state.reputation = 15;
    const salesman = officeManOn(state, 'salesman', 's1', 'Sal');
    const enquiry = placeEnquiry(state, { price: 4000, deadlineDays: 60, needsMeasure: true });
    state = acceptNow(state, enquiry.id, false);
    const measure = state.tasks.find((task) => task.kind === 'siteMeasure');
    expect(measure?.doneBy).toBe(salesman.id);
    expect(state.owner.currentTaskId).toBeNull();
  });

  it('is the owner s only when there is neither of them', () => {
    const state = withAMeasure();
    const measure = state.tasks.find((task) => task.kind === 'siteMeasure');
    // Nobody has it: it sits on his list for him to start, exactly as it always did. The owner is
    // never handed a task behind his back, because he is the one who decides what he does next
    // (CLAUDE.md T4 3.2).
    expect(measure?.doneBy).toBeNull();
    const later = clearEvents(runClock(state, 20));
    expect(later.tasks.find((task) => task.kind === 'siteMeasure')?.doneBy).toBeNull();
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
