// The Work Plan board, the simple one: one row a job, one bar, a blue line for now and a red tick
// for the deadline (PIOTR, the mockup of 13.09: "the Work Plan modal is too complicated. One bar,
// minutes under it, a blue line for now, a red line for the deadline"; CLAUDE.md T9 3.6).
//
// Nothing here decides anything. It reads what the engine wrote as the work went in and projects
// the rest from the minutes that are left, at the rate of the man who is on it or at the rate the
// workshop averages when nobody is.

import { MINUTES_PER_WORKING_DAY } from './constants';
import { workedMinutesOfDay } from './clock';
import { OWNER } from './machines';
import {
  designOutstanding,
  jobProgress,
  jobStage,
  meetingOutstanding,
  minutesRemainingFor,
} from './jobs';
import { ownerIsAvailable } from './owner';
import { isWorkingToday, joiners } from './staff';
import type { GameState, Job } from './types';

/** Days past the deadline the board still draws, so a late job has somewhere to run to
 *  (CLAUDE.md T7 3.2). */
export const BOARD_DAYS_PAST_DUE = 3;

/** A day and a minute of the working day as one number, so a bar can be part of a day wide. */
export function dayPoint(day: number, minute: number): number {
  return day + Math.min(1, workedMinutesOfDay(minute) / MINUTES_PER_WORKING_DAY);
}

/** What the hands the workshop has today average, against the owner at his best. He is one of
 *  them, at 1.0: a job nobody is on is drawn at what this workshop does to it, not at what the
 *  owner alone would do to it (CLAUDE.md T9 3.6). */
export function workshopRate(state: GameState): number {
  const rates: number[] = [];
  if (ownerIsAvailable(state)) rates.push(1);
  for (const worker of joiners(state)) {
    if (isWorkingToday(state, worker) && worker.rate > 0) rates.push(worker.rate);
  }
  if (rates.length === 0) return 1;
  const total = rates.reduce((sum, rate) => sum + rate, 0);
  return Math.round((total / rates.length) * 10000) / 10000;
}

/** The rate this job's bar is drawn at, and what the board calls it. */
export function rateFor(state: GameState, job: Job): { rate: number; label: string } {
  if (job.assignedTo === OWNER) return { rate: 1, label: 'for you' };
  const worker =
    job.assignedTo === null
      ? undefined
      : state.workers.find((entry) => entry.id === job.assignedTo);
  if (worker && worker.rate > 0) return { rate: worker.rate, label: `for ${worker.name}` };
  return { rate: workshopRate(state), label: 'at workshop average' };
}

/** Where the job is standing, in the words the board says it in. No stage colours and no five
 *  bars: a stage is a word (CLAUDE.md T9 3.6). */
export function stageText(state: GameState, job: Job): string {
  switch (job.stage) {
    case 'accepted':
      if (meetingOutstanding(state, job)) return 'client not seen yet';
      return designOutstanding(state, job) ? 'drawings not done' : 'drawing to do';
    case 'materialPending':
      return 'material to order';
    case 'materialOrdered':
      return 'material ordered';
    case 'materialInYard':
      return 'material at the gate';
    case 'ready':
      return 'ready for production';
    case 'awaitingTransport':
      return 'waiting for transport';
    case 'completed':
      return 'delivered';
    default: {
      const stage = jobStage(state, job);
      const where = stage?.label ?? 'In production';
      return job.blockedBy === '' ? where : `${where}, ${job.blockedBy}`;
    }
  }
}

/** The day the bench can pick this job up: the day it was picked up if it has been, the day the
 *  material lands if it is still on the road, and today if it is standing there ready. */
function productionStart(state: GameState, job: Job): number {
  const first = job.stageRuns[0];
  if (first) return dayPoint(first.startDay, first.startMinute);
  const now = dayPoint(state.clock.day, state.clock.minute);
  const delivery = state.deliveries.find((entry) => entry.jobId === job.id && !entry.unloaded);
  if (delivery) return Math.max(now, dayPoint(delivery.arriveDay, 0));
  return now;
}

export interface PlanRow {
  jobId: string;
  name: string;
  price: number;
  /** Who is on it, in plain words. */
  who: string;
  /** Where it stands, as text and nothing else. */
  stage: string;
  /** True while nothing has been worked into it: the bar is then a projection of what it takes. */
  notStarted: boolean;
  /** The bar, in day points. */
  from: number;
  to: number;
  dueDay: number;
  /** The share of the bar filled green from the left, 0 to 1. */
  done: number;
  minutesDone: number;
  minutesTotal: number;
  /** The last day this one can be started and still be on time. Null once it is started. */
  latestStart: number | null;
  /** True when that day has gone: the tick is drawn at Now, in red (CLAUDE.md T9 3.6). */
  late: boolean;
  /** "at workshop average", "for Tom" or "for you". */
  rateLabel: string;
}

export interface WorkPlan {
  /** The axis: from the earliest acceptance to the latest deadline plus three. */
  fromDay: number;
  toDay: number;
  /** Where the blue line goes. */
  now: number;
  rows: PlanRow[];
}

function rowFor(state: GameState, job: Job): PlanRow {
  const now = dayPoint(state.clock.day, state.clock.minute);
  const { rate, label } = rateFor(state, job);
  const left = minutesRemainingFor(state, job, rate);
  const whole = minutesRemainingFor(state, { ...job, labourRemaining: job.labourValue }, rate);
  const total = Math.max(whole, left);
  const from = productionStart(state, job);
  const notStarted = job.stageRuns.length === 0;
  const length = total / MINUTES_PER_WORKING_DAY;
  const latestStart = notStarted ? Math.round((job.dueDay - length) * 100) / 100 : null;
  const worker =
    job.assignedTo === null || job.assignedTo === OWNER
      ? null
      : state.workers.find((entry) => entry.id === job.assignedTo);
  return {
    jobId: job.id,
    name: job.name,
    price: job.price,
    who: job.assignedTo === OWNER ? 'you' : worker ? worker.name : 'nobody yet',
    stage: stageText(state, job),
    notStarted,
    from,
    // Started, it runs to its deadline; not started, it is as long as the work in it
    // (CLAUDE.md T9 3.6).
    to: notStarted ? from + length : Math.max(job.dueDay, from),
    dueDay: job.dueDay,
    done: jobProgress(job),
    minutesDone: Math.max(0, total - left),
    minutesTotal: total,
    latestStart,
    late: latestStart !== null && latestStart < now,
    rateLabel: label,
  };
}

/** Every job on the books as a row of the board, the nearest deadline first (CLAUDE.md T9 3.6). */
export function workPlan(state: GameState): WorkPlan {
  const open = state.jobs
    .filter((job) => job.stage !== 'completed')
    .slice()
    .sort((left, right) => left.dueDay - right.dueDay || left.id.localeCompare(right.id));
  const rows = open.map((job) => rowFor(state, job));
  const now = dayPoint(state.clock.day, state.clock.minute);
  const accepted = open.map((job) => job.acceptedDay);
  const fromDay = Math.min(state.clock.day, ...(accepted.length > 0 ? accepted : [state.clock.day]));
  const toDay = Math.max(
    fromDay + 1,
    Math.ceil(now) + 1,
    ...rows.map((row) => Math.max(row.dueDay + BOARD_DAYS_PAST_DUE, Math.ceil(row.to))),
  );
  return { fromDay, toDay, now, rows };
}
