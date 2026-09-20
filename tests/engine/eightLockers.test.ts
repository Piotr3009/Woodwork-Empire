// Eight lockers, eight men (PIOTR, 20.09; CLAUDE.md T23 2.10). The canteen was built with eight
// compartments, so a ninth locker cannot be bought and a ninth man cannot be taken on. The owner
// needs no locker: he is not on the books. A bigger canteen is parked (CLAUDE.md T23 8).
//
// The crew is asked for with office staff, because the floor limit gets to the men on the floor
// first: 200 m2 at 24 m2 a person is six people counting the owner, and the benches and cabinets
// they want eat into that (CLAUDE.md T13 3.10). Office staff are not floor limited, so they are
// how a shop reaches nine on the books at all, and the canteen is what stops them there.

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

/** The same shop with that many men on the books, taken on through the gate itself. */
function withCrew(size: number, lockers = size): GameState {
  let state = shop(lockers);
  for (let index = 0; index < size; index += 1) {
    state = hireNow(state, 'officeAdmin', null);
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
    const check = canHire(eight, 'officeAdmin', null);
    expect(check.ok).toBe(false);
    expect(check.reason).toBe('No locker for him: the canteen holds eight');
  });

  it('lets the eighth in: it is the ninth that is refused and not the eighth', () => {
    const seven = withCrew(CANTEEN_LOCKERS - 1);
    expect(canHire(seven, 'officeAdmin', null).ok).toBe(true);
  });

  it('is the ninth whatever his trade, because every man on the books keeps his things there', () => {
    // Every line of the hire card at once: with the standing, the admin and the cash all there,
    // the canteen is the one thing left to refuse any of them.
    const eight = withCrew(CANTEEN_LOCKERS);
    const options = hiringOptions(eight);
    expect(options.length).toBeGreaterThan(4);
    for (const option of options) {
      expect(option.available, `${option.role} ${option.tier ?? ''}`).toBe(false);
      expect(option.blockReason, `${option.role} ${option.tier ?? ''}`).toBe(
        'No locker for him: the canteen holds eight',
      );
    }
  });

  it('does not count the owner: he is not on the books and needs no locker', () => {
    // Eight men and the owner is nine people in the building and eight lockers, which is the
    // whole of the rule (PIOTR, 20.09).
    const eight = withCrew(CANTEEN_LOCKERS);
    expect(eight.owner).toBeDefined();
    expect(eight.workers).toHaveLength(CANTEEN_LOCKERS);
    // The eight were taken on one by one and none of them was ever refused for want of a locker.
    expect(canHire(withCrew(CANTEEN_LOCKERS - 1), 'officeAdmin', null).ok).toBe(true);
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
