import { describe, expect, it } from 'vitest';
import {
  BY_HAND_DURATION_FACTOR,
  DEPOSIT_FRACTION,
  LABOUR_FRACTION,
  LATE_PENALTY_PER_DAY,
  LATE_PENALTY_PER_DAY_EXPRESS,
  MATERIAL_FRACTION,
  OWNER_JOB_VALUE_PER_DAY,
  OWNER_LABOUR_PER_MINUTE,
  SITE_MEASURE_TAXI_COST,
} from '../../src/engine/constants';
import { machineLabourFactor } from '../../src/engine/machines';
import { findJob, minutesRemainingFor, ownerJob } from '../../src/engine/jobs';
import { materialCostFor, sheetsForCost } from '../../src/engine/materials';
import { tick } from '../../src/engine/index';
import type { GameEvent, GameState } from '../../src/engine/index';
import {
  act,
  buyStartingKit,
  doTask,
  eventsOfKind,
  firstJob,
  newGame,
  nextDay,
  placeEnquiry,
} from '../helpers';

/** An Easy game with the day 1 kit bought and a clean board. */
function ready(): GameState {
  const state = buyStartingKit(newGame());
  state.enquiries = [];
  return state;
}

function accept(state: GameState, price = 400, extra = {}): GameState {
  const enquiry = placeEnquiry(state, { price, ...extra });
  return act(state, { type: 'ACCEPT_ENQUIRY', enquiryId: enquiry.id, byHand: false });
}

describe('accepting an enquiry', () => {
  it('splits the price into material, labour and profit', () => {
    const state = accept(ready());
    const job = state.jobs[0];
    expect(job?.price).toBe(400);
    expect(job?.materialCost).toBe(400 * MATERIAL_FRACTION);
    expect(materialCostFor(400, false)).toBe(160);
    // Bespoke material costs 15% more and is not returnable (CLAUDE.md 8.9).
    expect(materialCostFor(400, true)).toBe(184);
    expect(job?.labourValue).toBe(400 * LABOUR_FRACTION);
    expect(job?.labourTotal).toBe(160);
    expect(job?.sheets).toBe(sheetsForCost(160));
  });

  it('pays the deposit and takes the enquiry off the board', () => {
    const before = ready();
    const state = accept(before);
    expect(state.cash - before.cash).toBe(400 * DEPOSIT_FRACTION);
    expect(state.jobs[0]?.depositPaid).toBe(200);
    // The board draws a replacement at once, so the taken enquiry is gone but the board is not bare.
    expect(state.enquiries.some((enquiry) => enquiry.price === 400)).toBe(false);
  });

  it('puts the calls and the drawing on the owner', () => {
    const state = accept(ready());
    const kinds = state.tasks.filter((task) => task.jobId !== null).map((task) => task.kind);
    expect(kinds).toEqual(['clientCall', 'clientCall', 'design']);
    const calls = state.tasks.filter((task) => task.kind === 'clientCall');
    expect(calls.every((task) => task.minutesTotal === 15)).toBe(true);
    expect(state.tasks.find((task) => task.kind === 'design')?.minutesTotal).toBe(30);
    expect(state.jobs[0]?.stage).toBe('accepted');
  });

  it('counts the deadline in calendar days from acceptance', () => {
    const state = accept(ready(), 400, { deadlineDays: 15 });
    expect(state.jobs[0]?.dueDay).toBe(16);
  });

  it('adds the site measure and its taxi for a kitchen', () => {
    let state = ready();
    state.reputation = 1.5;
    state = accept(state, 3500, { templateId: 'smallKitchen', name: 'Small kitchen', needsMeasure: true });
    expect(state.tasks.some((task) => task.kind === 'siteMeasure')).toBe(true);
    const before = state.cash;
    state = doTask(state, 'siteMeasure');
    expect(before - state.cash).toBe(SITE_MEASURE_TAXI_COST);
    expect(state.jobs[0]?.measureDone).toBe(true);
  });

  it('uses one job of a one off licence', () => {
    const state = accept(ready());
    expect(state.software.jobsRemaining).toBe(29);
  });

  it('refuses to start a drawing with no licence', () => {
    let state = newGame();
    for (const specId of ['desk', 'laptop', 'tableSaw', 'drill']) {
      state = act(state, { type: 'BUY_EQUIPMENT', specId });
    }
    state.enquiries = [];
    state = accept(state);
    const design = state.tasks.find((task) => task.kind === 'design');
    const tried = act(state, { type: 'START_TASK', taskId: design?.id ?? '' });
    expect(tried.owner.currentTaskId).toBeNull();
    const licensed = act(tried, { type: 'BUY_SOFTWARE', mode: 'oneOff' });
    const started = act(licensed, { type: 'START_TASK', taskId: design?.id ?? '' });
    expect(started.owner.currentTaskId).toBe(design?.id);
  });
});

