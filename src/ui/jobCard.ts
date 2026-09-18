// One job card, wherever it is drawn: the five step row, what the client has rung about, who is
// on it, and the accent button that starts the work or gets the finished piece away.
//
// The Work Plan board and the laptop's gate list both draw from here, so a job reads the same way
// everywhere in the game (CLAUDE.md T3 3.1, T4 3.1).

import {
  BUILDING_ROLES,
  callsScheduled,
  callsTaken,
  canBuild,
  formatCalendarDay,
  has,
  helpers,
  isOnJob,
  jobLabourCost,
  jobMen,
  jobProgress,
  jobsAtGate,
  leadAssignee,
  lifecycleSteps,
  onTheBooksToday,
  orderForJobCheck,
  orderForJobCost,
  shortfallOf,
  showsStartProduction,
  startProductionCheck,
  transportLabel,
  workerById,
} from '../engine/index';
// Straight off its own module, not round the public API, which Turn 13 froze (REPORT-T13 10).
import { OWNER } from '../engine/machines';
import { ROLE_WORDS } from './team';
import { DROP_PROJECT_REPUTATION } from '../engine/constants';
import type { GameState, Job } from '../engine/index';
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

/** Plain English for a job stage. The stage id is never printed at the player. */
const STAGE_LABELS: Record<Job['stage'], string> = {
  accepted: 'desk work to do',
  materialPending: 'material short',
  materialOrdered: 'material ordered',
  materialInYard: 'material at the gate',
  ready: 'ready for production',
  inProduction: 'in production',
  awaitingTransport: 'awaiting transport',
  completed: 'delivered',
};

/** The five steps of the job, so the card answers "what am I waiting for" at a glance. One
 *  helper, used by every card in the game (CLAUDE.md T3 3.1). */
