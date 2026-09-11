// Task definitions, who can take them off the owner, their minute curves, and the runner that
// spends the owner's minutes on the one he started.

import {
  BAG_CHANGE_MINUTES,
  BOOKKEEPING_MINUTES,
  CALLS_ABOVE_BREAKS,
  CALLS_PRICE_BREAKS,
  CLEANING_MINUTES,
  CLERK_ORDERS_PER_DAY,
  CLIENT_CALL_BASE_MINUTES,
  CLIENT_CALL_MINUTES_CAP,
  CLIENT_CALL_MINUTES_PER_1000,
  CLIENT_CALL_PRICE_STEP,
  DAILY_ORDERING_MINUTES,
  EMAILS_MINUTES,
  EXTRACTOR_REPAIR_MINUTES,
  FETCH_STORAGE_MINUTES,
  MATERIAL_ORDER_MINUTES_HIGH,
  MATERIAL_ORDER_MINUTES_LOW,
  MATERIAL_ORDER_PRICE_HIGH,
  MATERIAL_ORDER_PRICE_LOW,
  SITE_MEASURE_MINUTES,
  SOFTWARE_DESIGN_FACTOR,
  STAFF_MANAGEMENT_MINUTES_PER_JOINER,
  UNLOAD_BASE_MINUTES,
} from './constants';
import { findSpec } from './machines';
import { makeId } from './rng';
import type {
  GameState,
  ProductTemplate,
  SoftwareTier,
  TaskCategory,
  TaskInstance,
  TaskKind,
  WorkerRole,
} from './types';

/** Which bar segment a task fills, who may be asked to do it, and who takes it off the owner
 *  without being asked. A joiner can always be sent, but it costs him bench minutes, so he never
 *  takes anything automatically (CLAUDE.md 8.10, 9.6). */
interface TaskDefinition {
  category: TaskCategory;
  eligibleRoles: WorkerRole[];
  autoRoles: WorkerRole[];
}

const TASK_DEFINITIONS: Record<TaskKind, TaskDefinition> = {
  emails: { category: 'admin', eligibleRoles: ['officeAdmin'], autoRoles: ['officeAdmin'] },
  bookkeeping: { category: 'admin', eligibleRoles: ['officeAdmin'], autoRoles: ['officeAdmin'] },
  dailyOrdering: {
    category: 'admin',
    eligibleRoles: ['purchasingClerk', 'officeAdmin'],
    autoRoles: ['purchasingClerk', 'officeAdmin'],
  },
  staffManagement: { category: 'admin', eligibleRoles: [], autoRoles: [] },
  clientCall: { category: 'admin', eligibleRoles: ['salesman'], autoRoles: ['salesman'] },
  design: { category: 'design', eligibleRoles: [], autoRoles: [] },
  materialOrder: {
    category: 'admin',
    eligibleRoles: ['purchasingClerk'],
    autoRoles: ['purchasingClerk'],
  },
  siteMeasure: { category: 'admin', eligibleRoles: [], autoRoles: [] },
  unload: { category: 'workshop', eligibleRoles: ['joiner', 'helper'], autoRoles: ['helper'] },
  bagChange: { category: 'workshop', eligibleRoles: ['joiner', 'helper'], autoRoles: ['helper'] },
  cleaning: { category: 'workshop', eligibleRoles: ['helper'], autoRoles: ['helper'] },
  fetchStorage: {
    category: 'workshop',
    eligibleRoles: ['joiner', 'helper'],
    autoRoles: ['helper'],
  },
  repairExtractor: { category: 'workshop', eligibleRoles: ['joiner'], autoRoles: [] },
};

/** Float guard, not a game number: work this small is finished work. */
export const WORK_EPSILON = 1e-9;

export function taskCategory(kind: TaskKind): TaskCategory {
  return TASK_DEFINITIONS[kind].category;
}

// ---------------------------------------------------------------------------
// Minute curves
// ---------------------------------------------------------------------------

/** 2 calls up to 1000, 3 up to 3000, 4 above (CLAUDE.md 8.10). */
export function callsForPrice(price: number): number {
  for (const [max, calls] of CALLS_PRICE_BREAKS) {
    if (price <= max) return calls;
  }
  return CALLS_ABOVE_BREAKS;
}

