// The engine entry points. `tick` and `applyAction` clone the incoming state and return the clone:
// callers never see their input mutated. Every other engine module mutates the state it is given.

import {
  ACCIDENT_CHANCE_PER_DAY,
  ACCIDENT_DAYS_OFF,
  BENCH_SLOT_LAYOUT,
  BREAK_MINUTES,
  BREAK_SKIP_FACTOR,
  BREAK_START_MINUTE,
  CABINET_SLOT_LAYOUT,
  DAY_SUMMARIES_MAX,
  CANTEEN_SLOT_LAYOUT,
  DAY_END_MINUTE,
  DIFFICULTIES,
  GATE_LANE,
  HELPER_CLEAN_WEEKDAY,
  LOCKER_SLOT_LAYOUT,
  DUCTING_RECONNECT_COST,
  MOVE_MINUTES_PER_ITEM,
  MOVING_SPEED,
  OVERTIME_DEBT_PER_DAY,
  REPUTATION_START,
  SERVICE_INTERVAL_HOURS,
  SOFTWARE_ONE_OFF_JOBS,
  SOFTWARE_ONE_OFF_PRICE,
  SOFTWARE_TURN1_TIER,
  STARTING_LAYOUT,
  TEMP_STORAGE_COST,
  TOOL_CABINET,
  STATE_VERSION,
} from './constants';
import { expireEnquiries, refillBoard, refreshLocks } from './board';
import { missCall, nextDueCall, takeCall } from './calls';
import { canPlaceSpec, firstFreeCell, moveItem } from './layout';
import {
  daysBetween,
  isDayExhausted,
  isFriday,
  isLastWorkingDayOfMonth,
  isBreak,
  isOvertime,
  isWorkingDay,
  monthOfDay,
  weekOfDay,
  weekday,
} from './clock';
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
  accumulateMachineMinute,
  addDust,
  breakExtractor,
  clearDust,
  countOf,
  emptyBag,
  enduranceHoursFor,
  breakMachine,
  extractorBreakdownChance,
  extractorBroken,
  OWNER,
  ductedMoves,
  findSpec,
  freeBenches,
  hallProductivityFactor,
  has,
  hasBenchFor,
  machinesDueService,
  overdueBreakdownChance,
  repairCostFor,
  releaseMachines,
  releaseMachinesExcept,
  repairMachine,
  requiresFor,
  requiresOneOfFor,
  standsInTheHall,
  zoneOf,
  serviceCostFor,
  serviceMachine,
  serviceableMachines,
  specOf,
  variantOf,
} from './machines';
import {
  acceptEnquiry,
  addLabour,
  assignJob,
  chargeSiteMeasure,
  checkOverdueJobs,
  deliverJob,
  findJob,
  hallBlock,
  jobProgress,
  jobStage,
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
  transportLabel,
} from './jobs';
import {
  arriveDeliveries,
  buyStock,
  canUnload,
  deliveriesArrivingOn,
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
  chargeOvertimeDebt,
  countOvertimeMinute,
  nextDayLabourFactor,
  ownerEfficiency,
  ownerIsAvailable,
  ownerMinutesLeft,
  ownerMinutesToday,
  runOwnerDayStart,
  spendOwnerMinute,
  staffOutputFactor,
} from './owner';
import { chance, int, makeId } from './rng';
import { labourPerMinute } from './stages';
import { plural } from './text';
import { STATION_IDLE, STATION_NO_BENCH, stationForTask } from './stations';
import {
  type Hand,
  jobOf,
  releaseIdleMachines,
  stationForProduction,
  takeMachines,
} from './production';
import {
  autoAssignJobs,
  availableJoiners,
  hasWorkingDay,
  helpers,
  hire,
  isWorkingToday,
  joiners,
  runStaffDayStart,
  staffMinutesLeft,
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
  interruptOwnerWith,
  movePending,
  movingMachines,
  pauseOwnerTask,
  resumeOwnerTask,
  startTask,
} from './tasks';
import type {
  DaySummary,
  Delivery,
  Difficulty,
  Equipment,
  GameEventChoice,
  Job,
  GameAction,
  GameState,
  PeriodTotals,
  Speed,
  TaskInstance,
  Worker,
} from './types';


export interface NewGameOptions {
  seed: number;
  difficulty: Difficulty;
  playerName: string;
  companyName: string;
  /** The real life notes are on unless the player turned them off on the start screen. */
  showWhy: boolean;
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
    showWhy: options.showWhy,
    clock: { day: 1, minute: 0 },
    speed: 0,
    cash: spec.startingCash,
    reputation: REPUTATION_START,
    dust: 0,
    unit: {
      areaM2: spec.areaM2,
      widthCells: spec.widthCells,
      depthCells: spec.depthCells,
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
      labourFactor: 1,
      overtimeDebt: 0,
      breakSkipped: false,
      breakAsked: false,
      homeAsked: false,
      wentHome: false,
      currentTaskId: null,
      resumeTaskId: null,
      sickDaysRemaining: 0,
      sickStartDay: null,
      stayHome: false,
      station: STATION_IDLE,
      productionMinutes: 0,
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
    dayStats: {
      jobsAdvanced: [],
      jobsCompleted: [],
      dustAtStart: 0,
      noMaterialWarned: false,
      labourValue: 0,
      workMinutes: 0,
    },
    days: [],
    lastExpressDay: null,
    lastLowStockDay: null,
    booksUpToDay: 0,
    lateAccountsMonths: 0,
    productionMinutesMonth: 0,
    movedItems: [],
    speedBeforeMove: null,
    summaryCadence: 'daily',
    gameOver: null,
  };
  startDay(state);
  settle(state);
  return state;
}

