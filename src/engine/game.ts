// The engine entry points. `tick` and `applyAction` clone the incoming state and return the clone:
// callers never see their input mutated. Every other engine module mutates the state it is given.

import {
  ACCIDENT_CHANCE_PER_DAY,
  ACCIDENT_DAYS_OFF,
  BENCH_SLOT_LAYOUT,
  CANTEEN_SLOT_LAYOUT,
  DESK_LAYOUT,
  DIFFICULTIES,
  EXTRACTOR_REPAIR_COST,
  HELPER_CLEAN_WEEKDAY,
  LOCKER_SLOT_LAYOUT,
  MINUTES_PER_WORKING_DAY,
  OWNER_LABOUR_PER_MINUTE,
  REPUTATION_START,
  SOFTWARE_ONE_OFF_JOBS,
  SOFTWARE_ONE_OFF_PRICE,
  SOFTWARE_TURN1_TIER,
  STARTING_LAYOUT,
  TEMP_STORAGE_COST,
  STATE_VERSION,
} from './constants';
import { expireEnquiries, refillBoard, refreshLocks } from './board';
import { daysBetween, isDayExhausted, isOvertime, isWorkingDay, weekOfDay, weekday } from './clock';
import {
  canAfford,
  emptyBooked,
  emptyTotals,
  formatMoney,
  pay,
  payArrears,
  runDayCosts,
  writeUpBooks,
} from './economy';
import { isPaused, openNextEvent, queueEvent } from './events';
import {
  accidentRisk,
  accumulateBagMinutes,
  addDust,
  bagBlocked,
  breakExtractor,
  clearDust,
  countOf,
  emptyBag,
  extractorBreakdownChance,
  findSpec,
  hallProductivityFactor,
  has,
  machinesStopped,
  repairExtractor,
  specOf,
} from './machines';
import {
  acceptEnquiry,
  addLabour,
  assignJob,
  chargeSiteMeasure,
  checkOverdueJobs,
  deliverJob,
  findJob,
  jobProgress,
  jobSpeedFactor,
  oldestReadyJob,
  onDeliveryArrived,
  orderTransport,
  ownerJob,
  onDeliveryUnloaded,
  onMaterialOrdered,
  refreshJob,
  releaseJob,
  runBookedTransport,
  setMaterialMode,
} from './jobs';
import {
  arriveDeliveries,
  buyStock,
  canUnload,
  drawSheetsFor,
  fetchFromStorage,
  findDelivery,
  moveOverflowToStorage,
  rackCapacity,
  stockIsLow,
  unloadIntoStock,
  writeOffSheetsLeftOutside,
} from './materials';
import {
  ownerEfficiency,
  ownerIsAvailable,
  ownerMinutesLeft,
  runOwnerDayStart,
  setTomorrowFatigue,
  spendOwnerMinute,
  staffOutputFactor,
} from './owner';
import { chance, int, makeId } from './rng';
import {
  autoAssignJobs,
  availableJoiners,
  helpers,
  hire,
  isWorkingToday,
  joiners,
  runStaffDayStart,
  sawRatioFactor,
} from './staff';
import {
  AD_HOC_TASK_MINUTES,
  advanceOwnerTask,
  advanceTask,
  assignStaffTasks,
  assignWorkerTask,
  createDailyTasks,
  createTask,
  findTask,
  pauseOwnerTask,
  startTask,
} from './tasks';
import type {
  Delivery,
  Difficulty,
  Equipment,
  Job,
  MaterialKind,
  GameAction,
  GameState,
  Speed,
  TaskInstance,
} from './types';

/** The one plural in the engine copy: "1 sheet", "2 sheets" (CLAUDE.md T2 3.11). */
export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

