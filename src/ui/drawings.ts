// The roll of drawings on the desk: the design queue, and nothing else. Design used to sit in the
// laptop, and one thing belongs in one place (CLAUDE.md T3 3.3). The list of finished drawings is
// gone: a drawing that is done is done, and one that is not stays on the queue until it is
// (PIOTR, 16.09; CLAUDE.md T17 2.18).

import { findJob, jobTasks, openJobs, staffMinutesLeft, workerById } from '../engine/index';
import type { GameState, TaskInstance } from '../engine/index';
import { emptyLine, escapeHtml, minutes, money, taskStartAction } from './modal';

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

/** Who has this drawing, and how much of his day is left (CLAUDE.md T2 3.8). In his own words
 *  from v73: `Harry is drawing it`, because "is on it" beside a Start button read as a drawing
 *  waiting for the owner, and a click on it took the drawing off the man who was at it (PIOTR,
 *  03.10: "why is the draftsman not drawing, it waits for me"). */
function onItLine(state: GameState, task: TaskInstance): string {
  if (task.doneBy === null || task.doneBy === 'owner') return '';
  const worker = workerById(state, task.doneBy);
  if (!worker) return '';
  return `${worker.name} is drawing it, ${minutes(staffMinutesLeft(worker))} of his day left`;
}

function designRow(state: GameState, task: TaskInstance): string {
  const running = state.owner.currentTaskId === task.id;
  const started = task.minutesRemaining < task.minutesTotal;
  const staffLine = onItLine(state, task);
  const job = task.jobId === null ? null : findJob(state, task.jobId);
  const jobLine = job === null ? '' : ` · ${money(job.price)}`;
  // A drawing a man of the office has is his: the owner's button on it says what the click does,
  // which is take it over from him (v73).
  const action = taskStartAction(state, task, staffLine !== '' ? 'Take over' : started ? 'Continue' : 'Start');
  return (
    `<div class="row${running ? ' is-running' : ''}">` +
    `<span class="row-main">${escapeHtml(task.label)}${jobLine}</span>` +
    `<span class="row-figure">${minutes(task.minutesRemaining)} left of ` +
    `${minutes(task.minutesTotal)}${staffLine === '' ? '' : ` · ${escapeHtml(staffLine)}`}` +
    '</span>' +
    `<span class="row-action">${action}</span></div>`
  );
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
      : open.map((task) => designRow(state, task)).join(''))
  );
}
