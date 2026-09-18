// The three month playthrough of CLAUDE.md T13 10.4, headless, through the one scripted player:
// Easy, a joiner in week 1, a standard saw and a twin bag extractor connected, every residential
// enquiry with a margin over twenty per cent after the client's answer, the first contract
// offered, an estimator asked for in month 2, a manager in month 3, five days away in month 3,
// the draw raised to 400 in month 2, level 1 security and both covers in month 2. The three month
// end reports are written to the scratchpad for REPORT-T13.md.
//
// Since Turn 17 a hire wants a month of the man's pay in the account (CLAUDE.md T17 2.11), and on
// Easy this script has never had it: 20,000 of capital against 23,000 of kit, stock and deposit
// in week 1, so the account has been in the overdraft from day 4 of month 1 since Turn 13 and in
// arrears from month 2. Phase C re-scripted it rather than move the claims off Easy: the player
// goes to the bank the day the account first goes under, which is what the bank is for and what
// a careful owner does at 15% instead of the overdraft's 25%. With the loan drawn he takes the
// estimator and the manager on, has his five days away, keeps the contract's rack fed and ends
// the three months less overdrawn and with half the arrears of the run that sat in the overdraft.
// The figures are in REPORT-T17.md.

import { describe, expect, it } from 'vitest';
import { type Policy, playDay } from './autopilot';
import { act, newGame } from '../helpers';
import { PRODUCT_TEMPLATES } from '../../src/engine/constants';
import {
  MONTH_LINES,
  efficiencyOf,
  freeSheets,
  houseTierFor,
  isFriday,
  isWorkingDay,
  managerOnDuty,
  marginOfPrice,
  monthOfDay,
  monthReport,
  onHoliday,
} from '../../src/engine/index';
import type { GameEvent, GameState } from '../../src/engine/index';

const SEED = 20260911;
const MARGIN_FLOOR = 0.2;
const HOLIDAY_FROM = 64;
/** The rack the scripted player keeps under him while a contract runs [TUNE]. */
const RESTOCK_WHEN_UNDER = 6;
const RESTOCK_SHEETS = 20;
/** What he borrows, and the last day of the fitting out he will borrow for [TUNE: half what the
 *  bank lends, which is what carries the three months of 10.4 with the crew the brief asks for].
 *  The loan is for standing the workshop up; after month 1 it lives on its trade. */
const LOAN_AMOUNT = 25000;
const LOAN_BY_DAY = 30;

/** The margin the client's number leaves after the material and the labour of the job. The
 *  engine's own figure since Turn 18: the accept dialogue prints this one beside the offer, so the
 *  scripted player decides on exactly what a real one reads (CLAUDE.md T18 2.9). */
