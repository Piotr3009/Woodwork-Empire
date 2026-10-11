/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// Turn 31, 2.1 to 2.4: the line's timber and glass [PIOTR, 11.10: "the material is not about the
// bookkeeping, it is about storage and ordering, so that it does not run out"; "yes" to chat's
// proposal]: two boards and one glass a window, held and ordered ahead, the office ordering at two
// days left, the line standing without them, and what the strip says (CLAUDE.md T31 2.1 to 2.4,
// section 7).

import { describe, expect, it } from 'vitest';
import {
  DAY_END_MINUTE,
  LINE_GLASS_WINDOWS_MAX,
  LINE_MODULES,
  LINE_WINDOW_MINUTES,
  LINE_WINDOW_PRICE,
} from '../../src/engine/constants';
import type { GameEvent, GameState, Worker } from '../../src/engine/index';
import { applyAction, runMinutes, warnings } from '../../src/engine/index';
import { addWorkingDays, isWorkingDay } from '../../src/engine/clock';
import { sellMachine } from '../../src/engine/game';
import {
  lineBoardsCostPerWindow,
  lineGlassCheck,
  lineGlassCostPerWindow,
  lineMaterialPerWindow,
  lineReorderWindows,
  lineShortOf,
  lineTimberCheck,
  orderLineGlass,
  orderLineTimber,
  runLineOffice,
} from '../../src/engine/lineContract';
import { boardRoom, boardsHeld, freeBoardRoom, sheetsOnCounter } from '../../src/engine/machines';
import {
  arriveDeliveries,
  boardsLine,
  boardsOnStore,
  canUnload,
  createDelivery,
  freeSheets,
  pendingStockSheets,
  reserveSheetsFor,
} from '../../src/engine/materials';
import { shoppingList } from '../../src/engine/orders';
import { movingMachines } from '../../src/engine/tasks';
import { WARNING_ORDER } from '../../src/engine/warnings';
import { act, buyStartingKit, hireNow, newGame, nextDay, placeEquipment, testJoiner, withAir } from '../helpers';

/** A company in the 800 m² unit with the day one kit, air enough for a CNC, money, and two timber
 *  racks of 40 boards inside the hall. */
function bigUnit(racks = 2): GameState {
  let state = newGame({ difficulty: 'veryEasy' });
  state.cash = 9000000;
  state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
  state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'second' }));
  state = withAir(buyStartingKit(state), 'industrial');
  state.cash = 500000;
  state.reputation = 40;
  state.enquiries = [];
  for (let n = 0; n < racks; n += 1) placeEquipment(state, 'timberRack', { variantId: 'standard', x: 30, y: 2 + 2 * n, id: `kit-rack-${n + 1}` });
  return state;
}

function engineer(id: string): Worker {
  return { ...testJoiner(id, id), role: 'lineEngineer', tier: null, rate: 0, monthlyWage: 15000 };
}

/** The whole line standing from (2, 14), two engineers on the books, and its contract taken at the
 *  open of the morning, with nothing in hand. */
function running(state: GameState): GameState {
  LINE_MODULES.forEach((id, index) => placeEquipment(state, id, { x: 2 + 6 * index, y: 14, id: `kit-line-${index + 1}` }));
  state.workers.push(engineer('eng-1'), engineer('eng-2'));
  const seen: GameEvent[] = [];
  const next = nextDay(state, seen);
  expect(seen.some((event) => event.kind === 'lineContractOffered')).toBe(true);
  expect(next.windowLine.contract?.status).toBe('active');
  return next;
}

/** A batch of each put in by hand, as if ordered and in. */
function stocked(state: GameState, boards = 40, glass = 20): GameState {
  state.windowLine.boards += boards;
  state.stock.sheets += boards;
  state.windowLine.glass += glass;
  return state;
}

function play(state: GameState, minutes: number, answer: (event: GameEvent) => string = (event) => event.choices[0]?.id ?? 'ok'): GameState {
  let next = state;
  let left = minutes;
  let guard = 0;
  while (left > 0 && guard < 400) {
    guard += 1;
    if (next.activeEvent !== null) {
      next = applyAction(next, { type: 'RESOLVE_EVENT', choiceId: answer(next.activeEvent) });
      continue;
    }
    const result = runMinutes(next, left);
    next = result.state;
    left -= result.minutesRun;
    if (result.minutesRun === 0 && next.activeEvent === null) break;
  }
  return next;
}