/** The day ends at 19:00 whoever wants what, or at 17:00 once the owner is not there to work the
 *  overtime. Between the two it is his decision, taken on the end of day event or the End day
 *  button (CLAUDE.md T6 3.4). */
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

/** A move the day ended in the middle of is picked up again in the morning, or the hall would be
 *  half shifted for ever and could never be set out again (CLAUDE.md T4 3.5). */
function resumeMove(state: GameState): void {
  const move = movePending(state);
  if (move === null || move.doneBy !== null) return;
  if (ownerIsAvailable(state)) {
    startTask(state, move.id);
    return;
  }
  const hand =
    availableJoiners(state)[0] ?? helpers(state).find((worker) => isWorkingToday(state, worker));
  if (hand) assignWorkerTask(state, hand.id, move.id);
}

/** Resets everything that is scoped to one day and charges what the new day owes. */
function startDay(state: GameState): void {
  const owner = state.owner;
  owner.minutesByCategory = { admin: 0, design: 0, workshop: 0 };
  owner.minutesWorked = 0;
  owner.wentHome = false;
  owner.currentTaskId = null;
  owner.resumeTaskId = null;
  owner.present = true;
  owner.stayHome = false;
  state.dayStats = {
    jobsAdvanced: [],
    jobsCompleted: [],
    dustAtStart: state.dust,
    noMaterialWarned: false,
    labourValue: 0,
    workMinutes: 0,
  };
  // Nobody stands at a machine overnight: the hall starts the day with every one of them free
  // (CLAUDE.md T7 3.1).
  releaseMachinesExcept(state, []);
  runDayCosts(state, state.clock.day);
  runOwnerDayStart(state);
  runStaffDayStart(state);
  resumeMove(state);
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
  runServiceDue(state);
  runOverdueBreakdowns(state);
  checkLowStock(state);
  runAccidentRoll(state);
  runHelperClean(state);
  delegateTasks(state);
  queueDeliveryEvents(state, arriving);
}

/** Who can be sent at a job of work, as choices on the event that raised it. Nobody who is not
 *  in the hall today is offered: the choice would do nothing (CLAUDE.md T2 3.8). */
function adHocChoices(
  state: GameState,
  minutesTotal: number,
  ownerLabel: string,
  leaveLabel = 'Leave it',
): GameEventChoice[] {
  const choices: GameEventChoice[] = [];
  if (ownerIsAvailable(state) && ownerMinutesLeft(state) > 0) {
    choices.push({ id: 'owner', label: `${ownerLabel}, ${minutesTotal} min` });
  }
  if (joiners(state).some((worker) => isWorkingToday(state, worker))) {
    choices.push({ id: 'joiner', label: `Send a joiner, ${minutesTotal} min` });
  }
  choices.push({ id: 'later', label: leaveLabel });
  return choices;
}

/** Anything in the hall can give up. The extractor goes on dust, everything else on a service it
 *  never had (CLAUDE.md 9.6 and T2 3.9). */
function raiseMachineBroken(state: GameState, machine: Equipment): void {
  const name = findSpec(machine.specId)?.name ?? machine.specId;
  const task = ensureTask(state, 'repair', `Repair the ${name.toLowerCase()}`, machine.id);
  const body =
    machine.specId === 'extractor'
      ? 'The hall runs at a quarter speed until it is fixed, and the dust piles up three times ' +
        `as fast. The parts cost ${formatMoney(repairCostFor(machine))}.`
      : `Nothing that goes through it gets made until it is fixed. The parts cost ` +
        `${formatMoney(repairCostFor(machine))}.`;
  queueEvent(state, {
    kind: 'machineBroken',
    title: `${name} has stopped`,
    body,
    choices: adHocChoices(state, task.minutesTotal, 'Fix it yourself'),
    data: { equipmentId: machine.id, taskId: task.id },
  });
}

function runExtractorBreakdown(state: GameState): void {
  if (extractorBroken(state)) return;
  if (!chance(state, extractorBreakdownChance(state))) return;
  const extractor = breakExtractor(state);
  if (!extractor) return;
  raiseMachineBroken(state, extractor);
}

/** A machine wants a service once a month, and one that never gets it gives up (CLAUDE.md T2 3.9). */
function runServiceDue(state: GameState): void {
  for (const machine of machinesDueService(state)) {
    if (machine.broken) continue;
    const name = findSpec(machine.specId)?.name ?? machine.specId;
    const open = state.tasks.some(
      (task) => task.kind === 'service' && task.equipmentId === machine.id && !task.done,
    );
    if (open) continue;
    const task = ensureTask(state, 'service', `Service the ${name.toLowerCase()}`, machine.id);
    queueEvent(state, {
      kind: 'serviceDue',
      title: `Service due: ${name.toLowerCase()}`,
      body:
        `It has ${SERVICE_INTERVAL_HOURS} hours on it since the last one. The parts and the oil come to ` +
        `${formatMoney(serviceCostFor(machine))}. Left alone it will give up in the middle of a ` +
        'job.',
      choices: adHocChoices(state, task.minutesTotal, 'Do it yourself'),
      data: { equipmentId: machine.id, taskId: task.id },
    });
  }
}

