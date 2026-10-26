/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// v128: the purchase manager [PIOTR, 26.10: "a new post, somebody who orders the goods every day, a
// purchase manager, because I always forget; he would order every day at noon"; "all the materials,
// for the standing work and for the door, window, yacht and house lines"; "set to 2 days, a week, to
// full: best set on him by the player"]. At noon of a working day he is at work he buys each kind
// for the lines on their contracts and the standing contracts, as far ahead as his card is set and
// never past the free places, his name on each line of the books; the admin leaves the lines to him
// while he is at work; a job's material and the daily ordering chore are his first; a yacht line
// short of its third upgrade has its material bought [PIOTR, 26.10: "fix it"]; and he is taken on
// behind the office admin at 5,500 a month [PIOTR, 26.10: "ok"].

import { describe, expect, it } from 'vitest';
import { HIRING_SPECS, LINE_MODULES, PURCHASE_MANAGER_MONTHLY_WAGE, PURCHASE_ORDER_MINUTE } from '../../src/engine/constants';
import { isWorkingDay } from '../../src/engine/clock';
import { contractPiece, drawContract, sheetsForPieces } from '../../src/engine/contracts';
import { runMinutes } from '../../src/engine/game';
import { autoOrderMaterial } from '../../src/engine/jobs';
import { lineReorderWindows, lineState, officeOrdersLineMaterial } from '../../src/engine/lineContract';
import { freeRoomFor, roomFor } from '../../src/engine/machines';
import { pendingStockSheets } from '../../src/engine/materials';
import { purchaseAtNoon, purchaseCoverOf, purchaseNeed, purchaseOrderFor } from '../../src/engine/purchasing';
import { hiringOptions } from '../../src/engine/staff';
import { rolesForTask } from '../../src/engine/tasks';
import { usageOfMan } from '../../src/engine/usage';
import type { GameState, Job, Worker } from '../../src/engine/index';
import {
  acceptNow,
  act,
  buyStartingKit,
  newGame,
  nextDay,
  placeEnquiry,
  placeEquipment,
  placeGlassRack,
  testJoiner,
  withAir,
} from '../helpers';
import { yachtLine } from '../yachtLine';

function manager(): Worker {
  return { ...testJoiner('pm-1', 'Pat'), role: 'purchaseManager', tier: null, rate: 0, monthlyWage: PURCHASE_MANAGER_MONTHLY_WAGE };
}

function admin(): Worker {
  return { ...testJoiner('adm-1', 'Anna'), role: 'officeAdmin', tier: null, rate: 0, monthlyWage: 2000 };
}

/** A company in the 800 m2 unit with the whole window line from (2, 14), two engineers, a timber
 *  rack of 40 boards and a large glass rack of 200 units, and the line's contract taken this minute:
 *  forty windows a week at a window an hour (the shape of tests/engine/t32Store.test.ts). */
function lineCompany(): GameState {
  let state = newGame({ difficulty: 'veryEasy' });
  state.cash = 9000000;
  state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
  state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'second' }));
  state = withAir(buyStartingKit(state), 'industrial');
  state.cash = 500000;
  state.enquiries = [];
  LINE_MODULES.forEach((id, index) => placeEquipment(state, id, { x: 2 + 6 * index, y: 14, id: `kit-line-${index + 1}` }));
  for (const id of ['eng-1', 'eng-2']) {
    state.workers.push({ ...testJoiner(id, id), role: 'lineEngineer', tier: null, rate: 0, monthlyWage: 15000 });
  }
  placeEquipment(state, 'timberRack', { x: 30, y: 2, id: 'kit-timber' });
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
  state.clock.minute = 0;
  state.activeEvent = null;
  state.eventQueue = [];
  return state;
}

/** The clock at noon of the day in hand: the purchase manager's minute. */
function atNoon(state: GameState): GameState {
  state.clock.minute = PURCHASE_ORDER_MINUTE;
  return state;
}

