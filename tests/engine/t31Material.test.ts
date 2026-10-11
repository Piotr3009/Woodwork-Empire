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
// proposal]: two boards and one glass a window, ordered ahead by the player or by the office, and a
// line short of either stands (CLAUDE.md T31 2.1 to 2.4, section 7).

import { describe, expect, it, vi } from 'vitest';
import {
  LINE_BOARDS_PER_WINDOW,
  LINE_GLASS_PER_WINDOW,
  LINE_GLASS_WINDOWS_MAX,
  LINE_MODULES,
  LINE_ORDER_WINDOWS,
  LINE_WINDOW_MINUTES,
  LINE_WINDOW_PRICE,
  SHEET_VALUE,
} from '../../src/engine/constants';
import type { GameEvent, GameState, Worker } from '../../src/engine/index';
import { applyAction, runMinutes } from '../../src/engine/index';
import { cancelOrder, sellMachine } from '../../src/engine/game';
import {
  answerLineOffer,
  lineBoardsPerWindowCost,
  lineGlassCheck,
  lineGlassPerWindowCost,
  lineMaterialPerWindow,
  lineReorderWindows,
  lineShortOf,
  lineTimberCheck,
  officeOrdersLineMaterial,
  orderLineGlass,
  orderLineTimber,
} from '../../src/engine/lineContract';
import { boardRoom, boardsHeld, freeBoardRoom, sheetsOnCounter } from '../../src/engine/machines';
import {
  arriveDeliveries,
  boardsLine,
  boardsOnStore,
  freeSheets,
  loadWords,
  pendingStockSheets,
  reservedSheets,
  unloadIntoStock,
} from '../../src/engine/materials';
import { shoppingList } from '../../src/engine/orders';
import { warnings } from '../../src/engine/warnings';
import { isWorkingDay } from '../../src/engine/clock';
import { movingMachines } from '../../src/engine/tasks';
import { act, buyStartingKit, newGame, nextDay, placeEquipment, testJoiner, withAir } from '../helpers';

// The smallest timber store holds a batch, 40, so a hall whose stores hold fewer is asked of the one
// count of their room, wrapped so one test can say so.
vi.mock('../../src/engine/machines', async (importOriginal) => {
  const real = (await importOriginal()) as { boardRoom: (...args: never[]) => number };
  return { ...real, boardRoom: vi.fn(real.boardRoom) };
});

/** A company in the 800 m² unit with the day one kit and air enough for a CNC. */
function bigUnit(): GameState {
  let state = newGame({ difficulty: 'veryEasy' });
  state.cash = 9000000;
  state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
  state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'second' }));
  state = withAir(buyStartingKit(state), 'industrial');
  state.cash = 500000;
  state.reputation = 40;
  state.enquiries = [];
  return state;
}

function engineer(id: string): Worker {
  return { ...testJoiner(id, id), role: 'lineEngineer', tier: null, rate: 0, monthlyWage: 15000 };
}

function admin(): Worker {
  return { ...testJoiner('adm-1', 'Anna'), role: 'officeAdmin', tier: null, rate: 0, monthlyWage: 2000 };
}

/** The whole line standing from (2, 14), two engineers on the books, a timber store of this class
 *  behind the line, and the line's contract running from this minute. */
function running(store: 'timberRack' | 'timberShelter' | null = 'timberShelter'): GameState {
  const state = bigUnit();
  LINE_MODULES.forEach((id, index) => placeEquipment(state, id, { x: 2 + 6 * index, y: 14, id: `kit-line-${index + 1}` }));
  for (const id of ['eng-1', 'eng-2']) state.workers.push(engineer(id));
  if (store !== null) placeEquipment(state, store, { variantId: 'standard', x: 30, y: 2, id: 'kit-store' });
  state.windowLine.contract = {
    status: 'active',
    startDay: state.clock.day,
    windowsThisWeek: 0,
    weekStartDay: state.clock.day,
    windowsMade: 0,
    revenue: 0,
    materialCost: 0,
  };
  state.clock.minute = 0;
  state.activeEvent = null;
  state.eventQueue = [];
  return state;
}

