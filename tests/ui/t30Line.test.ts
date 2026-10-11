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
    window.dispatchEvent(mouse('mousemove', 14, 17));
    const ghost = required(root.querySelector('[data-ghost]'));
    expect(ghost.querySelectorAll('[data-ghost-part]')).toHaveLength(6);
    expect(ghost.textContent).toBe('Drop it here');
    window.dispatchEvent(mouse('mouseup', 14, 17));
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
