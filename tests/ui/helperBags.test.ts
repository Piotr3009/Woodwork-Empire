// @vitest-environment jsdom
// "The bags are his too" (PIOTR, 18.09; CLAUDE.md T20 2.8.1). A full store is emptied by the
// helper without the owner being asked, and the chip under the hall says so instead of offering
// the player a button.

import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { currentState, mount, render } from '../../src/ui/app';
import { createTask, emptyBagsMinutes } from '../../src/engine/tasks';
import { bagStore } from '../../src/engine/machines';
import type { GameState } from '../../src/engine/index';
import { buyStartingKit, fillBags, hireNow, newGame, runClock } from '../helpers';

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

function game(): GameState {
  const state = currentState();
  if (state === null) throw new Error('no game');
  return state;
}

function chips(): string[] {
  return Array.from(root().querySelectorAll('.hall-chip')).map(
    (element) => (element.textContent ?? '').trim(),
  );
}

beforeAll(() => {
  document.body.innerHTML = '<div id="app"></div>';
  mount(root());
  click('[data-do="startGame"]');
});

beforeEach(() => {
  Object.assign(game(), buyStartingKit(newGame({ difficulty: 'veryEasy' })));
  game().enquiries = [];
  if (root().querySelector('[data-do="setView"][data-view="hall"]') !== null) {
    click('[data-do="setView"][data-view="hall"]');
  }
  render();
});

describe('the bags are the helper s (CLAUDE.md T20 2.8)', () => {
  it('says Dave is emptying the bags, with no button, once he has them in hand', () => {
    const state = game();
    Object.assign(state, fillBags(state));
    const hired = hireNow(state, 'helper', null).workers.find((man) => man.role === 'helper');
    if (hired === undefined) throw new Error('no helper was taken on');
    const dave = { ...hired, id: 'helper-bags', name: 'Dave', startDay: state.clock.day };
    state.workers.push(dave);
    // The chip is driven by its own input and not by the task table: the store is full, the job
    // of work exists and this man has it in his hands, which is both halves of it.
    const task = createTask(state, {
      kind: 'emptyBags',
      label: 'Empty the bags',
      minutes: emptyBagsMinutes(bagStore(state).bags),
    });
    task.doneBy = dave.id;
    dave.taskId = task.id;
    render();
    expect(chips()).toContain('Dave is emptying the bags');
    expect(chips().some((text) => text.includes('The bags are full'))).toBe(false);
    expect(root().querySelector('.hall-chip [data-do="emptyBags"]')).toBeNull();
    // And back to the question the moment nobody has them.
    task.doneBy = null;
    dave.taskId = null;
    render();
    expect(chips().some((text) => text.includes('The bags are full'))).toBe(true);
    expect(root().querySelector('.hall-chip [data-do="emptyBags"]')).not.toBeNull();
  });

  it('empties them without the owner being asked, because the store is already his', () => {
    // 2.8.1 asks for the helper on `bagChange`'s autoRoles. The kind is called `emptyBags` now
    // (NOTES-B3.md, names) and it has carried `helper` in its autoRoles since Turn 12: this is
    // the assertion that says so, in the engine and not in the table.
    let state = fillBags(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
    state.enquiries = [];
    state = hireNow(state, 'helper', null);
    const helper = state.workers.find((worker) => worker.role === 'helper');
    if (helper === undefined) throw new Error('no helper on the books');
    helper.startDay = state.clock.day;
    createTask(state, {
      kind: 'emptyBags',
      label: 'Empty the bags',
      minutes: emptyBagsMinutes(bagStore(state).bags),
    });
    const later = runClock(state, 2);
    const task = later.tasks.find((entry) => entry.kind === 'emptyBags' && !entry.done);
    expect(task?.doneBy).toBe(helper.id);
    expect(later.owner.currentTaskId).toBeNull();
    expect(later.activeEvent?.kind).not.toBe('bagsFull');
  });
});
