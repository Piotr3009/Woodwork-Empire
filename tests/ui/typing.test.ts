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
function field(): HTMLInputElement {
  const el = root().querySelector('[data-field="stockSheets"]');
  if (!(el instanceof HTMLInputElement)) throw new Error('no stock field');
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
    // The laptop needs the day 1 kit; the Materials tab lives on it (CLAUDE.md T4 3.1).
    click('[data-do="setView"][data-view="office"]');
    click('[data-office="catalogue"]');
    for (const id of ['desk', 'chair', 'laptop']) {
      click(`[data-do="openFolder"][data-id="${id}"]`);
      click(`[data-do="buyEquipment"][data-id="${id}"]`);
      click('[data-do="closeFolder"]');
    }
    click('[data-do="closeModal"]');
    advanceMinutes(120);
    click('[data-office="laptop"]');
    advanceMinutes(10);
    click('[data-do="laptopTab"][data-id="materials"]');
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
