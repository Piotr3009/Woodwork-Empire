// The Work Plan board on the office wall: every job on the books as a Gantt, a bar per stage, in
// the whiteboard's own colours (CLAUDE.md T7 3.2). The list the laptop used to call "Jobs on the
// books" (CLAUDE.md T4 3.1).

import { openJobs, workPlanGantt } from '../engine/index';
import type { GameState, JobGantt, Job, StageBar } from '../engine/index';
import {
  callsLine,
  jobAction,
  jobAssignControls,
  jobLabourLine,
  jobLifecycleRow,
} from './jobCard';
import { emptyLine, escapeHtml, money } from './modal';

/** The colours of Piotr's whiteboard, in the order the work is done (CLAUDE.md T7 3.2). The CNC
 *  bar stands where the cutting and the machining would have been and has a colour of its own. */
const STAGE_KEY: Array<{ id: string; label: string }> = [
  { id: 'cutting', label: 'Cutting' },
  { id: 'machining', label: 'Machining' },
  { id: 'cnc', label: 'CNC' },
  { id: 'assembly', label: 'Assembly' },
  { id: 'finishing', label: 'Finishing' },
  { id: 'delivery', label: 'Delivery' },
];

/** Where a day sits across the row, as a percentage of it. */
function across(row: JobGantt, day: number): number {
  const span = Math.max(1, row.toDay - row.fromDay);
  return Math.min(100, Math.max(0, ((day - row.fromDay) / span) * 100));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/** One stage bar: the part that is worked off is filled, the rest is hatched, and a bar nobody
 *  has started yet is the projection of what it will take (CLAUDE.md T7 3.2). */
function barHtml(row: JobGantt, bar: StageBar): string {
  const left = across(row, bar.from);
  const right = across(row, bar.to);
  const width = Math.max(0.6, right - left);
  const title = `${bar.label}: day ${Math.floor(bar.from)} to day ${Math.ceil(bar.to)}` +
    `${bar.projected ? ', projected' : ''}`;
  return (
    `<div class="gantt-bar stage-${bar.stage}${bar.projected ? ' is-projected' : ''}" ` +
    `data-stage="${bar.stage}" style="left:${round(left)}%;width:${round(width)}%" ` +
    `title="${escapeHtml(title)}">` +
    `<span class="gantt-done" style="width:${round(bar.done * 100)}%"></span></div>`
  );
}

/** The grey gap of a row: how long the job has been standing still and what is in its way. */
function gapHtml(row: JobGantt): string {
  if (row.gap === null) return '';
  const left = across(row, row.gap.from);
  const width = Math.max(0.6, across(row, row.gap.to) - left);
  return (
    `<div class="gantt-gap" data-gap="1" style="left:${round(left)}%;width:${round(width)}%" ` +
    `title="${escapeHtml(row.gap.reason)}"></div>`
  );
}

/** The days across the top of a row: today marked and the deadline as a red line. */
function scaleHtml(row: JobGantt): string {
  const days: string[] = [];
  for (let day = row.fromDay; day <= row.toDay; day += 1) {
    const isToday = day === row.today;
    days.push(
      `<span class="gantt-day${isToday ? ' is-today' : ''}" data-day="${day}" ` +
      `style="left:${round(across(row, day))}%"></span>`,
    );
  }
  return days.join('');
}

function deadlineHtml(row: JobGantt): string {
  return (
    `<div class="gantt-due" data-due="${row.dueDay}" ` +
    `style="left:${round(across(row, row.dueDay))}%" ` +
    `title="Due day ${row.dueDay}"></div>`
  );
}

/** Who is on the job, and what it is worth: the left hand column of the board. */
function headHtml(state: GameState, job: Job): string {
  const action = jobAction(state, job);
  return (
    '<div class="gantt-head">' +
    `<span class="row-main">${escapeHtml(job.name)} ${money(job.price)}</span>` +
    jobLifecycleRow(state, job) +
    `<span class="row-figure">due day ${job.dueDay}</span>` +
    `<span class="row-figure">${jobLabourLine(state, job)}</span>` +
    callsLine(job) +
    jobAssignControls(state, job) +
    (action === '' ? '' : `<span class="row-action">${action}</span>`) +
    '</div>'
  );
}

export function renderWorkPlan(state: GameState): string {
  const jobs = openJobs(state);
  if (jobs.length === 0) return emptyLine('No jobs yet. Open the board.');
  const rows = workPlanGantt(state)
    .map((row) => {
      const job = jobs.find((entry) => entry.id === row.jobId);
      if (!job) return '';
      return (
        `<div class="gantt-row" data-gantt="${row.jobId}">` +
        headHtml(state, job) +
        '<div class="gantt-chart">' +
        scaleHtml(row) +
        gapHtml(row) +
        row.bars.map((bar) => barHtml(row, bar)).join('') +
        deadlineHtml(row) +
        `<span class="gantt-span">day ${row.fromDay} to ${row.toDay}</span>` +
        '</div></div>'
      );
    })
    .join('');
  const key = STAGE_KEY.map(
    (entry) =>
      `<span class="gantt-key"><span class="gantt-swatch stage-${entry.id}"></span>` +
      `${escapeHtml(entry.label)}</span>`,
  ).join('');
  return (
    `<p class="hint">One row a job, the nearest deadline first. The filled part of a bar is done, ` +
    'the hatched part is what is left at the rate of the man on it, and a grey gap is a stage ' +
    'standing still. The red line is the day it is due.</p>' +
    `<div class="gantt-legend">${key}</div>` +
    `<div class="gantt">${rows}</div>`
  );
}
