// Every number in the game lives here.
// [PIOTR] comes from the owner's real business and is law: do not change it.
// [TUNE] is a placeholder chosen so the engine can run. It is never presented in the UI as a fact.
// Nothing in this file is exposed to the player as a setting (CLAUDE.md rule 3.4).

import type {
  Difficulty,
  EquipmentSpec,
  Finish,
  MaterialKind,
  ProductTemplate,
  SoftwareTier,
  WorkerRole,
  WorkerTier,
} from './types';

export const STATE_VERSION = 1;

// ---------------------------------------------------------------------------
// 6. Time
// ---------------------------------------------------------------------------

/** 08:00 to 16:00 (PIOTR). */
export const MINUTES_PER_WORKING_DAY = 480;
/** Clock starts at 08:00 (PIOTR). */
export const DAY_START_HOUR = 8;
/** One game day at 1x speed, in real seconds (PIOTR, Turn 2: one game minute per real second).
 *  8 real minutes at 1x, 4 at 2x, 2 at 4x. */
export const REAL_SECONDS_PER_DAY_AT_1X = 480;
export const SPEEDS = [0, 1, 2, 4] as const;
export const DAYS_PER_WEEK = 7;
/** [TUNE] simplification for Turn 1: every month is 30 days. */
export const DAYS_PER_MONTH = 30;
export const MONTHS_PER_YEAR = 12;
export const DAYS_PER_YEAR = DAYS_PER_MONTH * MONTHS_PER_YEAR;
/** Monday to Friday (PIOTR). */
export const WORKING_DAYS_PER_WEEK = 5;
export const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

// ---------------------------------------------------------------------------
// 7. The owner
// ---------------------------------------------------------------------------

/** Hours at full efficiency (PIOTR). */
export const OWNER_NORMAL_HOURS = 8;
/** Efficiency of overtime hours 9, 10, 11, 12. The fourth value is [TUNE], the rest [PIOTR]. */
export const OVERTIME_EFFICIENCY = [0.8, 0.6, 0.4, 0.4] as const;
/** After 12 hours the owner goes home, no way to force more (PIOTR). */
export const MAX_HOURS_PER_DAY = 12;
export const MAX_MINUTES_PER_DAY = MAX_HOURS_PER_DAY * 60;
/** An overtime hour costs 0.05 of tomorrow's efficiency, pro rata for a part hour, recovered
 *  after one normal day ([TUNE] rate, PIOTR that it is pro rata: 30 minutes cost 0.025). */
export const FATIGUE_PER_OVERTIME_HOUR = 0.05;
/** [TUNE] a floor so a tired owner can never stall a task completely. With the numbers above it is
 *  never reached: the worst case is hour 12 at 0.4 less four hours of fatigue at 0.2. */
export const MIN_OWNER_EFFICIENCY = 0.05;
/** Owner away: all staff production drops 30% (PIOTR). */
export const ABSENCE_OUTPUT_FACTOR = 0.7;
/** With a hired CEO the drop is 5% (PIOTR). CEO hiring is parked, the constant is modelled only. */
export const ABSENCE_OUTPUT_FACTOR_WITH_CEO = 0.95;
/** A rare exceptional CEO gives plus 15% (PIOTR). Parked. */
export const ABSENCE_OUTPUT_FACTOR_EXCEPTIONAL_CEO = 1.15;
/** Sick leave once per game year, 4 to 5 days, random day (PIOTR). */
export const SICK_DAYS_MIN = 4;
export const SICK_DAYS_MAX = 5;
/** Owner output: 800 of job value per day, so 320 of labour value per day (PIOTR). */
export const OWNER_JOB_VALUE_PER_DAY = 800;
export const OWNER_LABOUR_VALUE_PER_DAY = 320;
/** CLAUDE.md 8.5 writes this as 0.6667, which is this exact fraction rounded to four places. */
export const OWNER_LABOUR_PER_MINUTE = OWNER_LABOUR_VALUE_PER_DAY / MINUTES_PER_WORKING_DAY;

// ---------------------------------------------------------------------------
// 8.1 Fixed costs and the unit
// ---------------------------------------------------------------------------

/** Family living costs, every working day (PIOTR). */
export const LIVING_COST_PER_WORKING_DAY = 200;
/** Rent per square metre per month (PIOTR). Later stages use 15 to 20, which is parked. */
export const RENT_PER_M2_MONTHLY = 12;
/** The standard 60 m2 unit (PIOTR for the rate, [TUNE] for the area). */
export const UNIT_AREA_M2 = 60;
export const UNIT_RENT_MONTHLY = UNIT_AREA_M2 * RENT_PER_M2_MONTHLY;
/** [TUNE] business rates, unchanged from Turn 1. */
export const UNIT_RATES_MONTHLY = 450;

/** The landlord holds one month of rent, paid on day 1 (PIOTR). It comes back when the company
 *  moves out, which is parked: the held figure is modelled, nothing is returned. */
