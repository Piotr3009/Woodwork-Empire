// The Team board: a full page of the game, in tabs by trade, with the candidates as tiles the way
// the shop lays its classes out (PIOTR, 13.09; CLAUDE.md T10 3.6).
//
// Workshop is the men on the floor, with the owner's own card at the top of it: what he pays
// himself, the house it has bought him, and the holiday a production manager lets him take
// (CLAUDE.md T13 3.9, 3.18). Office is the desks, Technical is the estimator, and Management is
// the production manager, who runs the second shift from here (CLAUDE.md T13 3.8, 3.9). The crew
// the company already has is a frame on the roles it holds, with the count, exactly as the Owned
// tab frames a machine, and the floor says how many more it has room for (CLAUDE.md T13 3.10).

import {
  crewLine,
  dayMinutesByCategory,
  hiringOptions,
  houseTierFor,
  ownerDrawPaidInWindow,
  ownerDrawPerDay,
  staffManagementMinutes,
} from '../engine/index';
import type { GameState, HiringOption, Worker, WorkerRole } from '../engine/index';
import { DAY_CATEGORY_LABELS, HOUSE_TIER_NAMES, OWNER_DRAW_TIERS } from '../engine/constants';
import {
  HOLIDAY_OPTIONS_DAYS,
  holidayCheck,
  houseSumFor,
  joineryCoreOffer,
  onHoliday,
  secondShiftCheck,
  secondShiftRuns,
  shiftOf,
  staffManagementTaker,
} from '../engine/index';
import {
  button,
  emptyLine,
  escapeHtml,
  lockedButton,
  minutes,
  money,
  plural,
  reasonLabel,
  tabBar,
  tripLine,
} from './modal';

/** The four tabs, in the order Piotr named them, the Technical one joining in Turn 13. */
export type TeamTab = 'workshop' | 'office' | 'technical' | 'management';

