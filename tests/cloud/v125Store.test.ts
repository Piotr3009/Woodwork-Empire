/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// v125: the browser's save without the key store's limit [PIOTR, 24.10: "code it so that everything
// speeds up"; the audit of that evening found his save of day 8,464, 7.8 million characters, past
// the 5.2 million the browser's key store takes, so nothing was being kept]. The save packed into a
// database, its head under a key of its own for the start screen, a save of a build before this one
// moved across, and the old key where there is no database.

import { describe, expect, it, vi } from 'vitest';
import { encodeSaveFile } from '../../src/cloud/file';
import {
  SAVE_HEAD_KEY,
  SAVE_KEY,
  type SaveDatabase,
  packedSaveStore,
  peekSave,
  readStore,
  saveHead,
} from '../../src/cloud/store';
import { emptyLineDay, emptyWindowLine } from '../../src/engine/machines';
import type { GameState } from '../../src/engine/index';
import { newGame } from '../helpers';

/** One slot in memory, standing for the browser's IndexedDB; `slow` holds its first answer back. */
function memoryDatabase(slow = 0): SaveDatabase & { value: unknown } {
  const database = {
    value: undefined as unknown,
    get: () => new Promise<unknown>((resolve) => setTimeout(() => resolve(database.value), slow)),
    put: async (value: unknown) => {
      database.value = value;
    },
    remove: async () => {
      database.value = undefined;
    },
  };
  return database;
}

/** The browser's key store in memory. */
function memoryKeys(): Storage {
  const keys = new Map<string, string>();
  return {
    get length() {
      return keys.size;
    },
    clear: () => keys.clear(),
    getItem: (key: string) => keys.get(key) ?? null,
    key: (index: number) => Array.from(keys.keys())[index] ?? null,
    removeItem: (key: string) => {
      keys.delete(key);
    },
    setItem: (key: string, value: string) => {
      keys.set(key, String(value));
    },
  };
}

/** A company of eighty lines, each with a year of its day book: a save as big as Piotr's. */
function bigCompany(): GameState {
  const state = newGame({ difficulty: 'veryEasy', companyName: 'Prime Joinery' });
  state.clock.day = 8464;
  for (let line = 1; line <= 80; line += 1) {
    const record = emptyWindowLine(line, 8000, 'window');
    record.days = Array.from({ length: 400 }, (_, index) => ({ ...emptyLineDay(8000 + index), windows: index % 24, turnover: (index % 24) * 1500 }));
    state.windowLines.push(record);
  }
  return state;
}

describe('the save packed into the database (v125)', () => {
  it('keeps the game in hand at once, packs it away, and gives it back to the next page, head first', async () => {
    const database = memoryDatabase();
    const keys = memoryKeys();
    const state = bigCompany();
    const text = encodeSaveFile(state);
    // Bigger than the browser's key store takes: what was lost before v125.
    expect(text.length).toBeGreaterThan(5200000);
    const store = packedSaveStore(database, keys);
    await store.whenLoaded();
    expect(store.read()).toBeNull();
    store.write(text, saveHead(state));
    expect(store.read()).toBe(text);
    expect(peekSave(store)).toEqual({ kind: 'ready', companyName: 'Prime Joinery', day: 8464 });
    await vi.waitFor(() => expect(database.value).toBeInstanceOf(ArrayBuffer));
    // Packed, it is a sliver of the text.
    expect((database.value as ArrayBuffer).byteLength).toBeLessThan(text.length / 20);
    // The next page: the head says at once what is waiting, and the whole comes out of the database.
    const next = packedSaveStore(database, keys);
    expect(next.loaded()).toBe(false);
    expect(peekSave(next)).toEqual({ kind: 'ready', companyName: 'Prime Joinery', day: 8464 });
    await next.whenLoaded();
    expect(next.read()).toBe(text);
    expect(readStore(next).state?.windowLines).toHaveLength(80);
  });

  it('takes a save left under the old key by a build before this one, and moves it across', async () => {
    const database = memoryDatabase();
    const keys = memoryKeys();
    const state = newGame({ companyName: 'Joinery Core' });
    state.clock.day = 6;
    const text = encodeSaveFile(state);
    keys.setItem(SAVE_KEY, text);
    const store = packedSaveStore(database, keys);
    expect(store.loaded()).toBe(true);
    expect(store.read()).toBe(text);
    expect(peekSave(store)).toEqual({ kind: 'ready', companyName: 'Joinery Core', day: 6 });
    await vi.waitFor(() => expect(keys.getItem(SAVE_KEY)).toBeNull());
    expect(database.value).toBeInstanceOf(ArrayBuffer);
    const next = packedSaveStore(database, keys);
    await next.whenLoaded();
    expect(next.read()).toBe(text);
  });

  it('holds a write or a clear made before the database has answered over what it holds', async () => {
    const database = memoryDatabase(30);
    const keys = memoryKeys();
    const old = encodeSaveFile(newGame({ companyName: 'Old' }));
    database.value = old;
    const store = packedSaveStore(database, keys);
    const fresh = newGame({ companyName: 'Fresh' });
    store.write(encodeSaveFile(fresh), saveHead(fresh));
    await store.whenLoaded();
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(peekSave(store).companyName).toBe('Fresh');
    expect(readStore(store).state?.companyName).toBe('Fresh');
    database.value = old;
    const cleared = packedSaveStore(database, keys);
    cleared.clear();
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(cleared.read()).toBeNull();
    expect(peekSave(cleared).kind).toBe('none');
    expect(database.value).toBeUndefined();
    expect(keys.getItem(SAVE_HEAD_KEY)).toBeNull();
  });

  it('keeps to the old key where the browser has no database', async () => {
    const keys = memoryKeys();
    const refusing: SaveDatabase = {
      get: () => Promise.reject(new Error('no database')),
      put: () => Promise.reject(new Error('no database')),
      remove: () => Promise.reject(new Error('no database')),
    };
    const store = packedSaveStore(refusing, keys);
    await store.whenLoaded();
    const state = newGame({ companyName: 'Small' });
    const text = encodeSaveFile(state);
    store.write(text, saveHead(state));
    await vi.waitFor(() => expect(keys.getItem(SAVE_KEY)).toBe(text));
    expect(peekSave(store).companyName).toBe('Small');
  });

  it('says nothing is waiting when the head has outlived a save the browser threw away', async () => {
    const keys = memoryKeys();
    keys.setItem(SAVE_HEAD_KEY, saveHead(newGame({ companyName: 'Gone' })));
    const store = packedSaveStore(memoryDatabase(), keys);
    expect(peekSave(store).kind).toBe('ready');
    await store.whenLoaded();
    expect(peekSave(store).kind).toBe('none');
    expect(readStore(store).state).toBeNull();
  });

  it('reads the head off a text written without one, as the start screen read the whole', async () => {
    const store = packedSaveStore(memoryDatabase(), memoryKeys());
    await store.whenLoaded();
    store.write('not json at all');
    expect(peekSave(store).kind).toBe('none');
    store.write('{"game":"Something else"}');
    expect(peekSave(store).kind).toBe('none');
    const state = newGame({ companyName: 'Joinery Core' });
    state.clock.day = 9;
    store.write(encodeSaveFile(state));
    expect(peekSave(store)).toEqual({ kind: 'ready', companyName: 'Joinery Core', day: 9 });
  });
});
