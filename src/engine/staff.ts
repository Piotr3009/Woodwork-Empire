// Hiring and the workforce. A joiner cannot start until he has a bench, a locker, a seat and a set
// of tools, exactly as in life (CLAUDE.md 9.3). The second shift lives here too: the men on it
// work after the day, at the night rate, with the owner gone home (CLAUDE.md T13 3.9).

import {
  ACCIDENT_CHANCE_PER_DAY,
  ACCIDENT_DAYS_OFF,
  HELPER_HOME_CELL,
  HIRE_START_DELAY_DAYS,
  MINUTES_PER_WORKING_DAY,
  NIGHT_ERROR_FACTOR,
  NIGHT_RATE,
  SECOND_SHIFT_MINUTES,
  HIRING_SPECS,
  JOINER_PREREQUISITES,
  LET_GO_NOTICE_DAYS,
  PRODUCING_ROLES,
  TIER_WORDS,
  TOOL_CABINET,
  WORKER_HOURS_PER_MONTH,
  WORKER_NAMES,
  WORKER_RATES,
} from './constants';
import { addWorkingDays, formatCalendarDay, isOvertime, isWorkingDay, monthOfDay } from './clock';
import { charge, formatMoney } from './economy';
import { queueEvent } from './events';
import { onAccident } from './insurance';
import { assignJob, findJob, oldestReadyJob, takeOffJob } from './jobs';
import { crewLimit } from './layout';
import {
  SPRAY_BOOTH,
  accidentRisk,
  breakMachine,
  findSpec,
  itemStandsInTheHall,
  overdueBreakdownChance,
  releaseMachines,
  releaseMachinesExcept,
} from './machines';
import { countOwnedOrOnOrder } from './orders';
import { managerOnDuty } from './owner';
import { effectiveReputation } from './reputation';
import { hands, workMinute } from './production';
import { chance, int, makeId } from './rng';
import { STATION_IDLE } from './stations';
import type {
  Equipment,
  GameState,
  HiringOption,
  Job,
  OwnerState,
  Shift,
  WeekCategory,
  WeekMeters,
  Worker,
  WorkerRole,
  WorkerTier,
} from './types';

/** What a trade is called, one man of it and several. The one table: the crew rows, Our team, the
 *  job's Assign list and the hire card's refusal all read it, so a sprayer is called a sprayer
 *  wherever he is named (CLAUDE.md T19 2.5, 2.6). It sits here and not in the UI because the
 *  refusal the hire card prints is written in this module: "extremely experienced joiners come
 *  from reputation 60" (PIOTR; CLAUDE.md T20 2.5). `src/ui/team.ts` hands `ROLE_WORDS` on. */
export const ROLE_WORDS: Record<WorkerRole, string> = {
  joiner: 'joiner',
  helper: 'helper',
  officeAdmin: 'office admin',
  purchasingClerk: 'purchasing clerk',
  salesman: 'salesman',
  draftsman: 'draftsman',
  estimator: 'estimator',
  productionManager: 'production manager',
  sprayer: 'sprayer',
};

/** The same trades, several of them: the plural is written out because a salesman is not a
 *  "salesmans" (CLAUDE.md 3: plain English, never the engine key). */
export const ROLE_WORDS_MANY: Record<WorkerRole, string> = {
  joiner: 'joiners',
  helper: 'helpers',
  officeAdmin: 'office admins',
  purchasingClerk: 'purchasing clerks',
  salesman: 'salesmen',
  draftsman: 'draftsmen',
  estimator: 'estimators',
  productionManager: 'production managers',
  sprayer: 'sprayers',
};

/** True for a man who produces. The one rule, asked by the board (CLAUDE.md T20 2.3). */
export function produces(role: WorkerRole): boolean {
  return PRODUCING_ROLES.includes(role);
}

/** The roles that have a working day of their own, the way the owner does (CLAUDE.md T2 3.8).
 *  A helper still clears his workshop jobs at no cost, as in Turn 1. */
const OFFICE_ROLES: WorkerRole[] = [
  'officeAdmin',
  'purchasingClerk',
  'salesman',
  'draftsman',
  'estimator',
  'productionManager',
];

/** The desks that sit in the office block behind the one who runs it: nobody at them before the
 *  office admin (PIOTR, CLAUDE.md T10 3.6). The estimator and the production manager are not on
 *  this list: the playthrough of CLAUDE.md T13 10.4 hires both without an admin, the estimator
 *  reads drawings and the manager runs the hall, and neither is the admin's specialist work. */
const BEHIND_THE_ADMIN: WorkerRole[] = ['purchasingClerk', 'salesman', 'draftsman'];

