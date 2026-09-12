import { describe, expect, it } from 'vitest';
import {
  BY_HAND_DURATION_FACTOR,
  COURIER_COST,
  DEPOSIT_FRACTION,
  GATE_CROWD_FACTOR,
  OWN_DELIVERY_MINUTES,
  LABOUR_FRACTION,
  LATE_PENALTY_PER_DAY,
  LATE_PENALTY_PER_DAY_EXPRESS,
  MATERIAL_FRACTION,
  OWNER_JOB_VALUE_PER_DAY,
  OWNER_LABOUR_PER_MINUTE,
  RATING_ON_TIME,
  SITE_MEASURE_TAXI_COST,
} from '../../src/engine/constants';
import {
  gateIsCrowded,
  hallProductivityFactor,
  machineLabourFactor,
} from '../../src/engine/machines';
import { emailRatingFactor } from '../../src/engine/reputation';
import { callsForPrice } from '../../src/engine/tasks';
import {
  emailPaymentPenalty,
  findJob,
  jobSpeedFactor,
  minutesRemainingFor,
  ownerJob,
} from '../../src/engine/jobs';
import { materialCostFor, sheetsForCost } from '../../src/engine/materials';
import { missingForHire } from '../../src/engine/staff';
import { tick } from '../../src/engine/index';
import type { GameEvent, GameState, Job } from '../../src/engine/index';
import {
  act,
  buyStartingKit,
  clearEvents,
  doAllEmails,
  doTask,
  fillRack,
  eventsOfKind,
  firstJob,
  newGame,
  nextDay,
  placeEnquiry,
  runToDay,
} from '../helpers';

/** An Easy game with the day 1 kit bought, a clean board and a full rack. */
function ready(): GameState {
  const state = buyStartingKit(newGame());
  state.enquiries = [];
  return fillRack(state);
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
    expect(job?.labourRemaining).toBe(160);
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

  it('puts the calls, the emails and the drawing on the owner', () => {
    const state = accept(ready());
    const kinds = state.tasks.filter((task) => task.jobId !== null).map((task) => task.kind);
    // A 400 job is one email now, not one per call (CLAUDE.md T3 3.2).
    expect(kinds).toEqual(['clientCall', 'clientCall', 'emails', 'design']);
    expect(state.tasks.filter((task) => task.kind === 'emails' && task.minutesTotal === 10))
      .toHaveLength(1);
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
    expect(state.tasks.find((task) => task.kind === 'siteMeasure')?.done).toBe(true);
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
    expect(job?.labourValue).toBe(12000 * LABOUR_FRACTION);
    // The penalty is on the minutes it takes, not on the labour the job carries (CLAUDE.md 9.5).
    expect(jobSpeedFactor(state, job as Job)).toBe(BY_HAND_DURATION_FACTOR);
    expect(minutesRemainingFor(state, job as Job, 1)).toBeCloseTo(
      ((12000 * LABOUR_FRACTION) / OWNER_LABOUR_PER_MINUTE) * BY_HAND_DURATION_FACTOR,
      6,
    );
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
      lastServiceDay: 1,
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
      lastServiceDay: 1,
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
    expect(minutesRemainingFor(state, firstJob(state), 1)).toBeCloseTo(240, 6);
    state = act(state, { type: 'WORK_HERE', jobId: null });
    expect(state.jobs[0]?.stage).toBe('inProduction');
    expect(ownerJob(state)?.id).toBe(state.jobs[0]?.id);
    state = tick(state, 239);
    expect(state.jobs[0]?.stage).toBe('inProduction');
    state = tick(state, 1);
    // Made, not delivered: it stands at the gate until transport is ordered (CLAUDE.md T2 3.7).
    expect(state.jobs[0]?.stage).toBe('awaitingTransport');
    expect(state.owner.minutesByCategory.workshop).toBe(240);
  });

  it('pays nothing until the client has it, then the balance and the rating', () => {
    let state = accept(ready());
    const afterDeposit = state.cash;
    firstJob(state).stage = 'ready';
    state = doAllEmails(state);
    const afterEmails = state.cash;
    expect(afterEmails).toBe(afterDeposit);
    state = act(state, { type: 'WORK_HERE', jobId: null });
    state = tick(state, 240);
    expect(firstJob(state).stage).toBe('awaitingTransport');
    expect(state.cash).toBeCloseTo(afterDeposit, 6);
    expect(state.activeEvent?.kind).toBe('jobAtGate');
    expect(ownerJob(state)).toBeNull();
    // No van, so the courier takes it and the client has it the next working day.
    state = act(clearEvents(state), { type: 'ORDER_TRANSPORT', jobId: firstJob(state).id });
    expect(state.cash).toBeCloseTo(afterDeposit - COURIER_COST, 6);
    const run = runToDay(clearEvents(state), 2);
    const job = run.state.jobs[0];
    expect(job?.stage).toBe('completed');
    expect(job?.balancePaid).toBe(200);
    expect(job?.penalty).toBe(0);
    expect(job?.rating).toBe(3);
    expect(run.state.reputation).toBe(3);
    expect(eventsOfKind(run.events, 'jobPaid')).toHaveLength(1);
  });

  it('works at 0.6667 of job value a minute, so 800 of job value fills a day', () => {
    // CLAUDE.md 8.5: 800 of job value a day, of which 0.40 is labour value.
    expect(OWNER_LABOUR_PER_MINUTE * 480).toBeCloseTo(OWNER_JOB_VALUE_PER_DAY * LABOUR_FRACTION, 6);
    expect(OWNER_JOB_VALUE_PER_DAY * LABOUR_FRACTION).toBe(320);
  });
});