export function unitDepositFor(rentMonthly: number): number {
  return rentMonthly;
}
export const POWER_BASE_DAILY = 4;
export const POWER_PER_MACHINE_DAILY = 3;
export const BENCH_SLOTS = 4;
/** Waste collection once the central dust system exists (PIOTR). */
export const DUST_WASTE_MONTHLY = 400;
/** Pellet sales with a pelletiser, rising with production (PIOTR). */
export const PELLET_INCOME_MONTHLY_BASE = 600;
/** [TUNE] extra pellet income per 1000 minutes of production in the month. */
export const PELLET_INCOME_PER_1000_PRODUCTION_MINUTES = 40;

/** Working days in a month of 30 calendar days, for the fixed cost figure the arrears interest
 *  threshold is measured against [TUNE]. */
export const WORKING_DAYS_PER_MONTH = (DAYS_PER_MONTH * WORKING_DAYS_PER_WEEK) / DAYS_PER_WEEK;

/** Unit geometry in tiles. One tile is 0.5 m by 0.5 m [TUNE proportions]. */
export const UNIT_WIDTH_TILES = 24;
export const UNIT_DEPTH_TILES = 10;

// ---------------------------------------------------------------------------
// 8.2 Difficulty
// ---------------------------------------------------------------------------

export interface DifficultySpec {
  id: Difficulty;
  label: string;
  startingCash: number;
  areaM2: number;
  rentMonthly: number;
  ratesMonthly: number;
  benchSlots: number;
  widthTiles: number;
  depthTiles: number;
  /** Negative: how far the bank lets the company go (PIOTR for Hard, [TUNE] for the other two). */
  overdraftLimit: number;
}

/** Starting cash is [PIOTR]. The bigger very easy unit is [TUNE]. */
export const DIFFICULTIES: DifficultySpec[] = [
  {
    id: 'veryEasy',
    label: 'Very easy',
    startingCash: 50000,
    areaM2: 90,
    rentMonthly: 90 * RENT_PER_M2_MONTHLY,
    ratesMonthly: UNIT_RATES_MONTHLY,
    benchSlots: 6,
    widthTiles: 30,
    depthTiles: 12,
    overdraftLimit: -10000,
  },
  {
    id: 'easy',
    label: 'Easy',
    startingCash: 20000,
    areaM2: UNIT_AREA_M2,
    rentMonthly: UNIT_RENT_MONTHLY,
    ratesMonthly: UNIT_RATES_MONTHLY,
    benchSlots: BENCH_SLOTS,
    widthTiles: UNIT_WIDTH_TILES,
    depthTiles: UNIT_DEPTH_TILES,
    overdraftLimit: -10000,
  },
  {
    id: 'hard',
    label: 'Hard',
    startingCash: 0,
    areaM2: UNIT_AREA_M2,
    rentMonthly: UNIT_RENT_MONTHLY,
    ratesMonthly: UNIT_RATES_MONTHLY,
    benchSlots: BENCH_SLOTS,
    widthTiles: UNIT_WIDTH_TILES,
    depthTiles: UNIT_DEPTH_TILES,
    overdraftLimit: -5000,
  },
];

// ---------------------------------------------------------------------------
// 8.3 Debt, arrears, bailiff, bankruptcy
// ---------------------------------------------------------------------------

/** [TUNE] 2% per month on a negative balance, charged on the 1st. */
export const OVERDRAFT_MONTHLY_INTEREST = 0.02;
/** 1% per month on the arrears balance while the arrears are large (PIOTR). */
export const ARREARS_MONTHLY_INTEREST = 0.01;
/** [TUNE] "large arrears" means more than this many months of fixed costs. */
export const ARREARS_INTEREST_THRESHOLD_MONTHS = 1;
/** [TUNE] bankruptcy when the overdraft passes this multiple of the limit. */
export const BANKRUPTCY_OVERDRAFT_MULTIPLIER = 2;
export const ARREARS_MONTHS_WARNING = 1;
export const ARREARS_MONTHS_FINAL_WARNING = 2;
export const ARREARS_MONTHS_BAILIFF = 3;
/** The bailiff credits the seized machine at half its purchase price (PIOTR). */
export const BAILIFF_SEIZURE_FRACTION = 0.5;

// ---------------------------------------------------------------------------
// 8.4 to 8.7 Job value, labour, payments
// ---------------------------------------------------------------------------

/** Material 40%, labour 40%, profit 20% of the price (PIOTR). */
export const MATERIAL_FRACTION = 0.4;
export const LABOUR_FRACTION = 0.4;
export const PROFIT_FRACTION = 0.2;
/** Buying sheets in advance is cheaper per job [TUNE]. */
export const STOCK_MATERIAL_FRACTION = 0.34;
/** Deposit on acceptance, balance on delivery (PIOTR). */
export const DEPOSIT_FRACTION = 0.5;
/** Late penalty per day, as a fraction of the price (PIOTR). */
export const LATE_PENALTY_PER_DAY = 0.05;
export const LATE_PENALTY_PER_DAY_EXPRESS = 0.3;
/** Express jobs pay 20% more, and the material and the labour are still worked out from the base
 *  price, so the uplift is pure profit (PIOTR). */