/** The roles that stand on the hall floor and so count against it: the crew the floor limits
 *  (CLAUDE.md T13 3.10). The office is in the office block. The production manager stands on the
 *  floor, because the floor is what he runs, and so does the sprayer, who is at the booth
 *  (CLAUDE.md T19 2.6). */
const FLOOR_ROLES: WorkerRole[] = ['joiner', 'helper', 'productionManager', 'sprayer'];

/** The crew on the floor, the owner among them (CLAUDE.md T13 3.10). */
export function crewCount(state: GameState): number {
  return 1 + state.workers.filter((worker) => FLOOR_ROLES.includes(worker.role)).length;
}

/** True when the floor has no room for one more of this role (CLAUDE.md T13 3.10). */
export function crewFull(state: GameState, role: WorkerRole): boolean {
  if (!FLOOR_ROLES.includes(role)) return false;
  return crewCount(state) + 1 > crewLimit(state);
}

/** "Crew 4 / 5, floor limited": what the team page says (CLAUDE.md T13 3.10). */
export function crewLine(state: GameState): string {
  return `Crew ${crewCount(state)} / ${crewLimit(state)}, floor limited`;
}

/** The office role every other one is hired behind. She is the base office person: emails,
 *  bookkeeping, the daily ordering, and every specialist's work at double time until he is taken
 *  on (PIOTR, CLAUDE.md T10 3.6, T7 3.12). */
export const BASE_OFFICE_ROLE: WorkerRole = 'officeAdmin';

/** True while the company has somebody on the books, or starting, who does the office. */
export function hasOfficeAdmin(state: GameState): boolean {
  return state.workers.some((worker) => worker.role === BASE_OFFICE_ROLE);
}

export function hasWorkingDay(role: WorkerRole): boolean {
  return OFFICE_ROLES.includes(role);
}

/** True for a man who works a job of work off minute by minute, the way the owner does: the
 *  office, and the helper with them (PIOTR, 16.09; CLAUDE.md T17 2.3). The helper used to clear
 *  an unload or a cleaning on the spot for nothing, in the same minute it was raised, so nobody
 *  ever saw him do it. He spends the minutes now. His day is the clock's and not a meter of his
 *  own: he is on the floor and he takes his dinner with the workshop, so only the office has the
 *  480 of `hasWorkingDay`. He goes home at five with the rest of them (CLAUDE.md T17 2.12). */
export function booksTaskMinutes(role: WorkerRole): boolean {
  return hasWorkingDay(role) || role === 'helper';
}

/** Minutes of his own day this man has left. */
export function staffMinutesLeft(worker: Worker): number {
  return Math.max(0, MINUTES_PER_WORKING_DAY - worker.minutesWorked);
}

/** What a man costs in a month, which from Turn 21 is simply what he is paid: everybody is on a
 *  monthly wage and nothing converts a week into one, so this is the field and no arithmetic
 *  (PIOTR, 19.09: "I wanted everyone monthly"; CLAUDE.md T21 2.10). Kept as the one reader the
 *  Our team row, the hiring gate and the Company board all go through, so the day a second pay
 *  cadence arrives there is one line to change (CLAUDE.md T17 2.9, 2.11). */
export function monthlyWageOf(pay: { monthlyWage: number }): number {
  return pay.monthlyWage;
}

/** One minute of this man's month, wherever he worked it: at the desk, at the bench or on the
 *  night shift. The Our team page reads his hours off it (CLAUDE.md T17 2.9). */
export function bookMonthMinute(worker: Worker): void {
  worker.monthMinutes += 1;
}

/** The month's meters on the owner and on every man, started again on the first working day of a
 *  new month: the hours worked and the days off are a month's figures (CLAUDE.md T17 2.9). The
 *  day that closed last says which month the workshop was in yesterday, so a month that turns
 *  over a weekend turns on the Monday. */
export function startMonthMeters(state: GameState): void {
  const last = state.days[state.days.length - 1];
  if (last !== undefined && monthOfDay(last.day) === monthOfDay(state.clock.day)) return;
  state.owner.monthMinutes = 0;
  state.owner.monthDaysOff = 0;
  for (const worker of state.workers) {
    worker.monthMinutes = 0;
    worker.monthDaysOff = 0;
  }
}

/** The days off of the month, counted the morning they are taken: the owner sick, away or at
 *  home, and a man off with an accident (CLAUDE.md T17 2.9). Called once a morning, after the
 *  absences of the day are known. */
export function countMonthDaysOff(state: GameState): void {
  if (!state.owner.present) state.owner.monthDaysOff += 1;
  for (const worker of state.workers) {
    if (worker.startDay > state.clock.day) continue;
    if (worker.absentDaysRemaining > 0) worker.monthDaysOff += 1;
  }
}

export function officeStaff(state: GameState): Worker[] {
  return state.workers.filter((worker) => hasWorkingDay(worker.role));
}

