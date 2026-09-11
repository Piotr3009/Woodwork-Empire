// The laptop: the design queue and today's office tasks. Everything the owner can start is here
// (CLAUDE.md 10.1).

import { findJob, minutesRemainingFor, openTasks, softwareActive } from '../engine/index';
import type { GameState, TaskInstance } from '../engine/index';
import {
  button,
  disabledButton,
  emptyLine,
  escapeHtml,
  minutes,
  money,
  primaryButton,
} from './modal';

function taskRow(state: GameState, task: TaskInstance): string {
  const running = state.owner.currentTaskId === task.id;
  const staff = task.doneBy !== null && task.doneBy !== 'owner';
  const job = task.jobId === null ? null : findJob(state, task.jobId);
  const jobLine = job === null ? '' : ` · ${escapeHtml(job.name)} ${money(job.price)}`;
  let action: string;
  if (task.done) {
    action = `<span class="done">Done${staff ? ' by the office' : ''}</span>`;
  } else if (running) {
    action = button('pauseTask', 'Pause');
  } else if (task.kind === 'design' && !softwareActive(state)) {
    action = disabledButton('Start', 'No software licence');
  } else if (!state.owner.present || state.owner.wentHome) {
    action = disabledButton('Start', 'The owner is not in today');
  } else {
    action = primaryButton('startTask', 'Start', `data-id="${task.id}"`);
  }
  return (
    `<div class="row${task.done ? ' is-done' : ''}${running ? ' is-running' : ''}">` +
    `<span class="row-main">${escapeHtml(task.label)}${jobLine}</span>` +
    `<span class="row-figure">${minutes(task.minutesRemaining)} left of ` +
    `${minutes(task.minutesTotal)}</span>` +
    `<span class="row-action">${action}</span></div>`
  );
}

export function renderLaptop(state: GameState): string {
  const open = state.tasks.filter((task) => task.category !== 'workshop');
  const design = open.filter((task) => task.kind === 'design');
  const office = open.filter((task) => task.kind !== 'design');
  const workshop = openTasks(state).filter((task) => task.category === 'workshop');
  const licence =
    state.software.mode === 'none'
      ? 'No licence. Buy management software from the catalogue.'
      : state.software.mode === 'oneOff'
        ? `One off licence, ${state.software.jobsRemaining} jobs left, ${state.software.tier} tier`
        : `Subscription, ${state.software.tier} tier`;
  const jobLines = state.jobs
    .filter((job) => job.stage !== 'completed')
    .map(
      (job) =>
        `<div class="row"><span class="row-main">${escapeHtml(job.name)} ` +
        `${money(job.price)}</span>` +
        `<span class="row-figure">${escapeHtml(job.stage)} · due day ${job.dueDay}</span>` +
        `<span class="row-figure">${minutes(minutesRemainingFor(job, 1))} of bench work</span>` +
        '</div>',
    )
    .join('');
  return (
    `<p class="hint">${escapeHtml(licence)}</p>` +
    '<h3>Design queue</h3>' +
    (design.length === 0 ? emptyLine('No drawings waiting.') : design.map((task) => taskRow(state, task)).join('')) +
    '<h3>Office tasks today</h3>' +
    (office.length === 0 ? emptyLine('Nothing on the desk.') : office.map((task) => taskRow(state, task)).join('')) +
    '<h3>Workshop jobs of work</h3>' +
    (workshop.length === 0
      ? emptyLine('Nothing waiting in the hall.')
      : workshop.map((task) => taskRow(state, task)).join('')) +
    '<h3>Jobs on the books</h3>' +
    (jobLines === '' ? emptyLine('No jobs yet. Open the board.') : jobLines)
  );
}
