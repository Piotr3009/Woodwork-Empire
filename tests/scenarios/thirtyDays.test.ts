// The scripted playthroughs of CLAUDE.md T1-13.

import { describe, expect, it } from 'vitest';
import { CAREFUL, IDLE, playUntilDay } from './autopilot';
import { newGame, runToDay } from '../helpers';
import type { GameState } from '../../src/engine/index';

const SEED = 20260911;

/** Day 1 to the start of day 31: thirty game days. */
function easyMonth(): GameState {
  return playUntilDay(newGame({ seed: SEED, difficulty: 'easy' }), 31, CAREFUL);
}

describe('30 days on Easy, working the board', () => {
  const state = easyMonth();

  it('reaches day 31 without going under', () => {
    expect(state.gameOver).toBeNull();
    expect(state.clock.day).toBe(31);
    expect(state.cash).toBeGreaterThan(0);
    expect(state.finance.arrearsAmount).toBe(0);
  });

  it('ends with a reputation above 0.5', () => {
    expect(state.reputation).toBeGreaterThan(0.5);
  });

  it('finished the cheap work and got to the dearer templates', () => {
    const done = state.jobs.filter((job) => job.stage === 'completed');
    expect(done.length).toBeGreaterThanOrEqual(3);
    const names = new Set(done.map((job) => job.templateId));
    expect(names.has('garageShelves')).toBe(true);
    expect(names.has('bookcase')).toBe(true);
    // A TV unit needs a reputation of 0.5, so it can only come after the first jobs landed.
    expect(names.has('tvUnit')).toBe(true);
  });

  it('hired nobody, so every one of those jobs was made by the owner', () => {
    expect(state.workers).toHaveLength(0);
    const paid = state.ledger.filter((entry) => entry.category === 'jobBalance');
    expect(paid.length).toBeGreaterThanOrEqual(3);
  });

  it('was paid for every job it delivered', () => {
    for (const job of state.jobs.filter((entry) => entry.stage === 'completed')) {
      expect(job.depositPaid).toBeGreaterThan(0);
      expect(job.rating).not.toBeNull();
    }
  });
});

describe('30 days on Hard, doing nothing', () => {
  it('is deep in the overdraft, with the arrears still ahead', () => {
    // With the placeholder costs of CLAUDE.md 8.1 and the overdraft limit of 8.3, a Hard game that
    // buys nothing at all does not reach arrears inside 30 days. Noted in REPORT-T1 section 5.
    const state = playUntilDay(newGame({ seed: SEED, difficulty: 'hard' }), 31, IDLE);
    expect(state.clock.day).toBe(31);
    expect(state.cash).toBeLessThan(-8000);
    expect(state.finance.arrearsAmount).toBe(0);
    expect(state.gameOver).toBeNull();
  });

  it('gets its arrears warning once the overdraft is full', () => {
    const run = runToDay(newGame({ seed: SEED, difficulty: 'hard' }), 40);
    expect(run.events.filter((event) => event.kind === 'arrearsWarning')).toHaveLength(1);
    expect(run.state.finance.arrearsMonths).toBe(1);
  });

  it('warns inside the month once the owner has bought his tools', () => {
    const state = playUntilDay(newGame({ seed: SEED, difficulty: 'hard' }), 31, {
      ...IDLE,
      buyKit: true,
    });
    expect(state.finance.arrearsAmount).toBeGreaterThan(0);
    expect(state.finance.arrearsMonths).toBeGreaterThanOrEqual(1);
  });
});

describe('replay', () => {
  it('gives byte for byte the same month from the same seed and the same decisions', () => {
    expect(JSON.stringify(easyMonth())).toBe(JSON.stringify(easyMonth()));
  });

  it('gives a different month from a different seed', () => {
    const other = playUntilDay(newGame({ seed: SEED + 1, difficulty: 'easy' }), 31, CAREFUL);
    expect(JSON.stringify(other)).not.toBe(JSON.stringify(easyMonth()));
  });
});