export function joiners(state: GameState): Worker[] {
  return state.workers.filter((worker) => worker.role === 'joiner');
}

export function helpers(state: GameState): Worker[] {
  return state.workers.filter((worker) => worker.role === 'helper');
}

/** A helper on the books and in the hall today. The unloading, the bags and the cleaning are his
 *  and nobody else's while this is true (PIOTR, 14.09; CLAUDE.md T11 3.4). */
export function helperOnDuty(state: GameState): boolean {
  return helpers(state).some((worker) => isWorkingToday(state, worker));
}

/** Where a man stands when the hall has nothing else for him. A joiner has his own bench; the
 *  helper stands at the fan when there is one and in the gate lane when there is not, because the
 *  bags and the van are his. Both are on the painted floor: (1, 1), where every man who is not a
 *  joiner used to be put, is inside the office block (CLAUDE.md T11 3.4). */
export function homeCellOf(state: GameState, worker: Worker): { x: number; y: number } {
  if (worker.role !== 'helper') return { x: worker.anchorX, y: worker.anchorY };
  const fan = state.equipment.find(
    (item) => item.specId === 'extractor' && itemStandsInTheHall(item),
  );
  if (fan) return { x: fan.anchorX, y: fan.anchorY };
  return { ...HELPER_HOME_CELL };
}

export function workerById(state: GameState, workerId: string): Worker | null {
  return state.workers.find((worker) => worker.id === workerId) ?? null;
}

// ---------------------------------------------------------------------------
// The two shifts (CLAUDE.md T13 3.9). A man is on the day shift or the night one, never both: he
// is in the hall by day or he is in it after the owner has gone home. One predicate says which,
// and everything that asks "who is here" asks it.
// ---------------------------------------------------------------------------

/** True while the second shift can run tonight: it is switched on and a production manager is on
 *  the books to run it. Without him there is no second shift (PIOTR; CLAUDE.md T13 3.9). */
export function secondShiftRuns(state: GameState): boolean {
  return state.shift.second && managerOnDuty(state);
}

/** Why the second shift cannot be switched on, or that it can: the one reason the team page
 *  prints and the action refuses on (CLAUDE.md T13 3.9). */
export function secondShiftCheck(state: GameState): { ok: boolean; reason: string } {
  if (managerOnDuty(state)) return { ok: true, reason: '' };
  const hired = state.workers.find((worker) => worker.role === 'productionManager');
  if (hired) {
    return {
      ok: false,
      reason: `The production manager starts on ${formatCalendarDay(hired.startDay)}`,
    };
  }
  return { ok: false, reason: 'Hire a production manager for a second shift' };
}

/** The shift this man actually works: the night one only while the second shift can run, or he
 *  would be on neither. Everybody who is not a joiner is on the day (CLAUDE.md T13 3.9). */
export function shiftOf(state: GameState, worker: Worker): Shift {
  if (worker.role !== 'joiner') return 'day';
  return secondShiftRuns(state) ? worker.shift : 'day';
}

/** On the books today and fit to work, whichever shift he is on. */
export function onTheBooksToday(state: GameState, worker: Worker): boolean {
  return worker.startDay <= state.clock.day && worker.absentDaysRemaining === 0;
}

/** On the books today, fit to work, and on this shift. The one predicate for it: the day asks
 *  it of everybody with no shift named, the night names its own, and a joiner on the second
 *  shift is never in the hall by day (CLAUDE.md T13 3.9, 10.3). */
export function isWorkingToday(state: GameState, worker: Worker, shift: Shift = 'day'): boolean {
  return onTheBooksToday(state, worker) && shiftOf(state, worker) === shift;
}

/** The men on the second shift tonight: the joiners put on it who are on the books and fit. */
export function nightCrew(state: GameState): Worker[] {
  return joiners(state).filter((worker) => isWorkingToday(state, worker, 'night'));
}

// ---------------------------------------------------------------------------
// The end of the day (PIOTR, 17.09; CLAUDE.md T17 2.12). The men go home at five, always. The
// evening is the owner's alone: he stays if he wants it, and he takes a job on by a click on the
// row, never automatically. The two hours of staff overtime of Turn 8 are gone with the rule, and
// with them the Friday overtime line and the man who had had enough of the evenings.
// ---------------------------------------------------------------------------

/** True once the hired men have gone home, which is five o'clock whatever the owner does. The one
 *  predicate for it: production, the standing contracts and the efficiency seats all ask it
 *  (PIOTR, 17.09; CLAUDE.md T17 2.12). */
export function crewHasGoneHome(state: GameState): boolean {
  return isOvertime(state.clock.minute);
}

