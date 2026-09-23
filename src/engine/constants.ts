// Every number in the game lives here.
// [PIOTR] comes from the owner's real business and is law: do not change it.
// [TUNE] is a placeholder chosen so the engine can run. It is never presented in the UI as a fact.
// Nothing in this file is exposed to the player as a setting (CLAUDE.md rule 3.4).

import type {
  BubbleKey,
  DayCategory,
  Difficulty,
  EquipmentSpec,
  EquipmentVariant,
  EquipmentTab,
  Finish,
  LedgerCategory,
  LostMinuteCause,
  MaterialKind,
  OwnerIdleReason,
  ProductTemplate,
  SoftwareTier,
  StageId,
  StageSpec,
  WorkerIdleReason,
  WorkerRole,
  WorkerTier,
} from './types';

/** Bumped in Turn 13: the state carries the loan and the overdraft interest, the insurance covers,
 *  the security and website levels, the standing contracts, the owner's draw tier, the pipe runs,
 *  the gates, the settings, the tips seen and the second shift; a worker carries his shift and his
 *  own day log; an enquiry carries its kind, its budget and the client's answer; a job carries its
 *  kind, its budget, the sheets held for it and its night minutes; the per project question is
 *  gone with it. A Turn 12 save is lifted into that shape (CLAUDE.md T13 section 4).
 *
 *  Bumped in Turn 12: the bags came off the machines and onto the extractor. The state carries
 *  the hall's one bag store in cubic metres, the day carries the dust it made and every summary
 *  carries the same, a machine carries no bag of its own any more, and the bag change is the
 *  emptying of the bags. A Turn 11 save is lifted into that shape by the migration, so a v18
 *  game opens (CLAUDE.md T12 2.3).
 *
 *  Bumped in Turn 10: every machine carries the compressor it draws its air from and whether it
 *  stands at ninety degrees to the walls, every job carries the minutes of production that went
 *  into it and how many of them the hall was under extracted for, and a job carries whether its
 *  finish was sprayed on wet air. A Turn 9 save has none of them, so its air would come from
 *  nowhere, every machine would read as square to the walls and every piece as made in a clean
 *  hall; it is refused (CLAUDE.md T10 3.1, 3.2, 3.3, 3.8).
 *
 *  Bumped in Turn 8: the state carries what is bought and not yet delivered, every machine
 *  carries the day it is collected once it is sold, and an unloading task carries the kit on the
 *  lorry. A Turn 7 save has none of them, so its hall would hold cells for nothing and its
 *  deliveries would never land; it is refused.
 *
 *  Bumped in Turn 7: a job is made in stages and carries the runs at them, a machine carries the
 *  one man standing at it, every family has its classes with their own footprints and working
 *  zones, and `sheetRackBetter` is a class of `sheetRack` and not a family of its own. A Turn 6
 *  save would stand the better shelving on nothing and read every job's progress as one bar of
 *  work, so it is refused.
 *
 *  Bumped in Turn 6: the owner carries a labour factor and an overtime debt where he carried a
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
 *  carries the day it was finished (CLAUDE.md T3 3.5, 3.3). Bumped in Turn 9: a lorry load is one
 *  unloading of several orders, so a task carries a list of them (CLAUDE.md T9 3.1).
 *
 *  Bumped in Turn 11: the owner carries the log of his day and the state carries the last week of
 *  them, which is what the top bar's meter and the company board are drawn from (T11 3.1).
 *
 *  Bumped in Turn 17: a job may have a second man on it, the day counts the hours the company
 *  paid for whether they were worked or not, and the laptop keeps the tasks the player ticked
 *  to be done one after another. The welfare kit moved off the hall floor and into the canteen
 *  with the same bump (CLAUDE.md T17 section 4). Every v24 save loads.
 *
 *  Bumped in Turn 19: a job carries the list of everybody on it and not one man and a second, the
 *  settings carry the sound, and the state remembers that the hall has been set up
 *  (CLAUDE.md T19 section 4). Every v26 save loads.
 *
 *  Bumped in Turn 20: the four tiers are named again and nobody is "poor"; every man is paid by
 *  the week and the monthly wage is gone; a man can be let go and works his notice out; a machine
 *  counts its services and is out of the hall for the day of one; and a contract records who
 *  ended it (CLAUDE.md T20 section 4). Every v28 save loads.
 *
 *  Bumped in Turn 21: the monthly wage is back and the week is gone, because Piotr wanted everyone
 *  monthly and Turn 20 read him wrong; the four tiers carry his own rates; the state counts the
 *  calendar days in a row the cash has been under the overdraft limit, thirty of which close the
 *  company; the owner's day counts the minutes he stood as well as the ones he worked, and why; and
 *  a tool cabinet is two metres wide, so a saved hall's cabinets are laid out again
 *  (CLAUDE.md T21 section 4).
 *
 *  Version 19 is Turn 22: the unpaid balance a v18 save carried beside its cash is gone from the
 *  game, so it is subtracted from the cash and one ledger line says so; the turn a placed item and a
 *  reservation carried as a boolean becomes an `orientation`, its true reading as a quarter turn;
 *  and a tool cabinet with no class is the standard one, because the cabinet is a family of five now
 *  (CLAUDE.md T22 section 4). Every v30 and v31 save loads.
 *
 *  Version 20 is Turn 23: every month end writes its own figures down, so the state carries the
 *  months it has closed and Accounting reads them back instead of the ledger; the production
 *  manager is a tiered role like the joiner, so a saved manager is given the grade he was paid
 *  for; the cordless drill and the canteen seat are gone from the game, so a save's own are taken
 *  off its books with a line each; a man's hand tool set lives in a cabinet and not on the floor,
 *  so it loses the cell it stood on; and nobody is charged minutes for assigning any more, so the
 *  daily staff management chore goes off the list (CLAUDE.md T23 section 4). Every v33, v34 and
 *  v35 save loads.
 *
 *  Version 23 is v40 (PIOTR, 21.09): every machine writes down on the Monday what its class saved
 *  last week; the day's stats carry the sum behind the workshop's average output and every closed
 *  day the average it had. Every v36 to v39 save loads.
 *
 *  Version 26 is v50 (PIOTR, 22.09): the day's stats carry the minutes and the worth of every man
 *  who put a production minute in today, so the Output sheet can say who made the number
 *  (CLAUDE.md T24 2.1, section 4). Every v25 save loads.
 *
 *  Version 27 is v51 (PIOTR, 22.09): a machine's service runs on the calendar, so every machine
 *  carries the day it was bought or last serviced in place of the hours it had at the last one,
 *  and the state remembers the day a contract was last offered. Every v25 and v26 save loads.
 *
 *  Version 28 is v52 (PIOTR, 21.09): a machine is places and nobody takes one. Every man and the
 *  owner carry `working` and `noPlaceFor`, the day plan's answer; the old claim on a machine is a
 *  dead field the lift clears; the queue's lost minutes are `noPlace` (CLAUDE.md T25 section 4). Every v25, v26
 *  and v27 save loads. */
export const STATE_VERSION = 28;

/** Shown in the corner of every screen and bumped by every delivery (PIOTR, 13.09). The only
 *  place the number lives. */
export const APP_VERSION = 'v52';

// ---------------------------------------------------------------------------
// The owner's day, in the seven things it is made of
// ---------------------------------------------------------------------------

/** The order the segments are painted in when a day is summed up, and the order the tooltip and
 *  the day end plate read in. The bar itself is drawn in the order the minutes happened
 *  (CLAUDE.md T11 3.1). */
export const DAY_CATEGORIES: readonly DayCategory[] = [
  'workshop',
  'calls',
  'emails',
  'meetings',
  'siteMeasure',
  'office',
  'fixing',
];

/** What each one is called on the tooltip, on the day end plate and on the company board. */
export const DAY_CATEGORY_LABELS: Record<DayCategory, string> = {
  workshop: 'Workshop',
  calls: 'Calls',
  emails: 'Emails',
  meetings: 'Meetings',
  siteMeasure: 'Site measure',
  office: 'Office',
  fixing: 'Fixing and bags',
};

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
/** 13:00: the board is written again when the workshop comes back off its dinner, which is the
 *  second of the day's two refreshes (PIOTR, 13.09; CLAUDE.md T10 3.7). */
export const BOARD_MIDDAY_MINUTE = BREAK_START_MINUTE + BREAK_MINUTES;
/** How often the clock under a day track is marked, in minutes of the working day [TUNE]: every
 *  two hours from 8:00, which is what the drawing has. The last two hour mark is left off when the
 *  end of the day is nearer to it than half of that, so 16:00 and 17:00 never sit on top of each
 *  other (docs/mockups/t20/contracts-tab.html; CLAUDE.md T20 2.1.1). */
export const DAY_TRACK_TICK_MINUTES = 120;
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
/** The chips the player drives the clock with. Ten is Piotr's: a month of trading is long and he
 *  asked for a speed that gets through it (PIOTR, 13.09; CLAUDE.md T9 3.11). Thirty is his too:
 *  a working day of 480 minutes in 16 real seconds (PIOTR, 15.09; CLAUDE.md T14 2.4). The one
 *  table: the top bar reads it, and nothing else spells a speed out. */
export const SPEEDS = [0, 1, 2, 4, 10, 30] as const;
export const DAYS_PER_WEEK = 7;
/** [TUNE] simplification for Turn 1: every month is 30 days. */
export const DAYS_PER_MONTH = 30;
export const MONTHS_PER_YEAR = 12;
export const DAYS_PER_YEAR = DAYS_PER_MONTH * MONTHS_PER_YEAR;
/** Monday to Friday (PIOTR). */
export const WORKING_DAYS_PER_WEEK = 5;
export const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
/** The twelve month names the calendar cycles through. The game's month is thirty days, so a name
 *  is a label on a block of thirty and never a real April; there is no year on a date, because a
 *  workshop's year number is nothing the player does anything with (PIOTR, 17.09;
 *  CLAUDE.md T18 2.2). */
export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;
/** The month the company opens in, as an index into `MONTH_NAMES`: 0 is January, so 2 is March
 *  [TUNE: March, which is the spring the trade picks up in and what day 1 should feel like]. */
export const START_MONTH = 2;

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
/** A man's hourly wage is his week divided by forty [TUNE: the 40]. The staff overtime of Turn 8
 *  is gone with the rule: the men go home at five, always, and the evening is the owner's alone,
 *  so nobody stays, nobody is paid time and a half and nobody hands his notice in over it
 *  (PIOTR, 17.09; CLAUDE.md T17 2.12). The four figures that priced it went with the functions
 *  that read them. */
export const WORKER_HOURS_PER_WEEK = 40;

/** Owner away: all staff production drops by this much (PIOTR: 30%). With a production manager
 *  on the books the drop is this much instead (PIOTR: 0.05 to 0.10, the session uses 0.08). The
 *  manager adds nothing while the owner is in the hall; this is the day the player stops being
 *  the bottleneck (CLAUDE.md T13 3.9). The Turn 1 chief executive is not a role in this game.  */
export const OWNER_AWAY_PENALTY = 0.3;
export const OWNER_AWAY_PENALTY_WITH_PM = 0.08;
/** The longest holiday the button offers, in working days [TUNE] (CLAUDE.md T13 3.9). */
export const HOLIDAY_MAX_DAYS = 10;
/** Sick leave once per game year, 4 to 5 days, random day (PIOTR). */
export const SICK_DAYS_MIN = 4;
export const SICK_DAYS_MAX = 5;
/** Owner output: 800 of job value per day, so 320 of labour value per day (PIOTR). */
export const OWNER_JOB_VALUE_PER_DAY = 800;
export const OWNER_LABOUR_VALUE_PER_DAY = 320;
/** CLAUDE.md 8.5 writes this as 0.6667, which is this exact fraction rounded to four places. */
export const OWNER_LABOUR_PER_MINUTE = OWNER_LABOUR_VALUE_PER_DAY / MINUTES_PER_WORKING_DAY;

/** The hours the company pays for, per man, per working day: eight, whether they were worked or
 *  not. The bottom of the workshop rate, and the reason a shop that stands still still pays
 *  (PIOTR, 17.09; CLAUDE.md T17 2.26). The owner is paid for the same eight, and for the
 *  overtime he actually stayed for on top. */
export const PAID_HOURS_PER_WORKING_DAY = 8;

/** The owner alone, at his work every minute of his eight hours, earns exactly this an hour:
 *  the reference the workshop rate is read against. 320 over 8 is 40 (CLAUDE.md T17 2.26). */
export const OWNER_RATE_PER_HOUR = OWNER_LABOUR_VALUE_PER_DAY / PAID_HOURS_PER_WORKING_DAY;

/** Working days the workshop rate on the Company board is read over, and the week it compares
 *  itself with [TUNE: five, one working week] (CLAUDE.md T17 2.26). */
export const RATE_WEEK_DAYS = 5;
/** The warning strip's two money lines (PIOTR accepted, 17.09; CLAUDE.md T18 2.6).
 *
 *  `SPEND_WARNING_FROM_CLOSED_DAYS` is the sixth day the game has closed: the brief's own figure.
 *  A workshop's first week is the fitting out, when everything is spending and nothing has been
 *  delivered, so the line would be true and useless on every one of those days [TUNE].
 *
 *  `SPEND_WARNING_CATEGORIES` is what the line counts as going out: the wages under all three of
 *  the ledger's names for them, the owner's draw, and the fixed charges of the month. Material,
 *  equipment, transport and a job's own costs are not in it, because they are bought against work
 *  and the line is about the money that goes out whether the hall works or not. The loan's capital
 *  instalment is not in it either: the brief names the interest [TUNE]. */
export const SPEND_WARNING_FROM_CLOSED_DAYS = RATE_WEEK_DAYS + 1;
export const SPEND_WARNING_CATEGORIES = [
  'wages',
  'wagesNight',
  'salaries',
  'ownerDraw',
  'rent',
  'rates',
  'power',
  'insurance',
  'security',
  'loanInterest',
  'overdraftInterest',
  'software',
] as const;
/** The two lines a margin is read against, on the client's answer and anywhere else the game
 *  colours one (PIOTR accepted, 17.09; CLAUDE.md T18 2.9) [TUNE]. A fifth of the price left after
 *  the material and the labour is a job worth having, which is the floor the scripted player of
 *  Turn 13's 10.4 has taken every job on; a tenth is the line under which the job pays for the
 *  wood and the hours and almost nothing else. Between them the figure is printed in the body
 *  colour, because it is neither news nor a warning. */
export const MARGIN_GOOD = 0.2;
export const MARGIN_THIN = 0.1;

/** The days the first steps line walks a new player in for. After the third one, or from the day
 *  after this, it is gone for good (PIOTR accepted, 17.09; CLAUDE.md T18 2.7) [TUNE]. */
export const FIRST_STEPS_LAST_DAY = 3;

// ---------------------------------------------------------------------------
// 8.1 Fixed costs and the unit
// ---------------------------------------------------------------------------

/** The owner's daily draw: what he pays himself, every working day, one of eight thresholds and
 *  nothing in between (PIOTR: 200, 400, 800, 1,500, 3,000, then up to about 10,000; the three
 *  upper steps are [TUNE] interpolation). It stays daily: money leaks every day, with no bump at
 *  the month end (CLAUDE.md T13 3.18). Index 0 is where every game starts, which is the Turn 1
 *  living cost of 200 (PIOTR). */
export const OWNER_DRAW_TIERS: readonly number[] = [200, 400, 800, 1500, 3000, 5000, 7500, 10000];
export const OWNER_DRAW_PER_DAY = OWNER_DRAW_TIERS[0] ?? 200;
/** What the owner is living in at each tier, from a run down flat in the middle of nowhere to a
 *  villa (PIOTR: the two ends; the six between are [TUNE]). Eight lines, one per tier. */
export const HOUSE_TIER_NAMES: readonly string[] = [
  'A bedsit over a shop, in the middle of nowhere',
  'A rented flat',
  'A two bed terrace',
  'A semi with a garden',
  'A detached house',
  'A house with a double garage',
  'A house in the country',
  'A villa',
];
/** The house tier is the highest threshold whose thirty day sum the owner has actually paid
 *  himself over the last thirty calendar days, off the ledger (CLAUDE.md T13 3.18). */
export const HOUSE_WINDOW_DAYS = 30;
/** How long the house card stays up at the end of the day before the summary, unless it is
 *  clicked [TUNE] (CLAUDE.md T13 3.18). */
export const HOUSE_CARD_SECONDS = 3;
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

/** The systems that take the dust away by duct and pay the waste man instead of filling bags.
 *  Everything the central system does, the flexi one does (CLAUDE.md T4 3.5, T12 2.3). */
export const CENTRAL_EXTRACTION_SPECS: readonly string[] = ['dustSystem', 'flexiSystem'];
/** Pellet sales with a pelletiser, rising with production (PIOTR). */
export const PELLET_INCOME_MONTHLY_BASE = 600;
/** [TUNE] extra pellet income per 1000 minutes of production in the month. */
export const PELLET_INCOME_PER_1000_PRODUCTION_MINUTES = 40;

/** Working days in a month of 30 calendar days, for the month's fixed cost figure [TUNE]. */
export const WORKING_DAYS_PER_MONTH = (DAYS_PER_MONTH * WORKING_DAYS_PER_WEEK) / DAYS_PER_WEEK;

/** Hours a man is paid for in one of the game's months: his forty hour week over thirty days of a
 *  seven day week, which is 171.43. The one figure that turns a monthly wage into an hourly one,
 *  which the night premium wants, and the reason nothing has to count weeks in a month any more:
 *  from Turn 21 the wage itself is the month's (CLAUDE.md T13 3.9, T21 2.10). */
export const WORKER_HOURS_PER_MONTH = (WORKER_HOURS_PER_WEEK * DAYS_PER_MONTH) / DAYS_PER_WEEK;

/** Working minutes behind that month, 10,285.71: what a minute of a man costs is his wage over
 *  this (CLAUDE.md T21 2.10). */
export const WORKER_MINUTES_PER_MONTH = WORKER_HOURS_PER_MONTH * (MINUTES_PER_WORKING_DAY / HOURS_PER_WORKING_DAY);

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
// 8.3 Debt, the overdraft, the loan, bankruptcy
// ---------------------------------------------------------------------------

/** The overdraft costs what it costs: a yearly rate on the negative balance, accrued day by day
 *  while the account is below zero and charged monthly, interest only; the balance stays negative
 *  until the player brings it up (PIOTR: 0.25; CLAUDE.md T13 3.14). */
export const OVERDRAFT_RATE_YEARLY = 0.25;
/** The one loan: at Piotr's yearly rate, over sixty monthly instalments (PIOTR: 5 years), interest
 *  on the outstanding balance charged monthly with the instalment. Early repayment costs nothing
 *  [TUNE] (CLAUDE.md T13 3.14).
 *
 *  How much of it there is stopped being one figure in Turn 23. The bank lends against the books
 *  it is shown: a quarter of the last twelve calendar months' sales [PIOTR, 20.09], and never
 *  less than the floor a company with no history gets [TUNE]. There is no upper cap at all
 *  [PIOTR, 20.09: "no upper limit"], so a workshop that turns over a million may borrow a quarter
 *  of it. `loanLimit` in src/engine/finance.ts is the one function that works it out, and the
 *  refusal and the finance card both read it (CLAUDE.md T23 2.12). */
export const LOAN_SHARE_OF_SALES = 0.25;
export const LOAN_FLOOR = 10000;
/** How many calendar months of the ledger the bank looks at, today's month among them [PIOTR: the
 *  last twelve months]. A sale in the thirteenth month back is off the books it reads. */
export const LOAN_SALES_MONTHS = 12;
/** What the bank counts as a sale: money invoiced out of the workshop. The deposits and the
 *  balances of the jobs, the weekly pieces of a standing contract and the pellets the hall sells
 *  are the four lines of the ledger a customer's money arrives on; a loan drawn, an insurance
 *  payout and a deposit the landlord gives back are not turnover and are not on it
 *  (CLAUDE.md T23 2.12). */
export const SALES_CATEGORIES: readonly LedgerCategory[] = [
  'jobDeposit',
  'jobBalance',
  'contract',
  'pellets',
];
export const LOAN_RATE_YEARLY = 0.15;
export const LOAN_MONTHS = 60;
export const LOAN_EARLY_REPAYMENT_PENALTY = 0;
/** The bank closes a company whose cash has passed this multiple of its overdraft limit
 *  [PIOTR, 18.09: the 1.5]. On very easy and easy that is -15,000 and on hard -7,500. From Turn 22
 *  the cash is the whole of the company's position, because every bill is paid out of the account,
 *  the limit included (CLAUDE.md T21 2.2, T22 2.1, 2.2). */
export const BANKRUPTCY_LIMIT_FACTOR = 1.5;

/** The other way the bank closes you: this many calendar days in a row with the cash below the
 *  overdraft limit, whatever the amount [PIOTR, 18.09: "thirty days below the limit"]. A day above
 *  the limit puts the count back to nought (CLAUDE.md T21 2.2). */
export const BANKRUPTCY_DAYS_BELOW_LIMIT = 30;

/** What a machine standing in the hall fetches second hand: half what it cost (PIOTR), and a
 *  third and a bit for one that was second hand when it was bought [TUNE]
 *  (CLAUDE.md T8 3.5). */
export const SALE_FRACTION = 0.5;
export const SALE_FRACTION_USED = 0.35;
/** The class that carries the lower fraction: it was somebody else's before it was his. */
export const USED_VARIANT = 'used';

// ---------------------------------------------------------------------------
// 8.4 to 8.7 Job value, labour, payments
// ---------------------------------------------------------------------------

