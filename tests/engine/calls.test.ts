// The client rings while the work goes on. Calls are not a gate any more: they interrupt, they
// cost minutes, and letting them ring costs the job (CLAUDE.md T4 3.3).

import { describe, expect, it } from 'vitest';
import { callsForPrice, callsScheduled, callsTaken, penalisedMisses } from '../../src/engine/calls';
import { callsLine, jobRow } from '../../src/ui/jobCard';
import { nextWorkingDay } from '../../src/engine/clock';
import { CALL_MISSES_FREE, MINUTES_PER_WORKING_DAY } from '../../src/engine/constants';
import { applyRating, callRatingFactor, ratingFor } from '../../src/engine/reputation';
import { startProductionCheck } from '../../src/engine/jobs';
import { isWorkingDay, tick } from '../../src/engine/index';
import type { GameState, Job } from '../../src/engine/index';
import {
  act,
  buyStartingKit,
  choose,
  clearEvents,
  doAllEmails,
  doTask,
  fillRack,
  firstJob,
  hireNow,
  newGame,
  placeEnquiry,
  runToStage,
} from '../helpers';

/** A game on day 1 with one 400 job on the books and the rack full. */
function withJob(price = 400): GameState {
  let state = fillRack(buyStartingKit(newGame()));
  state.enquiries = [];
  const enquiry = placeEnquiry(state, { price, name: 'Garage shelves' });
  state = act(state, { type: 'ACCEPT_ENQUIRY', enquiryId: enquiry.id, byHand: false });
  // Ordered per job, so the material order is on the desk for the calls to be measured against.
  for (const job of state.jobs) job.materialMode = 'perJob';
  return clearEvents(state);
}

/** What the engine actually rates an on time job once this many calls have rung out. */
function ratingWith(missed: number): number {
  const state = withJob();
  const job = firstJob(state);
  job.callsMissed = missed;
  job.daysLate = 0;
  job.emailsUnanswered = 0;
  applyRating(state, job);
  return job.rating ?? 0;
}

/** Makes the client ring this minute, and runs the one minute that puts him through. */
function ring(state: GameState, index = 0): GameState {
  const job = firstJob(state);
  const call = job.calls[index];
  if (!call) throw new Error('no call in the diary');
  call.day = state.clock.day;
  call.minute = state.clock.minute;
  call.state = 'waiting';
  return tick(state, 1);
}

describe('the diary of calls', () => {
  it('puts the calls on working minutes across the span, and nothing on the desk', () => {
    const state = withJob();
    const job = firstJob(state);
    expect(job.calls).toHaveLength(callsForPrice(400));
    expect(callsScheduled(job)).toBe(2);
    expect(state.tasks.some((task) => task.kind === 'clientCall')).toBe(false);
    for (const call of job.calls) {
      expect(isWorkingDay(call.day)).toBe(true);
      expect(call.day).toBeGreaterThanOrEqual(job.acceptedDay);
      expect(call.day).toBeLessThanOrEqual(job.dueDay);
      expect(call.minute).toBeGreaterThanOrEqual(0);
      expect(call.minute).toBeLessThan(MINUTES_PER_WORKING_DAY);
      expect(call.state).toBe('waiting');
    }
  });

  it('rings at the same minutes for the same seed, and at other minutes for another', () => {
    const same = [withJob(), withJob()].map((state) => JSON.stringify(firstJob(state).calls));
    expect(same[0]).toBe(same[1]);
    let other = fillRack(buyStartingKit(newGame({ seed: 777 })));
    other.enquiries = [];
    const enquiry = placeEnquiry(other, { price: 400, name: 'Garage shelves' });
    other = clearEvents(act(other, { type: 'ACCEPT_ENQUIRY', enquiryId: enquiry.id, byHand: false }));
    expect(JSON.stringify(firstJob(other).calls)).not.toBe(same[0]);
  });
});

