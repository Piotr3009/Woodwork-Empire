// The meeting a big job starts with, and the office admin who covers for the specialists the
// company has not taken on (CLAUDE.md T7 3.11 and 3.12).

import { describe, expect, it } from 'vitest';
import {
  ADMIN_COVER_RATE,
  CLIENT_CALL_ANSWER_MINUTES,
  CLIENT_MEETING_MINUTES,
  MATERIAL_ORDER_MINUTES_LOW,
  MEETING_PRICE_THRESHOLD,
  MEETING_SALESMAN_REPUTATION,
} from '../../src/engine/constants';
import {
  lifecycleSteps,
  meetingOutstanding,
  needsMeeting,
  startProductionCheck,
} from '../../src/engine/jobs';
import { startTaskCheck } from '../../src/engine/tasks';
import { tick } from '../../src/engine/index';
import type { GameState, Worker, WorkerRole } from '../../src/engine/index';
import {
  acceptNow,
  buyStartingKit,
  clearEvents,
  doTask,
  fillRack,
  firstJob,
  newGame,
  placeEnquiry,
} from '../helpers';

/** An Easy game with the day 1 kit, a clean board and a job of this price on the books. */
function jobOf(price: number, extra: Partial<GameState> = {}): GameState {
  let state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
  state.enquiries = [];
  Object.assign(state, extra);
  // Shelves, so the drawing is half an hour and the day has room for what the test is about.
  const enquiry = placeEnquiry(state, { price, deadlineDays: 90 });
  state = acceptNow(state, enquiry.id, false);
  // Ordered per job: the clerk and the admin are what these tests are about.
  return state;
}

/** A job of this price with nothing else on anybody's desk, so who picks a thing up is the only
 *  question the test is asking. */
function onlyJobOf(price: number, extra: Partial<GameState> = {}): GameState {
  const state = jobOf(price, extra);
  state.tasks = state.tasks.filter(
    (task) => task.kind !== 'bookkeeping' && task.kind !== 'dailyOrdering' && task.kind !== 'emails',
  );
  return state;
}

/** Runs the clock a minute at a time, answering whatever the day throws up with its first
 *  choice, so a break in the middle does not stop the run. */
function run(state: GameState, minutes: number): GameState {
  let next = clearEvents(state);
  for (let minute = 0; minute < minutes; minute += 1) next = clearEvents(tick(next, 1));
  return next;
}

function staff(role: WorkerRole, id: string): Worker {
  return {
    id,
    name: id,
    role,
    tier: null,
    rate: 0,
    weeklyWage: 0,
    monthlyWage: 1900,
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
    anchorX: 1,
    anchorY: 1,
  };
}

describe('the meeting a big job starts with', () => {
  it('lands on a job over twenty thousand and on nothing under it', () => {
    expect(MEETING_PRICE_THRESHOLD).toBe(20000);
    expect(needsMeeting(25000)).toBe(true);
    expect(needsMeeting(20000)).toBe(false);
    const small = jobOf(15000);
    expect(small.tasks.some((task) => task.kind === 'clientMeeting')).toBe(false);
    const big = jobOf(25000);
    const meeting = big.tasks.find((task) => task.kind === 'clientMeeting');
    expect(meeting?.minutesTotal).toBe(CLIENT_MEETING_MINUTES);
    expect(meeting?.label).toContain('Client meeting');
    expect(meeting?.category).toBe('admin');
  });

  it('blocks the drawing until it is held, and says so on the job card', () => {
    let state = jobOf(25000);
    const job = firstJob(state);
    expect(meetingOutstanding(state, job)).toBe(true);
    const design = state.tasks.find((task) => task.kind === 'design');
    expect(startTaskCheck(state, design?.id ?? '')).toEqual({
      ok: false,
      reason: 'The client meeting comes first',
      blockingTaskId: null,
    });
    // The five step row is six for this job, and the meeting is the step in hand.
    const steps = lifecycleSteps(state, job);
    expect(steps.map((step) => step.label)).toEqual([
      'Meeting',
      'Calls',
      'Design',
      'Material',
      'Delivery',
      'Production',
    ]);
    expect(steps[0]?.state).toBe('now');
    expect(startProductionCheck(state, job).reason).toBe('meeting not held');
    // Four hours at the client's, and then the drawing is his to start.
    state = doTask(state, 'clientMeeting');
    expect(state.owner.minutesByCategory.admin).toBe(CLIENT_MEETING_MINUTES);
    expect(meetingOutstanding(state, firstJob(state))).toBe(false);
    expect(startTaskCheck(state, design?.id ?? '').ok).toBe(true);
    expect(startProductionCheck(state, firstJob(state)).reason).toBe('design not done');
    expect(lifecycleSteps(state, firstJob(state))[0]?.state).toBe('done');
  });

  it('leaves a small job with its five steps and no meeting in the way', () => {
    const state = jobOf(15000);
    const steps = lifecycleSteps(state, firstJob(state));
    expect(steps).toHaveLength(5);
    expect(steps.map((step) => step.label)).not.toContain('Meeting');
    expect(startProductionCheck(state, firstJob(state)).reason).toBe('design not done');
  });

  it('goes to the salesman at a reputation of forty, and not at thirty nine', () => {
    const under = jobOf(25000, { reputation: MEETING_SALESMAN_REPUTATION - 1 });
    under.workers.push(staff('salesman', 'sales-1'));
    const held = clearEvents(tick(under, 1));
    expect(held.tasks.find((task) => task.kind === 'clientMeeting')?.doneBy).toBeNull();
    const over = onlyJobOf(25000, { reputation: MEETING_SALESMAN_REPUTATION });
    over.workers.push(staff('salesman', 'sales-1'));
    const sent = clearEvents(tick(over, 1));
    expect(sent.tasks.find((task) => task.kind === 'clientMeeting')?.doneBy).toBe('sales-1');
    // And it is his day it comes out of, not the owner's. The hour of dinner is in the middle of
    // it, and he takes his like everybody else (CLAUDE.md T6 3.4).
    const worked = run(sent, CLIENT_MEETING_MINUTES + 90);
    expect(worked.tasks.find((task) => task.kind === 'clientMeeting')?.done).toBe(true);
    expect(worked.workers[0]?.minutesWorked).toBe(CLIENT_MEETING_MINUTES);
    expect(worked.owner.minutesByCategory.admin).toBe(0);
  });
});