/** Material 40%, labour 40%, profit 20% of the price (PIOTR). */
export const MATERIAL_FRACTION = 0.4;
export const LABOUR_FRACTION = 0.4;
export const PROFIT_FRACTION = 0.2;
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
/** What an express job pays over a standard one, drawn uniformly between the two (PIOTR, 13.09:
 *  "more express jobs, properly profitable"; CLAUDE.md T10 3.7). */
export const EXPRESS_PRICE_UPLIFT_MIN = 0.3;
export const EXPRESS_PRICE_UPLIFT_MAX = 0.5;
/** At most one express enquiry reaches the board in a week (PIOTR). */
/** The chance the next enquiry drawn is an express one, at every refresh of the board [TUNE]
 *  (PIOTR, 13.09; CLAUDE.md T10 3.7). It is a flat figure now: the one a week of Turns 1 to 9 and
 *  the reputation ladder that fed it are gone, because one a week is not "more express jobs". */
export const EXPRESS_PROBABILITY = 0.25;
/** A job made by hand takes half again as long (PIOTR). */
export const BY_HAND_DURATION_FACTOR = 1.5;
/** Float guard, not a game number: work this small is finished work. */
export const WORK_EPSILON = 1e-9;

/** What a job is made of, in the order the workshop does it, and what share of the labour each
 *  stage carries [TUNE]. They add up to 1 (CLAUDE.md T7 3.1). */
export const PRODUCTION_STAGES: StageSpec[] = [
  { id: 'cutting', label: 'Cutting', share: 0.25 },
  { id: 'machining', label: 'Machining', share: 0.15 },
  { id: 'assembly', label: 'Assembly', share: 0.45 },
  { id: 'finishing', label: 'Finishing', share: 0.15 },
];

/** A CNC does the cutting and the machining of a sheet job as one stage, so it carries the two
 *  shares together (CLAUDE.md T7 3.4). */
export const CNC_STAGE: StageSpec = {
  id: 'cnc',
  label: 'CNC',
  share: (PRODUCTION_STAGES[0]?.share ?? 0) + (PRODUCTION_STAGES[1]?.share ?? 0),
};

/** What the CNC does to the minutes of that one stage: it replaces three saws, which is about a
 *  fifth off the whole job (PIOTR). The tool changer head takes it a little further [TUNE]. */
export const CNC_STAGE_FACTOR = 2;
export const CNC_STAGE_FACTOR_WITH_HEAD = 2.1;
/** Parts come off a CNC cut and drilled, so the assembly takes half the minutes (PIOTR). */
export const CNC_ASSEMBLY_FACTOR = 2;
/** A job goes on the saw when the CNC is taken, unless the player turns it off on the job card
 *  [TUNE: default on] (CLAUDE.md T7 3.4). */
export const SAW_FALLBACK_DEFAULT = true;

/** The piece leaving. It carries no labour: it is the Turn 2 transport, not work at a bench
 *  (CLAUDE.md T7 3.1). The Work Plan drew a bar for it until Turn 9 took the bars away. */
export const DELIVERY_STAGE: StageSpec = { id: 'delivery', label: 'Delivery', share: 0 };
/** [TUNE] informational per job cost of a worker minute: monthly wage divided by this. It was the
 *  2,400 minutes of a forty hour week until Turn 21 made the wage the month's; the figure it hands
 *  back barely moves (an experienced joiner's minute was 600 / 2,400 = 25p and is now
 *  2,600 / 10,285.71 = 25.3p) (CLAUDE.md T21 2.10). */
export const WORKER_MINUTE_RATE_DIVISOR = WORKER_MINUTES_PER_MONTH;

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
/** How many enquiries the company cannot take are kept on the board at a time, greyed, with the
 *  reason in plain words [TUNE] (PIOTR, 13.09: "show the jobs we cannot take and say why";
 *  CLAUDE.md T10 3.7). They are drawn beside the band and are never part of it. */
export const UNREACHABLE_MIN = 2;
export const UNREACHABLE_MAX = 3;
/** New enquiries a day, by reputation tier, drawn at the day's open (PIOTR: one at the start,
 *  two at most; CLAUDE.md T13 3.4). The website adds to or takes from the week (T13 3.7). The
 *  automatic third enquiry that refilled the board after an acceptance is gone. */
export const ENQUIRIES_PER_DAY_BY_REPUTATION_TIER: readonly number[] = [1, 1, 2];
/** The client's answer: the budget times a factor drawn in this band (PIOTR: minus 10% to plus
 *  15%), skewed by the team and never leaving it. The skew is a quarter each for the reputation
 *  tier, an estimator on the books and the salesman [TUNE] (CLAUDE.md T13 3.24). */
export const ANSWER_MIN = 0.9;
export const ANSWER_MAX = 1.15;
export const ANSWER_SKEW_PER_REPUTATION_TIER = 0.25;
export const ANSWER_SKEW_ESTIMATOR = 0.25;
export const ANSWER_SKEW_SALESMAN = 0.25;
export const ANSWER_SKEW_MAX = 1;
/** Commercial enquiries: two to three times the residential budget [TUNE], a standing above 20
 *  (PIOTR) and at least one hired person (PIOTR), and both covers of insurance held
 *  (CLAUDE.md T13 3.15). The chance an enquiry drawn for a company that qualifies is a
 *  commercial one [TUNE]. */
export const COMMERCIAL_BUDGET_FACTOR_MIN = 2;
export const COMMERCIAL_BUDGET_FACTOR_MAX = 3;
export const COMMERCIAL_MIN_REPUTATION = 20;
export const COMMERCIAL_MIN_STAFF = 1;
export const COMMERCIAL_PROBABILITY = 0.3;
export const NO_INSURANCE_REASON = 'no insurance';
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
/** What a sheet costs, by how many are on the order. Turn 13 had two prices and nothing between
 *  them, 175 for stock and 200 ad hoc, and the player could do nothing about either. Piotr made
 *  it a ladder on 20.09: a merchant prices a load and not a customer, so a job's take off and a
 *  restock are the same order at the same counter, and buying a lorry load is what makes a sheet
 *  cheap [PIOTR, 20.09, the rule; TUNE, every figure in the table] (CLAUDE.md T23 2.16).
 *
 *  Read through `sheetPriceFor` in src/engine/materials.ts, which walks it from the top: the
 *  price of an order is the last band whose `from` it reaches. The bands are in order and the
 *  first one starts at a single sheet, so every order has a price. */
export const SHEET_PRICE_LADDER: ReadonlyArray<{ from: number; price: number }> = [
  { from: 1, price: 200 },
  { from: 10, price: 190 },
  { from: 30, price: 180 },
  { from: 50, price: 170 },
  { from: 100, price: 160 },
  { from: 200, price: 150 },
  { from: 500, price: 135 },
  { from: 1000, price: 120 },
];
/** A stock line whose free count is under this many sheets wears the Low stock badge [TUNE]
 *  (CLAUDE.md T13 3.2). What Restock buys is the number the player types now, and what fills the
 *  rack when he types none, so there is no figure to bring a line back up to (CLAUDE.md T17 2.20). */
export const LOW_STOCK_SHEETS = 4;
/** The stock number a line carries, in the style of the software the player is meant to
 *  recognise: the prefix per material kind, and three digits off the seed [TUNE wording]
 *  (CLAUDE.md T13 3.2). */
export const STOCK_NUMBER_PREFIX: Record<MaterialKind, string> = {
  sheet: 'MFC-18-WHT',
  solidWood: 'OAK-27-PAR',
};
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
/** The daily consumables and materials chore, thirty minutes a day whatever the number of
 *  projects, the admin's when there is one (PIOTR; CLAUDE.md T13 3.3). */
export const DAILY_ORDERING_MINUTES = 30;
export const CONSUMABLES_LABEL = 'Consumables and materials';
/** A material take off is half an hour of the desk it is done at, whatever the job is worth
 *  [PIOTR, 18.09: "when I did it, it took 30 minutes"] (CLAUDE.md T20 2.3). The curve by price and
 *  the five a day are both gone: the man's own speed is what makes one take off longer than
 *  another, so a man with no experience spends 50 minutes over it and an excellent one 25, and he
 *  does as many a day as his minutes allow. */
export const MATERIAL_TAKE_OFF_MINUTES = 30;
/** What Joinery Core does to those minutes: it halves them [TUNE, from PIOTR's "16 a day bare and
 *  32 with the software"]. */
export const JOINERY_CORE_TAKE_OFF_FACTOR = 0.5;
/** And what each of its extensions does on top of that: a further quarter off [TUNE]. */
export const JOINERY_CORE_EXTENSION_TAKE_OFF_FACTOR = 0.75;
export const JOINERY_CORE_MAX_EXTENSIONS = 2;
/** Joinery Core and its extensions are bought by the year [TUNE], charged as a twelfth each
 *  month like every other subscription (CLAUDE.md T13 3.8). */
export const JOINERY_CORE_PRICE_YEARLY = 1200;
export const JOINERY_CORE_EXTENSION_PRICE_YEARLY = 600;
/** What an experienced estimator costs a month [PIOTR's own 2,600, which Turn 20 divided into a
 *  week and Turn 21 hands back whole]. The four tiers come off it by the one ladder in 9.3, and
 *  what each tier is worth against the owner at the take off is WORKER_RATES: an estimator is a
 *  man with a rate like any other, so he has no rate table of his own any more
 *  (CLAUDE.md T21 2.10). The standing each tier answers from is TIER_MIN_REPUTATION. */
export const ESTIMATOR_MONTHLY_WAGE_EXPERIENCED = 2470;
/** What an experienced sprayer costs a month [his own 2,700, back whole]. He is paid by the month
 *  like everybody else: there is one unit of pay in the game and it is the month (PIOTR, 19.09:
 *  "I wanted everyone monthly"; CLAUDE.md T21 2.10). His four tiers come off this by the one
 *  ladder in 9.3, and the standing each answers from is TIER_MIN_REPUTATION, the same gate every
 *  tiered role passes (CLAUDE.md T21 2.9). */
export const SPRAYER_MONTHLY_WAGE_EXPERIENCED = 2565;
/** What a joiner gets through in a minute of a lacquered job's finishing, against a sprayer's 1.0
 *  [TUNE]. A workshop without a sprayer is slower at the booth, never stuck
 *  (CLAUDE.md T19 2.6). */
export const JOINER_SPRAY_RATE = 0.7;
/** What a sprayer gets through in a minute of the finishing he is there for: his own trade, at
 *  the full rate (CLAUDE.md T19 2.6). */
export const SPRAYER_SPRAY_RATE = 1.0;
/** What a sprayer gets through in a minute of anything that is not spraying [TUNE]. He can stand
 *  at a bench and help, and he is not a joiner (CLAUDE.md T19 2.6). */
export const SPRAYER_BENCH_RATE = 0.6;

/** The production manager, in four grades from tonight, because without one on duty nobody takes
 *  a job by himself and the player has to see what a better man is for (PIOTR, 20.09;
 *  CLAUDE.md T23 2.4). His grade says three things, and here are the three tables.
 *
 *  How many men he can carry: the men on the books, the owner not counted, in the order they were
 *  hired. A man past his number is a man without a manager, who waits for the boss's click
 *  [TUNE the four figures]. */
export const PRODUCTION_MANAGER_CARRIES: Record<WorkerTier, number> = {
  novice: 8,
  experienced: 12,
  senior: 18,
  master: 25,
};

/** What he does to the pace of the men he carries: their production minutes are multiplied by it,
 *  the way a tier's rate is, and it shows on the efficiency breakdown as one line [TUNE]. */
export const PRODUCTION_MANAGER_PACE: Record<WorkerTier, number> = {
  novice: 1.03,
  experienced: 1.05,
  senior: 1.08,
  master: 1.1,
};

/** What each grade costs a month [TUNE]. Piotr's own four figures and not the one wage ladder
 *  every other tiered role comes off: the ladder against 3,400 would put the novice at 2,550. The
 *  experienced man keeps the 3,400 a manager is paid today, which is why a saved manager is made
 *  experienced when a v19 save is lifted (CLAUDE.md T23 2.4, section 4). */
export const PRODUCTION_MANAGER_MONTHLY_WAGE: Record<WorkerTier, number> = {
  novice: 2400,
  experienced: 3400,
  senior: 4200,
  master: 5200,
};

/** How each grade picks the next man's job, in the words the hire card says it in [PIOTR, 20.09:
 *  the four rules are his]. The middle clause of the duties line, and the order `autoAssignJobs`
 *  works in. */
export const PRODUCTION_MANAGER_ORDER_WORDS: Record<WorkerTier, string> = {
  novice: 'oldest open job first',
  experienced: 'soonest deadline first',
  senior: 'soonest deadline, machines spread',
  master: 'soonest deadline, machines spread, re planned hourly',
};

/** The master's re plan, and his alone: how far ahead of its deadline a job has to be projected
 *  before he will take a man off it, and how far past its deadline another has to be projected
 *  before he will put that man on it. Both in working days of the work plan's own axis
 *  [TUNE: one day each way, which is the case the brief's own test names: "the master's move once
 *  a job is a day behind and another a day ahead"] (CLAUDE.md T23 2.4).
 *
 *  A day is what stops the churn. With no gap at all he would swap a man every hour over a
 *  projection that moved by a minute; a whole day of slack means the job he is taken off still
 *  makes its deadline without him. */
export const MANAGER_AHEAD_DAYS = 1;
export const MANAGER_BEHIND_DAYS = 1;

/** How often the master looks at the board again, in minutes of the clock [PIOTR, 20.09: "at
 *  every hour he re plans"] (CLAUDE.md T23 2.4). */
export const MANAGER_REPLAN_MINUTES = 60;
/** The second shift: this many minutes after the day shift [TUNE], at this much of salary for
 *  those hours [TUNE], the owner absent from the hall: quality a tier down for work done at
 *  night [TUNE] and the error chance doubled [TUNE] (CLAUDE.md T13 3.9). */
export const SECOND_SHIFT_MINUTES = 480;
export const NIGHT_RATE = 1.25;
export const NIGHT_QUALITY_TIER_DROP = 1;
export const NIGHT_ERROR_FACTOR = 2;
/** The floor limits the crew: one person per this many square metres of free floor [TUNE], set so
 *  that a 200 m2 hall with a normal set of machines and racks lands at the owner plus four, five
 *  at most (PIOTR; CLAUDE.md T13 3.10). */
export const M2_PER_PERSON = 24;
/** A job worth more than this starts with a meeting at the client's before anything is drawn
 *  (PIOTR). Four hours of somebody's day; the salesman goes instead of the owner once the company
 *  is known well enough for the client to accept him [TUNE threshold] (CLAUDE.md T7 3.11). */
export const MEETING_PRICE_THRESHOLD = 20000;
export const CLIENT_MEETING_MINUTES = 240;
export const MEETING_SALESMAN_REPUTATION = 40;

/** An office admin covering for a specialist the company has not taken on takes twice as long
 *  over the work: a client call is 30 minutes of his day and a per job material order is two of
 *  the clerk's, which is about eight a day (PIOTR, CLAUDE.md T7 3.12). */
export const ADMIN_COVER_RATE = 0.5;

/** What a draftsman is worth against the owner at his own screen, and what he costs [TUNE]. The
 *  minutes of a drawing already carry the software's own factor, so his rate is the 0.8 and
 *  nothing else: the licence is counted once, where it is written down (CLAUDE.md T10 3.6). */
export const DRAFTSMAN_RATE = 0.8;
/** Paid by the month like everybody else, at his own 2,400 (CLAUDE.md T21 2.10). */
export const DRAFTSMAN_MONTHLY_WAGE = 2400;
export const DRAFTSMAN_REPUTATION = 15;

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
/** Emptying one bag (PIOTR). The bags are on the extractor and nowhere else, and emptying the
 *  hall's store takes this long for every bag in it: ten bags take ten times as long as one
 *  (CLAUDE.md T12 2.3). */
export const BAG_CHANGE_MINUTES = 15;
/** Moving the kit about is a job of work: an hour a machine or a bench [TUNE]. */
export const MOVE_MINUTES_PER_ITEM = 60;
// The owner never goes out for what he buys: everything is an order and ordering costs him
// nothing at all (PIOTR, 13.09; CLAUDE.md T9 3.1). The trip of Turn 7, and the three figures it
// was measured in, are gone.
/** What dropping a project costs the company, at once (PIOTR, 13.09: "drastically";
 *  CLAUDE.md T9 3.9). From Turn 21 it is the floor of a scale and not the whole cost: a 3,000 job
 *  costs the ten, and a 50,000 one costs everything the scale allows, because the two are not the
 *  same broken promise (CLAUDE.md T21 2.4). */
export const DROP_PROJECT_REPUTATION = 10;
/** The price a drop is free of extra cost up to: the ten points and no more [PIOTR, 19.09]. */
export const DROP_REPUTATION_FREE_PRICE = 5000;
/** A point for every thousand pounds of the price above that [PIOTR, 19.09]. */
export const DROP_REPUTATION_PER_1000 = 1;
/** And never more than this, however big the job [PIOTR, 19.09: "up to 50 max"]. */
export const DROP_REPUTATION_MAX = 50;
/** A commercial client tells a trade: his job's drop costs this much more, still capped at the
 *  fifty [PIOTR, 19.09]. */
export const DROP_REPUTATION_COMMERCIAL_FACTOR = 1.5;
/** How many lines of the reputation log are kept. The company board reads it week by week, and a
 *  year of trading is a few hundred lines [TUNE]. */
export const REPUTATION_LOG_MAX = 2000;
/** The interview, which is what taking somebody on costs the owner (PIOTR). */
export const HIRING_MINUTES = 60;
/** The laptop booting up before anything on it can be touched (PIOTR). */
export const LAPTOP_BOOT_MINUTES = 5;
/** The extraction pipe the game routes for the player, charged by the metre [TUNE]. Moving a
 *  machine disconnects it and refunds nothing; reconnecting charges the new length. This is the
 *  reconnection the Turn 4 flat ducting charge was, and it replaces it (CLAUDE.md T13 3.19). */
export const PIPE_PRICE_PER_METRE = 45;
/** An automatic blast gate on a machine's drop: fitted for this much (PIOTR: 800 the kit, 1,000
 *  fitted), worth this much output on that machine (PIOTR), and the hall's extraction demand
 *  counts a gated machine only while it is actually running (CLAUDE.md T13 3.11). */
export const GATE_PRICE = 1000;
export const GATE_OUTPUT_BONUS = 0.02;
/** Every machine family is ducted into the extraction except the compressor. The hand tools are
 *  not machines at all, so they never appear here (PIOTR). */
export const NO_DUCTING_SPECS = ['compressor'];
/** Skip ahead: the fastest the loop allows, run for the player while the owner is out and until
 *  the task he is out on is over (PIOTR, 13.09; CLAUDE.md T8 3.3). The Turn 4 forced 4x of a move
 *  of the hall is this same run now, so there is one speed the clock is ever taken to and one
 *  thing that takes it there (CLAUDE.md T8 3.4). */
/** The one speed the game ever takes the clock to for the player: through a trip out or a move of
 *  the hall. It is the fastest chip there is (CLAUDE.md T8 3.3, T9 3.11). */
export const SKIP_SPEED = 10;
/** Weekly clean (PIOTR). */
export const CLEANING_MINUTES = 120;
/** Fetch from temporary storage the next morning (PIOTR). */
export const FETCH_STORAGE_MINUTES = TEMP_STORAGE_FETCH_MINUTES;
/** Repairing anything takes 90 minutes [TUNE]. */
export const REPAIR_MINUTES = 90;
/** [TUNE] the extractor keeps its Turn 1 parts bill; every other machine is 5% of what it cost. */
export const EXTRACTOR_REPAIR_COST = 150;
export const MACHINE_REPAIR_COST_FRACTION = 0.05;
/** The deadline a job comes with is worked out from the work in it, not from the kind of thing it
 *  is: nine tenths of the owner's own days plus three, as whole days, never under three and never
 *  over thirty (PIOTR). The per template ranges of Turns 1 to 5 are gone. */
export const DEADLINE_DAYS_FACTOR = 0.9;
export const DEADLINE_DAYS_BASE = 3;
export const DEADLINE_DAYS_MIN = 3;
export const DEADLINE_DAYS_MAX = 30;
/** Up to this much the client gives a flat nought to two days of slack (PIOTR: three to five days
 *  in total for a small job); above it he gives a tenth to a seventh of the deadline itself. */
export const DEADLINE_SMALL_JOB_PRICE = 3000;
export const DEADLINE_SMALL_SLACK_DAYS = 2;
export const DEADLINE_SLACK_PERCENT_MIN = 10;
export const DEADLINE_SLACK_PERCENT_MAX = 15;
/** An express job wants it in eight tenths of the time, and never in under three days: 20% sooner
 *  and not 40%, which is what an uplift of a fifth is worth (PIOTR, 17.09; CLAUDE.md T17 2.23). */
export const DEADLINE_EXPRESS_FACTOR = 0.8;

/** [PIOTR, 22.09] Every machine is serviced every six months, on the calendar, and that is all:
 *  "services every six months for every machine, not every twenty days, too much
 *  micromanagement". Turn 6's rule, a service every 80 hours of the machine's own clock, put a
 *  saw with three men on it in for a service every nine working days and the compressor every
 *  nine as well (his day 115 ledger: twenty services in 115 days, eleven of them the compressor).
 *  The six months run from the day the machine was bought or last serviced (v51). */
