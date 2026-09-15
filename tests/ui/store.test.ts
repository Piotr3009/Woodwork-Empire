// @vitest-environment jsdom
// "When I refresh the page my game should be there" (PIOTR, 14.09; CLAUDE.md T11 3.2). The browser
// keeps one save under one key, written as the game is played, and the start screen offers it back.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SAVE_KEY, localSaveStore, peekSave, readStore, saveStore } from '../../src/cloud/store';
import { encodeSaveFile } from '../../src/cloud/file';
import { STATE_VERSION } from '../../src/engine/index';
import { AUTOSAVE_MIN_MS, advanceMinutes, currentState, mount, render } from '../../src/ui/app';
import { createTask } from '../../src/engine/tasks';
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

function has(selector: string): boolean {
  return root().querySelector(selector) !== null;
}

function dismissEvents(): void {
  let guard = 0;
  while (has('[data-do="closeHouseCard"], [data-do="resolveEvent"]') && guard < 50) {
    click('[data-do="closeHouseCard"], [data-do="resolveEvent"]');
    guard += 1;
  }
}

/** A fresh page, with whatever the test put in the store already there. */
function openPage(): void {
  document.body.innerHTML = '<div id="app"></div>';
  mount(root());
  render();
}

beforeEach(() => {
  saveStore.clear();
});

afterEach(() => {
  saveStore.clear();
});

describe('the store itself', () => {
  it('keeps one save under one key, and gives it back', () => {
    const store = localSaveStore();
    store.write('hello');
    expect(store.read()).toBe('hello');
    expect(localStorage.getItem(SAVE_KEY)).toBe('hello');
    store.clear();
    expect(store.read()).toBeNull();
  });

  it('reads the company and the day off the head of the file without opening it', () => {
    const state = newGame({ companyName: 'Joinery Core' });
    state.clock.day = 6;
    saveStore.write(encodeSaveFile(state));
    expect(peekSave()).toEqual({ kind: 'ready', companyName: 'Joinery Core', day: 6 });
  });

  it('calls a save from another build stale, and keeps its name on it', () => {
    const state = newGame({ companyName: 'Old Company' });
    const text = encodeSaveFile(state).replace(
      `"stateVersion":${STATE_VERSION}`,
      '"stateVersion":1',
    );
    saveStore.write(text);
    expect(peekSave().kind).toBe('stale');
    expect(peekSave().companyName).toBe('Old Company');
    expect(readStore().state).toBeNull();
  });

  it('says there is nothing rather than throwing on rubbish', () => {
    saveStore.write('not json at all');
    expect(peekSave().kind).toBe('none');
    saveStore.write('{"game":"Something else"}');
    expect(peekSave().kind).toBe('none');
  });
});

/** The store is written at most once a second, so a test that wants to see a single click land
 *  has to let the last write get old first (CLAUDE.md T11 3.2). */
function settleAutosave(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, AUTOSAVE_MIN_MS + 200));
}

