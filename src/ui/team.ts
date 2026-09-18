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
  formatCalendarDay,
  hiringOptions,
  houseTierFor,
  ownerDrawPaidInWindow,
  ownerDrawPerDay,
  staffManagementMinutes,
} from '../engine/index';
import type { GameState, HiringOption, Worker, WorkerRole } from '../engine/index';
import {
  DAY_CATEGORY_LABELS,
  HOUSE_TIER_NAMES,
  OWNER_DRAW_TIERS,
  TIER_WORDS,
  WORKING_DAYS_PER_MONTH,
} from '../engine/constants';
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
// Straight off its own module, not round the public API, which Turn 13 froze (REPORT-T13 10).
import { monthlyWageOf } from '../engine/staff';
import { ownerDayLine } from './topbar';
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

/** The tabs, in the order Piotr named them, the Technical one joining in Turn 13 and Our team,
 *  which is the whole roll call and hires nobody, leading them from tonight (CLAUDE.md T17 2.9). */
export type TeamTab = 'ourTeam' | 'workshop' | 'office' | 'technical' | 'management';

const TABS: Array<[TeamTab, string]> = [
  // Everybody on the books, the owner first: who they are, what they cost and what they are on
  // this minute (PIOTR, 16.09; CLAUDE.md T17 2.9).
  ['ourTeam', 'Our team'],
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

/** What a role is called on a crew row: plain English, never the engine key (CLAUDE.md 3). The
 *  one table: Our team, the hiring tiles and the job's Assign list all read it, so a sprayer is
 *  called a sprayer wherever he is drawn (CLAUDE.md T19 2.5, 2.6). */
export const ROLE_WORDS: Record<WorkerRole, string> = {
  joiner: 'joiner',
  helper: 'helper',
  officeAdmin: 'office admin',
  purchasingClerk: 'purchasing clerk',
  salesman: 'salesman',
  draftsman: 'draftsman',
  estimator: 'estimator',
  productionManager: 'production manager',
  sprayer: 'sprayer',
};

/** Which trade a role belongs to. The one table: the hiring tabs and the tiles read it, and a role
 *  that is not on it is not hired from this board at all. Our team is not on it and must not be:
 *  it hires nobody and every role would vanish from its trade (CLAUDE.md T17 2.9). */
const TRADE_OF_ROLE: Record<WorkerRole, TeamTab> = {
  joiner: 'workshop',
  helper: 'workshop',
  officeAdmin: 'office',
  purchasingClerk: 'office',
  salesman: 'office',
  draftsman: 'office',
  estimator: 'technical',
  productionManager: 'management',
  sprayer: 'workshop',
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
  sprayer:
    'The finishing of a lacquered job, which is his trade, and a pair of hands at the bench on ' +
    'anything else. A joiner can spray, slower.',
};

/** What he costs. One unit of pay in the game and it is the week (PIOTR, 18.09;
 *  CLAUDE.md T20 2.6). */
function wageLine(option: HiringOption): string {
  return `${money(option.weeklyWage)} a week`;
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
  return `<span class="row-figure crew-day">Today: ${escapeHtml(text)}</span>`;
}

/** What this man is doing this minute, in the words the board says it in. The one answer: the
 *  crew row and the Our team row both print it (CLAUDE.md T17 2.9). */
export function workerDoing(state: GameState, worker: Worker): string {
  const job = worker.jobId === null ? null : state.jobs.find((entry) => entry.id === worker.jobId);
  const night = shiftOf(state, worker) === 'night';
  if (worker.absentDaysRemaining > 0) {
    return `off for ${plural(worker.absentDaysRemaining, 'more day', 'more days')}`;
  }
  if (worker.startDay > state.clock.day) return `starts ${formatCalendarDay(worker.startDay)}`;
  if (worker.taskId !== null) return 'on a job of work';
  if (job) return `${night ? 'tonight on' : 'on'} ${job.name}`;
  return night ? 'on the night shift, nothing to do yet' : 'free';
}

/** The crew of one trade, as a row each: who he is, what he is doing and what he costs. */
function crewRows(state: GameState, tab: TeamTab): string {
  const rows = state.workers
    .filter((worker) => tradeOf(worker.role) === tab)
    .map((worker) => {
      const doing = workerDoing(state, worker);
      const wage = `${money(worker.weeklyWage)} a week`;
      return (
        `<div class="row" data-crew="${worker.id}" data-shift="${shiftOf(state, worker)}">` +
        `<span class="row-main">${escapeHtml(worker.name)}, ${escapeHtml(ROLE_WORDS[worker.role])}` +
        `${worker.tier === null ? '' : ` (${TIER_WORDS[worker.tier]})`}</span>` +
        `<span class="row-figure">${escapeHtml(doing)}</span>` +
        dayMeterLine(worker) +
        `<span class="row-figure">${escapeHtml(wage)}</span>` +
        shiftChips(state, worker) +
        '</div>'
      );
    })
    .join('');
  return rows;
}

/** The owner has been here since the company's first day: nobody took him on (CLAUDE.md T17 2.9). */
const OWNER_START_DAY = 1;

/** Hours, to a tenth, the way a month of a man's time reads on the page. */
function hoursText(minutesWorked: number): string {
  return `${Math.round(minutesWorked / 6) / 10} h`;
}

/** When he started and how long ago that is, in the days the player counts everything else in. */
function startedText(state: GameState, startDay: number): string {
  const since = state.clock.day - startDay;
  const ago =
    since > 0
      ? `${plural(since, 'day', 'days')} ago`
      : since === 0
        ? 'today'
        : `in ${plural(-since, 'day', 'days')}`;
  return `started ${formatCalendarDay(startDay)}, ${ago}`;
}

/** One row of Our team: who he is, when he started, what he costs a month, the hours he has put
 *  in this month, the days he has had off and what he is on this minute (CLAUDE.md T17 2.9). */
function teamRow(
  id: string,
  name: string,
  role: string,
  when: string,
  pay: number,
  minutesWorked: number,
  daysOff: number,
  doing: string,
): string {
  return (
    `<div class="row" data-team="${id}">` +
    `<span class="row-main">${escapeHtml(name)}, ${escapeHtml(role)}</span>` +
    `<span class="row-figure team-when">${escapeHtml(when)}</span>` +
    `<span class="row-figure">${money(pay)} a month</span>` +
    `<span class="row-figure">${hoursText(minutesWorked)} this month</span>` +
    `<span class="row-figure">${plural(daysOff, 'day off', 'days off')}</span>` +
    `<span class="row-figure">${escapeHtml(doing)}</span>` +
    '</div>'
  );
}

/** Everybody on the books, one row each, the owner first: the roll call Piotr asked for, with no
 *  hiring on it at all (PIOTR, 16.09; CLAUDE.md T17 2.9). The owner has no wage, so his month is
 *  the draw he pays himself on every working day of it. */
function ourTeamRows(state: GameState): string {
  const owner = state.owner;
  const rows = [
    teamRow(
      'owner',
      state.playerName,
      'owner',
      startedText(state, OWNER_START_DAY),
      ownerDrawPerDay(state) * WORKING_DAYS_PER_MONTH,
      owner.monthMinutes,
      owner.monthDaysOff,
      ownerDayLine(state),
    ),
    ...state.workers.map((worker) =>
      teamRow(
        worker.id,
        worker.name,
        `${ROLE_WORDS[worker.role]}${worker.tier === null ? '' : `, ${TIER_WORDS[worker.tier]}`}`,
        startedText(state, worker.startDay),
        monthlyWageOf(worker),
        worker.monthMinutes,
        worker.monthDaysOff,
        workerDoing(state, worker),
      ),
    ),
  ];
  return rows.join('');
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
  // The roll call, and nobody is hired from it (CLAUDE.md T17 2.9).
  if (tab === 'ourTeam') {
    return (
      '<h3>Our team</h3>' +
      '<p class="hint">Everybody on the books, the owner first. The hours and the days off are ' +
      'this month\u0027s.</p>' +
      ourTeamRows(state)
    );
  }
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
