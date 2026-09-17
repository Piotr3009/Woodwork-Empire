// The laptop on the office desk is a computer (PIOTR, 15.09; CLAUDE.md T14 2.1): a home screen of
// tiles behind a bezel, in the system font on a cool background, and nothing of paper inside it.
// Home is three big tiles, Tasks, Stock and Drawings in that order, each with a live line the
// engine counts and a red count in its corner while there is something to do, and under a rule
// the Office group of small tiles with their icons: Team, Website, Insurance, Security, Joinery
// Core, Settings. A tile opens its page full screen inside the laptop with a back arrow to home
// in the same place on every page; the tiles are the whole of the navigation, and there is no
// tab bar (CLAUDE.md T15 2.3).
//
// The pages are the ones Turn 13 left: the tasks list, the stock page in the style of Joinery
// Core, the drawings, the three Admin pages, and from tonight the Team, which was the one page
// still outside the screen (PIOTR, 16.09: "we are in the laptop, so it does not match").

import {
  TAKE_OFF_BUTTON_LABEL,
  findJob,
  formatDate,
  jobsAtGate,
  laptopHome,
  openTasks,
  startTaskCheck,
  staffMinutesLeft,
  workerById,
} from '../engine/index';
import type { GameState, LaptopHome, TaskInstance } from '../engine/index';
import { renderDrawings } from './drawings';
import { renderInsurance } from './insurance';
import { gateSection } from './jobCard';
import { renderMaterials } from './materials';
import { renderSecurity } from './security';
import { type TeamTab, renderTeam } from './team';
import { renderWebsite } from './website';
import {
  button,
  emptyLine,
  escapeHtml,
  lockedButton,
  minutes,
  money,
  plural,
  taskStartAction,
} from './modal';

/** The pages the screen shows: home, the three behind the big tiles, the Team and the three
 *  Admin pages behind their small tiles (CLAUDE.md T14 2.1, T15 2.3). Home is the default, every
 *  time it opens. */
export type LaptopPage =
  | 'home'
  | 'tasks'
  | 'stock'
  | 'drawings'
  | 'team'
  | 'website'
  | 'insurance'
  | 'security';

const PAGES: readonly LaptopPage[] = [
  'home',
  'tasks',
  'stock',
  'drawings',
  'team',
  'website',
  'insurance',
  'security',
];

export function laptopPageFrom(value: string): LaptopPage {
  return PAGES.find((page) => page === value) ?? 'home';
}

/** The three big tiles and the pages behind them. */
type HomePage = 'tasks' | 'stock' | 'drawings';

/** The order is the contract: Tasks, Stock, Drawings, left to right (CLAUDE.md T14 1). The count
 *  is the field of `laptopHome` the red corner shows while it is above zero (CLAUDE.md T15 2.3). */
export const HOME_TILES: ReadonlyArray<{ page: HomePage; label: string; count: keyof LaptopHome }> = [
  { page: 'tasks', label: 'Tasks', count: 'tasksOpen' },
  { page: 'stock', label: 'Stock', count: 'lowLines' },
  { page: 'drawings', label: 'Drawings', count: 'drawingsWaiting' },
];

/** The Office group, in the order the brief names it: the Team and the three Admin pages open
 *  inside the laptop; Joinery Core is the software line on the Team's Technical tab (REPORT-T13
 *  T13-B2a), so it opens that page on that tab; Settings is the top bar's gear and stays a modal
 *  of its own (CLAUDE.md T14 2.1, T15 2.3). */
export const OFFICE_GROUP: ReadonlyArray<{
  id: string;
  label: string;
  action: string;
  extra: string;
}> = [
  { id: 'team', label: 'Team', action: 'laptopPage', extra: 'data-id="team"' },
  { id: 'website', label: 'Website', action: 'laptopPage', extra: 'data-id="website"' },
  { id: 'insurance', label: 'Insurance', action: 'laptopPage', extra: 'data-id="insurance"' },
  { id: 'security', label: 'Security', action: 'laptopPage', extra: 'data-id="security"' },
  { id: 'joineryCore', label: 'Joinery Core', action: 'teamTab', extra: 'data-id="technical"' },
  { id: 'settings', label: 'Settings', action: 'openSettings', extra: '' },
];

