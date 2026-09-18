// @vitest-environment jsdom
// The first ten minutes of CLAUDE.md 15, driven through the real DOM. Day 1 is the ordering and
// day 2 is the setting up: nothing the player buys is in the building the day he pays for it
// (CLAUDE.md T9 3.1).

import { beforeAll, describe, expect, it } from 'vitest';
import { advanceMinutes, currentState, mount, render } from '../../src/ui/app';
import {
  BREAK_MINUTES,
  LEDGER_VISIBLE_ENTRIES,
  LAPTOP_BOOT_MINUTES,
} from '../../src/engine/constants';
import { formatCalendarDay, monthName } from '../../src/engine/index';
import { findSpec } from '../../src/engine/machines';
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
  while (root().querySelector('[data-do="closeHouseCard"], [data-do="resolveEvent"]') !== null && guard < 50) {
    click('[data-do="closeHouseCard"], [data-do="resolveEvent"]');
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
  // The desk is behind the Tasks tile of the home screen (CLAUDE.md T14 2.1).
  click('[data-modal="laptop"] [data-tile="tasks"]');
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
    expect(html()).toContain(formatCalendarDay(1));
    expect(html()).toContain('0 / 540 min');
    expect(html()).toContain('Board');
  });

  it('3. walks into the office and orders the day 1 kit from the catalogue', () => {
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
    const minutes = currentState()?.owner.minutesWorked ?? 0;
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
    // Nothing is in the hall and nothing is in the room: day 1 is the ordering and day 2 is the
    // setting up. The cash left at every click and his day is untouched (CLAUDE.md T9 3.1).
    const state = currentState();
    expect(state?.equipment).toHaveLength(0);
    expect(state?.onOrder).toHaveLength(STARTING_KIT.length);
    expect(state?.onOrder.every((item) => item.dueDay === 2)).toBe(true);
    expect(state?.owner.minutesWorked).toBe(minutes);
    const paid = before - (state?.cash ?? 0);
    expect(paid).toBeGreaterThan(0);
    // A second click on a machine that is on the road buys nothing: one click is one machine.
    click('[data-do="catalogueTab"][data-id="sheetMachines"]');
    click('[data-do="openFolder"][data-id="tableSaw"]');
    expect(html()).toContain(`On order, due ${formatCalendarDay(2)}`);
    expect(root().querySelector('[data-do="buyEquipment"][data-id="tableSaw"][data-variant="used"]')).toBeNull();
    expect(before - (currentState()?.cash ?? 0)).toBe(paid);
    click('[data-do="closeFolder"]');
    // And the licence waits for the machine it runs on: there is no laptop in the room yet.
    click('[data-do="catalogueTab"][data-id="computers"]');
    expect(html()).toContain('Needs a laptop first');
    expect(root().querySelector('[data-do="buySoftware"][data-id="oneOff"]')).toBeNull();
  });

  it('4. has no laptop and no board on day 1, and goes home at five', () => {
    click('[data-do="closeModal"]');
    // The order board is the software's, and the software is on the laptop that is on the road.
    expect(html()).toContain('Board: buy a laptop');
    expect(html()).not.toContain('data-office="laptop"');
    click('[data-do="toggleMenu"]');
    click('[data-do="endDay"]');
    expect(currentState()?.owner.wentHome).toBe(true);
    // The day is the 480 minutes of work plus the break nobody works through.
    advanceMinutes(480 + BREAK_MINUTES);
    // Home first: the house card, clicked away, then the summary (CLAUDE.md T13 3.18).
    expect(html()).toContain('Resting at home now');
    click('[data-do="closeHouseCard"]');
    expect(html()).toContain(`End of ${formatCalendarDay(1)}`);
    expect(html()).toContain('Your minutes');
    click('[data-do="resolveEvent"][data-id="next"]');
    expect(currentState()?.clock.day).toBe(2);
    // Day 2 opens with the lorry at the gate: one van with everything day 1 ordered on it. The
    // page is seeded from the clock, so a day can also open with something else in front of it;
    // the delivery is asked of the day's events and not of whichever one is on the screen.
    const morning = currentState();
    const events = [morning?.activeEvent, ...(morning?.eventQueue ?? [])];
    expect(
      events.some((event) => event?.kind === 'deliveryArrived'),
      JSON.stringify(events),
    ).toBe(true);
  });

  it('5. takes the lorry off at the gate on the morning of day 2', () => {
    // 08:00 on day 2 is when the whole of day 1's ordering turns up: one van, one unloading. The
    // light kit stands itself in the hall and the heavy kit waits for somebody (T8 3.2, T9 3.1).
    unloadTheKit();
    expect(currentState()?.onOrder).toHaveLength(0);
    const owned = currentState()?.equipment.map((item) => item.specId) ?? [];
    for (const specId of STARTING_KIT) expect(owned, specId).toContain(specId);
  });

  it('6. buys the licence now there is a laptop to run it on', () => {
    click('[data-office="catalogue"]');
    click('[data-do="catalogueTab"][data-id="computers"]');
    click('[data-do="buySoftware"][data-id="oneOff"]');
    expect(currentState()?.software.mode).toBe('oneOff');
    // The folder of a family the hall has says so on its face (CLAUDE.md T7 3.7).
    click('[data-do="openFolder"][data-id="desk"]');
    expect(html()).toContain('Owned');
    click('[data-do="closeFolder"]');
  });

  it('7. accepts the first job off the board', () => {
    click('[data-do="closeModal"]');
    click('[data-do="openModal"][data-modal="board"]');
    expect(html()).toContain('Order board');
    const accept = root().querySelector('[data-do="acceptEnquiry"]');
    expect(accept).not.toBeNull();
    click('[data-do="acceptEnquiry"]');
    // The client answers with a number first, and the job is on the books once it is taken
    // (CLAUDE.md T13 3.24).
    expect(html()).toContain('The client offers');
    expect(currentState()?.jobs).toHaveLength(0);
    click('[data-do="resolveEvent"][data-id="accept"]');
    const state = currentState();
    expect(state?.jobs).toHaveLength(1);
    expect(state?.jobs[0]?.depositPaid).toBeGreaterThan(0);
  });

  it('8. finds the desk work in the laptop and the drawing on the roll beside it', () => {
    click('[data-do="closeModal"]');
    // Still standing in the office, so the laptop is right there on the desk.
    click('[data-office="laptop"]');
    expect(html()).toContain('Laptop');
    const name = currentState()?.jobs[0]?.name ?? '';
    // The laptop opens on its home screen, and the desk is behind the Tasks tile (T14 2.1).
    expect(root().querySelector('[data-laptop-page="home"]')).not.toBeNull();
    click('[data-modal="laptop"] [data-tile="tasks"]');
    // The calls are in the client's diary now, not on the desk (CLAUDE.md T4 3.3).
    expect(html()).not.toContain('Client call');
    expect((currentState()?.jobs[0]?.calls ?? []).length).toBeGreaterThan(0);
    expect(html()).toContain('Email 1 of');
    expect(html()).toContain('Bookkeeping');
    // The drawings are a page of the laptop, not the Tasks page (CLAUDE.md T4 3.1).
    expect(html()).not.toContain('Design queue');
    expect(html()).not.toContain(`Design: ${name}`);
    click('[data-modal="laptop"] [data-tile="home"]');
    click('[data-modal="laptop"] [data-tile="drawings"]');
    expect(html()).toContain('Design queue');
    expect(html()).toContain(`Design: ${name}`);
    // The Finished drawings list is gone (CLAUDE.md T17 2.18).
    expect(html()).not.toContain('Finished drawings');
    click('[data-modal="laptop"] [data-tile="home"]');
    click('[data-modal="laptop"] [data-tile="tasks"]');
    click('[data-do="startTask"]');
    expect(currentState()?.owner.currentTaskId).not.toBeNull();
    expect(html()).toContain('Pause');
  });

  it('9. moves the clock at 4x and fills the day meter', () => {
    click('[data-do="setSpeed"][data-speed="4"]');
    expect(currentState()?.speed).toBe(4);
    expect(html()).toContain('class="chip knob is-on" data-do="setSpeed" data-speed="4"');
  });

  it('10. shows the hall with the kit and the rooms, and the owner through the office door', () => {
    click('[data-do="closeModal"]');
    click('[data-do="setView"][data-view="hall"]');
    expect(html()).toContain('hall-view');
    expect(html()).toContain('Table saw');
    // He is at his desk with the books at this minute, which from T20 2.12 is through the office
    // door and off the hall: the office view is where he is drawn. Put him on the floor and the
    // hall has him back.
    expect(currentState()?.owner.station).toBe('office');
    expect(html()).not.toContain('data-owner="1"');
    const state = currentState();
    if (state) state.owner.station = 'bench';
    render();
    expect(html()).toContain('data-owner="1"');
    expect(html()).toContain('data-room="wc"');
    // The block carries its own tooltip. Walking into a room is driven off the footprints and
    // needs a screen matrix, which this page has none of, so it is proved where the matrix is
    // stubbed: tests/ui/hallRooms.test.ts.
    expect(html()).toContain('<title>The WC.');
    // Nothing has to be done in a clean hall with nothing ready, so the only chip over the floor
    // is the setting out, and the camera is three small chips (CLAUDE.md T17 2.5).
    expect(html()).toContain('class="hall-chips"');
    expect(html()).not.toContain('No job has its material in the hall yet');
    expect(html()).not.toContain('Clean up');
    expect(html()).toContain('data-do="startSetup"');
    expect(html()).toContain('class="hall-zoom"');
  });
});

