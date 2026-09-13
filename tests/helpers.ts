// Shared test driver. One place clicks events away, so no test file grows its own copy.

import {
  applyAction,
  createGame,
  enduranceHoursFor,
  findSpec,
  isOvertime,
  runMinutes,
  tick,
} from '../src/engine/index';
import type {
  Enquiry,
  Equipment,
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
  showWhy: true,
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

/** Runs the clock, taking the dinner hour whenever the day offers it: the break is not a decision
 *  any test but the break's own is about. Anything else the day asks stops the run, the way it
 *  stops the player (CLAUDE.md T6 3.4). */
export function runClock(state: GameState, minutes: number): GameState {
  let next = state;
  let left = minutes;
  let guard = 0;
  while (left > 0 && guard < 200) {
    guard += 1;
    const result = runMinutes(next, left);
    next = result.state;
    left -= result.minutesRun;
    if (left <= 0) break;
    if (next.activeEvent?.kind !== 'breakTime') break;
    next = applyAction(next, { type: 'RESOLVE_EVENT', choiceId: 'take' });
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

/** One step of a driven day: run the clock, and once the owner has his day in, do what a player
 *  does and go home. The clock reads past the work by the length of the break, so the test driver
 *  asks the engine whether the work is done rather than reading the hands. */
function step(state: GameState, events: GameEvent[]): GameState {
  const next = clearEvents(tick(state, 60), events);
  if (isOvertime(next.clock.minute) && next.activeEvent === null && !next.owner.wentHome) {
    return clearEvents(applyAction(next, { type: 'END_DAY' }), events);
  }
  return next;
}

/** Plays to the start of the next day the way a player does: work, then home at five. */
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

/** Runs the clock, answering whatever the day throws up with its first choice, until the first
 *  job on the books has reached this stage. The client rings while the work goes on now, so a
 *  plain tick of the right number of minutes no longer finishes a job (CLAUDE.md T4 3.3). */
export function runToStage(state: GameState, stage: Job['stage'], most = 2000): GameState {
  let next = clearEvents(state);
  let guard = 0;
  while (next.jobs[0] !== undefined && next.jobs[0].stage !== stage && guard < most) {
    next = clearEvents(tick(next, 1));
    if (next.gameOver) break;
    guard += 1;
  }
  return next;
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
  'toolCabinet',
  'edgebander',
  'compressor',
  'extractor',
  'workbench',
  'sheetRack',
];

/** The day 1 shopping. The saw it buys is the used one at 1800, which is what the catalogue
 *  offers first; a test about the labour figures of CLAUDE.md 8.5 asks for the budget saw, whose
 *  factors are all 1.0 and which is therefore the baseline those figures describe. */
export function buyStartingKit(
  state: GameState,
  options: { sawVariant?: string } = {},
): GameState {
  let next = state;
  for (const specId of STARTING_KIT) {
    next = applyAction(next, {
      type: 'BUY_EQUIPMENT',
      specId,
      variantId: specId === 'tableSaw' ? options.sawVariant : undefined,
    });
  }
  return applyAction(next, { type: 'BUY_SOFTWARE', mode: 'oneOff' });
}

/** Stands a machine in the hall without paying for it or looking for a free tile, for tests that
 *  only need it to be there (CLAUDE.md T3 3.5 gave every item a variant). */
export function placeEquipment(
  state: GameState,
  specId: string,
  options: { variantId?: string; x?: number; y?: number; id?: string } = {},
): Equipment {
  const spec = findSpec(specId);
  if (!spec) throw new Error(`unknown equipment: ${specId}`);
  const variantId = options.variantId ?? spec.variants[0]?.id ?? 'standard';
  const variant = spec.variants.find((entry) => entry.id === variantId);
  const item: Equipment = {
    id: options.id ?? `kit-${specId}-${state.equipment.length + 1}`,
    specId,
    variantId,
    spriteKey: spec.spriteKey,
    anchorX: options.x ?? 0,
    anchorY: options.y ?? 0,
    minutesUsed: 0,
    bagFull: false,
    broken: false,
    lastServiceDay: state.clock.day,
    serviceHours: 0,
    enduranceHours: enduranceHoursFor(specId, variantId),
    hoursUsed: 0,
    purchasePrice: variant ? variant.price : spec.price,
  };
  state.equipment.push(item);
  return item;
}

/** Puts sheets on the rack, so a job pushed straight to the bench has material to work with. */
export function fillRack(state: GameState, sheets = 20): GameState {
  state.stock.sheets = sheets;
  return state;
}

/** Puts an exact enquiry on the board, so a test can work with round numbers. */
export function placeEnquiry(state: GameState, partial: Partial<Enquiry> = {}): Enquiry {
  const price = partial.price ?? 400;
  const enquiry: Enquiry = {
    id: `enq-fixed-${state.enquiries.length + 1}`,
    templateId: 'garageShelves',
    name: 'Garage shelves',
    sizeMultiplier: 1,
    price,
    basePrice: price,
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
    next = runClock(next, 1);
    guard += 1;
  }
  return next;
}

/** Answers every open email, the way an owner who cares about the rating would. */
export function doAllEmails(state: GameState): GameState {
  let next = state;
  let guard = 0;
  while (next.tasks.some((task) => task.kind === 'emails' && !task.done) && guard < 20) {
    next = doTask(next, 'emails');
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
