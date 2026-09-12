// The life of a job, from the enquiry the player accepted to the rating the client leaves.
// enquiry, accepted, calls, design, material ordered, material in the yard, unloaded, ready,
// in production, completed, paid and rated (CLAUDE.md 9.5).

import {
  BY_HAND_DURATION_FACTOR,
  DEPOSIT_FRACTION,
  LABOUR_FRACTION,
  LATE_PENALTY_PER_DAY,
  LATE_PENALTY_PER_DAY_EXPRESS,
  OWNER_LABOUR_PER_MINUTE,
  SITE_MEASURE_MINUTES,
  SITE_MEASURE_TAXI_COST,
  WORKER_MINUTE_RATE_DIVISOR,
} from './constants';
import { canAccept, findEnquiry, removeEnquiry } from './board';
import { template } from './catalog';
import { chargeUnavoidable, formatMoney, receive } from './economy';
import { queueEvent } from './events';
import { has, machineLabourFactor } from './machines';
import { materialCostFor, orderMaterialForJob, sheetsForCost, stockCostFor } from './materials';
import { ownerIsAvailable } from './owner';
import { applyRating } from './reputation';
import { makeId } from './rng';
import {
  WORK_EPSILON,
  callsForPrice,
  clientCallMinutes,
  createTask,
  designMinutes,
  jobTasks,
  materialOrderMinutes,
} from './tasks';
import type { GameState, Job, MaterialMode } from './types';

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

/** What the workshop does to the minutes this job takes: the machine reductions of 8.6 multiplied
 *  together, and half again as long if it is being made by hand (CLAUDE.md 9.5). Below 1 is
 *  quicker. It is read every minute, so buying a machine speeds up work already on the books and
 *  losing one to the bailiff slows it down again. */
export function jobSpeedFactor(state: GameState, job: Job): number {
  const byHand = job.byHand ? BY_HAND_DURATION_FACTOR : 1;
  return machineLabourFactor(state, job.materialKind) * byHand;
}

/** Minutes this job still needs from a worker of the given rate (1 is the owner). */
export function minutesRemainingFor(state: GameState, job: Job, rate: number): number {
  if (rate <= 0) return Infinity;
  return (job.labourRemaining / (OWNER_LABOUR_PER_MINUTE * rate)) * jobSpeedFactor(state, job);
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
    materialMode: 'perJob',
    sheets: sheetsForCost(materialCost),
    bespokeMaterial: enquiry.bespokeMaterial,
    express: enquiry.express,
    byHand: madeByHand,
    needsMeasure: enquiry.needsMeasure,
    labourValue,
    labourRemaining: labourValue,
    acceptedDay: state.clock.day,
    dueDay: state.clock.day + enquiry.deadlineDays,
    stage: 'accepted',
    callsRemaining: callsForPrice(enquiry.price),
    designMinutesRemaining: designMinutes(entry, enquiry.sizeMultiplier, state.software.tier),
    assignedTo: null,
    completedDay: null,
    daysLate: 0,
    depositPaid: 0,
    balancePaid: 0,
    penalty: 0,
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

/** The calls, the drawing and the site visit the job needs from the owner. */
export function createJobTasks(state: GameState, job: Job): void {
  const minutes = clientCallMinutes(job.price);
  for (let index = 0; index < job.callsRemaining; index += 1) {
    createTask(state, {
      kind: 'clientCall',
      label: `Client call ${index + 1} of ${job.callsRemaining}: ${job.name}`,
      minutes,
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

function callsOutstanding(state: GameState, job: Job): number {
  return jobTasks(state, job.id).filter((task) => task.kind === 'clientCall' && !task.done).length;
}

function designOutstanding(state: GameState, job: Job): boolean {
  return jobTasks(state, job.id).some((task) => task.kind === 'design' && !task.done);
}

function measureOutstanding(state: GameState, job: Job): boolean {
  return jobTasks(state, job.id).some((task) => task.kind === 'siteMeasure' && !task.done);
}

/** True once the drawings exist and the client has been spoken to (CLAUDE.md 9.5). */
export function readyToOrderMaterial(state: GameState, job: Job): boolean {
  return (
    callsOutstanding(state, job) === 0 && !designOutstanding(state, job) && !measureOutstanding(state, job)
  );
}

/** Keeps the job stage and its task list in step after anything finishes. */
export function refreshJob(state: GameState, job: Job): void {
  if (job.stage !== 'accepted' && job.stage !== 'materialPending') return;
  job.callsRemaining = callsOutstanding(state, job);
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
export function canDrawFromStock(state: GameState, job: Job): boolean {
  if (job.materialMode !== 'stock') return false;
  if (job.materialKind !== 'sheet' || job.bespokeMaterial) return false;
  return state.stock.sheets >= job.sheets;
}

export function onMaterialOrdered(state: GameState, job: Job): void {
  if (canDrawFromStock(state, job)) {
    state.stock.sheets -= job.sheets;
    // The sheets were paid for when they were bought, at the cheaper stock price.
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

/** Takes whoever is on the job off it, leaving the work done in place. */
export function releaseJob(state: GameState, job: Job): void {
  const worker = state.workers.find((entry) => entry.jobId === job.id);
  if (worker) worker.jobId = null;
  job.assignedTo = null;
  if (job.stage === 'inProduction') job.stage = 'ready';
}

/** Work one minute of labour into a job. Returns true when the job finished. */
export function addLabour(state: GameState, job: Job, labour: number): boolean {
  if (labour <= 0) return false;
  job.labourRemaining -= labour;
  if (!state.dayStats.jobsAdvanced.includes(job.id)) state.dayStats.jobsAdvanced.push(job.id);
  if (job.labourRemaining > WORK_EPSILON) return false;
  job.labourRemaining = 0;
  completeJob(state, job);
  return true;
}

/** Late penalties come out of the balance, and the client always pays the rest (CLAUDE.md 8.7). */
export function completeJob(state: GameState, job: Job): void {
  job.stage = 'completed';
  job.completedDay = state.clock.day;
  job.daysLate = Math.max(0, state.clock.day - job.dueDay);
  const rate = job.express ? LATE_PENALTY_PER_DAY_EXPRESS : LATE_PENALTY_PER_DAY;
  const balanceDue = Math.round(job.price * (1 - DEPOSIT_FRACTION) * 100) / 100;
  const penalty = Math.min(balanceDue, Math.round(job.daysLate * rate * job.price * 100) / 100);
  job.penalty = penalty;
  job.balancePaid = Math.round((balanceDue - penalty) * 100) / 100;
  receive(state, 'jobBalance', `Balance for ${job.name}`, job.balancePaid);
  releaseJob(state, job);
  job.assignedTo = null;
  job.stage = 'completed';
  state.dayStats.jobsCompleted.push(job.id);
  const rating = applyRating(state, job);
  const lateLine =
    job.daysLate > 0 ? ` ${job.daysLate} days late, penalty ${formatMoney(penalty)}.` : '';
  queueEvent(state, {
    kind: 'jobPaid',
    title: `${job.name} delivered`,
    body:
      `Balance ${formatMoney(job.balancePaid)} in.${lateLine} The client rates the job ` +
      `${rating >= 0 ? '+' : ''}${rating}.`,
    data: { jobId: job.id, rating, balance: Math.round(job.balancePaid), late: job.daysLate },
  });
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
