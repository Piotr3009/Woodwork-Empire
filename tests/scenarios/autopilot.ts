// A scripted player, so a whole month can be played the same way twice. It makes the decisions a
// careful owner would make: advance the jobs, get the material in, then stand at the bench.

import { applyAction, tick } from '../../src/engine/index';
import type { GameEvent, GameState, TaskInstance } from '../../src/engine/index';

/** What the script answers when the clock stops for a decision. */
export function answer(state: GameState): string {
  const event = state.activeEvent;
  if (!event) return 'ok';
  const ids = event.choices.map((choice) => choice.id);
  for (const preferred of ['unload', 'owner', 'storage', 'next', 'ok']) {
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

/** One joiner on the books and two jobs on the go: the crew runs the rack dry (CLAUDE.md T2 4). */
export const SHORT_HANDED: Policy = {
  maxOpenJobs: 2,
  buyKit: true,
  cleanAbove: 60,
  wanted: ['bookcase', 'garageShelves'],
  hireJoiner: true,
  // Two jobs drawing off one small rack is how a workshop runs itself dry. Eight sheets, not the
  // twelve of Turn 2: a small job is one email now, so the owner reaches the bench sooner and
  // twelve sheets lasted him the month (CLAUDE.md T3 3.2).
  stockSheets: 8,
};

export const DAY_ONE_KIT = [
  'desk',
  'chair',
  'laptop',
  'tableSaw',
  'drill',
  'edgebander',
  'compressor',
  'extractor',
  'workbench',
  'sheetRack',
];

function buyKit(state: GameState): GameState {
  let next = state;
  for (const specId of DAY_ONE_KIT) {
    next = applyAction(next, { type: 'BUY_EQUIPMENT', specId });
  }
  return applyAction(next, { type: 'BUY_SOFTWARE', mode: 'oneOff' });
}

/** What a joiner has to have before he can start (CLAUDE.md 9.3). */
export const JOINER_KIT = ['workbench', 'locker', 'canteenSeat', 'handToolSet'];

function takeOnJoiner(state: GameState): GameState {
  if (state.workers.some((worker) => worker.role === 'joiner')) return state;
  let next = state;
  for (const specId of JOINER_KIT) {
    next = applyAction(next, { type: 'BUY_EQUIPMENT', specId });
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

/** Plays one game day and stops when the next day has started, or the game is over. Every event
 *  it answered is pushed into `seen`, so a scenario can say what the month threw at it. */
export function playDay(state: GameState, policy: Policy, seen: GameEvent[] = []): GameState {
  let next = state;
  const day = next.clock.day;
  if (policy.buyKit && day === 1) next = buyKit(next);
  if (policy.hireJoiner && day === 1) next = takeOnJoiner(next);
  if (policy.stockSheets > 0 && day === 1) {
    next = applyAction(next, { type: 'BUY_STOCK', sheets: policy.stockSheets });
  }
  let guard = 0;
  while (next.clock.day === day && next.gameOver === null && guard < 400) {
    guard += 1;
    if (next.activeEvent) {
      seen.push(next.activeEvent);
      next = applyAction(next, { type: 'RESOLVE_EVENT', choiceId: answer(next) });
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
    next = tick(next, 30);
    if (next.clock.day === day && next.clock.minute >= 480 && next.activeEvent === null) {
      // Nothing left worth the overtime: go home.
      next = applyAction(next, { type: 'END_DAY' });
      next = tick(next, 30);
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
): GameState {
  let next = state;
  let guard = 0;
  while (next.clock.day < targetDay && next.gameOver === null && guard < targetDay * 3) {
    guard += 1;
    next = playDay(next, policy, seen);
  }
  return next;
}
