// @vitest-environment jsdom
// The Website tab of the laptop (CLAUDE.md T13 3.7): the five levels as a ladder, effects before
// costs, every plus and minus in its colour, the one held marked, and a buy button only for the
// levels above it.

import { describe, expect, it } from 'vitest';
import { WEBSITE_LEVELS } from '../../src/engine/constants';
import { renderLaptop } from '../../src/ui/laptop';
import { money } from '../../src/ui/modal';
import { renderWebsite } from '../../src/ui/website';
import { newGame } from '../helpers';

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

function text(element: Element | null | undefined): string {
  return (element?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

describe('the Website tab', () => {
  it('prints the five levels as a ladder, effects before costs, with the one held marked', () => {
    const state = newGame();
    state.website.level = 2;
    const page = parse(renderWebsite(state));
    const rungs = Array.from(page.querySelectorAll('.website-level'));
    expect(rungs).toHaveLength(5);
    rungs.forEach((rung, index) => {
      const spec = WEBSITE_LEVELS[index];
      expect(rung.getAttribute('data-level')).toBe(String(spec?.level));
      expect(text(rung.querySelector('h3'))).toBe(`Level ${spec?.level}: ${spec?.name}`);
      const html = rung.innerHTML;
      expect(html.indexOf('card-effects')).toBeGreaterThan(-1);
      expect(html.indexOf('card-effects')).toBeLessThan(html.indexOf('card-costs'));
      expect(text(rung.querySelector('.card-costs'))).toContain(
        spec?.price === 0 ? 'Nothing to buy' : money(spec?.price ?? 0),
      );
    });
    expect(rungs[1]?.className).toContain('is-on');
    expect(text(rungs[1])).toContain('Held');
    expect(text(rungs[0])).toContain('Outgrown');
    // And the tab is the laptop's, under Admin.
    expect(renderLaptop(state, { tab: 'website', stockSheets: '' })).toContain('website-level');
  });

  it('colours every effect by its sign, and prints a reputation line only at 4 and 5', () => {
    const page = parse(renderWebsite(newGame()));
    const rungs = Array.from(page.querySelectorAll('.website-level'));
    // Level 1: fewer and worse, both in red.
    expect(rungs[0]?.querySelectorAll('.card-effects .figure.bad')).toHaveLength(2);
    expect(text(rungs[0]?.querySelector('.card-effects'))).toContain('-1 enquiry a week');
    expect(text(rungs[0]?.querySelector('.card-effects'))).toContain('-1 tier of quality');
    // Level 2: nothing signed at all.
    expect(rungs[1]?.querySelectorAll('.card-effects .good, .card-effects .bad')).toHaveLength(0);
    // Level 3: more, in green, and still no reputation.
    expect(text(rungs[2]?.querySelector('.card-effects'))).toContain('+1 enquiry a week');
    for (const index of [0, 1, 2]) {
      expect(text(rungs[index]?.querySelector('.card-effects'))).not.toContain('reputation');
    }
    expect(text(rungs[3]?.querySelector('.card-effects'))).toContain('+2 reputation while held');
    expect(text(rungs[4]?.querySelector('.card-effects'))).toContain('+3 enquiries a week');
    expect(text(rungs[4]?.querySelector('.card-effects'))).toContain('+1 tier of quality');
    expect(text(rungs[4]?.querySelector('.card-effects'))).toContain('+3 reputation while held');
    expect(rungs[4]?.querySelectorAll('.card-effects .figure.good')).toHaveLength(3);
    // No plus or minus in the body colour anywhere on the ladder (CLAUDE.md T13 3.1).
    for (const figure of Array.from(page.querySelectorAll('.card-effects .figure'))) {
      if (/^[+-]/.test(text(figure))) expect(figure.className).toMatch(/good|bad/);
    }
  });

  it('says the upkeep minutes a week of each level in its costs', () => {
    const page = parse(renderWebsite(newGame()));
    const rungs = Array.from(page.querySelectorAll('.website-level'));
    expect(text(rungs[0]?.querySelector('.card-costs'))).toContain('No upkeep');
    expect(text(rungs[1]?.querySelector('.card-costs'))).toContain('Upkeep 10 min a week');
    expect(text(rungs[4]?.querySelector('.card-costs'))).toContain('Upkeep 20 min a week');
  });

  it('offers a buy button only above the level held, greyed with the reason when the cash is short', () => {
    const state = newGame();
    state.cash = 100000;
    state.website.level = 3;
    const page = parse(renderWebsite(state));
    const buys = Array.from(page.querySelectorAll('[data-do="setWebsiteLevel"]'));
    expect(buys.map((buy) => buy.getAttribute('data-id'))).toEqual(['4', '5']);
    expect(text(buys[0])).toBe(`Buy, ${money(8500)}`);
    expect(text(buys[1])).toBe(`Buy, ${money(15000)}`);
    expect(page.querySelectorAll('button[disabled]')).toHaveLength(0);
    // Past the overdraft floor nothing can be bought: both levels are greyed with the reason.
    state.cash = state.finance.overdraftLimit + 1000;
    const poor = parse(renderWebsite(state));
    expect(poor.querySelectorAll('[data-do="setWebsiteLevel"]')).toHaveLength(0);
    const locked = Array.from(poor.querySelectorAll('button[disabled]'));
    expect(locked).toHaveLength(2);
    expect(locked[0]?.getAttribute('title')).toBe('Not enough cash');
  });
});