/** The line given what one batch of each brings, as if it had come in. */
function stocked(state: GameState, boards = 40, glass = 20): GameState {
  state.windowLine.boards += boards;
  state.stock.sheets += boards;
  state.windowLine.glass += glass;
  return state;
}

/** Plays minutes of the clock, answering every card with its first choice. */
function play(state: GameState, minutes: number): GameState {
  let next = state;
  let left = minutes;
  let guard = 0;
  while (left > 0 && guard < 400) {
    guard += 1;
    if (next.activeEvent !== null) {
      next = applyAction(next, { type: 'RESOLVE_EVENT', choiceId: next.activeEvent.choices[0]?.id ?? 'ok' });
      continue;
    }
    const result = runMinutes(next, left);
    next = result.state;
    left -= result.minutesRun;
    if (result.minutesRun === 0 && next.activeEvent === null) break;
  }
  return next;
}

describe('what a window takes (CLAUDE.md T31 2.1)', () => {
  it('splits the 600 into two boards at a board s worth and the glass the rest', () => {
    expect(LINE_BOARDS_PER_WINDOW).toBe(2);
    expect(LINE_GLASS_PER_WINDOW).toBe(1);
    expect(lineBoardsPerWindowCost()).toBe(2 * SHEET_VALUE);
    expect(lineGlassPerWindowCost()).toBe(lineMaterialPerWindow() - 2 * SHEET_VALUE);
    expect(lineBoardsPerWindowCost() + lineGlassPerWindowCost()).toBe(600);
  });

  it('takes two boards off the line and the counter and one glass off module 6 for each window, and books no material', () => {
    const state = stocked(running());
    const sheets = state.stock.sheets;
    const cash = state.cash;
    const after = play(state, LINE_WINDOW_MINUTES);
    expect(after.windowLine.contract?.windowsMade).toBe(1);
    expect(after.windowLine.boards).toBe(38);
    expect(after.stock.sheets).toBe(sheets - 2);
    expect(after.windowLine.glass).toBe(19);
    expect(after.cash).toBe(cash + LINE_WINDOW_PRICE);
    expect(after.ledger.some((entry) => entry.category === 'material' && entry.day === state.clock.day)).toBe(false);
  });

  it('stands in every minute it has not a window s boards, or its glass, or either', () => {
    const noTimber = stocked(running(), 1, 20);
    expect(lineShortOf(noTimber)).toBe('timber');
    const noGlass = stocked(running(), 40, 0);
    expect(lineShortOf(noGlass)).toBe('glass');
    const neither = running();
    expect(lineShortOf(neither)).toBe('timber or glass');
    for (const state of [noTimber, noGlass, neither]) {
      const after = play(state, 3 * LINE_WINDOW_MINUTES);
      expect(after.windowLine.contract?.windowsMade).toBe(0);
      // No minute of a window in hand runs while it stands.
      expect(after.windowLine.minutes).toBe(0);
    }
  });

  it('stops at the window whose boards run out, the minutes past it waiting for the next load', () => {
    const state = stocked(running(), 4, 20);
    const after = play(state, 4 * LINE_WINDOW_MINUTES);
    expect(after.windowLine.contract?.windowsMade).toBe(2);
    expect(after.windowLine.boards).toBe(0);
    expect(lineShortOf(after)).toBe('timber');
  });
});

describe('the line s boards are held (CLAUDE.md T31 2.1)', () => {
  it('counts them in what is held and reserved, never as free sheets, on the stores plates and the boards row', () => {
    const state = running();
    const free = freeSheets(state);
    const counter = sheetsOnCounter(state);
    const held = boardsHeld(state);
    const room = freeBoardRoom(state);
    stocked(state, 40, 0);
    expect(boardsHeld(state)).toBe(held + 40);
    expect(reservedSheets(state)).toBeGreaterThanOrEqual(40);
    expect(freeSheets(state)).toBe(free);
    expect(sheetsOnCounter(state)).toBe(counter);
    expect(freeBoardRoom(state)).toBe(room - 40);
    expect(boardsOnStore(state, { id: 'kit-store' })).toBe(held + 40);
    expect(boardsLine(state).held).toBe(held + 40);
  });
});

