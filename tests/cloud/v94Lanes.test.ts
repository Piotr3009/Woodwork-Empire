/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// v94: a line standing where it has no lane, as Turn 30 stood it at y 15 of the 800 m² hall, is moved
// once by the lift to the nearest row where it has its lane, free, with a card that says so; a line
// on order in its way is moved too; a line with something in its way stays, and the strip names what
// [PIOTR, 12.10: "at the existing line I see no lane and no forklift, at the new one I do"].

import { describe, expect, it } from 'vitest';
import { LINE_MODULES, STATE_VERSION } from '../../src/engine/constants';
import type { GameState } from '../../src/engine/index';
import { placeEquipmentOrder } from '../../src/engine/game';
import { laneTrouble, lineLanes, linePlace } from '../../src/engine/layout';
import { lineState } from '../../src/engine/lineContract';
import { migrateState } from '../../src/engine/migrate';
import { warnings } from '../../src/engine/warnings';
import { act, buyStartingKit, newGame, nextDay, placeEquipment, withAir } from '../helpers';

/** A company in the 800 m² unit with the day one kit out of the line's rows, and line 1 standing
 *  from this cell, as a save would hold it. */
function company(at: { x: number; y: number }): GameState {
  let state = newGame({ difficulty: 'veryEasy' });
  state.cash = 9000000;
  state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
  state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'second' }));
  state = withAir(buyStartingKit(state), 'industrial');
  state.cash = 25000000;
  state.reputation = 40;
  state.enquiries = [];
  for (const item of state.equipment) {
    if (item.specId === 'sheetRack') [item.anchorX, item.anchorY] = [11, 2];
    if (item.specId === 'workbench') [item.anchorX, item.anchorY] = [14, 3];
  }
  LINE_MODULES.forEach((id, index) => placeEquipment(state, id, { x: at.x + 6 * index, y: at.y, id: `kit-line-${index + 1}` }));
  for (const item of state.equipment) if (item.id.startsWith('kit-line-')) item.line = 1;
  lineState(state, 1);
  state.activeEvent = null;
  state.eventQueue = [];
  return state;
}

/** The state as a v93 save holds it: the same shape, version 45. */
function asV45(state: GameState): Record<string, unknown> {
  const raw = JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
  raw.version = 45;
  return raw;
}

function rows(state: GameState, line: number, onOrder = false): number[] {
  const items = onOrder ? state.onOrder : state.equipment;
  return items.filter((item) => LINE_MODULES.includes(item.specId) && (item.line ?? 1) === line).map((item) => item.anchorY);
}

describe('a v93 save whose line has no lane (v94)', () => {
  it('opens with the line moved one metre back to where it has its lane, free, and a card that says so', () => {
    const state = company({ x: 2, y: 15 });
    expect(laneTrouble(state, { x: 2, y: 15 })).toBe('frontWall');
    const cash = state.cash;
    const opened = migrateState(asV45(state), 45);
    if (opened === null) throw new Error('the save opens');
    expect(STATE_VERSION).toBe(49);
    expect(opened.version).toBe(49);
    expect(rows(opened, 1)).toEqual([14, 14, 14, 14, 14, 14]);
    expect(lineLanes(opened).map((lane) => lane.line)).toEqual([1]);
    expect(opened.cash).toBe(cash);
    expect(opened.movedItems).toEqual([]);
    const card = opened.eventQueue.find((event) => event.kind === 'lineMoved');
    expect(card?.title).toBe('The line has its lane');
    expect(card?.body).toBe(
      "Line 1 stood too near the front wall for the forklift's lane: it is moved one metre back, free, and its forklift drives on its lane now.",
    );
    expect(warnings(opened).some((warning) => warning.key === 'laneBlocked')).toBe(false);
  });

  it('moves a line on order out of its way to a place of its own, and says so', () => {
    const state = company({ x: 2, y: 15 });
    // The second line ordered while the first had no lane: it took the rows the first needs.
    expect(placeEquipmentOrder(state, 'windowLine1').ok).toBe(true);
    expect(linePlace(state, 2)).toEqual({ x: 2, y: 8 });
    const opened = migrateState(asV45(state), 45);
    if (opened === null) throw new Error('the save opens');
    expect(rows(opened, 1)).toEqual([14, 14, 14, 14, 14, 14]);
    expect(rows(opened, 2, true)).toEqual([7, 7, 7, 7, 7, 7]);
    expect(lineLanes(opened).map((lane) => lane.line)).toEqual([1, 2]);
    const card = opened.eventQueue.find((event) => event.kind === 'lineMoved');
    expect(card?.body).toBe(
      "Line 1 stood too near the front wall for the forklift's lane: it is moved one metre back, free, and its forklift drives on its lane now. " +
        'Line 2, still on order, is moved one metre back to make room.',
    );
  });

  it('leaves a line with kit in its way where it stands, and the strip names what is in the way', () => {
    const state = company({ x: 2, y: 15 });
    placeEquipment(state, 'sheetRack', { variantId: 'standard', x: 20, y: 12, id: 'kit-rack-behind' });
    const opened = migrateState(asV45(state), 45);
    if (opened === null) throw new Error('the save opens');
    expect(rows(opened, 1)).toEqual([15, 15, 15, 15, 15, 15]);
    expect(opened.eventQueue.some((event) => event.kind === 'lineMoved')).toBe(false);
    expect(warnings(opened).find((warning) => warning.key === 'laneBlocked')?.text).toBe(
      'Line 1 stands too near the front wall for its lane: move it back; in the way: the sheet rack',
    );
  });

  it('touches nothing of a save whose line has its lane', () => {
    const state = company({ x: 2, y: 14 });
    const opened = migrateState(asV45(state), 45);
    if (opened === null) throw new Error('the save opens');
    expect(rows(opened, 1)).toEqual([14, 14, 14, 14, 14, 14]);
    expect(opened.eventQueue.some((event) => event.kind === 'lineMoved')).toBe(false);
  });
});
