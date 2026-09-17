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
  TOOL_CABINET,
  WEEKS_PER_MONTH,
  WORKER_HOURS_PER_WEEK,
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
  accidentRisk,
  breakMachine,
  findSpec,
  itemStandsInTheHall,
  overdueBreakdownChance,
  releaseMachinesExcept,
} from './machines';
import { countOwnedOrOnOrder } from './orders';
import { managerOnDuty } from './owner';
import { hands, workMinute } from './production';
import { chance, int, makeId } from './rng';
import { STATION_IDLE } from './stations';
import type {
  Equipment,
  GameState,
  HiringOption,
  Job,
  Shift,
  Worker,
  WorkerRole,
  WorkerTier,
} from './types';

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
 *  floor, because the floor is what he runs. */
const FLOOR_ROLES: WorkerRole[] = ['joiner', 'helper', 'productionManager'];

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

/** What a man costs in a month, whichever way he is paid: the office carries a monthly wage and
 *  the floor a weekly one, and a week is 30 over 7 of a month. The one conversion: the Our team
 *  row prints it and the hiring gate refuses on it (CLAUDE.md T17 2.9, 2.11). */
export function monthlyPay(pay: { weeklyWage: number; monthlyWage: number }): number {
  if (pay.monthlyWage > 0) return Math.round(pay.monthlyWage * 100) / 100;
  return Math.round(pay.weeklyWage * WEEKS_PER_MONTH * 100) / 100;
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

/** Everything the hiring modal needs, one row per role and tier. */
export function hiringOptions(state: GameState): HiringOption[] {
  return HIRING_SPECS.map((spec) => {
    const missing = missingLabelsForHire(state, spec.role);
    const benchSlotsUsed = spec.role === 'joiner' ? joiners(state).length + 1 : 0;
    let blockReason = '';
    if (state.reputation < spec.minReputation) {
      blockReason = `Nobody of this standing answers yet, reputation ${spec.minReputation}`;
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
    } else if (state.cash < monthlyPay(spec)) {
      // Last of the refusals, because it is the only one that changes by the minute: who answers
      // the advert, what the office wants first, the bench and the kit are all standing facts,
      // and the bank balance is what an owner looks at once the rest of it is ready. A man is not
      // taken on without a month of his pay in the account (PIOTR, 17.09; CLAUDE.md T17 2.11).
      blockReason = `Not enough in the bank: needs ${formatMoney(monthlyPay(spec))}`;
    }
    return {
      role: spec.role,
      tier: spec.tier,
      label: spec.label,
      rate: spec.tier ? WORKER_RATES[spec.tier] : 0,
      weeklyWage: spec.weeklyWage,
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
    weeklyWage: spec.weeklyWage,
    monthlyWage: spec.monthlyWage,
    startDay: addWorkingDays(state.clock.day, HIRE_START_DELAY_DAYS),
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

/** Counts down an injured joiner's days off and hands everybody a fresh day. What a man did not
 *  finish yesterday he is still holding this morning (CLAUDE.md T2 3.8). */
export function runStaffDayStart(state: GameState): void {
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

/** What the night costs on top of a man's week: his hourly wage, which is his week over forty,
 *  for the hours of the shift, at the night rate less the one his weekly wage already pays. The
 *  weekly wage goes out on Friday as it always did and covers his hours whichever shift they are
 *  on; the night's premium is the quarter on top, booked the night it is worked
 *  (PIOTR: 1.25 of salary for those hours; CLAUDE.md T13 3.9). */
export function nightPremiumFor(worker: Worker): number {
  const hourly = worker.weeklyWage / WORKER_HOURS_PER_WEEK;
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
