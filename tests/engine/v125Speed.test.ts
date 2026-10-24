/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// v125: what grew four times over for twice the factory, made to grow with it [PIOTR, 24.10: "code
// it so that everything speeds up"]. The line's minute works every line's level out once and not two
// or three times a line; the rings round a cell are handed out one at a time; and the hall's
// questions the Owned tab and the Contracts tab asked for every tile are kept for the page. Every
// answer the same as the long way gives it.

import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { decodeSaveFile } from '../../src/cloud/file';
import { DAY_END_MINUTE, LINE_MODULES } from '../../src/engine/constants';
import { contractResultFor } from '../../src/engine/contracts';
import { applyAction, runMinutes } from '../../src/engine/game';
import { lineGroup } from '../../src/engine/layout';
import { lineState } from '../../src/engine/lineContract';
import { bagStore, lineItems, lineLevel, menAtPlaces } from '../../src/engine/machines';
import { compressors } from '../../src/engine/media';
import { pinState, whilePinned } from '../../src/engine/pinned';
import { ringCells, standingCellsFor } from '../../src/engine/stations';
import type { GameState, Worker } from '../../src/engine/index';
import { act, buyStartingKit, newGame, nextDay, placeEquipment, placeGlassRack, testJoiner, withAir } from '../helpers';

afterEach(() => {
  pinState(null);
});

function engineer(id: string): Worker {
  return { ...testJoiner(id, id), role: 'lineEngineer', tier: null, rate: 0, monthlyWage: 15000 };
}

/** The 800 m² hall with the starting kit and three window lines, one behind another, and three
 *  engineers on the books: two for line 1, one for line 2, none for line 3. */
function threeLines(): GameState {
  let state = newGame({ difficulty: 'veryEasy' });
  state.cash = 9000000;
  state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
  state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'second' }));
  state = withAir(buyStartingKit(state), 'industrial');
  [14, 7, 0].forEach((y, n) => {
    const line = n + 1;
    LINE_MODULES.forEach((id, index) => placeEquipment(state, id, { x: 2 + 6 * index, y, id: `kit-line-${line}-${index + 1}` }));
    for (const item of state.equipment) if (item.id.startsWith(`kit-line-${line}-`)) item.line = line;
  });
  state.workers.push(engineer('eng-1'), engineer('eng-2'), engineer('eng-3'));
  return state;
}

/** Line 1 of `threeLines` on its contract from this morning, with boards and glass on the stores. */
function lineOnContract(): GameState {
  const state = threeLines();
  placeEquipment(state, 'timberShelter', { variantId: 'standard', x: 30, y: 21, id: 'kit-store' });
  placeGlassRack(state, 'glassRackLarge');
  lineState(state, 1).contract = {
    status: 'active',
    startDay: state.clock.day,
    windowsThisWeek: 0,
    weekStartDay: state.clock.day,
    windowsMade: 0,
    revenue: 0,
    materialCost: 0,
    boardsReserved: 0,
    glassReserved: 0,
  };
  state.stock.boards += 400;
  state.stock.glass += 200;
  return state;
}

/** On to a working minute of the morning, every card answered with its first choice. */
function toWorkingMinute(state: GameState): GameState {
  let next = state;
  for (let guard = 0; guard < 2000; guard += 1) {
    if (next.activeEvent !== null) {
      next = applyAction(next, { type: 'RESOLVE_EVENT', choiceId: next.activeEvent.choices[0]?.id ?? 'ok' });
      continue;
    }
    if (lineState(next, 1).today.possibleMinutes >= 20 && next.clock.minute < DAY_END_MINUTE - 60) return next;
    next = runMinutes(next, 1).state;
  }
  throw new Error('no working minute reached');
}