export function jobLifecycleRow(state: GameState, job: Job): string {
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
export function jobLabourLine(state: GameState, job: Job): string {
  const { minutes: left, cost } = jobLabourCost(state, job);
  const lead = leadAssignee(job);
  const worker = lead === null ? null : workerById(state, lead);
  if (!worker) return `${minutes(left)} of your own time left`;
  return `${minutes(left)} of ${escapeHtml(worker.name)}, about ${money(cost)} of wages`;
}

/** What this man is called on the job's chips and in its list. The owner is You. */
function assigneeName(state: GameState, who: string): string {
  if (who === OWNER) return 'You';
  return workerById(state, who)?.name ?? who;
}

/** The trade under a name in the list: "normal joiner", "poor sprayer", "owner". The tier is his
 *  standing and the role is his trade, so a sprayer is plainly not a joiner (CLAUDE.md T19 2.6).
 *  The mockup's own words for the tiers were "ok" and "good"; the game has said poor, normal and
 *  super since Turn 6 and Our team still does, so one vocabulary is kept and not two. */
function assigneeTrade(state: GameState, who: string): string {
  if (who === OWNER) return 'owner';
  const worker = workerById(state, who);
  if (!worker) return '';
  const trade = ROLE_WORDS[worker.role];
  return worker.tier === null ? trade : `${worker.tier} ${trade}`;
}

/** One row of the Assign list: his name, his trade, and either the one click that puts him on or
 *  the reason he cannot be put on, greyed (PIOTR, 17.09; the mockup of docs/mockups/t19). */
function assignRow(state: GameState, job: Job, who: string, why: string): string {
  const head =
    `<span>${escapeHtml(assigneeName(state, who))} ` +
    `<span class="assign-tier">${escapeHtml(assigneeTrade(state, who))}</span></span>`;
  if (why !== '') {
    return `<div class="assign-row is-busy">${head}` +
      `<span class="assign-why">${escapeHtml(why)}</span></div>`;
  }
  return (
    '<div class="assign-row">' + head +
    `<button class="chip" data-do="assignAdd" data-id="${job.id}" data-worker="${who}">add</button>` +
    '</div>'
  );
}

/** Who the list offers, in the order it draws them: the owner, then the men who build, then the
 *  helpers, who are on it only to be told they do not build (CLAUDE.md T19 2.5). */
function assignCandidates(state: GameState): string[] {
  const crew = state.workers.filter(
    (worker) => onTheBooksToday(state, worker) && BUILDING_ROLES.includes(worker.role),
  );
  const labourers = helpers(state).filter((worker) => onTheBooksToday(state, worker));
  return [OWNER, ...crew.map((worker) => worker.id), ...labourers.map((worker) => worker.id)];
}

/** The people on the job, as chips with a cross apiece, and the one blue button that opens the
 *  list of everybody who could join them. There is no limit on how many go on a job: if the
 *  player wants twenty, he gets twenty and the time shortens (PIOTR, 17.09; CLAUDE.md T19 2.5).
 *  The Turn 17 row of "You | Gary" chips and its Second man line are gone: a chip now says who is
 *  on it and nothing else does. */
export function jobAssignControls(state: GameState, job: Job, open = false): string {
  if (job.stage !== 'ready' && job.stage !== 'inProduction') return '';
  const chips = jobMen(job)
    .map(
      (who) =>
        `<span class="assign-chip">${escapeHtml(assigneeName(state, who))}` +
        `<button class="assign-off" data-do="assignOff" data-id="${job.id}" data-worker="${who}" ` +
        `title="${escapeHtml(`Take ${assigneeName(state, who)} off this job`)}">×</button>` +
        '</span>',
    )
    .join('');
  const nobody = chips === '' ? '<span class="assign-none">Nobody is on it</span>' : '';
  const opener = open
    ? `<button class="btn btn-primary assign-open" data-do="closeAssign" data-id="${job.id}">` +
      'Assign to this job</button>'
    : `<button class="btn btn-primary assign-open" data-do="openAssign" data-id="${job.id}">` +
      'Assign to this job</button>';
  return (
    `<span class="row-action assign-line">${nobody}${chips}${opener}</span>` +
    (open ? assignList(state, job) : '')
  );
}

/** The list the blue button opens: everybody who could stand at this job, with the ones who
 *  cannot greyed and told why (PIOTR, 17.09; CLAUDE.md T19 2.5, 2.6). */
function assignList(state: GameState, job: Job): string {
  const rows = assignCandidates(state)
    .map((who) => {
      if (isOnJob(job, who)) return assignRow(state, job, who, 'already on this job');
      const worker = who === OWNER ? null : workerById(state, who);
      if (worker && !BUILDING_ROLES.includes(worker.role)) {
        return assignRow(state, job, who, 'helpers do not build');
      }
      const other = state.jobs.find((entry) => entry.id !== job.id && isOnJob(entry, who));
      if (other) return assignRow(state, job, who, `on ${other.name}`);
      if (!canBuild(state, who)) return assignRow(state, job, who, 'not in the hall today');
      return assignRow(state, job, who, '');
    })
    .join('');
  return (
    '<div class="assign-list">' +
    `<span class="row-figure">Who goes on ${escapeHtml(job.name)}?</span>${rows}</div>`
  );
}

/** The job's material line: green when its sheets are held from stock, red with the count when
 *  it is short, and the one button that clears a shortfall for this job alone
 *  (CLAUDE.md T13 3.3, 3.6). The per project question is gone. */
export function materialLine(state: GameState, job: Job): string {
  if (job.stage === 'completed' || job.stage === 'awaitingTransport') return '';
  const short = shortfallOf(job);
  const held = job.sheetsReserved + job.sheetsUsed;
  const sheets = plural(job.sheets, 'sheet', 'sheets');
  const figure =
    short > 0
      ? `<span class="row-figure bad shortfall">${short} of ${sheets} short</span>`
      : `<span class="row-figure good sheets-reserved">${held} of ${sheets} in hand</span>`;
  if (short <= 0) return figure;
  const check = orderForJobCheck(state, job);
  const control = check.ok
    ? button('orderForJob', `Order for this job, ${money(orderForJobCost(job))}`, `data-id="${job.id}"`)
    : lockedButton('Order for this job', check.reason);
  return figure + `<span class="row-action">${control}</span>`;
}

/** Dropping the project: the deposit goes back, the job goes off the plan and the company is ten
 *  points of reputation worse off, so it is meant on the second click and inside the card itself
 *  (PIOTR, 13.09; CLAUDE.md T9 3.9). */
export function dropControl(job: Job, confirm: string | null): string {
  if (job.stage === 'completed' || job.stage === 'awaitingTransport') return '';
  if (confirm !== job.id) {
    return (
      '<span class="row-action">' +
      button('dropJob', 'Drop project', `data-id="${job.id}"`) +
      '</span>'
    );
  }
  return (
    '<span class="row-action drop-confirm">' +
    `<span class="reason">${escapeHtml(
      `${money(job.depositPaid)} back to the client, ${DROP_PROJECT_REPUTATION} off the ` +
        'reputation.',
    )}</span>` +
    button('dropJob', 'Confirm drop', `data-id="${job.id}" data-confirm="1"`) +
    '</span>'
  );
}

/** With a CNC in the hall, the player says whether a sheet job goes on the saw while the CNC is
 *  taken or stands and waits for it (CLAUDE.md T7 3.4). */
function cncControls(state: GameState, job: Job): string {
  if (job.stage === 'completed' || job.byHand) return '';
  if (job.materialKind !== 'sheet' || !has(state, 'cnc')) return '';
  const on = job.sawFallback;
  return (
    '<span class="row-action">' +
    `<button class="chip${on ? ' is-on' : ''}" data-do="sawFallback" data-id="${job.id}" ` +
    `data-on="${on ? '0' : '1'}" ` +
    'title="On: the saw and the edgebander do it while the CNC is taken. Off: it waits for the ' +
    'CNC.">Saw when the CNC is busy</button></span>'
  );
}

/** The accent button of a job card: start the work, or get the finished piece away. Start
 *  production is on the card from the day the job is accepted, and when it cannot be pressed it
 *  says what is in the way (CLAUDE.md T3 3.1). */
export function jobAction(state: GameState, job: Job): string {
  if (job.stage === 'awaitingTransport') {
    if (job.deliverOnDay !== null) {
      return reasonLabel(`Booked out, leaves ${formatCalendarDay(job.deliverOnDay)}`);
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
    jobLifecycleRow(state, job) +
    `<span class="row-figure">${escapeHtml(STAGE_LABELS[job.stage])} · due ` +
    `${formatCalendarDay(job.dueDay)}` +
    `${job.stage === 'inProduction' ? ` · ${done}% made` : ''}` +
    `${escapeHtml(waiting)}</span>` +
    `<span class="row-figure">${jobLabourLine(state, job)}</span>` +
    callsLine(job) +
    materialLine(state, job) +
    jobAssignControls(state, job) +
    cncControls(state, job) +
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
          jobLifecycleRow(state, job) +
          `<span class="row-figure">finished ` +
          `${job.finishedDay === null ? '?' : formatCalendarDay(job.finishedDay)} · due ` +
          `${formatCalendarDay(job.dueDay)}</span>` +
          `<span class="row-action">${jobAction(state, job)}</span></div>`,
      )
      .join('')
  );
}
