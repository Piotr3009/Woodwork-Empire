// The engine entry points. `tick` and `applyAction` clone the incoming state and return the clone:
// callers never see their input mutated. Every other engine module mutates the state it is given.

import {
  BENCH_SLOT_LAYOUT,
  CANTEEN_SLOT_LAYOUT,
  DIFFICULTIES,
  LOCKER_SLOT_LAYOUT,
  MAX_MINUTES_PER_DAY,
  MINUTES_PER_WORKING_DAY,
  OVERDRAFT_LIMIT,
  OWNER_LABOUR_PER_MINUTE,
  REPUTATION_START,
  SOFTWARE_ONE_OFF_JOBS,
  SOFTWARE_ONE_OFF_PRICE,
  SOFTWARE_TURN1_TIER,
  STARTING_LAYOUT,
  STATE_VERSION,
} from './constants';
import { expireEnquiries, refillBoard, refreshLocks } from './board';
import { isDayExhausted, isWorkingDay } from './clock';
import { canAfford, pay, runDayCosts } from './economy';
import { isPaused, openNextEvent, queueEvent } from './events';
import {
  countOf,
  findSpec,
  hallProductivityFactor,
  has,
  machinesStopped,
  specOf,
} from './machines';
import {
  acceptEnquiry,
  addLabour,
  assignJob,
  chargeSiteMeasure,
  checkOverdueJobs,
  findJob,
  oldestReadyJob,
  onDeliveryArrived,
  onDeliveryUnloaded,
  onMaterialOrdered,
  refreshJob,
  setMaterialMode,
} from './jobs';
import { arriveDeliveries, findDelivery } from './materials';
import {
  ownerEfficiency,
  ownerIsAvailable,
  runOwnerDayStart,
  setTomorrowFatigue,
  spendOwnerMinute,
  staffOutputFactor,
} from './owner';
import { makeId } from './rng';
import { autoAssignJobs, hire, runStaffDayStart, sawRatioFactor } from './staff';
import {
  advanceOwnerTask,
  assignStaffTasks,
  createDailyTasks,
  findTask,
  pauseOwnerTask,
  startTask,
} from './tasks';
import type {
  Delivery,
  Difficulty,
  GameAction,
  GameState,
  PeriodTotals,
  Speed,
  TaskInstance,
} from './types';

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
      overtimeMinutes: 0,
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
    productionMinutesMonth: 0,
    gameOver: null,
  };
  startDay(state);
  settle(state);
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
  owner.wentHome = false;
  owner.currentTaskId = null;
  owner.productionJobId = null;
  owner.present = true;
  owner.stayHome = false;
  state.dayStats = {
    jobsAdvanced: [],
    jobsCompleted: [],
    productionMinutes: 0,
    dustAtStart: state.dust,
  };
  runDayCosts(state, state.clock.day);
  runOwnerDayStart(state);
  runStaffDayStart(state);
  expireEnquiries(state);
  refillBoard(state);
  const arriving = arriveDeliveries(state);
  checkOverdueJobs(state);
  for (const delivery of arriving) onDeliveryArrived(state, delivery.jobId);
  createDailyTasks(state);
  assignStaffTasks(state);
  queueDeliveryEvents(state, arriving);
}

/** A lorry at the gate is a decision: unload now, or leave it standing there (CLAUDE.md 10.1). */
function queueDeliveryEvents(state: GameState, arriving: Delivery[]): void {
  for (const delivery of arriving) {
    const task = state.tasks.find((entry) => entry.deliveryId === delivery.id && !entry.done);
    if (!task) continue;
    queueEvent(state, {
      kind: 'deliveryArrived',
      title: 'Delivery at the gate',
      body: `${delivery.sheets} sheets have arrived. Nothing can be made until they are inside.`,
      choices: [
        { id: 'unload', label: `Unload now, ${task.minutesTotal} min` },
        { id: 'later', label: 'Leave it at the gate' },
      ],
      data: { deliveryId: delivery.id, taskId: task.id, sheets: delivery.sheets },
    });
  }
}

/** Ends the working day and opens the summary. The player clicks on to the next day. */
function finishDay(state: GameState): void {
  pauseOwnerTask(state);
  setTomorrowFatigue(state);
  state.owner.wentHome = true;
  state.owner.productionJobId = null;
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
  let weekendCosts = 0;
  for (const weekendDay of skipped) {
    state.clock.day = weekendDay;
    const before = state.cash;
    runDayCosts(state, weekendDay);
    weekendCosts += before - state.cash;
  }
  state.clock.day = day;
  state.clock.minute = 0;
  if (skipped.length > 0) {
    queueEvent(state, {
      kind: 'weekend',
      title: 'Weekend',
      body: `${skipped.length} days off. Rent and rates ran anyway.`,
      choices: [{ id: 'ok', label: 'Monday then' }],
      data: { days: skipped.length, costs: Math.round(weekendCosts) },
    });
  }
  startDay(state);
}

