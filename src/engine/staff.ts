// Hiring and the workforce. A joiner cannot start until he has a bench, a locker, a seat and a set
// of tools, exactly as in life (CLAUDE.md 9.3).

import {
  HIRE_START_DELAY_DAYS,
  MINUTES_PER_WORKING_DAY,
  HIRING_SPECS,
  JOINERS_PER_TABLE_SAW,
  JOINER_PREREQUISITES,
  TOOL_CABINET,
  OVER_SAW_RATIO_FACTOR,
  WORKER_NAMES,
  WORKER_RATES,
} from './constants';
import { addWorkingDays } from './clock';
import { assignJob, oldestReadyJob } from './jobs';
import { countOf, findSpec } from './machines';
import { int, makeId } from './rng';
import { STATION_IDLE } from './stations';
import type { GameState, HiringOption, Worker, WorkerRole, WorkerTier } from './types';

/** The roles that have a working day of their own, the way the owner does (CLAUDE.md T2 3.8).
 *  A helper still clears his workshop jobs at no cost, as in Turn 1. */
const OFFICE_ROLES: WorkerRole[] = ['officeAdmin', 'purchasingClerk', 'salesman'];

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

export function workerById(state: GameState, workerId: string): Worker | null {
  return state.workers.find((worker) => worker.id === workerId) ?? null;
}

/** On the books today and fit to work. The one predicate for it. */
export function isWorkingToday(state: GameState, worker: Worker): boolean {
  return worker.startDay <= state.clock.day && worker.absentDaysRemaining === 0;
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
    const count = wanted - countOf(state, specId);
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
    } else if (spec.role === 'joiner' && benchSlotsUsed > state.unit.benchSlots) {
      blockReason = 'No free bench slot in this unit';
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
    ordersToday: 0,
    station: STATION_IDLE,
    productionMinutes: 0,
    absentDaysRemaining: 0,
    anchorX: anchor.x,
    anchorY: anchor.y,
  };
  state.workers.push(worker);
  return worker;
}

/** One table saw per three joiners. Above that they queue and work slower (CLAUDE.md 9.3). */
export function sawRatioFactor(state: GameState, worker: Worker): number {
  if (worker.role !== 'joiner') return 1;
  const capacity = countOf(state, 'tableSaw') * JOINERS_PER_TABLE_SAW;
  const index = joiners(state).findIndex((entry) => entry.id === worker.id);
  if (index < 0) return 1;
  return index < capacity ? 1 : OVER_SAW_RATIO_FACTOR;
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
    worker.ordersToday = 0;
  }
}
