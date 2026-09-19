// @vitest-environment jsdom
// The month end (CLAUDE.md T13 3.20): every ledger category on exactly one line of the report,
// the lines summing to the cash delta of a played month, and the modal printing every line with
// its sign's colour and the cash at open and close.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MONTH_LINES, MONTH_LINE_OF, charge, monthReport } from '../../src/engine/economy';
import { monthEfficiency } from '../../src/engine/efficiency';
import { machineSavings } from '../../src/engine/machines';
import { monthRate, weekRate } from '../../src/engine/rate';
import { daySummaryOf, monthName } from '../../src/engine/index';
import { renderCompany } from '../../src/ui/company';
import { renderMonthEnd, renderMonthReport } from '../../src/ui/monthEnd';
import type { GameEvent, GameState } from '../../src/engine/index';
import { buyStartingKit, eventsOfKind, newGame, runToDay } from '../helpers';

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

/** Every literal of the `LedgerCategory` union, read off the source, because a union of string
 *  literals cannot be walked at run time (the way `turn13Contracts.test.ts` reads the actions). */
function declaredCategories(): string[] {
  const source = readFileSync('src/engine/types.ts', 'utf8');
  const start = source.indexOf('export type LedgerCategory');
  const union = source.slice(start, source.indexOf('\n\n', start));
  return Array.from(union.matchAll(/\| '([a-zA-Z]+)'/g), (match) => match[1] ?? '').filter(
    (category) => category !== '',
  );
}

function monthEndEvent(events: GameEvent[], month: number): GameEvent {
  const event = eventsOfKind(events, 'monthEnd').find((entry) => entry.data.month === month);
  if (!event) throw new Error(`no month end for month ${month}`);
  return event;
}

describe('the table', () => {
  it('puts every ledger category on exactly one line, and every line is one the folder prints', () => {
    const declared = declaredCategories();
    expect(declared.length).toBeGreaterThan(30);
    expect(new Set(Object.keys(MONTH_LINE_OF))).toEqual(new Set(declared));
    const lineIds = new Set(MONTH_LINES.map((line) => line.id));
    for (const category of declared) {
      expect(lineIds.has(MONTH_LINE_OF[category as keyof typeof MONTH_LINE_OF])).toBe(true);
    }
    expect(MONTH_LINES.map((line) => line.id)).toEqual(Array.from(lineIds));
    // The lines the brief names, in its order, are all there.
    const labels = MONTH_LINES.map((line) => line.label.toLowerCase());
    for (const wanted of ['revenue', 'material', 'day', 'night', 'draw', 'rent and rates', 'power',
      'insurance', 'security', 'loan', 'interest', 'contract', 'waste']) {
      expect(labels.some((label) => label.includes(wanted))).toBe(true);
    }
  });
});

