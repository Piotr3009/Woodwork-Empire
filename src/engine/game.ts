// The engine entry points. `tick` and `applyAction` clone the incoming state and return the clone:
// callers never see their input mutated. Every other engine module mutates the state it is given.

import {
  WET_AIR_FINISH_FACTOR,
  ACCIDENT_CHANCE_PER_DAY,
  ADMIN_COVER_RATE,
  BENCH_SLOT_LAYOUT,
  BREAK_MINUTES,
  BREAK_SKIP_FACTOR,
  BOARD_MIDDAY_MINUTE,
  BREAK_START_MINUTE,
  CABINET_SLOT_LAYOUT,
  DAY_LOGS_KEPT,
  DAY_SUMMARIES_MAX,
  DAY_END_MINUTE,
  DIFFICULTIES,
  GATE_LANE,
  HELPER_CLEAN_WEEKDAY,
  LOCKER_SLOT_LAYOUT,
  GATE_PRICE,
  HOLIDAY_MAX_DAYS,
  JOINERY_CORE_EXTENSION_PRICE_YEARLY,
  JOINERY_CORE_MAX_EXTENSIONS,
  JOINERY_CORE_PRICE_YEARLY,
  OWNER_DRAW_TIERS,
  MOVE_MINUTES_PER_ITEM,
  SKIP_SPEED,
  OVERTIME_DEBT_PER_DAY,
  REPUTATION_START,
  SERVICE_INTERVAL_HOURS,
  SOFTWARE_ONE_OFF_JOBS,
  HIRING_MINUTES,
  LAPTOP_BOOT_MINUTES,
  SOFTWARE_ONE_OFF_PRICE,
  SOFTWARE_TURN1_TIER,
  STARTING_LAYOUT,
  TEMP_STORAGE_COST,
  TOOL_CABINET,
  HAND_TOOL_SET,
  STATE_VERSION,
  WEBSITE_START_LEVEL,
  WELFARE_IN_THE_CANTEEN,
  SOUND_VOLUME_DEFAULT,
} from './constants';
import { arriveEnquiries, refreshBoard, refreshLocks } from './board';
import {
  acceptContract,
  assignContract,
  declineContract,
  offerContract,
  endContractNow,
  renewContract,
  runContractDay,
  contractMen,
  contractStationFor,
  runContractMinute,
} from './contracts';
import { emptyEfficiency } from './efficiency';
import { accrueOverdraftInterest, repayLoan, takeLoan } from './finance';
import {
  claimBurglary,
  refreshInsuredValue,
  runInsuranceDay,
  setInsurance,
} from './insurance';
import { connectExtraction, disconnectExtraction, dropOrphanPipes } from './pipes';
import { burgle, rollBurglary, setSecurityLevel } from './security';
import { setWebsiteLevel } from './website';
import { missCall, nextDueCall, takeCall } from './calls';
import { canPlaceSpec, firstFreeCell, moveItem } from './layout';
import {
  createOnOrder,
  findOnOrder,
  onOrderCount,
  orderName,
  ordersDueOn,
  removeOnOrder,
} from './orders';
import {
  daysBetween,
  formatCalendarDay,
  nextWorkingDay,
  isDayExhausted,
  isFriday,
  isLastWorkingDayOfMonth,
  isBreak,
  isOvertime,
  isWorkingDay,
  monthOfDay,
  timeIsPaused,
  weekOfDay,
  weekday,
} from './clock';
import {
  canAfford,
  charge,
  emptyBooked,
  emptyTotals,
  formatMoney,
  monthlyReportFor,
  pay,
  receive,
  refund,
  runDayCosts,
  stampSoftwareMonths,
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
  bagStore,
  bagsFull,
  emptyBags,
  enduranceHoursFor,
  breakMachine,
  extractorBreakdownChance,
  extractorBroken,
  OWNER,
  ductedMoves,
  ductingDue,
  findSpec,
  hallLooksDirty,
  itemIsHeavy,
  isSellableFamily,
  isSold,
  itemStandsInTheHall,
  salePriceFor,
  benchOf,
  hallProductivityFactor,
  has,
  hasBenchFor,
  machinesDueService,
  overdueBreakdownChance,
  repairCostFor,
  releaseMachinesExcept,
  repairMachine,
  requiresFor,
  requiresOneOfFor,
  standsInTheHall,
  zoneOf,
  isServiced,
  serviceCostFor,
  serviceCallCheck,
  serviceMachine,
  serviceableMachines,
  gateCheck,
  outputFactorOf,
  specOf,
  startMachineMeters,
  variantOf,
} from './machines';
import {
  acceptEnquiry,
  addLabour,
  assignJob,
  addToJob,
  chargeSiteMeasure,
  checkOverdueJobs,
  endOwnerTakeOver,
  deliverJob,
  findJob,
  oldestReadyJob,
  onDeliveryArrived,
  orderTransport,
  ownerJob,
  onDeliveryUnloaded,
  onTakeOffDone,
  orderShortfall,
  refreshJob,
  refreshMaterial,
  resolveClientOffer,
  runBookedTransport,
  dropJob,
  setSawFallback,
  BUILDING_ROLES,
  takeOffJob,
  takeOverJob,
  transportLabel,
} from './jobs';
import {
  arriveDeliveries,
  buyStock,
  canUnload,
  deliveriesArrivingOn,
  fetchFromStorage,
  findDelivery,
  moveOverflowToStorage,
  rackCapacity,
  restockSheets,
  stockIsLow,
  unloadIntoStock,
  writeOffSheetsLeftOutside,
} from './materials';
import {
  chargeOvertimeDebt,
  countOvertimeMinute,
  emptyOwnerIdle,
  logDayMinute,
  managerOnDuty,
  nextDayLabourFactor,
  ownerEfficiency,
  ownerIsAvailable,
  ownerMinutesLeft,
  ownerMinutesToday,
  runOwnerDayStart,
  spendOwnerMinute,
  staffOutputFactor,
  startHoliday,
} from './owner';
import { paidHoursToday } from './rate';
import { chance, int, makeId } from './rng';
import { type StagePlan, labourPerMinute, tradeFactor } from './stages';
import {
  airFactorFor,
  benchDrawsAir,
  standsForAir,
  compressors,
  drawingOn,
  extractionKit,
  extractionRunning,
  hallAirCheck,
  sprayingOnWetAir,
  underExtracted,
} from './media';
import { cubicMetres, metresBy, plural } from './text';
import { STATION_IDLE, STATION_NO_BENCH, stationForTask, storageSaleBlock } from './stations';
import {
  type Hand,
  jobOf,
  placeHand,
  ownerTakesAJob,
  releaseIdleMachines,
  stationForProduction,
} from './production';
import {
  autoAssignJobs,
  availableJoiners,
  managerReplans,
  bookMonthMinute,
  booksTaskMinutes,
  canHire,
  countMonthDaysOff,
  crewHasGoneHome,
  freeToolSlots,
  hasWorkingDay,
  helperOnDuty,
  helpers,
  hire,
  isWorkingToday,
  joiners,
  hurtWorker,
  letGo,
  rollNightBreakdowns,
  runNightShift,
  runStaffDayStart,
  staffMinutesLeft,
  startMonthMeters,
} from './staff';
import {
  AD_HOC_TASK_MINUTES,
  advanceOwnerTask,
  advanceTask,
  assignStaffTasks,
  assignWorkerTask,
  bookWeekMinutes,
  createDailyTasks,
  createTask,
  dayCategoryOf,
  emptyBagsLabel,
  emptyBagsMinutes,
  equipmentUnloadMinutes,
  findTask,
  interruptOwnerWith,
  isHelperTask,
  movePending,
  movingMachines,
  ownerOutTask,
  dropDuskTasks,
  pauseOwnerTask,
  resumeOwnerTask,
  resumeStartedTask,
  startNextQueued,
  skippedTask,
  queueTaskNext,
  queueTasks,
  startTask,
  taskWorkRate,
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
  LostMinuteCause,
  OnOrderItem,
  Orientation,
  PeriodTotals,
  Speed,
  TaskInstance,
  TaskOrder,
  Worker,
  WorkerRole,
  WorkerTier,
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
    reputationLog: [],
    dayLogs: [],
    dust: 0,
    bagFillM3: 0,
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
      dayLog: [],
      minutesWorked: 0,
      idleMinutes: 0,
      idleByReason: emptyOwnerIdle(),
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
      holidayDaysRemaining: 0,
      station: STATION_IDLE,
      productionMinutes: 0,
      monthMinutes: 0,
      monthDaysOff: 0,
    },
    software: {
      mode: 'none',
      tier: 'basic',
      jobsRemaining: 0,
      joineryCore: false,
      joineryCoreExtensions: 0,
      joineryCoreFromMonth: null,
      joineryCoreExtensionMonths: [],
    },
    laptopBootedOnDay: null,
    taskQueue: [],
    stock: { sheets: 0, tempStorageSheets: 0 },
    equipment: [],
    onOrder: [],
    workers: [],
    enquiries: [],
    jobs: [],
    tasks: [],
    deliveries: [],
    finance: {
      overdraftLimit: spec.overdraftLimit,
      daysBelowOverdraft: 0,
      loan: null,
      overdraftInterestAccrued: 0,
      day: emptyTotals(),
      week: emptyTotals(),
      month: emptyTotals(),
      booked: emptyBooked(),
    },
    // Where every company starts (CLAUDE.md T13 section 4): no covers, no security, a do it
    // yourself website, no contracts, the draw at the first tier, no pipes, no gates, tips on and
    // the second shift off.
    insurance: { property: false, liability: false, insuredValue: 0, payouts: [] },
    security: { level: 0, lastBurglaryDay: null },
    website: { level: WEBSITE_START_LEVEL, lastUpkeepDay: null },
    contracts: [],
    ownerDraw: { tier: 0 },
    pipes: [],
    gates: [],
    settings: { tips: true, sound: { volume: SOUND_VOLUME_DEFAULT, muted: false } },
    hallSetUp: false,
    tips: { seen: [] },
    shift: { second: false },
    monthEndShownFor: 0,
    monthlyReports: [],
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
      dustM3: 0,
      efficiency: emptyEfficiency(),
      nightMinutes: 0,
      paidHours: 0,
      expressUplift: 0,
    },
    days: [],
    lastExpressDay: null,
    lastLowStockDay: null,
    booksUpToDay: 0,
    lateAccountsMonths: 0,
    lastQuitMonth: monthOfDay(1),
    productionMinutesMonth: 0,
    movedItems: [],
    skipTaskId: null,
    speedBeforeSkip: null,
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
  // A new day is a blank bar: what he did yesterday is on yesterday's log (CLAUDE.md T11 3.1).
  owner.dayLog = [];
  owner.minutesWorked = 0;
  // And a blank grey segment with it: the minutes he stood are today's minutes and no other day's
  // (CLAUDE.md T21 2.8).
  owner.idleMinutes = 0;
  owner.idleByReason = emptyOwnerIdle();
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
    dustM3: 0,
    efficiency: emptyEfficiency(),
    nightMinutes: 0,
    paidHours: 0,
    expressUplift: 0,
  };
  // Nobody stands at a machine overnight: the hall starts the day with every one of them free
  // (CLAUDE.md T7 3.1).
  releaseMachinesExcept(state, []);
  // The month's paper before the day's: the loan, the covers and the security run with the
  // monthly items, and the report is put in front of the player before the board (T13 3.20).
  runDayCosts(state, state.clock.day);
  accrueOverdraftInterest(state);
  raiseMonthEnd(state);
  // The month's meters first, so the day that starts a month is counted into the new one, and
  // then the days off of this morning (CLAUDE.md T17 2.9).
  startMonthMeters(state);
  // And the machines' own week and month, which the Machines column and the month end read
  // (CLAUDE.md T17 2.24, 2.25).
  startMachineMeters(state);
  runOwnerDayStart(state);
  runStaffDayStart(state);
  countMonthDaysOff(state);
  resumeMove(state);
  // The board is written again at 08:00, and again at 13:00 (PIOTR, 13.09; CLAUDE.md T10 3.7),
  // and the day's new enquiries arrive with it (CLAUDE.md T13 3.4).
  refreshBoard(state);
  arriveEnquiries(state);
  offerContract(state);
  runContractDay(state);
  runInsuranceDay(state);
  runBurglary(state);
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
  const kit = arriveEquipmentOrders(state);
  collectSoldMachines(state);
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
  // What he started yesterday is his again, before anybody else is given anything (T17 2.14).
  resumeStartedTask(state);
  delegateTasks(state);
  queueDeliveryEvents(state, arriving);
  queueKitDeliveryEvents(state, kit);
}

