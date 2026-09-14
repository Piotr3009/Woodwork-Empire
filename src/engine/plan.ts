// The Work Plan board, the simple one: one row a job, one bar, a blue line for now and a red tick
// for the deadline (PIOTR, the mockup of 13.09: "the Work Plan modal is too complicated. One bar,
// minutes under it, a blue line for now, a red line for the deadline"; CLAUDE.md T9 3.6).
//
// Nothing here decides anything. It reads what the engine wrote as the work went in and projects
// the rest from the minutes that are left, at the rate of the man who is on it or at the rate the
// workshop averages when nobody is.

import { MINUTES_PER_WORKING_DAY } from './constants';
import { dayOfWorkingIndex, isWorkingDay, workedMinutesOfDay, workingDayIndex } from './clock';
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

/** A day and a minute of the working day as one number on the board's axis, so a bar can be part
 *  of a day wide. The axis counts working days only: Monday comes straight after Friday and the
 *  weekend has no column, because nothing happens on it and no deadline falls in it
 *  (PIOTR; CLAUDE.md T10 3.5). */
export function dayPoint(day: number, minute: number): number {
  return workingDayIndex(day) + Math.min(1, workedMinutesOfDay(minute) / MINUTES_PER_WORKING_DAY);
}

/** A place on that axis, back in the calendar days the player counts a deadline in. */
export function dayOfPoint(point: number): number {
  const whole = Math.floor(point);
  return Math.round((dayOfWorkingIndex(whole) + (point - whole)) * 100) / 100;
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
  /** Where the deadline sits on the axis, which counts working days only. */
  duePoint: number;
  /** The share of the bar filled green from the left, 0 to 1. */
  done: number;
  minutesDone: number;
  minutesTotal: number;
  /** The last day this one can be started and still be on time, in calendar days, so it reads
   *  like every other day on the card. Null once it is started. */
  latestStart: number | null;
  /** And where that day sits on the axis. */
  latestStartPoint: number | null;
  /** True when that day has gone: the tick is drawn at Now, in red (CLAUDE.md T9 3.6). */
  late: boolean;
  /** "at workshop average", "for Tom" or "for you". */
  rateLabel: string;
}

/** One column of the axis: the working day, and where it sits on it. */
export interface PlanDay {
  day: number;
  point: number;
}

export interface WorkPlan {
  /** The axis in calendar days: from the earliest acceptance to the latest deadline plus three. */
  fromDay: number;
  toDay: number;
  /** The same two ends on the working day axis everything is drawn against. */
  from: number;
  to: number;
  /** Where the blue line goes, on that axis. */
  now: number;
  /** The columns: every working day of the span and no weekend (CLAUDE.md T10 3.5). */
  days: PlanDay[];
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
  const duePoint = workingDayIndex(job.dueDay);
  // The work takes working days, so counting back from the deadline counts back over the axis
  // and never over a weekend (CLAUDE.md T10 3.5).
  const latestStartPoint = notStarted ? Math.round((duePoint - length) * 100) / 100 : null;
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
    to: notStarted ? from + length : Math.max(duePoint, from),
    dueDay: job.dueDay,
    duePoint,
    done: jobProgress(job),
    minutesDone: Math.max(0, total - left),
    minutesTotal: total,
    latestStart: latestStartPoint === null ? null : dayOfPoint(latestStartPoint),
    latestStartPoint,
    late: latestStartPoint !== null && latestStartPoint < now,
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
  const from = workingDayIndex(fromDay);
  const to = Math.max(
    from + 1,
    Math.ceil(now) + 1,
    ...rows.map((row) => Math.max(row.duePoint + BOARD_DAYS_PAST_DUE, Math.ceil(row.to))),
  );
  const toDay = dayOfWorkingIndex(Math.ceil(to));
  const days: PlanDay[] = [];
  for (let day = fromDay; day <= toDay; day += 1) {
    if (!isWorkingDay(day)) continue;
    days.push({ day, point: workingDayIndex(day) });
  }
  return { fromDay, toDay, from, to, now, days, rows };
}
