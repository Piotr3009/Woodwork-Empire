// The office works without the owner (PIOTR, 19.09: "they wait until I have time; stupid";
// CLAUDE.md T21 2.5). Two of the three things this section takes off his list are here: the material
// a job's finished drawings call for, ordered by whoever in the office is there to order it, and the
// emails and calls, which are the admin's the minute they arrive and not at the next pass over the
// crew. The third, the site measure, is in tests/engine/estimatorSiteMeasure.test.ts, where the
// measure already lived.
//
// Each of the three is asked twice: with the person on the books and without him, because without
// him the job's card has to ask the owner exactly as it always did.

import { describe, expect, it } from 'vitest';
import { BREAK_START_MINUTE } from '../../src/engine/constants';
import { MATERIAL_ORDER_ROLES } from '../../src/engine/jobs';
import { createTask } from '../../src/engine/tasks';
import { shortfallOf } from '../../src/engine/materials';
import type { GameState, Worker } from '../../src/engine/index';
import {
  acceptNow,
  buyStartingKit,
  clearEvents,
  doTask,
  firstJob,
  newGame,
  placeEnquiry,
  runClock,
} from '../helpers';

/** A man of the office on the books this morning. He wants no bench and no kit. */
function officeManOn(state: GameState, role: Worker['role'], name: string): Worker {
  const worker: Worker = {
    id: `office-${role}`,
    name,
    role,
    tier: role === 'estimator' ? 'experienced' : null,
    rate: role === 'estimator' ? 0.8 : 0,
    monthlyWage: 2000,
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

/** A job drawn and about to have its take off done, on an empty rack, so it is short of sheets the
 *  moment the take off is finished. The rack is what makes the shortfall: the budget saw is the
 *  cheapest hall that can take the job at all. */
function drawnAndShort(): GameState {
  const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }), { sawVariant: 'budget' });
  state.enquiries = [];
  const enquiry = placeEnquiry(state, { price: 400, deadlineDays: 30 });
  let next = acceptNow(state, enquiry.id, false);
  next = doTask(next, 'design');
  return clearEvents(next);
}

/** Runs the clock until the take off on the books is done, whoever is doing it. */
function untilTakeOffDone(state: GameState): GameState {
  let next = state;
  let guard = 0;
  while (next.tasks.some((task) => task.kind === 'materialTakeOff' && !task.done) && guard < 200) {
    next = runClock(next, 1);
    guard += 1;
  }
  return clearEvents(next);
}

function orderLineOf(state: GameState): string | null {
  const job = firstJob(state);
  const line = state.ledger.find((entry) => entry.label.startsWith(`Material for ${job.name}`));
  return line?.label ?? null;
}

