// All shapes of the simulation. Everything here is plain JSON: no classes, no functions,
// no Map, no Set. `JSON.parse(JSON.stringify(state))` must return an identical state.

export type Difficulty = 'veryEasy' | 'easy' | 'hard';

/** 0 is paused. Nothing above 4x exists (CLAUDE.md 6.1). */
export type Speed = 0 | 1 | 2 | 4;

export type MaterialKind = 'sheet' | 'solidWood';

export type Finish = 'laminate' | 'lacquer' | 'veneer';

export type SoftwareTier = 'basic' | 'standard' | 'pro';

export type SoftwareMode = 'none' | 'oneOff' | 'subscription';

export type TaskCategory = 'admin' | 'design' | 'workshop';

export type WorkerRole = 'joiner' | 'helper' | 'officeAdmin' | 'purchasingClerk' | 'salesman';

export type WorkerTier = 'poor' | 'normal' | 'super';

export type EquipmentCategory =
  | 'furniture'
  | 'machine'
  | 'bench'
  | 'welfare'
  | 'tools'
  | 'vehicle'
  | 'extraction'
  | 'storage';

/** One class of a machine: the same job done by a worn out one or by an industrial one
 *  (CLAUDE.md T3 3.5). Every family has at least one. */
export interface EquipmentVariant {
  id: string;
  name: string;
  price: number;
  /** Multiplies the production speed of every job that goes through this machine. */
  outputFactor: number;
  /** Multiplies the family's base bag interval. Below 1 means the bag fills sooner. */
  bagIntervalFactor: number;
  /** Multiplies the family's base endurance in hours. */
  enduranceFactor: number;
  /** Power this one draws a day. */
  powerPerDay: number;
  /** Two or three lines of plain English about what this class of machine is. */
  description: string;
}

/** One line of the day 1 catalogue (CLAUDE.md 9.2). A catalogue line is a family: the modal
 *  behind it shows one tile per variant (CLAUDE.md T3 3.5). */
export interface EquipmentSpec {
  id: string;
  name: string;
  price: number;
  category: EquipmentCategory;
  /** Footprint in tiles. */
  width: number;
  depth: number;
  height: number;
  spriteKey: string;
  /** Minutes of use before the bag is full. 0 means the item has no bag. */
  bagInterval: number;
  /** The machine only runs on jobs of this material. null means every job. */
  usedOn: MaterialKind | null;
  /** Multiplies the labour of every job. 1 means no effect. */
  labourFactor: number;
  /** Only applies to jobs of this material kind. null means every job. */
  labourAppliesTo: MaterialKind | null;
  /** Multiplies unloading minutes. 1 means no effect. */
  unloadFactor: number;
  /** Sheets this item can hold on the rack. 0 for everything that is not shelving. */
  sheetCapacity: number;
  /** Reputation needed to buy. */
  minReputation: number;
  /** Parked for a later stage: shown with a price, buy button disabled. */
  locked: boolean;
  lockReason: string;
  /** One per worker (workbench, locker, canteen seat, hand tool set). */
  perWorker: boolean;
  /** More than one may be owned. */
  stackable: boolean;
  /** Other catalogue ids that must be owned first. */
  requires: string[];
  effect: string;
  /** What this family can be bought as, cheapest first. The catalogue price is the first one. */
  variants: EquipmentVariant[];
  /** Hours of use a standard one of these has in it [TUNE]. */
  enduranceHours: number;
}

/** A purchased item standing in the hall. */
export interface Equipment {
  id: string;
  specId: string;
  /** Which variant of its family was bought (CLAUDE.md T3 3.5). */
  variantId: string;
  spriteKey: string;
  anchorX: number;
  anchorY: number;
  /** Minutes of production since the last bag change. */
  minutesUsed: number;
  bagFull: boolean;
  broken: boolean;
  /** Day of the last service. A machine is bought serviced. */
  lastServiceDay: number;
  /** Hours of use it has in it, family base times the variant factor. */
  enduranceHours: number;
  /** Hours of use it has had. Past its endurance it starts giving up. */
  hoursUsed: number;
  purchasePrice: number;
}

