// Everybody is paid by the week, on Friday: the sprayer, the estimator, the office and the
// manager with the joiners (PIOTR, 18.09: "one unit"; CLAUDE.md T20 2.6). There is one wage field
// and one pay day, so the month end's salary line is nothing but the Fridays of that month.

import { describe, expect, it } from 'vitest';
import { DAYS_PER_MONTH, WEEKS_PER_MONTH } from '../../src/engine/constants';
import { isFriday } from '../../src/engine/clock';
import { monthReport, runDayCosts, weeklyWageBill } from '../../src/engine/economy';
import { monthlyWageOf } from '../../src/engine/staff';
import type { GameState } from '../../src/engine/index';
import { hireNow, newGame } from '../helpers';

/** A workshop known enough to take anybody on, with the money to do it. */
function known(): GameState {
  const state = newGame({ difficulty: 'veryEasy' });
  state.enquiries = [];
  state.reputation = 60;
  state.cash = 200000;
  return state;
}

/** Takes a man on and puts him on the books this morning, so the first Friday pays him. */
function onTheBooks(state: GameState, role: Parameters<typeof hireNow>[1], tier: Parameters<typeof hireNow>[2]): GameState {
  const next = hireNow(state, role, tier);
  for (const worker of next.workers) worker.startDay = 1;
  return next;
}

/** Runs the calendar month's costs, day by day, and hands back what went out on each Friday. */
function fridaysOf(state: GameState): number[] {
  const paid: number[] = [];
  for (let day = 1; day <= DAYS_PER_MONTH; day += 1) {
    state.clock.day = day;
    const before = state.ledger.length;
    runDayCosts(state, day);
    if (!isFriday(day)) continue;
    const wages = state.ledger
      .slice(before)
      .filter((entry) => entry.category === 'wages')
      .reduce((total, entry) => total - entry.amount, 0);
    paid.push(Math.round(wages * 100) / 100);
  }
  return paid;
}

describe('pay by the week, everybody', () => {
  it('puts a sprayer, an estimator and the office into Fridays wages', () => {
    let state = known();
    state = onTheBooks(state, 'officeAdmin', null);
    state = onTheBooks(state, 'estimator', 'experienced');
    state = onTheBooks(state, 'sprayer', 'experienced');
    const sprayer = state.workers.find((worker) => worker.role === 'sprayer');
    const estimator = state.workers.find((worker) => worker.role === 'estimator');
    const admin = state.workers.find((worker) => worker.role === 'officeAdmin');
    if (!sprayer || !estimator || !admin) throw new Error('nobody on the books');
    // Nobody has a wage of his own kind any more: one field, and it is the week.
    expect(sprayer.weeklyWage).toBeGreaterThan(0);
    expect(estimator.weeklyWage).toBeGreaterThan(0);
    expect(admin.weeklyWage).toBeGreaterThan(0);
    expect(weeklyWageBill(state)).toBe(
      sprayer.weeklyWage + estimator.weeklyWage + admin.weeklyWage,
    );
    const paid = fridaysOf(state);
    expect(paid.length).toBeGreaterThanOrEqual(4);
    for (const friday of paid) expect(friday).toBe(weeklyWageBill(state));
  });

  it('makes the month end salary line the four or five Fridays of that month and nothing else', () => {
    let state = known();
    state = onTheBooks(state, 'sprayer', 'experienced');
    const paid = fridaysOf(state);
    const line = monthReport(state, 1).lines.find((entry) => entry.id === 'salariesDay');
    const total = paid.reduce((sum, friday) => sum + friday, 0);
    expect(paid.length === 4 || paid.length === 5).toBe(true);
    expect(line?.costs).toBeCloseTo(total, 2);
    // And the month of one man is his week times the weeks in one: the one conversion.
    const sprayer = state.workers[0];
    if (!sprayer) throw new Error('no sprayer');
    expect(monthlyWageOf(sprayer)).toBeCloseTo(sprayer.weeklyWage * WEEKS_PER_MONTH, 2);
  });
});
