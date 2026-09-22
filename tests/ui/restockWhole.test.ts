// @vitest-environment jsdom
// A restock is never trimmed to the rack (PIOTR, 22.09; open since v38; CLAUDE.md T24 2.8). The
// button cut the typed number back to the free places and said nothing about the difference, so a
// man who asked for sixty got forty and no word about the other twenty. He gets sixty now: what
// fits goes on the rack, the rest goes into the temporary store on the same rule a job's own
// delivery has followed since Turn 20, and the tab says the split and the fee before the click.

import { describe, expect, it } from 'vitest';
import { TEMP_STORAGE_COST, TEMP_STORAGE_FETCH_MINUTES } from '../../src/engine/constants';
import { rackCapacity, restockCheck, restockSheets, restockSplit, stockFree } from '../../src/engine/materials';
import { renderMaterials } from '../../src/ui/materials';
import { money } from '../../src/ui/modal';
import type { GameState } from '../../src/engine/index';
import { act, buyStartingKit, clearEvents, doTask, fillRack, newGame, runToDay } from '../helpers';

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

/** The day one hall with its budget rack of fifty and ten sheets already on it: room for forty. */
function roomForForty(): GameState {
  const state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 10);
  state.enquiries = [];
  expect(rackCapacity(state)).toBe(50);
  expect(stockFree(state)).toBe(40);
  return state;
}

describe('a rack with room for forty and an order of sixty', () => {
  it('buys all sixty: the click is not trimmed', () => {
    const state = roomForForty();
    expect(restockSheets(state, 60)).toBe(60);
    expect(restockCheck(state, 60)).toMatchObject({ ok: true, sheets: 60 });
    const bought = act(state, { type: 'RESTOCK', sheets: 60 });
    expect(bought.deliveries[0]?.sheets).toBe(60);
  });

  it('puts forty on the rack and twenty in the store, and charges the store once', () => {
    let state = act(roomForForty(), { type: 'RESTOCK', sheets: 60 });
    state = clearEvents(runToDay(state, 2).state);
    state = doTask(state, 'unload');
    expect(state.stock.sheets).toBe(50);
    expect(state.stock.tempStorageSheets).toBe(20);
    expect(state.deliveries[0]?.overflowSheets).toBe(0);
    // Nothing was left standing in the yard and nothing was asked of the player.
    expect(state.activeEvent).toBeNull();
    const storage = state.ledger.filter((entry) => entry.category === 'storage');
    expect(storage).toHaveLength(1);
    expect(storage[0]?.amount).toBeCloseTo(-TEMP_STORAGE_COST, 6);
    // Paid, not left standing: there is nowhere for a bill to wait (CLAUDE.md T22 2.1).
    expect(storage[0]?.unpaid).toBe(false);
  });

  it('leaves the fetch chore in the morning, and the sheets come back whole', () => {
    let state = act(roomForForty(), { type: 'RESTOCK', sheets: 60 });
    state = doTask(clearEvents(runToDay(state, 2).state), 'unload');
    state = clearEvents(runToDay(state, 3).state);
    const fetch = state.tasks.find((task) => task.kind === 'fetchStorage' && !task.done);
    expect(fetch?.minutesTotal).toBe(TEMP_STORAGE_FETCH_MINUTES);
    const done = doTask(state, 'fetchStorage');
    expect(done.stock.sheets).toBe(70);
    expect(done.stock.tempStorageSheets).toBe(0);
  });

  it('says the split and the fee on the tab, before the click', () => {
    const state = roomForForty();
    const split = restockSplit(state, 60);
    expect(split).toEqual({ sheets: 60, onRack: 40, toStorage: 20, storageCost: TEMP_STORAGE_COST });
    const page = parse(renderMaterials(state, '60'));
    const line = page.querySelector('[data-storage="1"]');
    expect(line?.textContent).toBe(
      `60 sheets: 40 on the rack, 20 to storage at ${money(TEMP_STORAGE_COST)}`,
    );
    // And the button buys all sixty, not forty.
    const restock = page.querySelector('[data-do="restock"]');
    expect(restock?.getAttribute('data-sheets')).toBe('60');
    expect(restock?.textContent).toContain('60 sheets');
  });

  it('says nothing about storage while the order fits', () => {
    const page = parse(renderMaterials(roomForForty(), '40'));
    expect(page.querySelector('[data-storage="1"]')).toBeNull();
    expect(page.querySelector('[data-do="restock"]')?.getAttribute('data-sheets')).toBe('40');
  });

  it('still fills the rack and no more when the player types nothing', () => {
    const state = roomForForty();
    expect(restockSheets(state)).toBe(40);
    const page = parse(renderMaterials(state, ''));
    expect(page.querySelector('[data-field="stockSheets"]')?.getAttribute('placeholder')).toBe('40');
    expect(page.querySelector('[data-storage="1"]')).toBeNull();
  });
});
