/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// v124: the catalogue light again on a big hall [PIOTR, 24.10: "it stutters badly as soon as I open
// the catalogue and want to buy something, and above all when I open shopping for production
// lines: the whole computer hangs for a minute or two"]. The things on the floor and the lines'
// ground in buckets while the state is pinned, the searches of the floor pinned for their own
// length, and the hall after the trips copied once a page: every answer the same as the long way
// gives it.

import { afterEach, describe, expect, it } from 'vitest';
import { EQUIPMENT_SPECS, LINE_KIND_ORDER, lineModulesOf } from '../../src/engine/constants';
import { buyEquipment, orderEquipmentCheck, placeEquipmentOrder } from '../../src/engine/game';
import { canPlaceBox, canPlaceSpec, claimedGround, firstFreeCell, hallItems, lineFits, lineSite } from '../../src/engine/layout';
import { lineKindOf } from '../../src/engine/machines';
import { reservedItems } from '../../src/engine/orders';
import { pinState, whilePinned } from '../../src/engine/pinned';
import type { GameState } from '../../src/engine/index';
import { act, buyStartingKit, newGame, nextDay, placeEquipment } from '../helpers';

afterEach(() => {
  pinState(null);
});

/** A hall of 90 m by 41 m, made by the game's own extensions, with the starting kit. */
function hall(): GameState {
  let state = newGame({ difficulty: 'veryEasy' });
  state.cash = 900000000;
  state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
  state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'second' }));
  for (let stage = 0; stage < 5; stage += 1) {
    state.cash = 900000000;
    state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'long' }));
  }
  for (let stage = 0; stage < 3; stage += 1) {
    state.cash = 900000000;
    state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'wide' }));
  }
  state = buyStartingKit(state);
  state.cash = 900000000;
  return state;
}

/** The hall with a house factory and a window line standing, a door line and a saw on order. */
function company(): GameState {
  const state = hall();
  for (const kind of ['house', 'window'] as const) {
    expect(buyEquipment(state, lineModulesOf(kind)[0] ?? '').reason).toBe('');
  }
  state.owner.present = true;
  for (const specId of [lineModulesOf('door')[0] ?? '', 'tableSaw']) {
    expect(placeEquipmentOrder(state, specId).reason).toBe('');
  }
  return state;
}

describe('the floor in buckets while the state is pinned (v124)', () => {
  it('stands for every ground there is and for things standing and on order', () => {
    const state = company();
    expect([state.unit.widthCells, state.unit.depthCells]).toEqual([90, 41]);
    expect([1, 2, 3].map((line) => lineKindOf(state, line))).toEqual(['house', 'window', 'door']);
    expect(hallItems(state).length).toBeGreaterThan(10);
    expect(reservedItems(state).map((item) => item.specId)).toContain('tableSaw');
    expect(new Set(claimedGround(state).map((ground) => ground.kind))).toEqual(new Set(['lane', 'drive', 'path', 'behind']));
  });

  it('refuses every box and every machine as the long way does, for the same reason', () => {
    const state = company();
    const cells: Array<{ x: number; y: number }> = [];
    for (let y = -1; y <= state.unit.depthCells; y += 1) {
      for (let x = -1; x <= state.unit.widthCells; x += 1) cells.push({ x, y });
    }
    const saw = hallItems(state).find((item) => item.specId === 'tableSaw');
    const held = reservedItems(state).find((item) => item.specId === 'tableSaw');
    if (saw === undefined || held === undefined) throw new Error('a saw standing and a saw on order are wanted');
    const ignores = [new Set<string>(), new Set([saw.id]), new Set([held.id])];
    // A box of no width and one of no depth among them, which the long way finds too, and one over
    // many things at once, where the first in the long way's order is the one named.
    const sizes = [
      { width: 1, depth: 1 },
      { width: 4, depth: 2 },
      { width: 0, depth: 3 },
      { width: 12, depth: 0 },
      { width: 30, depth: 6 },
    ];
    const specs = ['tableSaw', 'sheetRack', lineModulesOf('window')[0] ?? ''];
    const boxes = (): string[] =>
      cells.flatMap((cell) => sizes.flatMap((size) => ignores.map((ignore) => canPlaceBox(state, { ...cell, ...size }, ignore).reason)));
    const machines = (): string[] =>
      cells.flatMap((cell) => specs.map((specId) => canPlaceSpec(state, specId, cell.x, cell.y, null).reason));
    const longBoxes = boxes();
    const longMachines = machines();
    // Every kind of answer is among them, so the two ways are asked of something.
    expect(longBoxes).toContain('');
    expect(longBoxes).toContain('Off the floor');
    expect(longBoxes).toContain('On the table saw');
    expect(longBoxes).toContain('On the table saw that is on order');
    expect(longMachines).toContain("That is the forklift's lane");
    expect(longMachines).toContain("That is the house factory's lane");
    whilePinned(state, () => {
      expect(boxes()).toEqual(longBoxes);
      expect(machines()).toEqual(longMachines);
    });
  });

  it('fits every kind of line where the long way fits it, a line and the lines left out of it too', () => {
    const state = company();
    const asked: Array<[{ x: number; y: number }, (typeof LINE_KIND_ORDER)[number], number | null, Set<number>]> = [];
    for (let y = 0; y < state.unit.depthCells; y += 1) {
      for (let x = 0; x < state.unit.widthCells; x += 2) {
        for (const kind of LINE_KIND_ORDER) {
          asked.push([{ x, y }, kind, null, new Set()]);
          asked.push([{ x, y }, kind, 1, new Set([3])]);
        }
      }
    }
    const fits = (): boolean[] => asked.map(([at, kind, line, leftOut]) => lineFits(state, at, kind, new Set(), line, leftOut));
    const long = fits();
    expect(long).toContain(true);
    expect(long).toContain(false);
    // The ground decides somewhere: a place on the house factory's lane or the door line's held
    // ground fits only with those two lines left out.
    expect(long.some((fit, n) => n % 2 === 1 && fit && long[n - 1] === false)).toBe(true);
    whilePinned(state, () => {
      expect(fits()).toEqual(long);
    });
  });
});

describe('the searches of the floor (v124)', () => {
  it('pin the state for their own length and no longer: what is put down after one is seen by the next', () => {
    const state = hall();
    const site = lineSite(state, 'window');
    if (site === null) throw new Error('room for a window line is wanted');
    placeEquipment(state, 'tableSaw', { x: site.x + 10, y: site.y + 1, id: 'kit-in-the-way' });
    expect(lineSite(state, 'window')).not.toEqual(site);
    const cell = firstFreeCell(state, 'tableSaw');
    if (cell === null) throw new Error('room for a saw is wanted');
    placeEquipment(state, 'tableSaw', { x: cell.x, y: cell.y, id: 'kit-on-the-cell' });
    expect(firstFreeCell(state, 'tableSaw')).not.toEqual(cell);
  });
});

describe('the hall after the trips (v124)', () => {
  it('copied once for the page, answers every card of the catalogue as a copy of its own did', () => {
    const state = company();
    expect(state.onOrder.length).toBeGreaterThan(0);
    const cards = EQUIPMENT_SPECS.flatMap((spec) => spec.variants.map((variant) => [spec.id, variant.id] as const));
    const answers = (): string[] => cards.map(([specId, variantId]) => orderEquipmentCheck(state, specId, variantId).reason);
    const ownCopies = answers();
    expect(ownCopies).toContain('');
    expect(new Set(ownCopies).size).toBeGreaterThan(1);
    whilePinned(state, () => {
      expect(answers()).toEqual(ownCopies);
    });
  });
});
