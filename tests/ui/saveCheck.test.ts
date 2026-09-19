// @vitest-environment jsdom
// The save check of Petros T12-L (CLAUDE.md T14 2.5): a fresh game started in this build, a new
// company on Easy on day 1, saves through the browser's store, the file and the cloud row, and
// loads back through Continue, Load from file and the row's decoder, at day 1 and again after
// thirty minutes of play. A v20 save, made from a short run on main before this turn's first
// commit, loads too.

import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { decodeSaveFile, encodeSaveFile, saveFileName } from '../../src/cloud/file';
import { openSavedRow } from '../../src/cloud/saves';
import { peekSave, readStore, saveStore } from '../../src/cloud/store';
import type { SaveStore } from '../../src/cloud/store';
import { APP_VERSION, STATE_VERSION, formatCalendarDay, tick } from '../../src/engine/index';
import type { GameState } from '../../src/engine/index';
import {
  AUTOSAVE_MIN_MS,
  advanceMinutes,
  currentState,
  mount,
  onFileChosen,
  render,
} from '../../src/ui/app';

const V20_FIXTURE = 'tests/fixtures/save-v20.woodwork.json';

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
  while (root().querySelector('[data-do="closeHouseCard"], [data-do="resolveEvent"]') !== null && guard < 50) {
    click('[data-do="closeHouseCard"], [data-do="resolveEvent"]');
    guard += 1;
  }
}

/** A fresh page, with whatever is in the store already there. */
function openPage(): void {
  document.body.innerHTML = '<div id="app"></div>';
  mount(root());
  render();
}

function game(): GameState {
  const state = currentState();
  if (state === null) throw new Error('no game');
  return state;
}

/** The store is written at most once a second, so a write that followed another closely is
 *  still on its way (CLAUDE.md T11 3.2): this lets it land. */
function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, AUTOSAVE_MIN_MS + 200));
}

/** A save file as the picker hands it over. A browser's File reads itself with text(); the
 *  headless DOM's has no such method, so it is given one that answers with the same bytes. */
function fileOf(text: string, name: string): File {
  const file = new File([text], name, { type: 'application/json' });
  if (typeof (file as { text?: unknown }).text !== 'function') {
    Object.defineProperty(file, 'text', { value: () => Promise.resolve(text) });
  }
  return file;
}