describe('ordering the line s timber (CLAUDE.md T31 2.2)', () => {
  it('is 40 boards for 8,000, paid at the click on the material line, on one lorry the next working day', () => {
    const state = running();
    const cash = state.cash;
    expect(orderLineTimber(state).ok).toBe(true);
    expect(state.cash).toBe(cash - 40 * SHEET_VALUE);
    const line = state.ledger.at(-1);
    expect([line?.category, line?.label, line?.amount]).toEqual(['material', 'Timber for the line: 40 boards', -8000]);
    const load = state.deliveries.at(-1);
    expect(load).toMatchObject({ jobId: null, sheets: 40, boards: true, line: true, arrived: false, pricePaid: 8000 });
    expect(load?.arriveDay).toBeGreaterThan(state.clock.day);
    // Never stock: Restock does not count it as sheets on the way.
    expect(pendingStockSheets(state)).toBe(0);
    // Its words are its own on the Orders list.
    const order = shoppingList(state).find((entry) => entry.id === load?.id);
    expect(order?.name).toBe('Timber for the line: 40 boards');
    expect(order?.detail).toBe("for the line's contract");
    expect(order?.canCancel).toBe(true);
  });

  it('comes in the next working morning, unloaded whole onto the timber stores and the line s from then on', () => {
    const state = running();
    orderLineTimber(state);
    let next = nextDay(state);
    expect(next.deliveries.at(-1)?.arrived).toBe(true);
    const task = next.tasks.find((entry) => entry.kind === 'unload' && !entry.done);
    expect(task?.label).toBe('Unload timber for the line: 40 boards');
    const before = next.stock.sheets;
    const load = next.deliveries.at(-1);
    if (load === undefined) throw new Error('the load is wanted');
    unloadIntoStock(next, load);
    expect(next.windowLine.boards).toBe(40);
    expect(next.stock.sheets).toBe(before + 40);
    expect(next.stock.tempStorageSheets).toBe(0);
    next = structuredClone(next);
    expect(boardsHeld(next)).toBeGreaterThanOrEqual(40);
  });

  it('waits at the gate with no room on the stores, and the strip names the line', () => {
    const state = running('timberRack');
    // The rack's 40 already taken by the line's own boards.
    stocked(state, 40, 20);
    expect(orderLineTimber(state).ok).toBe(true);
    const load = state.deliveries.at(-1);
    if (load === undefined) throw new Error('the load is wanted');
    load.arriveDay = state.clock.day;
    arriveDeliveries(state);
    expect(warnings(state).map((warning) => warning.text)).toContain('Boards at the gate, no room on the stores: the line\'s timber');
    expect(loadWords(state, load)).toBe('Timber for the line: 40 boards');
  });

  it('can be called off on the Orders list until its lorry comes, its price given back', () => {
    const state = running();
    orderLineTimber(state);
    const load = state.deliveries.at(-1);
    const cash = state.cash;
    expect(cancelOrder(state, load?.id ?? '').ok).toBe(true);
    expect(state.cash).toBe(cash + 8000);
    expect(state.ledger.at(-1)?.label).toBe('Order cancelled: 40 boards for the line');
    expect(state.deliveries.some((delivery) => delivery.line === true)).toBe(false);
  });

  it('is refused with no timber store, with stores of fewer than 40 boards, and past the overdraft floor', () => {
    expect(lineTimberCheck(running(null))).toEqual({ ok: false, reason: 'No timber store' });
    const small = running('timberRack');
    expect(lineTimberCheck(small).ok).toBe(true);
    vi.mocked(boardRoom).mockReturnValueOnce(30);
    expect(lineTimberCheck(small)).toEqual({ ok: false, reason: 'The timber stores hold fewer than 40 boards' });
    const poor = running();
    poor.cash = poor.finance.overdraftLimit + 7999;
    expect(lineTimberCheck(poor)).toEqual({ ok: false, reason: 'Not enough cash' });
    expect(orderLineTimber(poor).ok).toBe(false);
    expect(poor.deliveries.some((delivery) => delivery.line === true)).toBe(false);
  });

  it('is not offered without the line s contract running', () => {
    const state = running();
    state.windowLine.contract = null;
    expect(lineTimberCheck(state).ok).toBe(false);
    expect(lineGlassCheck(state).ok).toBe(false);
    expect(act(state, { type: 'ORDER_LINE_TIMBER' }).deliveries).toEqual(state.deliveries);
  });
});

