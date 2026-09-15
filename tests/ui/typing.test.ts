// @vitest-environment jsdom
// Typing into a numeric field while the clock re-renders the page: 1 then 5 must read 15, never
// 51 (bug, 13.09). The field is text with a numeric input mode so the caret can be placed.
import { beforeAll, describe, expect, it } from 'vitest';
import { advanceMinutes, mount } from '../../src/ui/app';

function root(): HTMLElement {
  const el = document.getElementById('root');
  if (!el) throw new Error('no root');
  return el;
}
function click(selector: string): void {
  const element = root().querySelector(selector);
  if (element === null) throw new Error(`nothing to click: ${selector}`);
  element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}
function typeKey(field: HTMLInputElement, key: string): void {
  // What a browser does: the value grows at the caret, then input fires, then the page re-renders.
  const at = field.selectionStart ?? field.value.length;
  field.value = field.value.slice(0, at) + key + field.value.slice(at);
  field.setSelectionRange(at + 1, at + 1);
  field.dispatchEvent(new Event('input', { bubbles: true }));
}

/** Plays through to 08:00 tomorrow, answering whatever the day asks on the way. */
function nextMorning(): void {
  for (let guard = 0; guard < 200; guard += 1) {
    let events = 0;
    while (root().querySelector('[data-do="closeHouseCard"], [data-do="resolveEvent"]') !== null && events < 80) {
      click('[data-do="closeHouseCard"], [data-do="resolveEvent"]');
      events += 1;
    }
    if (root().querySelector('[data-office="binder"]') !== null) return;
    advanceMinutes(30);
  }
}

function field(): HTMLInputElement {
  const el = root().querySelector('[data-field="loanAmount"]');
  if (!(el instanceof HTMLInputElement)) throw new Error('no loan field');
  return el;
}

describe('typing a number', () => {
  beforeAll(() => {
    document.body.innerHTML = '<div id="root"></div>';
    mount(root());
    click('[data-do="pickDifficulty"][data-id="veryEasy"]');
    click('[data-do="startGame"]');
    click('[data-do="setSpeed"][data-speed="1"]');
  });

  it('keeps the digits in the order they were typed across re-renders', () => {
    // The binder sits on the desk, so the desk has to be there first (CLAUDE.md T4 3.1). The
    // loan amount on the binder's Finance tab is the numeric field of the game: the stock page
    // has no free form order since Restock became its one button (CLAUDE.md T13 3.2, 3.14).
    click('[data-do="setView"][data-view="office"]');
    click('[data-office="catalogue"]');
    for (const id of ['desk', 'chair', 'laptop']) {
      click(`[data-do="openFolder"][data-id="${id}"]`);
      click(`[data-do="buyEquipment"][data-id="${id}"]`);
      click('[data-do="closeFolder"]');
    }
    click('[data-do="closeModal"]');
    // The lorry comes at 08:00 on day 2: the desk is on the road until then (CLAUDE.md T9 3.1).
    nextMorning();
    click('[data-office="binder"]');
    advanceMinutes(10);
    click('[data-do="accountingTab"][data-id="finance"]');
    const input = field();
    expect(input.type).toBe('text');
    input.focus();
    input.value = '';
    input.setSelectionRange(0, 0);
    typeKey(field(), '1');
    advanceMinutes(1);
    typeKey(field(), '5');
    advanceMinutes(1);
    expect(field().value).toBe('15');
    expect(field().selectionStart).toBe(2);
  });
});
