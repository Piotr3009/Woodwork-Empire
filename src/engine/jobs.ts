// The life of a job, from the enquiry the player accepted to the rating the client leaves.
// enquiry, accepted, calls, design, material ordered, material in the yard, unloaded, ready,
// in production, completed, paid and rated (CLAUDE.md 9.5).

import {
  COURIER_COST,
  MEETING_PRICE_THRESHOLD,
  SAW_FALLBACK_DEFAULT,
  DEADLINE_DAYS_BASE,
  DEADLINE_DAYS_FACTOR,
  DEADLINE_DAYS_MAX,
  DEADLINE_DAYS_MIN,
  DEADLINE_EXPRESS_FACTOR,
  DEADLINE_SLACK_PERCENT_MAX,
  DEADLINE_SLACK_PERCENT_MIN,
  DEADLINE_SMALL_JOB_PRICE,
  DEADLINE_SMALL_SLACK_DAYS,
  DEPOSIT_FRACTION,
  EMAIL_PAYMENT_PENALTY,
  EMAIL_PAYMENT_PENALTY_MAX,
  LABOUR_FRACTION,
  LATE_PENALTY_PER_DAY,
  LATE_PENALTY_PER_DAY_EXPRESS,
  MINUTES_PER_WORKING_DAY,
  SITE_MEASURE_MINUTES,
  SITE_MEASURE_TAXI_COST,
  WORKER_MINUTE_RATE_DIVISOR,
} from './constants';
import { canAccept, findEnquiry, removeEnquiry } from './board';
import { callRinging, scheduleCalls } from './calls';
import { template } from './catalog';
import { nextWorkingDay } from './clock';
import { chargeUnavoidable, formatMoney, receive } from './economy';
import { queueEvent } from './events';
import {
  OWNER,
  familyStopped,
  findSpec,
  has,
  hasBenchFor,
  hasExtraction,
  releaseMachines,
} from './machines';
import {
  materialCostFor,
  orderMaterialForJob,
  rackCanSupply,
  sheetsForCost,
  stockCostFor,
} from './materials';
import { ownerIsAvailable } from './owner';
import {
  type StageOptions,
  type StagePlan,
  type StagedJob,
  cncOptions,
  currentStage,
  jobMinutesFor,
  minutesLeftFor,
} from './stages';
import { applyRating } from './reputation';
import { int, makeId } from './rng';
import { plural } from './text';
import {
  AD_HOC_TASK_MINUTES,
  WORK_EPSILON,
  createTask,
  designMinutes,
  emailMinutes,
  emailsForPrice,
  jobTasks,
  materialOrderMinutes,
} from './tasks';
import type {
  Finish,
  GameState,
  Job,
  JobStage,
  MaterialKind,
  MaterialMode,
  StageId,
} from './types';

export function findJob(state: GameState, jobId: string): Job | null {
  return state.jobs.find((job) => job.id === jobId) ?? null;
}

/** The job the owner is standing at. One source of truth: the job's own assignment. */
export function ownerJob(state: GameState): Job | null {
  return state.jobs.find((job) => job.assignedTo === 'owner' && job.stage === 'inProduction') ?? null;
}

export function openJobs(state: GameState): Job[] {
  return state.jobs.filter((job) => job.stage !== 'completed');
}

export function labourValueFor(price: number): number {
  return price * LABOUR_FRACTION;
}

/** A job as the stages read it. Everything that asks what a piece of work will take comes through
 *  here, an enquiry nobody has accepted included (CLAUDE.md T7 3.1). */
export function stagedJob(
  labourValue: number,
  materialKind: MaterialKind,
  byHand: boolean,
  finish: Finish = 'laminate',
): StagedJob {
  return { labourValue, materialKind, finish, byHand };
}

/** Days of the owner's own time this much labour takes with the machines the hall has now: every
 *  stage at the speed of the best machine of its family, added up (CLAUDE.md T7 3.1). The same
 *  number the board tile shows and the deadline is worked out from (CLAUDE.md T6 3.7). */
