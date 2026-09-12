import { describe, expect, it } from 'vitest';
import {
  BOOKKEEPING_MINUTES,
  CLERK_ORDERS_PER_DAY,
  JOINER_PREREQUISITES,
  LABOUR_FRACTION,
  MINUTES_PER_WORKING_DAY,
  OVER_SAW_RATIO_FACTOR,
  OWNER_LABOUR_PER_MINUTE,
  WORKER_RATES,
} from '../../src/engine/constants';
import {
  availableJoiners,
  canHire,
  hasWorkingDay,
  hiringOptions,
  isWorkingToday,
  joiners,
  missingForHire,
  sawRatioFactor,
  staffMinutesLeft,
} from '../../src/engine/staff';
import { createTask } from '../../src/engine/tasks';
import { minutesRemainingFor, ownerJob } from '../../src/engine/jobs';
import { weeklyWageBill } from '../../src/engine/economy';
import { tick } from '../../src/engine/index';
import type { GameState, Worker } from '../../src/engine/index';
import {
  act,
  buyStartingKit,
  clearEvents,
  fillRack,
  firstJob,
  newGame,
  placeEnquiry,
  runToDay,
} from '../helpers';

/** Buys exactly what the engine says is missing for one more joiner. */
function withJoinerKit(state: GameState): GameState {
  let next = state;
  for (const specId of missingForHire(next, 'joiner')) {
    next = act(next, { type: 'BUY_EQUIPMENT', specId });
  }
  return next;
}

/** Kits out and hires `count` joiners of one tier. */
function withCrew(state: GameState, count: number, tier: Worker['tier']): GameState {
  let next = state;
  for (let index = 0; index < count; index += 1) {
    next = withJoinerKit(next);
    next = act(next, { type: 'HIRE', role: 'joiner', tier });
  }
  return next;
}

