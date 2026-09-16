// @vitest-environment jsdom
// Every region of the room does what docs/art/SPRITES.md 8.2 and 8.4 say it does, and the tiles of
// the laptop's home screen are the one path to the pages that lost their desk item (CLAUDE.md T4
// 3.1, T14 2.1).

import { beforeAll, describe, expect, it } from 'vitest';
import { firstFreeCell } from '../../src/engine/layout';
import { advanceMinutes, currentState, mount, render } from '../../src/ui/app';
import { applyAction } from '../../src/engine/index';
import { OFFICE_REGIONS } from '../../src/render/office';
import { formatTime } from '../../src/engine/clock';
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

function html(): string {
  return root().innerHTML;
}

/** Answers whatever the engine is asking with the first choice. */
function dismissEvents(): void {
  let guard = 0;
  while (root().querySelector('[data-do="closeHouseCard"], [data-do="resolveEvent"]') !== null && guard < 50) {
    click('[data-do="closeHouseCard"], [data-do="resolveEvent"]');
    guard += 1;
  }
}

/** Plays through to the morning the lorry comes and takes the load off it. The whole of day 1's
 *  ordering is on one van at 08:00 the next working day (CLAUDE.md T8 3.2, T9 3.1). */
function unloadTheKit(): void {
  let guard = 0;
  while ((currentState()?.onOrder.length ?? 0) > 0 && guard < 200) {
    guard += 1;
    dismissEvents();
    if ((currentState()?.onOrder.length ?? 0) === 0) break;
    advanceMinutes(30);
  }
  dismissEvents();
}

/** Drags an item to a tile, the way setup mode does through the engine. */
function moveItem(itemId: string, x: number, y: number): void {
  const state = currentState();
  if (!state) throw new Error('no game');
  const next = applyAction(state, { type: 'MOVE_ITEM', itemId, x, y });
  Object.assign(state, next);
  render();
}

function openModalId(): string | null {
  return root().querySelector('.modal-layer .modal')?.getAttribute('data-modal') ?? null;
}

