// @vitest-environment jsdom
// The Settings modal, off the gear on the top bar: tips on and off and nothing else tonight
// (PIOTR; CLAUDE.md T13 3.22). Off, and every first use bubble in the game goes with it.

import { beforeAll, describe, expect, it } from 'vitest';
import { TIPS } from '../../src/engine/constants';
import { currentState, mount } from '../../src/ui/app';
import { renderSettings } from '../../src/ui/settings';
import { renderTip } from '../../src/ui/tips';
import { newGame } from '../helpers';

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

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

beforeAll(() => {
  document.body.innerHTML = '<div id="app"></div>';
  mount(root());
  click('[data-do="startGame"]');
  expect(currentState()).not.toBeNull();
});

describe('the settings modal', () => {
  it('carries the one control, with the lit chip following the setting', () => {
    const state = newGame();
    const on = parse(renderSettings(state));
    expect(on.querySelector('[data-setting="tips"]')).not.toBeNull();
    expect(on.querySelector('[data-do="setTips"][data-on="1"]')?.className).toBe('chip is-on');
    expect(on.querySelector('[data-do="setTips"][data-on="0"]')?.className).toBe('chip');
    state.settings.tips = false;
    const off = parse(renderSettings(state));
    expect(off.querySelector('[data-do="setTips"][data-on="1"]')?.className).toBe('chip');
    expect(off.querySelector('[data-do="setTips"][data-on="0"]')?.className).toBe('chip is-on');
    // Tips, and nothing else tonight.
    expect(off.querySelectorAll('[data-do]')).toHaveLength(2);
  });

  it('opens from the gear on the top bar, as a sheet of paper', () => {
    expect(root().querySelector('[data-modal="settings"]')).toBeNull();
    click('.gear[data-do="openSettings"]');
    const modal = root().querySelector('[data-modal="settings"]');
    expect(modal).not.toBeNull();
    expect(modal?.classList.contains('modal-folder')).toBe(true);
    // Its own first use bubble is over it while tips are on.
    expect(modal?.querySelector('[data-tip="settings"]')).not.toBeNull();
  });

  it('switches the tips off, and every bubble in the game goes with them', () => {
    click('[data-modal="settings"] [data-do="setTips"][data-on="0"]');
    const state = currentState();
    expect(state?.settings.tips).toBe(false);
    expect(root().querySelector('[data-tip]')).toBeNull();
    if (state === null) throw new Error('no game');
    for (const key of Object.keys(TIPS)) {
      expect(renderTip(state, key), key).toBe('');
    }
    // Nothing was dismissed by switching them off: the bubbles come back when they are wanted.
    expect(state.tips.seen).toEqual([]);
  });

  it('switches them back on, and the bubbles not yet dismissed come back', () => {
    click('[data-modal="settings"] [data-do="setTips"][data-on="1"]');
    const state = currentState();
    expect(state?.settings.tips).toBe(true);
    expect(root().querySelector('[data-modal="settings"] [data-tip="settings"]')).not.toBeNull();
    click('[data-modal="settings"] [data-do="closeModal"]');
    expect(root().querySelector('[data-modal="settings"]')).toBeNull();
  });
});
