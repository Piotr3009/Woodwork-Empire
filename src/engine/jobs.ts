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
  DROP_PROJECT_REPUTATION,
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
import { canAccept, drawOffer, findEnquiry, removeEnquiry } from './board';
import { callRinging, scheduleCalls } from './calls';
import { template } from './catalog';
import { addWorkingDays, isOvertime, nextWorkingDay, workingDaysBetween } from './clock';
import { chargeUnavoidable, formatMoney, noteLoss, receive } from './economy';
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
  orderForJob,
  rackCanSupply,
  releaseReservation,
  reserveSheetsFor,
  sheetsDueFor,
  sheetsForCost,
  shortfallOf,
} from './materials';
import { familyAirBlock } from './media';
import { firstOnOrder } from './orders';
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
import { applyRating, changeReputation } from './reputation';
import { float, int, makeId } from './rng';
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
import type { Finish, GameState, Job, JobStage, JsonValue, MaterialKind, StageId } from './types';

export function findJob(state: GameState, jobId: string): Job | null {
  return state.jobs.find((job) => job.id === jobId) ?? null;
}

/** The job this man is standing at, whether he is the first man on it or the second: two men can
 *  be on one job now, and the owner is the second man on the one he takes on for an evening
 *  (CLAUDE.md T17 2.10, 2.12). The one finder for it. */
export function jobHeldBy(state: GameState, who: string): Job | null {
  const job =
    state.jobs.find((entry) => entry.assignedTo === who || entry.secondAssignee === who) ?? null;
  return job !== null && job.stage === 'inProduction' ? job : null;
}

