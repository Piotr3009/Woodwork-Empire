// A scripted player, so a whole month can be played the same way twice. It makes the decisions a
// careful owner would make: advance the jobs, get the material in, then stand at the bench.

import { DAY_END_MINUTE } from '../../src/engine/constants';
import { applyAction, tick } from '../../src/engine/index';
import type { GameEvent, GameState, TaskInstance } from '../../src/engine/index';

/** What the script answers when the clock stops for a decision. */
export function answer(state: GameState, policy?: Policy): string {
  const event = state.activeEvent;
  if (!event) return 'ok';
  const ids = event.choices.map((choice) => choice.id);
  // The two questions the day puts. The script takes its dinner and goes home at five unless the
  // month it is playing says otherwise (CLAUDE.md T6 3.4).
  if (event.kind === 'breakTime') {
    return policy?.skipBreakOn?.includes(state.clock.day) === true ? 'skip' : 'take';
  }
  if (event.kind === 'goingHome') {
    return policy?.overtimeOn?.includes(state.clock.day) === true ? 'overtime' : 'home';
  }
  // The scripted owner is a careful one: he picks the phone up (CLAUDE.md T4 3.3).
  for (const preferred of ['answer', 'unload', 'owner', 'storage', 'next', 'ok']) {
    if (ids.includes(preferred)) return preferred;
  }
  return ids[0] ?? 'ok';
}

/** Job work first, then the material, then the hall. Emails and bookkeeping wait. */
const TASK_ORDER: TaskInstance['kind'][] = [
  'unload',
  'bagChange',
  'repair',
  'service',
  'fetchStorage',
  'clientCall',
  'emails',
  'siteMeasure',
  'design',
  'materialOrder',
  'cleaning',
];

function nextTask(state: GameState): TaskInstance | null {
  for (const kind of TASK_ORDER) {
    const task = state.tasks.find((entry) => entry.kind === kind && !entry.done);
    if (task) return task;
  }
  return null;
}

export interface Policy {
  /** Take work off the board while fewer than this many jobs are open. */
  maxOpenJobs: number;
  /** Buy the day 1 kit. */
  buyKit: boolean;
  /** Clean the hall once the dust is over this. */
  cleanAbove: number;
  /** Templates the script will take, dearest first. Nothing else is touched. */
  wanted: string[];
  /** Take one poor joiner on, with the kit he needs, on day 1. */
  hireJoiner: boolean;
  /** Sheets to buy in advance on day 1. Jobs then try to draw from the rack. */
  stockSheets: number;
  /** The class of table saw to buy on day 1. Undefined takes the cheapest, the used one. */
  sawVariant?: string;
  /** Days the owner works through his dinner (CLAUDE.md T6 3.4). */
  skipBreakOn?: number[];
  /** Days he stays on after five, and how long for. */
  overtimeOn?: number[];
  overtimeMinutes?: number;
}

export const CAREFUL: Policy = {
  maxOpenJobs: 1,
  buyKit: true,
  cleanAbove: 55,
  wanted: ['tvUnit', 'bookcase', 'garageShelves'],
  hireJoiner: false,
  stockSheets: 0,
};

export const IDLE: Policy = {
  maxOpenJobs: 0,
  buyKit: false,
  cleanAbove: 101,
  wanted: [],
  hireJoiner: false,
  stockSheets: 0,
};

/** One joiner on the books and more work on the books than he can be fed: the crew runs the rack
 *  dry (CLAUDE.md T2 4). Four jobs, not the two of Turns 2 to 4: a scripted owner who does the
 *  material order the moment it appears keeps two jobs supplied without trying, so two stopped
 *  proving anything. Taking on more than the rack can carry is what a short handed workshop
 *  actually does, and it is the rule that is turned here, not the size of the pallet. */
export const SHORT_HANDED: Policy = {
  maxOpenJobs: 4,
  buyKit: true,
  cleanAbove: 60,
  wanted: ['bookcase', 'garageShelves'],
  hireJoiner: true,
  stockSheets: 8,
};

/** A month that spends the money on the best saw there is, to see what it buys (CLAUDE.md T3 4). */
export const BIG_SAW: Policy = {
  maxOpenJobs: 1,
  buyKit: true,
  cleanAbove: 55,
  wanted: ['tvUnit', 'bookcase', 'garageShelves'],
  hireJoiner: false,
  stockSheets: 0,
  sawVariant: 'industrial',
};