export interface NewGameOptions {
  seed: number;
  difficulty: Difficulty;
  playerName: string;
  companyName: string;
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
      depositHeld: 0,
    },
    owner: {
      present: true,
      minutesByCategory: { admin: 0, design: 0, workshop: 0 },
      minutesWorked: 0,
      overtimeMinutes: 0,
      fatigue: 0,
      wentHome: false,
      currentTaskId: null,
      sickDaysRemaining: 0,
      sickStartDay: null,
      stayHome: false,
    },
    software: { mode: 'none', tier: 'basic', jobsRemaining: 0 },
    stock: { sheets: 0, tempStorageSheets: 0 },
    equipment: [],
    workers: [],
    enquiries: [],
    jobs: [],
    tasks: [],
    deliveries: [],
    finance: {
      overdraftLimit: spec.overdraftLimit,
      arrearsAmount: 0,
      arrearsMonths: 0,
      firstArrearsDay: null,
      day: emptyTotals(),
      week: emptyTotals(),
      month: emptyTotals(),
      booked: emptyBooked(),
    },
    ledger: [],
    eventQueue: [],
    activeEvent: null,
    dayStats: { jobsAdvanced: [], jobsCompleted: [], dustAtStart: 0, noMaterialWarned: false },
    lastExpressDay: null,
    lastLowStockDay: null,
    booksUpToDay: 0,
    lateAccountsMonths: 0,
    productionMinutesMonth: 0,
    gameOver: null,
  };
  startDay(state);
  settle(state);
  return state;
}

/** The day ends at the twelve hour wall, or at 16:00 once the owner is not there to work the
 *  overtime. After 16:00 with the owner still in, it is his decision: the End day button
 *  (CLAUDE.md 7.2). */
function shouldFinishDay(state: GameState): boolean {
  if (isDayExhausted(state.clock.minute)) return true;
  if (!isOvertime(state.clock.minute)) return false;
  return !ownerIsAvailable(state);
}

/** Nobody is left to work the rest of the day: the owner is at home and no member of staff is on
 *  the books and fit today (Turn 2 brief 3.1). */
function hallIsEmpty(state: GameState): boolean {
  if (ownerIsAvailable(state)) return false;
  return !state.workers.some((worker) => isWorkingToday(state, worker));
}

/** Resets everything that is scoped to one day and charges what the new day owes. */
function startDay(state: GameState): void {
  const owner = state.owner;
  owner.minutesByCategory = { admin: 0, design: 0, workshop: 0 };
  owner.minutesWorked = 0;
  owner.wentHome = false;
  owner.currentTaskId = null;
  owner.present = true;
  owner.stayHome = false;
  state.dayStats = {
    jobsAdvanced: [],
    jobsCompleted: [],
    dustAtStart: state.dust,
    noMaterialWarned: false,
  };
  runDayCosts(state, state.clock.day);
  runOwnerDayStart(state);
  runStaffDayStart(state);
  expireEnquiries(state);
  refillBoard(state);
  const lost = writeOffSheetsLeftOutside(state);
  if (lost > 0) {
    queueEvent(state, {
      kind: 'stockOverflow',
      title: 'The yard is empty',
      body: `${lost} sheets left outside overnight have gone. Written off.`,
      data: { sheets: lost },
    });
  }
  if (state.stock.tempStorageSheets > 0) {
    createTask(state, {
      kind: 'fetchStorage',
      label: `Fetch ${state.stock.tempStorageSheets} sheets from storage`,
      minutes: AD_HOC_TASK_MINUTES.fetchStorage,
    });
  }
  const arriving = arriveDeliveries(state);
  runBookedTransport(state);
  checkOverdueJobs(state);
  for (const delivery of arriving) onDeliveryArrived(state, delivery.jobId);
  createDailyTasks(state);
  runExtractorBreakdown(state);
  checkLowStock(state);
  runAccidentRoll(state);
  runHelperClean(state);
  delegateTasks(state);
  queueDeliveryEvents(state, arriving);
}

/** The extractor can give up, and the filthier the hall the likelier it is (CLAUDE.md 9.6). */
function runExtractorBreakdown(state: GameState): void {
  if (machinesStopped(state)) return;
  if (!chance(state, extractorBreakdownChance(state))) return;
  const extractor = breakExtractor(state);
  if (!extractor) return;
  const task = ensureTask(state, 'repairExtractor', 'Repair the extractor', extractor.id);
  const choices = [{ id: 'owner', label: `Fix it yourself, ${task.minutesTotal} min` }];
  if (joiners(state).length > 0) {
    choices.push({ id: 'joiner', label: `Send a joiner, ${task.minutesTotal} min` });
  }
  choices.push({ id: 'later', label: 'Leave it' });
  queueEvent(state, {
    kind: 'extractorBroken',
    title: 'The extractor has stopped',
    body:
      `Every machine in the hall is dead until it is fixed, and the dust piles up faster. ` +
      `The parts cost ${formatMoney(EXTRACTOR_REPAIR_COST)}.`,
    choices,
    data: { equipmentId: extractor.id, taskId: task.id },
  });
}

