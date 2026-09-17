// @vitest-environment jsdom
// The Settings modal, off the gear on the top bar: the tips, and from Turn 19 the sound as well
// (PIOTR; CLAUDE.md T13 3.22, T19 2.10). Tips off, and every first use bubble in the game goes
// with it; sound off, and the hall is silent with the volume left where it was.

import { beforeAll, describe, expect, it } from 'vitest';
import { SOUND_VOLUME_DEFAULT, TIPS } from '../../src/engine/constants';
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
  it('carries the tips, with the lit chip following the setting', () => {
    const state = newGame();
    const on = parse(renderSettings(state));
    expect(on.querySelector('[data-setting="tips"]')).not.toBeNull();
    expect(on.querySelector('[data-do="setTips"][data-on="1"]')?.className).toBe('chip is-on');
    expect(on.querySelector('[data-do="setTips"][data-on="0"]')?.className).toBe('chip');
    state.settings.tips = false;
    const off = parse(renderSettings(state));
    expect(off.querySelector('[data-do="setTips"][data-on="1"]')?.className).toBe('chip');
    expect(off.querySelector('[data-do="setTips"][data-on="0"]')?.className).toBe('chip is-on');
    // The tips and the sound, and nothing else: two chips, two chips and two steps.
    expect(off.querySelectorAll('[data-do]')).toHaveLength(6);
  });

  it('carries the sound: a mute in the tips row\'s own shape, and a volume that steps', () => {
    // Turn 19 puts the sound in Settings and nowhere else (PIOTR; CLAUDE.md T19 2.10).
    const state = newGame();
    expect(state.settings.sound).toEqual({ volume: SOUND_VOLUME_DEFAULT, muted: false });
    const loud = parse(renderSettings(state));
    expect(loud.querySelector('[data-setting="sound"]')).not.toBeNull();
    expect(loud.querySelector('[data-do="setSound"][data-muted="0"]')?.className).toBe('chip is-on');
    expect(loud.querySelector('[data-do="setSound"][data-muted="1"]')?.className).toBe('chip');
    // The figure is the setting itself, not the nearest of a handful of named steps.
    expect(loud.querySelector('[data-setting="volume"] [data-figure="volume"]')?.textContent).toBe(
      `${Math.round(SOUND_VOLUME_DEFAULT * 100)}%`,
    );
    const steps = Array.from(loud.querySelectorAll('[data-do="setVolume"]'));
    expect(steps.map((step) => step.textContent)).toEqual(['Quieter', 'Louder']);
    expect(steps.map((step) => step.getAttribute('data-volume'))).toEqual(['0.6', '0.8']);

    state.settings.sound = { volume: 0.5, muted: true };
    const quiet = parse(renderSettings(state));
    expect(quiet.querySelector('[data-do="setSound"][data-muted="0"]')?.className).toBe('chip');
    expect(quiet.querySelector('[data-do="setSound"][data-muted="1"]')?.className).toBe('chip is-on');
    expect(quiet.querySelector('[data-figure="volume"]')?.textContent).toBe('50%');
    // The volume is not lost when it is muted: it is where the player left it.
    expect(
      Array.from(quiet.querySelectorAll('[data-do="setVolume"]')).map((step) =>
        step.getAttribute('data-volume'),
      ),
    ).toEqual(['0.4', '0.6']);
  });

  it('greys the step that has nowhere to go, rather than offering a click that does nothing', () => {
    const state = newGame();
    state.settings.sound = { volume: 0, muted: false };
    const bottom = parse(renderSettings(state));
    expect(bottom.querySelectorAll('[data-do="setVolume"]')).toHaveLength(1);
    expect(bottom.querySelector('[data-do="setVolume"]')?.textContent).toBe('Louder');
    const off = bottom.querySelector('[data-setting="volume"] button[disabled]');
    expect(off?.textContent).toBe('Quieter');
    expect(off?.getAttribute('title')).toBe('It is as quiet as it goes');
    state.settings.sound = { volume: 1, muted: false };
    const top = parse(renderSettings(state));
    expect(top.querySelectorAll('[data-do="setVolume"]')).toHaveLength(1);
    expect(top.querySelector('[data-do="setVolume"]')?.textContent).toBe('Quieter');
    expect(top.querySelector('[data-setting="volume"] button[disabled]')?.textContent).toBe(
      'Louder',
    );
    expect(top.querySelector('[data-figure="volume"]')?.textContent).toBe('100%');
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
  });

  // The three cases below were B3's to write and app.ts was frozen under it, so the click had no
  // route until the integrator added `setSound` and `setVolume` (CLAUDE.md T19 3, the freeze).
  it('mutes and unmutes from the row, one click each way', () => {
    click('[data-modal="settings"] [data-do="setSound"][data-muted="1"]');
    expect(currentState()?.settings.sound.muted).toBe(true);
    // The lit chip follows the setting, so the player can see which way it is.
    expect(
      root().querySelector('[data-modal="settings"] [data-do="setSound"][data-muted="1"]')
        ?.className,
    ).toBe('chip is-on');
    click('[data-modal="settings"] [data-do="setSound"][data-muted="0"]');
    expect(currentState()?.settings.sound.muted).toBe(false);
  });

  it('steps the volume down and up, and never past its own ends', () => {
    const volume = (): number => currentState()?.settings.sound.volume ?? -1;
    const opened = volume();
    click('[data-modal="settings"] [data-do="setVolume"][data-volume="0.6"]');
    expect(volume()).toBeCloseTo(opened - 0.1, 5);
    click('[data-modal="settings"] [data-do="setVolume"][data-volume="0.7"]');
    expect(volume()).toBeCloseTo(opened, 5);
    // All the way down: the last step disables itself rather than leaving a dead click.
    let guard = 0;
    while (volume() > 0 && guard < 20) {
      const step = root().querySelector(
        '[data-modal="settings"] [data-do="setVolume"]:not([disabled])',
      );
      const label = step?.textContent ?? '';
      if (step === null || label !== 'Quieter') break;
      step.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      guard += 1;
    }
    expect(volume()).toBeCloseTo(0, 5);
    expect(
      root().querySelectorAll('[data-modal="settings"] [data-do="setVolume"]:not([disabled])'),
    ).toHaveLength(1);
  });

  it('closes on the one cross', () => {
    click('[data-modal="settings"] [data-do="closeModal"]');
    expect(root().querySelector('[data-modal="settings"]')).toBeNull();
  });
});