/** The joiners of this shift who are in today and on no job. */
export function availableJoiners(state: GameState, shift: Shift = 'day'): Worker[] {
  return joiners(state).filter(
    (worker) => isWorkingToday(state, worker, shift) && worker.jobId === null,
  );
}

/** How many tool cabinets the workshop owes: one for every joiner and one for the owner, and one
 *  more when somebody is about to be taken on (CLAUDE.md T6 3.5). */
export function cabinetsNeeded(state: GameState, hiring = 0): number {
  return joiners(state).length + hiring + 1;
}

/** Kit the workshop is short of before this hire can start, and how many of each: the first hire
 *  needs two cabinets, one for the new man and one for the owner (CLAUDE.md T6 3.5). The one
 *  count the block, the bill and the words on the card are all read off. */
export function shortfallForHire(
  state: GameState,
  role: WorkerRole,
): Array<{ specId: string; count: number }> {
  if (role !== 'joiner') return [];
  const needed = joiners(state).length + 1;
  const short: Array<{ specId: string; count: number }> = [];
  for (const specId of JOINER_PREREQUISITES) {
    const wanted = specId === TOOL_CABINET ? cabinetsNeeded(state, 1) : needed;
    // A bench that is bought and on the lorry is a bench: the man starts the next working day and
    // it lands at 08:00 that morning (CLAUDE.md T8 3.2).
    const count = wanted - countOwnedOrOnOrder(state, specId);
    if (count > 0) short.push({ specId, count });
  }
  return short;
}

/** The catalogue ids the hire is waiting on, one entry each however many are short. */
export function missingForHire(state: GameState, role: WorkerRole): string[] {
  return shortfallForHire(state, role).map((entry) => entry.specId);
}

/** What buying the shortfall comes to, every unit of it counted. */
export function missingCost(state: GameState, role: WorkerRole): number {
  return shortfallForHire(state, role).reduce(
    (total, entry) => total + entry.count * (findSpec(entry.specId)?.price ?? 0),
    0,
  );
}

/** The shortfall in plain English, so no catalogue id ever reaches the card (CLAUDE.md 3). */
export function missingLabelsForHire(state: GameState, role: WorkerRole): string[] {
  return shortfallForHire(state, role).map((entry) => {
    const name = findSpec(entry.specId)?.name ?? entry.specId;
    return entry.count > 1 ? `${name} x ${entry.count}` : name;
  });
}

/** What the card says when the workshop is not known enough for this man: who applies depends on
 *  the standing the workshop has earned, and the card says what is missing, in the game's own
 *  words (PIOTR: "extremely experienced joiners come from reputation 60"; CLAUDE.md T20 2.5). A
 *  role with no classes to it says the same thing about the trade itself. */
export function standingWanted(
  role: WorkerRole,
  tier: WorkerTier | null,
  minReputation: number,
): string {
  const who =
    tier === null ? ROLE_WORDS_MANY[role] : `${TIER_WORDS[tier]} ${ROLE_WORDS_MANY[role]}`;
  return `${who} come from reputation ${minReputation}`;
}

/** Everything the hiring modal needs, one row per role and tier. */
export function hiringOptions(state: GameState): HiringOption[] {
  return HIRING_SPECS.map((spec) => {
    const missing = missingLabelsForHire(state, spec.role);
    const benchSlotsUsed = spec.role === 'joiner' ? joiners(state).length + 1 : 0;
    let blockReason = '';
    // The figure the player reads on the board, website bonus and all: `effectiveReputation` is
    // the one function the tier tables go through, and who answers an advert is a tier table
    // (CLAUDE.md T13 3.7, T20 2.5).
    if (effectiveReputation(state) < spec.minReputation) {
      blockReason = standingWanted(spec.role, spec.tier, spec.minReputation);
    } else if (BEHIND_THE_ADMIN.includes(spec.role) && !hasOfficeAdmin(state)) {
      // Nobody in the office before the one who runs it (PIOTR, CLAUDE.md T10 3.6).
      blockReason = 'Hire an office admin first';
    } else if (spec.role === 'joiner' && benchSlotsUsed > state.unit.benchSlots) {
      blockReason = 'No free bench slot in this unit';
    } else if (crewFull(state, spec.role)) {
      // The floor limits the crew: one person per so many square metres of free floor
      // (PIOTR; CLAUDE.md T13 3.10).
      blockReason = crewLine(state);
    } else if (missing.length > 0) {
      blockReason = `Buy first: ${missing.join(', ')}`;
    } else if (state.cash < spec.monthlyWage) {
      // Last of the refusals, because it is the only one that changes by the minute: who answers
      // the advert, what the office wants first, the bench and the kit are all standing facts,
      // and the bank balance is what an owner looks at once the rest of it is ready. A man is not
      // taken on without a month of his pay in the account (PIOTR, 17.09; CLAUDE.md T17 2.11).
      blockReason = `Not enough in the bank: needs ${formatMoney(spec.monthlyWage)}`;
    }
    return {
      role: spec.role,
      tier: spec.tier,
      label: spec.label,
      rate: spec.tier ? WORKER_RATES[spec.tier] : 0,
      monthlyWage: spec.monthlyWage,
      minReputation: spec.minReputation,
      available: blockReason === '',
      blockReason,
      missing,
      missingCost: missingCost(state, spec.role),
    };
  });
}