/** A dangerous hall hurts somebody sooner or later (CLAUDE.md 9.7). */
function runAccidentRoll(state: GameState): void {
  if (!accidentRisk(state)) return;
  const crew = joiners(state).filter((worker) => worker.absentDaysRemaining === 0);
  if (crew.length === 0) return;
  if (!chance(state, ACCIDENT_CHANCE_PER_DAY)) return;
  const worker = crew[int(state, 0, crew.length - 1)];
  if (!worker) return;
  worker.absentDaysRemaining = ACCIDENT_DAYS_OFF;
  const job = worker.jobId ? findJob(state, worker.jobId) : null;
  if (job) releaseJob(state, job);
  queueEvent(state, {
    kind: 'accident',
    title: 'Accident in the hall',
    body: `${worker.name} has been hurt in all that mess. He is off for ${ACCIDENT_DAYS_OFF} days.`,
    data: { workerId: worker.id, days: ACCIDENT_DAYS_OFF },
  });
}

/** A helper cleans every Friday at no cost to the owner (CLAUDE.md 9.7). */
function runHelperClean(state: GameState): void {
  if (helpers(state).length === 0) return;
  if (weekday(state.clock.day) !== HELPER_CLEAN_WEEKDAY) return;
  ensureTask(state, 'cleaning', 'Weekly clean', null);
}

/** A lorry at the gate is a decision: unload now, or leave it standing there (CLAUDE.md 10.1).
 *  Clicking the van in the hall asks the same question again. */
function queueDeliveryEvents(state: GameState, arriving: Delivery[]): void {
  for (const delivery of arriving) {
    const task = state.tasks.find((entry) => entry.deliveryId === delivery.id && !entry.done);
    if (!task) continue;
    const room = canUnload(state);
    const choices = room
      ? [
          { id: 'unload', label: `Unload now, ${task.minutesTotal} min` },
          { id: 'later', label: 'Leave it at the gate' },
        ]
      : [{ id: 'later', label: 'Leave it at the gate' }];
    const body = room
      ? `${plural(delivery.sheets, 'sheet', 'sheets')} have arrived. Nothing can be made until ` +
        'they are inside.'
      : `${plural(delivery.sheets, 'sheet', 'sheets')} have arrived and there is no shelving to ` +
        'put them on. Buy some from the catalogue.';
    queueEvent(state, {
      kind: 'deliveryArrived',
      title: 'Delivery at the gate',
      body,
      choices,
      data: { deliveryId: delivery.id, taskId: task.id, sheets: delivery.sheets },
    });
  }
}

/** Ends the working day and opens the summary. The player clicks on to the next day. */
function finishDay(state: GameState): void {
  pauseOwnerTask(state);
  setTomorrowFatigue(state);
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
  while (!isWorkingDay(day)) day += 1;
  const skipped = daysBetween(state.clock.day, day);
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
      body:
        `${skipped.length} days off. Rent and rates ran anyway: ` +
        `${formatMoney(weekendCosts)} out.`,
      choices: [{ id: 'ok', label: 'Monday then' }],
      data: { days: skipped.length, costs: Math.round(weekendCosts) },
    });
  }
  startDay(state);
}

/** Finds the open task of this kind for this machine, or puts one on the list. */
function ensureTask(
  state: GameState,
  kind: 'cleaning' | 'repairExtractor' | 'bagChange',
  label: string,
  equipmentId: string | null,
): TaskInstance {
  const open = state.tasks.find(
    (task) => task.kind === kind && !task.done && task.equipmentId === equipmentId,
  );
  if (open) return open;
  return createTask(state, {
    kind,
    label,
    minutes: AD_HOC_TASK_MINUTES[kind],
    equipmentId,
  });
}

