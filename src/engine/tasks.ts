// Task definitions, who can take them off the owner, their minute curves, and the runner that
// spends the owner's minutes on the one he started.

import {
  ADMIN_COVER_RATE,
  BAG_CHANGE_MINUTES,
  CLIENT_MEETING_MINUTES,
  MEETING_SALESMAN_REPUTATION,
  BOOKKEEPING_MINUTES,
  EMAIL_MINUTES,
  OWN_DELIVERY_MINUTES,
  CLEANING_MINUTES,
  CLERK_ORDERS_PER_DAY,
  CLIENT_CALL_ANSWER_MINUTES,
  EQUIPMENT_UNLOAD_MINUTES,
  DAILY_ORDERING_MINUTES,
  MOVE_MINUTES_PER_ITEM,
  EMAIL_ABOVE_BREAKS,
  EMAIL_ABOVE_PRICE,
  EMAIL_ABOVE_PRICE_STEP,
  EMAIL_PRICE_BREAKS,
  REPAIR_MINUTES,
  FETCH_STORAGE_MINUTES,
  MATERIAL_ORDER_MINUTES_HIGH,
  MATERIAL_ORDER_MINUTES_LOW,
  MATERIAL_ORDER_PRICE_HIGH,
  MATERIAL_ORDER_PRICE_LOW,
  SERVICE_MINUTES,
  SITE_MEASURE_MINUTES,
  SOFTWARE_DESIGN_FACTOR,
  STAFF_MANAGEMENT_MINUTES_PER_JOINER,
  UNLOAD_BASE_MINUTES,
  WORK_EPSILON,
} from './constants';
import { DAY_END_MINUTE } from './constants';
import { isBreak, nextWorkingDay } from './clock';
import { findSpec } from './machines';
import { canUnload } from './materials';
import { ownerIsAvailable } from './owner';
import { makeId } from './rng';
import { hasWorkingDay, isWorkingToday, joiners, staffMinutesLeft } from './staff';
import type {
  GameState,
  ProductTemplate,
  Worker,
  SoftwareTier,
  TaskCategory,
  TaskInstance,
  TaskKind,
  TaskOrder,
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
  // The salesman first, and the office admin behind him at half the speed when there is no
  // salesman on the books (CLAUDE.md T7 3.12).
  clientCall: {
    category: 'admin',
    eligibleRoles: ['salesman', 'officeAdmin'],
    autoRoles: ['salesman', 'officeAdmin'],
  },
  clientMeeting: {
    category: 'admin',
    eligibleRoles: ['salesman'],
    autoRoles: ['salesman'],
  },
  design: { category: 'design', eligibleRoles: [], autoRoles: [] },
  materialOrder: {
    category: 'admin',
    eligibleRoles: ['purchasingClerk', 'officeAdmin'],
    autoRoles: ['purchasingClerk', 'officeAdmin'],
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
  deliver: { category: 'workshop', eligibleRoles: ['joiner', 'helper'], autoRoles: [] },
  service: { category: 'workshop', eligibleRoles: ['joiner'], autoRoles: [] },
  repair: { category: 'workshop', eligibleRoles: ['joiner'], autoRoles: [] },
  moveMachines: { category: 'workshop', eligibleRoles: ['joiner', 'helper'], autoRoles: [] },
  // The owner does his own interviewing and his own waiting for the laptop: there is nobody to
  // hand either of them to (CLAUDE.md T7 3.10, T9 3.1).
  hiring: { category: 'admin', eligibleRoles: [], autoRoles: [] },
  booting: { category: 'admin', eligibleRoles: [], autoRoles: [] },
};

/** Float guard, not a game number: work this small is finished work. It lives in constants.ts
 *  with every other figure and is handed on from here, where it has always been imported from. */
export { WORK_EPSILON };

// ---------------------------------------------------------------------------
// Minute curves
// ---------------------------------------------------------------------------

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

/** What the handling kit in the hall does to a load at the gate: halved by a forklift and cut to
 *  a fifth by the better one (CLAUDE.md 8.10). One factor, whatever is on the lorry. */
function unloadFactor(state: GameState): number {
  let factor = 1;
  for (const item of state.equipment) {
    const spec = findSpec(item.specId);
    if (spec && spec.unloadFactor < factor) factor = spec.unloadFactor;
  }
  return factor;
}

/** Unloading a load of sheets (CLAUDE.md 8.10). */
export function unloadMinutes(state: GameState): number {
  return Math.round(UNLOAD_BASE_MINUTES * unloadFactor(state));
}

/** Getting a heavy machine off the lorry: the forklift, or two hours by hand [TUNE]
 *  (CLAUDE.md T8 3.2). Furniture and hand tools need nobody and never get here. */
export function equipmentUnloadMinutes(state: GameState): number {
  return Math.round(EQUIPMENT_UNLOAD_MINUTES * unloadFactor(state));
}

/** Emails a job carries: 1 up to 3000, 2 up to 10000, 3 up to 20000, then one more for every
 *  further 10000 (CLAUDE.md T3 3.2). A small job is one email, not three. */
export function emailsForPrice(price: number): number {
  for (const [max, emails] of EMAIL_PRICE_BREAKS) {
    if (price <= max) return emails;
  }
  return EMAIL_ABOVE_BREAKS + Math.ceil((price - EMAIL_ABOVE_PRICE) / EMAIL_ABOVE_PRICE_STEP);
}

/** Minutes one email takes [TUNE]. */
export function emailMinutes(): number {
  return EMAIL_MINUTES;
}

export function staffManagementMinutes(state: GameState): number {
  return joiners(state).length * STAFF_MANAGEMENT_MINUTES_PER_JOINER;
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
  orderIds?: string[];
  orders?: TaskOrder[];
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
    orderIds: draft.orderIds ? draft.orderIds.slice() : [],
    day: state.clock.day,
    done: false,
    doneDay: null,
    doneBy: null,
    orders: draft.orders ? draft.orders.slice() : [],
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

/** A move of the hall that has been asked for and not finished, whoever is or is not on it. The
 *  hall cannot be set out again until it is done, or the second batch of moves would ride on the
 *  first one's minutes (CLAUDE.md T4 3.5). */
export function movePending(state: GameState): TaskInstance | null {
  return state.tasks.find((task) => task.kind === 'moveMachines' && !task.done) ?? null;
}

/** The move of the hall somebody is actually doing this minute, or null. While one is running
 *  the clock is forced to 4x and every bench waits (CLAUDE.md T4 3.5). */
export function movingMachines(state: GameState): TaskInstance | null {
  return (
    state.tasks.find(
      (task) => task.kind === 'moveMachines' && !task.done && task.doneBy !== null,
    ) ?? null
  );
}

/** When a job of work of this many minutes, started now and worked at a minute a minute, is
 *  finished: the working day it lands on and the clock reading it lands at. The dinner hour is not
 *  worked and the day stops at 17:00 and picks up at 08:00, so a move started at four o'clock is
 *  finished tomorrow morning (CLAUDE.md T8 3.4). A projection for the toast, never a rule. */
export function finishTimeFor(state: GameState, minutes: number): { day: number; minute: number } {
  let day = state.clock.day;
  let minute = state.clock.minute;
  let left = minutes;
  let guard = 0;
  while (left > WORK_EPSILON && guard < 20000) {
    guard += 1;
    if (minute >= DAY_END_MINUTE) {
      day = nextWorkingDay(day);
      minute = 0;
      continue;
    }
    if (isBreak(minute) && !state.owner.breakSkipped) {
      minute += 1;
      continue;
    }
    minute += 1;
    left -= 1;
  }
  return { day, minute };
}

/** The kinds of task that take the owner out of the workshop, or stand him in the middle of it
 *  where nothing else can go on: what the "Owner is out" line is drawn from (CLAUDE.md T8 3.3).
 *  Measure, meeting and move only: an order takes him nowhere, and an interview is an hour in his
 *  own office with its own line inside the hiring card (CLAUDE.md T9 3.3). */
export const OWNER_OUT_KINDS: ReadonlyArray<TaskKind> = [
  'siteMeasure',
  'clientMeeting',
  'moveMachines',
];

/** The interview the owner is sitting in, if he is. Its own selector, because the hiring card
 *  says so on its face and the "Owner is out" line does not (CLAUDE.md T9 3.3). */
export function interviewTask(state: GameState): TaskInstance | null {
  const id = state.owner.currentTaskId;
  if (id === null) return null;
  const task = findTask(state, id);
  if (task === null || task.done) return null;
  return task.kind === 'hiring' ? task : null;
}

/** The interview, the site measure, the client meeting or the move of the hall the owner is on
 *  this minute, or null. The one selector for it: the line inside the modal and the component
 *  outside it both read this (CLAUDE.md T8 3.3, T9 3.3). */
export function ownerOutTask(state: GameState): TaskInstance | null {
  const id = state.owner.currentTaskId;
  if (id === null) return null;
  const task = findTask(state, id);
  if (task === null || task.done) return null;
  return OWNER_OUT_KINDS.includes(task.kind) ? task : null;
}

/** The task the clock is being run through for the player, or null (CLAUDE.md T8 3.3). */
export function skippedTask(state: GameState): TaskInstance | null {
  if (state.skipTaskId === null) return null;
  const task = findTask(state, state.skipTaskId);
  return task === null || task.done ? null : task;
}

export function tasksOfKind(state: GameState, kind: TaskKind): TaskInstance[] {
  return state.tasks.filter((task) => task.kind === kind && !task.done);
}

export function jobTasks(state: GameState, jobId: string): TaskInstance[] {
  return state.tasks.filter((task) => task.jobId === jobId);
}

/** Drops yesterday's daily tasks, done or not: the day is gone. Emails belong to a job now, so
 *  they are not on this list: an unanswered email follows the job to the client (T2 3.5). */
function dropDailyTasks(state: GameState): void {
  const daily: TaskKind[] = ['bookkeeping', 'dailyOrdering', 'staffManagement'];
  state.tasks = state.tasks.filter((task) => !daily.includes(task.kind));
}

/** The admin that lands on the desk every working day (CLAUDE.md 8.10). */
export function createDailyTasks(state: GameState): void {
  dropDailyTasks(state);
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

/** How fast this man works this task off. One a minute for the man whose job it is; half that
 *  for an office admin covering for a specialist the company has not taken on, which is what
 *  "twice the minutes" means (CLAUDE.md T7 3.12). */
export function taskWorkRate(worker: Worker, task: TaskInstance): number {
  const covering = task.kind === 'clientCall' || task.kind === 'materialOrder';
  return worker.role === 'officeAdmin' && covering ? ADMIN_COVER_RATE : 1;
}

/** Can this man take this task on today? Office roles work it off minute by minute out of their
 *  own 480, a helper still clears his workshop jobs on the spot (CLAUDE.md T2 3.8). */
function canTakeOn(state: GameState, worker: Worker, task: TaskInstance): boolean {
  if (!TASK_DEFINITIONS[task.kind].autoRoles.includes(worker.role)) return false;
  // The client will not sit down with a salesman until the company is known (CLAUDE.md T7 3.11).
  if (task.kind === 'clientMeeting' && state.reputation < MEETING_SALESMAN_REPUTATION) return false;
  if (!hasWorkingDay(worker.role)) return true;
  if (worker.taskId !== null) return false;
  if (staffMinutesLeft(worker) <= 0) return false;
  if (task.kind === 'materialOrder' && worker.role === 'purchasingClerk') {
    return worker.ordersToday < CLERK_ORDERS_PER_DAY;
  }
  return true;
}

/** Who takes a task the company has more than one kind of man for: the one whose job it is, and
 *  the man covering for him only when he is not there (CLAUDE.md T7 3.12). */
export function bestTakerOf(
  state: GameState,
  workers: readonly Worker[],
  task: TaskInstance,
): Worker | null {
  const order = TASK_DEFINITIONS[task.kind].autoRoles;
  let best: Worker | null = null;
  let bestRank = order.length;
  for (const worker of workers) {
    if (!canTakeOn(state, worker, task)) continue;
    const rank = order.indexOf(worker.role);
    if (rank >= 0 && rank < bestRank) {
      best = worker;
      bestRank = rank;
    }
  }
  return best;
}

/** A worker on the books takes the tasks his role covers, and the owner never sees them.
 *  Returns what was cleared on the spot, so the caller can apply what each finished task does. */
export function assignStaffTasks(state: GameState): TaskInstance[] {
  const cleared: TaskInstance[] = [];
  const started = state.workers.filter((worker) => isWorkingToday(state, worker));
  if (started.length === 0) return cleared;
  for (const task of state.tasks) {
    if (task.done || task.doneBy !== null) continue;
    if (task.kind === 'unload' && task.deliveryId !== null && !canUnload(state)) continue;
    const staff = bestTakerOf(state, started, task);
    if (!staff) continue;
    if (hasWorkingDay(staff.role)) {
      // He picks it up and works it off as the clock runs, like the owner does.
      staff.taskId = task.id;
      task.doneBy = staff.id;
      continue;
    }
    advanceTask(task, task.minutesRemaining, state.clock.day);
    task.doneBy = staff.id;
    cleared.push(task);
  }
  return cleared;
}

// ---------------------------------------------------------------------------
// The runner
// ---------------------------------------------------------------------------

/** Why the owner cannot pick this one up, or that he can. The one place the refusals are
 *  written down: `startTask` asks this and nothing else, and every row that offers a Start asks
 *  it too, so a button the engine would refuse is never drawn (CLAUDE.md T4 3.2). */
export interface TaskStartCheck {
  ok: boolean;
  reason: string;
  /** What he is holding, so the row can offer to put that down where the player is standing. */
  blockingTaskId: string | null;
}

const CAN_START_TASK: TaskStartCheck = { ok: true, reason: '', blockingTaskId: null };

function refused(reason: string, blockingTaskId: string | null = null): TaskStartCheck {
  return { ok: false, reason, blockingTaskId };
}

export function startTaskCheck(state: GameState, taskId: string): TaskStartCheck {
  const task = findTask(state, taskId);
  if (!task) return refused('That job of work has gone');
  if (task.done) return refused('Done');
  if (!ownerIsAvailable(state)) return refused('The owner is not in today');
  // One thing at a time: the current task has to be finished or paused first (CLAUDE.md 10.1).
  const current = state.owner.currentTaskId;
  if (current !== null && current !== task.id) {
    const held = findTask(state, current);
    return refused(`Busy with ${held ? held.label : 'something else'}`, current);
  }
  // No drawing without a licence for the software (CLAUDE.md 9.2), and none before the client
  // has been sat down with on a job that wants a meeting (CLAUDE.md T7 3.11).
  if (task.kind === 'design') {
    if (!softwareActive(state)) return refused('No software licence');
    const open = state.tasks.some(
      (entry) => entry.kind === 'clientMeeting' && entry.jobId === task.jobId && !entry.done,
    );
    if (open) return refused('The client meeting comes first');
  }
  // Nothing comes off the lorry until there is shelving to put it on (CLAUDE.md T2 3.6).
  if (task.kind === 'unload' && task.deliveryId !== null && !canUnload(state)) {
    return refused('Nowhere to put it');
  }
  return CAN_START_TASK;
}

export function startTask(state: GameState, taskId: string): boolean {
  if (!startTaskCheck(state, taskId).ok) return false;
  const task = findTask(state, taskId);
  if (!task) return false;
  // Every refusal is behind us, so it is safe to take the task off whoever was holding it. The
  // work he did on it stays done.
  for (const worker of state.workers) {
    if (worker.taskId === task.id) worker.taskId = null;
  }
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
  // Putting something down on purpose ends whatever the phone was going to send him back to.
  state.owner.resumeTaskId = null;
}

/** The phone goes and the owner picks it up. This is the one thing that comes before the checks
 *  in `startTaskCheck`: a call is an interruption, so whatever he was holding waits those minutes
 *  and he goes back to it when the call is over (CLAUDE.md T4 3.3). */
export function interruptOwnerWith(state: GameState, task: TaskInstance): void {
  const held = state.owner.currentTaskId;
  // What he was on stays his, unlike a task he put down on purpose: he is coming back to it, and
  // until then nobody else may pick it up. Holding nothing is written down too, or the last
  // interruption's task would be resumed after this one.
  state.owner.resumeTaskId = held !== null && held !== task.id ? held : null;
  for (const worker of state.workers) {
    if (worker.taskId === task.id) worker.taskId = null;
  }
  state.owner.currentTaskId = task.id;
  task.doneBy = 'owner';
}

/** Back to whatever the phone interrupted. A man at the bench was holding nothing, so he simply
 *  walks back to the bench. */
export function resumeOwnerTask(state: GameState): void {
  const resume = state.owner.resumeTaskId;
  state.owner.resumeTaskId = null;
  if (resume !== null) startTask(state, resume);
}

/** Works one minute into a task. True when it finished. One path for the owner and for staff.
 *  The day it was finished is written down, because the drawings the workshop has done carry a
 *  date on the desk (CLAUDE.md T3 3.3). */
export function advanceTask(task: TaskInstance, work: number, day: number): boolean {
  task.minutesRemaining -= work;
  if (task.minutesRemaining > WORK_EPSILON) return false;
  task.minutesRemaining = 0;
  task.done = true;
  task.doneDay = day;
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
  if (!advanceTask(task, work, state.clock.day)) return null;
  state.owner.currentTaskId = null;
  return task;
}

/** Puts a joiner on a job of work that is not production, at the cost of his production minutes. */
export function assignWorkerTask(state: GameState, workerId: string, taskId: string): boolean {
  const worker = state.workers.find((entry) => entry.id === workerId);
  const task = findTask(state, taskId);
  if (!worker || !task || task.done) return false;
  // One man on a task: the owner comes off it the moment somebody else is sent.
  if (state.owner.currentTaskId === task.id) state.owner.currentTaskId = null;
  for (const other of state.workers) {
    if (other.id !== worker.id && other.taskId === task.id) other.taskId = null;
  }
  worker.taskId = task.id;
  task.doneBy = worker.id;
  return true;
}

export const AD_HOC_TASK_MINUTES = {
  bagChange: BAG_CHANGE_MINUTES,
  clientCall: CLIENT_CALL_ANSWER_MINUTES,
  clientMeeting: CLIENT_MEETING_MINUTES,
  moveMachines: MOVE_MINUTES_PER_ITEM,
  cleaning: CLEANING_MINUTES,
  deliver: OWN_DELIVERY_MINUTES,
  fetchStorage: FETCH_STORAGE_MINUTES,
  repair: REPAIR_MINUTES,
  service: SERVICE_MINUTES,
  siteMeasure: SITE_MEASURE_MINUTES,
};