export function ownerDaysFor(
  state: GameState,
  labourValue: number,
  materialKind: MaterialKind,
  byHand = false,
): number {
  const minutes = jobMinutesFor(state, stagedJob(labourValue, materialKind, byHand), 1);
  return minutes / MINUTES_PER_WORKING_DAY;
}

/** How long the client gives, worked out from the work in the job and nothing else. The slack is
 *  one draw either way, so the seeded stream is the same shape for a small job and a big one
 *  (CLAUDE.md T6 3.7). */
export function deadlineDaysFor(
  state: GameState,
  job: { ownerDays: number; price: number; express: boolean },
): number {
  const base = Math.min(
    DEADLINE_DAYS_MAX,
    Math.max(
      DEADLINE_DAYS_MIN,
      Math.floor(job.ownerDays * DEADLINE_DAYS_FACTOR + DEADLINE_DAYS_BASE),
    ),
  );
  const slack =
    job.price <= DEADLINE_SMALL_JOB_PRICE
      ? int(state, 0, DEADLINE_SMALL_SLACK_DAYS)
      : Math.round(
          (base * int(state, DEADLINE_SLACK_PERCENT_MIN, DEADLINE_SLACK_PERCENT_MAX)) / 100,
        );
  const standard = base + slack;
  if (!job.express) return standard;
  return Math.max(DEADLINE_DAYS_MIN, Math.round(standard * DEADLINE_EXPRESS_FACTOR));
}

/** What a worker of this rate is worth per minute, for the job card only [TUNE]. */
export function workerMinuteCost(weeklyWage: number): number {
  return weeklyWage / WORKER_MINUTE_RATE_DIVISOR;
}

/** What the rest of a job costs in wages if the man on it finishes it, for the job card only
 *  (CLAUDE.md 8.5). The owner costs nothing: his time is not a wage. */
export function jobLabourCost(state: GameState, job: Job): { minutes: number; cost: number } {
  const worker =
    job.assignedTo === null || job.assignedTo === 'owner'
      ? null
      : state.workers.find((entry) => entry.id === job.assignedTo);
  if (!worker || worker.rate <= 0) {
    return { minutes: minutesRemainingFor(state, job, 1), cost: 0 };
  }
  const minutes = minutesRemainingFor(state, job, worker.rate);
  return { minutes, cost: minutes * workerMinuteCost(worker.weeklyWage) };
}

/** How far through the job the bench is, 0 to 1. */
export function jobProgress(job: Job): number {
  if (job.labourValue <= 0) return 1;
  return Math.min(1, Math.max(0, 1 - job.labourRemaining / job.labourValue));
}

/** The stage this job is standing at, with the family it is done on and what that family does to
 *  its minutes. Null only for a job with no labour in it at all. */
export function jobStage(
  state: GameState,
  job: Job,
  options: StageOptions = {},
): StagePlan | null {
  return currentStage(state, job, options);
}

/** The player's say over whether this job waits for the CNC or goes on the saw when the CNC is
 *  taken (CLAUDE.md T7 3.4). */
export function setSawFallback(state: GameState, jobId: string, on: boolean): boolean {
  const job = findJob(state, jobId);
  if (!job) return false;
  job.sawFallback = on;
  return true;
}

/** Minutes this job still needs from a worker of the given rate (1 is the owner). Every stage
 *  still ahead of him at its own machine's speed (CLAUDE.md T7 3.1). */
export function minutesRemainingFor(state: GameState, job: Job, rate: number): number {
  if (rate <= 0) return Infinity;
  return minutesLeftFor(state, job, rate);
}

// ---------------------------------------------------------------------------
// Accepting
// ---------------------------------------------------------------------------

export interface AcceptResult {
  ok: boolean;
  reason: string;
  job: Job | null;
}

