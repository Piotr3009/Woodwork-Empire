// Joinery Core is charged once (PIOTR, 16.09; CLAUDE.md T17 2.21). The first month goes out of
// the account at the click, as "Joinery Core, first month", and the month end that closes that
// month carries no line for it: the subscription starts the month after. Each extension is the
// same shape at its own price.

import { describe, expect, it } from 'vitest';
import {
  JOINERY_CORE_EXTENSION_PRICE_YEARLY,
  JOINERY_CORE_PRICE_YEARLY,
} from '../../src/engine/constants';
import { joineryCoreMonthly } from '../../src/engine/economy';
import { monthOfDay } from '../../src/engine/clock';
import type { GameState } from '../../src/engine/index';
import { act, buyStartingKit, fillRack, newGame, runToDay } from '../helpers';

const MONTHLY = Math.round((JOINERY_CORE_PRICE_YEARLY / 12) * 100) / 100;

/** A hall with a laptop on the desk and the money for the software. */
function withLaptop(): GameState {
  const state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
  state.enquiries = [];
  return state;
}

function softwareLines(state: GameState, label: string): number {
  return state.ledger.filter((entry) => entry.label === label).length;
}

describe('Joinery Core', () => {
  it('is paid for at the click, and the first month end asks for nothing', () => {
    const bought = act(withLaptop(), { type: 'BUY_JOINERY_CORE' });
    expect(bought.software.joineryCore).toBe(true);
    expect(softwareLines(bought, 'Joinery Core, first month')).toBe(1);
    // The month it was bought in is written down the moment the state settles.
    expect(bought.software.joineryCoreFromMonth).toBe(monthOfDay(bought.clock.day));
    expect(joineryCoreMonthly(bought)).toBe(0);
    // On to the 1st of the next month: the month end that closes month 1 has no line for it.
    const next = runToDay(bought, 31).state;
    expect(monthOfDay(next.clock.day)).toBe(2);
    expect(softwareLines(next, 'Joinery Core')).toBe(0);
    expect(softwareLines(next, 'Joinery Core, first month')).toBe(1);
  });

  it('starts the subscription the month after, and charges it every month from then', () => {
    const bought = act(withLaptop(), { type: 'BUY_JOINERY_CORE' });
    const later = runToDay(bought, 61).state;
    expect(monthOfDay(later.clock.day)).toBe(3);
    expect(joineryCoreMonthly(later)).toBe(MONTHLY);
    expect(softwareLines(later, 'Joinery Core')).toBe(1);
    const after = runToDay(later, 91).state;
    expect(softwareLines(after, 'Joinery Core')).toBe(2);
  });

  it('treats each extension the same way, from the month it was bought in', () => {
    let state = act(withLaptop(), { type: 'BUY_JOINERY_CORE' });
    // An extension in month 2, once the core itself is running.
    state = runToDay(state, 31).state;
    state = act(state, { type: 'BUY_JOINERY_CORE_EXTENSION' });
    expect(state.software.joineryCoreExtensionMonths).toEqual([2]);
    expect(softwareLines(state, 'Joinery Core extension, first month')).toBe(1);
    // Month 3: the core is charged, the extension is not, because month 2 was paid at the click.
    const third = runToDay(state, 61).state;
    expect(joineryCoreMonthly(third)).toBe(MONTHLY);
    // Month 4: both of them.
    const fourth = runToDay(third, 91).state;
    const both =
      Math.round(
        ((JOINERY_CORE_PRICE_YEARLY + JOINERY_CORE_EXTENSION_PRICE_YEARLY) / 12) * 100,
      ) / 100;
    expect(joineryCoreMonthly(fourth)).toBe(both);
  });
});
