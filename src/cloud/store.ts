// Where a saved game is kept. One interface, so the browser, the file and the cloud are three
// stores of the same bytes and not three ideas of what a save is (CLAUDE.md T11 3.2).
//
// This module is the one place in the game that touches the browser's storage. Turn 1 3.13 forbade
// it; Piotr withdrew that for exactly this module on 14.09, and for nothing else.

import { decodeSaveFile } from './file';
import { STATE_VERSION } from '../engine/index';
import { canOpenVersion } from '../engine/migrate';
import type { GameState } from '../engine/types';

/** The key the browser kept the game under until v125, and still keeps it under where it has no
 *  database. One slot: more are parked. */
export const SAVE_KEY = 'woodwork-empire.save';

/** The key the head of the save is kept under from v125: the company, the day and the version, all
 *  the start screen reads, at once and without the whole save. */
export const SAVE_HEAD_KEY = 'woodwork-empire.head';

/** A place a save can be put and taken back. The text is always `encodeSaveFile` output. */
export interface SaveStore {
  /** The game written, with its head (`saveHead`) when the caller has it to hand. */
  write(text: string, head?: string): void;
  /** The whole save, or null when there is none or it is not read back yet (`loaded`). */
  read(): string | null;
  clear(): void;
  /** What the start screen reads: the save's head where the store keeps one, else the whole. */
  peek(): string | null;
  /** True once `read` gives the whole save. */
  loaded(): boolean;
  /** Settles once `read` gives the whole save. */
  whenLoaded(): Promise<void>;
}

/** The head of a save: the fields of the file the start screen reads and nothing else, in the file's
 *  own shape, so `peekSave` reads it as it reads a whole file (v125). */
export function saveHead(state: GameState): string {
  return JSON.stringify({
    game: 'Woodwork Empire',
    stateVersion: STATE_VERSION,
    state: { companyName: state.companyName, clock: { day: state.clock.day } },
  });
}

/** The head of a save from its text, for a caller that has only the text: the same fields as the
 *  file has them, so the start screen says of the head what it would say of the whole. Nothing for
 *  a text that is not a file at all. */
function headOf(text: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return '';
  }
  if (typeof parsed !== 'object' || parsed === null) return '';
  const file = parsed as { game?: unknown; stateVersion?: unknown; state?: { companyName?: unknown; clock?: { day?: unknown } } };
  return JSON.stringify({
    game: file.game,
    stateVersion: file.stateVersion,
    state: { companyName: file.state?.companyName, clock: { day: file.state?.clock?.day } },
  });
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
    peek(): string | null {
      return this.read();
    },
    loaded(): boolean {
      return true;
    },
    whenLoaded(): Promise<void> {
      return Promise.resolve();
    },
  };
}

/** One slot of a database the save is packed into: what `packedSaveStore` is handed, the
 *  browser's IndexedDB in the game and a map in the tests. */
export interface SaveDatabase {
  get(): Promise<unknown>;
  put(value: unknown): Promise<void>;
  remove(): Promise<void>;
}

/** The save as the database keeps it: packed with gzip where the browser packs (every browser of
 *  the last few years), a thirtieth of the text on Piotr's save of day 8,464 (7.8 MB to 260 KB), and
 *  the text itself where it does not. */
async function pack(text: string): Promise<ArrayBuffer | string> {
  if (typeof CompressionStream === 'undefined') return text;
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Response(stream).arrayBuffer();
}

