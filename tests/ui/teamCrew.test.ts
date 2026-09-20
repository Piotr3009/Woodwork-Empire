// @vitest-environment jsdom
// The floor's verdict on the team page (PIOTR; CLAUDE.md T13 3.10): "Crew 4 / 5, floor limited",
// on the two tabs that hire onto the floor, and the refusal on the tile when it is full.

import { describe, expect, it } from 'vitest';
import { crewLine } from '../../src/engine/index';
import { missingForHire } from '../../src/engine/staff';
import { renderTeam } from '../../src/ui/team';
import type { GameState } from '../../src/engine/index';
import { buyNow, buyStartingKit, hireNow, newGame } from '../helpers';

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

/** Buys what one more joiner wants and takes him on, so many times. */
function withCrew(state: GameState, count: number): GameState {
  let next = state;
  for (let index = 0; index < count; index += 1) {
    let guard = 0;
    while (missingForHire(next, 'joiner').length > 0 && guard < 20) {
      for (const specId of missingForHire(next, 'joiner')) next = buyNow(next, specId);
      guard += 1;
    }
    next = hireNow(next, 'joiner', 'novice');
  }
  return next;
}

describe('the floor limit on the team page', () => {
  it('prints the crew line on Workshop and Management, and not on the desks', () => {
    const state = buyStartingKit(known());
    for (const tab of ['workshop', 'management'] as const) {
      const page = parse(renderTeam(state, tab));
      expect(page.querySelector('.crew-limit')?.textContent).toBe(crewLine(state));
      expect(page.querySelector('.crew-limit')?.textContent).toContain('the unit takes');
    }
    expect(parse(renderTeam(state, 'office')).querySelector('.crew-limit')).toBeNull();
    expect(parse(renderTeam(state, 'technical')).querySelector('.crew-limit')).toBeNull();
  });

  it('reads "Crew 5 / 8" with the owner and four, and the tiles still hire (v37)', () => {
    // The unit takes eight since v37 (PIOTR, 20.09), so four men and the owner leave three seats
    // and the tiles are not refused by the crew line.
    const state = withCrew(buyStartingKit(known()), 4);
    const page = parse(renderTeam(state, 'workshop'));
    expect(page.querySelector('.crew-limit')?.textContent).toBe('Crew 5 / 8, the unit takes 8 people');
    const novice = page.querySelector('[data-candidate="joiner.novice"]');
    expect(novice?.textContent).not.toContain('the unit takes');
    const helper = page.querySelector('[data-candidate="helper."]');
    expect(helper?.textContent).not.toContain('the unit takes');
    // The desks are not on the floor: the admin can still be taken on.
    const office = parse(renderTeam(state, 'office'));
    expect(office.querySelector('[data-candidate="officeAdmin."]')?.querySelectorAll('[data-do="hire"]')).toHaveLength(1);
  });
});
