// The Turn 17 months of CLAUDE.md T17 5, T17-C2: (y) a month with two men on one job and a
// contract whose material comes off the rack, and (z) a week that proves the workshop rate.
//
// (y) is the style of (t) to (x) in turn13.test.ts: a month played through the scripted player,
// with a control run beside it that changes one thing and nothing else. (z) plays a working week
// through the clock and reads the figure off the Company board and off the month end, so the two
// printed numbers and the engine's own are one number.

import { describe, expect, it } from 'vitest';
import { CAREFUL, type Policy, playUntilDay } from './autopilot';
import { acceptNow, act, buyStartingKit, fillRack, newGame, nextDay, placeEnquiry, withExtraction } from '../helpers';
import { PAID_HOURS_PER_WORKING_DAY, RATE_WEEK_DAYS } from '../../src/engine/constants';
import { contractPiece, drawContract, formatMoney, freeSheets, joiners, reservedSheets } from '../../src/engine/index';
import { monthRate, weekRate } from '../../src/engine/rate';
import { renderCompany } from '../../src/ui/company';
import { renderRateLine } from '../../src/ui/monthEnd';
import type { Contract, GameEvent, GameState, Job } from '../../src/engine/index';

const SEED = 20260911;

// ---------------------------------------------------------------------------
// (y) Two men on one job, and a contract on the rack (CLAUDE.md T17 2.10, 2.22)
// ---------------------------------------------------------------------------

/** Three joiners with a saw each so nobody queues for the one machine, sheets on the rack from
 *  day 1, and nothing taken off the board: the month is about the one piece the men stand at and
 *  the contract the third of them keeps, and nothing else is allowed to crowd it. */
const QUIET_MONTH: Policy = {
  ...CAREFUL,
  maxOpenJobs: 0,
  hireJoiner: true,
  joiners: 3,
  extraSaws: 2,
  stockSheets: 60,
};

const CONTRACT_ID = 'contract-month-y';

/** The hall on the day the month proper starts: the kit bought, three men on the books, one piece
 *  ready on the first man's bench and a standing contract on the third man's, drawn on the rack. */
function opening(): { state: GameState; jobId: string; men: string[] } {
  const seen: GameEvent[] = [];
  let start = playUntilDay(newGame({ seed: SEED, difficulty: 'veryEasy' }), 4, QUIET_MONTH, seen);
  // One piece, big enough to run for weeks, and the board cleared so the month is about it.
  start.enquiries = [];
  const enquiry = placeEnquiry(start, { price: 6000, basePrice: 6000, deadlineDays: 90 });
  start = acceptNow(start, enquiry.id, false);
  const job = start.jobs[start.jobs.length - 1];
  if (!job) throw new Error('no job on the books');
  // Its drawings and its material are behind it: what this month measures is the bench.
  job.stage = 'ready';
  const men = joiners(start).map((worker) => worker.id);
  if (men.length < 3) throw new Error('three joiners are wanted here');
  let next = act(start, { type: 'ASSIGN_JOB', jobId: job.id, workerId: men[0] ?? null });
  // The board's own offer makes way for the contract this month is about: cut sheet packs, a
  // week's work of them, over a term the month cannot outrun.
  next.contracts = next.contracts.filter((contract) => contract.status !== 'offered');
  const drawn = drawContract(next);
  drawn.id = CONTRACT_ID;
  drawn.name = 'Cut sheet packs for Ashcombe Retail';
  drawn.pieceId = 'cutSheetPack';
  drawn.quantityPerWeek = 20;
  drawn.termWeeks = 8;
  // The piece's own price off the table (CLAUDE.md T20 2.2), where the month used to make up 100
  // of its own. What this month measures is the rack and not the money, so nothing it asserts
  // moves with the price: the pieces made, the sheets drawn and the weeks kept are the same.
  drawn.pricePerPiece = contractPiece(drawn).price;
  next.contracts.push(drawn);
  next = act(next, { type: 'ACCEPT_CONTRACT', contractId: drawn.id });
  next = act(next, { type: 'ASSIGN_CONTRACT', contractId: drawn.id, workerId: men[2] ?? '', on: true });
  return { state: next, jobId: job.id, men };
}

const OPENING = opening();
const OPENED_ON = OPENING.state.clock.day;

/** The month with the piece left to the one man it was given to. */
const ALONE = playUntilDay(OPENING.state, 41, QUIET_MONTH, []);