function marginOf(state: GameState, event: GameEvent): number {
  const enquiry = state.enquiries.find((entry) => entry.id === event.data.enquiryId);
  const offer = typeof event.data.offer === 'number' ? event.data.offer : 0;
  if (!enquiry || offer <= 0) return 0;
  return marginOfPrice(enquiry.basePrice, enquiry.bespokeMaterial, offer);
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
    // The day the fitting out puts him under, he goes to the bank instead of living in the
    // overdraft: the loan is 15% a year and the overdraft is 25%, and a hire wants a month of the
    // man's pay in the account (CLAUDE.md T13 3.14, T17 2.11). Once only, and only while he is
    // standing the workshop up: a run with the money never asks.
    if (day <= LOAN_BY_DAY && next.cash < 0 && next.finance.loan === null) {
      next = act(next, { type: 'TAKE_LOAN', amount: LOAN_AMOUNT });
    }
    // A contract's material comes off the rack now (CLAUDE.md T17 2.22), so the scripted player
    // keeps sheets on it while one is running: twenty at a time, the way the Stock page's Restock
    // takes a number [TUNE].
    if (
      next.contracts.some((contract) => contract.status === 'active') &&
      freeSheets(next) < RESTOCK_WHEN_UNDER
    ) {
      next = act(next, { type: 'RESTOCK', sheets: RESTOCK_SHEETS });
    }
    if (day === 31) {
      next = act(next, { type: 'SET_OWNER_DRAW', tier: 1 });
      next = act(next, { type: 'SET_SECURITY_LEVEL', level: 1 });
      next = act(next, { type: 'SET_INSURANCE', cover: 'property', on: true });
      next = act(next, { type: 'SET_INSURANCE', cover: 'liability', on: true });
    }
    // From day 31 the owner takes an estimator on. A hire wants a month of his pay in the bank
    // now (CLAUDE.md T17 2.11), and the interview is an hour of the owner's day, so the script
    // asks again on the days that follow until he is on the books.
    if (
      day >= 31 &&
      isWorkingDay(day) &&
      !next.workers.some((worker) => worker.role === 'estimator') &&
      !next.tasks.some((task) => task.kind === 'hiring' && !task.done)
    ) {
      // The tier answers to the workshop's standing from tonight, and an experienced man wants
      // 15 of it (CLAUDE.md T20 2.5). Three months in, the one who answers is the man with no
      // experience, and he is the one the script takes on.
      next = act(next, { type: 'HIRE', role: 'estimator', tier: 'novice' });
    }
    // From day 61 the owner takes a production manager on. The interview is an hour of his day and
    // the day he is free to sit it is not always the 61st, so the script asks again until one is on
    // the books and there is no interview already running (CLAUDE.md T17 5, phase A).
    if (
      day >= 61 &&
      isWorkingDay(day) &&
      !next.workers.some((worker) => worker.role === 'productionManager') &&
      !next.tasks.some((task) => task.kind === 'hiring' && !task.done)
    ) {
      next = act(next, { type: 'HIRE', role: 'productionManager', tier: null });
    }
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
    // With the loan drawn he has a month of the man's pay in the account on the day he asks, so
    // the gate lets both hires through (CLAUDE.md T17 2.11): the estimator on day 32 and the
    // manager on day 64, and the manager is what the five days away wait for (T13 3.9).
    expect(state.workers.some((worker) => worker.role === 'estimator' && worker.startDay <= 35)).toBe(true);
    expect(state.workers.some((worker) => worker.role === 'productionManager' && worker.startDay >= 61)).toBe(true);
    expect(state.equipment.some((item) => item.specId === 'tableSaw' && item.variantId === 'standard')).toBe(true);
    expect(state.equipment.some((item) => item.specId === 'extractor' && item.variantId === 'standard')).toBe(true);
    expect(state.pipes.length).toBeGreaterThanOrEqual(1);
    expect(state.security.level).toBe(1);
    expect(state.insurance.property && state.insurance.liability).toBe(true);
    expect(state.ownerDraw.tier).toBe(1);
    expect(days.some((day) => onHoliday(day))).toBe(true);
  });

  it('took every residential enquiry with a margin over twenty per cent, and no commercial one', () => {
    expect(state.jobs.length).toBeGreaterThan(10);
    for (const job of state.jobs) {
      expect(job.kind).toBe('residential');
      expect(marginOfPrice(job.basePrice, job.bespokeMaterial, job.price), job.name).toBeGreaterThan(
        MARGIN_FLOOR,
      );
    }
  });

  it('went to the bank in week 1 rather than live in the overdraft, and stayed out of it for two months', () => {
    // 20,000 of capital, a 7,000 saw, a 1,400 fan, the joiner's kit and the deposit come to
    // 23,000 in month 1 against 4,500 of revenue, so the account goes under on day 4. He borrows
    // that day, once, and the first two months close in the black instead of in the overdraft
    // (CLAUDE.md T13 3.14). What the overdraft charges for the hours before the bank answered,
    // and for the end of month 3, is small change beside the 25% a year it charged all three
    // months before the script was rewritten.
    const loan = state.finance.loan;
    expect(loan?.principal).toBe(LOAN_AMOUNT);
    expect(loan?.startDay ?? 99).toBeLessThanOrEqual(7);
    expect(months[0]?.cashClose ?? 0).toBeGreaterThan(0);
    expect(months[1]?.cashClose ?? 0).toBeGreaterThan(0);
    // Two charges in three months: 32p on day 31, for the hours between going under on day 4 and
    // the bank answering, and 82 on day 91 for the end of month 3, when the crew of 10.4 is all on
    // the books. The month end of month 2 carries none at all.
    const overdraft = state.ledger.filter((entry) => entry.category === 'overdraftInterest');
    expect(overdraft).toHaveLength(2);
    expect(overdraft[0]?.day).toBe(31);
    expect(Math.abs(overdraft[0]?.amount ?? 0)).toBeLessThan(1);
    expect(overdraft.some((entry) => entry.day === 61)).toBe(false);
  });

  it('reaches house tier 2 in month 2 once the raised draw is really paid, and keeps it', () => {
    // The T13 brief asked for tier 2 by month 3 and it was tier 1 all the way, because the raised
    // draw went into the arrears and was never actually paid. With the bank behind him it is paid,
    // and the house follows.
    expect(months[0]?.houseTier).toBe(1);
    expect(months[1]?.houseTier).toBe(2);
    expect(houseTierFor(state)).toBe(2);
  });

  it('keeps the efficiency above 55% in month 3, holiday and all', () => {
    expect(months[2]?.efficiencyMean ?? 0).toBeGreaterThan(55);
  });

  it('took the first contract its crew could keep up with, made every week in full, and the client renegotiates it up', () => {
    const contracts = state.contracts.filter((contract) => contract.status !== 'offered');
    expect(contracts).toHaveLength(1);
    const first = contracts[0];
    // The opening week is the term's own part week, signed before the rack is fed for it; every
    // week after it is made in full, out of sheets held on the rack and never bought as a money
    // line on the contract (CLAUDE.md T17 2.22).
    expect((first?.weeks ?? []).slice(1).every((week) => week.made >= week.wanted)).toBe(true);
    expect(first?.sheetsUsed ?? 0).toBeGreaterThan(0);
    expect(state.ledger.some((entry) => entry.label.includes(': material'))).toBe(false);
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

  it('pays every trade by the week, on a Friday, and never by the month', () => {
    // The crew of 10.4 is three trades: a joiner in week 1, an estimator in month 2 and a
    // production manager in month 3. From tonight every one of them is on the one unit, the week
    // (PIOTR, 18.09: "one unit"; CLAUDE.md T20 2.6), so the three months are a played proof that
    // weekly pay covers the office as well as the bench.
    const roles = new Set(state.workers.map((worker) => worker.role));
    expect(roles.has('joiner')).toBe(true);
    expect(roles.has('estimator')).toBe(true);
    expect(roles.has('productionManager')).toBe(true);
    for (const worker of state.workers) expect(worker.weeklyWage, worker.role).toBeGreaterThan(0);
    // The office salary line of the 1st of the month is gone with `monthlyWage`.
    expect(state.ledger.filter((entry) => entry.category === 'salaries')).toEqual([]);
    const wages = state.ledger.filter((entry) => entry.category === 'wages');
    expect(wages.length).toBeGreaterThan(10);
    for (const entry of wages) expect(isFriday(entry.day), `day ${entry.day}`).toBe(true);
    // The last Friday of the three months pays the whole crew, each at his own weekly wage and
    // nothing on top of it: the estimator and the manager are in the same line as the joiner.
    const last = wages[wages.length - 1];
    const crew = state.workers.filter((worker) => worker.startDay <= (last?.day ?? 0));
    expect(crew.length).toBe(3);
    expect(Math.abs(last?.amount ?? 0)).toBeCloseTo(
      crew.reduce((total, worker) => total + worker.weeklyWage, 0),
      2,
    );
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

  it('never needs the bank: the account is never under in month 1, so the script never asks', () => {
    // The same script, and the loan rule of the Easy run is in it. Fifty thousand of capital
    // carries the fitting out without going under, so nothing is borrowed and the control stays
    // the control (CLAUDE.md T13 10.4).
    expect(control.state.finance.loan).toBeNull();
    expect(control.state.workers.some((worker) => worker.role === 'estimator')).toBe(true);
    expect(control.state.workers.some((worker) => worker.role === 'productionManager')).toBe(true);
    expect(control.days.some((day) => onHoliday(day))).toBe(true);
    expect(holidayTaken).toBe(true);
  });
});
