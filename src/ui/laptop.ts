// The laptop on the office desk is a computer (PIOTR, 15.09; CLAUDE.md T14 2.1): a home screen of
// tiles behind a bezel, in the system font on a cool background, and nothing of paper inside it.
// Home is three big tiles, Tasks, Stock and Drawings in that order, each with a live line the
// engine counts, and under a rule the Office group of small tiles: Team, Website, Insurance,
// Security, Joinery Core, Settings. A big tile opens its page full screen inside the laptop with
// a back arrow to home; the tiles are the whole of the navigation, and there is no tab bar.
//
// The pages are the ones Turn 13 left: the tasks list, the stock page in the style of Joinery
// Core, the drawings, and the three Admin pages, which Turn 13 built as tabs of this laptop and
// which the small tiles open here on their own page (CLAUDE.md T14 2.1, T13 3.7, 3.15, 3.17).

import {
  TAKE_OFF_BUTTON_LABEL,
  findJob,
  formatDate,
  jobsAtGate,
  laptopHome,
  openTasks,
  staffMinutesLeft,
  workerById,
} from '../engine/index';
import type { GameState, LaptopHome, TaskInstance } from '../engine/index';
import { renderDrawings } from './drawings';
import { renderInsurance } from './insurance';
import { gateSection } from './jobCard';
import { renderMaterials } from './materials';
import { renderSecurity } from './security';
import { renderWebsite } from './website';
import { emptyLine, escapeHtml, minutes, money, plural, taskStartAction } from './modal';

/** The pages the screen shows: home, the three behind the big tiles, and the three Admin pages
 *  behind their small tiles (CLAUDE.md T14 2.1). Home is the default, every time it opens. */
export type LaptopPage =
  | 'home'
  | 'tasks'
  | 'stock'
  | 'drawings'
  | 'website'
  | 'insurance'
  | 'security';

const PAGES: readonly LaptopPage[] = [
  'home',
  'tasks',
  'stock',
  'drawings',
  'website',
  'insurance',
  'security',
];

export function laptopPageFrom(value: string): LaptopPage {
  return PAGES.find((page) => page === value) ?? 'home';
}

/** The three big tiles and the pages behind them. */
type HomePage = 'tasks' | 'stock' | 'drawings';

/** The order is the contract: Tasks, Stock, Drawings, left to right (CLAUDE.md T14 1). */
export const HOME_TILES: ReadonlyArray<{ page: HomePage; label: string }> = [
  { page: 'tasks', label: 'Tasks' },
  { page: 'stock', label: 'Stock' },
  { page: 'drawings', label: 'Drawings' },
];

/** The Office group, in the order the brief names it, each opening what it opened in Turn 13:
 *  the Team board, the three Admin pages, the software line (which is on the Team board's
 *  Technical tab, REPORT-T13 T13-B2a) and the Settings modal (CLAUDE.md T14 2.1). */
export const OFFICE_GROUP: ReadonlyArray<{
  id: string;
  label: string;
  action: string;
  extra: string;
}> = [
  { id: 'team', label: 'Team', action: 'openModal', extra: 'data-modal="team"' },
  { id: 'website', label: 'Website', action: 'laptopPage', extra: 'data-id="website"' },
  { id: 'insurance', label: 'Insurance', action: 'laptopPage', extra: 'data-id="insurance"' },
  { id: 'security', label: 'Security', action: 'laptopPage', extra: 'data-id="security"' },
  { id: 'joineryCore', label: 'Joinery Core', action: 'teamTab', extra: 'data-id="technical"' },
  { id: 'settings', label: 'Settings', action: 'openSettings', extra: '' },
];

/** The flat line icons of the three tiles, from the mockup: a list, a rack, a drawing. Inline,
 *  drawn in the tile's own colour of ink, which the stylesheet makes white. */
