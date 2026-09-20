// @vitest-environment jsdom
// The ninth locker on the catalogue's own line: greyed, with the canteen as the reason and no Buy
// button to press (PIOTR, 20.09; CLAUDE.md T23 2.10). The refusal itself is the engine's and is
// held to its words by tests/engine/eightLockers.test.ts; this is what the player reads.

import { describe, expect, it } from 'vitest';
import { renderMachine } from '../../src/ui/machine';
import { CANTEEN_LOCKERS } from '../../src/engine/constants';
import type { GameState } from '../../src/engine/index';
import { buyNow, newGame } from '../helpers';

function tile(state: GameState): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = renderMachine(state, 'locker');
  const first = holder.querySelector('.tile');
  if (!(first instanceof HTMLElement)) throw new Error('no locker tile in the catalogue');
  return first;
}

function shop(lockers: number): GameState {
  let state = newGame({ difficulty: 'veryEasy' });
  state.cash = 900000;
  for (let index = 0; index < lockers; index += 1) state = buyNow(state, 'locker');
  return state;
}

describe('the locker line of the catalogue', () => {
  it('offers the eighth with a Buy button, like any other line', () => {
    const seven = tile(shop(CANTEEN_LOCKERS - 1));
    expect(seven.className).not.toContain('is-locked');
    expect(seven.querySelector('[data-do="buyEquipment"][data-id="locker"]')).not.toBeNull();
    expect(seven.querySelector('.lock')).toBeNull();
  });

  it('greys the ninth and says the canteen is full, with no button to press', () => {
    const eight = tile(shop(CANTEEN_LOCKERS));
    expect(eight.className).toContain('is-locked');
    expect(eight.querySelector('.lock')?.textContent).toBe('The canteen has eight lockers');
    expect(eight.querySelector('[data-do="buyEquipment"]')).toBeNull();
    // The one disabled button in the game carries the reason in its title (docs/ui-style.md 3).
    const locked = eight.querySelector('button[disabled]');
    expect(locked?.getAttribute('title')).toBe('The canteen has eight lockers');
  });

  it('counts the eight and not some other figure', () => {
    // The word in the sentence and the figure the gate counts by are the same eight, so a bigger
    // canteen would have to change both (CLAUDE.md T23 8).
    expect(CANTEEN_LOCKERS).toBe(8);
    expect(tile(shop(CANTEEN_LOCKERS - 1)).className).not.toContain('is-locked');
    expect(tile(shop(CANTEEN_LOCKERS)).className).toContain('is-locked');
  });
});
