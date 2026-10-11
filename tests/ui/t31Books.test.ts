/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// @vitest-environment jsdom
// Turn 31, 2.5: the line's own books [PIOTR, 11.10: "in a tab in the finances, the production
// line's account: the turnover, the materials, the engineers, the efficiency, the net profit, by
// the day and by the year"], from the line's own day book, row by row against what each is
// reckoned from, and the turnover against the ledger (CLAUDE.md T31 2.5, section 7).

import { describe, expect, it } from 'vitest';
import {
  DAYS_PER_MONTH,
  DAYS_PER_YEAR,
  LINE_MODULE_POWER_PER_DAY,
  LINE_MODULES,
  LINE_WINDOW_PRICE,
  PROPERTY_INSURANCE_RATE_YEARLY,
  unitCostFactor,
} from '../../src/engine/constants';
import type { GameState, LineDay } from '../../src/engine/index';
import { isWorkingDay, monthOfDay } from '../../src/engine/clock';
import { emptyLineDay, lineColumns, lineHasStood, lineMonthPace, linePaidBack, openLineBooks } from '../../src/engine/lineBooks';
import { lineMaterialPerWindow } from '../../src/engine/lineContract';
import { lineValue } from '../../src/engine/insurance';
import { renderAccounting } from '../../src/ui/accounting';
import { act, buyStartingKit, newGame, nextDay, placeEquipment, testJoiner, withAir } from '../helpers';

/** A company in the 800 m² unit, its line standing whole from this morning with two engineers on
 *  the books and two timber racks, the line's contract taken, and timber and glass for a month and
 *  more in hand. */
function company(cover: boolean): GameState {
  let state = newGame({ difficulty: 'veryEasy' });
  state.cash = 9000000;
  state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
  state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'second' }));
  state = withAir(buyStartingKit(state), 'industrial');
  state.cash = 3000000;
  state.reputation = 40;
  state.enquiries = [];
  for (let n = 0; n < 2; n += 1) placeEquipment(state, 'timberRack', { variantId: 'standard', x: 30, y: 2 + 2 * n, id: `kit-rack-${n + 1}` });
  LINE_MODULES.forEach((id, index) => placeEquipment(state, id, { x: 2 + 6 * index, y: 14, id: `kit-line-${index + 1}` }));
  for (const id of ['eng-1', 'eng-2']) {
    state.workers.push({ ...testJoiner(id, id), role: 'lineEngineer', tier: null, rate: 0, monthlyWage: 15000 });
  }
  if (cover) state.insurance.property = true;
  // The morning the line first stands, and its contract taken off the card.
  state = nextDay(state);
  state.windowLine.boards = 600;
  state.stock.sheets += 600;
  state.windowLine.glass = 300;
  return state;
}

/** Played day by day to the open of the first working day past `day`, an engineer away on one
 *  working day of it. */
function playTo(state: GameState, day: number, awayOn: number | null): GameState {
  let next = state;
  while (next.clock.day <= day || !isWorkingDay(next.clock.day)) {
    if (awayOn !== null && next.clock.day === awayOn) {
      const engineer = next.workers.find((worker) => worker.id === 'eng-1');
      if (engineer !== undefined) engineer.absentDaysRemaining = 1;
    }
    next = nextDay(next);
  }
  return next;
}

const first = company(false);
const stood = first.clock.day;
// The first working day of the month after, and a working day in it the engineer is away.
const monthStart = (monthOfDay(stood) + 1 - 1) * DAYS_PER_MONTH + 1;
let away = monthStart + 2;
while (!isWorkingDay(away)) away += 1;
// Played to the last minute of the month: the open of the first working day of the next one.
const played = playTo(first, monthStart + DAYS_PER_MONTH - 1, away);
/** The month played, closed in the book. */
const month = played.windowLine.days.filter((entry) => monthOfDay(entry.day) === monthOfDay(monthStart));

const covered = playTo(company(true), stood + 9, null);

