// The engine entry points. `tick` and `applyAction` clone the incoming state and return the clone:
// callers never see their input mutated. Every other engine module mutates the state it is given.

import {
  DIFFICULTIES,
  MAX_MINUTES_PER_DAY,
  MINUTES_PER_WORKING_DAY,
  OVERDRAFT_LIMIT,
  REPUTATION_START,
  STATE_VERSION,
} from './constants';
import { isDayExhausted, isWorkingDay } from './clock';
import { isPaused, openNextEvent, queueEvent } from './events';
import type { Difficulty, GameAction, GameState, PeriodTotals, Speed } from './types';

export interface NewGameOptions {
  seed: number;
  difficulty: Difficulty;
  playerName: string;
  companyName: string;
}

function emptyTotals(): PeriodTotals {
  return { income: 0, costs: 0, byCategory: {} };
}

export function clone(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

export function difficultySpec(difficulty: Difficulty) {
  const spec = DIFFICULTIES.find((entry) => entry.id === difficulty);
  if (!spec) throw new Error(`unknown difficulty: ${difficulty}`);
  return spec;
}

export function createGame(options: NewGameOptions): GameState {
  const spec = difficultySpec(options.difficulty);
  const state: GameState = {
    version: STATE_VERSION,
    seed: options.seed,
    rng: options.seed,
    nextId: 1,
    difficulty: options.difficulty,
    playerName: options.playerName,
    companyName: options.companyName,
    clock: { day: 1, minute: 0 },
    speed: 0,
    cash: spec.startingCash,
    reputation: REPUTATION_START,
    dust: 0,
    unit: {
      areaM2: spec.areaM2,
      widthTiles: spec.widthTiles,
      depthTiles: spec.depthTiles,
      rentMonthly: spec.rentMonthly,
      ratesMonthly: spec.ratesMonthly,
      benchSlots: spec.benchSlots,
      sheetCapacity: spec.sheetCapacity,
    },
    owner: {
      present: true,
      minutesByCategory: { admin: 0, design: 0, workshop: 0 },
      minutesWorked: 0,
      overtimeHours: 0,
      fatigue: 0,
      wentHome: false,
      currentTaskId: null,
      productionJobId: null,
      sickDaysRemaining: 0,
      sickStartDay: null,
      stayHome: false,
    },
    software: { mode: 'none', tier: 'basic', jobsRemaining: 0 },
    stock: { sheets: 0, capacity: spec.sheetCapacity, tempStorageSheets: 0 },
    equipment: [],
    workers: [],
    enquiries: [],
    jobs: [],
    tasks: [],
    deliveries: [],
    finance: {
      overdraftLimit: OVERDRAFT_LIMIT,
      arrearsAmount: 0,
      arrearsMonths: 0,
      firstArrearsDay: null,
      day: emptyTotals(),
      week: emptyTotals(),
      month: emptyTotals(),
    },
    ledger: [],
    eventQueue: [],
    activeEvent: null,
    dayStats: { jobsAdvanced: [], jobsCompleted: [], productionMinutes: 0, dustAtStart: 0 },
    gameOver: null,
  };
  startDay(state);
  openNextEvent(state);
  return state;
}

/** True while the owner is on a task or standing at a machine. */
export function ownerIsWorking(state: GameState): boolean {
  return state.owner.currentTaskId !== null || state.owner.productionJobId !== null;
}

function shouldFinishDay(state: GameState): boolean {
  if (isDayExhausted(state.clock.minute)) return true;
  if (state.clock.minute < MINUTES_PER_WORKING_DAY) return false;
  if (!state.owner.present || state.owner.wentHome) return true;
  return !ownerIsWorking(state);
}

/** Resets everything that is scoped to one day and charges what the new day owes. */
function startDay(state: GameState): void {
  const owner = state.owner;
  owner.minutesByCategory = { admin: 0, design: 0, workshop: 0 };
  owner.minutesWorked = 0;
  owner.overtimeHours = 0;
  owner.wentHome = false;
  owner.currentTaskId = null;
  owner.productionJobId = null;
  owner.present = true;
  owner.stayHome = false;
  state.finance.day = emptyTotals();
  state.dayStats = {
    jobsAdvanced: [],
    jobsCompleted: [],
    productionMinutes: 0,
    dustAtStart: state.dust,
  };
}

/** Ends the working day and opens the summary. The player clicks on to the next day. */
function finishDay(state: GameState): void {
  state.owner.wentHome = true;
  queueEvent(state, {
    kind: 'dayEnd',
    title: `End of day ${state.clock.day}`,
    body: 'The day is over.',
    choices: [{ id: 'next', label: 'Next day' }],
  });
}

/** Moves to the next working day, walking over the weekend days on the way. */
function advanceToNextDay(state: GameState): void {
  let day = state.clock.day + 1;
  const skipped: number[] = [];
  while (!isWorkingDay(day)) {
    skipped.push(day);
    day += 1;
  }
  state.clock.day = day;
  state.clock.minute = 0;
  if (skipped.length > 0) {
    queueEvent(state, {
      kind: 'weekend',
      title: 'Weekend',
      body: `${skipped.length} days off. Rent and rates still ran.`,
      choices: [{ id: 'ok', label: 'Monday then' }],
      data: { days: skipped.length },
    });
  }
  startDay(state);
}

function advanceMinute(state: GameState): void {
  state.clock.minute += 1;
  if (shouldFinishDay(state)) finishDay(state);
  openNextEvent(state);
}

/** One tick is one game minute (CLAUDE.md 4). Minutes left over when an event opens are dropped:
 *  the UI recomputes them from elapsed real time on the next frame. */
export function tick(state: GameState, minutes: number): GameState {
  const next = clone(state);
  for (let i = 0; i < minutes; i += 1) {
    if (isPaused(next)) break;
    advanceMinute(next);
  }
  return next;
}

function resolveEvent(state: GameState, choiceId: string): void {
  const event = state.activeEvent;
  if (!event) return;
  state.activeEvent = null;
  switch (event.kind) {
    case 'dayEnd':
      advanceToNextDay(state);
      break;
    default:
      break;
  }
  void choiceId;
  openNextEvent(state);
}

export function applyAction(state: GameState, action: GameAction): GameState {
  const next = clone(state);
  switch (action.type) {
    case 'SET_SPEED':
      next.speed = action.speed as Speed;
      break;
    case 'END_DAY':
      if (next.clock.minute >= MINUTES_PER_WORKING_DAY) {
        finishDay(next);
      } else {
        // Going home early counts as absence for the rest of the day (CLAUDE.md 7.2).
        next.owner.wentHome = true;
        next.owner.currentTaskId = null;
        next.owner.productionJobId = null;
      }
      break;
    case 'STAY_HOME':
      next.owner.present = false;
      next.owner.stayHome = true;
      next.owner.currentTaskId = null;
      next.owner.productionJobId = null;
      break;
    case 'RESOLVE_EVENT':
      resolveEvent(next, action.choiceId);
      break;
    default:
      break;
  }
  openNextEvent(next);
  return next;
}

export const MAX_DAY_MINUTES = MAX_MINUTES_PER_DAY;