export interface ProductTemplate {
  id: string;
  name: string;
  basePrice: number;
  material: MaterialKind;
  designMinutes: number;
  calls: number;
  deadlineMinDays: number;
  deadlineMaxDays: number;
  needsMeasure: boolean;
  requiredEquipment: string[];
  allowedFinishes: Finish[];
  minReputation: number;
  /** Draw weight per reputation tier, index 0 is the lowest tier. */
  weightsByTier: number[];
  byHandAllowed: boolean;
}

export interface Clock {
  /** 1-based absolute day. Day 1 is a Monday. */
  day: number;
  /** Minutes since 08:00. 480 is 16:00. Overtime runs above 480. */
  minute: number;
}

export interface OwnerState {
  present: boolean;
  minutesByCategory: Record<TaskCategory, number>;
  minutesWorked: number;
  /** Overtime minutes worked today. Drives tomorrow's fatigue. */
  overtimeMinutes: number;
  /** Efficiency penalty carried from yesterday's overtime, 0 to 1. */
  fatigue: number;
  wentHome: boolean;
  currentTaskId: string | null;
  sickDaysRemaining: number;
  /** Absolute day the next sick leave starts. */
  sickStartDay: number | null;
  /** Player asked to stay home today. */
  stayHome: boolean;
  /** Where he is standing: bench, machine:<specId>, rack, gate, office or idle. */
  station: string;
  /** Minutes of production worked, which drives the bench and machine cycle. */
  productionMinutes: number;
}

export interface UnitState {
  areaM2: number;
  widthTiles: number;
  depthTiles: number;
  rentMonthly: number;
  ratesMonthly: number;
  benchSlots: number;
  /** One month of rent the landlord holds. Returned on a move, which is parked. */
  depositHeld: number;
}

export interface Worker {
  id: string;
  name: string;
  role: WorkerRole;
  tier: WorkerTier | null;
  /** Fraction of the owner's speed. 0 for non-production roles. */
  rate: number;
  weeklyWage: number;
  monthlyWage: number;
  startDay: number;
  jobId: string | null;
  taskId: string | null;
  /** Minutes of his own day spent so far. Office roles have 480 of them (CLAUDE.md T2 3.8). */
  minutesWorked: number;
  /** Per job material orders this clerk has put through today. */
  ordersToday: number;
  /** Where he is standing: bench, machine:<specId>, rack, gate, office or idle. */
  station: string;
  /** Minutes of production worked, which drives the bench and machine cycle. */
  productionMinutes: number;
  absentDaysRemaining: number;
  anchorX: number;
  anchorY: number;
}

export interface HiringOption {
  role: WorkerRole;
  tier: WorkerTier | null;
  label: string;
  rate: number;
  weeklyWage: number;
  monthlyWage: number;
  minReputation: number;
  available: boolean;
  blockReason: string;
  /** Catalogue ids that must be bought before this hire is possible. */
  missing: string[];
  missingCost: number;
}

export interface Enquiry {
  id: string;
  templateId: string;
  name: string;
  sizeMultiplier: number;
  /** What the client pays. An express job carries the 20% uplift here and nowhere else. */
  price: number;
  /** The price the material and the labour are worked out from: no express uplift. */
  basePrice: number;
  finish: Finish;
  materialKind: MaterialKind;
  deadlineDays: number;
  express: boolean;
  bespokeMaterial: boolean;
  needsMeasure: boolean;
  createdDay: number;
  /** Last day the enquiry is on the board. */
  expiresOnDay: number;
  lockReason: string | null;
  byHandAvailable: boolean;
}

export type JobStage =
  | 'accepted'
  | 'materialPending'
  | 'materialOrdered'
  | 'materialInYard'
  | 'ready'
  | 'inProduction'
  | 'awaitingTransport'
  | 'completed';

export type MaterialMode = 'perJob' | 'stock';