export const EXPRESS_PRICE_UPLIFT = 0.2;
/** At most one express enquiry reaches the board in a week (PIOTR). */
export const EXPRESS_MAX_PER_WEEK = 1;
/** A job made by hand takes half again as long (PIOTR). */
export const BY_HAND_DURATION_FACTOR = 1.5;
/** Worker speed as a fraction of the owner. Nobody matches the owner (PIOTR). */
export const WORKER_RATES: Record<WorkerTier, number> = {
  poor: 0.6,
  normal: 0.8,
  super: 0.9,
};
/** [TUNE] informational per job cost of a worker minute: weekly wage divided by this. */
export const WORKER_MINUTE_RATE_DIVISOR = 2400;

// ---------------------------------------------------------------------------
// 8.8 Order board
// ---------------------------------------------------------------------------

/** Size multiplier drawn uniformly (PIOTR). */
export const SIZE_MULTIPLIER_MIN = 0.8;
export const SIZE_MULTIPLIER_MAX = 1.6;
/** Prices are rounded to the nearest 10 (PIOTR). */
export const PRICE_ROUNDING = 10;
/** Days an enquiry stays on the board (PIOTR). */
export const EXPIRY_STANDARD_DAYS = 3;
export const EXPIRY_EXPRESS_DAYS = 1;
/** Express chance: 0.10 plus 0.05 per whole ten points of reputation, floored and capped
 *  [TUNE mapping of the Turn 1 formula onto the new scale]. */
export const EXPRESS_PROBABILITY_BASE = 0.1;
export const EXPRESS_PROBABILITY_PER_REPUTATION_STEP = 0.05;
export const EXPRESS_PROBABILITY_REPUTATION_STEP = 10;
export const EXPRESS_PROBABILITY_MIN = 0.05;
export const EXPRESS_PROBABILITY_MAX = 0.3;
/** Board size, minimum and maximum enquiries, by reputation tier (PIOTR: below 0, 0 to 20,
 *  above 20). */
export const BOARD_SIZE_BY_TIER: Array<[number, number]> = [
  [1, 2],
  [2, 3],
  [3, 5],
];
/** [TUNE] chance that an enquiry needs bespoke material. */
export const BESPOKE_PROBABILITY = 0.15;

// ---------------------------------------------------------------------------
// 8.9 Materials
// ---------------------------------------------------------------------------

/** A sheet is a storage unit worth 200 of material value and stands for everything a job needs:
 *  boards, edging, screws (PIOTR). Job sheet counts come from the material cost. */
export const SHEET_VALUE = 200;
/** [TUNE] sheets bought for stock are cheaper, which gives the 0.34 P per job. */
export const SHEET_PRICE_STOCK = SHEET_VALUE * (STOCK_MATERIAL_FRACTION / MATERIAL_FRACTION);
/** Under this fraction of the rack the player is warned (PIOTR: under 10%). */
export const LOW_STOCK_FRACTION = 0.1;
/** Material always arrives the next working day (PIOTR). */
export const DELIVERY_WORKING_DAYS_STANDARD = 1;
/** [TUNE] bespoke material takes three working days and costs 15% more. */
export const DELIVERY_WORKING_DAYS_BESPOKE = 3;
export const BESPOKE_COST_UPLIFT = 0.15;
/** Temporary storage for a delivery that does not fit (PIOTR). */
export const TEMP_STORAGE_COST = 150;
export const TEMP_STORAGE_FETCH_MINUTES = 60;

// ---------------------------------------------------------------------------
// 8.10 Owner tasks
// ---------------------------------------------------------------------------

export const EMAILS_MINUTES = 60;
export const BOOKKEEPING_MINUTES = 60;
export const DAILY_ORDERING_MINUTES = 60;
/** 10 minutes per joiner per day (PIOTR). */
export const STAFF_MANAGEMENT_MINUTES_PER_JOINER = 10;
/** [TUNE curve] 15 minutes per call up to a price of 1000, then 15 more per further 1000, capped. */
export const CLIENT_CALL_BASE_MINUTES = 15;
export const CLIENT_CALL_MINUTES_PER_1000 = 15;
export const CLIENT_CALL_MINUTES_CAP = 200;
export const CLIENT_CALL_PRICE_STEP = 1000;
/** 2 to 3 calls per job (PIOTR): 2 up to 1000, 3 up to 3000, 4 above. */
export const CALLS_PRICE_BREAKS: Array<[number, number]> = [
  [1000, 2],
  [3000, 3],
];
export const CALLS_ABOVE_BREAKS = 4;
/** Material order minutes: 30 up to a price of 10000, 200 at 100000, linear between (PIOTR). */
export const MATERIAL_ORDER_MINUTES_LOW = 30;
export const MATERIAL_ORDER_PRICE_LOW = 10000;
export const MATERIAL_ORDER_MINUTES_HIGH = 200;
export const MATERIAL_ORDER_PRICE_HIGH = 100000;
/** A purchasing clerk handles about 16 job orders per day (PIOTR). */
export const CLERK_ORDERS_PER_DAY = 16;
/** Half a day on site (PIOTR). */
export const SITE_MEASURE_MINUTES = 240;
/** [TUNE] taxi to the site while there is no van. */
export const SITE_MEASURE_TAXI_COST = 40;
/** [TUNE] base minutes to unload a delivery, before forklift factors. */
export const UNLOAD_BASE_MINUTES = 45;
/** Bag change (PIOTR). */
export const BAG_CHANGE_MINUTES = 15;
/** Weekly clean (PIOTR). */
export const CLEANING_MINUTES = 120;
/** Fetch from temporary storage the next morning (PIOTR). */
export const FETCH_STORAGE_MINUTES = TEMP_STORAGE_FETCH_MINUTES;
/** [TUNE] extractor repair. */
export const EXTRACTOR_REPAIR_MINUTES = 90;
export const EXTRACTOR_REPAIR_COST = 150;

