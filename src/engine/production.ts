// Who has a place at which machine (CLAUDE.md T25 2.3), and the one minute of production itself
// (CLAUDE.md T13 3.9).
//
// A machine is a number of places to work, and the day plan here gives them out: the men in the
// order they were hired, the owner first, each wanting one place of the family his work is at.
// A man with a place works; a man with none stands at his home cell and says so. `workMinute` is
// the minute of work: the men at their places, the hall's factors, the labour into the job, the
// hours onto the machine and the dust into the store. The night shift runs on it; the day's
// production minute in game.ts does the same arithmetic (the note in REPORT-T13-B2.md).

import { WET_AIR_FINISH_FACTOR } from './constants';
import { isBreak, workedMinutesOfDay } from './clock';
import {
  addLabour,
  addToJob,
  findJob,
  hallBlock,
  hallStops,
  jobHeldBy,
  jobProgress,
  leadAssignee,
  jobForTheOwner,
  workIsAbout,
  BUILDING_ROLES,
} from './jobs';
import {
  BENCH,
  OWNER,
  accumulateMachineMinute,
  addDust,
  bagsFull,
  bookOutputMinute,
  cabinetTools,
  hallPlaces,
  hallProductivityFactor,
  has,
  isServiced,
  machineForPlace,
  machineIsShared,
  machineShortWord,
} from './machines';
import { drawSheetsFor, rackCanSupply } from './materials';
import { movingMachines, openTasks } from './tasks';
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
import {
  contractFamilyOf,
  contractStageFamilyOf,
  contractHands,
  contractOfWorker,
  contractPiece,
  contractWaitingForMaterial,
  contractWantsToday,
} from './contracts';
import {
  bookMonthMinute,
  crewHasGoneHome,
  isWorkingToday,
  managerPaceFor,
  spendWorkerIdleMinute,
  waitsForTheBoss,
} from './staff';
import { STATION_BENCH, STATION_HOME, machineStation, roomBehindStation, stationNow } from './stations';
import {
  type StagePlan,
  cncOptions,
  currentStage,
  jobOnCnc,
  labourPerMinute,
  tradeFactor,
} from './stages';
import type {
  Contract,
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

// ---------------------------------------------------------------------------
// The day plan: who has a place (PIOTR, 21.09: "they never stand, they always work";
// CLAUDE.md T25 2.2, 2.3). A machine is a number of places. Every man on a job wants one place of
// the family his job's current stage is done on, every man on a standing contract one of his
// piece's family, and the places are given out in the order the men were hired, the owner first.
// A man with no place does not work, and says so; nobody queues, nobody holds anything and nobody
// is sent to another stage to fill a gap.
// ---------------------------------------------------------------------------

/** What one man of the plan wants and whether he got it. */
export interface PlaceEntry {
  /** 'owner', or a worker id. */
  who: string;
  /** The job he is on, or null for a man on a standing contract. */
  job: Job | null;
  /** The contract he is on, or null for a man on a job. */
  contract: Contract | null;
  /** The family his work wants a place at, or null when it wants none: by hand, a tool out of a
   *  cabinet, or a family the hall does not own at all (CLAUDE.md T7 3.6, T25 2.3). */
  family: string | null;
  /** True while he works: he has his place, or his work wants none. */
  working: boolean;
  /** The machine his place is at, and which of its places, or null when he has none. */
  machine: Equipment | null;
  place: number;
}

/** The family a stage wants a place at, or null when it wants none. A bench stage wants a bench
 *  place, which is the whole of v47's rule from tonight (CLAUDE.md T25 2.3); a by hand job wants
 *  one at the bench and at no machine, because it uses no machine at any stage (CLAUDE.md 9.5); a
 *  family the hall does not own at all is worked by hand and a tool out of a cabinet is shared,
 *  and neither needs a place (CLAUDE.md T7 3.6). */
export function placeFamilyOf(
  state: GameState,
  stage: { family: string | null } | null,
  byHand: boolean,
): string | null {
  if (stage === null) return null;
  const family = stage.family;
  if (family === null || family === BENCH) return BENCH;
  if (byHand) return null;
  if (!has(state, family) || machineIsShared(state, family)) return null;
  return family;
}

/** The job's current stage for this man, with the CNC when the hall has a place at one for him
 *  and the saw when it has not and the job allows it: the plan's own question, asked with the
 *  places still left in its hands and never of anything written on the man. */
function planStage(
  state: GameState,
  job: Job,
  left: Map<string, number>,
): StagePlan | null {
  const onCnc = currentStage(state, job, { cnc: true });
  if (!jobOnCnc(state, job) || onCnc === null || onCnc.id !== CNC_STAGE_ID) return onCnc;
  if ((left.get(CNC_STAGE_ID) ?? 0) > 0 || !job.sawFallback) return onCnc;
  return currentStage(state, job, { cnc: false });
}

const CNC_STAGE_ID = 'cnc';

/** The hand tool a stage is done with when its family is kept in a cabinet: it needs no place, and
 *  its bag and its hours still count the minutes it is out of the cabinet (CLAUDE.md T7 3.6). */
function sharedTool(state: GameState, family: string | null): Equipment | null {
  if (family === null || !has(state, family) || !machineIsShared(state, family)) return null;
  return cabinetTools(state, family)[0] ?? null;
}

/** Everybody who could work a production minute now, in the plan's order: the owner first, then
 *  the crew in the order they were hired, each on his job or on his contract. The night asks for
 *  its own men and never the owner, who has gone home (CLAUDE.md T13 3.9). A man on an errand, at
 *  his dinner, gone home at five, or on a job the hall has stopped or the rack cannot feed has no
 *  work to want a place for this minute and is not on the list: his place goes to the next man. */
function planCandidates(
  state: GameState,
  shift: Shift,
  given: readonly Hand[] | null,
): Array<{ who: string; job: Job | null; contract: Contract | null }> {
  const list: Array<{ who: string; job: Job | null; contract: Contract | null }> = [];
  // Every bench waits while the machines are being shifted about (CLAUDE.md T4 3.5).
  if (movingMachines(state) !== null) return list;
  const dinner = isBreak(state.clock.minute);
  // The minute names its own hands, already at work in it; the plan read between minutes asks
  // who of the shift would be.
  const byHand = new Map((given ?? hands(state, { shift })).map((hand) => [hand.who, hand]));
  const owner = byHand.get(OWNER);
  if (
    owner !== undefined &&
    (given !== null || (state.owner.currentTaskId === null && (!dinner || state.owner.breakSkipped)))
  ) {
    list.push({ who: OWNER, job: owner.job, contract: null });
  }
  if (given === null && dinner) return list;
  if (shift === 'day' && crewHasGoneHome(state)) return list;
  for (const worker of state.workers) {
    const hand = byHand.get(worker.id);
    if (hand !== undefined) {
      list.push({ who: worker.id, job: hand.job, contract: null });
      continue;
    }
    if (shift !== 'day') continue;
    const contract = contractOfWorker(state, worker.id);
    if (contract === null || contractWaitingForMaterial(state, contract)) continue;
    if (!contractHands(state, contract).some((entry) => entry.id === worker.id)) continue;
    list.push({ who: worker.id, job: null, contract });
  }
  return list;
}

/** The day plan: who has a place and at which machine, worked out from the men on the floor, the
 *  stages their work is at and the places the hall has. It is a reading of the hall and nothing
 *  else, so it gives the same answer every minute until one of the things it is made of changes:
 *  a man is put on a job or taken off one, a machine is bought, sold, moved, broken, repaired or
 *  back from its service, a job's current stage moves to another family, or a man goes to his
 *  dinner, to an errand or home (PIOTR, 21.09; CLAUDE.md T25 2.3). */
export function dayPlan(
  state: GameState,
  shift: Shift = 'day',
  given: readonly Hand[] | null = null,
): PlaceEntry[] {
  const left = new Map<string, number>();
  const placedSoFar = new Map<string, number>();
  const placesLeft = (family: string): number => {
    if (!left.has(family)) left.set(family, hallPlaces(state, family));
    return left.get(family) ?? 0;
  };
  // Asked before the first man is placed, so the CNC's places are known to the first stage asked.
  if (has(state, CNC_STAGE_ID)) placesLeft(CNC_STAGE_ID);
  const entries: PlaceEntry[] = [];
  for (const candidate of planCandidates(state, shift, given)) {
    let family: string | null;
    // The tool out of a cabinet his stage is done with, when it is: it needs no place and still
    // books its hours (CLAUDE.md T7 3.6, T25 section 6).
    let tool: Equipment | null = null;
    if (candidate.job !== null) {
      const job = candidate.job;
      const stage = planStage(state, job, left);
      if (stage === null) continue;
      if (!job.byHand) tool = sharedTool(state, stage.family);
      // A job the hall has stopped, or the rack cannot feed, has nothing for him to do this
      // minute: he wants no place, and the minute says why (`placeHand`).
      if (hallStops(state, job, stage) !== '' || !rackCanSupply(state, job, jobProgress(job))) continue;
      family = placeFamilyOf(state, stage, job.byHand);
    } else if (candidate.contract !== null) {
      const cnc = has(state, CNC_STAGE_ID) && placesLeft(CNC_STAGE_ID) > 0;
      family = contractFamilyOf(state, contractPiece(candidate.contract), cnc);
      tool = sharedTool(state, contractStageFamilyOf(state, contractPiece(candidate.contract), cnc));
      // Nothing that makes dust runs with the bags full (CLAUDE.md T12 2.3).
      if (family !== null && family !== BENCH && bagsFull(state)) continue;
    } else {
      continue;
    }
    if (family === null) {
      entries.push({ ...candidate, family, working: true, machine: tool, place: 0 });
      continue;
    }
    if (placesLeft(family) <= 0) {
      entries.push({ ...candidate, family, working: false, machine: null, place: 0 });
      continue;
    }
    left.set(family, placesLeft(family) - 1);
    const index = placedSoFar.get(family) ?? 0;
    placedSoFar.set(family, index + 1);
    const at = machineForPlace(state, family, index);
    entries.push({
      ...candidate,
      family,
      working: true,
      machine: at?.item ?? null,
      place: at?.place ?? 0,
    });
  }
  return entries;
}

/** Works the plan out and writes it on the men: `working` and `noPlaceFor` on every man and the
 *  owner, and the station of every man the plan placed, at the machine of his family or at his
 *  own home cell (CLAUDE.md T25 2.3, 2.6). Everything else that asks where a man is or whether he
 *  works reads what this wrote. */
export function planPlaces(
  state: GameState,
  shift: Shift = 'day',
  given: readonly Hand[] | null = null,
): PlaceEntry[] {
  const entries = dayPlan(state, shift, given);
  const write = (man: { working: boolean; noPlaceFor: string; station: string }, entry: PlaceEntry | undefined): void => {
    if (entry === undefined) {
      man.working = false;
      man.noPlaceFor = '';
      return;
    }
    man.working = entry.working;
    man.noPlaceFor = entry.working || entry.family === null ? '' : entry.family;
    // At his place when he has one; at his bench when his work wants none (by hand, a tool out of
    // the cabinet); and standing at his home cell with the mark over his head when the hall has
    // no place for him (CLAUDE.md T22 2.5, T25 2.3).
    if (!entry.working) man.station = STATION_HOME;
    else man.station = entry.family === null ? STATION_BENCH : machineStation(entry.family);
  };
  const byWho = new Map(entries.map((entry) => [entry.who, entry]));
  write(state.owner, byWho.get(OWNER));
  for (const worker of state.workers) write(worker, byWho.get(worker.id));
  return entries;
}

/** The stage this man works on his job this minute: the job's current stage, on the CNC or off
 *  it as the plan put him (CLAUDE.md T25 2.2). Every man on a job is at the same stage: the bag of
 *  work of v37 is gone. Null only for a job with no labour in it at all. */
export function stageOfMan(state: GameState, who: string, job: Job): StagePlan | null {
  return currentStage(state, job, cncOptions(state, who, job));
}

/** The machine family this job's current stage wants a place at, or null while it wants none or
 *  a bench: what the senior manager reads before he sends a second man to a family whose places
 *  another job already wants (CLAUDE.md T23 2.4, T25 2.3). */
export function machineWantedFor(state: GameState, job: Job): string | null {
  const family = placeFamilyOf(state, stageOfMan(state, leadAssignee(job) ?? OWNER, job), job.byHand);
  return family === BENCH ? null : family;
}

/** The words a man, his card and the Work Plan say while the hall has no place for him: `no place
 *  at the saw`, the family in the trade's own short word (CLAUDE.md T21 2.6, T25 2.3). */
export function placeLine(family: string): string {
  return `no place at the ${machineShortWord(family)}`;
}

/** The words the job carries while the rack has nothing for it (CLAUDE.md T2 3.6). */
export const WAITING_FOR_MATERIAL = 'waiting for material';

/** One man putting one minute into one job, with the machine of his place. Gathered before the
 *  hall is measured, because the extraction and the air sums are the sums of the machines running
 *  this very minute and not of last minute's (CLAUDE.md T10 3.1, 3.2). */
interface AtWork {
  hand: Hand;
  stage: StagePlan;
  machine: Equipment | null;
}

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

/** What this man did with the minute: the stage he worked and the machine his place is at, or
 *  why he stood. The whole of one man's minute before the hall's factors are applied to it, in one
 *  place, because the day and the night both have to ask exactly the same question
 *  (CLAUDE.md T22 2.6). */
export interface HandPlace {
  /** The stage he is at and the machine of his place, or null when he stood. */
  work: { stage: StagePlan; machine: Equipment | null } | null;
  /** What the minute is booked as lost to, or null when he worked it. */
  lost: LostMinuteCause | null;
  /** The rack had nothing for the job he was on: the caller tells the player, once a day. */
  noMaterial: boolean;
}

/** One man's minute on the job he is on, read off the day plan: no place, and he stands at his
 *  home cell and says so; the hall or the rack has stopped his job, and he stands and the job's
 *  row says why; or he works his job's current stage at the machine of his place.
 *
 *  He is never moved to another job and never to another stage of his own (PIOTR, 19.09 and
 *  21.09; CLAUDE.md T22 2.6, T25 2.2). A minute with no place is booked to `noPlace`, and that is
 *  the one thing `noPlace` means: the player buys a machine or takes a man off. */
export function placeHand(state: GameState, hand: Hand, entry: PlaceEntry | undefined): HandPlace {
  if (entry !== undefined && !entry.working) {
    // The job's own row says what the hall has to say about it, a broken saw for one, and draws
    // nothing off the rack for a man who is not working (CLAUDE.md T2 3.9).
    hand.job.blockedBy = hallBlock(state, hand.job);
    return { work: null, lost: 'noPlace', noMaterial: false };
  }
  if (!canWorkOn(state, hand.job)) {
    // The hall or the rack has stopped this job, and the man stays on it: the chips and the warning
    // strip say what is wrong (CLAUDE.md T22 2.5).
    const noMaterial = hand.job.blockedBy === WAITING_FOR_MATERIAL;
    return { work: null, lost: noMaterial ? 'noMaterial' : 'hallStopped', noMaterial };
  }
  // The plan had nothing for him to want this minute although the job can be worked: the hall
  // stopped it at his stage a moment ago. He stands, and the minute is the hall's.
  if (entry === undefined) return { work: null, lost: 'hallStopped', noMaterial: false };
  const stage = stageOfMan(state, hand.who, hand.job);
  if (stage === null) return { work: null, lost: null, noMaterial: false };
  return { work: { stage, machine: entry.machine }, lost: null, noMaterial: false };
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
 *  The reasons of a man on a job are the workshop's own and are read the same way for him and for a
 *  man on the books (`standingReason`): no place, then the rack, then the air at the bench, and
 *  the hall for everything else (CLAUDE.md T13 3.5, T25 2.3). The other two are his alone: nothing
 *  in the hall is his, or there is nothing in the hall at all. */
export function ownerIdleReason(state: GameState): OwnerIdleReason | null {
  const owner = state.owner;
  if (!ownerIsAvailable(state)) return null;
  if (isBreak(state.clock.minute) && !owner.breakSkipped) return null;
  if (owner.currentTaskId !== null) return null;
  const job = jobOf(state, OWNER);
  if (job !== null) return standingReason(state, owner, job);
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

/** True when this job's current stage has a place the day plan has not given out, or wants none:
 *  the only jobs the owner walks on to by himself, so he never takes a place from a man already on
 *  one (CLAUDE.md T25 2.3). */
function placeToSpareFor(state: GameState, job: Job): boolean {
  const family = placeFamilyOf(state, currentStage(state, job, { cnc: true }), job.byHand);
  if (family === null) return true;
  const wanting = dayPlan(state).filter((entry) => entry.family === family).length;
  return wanting < hallPlaces(state, family);
}

/** Why a man on a job stood through the minute: the hall had no place for him, the rack had
 *  nothing for his job, his bench had no air behind it, or the hall stopped the job. The one
 *  reading of it, for the owner and for a man on the books alike (CLAUDE.md T23 2.7, T25 2.3). */
function standingReason(
  state: GameState,
  man: { noPlaceFor: string },
  job: Job,
): 'noPlace' | 'noMaterial' | 'noCompressor' | 'hallStopped' {
  if (man.noPlaceFor !== '') return 'noPlace';
  if (!rackCanSupply(state, job, jobProgress(job))) return 'noMaterial';
  const who = man === state.owner ? OWNER : (state.workers.find((worker) => worker === man)?.id ?? OWNER);
  return standsForAir(state, stageOfMan(state, who, job)) ? 'noCompressor' : 'hallStopped';
}

/** The owner goes to the bench when his office is empty (PIOTR, 20.09: "he never stands doing
 *  nothing"; CLAUDE.md T23 2.3). Once a minute: he is in, he is on the hall side of the door, he
 *  holds no chore and no job, and there is nothing in his office queue he could do now. Then he
 *  goes to the job with the soonest deadline, `jobForTheOwner`.
 *
 *  v41 (PIOTR, 21.09): he JOINS it, whoever is on it. Turn 23 gave him the oldest job with nobody
 *  on it, and in a hall where the crew hold every job that is no job at all, so he stood in the
 *  office exactly as he did before 2.3 was written. He is a second pair of hands now, and as the
 *  first man of the day plan he has the first place at his job's stage (CLAUDE.md T25 2.3). The
 *  evening take over of Turn 17 is still
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
  const job = jobForTheOwner(state, (open) => placeToSpareFor(state, open));
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
  return standingReason(state, worker, job);
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

/** One clock minute of production for the hands given: the day plan gives them their places, the
 *  hall is measured with the machines at work running, and every man with a place puts a minute
 *  into his job at the pace of his stage and the hall's factor. The hours go on the machines of
 *  their places, and the dust into the store (CLAUDE.md T7 3.1, T10 3.1 to 3.3, T12 2.3). At night every
 *  minute is written on the job as a night one, which the client sees in the finish, and on the
 *  day's night count (CLAUDE.md T13 3.9). The day's production minute in game.ts does exactly
 *  this; the night shift calls it here. */
export function workMinute(
  state: GameState,
  working: readonly Hand[],
  options: { night?: boolean } = {},
): MinuteReport {
  const night = options.night === true;
  // Who has a place this minute: the plan of the shift that is working (CLAUDE.md T25 2.3).
  const plan = new Map(planPlaces(state, night ? 'night' : 'day', working).map((entry) => [entry.who, entry]));
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
  // Who actually works this minute. Nothing is worked off the job yet: the hall's media are the
  // sums of the machines at work this very minute (CLAUDE.md T10 3.1, 3.2).
  const atWork: AtWork[] = [];
  for (const hand of working) {
    // One reading of a man's minute (CLAUDE.md T22 2.6, T25 2.3): his place, the hall, the rack.
    const place = placeHand(state, hand, plan.get(hand.who));
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
  // in `placeHand`, because the air sum is the sum of the machines running this very minute, which
  // is not known until every hand has been placed.
  const running: AtWork[] = [];
  for (const entry of atWork) {
    if (standsForAir(state, entry.stage)) {
      // He keeps his place at the bench and stands at it. The minute is one the hall stopped and
      // the mark over his head says why (src/engine/bubbles.ts).
      lose('hallStopped');
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
    // A machine books an hour for every hour a man works at one of its places (PIOTR, 21.09:
    // "keep the hours"; CLAUDE.md T25 section 6).
    if (machine !== null) used.set(machine.id, (used.get(machine.id) ?? 0) + 1);
    // The pace is the hall's and not the machine's he is at: the stage's own speed, the best of
    // its family in the hall, whichever of them his place is at (CLAUDE.md T25 2.4).
    let speed = stage.speed;
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
    // the labour is made of, and nothing else, booked against the man who worked it (v50).
    bookOutputMinute(state, hand.who, hand.rate * trade * speed * hall);
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
