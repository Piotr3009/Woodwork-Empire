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
  jobMen,
  jobRate,
  jobStage,
  meetingOutstanding,
  minutesRemainingFor,
} from './jobs';
import { ownerIsAvailable } from './owner';
import { isWorkingToday, joiners, shiftOf } from './staff';
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
 *  owner alone would do to it (CLAUDE.md T9 3.6).
 *
 *  Not the workshop rate of Turn 17, which is a figure in pounds an hour and lives in rate.ts:
 *  this one is a speed the work plan draws a bar at, and it has carried the name since Turn 9. */
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

/** What the men on a job are called, in the order they were put on it: "you", "Tom", or the two of
 *  them named together when a job has a second man (CLAUDE.md T17 2.10). Empty when nobody is on
 *  it at all. */
export function menOnJob(state: GameState, job: Job): string[] {
  return jobMen(job).map((who) => {
    if (who === OWNER) return 'you';
    const worker = state.workers.find((entry) => entry.id === who);
    if (!worker) return who;
    // A man on the second shift is named with it: the bar moves tonight, not today (T13 3.9).
    return shiftOf(state, worker) === 'night' ? `${worker.name}, night shift` : worker.name;
  });
}

/** Two names joined the way the board says them: "Tom and Ben". */
export function namesText(names: readonly string[]): string {
  if (names.length === 0) return 'nobody yet';
  return names.length === 1 ? names[0] ?? '' : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1] ?? ''}`;
}

/** The rate this job's bar is drawn at, and what the board calls it. Two men on it is both their
 *  rates, because both stand at it in the same minute (CLAUDE.md T17 2.10). */
export function rateFor(state: GameState, job: Job): { rate: number; label: string } {
  const rate = jobRate(state, job);
  if (rate <= 0) return { rate: workshopRate(state), label: 'at workshop average' };
  return { rate, label: `for ${namesText(menOnJob(state, job))}` };
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
  /** The share of the bar filled green from the left, 0 to 1. The green is the work that is
   *  done; the bare part behind the blue line is the time the job's clock did not move. */
  done: number;
  minutesDone: number;
  minutesTotal: number;
  /** The minutes the bar has been stretched by: everything that has gone by since it was started
   *  without a minute of work going into it (CLAUDE.md T11 3.3). */
  lostMinutes: number;
  /** True when the projected end has walked past the deadline: the outline turns red. */
  overdue: boolean;
  /** How many working days past the deadline the projected end lands, at least one. */
  lateDays: number;
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
  const whole = minutesRemainingFor(state, { ...job, labourRemaining: job.labourValue, stageLabour: {} }, rate);
  const total = Math.max(whole, left);
  const from = productionStart(state, job);
  const notStarted = job.stageRuns.length === 0;
  const length = total / MINUTES_PER_WORKING_DAY;
  const duePoint = workingDayIndex(job.dueDay);
  // The work takes working days, so counting back from the deadline counts back over the axis
  // and never over a weekend (CLAUDE.md T10 3.5).
  const latestStartPoint = notStarted ? Math.round((duePoint - length) * 100) / 100 : null;
  // The bar is as long as the work in it, from the day it was picked up. Started, its right edge
  // is the projected end and never the deadline: now plus what is left at this rate, which is the
  // same thing as the length of the work plus every minute the job's clock did not move. An hour
  // with no place at the saw stretches it by an hour and the end walks towards DL
  // (PIOTR, 15.09; CLAUDE.md T11 3.3).
  const to = notStarted
    ? from + length
    : Math.max(from, now + left / MINUTES_PER_WORKING_DAY);
  const barMinutes = Math.max(1, (to - from) * MINUTES_PER_WORKING_DAY);
  const minutesDone = Math.max(0, total - left);
  const overdue = to > duePoint;
  return {
    jobId: job.id,
    name: job.name,
    price: job.price,
    // Both men when a job has two, in the order they were put on it (CLAUDE.md T17 2.10).
    who: namesText(menOnJob(state, job)),
    stage: stageText(state, job),
    notStarted,
    from,
    to,
    dueDay: job.dueDay,
    duePoint,
    done: notStarted ? 0 : Math.min(1, minutesDone / barMinutes),
    minutesDone,
    minutesTotal: total,
    lostMinutes: notStarted ? 0 : Math.max(0, Math.round(barMinutes - total)),
    overdue,
    lateDays: overdue ? Math.max(1, Math.ceil(to - duePoint)) : 0,
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