const TABS: Array<[TeamTab, string]> = [
  ['workshop', 'Workshop'],
  ['office', 'Office'],
  // The estimator's tab: in this game the price arrives with the enquiry and this person only
  // makes the list (CLAUDE.md T13 3.8).
  ['technical', 'Technical'],
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
  estimator: 'technical',
  productionManager: 'management',
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
  joiner: 'Production at the bench and at the machines, by day or on the second shift.',
  helper: 'Bag changes, cleaning, unloading, the weekly clean.',
  officeAdmin:
    'Emails, bookkeeping, the consumables and materials chore, and every specialist’s work at ' +
    'double time until he is taken on.',
  purchasingClerk: 'The daily consumables and materials chore, ahead of the office admin.',
  salesman: 'Client calls, and the meeting a big job starts with.',
  draftsman: 'The drawings, at 0.8 of your own speed, in the order the laptop has them.',
  estimator: 'Reads the drawing and counts the sheets: the material take off, so many a day.',
  productionManager:
    'Runs the second shift, assigns the crew, connects the machines, and covers the hall while ' +
    'you are away. He makes nothing.',
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

/** The two chips a joiner carries while the second shift runs: which shift he is on, one click
 *  to move him (CLAUDE.md T13 3.9). Nothing at all while there is no second shift. */
function shiftChips(state: GameState, worker: Worker): string {
  if (worker.role !== 'joiner' || !secondShiftRuns(state)) return '';
  const held = shiftOf(state, worker);
  const chip = (shift: 'day' | 'night', label: string): string =>
    `<button class="chip shift-chip${held === shift ? ' is-on' : ''}" data-do="assignShift" ` +
    `data-id="${worker.id}" data-shift="${shift}">${label}</button>`;
  return `<span class="row-action">${chip('day', 'Day')}${chip('night', 'Night')}</span>`;
}

/** A desk man's own day so far, band by band, for the man who has a day meter of his own: the
 *  production manager's shows the assigning the owner no longer does (CLAUDE.md T13 3.9). */
function dayMeterLine(worker: Worker): string {
  const parts = dayMinutesByCategory(worker.dayLog);
  if (parts.length === 0) return '';
  const text = parts
    .map((part) => `${DAY_CATEGORY_LABELS[part.category]} ${minutes(part.minutes)}`)
    .join(' · ');
  return `<span class="row-figure day-meter">Today: ${escapeHtml(text)}</span>`;
}

/** The crew of one trade, as a row each: who he is, what he is doing and what he costs. */
function crewRows(state: GameState, tab: TeamTab): string {
  const rows = state.workers
    .filter((worker) => tradeOf(worker.role) === tab)
    .map((worker) => {
      const job =
        worker.jobId === null ? null : state.jobs.find((entry) => entry.id === worker.jobId);
      const night = shiftOf(state, worker) === 'night';
      const doing =
        worker.absentDaysRemaining > 0
          ? `off for ${plural(worker.absentDaysRemaining, 'more day', 'more days')}`
          : worker.startDay > state.clock.day
            ? `starts day ${worker.startDay}`
            : worker.taskId !== null
              ? 'on a job of work'
              : job
                ? `${night ? 'tonight on' : 'on'} ${job.name}`
                : night
                  ? 'on the night shift, nothing to do yet'
                  : 'free';
      const wage =
        worker.weeklyWage > 0
          ? `${money(worker.weeklyWage)} a week`
          : `${money(worker.monthlyWage)} a month`;
      const tired = worker.tiredOfOvertime
        ? '<span class="row-figure warn">Tired of overtime</span>'
        : '';
      return (
        `<div class="row" data-crew="${worker.id}" data-shift="${shiftOf(state, worker)}">` +
        `<span class="row-main">${escapeHtml(worker.name)}, ${escapeHtml(worker.role)}` +
        `${worker.tier === null ? '' : ` (${worker.tier})`}</span>` +
        `<span class="row-figure">${escapeHtml(doing)}</span>` +
        tired +
        dayMeterLine(worker) +
        `<span class="row-figure">${escapeHtml(wage)}</span>` +
        shiftChips(state, worker) +
        '</div>'
      );
    })
    .join('');
  return rows;
}

/** The floor's verdict on the crew, on the two tabs that hire onto it (CLAUDE.md T13 3.10). */
function crewLimitLine(state: GameState): string {
  return `<p class="crew-limit">${escapeHtml(crewLine(state))}</p>`;
}

/** The second shift's switch: on and off, or the reason there is none. Without a production
 *  manager there is no second shift button (PIOTR; CLAUDE.md T13 3.9). */
function secondShiftControl(state: GameState): string {
  const check = secondShiftCheck(state);
  if (!check.ok) {
    return (
      '<div class="row shift-control"><span class="row-main">Second shift</span>' +
      `<span class="row-action">${reasonLabel(check.reason)}</span></div>`
    );
  }
  const on = state.shift.second;
  const chip = (wanted: boolean, label: string): string =>
    `<button class="chip shift-chip${on === wanted ? ' is-on' : ''}" data-do="setSecondShift" ` +
    `data-on="${wanted ? '1' : '0'}">${label}</button>`;
  return (
    '<div class="row shift-control"><span class="row-main">Second shift</span>' +
    `<span class="row-figure">${on ? 'runs after the day, at the night rate, the owner gone home' : 'off'}</span>` +
    `<span class="row-action">${chip(true, 'On')}${chip(false, 'Off')}</span></div>`
  );
}

/** What the assigning costs, and whose day it comes off (CLAUDE.md T13 3.9). */
function managementLine(state: GameState): string {
  const management = staffManagementMinutes(state);
  if (management <= 0) return '';
  return staffManagementTaker(state) === 'manager'
    ? `<p class="hint">The production manager assigns the crew: ${minutes(management)} of his day.</p>`
    : `<p class="hint">Managing them costs you ${minutes(management)} a day.</p>`;
}

/** The eight thresholds of the owner's draw, one chip each, the one held marked. No slider and
 *  nothing in between; raising it is a click, and the conflict "machines or me" is the whole
 *  point (PIOTR; CLAUDE.md T13 3.18). */
function drawTiers(state: GameState): string {
  const held = state.ownerDraw.tier;
  const chips = OWNER_DRAW_TIERS.map(
    (draw, index) =>
      `<button class="chip draw-tier${index === held ? ' is-on' : ''}" data-do="setOwnerDraw" ` +
      `data-id="${index}">${money(draw)}</button>`,
  ).join('');
  return `<div class="draw-tiers">${chips}</div>`;
}

/** The holiday: one button a length, or the one reason they are all greyed (CLAUDE.md T13 3.9). */
function holidayControl(state: GameState): string {
  if (onHoliday(state)) {
    const left = state.owner.holidayDaysRemaining;
    return (
      '<div class="holiday"><span class="row-main">Holiday</span>' +
      `<span class="row-figure">On holiday, ${plural(left, 'working day', 'working days')} left, today included.</span></div>`
    );
  }
  const first = HOLIDAY_OPTIONS_DAYS[0] ?? 1;
  const check = holidayCheck(state, first);
  if (!check.ok) {
    return (
      '<div class="holiday"><span class="row-main">Holiday</span>' +
      `<span class="row-action">${lockedButton('Holiday', check.reason)}${reasonLabel(check.reason)}</span></div>`
    );
  }
  const buttons = HOLIDAY_OPTIONS_DAYS.map((days) =>
    button('takeHoliday', plural(days, 'day', 'days'), `data-days="${days}"`),
  ).join('');
  return (
    '<div class="holiday"><span class="row-main">Holiday</span>' +
    '<span class="row-figure">Away with the manager covering the hall; the draw and the rent go on.</span>' +
    `<span class="row-action">${buttons}</span></div>`
  );
}

/** The owner's own card at the top of the floor: his draw, the house it has bought him so far,
 *  and the holiday (CLAUDE.md T13 3.9, 3.18). */
function ownerCard(state: GameState): string {
  const tier = houseTierFor(state);
  const name = HOUSE_TIER_NAMES[tier - 1] ?? '';
  const paid = ownerDrawPaidInWindow(state);
  const next = tier < OWNER_DRAW_TIERS.length ? houseSumFor(tier) : null;
  const nextLine =
    next === null
      ? ''
      : ` The next house wants ${money(next)} paid over thirty days.`;
  return (
    '<div class="tile owner-card" data-owner-card>' +
    '<h3 class="tile-name">You</h3>' +
    `<p class="tile-text">Your draw: ${money(ownerDrawPerDay(state))} a day, paid every working day.</p>` +
    drawTiers(state) +
    `<p class="tile-figures house-tier" data-house-tier="${tier}">Home: tier ${tier} of ${OWNER_DRAW_TIERS.length}, ` +
    `${escapeHtml(name)}. Paid yourself ${money(paid)} in the last thirty days.${escapeHtml(nextLine)}</p>` +
    holidayControl(state) +
    '</div>'
  );
}

/** The Technical tab's software line: Joinery Core and its extensions, bought here beside the
 *  man whose day they lengthen (CLAUDE.md T13 3.8). */
function joineryCoreLines(state: GameState): string {
  const offer = joineryCoreOffer(state);
  const held = offer.held
    ? `On the laptop${offer.extensions > 0 ? `, with ${plural(offer.extensions, 'extension', 'extensions')}` : ''}: ` +
      `${offer.capacity} take offs a day.`
    : `${offer.baseCapacity} a day, ${offer.coreCapacity} with Joinery Core, ` +
      `${offer.extensionJobs} more per extension (${offer.maxExtensions} at most).`;
  const core = offer.core.ok
    ? button('buyJoineryCore', 'Buy Joinery Core')
    : reasonLabel(offer.core.reason);
  const extension = offer.extension.ok
    ? button('buyJoineryCoreExtension', 'Buy an extension')
    : reasonLabel(offer.extension.reason);
  return (
    '<h3>Joinery Core</h3>' +
    `<p class="hint joinery-core">Take offs: ${escapeHtml(held)}</p>` +
    '<div class="row"><span class="row-main">Joinery Core</span>' +
    `<span class="row-figure">${money(offer.yearlyPrice)} a year, charged monthly</span>` +
    `<span class="row-action">${core}</span></div>` +
    '<div class="row"><span class="row-main">Extension</span>' +
    `<span class="row-figure">${money(offer.extensionYearlyPrice)} a year each, charged monthly</span>` +
    `<span class="row-action">${extension}</span></div>`
  );
}

function tabBody(state: GameState, tab: TeamTab): string {
  const options = hiringOptions(state).filter((option) => tradeOf(option.role) === tab);
  const crew = crewRows(state, tab);
  const heading =
    tab === 'workshop'
      ? 'On the floor'
      : tab === 'management'
        ? 'Running it'
        : tab === 'technical'
          ? 'At the drawing'
          : 'At the desks';
  const floor = tab === 'workshop' || tab === 'management';
  return (
    (tab === 'workshop' ? ownerCard(state) : '') +
    `<h3>${heading}</h3>` +
    (floor ? crewLimitLine(state) : '') +
    (crew === '' ? emptyLine('Nobody yet. Every hour is your own hour.') : crew) +
    (floor ? secondShiftControl(state) : '') +
    (tab === 'workshop' || tab === 'management' ? managementLine(state) : '') +
    (tab === 'technical' ? joineryCoreLines(state) : '') +
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