/** The same month with the second joiner put on it beside him, and nothing else changed. Turn 19
 *  took the second man's own action away: a job carries a list of everybody on it and the second
 *  man is simply the second name on it, so this is one Assign to this job (CLAUDE.md T19 2.5). */
const WITH_SECOND = act(OPENING.state, {
  type: 'ADD_TO_JOB',
  jobId: OPENING.jobId,
  workerId: OPENING.men[1] ?? '',
});
const MIDMONTH = playUntilDay(WITH_SECOND, 12, QUIET_MONTH, []);
const TOGETHER = playUntilDay(MIDMONTH, 41, QUIET_MONTH, []);

function watched(state: GameState): Job {
  const job = state.jobs.find((entry) => entry.id === OPENING.jobId);
  if (!job) throw new Error('the watched job has gone off the books');
  return job;
}

function contractOf(state: GameState): Contract | undefined {
  return state.contracts.find((entry) => entry.id === CONTRACT_ID);
}

describe('(y) two men on one job, on Very easy', () => {
  it('stands the second man at it with no job of his own, and the control leaves it one man’s', () => {
    const job = watched(MIDMONTH);
    expect(job.assignees[1]).toBe(OPENING.men[1]);
    expect(job.stage).toBe('inProduction');
    expect(MIDMONTH.jobs.filter((entry) => entry.assignees[0] === OPENING.men[1])).toHaveLength(0);
    expect(watched(ALONE).assignees[1] ?? null).toBe(null);
  });

  it('finishes the piece in about half the days, the machine stage apart', () => {
    const one = watched(ALONE).finishedDay;
    const two = watched(TOGETHER).finishedDay;
    expect(one).not.toBeNull();
    expect(two).not.toBeNull();
    const daysAlone = (one ?? 0) - OPENED_ON;
    const daysTogether = (two ?? 0) - OPENED_ON;
    // Measured in Turn 17: 26 days with the one man, 13 with the two of them. Two men are twice
    // one of them, and the machine stage, where one has the saw and the other waits at its cell,
    // is what keeps the saving from being exact (CLAUDE.md T17 2.10).
    // Re-measured in Turn 20, because a man with no experience is 0.8 of the owner now where he
    // was 0.6 (CLAUDE.md T20 2.5): 19 days alone and 8 together, which is 0.42. The finished day
    // is a whole day, so a piece that is done an hour into the morning counts that day in full,
    // and the ratio sits a little under the half it is made of. The arithmetic itself is asserted
    // minute by minute in tests/engine/assignees.test.ts.
    expect(daysAlone).toBeGreaterThan(15);
    expect(daysTogether).toBeLessThan(daysAlone);
    expect(daysTogether / daysAlone).toBeGreaterThan(0.4);
    expect(daysTogether / daysAlone).toBeLessThan(0.7);
  });

  it('is the same piece and the same labour, done sooner', () => {
    expect(watched(TOGETHER).labourValue).toBe(watched(ALONE).labourValue);
    expect(watched(TOGETHER).labourRemaining).toBe(0);
    expect(watched(ALONE).labourRemaining).toBe(0);
  });
});