/** What a finished task does to the rest of the world. */
function applyTaskCompletion(state: GameState, task: TaskInstance): void {
  const job = task.jobId ? findJob(state, task.jobId) : null;
  switch (task.kind) {
    case 'clientCall':
    case 'design':
      if (job) refreshJob(state, job);
      break;
    case 'siteMeasure':
      if (job) {
        chargeSiteMeasure(state, job);
        refreshJob(state, job);
      }
      break;
    case 'materialOrder':
      if (job) onMaterialOrdered(state, job);
      break;
    case 'unload': {
      const delivery = task.deliveryId ? findDelivery(state, task.deliveryId) : null;
      if (delivery) {
        delivery.unloaded = true;
        onDeliveryUnloaded(state, delivery.jobId);
      }
      break;
    }
    default:
      // Emails, bookkeeping, ordering and staff management only cost minutes.
      break;
  }
}

/** One minute of work, at the clock's current minute, before time moves on. */
function runMinute(state: GameState): void {
  const owner = state.owner;
  if (!ownerIsAvailable(state) || owner.currentTaskId === null) return;
  const task = findTask(state, owner.currentTaskId);
  if (!task || task.done) {
    owner.currentTaskId = null;
    return;
  }
  spendOwnerMinute(state, task.category);
  const finished = advanceOwnerTask(state, ownerEfficiency(state));
  if (finished) applyTaskCompletion(state, finished);
}

/** Everything derived that has to be true before the state is handed back. */
function settle(state: GameState): void {
  refreshLocks(state);
  autoAssignJobs(state);
  openNextEvent(state);
}

/** Production, by the owner at the bench and by every joiner on a job. */
function runProductionMinute(state: GameState): void {
  if (machinesStopped(state)) return;
  const hall = hallProductivityFactor(state);
  let worked = false;
  const ownerJobId = state.owner.productionJobId;
  if (ownerJobId !== null && ownerIsAvailable(state)) {
    const job = findJob(state, ownerJobId);
    if (job && job.stage === 'inProduction') {
      spendOwnerMinute(state, 'workshop');
      worked = true;
      addLabour(state, job, OWNER_LABOUR_PER_MINUTE * ownerEfficiency(state) * hall);
    } else {
      state.owner.productionJobId = null;
    }
  }
  // Staff work the normal day only: nobody but the owner does overtime.
  if (state.clock.minute < MINUTES_PER_WORKING_DAY) {
    const staffFactor = staffOutputFactor(state);
    for (const worker of state.workers) {
      if (worker.role !== 'joiner' || worker.jobId === null) continue;
      if (worker.absentDaysRemaining > 0 || worker.startDay > state.clock.day) continue;
      const job = findJob(state, worker.jobId);
      if (!job || job.stage !== 'inProduction') {
        worker.jobId = null;
        continue;
      }
      worked = true;
      const rate = worker.rate * sawRatioFactor(state, worker);
      addLabour(state, job, OWNER_LABOUR_PER_MINUTE * rate * hall * staffFactor);
    }
  }
  if (worked) {
    state.dayStats.productionMinutes += 1;
    state.productionMinutesMonth += 1;
  }
}

function advanceMinute(state: GameState): void {
  runMinute(state);
  runProductionMinute(state);
  state.clock.minute += 1;
  if (shouldFinishDay(state)) finishDay(state);
  settle(state);
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
    case 'deliveryArrived':
      if (choiceId === 'unload') {
        const taskId = event.data.taskId;
        if (typeof taskId === 'string') startTask(state, taskId);
      }
      break;
    default:
      break;
  }
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
        pauseOwnerTask(next);
        next.owner.wentHome = true;
        next.owner.productionJobId = null;
      }
      break;
    case 'SKIP_DAY':
      next.owner.present = false;
      next.owner.stayHome = true;
      pauseOwnerTask(next);
      next.owner.productionJobId = null;
      break;
    case 'START_TASK':
      startTask(next, action.taskId);
      break;
    case 'ACCEPT_ENQUIRY':
      acceptEnquiry(next, action.enquiryId, action.byHand);
      break;
    case 'SET_MATERIAL_MODE':
      setMaterialMode(next, action.jobId, action.mode);
      break;
    case 'WORK_HERE': {
      const job = action.jobId ? findJob(next, action.jobId) : oldestReadyJob(next);
      if (job) assignJob(next, job.id, 'owner');
      break;
    }
    case 'ASSIGN_JOB':
      assignJob(next, action.jobId, action.workerId);
      break;
    case 'HIRE':
      hire(next, action.role, action.tier);
      break;
    case 'PAUSE_TASK':
      pauseOwnerTask(next);
      break;
    case 'BUY_EQUIPMENT':
      buyEquipment(next, action.specId);
      break;
    case 'BUY_SOFTWARE':
      buySoftware(next, action.mode);
      break;
    case 'RESOLVE_EVENT':
      resolveEvent(next, action.choiceId);
      break;
    default:
      break;
  }
  settle(next);
  return next;
}