export interface Job {
  id: string;
  templateId: string;
  name: string;
  price: number;
  /** The price the material and the labour were worked out from: no express uplift. */
  basePrice: number;
  sizeMultiplier: number;
  finish: Finish;
  materialKind: MaterialKind;
  materialCost: number;
  materialMode: MaterialMode;
  sheets: number;
  /** Whole sheets already taken off the rack for this job. */
  sheetsUsed: number;
  /** Why the job is standing still, in plain English. Empty while nothing is in its way. */
  blockedBy: string;
  bespokeMaterial: boolean;
  express: boolean;
  byHand: boolean;
  needsMeasure: boolean;
  /** 0.40 P of the price: the labour the job carries. */
  labourValue: number;
  /** Labour still to do. Machine reductions and the by hand penalty act on the minutes it takes
   *  to work this off, not on the figure itself (CLAUDE.md 9.5). */
  labourRemaining: number;
  acceptedDay: number;
  dueDay: number;
  stage: JobStage;
  /** Day the piece was finished and stood at the gate. */
  finishedDay: number | null;
  /** Transport is booked and the piece leaves on this day. Null while nothing is booked. */
  deliverOnDay: number | null;
  callsRemaining: number;
  designMinutesRemaining: number;
  assignedTo: string | null;
  completedDay: number | null;
  daysLate: number;
  depositPaid: number;
  balancePaid: number;
  penalty: number;
  /** Emails still unanswered when the client took delivery. */
  emailsUnanswered: number;
  rating: number | null;
  overdueWarned: boolean;
}

export interface Delivery {
  id: string;
  jobId: string | null;
  sheets: number;
  arriveDay: number;
  arrived: boolean;
  unloaded: boolean;
  bespoke: boolean;
  /** Sheets that did not fit in the rack and still need a decision. */
  overflowSheets: number;
}

export type TaskKind =
  | 'emails'
  | 'bookkeeping'
  | 'dailyOrdering'
  | 'staffManagement'
  | 'clientCall'
  | 'design'
  | 'materialOrder'
  | 'siteMeasure'
  | 'unload'
  | 'bagChange'
  | 'cleaning'
  | 'fetchStorage'
  | 'deliver'
  | 'service'
  | 'repair';

export interface TaskInstance {
  id: string;
  kind: TaskKind;
  category: TaskCategory;
  label: string;
  minutesTotal: number;
  minutesRemaining: number;
  jobId: string | null;
  equipmentId: string | null;
  deliveryId: string | null;
  /** Day the task belongs to. Daily tasks are created fresh each working day. */
  day: number;
  done: boolean;
  /** Day it was finished. Null while it is still open. */
  doneDay: number | null;
  /** Worker id, 'owner', or null while nobody works on it. */
  doneBy: string | null;
}

export type GameEventKind =
  | 'deliveryArrived'
  | 'stockOverflow'
  | 'bagFull'
  | 'machineBroken'
  | 'serviceDue'
  | 'noMaterial'
  | 'lowStock'
  | 'accident'
  | 'dayEnd'
  | 'weekend'
  | 'wagesPaid'
  | 'monthlyBills'
  | 'arrearsWarning'
  | 'arrearsFinalWarning'
  | 'bailiff'
  | 'bankruptcy'
  | 'ownerSick'
  | 'jobOverdue'
  | 'lateAccounts'
  | 'jobAtGate'
  | 'jobPaid';

export interface GameEventChoice {
  id: string;
  label: string;
}

export type JsonValue = string | number | boolean | null;

export interface GameEvent {
  id: string;
  kind: GameEventKind;
  title: string;
  body: string;
  choices: GameEventChoice[];
  data: Record<string, JsonValue>;
  day: number;
  minute: number;
}

export type LedgerCategory =
  | 'rent'
  | 'rates'
  | 'power'
  | 'living'
  | 'wages'
  | 'salaries'
  | 'software'
  | 'waste'
  | 'equipment'
  | 'material'
  | 'unitDeposit'
  | 'jobDeposit'
  | 'jobBalance'
  | 'interest'
  | 'repair'
  | 'storage'
  | 'taxi'
  | 'transport'
  | 'accounts'
  | 'pellets'
  | 'arrears'
  | 'seizure';

export interface LedgerEntry {
  id: string;
  day: number;
  minute: number;
  category: LedgerCategory;
  label: string;
  /** Positive is money in, negative is money out. */
  amount: number;
  balance: number;
  /** True when no cash moved: a cost that became arrears, or a credit applied against them. */
  unpaid: boolean;
}

export interface PeriodTotals {
  income: number;
  costs: number;
  byCategory: Record<string, number>;
}

