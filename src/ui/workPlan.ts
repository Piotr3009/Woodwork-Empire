// The Work Plan board on the office wall, the simple one: one row a job, one bar, the minutes
// under it, a blue line for now and a red tick for the deadline (PIOTR, the mockup of 13.09;
// CLAUDE.md T9 3.6). The five stage bars of Turn 7 are gone; a stage is a word now.

import { formatCalendarDay, workPlan } from '../engine/index';
import type { GameState, Job, PlanRow, WorkPlan } from '../engine/index';
// Straight off their own module, not round the public API, which Turn 13 froze (REPORT-T13 10).
import { canTakeOver, ownerTookOver } from '../engine/jobs';
import { renderContractsTab } from './contracts';
import {
  callsLine,
  dropControl,
  jobAction,
  jobAssignControls,
  jobLifecycleRow,
  materialLine,
} from './jobCard';
import { button, emptyLine, escapeHtml, money, tabBar } from './modal';
import { NEEDS_A_JOB, workerDoing } from './personCard';
import { ROLE_WORDS } from './team';

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

/** The evening: the owner takes a man's job on himself, by this click and never on his own. The
 *  man has it back in the morning where the evening left it (PIOTR, 17.09; CLAUDE.md T17 2.12).
 *  Nothing at all by day: the crew are in the hall and the job is theirs. */
function takeOverControl(state: GameState, job: Job): string {
  if (ownerTookOver(state, job)) {
    return '<span class="row-figure">You are on it tonight; he has it back in the morning</span>';
  }
  if (!canTakeOver(state, job)) return '';
  return (
    '<span class="row-action">' +
    button('takeOverJob', 'Take it on tonight', `data-id="${job.id}"`) +
    '</span>'
  );
}

/** Who is on it and what it is worth: the left hand column of the board. The men are the chips of
 *  2.5 now, so the head says the day it is due and nothing about who has it: the chips do that,
 *  and saying it twice was what made the row unreadable (PIOTR, 17.09; CLAUDE.md T19 2.5). */
function headHtml(
  state: GameState,
  job: Job,
  row: PlanRow,
  assignOpen: string | null,
): string {
  const action = jobAction(state, job);
  return (
    '<div class="plan-head">' +
    `<span class="row-main">${escapeHtml(job.name)} ${money(job.price)}</span>` +
    jobLifecycleRow(state, job) +
    `<span class="row-figure">${escapeHtml(row.stage)}</span>` +
    `<span class="row-figure">due ${formatCalendarDay(row.dueDay)}</span>` +
    callsLine(job) +
    materialLine(state, job) +
    jobAssignControls(state, job, assignOpen === job.id) +
    takeOverControl(state, job) +
    dropControl(job) +
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

/** The two tabs of the folder the Work Plan is read in: the jobs, and the standing contracts
 *  (PIOTR, the mockup of docs/mockups/t20; CLAUDE.md T20 2.1). */
export type WorkPlanTab = 'jobs' | 'contracts';

const WORK_PLAN_TABS: Array<[string, string]> = [
  ['jobs', 'Jobs'],
  ['contracts', 'Contracts'],
];

export function workPlanTabFrom(value: string): WorkPlanTab {
  return value === 'contracts' ? 'contracts' : 'jobs';
}

export function renderWorkPlan(
  state: GameState,
  /** Which of the two tabs is on top (CLAUDE.md T20 2.1). */
  tab: WorkPlanTab = 'jobs',
  /** The job or contract whose Assign list is open, or null for none (CLAUDE.md T19 2.5). */
  assignOpen: string | null = null,
  /** The man an offer card is worked out for, or null for the card's own first choice
   *  (CLAUDE.md T20 2.1.1). */
  contractMan: string | null = null,
): string {
  const tabs = tabBar('workPlanTab', WORK_PLAN_TABS, tab);
  // The Contracts tab is the drawing of docs/mockups/t20/contracts-tab.html; the Jobs tab is what
  // the modal always was, less the contract bar, which has moved into Running
  // (CLAUDE.md T20 2.1, 2.1.5).
  if (tab === 'contracts') return tabs + renderContractsTab(state, assignOpen, contractMan);
  return tabs + jobsTab(state, assignOpen);
}

/** The crew column of the board: everybody on the books, what he is on this minute, and the red
 *  line over a man nobody has put on anything (PIOTR, 20.09; CLAUDE.md T23 2.1). It sits at the
 *  head of the Jobs tab because it is the column the player reads before he clicks Assign on a
 *  row: without a production manager nobody takes a job by himself, so this is where he sees who
 *  is standing about.
 *
 *  The words are `workerDoing` in personCard.ts and are never written again here, so the tile, the
 *  mark over his head and this column say the same thing about the same man. */
function crewColumn(state: GameState): string {
  if (state.workers.length === 0) return '';
  const rows = state.workers
    .map((worker) => {
      const doing = workerDoing(state, worker);
      const waiting = doing === NEEDS_A_JOB;
      return (
        `<div class="row" data-plan-crew="${worker.id}">` +
        `<span class="row-main">${escapeHtml(worker.name)}, ` +
        `${escapeHtml(ROLE_WORDS[worker.role])}</span>` +
        `<span class="row-figure${waiting ? ' warn' : ''}">${escapeHtml(doing)}</span>` +
        '</div>'
      );
    })
    .join('');
  // A `.card` and nothing new: on the board skin a card is paper on steel already, so the column
  // wears the look every other block of this modal wears and the stylesheet gains no token
  // (docs/ui-style.md 1, 11).
  return `<div class="card" data-plan-crew-column><h3>The crew</h3>${rows}</div>`;
}

function jobsTab(state: GameState, assignOpen: string | null): string {
  const plan = workPlan(state);
  // The contract bar of v28 has left this tab: its chips and its button are in Running, on the
  // Contracts tab (PIOTR; CLAUDE.md T20 2.1.5).
  if (plan.rows.length === 0) return crewColumn(state) + emptyLine('No jobs yet. Open the board.');
  const rows = plan.rows
    .map((row) => {
      const job = state.jobs.find((entry) => entry.id === row.jobId);
      if (!job) return '';
      return (
        `<div class="plan-row" data-plan="${row.jobId}">` +
        headHtml(state, job, row, assignOpen) +
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
    crewColumn(state) +
    `<div class="plan">${scaleHtml(plan)}${rows}</div>`
  );
}