/** Takes an enquiry off the board and turns it into a job with its owner tasks. */
export function acceptEnquiry(state: GameState, enquiryId: string, byHand: boolean): AcceptResult {
  const enquiry = findEnquiry(state, enquiryId);
  if (!enquiry) return { ok: false, reason: 'That enquiry has gone', job: null };
  const allowed = canAccept(state, enquiry);
  if (!allowed.ok) return { ok: false, reason: allowed.reason, job: null };
  const locked = enquiry.lockReason !== null;
  if (locked && !byHand) {
    return { ok: false, reason: 'Only as a by hand job', job: null };
  }
  const madeByHand = locked;
  const entry = template(enquiry.templateId);
  // Material and labour come off the base price, so the express uplift is pure profit (T2 3.4).
  const materialCost = materialCostFor(enquiry.basePrice, enquiry.bespokeMaterial);
  const labourValue = labourValueFor(enquiry.basePrice);
  const job: Job = {
    id: makeId(state, 'job'),
    templateId: enquiry.templateId,
    name: enquiry.name,
    price: enquiry.price,
    basePrice: enquiry.basePrice,
    sizeMultiplier: enquiry.sizeMultiplier,
    finish: enquiry.finish,
    materialKind: enquiry.materialKind,
    materialCost,
    materialMode: 'auto',
    sheets: sheetsForCost(materialCost),
    sheetsUsed: 0,
    blockedBy: '',
    bespokeMaterial: enquiry.bespokeMaterial,
    express: enquiry.express,
    byHand: madeByHand,
    sawFallback: SAW_FALLBACK_DEFAULT,
    needsMeasure: enquiry.needsMeasure,
    labourValue,
    labourRemaining: labourValue,
    acceptedDay: state.clock.day,
    dueDay: state.clock.day + enquiry.deadlineDays,
    stage: 'accepted',
    finishedDay: null,
    deliverOnDay: null,
    calls: [],
    callsMissed: 0,
    designMinutesRemaining: designMinutes(entry, enquiry.sizeMultiplier, state.software.tier),
    assignedTo: null,
    stageRuns: [],
    completedDay: null,
    daysLate: 0,
    depositPaid: 0,
    balancePaid: 0,
    penalty: 0,
    emailsUnanswered: 0,
    rating: null,
    overdueWarned: false,
  };
  state.jobs.push(job);
  removeEnquiry(state, enquiryId);
  if (state.software.mode === 'oneOff' && state.software.jobsRemaining > 0) {
    state.software.jobsRemaining -= 1;
  }
  const deposit = Math.round(job.price * DEPOSIT_FRACTION * 100) / 100;
  job.depositPaid = deposit;
  receive(state, 'jobDeposit', `Deposit for ${job.name}`, deposit);
  createJobTasks(state, job);
  return { ok: true, reason: '', job };
}

/** The emails, the drawing and the site visit the job needs from the owner, and the diary of the
 *  calls the client will make. The calls are not tasks any more: they interrupt (T4 3.3). */
/** True while the meeting a big job starts with has not been held (CLAUDE.md T7 3.11). */
export function meetingOutstanding(state: GameState, job: Job): boolean {
  return jobTasks(state, job.id).some((task) => task.kind === 'clientMeeting' && !task.done);
}

/** A job worth more than 20,000 starts with four hours at the client's (PIOTR). */
export function needsMeeting(price: number): boolean {
  return price > MEETING_PRICE_THRESHOLD;
}

export function createJobTasks(state: GameState, job: Job): void {
  scheduleCalls(state, job);
  // The meeting comes before the drawing, and the drawing cannot start until it is held
  // (CLAUDE.md T7 3.11).
  if (needsMeeting(job.price)) {
    createTask(state, {
      kind: 'clientMeeting',
      label: `Client meeting: ${job.name}`,
      minutes: AD_HOC_TASK_MINUTES.clientMeeting,
      jobId: job.id,
    });
  }
  // Emails ride with the job, in any order with the drawing, and hold nothing up.
  const emails = emailsForPrice(job.price);
  for (let index = 0; index < emails; index += 1) {
    createTask(state, {
      kind: 'emails',
      label: `Email ${index + 1} of ${emails}: ${job.name}`,
      minutes: emailMinutes(),
      jobId: job.id,
    });
  }
  createTask(state, {
    kind: 'design',
    label: `Design: ${job.name}`,
    minutes: job.designMinutesRemaining,
    jobId: job.id,
  });
  if (job.needsMeasure) {
    createTask(state, {
      kind: 'siteMeasure',
      label: `Site measure: ${job.name}`,
      minutes: SITE_MEASURE_MINUTES,
      jobId: job.id,
    });
  }
}

