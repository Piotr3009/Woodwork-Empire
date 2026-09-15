// A scripted player, so a whole month can be played the same way twice. It makes the decisions a
// careful owner would make: advance the jobs, get the material in, then stand at the bench.

import { DAY_END_MINUTE } from '../../src/engine/constants';
import { applyAction, helperOnDuty, startTaskCheck, tick } from '../../src/engine/index';
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
  // He has taken somebody on to do the unloading: he lets him do it (CLAUDE.md T11 3.4). The
  // button that sends the owner instead is still there and he simply does not press it.
  if (event.kind === 'deliveryArrived' && helperOnDuty(state) && ids.includes('later')) {
    return 'later';
  }
  // The scripted owner is a careful one: he picks the phone up (CLAUDE.md T4 3.3).
  for (const preferred of ['answer', 'unload', 'owner', 'storage', 'next', 'ok']) {
    if (ids.includes(preferred)) return preferred;
  }
  return ids[0] ?? 'ok';
}

/** Job work first, then the material, then the hall. Emails and bookkeeping wait. The interview
 *  he has already committed to comes before any of it: one he walked away from at five o'clock is
 *  the first thing he picks back up in the morning (CLAUDE.md T7 3.10). */
const TASK_ORDER: TaskInstance['kind'][] = [
  'hiring',
  'booting',
  'unload',
  'bagChange',
  'repair',
  'service',
  'fetchStorage',
  'clientCall',
  'emails',
  'siteMeasure',
  // The client will not have a drawing done until he has been sat down with, on a job of this
  // size (CLAUDE.md T7 3.11).
  'clientMeeting',
  'design',
  'materialOrder',
  'cleaning',
];