describe('the line minute (v125)', () => {
  it('gives every line the level it is given when asked alone', () => {
    const state = threeLines();
    const alone = [1, 2, 3].map((line) => lineLevel(state, line));
    expect(alone).toEqual([6, 3, 0]);
    expect(whilePinned(state, () => [1, 2, 3].map((line) => lineLevel(state, line)))).toEqual(alone);
  });

  it('works the levels out afresh every minute: engineers off stand the line from the next minute', () => {
    let state = toWorkingMinute(lineOnContract());
    const lost = (): number => lineState(state, 1).today.lost.engineer;
    const before = lost();
    const made = lineState(state, 1).contract?.windowsMade ?? 0;
    // Two of the three off: the engineers are shared out in order, so line 1 is left one.
    const away = (days: number): void => {
      for (const worker of state.workers) if (worker.id === 'eng-2' || worker.id === 'eng-3') worker.absentDaysRemaining = days;
    };
    away(1);
    state = runMinutes(state, 1).state;
    expect(lost()).toBe(before + 1);
    away(0);
    // Back the next minute, and an hour on (a window is sixty minutes) the line has made more.
    state = runMinutes(state, 90).state;
    expect(lost()).toBe(before + 1);
    expect(lineState(state, 1).contract?.windowsMade ?? 0).toBeGreaterThan(made);
  });
});

describe('the rings round a cell (v125)', () => {
  it('come one at a time in their order, ring after ring', () => {
    const state = newGame({ difficulty: 'veryEasy' });
    const box = { x: 10, y: 10, width: 1, depth: 1 };
    const five = Array.from(ringCells(state, box, 'front', 0, 5));
    expect(five).toHaveLength(8 + 12 + 16 + 20 + 24);
    const taken: Array<{ x: number; y: number }> = [];
    for (const cell of ringCells(state, box, 'front')) {
      taken.push(cell);
      if (taken.length === 50) break;
    }
    expect(taken).toEqual(five.slice(0, 50));
  });

  it('find a man his cell in a hall of any length without making the rings out to its end', () => {
    const state = newGame({ difficulty: 'veryEasy' });
    // Twenty kilometres of hall: the rings out to its end would be 800 million cells.
    state.unit.widthCells = 20000;
    const taken = new Set<string>(['5,5']);
    const cells = standingCellsFor(state, [{ x: 5, y: 5 }], 3, taken);
    expect(cells).toHaveLength(3);
    expect(cells.every((cell) => Math.abs(cell.x - 5) <= 2 && Math.abs(cell.y - 5) <= 2)).toBe(true);
  });
});

describe('the hall s questions kept for a page (v125)', () => {
  it('answer pinned as they answer the long way: the men at places, the compressors, the bags, a contract s result', () => {
    let state = decodeSaveFile(readFileSync('tests/fixtures/day115-v25.woodwork.json', 'utf8')).state as GameState;
    for (let guard = 0; guard < 200 && state.clock.minute < 120; guard += 1) {
      if (state.activeEvent !== null) {
        state = applyAction(state, { type: 'RESOLVE_EVENT', choiceId: state.activeEvent.choices[0]?.id ?? 'ok' });
        continue;
      }
      state = runMinutes(state, 10).state;
    }
    const men = menAtPlaces(state);
    expect(men.length).toBeGreaterThan(0);
    const air = compressors(state);
    expect(air.length).toBeGreaterThan(0);
    const bags = bagStore(state);
    expect(state.contracts.length).toBeGreaterThan(0);
    const results = state.contracts.flatMap((contract) =>
      [null, ...state.workers].map((worker) => contractResultFor(state, contract, worker)),
    );
    whilePinned(state, () => {
      expect(menAtPlaces(state)).toEqual(men);
      expect(menAtPlaces(state)).toBe(menAtPlaces(state));
      expect(compressors(state)).toEqual(air);
      expect(bagStore(state)).toEqual(bags);
      expect(
        state.contracts.flatMap((contract) => [null, ...state.workers].map((worker) => contractResultFor(state, contract, worker))),
      ).toEqual(results);
    });
  });

  it('give each line its modules and its group pinned as the long way does, each caller a list of its own', () => {
    const state = threeLines();
    const items = [1, 2, 3, 4].map((line) => lineItems(state, line).map((item) => item.id));
    const groups = [1, 2, 3, 4].map((line) => lineGroup(state, false, line));
    expect(items[0]).toHaveLength(6);
    expect(groups[2]).toHaveLength(6);
    expect(groups[3]).toEqual([]);
    whilePinned(state, () => {
      expect([1, 2, 3, 4].map((line) => lineItems(state, line).map((item) => item.id))).toEqual(items);
      expect([1, 2, 3, 4].map((line) => lineGroup(state, false, line))).toEqual(groups);
      lineGroup(state, false, 1).push('somebody else s');
      lineItems(state, 1).pop();
      expect(lineGroup(state, false, 1)).toEqual(groups[0]);
      expect(lineItems(state, 1)).toHaveLength(6);
    });
  });
});