describe('late delivery', () => {
  /** With a van the piece goes out the same day, so the lateness is the day it was made. */
  function lateJob(express: boolean, daysLate: number): GameState {
    let state = accept(act(ready(), { type: 'BUY_EQUIPMENT', specId: 'van' }), 400, {
      express,
      deadlineDays: 1,
    });
    const job = firstJob(state);
    job.stage = 'ready';
    job.dueDay = 1;
    state = doAllEmails(state);
    state.clock.day = 1 + daysLate;
    state = act(state, { type: 'WORK_HERE', jobId: null });
    state = clearEvents(tick(state, 240));
    state = act(state, { type: 'ORDER_TRANSPORT', jobId: firstJob(state).id });
    // With a van it is a question of whose 90 minutes it is. The owner takes it himself.
    state = act(state, { type: 'RESOLVE_EVENT', choiceId: 'owner' });
    return clearEvents(tick(state, OWN_DELIVERY_MINUTES));
  }

  it('takes 5% of the price a day out of the balance', () => {
    const state = lateJob(false, 3);
    const job = state.jobs[0];
    expect(job?.daysLate).toBe(3);
    expect(job?.penalty).toBeCloseTo(3 * LATE_PENALTY_PER_DAY * 400, 6);
    expect(job?.balancePaid).toBeCloseTo(140, 6);
    expect(job?.rating).toBe(-3);
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
    // Day 1: two calls, one email, the drawing, the material order.
    state = doTask(state, 'clientCall');
    state = doTask(state, 'clientCall');
    state = doAllEmails(state);
    state = doTask(state, 'design');
    state = doTask(state, 'materialOrder');
    expect(state.clock.minute).toBe(15 + 15 + 10 + 30 + 30);
    expect(state.owner.minutesByCategory.admin).toBe(70);
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
    expect(state.jobs[0]?.stage).toBe('awaitingTransport');
    // Day 2: the courier is booked, and the client has it on day 3.
    state = act(clearEvents(state), { type: 'ORDER_TRANSPORT', jobId: state.jobs[0]?.id ?? '' });
    const day3 = runToDay(clearEvents(state), 3).state;
    const job = findJob(day3, day3.jobs[0]?.id ?? '');
    expect(job?.stage).toBe('completed');
    expect(job?.completedDay).toBe(3);
    expect(job?.daysLate).toBe(0);
    expect(job?.rating).toBe(3);
    expect(day3.reputation).toBe(3);
    // 200 deposit in, 160 material out, 120 courier out, 200 balance in: 120 of the 400 is left.
    const jobMoves = day3.ledger
      .filter((entry) =>
        ['jobDeposit', 'jobBalance', 'material', 'transport'].includes(entry.category),
      )
      .map((entry) => entry.amount);
    expect(jobMoves).toEqual([200, -160, -COURIER_COST, 200]);
    expect(jobMoves.reduce((total, value) => total + value, 0)).toBe(120);
    // The daily costs quietly took more than the job left behind.
    const laterCosts = day3.ledger
      .filter(
        (entry) =>
          entry.day >= 2 && ['rent', 'rates', 'power', 'living'].includes(entry.category),
      )
      .reduce((total, entry) => total + entry.amount, 0);
    expect(laterCosts).toBeLessThan(-450);
    expect(day3.cash).toBeCloseTo(cashBefore + 120 + laterCosts, 6);
  });
});

