// Who is standing at which machine this minute (CLAUDE.md T7 3.1), and the one minute of
// production itself (CLAUDE.md T13 3.9).
//
// A machine is free or it is taken by one man. This module says who wants one, who gets one and
// who stands and waits at it, and it is the one place that knows both the stages of a job and the
// people in the hall. `workMinute` is the minute of work: the men at their machines, the hall's
// factors, the labour into the job, the hours onto the machine and the dust into the store. The
// night shift runs on it; the day's production minute in game.ts does the same arithmetic and
// phase C folds it onto this function (the note in REPORT-T13-B2.md).

import { HOURS_PER_WORKING_DAY, WET_AIR_FINISH_FACTOR } from './constants';
import { addWorkingDays, isBreak, workedMinutesOfDay } from './clock';
import {
  BUILDING_ROLES,
  addLabour,
  addToJob,
  findJob,
  hallBlock,
  isOnJob,
  jobHeldBy,
  jobProgress,
  leadAssignee,
  jobForTheOwner,
  waitingLine,
  workIsAbout,
} from './jobs';
import {
  BENCH,
  OWNER,
  accumulateMachineMinute,
  addDust,
  benchOf,
  benchPlaceAt,
  bookOutputMinute,
  cabinetTools,
  claimMachine,
  countOf,
  findSpec,
  floorMachines,
  hallProductivityFactor,
  has,
  heldMachine,
  isServiced,
  machineIsShared,
  releaseMachines,
  releaseMachinesExcept,
  serviceDueIn,
  specOf,
  variantOf,
} from './machines';
import { drawSheetsFor, rackCanSupply } from './materials';
import { openTasks } from './tasks';
import {
  airFactorFor,
  benchDrawsAir,
  drawingOn,
  extractionKit,
  extractionRunning,
  hallAirCheck,
  sprayingOnWetAir,
  standsForAir,
  underExtracted,
} from './media';
import {
  ownerEfficiency,
  ownerIsAvailable,
  spendOwnerIdleMinute,
  spendOwnerMinute,
  staffOutputFactor,
} from './owner';
import { contractMen, contractWantsToday } from './contracts';
import {
  bookMonthMinute,
  isWorkingToday,
  managerPaceFor,
  spendWorkerIdleMinute,
  waitsForTheBoss,
} from './staff';
import {
  STATION_BENCH,
  machineStation,
  placeStation,
  roomBehindStation,
  secondStation,
  stationNow,
  waitingStation,
} from './stations';
import {
  stageFor,
  type StagePlan,
  cncOptions,
  labourPerMinute,
  stageMinutes,
  stagePlanFor,
  tradeFactor,
} from './stages';
import type {
  Equipment,
  GameState,
  Job,
  LostMinuteCause,
  OwnerIdleReason,
  Shift,
  Worker,
  WorkerIdleReason,
} from './types';

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
  return jobHeldBy(state, who);
}

/** Everybody who is standing at a job this minute, the owner first. Order matters only for who
 *  reaches a free machine first: a man already at one keeps it, so nobody is ever turned off a
 *  machine he is standing at. The day asks with no shift named and gets the day men; the night
 *  names its own and gets them, and never the owner, who has gone home (CLAUDE.md T13 3.9). A
 *  staff minute carries what the owner's absence does to it, so the rate here is the rate the
 *  work goes in at (CLAUDE.md 7.3). */
export function hands(
  state: GameState,
  options: { owner?: boolean; staff?: boolean; shift?: Shift } = {},
): Hand[] {
  const list: Hand[] = [];
  const shift = options.shift ?? 'day';
  const ownerJob = jobOf(state, OWNER);
  if (shift === 'day' && options.owner !== false && ownerJob && ownerIsAvailable(state)) {
    list.push({ who: OWNER, job: ownerJob, rate: ownerEfficiency(state) });
  }
  if (options.staff === false) return list;
  const away = staffOutputFactor(state);
  for (const worker of state.workers) {
    // A joiner and a sprayer both stand at a job: the helper and the desks do not
    // (CLAUDE.md T19 2.5, 2.6).
    if (!BUILDING_ROLES.includes(worker.role) || !isWorkingToday(state, worker, shift)) continue;
    if (worker.taskId !== null || worker.jobId === null) continue;
    // The contract fills the day first: a man it still wants today is not among the job's hands
    // this minute, whichever of the two the Work Plan shows him on (PIOTR; CLAUDE.md T20 2.1.4).
    if (contractWantsToday(state, worker.id)) continue;
    const job = findJob(state, worker.jobId);
    if (!job || job.stage !== 'inProduction') continue;
    // His own rate, what the owner's absence takes off it, and what the manager over him adds:
    // the manager's pace multiplies the minute exactly the way a tier's rate does, on this one
    // path and nowhere else (PIOTR, 20.09; CLAUDE.md T23 2.4).
    list.push({ who: worker.id, job, rate: worker.rate * away * managerPaceFor(state, worker) });
  }
  return list;
}

