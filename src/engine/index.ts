// Public API of the engine.
//
// Mutation policy: `createGame`, `tick` and `applyAction` are the only entry points. `tick` and
// `applyAction` deep clone the state they are given and return the clone, so the caller's state is
// never touched. Inside the engine, modules mutate the state they receive. The UI must always use
// the returned state and never write to a state object itself.
//
// The UI never computes economics. Everything it needs to show is a selector exported here.

export { applyAction, canBuy, canBuySoftware, createGame, ownerIsWorking, tick } from './game';
export type { BuyCheck, NewGameOptions } from './game';
export * from './types';

// Time
export {
  addWorkingDays,
  dayOfMonth,
  formatDate,
  formatTime,
  gameMinutesPerRealSecond,
  isFriday,
  isWorkingDay,
  monthOfDay,
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
  canAfford,
  dailyPower,
  dailyRates,
  dailyRent,
  monthlySalaryBill,
  nextDueDays,
  weeklyWageBill,
} from './economy';

// The board and the catalogue
export { boardSizeRange, canAccept } from './board';
export { availableFinishes, findTemplate, lockReasonFor, template } from './catalog';

// Jobs
export {
  findJob,
  minutesRemainingFor,
  oldestReadyJob,
  openJobs,
  ownerJob,
  readyToOrderMaterial,
  workerMinuteCost,
} from './jobs';

// Tasks
export {
  callsForPrice,
  clientCallMinutes,
  designMinutes,
  findTask,
  jobTasks,
  materialOrderMinutes,
  openTasks,
  softwareActive,
  taskCategory,
  tasksOfKind,
  unloadMinutes,
} from './tasks';

// Staff
export { availableJoiners, helpers, hiringOptions, joiners, workerById } from './staff';

// Machines, bags and dust
export {
  accidentRisk,
  bagBlocked,
  bagsExist,
  countOf,
  dustBand,
  findSpec,
  has,
  hallProductivityFactor,
  machineLabourFactor,
  machinesStopped,
  owned,
  specOf,
} from './machines';

// Material and deliveries
export {
  deliveriesDueTomorrow,
  deliveriesInYard,
  findDelivery,
  materialCostFor,
  sheetsForCost,
  stockCostFor,
  stockFree,
} from './materials';

// Reputation
export { clampReputation, ratingFor, reputationTier } from './reputation';
