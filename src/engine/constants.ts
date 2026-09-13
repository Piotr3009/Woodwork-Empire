// Every number in the game lives here.
// [PIOTR] comes from the owner's real business and is law: do not change it.
// [TUNE] is a placeholder chosen so the engine can run. It is never presented in the UI as a fact.
// Nothing in this file is exposed to the player as a setting (CLAUDE.md rule 3.4).

import type {
  Difficulty,
  EquipmentSpec,
  EquipmentVariant,
  EquipmentTab,
  Finish,
  MaterialKind,
  ProductTemplate,
  SoftwareTier,
  WorkerRole,
  WorkerTier,
} from './types';

/** Bumped in Turn 6: the owner carries a labour factor and an overtime debt where he carried a
 *  fatigue figure, the break is an hour he can work through, and the day ends at 17:00 with
 *  overtime to 19:00. A Turn 5 save reads its clock and its owner wrongly, so it is refused.
 *
 *  Bumped in Turn 5: the unit is measured in metre cells and not half metre tiles, the hall is the
 *  painted 200 m2 floor, and every anchor in a saved layout was written on the old grid, which
 *  would stand the whole workshop in the wrong place and some of it off the floor. The clock is
 *  read differently too, the break being half an hour of it. A Turn 4 save is refused rather than
 *  opened into a hall that does not fit it.
 *
 *  Bumped in Turn 3: a machine carries its class, its hours and the hours it has in it, and a task
 *  carries the day it was finished (CLAUDE.md T3 3.5, 3.3). */
export const STATE_VERSION = 5;

// ---------------------------------------------------------------------------
// 6. Time
// ---------------------------------------------------------------------------

/** 480 minutes of work in a day (PIOTR). The break does not come out of them: the day runs on by
 *  the length of it, which is what puts the end of the day at 17:00. */
export const MINUTES_PER_WORKING_DAY = 480;
/** Clock starts at 08:00 (PIOTR). */
export const DAY_START_HOUR = 8;
/** Dinner: noon for an hour (PIOTR). Nobody works through it unless the owner says he will, and
 *  then it is his hour and nobody else's. */
export const BREAK_START_MINUTE = 240;
export const BREAK_MINUTES = 60;
/** 17:00 on the clock: the 480 minutes of work and the hour of dinner between them (PIOTR). */
export const DAY_END_MINUTE = MINUTES_PER_WORKING_DAY + BREAK_MINUTES;
/** 19:00, and the tools go down whoever wants what (PIOTR: overtime until 19:00 at the latest). */
export const OVERTIME_END_MINUTE = DAY_END_MINUTE + 120;
/** The longest the clock can ever read in a day. Only for putting two moments of the game in
 *  order. */
export const MAX_CLOCK_MINUTES_PER_DAY = OVERTIME_END_MINUTE;
/** Hours of work in a day: the 480 minutes, in the unit a machine's clock is read in. */
export const HOURS_PER_WORKING_DAY = MINUTES_PER_WORKING_DAY / 60;
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

/** Working through dinner buys 60 minutes today and costs 3% of tomorrow (PIOTR). */
export const BREAK_SKIP_FACTOR = 0.97;
/** Any day with overtime in it, however little, adds this to the debt that comes off tomorrow's
 *  output. Cumulative day after day, back to zero on Monday morning (PIOTR: 10% weaker). */
export const OVERTIME_DEBT_PER_DAY = 0.1;
/** However tired he is, half a day's work still comes out of him [TUNE]. */
export const LABOUR_FACTOR_FLOOR = 0.5;
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
/** The painted hall is 20 by 10 m (docs/art/SPRITES.md 9.1), so the unit is 200 m2 and the rent
 *  follows the rate. The 60 m2 of Turns 1 to 4 was [TUNE] and the hall art replaced it. */
export const UNIT_AREA_M2 = 200;
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

/** The hall in cells, which are metres now: x along the rear wall, y along the left wall, the
 *  origin at the rear left corner (docs/art/SPRITES.md 9.1 and 9.3). 200 cells. */
export const UNIT_WIDTH_CELLS = 20;
export const UNIT_DEPTH_CELLS = 10;

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
  widthCells: number;
  depthCells: number;
  /** Negative: how far the bank lets the company go (PIOTR for Hard, [TUNE] for the other two). */
  overdraftLimit: number;
}

/** Starting cash is [PIOTR]. There is one painted hall and one set of registered room layers, so
 *  every difficulty rents the same 200 m2 (docs/art/SPRITES.md 9.3); what very easy keeps of its
 *  Turn 1 advantage is the cash and the bench slots [TUNE]. */