/** The first working day of the month, before the board: the month's report, once per month
 *  (CLAUDE.md T13 3.20). The lines are phase B1's; the event is raised here. */
function raiseMonthEnd(state: GameState): void {
  const month = monthOfDay(state.clock.day);
  if (month <= 1 || state.monthEndShownFor >= month) return;
  state.monthEndShownFor = month;
  // The month is written down here, once, in the figures the card is about to be drawn from. It
  // has to be here and not a line later: `startMachineMeters` below zeroes the machines' month
  // clocks and the savings on the card are read off them, so a report taken after that would be
  // a month of blanks. Accounting's Monthly reports tab is this list read back, so a month the
  // player never opened is not lost with the ledger it was added up from
  // [PIOTR, 20.09] (CLAUDE.md T17 2.24, T23 2.14).
  state.monthlyReports.push(monthlyReportFor(state, month - 1));
  queueEvent(state, {
    kind: 'monthEnd',
    title: `Month ${month - 1}: the report`,
    body: 'The month is over. Every line is the ledger added up.',
    choices: [{ id: 'ok', label: 'Right' }],
    data: { month: month - 1 },
  });
}

/** The burglary, when the roll lands: one or two machines, the dearest first, and the free stock;
 *  paid out by the property cover with an alarm, and not otherwise (CLAUDE.md T13 3.17, 3.15).
 *  Phase B4 owns what is taken; phase A rolls and takes nothing until then. */
function runBurglary(state: GameState): void {
  if (!rollBurglary(state)) return;
  const lost = burgle(state);
  claimBurglary(state, lost);
}

/** 08:00 on the due day: the lorries with the kit on them. Furniture, hand tools and anything
 *  else two men simply carry is brought in and stands on the cells that were held for it;
 *  anything heavy is a job of work at the gate and hands back for the event to ask about
 *  (CLAUDE.md T8 3.2). */
function arriveEquipmentOrders(state: GameState): OnOrderItem[] {
  const waiting: OnOrderItem[] = [];
  for (const item of ordersDueOn(state, state.clock.day)) {
    item.arrived = true;
    if (!itemIsHeavy(item)) {
      landOrder(state, item);
      continue;
    }
    waiting.push(item);
  }
  if (waiting.length === 0) return waiting;
  // One van, one unloading, however many machines are on it. The minutes are still per machine:
  // three of them off one lorry is three machines to get off (CLAUDE.md T9 3.1) [TUNE].
  createTask(state, {
    kind: 'unload',
    label: unloadLabel(waiting),
    minutes: equipmentUnloadMinutes(state) * waiting.length,
    orderIds: waiting.map((item) => item.id),
  });
  return waiting;
}

/** What the load at the gate is called on the task list. */
function unloadLabel(items: readonly OnOrderItem[]): string {
  const first = items[0];
  if (first === undefined) return 'Unload the delivery';
  if (items.length === 1) return `Unload the ${orderName(first).toLowerCase()}`;
  return `Unload the delivery: ${plural(items.length, 'machine', 'machines')}`;
}

/** 08:00, and the buyer's van is at the gate for whatever was sold yesterday. Nobody unloads
 *  anything: it goes, and the cash comes in (CLAUDE.md T8 3.5). */
function collectSoldMachines(state: GameState): void {
  const going = state.equipment.filter(
    (item) => item.soldOnDay !== null && item.soldOnDay <= state.clock.day,
  );
  for (const item of going) {
    const name = findSpec(item.specId)?.name ?? item.specId;
    const price = salePriceFor(item);
    state.equipment = state.equipment.filter((entry) => entry.id !== item.id);
    // Nobody services or repairs a machine that is on the back of somebody else's lorry.
    const orphaned = new Set(
      state.tasks
        .filter((task) => task.equipmentId === item.id && !task.done)
        .map((task) => task.id),
    );
    state.tasks = state.tasks.filter((task) => !orphaned.has(task.id));
    if (state.owner.currentTaskId !== null && orphaned.has(state.owner.currentTaskId)) {
      state.owner.currentTaskId = null;
    }
    for (const worker of state.workers) {
      if (worker.taskId !== null && orphaned.has(worker.taskId)) worker.taskId = null;
    }
    receive(state, 'equipment', `Sold: ${name}`, price);
    queueEvent(state, {
      kind: 'machineCollected',
      title: `${name} collected`,
      body: `The buyer took it away this morning. ${formatMoney(price)} in.`,
      choices: [{ id: 'ok', label: 'Gone' }],
      data: { specId: item.specId, price },
    });
  }
}

/** The same question the sheets ask: unload it now, or leave it standing at the gate
 *  (CLAUDE.md T8 3.2). A helper takes it off the list without being asked, as he always does, and
 *  the van is then never a question the owner is put: it is his job of work and he has done it
 *  before anybody is asked about it (CLAUDE.md T11 3.4). */
