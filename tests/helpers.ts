// Shared test driver. One place clicks events away, so no test file grows its own copy.

import { applyAction, createGame, tick } from '../src/engine/index';
import type { GameAction, GameEvent, GameState, NewGameOptions } from '../src/engine/index';

export const DEFAULT_OPTIONS: NewGameOptions = {
  seed: 20260911,
  difficulty: 'easy',
  playerName: 'Piotr',
  companyName: 'Woodwork Empire',
};

export function newGame(options: Partial<NewGameOptions> = {}): GameState {
  return createGame({ ...DEFAULT_OPTIONS, ...options });
}

export interface Run {
  state: GameState;
  events: GameEvent[];
}

/** Clicks the first choice of every open event and keeps the ones it saw. */
export function clearEvents(state: GameState, seen: GameEvent[] = []): GameState {
  let next = state;
  let guard = 0;
  while (next.activeEvent && guard < 500) {
    seen.push(next.activeEvent);
    const choice = next.activeEvent.choices[0];
    next = applyAction(next, { type: 'RESOLVE_EVENT', choiceId: choice ? choice.id : 'ok' });
    guard += 1;
  }
  return next;
}

/** Answers an open event with a named choice. */
export function choose(state: GameState, choiceId: string): GameState {
  return applyAction(state, { type: 'RESOLVE_EVENT', choiceId });
}

export function act(state: GameState, action: GameAction): GameState {
  return applyAction(state, action);
}

/** Runs whole days, answering every event with its first choice. */
export function runDays(state: GameState, days: number): Run {
  const events: GameEvent[] = [];
  let next = clearEvents(state, events);
  const target = next.clock.day + days;
  let guard = 0;
  while (next.clock.day < target && !next.gameOver && guard < days * 40 + 200) {
    next = clearEvents(tick(next, 60), events);
    guard += 1;
  }
  return { state: next, events };
}

/** Runs until the given absolute day starts, or the game ends. */
export function runToDay(state: GameState, day: number): Run {
  const events: GameEvent[] = [];
  let next = clearEvents(state, events);
  let guard = 0;
  while (next.clock.day < day && !next.gameOver && guard < 20000) {
    next = clearEvents(tick(next, 60), events);
    guard += 1;
  }
  return { state: next, events };
}

export function eventsOfKind(events: GameEvent[], kind: GameEvent['kind']): GameEvent[] {
  return events.filter((event) => event.kind === kind);
}

/** The day 1 shopping list from CLAUDE.md 15.3. */
export const STARTING_KIT = [
  'desk',
  'chair',
  'laptop',
  'tableSaw',
  'drill',
  'edgebander',
  'compressor',
  'extractor',
  'workbench',
];

export function buyStartingKit(state: GameState): GameState {
  let next = state;
  for (const specId of STARTING_KIT) {
    next = applyAction(next, { type: 'BUY_EQUIPMENT', specId });
  }
  return applyAction(next, { type: 'BUY_SOFTWARE', mode: 'oneOff' });
}