describe('a call in the middle of the work', () => {
  it('never blocks the start of production, whether it was taken or not', () => {
    let state = withJob();
    // Not one call has been taken, and the only thing in the way is the drawing.
    expect(callsTaken(firstJob(state))).toBe(0);
    expect(startProductionCheck(state, firstJob(state)).reason).toBe('design not done');
    state = doTask(state, 'design');
    state = doTask(state, 'materialOrder');
    const job = firstJob(state);
    job.stage = 'ready';
    expect(callsTaken(job)).toBe(0);
    expect(startProductionCheck(state, job)).toEqual({ ok: true, reason: '' });
  });

  it('stops the clock, and answering it costs fifteen minutes off what he was on', () => {
    let state = withJob();
    const design = state.tasks.find((task) => task.kind === 'design');
    if (!design) throw new Error('no design task');
    state = act(state, { type: 'START_TASK', taskId: design.id });
    const before = state.tasks.find((task) => task.id === design.id)?.minutesRemaining ?? 0;
    state = ring(state);
    expect(state.activeEvent?.kind).toBe('clientCall');
    expect(state.activeEvent?.title).toBe('Client calling: Garage shelves');
    state = choose(state, 'answer');
    const call = state.tasks.find((task) => task.kind === 'clientCall');
    expect(call?.minutesTotal).toBe(15);
    expect(state.owner.currentTaskId).toBe(call?.id);
    expect(state.owner.resumeTaskId).toBe(design.id);
    state = tick(state, 15);
    // The phone is down and he is back on the drawing, fifteen minutes worse off.
    expect(state.tasks.find((task) => task.id === call?.id)?.done).toBe(true);
    expect(state.owner.currentTaskId).toBe(design.id);
    expect(state.owner.resumeTaskId).toBeNull();
    const after = state.tasks.find((task) => task.id === design.id)?.minutesRemaining ?? 0;
    expect(before - after).toBeLessThan(before);
    expect(callsTaken(firstJob(state))).toBe(1);
  });

  it('takes the owner off the bench for the call and puts him back on it', () => {
    let state = withJob();
    const job = firstJob(state);
    job.stage = 'ready';
    state = act(state, { type: 'WORK_HERE', jobId: job.id });
    expect(firstJob(state).stage).toBe('inProduction');
    state = ring(state);
    const left = firstJob(state).labourRemaining;
    state = choose(state, 'answer');
    state = tick(state, 5);
    // He is on the phone, so nothing is being made.
    expect(firstJob(state).labourRemaining).toBe(left);
    state = tick(state, 20);
    expect(state.owner.currentTaskId).toBeNull();
    expect(firstJob(state).labourRemaining).toBeLessThan(left);
  });
});

describe('letting it ring', () => {
  it('costs nothing but a note the first time, and the client tries again tomorrow', () => {
    let state = withJob();
    const scheduled = firstJob(state).calls.length;
    state = choose(ring(state), 'ignore');
    const job = firstJob(state);
    expect(job.callsMissed).toBe(1);
    expect(callRatingFactor(job.callsMissed)).toBe(1);
    expect(CALL_MISSES_FREE).toBe(1);
    // The second attempt is in the diary and is not a call of its own.
    expect(job.calls).toHaveLength(scheduled + 1);
    const retry = job.calls[job.calls.length - 1];
    expect(retry?.retry).toBe(true);
    // One working day later, not the same day and not a week on (CLAUDE.md T4 3.3).
    expect(retry?.day).toBe(nextWorkingDay(state.clock.day));
    expect(retry?.state).toBe('waiting');
    expect(callsScheduled(job)).toBe(scheduled);
    expect(startProductionCheck(state, job).reason).toBe('design not done');
  });

  it('costs the satisfaction and a point of rating from the second miss on', () => {
    let state = withJob();
    state = choose(ring(state), 'ignore');
    state = choose(ring(state, firstJob(state).calls.length - 1), 'ignore');
    const job = firstJob(state);
    expect(job.callsMissed).toBe(2);
    // A point and a tenth for each miss from the second on, not a flat penalty.
    expect(callRatingFactor(1)).toBe(1);
    expect(callRatingFactor(2)).toBeCloseTo(0.9, 10);
    expect(callRatingFactor(3)).toBeCloseTo(0.8, 10);
    expect(callRatingFactor(4)).toBeCloseTo(0.7, 10);
    expect(penalisedMisses(1)).toBe(0);
    expect(penalisedMisses(3)).toBe(2);
    // Three points on time, a tenth off per costing miss, then a point off per costing miss.
    expect(ratingWith(1)).toBe(3);
    expect(ratingWith(2)).toBe(1.7);
    expect(ratingWith(3)).toBe(0.4);
    expect(ratingWith(4)).toBe(-0.9);
    // On time, not express, every email answered: three points, a tenth off for the miss, then
    // a point off for it.
    state = doAllEmails(state);
    state = doTask(state, 'design');
    state = doTask(state, 'materialOrder');
    const ready = firstJob(state);
    ready.stage = 'ready';
    expect(ratingFor(ready)).toBe(3);
    state = act(state, { type: 'WORK_HERE', jobId: ready.id });
    state = runToStage(state, 'completed');
    const paid = firstJob(state);
    expect(paid.stage).toBe('completed');
    expect(paid.daysLate).toBe(0);
    expect(paid.rating).toBeCloseTo(3 * 0.9 - 1, 10);
  });

  it('counts a second attempt that rings out as the second miss', () => {
    let state = withJob();
    state = choose(ring(state), 'ignore');
    const retry = firstJob(state).calls.length - 1;
    state = choose(ring(state, retry), 'ignore');
    const job = firstJob(state);
    expect(job.callsMissed).toBe(2);
    // A call that has already tried twice does not try a third time.
    expect(job.calls.filter((call) => call.retry)).toHaveLength(1);
  });

  it('says on the job card how many were taken and how many rang out', () => {
    let state = withJob(2000);
    expect(callsScheduled(firstJob(state))).toBe(3);
    state = choose(ring(state), 'answer');
    state = tick(state, 15);
    state = choose(ring(state, 1), 'ignore');
    const job: Job = firstJob(state);
    expect(callsTaken(job)).toBe(1);
    expect(job.callsMissed).toBe(1);
    // The words CLAUDE.md T4 3.3 asks for, on the card the player reads.
    expect(callsLine(job)).toContain('Calls: 1 of 3 taken, 1 missed');
    expect(jobRow(state, job)).toContain('Calls: 1 of 3 taken, 1 missed');
    // Nothing missed, nothing said about missing.
    const clean = withJob(2000);
    expect(callsLine(firstJob(clean))).toContain('Calls: 0 of 3 taken');
    expect(callsLine(firstJob(clean))).not.toContain('missed');
  });
});

