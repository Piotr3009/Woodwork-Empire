// Task definitions, who can take them off the owner, their minute curves, and the runner that
// spends the owner's minutes on the one he started.

import {
  ADMIN_COVER_RATE,
  CONSUMABLES_LABEL,
  DRAFTSMAN_RATE,
  MINUTES_PER_WORKING_DAY,
  WORKER_RATES,
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
  DESIGN_MIN_MINUTES,
  DESIGN_MINUTES_PER_1000,
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
  MATERIAL_TAKE_OFF_MINUTES,
  JOINERY_CORE_TAKE_OFF_FACTOR,
  JOINERY_CORE_EXTENSION_TAKE_OFF_FACTOR,
  SERVICE_MINUTES,
  SITE_MEASURE_MINUTES,
  SOFTWARE_DESIGN_FACTOR,
  UNLOAD_BASE_MINUTES,
  WEEK_JOBS_KEPT,
  WORK_EPSILON,
} from './constants';
import { DAY_END_MINUTE } from './constants';
import { isBreak, nextWorkingDay, weekOfDay } from './clock';
import { OWNER, has } from './machines';
import { canUnload } from './materials';
import { ownerIsAvailable } from './owner';
import { bookOwnerIdleMinute, bookWorkerIdleMinute } from './production';
import { makeId } from './rng';
import { plural } from './text';
import {
  crewHasGoneHome,
  effortSoFar,
  hasWorkingDay,
  helperOnDuty,
  isWorkingToday,
  staffMinutesLeft,
  weekMetersOf,
} from './staff';
import { websiteUpkeepMinutes } from './website';
import type {
  DayCategory,
  GameState,
  OwnerState,
  Worker,
  SoftwareTier,
  TaskCategory,
  TaskInstance,
  TaskKind,
  TaskOrder,
  WeekCategory,
  WeekMeters,
  WorkerRole,
  WorkerTier,
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
  // The site measure is a day out with a tape. It was the owner's alone; Turn 20 let the estimator
  // go, with the day's travel minutes coming off his own 480 and not the owner's (PIOTR;
  // CLAUDE.md T20 2.3). From tonight nobody waits for the owner to have time for it: the estimator
  // goes the minute the measure exists, the salesman goes when there is no estimator on the books,
  // and the owner only when there is neither of them (PIOTR, 19.09: "they wait until I have time;
  // stupid"; CLAUDE.md T21 2.5.1). The order of this list is that order, because `bestTakerOf`
  // reads it as a ranking.
  siteMeasure: {
    category: 'admin',
    eligibleRoles: ['estimator', 'salesman'],
    autoRoles: ['estimator', 'salesman'],
  },
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
  // A service is called in and paid for, never worked off: nobody is eligible for one, so the
  // Tasks page draws no Start against it (PIOTR, 18.09; CLAUDE.md T20 2.9.2).
  service: { category: 'workshop', eligibleRoles: [], autoRoles: [] },
  repair: { category: 'workshop', eligibleRoles: ['joiner'], autoRoles: [] },
  moveMachines: { category: 'workshop', eligibleRoles: ['joiner', 'helper'], autoRoles: [] },
  // The owner does his own interviewing and his own sitting at the laptop: there is nobody to
  // hand either of them to (CLAUDE.md T7 3.10, T9 3.1).
  hiring: { category: 'admin', eligibleRoles: [], autoRoles: [] },
  booting: { category: 'admin', eligibleRoles: [], autoRoles: [] },
};

/** Who may be sent at this job of work, and who takes it off the owner without being asked. The
 *  one reading of the table from outside this module, so nothing keeps a second list of who does
 *  what (CLAUDE.md T20 2.3 moved the site measure onto the estimator). */
export function rolesForTask(kind: TaskKind): {
  eligible: ReadonlyArray<WorkerRole>;
  auto: ReadonlyArray<WorkerRole>;
} {
  const definition = TASK_DEFINITIONS[kind];
  return { eligible: definition.eligibleRoles, auto: definition.autoRoles };
}

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

