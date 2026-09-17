// @vitest-environment jsdom
// The date reads like a date (PIOTR, 17.09; CLAUDE.md T18 2.2). The calendar was already thirty
// days to the month; only the words were wrong. One formatter, `formatCalendarDay`, prints the
// weekday, the day of its month and the month's name, and every screen that used to say "day N"
// calls it. `state.clock.day` and every engine figure are untouched: this is copy, not a clock.

import { beforeAll, describe, expect, it } from 'vitest';
import { currentState, mount, render } from '../../src/ui/app';
import {
  DAYS_PER_MONTH,
  MONTHS_PER_YEAR,
  MONTH_NAMES,
  START_MONTH,
} from '../../src/engine/constants';
import { formatCalendarDay, formatDate, monthName } from '../../src/engine/index';
import { buyNow } from '../helpers';

function root(): HTMLElement {
  const element = document.querySelector('#app');
  if (!(element instanceof HTMLElement)) throw new Error('no root');
  return element;
}

function click(selector: string): void {
  const element = root().querySelector(selector);
  if (element === null) throw new Error(`nothing to click: ${selector}`);
  element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

function dismissEvents(): void {
  let guard = 0;
  while (
    root().querySelector('[data-do="closeHouseCard"], [data-do="resolveEvent"]') !== null &&
    guard < 50
  ) {
    click('[data-do="closeHouseCard"], [data-do="resolveEvent"]');
    guard += 1;
  }
}

function goTo(view: 'hall' | 'office'): void {
  const inOffice = root().querySelector('.office-room') !== null;
  if ((view === 'office') === inOffice) return;
  click(`[data-do="setView"][data-view="${view}"]`);
}

/** The screens the player can open, and what opens them. The sprite check is not a screen: it is
 *  the acceptance page of the art contract and is reached from the Menu. */
const OPENERS: Array<[string, string]> = [
  ['workPlan', '[data-office="workPlan"]'],
  ['board', '[data-office="orders"]'],
  ['catalogue', '[data-office="catalogue"]'],
  ['accounting', '[data-office="binder"]'],
  ['shopping', '[data-do="openModal"][data-modal="shopping"]'],
  ['company', '[data-office="company"]'],
  ['laptop', '[data-office="laptop"]'],
  ['machineCard', '.hall-view [data-sprite="tableSaw"]'],
];

/** "day" followed by a number, in any case: the words the game is not allowed to print at the
 *  player any more. */
const DAY_N = /\bday\s+\d/i;

beforeAll(() => {
  document.body.innerHTML = '<div id="app"></div>';
  mount(root());
  click('[data-do="startGame"]');
  click('[data-do="setSpeed"][data-speed="1"]');
  dismissEvents();
  const state = currentState();
  if (state === null) throw new Error('no game');
  Object.assign(state, buyNow(buyNow(buyNow(state, 'desk'), 'laptop'), 'tableSaw'));
  render();
});

describe('the one date in the game (CLAUDE.md T18 2.2)', () => {
  it('reads weekday, day of the month and the month by name, from the start month', () => {
    // Day 1 is a Monday and the first of the first month, which is START_MONTH.
    expect(formatCalendarDay(1)).toBe(`Mon 1 ${MONTH_NAMES[START_MONTH]}`);
    expect(formatCalendarDay(12)).toBe(`Fri 12 ${MONTH_NAMES[START_MONTH]}`);
    // Thirty days to the month, so day 31 is the first of the next one.
    expect(formatCalendarDay(DAYS_PER_MONTH + 1)).toBe(`Wed 1 ${MONTH_NAMES[START_MONTH + 1]}`);
    // Twelve names cycling, and no year on the end of any of them.
    expect(monthName(MONTHS_PER_YEAR + 1)).toBe(MONTH_NAMES[START_MONTH]);
    // A year is 360 days and a week is 7, so the weekday does not come round with the month: the
    // name does, and there is no year on the end of it to say which March this is.
    expect(formatCalendarDay(DAYS_PER_MONTH * MONTHS_PER_YEAR + 1)).toContain(
      `1 ${MONTH_NAMES[START_MONTH]}`,
    );
    expect(formatCalendarDay(1)).not.toMatch(/\d{4}/);
  });

  it('is what the top bar prints, with the clock after it', () => {
    expect(formatDate({ day: 12, minute: 90 })).toBe(`${formatCalendarDay(12)} · 09:30`);
  });

  it('never runs off the end of the names, whatever day it is handed', () => {
    for (const day of [-5, 0, 1, 29, 30, 31, 359, 360, 361, 1000]) {
      expect(formatCalendarDay(day), String(day)).not.toMatch(/undefined|NaN/);
      expect(MONTH_NAMES as readonly string[], String(day)).toContain(
        formatCalendarDay(day).split(' ')[2],
      );
    }
  });

  it('leaves the engine its own count: the clock is still a day number', () => {
    const state = currentState();
    if (state === null) throw new Error('no game');
    expect(typeof state.clock.day).toBe('number');
    expect(state.clock.day).toBeGreaterThanOrEqual(1);
  });
});

describe('no screen says "day N" at the player any more (CLAUDE.md T18 2.2, section 7)', () => {
  it('not the hall, not the office, and not one of the screens they open', () => {
    const state = currentState();
    if (state === null) throw new Error('no game');
    const seen: string[] = [];
    const sweep = (where: string): void => {
      const today = currentState()?.clock.day ?? 0;
      const html = root().innerHTML;
      // The line the brief asks for by name: the current day, printed as a day number.
      expect(html, `${where}: the current day is printed as "day ${today}"`).not.toMatch(
        new RegExp(`\\bday\\s+${today}\\b`, 'i'),
      );
      // And the general case: no date anywhere on the screen is a day number.
      const hit = DAY_N.exec(html);
      expect(hit === null ? '' : `${where}: ${hit[0]}`).toBe('');
      seen.push(where);
    };
    goTo('hall');
    sweep('the hall');
    goTo('office');
    sweep('the office');
    for (const [id, opener] of OPENERS) {
      goTo(id === 'shopping' || id === 'machineCard' ? 'hall' : 'office');
      click(opener);
      dismissEvents();
      sweep(id);
      click(`[data-modal="${id}"] [data-do="closeModal"]`);
    }
    // Every page of the laptop, which is where the desk work, the stock, the drawings and the
    // team live.
    goTo('office');
    click('[data-office="laptop"]');
    dismissEvents();
    for (const page of Array.from(root().querySelectorAll('[data-do="laptopPage"]'))) {
      const id = page.getAttribute('data-id') ?? '';
      page.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      dismissEvents();
      sweep(`laptop: ${id}`);
      click('[data-office="laptop"], [data-do="laptopHome"]');
    }
    // And the two screens the evening puts up by itself: the day end, and the house card behind
    // it. The day the sweep reads is taken again, because ending the day moves it.
    click('[data-do="toggleMenu"]');
    click('[data-do="endDay"]');
    sweep('the day end');
    expect(seen.length).toBeGreaterThan(12);
    expect(seen).toContain('laptop: team');
  });
});
