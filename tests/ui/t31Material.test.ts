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
// running block, its two order buttons, and the Materials page (CLAUDE.md T31 2.2, 2.4, section 7).

import { describe, expect, it } from 'vitest';
import { LINE_MODULES } from '../../src/engine/constants';
import type { GameState } from '../../src/engine/index';
import { renderContracts } from '../../src/ui/contracts';
import { renderMaterials } from '../../src/ui/materials';
import { currentState, mount, render } from '../../src/ui/app';
import { act, buyStartingKit, newGame, nextDay, placeEquipment, testJoiner, withAir } from '../helpers';

function bigUnit(): GameState {
  let state = newGame({ difficulty: 'veryEasy' });
  state.cash = 9000000;
  state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
  state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'second' }));
  state = withAir(buyStartingKit(state), 'industrial');
  state.cash = 500000;
  state.enquiries = [];
  return state;
}

/** The line on its contract with two engineers, a timber shelter, and this much timber and glass. */
function running(boards: number, glass: number): GameState {
  const state = bigUnit();
  LINE_MODULES.forEach((id, index) => placeEquipment(state, id, { x: 2 + 6 * index, y: 14, id: `kit-line-${index + 1}` }));
  for (const id of ['eng-1', 'eng-2']) {
    state.workers.push({ ...testJoiner(id, id), role: 'lineEngineer', tier: null, rate: 0, monthlyWage: 15000 });
  }
  placeEquipment(state, 'timberShelter', { variantId: 'standard', x: 30, y: 2, id: 'kit-store' });
  state.windowLine.contract = {
    status: 'active',
    startDay: state.clock.day,
    windowsThisWeek: 3,
    weekStartDay: state.clock.day,
    windowsMade: 20,
    revenue: 30000,
    materialCost: 12000,
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
  if (found === null) throw new Error('the line s block is wanted');
  return found;
}

describe('the line s running block (CLAUDE.md T31 2.2, 2.4)', () => {
  it('reads its timber and glass and offers the two orders under its rows', () => {
    const state = running(24, 8);
    state.deliveries.push({
      id: 'del-line',
      jobId: null,
      sheets: 40,
      orderedDay: state.clock.day,
      pricePaid: 8000,
      arriveDay: state.clock.day + 1,
      arrived: false,
      unloaded: false,
      bespoke: false,
      overflowSheets: 0,
      boards: true,
      line: true,
    });
    state.windowLine.glassOnTheWay = [{ windows: 20, day: state.clock.day + 1 }];
    const text = block(state).textContent ?? '';
    expect(text).toContain('£1,500 a window; the timber and the glass £600 a window, ordered ahead');
    expect(text).toContain('Timber on the stores');
    expect(text).toContain('24 boards, for 12 windows, 40 more on the way');
    expect(text).toContain('Glass at module 6');
    expect(text).toContain('for 8 windows, 20 more on the way');
    expect(text).not.toContain('Standing still');
    // With 28 at module 6 and on its way, and a batch more past module 6's 40, the glass is locked; with none coming it
    // is offered.
    expect(block(state).querySelector('[data-do="orderLineGlass"]')).toBeNull();
    state.windowLine.glassOnTheWay = [];
    const timber = block(state).querySelector<HTMLButtonElement>('[data-do="orderLineTimber"]');
    const glass = block(state).querySelector<HTMLButtonElement>('[data-do="orderLineGlass"]');
    expect(timber?.textContent).toBe('Order timber: 40 boards, £8,000');
    expect(glass?.textContent).toBe('Order glass: 20 windows, £4,000');
    expect(timber?.disabled).toBe(false);
    expect(glass?.disabled).toBe(false);
  });

  it('locks each button with its reason under it, a reason said once', () => {
    const full = running(24, 30);
    full.equipment = full.equipment.filter((item) => item.id !== 'kit-store');
    const locked = block(full);
    expect(locked.querySelector('[data-do="orderLineTimber"]')).toBeNull();
    const buttons = Array.from(locked.querySelectorAll<HTMLButtonElement>('button[disabled]')).map((button) => button.textContent);
    expect(buttons).toEqual(['Order timber: 40 boards, £8,000', 'Order glass: 20 windows, £4,000']);
    expect(Array.from(locked.querySelectorAll('p.lock')).map((line) => line.textContent)).toEqual([
      'No timber store',
      'Module 6 holds glass for 40 windows',
    ]);
    const poor = running(24, 0);
    poor.cash = poor.finance.overdraftLimit;
    expect(Array.from(block(poor).querySelectorAll('p.lock')).map((line) => line.textContent)).toEqual(['Not enough cash']);
  });

  it('says it stands still for want of timber, of glass, or of both, the engineer said first', () => {
    const still = (state: GameState): string => {
      const rows = Array.from(block(state).querySelectorAll('.row')).map((row) => row.textContent ?? '');
      return rows.find((row) => row.startsWith('Standing still')) ?? '';
    };
    expect(still(running(1, 5))).toBe('Standing stillno timber');
    expect(still(running(10, 0))).toBe('Standing stillno glass');
    expect(still(running(0, 0))).toBe('Standing stillno timber or glass');
    const one = running(0, 0);
    one.workers = one.workers.filter((worker) => worker.id !== 'eng-2');
    expect(still(one)).toBe('Standing stillone engineer on duty');
  });

  it('orders at one click from the board, paid at the click', () => {
    document.body.innerHTML = '<div id="app"></div>';
    const root = document.querySelector<HTMLElement>('#app');
    if (root === null) throw new Error('the app is wanted');
    mount(root);
    root.querySelector<HTMLButtonElement>('[data-do="startGame"]')?.click();
    const state = currentState();
    if (state === null) throw new Error('a game is wanted');
    Object.assign(state, running(0, 0));
    render();
    const opener = document.createElement('button');
    opener.dataset.do = 'openModal';
    opener.dataset.modal = 'board';
    root.appendChild(opener);
    opener.click();
    root.querySelector<HTMLButtonElement>('[data-do="boardTab"][data-id="contracts"]')?.click();
    const cash = currentState()?.cash ?? 0;
    root.querySelector<HTMLButtonElement>('[data-do="orderLineTimber"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-do="orderLineGlass"]')?.click();
    const after = currentState();
    expect(after?.cash).toBe(cash - 12000);
    expect(after?.deliveries.filter((delivery) => delivery.line === true)).toHaveLength(1);
    expect(after?.windowLine.glassOnTheWay).toHaveLength(1);
  });
});

describe('the Materials page (CLAUDE.md T31 2.4)', () => {
  it('counts the line s boards in the boards row and shows its glass while the line stands', () => {
    const state = running(24, 8);
    const page = document.createElement('div');
    page.innerHTML = renderMaterials(state, '');
    expect(page.querySelector('[data-stock="boards"]')?.textContent).toContain('Held 24');
    const glass = page.querySelector('[data-stock="lineGlass"]')?.textContent ?? '';
    expect(glass).toContain('Glass at the line');
    expect(glass).toContain('For 8 windows');
    expect(glass).toContain('Total 8 of 40');
    const gone = running(0, 0);
    gone.equipment = gone.equipment.filter((item) => !LINE_MODULES.includes(item.specId));
    page.innerHTML = renderMaterials(gone, '');
    expect(page.querySelector('[data-stock="lineGlass"]')).toBeNull();
  });
});
