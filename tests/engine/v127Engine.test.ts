/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// v127: the engine's game minute and the open of a day made light again [PIOTR, 24.10: "it still
// stutters"]. The copy of the state every minute shares the two histories that are only ever added
// to, the lines' closed days and the months' reports, instead of copying them again; the open of a
// day reads every line's engineers, power and cover once for all of them; and the production
// minute asks its readings of the hall together. Every answer the same as the long way gives it.

import { afterEach, describe, expect, it } from 'vitest';
import { LINE_MODULES } from '../../src/engine/constants';
import { applyAction, clone, runMinutes } from '../../src/engine/game';
import type { GameState, LineDay, Worker } from '../../src/engine/index';
import { lineValueOf } from '../../src/engine/insurance';
import {
  lineCoverPerDay,
  lineEngineersPerDay,
  linePowerPerDay,
  lineState,
  openLineDay,
} from '../../src/engine/lineContract';
import { emptyLineDay, lineKindOf, lineStandsWhole, standingLines } from '../../src/engine/machines';
import { pinState, whilePinned } from '../../src/engine/pinned';
import { act, buyStartingKit, newGame, nextDay, placeEquipment, placeGlassRack, testJoiner, withAir } from '../helpers';

afterEach(() => {
  pinState(null);
});

function engineer(id: string): Worker {
  return { ...testJoiner(id, id), role: 'lineEngineer', tier: null, rate: 0, monthlyWage: 15000 };
}

/** The 800 m² hall with the starting kit, three window lines and three engineers: two for line 1,
 *  one for line 2, none for line 3; line 1 on its contract with boards and glass on the stores. */
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
  state.stock.boards += 4000;
  state.stock.glass += 2000;
  state.insurance.property = true;
  return state;
}

/** Every closed day of every line's book and every month's report, frozen to the last field: a
 *  write into any of them from here on throws. */
function freezeHistories(state: GameState): void {
  const deepFreeze = (value: unknown): void => {
    if (typeof value !== 'object' || value === null || Object.isFrozen(value)) return;
    Object.freeze(value);
    for (const entry of Object.values(value)) deepFreeze(entry);
  };
  for (const record of state.windowLines) for (const day of record.days) deepFreeze(day);
  for (const report of state.monthlyReports) deepFreeze(report);
}

/** Played on to the morning of this day, half an hour a call, every card answered with its first
 *  choice; the histories frozen after every call when asked. */
function playTo(state: GameState, day: number, freeze: boolean): GameState {
  let next = state;
  for (let guard = 0; guard < 20000 && next.clock.day < day; guard += 1) {
    if (next.activeEvent !== null) {
      next = applyAction(next, { type: 'RESOLVE_EVENT', choiceId: next.activeEvent.choices[0]?.id ?? 'ok' });
    } else {
      next = runMinutes(next, 30).state;
    }
    if (freeze) freezeHistories(next);
  }
  return next;
}

