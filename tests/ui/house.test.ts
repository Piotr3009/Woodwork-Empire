// @vitest-environment jsdom
// The house card the owner sees when he goes home (PIOTR; CLAUDE.md T13 3.18): a still picture
// of the tier the ledger has paid for, its name, and one line.

import { describe, expect, it } from 'vitest';
import { HOUSE_TIER_NAMES, HOUSE_WINDOW_DAYS } from '../../src/engine/constants';
import { isWorkingDay } from '../../src/engine/clock';
import { houseTierFor } from '../../src/engine/owner';
import { HOUSE_LINE, housePictureKey, renderHouseCard } from '../../src/ui/house';
import type { GameState } from '../../src/engine/index';
import { newGame } from '../helpers';

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

/** A game whose ledger says the owner paid himself this much a day over the last thirty days. */
function paidAtTier(draw: number): GameState {
  const state = newGame();
  state.clock.day = 40;
  state.ledger = [];
  for (let day = 40 - HOUSE_WINDOW_DAYS + 1; day <= 40; day += 1) {
    if (!isWorkingDay(day)) continue;
    state.ledger.push({
      id: `draw-${day}`,
      day,
      minute: 0,
      category: 'ownerDraw',
      label: "Owner's draw",
      amount: -draw,
      balance: 0,
      unpaid: false,
    });
  }
  return state;
}

describe('the house card', () => {
  it('draws the picture of the tier, its name and the one line, word for word', () => {
    const page = parse(renderHouseCard(newGame()));
    const card = page.querySelector('.house-card');
    expect(card?.getAttribute('data-house-tier')).toBe('1');
    expect(housePictureKey(1)).toBe('house.1');
    expect(page.querySelector('[data-placeholder="house.1"]')).not.toBeNull();
    expect(page.querySelector('svg.house-picture')).not.toBeNull();
    expect(page.querySelector('.house-line')?.textContent).toBe(HOUSE_LINE);
    expect(HOUSE_LINE).toBe('Resting at home now. See you at the workshop in the morning.');
    expect(page.querySelector('.house-name')?.textContent).toContain(HOUSE_TIER_NAMES[0] ?? '');
  });

  it('shows the tier the ledger has paid for, not the one the setting names', () => {
    const state = paidAtTier(800);
    state.ownerDraw.tier = 7;
    expect(houseTierFor(state)).toBe(3);
    const page = parse(renderHouseCard(state));
    expect(page.querySelector('.house-card')?.getAttribute('data-house-tier')).toBe('3');
    expect(page.querySelector('[data-placeholder="house.3"]')).not.toBeNull();
    expect(page.querySelector('.house-name')?.textContent).toContain(HOUSE_TIER_NAMES[2] ?? '');
  });

  it('is a still picture: one svg, nothing that moves, and a card as wide as the day end', () => {
    const html = renderHouseCard(paidAtTier(10000));
    const page = parse(html);
    expect(page.querySelectorAll('svg')).toHaveLength(1);
    expect(html).not.toContain('<animate');
    expect(html).not.toContain('<video');
    expect(page.querySelector('svg')?.getAttribute('width')).toBe('900');
    expect(page.querySelector('[data-placeholder="house.8"]')).not.toBeNull();
  });
});
