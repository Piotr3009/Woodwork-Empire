import { describe, expect, it } from 'vitest';
import {
  JOINER_PREREQUISITES,
  LABOUR_FRACTION,
  OVER_SAW_RATIO_FACTOR,
  OWNER_LABOUR_PER_MINUTE,
  WORKER_RATES,
} from '../../src/engine/constants';
import {
  availableJoiners,
  canHire,
  hiringOptions,
  joiners,
  missingForHire,
  sawRatioFactor,
} from '../../src/engine/staff';
import { minutesRemainingFor } from '../../src/engine/jobs';
import { weeklyWageBill } from '../../src/engine/economy';
import { tick } from '../../src/engine/index';
import type { GameState, Worker } from '../../src/engine/index';
import { act, buyStartingKit, clearEvents, firstJob, newGame, placeEnquiry, runToDay } from '../helpers';

/** Buys exactly what the engine says is missing for one more joiner. */
function withJoinerKit(state: GameState): GameState {
  let next = state;
  for (const specId of missingForHire(next, 'joiner')) {
    next = act(next, { type: 'BUY_EQUIPMENT', specId });
  }
  return next;
}

/** Kits out and hires `count` joiners of one tier. */
function withCrew(state: GameState, count: number, tier: Worker['tier']): GameState {
  let next = state;
  for (let index = 0; index < count; index += 1) {
    next = withJoinerKit(next);
    next = act(next, { type: 'HIRE', role: 'joiner', tier });
  }
  return next;
}

