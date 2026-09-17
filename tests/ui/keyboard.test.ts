// @vitest-environment jsdom
// The clock under the hand (PIOTR, 17.09; CLAUDE.md T18 2.8): P stops it and starts it again where
// it was, 1 to 5 are the top bar's own five running knobs in the order SPEEDS has them, Escape
// closes what is open as it always has, Space held still drags the hall, and every one of them
// does nothing at all while the caret is in a field.

import { beforeAll, describe, expect, it } from 'vitest';
import { SPEEDS } from '../../src/engine/constants';
import { currentState, mount } from '../../src/ui/app';

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

function dismissEvents(): void {
  let guard = 0;
  while (
    root().querySelector('[data-do="closeHouseCard"], [data-do="resolveEvent"]') !== null &&
    guard < 50
  ) {
    click('[data-do="closeHouseCard"], [data-do="resolveEvent"]');
    guard += 1;
  }
}

function press(key: string): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
}

function speed(): number {
  return currentState()?.speed ?? -1;
}

beforeAll(() => {
  document.body.innerHTML = '<div id="app"></div>';
  mount(root());
});

describe('the keyboard (CLAUDE.md T18 2.8)', () => {
  it('does nothing before there is a game to run', () => {
    expect(currentState()).toBeNull();
    for (const key of ['1', '5', 'p', 'P']) press(key);
    expect(currentState()).toBeNull();
    // And from here on there is one.
    click('[data-do="startGame"]');
    dismissEvents();
    expect(currentState()).not.toBeNull();
  });

  it('starts a clock that was never running at x1', () => {
    click('[data-do="setSpeed"][data-speed="0"]');
    expect(speed()).toBe(0);
    press('p');
    expect(speed()).toBe(1);
    press('p');
    expect(speed()).toBe(0);
  });

  it('maps 1 to 5 to the five running speeds of SPEEDS, in order', () => {
    // SPEEDS[0] is Pause and has its own key; the five after it are the running speeds.
    expect(SPEEDS.length).toBe(6);
    expect([...SPEEDS]).toEqual([0, 1, 2, 4, 10, 30]);
    for (let knob = 1; knob <= 5; knob += 1) {
      press(String(knob));
      expect(speed(), `key ${knob}`).toBe(SPEEDS[knob]);
    }
    // And the knob on the top bar says the same thing the key did: one dispatch, one code path.
    expect(root().querySelector('[data-do="setSpeed"][data-speed="30"]')?.className).toContain(
      'is-on',
    );
  });

  it('stops the clock on P and starts it again where it was', () => {
    press('4');
    expect(speed()).toBe(SPEEDS[4]);
    press('p');
    expect(speed()).toBe(0);
    press('p');
    expect(speed()).toBe(SPEEDS[4]);
    // The capital is the same key.
    press('P');
    expect(speed()).toBe(0);
    press('P');
    expect(speed()).toBe(SPEEDS[4]);
  });

  it('does nothing while an input has the caret', () => {
    press('2');
    expect(speed()).toBe(2);
    const field = document.createElement('input');
    field.type = 'text';
    root().appendChild(field);
    field.focus();
    expect(document.activeElement).toBe(field);
    for (const key of ['1', '3', '4', '5', 'p', 'P']) press(key);
    expect(speed()).toBe(2);
    field.blur();
    field.remove();
    press('1');
    expect(speed()).toBe(1);
  });

  it('leaves Escape and Space exactly as they were', () => {
    press('1');
    click('[data-do="setView"][data-view="office"]');
    click('[data-office="catalogue"]');
    dismissEvents();
    expect(root().querySelector('.modal-layer [data-modal="catalogue"]')).not.toBeNull();
    press('Escape');
    expect(root().querySelector('.modal-layer [data-modal="catalogue"]')).toBeNull();
    // Escape is not a speed and never touches the clock.
    expect(speed()).toBe(1);
    // Space is the hall's pan, held, and never a speed.
    press(' ');
    expect(speed()).toBe(1);
  });
});