/** Design speed by software tier (PIOTR: 5 to 80% faster). */
export const SOFTWARE_DESIGN_FACTOR: Record<SoftwareTier, number> = {
  basic: 1,
  standard: 0.5,
  pro: 0.2,
};
/** A one-off licence works for 30 jobs, then must be bought again (PIOTR). */
export const SOFTWARE_ONE_OFF_JOBS = 30;
/** The company needs the bundle, not the cheapest line: 150 a month, and the one-off is two years
 *  of it (PIOTR). */
export const SOFTWARE_SUBSCRIPTION_MONTHLY = 150;
export const SOFTWARE_ONE_OFF_YEARS = 2;
export const SOFTWARE_ONE_OFF_PRICE =
  SOFTWARE_SUBSCRIPTION_MONTHLY * MONTHS_PER_YEAR * SOFTWARE_ONE_OFF_YEARS;
/** [TUNE] both Turn 1 licences are the basic tier. Standard and pro have no purchase path yet. */
export const SOFTWARE_TURN1_TIER: SoftwareTier = 'basic';

// ---------------------------------------------------------------------------
// 8.11 Reputation
// ---------------------------------------------------------------------------

/** Minus 50 to 100, starting at 0 (PIOTR). */
export const REPUTATION_START = 0;
export const REPUTATION_MIN = -50;
export const REPUTATION_MAX = 100;
/** Rating changes at job completion, ten times the Turn 1 weights (PIOTR). */
export const RATING_ON_TIME = 3;
export const RATING_EXPRESS_ON_TIME = 5;
export const RATING_PER_DAY_LATE = -1;
/** Made by hand carries no penalty (PIOTR). */
export const RATING_BY_HAND = 0;
/** Below this band the work on offer is barely profitable [TUNE band and factor]. */
export const LOW_REPUTATION_BAND = -25;
export const LOW_REPUTATION_PRICE_FACTOR = 0.85;
/** Reputation tier thresholds for the board and the template weights (PIOTR: below 0, 0 to 20,
 *  above 20). The hiring pool has its own gate per role in 9.3. */
export const REPUTATION_TIERS = [REPUTATION_MIN, 0, 20] as const;

// ---------------------------------------------------------------------------
// 9.1 Product catalogue (PIOTR: products, prices, design minutes, calls)
// ---------------------------------------------------------------------------

export const FINISHES_SHEET: Finish[] = ['laminate'];
export const FINISHES_SOLID: Finish[] = ['laminate'];

export const PRODUCT_TEMPLATES: ProductTemplate[] = [
  {
    id: 'garageShelves',
    name: 'Garage shelves',
    basePrice: 400,
    material: 'sheet',
    designMinutes: 30,
    calls: 2,
    deadlineMinDays: 10,
    deadlineMaxDays: 20,
    needsMeasure: false,
    requiredEquipment: ['tableSaw', 'drill'],
    allowedFinishes: FINISHES_SHEET,
    minReputation: -50,
    weightsByTier: [50, 20, 8],
    byHandAllowed: false,
  },
  {
    id: 'bookcase',
    name: 'Bookcase',
    basePrice: 900,
    material: 'sheet',
    designMinutes: 60,
    calls: 2,
    deadlineMinDays: 10,
    deadlineMaxDays: 25,
    needsMeasure: false,
    requiredEquipment: ['tableSaw', 'drill', 'edgebander'],
    allowedFinishes: FINISHES_SHEET,
    minReputation: -50,
    weightsByTier: [30, 25, 12],
    byHandAllowed: false,
  },
  {
    id: 'tvUnit',
    name: 'TV unit',
    basePrice: 1200,
    material: 'sheet',
    designMinutes: 120,
    calls: 3,
    deadlineMinDays: 14,
    deadlineMaxDays: 28,
    needsMeasure: false,
    requiredEquipment: ['tableSaw', 'drill', 'edgebander'],
    allowedFinishes: FINISHES_SHEET,
    minReputation: 5,
    weightsByTier: [12, 25, 18],
    byHandAllowed: false,
  },
  {
    id: 'wardrobe',
    name: 'Wardrobe',
    basePrice: 1600,
    material: 'sheet',
    designMinutes: 480,
    calls: 3,
    deadlineMinDays: 21,
    deadlineMaxDays: 35,
    needsMeasure: false,
    requiredEquipment: ['tableSaw', 'drill', 'edgebander'],
    allowedFinishes: FINISHES_SHEET,
    minReputation: 10,
    weightsByTier: [0, 20, 22],
    byHandAllowed: false,
  },
  {
    id: 'smallKitchen',
    name: 'Small kitchen (6 units)',
    basePrice: 3500,
    material: 'sheet',
    designMinutes: 720,
    calls: 4,
    deadlineMinDays: 28,
    deadlineMaxDays: 42,
    needsMeasure: true,
    requiredEquipment: ['tableSaw', 'drill', 'edgebander'],
    allowedFinishes: FINISHES_SHEET,
    minReputation: 20,
    weightsByTier: [0, 8, 25],
    byHandAllowed: false,
  },
  {
    id: 'oakDiningTable',
    name: 'Oak dining table',
    basePrice: 12000,
    material: 'solidWood',
    designMinutes: 480,
    calls: 4,
    deadlineMinDays: 42,
    deadlineMaxDays: 60,
    needsMeasure: false,
    requiredEquipment: ['thicknesser', 'solidWoodTools'],
    allowedFinishes: FINISHES_SOLID,
    minReputation: 10,
    weightsByTier: [0, 2, 15],
    byHandAllowed: true,
  },
];

