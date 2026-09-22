// The three month playthrough of CLAUDE.md T13 10.4, headless, through the one scripted player:
// Easy, a joiner in week 1, a standard saw and a twin bag extractor connected, every residential
// enquiry with a margin over twenty per cent after the client's answer, the first contract
// offered, an estimator asked for in month 2, a manager in month 3, five days away in month 3,
// the draw raised to 400 in month 2, level 1 security and both covers in month 2. The three month
// end reports are written to the scratchpad for REPORT-T13.md.
//
// Since Turn 17 a hire wants a month of the man's pay in the account (CLAUDE.md T17 2.11), and on
// Easy this script has never had it: 20,000 of capital against 23,000 of kit, stock and deposit
// in week 1, so the account has been in the overdraft from day 4 of month 1 since Turn 13, and
// until tonight what it could not carry piled up beside it. Turn 17's phase C re-scripted the run
// rather than move the claims off Easy: the player goes to the bank the day the account first goes
// under, which is what the bank is for and what a careful owner does at 15% instead of the
// overdraft's 25%. With the loan drawn he takes the estimator and the manager on, has his five
// days away, keeps the contract's rack fed and ends the three months a few thousand overdrawn. The
// figures of that run are in REPORT-T17.md.
//
// From Turn 22 there is one track for money: every bill goes through the account, the overdraft
// limit included, and nothing waits anywhere else (CLAUDE.md T22 2.1). Measured on this build, the
// three month end reports close at 23,195, 11,891 and -4,279, not one line of the whole run is
// unpaid, and the fate of the fourth month is in the contract's own claim below (T22-C2).

