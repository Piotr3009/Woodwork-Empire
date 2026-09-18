import { describe, expect, it } from 'vitest';
import {
  BOOKKEEPING_MINUTES,
  CONSUMABLES_LABEL,
  DAILY_ORDERING_MINUTES,
  DAY_END_MINUTE,
  WORKER_RATES,
  JOINERY_CORE_EXTENSION_PRICE_YEARLY,
  JOINERY_CORE_MAX_EXTENSIONS,
  JOINERY_CORE_PRICE_YEARLY,
  DESIGN_MIN_MINUTES,
  SOFTWARE_DESIGN_FACTOR,
  TAKE_OFF_BUTTON_LABEL,
} from '../../src/engine/constants';
import {
  createDailyTasks,
  createTask,
  designMinutes,
  emailsForPrice,
  MATERIAL_TAKE_OFF_MINUTES,
  estimatorCapacity,
  takeOffMinutes,
  findTask,
  jobTasks,
  joineryCoreOffer,
  materialOrderMinutes,
  openTasks,
  staffManagementMinutes,
  startTaskCheck,
  tasksOfKind,
  unloadMinutes,
} from '../../src/engine/tasks';
import { tick } from '../../src/engine/index';
import type { GameState, Worker } from '../../src/engine/index';
import {
  acceptNow,
  act,
  buyNow,
  buyStartingKit,
  clearEvents,
  doTask,
  firstJob,
  hireNow,
  newGame,
  placeEnquiry,
  runClock,
  runToDay,
  sixJoinersOnSheetWork,
  withLicence,
} from '../helpers';

function staff(id: string, role: Worker['role'], weeklyWage: number): Worker {
  return {
    id,
    name: id,
    role,
    tier: null,
    rate: 0,
    weeklyWage,
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
    anchorX: 0,
    anchorY: 0,
  };
}

describe('minute curves', () => {
  it('runs the material order curve from 30 at 10000 to 200 at 100000', () => {
    expect(materialOrderMinutes(400)).toBe(30);
    expect(materialOrderMinutes(10000)).toBe(30);
    expect(materialOrderMinutes(55000)).toBeCloseTo(115, 6);
    expect(materialOrderMinutes(100000)).toBe(200);
    expect(materialOrderMinutes(250000)).toBe(200);
  });

  it('reads the drawing time off the value of the job, with a floor and the software tier', () => {
    // PIOTR's three figures (CLAUDE.md T19 2.11): GBP 2,500 is an hour, GBP 10,000 four hours,
    // GBP 20,000 eight. Nothing about the product and nothing about its size comes into it.
    expect(designMinutes(2500, 'basic')).toBe(60);
    expect(designMinutes(10000, 'basic')).toBe(240);
    expect(designMinutes(20000, 'basic')).toBe(480);
    // The floor: the smallest job there is still takes half an hour to draw.
    expect(designMinutes(100, 'basic')).toBe(DESIGN_MIN_MINUTES);
    expect(designMinutes(0, 'basic')).toBe(DESIGN_MIN_MINUTES);
    // Exactly at the floor's own price, the two agree.
    expect(designMinutes(1250, 'basic')).toBe(DESIGN_MIN_MINUTES);
    // The software still divides what the value asks for, as it always did.
    expect(designMinutes(10000, 'standard')).toBe(240 * SOFTWARE_DESIGN_FACTOR.standard);
    expect(designMinutes(10000, 'pro')).toBe(48);
    expect(designMinutes(2500, 'pro')).toBe(12);
  });

  it('cuts unloading with a forklift', () => {
    const plain = newGame({ difficulty: 'veryEasy' });
    expect(unloadMinutes(plain)).toBe(45);
    // PIOTR's three figures of CLAUDE.md T13 3.21: 45 by hand, about 30 with a pallet truck,
    // about 15 with a forklift; the better forklift is [TUNE].
    const truck = buyNow(plain, 'palletTruck');
    expect(unloadMinutes(truck)).toBe(30);
    const forklift = buyNow(plain, 'forklift');
    expect(unloadMinutes(forklift)).toBe(15);
    const better = buyNow(forklift, 'forkliftBetter');
    expect(unloadMinutes(better)).toBe(10);
  });

  it('charges 10 minutes a joiner a day for management', () => {
    const state = newGame();
    expect(staffManagementMinutes(state)).toBe(0);
    state.workers.push({ ...staff('j1', 'joiner', 0), tier: 'novice', rate: 0.6, weeklyWage: 480 });
    state.workers.push({ ...staff('j2', 'joiner', 0), tier: 'novice', rate: 0.6, weeklyWage: 480 });
    expect(staffManagementMinutes(state)).toBe(20);
  });
});

