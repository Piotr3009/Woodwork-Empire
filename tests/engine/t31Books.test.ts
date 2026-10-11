/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// @vitest-environment jsdom
// Turn 31, 2.5: the line's books [PIOTR, 11.10: "in a tab in the finances, the production line's
// account: the turnover, the materials, the engineers, the efficiency, the net profit, by the day and
// by the year"], read off its own day book, row by row against what each is reckoned from, and the
// turnover against the ledger for a played month (CLAUDE.md T31 2.5, section 7).

import { describe, expect, it } from 'vitest';
import {
  DAY_END_MINUTE,
  DAYS_PER_MONTH,
  DAYS_PER_YEAR,
  LINE_DAYS_KEPT,
  LINE_MODULE_POWER_PER_DAY,
  LINE_MODULES,
  LINE_PRICE,
  LINE_WINDOW_MINUTES,
  LINE_WINDOW_PRICE,
  MINUTES_PER_WORKING_DAY,
  PROPERTY_INSURANCE_RATE_YEARLY,
  unitCostFactor,
} from '../../src/engine/constants';
import type { GameState, Worker } from '../../src/engine/index';
import { applyAction, runMinutes } from '../../src/engine/index';
import { isWorkingDay, monthOfDay } from '../../src/engine/clock';
import { lineBooks, lineBooksShown, lineMonthPace, linePaidBack } from '../../src/engine/lineBooks';
import { lineMaterialPerWindow } from '../../src/engine/lineContract';
import { lineValue } from '../../src/engine/insurance';
import { renderAccounting } from '../../src/ui/accounting';
import { act, buyStartingKit, newGame, nextDay, placeEquipment, testJoiner, withAir } from '../helpers';

function bigUnit(): GameState {
  let state = newGame({ difficulty: 'veryEasy' });
  state.cash = 9000000;
  state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
  state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'second' }));
  state = withAir(buyStartingKit(state), 'industrial');
  state.cash = 900000;
  state.enquiries = [];
  return state;
}

function worker(id: string, name: string, role: Worker['role'], monthlyWage: number): Worker {
  return { ...testJoiner(id, name), role, tier: null, rate: 0, monthlyWage };
}

/** The line standing with its two engineers, a shelter, an office admin who keeps it in timber and
 *  glass, the property cover held, and its contract running from this morning. */
function running(): GameState {
  const state = bigUnit();
  LINE_MODULES.forEach((id, index) => placeEquipment(state, id, { x: 2 + 6 * index, y: 14, id: `kit-line-${index + 1}` }));
  state.workers.push(worker('eng-1', 'Kev', 'lineEngineer', 15000), worker('eng-2', 'Raj', 'lineEngineer', 15000));
  state.workers.push(worker('adm-1', 'Anna', 'officeAdmin', 2000));
  placeEquipment(state, 'timberShelter', { variantId: 'standard', x: 30, y: 2, id: 'kit-store' });
  state.insurance.property = true;
  state.windowLine.contract = {
    status: 'active',
    startDay: state.clock.day,
    windowsThisWeek: 0,
    weekStartDay: state.clock.day,
    windowsMade: 0,
    revenue: 0,
    materialCost: 0,
  };
  state.windowLine.boards = 40;
  state.stock.sheets += 40;
  state.windowLine.glass = 20;
  return state;
}

/** Plays the day in hand to five, every card answered with its first choice. */
function toFive(state: GameState): GameState {
  let next = state;
  for (let guard = 0; next.clock.minute < DAY_END_MINUTE && guard < 600; guard += 1) {
    if (next.activeEvent !== null) {
      next = applyAction(next, { type: 'RESOLVE_EVENT', choiceId: next.activeEvent.choices[0]?.id ?? 'ok' });
      continue;
    }
    const day = next.clock.day;
    next = runMinutes(next, Math.min(30, DAY_END_MINUTE - next.clock.minute)).state;
    if (next.clock.day !== day) break;
  }
  return next;
}

/** Plays whole days to the open of the first day of the next month. */
function toNextMonth(state: GameState): GameState {
  let next = state;
  const month = monthOfDay(next.clock.day);
  for (let guard = 0; monthOfDay(next.clock.day) === month && guard < 40; guard += 1) next = nextDay(next);
  return next;
}