import { describe, expect, it } from 'vitest';
import { type Policy, playDay } from './autopilot';
import { act, newGame } from '../helpers';
import { LOAN_FLOOR, PRODUCT_TEMPLATES } from '../../src/engine/constants';
import {
  MONTH_LINES,
  efficiencyOf,
  freeSheets,
  houseTierFor,
  isLastWorkingDayOfMonth,
  hiringOptions,
  isWorkingDay,
  loanLimit,
  managerOnDuty,
  marginOfPrice,
  monthOfDay,
  monthReport,
  onHoliday,
  renegotiatedPriceFor,
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
    // He asks for twenty five thousand and takes what the bank will lend him against the books he
    // can show it, which on day 8 of a new company is the floor of Turn 23's 2.12: no player can
    // borrow what the bank has refused, and an attentive one borrows what it will give
    // (CLAUDE.md T23 2.12).
    if (day <= LOAN_BY_DAY && next.cash < 0 && next.finance.loan === null) {
      next = act(next, { type: 'TAKE_LOAN', amount: Math.min(LOAN_AMOUNT, loanLimit(next)) });
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
    //
    // The manager comes in four grades from Turn 23, each behind its own standing and its own
    // wage, so the scripted player takes the best grade the workshop has actually earned rather
    // than naming one and going without when the advert brings nobody (CLAUDE.md T23 2.4).
    if (
      day >= 61 &&
      isWorkingDay(day) &&
      !next.workers.some((worker) => worker.role === 'productionManager') &&
      !next.tasks.some((task) => task.kind === 'hiring' && !task.done)
    ) {
      const best = hiringOptions(next)
        .filter((option) => option.role === 'productionManager' && option.available)
        .pop();
      if (best) next = act(next, { type: 'HIRE', role: best.role, tier: best.tier });
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

/** **What Turn 23's 2.12 did to this run, for Piotr and for phase C.** The script borrowed
 *  twenty five thousand on day 8 and the three months of 10.4 were paid for out of it. From
 *  tonight the bank lends against the books it is shown and a company eight days old has shown it
 *  nothing, so it gets the floor: ten thousand [PIOTR, 20.09]. Fifteen thousand less capital is
 *  the whole of the difference, and it is a big one. Month 1 still closes at 7,151 in the black;
 *  month 2 closes at -5,018 where it closed in the black, month 3 at -15,847, the production
 *  manager of 10.4 is never affordable at all, and the bank pulls the overdraft on the morning of
 *  day 91, the last day of the three months. 2.16's ladder makes it a shade worse again, because
 *  a small restock pays 200 a sheet where it paid 175.
 *
 *  Nothing here is tuned to make that read better. The run is written down as it plays, because
 *  the rule is Piotr's and what it costs a new company is the thing he asked to see. Whether the
 *  floor of ten thousand is the right figure, or whether the script of 10.4 should buy a cheaper
 *  saw and fan to live inside it, is his call and phase C's, and it is in docs/notes-t23-b2.md
 *  (CLAUDE.md T23 2.12).
 *
 *  **Re-measured for v40 (PIOTR, 21.09): the contract's price.** The same script, the same seed,
 *  the same ten thousand from the bank, and one thing moved: a cut sheet pack is priced from what
 *  a day of it is to leave, 76 asked and 73 answered at this company's standing, where the table
 *  said 50. That is the whole difference between the run above, closed by the bank on the morning
 *  of day 91, and this one, still trading on day 113 with the client offering another term. Month
 *  1 closes at 8,127, month 2 at -2,126 and month 3 at -10,325, inside the limit; month 3's
 *  efficiency is 73 and not 47, because a company five thousand better off buys its material;
 *  the house is the same. The contract, not the saw and not the loan floor, is what carries a
 *  one man company through its first quarter, which is what Piotr said a contract should be worth
 *  ("about 200 a day, otherwise there is no point"). */
describe('the three month playthrough of 10.4, on Easy as the brief scripts it', () => {
  it('has the crew, the kit and the paper the brief asked for, in the order it asked', () => {
    // It traded all three months, and from v40 it is still trading on the morning after them: the
    // contract's price carries it past the day the bank used to close it (the note above).
    expect(state.clock.day).toBeGreaterThanOrEqual(91);
    expect(state.gameOver).toBeNull();
    const joiner = state.workers.find((worker) => worker.role === 'joiner');
    expect(joiner?.startDay).toBeLessThanOrEqual(5);
    // The estimator on day 32, as ever. The production manager of 10.4 is not on the books at all
    // any more: he was hired in month 3 out of the twenty five thousand, and ten thousand does not
    // reach him. The gate that refuses him is the one that has always refused a hire the account
    // cannot carry a month of (CLAUDE.md T17 2.11, T23 2.12).
    expect(state.workers.some((worker) => worker.role === 'estimator' && worker.startDay <= 35)).toBe(true);
    expect(state.workers.some((worker) => worker.role === 'productionManager')).toBe(false);
    expect(state.equipment.some((item) => item.specId === 'tableSaw' && item.variantId === 'standard')).toBe(true);
    expect(state.equipment.some((item) => item.specId === 'extractor' && item.variantId === 'standard')).toBe(true);
    expect(state.pipes.length).toBeGreaterThanOrEqual(1);
    expect(state.security.level).toBe(1);
    expect(state.insurance.property && state.insurance.liability).toBe(true);
    expect(state.ownerDraw.tier).toBe(1);
    // The holiday of 10.4 goes with the manager: a man only takes one while there is somebody to
    // cover the hall, and there is no manager on these books any more (CLAUDE.md T13 3.9, T23 2.12).
    expect(days.some((day) => onHoliday(day))).toBe(false);
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

  it('went to the bank in week 2 rather than live in the overdraft, and stayed out of it for one month', () => {
    // A 7,000 saw, a 1,400 fan, the joiner's kit and the deposit come to 23,000 in month 1 against
    // 4,500 of revenue, so the account runs down to 16 by the Friday of week 1 and goes under on
    // day 8. He goes to the bank that day, once (CLAUDE.md T13 3.14). Turn 20's Friday payroll
    // took him under on day 4; from tonight the wages wait for the month's last working day, so
    // nothing leaves the account for the crew in week 1 and the dip comes with week 2's buying
    // instead (CLAUDE.md T21 2.10).
    //
    // He came away with ten thousand and not the twenty five he asked for, so only month 1 closes
    // in the black and the overdraft carries months 2 and 3 (CLAUDE.md T23 2.12), inside the
    // limit from v40.
    const loan = state.finance.loan;
    // Twenty five thousand asked for and ten thousand lent: the bank reads the books, and on day 8
    // there are none (CLAUDE.md T23 2.12).
    expect(loan?.principal).toBe(LOAN_FLOOR);
    expect(loan?.startDay ?? 99).toBeLessThanOrEqual(8);
    // Re-measured for v37, the bag of work (PIOTR, 20.09): 6,550, -5,018 and -15,847 under the
    // one cursor of Turn 23. A man now edges or assembles while the saw is taken instead of
    // standing, and this hall, on the day 1 fan, gives some of that back as dust; the months move
    // by a few hundred to two thousand and the shape of the run does not.
    // Re-measured for v40: 8,127, -2,126 and -10,325, the contract at 73 a piece and not 50
    // (the note above the describe). The v37 figures were 5,781, -7,402 and -16,492.
    // Re-measured for v43: 9,120, -2,166 and -11,048. Assembly no longer waits for the cutting,
    // so a second man on a job assembles while the saw is taken; month 1 is a thousand better,
    // month 3 seven hundred worse, and the shape of the run is unchanged.
    // Re-measured for v50: 6,482, -3,294 and -9,832, the service on the calendar (PIOTR, 22.09).
    // Three things moved. The contract pays 66 a piece and not 73, because the entry point
    // carries the reference saw's wear and the wear fell six fold with the interval: 2,400 less
    // over the three months. No saw is overdue inside six months, so nothing rolls its 2% and
    // gives up: the v43 run's table saw repair on day 50 and compressor repair on day 71 are
    // gone, and only the extractor breaks (day 75, dust, as before). And with the saw whole the
    // crew gets through the sheets sooner, so the script's restock lands in month 1 instead of
    // month 2 (material 12,800 in month 1 against 9,920, and 11,710 in month 2 against 15,050),
    // which is what makes month 1 read 2,600 worse; month 3 closes 1,200 better all told and
    // the shape of the run is unchanged.
    expect(Math.round(months[0]?.cashClose ?? 0)).toBe(6482);
    expect(Math.round(months[1]?.cashClose ?? 0)).toBe(-3294);
    expect(Math.round(months[2]?.cashClose ?? 0)).toBe(-9832);
    // Three charges in three months: 7 on day 31 and 1 on day 61 for the few days each month
    // that ran under, and 109 on day 91, which is most of month 3 spent in the overdraft. The
    // first two are small change beside the 25% a year the overdraft charged all three months
    // before the script was rewritten; the third is what living in it costs (CLAUDE.md T23 2.12).
    const overdraft = state.ledger.filter((entry) => entry.category === 'overdraftInterest');
    expect(overdraft.map((entry) => entry.day)).toEqual([31, 61, 91]);
    expect(Math.abs(overdraft[0]?.amount ?? 0)).toBeLessThan(15);
    expect(Math.abs(overdraft[1]?.amount ?? 0)).toBeLessThan(40);
    // Under 100 from v43 (24): month 3 goes under later, with the thousand month 1 kept.
    expect(Math.abs(overdraft[2]?.amount ?? 0)).toBeGreaterThan(10);
    expect(Math.abs(overdraft[2]?.amount ?? 0)).toBeLessThan(100);
  });

  it('reaches house tier 2 in month 2 once the raised draw is really paid, and keeps it', () => {
    // The T13 brief asked for tier 2 by month 3 and it was tier 1 all the way, because the raised
    // draw was never actually paid: it stopped at the overdraft limit and stood beside the cash,
    // and a draw that is never paid buys no house. With the bank behind him it is paid, and the
    // house follows. From Turn 22 there is nowhere for it to stand: what the player did not choose
    // goes through the account (CLAUDE.md T22 2.1).
    expect(months[0]?.houseTier).toBe(1);
    expect(months[1]?.houseTier).toBe(2);
    expect(houseTierFor(state)).toBe(2);
  });

  it('keeps the efficiency above 55% in months 2 and 3, now that the contract pays for the material', () => {
    // Month 3 fell to 47 in v37, and not to the machines: `noMachine` fell with the bag of work,
    // and what grew is `noPeople`, men with no job to go to, 9,210 minutes of it, because a
    // company sixteen thousand into its overdraft buys no material. From v40 the contract pays
    // 73 a piece and the company is six thousand better off in month 3, so it buys its sheets
    // and month 3 reads 73 (75 from v43). The ten thousand loan floor of Turn 23's 2.12 stays as
    // Piotr ruled on 20.09; what changed is the money the contract brings in against it. 77 from
    // v50: no saw breaks down for want of a service inside six months, so no day of month 3 is
    // spent with the cutting stopped.
    expect(months[1]?.efficiencyMean ?? 0).toBeGreaterThan(55);
    expect(Math.round(months[2]?.efficiencyMean ?? 0)).toBe(77);
  });

  it('took the first contract its crew could keep up with and made every week of it in full', () => {
    const contracts = state.contracts.filter((contract) => contract.status !== 'offered');
    expect(contracts).toHaveLength(1);
    const first = contracts[0];
    // The opening week is the term's own part week, signed before the rack is fed for it; every
    // week after it is made in full, out of sheets held on the rack and never bought as a money
    // line on the contract (CLAUDE.md T17 2.22).
    // Every week of the term after the opening part week made in full, and more than in full: the
    // client pays for every piece the man makes, and with nothing else on his bench he makes
    // twenty eight to thirty two of the twenty asked (CLAUDE.md T20 2.1.4). From v40 no week is
    // cut short by the bank, because there is no bank's morning (the note above the describe).
    const weeks = (first?.weeks ?? []).slice(1);
    expect(weeks.length).toBeGreaterThan(10);
    expect(weeks.every((week) => week.made >= week.wanted)).toBe(true);
    // 66 from v50 (73 from v40): the entry point's price with the reference saw's wear at six
    // months between services in it, answered at this company's standing.
    expect(first?.pricePerPiece).toBe(66);
    expect(first?.sheetsUsed ?? 0).toBeGreaterThan(0);
    expect(state.ledger.some((entry) => entry.label.includes(': material'))).toBe(false);
    // The term runs past the three months, and the same script plays on until the client's
    // answer or until the bank closes the company, whichever comes first. Under Turn 23's loan
    // floor it was the bank, on the morning of day 91, and the renegotiation was never reached.
    // From v40 it is the client's answer: the company is still trading on day 113 with the term
    // over, the sixteen weeks on the books, and the client offering more for another term. What
    // is asserted is what the contract did while the company lived, off the rack, with no
    // material line of its own, and not a line of the run left unpaid (CLAUDE.md T22 2.1, 2.2,
    // T23 2.12).
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
    const running = later.contracts.find((contract) => contract.status !== 'offered');
    if (running === undefined) throw new Error('no contract was taken');
    // Re-measured for v40: the script takes the seventeen week term the board offers on day 3
    // (the day it is taken is the script's own reading of the card, and the card reads better at
    // 73 a piece), which ends on day 113. The client's renegotiation is reached with the company
    // alive: sixteen weeks on the books, one of them the short opening part week, and the offer
    // for another term is the history's own arithmetic, 80 a piece on the 73.
    // Eighteen from v43 (assembly no longer waits for the cutting): the script's day of taking
    // moves, the offer on that day is another draw of the stream, and its term runs to day 122.
    expect(running.weeks.length).toBe(18);
    expect(running.status).toBe('ended');
    expect(running.renegotiatedPrice).toBe(renegotiatedPriceFor(running));
    // 84 from v43, the history's own arithmetic on that draw; 76 from v50, the same arithmetic
    // on the 66 the draw answers at v50's entry point.
    expect(running.renegotiatedPrice).toBe(76);
    expect(later.gameOver).toBeNull();
    expect(later.clock.day).toBe(122);
    // Still in the overdraft on the day the term ends, and one day under the limit: the bank has
    // not looked twice at it (CLAUDE.md T22 2.2).
    // -14,893 on day 122 (v43): nine more days of the overdraft than the v40 run's day 113.
    // -11,844 from v50: three thousand better over the four months, the saw and the compressor
    // never breaking for want of a service, against a contract that pays 66 and not 73.
    expect(Math.round(later.cash)).toBe(-11844);
    expect(later.eventQueue.find((entry) => entry.kind === 'bankruptcy')).toBeUndefined();
    // Three months of one money track: nothing waited anywhere but the account (CLAUDE.md T22 2.1).
    expect(later.ledger.some((entry) => entry.unpaid)).toBe(false);
  });

  it('pays every trade by the month, on its last working day, and never by the week', () => {
    // The crew of 10.4 is a joiner in week 1 and an estimator in month 2. Every one of them is on
    // the one unit, and it is the month
    // (PIOTR, 19.09: "I wanted everyone monthly"; CLAUDE.md T21 2.10), so the three months are a
    // played proof that monthly pay covers the office as well as the bench.
    const roles = new Set(state.workers.map((worker) => worker.role));
    expect(roles.has('joiner')).toBe(true);
    expect(roles.has('estimator')).toBe(true);
    // The production manager of 10.4 is off the books from Turn 23: ten thousand of capital does
    // not reach him (CLAUDE.md T23 2.12). The bench and the office are still the proof the block
    // is about, and both of them are monthly.
    expect(roles.has('productionManager')).toBe(false);
    for (const worker of state.workers) expect(worker.monthlyWage, worker.role).toBeGreaterThan(0);
    // The office salary line of the 1st of the month is gone with `monthlyWage`.
    expect(state.ledger.filter((entry) => entry.category === 'salaries')).toEqual([]);
    // One wage line a month and no more: days 30, 60 and 89, which are the last working days of
    // the three months. Day 90 is a Saturday, so month 3 pays on the Friday before it.
    const wages = state.ledger.filter((entry) => entry.category === 'wages');
    expect(wages).toHaveLength(3);
    expect(wages.map((entry) => entry.day)).toEqual([30, 60, 89]);
    for (const entry of wages) {
      expect(isLastWorkingDayOfMonth(entry.day), `day ${entry.day}`).toBe(true);
      expect(entry.label, `day ${entry.day}`).toBe('Monthly wages');
    }
    // The last pay day of the three months pays the whole crew, each at his own monthly wage and
    // nothing on top of it: the estimator is in the same line as the joiner.
    const last = wages[wages.length - 1];
    const crew = state.workers.filter((worker) => worker.startDay <= (last?.day ?? 0));
    expect(crew.length).toBe(2);
    expect(Math.abs(last?.amount ?? 0)).toBeCloseTo(
      crew.reduce((total, worker) => total + worker.monthlyWage, 0),
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

