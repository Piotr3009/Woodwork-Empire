// Shared test driver. One place clicks events away, so no test file grows its own copy.

import { applyAction, createGame, tick } from '../src/engine/index';
import type {
  Enquiry,
  GameAction,
  GameEvent,
  GameState,
  Job,
  NewGameOptions,
  TaskInstance,
} from '../src/engine/index';

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

/** One step of a driven day: run the clock, and at 16:00 do what a player does and go home. */
function step(state: GameState, events: GameEvent[]): GameState {
  const next = clearEvents(tick(state, 60), events);
  if (next.clock.minute >= 480 && next.activeEvent === null && !next.owner.wentHome) {
    return clearEvents(applyAction(next, { type: 'END_DAY' }), events);
  }
  return next;
}

/** Plays to the start of the next day the way a player does: work, then End day at 16:00. */
export function nextDay(state: GameState, events: GameEvent[] = []): GameState {
  let next = clearEvents(state, events);
  const day = next.clock.day;
  let guard = 0;
  while (next.clock.day === day && !next.gameOver && guard < 200) {
    next = step(next, events);
    guard += 1;
  }
  return next;
}

/** Runs whole days, answering every event with its first choice. */
export function runDays(state: GameState, days: number): Run {
  const events: GameEvent[] = [];
  let next = clearEvents(state, events);
  const target = next.clock.day + days;
  let guard = 0;
  while (next.clock.day < target && !next.gameOver && guard < days * 40 + 200) {
    next = step(next, events);
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
    next = step(next, events);
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

/** Puts an exact enquiry on the board, so a test can work with round numbers. */
export function placeEnquiry(state: GameState, partial: Partial<Enquiry> = {}): Enquiry {
  const enquiry: Enquiry = {
    id: `enq-fixed-${state.enquiries.length + 1}`,
    templateId: 'garageShelves',
    name: 'Garage shelves',
    sizeMultiplier: 1,
    price: 400,
    finish: 'laminate',
    materialKind: 'sheet',
    deadlineDays: 15,
    express: false,
    bespokeMaterial: false,
    needsMeasure: false,
    createdDay: state.clock.day,
    expiresOnDay: state.clock.day + 2,
    lockReason: null,
    byHandAvailable: false,
    ...partial,
  };
  state.enquiries.push(enquiry);
  return enquiry;
}

/** Starts the named open task and runs the clock until it is done. */
export function doTask(state: GameState, kind: TaskInstance['kind']): GameState {
  const task = state.tasks.find((entry) => entry.kind === kind && !entry.done);
  if (!task) throw new Error(`no open task of kind ${kind}`);
  let next = applyAction(state, { type: 'START_TASK', taskId: task.id });
  if (next.owner.currentTaskId !== task.id) throw new Error(`could not start ${kind}`);
  let guard = 0;
  while (next.owner.currentTaskId === task.id && guard < 2000) {
    next = tick(next, 1);
    guard += 1;
  }
  return next;
}

/** The one job on the books, for tests that work with a single order. */
export function firstJob(state: GameState): Job {
  const job = state.jobs[0];
  if (!job) throw new Error('no job on the books');
  return job;
}

/** A desk, a laptop and a one off licence: the minimum to be allowed to draw. */
export function withLicence(state: GameState): GameState {
  let next = applyAction(state, { type: 'BUY_EQUIPMENT', specId: 'desk' });
  next = applyAction(next, { type: 'BUY_EQUIPMENT', specId: 'laptop' });
  return applyAction(next, { type: 'BUY_SOFTWARE', mode: 'oneOff' });
}
