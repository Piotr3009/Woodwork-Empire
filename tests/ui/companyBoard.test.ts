// @vitest-environment jsdom
// The company board on the office wall: week by week with plus and minus on the left, and what the
// hall is turning out and why on the right (PIOTR, 13.09; CLAUDE.md T9 3.10).

import { beforeAll, describe, expect, it } from 'vitest';
import { REPUTATION_START } from '../../src/engine/constants';
import { changeReputation } from '../../src/engine/reputation';
import { outputBreakdown } from '../../src/engine/machines';
import { renderCompany, weeksOf } from '../../src/ui/company';
import { currentState, mount, render } from '../../src/ui/app';
import type { GameState } from '../../src/engine/index';
import { buyStartingKit, fillRack, newGame } from '../helpers';

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

/** A company with a fortnight of history behind it. */
function traded(): GameState {
  const state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 40);
  state.clock.day = 3;
  changeReputation(state, 3, 'Bookcase: on time');
  changeReputation(state, -1, 'Bookcase: calls not answered');
  state.clock.day = 9;
  changeReputation(state, 5, 'Wardrobe: express, on time');
  state.clock.day = 11;
  changeReputation(state, -10, 'Dropped: Garage shelves');
  return state;
}

beforeAll(() => {
  document.body.innerHTML = '<div id="app"></div>';
  mount(root());
  click('[data-do="startGame"]');
  click('[data-do="setSpeed"][data-speed="1"]');
  const state = currentState();
  if (state === null) throw new Error('no game');
  Object.assign(state, traded());
  render();
});

describe('the board on the wall', () => {
  it('is a third board in the room, right of the door, and it opens the modal', () => {
    click('[data-do="setView"][data-view="office"]');
    const board = root().querySelector('[data-office="company"]');
    expect(board).not.toBeNull();
    expect(board?.getAttribute('style')).toContain('left:985px');
    expect(board?.getAttribute('style')).toContain('top:170px');
    click('[data-office="company"]');
    const modal = root().querySelector('.modal-layer .modal');
    expect(modal?.getAttribute('data-modal')).toBe('company');
    // A board is a thing to read, so it fills the page (CLAUDE.md T9 1, 3.12).
    expect(modal?.classList.contains('modal-full')).toBe(true);
    click('[data-modal="company"] [data-do="closeModal"]');
  });

  it('is read on a stopped clock, like the Work Plan', () => {
    click('[data-do="setSpeed"][data-speed="0"]');
    click('[data-office="company"]');
    expect(currentState()?.speed).toBe(0);
    expect(root().querySelector('[data-modal="company"]')).not.toBeNull();
    click('[data-modal="company"] [data-do="closeModal"]');
    click('[data-do="setSpeed"][data-speed="1"]');
  });
});

describe('week by week', () => {
  it('cuts the log into weeks, newest first, with the week’s own total', () => {
    const weeks = weeksOf(traded());
    expect(weeks.map((week) => week.week)).toEqual([2, 1]);
    expect(weeks[0]?.total).toBe(-5);
    expect(weeks[1]?.total).toBe(2);
    expect(weeks[0]?.entries.map((entry) => entry.reason)).toEqual([
      'Wardrobe: express, on time',
      'Dropped: Garage shelves',
    ]);
  });

  it('draws every line with its points, and says what the reputation is now', () => {
    const state = traded();
    const page = parse(renderCompany(state));
    const text = page.textContent ?? '';
    expect(text).toContain('Bookcase: on time');
    expect(text).toContain('+3');
    expect(text).toContain('Dropped: Garage shelves');
    expect(text).toContain('−10');
    expect(text).toContain(`Reputation now ${state.reputation}`);
    expect(text).toContain(`started at ${REPUTATION_START}`);
  });

  it('says so plainly when nothing has moved the reputation yet', () => {
    const quiet = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 0);
    expect(renderCompany(quiet)).toContain('Nothing has moved the reputation yet.');
  });
});

describe('the output column', () => {
  it('shows the number, the lines that make it and the sum of them', () => {
    const state = traded();
    state.dust = 80;
    const breakdown = outputBreakdown(state);
    const text = parse(renderCompany(state)).textContent ?? '';
    expect(text).toContain(breakdown.total.toFixed(2));
    expect(text).toContain('base');
    // The line Piotr asked for: 1.00 base, the plus column, the minus column and the answer.
    expect(text).toContain(`1.00 base`);
    for (const line of breakdown.lines.filter((entry) => entry.hall)) {
      expect(text, line.label).toContain(line.label);
    }
  });

  it('puts the men and the machines beside it, saying where they act', () => {
    const state = traded();
    state.owner.overtimeDebt = 0.1;
    const text = parse(renderCompany(state)).textContent ?? '';
    expect(text).toContain('Overtime, carried into today');
    expect(text).toContain('your own minutes');
    expect(text).toContain('the stage it does');
    expect(text).toContain('never counted twice');
  });
});
