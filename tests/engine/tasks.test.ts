import { describe, expect, it } from 'vitest';
import {
  BOOKKEEPING_MINUTES,
  CLIENT_CALL_MINUTES_CAP,
  SOFTWARE_DESIGN_FACTOR,
} from '../../src/engine/constants';
import { PRODUCT_TEMPLATES } from '../../src/engine/constants';
import {
  callsForPrice,
  clientCallMinutes,
  createDailyTasks,
  createTask,
  designMinutes,
  findTask,
  materialOrderMinutes,
  openTasks,
  staffManagementMinutes,
  tasksOfKind,
  unloadMinutes,
} from '../../src/engine/tasks';
import { tick } from '../../src/engine/index';
import type { GameState, ProductTemplate, Worker } from '../../src/engine/index';
import { act, clearEvents, newGame, runToDay, withLicence } from '../helpers';

function template(id: string): ProductTemplate {
  const found = PRODUCT_TEMPLATES.find((entry) => entry.id === id);
  if (!found) throw new Error(`no template ${id}`);
  return found;
}

function staff(id: string, role: Worker['role'], monthlyWage: number): Worker {
  return {
    id,
    name: id,
    role,
    tier: null,
    rate: 0,
    weeklyWage: 0,
    monthlyWage,
    startDay: 1,
    jobId: null,
    taskId: null,
    minutesWorked: 0,
    ordersToday: 0,
    absentDaysRemaining: 0,
    anchorX: 0,
    anchorY: 0,
  };
}

describe('minute curves', () => {
  it('gives 2 calls up to 1000, 3 up to 3000 and 4 above', () => {
    expect(callsForPrice(400)).toBe(2);
    expect(callsForPrice(1000)).toBe(2);
    expect(callsForPrice(1001)).toBe(3);
    expect(callsForPrice(3000)).toBe(3);
    expect(callsForPrice(3001)).toBe(4);
    expect(callsForPrice(12000)).toBe(4);
  });

  it('charges 15 minutes a call up to 1000 and 15 more per further 1000, capped at 200', () => {
    expect(clientCallMinutes(400)).toBe(15);
    expect(clientCallMinutes(1000)).toBe(15);
    expect(clientCallMinutes(1001)).toBe(30);
    expect(clientCallMinutes(2000)).toBe(30);
    expect(clientCallMinutes(3000)).toBe(45);
    expect(clientCallMinutes(12000)).toBe(180);
    expect(clientCallMinutes(100000)).toBe(CLIENT_CALL_MINUTES_CAP);
  });

  it('runs the material order curve from 30 at 10000 to 200 at 100000', () => {
    expect(materialOrderMinutes(400)).toBe(30);
    expect(materialOrderMinutes(10000)).toBe(30);
    expect(materialOrderMinutes(55000)).toBeCloseTo(115, 6);
    expect(materialOrderMinutes(100000)).toBe(200);
    expect(materialOrderMinutes(250000)).toBe(200);
  });

  it('scales design minutes with the size and the software tier', () => {
    const wardrobe = template('wardrobe');
    expect(designMinutes(wardrobe, 1, 'basic')).toBe(480);
    expect(designMinutes(wardrobe, 1.5, 'basic')).toBe(720);
    expect(designMinutes(wardrobe, 1, 'standard')).toBe(480 * SOFTWARE_DESIGN_FACTOR.standard);
    expect(designMinutes(wardrobe, 1, 'pro')).toBe(96);
    expect(designMinutes(template('garageShelves'), 1, 'basic')).toBe(30);
  });

  it('cuts unloading with a forklift', () => {
    const plain = newGame({ difficulty: 'veryEasy' });
    expect(unloadMinutes(plain)).toBe(45);
    const forklift = act(plain, { type: 'BUY_EQUIPMENT', specId: 'forklift' });
    expect(unloadMinutes(forklift)).toBe(23);
    const better = act(forklift, { type: 'BUY_EQUIPMENT', specId: 'forkliftBetter' });
    expect(unloadMinutes(better)).toBe(9);
  });

  it('charges 10 minutes a joiner a day for management', () => {
    const state = newGame();
    expect(staffManagementMinutes(state)).toBe(0);
    state.workers.push({ ...staff('j1', 'joiner', 0), tier: 'poor', rate: 0.6, weeklyWage: 480 });
    state.workers.push({ ...staff('j2', 'joiner', 0), tier: 'poor', rate: 0.6, weeklyWage: 480 });
    expect(staffManagementMinutes(state)).toBe(20);
  });
});