describe('the material a job is short of', () => {
  it('is ordered by the purchasing clerk the minute the drawings are done', () => {
    const state = drawnAndShort();
    const clerk = officeManOn(state, 'purchasingClerk', 'Percy');
    const cash = state.cash;
    // The owner does the take off himself here: the clerk is not eligible for one, so this is the
    // ordinary case of a workshop with a clerk in the office.
    const after = clearEvents(doTask(state, 'materialTakeOff'));
    const job = firstJob(after);
    // Nobody opened the job's card and nobody pressed anything: the lorry is on its way.
    expect(job.stage).toBe('materialOrdered');
    expect(after.deliveries.filter((delivery) => delivery.jobId === job.id)).toHaveLength(1);
    expect(after.cash).toBeLessThan(cash);
    // And the ledger says who ordered it, because a ledger line has no field for a man.
    expect(orderLineOf(after)).toBe(`Material for ${job.name}, ordered by ${clerk.name}`);
    // The ordering costs the owner nothing: it is not his and it is not on his meter.
    expect(after.owner.currentTaskId).toBeNull();
  });

  it('is the estimator s when there is no clerk, and the admin s when there is neither', () => {
    // The order the section names: the clerk, then the man who read the drawing and counted the
    // sheets, then the admin who covers for a specialist the company has not taken on
    // (CLAUDE.md T21 2.5.2).
    expect(MATERIAL_ORDER_ROLES).toEqual(['purchasingClerk', 'estimator', 'officeAdmin']);
    const withEstimator = drawnAndShort();
    const estimator = officeManOn(withEstimator, 'estimator', 'Ed');
    // He takes the take off off the owner, as he has since Turn 20, and then orders what it found.
    const done = untilTakeOffDone(withEstimator);
    expect(firstJob(done).stage).toBe('materialOrdered');
    expect(orderLineOf(done)).toBe(`Material for ${firstJob(done).name}, ordered by ${estimator.name}`);

    const withAdmin = drawnAndShort();
    const admin = officeManOn(withAdmin, 'officeAdmin', 'Ann');
    const after = clearEvents(doTask(withAdmin, 'materialTakeOff'));
    expect(firstJob(after).stage).toBe('materialOrdered');
    expect(orderLineOf(after)).toBe(`Material for ${firstJob(after).name}, ordered by ${admin.name}`);
  });

  it('waits for the owner s own click when there is nobody in the office at all', () => {
    const state = drawnAndShort();
    const after = clearEvents(doTask(state, 'materialTakeOff'));
    const job = firstJob(after);
    // Exactly as it always was: the job is short, it says so, and its card asks him.
    expect(shortfallOf(job)).toBeGreaterThan(0);
    expect(job.stage).toBe('materialPending');
    expect(after.deliveries.filter((delivery) => delivery.jobId === job.id)).toHaveLength(0);
    expect(orderLineOf(after)).toBeNull();
  });

  it('never takes the company past the overdraft the bank allows', () => {
    // `orderForJob` asks the engine's own `canAfford`, which is the overdraft floor to the penny, so
    // the office has nothing to order with and orders nothing. The job stays short and the player is
    // told by the material line, which is the same answer his own click gets (CLAUDE.md T21 2.5.2).
    const state = drawnAndShort();
    officeManOn(state, 'purchasingClerk', 'Percy');
    state.cash = state.finance.overdraftLimit + 10;
    const after = clearEvents(doTask(state, 'materialTakeOff'));
    expect(firstJob(after).stage).toBe('materialPending');
    expect(after.deliveries).toHaveLength(0);
    expect(after.cash).toBe(state.finance.overdraftLimit + 10);
  });
});

describe('a call that comes in at eleven', () => {
  /** A quiet hall at 11:00, which is an hour before the break and three hours into the day. The
   *  morning's daily list is cleared: this is about one call and who picks it up, so the call is the
   *  only open job of work in the hall. */
  function atEleven(): GameState {
    const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    state.enquiries = [];
    state.tasks = [];
    state.clock.minute = BREAK_START_MINUTE - 60;
    return state;
  }

  it('is the salesman s in that minute, and not at the next day s eight o clock', () => {
    const state = atEleven();
    const salesman = officeManOn(state, 'salesman', 'Sal');
    const minute = state.clock.minute;
    const call = createTask(state, { kind: 'clientCall', label: 'A client is on the phone', minutes: 15 });
    // Taken as it is created: the day's own pass over the crew has not run since (T21 2.5.3).
    expect(call.doneBy).toBe(salesman.id);
    expect(salesman.taskId).toBe(call.id);
    expect(state.clock.minute).toBe(minute);
    // The admin is behind him, at half the speed, and that ranking has not moved.
    expect(state.owner.currentTaskId).toBeNull();
    expect(state.owner.minutesWorked).toBe(0);
  });

  it('is the admin s when there is no salesman, and the owner s when there is neither', () => {
    const withAdmin = atEleven();
    const admin = officeManOn(withAdmin, 'officeAdmin', 'Ann');
    const call = createTask(withAdmin, {
      kind: 'clientCall',
      label: 'A client is on the phone',
      minutes: 15,
    });
    expect(call.doneBy).toBe(admin.id);

    const empty = atEleven();
    const alone = createTask(empty, {
      kind: 'clientCall',
      label: 'A client is on the phone',
      minutes: 15,
    });
    expect(alone.doneBy).toBeNull();
    expect(empty.tasks.some((task) => task.id === alone.id)).toBe(true);
  });

  it('is not handed out in the middle of the dinner hour', () => {
    // The day's own pass leaves the break out, and so does this one: nobody is sent at a job of work
    // in the middle of his dinner (CLAUDE.md T6 3.4, T21 2.5.3).
    const state = atEleven();
    const admin = officeManOn(state, 'officeAdmin', 'Ann');
    state.clock.minute = BREAK_START_MINUTE + 10;
    const call = createTask(state, {
      kind: 'clientCall',
      label: 'A client is on the phone',
      minutes: 15,
    });
    expect(call.doneBy).toBeNull();
    expect(admin.taskId).toBeNull();
  });
});