describe('the day book (CLAUDE.md T31 2.5)', () => {
  // Played to the first of a month, then the whole of that month, to the first of the next, and the
  // books read on its last evening.
  const start = toNextMonth(running());
  const month = monthOfDay(start.clock.day);
  let played = start;
  for (let guard = 0; guard < 40; guard += 1) {
    const next = nextDay(played);
    if (monthOfDay(next.clock.day) !== month) break;
    played = next;
  }
  // The last day of the month played to five: the books of the whole month.
  played = toFive(played);
  const days = played.windowLine.days.filter((record) => monthOfDay(record.day) === month);
  const books = lineBooks(played);

  it('writes one record a calendar day the line stands, weekends among them, and keeps 400 days', () => {
    expect(LINE_DAYS_KEPT).toBe(400);
    const inMonth = [...days, ...(monthOfDay(played.windowLine.today.day) === month ? [played.windowLine.today] : [])];
    const numbers = new Set(inMonth.map((record) => record.day));
    expect(numbers.size).toBe(inMonth.length);
    expect(inMonth.some((record) => !isWorkingDay(record.day))).toBe(true);
    expect(inMonth.every((record) => record.power > 0)).toBe(true);
  });

  it('reckons each row of the month as 2.5 says, and the turnover to the pound as the ledger has it', () => {
    const column = books.month;
    const inMonth = [...days, played.windowLine.today].filter((record) => monthOfDay(record.day) === month);
    const calendarDays = inMonth.length;
    expect(column.windows).toBeGreaterThan(60);
    expect(column.turnover).toBe(column.windows * LINE_WINDOW_PRICE);
    const ledger = played.ledger
      .filter((entry) => entry.label === 'Windows off the line: windows' && monthOfDay(entry.day) === month)
      .reduce((total, entry) => total + entry.amount, 0);
    expect(column.turnover).toBe(ledger);
    expect(column.material).toBe(column.windows * lineMaterialPerWindow());
    expect(column.engineers).toBeCloseTo(calendarDays * 2 * (15000 / DAYS_PER_MONTH), 6);
    expect(column.power).toBe(calendarDays * LINE_MODULES.length * LINE_MODULE_POWER_PER_DAY);
    const coverPerDay = (lineValue(played) * PROPERTY_INSURANCE_RATE_YEARLY * unitCostFactor(played.unit)) / DAYS_PER_YEAR;
    expect(column.cover).toBeCloseTo(calendarDays * coverPerDay, 6);
    expect(column.net).toBeCloseTo(column.turnover - column.material - column.engineers - column.power - column.cover, 6);
    // The working minutes the contract ran, and the windows it could have made in them.
    const working = inMonth.filter((record) => isWorkingDay(record.day)).length;
    expect(column.possibleMinutes).toBe(working * MINUTES_PER_WORKING_DAY);
    expect(column.possibleWindows).toBeCloseTo((working * MINUTES_PER_WORKING_DAY) / LINE_WINDOW_MINUTES, 6);
    // With an admin who keeps it in timber and glass, the line never stood for either.
    expect(column.lost).toEqual({ engineer: 0, timber: 0, glass: 0, timberAndGlass: 0, move: 0 });
  });

  it('adds today into the week, the month and the year', () => {
    expect(books.week.windows).toBeGreaterThanOrEqual(books.today.windows);
    expect(books.month.windows).toBeGreaterThanOrEqual(books.week.windows);
    expect(books.year.windows).toBeGreaterThanOrEqual(books.month.windows);
  });

  it('gives the month s pace, a year at it, and the paid back since the line first stood', () => {
    const pace = lineMonthPace(played);
    if (pace === null) throw new Error('the month has days of the line');
    const inMonth = [...days, played.windowLine.today].filter((record) => monthOfDay(record.day) === month);
    const working = inMonth.filter((record) => isWorkingDay(record.day)).length;
    expect(pace.windowsPerDay).toBeCloseTo(books.month.windows / working, 6);
    expect(pace.netPerDay).toBeCloseTo(books.month.net / working, 6);
    expect(pace.yearNet).toBeCloseTo((books.month.net / inMonth.length) * DAYS_PER_YEAR, 6);
    const back = linePaidBack(played);
    const all = [...played.windowLine.days, played.windowLine.today];
    const net = all.reduce((total, record) => total + record.turnover - record.material - record.engineers - record.power - record.cover, 0);
    expect(back.net).toBeCloseTo(net, 4);
    expect(back.line).toBe(LINE_PRICE);
    expect(back.upgrades).toBe(0);
  });
});