describe('the hiring pool', () => {
  it('opens up as the reputation rises', () => {
    const state = newGame();
    const byLabel = (reputation: number): string[] =>
      hiringOptions({ ...state, reputation })
        .filter((option) => option.blockReason.startsWith('Nobody'))
        .map((option) => option.label);
    expect(byLabel(0)).toContain('Joiner, normal');
    expect(byLabel(0)).toContain('Office admin');
    expect(byLabel(1)).not.toContain('Joiner, normal');
    expect(byLabel(1)).toContain('Joiner, super');
    expect(byLabel(2.5)).toHaveLength(0);
  });

  it('names what has to be bought before a joiner can start', () => {
    const state = newGame();
    expect(missingForHire(state, 'joiner')).toEqual(JOINER_PREREQUISITES);
    const option = hiringOptions(state).find((entry) => entry.tier === 'poor');
    expect(option?.available).toBe(false);
    expect(option?.missingCost).toBe(250 + 80 + 40 + 400);
    expect(option?.blockReason).toContain('Workbench');
  });

  it('blocks the hire while the kit is missing and lets it through once it is there', () => {
    let state = buyStartingKit(newGame());
    expect(canHire(state, 'joiner', 'poor').ok).toBe(false);
    state = act(state, { type: 'HIRE', role: 'joiner', tier: 'poor' });
    expect(state.workers).toHaveLength(0);
    state = withJoinerKit(state);
    expect(canHire(state, 'joiner', 'poor').ok).toBe(true);
    state = act(state, { type: 'HIRE', role: 'joiner', tier: 'poor' });
    expect(state.workers).toHaveLength(1);
    expect(state.workers[0]?.rate).toBe(WORKER_RATES.poor);
    expect(state.workers[0]?.weeklyWage).toBe(480);
  });

  it('needs a second set of everything for a second joiner', () => {
    let state = withCrew(buyStartingKit(newGame()), 1, 'poor');
    expect(canHire(state, 'joiner', 'poor').ok).toBe(false);
    expect(missingForHire(state, 'joiner')).toEqual(JOINER_PREREQUISITES);
    state = withJoinerKit(state);
    expect(canHire(state, 'joiner', 'poor').ok).toBe(true);
  });

  it('stops at the bench slots of the unit', () => {
    const state = withCrew(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 6, 'poor');
    expect(joiners(state)).toHaveLength(6);
    const option = hiringOptions(state).find((entry) => entry.tier === 'poor');
    expect(option?.blockReason).toContain('bench slot');
  });

  it('starts the new man the next working day and pays him weekly', () => {
    const state = withCrew(buyStartingKit(newGame()), 1, 'poor');
    expect(state.workers[0]?.startDay).toBe(2);
    expect(availableJoiners(state)).toHaveLength(0);
    const day2 = runToDay(state, 2).state;
    expect(availableJoiners(day2)).toHaveLength(1);
    expect(weeklyWageBill(day2)).toBe(480);
  });

  it('gives everyone a different name', () => {
    const state = withCrew(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 4, 'poor');
    const names = state.workers.map((worker) => worker.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('hires office staff without any bench kit', () => {
    let state = newGame();
    state.reputation = 1.5;
    state = act(state, { type: 'HIRE', role: 'salesman', tier: null });
    expect(state.workers[0]?.role).toBe('salesman');
    expect(state.workers[0]?.monthlyWage).toBe(2200);
  });
});

describe('joiners at the bench', () => {
  function jobReadyWith(price: number, tier: Worker['tier']): GameState {
    let state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    state.reputation = 2.5;
    state = withCrew(state, 1, tier);
    const enquiry = placeEnquiry(state, {
      templateId: 'wardrobe',
      name: 'Wardrobe',
      price,
      deadlineDays: 60,
    });
    state = act(state, { type: 'ACCEPT_ENQUIRY', enquiryId: enquiry.id, byHand: false });
    firstJob(state).stage = 'ready';
    return state;
  }

  it('takes a poor joiner 13.3 days to make a 6400 wardrobe', () => {
    const state = jobReadyWith(6400, 'poor');
    const job = firstJob(state);
    expect(job.labourValue).toBe(6400 * LABOUR_FRACTION);
    const minutes = minutesRemainingFor(job, WORKER_RATES.poor);
    expect(minutes).toBeCloseTo(6400, 6);
    expect(minutes / 480).toBeCloseTo(13.333, 3);
    // The same wardrobe is 8 days for the owner and 10 for a normal joiner (CLAUDE.md 8.5).
    expect(minutesRemainingFor(job, 1) / 480).toBeCloseTo(8, 6);
    expect(minutesRemainingFor(job, WORKER_RATES.normal) / 480).toBeCloseTo(10, 6);
  });

  it('picks up the oldest ready job on its own', () => {
    const state = runToDay(jobReadyWith(1600, 'poor'), 2).state;
    expect(state.workers[0]?.jobId).toBe(firstJob(state).id);
    expect(firstJob(state).stage).toBe('inProduction');
    const later = tick(state, 100);
    expect(firstJob(later).labourRemaining).toBeLessThan(firstJob(state).labourRemaining);
  });

  it('lets the player take the job off a joiner and put the owner on it', () => {
    let state = runToDay(jobReadyWith(1600, 'poor'), 2).state;
    const jobId = firstJob(state).id;
    state = act(state, { type: 'ASSIGN_JOB', jobId, workerId: 'owner' });
    expect(firstJob(state).assignedTo).toBe('owner');
    expect(state.owner.productionJobId).toBe(jobId);
    expect(state.workers[0]?.jobId).toBeNull();
  });

  it('produces at the tier rate', () => {
    const state = runToDay(jobReadyWith(1600, 'poor'), 2).state;
    const before = firstJob(state).labourRemaining;
    const after = firstJob(tick(state, 60)).labourRemaining;
    expect(before - after).toBeCloseTo(60 * OWNER_LABOUR_PER_MINUTE * WORKER_RATES.poor, 6);
  });

  it('drops the output of everyone the owner is not there to run', () => {
    let state = runToDay(jobReadyWith(1600, 'poor'), 2).state;
    state = act(state, { type: 'SKIP_DAY' });
    const before = firstJob(state).labourRemaining;
    const after = firstJob(tick(state, 60)).labourRemaining;
    expect(before - after).toBeCloseTo(60 * OWNER_LABOUR_PER_MINUTE * WORKER_RATES.poor * 0.7, 6);
  });
});

describe('the saw ratio', () => {
  it('slows every joiner above one saw per three', () => {
    const state = withCrew(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 4, 'poor');
    const crew = joiners(state);
    expect(crew).toHaveLength(4);
    expect(sawRatioFactor(state, crew[0] as Worker)).toBe(1);
    expect(sawRatioFactor(state, crew[2] as Worker)).toBe(1);
    expect(sawRatioFactor(state, crew[3] as Worker)).toBe(OVER_SAW_RATIO_FACTOR);
    const withSecondSaw = act(state, { type: 'BUY_EQUIPMENT', specId: 'tableSaw' });
    expect(sawRatioFactor(withSecondSaw, crew[3] as Worker)).toBe(1);
  });

  it('shows up in what the fourth joiner produces', () => {
    let state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    state.reputation = 1;
    state = withCrew(state, 4, 'normal');
    for (let index = 0; index < 4; index += 1) {
      const enquiry = placeEnquiry(state, {
        templateId: 'wardrobe',
        name: 'Wardrobe',
        price: 1600 + index * 10,
        deadlineDays: 60,
      });
      state = act(state, { type: 'ACCEPT_ENQUIRY', enquiryId: enquiry.id, byHand: false });
    }
    for (const job of state.jobs) job.stage = 'ready';
    state = clearEvents(runToDay(state, 2).state);
    const assigned = state.jobs.filter((job) => job.stage === 'inProduction');
    expect(assigned).toHaveLength(4);
    const before = state.jobs.map((job) => job.labourRemaining);
    const after = tick(state, 60).jobs.map((job) => job.labourRemaining);
    const done = before.map((value, index) => value - (after[index] ?? 0));
    const full = 60 * OWNER_LABOUR_PER_MINUTE * WORKER_RATES.normal;
    expect(done.filter((value) => Math.abs(value - full) < 1e-6)).toHaveLength(3);
    expect(done.filter((value) => Math.abs(value - full * OVER_SAW_RATIO_FACTOR) < 1e-6)).toHaveLength(1);
  });
});
