/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// v104: the game light again on a big company [PIOTR, 18.10: "with lots of lines the whole program
// stutters every second ... and every now and then the production lines disappear"; "do all these
// fixes here so it flies"]. The engine's side: the state copied by walking it and to the value as
// JSON copies it, the history nothing reads left behind after thirty days, the hall's questions
// pinned for the length of a call that changes nothing, and every answer kept for a pin the same as
// the long way gives it.

import { afterEach, describe, expect, it } from 'vitest';
import { HISTORY_KEPT_DAYS, LINE_MODULES } from '../../src/engine/constants';
import { clone } from '../../src/engine/game';
import { claimedGround, linePlace, standingOn } from '../../src/engine/layout';
import { hallProductivityFactor, outputBreakdown, standingLines } from '../../src/engine/machines';
import { pinState, pinned, whilePinned } from '../../src/engine/pinned';
import { isFree, isWalkable } from '../../src/engine/walk';
import type { Delivery, GameState, TaskInstance } from '../../src/engine/index';
import { acceptNow, act, buyStartingKit, newGame, nextDay, placeEnquiry, placeEquipment, runClock, withAir } from '../helpers';

afterEach(() => {
  pinState(null);
});

/** The 800 m2 hall with the starting kit and two lines, one behind the other. */
function twoLines(): GameState {
  let state = newGame({ difficulty: 'veryEasy' });
  state.cash = 9000000;
  state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
  state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'second' }));
  state = withAir(buyStartingKit(state), 'industrial');
  [
    { x: 2, y: 14 },
    { x: 2, y: 7 },
  ].forEach((at, n) => {
    const line = n + 1;
    LINE_MODULES.forEach((id, index) => placeEquipment(state, id, { x: at.x + 6 * index, y: at.y, id: `kit-line-${line}-${index + 1}` }));
    for (const item of state.equipment) if (item.id.startsWith(`kit-line-${line}-`)) item.line = line;
  });
  return state;
}

describe('the copy of the state (v104)', () => {
  it('is what JSON makes of it, value for value, and shares nothing with it', () => {
    const state = runClock(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 120);
    const copy = clone(state);
    expect(JSON.stringify(copy)).toBe(JSON.stringify(state));
    expect(copy).toStrictEqual(JSON.parse(JSON.stringify(state)));
    const first = copy.equipment[0];
    if (first === undefined) throw new Error('kit is wanted');
    first.anchorX += 5;
    copy.clock.minute += 1;
    copy.workers.push(copy.workers[0] ?? ({} as never));
    expect(state.equipment[0]?.anchorX).toBe(first.anchorX - 5);
    expect(state.clock.minute).toBe(copy.clock.minute - 1);
    expect(state.workers).toHaveLength(copy.workers.length - 1);
  });

  it('writes what JSON cannot write as JSON does: no number that is not finite, no minus nought, no key with nothing in it', () => {
    const odd = {
      nought: -0,
      notANumber: Number.NaN,
      endless: Number.POSITIVE_INFINITY,
      missing: undefined,
      list: [undefined, -0, 3, () => 1],
      inside: { kept: null, words: 'x', yes: true },
    } as unknown as GameState;
    const copy = clone(odd) as unknown as Record<string, unknown>;
    expect(copy).toStrictEqual(JSON.parse(JSON.stringify(odd)));
    expect(Object.is(copy.nought, 0)).toBe(true);
    expect('missing' in copy).toBe(false);
    expect(copy.list).toStrictEqual([null, 0, 3, null]);
  });
});

