// @vitest-environment jsdom
// The advertising agency's card on the Website page, in the management software's card, and the
// big job's line on the board, red until the hall has the free joiners and green once it has
// (CLAUDE.md T26 2.13; docs/mockups/t26/agency-card.html).

import { describe, expect, it } from 'vitest';
import { AGENCY_JOB_REPUTATION, AGENCY_JOB_VALUE_MIN } from '../../src/engine/constants';
import { bigJobJoinersFor, setAgency } from '../../src/engine/agency';
import { monthName } from '../../src/engine/clock';
import { renderBoard } from '../../src/ui/board';
import { renderWebsite } from '../../src/ui/website';
import type { GameState } from '../../src/engine/index';
import { buyNow, buyStartingKit, fillRack, newGame, placeEnquiry, testJoiner } from '../helpers';

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

function shop(reputation = AGENCY_JOB_REPUTATION + 10): GameState {
  let state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 60);
  if (!state.equipment.some((item) => item.specId === 'laptop')) state = buyNow(state, 'laptop');
  state.reputation = reputation;
  state.enquiries = [];
  return state;
}

function bigJobOn(state: GameState): void {
  placeEnquiry(state, {
    id: 'enq-big',
    name: 'Wardrobe x 63',
    templateId: 'wardrobe',
    price: AGENCY_JOB_VALUE_MIN,
    basePrice: AGENCY_JOB_VALUE_MIN,
    budget: AGENCY_JOB_VALUE_MIN,
    joinersWanted: bigJobJoinersFor(AGENCY_JOB_VALUE_MIN),
    deadlineDays: 33,
  });
}

describe('the agency s card', () => {
  it('is off in the software card s classes: what it costs, what it brings, and Turn it on', () => {
    const card = parse(renderWebsite(shop())).querySelector('[data-agency]');
    expect(card?.getAttribute('data-agency')).toBe('off');
    expect(card?.classList.contains('card')).toBe(true);
    expect(card?.querySelector('.card-main h3')?.textContent).toBe('Advertising agency');
    expect(card?.querySelector('.figures strong')?.textContent).toBe('£5,000 a month');
    expect(card?.textContent).toContain('£100,000 to £1,000,000, one at a time, from a standing of 50');
    expect(card?.textContent).toContain('Each wants 4 to 8 joiners free on the day it is taken.');
    const button = card?.querySelector('.card-action button');
    expect(button?.getAttribute('data-do')).toBe('setAgency');
    expect(button?.getAttribute('data-id')).toBe('on');
    expect(button?.textContent).toBe('Turn it on');
  });

  it('is locked below the standing, with the reason in the button s title', () => {
    const card = parse(renderWebsite(shop(AGENCY_JOB_REPUTATION - 1))).querySelector('[data-agency]');
    const button = card?.querySelector('.card-action button');
    expect(button?.hasAttribute('disabled')).toBe(true);
    expect(button?.getAttribute('title')).toBe(`Takes on a shop with a standing of ${AGENCY_JOB_REPUTATION}`);
  });

  it('says since when and the big job on the board while it is on, and Turn it off', () => {
    const state = shop();
    setAgency(state, true);
    bigJobOn(state);
    const card = parse(renderWebsite(state)).querySelector('[data-agency]');
    expect(card?.getAttribute('data-agency')).toBe('on');
    expect(card?.textContent).toContain(
      `On since 1 ${monthName(1)}. On the board now: Wardrobe x 63, £100,000, wants 4 joiners free.`,
    );
    expect(card?.querySelector('.card-action button')?.textContent).toBe('Turn it off');
  });
});

describe('the big job s card on the board', () => {
  it('wants four joiners free in red with two, and in green with four, and only then takes', () => {
    const state = shop();
    state.workers.push(testJoiner('staff-1', 'Ann', 4, 6), testJoiner('staff-2', 'Bob', 5, 6));
    bigJobOn(state);
    const short = parse(renderBoard(state, '')).querySelector('[data-enquiry="enq-big"]');
    const red = short?.querySelector('[data-big-job="crew"]');
    expect(red?.textContent).toBe('Wants 4 joiners free: you have 2');
    // In the game's red, on a span of its own inside the line (the folder inks the paragraph).
    expect(red?.querySelector('span')?.classList.contains('bad')).toBe(true);
    expect(short?.querySelector('[data-do="acceptEnquiry"]')).toBeNull();
    state.workers.push(testJoiner('staff-3', 'Cal', 6, 6), testJoiner('staff-4', 'Dee', 7, 6));
    const ready = parse(renderBoard(state, '')).querySelector('[data-enquiry="enq-big"]');
    const green = ready?.querySelector('[data-big-job="crew"]');
    expect(green?.textContent).toBe('Wants 4 joiners free: you have 4');
    expect(green?.querySelector('span')?.classList.contains('good')).toBe(true);
    expect(ready?.querySelector('[data-do="acceptEnquiry"]')).not.toBeNull();
  });
});