describe('machine reductions act on the minutes, every minute', () => {
  function cncInto(state: GameState): GameState {
    state.equipment.push({
      id: 'kit-cnc',
      specId: 'cnc',
      spriteKey: 'cnc',
      anchorX: 12,
      anchorY: 7,
      minutesUsed: 0,
      bagFull: false,
      broken: false,
      lastServiceDay: 1,
      purchasePrice: 45000,
    });
    return state;
  }

  it('shortens a job that is already on the books', () => {
    const state = accept(ready());
    firstJob(state).stage = 'ready';
    const working = act(state, { type: 'WORK_HERE', jobId: null });
    const plain = tick(working, 60);
    const withCnc = tick(cncInto(act(state, { type: 'WORK_HERE', jobId: null })), 60);
    const plainDone = 160 - firstJob(plain).labourRemaining;
    const cncDone = 160 - firstJob(withCnc).labourRemaining;
    // A CNC cuts the labour of every job by 20%, so the same hour gets 25% more of it done.
    expect(cncDone).toBeCloseTo(plainDone / 0.8, 6);
    expect(jobSpeedFactor(withCnc, firstJob(withCnc))).toBeCloseTo(0.8, 10);
  });

  it('lengthens it again when the bailiff takes the machine away', () => {
    const state = cncInto(accept(ready()));
    const job = firstJob(state);
    const fast = minutesRemainingFor(state, job, 1);
    state.equipment = state.equipment.filter((item) => item.specId !== 'cnc');
    expect(minutesRemainingFor(state, job, 1)).toBeCloseTo(fast / 0.8, 6);
  });

  it('still takes 240 minutes for a 400 job in a workshop with no reductions', () => {
    const state = accept(ready());
    expect(minutesRemainingFor(state, firstJob(state), 1)).toBeCloseTo(240, 6);
  });
});

describe('an express job, on the Turn 2 rules', () => {
  it('charges material and labour against the base price, so the uplift is pure profit', () => {
    // A 400 shelves job taken as express: the client pays 480, the workshop still spends 400.
    const state = accept(ready(), 480, { express: true, basePrice: 400 });
    const job = firstJob(state);
    expect(job.price).toBe(480);
    expect(job.basePrice).toBe(400);
    expect(job.materialCost).toBe(400 * MATERIAL_FRACTION);
    expect(job.labourValue).toBe(400 * LABOUR_FRACTION);
    // The deposit, and later the balance, come off the full price the client agreed to.
    expect(job.depositPaid).toBe(480 * DEPOSIT_FRACTION);
  });

  it('leaves a standard job with the base price it came in on', () => {
    const job = firstJob(accept(ready(), 900));
    expect(job.basePrice).toBe(900);
    expect(job.materialCost).toBe(900 * MATERIAL_FRACTION);
  });
});

describe('the piece at the gate', () => {
  function finished(count = 1): GameState {
    let state = ready();
    for (let index = 0; index < count; index += 1) {
      const enquiry = placeEnquiry(state, { price: 400 + index * 10, deadlineDays: 60 });
      state = act(state, { type: 'ACCEPT_ENQUIRY', enquiryId: enquiry.id, byHand: false });
      state = doAllEmails(state);
      const job = state.jobs[index];
      if (job) {
        job.stage = 'awaitingTransport';
        job.finishedDay = 1;
      }
    }
    return state;
  }

  it('pays the courier and delivers on the next working day without a van', () => {
    let state = finished();
    const before = state.cash;
    state = act(state, { type: 'ORDER_TRANSPORT', jobId: firstJob(state).id });
    expect(before - state.cash).toBe(COURIER_COST);
    expect(firstJob(state).deliverOnDay).toBe(2);
    expect(firstJob(state).stage).toBe('awaitingTransport');
    const run = runToDay(clearEvents(state), 2);
    expect(run.state.jobs[0]?.stage).toBe('completed');
    expect(run.state.jobs[0]?.balancePaid).toBe(200);
  });

  it('costs 90 minutes and no money with a van, and goes the same day', () => {
    let state = clearEvents(act(finished(), { type: 'BUY_EQUIPMENT', specId: 'van' }));
    const before = state.cash;
    state = act(state, { type: 'ORDER_TRANSPORT', jobId: firstJob(state).id });
    expect(state.cash).toBe(before);
    // The van run is a job of work, so the game asks whose minutes it costs.
    expect(state.activeEvent?.kind).toBe('jobAtGate');
    state = act(state, { type: 'RESOLVE_EVENT', choiceId: 'owner' });
    const task = state.tasks.find((entry) => entry.kind === 'deliver' && !entry.done);
    expect(task?.minutesTotal).toBe(OWN_DELIVERY_MINUTES);
    expect(state.owner.currentTaskId).toBe(task?.id);
    state = tick(state, OWN_DELIVERY_MINUTES);
    expect(firstJob(state).stage).toBe('completed');
    expect(firstJob(state).completedDay).toBe(1);
    expect(state.owner.minutesByCategory.workshop).toBe(OWN_DELIVERY_MINUTES);
  });

  it('slows the whole hall to 0.7 above three pieces at the gate', () => {
    expect(gateIsCrowded(finished(3))).toBe(false);
    const crowded = finished(4);
    expect(gateIsCrowded(crowded)).toBe(true);
    expect(hallProductivityFactor(crowded)).toBeCloseTo(GATE_CROWD_FACTOR, 6);
    expect(hallProductivityFactor(finished(3))).toBeCloseTo(1, 6);
  });

  it('lets a joiner take the van run instead of the owner', () => {
    let state = clearEvents(act(finished(), { type: 'BUY_EQUIPMENT', specId: 'van' }));
    for (const specId of missingForHire(state, 'joiner')) {
      state = act(state, { type: 'BUY_EQUIPMENT', specId });
    }
    state = clearEvents(act(state, { type: 'HIRE', role: 'joiner', tier: 'poor' }));
    const joiner = state.workers[0];
    if (joiner) joiner.startDay = state.clock.day;
    state = act(state, { type: 'ORDER_TRANSPORT', jobId: firstJob(state).id });
    expect((state.activeEvent?.choices ?? []).map((choice) => choice.id)).toEqual([
      'owner',
      'joiner',
      'later',
    ]);
    state = act(state, { type: 'RESOLVE_EVENT', choiceId: 'joiner' });
    const task = state.tasks.find((entry) => entry.kind === 'deliver' && !entry.done);
    expect(task).toBeDefined();
    expect(state.workers[0]?.taskId).toBe(task?.id);
    expect(state.owner.currentTaskId).toBeNull();
  });

  it('never books the same piece out twice', () => {
    let state = finished();
    state = act(state, { type: 'ORDER_TRANSPORT', jobId: firstJob(state).id });
    const cash = state.cash;
    state = act(state, { type: 'ORDER_TRANSPORT', jobId: firstJob(state).id });
    expect(state.cash).toBe(cash);
  });
});