/** 15 minutes a call up to 1000, then 15 more per further 1000, capped at 200 [TUNE curve]. */
export function clientCallMinutes(price: number): number {
  const steps = Math.max(0, Math.ceil(price / CLIENT_CALL_PRICE_STEP) - 1);
  return Math.min(
    CLIENT_CALL_MINUTES_CAP,
    CLIENT_CALL_BASE_MINUTES + steps * CLIENT_CALL_MINUTES_PER_1000,
  );
}

/** 30 minutes up to a price of 10000, 200 at 100000, linear between (CLAUDE.md 8.10). */
export function materialOrderMinutes(price: number): number {
  if (price <= MATERIAL_ORDER_PRICE_LOW) return MATERIAL_ORDER_MINUTES_LOW;
  if (price >= MATERIAL_ORDER_PRICE_HIGH) return MATERIAL_ORDER_MINUTES_HIGH;
  const span = MATERIAL_ORDER_PRICE_HIGH - MATERIAL_ORDER_PRICE_LOW;
  const rise = MATERIAL_ORDER_MINUTES_HIGH - MATERIAL_ORDER_MINUTES_LOW;
  return MATERIAL_ORDER_MINUTES_LOW + ((price - MATERIAL_ORDER_PRICE_LOW) / span) * rise;
}

/** A one off licence covers 30 jobs, a subscription covers everything (CLAUDE.md 9.2). */
export function softwareActive(state: GameState): boolean {
  if (state.software.mode === 'subscription') return true;
  return state.software.mode === 'oneOff' && state.software.jobsRemaining > 0;
}

/** Template minutes scale with the size, and the software tier divides them. */
export function designMinutes(
  template: ProductTemplate,
  sizeMultiplier: number,
  tier: SoftwareTier,
): number {
  return Math.round(template.designMinutes * sizeMultiplier * SOFTWARE_DESIGN_FACTOR[tier]);
}

/** Unloading, halved by a forklift and cut to a fifth by the better one (CLAUDE.md 8.10). */
export function unloadMinutes(state: GameState): number {
  let factor = 1;
  for (const item of state.equipment) {
    const spec = findSpec(item.specId);
    if (spec && spec.unloadFactor < factor) factor = spec.unloadFactor;
  }
  return Math.round(UNLOAD_BASE_MINUTES * factor);
}

export function staffManagementMinutes(state: GameState): number {
  const joiners = state.workers.filter((worker) => worker.role === 'joiner').length;
  return joiners * STAFF_MANAGEMENT_MINUTES_PER_JOINER;
}

// ---------------------------------------------------------------------------
// The task list
// ---------------------------------------------------------------------------

export interface TaskDraft {
  kind: TaskKind;
  label: string;
  minutes: number;
  jobId?: string | null;
  equipmentId?: string | null;
  deliveryId?: string | null;
}

export function createTask(state: GameState, draft: TaskDraft): TaskInstance {
  const definition = TASK_DEFINITIONS[draft.kind];
  const task: TaskInstance = {
    id: makeId(state, 'task'),
    kind: draft.kind,
    category: definition.category,
    label: draft.label,
    minutesTotal: draft.minutes,
    minutesRemaining: draft.minutes,
    jobId: draft.jobId ?? null,
    equipmentId: draft.equipmentId ?? null,
    deliveryId: draft.deliveryId ?? null,
    day: state.clock.day,
    done: false,
    doneBy: null,
    eligibleRoles: definition.eligibleRoles,
  };
  state.tasks.push(task);
  return task;
}

export function findTask(state: GameState, taskId: string): TaskInstance | null {
  return state.tasks.find((task) => task.id === taskId) ?? null;
}

/** Everything still waiting for somebody. */
export function openTasks(state: GameState): TaskInstance[] {
  return state.tasks.filter((task) => !task.done);
}

export function tasksOfKind(state: GameState, kind: TaskKind): TaskInstance[] {
  return state.tasks.filter((task) => task.kind === kind && !task.done);
}

export function jobTasks(state: GameState, jobId: string): TaskInstance[] {
  return state.tasks.filter((task) => task.jobId === jobId);
}

/** Drops yesterday's daily tasks, done or not: the day is gone. */
function dropDailyTasks(state: GameState): void {
  const daily: TaskKind[] = ['emails', 'bookkeeping', 'dailyOrdering', 'staffManagement'];
  state.tasks = state.tasks.filter((task) => !daily.includes(task.kind));
}

