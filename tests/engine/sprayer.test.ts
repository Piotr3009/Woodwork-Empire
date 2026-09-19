// The sprayer (PIOTR, 17.09; CLAUDE.md T19 2.6). A new trade on the floor, hired like a joiner in
// the four tiers of T20 2.5 and paid by the week like everybody else (T20 2.6). The finishing of
// a lacquered job is his, at his own full
// rate; a joiner may still do it, slower, so a workshop without one is slower at the booth and
// never stuck. Anywhere else he is a pair of hands.

import { describe, expect, it } from 'vitest';
import {
  HIRING_SPECS,
  JOINER_SPRAY_RATE,
  SPRAYER_BENCH_RATE,
  SPRAYER_WEEKLY_WAGE,
  TIER_MIN_REPUTATION,
  SPRAYER_SPRAY_RATE,
  WEEKS_PER_MONTH,
  WORKER_RATES,
} from '../../src/engine/constants';
import { BENCH, SPRAY_BOOTH } from '../../src/engine/machines';
import { addToJob, jobLabourCost, stagedJob } from '../../src/engine/jobs';
import { hands, workMinute } from '../../src/engine/production';
import { crewCount, crewFull, monthlyWageOf } from '../../src/engine/staff';
import { familyForStage, tradeFactor } from '../../src/engine/stages';
import { ROLE_WORDS } from '../../src/ui/team';
import type { GameState, Job, WorkerTier } from '../../src/engine/index';
import {
  acceptNow,
  buyNow,
  buyStartingKit,
  fillRack,
  hireNow,
  newGame,
  placeEnquiry,
  placeEquipment,
} from '../helpers';

/** A hall with a spray booth in it and one lacquered wardrobe accepted and ready for the bench. */
function boothHall(): GameState {
  let kitted = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 200);
  // A joiner wants his locker, his seat, his tools and a cabinet of his own before he starts
  // (CLAUDE.md 9.3), so both trades can be taken on out of this one hall.
  for (const specId of ['locker', 'canteenSeat', 'handToolSet', 'toolCabinet']) {
    kitted = buyNow(kitted, specId);
  }
  const state = kitted;
  placeEquipment(state, 'sprayBooth', { x: 7, y: 6 });
  state.enquiries = [];
  state.reputation = 40;
  state.cash = 200000;
  const enquiry = placeEnquiry(state, {
    templateId: 'lacqueredWardrobe',
    name: 'Lacquered wardrobe',
    finish: 'lacquer',
    price: 8000,
    deadlineDays: 60,
  });
  const next = acceptNow(state, enquiry.id);
  const job = next.jobs[0];
  if (!job) throw new Error('no job');
  job.stage = 'ready';
  return next;
}

/** The same hall with one man of this trade on the books today, put on the job, with the job
 *  stood at its finishing stage, which for a lacquered piece is the booth. */
function atTheBooth(role: 'joiner' | 'sprayer', tier: WorkerTier = 'experienced'): GameState {
  const state = hireNow(boothHall(), role, tier);
  const man = state.workers[state.workers.length - 1];
  const job = state.jobs[0];
  if (!man || !job) throw new Error('a man and a job are wanted here');
  man.startDay = state.clock.day;
  expect(addToJob(state, job.id, man.id)).toBe(true);
  // The whole of the piece but its finishing is done, so the next minute is a minute of spraying.
  job.labourRemaining = job.labourValue * 0.1;
  return state;
}

/** The labour the job takes in so many minutes of the hands that are on it. */
function labourIn(state: GameState, minutes: number): number {
  const job = state.jobs[0] as Job;
  const before = job.labourRemaining;
  for (let minute = 0; minute < minutes; minute += 1) workMinute(state, hands(state));
  return before - job.labourRemaining;
}

