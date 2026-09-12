// Public API of the engine.
//
// Mutation policy: `createGame`, `tick` and `applyAction` are the only entry points. `tick` and
// `applyAction` deep clone the state they are given and return the clone, so the caller's state is
// never touched. Inside the engine, modules mutate the state they receive. The UI must always use
// the returned state and never write to a state object itself.
//
// The UI never computes economics. Everything it needs to show is a selector exported here.

export { applyAction, canBuy, canBuySoftware, createGame, runMinutes, tick } from './game';
export type { BuyCheck, NewGameOptions, TickResult } from './game';
export * from './types';

// Numbers the UI is allowed to print
export {
  CLEANING_MINUTES,
  MINUTES_PER_WORKING_DAY,
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
  isFriday,
  isWorkingDay,
  weekday,
  weekdayName,
} from './clock';

// The owner
export {
  hourEfficiency,
  ownerEfficiency,
  ownerIsAvailable,
  ownerMinutesLeft,
  staffOutputFactor,
} from './owner';

// Money
export {
  arrearsCarryInterest,
  canAfford,
  dailyPower,
  formatMoney,
  dailyRates,
  dailyRent,
  monthlyFixedCosts,
  monthlySalaryBill,
  netOf,
  nextDueDays,
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
  findJob,
  jobLabourCost,
  jobsAtGate,
  minutesRemainingFor,
  oldestReadyJob,
  jobProgress,
  jobSpeedFactor,
  openJobs,
  ownerJob,
  transportLabel,
} from './jobs';

// Tasks
export {
  callsForPrice,
  clientCallMinutes,
  designMinutes,
  findTask,
  materialOrderMinutes,
  openTasks,
  softwareActive,
  staffManagementMinutes,
  tasksOfKind,
  unloadMinutes,
} from './tasks';

// Staff
export { availableJoiners, helpers, hiringOptions, isWorkingToday, joiners, workerById } from './staff';

// Machines, bags and dust
export {
  accidentRisk,
  bagBlocked,
  bagsExist,
  countOf,
  dustBand,
  findSpec,
  gateIsCrowded,
  has,
  machineLabourFactor,
  machinesStopped,
  owned,
} from './machines';

// Material and deliveries
export {
  canUnload,
  deliveriesArrivingOn,
  deliveriesInYard,
  deliveriesOnTheWay,
  materialCostFor,
  materialModeLabel,
  rackCapacity,
  sheetsDueFor,
  sheetsForCost,
  stockCostFor,
  stockFree,
  stockIsLow,
} from './materials';

// Reputation
export { clampReputation, formatReputation, ratingFor, reputationTier } from './reputation';
