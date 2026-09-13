// @vitest-environment jsdom
// The first ten minutes of CLAUDE.md 15, driven through the real DOM.

import { beforeAll, describe, expect, it } from 'vitest';
import { advanceMinutes, currentState, mount } from '../../src/ui/app';
import {
  BREAK_MINUTES,
  LEDGER_VISIBLE_ENTRIES,
  LAPTOP_BOOT_MINUTES,
  SHOPPING_MINUTES,
  SHOPPING_NEXT_MINUTES,
} from '../../src/engine/constants';
import { deliveryDaysFor, findSpec } from '../../src/engine/machines';
import { STARTING_CLASS, STARTING_KIT } from '../helpers';

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

/** Answers whatever the engine is asking with the first choice, the way a player clicks on. */
function dismissEvents(): void {
  let guard = 0;
  while (root().querySelector('[data-do="resolveEvent"]') !== null && guard < 50) {
    click('[data-do="resolveEvent"]');
    guard += 1;
  }
}

/** Works the lorries at the gate off the laptop's list until nothing is left on order. A heavy
 *  machine is two hours at the gate and the owner can only be at one of them at a time, so the
 *  rest wait on the list the way every other job of work does (CLAUDE.md T8 3.2). */
function unloadTheKit(): void {
  if (root().querySelector('[data-do="setView"][data-view="office"]') !== null) {
    click('[data-do="setView"][data-view="office"]');
  }
  click('[data-office="laptop"]');
  advanceMinutes(LAPTOP_BOOT_MINUTES);
  let guard = 0;
  while ((currentState()?.onOrder.length ?? 0) > 0 && guard < 120) {
    guard += 1;
    dismissEvents();
    const state = currentState();
    const task = state?.tasks.find((entry) => entry.kind === 'unload' && !entry.done);
    const waiting =
      task === undefined ? null : root().querySelector(`[data-do="startTask"][data-id="${task.id}"]`);
    if (waiting !== null) {
      waiting.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      continue;
    }
    advanceMinutes(30);
  }
  if (root().querySelector('[data-modal="laptop"] [data-do="closeModal"]') !== null) {
    click('[data-modal="laptop"] [data-do="closeModal"]');
  }
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
    expect(html()).toContain('office-room');
    expect(html()).toContain('data-office="catalogue"');
    // The game opens on a stopped clock. Reaching for the catalogue starts it at 1x instead of
    // refusing: nothing happens in stopped time, so the time runs (PIOTR, 13.09).
    expect(currentState()?.speed).toBe(0);
    click('[data-office="catalogue"]');
    expect(currentState()?.speed).toBe(1);
    expect(html()).toContain('Equipment catalogue');
    expect(html()).not.toContain('Time is paused');
    const before = currentState()?.cash ?? 0;
    for (const specId of STARTING_KIT) {
      // The catalogue is tabs of folders from Turn 7: the tab, then the family's folder, and the
      // classes are inside it (CLAUDE.md T6 3.6, T7 3.7).
      const tab = findSpec(specId)?.tab;
      if (tab !== undefined) click(`[data-do="catalogueTab"][data-id="${tab}"]`);
      click(`[data-do="openFolder"][data-id="${specId}"]`);
      const variant = STARTING_CLASS[specId];
      click(
        variant === undefined
          ? `[data-do="buyEquipment"][data-id="${specId}"]`
          : `[data-do="buyEquipment"][data-id="${specId}"][data-variant="${variant}"]`,
      );
      click('[data-do="closeFolder"]');
    }
    // The software sits under whatever tab is open: any of them but Owned carries it.
    click('[data-do="catalogueTab"][data-id="computers"]');
    click('[data-do="buySoftware"][data-id="oneOff"]');
    // Nothing is in the hall yet: it is one trip out, an hour for the first thing and a quarter
    // of an hour for each of the other eleven. The cash left at the click, every item is paid
    // for, and the tiles say they are waiting (PIOTR, 13.09).
    expect(currentState()?.equipment).toHaveLength(0);
    expect(currentState()?.cash ?? 0).toBeLessThan(before);
    const paid = before - (currentState()?.cash ?? 0);
    expect(html()).toContain('Shopping: 0 of 225 min');
    // A second click on a machine that is on the list buys nothing: one click is one purchase.
    click('[data-do="catalogueTab"][data-id="sheetMachines"]');
    click('[data-do="openFolder"][data-id="tableSaw"]');
    expect(html()).toContain('Waiting for delivery');
    expect(root().querySelector('[data-do="buyEquipment"][data-id="tableSaw"][data-variant="used"]')).toBeNull();
    expect(before - (currentState()?.cash ?? 0)).toBe(paid);
    click('[data-do="closeFolder"]');
    advanceMinutes(SHOPPING_MINUTES + SHOPPING_NEXT_MINUTES * STARTING_KIT.length);
    const state = currentState();
    // He comes back with what the shop had on the shelf: the desk, the chair, the laptop, the
    // drill, the tool cabinet and the hand edgebander. The saw, the compressor, the extractor,
    // the bench and the rack are ordered in and land at 08:00 tomorrow (CLAUDE.md T8 3.2).
    const carried = STARTING_KIT.filter((specId) => deliveryDaysFor(specId, STARTING_CLASS[specId]) === 0);
    expect(carried).toHaveLength(6);
    expect(state?.equipment).toHaveLength(carried.length);
    expect(state?.onOrder).toHaveLength(STARTING_KIT.length - carried.length);
    expect(state?.onOrder.every((item) => item.dueDay === 2)).toBe(true);
    expect(state?.software.mode).toBe('oneOff');
    // Landing costs nothing more: what left at the click is all that leaves.
    expect(before - (state?.cash ?? 0)).toBe(paid);
    // The folder of a family the hall has says so on its face (CLAUDE.md T7 3.7).
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

  it('5. finds the desk work in the laptop and the drawing on the roll beside it', () => {
    click('[data-do="closeModal"]');
    // Still standing in the office, so the laptop is right there on the desk.
    click('[data-office="laptop"]');
    expect(html()).toContain('Laptop');
    // Lifting the lid costs the five minutes the machine takes to come up, and nothing else on
    // the desk can be picked up until it is up (CLAUDE.md T7 3.10).
    expect(html()).toContain('Waiting for the laptop');
    advanceMinutes(LAPTOP_BOOT_MINUTES);
    const name = currentState()?.jobs[0]?.name ?? '';
    // The calls are in the client's diary now, not on the desk (CLAUDE.md T4 3.3).
    expect(html()).not.toContain('Client call');
    expect((currentState()?.jobs[0]?.calls ?? []).length).toBeGreaterThan(0);
    expect(html()).toContain('Email 1 of');
    expect(html()).toContain('Bookkeeping');
    // The drawings are a tab of the laptop, not the Tasks tab (CLAUDE.md T4 3.1).
    expect(html()).not.toContain('Design queue');
    expect(html()).not.toContain(`Design: ${name}`);
    click('[data-do="laptopTab"][data-id="drawings"]');
    expect(html()).toContain('Design queue');
    expect(html()).toContain(`Design: ${name}`);
    expect(html()).toContain('Finished drawings');
    click('[data-do="laptopTab"][data-id="tasks"]');
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
    // Before his 480 are in, the button means going home: the rest of the day runs without him.
    click('[data-do="endDay"]');
    expect(currentState()?.owner.wentHome).toBe(true);
    // The day is the 480 minutes of work plus the break nobody works through.
    advanceMinutes(480 + BREAK_MINUTES);
    expect(html()).toContain('End of day 1');
    expect(html()).toContain('Your minutes');
    expect(html()).toContain('Jobs finished');
    click('[data-do="resolveEvent"][data-id="next"]');
    expect(currentState()?.clock.day).toBe(2);
    // Day 2 opens with the rack alarm: nothing has been ordered yet (CLAUDE.md T2 3.6). The page
    // is seeded from the clock, so a day can also open with a breakdown or a service in front of
    // it; the alarm is asked of the day's events and not of whichever one is on the screen.
    const morning = currentState();
    const events = [morning?.activeEvent, ...(morning?.eventQueue ?? [])];
    expect(events.some((event) => event?.kind === 'lowStock'), JSON.stringify(events)).toBe(true);
    dismissEvents();
    expect(currentState()?.activeEvent).toBeNull();
  });

  it('8. shows the hall with the kit, the owner and the rooms', () => {
    // Day 2 at 08:00 is when the saw, the compressor, the extractor, the bench and the rack turn
    // up. The light ones are carried in; the heavy ones are two hours each (CLAUDE.md T8 3.2).
    unloadTheKit();
    expect(currentState()?.onOrder).toHaveLength(0);
    click('[data-do="setView"][data-view="hall"]');
    expect(html()).toContain('hall-view');
    expect(html()).toContain('Table saw');
    expect(html()).toContain('data-owner="1"');
    expect(html()).toContain('data-room="wc"');
    // The block carries its own tooltip. Walking into a room is driven off the footprints and
    // needs a screen matrix, which this page has none of, so it is proved where the matrix is
    // stubbed: tests/ui/hallRooms.test.ts.
    expect(html()).toContain('<title>The WC.');
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
  it('open from the regions of the room, one per region', () => {
    click('[data-do="setView"][data-view="office"]');
    for (const [region, modal, title] of [
      ['binder', 'accounting', 'Accounting'],
      ['orders', 'board', 'Order board'],
      ['workPlan', 'workPlan', 'Work Plan'],
      ['catalogue', 'catalogue', 'Equipment catalogue'],
      ['laptop', 'laptop', 'Laptop'],
    ]) {
      click(`[data-office="${region}"]`);
      expect(html()).toContain(`data-modal="${modal}"`);
      expect(html()).toContain(title ?? '');
      click('[data-do="closeModal"]');
    }
    // The three modals that lost their desk item are tabs of the laptop now (T4 3.1).
    click('[data-office="laptop"]');
    for (const [tab, title] of [
      ['materials', 'sheets on the rack'],
      ['team', 'Taking somebody on'],
      ['drawings', 'Design queue'],
    ]) {
      click(`[data-do="laptopTab"][data-id="${tab}"]`);
      expect(html(), tab).toContain(title ?? '');
    }
    click('[data-do="laptopTab"][data-id="tasks"]');
    click('[data-do="closeModal"]');
  });

  it('all carry a close cross and a draggable header', () => {
    click('[data-office="binder"]');
    expect(html()).toContain('class="modal-close"');
    expect(html()).toContain('data-drag="1"');
    expect(html()).toContain('class="modal-body"');
  });

  it('give every filter field a clear cross once it has text', () => {
    click('[data-do="closeModal"]');
    click('[data-office="catalogue"]');
    // The filter works inside the tab that is open and nowhere else (CLAUDE.md T6 3.6).
    click('[data-do="catalogueTab"][data-id="handTools"]');
    expect(html()).not.toContain('data-do="clearFilter"');
    expect(html()).toContain('Drills');
    type('[data-filter="catalogue"]', 'compress');
    expect(html()).toContain('data-do="clearFilter"');
    expect(html()).toContain('Compressors');
    expect(html()).not.toContain('Drills');
    // A tab with nothing matching says so, and never borrows a folder from another tab.
    click('[data-do="catalogueTab"][data-id="storage"]');
    expect(html()).toContain('Tool cabinets');
    type('[data-filter="catalogue"]', 'compress');
    expect(html()).toContain('Nothing matches that.');
    expect(html()).not.toContain('Compressors');
    click('[data-do="clearFilter"]');
    expect(html()).toContain('Tool cabinets');
    // And inside a folder it narrows the classes of that one family (CLAUDE.md T7 3.7).
    click('[data-do="openFolder"][data-id="sheetRack"]');
    expect(html()).toContain('Cheap shelving');
    expect(html()).toContain('Industrial rack');
    type('[data-filter="catalogue"]', 'industrial');
    expect(html()).toContain('Industrial rack');
    expect(html()).not.toContain('Cheap shelving');
    click('[data-do="clearFilter"]');
    click('[data-do="closeFolder"]');
    click('[data-do="closeModal"]');
  });

  it('close on Escape', () => {
    click('[data-office="laptop"]');
    expect(html()).toContain('data-modal="laptop"');
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(html()).not.toContain('data-modal="laptop"');
  });
});

describe('assigning work by hand', () => {
  it('offers the owner on the job card, which is the override of CLAUDE.md 9.4', () => {
    // Push the job to the bench so the card shows its assign controls.
    const state = currentState();
    expect(state?.jobs[0]).toBeDefined();
    if (state && state.jobs[0]) state.jobs[0].stage = 'ready';
    click('[data-office="workPlan"]');
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
    click('[data-office="workPlan"]');
    expect(html()).toContain('data-do="startProduction"');
    click('[data-do="startProduction"]');
    expect(html()).not.toContain('data-modal="workPlan"');
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
    // Back to a running clock: nothing in the office opens on a stopped one (T7 3.10).
    click('[data-do="setSpeed"][data-speed="1"]');
    click('[data-do="setView"][data-view="office"]');
  });
});

describe('why it is like this in real life', () => {
  it('offers an i link on the accounting rows and opens the note', () => {
    click('[data-office="binder"]');
    // The books open on the Days tab; the totals with their notes are on the Summary one.
    click('[data-do="accountingTab"][data-id="summary"]');
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
    click('[data-office="binder"]');
    expect(html()).not.toContain('data-do="showWhy"');
    click('[data-do="closeModal"]');
    click('[data-do="toggleMenu"]');
    expect(html()).toContain('Show real-life notes');
    click('[data-do="toggleWhy"]');
    expect(currentState()?.showWhy).toBe(true);
    click('[data-office="binder"]');
    expect(html()).toContain('data-do="showWhy"');
    click('[data-do="closeModal"]');
  });
});

describe('accounting', () => {
  it('plays blind while the books are behind, and shows everything once they are written up', () => {
    click('[data-office="binder"]');
    click('[data-do="accountingTab"][data-id="ledger"]');
    expect(html()).toContain('Books not up to date since day 1');
    expect(html()).toContain('? today');
    expect(html()).not.toContain('Unit deposit');
    // Nothing on the Days tab either: the month has not been written up.
    click('[data-do="accountingTab"][data-id="days"]');
    expect(html()).toContain('Nothing has moved in month 1.');
    click('[data-do="closeModal"]');
    // The bookkeeping task catches every day up at once.
    const state = currentState();
    if (state) state.booksUpToDay = state.clock.day;
    click('[data-office="binder"]');
    expect(html()).not.toContain('Books not up to date');
    // The month a day at a time, out of the ledger itself (CLAUDE.md T6 3.9).
    expect(html()).toContain('data-day="1"');
    click('[data-do="accountingTab"][data-id="ledger"]');
    expect(html()).toContain('Unit deposit');
    expect(html()).toContain('Rent');
    expect(html()).toContain('Living costs');
    expect(html()).toContain(`Ledger, last ${LEDGER_VISIBLE_ENTRIES}`);
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
    click('[data-office="binder"]');
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

  it('names every line in plain English, never the engine key', () => {
    click('[data-office="binder"]');
    click('[data-do="accountingTab"][data-id="summary"]');
    expect(html()).toContain('Business rates');
    expect(html()).toContain('Living costs');
    expect(html()).toContain('Deposit on the unit');
    expect(html()).not.toContain('row-main">living');
    expect(html()).not.toContain('row-main">unitDeposit');
    expect(html()).not.toContain('row-main">jobDeposit');
    click('[data-do="closeModal"]');
  });

  it('leaves a question open when the cross belongs to a desk modal', () => {
    click('[data-office="binder"]');
    const state = currentState();
    if (state) {
      state.activeEvent = {
        id: 'event-test',
        kind: 'jobOverdue',
        title: 'Something wants an answer',
        body: 'It is still there when the accounting is shut.',
        choices: [{ id: 'ok', label: 'Right' }],
        data: {},
        day: state.clock.day,
        minute: state.clock.minute,
      };
    }
    // Any click rebuilds the view, which is where the event modal comes from.
    click('[data-do="toggleMenu"]');
    click('[data-do="toggleMenu"]');
    expect(html()).toContain('Something wants an answer');
    // The first cross in the page is the accounting one. It shuts the accounting, nothing else.
    click('[data-do="closeModal"]');
    expect(currentState()?.activeEvent).not.toBeNull();
    expect(html()).toContain('Something wants an answer');
    expect(html()).not.toContain('data-modal="accounting"');
    dismissEvents();
    expect(currentState()?.activeEvent).toBeNull();
  });
});

describe('the sprite check page', () => {
  it('is one click away in the Menu, and the top bar brings the hall back', () => {
    click('[data-do="toggleMenu"]');
    expect(html()).toContain('data-do="showSprites"');
    click('[data-do="showSprites"]');
    expect(html()).toContain('sprite-grid');
    // Every class of every family is a picture of its own now (CLAUDE.md T7 3.5).
    expect(html()).toContain('tableSaw.used.png');
    expect(html()).toContain('no file');
    expect(html()).not.toContain('hall-view');
    click('[data-do="setView"][data-view="hall"]');
    expect(html()).toContain('hall-view');
    click('[data-do="setView"][data-view="office"]');
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

  it('centres a modal the room opened, and lets it be dragged off centre', () => {
    click('[data-do="setView"][data-view="office"]');
    click('[data-office="laptop"]');
    const modal = root().querySelector('.modal');
    if (!(modal instanceof HTMLElement)) throw new Error('no modal');
    // The room fills the page, so there is no small object for the modal to sit beside.
    expect(modal.className).toContain('modal-centred');
    const head = modal.querySelector('[data-drag="1"]');
    head?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 400, clientY: 200 }));
    window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 520, clientY: 300 }));
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    expect(modal.style.left).toMatch(/^\d+px$/);
    expect(modal.style.top).toMatch(/^\d+px$/);
    expect(modal.className).not.toContain('modal-centred');
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