describe('the copy of the state (v127)', () => {
  it('writes nothing into a closed day or a month s report: a month played with them frozen is the month played', () => {
    const plain = playTo(threeLines(), 34, false);
    const frozen = playTo(threeLines(), 34, true);
    expect(frozen.monthlyReports.length).toBeGreaterThan(0);
    expect(lineState(frozen, 1).days.length).toBeGreaterThan(20);
    expect(JSON.stringify(frozen)).toBe(JSON.stringify(plain));
  }, 120000);

  it('copies as JSON copies, an entry the first time, and shares it from then on', () => {
    const played = playTo(threeLines(), 34, false);
    const fromJson = JSON.parse(JSON.stringify(played)) as GameState;
    const first = clone(fromJson);
    expect(JSON.stringify(first)).toBe(JSON.stringify(fromJson));
    expect(first.monthlyReports[0]).not.toBe(fromJson.monthlyReports[0]);
    expect(lineState(first, 1).days[0]).not.toBe(lineState(fromJson, 1).days[0]);
    const second = clone(first);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    expect(second.monthlyReports[0]).toBe(first.monthlyReports[0]);
    expect(lineState(second, 1).days[0]).toBe(lineState(first, 1).days[0]);
    // Everything else, the lists of the histories among it, is the copy's own.
    expect(second.monthlyReports).not.toBe(first.monthlyReports);
    expect(lineState(second, 1).days).not.toBe(lineState(first, 1).days);
    expect(lineState(second, 1).today).not.toBe(lineState(first, 1).today);
    expect(second.windowLines[0]).not.toBe(first.windowLines[0]);
    expect(second.jobs).not.toBe(first.jobs);
    expect(second.workers[0]).not.toBe(first.workers[0]);
    // And the day in hand written in the copy leaves the state it was copied from alone.
    lineState(second, 1).today.windows += 5;
    expect(lineState(first, 1).today.windows).toBe(lineState(second, 1).today.windows - 5);
  }, 120000);

  it('writes a day that is new to the book as JSON writes it, on its first copy', () => {
    const state = threeLines();
    const odd = { ...emptyLineDay(2), cover: Number.NaN, power: -0, note: undefined } as unknown as LineDay;
    lineState(state, 1).days.push(odd);
    const copy = clone(state);
    const written = lineState(copy, 1).days[lineState(copy, 1).days.length - 1] as unknown as Record<string, unknown>;
    expect(written.cover).toBeNull();
    expect(Object.is(written.power, 0)).toBe(true);
    expect('note' in written).toBe(false);
    expect(JSON.stringify(copy)).toBe(JSON.stringify(state));
    // And handed on as it is from then on.
    expect(lineState(clone(copy), 1).days[lineState(copy, 1).days.length - 1]).toBe(written);
  });
});

describe('the open of a day (v127)', () => {
  it('gives every line that stands whole its engineers, power and cover as each is reckoned alone', () => {
    const state = threeLines();
    state.clock.day += 1;
    const day = state.clock.day;
    const lines = standingLines(state).filter((line) => lineStandsWhole(state, line));
    expect(lines).toEqual([1, 2, 3]);
    const wanted = lines.map((line) => ({
      line,
      engineers: lineEngineersPerDay(state, line, day),
      power: linePowerPerDay(lineKindOf(state, line)),
      cover: lineCoverPerDay(state, line),
      since: { ...lineState(state, line).since },
    }));
    openLineDay(state);
    for (const { line, engineers, power, cover, since } of wanted) {
      const today = lineState(state, line).today;
      expect(today.day).toBe(day);
      expect(today.engineers).toBe(engineers);
      expect(today.power).toBe(power);
      expect(today.cover).toBe(cover);
      expect(lineState(state, line).since.engineers).toBe(since.engineers + engineers);
      expect(lineState(state, line).since.power).toBe(since.power + power);
      expect(lineState(state, line).since.cover).toBe(since.cover + cover);
    }
    // Two engineers for line 1, one for line 2, none for line 3; and a cover on every line.
    expect(wanted.map((entry) => entry.engineers > 0)).toEqual([true, true, false]);
    expect(wanted.every((entry) => entry.cover > 0)).toBe(true);
    // Opened again the same day, nothing is taken twice.
    const once = JSON.stringify(state.windowLines);
    openLineDay(state);
    expect(JSON.stringify(state.windowLines)).toBe(once);
  });

  it('gives every line its worth pinned as the long way gives it', () => {
    const state = threeLines();
    const lines = [1, 2, 3, 4];
    const longWay = lines.map((line) => lineValueOf(state, line));
    expect(longWay.slice(0, 3).every((value) => value > 0)).toBe(true);
    expect(longWay[3]).toBe(0);
    expect(whilePinned(state, () => lines.map((line) => lineValueOf(state, line)))).toEqual(longWay);
  });
});