export const DIFFICULTIES: DifficultySpec[] = [
  {
    id: 'veryEasy',
    label: 'Very easy',
    startingCash: 50000,
    areaM2: UNIT_AREA_M2,
    rentMonthly: UNIT_RENT_MONTHLY,
    ratesMonthly: UNIT_RATES_MONTHLY,
    benchSlots: 6,
    widthCells: UNIT_WIDTH_CELLS,
    depthCells: UNIT_DEPTH_CELLS,
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
    widthCells: UNIT_WIDTH_CELLS,
    depthCells: UNIT_DEPTH_CELLS,
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
    widthCells: UNIT_WIDTH_CELLS,
    depthCells: UNIT_DEPTH_CELLS,
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
/** A finished piece stands at the gate until it is taken to the client (PIOTR). The courier bill
 *  and the minutes the van costs somebody are both [TUNE]. */
export const COURIER_COST = 120;
export const OWN_DELIVERY_MINUTES = 90;
/** More than three pieces at the gate and the hall is in its own way (PIOTR: 30% slower). */
export const GATE_CROWD_LIMIT = 3;
export const GATE_CROWD_FACTOR = 0.7;
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

/** Emails are per job, not a daily block, and they scale with what the job is worth: 1 up to
 *  3000, 2 up to 10000, 3 up to 20000, then one more for every further 10000 (PIOTR gave the
 *  first two bands and the rule above 20000; the 10000 to 20000 band as 3 is Claude's reading,
 *  reported). Ten minutes each is [TUNE]. */
export const EMAIL_PRICE_BREAKS: Array<[number, number]> = [
  [3000, 1],
  [10000, 2],
  [20000, 3],
];
export const EMAIL_ABOVE_BREAKS = 3;
export const EMAIL_ABOVE_PRICE = 20000;
export const EMAIL_ABOVE_PRICE_STEP = 10000;
export const EMAIL_MINUTES = 10;
/** Unanswered emails at delivery: 1% of the price each, capped at 5% (PIOTR). */
export const EMAIL_PAYMENT_PENALTY = 0.01;
export const EMAIL_PAYMENT_PENALTY_MAX = 0.05;
/** And the rating gain is multiplied by 1 less 0.2 per unanswered email, floored at 0 (PIOTR). */
export const EMAIL_RATING_PENALTY = 0.2;
export const BOOKKEEPING_MINUTES = 60;
/** Books behind on the 1st: 100 per consecutive month behind (PIOTR). */
export const LATE_ACCOUNTS_CHARGE = 100;
export const DAILY_ORDERING_MINUTES = 60;
/** 10 minutes per joiner per day (PIOTR). */
export const STAFF_MANAGEMENT_MINUTES_PER_JOINER = 10;
/** A call is 15 minutes of whoever takes it, whatever the job is worth (PIOTR, T4 3.3). */
export const CLIENT_CALL_ANSWER_MINUTES = 15;
/** The first call a job loses is free. From the second on, each takes a tenth off what the client
 *  will say about the job (PIOTR) and a point off the rating itself [TUNE]. */
export const CALL_MISSES_FREE = 1;
export const CALL_SATISFACTION_PENALTY = 0.1;
export const CALL_RATING_PENALTY = 1;
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
/** Moving the kit about is a job of work: an hour a machine or a bench [TUNE]. */
export const MOVE_MINUTES_PER_ITEM = 60;
/** Reconnecting one machine's ducting to the extraction, every time it is moved (PIOTR). */
export const DUCTING_RECONNECT_COST = 800;
/** Every machine family is ducted into the extraction except the compressor. The hand tools are
 *  not machines at all, so they never appear here (PIOTR). */
export const NO_DUCTING_SPECS = ['compressor'];
/** The clock runs itself at 4x while the hall is being moved about, and the player cannot touch
 *  it until it is done (PIOTR). */
export const MOVING_SPEED = 4;
/** Weekly clean (PIOTR). */
export const CLEANING_MINUTES = 120;
/** Fetch from temporary storage the next morning (PIOTR). */
export const FETCH_STORAGE_MINUTES = TEMP_STORAGE_FETCH_MINUTES;
/** Repairing anything takes 90 minutes [TUNE]. */
export const REPAIR_MINUTES = 90;
/** [TUNE] the extractor keeps its Turn 1 parts bill; every other machine is 5% of what it cost. */
export const EXTRACTOR_REPAIR_COST = 150;
export const MACHINE_REPAIR_COST_FRACTION = 0.05;
/** Every machine wants a service once a month, and it costs half an hour (PIOTR). From Turn 6 the
 *  month is counted on the machine's own clock and not on the calendar: 80 hours is the month a
 *  one man shop puts on a table saw, which serves three, so the service he is used to lands where
 *  it always did, and a saw with three men on it is serviced three times as often
 *  [TUNE: 80] (CLAUDE.md T6 3.6). */
export const SERVICE_INTERVAL_HOURS = 80;
export const SERVICE_MINUTES = 30;
/** [TUNE] the service bill, and what an overdue machine risks every working day. */
export const SERVICE_COST_FRACTION = 0.02;
export const OVERDUE_BREAKDOWN_CHANCE = 0.02;

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

/** Every family has this one unless the table below gives it more (CLAUDE.md T3 3.5). */
export const STANDARD_VARIANT = 'standard';

/** Hours of use a standard machine of each family has in it [TUNE]. Piotr will set the real
 *  figures per machine later, and they all live in this one table. */
export const MACHINE_ENDURANCE_HOURS: Record<string, number> = {
  tableSaw: 3000,
  edgebander: 4000,
  thicknesser: 2500,
};
export const MACHINE_ENDURANCE_HOURS_DEFAULT = 5000;

/** The five classes of table saw. Prices and the used saw's three effects are (PIOTR), the rest
 *  of the factors are [TUNE] (CLAUDE.md T3 3.5). */
export const TABLE_SAW_VARIANTS: EquipmentVariant[] = [
  {
    id: 'used',
    name: 'Used table saw',
    price: 1800,
    outputFactor: 0.95,
    bagIntervalFactor: 0.5,
    enduranceFactor: 0.25,
    powerPerDay: 3,
    description:
      'Somebody else wore this one out first. The table is true enough and the motor still ' +
      'pulls, but the bearings rumble and the fence needs coaxing. It is what a workshop buys ' +
      'when the bank is the problem and the work is waiting.',
  },
  {
    id: 'budget',
    name: 'Budget table saw',
    price: 5000,
    outputFactor: 1,
    bagIntervalFactor: 1,
    enduranceFactor: 1,
    powerPerDay: 3,
    description:
      'A new saw at the bottom of the trade range. Cast iron table, a fence that locks square, ' +
      'and nothing you did not pay for. It will cut sheets all day for years if it is looked ' +
      'after, and it is the saw most one man workshops start with.',
  },
  {
    id: 'standard',
    name: 'Standard table saw',
    price: 7000,
    outputFactor: 1.05,
    bagIntervalFactor: 1.2,
    enduranceFactor: 1.2,
    powerPerDay: 4,
    description:
      'The saw a working joinery shop settles on. A heavier table, a sliding carriage that ' +
      'takes a full sheet, and extraction that actually pulls the dust off the blade. It saves ' +
      'a few minutes on every sheet, and the minutes add up over a month.',
  },
  {
    id: 'pro',
    name: 'Professional table saw',
    price: 15000,
    outputFactor: 1.15,
    bagIntervalFactor: 1.5,
    enduranceFactor: 1.5,
    powerPerDay: 5,
    description:
      'Built for a shop where the saw runs most of the day. Scoring blade, powered rise and ' +
      'fall, a carriage long enough for a kitchen worktop. It cuts cleaner, which means less ' +
      'sanding later, and it holds its settings between jobs.',
  },
  {
    id: 'industrial',
    name: 'Industrial table saw',
    price: 25000,
    outputFactor: 1.3,
    bagIntervalFactor: 2,
    enduranceFactor: 2,
    powerPerDay: 7,
    description:
      'A panel saw meant for production, three phase and heavy enough that it does not move ' +
      'when you lean on it. It eats sheets, it takes the whole day without complaining, and it ' +
      'costs more than most workshops earn in a good month.',
  },
];

const VARIANTS_BY_FAMILY: Record<string, EquipmentVariant[]> = {
  tableSaw: TABLE_SAW_VARIANTS,
};

/** How many men one machine of a family can serve in a day. Two unless the family says otherwise
 *  [TUNE]; the table saw serves three [PIOTR]. The hours a machine wears out by are the share of
 *  that capacity the workshop actually puts through it (CLAUDE.md T6 3.6). */
export const MACHINE_CAPACITY_DEFAULT = 2;

const BASE_SPEC = {
  capacity: MACHINE_CAPACITY_DEFAULT,
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
  requiresOneOf: [] as string[],
  height: 1,
};

/** A catalogue line before its variants are worked out. */
type SpecDraft = Omit<EquipmentSpec, 'variants' | 'enduranceHours'>;

/** Every family gets its variants and its endurance here, so the table above stays a table.
 *  A family with nothing in VARIANTS_BY_FAMILY has the one standard variant, at the Turn 1 price
 *  and with every factor at 1.0 (CLAUDE.md T3 3.5). */
function withVariants(draft: SpecDraft): EquipmentSpec {
  const variants = VARIANTS_BY_FAMILY[draft.id] ?? [
    {
      id: STANDARD_VARIANT,
      name: draft.name,
      price: draft.price,
      outputFactor: 1,
      bagIntervalFactor: 1,
      enduranceFactor: 1,
      powerPerDay: POWER_PER_MACHINE_DAILY,
      description: draft.effect,
    },
  ];
  const cheapest = variants[0];
  return {
    ...draft,
    variants,
    // The catalogue line carries the price of the cheapest way into the family.
    price: cheapest ? cheapest.price : draft.price,
    enduranceHours: MACHINE_ENDURANCE_HOURS[draft.id] ?? MACHINE_ENDURANCE_HOURS_DEFAULT,
  };
}

// Footprints are in metres, one grid cell each way. They were written in the 0.5 m tiles of
// Turns 1 to 4 and are half of those figures here, never below the one cell an object has to
// stand on: the table saw that was 4 by 2 by 2 tiles is 2 by 1 by 1 m (docs/art/SPRITES.md 9.1).
const SPEC_DRAFTS: SpecDraft[] = [
  {
    ...BASE_SPEC,
    id: 'desk',
    tab: 'computers',
    name: 'Desk',
    price: 150,
    category: 'furniture',
    width: 2,
    depth: 1,
    height: 1,
    spriteKey: 'desk',
    effect: 'Required to use the laptop.',
  },
  {
    ...BASE_SPEC,
    id: 'chair',
    tab: 'computers',
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
    tab: 'computers',
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
    tab: 'sheetMachines',
    name: 'Table saw',
    capacity: 3,
    price: 1800,
    category: 'machine',
    width: 2,
    depth: 1,
    height: 1,
    spriteKey: 'tableSaw',
    bagInterval: 2400,
    usedOn: 'sheet',
    stackable: true,
    effect: 'Cuts sheets. Bag every 2400 minutes. One saw per three joiners.',
  },
  {
    ...BASE_SPEC,
    id: 'drill',
    tab: 'handTools',
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
    tab: 'handTools',
    name: 'Hand edgebander',
    price: 900,
    category: 'machine',
    // It stands in a tool cabinet and comes out to the bench, so it holds no cell of the floor
    // and nothing can be dropped on it in setup mode (CLAUDE.md T6 3.5).
    width: 0,
    depth: 0,
    height: 0,
    spriteKey: 'edgebander',
    bagInterval: 4800,
    usedOn: 'sheet',
    requires: ['toolCabinet'],
    effect: 'Edges sheet goods at the bench. Lives in a tool cabinet. Bag every 4800 minutes.',
  },
  {
    ...BASE_SPEC,
    id: 'compressor',
    tab: 'handTools',
    name: 'Small compressor',
    price: 350,
    category: 'machine',
    width: 1,
    depth: 1,
    height: 1,
    spriteKey: 'compressor',
    effect: 'Air for nailers and clamps.',
  },
  {
    ...BASE_SPEC,
    id: 'extractor',
    tab: 'extraction',
    name: 'Extractor',
    price: 600,
    category: 'extraction',
    width: 1,
    depth: 1,
    height: 2,
    spriteKey: 'extractor',
    effect: 'Serves every machine. Without it there are no bags. Can break down.',
  },
  {
    ...BASE_SPEC,
    id: 'workbench',
    tab: 'handTools',
    name: 'Workbench',
    price: 250,
    category: 'bench',
    width: 2,
    depth: 1,
    height: 1,
    spriteKey: 'workbench',
    perWorker: true,
    stackable: true,
    effect: 'One per worker. The unit has a fixed number of bench slots.',
  },
  {
    ...BASE_SPEC,
    id: 'sheetRack',
    tab: 'storage',
    name: 'Cheap shelving',
    price: 400,
    category: 'storage',
    width: 2,
    depth: 1,
    height: 1,
    spriteKey: 'sheetRack',
    sheetCapacity: 50,
    effect: 'Holds 50 sheets. Nothing can be unloaded without somewhere to put it.',
  },
  {
    ...BASE_SPEC,
    id: 'sheetRackBetter',
    tab: 'storage',
    name: 'Better shelving',
    price: 900,
    category: 'storage',
    width: 2,
    depth: 1,
    height: 1,
    spriteKey: 'sheetRackBetter',
    sheetCapacity: 75,
    effect: 'Holds 75 sheets. More than that needs a bigger unit.',
  },
  {
    ...BASE_SPEC,
    id: 'toolCabinet',
    tab: 'storage',
    name: 'Tool cabinet',
    price: 350,
    category: 'storage',
    width: 1,
    depth: 1,
    height: 1,
    spriteKey: 'toolCabinet',
    perWorker: true,
    stackable: true,
    effect:
      'Holds one man\u0027s hand tools and the hand edgebander. One for every worker and one ' +
      'for you.',
  },
  {
    ...BASE_SPEC,
    id: 'locker',
    tab: 'storage',
    name: 'Locker',
    price: 80,
    category: 'welfare',
    width: 1,
    depth: 1,
    height: 1,
    spriteKey: 'locker',
    perWorker: true,
    stackable: true,
    effect: 'One per worker.',
  },
  {
    ...BASE_SPEC,
    id: 'canteenSeat',
    tab: 'storage',
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
    tab: 'handTools',
    name: 'Hand tool set for a worker',
    price: 400,
    category: 'tools',
    width: 1,
    depth: 1,
    height: 1,
    spriteKey: 'handToolSet',
    perWorker: true,
    stackable: true,
    requires: ['toolCabinet'],
    effect: 'One per worker, bought by the owner. Kept in his tool cabinet.',
  },
  {
    ...BASE_SPEC,
    id: 'van',
    tab: 'handling',
    name: 'Van',
    price: 9000,
    category: 'vehicle',
    width: 2,
    depth: 1,
    height: 1,
    spriteKey: 'van',
    effect: 'Removes taxi and transport costs.',
  },
  {
    ...BASE_SPEC,
    id: 'forklift',
    tab: 'handling',
    name: 'Forklift',
    price: 6000,
    category: 'vehicle',
    width: 1,
    depth: 1,
    height: 1,
    spriteKey: 'forklift',
    unloadFactor: 0.5,
    effect: 'Unloading takes half the time.',
  },
  {
    ...BASE_SPEC,
    id: 'forkliftBetter',
    tab: 'handling',
    name: 'Better forklift',
    price: 12000,
    category: 'vehicle',
    width: 1,
    depth: 1,
    height: 1,
    spriteKey: 'forkliftBetter',
    unloadFactor: 0.2,
    effect: 'Unloading takes a fifth of the time.',
  },
  {
    ...BASE_SPEC,
    id: 'thicknesser',
    tab: 'timberMachines',
    name: 'Thicknesser',
    price: 2500,
    category: 'machine',
    width: 2,
    depth: 1,
    height: 1,
    spriteKey: 'thicknesser',
    bagInterval: 480,
    usedOn: 'solidWood',
    effect: 'Solid wood tools, part 1. Bag every 480 minutes.',
  },
  {
    ...BASE_SPEC,
    id: 'solidWoodTools',
    tab: 'timberMachines',
    name: 'Planer, router, sander, clamps',
    price: 2200,
    category: 'machine',
    width: 2,
    depth: 1,
    height: 1,
    spriteKey: 'solidWoodTools',
    usedOn: 'solidWood',
    effect: 'Solid wood tools, part 2. With the thicknesser this unlocks solid wood.',
  },
  {
    ...BASE_SPEC,
    id: 'cnc',
    tab: 'cnc',
    name: 'CNC',
    price: 45000,
    category: 'machine',
    width: 3,
    depth: 2,
    height: 1,
    spriteKey: 'cnc',
    labourFactor: 0.8,
    locked: true,
    lockReason: 'Coming in a later stage.',
    effect: 'Labour minus 20% on every job.',
  },
  {
    ...BASE_SPEC,
    id: 'cncHead',
    tab: 'cnc',
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
    tab: 'spraying',
    name: 'Spray booth',
    price: 18000,
    category: 'machine',
    width: 3,
    depth: 2,
    height: 2,
    spriteKey: 'sprayBooth',
    locked: true,
    lockReason: 'Coming in a later stage.',
    effect: 'Unlocks the lacquer finish.',
  },
  {
    ...BASE_SPEC,
    id: 'dustSystem',
    tab: 'extraction',
    name: 'Central dust extraction system',
    price: 35000,
    category: 'extraction',
    width: 2,
    depth: 2,
    height: 2,
    spriteKey: 'dustSystem',
    effect: 'No more bags and no breakdown. Waste collection 400 per month.',
  },
  {
    ...BASE_SPEC,
    id: 'flexiSystem',
    tab: 'extraction',
    name: 'Flexi extraction system',
    price: 50000,
    category: 'extraction',
    width: 2,
    depth: 2,
    height: 2,
    spriteKey: 'flexiSystem',
    effect:
      'Everything the central system does, and flexible ducting on every machine: move the hall ' +
      'about as often as you like and the reconnection never costs again. Waste collection 400 ' +
      'per month.',
  },
  {
    ...BASE_SPEC,
    id: 'pelletiser',
    tab: 'extraction',
    name: 'Pelletiser',
    price: 15000,
    category: 'extraction',
    width: 1,
    depth: 1,
    height: 2,
    spriteKey: 'pelletiser',
    requiresOneOf: ['dustSystem', 'flexiSystem'],
    effect: 'No waste cost and pellet sales that rise with production.',
  },
];

export const EQUIPMENT_SPECS: EquipmentSpec[] = SPEC_DRAFTS.map(withVariants);

/** Machines that must be owned before solid wood jobs can be made without the by-hand path. */
export const SOLID_WOOD_EQUIPMENT = ['thicknesser', 'solidWoodTools'];

/** Fixed placement in cells, which are metres (docs/art/SPRITES.md 9.1). Free placement by the
 *  player is parked for the room blocks only: everything else he sets out himself (T2 3.10). */
export interface LayoutSlot {
  x: number;
  y: number;
  /** Parked outside the front kerb instead of on the hall floor. */
  yard?: boolean;
}

/** The fixed room blocks, in the cells docs/art/SPRITES.md 9.3 registers the painted layers to:
 *  the WC 2 cells, the office 8 and the canteen 8, eighteen of the two hundred. They stand in x
 *  order along the rear wall and all three are 2.7 m high, which is what the art is drawn at.
 *  A room has no sprite key: it is painted by its hall layer, or drawn as a placeholder box while
 *  that layer is missing (docs/art/SPRITES.md 9.3). */
/** The tabs of the equipment catalogue, in Piotr's order, with what the player reads
 *  (CLAUDE.md T6 3.6). A tab with nothing in it says so rather than being hidden. */
export const EQUIPMENT_TABS: Array<{ id: EquipmentTab; label: string }> = [
  { id: 'sheetMachines', label: 'Sheet machines' },
  { id: 'timberMachines', label: 'Timber machines' },
  { id: 'spraying', label: 'Spraying' },
  { id: 'sanding', label: 'Sanding' },
  { id: 'handTools', label: 'Hand tools' },
  { id: 'extraction', label: 'Extraction' },
  { id: 'computers', label: 'Computers' },
  { id: 'cnc', label: 'CNC' },
  { id: 'cncCentre', label: 'CNC centre' },
  { id: 'handling', label: 'Handling' },
  { id: 'storage', label: 'Storage' },
];

export const ROOM_LAYOUT = [
  {
    id: 'wc',
    name: 'WC',
    x: 0,
    y: 0,
    width: 1,
    depth: 2,
    height: 2.7,
    tooltip: 'The WC. Cold tap, one towel.',
  },
  {
    id: 'office',
    name: 'Office',
    x: 1,
    y: 0,
    width: 2,
    depth: 4,
    height: 2.7,
    tooltip: 'The office. The desk, the laptop, the paperwork.',
  },
  {
    id: 'canteen',
    name: 'Canteen',
    x: 3,
    y: 0,
    width: 2,
    depth: 4,
    height: 2.7,
    tooltip: 'The canteen. Tea, and somewhere to eat out of the dust.',
  },
] as const;

/** The door in a room's front face: centred on the face, opening into the hall
 *  (docs/art/SPRITES.md 9.3). The contract gives no size, so this is measured off the delivered
 *  painting: the office door is 0.92 m wide and its head is 2.1 m up [TUNE]. */
export const ROOM_DOOR = { width: 0.9, height: 2.1 };

export type RoomId = (typeof ROOM_LAYOUT)[number]['id'];

/** The room block by name, so nothing reaches for it by position in the array. */
export function roomById(id: RoomId): (typeof ROOM_LAYOUT)[number] {
  const room = ROOM_LAYOUT.find((entry) => entry.id === id);
  if (!room) throw new Error(`no room ${id}`);
  return room;
}

/** The cell outside a room's door. The doors are centred on the faces the hall is on: y = 4 for
 *  the office and the canteen, y = 2 for the WC (docs/art/SPRITES.md 9.3). */
export function roomDoorCell(id: RoomId): { x: number; y: number } {
  const room = roomById(id);
  return { x: room.x + Math.floor(room.width / 2), y: room.y + room.depth };
}

/** The roller shutter, in the left wall: 3 m of wall from y 6, 3 m high (docs/art/SPRITES.md 9.3).
 *  It is a far wall from where the camera stands, so a vehicle is only ever seen once it is
 *  inside, which is what the gate lane below is kept clear for. */
export const SHUTTER = { y: 6, width: 3, height: 3 };

/** The personnel door, in the left wall between y 4.5 and 5.5 (docs/art/SPRITES.md 9.3). */
export const PERSONNEL_DOOR = { y: 4.5, width: 1 };

/** Hall placement. The office furniture is not placed at all: the office is a photoreal room and
 *  the desk, the chair and the laptop are in the artwork, not on a cell (CLAUDE.md T4 3.1).
 *  Machines stand along the rear wall clear of the rooms, stock and the big kit in the front half,
 *  and nothing is ever laid on the gate lane. */
export const STARTING_LAYOUT: Record<string, LayoutSlot> = {
  tableSaw: { x: 6, y: 1 },
  thicknesser: { x: 12, y: 1 },
  solidWoodTools: { x: 15, y: 1 },
  compressor: { x: 18, y: 1 },
  extractor: { x: 18, y: 0 },
  dustSystem: { x: 17, y: 2 },
  flexiSystem: { x: 17, y: 2 },
  pelletiser: { x: 15, y: 3 },
  sheetRack: { x: 3, y: 7 },
  sheetRackBetter: { x: 3, y: 9 },
  cnc: { x: 12, y: 7 },
  sprayBooth: { x: 16, y: 7 },
  forklift: { x: 6, y: 9 },
  forkliftBetter: { x: 6, y: 9 },
  drill: { x: 8, y: 9 },
  handToolSet: { x: 9, y: 9 },
  van: { x: 0, y: 7, yard: true },
};

/** Bench slots, in order, along the middle of the hall clear of the rooms and the personnel door.
 *  A unit uses the first `benchSlots` of them. */
export const BENCH_SLOT_LAYOUT: LayoutSlot[] = [
  { x: 3, y: 5 },
  { x: 6, y: 5 },
  { x: 9, y: 5 },
  { x: 12, y: 5 },
  { x: 15, y: 5 },
  { x: 18, y: 5 },
];

/** Welfare items stand in the row in front of the rooms, clear of the three doors. */
export const LOCKER_SLOT_LAYOUT: LayoutSlot[] = [
  { x: 6, y: 4 },
  { x: 7, y: 4 },
  { x: 8, y: 4 },
  { x: 9, y: 4 },
  { x: 10, y: 4 },
  { x: 11, y: 4 },
];

export const CANTEEN_SLOT_LAYOUT: LayoutSlot[] = [
  { x: 12, y: 4 },
  { x: 13, y: 4 },
  { x: 14, y: 4 },
  { x: 15, y: 4 },
  { x: 16, y: 4 },
  { x: 17, y: 4 },
];

/** Tool cabinets stand along the rear wall past the machines: one for the owner and one for every
 *  worker (CLAUDE.md T6 3.5). */
export const CABINET_SLOT_LAYOUT: LayoutSlot[] = [
  { x: 6, y: 0 },
  { x: 7, y: 0 },
  { x: 8, y: 0 },
  { x: 9, y: 0 },
  { x: 10, y: 0 },
  { x: 11, y: 0 },
  { x: 12, y: 0 },
];

/** Where a waiting delivery lorry stands: inside the shutter, on the lane. */
export const GATE_LAYOUT = { x: 0, y: SHUTTER.y, width: 2, depth: 2, height: 1 };

/** The way in from the shutter that nothing may stand on: x 0 to 2, y 6 to 10, eight of the two
 *  hundred cells (docs/art/SPRITES.md 9.3). */
export const GATE_LANE = { x: 0, y: SHUTTER.y, width: 2, depth: 4 };
/** How far into the hall the lane reaches. */
export const GATE_LANE_CELLS = GATE_LANE.width;

/** Where finished pieces stand until transport is ordered: at the far end of the lane, in front of
 *  the shutter, which is why too many of them slow the whole hall down (CLAUDE.md T2 3.7). */
export const FINISHED_GOODS_LAYOUT = { x: 0, y: 9, width: 2, depth: 1, height: 1 };
export const DELIVERY_VAN_SPRITE = 'deliveryVan';

/** Width of the apron drawn beyond the front kerb, where the company van is parked, in cells. */
export const YARD_WIDTH_CELLS = 3;

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

/** Every joiner needs all of these before he can be hired (PIOTR). The tool cabinet is counted
 *  one higher than the rest, because the owner keeps his own tools in one too (T6 3.5). */
export const JOINER_PREREQUISITES = [
  'workbench',
  'locker',
  'canteenSeat',
  'handToolSet',
  'toolCabinet',
];
/** The item every worker and the owner each need one of. */
export const TOOL_CABINET = 'toolCabinet';
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
/** A broken extractor triples the dust rate (PIOTR). The hall carries on at a quarter speed
 *  rather than stopping dead (PIOTR, Turn 2). */
export const EXTRACTOR_BROKEN_DUST_MULTIPLIER = 3;
export const EXTRACTOR_BROKEN_OUTPUT_FACTOR = 0.25;
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

// ---------------------------------------------------------------------------
// 3.12 Why it is like this in real life
// ---------------------------------------------------------------------------

/** Two or three sentences per decision, in plain English. The player can turn them off, and they
 *  never carry a number the engine might change (CLAUDE.md T2 3.12). */
export const WHY: Record<string, string> = {
  unitDeposit:
    'A landlord wants a deposit before he hands over the keys, and it is usually one month of ' +
    'rent. It sits in his account for the whole tenancy and does nothing for you. Budget for it ' +
    'as money you will not see again until you leave.',
  depositReturn:
    'The deposit comes back when you hand the unit over in the state you took it in. Anything ' +
    'the landlord has to put right comes out of it first. Most people get a good part of it back ' +
    'and nobody should count on all of it.',
  rent:
    'Rent is agreed by the month but it is really a daily cost: every day the doors are shut is ' +
    'a day you paid for and did not use. Working out the daily figure is the quickest way to see ' +
    'what a slow week costs you.',
  rates:
    'Business rates are a tax on the property, paid to the council whether you make anything or ' +
    'not. Small units often get relief, larger ones do not. They arrive as a yearly bill you pay ' +
    'in monthly instalments.',
  jobDeposit:
    'A deposit on acceptance is normal in joinery and it is what pays for the material. Without ' +
    'it you are lending the client the cost of his own kitchen. Half on order and half on ' +
    'delivery is the usual arrangement.',
  arrearsInterest:
    'Once a bill goes unpaid it starts to cost extra. Suppliers and landlords add interest to ' +
    'what you owe, so a debt you ignore grows on its own. The longer it runs the harder it is ' +
    'to get out from under it.',
  bailiff:
    'After a few months of arrears a creditor can send enforcement agents to take goods to the ' +
    'value of the debt. They take what they can sell, and they credit you a fraction of what it ' +
    'cost you. Losing a machine you still owe money on is how a workshop stops being a workshop.',
  lateAccounts:
    'Books that are not written up have to be reconstructed by somebody else, and accountants ' +
    'charge by the hour for that. The longer you leave it the more there is to untangle. It is ' +
    'the cheapest work in the business to do yourself and the dearest to put off.',
  extractor:
    'Dust extraction is not optional in a workshop. Without it the machines clog, the air is ' +
    'dangerous to breathe, and an inspector will stop you. With the extractor down you can still ' +
    'work, but slowly, and the mess builds up three times as fast.',
  service:
    'A machine that is serviced runs for years and one that is not gives up in the middle of a ' +
    'job. Blades, bearings and filters all have a life. A monthly check costs a fraction of a ' +
    'breakdown and it never happens on a quiet day.',
  finishedGoods:
    'A finished piece is not money until the client has it. It stands by the door taking up ' +
    'floor space and getting in the way of the next job. Booking the transport the day it is ' +
    'finished is what keeps the workshop moving.',
  lowStock:
    'Material is ordered days before it is needed and arrives when the supplier feels like it. ' +
    'An empty rack means joiners standing around on full wages. Keeping a small buffer costs ' +
    'cash but it costs less than a stopped bench.',
};
