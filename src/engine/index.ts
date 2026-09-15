// Public API of the engine.
//
// Mutation policy: `createGame`, `tick` and `applyAction` are the only entry points. `tick` and
// `applyAction` deep clone the state they are given and return the clone, so the caller's state is
// never touched. Inside the engine, modules mutate the state they receive. The UI must always use
// the returned state and never write to a state object itself.
//
// The UI never computes economics. Everything it needs to show is a selector exported here.

export {
  assignAir,
  applyAction,
  bootLaptop,
  canBuy,
  canBuySoftware,
  cancelOrder,
  canSell,
  createGame,
  sellMachine,
  landOrder,
  machineInUse,
  moveConfirmPending,
  orderCheck,
  orderEquipmentCheck,
  orderSoftwareCheck,
  placeEquipmentOrder,
  placeHireOrder,
  placeSoftwareOrder,
  runMinutes,
  summaryTotals,
  tick,
} from './game';
export { daySummaryOf } from './game';
export type { BuyCheck, NewGameOptions, TickResult } from './game';
export * from './types';

// Numbers the UI is allowed to print
export {
  APP_VERSION,
  CLEANING_MINUTES,
  DAY_CATEGORIES,
  DAY_CATEGORY_LABELS,
  EQUIPMENT_SPECS,
  MACHINE_ENDURANCE_HOURS,
  MACHINE_ENDURANCE_HOURS_DEFAULT,
  PRODUCTION_STAGES,
  DUCTING_RECONNECT_COST,
  EQUIPMENT_UNLOAD_MINUTES,
  MINUTES_PER_WORKING_DAY,
  MOVE_MINUTES_PER_ITEM,
  SKIP_SPEED,
  HIRING_MINUTES,
  LAPTOP_BOOT_MINUTES,
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
  dayOfWorkingIndex,
  dayOfMonth,
  formatDate,
  formatTime,
  gameMinutesPerRealSecond,
  timeIsPaused,
  isBreak,
  isFriday,
  isLastWorkingDayOfMonth,
  isOvertime,
  isWorkingDay,
  workedMinutesOfDay,
  monthOfDay,
  yearOfDay,
  weekOfDay,
  weekday,
  weekdayName,
  workingDayIndex,
  workingDaysBetween,
} from './clock';

// The owner
export {
  dayMinutesByCategory,
  dayPercentages,
  labourFactorFor,
  logDayMinute,
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
  monthsOfYear,
  totalsOfEntries,
  yearTotals,
  ledgerOfDay,
  summaryOfDay,
  dailyPower,
  formatMoney,
  dailyRates,
  dailyRent,
  monthlyFixedCosts,
  monthlySalaryBill,
  overtimePayFor,
  overtimeWageBill,
  netOf,
  nextDueDays,
  visibleTotals,
  weeklyWageBill,
} from './economy';
export type { DayMoney, MonthMoney } from './economy';

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
  meetingOutstanding,
  needsMeeting,
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
  stockCheck,
  transportLabel,
} from './jobs';
export { dropJob } from './jobs';
export { changeReputation, companyTotals } from './reputation';
export type { LifecycleStep, StartCheck, StepState } from './jobs';
export type { BagStore, OutputBreakdown, OutputLine } from './machines';

// Production in stages (CLAUDE.md T7 3.1)
export {
  cncFactor,
  cncOptions,
  currentStage,
  familyForStage,
  jobMinutesFor,
  jobOnCnc,
  labourDone,
  labourPerMinute,
  minutesLeftFor,
  stageAt,
  stageLabel,
  stageMinutes,
  stagePlanFor,
  stageSpeed,
} from './stages';
export type { StageOptions, StagePlan, StagedJob } from './stages';
// Air and dust that have to add up (CLAUDE.md T10 3.1, 3.2, 3.3)
export {
  airBlockFor,
  airCheck,
  airConsumers,
  airDemandOf,
  airHands,
  compressorAirOf,
  compressorFor,
  compressorHasDryer,
  compressorIsLow,
  compressorLabel,
  compressors,
  extractingMachines,
  extractionCapacityOf,
  extractionCheck,
  extractionDemandOf,
  extractionKit,
  familyAirBlock,
  hallAirCheck,
  mediaFigure,
  needsDryAir,
  sprayingOnWetAir,
  underExtracted,
} from './media';
export type { AirCheck, AirHands, CompressorLine, ExtractionCheck } from './media';

