// @vitest-environment jsdom
// The end of day summary is a preference, not a rule: the day ends the same way whatever the
// player asked for, and only the modal is skipped (CLAUDE.md T4 3.6).

import { describe, expect, it } from 'vitest';
import { renderDayEnd } from '../../src/ui/dayEnd';
import { renderMenu } from '../../src/ui/topbar';
import { currentState, mount } from '../../src/ui/app';
import { formatMoney, summaryOfDay, tick } from '../../src/engine/index';
import type { GameEvent, GameState } from '../../src/engine/index';
import { act, buyStartingKit, choose, eventsOfKind, newGame, runDays } from '../helpers';

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

/** What the five working days of week 1 cost, straight off the ledger. */
function spentInWeekOne(state: GameState): number {
  return state.ledger
    .filter((entry) => entry.day <= 5 && entry.amount < 0)
    .reduce((total, entry) => total - entry.amount, 0);
}

describe('the cadence control', () => {
  it('offers the three spans in the summary and in the Menu, and daily is the default', () => {
    let state = buyStartingKit(newGame());
    expect(state.summaryCadence).toBe('daily');
    for (const html of [renderDayEnd(state), renderMenu(state, { available: false, signedIn: null })]) {
      const node = parse(html);
      expect(node.innerHTML).toContain('Show this:');
      expect(node.querySelector('[data-do="setCadence"][data-id="daily"]')).not.toBeNull();
      expect(node.querySelector('[data-do="setCadence"][data-id="weekly"]')).not.toBeNull();
      expect(node.querySelector('[data-do="setCadence"][data-id="monthly"]')).not.toBeNull();
    }
    expect(parse(renderDayEnd(state)).querySelector('.chip.is-on')?.textContent).toBe('every day');
    state = act(state, { type: 'SET_SUMMARY_CADENCE', cadence: 'weekly' });
    expect(state.summaryCadence).toBe('weekly');
    expect(parse(renderDayEnd(state)).querySelector('.chip.is-on')?.textContent).toBe('every week');
  });
});

describe('the cadence in the Menu, driven through the page', () => {
  it('is offered there as well as on the summary, and changing it there sticks', () => {
    document.body.innerHTML = '<div id="app"></div>';
    const root = document.querySelector('#app');
    if (!(root instanceof HTMLElement)) throw new Error('no root');
    mount(root);
    const click = (selector: string): void => {
      const element = root.querySelector(selector);
      if (element === null) throw new Error(`nothing to click: ${selector}`);
      element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    };
    click('[data-do="startGame"]');
    expect(currentState()?.summaryCadence).toBe('daily');
    click('[data-do="toggleMenu"]');
    expect(root.innerHTML).toContain('Show this:');
    for (const cadence of ['weekly', 'monthly', 'daily'] as const) {
      click(`[data-do="setCadence"][data-id="${cadence}"]`);
      expect(currentState()?.summaryCadence).toBe(cadence);
      // The Menu stays open, so the three chips are still there to change his mind with.
      const on = root.querySelector('.menu-pop .chip.is-on');
      expect(on).not.toBeNull();
    }
  });
});

describe('the evening summary and the record of the day', () => {
  it('is the one that was written down, not the books as they stand now', () => {
    // Run the first day out to the modal it ends on.
    let state = buyStartingKit(newGame());
    for (let guard = 0; guard < 400 && state.activeEvent?.kind !== 'dayEnd'; guard += 1) {
      state = state.activeEvent === null ? tick(state, 15) : choose(state, 'ok');
    }
    expect(state.activeEvent?.kind).toBe('dayEnd');
    const recorded = summaryOfDay(state, state.clock.day);
    expect(recorded).not.toBeNull();
    // Money moves behind the modal, the way a bill paid off the Accounting screen does. The
    // evening still shows the day that closed, which is what the Days tab will open later.
    const later = { ...state, cash: state.cash - 1234 };
    expect(renderDayEnd(later)).toContain(formatMoney(recorded?.cash ?? 0));
    expect(renderDayEnd(later)).not.toContain(formatMoney(later.cash));
  });
});

describe('a week at the weekly cadence', () => {
  it('puts the summary up once in five working days, with the week in it', () => {
    const daily = runDays(buyStartingKit(newGame()), 5);
    expect(eventsOfKind(daily.events, 'dayEnd')).toHaveLength(5);

    const start = act(buyStartingKit(newGame()), {
      type: 'SET_SUMMARY_CADENCE',
      cadence: 'weekly',
    });
    const seen: GameEvent[] = [];
    const run = runDays(start, 5);
    seen.push(...run.events);
    const summaries = eventsOfKind(seen, 'dayEnd');
    expect(summaries).toHaveLength(1);
    expect(summaries[0]?.day).toBe(5);
    expect(summaries[0]?.title).toBe('End of week 1');
    // Five working days went by all the same.
    expect(run.state.clock.day).toBeGreaterThanOrEqual(6);
  });

  it('carries the figures of the week, not of the day', () => {
    const start = act(buyStartingKit(newGame()), {
      type: 'SET_SUMMARY_CADENCE',
      cadence: 'weekly',
    });
    // Four working days behind it, so the fifth is the Friday the summary lands on.
    const friday = runDays(start, 4).state;
    expect(friday.clock.day).toBe(5);
    const week = friday.finance.week;
    expect(week.costs).toBeCloseTo(spentInWeekOne(friday), 6);
    expect(week.costs).toBeGreaterThan(friday.finance.day.costs);
    const node = parse(renderDayEnd(friday));
    const html = node.innerHTML;
    expect(html).toContain('Money this week');
    expect(html).not.toContain('Money today');
    // The figures under that heading are the week's, not the Friday's.
    const money = Array.from(node.querySelectorAll('.col'))
      .find((col) => (col.querySelector('h3')?.textContent ?? '').startsWith('Money'));
    const figures = Array.from(money?.querySelectorAll('.row') ?? []).map((row) => [
      row.querySelector('.row-main')?.textContent,
      row.querySelector('.row-figure')?.textContent,
    ]);
    expect(figures).toEqual([
      ['In', formatMoney(week.income)],
      ['Out', formatMoney(-week.costs)],
      ['Net', formatMoney(week.income - week.costs)],
      ['In the bank', formatMoney(friday.cash)],
    ]);
    // And they are not the day's, which is the whole point of the cadence.
    expect(formatMoney(week.costs)).not.toBe(formatMoney(friday.finance.day.costs));
    // The owner's minutes and the day's work are a day's figures whatever the cadence, and the
    // headings say so rather than letting the week's title speak for them.
    expect(html).toContain(`Your minutes, day ${friday.clock.day}`);
    expect(html).toContain(`The hall, day ${friday.clock.day}`);
  });
});
