// A scripted player, so a whole month can be played the same way twice. It makes the decisions a
// careful owner would make: advance the jobs, get the material in, then stand at the bench.

import { applyAction, tick } from '../../src/engine/index';
import type { GameState, TaskInstance } from '../../src/engine/index';

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
  'repairExtractor',
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
}

export const CAREFUL: Policy = {
  maxOpenJobs: 1,
  buyKit: true,
  cleanAbove: 55,
  wanted: ['tvUnit', 'bookcase', 'garageShelves'],
};

export const IDLE: Policy = { maxOpenJobs: 0, buyKit: false, cleanAbove: 101, wanted: [] };

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

/** Works down the wanted list: the dearest template the workshop can make today. */
function takeWork(state: GameState, policy: Policy): GameState {
  const open = state.jobs.filter((job) => job.stage !== 'completed').length;
  if (open >= policy.maxOpenJobs) return state;
  for (const templateId of policy.wanted) {
    const pick = state.enquiries.find(
      (enquiry) => enquiry.templateId === templateId && enquiry.lockReason === null,
    );
    if (pick) {
      return applyAction(state, { type: 'ACCEPT_ENQUIRY', enquiryId: pick.id, byHand: false });
    }
  }
  return state;
}

/** Plays one game day and stops when the next day has started, or the game is over. */
export function playDay(state: GameState, policy: Policy): GameState {
  let next = state;
  const day = next.clock.day;
  if (policy.buyKit && day === 1) next = buyKit(next);
  let guard = 0;
  while (next.clock.day === day && next.gameOver === null && guard < 400) {
    guard += 1;
    if (next.activeEvent) {
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
export function playUntilDay(state: GameState, targetDay: number, policy: Policy): GameState {
  let next = state;
  let guard = 0;
  while (next.clock.day < targetDay && next.gameOver === null && guard < targetDay * 3) {
    guard += 1;
    next = playDay(next, policy);
  }
  return next;
}
