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
// metres wide in front of the line's engineers' metre and up the left wall to the gate, nothing
// standing on it, the line placed only where it has one, and what stood there before named on the
// strip (CLAUDE.md T31 2.6, section 7). From v93 the lane is a line's own, two metres in front of
// its engineers' metre wherever the line stands, with a metre behind the line kept free, so lines
// stand one behind the other (PIOTR, 12.10).

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LINE_MODULES, WINDOW_LINE_ORIGIN } from '../../src/engine/constants';
import type { GameState } from '../../src/engine/index';
import { canBuy, placeEquipmentOrder } from '../../src/engine/game';
import { canBeMoved, canPlace, canPlaceSpec, firstFreeCell, forkliftLane, lineLanes } from '../../src/engine/layout';
import { findSpec } from '../../src/engine/machines';
import { ownedTile } from '../../src/ui/catalogue';
import { isFree } from '../../src/engine/walk';
import { warnings } from '../../src/engine/warnings';
import { renderHall } from '../../src/render/hall';
import { tileToScreen } from '../../src/render/iso';
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
    expect(forkliftLane(state, { x: 2, y: 14 }, 'window')).toEqual([
      { x: 0, y: 18, width: 38, depth: 2 },
      { x: 0, y: 10, width: 2, depth: 10 },
    ]);
    expect(lineLanes(state)).toEqual([{ line: 1, front: { x: 0, y: 18, width: 38, depth: 2 }, left: { x: 0, y: 10, width: 2, depth: 10 } }]);
    // The lane follows the line: two metres in front of its engineers' metre, wherever it stands
    // (v93), the left strip reaching the pallets' row.
    expect(forkliftLane(state, { x: 4, y: 12 }, 'window')).toEqual([
      { x: 0, y: 16, width: 40, depth: 2 },
      { x: 0, y: 10, width: 2, depth: 8 },
    ]);
    // A line behind the pallets' row: its left strip runs down from its front strip to them.
    expect(forkliftLane(state, { x: 2, y: 7 }, 'window')).toEqual([
      { x: 0, y: 11, width: 38, depth: 2 },
      { x: 0, y: 10, width: 2, depth: 3 },
    ]);
  });

  it('cannot be for a line nearer the front wall than y 14, over the left strip, or so near the rear wall that its lane crosses the way to the gate', () => {
    const state = bigUnit();
    expect(forkliftLane(state, { x: 2, y: 15 }, 'window')).toBeNull();
    expect(forkliftLane(state, { x: 0, y: 12 }, 'window')).toBeNull();
    expect(forkliftLane(state, { x: 2, y: 5 }, 'window')).toBeNull();
    expect(forkliftLane(state, { x: 2, y: 6 }, 'window')).not.toBeNull();
  });

  it('is there while the line is on order, and none without a line', () => {
    const state = bigUnit();
    expect(lineLanes(state)).toEqual([]);
    expect(placeEquipmentOrder(state, 'windowLine1').ok).toBe(true);
    expect(lineLanes(state)).toHaveLength(1);
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
    const strips = lineLanes(state).flatMap((lane) => (lane.left === null ? [lane.front] : [lane.front, lane.left]));
    let bought = state;
    for (let n = 0; n < 6; n += 1) bought = buyNow(bought, 'workbench');
    for (const item of bought.equipment.filter((entry) => entry.specId === 'workbench')) {
      const on = strips.some((strip) => item.anchorX < strip.x + strip.width && strip.x < item.anchorX + 2 && item.anchorY < strip.y + strip.depth && strip.y < item.anchorY + 2);
      expect(on, `${item.anchorX},${item.anchorY}`).toBe(false);
    }
    expect(firstFreeCell(state, 'sheetRack')).not.toBeNull();
  });

  it('sends a purchase s search past the lane to the first free place off it', () => {
    // Every row down to the front strip filled with racks, so the only floor left is the lane and the
    // two metres past the line's end, x 38 and 39, y 18 and 19.
    const state = withLine(bigUnit());
    state.equipment = state.equipment.filter((item) => LINE_MODULES.includes(item.specId));
    for (let y = 0; y < 18; y += 2) {
      for (let x = 0; x < 40; x += 2) placeEquipment(state, 'sheetRack', { variantId: 'standard', x, y, id: `kit-fill-${x}-${y}` });
    }
    expect(firstFreeCell(state, 'sheetRack', 'standard')).toEqual({ x: 38, y: 18 });
  });

  it('lets men walk on it', () => {
    const state = withLine(bigUnit());
    expect(isFree(state, { x: 10, y: 19 })).toBe(true);
    expect(isFree(state, { x: 1, y: 12 })).toBe(true);
  });
});

