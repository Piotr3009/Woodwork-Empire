// The one slim top bar every view shares (CLAUDE.md 10.1). Nothing else lives here.

import { MINUTES_PER_WORKING_DAY, SPEEDS } from '../engine/constants';
import { booksBehind, formatDate, isBreak, movingMachines, netOf } from '../engine/index';
import type { GameState, Speed } from '../engine/index';
import { cadenceControl } from './dayEnd';
import { escapeHtml, money } from './modal';

/** The four speed chips. One place builds them, whatever else the top bar has to say. */
function speedChips(state: GameState): string {
  return SPEEDS.map((speed) => {
    const label = speed === 0 ? 'Pause' : `${speed}x`;
    const active = state.speed === speed ? ' is-on' : '';
    return (
      `<button class="chip${active}" data-do="setSpeed" data-speed="${speed}">` +
      `${escapeHtml(label)}</button>`
    );
  }).join('');
}

function speedButtons(state: GameState): string {
  // The hall is being shifted about: the clock runs itself and the player cannot touch it
  // until it is done (CLAUDE.md T4 3.5).
  if (movingMachines(state) !== null) {
    return '<span class="reason">Moving machines</span>';
  }
  // At dinner. The speeds stay as they are, so the player can run the clock through it.
  const dinner = isBreak(state.clock.minute) ? '<span class="reason">Break</span>' : '';
  return dinner + speedChips(state);
}

/** Admin grey, design purple, workshop green, the rest free (CLAUDE.md 7.1). */
function minuteBar(state: GameState): string {
  const used = state.owner.minutesByCategory;
  const total = MINUTES_PER_WORKING_DAY;
  const width = (value: number): string => `${Math.min(100, (value / total) * 100)}%`;
  return (
    '<div class="minutes" title="Owner minutes today">' +
    '<div class="minute-bar">' +
    `<span class="seg seg-admin" style="width:${width(used.admin)}"></span>` +
    `<span class="seg seg-design" style="width:${width(used.design)}"></span>` +
    `<span class="seg seg-workshop" style="width:${width(used.workshop)}"></span>` +
    '</div>' +
    `<span class="minute-count">${state.owner.minutesWorked} / ${total} min</span>` +
    '</div>'
  );
}

export function renderTopbar(
  state: GameState,
  view: 'hall' | 'office' | 'sprites',
): string {
  const net = netOf(state.finance.day);
  const blind = booksBehind(state);
  const netClass = blind ? 'flat' : net > 0 ? 'good' : net < 0 ? 'bad' : 'flat';
  // Books behind, so nobody knows what today came to (CLAUDE.md T2 3.5).
  const netText = blind ? '? today' : `${net >= 0 ? '+' : ''}${money(net)} today`;
  return (
    '<div class="topbar">' +
    `<span class="cash">${money(state.cash)}</span>` +
    `<span class="net ${netClass}" title="${blind ? 'The books are behind' : 'Today'}">` +
    `${escapeHtml(netText)}</span>` +
    `<span class="date">${escapeHtml(formatDate(state.clock))}</span>` +
    `<span class="speeds">${speedButtons(state)}</span>` +
    minuteBar(state) +
    '<span class="spacer"></span>' +
    '<button class="chip" data-do="openModal" data-modal="board">Board</button>' +
    `<button class="chip" data-do="setView" data-view="${view === 'hall' ? 'office' : 'hall'}">` +
    `${view === 'hall' ? 'Office' : 'Hall'}</button>` +
    '<button class="chip" data-do="toggleMenu">Menu</button>' +
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
    (cloud.available && cloud.signedIn !== null
      ? '<button class="btn" data-do="saveGame">Save now</button>' +
        '<button class="btn" data-do="loadGame">Load</button>'
      : '') +
    '</div>'
  );
}

export function speedFromString(value: string): Speed {
  const parsed = Number(value);
  if (parsed === 1 || parsed === 2 || parsed === 4) return parsed;
  return 0;
}