describe('the office admin covering for a specialist', () => {
  function withCall(state: GameState): GameState {
    const job = firstJob(state);
    job.calls = [{ day: 1, minute: 1, state: 'waiting', retry: false }];
    return state;
  }

  it('takes a client call in thirty minutes of his own day and none of the owner', () => {
    let state = withCall(onlyJobOf(4000));
    state.workers.push(staff('officeAdmin', 'admin-1'));
    state = clearEvents(tick(state, 2));
    const call = state.tasks.find((task) => task.kind === 'clientCall');
    expect(call?.doneBy).toBe('admin-1');
    expect(call?.minutesTotal).toBe(CLIENT_CALL_ANSWER_MINUTES);
    // Fifteen minutes of work at half the speed is thirty minutes of his day.
    const done = run(state, CLIENT_CALL_ANSWER_MINUTES / ADMIN_COVER_RATE);
    expect(done.tasks.find((task) => task.kind === 'clientCall')?.done).toBe(true);
    expect(done.workers[0]?.minutesWorked).toBe(CLIENT_CALL_ANSWER_MINUTES / ADMIN_COVER_RATE);
    expect(done.owner.minutesByCategory.admin).toBe(0);
  });

  it('hands the next call to the salesman the day he is taken on', () => {
    let state = withCall(onlyJobOf(4000));
    state.workers.push(staff('officeAdmin', 'admin-1'));
    state.workers.push(staff('salesman', 'sales-1'));
    state = clearEvents(tick(state, 2));
    expect(state.tasks.find((task) => task.kind === 'clientCall')?.doneBy).toBe('sales-1');
    // And he does it in the fifteen minutes it is worth, not in thirty.
    const done = run(state, CLIENT_CALL_ANSWER_MINUTES);
    expect(done.tasks.find((task) => task.kind === 'clientCall')?.done).toBe(true);
    expect(done.workers[1]?.minutesWorked).toBe(CLIENT_CALL_ANSWER_MINUTES);
  });

  it('leaves the material take off to the owner: it is not office work she covers', () => {
    // The take off is the estimator's job, and the owner's until one is hired (CLAUDE.md T13 3.8).
    let state = onlyJobOf(4000);
    state.workers.push(staff('officeAdmin', 'admin-1'));
    state = doTask(state, 'design');
    const takeOff = state.tasks.find((task) => task.kind === 'materialTakeOff');
    expect(takeOff?.minutesTotal).toBe(MATERIAL_ORDER_MINUTES_LOW);
    const worked = run(state, 60);
    const later = worked.tasks.find((task) => task.kind === 'materialTakeOff');
    expect(later?.doneBy).toBeNull();
    expect(later?.done).toBe(false);
    expect(startTaskCheck(worked, later?.id ?? '').ok).toBe(true);
  });

  it('gives the take off to the estimator the day he is taken on', () => {
    let state = onlyJobOf(4000);
    state.workers.push(staff('officeAdmin', 'admin-1'));
    state.workers.push(staff('estimator', 'est-1'));
    state = doTask(state, 'design');
    state = clearEvents(tick(state, 1));
    const takeOff = state.tasks.find((task) => task.kind === 'materialTakeOff');
    expect(takeOff?.doneBy).toBe('est-1');
  });
});
