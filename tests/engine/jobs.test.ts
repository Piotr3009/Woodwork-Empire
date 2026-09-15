import { describe, expect, it } from 'vitest';
import {
  ANSWER_MAX,
  ANSWER_MIN,
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
  SHEET_PRICE_AD_HOC,
  SITE_MEASURE_TAXI_COST,
} from '../../src/engine/constants';
import { formatMoney } from '../../src/engine/economy';
import { gateIsCrowded, hallProductivityFactor } from '../../src/engine/machines';
import { emailRatingFactor } from '../../src/engine/reputation';
import { callsForPrice } from '../../src/engine/calls';
import {
  deadlineDaysFor,
  deadlineDaysFrom,
  drawDeadline,
  emailPaymentPenalty,
  findJob,
  minutesRemainingFor,
  ownerJob,
} from '../../src/engine/jobs';
import { stagePlanFor } from '../../src/engine/stages';
import { freeSheets, materialCostFor, sheetsForCost, shortfallOf } from '../../src/engine/materials';
import { startTaskCheck } from '../../src/engine/tasks';
import { missingForHire } from '../../src/engine/staff';
import { isWorkingDay, tick } from '../../src/engine/index';
import type { GameEvent, GameState, Job } from '../../src/engine/index';
import {
  acceptNow,
  act,
  buyNow,
  buyStartingKit,
  withExtraction,
  choose,
  clearEvents,
  doAllEmails,
  doTask,
  eventsOfKind,
  fillRack,
  firstJob,
  hireNow,
  newGame,
  nextDay,
  placeEnquiry,
  runToDay,
  runToStage,
  softwareNow,
} from '../helpers';

/** An Easy game with the day 1 kit bought, a clean board and a full rack. The saw is the budget
 *  one, whose factors are all 1.0: these are the labour figures of CLAUDE.md 8.5, not a test of
 *  what a class of machine does to them (CLAUDE.md T3 3.5). */
function ready(): GameState {
  // A fan big enough for the budget saw: these tests are about the life of a job and not about
  // the extraction sums, which have their own file (CLAUDE.md T10 3.1).
  const state = withExtraction(buyStartingKit(newGame(), { sawVariant: 'budget' }));
  state.enquiries = [];
  return fillRack(state);
}

function accept(state: GameState, price = 400, extra = {}): GameState {
  const enquiry = placeEnquiry(state, { price, ...extra });
  const next = acceptNow(state, enquiry.id, false);
  // These tests are about the per job order and the lorry. The rack is full so that production
  // can run afterwards; the job is told to order all the same (stock is the default since 13.09).
  return next;
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

  it('puts the emails and the drawing on the owner, and the calls in the diary', () => {
    const state = accept(ready());
    const kinds = state.tasks.filter((task) => task.jobId !== null).map((task) => task.kind);
    // A 400 job is one email now, not one per call (CLAUDE.md T3 3.2), and the calls are no
    // longer tasks at all: they ring while the work goes on (CLAUDE.md T4 3.3).
    // The material take off is on the list from the start, behind the drawing (T13 3.8).
    expect(kinds).toEqual(['emails', 'design', 'materialTakeOff']);
    expect(state.tasks.filter((task) => task.kind === 'emails' && task.minutesTotal === 10))
      .toHaveLength(1);
    expect(state.jobs[0]?.calls).toHaveLength(2);
    expect(state.tasks.find((task) => task.kind === 'design')?.minutesTotal).toBe(30);
    expect(state.jobs[0]?.stage).toBe('accepted');
  });

  it('counts the deadline in working days from acceptance, never over a weekend', () => {
    // Fifteen days the workshop is open, starting from the Monday of day 1: three whole weeks
    // and a day, which is day 22 (PIOTR: deadlines never count weekends; CLAUDE.md T10 3.5).
    const state = accept(ready(), 400, { deadlineDays: 15 });
    expect(state.jobs[0]?.dueDay).toBe(22);
    expect(isWorkingDay(state.jobs[0]?.dueDay ?? 0)).toBe(true);
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
      state = buyNow(state, specId);
    }
    state.enquiries = [];
    state = accept(state);
    const design = state.tasks.find((task) => task.kind === 'design');
    const tried = act(state, { type: 'START_TASK', taskId: design?.id ?? '' });
    expect(tried.owner.currentTaskId).toBeNull();
    const licensed = softwareNow(tried, 'oneOff');
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
    const refused = acceptNow(state, table.id, false);
    expect(refused.jobs).toHaveLength(0);
    state = acceptNow(state, table.id, true);
    const job = state.jobs[0];
    expect(job?.byHand).toBe(true);
    expect(job?.labourValue).toBe(12000 * LABOUR_FRACTION);
    // The penalty is on the minutes it takes, not on the labour the job carries (CLAUDE.md 9.5),
    // and it is on every stage of it, because a job made by hand touches no machine at all.
    for (const stage of stagePlanFor(state, job as Job)) {
      expect(stage.byHand, stage.id).toBe(true);
      expect(stage.speed, stage.id).toBeCloseTo(1 / BY_HAND_DURATION_FACTOR, 10);
    }
    expect(minutesRemainingFor(state, job as Job, 1)).toBeCloseTo(
      ((12000 * LABOUR_FRACTION) / OWNER_LABOUR_PER_MINUTE) * BY_HAND_DURATION_FACTOR,
      6,
    );
  });

  it('does not flag a job as by hand when the tools are there', () => {
    let state = ready();
    state = buyNow(state, 'thicknesser');
    state = buyNow(state, 'solidWoodTools');
    const table = placeEnquiry(state, {
      templateId: 'oakDiningTable',
      name: 'Oak dining table',
      price: 12000,
      materialKind: 'solidWood',
      deadlineDays: 50,
      byHandAvailable: true,
    });
    state = acceptNow(state, table.id, true);
    expect(state.jobs[0]?.byHand).toBe(false);
  });
});