describe('a played month', () => {
  const played = runToDay(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 62);
  const state: GameState = played.state;

  it('sums its lines to the cash at the close less the cash at the open, and stores nothing', () => {
    for (const month of [1, 2]) {
      const report = monthReport(state, month);
      const net = report.lines.reduce((total, line) => total + line.net, 0);
      expect(net).toBeCloseTo(report.net, 6);
      expect(report.income - report.costs).toBeCloseTo(report.net, 6);
      expect(report.cashClose - report.cashOpen).toBeCloseTo(report.net, 2);
      expect(report.lines).toHaveLength(MONTH_LINES.length);
    }
    expect(monthReport(state, 1).cashClose).toBe(monthReport(state, 2).cashOpen);
    expect(state).not.toHaveProperty('monthReports');
  });

  it('puts the rent, the power, the draw and the kit where the brief says', () => {
    const report = monthReport(state, 1);
    const line = (id: string) => report.lines.find((entry) => entry.id === id);
    expect(line('rentAndRates')?.costs).toBeGreaterThan(0);
    expect(line('power')?.costs).toBeGreaterThan(0);
    expect(line('ownerDraw')?.costs).toBe(200 * 22);
    expect(line('equipment')?.costs).toBeGreaterThan(0);
    expect(line('loan')?.net).toBe(0);
    expect(line('contract')?.net).toBe(0);
  });

  it('is raised on the first working day of the month and rendered with every line', () => {
    const event = monthEndEvent(played.events, 1);
    expect(event.day).toBe(31);
    const page = parse(renderMonthEnd(state, event));
    const box = page.querySelector('.month-end');
    expect(box?.getAttribute('data-month')).toBe('1');
    expect(page.querySelector('.event-body')?.textContent).toBe(event.body);
    const rows = Array.from(page.querySelectorAll('.month-line'));
    expect(rows.map((row) => row.getAttribute('data-line'))).toEqual(MONTH_LINES.map((line) => line.id));
    const report = monthReport(state, 1);
    const rent = rows.find((row) => row.getAttribute('data-line') === 'rentAndRates');
    const figures = Array.from(rent?.querySelectorAll('.row-figure') ?? []);
    expect(figures[1]?.className).toContain('bad');
    expect(figures[2]?.className).toContain('bad');
    expect(figures[2]?.textContent).toBe(`-£${Math.round(report.lines[6]?.costs ?? 0).toLocaleString('en-GB')}`);
    const net = page.querySelector('.month-net .row-figure');
    expect(net?.className).toContain(report.net < 0 ? 'bad' : 'good');
    expect(page.querySelector('[data-cash="open"] .row-figure')?.textContent).toBe(
      `£${Math.round(report.cashOpen).toLocaleString('en-GB')}`,
    );
    expect(page.querySelector('[data-cash="close"]')).not.toBeNull();
    expect(page.querySelector('.month-end .warn')).toBeNull();
  });

  it('prints a plus in green on a line that took money', () => {
    const report = monthReport(state, 1);
    const revenue = report.lines.find((line) => line.id === 'revenue');
    if (revenue) {
      revenue.income = 1200;
      revenue.net = 1200 - revenue.costs;
    }
    const page = parse(renderMonthReport(report));
    const row = page.querySelector('.month-line[data-line="revenue"]');
    const figures = Array.from(row?.querySelectorAll('.row-figure') ?? []);
    expect(figures[0]?.textContent).toBe('+£1,200');
    expect(figures[0]?.className).toContain('good');
  });

  it('carries no arrears row, on a month that went under the overdraft limit', () => {
    // 2.4: the card drops the row it carried for the bills that went to the arrears, and nothing
    // else on it moves. The month is played on Hard with the account taken to the overdraft floor
    // first, which is the month that used to carry that row: every bill of it is on a line now and
    // the report still adds up to the cash it moved (CLAUDE.md T22 2.1, 2.4).
    const hard = newGame({ difficulty: 'hard' });
    // Down to the overdraft floor through the ledger, the way every pound moves (T13 10.2), so the
    // report's own cash at the open is the cash the ledger says it was.
    charge(hard, 'equipment', 'A machine that took the lot', -(hard.cash - hard.finance.overdraftLimit));
    const played = runToDay(hard, 20).state;
    expect(played.cash).toBeLessThan(played.finance.overdraftLimit);
    const report = monthReport(played, 1);
    const page = parse(renderMonthReport(report));
    // No paragraph at all under the two cash rows, and not a word of the arrears anywhere.
    expect(page.querySelector('.month-end .warn')).toBeNull();
    expect(page.querySelector('.month-end p')).toBeNull();
    expect(page.textContent).not.toContain('arrears');
    expect(page.textContent).not.toContain('unpaid');
    // And nothing else moved: the head, every line of the table, the three totals and the two cash
    // rows are where they were.
    const rows = Array.from(page.querySelectorAll('.month-line'));
    expect(rows.map((row) => row.getAttribute('data-line'))).toEqual(
      MONTH_LINES.map((line) => line.id),
    );
    expect(page.querySelectorAll('.month-total')).toHaveLength(3);
    expect(page.querySelector('[data-cash="open"]')).not.toBeNull();
    expect(page.querySelector('[data-cash="close"]')).not.toBeNull();
    expect(report.cashClose - report.cashOpen).toBeCloseTo(report.net, 2);
  });
});

