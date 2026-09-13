// The Work Plan board: every job on the books as a bar per stage, what has been done of each and
// what is still to come (CLAUDE.md T7 3.2).
//
// Nothing here decides anything. It reads the runs the engine wrote as the work went in, and it
// projects the rest from the minutes that are left at the rate of the man who is on it.

import { GANTT_STAGES, MINUTES_PER_WORKING_DAY } from './constants';
import { workedMinutesOfDay } from './clock';
import { OWNER } from './machines';
import { labourDone, stageMinutes, stagePlanFor } from './stages';
import type { GameState, Job, StageId, StageRun } from './types';

/** How wide the Delivery bar is drawn: the piece stands at the gate for a day before it goes
 *  [TUNE]. It carries no labour, so nothing else would give it a width (CLAUDE.md T7 3.1). */
export const DELIVERY_BAR_DAYS = 1;

/** Days past the deadline the board still draws, so a late job has somewhere to run to
 *  (CLAUDE.md T7 3.2). */
export const BOARD_DAYS_PAST_DUE = 3;

/** One stage of one job on the board. Days are fractions: a day and a half is the middle of the
 *  second one. */
export interface StageBar {
  stage: StageId;
  label: string;
  from: number;
  to: number;
  /** How much of the bar is worked off, 0 to 1. The rest is drawn hatched. */
  done: number;
  /** True while nothing has been worked into this stage yet: the bar is a projection. */
  projected: boolean;
}

/** A gap in a row: the stage is standing still and the hover says why (CLAUDE.md T7 3.2). */
export interface StageGap {
  from: number;
  to: number;
  reason: string;
}

export interface JobGantt {
  jobId: string;
  name: string;
  /** The days the row runs between: from the day the job was accepted to its deadline plus
   *  three (CLAUDE.md T7 3.2). */
  fromDay: number;
  toDay: number;
  dueDay: number;
  today: number;
  bars: StageBar[];
  gap: StageGap | null;
}

/** A day and a minute of the working day as one number, so a bar can be part of a day wide. */
export function dayPoint(day: number, minute: number): number {
  return day + Math.min(1, workedMinutesOfDay(minute) / MINUTES_PER_WORKING_DAY);
}

/** What a man of this job's is worth against the owner at his best. An unassigned job is drawn at
 *  the owner's own rate, because he is who would pick it up. */
export function jobRate(state: GameState, job: Job): number {
  if (job.assignedTo === null || job.assignedTo === OWNER) return 1;
  return state.workers.find((worker) => worker.id === job.assignedTo)?.rate ?? 1;
}

/** The first and last minute anybody spent at this stage, out of the runs the engine wrote. */
function runsOf(job: Job, stage: StageId): { from: number; to: number | null } | null {
  const runs = job.stageRuns.filter((run: StageRun) => run.stage === stage);
  const first = runs[0];
  if (!first) return null;
  const last = runs[runs.length - 1];
  return {
    from: dayPoint(first.startDay, first.startMinute),
    to: last && last.endDay !== null ? dayPoint(last.endDay, last.endMinute ?? 0) : null,
  };
}

/** The bars of one job: what was done when, and what the rest of it will take. */
export function barsFor(state: GameState, job: Job): StageBar[] {
  const now = dayPoint(state.clock.day, state.clock.minute);
  const rate = jobRate(state, job);
  const worked = labourDone(job);
  const bars: StageBar[] = [];
  let cursor = now;
  for (const stage of stagePlanFor(state, job)) {
    const span = stage.to - stage.from;
    const into = Math.min(span, Math.max(0, worked - stage.from));
    const left = Math.max(0, span - into);
    const days = stageMinutes(left, rate, stage.speed) / MINUTES_PER_WORKING_DAY;
    const run = runsOf(job, stage.id);
    const from = run ? run.from : cursor;
    // A stage that is finished is drawn where it actually happened; one still to come is drawn
    // from where the job has got to, at the minutes it has left in it.
    const finished = left <= 0 && run !== null && run.to !== null;
    const to = finished && run.to !== null ? run.to : Math.max(from, cursor) + days;
    bars.push({
      stage: stage.id,
      label: stage.label,
      from,
      to,
      done: span > 0 ? into / span : 0,
      projected: run === null,
    });
    if (left > 0) cursor = Math.max(cursor, to);
  }
  // The piece leaving. It carries no labour, so it is drawn a day wide after the last stage, or
  // on the day it was finished once it is standing at the gate (CLAUDE.md T7 3.1).
  const delivery = GANTT_STAGES.find((stage) => stage.id === 'delivery');
  if (delivery) {
    const finished = job.finishedDay === null ? null : dayPoint(job.finishedDay, 0);
    const from = finished ?? cursor;
    const out = job.completedDay === null ? from + DELIVERY_BAR_DAYS : dayPoint(job.completedDay, 0);
    bars.push({
      stage: delivery.id,
      label: delivery.label,
      from,
      to: Math.max(from + DELIVERY_BAR_DAYS, out),
      done: job.stage === 'completed' ? 1 : 0,
      projected: finished === null,
    });
  }
  return bars;
}

/** The grey gap of a row: the job is standing still and this is how long it has been standing and
 *  what is in its way (CLAUDE.md T7 3.2). Null while nothing is in its way. */
export function gapFor(state: GameState, job: Job): StageGap | null {
  if (job.stage !== 'inProduction' || job.blockedBy === '') return null;
  const now = dayPoint(state.clock.day, state.clock.minute);
  const open = job.stageRuns[job.stageRuns.length - 1];
  // From the last minute anybody worked on it, or from this morning when nobody ever has: a man
  // who has stood at a machine all day has stood there all day (CLAUDE.md T7 3.2).
  const from = open
    ? dayPoint(open.endDay ?? open.startDay, open.endMinute ?? open.startMinute)
    : dayPoint(state.clock.day, 0);
  return { from: Math.min(from, now), to: now, reason: job.blockedBy };
}

/** Every job on the books as a row of the board, the nearest deadline first. */
export function workPlanGantt(state: GameState): JobGantt[] {
  return state.jobs
    .filter((job) => job.stage !== 'completed')
    .slice()
    .sort((left, right) => left.dueDay - right.dueDay || left.id.localeCompare(right.id))
    .map((job) => {
      const bars = barsFor(state, job);
      const last = bars[bars.length - 1];
      return {
        jobId: job.id,
        name: job.name,
        fromDay: job.acceptedDay,
        // To the deadline and three days past it, and further when the work runs further.
        toDay: Math.max(job.dueDay + BOARD_DAYS_PAST_DUE, Math.ceil(last ? last.to : 0)),
        dueDay: job.dueDay,
        today: state.clock.day,
        bars,
        gap: gapFor(state, job),
      };
    });
}
