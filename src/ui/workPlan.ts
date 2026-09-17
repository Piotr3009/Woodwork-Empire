// The Work Plan board on the office wall, the simple one: one row a job, one bar, the minutes
// under it, a blue line for now and a red tick for the deadline (PIOTR, the mockup of 13.09;
// CLAUDE.md T9 3.6). The five stage bars of Turn 7 are gone; a stage is a word now.

import { formatCalendarDay, workPlan } from '../engine/index';
import type { GameState, Job, PlanRow, WorkPlan } from '../engine/index';
// Straight off their own module, not round the public API, which Turn 13 froze (REPORT-T13 10).
import { canTakeOver, ownerTookOver } from '../engine/jobs';
import { joiners, onTheBooksToday } from '../engine/staff';
import { renderContractBar } from './contracts';
import {
  callsLine,
  dropControl,
  jobAction,
  jobAssignControls,
  jobLifecycleRow,
  materialLine,
} from './jobCard';
import { button, emptyLine, escapeHtml, money } from './modal';

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

/** The second man on a job: a click on the row and two men stand at it, each booking his own
 *  minutes into it (PIOTR, 16.09; CLAUDE.md T17 2.10). The first man is not on the chips, and
 *  Alone takes the second off again. A job nobody is on is assigned, not seconded. */
function secondManControls(state: GameState, job: Job): string {
  if (job.assignedTo === null) return '';
  if (job.stage !== 'ready' && job.stage !== 'inProduction') return '';
  // The owner on it for the evening is the takeover of 2.12 and not a second man to choose.
  if (ownerTookOver(job)) return '';
  const chip = (workerId: string, label: string): string =>
    `<button class="chip${(job.secondAssignee ?? '') === workerId ? ' is-on' : ''}" ` +
    `data-do="assignSecond" data-id="${job.id}" data-worker="${workerId}">` +
    `${escapeHtml(label)}</button>`;
  const crew = joiners(state)
    .filter((worker) => onTheBooksToday(state, worker) && worker.id !== job.assignedTo)
    .map((worker) => chip(worker.id, worker.name))
    .join('');
  if (crew === '') return '';
  return (
    '<span class="row-figure">Second man</span>' +
    `<span class="row-action">${chip('', 'Alone')}${crew}</span>`
  );
}

/** The evening: the owner takes a man's job on himself, by this click and never on his own. The
 *  man has it back in the morning where the evening left it (PIOTR, 17.09; CLAUDE.md T17 2.12).
 *  Nothing at all by day: the crew are in the hall and the job is theirs. */
function takeOverControl(state: GameState, job: Job): string {
  if (ownerTookOver(job)) {
    return '<span class="row-figure">You are on it tonight; he has it back in the morning</span>';
  }
  if (!canTakeOver(state, job)) return '';
  return (
    '<span class="row-action">' +
    button('takeOverJob', 'Take it on tonight', `data-id="${job.id}"`) +
    '</span>'
  );
}

/** Who is on it and what it is worth: the left hand column of the board. */
function headHtml(state: GameState, job: Job, row: PlanRow, dropConfirm: string | null): string {
  const action = jobAction(state, job);
  return (
    '<div class="plan-head">' +
    `<span class="row-main">${escapeHtml(job.name)} ${money(job.price)}</span>` +
    jobLifecycleRow(state, job) +
    `<span class="row-figure">${escapeHtml(row.stage)}</span>` +
    `<span class="row-figure">on it: ${escapeHtml(row.who)} · due ` +
    `${formatCalendarDay(row.dueDay)}</span>` +
    callsLine(job) +
    materialLine(state, job) +
    jobAssignControls(state, job) +
    secondManControls(state, job) +
    takeOverControl(state, job) +
    dropControl(job, dropConfirm) +
    (action === '' ? '' : `<span class="row-action">${action}</span>`) +
    '</div>'
  );
}

/** The one bar of a row: as long as the work in it at the rate it will get, with the minutes that
 *  are done filled green from the left. It is an outline before the job is started and an outline
 *  after it: what stretches is the outline, and what fills is the green (CLAUDE.md T11 3.3). */
function barHtml(plan: WorkPlan, row: PlanRow): string {
  const left = across(plan, row.from);
  const right = across(plan, row.to);
  const width = Math.max(0.8, right - left);
  const lost = row.lostMinutes > 0 ? `, ${row.lostMinutes} min lost` : '';
  const title = row.notStarted
    ? `${Math.round(row.minutesTotal)} min of work, ${row.rateLabel}`
    : `${Math.round(row.minutesDone)} of ${Math.round(row.minutesTotal)} min${lost}`;
  const classes =
    `plan-bar${row.notStarted ? ' is-projected' : ''}${row.overdue ? ' is-late' : ''}`;
  const label = row.overdue
    ? `<span class="plan-late" style="left:${round(Math.min(99, right))}%">` +
      `late by ${row.lateDays} ${row.lateDays === 1 ? 'day' : 'days'}</span>`
    : '';
  return (
    `<div class="${classes}" ` +
    `style="left:${round(left)}%;width:${round(width)}%" title="${escapeHtml(title)}">` +
    `<span class="plan-done" style="width:${round(row.done * 100)}%"></span></div>` +
    label
  );
}

/** The red tick at the deadline, and the yellow one at the latest a job can be started and still
 *  be on time. A latest start that has gone is drawn at Now, in red (CLAUDE.md T9 3.6). */
function ticksHtml(plan: WorkPlan, row: PlanRow): string {
  const due =
    `<div class="plan-due" data-due="${row.dueDay}" ` +
    `style="left:${round(across(plan, row.duePoint))}%" ` +
    `title="Due ${formatCalendarDay(row.dueDay)}"><span>DL</span></div>`;
  if (row.latestStart === null || row.latestStartPoint === null) return due;
  const at = row.late ? plan.now : row.latestStartPoint;
  const label = row.late ? 'late' : 'Latest start';
  const title = row.late
    ? `Already late: it wanted starting on ${formatCalendarDay(row.latestStart)}, ${row.rateLabel}`
    : `Latest start ${formatCalendarDay(row.latestStart)}, ${row.rateLabel}`;
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
    `<span class="row-figure">${formatCalendarDay(plan.fromDay)} to ` +
    `${formatCalendarDay(plan.toDay)}</span></div>` +
    `<div class="plan-chart plan-scale">${days.join('')}${nowHtml(plan)}` +
    `<span class="plan-now-label" style="left:${round(across(plan, plan.now))}%">Now</span>` +
    '</div></div>'
  );
}

export function renderWorkPlan(state: GameState, dropConfirm: string | null = null): string {
  const plan = workPlan(state);
  // The standing contracts have a bar of their own, apart from the jobs (CLAUDE.md T13 3.16).
  const contracts = renderContractBar(state);
  if (plan.rows.length === 0) return contracts + emptyLine('No jobs yet. Open the board.');
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
    'tick is the day it is due. A bar is as long as the work in it at the rate it will get, and ' +
    'the green inside it is the work that is done. Every minute the job stands still stretches ' +
    'the outline, so its right edge is the day it will really be finished; past the deadline it ' +
    'turns red. A job nobody has started yet carries the yellow tick on the last day it can be ' +
    'started and still be on time. The axis is working days: Monday follows Friday and no ' +
    'deadline falls at a weekend.</p>' +
    contracts +
    `<div class="plan">${scaleHtml(plan)}${rows}</div>`
  );
}