/** What the books say was bought for stock, each line as it reads. */
function stockLines(state: GameState): string[] {
  return state.ledger.map((entry) => entry.label).filter((label) => / for stock/.test(label));
}

/** The 200 m2 unit with the day one kit, a timber rack of 40 boards and a glass rack of 40 units,
 *  and a casement window job of 9,000 taken off the board: 12 boards and 7 glass units, its desk
 *  work taken off it so its material is the only question left. */
function windowJob(): { state: GameState; job: Job } {
  const start = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
  start.cash = 200000;
  start.reputation = 40;
  start.enquiries = [];
  placeEquipment(start, 'timberRack', { x: 14, y: 2, id: 'kit-timber' });
  placeGlassRack(start);
  start.workers.push(manager(), admin());
  const enquiry = placeEnquiry(start, {
    templateId: 'casementWindows',
    name: 'Oak Lane',
    price: 9000,
    basePrice: 9000,
    finish: 'laminate',
    materialKind: 'solidWood',
    deadlineDays: 60,
  });
  const state = acceptNow(start, enquiry.id);
  const job = state.jobs.find((entry) => entry.name === 'Oak Lane');
  if (job === undefined) throw new Error('the window is taken');
  state.tasks = state.tasks.filter((task) => task.jobId !== job.id);
  return { state, job };
}

describe('the noon order (v128)', () => {
  it('buys two working days of the line less what is in hand, his name on each line of the books', () => {
    const state = lineCompany();
    state.workers.push(manager());
    state.stock.boards = 10;
    state.stock.glass = 6;
    expect(isWorkingDay(state.clock.day)).toBe(true);
    expect(purchaseCoverOf(state)).toBe('twoDays');
    // Two working days at a window an hour: sixteen windows, thirty two boards and sixteen units.
    expect(purchaseNeed(state, 'boards', 2)).toBe(32);
    expect(purchaseNeed(state, 'glass', 2)).toBe(16);
    purchaseAtNoon(atNoon(state));
    expect(stockLines(state)).toEqual(['22 boards for stock, ordered by Pat', '10 glass units for stock, ordered by Pat']);
  });

  it('places it as the clock strikes twelve, and not a minute before', () => {
    const state = lineCompany();
    state.workers.push(manager());
    state.stock.boards = 10;
    state.clock.minute = PURCHASE_ORDER_MINUTE - 2;
    const before = runMinutes(state, 1).state;
    expect(stockLines(before)).toEqual([]);
    const after = runMinutes(before, 1).state;
    expect(after.clock.minute).toBe(PURCHASE_ORDER_MINUTE);
    expect(stockLines(after)).toContain('22 boards for stock, ordered by Pat');
  });

  it('buys a working week when his card says so, and to full stores, never past the free places', () => {
    const state = lineCompany();
    state.workers.push(manager());
    state.stock.boards = 10;
    const week = act(state, { type: 'SET_PURCHASE_COVER', cover: 'week' });
    expect(purchaseCoverOf(week)).toBe('week');
    // Forty windows a week want eighty boards, and the timber rack has thirty free places.
    expect(purchaseOrderFor(week, 'boards')).toBe(30);
    expect(purchaseOrderFor(week, 'glass')).toBe(40);
    const full = act(week, { type: 'SET_PURCHASE_COVER', cover: 'full' });
    expect(purchaseOrderFor(full, 'glass')).toBe(freeRoomFor(full, 'glass'));
    purchaseAtNoon(atNoon(full));
    for (const kind of ['boards', 'glass'] as const) {
      expect(full.stock[kind] + pendingStockSheets(full, kind), kind).toBe(roomFor(full, kind));
    }
    // What is on its way is in hand: the next noon buys nothing more of it.
    expect(purchaseOrderFor(full, 'boards')).toBe(0);
  });

  it('buys the sheets a standing contract takes in the days ahead, and nothing of a kind nothing takes', () => {
    const state = lineCompany();
    expect(purchaseOrderFor(state, 'sheets')).toBe(0);
    const contract = drawContract(state);
    contract.pieceId = 'cutSheetPack';
    contract.quantityPerWeek = 40;
    contract.status = 'active';
    state.contracts.push(contract);
    // Sixteen packs in two working days, at 0.15 of a sheet each: three sheets.
    expect(purchaseNeed(state, 'sheets', 2)).toBe(sheetsForPieces(contractPiece(contract), 16));
    expect(purchaseNeed(state, 'sheets', 2)).toBe(3);
  });

  it('buys nothing on a day off and nothing while he is off work', () => {
    const state = lineCompany();
    const pm = manager();
    state.workers.push(pm);
    state.stock.boards = 10;
    const day = state.clock.day;
    let off = day + 1;
    while (isWorkingDay(off)) off += 1;
    state.clock.day = off;
    purchaseAtNoon(atNoon(state));
    expect(stockLines(state)).toEqual([]);
    state.clock.day = day;
    pm.absentDaysRemaining = 2;
    purchaseAtNoon(atNoon(state));
    expect(stockLines(state)).toEqual([]);
  });
});