function queueKitDeliveryEvents(state: GameState, arriving: readonly OnOrderItem[]): void {
  const first = arriving[0];
  if (first === undefined) return;
  const task = state.tasks.find(
    (entry) => !entry.done && entry.orderIds.includes(first.id),
  );
  if (!task) return;
  if (unloadIsNotTheOwners(state, task)) return;
  const what =
    arriving.length === 1
      ? `The ${orderName(first).toLowerCase()} has arrived`
      : `The lorry is here with ${arriving.map((item) => orderName(item).toLowerCase()).join(', ')}`;
  queueEvent(state, {
    kind: 'deliveryArrived',
    title: 'Delivery at the gate',
    body: `${what}. It is no use to anybody on the back of a lorry.`,
    choices: [
      { id: 'unload', label: `Unload now, ${Math.round(task.minutesTotal)} min` },
      { id: 'later', label: 'Leave it at the gate' },
    ],
    data: { orderId: first.id, taskId: task.id },
  });
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

/** The service called in: paid at the call, the machine out for the working day, and the reminder
 *  off the list (PIOTR, 18.09; CLAUDE.md T20 2.9). 2.9.2 says it is "paid when called" and 2.9.3
 *  says the machine is "out for one working day from the call", which leaves no room for Turn 8's
 *  half hour at the spanner: the press pays and takes the machine out in the same minute. The one
 *  path, for the event's choice and for the Machines page's button. */
function callServiceIn(state: GameState, equipmentId: string): void {
  const machine = state.equipment.find((item) => item.id === equipmentId);
  if (!machine || !serviceCallCheck(state, machine.id).ok) return;
  const name = findSpec(machine.specId)?.name ?? machine.specId;
  pay(state, 'repair', `${name} service`, serviceCostFor(machine));
  serviceMachine(state, machine.id);
  for (const task of state.tasks) {
    if (task.kind !== 'service' || task.equipmentId !== machine.id || task.done) continue;
    task.done = true;
    task.doneDay = state.clock.day;
    if (state.owner.currentTaskId === task.id) state.owner.currentTaskId = null;
    for (const worker of state.workers) if (worker.taskId === task.id) worker.taskId = null;
  }
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
      // A service is called in and paid for; nobody stands at it with a spanner (CLAUDE.md T20 2.9).
      choices: [
        { id: 'service', label: `Call it in, ${formatMoney(serviceCostFor(machine))}` },
        { id: 'later', label: 'Leave it' },
      ],
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
  // One door for a hurt man, by day and by night (CLAUDE.md T13 3.9, 3.15).
  hurtWorker(state, worker);
}

/** A helper cleans every Friday at no cost to the owner (CLAUDE.md 9.7), and the moment the hall
 *  stops being clean he sweeps it without being asked, whatever day it is: that is what a
 *  labourer is for, and the owner is never put the question (PIOTR, 16.09; CLAUDE.md T17 2.3).
 *  Asked at the start of the day and again every minute, and idempotent either way: one open
 *  cleaning is one open cleaning. */
function runHelperClean(state: GameState): void {
  if (!helperOnDuty(state)) return;
  if (weekday(state.clock.day) === HELPER_CLEAN_WEEKDAY) {
    ensureTask(state, 'cleaning', 'Weekly clean', null);
    return;
  }
  // The dirt he answers is the dirt the player sees: one pile of sawdust on the floor, which the
  // renderer draws from five points of dust, and not the messy band, which starts past forty. The
  // player saw dirt and the labourer stood beside it (PIOTR, 18.09; CLAUDE.md T20 2.8; the
  // diagnosis is in REPORT-T20.md).
  if (!hallLooksDirty(state.dust)) return;
  ensureTask(state, 'cleaning', 'Sweep the hall', null);
}

/** True while the lorry at the gate is not the owner's question to answer: the unloading is the
 *  helper's, which is the same selector his own queue refuses him with, or somebody already has
 *  it in hand (PIOTR, 14.09; CLAUDE.md T11 3.4, T17 2.3). */
function unloadIsNotTheOwners(state: GameState, task: TaskInstance): boolean {
  if (isHelperTask(state, task)) return true;
  return task.doneBy !== null && task.doneBy !== OWNER;
}

/** A lorry at the gate is a decision: unload now, or leave it standing there (CLAUDE.md 10.1).
 *  Clicking the van in the hall asks the same question again. It is the owner's decision and
 *  nobody else's, so a load the helper has already taken on is never put to him: he sees it being
 *  carried in instead (PIOTR, 14.09; CLAUDE.md T11 3.4, T17 2.3). */
function queueDeliveryEvents(state: GameState, arriving: Delivery[]): void {
  for (const delivery of arriving) {
    const task = state.tasks.find((entry) => entry.deliveryId === delivery.id && !entry.done);
    if (!task) continue;
    if (unloadIsNotTheOwners(state, task)) continue;
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
  return `End of ${formatCalendarDay(state.clock.day)}`;
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
    dayLog: owner.dayLog.map((entry) => ({ ...entry })),
    dustMadeM3: state.dayStats.dustM3,
    paidHours: state.dayStats.paidHours,
    expressUplift: state.dayStats.expressUplift,
    hallFactor: hallProductivityFactor(state),
    efficiency: JSON.parse(JSON.stringify(state.dayStats.efficiency)) as DaySummary['efficiency'],
    nightMinutes: state.dayStats.nightMinutes,
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
  // The week the company board adds up: the last seven days of the owner's own day, and no more
  // (CLAUDE.md T11 3.1).
  state.dayLogs = state.dayLogs.filter((entry) => entry.day !== summary.day);
  state.dayLogs.push({ day: summary.day, segments: summary.dayLog.map((entry) => ({ ...entry })) });
  if (state.dayLogs.length > DAY_LOGS_KEPT) {
    state.dayLogs.splice(0, state.dayLogs.length - DAY_LOGS_KEPT);
  }
}

/** Ends the working day. The summary is put in front of the player as often as he asked for it,
 *  and the day ends the same way either way: only the modal is skipped (CLAUDE.md T4 3.6). */
function finishDay(state: GameState): void {
  const ending =
    state.activeEvent?.kind === 'dayEnd' || state.eventQueue.some((event) => event.kind === 'dayEnd');
  if (ending) return;
  pauseOwnerTask(state);
  // Calls and emails die at dusk, done or not (CLAUDE.md T17 2.15).
  dropDuskTasks(state);
  chargeOvertimeDebt(state);
  // The evening is over: a job he took on for it goes back to its own man (CLAUDE.md T17 2.12).
  endOwnerTakeOver(state);
  // A skipped run ends with the day: what is not finished is picked up in the morning and the
  // player decides again whether to sit through it (CLAUDE.md T8 3.3).
  endSkip(state);
  state.owner.wentHome = true;
  // The second shift works after the day, with the owner gone (CLAUDE.md T13 3.9). What it
  // finished stands at the gate, what it filled is the bag store, and what it wore out can
  // give up at twice the day's chance.
  const night = runNightShift(state);
  for (const job of night.finished) raiseJobAtGate(state, job);
  if (night.bagsFull) raiseBagsFull(state);
  for (const machine of rollNightBreakdowns(state, night.usedMachineIds)) {
    raiseMachineBroken(state, machine);
  }
  // The hours the day paid for, worked or not, now that the evening is behind it: the bottom of
  // the workshop rate goes on the day record with the labour it earned (CLAUDE.md T17 2.26).
  state.dayStats.paidHours = paidHoursToday(state);
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
    accrueOverdraftInterest(state);
    weekendCosts += before - state.cash;
  }
  state.clock.day = day;
  state.clock.minute = 0;
  // A new day starts at the speed a day starts at, whatever last night was run at (PIOTR, 16.09;
  // CLAUDE.md T17 2.19). Not in `startDay`, which a new game calls with the clock stopped for the
  // setting out of the hall.
  state.speed = 1;
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
  kind: 'cleaning' | 'repair' | 'service',
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
    // The player pressed the button himself: that is the override (CLAUDE.md T11 3.4).
    startTask(state, task.id, true);
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
    case 'materialTakeOff':
      if (job) onTakeOffDone(state, job);
      break;
    case 'emptyBags':
      emptyBags(state);
      break;
    case 'cleaning':
      clearDust(state);
      break;
    case 'moveMachines':
      reconnectMoved(state);
      // The same as a call: he goes back to whatever the move took him off.
      resumeOwnerTask(state);
      break;
    case 'hiring':
      // He is out of the interview: the man is taken on now (CLAUDE.md T7 3.10).
      settleOrders(state, task);
      // The next interview he committed to first, and the bench only when they are all run.
      if (!startNextTrip(state)) resumeOwnerTask(state);
      break;
    case 'booting':
      // The laptop is up: back to whatever he put down to open it. The day was written down when
      // the boot started, so nothing is written here (CLAUDE.md T17 2.17).
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
    case 'fetchStorage':
      fetchFromStorage(state);
      break;
    case 'deliver':
      if (job) deliverJob(state, job);
      break;
    case 'unload': {
      // One van is one unloading: everything heavy that came on it stands on the cells that were
      // held for it (CLAUDE.md T8 3.2, T9 3.1).
      if (task.orderIds.length > 0) {
        for (const orderId of task.orderIds) {
          const item = findOnOrder(state, orderId);
          if (item) landOrder(state, item);
        }
        break;
      }
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

/** A drag is a move only while the item is not standing where it started, and standing the way it
 *  started. Dragging it out and back again, however many drags it takes, costs nothing
 *  (CLAUDE.md T4 3.5); turning it where it stands is a move of its own, which for a bench or a
 *  rack costs nothing either, because `endSetup` only ever books the heavy ones
 *  (PIOTR, 15.09; CLAUDE.md T11 3.9). */
function recordMove(
  state: GameState,
  item: Equipment,
  stood: { x: number; y: number; orientation: Orientation },
): void {
  const index = state.movedItems.findIndex((moved) => moved.itemId === item.id);
  if (index < 0) {
    if (
      item.anchorX === stood.x &&
      item.anchorY === stood.y &&
      item.orientation === stood.orientation
    ) {
      return;
    }
    state.movedItems.push({
      itemId: item.id,
      fromX: stood.x,
      fromY: stood.y,
      fromOrientation: stood.orientation,
    });
    return;
  }
  const start = state.movedItems[index];
  if (
    start &&
    item.anchorX === start.fromX &&
    item.anchorY === start.fromY &&
    item.orientation === start.fromOrientation
  ) {
    state.movedItems.splice(index, 1);
  }
}

/** Every moved machine that was on the extraction is disconnected by the move and reconnected
 *  when it is finished, at the new length, refunding nothing: the pipe run is the reconnection
 *  the Turn 4 ducting charge was (CLAUDE.md T4 3.5, T13 3.19). The flexi system's is free. */
function reconnectMoved(state: GameState): void {
  for (const item of ductedMoves(state)) {
    const wasConnected = state.pipes.some((run) => run.equipmentId === item.id);
    disconnectExtraction(state, item.id);
    if (wasConnected) connectExtraction(state, item.id);
  }
  state.movedItems = [];
}

/** True while the player has been asked about a move of the hall and has not answered yet
 *  (CLAUDE.md T8 3.4). The hall cannot be set out again over the top of the question. */
export function moveConfirmPending(state: GameState): boolean {
  if (state.activeEvent?.kind === 'moveConfirm') return true;
  return state.eventQueue.some((event) => event.kind === 'moveConfirm');
}

/** Two hours reads as "2 h", and an odd half hour says so. */
function hoursText(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes - hours * 60);
  if (hours <= 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/** Leaving setup mode. A bench, a rack, a tool cabinet, a locker or a seat is simply where the
 *  player dropped it: no time and no money. Anything heavy is asked about first, because it is
 *  two hours and a ducting bill (PIOTR, 13.09; CLAUDE.md T8 3.4). */
function endSetup(state: GameState, speed: Speed): void {
  state.speed = speed;
  // The hall has been set up once the player has left setup mode with anything of his standing in
  // it. The flag is what the first steps line reads; nothing goes looking for a workbench any more
  // (CLAUDE.md T19 2.13).
  if (!state.hallSetUp && state.equipment.some((item) => !isSold(item))) state.hallSetUp = true;
  if (state.movedItems.length === 0) return;
  if (movePending(state) !== null) return;
  // The question is already in front of him: asking it twice would book the move twice.
  if (moveConfirmPending(state)) return;
  const heavy = state.movedItems.filter((moved) => {
    const item = state.equipment.find((kit) => kit.id === moved.itemId);
    return item !== undefined && itemIsHeavy(item);
  });
  state.movedItems = heavy;
  if (heavy.length === 0) return;
  const due = ductingDue(state);
  const bill =
    due.machines > 0
      ? ` and the extraction pipe of ${plural(due.machines, 'machine', 'machines')} run again at the new length`
      : '';
  queueEvent(state, {
    kind: 'moveConfirm',
    title: 'Moving the hall',
    body:
      `Moving ${plural(heavy.length, 'machine', 'machines')} takes ` +
      `${hoursText(heavy.length * MOVE_MINUTES_PER_ITEM)}${bill}. Do it?`,
    choices: [
      { id: 'do', label: 'Do it' },
      { id: 'back', label: 'Put them back' },
    ],
    data: { machines: heavy.length },
  });
}

/** Do it: the move is a job of work in the hall, an hour an item, and the clock is run through it
 *  so the player sees the day advance rather than a frozen screen (CLAUDE.md T8 3.4). */
function startTheMove(state: GameState): void {
  if (state.movedItems.length === 0) return;
  if (movePending(state) !== null) return;
  const task = createTask(state, {
    kind: 'moveMachines',
    label: `Moving machines: ${plural(state.movedItems.length, 'item', 'items')}`,
    minutes: state.movedItems.length * MOVE_MINUTES_PER_ITEM,
  });
  // The owner moved the kit, so the owner shifts it, whatever else he was holding. A joiner or
  // the helper can be sent instead while the owner is not in.
  if (ownerIsAvailable(state)) {
    interruptOwnerWith(state, task);
  } else {
    const hand =
      availableJoiners(state)[0] ?? helpers(state).find((worker) => isWorkingToday(state, worker));
    if (hand) assignWorkerTask(state, hand.id, task.id);
  }
  startSkip(state, task.id);
}

/** Put them back: every machine he shifted goes back exactly where it stood, and not a minute or
 *  a penny is charged (CLAUDE.md T8 3.4). */
function putThemBack(state: GameState): void {
  for (const moved of state.movedItems) {
    const item = state.equipment.find((kit) => kit.id === moved.itemId);
    if (!item) continue;
    item.anchorX = moved.fromX;
    item.anchorY = moved.fromY;
    // Exactly where it stood means the way it stood as well, now that a turn is a move
    // (CLAUDE.md T11 3.9).
    item.orientation = moved.fromOrientation;
  }
  state.movedItems = [];
}

// ---------------------------------------------------------------------------
// Skip ahead (CLAUDE.md T8 3.3). The owner is out and the player does not want to watch the hall
// do nothing: the clock is run at 4x for him until the task is over, and the speed he was on
// comes back. Events stop it the way they stop everything, and so does the end of the day.
// ---------------------------------------------------------------------------

/** Hands the clock back at the speed the player left it on. */
function endSkip(state: GameState): void {
  if (state.speedBeforeSkip !== null) state.speed = state.speedBeforeSkip;
  state.skipTaskId = null;
  state.speedBeforeSkip = null;
}

/** Asks the clock to run itself until this task is done. */
function startSkip(state: GameState, taskId: string): void {
  if (state.skipTaskId === taskId) return;
  if (state.skipTaskId === null) state.speedBeforeSkip = state.speed;
  state.skipTaskId = taskId;
  state.speed = SKIP_SPEED;
}

/** Holds the clock at 4x while the skipped task is still open, and lets it go when it is not. */
function runSkip(state: GameState): void {
  if (state.skipTaskId === null) return;
  if (skippedTask(state) === null) {
    endSkip(state);
    return;
  }
  state.speed = SKIP_SPEED;
}

/** A move is "running" only while somebody is actually on it. A call, the end of the day or a
 *  day at home can leave the task marked as the owner's while he is not holding it; then the clock
 *  stayed forced to 4x with nobody shifting anything and the player could not get it back (bug,
 *  13.09). The mark comes off, and the owner picks the move up again the moment he is free. */
function keepTheMoveHonest(state: GameState): void {
  const move = movePending(state);
  if (move === null) return;
  if (move.doneBy === 'owner') {
    // Holding it, or holding the call that interrupted it and coming straight back to it.
    const holding =
      ownerIsAvailable(state) &&
      (state.owner.currentTaskId === move.id || state.owner.resumeTaskId === move.id);
    if (!holding) move.doneBy = null;
  } else if (move.doneBy !== null) {
    const hand = state.workers.find((worker) => worker.id === move.doneBy);
    if (!hand || hand.taskId !== move.id || !isWorkingToday(state, hand)) move.doneBy = null;
  }
  if (
    move.doneBy === null &&
    ownerIsAvailable(state) &&
    state.owner.currentTaskId === null &&
    !isBreak(state.clock.minute)
  ) {
    startTask(state, move.id);
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
  spendOwnerMinute(state, task.category, dayCategoryOf(task.kind));
  const finished = advanceOwnerTask(state, ownerEfficiency(state));
  if (finished) {
    applyTaskCompletion(state, finished);
    // The next one he ticked on the laptop, once whatever the completion sent him to is done
    // (CLAUDE.md T17 2.16).
    startNextQueued(state);
  }
}

/** Everything derived that has to be true before the state is handed back. */
/** Staff pick up what their role covers. What they finish takes effect as the minute runner
 *  finishes it, because nobody clears a job of work on the spot any more (CLAUDE.md T17 2.3). */
function delegateTasks(state: GameState): void {
  assignStaffTasks(state);
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
    // A man on a standing contract stands where the contract put him (CLAUDE.md T13 3.16).
    const onContract = contractStationFor(state, worker);
    if (onContract !== null) {
      worker.station = onContract;
      continue;
    }
    // A joiner with work waiting and nowhere to do it stands at the canteen door (T4 3.4).
    // "Nowhere to do it" is a question about this man and not about the hall: from Turn 23 a
    // bench holds one, two or three men by its class, so `freeBenches` counts the places nobody
    // on the books has, which is nought in any hall whose benches are all spoken for, and a man
    // with a bench of his own would have been stood at the canteen door by it. `benchOf` is the
    // one answer to whether this man has a place, and it is what `hasBenchFor` asks a line above
    // (CLAUDE.md T4 3.4, T23 2.1, 2.17).
    const stuck =
      worker.role === 'joiner' && benchOf(state, worker.id) === null && oldestReadyJob(state) !== null;
    worker.station = stuck ? STATION_NO_BENCH : STATION_IDLE;
  }
}

function settle(state: GameState): void {
  refreshLocks(state);
  // The month Joinery Core was bought in, written down the first time the state settles after the
  // click: its first month is paid at the click and not again (CLAUDE.md T17 2.21).
  stampSoftwareMonths(state);
  // What the property cover is written on follows every purchase and every stock change
  // (CLAUDE.md T13 3.15); a run whose machine has gone goes with it (T13 3.19).
  refreshInsuredValue(state);
  dropOrphanPipes(state);
  refreshMaterial(state);
  // Nobody holds a machine he is not standing at (CLAUDE.md T7 3.1).
  releaseIdleMachines(state);
  keepTheMoveHonest(state);
  // Nothing else happens while the hall is being moved. The clock it used to force to 4x is the
  // Skip ahead run now, which the player asks for on the confirm (CLAUDE.md T8 3.4).
  // The clock the player asked to be run for him, until the task he asked about is over.
  runSkip(state);
  // A hall that has gone past clean is the helper's to sweep, the minute it does (T17 2.3).
  runHelperClean(state);
  // The helper takes his break like everybody else, and the list is there for him when he is
  // back: nobody is sent at a bag change in the middle of his dinner. The week's meters take the
  // dinner hour off with him: they are a sample of the minute that has just gone, and the hour in
  // the canteen is neither worked nor paid for (CLAUDE.md T20 2.7). The sampler rode in on the top
  // of `assignStaffTasks` while game.ts was frozen for phase B, which is inside this same guard;
  // it has a line of its own now and the guard with it, so not a minute of it moved.
  if (!isBreak(state.clock.minute)) {
    bookWeekMinutes(state);
    delegateTasks(state);
  }
  autoAssignJobs(state);
  // And the master's own hour: he alone looks at the board again and moves a man off a job that
  // is comfortably ahead onto one that is behind (CLAUDE.md T23 2.4).
  managerReplans(state);
  // The men first, then the owner: with a manager on duty the crew take what there is and the
  // owner takes what is left over, and without one the crew take nothing and the oldest open job
  // is his. He never stands with his hands in his pockets while there is a bench to stand at
  // (PIOTR, 20.09; CLAUDE.md T23 2.3).
  ownerTakesAJob(state);
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
  bookMonthMinute(worker);
  // His own day meter: the production manager's shows the assigning (CLAUDE.md T13 3.9) and the
  // helper's shows the unloading and the cleaning he does (CLAUDE.md T17 2.3).
  if (booksTaskMinutes(worker.role)) logDayMinute(worker.dayLog, dayCategoryOf(task.kind));
  // An office admin covering for a specialist takes twice as long over it (CLAUDE.md T7 3.12).
  if (advanceTask(task, taskWorkRate(worker, task), state.clock.day)) {
    worker.taskId = null;
    // So many take offs a day for an estimator (CLAUDE.md T13 3.8).
    if (task.kind === 'materialTakeOff' && worker.role === 'estimator') {
      worker.ordersToday += 1;
    }
    applyTaskCompletion(state, task);
  }
  return true;
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
  // The crew always take their dinner, even on a day the owner works through his (T6 3.4).
  if (isBreak(state.clock.minute)) return list;
  // Five o'clock and the men go home, always. The evening is the owner's alone: what moves after
  // it is what he takes on himself (PIOTR, 17.09; CLAUDE.md T17 2.12).
  if (crewHasGoneHome(state)) return list;
  const staffFactor = staffOutputFactor(state);
  for (const worker of state.workers) {
    if (!isWorkingToday(state, worker)) continue;
    if (worker.taskId !== null) {
      runWorkerTaskMinute(state, worker.id, worker.taskId);
      continue;
    }
    if (moving) continue;
    if (!BUILDING_ROLES.includes(worker.role) || worker.jobId === null) continue;
    const job = findJob(state, worker.jobId);
    if (!job || job.stage !== 'inProduction') {
      worker.jobId = null;
      continue;
    }
    list.push({ who: worker.id, job, rate: worker.rate * staffFactor });
  }
  return list;
}


/** One man putting one minute into one job, with the machine he got for it. Gathered before the
 *  hall is measured, because the extraction and the air sums are the sums of the machines running
 *  this very minute and not of last minute's (CLAUDE.md T10 3.1, 3.2). */
interface AtWork {
  hand: Hand;
  stage: StagePlan;
  machine: Equipment | null;
}

/** The seats the workshop could have worked this minute: every hired man on the floor and in
 *  today, and the owner while he is in the workshop (CLAUDE.md T13 3.5). Nobody at dinner. */
function possibleSeats(state: GameState): { owner: boolean; joiners: number } {
  const dinner = isBreak(state.clock.minute);
  const owner = ownerIsAvailable(state) && (!dinner || state.owner.breakSkipped);
  if (dinner) return { owner, joiners: 0 };
  // Past five there are no staff seats at all: they have gone home (CLAUDE.md T17 2.12).
  if (crewHasGoneHome(state)) return { owner, joiners: 0 };
  let count = 0;
  for (const worker of state.workers) {
    if (!BUILDING_ROLES.includes(worker.role) || !isWorkingToday(state, worker)) continue;
    count += 1;
  }
  return { owner, joiners: count };
}

/** Books the minute against the day's efficiency: what could have been worked, what was, and
 *  where the rest went (CLAUDE.md T13 3.5). One tally, read by one function. */
function tallyEfficiency(
  state: GameState,
  worked: number,
  lost: Partial<Record<LostMinuteCause, number>>,
): void {
  const seats = possibleSeats(state);
  const possible = (seats.owner ? 1 : 0) + seats.joiners;
  const stats = state.dayStats.efficiency;
  stats.possible += possible;
  stats.worked = Math.round((stats.worked + Math.min(worked, possible)) * 10000) / 10000;
  let explained = 0;
  for (const cause of ['noMachine', 'noMaterial', 'ownerAway'] as const) {
    const minutes = Math.min(lost[cause] ?? 0, Math.max(0, possible - worked - explained));
    stats.lost[cause] = Math.round((stats.lost[cause] + minutes) * 10000) / 10000;
    explained += minutes;
  }
  // Whatever is left of the seats was nobody at a station.
  const rest = Math.max(0, possible - worked - explained);
  stats.lost.noPeople = Math.round((stats.lost.noPeople + rest) * 10000) / 10000;
}

function runProductionMinute(state: GameState, ownerOnTask: boolean): void {
  // Every bench waits while the machines are being shifted about (CLAUDE.md T4 3.5).
  const moving = movingMachines(state) !== null;
  const working = handsAtWork(state, ownerOnTask, moving);
  // Anybody who is not at a job this minute walks away from whatever he was standing at, so the
  // next man can have it (CLAUDE.md T7 3.1).
  // The men on a standing contract keep their saw beside the jobs' men (CLAUDE.md T13 3.16).
  releaseMachinesExcept(state, [...working.map((hand) => hand.who), ...contractMen(state)]);
  // Who actually stands at what this minute. Nothing is worked off the job yet: the machines have
  // to be taken before the hall can be asked what its media add up to.
  const atWork: AtWork[] = [];
  const lost: Partial<Record<LostMinuteCause, number>> = {};
  const lose = (cause: LostMinuteCause, minutes = 1): void => {
    lost[cause] = (lost[cause] ?? 0) + minutes;
  };
  for (const hand of working) {
    // One reading of a man's minute (CLAUDE.md T22 2.6): the job he is on, and the machine of its
    // stage, or the wait at it. Nobody is moved to another job, and the night shift runs the same
    // function through `workMinute`.
    const place = placeHand(state, hand);
    if (place.noMaterial) raiseNoMaterial(state);
    if (place.lost !== null) lose(place.lost);
    if (place.work === null) continue;
    atWork.push({ hand, stage: place.work.stage, machine: place.work.machine });
  }
  // The men on a standing contract put their minute in beside the jobs (CLAUDE.md T13 3.16).
  const contract = runContractMinute(state);
  if (contract.bagsFilled) raiseBagsFull(state);
  if (atWork.length === 0 && contract.worked === 0) {
    tallyEfficiency(state, 0, lost);
    return;
  }
  // The hall as it is with those machines running: the dust band, the missing helper, the crowded
  // gate, the broken extractor and the extraction sum, all through the one breakdown.
  const hall = hallProductivityFactor(state);
  const dusty = underExtracted(state);
  // What the men at the benches draw for their nailers and their sanders, through the one
  // selector the hall and the board read as well (CLAUDE.md T10 3.2).
  const air = hallAirCheck(state);
  // And what the men at the benches do when there is nothing in the hose: they stand. A bench
  // wants its 30 l/min at 6 bar and without a compressor, or on one that is short, there is no
  // bench work at all from tonight [PIOTR, 20.09] (CLAUDE.md T23 2.7). The night shift's own
  // minute does exactly this in `workMinute`, which is the twin phase C is to fold this onto.
  const running: AtWork[] = [];
  for (const entry of atWork) {
    if (standsForAir(state, entry.stage)) {
      // He keeps his bench and stands at it. The minute is one of the hall's lost ones and the
      // mark over his head says why (src/engine/bubbles.ts).
      lose('noMachine');
      continue;
    }
    running.push(entry);
  }
  if (running.length === 0 && contract.worked === 0) {
    tallyEfficiency(state, 0, lost);
    return;
  }
  // The minutes somebody actually stood at each machine: that, and nothing else, is what wears
  // it out and what fills the hall's bags (CLAUDE.md T7 2, T12 2.3).
  const used = new Map<string, number>();
  for (const { hand, stage, machine } of running) {
    const worker = state.workers.find((entry) => entry.id === hand.who);
    if (worker) {
      worker.productionMinutes += 1;
      bookMonthMinute(worker);
    } else {
      spendOwnerMinute(state, 'workshop', 'workshop');
      state.owner.productionMinutes += 1;
    }
    // What the piece itself was made in: the minutes it took and how many of them were dusty
    // ones, which is what the client sees when it lands (CLAUDE.md T10 3.1).
    hand.job.productionMinutes += 1;
    if (dusty) hand.job.dustyMinutes += 1;
    if (machine !== null) used.set(machine.id, (used.get(machine.id) ?? 0) + 1);
    // A machine speeds up its own stage and nothing else, and only for the man on it, so the
    // speed is the class of the machine he actually got (CLAUDE.md T7 3.1).
    let speed = machine === null
      ? stage.speed
      : outputFactorOf(state, machine);
    // A compressor that is short of litres runs every pneumatic consumer on it at 0.7 for the
    // minute, and a booth on wet air takes half as long again over the finish and marks the
    // piece (PIOTR, CLAUDE.md T10 3.2, 3.3).
    const atTheBench = benchDrawsAir(stage) !== null;
    speed *= airFactorFor(state, air, machine, atTheBench);
    if (machine !== null && sprayingOnWetAir(state, machine)) {
      speed /= WET_AIR_FINISH_FACTOR;
      hand.job.wetFinish = true;
    }
    // A compressor's hours run only while something draws on it (CLAUDE.md T10 3.2 rule 3).
    const compressor = drawingOn(state, machine, atTheBench);
    if (compressor !== null) used.set(compressor.id, (used.get(compressor.id) ?? 0) + 1);
    // What the man's own trade is worth at this stage: a sprayer's full minute at the booth, a
    // joiner's slower one there, and neither anywhere else (CLAUDE.md T19 2.6).
    const trade = tradeFactor(worker?.role ?? null, stage.family);
    const minute = labourPerMinute(hand.rate * trade, speed) * hall;
    if (addLabour(state, hand.job, minute, stage.id)) raiseJobAtGate(state, hand.job);
  }
  // The extraction books its hours the whole time it is running, whoever is at what: a fan is
  // pulling for the hall and not for one man, and it is serviced on those hours exactly as a
  // machine is [PIOTR, 20.09] (CLAUDE.md T23 2.8). `isServiced` says which of the kit in the
  // duct run wears out on them.
  if (extractionRunning(state)) {
    for (const fan of extractionKit(state)) {
      if (isServiced(fan.specId)) used.set(fan.id, (used.get(fan.id) ?? 0) + 1);
    }
  }
  // What the owner's absence took off every staff minute this minute is the owner away line of
  // the efficiency breakdown (CLAUDE.md T13 3.5, 3.9).
  const away = staffOutputFactor(state);
  let worked = 0;
  for (const { hand } of running) {
    if (hand.who === OWNER) {
      worked += 1;
      continue;
    }
    worked += away;
    if (away < 1) lose('ownerAway', 1 - away);
  }
  tallyEfficiency(state, worked + contract.worked, lost);
  state.productionMinutesMonth += 1;
  addDust(state, 1);
  // The minute the store fills, the workshop is told once, not once a machine (CLAUDE.md T12 2.3).
  if (accumulateMachineMinute(state, used)) raiseBagsFull(state);
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

/** The one open chore for the hall's bags, or a fresh one sized to the store: fifteen minutes a
 *  bag, ten bags ten times as long (CLAUDE.md T12 2.3). It carries no machine of its own, because
 *  the store is the hall's and not one extractor's. */
function ensureBagsTask(state: GameState): TaskInstance {
  const open = state.tasks.find((task) => task.kind === 'emptyBags' && !task.done);
  if (open) return open;
  const store = bagStore(state);
  return createTask(state, {
    kind: 'emptyBags',
    label: emptyBagsLabel(store.bags),
    minutes: emptyBagsMinutes(store.bags),
  });
}

/** The hall's bags are full: every machine that makes dust stops until they are emptied. One
 *  event for the workshop, never one per machine. A helper deals with it for nothing, otherwise
 *  somebody has to give up the minutes (CLAUDE.md T12 2.3). */
function raiseBagsFull(state: GameState): void {
  const task = ensureBagsTask(state);
  // The helper takes it, free and without asking, while he is actually in the hall. A man on the
  // books who is off today takes nothing, and the question is put to the owner as it always was
  // (CLAUDE.md T11 3.4).
  if (helperOnDuty(state)) {
    delegateTasks(state);
    return;
  }
  const store = bagStore(state);
  queueEvent(state, {
    kind: 'bagsFull',
    title: 'Bags full in the workshop',
    body:
      `The bags on the extractor hold ${cubicMetres(store.capacityM3)} and they are full. ` +
      'Nothing that makes dust gets made until they are emptied.',
    choices: adHocChoices(
      state,
      task.minutesTotal,
      'Empty them yourself',
      'Leave the machines stopped',
    ),
    data: { taskId: task.id, bags: store.bags },
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
 *  (CLAUDE.md T4 3.3). With no salesman the office admin takes it, at twice the minutes, and the
 *  day he is taken on the salesman has it back (CLAUDE.md T7 3.12). */
function callTaker(state: GameState): Worker | null {
  for (const role of ['salesman', 'officeAdmin'] as const) {
    const rate = role === 'officeAdmin' ? ADMIN_COVER_RATE : 1;
    const found = state.workers.find(
      (worker) =>
        worker.role === role &&
        isWorkingToday(state, worker) &&
        // Enough of his day left to see the call out, or the owner is asked instead.
        staffMinutesLeft(worker) >= AD_HOC_TASK_MINUTES.clientCall / rate,
    );
    if (found) return found;
  }
  return null;
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
    refreshBoardAtMidday(state);
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
  refreshBoardAtMidday(state);
  if (shouldFinishDay(state)) finishDay(state);
  settle(state);
  return true;
}

/** The board's second refresh of the day, at 13:00 on the dot, whether or not anything was taken
 *  and whether or not anybody was at a bench for the hour before it (PIOTR, 13.09;
 *  CLAUDE.md T10 3.7). */
function refreshBoardAtMidday(state: GameState): void {
  if (state.clock.minute !== BOARD_MIDDAY_MINUTE) return;
  refreshBoard(state);
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
    case 'moveConfirm':
      if (choiceId === 'do') startTheMove(state);
      else putThemBack(state);
      break;
    case 'deliveryArrived':
      if (choiceId === 'unload') {
        // "Unload it yourself" is the override, so it lands even with a helper in the hall.
        const taskId = event.data.taskId;
        if (typeof taskId === 'string') startTask(state, taskId, true);
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
    case 'serviceDue':
      // Called in, not worked off: the money goes now and the machine is away for the day
      // (CLAUDE.md T20 2.9).
      if (choiceId === 'service') callServiceIn(state, String(event.data.equipmentId));
      break;
    case 'bagsFull':
    case 'machineBroken': {
      const taskId = event.data.taskId;
      const task = typeof taskId === 'string' ? findTask(state, taskId) : null;
      if (task) delegateAdHocTask(state, task, choiceId);
      break;
    }
    case 'clientOffer':
      // The client's number, taken or left (CLAUDE.md T13 3.24).
      resolveClientOffer(state, choiceId, event.data);
      break;
    default:
      break;
  }
}

/** Puts a machine, or an air dryer, on one of the compressors in the hall. A null puts it back on
 *  the first one, which is where everything starts (CLAUDE.md T10 3.2, 3.3). */
export function assignAir(
  state: GameState,
  equipmentId: string,
  compressorId: string | null,
): boolean {
  const item = state.equipment.find((entry) => entry.id === equipmentId);
  if (!item) return false;
  if (compressorId !== null && !compressors(state).some((entry) => entry.id === compressorId)) {
    return false;
  }
  item.compressorId = compressorId;
  return true;
}

/** Everything that changes the world outside the workshop and so cannot happen while the clock
 *  is stopped (CLAUDE.md T7 3.10). The purchases and the hire carry the rule themselves, through
 *  `placeOrder`; these are the rest of the shop counter. Dragging the kit about is not on the
 *  list: setting the hall out stops the clock on purpose, and the Turn 4 move costs stand. */
const PAUSED_ACTIONS: ReadonlyArray<GameAction['type']> = [
  'BUY_STOCK',
  'ORDER_TRANSPORT',
];

export function applyAction(state: GameState, action: GameAction): GameState {
  const next = clone(state);
  if (timeIsPaused(next) && PAUSED_ACTIONS.includes(action.type)) return next;
  switch (action.type) {
    case 'SET_SPEED':
      // The speed is not the player's while the hall is being moved (CLAUDE.md T4 3.5), nor while
      // the clock is being run for him (CLAUDE.md T8 3.3).
      if (movingMachines(next) === null && next.skipTaskId === null) {
        next.speed = action.speed as Speed;
      }
      break;
    case 'SKIP_AHEAD': {
      // Only the task he is out on, so a Skip ahead can never run past what it was asked about.
      const out = ownerOutTask(next) ?? skippedTask(next);
      if (out !== null) startSkip(next, out.id);
      break;
    }
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
    case 'QUEUE_TASKS':
      // Several ticked on the laptop and done one after another, in the order they were ticked
      // (CLAUDE.md T17 2.16).
      queueTasks(next, action.taskIds);
      break;
    case 'ACCEPT_ENQUIRY':
      acceptEnquiry(next, action.enquiryId, action.byHand);
      break;
    case 'ORDER_FOR_JOB':
      // The job's shortfall, bought at the ad hoc price for that job (CLAUDE.md T13 3.3).
      orderShortfall(next, action.jobId);
      break;
    case 'RESTOCK':
      // The number the player typed, capped at the free places in the rack (CLAUDE.md T17 2.20).
      buyStock(next, restockSheets(next, action.sheets));
      break;
    case 'DROP_JOB':
      // The client has his deposit back and the company takes the hit (CLAUDE.md T9 3.9).
      dropJob(next, action.jobId);
      break;
    case 'SET_SAW_FALLBACK':
      setSawFallback(next, action.jobId, action.on);
      break;
    case 'WORK_HERE': {
      const job = action.jobId ? findJob(next, action.jobId) : oldestReadyJob(next);
      if (job) assignJob(next, job.id, 'owner');
      break;
    }
    case 'ASSIGN_JOB':
      assignJob(next, action.jobId, action.workerId);
      break;
    case 'TAKE_OVER_JOB':
      // The evening is the owner's to give: he takes a worker's job on and the worker has it back
      // in the morning (CLAUDE.md T17 2.12).
      takeOverJob(next, action.jobId);
      break;
    case 'ASSIGN_AIR':
      // Which compressor this machine, or this dryer, draws from. Nothing is bought, nothing
      // moves and nobody's minutes are spent: it is a valve (CLAUDE.md T10 3.2).
      assignAir(next, action.equipmentId, action.compressorId);
      break;
    case 'HIRE':
      // The interview is an hour of his own, and the man is on the books when it is over
      // (CLAUDE.md T7 3.10).
      placeHireOrder(next, action.role, action.tier);
      break;
    case 'ASK_UNLOAD': {
      const delivery = findDelivery(next, action.deliveryId);
      if (delivery && delivery.arrived && !delivery.unloaded) {
        queueDeliveryEvents(next, [delivery]);
      }
      break;
    }
    case 'ASK_EMPTY_BAGS':
      // Clicking the extractor while the bags are full asks again who empties them (T12 2.3).
      if (bagsFull(next)) raiseBagsFull(next);
      break;
    case 'START_CLEANING': {
      // The Clean up button under the hall is the player saying he will do it himself, helper or
      // no helper (CLAUDE.md T11 3.4).
      const task = ensureTask(next, 'cleaning', 'Clean the hall', null);
      startTask(next, task.id, true);
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
    case 'SERVICE_MACHINE':
      callServiceIn(next, action.equipmentId);
      break;
    case 'BOOT_LAPTOP':
      bootLaptop(next);
      break;
    case 'CANCEL_ORDER':
      cancelOrder(next, action.orderId);
      break;
    case 'SELL_MACHINE':
      sellMachine(next, action.equipmentId);
      break;
    case 'PAUSE_TASK':
      pauseOwnerTask(next);
      break;
    case 'BUY_EQUIPMENT':
      // Nothing is bought on the spot and nothing is fetched: the cash leaves at the click and
      // the lorry comes in days (CLAUDE.md T9 3.1).
      placeEquipmentOrder(next, action.specId, action.variantId);
      break;
    case 'BUY_SOFTWARE':
      placeSoftwareOrder(next, action.mode);
      break;
    case 'BUY_STOCK':
      buyStock(next, action.sheets);
      break;
    case 'SET_SHOW_WHY':
      next.showWhy = action.on;
      break;
    case 'MOVE_ITEM': {
      const item = next.equipment.find((entry) => entry.id === action.itemId);
      const stood = item
        ? { x: item.anchorX, y: item.anchorY, orientation: item.orientation }
        : null;
      moveItem(next, action.itemId, action.x, action.y, action.orientation);
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
    // Turn 13 (CLAUDE.md T13 section 3). Each case routes to its group's module; the refusals
    // are written there.
    case 'TAKE_LOAN':
      takeLoan(next, action.amount);
      break;
    case 'REPAY_LOAN':
      repayLoan(next, action.amount);
      break;
    case 'SET_INSURANCE':
      setInsurance(next, action.cover, action.on);
      break;
    case 'ACCEPT_CONTRACT':
      acceptContract(next, action.contractId);
      break;
    case 'DECLINE_CONTRACT':
      declineContract(next, action.contractId);
      break;
    case 'ASSIGN_CONTRACT':
      assignContract(next, action.contractId, action.workerId, action.on);
      break;
    case 'RENEW_CONTRACT':
      renewContract(next, action.contractId, action.accept);
      break;
    case 'END_CONTRACT':
      // After the first month he may walk away, and it costs him nothing but the work
      // (CLAUDE.md T17 2.22).
      endContractNow(next, action.contractId);
      break;
    case 'SET_SECOND_SHIFT':
      // No manager, no second shift (CLAUDE.md T13 3.9).
      if (managerOnDuty(next) || !action.on) next.shift.second = action.on;
      break;
    case 'LET_GO':
      letGo(next, action.workerId);
      break;
    case 'ASSIGN_SHIFT': {
      const worker = next.workers.find((entry) => entry.id === action.workerId);
      if (worker && worker.role === 'joiner' && (next.shift.second || action.shift === 'day')) {
        worker.shift = action.shift;
      }
      break;
    }
    case 'TAKE_HOLIDAY':
      // A holiday with nobody in the hall is not worth watching: straight to the summary, as a
      // day off is (CLAUDE.md T13 3.9).
      if (startHoliday(next, Math.min(HOLIDAY_MAX_DAYS, action.days)).ok && hallIsEmpty(next)) {
        finishDay(next);
      }
      break;
    case 'SET_OWNER_DRAW':
      // Eight thresholds and nothing in between (CLAUDE.md T13 3.18).
      if (action.tier >= 0 && action.tier < OWNER_DRAW_TIERS.length) next.ownerDraw.tier = action.tier;
      break;
    case 'BUY_JOINERY_CORE':
      if (!next.software.joineryCore && has(next, 'laptop')) {
        // Bought by the year and charged monthly: the click switches it on (CLAUDE.md T13 3.8).
        if (charge(next, 'software', 'Joinery Core, first month', -JOINERY_CORE_PRICE_YEARLY / 12)) {
          next.software.joineryCore = true;
        }
      }
      break;
    case 'BUY_JOINERY_CORE_EXTENSION':
      if (next.software.joineryCore && next.software.joineryCoreExtensions < JOINERY_CORE_MAX_EXTENSIONS) {
        if (
          charge(next, 'software', 'Joinery Core extension, first month', -JOINERY_CORE_EXTENSION_PRICE_YEARLY / 12)
        ) {
          next.software.joineryCoreExtensions += 1;
        }
      }
      break;
    case 'SET_WEBSITE_LEVEL':
      setWebsiteLevel(next, action.level);
      break;
    case 'CONNECT_EXTRACTION':
      connectExtraction(next, action.equipmentId);
      break;
    case 'BUY_GATE':
      buyGate(next, action.equipmentId);
      break;
    case 'SET_SECURITY_LEVEL':
      setSecurityLevel(next, action.level);
      break;
    case 'SET_TIPS':
      next.settings.tips = action.on;
      break;
    case 'ADD_TO_JOB':
      // One more man on the job, however many are on it already (CLAUDE.md T19 2.5).
      addToJob(next, action.jobId, action.workerId);
      break;
    case 'REMOVE_FROM_JOB':
      // The cross on his chip: he comes off and everybody else stays on (CLAUDE.md T19 2.5).
      takeOffJob(next, action.jobId, action.workerId);
      break;
    case 'QUEUE_TASK_NEXT':
      // Add as next: behind the one running, and the running one is not put down
      // (CLAUDE.md T19 2.12).
      queueTaskNext(next, action.taskId);
      break;
    case 'SET_SOUND':
      // A volume that is not a finite number is not a volume. Clamping alone let NaN through
      // (Math.max(0, NaN) is NaN), and a NaN on the master gain throws in Web Audio, which used to
      // take the whole frame loop with it (CLAUDE.md T19 2.10; found by the Turn 19 review).
      if (typeof action.volume === 'number' && Number.isFinite(action.volume)) {
        next.settings.sound.volume = Math.min(1, Math.max(0, action.volume));
      }
      if (typeof action.muted === 'boolean') next.settings.sound.muted = action.muted;
      break;
    case 'DISMISS_TIP':
      if (!next.tips.seen.includes(action.key)) next.tips.seen.push(action.key);
      break;
    default:
      break;
  }
  settle(next);
  return next;
}

/** An automatic blast gate on a machine's drop: only for a machine with an extraction demand,
 *  once, fitted for the price (CLAUDE.md T13 3.11). What it does is phase B4's. */
export function buyGate(state: GameState, equipmentId: string): BuyCheck {
  // The four refusals live in one place, read by the card's button too (CLAUDE.md T13 3.11).
  const check = gateCheck(state, equipmentId);
  if (!check.ok) return check;
  const item = state.equipment.find((entry) => entry.id === equipmentId);
  if (!item) return { ok: false, reason: 'No such machine' };
  const name = findSpec(item.specId)?.name ?? item.specId;
  pay(state, 'equipment', `Automatic gate: ${name.toLowerCase()}`, GATE_PRICE);
  state.gates.push(item.id);
  return OK;
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
  return item.takenBy !== null;
}

export interface BuyCheck {
  ok: boolean;
  reason: string;
}

const OK: BuyCheck = { ok: true, reason: '' };

/** One reason per refusal, used by the catalogue modal and by the buy action itself. */
export function canBuy(
  state: GameState,
  specId: string,
  variantId?: string,
  prepaid = false,
): BuyCheck {
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
  // A man's hand tool set has to have somewhere to live: the cabinets of the hall hold one, two,
  // four or eight sets by their class, and the sets already bought and the owner's own fill them
  // from the bottom (PIOTR, 19.09; CLAUDE.md T22 2.12).
  if (specId === HAND_TOOL_SET && freeToolSlots(state) <= 0) {
    return { ok: false, reason: 'No free slot in a tool cabinet' };
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
  if (!prepaid && !canAfford(state, variant.price)) return { ok: false, reason: 'Not enough cash' };
  // A machine wants its working room as well as its price: a floor edgebander needs a free 5 by
  // 3 of hall and there is no point selling him one he cannot stand anywhere (T7 3.3, 3.6).
  if (standsInTheHall(specId, variant.id) && firstFreeCell(state, specId, variant.id) === null) {
    const zone = zoneOf(specId, variant.id);
    return { ok: false, reason: `No free ${metresBy(zone)} in the hall` };
  }
  return OK;
}

function slotFrom(slots: readonly { x: number; y: number }[], index: number): { x: number; y: number } {
  const slot = slots[Math.min(index, slots.length - 1)];
  return slot ? { x: slot.x, y: slot.y } : { x: 0, y: 0 };
}

/** The tile the catalogue would like to put a new item on. */
function defaultAnchor(state: GameState, specId: string): { x: number; y: number } {
  // What is on its way already has a slot of its own held for it, so the next bench of the row is
  // the next one nobody has been promised (CLAUDE.md T8 3.2).
  const index = countOf(state, specId) + onOrderCount(state, specId);
  if (specId === 'workbench') return slotFrom(BENCH_SLOT_LAYOUT, index);
  if (specId === 'locker') return slotFrom(LOCKER_SLOT_LAYOUT, index);
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
  // The welfare kit stands inside the canteen by count and never on a hall cell, so it never
  // looks for a free one (PIOTR, 17.09; CLAUDE.md T17 2.2).
  if (WELFARE_IN_THE_CANTEEN.includes(specId)) return preferred;
  if (canPlaceSpec(state, specId, preferred.x, preferred.y, null, variantId).ok) return preferred;
  return firstFreeCell(state, specId, variantId) ?? preferred;
}

/** Stands a thing in the hall on the tile it is given. Every refusal is behind the caller: this
 *  is the one write that puts a machine on the floor, whether it came back in the owner's hands
 *  or off a lorry days later (CLAUDE.md T8 3.2). */
function standItem(
  state: GameState,
  specId: string,
  variantId: string,
  at: { x: number; y: number },
  prepaid: boolean,
): void {
  const spec = specOf(specId);
  const variant = variantOf(spec, variantId);
  if (!prepaid) pay(state, 'equipment', variant.name, variant.price);
  state.equipment.push({
    id: makeId(state, 'kit'),
    specId,
    variantId: variant.id,
    spriteKey: spec.spriteKey,
    anchorX: at.x,
    anchorY: at.y,
    broken: false,
    serviceHours: 0,
    serviceCount: 0,
    inServiceUntilDay: null,
    hoursThisWeek: 0,
    hoursThisMonth: 0,
    enduranceHours: enduranceHoursFor(specId, variant.id),
    hoursUsed: 0,
    takenBy: null,
    purchasePrice: variant.price,
    soldOnDay: null,
    // Everything draws on the first compressor in the hall until the player says otherwise
    // (CLAUDE.md T10 3.2).
    compressorId: null,
    // Square to the walls until the player turns it (CLAUDE.md T10 3.8, T22 2.11).
    orientation: 0,
  });
  // With a production manager a newly placed machine is connected to the nearest extractor
  // with spare air automatically (CLAUDE.md T13 3.9, 3.19); without one the player clicks it.
  const placed = state.equipment[state.equipment.length - 1];
  if (placed && managerOnDuty(state)) connectExtraction(state, placed.id);
}

export function buyEquipment(
  state: GameState,
  specId: string,
  variantId?: string,
  prepaid = false,
): BuyCheck {
  const check = canBuy(state, specId, variantId, prepaid);
  if (!check.ok) return check;
  const spec = specOf(specId);
  const variant = variantOf(spec, variantId ?? spec.variants[0]?.id ?? '');
  standItem(state, specId, variant.id, anchorFor(state, specId, variant.id), prepaid);
  return OK;
}

/** The delivery is off the lorry: the outline goes and the machine stands where it stood
 *  (CLAUDE.md T8 3.2). The cells were held for it, so there is nothing left to refuse. */
export function landOrder(state: GameState, item: OnOrderItem): void {
  const at = { x: item.anchorX, y: item.anchorY };
  removeOnOrder(state, item.id);
  standItem(state, item.specId, item.variantId, at, true);
}

/** Management software: one-off for 30 jobs, or a subscription billed on the 1st (CLAUDE.md 9.2). */
export function canBuySoftware(
  state: GameState,
  mode: 'oneOff' | 'subscription',
  prepaid = false,
): BuyCheck {
  if (!has(state, 'laptop')) return { ok: false, reason: 'Needs a laptop first' };
  if (mode === 'oneOff' && !prepaid && !canAfford(state, SOFTWARE_ONE_OFF_PRICE)) {
    return { ok: false, reason: 'Not enough cash' };
  }
  return OK;
}

/** The one off licence is paid at the click; the subscription is billed on the 1st as ever. */
function paySoftware(state: GameState, mode: 'oneOff' | 'subscription'): void {
  if (mode === 'oneOff') pay(state, 'software', 'Management software, one off', SOFTWARE_ONE_OFF_PRICE);
}

export function buySoftware(
  state: GameState,
  mode: 'oneOff' | 'subscription',
  prepaid = false,
): BuyCheck {
  const check = canBuySoftware(state, mode, prepaid);
  if (!check.ok) return check;
  if (mode === 'oneOff') {
    if (!prepaid) paySoftware(state, mode);
    state.software = {
      ...state.software,
      mode: 'oneOff',
      tier: SOFTWARE_TURN1_TIER,
      jobsRemaining: SOFTWARE_ONE_OFF_JOBS,
    };
    return OK;
  }
  state.software = { ...state.software, mode: 'subscription', tier: SOFTWARE_TURN1_TIER, jobsRemaining: 0 };
  return OK;
}

// ---------------------------------------------------------------------------
// Nothing in stopped time: every purchase and every hire is a trip (T7 3.10)
// ---------------------------------------------------------------------------

/** The hall as it will be once everything on the road has landed. A second machine is checked
 *  against that and not against the hall he is standing in: the tool cabinet he ordered this
 *  morning is in by the time the hand bander he wants to keep in it arrives, and the cash for
 *  both is gone (CLAUDE.md T7 3.10, T9 3.1). */
function afterTheTrips(state: GameState): GameState {
  // Nothing on its way: the hall he is standing in is the hall the delivery will land in, and the
  // catalogue asks this question of every tile it draws, every minute.
  if (state.onOrder.length === 0) return state;
  const after = clone(state);
  // Everything already on the road, landed: the cash for all of it is spent, so the extraction he
  // ordered on Monday is what Tuesday's floor edgebander is allowed against (T7 3.10, T8 3.2).
  for (const item of after.onOrder.slice()) landOrder(after, item);
  return after;
}

/** Can this machine be ordered at all: the owner has to be in, and it has to be one he could buy
 *  once everything already on the road has landed (CLAUDE.md T9 3.1). */
export function orderEquipmentCheck(
  state: GameState,
  specId: string,
  variantId?: string,
): BuyCheck {
  if (!state.owner.present) return { ok: false, reason: 'You are not in today' };
  return canBuy(afterTheTrips(state), specId, variantId);
}

/** The licence is installed the moment it is paid for, so it is asked of the hall he is standing
 *  in and not of the one the lorries will make: there is nothing to install it on until the
 *  laptop is on the desk (CLAUDE.md T9 3.1). */
export function orderSoftwareCheck(state: GameState, mode: 'oneOff' | 'subscription'): BuyCheck {
  if (!state.owner.present) return { ok: false, reason: 'You are not in today' };
  return canBuySoftware(state, mode);
}

/** The same question for a hire, which is the one purchase that is still an hour of his day. */
export function orderCheck(state: GameState, order: TaskOrder): BuyCheck {
  if (!state.owner.present) return { ok: false, reason: 'You are not in today' };
  return canHire(afterTheTrips(state), order.role, order.tier);
}

/** The errands the owner runs himself. Buying is no longer one of them: an interview is the last
 *  thing he goes out for (CLAUDE.md T9 3.1). */
const TRIP_KINDS: ReadonlyArray<TaskInstance['kind']> = ['hiring'];

/** True while he is out on one already: the next errand waits its turn behind it, so the tool
 *  cabinet is on the floor before the man who keeps his tools in it sits down for his interview. */
function onATrip(state: GameState): boolean {
  const current = state.owner.currentTaskId;
  if (current === null) return false;
  const task = findTask(state, current);
  return task !== null && !task.done && TRIP_KINDS.includes(task.kind);
}

/** The next errand he has committed to and not yet run. He finishes them before he goes back to
 *  whatever the first one took him off. */
function startNextTrip(state: GameState): boolean {
  const trip = state.tasks.find((task) => !task.done && TRIP_KINDS.includes(task.kind));
  if (!trip) return false;
  // What he put down for the first errand is still what he goes back to after the last one.
  const resume = state.owner.resumeTaskId;
  state.owner.currentTaskId = trip.id;
  trip.doneBy = 'owner';
  state.owner.resumeTaskId = resume;
  return true;
}

/** Orders a machine: the cash leaves at the click, the delivery is booked at the click, and the
 *  floor it will stand on is held from the click. It costs the owner nothing at all: he never
 *  goes out for it (PIOTR, 13.09; CLAUDE.md T9 3.1). The one path the catalogue, the laptop and
 *  the team board all come through. */
export function placeEquipmentOrder(
  state: GameState,
  specId: string,
  variantId?: string,
): BuyCheck {
  const check = orderEquipmentCheck(state, specId, variantId);
  if (!check.ok) return check;
  // An order starts the clock if it was stopped: nothing happens in stopped time, and the player
  // asked for the clock to run rather than for a refusal (PIOTR, 13.09).
  if (timeIsPaused(state)) state.speed = 1;
  const spec = specOf(specId);
  const variant = variantOf(spec, variantId ?? spec.variants[0]?.id ?? '');
  pay(state, 'equipment', variant.name, variant.price);
  const at = anchorFor(state, specId, variant.id);
  createOnOrder(state, {
    specId,
    variantId: variant.id,
    pricePaid: variant.price,
    anchorX: at.x,
    anchorY: at.y,
  });
  return OK;
}

/** The licence comes down the wire the moment it is paid for: nothing is delivered and nobody
 *  waits (CLAUDE.md T9 3.1). */
export function placeSoftwareOrder(state: GameState, mode: 'oneOff' | 'subscription'): BuyCheck {
  const check = orderSoftwareCheck(state, mode);
  if (!check.ok) return check;
  if (timeIsPaused(state)) state.speed = 1;
  return buySoftware(state, mode);
}

/** Taking somebody on is the one purchase that still costs the owner an hour: he interviews the
 *  man himself, and the man is taken on when the hour is spent (CLAUDE.md T7 3.10, T9 3.1). */
export function placeHireOrder(
  state: GameState,
  role: WorkerRole,
  tier: WorkerTier | null,
): BuyCheck {
  const order: TaskOrder = { kind: 'hire', role, tier };
  const check = orderCheck(state, order);
  if (!check.ok) return check;
  if (timeIsPaused(state)) state.speed = 1;
  const task = createTask(state, {
    kind: 'hiring',
    label: 'Interview',
    minutes: HIRING_MINUTES,
    orders: [order],
  });
  // He sits down for it as soon as he is free of the interview he is already in, and goes back to
  // whatever he put down when it is over (CLAUDE.md T4 3.3, T7 3.10).
  if (!onATrip(state)) interruptOwnerWith(state, task);
  return OK;
}

/** The interview is over: the man is taken on now (CLAUDE.md T7 3.10). */
function settleOrders(state: GameState, task: TaskInstance): void {
  const orders = task.orders;
  task.orders = [];
  for (const order of orders) hire(state, order.role, order.tier);
}

// ---------------------------------------------------------------------------
// Calling an order off, and selling a machine that stands in the hall (CLAUDE.md T8 3.5)
// ---------------------------------------------------------------------------

/** Calls an order off before the lorry: the cash comes back in full, the floor held for it is
 *  free again, and the books say what happened. One click (CLAUDE.md T8 3.5). */
export function cancelOrder(state: GameState, orderId: string): BuyCheck {
  const item = findOnOrder(state, orderId);
  if (item) {
    // At the gate is too late: it is here, and somebody has to take it off the lorry.
    if (item.arrived) return { ok: false, reason: 'It is at the gate' };
    if (timeIsPaused(state)) state.speed = 1;
    receive(state, 'equipment', `Order cancelled: ${orderName(item)}`, item.pricePaid);
    removeOnOrder(state, item.id);
    return OK;
  }
  // A load of sheets goes the same way: called off until the morning it lands, in full
  // (PIOTR, 15.09; CLAUDE.md T11 3.12).
  const delivery = findDelivery(state, orderId);
  if (!delivery) return { ok: false, reason: 'Nothing on order' };
  if (delivery.arrived) return { ok: false, reason: 'It is at the gate' };
  if (timeIsPaused(state)) state.speed = 1;
  refund(state, 'material', `Order cancelled: ${delivery.sheets} sheets`, delivery.pricePaid);
  state.deliveries = state.deliveries.filter((entry) => entry.id !== delivery.id);
  const job = delivery.jobId === null ? null : findJob(state, delivery.jobId);
  if (job !== null && job.stage === 'materialOrdered') {
    // The job is short again: Restock or another order for it (CLAUDE.md T13 3.3).
    job.stage = 'materialPending';
    refreshJob(state, job);
  }
  return OK;
}

/** Why this machine cannot be sold, or that it can (CLAUDE.md T8 3.5). The one place the refusals
 *  are written: the tile asks this and the action asks this. */
export function canSell(state: GameState, equipmentId: string): BuyCheck {
  const item = state.equipment.find((entry) => entry.id === equipmentId);
  if (!item) return { ok: false, reason: 'Nothing to sell' };
  if (isSold(item)) return { ok: false, reason: 'Sold, collection tomorrow' };
  if (!isSellableFamily(item.specId)) return { ok: false, reason: 'Nobody buys second hand fittings' };
  if (!itemStandsInTheHall(item)) return { ok: false, reason: 'It lives in a tool cabinet' };
  if (item.broken) return { ok: false, reason: 'It is broken. Fix it first' };
  if (item.takenBy !== null) return { ok: false, reason: 'Somebody is standing at it' };
  // A rack goes when it is empty and nobody is at it (PIOTR, 18.09; CLAUDE.md T20 2.10). The one
  // sentence: the Owned tab prints this very string.
  const storage = storageSaleBlock(state, item);
  if (storage !== '') return { ok: false, reason: storage };
  return OK;
}

/** Sells it. The buyer comes in the morning: until then it is marked sold and it does no work
 *  (CLAUDE.md T8 3.5). */
export function sellMachine(state: GameState, equipmentId: string): BuyCheck {
  const check = canSell(state, equipmentId);
  if (!check.ok) return check;
  const item = state.equipment.find((entry) => entry.id === equipmentId);
  if (!item) return check;
  if (timeIsPaused(state)) state.speed = 1;
  item.soldOnDay = nextWorkingDay(state.clock.day);
  item.takenBy = null;
  // Off the extraction the day it is sold; the buyer's van takes the machine, not the pipe.
  disconnectExtraction(state, item.id);
  return OK;
}

/** Lifting the lid on the laptop: it has to come up before anything on it can be touched, and
 *  the five minutes are the owner's like any other (CLAUDE.md T7 3.10). */
export function bootLaptop(state: GameState): BuyCheck {
  if (!has(state, 'laptop')) return { ok: false, reason: 'Needs a laptop first' };
  // Lifting the lid starts the clock if it was stopped (PIOTR, 13.09).
  if (timeIsPaused(state)) state.speed = 1;
  // Booted once today: it stays up, and opening it again costs nothing (PIOTR, 13.09). The day is
  // written down as the boot is STARTED and not when it finishes, so a boot the day end, a
  // holiday or a walk to the bench took off him unfinished can neither suppress tomorrow's nor be
  // paid for a second time days later (PIOTR, 16.09; CLAUDE.md T17 2.17).
  if (state.laptopBootedOnDay === state.clock.day) return OK;
  state.laptopBootedOnDay = state.clock.day;
  const task = createTask(state, {
    kind: 'booting',
    label: 'Waiting for the laptop',
    minutes: LAPTOP_BOOT_MINUTES,
  });
  interruptOwnerWith(state, task);
  return OK;
}
