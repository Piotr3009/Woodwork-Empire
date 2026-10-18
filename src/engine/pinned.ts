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
// that long (`whilePinned`), and a question that comes through `pinned` is worked out once a page
// and handed back for the rest of it. One page asks `drawnPlaces` once a machine and
// `standingModuleMasks` thousands of times: pinned, each is one.
//
// The pin never outlives the call, on purpose. Between two pages the state the page holds is a
// fresh object every minute (`clone` in `runMinutes`) and for every action (`clone` in
// `applyAction`), but the tests write into the object the page holds (`Object.assign` on
// `currentState()`), and nothing is allowed to go stale under them or under anyone else: what is
// kept for a page is thrown away with it. The engine's own minute, on the clone it writes into, is
// never pinned as a whole: only the questions it asks that change nothing pin it, each for its own
// length (v104), so everything the minute writes is read afresh by the next question.

import type { GameState } from './types';

let pinnedState: GameState | null = null;
let answers = new Map<string, unknown>();

/** The pin set by hand, as the tests set it: the same object again keeps what was worked out, a
 *  new one (or none) starts afresh. The game itself pins only through `whilePinned`. */
export function pinState(state: GameState | null): void {
  if (state === pinnedState) return;
  pinnedState = state;
  answers = new Map<string, unknown>();
}

/** Runs `run` with this state pinned, and puts back whatever was pinned before when it is over
 *  (v104). For a call that changes nothing of the state from its first line to its last: the
 *  page's writing and its frame, and the engine's own questions of the hall that are asked many
 *  times a minute, the stage plan of a job, the crew at each family and the day plan, which asked
 *  which modules stand tens of times each (measured on Piotr's save of 18.10, seventeen lines and
 *  251 pieces of kit: half the engine's minute). Inside a call that is already pinned on the same
 *  state it only runs, so the outer call's answers are shared. */
export function whilePinned<T>(state: GameState, run: () => T): T {
  if (state === pinnedState) return run();
  const outerState = pinnedState;
  const outerAnswers = answers;
  pinnedState = state;
  answers = new Map<string, unknown>();
  try {
    return run();
  } finally {
    pinnedState = outerState;
    answers = outerAnswers;
  }
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

/** An answer that is worth working out only when it is kept: the pinned state's, worked out once
 *  and kept, and null for any state that is not pinned, whose caller asks its question the long
 *  way instead. A map of the whole floor is dearer than one look at one cell, and cheap against
 *  the thousands of looks one page takes (v104). */
export function keptWhilePinned<T>(state: GameState, key: string, compute: () => T): T | null {
  return state === pinnedState ? pinned(state, key, compute) : null;
}