// ---------------------------------------------------------------------------
// The stages
// ---------------------------------------------------------------------------

/** Emails the client never got an answer to. They hold nothing up, they just cost at the end. */
export function emailsOutstanding(state: GameState, job: Job): number {
  return jobTasks(state, job.id).filter((task) => task.kind === 'emails' && !task.done).length;
}

function designOutstanding(state: GameState, job: Job): boolean {
  return jobTasks(state, job.id).some((task) => task.kind === 'design' && !task.done);
}

function measureOutstanding(state: GameState, job: Job): boolean {
  return jobTasks(state, job.id).some((task) => task.kind === 'siteMeasure' && !task.done);
}

/** True once the drawings exist (CLAUDE.md 9.5). The calls used to be in this list and are not
 *  any more: nothing waits on the phone (CLAUDE.md T4 3.3). */
export function readyToOrderMaterial(state: GameState, job: Job): boolean {
  return !designOutstanding(state, job) && !measureOutstanding(state, job);
}

/** Keeps the job stage and its task list in step after anything finishes. */
export function refreshJob(state: GameState, job: Job): void {
  if (job.stage !== 'accepted' && job.stage !== 'materialPending') return;
  if (designOutstanding(state, job)) {
    const design = jobTasks(state, job.id).find((task) => task.kind === 'design');
    job.designMinutesRemaining = design ? Math.max(0, Math.ceil(design.minutesRemaining)) : 0;
  } else {
    job.designMinutesRemaining = 0;
  }
  if (!readyToOrderMaterial(state, job)) {
    job.stage = 'accepted';
    return;
  }
  // The rack has it: nothing to order, nothing to wait for. The sheets come off the rack as the
  // job is made, like every other job (PIOTR, 13.09: "it does not take from stock at all").
  if (canDrawFromStock(state, job)) {
    for (const task of jobTasks(state, job.id)) {
      if (task.kind === 'materialOrder' && !task.done) task.done = true;
    }
    job.materialCost = stockCostFor(job.sheets);
    job.stage = 'ready';
    return;
  }
  job.stage = 'materialPending';
  const hasOrderTask = jobTasks(state, job.id).some((task) => task.kind === 'materialOrder');
  if (!hasOrderTask) {
    createTask(state, {
      kind: 'materialOrder',
      label: `Material order: ${job.name}`,
      minutes: Math.round(materialOrderMinutes(job.price)),
      jobId: job.id,
    });
  }
}

/** The site measure costs a taxi while there is no van (CLAUDE.md 8.10). */
export function chargeSiteMeasure(state: GameState, job: Job): void {
  if (!has(state, 'van')) {
    chargeUnavoidable(state, 'taxi', `Taxi to the site for ${job.name}`, SITE_MEASURE_TAXI_COST);
  }
}

/** The material order task is done: the lorry is booked, or the sheets come off the rack. */
/** Sheets off the rack only cover board jobs of standard material (CLAUDE.md 8.9). */
/** Sheets on the rack that other stock jobs have not yet used: what this job can still count on.
 *  Without this, three jobs would each see the same forty sheets and two of them would stand
 *  waiting for material half way through (PIOTR, 13.09). */
export function sheetsFreeFor(state: GameState, job: Job): number {
  let promised = 0;
  for (const other of state.jobs) {
    if (other.id === job.id) continue;
    if (other.materialMode === 'perJob' || other.materialKind !== 'sheet') continue;
    if (other.stage !== 'ready' && other.stage !== 'inProduction') continue;
    // Only jobs that are actually eating the rack: a per job order came off its own lorry.
    if (other.materialCost !== stockCostFor(other.sheets)) continue;
    promised += Math.max(0, other.sheets - other.sheetsUsed);
  }
  return state.stock.sheets - promised;
}

export function canDrawFromStock(state: GameState, job: Job): boolean {
  if (job.materialMode === 'perJob') return false;
  if (job.materialKind !== 'sheet' || job.bespokeMaterial) return false;
  return sheetsFreeFor(state, job) >= job.sheets;
}