/** The man who has the one open job of work of this kind in his hands this minute, or null. Both
 *  halves have to be true: the task names him and he names it. A task the owner took on himself
 *  answers null, because that is his own override and it keeps its button. The one selector: the
 *  chips under the hall say his name and draw no button while he has it, because the labourer
 *  sweeps and empties the bags without being asked and the player is not put the question
 *  (PIOTR, 17.09 and 18.09; CLAUDE.md T19 2.7, T20 2.8).
 *
 *  There is no flag for "once per dirtying" and none is wanted: an open cleaning task IS the
 *  flag, because the hall raises one and only one while the dust is up, and finishing it puts the
 *  dust back to nought so the band is clean again until the hall dirties afresh. */
export function manOnOpenTask(state: GameState, kind: TaskKind): Worker | null {
  const task = state.tasks.find((entry) => entry.kind === kind && !entry.done);
  if (!task || task.doneBy === null) return null;
  const worker = state.workers.find((entry) => entry.id === task.doneBy);
  if (!worker || worker.taskId !== task.id) return null;
  return worker;
}

/** The man who is sweeping the hall this minute, or null: `manOnOpenTask` asked about the broom. */
export function cleanerAtWork(state: GameState): Worker | null {
  return manOnOpenTask(state, 'cleaning');
}

/** What the hall says while the van or the bag waits on the man whose job it is. */
export const WAITING_FOR_HELPER = 'Waiting for the helper';

/** What the service row says instead of a Start: nobody stands at a service, it is called in and
 *  paid for from the Machines page (PIOTR, 18.09; CLAUDE.md T20 2.9). */
export const SERVICE_IS_CALLED_IN = 'Call it in on the Machines page';

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

/** How long a drawing takes: off the value of the job and nothing else, with a floor under it,
 *  and the software tier still dividing it (PIOTR, 17.09: "drawings take far too long";
 *  CLAUDE.md T19 2.11). A GBP 2,500 job is an hour, GBP 10,000 is four, GBP 20,000 is eight; the
 *  smallest job there is takes the half hour the floor sets. The per product figure and the size
 *  multiplier are gone: a job's price already carries its size, and two figures for one thing is
 *  what made a set of shelves cost a day at the desk. */
export function designMinutes(basePrice: number, tier: SoftwareTier): number {
  const raw = Math.max(DESIGN_MIN_MINUTES, (DESIGN_MINUTES_PER_1000 * basePrice) / 1000);
  return Math.round(raw * SOFTWARE_DESIGN_FACTOR[tier]);
}

/** The best handling kit in the hall: the class of pallet truck or forklift the unloading minutes
 *  are read off, `none` for bare hands (CLAUDE.md T13 3.21). From v54 the pallet trucks and the
 *  forklifts are one family and the table is keyed by its class (PIOTR, 24.09). */
export function handlingIn(state: GameState): string {
  let best = 'none';
  let minutes = UNLOAD_MINUTES_BY_HANDLING.none ?? UNLOAD_BASE_MINUTES;
  for (const item of state.equipment) {
    if (item.specId !== HANDLING_FAMILY) continue;
    const figure = UNLOAD_MINUTES_BY_HANDLING[item.variantId];
    if (figure !== undefined && figure < minutes) {
      minutes = figure;
      best = item.variantId;
    }
  }
  return best;
}

/** The one family of pallet trucks and forklifts (v54). */
export const HANDLING_FAMILY = 'forklift';

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

/** The minutes one take off is worth with this software on the laptop. */
function takeOffMinutesWith(core: boolean, extensions: number): number {
  if (!core) return MATERIAL_TAKE_OFF_MINUTES;
  const held = Math.max(0, Math.min(JOINERY_CORE_MAX_EXTENSIONS, extensions));
  return (
    MATERIAL_TAKE_OFF_MINUTES *
    JOINERY_CORE_TAKE_OFF_FACTOR *
    JOINERY_CORE_EXTENSION_TAKE_OFF_FACTOR ** held
  );
}

/** One entry per extension the laptop can hold, for the line that prices them. */
const EXTENSION_STEPS: number[] = [];
for (let step = 1; step <= JOINERY_CORE_MAX_EXTENSIONS; step += 1) EXTENSION_STEPS.push(step);

/** The minutes a take off carries in this workshop: the one figure the task is created with. */
export function takeOffMinutes(state: GameState): number {
  return takeOffMinutesWith(state.software.joineryCore, state.software.joineryCoreExtensions);
}