describe('the sprayer (CLAUDE.md T19 2.6)', () => {
  it('is hired like a joiner, in four tiers, and paid by the week', () => {
    const rows = HIRING_SPECS.filter((spec) => spec.role === 'sprayer');
    // Four tiers from tonight, and the week is the one unit of pay (CLAUDE.md T20 2.5, 2.6).
    expect(rows.map((spec) => spec.tier)).toEqual(['novice', 'experienced', 'senior', 'master']);
    for (const spec of rows) {
      const tier = spec.tier as WorkerTier;
      expect(spec.weeklyWage, spec.label).toBe(SPRAYER_WEEKLY_WAGE[tier]);
      expect(spec.minReputation, spec.label).toBe(TIER_MIN_REPUTATION[tier]);
    }
    const state = hireNow(boothHall(), 'sprayer', 'experienced');
    const man = state.workers[state.workers.length - 1];
    expect(man?.role).toBe('sprayer');
    expect(man?.rate).toBe(WORKER_RATES.experienced);
    expect(monthlyWageOf(man ?? { weeklyWage: 0 })).toBe(
      Math.round(SPRAYER_WEEKLY_WAGE.experienced * WEEKS_PER_MONTH * 100) / 100,
    );
    // He is called a sprayer wherever he is drawn, and the Assign list reads the same table.
    expect(ROLE_WORDS.sprayer).toBe('sprayer');
  });

  it('stands on the hall floor and counts against the crew limit', () => {
    const before = boothHall();
    const after = hireNow(before, 'sprayer', 'experienced');
    expect(crewCount(after)).toBe(crewCount(before) + 1);
    // And the floor refuses him when it is full: he is on it like a joiner and a helper.
    const man = after.workers[after.workers.length - 1];
    if (!man) throw new Error('nobody was taken on');
    const full: GameState = { ...after, workers: [...after.workers] };
    let guard = 0;
    while (!crewFull(full, 'sprayer') && guard < 200) {
      full.workers.push({ ...man, id: `crowd-${guard}` });
      guard += 1;
    }
    expect(crewFull(full, 'sprayer')).toBe(true);
    // An office role is never refused by the floor: the desks are in the office block.
    expect(crewFull(full, 'officeAdmin')).toBe(false);
  });

  it('is worth his trade at the booth and a pair of hands anywhere else', () => {
    expect(tradeFactor('sprayer', SPRAY_BOOTH)).toBe(SPRAYER_SPRAY_RATE);
    expect(tradeFactor('sprayer', BENCH)).toBe(SPRAYER_BENCH_RATE);
    expect(tradeFactor('sprayer', null)).toBe(SPRAYER_BENCH_RATE);
    expect(tradeFactor('joiner', SPRAY_BOOTH)).toBe(JOINER_SPRAY_RATE);
    expect(tradeFactor('joiner', BENCH)).toBe(1);
    expect(tradeFactor('joiner', null)).toBe(1);
    // The owner has no role of his own and is a joiner by trade [TUNE].
    expect(tradeFactor(null, SPRAY_BOOTH)).toBe(JOINER_SPRAY_RATE);
    expect(tradeFactor(null, null)).toBe(1);
    // The family the finishing of a lacquered piece is done on is the booth, and of anything else
    // it is the bench with nothing but hands.
    expect(familyForStage(stagedJob(100, 'sheet', false, 'lacquer'), 'finishing')).toBe(SPRAY_BOOTH);
    expect(familyForStage(stagedJob(100, 'sheet', false, 'laminate'), 'finishing')).toBeNull();
  });

  it('finishes a lacquered job faster than a joiner does, in the ratio of the two rates', () => {
    // The cross check of CLAUDE.md T19 section 7.
    const sprayer = labourIn(atTheBooth('sprayer'), 30);
    const joiner = labourIn(atTheBooth('joiner'), 30);
    expect(joiner).toBeGreaterThan(0);
    expect(sprayer).toBeGreaterThan(joiner);
    expect(sprayer / joiner).toBeCloseTo(SPRAYER_SPRAY_RATE / JOINER_SPRAY_RATE, 4);
  });

  it('leaves a workshop without one slower at the booth, and never stuck', () => {
    const state = atTheBooth('joiner');
    const job = state.jobs[0] as Job;
    let guard = 0;
    while (job.labourRemaining > 0 && guard < 4000) {
      workMinute(state, hands(state));
      guard += 1;
    }
    expect(job.labourRemaining).toBe(0);
  });

  it('is in the hands of the hall, so his minutes go into the job at all', () => {
    const state = atTheBooth('sprayer');
    const man = state.workers.find((worker) => worker.role === 'sprayer');
    expect(hands(state).map((hand) => hand.who)).toContain(man?.id);
    // The day's own copy of this loop lives in game.ts, which was frozen for phase B; the line
    // landed in T20-C1. The engine's one is right here.
    expect(labourIn(state, 5)).toBeGreaterThan(0);
  });

  it('costs the job card real money, at his own weekly wage', () => {
    const state = atTheBooth('sprayer');
    const job = state.jobs[0] as Job;
    // `jobLabourCost` reads the weekly wage, which is the one wage field every man has since
    // CLAUDE.md T20 2.6, so his minutes are quoted at his own rate and never at nothing.
    const { cost } = jobLabourCost(state, job);
    expect(cost).toBeGreaterThan(0);
  });
});