/** What a page is called in its header, off the two tile tables and nowhere else. */
const PAGE_TITLES: Record<Exclude<LaptopPage, 'home'>, string> = {
  tasks: 'Tasks',
  stock: 'Stock',
  drawings: 'Drawings',
  team: 'Team',
  website: 'Website',
  insurance: 'Insurance',
  security: 'Security',
};

function icon(paths: string): string {
  return (
    '<svg class="screen-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" ' +
    'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    `${paths}</svg>`
  );
}

/** The flat line icons of the three tiles, from the mockup: a list, a rack, a drawing. Inline,
 *  drawn in the tile's own colour of ink, which the stylesheet makes white. */
const ICONS: Record<HomePage, string> = {
  tasks: icon('<path d="M4 6h2M10 6h10M4 12h2M10 12h10M4 18h2M10 18h10" />'),
  stock: icon('<path d="M4 3v18M20 3v18M4 9h16M4 15h16M4 21h16M7 6h10v3H7zM7 12h10v3H7z" />'),
  drawings: icon('<path d="M5 3h10l4 4v14H5z M15 3v4h4 M8 11h8v6H8z M8 11l8 6" />'),
};

/** The line icons of the six Office tiles, from mockup C: people, a globe, a shield, a lock, a
 *  monitor and a gear, in the game's green above the label (CLAUDE.md T15 2.3). */
const OFFICE_ICONS: Record<string, string> = {
  team: icon(
    '<circle cx="9" cy="8" r="3.5" /><circle cx="17" cy="9" r="2.5" />' +
      '<path d="M3 20c0-4 3-6 6-6s6 2 6 6M15 20c0-3 1.5-4.5 4-4.5s3 1.5 3 4.5" />',
  ),
  website: icon(
    '<circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c3 3 3 14 0 17M12 3.5c-3 3-3 14 0 17" />',
  ),
  insurance: icon(
    '<path d="M12 3l8 3v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z" /><path d="M8.5 12l2.5 2.5 4.5-5" />',
  ),
  security: icon(
    '<rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 018 0v3" />' +
      '<circle cx="12" cy="15.5" r="1.5" />',
  ),
  joineryCore: icon('<rect x="3" y="5" width="18" height="12" rx="2" /><path d="M7 20h10M12 17v3M6 9h12M6 13h7" />'),
  settings: icon(
    '<circle cx="12" cy="12" r="3" />' +
      '<path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />',
  ),
};

/** Who has this one, and how much of his day is left (CLAUDE.md T2 3.8). */
function onItLine(state: GameState, task: TaskInstance): string {
  if (task.doneBy === null || task.doneBy === 'owner') return '';
  const worker = workerById(state, task.doneBy);
  if (!worker) return '';
  if (task.done) return `done by ${worker.name}`;
  return `${worker.name} is on it, ${minutes(staffMinutesLeft(worker))} of his day left`;
}

/** The tick on a row: the player ticks several and presses Do these, and they are done one after
 *  another in the order he ticked them (PIOTR, 16.09; CLAUDE.md T17 2.16). Only on a row the owner
 *  could start himself: a tick on a job of work he cannot take on would tick nothing. */
function tickBox(state: GameState, task: TaskInstance, ticked: readonly string[]): string {
  if (task.done || !startTaskCheck(state, task.id).ok) return '';
  return (
    `<input type="checkbox" class="row-tick" data-do="tickTask" data-id="${task.id}"` +
    `${ticked.includes(task.id) ? ' checked' : ''} aria-label="Do this one too" />`
  );
}

