// @vitest-environment jsdom
// The Security tab of the laptop, under Admin (CLAUDE.md T13 3.17): the ladder, the one held,
// the cost in words, the risk a month, and the firm's formula with this hall's figures in it.

import { describe, expect, it } from 'vitest';
import { SECURITY_LEVELS } from '../../src/engine/constants';
import { securitySubscriptionMonthly } from '../../src/engine/security';
import { renderLaptop } from '../../src/ui/laptop';
import { renderSecurity } from '../../src/ui/security';
import { money } from '../../src/ui/modal';
import { act, newGame } from '../helpers';

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

describe('the security tab', () => {
  it('is the Admin tab of the laptop, and lists the six levels with the one held marked', () => {
    const state = newGame({ difficulty: 'veryEasy' });
    const laptop = parse(renderLaptop(state, { tab: 'security', stockSheets: '' }));
    expect(laptop.querySelector('[data-do="laptopTab"][data-id="security"]')?.className).toContain('is-on');
    const cards = Array.from(laptop.querySelectorAll('.security-level'));
    expect(cards.map((card) => card.getAttribute('data-level'))).toEqual(['0', '1', '2', '3', '4', '5']);
    expect(cards[0]?.classList.contains('is-held')).toBe(true);
    expect(cards[0]?.textContent).toContain('Held');
    expect(cards[0]?.querySelector('[data-do="setSecurityLevel"]')).toBeNull();
    for (const spec of SECURITY_LEVELS) {
      expect(laptop.textContent).toContain(`Level ${spec.level}: ${spec.name}`);
    }
  });

  it('prints the cost once or a month, the risk a month, and a buy button per level', () => {
    const state = newGame({ difficulty: 'veryEasy' });
    const page = parse(renderSecurity(state));
    const card = (level: number): Element | null => page.querySelector(`[data-level="${level}"]`);
    expect(card(1)?.textContent).toContain('£500 once');
    expect(card(1)?.textContent).toContain('burglary risk 2% a month');
    expect(card(2)?.textContent).toContain('burglary risk 1.2% a month');
    expect(card(3)?.textContent).toContain('£2,500 once plus £150 a month');
    expect(card(4)?.textContent).toContain(`${money(securitySubscriptionMonthly(state, 4))} a month at this hall`);
    expect(card(5)?.textContent).toContain('zero means zero');
    expect(card(0)?.textContent).toContain('burglary risk 4% a month');
    for (const level of [1, 2, 3, 4, 5]) {
      const buy = card(level)?.querySelector(`[data-do="setSecurityLevel"][data-id="${level}"]`);
      expect(buy, String(level)).not.toBeNull();
      expect(buy?.textContent).toBe('Buy');
    }
  });

  it('spells the formula out for the two firms, with this hall in it, and for nothing else', () => {
    const state = newGame({ difficulty: 'veryEasy' });
    const page = parse(renderSecurity(state));
    for (const level of [4, 5]) {
      const text = page.querySelector(`[data-level="${level}"]`)?.textContent ?? '';
      expect(text).toContain('times the hall');
      expect(text).toContain(`${state.unit.areaM2} m²`);
      expect(text).toContain(money(state.insurance.insuredValue));
    }
    for (const level of [0, 1, 2, 3]) {
      expect(page.querySelector(`[data-level="${level}"]`)?.textContent).not.toContain('times the hall');
    }
  });

  it('marks the level bought, offers the way back down, and warns about the insurer at level 0', () => {
    let state = newGame({ difficulty: 'veryEasy' });
    state = act(state, { type: 'SET_INSURANCE', cover: 'property', on: true });
    expect(parse(renderSecurity(state)).querySelector('.warn')?.textContent).toContain('no alarm');
    state = act(state, { type: 'SET_SECURITY_LEVEL', level: 2 });
    const page = parse(renderSecurity(state));
    expect(page.querySelector('.warn')).toBeNull();
    expect(page.querySelector('[data-level="2"]')?.classList.contains('is-held')).toBe(true);
    expect(page.querySelector('[data-level="1"] [data-do="setSecurityLevel"]')?.textContent).toBe(
      'Go back to this',
    );
    expect(page.querySelector('[data-level="3"] [data-do="setSecurityLevel"]')?.textContent).toBe('Buy');
    // A level the player cannot pay for is greyed with the reason.
    const broke = newGame({ difficulty: 'veryEasy' });
    broke.cash = 100;
    broke.finance.overdraftLimit = 0;
    const locked = parse(renderSecurity(broke)).querySelector('[data-level="2"] button[disabled]');
    expect(locked?.getAttribute('title')).toBe('Not enough cash');
  });
});
