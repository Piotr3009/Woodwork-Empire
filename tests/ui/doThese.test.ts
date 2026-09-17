// @vitest-environment jsdom
// Several jobs of work at once (PIOTR, 16.09; CLAUDE.md T17 2.16): the player ticks the ones he
// wants doing on the laptop's Tasks page and presses Do these, and they are worked off one after
// another in the order he ticked them. The boot of 2.17 is here too, because the Tasks page is
// where an orphaned boot used to sit with a Start button on it.

import { beforeAll, describe, expect, it } from 'vitest';
import { LAPTOP_BOOT_MINUTES } from '../../src/engine/constants';
import { advanceMinutes, currentState, mount, render } from '../../src/ui/app';
import { buyStartingKit, fillRack } from '../helpers';

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

function openTasks(): void {
  let guard = 0;
  while (root().querySelector('.modal-layer [data-do="closeModal"]') !== null && guard < 10) {
    click('.modal-layer [data-do="closeModal"]');
    guard += 1;
  }
  if (root().querySelector('[data-do="setView"][data-view="office"]') !== null) {
    click('[data-do="setView"][data-view="office"]');
  }
  click('[data-office="laptop"]');
  advanceMinutes(LAPTOP_BOOT_MINUTES);
  dismissEvents();
  click('[data-modal="laptop"] [data-tile="tasks"]');
}

function ticks(): HTMLInputElement[] {
  return Array.from(root().querySelectorAll('[data-modal="laptop"] .row-tick'));
}

beforeAll(() => {
  document.body.innerHTML = '<div id="app"></div>';
  mount(root());
  click('[data-do="startGame"]');
  click('[data-do="setSpeed"][data-speed="1"]');
  dismissEvents();
  const state = currentState();
  if (state === null) throw new Error('no game');
  Object.assign(state, fillRack(buyStartingKit(state), 20));
  state.enquiries = [];
  render();
});

describe('the Tasks page', () => {
  it('carries a tick on every row the owner could start, and one Do these over them', () => {
    openTasks();
    expect(ticks().length).toBeGreaterThan(1);
    expect(root().querySelector('[data-modal="laptop"] .tasks-do')).not.toBeNull();
    // Nothing ticked, nothing to do: the button is locked until he ticks something.
    expect(root().querySelector('[data-do="doTheseTasks"]')).toBeNull();
  });

  it('queues what is ticked, in the order it was ticked, and does them one after another', () => {
    openTasks();
    const boxes = ticks();
    const first = boxes[0];
    const second = boxes[1];
    if (!first || !second) throw new Error('two rows are wanted here');
    const firstId = first.getAttribute('data-id') ?? '';
    const secondId = second.getAttribute('data-id') ?? '';
    // He ticks the second one first: that is the order they are done in.
    click(`.row-tick[data-id="${secondId}"]`);
    click(`.row-tick[data-id="${firstId}"]`);
    expect(root().querySelector('[data-do="doTheseTasks"]')?.textContent).toContain('Do these 2');
    click('[data-do="doTheseTasks"]');
    const after = currentState();
    expect(after?.taskQueue).toEqual([secondId, firstId]);
    expect(after?.owner.currentTaskId).toBe(secondId);
    // The ticks are spent: they are not still sitting on the rows.
    expect(ticks().every((box) => !box.hasAttribute('checked'))).toBe(true);
    // He works through them: the first is finished and the next one starts itself.
    advanceMinutes(240);
    dismissEvents();
    const later = currentState();
    const done = later?.tasks.find((task) => task.id === secondId);
    expect(done?.done).toBe(true);
    expect(later?.taskQueue.includes(secondId)).toBe(false);
  });

  it('shows no orphaned boot with a Start on it, and boots once a day', () => {
    openTasks();
    const state = currentState();
    expect(state?.laptopBootedOnDay).toBe(state?.clock.day);
    expect(state?.tasks.some((task) => task.kind === 'booting' && !task.done)).toBe(false);
    // Opening it again costs nothing at all: no second boot is ever made.
    const boots = state?.tasks.filter((task) => task.kind === 'booting').length ?? 0;
    click('[data-modal="laptop"] [data-do="closeModal"]');
    click('[data-office="laptop"]');
    const again = currentState();
    expect(again?.tasks.filter((task) => task.kind === 'booting')).toHaveLength(boots);
  });
});
