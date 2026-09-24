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
  buyGate,
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
  EQUIPMENT_UNLOAD_MINUTES,
  MINUTES_PER_WORKING_DAY,
  MOVE_MINUTES_PER_ITEM,
  SKIP_SPEED,
  HIRING_MINUTES,
  LAPTOP_BOOT_MINUTES,
  STATE_VERSION,
  WHY,
  SHEET_PRICE_LADDER,
  SHEET_VALUE,
  SOFTWARE_ONE_OFF_PRICE,
  SOFTWARE_SUBSCRIPTION_MONTHLY,
  SPEEDS,
  // Turn 13 (CLAUDE.md T13 section 3): the tables the UI prints and nothing else.
  CLASS_BADGE,
  CLASS_LADDER_FAMILIES,
  CLASS_ORDER,
  CONSUMABLES_LABEL,
  EFFICIENCY_CAUSES,
  HOUSE_CARD_SECONDS,
  // Turn 22 (CLAUDE.md T22 2.5) and Turn 21 (T21 2.8): the words of the mark over a man's head and
  // the reasons the owner stood.
  BUBBLES,
  BUBBLE_HEAD_GAP,
  OWNER_IDLE_REASONS,
  HOUSE_TIER_NAMES,
  LOAN_FLOOR,
  LOAN_SALES_MONTHS,
  LOAN_SHARE_OF_SALES,
  LOW_STOCK_SHEETS,
  OWNER_DRAW_TIERS,
  SECURITY_LEVELS,
  TIPS,
  WEBSITE_LEVELS,
} from './constants';
export type { ContractPieceSpec, SecurityLevelSpec, WebsiteLevelSpec } from './constants';

// Turn 13 modules, one per group (CLAUDE.md T13 2.2)
export {
  accrueOverdraftInterest,
  loanCheck,
  loanInstalmentFor,
  loanLimit,
  loanLimitLine,
  loanInterestForMonth,
  repayLoan,
  runFinanceMonth,
  takeLoan,
} from './finance';
export type { FinanceCheck } from './finance';
export {
  claimBurglary,
  coversHeld,
  insuredValue,
  liabilityPremiumYearly,
  onAccident,
  propertyPremiumYearly,
  refreshInsuredValue,
  runInsuranceDay,
  runInsuranceMonth,
  setInsurance,
} from './insurance';
export {
  acceptContract,
  activeContracts,
  assignContract,
  declineContract,
  findContract,
  offerContract,
  offeredContract,
  renewContract,
  runContractDay,
  runContractMinute,
} from './contracts';
export type { ContractCheck } from './contracts';
export {
  setWebsiteLevel,
  websiteCheck,
  websiteEnquiriesPerWeek,
  websiteLevel,
  websiteQualityShift,
  websiteReputationBonus,
  websiteSpec,
  websiteUpkeepMinutes,
} from './website';
export type { WebsiteCheck } from './website';
export {
  burglaryRiskMonthly,
  rollBurglary,
  runSecurityMonth,
  securityCheck,
  securityLevel,
  securitySpec,
  securitySubscriptionMonthly,
  setSecurityLevel,
} from './security';
export type { SecurityCheck } from './security';
export {
  connectCheck,
  connectExtraction,
  disconnectExtraction,
  dropOrphanPipes,
  isConnected,
  nearestTarget,
  pipeCostFor,
  pipeRunFor,
  pipeTargets,
  routePipe,
  unconnectedMachines,
  wantsExtraction,
} from './pipes';
export type { PipeCheck } from './pipes';
export { efficiencyOf, emptyEfficiency, workshopEfficiency } from './efficiency';
export type { Efficiency, EfficiencyLine } from './efficiency';
export { warnings } from './warnings';
export type { Warning } from './warnings';
export { crewLimit, freeFloorM2 } from './layout';

// Time
export {
  addWorkingDays,
  dayOfWorkingIndex,
  dayOfMonth,
  formatCalendarDay,
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
  monthName,
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
  absenceFactor,
  dayMinutesByCategory,
  dayPercentages,
  emptyOwnerIdle,
  houseTierFor,
  labourFactorFor,
  logDayMinute,
  managerOnDuty,
  ownerDrawPaidInWindow,
  ownerDrawPerDay,
  ownerEfficiency,
  ownerIsAvailable,
  ownerMinutesLeft,
  ownerMinutesToday,
  spendOwnerIdleMinute,
  staffOutputFactor,
  startHoliday,
} from './owner';

// Money
export {
  booksBehind,
  canAfford,
  charge,
  daysOfMonth,
  joineryCoreMonthly,
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
  netOf,
  nextDueDays,
  visibleTotals,
  monthlyWageBill,
} from './economy';
export type { DayMoney, MonthMoney } from './economy';