/** The families this man needs while he is on this job: his bench, which he holds from the first
 *  minute to the last, and the machine of the stage he is at (CLAUDE.md T4 3.4, T7 3.1). */
export function familiesWanted(state: GameState, job: Job, who = OWNER): string[] {
  // The second man works at the first man's bench, in its second place: he does not take a bench
  // of his own, and one that is free is left for somebody else (CLAUDE.md T17 2.10).
  const lead = leadAssignee(job);
  const wanted: string[] = lead !== null && lead !== who && isOnJob(job, who) ? [] : [BENCH];
  const stage = stageFor(state, who, job, cncOptions(state, who, job));
  const family = stage?.family ?? null;
  if (family === null || family === BENCH) return wanted;
  // A family the workshop does not own at all is done by hand, and a tool kept in a cabinet is
  // never taken off anybody: neither is queued for (CLAUDE.md T7 3.1, 3.6).
  if (!has(state, family) || machineIsShared(state, family)) return wanted;
  wanted.push(family);
  return wanted;
}

/** The machine family this job's current stage wants, or null while its current stage is bench
 *  work, wants a family the workshop does not own, or wants a tool that is kept in a cabinet and
 *  is never queued for. Read off `familiesWanted` above and never worked out a second time, so
 *  the manager who spreads his men over the machines and the man who claims one are answering the
 *  same question (CLAUDE.md T23 2.4). */
export function machineWantedFor(state: GameState, job: Job, who = OWNER): string | null {
  return familiesWanted(state, job, who).find((family) => family !== BENCH) ?? null;
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
  const stage = stageFor(state, hand.who, hand.job, options);
  const family = stage?.family ?? null;
  if (family === null || !has(state, family) || machineIsShared(state, family)) {
    return { machine: sharedTool(state, family), waitingFor: null };
  }
  // A bench is his own place at one and not a thing he took off anybody, so it is asked for by
  // name. Only the man who wanted a bench has one: the men behind the lead work at the lead's and
  // put their minutes in at the stage's own speed, as they have since Turn 19
  // (CLAUDE.md T19 2.5, T23 2.17).
  if (family === BENCH) {
    return { machine: wanted.includes(BENCH) ? benchOf(state, hand.who) : null, waitingFor: null };
  }
  return { machine: heldMachine(state, hand.who, family), waitingFor: null };
}

/** The hand tool a stage is done with when its family is kept in a cabinet: there is no queue for
 *  it, and its bag and its hours still count the minutes it is out of the cabinet. */
function sharedTool(state: GameState, family: string | null): Equipment | null {
  if (family === null || !machineIsShared(state, family)) return null;
  return cabinetTools(state, family)[0] ?? null;
}

/** Where this man stands among the men on his job, counting only the ones the same thing is true
 *  of. Nought is the first of them, and the list's own order is the order they were put on. */
function placeAmong(job: Job, who: string, eligible: (other: string) => boolean): number {
  let place = 0;
  for (const other of job.assignees) {
    if (other === who) return place;
    if (eligible(other)) place += 1;
  }
  return place;
}

/** Where a man on a job is standing: at the machine of the stage he is at, waiting at one
 *  somebody else has, or at his bench (CLAUDE.md T7 3.1). With more than two men on the job the
 *  third and the rest take the places beyond the table's two, along the same side of the item
 *  (CLAUDE.md T19 2.5). */
