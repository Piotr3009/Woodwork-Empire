// The Work Plan board on the office wall, the simple one: one row a job, one bar, the minutes
// under it, a blue line for now and a red tick for the deadline (PIOTR, the mockup of 13.09;
// CLAUDE.md T9 3.6). The five stage bars of Turn 7 are gone; a stage is a word now.

import { workPlan } from '../engine/index';
import type { GameState, Job, PlanRow, WorkPlan } from '../engine/index';
import {
  callsLine,
  dropControl,
  fromStockControl,
  jobAction,
  jobAssignControls,
  jobLifecycleRow,
} from './jobCard';
import { emptyLine, escapeHtml, money } from './modal';

/** Where a point of the axis sits across it, as a percentage. One axis for every row, so the blue
 *  line is the same line on all of them. The axis is in working days: Monday comes straight after
 *  Friday and no column is drawn for a weekend (CLAUDE.md T10 3.5). */
function across(plan: WorkPlan, point: number): number {
  const span = Math.max(1, plan.to - plan.from);
  return Math.min(100, Math.max(0, ((point - plan.from) / span) * 100));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function minutesText(row: PlanRow): string {
  const done = Math.round(row.minutesDone);
  const total = Math.round(row.minutesTotal);
  return `${done.toLocaleString('en-GB')} of ${total.toLocaleString('en-GB')} min · ${row.stage}`;
}

/** Who is on it and what it is worth: the left hand column of the board. */
function headHtml(state: GameState, job: Job, row: PlanRow, dropConfirm: string | null): string {
  const action = jobAction(state, job);
  return (
    '<div class="plan-head">' +
    `<span class="row-main">${escapeHtml(job.name)} ${money(job.price)}</span>` +
    jobLifecycleRow(state, job) +
    `<span class="row-figure">${escapeHtml(row.stage)}</span>` +
    `<span class="row-figure">on it: ${escapeHtml(row.who)} · due day ${row.dueDay}</span>` +
    callsLine(job) +
    jobAssignControls(state, job) +
    fromStockControl(state, job) +
    dropControl(job, dropConfirm) +
    (action === '' ? '' : `<span class="row-action">${action}</span>`) +
    '</div>'
  );
}

/** The one bar of a row, with the done share filled from the left. */
function barHtml(plan: WorkPlan, row: PlanRow): string {
  const left = across(plan, row.from);
  const right = across(plan, row.to);
  const width = Math.max(0.8, right - left);
  const title = row.notStarted
    ? `${Math.round(row.minutesTotal)} min of work, ${row.rateLabel}`
    : `${Math.round(row.minutesDone)} of ${Math.round(row.minutesTotal)} min`;
  return (
    `<div class="plan-bar${row.notStarted ? ' is-projected' : ''}" ` +
    `style="left:${round(left)}%;width:${round(width)}%" title="${escapeHtml(title)}">` +
    `<span class="plan-done" style="width:${round(row.done * 100)}%"></span></div>`
  );
}

/** The red tick at the deadline, and the yellow one at the latest a job can be started and still
 *  be on time. A latest start that has gone is drawn at Now, in red (CLAUDE.md T9 3.6). */
function ticksHtml(plan: WorkPlan, row: PlanRow): string {
  const due =
    `<div class="plan-due" data-due="${row.dueDay}" ` +
    `style="left:${round(across(plan, row.duePoint))}%" ` +
    `title="Due day ${row.dueDay}"><span>DL</span></div>`;
  if (row.latestStart === null || row.latestStartPoint === null) return due;
  const at = row.late ? plan.now : row.latestStartPoint;
  const label = row.late ? 'late' : 'Latest start';
  const title = row.late
    ? `Already late: it wanted starting on day ${row.latestStart}, ${row.rateLabel}`
    : `Latest start day ${row.latestStart}, ${row.rateLabel}`;
  return (
    due +
    `<div class="plan-start${row.late ? ' is-late' : ''}" data-start="${row.latestStart}" ` +
    `style="left:${round(across(plan, at))}%" title="${escapeHtml(title)}">` +
    `<span>${escapeHtml(label)}</span></div>`
  );
}

function nowHtml(plan: WorkPlan): string {
  return `<div class="plan-now" style="left:${round(across(plan, plan.now))}%"></div>`;
}

/** The days across the top, and the one Now label the blue line carries. Working days only: a
 *  Saturday and a Sunday are not columns of this board (CLAUDE.md T10 3.5). */
function scaleHtml(plan: WorkPlan): string {
  const days = plan.days.map(
    (entry) =>
      `<span class="plan-day" data-day="${entry.day}" ` +
      `style="left:${round(across(plan, entry.point))}%"></span>`,
  );
  return (
    '<div class="plan-row plan-scale-row"><div class="plan-head">' +
    `<span class="row-figure">Day ${plan.fromDay} to day ${plan.toDay}</span></div>` +
    `<div class="plan-chart plan-scale">${days.join('')}${nowHtml(plan)}` +
    `<span class="plan-now-label" style="left:${round(across(plan, plan.now))}%">Now</span>` +
    '</div></div>'
  );
}

export function renderWorkPlan(state: GameState, dropConfirm: string | null = null): string {
  const plan = workPlan(state);
  if (plan.rows.length === 0) return emptyLine('No jobs yet. Open the board.');
  const rows = plan.rows
    .map((row) => {
      const job = state.jobs.find((entry) => entry.id === row.jobId);
      if (!job) return '';
      return (
        `<div class="plan-row" data-plan="${row.jobId}">` +
        headHtml(state, job, row, dropConfirm) +
        '<div class="plan-chart">' +
        nowHtml(plan) +
        barHtml(plan, row) +
        ticksHtml(plan, row) +
        `<span class="plan-figures">${escapeHtml(minutesText(row))}</span>` +
        `<span class="plan-rate">${escapeHtml(row.rateLabel)}</span>` +
        '</div></div>'
      );
    })
    .join('');
  return (
    '<p class="hint">One row a job, the nearest deadline first. The blue line is now and the red ' +
    'tick is the day it is due. A job nobody has started yet is drawn as long as the work in it, ' +
    'with the yellow tick on the last day it can be started and still be on time. The axis is ' +
    'working days: Monday follows Friday and no deadline falls at a weekend.</p>' +
    `<div class="plan">${scaleHtml(plan)}${rows}</div>`
  );
}