describe('the by hand path', () => {
  it('refuses a locked enquiry unless the player asks for the by hand job', () => {
    let state = ready();
    state.reputation = 1;
    const table = placeEnquiry(state, {
      templateId: 'oakDiningTable',
      name: 'Oak dining table',
      price: 12000,
      materialKind: 'solidWood',
      deadlineDays: 50,
      lockReason: 'Needs solid wood tools',
      byHandAvailable: true,
    });
    const refused = act(state, { type: 'ACCEPT_ENQUIRY', enquiryId: table.id, byHand: false });
    expect(refused.jobs).toHaveLength(0);
    state = act(state, { type: 'ACCEPT_ENQUIRY', enquiryId: table.id, byHand: true });
    const job = state.jobs[0];
    expect(job?.byHand).toBe(true);
    expect(job?.labourTotal).toBe(12000 * LABOUR_FRACTION * BY_HAND_DURATION_FACTOR);
  });

  it('does not flag a job as by hand when the tools are there', () => {
    let state = ready();
    state = act(state, { type: 'BUY_EQUIPMENT', specId: 'thicknesser' });
    state = act(state, { type: 'BUY_EQUIPMENT', specId: 'solidWoodTools' });
    const table = placeEnquiry(state, {
      templateId: 'oakDiningTable',
      name: 'Oak dining table',
      price: 12000,
      materialKind: 'solidWood',
      deadlineDays: 50,
      byHandAvailable: true,
    });
    state = act(state, { type: 'ACCEPT_ENQUIRY', enquiryId: table.id, byHand: true });
    expect(state.jobs[0]?.byHand).toBe(false);
  });
});

describe('machine labour reductions', () => {
  it('multiplies the reductions of the machines that are there', () => {
    const state = newGame();
    expect(machineLabourFactor(state, 'sheet')).toBe(1);
    state.equipment.push({
      id: 'kit-cnc',
      specId: 'cnc',
      spriteKey: 'cnc',
      anchorX: 0,
      anchorY: 0,
      minutesUsed: 0,
      bagFull: false,
      broken: false,
      purchasePrice: 45000,
    });
    expect(machineLabourFactor(state, 'sheet')).toBeCloseTo(0.8, 10);
    state.equipment.push({
      id: 'kit-head',
      specId: 'cncHead',
      spriteKey: 'cncHead',
      anchorX: 0,
      anchorY: 0,
      minutesUsed: 0,
      bagFull: false,
      broken: false,
      purchasePrice: 9000,
    });
    expect(machineLabourFactor(state, 'sheet')).toBeCloseTo(0.8 * 0.95, 10);
  });
});