export function stationForProduction(state: GameState, who: string, job: Job): string {
  const stage = stageFor(state, who, job, cncOptions(state, who, job));
  const family = stage?.family ?? null;
  // Everybody but the first man of the job works at the first man's bench: the second in its
  // second place and the rest along its front (CLAUDE.md T17 2.10, T19 2.5).
  const lead = leadAssignee(job);
  const behind = lead !== null && lead !== who && isOnJob(job, who);
  const bench = behind ? benchOf(state, lead) : null;
  const atTheBench = (): string => {
    if (bench === null) {
      // His own bench, and his own place at it. A class holds one, two or three men from Turn 23
      // and the first of them stands at its operator's cell, so the second and the third take the
      // places beside it and no two figures are drawn on the one cell (T19 2.5, T23 2.17).
      const mine = benchOf(state, who);
      if (mine === null) return STATION_BENCH;
      const place = benchPlaceAt(state, who);
      if (place === 0) return STATION_BENCH;
      return place === 1 ? secondStation(mine.id) : placeStation(mine.id, place);
    }
    const place = placeAmong(job, who, (other) => other !== lead);
    return place === 0 ? secondStation(bench.id) : placeStation(bench.id, place + 1);
  };
  if (family === null || family === BENCH) return atTheBench();
  // By hand, or out of a cabinet: either way he does it at his bench.
  if (!has(state, family) || machineIsShared(state, family)) return atTheBench();
  if (heldMachine(state, who, family) !== null) return machineStation(family);
  // He is queueing for it. The first man waiting takes the waiting cell and the next of them the
  // free cells along the same side, one out at a time (CLAUDE.md T19 2.5).
  const queue = placeAmong(
    job,
    who,
    (other) => other !== who && heldMachine(state, other, family) === null,
  );
  if (queue === 0) return waitingStation(family);
  const item = floorMachines(state, family)[0] ?? null;
  return item === null ? waitingStation(family) : placeStation(item.id, queue + 1);
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
  // The men on a standing contract keep their saw between actions too (CLAUDE.md T13 3.16).
  atJobs.push(...contractMen(state));
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

// ---------------------------------------------------------------------------
// The minute of production (CLAUDE.md T7 3.1, T10 3.1 to 3.3, T12 2.3, T13 3.9). One arithmetic
// for the day and the night.
// ---------------------------------------------------------------------------

/** One man putting one minute into one job, with the machine he got for it. Gathered before the
 *  hall is measured, because the extraction and the air sums are the sums of the machines running
 *  this very minute and not of last minute's (CLAUDE.md T10 3.1, 3.2). */
interface AtWork {
  hand: Hand;
  stage: StagePlan;
  machine: Equipment | null;
}

/** What this one man says while he stands, which is not always what his job says: every man in the
 *  queue for a machine is waiting for the machine. "No cut parts yet", the words of the men behind
 *  the first in a saw queue, went with the rule that kept assembly closed until the cutting was done
 *  (PIOTR, 21.09; v43): a man queues at the saw now only when the saw is all his job has left, so
 *  there are no parts he is waiting to assemble. Null when he is not standing at all
 *  (CLAUDE.md T21 2.6, 2.7). */
export function waitingWordsFor(state: GameState, who: string, job: Job): string | null {
  const stage = stageFor(state, who, job, cncOptions(state, who, job));
  const family = stage?.family ?? null;
  if (family === null || family === BENCH) return null;
  if (!has(state, family) || machineIsShared(state, family)) return null;
  if (heldMachine(state, who, family) !== null) return null;
  return waitingLine(family);
}

/** The words the job carries while the rack has nothing for it (CLAUDE.md T2 3.6). */
export const WAITING_FOR_MATERIAL = 'waiting for material';

/** True when the job can be worked on this minute. Writes down why it cannot, either way: the
 *  hall first, then the rack, which has to hand over what the next slice of work needs or the job
 *  stands still and the joiners stand around (CLAUDE.md T2 3.6, T2 3.9). */
export function canWorkOn(state: GameState, job: Job): boolean {
  const block = hallBlock(state, job);
  job.blockedBy = block;
  if (block !== '') return false;
  if (drawSheetsFor(state, job, jobProgress(job))) return true;
  job.blockedBy = WAITING_FOR_MATERIAL;
  return false;
}

// ---------------------------------------------------------------------------
// One man, one job: nobody is moved between jobs [PIOTR, 19.09: "he is assigned to it, so he works
// on it; the production manager will do the moving, later"] (CLAUDE.md T22 2.6).
// ---------------------------------------------------------------------------

/** What this man did with the minute: the stage and the machine he got, or why he stood. The whole
 *  of one man's minute before the hall's factors are applied to it, in one place, because the day
 *  and the night both have to ask exactly the same question (CLAUDE.md T22 2.6). */
export interface HandPlace {
  /** The stage he is at and the machine he got, or null when he stood. */
  work: { stage: StagePlan; machine: Equipment | null } | null;
  /** What the minute is booked as lost to, or null when he worked it. */
  lost: LostMinuteCause | null;
  /** The rack had nothing for the job he was on: the caller tells the player, once a day. */
  noMaterial: boolean;
}

/** Gets this man to work on the job he is on, and stands him at its machine when another man has
 *  it. The one reading of a man's minute: the hall, then the rack, then the machine of his stage.
 *
 *  He is never moved to another job. Turn 21 moved him, and Piotr reversed it on 19.09: a man is
 *  assigned to a job, so he works on that job, and the hall's own lever for moving men will be the
 *  production manager, whose design is parked for Turn 23 (CLAUDE.md T22 2.6, 8). The minute he
 *  stands is booked to `noMachine` and counted by the day meter's idle segment, which is the point
 *  of it: the queue at the machine is there for the player to see and to shorten by buying a second
 *  one. */
export function placeHand(state: GameState, hand: Hand): HandPlace {
  if (!canWorkOn(state, hand.job)) {
    // The hall or the rack has stopped this job, and the man stays on it: the chips and the warning
    // strip say what is wrong and the mark over his head says it over him (CLAUDE.md T22 2.5).
    releaseMachines(state, hand.who);
    const noMaterial = hand.job.blockedBy === WAITING_FOR_MATERIAL;
    return { work: null, lost: noMaterial ? 'noMaterial' : 'noMachine', noMaterial };
  }
  // The stage this man works, which is his own from v37: two men on one job may be at two stages
  // (the bag of work, PIOTR 20.09).
  const stage = stageFor(state, hand.who, hand.job, cncOptions(state, hand.who, hand.job));
  if (stage === null) return { work: null, lost: null, noMaterial: false };
  const at = takeMachines(state, hand);
  if (at.waitingFor === null) {
    return { work: { stage, machine: at.machine }, lost: null, noMaterial: false };
  }
  // He stands at the machine until the man on it is done with it (CLAUDE.md T7 3.1). This is also
  // the cap on the men: one machine is one man's, so a stage at a machine goes at that one man's
  // speed however many are on the job, and the others put their minutes in only on the bench work
  // the stage allows, which for a cutting stage is none (CLAUDE.md T19 2.5).
  hand.job.blockedBy = waitingLine(at.waitingFor);
  return { work: null, lost: 'noMachine', noMaterial: false };
}

// ---------------------------------------------------------------------------
// The owner's own minute: the ones he worked, and the ones he stood and why (PIOTR, 19.09: "my time
// runs two to three times slower than the clock"; CLAUDE.md T21 2.8).
// ---------------------------------------------------------------------------

/** Why the owner stood through the minute just gone, or null when there was nothing of his day to
 *  stand through: he is not in the workshop, the hall is at dinner, or he is holding a job of work,
 *  and a minute he holds something is a minute `spendOwnerMinute` has already booked as worked
 *  (CLAUDE.md T21 2.8). The four reasons are `OWNER_IDLE_REASONS`, in the order the hover lists them.
 *
 *  Two of the four are the two the workshop's own efficiency breakdown counts, and they are read the
 *  same way here: the rack first, and then the hall and the machine of the stage, which is everything
 *  else (CLAUDE.md T13 3.5). The other two are his alone: nothing in the hall is his, or there is
 *  nothing in the hall at all. */
export function ownerIdleReason(state: GameState): OwnerIdleReason | null {
  const owner = state.owner;
  if (!ownerIsAvailable(state)) return null;
  if (isBreak(state.clock.minute) && !owner.breakSkipped) return null;
  if (owner.currentTaskId !== null) return null;
  const job = jobOf(state, OWNER);
  if (job !== null) {
    if (!rackCanSupply(state, job, jobProgress(job))) return 'noMaterial';
    // A bench the hall has no air for stands the owner still like anybody else, and his meter
    // says which of the two it was (PIOTR, 20.09; CLAUDE.md T23 2.7).
    const stage = stageFor(state, OWNER, job, cncOptions(state, OWNER, job));
    return standsForAir(state, stage) ? 'noCompressor' : 'noMachine';
  }
  // Nothing of his own at all. Either the hall's list has a chore nobody has taken, or there is
  // work of the board's about that is every bit of it somebody else's; or there is none of that
  // and he is in the office with his hands in his pockets.
  //
  // From v41 no job of the board's can leave him standing at all: he joins the one with the
  // soonest deadline the minute his office empties, whoever is on it (PIOTR, 21.09). So
  // `nothingAssigned` is the minute between a player's click and the next look at the board, and
  // a chore standing untaken that is nobody's to give him (CLAUDE.md T23 2.3; v41).
  const waiting = openTasks(state).some((task) => task.doneBy === null) || workIsAbout(state);
  return waiting ? 'nothingAssigned' : 'officeEmpty';
}

/** The owner goes to the bench when his office is empty (PIOTR, 20.09: "he never stands doing
 *  nothing"; CLAUDE.md T23 2.3). Once a minute: he is in, he is on the hall side of the door, he
 *  holds no chore and no job, and there is nothing in his office queue he could do now. Then he
 *  goes to the job with the soonest deadline, `jobForTheOwner`.
 *
 *  v41 (PIOTR, 21.09): he JOINS it, whoever is on it. Turn 23 gave him the oldest job with nobody
 *  on it, and in a hall where the crew hold every job that is no job at all, so he stood in the
 *  office exactly as he did before 2.3 was written. He is a second pair of hands now and the bag
 *  of work puts him at a stage whose station is free. The evening take over of Turn 17 is still
 *  its own click, for a job he wants INSTEAD of the man on it.
 *
 *  He never takes a standing contract [PIOTR, 19.09], which `jobForTheOwner` cannot hand him
 *  because a contract is no job of the board's. The player can move him off it in the Work Plan
 *  like anybody.
 *
 *  So his own idle reason `nothingAssigned` now fires only for a man the hall cannot put on
 *  anything at all; `officeEmpty` is unchanged. */
export function ownerTakesAJob(state: GameState): void {
  const owner = state.owner;
  if (!ownerIsAvailable(state)) return;
  if (isBreak(state.clock.minute) && !owner.breakSkipped) return;
  if (owner.currentTaskId !== null) return;
  // Behind the office door or through the canteen one: he is off the hall and not at a bench.
  if (roomBehindStation(stationNow(state, OWNER)) !== null) return;
  if (jobOf(state, OWNER) !== null) return;
  // Anything of his own still to do comes first: the office queue is the owner's day and the
  // bench is what he does with what is left of it.
  if (openTasks(state).some((task) => task.doneBy === null)) return;
  const job = jobForTheOwner(state);
  if (job === null) return;
  // He joins it rather than taking it over: a job the crew are already on keeps them
  // (PIOTR, 21.09; v41).
  addToJob(state, job.id, OWNER);
}

/** Why this man on the books stood through the minute just gone, or null when there was nothing of
 *  his day to stand through. The owner's twin above, read the same way and answering the list that
 *  is his own: nobody has put him on anything, or he is on a job and the rack or the machine has
 *  stopped him (PIOTR, 20.09; CLAUDE.md T23 2.1).
 *
 *  The waiting is asked first, because a man nobody has put on anything has no job to be stopped
 *  on. A man holding a chore is not standing at all, and neither is a man the manager simply has
 *  no work for: the meter paints what it knows and invents no reason for him. */
export function workerIdleReason(state: GameState, worker: Worker): WorkerIdleReason | null {
  if (isBreak(state.clock.minute)) return null;
  if (waitsForTheBoss(state, worker)) return 'waitingForBoss';
  if (worker.taskId !== null) return null;
  const job = jobOf(state, worker.id);
  if (job === null) return null;
  return rackCanSupply(state, job, jobProgress(job)) ? 'noMachine' : 'noMaterial';
}

/** Books the minute just gone onto this man's day as one he stood through, with its reason. Called
 *  from the same one hook that books the owner's, and only for a minute the sampler has just said
 *  he put nothing into (CLAUDE.md T23 2.1). */
export function bookWorkerIdleMinute(state: GameState, worker: Worker): void {
  const reason = workerIdleReason(state, worker);
  if (reason === null) return;
  spendWorkerIdleMinute(worker, reason);
}

/** Books the minute just gone onto the owner's day as one he stood through, with its reason. Called
 *  once a minute from the one hook that already samples what everybody was at
 *  (`bookWeekMinutes` in src/engine/tasks.ts), and never for a minute it has already booked.
 *
 *  A minute is either worked or stood and never both, and the cap says so: the minutes of the day
 *  that have run, the dinner hour taken out of them unless he worked through it, are all there are
 *  to divide between the two. Nothing is booked past that, whatever the hooks do
 *  (CLAUDE.md T21 2.8). */
export function bookOwnerIdleMinute(state: GameState): void {
  const owner = state.owner;
  const ran = workedMinutesOfDay(state.clock.minute, owner.breakSkipped);
  if (owner.minutesWorked + owner.idleMinutes >= ran) return;
  const reason = ownerIdleReason(state);
  if (reason === null) return;
  spendOwnerIdleMinute(state, reason);
}

/** What one minute of the hall came to, for the efficiency tally and for the events game.ts
 *  raises after it (a job at the gate, the bags full, the empty rack). */
export interface MinuteReport {
  /** Person minutes that went into a job, the owner's whole and a staff minute less what the
   *  owner's absence took off it (CLAUDE.md T13 3.5). */
  worked: number;
  /** The minutes the seats lost, by cause. */
  lost: Partial<Record<LostMinuteCause, number>>;
  /** The jobs that were finished this minute: each stands at the gate now. */
  finished: Job[];
  /** Somebody stood at an empty rack this minute. */
  noMaterial: boolean;
  /** The bag store filled this minute. */
  bagsFull: boolean;
  /** Every machine somebody stood at this minute. */
  usedMachineIds: string[];
}

/** One clock minute of production for the hands given: the men take their machines, the hall is
 *  measured with those machines running, and every man who got what he needs puts a minute into
 *  his job at the speed his machine and the hall give him. The hours go on the machines he stood
 *  at, and the dust into the store (CLAUDE.md T7 3.1, T10 3.1 to 3.3, T12 2.3). At night every
 *  minute is written on the job as a night one, which the client sees in the finish, and on the
 *  day's night count (CLAUDE.md T13 3.9). The day's production minute in game.ts does exactly
 *  this; the night shift calls it here. */
export function workMinute(
  state: GameState,
  working: readonly Hand[],
  options: { night?: boolean } = {},
): MinuteReport {
  const night = options.night === true;
  // Anybody who is not at a job this minute walks away from whatever he was standing at, so the
  // next man can have it (CLAUDE.md T7 3.1).
  releaseMachinesExcept(
    state,
    working.map((hand) => hand.who),
  );
  const report: MinuteReport = {
    worked: 0,
    lost: {},
    finished: [],
    noMaterial: false,
    bagsFull: false,
    usedMachineIds: [],
  };
  const lose = (cause: LostMinuteCause, minutes = 1): void => {
    report.lost[cause] = (report.lost[cause] ?? 0) + minutes;
  };
  // Who actually stands at what this minute. Nothing is worked off the job yet: the machines have
  // to be taken before the hall can be asked what its media add up to.
  const atWork: AtWork[] = [];
  for (const hand of working) {
    // One reading of a man's minute (CLAUDE.md T22 2.6): the job he is on, and the machine of its
    // stage, or the wait at it. Nobody is moved to another job.
    const place = placeHand(state, hand);
    if (place.noMaterial) report.noMaterial = true;
    if (place.lost !== null) lose(place.lost);
    if (place.work === null) continue;
    atWork.push({ hand, stage: place.work.stage, machine: place.work.machine });
  }
  if (atWork.length === 0) return report;
  // The hall as it is with those machines running: the dust band, the missing helper, the crowded
  // gate, the broken extractor and the extraction sum, all through the one breakdown.
  const hall = hallProductivityFactor(state);
  const dusty = underExtracted(state);
  // What the men at the benches draw for their nailers and their sanders, through the one
  // selector the hall and the board read as well (CLAUDE.md T10 3.2).
  const air = hallAirCheck(state);
  // And what the men at the benches do when there is nothing in the hose: they stand. A bench
  // wants its 30 l/min at 6 bar and without a compressor, or on one that is short, there is no
  // bench work at all from tonight [PIOTR, 20.09] (CLAUDE.md T23 2.7). It is asked here and not
  // in `placeHand`, because the air sum is the sum of the machines running this very minute and
  // the machines are not taken until every hand has been placed.
  const running: AtWork[] = [];
  for (const entry of atWork) {
    if (standsForAir(state, entry.stage)) {
      // He keeps his bench and stands at it. The minute is one of the hall's lost ones and the
      // mark over his head says why (src/engine/bubbles.ts).
      lose('noMachine');
      continue;
    }
    running.push(entry);
  }
  if (running.length === 0) return report;
  // The minutes somebody actually stood at each machine: that, and nothing else, is what wears
  // it out and what fills the hall's bags (CLAUDE.md T7 2, T12 2.3).
  const used = new Map<string, number>();
  for (const { hand, stage, machine } of running) {
    const worker = state.workers.find((entry) => entry.id === hand.who);
    if (worker) {
      worker.productionMinutes += 1;
      // The night's minutes are minutes of his month too (CLAUDE.md T17 2.9).
      bookMonthMinute(worker);
    } else {
      spendOwnerMinute(state, 'workshop', 'workshop');
      state.owner.productionMinutes += 1;
    }
    // What the piece itself was made in: the minutes it took and how many of them were dusty
    // ones, which is what the client sees when it lands (CLAUDE.md T10 3.1), and how many were
    // night ones (CLAUDE.md T13 3.9).
    hand.job.productionMinutes += 1;
    if (dusty) hand.job.dustyMinutes += 1;
    if (night) {
      hand.job.nightMinutes += 1;
      state.dayStats.nightMinutes += 1;
    }
    if (machine !== null) used.set(machine.id, (used.get(machine.id) ?? 0) + 1);
    // A machine speeds up its own stage and nothing else, and only for the man on it, so the
    // speed is the class of the machine he actually got (CLAUDE.md T7 3.1).
    let speed =
      machine === null
        ? stage.speed
        : variantOf(specOf(machine.specId), machine.variantId).outputFactor;
    // A compressor that is short of litres runs every pneumatic consumer on it at 0.7 for the
    // minute, and a booth on wet air takes half as long again over the finish and marks the
    // piece (PIOTR, CLAUDE.md T10 3.2, 3.3).
    const atTheBench = benchDrawsAir(stage) !== null;
    speed *= airFactorFor(state, air, machine, atTheBench);
    if (machine !== null && sprayingOnWetAir(state, machine)) {
      speed /= WET_AIR_FINISH_FACTOR;
      hand.job.wetFinish = true;
    }
    // A compressor's hours run only while something draws on it (CLAUDE.md T10 3.2 rule 3).
    const compressor = drawingOn(state, machine, atTheBench);
    if (compressor !== null) used.set(compressor.id, (used.get(compressor.id) ?? 0) + 1);
    // What his trade is worth at the stage he is standing at: the booth is the sprayer's and a
    // joiner is slower at it, and the sprayer is a pair of hands anywhere else (CLAUDE.md T19 2.6).
    const trade = tradeFactor(worker?.role ?? null, stage.family);
    const minute = labourPerMinute(hand.rate * trade, speed) * hall;
    // The minute's own multiplier, for the workshop's average output (v40): the same four things
    // the labour is made of, and nothing else.
    bookOutputMinute(state, hand.rate * trade * speed * hall);
    if (addLabour(state, hand.job, minute, stage.id)) report.finished.push(hand.job);
  }
  // The extraction books its hours the whole time it is running, whoever is at what: a fan is
  // pulling for the hall and not for one man, and it is serviced on those hours exactly as a
  // machine is [PIOTR, 20.09] (CLAUDE.md T23 2.8). `isServiced` says which of the kit in the
  // duct run wears out on them.
  if (extractionRunning(state)) {
    for (const fan of extractionKit(state)) {
      if (isServiced(fan.specId)) used.set(fan.id, (used.get(fan.id) ?? 0) + 1);
    }
  }
  // What the owner's absence took off every staff minute this minute is the owner away line of
  // the efficiency breakdown (CLAUDE.md T13 3.5, 3.9).
  const away = staffOutputFactor(state);
  for (const { hand } of running) {
    if (hand.who === OWNER) {
      report.worked += 1;
      continue;
    }
    report.worked += away;
    if (away < 1) lose('ownerAway', 1 - away);
  }
  state.productionMinutesMonth += 1;
  addDust(state, 1);
  // The minute the store fills, the workshop is told once, not once a machine (CLAUDE.md T12 2.3).
  report.bagsFull = accumulateMachineMinute(state, used);
  report.usedMachineIds = [...used.keys()];
  return report;
}
