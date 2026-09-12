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
    expect(html()).toContain('Show real-life notes');
    expect(html()).toContain('data-field="showWhy"');
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
    expect(html()).toContain('Email 1 of');
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
    // Nothing has its material in the hall yet, so the hall says why instead of a dead button.
    expect(html()).toContain('No job has its material in the hall yet');
    expect(html()).toContain('Clean up');
  });
});

describe('the order board as tiles', () => {
  it('fills the page with one tile per enquiry, and says what each one is', () => {
    click('[data-do="openModal"][data-modal="board"]');
    expect(html()).toContain('class="modal modal-full modal-centred"');
    expect(html()).toContain('class="tile-grid"');
    const state = currentState();
    const enquiries = state?.enquiries ?? [];
    expect(enquiries.length).toBeGreaterThan(0);
    const tiles = root().querySelectorAll('[data-enquiry]');
    expect(tiles).toHaveLength(enquiries.length);
    for (const enquiry of enquiries) {
      expect(html()).toContain(`data-enquiry="${enquiry.id}"`);
    }
    // Every tile carries the price, the sheets and the owner days.
    expect(html()).toContain('class="tile-price"');
    expect(html()).toMatch(/\d+ sheets? of material/);
    expect(html()).toMatch(/about [\d.]+ owner days/);
    expect(html()).toContain('Needs ');
    // The header counts them with the right plural, on the new reputation scale.
    expect(html()).toMatch(/Reputation -?[\d.]+ · \d+ enquir(y|ies) waiting/);
    // No accent button inside the grid: the tiles are all outlined (CLAUDE.md T2 3.2).
    const grid = root().querySelector('.tile-grid');
    expect(grid?.querySelectorAll('.btn-primary')).toHaveLength(0);
    click('[data-do="closeModal"]');
  });

  it('greys a locked tile and prints the reason instead of a dead button', () => {
    const state = currentState();
    if (state) {
      state.enquiries = [
        {
          id: 'enq-locked',
          templateId: 'oakDiningTable',
          name: 'Oak dining table',
          sizeMultiplier: 1,
          price: 12000,
          basePrice: 12000,
          finish: 'laminate',
          materialKind: 'solidWood',
          deadlineDays: 50,
          express: true,
          bespokeMaterial: false,
          needsMeasure: false,
          createdDay: state.clock.day,
          expiresOnDay: state.clock.day + 2,
          lockReason: 'Needs solid wood tools',
          byHandAvailable: true,
        },
      ];
    }
    click('[data-do="openModal"][data-modal="board"]');
    expect(html()).toContain('class="tile is-locked"');
    expect(html()).toContain('Needs solid wood tools');
    expect(html()).toContain('Express');
    expect(html()).toContain('1 enquiry waiting');
    expect(html()).toContain('Accept, by hand, plus 50% time');
    click('[data-do="closeModal"]');
  });

  it('says one line and offers no button when the board is bare', () => {
    const state = currentState();
    if (state) state.enquiries = [];
    click('[data-do="openModal"][data-modal="board"]');
    expect(html()).toContain('Nothing on the board. Reputation brings enquiries.');
    expect(html()).toContain('0 enquiries waiting');
    expect(html()).not.toContain('data-do="acceptEnquiry"');
    click('[data-do="closeModal"]');
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

describe('assigning work by hand', () => {
  it('offers the owner on the job card, which is the override of CLAUDE.md 9.4', () => {
    // Push the job to the bench so the card shows its assign controls.
    const state = currentState();
    expect(state?.jobs[0]).toBeDefined();
    if (state && state.jobs[0]) state.jobs[0].stage = 'ready';
    click('[data-office="laptop"]');
    expect(html()).toContain('data-do="assignJob"');
    click('[data-do="assignJob"][data-worker="owner"]');
    expect(currentState()?.jobs[0]?.assignedTo).toBe('owner');
    click('[data-do="closeModal"]');
  });
});

describe('start production', () => {
  it('takes the owner to the bench, closes the laptop and shows the hall', () => {
    const state = currentState();
    expect(state).not.toBeNull();
    if (state && state.jobs[0]) {
      state.jobs[0].stage = 'ready';
      state.jobs[0].assignedTo = null;
      state.stock.sheets = 20;
    }
    click('[data-office="laptop"]');
    expect(html()).toContain('data-do="startProduction"');
    click('[data-do="startProduction"]');
    expect(html()).not.toContain('data-modal="laptop"');
    expect(html()).toContain('hall-view');
    expect(currentState()?.jobs[0]?.assignedTo).toBe('owner');
    expect(currentState()?.jobs[0]?.stage).toBe('inProduction');
    click('[data-do="setView"][data-view="office"]');
  });
});

describe('the sliding figures', () => {
  it('puts a moved figure back where it was so the CSS transition can run', () => {
    click('[data-do="setView"][data-view="hall"]');
    const before = root().querySelector('[data-figure="owner"]')?.getAttribute('transform');
    expect(before).toBeTruthy();
    const state = currentState();
    if (state) state.owner.station = 'gate';
    advanceMinutes(1);
    const after = root().querySelector('[data-figure="owner"]')?.getAttribute('transform');
    // The new node starts at the old place: the move happens on the next animation frame.
    expect(after).toBe(before);
    click('[data-do="setView"][data-view="office"]');
  });
});

describe('setting the hall out', () => {
  it('stops the clock, offers Done, and starts it again', () => {
    click('[data-do="setView"][data-view="hall"]');
    click('[data-do="setSpeed"][data-speed="2"]');
    expect(currentState()?.speed).toBe(2);
    expect(html()).toContain('data-do="startSetup"');
    click('[data-do="startSetup"]');
    expect(currentState()?.speed).toBe(0);
    expect(html()).toContain('data-do="endSetup"');
    expect(html()).toContain('Drag the machines');
    expect(html()).not.toContain('data-do="startSetup"');
    click('[data-do="endSetup"]');
    expect(currentState()?.speed).toBe(2);
    expect(html()).toContain('data-do="startSetup"');
    click('[data-do="setSpeed"][data-speed="0"]');
    click('[data-do="setView"][data-view="office"]');
  });
});

describe('why it is like this in real life', () => {
  it('offers an i link on the accounting rows and opens the note', () => {
    click('[data-office="accounting"]');
    expect(html()).toContain('data-do="showWhy"');
    expect(html()).toContain('data-id="rent"');
    click('[data-do="showWhy"][data-id="rent"]');
    expect(html()).toContain('class="why-pop"');
    expect(html()).toContain('Rent is agreed by the month');
    click('[data-do="closeWhy"]');
    expect(html()).not.toContain('class="why-pop"');
    click('[data-do="closeModal"]');
  });

  it('takes the links away when the notes are turned off, and brings them back', () => {
    click('[data-do="toggleMenu"]');
    expect(html()).toContain('Hide real-life notes');
    click('[data-do="toggleWhy"]');
    expect(currentState()?.showWhy).toBe(false);
    click('[data-office="accounting"]');
    expect(html()).not.toContain('data-do="showWhy"');
    click('[data-do="closeModal"]');
    click('[data-do="toggleMenu"]');
    expect(html()).toContain('Show real-life notes');
    click('[data-do="toggleWhy"]');
    expect(currentState()?.showWhy).toBe(true);
    click('[data-office="accounting"]');
    expect(html()).toContain('data-do="showWhy"');
    click('[data-do="closeModal"]');
  });
});

describe('accounting', () => {
  it('plays blind while the books are behind, and shows everything once they are written up', () => {
    click('[data-office="accounting"]');
    expect(html()).toContain('Books not up to date since day 1');
    expect(html()).toContain('? today');
    expect(html()).not.toContain('Unit deposit');
    click('[data-do="closeModal"]');
    // The bookkeeping task catches every day up at once.
    const state = currentState();
    if (state) state.booksUpToDay = state.clock.day;
    click('[data-office="accounting"]');
    expect(html()).not.toContain('Books not up to date');
    expect(html()).toContain('Unit deposit');
    expect(html()).toContain('Rent');
    expect(html()).toContain('Living costs');
    expect(html()).toContain('Ledger, last 50');
    expect(html()).toContain('Copy state as JSON');
    click('[data-do="closeModal"]');
  });

  it('offers a way to pay the arrears off, and takes the typed amount', () => {
    const state = currentState();
    expect(state).not.toBeNull();
    if (state) {
      state.finance.arrearsAmount = 1000;
      state.finance.arrearsMonths = 1;
      state.finance.firstArrearsDay = 1;
    }
    click('[data-office="accounting"]');
    expect(html()).toContain('Arrears');
    expect(html()).toContain('1 month');
    expect(html()).toContain('data-do="payArrears"');
    type('[data-field="arrearsAmount"]', '250');
    click('[data-do="payArrears"][data-amount="250"]');
    expect(currentState()?.finance.arrearsAmount).toBe(750);
    click('[data-do="payArrears"][data-amount="all"]');
    expect(currentState()?.finance.arrearsAmount).toBe(0);
    expect(html()).not.toContain('data-do="payArrears"');
    click('[data-do="closeModal"]');
  });
});

describe('the style rules of 10.4', () => {
  it('shows one accent button at a time, not one per row', () => {
    click('[data-office="catalogue"]');
    const primaries = (html().match(/btn-primary/g) ?? []).length;
    // The catalogue rows are outlined: nothing in this view is the accent button.
    expect(primaries).toBe(0);
    click('[data-do="closeModal"]');
    click('[data-do="setView"][data-view="hall"]');
    expect((html().match(/btn-primary/g) ?? []).length).toBeLessThanOrEqual(1);
  });

  it('prints money with a pound sign and a comma, and minutes with a unit', () => {
    expect(html()).toMatch(/£[\d,]+/);
    expect(html()).toContain('120 min');
    expect(html()).not.toMatch(/£\d+\.\d/);
  });

  it('opens a desk modal beside the object that was clicked', () => {
    click('[data-do="setView"][data-view="office"]');
    click('[data-office="hiring"]');
    const modal = root().querySelector('.modal');
    expect(modal?.getAttribute('style')).toMatch(/left:\d+px;top:\d+px/);
    expect(modal?.className).not.toContain('modal-centred');
    click('[data-do="closeModal"]');
  });

  it('puts the caret back in a filter field when the cross clears it', () => {
    click('[data-office="catalogue"]');
    type('[data-filter="catalogue"]', 'saw');
    click('[data-do="clearFilter"]');
    const field = root().querySelector('[data-filter="catalogue"]');
    expect(document.activeElement).toBe(field);
    click('[data-do="closeModal"]');
  });
});
