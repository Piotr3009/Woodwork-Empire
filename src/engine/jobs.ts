// The life of a job, from the enquiry the player accepted to the rating the client leaves.
// enquiry, accepted, calls, design, material ordered, material in the yard, unloaded, ready,
// in production, completed, paid and rated (CLAUDE.md 9.5).

import {
  BUILDING_ROLES,
  COURIER_COST,
  MEETING_PRICE_THRESHOLD,
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
  DROP_REPUTATION_COMMERCIAL_FACTOR,
  DROP_REPUTATION_FREE_PRICE,
  DROP_REPUTATION_MAX,
  DROP_REPUTATION_PER_1000,
  EMAIL_PAYMENT_PENALTY,
  EMAIL_PAYMENT_PENALTY_MAX,
  LABOUR_FRACTION,
  LATE_PENALTY_PER_DAY,
  LATE_PENALTY_PER_DAY_EXPRESS,
  MINUTES_PER_WORKING_DAY,
  SITE_MEASURE_MINUTES,
  SITE_MEASURE_TAXI_COST,
  MILES_PER_TRIP,
  VAN_CLASSES,
  VAN_REPAIR_FRACTION,
  VAN_VARIANTS,
  VAN_WORN_BREAKDOWN_FACTOR,
  WORKER_MINUTE_RATE_DIVISOR,
  type VanClass,
} from './constants';
import { canAccept, drawOffer, findEnquiry, removeEnquiry } from './board';
import { callRinging, scheduleCalls } from './calls';
import { template } from './catalog';
import { contractOfWorker } from './contracts';
import {
  addWorkingDays,
  formatCalendarDay,
  isOvertime,
  nextWorkingDay,
  workingDaysBetween,
} from './clock';
import { chargeUnavoidable, formatMoney, noteLoss, receive } from './economy';
import { queueEvent } from './events';
import {
  OWNER,
  hallHasABench,
  has,
  hasExtraction,
  isSold,
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
import { ownerIsAvailable } from './owner';
import {
  stagePlanFor,
  stageLeft,
  type StageOptions,
  type StagePlan,
  type StagedJob,
  currentStage,
  jobMinutesFor,
  minutesLeftFor,
} from './stages';
import { applyRating, changeReputation } from './reputation';
import { float, int, makeId, next } from './rng';
import { plural } from './text';
import {
  AD_HOC_TASK_MINUTES,
  WORK_EPSILON,
  createTask,
  designMinutes,
  emailMinutes,
  emailsForPrice,
  firstOnDutyOf,
  jobTasks,
  takeOffMinutes,
} from './tasks';
import type {
  EnquiryKind,
  Equipment,
  Finish,
  GameState,
  Job,
  JobStage,
  JsonValue,
  MaterialKind,
  StageId,
  WorkerRole,
} from './types';

export function findJob(state: GameState, jobId: string): Job | null {
  return state.jobs.find((job) => job.id === jobId) ?? null;
}

/** The job this man is standing at, whether he is the first man on it or the second: two men can
 *  be on one job now, and the owner is the second man on the one he takes on for an evening
 *  (CLAUDE.md T17 2.10, 2.12). The one finder for it. */
export function jobHeldBy(state: GameState, who: string): Job | null {
  const job = state.jobs.find((entry) => entry.assignees.includes(who)) ?? null;
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

/** What a price leaves after the material and the labour of the job, as a fraction of the price.
 *  The one margin figure in the game: the client's answer prints it beside the offer, the scripted
 *  player of the playthrough decides on it, and anything else that wants to say what a job is
 *  worth reads this and not its own arithmetic (PIOTR accepted, 17.09; CLAUDE.md T18 2.9).
 *
 *  Material and labour come off the base price, because the express uplift and the client's own
 *  haggle are pure profit and change neither (CLAUDE.md T2 3.4, T13 3.24). */
export function marginOfPrice(basePrice: number, bespokeMaterial: boolean, price: number): number {
  if (price <= 0) return 0;
  const cost = materialCostFor(basePrice, bespokeMaterial) + labourValueFor(basePrice);
  return (price - cost) / price;
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

/** What a worker of this rate is worth per minute, for the job card only [TUNE]. His monthly wage
 *  over the working minutes of a month (CLAUDE.md T21 2.10). */
export function workerMinuteCost(monthlyWage: number): number {
  return monthlyWage / WORKER_MINUTE_RATE_DIVISOR;
}

/** The men standing at this job, in the order they were put on it. There is no limit on how many
 *  (PIOTR, 17.09; CLAUDE.md T19 2.5). The one list: the rate, the cost, the stations and the
 *  names all read it. */
export function jobMen(job: Job): string[] {
  return job.assignees.slice();
}

/** The first man on the job: the one a machine stage puts at the machine itself, the rest taking
 *  the waiting cell and the free cells along the same side (CLAUDE.md T19 2.5). Null while nobody
 *  is on it. This is what `assignedTo` used to be. */
export function leadAssignee(job: Job): string | null {
  return job.assignees[0] ?? null;
}

/** True while this man is one of the people on this job, wherever he stands in the list. */
export function isOnJob(job: Job, who: string): boolean {
  return job.assignees.includes(who);
}

/** Takes one man off a job, leaving everybody else on it (the cross on his chip,
 *  CLAUDE.md T19 2.5). True when he was on it. */
export function removeAssignee(job: Job, who: string): boolean {
  const at = job.assignees.indexOf(who);
  if (at < 0) return false;
  job.assignees.splice(at, 1);
  return true;
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
    if (!worker || worker.rate <= 0) continue;
    // Everybody is paid by the month, the sprayer with the rest of them, so there is one wage to
    // read and no weekly one behind it (CLAUDE.md T21 2.10).
    perMinute += workerMinuteCost(worker.monthlyWage);
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
    // The margin the number leaves rides on the event, and the dialogue prints it after the offer
    // in the colour its size earns. The sentence ends on the colon the figure is written after:
    // the two buttons under it are the question, so it does not ask one twice
    // (PIOTR accepted, 17.09; CLAUDE.md T18 2.9).
    const margin = marginOfPrice(enquiry.basePrice, enquiry.bespokeMaterial, enquiry.offer);
    queueEvent(state, {
      kind: 'clientOffer',
      title: `${enquiry.name}: the client answers`,
      body:
        `The budget was ${formatMoney(enquiry.budget)}. The client offers ` +
        `${formatMoney(enquiry.offer)}:`,
      choices: [
        { id: 'accept', label: `Accept ${formatMoney(enquiry.offer)}` },
        { id: 'decline', label: 'Decline' },
      ],
      data: { enquiryId: enquiry.id, byHand, offer: enquiry.offer, margin },
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
    needsMeasure: enquiry.needsMeasure,
    labourValue,
    labourRemaining: labourValue,
    stageLabour: {},
    acceptedDay: state.clock.day,
    // The client counts the days his workshop is open and no others: a job taken on Friday
    // with three days on it is due on Wednesday (PIOTR; CLAUDE.md T10 3.5).
    dueDay: addWorkingDays(state.clock.day, enquiry.deadlineDays),
    stage: 'accepted',
    finishedDay: null,
    deliverOnDay: null,
    calls: [],
    callsMissed: 0,
    designMinutesRemaining: designMinutes(enquiry.basePrice, state.software.tier),
    assignees: [],
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
  // estimator is taken on, and never before the drawing (CLAUDE.md T13 3.8). Half an hour of the
  // desk it is done at, less what the software takes off it, whatever the job is worth: the curve
  // by price went with the five a day (PIOTR, 18.09; CLAUDE.md T20 2.3).
  createTask(state, {
    kind: 'materialTakeOff',
    label: `Material take off: ${job.name}`,
    minutes: takeOffMinutes(state),
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
  // The drawings are done and the job is short of sheets: the office orders them itself
  // (CLAUDE.md T21 2.5.2).
  if (job.stage === 'materialPending') autoOrderMaterial(state, job);
}

/** Who places a job's material order when nobody asks him to, in the order he is asked: the
 *  purchasing clerk, whose job it is; the estimator, who read the drawing and counted the sheets;
 *  and the office admin, who covers for a specialist the company has not taken on, which is the
 *  order every other job of office work is handed out in (CLAUDE.md T7 3.12, T21 2.5.2). */
export const MATERIAL_ORDER_ROLES: ReadonlyArray<WorkerRole> = [
  'purchasingClerk',
  'estimator',
  'officeAdmin',
];

/** The material is ordered the moment the drawings are done, by whoever in the office is there to
 *  order it, and not when the owner next has time to open the job's card (PIOTR, 19.09: "they wait
 *  until I have time; stupid"; CLAUDE.md T21 2.5.2).
 *
 *  It is the same order the player's own button places, at the same ad hoc price, through the same
 *  `orderForJob`: the only difference is the name in the ledger line. `orderForJob` asks the
 *  engine's own `canAfford`, which is the overdraft floor to the penny, so the office never takes
 *  the company past the limit the bank allows; it simply has nothing to order with until the money
 *  is there, and orders the minute it is. With none of the three on the books nothing happens here
 *  and the job's card asks the owner exactly as it always did. */
export function autoOrderMaterial(state: GameState, job: Job): boolean {
  if (takeOffOutstanding(state, job)) return false;
  if (shortfallOf(job) <= 0) return false;
  if (!orderForJobCheck(state, job).ok) return false;
  const clerk = firstOnDutyOf(state, MATERIAL_ORDER_ROLES);
  if (clerk === null) return false;
  if (orderForJob(state, job, clerk.name) === null) return false;
  job.stage = 'materialOrdered';
  return true;
}

/** The site measure costs a taxi while there is no van (CLAUDE.md 8.10), and with one it is a
 *  trip: its miles on the van's clock and its fuel (PIOTR, 24.09; v54). */
export function chargeSiteMeasure(state: GameState, job: Job): void {
  const van = tripVan(state);
  if (van === null) {
    chargeUnavoidable(state, 'taxi', `Taxi to the site for ${job.name}`, SITE_MEASURE_TAXI_COST);
    return;
  }
  driveTrip(state, van, `site measure for ${job.name}`);
}

/** The classes of van from the worst to the best, the order a trip picks the van it goes in by. */
const VAN_LADDER = VAN_VARIANTS.map((variant) => variant.id);

/** The van a trip goes in: the best class the company has and has not sold, or null while it has
 *  none (PIOTR, 24.09; v54). */
export function tripVan(state: GameState): Equipment | null {
  let best: Equipment | null = null;
  let rank = -1;
  for (const item of state.equipment) {
    if (item.specId !== 'van' || isSold(item)) continue;
    const own = VAN_LADDER.indexOf(item.variantId);
    if (own > rank) {
      rank = own;
      best = item;
    }
  }
  return best;
}

/** What this van's class does on a trip; an unknown class reads as the standard van. */
export function vanClassOf(item: { variantId: string }): VanClass {
  return VAN_CLASSES[item.variantId] ?? (VAN_CLASSES.standard as VanClass);
}

/** How long a delivery takes in the van the company would send today (v54). */
export function deliveryMinutes(state: GameState): number {
  const van = tripVan(state);
  return van === null ? AD_HOC_TASK_MINUTES.deliver : vanClassOf(van).deliveryMinutes;
}

/** One trip: its miles on the van's clock and its fuel through the books (v54). */
function driveTrip(state: GameState, van: Equipment, what: string): void {
  van.milesDriven += MILES_PER_TRIP;
  const fuel = Math.round(vanClassOf(van).fuelPer100Miles * (MILES_PER_TRIP / 100) * 100) / 100;
  chargeUnavoidable(state, 'transport', `Fuel: ${what}`, fuel);
}

/** Whether this trip ends at the roadside: the class's odds, three times them past its miles, off a
 *  roll of the trip's own drawn from the game's seed, so a van's trips do not move every other
 *  roll of the game [TUNE] (v54). */
function breaksDownOnTheWay(state: GameState, van: Equipment): boolean {
  const kind = vanClassOf(van);
  const odds = kind.breakdownPerTrip * (van.milesDriven > kind.lifeMiles ? VAN_WORN_BREAKDOWN_FACTOR : 1);
  const roll = next({ rng: (state.seed ^ Math.imul(van.milesDriven + 1, 0x9e3779b1)) | 0 });
  return roll < odds;
}

/** True while somebody has this task in his hands, so it is not a piece that can ride along. */
function taskInHands(state: GameState, taskId: string): boolean {
  if (state.owner.currentTaskId === taskId) return true;
  return state.workers.some((worker) => worker.taskId === taskId);
}

/** The van goes: the piece is delivered, with as many of the other pieces waiting at the gate for
 *  the van as the class takes in one trip, or the van breaks down on the way, the recovery and
 *  the repair are paid and the piece goes the next working day [PIOTR, 24.09: a shorter trip,
 *  more pieces in it, breakdowns, fuel] (v54). */
export function runVanDelivery(state: GameState, job: Job): void {
  const van = tripVan(state);
  if (van === null) {
    deliverJob(state, job);
    return;
  }
  driveTrip(state, van, `delivery of ${job.name}`);
  if (breaksDownOnTheWay(state, van)) {
    const repair = Math.round(van.purchasePrice * VAN_REPAIR_FRACTION);
    chargeUnavoidable(state, 'repair', `Van broke down on the way to ${job.name}`, repair);
    job.deliverOnDay = nextWorkingDay(state.clock.day);
    queueEvent(state, {
      kind: 'vanBrokeDown',
      title: 'The van broke down',
      body:
        `On the way to ${job.name}. ${formatMoney(repair)} for the recovery and the repair, and ` +
        'the piece goes the next working day.',
      choices: [{ id: 'ok', label: 'Right' }],
      data: { jobId: job.id, repair },
    });
    return;
  }
  const room = vanClassOf(van).piecesPerTrip - 1;
  const riders = state.tasks
    .filter((task) => task.kind === 'deliver' && !task.done && task.jobId !== job.id)
    .filter((task) => !taskInHands(state, task.id))
    .slice(0, Math.max(0, room));
  deliverJob(state, job);
  for (const task of riders) {
    const other = task.jobId === null ? null : findJob(state, task.jobId);
    if (other !== null) deliverJob(state, other);
    state.tasks = state.tasks.filter((entry) => entry.id !== task.id);
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

/** What dropping this job costs the company in reputation: ten points, and a point for every
 *  thousand pounds of its price above five thousand, capped at fifty; a commercial client's job
 *  costs half again on top of that, still capped at the fifty (PIOTR, 19.09: "up to 50 max";
 *  CLAUDE.md T21 2.4).
 *
 *  A 3,000 job costs 10, a 10,000 one 15, a 20,000 one 25, and 50,000 or anything above it costs
 *  the whole 50. The one function: the drop itself and the card that warns about it before the
 *  click both read this, so the figure the player is shown is the figure he is charged. */
export function dropReputationCost(job: { price: number; kind: EnquiryKind }): number {
  const over = Math.max(0, job.price - DROP_REPUTATION_FREE_PRICE);
  const scaled = DROP_PROJECT_REPUTATION + (over / 1000) * DROP_REPUTATION_PER_1000;
  const trade = job.kind === 'commercial' ? scaled * DROP_REPUTATION_COMMERCIAL_FACTOR : scaled;
  return Math.min(DROP_REPUTATION_MAX, Math.round(trade));
}

/** Drops the project. The client has his deposit back, the job is off the plan, the material it
 *  drew from the rack goes back on it and the material that was ordered in for it is written off,
 *  and the company loses what `dropReputationCost` says at once (PIOTR, 13.09: "drastically";
 *  CLAUDE.md T9 3.9, T21 2.4). */
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
  changeReputation(state, -dropReputationCost(job), `Dropped: ${job.name}`);
  return true;
}

// ---------------------------------------------------------------------------
// Production
// ---------------------------------------------------------------------------

/** What the hall says while it has no workbench in it at all: nothing is made without one, by
 *  hand or not (CLAUDE.md T4 3.4). */
export const BENCHLESS_HALL = 'the hall has no workbench';

/** Everything in the hall that stops a job for everybody on it: no extraction in the hall at all,
 *  or no bench in it. Nothing about one stage's machine stops a job any more: a machine broken, away
 *  for its service, still on the lorry, short of air or making dust with the bags full has no
 *  places this minute, and the job's share of it goes at the by hand pace while the men work
 *  wherever the hall has a place [PIOTR, 24.09: "they never wait for the saw"] (v53). */
export function hallStops(state: GameState, job: Job): string {
  if (!job.byHand && !hasExtraction(state)) return 'no extraction';
  if (!hallHasABench(state)) return BENCHLESS_HALL;
  // A lacquer is sprayed in a booth and nowhere else: the board takes the job with the booth on
  // the lorry (CLAUDE.md T10 3.7), and now that nobody waits for a stage the job can reach its
  // Finishing before the booth is in the hall. It stops there, for the booth (v53).
  if (job.finish === 'lacquer' && currentStage(state, job)?.id === 'finishing' && !has(state, 'sprayBooth')) {
    return 'no spray booth';
  }
  return '';
}

/** Everything in the hall that can stop a job, in the order the player would notice it: what
 *  `hallStops` says. Empty while the job is free to be worked on (CLAUDE.md T2 3.9; v53). */
export function hallBlock(state: GameState, job: Job): string {
  return hallStops(state, job);
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
  return STARTABLE_STAGES.includes(job.stage) && job.assignees.length === 0;
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
  return `material arrives on ${formatCalendarDay(delivery.arriveDay)}`;
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
    const unit = job.materialKind === 'sheet' ? plural(short, 'sheet', 'sheets') : `${plural(short, 'board', 'boards')} of timber`;
    return blocked(short > 0 ? `${unit} short` : 'material not settled');
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
    state.jobs.find((job) => job.stage === 'ready' && job.assignees.length === 0) ??
    state.jobs.find((job) => job.stage === 'ready') ??
    null
  );
}

/** The job the owner goes to when his office empties: the open job with the SOONEST DEADLINE,
 *  whether or not somebody is already on it [PIOTR, 21.09: "I should jump on the first job with a
 *  DL, automatically"]. Turn 23's 2.3 gave him the oldest job with NOBODY on it, which in a hall
 *  where the crew hold every job meant he stood in the office with his hands in his pockets, which
 *  is the one thing 2.3 was written to stop. He joins as a second pair of hands, the same way the
 *  player's Assign does it (v41).
 *
 *  From v52 he joins only a job whose current stage has a place to spare for him, `fits` says
 *  which: the owner is first in the day plan's order, and a job he walked on to by himself would
 *  otherwise take the place of a man the player put there, which is the one thing Turn 25 is
 *  against [PIOTR, 21.09: "a man is never blocked by another man"] (CLAUDE.md T25 1, 2.3).
 *
 *  The order: the day it is due, then the job fewest men are on, then the order the board was
 *  taken in. A contract is no job of the board's and never comes out of here [PIOTR, 19.09]. */
export function jobForTheOwner(state: GameState, fits: (job: Job) => boolean = () => true): Job | null {
  const open = state.jobs.filter(
    (job) =>
      (job.stage === 'ready' || job.stage === 'inProduction') && !isOnJob(job, OWNER) && fits(job),
  );
  if (open.length === 0) return null;
  const order = new Map(state.jobs.map((job, at) => [job.id, at]));
  return (
    [...open].sort(
      (left, right) =>
        left.dueDay - right.dueDay ||
        left.assignees.length - right.assignees.length ||
        (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0),
    )[0] ?? null
  );
}

/** True while there is work of the board's about at all: a job ready for a bench, or one in
 *  production, whoever is holding it. What the owner's idle reason asks to tell "there is work
 *  here and none of it is mine" from "there is no work at all" (CLAUDE.md T23 2.3).
 *
 *  It has to count a job in production and not only a ready one. From tonight the owner takes the
 *  oldest open job himself the minute his office empties, so a ready job with nobody on it can
 *  never be the thing he is standing beside: by the time he is idle, every job about is somebody's
 *  and every one of those is in production. */
export function workIsAbout(state: GameState): boolean {
  return state.jobs.some((job) => job.stage === 'ready' || job.stage === 'inProduction');
}

/** This job is this one man's: he goes on it and anybody else on it comes off. Start production
 *  and the hall's own automatic assignment go through here, so the job a man is handed is his
 *  alone; the player's Assign to this job adds men to what is already there and goes through
 *  `addToJob` instead (CLAUDE.md 9.4, T19 2.5). A null worker is the whole job let go. */
export function assignJob(state: GameState, jobId: string, workerId: string | null): boolean {
  const job = findJob(state, jobId);
  if (!job) return false;
  if (job.stage !== 'ready' && job.stage !== 'inProduction') return false;
  if (workerId === null) {
    releaseJob(state, job);
    return true;
  }
  if (!canBuild(state, workerId)) return false;
  const worker =
    workerId === OWNER ? null : state.workers.find((entry) => entry.id === workerId) ?? null;
  // Whoever was on this job comes off it, and the new man comes off whatever he was on. He is
  // taken off that other job on his own: with no limit on the men, releasing the whole of it
  // would send everybody else home too (CLAUDE.md T19 2.5).
  releaseJob(state, job);
  for (const other of state.jobs) {
    if (other.id !== job.id && isOnJob(other, workerId)) takeOffJob(state, other.id, workerId);
  }
  if (worker) {
    worker.jobId = job.id;
  } else {
    // The owner cannot draw and cut at the same time.
    state.owner.currentTaskId = null;
  }
  job.assignees = [workerId];
  job.stage = 'inProduction';
  return true;
}

/** The roles that may be put on a job at all. The list itself is in constants.ts from Turn 23, so
 *  that machines.ts can fill the benches with these men without reaching into this module; every
 *  caller still reads it from here, where it has always been (CLAUDE.md T19 2.5, 2.6, T23 2.17). */
export { BUILDING_ROLES };

/** True while this man could be put on a job at all: a joiner or a sprayer, on the books, not off
 *  sick and not on a standing contract. The owner is always able, if he is about.
 *
 *  The contract is the one gate that is not about the man himself: a man put on a contract is the
 *  contract's and vanishes from the jobs, so the player can count the men he has left for the
 *  board (PIOTR, 21.09: "if you put a man on a contract he has to vanish from the jobs, even from
 *  the possibility of being assigned to one"; v42). It is asked here because `assignJob`,
 *  `addToJob`, the manager's `autoAssignJobs` and his re plan all pass through this one door. */
export function canBuild(state: GameState, workerId: string): boolean {
  if (workerId === OWNER) return ownerIsAvailable(state);
  const worker = state.workers.find((entry) => entry.id === workerId);
  if (!worker) return false;
  if (contractOfWorker(state, workerId) !== null) return false;
  return BUILDING_ROLES.includes(worker.role) && worker.absentDaysRemaining <= 0;
}

/** Puts one more man on a job. There is no limit on how many go on one: if the player wants
 *  twenty, he gets twenty, the time shortens, and it is his decision (PIOTR, 17.09;
 *  CLAUDE.md T19 2.5). Nobody is on two jobs at once, so he comes off whatever he was on. */
export function addToJob(state: GameState, jobId: string, workerId: string): boolean {
  const job = findJob(state, jobId);
  if (!job) return false;
  if (job.stage !== 'ready' && job.stage !== 'inProduction') return false;
  if (isOnJob(job, workerId)) return false;
  if (!canBuild(state, workerId)) return false;
  // He comes off whatever else he was on, first man or not.
  for (const other of state.jobs) {
    if (other.id === job.id) continue;
    if (isOnJob(other, workerId)) takeOffJob(state, other.id, workerId);
  }
  if (workerId === OWNER) {
    // The owner cannot draw and cut in the same minute.
    state.owner.currentTaskId = null;
  } else {
    const worker = state.workers.find((entry) => entry.id === workerId);
    if (worker) worker.jobId = job.id;
  }
  job.assignees.push(workerId);
  job.stage = 'inProduction';
  return true;
}

/** Takes one man off a job and leaves everybody else on it: the cross on his chip
 *  (CLAUDE.md T19 2.5). The last man off puts the job back on the list. */
export function takeOffJob(state: GameState, jobId: string, workerId: string): boolean {
  const job = findJob(state, jobId);
  if (!job) return false;
  if (!removeAssignee(job, workerId)) return false;
  const worker = state.workers.find((entry) => entry.id === workerId);
  if (worker && worker.jobId === job.id) worker.jobId = null;
  if (job.assignees.length === 0) {
    closeStageRun(state, job);
    if (job.stage === 'inProduction') job.stage = 'ready';
  }
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
  const lead = leadAssignee(job);
  return lead !== null && lead !== OWNER && !isOnJob(job, OWNER);
}

export function takeOverJob(state: GameState, jobId: string): boolean {
  const job = findJob(state, jobId);
  if (!job || !canTakeOver(state, job)) return false;
  // He cannot be at the desk and at the bench in the same minute.
  state.owner.currentTaskId = null;
  // Nor at two benches: he steps off the one he was at, and the men beside him stay on it
  // (CLAUDE.md T19 2.5).
  const held = jobHeldBy(state, OWNER);
  if (held !== null && held.id !== job.id) takeOffJob(state, held.id, OWNER);
  job.assignees.splice(1, 0, OWNER);
  job.stage = 'inProduction';
  state.owner.tookOverJobId = job.id;
  return true;
}

/** The evening is over: the one job the owner took on for it goes back to the man it belongs to,
 *  who picks it up in the morning where the evening left it (CLAUDE.md T17 2.12). Only that job:
 *  until v44 dusk took him off every job he was not the lead of, which since v41 is every job he
 *  joined by day as a second pair of hands, so he was thrown off his own work every night
 *  (PIOTR, 21.09). */
export function endOwnerTakeOver(state: GameState): void {
  const taken = state.owner.tookOverJobId;
  state.owner.tookOverJobId = null;
  if (taken === null) return;
  const job = findJob(state, taken);
  if (job !== null && ownerTookOver(state, job)) removeAssignee(job, OWNER);
}

/** True while the owner is standing at a job he took on for the evening: the row says "You are on
 *  it tonight" rather than offering the takeover again (CLAUDE.md T17 2.12). It is the job he
 *  pressed the button for and he is still on it; a job he joined by day is not a takeover, however
 *  far down its list he stands (CLAUDE.md T19 2.5; v44). */
export function ownerTookOver(state: GameState, job: Job): boolean {
  return state.owner.tookOverJobId === job.id && isOnJob(job, OWNER);
}

/** Takes whoever is on the job off it, leaving the work done in place. Their places go to the
 *  next men in the day plan's order (CLAUDE.md T25 2.3). */
export function releaseJob(state: GameState, job: Job): void {
  // Everybody comes off it, however many are on it (CLAUDE.md T19 2.5).
  for (const worker of state.workers) {
    if (worker.jobId === job.id) worker.jobId = null;
  }
  job.assignees = [];
  closeStageRun(state, job);
  if (job.stage === 'inProduction') job.stage = 'ready';
}

/** Writes down that somebody worked this stage this minute. A run is opened for the stage when it
 *  has none open; from v37 two stages may be open at once, because two men on one job may be at
 *  two stages (the bag of work, PIOTR 20.09). The Work Plan's bars and its grey gaps are read off
 *  these and off nothing else (CLAUDE.md T7 3.2). */
export function noteStageWork(state: GameState, job: Job, stage: StageId): void {
  if (job.stageRuns.some((run) => run.endDay === null && run.stage === stage)) return;
  job.stageRuns.push({
    stage,
    startDay: state.clock.day,
    startMinute: state.clock.minute,
    endDay: null,
    endMinute: null,
  });
}

/** Closes the open run of one stage, or every open run when no stage is named, at this minute. */
export function closeStageRun(state: GameState, job: Job, stage: StageId | null = null): void {
  for (const run of job.stageRuns) {
    if (run.endDay !== null || (stage !== null && run.stage !== stage)) continue;
    run.endDay = state.clock.day;
    run.endMinute = state.clock.minute;
  }
}

/** What an express job pays over its base price, earned with the labour that earns it: the whole
 *  uplift over the whole job, so a minute of an express job earns its share of the premium. The
 *  workshop rate counts it; the job, the deadline, the penalty and the rating are untouched
 *  (CLAUDE.md T17 2.26 and 6). */
function expressUpliftOn(job: Job, put: number): number {
  if (!job.express || job.labourValue <= 0) return 0;
  const uplift = job.price - job.basePrice;
  if (uplift <= 0) return 0;
  return (uplift * put) / job.labourValue;
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
  // The stage's own bag, so the next man on the job can be at another stage (v37).
  job.stageLabour[stage] = (job.stageLabour[stage] ?? 0) + put;
  const plan = stagePlanFor(state, job);
  const worked = plan.find((entry) => entry.id === stage);
  if (worked !== undefined && stageLeft(job, plan, worked) <= WORK_EPSILON) {
    closeStageRun(state, job, stage);
  }
  state.dayStats.workMinutes += 1;
  state.dayStats.labourValue = Math.round((state.dayStats.labourValue + put) * 10000) / 10000;
  const uplift = expressUpliftOn(job, put);
  if (uplift > 0) {
    state.dayStats.expressUplift = Math.round((state.dayStats.expressUplift + uplift) * 10000) / 10000;
  }
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
  job.stage = 'awaitingTransport';
  job.finishedDay = state.clock.day;
  state.dayStats.jobsCompleted.push(job.id);
}

/** Everything made and not yet taken away. */
export function jobsAtGate(state: GameState): Job[] {
  return state.jobs.filter((job) => job.stage === 'awaitingTransport');
}

/** What ordering transport costs today: a courier, or the trip in the van the company would send,
 *  its minutes and the pieces it takes (v54). */
export function transportLabel(state: GameState): string {
  const van = tripVan(state);
  if (van === null) return `Courier ${formatMoney(COURIER_COST)}, next working day`;
  const pieces = vanClassOf(van).piecesPerTrip;
  return `Take it in the van, ${deliveryMinutes(state)} min${pieces > 1 ? `, up to ${pieces} pieces a trip` : ''}`;
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
        minutes: deliveryMinutes(state),
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
