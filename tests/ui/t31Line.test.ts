/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// @vitest-environment jsdom
// Turn 31, 2.2 and 2.4: what the player reads of the line's timber and glass, on the Contracts tab's
// running block, the Materials page and the strip, and the two buttons that order them [PIOTR,
// 11.10: "storage and ordering, so that it does not run out"] (CLAUDE.md T31 2.2, 2.4, section 7).

import { describe, expect, it } from 'vitest';
import { LINE_MODULES } from '../../src/engine/constants';
import type { GameState } from '../../src/engine/index';
import { renderContracts } from '../../src/ui/contracts';
import { renderMaterials } from '../../src/ui/materials';
import { currentState, mount, render } from '../../src/ui/app';
import { act, buyStartingKit, newGame, nextDay, placeEquipment, testJoiner, withAir } from '../helpers';

/** A company in the 800 m² unit with the line standing whole at (2, 14), two engineers, two timber
 *  racks, and the line's contract running, with the material given. */
function running(boards: number, glass: number, racks = 2): GameState {
  let state = newGame({ difficulty: 'veryEasy' });
  state.cash = 9000000;
  state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
  state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'second' }));
  state = withAir(buyStartingKit(state), 'industrial');
  state.cash = 500000;
  for (let n = 0; n < racks; n += 1) placeEquipment(state, 'timberRack', { variantId: 'standard', x: 30, y: 2 + 2 * n, id: `kit-rack-${n + 1}` });
  LINE_MODULES.forEach((id, index) => placeEquipment(state, id, { x: 2 + 6 * index, y: 14, id: `kit-line-${index + 1}` }));
  for (const id of ['eng-1', 'eng-2']) {
    state.workers.push({ ...testJoiner(id, id), role: 'lineEngineer', tier: null, rate: 0, monthlyWage: 15000 });
  }
  state.windowLine.contract = {
    status: 'active',
    startDay: state.clock.day,
    windowsThisWeek: 3,
    weekStartDay: state.clock.day,
    windowsMade: 31,
    revenue: 46500,
    materialCost: 18600,
  };
  state.windowLine.boards = boards;
  state.stock.sheets += boards;
  state.windowLine.glass = glass;
  return state;
}

function block(state: GameState): HTMLElement {
  const tab = document.createElement('div');
  tab.innerHTML = renderContracts(state);
  const found = tab.querySelector<HTMLElement>('[data-line-contract]');
  if (found === null) throw new Error('no line block');
  return found;
}

function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error('Missing test fixture');
  return value;
}

