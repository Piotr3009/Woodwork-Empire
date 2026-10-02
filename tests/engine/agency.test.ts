// The advertising agency and its big one off jobs (PIOTR, 02.10; CLAUDE.md T26 2.13): a monthly
// fee charged on the 1st while it is on, one big job on the board at a time from a standing of 50,
// worth 100,000 to 1,000,000, wanting four to eight free joiners before it can be taken. From v65
// the joiners free the minute it is ready go on it, its deadline is its crew's own days with no cap
// of thirty, and its drawing and its emails are capped (PIOTR, 02.10).

import { describe, expect, it } from 'vitest';
import {
  AGENCY_JOB_REPUTATION,
  AGENCY_JOB_VALUE_MAX,
  AGENCY_JOB_VALUE_MIN,
  AGENCY_JOB_VALUE_STEP,
  AGENCY_MONTHLY_FEE,
  BIG_JOB_DESIGN_MINUTES_MAX,
  BIG_JOB_EMAIL_PRICE_MAX,
  BIG_JOB_JOINERS_MAX,
  BIG_JOB_JOINERS_MIN,
  BIG_JOB_LEAD_DAYS,
  BIG_JOB_REFERENCE_RATE,
  DEADLINE_DAYS_MAX,
  DEADLINE_SLACK_PERCENT_MAX,
  DEADLINE_SLACK_PERCENT_MIN,
  MINUTES_PER_WORKING_DAY,
} from '../../src/engine/constants';
import {
  agencyCheck,
  arriveBigJob,
  bigJobJoinersFor,
  bigJobDeadlineDays,
  isBigJob,
  setAgency,
} from '../../src/engine/agency';
import { canAccept } from '../../src/engine/board';
import { isWorkingDay } from '../../src/engine/clock';
import { MONTH_LINE_OF } from '../../src/engine/economy';
import {
  acceptEnquiry,
  freeJoiners,
  labourValueFor,
  refreshJob,
  resolveClientOffer,
  stagedJob,
} from '../../src/engine/jobs';
import { jobMinutesFor } from '../../src/engine/stages';
import { designMinutes, emailsForPrice, jobTasks } from '../../src/engine/tasks';
import type { GameState } from '../../src/engine/index';
import {
  buyStartingKit,
  clearEvents,
  fillRack,
  newGame,
  placeEnquiry,
  runClock,
  runToDay,
  testJoiner,
} from '../helpers';

/** A known shop with the agency's standing, the day one kit, sheets, and so many free joiners. */
function shop(joiners: number, reputation = AGENCY_JOB_REPUTATION + 10): GameState {
  const state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 60);
  state.reputation = reputation;
  state.enquiries = [];
  for (let index = 0; index < joiners; index += 1) {
    state.workers.push(testJoiner(`staff-${index + 1}`, `Joiner ${index + 1}`, 4 + index, 6));
  }
  while (!isWorkingDay(state.clock.day)) state.clock.day += 1;
  return state;
}

/** A big job of a hundred thousand on the board, wanting four. */
function bigJobOn(state: GameState) {
  return placeEnquiry(state, {
    id: 'enq-big',
    name: 'Wardrobe x 63',
    templateId: 'wardrobe',
    price: AGENCY_JOB_VALUE_MIN,
    basePrice: AGENCY_JOB_VALUE_MIN,
    budget: AGENCY_JOB_VALUE_MIN,
    joinersWanted: bigJobJoinersFor(AGENCY_JOB_VALUE_MIN),
    deadlineDays: 33,
  });
}

describe('the free joiners a big job wants', () => {
  it('is four at a hundred thousand and eight at a million, in a straight line between', () => {
    expect([BIG_JOB_JOINERS_MIN, BIG_JOB_JOINERS_MAX]).toEqual([4, 8]);
    expect(bigJobJoinersFor(AGENCY_JOB_VALUE_MIN)).toBe(4);
    expect(bigJobJoinersFor(325000)).toBe(5);
    expect(bigJobJoinersFor(550000)).toBe(6);
    expect(bigJobJoinersFor(AGENCY_JOB_VALUE_MAX)).toBe(8);
  });
});

describe('the agency s switch', () => {
  it('is off in a new game, and is taken on from the standing its jobs come from', () => {
    const state = shop(0, AGENCY_JOB_REPUTATION - 1);
    expect(state.agency).toEqual({ on: false, sinceMonth: null });
    expect(agencyCheck(state, true)).toEqual({
      ok: false,
      reason: `Takes on a shop with a standing of ${AGENCY_JOB_REPUTATION}`,
    });
    state.reputation = AGENCY_JOB_REPUTATION;
    expect(setAgency(state, true).ok).toBe(true);
    expect(state.agency).toEqual({ on: true, sinceMonth: 1 });
    // Let go at any time, and nothing is paid at either click.
    const cash = state.cash;
    expect(setAgency(state, false).ok).toBe(true);
    expect(state.agency.on).toBe(false);
    expect(state.cash).toBe(cash);
  });
});