describe('the order of the lifecycle', () => {
  it('keeps the material take off shut until the drawing is done, and the calls do not gate it', () => {
    let state = accept(ready());
    // The take off reads the drawing, so it is on the list and cannot be started before it
    // (CLAUDE.md T13 3.8).
    const takeOff = state.tasks.find((task) => task.kind === 'materialTakeOff');
    expect(takeOff).toBeDefined();
    expect(startTaskCheck(state, takeOff?.id ?? '').ok).toBe(false);
    // Two calls are in the diary and not one of them has been taken (CLAUDE.md T4 3.3).
    expect(state.jobs[0]?.calls).toHaveLength(2);
    state = doTask(state, 'design');
    expect(state.jobs[0]?.stage).toBe('accepted');
    expect(startTaskCheck(state, takeOff?.id ?? '').ok).toBe(true);
    // Its sheet was held from the rack when it was taken, so it is ready once the list is made.
    state = doTask(state, 'materialTakeOff');
    expect(state.jobs[0]?.stage).toBe('ready');
  });

  it('holds the sheets from the free stock at accept, and orders a shortfall for the job', () => {
    const held = accept(ready());
    expect(firstJob(held).sheetsReserved).toBe(1);
    expect(freeSheets(held)).toBe(19);
    // A bare rack: nothing to hold, and the shortfall is red until it is ordered for the job at
    // the ad hoc price, on a lorry for tomorrow (CLAUDE.md T13 3.3).
    const bare = ready();
    bare.stock.sheets = 0;
    let state = accept(bare);
    expect(shortfallOf(firstJob(state))).toBe(1);
    state = doTask(doTask(state, 'design'), 'materialTakeOff');
    expect(state.jobs[0]?.stage).toBe('materialPending');
    const before = state.cash;
    state = act(state, { type: 'ORDER_FOR_JOB', jobId: firstJob(state).id });
    expect(before - state.cash).toBe(SHEET_PRICE_AD_HOC);
    expect(state.jobs[0]?.stage).toBe('materialOrdered');
    expect(state.deliveries).toHaveLength(1);
    expect(state.deliveries[0]?.arriveDay).toBe(2);
    expect(state.deliveries[0]?.arrived).toBe(false);
  });

  it('brings the lorry in the next morning and asks for the unloading', () => {
    const bare = ready();
    bare.stock.sheets = 0;
    let state = accept(bare);
    state = doTask(doTask(state, 'design'), 'materialTakeOff');
    state = act(state, { type: 'ORDER_FOR_JOB', jobId: firstJob(state).id });
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
    // 240 minutes of work, and the dinner hour does not count towards them. The day interrupts
    // him on the way: a client rings, the break is put to him, and the work goes on after each.
    const seen: GameEvent[] = [];
    for (let guard = 0; guard < 2000; guard += 1) {
      state = tick(state, 1);
      // The piece standing at the gate is the one question the test answers itself.
      if (state.activeEvent?.kind === 'jobAtGate') break;
      if (state.activeEvent !== null) state = clearEvents(state, seen);
      if (firstJob(state).stage === 'awaitingTransport') break;
    }
    expect(firstJob(state).stage).toBe('awaitingTransport');
    // Making it brought nothing in: the balance waits for the client to have the piece. The cash
    // itself moves on either side of this, because the hall costs money every day it stands there.
    expect(firstJob(state).balancePaid).toBe(0);
    expect(state.ledger.filter((entry) => entry.category === 'jobBalance')).toHaveLength(0);
    expect(state.activeEvent?.kind).toBe('jobAtGate');
    expect(ownerJob(state)).toBeNull();
    // No van, so the courier takes it and the client has it the next working day.
    const beforeCourier = state.cash;
    state = act(clearEvents(state), { type: 'ORDER_TRANSPORT', jobId: firstJob(state).id });
    expect(state.cash).toBeCloseTo(beforeCourier - COURIER_COST, 6);
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
    let state = accept(buyNow(ready(), 'van'), 400, {
      express,
      deadlineDays: 1,
    });
    const job = firstJob(state);
    job.stage = 'ready';
    job.dueDay = 1;
    state = doAllEmails(state);
    state.clock.day = 1 + daysLate;
    state = act(state, { type: 'WORK_HERE', jobId: null });
    state = runToStage(state, 'awaitingTransport');
    state = act(state, { type: 'ORDER_TRANSPORT', jobId: firstJob(state).id });
    // With a van it is a question of whose 90 minutes it is. The owner takes it himself.
    state = act(state, { type: 'RESOLVE_EVENT', choiceId: 'owner' });
    return runToStage(state, 'completed');
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
    // A bare rack, so the sheet is bought for the job and the money moves (CLAUDE.md T13 3.3).
    start.stock.sheets = 0;
    const cashBefore = start.cash;
    let state = accept(start, 400);
    // Day 1: one email, the drawing, the material take off. The calls are in the diary and ring
    // when they ring: they are not desk work any more (CLAUDE.md T4 3.3).
    state = doAllEmails(state);
    state = doTask(state, 'design');
    state = doTask(state, 'materialTakeOff');
    expect(state.clock.minute).toBe(10 + 30 + 30);
    expect(state.owner.minutesByCategory.admin).toBe(40);
    expect(state.owner.minutesByCategory.design).toBe(30);
    state = act(state, { type: 'ORDER_FOR_JOB', jobId: firstJob(state).id });
    // Day 2: the lorry, the unloading, then the bench.
    const events: GameEvent[] = [];
    state = nextDay(state, events);
    expect(state.clock.day).toBe(2);
    state = doTask(state, 'unload');
    expect(state.clock.minute).toBe(45);
    expect(state.jobs[0]?.stage).toBe('ready');
    state = act(state, { type: 'WORK_HERE', jobId: null });
    state = runToStage(state, 'awaitingTransport');
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
    // 200 deposit in, one sheet at the ad hoc price out, 120 courier out, 200 balance in: 80 of
    // the 400 is left (CLAUDE.md 8.4, T13 3.3).
    const jobMoves = day3.ledger
      .filter((entry) =>
        ['jobDeposit', 'jobBalance', 'material', 'transport'].includes(entry.category),
      )
      .map((entry) => entry.amount);
    expect(jobMoves).toEqual([200, -SHEET_PRICE_AD_HOC, -COURIER_COST, 200]);
    expect(jobMoves.reduce((total, value) => total + value, 0)).toBe(80);
    // The daily costs quietly took more than the job left behind.
    const laterCosts = day3.ledger
      .filter(
        (entry) =>
          entry.day >= 2 && ['rent', 'rates', 'power', 'ownerDraw'].includes(entry.category),
      )
      .reduce((total, entry) => total + entry.amount, 0);
    expect(laterCosts).toBeLessThan(-450);
    expect(day3.cash).toBeCloseTo(cashBefore + 80 + laterCosts, 6);
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
      state = acceptNow(state, enquiry.id, false);
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
    let state = clearEvents(buyNow(finished(), 'van'));
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
    let state = clearEvents(buyNow(finished(), 'van'));
    for (const specId of missingForHire(state, 'joiner')) {
      state = buyNow(state, specId);
    }
    state = clearEvents(hireNow(state, 'joiner', 'poor'));
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
    state = clearEvents(buyNow(state, 'van'));
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

  it('never holds the material take off up', () => {
    let state = accept(ready(), 400);
    state = doTask(doTask(state, 'design'), 'materialTakeOff');
    expect(firstJob(state).stage).toBe('ready');
    expect(state.tasks.some((task) => task.kind === 'emails' && !task.done)).toBe(true);
  });
});

describe('the client answers with a number (CLAUDE.md T13 3.24)', () => {
  it('makes the offer the price, keeps the budget, and the deposit follows the offer', () => {
    let state = ready();
    const enquiry = placeEnquiry(state, { price: 10000, deadlineDays: 60 });
    state = act(state, { type: 'ACCEPT_ENQUIRY', enquiryId: enquiry.id, byHand: false });
    // Nothing is booked until the number is answered.
    expect(state.jobs).toHaveLength(0);
    expect(state.activeEvent?.kind).toBe('clientOffer');
    const offer = state.enquiries.find((entry) => entry.id === enquiry.id)?.offer ?? null;
    expect(offer).not.toBeNull();
    expect(state.activeEvent?.body).toContain(
      `The client offers ${formatMoney(offer ?? 0)}. Accept?`,
    );
    expect(state.activeEvent?.choices.map((choice) => choice.id)).toEqual(['accept', 'decline']);
    const cash = state.cash;
    state = choose(state, 'accept');
    const job = firstJob(state);
    expect(job.price).toBe(offer);
    expect(job.budget).toBe(10000);
    expect(job.price / job.budget).toBeGreaterThanOrEqual(ANSWER_MIN - 0.001);
    expect(job.price / job.budget).toBeLessThanOrEqual(ANSWER_MAX + 0.001);
    // Material and labour still come off the base price; the deposit is on what he offered.
    expect(job.materialCost).toBe(materialCostFor(10000, false));
    expect(job.depositPaid).toBe(Math.round(job.price * DEPOSIT_FRACTION * 100) / 100);
    expect(state.cash - cash).toBeCloseTo(job.depositPaid, 6);
    expect(state.enquiries.some((entry) => entry.id === enquiry.id)).toBe(false);
    expect(state.activeEvent).toBeNull();
  });

  it('costs nothing but the enquiry to decline', () => {
    let state = ready();
    const enquiry = placeEnquiry(state, { price: 10000, deadlineDays: 60 });
    state = act(state, { type: 'ACCEPT_ENQUIRY', enquiryId: enquiry.id, byHand: false });
    const cash = state.cash;
    const lines = state.ledger.length;
    const reputation = state.reputation;
    state = choose(state, 'decline');
    expect(state.jobs).toHaveLength(0);
    expect(state.enquiries.some((entry) => entry.id === enquiry.id)).toBe(false);
    expect(state.cash).toBe(cash);
    expect(state.ledger).toHaveLength(lines);
    expect(state.reputation).toBe(reputation);
    expect(state.activeEvent).toBeNull();
  });

  it('asks once: the number stands until it is answered', () => {
    let state = ready();
    const enquiry = placeEnquiry(state, { price: 10000, deadlineDays: 60 });
    state = act(state, { type: 'ACCEPT_ENQUIRY', enquiryId: enquiry.id, byHand: false });
    const offer = state.enquiries.find((entry) => entry.id === enquiry.id)?.offer;
    state = act(state, { type: 'ACCEPT_ENQUIRY', enquiryId: enquiry.id, byHand: false });
    expect(state.enquiries.find((entry) => entry.id === enquiry.id)?.offer).toBe(offer);
    expect(state.eventQueue.filter((event) => event.kind === 'clientOffer')).toHaveLength(0);
    expect(state.activeEvent?.kind).toBe('clientOffer');
  });
});

describe('the deadline\'s one draw (CLAUDE.md T6 3.7, T13 3.15)', () => {
  it('is taken once, read as often as wanted, and reads what the draw would have given', () => {
    const state = newGame();
    const job = { ownerDays: 6, price: 5000, express: false };
    // The same cursor, read straight and read through the draw: one figure.
    const straight = deadlineDaysFor({ ...state, rng: state.rng }, job);
    const draw = drawDeadline(state);
    expect(deadlineDaysFrom(draw, job)).toBe(straight);
    expect(deadlineDaysFrom(draw, job)).toBe(straight);
    // The draw moved the stream by exactly one step, like the straight reading does.
    const moved = { ...newGame(), rng: newGame().rng };
    deadlineDaysFor(moved, job);
    expect(state.rng).toBe(moved.rng);
  });

  it('gives the larger work of a commercial job more days off the same draw', () => {
    const state = newGame();
    const draw = drawDeadline(state);
    const residential = deadlineDaysFrom(draw, { ownerDays: 4, price: 4000, express: false });
    const commercial = deadlineDaysFrom(draw, { ownerDays: 10, price: 10000, express: false });
    expect(commercial).toBeGreaterThan(residential);
  });
});