export interface BookedTotals {
  day: PeriodTotals;
  week: PeriodTotals;
  month: PeriodTotals;
}

export interface FinanceState {
  overdraftLimit: number;
  arrearsAmount: number;
  arrearsMonths: number;
  firstArrearsDay: number | null;
  day: PeriodTotals;
  week: PeriodTotals;
  month: PeriodTotals;
  /** What the books said the last time somebody wrote them up. */
  booked: BookedTotals;
}

export interface StockState {
  sheets: number;
  /** Sheets sitting in paid temporary storage, fetched next morning. */
  tempStorageSheets: number;
}

export interface SoftwareState {
  mode: SoftwareMode;
  tier: SoftwareTier;
  /** Jobs left on a one-off licence. */
  jobsRemaining: number;
}

export interface DayStats {
  jobsAdvanced: string[];
  jobsCompleted: string[];
  /** The dust reading the day opened with, for the end of day summary. */
  dustAtStart: number;
  /** The empty rack is reported once a day and no more. */
  noMaterialWarned: boolean;
}

export interface GameOver {
  reason: string;
  day: number;
}

export interface GameState {
  version: number;
  seed: number;
  /** Cursor of the seeded RNG. The only source of randomness in the engine. */
  rng: number;
  nextId: number;
  difficulty: Difficulty;
  playerName: string;
  companyName: string;
  /** The optional real life notes under decisions are on. */
  showWhy: boolean;
  clock: Clock;
  speed: Speed;
  cash: number;
  reputation: number;
  dust: number;
  unit: UnitState;
  owner: OwnerState;
  software: SoftwareState;
  stock: StockState;
  equipment: Equipment[];
  workers: Worker[];
  enquiries: Enquiry[];
  jobs: Job[];
  tasks: TaskInstance[];
  deliveries: Delivery[];
  finance: FinanceState;
  ledger: LedgerEntry[];
  eventQueue: GameEvent[];
  activeEvent: GameEvent | null;
  dayStats: DayStats;
  /** Day the last express enquiry reached the board. One a week is the cap. */
  lastExpressDay: number | null;
  /** Day the last low stock warning went out. One a week is the cap. */
  lastLowStockDay: number | null;
  /** Last day the bookkeeping was done. 0 means it never has been. */
  booksUpToDay: number;
  /** Consecutive months the books were behind on the 1st. */
  lateAccountsMonths: number;
  /** Production minutes since the 1st, for pellet sales. */
  productionMinutesMonth: number;
  gameOver: GameOver | null;
}

export type GameAction =
  | { type: 'SET_SPEED'; speed: Speed }
  | { type: 'BUY_EQUIPMENT'; specId: string; variantId?: string }
  | { type: 'BUY_SOFTWARE'; mode: 'oneOff' | 'subscription' }
  | { type: 'ACCEPT_ENQUIRY'; enquiryId: string; byHand: boolean }
  | { type: 'START_TASK'; taskId: string }
  | { type: 'PAUSE_TASK' }
  | { type: 'SET_MATERIAL_MODE'; jobId: string; mode: MaterialMode }
  | { type: 'BUY_STOCK'; sheets: number }
  | { type: 'PAY_ARREARS'; amount: number | null }
  | { type: 'ORDER_TRANSPORT'; jobId: string }
  | { type: 'MOVE_ITEM'; itemId: string; x: number; y: number }
  | { type: 'SET_SHOW_WHY'; on: boolean }
  | { type: 'WORK_HERE'; jobId: string | null }
  | { type: 'ASSIGN_JOB'; jobId: string; workerId: string | null }
  | { type: 'HIRE'; role: WorkerRole; tier: WorkerTier | null }
  | { type: 'ASK_UNLOAD'; deliveryId: string }
  | { type: 'ASK_BAG_CHANGE'; equipmentId: string }
  | { type: 'START_CLEANING' }
  | { type: 'REPAIR_MACHINE'; equipmentId: string }
  | { type: 'SERVICE_MACHINE'; equipmentId: string }
  | { type: 'RESOLVE_EVENT'; choiceId: string }
  | { type: 'END_DAY' }
  | { type: 'SKIP_DAY' };
