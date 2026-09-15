// Where a saved game is kept. One interface, so the browser, the file and the cloud are three
// stores of the same bytes and not three ideas of what a save is (CLAUDE.md T11 3.2).
//
// This module is the one place in the game that touches the browser's storage. Turn 1 3.13 forbade
// it; Piotr withdrew that for exactly this module on 14.09, and for nothing else.

import { decodeSaveFile } from './file';
import { STATE_VERSION } from '../engine/index';

/** The key the browser keeps the game under. One slot: more are parked. */
export const SAVE_KEY = 'woodwork-empire.save';

/** A place a save can be put and taken back. The text is always `encodeSaveFile` output. */
export interface SaveStore {
  write(text: string): void;
  read(): string | null;
  clear(): void;
}

/** What is waiting in the store, as the start screen has to read it: nothing at all, a game this
 *  build can open, or one from a build that is gone. */
export interface StoredSave {
  kind: 'none' | 'ready' | 'stale';
  companyName: string;
  day: number;
}

export const NO_STORED_SAVE: StoredSave = { kind: 'none', companyName: '', day: 0 };

/** The browser's own local storage. Every call is guarded: a private window, a browser with site
 *  data turned off and a page inside a sandbox all throw rather than answer, and a game that
 *  cannot be saved still has to be playable. */
export function localSaveStore(): SaveStore {
  const storage = (): Storage | null => {
    try {
      return typeof localStorage === 'undefined' ? null : localStorage;
    } catch {
      return null;
    }
  };
  return {
    write(text: string): void {
      try {
        storage()?.setItem(SAVE_KEY, text);
      } catch {
        // A full or forbidden store is not an error the player can do anything about.
      }
    },
    read(): string | null {
      try {
        return storage()?.getItem(SAVE_KEY) ?? null;
      } catch {
        return null;
      }
    },
    clear(): void {
      try {
        storage()?.removeItem(SAVE_KEY);
      } catch {
        // As above.
      }
    },
  };
}

/** The one store the game writes to as it is played. */
export const saveStore: SaveStore = localSaveStore();

/** What the head of a save file says about itself, without opening the whole game out of it: the
 *  company, the day and whether this build can read it at all (CLAUDE.md T11 3.2). */
export function peekSave(store: SaveStore = saveStore): StoredSave {
  const text = store.read();
  if (text === null || text === '') return NO_STORED_SAVE;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return NO_STORED_SAVE;
  }
  if (typeof parsed !== 'object' || parsed === null) return NO_STORED_SAVE;
  const file = parsed as {
    game?: unknown;
    stateVersion?: unknown;
    state?: { companyName?: unknown; clock?: { day?: unknown } };
  };
  if (file.game !== 'Woodwork Empire') return NO_STORED_SAVE;
  const companyName = typeof file.state?.companyName === 'string' ? file.state.companyName : '';
  const day = typeof file.state?.clock?.day === 'number' ? file.state.clock.day : 0;
  if (file.stateVersion !== STATE_VERSION) return { kind: 'stale', companyName, day };
  return { kind: 'ready', companyName, day };
}

/** The game in the store, or the reason there is none. The same decoder the file load uses, so a
 *  save cannot be good in one place and bad in another. */
export function readStore(store: SaveStore = saveStore): ReturnType<typeof decodeSaveFile> {
  const text = store.read();
  if (text === null || text === '') return { state: null, note: 'Nothing saved yet.' };
  return decodeSaveFile(text);
}
