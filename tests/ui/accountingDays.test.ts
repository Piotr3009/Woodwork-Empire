// @vitest-environment jsdom
// The books a day at a time, and the evening's own summary put back in front of the player
// (CLAUDE.md T6 3.9).

import { beforeAll, describe, expect, it } from 'vitest';
import { advanceMinutes, currentState, mount } from '../../src/ui/app';
import { renderAccounting } from '../../src/ui/accounting';
import { daysOfMonth, ledgerOfDay, summaryOfDay } from '../../src/engine/index';
import type { GameState } from '../../src/engine/index';
import { buyStartingKit, newGame, runDays } from '../helpers';

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

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

/** Three working days on the books, written up so nothing is hidden. */
function threeDays(): GameState {
  const run = runDays(buyStartingKit(newGame()), 3);
  const state = run.state;
  state.booksUpToDay = state.clock.day;
  return state;
}

describe('the Days tab', () => {
  const state = threeDays();

  it('gives every day of the month its own row, newest first', () => {
    const rows = daysOfMonth(state);
    expect(rows.length).toBeGreaterThanOrEqual(3);
    const page = parse(renderAccounting(state, '', 'days'));
    const shown = Array.from(page.querySelectorAll('.day-row')).map((row) =>
      Number(row.getAttribute('data-day')),
    );
    expect(shown).toEqual(rows.map((row) => row.day).reverse());
  });

  it('nets what the ledger nets, day by day, because it is the ledger added up', () => {
    for (const row of daysOfMonth(state)) {
      const lines = ledgerOfDay(state, row.day);
      const income = lines.filter((line) => line.amount > 0).reduce((sum, l) => sum + l.amount, 0);
      const costs = lines.filter((line) => line.amount < 0).reduce((sum, l) => sum - l.amount, 0);
      expect(row.income, `day ${row.day}`).toBeCloseTo(income, 6);
      expect(row.costs, `day ${row.day}`).toBeCloseTo(costs, 6);
      expect(row.net, `day ${row.day}`).toBeCloseTo(income - costs, 6);
    }
  });

  it('opens a row on its own ledger lines, and only the rows the player opened', () => {
    const shut = parse(renderAccounting(state, '', 'days', []));
    const closed = shut.querySelector('.day-row[data-day="1"]');
    expect(closed).not.toBeNull();
    expect(closed?.innerHTML).not.toContain('Unit deposit');
    expect(closed?.querySelectorAll('.row')).toHaveLength(1);
    const page = parse(renderAccounting(state, '', 'days', [1]));
    const first = page.querySelector('.day-row[data-day="1"]');
    // The head row plus one line per ledger entry of that day.
    const lines = Array.from(first?.querySelectorAll('.row') ?? []);
    expect(lines.length).toBe(ledgerOfDay(state, 1).length + 1);
    expect(first?.innerHTML).toContain('Unit deposit');
    // Its neighbour stays shut.
    expect(page.querySelector('.day-row[data-day="2"]')?.innerHTML).not.toContain('Living costs');
  });

  it('says which rows are open in the markup it writes', () => {
    // Which rows are open is state and not a browser detail (CLAUDE.md T3 3.4). That it survives
    // the body being written again every game minute is driven through the page below.
    expect(renderAccounting(state, '', 'days', [1])).toContain('aria-expanded="true"');
    expect(renderAccounting(state, '', 'days', [])).toContain('aria-expanded="false"');
  });

  it('offers the day its summary, and only for a day the state still carries', () => {
    const page = parse(renderAccounting(state, '', 'days'));
    expect(summaryOfDay(state, 1)).not.toBeNull();
    expect(page.querySelector('[data-do="openDaySummary"][data-id="1"]')).not.toBeNull();
    const forgotten = { ...state, days: [] };
    const bare = parse(renderAccounting(forgotten, '', 'days'));
    expect(bare.querySelector('[data-do="openDaySummary"]')).toBeNull();
  });

  it('shows the earned labour rate on the Summary tab and nowhere else', () => {
    expect(parse(renderAccounting(state, '', 'summary')).innerHTML).toContain(
      'Earned labour rate',
    );
    expect(parse(renderAccounting(state, '', 'days')).innerHTML).not.toContain(
      'Earned labour rate',
    );
  });
});

describe('a past day put back on the screen', () => {
  beforeAll(() => {
    document.body.innerHTML = '<div id="app"></div>';
    mount(root());
    click('[data-do="startGame"]');
    const started = currentState();
    if (started) Object.assign(started, threeDays());
    click('[data-do="setView"][data-view="office"]');
    click('[data-office="binder"]');
  });

  it('opens the same summary the evening showed, from the row', () => {
    const state = currentState();
    const summary = state === null ? null : summaryOfDay(state, 1);
    expect(summary).not.toBeNull();
    click('[data-do="toggleDay"][data-id="1"]');
    expect(root().querySelector('.day-row[data-day="1"]')?.innerHTML).toContain('Unit deposit');
    // The modal body is written again every game minute. A details element would snap shut under
    // him; the row he opened is still open (CLAUDE.md T3 3.4).
    advanceMinutes(1);
    const stillOpen = root().querySelector('.day-row[data-day="1"]');
    expect(stillOpen?.innerHTML).toContain('Unit deposit');
    expect(stillOpen?.querySelector('.day-toggle')?.getAttribute('aria-expanded')).toBe('true');
    click('[data-do="openDaySummary"][data-id="1"]');
    const modal = root().querySelector('[data-modal="daySummary"]');
    expect(modal).not.toBeNull();
    expect(modal?.querySelector('h2')?.textContent).toBe(summary?.title);
    expect(modal?.innerHTML).toContain('Your minutes, day 1');
    expect(modal?.innerHTML).toContain('The hall, day 1');
    // The books are still open behind it.
    expect(root().querySelector('[data-modal="accounting"]')).not.toBeNull();
    click('[data-modal="daySummary"] [data-do="closeModal"]');
    expect(root().querySelector('[data-modal="daySummary"]')).toBeNull();
  });
});
