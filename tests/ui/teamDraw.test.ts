// @vitest-environment jsdom
// The owner's draw on his own card (PIOTR; CLAUDE.md T13 3.18): eight thresholds as eight buttons,
// the one held marked, the house tier and the thirty day sum beside them. No slider, no
// suggestion, no softening: the conflict "machines or me" is the whole point.

import { describe, expect, it } from 'vitest';
import { HOUSE_TIER_NAMES, HOUSE_WINDOW_DAYS, OWNER_DRAW_TIERS } from '../../src/engine/constants';
import { isWorkingDay } from '../../src/engine/clock';
import { houseSumFor } from '../../src/engine/owner';
import { money } from '../../src/ui/modal';
import { renderTeam } from '../../src/ui/team';
import type { GameState } from '../../src/engine/index';
import { act, newGame } from '../helpers';

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

function known(reputation = 40): GameState {
  const state = newGame({ difficulty: 'veryEasy' });
  state.reputation = reputation;
  return state;
}

/** A game whose ledger says the owner paid himself this much a day over the last thirty days. */
function paidAtDraw(draw: number): GameState {
  const state = known();
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

describe('the owner’s draw on the team page', () => {
  it('offers the eight thresholds as buttons, the one held marked, and no slider', () => {
    const page = parse(renderTeam(known(), 'workshop'));
    const chips = Array.from(page.querySelectorAll('[data-do="setOwnerDraw"]'));
    expect(chips).toHaveLength(OWNER_DRAW_TIERS.length);
    expect(chips).toHaveLength(8);
    expect(chips.map((chip) => chip.getAttribute('data-id'))).toEqual(
      OWNER_DRAW_TIERS.map((_draw, index) => String(index)),
    );
    expect(chips.map((chip) => chip.textContent)).toEqual(
      OWNER_DRAW_TIERS.map((draw) => money(draw)),
    );
    expect(chips[0]?.className).toContain('is-on');
    expect(chips[1]?.className).not.toContain('is-on');
    expect(page.querySelectorAll('input[type="range"]')).toHaveLength(0);
    expect(page.querySelector('.owner-card')?.textContent).toContain(`${money(200)} a day`);
  });

  it('marks a raised draw at once, and makes the house wait for the money', () => {
    const raised = parse(renderTeam(act(known(), { type: 'SET_OWNER_DRAW', tier: 3 }), 'workshop'));
    expect(raised.querySelector('[data-do="setOwnerDraw"][data-id="3"]')?.className).toContain('is-on');
    expect(raised.querySelectorAll('[data-do="setOwnerDraw"].is-on')).toHaveLength(1);
    expect(raised.querySelector('.owner-card')?.textContent).toContain(`${money(1500)} a day`);
    expect(raised.querySelector('[data-house-tier]')?.getAttribute('data-house-tier')).toBe('1');
  });

  it('shows the house the ledger has paid for, its name, the thirty day sum and the next step', () => {
    const fresh = parse(renderTeam(known(), 'workshop'));
    const house = fresh.querySelector('[data-house-tier]');
    expect(house?.getAttribute('data-house-tier')).toBe('1');
    expect(house?.textContent).toContain(HOUSE_TIER_NAMES[0] ?? '');
    expect(house?.textContent).toContain(`Paid yourself ${money(200)} in the last thirty days`);
    expect(house?.textContent).toContain(`The next house wants ${money(houseSumFor(1))}`);
    const flat = parse(renderTeam(paidAtDraw(400), 'workshop')).querySelector('[data-house-tier]');
    expect(flat?.getAttribute('data-house-tier')).toBe('2');
    expect(flat?.textContent).toContain(HOUSE_TIER_NAMES[1] ?? '');
    // At the top there is no next step to name.
    const villa = parse(renderTeam(paidAtDraw(10000), 'workshop')).querySelector('[data-house-tier]');
    expect(villa?.getAttribute('data-house-tier')).toBe('8');
    expect(villa?.textContent).not.toContain('The next house wants');
  });
});
