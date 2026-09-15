// @vitest-environment jsdom
// The board tile after Turn 13: the figure on it is the client's budget, the reputation in the
// head carries the website's bonus, and a commercial enquiry says so and says why it is greyed
// (CLAUDE.md T13 3.7, 3.15, 3.24).

import { describe, expect, it } from 'vitest';
import { NO_INSURANCE_REASON } from '../../src/engine/constants';
import { renderBoard } from '../../src/ui/board';
import { money } from '../../src/ui/modal';
import type { GameState } from '../../src/engine/index';
import { act, buyNow, buyStartingKit, newGame, placeEnquiry } from '../helpers';

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

describe('a commercial enquiry on the board (CLAUDE.md T13 3.15)', () => {
  /** The day 1 kit and a commercial enquiry the post drew while no cover was held. */
  function withCommercial(): GameState {
    const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    state.reputation = 30;
    state.website.level = 2;
    state.enquiries = [];
    placeEnquiry(state, {
      kind: 'commercial',
      name: 'Garage shelves, commercial',
      price: 2000,
      deadlineDays: 60,
      unreachable: true,
      blockReason: NO_INSURANCE_REASON,
    });
    return act(state, { type: 'SET_SPEED', speed: 1 });
  }

  it('says Commercial, is greyed with "no insurance", carries no Accept, and points at the laptop', () => {
    const state = withCommercial();
    const enquiry = state.enquiries[0];
    const page = parse(renderBoard(state, ''));
    const tile = page.querySelector(`[data-enquiry="${enquiry?.id}"]`);
    expect(tile?.getAttribute('data-kind')).toBe('commercial');
    expect(tile?.className).toContain('is-out-of-reach');
    expect(text(tile?.querySelector('.badges'))).toContain('Commercial');
    expect(text(tile?.querySelector('.lock'))).toBe(`Cannot take this: ${NO_INSURANCE_REASON}`);
    expect(tile?.querySelectorAll('[data-do="acceptEnquiry"]')).toHaveLength(0);
    expect(tile?.querySelector('[data-do="openModal"]')?.getAttribute('data-modal')).toBe('laptop');
    expect(text(tile?.querySelector('.tile-price'))).toBe(`Budget ${money(2000)}`);
  });

  it('goes live with Accept once both covers are held', () => {
    let state = withCommercial();
    state = act(state, { type: 'SET_INSURANCE', cover: 'property', on: true });
    state = act(state, { type: 'SET_INSURANCE', cover: 'liability', on: true });
    const enquiry = state.enquiries[0];
    const tile = parse(renderBoard(state, '')).querySelector(`[data-enquiry="${enquiry?.id}"]`);
    expect(tile?.className).not.toContain('is-out-of-reach');
    expect(tile?.querySelector('.lock')).toBeNull();
    expect(tile?.querySelectorAll('[data-do="acceptEnquiry"]')).toHaveLength(1);
    expect(text(tile?.querySelector('.badges'))).toContain('Commercial');
  });
});