function taskRow(state: GameState, task: TaskInstance, ticked: readonly string[] = []): string {
  const running = state.owner.currentTaskId === task.id;
  const staffLine = onItLine(state, task);
  const job = task.jobId === null ? null : findJob(state, task.jobId);
  // The task label already names the job, so the row adds the price and nothing else (T2 3.11).
  const jobLine = job === null ? '' : ` · ${money(job.price)}`;
  // The take off's button says what the click makes (PIOTR; CLAUDE.md T13 3.8).
  const startLabel =
    task.kind === 'materialTakeOff'
      ? TAKE_OFF_BUTTON_LABEL
      : staffLine === ''
        ? 'Start'
        : 'Take it on';
  const action = taskStartAction(state, task, startLabel);
  return (
    `<div class="row${task.done ? ' is-done' : ''}${running ? ' is-running' : ''}" ` +
    `data-task="${task.id}">` +
    `<span class="row-main">${tickBox(state, task, ticked)}${escapeHtml(task.label)}${jobLine}</span>` +
    `<span class="row-figure">${minutes(task.minutesRemaining)} left of ` +
    `${minutes(task.minutesTotal)}${staffLine === '' ? '' : ` · ${escapeHtml(staffLine)}`}` +
    '</span>' +
    `<span class="row-action">${action}</span></div>`
  );
}

/** The one button over the list: what is ticked, done one after another in the order it was
 *  ticked (CLAUDE.md T17 2.16). It is greyed until something is ticked, and says how many. */
function doTheseControl(state: GameState, ticked: readonly string[]): string {
  const live = ticked.filter((id) => startTaskCheck(state, id).ok);
  const queued = state.taskQueue.filter((id) => {
    const task = state.tasks.find((entry) => entry.id === id);
    return task !== undefined && !task.done;
  });
  const queueLine =
    queued.length > 0
      ? `<span class="row-figure">${plural(queued.length, 'job of work', 'jobs of work')} queued</span>`
      : '';
  return (
    '<div class="tasks-do">' +
    (live.length === 0
      ? lockedButton('Do these', 'Tick the ones you want doing')
      : button('doTheseTasks', `Do these ${live.length}`)) +
    queueLine +
    '</div>'
  );
}

/** Today's desk: everything still open, and what was finished today. Yesterday's is gone. */
function tasksPage(state: GameState, ticked: readonly string[]): string {
  const office = state.tasks.filter(
    (task) =>
      task.category !== 'workshop' &&
      task.kind !== 'design' &&
      (!task.done || task.day === state.clock.day),
  );
  const workshop = openTasks(state).filter((task) => task.category === 'workshop');
  return (
    '<h3>Office tasks today</h3>' +
    doTheseControl(state, ticked) +
    (office.length === 0
      ? emptyLine('Nothing on the desk.')
      : office.map((task) => taskRow(state, task, ticked)).join('')) +
    '<h3>Workshop jobs of work</h3>' +
    (workshop.length === 0
      ? emptyLine('Nothing waiting in the hall.')
      : workshop.map((task) => taskRow(state, task, ticked)).join('')) +
    `<h3>At the gate, ${plural(jobsAtGate(state).length, 'piece', 'pieces')}</h3>` +
    gateSection(state)
  );
}

/** The small line under Tasks: "3 open, 1 due today". */
function tasksLine(home: LaptopHome): string {
  return `${home.tasksOpen} open, ${home.tasksDueToday} due today`;
}

/** The small line under Stock: "46 sheets free, 2 low", the low count in the game's red while
 *  it is above zero, "all stocked" when it is not (CLAUDE.md T14 2.1). */
function stockLine(home: LaptopHome): string {
  const low =
    home.lowLines > 0 ? `<span class="bad">${home.lowLines} low</span>` : 'all stocked';
  return `${plural(home.sheetsFree, 'sheet', 'sheets')} free, ${low}`;
}

/** The small line under Drawings: "2 waiting for a list", or "nothing waiting". */
function drawingsLine(home: LaptopHome): string {
  if (home.drawingsWaiting === 0) return 'nothing waiting';
  return `${home.drawingsWaiting} waiting for a list`;
}

/** The red round count in the top right corner of a big tile, while there is something to do.
 *  At zero there is no element at all, not a hidden one (CLAUDE.md T15 2.3). */
function countBadge(page: HomePage, count: number): string {
  if (count === 0) return '';
  return `<span class="screen-tile-count" data-count="${page}">${count}</span>`;
}