const home = (event: GameEvent): string => (event.kind === 'goingHome' ? 'home' : event.choices[0]?.id ?? 'ok');

describe('what a window takes (CLAUDE.md T31 2.1)', () => {
  it('splits the window s £600 into two boards at a sheet s value and its glass, the rest', () => {
    expect(lineMaterialPerWindow()).toBe(600);
    expect(lineBoardsCostPerWindow()).toBe(400);
    expect(lineGlassCostPerWindow()).toBe(200);
  });

  it('takes two boards off the line and the counter and one glass off module 6 for each window made', () => {
    const state = stocked(running(bigUnit()));
    const counter = state.stock.sheets;
    const day = play(state, DAY_END_MINUTE + 60, home);
    expect(day.windowLine.contract?.windowsMade).toBe(4);
    expect(day.windowLine.boards).toBe(40 - 8);
    expect(day.stock.sheets).toBe(counter - 8);
    expect(day.windowLine.glass).toBe(20 - 4);
  });

  it('makes no window without its timber, none without its glass, and stands at the minute it runs short', () => {
    for (const [boards, glass, words] of [
      [0, 20, 'no timber'],
      [40, 0, 'no glass'],
      [0, 0, 'no timber or glass'],
    ] as const) {
      const state = stocked(running(bigUnit()), boards, glass);
      expect(lineShortOf(state)).toBe(words);
      const after = play(state, 300);
      expect(after.windowLine.contract?.windowsMade, words).toBe(0);
      expect(after.windowLine.minutes, words).toBe(0);
    }
    // One window's worth: the second window is never made, and its minutes do not run.
    const one = stocked(running(bigUnit()), 2, 1);
    const later = play(one, LINE_WINDOW_MINUTES * 3);
    expect(later.windowLine.contract?.windowsMade).toBe(1);
    expect(later.windowLine.boards).toBe(0);
    expect(later.windowLine.glass).toBe(0);
    expect(lineShortOf(later)).toBe('no timber or glass');
  });

  it('books only the window s price as it is made: the material was paid at its order', () => {
    const state = stocked(running(bigUnit()));
    const cash = state.cash;
    const after = play(state, LINE_WINDOW_MINUTES);
    expect(after.windowLine.contract?.windowsMade).toBe(1);
    expect(after.cash).toBe(cash + LINE_WINDOW_PRICE);
    expect(after.ledger.filter((entry) => entry.category === 'material' && entry.day === after.clock.day)).toEqual([]);
  });
});

describe('the line s boards are held (CLAUDE.md T31 2.1)', () => {
  it('counts them as held on the counter, on the stores plates and the boards row, and never as free sheets', () => {
    const state = stocked(running(bigUnit()), 40, 0);
    expect(boardsHeld(state)).toBe(40);
    expect(sheetsOnCounter(state)).toBe(state.stock.sheets - 40);
    expect(freeSheets(state)).toBe(Math.max(0, state.stock.sheets - 40));
    expect(boardsLine(state)).toEqual({ held: 40, room: 80 });
    expect(freeBoardRoom(state)).toBe(40);
    const racks = state.equipment.filter((item) => item.specId === 'timberRack');
    expect(racks.map((item) => boardsOnStore(state, item))).toEqual([40, 0]);
  });

  it('leaves no sheet job one of them, and no burglar', () => {
    const state = stocked(running(bigUnit()), 40, 0);
    state.stock.sheets = 40;
    expect(freeSheets(state)).toBe(0);
    // A sheet job of any size holds nothing off a counter that has only the line's boards on it.
    const sheetJob = {
      id: 'job-x', materialKind: 'sheet', bespokeMaterial: false, sheets: 10, sheetsUsed: 0, sheetsReserved: 0, stage: 'accepted',
    } as unknown as GameState['jobs'][number];
    expect(reserveSheetsFor(state, sheetJob)).toBe(0);
  });
});

