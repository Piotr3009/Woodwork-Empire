// The owner's draw and the house (PIOTR; CLAUDE.md T13 3.18): eight thresholds and nothing in
// between, the house the highest one whose thirty day sum has actually been paid, off the ledger
// and never off the setting.

import { describe, expect, it } from 'vitest';
import {
  HOUSE_TIER_NAMES,
  HOUSE_WINDOW_DAYS,
  OWNER_DRAW_PER_DAY,
  OWNER_DRAW_TIERS,
} from '../../src/engine/constants';
import { isWorkingDay } from '../../src/engine/clock';
import {
  houseSumFor,
  houseTierFor,
  ownerDrawPaidInWindow,
  ownerDrawPerDay,
  workingDaysInHouseWindow,
} from '../../src/engine/owner';
import type { LedgerEntry } from '../../src/engine/index';
import { act, newGame, runDays } from '../helpers';

function drawLine(day: number, amount: number, unpaid = false): LedgerEntry {
  return {
    id: `draw-${day}`,
    day,
    minute: 0,
    category: 'ownerDraw',
    label: "Owner's draw",
    amount: -amount,
    balance: 0,
    unpaid,
  };
}

describe('the owner’s draw and the house', () => {
  it('starts every game at the first threshold, 200 a day, and reads tier 1', () => {
    const state = newGame();
    expect(OWNER_DRAW_TIERS).toEqual([200, 400, 800, 1500, 3000, 5000, 7500, 10000]);
    expect(OWNER_DRAW_PER_DAY).toBe(200);
    expect(state.ownerDraw.tier).toBe(0);
    expect(ownerDrawPerDay(state)).toBe(200);
    expect(houseTierFor(state)).toBe(1);
    expect(HOUSE_TIER_NAMES).toHaveLength(8);
    // The first day's draw is already on the ledger: money leaks every day (PIOTR).
    expect(ownerDrawPaidInWindow(state)).toBe(200);
  });

  it('is one of eight thresholds and nothing in between', () => {
    const state = newGame();
    const raised = act(state, { type: 'SET_OWNER_DRAW', tier: 7 });
    expect(ownerDrawPerDay(raised)).toBe(10000);
    const over = act(state, { type: 'SET_OWNER_DRAW', tier: 8 });
    expect(over.ownerDraw.tier).toBe(0);
    const under = act(state, { type: 'SET_OWNER_DRAW', tier: -1 });
    expect(under.ownerDraw.tier).toBe(0);
  });

  it('follows the thirty day sum off the ledger and never the setting', () => {
    const state = newGame();
    state.clock.day = 40;
    state.ledger = [];
    // A draw of 1,500 chosen and nothing paid yet: still tier 1.
    state.ownerDraw.tier = 3;
    expect(houseTierFor(state)).toBe(1);
    expect(workingDaysInHouseWindow()).toBe(21);
    expect(houseSumFor(3)).toBe(1500 * 21);
    // Every working day of the window paid at 1,500: the semi with a garden, tier 4.
    let paid = 0;
    for (let day = 40 - HOUSE_WINDOW_DAYS + 1; day <= 40; day += 1) {
      if (!isWorkingDay(day)) continue;
      state.ledger.push(drawLine(day, 1500));
      paid += 1500;
    }
    expect(ownerDrawPaidInWindow(state)).toBe(paid);
    expect(houseTierFor(state)).toBe(4);
    // Lowering the setting changes nothing: the money has gone.
    state.ownerDraw.tier = 0;
    expect(houseTierFor(state)).toBe(4);
    // A line older than thirty days is out of the window.
    state.ledger = state.ledger.map((line) => ({ ...line, day: line.day - HOUSE_WINDOW_DAYS }));
    expect(ownerDrawPaidInWindow(state)).toBe(0);
    expect(houseTierFor(state)).toBe(1);
    // And a draw the account could not pay counts for nothing.
    state.ledger = state.ledger.map((line) => ({
      ...line,
      day: line.day + HOUSE_WINDOW_DAYS,
      unpaid: true,
    }));
    expect(ownerDrawPaidInWindow(state)).toBe(0);
    expect(houseTierFor(state)).toBe(1);
  });

  it('shows the new house only once the money has really gone', () => {
    const state = act(newGame({ difficulty: 'veryEasy' }), { type: 'SET_OWNER_DRAW', tier: 1 });
    expect(ownerDrawPerDay(state)).toBe(400);
    expect(houseTierFor(state)).toBe(1);
    // Ten days in, the window holds eight working days at 400: not the 8,400 the flat wants.
    const early = runDays(state, 10).state;
    expect(houseTierFor(early)).toBe(1);
    // Thirty two days in, it holds twenty two of them: the rented flat, tier 2.
    const later = runDays(state, 32).state;
    expect(ownerDrawPaidInWindow(later)).toBeGreaterThanOrEqual(houseSumFor(1));
    expect(houseTierFor(later)).toBe(2);
  });
});
