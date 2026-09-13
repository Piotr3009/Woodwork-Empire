// Public API of the engine.
//
// Mutation policy: `createGame`, `tick` and `applyAction` are the only entry points. `tick` and
// `applyAction` deep clone the state they are given and return the clone, so the caller's state is
// never touched. Inside the engine, modules mutate the state they receive. The UI must always use
// the returned state and never write to a state object itself.
//
// The UI never computes economics. Everything it needs to show is a selector exported here.

export {
  applyAction,
  canBuy,
  canBuySoftware,
  createGame,
  machineInUse,
  runMinutes,
  summaryTotals,
  tick,
} from './game';
export { daySummaryOf } from './game';
export type { BuyCheck, NewGameOptions, TickResult } from './game';
export * from './types';

// Numbers the UI is allowed to print
export {
  CLEANING_MINUTES,
  EQUIPMENT_SPECS,
  GANTT_STAGES,
  MACHINE_ENDURANCE_HOURS,
  MACHINE_ENDURANCE_HOURS_DEFAULT,
  PRODUCTION_STAGES,
  DUCTING_RECONNECT_COST,
  MINUTES_PER_WORKING_DAY,
  MOVE_MINUTES_PER_ITEM,
  MOVING_SPEED,
  STATE_VERSION,
  WHY,
  SHEET_PRICE_STOCK,
  SHEET_VALUE,
  SOFTWARE_ONE_OFF_PRICE,
  SOFTWARE_SUBSCRIPTION_MONTHLY,
  SPEEDS,
} from './constants';

// Time
export {
  addWorkingDays,
  dayOfMonth,
  formatDate,
  formatTime,
  gameMinutesPerRealSecond,
  isBreak,
  isFriday,
  isLastWorkingDayOfMonth,
  isOvertime,
  isWorkingDay,
  workedMinutesOfDay,
  monthOfDay,
  weekOfDay,
  weekday,
  weekdayName,
} from './clock';

// The owner
export {
  labourFactorFor,
  ownerEfficiency,
  ownerIsAvailable,
  ownerMinutesLeft,
  ownerMinutesToday,
  staffOutputFactor,
} from './owner';

// Money
export {
  arrearsCarryInterest,
  booksBehind,
  canAfford,
  daysOfMonth,
  earnedRate,
  ledgerOfDay,
  summaryOfDay,
  dailyPower,
  formatMoney,
  dailyRates,
  dailyRent,
  monthlyFixedCosts,
  monthlySalaryBill,
  netOf,
  nextDueDays,
  visibleTotals,
  weeklyWageBill,
} from './economy';

// The board and the catalogue
export { boardSizeRange, canAccept, expressProbability } from './board';
export {
  availableFinishes,
  findTemplate,
  lockReasonFor,
  marketPriceFactor,
  template,
} from './catalog';

// Jobs
export {
  emailsOutstanding,
  findJob,
  hallBlock,
  labourValueFor,
  lifecycleSteps,
  ownerDaysFor,
  jobLabourCost,
  jobStage,
  jobsAtGate,
  minutesRemainingFor,
  oldestReadyJob,
  jobProgress,
  openJobs,
  ownerJob,
  showsStartProduction,
  stagedJob,
  startProductionCheck,
  transportLabel,
} from './jobs';
export type { LifecycleStep, StartCheck, StepState } from './jobs';

// Production in stages (CLAUDE.md T7 3.1)
export {
  currentStage,
  familyForStage,
  jobMinutesFor,
  labourDone,
  labourPerMinute,
  minutesLeftFor,
  stageAt,
  stageLabel,
  stageMinutes,
  stagePlanFor,
  stageSpeed,
} from './stages';
export type { StagePlan, StagedJob } from './stages';

// Client calls
export {
  callRinging,
  callsForPrice,
  callsScheduled,
  callsTaken,
  dueCall,
  nextDueCall,
  penalisedMisses,
} from './calls';

// Tasks
export {
  designMinutes,
  emailsForPrice,
  findTask,
  jobTasks,
  materialOrderMinutes,
  movePending,
  movingMachines,
  openTasks,
  softwareActive,
  staffManagementMinutes,
  startTaskCheck,
  tasksOfKind,
  unloadMinutes,
} from './tasks';
export type { TaskStartCheck } from './tasks';

// Staff
export {
  availableJoiners,
  hasWorkingDay,
  helpers,
  hiringOptions,
  isWorkingToday,
  joiners,
  officeStaff,
  staffMinutesLeft,
  workerById,
} from './staff';

// Machines, bags and dust
export {
  accidentRisk,
  bagBlocked,
  bagIntervalFor,
  OWNER,
  bagsExist,
  claimMachine,
  countOf,
  freeMachines,
  heldMachine,
  heldMachines,
  enduranceHoursFor,
  findVariant,
  freeBenches,
  hasBenchFor,
  machineOutputFactor,
  machinePowerPerDay,
  machinesUsedFor,
  pastEndurance,
  variantFor,
  variantOf,
  ductedMoves,
  ductingDue,
  ductingIsFree,
  dustBand,
  findSpec,
  gateIsCrowded,
  has,
  brokenMachines,
  extractorBroken,
  serviceIsDue,
  hasCentralExtraction,
  hasExtraction,
  machineLabourFactor,
  needsDucting,
  machinesDueService,
  overdueBreakdownChance,
  owned,
  repairCostFor,
  serviceCostFor,
} from './machines';

// Who is standing at which machine (CLAUDE.md T7 3.1)
export {
  familiesWanted,
  familyShareOfJob,
  hands,
  jobOf,
  machineHoursPerDay,
  serviceDueOn,
  stationForProduction,
  takeMachines,
} from './production';
export type { Hand, StationCheck } from './production';

// Material and deliveries
export {
  canUnload,
  deliveriesArrivingOn,
  deliveriesInYard,
  deliveriesOnTheWay,
  materialCostFor,
  materialModeLabel,
  rackCanSupply,
  rackCapacity,
  sheetsDueFor,
  sheetsForCost,
  stockCostFor,
  stockFree,
  stockIsLow,
} from './materials';

// The hall floor
export {
  boxOf,
  canPlace,
  canPlaceSpec,
  firstFreeCell,
  gateLane,
  hallItems,
} from './layout';
export type { Box, PlaceCheck } from './layout';

// Where everybody is standing
export {
  STATION_BENCH,
  STATION_GATE,
  STATION_IDLE,
  STATION_NO_BENCH,
  STATION_OFFICE,
  STATION_RACK,
  machineStation,
  stationForTask,
  stationMachine,
  stationWaitingFor,
  waitingStation,
} from './stations';

// Text
export { plural } from './text';

// Reputation
export {
  callRatingFactor,
  clampReputation,
  emailRatingFactor,
  formatReputation,
  ratingFor,
  reputationTier,
} from './reputation';