describe('the order of the lifecycle', () => {
  it('keeps the material order shut until the calls and the drawing are done', () => {
    let state = accept(ready());
    expect(state.tasks.some((task) => task.kind === 'materialOrder')).toBe(false);
    state = doTask(state, 'clientCall');
    expect(state.tasks.some((task) => task.kind === 'materialOrder')).toBe(false);
    state = doTask(state, 'clientCall');
    expect(state.jobs[0]?.callsRemaining).toBe(0);
    expect(state.tasks.some((task) => task.kind === 'materialOrder')).toBe(false);
    state = doTask(state, 'design');
    expect(state.jobs[0]?.stage).toBe('materialPending');
    expect(state.tasks.some((task) => task.kind === 'materialOrder')).toBe(true);
  });

  it('lets the drawing come before the calls', () => {
    let state = accept(ready());
    state = doTask(state, 'design');
    expect(state.jobs[0]?.stage).toBe('accepted');
    state = doTask(state, 'clientCall');
    state = doTask(state, 'clientCall');
    expect(state.jobs[0]?.stage).toBe('materialPending');
  });

  it('pays for the material when the order goes in and books the lorry for tomorrow', () => {
    let state = accept(ready());
    state = doTask(state, 'clientCall');
    state = doTask(state, 'clientCall');
    state = doTask(state, 'design');
    const before = state.cash;
    state = doTask(state, 'materialOrder');
    expect(before - state.cash).toBe(160);
    expect(state.jobs[0]?.stage).toBe('materialOrdered');
    expect(state.deliveries).toHaveLength(1);
    expect(state.deliveries[0]?.arriveDay).toBe(2);
    expect(state.deliveries[0]?.arrived).toBe(false);
  });

  it('brings the lorry in the next morning and asks for the unloading', () => {
    let state = accept(ready());
    state = doTask(state, 'clientCall');
    state = doTask(state, 'clientCall');
    state = doTask(state, 'design');
    state = doTask(state, 'materialOrder');
    const events: GameEvent[] = [];
    const settled = nextDay(state, events);
    expect(eventsOfKind(events, 'deliveryArrived')).toHaveLength(1);
    expect(settled.clock.day).toBe(2);
    expect(settled.deliveries[0]?.arrived).toBe(true);
    expect(settled.jobs[0]?.stage).toBe('materialInYard');
    expect(settled.tasks.some((task) => task.kind === 'unload')).toBe(true);
  });
});

describe('production', () => {
  it('needs the owner or a joiner: nothing happens on its own', () => {
    const state = accept(ready());
    firstJob(state).stage = 'ready';
    const idle = tick(state, 200);
    expect(idle.jobs[0]?.labourRemaining).toBe(160);
  });

  it('takes 240 minutes of the owner for a 400 job', () => {
    let state = accept(ready());

    firstJob(state).stage = 'ready';
    expect(minutesRemainingFor(firstJob(state), 1)).toBeCloseTo(240, 6);
    state = act(state, { type: 'WORK_HERE', jobId: null });
    expect(state.jobs[0]?.stage).toBe('inProduction');
    expect(ownerJob(state)?.id).toBe(state.jobs[0]?.id);
    state = tick(state, 239);
    expect(state.jobs[0]?.stage).toBe('inProduction');
    state = tick(state, 1);
    expect(state.jobs[0]?.stage).toBe('completed');
    expect(state.owner.minutesByCategory.workshop).toBe(240);
  });

  it('pays the balance and takes the rating when the job lands', () => {
    let state = accept(ready());
    const afterDeposit = state.cash;
    firstJob(state).stage = 'ready';
    state = act(state, { type: 'WORK_HERE', jobId: null });
    state = tick(state, 240);
    const job = state.jobs[0];
    expect(job?.balancePaid).toBe(200);
    expect(job?.penalty).toBe(0);
    expect(job?.rating).toBe(0.3);
    expect(state.reputation).toBe(0.3);
    expect(state.cash).toBeCloseTo(afterDeposit + 200, 6);
    expect(state.activeEvent?.kind).toBe('jobPaid');
    expect(ownerJob(state)).toBeNull();
  });

  it('works at 0.6667 of job value a minute, so 800 of job value fills a day', () => {
    // CLAUDE.md 8.5: 800 of job value a day, of which 0.40 is labour value.
    expect(OWNER_LABOUR_PER_MINUTE * 480).toBeCloseTo(OWNER_JOB_VALUE_PER_DAY * LABOUR_FRACTION, 6);
    expect(OWNER_JOB_VALUE_PER_DAY * LABOUR_FRACTION).toBe(320);
  });
});

