// @vitest-environment jsdom
// The month end (CLAUDE.md T13 3.20): every ledger category on exactly one line of the report,
// the lines summing to the cash delta of a played month, and the modal printing every line with
// its sign's colour and the cash at open and close.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MONTH_LINES, MONTH_LINE_OF, monthReport } from '../../src/engine/economy';
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

  it('prints a plus in green on a line that took money, and says what went unpaid', () => {
    const report = monthReport(state, 1);
    const revenue = report.lines.find((line) => line.id === 'revenue');
    if (revenue) {
      revenue.income = 1200;
      revenue.net = 1200 - revenue.costs;
    }
    report.unpaid = 350;
    const page = parse(renderMonthReport(report));
    const row = page.querySelector('.month-line[data-line="revenue"]');
    const figures = Array.from(row?.querySelectorAll('.row-figure') ?? []);
    expect(figures[0]?.textContent).toBe('+£1,200');
    expect(figures[0]?.className).toContain('good');
    expect(page.querySelector('.month-end .warn')?.textContent).toContain('£350');
  });
});
