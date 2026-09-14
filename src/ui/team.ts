// The Team board: a full page of the game, in tabs by trade, with the candidates as tiles the way
// the shop lays its classes out (PIOTR, 13.09; CLAUDE.md T10 3.6).
//
// Workshop is the men on the floor, Office is the desks, and Management is empty until there is
// a chief executive to put in it. The crew the company already has is a frame on the roles it
// holds, with the count, exactly as the Owned tab frames a machine.

import { hiringOptions, staffManagementMinutes } from '../engine/index';
import type { GameState, HiringOption, Worker, WorkerRole } from '../engine/index';
import {
  button,
  emptyLine,
  escapeHtml,
  minutes,
  money,
  plural,
  reasonLabel,
  tabBar,
  tripLine,
} from './modal';

/** The three tabs, in the order Piotr named them. */
export type TeamTab = 'workshop' | 'office' | 'management';

const TABS: Array<[TeamTab, string]> = [
  ['workshop', 'Workshop'],
  ['office', 'Office'],
  ['management', 'Management'],
];

export function teamTabFrom(value: string): TeamTab {
  const found = TABS.find(([tab]) => tab === value);
  return found ? found[0] : 'workshop';
}

/** Which trade a role belongs to. The one table: the tabs and the tiles read it, and a role that
 *  is not on it is not hired from this board at all. */
const TRADE_OF_ROLE: Record<WorkerRole, TeamTab> = {
  joiner: 'workshop',
  helper: 'workshop',
  officeAdmin: 'office',
  purchasingClerk: 'office',
  salesman: 'office',
  draftsman: 'office',
};

export function tradeOf(role: WorkerRole): TeamTab {
  return TRADE_OF_ROLE[role];
}

/** The men the company already has in this role and class, and what they are called. */
function heldBy(state: GameState, option: HiringOption): Worker[] {
  return state.workers.filter(
    (worker) => worker.role === option.role && worker.tier === option.tier,
  );
}

/** What a man of this role does with his day, in the words the board says it in. */
const DUTIES: Record<WorkerRole, string> = {
  joiner: 'Production at the bench and at the machines.',
  helper: 'Bag changes, cleaning, unloading, the weekly clean.',
  officeAdmin:
    'Emails, bookkeeping, the daily ordering, and every specialist’s work at double time ' +
    'until he is taken on.',
  purchasingClerk: 'Per job material orders, about sixteen a day.',
  salesman: 'Client calls, and the meeting a big job starts with.',
  draftsman: 'The drawings, at 0.8 of your own speed, in the order the laptop has them.',
};

function wageLine(option: HiringOption): string {
  return option.weeklyWage > 0
    ? `${money(option.weeklyWage)} a week`
    : `${money(option.monthlyWage)} a month`;
}

/** One candidate, as a tile: what he is, what he costs, what he is worth and what stands in the
 *  way of taking him on (CLAUDE.md T10 3.6). */
function candidateTile(state: GameState, option: HiringOption): string {
  const held = heldBy(state, option);
  const owned =
    held.length === 0
      ? ''
      : `<span class="badge badge-owned">On the books${
          held.length > 1 ? ` × ${held.length}` : ''
        }</span>`;
  const figures = [
    wageLine(option),
    option.rate > 0 ? `${(option.rate * 100).toFixed(0)}% of your speed` : '',
    `Available from reputation ${option.minReputation}`,
  ]
    .filter((line) => line !== '')
    .map((line) => `<p class="tile-figures">${escapeHtml(line)}</p>`)
    .join('');
  const missing =
    option.missing.length === 0
      ? ''
      : `<p class="lock">To make this hire possible: ${escapeHtml(option.missing.join(', '))}` +
        ` · ${money(option.missingCost)}</p>`;
  // One click is one interview: the hour is the owner's and the man is on the books when it is
  // over (CLAUDE.md T7 3.10).
  const action = option.available
    ? button('hire', 'Hire', `data-role="${option.role}" data-tier="${option.tier ?? ''}"`)
    : reasonLabel(option.blockReason);
  return (
    `<div class="tile${option.available ? '' : ' is-locked'}${owned === '' ? '' : ' is-owned'}" ` +
    `data-candidate="${option.role}.${option.tier ?? ''}">` +
    `<h3 class="tile-name">${escapeHtml(option.label)} ${owned}</h3>` +
    `<p class="tile-text">${escapeHtml(DUTIES[option.role])}</p>` +
    figures +
    (option.available ? '' : `<p class="lock">${escapeHtml(option.blockReason)}</p>`) +
    missing +
    `<div class="tile-action">${action}</div>` +
    '</div>'
  );
}

/** The crew of one trade, as a row each: who he is, what he is doing and what he costs. */
function crewRows(state: GameState, tab: TeamTab): string {
  const rows = state.workers
    .filter((worker) => tradeOf(worker.role) === tab)
    .map((worker) => {
      const job =
        worker.jobId === null ? null : state.jobs.find((entry) => entry.id === worker.jobId);
      const doing =
        worker.absentDaysRemaining > 0
          ? `off for ${plural(worker.absentDaysRemaining, 'more day', 'more days')}`
          : worker.startDay > state.clock.day
            ? `starts day ${worker.startDay}`
            : worker.taskId !== null
              ? 'on a job of work'
              : job
                ? `on ${job.name}`
                : 'free';
      const wage =
        worker.weeklyWage > 0
          ? `${money(worker.weeklyWage)} a week`
          : `${money(worker.monthlyWage)} a month`;
      const tired = worker.tiredOfOvertime
        ? '<span class="row-figure warn">Tired of overtime</span>'
        : '';
      return (
        `<div class="row" data-crew="${worker.id}">` +
        `<span class="row-main">${escapeHtml(worker.name)}, ${escapeHtml(worker.role)}` +
        `${worker.tier === null ? '' : ` (${worker.tier})`}</span>` +
        `<span class="row-figure">${escapeHtml(doing)}</span>` +
        tired +
        `<span class="row-figure">${escapeHtml(wage)}</span></div>`
      );
    })
    .join('');
  return rows;
}

function tabBody(state: GameState, tab: TeamTab): string {
  if (tab === 'management') {
    // The chief executive is parked (CLAUDE.md T10 5.2).
    return emptyLine('Nothing here yet.');
  }
  const options = hiringOptions(state).filter((option) => tradeOf(option.role) === tab);
  const crew = crewRows(state, tab);
  const management = tab === 'workshop' ? staffManagementMinutes(state) : 0;
  return (
    `<h3>${tab === 'workshop' ? 'On the floor' : 'At the desks'}</h3>` +
    (crew === '' ? emptyLine('Nobody yet. Every hour is your own hour.') : crew) +
    (management > 0
      ? `<p class="hint">Managing them costs you ${minutes(management)} a day.</p>`
      : '') +
    '<h3>Taking somebody on</h3>' +
    `<div class="tile-grid">${options.map((option) => candidateTile(state, option)).join('')}</div>`
  );
}

export function renderTeam(state: GameState, tab: TeamTab): string {
  return (
    // The interview he is sitting in, and that the man is not on the books until it is over
    // (CLAUDE.md T7 3.10).
    tripLine(state) + tabBar('teamTab', TABS, tab) + tabBody(state, tab)
  );
}
