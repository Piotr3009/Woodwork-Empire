// A machine draws as many men as it keeps busy, one table (PIOTR, 02.10; CLAUDE.md T26 2.1): the
// places are `MACHINE_CAPACITY`, the bench keeps its own row, and a machine books one hour for
// every clock hour at least one man is at it, however many are.

import { describe, expect, it } from 'vitest';
import { CAPACITY_FAMILIES, MACHINE_CAPACITY, PACED_FAMILIES } from '../../src/engine/constants';
import { menAtMachine, placeShortages, placesLine, placesOf } from '../../src/engine/machines';
import type { Equipment } from '../../src/engine/index';
import { day53Hall, runClock } from '../helpers';

describe('the places of a machine', () => {
  it('are its capacity, Piotr s table, with the bench s own row beside the machines', () => {
    expect(placesOf({ specId: 'cnc', variantId: 'pro' })).toBe(8);
    expect(placesOf({ specId: 'tableSaw', variantId: 'budget' })).toBe(2);
    expect(placesOf({ specId: 'tableSaw', variantId: 'used' })).toBe(1);
    expect(placesOf({ specId: 'workbench', variantId: 'industrial' })).toBe(3);
    for (const [family, row] of Object.entries(MACHINE_CAPACITY)) {
      for (const [variant, men] of Object.entries(row)) {
        expect(placesOf({ specId: family, variantId: variant }), `${family} ${variant}`).toBe(men);
      }
    }
    // The bench is a place to work and never a machine the hall is short of.
    expect(PACED_FAMILIES).toContain('workbench');
    expect(CAPACITY_FAMILIES).not.toContain('workbench');
  });

  it('fill the CNC on the day 53 hall and keep the shortage lines to the machines', () => {
    const state = day53Hall();
    const cnc = state.equipment.find((item) => item.specId === 'cnc') as Equipment;
    const men = menAtMachine(state, cnc);
    expect(men.length).toBeGreaterThan(1);
    expect(placesLine(state, cnc, 'card')).toMatch(new RegExp(`^Places: ${men.length} of 8 in use, `));
    expect(placeShortages(state).some((short) => short.family === 'workbench')).toBe(false);
  });
});

describe('the hours a machine books', () => {
  it('is one an hour while at least one man is at it, however many are', () => {
    let state = day53Hall();
    const cnc = state.equipment.find((item) => item.specId === 'cnc') as Equipment;
    const hoursBefore = cnc.hoursUsed;
    let minutesWithAMan = 0;
    let mostAtOnce = 0;
    for (let minute = 0; minute < 60; minute += 1) {
      state = runClock(state, 1);
      const at = state.equipment.find((item) => item.id === cnc.id) as Equipment;
      const men = menAtMachine(state, at).length;
      if (men > 0) minutesWithAMan += 1;
      mostAtOnce = Math.max(mostAtOnce, men);
    }
    const after = state.equipment.find((item) => item.id === cnc.id) as Equipment;
    // Three men at it at once at the least, and the hours are the clock's.
    expect(mostAtOnce).toBeGreaterThanOrEqual(3);
    expect(minutesWithAMan).toBeGreaterThan(0);
    // To the thousandth: the hours are summed a minute at a time, rounded to six places each.
    expect(after.hoursUsed - hoursBefore).toBeCloseTo(minutesWithAMan / 60, 3);
  });
});