describe('the workshop rate and Total efficiency (CLAUDE.md T17 2.25, 2.26)', () => {
  const played = runToDay(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 62);
  const state: GameState = played.state;

  it('puts the month’s rate first, and prints the same function’s number as the Company board', () => {
    const event = monthEndEvent(played.events, 1);
    const page = parse(renderMonthEnd(state, event));
    const rate = monthRate(state, 1);
    expect(rate.days).toBeGreaterThan(15);
    expect(page.querySelector('.rate-big')?.textContent).toBe(`Workshop earned £${Math.round(rate.rate)} an hour`);
    // First: the figure stands above the event's own sentence and the money table.
    expect(page.firstElementChild?.className).toBe('rate-figure');
  });

  it('prints the same function’s number as the Company board, over the same days', () => {
    // A workshop whose whole history is one working week: the board's rolling five days and the
    // month's days are then the same days, so the two figures must read the same pound
    // (CLAUDE.md T17 2.26, cross check of section 7).
    const week = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    const blank = daySummaryOf(newGame());
    week.days = [1, 2, 3, 4, 5].map((day) => ({ ...blank, day, labourValue: 250, paidHours: 8 }));
    week.clock.day = 8;
    expect(weekRate(week).rate).toBe(monthRate(week, 1).rate);
    const board = parse(renderCompany(week)).querySelector('.rate-big')?.textContent ?? '';
    const event: GameEvent = {
      id: 'ev-1',
      kind: 'monthEnd',
      title: monthName(1),
      body: 'The month is over.',
      choices: [{ id: 'ok', label: 'Right' }],
      data: { month: 1 },
      day: 8,
      minute: 0,
    };
    const folder = parse(renderMonthEnd(week, event)).querySelector('.rate-big')?.textContent ?? '';
    expect(board).toBe('Workshop earns £31 an hour');
    expect(folder).toBe('Workshop earned £31 an hour');
    expect(board.replace('earns', 'earned')).toBe(folder);
  });

  it('adds up the month’s machines, people, hall and waiting under the money', () => {
    const event = monthEndEvent(played.events, 1);
    const page = parse(renderMonthEnd(state, event));
    const section = page.querySelector('.month-efficiency');
    expect(section?.querySelector('h3')?.textContent).toBe('Total efficiency');
    const rows = Array.from(section?.querySelectorAll('[data-efficiency]') ?? []);
    expect(rows.map((row) => row.getAttribute('data-efficiency'))).toEqual([
      'machines',
      'people',
      'hall',
      'waiting',
      'total',
    ]);
    const month = monthEfficiency(state, 1);
    const machines = machineSavings(state, 'month');
    expect(rows[0]?.querySelector('.row-figure')?.textContent).toBe(
      `ran ${machines.hours} h, saved ${machines.hoursSaved} h`,
    );
    expect(rows[1]?.querySelector('.row-figure')?.textContent).toBe(
      `${month.workedHours} h of real work out of ${month.paidHours} h paid for`,
    );
    expect(rows[2]?.querySelector('.row-figure')?.textContent).toBe(month.hallFactor.toFixed(2));
    expect(rows[3]?.querySelector('.row-figure')?.textContent).toBe(
      `${Math.round(month.waitingMinutes)} minutes lost`,
    );
    // The one line the brief asks for, in its own words.
    expect(rows[4]?.querySelector('.row-main')?.textContent).toBe('Total efficiency');
    expect(rows[4]?.querySelector('.row-figure')?.textContent).toBe(
      `${month.percent}% = real work over paid hours`,
    );
    // Real work over paid hours, and nothing else: the month's own hours, not the day's seats.
    expect(month.percent).toBe(Math.round((month.workedHours / month.paidHours) * 100));
    expect(month.paidHours).toBe(monthRate(state, 1).paidHours);
    // The section comes after the money, and the money table is untouched.
    const blocks = Array.from(page.children).map((node) => node.className);
    expect(blocks.indexOf('month-efficiency')).toBe(blocks.length - 1);
    expect(page.querySelector('.month-end')).not.toBeNull();
  });
});
