// @vitest-environment jsdom
// The end (CLAUDE.md T21 2.2; docs/mockups/t21/debt.html part 3). The bankruptcy is the event it
// always was, in the folder skin with the one cross, and the drawing's dark card is a card inside
// it: the head, the day and the month, the four figures the bank read, what the company did with the
// time it had, and the two ways out of it.

import { describe, expect, it } from 'vitest';
import { formatCalendarDay } from '../../src/engine/index';
import { MODAL_SKINS } from '../../src/ui/modal';
import { renderEvent, renderEventFooter } from '../../src/ui/eventModal';
import type { GameEvent, GameState } from '../../src/engine/index';
import { eventsOfKind, newGame, runDays } from '../helpers';

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

/** The company Piotr played on 15 May: -7,259 in the bank and 25,740 of arrears it cannot pay, on
 *  the 10,000 overdraft of Very easy. One day of the clock and the bank closes it. */
function closedCompany(): { state: GameState; event: GameEvent } {
  const start = newGame({ difficulty: 'veryEasy' });
  start.cash = -7259;
  start.finance.arrearsAmount = 25740;
  start.finance.arrearsMonths = 1;
  start.finance.firstArrearsDay = 1;
  const run = runDays(start, 1);
  const event = eventsOfKind(run.events, 'bankruptcy')[0];
  if (event === undefined) throw new Error('the bank did not close it');
  return { state: run.state, event };
}

describe('the bankruptcy card', () => {
  it('is a card inside the event, which is a folder like every other one', () => {
    expect(MODAL_SKINS.event).toBe('folder');
    const { state, event } = closedCompany();
    const card = parse(renderEvent(state, event)).querySelector('.bank-card');
    expect(card).not.toBeNull();
    expect(card?.querySelector('h3')?.textContent).toBe('The bank has closed you');
  });

  it('says the day and the month it happened on, and which rule closed the company', () => {
    const { state, event } = closedCompany();
    const when = parse(renderEvent(state, event)).querySelector('.bank-when')?.textContent ?? '';
    expect(when).toContain(formatCalendarDay(state.gameOver?.day ?? 0));
    expect(when).toContain('month 1');
    expect(when).toContain(state.gameOver?.reason ?? 'nothing');
    expect(when).toContain('cannot pay');
  });

  it('prints the four figures the bank read, in the drawing’s order', () => {
    const { state, event } = closedCompany();
    const figs = parse(renderEvent(state, event)).querySelector('.bank-figs');
    const labels = Array.from(figs?.querySelectorAll('span') ?? [], (node) => node.textContent);
    expect(labels).toEqual(['In the bank', 'Arrears', 'Together', 'The bank allowed']);
    const values = Array.from(figs?.querySelectorAll('b') ?? [], (node) => node.textContent);
    // The figures are the event's own, which are the ones the engine was looking at.
    const owed = Math.round(state.finance.arrearsAmount);
    expect(values[0]).toBe(`-£${Math.abs(Math.round(state.cash)).toLocaleString('en-GB')}`);
    expect(values[1]).toBe(`-£${owed.toLocaleString('en-GB')}`);
    expect(values[2]).toBe(
      `-£${Math.abs(Math.round(state.cash) - owed).toLocaleString('en-GB')}`,
    );
    expect(values[3]).toBe('-£15,000');
  });

  it('says what the company did with the time it had', () => {
    const { state, event } = closedCompany();
    const kept = parse(renderEvent(state, event)).querySelector('.bank-kept')?.textContent ?? '';
    expect(kept).toContain('You kept the workshop');
    expect(kept).toContain('working day');
    expect(kept).toContain('in orders and built');
    // Nothing was ever taken on, so the line says so in pounds and in pieces.
    expect(kept).toContain('£0 in orders and built 0 of them');
  });

  it('offers a new company and a save, and nothing else', () => {
    const { event } = closedCompany();
    const footer = parse(renderEventFooter(event));
    const buttons = Array.from(footer.querySelectorAll('button'));
    expect(buttons.map((node) => node.textContent)).toEqual(['Start again', 'Load a save']);
    expect(buttons.map((node) => node.dataset.do)).toEqual(['restart', 'loadFromFile']);
    // The house amber is the first of the two, like every other first choice in the game.
    expect(buttons[0]?.className).toBe('btn btn-primary');
    expect(buttons[1]?.className).toBe('btn');
  });

  it('carries the one file field the Menu carries, so Load a save opens the browser picker', () => {
    const { state, event } = closedCompany();
    const field = parse(renderEvent(state, event)).querySelector('[data-field="saveFile"]');
    expect(field).not.toBeNull();
    expect(field?.getAttribute('type')).toBe('file');
    expect(field?.getAttribute('accept')).toBe('.json');
  });

  it('leaves every other event printing its plain body', () => {
    const state = newGame();
    const plain: GameEvent = {
      id: 'ev-1',
      kind: 'lowStock',
      title: 'Low stock',
      body: 'The rack is nearly empty.',
      choices: [{ id: 'ok', label: 'Right' }],
      data: {},
      day: 1,
      minute: 480,
    };
    const html = renderEvent(state, plain);
    expect(html).toContain('event-body');
    expect(html).not.toContain('bank-card');
    expect(renderEventFooter(plain)).toContain('data-do="resolveEvent"');
  });
});