describe('ordering the line s glass (CLAUDE.md T31 2.2)', () => {
  it('is glass for 20 windows for 4,000, paid at the click, at module 6 at the next working open with no lorry', () => {
    const state = running();
    const cash = state.cash;
    expect(orderLineGlass(state).ok).toBe(true);
    expect(state.cash).toBe(cash - LINE_ORDER_WINDOWS * lineGlassPerWindowCost());
    expect(state.ledger.at(-1)?.label).toBe('Glass for the line: 20 windows');
    expect(state.deliveries.some((delivery) => delivery.line === true)).toBe(false);
    expect(state.windowLine.glass).toBe(0);
    const next = nextDay(state);
    expect(next.windowLine.glass).toBe(20);
    expect(next.windowLine.glassOnTheWay).toEqual([]);
    expect(next.tasks.some((task) => task.kind === 'unload' && !task.done)).toBe(false);
  });

  it('takes two batches into a line with none and refuses the third: module 6 holds glass for 40 windows', () => {
    const state = running();
    expect(orderLineGlass(state).ok).toBe(true);
    expect(orderLineGlass(state).ok).toBe(true);
    expect(lineGlassCheck(state)).toEqual({ ok: false, reason: `Module 6 holds glass for ${LINE_GLASS_WINDOWS_MAX} windows` });
    const poor = running();
    poor.cash = poor.finance.overdraftLimit + 3999;
    expect(lineGlassCheck(poor)).toEqual({ ok: false, reason: 'Not enough cash' });
  });
});

describe('the office orders it (CLAUDE.md T31 2.3)', () => {
  it('orders a batch of each at two working days left, named in the ledger, and nothing with no admin on duty', () => {
    expect(lineReorderWindows(running())).toBe(8);
    const state = stocked(running(), 14, 7);
    officeOrdersLineMaterial(state);
    expect(state.deliveries.some((delivery) => delivery.line === true)).toBe(false);
    state.workers.push(admin());
    officeOrdersLineMaterial(state);
    const labels = state.ledger.filter((entry) => entry.category === 'material').map((entry) => entry.label);
    expect(labels).toContain('Timber for the line: 40 boards, ordered by Anna');
    expect(labels).toContain('Glass for the line: 20 windows, ordered by Anna');
    // Once on its way it is counted: nothing more is ordered the same minute.
    const count = state.ledger.length;
    officeOrdersLineMaterial(state);
    expect(state.ledger.length).toBe(count);
  });

  it('orders the minute the contract is taken, so a new contract waits no working day for it', () => {
    const state = running();
    state.workers.push(admin());
    if (state.windowLine.contract === null) throw new Error('the contract is wanted');
    state.windowLine.contract.status = 'offered';
    answerLineOffer(state, 'take');
    expect(state.windowLine.contract?.status).toBe('active');
    expect(state.deliveries.filter((delivery) => delivery.line === true)).toHaveLength(1);
    expect(state.windowLine.glassOnTheWay).toHaveLength(1);
  });

  it('does not order while two days are on hand, and orders the timber only into free room', () => {
    const plenty = stocked(running(), 16, 8);
    plenty.workers.push(admin());
    officeOrdersLineMaterial(plenty);
    expect(plenty.ledger.some((entry) => entry.label.includes('for the line'))).toBe(false);
    // One rack of 40 with ten boards of the line on it: a batch would wait at the gate.
    const tight = stocked(running('timberRack'), 10, 20);
    tight.workers.push(admin());
    expect(lineTimberCheck(tight).ok).toBe(true);
    officeOrdersLineMaterial(tight);
    expect(tight.deliveries.some((delivery) => delivery.line === true)).toBe(false);
  });

  it('keeps the line in material through a played fortnight, so it never stands for it', () => {
    let state = stocked(running(), 40, 20);
    state.workers.push(admin());
    const seen: GameEvent[] = [];
    let workingDays = 0;
    for (let day = 0; day < 14; day += 1) {
      if (isWorkingDay(state.clock.day)) workingDays += 1;
      state = nextDay(state, seen);
    }
    // Four windows every working day played, so it never stood for its timber or glass.
    expect(state.windowLine.contract?.windowsMade).toBe(4 * workingDays);
    expect(state.ledger.filter((entry) => entry.label.startsWith('Timber for the line') && entry.label.endsWith('ordered by Anna')).length).toBeGreaterThanOrEqual(1);
  });
});

