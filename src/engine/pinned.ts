/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// The one state the page is drawn from, and what has been worked out of it (v97).
//
// The page and the hall's sound ask the same questions of the same state over and over: where
// every man is drawn this minute (`drawnPlaces`) once a machine when the hall is painted and sixty
// times a second for the sound, and which modules of each line stand (`standingModuleMasks`) tens
// of thousands of times a second through the stage plans. Measured on v96 in Chromium on an 800 m²
// hall with a line: `standingModuleMasks` 28,663 calls a second at 1x and 61,171 at 10x, the
// biggest single function of the profile, and the sound alone as much processor as the whole
// painting of the hall. None of it changed between two minutes of the clock.
//
// Nothing of the state changes while one page is written or one frame's sound is read, so an
// answer worked out at the start of either holds to its end. The page pins its state for exactly
// that long (`pinState` at the start, `pinState(null)` in a `finally` at the end), and a question
// that comes through `pinned` is worked out once a page and handed back for the rest of it. One
// page asks `drawnPlaces` once a machine and `standingModuleMasks` thousands of times: pinned, each
// is one.
//
// The pin never outlives the call, on purpose. Between two pages the state the page holds is a
// fresh object every minute (`clone` in `runMinutes`) and for every action (`clone` in
// `applyAction`), but the tests write into the object the page holds (`Object.assign` on
// `currentState()`), and nothing is allowed to go stale under them or under anyone else: what is
// kept for a page is thrown away with it. The engine's own minute, on the clone it writes into, is
// never pinned and gets every answer afresh, as it always did.

import type { GameState } from './types';

let pinnedState: GameState | null = null;
let answers = new Map<string, unknown>();

/** The page says which state it is drawing for the call in hand, and says `null` at its end: the
 *  same object again keeps what was worked out, a new one (or none) starts afresh. */
export function pinState(state: GameState | null): void {
  if (state === pinnedState) return;
  pinnedState = state;
  answers = new Map<string, unknown>();
}

/** An answer about the state: worked out and kept while this very object is pinned, worked out
 *  afresh for any other. The key names the question; `compute` is the question itself. */
export function pinned<T>(state: GameState, key: string, compute: () => T): T {
  if (state !== pinnedState) return compute();
  if (answers.has(key)) return answers.get(key) as T;
  const answer = compute();
  answers.set(key, answer);
  return answer;
}