export const SERVICE_INTERVAL_MONTHS = 6;
export const SERVICE_INTERVAL_DAYS = SERVICE_INTERVAL_MONTHS * DAYS_PER_MONTH;
/** The month a one man shop puts on a table saw, in hours: Turn 6's figure, which was the service
 *  interval until v51 and is now only the basis two other readings are written in, the wear a
 *  minute of a machine and a week of its own clock past its life [TUNE: 80] (CLAUDE.md T6 3.6). */
export const MACHINE_HOURS_PER_MONTH = 80;
export const SERVICE_MINUTES = 30;
/** [PIOTR, 18.09] A service is a tenth of what the machine cost (CLAUDE.md T20 2.9.2). It was 2%
 *  from Turn 6 to Turn 19. */
export const SERVICE_COST_FRACTION = 0.1;
/** [PIOTR, 18.09] What a service adds to the machine's life: half of its ORIGINAL life the first
 *  time, and half of the last extension each time after that, so the extensions are 50%, 25%,
 *  12.5% of the original and they never add up past the original again (CLAUDE.md T20 2.9.1). */
export const SERVICE_LIFE_EXTENSION = 0.5;
/** [TUNE] A week of a machine's own clock, which is the same reading `MACHINE_HOURS_PER_MONTH` is
 *  written in: 80 hours is the month a one man shop puts on a saw (CLAUDE.md T6 3.6), so a week of
 *  it is that over the weeks in a month. No new figure: the two it is made of are Piotr's own
 *  (CLAUDE.md T20 2.9.4). */
export const PAST_LIFE_WEEK_HOURS = (MACHINE_HOURS_PER_MONTH * DAYS_PER_WEEK) / DAYS_PER_MONTH;
/** [PIOTR, 18.09: "red when under a tenth is left"] The share of a machine's life left at which
 *  the bar on the Machines page turns from good to bad (CLAUDE.md T20 2.9). */
export const LIFE_LOW_FRACTION = 0.1;
/** [TUNE] What an overdue machine risks every working day. */
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
// T13 3.7 The company website, five levels
// ---------------------------------------------------------------------------

export interface WebsiteLevelSpec {
  level: number;
  name: string;
  /** Bought once; the level can only be raised. */
  price: number;
  /** Enquiries a week the level adds to the board, or takes off it. */
  enquiriesPerWeek: number;
  /** Tiers the enquiries drawn are moved up or down the template ladder. */
  qualityTier: number;
  /** A small reputation bonus, held while the level is held. Levels 1 to 3 have none. */
  reputation: number;
  /** Minutes a week the owner or the admin spends keeping it. */
  upkeepMinutes: number;
}

/** Levels 1 to 3 move only the number and the quality of enquiries; 4 and 5 add a small
 *  reputation bonus, small on purpose, so reputation cannot be bought instead of earned (PIOTR:
 *  the prices 500 and 15,000, the 7,500 to 10,000 band at level 4, the bonus of 2 to 3, the upkeep
 *  of 10 to 20 minutes; the effects and the level 3 price are [TUNE]; CLAUDE.md T13 3.7). */
export const WEBSITE_LEVELS: readonly WebsiteLevelSpec[] = [
  { level: 1, name: 'Do it yourself', price: 0, enquiriesPerWeek: -1, qualityTier: -1, reputation: 0, upkeepMinutes: 0 },
  { level: 2, name: 'Template site', price: 500, enquiriesPerWeek: 0, qualityTier: 0, reputation: 0, upkeepMinutes: 10 },
  { level: 3, name: 'Agency site', price: 2500, enquiriesPerWeek: 1, qualityTier: 0, reputation: 0, upkeepMinutes: 13 },
  { level: 4, name: 'Good agency', price: 8500, enquiriesPerWeek: 2, qualityTier: 1, reputation: 2, upkeepMinutes: 17 },
  { level: 5, name: 'Top agency', price: 15000, enquiriesPerWeek: 3, qualityTier: 1, reputation: 3, upkeepMinutes: 20 },
];
/** Where every game starts (CLAUDE.md T13 section 4). */
export const WEBSITE_START_LEVEL = 1;

// ---------------------------------------------------------------------------
// 9.1 Product catalogue (PIOTR: products, prices, design minutes, calls)
// ---------------------------------------------------------------------------

export const FINISHES_SHEET: Finish[] = ['laminate'];
export const FINISHES_SOLID: Finish[] = ['laminate'];
/** The two products that are sprayed rather than laminated: they need a booth and nothing else
 *  will do (PIOTR, 15.09; CLAUDE.md T11 3.7). */
export const FINISHES_LACQUER: Finish[] = ['lacquer'];