describe('the office beside him (v128)', () => {
  it('leaves the lines to him while he is at work, and the admin restocks them as before while he is not', () => {
    const state = lineCompany();
    const pm = manager();
    state.workers.push(admin(), pm);
    state.stock.boards = 10;
    officeOrdersLineMaterial(state, 1);
    expect(stockLines(state)).toEqual([]);
    pm.absentDaysRemaining = 3;
    officeOrdersLineMaterial(state, 1);
    expect(stockLines(state).some((label) => /^\d+ boards for stock, ordered by Anna$/.test(label))).toBe(true);
  });

  it('orders a job s material the moment it can, his name on both lines, ahead of the admin', () => {
    const { state, job } = windowJob();
    expect(autoOrderMaterial(state, job)).toBe(true);
    const labels = state.ledger.map((entry) => entry.label);
    expect(labels).toEqual(
      expect.arrayContaining(['Material for Oak Lane: boards, ordered by Pat', 'Material for Oak Lane: glass, ordered by Pat']),
    );
    expect(labels.some((label) => label.endsWith('ordered by Anna'))).toBe(false);
  });

  it('takes the daily ordering chore first, the admin behind him', () => {
    expect(rolesForTask('dailyOrdering')).toEqual({
      eligible: ['purchaseManager', 'officeAdmin'],
      auto: ['purchaseManager', 'officeAdmin'],
    });
  });

  it('is measured on Our team by what he buys for and how far ahead', () => {
    const state = lineCompany();
    const pm = manager();
    state.workers.push(pm);
    expect(usageOfMan(state, pm.id)).toMatchObject({ percent: null, band: 'fine', words: 'buys at noon for 1 line, two days ahead' });
    const full = act(state, { type: 'SET_PURCHASE_COVER', cover: 'full' });
    expect(usageOfMan(full, pm.id)?.words).toBe('buys at noon for 1 line, to full stores');
  });

  it('is taken on behind the office admin, one grade, at 5,500 a month', () => {
    const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    state.reputation = 40;
    state.cash = 100000;
    expect(HIRING_SPECS.find((spec) => spec.role === 'purchaseManager')).toMatchObject({
      tier: null,
      label: 'Purchase manager',
      monthlyWage: 5500,
      minReputation: 5,
    });
    const option = (): string => hiringOptions(state).find((entry) => entry.role === 'purchaseManager')?.blockReason ?? 'none';
    expect(option()).toBe('Hire an office admin first');
    state.workers.push(admin());
    expect(option()).not.toBe('Hire an office admin first');
  });
});

describe('the yacht line s reorder (v128)', () => {
  it('buys for a yacht line short of its third upgrade: two working days are at least one yacht', () => {
    const state = yachtLine();
    // 960 minutes a yacht with no upgrade: none in a working day, and one is still bought for.
    expect(lineReorderWindows(state, 1)).toBe(1);
  });
});