describe('the daily list', () => {
  it('puts the bookkeeping on the desk every working day, and emails no longer', () => {
    const state = newGame();
    // Emails belong to a job now, so an empty order book means no emails (CLAUDE.md T2 3.5).
    expect(tasksOfKind(state, 'emails')).toHaveLength(0);
    expect(tasksOfKind(state, 'bookkeeping')).toHaveLength(1);
    // The consumables and materials chore lands every day, projects or none (CLAUDE.md T13 3.3).
    expect(tasksOfKind(state, 'dailyOrdering')).toHaveLength(1);
    const day2 = clearEvents(tick(state, 600));
    expect(tasksOfKind(day2, 'bookkeeping')).toHaveLength(1);
    expect(day2.tasks.filter((task) => task.kind === 'bookkeeping')).toHaveLength(1);
  });

  it('puts the consumables and materials chore on the desk with a job on the books too', () => {
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
      sheets: 2,
      sheetsUsed: 0,
      sheetsReserved: 0,
      kind: 'residential',
      budget: 400,
      nightMinutes: 0,
      needsSpindle: false,
      blockedBy: '',
      bespokeMaterial: false,
      express: false,
      byHand: false,
      sawFallback: true,
      needsMeasure: false,
      labourValue: 160,
      labourRemaining: 160,
      acceptedDay: 1,
      finishedDay: null,
      deliverOnDay: null,
      dueDay: 11,
      stage: 'accepted',
      calls: [],
      callsMissed: 0,
      designMinutesRemaining: 30,
      assignees: [],
      stageRuns: [],
      completedDay: null,
      daysLate: 0,
      depositPaid: 200,
      balancePaid: 0,
      penalty: 0,
      emailsUnanswered: 0,
      wetFinish: false,
      productionMinutes: 0,
      dustyMinutes: 0,
      rating: null,
      overdueWarned: false,
    });
    createDailyTasks(state);
    expect(tasksOfKind(state, 'dailyOrdering')).toHaveLength(1);
  });

  it('hands the office admin his own tasks, which he works off out of his own day', () => {
    const state = newGame();
    state.workers.push(staff('a1', 'officeAdmin', 445));
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

  it('takes longer than the task says once the week has caught up with him', () => {
    // An overtime minute is worth any other minute now: what a week of them costs is the labour
    // factor the morning starts at (CLAUDE.md T6 3.4). At 0.8, an hour puts in 48 minutes.
    const { state, taskId } = withTask(60);
    state.owner.labourFactor = 0.8;
    const next = runClock(act(state, { type: 'START_TASK', taskId }), 60);
    expect(findTask(next, taskId)?.minutesRemaining).toBeCloseTo(12, 6);
  });

  it('pushes what the owner did not finish to the next day', () => {
    // The rule from CLAUDE.md 8.10: an hour lost on admin is an hour of workshop work lost today.
    const state = withLicence(newGame());
    const emails = createTask(state, { kind: 'emails', label: 'Emails', minutes: 60 });
    const design = createTask(state, { kind: 'design', label: 'Wardrobe drawing', minutes: 480 });
    let next = tick(act(state, { type: 'START_TASK', taskId: emails.id }), 60);
    expect(findTask(next, emails.id)?.done).toBe(true);
    next = runClock(act(next, { type: 'START_TASK', taskId: design.id }), DAY_END_MINUTE - 60);
    expect(next.clock.minute).toBe(DAY_END_MINUTE);
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
    const next = runClock(act(state, { type: 'START_TASK', taskId: design.id }), DAY_END_MINUTE);
    expect(findTask(next, design.id)?.done).toBe(true);
    expect(next.clock.minute).toBe(DAY_END_MINUTE);
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

describe('emails scale with what the job is worth (CLAUDE.md T3 3.2)', () => {
  it('gives a small job one email and a big one as many as the bands say', () => {
    expect(emailsForPrice(400)).toBe(1);
    expect(emailsForPrice(3000)).toBe(1);
    expect(emailsForPrice(3001)).toBe(2);
    expect(emailsForPrice(10000)).toBe(2);
    expect(emailsForPrice(10001)).toBe(3);
    expect(emailsForPrice(20000)).toBe(3);
    expect(emailsForPrice(20001)).toBe(4);
    expect(emailsForPrice(30000)).toBe(4);
    expect(emailsForPrice(30001)).toBe(5);
    expect(emailsForPrice(40000)).toBe(5);
  });

  it('never falls below one and never goes down as the price goes up', () => {
    let last = 0;
    for (let price = 100; price <= 100000; price += 100) {
      const emails = emailsForPrice(price);
      expect(emails).toBeGreaterThanOrEqual(1);
      expect(emails).toBeGreaterThanOrEqual(last);
      last = emails;
    }
  });

  it('puts that many on the job, at ten minutes each', () => {
    let state = withLicence(newGame());
    state.enquiries = [];
    const enquiry = placeEnquiry(state, { price: 900, name: 'Bookcase' });
    state = acceptNow(state, enquiry.id, false);
    const emails = state.tasks.filter((task) => task.kind === 'emails');
    expect(emails).toHaveLength(1);
    expect(emails.every((task) => task.minutesTotal === 10)).toBe(true);
    // The calls are not tasks any more: they sit in the diary and ring (CLAUDE.md T4 3.3).
    expect(state.tasks.filter((task) => task.kind === 'clientCall')).toHaveLength(0);
    expect(state.jobs[0]?.calls).toHaveLength(2);
  });
});

// The estimator and the material list (PIOTR; CLAUDE.md T13 3.8). Two jobs that were one: the
// take off, which reads the drawing and counts the sheets for one job, and the daily consumables
// and materials chore, which is the admin's and has nothing to do with the number of projects.
describe('the material take off', () => {
  /** A job on the books whose drawing is still to do, in a hall that can draw. */
  function withTakeOff(): GameState {
    let state = withLicence(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
    state.enquiries = [];
    state.reputation = 10;
    const enquiry = placeEnquiry(state, { price: 4000, deadlineDays: 40 });
    state = acceptNow(state, enquiry.id, false);
    return state;
  }

  function takeOffOf(state: GameState) {
    return jobTasks(state, firstJob(state).id).find((task) => task.kind === 'materialTakeOff');
  }

  it('is as many a day as his minutes allow: 16 bare, 32 with Joinery Core (CLAUDE.md T20 2.3)', () => {
    const state = newGame();
    expect(MATERIAL_TAKE_OFF_MINUTES).toBe(30);
    expect(takeOffMinutes(state)).toBe(MATERIAL_TAKE_OFF_MINUTES);
    expect(estimatorCapacity(state)).toBe(16);
    state.software.joineryCore = true;
    expect(takeOffMinutes(state)).toBe(15);
    expect(estimatorCapacity(state)).toBe(32);
    state.software.joineryCoreExtensions = 1;
    expect(estimatorCapacity(state)).toBe(42);
    state.software.joineryCoreExtensions = 2;
    expect(estimatorCapacity(state)).toBe(56);
    // At most two: a third counts for nothing, whatever the state says.
    state.software.joineryCoreExtensions = 3;
    expect(estimatorCapacity(state)).toBe(56);
    expect(JOINERY_CORE_MAX_EXTENSIONS).toBe(2);
  });

  it('gives a man with no experience 37 minutes over one and the top man 21', () => {
    const state = newGame();
    // His tier is his speed at the desk, off the one WORKER_RATES table (CLAUDE.md T20 2.5).
    expect(MATERIAL_TAKE_OFF_MINUTES / WORKER_RATES.novice).toBeCloseTo(37.5, 6);
    expect(MATERIAL_TAKE_OFF_MINUTES / WORKER_RATES.master).toBeCloseTo(21.43, 2);
    expect(estimatorCapacity(state, 'novice')).toBe(12);
    expect(estimatorCapacity(state, 'master')).toBe(22);
  });

  it('is the owner’s with nobody hired, and only once the drawing is done', () => {
    let state = withTakeOff();
    const task = takeOffOf(state);
    expect(task?.label).toBe(`Material take off: ${firstJob(state).name}`);
    expect(TAKE_OFF_BUTTON_LABEL).toBe('Create material list');
    // Nobody holds it: it is on the owner's desk.
    expect(task?.doneBy).toBeNull();
    expect(startTaskCheck(state, task?.id ?? '')).toMatchObject({
      ok: false,
      reason: 'The drawing comes first',
    });
    state = clearEvents(doTask(state, 'design'));
    expect(startTaskCheck(state, takeOffOf(state)?.id ?? '').ok).toBe(true);
    state = clearEvents(doTask(state, 'materialTakeOff'));
    const done = takeOffOf(state);
    expect(done?.done).toBe(true);
    expect(done?.doneBy).toBe('owner');
    // The job moves on: the desk work is behind it (CLAUDE.md T13 3.8).
    expect(['ready', 'materialPending', 'materialOrdered']).toContain(firstJob(state).stage);
  });

  it('is the estimator’s from the day he is in, at the speed of his tier, and waits for the drawing too', () => {
    let state = withTakeOff();
    // A super experienced man answers from reputation 35 now (CLAUDE.md T20 2.5), and the bank
    // wants a month of his pay before anybody is taken on (CLAUDE.md T17 2.11).
    state.reputation = 40;
    state.cash = 100000;
    state = hireNow(state, 'estimator', 'senior');
    const estimator = state.workers.find((worker) => worker.role === 'estimator');
    expect(estimator).toBeDefined();
    for (const worker of state.workers) worker.startDay = state.clock.day;
    state = clearEvents(runClock(state, 1));
    // The drawing is still to do, so the take off waits on the desk for it.
    expect(takeOffOf(state)?.doneBy).toBeNull();
    state = clearEvents(doTask(state, 'design'));
    state = clearEvents(runClock(state, 1));
    expect(takeOffOf(state)?.doneBy).toBe(estimator?.id);
    const before = takeOffOf(state)?.minutesRemaining ?? 0;
    const later = clearEvents(runClock(state, 10));
    const after = takeOffOf(later)?.minutesRemaining ?? 0;
    // A super experienced estimator works it off at 1.2 of a minute a minute (WORKER_RATES).
    expect(before - after).toBeCloseTo(10 * WORKER_RATES.senior, 6);
    expect(later.owner.minutesWorked).toBe(state.owner.minutesWorked);
  });

  it('is offered Joinery Core beside him, with the prices and the refusals of the click', () => {
    let state = newGame();
    // No laptop yet: nothing to put it on.
    expect(joineryCoreOffer(state).core).toEqual({ ok: false, reason: 'Needs the laptop' });
    state = buyStartingKit(state);
    const offer = joineryCoreOffer(state);
    expect(offer.held).toBe(false);
    expect(offer.core.ok).toBe(true);
    expect(offer.extension).toEqual({ ok: false, reason: 'Joinery Core first' });
    expect(offer.capacity).toBe(16);
    expect(offer.baseCapacity).toBe(16);
    expect(offer.coreCapacity).toBe(32);
    expect(offer.extensionCapacities).toEqual([42, 56]);
    expect(offer.yearlyPrice).toBe(JOINERY_CORE_PRICE_YEARLY);
    expect(offer.extensionYearlyPrice).toBe(JOINERY_CORE_EXTENSION_PRICE_YEARLY);
    // The click switches it on and pays the first twelfth of the year (CLAUDE.md T13 3.8).
    const cash = state.cash;
    state = act(state, { type: 'BUY_JOINERY_CORE' });
    expect(state.software.joineryCore).toBe(true);
    expect(cash - state.cash).toBeCloseTo(JOINERY_CORE_PRICE_YEARLY / 12, 2);
    expect(joineryCoreOffer(state).core).toEqual({ ok: false, reason: 'On the laptop' });
    expect(joineryCoreOffer(state).capacity).toBe(32);
    state = act(state, { type: 'BUY_JOINERY_CORE_EXTENSION' });
    state = act(state, { type: 'BUY_JOINERY_CORE_EXTENSION' });
    expect(joineryCoreOffer(state).extension).toEqual({ ok: false, reason: 'Both extensions bought' });
    expect(joineryCoreOffer(state).capacity).toBe(56);
    // A third click buys nothing.
    const two = state.cash;
    state = act(state, { type: 'BUY_JOINERY_CORE_EXTENSION' });
    expect(state.software.joineryCoreExtensions).toBe(JOINERY_CORE_MAX_EXTENSIONS);
    expect(state.cash).toBe(two);
  });

  it('leaves the consumables and materials chore at thirty minutes whatever the project count', () => {
    const state = newGame();
    createDailyTasks(state);
    const none = tasksOfKind(state, 'dailyOrdering')[0];
    expect(none?.label).toBe(CONSUMABLES_LABEL);
    expect(none?.minutesTotal).toBe(DAILY_ORDERING_MINUTES);
    // Six projects on the books: the same thirty minutes (CLAUDE.md T13 3.3).
    const busy = sixJoinersOnSheetWork();
    createDailyTasks(busy);
    expect(tasksOfKind(busy, 'dailyOrdering')).toHaveLength(1);
    expect(tasksOfKind(busy, 'dailyOrdering')[0]?.minutesTotal).toBe(DAILY_ORDERING_MINUTES);
    // And it is the admin's when there is one: she picks it up after the books, which come first
    // on her list, and the owner never sees it.
    const office = newGame();
    office.workers.push(staff('a1', 'officeAdmin', 445));
    const day2 = clearEvents(runToDay(office, 2).state);
    const later = clearEvents(tick(day2, BOOKKEEPING_MINUTES + 1));
    expect(tasksOfKind(later, 'dailyOrdering')[0]?.doneBy).toBe('a1');
  });
});
