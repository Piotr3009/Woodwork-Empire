// The three month playthrough of CLAUDE.md T13 10.4, headless, through the one scripted player:
// Easy, a joiner in week 1, a standard saw and a twin bag extractor connected, every residential
// enquiry with a margin over twenty per cent after the client's answer, the first contract
// offered, an estimator in month 2, a manager in month 3, five days away in month 3, the draw
// raised to 400 in month 2, level 1 security and both covers in month 2. The three month end
// reports are written to the scratchpad for REPORT-T13.md.

import { describe, expect, it } from 'vitest';
import { type Policy, playDay } from './autopilot';
import { act, newGame } from '../helpers';
import { PRODUCT_TEMPLATES } from '../../src/engine/constants';
import {
  MONTH_LINES,
  efficiencyOf,
  houseTierFor,
  isWorkingDay,
  labourValueFor,
  managerOnDuty,
  materialCostFor,
  monthOfDay,
  monthReport,
  onHoliday,
} from '../../src/engine/index';
import type { GameEvent, GameState } from '../../src/engine/index';

const SEED = 20260911;
const MARGIN_FLOOR = 0.2;
const HOLIDAY_FROM = 64;

/** The margin the client's number leaves after the material and the labour of the job. */
function marginOf(state: GameState, event: GameEvent): number {
  const enquiry = state.enquiries.find((entry) => entry.id === event.data.enquiryId);
  const offer = typeof event.data.offer === 'number' ? event.data.offer : 0;
  if (!enquiry || offer <= 0) return 0;
  const cost = materialCostFor(enquiry.basePrice, enquiry.bespokeMaterial) + labourValueFor(enquiry.basePrice);
  return (offer - cost) / offer;
}

let holidayTaken = false;

const PLAYTHROUGH: Policy = {
  maxOpenJobs: 3,
  buyKit: true,
  cleanAbove: 55,
  wanted: PRODUCT_TEMPLATES.filter((entry) => entry.material === 'sheet').map((entry) => entry.id),
  hireJoiner: true,
  stockSheets: 0,
  sawVariant: 'standard',
  extractorVariant: 'standard',
  takeContracts: true,
  licence: 'subscription',
  acceptOffer: (state, event) => {
    const enquiry = state.enquiries.find((entry) => entry.id === event.data.enquiryId);
    if (!enquiry || enquiry.kind !== 'residential') return false;
    return marginOf(state, event) > MARGIN_FLOOR;
  },
  onDay: (current, day) => {
    let next = current;
    if (day === 31) {
      next = act(next, { type: 'HIRE', role: 'estimator', tier: 'normal' });
      next = act(next, { type: 'SET_OWNER_DRAW', tier: 1 });
      next = act(next, { type: 'SET_SECURITY_LEVEL', level: 1 });
      next = act(next, { type: 'SET_INSURANCE', cover: 'property', on: true });
      next = act(next, { type: 'SET_INSURANCE', cover: 'liability', on: true });
    }
    if (day === 61) next = act(next, { type: 'HIRE', role: 'productionManager', tier: null });
    if (day >= HOLIDAY_FROM && !holidayTaken && isWorkingDay(day) && managerOnDuty(next)) {
      next = act(next, { type: 'TAKE_HOLIDAY', days: 5 });
      holidayTaken = onHoliday(next);
    }
    return next;
  },
};

interface MonthLog {
  month: number;
  cashOpen: number;
  cashClose: number;
  reputation: number;
  jobsDelivered: number;
  efficiencyMean: number;
  houseTier: number;
}

