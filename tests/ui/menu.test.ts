// @vitest-environment jsdom
// The side menu (save and load, right hand side) did not close (PIOTR, 15.09; CLAUDE.md T13 3.1).
// Now it shuts two ways: a click anywhere outside it, and its own close control.

import { beforeAll, describe, expect, it } from 'vitest';
import { currentState, mount } from '../../src/ui/app';
import { renderMenu } from '../../src/ui/topbar';
import { closeButton } from '../../src/ui/modal';
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

function menu(): Element | null {
  return root().querySelector('.menu-pop');
}

beforeAll(() => {
  document.body.innerHTML = '<div id="app"></div>';
  mount(root());
  click('[data-do="startGame"]');
  expect(currentState()).not.toBeNull();
});

describe('the side menu', () => {
  it('is shut by the one cross, the same control every modal wears (CLAUDE.md T18 2.5)', () => {
    const html = renderMenu(newGame(), { available: false, signedIn: null });
    const holder = document.createElement('div');
    holder.innerHTML = html;
    const cross = holder.querySelector('.modal-close');
    expect(cross).not.toBeNull();
    expect(cross?.getAttribute('data-do')).toBe('closeMenu');
    // The same markup as a modal's, the action apart: one helper writes both.
    expect(cross?.outerHTML).toBe(closeButton('closeMenu'));
    expect(holder.querySelector('.menu-close')).toBeNull();
    expect(holder.querySelector('.menu-pop')).not.toBeNull();
  });

  it('opens from the Menu button and closes on a click outside it', () => {
    expect(menu()).toBeNull();
    click('[data-do="toggleMenu"]');
    expect(menu()).not.toBeNull();
    // The name plate is on the top bar and does nothing of its own: a click there is a click
    // outside the menu, and nothing else.
    click('.name-plate');
    expect(menu()).toBeNull();
  });

  it('opens again and closes on its own close control', () => {
    click('[data-do="toggleMenu"]');
    expect(menu()).not.toBeNull();
    click('.menu-pop .modal-close');
    expect(menu()).toBeNull();
  });

  it('stays open for a click on the menu itself, so its buttons can be reached', () => {
    click('[data-do="toggleMenu"]');
    expect(menu()).not.toBeNull();
    const pop = menu();
    pop?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(menu()).not.toBeNull();
    // And the Menu button itself toggles it shut, the way it opened it.
    click('[data-do="toggleMenu"]');
    expect(menu()).toBeNull();
  });
});
