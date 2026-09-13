// @vitest-environment jsdom
// The modal shell outlives a render, so a scrolled body and a caret in a field survive the game
// minute that used to throw them away (CLAUDE.md T3 3.4).

import { beforeAll, describe, expect, it } from 'vitest';
import { advanceMinutes, currentState, mount, render } from '../../src/ui/app';
import { LEDGER_MAX_ENTRIES } from '../../src/engine/constants';
import type { LedgerEntry } from '../../src/engine/index';
import { buyStartingKit } from '../helpers';

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

function body(modalId: string): HTMLElement {
  const element = root().querySelector(`[data-modal="${modalId}"] .modal-body`);
  if (!(element instanceof HTMLElement)) throw new Error(`no ${modalId} modal`);
  return element;
}

/** Answers whatever the engine is asking, the way a player clicks on. */
function dismissEvents(): void {
  let guard = 0;
  while (root().querySelector('[data-do="resolveEvent"]') !== null && guard < 50) {
    click('[data-do="resolveEvent"]');
    guard += 1;
  }
}

beforeAll(() => {
  document.body.innerHTML = '<div id="app"></div>';
  mount(root());
  click('[data-do="pickDifficulty"][data-id="easy"]');
  click('[data-do="startGame"]');
  dismissEvents();
  // The laptop is what the board and the accounting come in on, so the desk is furnished first.
  const state = currentState();
  if (state === null) throw new Error('no game');
  Object.assign(state, buyStartingKit(state));
  render();
});

describe('a modal keeps its place while the clock runs', () => {
  it('leaves the accounting body scrolled where the player left it', () => {
    const state = currentState();
    if (state === null) throw new Error('no game');
    // Eighty lines is more than the modal can show, which is the point of the test.
    const rows: LedgerEntry[] = [];
    for (let index = 0; index < 80; index += 1) {
      rows.push({
        id: `led-${index}`,
        day: 1,
        minute: index,
        category: 'power',
        label: `Line ${index + 1}`,
        amount: -1,
        balance: 100,
        unpaid: false,
      });
    }
    expect(rows.length).toBeLessThanOrEqual(LEDGER_MAX_ENTRIES);
    state.ledger = rows;
    click('[data-do="setView"][data-view="office"]');
    click('[data-office="binder"]');
    // The lines themselves are on the Ledger tab; the books open on Days (CLAUDE.md T6 3.9).
    click('[data-do="accountingTab"][data-id="ledger"]');
    expect(body('accounting').innerHTML).toContain('Line 80');
    body('accounting').scrollTop = 500;
    advanceMinutes(1);
    expect(body('accounting').scrollTop).toBe(500);
    // And it is the same body element, not a fresh one that happens to be scrolled.
    expect(body('accounting').innerHTML).toContain('Line 80');
    click('[data-do="closeModal"]');
  });

  it('keeps the caret in the board filter through a game minute', () => {
    click('[data-do="openModal"][data-modal="board"]');
    const typed = root().querySelector('[data-filter="board"]');
    if (!(typed instanceof HTMLInputElement)) throw new Error('no board filter');
    typed.focus();
    typed.value = 'shel';
    typed.dispatchEvent(new Event('input', { bubbles: true }));
    // Typing rebuilds the body, so the caret goes into the field that is on the page now.
    const field = root().querySelector('[data-filter="board"]');
    if (!(field instanceof HTMLInputElement)) throw new Error('no board filter after typing');
    field.focus();
    field.setSelectionRange(2, 2);
    advanceMinutes(1);
    const after = root().querySelector('[data-filter="board"]');
    if (!(after instanceof HTMLInputElement)) throw new Error('no board filter after the tick');
    expect(document.activeElement).toBe(after);
    expect(after.value).toBe('shel');
    expect(after.selectionStart).toBe(2);
    click('[data-do="closeModal"]');
  });

  it('clamps to the new bottom when the content shrinks under the scroll', () => {
    click('[data-office="binder"]');
    const shell = body('accounting');
    Object.defineProperty(shell, 'scrollHeight', { configurable: true, value: 200 });
    Object.defineProperty(shell, 'clientHeight', { configurable: true, value: 120 });
    shell.scrollTop = 500;
    render();
    expect(shell.scrollTop).toBe(80);
    click('[data-do="closeModal"]');
  });
});
