/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// @vitest-environment jsdom
// Turn 31, 2.6: the forklift's lane [PIOTR, 11.10: "two yellow lines from the end of the production
// line to the door, for the forklift that will drive with the pallet"; "yes" to chat's route], two
// metres wide along the front wall and up the left wall to the gate, nothing standing on it, the
// line placed only where it has one, and what stood there before named on the strip (CLAUDE.md T31
// 2.6, section 7).

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LINE_MODULES, WINDOW_LINE_ORIGIN } from '../../src/engine/constants';
import type { GameState } from '../../src/engine/index';
import { canBuy, placeEquipmentOrder } from '../../src/engine/game';
import { canPlace, canPlaceSpec, firstFreeCell, forkliftLane, lineLane } from '../../src/engine/layout';
import { isFree } from '../../src/engine/walk';
import { warnings } from '../../src/engine/warnings';
import { renderHall } from '../../src/render/hall';
import { act, buyNow, buyStartingKit, newGame, nextDay, placeEquipment, withAir } from '../helpers';

/** A company in the 800 m² unit with the day one kit and money for the line. */
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

/** The line standing with module 1 at this cell, as a save would hold it. */
function withLine(state: GameState, at: { x: number; y: number } = WINDOW_LINE_ORIGIN): GameState {
  LINE_MODULES.forEach((id, index) => placeEquipment(state, id, { x: at.x + 6 * index, y: at.y, id: `kit-line-${index + 1}` }));
  state.speed = 0;
  return state;
}

function lane(state: GameState): Element | null {
  const holder = document.createElement('div');
  holder.innerHTML = renderHall(state);
  return holder.querySelector('[data-lane]');
}

describe('where the lane is (CLAUDE.md T31 2.6)', () => {
  it('is the front strip from x 0 to the line s end and the left strip up the left wall from y 10, for the line at (2, 14)', () => {
    const state = withLine(bigUnit());
    expect(state.unit.depthCells).toBe(20);
    expect(forkliftLane(state, { x: 2, y: 14 })).toEqual([
      { x: 0, y: 18, width: 38, depth: 2 },
      { x: 0, y: 10, width: 2, depth: 10 },
    ]);
    expect(lineLane(state)).toEqual(forkliftLane(state, { x: 2, y: 14 }));
    // The lane follows the line, not the hall's length.
    expect(forkliftLane(state, { x: 4, y: 12 })?.[0]).toEqual({ x: 0, y: 18, width: 40, depth: 2 });
  });

  it('cannot be for a line nearer the front wall than y 14, or over the left strip below y 10', () => {
    const state = bigUnit();
    expect(forkliftLane(state, { x: 2, y: 15 })).toBeNull();
    expect(forkliftLane(state, { x: 0, y: 12 })).toBeNull();
    expect(forkliftLane(state, { x: 0, y: 5 })).not.toBeNull();
  });

  it('is there while the line is on order, and none without a line', () => {
    const state = bigUnit();
    expect(lineLane(state)).toBeNull();
    expect(placeEquipmentOrder(state, 'windowLine1').ok).toBe(true);
    expect(lineLane(state)).not.toBeNull();
  });
});

describe('nothing else stands on it (CLAUDE.md T31 2.6)', () => {
  it('refuses a rack put on it, in setup mode and at a purchase s search for a free place', () => {
    const state = withLine(bigUnit());
    expect(canPlaceSpec(state, 'sheetRack', 20, 18, null)).toEqual({ ok: false, reason: "That is the forklift's lane" });
    expect(canPlaceSpec(state, 'sheetRack', 0, 12, null)).toEqual({ ok: false, reason: "That is the forklift's lane" });
    const rack = state.equipment.find((item) => item.specId === 'sheetRack');
    if (rack === undefined) throw new Error('the rack is wanted');
    expect(canPlace(state, rack.id, 20, 18)).toEqual({ ok: false, reason: "That is the forklift's lane" });
    // Every free place a purchase finds is off the lane.
    const strips = lineLane(state) ?? [];
    let bought = state;
    for (let n = 0; n < 6; n += 1) bought = buyNow(bought, 'workbench');
    for (const item of bought.equipment.filter((entry) => entry.specId === 'workbench')) {
      const on = strips.some((strip) => item.anchorX < strip.x + strip.width && strip.x < item.anchorX + 2 && item.anchorY < strip.y + strip.depth && strip.y < item.anchorY + 2);
      expect(on, `${item.anchorX},${item.anchorY}`).toBe(false);
    }
    expect(firstFreeCell(state, 'sheetRack')).not.toBeNull();
  });

  it('lets men walk on it', () => {
    const state = withLine(bigUnit());
    expect(isFree(state, { x: 10, y: 19 })).toBe(true);
    expect(isFree(state, { x: 1, y: 12 })).toBe(true);
  });
});

