// The bank closes a company that cannot pay (PIOTR, 18.09; CLAUDE.md T21 2.2).
//
// Piotr dropped a 50,000 job with 7,000 in the bank. The deposit he owed came out of an account
// that could not carry it, the top bar kept saying -7,259, and the game played on. His words: "you
// cannot pay your debts, you are bankrupt, and the game should end." So the company is closed when
// the cash has passed one and a half times the overdraft limit. And beside it a second rule, on
// time rather than on amount: thirty calendar days in a row under the limit close the company
// whatever the amount it is under by (CLAUDE.md T22 2.2).
//
// Both are read once a calendar day, where Turn 13 read the one it had: inside `runDayCosts`, which
// `startDay` calls. The brief says "at the day's close, as today", and "as today" governs: the
// cadence is one look a calendar day and nothing about it moves this turn.

import { describe, expect, it } from 'vitest';
import {
  BANKRUPTCY_DAYS_BELOW_LIMIT,
  BANKRUPTCY_LIMIT_FACTOR,
} from '../../src/engine/constants';
import { bankruptcyFloor } from '../../src/engine/economy';
import type { GameState } from '../../src/engine/index';
import { eventsOfKind, newGame, runDays } from '../helpers';

/** A company standing where the test wants it, with the money written straight onto the state: the
 *  rule is about the position, not about how it got there. */
function standing(money: { cash: number; daysBelow?: number }): GameState {
  const state = newGame({ difficulty: 'veryEasy' });
  state.cash = money.cash;
  state.finance.daysBelowOverdraft = money.daysBelow ?? 0;
  return state;
}

describe('the position the bank reads', () => {
  it('is the cash, against one and a half times the overdraft limit', () => {
    const state = standing({ cash: -7259 });
    expect(state.finance.overdraftLimit).toBe(-10000);
    expect(bankruptcyFloor(state)).toBe(-15000);
    expect(BANKRUPTCY_LIMIT_FACTOR).toBe(1.5);
  });

  it('closes the company the same day the cash has passed what the bank allows', () => {
    const run = runDays(standing({ cash: -15000 }), 1);
    expect(run.state.gameOver).not.toBeNull();
    expect(run.state.gameOver?.reason).toContain('cannot pay');
    expect(run.state.gameOver?.day).toBe(2);
    const closed = eventsOfKind(run.events, 'bankruptcy');
    expect(closed).toHaveLength(1);
    // The card prints what the engine saw when it closed the company, which is the position after
    // that day's own bills have run, so the figures ride on the event and are not worked out again
    // later (CLAUDE.md T21 2.2, T22 2.2).
    expect(closed[0]?.data.cash).toBe(Math.round(run.state.cash));
    expect(closed[0]?.data.allowed).toBe(-15000);
    expect(closed[0]?.data.day).toBe(2);
    expect(closed[0]?.data.month).toBe(1);
    expect(Number(closed[0]?.data.cash)).toBeLessThanOrEqual(Number(closed[0]?.data.allowed));
  });

  it('leaves a company alone while the cash is still inside the line', () => {
    // A thousand the right side of it: -14,000 against the -15,000 the bank allows.
    const run = runDays(standing({ cash: -14000 }), 1);
    expect(run.state.gameOver).toBeNull();
    expect(eventsOfKind(run.events, 'bankruptcy')).toHaveLength(0);
  });

  it('closes a company the old twice-the-overdraft rule would have traded on', () => {
    // Turn 13 read the cash alone against twice the limit, so -16,000 on a 10,000 overdraft was
    // inside the -20,000 it allowed and the game carried on. One and a half times the limit is
    // -15,000, so it is not. The 2x rule and its constant are gone
    // (CLAUDE.md T21 2.2; the constant itself is asserted in tests/engine/economy.test.ts).
    const run = runDays(standing({ cash: -16000 }), 1);
    expect(run.state.gameOver).not.toBeNull();
    expect(run.state.gameOver?.reason).toContain('cannot pay');
  });
});

describe('thirty days past the overdraft limit', () => {
  it('ends the game on the thirtieth day and not on the twenty ninth', () => {
    expect(BANKRUPTCY_DAYS_BELOW_LIMIT).toBe(30);
    // A hundred pounds past the limit, which is nothing beside it, and twenty eight days of it
    // behind the company: whatever the amount is what the rule says.
    const state = standing({ cash: -10100, daysBelow: BANKRUPTCY_DAYS_BELOW_LIMIT - 2 });
    const twentyNine = runDays(state, 1);
    expect(twentyNine.state.finance.daysBelowOverdraft).toBe(29);
    expect(twentyNine.state.gameOver).toBeNull();
    // The cash is still well inside the line, so nothing but the run of days can close it.
    expect(twentyNine.state.cash).toBeGreaterThan(bankruptcyFloor(twentyNine.state));
    const thirty = runDays(twentyNine.state, 1);
    expect(thirty.state.finance.daysBelowOverdraft).toBe(30);
    expect(thirty.state.gameOver).not.toBeNull();
    expect(thirty.state.gameOver?.reason).toContain('30 days');
    expect(eventsOfKind(thirty.events, 'bankruptcy')).toHaveLength(1);
  });

  it('puts the count back to nought on one day at or above the limit', () => {
    const state = standing({ cash: 500, daysBelow: BANKRUPTCY_DAYS_BELOW_LIMIT - 2 });
    const run = runDays(state, 1);
    expect(run.state.finance.daysBelowOverdraft).toBe(0);
    expect(run.state.gameOver).toBeNull();
  });

  it('counts a day that ends exactly on the limit as a day at the limit, not past it', () => {
    // The day's own standing costs go out of the account before the count is taken, and from
    // Turn 22 they go out of it whatever the balance, so a company put on the limit in the morning
    // is under it by the evening. The day is measured first and the cash set so that the day ends
    // exactly on the limit (CLAUDE.md T22 2.1, 2.2).
    const probe = standing({ cash: 0, daysBelow: 5 });
    const dayCosts = 0 - runDays(probe, 1).state.cash;
    expect(dayCosts).toBeGreaterThan(0);
    const state = standing({ cash: 0, daysBelow: 5 });
    state.cash = state.finance.overdraftLimit + dayCosts;
    const run = runDays(state, 1);
    expect(run.state.cash).toBeCloseTo(run.state.finance.overdraftLimit, 6);
    expect(run.state.finance.daysBelowOverdraft).toBe(0);
  });
});