describe('ordering the line s timber (CLAUDE.md T31 2.2)', () => {
  it('pays 8,000 at the click on the material line and sends one lorry of 40 boards for the line on the next working day', () => {
    const state = running(bigUnit());
    const cash = state.cash;
    const after = act(state, { type: 'ORDER_LINE_TIMBER' });
    expect(after.cash).toBe(cash - 8000);
    expect(after.ledger.filter((entry) => entry.label === 'Timber for the line: 40 boards').map((entry) => [entry.category, entry.amount])).toEqual([
      ['material', -8000],
    ]);
    const load = after.deliveries.find((delivery) => delivery.line === true);
    expect(load).toMatchObject({ jobId: null, sheets: 40, boards: true, line: true, bespoke: false, pricePaid: 8000 });
    expect(load?.arriveDay).toBe(addWorkingDays(after.clock.day, 1));
    // Never stock: Restock does not count it as sheets on the way.
    expect(pendingStockSheets(after)).toBe(0);
    // Its own words on the Orders list, and it can be called off there until its lorry comes.
    const line = shoppingList(after).find((entry) => entry.id === load?.id);
    expect(line).toMatchObject({ kind: 'material', name: 'Timber for the line: 40 boards', detail: '', canCancel: true });
    const called = act(after, { type: 'CANCEL_ORDER', orderId: load?.id ?? '' });
    expect(called.cash).toBe(cash);
    expect(called.deliveries.some((delivery) => delivery.line === true)).toBe(false);
  });

  it('comes in at the next working open and is unloaded whole onto the stores, the line s from then', () => {
    const state = running(bigUnit());
    const ordered = act(state, { type: 'ORDER_LINE_TIMBER' });
    const load = ordered.deliveries.find((delivery) => delivery.line === true);
    if (load === undefined) throw new Error('no load');
    // The morning it comes: one unloading task in its own words.
    const morning = structuredClone(ordered);
    morning.clock.day = load.arriveDay;
    arriveDeliveries(morning);
    expect(morning.tasks.find((task) => task.deliveryId === load.id)?.label).toBe('Unload timber for the line: 40 boards');
    // Unloaded on the day it came, by whoever the day gave it to: played to the morning after.
    let next = nextDay(ordered);
    while (next.clock.day <= load.arriveDay) next = nextDay(next);
    expect(next.deliveries.filter((delivery) => delivery.line === true && !delivery.unloaded)).toEqual([]);
    expect(next.windowLine.boards).toBe(40);
    expect(boardsHeld(next)).toBe(40);
  });

  it('waits at the gate while the stores have no room for the whole of it, and the strip names the line', () => {
    const state = running(bigUnit(1));
    // A window job s boards fill the one rack.
    state.windowLine.boards = 0;
    const ordered = act(state, { type: 'ORDER_LINE_TIMBER' });
    ordered.windowLine.boards = 10;
    ordered.stock.sheets += 10;
    const load = ordered.deliveries.find((delivery) => delivery.line === true);
    if (load === undefined) throw new Error('no load');
    load.arrived = true;
    expect(canUnload(ordered, load)).toBe(false);
    expect(warnings(ordered).find((warning) => warning.key === 'boardsAtTheGate')?.text).toBe(
      "Boards at the gate, no room on the stores: the line's timber",
    );
  });

  it('is refused in its words: no store, past the overdraft floor, and not without the contract', () => {
    const none = running(bigUnit(0));
    expect(lineTimberCheck(none)).toEqual({ ok: false, reason: 'No timber store' });
    const poor = running(bigUnit());
    poor.cash = poor.finance.overdraftLimit + 7999;
    expect(lineTimberCheck(poor)).toEqual({ ok: false, reason: 'Not enough cash' });
    expect(orderLineTimber(poor)).toBe(false);
    poor.cash += 1;
    expect(lineTimberCheck(poor).ok).toBe(true);
    const ended = act(poor, { type: 'END_LINE_CONTRACT' });
    expect(lineTimberCheck(ended).ok).toBe(false);
    expect(lineGlassCheck(ended).ok).toBe(false);
    // The stores hold a batch or more: one rack holds 40, so the refusal for fewer is the room alone.
    expect(boardRoom(poor)).toBe(80);
  });
});

