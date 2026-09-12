// The laptop: the design queue and today's office tasks. Everything the owner can start is here
// (CLAUDE.md 10.1).

import {
  callsScheduled,
  callsTaken,
  findJob,
  isWorkingToday,
  joiners,
  jobLabourCost,
  jobProgress,
  jobsAtGate,
  lifecycleSteps,
  openJobs,
  openTasks,
  showsStartProduction,
  staffMinutesLeft,
  startProductionCheck,
  startTaskCheck,
  transportLabel,
  workerById,
} from '../engine/index';
import type { GameState, Job, TaskInstance } from '../engine/index';
import {
  button,
  emptyLine,
  escapeHtml,
  lockedButton,
  minutes,
  money,
  plural,
  primaryButton,
  reasonLabel,
} from './modal';

/** Who has this one, and how much of his day is left (CLAUDE.md T2 3.8). */
function onItLine(state: GameState, task: TaskInstance): string {
  if (task.doneBy === null || task.doneBy === 'owner') return '';
  const worker = workerById(state, task.doneBy);
  if (!worker) return '';
  if (task.done) return `done by ${worker.name}`;
  return `${worker.name} is on it, ${minutes(staffMinutesLeft(worker))} of his day left`;
}

/** The one control a task row carries, wherever the row is drawn. The engine is asked whether the
 *  owner could start this task and the answer is shown: a button he can press, or the reason he
 *  cannot, with the way out of it. A Start that the engine would refuse is never drawn, which is
 *  what left the drawings unable to be drawn (CLAUDE.md T4 3.2). */
export function taskStartAction(state: GameState, task: TaskInstance, startLabel: string): string {
  if (task.done) return '<span class="done">Done</span>';
  if (state.owner.currentTaskId === task.id) return button('pauseTask', 'Pause');
  const check = startTaskCheck(state, task.id);
  if (check.ok) return button('startTask', startLabel, `data-id="${task.id}"`);
  // He is holding something else: he can put it down here, without going to find it.
  const wayOut = check.blockingTaskId === null ? '' : button('pauseTask', 'Put that down');
  return reasonLabel(check.reason) + wayOut;
}