// The board and the catalogue
export {
  answerSkew,
  arriveEnquiries,
  boardSizeRange,
  canAccept,
  drawOffer,
  enquiriesDueToday,
  expressProbability,
  qualifiesForCommercial,
  skewed,
} from './board';
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
  BUILDING_ROLES,
  addToJob,
  canBuild,
  hallBlock,
  isOnJob,
  jobMen,
  takeOffJob,
  labourValueFor,
  leadAssignee,
  removeAssignee,
  marginOfPrice,
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
  orderForJobCheck,
  orderShortfall,
  ownerJob,
  paperworkDone,
  resolveClientOffer,
  showsStartProduction,
  stagedJob,
  startProductionCheck,
  takeEnquiry,
  takeOffOutstanding,
  transportLabel,
} from './jobs';
export { dropJob, dropReputationCost } from './jobs';
export { changeReputation, companyTotals } from './reputation';
export type { LifecycleStep, StartCheck, StepState } from './jobs';
export type {
  BagStore,
  OutputBreakdown,
  OutputLine,
  WorkshopBreakdown,
  WorkshopBreakdownRow,
} from './machines';

// Production in stages (CLAUDE.md T7 3.1)
export {
  cncFactor,
  currentStage,
  familyForStage,
  jobMinutesFor,
  jobOnCnc,
  labourDone,
  labourPerMinute,
  jobPace,
  minutesLeftFor,
  stageDone,
  stageLabel,
  stageLeft,
  stageMinutes,
  stagePlanFor,
  stageSpeed,
  tradeFactor,
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
  isConnectedToExtraction,
  unservedMachines,
  extractionCapacityOf,
  extractionStanding,
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
  estimatorCapacity,
  handlingIn,
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
  canQueueTask,
  cleanerAtWork,
  manOnOpenTask,
  softwareActive,
  startTaskCheck,
  taskWorkRate,
  tasksOfKind,
  unloadMinutes,
} from './tasks';
export type { TaskStartCheck } from './tasks';

// Staff
export {
  availableJoiners,
  crewCount,
  crewFull,
  crewLine,
  freeToolSlots,
  hasWorkingDay,
  helperOnDuty,
  homeCellOf,
  helpers,
  hiringOptions,
  isWorkingToday,
  joiners,
  officeStaff,
  slotsInUseIn,
  staffMinutesLeft,
  toolSlots,
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
  countOf,
  floorMachines,
  footprintOf,
  hallPlaces,
  itemIsHeavy,
  itemStandsInTheHall,
  isHeavy,
  isSellableFamily,
  benchOf,
  benchPlaces,
  machineForPlace,
  machinesAtWork,
  menAtMachine,
  menAtPlaces,
  placesOf,
  isServiced,
  isSold,
  salePriceFor,
  toolSlotsLine,
  toolSlotsOf,
  machineIsShared,
  sheetCapacityOf,
  zoneOf,
  enduranceHoursFor,
  findVariant,
  freeBenches,
  hallHasABench,
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
  workshopOutputToday,
  workshopBreakdownToday,
  HALL_ROW,
  bookOutputMinute,
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
  serviceDueOn,
  serviceDueIn,
  daysSinceService,
  hasCentralExtraction,
  hasExtraction,
  needsDucting,
  machinesDueService,
  overdueBreakdownChance,
  owned,
  repairCostFor,
  serviceCostFor,
  wearPerMinuteOf,
  machineWearPerMinute,
  bestMachineOf,
  SPRAY_BOOTH,
  // The service rule and the dirt the helper answers, Turn 20 (CLAUDE.md T20 2.8, 2.9).
  hallLooksDirty,
  hoursPastLife,
  lifeAfterServices,
  machineIsOut,
  machinesInService,
  originalLifeOf,
  sawdustPiles,
  serviceCallCheck,
  weeksPastLife,
} from './machines';

// Who stands at which machine, and nobody waits for one (CLAUDE.md T25 2.3; v53)
export {
  dayPlan,
  familiesFor,
  hands,
  jobOf,
  placeLine,
  planPlaces,
  stageOfMan,
} from './production';
export type { Hand, PlaceEntry } from './production';

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
  freeSheets,
  materialCostFor,
  orderForJobCost,
  rackCanSupply,
  rackCapacity,
  reservedSheets,
  reserveSheetsFor,
  restockSheets,
  sheetsDueFor,
  sheetsForCost,
  shortfallOf,
  sheetPriceFor,
  stockCostFor,
  stockFree,
  stockIsLow,
  stockNumberFor,
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
  STATION_DOOR,
  STATION_GATE,
  STATION_HOME,
  STATION_IDLE,
  STATION_OFFICE,
  STATION_PHONE,
  STATION_RACK,
  machineStation,
  placeCellsAt,
  stationForTask,
  stationMachine,
} from './stations';

