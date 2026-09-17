// @vitest-environment jsdom
// The shopping list: everything on order on one panel, the shortest wait first, reachable from
// the top bar and from the pin board on the office wall (PIOTR, 13.09; CLAUDE.md T8 3.2).

import { describe, expect, it } from 'vitest';
import { shoppingList } from '../../src/engine/orders';
import { PIN_BOARD, leftWallMatrix, renderHall, wallMatrix } from '../../src/render/hall';
import { TILE_RISE, tileToScreen } from '../../src/render/iso';
import { roomById } from '../../src/engine/constants';
import { renderCatalogue } from '../../src/ui/catalogue';
import { renderShopping } from '../../src/ui/shopping';
import { renderTopbar } from '../../src/ui/topbar';
import { formatCalendarDay } from '../../src/engine/index';
import type { GameState } from '../../src/engine/index';
import { act, buyStartingKit, fillRack, newGame } from '../helpers';

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
  return state;
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
      // The CNC has its five classes from Turn 13, so its line names the class (T13 3.12).
      'Standard CNC',
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
    expect(html).toContain(`ordered ${formatCalendarDay(1)}`);
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

  it('is one click from the board by the entrance door of the hall', () => {
    const svg = renderHall(ordered());
    expect(svg).toContain('data-pinboard="1"');
    expect(svg).toContain('data-do="openModal" data-modal="shopping"');
    expect(svg).toContain('Orders: 4');
  });

  it('hangs in the left wall plane beside the personnel door, and not on the office', () => {
    // The door is at y 4.5 to 5.5 on x = 0 and the board beside it at y 3 to 4.5, 1.5 m up
    // (docs/art/SPRITES.md 9.3; CLAUDE.md T9 3.2).
    expect(PIN_BOARD).toEqual({ fromY: 3, toY: 4.5, z: 1.5, height: 0.7 });
    const at = tileToScreen(0, PIN_BOARD.toY, PIN_BOARD.z);
    // A metre along that wall is (-24, +12), so the lettering leans the other way from the rear
    // wall's: the matrix is the left wall's own and not the rear wall's.
    expect(leftWallMatrix(at)).toBe(`matrix(1,-0.5,0,1,${at.x},${at.y})`);
    expect(leftWallMatrix(at)).not.toBe(wallMatrix(at));
    const svg = renderHall(ordered());
    expect(svg).toContain(`transform="${leftWallMatrix(at)}"`);
    // The board is as wide as the span it hangs across.
    expect(svg).toContain(`width="${(PIN_BOARD.toY - PIN_BOARD.fromY) * TILE_RISE}"`);
    // And the office front face carries nothing (CLAUDE.md T9 3.2).
    const office = roomById('office');
    const onTheOffice = tileToScreen(office.x + 0.15, office.y + office.depth, 1.2);
    expect(svg).not.toContain(`transform="${wallMatrix(onTheOffice)}"`);
  });
});

describe('the Owned tab', () => {
  it('carries a tile for everything on order, with the bar and the day it is due', () => {
    const state = ordered();
    const page = parse(renderCatalogue(state, '', 'owned', null, 'all'));
    const tiles = Array.from(page.querySelectorAll('.tile.is-ordered'));
    expect(tiles).toHaveLength(3);
    expect(page.innerHTML).toContain('On order, due ');
    expect(page.innerHTML).toContain('class="order-bar"');
    // The kit that is here keeps its own frame beside them.
    expect(page.querySelectorAll('.tile.is-owned').length).toBeGreaterThan(0);
  });
});
