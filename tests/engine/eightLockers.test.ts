// Eight lockers, eight men on the floor (PIOTR, 20.09; CLAUDE.md T23 2.10). The canteen was built
// with eight compartments, so a ninth locker cannot be bought and a ninth man on the floor cannot
// be taken on. The owner needs no locker: he is not on the books. A bigger canteen is parked
// (CLAUDE.md T23 8). From Turn 26 the lockers are the joiners' and the labourer's and nobody
// else's: the manager and the office keep none [PIOTR, 02.10: "the same as the crew"] (CLAUDE.md
// T26 2.10).
//
// The crew is asked for with labourers, because a labourer wants no bench and no kit and the unit's
// crew limit counts joiners only, so the canteen is the one thing that stops them.

import { describe, expect, it } from 'vitest';
import { CANTEEN_LOCKERS, CANTEEN_PLATES } from '../../src/engine/constants';
import { canBuy, countOf } from '../../src/engine/index';
import { canHire, hiringOptions } from '../../src/engine/staff';
import type { GameState } from '../../src/engine/index';
import { buyNow, hireNow, newGame } from '../helpers';

/** A shop with the cash and the standing to take anybody on, and the lockers asked for. */
function shop(lockers: number): GameState {
  let state = newGame({ difficulty: 'veryEasy' });
  state.cash = 900000;
  state.reputation = 90;
  for (let index = 0; index < lockers; index += 1) state = buyNow(state, 'locker');
  return state;
}

/** The same shop with that many labourers on the books, taken on through the gate itself. */
function withCrew(size: number, lockers = size): GameState {
  let state = shop(lockers);
  for (let index = 0; index < size; index += 1) {
    state = hireNow(state, 'helper', null);
  }
  if (state.workers.length !== size) {
    throw new Error(`wanted ${size} on the books, took on ${state.workers.length}`);
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

describe('the ninth man', () => {
  it('is refused with the canteen as the reason, and the eighth is taken on', () => {
    const eight = withCrew(CANTEEN_LOCKERS);
    expect(eight.workers).toHaveLength(CANTEEN_LOCKERS);
    const check = canHire(eight, 'helper', null);
    expect(check.ok).toBe(false);
    expect(check.reason).toBe('No locker for him: the canteen holds eight');
  });

  it('lets the eighth in: it is the ninth that is refused and not the eighth', () => {
    const seven = withCrew(CANTEEN_LOCKERS - 1);
    expect(canHire(seven, 'helper', null).ok).toBe(true);
  });

  it('is the ninth on the floor, a joiner or the labourer, and the office and the manager are not asked', () => {
    // Every line of the hire card at once: a joiner and a labourer keep their things in the
    // canteen and are refused by it; the manager and the office keep none from Turn 26 and are
    // refused by nothing of the canteen's (CLAUDE.md T26 2.10).
    const eight = withCrew(CANTEEN_LOCKERS);
    const options = hiringOptions(eight);
    expect(options.length).toBeGreaterThan(4);
    for (const option of options) {
      const label = `${option.role} ${option.tier ?? ''}`;
      if (option.role === 'joiner' || option.role === 'helper') {
        expect(option.available, label).toBe(false);
        expect(option.blockReason, label).toBe('No locker for him: the canteen holds eight');
      } else {
        expect(option.blockReason, label).not.toBe('No locker for him: the canteen holds eight');
      }
    }
    expect(canHire(eight, 'officeAdmin', null).ok).toBe(true);
  });

  it('does not count the owner: he is not on the books and needs no locker', () => {
    // Eight men and the owner is nine people in the building and eight lockers, which is the
    // whole of the rule (PIOTR, 20.09).
    const eight = withCrew(CANTEEN_LOCKERS);
    expect(eight.owner).toBeDefined();
    expect(eight.workers).toHaveLength(CANTEEN_LOCKERS);
    // The eight were taken on one by one and none of them was ever refused for want of a locker.
    expect(canHire(withCrew(CANTEEN_LOCKERS - 1), 'helper', null).ok).toBe(true);
  });

  it('says the canteen and not the shopping list, because a ninth locker cannot be bought', () => {
    // With the crew at eight, the shortfall below would have said "Buy first: Locker" and sent
    // the player to a line the catalogue greys (CLAUDE.md T23 2.10).
    const eight = withCrew(CANTEEN_LOCKERS, 0);
    const check = canHire(eight, 'joiner', 'novice');
    expect(check.reason).toBe('No locker for him: the canteen holds eight');
    expect(check.reason).not.toContain('Buy first');
  });
});