describe('the order board as tiles', () => {
  it('fills the page with one tile per enquiry, and says what each one is', () => {
    click('[data-do="openModal"][data-modal="board"]');
    // The board is a full page modal of the paper family (CLAUDE.md T11 1).
    expect(html()).toContain('class="modal modal-full modal-folder modal-centred"');
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
          kind: 'residential',
          budget: 12000,
          offer: null,
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
          unreachable: false,
          blockReason: '',
          blockWhere: '',
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
    // The modals that lost their desk item are pages of the laptop now, behind its tiles (T4
    // 3.1, T14 2.1), and the team is a page of its own off the Office tile (CLAUDE.md T10 3.6).
    click('[data-office="laptop"]');
    for (const [tile, title] of [
      ['stock', 'data-stock='],
      ['drawings', 'Design queue'],
    ]) {
      click(`[data-modal="laptop"] [data-tile="${tile}"]`);
      expect(html(), tile).toContain(title ?? '');
      click('[data-modal="laptop"] [data-tile="home"]');
    }
    click('[data-modal="laptop"] [data-tile="team"]');
    expect(html()).toContain('data-laptop-page="team"');
    expect(html()).not.toContain('data-modal="team"');
    expect(html()).toContain('Taking somebody on');
    click('[data-modal="laptop"] [data-tile="home"]');
    click('[data-modal="laptop"] [data-tile="tasks"]');
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
    type('[data-filter="catalogue"]', 'hand tool');
    expect(html()).toContain('data-do="clearFilter"');
    expect(html()).toContain('Hand tool sets');
    expect(html()).not.toContain('Drills');
    // A tab with nothing matching says so, and never borrows a folder from another tab.
    click('[data-do="catalogueTab"][data-id="storage"]');
    expect(html()).toContain('Tool cabinets');
    type('[data-filter="catalogue"]', 'compress');
    expect(html()).toContain('Nothing matches that.');
    // Compressors are under Extraction and air from Turn 10, and the filter never borrows a
    // folder from another tab (CLAUDE.md T10 3.3).
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
  it('offers Assign to this job on the row, which is the override of CLAUDE.md 9.4', () => {
    // Push the job to the bench so the row shows its assign controls (CLAUDE.md T19 2.5). The
    // Turn 17 chip row is gone: the men are chips with a cross apiece and the list is behind one
    // blue button, whose clicks arrive with the app's own route in phase C (NOTES-B2.md).
    const state = currentState();
    expect(state?.jobs[0]).toBeDefined();
    if (state && state.jobs[0]) state.jobs[0].stage = 'ready';
    click('[data-office="workPlan"]');
    expect(html()).toContain('data-do="openAssign"');
    expect(html()).not.toContain('data-do="assignJob"');
    expect(html()).toContain('Nobody is on it');
    click('[data-do="closeModal"]');
  });

  it('shuts the Assign list by its cross, by Escape and by a click outside it (PIOTR, 18.09)', () => {
    const state = currentState();
    if (state && state.jobs[0]) state.jobs[0].stage = 'ready';
    click('[data-office="workPlan"]');
    click('[data-do="openAssign"]');
    expect(root().querySelector('.assign-list')).not.toBeNull();
    // The cross: the same control every modal has.
    expect(root().querySelector('.assign-list .modal-close[data-do="closeAssign"]')).not.toBeNull();
    click('.assign-list .modal-close');
    expect(root().querySelector('.assign-list')).toBeNull();
    // Escape shuts the list and leaves the plan open under it.
    click('[data-do="openAssign"]');
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(root().querySelector('.assign-list')).toBeNull();
    expect(root().querySelector('.modal-layer [data-modal="workPlan"]')).not.toBeNull();
    // A click anywhere outside it shuts it too.
    click('[data-do="openAssign"]');
    expect(root().querySelector('.assign-list')).not.toBeNull();
    click('.plan-chart');
    expect(root().querySelector('.assign-list')).toBeNull();
    click('[data-do="closeModal"]');
  });
});

describe('start production', () => {
  it('takes the owner to the bench, closes the laptop and shows the hall', () => {
    const state = currentState();
    expect(state).not.toBeNull();
    if (state && state.jobs[0]) {
      state.jobs[0].stage = 'ready';
      state.jobs[0].assignees = [];
      state.stock.sheets = 20;
    }
    click('[data-office="workPlan"]');
    expect(html()).toContain('data-do="startProduction"');
    click('[data-do="startProduction"]');
    // The work plan is shut; the top bar's Projects chip still carries the modal's name.
    expect(root().querySelector('.modal-layer [data-modal="workPlan"]')).toBeNull();
    expect(html()).toContain('hall-view');
    expect(currentState()?.jobs[0]?.assignees[0]).toBe('owner');
    expect(currentState()?.jobs[0]?.stage).toBe('inProduction');
    click('[data-do="setView"][data-view="office"]');
  });
});

describe('the walking figures', () => {
  it('puts a moved figure back where he had got to, so the walker carries him from there', () => {
    click('[data-do="setView"][data-view="hall"]');
    const before = root().querySelector('[data-figure="owner"]')?.getAttribute('transform');
    expect(before).toBeTruthy();
    const state = currentState();
    if (state) state.owner.station = 'gate';
    advanceMinutes(1);
    const after = root().querySelector('[data-figure="owner"]')?.getAttribute('transform');
    // The new node starts at the old place: the walker moves him on the frames that follow
    // (CLAUDE.md T16 2.2). The markup writes a station cell in whole pixels and the walker writes
    // where he really is in two decimals, so the same point is written two ways (T19 2.1).
    expect(after?.replace(/\.00/g, '')).toBe(before);
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
    expect(html()).toContain(`Books not up to date since ${formatCalendarDay(1)}`);
    expect(html()).toContain('? today');
    expect(html()).not.toContain('Unit deposit');
    // Nothing on the Days tab either: the month has not been written up.
    click('[data-do="accountingTab"][data-id="days"]');
    expect(html()).toContain(`Nothing has moved in ${monthName(1)}.`);
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
    expect(html()).toContain('s draw');
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
    expect(html()).toContain('s draw');
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
    expect(html()).toContain(' min');
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