describe('the efficiency (CLAUDE.md T31 2.5)', () => {
  it('falls on a day an engineer is away, and says why', () => {
    let state = nextDay(running());
    while (!isWorkingDay(state.clock.day)) state = nextDay(state);
    const away = state.workers.find((entry) => entry.id === 'eng-1');
    if (away === undefined) throw new Error('the engineer is wanted');
    away.absentDaysRemaining = 1;
    const day = state.clock.day;
    const evening = nextDay(state);
    const record = evening.windowLine.days.find((entry) => entry.day === day);
    expect(record?.possibleMinutes).toBe(MINUTES_PER_WORKING_DAY);
    expect(record?.lost.engineer).toBe(MINUTES_PER_WORKING_DAY);
    expect(record?.windows).toBe(0);
  });
});

describe('the Production line tab (CLAUDE.md T31 2.5)', () => {
  it('is not there before the line has stood, and is the fifth once it has', () => {
    const before = bigUnit();
    expect(lineBooksShown(before)).toBe(false);
    const page = document.createElement('div');
    page.innerHTML = renderAccounting(before, 'line');
    expect(Array.from(page.querySelectorAll('[data-do="accountingTab"]')).map((chip) => chip.getAttribute('data-id'))).toEqual([
      'days',
      'summary',
      'reports',
      'finance',
    ]);
    const state = nextDay(running());
    expect(lineBooksShown(state)).toBe(true);
    page.innerHTML = renderAccounting(state, 'line');
    expect(Array.from(page.querySelectorAll('[data-do="accountingTab"]')).map((chip) => chip.textContent)).toEqual([
      'Days',
      'Summary',
      'Monthly reports',
      'Finance',
      'Production line',
    ]);
    expect(Array.from(page.querySelectorAll('.col h3')).map((head) => head.textContent)).toEqual(['Today', 'This week', 'This month', 'This year']);
    const firstColumn = page.querySelector('.col')?.textContent ?? '';
    for (const row of ['Windows made', 'Turnover', 'Timber and glass', 'Engineers', 'Power', 'Property cover', 'Net profit', 'Efficiency']) {
      expect(firstColumn, row).toContain(row);
    }
    expect(page.textContent).toContain('A working day on average this month:');
    expect(page.textContent).toContain("A year at this month's pace:");
    expect(page.textContent).toContain('Paid back:');
    expect(page.textContent).toContain('of £10,000,000');
  });

  it('is shown whether or not the books are up to date, and stays once the line is gone', () => {
    const state = nextDay(running());
    state.booksUpToDay = 0;
    const page = document.createElement('div');
    page.innerHTML = renderAccounting(state, 'line');
    expect(page.querySelector('.cols')).not.toBeNull();
    state.equipment = state.equipment.filter((item) => !LINE_MODULES.includes(item.specId));
    expect(lineBooksShown(state)).toBe(true);
  });

  it('says what the month lost, and the efficiency as made of could have', () => {
    const state = nextDay(running());
    state.windowLine.today.possibleMinutes = 480;
    state.windowLine.today.possibleWindows = 4;
    state.windowLine.today.windows = 3;
    state.windowLine.today.lost = { engineer: 120, timber: 0, glass: 60, timberAndGlass: 0, move: 0 };
    const page = document.createElement('div');
    page.innerHTML = renderAccounting(state, 'line');
    expect(page.textContent).toContain('Lost this month: 2 h for want of an engineer, 1 h for want of glass');
    const efficiency = Array.from(page.querySelectorAll('.col')[0]?.querySelectorAll('.row') ?? []).find((row) => row.textContent?.startsWith('Efficiency'));
    expect(efficiency?.textContent).toBe('Efficiency3 of 4, 75%');
  });
});
