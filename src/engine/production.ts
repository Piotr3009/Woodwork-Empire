// Who is standing at which machine this minute (CLAUDE.md T7 3.1).
//
// A machine is free or it is taken by one man. This module says who wants one, who gets one and
// who stands and waits at it, and it is the one place that knows both the stages of a job and the
// people in the hall.

import { HOURS_PER_WORKING_DAY } from './constants';
import { addWorkingDays, isBreak } from './clock';
import { findJob } from './jobs';
import {
  BENCH,
  OWNER,
  cabinetTools,
  claimMachine,
  countOf,
  findSpec,
  has,
  heldMachine,
  machineIsShared,
  releaseMachines,
  releaseMachinesExcept,
  serviceDueIn,
} from './machines';
import { ownerEfficiency, ownerIsAvailable } from './owner';
import { isWorkingToday } from './staff';
import { STATION_BENCH, machineStation, waitingStation } from './stations';
import {
  type StagePlan,
  cncOptions,
  currentStage,
  stageMinutes,
  stagePlanFor,
} from './stages';
import type { Equipment, GameState, Job } from './types';

/** One man who could put a minute into a job right now. */
export interface Hand {
  /** 'owner', or a worker id. */
  who: string;
  job: Job;
  /** What a minute of his is worth against a minute of the owner's at his best. */
  rate: number;
}

/** The job this man is on, in production, or null. */
export function jobOf(state: GameState, who: string): Job | null {
  const job = state.jobs.find((entry) => entry.assignedTo === who) ?? null;
  return job !== null && job.stage === 'inProduction' ? job : null;
}

/** Everybody who is standing at a job this minute, the owner first. Order matters only for who
 *  reaches a free machine first: a man already at one keeps it, so nobody is ever turned off a
 *  machine he is standing at. */
export function hands(state: GameState, options: { owner?: boolean; staff?: boolean } = {}): Hand[] {
  const list: Hand[] = [];
  const ownerJob = jobOf(state, OWNER);
  if (options.owner !== false && ownerJob && ownerIsAvailable(state)) {
    list.push({ who: OWNER, job: ownerJob, rate: ownerEfficiency(state) });
  }
  if (options.staff === false) return list;
  for (const worker of state.workers) {
    if (worker.role !== 'joiner' || !isWorkingToday(state, worker)) continue;
    if (worker.taskId !== null || worker.jobId === null) continue;
    const job = findJob(state, worker.jobId);
    if (!job || job.stage !== 'inProduction') continue;
    list.push({ who: worker.id, job, rate: worker.rate });
  }
  return list;
}

/** The families this man needs while he is on this job: his bench, which he holds from the first
 *  minute to the last, and the machine of the stage he is at (CLAUDE.md T4 3.4, T7 3.1). */
export function familiesWanted(state: GameState, job: Job, who = OWNER): string[] {
  const wanted: string[] = [BENCH];
  const stage = currentStage(state, job, cncOptions(state, who, job));
  const family = stage?.family ?? null;
  if (family === null || family === BENCH) return wanted;
  // A family the workshop does not own at all is done by hand, and a tool kept in a cabinet is
  // never taken off anybody: neither is queued for (CLAUDE.md T7 3.1, 3.6).
  if (!has(state, family) || machineIsShared(state, family)) return wanted;
  wanted.push(family);
  return wanted;
}

export interface StationCheck {
  /** The machine of the stage he is at, or null when the stage wants none. */
  machine: Equipment | null;
  /** The family he is standing and waiting for, or null when he has everything he needs. */
  waitingFor: string | null;
}

/** Gives this man what the stage he is at needs, and takes back whatever it does not. */
export function takeMachines(state: GameState, hand: Hand): StationCheck {
  const options = cncOptions(state, hand.who, hand.job);
  const wanted = familiesWanted(state, hand.job, hand.who);
  releaseMachines(state, hand.who, wanted);
  for (const family of wanted) {
    if (claimMachine(state, hand.who, family) === null) return { machine: null, waitingFor: family };
  }
  const stage = currentStage(state, hand.job, options);
  const family = stage?.family ?? null;
  if (family === null || !has(state, family) || machineIsShared(state, family)) {
    return { machine: sharedTool(state, family), waitingFor: null };
  }
  return { machine: heldMachine(state, hand.who, family), waitingFor: null };
}

