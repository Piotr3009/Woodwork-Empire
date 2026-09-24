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
import { contractPiece, contractPriceFor, drawContract, formatMoney, freeSheets, joiners, reservedSheets } from '../../src/engine/index';
import { monthRate, weekRate } from '../../src/engine/rate';
import { renderCompany } from '../../src/ui/company';
import { renderRateLine } from '../../src/ui/monthEnd';
import type { Contract, GameEvent, GameState, Job } from '../../src/engine/index';

const SEED = 20260911;

// ---------------------------------------------------------------------------
// (y) Two men on one job, and a contract on the rack (CLAUDE.md T17 2.10, 2.22)
// ---------------------------------------------------------------------------

/** Three joiners with a saw each, sheets on the rack from day 1, and nothing taken off the board:
 *  the month is about the one piece the men stand at and the contract the third of them keeps. From
 *  v53 the crew counts the owner beside the three, so the hall is four men at three saw places and
 *  every minute of it goes at 0.92 of itself, `Too few saws: 3 places, 4 men`, whoever is at work
 *  (PIOTR, 24.09; v53). The three saws are kept: the month measures what the rule does to it. */
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
  drawn.pricePerPiece = contractPriceFor(contractPiece(drawn));
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
    // Re-measured in Turn 20, because a man with no experience was 0.8 of the owner then where he
    // had been 0.6 (CLAUDE.md T20 2.5): 19 days alone and 8 together, which is 0.42. Turn 21 puts
    // him back to 0.6, Piotr's own figure (CLAUDE.md T21 2.9), so both counts are longer than those
    // two again; the assertions below are a floor and a comparison, which is what makes them hold
    // through three turns of the ladder moving. The finished day
    // is a whole day, so a piece that is done an hour into the morning counts that day in full,
    // and the ratio sits a little under the half it is made of. The arithmetic itself is asserted
    // minute by minute in tests/engine/assignees.test.ts.
    //
    // Re-measured on v53: 22 days alone and 13 together, 0.59, where v52 measured 26 and 13, 0.50.
    // The piece alone is four days sooner because the contract beside it is lost on day 15 (below):
    // from then on one saw runs and not two, the extraction is no longer short of it, and the lone
    // man's minute is 0.54 of the owner's where it was 0.40 (PIOTR, 24.09; v53).
    expect(daysAlone).toBe(22);
    expect(daysTogether).toBe(13);
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
    // Read in the middle of the month, while the term runs: from v53 the client ends it on day 15
    // (below), so by the month's end it holds nothing (PIOTR, 24.09; v53).
    const contract = contractOf(MIDMONTH);
    expect(contract?.status).toBe('active');
    expect(contract?.sheetsReserved ?? 0).toBeGreaterThan(0);
    // What it holds is held: the free count is the rack less every claim on it, the jobs' and
    // the contract's alike (CLAUDE.md T17 2.22).
    expect(reservedSheets(MIDMONTH)).toBeGreaterThanOrEqual(contract?.sheetsReserved ?? 0);
    expect(freeSheets(MIDMONTH)).toBe(Math.max(0, MIDMONTH.stock.sheets - reservedSheets(MIDMONTH)));
    // And the term that ended gave the rack its sheets back: v52 still held 3 at the month's end,
    // with the term running on.
    const ended = contractOf(TOGETHER);
    expect(ended?.status).toBe('ended');
    expect(ended?.sheetsReserved).toBe(0);
  });

  it('draws them as the pieces are made, and never buys them as money on the contract line', () => {
    const contract = contractOf(TOGETHER);
    // 26 packs and 4 sheets over the two weeks it ran; v52 made 112 and drew 17 over the month,
    // with the term running on (PIOTR, 24.09; v53).
    expect(contract?.piecesMade).toBe(26);
    expect(contract?.sheetsUsed).toBe(4);
    // The rack is lower than the day it was filled by what the job cut and the contract drew.
    expect(TOGETHER.stock.sheets).toBeLessThan(OPENING.state.stock.sheets);
    // The one thing 2.22 forbids: a material charge on the contract.
    expect(TOGETHER.ledger.filter((entry) => entry.label.includes(': material'))).toHaveLength(0);
    const lines = TOGETHER.ledger.filter((entry) => entry.category === 'contract');
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.every((entry) => entry.amount > 0)).toBe(true);
  });

  it('comes up short by the saw and never by the rack, the same whether one man or two are on the other job', () => {
    for (const state of [ALONE, TOGETHER]) {
      const contract = contractOf(state);
      // A novice at 0.6, the used saw's 0.95, the extraction short at 0.7 and, from v53, the saws
      // too few for the crew at 0.92: seven of the part week's eight and nineteen of the first
      // full week's twenty. Two short weeks and the client ends it on the Monday after the second
      // (CLAUDE.md T20 2.1.6). v52 kept every week in full, 8 of 8 and then 20 or 21 of 20, and the
      // term ran on (PIOTR, 24.09; v53).
      expect(contract?.weeks).toEqual([
        { week: 1, wanted: 8, made: 7 },
        { week: 2, wanted: 20, made: 19 },
      ]);
      expect(contract?.status).toBe('ended');
      expect(contract?.endedBy).toBe('client');
      expect(contract?.endDay).toBe(15);
      // The rack never ran dry under him: not one of his minutes stood for want of sheets. The
      // weeks are short by the saws and by nothing the rack did.
      const man = state.workers.find((worker) => worker.id === OPENING.men[2]);
      expect(man?.idleByReason.noMaterial).toBe(0);
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
    // A played week reads under the 40 the arithmetic allows; the 40 itself is pinned in
    // tests/engine/rate.test.ts. Measured on v53: 39.15 where v52 read 37.68. The owner is at the
    // piece all five days and the bar stands at its cutting all week: from v53 his minute goes at
    // the job's one pace, 0.99, where it went at the used saw's own 0.95, and for most of the
    // Friday at 0.95 of that again, with the hall gone messy (PIOTR, 24.09; v53).
    expect(rate.rate).toBe(39.15);
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
    // Measured on v53: 23.69 against 39.15, 0.61; v52 read 22.80 against 37.68, the same 0.61,
    // because the job's one pace lifts the three days that worked in both weeks alike
    // (PIOTR, 24.09; v53).
    expect(stood.rate).toBe(23.69);
    expect(stood.rate / worked.rate).toBeGreaterThan(0.5);
    expect(stood.rate / worked.rate).toBeLessThan(0.7);
    expect(renderCompany(STOOD)).toContain(`Workshop earns ${formatMoney(stood.rate)} an hour`);
  });
});
