// Hiring and the workforce. A joiner cannot start until he has a bench, a locker, a seat and a set
// of tools, exactly as in life (CLAUDE.md 9.3).

import {
  HELPER_HOME_CELL,
  HIRE_START_DELAY_DAYS,
  MINUTES_PER_WORKING_DAY,
  OVERTIME_TIRED_DAYS,
  STAFF_OVERTIME_MAX_MINUTES,
  HIRING_SPECS,
  JOINER_PREREQUISITES,
  TOOL_CABINET,
  WORKER_NAMES,
  WORKER_RATES,
} from './constants';
import { addWorkingDays, isOvertime } from './clock';
import { assignJob, oldestReadyJob } from './jobs';
import { crewLimit } from './layout';
import { findSpec, itemStandsInTheHall } from './machines';
import { countOwnedOrOnOrder } from './orders';
import { ownerIsAvailable } from './owner';
import { int, makeId } from './rng';
import { STATION_IDLE } from './stations';
import type { GameState, HiringOption, Worker, WorkerRole, WorkerTier } from './types';

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

/** The roles that stand on the hall floor and so count against it: the crew the floor limits
 *  (CLAUDE.md T13 3.10). The office is in the office block. */
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

/** Minutes of his own day this man has left. */
export function staffMinutesLeft(worker: Worker): number {
  return Math.max(0, MINUTES_PER_WORKING_DAY - worker.minutesWorked);
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

/** On the books today and fit to work. The one predicate for it. */
export function isWorkingToday(state: GameState, worker: Worker): boolean {
  return worker.startDay <= state.clock.day && worker.absentDaysRemaining === 0;
}

// ---------------------------------------------------------------------------
// Overtime (CLAUDE.md T8 3.6). The hall stays with the owner or it goes home: nobody works an
// evening he is not there for. Two hours is what a man will do, and three evenings in a row are
// what he remembers at the month end.
// ---------------------------------------------------------------------------

/** The roles that stay: the men on the floor. The office goes home at five whatever happens. */
export function worksOvertime(role: WorkerRole): boolean {
  return role === 'joiner' || role === 'helper';
}

/** True while this man is still standing in the hall past five: on the floor, on the books today,
 *  and under the two hours he will do (PIOTR, CLAUDE.md T8 3.6). */
export function staysForOvertime(state: GameState, worker: Worker): boolean {
  if (!worksOvertime(worker.role)) return false;
  if (!isWorkingToday(state, worker)) return false;
  return worker.overtimeMinutes < STAFF_OVERTIME_MAX_MINUTES;
}

/** Books one minute past 17:00 against every man who stayed. Nobody stays on a day the owner is
 *  not there to stay with them (CLAUDE.md T8 3.6). */
export function countStaffOvertimeMinute(state: GameState): void {
  if (!isOvertime(state.clock.minute) || !ownerIsAvailable(state)) return;
  for (const worker of state.workers) {
    if (!staysForOvertime(state, worker)) continue;
    worker.overtimeMinutes += 1;
    worker.overtimeMinutesWeek += 1;
  }
}

/** Written at the end of every working day: a man who stayed adds an evening to his run, a man
 *  who went home at five ends it, and three in a row is what tires him (CLAUDE.md T8 3.6). */
export function recordStaffOvertime(state: GameState): void {
  for (const worker of state.workers) {
    if (worker.overtimeMinutes > 0) {
      worker.overtimeDays += 1;
      if (worker.overtimeDays >= OVERTIME_TIRED_DAYS) worker.tiredOfOvertime = true;
      continue;
    }
    worker.overtimeDays = 0;
  }
}

export function availableJoiners(state: GameState): Worker[] {
  return joiners(state).filter(
    (worker) => isWorkingToday(state, worker) && worker.jobId === null,
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
    } else if (
      hasWorkingDay(spec.role) &&
      spec.role !== BASE_OFFICE_ROLE &&
      !hasOfficeAdmin(state)
    ) {
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
  };
  state.workers.push(worker);
  return worker;
}

/** A free joiner takes the oldest job whose material has arrived (CLAUDE.md 9.4). The assignment
 *  itself goes through the one path in jobs.ts. */
export function autoAssignJobs(state: GameState): void {
  for (const worker of availableJoiners(state)) {
    const job = oldestReadyJob(state);
    if (!job || job.assignedTo !== null) return;
    assignJob(state, job.id, worker.id);
  }
}

/** Counts down an injured joiner's days off and hands everybody a fresh day. What a man did not
 *  finish yesterday he is still holding this morning (CLAUDE.md T2 3.8). */
export function runStaffDayStart(state: GameState): void {
  for (const worker of state.workers) {
    if (worker.absentDaysRemaining > 0) worker.absentDaysRemaining -= 1;
    worker.minutesWorked = 0;
    worker.overtimeMinutes = 0;
    worker.ordersToday = 0;
    worker.dayLog = [];
  }
}

/** The second shift: the men on it work after the day, at the night rate, with the owner absent
 *  from the hall, only while a production manager is on the books (CLAUDE.md T13 3.9). Phase B2
 *  writes it; phase A hands the day end the hook. */
export function runNightShift(state: GameState): void {
  void state;
}