describe('ordering the line s glass (CLAUDE.md T31 2.2)', () => {
  it('pays 4,000 at the click and is at module 6 at the next working open, with no lorry', () => {
    const state = running(bigUnit());
    const cash = state.cash;
    const after = act(state, { type: 'ORDER_LINE_GLASS' });
    expect(after.cash).toBe(cash - 4000);
    expect(after.ledger.filter((entry) => entry.label === 'Glass for the line: 20 windows').map((entry) => entry.amount)).toEqual([-4000]);
    expect(after.windowLine.glassOnTheWay).toEqual([{ windows: 20, day: addWorkingDays(after.clock.day, 1) }]);
    expect(after.deliveries).toEqual(state.deliveries);
    let next = nextDay(after);
    while (!isWorkingDay(next.clock.day)) next = nextDay(next);
    expect(next.windowLine.glass).toBe(20);
    expect(next.windowLine.glassOnTheWay).toEqual([]);
  });

  it('takes two batches into a line with none and refuses the third: module 6 holds glass for 40 windows', () => {
    const state = running(bigUnit());
    expect(orderLineGlass(state)).toBe(true);
    expect(orderLineGlass(state)).toBe(true);
    expect(lineGlassCheck(state)).toEqual({ ok: false, reason: `Module 6 holds glass for ${LINE_GLASS_WINDOWS_MAX} windows` });
    expect(orderLineGlass(state)).toBe(false);
  });

  it('is refused past the overdraft floor', () => {
    const state = running(bigUnit());
    state.cash = state.finance.overdraftLimit + 3999;
    expect(lineGlassCheck(state)).toEqual({ ok: false, reason: 'Not enough cash' });
    state.cash += 1;
    expect(lineGlassCheck(state).ok).toBe(true);
  });
});

describe('the office orders it (CLAUDE.md T31 2.3)', () => {
  /** The line running with an office admin on duty. */
  function withAdmin(): GameState {
    let state = bigUnit();
    state = hireNow(state, 'officeAdmin', null);
    while (!state.workers.some((worker) => worker.role === 'officeAdmin' && worker.startDay <= state.clock.day)) state = nextDay(state);
    return running(state);
  }

  it('orders a batch of each the minute the contract is taken, in the admin s name [TUNE: the taking]', () => {
    const state = withAdmin();
    expect(lineReorderWindows(state)).toBe(8);
    const admin = state.workers.find((worker) => worker.role === 'officeAdmin');
    expect(state.ledger.some((entry) => entry.label === `Timber for the line: 40 boards, ordered by ${admin?.name}`)).toBe(true);
    expect(state.ledger.some((entry) => entry.label === `Glass for the line: 20 windows, ordered by ${admin?.name}`)).toBe(true);
  });

  it('orders a batch of each at the open of a working day when the line has fewer than two days of windows', () => {
    const state = withAdmin();
    // Nothing in hand and nothing coming, the contract already running before the open.
    state.deliveries = state.deliveries.filter((delivery) => delivery.line !== true);
    state.windowLine.glassOnTheWay = [];
    const ledger = state.ledger.length;
    let next = nextDay(state);
    while (!isWorkingDay(next.clock.day)) next = nextDay(next);
    const admin = next.workers.find((worker) => worker.role === 'officeAdmin');
    const booked = next.ledger.slice(ledger).map((entry) => entry.label);
    expect(booked).toContain(`Timber for the line: 40 boards, ordered by ${admin?.name}`);
    expect(booked).toContain(`Glass for the line: 20 windows, ordered by ${admin?.name}`);
  });

  it('orders again after a window leaves fewer than two days, and only into free room', () => {
    const state = withAdmin();
    // Both batches in and used down to seven windows of each.
    state.deliveries = state.deliveries.filter((delivery) => delivery.line !== true);
    state.windowLine.glassOnTheWay = [];
    stocked(state, 16, 8);
    state.windowLine.minutes = LINE_WINDOW_MINUTES - 1;
    const after = play(state, 1);
    expect(after.windowLine.contract?.windowsMade).toBe(1);
    expect(after.deliveries.filter((delivery) => delivery.line === true)).toHaveLength(1);
    expect(after.windowLine.glassOnTheWay).toHaveLength(1);
    // The stores hold 80 and the line 2, so 78 are free; a window job's load of 40 on its way
    // leaves 38, fewer than a batch, and he orders no timber until it is in.
    const full = withAdmin();
    full.deliveries = full.deliveries.filter((delivery) => delivery.line !== true);
    full.windowLine.glassOnTheWay = [];
    stocked(full, 2, 40);
    createDelivery(full, 'job-1', 40, false, 0, true);
    runLineOffice(full);
    expect(full.deliveries.filter((delivery) => delivery.line === true)).toEqual([]);
    full.deliveries = full.deliveries.filter((delivery) => delivery.jobId !== 'job-1');
    runLineOffice(full);
    expect(full.deliveries.filter((delivery) => delivery.line === true)).toHaveLength(1);
    // The glass of forty windows wanted nothing.
    expect(full.windowLine.glassOnTheWay).toEqual([]);
  });

  it('orders nothing by itself with no admin', () => {
    const state = running(bigUnit());
    expect(state.deliveries.some((delivery) => delivery.line === true)).toBe(false);
    expect(state.windowLine.glassOnTheWay).toEqual([]);
    const day = play(state, DAY_END_MINUTE + 60, home);
    expect(day.deliveries.some((delivery) => delivery.line === true)).toBe(false);
    expect(day.windowLine.glassOnTheWay).toEqual([]);
  });
});

