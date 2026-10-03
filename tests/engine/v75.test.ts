// v75 (PIOTR, 03.10), the two sums he gave.
//
// A lorry of sheets is unloaded by its size: the first hundred as it always was, and every hundred
// started past them thirty minutes more by hand, shortened by the handling kit as the first
// hundred is. A sweep of the hall is as long as the crew is big: two hours up to four joiners and
// fifteen minutes more for every joiner past the fourth.

import { describe, expect, it } from 'vitest';
import { CLEANING_MINUTES } from '../../src/engine/constants';
import { cleaningMinutes, unloadExtraMinutesFor, unloadMinutes } from '../../src/engine/tasks';
import { buyStartingKit, newGame, placeEquipment, testJoiner } from '../helpers';

describe('unloading by the size of the load', () => {
  it('is 45 minutes for the first hundred by hand and 30 for every hundred started past them', () => {
    const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    expect(unloadMinutes(state)).toBe(45);
    expect(unloadMinutes(state, 70)).toBe(45);
    expect(unloadMinutes(state, 100)).toBe(45);
    expect(unloadMinutes(state, 101)).toBe(75);
    expect(unloadMinutes(state, 265)).toBe(105);
    // Piotr's own lorry of day 792.
    expect(unloadMinutes(state, 1811)).toBe(585);
  });

  it('is shortened by the handling kit in the one proportion', () => {
    const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    expect(unloadExtraMinutesFor('none')).toBe(30);
    expect(unloadExtraMinutesFor('used')).toBe(20);
    expect(unloadExtraMinutesFor('standard')).toBe(10);
    placeEquipment(state, 'forklift', { variantId: 'used', id: 'kit-truck' });
    expect(unloadMinutes(state, 1811)).toBe(390);
    placeEquipment(state, 'forklift', { variantId: 'standard', id: 'kit-forklift' });
    expect(unloadMinutes(state, 1811)).toBe(195);
    placeEquipment(state, 'forklift', { variantId: 'industrial', id: 'kit-heavy' });
    expect(unloadMinutes(state, 1811)).toBe(65);
    expect(unloadMinutes(state, 100)).toBe(5);
  });
});

describe('a sweep as long as the crew is big', () => {
  it('is two hours up to four joiners and fifteen minutes more for every joiner past the fourth', () => {
    const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    expect(cleaningMinutes(state)).toBe(CLEANING_MINUTES);
    for (let index = 1; index <= 4; index += 1) state.workers.push(testJoiner(`staff-${index}`, `Joiner ${index}`));
    expect(cleaningMinutes(state)).toBe(120);
    state.workers.push(testJoiner('staff-5', 'Joiner 5'));
    expect(cleaningMinutes(state)).toBe(135);
    for (let index = 6; index <= 12; index += 1) state.workers.push(testJoiner(`staff-${index}`, `Joiner ${index}`));
    expect(cleaningMinutes(state)).toBe(240);
    // A man who has not started yet makes no mess, and neither does the office.
    const late = testJoiner('staff-13', 'Joiner 13');
    late.startDay = state.clock.day + 3;
    state.workers.push(late, { ...testJoiner('staff-14', 'Ben'), role: 'officeAdmin', tier: null });
    expect(cleaningMinutes(state)).toBe(240);
  });
});
