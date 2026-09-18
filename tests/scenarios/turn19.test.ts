// The Turn 19 months of CLAUDE.md T19 3, T19-C2: (aa) a month with three men on one job, and
// (bb) a lacquered kitchen made once by a joiner and once by a sprayer. The cleaning month of 2.7
// is here too, because it is a scripted day with a helper on the books and no player action at
// all, which is exactly what section 7 asks for.
//
// The shape is the one Turns 13 and 17 used: a month played through the scripted player, with a
// control run beside it that changes one thing and nothing else, off the same opening state, so
// the difference between the two runs is the thing being measured and nothing else. Every figure
// in a comment was measured on this build and is written down with its reason, never tuned to
// make an assertion pass.

import { describe, expect, it } from 'vitest';
import { CAREFUL, type Policy, playUntilDay } from './autopilot';
import {
  acceptNow,
  act,
  buyNow,
  buyStartingKit,
  fillRack,
  hireNow,
  newGame,
  placeEnquiry,
  placeEquipment,
  withAir,
  withDryAir,
  withExtraction,
} from '../helpers';
import { JOINER_SPRAY_RATE, SPRAYER_SPRAY_RATE } from '../../src/engine/constants';
import { dustBand, familyForStage, joiners, stagePlanFor } from '../../src/engine/index';
import { cleanerAtWork } from '../../src/engine/tasks';
import type { GameEvent, GameState, Job } from '../../src/engine/index';

const SEED = 20260911;

// ---------------------------------------------------------------------------
// (aa) Three men on one job (PIOTR, 17.09; CLAUDE.md T19 2.5)
// ---------------------------------------------------------------------------

/** Three joiners with a saw each, so the month measures the men and never the queue at one
 *  machine, sheets on the rack from day 1, and nothing taken off the board: the piece the three
 *  of them stand at is the only thing happening. */
const THREE_MEN: Policy = {
  ...CAREFUL,
  maxOpenJobs: 0,
  hireJoiner: true,
  joiners: 3,
  extraSaws: 2,
  stockSheets: 80,
};

/** The hall on the day the month proper starts: the kit bought, three men on the books, and one
 *  piece ready on the first man's bench with its drawing and its material behind it. */
function opening(): { state: GameState; jobId: string; men: string[] } {
  const seen: GameEvent[] = [];
  let start = playUntilDay(newGame({ seed: SEED, difficulty: 'veryEasy' }), 4, THREE_MEN, seen);
  start.enquiries = [];
  const enquiry = placeEnquiry(start, { price: 9000, basePrice: 9000, deadlineDays: 120 });
  start = acceptNow(start, enquiry.id, false);
  const job = start.jobs[start.jobs.length - 1];
  if (!job) throw new Error('no job on the books');
  job.stage = 'ready';
  const men = joiners(start).map((worker) => worker.id);
  if (men.length < 3) throw new Error('three joiners are wanted here');
  const next = act(start, { type: 'ASSIGN_JOB', jobId: job.id, workerId: men[0] ?? null });
  return { state: next, jobId: job.id, men };
}

const OPENING = opening();

/** The same piece, three ways, off the one opening state: one man on it, two, and three. Nothing
 *  else differs between the runs. */
const ONE = playUntilDay(OPENING.state, 61, THREE_MEN, []);
const WITH_TWO = act(OPENING.state, {
  type: 'ADD_TO_JOB',
  jobId: OPENING.jobId,
  workerId: OPENING.men[1] ?? '',
});
const TWO = playUntilDay(WITH_TWO, 61, THREE_MEN, []);
const WITH_THREE = act(WITH_TWO, {
  type: 'ADD_TO_JOB',
  jobId: OPENING.jobId,
  workerId: OPENING.men[2] ?? '',
});
const THREE = playUntilDay(WITH_THREE, 61, THREE_MEN, []);

function watched(state: GameState): Job {
  const job = state.jobs.find((entry) => entry.id === OPENING.jobId);
  if (!job) throw new Error('the watched job has gone off the books');
  return job;
}

/** The day the piece was finished, or the end of the window when it never was. "Faster" is a day
 *  and not a share of the labour: every run here finishes the piece, so what moved is when. */
function finishedOn(state: GameState): number {
  return watched(state).finishedDay ?? Number.POSITIVE_INFINITY;
}