describe('(y) a contract whose material comes off the rack', () => {
  it('holds sheets on the rack for the week in hand, and the free stock is short of them', () => {
    const contract = contractOf(TOGETHER);
    expect(contract?.status).toBe('active');
    expect(contract?.sheetsReserved ?? 0).toBeGreaterThan(0);
    // What it holds is held: the free count is the rack less every claim on it, the jobs' and
    // the contract's alike (CLAUDE.md T17 2.22).
    expect(reservedSheets(TOGETHER)).toBeGreaterThanOrEqual(contract?.sheetsReserved ?? 0);
    expect(freeSheets(TOGETHER)).toBe(Math.max(0, TOGETHER.stock.sheets - reservedSheets(TOGETHER)));
  });

  it('draws them as the pieces are made, and never buys them as money on the contract line', () => {
    const contract = contractOf(TOGETHER);
    expect(contract?.piecesMade ?? 0).toBeGreaterThan(0);
    expect(contract?.sheetsUsed ?? 0).toBeGreaterThan(0);
    // The rack is lower than the day it was filled by what the job cut and the contract drew.
    expect(TOGETHER.stock.sheets).toBeLessThan(OPENING.state.stock.sheets);
    // The one thing 2.22 forbids: a material charge on the contract.
    expect(TOGETHER.ledger.filter((entry) => entry.label.includes(': material'))).toHaveLength(0);
    const lines = TOGETHER.ledger.filter((entry) => entry.category === 'contract');
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.every((entry) => entry.amount > 0)).toBe(true);
  });

  it('keeps its weeks in full out of the rack, whether one man or two are on the other job', () => {
    for (const state of [ALONE, TOGETHER]) {
      const weeks = contractOf(state)?.weeks ?? [];
      expect(weeks.length).toBeGreaterThan(1);
      // The opening week is the term's own part week; every full week after it is made.
      expect(weeks.slice(1).every((week) => week.made >= week.wanted)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// (z) A week that proves the rate (CLAUDE.md T17 2.26)
// ---------------------------------------------------------------------------

/** The owner on his own in a fitted hall, one big piece ready on his bench and nothing on the
 *  board: every minute he works is labour booked into that piece. */
function benchStart(): GameState {
  const state = withExtraction(fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 60));
  state.enquiries = [];
  const enquiry = placeEnquiry(state, { price: 40000, basePrice: 40000, deadlineDays: 90 });
  const taken = acceptNow(state, enquiry.id, false);
  const job = taken.jobs[0];
  if (!job) throw new Error('no job on the books');
  job.stage = 'ready';
  return act(taken, { type: 'WORK_HERE', jobId: null });
}

/** A working week played through the clock. `stood` is how many of the five days the shop stands
 *  with nothing to make and the wages paid all the same (PIOTR, 17.09: "if the shop stands two
 *  days and the wages are paid, the rate drops by itself"). */
function playWeek(stood: number): GameState {
  let state = benchStart();
  for (let day = 0; day < RATE_WEEK_DAYS - stood; day += 1) state = nextDay(state);
  if (stood > 0) {
    // The piece has gone and the board is empty: he stands about, and the wages are the wages.
    state.jobs = [];
    state.enquiries = [];
    for (let day = 0; day < stood; day += 1) state = nextDay(state);
  }
  return state;
}

const WORKED = playWeek(0);
const STOOD = playWeek(2);

describe('(z) a week that proves the workshop rate', () => {
  it('closes five working days and pays for forty hours, worked or not', () => {
    for (const week of [WORKED, STOOD]) {
      const rate = weekRate(week);
      expect(rate.days).toBe(RATE_WEEK_DAYS);
      expect(rate.paidHours).toBe(RATE_WEEK_DAYS * PAID_HOURS_PER_WORKING_DAY);
      // One man on the books, so a man earns what the workshop earns.
      expect(rate.people).toBe(1);
      expect(rate.perMan).toBe(rate.rate);
    }
  });

  it('prints the engine’s own number on the Company board, to the penny', () => {
    const rate = weekRate(WORKED);
    expect(rate.rate).toBeGreaterThan(0);
    expect(renderCompany(WORKED)).toContain(`Workshop earns ${formatMoney(rate.rate)} an hour`);
    // Nobody is at his bench for all eight hours of five days, so a played week reads under the
    // 40 the arithmetic allows; the 40 itself is pinned in tests/engine/rate.test.ts.
    expect(rate.rate).toBeLessThan(40);
  });

  it('says the same pounds in the month end as on the board, over the same days', () => {
    // Every day of the week is in month 1, so the month's figure and the week's are the same
    // number out of the same function (CLAUDE.md T17 2.26).
    const month = monthRate(WORKED, 1);
    expect(month.rate).toBe(weekRate(WORKED).rate);
    expect(renderRateLine(month)).toContain(`Workshop earned ${formatMoney(month.rate)} an hour`);
  });

  it('drops by itself when the shop stands two of the five days', () => {
    const worked = weekRate(WORKED);
    const stood = weekRate(STOOD);
    // The two days that stood earned nothing at all, and they were paid for just the same.
    const idle = STOOD.days.slice(-2);
    expect(idle.every((day) => day.labourValue === 0)).toBe(true);
    expect(idle.every((day) => day.paidHours === PAID_HOURS_PER_WORKING_DAY)).toBe(true);
    expect(stood.paidHours).toBe(worked.paidHours);
    expect(stood.rate).toBeLessThan(worked.rate);
    // Three days of the five: the brief's 40 becomes 24, which is three fifths of it. A played
    // week is not five identical days, so the fall lands about there and not exactly on it.
    expect(stood.rate / worked.rate).toBeGreaterThan(0.5);
    expect(stood.rate / worked.rate).toBeLessThan(0.7);
    expect(renderCompany(STOOD)).toContain(`Workshop earns ${formatMoney(stood.rate)} an hour`);
  });
});