describe('emails nobody answered', () => {
  // A 20000 job carries three emails, which is enough of them to be worth ignoring.
  function delivered(answer: number): GameState {
    let state = accept(ready(), 20000);
    for (let index = 0; index < answer; index += 1) state = doTask(state, 'emails');
    const job = firstJob(state);
    job.stage = 'awaitingTransport';
    job.finishedDay = 1;
    state = clearEvents(act(state, { type: 'BUY_EQUIPMENT', specId: 'van' }));
    state = act(state, { type: 'ORDER_TRANSPORT', jobId: job.id });
    state = act(state, { type: 'RESOLVE_EVENT', choiceId: 'owner' });
    return clearEvents(tick(state, OWN_DELIVERY_MINUTES));
  }

  it('carries the count its price asks for, which is not the call curve', () => {
    const emailsFor = (price: number): number =>
      accept(ready(), price).tasks.filter((task) => task.kind === 'emails').length;
    expect(emailsFor(400)).toBe(1);
    expect(emailsFor(2000)).toBe(1);
    expect(emailsFor(5000)).toBe(2);
    expect(emailsFor(20000)).toBe(3);
    // Two calls on a small job, one email: they parted company in Turn 3.
    expect(callsForPrice(400)).toBe(2);
  });

  it('takes 1% of the price off the payment each, capped at 5%', () => {
    expect(emailPaymentPenalty(1000, 0)).toBe(0);
    expect(emailPaymentPenalty(1000, 1)).toBe(10);
    expect(emailPaymentPenalty(1000, 3)).toBe(30);
    expect(emailPaymentPenalty(1000, 9)).toBe(50);
  });

  it('reduces the payment and the rating of the job it belongs to', () => {
    const clean = delivered(3);
    expect(firstJob(clean).emailsUnanswered).toBe(0);
    expect(firstJob(clean).balancePaid).toBe(10000);
    expect(firstJob(clean).rating).toBe(RATING_ON_TIME);

    const sloppy = delivered(0);
    expect(firstJob(sloppy).emailsUnanswered).toBe(3);
    // Three of them, 1% of the price each, off a balance of 10000.
    expect(firstJob(sloppy).balancePaid).toBe(10000 - 600);
    // The gain is multiplied by 1 less 0.2 per email: 3 by 0.4.
    expect(firstJob(sloppy).rating).toBeCloseTo(RATING_ON_TIME * 0.4, 6);
    expect(emailRatingFactor(5)).toBe(0);
  });

  it('never holds the material order up', () => {
    let state = accept(ready(), 400);
    state = doTask(state, 'clientCall');
    state = doTask(state, 'clientCall');
    state = doTask(state, 'design');
    expect(firstJob(state).stage).toBe('materialPending');
    expect(state.tasks.some((task) => task.kind === 'emails' && !task.done)).toBe(true);
  });
});
