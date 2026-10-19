/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// @vitest-environment jsdom
// v107: the door line [PIOTR, 18.10: "a door line, two times the windows; only the look of the line
// different"; "3: yes" to 20 million, six modules of 6 by 3 by 3 m, a door at 3,000 and four
// engineers]. A line is of a kind from v107: the window line of Turn 29 and the door line, whose
// every money figure is the window line's twice over and whose minutes, pallet and delivery are the
// window line's own, so it pays back what a window line pays back at every pace.

import { describe, expect, it } from 'vitest';
import {
  ALL_LINE_MODULES,
  BUILT_TO_ORDER,
  DOOR_LINE_UPGRADES,
  LINE_KINDS,
  LINE_MODULE_INDEX,
  LINE_UPGRADES,
  SHEET_VALUE,
  STATE_VERSION,
  WINDOW_LINE_ORIGIN,
  lineMaterialPerUnitOf,
  lineModulesKept,
  lineModulesOf,
  linePriceOf,
  lineUnitPriceOf,
} from '../../src/engine/constants';
import type { GameState, Worker } from '../../src/engine/index';
import { runMinutes } from '../../src/engine/index';
import { isWorkingDay } from '../../src/engine/clock';
import { canBuy, placeEquipmentOrder, sellMachine } from '../../src/engine/game';
import {
  answerLineOffer,
  buyLineUpgrade,
  lineOfferBody,
  linePowerPerDay,
  lineState,
  lineWindowMinutes,
  palletsAtTheGate,
  runningLineContract,
} from '../../src/engine/lineContract';
import { glassUnitPrice } from '../../src/engine/materials';
import {
  findSpec,
  jobsLine,
  lineEngineersOnDuty,
  lineFactor,
  lineKindOf,
  lineLevel,
  lineStandsWhole,
} from '../../src/engine/machines';
import { migrateState } from '../../src/engine/migrate';
import { engineersKeepLine, lineEngineersWanted } from '../../src/engine/staff';
import { warnings } from '../../src/engine/warnings';
import { act, buyStartingKit, newGame, nextDay, placeEquipment, testJoiner, withAir } from '../helpers';

/** A company in the 800 m² unit with the day one kit and stores for the lines' boards and glass. */
function bigUnit(): GameState {
  let state = newGame({ difficulty: 'veryEasy' });
  state.cash = 9000000;
  state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
  state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'second' }));
  state = withAir(buyStartingKit(state), 'industrial');
  state.cash = 45000000;
  state.reputation = 40;
  state.enquiries = [];
  placeEquipment(state, 'timberRack', { variantId: 'standard', x: 36, y: 0, id: 'kit-timber-rack' });
  placeEquipment(state, 'glassRack', { variantId: 'standard', x: 33, y: 0, id: 'kit-glass-rack' });
  for (const item of state.equipment) {
    if (item.specId === 'sheetRack') [item.anchorX, item.anchorY] = [11, 2];
    if (item.specId === 'workbench') [item.anchorX, item.anchorY] = [14, 3];
  }
  return state;
}

function engineer(id: string): Worker {
  return { ...testJoiner(id, id), role: 'lineEngineer', tier: null, rate: 0, monthlyWage: 15000 };
}

/** A whole line of a kind standing with module 1 at this cell, under this number, its record
 *  written as the open of a working day writes it. */
function withLine(state: GameState, line: number, kind: 'window' | 'door', at: { x: number; y: number }): GameState {
  lineModulesOf(kind).forEach((id, index) =>
    placeEquipment(state, id, { x: at.x + 6 * index, y: at.y, id: `kit-line-${line}-${index + 1}` }),
  );
  for (const item of state.equipment) {
    if (item.id.startsWith(`kit-line-${line}-`)) item.line = line;
  }
  lineState(state, line);
  return state;
}

/** A window line 1 and a door line 2, one behind the other, with this many engineers. */
function windowAndDoor(engineers: number): GameState {
  const state = withLine(withLine(bigUnit(), 1, 'window', WINDOW_LINE_ORIGIN), 2, 'door', { x: 2, y: 7 });
  for (let n = 1; n <= engineers; n += 1) state.workers.push(engineer(`eng-${n}`));
  return state;
}