/** Hands a task to the owner, or to a joiner at the cost of his production minutes. */
function delegateAdHocTask(state: GameState, task: TaskInstance, choiceId: string): void {
  if (choiceId === 'owner') {
    startTask(state, task.id);
    return;
  }
  if (choiceId === 'joiner') {
    const joiner = availableJoiners(state)[0] ?? joiners(state)[0];
    if (joiner) assignWorkerTask(state, joiner.id, task.id);
  }
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
    case 'bagChange':
      if (task.equipmentId) emptyBag(state, task.equipmentId);
      break;
    case 'cleaning':
      clearDust(state);
      break;
    case 'bookkeeping':
      writeUpBooks(state);
      break;
    case 'repairExtractor':
      repairExtractor(state);
      pay(state, 'repair', 'Extractor repair', EXTRACTOR_REPAIR_COST);
      break;
    case 'fetchStorage':
      fetchFromStorage(state);
      break;
    case 'deliver':
      if (job) deliverJob(state, job);
      break;
    case 'unload': {
      const delivery = task.deliveryId ? findDelivery(state, task.deliveryId) : null;
      if (delivery) {
        delivery.unloaded = true;
        // Every delivery lands on the rack, per job orders included (CLAUDE.md T2 3.6).
        const overflow = unloadIntoStock(state, delivery);
        if (overflow > 0) raiseStockOverflow(state, delivery, overflow);
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
/** Staff pick up what their role covers, and what they finish takes effect. */
function delegateTasks(state: GameState): void {
  for (const task of assignStaffTasks(state)) applyTaskCompletion(state, task);
}

function settle(state: GameState): void {
  refreshLocks(state);
  delegateTasks(state);
  autoAssignJobs(state);
  openNextEvent(state);
}

/** Production, by the owner at the bench and by every joiner on a job. */
/** A joiner on a bag change or a repair is not at his bench. True when he spent the minute. */
function runWorkerTaskMinute(state: GameState, workerId: string, taskId: string): boolean {
  const task = findTask(state, taskId);
  const worker = state.workers.find((entry) => entry.id === workerId);
  if (!worker) return false;
  if (!task || task.done) {
    worker.taskId = null;
    return false;
  }
  if (advanceTask(task, 1)) {
    worker.taskId = null;
    applyTaskCompletion(state, task);
  }
  return true;
}

/** The rack has to hand over what the next slice of work needs, or the job stands still and the
 *  joiners stand around (CLAUDE.md T2 3.6). */
function materialReady(state: GameState, job: Job): boolean {
  const ok = drawSheetsFor(state, job, jobProgress(job));
  job.waitingForMaterial = !ok;
  if (!ok) raiseNoMaterial(state);
  return ok;
}

function raiseNoMaterial(state: GameState): void {
  if (state.dayStats.noMaterialWarned) return;
  state.dayStats.noMaterialWarned = true;
  queueEvent(state, {
    kind: 'noMaterial',
    title: 'No material',
    body: 'Your joiners are standing around laughing. No material. The wages run anyway.',
  });
}

/** A rack under a tenth full is worth a word in the morning, once a week (CLAUDE.md T2 3.6).
 *  It never interrupts the working day: the line under the hall carries the live figure. */
function checkLowStock(state: GameState): void {
  if (!stockIsLow(state)) return;
  if (!state.jobs.some((job) => job.stage !== 'completed')) return;
  const week = weekOfDay(state.clock.day);
  if (state.lastLowStockDay !== null && weekOfDay(state.lastLowStockDay) === week) return;
  state.lastLowStockDay = state.clock.day;
  queueEvent(state, {
    kind: 'lowStock',
    title: 'The rack is nearly empty',
    body:
      `${plural(state.stock.sheets, 'sheet', 'sheets')} left of ` +
      `${rackCapacity(state)}. Order material before the benches stop.`,
    data: { sheets: state.stock.sheets },
  });
}

function runProductionMinute(state: GameState): void {
  const hall = hallProductivityFactor(state);
  const stopped = machinesStopped(state);
  let worked = false;
  const materials = new Set<MaterialKind>();
  const atTheBench = state.owner.currentTaskId === null ? ownerJob(state) : null;
  if (
    atTheBench &&
    ownerIsAvailable(state) &&
    !stopped &&
    !bagBlocked(state, atTheBench.materialKind) &&
    materialReady(state, atTheBench)
  ) {
    spendOwnerMinute(state, 'workshop');
    worked = true;
    materials.add(atTheBench.materialKind);
    const minute = (OWNER_LABOUR_PER_MINUTE * ownerEfficiency(state) * hall) /
      jobSpeedFactor(state, atTheBench);
    addLabour(state, atTheBench, minute);
  }
  // Staff work the normal day only: nobody but the owner does overtime.
  if (!isOvertime(state.clock.minute)) {
    const staffFactor = staffOutputFactor(state);
    for (const worker of state.workers) {
      if (!isWorkingToday(state, worker)) continue;
      if (worker.taskId !== null) {
        runWorkerTaskMinute(state, worker.id, worker.taskId);
        continue;
      }
      if (worker.role !== 'joiner' || worker.jobId === null) continue;
      const job = findJob(state, worker.jobId);
      if (!job || job.stage !== 'inProduction') {
        worker.jobId = null;
        continue;
      }
      if (stopped || bagBlocked(state, job.materialKind)) continue;
      if (!materialReady(state, job)) continue;
      worked = true;
      materials.add(job.materialKind);
      const rate = worker.rate * sawRatioFactor(state, worker);
      const minute = (OWNER_LABOUR_PER_MINUTE * rate * hall * staffFactor) /
        jobSpeedFactor(state, job);
      addLabour(state, job, minute);
    }
  }
  if (!worked) return;
  state.productionMinutesMonth += 1;
  addDust(state, 1);
  for (const material of materials) {
    for (const machine of accumulateBagMinutes(state, material)) raiseBagFull(state, machine);
  }
}

/** Sheets that do not fit on the rack: leave them out and lose them, or pay to store them
 *  (CLAUDE.md 8.9). */
function raiseStockOverflow(state: GameState, delivery: Delivery, overflow: number): void {
  queueEvent(state, {
    kind: 'stockOverflow',
    title: 'The rack is full',
    body:
      `${overflow} sheets do not fit. Left in the yard they will be gone by morning. ` +
      `Temporary storage is ${formatMoney(TEMP_STORAGE_COST)} now and ` +
      `${AD_HOC_TASK_MINUTES.fetchStorage} min to fetch them back.`,
    choices: [
      { id: 'storage', label: `Pay ${formatMoney(TEMP_STORAGE_COST)} for storage` },
      { id: 'outside', label: 'Leave them in the yard' },
    ],
    data: { deliveryId: delivery.id, sheets: overflow },
  });
}

/** A full bag stops the machine. A helper deals with it for nothing, otherwise somebody has to
 *  give up 15 minutes (CLAUDE.md 9.6). */
function raiseBagFull(state: GameState, machine: Equipment): void {
  const name = findSpec(machine.specId)?.name ?? machine.specId;
  const task = ensureTask(state, 'bagChange', `Bag change: ${name}`, machine.id);
  if (helpers(state).length > 0) {
    // The helper takes it, free and without asking.
    delegateTasks(state);
    return;
  }
  const choices = [];
  if (ownerIsAvailable(state) && ownerMinutesLeft(state) > 0) {
    choices.push({ id: 'owner', label: `Change it yourself, ${task.minutesTotal} min` });
  }
  if (joiners(state).length > 0) {
    choices.push({
      id: 'joiner',
      label: `Send a joiner, ${task.minutesTotal} min off his bench`,
    });
  }
  choices.push({ id: 'later', label: 'Leave the machine stopped' });
  queueEvent(state, {
    kind: 'bagFull',
    title: `Bag full: ${name.toLowerCase()}`,
    body: 'The machine has stopped. Nothing of this kind gets made until the bag is changed.',
    choices,
    data: { equipmentId: machine.id, taskId: task.id },
  });
}

function advanceMinute(state: GameState): void {
  runMinute(state);
  runProductionMinute(state);
  state.clock.minute += 1;
  if (shouldFinishDay(state)) finishDay(state);
  settle(state);
}

export interface TickResult {
  state: GameState;
  /** Minutes actually advanced. Fewer than asked when an event opened or the company ended. */
  minutesRun: number;
}

/** One tick is one game minute (CLAUDE.md 4). An event that opens part way through stops the run
 *  and the caller is told how many minutes went in, so the rest is not lost (Turn 2 brief 3.1). */
export function runMinutes(state: GameState, minutes: number): TickResult {
  const next = clone(state);
  let minutesRun = 0;
  for (let i = 0; i < minutes; i += 1) {
    if (isPaused(next)) break;
    advanceMinute(next);
    minutesRun += 1;
  }
  return { state: next, minutesRun };
}

export function tick(state: GameState, minutes: number): GameState {
  return runMinutes(state, minutes).state;
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
    case 'stockOverflow': {
      const deliveryId = event.data.deliveryId;
      const delivery = typeof deliveryId === 'string' ? findDelivery(state, deliveryId) : null;
      if (delivery && choiceId === 'storage') moveOverflowToStorage(state, delivery);
      break;
    }
    case 'jobAtGate': {
      const jobId = event.data.jobId;
      if (choiceId === 'transport' && typeof jobId === 'string') {
        if (orderTransport(state, jobId)) {
          const task = state.tasks.find(
            (entry) => entry.kind === 'deliver' && entry.jobId === jobId && !entry.done,
          );
          if (task) startTask(state, task.id);
        }
      }
      break;
    }
    case 'bagFull':
    case 'extractorBroken': {
      const taskId = event.data.taskId;
      const task = typeof taskId === 'string' ? findTask(state, taskId) : null;
      if (task) delegateAdHocTask(state, task, choiceId);
      break;
    }
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
      }
      break;
    case 'SKIP_DAY':
      next.owner.present = false;
      next.owner.stayHome = true;
      pauseOwnerTask(next);
      // A day off with nobody in the hall is not worth watching: straight to the summary.
      if (hallIsEmpty(next)) finishDay(next);
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
    case 'ASK_UNLOAD': {
      const delivery = findDelivery(next, action.deliveryId);
      if (delivery && delivery.arrived && !delivery.unloaded) {
        queueDeliveryEvents(next, [delivery]);
      }
      break;
    }
    case 'ASK_BAG_CHANGE': {
      const machine = next.equipment.find((item) => item.id === action.equipmentId);
      if (machine && machine.bagFull) raiseBagFull(next, machine);
      break;
    }
    case 'START_CLEANING': {
      const task = ensureTask(next, 'cleaning', 'Clean the hall', null);
      startTask(next, task.id);
      break;
    }
    case 'REPAIR_EXTRACTOR': {
      const extractor = next.equipment.find((item) => item.specId === 'extractor');
      if (extractor && extractor.broken) {
        const task = ensureTask(next, 'repairExtractor', 'Repair the extractor', extractor.id);
        startTask(next, task.id);
      }
      break;
    }
    case 'PAUSE_TASK':
      pauseOwnerTask(next);
      break;
    case 'BUY_EQUIPMENT':
      buyEquipment(next, action.specId);
      break;
    case 'BUY_SOFTWARE':
      buySoftware(next, action.mode);
      break;
    case 'BUY_STOCK':
      buyStock(next, action.sheets);
      break;
    case 'PAY_ARREARS':
      payArrears(next, action.amount);
      break;
    case 'ORDER_TRANSPORT': {
      if (orderTransport(next, action.jobId)) {
        const task = next.tasks.find(
          (entry) => entry.kind === 'deliver' && entry.jobId === action.jobId && !entry.done,
        );
        if (task) startTask(next, task.id);
      }
      break;
    }
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
  const desk = DESK_LAYOUT.find((object) => object.id === specId);
  if (desk) return { x: desk.x, y: desk.y };
  const slot = STARTING_LAYOUT[specId];
  const base = slot
    ? { x: slot.yard === true ? state.unit.widthTiles + slot.x : slot.x, y: slot.y }
    : { x: 0, y: 6 };
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