function nextTask(state: GameState): TaskInstance | null {
  for (const kind of TASK_ORDER) {
    // He does not reach for what the engine would refuse him: with a helper in the hall the
    // unloading, the bags and the cleaning are the helper's, and the script walks past them
    // (CLAUDE.md T11 3.4).
    const task = state.tasks.find(
      (entry) => entry.kind === kind && !entry.done && startTaskCheck(state, entry.id).ok,
    );
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
  /** Take this many poor joiners on instead of one, each with his own kit (CLAUDE.md T7 3.1). */
  joiners?: number;
  /** Saws to stand in the hall beyond the one in the day 1 kit. A machine serves one man at a
   *  time, so this is what says whether the crew cuts or queues (CLAUDE.md T7 3.1). */
  extraSaws?: number;
  /** Sheets to buy in advance on day 1. Jobs then try to draw from the rack. */
  stockSheets: number;
  /** The class of table saw to buy on day 1. Undefined takes the cheapest, the used one. */
  sawVariant?: string;
  /** The class of edgebander, extractor and compressor to buy on day 1. Undefined takes the day 1
   *  class: the hand bander, the used fan and the used compressor (CLAUDE.md T10 3.1, 3.2). */
  edgebanderVariant?: string;
  extractorVariant?: string;
  compressorVariant?: string;
  /** Take a helper on on day 1: the unloading, the bags and the cleaning become his and nobody
   *  else's (PIOTR, 14.09; CLAUDE.md T11 3.4). */
  hireHelper?: boolean;
  /** Anything beyond the day 1 list to buy on day 1: a spray booth, say (CLAUDE.md T11 3.7). */
  extraKit?: string[];
  /** The standing the company opens the month on, for work that is out of a new company's reach. */
  reputation?: number;
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

/** Six joiners and the saws to keep them cutting. One saw serves one man at a time, so the same
 *  crew behind one saw stands at it (CLAUDE.md T7 3.1). Very easy, because six men and their kit
 *  is a lot of money on day 1 and the month is about the queue, not the overdraft. */
export const SIX_JOINERS_TWO_SAWS: Policy = {
  maxOpenJobs: 6,
  buyKit: true,
  cleanAbove: 60,
  wanted: ['bookcase', 'garageShelves', 'tvUnit'],
  hireJoiner: true,
  joiners: 6,
  extraSaws: 1,
  stockSheets: 40,
};

export const SIX_JOINERS_ONE_SAW: Policy = {
  ...SIX_JOINERS_TWO_SAWS,
  extraSaws: 0,
};

/** Two joiners, a standard saw and a floor edgebander: 1,100 and 1,400 m3/h of demand the moment
 *  both of them are running, against the 1,660 a standard extractor allows and the 2,988 a pro one
 *  does (PIOTR's tables; CLAUDE.md T10 3.1). The compressor is the standard one, so the air is
 *  never the thing being measured. */
export const TWO_MEN_ONE_FAN: Policy = {
  maxOpenJobs: 3,
  buyKit: true,
  cleanAbove: 60,
  wanted: ['bookcase', 'garageShelves', 'tvUnit'],
  hireJoiner: true,
  joiners: 2,
  stockSheets: 40,
  sawVariant: 'standard',
  edgebanderVariant: 'standard',
  extractorVariant: 'standard',
  compressorVariant: 'standard',
};

/** The same month with a fan big enough for it. */
export const TWO_MEN_BIG_FAN: Policy = {
  ...TWO_MEN_ONE_FAN,
  extractorVariant: 'pro',
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

/** A month with somebody to take the unloading, the bags and the cleaning off the owner
 *  (PIOTR, 14.09; CLAUDE.md T11 3.4). */
export const WITH_HELPER: Policy = {
  maxOpenJobs: 2,
  buyKit: true,
  cleanAbove: 55,
  wanted: ['tvUnit', 'bookcase', 'garageShelves'],
  hireJoiner: false,
  hireHelper: true,
  stockSheets: 0,
};

/** A month that buys a booth and takes the sprayed wardrobe off the board. No dryer is bought, so
 *  the booth runs on wet air and the finish takes half as long again (CLAUDE.md T11 3.7). */
export const LACQUER_NO_DRYER: Policy = {
  maxOpenJobs: 1,
  buyKit: true,
  cleanAbove: 55,
  wanted: ['lacqueredWardrobe'],
  hireJoiner: false,
  stockSheets: 20,
  extraKit: ['sprayBooth'],
  reputation: 40,
};

/** The eleven machines of the engine's own day one list (`DAY_ONE_KIT` in constants.ts), in an
 *  order the prerequisites allow: the tool cabinet before the hand edgebander that lives in it,
 *  and the extraction before the machine that wants it (CLAUDE.md T7 3.6, T10 3.1, T11 3.6). */
export const DAY_ONE_BUY_ORDER = [
  'desk',
  'chair',
  'laptop',
  'tableSaw',
  'drill',
  'toolCabinet',
  'extractor',
  'compressor',
  'edgebander',
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

/** The class the script buys for this family: what the month asked for, or the day 1 one. */
function classFor(specId: string, policy: Policy): string | undefined {
  if (specId === 'tableSaw') return policy.sawVariant;
  if (specId === 'edgebander') return policy.edgebanderVariant ?? DAY_ONE_CLASS[specId];
  if (specId === 'extractor') return policy.extractorVariant;
  if (specId === 'compressor') return policy.compressorVariant;
  return DAY_ONE_CLASS[specId];
}

function buyKit(state: GameState, policy: Policy): GameState {
  let next = state;
  for (const specId of DAY_ONE_BUY_ORDER) {
    next = applyAction(next, {
      type: 'BUY_EQUIPMENT',
      specId,
      variantId: classFor(specId, policy),
    });
  }
  for (const specId of policy.extraKit ?? []) {
    next = applyAction(next, { type: 'BUY_EQUIPMENT', specId });
  }
  return next;
}

/** The licence is installed on a laptop, and the laptop comes off the lorry the morning after it
 *  is ordered: so the script buys it the day it has one to install it on (CLAUDE.md T9 3.1). */
function buyLicence(state: GameState): GameState {
  if (state.software.mode !== 'none') return state;
  if (!state.equipment.some((item) => item.specId === 'laptop')) return state;
  return applyAction(state, { type: 'BUY_SOFTWARE', mode: 'oneOff' });
}

/** What a joiner has to have before he can start (CLAUDE.md 9.3). */
export const JOINER_KIT = ['workbench', 'locker', 'canteenSeat', 'toolCabinet', 'handToolSet'];

function takeOnJoiner(state: GameState, policy: Policy): GameState {
  const wanted = policy.joiners ?? 1;
  if (state.workers.filter((worker) => worker.role === 'joiner').length >= wanted) return state;
  let next = state;
  // Extra saws first: a machine serves one man at a time, and a crew with one saw queues at it
  // (CLAUDE.md T7 3.1).
  for (let index = 0; index < (policy.extraSaws ?? 0); index += 1) {
    next = applyAction(next, {
      type: 'BUY_EQUIPMENT',
      specId: 'tableSaw',
      variantId: policy.sawVariant,
    });
  }
  for (let man = 0; man < wanted; man += 1) {
    for (const specId of JOINER_KIT) {
      next = applyAction(next, { type: 'BUY_EQUIPMENT', specId, variantId: DAY_ONE_CLASS[specId] });
    }
    next = applyAction(next, { type: 'HIRE', role: 'joiner', tier: 'poor' });
  }
  return next;
}

/** Works down the wanted list: the dearest template the workshop can make today. */
function takeWork(state: GameState, policy: Policy): GameState {
  const open = state.jobs.filter((job) => job.stage !== 'completed').length;
  if (open >= policy.maxOpenJobs) return state;
  for (const templateId of policy.wanted) {
    const pick = state.enquiries.find(
      (enquiry) =>
        enquiry.templateId === templateId &&
        enquiry.lockReason === null &&
        // A job the workshop cannot take is on the board to be read and never to be taken
        // (CLAUDE.md T10 3.7).
        !enquiry.unreachable,
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
  if (day === 1 && policy.reputation !== undefined) next.reputation = policy.reputation;
  if (policy.buyKit && day === 1) next = buyKit(next, policy);
  if (policy.buyKit) next = buyLicence(next);
  if (policy.hireJoiner && day === 1) next = takeOnJoiner(next, policy);
  // Somebody to take the unloading, the bags and the cleaning (CLAUDE.md T11 3.4).
  if (policy.hireHelper === true && day === 1) {
    next = applyAction(next, { type: 'HIRE', role: 'helper', tier: null });
  }
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