describe('the running block s timber and glass (CLAUDE.md T31 2.4)', () => {
  it('says what the material costs, ordered ahead, and what the line holds and has on its way', () => {
    const state = running(24, 8);
    state.deliveries.push({
      id: 'del-line', jobId: null, sheets: 40, orderedDay: state.clock.day, pricePaid: 8000, arriveDay: state.clock.day + 1,
      arrived: false, unloaded: false, bespoke: false, overflowSheets: 0, boards: true, line: true,
    });
    state.windowLine.glassOnTheWay = [{ windows: 20, day: state.clock.day + 1 }];
    const text = block(state).textContent ?? '';
    for (const words of [
      '£1,500 a window; the timber and the glass £600 a window, ordered ahead',
      'Timber on the stores',
      '24 boards, for 12 windows, 40 more on the way',
      'Glass at module 6',
      'for 8 windows, 20 more on the way',
    ]) {
      expect(text, words).toContain(words);
    }
    expect(text).not.toContain('Standing still');
  });

  it('offers the two orders in a row of buttons under its rows, at their prices', () => {
    const node = block(running(24, 8));
    const timber = required(node.querySelector<HTMLButtonElement>('[data-do="orderLineTimber"]'));
    const glass = required(node.querySelector<HTMLButtonElement>('[data-do="orderLineGlass"]'));
    expect(timber.textContent).toBe('Order timber: 40 boards, £8,000');
    expect(glass.textContent).toBe('Order glass: 20 windows, £4,000');
    expect(timber.disabled).toBe(false);
    expect(glass.disabled).toBe(false);
    // In the ended block's row of buttons, after every row of the block.
    expect(timber.closest('.row-action')?.parentElement?.className).toBe('row');
    expect(node.lastElementChild?.querySelector('[data-do="orderLineTimber"]')).not.toBeNull();
  });

  it('locks each with its reason under the row: no store, module 6 full, and the cash', () => {
    const noStore = block(running(0, 30, 0));
    expect(noStore.querySelector('[data-do="orderLineTimber"]')).toBeNull();
    expect(noStore.querySelector('[data-do="orderLineGlass"]')).toBeNull();
    expect(Array.from(noStore.querySelectorAll('button[disabled]')).map((button) => button.textContent)).toEqual([
      'Order timber: 40 boards, £8,000',
      'Order glass: 20 windows, £4,000',
    ]);
    expect(Array.from(noStore.querySelectorAll('.lock')).map((line) => line.textContent)).toEqual([
      'No timber store',
      'Module 6 holds glass for 40 windows',
    ]);
    const poor = running(24, 8);
    poor.cash = poor.finance.overdraftLimit + 100;
    expect(Array.from(block(poor).querySelectorAll('.lock')).map((line) => line.textContent)).toEqual(['Not enough cash']);
  });

  it('says it stands still for want of timber, of glass, or both, while both engineers are on duty', () => {
    for (const [boards, glass, words] of [
      [0, 8, 'no timber'],
      [24, 0, 'no glass'],
      [1, 0, 'no timber or glass'],
    ] as const) {
      const rows = Array.from(block(running(boards, glass)).querySelectorAll('.row'));
      const still = rows.find((row) => row.textContent?.startsWith('Standing still'));
      expect(still?.querySelector('.row-figure')?.textContent, words).toBe(words);
      expect(still?.querySelector('.row-figure')?.classList.contains('bad')).toBe(true);
    }
    // An engineer away is said first.
    const short = running(0, 0);
    short.workers = short.workers.filter((worker) => worker.id !== 'eng-2');
    expect(block(short).textContent).toContain('one engineer on duty');
  });

  it('orders the timber and the glass at a click from the board', () => {
    document.body.innerHTML = '<div id="app"></div>';
    const root = required(document.querySelector<HTMLElement>('#app'));
    mount(root);
    required(root.querySelector<HTMLButtonElement>('[data-do="startGame"]')).click();
    const state = required(currentState());
    Object.assign(state, running(24, 8));
    render();
    required(root.querySelector<HTMLButtonElement>('[data-do="openModal"][data-modal="board"]')).click();
    required(root.querySelector<HTMLButtonElement>('[data-do="boardTab"][data-id="contracts"]')).click();
    const cash = required(currentState()).cash;
    required(root.querySelector<HTMLButtonElement>('[data-do="orderLineTimber"]')).click();
    expect(required(currentState()).deliveries.filter((delivery) => delivery.line === true)).toHaveLength(1);
    required(root.querySelector<HTMLButtonElement>('[data-do="orderLineGlass"]')).click();
    expect(required(currentState()).windowLine.glassOnTheWay).toHaveLength(1);
    expect(required(currentState()).cash).toBe(cash - 8000 - 4000);
    // Module 6 now holds 8 and has 20 on the way: a second batch makes 48, and is locked.
    expect(root.querySelector('[data-do="orderLineGlass"]')).toBeNull();
    expect(root.textContent).toContain('Module 6 holds glass for 40 windows');
  });
});

describe('the Materials page (CLAUDE.md T31 2.4)', () => {
  it('counts the line s boards as held on the boards row, and shows its glass while the line stands', () => {
    const page = document.createElement('div');
    page.innerHTML = renderMaterials(running(24, 8), '');
    const boards = required(page.querySelector('[data-stock="boards"]'));
    expect(boards.textContent).toContain('Held 24');
    expect(boards.textContent).toContain('Total 24 of 80');
    const glass = required(page.querySelector('[data-stock="lineGlass"]'));
    expect(glass.querySelector('.stock-name')?.textContent).toBe('Glass at the line');
    expect(glass.textContent).toContain('For 8 windows');
    expect(glass.textContent).toContain('Total 8 of 40');
    // No line, no row.
    const none = running(0, 0);
    none.equipment = none.equipment.filter((item) => !LINE_MODULES.includes(item.specId));
    page.innerHTML = renderMaterials(none, '');
    expect(page.querySelector('[data-stock="lineGlass"]')).toBeNull();
  });
});