/** The text of what the database kept, or null for nothing it can read. */
async function unpack(value: unknown): Promise<string | null> {
  if (typeof value === 'string') return value;
  if (value instanceof ArrayBuffer && typeof DecompressionStream !== 'undefined') {
    const stream = new Blob([value]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(stream).text();
  }
  return null;
}

/** The browser's store from v125 [PIOTR, 24.10: "code it so that everything speeds up"]. The save
 *  goes packed into a database (`SaveDatabase`), which holds what the browser's key store could not:
 *  that store takes about 5.2 million characters, and Piotr's save of day 8,464 is 7.8 million, so
 *  from some day on nothing was being kept and a page opened again offered an old game. Its head
 *  goes beside it under a key of its own (`SAVE_HEAD_KEY`), so the start screen says at once what
 *  is waiting. The game in hand is the store's own copy: written there at once and read from there,
 *  and packed and put away in the background, one write after another, the last one standing. A
 *  save left under the old key by a build before this one is the game until the first write, and is
 *  moved across. Where there is no database at all, the old key holds what it can, as before. */
export function packedSaveStore(database: SaveDatabase, keys: Storage | null): SaveStore {
  const safely = <T>(work: () => T, otherwise: T): T => {
    try {
      return work();
    } catch {
      return otherwise;
    }
  };
  let text: string | null = safely(() => keys?.getItem(SAVE_KEY) ?? null, null);
  let isLoaded = false;
  // A write or a clear before the database has answered is newer than whatever it holds.
  let touched = false;
  let settle: () => void = () => undefined;
  const settled = new Promise<void>((resolve) => {
    settle = resolve;
  });
  const markLoaded = (): void => {
    isLoaded = true;
    settle();
  };
  let queued = false;
  let queue: Promise<void> = Promise.resolve();
  const putAway = (): void => {
    if (queued) return;
    queued = true;
    queue = queue.then(async () => {
      // What is in hand when the turn comes, so a burst of writes puts away only the last.
      queued = false;
      const now = text;
      try {
        if (now === null) {
          await database.remove();
        } else {
          await database.put(await pack(now));
          safely(() => keys?.removeItem(SAVE_KEY), undefined);
        }
      } catch {
        if (now !== null) safely(() => keys?.setItem(SAVE_KEY, now), undefined);
      }
    });
  };
  if (text !== null) {
    // A save from before v125, under the old key: it is the game, with its head, on its way across.
    const old = text;
    safely(() => keys?.setItem(SAVE_HEAD_KEY, headOf(old)), undefined);
    markLoaded();
    putAway();
  } else {
    database
      .get()
      .then(unpack)
      .then(
        (found) => {
          if (!touched) {
            text = found;
            // A head left over from a save the browser has since thrown away says nothing is there.
            if (found === null) safely(() => keys?.removeItem(SAVE_HEAD_KEY), undefined);
          }
          markLoaded();
        },
        () => markLoaded(),
      );
  }
  return {
    write(next: string, head?: string): void {
      text = next;
      touched = true;
      markLoaded();
      safely(() => keys?.setItem(SAVE_HEAD_KEY, head ?? headOf(next)), undefined);
      putAway();
    },
    read(): string | null {
      return text;
    },
    clear(): void {
      text = null;
      touched = true;
      markLoaded();
      safely(() => keys?.removeItem(SAVE_HEAD_KEY), undefined);
      safely(() => keys?.removeItem(SAVE_KEY), undefined);
      putAway();
    },
    peek(): string | null {
      return safely(() => keys?.getItem(SAVE_HEAD_KEY) ?? null, null) ?? text;
    },
    loaded(): boolean {
      return isLoaded;
    },
    whenLoaded(): Promise<void> {
      return settled;
    },
  };
}

/** The database's name, its store and the one slot the game keeps (v125) [TUNE: chat: the names]. */
const DATABASE_NAME = 'woodwork-empire';
const DATABASE_STORE = 'saves';
const DATABASE_SLOT = 'slot1';

/** The browser's IndexedDB as one slot. A browser that refuses it (a private window of some, site
 *  data turned off) refuses every call, and the store keeps to the old key. */
function indexedDbSlot(): SaveDatabase {
  let opened: Promise<IDBDatabase> | null = null;
  const open = (): Promise<IDBDatabase> => {
    opened ??= new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(DATABASE_STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return opened;
  };
  const run = (mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest): Promise<unknown> =>
    open().then(
      (base) =>
        new Promise<unknown>((resolve, reject) => {
          const transaction = base.transaction(DATABASE_STORE, mode);
          const request = work(transaction.objectStore(DATABASE_STORE));
          transaction.oncomplete = () => resolve(request.result);
          transaction.onerror = () => reject(transaction.error);
          transaction.onabort = () => reject(transaction.error);
        }),
    );
  return {
    get: () => run('readonly', (store) => store.get(DATABASE_SLOT)),
    put: (value) => run('readwrite', (store) => store.put(value, DATABASE_SLOT)).then(() => undefined),
    remove: () => run('readwrite', (store) => store.delete(DATABASE_SLOT)).then(() => undefined),
  };
}

/** The browser's key store, or null where it is not there or refuses to be asked. */
function browserKeys(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** The one store the game writes to as it is played: packed into IndexedDB where the browser has it
 *  (v125), and the key store as before where it has not, as in the tests. */
export const saveStore: SaveStore =
  typeof indexedDB === 'undefined' ? localSaveStore() : packedSaveStore(indexedDbSlot(), browserKeys());

/** What the head of a save file says about itself, without opening the whole game out of it: the
 *  company, the day and whether this build can read it at all (CLAUDE.md T11 3.2). */
export function peekSave(store: SaveStore = saveStore): StoredSave {
  const text = store.peek();
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
  // A save the migration can lift is a save this build can open (CLAUDE.md T12 2.3).
  if (typeof file.stateVersion !== 'number' || !canOpenVersion(file.stateVersion)) {
    return { kind: 'stale', companyName, day };
  }
  return { kind: 'ready', companyName, day };
}

/** The game in the store, or the reason there is none. The same decoder the file load uses, so a
 *  save cannot be good in one place and bad in another. */
export function readStore(store: SaveStore = saveStore): ReturnType<typeof decodeSaveFile> {
  const text = store.read();
  if (text === null || text === '') return { state: null, note: 'Nothing saved yet.' };
  return decodeSaveFile(text);
}