const ICONS: Record<HomePage, string> = {
  tasks:
    '<svg class="screen-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" ' +
    'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M4 6h2M10 6h10M4 12h2M10 12h10M4 18h2M10 18h10" /></svg>',
  stock:
    '<svg class="screen-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" ' +
    'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M4 3v18M20 3v18M4 9h16M4 15h16M4 21h16M7 6h10v3H7zM7 12h10v3H7z" /></svg>',
  drawings:
    '<svg class="screen-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" ' +
    'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M5 3h10l4 4v14H5z M15 3v4h4 M8 11h8v6H8z M8 11l8 6" /></svg>',
};

/** Who has this one, and how much of his day is left (CLAUDE.md T2 3.8). */
function onItLine(state: GameState, task: TaskInstance): string {
  if (task.doneBy === null || task.doneBy === 'owner') return '';
  const worker = workerById(state, task.doneBy);
  if (!worker) return '';
  if (task.done) return `done by ${worker.name}`;
  return `${worker.name} is on it, ${minutes(staffMinutesLeft(worker))} of his day left`;
}

function taskRow(state: GameState, task: TaskInstance): string {
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
    `<div class="row${task.done ? ' is-done' : ''}${running ? ' is-running' : ''}">` +
    `<span class="row-main">${escapeHtml(task.label)}${jobLine}</span>` +
    `<span class="row-figure">${minutes(task.minutesRemaining)} left of ` +
    `${minutes(task.minutesTotal)}${staffLine === '' ? '' : ` · ${escapeHtml(staffLine)}`}` +
    '</span>' +
    `<span class="row-action">${action}</span></div>`
  );
}

/** Today's desk: everything still open, and what was finished today. Yesterday's is gone. */
function tasksPage(state: GameState): string {
  const office = state.tasks.filter(
    (task) =>
      task.category !== 'workshop' &&
      task.kind !== 'design' &&
      (!task.done || task.day === state.clock.day),
  );
  const workshop = openTasks(state).filter((task) => task.category === 'workshop');
  return (
    '<h3>Office tasks today</h3>' +
    (office.length === 0
      ? emptyLine('Nothing on the desk.')
      : office.map((task) => taskRow(state, task)).join('')) +
    '<h3>Workshop jobs of work</h3>' +
    (workshop.length === 0
      ? emptyLine('Nothing waiting in the hall.')
      : workshop.map((task) => taskRow(state, task)).join('')) +
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

/** Home: the company and the game's clock in one small line, the three big tiles, and the Office
 *  group under a rule. Every figure on it is the engine's (CLAUDE.md T14 2.1). */
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
      ICONS[tile.page] +
      `<span class="screen-tile-big">${tile.label}</span>` +
      `<span class="screen-tile-small" data-line="${tile.page}">${lines[tile.page]}</span>` +
      '</button>',
  ).join('');
  const office = OFFICE_GROUP.map(
    (tile) =>
      `<button class="screen-small-tile" data-do="${tile.action}"` +
      `${tile.extra === '' ? '' : ` ${tile.extra}`} data-tile="${tile.id}">` +
      `${escapeHtml(tile.label)}</button>`,
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

export interface LaptopView {
  page: LaptopPage;
  /** What the player has typed into the sheet count on the Stock page. Read by nothing since
   *  Turn 13 (REPORT-T13 section 10); the page has no free form order any more. */
  stockSheets: string;
}

/** A page behind a tile, as Turn 13 left it: the screen skin is all it inherits (T14 2.1). */
function pageBody(state: GameState, page: Exclude<LaptopPage, 'home'>, view: LaptopView): string {
  switch (page) {
    case 'tasks':
      return tasksPage(state);
    case 'stock':
      return renderMaterials(state, view.stockSheets);
    case 'drawings':
      return renderDrawings(state);
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
    view.page === 'home' ? homeScreen(state) : BACK_HOME + pageBody(state, view.page, view);
  return `<div class="laptop-screen" data-laptop-page="${view.page}">${inside}</div>`;
}