// ---------------------------------------------------------------------------
// 9.2 Day 1 catalogue (PIOTR: items; prices [TUNE] unless marked)
// ---------------------------------------------------------------------------

const BASE_SPEC = {
  bagInterval: 0,
  usedOn: null as MaterialKind | null,
  labourFactor: 1,
  labourAppliesTo: null as MaterialKind | null,
  unloadFactor: 1,
  sheetCapacity: 0,
  minReputation: REPUTATION_MIN,
  locked: false,
  lockReason: '',
  perWorker: false,
  stackable: false,
  requires: [] as string[],
  height: 1,
};

export const EQUIPMENT_SPECS: EquipmentSpec[] = [
  {
    ...BASE_SPEC,
    id: 'desk',
    name: 'Desk',
    price: 150,
    category: 'furniture',
    width: 3,
    depth: 2,
    height: 1,
    spriteKey: 'desk',
    effect: 'Required to use the laptop.',
  },
  {
    ...BASE_SPEC,
    id: 'chair',
    name: 'Chair',
    price: 60,
    category: 'furniture',
    width: 1,
    depth: 1,
    height: 1,
    spriteKey: 'chair',
    effect: 'Somewhere to sit in the office.',
  },
  {
    ...BASE_SPEC,
    id: 'laptop',
    name: 'Laptop',
    price: 700,
    category: 'furniture',
    width: 1,
    depth: 1,
    height: 1,
    spriteKey: 'laptop',
    requires: ['desk'],
    effect: 'Required for design, the order board and accounting.',
  },
  {
    ...BASE_SPEC,
    id: 'tableSaw',
    name: 'Table saw',
    price: 1800,
    category: 'machine',
    width: 4,
    depth: 2,
    height: 2,
    spriteKey: 'tableSaw',
    bagInterval: 2400,
    usedOn: 'sheet',
    stackable: true,
    effect: 'Cuts sheets. Bag every 2400 minutes. One saw per three joiners.',
  },
  {
    ...BASE_SPEC,
    id: 'drill',
    name: 'Cordless drill',
    price: 120,
    category: 'tools',
    width: 1,
    depth: 1,
    height: 1,
    spriteKey: 'drill',
    effect: 'Basic assembly tool.',
  },
  {
    ...BASE_SPEC,
    id: 'edgebander',
    name: 'Hand edgebander',
    price: 900,
    category: 'machine',
    width: 3,
    depth: 2,
    height: 2,
    spriteKey: 'edgebander',
    bagInterval: 4800,
    usedOn: 'sheet',
    effect: 'Edges sheet goods. Bag every 4800 minutes.',
  },
  {
    ...BASE_SPEC,
    id: 'compressor',
    name: 'Small compressor',
    price: 350,
    category: 'machine',
    width: 2,
    depth: 2,
    height: 1,
    spriteKey: 'compressor',
    effect: 'Air for nailers and clamps.',
  },
  {
    ...BASE_SPEC,
    id: 'extractor',
    name: 'Extractor',
    price: 600,
    category: 'extraction',
    width: 2,
    depth: 2,
    height: 3,
    spriteKey: 'extractor',
    effect: 'Serves every machine. Without it there are no bags. Can break down.',
  },
  {
    ...BASE_SPEC,
    id: 'workbench',
    name: 'Workbench',
    price: 250,
    category: 'bench',
    width: 3,
    depth: 2,
    height: 1,
    spriteKey: 'workbench',
    perWorker: true,
    stackable: true,
    effect: 'One per worker. The unit has a fixed number of bench slots.',
  },
  {
    ...BASE_SPEC,
    id: 'sheetRack',
    name: 'Cheap shelving',
    price: 400,
    category: 'storage',
    width: 4,
    depth: 1,
    height: 2,
    spriteKey: 'sheetRack',
    sheetCapacity: 50,
    effect: 'Holds 50 sheets. Nothing can be unloaded without somewhere to put it.',
  },
  {
    ...BASE_SPEC,
    id: 'sheetRackBetter',
    name: 'Better shelving',
    price: 900,
    category: 'storage',
    width: 4,
    depth: 1,
    height: 2,
    spriteKey: 'sheetRackBetter',
    sheetCapacity: 75,
    effect: 'Holds 75 sheets. More than that needs a bigger unit.',
  },
  {
    ...BASE_SPEC,
    id: 'locker',
    name: 'Locker',
    price: 80,
    category: 'welfare',
    width: 1,
    depth: 1,
    height: 2,
    spriteKey: 'locker',
    perWorker: true,
    stackable: true,
    effect: 'One per worker.',
  },
  {
    ...BASE_SPEC,
    id: 'canteenSeat',
    name: 'Canteen seat',
    price: 40,
    category: 'welfare',
    width: 1,
    depth: 1,
    height: 1,
    spriteKey: 'canteenSeat',
    perWorker: true,
    stackable: true,
    effect: 'One per worker.',
  },
  {
    ...BASE_SPEC,
    id: 'handToolSet',
    name: 'Hand tool set for a worker',
    price: 400,
    category: 'tools',
    width: 1,
    depth: 1,
    height: 1,
    spriteKey: 'handToolSet',
    perWorker: true,
    stackable: true,
    effect: 'One per worker, bought by the owner.',
  },
  {
    ...BASE_SPEC,
    id: 'van',
    name: 'Van',
    price: 9000,
    category: 'vehicle',
    width: 4,
    depth: 2,
    height: 2,
    spriteKey: 'van',
    effect: 'Removes taxi and transport costs.',
  },
  {
    ...BASE_SPEC,
    id: 'forklift',
    name: 'Forklift',
    price: 6000,
    category: 'vehicle',
    width: 2,
    depth: 2,
    height: 2,
    spriteKey: 'forklift',
    unloadFactor: 0.5,
    effect: 'Unloading takes half the time.',
  },
  {
    ...BASE_SPEC,
    id: 'forkliftBetter',
    name: 'Better forklift',
    price: 12000,
    category: 'vehicle',
    width: 2,
    depth: 2,
    height: 2,
    spriteKey: 'forkliftBetter',
    unloadFactor: 0.2,
    effect: 'Unloading takes a fifth of the time.',
  },
  {
    ...BASE_SPEC,
    id: 'thicknesser',
    name: 'Thicknesser',
    price: 2500,
    category: 'machine',
    width: 3,
    depth: 2,
    height: 2,
    spriteKey: 'thicknesser',
    bagInterval: 480,
    usedOn: 'solidWood',
    effect: 'Solid wood tools, part 1. Bag every 480 minutes.',
  },
  {
    ...BASE_SPEC,
    id: 'solidWoodTools',
    name: 'Planer, router, sander, clamps',
    price: 2200,
    category: 'machine',
    width: 3,
    depth: 2,
    height: 2,
    spriteKey: 'solidWoodTools',
    usedOn: 'solidWood',
    effect: 'Solid wood tools, part 2. With the thicknesser this unlocks solid wood.',
  },
  {
    ...BASE_SPEC,
    id: 'cnc',
    name: 'CNC',
    price: 45000,
    category: 'machine',
    width: 5,
    depth: 3,
    height: 2,
    spriteKey: 'cnc',
    labourFactor: 0.8,
    locked: true,
    lockReason: 'Coming in a later stage.',
    effect: 'Labour minus 20% on every job.',
  },
  {
    ...BASE_SPEC,
    id: 'cncHead',
    name: 'CNC tool changer head',
    price: 9000,
    category: 'machine',
    width: 1,
    depth: 1,
    height: 1,
    spriteKey: 'cncHead',
    labourFactor: 0.95,
    requires: ['cnc'],
    locked: true,
    lockReason: 'Coming in a later stage.',
    effect: 'A further labour minus 5%.',
  },
  {
    ...BASE_SPEC,
    id: 'sprayBooth',
    name: 'Spray booth',
    price: 18000,
    category: 'machine',
    width: 5,
    depth: 3,
    height: 3,
    spriteKey: 'sprayBooth',
    locked: true,
    lockReason: 'Coming in a later stage.',
    effect: 'Unlocks the lacquer finish.',
  },
  {
    ...BASE_SPEC,
    id: 'dustSystem',
    name: 'Central dust extraction system',
    price: 35000,
    category: 'extraction',
    width: 3,
    depth: 3,
    height: 4,
    spriteKey: 'dustSystem',
    effect: 'No more bags and no breakdown. Waste collection 400 per month.',
  },
  {
    ...BASE_SPEC,
    id: 'pelletiser',
    name: 'Pelletiser',
    price: 15000,
    category: 'extraction',
    width: 2,
    depth: 2,
    height: 3,
    spriteKey: 'pelletiser',
    requires: ['dustSystem'],
    effect: 'No waste cost and pellet sales that rise with production.',
  },
];