function play(difficulty: 'easy' | 'veryEasy'): { state: GameState; days: GameState[]; events: GameEvent[]; months: MonthLog[] } {
  holidayTaken = false;
  const events: GameEvent[] = [];
  const days: GameState[] = [];
  let state = newGame({ seed: SEED, difficulty });
  const months: MonthLog[] = [];
  let openCash = state.cash;
  let deliveredBefore = 0;
  let logged = 0;
  while (state.clock.day < 91 && state.gameOver === null) {
    state = playDay(state, PLAYTHROUGH, events);
    days.push(state);
    // A month is written up the morning after its last day, weekend or not.
    while (logged < monthOfDay(state.clock.day) - 1) {
      logged += 1;
      const month = logged;
      const inMonth = state.days.filter((day) => monthOfDay(day.day) === month && day.efficiency.possible > 0);
      const delivered = state.jobs.filter((job) => job.stage === 'completed').length;
      months.push({
        month,
        cashOpen: Math.round(openCash),
        cashClose: Math.round(state.cash),
        reputation: state.reputation,
        jobsDelivered: delivered - deliveredBefore,
        efficiencyMean:
          inMonth.reduce((total, day) => total + efficiencyOf(day.efficiency).percent, 0) /
          Math.max(1, inMonth.length),
        houseTier: houseTierFor(state),
      });
      openCash = state.cash;
      deliveredBefore = delivered;
    }
  }
  return { state, days, events, months };
}

const played = play('easy');
const { state, days, months } = played;
const control = play('veryEasy');