export const DAY_ONE_KIT = [
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

/** The class of each family the script buys: the budget ones, which are the Turn 1 items those
 *  families hold as a class (CLAUDE.md T7 3.6). The saw is the policy's, or the used one. */
export const DAY_ONE_CLASS: Record<string, string> = {
  workbench: 'budget',
  sheetRack: 'budget',
  edgebander: 'budget',
};

function buyKit(state: GameState, policy: Policy): GameState {
  let next = state;
  for (const specId of DAY_ONE_KIT) {
    next = applyAction(next, {
      type: 'BUY_EQUIPMENT',
      specId,
      variantId: specId === 'tableSaw' ? policy.sawVariant : DAY_ONE_CLASS[specId],
    });
  }
  return applyAction(next, { type: 'BUY_SOFTWARE', mode: 'oneOff' });
}

/** What a joiner has to have before he can start (CLAUDE.md 9.3). */
export const JOINER_KIT = ['workbench', 'locker', 'canteenSeat', 'toolCabinet', 'handToolSet'];

function takeOnJoiner(state: GameState): GameState {
  if (state.workers.some((worker) => worker.role === 'joiner')) return state;
  let next = state;
  for (const specId of JOINER_KIT) {
    next = applyAction(next, { type: 'BUY_EQUIPMENT', specId, variantId: DAY_ONE_CLASS[specId] });
  }
  return applyAction(next, { type: 'HIRE', role: 'joiner', tier: 'poor' });
}

/** Works down the wanted list: the dearest template the workshop can make today. */
function takeWork(state: GameState, policy: Policy): GameState {
  const open = state.jobs.filter((job) => job.stage !== 'completed').length;
  if (open >= policy.maxOpenJobs) return state;
  for (const templateId of policy.wanted) {
    const pick = state.enquiries.find(
      (enquiry) => enquiry.templateId === templateId && enquiry.lockReason === null,
    );
    if (pick) {
      const taken = applyAction(state, {
        type: 'ACCEPT_ENQUIRY',
        enquiryId: pick.id,
        byHand: false,
      });
      if (policy.stockSheets <= 0) return taken;
      const job = taken.jobs[taken.jobs.length - 1];
      if (!job) return taken;
      return applyAction(taken, { type: 'SET_MATERIAL_MODE', jobId: job.id, mode: 'stock' });
    }
  }
  return state;
}

export interface PlayOptions {
  /** Game minutes to run between decisions. One of them lets a scenario watch every minute. */
  step?: number;
  /** Called with every state the day goes through, for a scenario that has to look inside it. */
  watch?: (state: GameState) => void;
}

/** Plays one game day and stops when the next day has started, or the game is over. Every event
 *  it answered is pushed into `seen`, so a scenario can say what the month threw at it. */
export function playDay(
  state: GameState,
  policy: Policy,
  seen: GameEvent[] = [],
  options: PlayOptions = {},
): GameState {
  let next = state;
  const day = next.clock.day;
  if (policy.buyKit && day === 1) next = buyKit(next, policy);
  if (policy.hireJoiner && day === 1) next = takeOnJoiner(next);
  if (policy.stockSheets > 0 && day === 1) {
    next = applyAction(next, { type: 'BUY_STOCK', sheets: policy.stockSheets });
  }
  let guard = 0;
  // A minute at a time takes a whole day of iterations, so the guard is sized to the step.
  const rounds = Math.ceil((400 * 30) / (options.step ?? 30));
  while (next.clock.day === day && next.gameOver === null && guard < rounds) {
    guard += 1;
    if (next.activeEvent) {
      seen.push(next.activeEvent);
      next = applyAction(next, { type: 'RESOLVE_EVENT', choiceId: answer(next, policy) });
      continue;
    }
    next = takeWork(next, policy);
    if (next.owner.present && !next.owner.wentHome && next.owner.currentTaskId === null) {
      const onBench = next.jobs.some((job) => job.assignedTo === 'owner');
      if (next.dust > policy.cleanAbove) {
        next = applyAction(next, { type: 'START_CLEANING' });
      } else {
        const task = nextTask(next);
        if (task) {
          next = applyAction(next, { type: 'START_TASK', taskId: task.id });
        } else if (!onBench) {
          next = applyAction(next, { type: 'WORK_HERE', jobId: null });
        }
      }
    }
    const step = options.step ?? 30;
    options.watch?.(next);
    next = tick(next, step);
    // Home once the day is in, unless the month says he stays on, and then home when the hours
    // it asked for are behind him too (CLAUDE.md T6 3.4).
    const stayUntil =
      policy.overtimeOn?.includes(day) === true
        ? DAY_END_MINUTE + (policy.overtimeMinutes ?? 60)
        : DAY_END_MINUTE;
    if (next.clock.day === day && next.clock.minute >= stayUntil && next.activeEvent === null) {
      options.watch?.(next);
      next = applyAction(next, { type: 'END_DAY' });
      next = tick(next, step);
    }
  }
  return next;
}

/** Plays calendar days, weekends included, until the given day has started. */
export function playUntilDay(
  state: GameState,
  targetDay: number,
  policy: Policy,
  seen: GameEvent[] = [],
  options: PlayOptions = {},
): GameState {
  let next = state;
  let guard = 0;
  while (next.clock.day < targetDay && next.gameOver === null && guard < targetDay * 3) {
    guard += 1;
    next = playDay(next, policy, seen, options);
  }
  return next;
}