describe('the line s place asks for it (CLAUDE.md T31 2.6)', () => {
  it('goes elsewhere at the order where its first place s lane is not clear, and is refused with no place at all', () => {
    const state = bigUnit();
    placeEquipment(state, 'sheetRack', { variantId: 'standard', x: 20, y: 18, id: 'kit-rack-on-the-lane' });
    // Its first place's lane blocked, the line takes the next place with seven clear metres (v93).
    expect(canBuy(state, 'windowLine1')).toEqual({ ok: true, reason: '' });
    expect(placeEquipmentOrder(state, 'windowLine1').ok).toBe(true);
    const first = state.onOrder.find((item) => item.specId === 'windowLine1');
    expect(first?.anchorY).not.toBe(14);
    // A rack in every row the line could stand in: nowhere at all.
    const full = bigUnit();
    for (let y = 5; y < 18; y += 2) placeEquipment(full, 'sheetRack', { variantId: 'standard', x: 20, y, id: `kit-rack-${y}` });
    expect(canBuy(full, 'windowLine1')).toEqual({ ok: false, reason: 'No room in the hall for the line and its lane' });
  });

  it('is refused in setup mode onto a place whose lane is blocked or cannot be, and moves where it is clear', () => {
    const state = withLine(bigUnit());
    expect(canPlace(state, 'kit-line-1', 2, 15)).toEqual({ ok: false, reason: 'The line needs a clear 36 m by 3 m, its lane and a metre each side' });
    expect(canPlace(state, 'kit-line-1', 2, 11)).toEqual({ ok: true, reason: '' });
    // A rack stood by a save where the lane of another place would be: the line may not move to a
    // place whose lane it is on.
    placeEquipment(state, 'sheetRack', { variantId: 'standard', x: 20, y: 11, id: 'kit-rack-on-the-lane' });
    expect(canPlace(state, 'kit-line-1', 2, 8)).toEqual({ ok: false, reason: 'The line needs a clear 36 m by 3 m, its lane and a metre each side' });
    const refused = act(state, { type: 'MOVE_ITEM', itemId: 'kit-line-1', x: 2, y: 8 });
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
    expect(line?.text).toBe("Kit stands in line 1's way: the workbench and the sheet rack");
    expect(state.equipment.find((item) => item.id === 'kit-bench-on-the-lane')).toMatchObject({ anchorX: 10, anchorY: 18 });
    // Moved off it, the line goes.
    const moved = act(state, { type: 'MOVE_ITEM', itemId: 'kit-bench-on-the-lane', x: 10, y: 10 });
    const off = act(moved, { type: 'MOVE_ITEM', itemId: 'kit-rack-on-the-lane', x: 12, y: 10 });
    expect(warnings(off).some((warning) => warning.key === 'laneBlocked')).toBe(false);
  });

  it('still offers Move for the kit on the lane and for a line whose lane cannot be, which the strip says to move', () => {
    const state = bigUnit();
    placeEquipment(state, 'workbench', { variantId: 'standard', x: 10, y: 18, id: 'kit-bench-on-the-lane' });
    withLine(state);
    expect(canPlace(state, 'kit-bench-on-the-lane', 10, 18).ok).toBe(false);
    expect(canBeMoved(state, 'kit-bench-on-the-lane')).toBe(true);
    const bench = state.equipment.find((item) => item.id === 'kit-bench-on-the-lane');
    const benchSpec = findSpec('workbench');
    if (bench === undefined || benchSpec === null) throw new Error('the bench is wanted');
    expect(ownedTile(state, bench, benchSpec, null)).toContain('data-do="startSetup"');
    const near = withLine(bigUnit(), { x: 2, y: 15 });
    expect(canBeMoved(near, 'kit-line-3')).toBe(true);
    // A thing that cannot be taken hold of at all is still not offered it.
    expect(canBeMoved(near, 'no-such-kit')).toBe(false);
  });

  it('says a line over the left strip is to be moved along it, not back', () => {
    const state = withLine(bigUnit(), { x: 0, y: 11 });
    expect(warnings(state).find((warning) => warning.key === 'laneBlocked')?.text).toBe(
      'Line 1 stands on the way to the gate for its lane: move it along',
    );
  });

  it('says a line whose lane would cross the way to the gate is to be moved forward', () => {
    const state = withLine(bigUnit(), { x: 2, y: 5 });
    // From v94 the strip names what stands where the line would have its lane, a row forward.
    expect(warnings(state).find((warning) => warning.key === 'laneBlocked')?.text).toBe(
      'Line 1 stands too near the rear wall for its lane: move it forward; in the way: the sheet rack and the workbench',
    );
  });

  it('keeps a Turn 30 line standing where its lane cannot be, draws no lane, and says to move it back', () => {
    const state = withLine(bigUnit(), { x: 2, y: 15 });
    expect(lineLanes(state)).toEqual([]);
    expect(warnings(state).find((warning) => warning.key === 'laneBlocked')?.text).toBe(
      'Line 1 stands too near the front wall for its lane: move it back',
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
    // Its outer edges, the corners joined: the left wall's line from y 10 to the front wall, the front
    // wall's line to the line's end at x 38, and the inner edge back round the corner at (2, 18); the
    // two short ends close it across the strip at the gate (y 10) and at the line's end (x 38), as the
    // mockup drew it.
    const at = (x: number, y: number): string => {
      const point = tileToScreen(x, y);
      return `${point.x},${point.y}`;
    };
    const corners = [at(0, 10), at(2, 10), at(2, 18), at(38, 18), at(38, 20), at(0, 20)];
    expect(drawn?.getAttribute('points')?.split(' ')).toEqual(corners);
    const before = drawn?.getAttribute('points');
    const moved = act(state, { type: 'MOVE_ITEM', itemId: 'kit-line-1', x: 3, y: 12 });
    expect(lane(moved)?.getAttribute('points')).not.toBe(before);
    expect(lane(bigUnit())).toBeNull();
  });

  it('has its one colour token, the one the brief allows (that no other is new is the report s git diff)', () => {
    const css = readFileSync('src/ui/styles.css', 'utf8');
    expect(css).toContain('--lane-yellow: #e3b51f;');
  });
});