describe('late delivery', () => {
  function lateJob(express: boolean, daysLate: number): GameState {
    let state = accept(ready(), 400, { express, deadlineDays: 1 });
    const job = firstJob(state);
    job.stage = 'ready';
    job.dueDay = 1;
    state.clock.day = 1 + daysLate;
    state = act(state, { type: 'WORK_HERE', jobId: null });
    return tick(state, 240);
  }

  it('takes 5% of the price a day out of the balance', () => {
    const state = lateJob(false, 3);
    const job = state.jobs[0];
    expect(job?.daysLate).toBe(3);
    expect(job?.penalty).toBeCloseTo(3 * LATE_PENALTY_PER_DAY * 400, 6);
    expect(job?.balancePaid).toBeCloseTo(140, 6);
    expect(job?.rating).toBe(-0.3);
  });

  it('takes 30% a day on an express job', () => {
    const state = lateJob(true, 1);
    expect(state.jobs[0]?.penalty).toBe(LATE_PENALTY_PER_DAY_EXPRESS * 400);
    expect(state.jobs[0]?.balancePaid).toBe(80);
  });

  it('never asks the client for more than the balance', () => {
    const state = lateJob(false, 40);
    expect(state.jobs[0]?.penalty).toBe(200);
    expect(state.jobs[0]?.balancePaid).toBe(0);
  });

  it('warns once when the deadline goes by', () => {
    const state = accept(ready(), 400, { deadlineDays: 1 });
    firstJob(state).stage = 'ready';
    const run = nextDay(state);
    const events: GameEvent[] = [];
    const later = nextDay(run, events);
    expect(eventsOfKind(events, 'jobOverdue')).toHaveLength(1);
    expect(later.jobs[0]?.overdueWarned).toBe(true);
    const more: GameEvent[] = [];
    nextDay(later, more);
    expect(eventsOfKind(more, 'jobOverdue')).toHaveLength(0);
  });
});

describe('scenario: garage shelves on Easy', () => {
  it('runs from the board to the rating with the cash movements of CLAUDE.md 8.4', () => {
    const start = ready();
    const cashBefore = start.cash;
    let state = accept(start, 400);
    // Day 1: two calls, the drawing, the material order.
    state = doTask(state, 'clientCall');
    state = doTask(state, 'clientCall');
    state = doTask(state, 'design');
    state = doTask(state, 'materialOrder');
    expect(state.clock.minute).toBe(15 + 15 + 30 + 30);
    expect(state.owner.minutesByCategory.admin).toBe(60);
    expect(state.owner.minutesByCategory.design).toBe(30);
    // Day 2: the lorry, the unloading, then the bench.
    const events: GameEvent[] = [];
    state = nextDay(state, events);
    expect(state.clock.day).toBe(2);
    state = doTask(state, 'unload');
    expect(state.clock.minute).toBe(45);
    expect(state.jobs[0]?.stage).toBe('ready');
    state = act(state, { type: 'WORK_HERE', jobId: null });
    state = tick(state, 240);
    const job = findJob(state, state.jobs[0]?.id ?? '');
    expect(job?.stage).toBe('completed');
    expect(job?.completedDay).toBe(2);
    expect(job?.daysLate).toBe(0);
    expect(job?.rating).toBe(0.3);
    expect(state.reputation).toBe(0.3);
    // 200 deposit in, 160 material out, 200 balance in: 240 of the 400 stays in the till.
    const jobMoves = state.ledger
      .filter((entry) => ['jobDeposit', 'jobBalance', 'material'].includes(entry.category))
      .map((entry) => entry.amount);
    expect(jobMoves).toEqual([200, -160, 200]);
    expect(jobMoves.reduce((total, value) => total + value, 0)).toBe(240);
    // The daily costs quietly took a large slice of the profit on a job this size.
    const day2Costs = state.ledger
      .filter(
        (entry) =>
          entry.day === 2 && ['rent', 'rates', 'power', 'living'].includes(entry.category),
      )
      .reduce((total, entry) => total + entry.amount, 0);
    expect(day2Costs).toBeLessThan(-250);
    expect(state.cash).toBeCloseTo(cashBefore + 240 + day2Costs, 6);
  });
});