export const PRODUCT_TEMPLATES: ProductTemplate[] = [
  {
    id: 'garageShelves',
    name: 'Garage shelves',
    basePrice: 400,
    material: 'sheet',
    calls: 2,
    needsMeasure: false,
    requiredEquipment: ['tableSaw'],
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
    calls: 2,
    needsMeasure: false,
    requiredEquipment: ['tableSaw', 'edgebander'],
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
    calls: 3,
    needsMeasure: false,
    requiredEquipment: ['tableSaw', 'edgebander'],
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
    calls: 3,
    needsMeasure: false,
    requiredEquipment: ['tableSaw', 'edgebander'],
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
    calls: 4,
    needsMeasure: true,
    requiredEquipment: ['tableSaw', 'edgebander'],
    allowedFinishes: FINISHES_SHEET,
    minReputation: 20,
    weightsByTier: [0, 8, 25],
    byHandAllowed: false,
  },
  // The two sprayed products (PIOTR, 15.09; CLAUDE.md T11 3.7). The board greys them until there
  // is a booth in the hall, the Finishing is done at the booth, and a booth on wet air takes half
  // as long again over it and marks the piece (CLAUDE.md T10 3.3).
  {
    id: 'lacqueredWardrobe',
    name: 'Lacquered wardrobe',
    // 3,500 at the smallest size the board draws, which is the bottom of Piotr's band; the size
    // multiplier takes it up from there [PIOTR: 3,500 to 6,000].
    basePrice: 4375,
    material: 'sheet',
    // The calls come off the price curve of 8.10, like every other template.
    calls: 4,
    needsMeasure: true,
    requiredEquipment: ['tableSaw', 'edgebander', 'sprayBooth'],
    allowedFinishes: FINISHES_LACQUER,
    minReputation: 10,
    weightsByTier: [0, 10, 18],
    byHandAllowed: false,
  },
  {
    id: 'lacqueredKitchen',
    name: 'Lacquered kitchen',
    // The same rule at the top of the ladder [PIOTR: 12,000 to 20,000].
    basePrice: 15000,
    material: 'sheet',
    calls: 4,
    needsMeasure: true,
    // A sprayed kitchen has its fronts moulded on the spindle moulder as well (T13 3.13).
    requiredEquipment: ['tableSaw', 'edgebander', 'sprayBooth', 'spindleMoulder'],
    allowedFinishes: FINISHES_LACQUER,
    // The same standing the small kitchen wants: the booth is the real gate on this one.
    minReputation: 20,
    weightsByTier: [0, 0, 12],
    byHandAllowed: false,
  },
  // A handleless kitchen: the J profile on the fronts wants the spindle moulder, and it is the
  // second product that does (CLAUDE.md T13 3.13) [TUNE price, four stages like every sheet job].
  {
    id: 'handlelessKitchen',
    name: 'Handleless kitchen',
    basePrice: 9000,
    material: 'sheet',
    calls: 4,
    needsMeasure: true,
    requiredEquipment: ['tableSaw', 'edgebander', 'spindleMoulder'],
    allowedFinishes: FINISHES_SHEET,
    minReputation: 20,
    weightsByTier: [0, 0, 14],
    byHandAllowed: false,
  },
  {
    id: 'oakDiningTable',
    name: 'Oak dining table',
    basePrice: 12000,
    material: 'solidWood',
    calls: 4,
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

/** Working days between the click and the lorry, for the three families whose classes do not all
 *  wait the same (CLAUDE.md T8 3.2). The bands are Piotr's and the exact figures are [TUNE]: a
 *  second hand saw is on the shop floor tomorrow, an industrial one is built to order. The two
 *  hand edgebanders come back in the owner's hands; the three floor ones are ordered in.
 *  Every other family waits the same however dear its class is, and says so in its own line. */
export const DELIVERY_DAYS_BY_CLASS: Record<string, Record<string, number>> = {
  tableSaw: { used: 1, budget: 1, standard: 5, pro: 7, industrial: 12 },
  sheetRack: { used: 1, budget: 1, standard: 3, pro: 5, industrial: 10 },
  edgebander: { used: 1, budget: 1, standard: 7, pro: 12, industrial: 20 },
  // The Turn 13 ladders [TUNE]: a used CNC is on a lorry in a week, an industrial one is built.
  cnc: { used: 5, budget: 20, standard: 45, pro: 45, industrial: 60 },
  spindleMoulder: { used: 1, budget: 3, standard: 7, pro: 12, industrial: 20 },
  sprayBooth: { used: 5, budget: 10, standard: 20, pro: 25, industrial: 30 },
  thicknesser: { used: 1, budget: 5, standard: 5, pro: 7, industrial: 12 },
  solidWoodTools: { used: 1, budget: 5, standard: 5, pro: 7, industrial: 12 },
};

/** What a lorry load of heavy kit costs somebody at the gate, before the handling kit shortens
 *  the walk [TUNE] (CLAUDE.md T8 3.2). Furniture and hand tools are carried in and need nobody. */
export const EQUIPMENT_UNLOAD_MINUTES = 120;

/** Unloading a load of sheets is a walk between the pallet at the gate and the racks, and the
 *  handling kit shortens it: 45 minutes by hand (PIOTR: first 30, then corrected to 45, because
 *  this is the room for the upgrade), about 30 with a pallet truck (PIOTR), about 15 with a
 *  forklift (PIOTR), and 10 with the better forklift [TUNE]. One table; the old per item factors
 *  are gone (CLAUDE.md T13 3.21). The key is the handling spec, `none` for bare hands. */
export const UNLOAD_MINUTES_BY_HANDLING: Record<string, number> = {
  none: 45,
  palletTruck: 30,
  forklift: 15,
  forkliftBetter: 10,
};
/** Sheets carried per trip between the pallet and the rack [TUNE] (CLAUDE.md T13 3.21). */
export const SHEETS_PER_TRIP = 2;
/** The hand pallet truck [TUNE] (CLAUDE.md T13 3.21). */
export const PALLET_TRUCK_PRICE = 450;

/** The families two men cannot simply pick up: the ones a move of the hall is charged for and a
 *  delivery needs somebody at the gate for (CLAUDE.md T8 3.2, 3.4) [TUNE list]. A bench, a rack,
 *  a tool cabinet, a locker, a seat, a hand tool, a van or a forklift is carried or driven, and
 *  costs nothing to shift. The CNC head is on the list and is not in Piotr's own words: it is
 *  ducted into the extraction like the machine it bolts to, and a machine that has to be
 *  reconnected is not one a man carries (REPORT-T8 deviations). */
export const HEAVY_SPECS = [
  'tableSaw',
  'edgebander',
  'thicknesser',
  'solidWoodTools',
  'cnc',
  'cncHead',
  'sprayBooth',
  'extractor',
  'dustSystem',
  'flexiSystem',
  'pelletiser',
  'compressor',
];

/** Classes of a heavy family that are carried after all: a used or budget compressor is a small
 *  portable thing on wheels (PIOTR: compressors above budget) (CLAUDE.md T8 3.4). A hand
 *  edgebander needs no entry here, because it holds no cell of the floor at all. */
export const LIGHT_CLASSES: Record<string, string[]> = {
  compressor: ['used', 'budget'],
};

/** Hours of use a standard machine of each family has in it [TUNE]. Piotr will set the real
 *  figures per machine later, and they all live in this one table. */
export const MACHINE_ENDURANCE_HOURS: Record<string, number> = {
  tableSaw: 3000,
  edgebander: 4000,
  thicknesser: 2500,
  spindleMoulder: 3500,
};

/** The five classes every ladder in this game has, in order: class 5 is always the industrial one
 *  (PIOTR; CLAUDE.md T13 1). */
export const CLASS_ORDER: readonly string[] = ['used', 'budget', 'standard', 'pro', 'industrial'];

/** The badge every class card wears, the same across families, so the player reads the class at
 *  a glance: one table, five entries (CLAUDE.md T13 3.12). The colours are [TUNE]. */
export const CLASS_BADGE: Record<string, { label: string; colour: string }> = {
  used: { label: 'Used', colour: '#8a8f96' },
  budget: { label: 'Budget', colour: '#6b7f9c' },
  standard: { label: 'Standard', colour: '#1f5a3a' },
  pro: { label: 'Pro', colour: '#c98a3b' },
  industrial: { label: 'Industrial', colour: '#7a6a9c' },
};

/** The families the player chooses a class for: every one of them has exactly five classes in
 *  the order above (CLAUDE.md T13 3.12). Everything else is bought off the catalogue line itself:
 *  a locker, an air dryer, a central system or a tool changer head has one class and never will
 *  have more. */
export const CLASS_LADDER_FAMILIES: readonly string[] = [
  'tableSaw',
  // The tool cabinet is a family of five from Turn 22, so its cards wear the class badge and the
  // class frame like every other ladder (CLAUDE.md T22 2.12: "the class ladder words are the
  // machines'").
  'toolCabinet',
  'edgebander',
  'thicknesser',
  'solidWoodTools',
  'cnc',
  'sprayBooth',
  'spindleMoulder',
  'extractor',
  'compressor',
  'workbench',
  'sheetRack',
];

/** Class 3 or above on the spindle moulder is the future gate to timber production. The branch
 *  choice itself is parked: the constant exists and nothing reads it (CLAUDE.md T13 3.13). */
export const TIMBER_BRANCH_MIN_SPINDLE_CLASS = 'standard';
export const MACHINE_ENDURANCE_HOURS_DEFAULT = 5000;

/** The five classes of table saw. Prices and the used saw's three effects are (PIOTR), the rest
 *  of the factors are [TUNE] (CLAUDE.md T3 3.5). */
/** Heights are the pictures' since v33 (the art side's table saws v2, 19.09): the canvas has to hold
 *  the guard arms, the hoses and the screens that rise above the 1 m body, and a height draws the
 *  canvas and nothing else. */
export const TABLE_SAW_VARIANTS: EquipmentVariant[] = [
  {
    id: 'used',
    name: 'Used table saw',
    price: 1800,
    width: 2,
    depth: 1,
    height: 1.4,
    zoneWidth: 3,
    zoneDepth: 3,
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
    width: 2,
    depth: 1,
    height: 1.4,
    zoneWidth: 3,
    zoneDepth: 3,
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
    width: 3,
    depth: 1,
    height: 1.95,
    zoneWidth: 4,
    zoneDepth: 3,
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
    width: 3,
    depth: 2,
    height: 2.15,
    zoneWidth: 6,
    zoneDepth: 3,
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
    width: 4,
    depth: 2,
    height: 2.65,
    zoneWidth: 5,
    zoneDepth: 4,
    enduranceFactor: 2,
    powerPerDay: 7,
    description:
      'A panel saw meant for production, three phase and heavy enough that it does not move ' +
      'when you lean on it. It eats sheets, it takes the whole day without complaining, and it ' +
      'costs more than most workshops earn in a good month.',
  },
];

/** The tool cabinet a hand tool is kept in. The exported name for it is in 9.3 with the hiring
 *  rules; the classes above are declared before that, so the id is named here once. */
const TOOL_CABINET_ID = 'toolCabinet';

/** The set of hand tools one man works with. It is bought like anything else, it lives in a slot of
 *  a tool cabinet, and the owner has one of his own that was never bought (CLAUDE.md T6 3.5,
 *  T22 2.12). */
export const HAND_TOOL_SET = 'handToolSet';

/** The endurance ladder every family with five classes uses: a worn out one has a quarter of the
 *  hours in it and an industrial one twice them (CLAUDE.md T7 3.6, as the saw's). */
const ENDURANCE_BY_CLASS: Record<string, number> = {
  used: 0.25,
  budget: 1,
  standard: 1.2,
  pro: 1.5,
  industrial: 2,
};

/** The roles that may be put on a job at all, and so the roles that take a place at a bench. A
 *  helper never builds: he carries, cleans and empties bags, and the Assign list says so rather
 *  than offering him (PIOTR, 17.09; CLAUDE.md T19 2.5, 2.6). It lives here from Turn 23 because
 *  machines.ts has to fill the benches with these men and cannot reach jobs.ts, which reads it
 *  and re-exports it under the name every caller has always used (CLAUDE.md T23 2.17). */
export const BUILDING_ROLES: readonly WorkerRole[] = ['joiner', 'sprayer'];

/** How many men can work at one machine of this class at once: a machine is not a thing one man
 *  takes, it is a number of places to work [PIOTR, 21.09; TUNE, Piotr's own for the saw]
 *  (CLAUDE.md T25 2.1). Every floor family men work at has its row, the bench's being Turn 23's
 *  `WORKBENCH_PLACES` folded in (T23 2.17). The CNC and the booth have no used or budget class in
 *  Piotr's table ("n/a"), but the catalogue sells both, so each of those has the one place a
 *  machine cannot have fewer of [TUNE]. `placesOf` in src/engine/machines.ts is the one reader, and
 *  a family that is not here has no places at all: nobody works at it. */
export const MACHINE_PLACES: Record<string, Record<string, number>> = {
  tableSaw: { used: 1, budget: 1, standard: 2, pro: 2, industrial: 3 },
  spindleMoulder: { used: 1, budget: 1, standard: 1, pro: 2, industrial: 2 },
  edgebander: { used: 1, budget: 1, standard: 1, pro: 2, industrial: 2 },
  thicknesser: { used: 1, budget: 1, standard: 1, pro: 1, industrial: 2 },
  cnc: { used: 1, budget: 1, standard: 1, pro: 1, industrial: 2 },
  sprayBooth: { used: 1, budget: 1, standard: 1, pro: 1, industrial: 2 },
  workbench: { used: 1, budget: 1, standard: 2, pro: 2, industrial: 3 },
};

/** The hall's pace at a stage, by the best class of the stage's family standing unbroken in the
 *  hall and not away for its service, whatever machine of it the man is at [PIOTR, 21.09: "the
 *  machine's class should add to the efficiency, that is easy to count"; TUNE, Piotr's figures]
 *  (CLAUDE.md T25 2.4). One ladder for every family, the bench's included: a class stops being a
 *  factor on whoever holds the machine and becomes the hall's. */
export const MACHINE_PACE: Record<string, number> = {
  used: 0.95,
  budget: 1,
  standard: 1.05,
  pro: 1.08,
  industrial: 1.12,
};

/** The families whose class is a pace: every family of the places table, and the solid wood tools,
 *  the one stage family a man works at without a place because the tools are shared out of a
 *  cabinet (CLAUDE.md T25 2.3, 2.4) [TUNE: the tools are in it because their class was a speed on
 *  v51 too]. Every other family's class is its capacity, its air or its store, and never a speed. */
export const PACED_FAMILIES: readonly string[] = [...Object.keys(MACHINE_PLACES), 'solidWoodTools'];

/** The five classes of workbench. Prices, places and footprints are Piotr's table; the endurance
 *  and the power are [TUNE] (CLAUDE.md T7 3.6, T23 2.17). A bench is not a machine, so its hours
 *  never move: the ladder is there so the family reads like every other one.
 *  The pace a man works at one is `MACHINE_PACE`, the one ladder of every family, from v52
 *  (CLAUDE.md T25 2.4). */
export const WORKBENCH_VARIANTS: EquipmentVariant[] = [
  {
    id: 'used',
    name: 'Used workbench',
    price: 120,
    width: 2,
    depth: 1,
    height: 0.9,
    zoneWidth: 2,
    zoneDepth: 2,
    enduranceFactor: ENDURANCE_BY_CLASS.used ?? 1,
    powerPerDay: 1,
    description:
      'Somebody else\u0027s bench, bought out of a workshop that shut. The top is scarred and ' +
      'one leg has been packed up with a wedge, but it holds a vice and it holds a cabinet ' +
      'while you glue it. It is a bench, and a bench is the one thing you cannot work without.',
  },
  {
    id: 'budget',
    name: 'Workbench',
    price: 250,
    width: 2,
    depth: 1,
    height: 0.9,
    zoneWidth: 2,
    zoneDepth: 2,
    enduranceFactor: ENDURANCE_BY_CLASS.budget ?? 1,
    powerPerDay: 1,
    description:
      'A new bench at the bottom of the trade range: softwood frame, ply top, a front vice that ' +
      'locks square. It will take everything a one man shop puts on it and it is what most ' +
      'workshops have four of.',
  },
  {
    id: 'standard',
    name: 'Standard workbench',
    price: 450,
    width: 2,
    depth: 1,
    height: 0.9,
    zoneWidth: 2,
    zoneDepth: 2,
    enduranceFactor: ENDURANCE_BY_CLASS.standard ?? 1,
    powerPerDay: 1,
    description:
      'Beech top, two vices and a row of dog holes down it, so a carcass can be held square ' +
      'while it is screwed. The clamping is what saves the minutes, not the timber.',
  },
  {
    id: 'pro',
    name: 'Professional workbench',
    price: 900,
    width: 2,
    depth: 1,
    height: 0.9,
    zoneWidth: 2,
    zoneDepth: 2,
    enduranceFactor: ENDURANCE_BY_CLASS.pro ?? 1,
    powerPerDay: 1,
    description:
      'A cabinetmaker\u0027s bench: laminated top, tail vice, an assembly rack under it and power ' +
      'and air brought to the end of it. Everything a man needs is within reach of where he is ' +
      'standing, which is where the time goes in an assembly.',
  },
  {
    id: 'industrial',
    name: 'Industrial assembly bench',
    price: 2200,
    width: 3,
    depth: 1,
    height: 0.9,
    zoneWidth: 3,
    zoneDepth: 2,
    enduranceFactor: ENDURANCE_BY_CLASS.industrial ?? 1,
    powerPerDay: 2,
    description:
      'A three metre assembly station on a steel frame, with a roller bed at one end and clamps ' +
      'built into the top. A full height wardrobe can be built on it lying down and stood up ' +
      'without carrying it anywhere.',
  },
];

/** The five classes of sheet rack. Prices and capacities are Piotr's table; the footprints and
 *  the zones are his too (CLAUDE.md T7 3.6). A rack is not a machine: it has no output and no
 *  bag, and what it has is sheets. */
export const SHEET_RACK_VARIANTS: EquipmentVariant[] = [
  {
    id: 'used',
    name: 'Used sheet rack',
    price: 200,
    width: 2,
    depth: 1,
    height: 1.5,
    zoneWidth: 2,
    zoneDepth: 2,
    sheetCapacity: 30,
    enduranceFactor: ENDURANCE_BY_CLASS.used ?? 1,
    powerPerDay: 1,
    description:
      'An A frame somebody welded up themselves and painted with whatever was left in the tin. ' +
      'It leans a little and it holds thirty sheets, which is a fortnight of a one man shop.',
  },
  {
    id: 'budget',
    name: 'Cheap shelving',
    price: 400,
    width: 2,
    depth: 1,
    height: 1.5,
    zoneWidth: 2,
    zoneDepth: 2,
    sheetCapacity: 50,
    enduranceFactor: ENDURANCE_BY_CLASS.budget ?? 1,
    powerPerDay: 1,
    description:
      'Galvanised A frame shelving, bought new and bolted to the floor. Fifty sheets on edge, ' +
      'which is what a small shop turns over in a month. Nothing can be unloaded without it.',
  },
  {
    id: 'standard',
    name: 'Better shelving',
    price: 900,
    width: 2,
    depth: 1,
    height: 1.8,
    zoneWidth: 2,
    zoneDepth: 2,
    sheetCapacity: 75,
    enduranceFactor: ENDURANCE_BY_CLASS.standard ?? 1,
    powerPerDay: 1,
    description:
      'Heavier uprights and a deeper foot, so the sheets stand nearer vertical and take less ' +
      'floor. Seventy five sheets, and it will not walk when a full sheet is pulled off it.',
  },
  {
    id: 'pro',
    name: 'Cantilever rack',
    price: 1800,
    width: 3,
    depth: 1,
    height: 2,
    zoneWidth: 3,
    zoneDepth: 2,
    sheetCapacity: 110,
    enduranceFactor: ENDURANCE_BY_CLASS.pro ?? 1,
    powerPerDay: 1,
    description:
      'A proper cantilever rack with labelled bays, so the board you want is not behind the ' +
      'three you do not. A hundred and ten sheets, and the material stops being a daily row.',
  },
  {
    id: 'industrial',
    name: 'Industrial rack',
    price: 4500,
    width: 4,
    depth: 1,
    height: 2.2,
    zoneWidth: 4,
    zoneDepth: 2,
    sheetCapacity: 160,
    enduranceFactor: ENDURANCE_BY_CLASS.industrial ?? 1,
    powerPerDay: 1,
    description:
      'Four metres of bolted steel rated for a full pack of board. A hundred and sixty sheets ' +
      'means buying by the pack, which is where the material price actually falls.',
  },
];

/** How many men's hand tool sets each class of tool cabinet holds
 *  [PIOTR, 19.09: "weak 1, middle 1, then doubling: 2, 4, 8"]. This number is what a class of
 *  cabinet is *for*: the hiring gate and the hand tool set count the free slots of the hall, which
 *  is the sum of these less the sets already bought (CLAUDE.md T22 2.12). */
export const TOOL_CABINET_SLOTS: Record<string, number> = {
  used: 1,
  budget: 1,
  standard: 2,
  pro: 4,
  industrial: 8,
};

/** The five classes of tool cabinet (PIOTR, 19.09; CLAUDE.md T22 2.12).
 *
 *  The footprints and the heights are the pictures': the art side drew the five on 19.09, each in
 *  four true quarter turns, and the picture is the fact (the pack's README;
 *  docs/art/REQUESTS-T22.md 1). Used and budget are a metre square at 112 by 112, the standard two
 *  metres at 160 by 136, the pro two metres and 1.8 high at 160 by 175, the industrial three metres
 *  and 2 high at 208 by 208. Every class states its own working zone, which is its own footprint:
 *  the family's is the standard's two metres and a 1 by 1 cabinet must not reserve it (the
 *  arithmetic against a wider zone is in the comment beside the spec).
 *
 *  The prices double up the ladder from the standard's 350, which is the one price the family had
 *  before tonight [TUNE; PIOTR: "doubling"]. The power a day is the sheet rack's 1, which is what
 *  every class of storage in the catalogue carries: nothing reads it, because only a machine and
 *  the extraction draw power (`poweredMachines`), and every class in the game states a figure
 *  above nought (`tests/engine/variants.test.ts`). */
export const TOOL_CABINET_VARIANTS: EquipmentVariant[] = [
  {
    id: 'used',
    name: 'Used tool cabinet',
    price: 90,
    width: 1,
    depth: 1,
    height: 1,
    zoneWidth: 1,
    zoneDepth: 1,
    enduranceFactor: ENDURANCE_BY_CLASS.used ?? 1,
    powerPerDay: 1,
    description:
      'A second hand steel cabinet with two doors and a drawer that sticks. It holds one man\u0027s ' +
      'hand tools and a hand bander on top of them, and it cost ninety pounds because somebody ' +
      'wanted it out of their way.',
  },
  {
    id: 'budget',
    name: 'Tool cabinet',
    price: 175,
    width: 1,
    depth: 1,
    height: 1,
    zoneWidth: 1,
    zoneDepth: 1,
    enduranceFactor: ENDURANCE_BY_CLASS.budget ?? 1,
    powerPerDay: 1,
    description:
      'A new metre cabinet, bought off the shelf. One man\u0027s tools, a shelf that stays where it ' +
      'is put, and a lock that works: the cheapest thing in the catalogue that lets you take ' +
      'somebody on.',
  },
  {
    id: 'standard',
    name: 'Double tool cabinet',
    price: 350,
    width: 2,
    depth: 1,
    height: 1,
    zoneWidth: 2,
    zoneDepth: 1,
    enduranceFactor: ENDURANCE_BY_CLASS.standard ?? 1,
    powerPerDay: 1,
    description:
      'Two metres of drawers and doors with a bench top over them, which is what most workshops ' +
      'stand along the back wall. Two men keep their sets in one of these and nobody argues about ' +
      'whose chisel it is.',
  },
  {
    id: 'pro',
    name: 'Tool wall',
    price: 700,
    width: 2,
    depth: 1,
    height: 1.8,
    zoneWidth: 2,
    zoneDepth: 1,
    enduranceFactor: ENDURANCE_BY_CLASS.pro ?? 1,
    powerPerDay: 1,
    description:
      'A full height tool wall: drawers below, doors above, and four men\u0027s sets in it with room ' +
      'for the hand banders. It takes no more floor than the double one and holds twice as much.',
  },
  {
    id: 'industrial',
    name: 'Tool store',
    price: 1400,
    width: 3,
    depth: 1,
    height: 2,
    zoneWidth: 3,
    zoneDepth: 1,
    enduranceFactor: ENDURANCE_BY_CLASS.industrial ?? 1,
    powerPerDay: 1,
    description:
      'Three metres of shop fitted storage, floor to over head height, with eight men\u0027s sets in ' +
      'it and a place for everything. A crew of eight wants one of these and not eight cabinets ' +
      'along the wall.',
  },
];

/** The five classes of edgebander. The first two are hand tools kept in a tool cabinet and used
 *  at the bench, and they never queue; the other three stand on the floor, want extraction, and
 *  take one man at a time like any other machine (CLAUDE.md T7 3.6). */
export const EDGEBANDER_VARIANTS: EquipmentVariant[] = [
  {
    id: 'used',
    name: 'Used hand edgebander',
    price: 500,
    width: 1,
    depth: 1,
    height: 0.5,
    zoneWidth: 0,
    zoneDepth: 0,
    requires: [TOOL_CABINET_ID],
    enduranceFactor: ENDURANCE_BY_CLASS.used ?? 1,
    powerPerDay: 1,
    description:
      'A bench top hand bander that has been round the trade twice. The glue pot runs hot and ' +
      'the trimmer wants watching, so the edges need more cleaning up than they should.',
  },
  {
    id: 'budget',
    name: 'Hand edgebander',
    price: 900,
    width: 1,
    depth: 1,
    height: 0.5,
    zoneWidth: 0,
    zoneDepth: 0,
    requires: [TOOL_CABINET_ID],
    enduranceFactor: ENDURANCE_BY_CLASS.budget ?? 1,
    powerPerDay: 1,
    description:
      'A new hand bander that lives in a tool cabinet and comes out to the bench. It edges a ' +
      'kitchen\u0027s worth of parts a day without complaining, and two men can be using one each.',
  },
  {
    id: 'standard',
    name: 'Floor edgebander',
    price: 7500,
    width: 3,
    depth: 1,
    height: 1.2,
    zoneWidth: 5,
    zoneDepth: 3,
    requires: [],
    requiresOneOf: ['extractor', 'dustSystem', 'flexiSystem'],
    enduranceFactor: ENDURANCE_BY_CLASS.standard ?? 1,
    powerPerDay: 4,
    description:
      'A single sided floor machine with a glue pot, a pressure roller and an end trimmer. The ' +
      'parts go in one end and come out banded, which is a different job from standing at a ' +
      'bench with an iron. It takes one man at a time and it wants extraction on it.',
  },
  {
    id: 'pro',
    name: 'Professional edgebander',
    price: 16000,
    width: 3,
    depth: 1,
    height: 1.3,
    zoneWidth: 5,
    zoneDepth: 3,
    requires: [],
    requiresOneOf: ['extractor', 'dustSystem', 'flexiSystem'],
    enduranceFactor: ENDURANCE_BY_CLASS.pro ?? 1,
    powerPerDay: 5,
    description:
      'Pre milling, glue, trim, scrape and buff in one pass, so the edge comes off the machine ' +
      'finished and nobody stands over it with a block. It holds its settings between batches.',
  },
  {
    id: 'industrial',
    name: 'Industrial edgebander',
    price: 32000,
    width: 4,
    depth: 1,
    height: 1.4,
    zoneWidth: 6,
    zoneDepth: 3,
    requires: [],
    requiresOneOf: ['extractor', 'dustSystem', 'flexiSystem'],
    enduranceFactor: ENDURANCE_BY_CLASS.industrial ?? 1,
    powerPerDay: 6,
    description:
      'A production bander with a return conveyor, meant to run all day with one man loading ' +
      'it. It is more machine than most workshops need and it pays for itself in a shop that ' +
      'is never short of work.',
  },
];

/** The five classes of extractor. The footprints and the heights are Piotr's table of
 *  CLAUDE.md T10 3.4 and the art side has drawn every one of them at exactly that size; the zone
 *  is the footprint, because an extractor is stood against a wall and nobody works round it. The
 *  prices are `[TUNE]` 400 / 600 / 1,400 / 3,200 / 7,500, and the budget one keeps the 600 the
 *  single class of Turns 1 to 9 cost. What each one pulls is in `EXTRACTION_CAPACITY`, in m3/h;
 *  the endurance factors are the saw's ladder, as 3.4 asks, and the bags each class holds are in
 *  `EXTRACTOR_BAGS` (CLAUDE.md T12 2.3). */
export const EXTRACTOR_VARIANTS: EquipmentVariant[] = [
  {
    id: 'used',
    name: 'Used extractor',
    price: 400,
    width: 1,
    depth: 1,
    height: 2,
    zoneWidth: 1,
    zoneDepth: 1,
    enduranceFactor: ENDURANCE_BY_CLASS.used ?? 1,
    powerPerDay: 2,
    description:
      'A single bag extractor on castors that somebody else wore out first. The impeller is ' +
      'chipped and the bag has been patched, and it pulls about as much as a good vacuum. It is ' +
      'extraction, which is what the law and the machines ask for, and it is nothing more.',
  },
  {
    id: 'budget',
    name: 'Extractor',
    price: 600,
    width: 1,
    depth: 1,
    height: 2,
    zoneWidth: 1,
    zoneDepth: 1,
    enduranceFactor: ENDURANCE_BY_CLASS.budget ?? 1,
    powerPerDay: 3,
    description:
      'A new single bag extractor, wheeled from machine to machine on a length of hose. It ' +
      'clears one saw and it does not clear two, which is what the sums under the hall say the ' +
      'moment a second man starts cutting.',
  },
  {
    id: 'standard',
    name: 'Twin bag extractor',
    price: 1400,
    width: 2,
    depth: 1,
    height: 2,
    zoneWidth: 2,
    zoneDepth: 1,
    enduranceFactor: ENDURANCE_BY_CLASS.standard ?? 1,
    powerPerDay: 5,
    description:
      'Two bags and a bigger impeller on a steel frame: the extractor a two man shop settles on. ' +
      'It will hold a saw and a bander at once, and it is emptied half as often as a single bag.',
  },
  {
    id: 'pro',
    name: 'Four bag extractor',
    price: 3200,
    width: 3,
    depth: 1,
    height: 2.5,
    zoneWidth: 3,
    zoneDepth: 1,
    enduranceFactor: ENDURANCE_BY_CLASS.pro ?? 1,
    powerPerDay: 8,
    description:
      'Four bags, a cartridge filter and three metres of machine along the wall. It keeps a ' +
      'crew of four out of the dust band, and it is the last thing before a central system.',
  },
  {
    id: 'industrial',
    name: 'Industrial extractor',
    price: 7500,
    width: 5,
    depth: 1,
    height: 2.5,
    zoneWidth: 5,
    zoneDepth: 1,
    enduranceFactor: ENDURANCE_BY_CLASS.industrial ?? 1,
    powerPerDay: 14,
    description:
      'Ten bags on a five metre frame, three phase, and enough pull for every machine in a ' +
      'twenty metre hall at once. It is a central system in all but the ducting.',
  },
];

/** The five classes of compressor. Footprints, heights, bar, litres a minute and endurance are
 *  Piotr's tables of CLAUDE.md T10 3.2 and 3.4, and the art is drawn at exactly these sizes; the
 *  prices are `[TUNE]` 300 / 1,200 / 3,500 / 9,000 / 22,000. What each one gives is in
 *  `COMPRESSOR_AIR`; how long it runs before it gives up is in `ENDURANCE_MINUTES_BY_CLASS`,
 *  because a compressor's life is written in running minutes and not in the hours of a bench
 *  machine. The used and the budget one are still light enough for two men to carry
 *  (`LIGHT_CLASSES`, CLAUDE.md T8 3.4). */
export const COMPRESSOR_VARIANTS: EquipmentVariant[] = [
  {
    id: 'used',
    name: 'Used compressor',
    price: 300,
    width: 1,
    depth: 1,
    height: 1,
    zoneWidth: 1,
    zoneDepth: 1,
    enduranceFactor: ENDURANCE_BY_CLASS.used ?? 1,
    powerPerDay: 2,
    description:
      'A little direct drive compressor off a site, loud enough to talk over and hot after ten ' +
      'minutes. Eight bar and a hundred and fifty litres a minute: a nailer and a blow gun, and ' +
      'not both at once for long.',
  },
  {
    id: 'budget',
    name: 'Compressor',
    price: 1200,
    width: 1,
    depth: 1,
    height: 1,
    zoneWidth: 1,
    zoneDepth: 1,
    enduranceFactor: ENDURANCE_BY_CLASS.budget ?? 1,
    powerPerDay: 3,
    description:
      'A belt driven receiver on wheels, eight bar and two hundred and fifty litres a minute. It ' +
      'keeps two joiners in nails and drivers all day and it will not run a floor bander.',
  },
  {
    id: 'standard',
    name: 'Workshop compressor',
    price: 3500,
    width: 2,
    depth: 1,
    height: 1.5,
    zoneWidth: 2,
    zoneDepth: 1,
    enduranceFactor: ENDURANCE_BY_CLASS.standard ?? 1,
    powerPerDay: 6,
    description:
      'Ten bar off a two hundred litre receiver, four hundred and fifty litres a minute. This is ' +
      'the first compressor that will hold a floor edgebander and a bench at the same time.',
  },
  {
    id: 'pro',
    name: 'Professional compressor',
    price: 9000,
    width: 2,
    depth: 1,
    height: 1.5,
    zoneWidth: 2,
    zoneDepth: 1,
    enduranceFactor: ENDURANCE_BY_CLASS.pro ?? 1,
    powerPerDay: 10,
    description:
      'A screw compressor: eleven hundred litres a minute at ten bar, quiet enough to stand in ' +
      'the hall, and built to run all day rather than to start and stop.',
  },
  {
    id: 'industrial',
    name: 'Industrial compressor',
    price: 22000,
    width: 2,
    depth: 2,
    height: 2.5,
    zoneWidth: 2,
    zoneDepth: 2,
    enduranceFactor: ENDURANCE_BY_CLASS.industrial ?? 1,
    powerPerDay: 20,
    description:
      'Thirteen bar and two thousand three hundred litres a minute, with a refrigerant dryer ' +
      'built into the cabinet. It runs a CNC, a booth and a hall of benches and never notices.',
  },
];

/** What each class of extraction pulls, in cubic metres an hour (PIOTR's bands, CLAUDE.md
 *  T10 3.1). One bag is a thousand, two are two thousand, four are three thousand six hundred and
 *  ten are eight thousand; a central system is twelve thousand and a flexi one fifteen. Several
 *  extractors in one hall add up: the hall is one duct run, however many fans are on it. */
export const EXTRACTION_CAPACITY: Record<string, Record<string, number>> = {
  extractor: { used: 1000, budget: 1000, standard: 2000, pro: 3600, industrial: 8000 },
  dustSystem: { standard: 12000 },
  flexiSystem: { standard: 15000 },
};

/** What each class of machine pulls out of the air while a worker is standing at it, in cubic
 *  metres an hour (PIOTR's bands, CLAUDE.md T10 3.1). The ladders are written out in full even
 *  where the family has one class tonight, so the figures are here the day the classes land. The
 *  two hand classes of the edgebander want none: they are used at a bench. The spray booth has
 *  extraction of its own and is not on this table at all. */
export const EXTRACTION_DEMAND: Record<string, Record<string, number>> = {
  tableSaw: { used: 800, budget: 900, standard: 1100, pro: 1400, industrial: 2200 },
  edgebander: { used: 0, budget: 0, standard: 1400, pro: 1800, industrial: 2400 },
  thicknesser: { used: 1200, budget: 1300, standard: 1500, pro: 1700, industrial: 1800 },
  solidWoodTools: { used: 1100, budget: 1200, standard: 1300, pro: 1400, industrial: 1500 },
  // The two classes the CNC gained in Turn 13, and the spindle moulder's whole ladder [TUNE]
  // (CLAUDE.md T13 3.12, 3.13).
  cnc: { used: 1400, budget: 1500, standard: 1600, pro: 2000, industrial: 2400 },
  spindleMoulder: { used: 900, budget: 1000, standard: 1300, pro: 1600, industrial: 2200 },
};

/** Piotr's margin on the extraction: the sums have to leave a fifth of the fan spare, so a hall
 *  may be worked to 0.83 of what it pulls and no further (PIOTR: 20% margin; CLAUDE.md T10 3.1). */
export const EXTRACTION_MARGIN = 0.83;
/** What a minute of under extraction does. The dust rises at the same 3x a broken extractor makes
 *  it rise at (Turn 2 3.9), and every minute of production in the hall is worth 0.30 less
 *  (PIOTR, CLAUDE.md T10 3.1). No machine stops. */
export const UNDER_EXTRACTION_DUST_MULTIPLIER = 3;
export const UNDER_EXTRACTION_OUTPUT_PENALTY = 0.3;
/** A job made in a hall that was under extracted for more than a tenth of its own production
 *  minutes loses a point of rating when it is delivered: the client can see the dust on it
 *  [TUNE] (CLAUDE.md T10 3.1). */
export const DUSTY_JOB_SHARE = 0.1;
export const DUSTY_JOB_RATING = 1;

/** What a compressor gives: the pressure at the outlet and the free air it will make, a minute
 *  (PIOTR's bands from the trade, CLAUDE.md T10 3.2). A machine that wants more bar than its
 *  compressor gives cannot run at all; litres are a sum over everything drawing on it. */
export const COMPRESSOR_AIR: Record<string, { bar: number; litres: number }> = {
  used: { bar: 8, litres: 150 },
  budget: { bar: 8, litres: 250 },
  standard: { bar: 10, litres: 450 },
  pro: { bar: 10, litres: 1100 },
  industrial: { bar: 13, litres: 2300 },
};

/** What a machine wants of the air while it runs: the pressure it will not start under and the
 *  free air it draws, a minute (PIOTR's bands from the trade, CLAUDE.md T10 3.2). The ladders are
 *  written out in full even where the family has one class tonight. The two hand classes of the
 *  edgebander run on no air at all; the solid wood press is later. */
export const AIR_DEMAND: Record<string, Record<string, { bar: number; litres: number }>> = {
  edgebander: {
    standard: { bar: 7, litres: 250 },
    pro: { bar: 7, litres: 350 },
    industrial: { bar: 10, litres: 500 },
  },
  // Every class of CNC wants the same air as the standard one, and every booth the same as the
  // standard booth: the classes of Turn 13 change the speed and the price, not the hose [TUNE].
  cnc: {
    used: { bar: 6.5, litres: 650 },
    budget: { bar: 6.5, litres: 650 },
    standard: { bar: 6.5, litres: 650 },
    pro: { bar: 6.5, litres: 650 },
    industrial: { bar: 6.5, litres: 650 },
  },
  // The gun itself is at 4 bar; the booth wants 7 at the wall (PIOTR).
  sprayBooth: {
    used: { bar: 7, litres: 350 },
    budget: { bar: 7, litres: 350 },
    standard: { bar: 7, litres: 350 },
    pro: { bar: 7, litres: 350 },
    industrial: { bar: 7, litres: 350 },
  },
};

/** What one man at a bench draws for his nailer and his driver, and what one man doing pneumatic
 *  sanding at Finishing draws, a minute (PIOTR, CLAUDE.md T10 3.2). */
export const AIR_BENCH_DEMAND = { bar: 6, litres: 30 };
export const AIR_SANDING_DEMAND = { bar: 6, litres: 200 };

/** The trade's diversity factor: nothing on the line draws its full figure all the time, so the
 *  sum is worked at 0.6 of it (PIOTR: the trade's 0.5 to 0.6). And the pipe is worked to 0.85 of
 *  what the compressor makes, which is the headroom a receiver needs (CLAUDE.md T10 3.2). */
export const AIR_DIVERSITY = 0.6;
export const AIR_HEADROOM = 0.85;
/** What the hall says while there is no air for the benches: no compressor at all, or the one the
 *  hoses are on short of litres. Turn 11 let a man screw a carcass together by hand at 0.67 and
 *  said so here; from Turn 23 there is no bench work without air and the bench stands still
 *  [PIOTR, 20.09] (CLAUDE.md T23 2.7). */
export const NO_AIR_LINE = 'No air: the benches stand still';

/** What every pneumatic consumer on a compressor that is short of litres runs at, for that minute
 *  (PIOTR, CLAUDE.md T10 3.2). A man at a bench is not one of them from Turn 23: he does not run
 *  slow on short air, he stands (CLAUDE.md T23 2.7). */
export const LOW_AIR_FACTOR = 0.7;
/** A spray booth on wet air still runs, and the Finishing takes half as long again over it and
 *  the job loses a point of rating for the defects in the finish [TUNE] (CLAUDE.md T10 3.3). */
export const WET_AIR_FINISH_FACTOR = 1.5;
export const WET_AIR_FINISH_RATING = 1;

/** A compressor's life is written in the minutes it actually runs, not in the hours of a bench
 *  machine (PIOTR, CLAUDE.md T10 3.2). The one table that overrides the family's hours and the
 *  class ladder, so `enduranceHoursFor` has one answer and not two. */
export const ENDURANCE_MINUTES_BY_CLASS: Record<string, Record<string, number>> = {
  compressor: { used: 60000, budget: 120000, standard: 200000, pro: 400000, industrial: 800000 },
};

/** The class of compressor that comes with a dryer in the cabinet (PIOTR, CLAUDE.md T10 3.3). */
export const COMPRESSOR_WITH_DRYER = 'industrial';

/** The catalogue ids of the air side, named once so nothing spells them twice. */
export const COMPRESSOR = 'compressor';
export const AIR_DRYER = 'airDryer';
/** What a dryer costs [TUNE] (CLAUDE.md T10 3.3). */
export const AIR_DRYER_PRICE = 1500;

/** The five classes of thicknesser (CLAUDE.md T13 3.12). Prices are [TUNE]; the output, the endurance
 *  and the power follow the saw's ladder; the extraction demand is Piotr's Turn 10 band. */
export const THICKNESSER_VARIANTS: EquipmentVariant[] = [
  {
    id: 'used',
    name: 'Used thicknesser',
    price: 900,
    width: 2,
    depth: 1,
    height: 1,
    zoneWidth: 4,
    zoneDepth: 2,
    enduranceFactor: 0.25,
    powerPerDay: 3,
    description:
      'A planer thicknesser somebody else ran hard. The tables are scored and the cutter ' +
      'block has been ground once too often, but it still takes a board down to size. It ' +
      'rumbles.',
  },
  {
    id: 'budget',
    name: 'Budget thicknesser',
    price: 2500,
    width: 2,
    depth: 1,
    height: 1,
    zoneWidth: 4,
    zoneDepth: 2,
    enduranceFactor: 1,
    powerPerDay: 3,
    description:
      'A new machine at the bottom of the trade range: cast tables, a two knife block and a ' +
      'hand wheel for the height. It planes oak all day if the knives are kept sharp.',
  },
  {
    id: 'standard',
    name: 'Standard thicknesser',
    price: 5500,
    width: 2,
    depth: 1,
    height: 1,
    zoneWidth: 4,
    zoneDepth: 2,
    enduranceFactor: 1.2,
    powerPerDay: 4,
    description:
      'The one a working timber shop settles on. Longer tables, a spiral block that leaves ' +
      'less to sand, and an extraction hood that actually pulls the chips off the cutters.',
  },
  {
    id: 'pro',
    name: 'Professional thicknesser',
    price: 11000,
    width: 3,
    depth: 1,
    height: 1,
    zoneWidth: 5,
    zoneDepth: 2,
    enduranceFactor: 1.5,
    powerPerDay: 5,
    description:
      'Built for a shop where the timber runs all week. Powered rise and fall, a digital ' +
      'height stop, and a feed that does not stall on a wide board. It holds its setting ' +
      'between jobs.',
  },
  {
    id: 'industrial',
    name: 'Industrial thicknesser',
    price: 22000,
    width: 3,
    depth: 2,
    height: 1.2,
    zoneWidth: 5,
    zoneDepth: 3,
    enduranceFactor: 2,
    powerPerDay: 7,
    description:
      'A heavy three phase machine with a wide bed and a feed you could lean on. It takes the ' +
      'whole day without complaining and it takes a third off every board that goes through ' +
      'it.',
  },
];

/** The five classes of the timber tool set (CLAUDE.md T13 3.12). Prices [TUNE]; the factors follow
 *  the saw's ladder. */
export const SOLID_WOOD_TOOLS_VARIANTS: EquipmentVariant[] = [
  {
    id: 'used',
    name: 'Used timber tool set',
    price: 800,
    width: 2,
    depth: 1,
    height: 1,
    zoneWidth: 3,
    zoneDepth: 2,
    enduranceFactor: 0.25,
    powerPerDay: 3,
    description:
      'A router table with a tired router, a belt sander that wanders and a rack of sash ' +
      'clamps with the threads half gone. It machines timber, slowly, and it needs coaxing.',
  },
  {
    id: 'budget',
    name: 'Budget timber tool set',
    price: 2200,
    width: 2,
    depth: 1,
    height: 1,
    zoneWidth: 3,
    zoneDepth: 2,
    enduranceFactor: 1,
    powerPerDay: 3,
    description:
      'A new router table, a hand router, a belt sander and a set of clamps: what a workshop ' +
      'buys the first time it takes an oak table on. Everything works and nothing is fast.',
  },
  {
    id: 'standard',
    name: 'Standard timber tool set',
    price: 4500,
    width: 2,
    depth: 1,
    height: 1,
    zoneWidth: 3,
    zoneDepth: 2,
    enduranceFactor: 1.2,
    powerPerDay: 4,
    description:
      'A proper router table with a fence that locks square, a dust hood on the sander and ' +
      'enough clamps to glue two tops at once. It saves a few minutes on every piece.',
  },
  {
    id: 'pro',
    name: 'Professional timber tool set',
    price: 9000,
    width: 3,
    depth: 1,
    height: 1,
    zoneWidth: 4,
    zoneDepth: 2,
    enduranceFactor: 1.5,
    powerPerDay: 5,
    description:
      'A lift and a fence with stops on the router table, a stroke sander, and clamps on a ' +
      'rack of their own. The timber comes off it cleaner, which is less sanding later.',
  },
  {
    id: 'industrial',
    name: 'Industrial timber tool set',
    price: 16000,
    width: 3,
    depth: 2,
    height: 1.2,
    zoneWidth: 5,
    zoneDepth: 3,
    enduranceFactor: 2,
    powerPerDay: 7,
    description:
      'The timber station of a production shop: a router with a power feed, a wide stroke ' +
      'sander and a clamp carrier. It eats oak and it costs more than most small workshops ' +
      'make in a month.',
  },
];

/** The five classes of CNC (CLAUDE.md T13 3.12). The standard one is Piotr's 45,000; the rest of the
 *  prices are [TUNE], and the factors follow the saw's ladder. Every class wants an extractor and dry
 *  air, like the family. */
export const CNC_VARIANTS: EquipmentVariant[] = [
  {
    id: 'used',
    name: 'Used CNC',
    price: 18000,
    width: 3,
    depth: 2,
    height: 1,
    zoneWidth: 5,
    zoneDepth: 4,
    enduranceFactor: 0.25,
    powerPerDay: 8,
    description:
      'A flatbed router that has done ten years in somebody else\u0027s shop. The gantry is ' +
      'true enough and the controller still boots, but the bearings are noisy and it loses a ' +
      'step now and then.',
  },
  {
    id: 'budget',
    name: 'Budget CNC',
    price: 30000,
    width: 3,
    depth: 2,
    height: 1,
    zoneWidth: 5,
    zoneDepth: 4,
    enduranceFactor: 1,
    powerPerDay: 8,
    description:
      'A new machine at the bottom of the range: a full sheet bed, a single spindle and a ' +
      'vacuum table that holds a board if the board is flat. It nests and it drills, and it ' +
      'earns its keep.',
  },
  {
    id: 'standard',
    name: 'Standard CNC',
    price: 45000,
    width: 3,
    depth: 2,
    height: 1,
    zoneWidth: 5,
    zoneDepth: 4,
    enduranceFactor: 1.2,
    powerPerDay: 10,
    description:
      'The machine a sheet workshop grows into: a heavier gantry, a faster spindle and a ' +
      'vacuum that holds an offcut. It cuts and drills a kitchen in the time the saw takes ' +
      'over a wardrobe.',
  },
  {
    id: 'pro',
    name: 'Professional CNC',
    price: 75000,
    width: 4,
    depth: 2,
    height: 1.2,
    zoneWidth: 6,
    zoneDepth: 4,
    enduranceFactor: 1.5,
    powerPerDay: 12,
    description:
      'Built for a shop that nests all day: a drilling block, a labelling printer and a bed ' +
      'that loads while the last sheet is still being cut. It holds its calibration for ' +
      'months.',
  },
  {
    id: 'industrial',
    name: 'Industrial CNC',
    price: 120000,
    width: 4,
    depth: 3,
    height: 1.2,
    zoneWidth: 6,
    zoneDepth: 5,
    enduranceFactor: 2,
    powerPerDay: 16,
    description:
      'A nesting cell with automatic loading, a second spindle and an offload table. It runs ' +
      'a shift with one man watching it, and it costs what a small factory costs.',
  },
];

/** The five classes of spray booth (CLAUDE.md T13 3.12). The standard one is the Turn 1 booth; the
 *  rest of the prices are [TUNE], and the factors follow the saw's ladder. Its own extraction, so it
 *  is on no demand table (CLAUDE.md T10 3.1). */
export const SPRAY_BOOTH_VARIANTS: EquipmentVariant[] = [
  {
    id: 'used',
    name: 'Used spray booth',
    price: 6000,
    width: 3,
    depth: 2,
    height: 1.5,
    zoneWidth: 4,
    zoneDepth: 3,
    enduranceFactor: 0.25,
    powerPerDay: 4,
    description:
      'A dry filter booth out of a closed down shop. The fan pulls, the filters want changing ' +
      'more often than they should, and the lights are dim. It sprays a lacquer finish, ' +
      'slowly.',
  },
  {
    id: 'budget',
    name: 'Budget spray booth',
    price: 11000,
    width: 3,
    depth: 2,
    height: 1.5,
    zoneWidth: 4,
    zoneDepth: 3,
    enduranceFactor: 1,
    powerPerDay: 4,
    description:
      'A new open front booth with a dry filter wall and a fan sized for a small shop. Enough ' +
      'to spray a wardrobe cleanly if the air is dry and the filters are fresh.',
  },
  {
    id: 'standard',
    name: 'Standard spray booth',
    price: 18000,
    width: 3,
    depth: 2,
    height: 1.5,
    zoneWidth: 4,
    zoneDepth: 3,
    enduranceFactor: 1.2,
    powerPerDay: 5,
    description:
      'A proper booth with a deeper filter bank, better lights and a fan that keeps the ' +
      'overspray off the work. The finish comes out cleaner, which is less rubbing down ' +
      'between coats.',
  },
  {
    id: 'pro',
    name: 'Professional spray booth',
    price: 32000,
    width: 4,
    depth: 2,
    height: 1.8,
    zoneWidth: 5,
    zoneDepth: 3,
    enduranceFactor: 1.5,
    powerPerDay: 7,
    description:
      'A pressurised booth with a heated air supply and a drying area behind it. Coats go on ' +
      'faster and dry faster, and a kitchen goes through it in a day.',
  },
  {
    id: 'industrial',
    name: 'Industrial spray booth',
    price: 55000,
    width: 4,
    depth: 3,
    height: 2,
    zoneWidth: 6,
    zoneDepth: 4,
    enduranceFactor: 2,
    powerPerDay: 10,
    description:
      'A spray line with a conveyor, a flash off tunnel and a drying oven. It finishes fronts ' +
      'by the hundred and it wants a building of its own to breathe in.',
  },
];

/** The five classes of spindle moulder, the new family two trades share (CLAUDE.md T13 3.13). Prices
 *  [TUNE: 1,500 to 28,000], footprint 2 by 1 in a 3 by 3 zone [TUNE]; the factors follow the saw's
 *  ladder. */
/** Heights are the pictures' since v33 (the art side's corrected equipment v2, 20.09): the working
 *  top is 1 m, the hoods and the power feeds rise to these, and a height draws the canvas and
 *  nothing else. */
export const SPINDLE_MOULDER_VARIANTS: EquipmentVariant[] = [
  {
    id: 'used',
    name: 'Used spindle moulder',
    price: 1500,
    width: 2,
    depth: 1,
    height: 1.9,
    zoneWidth: 3,
    zoneDepth: 3,
    enduranceFactor: 0.25,
    powerPerDay: 3,
    description:
      'A moulder that has run for years in somebody else\u0027s shop. The spindle is true ' +
      'enough and the fence still locks, but the rise and fall is stiff and the table is ' +
      'scored. It moulds a J profile, carefully.',
  },
  {
    id: 'budget',
    name: 'Budget spindle moulder',
    price: 4000,
    width: 2,
    depth: 1,
    height: 1.85,
    zoneWidth: 3,
    zoneDepth: 3,
    enduranceFactor: 1,
    powerPerDay: 3,
    description:
      'A new machine at the bottom of the trade range: a cast table, a sliding carriage and a ' +
      'fence with two halves that line up if you look at them. It moulds fronts all day.',
  },
  {
    id: 'standard',
    name: 'Standard spindle moulder',
    price: 9000,
    width: 2,
    depth: 1,
    height: 2.25,
    zoneWidth: 3,
    zoneDepth: 3,
    enduranceFactor: 1.2,
    powerPerDay: 4,
    description:
      'The moulder a working shop settles on: a tilting spindle, a power feed on an arm, and ' +
      'an extraction hood that pulls the chips off the cutter. It saves minutes on every ' +
      'front.',
  },
  {
    id: 'pro',
    name: 'Professional spindle moulder',
    price: 16000,
    width: 3,
    depth: 1,
    height: 2.15,
    zoneWidth: 4,
    zoneDepth: 3,
    enduranceFactor: 1.5,
    powerPerDay: 5,
    description:
      'Built for a shop that moulds all week: a digital fence, a quick change spindle and a ' +
      'feed that does not mark the timber. The profile comes off cleaner, which is less ' +
      'sanding.',
  },
  {
    id: 'industrial',
    name: 'Industrial spindle moulder',
    price: 28000,
    width: 3,
    depth: 2,
    height: 2.85,
    zoneWidth: 5,
    zoneDepth: 3,
    enduranceFactor: 2,
    powerPerDay: 7,
    description:
      'A heavy three phase machine with a double spindle and a feed that takes a stack of ' +
      'fronts. It runs a shift on its own and it is where the timber branch of the business ' +
      'starts.',
  },
];

const VARIANTS_BY_FAMILY: Record<string, EquipmentVariant[]> = {
  tableSaw: TABLE_SAW_VARIANTS,
  workbench: WORKBENCH_VARIANTS,
  sheetRack: SHEET_RACK_VARIANTS,
  edgebander: EDGEBANDER_VARIANTS,
  extractor: EXTRACTOR_VARIANTS,
  compressor: COMPRESSOR_VARIANTS,
  thicknesser: THICKNESSER_VARIANTS,
  solidWoodTools: SOLID_WOOD_TOOLS_VARIANTS,
  cnc: CNC_VARIANTS,
  sprayBooth: SPRAY_BOOTH_VARIANTS,
  spindleMoulder: SPINDLE_MOULDER_VARIANTS,
  // The cabinet is a family of five from Turn 22, and what a class is for is how many men's hand
  // tools it holds (PIOTR, 19.09; CLAUDE.md T22 2.12).
  toolCabinet: TOOL_CABINET_VARIANTS,
};

const BASE_SPEC = {
  // Nothing comes back in the owner's hands any more: hand tools, cabinets, lockers, seats and
  // the office furniture are ordered like everything else and come the next working day
  // (PIOTR, 13.09; CLAUDE.md T9 3.1).
  deliveryDays: 1,
  sharedTab: null as EquipmentTab | null,
  usedOn: null as MaterialKind | null,
  sheetCapacity: 0,
  minReputation: REPUTATION_MIN,
  locked: false,
  lockReason: '',
  perWorker: false,
  requires: [] as string[],
  requiresOneOf: [] as string[],
  height: 1,
};

/** A catalogue line before its variants are worked out. A family that says nothing about its
 *  working zone reserves exactly what it stands on (CLAUDE.md T7 3.3). */
type SpecDraft = Omit<EquipmentSpec, 'variants' | 'enduranceHours' | 'zoneWidth' | 'zoneDepth'> & {
  zoneWidth?: number;
  zoneDepth?: number;
};

/** Every family gets its variants and its endurance here, so the table above stays a table.
 *  A family with nothing in VARIANTS_BY_FAMILY has the one standard variant, at the Turn 1 price
 *  and with every factor at 1.0 (CLAUDE.md T3 3.5). */
function withVariants(draft: SpecDraft): EquipmentSpec {
  const base = VARIANTS_BY_FAMILY[draft.id] ?? [
    {
      id: STANDARD_VARIANT,
      name: draft.name,
      price: draft.price,
      enduranceFactor: 1,
      powerPerDay: POWER_PER_MACHINE_DAILY,
      description: draft.effect,
    },
  ];
  // Every class the catalogue hands out carries its own wait, off the class ladder where the
  // family has one and off the family's own line where it has not (CLAUDE.md T8 3.2).
  const ladder = DELIVERY_DAYS_BY_CLASS[draft.id];
  const variants = base.map((variant) => ({
    ...variant,
    deliveryDays: ladder?.[variant.id] ?? draft.deliveryDays,
  }));
  const cheapest = variants[0];
  return {
    ...draft,
    zoneWidth: draft.zoneWidth ?? draft.width,
    zoneDepth: draft.zoneDepth ?? draft.depth,
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
    folder: 'Desks',
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
    folder: 'Chairs',
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
    folder: 'Laptops',
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
    // The class ladder above says the rest (PIOTR: 5 to 7 days, up to 25).
    deliveryDays: 5,
    folder: 'Table saws',
    tab: 'sheetMachines',
    name: 'Table saw',
    price: 1800,
    category: 'machine',
    width: 2,
    depth: 1,
    height: 1,
    spriteKey: 'tableSaw',
    usedOn: 'sheet',
    effect: 'Cuts sheets and timber. One man at a time.',
  },
  {
    ...BASE_SPEC,
    id: 'edgebander',
    // The class ladder above says the rest: the hand ones come back with him.
    deliveryDays: 7,
    folder: 'Edgebanders',
    tab: 'sheetMachines',
    name: 'Edgebander',
    price: 500,
    category: 'machine',
    // The two hand classes are kept in a tool cabinet and come out to the bench, so they hold no
    // cell of the floor; the three floor classes stand on it and say their own zone
    // (CLAUDE.md T6 3.5, T7 3.6).
    width: 1,
    depth: 1,
    height: 0.5,
    zoneWidth: 0,
    zoneDepth: 0,
    spriteKey: 'edgebander',
    usedOn: 'sheet',
    effect:
      'Edges sheet goods. The two hand classes live in a tool cabinet; the floor ones take one ' +
      'man at a time and want extraction.',
  },
  {
    ...BASE_SPEC,
    id: 'compressor',
    // Off the shelf, in tomorrow (PIOTR).
    deliveryDays: 1,
    folder: 'Compressors',
    // Air moved in beside the extraction when the tab was renamed "Extraction and air"
    // (CLAUDE.md T10 3.3): a compressor is not a hand tool, it is what the hand tools run on.
    tab: 'extraction',
    name: 'Compressor',
    price: 300,
    category: 'machine',
    width: 1,
    depth: 1,
    height: 1,
    spriteKey: 'compressor',
    // A hall may have several, and every machine draws from the one it is assigned to
    // (CLAUDE.md T10 3.2).
    effect:
      'Air for nailers, drivers, sanding, a floor bander, a CNC and a booth. Every consumer is ' +
      'assigned to one compressor and draws from that one only.',
  },
  {
    ...BASE_SPEC,
    id: 'airDryer',
    // Off the shelf with the compressors (PIOTR).
    deliveryDays: 1,
    folder: 'Air dryers',
    tab: 'extraction',
    name: 'Air dryer',
    price: AIR_DRYER_PRICE,
    category: 'extraction',
    width: 1,
    depth: 1,
    height: 1.5,
    spriteKey: 'airDryer',
    // One per compressor, so a hall with three compressors may want three (CLAUDE.md T10 3.3).
    effect:
      'Takes the water out of the line of the compressor it is fitted to. A CNC will not run on ' +
      'wet air at all, and a spray booth on wet air takes half as long again over the finish ' +
      'and loses the job a point of rating. The industrial compressor has one built in.',
  },
  {
    ...BASE_SPEC,
    id: 'extractor',
    // Off the shelf, in tomorrow (PIOTR).
    deliveryDays: 1,
    folder: 'Extractors',
    tab: 'extraction',
    name: 'Extractor',
    price: 400,
    category: 'extraction',
    width: 1,
    depth: 1,
    height: 2,
    spriteKey: 'extractor',
    // Several add up: what the hall pulls is the sum of every fan in it (CLAUDE.md T10 3.1).
    effect:
      'Serves every machine. Without it there are no bags. What it pulls is in cubic metres an ' +
      'hour, and the machines at work have to add up to less than it. Can break down.',
  },
  {
    ...BASE_SPEC,
    id: 'workbench',
    // Every class of bench is in tomorrow (PIOTR).
    deliveryDays: 1,
    folder: 'Benches',
    tab: 'storage',
    name: 'Workbench',
    price: 120,
    category: 'bench',
    width: 2,
    depth: 1,
    height: 0.9,
    zoneWidth: 2,
    zoneDepth: 2,
    spriteKey: 'workbench',
    perWorker: true,
    effect:
      'One per worker, and the assembly of every job is done at one. The unit has a fixed ' +
      'number of bench slots.',
  },
  {
    ...BASE_SPEC,
    id: 'sheetRack',
    // The class ladder above says the rest.
    deliveryDays: 3,
    folder: 'Racks',
    tab: 'storage',
    name: 'Sheet rack',
    price: 200,
    category: 'storage',
    width: 2,
    depth: 1,
    height: 1.5,
    zoneWidth: 2,
    zoneDepth: 2,
    spriteKey: 'sheetRack',
    sheetCapacity: 50,
    // The better shelving of Turns 1 to 6 is a class of this family now, not a family of its own
    // (CLAUDE.md T7 3.6). More than one rack may stand in the hall and the sheets add up.
    effect:
      'Holds sheets on edge, thirty to a hundred and sixty by its class. Nothing can be ' +
      'unloaded without somewhere to put it.',
  },
  {
    ...BASE_SPEC,
    id: 'toolCabinet',
    folder: 'Tool cabinets',
    tab: 'storage',
    name: 'Tool cabinet',
    price: 350,
    category: 'storage',
    // The family's own footprint is the standard class's two metres; every class states its own,
    // because the art side drew five of them on 19.09 and the picture is the fact
    // [PIOTR's art; CLAUDE.md T21 2.13, T22 2.12]. `TOOL_CABINET_VARIANTS` has the five.
    //
    // The zone of every class is its own footprint, and Turn 21's brief asked for a `zone 3 by 2`
    // and tagged that figure [TUNE]. It is still not built, for two reasons, both of them
    // arithmetic and neither of them a preference. First, the zone is what nothing else may stand
    // on: a 3 by 2 zone at the cabinet row's y 3 reaches down into y 4, which is the workbench row
    // (BENCH_SLOT_LAYOUT), so the day one hall could not be laid out at all, and it reaches 3 cells
    // across, so no two cabinets could stand side by side in a row that holds seven of them.
    // Second, the zone is what the crew's floor limit is measured against (`freeFloorM2`), so six
    // cabinets at 6 cells instead of 2 would quietly take 24 m2 off the free floor and cost the
    // player a man he has today.
    // If Piotr wants the metre of standing room in front of a cabinet drawn, it is a zone line on
    // each of the five classes plus a new cabinet row, and the crew limit moves with it.
    //
    // `perWorker` is gone from tonight: what a workshop needs is not one cabinet a man but a free
    // slot a man, and a class holds one, two, four or eight of them (PIOTR, 19.09;
    // CLAUDE.md T22 2.12). `freeToolSlots` in `src/engine/staff.ts` is the count everything reads.
    width: 2,
    depth: 1,
    height: 1,
    spriteKey: 'toolCabinet',
    effect:
      'Holds the hand tool sets of one man to eight by its class, and the hand edgebander with ' +
      'them. Every worker needs a slot in one and so do you.',
  },
  {
    ...BASE_SPEC,
    id: 'locker',
    folder: 'Lockers',
    tab: 'storage',
    name: 'Locker',
    price: 80,
    category: 'welfare',
    width: 1,
    depth: 1,
    height: 1,
    spriteKey: 'locker',
    perWorker: true,
    effect: 'One per worker.',
  },
  {
    ...BASE_SPEC,
    id: 'handToolSet',
    folder: 'Hand tool sets',
    tab: 'handTools',
    name: 'Hand tool set for a worker',
    price: 400,
    category: 'tools',
    width: 1,
    depth: 1,
    height: 1,
    // A set lives in the cabinet it is bought for and is not a thing on the hall from Turn 23: it
    // holds no cell, it is on no slot of the floor and nothing is drawn for it, the same reading
    // the hand classes of the edgebander have had since Turn 6 (PIOTR, 20.09;
    // CLAUDE.md T23 2.6, T6 3.5).
    zoneWidth: 0,
    zoneDepth: 0,
    spriteKey: 'handToolSet',
    perWorker: true,
    requires: ['toolCabinet'],
    effect: 'One per worker, bought by the owner. Kept in his tool cabinet.',
  },
  {
    ...BASE_SPEC,
    id: 'van',
    // Three days for a van (PIOTR).
    deliveryDays: 3,
    folder: 'Vans',
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
    // Five days for a forklift (PIOTR).
    deliveryDays: 5,
    folder: 'Forklifts',
    tab: 'handling',
    name: 'Forklift',
    price: 6000,
    category: 'vehicle',
    width: 1,
    depth: 1,
    height: 1,
    spriteKey: 'forklift',
    effect: 'A load of sheets is off the lorry in about fifteen minutes.',
  },
  {
    ...BASE_SPEC,
    id: 'palletTruck',
    // Off the shelf, in tomorrow, like the compressors [TUNE].
    deliveryDays: 1,
    folder: 'Pallet trucks',
    tab: 'handling',
    name: 'Pallet truck',
    price: PALLET_TRUCK_PRICE,
    category: 'vehicle',
    width: 1,
    depth: 1,
    height: 1,
    spriteKey: 'palletTruck',
    effect: 'A load of sheets is off the lorry in about thirty minutes instead of forty five.',
  },
  {
    ...BASE_SPEC,
    id: 'forkliftBetter',
    // The five days of the forklift; Piotr named the one family [TUNE].
    deliveryDays: 5,
    folder: 'Better forklifts',
    tab: 'handling',
    name: 'Better forklift',
    price: 12000,
    category: 'vehicle',
    width: 1,
    depth: 1,
    height: 1,
    spriteKey: 'forkliftBetter',
    effect: 'A load of sheets is off the lorry in ten minutes.',
  },
  {
    ...BASE_SPEC,
    id: 'thicknesser',
    // Five days for the solid wood machines (PIOTR).
    deliveryDays: 5,
    folder: 'Thicknessers',
    tab: 'timberMachines',
    name: 'Thicknesser',
    price: 2500,
    category: 'machine',
    width: 2,
    depth: 1,
    height: 1,
    // Infeed and outfeed: a board twice the length of the machine goes through it [TUNE].
    zoneWidth: 4,
    zoneDepth: 2,
    spriteKey: 'thicknesser',
    usedOn: 'solidWood',
    effect: 'Solid wood tools, part 1.',
  },
  {
    ...BASE_SPEC,
    id: 'solidWoodTools',
    // Five days for the solid wood machines (PIOTR).
    deliveryDays: 5,
    folder: 'Timber tool sets',
    tab: 'timberMachines',
    name: 'Planer, router, sander, clamps',
    price: 2200,
    category: 'machine',
    width: 2,
    depth: 1,
    height: 1,
    zoneWidth: 3,
    zoneDepth: 2,
    spriteKey: 'solidWoodTools',
    usedOn: 'solidWood',
    effect: 'Solid wood tools, part 2. With the thicknesser this unlocks solid wood.',
  },
  {
    ...BASE_SPEC,
    id: 'spindleMoulder',
    // The class ladder above says the rest.
    deliveryDays: 7,
    folder: 'Spindle moulders',
    tab: 'sheetMachines',
    // Shared: handleless kitchens with a J profile and shaker fronts need it on the sheet side
    // too (PIOTR; CLAUDE.md T13 3.13).
    sharedTab: 'timberMachines',
    name: 'Spindle moulder',
    price: 1500,
    category: 'machine',
    width: 2,
    depth: 1,
    height: 1,
    zoneWidth: 3,
    zoneDepth: 3,
    spriteKey: 'spindleMoulder',
    effect:
      'Moulds a profile on an edge: the J profile of a handleless kitchen and the fronts of a ' +
      'sprayed one on the sheet side, and every moulding on the timber side. One man at a time.',
  },
  {
    ...BASE_SPEC,
    id: 'cnc',
    // Built to order (PIOTR: a CNC even 45).
    deliveryDays: 45,
    folder: 'CNC machines',
    tab: 'cnc',
    name: 'CNC',
    price: 45000,
    category: 'machine',
    width: 3,
    depth: 2,
    height: 1,
    zoneWidth: 5,
    zoneDepth: 4,
    spriteKey: 'cnc',
    requiresOneOf: ['extractor', 'dustSystem', 'flexiSystem'],
    effect:
      'Cuts and drills a sheet job in one go, in place of the saw and the edgebander, and halves ' +
      'the assembly after it. One man at a time. Timber still goes on the saw.',
  },
  {
    ...BASE_SPEC,
    id: 'cncHead',
    // Twenty days for the tool changer head (PIOTR).
    deliveryDays: 20,
    folder: 'CNC heads',
    tab: 'cnc',
    name: 'CNC tool changer head',
    price: 9000,
    category: 'machine',
    width: 1,
    depth: 1,
    height: 1,
    spriteKey: 'cncHead',
    requires: ['cnc'],
    effect: 'A further 5% out of the CNC\u0027s own stage.',
  },
  {
    ...BASE_SPEC,
    id: 'sprayBooth',
    // Twenty days for a booth (PIOTR).
    deliveryDays: 20,
    folder: 'Spray booths',
    tab: 'spraying',
    name: 'Spray booth',
    price: 18000,
    category: 'machine',
    width: 3,
    depth: 2,
    height: 1.5,
    zoneWidth: 4,
    zoneDepth: 3,
    spriteKey: 'sprayBooth',
    // Unlocked in Turn 11: two products ask for a sprayed finish now (CLAUDE.md T11 3.7).
    effect: 'Unlocks the lacquer finish. Its own extraction, and dry air for a clean finish.',
  },
  {
    ...BASE_SPEC,
    id: 'dustSystem',
    // Twenty five days for a central system (PIOTR).
    deliveryDays: 25,
    folder: 'Central systems',
    tab: 'extraction',
    name: 'Central dust extraction system',
    price: 35000,
    category: 'extraction',
    // Three by two of plant, four metres high, which is the size the art side drew it at. It
    // stands outside on the apron by the shutter, like the van, and draws its ducting along the
    // rear wall (CLAUDE.md T10 3.4).
    width: 3,
    depth: 2,
    height: 4,
    spriteKey: 'dustSystem',
    effect: `No more bags and no breakdown. Waste collection ${DUST_WASTE_MONTHLY} per month.`,
  },
  {
    ...BASE_SPEC,
    id: 'flexiSystem',
    // Twenty five days for a flexi system (PIOTR).
    deliveryDays: 25,
    folder: 'Flexi systems',
    tab: 'extraction',
    name: 'Flexi extraction system',
    price: 50000,
    category: 'extraction',
    // The same plant on the apron as the central system, with flexible ducting on every machine
    // (CLAUDE.md T10 3.4).
    width: 3,
    depth: 2,
    height: 4,
    spriteKey: 'flexiSystem',
    effect:
      'Everything the central system does, and flexible ducting on every machine: move the hall ' +
      'about as often as you like and the reconnection never costs again. Waste collection ' +
      `${DUST_WASTE_MONTHLY} per month.`,
  },
  {
    ...BASE_SPEC,
    id: 'pelletiser',
    // Twenty days for a pelletiser (PIOTR).
    deliveryDays: 20,
    folder: 'Pelletisers',
    tab: 'extraction',
    name: 'Pelletiser',
    price: 15000,
    category: 'extraction',
    // Two by two of machine, two and a half metres high: the size the art side delivered it at.
    // It was 1 by 1 by 1.5 in the engine and the picture drew a third too small for its tile.
    width: 2,
    depth: 2,
    height: 2.5,
    zoneWidth: 3,
    zoneDepth: 3,
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
  // Office first: the desk, the chair, the laptop and the software are what a new game buys
  // before anything else (PIOTR, 13.09). The id stays `computers` so nothing else moves.
  { id: 'computers', label: 'Office' },
  { id: 'sheetMachines', label: 'Sheet machines' },
  { id: 'timberMachines', label: 'Timber machines' },
  { id: 'spraying', label: 'Spraying' },
  { id: 'sanding', label: 'Sanding' },
  { id: 'handTools', label: 'Hand tools' },
  { id: 'extraction', label: 'Extraction and air' },
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

// ---------------------------------------------------------------------------
// The canteen room (CLAUDE.md T23 2.9)
// ---------------------------------------------------------------------------

/** A rectangle on a room's canvas, in the canvas's own pixels, as the art side measures one. */
export interface RoomRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Where the canteen's four regions are on its layers [PIOTR: every figure is the art side's own
 *  measurement of the five layers it delivered, copied from docs/mockups/t23/canteen-regions.json
 *  and typed nowhere else]. The canvas is the office's, `OFFICE_CANVAS`, 1672 by 941: one room
 *  view, one canvas, and the canteen is built on the office's machinery (CLAUDE.md T23 2.9).
 *
 *  The door goes back to the hall, the lockers open the team page, and the kitchen and the table
 *  do nothing yet. */
export const CANTEEN_REGIONS: Record<'door' | 'lockers' | 'kitchen' | 'table', RoomRect> = {
  door: { x: 1390, y: 0, w: 282, h: 941 },
  lockers: { x: 27, y: 170, w: 710, h: 500 },
  kitchen: { x: 657, y: 123, w: 225, h: 433 },
  table: { x: 12, y: 690, w: 310, h: 242 },
};

/** The eight door plates of the two locker banks, lettered across both banks the way the room is
 *  read: the top row of the near bank, then the top row of the far one, then the two bottom rows.
 *  The game writes the name of whoever's locker it is on each. Turn 23 lettered them bank by bank,
 *  so the fifth name landed on the top row of the far bank rather than carrying on along the
 *  bottom of the near one, which is not how anybody reads a wall [REPORT-T23 0.13]
 *  (CLAUDE.md T23 2.9, 2.10, T24 2.6).
 *
 *  Every figure is measured off `public/sprites/canteenLockers.png`, the painted label strip under
 *  each plate: the far bank's four were re-measured tonight and sit on their strips' own centres
 *  to a pixel, the first of them moved by that one pixel and the other three left as the art side
 *  wrote them (REPORT-T24 T24-B6 has the pixels). */
export const CANTEEN_PLATES: readonly RoomRect[] = [
  // The near bank, top row.
  { x: 97, y: 250, w: 147, h: 33 },
  { x: 296, y: 255, w: 125, h: 30 },
  // The far bank, top row.
  { x: 476, y: 259, w: 106, h: 27 },
  { x: 618, y: 263, w: 95, h: 24 },
  // The near bank, bottom row.
  { x: 117, y: 466, w: 95, h: 24 },
  { x: 311, y: 450, w: 95, h: 24 },
  // The far bank, bottom row.
  { x: 482, y: 437, w: 95, h: 24 },
  { x: 618, y: 432, w: 95, h: 24 },
];

/** How many compartments this canteen has, which is the one figure the room letters, the
 *  catalogue greys the ninth locker by and the hiring gate refuses the ninth man by. It is the
 *  plates the art side painted and not a second opinion about them: eight doors, eight lockers,
 *  eight men, until there is a bigger canteen [PIOTR, 20.09; CLAUDE.md T23 2.10]. */
export const CANTEEN_LOCKERS = CANTEEN_PLATES.length;

/** The counter over the banks, where the room says how many of the eight are in use [PIOTR]. */
export const CANTEEN_COUNTER: RoomRect = { x: 95, y: 35, w: 450, h: 65 };

/** The plate's hand: 18 px, centred, and a name longer than eight characters is cut to fit the
 *  plate, because the plate is the size the picture painted it [PIOTR]. */
export const CANTEEN_PLATE_TEXT = { fontSize: 18, maxCharacters: 8, align: 'center' } as const;

/** The counter's hand: 24 px [PIOTR]. */
export const CANTEEN_COUNTER_TEXT = { fontSize: 24 } as const;

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
/** Every anchor is the corner of the thing's working zone, not of the thing itself, and the two
 *  bands of the hall are laid out so the zones of a whole catalogue fit side by side: the rear
 *  three rows take the machines, the front four take the big kit and the storage, and the rows
 *  between them are the benches and the welfare (CLAUDE.md T7 3.3). */
export const STARTING_LAYOUT: Record<string, LayoutSlot> = {
  tableSaw: { x: 5, y: 0 },
  thicknesser: { x: 8, y: 0 },
  solidWoodTools: { x: 12, y: 0 },
  // The two central systems are plant, not machines: they stand outside on the apron by the
  // shutter, like the van, and draw their ducting along the rear wall (PIOTR, CLAUDE.md T10 3.4).
  dustSystem: { x: 0, y: 1, yard: true },
  flexiSystem: { x: 0, y: 4, yard: true },
  extractor: { x: 19, y: 0 },
  compressor: { x: 19, y: 1 },
  pelletiser: { x: 8, y: 2 },
  cnc: { x: 2, y: 6 },
  sprayBooth: { x: 7, y: 6 },
  sheetRack: { x: 11, y: 6 },
  edgebander: { x: 13, y: 6 },
  forklift: { x: 18, y: 6 },
  forkliftBetter: { x: 18, y: 7 },
  van: { x: 0, y: 7, yard: true },
};

/** Bench slots, in order, along the middle of the hall clear of the rooms and the personnel door.
 *  A unit uses the first `benchSlots` of them. */
export const BENCH_SLOT_LAYOUT: LayoutSlot[] = [
  { x: 8, y: 4 },
  { x: 10, y: 4 },
  { x: 12, y: 4 },
  { x: 14, y: 4 },
  { x: 16, y: 4 },
  { x: 18, y: 4 },
];

/** The one family that stands inside the canteen and not on the hall floor: a man's locker
 *  (PIOTR, 17.09; CLAUDE.md T17 2.2). The seat was the other until tonight, when the canteen
 *  became a room with a table and two stools of its own and nobody buys a seat any more
 *  (PIOTR, 20.09: "too much micromanagement"; CLAUDE.md T23 2.11). The one list: the placement,
 *  the render and the migration all ask it. */
export const WELFARE_IN_THE_CANTEEN: readonly string[] = ['locker'];

/** The welfare kit stands inside the canteen and takes no hall cell: a man keeps his coat out of
 *  the dust, not on the floor between the benches (PIOTR, 17.09; CLAUDE.md T17 2.2). The canteen
 *  block is two cells wide and four deep at x 3, y 0, and its door is in the front face at x 4.
 *  The lockers take the far column; past the last cell of it the next one stands on the same cell,
 *  which is what `slotFrom` does everywhere else [TUNE: the column]. */
export const LOCKER_SLOT_LAYOUT: LayoutSlot[] = [
  { x: 3, y: 0 },
  { x: 3, y: 1 },
  { x: 3, y: 2 },
  { x: 3, y: 3 },
];

/** Tool cabinets stand in the row between the rear machines and the benches: one for the owner
 *  and one for every worker (CLAUDE.md T6 3.5).
 *
 *  Two cells apart from Turn 21, because a cabinet is two metres wide from Turn 21: the old row put
 *  them one cell apart and every cabinet after the first would have stood on the one before it. The
 *  row also starts at 8 now and not at 5. The day one saw stands at (5, 0) on a 3 by 3 zone and the
 *  man who works it stands one cell out from its front, at (6, 3); a two cell cabinet on the old
 *  first slot covered cells 5 and 6 of that row, took his cell, and put him three cells from his own
 *  saw. Six slots, 8 to 19 of a hall 20 cells wide; a seventh cabinet falls back to the first free
 *  cell as any other purchase does (`anchorFor`) (CLAUDE.md T21 2.13). */
export const CABINET_SLOT_LAYOUT: LayoutSlot[] = [
  { x: 8, y: 3 },
  { x: 10, y: 3 },
  { x: 12, y: 3 },
  { x: 14, y: 3 },
  { x: 16, y: 3 },
  { x: 18, y: 3 },
];

/** Where a waiting delivery lorry stands: inside the shutter, on the lane. */
export const GATE_LAYOUT = { x: 0, y: SHUTTER.y, width: 2, depth: 2, height: 1 };

/** The way in from the shutter that nothing may stand on: x 0 to 2, y 6 to 10, eight of the two
 *  hundred cells (docs/art/SPRITES.md 9.3). */
export const GATE_LANE = { x: 0, y: SHUTTER.y, width: 2, depth: 4 };

/** Where the helper stands when the hall has nothing for him and there is no fan to stand by: in
 *  the gate lane, where the van and the bags are. Inside the painted floor and out of the office
 *  block, which is where every man who is not a joiner used to be put (CLAUDE.md T11 3.4). */
export const HELPER_HOME_CELL = { x: 2, y: 8 };
/** How far into the hall the lane reaches. */
export const GATE_LANE_CELLS = GATE_LANE.width;

/** Where finished pieces stand until transport is ordered: at the far end of the lane, in front of
 *  the shutter, which is why too many of them slow the whole hall down (CLAUDE.md T2 3.7). */
export const FINISHED_GOODS_LAYOUT = { x: 0, y: 9, width: 2, depth: 1, height: 1 };
export const DELIVERY_VAN_SPRITE = 'deliveryVan';

/** Width of the apron drawn beyond the front kerb, where the company van and the two central
 *  extraction systems stand, in cells. */
export const YARD_WIDTH_CELLS = 3;

/** The families that are a central system: with one in the hall every machine is connected and
 *  the drawing says so with a drop to each (CLAUDE.md T16 2.3). */
export const DUCT_SYSTEMS = ['dustSystem', 'flexiSystem'];
/** The pallet of sheets at the gate stands where the lorry stood: inside the shutter, on the lane,
 *  one metre each way (CLAUDE.md T13 3.21). The man unloading it stands in front of it on the hall
 *  side, never outside (PIOTR, 16.09; CLAUDE.md T16 2.1). */
export const PALLET_LAYOUT = { x: GATE_LAYOUT.x, y: GATE_LAYOUT.y, width: 1, depth: 1, height: 1 };
/** How fast a man walks the floor, in cells of real time a second [TUNE]. One cell a second was
 *  chosen on 17.09 because 1.6 read as a trot (CLAUDE.md T18 2.1); a quarter more from v44
 *  (PIOTR, 21.09: "walking is too slow, speed it up by 25 percent"). */
export const WALK_CELLS_PER_SECOND = 1.25;
/** His pace while the clock runs faster than x1, in cells of real time a second [TUNE]: half as
 *  fast again as the x1 pace of 17.09 and not the clock's own multiple, so the figures keep up
 *  with a hurried day without flying across the hall (PIOTR, 21.09: "when I speed up time, speed
 *  them up by 50 percent, not too much"; v44). Until v44 a man did not walk faster at x10 at all
 *  (docs/art/SPRITES.md 10.4; CLAUDE.md T16 2.2). */
export const WALK_CELLS_PER_SECOND_FAST = 1.5;
/** How far a man travels in one full cycle of the walk sheet, in metres [TUNE]. The sheets give a
 *  frame count and an fps and no stride at all (docs/art/SPRITES.md 10.5), so one is chosen here:
 *  1.4 m is a 1.8 m man's stride over two steps at an unhurried pace. The renderer plays the walk
 *  and the carry at `frames * WALK_CELLS_PER_SECOND / WALK_STRIDE_METRES` frames a second instead
 *  of the sheet's own fps, so the feet plant where the floor moves and the man stops skating
 *  (PIOTR, 17.09: "they walk like robots"; CLAUDE.md T19 2.1). The sheet's own fps is kept for
 *  every animation that is not locomotion. */
export const WALK_STRIDE_METRES = 1.4;
/** How long a run of cells in one world direction has to be before it is a corner a man turns at,
 *  rather than a wobble inside the leg he is walking [TUNE]. The brief's own words are "the path
 *  turns ninety degrees for more than two cells", so the figure is Piotr's and only its name is
 *  chosen here (CLAUDE.md T19 2.1). */
export const WALK_CORNER_CELLS = 2;
/** How far in front of his own cell a figure is painted, in cells of the depth key [TUNE]. Not a
 *  new figure: it is the 0.2 `src/render/hall.ts` has painted a man in front of his own tile with
 *  since Turn 16, given a name so the scene and the re-sort of a walking man read one figure
 *  (CLAUDE.md T20 2.11). */
export const FIGURE_DEPTH_OFFSET = 0.2;

// ---------------------------------------------------------------------------
// 9.3 Hiring pool (PIOTR: tiers and gating; wages [TUNE])
// ---------------------------------------------------------------------------

/** The four tiers, in the order a man climbs them. Nobody is "poor" any more: Piotr would not
 *  have the word in his workshop, and a man with no experience is not a poor man (PIOTR, 18.09;
 *  CLAUDE.md T20 2.5). */
export const TIERS: readonly WorkerTier[] = ['novice', 'experienced', 'senior', 'master'];

/** The one table of the words the game prints for a tier. Every hire card, every row of Our team,
 *  every assign list, the Company board and every report reads this and never the id, so the
 *  player sees one vocabulary and the code keeps its own (PIOTR, 18.09; CLAUDE.md T20 2.5).
 *
 *  Turn 21 puts the top two right: Piotr asked for **no experience, experienced, very experienced,
 *  excellent**, and Turn 20 printed two words of its own for the top two instead, which were
 *  Claude's and not his (PIOTR, 19.09; CLAUDE.md T21 2.9). */
export const TIER_WORDS: Record<WorkerTier, string> = {
  novice: 'no experience',
  experienced: 'experienced',
  senior: 'very experienced',
  master: 'excellent',
};

/** Worker speed as a fraction of the owner, tier by tier. The **very experienced** man matches the
 *  owner and the **excellent** one beats him: a workshop is meant to grow past the man who started
 *  it. These are Piotr's own four figures and not a ladder derived from them
 *  [PIOTR, 19.09: 0.6, 0.8, 1.0, 1.2]. Turn 20 ran a ladder one step higher all the way up, which
 *  was Claude's reading and not his. One table for every role that has a rate, so an
 *  estimator's tier is worth at his desk exactly what a joiner's is at his bench
 *  (CLAUDE.md T21 2.9). */
export const WORKER_RATES: Record<WorkerTier, number> = {
  novice: 0.6,
  experienced: 0.8,
  senior: 1.0,
  master: 1.2,
};

/** Who answers the advert. The workshop's reputation earns the tier: a man with no experience
 *  always comes, and the excellent one does not look at a workshop under 60
 *  [PIOTR: the 60; the two between are TUNE] (CLAUDE.md T20 2.5). The hire card reads this to say
 *  what is missing, and it is the one gate every tiered role passes. */
export const TIER_MIN_REPUTATION: Record<WorkerTier, number> = {
  novice: REPUTATION_MIN,
  experienced: 15,
  senior: 35,
  master: 60,
};

/** A joiner's pay a month, tier by tier: 1,950, 2,600, 3,500, 4,330 [PIOTR, 19.09: the excellent
 *  man at about 1,000 a week, which is 4,330 a month, and the rest scaled off the experienced
 *  2,600; TUNE the three below the top]. Every other tiered role's pay is that ladder against its
 *  own experienced man's wage, so no role grows a ladder of its own (CLAUDE.md T21 2.9, 2.10). */
/** v38 (PIOTR, 21.09): what a unit of a man's work costs falls about 5% a grade, so the better man
 *  is the cheaper one per hour of work done and not the dearer (it was 3,250 / 3,250 / 3,500 /
 *  3,608 a unit, novice to master, which paid a shop to keep only novices). The rates are Piotr's
 *  ladder and do not move; the wages move: 1,950 / 2,470 / 2,940 / 3,350 for a joiner, and the
 *  sprayer's and the estimator's by the same four factors off their own experienced man. */
export const JOINER_MONTHLY_WAGE_EXPERIENCED = 2470;
export const TIER_WAGE_FACTOR: Record<WorkerTier, number> = {
  novice: 1950 / 2470,
  experienced: 1,
  senior: 2940 / 2470,
  master: 3350 / 2470,
};

/** What this tier of a role costs a month, from what its experienced man costs, rounded to the
 *  nearest five pounds [TUNE the rounding]. The one conversion (CLAUDE.md T21 2.9, 2.10). */
export function tierMonthlyWage(experiencedMonthly: number, tier: WorkerTier): number {
  return Math.round((experiencedMonthly * TIER_WAGE_FACTOR[tier]) / 5) * 5;
}

/** The four wages of a role, from its experienced man's. */
export function tierMonthlyWages(experiencedMonthly: number): Record<WorkerTier, number> {
  return {
    novice: tierMonthlyWage(experiencedMonthly, 'novice'),
    experienced: tierMonthlyWage(experiencedMonthly, 'experienced'),
    senior: tierMonthlyWage(experiencedMonthly, 'senior'),
    master: tierMonthlyWage(experiencedMonthly, 'master'),
  };
}

export const JOINER_MONTHLY_WAGE = tierMonthlyWages(JOINER_MONTHLY_WAGE_EXPERIENCED);
export const SPRAYER_MONTHLY_WAGE = tierMonthlyWages(SPRAYER_MONTHLY_WAGE_EXPERIENCED);

export interface HiringSpec {
  role: WorkerRole;
  tier: WorkerTier | null;
  label: string;
  /** The one wage field in the game. Everybody is paid by the month, on the last working day of it
   *  (PIOTR, 19.09: "I wanted everyone monthly"; CLAUDE.md T21 2.10). */
  monthlyWage: number;
  minReputation: number;
  duties: string;
}

/** The four rows of a tiered role, off the one wage ladder and the one reputation gate.
 *
 *  `duties` is the sentence the hire card prints, and from Turn 23 it is the ONLY one: the card
 *  used to read a second table of its own in `src/ui/team.ts`, so a role's duties were written
 *  out twice and the spec's copy was read by nothing at all. The words here are the words that
 *  were on the card (CLAUDE.md T23 2.4).
 *
 *  A role whose four wages are Piotr's own rather than the ladder's hands its own table in
 *  `wages`, and the ladder is not asked. The production manager is the one such role tonight: his
 *  2,400, 3,400, 4,200 and 5,200 are figures he gave, and 3,400 down the ladder would make the
 *  novice 2,550 (PIOTR, 20.09; CLAUDE.md T23 2.4). There is still one builder and one gate. */
function tieredSpecs(
  role: WorkerRole,
  roleLabel: string,
  experiencedMonthly: number,
  duties: (tier: WorkerTier) => string,
  wages?: Record<WorkerTier, number>,
): HiringSpec[] {
  return TIERS.map((tier) => ({
    role,
    tier,
    label: `${roleLabel}, ${TIER_WORDS[tier]}`,
    monthlyWage: wages ? wages[tier] : tierMonthlyWage(experiencedMonthly, tier),
    minReputation: TIER_MIN_REPUTATION[tier],
    duties: duties(tier),
  }));
}

/** What a manager of this grade does, in the three figures his grade is: how many men he carries,
 *  how he picks their work, and what he does to their pace (CLAUDE.md T23 2.4). Written here
 *  beside the tables and not in the UI, so the card and the hire card say the same sentence. */
export function productionManagerDuties(tier: WorkerTier): string {
  const pace = Math.round((PRODUCTION_MANAGER_PACE[tier] - 1) * 100);
  return (
    `Assigns up to ${PRODUCTION_MANAGER_CARRIES[tier]} men, ` +
    `${PRODUCTION_MANAGER_ORDER_WORDS[tier]}, +${pace}% pace`
  );
}

/** The trades that make something: the men whose minutes come out of the hall as work. An
 *  estimator has a rate at his desk and a draftsman has one at his, and neither of them is a
 *  production rate, so neither is on the Company board's list of the men who act where they are
 *  (PIOTR; CLAUDE.md T20 2.3). A table and not behaviour, so it lives here and both
 *  `src/engine/staff.ts` and `src/engine/machines.ts` read it. */
export const PRODUCING_ROLES: ReadonlyArray<WorkerRole> = ['joiner', 'sprayer'];

/** The notice a man let go works out, in days [TUNE, Piotr's decision is open: he said a week's
 *  wage]. Seven days from the click, so exactly one Friday falls inside them and the week he works
 *  is the week he is paid for (CLAUDE.md T20 2.4). */
export const LET_GO_NOTICE_DAYS = 7;

/** How many job names a man's week line carries [TUNE]: enough to read, not a paragraph
 *  (CLAUDE.md T20 2.7). */
export const WEEK_JOBS_KEPT = 4;

export const HIRING_SPECS: HiringSpec[] = [
  ...tieredSpecs(
    'joiner',
    'Joiner',
    JOINER_MONTHLY_WAGE_EXPERIENCED,
    () => 'Production at the bench and at the machines, by day or on the second shift.',
  ),
  {
    role: 'helper',
    tier: null,
    label: 'Helper',
    // [TUNE: 420 a week was his Turn 20 figure and he never had a monthly one; 1,800 is that week
    // over the month and a round figure, which is what the hire card now prints.]
    monthlyWage: 1800,
    minReputation: REPUTATION_MIN,
    duties: 'Bag changes, cleaning, unloading, the weekly clean.',
  },
  {
    role: 'officeAdmin',
    tier: null,
    label: 'Office admin',
    monthlyWage: 1900,
    minReputation: 5,
    duties:
      'Emails, bookkeeping, the consumables and materials chore, and every specialist’s work ' +
      'at double time until he is taken on.',
  },
  {
    role: 'purchasingClerk',
    tier: null,
    label: 'Purchasing clerk',
    monthlyWage: 1700,
    minReputation: 10,
    duties: 'The daily consumables and materials chore, ahead of the office admin.',
  },
  {
    role: 'draftsman',
    tier: null,
    label: 'Draftsman',
    monthlyWage: DRAFTSMAN_MONTHLY_WAGE,
    minReputation: DRAFTSMAN_REPUTATION,
    duties: 'The drawings, at 0.8 of your own speed, in the order the laptop has them.',
  },
  {
    role: 'salesman',
    tier: null,
    label: 'Salesman',
    monthlyWage: 2200,
    minReputation: 15,
    duties: 'Client calls, and the meeting a big job starts with.',
  },
  // The estimator and the finishing man, four tiers each like the joiner (CLAUDE.md T13 3.8,
  // T19 2.6, T20 2.5).
  ...tieredSpecs(
    'estimator',
    'Estimator',
    ESTIMATOR_MONTHLY_WAGE_EXPERIENCED,
    () =>
      'Reads the drawing and counts the sheets: the material take off, as many a day as his ' +
      'minutes allow, and the site measure when you are not free for it.',
  ),
  ...tieredSpecs(
    'sprayer',
    'Sprayer',
    SPRAYER_MONTHLY_WAGE_EXPERIENCED,
    () =>
      'The finishing of a lacquered job, which is his trade, and a pair of hands at the bench ' +
      'on anything else. A joiner can spray, slower.',
  ),
  // The manager is a tiered role from Turn 23, four grades and four cards like the joiner, on his
  // own wage table (PIOTR, 20.09; CLAUDE.md T23 2.4).
  ...tieredSpecs(
    'productionManager',
    'Production manager',
    PRODUCTION_MANAGER_MONTHLY_WAGE.experienced,
    productionManagerDuties,
    PRODUCTION_MANAGER_MONTHLY_WAGE,
  ),
];

/** Every joiner needs all of these before he can be hired (PIOTR). The tool cabinet is counted
 *  one higher than the rest, because the owner keeps his own tools in one too (T6 3.5). */
/** What a joiner wants in the hall before he starts, in an order the prerequisites allow: the
 *  cabinet stands before the set it holds, because from tonight a man's hand tool set wants a free
 *  slot in one and `canBuy` refuses it without (CLAUDE.md T22 2.12). Anything that buys the
 *  shortfall walks this list in order, the scripted player included, so an order the game itself
 *  cannot buy would be a shortfall nobody could fill. */
export const JOINER_PREREQUISITES = [
  'workbench',
  'locker',
  TOOL_CABINET_ID,
  HAND_TOOL_SET,
];
/** The cabinet a man's tools are kept in. One is no longer one man's: a class holds one, two, four
 *  or eight sets, and it is the free slots the gate counts (CLAUDE.md T22 2.12). */
export const TOOL_CABINET = TOOL_CABINET_ID;
/** [TUNE] a new hire starts the next working day. */
export const HIRE_START_DELAY_DAYS = 1;
/** From five joiners a helper is required (PIOTR). */
export const HELPER_REQUIRED_FROM_JOINERS = 5;
/** Without the required helper, dust rises twice as fast (PIOTR). */
export const NO_HELPER_DUST_MULTIPLIER = 2;
/** [TUNE] and productivity drops. */
export const NO_HELPER_PRODUCTIVITY_FACTOR = 0.9;
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

/** A bag is one cubic metre (PIOTR, 15.09). The one constant every place that turns bags into
 *  cubic metres, or back, reads (CLAUDE.md T12 1). */
export const BAG_M3 = 1;

/** Bags into cubic metres: the one place the conversion is done, so a capacity is never written
 *  out twice (CLAUDE.md T12 2.3). */
export function bagsToM3(bags: number): number {
  return bags * BAG_M3;
}

/** Cubic metres of sawdust a machine of each family makes in an hour that somebody stands at it
 *  (PIOTR, 15.09; CLAUDE.md T12 2.1). One figure per family: a dearer saw does not make more
 *  dust, because the material makes the dust and not the price of the machine. The point of
 *  reference is a CNC cutting all day filling half a bag and a saw four times less, a bag of one
 *  cubic metre and a day of eight hours.
 *
 *  Families that do not exist yet, written here in full so the figures are in place the day the
 *  classes land, the way EXTRACTION_DEMAND does it: spindle moulder 0.12 (a bag a day), planer
 *  0.12 (one face, a bag a day), four sided planer 0.5 (four times the spindle moulder), wide
 *  belt sander 0.03, brush sander 0.03. None of them is a family tonight. */
export const DUST_OUTPUT_M3_PER_HOUR: Record<string, number> = {
  tableSaw: 0.015, // an eighth of a bag a day
  edgebander: 0.01, // a bag in about two weeks of use
  thicknesser: 0.25, // two bags a day, it takes 6 to 8 mm off two faces
  cnc: 0.06, // half a bag a day, Piotr's point of reference
  cncHead: 0.06, // the same head, the same chips
  solidWoodTools: 0, // the helper sweeps up after hand tools
  sprayBooth: 0, // its own extraction, off this table
  spindleMoulder: 0.12, // a bag a day, the figure the Turn 12 comment kept for it (PIOTR)
  // A compressor moves air and makes no chips. Not on Piotr's list: a zero so that every family
  // of the machine category is on this table and the test can hold it to that [TUNE].
  compressor: 0,
};

/** How full the hall's bags are when a helper on duty starts emptying them, as a fraction of
 *  the store [PIOTR, 22.09: "let him empty them at 80 percent"; v46]. Until v46 the chore was
 *  raised at the brim only, and the machines stood while he carried the bags out; with a helper
 *  in the hall they need never stop. Without one the store still fills to the brim and the
 *  question is put to the owner as it always was (CLAUDE.md T12 2.3). */
export const BAGS_HELPER_EMPTY_AT = 0.8;

/** The bags on each class of extractor, off the descriptions that were on the shelf already: a
 *  single bag, a single bag, twin bags, four bags and ten (PIOTR, CLAUDE.md T12 2.3). The hall's
 *  store is the sum of these over every extractor in it, in cubic metres through `bagsToM3`. */
export const EXTRACTOR_BAGS: Record<string, number> = {
  used: 1,
  budget: 1,
  standard: 2,
  pro: 4,
  industrial: 10,
};

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
/** [TUNE] How much dust one pile of sawdust on the floor is worth. It is not a new figure: it is
 *  the ten `sawdust()` in `src/render/hall.ts` has divided by since Turn 2, given a name so that
 *  the dirt the player sees and the dirt the engine answers are one reading (CLAUDE.md T20 2.8). */
export const DUST_PER_SAWDUST_PILE = 10;
/** [TUNE] accident chance per day in the dangerous band, and days the joiner is off. */
export const ACCIDENT_CHANCE_PER_DAY = 0.02;
export const ACCIDENT_DAYS_OFF = 3;
/** A helper cleans every Friday at no owner cost (PIOTR). */
export const HELPER_CLEAN_WEEKDAY = 4;
/** [TUNE] The band of dust the Turn 17 rule waited for before the helper picked up a brush
 *  (PIOTR, 16.09; CLAUDE.md T17 2.3). Turn 20 2.8 found that this was four days behind the dirt
 *  the player can see and put `hallLooksDirty` in its place, so nothing in the game reads this any
 *  more: it is kept as the old band the tests of 2.8 measure the new rule against. */
export const HELPER_CLEAN_DUST_BAND = 'messy';

// ---------------------------------------------------------------------------
// Housekeeping
// ---------------------------------------------------------------------------

/** The accounting modal shows the last 50 entries (CLAUDE.md 10.1). */
/** [TUNE] the state keeps this many ledger entries so it stays small. */
/** The licence is not a machine, so it carries an id of its own on the day one list. */
export const DAY_ONE_SOFTWARE = 'software';

/** What a workshop needs before it can make anything: the list the catalogue ticks off on day one,
 *  in the order the player works down it (PIOTR, 15.09; CLAUDE.md T11 3.6). One constant, so the
 *  card and its test cannot drift apart. */
export const DAY_ONE_KIT: readonly string[] = [
  'desk',
  'chair',
  'laptop',
  DAY_ONE_SOFTWARE,
  'tableSaw',
  'edgebander',
  'compressor',
  'extractor',
  'workbench',
  'toolCabinet',
  'sheetRack',
];

/** How many end of day summaries the state carries: three months of working days [TUNE]. */
export const DAY_SUMMARIES_MAX = 90;
/** How many days of the owner's day log the state carries. A week is what the company board
 *  shows, and the brief asks for no more (CLAUDE.md T11 3.1). */
export const DAY_LOGS_KEPT = 7;
/** The state keeps this many ledger lines [TUNE]. It was 200, which a busy month outran; the month
 *  end report and the house tier are sums over dated lines and want the whole month and the
 *  thirty days before it in the state (CLAUDE.md T13 3.18, 3.20). */
export const LEDGER_MAX_ENTRIES = 2000;
// The Ledger tab showed the last 200 of them and `LEDGER_VISIBLE_ENTRIES` said so. The tab is
// gone from Turn 23 and so is the figure: the ledger is the engine's record now and has no screen
// of its own to be cut to a length (CLAUDE.md T23 2.14).

// ---------------------------------------------------------------------------
// T13 3.15 Insurance
// ---------------------------------------------------------------------------

/** Property cover: this much of the value of every machine and the stock, a year (PIOTR),
 *  recomputed on every purchase and every stock change, charged as a twelfth each month. Public
 *  liability: a base a year plus this much per hired person [TUNE both], charged monthly
 *  (CLAUDE.md T13 3.15). */
export const PROPERTY_INSURANCE_RATE_YEARLY = 0.02;
export const LIABILITY_BASE_YEARLY = 600;
export const LIABILITY_PER_EMPLOYEE_YEARLY = 180;
/** The accident with no liability cover: a claim drawn once in this band [TUNE]. */
export const UNINSURED_CLAIM_MIN = 8000;
export const UNINSURED_CLAIM_MAX = 25000;
/** A burglary with property cover and an alarm is paid out over this many days [TUNE]
 *  (CLAUDE.md T13 3.17). With no alarm the property cover pays nothing (T13 3.15). */
export const BURGLARY_PAYOUT_DAYS = 10;

// ---------------------------------------------------------------------------
// T13 3.16 Standing contracts
// ---------------------------------------------------------------------------

export interface ContractPieceSpec {
  id: string;
  name: string;
  /** The stages the piece goes through, a subset of the production stages. */
  stages: StageId[];
  /** Owner minutes a piece. */
  minutes: number;
  /** What the material in a piece costs. */
  material: number;
  /** What a piece takes off the rack, in sheets: the material in it over what a sheet is worth,
   *  so a piece with 30 of material in it is 0.15 of a 200 sheet. A contract's material comes off
   *  the rack like a job's and is never bought as money on the contract line (T17 2.22). Whole
   *  sheets are drawn as the pieces add up, the way a job draws them as it goes. */
  sheets: number;
}

/** The pieces a contract can be for. `minutes` is owner minutes a piece, `material` the money in
 *  its sheets and `sheets` what it takes off the rack (CLAUDE.md T13 3.16, T17 2.22, T20 2.2).
 *
 *  v40 (PIOTR, 21.09): the price a piece is no longer a figure in this table. It is worked out
 *  from `CONTRACT_MARGIN_PER_DAY` at the entry point below, by `contractPriceFor` in
 *  contracts.ts, so it follows the wages, the machine prices and the service rule wherever they
 *  go; the labour value of a piece is its price less its material, read off the contract itself.
 *  The typed prices of v28 to v39 (50, 52, 160) paid about 200 a week and forgot the saw: forty
 *  cut sheet packs a week are 37 hours of a standard saw, which is 327 of service at a tenth of
 *  7,000 every 80 hours, against 268 of margin. */
export const CONTRACT_PIECES: readonly ContractPieceSpec[] = [
  {
    id: 'cutSheetPack',
    name: 'Cut sheet pack',
    stages: ['cutting'],
    minutes: 45,
    material: 30,
    sheets: 0.15,
  },
  {
    id: 'drawerBox',
    name: 'Drawer box',
    stages: ['cutting', 'assembly'],
    minutes: 60,
    material: 26,
    sheets: 0.13,
  },
  {
    id: 'wardrobeFront',
    name: 'Wardrobe front',
    stages: ['cutting', 'finishing'],
    minutes: 240,
    // [TUNE] 60 over SHEET_VALUE 200, so the piece draws off the rack exactly what it is costed
    // at. It was 1.1 in v28, beside a material of 220 (T20 2.2).
    material: 60,
    sheets: 0.3,
  },
];

/** What a contract is priced to leave a day, after the man's wages and the wear of his machine,
 *  at the entry point: an experienced joiner on the standard class of the machine the piece is
 *  done on [PIOTR, 21.09: "about 200 a day, that is the minimum, otherwise there is no point"].
 *  The price a piece is set from this one figure, so a better man or a better machine makes more
 *  pieces of the same price in the day and keeps more, the way a job works: a novice on a used
 *  saw lands under it and a master on an industrial one well over (PIOTR: "not a fixed figure,
 *  the way a normal job goes: more skill, more use of the machines, more money"). */
export const CONTRACT_MARGIN_PER_DAY = 200;
/** The entry point the price is worked out at: the tier of the man and the class of the machine.
 *  Both are the middle of their ladders [PIOTR, 21.09]. */
export const CONTRACT_REFERENCE_TIER: WorkerTier = 'experienced';
export const CONTRACT_REFERENCE_CLASS = 'standard';

/** How many pieces a week the client asks for, in cut sheet packs, by the workshop's standing:
 *  a shop with a name gets asked for more, so a better crew is not throttled by the band
 *  [PIOTR, 21.09: "higher capability, higher use of the machines, more money"; the steps TUNE].
 *  The row whose `from` is the highest at or under the reputation is the one drawn from. */
export interface ContractQuantityBand {
  from: number;
  min: number;
  max: number;
}
export const CONTRACT_QUANTITY_BANDS: readonly ContractQuantityBand[] = [
  { from: REPUTATION_MIN, min: 20, max: 40 },
  { from: 20, min: 30, max: 60 },
  { from: 40, min: 40, max: 80 },
  { from: 60, min: 60, max: 100 },
];

/** The owner minutes one piece of the quantity band stands for: the band of Turn 13 is 20 to 40
 *  cut sheet packs a week, which is the week's work the client is asking for. A longer piece is
 *  asked for in proportion, so a contract for three day pieces wants one a week and not thirty
 *  (CLAUDE.md T17 2.22). */
export const CONTRACT_QUANTITY_MINUTES = 45;

/** A contract may be ended by the player once it has run this long, and it costs nothing but the
 *  work he will not now do [TUNE: one month, as Piotr said] (CLAUDE.md T17 2.22). */
export const CONTRACT_FREE_END_DAYS = DAYS_PER_MONTH;
/** Contracts arrive from this reputation tier up [TUNE: the second tier, reputation 0], one on
 *  the board at a time, and an offer stands for this many days [TUNE]. */
export const CONTRACT_MIN_TIER = 1;
export const CONTRACT_OFFER_DAYS = 5;
/** [PIOTR, 22.09] From this reputation up a shop rings at least once a week: a week with no
 *  offer on the board and none made in it ends with one, whatever the dice said. Under it the
 *  chance of the day is all there is. */
export const CONTRACT_WEEKLY_OFFER_REPUTATION = 20;
/** A term of three to six months (PIOTR). The quantity a week is `CONTRACT_QUANTITY_BANDS`. */
export const CONTRACT_TERM_MONTHS_MIN = 3;
export const CONTRACT_TERM_MONTHS_MAX = 6;
/** A short week is a point of reputation [TUNE]; at the end of the term every full week raises the
 *  offered price by this much and every short week lowers it by this much [TUNE]. */
export const CONTRACT_SHORT_WEEK_REPUTATION = 1;
/** Short weeks a client puts up with inside one term. The first costs its point of reputation as
 *  it always did; on the second the client ends the contract himself and there is no third
 *  [TUNE: two, and Piotr's decision on it is still open] (CLAUDE.md T20 2.1.6). */
export const CONTRACT_SHORT_WEEKS_ALLOWED = 2;
export const CONTRACT_RENEW_FULL_WEEK = 0.01;
export const CONTRACT_RENEW_SHORT_WEEK = 0.02;

// ---------------------------------------------------------------------------
// T13 3.17 Security, five levels
// ---------------------------------------------------------------------------

export interface SecurityLevelSpec {
  level: number;
  name: string;
  /** Paid once, on the click. */
  price: number;
  /** Paid every month. Levels 4 and 5 scale with the hall and the insured value. */
  monthly: number;
  scaled: boolean;
  /** Risk of a burglary a month. Level 5 is zero: zero means zero (PIOTR). */
  risk: number;
}

/** From nothing to a firm that takes the risk to zero, so the player feels fixed costs (PIOTR:
 *  the alarm at 500 once, level 5 at zero risk; the rest [TUNE]; CLAUDE.md T13 3.17). */
export const SECURITY_LEVELS: readonly SecurityLevelSpec[] = [
  { level: 0, name: 'Nothing', price: 0, monthly: 0, scaled: false, risk: 0.04 },
  { level: 1, name: 'Alarm', price: 500, monthly: 0, scaled: false, risk: 0.02 },
  { level: 2, name: 'Bars', price: 1500, monthly: 0, scaled: false, risk: 0.012 },
  { level: 3, name: 'Bars and dogs', price: 2500, monthly: 150, scaled: false, risk: 0.006 },
  { level: 4, name: 'Security firm, basic', price: 0, monthly: 250, scaled: true, risk: 0.002 },
  { level: 5, name: 'Security firm, good', price: 0, monthly: 600, scaled: true, risk: 0 },
];
/** The subscription of a scaled level: base times area over this, times one plus the insured
 *  value over this [TUNE] (CLAUDE.md T13 3.17). */
export const SECURITY_SCALE_AREA_M2 = 200;
export const SECURITY_SCALE_VALUE = 100000;
/** A burglary takes one or two machines at random, the dearest first, and the free stock [TUNE]. */
export const BURGLARY_MACHINES_MIN = 1;
export const BURGLARY_MACHINES_MAX = 2;

// ---------------------------------------------------------------------------
// T13 3.5 Efficiency, T13 3.22 Tips and the warning strip
// ---------------------------------------------------------------------------

/** The four lines of the efficiency plate, in the order they are printed, each a percentage of
 *  the lost minutes (PIOTR; CLAUDE.md T13 3.5). */
export const EFFICIENCY_CAUSES: ReadonlyArray<{ id: LostMinuteCause; label: string }> = [
  { id: 'noPeople', label: 'No people' },
  // A man the hall had no place for at the machine his work wanted, and nothing else: nobody
  // queues for a machine from v52 (CLAUDE.md T25 2.3).
  { id: 'noPlace', label: 'No place' },
  { id: 'noMaterial', label: 'No material' },
  // A man with a place whose job the hall stopped: no extraction, the bags full, a machine that
  // will not run on its air, kit still on the lorry, a bench with no air behind it. Until v52
  // these were booked with the queue as "no machine free"; `noPlace` means one thing now, so
  // they have a line of their own [TUNE: the words] (CLAUDE.md T25 2.3).
  { id: 'hallStopped', label: 'Hall stopped' },
  { id: 'ownerAway', label: 'Owner away' },
];

/** The four reasons the owner stood still, in the order the day meter's grey segment lists them,
 *  each with the minutes it took off him. Piotr read his own meter and said "my time runs two to
 *  three times slower than the clock": it was not the clock, it was the meter counting only the
 *  minutes he worked and saying nothing about the ones he stood (PIOTR, 19.09; CLAUDE.md T21 2.8).
 *
 *  These are the owner's own minutes and not the workshop's lost ones. `EFFICIENCY_CAUSES` above
 *  counts every seat in the hall; two of its four (`noPeople`, `ownerAway`) cannot be true of the
 *  man himself, and two of these four (`nothingAssigned`, `officeEmpty`) are not in it at all.
 *  The two lists meet on the machine and the material, which is why the words here are the words
 *  there. */
export const OWNER_IDLE_REASONS: ReadonlyArray<{ id: OwnerIdleReason; label: string }> = [
  { id: 'noPlace', label: 'No place at a machine' },
  { id: 'noMaterial', label: 'No material' },
  { id: 'noCompressor', label: 'No air at the bench' },
  { id: 'hallStopped', label: 'Hall stopped' },
  { id: 'nothingAssigned', label: 'Nothing assigned' },
  { id: 'officeEmpty', label: 'In the office with nothing to do' },
];

/** The reasons a man on the books stood still, in the order his day meter lists them. His own
 *  list and not the owner's above: a joiner has no office queue, and he has the one reason the
 *  owner can never have, which is that nobody has put him on anything. From Turn 23 nobody takes
 *  a job by himself without a manager on duty, so a free man's day is spent standing until the
 *  boss's word and his meter says so out loud (PIOTR, 20.09; CLAUDE.md T23 2.1, 2.13). The two
 *  it shares with the owner are worded the same, because they are the same two things. */
export const WORKER_IDLE_REASONS: ReadonlyArray<{ id: WorkerIdleReason; label: string }> = [
  { id: 'waitingForBoss', label: 'Waiting for the boss' },
  { id: 'noPlace', label: 'No place at a machine' },
  { id: 'noMaterial', label: 'No material' },
  { id: 'noCompressor', label: 'No air at the bench' },
  { id: 'hallStopped', label: 'Hall stopped' },
];

// ---------------------------------------------------------------------------
// T22 2.5 What is wrong with a man: the words of the mark over his head
// ---------------------------------------------------------------------------

/** The words the mark over a man's head says when the player points at it
 *  (docs/mockups/t22/bubbles-v2.png, the red column and the hover; CLAUDE.md T22 2.5). One table,
 *  so a word Piotr wants changed is a line here and not a repaint. A `{slot}` is filled off the
 *  state by `src/engine/bubbles.ts` and never by a second table of words.
 *
 *  Five lines and no colour: a mark is drawn only when something is wrong, so every one of them is
 *  the red one [PIOTR, 19.09: "when all is fine, no bubble; only when it is bad"]. The green chore
 *  lines, the paper lines of a stage just begun and the dashed grey lines of a man off the hall are
 *  gone with the classes that drew them. */
export const BUBBLES: Record<BubbleKey, string> = {
  noPlace: 'no place at the {machine}',
  noMaterial: 'no sheets for {job}',
  noCompressor: 'no compressor',
  nothingToDo: 'nothing to do',
  waitingForBoss: 'waiting for the boss',
};

/** How far over a figure's head the point of the mark's tail sits, in screen pixels [PIOTR's
 *  drawing says six] (docs/mockups/t22/bubbles-v2.png; CLAUDE.md T22 2.5). */
export const BUBBLE_HEAD_GAP = 6;

/** What a man calls a machine: the trade's own short word, not the catalogue's name [PIOTR's
 *  drawing, 19.09: "the saw", "the CNC", "the booth"]. The mark over a man the hall has no place
 *  for, his card and the Work Plan's line all read it through `placeLine`, so the three say the
 *  same thing: `no place at the saw` (CLAUDE.md T21 2.6, T25 2.3). A family that is not on this
 *  table is called by its catalogue name, lowercased; the edgebander is left off because the
 *  catalogue already calls it an edgebander. */
export const MACHINE_SHORT_WORDS: Record<string, string> = {
  tableSaw: 'saw',
  cnc: 'CNC',
  sprayBooth: 'booth',
  spindleMoulder: 'moulder',
  workbench: 'bench',
};

/** The first use bubbles, one sentence each, keyed by the screen they open on [TUNE wording]
 *  (CLAUDE.md T13 3.22). Dismissed by a click, remembered in the save. */
export const TIPS: Record<string, string> = {
  hallCamera:
    'The wheel zooms the hall and dragging the floor moves it. Fit puts the whole workshop back in the view.',
  unconnected:
    'A machine with no pipe to the extraction says so under its name. Open its card to connect it, or hire a production manager and it is done for you.',
  catalogue:
    'Every machine family has five classes: the effects come first, then the costs, then what it is.',
  workPlan: 'One row a job. A red figure on a job is material it does not have yet.',
  stock: 'Free is what a new job can have; reserved is what accepted jobs will use. Restock fills the low lines.',
  board: 'Every enquiry comes with a budget. Say yes and the client answers with a number.',
  finance: 'A loan costs what it costs: sixty instalments and the interest on what is left.',
  insurance: 'You can go without, but an accident then costs what an accident costs.',
  security: 'A firm takes the risk to zero. That is what fixed costs feel like.',
  contracts: 'Repeat work, steady money: what a day of it leaves depends on the man and the machine you put on it.',
  website: 'People buy with their eyes. Levels 1 to 3 change the enquiries; 4 and 5 add a little standing.',
  house: 'What you pay yourself every day is the house you sleep in.',
  team: 'The floor limits the crew: one person per so many square metres of free hall.',
  settings:
    'Tips on or off, and the workshop\'s own noise: a volume, and a mute for a quiet room.',
};

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

// ---------------------------------------------------------------------------
// Turn 13 phase C: the figures the phase B groups defined in their own modules, moved here
// (CLAUDE.md T13 2.1). Each keeps its tag and its comment.
// ---------------------------------------------------------------------------

/** What the button on a material take off says: the task is the take off, the click creates the
 *  list (PIOTR; CLAUDE.md T13 3.8). The laptop's task row reads it (a note for phase C). */
export const TAKE_OFF_BUTTON_LABEL = 'Create material list';

/** With no offer on the board and the reputation for one, the chance each working day that a
 *  shop rings with a standing contract [TUNE] (CLAUDE.md T13 3.16). */
export const CONTRACT_OFFER_CHANCE_PER_DAY = 0.15;

/** The quantity a week is drawn in steps of this many pieces, so an offer reads as a round
 *  number [TUNE]. */
export const CONTRACT_QUANTITY_STEP = 5;

/** The shops the contracts come from [TUNE: wording]. */
export const CONTRACT_CLIENTS: readonly string[] = [
  'Fairfield Shopfitters',
  'Northgate Interiors',
  'Hollis and Daughters',
  'Brightwater Displays',
  'Meadow Lane Kitchens',
  'Ashcombe Retail',
];

/** What the stock lines are called on the page, in the words of the software the player is meant
 *  to recognise [TUNE wording] (CLAUDE.md T13 3.2). */
export const STOCK_LINE_NAME: Record<MaterialKind, string> = {
  sheet: 'MFC 18 mm, white',
  solidWood: 'Oak, 27 mm',
};

/** The material kinds held on the rack as stock: the sheets, and nothing else tonight. Solid wood
 *  and bespoke material are ordered for the job and never held (CLAUDE.md T13 3.2, 3.3). */
export const STOCK_LINE_KINDS: readonly MaterialKind[] = ['sheet'];

/** The reputation tier the client's answer is neutral at: at it the draw is uniform in the band,
 *  under it the skew is negative and the offers land nearer the bottom of the band more often,
 *  over it nearer the top [TUNE 1, the tier of a new company at reputation 0]
 *  (CLAUDE.md T13 3.24). */
export const ANSWER_SKEW_NEUTRAL_TIER = 1;

/** The holidays the owner's card offers, in working days, the longest of them the cap the action
 *  applies [TUNE] (CLAUDE.md T13 3.9). */
export const HOLIDAY_OPTIONS_DAYS: readonly number[] = [1, 3, 5, HOLIDAY_MAX_DAYS];

// ---------------------------------------------------------------------------
// Turn 19: the sprayer, the drawings, the sound
// ---------------------------------------------------------------------------
// The swing's two figures (DOOR_SWING_MS, DOOR_CLOSE_MS) went with the swing itself, and
// STAND_IN_GAIN with the synthesised stand ins: a door is drawn closed and the hall is silent
// until Piotr's recordings land, so nothing reads any of the three (CLAUDE.md T20 2.12, 2.13).

/** The shortest a drawing can take, in minutes [TUNE] (CLAUDE.md T19 2.11). */
export const DESIGN_MIN_MINUTES = 30;
/** Minutes of drawing per 1,000 of the job's base price [TUNE]: 2,500 is an hour, 10,000 is four
 *  hours, 20,000 is eight. The software factor still divides it, and the per product figure and
 *  the size multiplier are gone (PIOTR, 17.09; CLAUDE.md T19 2.11). */
export const DESIGN_MINUTES_PER_1000 = 24;

/** The volume a fresh game and a lifted save start on, and unmuted [TUNE] (CLAUDE.md T19 2.10). */
export const SOUND_VOLUME_DEFAULT = 0.7;
/** What one press of Quieter or Louder moves the master volume by [TUNE]: nought to full in ten
 *  presses, fine enough to find a level and coarse enough to reach both ends
 *  (CLAUDE.md T19 2.10). */
export const SOUND_VOLUME_STEP = 0.1;
/** The shortest gap between two one shot sounds, in milliseconds of real time. At x10 and x30 the
 *  hall would rattle otherwise: the loops play at their own pitch and the one shots are thinned to
 *  at most one a second (CLAUDE.md T19 2.10). */
export const SOUND_ONE_SHOT_GAP_MS = 1000;
/** How often a hammer is heard from a bench in assembly, in seconds of real time [TUNE]. */
export const HAMMER_EVERY_SECONDS = 3;
/** How often a drill is heard from a bench in fitting, in seconds of real time [TUNE]. */
export const DRILL_EVERY_SECONDS = 4;