/** The hand tool a stage is done with when its family is kept in a cabinet: there is no queue for
 *  it, and its bag and its hours still count the minutes it is out of the cabinet. */
function sharedTool(state: GameState, family: string | null): Equipment | null {
  if (family === null || !machineIsShared(state, family)) return null;
  return cabinetTools(state, family)[0] ?? null;
}

/** Where a man on a job is standing: at the machine of the stage he is at, waiting at one
 *  somebody else has, or at his bench (CLAUDE.md T7 3.1). */
export function stationForProduction(state: GameState, who: string, job: Job): string {
  const stage = currentStage(state, job, cncOptions(state, who, job));
  const family = stage?.family ?? null;
  if (family === null || family === BENCH) return STATION_BENCH;
  // By hand, or out of a cabinet: either way he does it at his bench.
  if (!has(state, family) || machineIsShared(state, family)) return STATION_BENCH;
  return heldMachine(state, who, family) === null
    ? waitingStation(family)
    : machineStation(family);
}

/** Everybody who is standing at a job this minute, whatever else is true of the clock: the owner
 *  unless he is at the desk, and every joiner not on a job of work of his own. At dinner the hall
 *  is in the canteen and every machine is free, unless the owner said he would work through it
 *  (CLAUDE.md T6 3.4). */
export function menAtJobs(state: GameState): string[] {
  const dinner = isBreak(state.clock.minute);
  if (dinner && !state.owner.breakSkipped) return [];
  const atJobs: string[] = [];
  if (jobOf(state, OWNER) && ownerIsAvailable(state) && state.owner.currentTaskId === null) {
    atJobs.push(OWNER);
  }
  if (dinner) return atJobs;
  for (const hand of hands(state, { owner: false })) atJobs.push(hand.who);
  return atJobs;
}

/** Anybody who is not standing at a job walks away from every machine he was at, so the next man
 *  can have it. Asked after every minute and every action (CLAUDE.md T7 3.1). */
export function releaseIdleMachines(state: GameState): void {
  releaseMachinesExcept(state, menAtJobs(state));
}

/** The share of a man's minutes on this job that a family of machine takes. A saw has him for the
 *  cutting and no longer, which is why two saws serve six joiners (CLAUDE.md T7 3.1). */
export function familyShareOfJob(state: GameState, job: Job, family: string): number {
  const plan: StagePlan[] = stagePlanFor(state, job);
  let total = 0;
  let atIt = 0;
  for (const stage of plan) {
    const minutes = stageMinutes(stage.to - stage.from, 1, stage.speed);
    total += minutes;
    if (stage.family === family) atIt += minutes;
  }
  return total > 0 ? atIt / total : 0;
}

/** The hours one machine of this family gains in a day at the rate the workshop is using it now:
 *  what the men at work want of the family, spread over the machines of it that the hall has. A
 *  family nobody's work goes through gains nothing, which is why an extractor never comes due for
 *  a service (CLAUDE.md T7 3.1). It is the demand and not the claim of this minute, so the figure
 *  does not flicker every time a man walks from the saw to his bench. */
export function machineHoursPerDay(state: GameState, item: Equipment): number {
  const spec = findSpec(item.specId);
  if (!spec || spec.category !== 'machine') return 0;
  let hours = 0;
  for (const hand of hands(state)) {
    hours += familyShareOfJob(state, hand.job, item.specId) * HOURS_PER_WORKING_DAY;
  }
  return hours / Math.max(1, countOf(state, item.specId));
}

/** The day the next service lands on if the machine keeps being used the way it is used today.
 *  Null when nobody is putting anything through it, because then it never comes due. */
export function serviceDueOn(state: GameState, item: Equipment): number | null {
  const perDay = machineHoursPerDay(state, item);
  if (perDay <= 0) return null;
  // Hours are gained on the days the workshop is open, so the days counted off are working days:
  // counting calendar days would put every service a weekend or two too early.
  return addWorkingDays(state.clock.day, Math.max(1, Math.ceil(serviceDueIn(item) / perDay)));
}
