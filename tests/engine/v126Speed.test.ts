/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// v126: what the hall's page worked out afresh for every page, or for every rack of it, worked out
// once [PIOTR, 24.10: "redrawing every second makes no sense ... work it out again when something
// changes"]. The floor of the last page is kept while the hall is laid out as it was; every rack's
// share of its kind is worked out once a page; and a list of picture files asked often is looked up
// by a set of its names. Every answer the same as the long way gives it.

import { afterEach, describe, expect, it } from 'vitest';
import type { GameState } from '../../src/engine/index';
import { stockOnItem } from '../../src/engine/materials';
import { pinState, whilePinned } from '../../src/engine/pinned';
import { deliveredFile } from '../../src/engine/ports';
import { isFree, isWalkable } from '../../src/engine/walk';
import { buyStartingKit, newGame, placeEquipment } from '../helpers';

afterEach(() => {
  pinState(null);
});

/** Every cell of the hall and the ring round it: whether a man can stand there and walk there. */
function floor(state: GameState): string {
  const cells: string[] = [];
  for (let y = -1; y <= state.unit.depthCells; y += 1) {
    for (let x = -1; x <= state.unit.widthCells; x += 1) {
      cells.push(`${isFree(state, { x, y }) ? 1 : 0}${isWalkable(state, { x, y }) ? 1 : 0}`);
    }
  }
  return cells.join('');
}

/** The floor as the page reads it, pinned, beside the floor the long way. */
function bothWays(state: GameState): { pinned: string; longWay: string } {
  return { pinned: whilePinned(state, () => floor(state)), longWay: floor(state) };
}

describe('the hall worked out once (v126)', () => {
  it('keeps the floor while the hall is laid out as it was, and works it out again whenever it is not', () => {
    let state = buyStartingKit(newGame());
    const first = bothWays(state);
    expect(first.pinned).toBe(first.longWay);
    // Asked again, and of a fresh state of the same hall: the same floor.
    expect(bothWays(state).pinned).toBe(first.longWay);
    state = { ...state, cash: state.cash + 1 };
    expect(bothWays(state).pinned).toBe(first.longWay);
    // A machine moved, in a fresh state.
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    if (saw === undefined) throw new Error('no saw');
    state = { ...state, equipment: state.equipment.map((item) => (item === saw ? { ...item, anchorX: item.anchorX + 3 } : item)) };
    const moved = bothWays(state);
    expect(moved.pinned).toBe(moved.longWay);
    expect(moved.longWay).not.toBe(first.longWay);
    // Moved, turned and sold in the state itself, as a test writes into the state it holds.
    const bench = state.equipment.find((item) => item.specId === 'workbench');
    if (bench === undefined) throw new Error('no bench');
    const changes: Array<() => void> = [
      () => {
        bench.anchorY += 2;
      },
      () => {
        bench.orientation = 1;
      },
      () => {
        bench.soldOnDay = state.clock.day;
      },
      () => {
        state.unit = { ...state.unit, widthCells: state.unit.widthCells - 4 };
      },
      () => {
        placeEquipment(state, 'tableSaw', { x: 3, y: 3, id: 'kit-another-saw' });
      },
    ];
    let before = moved.longWay;
    for (const change of changes) {
      change();
      const now = bothWays(state);
      expect(now.pinned).toBe(now.longWay);
      expect(now.longWay).not.toBe(before);
      before = now.longWay;
    }
  });

  it('gives every rack, timber store and glass rack the share of its kind the long way gives it', () => {
    const state = buyStartingKit(newGame());
    placeEquipment(state, 'sheetRack', { variantId: 'used', x: 2, y: 8, id: 'kit-rack-1' });
    const sold = placeEquipment(state, 'sheetRack', { variantId: 'budget', x: 4, y: 8, id: 'kit-rack-sold' });
    sold.soldOnDay = state.clock.day;
    placeEquipment(state, 'sheetRack', { variantId: 'budget', x: 6, y: 8, id: 'kit-rack-2' });
    placeEquipment(state, 'timberRack', { x: 8, y: 8, id: 'kit-store-1' });
    placeEquipment(state, 'glassRack', { x: 10, y: 8, id: 'kit-glass-1' });
    placeEquipment(state, 'glassRackLarge', { x: 12, y: 8, id: 'kit-glass-2' });
    const ids = [...state.equipment.map((item) => item.id), 'not-a-thing'];
    const counts = [
      { sheets: 0, boards: 0, glass: 0 },
      { sheets: 45, boards: 12, glass: 90 },
      { sheets: 999, boards: 999, glass: 999 },
    ];
    for (const count of counts) {
      Object.assign(state.stock, count);
      const longWay = ids.map((id) => stockOnItem(state, { id }));
      const pinned = whilePinned(state, () => ids.map((id) => stockOnItem(state, { id })));
      expect(pinned).toEqual(longWay);
    }
    // The last spread put something on every kind's kit and nothing on the sold rack.
    const shares = whilePinned(state, () => new Map(ids.map((id) => [id, stockOnItem(state, { id })])));
    expect(shares.get('kit-rack-1')).toBe(30);
    expect(shares.get('kit-rack-2')).toBeGreaterThan(50);
    expect(shares.get('kit-rack-sold')).toBe(0);
    expect(shares.get('kit-store-1')).toBe(999);
    expect(shares.get('kit-glass-1')).toBe(40);
    expect(shares.get('kit-glass-2')).toBe(959);
    expect(shares.get('not-a-thing')).toBe(0);
  });

  it('finds a picture file in a list asked many times as the list itself gives it, and in the list grown', () => {
    const files = ['saw.png', 'line.work01.webp', 'bench.r.png'];
    for (let ask = 0; ask < 20; ask += 1) {
      expect(deliveredFile(files, 'saw.png')).toBe('saw.png');
      expect(deliveredFile(files, 'line.work01.png')).toBe('line.work01.webp');
      expect(deliveredFile(files, 'bench.png')).toBeNull();
    }
    files.push('bench.png');
    expect(deliveredFile(files, 'bench.png')).toBe('bench.png');
    expect(deliveredFile(['x.png'], 'saw.png')).toBeNull();
  });
});