// Text
export { cubicMetres, metresBy, plural, trimmed } from './text';

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

// Turn 13 phase C: what the phase B groups added to their modules, exported here so the UI
// reads the one public surface (CLAUDE.md T13 2.1, T13-C1).
export {
  loanCapitalForMonth,
  nextInstalmentFor,
  overdraftInterestForDay,
  repayCheck,
} from './finance';
export {
  COVER_LABELS,
  firstPremiumFor,
  insuranceCheck,
  insuredMachinesValue,
  insuredStockValue,
  monthlyPremiums,
  premiumMonthlyFor,
  premiumYearlyFor,
  propertyCoverVoid,
} from './insurance';
export type { InsuranceCheck, InsuranceCover } from './insurance';
export {
  closeWeek,
  closingReport,
  CONTRACT_MARKER,
  contractAssignCheck,
  contractCounterLine,
  contractHands,
  contractMarker,
  contractMen,
  contractOfWorker,
  contractPiece,
  contractPriceFor,
  contractQuantityBand,
  contractReferenceFor,
  contractsAllowed,
  contractStationFor,
  drawContract,
  endContract,
  endedContracts,
  fullWeeksOf,
  offerCarrier,
  renegotiatedPriceFor,
  shortWeeksOf,
  termWeeksFor,
  weekOfTerm,
  weekWanted,
} from './contracts';
export type { ClosingReport, ContractMinute, ContractReference } from './contracts';
export {
  websiteLadder,
} from './website';
export type { WebsiteRung } from './website';
export {
  topCause,
} from './efficiency';
export {
  pendingStockSheets,
  restockCheck,
  stockLines,
} from './materials';
export type { RestockCheck, StockLine } from './materials';
export {
  enquiryQualityTier,
  websiteEnquiriesOn,
} from './board';
export {
  effectiveReputation,
} from './reputation';
export {
  hurtWorker,
  nightCrew,
  nightPremiumFor,
  onTheBooksToday,
  rollNightAccident,
  rollNightBreakdowns,
  runNightShift,
  secondShiftCheck,
  secondShiftRuns,
  shiftOf,
} from './staff';
export type { NightReport } from './staff';
export {
  holidayCheck,
  houseSumFor,
  nightQualityPenalty,
  nightShareOf,
  onHoliday,
  workingDaysInHouseWindow,
} from './owner';
export {
  joineryCoreOffer,
} from './tasks';
export type { JoineryCoreOffer } from './tasks';
export {
  canWorkOn,
  WAITING_FOR_MATERIAL,
  workMinute,
} from './production';
export type { MinuteReport } from './production';
export {
  MONTH_LINE_OF,
  MONTH_LINES,
  monthReport,
  monthlyReportFor,
} from './economy';
export type { MonthLine, MonthLineId, MonthReport, MonthlyReport } from './economy';
export {
  gateCheck,
  hasGate,
  insuranceAddedYearly,
  classPaceOf,
  hallPace,
  paceOf,
  paceLines,
  placesLine,
  crewOnTheFloor,
  fullCrew,
  familyRuns,
  placeShortages,
  shortageLine,
} from './machines';
export type { PlaceShortage } from './machines';
export {
  extractionLoad,
  extractionRunning,
} from './media';
export {
  footprintOrigin,
  pathBetween,
  portCell,
  runCells,
  tileKeysFor,
} from './pipes';
export {
  unloadLegAt,
  unloadStation,
  unloadTrips,
} from './stations';
export {
  burglaryPaidOut,
  burglaryTargets,
  burgle,
  securitySubscriptionParts,
} from './security';
export {
  ANSWER_SKEW_NEUTRAL_TIER,
  CONTRACT_CLIENTS,
  CONTRACT_OFFER_CHANCE_PER_DAY,
  CONTRACT_QUANTITY_STEP,
  DUST_PER_SAWDUST_PILE,
  HOLIDAY_OPTIONS_DAYS,
  LIFE_LOW_FRACTION,
  PAST_LIFE_WEEK_HOURS,
  SERVICE_LIFE_EXTENSION,
  STOCK_LINE_KINDS,
  STOCK_LINE_NAME,
  TAKE_OFF_BUTTON_LABEL,
} from './constants';
export { laptopHome } from './laptop';
export type { LaptopHome } from './laptop';