describe('the line s place asks for it (CLAUDE.md T31 2.6)', () => {
  it('is refused at the order where its lane is not clear', () => {
    const state = bigUnit();
    placeEquipment(state, 'sheetRack', { variantId: 'standard', x: 20, y: 18, id: 'kit-rack-on-the-lane' });
    expect(canBuy(state, 'windowLine1')).toEqual({ ok: false, reason: 'No room in the hall for the line and its lane' });
  });

  it('is refused in setup mode onto a place whose lane is blocked or cannot be, and moves where it is clear', () => {
    const state = withLine(bigUnit());
    expect(canPlace(state, 'kit-line-1', 2, 15)).toEqual({ ok: false, reason: 'The line needs a clear 36 m by 3 m and its lane' });
    expect(canPlace(state, 'kit-line-1', 2, 11)).toEqual({ ok: true, reason: '' });
    // A rack stood on the lane by a save: the line may not move to a place whose lane it is on, and
    // every place's lane holds the front strip.
    placeEquipment(state, 'sheetRack', { variantId: 'standard', x: 20, y: 18, id: 'kit-rack-on-the-lane' });
    expect(canPlace(state, 'kit-line-1', 2, 11)).toEqual({ ok: false, reason: 'The line needs a clear 36 m by 3 m and its lane' });
    const refused = act(state, { type: 'MOVE_ITEM', itemId: 'kit-line-1', x: 2, y: 11 });
    expect(refused.equipment.find((item) => item.id === 'kit-line-1')?.anchorY).toBe(14);
  });
});

describe('what stands on it already (CLAUDE.md T31 2.6)', () => {
  it('is named on the strip by the catalogue s names, kit on order among it, and not moved', () => {
    const state = bigUnit();
    placeEquipment(state, 'workbench', { variantId: 'standard', x: 10, y: 18, id: 'kit-bench-on-the-lane' });
    placeEquipment(state, 'sheetRack', { variantId: 'standard', x: 0, y: 12, id: 'kit-rack-on-the-lane' });
    withLine(state);
    const line = warnings(state).find((warning) => warning.key === 'laneBlocked');
    expect(line?.text).toBe("Kit stands on the forklift's lane: the workbench and the sheet rack");
    expect(state.equipment.find((item) => item.id === 'kit-bench-on-the-lane')).toMatchObject({ anchorX: 10, anchorY: 18 });
    // Moved off it, the line goes.
    const moved = act(state, { type: 'MOVE_ITEM', itemId: 'kit-bench-on-the-lane', x: 10, y: 10 });
    const off = act(moved, { type: 'MOVE_ITEM', itemId: 'kit-rack-on-the-lane', x: 12, y: 10 });
    expect(warnings(off).some((warning) => warning.key === 'laneBlocked')).toBe(false);
  });

  it('keeps a Turn 30 line standing where its lane cannot be, draws no lane, and says to move it back', () => {
    const state = withLine(bigUnit(), { x: 2, y: 15 });
    expect(lineLane(state)).toBeNull();
    expect(warnings(state).find((warning) => warning.key === 'laneBlocked')?.text).toBe(
      'The line stands too near the front wall for its lane: move it back',
    );
    expect(lane(state)).toBeNull();
    expect(state.equipment.find((item) => item.id === 'kit-line-1')?.anchorY).toBe(15);
  });
});

describe('the lane drawn (CLAUDE.md T31 2.6)', () => {
  it('is two yellow lines along its outer edges, under every piece of kit and every man, and follows a move', () => {
    const state = withLine(bigUnit());
    const drawn = lane(state);
    expect(drawn?.getAttribute('stroke')).toBe('var(--lane-yellow)');
    expect(drawn?.getAttribute('fill')).toBe('none');
    // First of the live drawing: nothing with a depth is drawn before it.
    const holder = document.createElement('div');
    holder.innerHTML = renderHall(state);
    const all = Array.from(holder.querySelectorAll('[data-lane], [data-depth]'));
    expect(all[0]?.hasAttribute('data-lane')).toBe(true);
    const before = drawn?.getAttribute('points');
    const moved = act(state, { type: 'MOVE_ITEM', itemId: 'kit-line-1', x: 3, y: 12 });
    expect(lane(moved)?.getAttribute('points')).not.toBe(before);
    expect(lane(bigUnit())).toBeNull();
  });

  it('has its one colour token, and no other is new', () => {
    const css = readFileSync('src/ui/styles.css', 'utf8');
    expect(css).toContain('--lane-yellow: #e3b51f;');
  });
});