/** Machines that must be owned before solid wood jobs can be made without the by-hand path. */
export const SOLID_WOOD_EQUIPMENT = ['thicknesser', 'solidWoodTools'];

/** Fixed placement in tiles. Free placement by the player is parked (CLAUDE.md 14.9). */
export interface LayoutSlot {
  x: number;
  y: number;
  /** Placed in the yard strip to the right of the unit instead of on the floor. */
  yard?: boolean;
}

/** The three small rooms of 4 m2 along the back wall, with the one line each shows on hover. */
export const ROOM_LAYOUT = [
  {
    id: 'office',
    name: 'Office',
    x: 0,
    y: 0,
    width: 4,
    depth: 4,
    height: 2,
    spriteKey: 'roomOffice',
    tooltip: 'The office. The desk, the laptop, the paperwork.',
  },
  {
    id: 'wc',
    name: 'WC',
    x: 5,
    y: 0,
    width: 4,
    depth: 4,
    height: 2,
    spriteKey: 'roomWc',
    tooltip: 'The WC. Cold tap, one towel.',
  },
  {
    id: 'canteen',
    name: 'Canteen',
    x: 10,
    y: 0,
    width: 4,
    depth: 4,
    height: 2,
    spriteKey: 'roomCanteen',
    tooltip: 'The canteen. Tea, and somewhere to eat out of the dust.',
  },
] as const;