function taskRow(state: GameState, task: TaskInstance): string {
  const running = state.owner.currentTaskId === task.id;
  const staffLine = onItLine(state, task);
  const job = task.jobId === null ? null : findJob(state, task.jobId);
  // The task label already names the job, so the row adds the price and nothing else (T2 3.11).
  const jobLine = job === null ? '' : ` · ${money(job.price)}`;
  const action = taskStartAction(state, task, staffLine === '' ? 'Start' : 'Take it on');
  return (
    `<div class="row${task.done ? ' is-done' : ''}${running ? ' is-running' : ''}">` +
    `<span class="row-main">${escapeHtml(task.label)}${jobLine}</span>` +
    `<span class="row-figure">${minutes(task.minutesRemaining)} left of ` +
    `${minutes(task.minutesTotal)}${staffLine === '' ? '' : ` · ${escapeHtml(staffLine)}`}` +
    '</span>' +
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

/** Plain English for a job stage. The stage id is never printed at the player. */
const STAGE_LABELS: Record<Job['stage'], string> = {
  accepted: 'calls and drawing',
  materialPending: 'material to order',
  materialOrdered: 'material ordered',
  materialInYard: 'material at the gate',
  ready: 'ready for production',
  inProduction: 'in production',
  awaitingTransport: 'awaiting transport',
  completed: 'delivered',
};

/** The five steps of the job, so the card answers "what am I waiting for" at a glance. One
 *  helper, used by every card in the game (CLAUDE.md T3 3.1). */
export function lifecycleRow(state: GameState, job: Job): string {
  const steps = lifecycleSteps(state, job)
    .map((step) => `<span class="step is-${step.state}">${escapeHtml(step.label)}</span>`)
    .join('');
  return `<span class="steps">${steps}</span>`;
}

/** The accent button of a job card: start the work, or get the finished piece away. Start
 *  production is on the card from the day the job is accepted, and when it cannot be pressed it
 *  says what is in the way (CLAUDE.md T3 3.1). */
function jobAction(state: GameState, job: Job): string {
  if (job.stage === 'awaitingTransport') {
    if (job.deliverOnDay !== null) {
      return reasonLabel(`Booked out, leaves day ${job.deliverOnDay}`);
    }
    // The van run is a task on somebody's list, so the piece is booked out either way.
    const inTheVan = state.tasks.some(
      (task) => task.kind === 'deliver' && task.jobId === job.id && !task.done,
    );
    if (inTheVan) return reasonLabel('Booked out, goes in the van');
    return primaryButton('orderTransport', 'Order transport', `data-id="${job.id}"`);
  }
  if (!showsStartProduction(job)) return '';
  const check = startProductionCheck(state, job);
  return check.ok
    ? primaryButton('startProduction', 'Start production', `data-id="${job.id}"`)
    : lockedButton(`Start production, ${check.reason}`, check.reason);
}

/** What the client has rung about, and what rang out (CLAUDE.md T4 3.3). */
export function callsLine(job: Job): string {
  const total = callsScheduled(job);
  if (total === 0) return '';
  const missed = job.callsMissed > 0 ? `, ${job.callsMissed} missed` : '';
  return `<span class="row-figure">Calls: ${callsTaken(job)} of ${total} taken${missed}</span>`;
}

function jobRow(state: GameState, job: Job): string {
  const done = Math.round(jobProgress(job) * 100);
  const waiting = job.blockedBy === '' ? '' : ` · ${job.blockedBy}`;
  const action = jobAction(state, job);
  return (
    `<div class="row"><span class="row-main">${escapeHtml(job.name)} ${money(job.price)}</span>` +
    lifecycleRow(state, job) +
    `<span class="row-figure">${escapeHtml(STAGE_LABELS[job.stage])} \u00b7 due day ` +
    `${job.dueDay}${job.stage === 'inProduction' ? ` \u00b7 ${done}% made` : ''}` +
    `${escapeHtml(waiting)}</span>` +
    `<span class="row-figure">${labourCostLine(state, job)}</span>` +
    callsLine(job) +
    assignControls(state, job) +
    (action === '' ? '' : `<span class="row-action">${action}</span>`) +
    '</div>'
  );
}

/** Everything made and standing in front of the gate (CLAUDE.md T2 3.7). */
function gateSection(state: GameState): string {
  const waiting = jobsAtGate(state);
  if (waiting.length === 0) return emptyLine('Nothing waiting to go out.');
  return (
    `<p class="hint">${escapeHtml(transportLabel(state))}.</p>` +
    waiting
      .map(
        (job) =>
          `<div class="row"><span class="row-main">${escapeHtml(job.name)} ` +
          `${money(job.price)}</span>` +
          lifecycleRow(state, job) +
          `<span class="row-figure">finished day ${job.finishedDay ?? '?'} \u00b7 due day ` +
          `${job.dueDay}</span>` +
          `<span class="row-action">${jobAction(state, job)}</span></div>`,
      )
      .join('')
  );
}

export function renderLaptop(state: GameState): string {
  // Today's desk: everything still open, and what was finished today. Yesterday's is gone. The
  // drawings live in their own place on the desk now (CLAUDE.md T3 3.3).
  const office = state.tasks.filter(
    (task) =>
      task.category !== 'workshop' &&
      task.kind !== 'design' &&
      (!task.done || task.day === state.clock.day),
  );
  const workshop = openTasks(state).filter((task) => task.category === 'workshop');
  const jobLines = openJobs(state)
    .map((job) => jobRow(state, job))
    .join('');
  return (
    '<h3>Office tasks today</h3>' +
    (office.length === 0 ? emptyLine('Nothing on the desk.') : office.map((task) => taskRow(state, task)).join('')) +
    '<h3>Workshop jobs of work</h3>' +
    (workshop.length === 0
      ? emptyLine('Nothing waiting in the hall.')
      : workshop.map((task) => taskRow(state, task)).join('')) +
    `<h3>At the gate, ${plural(jobsAtGate(state).length, 'piece', 'pieces')}</h3>` +
    gateSection(state) +
    '<h3>Jobs on the books</h3>' +
    (jobLines === '' ? emptyLine('No jobs yet. Open the board.') : jobLines)
  );
}
