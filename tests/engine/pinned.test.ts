// @vitest-environment jsdom
// The pinned state (src/engine/pinned.ts; v97): a question of the pinned object is worked out
// once and handed back for the rest of the call; any other object, and the same object once the
// pin is off, is worked out afresh. The page pins for one writing and no longer, so a test that
// writes into the state the page holds and writes the page again sees what it wrote.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { pinState, pinned } from '../../src/engine/pinned';
import { drawnPlaces, drawnInUse } from '../../src/engine/drawn';
import { lineModules, standingLines } from '../../src/engine/machines';
import { LINE_MODULES } from '../../src/engine/constants';
import type { GameState } from '../../src/engine/index';
import { currentState, mount, render } from '../../src/ui/app';
import { buyStartingKit, newGame, placeEquipment } from '../helpers';

afterEach(() => {
  pinState(null);
});

describe('pinned (v97)', () => {
  it('works a question out once for the pinned object, and afresh for any other', () => {
    const one = newGame({ difficulty: 'veryEasy' });
    const other = newGame({ difficulty: 'veryEasy' });
    const compute = vi.fn(() => ({ answer: 1 }));
    pinState(one);
    const first = pinned(one, 'q', compute);
    expect(pinned(one, 'q', compute)).toBe(first);
    expect(compute).toHaveBeenCalledTimes(1);
    // Another object, pinned or not, is its own question.
    expect(pinned(other, 'q', compute)).not.toBe(first);
    expect(compute).toHaveBeenCalledTimes(2);
    // Another key of the same object is another question.
    pinned(one, 'r', compute);
    expect(compute).toHaveBeenCalledTimes(3);
  });

  it('forgets everything when the pin comes off or moves to another object', () => {
    const one = newGame({ difficulty: 'veryEasy' });
    const compute = vi.fn(() => 'a');
    pinState(one);
    pinned(one, 'q', compute);
    pinState(null);
    pinned(one, 'q', compute);
    expect(compute).toHaveBeenCalledTimes(2);
    pinState(one);
    pinned(one, 'q', compute);
    pinned(one, 'q', compute);
    expect(compute).toHaveBeenCalledTimes(3);
    pinState(newGame({ difficulty: 'veryEasy' }));
    pinned(one, 'q', compute);
    expect(compute).toHaveBeenCalledTimes(4);
  });

  it('hands back the same drawn places, the same set in use and the same line masks while pinned', () => {
    const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    LINE_MODULES.forEach((id, index) => placeEquipment(state, id, { x: 2 + 6 * index, y: 14, id: `kit-line-${index + 1}` }));
    pinState(state);
    expect(drawnPlaces(state)).toBe(drawnPlaces(state));
    expect(drawnInUse(state)).toBe(drawnInUse(state));
    expect(standingLines(state)).toEqual([1]);
    expect(lineModules(state, 1)).toBe(6);
    pinState(null);
    // Unpinned, a fresh answer each time, equal and not the same.
    expect(drawnPlaces(state)).not.toBe(drawnPlaces(state));
    expect(drawnPlaces(state)).toEqual(drawnPlaces(state));
  });

  it('is never stale under the engine s own minute: the clone it writes into is not the pinned object', () => {
    const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    pinState(state);
    const before = lineModules(state, 1);
    expect(before).toBe(0);
    // The engine writes into a clone, as `runMinutes` does: the pin is on the page's object only.
    const clone = JSON.parse(JSON.stringify(state)) as GameState;
    LINE_MODULES.forEach((id, index) => placeEquipment(clone, id, { x: 2 + 6 * index, y: 14, id: `kit-line-${index + 1}` }));
    expect(lineModules(clone, 1)).toBe(6);
    expect(lineModules(state, 1)).toBe(0);
  });

  it('is off again after the page is written, so what is written into the state is seen next time', () => {
    document.body.innerHTML = '<div id="app"></div>';
    const root = document.querySelector<HTMLElement>('#app');
    if (root === null) throw new Error('the app root is wanted');
    mount(root);
    root.querySelector<HTMLButtonElement>('[data-do="startGame"]')?.click();
    const state = currentState();
    if (state === null) throw new Error('a game is wanted');
    render();
    const compute = vi.fn(() => 'fresh');
    pinned(state, 'q', compute);
    pinned(state, 'q', compute);
    expect(compute).toHaveBeenCalledTimes(2);
    // Written into in place, as the ui tests do, and the page written again: the line it now has.
    Object.assign(state, buyStartingKit(state));
    LINE_MODULES.forEach((id, index) => placeEquipment(state, id, { x: 2 + 6 * index, y: 14, id: `kit-line-${index + 1}` }));
    render();
    expect(root.querySelectorAll('[data-sprite^="windowLine"]').length).toBeGreaterThan(0);
  });
});