export function canHire(
  state: GameState,
  role: WorkerRole,
  tier: WorkerTier | null,
): { ok: boolean; reason: string } {
  const option = hiringOptions(state).find(
    (entry) => entry.role === role && entry.tier === tier,
  );
  if (!option) return { ok: false, reason: 'No such job' };
  return { ok: option.available, reason: option.blockReason };
}

function nameFor(state: GameState): string {
  const taken = new Set(state.workers.map((worker) => worker.name));
  const free = WORKER_NAMES.filter((name) => !taken.has(name));
  const pool = free.length > 0 ? free : WORKER_NAMES;
  return pool[int(state, 0, pool.length - 1)] ?? 'Sam';
}

function benchAnchor(state: GameState, role: WorkerRole): { x: number; y: number } {
  // The helper's own corner of the hall, and the office door for everybody else (T11 3.4).
  if (role === 'helper') return { ...HELPER_HOME_CELL };
  // The sprayer's place is the booth, if the hall has one: he is a floor man and (1, 1) is
  // inside the office block (CLAUDE.md T19 2.6, T11 3.4).
  if (role === 'sprayer') {
    const booth = state.equipment.find(
      (item) => item.specId === SPRAY_BOOTH && itemStandsInTheHall(item),
    );
    return booth ? { x: booth.anchorX, y: booth.anchorY } : { x: 0, y: 4 };
  }
  if (role !== 'joiner') return { x: 1, y: 1 };
  const index = joiners(state).length;
  const bench = state.equipment.filter((item) => item.specId === 'workbench')[index];
  if (bench) return { x: bench.anchorX, y: bench.anchorY };
  return { x: 0, y: 4 };
}

/** Takes somebody on. He starts the next working day (CLAUDE.md 9.3). */
export function hire(state: GameState, role: WorkerRole, tier: WorkerTier | null): Worker | null {
  const allowed = canHire(state, role, tier);
  if (!allowed.ok) return null;
  const spec = HIRING_SPECS.find((entry) => entry.role === role && entry.tier === tier);
  if (!spec) return null;
  const anchor = benchAnchor(state, role);
  const worker: Worker = {
    id: makeId(state, 'staff'),
    name: nameFor(state),
    role,
    tier,
    rate: tier ? WORKER_RATES[tier] : 0,
    monthlyWage: spec.monthlyWage,
    startDay: addWorkingDays(state.clock.day, HIRE_START_DELAY_DAYS),
    leavesOnDay: null,
    jobId: null,
    taskId: null,
    minutesWorked: 0,
    overtimeMinutes: 0,
    overtimeMinutesWeek: 0,
    overtimeDays: 0,
    tiredOfOvertime: false,
    ordersToday: 0,
    station: STATION_IDLE,
    productionMinutes: 0,
    absentDaysRemaining: 0,
    anchorX: anchor.x,
    anchorY: anchor.y,
    shift: 'day',
    dayLog: [],
    monthMinutes: 0,
    monthDaysOff: 0,
  };
  state.workers.push(worker);
  return worker;
}

/** A free joiner of this shift takes the oldest job whose material has arrived (CLAUDE.md 9.4).
 *  The assignment itself goes through the one path in jobs.ts. The day asks for the day men; the
 *  night asks for its own, so the work plan gives a night man his job the way it gives a day man
 *  his (CLAUDE.md T13 3.9). */
export function autoAssignJobs(state: GameState, shift: Shift = 'day'): void {
  for (const worker of availableJoiners(state, shift)) {
    const job = oldestReadyJob(state);
    if (!job || job.assignees.length > 0) return;
    assignJob(state, job.id, worker.id);
  }
}

// ---------------------------------------------------------------------------
// The week, man by man (PIOTR; CLAUDE.md T20 2.7). Our team says what this week was and what last
// week was: the hours, where they went, the pieces a contract took off him, the jobs he stood at
// and the one efficiency figure of the week. The meters are filled a minute at a time by the
// sampler in `src/engine/tasks.ts`, which is the one hook the day already runs over the crew
// every minute, and they roll over on the first minute of a new week.
// ---------------------------------------------------------------------------

/** The order the row prints them in. */
export const WEEK_CATEGORIES: ReadonlyArray<WeekCategory> = [
  'jobs',
  'contracts',
  'unloading',
  'cleaning',
  'desk',
  'site',
];