describe('(aa) three men on one job, on Very easy', () => {
  it('puts all three on it with no limit, and each keeps his own place', () => {
    const job = watched(WITH_THREE);
    expect(job.assignees).toEqual([OPENING.men[0], OPENING.men[1], OPENING.men[2]]);
    // Nobody is on two jobs at once, and the job is the only one any of them holds.
    for (const id of job.assignees) {
      const worker = WITH_THREE.workers.find((entry) => entry.id === id);
      expect(worker?.jobId).toBe(job.id);
    }
    // The control run still has the one man it was given, so the three runs differ in that alone.
    expect(watched(OPENING.state).assignees).toEqual([OPENING.men[0]]);
  });

  it('finishes the piece sooner for every man put on it', () => {
    // A GBP 9,000 piece, and all three runs finish it inside the window, so what moved is the day
    // it was finished on and not what is left of it. Measured on this build; the days themselves
    // are not asserted, because they depend on where each stage falls against the dinner hour and
    // the end of the day, and the claim is the order.
    expect(finishedOn(ONE)).toBeLessThan(Number.POSITIVE_INFINITY);
    expect(finishedOn(TWO)).toBeLessThan(finishedOn(ONE));
    expect(finishedOn(THREE)).toBeLessThan(finishedOn(TWO));
  });

  it('is the same piece and the same labour, done sooner', () => {
    // Three men do not make a bigger job and they do not make a cheaper one: the value, the price
    // and the labour of the piece are what they always were, and only the days against them moved
    // (CLAUDE.md T19 2.5). The minutes it took to make are the same minutes, shared out: what
    // three men buy is the calendar, not the work.
    expect(watched(THREE).labourValue).toBe(watched(ONE).labourValue);
    expect(watched(THREE).price).toBe(watched(ONE).price);
    expect(watched(THREE).labourRemaining).toBe(0);
    expect(watched(ONE).labourRemaining).toBe(0);
    expect(watched(THREE).productionMinutes).toBeCloseTo(watched(ONE).productionMinutes, -2);
  });

  it('never goes more than three times faster with three men on it', () => {
    // The rule, in one line: a machine is one man's, so a stage at a machine goes at the speed of
    // the man who holds it however many are on the job, and the others queue; a bench stage gives
    // every man his own full minute at his own rate. The engine test asserts the arithmetic to
    // four places (tests/engine/assignees.test.ts). What a month can say is the ceiling: the whole
    // piece is machine stages and bench stages one after another, so three men cannot beat one
    // man by more than three to one, and the machine stages mean they do not come close to it.
    const opened = OPENING.state.clock.day;
    const oneTook = finishedOn(ONE) - opened;
    const threeTook = finishedOn(THREE) - opened;
    expect(threeTook).toBeGreaterThan(0);
    expect(threeTook).toBeGreaterThanOrEqual(oneTook / 3);
  });
});

// ---------------------------------------------------------------------------
// (bb) A lacquered kitchen, with a sprayer and without (CLAUDE.md T19 2.6)
// ---------------------------------------------------------------------------

/** Nothing on the board and nothing to clean: the month is the one kitchen and the one man on it.
 *  `cleanAbove` is out of reach on purpose, so the scripted player never lifts a finger. */
const BOOTH_MONTH: Policy = {
  ...CAREFUL,
  maxOpenJobs: 0,
  cleanAbove: 101,
  hireJoiner: false,
  stockSheets: 0,
};

/** A hall with a booth, a moulder and dry air, and one lacquered kitchen ready on the bench. The
 *  dryer matters: without it `sprayingOnWetAir` slows the finishing and marks the piece, which is
 *  the month (r) of thirtyDays and would confound this one. (r) measures the air; (bb) measures
 *  the man. */
