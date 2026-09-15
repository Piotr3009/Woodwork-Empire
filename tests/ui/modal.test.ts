// @vitest-environment jsdom
// Colour by sign: every plus is the game's green and every minus its red, on every card, modal
// and tooltip, through the one helper (PIOTR; CLAUDE.md T13 1, 3.1). The helper is tested on its
// own, and then the rule is walked over every rendered class card in the catalogue, the day end
// summary and the top bar's day figure: no text beginning with a signed figure sits outside an
// element in the good or bad class.

import { describe, expect, it } from 'vitest';
import { EQUIPMENT_SPECS, EQUIPMENT_TABS } from '../../src/engine/constants';
import { renderCatalogue } from '../../src/ui/catalogue';
import { renderDayEnd } from '../../src/ui/dayEnd';
import { signClass, signedFigure, signedMoney } from '../../src/ui/modal';
import { renderTopbar } from '../../src/ui/topbar';
import { buyStartingKit, fillRack, newGame, runClock, twoMenOnSheetWork } from '../helpers';

const TEXT_NODES = 4;

/** A signed figure: a plus or a minus, then a digit or a pound sign, at the start of the text or
 *  after a space ("Output +12%", "-£500 today"). A hyphen inside a word or a number, as in a
 *  stock number or "2-3 days", is not a sign. */
const SIGNED = /(^|\s)[+-](\d|£)/;

/** Every signed text in the markup that is not inside an element in the good or bad class, with
 *  the element it sits in, so a failure names the card. */
function unsigned(html: string): string[] {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  const walker = document.createTreeWalker(holder, TEXT_NODES);
  const found: string[] = [];
  let node = walker.nextNode();
  while (node !== null) {
    const text = (node.nodeValue ?? '').trim();
    if (SIGNED.test(text)) {
      const parent = node.parentElement;
      if (parent === null || parent.closest('.good, .bad') === null) {
        found.push(`${text} in ${parent?.outerHTML.slice(0, 120) ?? 'no element'}`);
      }
    }
    node = walker.nextNode();
  }
  return found;
}

/** The count of signed texts in the markup, coloured or not, so a walk that finds nothing to
 *  check is known to have found nothing rather than to have looked at nothing. */
function signedCount(html: string): number {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  const walker = document.createTreeWalker(holder, TEXT_NODES);
  let count = 0;
  let node = walker.nextNode();
  while (node !== null) {
    if (SIGNED.test((node.nodeValue ?? '').trim())) count += 1;
    node = walker.nextNode();
  }
  return count;
}

describe('the sign helper', () => {
  it('gives green above nothing, red below it and no class at nothing', () => {
    expect(signClass(1)).toBe('good');
    expect(signClass(0.01)).toBe('good');
    expect(signClass(-1)).toBe('bad');
    expect(signClass(0)).toBe('');
  });

  it('writes pounds with the sign, and nothing as plain pounds', () => {
    expect(signedMoney(300)).toBe('+£300');
    expect(signedMoney(-2699)).toBe('-£2,699');
    expect(signedMoney(0)).toBe('£0');
    expect(signedMoney(0.4)).toBe('£0');
  });

  it('wraps a figure in a span of its sign class, escaped', () => {
    expect(signedFigure('+12%', 12)).toBe('<span class="figure good">+12%</span>');
    expect(signedFigure('-20%', -20)).toBe('<span class="figure bad">-20%</span>');
    expect(signedFigure('0%', 0)).toBe('<span class="figure">0%</span>');
    expect(signedFigure('<b>', 1)).toBe('<span class="figure good">&lt;b&gt;</span>');
  });
});

describe('the audit of every signed figure', () => {
  it('finds none outside the sign class on any class card of the catalogue', () => {
    const state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
    const offenders: string[] = [];
    let seen = 0;
    let folders = 0;
    for (const tab of EQUIPMENT_TABS) {
      const list = renderCatalogue(state, '', tab.id);
      offenders.push(...unsigned(list).map((line) => `${tab.id}: ${line}`));
      seen += signedCount(list);
      for (const spec of EQUIPMENT_SPECS) {
        if (spec.tab !== tab.id && spec.sharedTab !== tab.id) continue;
        folders += 1;
        const open = renderCatalogue(state, '', tab.id, spec.id);
        offenders.push(...unsigned(open).map((line) => `${tab.id}/${spec.id}: ${line}`));
        seen += signedCount(open);
      }
    }
    const owned = renderCatalogue(state, '', 'owned');
    offenders.push(...unsigned(owned).map((line) => `owned: ${line}`));
    seen += signedCount(owned);
    expect(folders).toBeGreaterThan(10);
    // The class cards do print signed effects, so the walk has something to check.
    expect(seen).toBeGreaterThan(0);
    expect(offenders).toEqual([]);
  });

  it('finds none on the day end summary of a day that cost money', () => {
    const played = runClock(twoMenOnSheetWork(), 540);
    const html = renderDayEnd(played);
    expect(signedCount(html)).toBeGreaterThan(0);
    expect(unsigned(html)).toEqual([]);
  });

  it("finds none on the top bar's day figure, in the red and in the black", () => {
    const played = runClock(twoMenOnSheetWork(), 200);
    const red = renderTopbar(played, 'hall');
    expect(signedCount(red)).toBeGreaterThan(0);
    expect(unsigned(red)).toEqual([]);
    const black = { ...played, finance: { ...played.finance, day: { income: 900, costs: 100, byCategory: {} } } };
    const html = renderTopbar(black, 'hall');
    expect(html).toContain('+£800 today');
    expect(unsigned(html)).toEqual([]);
  });
});