// ---------------------------------------------------------------------------
// Buying from the day 1 catalogue. The catalogue queries live in machines.ts, the payment in
// economy.ts: the transaction that needs both lives here.
// ---------------------------------------------------------------------------


export interface BuyCheck {
  ok: boolean;
  reason: string;
}

const OK: BuyCheck = { ok: true, reason: '' };

/** One reason per refusal, used by the catalogue modal and by the buy action itself. */
export function canBuy(state: GameState, specId: string): BuyCheck {
  const spec = findSpec(specId);
  if (!spec) return { ok: false, reason: 'Not in the catalogue' };
  if (spec.locked) return { ok: false, reason: spec.lockReason };
  if (state.reputation < spec.minReputation) {
    return { ok: false, reason: `Needs reputation ${spec.minReputation}` };
  }
  for (const required of spec.requires) {
    if (!has(state, required)) {
      const name = findSpec(required)?.name ?? required;
      return { ok: false, reason: `Needs ${name} first` };
    }
  }
  if (!spec.stackable && has(state, specId)) return { ok: false, reason: 'Already owned' };
  if (specId === 'workbench' && countOf(state, 'workbench') >= state.unit.benchSlots) {
    return { ok: false, reason: 'No free bench slot in this unit' };
  }
  if (!canAfford(state, spec.price)) return { ok: false, reason: 'Not enough cash' };
  return OK;
}

function slotFrom(slots: readonly { x: number; y: number }[], index: number): { x: number; y: number } {
  const slot = slots[Math.min(index, slots.length - 1)];
  return slot ? { x: slot.x, y: slot.y } : { x: 0, y: 0 };
}

/** Fixed placement from constants. Free placement by the player is parked (CLAUDE.md 14.9). */
function anchorFor(state: GameState, specId: string): { x: number; y: number } {
  const index = countOf(state, specId);
  if (specId === 'workbench') return slotFrom(BENCH_SLOT_LAYOUT, index);
  if (specId === 'locker') return slotFrom(LOCKER_SLOT_LAYOUT, index);
  if (specId === 'canteenSeat') return slotFrom(CANTEEN_SLOT_LAYOUT, index);
  const slot = STARTING_LAYOUT[specId];
  const base = slot ? { x: slot.yard === true ? state.unit.widthTiles + slot.x : slot.x, y: slot.y } : { x: 0, y: 6 };
  // A second machine of the same kind stands beside the first.
  return { x: base.x + index * 2, y: base.y };
}

export function buyEquipment(state: GameState, specId: string): BuyCheck {
  const check = canBuy(state, specId);
  if (!check.ok) return check;
  const spec = specOf(specId);
  const anchor = anchorFor(state, specId);
  pay(state, 'equipment', spec.name, spec.price);
  state.equipment.push({
    id: makeId(state, 'kit'),
    specId,
    spriteKey: spec.spriteKey,
    anchorX: anchor.x,
    anchorY: anchor.y,
    minutesUsed: 0,
    bagFull: false,
    broken: false,
    purchasePrice: spec.price,
  });
  return OK;
}

/** Management software: one-off for 30 jobs, or a subscription billed on the 1st (CLAUDE.md 9.2). */
export function canBuySoftware(state: GameState, mode: 'oneOff' | 'subscription'): BuyCheck {
  if (!has(state, 'laptop')) return { ok: false, reason: 'Needs a laptop first' };
  if (mode === 'oneOff' && !canAfford(state, SOFTWARE_ONE_OFF_PRICE)) {
    return { ok: false, reason: 'Not enough cash' };
  }
  return OK;
}

export function buySoftware(state: GameState, mode: 'oneOff' | 'subscription'): BuyCheck {
  const check = canBuySoftware(state, mode);
  if (!check.ok) return check;
  if (mode === 'oneOff') {
    pay(state, 'software', 'Management software, one off', SOFTWARE_ONE_OFF_PRICE);
    state.software = {
      mode: 'oneOff',
      tier: SOFTWARE_TURN1_TIER,
      jobsRemaining: SOFTWARE_ONE_OFF_JOBS,
    };
    return OK;
  }
  state.software = { mode: 'subscription', tier: SOFTWARE_TURN1_TIER, jobsRemaining: 0 };
  return OK;
}

export const MAX_DAY_MINUTES = MAX_MINUTES_PER_DAY;
