// Eight lockers, eight joiners (PIOTR, 20.09; CLAUDE.md T23 2.10). The canteen was built with eight
// compartments, so a ninth locker cannot be bought. The owner needs no locker: he is not on the
// books. A bigger canteen is parked (CLAUDE.md T23 8). Turn 26 gave the lockers to the joiners and
// the labourer and took them off the manager and the office (CLAUDE.md T26 2.10); from v64 they
// are the joiners' alone, because seven joiners and a labourer left no locker for the eighth joiner
// the unit takes (PIOTR, 02.10: "I cannot hire more joiners").
//
// A 200 square metre unit takes eight joiners, so there the crew line refuses the ninth before the
// canteen is asked. The canteen's own refusal is asked of a unit twice as long, which takes
// sixteen: the eight compartments are then the one thing that stops a ninth joiner.

import { describe, expect, it } from 'vitest';
import { CANTEEN_LOCKERS, CANTEEN_PLATES } from '../../src/engine/constants';
import { canBuy, countOf } from '../../src/engine/index';
import { crewLimit } from '../../src/engine/layout';
import { canHire, hiringOptions } from '../../src/engine/staff';
import type { GameState } from '../../src/engine/index';
import { buyNow, hireNow, newGame, testJoiner } from '../helpers';

/** A shop with the cash and the standing to take anybody on, and the lockers asked for. */
function shop(lockers: number): GameState {
  let state = newGame({ difficulty: 'veryEasy' });
  state.cash = 900000;
  state.reputation = 90;
  for (let index = 0; index < lockers; index += 1) state = buyNow(state, 'locker');
  return state;
}

/** The same shop with that many joiners on the books, in a unit twice as long, whose own limit is
 *  sixteen joiners and not eight. */
function withJoiners(size: number, lockers = size): GameState {
  const state = shop(lockers);
  state.unit.widthCells *= 2;
  // Put straight on the books: the bench, the cabinet and the kit a joiner wants are another
  // test's (tests/engine/staffCrewLimit.test.ts), and the canteen is what is asked about here.
  for (let index = 0; index < size; index += 1) {
    state.workers.push(testJoiner(`joiner-${index + 1}`, `Joiner ${index + 1}`));
  }
  return state;
}

describe('the eight is the room s own', () => {
  it('is the eight door plates the art side painted, and not a second opinion', () => {
    expect(CANTEEN_LOCKERS).toBe(8);
    expect(CANTEEN_LOCKERS).toBe(CANTEEN_PLATES.length);
  });
});

describe('the ninth locker', () => {
  it('is refused, with the canteen as the reason', () => {
    const full = shop(CANTEEN_LOCKERS);
    expect(countOf(full, 'locker')).toBe(CANTEEN_LOCKERS);
    const check = canBuy(full, 'locker');
    expect(check.ok).toBe(false);
    expect(check.reason).toBe('The canteen has eight lockers');
  });

  it('is the ninth and not the eighth: eight go in without a word', () => {
    const seven = shop(CANTEEN_LOCKERS - 1);
    expect(canBuy(seven, 'locker').ok).toBe(true);
    const eight = buyNow(seven, 'locker');
    expect(countOf(eight, 'locker')).toBe(CANTEEN_LOCKERS);
    expect(canBuy(eight, 'locker').ok).toBe(false);
  });
});

describe('the ninth joiner', () => {
  it('is refused with the canteen as the reason in a unit that would take him', () => {
    const eight = withJoiners(CANTEEN_LOCKERS);
    expect(crewLimit(eight)).toBeGreaterThan(CANTEEN_LOCKERS);
    const check = canHire(eight, 'joiner', 'novice');
    expect(check.ok).toBe(false);
    expect(check.reason).toBe('No locker for him: the canteen holds eight');
  });

  it('is the ninth and not the eighth: the canteen says nothing of the eighth', () => {
    const seven = withJoiners(CANTEEN_LOCKERS - 1);
    expect(canHire(seven, 'joiner', 'novice').reason).not.toBe('No locker for him: the canteen holds eight');
  });

  it('is a joiner: the labourer, the office and the manager keep no locker and are not asked', () => {
    // Every line of the hire card at once: a joiner keeps his things in the canteen and is refused
    // by it; the labourer keeps none from v64, the manager and the office none from Turn 26, and
    // none of them is refused by anything of the canteen's (CLAUDE.md T26 2.10; v64).
    const eight = withJoiners(CANTEEN_LOCKERS);
    const options = hiringOptions(eight);
    expect(options.length).toBeGreaterThan(4);
    for (const option of options) {
      const label = `${option.role} ${option.tier ?? ''}`;
      if (option.role === 'joiner') {
        expect(option.available, label).toBe(false);
        expect(option.blockReason, label).toBe('No locker for him: the canteen holds eight');
      } else {
        expect(option.blockReason, label).not.toBe('No locker for him: the canteen holds eight');
      }
    }
    expect(canHire(eight, 'helper', null).ok).toBe(true);
    expect(canHire(eight, 'officeAdmin', null).ok).toBe(true);
  });

  it('leaves eight joiners room for a labourer: seven joiners and a labourer still take the eighth joiner s locker', () => {
    // The hall Piotr could not fill on v63: seven joiners and the labourer were the eight of the
    // lockers, and the eighth joiner the unit takes had none (PIOTR, 02.10).
    let state = withJoiners(CANTEEN_LOCKERS - 1);
    state = hireNow(state, 'helper', null);
    expect(state.workers).toHaveLength(CANTEEN_LOCKERS);
    expect(canHire(state, 'joiner', 'novice').reason).not.toBe('No locker for him: the canteen holds eight');
  });

  it('does not count the owner: he is not on the books and needs no locker', () => {
    // Eight joiners and the owner is nine people in the building and eight lockers, which is the
    // whole of the rule (PIOTR, 20.09).
    const eight = withJoiners(CANTEEN_LOCKERS);
    expect(eight.owner).toBeDefined();
    expect(eight.workers).toHaveLength(CANTEEN_LOCKERS);
  });

  it('says the canteen and not the shopping list, because a ninth locker cannot be bought', () => {
    // With the joiners at eight, the shortfall below would have said "Buy first: Locker" and sent
    // the player to a line the catalogue greys (CLAUDE.md T23 2.10).
    const eight = withJoiners(CANTEEN_LOCKERS, 0);
    const check = canHire(eight, 'joiner', 'novice');
    expect(check.reason).toBe('No locker for him: the canteen holds eight');
    expect(check.reason).not.toContain('Buy first');
  });
});
