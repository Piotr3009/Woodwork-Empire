/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// @vitest-environment jsdom
// Turn 30, 2.3: the line bought and sold whole, as the catalogue's Owned tab shows it [PIOTR,
// 11.10: "one whole"; TUNE: chat: sold whole, from any module's tile] (CLAUDE.md T30 2.3.4, 2.3.5,
// section 7).

import { describe, expect, it } from 'vitest';
import { LINE_MODULES } from '../../src/engine/constants';
import type { GameState } from '../../src/engine/index';
import { placeEquipmentOrder } from '../../src/engine/game';
import { catalogueTabFrom, renderCatalogue } from '../../src/ui/catalogue';
import { renderContracts, renderContractsTab } from '../../src/ui/contracts';
import { renderHall } from '../../src/render/hall';
import { testJoiner } from '../helpers';
import { currentState, mount, render } from '../../src/ui/app';
import { tileToScreen } from '../../src/render/iso';
import { act, buyStartingKit, newGame, nextDay, placeEquipment, withAir } from '../helpers';

/** A company in the 800 m² unit with the day one kit, air enough for a CNC, and the money for the
 *  line. */
function bigUnit(): GameState {
  let state = newGame({ difficulty: 'veryEasy' });
  state.cash = 9000000;
  state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
  state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'second' }));
  state = withAir(buyStartingKit(state), 'industrial');
  state.cash = 12000000;
  state.reputation = 40;
  return state;
}

function owned(state: GameState, sellConfirm: string | null = null): HTMLElement {
  const page = document.createElement('div');
  page.innerHTML = renderCatalogue(state, '', catalogueTabFrom('owned'), null, 'line', sellConfirm);
  return page;
}

describe('the line on the Owned tab (CLAUDE.md T30 2.3.3, 2.3.5)', () => {
  it('keeps every module s tile, each selling the whole line for half of what the six cost, then Confirm sale', () => {
    const state = bigUnit();
    LINE_MODULES.forEach((id, index) => placeEquipment(state, id, { x: 2 + 6 * index, y: 14, id: `kit-line-${index + 1}` }));
    const page = owned(state);
    for (let n = 1; n <= 6; n += 1) {
      const tile = page.querySelector(`[data-owned="kit-line-${n}"]`);
      expect(tile, `module ${n}`).not.toBeNull();
      expect(tile?.querySelector('.tile-name')?.textContent, `module ${n}`).toContain(`Window line, module ${n}`);
      const sell = tile?.querySelector('[data-card-row="sell"] [data-do="sellMachine"]');
      expect(sell?.textContent, `module ${n}`).toBe('Sell the line for £5,000,000');
      // A module has no Turn row: the line is never turned.
      expect(tile?.querySelector('[data-card-row="turn"]'), `module ${n}`).toBeNull();
    }
    const confirm = owned(state, 'kit-line-4').querySelector('[data-owned="kit-line-4"] [data-card-row="sell"] button');
    expect(confirm?.textContent).toBe('Confirm sale');
    expect(confirm?.getAttribute('data-confirm')).toBe('1');
  });

  it('shows the six on order, each built to order and never called off', () => {
    const state = bigUnit();
    expect(placeEquipmentOrder(state, 'windowLine1').ok).toBe(true);
    const page = owned(state);
    const tiles = Array.from(page.querySelectorAll('[data-order]'));
    expect(tiles).toHaveLength(6);
    for (const tile of tiles) {
      expect(tile.textContent).toContain('Built to order: it cannot be called off');
      expect(tile.querySelector('[data-do="cancelOrder"]')).toBeNull();
    }
  });
});

describe('the line dragged in setup mode (CLAUDE.md T30 2.4)', () => {
  function required<T>(value: T | null | undefined): T {
    if (value === null || value === undefined) throw new Error('Missing test fixture');
    return value;
  }

  it('draws the six at the drag together in the ghost, and drops them all', () => {
    document.body.innerHTML = '<div id="app"></div>';
    const root = required(document.querySelector<HTMLElement>('#app'));
    mount(root);
    required(root.querySelector<HTMLButtonElement>('[data-do="startGame"]')).click();
    required(root.querySelector<HTMLButtonElement>('[data-do="setSpeed"][data-speed="1"]')).click();
    const state = required(currentState());
    const big = bigUnit();
    LINE_MODULES.forEach((id, index) => placeEquipment(big, id, { x: 2 + 6 * index, y: 14, id: `kit-line-${index + 1}` }));
    big.speed = 1;
    Object.assign(state, big);
    render();
    Object.defineProperty(SVGSVGElement.prototype, 'getScreenCTM', {
      configurable: true,
      value: () => ({ inverse: () => ({ a: 0.5, d: 0.5, e: -150, f: -60 }) }),
    });
    Object.defineProperty(SVGSVGElement.prototype, 'createSVGPoint', {
      configurable: true,
      value: () => ({
        x: 0,
        y: 0,
        matrixTransform(matrix: { a: number; d: number; e: number; f: number }) {
          return { x: this.x * matrix.a + matrix.e, y: this.y * matrix.d + matrix.f };
        },
      }),
    });
    const mouse = (type: string, x: number, y: number): MouseEvent => {
      const point = tileToScreen(x + 0.25, y + 0.25);
      return new MouseEvent(type, { bubbles: true, clientX: point.x * 2 + 300, clientY: point.y * 2 + 120 });
    };
    required(root.querySelector<HTMLButtonElement>('[data-do="startSetup"]')).click();
    required(root.querySelector('[data-kit="kit-line-3"]')).dispatchEvent(mouse('mousedown', 14, 14));
    // Back from the front wall, where its lane lets it stand (CLAUDE.md T31 2.6).
    window.dispatchEvent(mouse('mousemove', 14, 11));
    const ghost = required(root.querySelector('[data-ghost]'));
    expect(ghost.querySelectorAll('[data-ghost-part]')).toHaveLength(6);
    expect(ghost.textContent).toBe('Drop it here');
    window.dispatchEvent(mouse('mouseup', 14, 11));
    // The six went by the same cells, wherever the mouse put module 3.
    const moved = required(currentState()).equipment.filter((item) => LINE_MODULES.includes(item.specId));
    const first = required(moved[0]);
    expect(first.anchorY).not.toBe(14);
    expect(moved.map((item) => [item.anchorX, item.anchorY])).toEqual(
      LINE_MODULES.map((_, index) => [first.anchorX + 6 * index, first.anchorY]),
    );
    delete (SVGSVGElement.prototype as unknown as Record<string, unknown>).getScreenCTM;
    delete (SVGSVGElement.prototype as unknown as Record<string, unknown>).createSVGPoint;
  });
});