/** What his own counters say he has put in: the bench and contract minutes the production runner
 *  raises and the task minutes the task runner raises. The one reading of whether the minute just
 *  gone was worked at all: a man at an empty rack, or one standing at a saw another man is on,
 *  keeps his job and his task and raises neither (CLAUDE.md T20 2.7). */
export function effortSoFar(holder: Worker | OwnerState): { bench: number; task: number } {
  return { bench: holder.productionMinutes, task: holder.minutesWorked };
}

/** Who carries a week: a man on the books or the owner. Both declare the two fields and the bench
 *  counter a fresh week seeds itself off, so there is no cast (CLAUDE.md T20 2.7). */
export type WeekHolder = Worker | OwnerState;

function freshMeters(week: number, bench: number): WeekMeters {
  return {
    week,
    minutes: { jobs: 0, contracts: 0, unloading: 0, cleaning: 0, desk: 0, site: 0 },
    paidMinutes: 0,
    pieces: 0,
    jobs: [],
    day: 0,
    minute: -1,
    seenBench: bench,
    seenTask: 0,
  };
}

/** The meters of the week in hand, made and rolled over if the week has turned. The write side:
 *  only the sampler calls it. A new week starts from where his bench counter stands, so the first
 *  minute of it is not credited with every minute he has ever worked. */
export function weekMetersOf(holder: WeekHolder, week: number): WeekMeters {
  const held = holder.weekNow;
  if (held !== undefined && held.week === week) return held;
  if (held !== undefined) holder.weekBefore = held;
  holder.weekNow = freshMeters(week, holder.productionMinutes);
  return holder.weekNow;
}

/** This week's meters, or null while nothing has been counted into them. Read only: the page asks
 *  this and never the one above, because a render writes nothing. */
export function weekNowOf(holder: WeekHolder, week: number): WeekMeters | null {
  const held = holder.weekNow;
  return held !== undefined && held.week === week ? held : null;
}

/** Last week's meters, or null. The week before this one is either the pair that has been rolled
 *  aside or the one still in hand from a week nobody has played into yet. */
export function weekBeforeOf(holder: WeekHolder, week: number): WeekMeters | null {
  if (holder.weekNow !== undefined && holder.weekNow.week === week - 1) return holder.weekNow;
  const before = holder.weekBefore;
  return before !== undefined && before !== null && before.week === week - 1 ? before : null;
}

/** The minutes of the week, all six bands of them: the hours the row prints. */
export function weekWorkedMinutes(meters: WeekMeters): number {
  return WEEK_CATEGORIES.reduce((total, band) => total + meters.minutes[band], 0);
}

/** What he earned the company for the minutes it paid for: his rate times the minutes he spent
 *  making something, over the minutes on the clock while he was on the books. One figure a week
 *  (CLAUDE.md T20 2.7). Nought while nothing has been paid for yet. */
export function weekEfficiency(rate: number, meters: WeekMeters): number {
  if (meters.paidMinutes <= 0) return 0;
  const making = meters.minutes.jobs + meters.minutes.contracts;
  return (rate * making) / meters.paidMinutes;
}

// ---------------------------------------------------------------------------
// Letting a man go (PIOTR, 18.09: "how do I fire people?"; CLAUDE.md T20 2.4). He works a week's
// notice out, he is paid for it, and the morning after his last day his jobs and his contracts
// are short of a man and the plan says so. It costs no reputation: a workshop that cannot carry
// somebody lets him go, and the trade thinks nothing of it.
// ---------------------------------------------------------------------------

/** Why this man cannot be let go, or that he can. The one refusal: the row asks it before it
 *  draws the control, so a button the engine would refuse is never drawn (CLAUDE.md T4 3.2). */
export function letGoCheck(state: GameState, workerId: string): { ok: boolean; reason: string } {
  const worker = workerById(state, workerId);
  if (!worker) return { ok: false, reason: 'No such person' };
  if (worker.leavesOnDay !== null) {
    return { ok: false, reason: `leaves on ${formatCalendarDay(worker.leavesOnDay)}` };
  }
  return { ok: true, reason: '' };
}

/** Gives him his notice. He stays on the books, on his job and on his contract, and is paid, to
 *  the end of the last day of it; `runStaffDayStart` is what walks him out of the gate the
 *  morning after (CLAUDE.md T20 2.4). */
export function letGo(state: GameState, workerId: string): boolean {
  if (!letGoCheck(state, workerId).ok) return false;
  const worker = workerById(state, workerId);
  if (!worker) return false;
  worker.leavesOnDay = state.clock.day + LET_GO_NOTICE_DAYS;
  return true;
}

