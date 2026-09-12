// The laptop: the design queue and today's office tasks. Everything the owner can start is here
// (CLAUDE.md 10.1).

import {
  findJob,
  isWorkingToday,
  joiners,
  jobLabourCost,
  jobProgress,
  openJobs,
  openTasks,
  ownerIsAvailable,
  softwareActive,
  workerById,
} from '../engine/index';
import type { GameState, Job, TaskInstance } from '../engine/index';
import {
  button,
  emptyLine,
  escapeHtml,
  minutes,
  money,
  reasonLabel,
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
    action = reasonLabel('No software licence');
  } else if (!ownerIsAvailable(state)) {
    action = reasonLabel('The owner is not in today');
  } else {
    action = button('startTask', 'Start', `data-id="${task.id}"`);
  }
  return (
    `<div class="row${task.done ? ' is-done' : ''}${running ? ' is-running' : ''}">` +
    `<span class="row-main">${escapeHtml(task.label)}${jobLine}</span>` +
    `<span class="row-figure">${minutes(task.minutesRemaining)} left of ` +
    `${minutes(task.minutesTotal)}</span>` +
    `<span class="row-action">${action}</span></div>`
  );
}

/** The informational labour cost of a job in progress comes from the engine (CLAUDE.md 8.5). */
function labourCostLine(state: GameState, job: Job): string {
  const { minutes: left, cost } = jobLabourCost(state, job);
  const worker = job.assignedTo === null ? null : workerById(state, job.assignedTo);
  if (!worker) return `${minutes(left)} of your own time left`;
  return `${minutes(left)} of ${escapeHtml(worker.name)}, about ${money(cost)} of wages`;
}

/** Automatic assignment can always be overridden from the job card (CLAUDE.md 9.4). */
function assignControls(state: GameState, job: Job): string {
  if (job.stage !== 'ready' && job.stage !== 'inProduction') return '';
  const chip = (workerId: string, label: string): string =>
    `<button class="chip${job.assignedTo === workerId ? ' is-on' : ''}" data-do="assignJob" ` +
    `data-id="${job.id}" data-worker="${workerId}">${escapeHtml(label)}</button>`;
  const crew = joiners(state)
    .filter((worker) => isWorkingToday(state, worker))
    .map((worker) => chip(worker.id, worker.name))
    .join('');
  return `<span class="row-action">${chip('owner', 'You')}${crew}</span>`;
}

function jobRow(state: GameState, job: Job): string {
  const done = Math.round(jobProgress(job) * 100);
  return (
    `<div class="row"><span class="row-main">${escapeHtml(job.name)} ${money(job.price)}</span>` +
    `<span class="row-figure">${escapeHtml(job.stage)} \u00b7 due day ${job.dueDay}` +
    `${job.stage === 'inProduction' ? ` \u00b7 ${done}% made` : ''}</span>` +
    `<span class="row-figure">${labourCostLine(state, job)}</span>` +
    assignControls(state, job) +
    '</div>'
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
  const jobLines = openJobs(state)
    .map((job) => jobRow(state, job))
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