describe('the big job on the board', () => {
  it('is drawn one at a time while the agency is on, at a value in Piotr s range', () => {
    const state = shop(4);
    arriveBigJob(state);
    expect(state.enquiries).toHaveLength(0);
    setAgency(state, true);
    arriveBigJob(state);
    arriveBigJob(state);
    const big = state.enquiries.filter(isBigJob);
    expect(big).toHaveLength(1);
    const job = big[0];
    if (job === undefined) throw new Error('a big job is wanted');
    expect(job.budget).toBeGreaterThanOrEqual(AGENCY_JOB_VALUE_MIN);
    expect(job.budget).toBeLessThanOrEqual(AGENCY_JOB_VALUE_MAX);
    expect(job.budget % AGENCY_JOB_VALUE_STEP).toBe(0);
    expect(job.joinersWanted).toBe(bigJobJoinersFor(job.budget));
    expect(job.express).toBe(false);
    // Below the standing the board draws none, the agency on or not.
    const low = shop(4);
    setAgency(low, true);
    low.reputation = AGENCY_JOB_REPUTATION - 1;
    arriveBigJob(low);
    expect(low.enquiries).toHaveLength(0);
  });

  it('is refused with two free joiners, taken with four, and the four stay free until there is something to cut', () => {
    const state = shop(2);
    setAgency(state, true);
    const enquiry = bigJobOn(state);
    expect(enquiry.joinersWanted).toBe(4);
    expect(canAccept(state, enquiry)).toEqual({ ok: false, reason: 'Wants 4 joiners free: you have 2' });
    expect(acceptEnquiry(state, enquiry.id, false).ok).toBe(false);
    // A man on a contract or on a job is not free: two more on the books who are.
    state.workers.push(testJoiner('staff-3', 'Joiner 3', 6, 6), testJoiner('staff-4', 'Joiner 4', 7, 6));
    expect(freeJoiners(state)).toHaveLength(4);
    expect(canAccept(state, enquiry).ok).toBe(true);
    expect(acceptEnquiry(state, enquiry.id, false).ok).toBe(true);
    const offer = state.eventQueue.find((event) => event.kind === 'clientOffer');
    if (offer === undefined) throw new Error('the client answers');
    const taken = resolveClientOffer(state, 'accept', offer.data);
    expect(taken.ok).toBe(true);
    const job = taken.job;
    if (job === null) throw new Error('a job is wanted');
    expect(job.joinersWanted).toBe(4);
    // Until v65 the click put the four on it and they stood by it, paid and idle, through its
    // drawings. They are free for other work until its paperwork and its sheets are in (PIOTR,
    // 02.10).
    expect(job.stage).toBe('accepted');
    expect(job.assignees).toEqual([]);
    expect(freeJoiners(state)).toHaveLength(4);
    const later = runClock(clearEvents(state), 60);
    expect(later.jobs.find((entry) => entry.id === job.id)?.assignees).toEqual([]);
    expect(freeJoiners(later)).toHaveLength(4);
  });

  it('takes the joiners who are free the minute it is ready, as many as it wants, and goes into production', () => {
    const state = shop(5);
    setAgency(state, true);
    const enquiry = bigJobOn(state);
    acceptEnquiry(state, enquiry.id, false);
    const offer = state.eventQueue.find((event) => event.kind === 'clientOffer');
    if (offer === undefined) throw new Error('the client answers');
    const job = resolveClientOffer(state, 'accept', offer.data).job;
    if (job === null) throw new Error('a job is wanted');
    for (const task of jobTasks(state, job.id)) {
      task.done = true;
      task.minutesRemaining = 0;
    }
    job.sheetsReserved = job.sheets;
    refreshJob(state, job);
    expect(job.stage).toBe('inProduction');
    // Four of the five: the first four taken on, and the fifth is left free.
    expect(job.assignees).toEqual(['staff-1', 'staff-2', 'staff-3', 'staff-4']);
    for (const id of job.assignees) {
      expect(state.workers.find((worker) => worker.id === id)?.jobId).toBe(job.id);
    }
    expect(freeJoiners(state)).toHaveLength(1);
  });

  it('waits on the list like any job when nobody is free the minute it is ready', () => {
    const state = shop(4);
    setAgency(state, true);
    const enquiry = bigJobOn(state);
    acceptEnquiry(state, enquiry.id, false);
    const offer = state.eventQueue.find((event) => event.kind === 'clientOffer');
    if (offer === undefined) throw new Error('the client answers');
    const job = resolveClientOffer(state, 'accept', offer.data).job;
    if (job === null) throw new Error('a job is wanted');
    // Every joiner is on other work by the time the sheets are in.
    for (const worker of state.workers) worker.jobId = 'job-elsewhere';
    for (const task of jobTasks(state, job.id)) {
      task.done = true;
      task.minutesRemaining = 0;
    }
    job.sheetsReserved = job.sheets;
    refreshJob(state, job);
    expect(job.stage).toBe('ready');
    expect(job.assignees).toEqual([]);
  });

  it('gives the wanted crew its days and its paperwork ten more, with no cap of thirty', () => {
    // The ordinary rule stops at thirty working days, so every big job had about thirty three
    // whatever it was worth. A big job's deadline is the days its wanted crew needs at the very
    // experienced man's grade, the lead days in front of them, and the ordinary slack (v65).
    const state = shop(4);
    const draw = { rng: state.rng };
    const small = stagedJob(labourValueFor(100000), 'sheet', false);
    const large = stagedJob(labourValueFor(1000000), 'sheet', false);
    const crewDays = (work: typeof small, men: number): number =>
      jobMinutesFor(state, work, Array.from({ length: men }, () => BIG_JOB_REFERENCE_RATE)) / MINUTES_PER_WORKING_DAY;
    for (const [work, men] of [[small, 4], [large, 8]] as const) {
      const base = Math.ceil(crewDays(work, men)) + BIG_JOB_LEAD_DAYS;
      const days = bigJobDeadlineDays(state, draw, work, men);
      expect(days).toBeGreaterThanOrEqual(base + Math.round((base * DEADLINE_SLACK_PERCENT_MIN) / 100));
      expect(days).toBeLessThanOrEqual(base + Math.round((base * DEADLINE_SLACK_PERCENT_MAX) / 100));
    }
    // A million is five times the labour of a hundred thousand a man: far past the old thirty.
    expect(bigJobDeadlineDays(state, draw, large, 8)).toBeGreaterThan(DEADLINE_DAYS_MAX * 2);
    // Reading the draw twice gives the same figure and moves nothing.
    expect(bigJobDeadlineDays(state, draw, large, 8)).toBe(bigJobDeadlineDays(state, draw, large, 8));
  });

  it('caps its drawing at five days at the board and its emails at a hundred thousand pounds of them', () => {
    const state = shop(4);
    setAgency(state, true);
    const enquiry = bigJobOn(state);
    enquiry.budget = 1000000;
    enquiry.price = 1000000;
    enquiry.basePrice = 1000000;
    acceptEnquiry(state, enquiry.id, false);
    const offer = state.eventQueue.find((event) => event.kind === 'clientOffer');
    if (offer === undefined) throw new Error('the client answers');
    const job = resolveClientOffer(state, 'accept', offer.data).job;
    if (job === null) throw new Error('a job is wanted');
    expect(designMinutes(1000000, state.software.tier)).toBeGreaterThan(BIG_JOB_DESIGN_MINUTES_MAX);
    expect(job.designMinutesRemaining).toBe(BIG_JOB_DESIGN_MINUTES_MAX);
    const tasks = jobTasks(state, job.id);
    expect(tasks.find((task) => task.kind === 'design')?.minutesTotal).toBe(BIG_JOB_DESIGN_MINUTES_MAX);
    expect(tasks.filter((task) => task.kind === 'emails')).toHaveLength(emailsForPrice(BIG_JOB_EMAIL_PRICE_MAX));
  });
});

describe('the agency s month', () => {
  it('is charged on the 1st of every month it is on, on the software s line, and not while it is off', () => {
    const on = shop(0);
    setAgency(on, true);
    const month = runToDay(on, 31).state;
    const fees = month.ledger.filter((entry) => entry.category === 'agency');
    expect(fees).toHaveLength(1);
    expect(fees[0]?.amount).toBe(-AGENCY_MONTHLY_FEE);
    expect(fees[0]?.day).toBe(31);
    expect(fees[0]?.label).toBe('Advertising agency');
    expect(MONTH_LINE_OF.agency).toBe('software');
    const off = runToDay(shop(0), 31).state;
    expect(off.ledger.some((entry) => entry.category === 'agency')).toBe(false);
  });
});