describe('the end of the contract and the sale of the line (CLAUDE.md T31 2.1)', () => {
  it('keeps the material at the contract s end, and orders nothing for it', () => {
    const state = stocked(running(bigUnit()), 24, 12);
    const ended = act(state, { type: 'END_LINE_CONTRACT' });
    expect(ended.windowLine.boards).toBe(24);
    expect(ended.windowLine.glass).toBe(12);
    expect(lineTimberCheck(ended).ok).toBe(false);
  });

  it('writes the boards and glass off at the sale, and calls off its loads on the road for their price', () => {
    const state = stocked(running(bigUnit()), 24, 12);
    orderLineTimber(state);
    orderLineGlass(state);
    const cash = state.cash;
    const counter = state.stock.sheets;
    expect(sellMachine(state, 'kit-line-2').ok).toBe(true);
    expect(state.windowLine.boards).toBe(0);
    expect(state.windowLine.glass).toBe(0);
    expect(state.windowLine.glassOnTheWay).toEqual([]);
    expect(state.stock.sheets).toBe(counter - 24);
    expect(state.deliveries.some((delivery) => delivery.line === true)).toBe(false);
    expect(state.cash).toBe(cash + 8000 + 4000);
    const written = state.ledger.filter((entry) => entry.label === "Material written off: the line's timber and glass");
    expect(written.map((entry) => [entry.category, entry.amount])).toEqual([['material', -(24 * 200 + 12 * 200)]]);
  });
});

describe('what the strip says (CLAUDE.md T31 2.4)', () => {
  it('puts the line short of material directly under the line short of an engineer', () => {
    expect(WARNING_ORDER.indexOf('lineNeedsMaterial')).toBe(WARNING_ORDER.indexOf('lineNeedsEngineer') + 1);
  });

  it('says it only while the contract runs, two engineers are on duty and the material stops it', () => {
    const state = running(bigUnit());
    const text = (of: GameState): string | undefined => warnings(of).find((warning) => warning.key === 'lineNeedsMaterial')?.text;
    expect(text(state)).toBe('The line stands: no timber or glass for its next window');
    stocked(state, 2, 0);
    expect(text(state)).toBe('The line stands: no glass for its next window');
    stocked(state, -2, 1);
    expect(text(state)).toBe('The line stands: no timber for its next window');
    stocked(state, 2, 0);
    expect(text(state)).toBeUndefined();
    // Short of an engineer it is the engineer s line, not this one.
    const one = running(bigUnit());
    one.workers = one.workers.filter((worker) => worker.id !== 'eng-2');
    expect(text(one)).toBeUndefined();
    expect(warnings(one).some((warning) => warning.key === 'lineNeedsEngineer')).toBe(true);
    // And never without the contract.
    expect(text(act(running(bigUnit()), { type: 'END_LINE_CONTRACT' }))).toBeUndefined();
    // Nor while the line is being moved: the move stops it too.
    let moving = act({ ...running(bigUnit()), speed: 0 } as GameState, { type: 'MOVE_ITEM', itemId: 'kit-line-1', x: 2, y: 13 });
    moving = act(moving, { type: 'END_SETUP', speed: 1 });
    moving = act(moving, { type: 'RESOLVE_EVENT', choiceId: 'do' });
    expect(movingMachines(moving)).not.toBeNull();
    expect(lineShortOf(moving)).toBe('no timber or glass');
    expect(text(moving)).toBeUndefined();
  });
});