/** A contract running on this line from this minute. */
function running(state: GameState, line: number): GameState {
  lineState(state, line).contract = {
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
  return state;
}

/** The clock moved on to the open of the next working day. */
function toWorkingMorning(state: GameState): GameState {
  let next = nextDay(state);
  for (let guard = 0; guard < 5 && !isWorkingDay(next.clock.day); guard += 1) next = nextDay(next);
  return next;
}

describe('the door line in the table (PIOTR, 18.10)', () => {
  it('is the window line twice over in every money figure, and its own in minutes, pallet and delivery', () => {
    const door = LINE_KINDS.door;
    expect(door.name).toBe('Door production line');
    expect(linePriceOf('door')).toBe(20000000);
    expect(linePriceOf('door')).toBe(2 * linePriceOf('window'));
    expect(Object.values(door.shares)).toEqual([4000000, 5000000, 2500000, 2500000, 3000000, 3000000]);
    expect(lineUnitPriceOf('door')).toBe(3000);
    // A door's material is the material share of its price, four boards and two glass units.
    expect(lineMaterialPerUnitOf('door')).toBe(1200);
    expect(door.boards * SHEET_VALUE + door.glass * glassUnitPrice()).toBe(1200);
    expect([door.boards, door.glass, door.palletUnits, door.engineers]).toEqual([4, 2, 10, 4]);
    expect(DOOR_LINE_UPGRADES.map((upgrade) => upgrade.price)).toEqual(LINE_UPGRADES.map((upgrade) => upgrade.price * 2));
    expect(DOOR_LINE_UPGRADES.map((upgrade) => upgrade.price)).toEqual([800000, 600000, 1000000, 1200000]);
    expect(linePowerPerDay('door')).toBe(720);
    expect(linePowerPerDay('door')).toBe(2 * linePowerPerDay('window'));
  });

  it('keeps its modules by the share of its four engineers on duty, and the window line as before', () => {
    expect([0, 1, 2].map((onDuty) => lineModulesKept('window', onDuty))).toEqual([0, 3, 6]);
    expect([0, 1, 2, 3, 4].map((onDuty) => lineModulesKept('door', onDuty))).toEqual([0, 1, 3, 4, 6]);
  });

  it('has six modules of the window line s metres, a folder of their own, built to order', () => {
    lineModulesOf('door').forEach((id, index) => {
      const spec = findSpec(id);
      expect(spec, id).toMatchObject({
        name: `Door line, module ${index + 1}`,
        folder: 'Door production line',
        tab: 'line',
        category: 'machine',
        deliveryDays: 30,
        width: 6,
        depth: 3,
        height: 3,
        minUnitM2: 800,
        price: LINE_KINDS.door.shares[id],
      });
      expect(spec?.variants[0]?.powerPerDay, id).toBe(120);
      expect(BUILT_TO_ORDER, id).toContain(id);
      expect(LINE_MODULE_INDEX.get(id), id).toEqual({ kind: 'door', place: index + 1 });
    });
    // Eighteen from v114: the house factory's six after them.
    expect(ALL_LINE_MODULES).toHaveLength(18);
  });
});

describe('a door line bought (v107)', () => {
  it('is ordered whole for twenty million under the next number, its record a door line s', () => {
    const state = bigUnit();
    expect(canBuy(state, 'doorLine1').ok).toBe(true);
    expect(canBuy(state, 'doorLine3')).toEqual({ ok: false, reason: 'It comes with the line' });
    const cash = state.cash;
    expect(placeEquipmentOrder(state, 'doorLine1').ok).toBe(true);
    expect(cash - state.cash).toBe(20000000);
    expect(state.ledger.at(-1)?.label).toBe('Door production line, line 1, ordered');
    expect(state.onOrder.map((item) => [item.specId, item.line])).toEqual(lineModulesOf('door').map((id) => [id, 1]));
    expect(lineState(state, 1).kind).toBe('door');
    expect(lineKindOf(state, 1)).toBe('door');
  });

  it('is refused for want of its own price, not the window line s', () => {
    const state = bigUnit();
    state.cash = 15000000;
    expect(canBuy(state, 'windowLine1').ok).toBe(true);
    expect(canBuy(state, 'doorLine1')).toEqual({ ok: false, reason: 'Not enough cash' });
  });
});

describe('the engineers, shared out by need in line order (PIOTR, 18.10: four to a door line)', () => {
  it('gives the window line its two first, then the door line its four', () => {
    const state = windowAndDoor(5);
    expect([lineEngineersOnDuty(state, 1), lineEngineersOnDuty(state, 2)]).toEqual([2, 3]);
    expect([lineLevel(state, 1), lineLevel(state, 2)]).toEqual([6, 4]);
    state.workers.push(engineer('eng-6'));
    expect([lineEngineersOnDuty(state, 1), lineEngineersOnDuty(state, 2)]).toEqual([2, 4]);
    expect(lineLevel(state, 2)).toBe(6);
    expect(lineEngineersWanted(state)).toBe(6);
    expect(engineersKeepLine(state)).toBe('Six engineers keep the two lines');
  });

  it('says in the strip how many of the door line s four are on duty', () => {
    const state = windowAndDoor(4);
    expect(warnings(state).find((entry) => entry.key === 'lineNeedsEngineer')?.text).toBe(
      'Line 2 runs as three modules: two engineers on duty',
    );
  });
});

describe('a door line and the timber jobs', () => {
  it('serves none: the jobs get a window line, and with only a door line no line at all', () => {
    const doorOnly = withLine(bigUnit(), 1, 'door', WINDOW_LINE_ORIGIN);
    doorOnly.workers.push(engineer('eng-1'), engineer('eng-2'), engineer('eng-3'), engineer('eng-4'));
    expect(lineStandsWhole(doorOnly, 1)).toBe(true);
    expect(jobsLine(doorOnly)).toBeNull();
    expect(lineFactor(doorOnly)).toBe(1);
    const both = windowAndDoor(6);
    expect(jobsLine(both)).toBe(1);
  });
});

describe('the door line s contract (v107)', () => {
  it('is offered with its four engineers on the books and not with three, in a door company s words', () => {
    const three = windowAndDoor(5);
    running(three, 1);
    const offeredWithThree = toWorkingMorning(three);
    expect(lineState(offeredWithThree, 2).contract).toBeNull();
    const four = windowAndDoor(6);
    running(four, 1);
    // Offered at the open, and taken there by the helper's first answer.
    const offered = toWorkingMorning(four);
    expect(lineState(offered, 2).contract).not.toBeNull();
    expect(lineOfferBody(offered, 2)).toBe(
      'A door company will take every door line 2 makes, at £3,000 a door. The timber and the glass cost ' +
        '£1,200 a door, taken from your timber stores and glass racks: restock them on the Materials page, or ' +
        'the office does. The line makes one every 1 hour, about 40 a week, and the client collects each ' +
        'pallet of ten the next working day. It runs until you end it.',
    );
  });

  it('makes a door an hour, taking four boards and two glass units, at £3,000 on its own line of the books', () => {
    let state = toWorkingMorning(windowAndDoor(6));
    state.stock.boards = 400;
    state.stock.glass = 200;
    state.activeEvent = null;
    state.eventQueue = [];
    // The window line's contract ended and the door line's from this minute.
    lineState(state, 1).contract = null;
    lineState(state, 2).contract = null;
    const contract = running(state, 2).windowLines.find((record) => record.number === 2)?.contract;
    if (contract === null || contract === undefined) throw new Error('the door line s contract is written');
    contract.status = 'offered';
    answerLineOffer(state, 2, 'take');
    const boards = state.stock.boards;
    const glass = state.stock.glass;
    state = runMinutes(state, 60).state;
    expect(runningLineContract(state, 2)?.windowsMade).toBe(1);
    expect(boards - state.stock.boards).toBe(4);
    expect(glass - state.stock.glass).toBe(2);
    const line = state.ledger.find((entry) => entry.label === 'Doors off line 2: doors');
    expect(line?.amount).toBe(3000);
    expect(lineState(state, 2).since.material).toBe(1200);
  });

  it('sends ten doors to the gate on a pallet of their own kind', () => {
    const state = windowAndDoor(6);
    const record = lineState(state, 2);
    record.palletsAtGate = 1;
    lineState(state, 1).palletsAtGate = 2;
    expect([palletsAtTheGate(state), palletsAtTheGate(state, 'window'), palletsAtTheGate(state, 'door')]).toEqual([3, 2, 1]);
  });

  it('stands for want of a door s glass, and says so in its own word', () => {
    const state = windowAndDoor(6);
    running(state, 2);
    state.stock.boards = 400;
    state.stock.glass = 1;
    expect(warnings(state).find((entry) => entry.key === 'lineNeedsMaterial')?.text).toBe(
      'Line 2 stands: no glass for its next door',
    );
  });
});

describe('the door line s upgrades (v107)', () => {
  it('are its own, at twice the price, each ten minutes off a door, and never a window line s', () => {
    const state = windowAndDoor(6);
    expect(buyLineUpgrade(state, 2, 'lineTooling')).toEqual({ ok: false, reason: 'Not in the catalogue' });
    expect(buyLineUpgrade(state, 1, 'doorTooling')).toEqual({ ok: false, reason: 'Not in the catalogue' });
    const cash = state.cash;
    for (const upgrade of DOOR_LINE_UPGRADES) expect(buyLineUpgrade(state, 2, upgrade.id).ok).toBe(true);
    expect(cash - state.cash).toBe(3600000);
    expect(state.ledger.at(-1)?.label).toBe('Line 2 upgrade: Second spraying robot');
    for (const upgrade of lineState(state, 2).upgrades) upgrade.fittedOnDay = state.clock.day;
    expect(lineWindowMinutes(state, 2)).toBe(20);
    expect(lineWindowMinutes(state, 1)).toBe(60);
  });
});

describe('the door line sold (v107)', () => {
  it('goes whole for half its price on one van, in its own name', () => {
    let state = windowAndDoor(6);
    const module3 = state.equipment.find((item) => item.id === 'kit-line-2-3');
    if (module3 === undefined) throw new Error('the door line stands');
    expect(sellMachine(state, module3.id).ok).toBe(true);
    state = nextDay(state);
    expect(state.ledger.find((entry) => entry.label === 'Sold: Door production line, line 2')?.amount).toBe(10000000);
    expect(state.equipment.some((item) => item.id.startsWith('kit-line-2-'))).toBe(false);
  });
});

describe('the rule of the windows (PIOTR, 18.10: "one to one as the windows, only bigger money")', () => {
  it('nets a door line exactly twice what a window line nets, day for day, on the same stock', () => {
    let state = windowAndDoor(6);
    state.insurance.property = true;
    state.stock.boards = 3000;
    state.stock.glass = 1500;
    running(state, 1);
    running(state, 2);
    for (let day = 0; day < 10; day += 1) {
      state.activeEvent = null;
      state.eventQueue = [];
      state = nextDay(state);
    }
    const window = lineState(state, 1).since;
    const door = lineState(state, 2).since;
    expect(window.windows).toBeGreaterThan(40);
    expect(door.windows).toBe(window.windows);
    expect(door.turnover).toBe(2 * window.turnover);
    expect(door.material).toBe(2 * window.material);
    expect(door.engineers).toBeCloseTo(2 * window.engineers, 6);
    expect(door.power).toBe(2 * window.power);
    expect(door.cover).toBeCloseTo(2 * window.cover, 6);
  });
});

describe('a v50 save in this build (v107)', () => {
  it('opens with every line a window line and nothing else of its record touched', () => {
    const state = withLine(withLine(bigUnit(), 1, 'window', WINDOW_LINE_ORIGIN), 2, 'window', { x: 2, y: 7 });
    const raw = JSON.parse(JSON.stringify({ ...state, version: 50 })) as Record<string, unknown> & {
      windowLines: Array<Record<string, unknown>>;
    };
    for (const record of raw.windowLines) delete record.kind;
    const opened = migrateState(raw, 50);
    if (opened === null) throw new Error('the lift refused a version 50 state');
    expect(opened.version).toBe(STATE_VERSION);
    // 52 from v111: the yard laid out in its order; 53 from v113: the hall's level.
    expect(STATE_VERSION).toBe(53);
    expect(opened.windowLines.map((record) => record.kind)).toEqual(['window', 'window']);
    expect(opened.windowLines.map((record) => ({ ...record, kind: undefined }))).toEqual(
      state.windowLines.map((record) => ({ ...record, kind: undefined })),
    );
  });
});
