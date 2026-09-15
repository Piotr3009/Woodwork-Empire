// @vitest-environment jsdom
// The board tile after Turn 13: the figure on it is the client's budget, the reputation in the
// head carries the website's bonus, and a commercial enquiry says so and says why it is greyed
// (CLAUDE.md T13 3.7, 3.15, 3.24).

import { describe, expect, it } from 'vitest';
import { renderBoard } from '../../src/ui/board';
import { money } from '../../src/ui/modal';
import type { GameState } from '../../src/engine/index';
import { buyNow, newGame, placeEnquiry } from '../helpers';

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

function text(element: Element | null | undefined): string {
  return (element?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/** A hall with a laptop, which is what the enquiries come in on, and a clean board. */
function withBoard(): GameState {
  const state = buyNow(buyNow(newGame({ difficulty: 'veryEasy' }), 'desk'), 'laptop');
  state.enquiries = [];
  return state;
}

describe('the board tile', () => {
  it('shows the budget and not a price, and carries the kind of client', () => {
    const state = withBoard();
    const enquiry = placeEnquiry(state, { price: 9000 });
    const page = parse(renderBoard(state, ''));
    const tile = page.querySelector(`[data-enquiry="${enquiry.id}"]`);
    expect(text(tile?.querySelector('.tile-price'))).toBe(`Budget ${money(9000)}`);
    expect(tile?.getAttribute('data-kind')).toBe('residential');
    expect(page.innerHTML).not.toContain(`Price ${money(9000)}`);
  });

  it('reads the reputation with the website’s bonus in it, and says so', () => {
    const state = withBoard();
    state.reputation = 10;
    state.website.level = 2;
    expect(parse(renderBoard(state, '')).textContent).toContain('Reputation 10 ');
    expect(parse(renderBoard(state, '')).textContent).not.toContain('The website holds');
    state.website.level = 4;
    const page = parse(renderBoard(state, ''));
    expect(page.textContent).toContain('Reputation 12 ');
    expect(page.textContent).toContain('The website holds +2 of that.');
    expect(page.querySelector('.figure.good')?.textContent).toBe('+2');
  });
});
