// @vitest-environment jsdom
// The shopping list: everything on order on one panel, the shortest wait first, reachable from
// the top bar and from the pin board on the office wall (PIOTR, 13.09; CLAUDE.md T8 3.2).

import { describe, expect, it } from 'vitest';
import { SHOPPING_MINUTES, SHOPPING_NEXT_MINUTES } from '../../src/engine/constants';
import { shoppingList } from '../../src/engine/orders';
import { renderHall } from '../../src/render/hall';
import { renderCatalogue } from '../../src/ui/catalogue';
import { renderShopping } from '../../src/ui/shopping';
import { renderTopbar } from '../../src/ui/topbar';
import type { GameState } from '../../src/engine/index';
import { act, buyStartingKit, fillRack, newGame, runClock } from '../helpers';

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

/** A hall with the day 1 kit, a CNC, a van and a standard saw on order, and a load of sheets. */
function ordered(): GameState {
  let state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
  state.cash = 200000;
  for (const [specId, variantId] of [
    ['cnc', 'standard'],
    ['van', 'standard'],
    ['tableSaw', 'standard'],
  ]) {
    state = act(state, { type: 'BUY_EQUIPMENT', specId: specId ?? '', variantId });
  }
  state = act(state, { type: 'BUY_STOCK', sheets: 4 });
  return runClock(state, SHOPPING_MINUTES + SHOPPING_NEXT_MINUTES * 2);
}

describe('the shopping list', () => {
  it('carries the kit and the material on one list, shortest wait first', () => {
    const state = ordered();
    const lines = shoppingList(state);
    // Sheets next working day, the saw in 5, the van in 3, the CNC in 45.
    expect(lines.map((line) => line.name)).toEqual([
      '4 sheets',
      'Van',
      'Standard table saw',
      'CNC',
    ]);
    const days = lines.map((line) => line.dueDay);
    expect(days).toEqual([...days].sort((left, right) => left - right));
  });

  it('says what each one cost, when it was ordered and when it comes', () => {
    const page = parse(renderShopping(ordered()));
    const rows = Array.from(page.querySelectorAll('.order-row'));
    expect(rows).toHaveLength(4);
    const html = page.innerHTML;
    expect(html).toContain('£45,000 paid');
    expect(html).toContain('ordered day 1');
    expect(html).toContain('arrives tomorrow at 08:00');
    expect(html).toContain('class="order-bar"');
    // The bar runs from the day of the click to the day of the lorry: nothing has moved yet.
    expect(page.querySelector('.order-bar')?.getAttribute('data-progress')).toBe('0');
  });

  it('says so plainly when there is nothing on order', () => {
    const state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
    expect(renderShopping(state)).toContain('Nothing on order.');
  });

  it('is one click from the top bar, with the count on the chip', () => {
    const bar = renderTopbar(ordered(), 'hall');
    expect(bar).toContain('data-do="openModal" data-modal="shopping"');
    expect(bar).toContain('Orders: 4');
    expect(renderTopbar(newGame(), 'hall')).toContain('Orders: 0');
  });

  it('is one click from the pin board on the office wall in the hall', () => {
    const svg = renderHall(ordered());
    expect(svg).toContain('data-pinboard="1"');
    expect(svg).toContain('data-do="openModal" data-modal="shopping"');
    expect(svg).toContain('Orders: 4');
  });
});

describe('the Owned tab', () => {
  it('carries a tile for everything on order, with the bar and the day it is due', () => {
    const state = ordered();
    const page = parse(renderCatalogue(state, '', 'owned', null, 'all'));
    const tiles = Array.from(page.querySelectorAll('.tile.is-ordered'));
    expect(tiles).toHaveLength(3);
    expect(page.innerHTML).toContain('On order, due day');
    expect(page.innerHTML).toContain('class="order-bar"');
    // The kit that is here keeps its own frame beside them.
    expect(page.querySelectorAll('.tile.is-owned').length).toBeGreaterThan(0);
  });
});
