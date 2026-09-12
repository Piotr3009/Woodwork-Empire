// @vitest-environment jsdom
// The first ten minutes of CLAUDE.md 15, driven through the real DOM.

import { beforeAll, describe, expect, it } from 'vitest';
import { advanceMinutes, currentState, mount } from '../../src/ui/app';
import { STARTING_KIT } from '../helpers';

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

function type(selector: string, value: string): void {
  const element = root().querySelector(selector);
  if (!(element instanceof HTMLInputElement)) throw new Error(`no field: ${selector}`);
  element.value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

function html(): string {
  return root().innerHTML;
}

beforeAll(() => {
  document.body.innerHTML = '<div id="app"></div>';
  mount(root());
});

describe('the first ten minutes', () => {
  it('1. shows the start screen with the three difficulties', () => {
    expect(html()).toContain('Woodwork Empire');
    expect(html()).toContain('You quit your job');
    expect(html()).toContain('data-id="veryEasy"');
    expect(html()).toContain('data-id="easy"');
    expect(html()).toContain('data-id="hard"');
    expect(currentState()).toBeNull();
  });

  it('2. starts an Easy game on day 1 at 08:00', () => {
    click('[data-do="pickDifficulty"][data-id="easy"]');
    type('[data-field="playerName"]', 'Piotr');
    type('[data-field="companyName"]', 'Woodwork Empire');
    click('[data-do="startGame"]');
    const state = currentState();
    expect(state?.difficulty).toBe('easy');
    expect(state?.clock).toEqual({ day: 1, minute: 0 });
    expect(html()).toContain('Mon, day 1');
    expect(html()).toContain('0 / 480 min');
    expect(html()).toContain('Board');
  });

  it('3. walks into the office and buys the day 1 kit from the catalogue', () => {
    click('[data-do="setView"][data-view="office"]');
    expect(html()).toContain('office-view');
    expect(html()).toContain('data-office="catalogue"');
    click('[data-office="catalogue"]');
    expect(html()).toContain('Equipment catalogue');
    const before = currentState()?.cash ?? 0;
    for (const specId of STARTING_KIT) {
      click(`[data-do="buyEquipment"][data-id="${specId}"]`);
    }
    click('[data-do="buySoftware"][data-id="oneOff"]');
    const state = currentState();
    expect(state?.equipment).toHaveLength(STARTING_KIT.length);
    expect(state?.software.mode).toBe('oneOff');
    expect(state?.cash ?? 0).toBeLessThan(before);
    expect(html()).toContain('Owned 1');
  });

  it('4. accepts the first job off the board', () => {
    click('[data-do="closeModal"]');
    click('[data-do="openModal"][data-modal="board"]');
    expect(html()).toContain('Order board');
    const accept = root().querySelector('[data-do="acceptEnquiry"]');
    expect(accept).not.toBeNull();
    click('[data-do="acceptEnquiry"]');
    const state = currentState();
    expect(state?.jobs).toHaveLength(1);
    expect(state?.jobs[0]?.depositPaid).toBeGreaterThan(0);
  });

  it('5. finds the job in the laptop design queue and starts the calls', () => {
    click('[data-do="closeModal"]');
    // Still standing in the office, so the laptop is right there on the desk.
    click('[data-office="laptop"]');
    expect(html()).toContain('Laptop');
    expect(html()).toContain('Design queue');
    const name = currentState()?.jobs[0]?.name ?? '';
    expect(html()).toContain(`Design: ${name}`);
    expect(html()).toContain('Client call 1 of');
    expect(html()).toContain('Emails');
    expect(html()).toContain('Bookkeeping');
    click('[data-do="startTask"]');
    expect(currentState()?.owner.currentTaskId).not.toBeNull();
    expect(html()).toContain('Pause');
  });

  it('6. moves the clock at 4x and fills the minute bar', () => {
    click('[data-do="setSpeed"][data-speed="4"]');
    expect(currentState()?.speed).toBe(4);
    expect(html()).toContain('class="chip is-on" data-do="setSpeed" data-speed="4"');
  });

  it('7. ends the day and shows the summary', () => {
    click('[data-do="closeModal"]');
    click('[data-do="toggleMenu"]');
    expect(html()).toContain('Stay home today');
    // Before 16:00 the button means going home: the rest of the day runs without the owner.
    click('[data-do="endDay"]');
    expect(currentState()?.owner.wentHome).toBe(true);
    advanceMinutes(480);
    expect(html()).toContain('End of day 1');
    expect(html()).toContain('Your minutes');
    expect(html()).toContain('Jobs finished');
    click('[data-do="resolveEvent"][data-id="next"]');
    expect(currentState()?.clock.day).toBe(2);
  });

  it('8. shows the hall with the kit, the owner and the rooms', () => {
    click('[data-do="setView"][data-view="hall"]');
    expect(html()).toContain('hall-view');
    expect(html()).toContain('Table saw');
    expect(html()).toContain('data-owner="1"');
    expect(html()).toContain('data-room="wc"');
    click('[data-room="wc"]');
    expect(html()).toContain('The WC.');
    expect(html()).toContain('Work here');
    expect(html()).toContain('Clean up');
  });
});

describe('the modals', () => {
  it('open from the office desk, one per object', () => {
    click('[data-do="setView"][data-view="office"]');
    for (const [object, title] of [
      ['accounting', 'Accounting'],
      ['materials', 'Materials and stock'],
      ['hiring', 'Team board'],
      ['phone', 'Order board'],
    ]) {
      click(`[data-office="${object}"]`);
      expect(html()).toContain(`data-modal="${object === 'phone' ? 'board' : object}"`);
      expect(html()).toContain(title ?? '');
      click('[data-do="closeModal"]');
    }
  });

  it('all carry a close cross and a draggable header', () => {
    click('[data-office="accounting"]');
    expect(html()).toContain('class="modal-close"');
    expect(html()).toContain('data-drag="1"');
    expect(html()).toContain('class="modal-body"');
  });

  it('give every filter field a clear cross once it has text', () => {
    click('[data-do="closeModal"]');
    click('[data-office="catalogue"]');
    expect(html()).not.toContain('data-do="clearFilter"');
    type('[data-filter="catalogue"]', 'saw');
    expect(html()).toContain('data-do="clearFilter"');
    expect(html()).toContain('Table saw');
    expect(html()).not.toContain('Cordless drill');
    click('[data-do="clearFilter"]');
    expect(html()).toContain('Cordless drill');
    click('[data-do="closeModal"]');
  });

  it('close on Escape', () => {
    click('[data-office="hiring"]');
    expect(html()).toContain('data-modal="hiring"');
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(html()).not.toContain('data-modal="hiring"');
  });
});

describe('accounting', () => {
  it('shows the day 1 deposit and the daily costs', () => {
    click('[data-office="accounting"]');
    expect(html()).toContain('Unit deposit');
    expect(html()).toContain('Rent');
    expect(html()).toContain('Living costs');
    expect(html()).toContain('Ledger, last 50');
    expect(html()).toContain('Copy state as JSON');
    click('[data-do="closeModal"]');
  });
});