/** The morning the notice is up: he is off the books, off his job and off his contract, and what
 *  he was holding goes back on the list for somebody else. The plan draws his jobs with nobody on
 *  them, which is the hole the player has to fill (CLAUDE.md T20 2.4). */
function walkOutTheGone(state: GameState): Worker[] {
  const gone = state.workers.filter(
    (worker) => worker.leavesOnDay !== null && worker.leavesOnDay < state.clock.day,
  );
  for (const worker of gone) {
    const job = worker.jobId === null ? null : findJob(state, worker.jobId);
    if (job) takeOffJob(state, job.id, worker.id);
    // The contracts are told here and not through `assignContract`, because contracts.ts reads
    // this module and the two cannot read each other (REPORT-T20.md, what was not done).
    for (const contract of state.contracts) {
      contract.assigned = contract.assigned.filter((id) => id !== worker.id);
    }
    if (worker.taskId !== null) {
      const task = state.tasks.find((entry) => entry.id === worker.taskId);
      if (task) task.doneBy = null;
      worker.taskId = null;
    }
    releaseMachines(state, worker.id);
    // `workerQuit` is the one kind the game has for a man going off the books. It was written for
    // the overtime quit of Turn 8, which went with the evenings in Turn 17, and nothing has raised
    // it since; a man let go leaves by the same gate (GameEventKind is in the frozen types.ts,
    // and REPORT-T20.md says so under what was not done).
    queueEvent(state, {
      kind: 'workerQuit',
      title: 'He has gone',
      body: `${worker.name} has worked his notice out and left. Anything he was on is nobody\u0027s now.`,
      data: { workerId: worker.id, name: worker.name },
    });
  }
  if (gone.length > 0) {
    const ids = new Set(gone.map((worker) => worker.id));
    state.workers = state.workers.filter((worker) => !ids.has(worker.id));
  }
  return gone;
}

/** Counts down an injured joiner's days off and hands everybody a fresh day. What a man did not
 *  finish yesterday he is still holding this morning (CLAUDE.md T2 3.8). The men whose notice ran
 *  out yesterday are walked out first: they are not handed a day (CLAUDE.md T20 2.4). */
export function runStaffDayStart(state: GameState): void {
  walkOutTheGone(state);
  for (const worker of state.workers) {
    if (worker.absentDaysRemaining > 0) worker.absentDaysRemaining -= 1;
    worker.minutesWorked = 0;
    worker.ordersToday = 0;
    worker.dayLog = [];
  }
}

// ---------------------------------------------------------------------------
// Getting hurt (CLAUDE.md 9.7, T13 3.9). One path for a man who is hurt, by day or by night: the
// day's roll in game.ts and the night's here both put him through it.
// ---------------------------------------------------------------------------

/** Puts this man off for the accident's days, takes him off his job, tells the player and, with
 *  no liability cover, brings the claim (CLAUDE.md 9.7, T13 3.15). */
export function hurtWorker(
  state: GameState,
  worker: Worker,
  options: { night?: boolean } = {},
): void {
  worker.absentDaysRemaining = ACCIDENT_DAYS_OFF;
  // He comes off the job and nobody else does: one man cutting his hand does not stop a job four
  // men are standing at (CLAUDE.md T19 2.5). The job falls back to the list only if he was the
  // last on it.
  const job = worker.jobId ? findJob(state, worker.jobId) : null;
  if (job) takeOffJob(state, job.id, worker.id);
  const where = options.night === true ? 'on the night shift, with nobody to see it' : 'in all that mess';
  queueEvent(state, {
    kind: 'accident',
    title: options.night === true ? 'Accident on the night shift' : 'Accident in the hall',
    body: `${worker.name} has been hurt ${where}. He is off for ${ACCIDENT_DAYS_OFF} days.`,
    data: { workerId: worker.id, days: ACCIDENT_DAYS_OFF, night: options.night === true },
  });
  onAccident(state, worker.name);
}

/** The night's error chance: the day's accident roll, doubled, with the owner not there to see
 *  the hall (PIOTR: "the error chance is doubled"; CLAUDE.md T13 3.9). Rolled once a night over
 *  the men who worked it, in a hall that is dangerous. The man hurt, or null. */
export function rollNightAccident(state: GameState, crew: readonly Worker[]): Worker | null {
  if (crew.length === 0 || !accidentRisk(state)) return null;
  if (!chance(state, ACCIDENT_CHANCE_PER_DAY * NIGHT_ERROR_FACTOR)) return null;
  const worker = crew[int(state, 0, crew.length - 1)];
  if (!worker) return null;
  hurtWorker(state, worker, { night: true });
  return worker;
}