beforeAll(() => {
  document.body.innerHTML = '<div id="app"></div>';
  mount(root());
  click('[data-do="startGame"]');
  // Nothing in the office opens, and nothing is bought, on a stopped clock (CLAUDE.md T7 3.10).
  click('[data-do="setSpeed"][data-speed="1"]');
  click('[data-do="setView"][data-view="office"]');
  click('[data-office="catalogue"]');
  for (const specId of STARTING_KIT) {
    // The catalogue is tabs of folders from Turn 7: the tab, the family's folder, and the classes
    // are inside it (CLAUDE.md T6 3.6, T7 3.7).
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
  click('[data-do="closeModal"]');
  // The lorry comes at 08:00 tomorrow with the lot of it, or the hall would be empty
  // (CLAUDE.md T8 3.2, T9 3.1).
  unloadTheKit();
  // And the licence goes on the laptop once there is a laptop to put it on (CLAUDE.md T9 3.1).
  click('[data-office="catalogue"]');
  click('[data-do="catalogueTab"][data-id="computers"]');
  click('[data-do="buySoftware"][data-id="oneOff"]');
  click('[data-do="closeModal"]');
  // A job on the books, or the tests below would pass on an empty board.
  click('[data-do="openModal"][data-modal="board"]');
  click('[data-do="acceptEnquiry"]');
  // The client's number, taken (CLAUDE.md T13 3.24).
  click('[data-do="resolveEvent"][data-id="accept"]');
  click('[data-do="closeModal"]');
});

describe('what each region of the room opens', () => {
  it('has all seven regions on the page', () => {
    for (const region of OFFICE_REGIONS) {
      expect(html(), region.id).toContain(`data-office="${region.id}"`);
    }
  });

  it('opens the right modal from each board and object, and the door goes to the hall', () => {
    for (const [region, modal] of [
      ['workPlan', 'workPlan'],
      ['orders', 'board'],
      ['laptop', 'laptop'],
      ['catalogue', 'catalogue'],
      ['binder', 'accounting'],
    ]) {
      click(`[data-office="${region}"]`);
      expect(openModalId(), region).toBe(modal);
      click('[data-do="closeModal"]');
      expect(openModalId(), region).toBeNull();
    }
    click('[data-office="door"]');
    expect(html()).toContain('hall-view');
    expect(html()).not.toContain('office-room');
    click('[data-do="setView"][data-view="office"]');
    expect(html()).toContain('office-room');
  });

  it('leaves the clock alone: it is the live clock and opens nothing', () => {
    click('[data-office="clock"]');
    expect(openModalId()).toBeNull();
    expect(html()).toContain('office-room');
  });

  it('shows the game time and the company name on the artwork', () => {
    const state = currentState();
    const clock = root().querySelector('[data-office-text="clock"]');
    const company = root().querySelector('[data-office-text="company"]');
    // Whatever the morning's shopping has cost him, the wall clock says what the engine says.
    expect(clock?.textContent).toBe(formatTime(state?.clock.minute ?? -1));
    expect(company?.textContent).toBe(state?.companyName ?? '');
  });
});

describe('setting the hall out', () => {
  it('says what the moves made so far will cost to reconnect, before Done', () => {
    click('[data-office="door"]');
    expect(html()).toContain('hall-view');
    click('[data-do="startSetup"]');
    expect(html()).toContain('data-do="endSetup"');
    expect(html()).not.toContain('Ducting to reconnect');
    const state = currentState();
    const saw = state?.equipment.find((item) => item.specId === 'tableSaw');
    const rack = state?.equipment.find((item) => item.specId === 'sheetRack');
    if (!saw || !rack) throw new Error('no kit in the hall');
    // A tile down the hall is no longer a move that always lands: a class reserves the room
    // around it, so the test asks the engine where the thing will go (CLAUDE.md T7 3.3).
    for (const item of [saw, rack]) {
      const now = currentState();
      if (!now) throw new Error('no game running');
      const to = firstFreeCell(now, item.specId, item.variantId);
      if (!to) throw new Error(`nowhere to drag the ${item.specId}`);
      moveItem(item.id, to.x, to.y);
    }
    // The exact words CLAUDE.md T4 3.5 asks for, with the running total. Two things moved and one
    // of them ducted: the shelving has nothing to reconnect (CLAUDE.md T6 3.5).
    expect(html()).toContain('Extraction pipe to run again: 1 machine');
    click('[data-do="endSetup"]');
    // The machine is asked about before it is booked, and the shelving is carried for nothing
    // (PIOTR, 13.09; CLAUDE.md T8 3.4).
    expect(html()).toContain(
      'Moving 1 machine takes 1 h and the extraction pipe of 1 machine run again at the new length. Do it?',
    );
    click('[data-do="resolveEvent"][data-id="do"]');
    expect(html()).toContain('Moving machines');
    // Back to a hall that is being shifted, so the kit cannot be dragged again.
    expect(html()).not.toContain('data-do="startSetup"');
    click('[data-do="setView"][data-view="office"]');
  });
});

describe('the laptop tiles', () => {
  it('opens on home, with the three big tiles in the order of the contract and the Office group', () => {
    click('[data-office="laptop"]');
    expect(root().querySelector('[data-modal="laptop"] [data-laptop-page="home"]')).not.toBeNull();
    const big = Array.from(root().querySelectorAll('[data-modal="laptop"] .screen-tile'));
    // Tasks, Stock, Drawings, left to right, and nothing else in the row (CLAUDE.md T14 1).
    expect(big.map((tile) => tile.getAttribute('data-tile'))).toEqual(['tasks', 'stock', 'drawings']);
    const small = Array.from(root().querySelectorAll('[data-modal="laptop"] .screen-small-tile'));
    expect(small.map((tile) => tile.getAttribute('data-tile'))).toEqual([
      'team',
      'website',
      'insurance',
      'security',
      'joineryCore',
      'settings',
    ]);
    // The tab bar is gone: the tiles are the navigation, and there is no second one (T14 2.1).
    expect(root().querySelector('[data-modal="laptop"] .tabs')).toBeNull();
    expect(html()).not.toContain('data-do="laptopTab"');
    click('[data-do="closeModal"]');
  });

  it('reaches the stock and the drawings off their tiles, one path each, and comes back home', () => {
    click('[data-office="laptop"]');
    for (const [tile, mark] of [
      ['tasks', 'Office tasks today'],
      ['stock', 'data-stock='],
      ['drawings', 'Design queue'],
    ]) {
      click(`[data-modal="laptop"] [data-tile="${tile}"]`);
      expect(html(), tile).toContain(mark ?? '');
      expect(openModalId(), tile).toBe('laptop');
      expect(root().querySelector(`[data-laptop-page="${tile}"]`), tile).not.toBeNull();
      // The back arrow at the top left, and home again.
      click('[data-modal="laptop"] [data-tile="home"]');
      expect(root().querySelector('[data-laptop-page="home"]'), tile).not.toBeNull();
    }
    // There is no second way in: the two have no modal of their own any more.
    expect(html()).not.toContain('data-modal="materials"');
    expect(html()).not.toContain('data-modal="hiring"');
    expect(html()).not.toContain('data-modal="drawings"');
    click('[data-do="closeModal"]');
  });

  it('opens the Team board off the Office tile, because the team is a page of its own', () => {
    click('[data-office="laptop"]');
    click('[data-modal="laptop"] [data-tile="team"]');
    // One click, and it is the Team board and not a page inside the laptop (CLAUDE.md T10 3.6,
    // T14 2.1).
    expect(openModalId()).toBe('team');
    expect(html()).toContain('Taking somebody on');
    expect(html()).toContain('data-do="teamTab"');
    click('[data-do="closeModal"]');
  });

  it('starts a new page at the top rather than where the last one was scrolled', () => {
    click('[data-office="laptop"]');
    const body = root().querySelector('.modal-layer [data-modal="laptop"] .modal-body');
    if (!(body instanceof HTMLElement)) throw new Error('no laptop body');
    body.scrollTop = 120;
    click('[data-modal="laptop"] [data-tile="stock"]');
    expect(body.scrollTop).toBe(0);
    click('[data-modal="laptop"] [data-tile="home"]');
    click('[data-do="closeModal"]');
  });

  it('puts the jobs on the books on the Work Plan board and nowhere else', () => {
    const job = currentState()?.jobs[0];
    expect(job).toBeDefined();
    // The card is on the board, with the Start production the brief asks it to carry.
    click('[data-office="workPlan"]');
    expect(openModalId()).toBe('workPlan');
    expect(html()).toContain(job?.name ?? 'no job');
    expect(html()).toContain('Start production');
    expect(html()).toContain('Calls: 0 of');
    click('[data-do="closeModal"]');
    // And nowhere in the laptop, on any of its three pages.
    click('[data-office="laptop"]');
    for (const tile of ['tasks', 'stock', 'drawings']) {
      click(`[data-modal="laptop"] [data-tile="${tile}"]`);
      expect(html(), tile).not.toContain('Start production');
      expect(html(), tile).not.toContain('Calls: 0 of');
      click('[data-modal="laptop"] [data-tile="home"]');
    }
    click('[data-do="closeModal"]');
  });
});
