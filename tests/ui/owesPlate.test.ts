// @vitest-environment jsdom
// The red plate on the top bar and what a click on it opens (PIOTR, 18.09; CLAUDE.md T21 2.1;
// docs/mockups/t21/debt.html part 1).
//
// This lives in a file of its own rather than beside the rest of the top bar. `mount` does not put a
// running game back to the start screen, so only the first test in a file that mounts the app can
// press "New game"; `tests/ui/topbar.test.ts` already spends that first mount on the Orders button.

import { describe, expect, it } from 'vitest';
import { currentState, mount, render } from '../../src/ui/app';

function root(): HTMLElement {
  const element = document.querySelector('#app');
  if (!(element instanceof HTMLElement)) throw new Error('no root');
  return element;
}

function press(selector: string): void {
  const element = root().querySelector(selector);
  if (element === null) throw new Error(`nothing to click: ${selector}`);
  element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

describe('the owes plate, in the game itself (CLAUDE.md T21 2.1)', () => {
  it('opens Accounting on its Summary tab on a click', () => {
    document.body.innerHTML = '<div id="app"></div>';
    mount(root());
    press('[data-do="startGame"]');
    const state = currentState();
    if (state === null) throw new Error('no game');
    // A company in one month of arrears, which is Piotr's own position of 15 May.
    state.finance.arrearsAmount = 25740;
    state.finance.arrearsMonths = 1;
    state.finance.firstArrearsDay = 1;
    render();
    // The plate is drawn, and it is a control and not a label.
    const plate = root().querySelector('[data-do="openArrears"]');
    expect(plate).not.toBeNull();
    press('[data-do="openArrears"]');
    // The books, open at the Summary, which is where the arrears block and the button that pays
    // them are.
    expect(root().querySelector('[data-modal="accounting"]')).not.toBeNull();
    const on = root().querySelector('[data-do="accountingTab"].is-on');
    expect(on?.getAttribute('data-id')).toBe('summary');
  });
});
