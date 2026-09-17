// The deadline comes off the work in the job and the machines that will do it, not off the kind of
// thing it is: 500 pounds cannot have twelve days (CLAUDE.md T6 3.7).

import { describe, expect, it } from 'vitest';
import {
  DEADLINE_DAYS_MAX,
  DEADLINE_DAYS_MIN,
  LABOUR_FRACTION,
  OWNER_LABOUR_VALUE_PER_DAY,
} from '../../src/engine/constants';
import { PRODUCT_TEMPLATES } from '../../src/engine/constants';
import { deadlineDaysFor, labourValueFor, ownerDaysFor } from '../../src/engine/jobs';
import { generateEnquiry } from '../../src/engine/board';
import type { GameState } from '../../src/engine/index';
import { buyStartingKit, newGame } from '../helpers';

/** The spread of deadlines a price can come out at, over a run of the seeded stream. */
function spread(state: GameState, price: number, express: boolean): number[] {
  const seen = new Set<number>();
  const next = { ...state };
  for (let draw = 0; draw < 200; draw += 1) {
    seen.add(
      deadlineDaysFor(next, {
        ownerDays: ownerDaysFor(next, labourValueFor(price), 'sheet'),
        price,
        express,
      }),
    );
  }
  return Array.from(seen).sort((left, right) => left - right);
}

describe('the ranges the templates used to carry', () => {
  it('are gone: a template says what it is, not how long the client waits', () => {
    for (const template of PRODUCT_TEMPLATES) {
      expect(Object.keys(template), template.id).not.toContain('deadlineMinDays');
      expect(Object.keys(template), template.id).not.toContain('deadlineMaxDays');
    }
  });
});

describe('what the client gives', () => {
  it('gives 500 of shelves three to five days, in an empty hall and in a working one', () => {
    for (const state of [newGame(), buyStartingKit(newGame({ difficulty: 'veryEasy' }))]) {
      const days = spread(state, 500, false);
      expect(days[0], `${days.join(',')}`).toBeGreaterThanOrEqual(3);
      expect(days[days.length - 1], `${days.join(',')}`).toBeLessThanOrEqual(5);
    }
  });

  it('gives a 15,000 kitchen eighteen to twenty three days, and seventeen to nineteen express', () => {
    const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    const standard = spread(state, 15000, false);
    expect(standard[0], `${standard.join(',')}`).toBeGreaterThanOrEqual(18);
    expect(standard[standard.length - 1], `${standard.join(',')}`).toBeLessThanOrEqual(23);
    // Turn 17: express is 20% sooner and no longer 40% (PIOTR, 17.09; CLAUDE.md T17 2.23), so the
    // same kitchen that was eleven to fourteen days is seventeen to nineteen now.
    const express = spread(state, 15000, true);
    expect(express[0], `${express.join(',')}`).toBeGreaterThanOrEqual(17);
    expect(express[express.length - 1], `${express.join(',')}`).toBeLessThanOrEqual(19);
    // A hall with no saw and no edgebander cuts and machines by hand, which is two fifths of the
    // job at half again as long, so the client is told a longer date (CLAUDE.md T7 3.1).
    const bare = spread(newGame(), 15000, false);
    expect(bare[0], `${bare.join(',')}`).toBeGreaterThan(standard[standard.length - 1] ?? 0);
  });

  it('never goes under three days or over thirty, whatever the job', () => {
    const state = newGame();
    expect(deadlineDaysFor(state, { ownerDays: 0, price: 100, express: false })).toBeGreaterThanOrEqual(
      DEADLINE_DAYS_MIN,
    );
    const huge = deadlineDaysFor(state, { ownerDays: 400, price: 200000, express: false });
    // Thirty days of the formula, and the slack the client adds on top of it.
    expect(huge).toBeLessThanOrEqual(DEADLINE_DAYS_MAX + Math.round(DEADLINE_DAYS_MAX * 0.15));
    // The smallest express job the board can make: the floor holds, and at 0.8 the arithmetic can
    // land a day above it where at 0.6 it was always clamped (CLAUDE.md T17 2.23).
    const tiny = deadlineDaysFor(state, { ownerDays: 0, price: 100, express: true });
    expect(tiny).toBeGreaterThanOrEqual(DEADLINE_DAYS_MIN);
    expect(tiny).toBeLessThanOrEqual(DEADLINE_DAYS_MIN + 1);
  });

  it('reads the owner days off the machines the hall has now', () => {
    const bare = newGame();
    const kitted = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    const labour = labourValueFor(15000);
    expect(labour).toBe(15000 * LABOUR_FRACTION);
    const flat = labour / OWNER_LABOUR_VALUE_PER_DAY;
    // Nothing in the hall: the cutting and the machining are done by hand, which is two fifths of
    // the job at half again as long (CLAUDE.md T7 3.1).
    expect(ownerDaysFor(bare, labour, 'sheet')).toBeCloseTo(flat * (0.4 * 1.5 + 0.6), 6);
    // The day 1 kit does the whole job on machines, and its used saw is 5% slow on the cutting.
    expect(ownerDaysFor(kitted, labour, 'sheet')).toBeCloseTo(flat * (0.25 / 0.95 + 0.75), 6);
    expect(ownerDaysFor(kitted, labour, 'sheet')).toBeLessThan(ownerDaysFor(bare, labour, 'sheet'));
  });
});

describe('the same seed gives the same deadlines', () => {
  it('draws the same board twice and a different one from a different seed', () => {
    const days = (seed: number): number[] => {
      const state = newGame({ seed });
      state.enquiries = [];
      const drawn: number[] = [];
      for (let index = 0; index < 40; index += 1) {
        const enquiry = generateEnquiry(state);
        if (enquiry) drawn.push(enquiry.deadlineDays);
      }
      return drawn;
    };
    expect(days(4242)).toEqual(days(4242));
    expect(days(4242)).not.toEqual(days(99));
  });
});