/** Hall placement. The office furniture is placed by DESK_LAYOUT instead, and the chair is bought
 *  but never drawn: 10.1 puts nothing on the office screen but the desk and what is on it. */
export const STARTING_LAYOUT: Record<string, LayoutSlot> = {
  sheetRack: { x: 20, y: 0 },
  sheetRackBetter: { x: 20, y: 2 },
  extractor: { x: 15, y: 1 },
  dustSystem: { x: 15, y: 1 },
  tableSaw: { x: 0, y: 7 },
  edgebander: { x: 5, y: 7 },
  compressor: { x: 9, y: 7 },
  thicknesser: { x: 12, y: 7 },
  solidWoodTools: { x: 16, y: 7 },
  forklift: { x: 20, y: 7 },
  forkliftBetter: { x: 20, y: 7 },
  cnc: { x: 12, y: 7 },
  sprayBooth: { x: 16, y: 7 },
  pelletiser: { x: 18, y: 1 },
  drill: { x: 14, y: 5 },
  handToolSet: { x: 15, y: 5 },
  van: { x: 0, y: 7, yard: true },
};

/** Bench slots, in order. A unit uses the first `benchSlots` of them. */
export const BENCH_SLOT_LAYOUT: LayoutSlot[] = [
  { x: 0, y: 4 },
  { x: 4, y: 4 },
  { x: 8, y: 4 },
  { x: 12, y: 4 },
  { x: 16, y: 4 },
  { x: 20, y: 4 },
];

/** Welfare items stand along the walkway, clear of the room blocks. */
export const LOCKER_SLOT_LAYOUT: LayoutSlot[] = [
  { x: 0, y: 6 },
  { x: 1, y: 6 },
  { x: 2, y: 6 },
  { x: 3, y: 6 },
  { x: 4, y: 6 },
  { x: 5, y: 6 },
];

export const CANTEEN_SLOT_LAYOUT: LayoutSlot[] = [
  { x: 7, y: 6 },
  { x: 8, y: 6 },
  { x: 9, y: 6 },
  { x: 10, y: 6 },
  { x: 11, y: 6 },
  { x: 12, y: 6 },
];

/** Where a waiting delivery van stands, and how big it is. */
export const GATE_LAYOUT = { x: 0, y: 4, yard: true, width: 4, depth: 2, height: 2 };
export const DELIVERY_VAN_SPRITE = 'deliveryVan';

/** The office desk and everything on it. Fixed placement, like the hall (CLAUDE.md 10.3). */
export interface DeskObjectSpec {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  depth: number;
  height: number;
  spriteKey: string;
  /** Catalogue item that has to be owned before the object is usable. */
  needs: string | null;
}

export const OFFICE_TILES = 12;

export const DESK_LAYOUT: DeskObjectSpec[] = [
  { id: 'desk', name: 'Desk', x: 3, y: 4, width: 5, depth: 3, height: 1, spriteKey: 'desk', needs: 'desk' },
  { id: 'laptop', name: 'Laptop', x: 4, y: 5, width: 2, depth: 1, height: 1, spriteKey: 'laptop', needs: 'laptop' },
  {
    id: 'accounting',
    name: 'Accounting',
    x: 6,
    y: 5,
    width: 1,
    depth: 1,
    height: 1,
    spriteKey: 'ledgerFolder',
    needs: 'laptop',
  },
  {
    id: 'materials',
    name: 'Materials',
    x: 1,
    y: 5,
    width: 1,
    depth: 2,
    height: 1,
    spriteKey: 'materialsBinder',
    needs: null,
  },
  {
    id: 'catalogue',
    name: 'Catalogue',
    x: 1,
    y: 2,
    width: 2,
    depth: 1,
    height: 1,
    spriteKey: 'catalogue',
    needs: null,
  },
  {
    id: 'hiring',
    name: 'Team board',
    x: 8,
    y: 0,
    width: 3,
    depth: 1,
    height: 3,
    spriteKey: 'teamBoard',
    needs: null,
  },
  { id: 'phone', name: 'Phone', x: 7, y: 7, width: 1, depth: 1, height: 1, spriteKey: 'phone', needs: 'laptop' },
];
/** Width of the yard strip drawn to the right of the unit, in tiles. */
export const YARD_WIDTH_TILES = 5;

// ---------------------------------------------------------------------------
// 9.3 Hiring pool (PIOTR: tiers and gating; wages [TUNE])
// ---------------------------------------------------------------------------