describe('the three month playthrough of 10.4, on Easy as the brief scripts it', () => {
  it('has the crew, the kit and the paper the brief asked for, in the order it asked', () => {
    expect(state.gameOver).toBeNull();
    expect(state.clock.day).toBeGreaterThanOrEqual(91);
    const joiner = state.workers.find((worker) => worker.role === 'joiner');
    expect(joiner?.startDay).toBeLessThanOrEqual(5);
    expect(state.workers.some((worker) => worker.role === 'estimator' && worker.startDay <= 35)).toBe(true);
    expect(state.workers.some((worker) => worker.role === 'productionManager' && worker.startDay >= 61)).toBe(true);
    expect(state.equipment.some((item) => item.specId === 'tableSaw' && item.variantId === 'standard')).toBe(true);
    expect(state.equipment.some((item) => item.specId === 'extractor' && item.variantId === 'standard')).toBe(true);
    expect(state.pipes.length).toBeGreaterThanOrEqual(1);
    expect(state.security.level).toBe(1);
    expect(state.insurance.property && state.insurance.liability).toBe(true);
    expect(state.ownerDraw.tier).toBe(1);
    expect(holidayTaken).toBe(true);
    expect(days.some((day) => onHoliday(day))).toBe(true);
  });

  it('took every residential enquiry with a margin over twenty per cent, and no commercial one', () => {
    expect(state.jobs.length).toBeGreaterThan(10);
    for (const job of state.jobs) {
      expect(job.kind).toBe('residential');
      const cost = materialCostFor(job.basePrice, job.bespokeMaterial) + labourValueFor(job.basePrice);
      expect((job.price - cost) / job.price, job.name).toBeGreaterThan(MARGIN_FLOOR);
    }
  });

  it('never took the loan, and the account went into the overdraft on the standard saw', () => {
    // The brief's "cash never hits the overdraft interest line without the loan" does not hold
    // on Easy: 20,000 of capital, a 7,000 saw, a 1,400 fan, the joiner's kit and the deposit come
    // to 23,000 in month 1 against 4,500 of revenue. Measured, and reported in REPORT-T13.md
    // section 0; the same script on Very easy is the control below.
    expect(state.finance.loan).toBeNull();
    expect(state.ledger.some((entry) => entry.category === 'loan')).toBe(false);
    expect(months[0]?.cashClose ?? 0).toBeLessThan(0);
    expect(state.ledger.some((entry) => entry.category === 'overdraftInterest')).toBe(true);
  });

  it.todo(
    'cash never hits the overdraft interest line without the loan (measured on Easy: -3,784 at ' +
      'the end of month 1, the interest line on day 61, arrears from the middle of month 2)',
  );

  it.todo(
    'the house tier reaches 2 in month 3 (measured on Easy: tier 1 all the way, because the ' +
      'raised draw went to the arrears and was never actually paid; on Very easy it reaches 2 in month 2)',
  );

  it('keeps the efficiency above 55% in month 3, holiday and all', () => {
    expect(months[2]?.efficiencyMean ?? 0).toBeGreaterThan(55);
  });

  it('took the first contract offered, made every week in full, and the client renegotiates it up', () => {
    const contracts = state.contracts.filter((contract) => contract.status !== 'offered');
    expect(contracts).toHaveLength(1);
    const first = contracts[0];
    expect(first?.weeks.every((week) => week.made >= week.wanted)).toBe(true);
    // The term runs past the three months: the same script plays on until the client's answer.
    let later = state;
    let guard = 0;
    while (
      later.contracts.every((contract) => contract.renegotiatedPrice === null) &&
      later.gameOver === null &&
      guard < 200
    ) {
      later = playDay(later, PLAYTHROUGH);
      guard += 1;
    }
    const ended = later.contracts.find((contract) => contract.renegotiatedPrice !== null);
    expect(ended).toBeDefined();
    expect(ended?.renegotiatedPrice ?? 0).toBeGreaterThan(ended?.pricePerPiece ?? Infinity);
  });

  it('has every line on each month end report, and the lines sum to the cash delta', () => {
    for (const month of [1, 2, 3]) {
      const report = monthReport(state, month);
      expect(report.lines.map((line) => line.id)).toEqual(MONTH_LINES.map((line) => line.id));
      expect(report.cashClose - report.cashOpen).toBeCloseTo(report.net, 1);
    }
  });

  it('writes the log for REPORT-T13.md', () => {
    // Printed once, on one line, for the session to pick up.
    console.log(
      'PLAYTHROUGH ' +
        JSON.stringify({
          easy: {
            months,
            gameOver: state.gameOver,
            arrears: state.finance.arrearsAmount,
            reputation: state.reputation,
            delivered: state.jobs.filter((job) => job.stage === 'completed').length,
            workers: state.workers.map((worker) => [worker.role, worker.tier, worker.startDay]),
            contracts: state.contracts.map((contract) => ({
              name: contract.name,
              quantityPerWeek: contract.quantityPerWeek,
              termWeeks: contract.termWeeks,
              pricePerPiece: contract.pricePerPiece,
              weeks: contract.weeks,
            })),
            reputationLog: state.reputationLog.filter((entry) => entry.day >= 61),
            reports: [1, 2, 3].map((month) => monthReport(state, month)),
          },
          veryEasy: {
            months: control.months,
            gameOver: control.state.gameOver,
            arrears: control.state.finance.arrearsAmount,
            cash: control.state.cash,
            reputation: control.state.reputation,
            houseTier: houseTierFor(control.state),
            reputationLog: control.state.reputationLog.filter((entry) => entry.day >= 61),
            reports: [1, 2, 3].map((month) => monthReport(control.state, month)),
          },
        }),
    );
  });
});

describe('the same script on Very easy, the control', () => {
  it('reaches house tier 2 in month 2 once the raised draw has really gone out, and keeps it', () => {
    expect(control.state.gameOver).toBeNull();
    expect(control.months[0]?.houseTier).toBe(1);
    expect(control.months[1]?.houseTier).toBe(2);
    expect(houseTierFor(control.state)).toBe(2);
  });

  it('never takes the loan, and pays no overdraft interest until the manager, the holiday and the draw meet in month 3', () => {
    expect(control.state.finance.loan).toBeNull();
    const interest = control.state.ledger.filter((entry) => entry.category === 'overdraftInterest');
    expect(interest.every((entry) => entry.day > 61)).toBe(true);
    expect(control.months[1]?.cashClose ?? 0).toBeGreaterThan(0);
  });

  it('keeps the efficiency above 55% in months 2 and 3', () => {
    expect(control.months[1]?.efficiencyMean ?? 0).toBeGreaterThan(55);
    expect(control.months[2]?.efficiencyMean ?? 0).toBeGreaterThan(55);
  });
});