export function onMaterialOrdered(state: GameState, job: Job): void {
  if (canDrawFromStock(state, job)) {
    // The sheets were paid for when they were bought, at the cheaper stock price. They stay on
    // the rack and come off it as the job is made, like every other job (CLAUDE.md T2 3.6).
    job.materialCost = stockCostFor(job.sheets);
    job.stage = 'ready';
    return;
  }
  job.materialMode = 'perJob';
  orderMaterialForJob(state, job);
  job.stage = 'materialOrdered';
}

export function onDeliveryArrived(state: GameState, jobId: string | null): void {
  if (!jobId) return;
  const job = findJob(state, jobId);
  if (job && job.stage === 'materialOrdered') job.stage = 'materialInYard';
}

export function onDeliveryUnloaded(state: GameState, jobId: string | null): void {
  if (!jobId) return;
  const job = findJob(state, jobId);
  if (job && (job.stage === 'materialInYard' || job.stage === 'materialOrdered')) {
    job.stage = 'ready';
  }
}

export function setMaterialMode(state: GameState, jobId: string, mode: MaterialMode): boolean {
  const job = findJob(state, jobId);
  if (!job) return false;
  if (job.stage !== 'accepted' && job.stage !== 'materialPending') return false;
  job.materialMode = mode;
  return true;
}

// ---------------------------------------------------------------------------
// Production
// ---------------------------------------------------------------------------

/** Everything in the hall that can stop a job, in the order the player would notice it. Empty
 *  while the job is free to be worked on (CLAUDE.md T2 3.9). */
export function hallBlock(state: GameState, job: Job): string {
  if (!job.byHand && !hasExtraction(state)) return 'no extraction';
  // A bench is the one thing a piece cannot be made without, by hand or not (CLAUDE.md T4 3.4).
  if (!hasBenchFor(state, job.id)) return 'no bench';
  if (job.byHand) return '';
  // Only the machine of the stage he is at can stop him: a broken edgebander does not stop a
  // job that is still being cut (CLAUDE.md T7 3.1).
  const stage = jobStage(state, job, cncOptions(state, job.assignedTo ?? OWNER, job));
  const family = stage?.family ?? null;
  if (family === null) return '';
  const stopped = familyStopped(state, family);
  if (stopped === null) return '';
  if (stopped.why === 'bag') return 'bag full';
  return `${(findSpec(stopped.item.specId)?.name ?? 'a machine').toLowerCase()} is broken`;
}

/** The stages a job can still be sent to the bench from. Once somebody is on it there is nothing
 *  to start (CLAUDE.md T3 3.1). */
const STARTABLE_STAGES: JobStage[] = [
  'accepted',
  'materialPending',
  'materialOrdered',
  'materialInYard',
  'ready',
  'inProduction',
];

/** True while the job card carries a Start production button, pressable or not. */
export function showsStartProduction(job: Job): boolean {
  return STARTABLE_STAGES.includes(job.stage) && job.assignedTo === null;
}

export interface StartCheck {
  ok: boolean;
  reason: string;
}

const CAN_START: StartCheck = { ok: true, reason: '' };

function blocked(reason: string): StartCheck {
  return { ok: false, reason };
}

/** When the lorry for this job is due, in the words the player uses for it. */
function arrivalReason(state: GameState, job: Job): string {
  const delivery = state.deliveries.find(
    (entry) => entry.jobId === job.id && !entry.arrived,
  );
  if (!delivery) return 'material not ordered';
  const wait = delivery.arriveDay - state.clock.day;
  if (wait <= 1) return 'material arrives tomorrow';
  return `material arrives on day ${delivery.arriveDay}`;
}

/** Why the owner cannot go and make this one, or that he can. Exactly one reason, the first
 *  thing in the lifecycle that is in the way (CLAUDE.md T3 3.1). */