export interface HiringSpec {
  role: WorkerRole;
  tier: WorkerTier | null;
  label: string;
  weeklyWage: number;
  monthlyWage: number;
  minReputation: number;
  duties: string;
}

export const HIRING_SPECS: HiringSpec[] = [
  {
    role: 'joiner',
    tier: 'poor',
    label: 'Joiner, poor',
    weeklyWage: 480,
    monthlyWage: 0,
    minReputation: -50,
    duties: 'Production at 0.60 of the owner speed.',
  },
  {
    role: 'joiner',
    tier: 'normal',
    label: 'Joiner, normal',
    weeklyWage: 640,
    monthlyWage: 0,
    minReputation: 10,
    duties: 'Production at 0.80 of the owner speed.',
  },
  {
    role: 'joiner',
    tier: 'super',
    label: 'Joiner, super',
    weeklyWage: 800,
    monthlyWage: 0,
    minReputation: 40,
    duties: 'Production at 0.90 of the owner speed.',
  },
  {
    role: 'helper',
    tier: null,
    label: 'Helper',
    weeklyWage: 420,
    monthlyWage: 0,
    minReputation: -50,
    duties: 'Bag changes, cleaning, unloading.',
  },
  {
    role: 'officeAdmin',
    tier: null,
    label: 'Office admin',
    weeklyWage: 0,
    monthlyWage: 1900,
    minReputation: 5,
    duties: 'Emails, bookkeeping, daily ordering.',
  },
  {
    role: 'purchasingClerk',
    tier: null,
    label: 'Purchasing clerk',
    weeklyWage: 0,
    monthlyWage: 1700,
    minReputation: 10,
    duties: 'Per job material orders, about 16 a day.',
  },
  {
    role: 'salesman',
    tier: null,
    label: 'Salesman',
    weeklyWage: 0,
    monthlyWage: 2200,
    minReputation: 15,
    duties: 'Client calls.',
  },
];

/** Every joiner needs all of these before he can be hired (PIOTR). */
export const JOINER_PREREQUISITES = ['workbench', 'locker', 'canteenSeat', 'handToolSet'];
/** [TUNE] a new hire starts the next working day. */
export const HIRE_START_DELAY_DAYS = 1;
/** From five joiners a helper is required (PIOTR). */
export const HELPER_REQUIRED_FROM_JOINERS = 5;
/** Without the required helper, dust rises twice as fast (PIOTR). */
export const NO_HELPER_DUST_MULTIPLIER = 2;
/** [TUNE] and productivity drops. */
export const NO_HELPER_PRODUCTIVITY_FACTOR = 0.9;
/** One table saw per three joiners (PIOTR). */
export const JOINERS_PER_TABLE_SAW = 3;
/** [TUNE] joiners above the saw ratio queue and work slower. */
export const OVER_SAW_RATIO_FACTOR = 0.8;
/** [TUNE] names for generated staff. */
export const WORKER_NAMES = [
  'Adam',
  'Ben',
  'Callum',
  'Dave',
  'Eddie',
  'Frank',
  'Gary',
  'Harry',
  'Ian',
  'Jack',
  'Kev',
  'Liam',
  'Marek',
  'Nathan',
  'Ollie',
  'Pete',
  'Ravi',
  'Sam',
  'Tom',
  'Wes',
];

// ---------------------------------------------------------------------------
// 9.6 and 9.7 Machines, bags, extractor, dust
// ---------------------------------------------------------------------------

/** [TUNE] extractor breakdown chance per working day, and when dust is high. */
export const EXTRACTOR_BREAKDOWN_CHANCE = 0.01;
export const EXTRACTOR_BREAKDOWN_CHANCE_HIGH_DUST = 0.03;
export const DUST_HIGH_THRESHOLD = 70;
/** A broken extractor triples the dust rate (PIOTR). */
export const EXTRACTOR_BROKEN_DUST_MULTIPLIER = 3;
/** [TUNE] dust gained per minute of production. */
export const DUST_PER_PRODUCTION_MINUTE = 0.02;
export const DUST_MAX = 100;
/** [TUNE] dust bands: up to `max`, productivity is multiplied by `factor`. */
export const DUST_BANDS: Array<{ max: number; factor: number; label: string }> = [
  { max: 40, factor: 1, label: 'clean' },
  { max: 70, factor: 0.95, label: 'messy' },
  { max: 90, factor: 0.85, label: 'dirty' },
  { max: DUST_MAX, factor: 0.7, label: 'dangerous' },
];
/** [TUNE] accident chance per day in the dangerous band, and days the joiner is off. */
export const ACCIDENT_CHANCE_PER_DAY = 0.02;
export const ACCIDENT_DAYS_OFF = 3;
/** A helper cleans every Friday at no owner cost (PIOTR). */
export const HELPER_CLEAN_WEEKDAY = 4;

// ---------------------------------------------------------------------------
// Housekeeping
// ---------------------------------------------------------------------------

/** The accounting modal shows the last 50 entries (CLAUDE.md 10.1). */
export const LEDGER_VISIBLE_ENTRIES = 50;
/** [TUNE] the state keeps this many ledger entries so it stays small. */
export const LEDGER_MAX_ENTRIES = 200;