describe('the daily list', () => {
  it('puts the bookkeeping on the desk every working day, and emails no longer', () => {
    const state = newGame();
    // Emails belong to a job now, so an empty order book means no emails (CLAUDE.md T2 3.5).
    expect(tasksOfKind(state, 'emails')).toHaveLength(0);
    expect(tasksOfKind(state, 'bookkeeping')).toHaveLength(1);
    expect(tasksOfKind(state, 'dailyOrdering')).toHaveLength(0);
    const day2 = clearEvents(tick(state, 600));
    expect(tasksOfKind(day2, 'bookkeeping')).toHaveLength(1);
    expect(day2.tasks.filter((task) => task.kind === 'bookkeeping')).toHaveLength(1);
  });

  it('adds the daily ordering only while there are jobs on the books', () => {
    const state = newGame();
    state.jobs.push({
      id: 'job-test',
      templateId: 'garageShelves',
      name: 'Garage shelves',
      price: 400,
      basePrice: 400,
      sizeMultiplier: 1,
      finish: 'laminate',
      materialKind: 'sheet',
      materialCost: 160,
      materialMode: 'perJob',
      sheets: 2,
      sheetsUsed: 0,
      waitingForMaterial: false,
      bespokeMaterial: false,
      express: false,
      byHand: false,
      needsMeasure: false,
      labourValue: 160,
      labourRemaining: 160,
      acceptedDay: 1,
      finishedDay: null,
      deliverOnDay: null,
      dueDay: 11,
      stage: 'accepted',
      callsRemaining: 2,
      designMinutesRemaining: 30,
      assignedTo: null,
      completedDay: null,
      daysLate: 0,
      depositPaid: 200,
      balancePaid: 0,
      penalty: 0,
      emailsUnanswered: 0,
      rating: null,
      overdueWarned: false,
    });
    createDailyTasks(state);
    expect(tasksOfKind(state, 'dailyOrdering')).toHaveLength(1);
  });

  it('hands the office admin his own tasks, which he works off out of his own day', () => {
    const state = newGame();
    state.workers.push(staff('a1', 'officeAdmin', 1900));
    const day2 = runToDay(state, 2).state;
    const taken = day2.tasks.find((task) => task.kind === 'bookkeeping');
    expect(taken?.doneBy).toBe('a1');
    expect(taken?.done).toBe(false);
    // An hour of his day later, it is done and the owner never touched it.
    const later = clearEvents(tick(day2, BOOKKEEPING_MINUTES));
    const books = later.tasks.find((task) => task.kind === 'bookkeeping');
    expect(books?.done).toBe(true);
    expect(books?.doneBy).toBe('a1');
    expect(later.workers[0]?.minutesWorked).toBe(BOOKKEEPING_MINUTES);
    expect(later.owner.minutesWorked).toBe(0);
    expect(openTasks(later).some((task) => task.kind === 'bookkeeping')).toBe(false);
  });
});