export function startProductionCheck(state: GameState, job: Job): StartCheck {
  // The stage is the job's place in the lifecycle, so the desk work is only in the way while the
  // job is still standing at the desk.
  if (job.stage === 'accepted') {
    if (meetingOutstanding(state, job)) return blocked('meeting not held');
    if (designOutstanding(state, job)) return blocked('design not done');
    if (measureOutstanding(state, job)) return blocked('site measure not done');
  }
  if (job.stage === 'accepted' || job.stage === 'materialPending') {
    return blocked('material not ordered');
  }
  if (job.stage === 'materialOrdered') return blocked(arrivalReason(state, job));
  if (job.stage === 'materialInYard') return blocked('unload the delivery');
  if (!rackCanSupply(state, job, jobProgress(job))) return blocked('waiting for material');
  const hall = hallBlock(state, job);
  if (hall !== '') return blocked(hall);
  if (!ownerIsAvailable(state)) return blocked('no free hands');
  return CAN_START;
}

export type StepState = 'done' | 'now' | 'todo';

export interface LifecycleStep {
  label: string;
  state: StepState;
}

const LIFECYCLE_LABELS = ['Calls', 'Design', 'Material', 'Delivery', 'Production'];
/** A job over 20,000 has one step more, and it comes before the drawing (CLAUDE.md T7 3.11). */
const MEETING_LABEL = 'Meeting';

/** The Production step names the stage the piece is actually at, so the five step row answers
 *  "what is happening to it now" as well as "where is it up to" (CLAUDE.md T7 3.1). */
function productionLabel(state: GameState, job: Job): string {
  if (job.stage !== 'inProduction') return 'Production';
  const stage = jobStage(state, job);
  return stage === null ? 'Production' : `Production: ${stage.label}`;
}

/** The five steps of a job, so the card answers "what am I waiting for" without being read
 *  (CLAUDE.md T3 3.1). The first step that is not finished is the one in hand. */
export function lifecycleSteps(state: GameState, job: Job): LifecycleStep[] {
  const ordered = job.stage !== 'accepted' && job.stage !== 'materialPending';
  const meeting = needsMeeting(job.price);
  const done = [
    ...(meeting ? [ordered || !meetingOutstanding(state, job)] : []),
    // Calls hold nothing up any more, so this step is only ever amber while the client is
    // actually on the line (CLAUDE.md T4 3.3).
    !callRinging(state, job),
    ordered || (!designOutstanding(state, job) && !measureOutstanding(state, job)),
    ordered,
    job.stage === 'ready' ||
      job.stage === 'inProduction' ||
      job.stage === 'awaitingTransport' ||
      job.stage === 'completed',
    job.stage === 'awaitingTransport' || job.stage === 'completed',
  ];
  const labels = meeting ? [MEETING_LABEL, ...LIFECYCLE_LABELS] : LIFECYCLE_LABELS;
  const now = done.indexOf(false);
  return labels.map((label, index) => ({
    label: index === labels.length - 1 ? productionLabel(state, job) : label,
    state: done[index] === true ? 'done' : index === now ? 'now' : 'todo',
  }));
}

/** The oldest job with its material in the hall and nobody on it. */
export function oldestReadyJob(state: GameState): Job | null {
  return (
    state.jobs.find((job) => job.stage === 'ready' && job.assignedTo === null) ??
    state.jobs.find((job) => job.stage === 'ready') ??
    null
  );
}

export function assignJob(state: GameState, jobId: string, workerId: string | null): boolean {
  const job = findJob(state, jobId);
  if (!job) return false;
  if (job.stage !== 'ready' && job.stage !== 'inProduction') return false;
  if (workerId === null) {
    releaseJob(state, job);
    return true;
  }
  const worker =
    workerId === 'owner' ? null : state.workers.find((entry) => entry.id === workerId) ?? null;
  if (workerId === 'owner') {
    if (!ownerIsAvailable(state)) return false;
  } else if (!worker || worker.role !== 'joiner' || worker.absentDaysRemaining > 0) {
    return false;
  }
  // Whoever was on this job comes off it, and the new man comes off whatever he was on.
  releaseJob(state, job);
  const previous = state.jobs.find((entry) => entry.id !== job.id && entry.assignedTo === workerId);
  if (previous) releaseJob(state, previous);
  if (worker) {
    worker.jobId = job.id;
  } else {
    // The owner cannot draw and cut at the same time.
    state.owner.currentTaskId = null;
  }
  job.assignedTo = workerId;
  job.stage = 'inProduction';
  return true;
}

