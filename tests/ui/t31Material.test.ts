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
// running block and the Materials page (CLAUDE.md T31 2.2, 2.4, section 7). From Turn 32 the line
// takes its boards and glass from the stores: the block reads what its contract holds and has no
// order buttons, and the Materials page restocks the stores the line takes from (CLAUDE.md T32 2.5,
// 2.7). The test of the two buttons' locks went with the buttons.

import { describe, expect, it } from 'vitest';
import { LINE_MODULES } from '../../src/engine/constants';
import type { GameState } from '../../src/engine/index';
import { renderContracts } from '../../src/ui/contracts';
import { renderMaterials } from '../../src/ui/materials';
import { currentState, mount, render } from '../../src/ui/app';
import { act, buyStartingKit, newGame, nextDay, placeEquipment, placeGlassRack, testJoiner, withAir } from '../helpers';
import { lineState, reserveLineMaterial } from '../../src/engine/lineContract';
import { restockSheets, stockCostFor } from '../../src/engine/materials';

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

/** The line on its contract with two engineers, a timber shelter and a large glass rack, and this
 *  many boards and glass units on them, which the contract holds as far as its week wants them
 *  (CLAUDE.md T32 2.5). Flipped in v96: the line has no boards or glass of its own. */
function running(boards: number, glass: number): GameState {
  const state = bigUnit();
  LINE_MODULES.forEach((id, index) => placeEquipment(state, id, { x: 2 + 6 * index, y: 14, id: `kit-line-${index + 1}` }));
  for (const id of ['eng-1', 'eng-2']) {
    state.workers.push({ ...testJoiner(id, id), role: 'lineEngineer', tier: null, rate: 0, monthlyWage: 15000 });
  }
  placeEquipment(state, 'timberShelter', { variantId: 'standard', x: 30, y: 2, id: 'kit-store' });
  placeGlassRack(state, 'glassRackLarge');
  lineState(state, 1).contract = {
    status: 'active',
    startDay: state.clock.day,
    windowsThisWeek: 3,
    weekStartDay: state.clock.day,
    windowsMade: 20,
    revenue: 30000,
    materialCost: 12000,
    boardsReserved: 0,
    glassReserved: 0,
  };
  state.stock.boards = boards;
  state.stock.glass = glass;
  reserveLineMaterial(state, 1);
  return state;
}

function block(state: GameState): HTMLElement {
  const tab = document.createElement('div');
  tab.innerHTML = renderContracts(state);
  const found = tab.querySelector<HTMLElement>('[data-line-contract]');
  if (found === null) throw new Error('the line s block is wanted');
  return found;
}

/** A row of the block by its name, its text after the name. */
function rowOf(state: GameState, name: string): string {
  const rows = Array.from(block(state).querySelectorAll('.row')).map((row) => row.textContent ?? '');
  return rows.find((row) => row.startsWith(name))?.slice(name.length) ?? '';
}

describe('the line s running block (CLAUDE.md T31 2.2, 2.4, T32 2.5)', () => {
  it('reads what its contract holds of the stores, with no order buttons and no reason under its rows', () => {
    const state = running(24, 8);
    const text = block(state).textContent ?? '';
    // Flipped in v96: from the stores, not ordered ahead (CLAUDE.md T32 2.5).
    expect(text).toContain('£1,500 a window; the timber and the glass £600 a window, from the stores');
    expect(text).not.toContain('ordered ahead');
    expect(rowOf(state, 'Timber held')).toBe('24 boards, for 12 windows');
    expect(rowOf(state, 'Glass held')).toBe('for 8 windows');
    expect(text).not.toContain('Timber on the stores');
    expect(text).not.toContain('module 6');
    expect(text).not.toContain('on the way');
    expect(text).not.toContain('Standing still');
    expect(block(state).querySelector('[data-do="orderLineTimber"]')).toBeNull();
    expect(block(state).querySelector('[data-do="orderLineGlass"]')).toBeNull();
    expect(Array.from(block(state).querySelectorAll('button')).map((button) => button.textContent)).toEqual(['End it']);
    expect(block(state).querySelector('p.lock')).toBeNull();
  });

  it('holds no more than the week in hand wants, whatever stands on the stores', () => {
    // Three windows made this week of forty (v97): thirty seven left, so 74 boards and 37 units.
    const state = running(200, 100);
    expect(rowOf(state, 'Timber held')).toBe('74 boards, for 37 windows');
    expect(rowOf(state, 'Glass held')).toBe('for 37 windows');
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

  it('is fed by the Materials page: a Restock of boards and one of glass at one click each, paid at the click', () => {
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
    opener.dataset.modal = 'laptop';
    root.appendChild(opener);
    opener.click();
    root.querySelector<HTMLButtonElement>('[data-modal="laptop"] [data-tile="stock"]')?.click();
    const before = currentState();
    if (before === null) throw new Error('a game is wanted');
    const boards = restockSheets(before, 'boards');
    const glass = restockSheets(before, 'glass');
    const cash = before.cash;
    // Flipped in v96: the line's own two buttons went; the stores' Restock is the one road
    // (CLAUDE.md T32 2.3, 2.5).
    root.querySelector<HTMLButtonElement>('[data-do="restock"][data-kind="boards"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-do="restock"][data-kind="glass"]')?.click();
    const after = currentState();
    expect(after?.cash).toBe(cash - stockCostFor('boards', boards) - stockCostFor('glass', glass));
    const loads = (after?.deliveries ?? []).filter((delivery) => delivery.jobId === null && !delivery.unloaded);
    expect(loads.map((delivery) => [delivery.material, delivery.sheets])).toEqual([
      ['boards', boards],
      ['glass', glass],
    ]);
  });
});

describe('the Materials page (CLAUDE.md T31 2.4, T32 2.7)', () => {
  it('counts what the line holds as reserved on the boards line and the glass line, and has no glass rows of the line', () => {
    const state = running(24, 8);
    const page = document.createElement('div');
    page.innerHTML = renderMaterials(state, '');
    // Flipped in v96: the line's boards and glass are reserved stock on the stores' lines, and the
    // per line glass rows went (CLAUDE.md T32 2.7).
    const boards = page.querySelector('[data-stock="boards"]')?.textContent ?? '';
    expect(boards).toContain('Free 0');
    expect(boards).toContain('Reserved 24');
    expect(boards).toContain('Total 24 of 400');
    const glass = page.querySelector('[data-stock="glass"]')?.textContent ?? '';
    expect(glass).toContain('Free 0');
    expect(glass).toContain('Reserved 8');
    expect(glass).toContain('Total 8 of 200');
    expect(page.querySelector('[data-stock="lineGlass"]')).toBeNull();
    expect(page.textContent).not.toContain('Glass at line 1');
    const gone = running(0, 0);
    gone.equipment = gone.equipment.filter((item) => !LINE_MODULES.includes(item.specId));
    page.innerHTML = renderMaterials(gone, '');
    expect(page.querySelector('[data-stock="lineGlass"]')).toBeNull();
  });
});