describe('the end and the sale (CLAUDE.md T31 2.1)', () => {
  it('keeps the material when the contract ends, and orders nothing for it', () => {
    const state = stocked(running(), 12, 5);
    state.workers.push(admin());
    const ended = act(state, { type: 'END_LINE_CONTRACT' });
    expect(ended.windowLine.boards).toBe(12);
    expect(ended.windowLine.glass).toBe(5);
    officeOrdersLineMaterial(ended);
    expect(ended.ledger.some((entry) => entry.label.includes('for the line'))).toBe(false);
  });

  it('writes the material off at the line s sale, takes its boards off the counter and calls its loads off', () => {
    const state = stocked(running(), 20, 6);
    orderLineTimber(state);
    orderLineGlass(state);
    const sheets = state.stock.sheets;
    const cash = state.cash;
    expect(sellMachine(state, 'kit-line-3').ok).toBe(true);
    const written = state.ledger.find((entry) => entry.label === "Material written off: the line's timber and glass");
    expect(written?.amount).toBe(-(20 * SHEET_VALUE + 6 * lineGlassPerWindowCost()));
    expect(written?.unpaid).toBe(true);
    expect(state.stock.sheets).toBe(sheets - 20);
    expect(state.windowLine.boards).toBe(0);
    expect(state.windowLine.glass).toBe(0);
    expect(state.windowLine.glassOnTheWay).toEqual([]);
    expect(state.deliveries.some((delivery) => delivery.line === true)).toBe(false);
    expect(state.cash).toBe(cash + 8000 + 4000);
  });
});

describe('the strip (CLAUDE.md T31 2.4)', () => {
  it('says the line stands for want of timber, glass or both, only with the contract running and both engineers on duty', () => {
    const texts = (state: GameState): string[] => warnings(state).map((warning) => warning.text);
    expect(texts(stocked(running(), 0, 20))).toContain('The line stands: no timber for its next window');
    expect(texts(stocked(running(), 40, 0))).toContain('The line stands: no glass for its next window');
    expect(texts(running())).toContain('The line stands: no timber or glass for its next window');
    expect(warnings(stocked(running())).some((warning) => warning.key === 'lineNeedsMaterial')).toBe(false);
    const one = running();
    one.workers = one.workers.filter((worker) => worker.id !== 'eng-2');
    expect(warnings(one).some((warning) => warning.key === 'lineNeedsMaterial')).toBe(false);
    const none = running();
    none.windowLine.contract = null;
    expect(warnings(none).some((warning) => warning.key === 'lineNeedsMaterial')).toBe(false);
    // While the line is being moved it is the move that stops it, not the material.
    let moving = act({ ...running(), speed: 0 } as GameState, { type: 'MOVE_ITEM', itemId: 'kit-line-1', x: 2, y: 11 });
    moving = act(moving, { type: 'END_SETUP', speed: 1 });
    moving = act(moving, { type: 'RESOLVE_EVENT', choiceId: 'do' });
    expect(movingMachines(moving)).not.toBeNull();
    expect(warnings(moving).some((warning) => warning.key === 'lineNeedsMaterial')).toBe(false);
  });
});
