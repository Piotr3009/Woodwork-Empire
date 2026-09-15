// The one top bar every view shares: a machine cabinet in the darkest green of the workshop, with
// the money on a name plate, the clock and the knobs beside it, the boss's day in the middle and
// the push buttons on the right (CLAUDE.md T11 3.1). Nothing else lives here.

import { DAY_CATEGORIES, DAY_CATEGORY_LABELS, SPEEDS } from '../engine/constants';
import {
  booksBehind,
  dayMinutesByCategory,
  findTask,
  formatDate,
  has,
  isBreak,
  netOf,
  ownerIsAvailable,
  ownerJob,
  ownerMinutesToday,
  shoppingList,
  skippedTask,
} from '../engine/index';
import type { DayCategory, GameState, Speed } from '../engine/index';
import { cadenceControl } from './dayEnd';
import { escapeHtml, money } from './modal';

/** The five speed knobs. One place builds them, whatever else the top bar has to say. The Pause
 *  knob pulses once when the player asks for something stopped time will not give him
 *  (CLAUDE.md T7 3.10). */
function speedChips(state: GameState, pulse: boolean): string {
  return SPEEDS.map((speed) => {
    const label = speed === 0 ? 'Pause' : `${speed}x`;
    const active = state.speed === speed ? ' is-on' : '';
    const beat = speed === 0 && pulse ? ' is-pulse' : '';
    return (
      `<button class="chip knob${active}${beat}" data-do="setSpeed" data-speed="${speed}">` +
      `${escapeHtml(label)}</button>`
    );
  }).join('');
}

function speedButtons(state: GameState, pulse: boolean): string {
  // The clock is being run for the player, through the trip he is out on or through the move of
  // the hall he asked for: the speed is not his until it is over (CLAUDE.md T8 3.3, 3.4). This is
  // the one thing that ever takes the clock off him; the Turn 4 forced 4x of a move is this.
  if (skippedTask(state) !== null) {
    return '<span class="reason">Skipping ahead</span>';
  }
  // At dinner. The speeds stay as they are, so the player can run the clock through it.
  const dinner = isBreak(state.clock.minute)
    ? `<span class="reason">${state.owner.breakSkipped ? 'Working through' : 'Break'}</span>`
    : '';
  return dinner + speedChips(state, pulse);
}

/** What today's work is multiplied by, shown only when the owner is paying for something: the
 *  overtime this week, or a dinner he worked through (CLAUDE.md T6 3.4). */
function outputChip(state: GameState): string {
  const factor = state.owner.labourFactor;
  if (factor >= 1) return '';
  return (
    `<span class="output warn" title="Overtime and skipped breaks come off tomorrow">` +
    `Output ${factor.toFixed(2)}</span>`
  );
}

/** The cream plate on the left: what is in the bank, and what today has come to under it. */
function namePlate(state: GameState): string {
  const net = netOf(state.finance.day);
  const blind = booksBehind(state);
  const netClass = blind ? 'flat' : net > 0 ? 'good' : net < 0 ? 'bad' : 'flat';
  // Books behind, so nobody knows what today came to (CLAUDE.md T2 3.5).
  const netText = blind ? '? today' : `${net >= 0 ? '+' : ''}${money(net)} today`;
  return (
    '<div class="name-plate">' +
    `<span class="cash">${money(state.cash)}</span>` +
    `<span class="net ${netClass}" title="${blind ? 'The books are behind' : 'Today'}">` +
    `${escapeHtml(netText)}</span>` +
    '</div>'
  );
}

/** The lamp over the meter: orange while he is on something, green while he is in and idle, grey
 *  while he is out or gone home (CLAUDE.md T11 3.1). */
function ownerLamp(state: GameState): string {
  if (!ownerIsAvailable(state)) return 'is-away';
  if (state.owner.currentTaskId !== null || ownerJob(state) !== null) return 'is-busy';
  return 'is-idle';
}

/** What he is doing, in the words the meter says it in. One line, whatever the day is like. */
function ownerDayLine(state: GameState): string {
  const owner = state.owner;
  if (!owner.present) return 'not in today';
  if (owner.wentHome) return 'gone home';
  if (isBreak(state.clock.minute) && !owner.breakSkipped) return 'at dinner';
  if (owner.currentTaskId !== null) {
    const task = findTask(state, owner.currentTaskId);
    if (task !== null && !task.done) {
      return `${task.label}, ${Math.max(0, Math.ceil(task.minutesRemaining))} min left`;
    }
  }
  const job = ownerJob(state);
  if (job !== null) return `at the bench, ${job.name}`;
  return 'idle';
}

/** The minutes of the day so far, per band, as a lookup the bar and its tooltip both read. */
function minutesPerBand(state: GameState): Map<DayCategory, number> {
  const found = new Map<DayCategory, number>();
  for (const part of dayMinutesByCategory(state.owner.dayLog)) {
    found.set(part.category, part.minutes);
  }
  return found;
}

/** The day itself: the 480 minutes, and the overtime beyond them once it runs, painted in the
 *  order they happened. Break and idle are left unpainted (CLAUDE.md T11 3.1). */
function segmentBar(state: GameState, total: number): string {
  const segments = state.owner.dayLog
    .map((entry) => {
      const width = (entry.minutes / total) * 100;
      return (
        `<span class="seg seg-${entry.category}" data-band="${entry.category}" ` +
        `style="width:${width.toFixed(4)}%"></span>`
      );
    })
    .join('');
  return `<div class="day-bar">${segments}</div>`;
}