/** The state as a save holds it: plain JSON, the way every store keeps it. */
function asSaved(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

/** The three stores hold the same bytes, and each opens back into the same game (T11 3.2). */
function savesAndLoadsEverywhere(state: GameState): void {
  const saved = asSaved(state);
  // The browser's store, written by the game as it is played.
  const stored = readStore();
  expect(stored.state).toEqual(saved);
  expect(peekSave()).toEqual({ kind: 'ready', companyName: state.companyName, day: state.clock.day });
  // The file the Menu saves and loads.
  const text = encodeSaveFile(state, '2026-09-15T22:00:00.000Z');
  expect(decodeSaveFile(text).state).toEqual(saved);
  expect(decodeSaveFile(text).note).toBe('Loaded from file.');
  expect(saveFileName(state)).toContain(`-day${state.clock.day}-v${STATE_VERSION}.woodwork.json`);
  // The cloud row, which holds the same bytes and opens through the same decoder.
  const row = openSavedRow({ state: text, state_version: STATE_VERSION });
  expect(row.state).toEqual(saved);
  expect(row.note).toBe('Loaded.');
}

/** A fresh game: a new company on Easy, day 1, through the start screen. */
function startFresh(): GameState {
  openPage();
  click('[data-do="pickDifficulty"][data-id="easy"]');
  click('[data-do="startGame"]');
  const state = game();
  expect(state.difficulty).toBe('easy');
  expect(state.clock).toEqual({ day: 1, minute: 0 });
  return state;
}

beforeEach(() => {
  saveStore.clear();
});

afterEach(() => {
  saveStore.clear();
});

describe('a fresh game in this build', () => {
  it('is on the build the brief names', () => {
    expect(APP_VERSION).toBe('v30');
    expect(STATE_VERSION).toBe(17);
  });

  it('saves through the store, the file and the cloud row on day 1, and loads back three ways', async () => {
    const state = startFresh();
    await settle();
    savesAndLoadsEverywhere(state);
    const saved = asSaved(state);
    // Continue: a fresh page finds the game and opens the clock where it was.
    openPage();
    expect(root().querySelector('[data-do="continueSaved"]')).not.toBeNull();
    click('[data-do="continueSaved"]');
    expect(game()).toEqual(saved);
    // Load from file: the file the Menu would download, chosen again on a page with no save.
    const text = encodeSaveFile(saved);
    saveStore.clear();
    openPage();
    await onFileChosen(fileOf(text, saveFileName(saved)));
    expect(game()).toEqual(saved);
    expect(root().querySelector('.office-room, .hall-view')).not.toBeNull();
    // And a file loaded is the game from now on: the store holds it too (T11 3.2).
    expect(readStore().state).toEqual(saved);
  });

  it('does the same after thirty minutes of play', async () => {
    startFresh();
    click('[data-do="setSpeed"][data-speed="1"]');
    let ran = 0;
    let guard = 0;
    while (ran < 30 && guard < 40) {
      guard += 1;
      ran += advanceMinutes(30 - ran);
      dismissEvents();
    }
    expect(ran).toBe(30);
    const state = game();
    expect(state.clock.minute).toBeGreaterThanOrEqual(30);
    // The store follows the play, not the clock: a shut modal writes it (T11 3.2).
    click('[data-do="setView"][data-view="office"]');
    click('[data-office="catalogue"]');
    click('[data-do="closeModal"]');
    await settle();
    savesAndLoadsEverywhere(game());
    const saved = asSaved(game());
    openPage();
    click('[data-do="continueSaved"]');
    expect(game()).toEqual(saved);
    expect(game().clock.minute).toBe(saved.clock.minute);
    saveStore.clear();
    openPage();
    await onFileChosen(fileOf(encodeSaveFile(saved), 'later.woodwork.json'));
    expect(game()).toEqual(saved);
  });
});

describe('a v20 save', () => {
  const text = readFileSync(V20_FIXTURE, 'utf8');
  const raw = JSON.parse(text) as { stateVersion: number; savedAt: string; state: GameState };

  it('is what it claims: a short run on main before the first Turn 14 commit', () => {
    expect(raw.stateVersion).toBe(14);
    expect(raw.savedAt).toBe('2026-09-15T21:30:00.000Z');
    expect(raw.state.version).toBe(14);
    expect(raw.state.difficulty).toBe('easy');
    expect(raw.state.clock).toEqual({ day: 2, minute: 30 });
    expect(raw.state.jobs).toHaveLength(1);
    expect(raw.state.equipment.length).toBeGreaterThan(5);
  });

  it('loads through the file, the row and the store, and runs', () => {
    const opened = decodeSaveFile(text);
    expect(opened.state).not.toBeNull();
    expect(opened.note).toBe('Loaded from file.');
    const state = opened.state as GameState;
    expect(state.version).toBe(STATE_VERSION);
    const store: SaveStore = { write: () => undefined, read: () => text, clear: () => undefined };
    expect(peekSave(store)).toEqual({ kind: 'ready', companyName: 'Woodwork Empire', day: 2 });
    expect(readStore(store).state).toEqual(state);
    expect(openSavedRow({ state: text, state_version: 14 }).state).toEqual(state);
    const later = tick(state, 30);
    expect(later.clock.minute).toBeGreaterThan(30);
    expect(decodeSaveFile(encodeSaveFile(later)).state).toEqual(later);
  });

  it('continues from the start screen and loads from the file through the page', async () => {
    saveStore.write(text);
    openPage();
    expect(root().innerHTML).toContain(`Continue · Woodwork Empire, ${formatCalendarDay(2)}`);
    click('[data-do="continueSaved"]');
    expect(game().clock).toEqual({ day: 2, minute: 30 });
    expect(game().jobs).toHaveLength(1);
    saveStore.clear();
    openPage();
    await onFileChosen(fileOf(text, 'save-v20.woodwork.json'));
    expect(game().clock).toEqual({ day: 2, minute: 30 });
    expect(game().version).toBe(STATE_VERSION);
  });
});