export function ownerJob(state: GameState): Job | null {
  return jobHeldBy(state, OWNER);
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
  needsSpindle = false,
): StagedJob {
  return { labourValue, materialKind, finish, byHand, needsSpindle };
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

/** The deadline's one draw, taken off the seeded stream now and read later: the cursor the draw
 *  was made from. The board takes it before it knows whether the client is residential or
 *  commercial, so the stream is the same shape either way, and reads the days off it once the
 *  size of the work is known, through the same `int` on a copy of the cursor, which gives the
 *  figure the draw would have given at the time (CLAUDE.md T6 3.7, T13 3.15). */
export interface DeadlineDraw {
  rng: number;
}

export function drawDeadline(state: GameState): DeadlineDraw {
  const draw = { rng: state.rng };
  // The one draw the deadline takes, whatever the size of the job.
  float(state, 0, 1);
  return draw;
}

/** How long the client gives, worked out from the work in the job and nothing else, read off a
 *  draw taken with `drawDeadline`. The slack is that one draw either way, so the seeded stream
 *  is the same shape for a small job and a big one (CLAUDE.md T6 3.7). */
export function deadlineDaysFrom(
  draw: DeadlineDraw,
  job: { ownerDays: number; price: number; express: boolean },
): number {
  // A copy: reading the draw twice gives the same figure and moves nothing.
  const cursor = { rng: draw.rng };
  const base = Math.min(
    DEADLINE_DAYS_MAX,
    Math.max(
      DEADLINE_DAYS_MIN,
      Math.floor(job.ownerDays * DEADLINE_DAYS_FACTOR + DEADLINE_DAYS_BASE),
    ),
  );
  const slack =
    job.price <= DEADLINE_SMALL_JOB_PRICE
      ? int(cursor, 0, DEADLINE_SMALL_SLACK_DAYS)
      : Math.round(
          (base * int(cursor, DEADLINE_SLACK_PERCENT_MIN, DEADLINE_SLACK_PERCENT_MAX)) / 100,
        );
  const standard = base + slack;
  if (!job.express) return standard;
  return Math.max(DEADLINE_DAYS_MIN, Math.round(standard * DEADLINE_EXPRESS_FACTOR));
}

/** The draw and the reading in one, for a job whose size is known when it is asked. */
export function deadlineDaysFor(
  state: GameState,
  job: { ownerDays: number; price: number; express: boolean },
): number {
  return deadlineDaysFrom(drawDeadline(state), job);
}

/** What a worker of this rate is worth per minute, for the job card only [TUNE]. */
export function workerMinuteCost(weeklyWage: number): number {
  return weeklyWage / WORKER_MINUTE_RATE_DIVISOR;
}

/** The men standing at this job: the one it is assigned to and the second one beside him, in that
 *  order (CLAUDE.md T17 2.10). The one list: the rate, the cost and the names all read it. */
export function jobMen(job: Job): string[] {
  const men: string[] = [];
  if (job.assignedTo !== null) men.push(job.assignedTo);
  if (job.secondAssignee !== null && job.secondAssignee !== job.assignedTo) {
    men.push(job.secondAssignee);
  }
  return men;
}

/** What the job goes forward at with the men on it: the owner at his own speed and every joiner at
 *  his, added up, because the two of them stand at it in the same minute (CLAUDE.md T17 2.10).
 *  Zero when nobody is on it, which is the board's cue to draw it at the workshop average. */
export function jobRate(state: GameState, job: Job): number {
  let rate = 0;
  for (const who of jobMen(job)) {
    if (who === OWNER) {
      rate += 1;
      continue;
    }
    const worker = state.workers.find((entry) => entry.id === who);
    if (worker && worker.rate > 0) rate += worker.rate;
  }
  return Math.round(rate * 10000) / 10000;
}

/** What the rest of a job costs in wages if the men on it finish it, for the job card only
 *  (CLAUDE.md 8.5). The owner costs nothing: his time is not a wage. Two men take half the
 *  minutes and cost both their rates for every one of them (CLAUDE.md T17 2.10). */
export function jobLabourCost(state: GameState, job: Job): { minutes: number; cost: number } {
  const rate = jobRate(state, job);
  if (rate <= 0) return { minutes: minutesRemainingFor(state, job, 1), cost: 0 };
  const minutes = minutesRemainingFor(state, job, rate);
  let perMinute = 0;
  for (const who of jobMen(job)) {
    const worker = state.workers.find((entry) => entry.id === who);
    if (worker && worker.rate > 0) perMinute += workerMinuteCost(worker.weeklyWage);
  }
  return { minutes, cost: minutes * perMinute };
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

/** Saying yes to an enquiry: the client answers with a number, the budget times a factor drawn
 *  inside the band, and the player takes it or leaves it on the event that follows. The draw is
 *  random on purpose: the team shifts the odds and never guarantees (PIOTR; CLAUDE.md T13 3.24).
 *  The job itself is made by `takeEnquiry` once the number is accepted. */
export function acceptEnquiry(state: GameState, enquiryId: string, byHand: boolean): AcceptResult {
  const enquiry = findEnquiry(state, enquiryId);
  if (!enquiry) return { ok: false, reason: 'That enquiry has gone', job: null };
  const allowed = canAccept(state, enquiry);
  if (!allowed.ok) return { ok: false, reason: allowed.reason, job: null };
  const locked = enquiry.lockReason !== null;
  if (locked && !byHand) {
    return { ok: false, reason: 'Only as a by hand job', job: null };
  }
  // Asked once: the number stands until it is answered.
  if (enquiry.offer === null) enquiry.offer = drawOffer(state, enquiry);
  const already =
    state.activeEvent?.kind === 'clientOffer' && state.activeEvent.data.enquiryId === enquiry.id;
  const queued = state.eventQueue.some(
    (event) => event.kind === 'clientOffer' && event.data.enquiryId === enquiry.id,
  );
  if (!already && !queued) {
    queueEvent(state, {
      kind: 'clientOffer',
      title: `${enquiry.name}: the client answers`,
      body:
        `The budget was ${formatMoney(enquiry.budget)}. The client offers ` +
        `${formatMoney(enquiry.offer)}. Accept?`,
      choices: [
        { id: 'accept', label: `Accept ${formatMoney(enquiry.offer)}` },
        { id: 'decline', label: 'Decline' },
      ],
      data: { enquiryId: enquiry.id, byHand, offer: enquiry.offer },
    });
  }
  return { ok: true, reason: '', job: null };
}

/** The answer on the offer event: taken at the number, or left, which costs nothing but the
 *  enquiry (CLAUDE.md T13 3.24). */
export function resolveClientOffer(
  state: GameState,
  choiceId: string,
  data: Record<string, JsonValue>,
): AcceptResult {
  const enquiryId = data.enquiryId;
  if (typeof enquiryId !== 'string') return { ok: false, reason: 'That enquiry has gone', job: null };
  if (choiceId !== 'accept') {
    removeEnquiry(state, enquiryId);
    return { ok: false, reason: 'Declined', job: null };
  }
  return takeEnquiry(state, enquiryId, data.byHand === true);
}

/** Takes an enquiry off the board and turns it into a job with its owner tasks, at the price the
 *  client offered. Its sheets are held from the free stock at once (CLAUDE.md T13 3.3). */
export function takeEnquiry(state: GameState, enquiryId: string, byHand: boolean): AcceptResult {
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
  // What the client offered is the price; the budget is remembered. Material and labour come off
  // the base price, so the express uplift is pure profit (T2 3.4, T13 3.24).
  const price = enquiry.offer ?? enquiry.price;
  const materialCost = materialCostFor(enquiry.basePrice, enquiry.bespokeMaterial);
  const labourValue = labourValueFor(enquiry.basePrice);
  const job: Job = {
    id: makeId(state, 'job'),
    templateId: enquiry.templateId,
    name: enquiry.name,
    price,
    basePrice: enquiry.basePrice,
    sizeMultiplier: enquiry.sizeMultiplier,
    finish: enquiry.finish,
    materialKind: enquiry.materialKind,
    materialCost,
    sheets: sheetsForCost(materialCost),
    sheetsUsed: 0,
    sheetsReserved: 0,
    kind: enquiry.kind,
    budget: enquiry.budget,
    nightMinutes: 0,
    needsSpindle: entry.requiredEquipment.includes('spindleMoulder'),
    blockedBy: '',
    bespokeMaterial: enquiry.bespokeMaterial,
    express: enquiry.express,
    byHand: madeByHand,
    sawFallback: SAW_FALLBACK_DEFAULT,
    needsMeasure: enquiry.needsMeasure,
    labourValue,
    labourRemaining: labourValue,
    acceptedDay: state.clock.day,
    // The client counts the days his workshop is open and no others: a job taken on Friday
    // with three days on it is due on Wednesday (PIOTR; CLAUDE.md T10 3.5).
    dueDay: addWorkingDays(state.clock.day, enquiry.deadlineDays),
    stage: 'accepted',
    finishedDay: null,
    deliverOnDay: null,
    calls: [],
    callsMissed: 0,
    designMinutesRemaining: designMinutes(entry, enquiry.sizeMultiplier, state.software.tier),
    assignedTo: null,
    secondAssignee: null,
    stageRuns: [],
    completedDay: null,
    daysLate: 0,
    depositPaid: 0,
    balancePaid: 0,
    penalty: 0,
    emailsUnanswered: 0,
    wetFinish: false,
    productionMinutes: 0,
    dustyMinutes: 0,
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
  // Reserved from the free stock at once; what it could not have is its shortfall (T13 3.3).
  reserveSheetsFor(state, job);
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
  // The material take off: reading the drawing and counting the sheets. The owner's until an
  // estimator is taken on, and never before the drawing (CLAUDE.md T13 3.8).
  createTask(state, {
    kind: 'materialTakeOff',
    label: `Material take off: ${job.name}`,
    minutes: Math.round(materialOrderMinutes(job.price)),
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

export function designOutstanding(state: GameState, job: Job): boolean {
  return jobTasks(state, job.id).some((task) => task.kind === 'design' && !task.done);
}

function measureOutstanding(state: GameState, job: Job): boolean {
  return jobTasks(state, job.id).some((task) => task.kind === 'siteMeasure' && !task.done);
}

/** True while the take off has not been done (CLAUDE.md T13 3.8). */
export function takeOffOutstanding(state: GameState, job: Job): boolean {
  return jobTasks(state, job.id).some((task) => task.kind === 'materialTakeOff' && !task.done);
}

/** True once the drawing, the site measure and the take off are done: the desk work is behind the
 *  job (CLAUDE.md 9.5, T13 3.8). The calls are not in this list: nothing waits on the phone
 *  (CLAUDE.md T4 3.3). */
export function paperworkDone(state: GameState, job: Job): boolean {
  return (
    !designOutstanding(state, job) &&
    !measureOutstanding(state, job) &&
    !takeOffOutstanding(state, job)
  );
}

/** Keeps the job stage and its task list in step after anything finishes. Ready when the desk
 *  work is done and every sheet is held; waiting on material while there is a shortfall, on the
 *  lorry while an order for this job is on its way (CLAUDE.md T13 3.3). */
export function refreshJob(state: GameState, job: Job): void {
  if (job.stage !== 'accepted' && job.stage !== 'materialPending') return;
  if (designOutstanding(state, job)) {
    const design = jobTasks(state, job.id).find((task) => task.kind === 'design');
    job.designMinutesRemaining = design ? Math.max(0, Math.ceil(design.minutesRemaining)) : 0;
  } else {
    job.designMinutesRemaining = 0;
  }
  if (!paperworkDone(state, job)) {
    job.stage = 'accepted';
    return;
  }
  // Anything free that has come onto the rack since it was taken is held for it now.
  reserveSheetsFor(state, job);
  if (shortfallOf(job) === 0) {
    job.stage = 'ready';
    return;
  }
  const coming = state.deliveries.some((delivery) => delivery.jobId === job.id && !delivery.unloaded);
  job.stage = coming ? 'materialOrdered' : 'materialPending';
}

/** The site measure costs a taxi while there is no van (CLAUDE.md 8.10). */
export function chargeSiteMeasure(state: GameState, job: Job): void {
  if (!has(state, 'van')) {
    chargeUnavoidable(state, 'taxi', `Taxi to the site for ${job.name}`, SITE_MEASURE_TAXI_COST);
  }
}

/** The take off is done: the job moves on, ready or waiting on its shortfall (CLAUDE.md T13 3.8). */
export function onTakeOffDone(state: GameState, job: Job): void {
  refreshJob(state, job);
}

/** Why the shortfall cannot be ordered for this job, or that it can (CLAUDE.md T13 3.3). */
export function orderForJobCheck(state: GameState, job: Job): { ok: boolean; reason: string } {
  if (shortfallOf(job) <= 0) return { ok: false, reason: 'Nothing short' };
  if (state.deliveries.some((delivery) => delivery.jobId === job.id && !delivery.unloaded)) {
    return { ok: false, reason: 'On its way already' };
  }
  return { ok: true, reason: '' };
}

/** The job's own Order for this job button: buys the shortfall at the ad hoc price, on a lorry for
 *  this job (CLAUDE.md T13 3.3). */
export function orderShortfall(state: GameState, jobId: string): boolean {
  const job = findJob(state, jobId);
  if (!job) return false;
  if (!orderForJobCheck(state, job).ok) return false;
  const delivery = orderForJob(state, job);
  if (delivery === null) return false;
  if (job.stage === 'materialPending') job.stage = 'materialOrdered';
  return true;
}

export function onDeliveryArrived(state: GameState, jobId: string | null): void {
  if (!jobId) return;
  const job = findJob(state, jobId);
  if (job && job.stage === 'materialOrdered') job.stage = 'materialInYard';
}

/** A lorry is unloaded: every job that was waiting on material and has it now is ready, this
 *  one first (CLAUDE.md T13 3.3). */
export function onDeliveryUnloaded(state: GameState, jobId: string | null): void {
  for (const job of state.jobs) {
    if (job.stage === 'materialInYard' || job.stage === 'materialOrdered') {
      if (job.id === jobId || shortfallOf(job) === 0) job.stage = 'materialPending';
    }
    if (job.stage === 'materialPending') refreshJob(state, job);
  }
}

/** Every job with a shortfall holds what the rack can spare now, and moves on when it is whole:
 *  after a restock and after every unloading (CLAUDE.md T13 3.3). */
export function refreshMaterial(state: GameState): void {
  for (const job of state.jobs) {
    if (job.stage === 'materialPending') refreshJob(state, job);
  }
}

/** Drops the project. The client has his deposit back, the job is off the plan, the material it
 *  drew from the rack goes back on it and the material that was ordered in for it is written off,
 *  and the company loses ten points of reputation at once (PIOTR, 13.09: "drastically";
 *  CLAUDE.md T9 3.9). */
export function dropJob(state: GameState, jobId: string): boolean {
  const job = findJob(state, jobId);
  if (!job) return false;
  if (job.stage === 'completed') return false;
  // The deposit goes back whatever the state of the bank: the client is owed it (CLAUDE.md 8.3).
  chargeUnavoidable(state, 'jobDeposit', `Deposit returned: ${job.name}`, job.depositPaid);
  // What the bench has not cut yet: that is what is left of the material to do anything with. A
  // job nobody has started has cut nothing, whatever the sheet in hand rule says of one that is
  // under way (CLAUDE.md T2 3.6).
  const done = jobProgress(job);
  const cut = done <= 0 ? 0 : sheetsDueFor(job, done);
  const left = Math.max(0, job.sheetsUsed - cut);
  // Ordered in for this job and this job only: the money is gone with it. A job whose material
  // was never ordered has nothing to write off, whatever mode it was set to.
  const orderedIn = state.deliveries.some((delivery) => delivery.jobId === job.id);
  if (orderedIn) {
    noteLoss(state, 'material', `Material written off: ${job.name}`, job.materialCost);
  } else {
    state.stock.sheets += left;
  }
  job.sheetsUsed = 0;
  // What it held goes back to the free stock (CLAUDE.md T13 3.3).
  releaseReservation(job);
  // Nobody is left standing on a job that is not there any more.
  const dropped = new Set(jobTasks(state, job.id).map((task) => task.id));
  state.tasks = state.tasks.filter((task) => task.jobId !== job.id);
  if (state.owner.currentTaskId !== null && dropped.has(state.owner.currentTaskId)) {
    state.owner.currentTaskId = null;
  }
  if (state.owner.resumeTaskId !== null && dropped.has(state.owner.resumeTaskId)) {
    state.owner.resumeTaskId = null;
  }
  for (const worker of state.workers) {
    if (worker.taskId !== null && dropped.has(worker.taskId)) worker.taskId = null;
    if (worker.jobId === job.id) worker.jobId = null;
  }
  state.jobs = state.jobs.filter((entry) => entry.id !== job.id);
  changeReputation(state, -DROP_PROJECT_REPUTATION, `Dropped: ${job.name}`);
  return true;
}

// ---------------------------------------------------------------------------
// Production
// ---------------------------------------------------------------------------

/** A machine that is bought and still on the road is a drawing on the floor: the stage that wants
 *  it stands and waits for the lorry rather than falling back to a pair of hands, and says which
 *  day the lorry is (CLAUDE.md T10 1, 3.10). The board's lock is the one question on-order kit
 *  may answer, and it asked it days ago, when the job was taken. */
function onOrderBlock(state: GameState, family: string): string {
  if (has(state, family)) return '';
  const coming = firstOnOrder(state, family);
  if (coming === null) return '';
  const name = (findSpec(family)?.name ?? family).toLowerCase();
  return `waiting for ${name} (on order, due day ${coming.dueDay})`;
}

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
  const coming = onOrderBlock(state, family);
  if (coming !== '') return coming;
  // A machine that wants more bar than its compressor gives, or dry air where there is none, does
  // not run at all (PIOTR, CLAUDE.md T10 3.2 rule 1, 3.3).
  const air = familyAirBlock(state, family);
  if (air !== '') return `${(findSpec(family)?.name ?? family).toLowerCase()} ${air}`;
  const stopped = familyStopped(state, family);
  if (stopped === null) return '';
  // The hall's bags are full: one block for every machine that makes dust (CLAUDE.md T12 2.3).
  if (stopped.why === 'bags') return 'bags full';
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
    if (takeOffOutstanding(state, job)) return blocked('material take off not done');
  }
  if (job.stage === 'accepted' || job.stage === 'materialPending') {
    const short = shortfallOf(job);
    return blocked(short > 0 ? `${plural(short, 'sheet', 'sheets')} short` : 'material not settled');
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
    // The Material step is the take off (CLAUDE.md T13 3.8); the Delivery step is every sheet
    // in hand (T13 3.3).
    ordered || !takeOffOutstanding(state, job),
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

/** The second man on a job, put on it or taken off it. Both book minutes into it, each at his own
 *  rate, at the stage's station: one of them at the machine and the other at the waiting cell
 *  until his turn, and both at the bench, the second in the bench's second place
 *  (PIOTR, 16.09; CLAUDE.md T17 2.10). */
export function assignSecond(state: GameState, jobId: string, workerId: string | null): boolean {
  const job = findJob(state, jobId);
  if (!job) return false;
  if (job.stage !== 'ready' && job.stage !== 'inProduction') return false;
  if (workerId === null) {
    // He goes back to the list, and off the job he was standing at.
    const second = job.secondAssignee;
    if (second !== null) {
      const man = state.workers.find((entry) => entry.id === second);
      if (man && man.jobId === job.id) man.jobId = null;
      releaseMachines(state, second);
    }
    job.secondAssignee = null;
    return true;
  }
  // The second man is second to somebody: a job with nobody on it is assigned, not seconded.
  if (job.assignedTo === null) return false;
  if (workerId === job.assignedTo) return false;
  const worker = state.workers.find((entry) => entry.id === workerId) ?? null;
  if (!worker || worker.role !== 'joiner' || worker.absentDaysRemaining > 0) return false;
  // Nobody is on two jobs at once: he comes off whatever he was on, first man or second.
  for (const other of state.jobs) {
    if (other.id === job.id) continue;
    if (other.assignedTo === workerId) releaseJob(state, other);
    if (other.secondAssignee === workerId) other.secondAssignee = null;
  }
  worker.jobId = job.id;
  job.secondAssignee = workerId;
  if (job.assignedTo !== null) job.stage = 'inProduction';
  return true;
}

/** The owner takes a worker's job on for the evening, by a click and never on his own. He stands
 *  at it as the second man, so the job keeps the man it is assigned to and that man carries on
 *  with it in the morning: what the owner does tonight comes off the labour that is left
 *  (PIOTR, 17.09; CLAUDE.md T17 2.12). The evening only: by day a job is assigned to a man, or
 *  given a second one. */
export function canTakeOver(state: GameState, job: Job): boolean {
  if (job.stage !== 'ready' && job.stage !== 'inProduction') return false;
  if (!ownerIsAvailable(state)) return false;
  // The evening only, and only somebody else's job: his own he is already on.
  if (!isOvertime(state.clock.minute)) return false;
  return job.assignedTo !== null && job.assignedTo !== OWNER && job.secondAssignee !== OWNER;
}

export function takeOverJob(state: GameState, jobId: string): boolean {
  const job = findJob(state, jobId);
  if (!job || !canTakeOver(state, job)) return false;
  // He cannot be at the desk and at the bench in the same minute.
  state.owner.currentTaskId = null;
  // Nor at two benches: a job of his own goes back on the list, as it does when a man is given it.
  const held = jobHeldBy(state, OWNER);
  if (held !== null && held.id !== job.id) releaseJob(state, held);
  job.secondAssignee = OWNER;
  job.stage = 'inProduction';
  return true;
}

/** The evening is over: every job the owner took on for it goes back to the man it belongs to,
 *  who picks it up in the morning where the evening left it (CLAUDE.md T17 2.12). */
export function endOwnerTakeOver(state: GameState): void {
  for (const job of state.jobs) {
    if (job.secondAssignee === OWNER) job.secondAssignee = null;
  }
}

/** True while the owner is standing at a job that is somebody else's: the row says "You are on
 *  it tonight" rather than offering the takeover again (CLAUDE.md T17 2.12). */
export function ownerTookOver(job: Job): boolean {
  return job.secondAssignee === OWNER && job.assignedTo !== null && job.assignedTo !== OWNER;
}

/** Takes whoever is on the job off it, leaving the work done in place. He walks away from every
 *  machine he was standing at, so the next man can have it (CLAUDE.md T7 3.1). */
export function releaseJob(state: GameState, job: Job): void {
  // Both men come off it: a job can have a second (CLAUDE.md T17 2.10).
  for (const worker of state.workers) {
    if (worker.jobId === job.id) worker.jobId = null;
  }
  if (job.assignedTo !== null) releaseMachines(state, job.assignedTo);
  if (job.secondAssignee !== null) releaseMachines(state, job.secondAssignee);
  job.assignedTo = null;
  job.secondAssignee = null;
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
  // Late by the days the workshop was open: a weekend is not a day anybody was late on
  // (PIOTR; CLAUDE.md T10 3.5).
  job.daysLate = Math.max(0, workingDaysBetween(job.dueDay, state.clock.day));
  // The ones still open at delivery, on top of the ones that died at dusk on the days between
  // (CLAUDE.md T17 2.15): the count is added to, never overwritten.
  job.emailsUnanswered += emailsOutstanding(state, job);
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