describe('the pin for the length of a call (v104)', () => {
  it('keeps an answer for the call, and puts back the pin there was before it, a call that throws too', () => {
    const one = newGame({ difficulty: 'veryEasy' });
    const other = newGame({ difficulty: 'veryEasy' });
    let asked = 0;
    const question = (): number => {
      asked += 1;
      return asked;
    };
    pinState(one);
    expect(pinned(one, 'q', question)).toBe(1);
    whilePinned(other, () => {
      expect(pinned(other, 'q', question)).toBe(2);
      expect(pinned(other, 'q', question)).toBe(2);
      // The page's own object is not pinned inside: asked afresh.
      expect(pinned(one, 'q', question)).toBe(3);
    });
    expect(pinned(one, 'q', question)).toBe(1);
    expect(pinned(other, 'q', question)).toBe(4);
    expect(() =>
      whilePinned(other, () => {
        throw new Error('out');
      }),
    ).toThrow('out');
    expect(pinned(one, 'q', question)).toBe(1);
    // On the object already pinned it only runs, and shares the answers.
    whilePinned(one, () => expect(pinned(one, 'q', question)).toBe(1));
  });

  it('is off when the call is over, so what is written into the state between two calls is seen by the second', () => {
    const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    expect(whilePinned(state, () => standingLines(state))).toEqual([]);
    LINE_MODULES.forEach((id, index) => placeEquipment(state, id, { x: 2 + 6 * index, y: 14, id: `kit-line-${index + 1}` }));
    expect(whilePinned(state, () => standingLines(state))).toEqual([1]);
  });

  it('gives the same answers pinned as the long way: the floor, the lines places, their ground and what stands on it', () => {
    const state = twoLines();
    const cells: Array<{ x: number; y: number }> = [];
    for (let x = -1; x <= state.unit.widthCells; x += 1) {
      for (let y = -1; y <= state.unit.depthCells; y += 1) cells.push({ x, y });
    }
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    if (saw === undefined) throw new Error('the saw is wanted');
    const own = new Set([saw.id]);
    const free = cells.map((cell) => isFree(state, cell));
    const walkable = cells.map((cell) => isWalkable(state, cell));
    const walkableOwn = cells.map((cell) => isWalkable(state, cell, own));
    const places = [1, 2, 3].map((line) => linePlace(state, line));
    const ground = claimedGround(state);
    const on = ground.map((entry) => standingOn(state, entry.box));
    expect(free).toContain(true);
    expect(free).toContain(false);
    expect(walkableOwn.filter(Boolean).length).toBeGreaterThan(walkable.filter(Boolean).length);
    expect(places).toEqual([
      { x: 2, y: 14 },
      { x: 2, y: 7 },
      null,
    ]);
    whilePinned(state, () => {
      expect(cells.map((cell) => isFree(state, cell))).toEqual(free);
      expect(cells.map((cell) => isWalkable(state, cell))).toEqual(walkable);
      expect(cells.map((cell) => isWalkable(state, cell, own))).toEqual(walkableOwn);
      expect([1, 2, 3].map((line) => linePlace(state, line))).toEqual(places);
      expect(claimedGround(state)).toEqual(ground);
      expect(claimedGround(state).map((entry) => standingOn(state, entry.box))).toEqual(on);
    });
  });

  it('reads the hall s factor off the hall s own lines of the Output sheet, and nothing else of it', () => {
    const state = twoLines();
    expect(hallProductivityFactor(state)).toBe(outputBreakdown(state).total);
    state.dust = 400;
    expect(hallProductivityFactor(state)).toBe(outputBreakdown(state).total);
    expect(hallProductivityFactor(state)).toBeLessThan(1);
  });
});

describe('the history nothing reads (v104)', () => {
  it('is left behind at the day s open thirty days on, every task and lorry of an open job, and a lorry a kept task names, kept', () => {
    let state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    state = acceptNow(state, placeEnquiry(state, { id: 'enq-open' }).id);
    state = acceptNow(state, placeEnquiry(state, { id: 'enq-closed' }).id);
    const [open, closed] = state.jobs;
    if (open === undefined || closed === undefined) throw new Error('two jobs are wanted');
    closed.stage = 'completed';
    const old = state.clock.day - HISTORY_KEPT_DAYS - 1;
    const recent = state.clock.day - 1;
    const task = (id: string, doneDay: number, jobId: string | null, deliveryId: string | null = null): TaskInstance => ({
      id,
      kind: 'unload',
      category: 'workshop',
      label: id,
      minutesTotal: 10,
      minutesRemaining: 0,
      jobId,
      equipmentId: null,
      deliveryId,
      orderIds: [],
      day: doneDay,
      done: true,
      doneDay,
      doneBy: 'owner',
      orders: [],
    });
    const lorry = (id: string, arriveDay: number, jobId: string | null): Delivery => ({
      id,
      jobId,
      sheets: 10,
      orderedDay: arriveDay - 1,
      pricePaid: 100,
      arriveDay,
      arrived: true,
      unloaded: true,
      bespoke: false,
      overflowSheets: 0,
      material: 'sheets',
    });
    state.tasks.push(
      task('history-task-old', old, null),
      task('history-task-recent', recent, null, 'history-del-old-named'),
      task('history-task-old-open', old, open.id),
      task('history-task-old-closed', old, closed.id),
    );
    state.deliveries.push(
      lorry('history-del-old', old, null),
      lorry('history-del-recent', recent, null),
      lorry('history-del-old-open', old, open.id),
      lorry('history-del-old-closed', old, closed.id),
      lorry('history-del-old-named', old, null),
    );
    const next = nextDay(state);
    expect(next.tasks.map((entry) => entry.id).filter((id) => id.startsWith('history-'))).toEqual([
      'history-task-recent',
      'history-task-old-open',
    ]);
    expect(next.deliveries.map((entry) => entry.id).filter((id) => id.startsWith('history-'))).toEqual([
      'history-del-recent',
      'history-del-old-open',
      'history-del-old-named',
    ]);
  });
});
