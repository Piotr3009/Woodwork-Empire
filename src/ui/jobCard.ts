// One job card, wherever it is drawn: the five step row, what the client has rung about, who is
// on it, and the accent button that starts the work or gets the finished piece away.
//
// The Work Plan board and the laptop's gate list both draw from here, so a job reads the same way
// everywhere in the game (CLAUDE.md T3 3.1, T4 3.1).

import {
  callsScheduled,
  callsTaken,
  isWorkingToday,
  jobLabourCost,
  jobProgress,
  jobsAtGate,
  joiners,
  lifecycleSteps,
  showsStartProduction,
  startProductionCheck,
  transportLabel,
  workerById,
} from '../engine/index';
import type { GameState, Job } from '../engine/index';
import {
  emptyLine,
  escapeHtml,
  lockedButton,
  minutes,
  money,
  primaryButton,
  reasonLabel,
} from './modal';

/** Plain English for a job stage. The stage id is never printed at the player. */
const STAGE_LABELS: Record<Job['stage'], string> = {
  accepted: 'drawing to do',
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

/** What the client has rung about, and what rang out (CLAUDE.md T4 3.3). */
export function callsLine(job: Job): string {
  const total = callsScheduled(job);
  if (total === 0) return '';
  const missed = job.callsMissed > 0 ? `, ${job.callsMissed} missed` : '';
  return `<span class="row-figure">Calls: ${callsTaken(job)} of ${total} taken${missed}</span>`;
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

/** The accent button of a job card: start the work, or get the finished piece away. Start
 *  production is on the card from the day the job is accepted, and when it cannot be pressed it
 *  says what is in the way (CLAUDE.md T3 3.1). */
export function jobAction(state: GameState, job: Job): string {
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

export function jobRow(state: GameState, job: Job): string {
  const done = Math.round(jobProgress(job) * 100);
  const waiting = job.blockedBy === '' ? '' : ` · ${job.blockedBy}`;
  const action = jobAction(state, job);
  return (
    `<div class="row"><span class="row-main">${escapeHtml(job.name)} ${money(job.price)}</span>` +
    lifecycleRow(state, job) +
    `<span class="row-figure">${escapeHtml(STAGE_LABELS[job.stage])} · due day ` +
    `${job.dueDay}${job.stage === 'inProduction' ? ` · ${done}% made` : ''}` +
    `${escapeHtml(waiting)}</span>` +
    `<span class="row-figure">${labourCostLine(state, job)}</span>` +
    callsLine(job) +
    assignControls(state, job) +
    (action === '' ? '' : `<span class="row-action">${action}</span>`) +
    '</div>'
  );
}

/** Everything made and standing in front of the gate (CLAUDE.md T2 3.7). */
export function gateSection(state: GameState): string {
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
          `<span class="row-figure">finished day ${job.finishedDay ?? '?'} · due day ` +
          `${job.dueDay}</span>` +
          `<span class="row-action">${jobAction(state, job)}</span></div>`,
      )
      .join('')
  );
}