/** How many of them a man of this class gets through in a day: his working minutes over the
 *  minutes one costs him at his own rate, whole ones only. Not a number of jobs any more: he does
 *  as many as his minutes allow (PIOTR, 18.09: "the estimator does five a day when the owner does
 *  sixteen"; CLAUDE.md T20 2.3). An experienced man does 16 a day bare and 32 with Joinery Core. */
function capacityFor(minutesEach: number, tier: WorkerTier): number {
  if (minutesEach <= 0) return 0;
  return Math.floor((MINUTES_PER_WORKING_DAY * WORKER_RATES[tier]) / minutesEach);
}

export function estimatorCapacity(state: GameState, tier: WorkerTier = 'experienced'): number {
  return capacityFor(takeOffMinutes(state), tier);
}

/** The man the software is bought for: the estimator on the books, if there is one. The figures on
 *  the Technical tab are his day, not a stranger's, because a take off is half an hour of the desk
 *  it is done at and his class is what makes it 37 minutes or 21 (CLAUDE.md T20 2.3). */
function deskEstimator(state: GameState): Worker | null {
  return state.workers.find((worker) => worker.role === 'estimator') ?? null;
}

/** What the Technical tab says about Joinery Core: whether it is on the laptop, what it and its
 *  extensions do to the estimator's day, what each costs a year, and whether the two buttons can
 *  be pressed (CLAUDE.md T13 3.8). The refusals are the ones the action applies. */
