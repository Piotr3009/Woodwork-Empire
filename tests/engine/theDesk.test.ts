// The desk stops nagging (PIOTR, 16.09; CLAUDE.md T17 2.14 to 2.19). What somebody started is
// still his in the morning; calls and emails die at dusk and nothing carries over; the player can
// tick several jobs of work and have them done one after another; and a new day starts at x1.

import { describe, expect, it } from 'vitest';
import { DAY_END_MINUTE } from '../../src/engine/constants';
import { createTask, findTask } from '../../src/engine/tasks';
import { deliverJob } from '../../src/engine/jobs';
import type { GameState } from '../../src/engine/index';
import {
  acceptNow,
  act,
  buyStartingKit,
  clearEvents,
  doAllEmails,
  fillRack,
  hireNow,
  newGame,
  placeEnquiry,
  runClock,
  withLicence,
} from '../helpers';

/** A hall with a licence, a job on the books and the day running. */
function withJob(): GameState {
  const state = withLicence(fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' }))));
  state.enquiries = [];
  const enquiry = placeEnquiry(state, { price: 4000, deadlineDays: 30 });
  return clearEvents(acceptNow(state, enquiry.id));
}

/** The clock to five, answering whatever the day throws up. */
function toFive(state: GameState): GameState {
  let next = state;
  let guard = 0;
  while (next.clock.minute < DAY_END_MINUTE && guard < 40) {
    next = clearEvents(runClock(next, 30));
    guard += 1;
  }
  return next;
}

describe('a task somebody started', () => {
  it('is the same man’s in the morning, and he carries on with it', () => {
    let state = withJob();
    // A whole day of drawing, so the evening comes before the end of it.
    const design = createTask(state, { kind: 'design', label: 'Wardrobe drawing', minutes: 600 });
    state = act(state, { type: 'START_TASK', taskId: design.id });
    state = clearEvents(runClock(state, 30));
    const left = findTask(state, design.id)?.minutesRemaining ?? 0;
    expect(left).toBeGreaterThan(0);
    // He goes home with it half drawn.
    const tomorrow = clearEvents(act(toFive(state), { type: 'END_DAY' }));
    expect(tomorrow.clock.day).toBeGreaterThan(state.clock.day);
    const carried = findTask(tomorrow, design.id);
    expect(carried?.done).toBe(false);
    expect(carried?.minutesRemaining).toBeLessThanOrEqual(left);
    // Nobody had to give it to him again: it is in his hands at 08:00.
    expect(carried?.doneBy).toBe('owner');
    expect(tomorrow.owner.currentTaskId).toBe(design.id);
  });

  it('stays with the man of the office who started it, and is not passed round by rank', () => {
    const hall = withJob();
    hall.reputation = 20;
    let state = hireNow(hall, 'officeAdmin', null);
    const admin = state.workers.find((worker) => worker.role === 'officeAdmin');
    if (!admin) throw new Error('no admin');
    admin.startDay = state.clock.day;
    state = clearEvents(runClock(state, 5));
    const his = state.tasks.find((task) => task.doneBy === admin.id && !task.done);
    if (!his) throw new Error('the admin took nothing on');
    expect(his.minutesRemaining).toBeLessThan(his.minutesTotal);
    // He is taken off it, the way his day running out takes him off it: it is still his, and
    // nobody else is given it (CLAUDE.md T17 2.14).
    const held = state.workers.find((worker) => worker.id === admin.id);
    if (held) held.taskId = null;
    const back = clearEvents(runClock(state, 1));
    expect(findTask(back, his.id)?.doneBy).toBe(admin.id);
    expect(back.workers.find((worker) => worker.id === admin.id)?.taskId).toBe(his.id);
  });
});

describe('calls and emails', () => {
  it('die at dusk, done or not, and carry nothing over', () => {
    const state = toFive(withJob());
    expect(state.tasks.some((task) => task.kind === 'emails' && !task.done)).toBe(true);
    const tomorrow = clearEvents(act(state, { type: 'END_DAY' }));
    expect(tomorrow.tasks.some((task) => task.kind === 'emails' && !task.done)).toBe(false);
    expect(tomorrow.tasks.some((task) => task.kind === 'clientCall' && !task.done)).toBe(false);
    // A drawing with minutes left is still there, with the man who started it on it.
    expect(tomorrow.tasks.some((task) => task.kind === 'design' && !task.done)).toBe(true);
  });

  it('still cost the client his patience: the penalty lands at delivery', () => {
    const state = toFive(withJob());
    const open = state.tasks.filter((task) => task.kind === 'emails' && !task.done).length;
    expect(open).toBeGreaterThan(0);
    const tomorrow = clearEvents(act(state, { type: 'END_DAY' }));
    const job = tomorrow.jobs[0];
    if (!job) throw new Error('no job');
    // The dropped ones are counted onto the job as they are dropped.
    expect(job.emailsUnanswered).toBe(open);
    const delivered = { ...tomorrow, jobs: tomorrow.jobs.map((entry) => ({ ...entry })) };
    const ready = delivered.jobs[0];
    if (!ready) throw new Error('no job');
    ready.stage = 'awaitingTransport';
    deliverJob(delivered, ready);
    expect(ready.emailsUnanswered).toBe(open);
    expect(ready.penalty).toBeGreaterThan(0);
  });

  it('are answered in the day when the owner does them, and then cost nothing', () => {
    const state = doAllEmails(withJob());
    expect(state.tasks.some((task) => task.kind === 'emails' && !task.done)).toBe(false);
    const tomorrow = clearEvents(act(toFive(state), { type: 'END_DAY' }));
    expect(tomorrow.jobs[0]?.emailsUnanswered).toBe(0);
  });
});

describe('several jobs of work at once', () => {
  it('are done one after another, in the order they were ticked', () => {
    const state = withJob();
    const books = state.tasks.find((task) => task.kind === 'bookkeeping');
    const ordering = state.tasks.find((task) => task.kind === 'dailyOrdering');
    if (!books || !ordering) throw new Error('the daily chores are wanted here');
    const queued = act(state, { type: 'QUEUE_TASKS', taskIds: [ordering.id, books.id] });
    // The first one he ticked is in his hands at once, and the other is waiting.
    expect(queued.owner.currentTaskId).toBe(ordering.id);
    expect(queued.taskQueue).toEqual([ordering.id, books.id]);
    const later = clearEvents(runClock(queued, 120));
    expect(findTask(later, ordering.id)?.done).toBe(true);
    // The next one started itself when the first was finished.
    expect(later.owner.currentTaskId === books.id || findTask(later, books.id)?.done === true).toBe(
      true,
    );
  });
});

describe('the laptop', () => {
  it('boots once a day, however often it is opened and whatever takes him off the boot', () => {
    const state = withJob();
    const first = act(state, { type: 'BOOT_LAPTOP' });
    expect(first.laptopBootedOnDay).toBe(first.clock.day);
    const boot = first.tasks.find((task) => task.kind === 'booting');
    expect(boot).toBeDefined();
    // He puts it down before the five minutes are up and opens the lid again.
    const put = act(first, { type: 'PAUSE_TASK' });
    const again = act(put, { type: 'BOOT_LAPTOP' });
    expect(again.tasks.filter((task) => task.kind === 'booting')).toHaveLength(1);
    // And the orphan does not survive the night to be started for a second five minutes.
    const tomorrow = clearEvents(act(toFive(again), { type: 'END_DAY' }));
    expect(tomorrow.tasks.some((task) => task.kind === 'booting')).toBe(false);
    expect(tomorrow.laptopBootedOnDay).toBeLessThan(tomorrow.clock.day);
  });
});

describe('the speed', () => {
  it('comes home to x1 at the start of every new day', () => {
    let state = act(withJob(), { type: 'SET_SPEED', speed: 30 });
    expect(state.speed).toBe(30);
    state = clearEvents(act(toFive(state), { type: 'END_DAY' }));
    expect(state.speed).toBe(1);
  });
});
