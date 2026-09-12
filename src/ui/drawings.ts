// The roll of drawings on the desk: the design queue and what has already been drawn. Design used
// to sit in the laptop, and one thing belongs in one place (CLAUDE.md T3 3.3).

import { findJob, jobTasks, openJobs, staffMinutesLeft, workerById } from '../engine/index';
import type { GameState, TaskInstance } from '../engine/index';
import { taskStartAction } from './laptop';
import { emptyLine, escapeHtml, minutes, money } from './modal';

/** What the workshop is licensed to draw with, in words (CLAUDE.md 9.2). */
export function licenceLine(state: GameState): string {
  if (state.software.mode === 'none') {
    return 'No licence. Buy management software from the catalogue.';
  }
  if (state.software.mode === 'oneOff') {
    return `One off licence, ${state.software.jobsRemaining} jobs left, ${state.software.tier} tier`;
  }
  return `Subscription, ${state.software.tier} tier`;
}

/** Who has this drawing, and how much of his day is left (CLAUDE.md T2 3.8). */
function onItLine(state: GameState, task: TaskInstance): string {
  if (task.doneBy === null || task.doneBy === 'owner') return '';
  const worker = workerById(state, task.doneBy);
  if (!worker) return '';
  return `${worker.name} is on it, ${minutes(staffMinutesLeft(worker))} of his day left`;
}

function designRow(state: GameState, task: TaskInstance): string {
  const running = state.owner.currentTaskId === task.id;
  const started = task.minutesRemaining < task.minutesTotal;
  const staffLine = onItLine(state, task);
  const job = task.jobId === null ? null : findJob(state, task.jobId);
  const jobLine = job === null ? '' : ` · ${money(job.price)}`;
  const action = taskStartAction(state, task, started ? 'Continue' : 'Start');
  return (
    `<div class="row${running ? ' is-running' : ''}">` +
    `<span class="row-main">${escapeHtml(task.label)}${jobLine}</span>` +
    `<span class="row-figure">${minutes(task.minutesRemaining)} left of ` +
    `${minutes(task.minutesTotal)}${staffLine === '' ? '' : ` · ${escapeHtml(staffLine)}`}` +
    '</span>' +
    `<span class="row-action">${action}</span></div>`
  );
}

/** Every drawing that is finished, with the day it was finished on. */
function finishedRows(state: GameState): string {
  const rows = state.jobs
    .flatMap((job) =>
      jobTasks(state, job.id)
        .filter((task) => task.kind === 'design' && task.done)
        .map((task) => ({ job, task })),
    )
    .sort((left, right) => (right.task.doneDay ?? 0) - (left.task.doneDay ?? 0));
  if (rows.length === 0) return emptyLine('Nothing drawn yet.');
  return rows
    .map(
      ({ job, task }) =>
        `<div class="row is-done"><span class="row-main">${escapeHtml(job.name)} ` +
        `${money(job.price)}</span>` +
        `<span class="row-figure">drawn on day ${task.doneDay ?? job.acceptedDay}</span></div>`,
    )
    .join('');
}

export function renderDrawings(state: GameState): string {
  const open = openJobs(state)
    .flatMap((job) => jobTasks(state, job.id))
    .filter((task) => task.kind === 'design' && !task.done);
  return (
    `<p class="hint">${escapeHtml(licenceLine(state))}</p>` +
    '<h3>Design queue</h3>' +
    (open.length === 0
      ? emptyLine('No drawings waiting.')
      : open.map((task) => designRow(state, task)).join('')) +
    '<h3>Finished drawings</h3>' +
    finishedRows(state)
  );
}