export {
  BOARD_DAYS_PAST_DUE,
  dayOfPoint,
  dayPoint,
  rateFor,
  stageText,
  workPlan,
  workshopRate,
} from './plan';
export type { PlanDay, PlanRow, WorkPlan } from './plan';

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
  bestTakerOf,
  DAY_CATEGORY_OF_TASK,
  HELPER_ONLY_KINDS,
  TASK_KINDS,
  WAITING_FOR_HELPER,
  dayCategoryOf,
  designMinutes,
  emptyBagsLabel,
  emptyBagsMinutes,
  isHelperTask,
  emailsForPrice,
  findTask,
  jobTasks,
  materialOrderMinutes,
  equipmentUnloadMinutes,
  finishTimeFor,
  movePending,
  interviewTask,
  ownerOutTask,
  skippedTask,
  movingMachines,
  openTasks,
  softwareActive,
  staffManagementMinutes,
  startTaskCheck,
  taskWorkRate,
  tasksOfKind,
  unloadMinutes,
} from './tasks';
export type { TaskStartCheck } from './tasks';

// Staff
export {
  availableJoiners,
  hasWorkingDay,
  helperOnDuty,
  homeCellOf,
  staysForOvertime,
  worksOvertime,
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
  OWNER,
  bagStore,
  bagStoreLine,
  bagsExist,
  bagsFull,
  bagsOf,
  dustOutputOf,
  cabinetTools,
  claimMachine,
  countOf,
  floorMachines,
  footprintOf,
  freeMachines,
  heldMachine,
  heldMachines,
  itemIsHeavy,
  itemStandsInTheHall,
  isHeavy,
  isSellableFamily,
  isSold,
  salePriceFor,
  machineIsShared,
  sheetCapacityOf,
  zoneOf,
  enduranceHoursFor,
  findVariant,
  freeBenches,
  hasBenchFor,
  machineOutputFactor,
  machinePowerPerDay,
  pastEndurance,
  variantFor,
  variantOf,
  deliveryDaysFor,
  ductedMoves,
  ductingDue,
  ductingIsFree,
  dustBand,
  outputBreakdown,
  findSpec,
  gateIsCrowded,
  has,
  brokenMachines,
  extractorBroken,
  familyStopped,
  requiresFor,
  requiresOneOfFor,
  standsInTheHall,
  serviceIsDue,
  hasCentralExtraction,
  hasExtraction,
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

// What is bought, paid for and not here yet (CLAUDE.md T8 3.2)
export {
  dayOneComplete,
  dayOneKit,
  dueDayFor,
  findOnOrder,
  shoppingList,
  onOrderCount,
  orderName,
  orderProgress,
  ordersDueOn,
  ordersOnTheWay,
  reservedItems,
} from './orders';
export type { DayOneItem, OrderLine } from './orders';

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
  reservationById,
} from './layout';
export type { Box, PlaceCheck } from './layout';

// Where everybody is standing
export {
  STATION_BENCH,
  STATION_GATE,
  STATION_IDLE,
  STATION_NO_BENCH,
  STATION_OFFICE,
  STATION_PHONE,
  STATION_RACK,
  machineStation,
  stationForTask,
  stationMachine,
  stationWaitingFor,
  waitingStation,
} from './stations';

// Text
export { cubicMetres, plural, trimmed } from './text';

// Reputation
export {
  callRatingFactor,
  clampReputation,
  emailRatingFactor,
  formatReputation,
  madeInADustyWorkshop,
  ratingFor,
  reputationTier,
} from './reputation';
