// The event queue. Anything that needs a decision stops the clock (CLAUDE.md 6.2).
// This module owns the queue mechanics and the event bodies. Resolution lives in game.ts, which is
// the only module allowed to touch every other one.

import { makeId } from './rng';
import type { GameEvent, GameEventChoice, GameEventKind, GameState, JsonValue } from './types';

export interface EventDraft {
  kind: GameEventKind;
  title: string;
  body: string;
  choices?: GameEventChoice[];
  data?: Record<string, JsonValue>;
}

const OK_CHOICE: GameEventChoice[] = [{ id: 'ok', label: 'Right' }];

export function queueEvent(state: GameState, draft: EventDraft): GameEvent {
  const event: GameEvent = {
    id: makeId(state, 'event'),
    kind: draft.kind,
    title: draft.title,
    body: draft.body,
    choices: draft.choices ?? OK_CHOICE,
    data: draft.data ?? {},
    day: state.clock.day,
    minute: state.clock.minute,
  };
  state.eventQueue.push(event);
  return event;
}

/** Moves the next queued event into the open slot. The clock is paused while one is open. */
export function openNextEvent(state: GameState): void {
  if (state.activeEvent) return;
  const next = state.eventQueue.shift();
  state.activeEvent = next ?? null;
}

export function isPaused(state: GameState): boolean {
  return state.activeEvent !== null || state.gameOver !== null;
}