describe('what the player reads of the line s contract (CLAUDE.md T30 2.9)', () => {
  function running(): GameState {
    const state = bigUnit();
    LINE_MODULES.forEach((id, index) => placeEquipment(state, id, { x: 2 + 6 * index, y: 14, id: `kit-line-${index + 1}` }));
    for (const id of ['eng-1', 'eng-2']) {
      state.workers.push({ ...testJoiner(id, id), role: 'lineEngineer', tier: null, rate: 0, monthlyWage: 15000 });
    }
    state.windowLine.contract = {
      status: 'active',
      startDay: state.clock.day,
      windowsThisWeek: 7,
      weekStartDay: state.clock.day,
      windowsMade: 112,
      revenue: 168000,
      materialCost: 67200,
    };
    state.windowLine.onPallet = 7;
    state.windowLine.palletsAtGate = 1;
    // Its timber and glass, from Turn 31 (CLAUDE.md T31 2.1).
    state.windowLine.boards = 40;
    state.stock.sheets += 40;
    state.windowLine.glass = 20;
    return state;
  }

  it('stands first on the Orders board s Contracts tab, in a running contract s classes, with End it', () => {
    const tab = document.createElement('div');
    tab.innerHTML = renderContracts(running());
    const block = tab.querySelector('.contract-active[data-line-contract]');
    expect(block).not.toBeNull();
    expect(tab.querySelector('.contract-active')).toBe(block);
    const text = block?.textContent ?? '';
    for (const words of [
      'Windows off the line',
      '£1,500 a window; the timber and the glass £600 a window, ordered ahead',
      'One window every 2 hours: about 20 a week',
      'This week: 7 windows. In all: 112',
      'On the pallet',
      '7 of 10',
      'At the gate for collection',
      '1 pallet',
    ]) {
      expect(text, words).toContain(words);
    }
    expect(text).not.toContain('Standing still');
    expect(block?.querySelector('[data-do="endLineContract"]')?.textContent).toBe('End it');
    // Nobody is put on it, so the Work Plan's Contracts tab has none of it.
    const plan = document.createElement('div');
    plan.innerHTML = renderContractsTab(running(), null, null);
    expect(plan.textContent).not.toContain('Windows off the line');
  });

  it('reads its pace off the upgrades fitted: every 1 h 45 min with one, about 22 a week', () => {
    const state = running();
    state.windowLine.upgrades = [{ id: 'lineTooling', fittedOnDay: state.clock.day }];
    const tab = document.createElement('div');
    tab.innerHTML = renderContracts(state);
    expect(tab.querySelector('[data-line-contract]')?.textContent).toContain('One window every 1 h 45 min: about 22 a week');
  });

  it('says it stands still for want of an engineer, and nothing of a gate with no pallet at it', () => {
    const state = running();
    state.workers = state.workers.filter((worker) => worker.id !== 'eng-2');
    state.windowLine.palletsAtGate = 0;
    const tab = document.createElement('div');
    tab.innerHTML = renderContracts(state);
    const text = tab.querySelector('[data-line-contract]')?.textContent ?? '';
    expect(text).toContain('Standing still');
    expect(text).toContain('one engineer on duty');
    expect(text).not.toContain('At the gate');
    state.workers = state.workers.filter((worker) => worker.id !== 'eng-1');
    tab.innerHTML = renderContracts(state);
    expect(tab.querySelector('[data-line-contract]')?.textContent).toContain('no engineer on duty');
  });

  it('draws the pallets at the gate with their label, and none with nothing there', () => {
    const state = running();
    const hall = document.createElement('div');
    hall.innerHTML = renderHall(state);
    expect(hall.querySelectorAll('[data-line-pallet]')).toHaveLength(1);
    expect(hall.textContent).toContain('Windows for collection: 1 pallet');
    state.windowLine.palletsAtGate = 3;
    hall.innerHTML = renderHall(state);
    expect(hall.querySelectorAll('[data-line-pallet]')).toHaveLength(2);
    expect(hall.textContent).toContain('Windows for collection: 3 pallets');
    state.windowLine.palletsAtGate = 0;
    hall.innerHTML = renderHall(state);
    expect(hall.querySelector('[data-line-pallet]')).toBeNull();
    expect(hall.textContent).not.toContain('Windows for collection');
  });

  it('says on the line s card that it can make windows on a contract of its own', () => {
    const page = document.createElement('div');
    page.innerHTML = renderCatalogue(bigUnit(), '', catalogueTabFrom('line'), 'windowLine1');
    expect(page.textContent).toContain('It can make windows on a contract of its own: one every 2 hours');
  });
});
