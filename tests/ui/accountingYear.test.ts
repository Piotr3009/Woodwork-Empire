// @vitest-environment jsdom
// The books say what the year has come to, and the Days tab can be walked back a month at a time
// (CLAUDE.md T7 3.9).

import { describe, expect, it } from 'vitest';
import { DAYS_PER_MONTH } from '../../src/engine/constants';
import { daysOfMonth, monthsOfYear, netOf, yearTotals } from '../../src/engine/economy';
import { renderAccounting } from '../../src/ui/accounting';
import { formatCalendarDay, monthName } from '../../src/engine/index';
import type { GameState, LedgerEntry } from '../../src/engine/index';
import { newGame } from '../helpers';

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

/** A ledger with money moving on named days, so the arithmetic can be read off the assertions. */
function withLedger(days: Array<[number, number]>): GameState {
  const state = newGame();
  state.booksUpToDay = 1000;
  state.ledger = days.map(([day, amount], index): LedgerEntry => ({
    id: `led-${index}`,
    day,
    minute: 0,
    category: amount >= 0 ? 'jobBalance' : 'material',
    label: `day ${day}`,
    amount,
    balance: 0,
    unpaid: false,
  }));
  return state;
}

describe('the year in the books', () => {
  it('adds up to exactly the sum of its months', () => {
    // Three months of one year, and a day of the next one that must not be counted in.
    const state = withLedger([
      [2, 400],
      [3, -150],
      [DAYS_PER_MONTH + 2, 900],
      [DAYS_PER_MONTH * 2 + 5, -250],
      [DAYS_PER_MONTH * 12 + 1, 5000],
    ]);
    const months = monthsOfYear(state, 1);
    expect(months.map((row) => row.month)).toEqual([1, 2, 3]);
    const year = yearTotals(state, 1);
    expect(year.income).toBe(months.reduce((sum, row) => sum + row.income, 0));
    expect(year.costs).toBe(months.reduce((sum, row) => sum + row.costs, 0));
    expect(netOf(year)).toBe(months.reduce((sum, row) => sum + row.net, 0));
    // And the next year is its own: the 5,000 of month thirteen is not in it.
    expect(netOf(year)).toBe(400 - 150 + 900 - 250);
    expect(netOf(yearTotals(state, 2))).toBe(5000);
  });

  it('adds the days of a month up to the month itself', () => {
    const state = withLedger([
      [2, 400],
      [3, -150],
      [3, 60],
    ]);
    const days = daysOfMonth(state, 1);
    expect(days.map((row) => row.day)).toEqual([2, 3]);
    const month = monthsOfYear(state, 1)[0];
    expect(month?.income).toBe(days.reduce((sum, row) => sum + row.income, 0));
    expect(month?.costs).toBe(days.reduce((sum, row) => sum + row.costs, 0));
  });
});

describe('what the books show', () => {
  it('puts this year beside today, this week and this month on the Summary', () => {
    const state = withLedger([
      [1, 400],
      [DAYS_PER_MONTH + 2, 900],
    ]);
    const page = parse(renderAccounting(state, 'summary'));
    const headings = Array.from(page.querySelectorAll('.col h3')).map((node) => node.textContent);
    expect(headings).toEqual(['Today', 'This week', 'This month', 'This year']);
    // The year carries both months of it.
    const year = Array.from(page.querySelectorAll('.col'))[3];
    expect(year?.textContent).toContain('£1,300');
  });

  it('gives the Days tab a month a chip, and opens the one it is asked for', () => {
    const state = withLedger([
      [2, 400],
      [DAYS_PER_MONTH + 2, 900],
      [DAYS_PER_MONTH * 2 + 5, -250],
    ]);
    const page = parse(renderAccounting(state, 'days'));
    const chips = Array.from(page.querySelectorAll('[data-do="accountingMonth"]'));
    expect(chips.map((chip) => chip.textContent)).toEqual([monthName(1), monthName(2), monthName(3)]);
    // The clock is in month one, so month one is the one that is open.
    expect(chips[0]?.className).toContain('is-on');
    expect(page.innerHTML).toContain(formatCalendarDay(2));
    expect(page.innerHTML).not.toContain(formatCalendarDay(DAYS_PER_MONTH + 2));
    // Ask for month two and the rows are month two's.
    const second = parse(renderAccounting(state, 'days', [], 2));
    expect(second.innerHTML).toContain(formatCalendarDay(DAYS_PER_MONTH + 2));
    expect(second.innerHTML).not.toContain(`${formatCalendarDay(2)}<`);
    expect(
      Array.from(second.querySelectorAll('[data-do="accountingMonth"]'))[1]?.className,
    ).toContain('is-on');
  });

  it('says so plainly when a month of the year has nothing in it', () => {
    const state = withLedger([
      [2, 400],
      [DAYS_PER_MONTH * 2 + 5, -250],
    ]);
    const page = parse(renderAccounting(state, 'days', [], 2));
    expect(page.textContent).toContain(`Nothing has moved in ${monthName(2)}`);
  });
});
