// What dropping a job costs in reputation, and that it follows the price of the job
// (PIOTR, 19.09: "up to 50 max"; CLAUDE.md T21 2.4).
//
// Turn 9 took a flat ten points off whatever was dropped, so walking away from a 50,000 kitchen
// cost the company what walking away from a 1,600 shelf unit did. From tonight the ten is the floor
// of a scale: a point for every thousand pounds of the price above five thousand, capped at fifty,
// and a commercial client's job costs half again on top of that, still capped at the fifty.
//
// One function does it, `dropReputationCost`, so the card that warns before the click and the drop
// that follows it cannot disagree (CLAUDE.md T21 2.3, 2.4).

import { describe, expect, it } from 'vitest';
import {
  DROP_PROJECT_REPUTATION,
  DROP_REPUTATION_MAX,
} from '../../src/engine/constants';
import { dropReputationCost } from '../../src/engine/index';
import type { GameState, Job } from '../../src/engine/index';
import {
  acceptNow,
  act,
  buyStartingKit,
  clearEvents,
  fillRack,
  newGame,
  placeEnquiry,
} from '../helpers';

/** A hall with one job of a round price on the books, the way the drop tests build one. */
function withJob(price: number): { state: GameState; job: Job } {
  let state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
  state.enquiries = [];
  const enquiry = placeEnquiry(state, { price, deadlineDays: 60 });
  state = clearEvents(acceptNow(state, enquiry.id, false));
  const job = state.jobs[0];
  if (job === undefined) throw new Error('no job');
  return { state, job };
}

describe('the reputation cost of a drop', () => {
  it('is ten up to five thousand and a point a thousand over it, at the five prices', () => {
    expect(dropReputationCost({ price: 3000, kind: 'residential' })).toBe(10);
    expect(dropReputationCost({ price: 10000, kind: 'residential' })).toBe(15);
    expect(dropReputationCost({ price: 20000, kind: 'residential' })).toBe(25);
    expect(dropReputationCost({ price: 50000, kind: 'residential' })).toBe(50);
    // The floor is Turn 9's ten, so the smallest job in the game costs what it always did.
    expect(dropReputationCost({ price: 400, kind: 'residential' })).toBe(DROP_PROJECT_REPUTATION);
    expect(dropReputationCost({ price: 5000, kind: 'residential' })).toBe(DROP_PROJECT_REPUTATION);
  });

  it('stops at fifty however big the job is', () => {
    expect(dropReputationCost({ price: 50000, kind: 'residential' })).toBe(DROP_REPUTATION_MAX);
    expect(dropReputationCost({ price: 80000, kind: 'residential' })).toBe(DROP_REPUTATION_MAX);
    expect(dropReputationCost({ price: 1000000, kind: 'residential' })).toBe(DROP_REPUTATION_MAX);
    expect(DROP_REPUTATION_MAX).toBe(50);
  });

  it('costs a commercial client half again, and still stops at fifty', () => {
    expect(dropReputationCost({ price: 3000, kind: 'commercial' })).toBe(15);
    expect(dropReputationCost({ price: 10000, kind: 'commercial' })).toBe(23);
    expect(dropReputationCost({ price: 20000, kind: 'commercial' })).toBe(38);
    expect(dropReputationCost({ price: 50000, kind: 'commercial' })).toBe(50);
    // Half again on the residential figure, rounded, at every price under the cap.
    for (const price of [3000, 10000, 20000]) {
      const residential = dropReputationCost({ price, kind: 'residential' });
      expect(dropReputationCost({ price, kind: 'commercial' })).toBe(
        Math.round(residential * 1.5),
      );
    }
  });

  it('takes exactly that off the company when the job is really dropped', () => {
    const { state, job } = withJob(20000);
    // Well clear of the minus fifty floor of the scale, so nothing is clamped on the way down.
    state.reputation = 40;
    const cost = dropReputationCost(job);
    expect(cost).toBe(25);
    const dropped = act(state, { type: 'DROP_JOB', jobId: job.id });
    expect(dropped.reputation).toBe(40 - cost);
    // And the company board's own line carries the same number, on the day it happened.
    const logged = dropped.reputationLog[dropped.reputationLog.length - 1];
    expect(logged?.reason).toBe(`Dropped: ${job.name}`);
    expect(logged?.points).toBe(-cost);
    expect(logged?.day).toBe(dropped.clock.day);
  });

  it('takes the whole fifty for the 50,000 job Piotr dropped', () => {
    const { state, job } = withJob(50000);
    state.reputation = 60;
    const dropped = act(state, { type: 'DROP_JOB', jobId: job.id });
    expect(dropReputationCost(job)).toBe(50);
    expect(dropped.reputation).toBe(10);
    const logged = dropped.reputationLog[dropped.reputationLog.length - 1];
    expect(logged?.points).toBe(-50);
  });
});