/** Takes whoever is on the job off it, leaving the work done in place. He walks away from every
 *  machine he was standing at, so the next man can have it (CLAUDE.md T7 3.1). */
export function releaseJob(state: GameState, job: Job): void {
  const worker = state.workers.find((entry) => entry.jobId === job.id);
  if (worker) worker.jobId = null;
  if (job.assignedTo !== null) releaseMachines(state, job.assignedTo);
  job.assignedTo = null;
  closeStageRun(state, job);
  if (job.stage === 'inProduction') job.stage = 'ready';
}

/** Writes down that somebody worked this stage this minute. A run is opened when the stage is not
 *  the one already open, and the one before it is closed at that moment: the Work Plan's bars and
 *  its grey gaps are read off these and off nothing else (CLAUDE.md T7 3.2). */
export function noteStageWork(state: GameState, job: Job, stage: StageId): void {
  const open = job.stageRuns[job.stageRuns.length - 1];
  if (open && open.endDay === null && open.stage === stage) return;
  if (open && open.endDay === null) closeStageRun(state, job);
  job.stageRuns.push({
    stage,
    startDay: state.clock.day,
    startMinute: state.clock.minute,
    endDay: null,
    endMinute: null,
  });
}

/** Closes whatever run is open, at this minute. */
export function closeStageRun(state: GameState, job: Job): void {
  const open = job.stageRuns[job.stageRuns.length - 1];
  if (!open || open.endDay !== null) return;
  open.endDay = state.clock.day;
  open.endMinute = state.clock.minute;
}

/** Work one person minute of labour into a job. What actually went in is booked against the day
 *  here, so the earned labour rate counts what was produced and not what was offered: the last
 *  minute of a job is usually a part minute (CLAUDE.md T6 3.8). The stage it went into is written
 *  down with it (CLAUDE.md T7 3.2). Returns true when it finished. */
export function addLabour(state: GameState, job: Job, labour: number, stage: StageId): boolean {
  if (labour <= 0) return false;
  noteStageWork(state, job, stage);
  const put = Math.min(labour, Math.max(0, job.labourRemaining));
  job.labourRemaining -= labour;
  state.dayStats.workMinutes += 1;
  state.dayStats.labourValue = Math.round((state.dayStats.labourValue + put) * 10000) / 10000;
  if (!state.dayStats.jobsAdvanced.includes(job.id)) state.dayStats.jobsAdvanced.push(job.id);
  if (job.labourRemaining > WORK_EPSILON) return false;
  job.labourRemaining = 0;
  completeJob(state, job);
  return true;
}

/** The piece is made. It stands in front of the gate until somebody takes it to the client, and
 *  nothing is paid until it gets there (CLAUDE.md T2 3.7). Who takes it there is a decision, so
 *  the event that asks is raised by game.ts, the only module that can send a man. */
export function completeJob(state: GameState, job: Job): void {
  closeStageRun(state, job);
  releaseJob(state, job);
  job.assignedTo = null;
  job.stage = 'awaitingTransport';
  job.finishedDay = state.clock.day;
  state.dayStats.jobsCompleted.push(job.id);
}

/** Everything made and not yet taken away. */
export function jobsAtGate(state: GameState): Job[] {
  return state.jobs.filter((job) => job.stage === 'awaitingTransport');
}

/** What ordering transport costs today: a courier, or 90 minutes of somebody with the van. */
export function transportLabel(state: GameState): string {
  return has(state, 'van')
    ? `Take it in the van, ${AD_HOC_TASK_MINUTES.deliver} min`
    : `Courier ${formatMoney(COURIER_COST)}, next working day`;
}