/** Home: the company and the game's clock in one small line, the three big tiles, and the Office
 *  group under a rule. Every figure on it is the engine's (CLAUDE.md T14 2.1, T15 2.3). */
function homeScreen(state: GameState): string {
  const home = laptopHome(state);
  const lines: Record<HomePage, string> = {
    tasks: tasksLine(home),
    stock: stockLine(home),
    drawings: drawingsLine(home),
  };
  const tiles = HOME_TILES.map(
    (tile) =>
      `<button class="screen-tile screen-tile-${tile.page}" data-do="laptopPage" ` +
      `data-id="${tile.page}" data-tile="${tile.page}">` +
      countBadge(tile.page, home[tile.count]) +
      ICONS[tile.page] +
      `<span class="screen-tile-big">${tile.label}</span>` +
      `<span class="screen-tile-small" data-line="${tile.page}">${lines[tile.page]}</span>` +
      '</button>',
  ).join('');
  const office = OFFICE_GROUP.map(
    (tile) =>
      `<button class="screen-small-tile" data-do="${tile.action}"` +
      `${tile.extra === '' ? '' : ` ${tile.extra}`} data-tile="${tile.id}">` +
      (OFFICE_ICONS[tile.id] ?? '') +
      `<span class="screen-small-label">${escapeHtml(tile.label)}</span></button>`,
  ).join('');
  return (
    '<p class="screen-status">' +
    `<span class="screen-company">${escapeHtml(state.companyName)}</span>, ` +
    `<span class="screen-clock">${escapeHtml(formatDate(state.clock))}</span></p>` +
    `<div class="screen-tiles">${tiles}</div>` +
    '<hr class="screen-rule" />' +
    '<h3 class="screen-group">Office</h3>' +
    `<div class="screen-small-tiles">${office}</div>`
  );
}

/** The back arrow at the top left of every page: a glyph, not a dash (CLAUDE.md T14 2.1). */
const BACK_HOME =
  '<button class="screen-back" data-do="laptopPage" data-id="home" data-tile="home">' +
  '← Home</button>';

/** The header of every page but home: the back arrow first, in the same place on every page, and
 *  the page's name (CLAUDE.md T15 2.3). */
function pageHead(page: Exclude<LaptopPage, 'home'>): string {
  return (
    `<header class="screen-page-head">${BACK_HOME}` +
    `<h2 class="screen-page-title">${PAGE_TITLES[page]}</h2></header>`
  );
}

export interface LaptopView {
  page: LaptopPage;
  /** What the player has typed into the sheet count on the Stock page. Read by nothing since
   *  Turn 13 (REPORT-T13 section 10); the page has no free form order any more. */
  stockSheets: string;
  /** Which of the Team's tabs is on top (CLAUDE.md T10 3.6, T15 2.3, T17 2.9). */
  teamTab: TeamTab;
  /** The tasks the player has ticked on the Tasks page, in the order he ticked them, waiting for
   *  Do these (CLAUDE.md T17 2.16). */
  tickedTasks: readonly string[];
}

/** A page behind a tile, as Turn 13 left it: the screen skin is all it inherits (T14 2.1). */
function pageBody(state: GameState, page: Exclude<LaptopPage, 'home'>, view: LaptopView): string {
  switch (page) {
    case 'tasks':
      return tasksPage(state, view.tickedTasks);
    case 'stock':
      return renderMaterials(state, view.stockSheets);
    case 'drawings':
      return renderDrawings(state);
    case 'team':
      return renderTeam(state, view.teamTab);
    case 'website':
      return renderWebsite(state);
    case 'insurance':
      return renderInsurance(state);
    case 'security':
      return renderSecurity(state);
  }
}

export function renderLaptop(state: GameState, view: LaptopView): string {
  const inside =
    view.page === 'home'
      ? homeScreen(state)
      : pageHead(view.page) + pageBody(state, view.page, view);
  return `<div class="laptop-screen" data-laptop-page="${view.page}">${inside}</div>`;
}
