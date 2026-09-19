// Everybody is paid by the month, on the last working day of it: the sprayer, the estimator, the
// office and the manager with the joiners (PIOTR, 19.09: "I wanted everyone monthly";
// CLAUDE.md T21 2.10). There is one wage field and one pay day, so the month end's salary line is
// nothing but that one day of the month, and the Friday payroll of Turn 8 and Turn 20 is gone from
// the calendar with the weekly wage it paid.

import { describe, expect, it } from 'vitest';
import { DAYS_PER_MONTH } from '../../src/engine/constants';
import { isLastWorkingDayOfMonth } from '../../src/engine/clock';
import { monthReport, monthlyWageBill, runDayCosts } from '../../src/engine/economy';
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

/** Takes a man on and puts him on the books this morning, so the month's pay day pays him. */
function onTheBooks(state: GameState, role: Parameters<typeof hireNow>[1], tier: Parameters<typeof hireNow>[2]): GameState {
  const next = hireNow(state, role, tier);
  for (const worker of next.workers) worker.startDay = 1;
  return next;
}

/** Runs the calendar month's costs, day by day, and hands back every day a wage line landed on,
 *  with what went out on it. A day's costs run on that day, so a month walked through this way is
 *  the month the player would have played. */
function payDaysOf(state: GameState): Array<{ day: number; paid: number; labels: string[] }> {
  const days: Array<{ day: number; paid: number; labels: string[] }> = [];
  for (let day = 1; day <= DAYS_PER_MONTH; day += 1) {
    state.clock.day = day;
    const before = state.ledger.length;
    runDayCosts(state, day);
    const lines = state.ledger.slice(before).filter((entry) => entry.category === 'wages');
    if (lines.length === 0) continue;
    days.push({
      day,
      paid: Math.round(lines.reduce((total, entry) => total - entry.amount, 0) * 100) / 100,
      labels: lines.map((entry) => entry.label),
    });
  }
  return days;
}

describe('pay by the month, everybody', () => {
  it('puts a sprayer, an estimator and the office into the one monthly wage line', () => {
    let state = known();
    state = onTheBooks(state, 'officeAdmin', null);
    state = onTheBooks(state, 'estimator', 'experienced');
    state = onTheBooks(state, 'sprayer', 'experienced');
    const sprayer = state.workers.find((worker) => worker.role === 'sprayer');
    const estimator = state.workers.find((worker) => worker.role === 'estimator');
    const admin = state.workers.find((worker) => worker.role === 'officeAdmin');
    if (!sprayer || !estimator || !admin) throw new Error('nobody on the books');
    // Nobody has a wage of his own kind any more: one field, and it is the month.
    expect(sprayer.monthlyWage).toBeGreaterThan(0);
    expect(estimator.monthlyWage).toBeGreaterThan(0);
    expect(admin.monthlyWage).toBeGreaterThan(0);
    expect(monthlyWageBill(state)).toBe(
      sprayer.monthlyWage + estimator.monthlyWage + admin.monthlyWage,
    );
    // An experienced sprayer is on 2,700, an experienced estimator and an experienced joiner both
    // on 2,600, and the office admin on 1,900: Piotr's own figures, whole (CLAUDE.md T21 2.9).
    expect(monthlyWageBill(state)).toBe(2700 + 2600 + 1900);
    // One pay day in the month, and it is its last working day. The ledger calls it what the
    // player reads on the Accounting page.
    const days = payDaysOf(state);
    expect(days).toHaveLength(1);
    const payDay = days[0];
    expect(payDay && isLastWorkingDayOfMonth(payDay.day)).toBe(true);
    expect(payDay?.paid).toBe(monthlyWageBill(state));
    expect(payDay?.labels).toEqual(['Monthly wages']);
  });

  it('leaves out the man who has not started yet, and counts him from the day he has', () => {
    // The bill is every man on the books whose first day has come, which is the one rule the
    // Accounting page, the month end and the payroll all read (CLAUDE.md T21 2.10). A man taken on
    // today starts the next working day, so today he costs nothing.
    let state = known();
    state = onTheBooks(state, 'officeAdmin', null);
    const bill = monthlyWageBill(state);
    expect(bill).toBeGreaterThan(0);
    state = hireNow(state, 'purchasingClerk', null);
    const clerk = state.workers.find((worker) => worker.role === 'purchasingClerk');
    if (!clerk) throw new Error('no clerk on the books');
    expect(clerk.startDay).toBeGreaterThan(state.clock.day);
    expect(monthlyWageBill(state)).toBe(bill);
    // The morning he starts, his month is in the bill and nothing else has changed.
    state.clock.day = clerk.startDay;
    expect(monthlyWageBill(state)).toBe(bill + clerk.monthlyWage);
  });

  it('makes the month end salary line the one pay day of that month and nothing else', () => {
    let state = known();
    state = onTheBooks(state, 'sprayer', 'experienced');
    const days = payDaysOf(state);
    const line = monthReport(state, 1).lines.find((entry) => entry.id === 'salariesDay');
    const total = days.reduce((sum, entry) => sum + entry.paid, 0);
    expect(days).toHaveLength(1);
    expect(line?.costs).toBeCloseTo(total, 2);
    // And a month of one man is his wage and no arithmetic at all: the week it used to be worked
    // out of is gone, and `monthlyWageOf` is the field (CLAUDE.md T21 2.10).
    const sprayer = state.workers[0];
    if (!sprayer) throw new Error('no sprayer');
    expect(monthlyWageOf(sprayer)).toBe(sprayer.monthlyWage);
    expect(total).toBe(sprayer.monthlyWage);
  });
});
