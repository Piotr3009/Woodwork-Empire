// Task definitions, who can take them off the owner, their minute curves, and the runner that
// spends the owner's minutes on the one he started.

import {
  ADMIN_COVER_RATE,
  CONSUMABLES_LABEL,
  DRAFTSMAN_RATE,
  ESTIMATOR_JOBS_PER_DAY,
  ESTIMATOR_JOBS_WITH_JOINERY_CORE,
  ESTIMATOR_RATES,
  JOINERY_CORE_EXTENSION_JOBS,
  JOINERY_CORE_EXTENSION_PRICE_YEARLY,
  JOINERY_CORE_MAX_EXTENSIONS,
  JOINERY_CORE_PRICE_YEARLY,
  UNLOAD_MINUTES_BY_HANDLING,
  BAG_CHANGE_MINUTES,
  CLIENT_MEETING_MINUTES,
  MEETING_SALESMAN_REPUTATION,
  BOOKKEEPING_MINUTES,
  EMAIL_MINUTES,
  OWN_DELIVERY_MINUTES,
  CLEANING_MINUTES,
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
import { isBreak, nextWorkingDay, weekOfDay } from './clock';
import { has } from './machines';
import { canUnload } from './materials';
import { managerOnDuty, ownerIsAvailable } from './owner';
import { makeId } from './rng';
import { plural } from './text';
import { hasWorkingDay, helperOnDuty, isWorkingToday, joiners, staffMinutesLeft } from './staff';
import { websiteUpkeepMinutes } from './website';
import type {
  DayCategory,
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
  // Assigning the crew is the production manager's the day he is hired, and it comes off the
  // owner's day with him (CLAUDE.md T13 3.9).
  staffManagement: {
    category: 'admin',
    eligibleRoles: ['productionManager'],
    autoRoles: ['productionManager'],
  },
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
  // The draftsman takes the drawings off the owner, in laptop order, and the owner may still
  // draw beside him (PIOTR, CLAUDE.md T10 3.6).
  design: { category: 'design', eligibleRoles: ['draftsman'], autoRoles: ['draftsman'] },
  // The take off is the owner's until an estimator is taken on, and then his, so many a day
  // (CLAUDE.md T13 3.8).
  materialTakeOff: { category: 'admin', eligibleRoles: ['estimator'], autoRoles: ['estimator'] },
  siteMeasure: { category: 'admin', eligibleRoles: [], autoRoles: [] },
  // The website's weekly minutes: the owner's, or the admin's (CLAUDE.md T13 3.7).
  websiteUpkeep: { category: 'admin', eligibleRoles: ['officeAdmin'], autoRoles: ['officeAdmin'] },
  unload: { category: 'workshop', eligibleRoles: ['joiner', 'helper'], autoRoles: ['helper'] },
  emptyBags: { category: 'workshop', eligibleRoles: ['joiner', 'helper'], autoRoles: ['helper'] },
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

/** Every kind of task the runner knows about, off the runner's own table. The one list: a test
 *  that asks "every kind of task in the game" asks this and not the table it is checking. */
export const TASK_KINDS: ReadonlyArray<TaskKind> = Object.keys(TASK_DEFINITIONS) as TaskKind[];

/** Which of the seven bands of the owner's day a task falls in. Every kind of task in the game
 *  is on this one table, so a minute cannot be workshop time on the bar and office time in the
 *  summary (CLAUDE.md T11 3.1). The engine's own `category` stays what it always was: it is the
 *  three way admin, design and workshop split the minute pool is kept in, and this is the
 *  seven way split the player reads. */
export const DAY_CATEGORY_OF_TASK: Record<TaskKind, DayCategory> = {
  emails: 'emails',
  clientMeeting: 'meetings',
  bookkeeping: 'office',
  dailyOrdering: 'office',
  staffManagement: 'assign',
  clientCall: 'calls',
  design: 'office',
  materialTakeOff: 'office',
  siteMeasure: 'siteMeasure',
  websiteUpkeep: 'office',
  unload: 'fixing',
  emptyBags: 'fixing',
  cleaning: 'fixing',
  fetchStorage: 'fixing',
  // Taking the piece to the client is the work of the shop, not of the office or the spanner.
  deliver: 'workshop',
  service: 'fixing',
  repair: 'fixing',
  moveMachines: 'fixing',
  // An interview is an hour sitting down with somebody, which is a meeting.
  hiring: 'meetings',
  booting: 'office',
};

/** The band this task falls in. The one lookup: the runner and the tests both ask it. */
export function dayCategoryOf(kind: TaskKind): DayCategory {
  return DAY_CATEGORY_OF_TASK[kind];
}

/** The three jobs of work that are the helper's and nobody else's the moment there is a helper in
 *  the hall: "with a helper, I and the joiners stop unloading, cleaning and changing bags"
 *  (PIOTR, 14.09; CLAUDE.md T11 3.4). */
export const HELPER_ONLY_KINDS: ReadonlyArray<TaskKind> = ['unload', 'emptyBags', 'cleaning'];

/** True while this job of work is the helper's. Without a helper it is nobody's in particular and
 *  everything stays as it was. The one selector: the refusal, the joiner and the events read it. */
export function isHelperTask(state: GameState, task: TaskInstance): boolean {
  return HELPER_ONLY_KINDS.includes(task.kind) && helperOnDuty(state);
}

/** What the hall says while the van or the bag is waiting for the man whose job it is. */
export const WAITING_FOR_HELPER = 'Waiting for the helper';

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

/** The best handling kit in the hall: the key of the one table the unloading minutes are read
 *  off, `none` for bare hands (CLAUDE.md T13 3.21). */
export function handlingIn(state: GameState): string {
  let best = 'none';
  let minutes = UNLOAD_MINUTES_BY_HANDLING.none ?? UNLOAD_BASE_MINUTES;
  for (const [specId, figure] of Object.entries(UNLOAD_MINUTES_BY_HANDLING)) {
    if (specId === 'none' || !has(state, specId)) continue;
    if (figure < minutes) {
      minutes = figure;
      best = specId;
    }
  }
  return best;
}

/** What the handling kit does to a walk at the gate, as a factor of the bare handed figure: the
 *  one table, read for the sheets and for the machines alike (CLAUDE.md T13 3.21). */
function unloadFactor(state: GameState): number {
  const bare = UNLOAD_MINUTES_BY_HANDLING.none ?? UNLOAD_BASE_MINUTES;
  const best = UNLOAD_MINUTES_BY_HANDLING[handlingIn(state)] ?? bare;
  return bare > 0 ? best / bare : 1;
}

/** Unloading a load of sheets: 45 by hand, about 30 with a pallet truck, about 15 with a forklift
 *  (PIOTR; CLAUDE.md T13 3.21). */
export function unloadMinutes(state: GameState): number {
  return Math.round(UNLOAD_MINUTES_BY_HANDLING[handlingIn(state)] ?? UNLOAD_BASE_MINUTES);
}

/** Getting a heavy machine off the lorry: two hours by hand [TUNE], shortened by the same handling
 *  kit (CLAUDE.md T8 3.2). Furniture and hand tools need nobody and never get here. */
export function equipmentUnloadMinutes(state: GameState): number {
  return Math.round(EQUIPMENT_UNLOAD_MINUTES * unloadFactor(state));
}

/** Take offs an estimator does in a day: five, ten with Joinery Core, and five more per extension,
 *  at most two of them (PIOTR; CLAUDE.md T13 3.8). The jump from five to ten is the one that is
 *  meant to be felt. */
export function estimatorCapacity(state: GameState): number {
  if (!state.software.joineryCore) return ESTIMATOR_JOBS_PER_DAY;
  const extensions = Math.min(JOINERY_CORE_MAX_EXTENSIONS, state.software.joineryCoreExtensions);
  return ESTIMATOR_JOBS_WITH_JOINERY_CORE + extensions * JOINERY_CORE_EXTENSION_JOBS;
}

/** What the Technical tab says about Joinery Core: whether it is on the laptop, what it and its
 *  extensions do to the estimator's day, what each costs a year, and whether the two buttons can
 *  be pressed (CLAUDE.md T13 3.8). The refusals are the ones the action applies. */
export interface JoineryCoreOffer {
  held: boolean;
  extensions: number;
  maxExtensions: number;
  /** Take offs a day as things stand. */
  capacity: number;
  baseCapacity: number;
  coreCapacity: number;
  extensionJobs: number;
  yearlyPrice: number;
  extensionYearlyPrice: number;
  core: { ok: boolean; reason: string };
  extension: { ok: boolean; reason: string };
}

export function joineryCoreOffer(state: GameState): JoineryCoreOffer {
  const held = state.software.joineryCore;
  const extensions = Math.min(JOINERY_CORE_MAX_EXTENSIONS, state.software.joineryCoreExtensions);
  let core = { ok: true, reason: '' };
  if (held) core = { ok: false, reason: 'On the laptop' };
  else if (!has(state, 'laptop')) core = { ok: false, reason: 'Needs the laptop' };
  let extension = { ok: true, reason: '' };
  if (!held) extension = { ok: false, reason: 'Joinery Core first' };
  else if (extensions >= JOINERY_CORE_MAX_EXTENSIONS) extension = { ok: false, reason: 'Both extensions bought' };
  return {
    held,
    extensions,
    maxExtensions: JOINERY_CORE_MAX_EXTENSIONS,
    capacity: estimatorCapacity(state),
    baseCapacity: ESTIMATOR_JOBS_PER_DAY,
    coreCapacity: ESTIMATOR_JOBS_WITH_JOINERY_CORE,
    extensionJobs: JOINERY_CORE_EXTENSION_JOBS,
    yearlyPrice: JOINERY_CORE_PRICE_YEARLY,
    extensionYearlyPrice: JOINERY_CORE_EXTENSION_PRICE_YEARLY,
    core,
    extension,
  };
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

/** Whose day the assigning comes off: the production manager's from the day he is in, and the
 *  owner's until then (CLAUDE.md T13 3.9). The one answer the team page and the day meters
 *  agree on. */
export function staffManagementTaker(state: GameState): 'owner' | 'manager' {
  return managerOnDuty(state) ? 'manager' : 'owner';
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

/** The admin that lands on the desk every working day (CLAUDE.md 8.10). The consumables and
 *  materials chore lands every day whatever the number of projects (CLAUDE.md T13 3.3), and the
 *  website's upkeep once a week (T13 3.7). */
export function createDailyTasks(state: GameState): void {
  dropDailyTasks(state);
  createTask(state, { kind: 'bookkeeping', label: 'Bookkeeping', minutes: BOOKKEEPING_MINUTES });
  createTask(state, {
    kind: 'dailyOrdering',
    label: CONSUMABLES_LABEL,
    minutes: DAILY_ORDERING_MINUTES,
  });
  const management = staffManagementMinutes(state);
  if (management > 0) {
    createTask(state, { kind: 'staffManagement', label: 'Staff management', minutes: management });
  }
  const upkeep = websiteUpkeepMinutes(state);
  const last = state.website.lastUpkeepDay;
  if (upkeep > 0 && (last === null || weekOfDay(last) !== weekOfDay(state.clock.day))) {
    createTask(state, { kind: 'websiteUpkeep', label: 'Website upkeep', minutes: upkeep });
    state.website.lastUpkeepDay = state.clock.day;
  }
}

/** How fast this man works this task off. One a minute for the man whose job it is; half that
 *  for an office admin covering for a specialist the company has not taken on, which is what
 *  "twice the minutes" means (CLAUDE.md T7 3.12). */
export function taskWorkRate(worker: Worker, task: TaskInstance): number {
  if (worker.role === 'officeAdmin' && task.kind === 'clientCall') return ADMIN_COVER_RATE;
  // A draftsman draws at 0.8 of the owner's own speed. The software's factor is already in the
  // minutes of the drawing, so it is not counted again here (CLAUDE.md T10 3.6).
  if (worker.role === 'draftsman' && task.kind === 'design') return DRAFTSMAN_RATE;
  // An estimator's tier is his speed at the take off (CLAUDE.md T13 3.8).
  if (worker.role === 'estimator' && task.kind === 'materialTakeOff') {
    return ESTIMATOR_RATES[worker.tier ?? 'normal'];
  }
  return 1;
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
  if (task.kind === 'materialTakeOff' && worker.role === 'estimator') {
    // So many a day, and none before the drawing it reads (CLAUDE.md T13 3.8).
    if (worker.ordersToday >= estimatorCapacity(state)) return false;
    return !designOutstandingFor(state, task.jobId);
  }
  return true;
}

/** True while the drawing of this job is still to be done: the take off reads the drawing, so it
 *  waits for it (CLAUDE.md T13 3.8). Asked here of the task list, which this module owns. */
export function designOutstandingFor(state: GameState, jobId: string | null): boolean {
  if (jobId === null) return false;
  return state.tasks.some(
    (task) => task.jobId === jobId && !task.done && (task.kind === 'design' || task.kind === 'siteMeasure'),
  );
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

/** Why the owner cannot pick this one up. `force` is the explicit button the player pressed
 *  himself: "Unload it yourself", "Clean up", the choice on the event. That is an override for
 *  that one task and nothing else (CLAUDE.md T11 3.4). */
export function startTaskCheck(
  state: GameState,
  taskId: string,
  force = false,
): TaskStartCheck {
  const task = findTask(state, taskId);
  if (!task) return refused('That job of work has gone');
  if (task.done) return refused('Done');
  if (!ownerIsAvailable(state)) return refused('The owner is not in today');
  // The unloading, the bags and the cleaning are the helper's while he is here.
  if (!force && isHelperTask(state, task)) return refused(WAITING_FOR_HELPER);
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
  // The take off reads the drawing (CLAUDE.md T13 3.8).
  if (task.kind === 'materialTakeOff' && designOutstandingFor(state, task.jobId)) {
    return refused('The drawing comes first');
  }
  return CAN_START_TASK;
}

export function startTask(state: GameState, taskId: string, force = false): boolean {
  if (!startTaskCheck(state, taskId, force).ok) return false;
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
  // He is going back to what the phone took him off, so the override he already exercised goes
  // back with him: a forced job of work refused here would be left marked as his and nobody,
  // helper or joiner, could ever pick it up again (CLAUDE.md T11 3.4).
  if (resume !== null) startTask(state, resume, true);
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
  // A joiner is never sent at the helper's own work: that is what the helper was taken on for
  // (PIOTR, 14.09; CLAUDE.md T11 3.4).
  if (worker.role !== 'helper' && isHelperTask(state, task)) return false;
  // One man on a task: the owner comes off it the moment somebody else is sent.
  if (state.owner.currentTaskId === task.id) state.owner.currentTaskId = null;
  for (const other of state.workers) {
    if (other.id !== worker.id && other.taskId === task.id) other.taskId = null;
  }
  worker.taskId = task.id;
  task.doneBy = worker.id;
  return true;
}

/** Emptying the hall's store: fifteen minutes a bag, so ten bags take ten times as long as one
 *  (PIOTR; CLAUDE.md T12 2.3). */
export function emptyBagsMinutes(bags: number): number {
  return BAG_CHANGE_MINUTES * bags;
}

/** What the chore is called on the helper's list and on the owner's: "Empty the bags (10 bags,
 *  150 min)" (CLAUDE.md T12 3.3). */
export function emptyBagsLabel(bags: number): string {
  return `Empty the bags (${plural(bags, 'bag', 'bags')}, ${emptyBagsMinutes(bags)} min)`;
}

export const AD_HOC_TASK_MINUTES = {
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