export interface JoineryCoreOffer {
  held: boolean;
  extensions: number;
  maxExtensions: number;
  /** Take offs a day as things stand, for the man whose day this is. */
  capacity: number;
  /** The minutes one of them costs him, at his own rate. */
  minutesEach: number;
  baseCapacity: number;
  coreCapacity: number;
  /** A day's take offs with the core and one extension, and with both (CLAUDE.md T20 2.3). */
  extensionCapacities: number[];
  /** Whose day every figure above is: the estimator on the books, or nobody, and then they are
   *  the experienced man's and the page says so (CLAUDE.md T20 2.3). */
  estimator: string | null;
  tier: WorkerTier;
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
  // The man at the desk, or the experienced man the trade is measured against when the desk is
  // empty: the player is never shown a day that is nobody's (CLAUDE.md T20 2.3).
  const man = deskEstimator(state);
  const tier = man?.tier ?? 'experienced';
  return {
    held,
    extensions,
    maxExtensions: JOINERY_CORE_MAX_EXTENSIONS,
    capacity: estimatorCapacity(state, tier),
    minutesEach: Math.round(takeOffMinutes(state) / WORKER_RATES[tier]),
    baseCapacity: capacityFor(takeOffMinutesWith(false, 0), tier),
    coreCapacity: capacityFor(takeOffMinutesWith(true, 0), tier),
    extensionCapacities: EXTENSION_STEPS.map((step) =>
      capacityFor(takeOffMinutesWith(true, step), tier),
    ),
    estimator: man === null ? null : man.name,
    tier,
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
  const minutes = draft.minutes;
  const task: TaskInstance = {
    id: makeId(state, 'task'),
    kind: draft.kind,
    category: definition.category,
    label: draft.label,
    minutesTotal: minutes,
    minutesRemaining: minutes,
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
  // Whoever it belongs to has it now and not at the next pass over the crew: a call that comes in
  // at 11:00 is the admin's at 11:00, and the site measure of a job accepted this minute is the
  // estimator's this minute (PIOTR, 19.09: "they wait until I have time; stupid";
  // CLAUDE.md T21 2.5.1, 2.5.3). The dinner hour is left out for the same reason the day's own pass
  // leaves it out: nobody is sent at a job of work in the middle of his break (CLAUDE.md T6 3.4).
  if (!assigning && !isBreak(state.clock.minute)) assignStaffTasks(state);
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
 *  they are not on this list: an unanswered email follows the job to the client (T2 3.5), and it
 *  dies at dusk with the calls (CLAUDE.md T17 2.15). A boot that was never finished goes too: the
 *  five minutes were spent yesterday and yesterday's laptop is shut (CLAUDE.md T17 2.17). */
function dropDailyTasks(state: GameState): void {
  const daily: TaskKind[] = ['bookkeeping', 'dailyOrdering', 'booting'];
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
    return WORKER_RATES[worker.tier ?? 'experienced'];
  }
  return 1;
}

/** Can this man take this task on today? Everybody who books minutes works it off minute by
 *  minute, the office out of its own 480 and the helper off the clock (CLAUDE.md T2 3.8, T17
 *  2.3). */
function canTakeOn(state: GameState, worker: Worker, task: TaskInstance): boolean {
  if (!TASK_DEFINITIONS[task.kind].autoRoles.includes(worker.role)) return false;
  // The client will not sit down with a salesman until the company is known (CLAUDE.md T7 3.11).
  if (task.kind === 'clientMeeting' && state.reputation < MEETING_SALESMAN_REPUTATION) return false;
  // One job of work at a time, whoever he is, and only the office has a meter of its own to run
  // out of (CLAUDE.md T17 2.3).
  if (worker.taskId !== null) return false;
  if (hasWorkingDay(worker.role) && staffMinutesLeft(worker) <= 0) return false;
  if (task.kind === 'materialTakeOff' && worker.role === 'estimator') {
    // As many as his minutes allow, and none before the drawing it reads. The count of jobs a day
    // is gone: his 480 minutes above are the whole of the cap now, so a quicker man and a laptop
    // with Joinery Core on it both show in the pile he gets through (PIOTR; CLAUDE.md T20 2.3).
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

/** The first man in today of these roles, in the order they are named: who does a job of office
 *  work without the owner being asked for it. The one reading of a role ranking outside
 *  `bestTakerOf`, which ranks a task's own `autoRoles`; this is for the work that is not a task at
 *  all, which tonight means the material order a job's finished drawings call for
 *  (CLAUDE.md T21 2.5.2). */
export function firstOnDutyOf(
  state: GameState,
  roles: readonly WorkerRole[],
): Worker | null {
  for (const role of roles) {
    const found = state.workers.find(
      (worker) => worker.role === role && isWorkingToday(state, worker),
    );
    if (found !== undefined) return found;
  }
  return null;
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

// ---------------------------------------------------------------------------
// The week's meters (CLAUDE.md T20 2.7). One sample a minute of what every man on the books was
// doing, into the meters `src/engine/staff.ts` keeps on him. It hangs off `assignStaffTasks`
// because that is the one hook the day already runs over the whole crew every minute; the sample
// is guarded by the day and the minute it was taken on, so a minute the state settles more than
// once is never counted twice. A line of its own in `settle` was not taken: one hook over the
// crew is one code path, and two would be two (REPORT-T20.md, what was not done).
// ---------------------------------------------------------------------------

/** Which of the six bands of a man's week a job of work falls in. The desk is the office and the
 *  drawing board; the van and the rack are the unloading; the broom and the spanner are the
 *  cleaning; the tape measure is the site (CLAUDE.md T20 2.7). */
export const WEEK_CATEGORY_OF_TASK: Record<TaskKind, WeekCategory> = {
  emails: 'desk',
  bookkeeping: 'desk',
  dailyOrdering: 'desk',
  clientCall: 'desk',
  clientMeeting: 'desk',
  design: 'desk',
  materialTakeOff: 'desk',
  websiteUpkeep: 'desk',
  hiring: 'desk',
  booting: 'desk',
  siteMeasure: 'site',
  unload: 'unloading',
  fetchStorage: 'unloading',
  deliver: 'unloading',
  emptyBags: 'cleaning',
  cleaning: 'cleaning',
  service: 'cleaning',
  repair: 'cleaning',
  moveMachines: 'cleaning',
};

/** What this man was at this minute, or null while he was standing about. */
function bandOf(state: GameState, taskId: string | null, jobId: string | null): WeekCategory | null {
  if (taskId !== null) {
    const task = findTask(state, taskId);
    return task ? WEEK_CATEGORY_OF_TASK[task.kind] : null;
  }
  if (jobId === null) return null;
  // A man on a contract carries its marker in `jobId`, which is no job of the board's: if the
  // jobs do not know it, he is on the standing work (CLAUDE.md T13 3.16).
  return state.jobs.some((job) => job.id === jobId) ? 'jobs' : 'contracts';
}

/** The name of the job he stood at this minute, for the list on his row. */
function jobNameOf(state: GameState, jobId: string | null): string | null {
  if (jobId === null) return null;
  return state.jobs.find((job) => job.id === jobId)?.name ?? null;
}

/** Books one minute onto one man's week: the minute he was paid for, and the band it went into if
 *  he actually worked it. The clock paid for it and his own counters say whether he put anything
 *  into it: a joiner standing at an empty rack keeps his job and raises neither, so his week reads
 *  the hours he was there and the nothing he did with them (CLAUDE.md T20 2.7). */
function bookOne(
  state: GameState,
  holder: Worker | OwnerState,
  week: number,
  band: WeekCategory | null,
  jobName: string | null,
): { meters: WeekMeters; worked: boolean } | null {
  const meters = weekMetersOf(holder, week);
  if (meters.day === state.clock.day && meters.minute === state.clock.minute) return null;
  const effort = effortSoFar(holder);
  // His task counter goes back to nought every morning, so the day's first sample takes a
  // baseline off it and credits nothing; the bench counter never goes back.
  const sameDay = meters.day === state.clock.day;
  const worked = effort.bench > meters.seenBench || (sameDay && effort.task > meters.seenTask);
  meters.seenBench = effort.bench;
  meters.seenTask = effort.task;
  meters.day = state.clock.day;
  meters.minute = state.clock.minute;
  meters.paidMinutes += 1;
  if (!worked) return { meters, worked };
  if (band !== null) meters.minutes[band] += 1;
  if (jobName !== null && !meters.jobs.includes(jobName) && meters.jobs.length < WEEK_JOBS_KEPT) {
    meters.jobs.push(jobName);
  }
  return { meters, worked };
}

/** The pieces a standing contract turned out since the last sample, shared among the men who are
 *  on it: a piece two men made is half of each man's week (CLAUDE.md T20 2.7). What it had counted
 *  last time is `piecesSeenByTheWeek`, on the contract itself, so it is cloned and saved with it
 *  and two games can never read each other's count. */
function bookContractPieces(state: GameState, week: number): void {
  for (const contract of state.contracts) {
    const seen = contract.piecesSeenByTheWeek;
    contract.piecesSeenByTheWeek = contract.piecesMade;
    if (seen === undefined || contract.piecesMade <= seen) continue;
    const hands = state.workers.filter((worker) => contract.assigned.includes(worker.id));
    if (hands.length === 0) continue;
    const share = (contract.piecesMade - seen) / hands.length;
    for (const worker of hands) weekMetersOf(worker, week).pieces += share;
  }
}

/** One sample of the minute just worked, over the owner and everybody on the books. */
export function bookWeekMinutes(state: GameState): void {
  const week = weekOfDay(state.clock.day);
  const owner = state.owner;
  if (ownerIsAvailable(state)) {
    const job = state.jobs.find((entry) => entry.assignees.includes(OWNER)) ?? null;
    const band = bandOf(state, owner.currentTaskId, job?.id ?? null);
    const sample = bookOne(state, owner, week, band, job?.name ?? null);
    // The minutes he stood are the other half of his day, and this is the hook that already knows
    // whether the minute just gone was worked at all (PIOTR, 19.09: "my time runs two to three times
    // slower than the clock"; CLAUDE.md T21 2.8). The reasons themselves are read in
    // `src/engine/production.ts`, which is the module that knows who is standing and why.
    if (sample !== null && !sample.worked) bookOwnerIdleMinute(state);
  }
  // Five o'clock and the men have gone home. The clock runs on for the owner and for nobody else,
  // so nobody else is paid for the evening or counted through it (CLAUDE.md T17 2.12).
  if (!crewHasGoneHome(state)) {
    for (const worker of state.workers) {
      // The day shift, and only the day shift: the night runs its own minute loop and never
      // settles, so a man on it is left out of the meters rather than sampled through a day he
      // was asleep for (REPORT-T20.md, what was not done).
      if (!isWorkingToday(state, worker)) continue;
      const band = bandOf(state, worker.taskId, worker.jobId);
      const sample = bookOne(state, worker, week, band, jobNameOf(state, worker.jobId));
      // And the other half of his day, the same way the owner's is taken above: a minute he put
      // nothing into is a minute he stood, and from Turn 23 the commonest reason for it is that
      // nobody has put him on anything (PIOTR, 20.09; CLAUDE.md T23 2.1).
      if (sample !== null && !sample.worked) {
        bookWorkerIdleMinute(state, worker);
        // And what he stood for, when it was a machine with no place for him: the week keeps it
        // by family, so his card can say how much of it was no place at the edgebander and the
        // player can see whether a second one would pay (PIOTR, 20.09; v37; CLAUDE.md T25 2.3).
        const family = worker.noPlaceFor === '' ? null : worker.noPlaceFor;
        if (family !== null) {
          const meters = weekMetersOf(worker, week);
          const waited = (meters.waitedFor ??= {});
          waited[family] = (waited[family] ?? 0) + 1;
        }
      }
    }
  }
  bookContractPieces(state, week);
}

/** A worker on the books takes the tasks his role covers, and the owner never sees them. Every
 *  man who can take one on books minutes into it, so nothing is cleared here: the minute runner
 *  finishes it and applies what it does (CLAUDE.md T17 2.3).
 *
 *  What somebody started stays his: a task still marked for a man who is in today is handed back
 *  to that man and never passed round the workshop by rank (CLAUDE.md T17 2.14). One the owner put
 *  down is the office's again while he is not holding it. */
/** True while the pass is running. `createTask` runs the pass so nothing waits for 8:00, and the
 *  pass must not be able to run itself again from inside itself: it hands work out and creates
 *  none, so this is a guard against a future change and not against today's code
 *  (CLAUDE.md T21 2.5.3). */
let assigning = false;

export function assignStaffTasks(state: GameState): void {
  const started = state.workers.filter((worker) => isWorkingToday(state, worker));
  if (started.length === 0) return;
  assigning = true;
  try {
    handOutTasks(state, started);
  } finally {
    assigning = false;
  }
}

function handOutTasks(state: GameState, started: readonly Worker[]): void {
  for (const task of state.tasks) {
    if (task.done) continue;
    if (task.doneBy !== null) {
      const holder = started.find((worker) => worker.id === task.doneBy);
      if (holder !== undefined) {
        if (holder.taskId === null) holder.taskId = task.id;
        continue;
      }
      if (task.doneBy !== 'owner' || state.owner.currentTaskId === task.id) continue;
    }
    if (task.kind === 'unload' && task.deliveryId !== null && !canUnload(state)) continue;
    const staff = bestTakerOf(state, started, task);
    if (!staff) continue;
    // He picks it up and works it off as the clock runs, like the owner does.
    staff.taskId = task.id;
    task.doneBy = staff.id;
  }
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
  ignoreBusy = false,
): TaskStartCheck {
  const task = findTask(state, taskId);
  if (!task) return refused('That job of work has gone');
  if (task.done) return refused('Done');
  // A service is called in and paid for, never worked off: Turn 8's half hour at the spanner went
  // with the rule of CLAUDE.md T20 2.9, and `applyTaskCompletion` has no service case any more.
  // The reminder stays on the list so the player sees the machine is due, and it points him at
  // the one path that services it: the Machines page, or the choice on the event
  // (`callServiceIn`), both of which close this task.
  if (task.kind === 'service') return refused(SERVICE_IS_CALLED_IN);
  if (!ownerIsAvailable(state)) return refused('The owner is not in today');
  // The unloading, the bags and the cleaning are the helper's while he is here.
  if (!force && isHelperTask(state, task)) return refused(WAITING_FOR_HELPER);
  // One thing at a time: the current task has to be finished or paused first (CLAUDE.md 10.1).
  const current = state.owner.currentTaskId;
  if (!ignoreBusy && current !== null && current !== task.id) {
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

/** He stops working on what he is holding. A task he has put minutes into stays marked as his, so
 *  he picks it up again in the morning without being assigned it (CLAUDE.md T17 2.14); one he
 *  never started goes back on the list for whoever is free. Either way the office can still take
 *  a task of its own off him while he is not holding it: `assignStaffTasks` says so. */
export function pauseOwnerTask(state: GameState): void {
  const taskId = state.owner.currentTaskId;
  if (taskId) {
    const task = findTask(state, taskId);
    if (task && !task.done && task.minutesRemaining >= task.minutesTotal) task.doneBy = null;
  }
  state.owner.currentTaskId = null;
  // Putting something down on purpose ends whatever the phone was going to send him back to.
  state.owner.resumeTaskId = null;
}

/** The morning: what he started yesterday and did not finish is his again, and he carries on with
 *  it where he left it, without being assigned it (PIOTR, 16.09; CLAUDE.md T17 2.14). */
export function resumeStartedTask(state: GameState): void {
  if (!ownerIsAvailable(state)) return;
  if (state.owner.currentTaskId !== null) return;
  const held = state.tasks.find(
    (task) => !task.done && task.doneBy === 'owner' && task.minutesRemaining < task.minutesTotal,
  );
  if (held) startTask(state, held.id, true);
}

/** Calls and emails die at dusk, done or not, and nothing carries over: the client has rung off
 *  and the inbox is a day older (PIOTR, 16.09; CLAUDE.md T17 2.15). The punishment is already in
 *  the client's rating for the unanswered call and the unread email, so nothing else is added
 *  here: the emails that are dropped are counted onto the job first, because the penalty at
 *  delivery is counted off the emails still open (CLAUDE.md T2 3.5). */
export function dropDuskTasks(state: GameState): void {
  const gone = state.tasks.filter(
    (task) => !task.done && (task.kind === 'clientCall' || task.kind === 'emails'),
  );
  if (gone.length === 0) return;
  const ids = new Set(gone.map((task) => task.id));
  for (const task of gone) {
    if (task.kind !== 'emails' || task.jobId === null) continue;
    const job = state.jobs.find((entry) => entry.id === task.jobId);
    if (job) job.emailsUnanswered += 1;
  }
  state.tasks = state.tasks.filter((task) => !ids.has(task.id));
  for (const worker of state.workers) {
    if (worker.taskId !== null && ids.has(worker.taskId)) worker.taskId = null;
  }
  const owner = state.owner;
  if (owner.currentTaskId !== null && ids.has(owner.currentTaskId)) owner.currentTaskId = null;
  if (owner.resumeTaskId !== null && ids.has(owner.resumeTaskId)) owner.resumeTaskId = null;
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

/** The tasks the player ticked on the laptop, queued for the owner in the order he ticked them:
 *  the first is started now and the rest wait their turn (CLAUDE.md T17 2.16). Anything already
 *  done, already queued or not the owner's to take is left out. */
export function queueTasks(state: GameState, taskIds: readonly string[]): boolean {
  const wanted = taskIds.filter((id) => {
    const task = findTask(state, id);
    return task !== null && task !== undefined && !task.done;
  });
  if (wanted.length === 0) return false;
  state.taskQueue = wanted.filter((id, at) => wanted.indexOf(id) === at);
  startNextQueued(state);
  return true;
}

/** True while this job of work would start if only his hands were free: every refusal but the
 *  busy one. What "Add as next" is allowed to offer, and what the queue is allowed to take
 *  (CLAUDE.md T19 2.12). */
export function canQueueTask(state: GameState, taskId: string): boolean {
  return startTaskCheck(state, taskId, false, true).ok;
}

/** One more task behind the one he is on, instead of putting that one down: the laptop's
 *  "Add as next" (PIOTR, 17.09; CLAUDE.md T19 2.12). With nothing running it simply starts. A task
 *  already in the queue is not queued twice; one already running is left alone. */
export function queueTaskNext(state: GameState, taskId: string): boolean {
  const task = findTask(state, taskId);
  if (task === null || task.done) return false;
  if (state.owner.currentTaskId === taskId) return false;
  if (state.taskQueue.includes(taskId)) return false;
  // Only a job of work whose one refusal is that his hands are full. The queue's head is started
  // without being asked again, so anything refused for a second reason would sit at the front of
  // it and stop everything behind it for the rest of the day (found by the Turn 19 review; the
  // busy refusal is tested above the licence, the unloading and the take off, so it hides them).
  if (!canQueueTask(state, taskId)) return false;
  state.taskQueue.push(taskId);
  startNextQueued(state);
  return true;
}

/** The next one he ticked. Whatever is done or gone falls off the front of the queue, and the head
 *  of it is started the moment his hands are free: the queue waits while the phone has him, and
 *  the call he was interrupted with sends him back to it when it is over (CLAUDE.md T17 2.16). */
export function startNextQueued(state: GameState): void {
  state.taskQueue = state.taskQueue.filter((id) => {
    const task = findTask(state, id);
    return task !== null && !task.done;
  });
  const next = state.taskQueue[0];
  if (next === undefined || state.owner.currentTaskId !== null) return;
  startTask(state, next);
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
