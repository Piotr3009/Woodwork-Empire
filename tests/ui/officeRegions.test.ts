// @vitest-environment jsdom
// Every region of the room does what docs/art/SPRITES.md 8.2 and 8.4 say it does, and the four
// laptop tabs are the one path to the modals that lost their desk item (CLAUDE.md T4 3.1).

import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { firstFreeCell } from '../../src/engine/layout';
import { currentState, mount, render } from '../../src/ui/app';
import { applyAction } from '../../src/engine/index';
import { OFFICE_REGIONS } from '../../src/render/office';
import { findSpec } from '../../src/engine/machines';
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

function html(): string {
  return root().innerHTML;
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
  click('[data-do="setView"][data-view="office"]');
  click('[data-office="catalogue"]');
  for (const specId of STARTING_KIT) {
    // The catalogue is in tabs from Turn 6, so the shopping walks them (CLAUDE.md T6 3.6).
    const tab = findSpec(specId)?.tab;
    if (tab !== undefined) click(`[data-do="catalogueTab"][data-id="${tab}"]`);
    const choose = root().querySelector(`[data-do="openMachine"][data-id="${specId}"]`);
    if (choose === null) {
      click(`[data-do="buyEquipment"][data-id="${specId}"]`);
      continue;
    }
    click(`[data-do="openMachine"][data-id="${specId}"]`);
    click(`[data-modal="machine"] [data-do="buyEquipment"][data-id="${specId}"]`);
    click('[data-modal="machine"] [data-do="closeModal"]');
  }
  click('[data-do="catalogueTab"][data-id="computers"]');
  click('[data-do="buySoftware"][data-id="oneOff"]');
  click('[data-do="closeModal"]');
  // A job on the books, or the tests below would pass on an empty board.
  click('[data-do="openModal"][data-modal="board"]');
  click('[data-do="acceptEnquiry"]');
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
    expect(clock?.textContent).toBe('08:00');
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
    expect(html()).toContain('Ducting to reconnect: 1 machine, £800');
    click('[data-do="endSetup"]');
    expect(html()).toContain('Moving machines');
    // Back to a hall that is being shifted, so the kit cannot be dragged again.
    expect(html()).not.toContain('data-do="startSetup"');
    click('[data-do="setView"][data-view="office"]');
  });
});

describe('the laptop tabs', () => {
  it('carries the four tabs of the contract, Tasks first', () => {
    click('[data-office="laptop"]');
    const tabs = Array.from(root().querySelectorAll('[data-do="laptopTab"]'));
    expect(tabs.map((tab) => tab.getAttribute('data-id'))).toEqual([
      'tasks',
      'materials',
      'team',
      'drawings',
    ]);
    expect(tabs[0]?.className).toContain('is-on');
  });

  it('reaches the material, the team and the drawings, one path each', () => {
    for (const [tab, mark] of [
      ['tasks', 'Office tasks today'],
      ['materials', 'Buy sheets for stock'],
      ['team', 'Taking somebody on'],
      ['drawings', 'Design queue'],
    ]) {
      click(`[data-do="laptopTab"][data-id="${tab}"]`);
      expect(html(), tab).toContain(mark ?? '');
      expect(openModalId(), tab).toBe('laptop');
    }
    // There is no second way in: the three have no modal of their own any more.
    expect(html()).not.toContain('data-modal="materials"');
    expect(html()).not.toContain('data-modal="hiring"');
    expect(html()).not.toContain('data-modal="drawings"');
    click('[data-do="laptopTab"][data-id="tasks"]');
    click('[data-do="closeModal"]');
  });

  it('starts a new tab at the top rather than where the last one was scrolled', () => {
    click('[data-office="laptop"]');
    const body = root().querySelector('.modal-layer [data-modal="laptop"] .modal-body');
    if (!(body instanceof HTMLElement)) throw new Error('no laptop body');
    body.scrollTop = 120;
    click('[data-do="laptopTab"][data-id="team"]');
    expect(body.scrollTop).toBe(0);
    click('[data-do="laptopTab"][data-id="tasks"]');
    click('[data-do="closeModal"]');
  });

  it('gives the tab bar a rule of its own, so the four chips are laid out', () => {
    click('[data-office="laptop"]');
    expect(html()).toContain('class="tabs"');
    const css = readFileSync('src/ui/styles.css', 'utf8');
    expect(css).toContain('.tabs {');
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
    // And nowhere in the laptop, on any of its four tabs.
    click('[data-office="laptop"]');
    for (const tab of ['tasks', 'materials', 'team', 'drawings']) {
      click(`[data-do="laptopTab"][data-id="${tab}"]`);
      expect(html(), tab).not.toContain('Start production');
      expect(html(), tab).not.toContain('Calls: 0 of');
    }
    click('[data-do="laptopTab"][data-id="tasks"]');
    click('[data-do="closeModal"]');
  });
});