describe('the line s day book (CLAUDE.md T31 2.5)', () => {
  it('starts on the morning the line first stands, and keeps one record a calendar day, weekends among them', () => {
    expect(played.windowLine.since.firstDay).toBe(stood);
    const days = played.windowLine.days.map((entry) => entry.day);
    expect(days[0]).toBe(stood);
    expect(days).toEqual(Array.from({ length: days.length }, (_, index) => stood + index));
    expect(month).toHaveLength(DAYS_PER_MONTH);
  });

  it('reckons each row of a played month from what it is reckoned from', () => {
    const windows = month.reduce((total, entry) => total + entry.windows, 0);
    // The windows of the month, from the ledger's own line a day.
    const fromLedger = played.ledger
      .filter((entry) => entry.label === 'Windows off the line: windows' && monthOfDay(entry.day) === monthOfDay(monthStart))
      .reduce((total, entry) => total + entry.amount, 0);
    const sum = (pick: (entry: LineDay) => number): number => month.reduce((total, entry) => total + pick(entry), 0);
    expect(windows).toBeGreaterThan(60);
    expect(sum((entry) => entry.turnover)).toBe(windows * LINE_WINDOW_PRICE);
    expect(sum((entry) => entry.turnover)).toBe(fromLedger);
    expect(sum((entry) => entry.material)).toBe(windows * lineMaterialPerWindow());
    // Each engineer's month over the month's days, every calendar day; the six modules' power.
    expect(sum((entry) => entry.engineers)).toBeCloseTo(2 * 15000, 6);
    expect(sum((entry) => entry.power)).toBe(DAYS_PER_MONTH * LINE_MODULES.length * LINE_MODULE_POWER_PER_DAY);
    expect(sum((entry) => entry.cover)).toBe(0);
  });

  it('counts the cover s share every calendar day while it is held', () => {
    const daily = (lineValue(covered) * PROPERTY_INSURANCE_RATE_YEARLY * unitCostFactor(covered.unit)) / DAYS_PER_YEAR;
    expect(daily).toBeCloseTo((10000000 * 0.02 * 2) / 360, 6);
    for (const entry of covered.windowLine.days) expect(entry.cover).toBeCloseTo(daily, 6);
  });

  it('reckons the efficiency against the working minutes the contract ran, and loses the day an engineer was away', () => {
    const lost = month.find((entry) => entry.day === away);
    expect(lost?.windows).toBe(0);
    expect(lost?.possibleMinutes).toBe(480);
    expect(lost?.lostWindows).toBeCloseTo(4, 9);
    expect(lost?.lost.engineer).toBe(480);
    // Every other working day ran all its minutes.
    for (const entry of month.filter((day) => isWorkingDay(day.day) && day.day !== away)) {
      expect(entry.possibleMinutes, `day ${entry.day}`).toBe(480);
      expect(entry.lost, `day ${entry.day}`).toEqual({ engineer: 0, moving: 0, timber: 0, glass: 0 });
    }
    for (const entry of month.filter((day) => !isWorkingDay(day.day))) expect(entry.possibleMinutes).toBe(0);
  });

  it('sums the paid back line over every day since the line first stood', () => {
    const net = (entry: LineDay): number => entry.turnover - entry.material - entry.engineers - entry.power - entry.cover;
    const all = [...played.windowLine.days, played.windowLine.today].reduce((total, entry) => total + net(entry), 0);
    const paid = linePaidBack(played);
    expect(paid.net).toBeCloseTo(all, 6);
    expect(paid.cost).toBe(10000000);
    expect(paid.share).toBe(Math.round((100 * all) / 10000000));
  });

  it('counts an upgrade bought in what the line has cost, and keeps it when the upgrades go with a sale', () => {
    const state = structuredClone(played);
    state.cash += 1000000;
    const bought = act(state, { type: 'BUY_LINE_UPGRADE', upgradeId: 'lineSoftware' });
    expect(linePaidBack(bought).cost).toBe(10300000);
    expect(linePaidBack(bought).upgrades).toBe(300000);
    bought.windowLine.upgrades = [];
    expect(linePaidBack(bought).cost).toBe(10300000);
  });

  it('keeps 400 days of the book and lets older ones go, the totals since the line stood kept whole', () => {
    const state = structuredClone(played);
    const since = { ...state.windowLine.since };
    const day = state.clock.day;
    state.windowLine.days = Array.from({ length: 450 }, (_, index) => emptyLineDay(day - 451 + index));
    state.windowLine.today = emptyLineDay(day - 1);
    openLineBooks(state);
    expect(state.windowLine.days.map((entry) => entry.day)[0]).toBe(day - 399);
    expect(state.windowLine.days).toHaveLength(399);
    expect(state.windowLine.today.day).toBe(day);
    expect(state.windowLine.since.firstDay).toBe(since.firstDay);
  });
});

