// @vitest-environment jsdom
// Four classes of man, and the words the game prints for them: no experience, experienced, very
// experienced, excellent, off the one TIER_WORDS table (PIOTR, 19.09; CLAUDE.md T21 2.9). Turn 20
// printed "super experienced" and "extremely experienced", which were Claude's words and not
// Piotr's, so this turn forbids them in src along with the 1.4 of the old top rate
// (CLAUDE.md T21 2.9, 7). Who applies depends on the standing the workshop has earned, and the
// card says what is missing in the game's own voice. The pay beside them is the month, and only
// the month (CLAUDE.md T21 2.10).

import { describe, expect, it } from 'vitest';
import { TIER_MIN_REPUTATION, TIER_WORDS } from '../../src/engine/constants';
import { hiringOptions, monthlyWageOf } from '../../src/engine/staff';
import { money } from '../../src/ui/modal';
import { renderTeam } from '../../src/ui/team';
import type { GameState } from '../../src/engine/index';
import {
  buyStartingKit,
  fillRack,
  hireNow,
  newGame,
  placeEquipment,
} from '../helpers';

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

function tile(state: GameState, candidate: string): HTMLElement | null {
  const page = parse(renderTeam(state, 'workshop'));
  return page.querySelector(`[data-candidate="${candidate}"]`);
}

/** The welfare and the tools a joiner has to have, so the standing is the only thing in the way. */
function kitted(reputation: number): GameState {
  const state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
  state.enquiries = [];
  placeEquipment(state, 'locker', { x: 6, y: 9 });
  placeEquipment(state, 'handToolSet', { x: 12, y: 9 });
  placeEquipment(state, 'toolCabinet', { x: 10, y: 9 });
  state.reputation = reputation;
  state.cash = 200000;
  return state;
}

describe('the four classes on the hire cards', () => {
  it('names them in the words the game prints, and never in an engine id', () => {
    const page = parse(renderTeam(kitted(60), 'workshop'));
    const text = page.textContent ?? '';
    for (const words of Object.values(TIER_WORDS)) expect(text).toContain(words);
    // The ids themselves are never printed. `experienced` is left out of this list because it is
    // a word of the table as well as an id of it.
    for (const id of ['novice', 'senior', 'master']) expect(text).not.toContain(id);
    expect(page.querySelector('[data-candidate="joiner.master"]')).not.toBeNull();
  });

  it('withholds the classes the workshop has not earned, and says what is missing', () => {
    const low = kitted(0);
    expect(tile(low, 'joiner.master')?.textContent).toContain(
      `excellent joiners come from reputation ${TIER_MIN_REPUTATION.master}`,
    );
    expect(tile(low, 'joiner.senior')?.textContent).toContain(
      'very experienced joiners come from reputation 35',
    );
    // The man with no experience always answers: nothing about the standing on his card.
    expect(tile(low, 'joiner.novice')?.textContent).not.toContain('come from reputation 15');
    // The refusal is the game's own way of saying a control is out of reach.
    expect(tile(low, 'joiner.master')?.querySelector('.reason')).not.toBeNull();
    expect(tile(low, 'joiner.master')?.querySelector('[data-do="hire"]')).toBeNull();
  });

  it('offers the top class once the workshop is known enough for it', () => {
    const known = kitted(TIER_MIN_REPUTATION.master);
    const option = hiringOptions(known).find(
      (entry) => entry.role === 'joiner' && entry.tier === 'master',
    );
    expect(option?.blockReason).not.toContain('come from reputation');
    expect(tile(known, 'joiner.master')?.querySelector('[data-do="hire"]')).not.toBeNull();
  });

  it('prints the month he is paid by, and no week beside it, on the card and on the crew row', () => {
    const state = hireNow(kitted(60), 'joiner', 'senior');
    const man = state.workers[0];
    if (!man) throw new Error('nobody on the books');
    // One unit of pay and it is the month, so the one line is the month's figure: a very
    // experienced joiner is on 3,500 (CLAUDE.md T21 2.9, 2.10).
    const month = `${money(man.monthlyWage)} a month`;
    expect(man.monthlyWage).toBe(3500);
    expect(monthlyWageOf(man)).toBe(man.monthlyWage);
    const page = parse(renderTeam(state, 'workshop'));
    expect(page.querySelector(`[data-crew="${man.id}"]`)?.textContent).toContain(month);
    expect(page.querySelector(`[data-crew="${man.id}"]`)?.textContent).toContain(
      TIER_WORDS.senior,
    );
    expect(page.querySelector(`[data-crew="${man.id}"]`)?.textContent).not.toContain('a week');
    expect(tile(state, 'joiner.senior')?.textContent).toContain(month);
    // And Our team says the same figure and the same words. From Turn 23 it says them on his tile
    // and in two chips rather than in one line of a row (CLAUDE.md T23 2.13), but they are the
    // same words off the same `TIER_WORDS`.
    const roll = parse(renderTeam(state, 'ourTeam'));
    const own = roll.querySelector(`[data-person="${man.id}"]`);
    expect(own?.querySelector('[data-wage]')?.textContent).toContain(month);
    expect(own?.querySelector('[data-role]')?.textContent).toBe('joiner');
    expect(own?.querySelector('[data-grade]')?.textContent).toContain(TIER_WORDS.senior);
  });
});