describe('the game writing itself down as it is played', () => {
  it('writes the store when the player buys something', async () => {
    openPage();
    click('[data-do="startGame"]');
    click('[data-do="setSpeed"][data-speed="1"]');
    dismissEvents();
    await settleAutosave();
    saveStore.clear();
    click('[data-do="setView"][data-view="office"]');
    click('[data-office="catalogue"]');
    click('[data-do="openFolder"][data-id="desk"]');
    click('[data-do="buyEquipment"][data-id="desk"]');
    const stored = readStore();
    expect(stored.state).not.toBeNull();
    expect(stored.state?.onOrder.some((item) => item.specId === 'desk')).toBe(true);
  });

  it('writes it again when a modal is shut, and no more than once a second', async () => {
    // Everything this test needs it opens itself: it does not lean on what the test before it
    // left on the page.
    const toOffice = root().querySelector('[data-do="setView"][data-view="office"]');
    if (toOffice !== null) toOffice.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    while (has('[data-do="closeModal"]')) click('[data-do="closeModal"]');
    await settleAutosave();
    await settleAutosave();
    saveStore.clear();
    click('[data-office="catalogue"]');
    click('[data-do="closeModal"]');
    expect(readStore().state).not.toBeNull();
    // A second shut inside the same second writes nothing new of its own.
    const written = saveStore.read();
    click('[data-office="catalogue"]');
    click('[data-do="closeModal"]');
    expect(saveStore.read()).toBe(written);
  });

  it('writes it at the start of a day, and when a move of the hall is finished', async () => {
    await settleAutosave();
    await settleAutosave();
    const state = currentState();
    if (state === null) throw new Error('no game');
    // The morning, after the day has settled (CLAUDE.md T11 3.2).
    saveStore.clear();
    state.clock.day += 1;
    advanceMinutes(1);
    expect(readStore().state?.clock.day).toBe(state.clock.day);
    // And the move of the hall, the minute it is finished.
    await settleAutosave();
    await settleAutosave();
    const live = currentState();
    if (live === null) throw new Error('no game');
    const move = createTask(live, {
      kind: 'moveMachines',
      label: 'Moving machines: 1 item',
      minutes: 60,
    });
    advanceMinutes(1);
    saveStore.clear();
    const running = currentState();
    const same = running?.tasks.find((task) => task.id === move.id);
    if (same === undefined) throw new Error('no move on the list');
    same.done = true;
    advanceMinutes(1);
    expect(readStore().state).not.toBeNull();
  });

  it('writes it again when a modal is shut with Escape as well as with the cross', async () => {
    // Twice: the first wait lets the trailing write of the test before this one land, and the
    // second lets that one get old enough for the next click to write at once.
    await settleAutosave();
    await settleAutosave();
    saveStore.clear();
    const toOffice = root().querySelector('[data-do="setView"][data-view="office"]');
    if (toOffice !== null) toOffice.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    click('[data-office="workPlan"]');
    expect(root().querySelector('[data-modal="workPlan"]')).not.toBeNull();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(root().querySelector('[data-modal="workPlan"]')).toBeNull();
    expect(readStore().state).not.toBeNull();
  });

});

describe('the start screen with a game in the store', () => {
  it('offers Continue with the company and the day on it, and opens the clock where it was', () => {
    const state = newGame({ companyName: 'Joinery Core' });
    state.clock.day = 4;
    state.clock.minute = 123;
    saveStore.write(encodeSaveFile(state));
    openPage();
    expect(has('[data-do="continueSaved"]')).toBe(true);
    expect(root().innerHTML).toContain('Continue · Joinery Core, day 4');
    click('[data-do="continueSaved"]');
    expect(currentState()?.clock).toEqual({ day: 4, minute: 123 });
    expect(currentState()?.companyName).toBe('Joinery Core');
  });

  it('asks once before a new game throws the save away, on a second button', () => {
    const state = newGame({ companyName: 'Joinery Core' });
    saveStore.write(encodeSaveFile(state));
    openPage();
    // No plain Start while there is something to come back to: the button asks first.
    expect(has('[data-do="startGame"]')).toBe(false);
    click('[data-do="askStartOver"]');
    expect(root().innerHTML).toContain('Start over? The saved game will be lost.');
    // And he can change his mind.
    click('[data-do="keepSaved"]');
    expect(has('[data-do="startGame"]')).toBe(false);
    click('[data-do="askStartOver"]');
    click('[data-do="startGame"]');
    expect(currentState()?.clock.day).toBe(1);
    expect(currentState()?.companyName).not.toBe('Joinery Core');
  });

  it('says a save from an older build cannot be continued, and offers to clear it', () => {
    const state = newGame({ companyName: 'Old Company' });
    const text = encodeSaveFile(state).replace(
      `"stateVersion":${STATE_VERSION}`,
      '"stateVersion":1',
    );
    saveStore.write(text);
    openPage();
    expect(root().innerHTML).toContain(
      'A saved game from an older build was found; it cannot be continued.',
    );
    expect(has('[data-do="continueSaved"]')).toBe(false);
    expect(has('[data-do="startGame"]')).toBe(true);
    click('[data-do="clearSaved"]');
    expect(saveStore.read()).toBeNull();
    expect(root().innerHTML).not.toContain('older build');
  });

  it('offers nothing at all when the store is empty', () => {
    openPage();
    expect(has('[data-do="continueSaved"]')).toBe(false);
    expect(has('[data-do="askStartOver"]')).toBe(false);
    expect(has('[data-do="startGame"]')).toBe(true);
  });
});