describe('the task runner', () => {
  function withTask(minutes: number, kind: 'emails' | 'design' = 'emails'): {
    state: GameState;
    taskId: string;
  } {
    const state = withLicence(newGame());
    const task = createTask(state, { kind, label: 'Test task', minutes });
    return { state, taskId: task.id };
  }

  it('spends one owner minute per clock minute at full efficiency', () => {
    const { state, taskId } = withTask(60);
    let next = act(state, { type: 'START_TASK', taskId });
    next = tick(next, 60);
    expect(findTask(next, taskId)?.done).toBe(true);
    expect(next.owner.minutesWorked).toBe(60);
    expect(next.owner.minutesByCategory.admin).toBe(60);
    expect(next.owner.currentTaskId).toBeNull();
  });

  it('books design minutes to the design segment', () => {
    const { state, taskId } = withTask(30, 'design');
    const next = tick(act(state, { type: 'START_TASK', taskId }), 30);
    expect(next.owner.minutesByCategory.design).toBe(30);
    expect(next.owner.minutesByCategory.admin).toBe(0);
  });

  it('only runs the task the player started', () => {
    const { state, taskId } = withTask(60);
    const other = createTask(state, { kind: 'bookkeeping', label: 'Books', minutes: 60 });
    const next = tick(act(state, { type: 'START_TASK', taskId }), 60);
    expect(findTask(next, taskId)?.done).toBe(true);
    expect(findTask(next, other.id)?.minutesRemaining).toBe(60);
  });

  it('pauses a task and keeps the minutes already spent', () => {
    const { state, taskId } = withTask(60);
    let next = tick(act(state, { type: 'START_TASK', taskId }), 20);
    next = act(next, { type: 'PAUSE_TASK' });
    expect(next.owner.currentTaskId).toBeNull();
    expect(findTask(next, taskId)?.minutesRemaining).toBe(40);
    next = tick(next, 100);
    expect(findTask(next, taskId)?.minutesRemaining).toBe(40);
  });

  it('takes longer than the task says once the owner is in overtime', () => {
    const { state, taskId } = withTask(540);
    // 480 minutes at full speed, then hour 9 at 0.8: 60 units of work need 75 clock minutes.
    let next = tick(act(state, { type: 'START_TASK', taskId }), 480);
    expect(findTask(next, taskId)?.minutesRemaining).toBe(60);
    next = tick(next, 60);
    expect(findTask(next, taskId)?.minutesRemaining).toBeCloseTo(12, 6);
  });

  it('pushes what the owner did not finish to the next day', () => {
    // The rule from CLAUDE.md 8.10: an hour lost on admin is an hour of workshop work lost today.
    const state = withLicence(newGame());
    const emails = createTask(state, { kind: 'emails', label: 'Emails', minutes: 60 });
    const design = createTask(state, { kind: 'design', label: 'Wardrobe drawing', minutes: 480 });
    let next = tick(act(state, { type: 'START_TASK', taskId: emails.id }), 60);
    expect(findTask(next, emails.id)?.done).toBe(true);
    next = tick(act(next, { type: 'START_TASK', taskId: design.id }), 420);
    expect(next.clock.minute).toBe(480);
    expect(findTask(next, design.id)?.minutesRemaining).toBe(60);
    // The owner refuses the overtime and goes home.
    next = clearEvents(act(next, { type: 'END_DAY' }));
    expect(next.clock.day).toBe(2);
    expect(findTask(next, design.id)?.minutesRemaining).toBe(60);
    expect(findTask(next, design.id)?.done).toBe(false);
  });

  it('finishes the same drawing inside one day when no admin got in the way', () => {
    const state = withLicence(newGame());
    const design = createTask(state, { kind: 'design', label: 'Wardrobe drawing', minutes: 480 });
    const next = tick(act(state, { type: 'START_TASK', taskId: design.id }), 480);
    expect(findTask(next, design.id)?.done).toBe(true);
    expect(next.clock.minute).toBe(480);
  });
});

describe('one thing at a time', () => {
  it('refuses a second task until the first is done or paused (CLAUDE.md 10.1)', () => {
    const state = withLicence(newGame());
    const emails = createTask(state, { kind: 'emails', label: 'Emails', minutes: 60 });
    const books = createTask(state, { kind: 'bookkeeping', label: 'Books', minutes: 60 });
    let next = act(state, { type: 'START_TASK', taskId: emails.id });
    next = act(next, { type: 'START_TASK', taskId: books.id });
    expect(next.owner.currentTaskId).toBe(emails.id);
    expect(findTask(next, books.id)?.doneBy).toBeNull();
    next = act(next, { type: 'PAUSE_TASK' });
    next = act(next, { type: 'START_TASK', taskId: books.id });
    expect(next.owner.currentTaskId).toBe(books.id);
    // The first one kept its minutes and nobody is holding it.
    expect(findTask(next, emails.id)?.minutesRemaining).toBe(60);
    expect(findTask(next, emails.id)?.doneBy).toBeNull();
  });
});