function runOverdueBreakdowns(state: GameState): void {
  for (const machine of serviceableMachines(state)) {
    if (!chance(state, overdueBreakdownChance(machine))) continue;
    const broken = breakMachine(state, machine.id);
    if (broken) raiseMachineBroken(state, broken);
  }
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

/** Whether today's summary is one the player asked to see. Daily is every day, weekly is Friday
 *  and monthly is the last working day of the month (CLAUDE.md T4 3.6). */
export function showsDaySummary(state: GameState): boolean {
  if (state.summaryCadence === 'weekly') return isFriday(state.clock.day);
  if (state.summaryCadence === 'monthly') return isLastWorkingDayOfMonth(state.clock.day);
  return true;
}

/** The figures the summary carries: the day, the week or the month (CLAUDE.md T4 3.6). The one
 *  place the cadence is turned into a span of money. */
export function summaryTotals(state: GameState): PeriodTotals {
  if (state.summaryCadence === 'weekly') return state.finance.week;
  if (state.summaryCadence === 'monthly') return state.finance.month;
  return state.finance.day;
}

/** The title the summary carries, which says what span of figures is in it. */
export function summaryTitle(state: GameState): string {
  if (state.summaryCadence === 'weekly') return `End of week ${weekOfDay(state.clock.day)}`;
  if (state.summaryCadence === 'monthly') return `End of month ${monthOfDay(state.clock.day)}`;
  return `End of day ${state.clock.day}`;
}

/** The day as the summary reads it: the evening writes one of these into the state and the modal
 *  is built from it, so what the Days tab opens is what the player saw (CLAUDE.md T6 3.9). */
export function daySummaryOf(state: GameState): DaySummary {
  const owner = state.owner;
  const totals = summaryTotals(state);
  return {
    day: state.clock.day,
    title: summaryTitle(state),
    minutesByCategory: { ...owner.minutesByCategory },
    minutesWorked: owner.minutesWorked,
    minutesAvailable: ownerMinutesToday(state),
    overtimeMinutes: owner.overtimeMinutes,
    tomorrowFactor: nextDayLabourFactor(state),
    breakSkipped: owner.breakSkipped,
    spanLabel: state.summaryCadence,
    income: totals.income,
    costs: totals.costs,
    cash: state.cash,
    jobsAdvanced: state.dayStats.jobsAdvanced.length,
    jobsCompleted: state.dayStats.jobsCompleted.map(
      (jobId) => findJob(state, jobId)?.name ?? jobId,
    ),
    dustAtStart: state.dayStats.dustAtStart,
    dustAtEnd: state.dust,
    deliveriesTomorrow: deliveriesArrivingOn(state, state.clock.day + 1).map(
      (delivery) => delivery.sheets,
    ),
    labourValue: state.dayStats.labourValue,
    workMinutes: state.dayStats.workMinutes,
  };
}

/** Written once, when the day closes, whether the summary is put in front of him or not. */
function recordDay(state: GameState): void {
  const summary = daySummaryOf(state);
  state.days = state.days.filter((entry) => entry.day !== summary.day);
  state.days.push(summary);
  if (state.days.length > DAY_SUMMARIES_MAX) {
    state.days.splice(0, state.days.length - DAY_SUMMARIES_MAX);
  }
}

/** Ends the working day. The summary is put in front of the player as often as he asked for it,
 *  and the day ends the same way either way: only the modal is skipped (CLAUDE.md T4 3.6). */
function finishDay(state: GameState): void {
  const ending =
    state.activeEvent?.kind === 'dayEnd' || state.eventQueue.some((event) => event.kind === 'dayEnd');
  if (ending) return;
  pauseOwnerTask(state);
  chargeOvertimeDebt(state);
  state.owner.wentHome = true;
  recordDay(state);
  if (!showsDaySummary(state)) {
    advanceToNextDay(state);
    return;
  }
  queueEvent(state, {
    kind: 'dayEnd',
    title: summaryTitle(state),
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
  kind: 'cleaning' | 'repair' | 'service' | 'bagChange',
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
    const joiner =
      availableJoiners(state)[0] ?? joiners(state).find((entry) => isWorkingToday(state, entry));
    if (joiner) assignWorkerTask(state, joiner.id, task.id);
  }
}

/** What a finished task does to the rest of the world. */
function applyTaskCompletion(state: GameState, task: TaskInstance): void {
  const job = task.jobId ? findJob(state, task.jobId) : null;
  switch (task.kind) {
    case 'clientCall':
      // The phone is down: back to whatever it took him off (CLAUDE.md T4 3.3).
      resumeOwnerTask(state);
      break;
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
    case 'moveMachines':
      chargeDucting(state);
      // The same as a call: he goes back to whatever the move took him off.
      resumeOwnerTask(state);
      break;
    case 'bookkeeping':
      writeUpBooks(state);
      break;
    case 'repair': {
      const machine = task.equipmentId
        ? state.equipment.find((item) => item.id === task.equipmentId)
        : null;
      if (machine) {
        const name = findSpec(machine.specId)?.name ?? machine.specId;
        pay(state, 'repair', `${name} repair`, repairCostFor(machine));
        repairMachine(state, machine.id);
      }
      break;
    }
    case 'service': {
      const machine = task.equipmentId
        ? state.equipment.find((item) => item.id === task.equipmentId)
        : null;
      if (machine) {
        const name = findSpec(machine.specId)?.name ?? machine.specId;
        pay(state, 'repair', `${name} service`, serviceCostFor(machine));
        serviceMachine(state, machine.id);
      }
      break;
    }
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

/** A drag is a move only while the item is not standing where it started. Dragging it out and
 *  back again, however many drags it takes, costs nothing (CLAUDE.md T4 3.5). */
function recordMove(state: GameState, item: Equipment, stood: { x: number; y: number }): void {
  const index = state.movedItems.findIndex((moved) => moved.itemId === item.id);
  if (index < 0) {
    if (item.anchorX === stood.x && item.anchorY === stood.y) return;
    state.movedItems.push({ itemId: item.id, fromX: stood.x, fromY: stood.y });
    return;
  }
  const start = state.movedItems[index];
  if (start && item.anchorX === start.fromX && item.anchorY === start.fromY) {
    state.movedItems.splice(index, 1);
  }
}

/** Every moved machine that is ducted into the extraction has to be reconnected, and that is
 *  paid for when the move is finished. The flexi system never needs it (CLAUDE.md T4 3.5). */
function chargeDucting(state: GameState): void {
  for (const item of ductedMoves(state)) {
    const name = findSpec(item.specId)?.name ?? item.specId;
    pay(
      state,
      'ducting',
      `Ducting reconnection: ${name.toLowerCase()}`,
      DUCTING_RECONNECT_COST,
    );
  }
  state.movedItems = [];
  // The clock goes back to the speed the player left it on before the move took it (T4 3.5).
  if (state.speedBeforeMove !== null) {
    state.speed = state.speedBeforeMove;
    state.speedBeforeMove = null;
  }
}

/** Leaving setup mode with the kit moved: the move is a job of work in the hall, an hour an item,
 *  and the clock runs itself at 4x until it is done (CLAUDE.md T4 3.5). */
function endSetup(state: GameState, speed: Speed): void {
  state.speed = speed;
  if (state.movedItems.length === 0) return;
  if (movePending(state) !== null) return;
  state.speedBeforeMove = speed;
  const task = createTask(state, {
    kind: 'moveMachines',
    label: `Moving machines: ${plural(state.movedItems.length, 'item', 'items')}`,
    minutes: state.movedItems.length * MOVE_MINUTES_PER_ITEM,
  });
  // The owner moved the kit, so the owner shifts it, whatever else he was holding. A joiner or
  // the helper can be sent instead while the owner is not in.
  if (ownerIsAvailable(state)) {
    interruptOwnerWith(state, task);
    return;
  }
  const hand =
    availableJoiners(state)[0] ?? helpers(state).find((worker) => isWorkingToday(state, worker));
  if (hand) assignWorkerTask(state, hand.id, task.id);
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

/** Where everybody is standing, worked out from what they are doing (CLAUDE.md T2 3.3). */
function updateStations(state: GameState): void {
  const owner = state.owner;
  // At dinner the workshop is in the canteen. The owner is with them unless he said he would
  // work through it, and then he is the only one on the floor (CLAUDE.md T6 3.4).
  const dinner = isBreak(state.clock.minute);
  if (dinner && !owner.breakSkipped) {
    owner.station = STATION_IDLE;
    for (const worker of state.workers) worker.station = STATION_IDLE;
    return;
  }
  if (!ownerIsAvailable(state)) {
    owner.station = STATION_IDLE;
  } else if (owner.currentTaskId !== null) {
    const task = findTask(state, owner.currentTaskId);
    owner.station = task ? stationForTask(state, task) : STATION_IDLE;
  } else if (ownerJob(state) !== null) {
    const job = ownerJob(state);
    owner.station =
      job === null
        ? STATION_IDLE
        : hasBenchFor(state, job.id)
          ? stationForProduction(state, OWNER, job)
          : STATION_NO_BENCH;
  } else {
    owner.station = STATION_IDLE;
  }
  for (const worker of state.workers) {
    if (dinner || !isWorkingToday(state, worker)) {
      worker.station = STATION_IDLE;
      continue;
    }
    if (worker.taskId !== null) {
      const task = findTask(state, worker.taskId);
      worker.station = task ? stationForTask(state, task) : STATION_IDLE;
      continue;
    }
    const job = worker.jobId ? findJob(state, worker.jobId) : null;
    if (job && job.stage === 'inProduction') {
      worker.station = hasBenchFor(state, job.id)
        ? stationForProduction(state, worker.id, job)
        : STATION_NO_BENCH;
      continue;
    }
    // A joiner with work waiting and nowhere to do it stands at the canteen door (T4 3.4).
    const stuck =
      worker.role === 'joiner' && freeBenches(state) === 0 && oldestReadyJob(state) !== null;
    worker.station = stuck ? STATION_NO_BENCH : STATION_IDLE;
  }
}

function settle(state: GameState): void {
  refreshLocks(state);
  // Nobody holds a machine he is not standing at (CLAUDE.md T7 3.1).
  releaseIdleMachines(state);
  // Nothing else happens while the hall is being moved, and the clock runs itself (T4 3.5).
  if (movingMachines(state) !== null) state.speed = MOVING_SPEED;
  // The helper needs no minutes, so he would clear a bag change in the middle of his dinner. He
  // gets his break like everybody else, and the list is there for him when he is back.
  if (!isBreak(state.clock.minute)) delegateTasks(state);
  autoAssignJobs(state);
  updateStations(state);
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
  if (hasWorkingDay(worker.role) && staffMinutesLeft(worker) <= 0) {
    // His day is full. What is left of the task waits for tomorrow, or for the owner.
    worker.taskId = null;
    task.doneBy = null;
    return false;
  }
  worker.minutesWorked += 1;
  if (advanceTask(task, 1, state.clock.day)) {
    worker.taskId = null;
    if (task.kind === 'materialOrder' && worker.role === 'purchasingClerk') {
      worker.ordersToday += 1;
    }
    applyTaskCompletion(state, task);
  }
  return true;
}

/** The rack has to hand over what the next slice of work needs, or the job stands still and the
 *  joiners stand around (CLAUDE.md T2 3.6). */
function materialReady(state: GameState, job: Job): boolean {
  const ok = drawSheetsFor(state, job, jobProgress(job));
  if (!ok) {
    job.blockedBy = 'waiting for material';
    raiseNoMaterial(state);
  }
  return ok;
}

/** True when the job can be worked on this minute. Writes down why it cannot, either way. */
function canWorkOn(state: GameState, job: Job): boolean {
  const block = hallBlock(state, job);
  job.blockedBy = block;
  if (block !== '') return false;
  return materialReady(state, job);
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

/** Everybody who could put a minute into a job this minute, the owner first. The staff minute
 *  goes on their own jobs of work first, because a man on a bag change is not at his bench
 *  (CLAUDE.md T2 3.8). */
function handsAtWork(state: GameState, ownerOnTask: boolean, moving: boolean): Hand[] {
  const list: Hand[] = [];
  const atTheBench =
    !ownerOnTask && !moving && state.owner.currentTaskId === null ? jobOf(state, OWNER) : null;
  if (atTheBench && ownerIsAvailable(state)) {
    list.push({ who: OWNER, job: atTheBench, rate: ownerEfficiency(state) });
  }
  // Staff work the normal day only: nobody but the owner does overtime, and they always take
  // their dinner even on a day the owner works through his (CLAUDE.md T6 3.4).
  if (isOvertime(state.clock.minute) || isBreak(state.clock.minute)) return list;
  const staffFactor = staffOutputFactor(state);
  for (const worker of state.workers) {
    if (!isWorkingToday(state, worker)) continue;
    if (worker.taskId !== null) {
      runWorkerTaskMinute(state, worker.id, worker.taskId);
      continue;
    }
    if (moving) continue;
    if (worker.role !== 'joiner' || worker.jobId === null) continue;
    const job = findJob(state, worker.jobId);
    if (!job || job.stage !== 'inProduction') {
      worker.jobId = null;
      continue;
    }
    list.push({ who: worker.id, job, rate: worker.rate * staffFactor });
  }
  return list;
}

/** What the hall says a man is waiting for, in the words the job card and the Work Plan use. */
function waitingLine(specId: string): string {
  return `waiting for ${(findSpec(specId)?.name ?? specId).toLowerCase()}`;
}

function runProductionMinute(state: GameState, ownerOnTask: boolean): void {
  const hall = hallProductivityFactor(state);
  // Every bench waits while the machines are being shifted about (CLAUDE.md T4 3.5).
  const moving = movingMachines(state) !== null;
  const working = handsAtWork(state, ownerOnTask, moving);
  // Anybody who is not at a job this minute walks away from whatever he was standing at, so the
  // next man can have it (CLAUDE.md T7 3.1).
  releaseMachinesExcept(state, working.map((hand) => hand.who));
  let worked = false;
  // The minutes somebody actually stood at each machine: that, and nothing else, is what wears
  // it out and fills its bag (CLAUDE.md T7 2).
  const used = new Map<string, number>();
  for (const hand of working) {
    if (!canWorkOn(state, hand.job)) {
      releaseMachines(state, hand.who);
      continue;
    }
    const stage = jobStage(state, hand.job);
    if (stage === null) continue;
    const at = takeMachines(state, hand);
    if (at.waitingFor !== null) {
      // He stands at the machine until the man on it is done with it (CLAUDE.md T7 3.1).
      hand.job.blockedBy = waitingLine(at.waitingFor);
      continue;
    }
    const worker = state.workers.find((entry) => entry.id === hand.who);
    if (worker) {
      worker.productionMinutes += 1;
    } else {
      spendOwnerMinute(state, 'workshop');
      state.owner.productionMinutes += 1;
    }
    worked = true;
    if (at.machine !== null) used.set(at.machine.id, (used.get(at.machine.id) ?? 0) + 1);
    // A machine speeds up its own stage and nothing else, and only for the man on it, so the
    // speed is the class of the machine he actually got (CLAUDE.md T7 3.1).
    const speed = at.machine === null
      ? stage.speed
      : variantOf(specOf(at.machine.specId), at.machine.variantId).outputFactor;
    const minute = labourPerMinute(hand.rate, speed) * hall;
    if (addLabour(state, hand.job, minute, stage.id)) raiseJobAtGate(state, hand.job);
  }
  if (!worked) return;
  state.productionMinutesMonth += 1;
  addDust(state, 1);
  for (const machine of accumulateMachineMinute(state, used)) {
    raiseBagFull(state, machine);
  }
}

/** The piece is made and standing in front of the gate. Nothing is paid until the client has it,
 *  so the only question is who takes it there (CLAUDE.md T2 3.7). */
function raiseJobAtGate(state: GameState, job: Job): void {
  const choices = has(state, 'van')
    ? adHocChoices(state, AD_HOC_TASK_MINUTES.deliver, 'Take it in the van', 'Leave it at the gate')
    : [
        { id: 'transport', label: transportLabel(state) },
        { id: 'later', label: 'Leave it at the gate' },
      ];
  queueEvent(state, {
    kind: 'jobAtGate',
    title: `${job.name} is finished`,
    body:
      'It is standing in front of the gate. The balance is paid when the client has it. ' +
      `${transportLabel(state)}.`,
    choices,
    data: { jobId: job.id },
  });
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
  queueEvent(state, {
    kind: 'bagFull',
    title: `Bag full: ${name.toLowerCase()}`,
    body: 'The machine has stopped. Nothing of this kind gets made until the bag is changed.',
    choices: adHocChoices(
      state,
      task.minutesTotal,
      'Change it yourself',
      'Leave the machine stopped',
    ),
    data: { equipmentId: machine.id, taskId: task.id },
  });
}

/** The minutes a call takes out of whoever answers it. */
function createCallTask(state: GameState, job: Job): TaskInstance {
  return createTask(state, {
    kind: 'clientCall',
    label: `Client call: ${job.name}`,
    minutes: AD_HOC_TASK_MINUTES.clientCall,
    jobId: job.id,
  });
}

/** A salesman on the books and with a day left in him takes every call without being asked
 *  (CLAUDE.md T4 3.3). */
function callTaker(state: GameState): Worker | null {
  return (
    state.workers.find(
      (worker) =>
        worker.role === 'salesman' &&
        isWorkingToday(state, worker) &&
        // Enough of his day left to see the call out, or the owner is asked instead.
        staffMinutesLeft(worker) >= AD_HOC_TASK_MINUTES.clientCall,
    ) ?? null
  );
}

/** The client rings. Nothing is held up by it: the phone simply goes, and the owner answers or
 *  lets it ring (CLAUDE.md T4 3.3). Nobody in the office means nobody to ring: the call waits for
 *  a day somebody is in, rather than being missed behind the player's back. */
function ringDueCalls(state: GameState): void {
  if (state.activeEvent !== null) return;
  // He is already on the phone. The next client rings when he is off it, or the call he is on
  // would be what he goes back to instead of the work it interrupted.
  const held = state.owner.currentTaskId;
  if (held !== null && findTask(state, held)?.kind === 'clientCall') return;
  const due = nextDueCall(state);
  if (due === null) return;
  const salesman = callTaker(state);
  if (salesman) {
    takeCall(due.job, due.index);
    createCallTask(state, due.job);
    return;
  }
  if (!ownerIsAvailable(state)) return;
  const missedLine =
    due.job.callsMissed > 0
      ? ` You have already let ${plural(due.job.callsMissed, 'call', 'calls')} ring out on this one.`
      : '';
  queueEvent(state, {
    kind: 'clientCall',
    title: `Client calling: ${due.job.name}`,
    body:
      'The client is on the phone about his job. Whatever you are on waits while you talk to ' +
      `him.${missedLine}`,
    choices: [
      { id: 'answer', label: `Answer, ${AD_HOC_TASK_MINUTES.clientCall} min` },
      { id: 'ignore', label: 'Let it ring' },
    ],
    data: { jobId: due.job.id, call: due.index },
  });
}

/** Noon. Take the hour or work through it: 60 minutes more today against 3% of tomorrow
 *  (CLAUDE.md T6 3.4). Asked once, and only of an owner who is in. */
function askAboutBreak(state: GameState): boolean {
  const owner = state.owner;
  if (owner.breakAsked || state.clock.minute !== BREAK_START_MINUTE) return false;
  owner.breakAsked = true;
  if (!ownerIsAvailable(state)) return false;
  queueEvent(state, {
    kind: 'breakTime',
    title: 'Break',
    body:
      'Twelve o\u0027clock and the kettle is on. The workshop stops for the hour whatever you do. ' +
      `Work through it and you get ${BREAK_MINUTES} more minutes today and start tomorrow ` +
      `${Math.round((1 - BREAK_SKIP_FACTOR) * 100)}% down.`,
    choices: [
      { id: 'take', label: 'Take it' },
      { id: 'skip', label: 'Skip it' },
    ],
  });
  settle(state);
  return true;
}

/** Five o'clock. Home, or two more hours at the price of tomorrow (CLAUDE.md T6 3.4). */
function askAboutGoingHome(state: GameState): boolean {
  const owner = state.owner;
  if (owner.homeAsked || state.clock.minute !== DAY_END_MINUTE) return false;
  owner.homeAsked = true;
  if (!ownerIsAvailable(state)) return false;
  queueEvent(state, {
    kind: 'goingHome',
    title: 'End of day',
    body:
      'Five o\u0027clock and the day\u0027s work is behind you. The hall is yours until seven if ' +
      `you want it, and any overtime at all costs ${Math.round(OVERTIME_DEBT_PER_DAY * 100)}% of ` +
      'tomorrow, on top of whatever the week has already cost you.',
    choices: [
      { id: 'home', label: 'Go home' },
      { id: 'overtime', label: 'Stay for overtime' },
    ],
  });
  settle(state);
  return true;
}

/** One minute of the day. False when the clock did not move, which is a question standing in
 *  front of the player. */
function advanceMinute(state: GameState): boolean {
  if (askAboutBreak(state)) return false;
  if (askAboutGoingHome(state)) return false;
  // The workshop is at dinner: the clock runs and nothing else does, unless the owner said he
  // would work through it, and then the hour is his alone (CLAUDE.md T6 3.4).
  if (isBreak(state.clock.minute) && !state.owner.breakSkipped) {
    state.clock.minute += 1;
    settle(state);
    return true;
  }
  countOvertimeMinute(state);
  ringDueCalls(state);
  // He cannot be on the laptop and at the bench in the same minute, so a task that finishes this
  // minute keeps him off production until the next one.
  const onTask = state.owner.currentTaskId !== null;
  runMinute(state);
  runProductionMinute(state, onTask);
  state.clock.minute += 1;
  if (shouldFinishDay(state)) finishDay(state);
  settle(state);
  return true;
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
    if (!advanceMinute(next)) break;
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
    case 'breakTime':
      // Skipping is his to take: it buys him the hour and it is charged to tomorrow.
      state.owner.breakSkipped = choiceId === 'skip';
      break;
    case 'goingHome':
      if (choiceId === 'home') finishDay(state);
      break;
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
      if (choiceId === 'later' || typeof jobId !== 'string') break;
      if (!orderTransport(state, jobId)) break;
      // The courier needs nobody. The van run is a task, and the choice says whose minutes it costs.
      const task = state.tasks.find(
        (entry) => entry.kind === 'deliver' && entry.jobId === jobId && !entry.done,
      );
      if (task) delegateAdHocTask(state, task, choiceId);
      break;
    }
    case 'clientCall': {
      const jobId = event.data.jobId;
      const index = event.data.call;
      const job = typeof jobId === 'string' ? findJob(state, jobId) : null;
      if (!job || typeof index !== 'number') break;
      if (choiceId === 'answer') {
        takeCall(job, index);
        // A call comes before whatever he is holding: that is what an interruption is.
        interruptOwnerWith(state, createCallTask(state, job));
      } else {
        missCall(state, job, index);
      }
      break;
    }
    case 'bagFull':
    case 'serviceDue':
    case 'machineBroken': {
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
      // The speed is not the player's while the hall is being moved (CLAUDE.md T4 3.5).
      if (movingMachines(next) === null) next.speed = action.speed as Speed;
      break;
    case 'END_SETUP':
      endSetup(next, action.speed as Speed);
      break;
    case 'SET_SUMMARY_CADENCE':
      next.summaryCadence = action.cadence;
      break;
    case 'END_DAY':
      if (isOvertime(next.clock.minute)) {
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
    case 'REPAIR_MACHINE': {
      const machine = next.equipment.find((item) => item.id === action.equipmentId);
      if (machine && machine.broken) {
        const name = findSpec(machine.specId)?.name ?? machine.specId;
        const task = ensureTask(next, 'repair', `Repair the ${name.toLowerCase()}`, machine.id);
        startTask(next, task.id);
      }
      break;
    }
    case 'SERVICE_MACHINE': {
      const machine = next.equipment.find((item) => item.id === action.equipmentId);
      if (machine) {
        const name = findSpec(machine.specId)?.name ?? machine.specId;
        const task = ensureTask(next, 'service', `Service the ${name.toLowerCase()}`, machine.id);
        startTask(next, task.id);
      }
      break;
    }
    case 'PAUSE_TASK':
      pauseOwnerTask(next);
      break;
    case 'BUY_EQUIPMENT':
      buyEquipment(next, action.specId, action.variantId);
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
    case 'SET_SHOW_WHY':
      next.showWhy = action.on;
      break;
    case 'MOVE_ITEM': {
      const item = next.equipment.find((entry) => entry.id === action.itemId);
      const stood = item ? { x: item.anchorX, y: item.anchorY } : null;
      moveItem(next, action.itemId, action.x, action.y);
      if (item && stood) recordMove(next, item, stood);
      break;
    }
    case 'ORDER_TRANSPORT': {
      const job = findJob(next, action.jobId);
      if (!job || job.stage !== 'awaitingTransport' || job.deliverOnDay !== null) break;
      if (has(next, 'van')) {
        // Who drives it is a decision, and the event is where decisions are made.
        raiseJobAtGate(next, job);
      } else {
        orderTransport(next, job.id);
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


/** True when somebody is standing at this machine this minute. The hall reads it to spin the
 *  blade and throw the dust: nothing in the engine turns on it (CLAUDE.md T3 3.7). A machine is
 *  taken by one man or by nobody, so this is the one question there is to ask (T7 3.1). */
export function machineInUse(state: GameState, item: Equipment): boolean {
  const spec = findSpec(item.specId);
  if (!spec || item.broken) return false;
  if (spec.category === 'extraction') {
    // The extraction serves whatever is running, so any machine at work sets it going.
    return state.equipment.some((other) => {
      const otherSpec = findSpec(other.specId);
      return otherSpec?.category === 'machine' && other.takenBy !== null && !other.broken;
    });
  }
  if (spec.category !== 'machine') return false;
  return item.takenBy !== null && !item.bagFull;
}

export interface BuyCheck {
  ok: boolean;
  reason: string;
}

const OK: BuyCheck = { ok: true, reason: '' };

/** One reason per refusal, used by the catalogue modal and by the buy action itself. */
export function canBuy(state: GameState, specId: string, variantId?: string): BuyCheck {
  const spec = findSpec(specId);
  if (!spec) return { ok: false, reason: 'Not in the catalogue' };
  const variant = variantOf(spec, variantId ?? spec.variants[0]?.id ?? '');
  if (spec.locked) return { ok: false, reason: spec.lockReason };
  if (state.reputation < spec.minReputation) {
    return { ok: false, reason: `Needs reputation ${spec.minReputation}` };
  }
  // A class may want something the family does not: a floor edgebander wants extraction where a
  // hand one wants a tool cabinet (CLAUDE.md T7 3.6).
  for (const required of requiresFor(spec, variant)) {
    if (!has(state, required)) {
      const name = findSpec(required)?.name ?? required;
      return { ok: false, reason: `Needs ${name} first` };
    }
  }
  const oneOf = requiresOneOfFor(spec, variant);
  if (oneOf.length > 0 && !oneOf.some((id) => has(state, id))) {
    const names = oneOf.map((id) => findSpec(id)?.name ?? id).join(' or ');
    return { ok: false, reason: `Needs ${names} first` };
  }
  if (!spec.stackable && has(state, specId)) return { ok: false, reason: 'Already owned' };
  if (specId === 'workbench' && countOf(state, 'workbench') >= state.unit.benchSlots) {
    return { ok: false, reason: 'No free bench slot in this unit' };
  }
  if (!canAfford(state, variant.price)) return { ok: false, reason: 'Not enough cash' };
  // A machine wants its working room as well as its price: a floor edgebander needs a free 5 by
  // 3 of hall and there is no point selling him one he cannot stand anywhere (T7 3.3, 3.6).
  if (standsInTheHall(specId, variant.id) && firstFreeCell(state, specId, variant.id) === null) {
    const zone = zoneOf(specId, variant.id);
    return { ok: false, reason: `No free ${zone.width} by ${zone.depth} m in the hall` };
  }
  return OK;
}

function slotFrom(slots: readonly { x: number; y: number }[], index: number): { x: number; y: number } {
  const slot = slots[Math.min(index, slots.length - 1)];
  return slot ? { x: slot.x, y: slot.y } : { x: 0, y: 0 };
}

/** The tile the catalogue would like to put a new item on. */
function defaultAnchor(state: GameState, specId: string): { x: number; y: number } {
  const index = countOf(state, specId);
  if (specId === 'workbench') return slotFrom(BENCH_SLOT_LAYOUT, index);
  if (specId === 'locker') return slotFrom(LOCKER_SLOT_LAYOUT, index);
  if (specId === 'canteenSeat') return slotFrom(CANTEEN_SLOT_LAYOUT, index);
  if (specId === TOOL_CABINET) return slotFrom(CABINET_SLOT_LAYOUT, index);
  const slot = STARTING_LAYOUT[specId];
  // Anything the layout has no opinion about starts in the front half, clear of the gate lane.
  return slot
    ? { x: slot.yard === true ? state.unit.widthCells + slot.x : slot.x, y: slot.y }
    : { x: GATE_LANE.x + GATE_LANE.width, y: GATE_LANE.y };
}

/** A new purchase lands on its default tile, or on the first free one when that is taken. The
 *  player moves it wherever he likes afterwards (CLAUDE.md T2 3.10). */
function anchorFor(state: GameState, specId: string, variantId: string): { x: number; y: number } {
  const spec = findSpec(specId);
  const preferred = defaultAnchor(state, specId);
  // The office furniture and anything in the yard are not on the hall floor.
  if (!spec || spec.category === 'furniture' || STARTING_LAYOUT[specId]?.yard === true) {
    return preferred;
  }
  if (canPlaceSpec(state, specId, preferred.x, preferred.y, null, variantId).ok) return preferred;
  return firstFreeCell(state, specId, variantId) ?? preferred;
}

export function buyEquipment(state: GameState, specId: string, variantId?: string): BuyCheck {
  const check = canBuy(state, specId, variantId);
  if (!check.ok) return check;
  const spec = specOf(specId);
  const variant = variantOf(spec, variantId ?? spec.variants[0]?.id ?? '');
  const anchor = anchorFor(state, specId, variant.id);
  pay(state, 'equipment', variant.name, variant.price);
  state.equipment.push({
    id: makeId(state, 'kit'),
    specId,
    variantId: variant.id,
    spriteKey: spec.spriteKey,
    anchorX: anchor.x,
    anchorY: anchor.y,
    minutesUsed: 0,
    bagFull: false,
    broken: false,
    serviceHours: 0,
    enduranceHours: enduranceHoursFor(specId, variant.id),
    hoursUsed: 0,
    takenBy: null,
    purchasePrice: variant.price,
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
