// The booth is a joiner's like every other machine (PIOTR, 02.10; CLAUDE.md T26 2.6). Until Turn 26
// the finishing of a lacquered job was a trade of its own, at its own rates, and a joiner sprayed
// at 0.70 of himself (CLAUDE.md T19 2.6); from tonight one kind of man is on the floor, and a stage
// is worth the man's grade times the hall's points and nothing about his trade.

import { describe, expect, it } from 'vitest';
import { HIRING_SPECS, WORKER_RATES } from '../../src/engine/constants';
import { addToJob, jobLabourCost } from '../../src/engine/jobs';
import { hands, workMinute } from '../../src/engine/production';
import type { GameState, Job, WorkerTier } from '../../src/engine/index';
import {
  acceptNow,
  buyNow,
  buyStartingKit,
  connectAll,
  fillRack,
  hireNow,
  newGame,
  placeEnquiry,
  placeEquipment,
  withAir,
  withDryAir,
  withExtraction,
} from '../helpers';

/** A hall with a spray booth in it and one lacquered wardrobe accepted and ready for the bench. */
function boothHall(): GameState {
  let kitted = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 200);
  // A joiner wants his locker, his seat, his tools and a cabinet of his own before he starts
  // (CLAUDE.md 9.3).
  // The cabinet before the set: a man's tools have to have a slot to live in, and the owner's own
  // set is already in the one slot the day one used cabinet holds (CLAUDE.md T22 2.12).
  for (const specId of ['locker', 'toolCabinet', 'handToolSet']) {
    kitted = buyNow(kitted, specId);
  }
  // And a second place at a bench, because the gate counts the owner's own from Turn 24
  // (CLAUDE.md T24 2.2).
  kitted = buyNow(kitted, 'workbench');
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
function atTheBooth(tier: WorkerTier = 'experienced'): GameState {
  const state = hireNow(boothHall(), 'joiner', tier);
  const man = state.workers[state.workers.length - 1];
  const job = state.jobs[0];
  if (!man || !job) throw new Error('a man and a job are wanted here');
  man.startDay = state.clock.day;
  expect(addToJob(state, job.id, man.id)).toBe(true);
  // The whole of the piece but its finishing is done, so the next minute is a minute of spraying.
  job.labourRemaining = job.labourValue * 0.1;
  // The second half hour of the day: a joiner goes round the job's machines, the saw, a bench and
  // the booth on this hall, and the booth is his turn in the second half hour (v55).
  state.clock.minute = 30;
  return state;
}

/** The labour the job takes in so many minutes of the hands that are on it. */
function labourIn(state: GameState, minutes: number): number {
  const job = state.jobs[0] as Job;
  const before = job.labourRemaining;
  for (let minute = 0; minute < minutes; minute += 1) workMinute(state, hands(state));
  return before - job.labourRemaining;
}

describe('the booth, a joiner\'s like every machine (CLAUDE.md T26 2.6)', () => {
  it('hires no trade of its own: the floor makes things with the joiner and the labourer', () => {
    // Flipped in v84: the line engineer is a role of his own, hired on the floor's tab, who keeps
    // the line and makes nothing (CLAUDE.md T29 2.8); the booth still has no trade.
    const roles = new Set(HIRING_SPECS.map((spec) => spec.role));
    expect([...roles].sort()).toEqual(
      ['draftsman', 'helper', 'joiner', 'lineEngineer', 'officeAdmin', 'productionManager', 'salesman'].sort(),
    );
  });

  it('is worth the man\'s grade times the hall\'s points at the booth, and nothing about his trade', () => {
    // A very experienced and an experienced joiner at the booth for the same half hour, in a hall
    // with its extraction, its air and its dryer, so neither minute is at the floor: the two
    // stand in the ratio of their grades and nothing else (CLAUDE.md T26 2.6; v61).
    const booth = (tier: WorkerTier): GameState =>
      connectAll(withDryAir(withAir(withExtraction(atTheBooth(tier)), 'pro')));
    const senior = labourIn(booth('senior'), 30);
    const experienced = labourIn(booth('experienced'), 30);
    expect(experienced).toBeGreaterThan(0);
    expect(senior / experienced).toBeCloseTo(WORKER_RATES.senior / WORKER_RATES.experienced, 4);
  });

  it('leaves a workshop of joiners never stuck at the booth', () => {
    const state = atTheBooth();
    const job = state.jobs[0] as Job;
    let guard = 0;
    while (job.labourRemaining > 0 && guard < 4000) {
      workMinute(state, hands(state));
      guard += 1;
    }
    expect(job.labourRemaining).toBe(0);
  });

  it('costs the job card real money, at the joiner\'s own monthly wage', () => {
    const state = atTheBooth();
    const job = state.jobs[0] as Job;
    const { cost } = jobLabourCost(state, job);
    expect(cost).toBeGreaterThan(0);
  });
});