describe('the phone and what it interrupted', () => {
  it('does not send him back to a task an earlier interruption had left behind', () => {
    let state = withJob(2000);
    const books = state.tasks.find((task) => task.kind === 'bookkeeping');
    if (!books) throw new Error('no bookkeeping');
    state = act(state, { type: 'START_TASK', taskId: books.id });
    // The first call takes him off the books and puts him back on them.
    state = choose(ring(state), 'answer');
    expect(state.owner.resumeTaskId).toBe(books.id);
    state = tick(state, 15);
    expect(state.owner.currentTaskId).toBe(books.id);
    // He puts the books down himself, and a second call finds him holding nothing.
    state = act(state, { type: 'PAUSE_TASK' });
    expect(state.owner.currentTaskId).toBeNull();
    state = choose(ring(state, 1), 'answer');
    expect(state.owner.resumeTaskId).toBeNull();
    state = tick(state, 15);
    // The phone is down and he is standing idle, not back on the books he put down.
    expect(state.owner.currentTaskId).toBeNull();
  });

  it('rings one client at a time, so the work under the call is not lost', () => {
    let state = withJob(2000);
    const books = state.tasks.find((task) => task.kind === 'bookkeeping');
    if (!books) throw new Error('no bookkeeping');
    state = act(state, { type: 'START_TASK', taskId: books.id });
    state = choose(ring(state), 'answer');
    expect(state.owner.resumeTaskId).toBe(books.id);
    // A second client is due this minute. He is on the phone, so it waits.
    const second = firstJob(state).calls[1];
    if (!second) throw new Error('no second call');
    second.day = state.clock.day;
    second.minute = state.clock.minute;
    state = tick(state, 5);
    expect(state.activeEvent).toBeNull();
    expect(state.owner.resumeTaskId).toBe(books.id);
    state = tick(state, 10);
    // First call over, back on the books, and now the second client gets through.
    expect(state.owner.currentTaskId).toBe(books.id);
    state = tick(state, 1);
    expect(state.activeEvent?.kind).toBe('clientCall');
    state = choose(state, 'answer');
    expect(state.owner.resumeTaskId).toBe(books.id);
    state = tick(state, 15);
    expect(state.owner.currentTaskId).toBe(books.id);
    expect(callsTaken(firstJob(state))).toBe(2);
  });
});

describe('a salesman on the books', () => {
  it('takes every call himself, and the owner is never asked', () => {
    let state = withJob();
    state.reputation = 20;
    // The office admin comes first, and the salesman behind her (CLAUDE.md T10 3.6).
    state = hireNow(hireNow(state, 'officeAdmin', null), 'salesman', null);
    const salesman = state.workers.find((worker) => worker.role === 'salesman');
    if (!salesman) throw new Error('nobody was hired');
    for (const worker of state.workers) worker.startDay = state.clock.day;
    const design = state.tasks.find((task) => task.kind === 'design');
    if (!design) throw new Error('no design task');
    state = act(state, { type: 'START_TASK', taskId: design.id });
    state = ring(state);
    // No decision, and the owner is still drawing.
    expect(state.activeEvent).toBeNull();
    expect(state.owner.currentTaskId).toBe(design.id);
    expect(callsTaken(firstJob(state))).toBe(1);
    const call = state.tasks.find((task) => task.kind === 'clientCall');
    expect(call?.doneBy).toBe(salesman.id);
    state = tick(state, 15);
    expect(state.tasks.find((task) => task.kind === 'clientCall')?.done).toBe(true);
    expect(firstJob(state).callsMissed).toBe(0);
  });

  it('leaves the call to the owner once his day is too short to see it out', () => {
    let state = withJob();
    state.reputation = 20;
    // The office admin comes first, and the salesman behind her (CLAUDE.md T10 3.6).
    state = hireNow(hireNow(state, 'officeAdmin', null), 'salesman', null);
    const salesman = state.workers.find((worker) => worker.role === 'salesman');
    if (!salesman) throw new Error('nobody was hired');
    for (const worker of state.workers) worker.startDay = state.clock.day;
    // Ten minutes of his day left is not enough for a fifteen minute call, and the admin behind
    // him has no day left at all to cover it with (CLAUDE.md T7 3.12, T10 3.6).
    salesman.minutesWorked = MINUTES_PER_WORKING_DAY - 10;
    for (const worker of state.workers) {
      if (worker.role === 'officeAdmin') worker.minutesWorked = MINUTES_PER_WORKING_DAY;
    }
    state = ring(state);
    expect(state.activeEvent?.kind).toBe('clientCall');
    expect(state.tasks.some((task) => task.kind === 'clientCall')).toBe(false);
  });
});