/** Books the piece out: the van goes today, a courier comes tomorrow (CLAUDE.md T2 3.7). */
export function orderTransport(state: GameState, jobId: string): boolean {
  const job = findJob(state, jobId);
  if (!job || job.stage !== 'awaitingTransport' || job.deliverOnDay !== null) return false;
  if (has(state, 'van')) {
    const open = state.tasks.find(
      (task) => task.kind === 'deliver' && task.jobId === job.id && !task.done,
    );
    if (!open) {
      createTask(state, {
        kind: 'deliver',
        label: `Deliver ${job.name}`,
        minutes: AD_HOC_TASK_MINUTES.deliver,
        jobId: job.id,
      });
    }
    return true;
  }
  chargeUnavoidable(state, 'transport', `Courier for ${job.name}`, COURIER_COST);
  job.deliverOnDay = nextWorkingDay(state.clock.day);
  return true;
}

/** Late penalties come out of the balance, and the client always pays the rest (CLAUDE.md 8.7).
 *  The clock on lateness runs to the day the client actually gets the piece. */
/** What the emails nobody answered take off the payment: 1% of the price each, capped at 5%. */
export function emailPaymentPenalty(price: number, unanswered: number): number {
  const fraction = Math.min(EMAIL_PAYMENT_PENALTY_MAX, EMAIL_PAYMENT_PENALTY * unanswered);
  return Math.round(price * fraction * 100) / 100;
}

export function deliverJob(state: GameState, job: Job): void {
  if (job.stage !== 'awaitingTransport') return;
  job.stage = 'completed';
  job.completedDay = state.clock.day;
  job.deliverOnDay = null;
  job.daysLate = Math.max(0, state.clock.day - job.dueDay);
  job.emailsUnanswered = emailsOutstanding(state, job);
  const rate = job.express ? LATE_PENALTY_PER_DAY_EXPRESS : LATE_PENALTY_PER_DAY;
  const balanceDue = Math.round(job.price * (1 - DEPOSIT_FRACTION) * 100) / 100;
  const late = Math.round(job.daysLate * rate * job.price * 100) / 100;
  const emails = emailPaymentPenalty(job.price, job.emailsUnanswered);
  const penalty = Math.min(balanceDue, Math.round((late + emails) * 100) / 100);
  job.penalty = penalty;
  job.balancePaid = Math.round((balanceDue - penalty) * 100) / 100;
  receive(state, 'jobBalance', `Balance for ${job.name}`, job.balancePaid);
  // The unanswered ones are moot once the client has the job: they come off the list.
  state.tasks = state.tasks.filter((task) => !(task.kind === 'emails' && task.jobId === job.id));
  const rating = applyRating(state, job);
  const lateLine =
    job.daysLate > 0
      ? ` ${plural(job.daysLate, 'day', 'days')} late.`
      : '';
  const emailLine =
    job.emailsUnanswered > 0
      ? ` ${plural(job.emailsUnanswered, 'email', 'emails')} never got an answer.`
      : '';
  const callLine =
    job.callsMissed > 0
      ? ` ${plural(job.callsMissed, 'call', 'calls')} rang out.`
      : '';
  const penaltyLine = penalty > 0 ? ` Penalty ${formatMoney(penalty)}.` : '';
  queueEvent(state, {
    kind: 'jobPaid',
    title: `${job.name} delivered`,
    body:
      `Balance ${formatMoney(job.balancePaid)} in.${lateLine}${emailLine}${callLine}` +
      `${penaltyLine} ` +
      `The client rates the job ${rating >= 0 ? '+' : ''}${rating}.`,
    data: { jobId: job.id, rating, balance: Math.round(job.balancePaid), late: job.daysLate },
  });
}

/** The couriers that were booked yesterday turn up. Runs at the start of the day. */
export function runBookedTransport(state: GameState): void {
  for (const job of jobsAtGate(state)) {
    if (job.deliverOnDay !== null && job.deliverOnDay <= state.clock.day) deliverJob(state, job);
  }
}

/** Warns once per job when the deadline has gone by. Runs at the start of the day. */
export function checkOverdueJobs(state: GameState): void {
  for (const job of state.jobs) {
    if (job.stage === 'completed' || job.overdueWarned) continue;
    if (state.clock.day <= job.dueDay) continue;
    job.overdueWarned = true;
    queueEvent(state, {
      kind: 'jobOverdue',
      title: `${job.name} is late`,
      body: 'The deadline has gone by. Every day now costs a slice of the balance.',
      data: { jobId: job.id },
    });
  }
}