function boothHall(): GameState {
  let kitted = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 80);
  // A joiner wants all of JOINER_PREREQUISITES before he will come, and the day 1 list does not
  // carry the locker, the seat or the hand tools; the tool cabinet is counted one higher than the
  // rest, because the owner keeps his own tools in one (CLAUDE.md T6 3.5). The sprayer wants none
  // of it, so buying the lot here is what keeps the two runs the same hall.
  for (const specId of ['locker', 'canteenSeat', 'handToolSet', 'toolCabinet']) {
    kitted = buyNow(kitted, specId);
  }
  const state = withDryAir(withAir(withExtraction(kitted)));
  placeEquipment(state, 'sprayBooth', { x: 14, y: 7 });
  placeEquipment(state, 'spindleMoulder', { x: 10, y: 7 });
  state.reputation = 40;
  state.enquiries = [];
  const enquiry = placeEnquiry(state, {
    templateId: 'lacqueredKitchen',
    name: 'Lacquered kitchen',
    price: 15000,
    basePrice: 15000,
    finish: 'lacquer',
    materialKind: 'sheet',
    deadlineDays: 120,
  });
  const next = acceptNow(state, enquiry.id, false);
  const job = next.jobs[next.jobs.length - 1];
  if (!job) throw new Error('no kitchen on the books');
  job.stage = 'ready';
  return next;
}

/** The same hall and the same kitchen with one man on it, who is a joiner in one run and a
 *  sprayer in the other. `hireNow` goes straight to the engine's own write, so the reputation
 *  gate, the month of pay and the kit shortfall are all out of the way and the two runs differ in
 *  the man's trade and in nothing else. */
function withTrade(role: 'joiner' | 'sprayer'): GameState {
  const hired = hireNow(boothHall(), role, 'normal');
  for (const worker of hired.workers) worker.startDay = hired.clock.day;
  const job = hired.jobs[hired.jobs.length - 1];
  const man = hired.workers.find((worker) => worker.role === role);
  if (!job || !man) throw new Error(`no ${role} and no kitchen`);
  // The piece starts at the top of its finishing, so the only stage either man works is the one
  // the trade is about. A sprayer is slower than a joiner at a bench (SPRAYER_BENCH_RATE), so a
  // run from the beginning would measure the cutting and the assembly as well and say the joiner
  // was faster overall, which is true and is not what 2.6 is about.
  const plan = stagePlanFor(hired, job);
  const finishing = plan.find((entry) => entry.id === 'finishing');
  if (finishing === undefined) throw new Error('this kitchen has no finishing stage');
  job.labourRemaining = job.labourValue - finishing.from;
  return act(hired, { type: 'ADD_TO_JOB', jobId: job.id, workerId: man.id });
}

const BY_JOINER = withTrade('joiner');
const BY_SPRAYER = withTrade('sprayer');

/** How far through the piece the run got, and how much of the finishing is left. */
function finishingLeft(state: GameState): number {
  const job = state.jobs[state.jobs.length - 1];
  if (!job) throw new Error('the kitchen has gone off the books');
  const plan = stagePlanFor(state, job);
  const finishing = plan.find((entry) => entry.id === 'finishing');
  if (finishing === undefined) throw new Error('this kitchen has no finishing stage');
  // What is left of the finishing alone: nothing once the job is past it, the whole of it before.
  const done = job.labourValue - job.labourRemaining;
  if (done >= finishing.to) return 0;
  if (done <= finishing.from) return finishing.to - finishing.from;
  return finishing.to - done;
}

/** Three working days: long enough for both men to be well into the booth and short enough that
 *  neither has finished it, so what each got through can be compared at all. At four days the
 *  sprayer is already done and the measurement hits a ceiling instead of a rate. */
const BOOTH_DAYS = 3;
const JOINER_RAN = playUntilDay(BY_JOINER, BY_JOINER.clock.day + BOOTH_DAYS, BOOTH_MONTH, []);
const SPRAYER_RAN = playUntilDay(BY_SPRAYER, BY_SPRAYER.clock.day + BOOTH_DAYS, BOOTH_MONTH, []);