describe('the hiring pool', () => {
  it('opens up as the reputation rises', () => {
    const state = newGame();
    const byLabel = (reputation: number): string[] =>
      hiringOptions({ ...state, reputation })
        .filter((option) => option.blockReason.startsWith('Nobody'))
        .map((option) => option.label);
    expect(byLabel(-50)).toContain('Office admin');
    expect(byLabel(-50)).not.toContain('Joiner, poor');
    expect(byLabel(-50)).not.toContain('Helper');
    expect(byLabel(0)).toContain('Joiner, normal');
    expect(byLabel(5)).not.toContain('Office admin');
    expect(byLabel(10)).not.toContain('Joiner, normal');
    expect(byLabel(10)).toContain('Joiner, super');
    expect(byLabel(15)).not.toContain('Salesman');
    expect(byLabel(40)).toHaveLength(0);
  });

  it('names what has to be bought before a joiner can start', () => {
    const state = newGame();
    expect(missingForHire(state, 'joiner')).toEqual(JOINER_PREREQUISITES);
    const option = hiringOptions(state).find((entry) => entry.tier === 'poor');
    expect(option?.available).toBe(false);
    expect(option?.missingCost).toBe(250 + 80 + 40 + 400);
    expect(option?.blockReason).toContain('Workbench');
  });

  it('blocks the hire while the kit is missing and lets it through once it is there', () => {
    let state = buyStartingKit(newGame());
    expect(canHire(state, 'joiner', 'poor').ok).toBe(false);
    state = act(state, { type: 'HIRE', role: 'joiner', tier: 'poor' });
    expect(state.workers).toHaveLength(0);
    state = withJoinerKit(state);
    expect(canHire(state, 'joiner', 'poor').ok).toBe(true);
    state = act(state, { type: 'HIRE', role: 'joiner', tier: 'poor' });
    expect(state.workers).toHaveLength(1);
    expect(state.workers[0]?.rate).toBe(WORKER_RATES.poor);
    expect(state.workers[0]?.weeklyWage).toBe(480);
  });

  it('needs a second set of everything for a second joiner', () => {
    let state = withCrew(buyStartingKit(newGame()), 1, 'poor');
    expect(canHire(state, 'joiner', 'poor').ok).toBe(false);
    expect(missingForHire(state, 'joiner')).toEqual(JOINER_PREREQUISITES);
    state = withJoinerKit(state);
    expect(canHire(state, 'joiner', 'poor').ok).toBe(true);
  });

  it('stops at the bench slots of the unit', () => {
    const state = withCrew(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 6, 'poor');
    expect(joiners(state)).toHaveLength(6);
    const option = hiringOptions(state).find((entry) => entry.tier === 'poor');
    expect(option?.blockReason).toContain('bench slot');
  });

  it('starts the new man the next working day and pays him weekly', () => {
    const state = withCrew(buyStartingKit(newGame()), 1, 'poor');
    expect(state.workers[0]?.startDay).toBe(2);
    expect(availableJoiners(state)).toHaveLength(0);
    const day2 = runToDay(state, 2).state;
    expect(availableJoiners(day2)).toHaveLength(1);
    expect(weeklyWageBill(day2)).toBe(480);
  });

  it('gives everyone a different name', () => {
    const state = withCrew(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 4, 'poor');
    const names = state.workers.map((worker) => worker.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('hires office staff without any bench kit', () => {
    let state = newGame();
    state.reputation = 15;
    state = act(state, { type: 'HIRE', role: 'salesman', tier: null });
    expect(state.workers[0]?.role).toBe('salesman');
    expect(state.workers[0]?.monthlyWage).toBe(2200);
  });
});

function jobReadyWith(price: number, tier: Worker['tier']): GameState {
  let state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
  state.reputation = 40;
  state = withCrew(state, 1, tier);
  const enquiry = placeEnquiry(state, {
    templateId: 'wardrobe',
    name: 'Wardrobe',
    price,
    deadlineDays: 60,
  });
  state = fillRack(act(state, { type: 'ACCEPT_ENQUIRY', enquiryId: enquiry.id, byHand: false }));
  firstJob(state).stage = 'ready';
  return state;
}

describe('joiners at the bench', () => {
  it('takes a poor joiner 13.3 days to make a 6400 wardrobe', () => {
    const state = jobReadyWith(6400, 'poor');
    const job = firstJob(state);
    expect(job.labourValue).toBe(6400 * LABOUR_FRACTION);
    const minutes = minutesRemainingFor(state, job, WORKER_RATES.poor);
    expect(minutes).toBeCloseTo(6400, 6);
    expect(minutes / 480).toBeCloseTo(13.333, 3);
    // The same wardrobe is 8 days for the owner and 10 for a normal joiner (CLAUDE.md 8.5).
    expect(minutesRemainingFor(state, job, 1) / 480).toBeCloseTo(8, 6);
    expect(minutesRemainingFor(state, job, WORKER_RATES.normal) / 480).toBeCloseTo(10, 6);
  });

  it('picks up the oldest ready job on its own', () => {
    const state = runToDay(jobReadyWith(1600, 'poor'), 2).state;
    expect(state.workers[0]?.jobId).toBe(firstJob(state).id);
    expect(firstJob(state).stage).toBe('inProduction');
    const later = tick(state, 100);
    expect(firstJob(later).labourRemaining).toBeLessThan(firstJob(state).labourRemaining);
  });

  it('lets the player take the job off a joiner and put the owner on it', () => {
    let state = runToDay(jobReadyWith(1600, 'poor'), 2).state;
    const jobId = firstJob(state).id;
    state = act(state, { type: 'ASSIGN_JOB', jobId, workerId: 'owner' });
    expect(firstJob(state).assignedTo).toBe('owner');
    expect(ownerJob(state)?.id).toBe(jobId);
    expect(state.workers[0]?.jobId).toBeNull();
  });

  it('produces at the tier rate', () => {
    const state = runToDay(jobReadyWith(1600, 'poor'), 2).state;
    const before = firstJob(state).labourRemaining;
    const after = firstJob(tick(state, 60)).labourRemaining;
    expect(before - after).toBeCloseTo(60 * OWNER_LABOUR_PER_MINUTE * WORKER_RATES.poor, 6);
  });

  it('drops the output of everyone the owner is not there to run', () => {
    let state = runToDay(jobReadyWith(1600, 'poor'), 2).state;
    state = act(state, { type: 'SKIP_DAY' });
    const before = firstJob(state).labourRemaining;
    const after = firstJob(tick(state, 60)).labourRemaining;
    expect(before - after).toBeCloseTo(60 * OWNER_LABOUR_PER_MINUTE * WORKER_RATES.poor * 0.7, 6);
  });
});

describe('the saw ratio', () => {
  it('slows every joiner above one saw per three', () => {
    const state = withCrew(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 4, 'poor');
    const crew = joiners(state);
    expect(crew).toHaveLength(4);
    expect(sawRatioFactor(state, crew[0] as Worker)).toBe(1);
    expect(sawRatioFactor(state, crew[2] as Worker)).toBe(1);
    expect(sawRatioFactor(state, crew[3] as Worker)).toBe(OVER_SAW_RATIO_FACTOR);
    const withSecondSaw = act(state, { type: 'BUY_EQUIPMENT', specId: 'tableSaw' });
    expect(sawRatioFactor(withSecondSaw, crew[3] as Worker)).toBe(1);
  });

  it('shows up in what the fourth joiner produces', () => {
    let state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    state.reputation = 10;
    state = withCrew(state, 4, 'normal');
    for (let index = 0; index < 4; index += 1) {
      const enquiry = placeEnquiry(state, {
        templateId: 'wardrobe',
        name: 'Wardrobe',
        price: 1600 + index * 10,
        deadlineDays: 60,
      });
      state = act(state, { type: 'ACCEPT_ENQUIRY', enquiryId: enquiry.id, byHand: false });
    }
    fillRack(state);
    for (const job of state.jobs) job.stage = 'ready';
    state = clearEvents(runToDay(state, 2).state);
    const assigned = state.jobs.filter((job) => job.stage === 'inProduction');
    expect(assigned).toHaveLength(4);
    const before = state.jobs.map((job) => job.labourRemaining);
    const after = tick(state, 60).jobs.map((job) => job.labourRemaining);
    const done = before.map((value, index) => value - (after[index] ?? 0));
    const full = 60 * OWNER_LABOUR_PER_MINUTE * WORKER_RATES.normal;
    expect(done.filter((value) => Math.abs(value - full) < 1e-6)).toHaveLength(3);
    expect(done.filter((value) => Math.abs(value - full * OVER_SAW_RATIO_FACTOR) < 1e-6)).toHaveLength(1);
  });
});

describe('one path for putting a man on a job', () => {
  it('automatic assignment goes through the same door as the manual one', () => {
    const state = runToDay(jobReadyWith(1600, 'poor'), 2).state;
    const worker = state.workers[0];
    const job = firstJob(state);
    expect(worker?.jobId).toBe(job.id);
    expect(job.assignedTo).toBe(worker?.id);
    expect(job.stage).toBe('inProduction');
    // And putting the owner on it takes the joiner off, whichever way it was assigned.
    const taken = act(state, { type: 'ASSIGN_JOB', jobId: job.id, workerId: 'owner' });
    expect(taken.workers[0]?.jobId).toBeNull();
    expect(firstJob(taken).assignedTo).toBe('owner');
  });

  it('knows who is on the books today', () => {
    const state = withCrew(buyStartingKit(newGame()), 1, 'poor');
    const worker = state.workers[0];
    expect(worker).toBeDefined();
    if (!worker) return;
    expect(isWorkingToday(state, worker)).toBe(false);
    const day2 = runToDay(state, 2).state;
    const started = day2.workers[0];
    expect(started && isWorkingToday(day2, started)).toBe(true);
    if (started) started.absentDaysRemaining = 2;
    expect(started && isWorkingToday(day2, started)).toBe(false);
  });
});

describe('the office working day', () => {
  function officeWorker(id: string, role: 'officeAdmin' | 'purchasingClerk'): Worker {
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
      station: 'idle',
      productionMinutes: 0,
      absentDaysRemaining: 0,
      anchorX: 1,
      anchorY: 1,
    };
  }

  it('gives the three office roles 480 minutes of their own, and nobody else', () => {
    expect(hasWorkingDay('officeAdmin')).toBe(true);
    expect(hasWorkingDay('purchasingClerk')).toBe(true);
    expect(hasWorkingDay('salesman')).toBe(true);
    expect(hasWorkingDay('helper')).toBe(false);
    expect(hasWorkingDay('joiner')).toBe(false);
    expect(staffMinutesLeft(officeWorker('a1', 'officeAdmin'))).toBe(MINUTES_PER_WORKING_DAY);
  });

  it('leaves what the admin could not finish for tomorrow, and lets the owner take it on', () => {
    let state = newGame();
    state.workers.push(officeWorker('a1', 'officeAdmin'));
    state = clearEvents(runToDay(state, 2).state);
    const taken = state.tasks.find((task) => task.kind === 'bookkeeping');
    expect(taken?.doneBy).toBe('a1');
    // Ten minutes of his day left, and the bookkeeping is an hour.
    const admin = state.workers[0];
    if (admin) admin.minutesWorked = MINUTES_PER_WORKING_DAY - 10;
    state = clearEvents(tick(state, 20));
    const left = state.tasks.find((task) => task.kind === 'bookkeeping');
    expect(left?.done).toBe(false);
    expect(left?.doneBy).toBeNull();
    expect(left?.minutesRemaining).toBe(BOOKKEEPING_MINUTES - 10);
    expect(staffMinutesLeft(state.workers[0] as Worker)).toBe(0);
    // The owner picks up what is left of it.
    state = act(state, { type: 'START_TASK', taskId: left?.id ?? '' });
    expect(state.owner.currentTaskId).toBe(left?.id);
  });

  it('takes a task off the man who was holding it when the owner takes it on', () => {
    let state = newGame();
    state.workers.push(officeWorker('a1', 'officeAdmin'));
    state = clearEvents(runToDay(state, 2).state);
    const books = state.tasks.find((task) => task.kind === 'bookkeeping');
    expect(state.workers[0]?.taskId).toBe(books?.id);
    state = act(state, { type: 'START_TASK', taskId: books?.id ?? '' });
    expect(state.workers[0]?.taskId).toBeNull();
    expect(state.tasks.find((task) => task.kind === 'bookkeeping')?.doneBy).toBe('owner');
  });

  it('stops the purchasing clerk at 16 orders a day', () => {
    let state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    state.enquiries = [];
    state.workers.push(officeWorker('c1', 'purchasingClerk'));
    const enquiry = placeEnquiry(state, { price: 400, deadlineDays: 90 });
    state = act(state, { type: 'ACCEPT_ENQUIRY', enquiryId: enquiry.id, byHand: false });
    const first = firstJob(state);
    for (let index = 1; index < 20; index += 1) {
      state.jobs.push({ ...first, id: `job-clone-${index}` });
    }
    state.tasks = state.tasks.filter((task) => task.jobId === null);
    for (const job of state.jobs) {
      job.stage = 'materialPending';
      createTask(state, {
        kind: 'materialOrder',
        label: `Material order: ${job.name}`,
        minutes: 30,
        jobId: job.id,
      });
    }
    // One action to settle the state, so the clerk is holding his first order at 08:00.
    const morning = act(clearEvents(state), { type: 'SET_SPEED', speed: 1 });
    const day = clearEvents(tick(morning, MINUTES_PER_WORKING_DAY));
    const done = day.tasks.filter((task) => task.kind === 'materialOrder' && task.done).length;
    expect(done).toBe(CLERK_ORDERS_PER_DAY);
    expect(day.workers[0]?.ordersToday).toBe(CLERK_ORDERS_PER_DAY);
    expect(staffMinutesLeft(day.workers[0] as Worker)).toBe(0);
  });
});
