// @vitest-environment jsdom
// Tips in two layers (CLAUDE.md T13 3.22): the first use bubble on every screen, once, dismissed
// by a click and remembered in the save, and never with tips off; and the warning strip under the
// top bar, one line, the most urgent problem first, nothing when nothing is wrong.

import { beforeAll, describe, expect, it } from 'vitest';
import { NO_INSURANCE_REASON, TIPS } from '../../src/engine/constants';
import { bagStore } from '../../src/engine/index';
import { currentState, mount, render } from '../../src/ui/app';
import { renderTip, renderWarningStrip } from '../../src/ui/tips';
import { act, buyStartingKit, fillBags, fillRack, newGame, placeEnquiry } from '../helpers';

const SCREENS = [
  'catalogue',
  'workPlan',
  'stock',
  'board',
  'finance',
  'insurance',
  'security',
  'contracts',
  'website',
  'house',
  'team',
  'settings',
  // The first machine with no pipe to the extraction, under the hall (CLAUDE.md T16 2.3).
  'unconnected',
  // What the wheel and the drag do: the sentence that used to sit under the hall for ever is a
  // tip now, said once (PIOTR, 16.09; CLAUDE.md T17 2.5).
  'hallCamera',
];

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

function root(): HTMLElement {
  const element = document.querySelector('#app');
  if (!(element instanceof HTMLElement)) throw new Error('no root');
  return element;
}

function click(selector: string): void {
  const element = root().querySelector(selector);
  if (element === null) throw new Error(`nothing to click: ${selector}`);
  element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

describe('the first use bubbles', () => {
  it('have one sentence each for the twelve screens of the brief, the unconnected machine and the camera', () => {
    for (const key of SCREENS) {
      expect(TIPS[key], key).toBeTypeOf('string');
      expect((TIPS[key] ?? '').length, key).toBeGreaterThan(20);
    }
    expect(Object.keys(TIPS).sort()).toEqual([...SCREENS].sort());
  });

  it('show once each, until dismissed, and the dismissal is in the save', () => {
    let state = newGame();
    for (const key of SCREENS) {
      const bubble = parse(renderTip(state, key));
      expect(bubble.querySelector(`.tip-bubble[data-tip="${key}"]`), key).not.toBeNull();
      expect(bubble.textContent, key).toContain(TIPS[key] ?? '');
      const close = bubble.querySelector(`.tip-close[data-do="dismissTip"][data-id="${key}"]`);
      expect(close, key).not.toBeNull();
      // Dismissed: gone, and gone the next time as well.
      state = act(state, { type: 'DISMISS_TIP', key });
      expect(renderTip(state, key), key).toBe('');
      expect(state.tips.seen, key).toContain(key);
    }
    expect(state.tips.seen).toHaveLength(SCREENS.length);
    // Dismissing one twice is one entry, not two.
    state = act(state, { type: 'DISMISS_TIP', key: 'board' });
    expect(state.tips.seen.filter((key) => key === 'board')).toHaveLength(1);
  });

  it('never show with tips off, and say nothing for a screen that has no sentence', () => {
    const state = act(newGame(), { type: 'SET_TIPS', on: false });
    for (const key of SCREENS) expect(renderTip(state, key), key).toBe('');
    expect(renderTip(newGame(), 'nothingOfTheSort')).toBe('');
  });
});

describe('the warning strip', () => {
  it('is empty when nothing is wrong', () => {
    const state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
    state.enquiries = [];
    expect(renderWarningStrip(state)).toBe('');
  });

  it('shows the one most urgent problem, keyed for the stylesheet', () => {
    const state = fillBags(fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' }))));
    state.enquiries = [];
    expect(bagStore(state).full).toBe(true);
    const strip = parse(renderWarningStrip(state)).querySelector('.warning-strip');
    expect(strip?.getAttribute('data-warning')).toBe('bagsFull');
    expect(strip?.textContent).toContain('bags are full');
    // One line, one problem: nothing else is on the strip.
    expect(parse(renderWarningStrip(state)).querySelectorAll('.warning-strip')).toHaveLength(1);
  });
});

describe('through the page', () => {
  beforeAll(() => {
    document.body.innerHTML = '<div id="app"></div>';
    mount(root());
    click('[data-do="startGame"]');
    click('[data-do="setSpeed"][data-speed="1"]');
    expect(currentState()).not.toBeNull();
  });

  it('puts the bubble over the catalogue the first time, and never again once dismissed', () => {
    click('[data-do="setView"][data-view="office"]');
    click('[data-office="catalogue"]');
    const modal = (): Element | null => root().querySelector('[data-modal="catalogue"]');
    expect(modal()?.querySelector('.tip-bubble[data-tip="catalogue"]')).not.toBeNull();
    click('[data-modal="catalogue"] [data-do="dismissTip"][data-id="catalogue"]');
    expect(modal()?.querySelector('.tip-bubble')).toBeNull();
    expect(currentState()?.tips.seen).toContain('catalogue');
    click('[data-modal="catalogue"] [data-do="closeModal"]');
    click('[data-office="catalogue"]');
    expect(modal()).not.toBeNull();
    expect(modal()?.querySelector('.tip-bubble')).toBeNull();
    click('[data-modal="catalogue"] [data-do="closeModal"]');
  });

  it('prints the strip right under the top bar, and takes it down when the problem goes', () => {
    const state = currentState();
    if (state === null) throw new Error('no game');
    expect(root().querySelector('.warning-strip')).toBeNull();
    // Day 1 has no hall to fill bags in, so the problem here is a commercial enquiry the company
    // has no insurance for.
    placeEnquiry(state, {
      name: 'Shop fit out',
      kind: 'commercial',
      unreachable: true,
      blockReason: NO_INSURANCE_REASON,
    });
    render();
    const strip = root().querySelector('.warning-strip');
    expect(strip?.getAttribute('data-warning')).toBe('noInsurance');
    expect(strip?.textContent).toContain('Shop fit out');
    expect(strip?.previousElementSibling?.classList.contains('topbar')).toBe(true);
    state.enquiries = state.enquiries.filter((enquiry) => enquiry.name !== 'Shop fit out');
    render();
    expect(root().querySelector('.warning-strip')).toBeNull();
  });
});