describe('the Production line tab (CLAUDE.md T31 2.5)', () => {
  function tab(state: GameState, which: 'line' | 'summary' = 'line'): HTMLElement {
    const page = document.createElement('div');
    page.innerHTML = renderAccounting(state, which);
    return page;
  }

  it('is there once the line has stood and not before, after the Finance tab', () => {
    const before = newGame({ difficulty: 'veryEasy' });
    expect(lineHasStood(before)).toBe(false);
    expect(Array.from(tab(before, 'summary').querySelectorAll('[data-do="accountingTab"]')).map((chip) => chip.getAttribute('data-id'))).toEqual([
      'days',
      'summary',
      'reports',
      'finance',
    ]);
    // Asked for before it is there, the page is the Days tab.
    expect(tab(before).querySelector('.chip.is-on')?.getAttribute('data-id')).toBe('days');
    const chips = Array.from(tab(played).querySelectorAll('[data-do="accountingTab"]'));
    expect(chips.map((chip) => [chip.getAttribute('data-id'), chip.textContent])).toEqual([
      ['days', 'Days'],
      ['summary', 'Summary'],
      ['reports', 'Monthly reports'],
      ['finance', 'Finance'],
      ['line', 'Production line'],
    ]);
    expect(tab(played).querySelector('.chip.is-on')?.getAttribute('data-id')).toBe('line');
  });

  it('draws the four columns in the Summary s classes, each row as the book reckons it', () => {
    const page = tab(played);
    const columns = Array.from(page.querySelectorAll('.cols .col'));
    expect(columns.map((column) => column.querySelector('h3')?.textContent)).toEqual(['Today', 'This week', 'This month', 'This year']);
    const reckoned = lineColumns(played);
    const rows = (column: Element): string[][] =>
      Array.from(column.querySelectorAll('.row')).map((row) => [row.querySelector('.row-main')?.textContent ?? '', row.querySelector('.row-figure')?.textContent ?? '']);
    const money = (value: number): string => `${value < 0 ? '-' : ''}£${Math.round(Math.abs(value)).toLocaleString('en-GB')}`;
    for (const [index, column] of [reckoned.today, reckoned.week, reckoned.month, reckoned.year].entries()) {
      const drawn = rows(columns[index] as Element);
      expect(drawn.map((row) => row[0])).toEqual([
        'Windows made',
        'Turnover',
        'Timber and glass',
        'Engineers',
        'Power',
        'Property cover',
        'Net profit',
        'Efficiency',
      ]);
      expect(drawn[0]?.[1]).toBe(String(column.windows));
      expect(drawn[1]?.[1]).toBe(money(column.turnover));
      expect(drawn[2]?.[1]).toBe(money(-column.material));
      expect(drawn[3]?.[1]).toBe(money(-column.engineers));
      expect(drawn[4]?.[1]).toBe(money(-column.power));
      expect(drawn[5]?.[1]).toBe(money(-column.cover));
      expect(drawn[6]?.[1]).toBe(money(column.net));
      expect(drawn[7]?.[1]).toBe(
        column.efficiency === null ? `${column.windows} of ${column.couldMake}` : `${column.windows} of ${column.couldMake}, ${column.efficiency}%`,
      );
      // Each column's power is its days, six modules a day.
      expect(column.power).toBe(column.days * LINE_MODULES.length * LINE_MODULE_POWER_PER_DAY);
    }
    // The open of a month's first working day has no day of it closed: no pace is said yet.
    expect(lineMonthPace(played)).toBeNull();
    expect(page.textContent).not.toContain("this month's pace");
    expect(page.querySelector('.cols .col:nth-child(3) .row.is-total .row-main')?.textContent).toBe('Net profit');
  });

  it('reads the month s efficiency under a hundred with the day the engineer was away, and says what it lost', () => {
    // The month played is last month now: a page of the last minute of it.
    const lastDay = played.windowLine.days.filter((entry) => monthOfDay(entry.day) === monthOfDay(monthStart));
    expect(lastDay.length).toBe(DAYS_PER_MONTH);
    const atMonthEnd = structuredClone(played);
    atMonthEnd.windowLine.today = lastDay[lastDay.length - 1] as LineDay;
    atMonthEnd.windowLine.days = atMonthEnd.windowLine.days.filter((entry) => entry.day < atMonthEnd.windowLine.today.day);
    atMonthEnd.clock.day = atMonthEnd.windowLine.today.day;
    const column = lineColumns(atMonthEnd).month;
    expect(column.efficiency).toBeLessThan(100);
    // The four windows of the day the engineer was away, and no more: every other minute ran.
    expect(column.couldMake - column.windows).toBe(4);
    // The month played made every window its running minutes allowed, and lost one day's.
    const working = lastDay.filter((entry) => isWorkingDay(entry.day)).length;
    expect(column.couldMake).toBe(working * 4);
    const text = tab(atMonthEnd).textContent ?? '';
    expect(text).toContain(`${column.windows} of ${column.couldMake}, ${column.efficiency}%`);
    expect(text).toContain('Lost this month: 8 h for want of an engineer');
    // The month's working day and its pace, from its days closed in the book, today not among them.
    const pace = lineMonthPace(atMonthEnd);
    if (pace === null) throw new Error('no pace at the month end');
    const closed = lastDay.slice(0, -1);
    const net = closed.reduce((total, entry) => total + entry.turnover - entry.material - entry.engineers - entry.power - entry.cover, 0);
    const workingClosed = closed.filter((entry) => isWorkingDay(entry.day)).length;
    expect(pace.netADay).toBeCloseTo(net / workingClosed, 6);
    expect(pace.year).toBe(Math.round(((net / closed.length) * DAYS_PER_YEAR) / 1000) * 1000);
    const pounds = (value: number): string => `${value < 0 ? '-' : ''}£${Math.round(Math.abs(value)).toLocaleString('en-GB')}`;
    expect(text).toContain(`A working day on average this month: `);
    expect(text).toContain(`, ${pounds(pace.netADay)} net`);
    expect(text).toContain(`A year at this month's pace: ${pounds(pace.year)} net`);
    expect(text).toMatch(/Paid back: -?£[\d,]+ of £10,000,000, -?\d+%/);
  });

  it('reads the line s own book whether or not the books are up to date', () => {
    const behind = structuredClone(played);
    behind.booksUpToDay = 0;
    const page = tab(behind);
    expect(page.textContent).toContain('Books not up to date');
    expect(page.querySelector('.cols .col:nth-child(4) .row .row-figure')?.textContent).toBe(String(lineColumns(behind).year.windows));
  });
});