/** The same doubling on the machines the night ran: every one of them past its service or its
 *  endurance can give up at twice the day's chance (CLAUDE.md T13 3.9). Returns what broke, for
 *  the repair task and the event, which game.ts raises. Not called by `runNightShift` itself
 *  until the day end raises them (the note for phase C says where). */
export function rollNightBreakdowns(state: GameState, usedMachineIds: readonly string[]): Equipment[] {
  const broken: Equipment[] = [];
  for (const id of usedMachineIds) {
    const item = state.equipment.find((entry) => entry.id === id);
    if (!item) continue;
    if (!chance(state, overdueBreakdownChance(item) * NIGHT_ERROR_FACTOR)) continue;
    const gone = breakMachine(state, id);
    if (gone) broken.push(gone);
  }
  return broken;
}

// ---------------------------------------------------------------------------
// The second shift (CLAUDE.md T13 3.9). "A small firm runs a second shift out of necessity, not
// luxury, because it cannot make the deadline" (PIOTR).
// ---------------------------------------------------------------------------

/** What the night costs on top of a man's month: his hourly wage, which is his month over the hours
 *  a month of him is, for the hours of the shift, at the night rate less the one his wage already
 *  pays. The monthly wage goes out on the last working day of the month and covers his hours
 *  whichever shift they are on; the night's premium is the quarter on top, booked the night it is
 *  worked (PIOTR: 1.25 of salary for those hours; CLAUDE.md T13 3.9, T21 2.10). */
export function nightPremiumFor(worker: Worker): number {
  const hourly = worker.monthlyWage / WORKER_HOURS_PER_MONTH;
  const premium = hourly * (SECOND_SHIFT_MINUTES / 60) * (NIGHT_RATE - 1);
  return Math.round(premium * 100) / 100;
}

/** What the night did, for the day end and for the events game.ts raises after it. */
export interface NightReport {
  /** True when the shift ran: it was on, a manager was on the books, and it was a working day. */
  ran: boolean;
  /** The men who were on it, by id. */
  crew: string[];
  /** Person minutes that went into jobs. */
  minutes: number;
  /** The premium booked to the ledger as `wagesNight`. */
  premium: number;
  /** Jobs the night finished: they stand at the gate in the morning. */
  finished: Job[];
  /** The bag store filled during the night. */
  bagsFull: boolean;
  /** A man was hurt on the shift. */
  hurt: Worker | null;
  /** Every machine somebody stood at tonight, for the breakdown roll. */
  usedMachineIds: string[];
}

function noNight(): NightReport {
  return {
    ran: false,
    crew: [],
    minutes: 0,
    premium: 0,
    finished: [],
    bagsFull: false,
    hurt: null,
    usedMachineIds: [],
  };
}

/** The second shift: the men on it work after the day, at the night rate, with the owner absent
 *  from the hall, only while a production manager is on the books and the switch is on
 *  (CLAUDE.md T13 3.9). Called by the day end once the owner has gone home. The night puts its
 *  minutes into the same jobs by the same arithmetic as the day (`workMinute`), on the jobs the
 *  work plan gives the men, and the premium goes on the ledger the night it is worked. Quality
 *  and the error chance are the night's own: every minute is written on the job as a night one,
 *  and the accident roll is doubled. */
export function runNightShift(state: GameState): NightReport {
  if (!secondShiftRuns(state) || !isWorkingDay(state.clock.day)) return noNight();
  const crew = nightCrew(state);
  if (crew.length === 0) return noNight();
  const report: NightReport = { ...noNight(), ran: true, crew: crew.map((worker) => worker.id) };
  // Everybody who went home at five walks away from his machine before the night starts.
  releaseMachinesExcept(state, []);
  const used = new Set<string>();
  for (let minute = 0; minute < SECOND_SHIFT_MINUTES; minute += 1) {
    autoAssignJobs(state, 'night');
    const working = hands(state, { owner: false, shift: 'night' });
    if (working.length === 0) break;
    const done = workMinute(state, working, { night: true });
    report.minutes += done.worked;
    report.finished.push(...done.finished);
    report.bagsFull = report.bagsFull || done.bagsFull;
    for (const id of done.usedMachineIds) used.add(id);
  }
  report.usedMachineIds = [...used];
  // Nobody stands at a machine overnight (CLAUDE.md T7 3.1).
  releaseMachinesExcept(state, []);
  // The premium is for the shift the man turned up for, not for the minutes the rack let him
  // work: he is paid to be there (CLAUDE.md T13 1, nothing is free).
  const premium = Math.round(crew.reduce((sum, worker) => sum + nightPremiumFor(worker), 0) * 100) / 100;
  if (premium > 0) {
    charge(state, 'wagesNight', 'Night shift premium', -premium, { unavoidable: true });
    report.premium = premium;
  }
  report.hurt = rollNightAccident(state, crew);
  return report;
}