/** The admin that lands on the desk every working day (CLAUDE.md 8.10). */
export function createDailyTasks(state: GameState): void {
  dropDailyTasks(state);
  createTask(state, { kind: 'emails', label: 'Emails', minutes: EMAILS_MINUTES });
  createTask(state, { kind: 'bookkeeping', label: 'Bookkeeping', minutes: BOOKKEEPING_MINUTES });
  if (state.jobs.some((job) => job.stage !== 'completed')) {
    createTask(state, {
      kind: 'dailyOrdering',
      label: 'Material ordering',
      minutes: DAILY_ORDERING_MINUTES,
    });
  }
  const management = staffManagementMinutes(state);
  if (management > 0) {
    createTask(state, { kind: 'staffManagement', label: 'Staff management', minutes: management });
  }
}

/** A worker on the books takes the tasks his role covers, and the owner never sees them.
 *  Returns what was cleared, so the caller can apply what each finished task does. */
export function assignStaffTasks(state: GameState): TaskInstance[] {
  const cleared: TaskInstance[] = [];
  const started = state.workers.filter(
    (worker) => worker.startDay <= state.clock.day && worker.absentDaysRemaining === 0,
  );
  if (started.length === 0) return cleared;
  let clerkOrders = started.filter((worker) => worker.role === 'purchasingClerk').length
    * CLERK_ORDERS_PER_DAY;
  for (const task of state.tasks) {
    if (task.done || task.doneBy !== null) continue;
    const autoRoles = TASK_DEFINITIONS[task.kind].autoRoles;
    const staff = started.find((worker) => autoRoles.includes(worker.role));
    if (!staff) continue;
    if (task.kind === 'materialOrder' && staff.role === 'purchasingClerk') {
      if (clerkOrders <= 0) continue;
      clerkOrders -= 1;
    }
    task.done = true;
    task.minutesRemaining = 0;
    task.doneBy = staff.id;
    cleared.push(task);
  }
  return cleared;
}

// ---------------------------------------------------------------------------
// The runner
// ---------------------------------------------------------------------------

export function startTask(state: GameState, taskId: string): boolean {
  const task = findTask(state, taskId);
  if (!task || task.done) return false;
  if (!state.owner.present || state.owner.wentHome) return false;
  // No drawing without a licence for the software (CLAUDE.md 9.2).
  if (task.kind === 'design' && !softwareActive(state)) return false;
  state.owner.currentTaskId = task.id;
  task.doneBy = 'owner';
  return true;
}

export function pauseOwnerTask(state: GameState): void {
  const taskId = state.owner.currentTaskId;
  if (taskId) {
    const task = findTask(state, taskId);
    if (task && !task.done) task.doneBy = null;
  }
  state.owner.currentTaskId = null;
}

/** Works one minute into a task. True when it finished. One path for the owner and for staff. */
export function advanceTask(task: TaskInstance, work: number): boolean {
  task.minutesRemaining -= work;
  if (task.minutesRemaining > WORK_EPSILON) return false;
  task.minutesRemaining = 0;
  task.done = true;
  return true;
}

/** Spends one clock minute of owner time on his current task. Returns it if it finished. */
export function advanceOwnerTask(state: GameState, work: number): TaskInstance | null {
  const taskId = state.owner.currentTaskId;
  if (!taskId) return null;
  const task = findTask(state, taskId);
  if (!task || task.done) {
    state.owner.currentTaskId = null;
    return null;
  }
  if (!advanceTask(task, work)) return null;
  state.owner.currentTaskId = null;
  return task;
}

/** Puts a joiner on a job of work that is not production, at the cost of his production minutes. */
export function assignWorkerTask(state: GameState, workerId: string, taskId: string): boolean {
  const worker = state.workers.find((entry) => entry.id === workerId);
  const task = findTask(state, taskId);
  if (!worker || !task || task.done) return false;
  worker.taskId = task.id;
  task.doneBy = worker.id;
  return true;
}

export const AD_HOC_TASK_MINUTES = {
  bagChange: BAG_CHANGE_MINUTES,
  cleaning: CLEANING_MINUTES,
  fetchStorage: FETCH_STORAGE_MINUTES,
  repairExtractor: EXTRACTOR_REPAIR_MINUTES,
  siteMeasure: SITE_MEASURE_MINUTES,
};