describe('(bb) a lacquered kitchen, by a joiner and by a sprayer', () => {
  it('sends the finishing of a lacquered job to the booth for both of them', () => {
    // Neither man is doing something different: it is the same stage at the same machine, and
    // only what a minute of it is worth differs (CLAUDE.md T19 2.6).
    const job = BY_SPRAYER.jobs[BY_SPRAYER.jobs.length - 1];
    if (!job) throw new Error('no kitchen');
    expect(job.finish).toBe('lacquer');
    expect(familyForStage(job, 'finishing')).toBe('sprayBooth');
    const joinersJob = BY_JOINER.jobs[BY_JOINER.jobs.length - 1];
    if (!joinersJob) throw new Error('no kitchen');
    expect(familyForStage(joinersJob, 'finishing')).toBe('sprayBooth');
  });

  it('is the sprayer who gets through it faster, and the joiner who is slower and never stuck', () => {
    // The whole point of 2.6: a workshop without a sprayer is slower at the booth, not stopped
    // (PIOTR, 17.09). Section 7 asks for exactly this assertion.
    const whole = finishingLeft(BY_SPRAYER);
    expect(whole).toBeGreaterThan(0);
    const joinerDid = whole - finishingLeft(JOINER_RAN);
    const sprayerDid = whole - finishingLeft(SPRAYER_RAN);
    // The joiner did move it: the booth is not a wall for him, which is the half of 2.6 that says
    // a workshop without a sprayer is slower and never stuck.
    expect(joinerDid).toBeGreaterThan(0);
    expect(sprayerDid).toBeGreaterThan(joinerDid);
    // And by exactly the figure the constant names. Measured on this build over three working
    // days: the joiner gets through 510.72 of the 900 the stage carries and the sprayer 729.60,
    // which is 1.4286 to one, and 1 / JOINER_SPRAY_RATE is 1.4285714. The month and the constant
    // are one number, so neither can drift from the other unnoticed.
    expect(sprayerDid / joinerDid).toBeCloseTo(SPRAYER_SPRAY_RATE / JOINER_SPRAY_RATE, 3);
  });
});

// ---------------------------------------------------------------------------
// The cleaning day of 2.7, which is section 7's own cross check
// ---------------------------------------------------------------------------

/** A helper on the books from day 1 and a `cleanAbove` the dust can never reach, so the scripted
 *  player never presses Clean up: whatever cleaning happens is the engine's and the helper's. */
const HELPER_MONTH: Policy = {
  ...CAREFUL,
  maxOpenJobs: 0,
  cleanAbove: 101,
  hireJoiner: true,
  hireHelper: true,
  stockSheets: 40,
};

const NO_HELPER_MONTH: Policy = { ...HELPER_MONTH, hireHelper: false };

/** A hall run dirty and then left alone for a working day. */
function dirtyDay(policy: Policy): { before: GameState; after: GameState } {
  const opened = playUntilDay(newGame({ seed: SEED, difficulty: 'veryEasy' }), 6, policy, []);
  // Dirty, which is the band Clean up appears for, and nobody has been asked to do anything.
  opened.dust = 75;
  expect(dustBand(opened.dust).label).toBe('dirty');
  return { before: opened, after: playUntilDay(opened, opened.clock.day + 2, policy, []) };
}

describe('the hall cleans itself when there is a helper, and not otherwise', () => {
  it('ends the day clean with no player action at all', () => {
    const { before, after } = dirtyDay(HELPER_MONTH);
    expect(dustBand(before.dust).label).toBe('dirty');
    // The engine made the job of work itself and the helper did it: no START_CLEANING was ever
    // dispatched, because the policy's own cleaning threshold is out of the dust's reach.
    expect(dustBand(after.dust).label).toBe('clean');
    const cleanings = after.tasks.filter((task) => task.kind === 'cleaning');
    expect(cleanings.length).toBeGreaterThan(0);
    const done = cleanings.filter((task) => task.done);
    expect(done.length).toBeGreaterThan(0);
    const helper = after.workers.find((worker) => worker.role === 'helper');
    expect(helper).toBeDefined();
    for (const task of done) expect(task.doneBy).toBe(helper?.id);
  });

  it('makes no such job of work at all when there is no helper', () => {
    const { before, after } = dirtyDay(NO_HELPER_MONTH);
    expect(dustBand(before.dust).label).toBe('dirty');
    expect(after.workers.some((worker) => worker.role === 'helper')).toBe(false);
    // Without a helper nothing changes: the hall stays as dirty as the player leaves it and the
    // Clean up button is still his to press (CLAUDE.md T19 2.7).
    expect(after.tasks.filter((task) => task.kind === 'cleaning')).toHaveLength(0);
    expect(dustBand(after.dust).label).not.toBe('clean');
  });

  it('says who is sweeping while he is on it', () => {
    const { after } = dirtyDay(HELPER_MONTH);
    // Once it is over nobody is at it, which is the other half of the same reading.
    const open = after.tasks.find((task) => task.kind === 'cleaning' && !task.done);
    if (open === undefined) expect(cleanerAtWork(after)).toBeNull();
    else expect(cleanerAtWork(after)?.role).toBe('helper');
  });
});
