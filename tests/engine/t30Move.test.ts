/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// Turn 30, 2.4: the line moved as one in setup mode [PIOTR, 10.10: "yes, move it"], its books, and
// never turned [TUNE: chat] (CLAUDE.md T30 2.4, section 7).

import { describe, expect, it } from 'vitest';
import { LINE_MODULES } from '../../src/engine/constants';
import type { GameState } from '../../src/engine/index';
import { placeEquipmentOrder } from '../../src/engine/game';
import { canPlace } from '../../src/engine/layout';
import { lineModules } from '../../src/engine/machines';
import { act, buyStartingKit, newGame, nextDay, placeEquipment, withAir } from '../helpers';

/** A company in the 800 m² unit with the day one kit, air enough for a CNC and the money for the
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

/** The whole line standing on its cells from (2, 14), and the clock stopped as setup mode stops it. */
function withLine(state: GameState): GameState {
  LINE_MODULES.forEach((id, index) => placeEquipment(state, id, { x: 2 + 6 * index, y: 14, id: `kit-line-${index + 1}` }));
  state.speed = 0;
  return state;
}

function anchors(state: GameState): Array<[number, number]> {
  return LINE_MODULES.map((id) => {
    const item = state.equipment.find((entry) => entry.specId === id);
    return [item?.anchorX ?? -1, item?.anchorY ?? -1];
  });
}

describe('the line moved as one (CLAUDE.md T30 2.4)', () => {
  it('moves the six by the same cells whichever module is taken hold of', () => {
    const state = withLine(bigUnit());
    // Back from the front wall: from Turn 31 the line stands no nearer it than its men's metre and
    // its lane allow, y 14 at the most in this hall (CLAUDE.md T31 2.6).
    expect(canPlace(state, 'kit-line-3', 14, 11)).toEqual({ ok: true, reason: '' });
    const moved = act(state, { type: 'MOVE_ITEM', itemId: 'kit-line-3', x: 14, y: 11 });
    expect(anchors(moved)).toEqual(LINE_MODULES.map((_, index) => [2 + 6 * index, 11]));
    // A move of one cell along it is a move onto itself, and allowed.
    expect(canPlace(moved, 'kit-line-6', 33, 11)).toEqual({ ok: true, reason: '' });
    expect(lineModules(moved)).toBe(6);
  });

  it('is refused onto anything but itself, off the floor and on the gate lane, and moves none', () => {
    const state = withLine(bigUnit());
    placeEquipment(state, 'sheetRack', { variantId: 'standard', x: 20, y: 11, id: 'kit-rack-in-the-way' });
    // From Turn 31 the line asks for its lane too, and says so (CLAUDE.md T31 2.6).
    const refusal = { ok: false, reason: 'The line needs a clear 36 m by 3 m and its lane' };
    expect(canPlace(state, 'kit-line-1', 2, 10)).toEqual(refusal);
    expect(canPlace(state, 'kit-line-6', 33, 11)).toEqual(refusal);
    // Too near the front wall for its men's metre and its lane.
    expect(canPlace(state, 'kit-line-1', 2, 15)).toEqual(refusal);
    // Off the floor at either end.
    expect(canPlace(state, 'kit-line-6', 36, 14)).toEqual(refusal);
    expect(canPlace(state, 'kit-line-1', 2, 18)).toEqual(refusal);
    // Over the way to the gate.
    expect(canPlace(state, 'kit-line-1', 0, 7)).toEqual(refusal);
    const refused = act(state, { type: 'MOVE_ITEM', itemId: 'kit-line-1', x: 2, y: 10 });
    expect(anchors(refused)).toEqual(anchors(state));
    expect(refused.movedItems).toEqual([]);
  });

  it('is never turned', () => {
    const state = withLine(bigUnit());
    expect(canPlace(state, 'kit-line-2', 8, 14, 1)).toEqual({ ok: false, reason: 'The line is never turned' });
    const turned = act(state, { type: 'MOVE_ITEM', itemId: 'kit-line-2', x: 8, y: 14, orientation: 1 });
    expect(turned.equipment.filter((item) => LINE_MODULES.includes(item.specId)).map((item) => item.orientation)).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it('moves the outline of the line on order as one, and books nothing for it', () => {
    const state = bigUnit();
    expect(placeEquipmentOrder(state, 'windowLine1').ok).toBe(true);
    state.speed = 0;
    const fourth = state.onOrder.find((item) => item.specId === 'windowLine4');
    if (fourth === undefined) throw new Error('module 4 is on order');
    const moved = act(state, { type: 'MOVE_ITEM', itemId: fourth.id, x: 20, y: 11 });
    const outlines = LINE_MODULES.map((id) => moved.onOrder.find((item) => item.specId === id));
    expect(outlines.map((item) => [item?.anchorX, item?.anchorY])).toEqual(LINE_MODULES.map((_, index) => [2 + 6 * index, 11]));
    expect(moved.movedItems).toEqual([]);
  });

  it('counts six machines and six hours on Done, and Put them back puts the six back', () => {
    const state = withLine(bigUnit());
    const moved = act(state, { type: 'MOVE_ITEM', itemId: 'kit-line-2', x: 8, y: 11 });
    expect(moved.movedItems).toHaveLength(6);
    const asked = act(moved, { type: 'END_SETUP', speed: 1 });
    expect(asked.activeEvent?.kind).toBe('moveConfirm');
    expect(asked.activeEvent?.body).toBe('Moving 6 machines takes 6 h. Do it?');
    const back = act(asked, { type: 'RESOLVE_EVENT', choiceId: 'back' });
    expect(anchors(back)).toEqual(anchors(state));
    expect(back.movedItems).toEqual([]);
  });
});