/** The legend, on a small cream plate, with what each band has come to so far. It is behind the
 *  hover so the bar itself carries no legend under it (CLAUDE.md T11 3.1). */
function segmentTooltip(state: GameState): string {
  const found = minutesPerBand(state);
  const rows = DAY_CATEGORIES.map((category) => {
    const minutes = found.get(category) ?? 0;
    return (
      `<span class="tip-row" data-band="${category}">` +
      `<span class="tip-key seg-${category}"></span>` +
      `<span class="tip-name">${escapeHtml(DAY_CATEGORY_LABELS[category])}</span>` +
      `<span class="tip-min">${minutes} min</span></span>`
    );
  }).join('');
  return `<div class="day-tip">${rows}</div>`;
}

/** The boss's day, which is the middle of the bar and the point of it: a lamp, what he is on, how
 *  much of his day has gone, and the day itself in bands (CLAUDE.md T11 3.1). */
function dayMeter(state: GameState): string {
  const available = ownerMinutesToday(state);
  // Overtime runs past the pool, so the bar grows to hold it rather than clipping the evening.
  const total = Math.max(available, state.owner.minutesWorked, 1);
  return (
    '<div class="day-meter" data-day-meter="1">' +
    '<div class="day-head">' +
    `<span class="lamp ${ownerLamp(state)}"></span>` +
    `<span class="day-line">${escapeHtml(state.playerName)}'s day · ` +
    `${escapeHtml(ownerDayLine(state))}</span>` +
    outputChip(state) +
    `<span class="day-count">${state.owner.minutesWorked} / ${available} min</span>` +
    '</div>' +
    segmentBar(state, total) +
    segmentTooltip(state) +
    '</div>'
  );
}

/** A push button of the right hand block: a cream plate with a hard shadow, orange when there is
 *  something on it the player has not seen (CLAUDE.md T11 3.1). */
function pushButton(action: string, label: string, extra: string, fresh: boolean): string {
  return (
    `<button class="push${fresh ? ' is-new' : ''}" data-do="${action}"${extra}>` +
    `${escapeHtml(label)}</button>`
  );
}

/** What the player has not looked at yet: the enquiries he has not seen on the board, and the
 *  orders that landed while the list was shut (CLAUDE.md T11 3.1). */
export interface TopbarNews {
  board: boolean;
  orders: boolean;
}

export function renderTopbar(
  state: GameState,
  view: 'hall' | 'office' | 'sprites',
  pulse = false,
  news: TopbarNews = { board: false, orders: false },
): string {
  const orders = shoppingList(state).length;
  return (
    '<div class="topbar">' +
    namePlate(state) +
    '<div class="clock-block">' +
    `<span class="date">${escapeHtml(formatDate(state.clock))}</span>` +
    `<span class="speeds">${speedButtons(state, pulse)}</span>` +
    '</div>' +
    dayMeter(state) +
    '<span class="spacer"></span>' +
    '<div class="push-block">' +
    // Everything bought and not here yet, one click away from every screen (CLAUDE.md T8 3.2).
    pushButton(
      'openModal',
      `Orders: ${orders}`,
      ' data-modal="shopping"',
      news.orders,
    ) +
    // The order board is the management software's: no laptop, no board (CLAUDE.md T7 3.8).
    (has(state, 'laptop')
      ? pushButton(
          'openModal',
          `Board: ${state.enquiries.length}`,
          ' data-modal="board"',
          news.board,
        )
      : '<span class="reason">Board: buy a laptop</span>') +
    pushButton(
      'setView',
      view === 'hall' ? 'Office' : 'Hall',
      ` data-view="${view === 'hall' ? 'office' : 'hall'}"`,
      false,
    ) +
    pushButton('toggleMenu', 'Menu', '', false) +
    '</div>' +
    '</div>'
  );
}

export interface MenuCloud {
  available: boolean;
  signedIn: string | null;
}

export function renderMenu(state: GameState, cloud: MenuCloud): string {
  const stayHome = state.owner.present
    ? '<button class="btn" data-do="skipDay">Stay home today</button>'
    : '<button class="btn" disabled title="Already a day off">Stay home today</button>';
  return (
    '<div class="menu-pop">' +
    '<button class="btn" data-do="endDay">End day</button>' +
    stayHome +
    `<button class="btn" data-do="toggleWhy">${
      state.showWhy ? 'Hide real-life notes' : 'Show real-life notes'
    }</button>` +
    '<button class="btn" data-do="showSprites">Sprite check</button>' +
    cadenceControl(state) +
    // A save on the player's own computer: a file down, a file up (PIOTR, 14.09).
    '<button class="btn" data-do="saveToFile">Save to file</button>' +
    '<button class="btn" data-do="loadFromFile">Load from file</button>' +
    '<input type="file" accept=".json" data-field="saveFile" ' +
    'aria-label="Load a save file" />' +
    (cloud.available && cloud.signedIn !== null
      ? '<button class="btn" data-do="saveGame">Save now</button>' +
        '<button class="btn" data-do="loadGame">Load</button>'
      : '') +
    '</div>'
  );
}

export function speedFromString(value: string): Speed {
  const parsed = Number(value);
  if (parsed === 1 || parsed === 2 || parsed === 4 || parsed === 10) return parsed;
  return 0;
}
