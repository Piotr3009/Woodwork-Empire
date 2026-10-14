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
// proposal]: two boards and one glass a window, and a line short of either stands (CLAUDE.md T31 2.1
// to 2.4, section 7). From Turn 32 the line has no material of its own and no order buttons: it
// takes its boards off the timber stores and its glass off the glass racks as a standing contract
// takes its sheets, holding the week's from the free stock, and the office restocks them for it
// [PIOTR, 13.10: "yes"] (CLAUDE.md T32 2.5). The tests whose whole subject went with the line's own
// orders (the batch of 40 and of 20, its refusals, its calling off, the whole load at the gate and
// module 6's 40 windows) went with them.

import { describe, expect, it } from 'vitest';
import {
  DAYS_PER_WEEK,
  LINE_BOARDS_PER_WINDOW,
  LINE_GLASS_PER_WINDOW,
  LINE_MODULES,
  LINE_WINDOW_MINUTES,
  LINE_WINDOW_PRICE,
  SHEET_VALUE,
} from '../../src/engine/constants';
import type { GameEvent, GameState, Worker } from '../../src/engine/index';
import { applyAction, runMinutes } from '../../src/engine/index';
import { sellMachine } from '../../src/engine/game';
import {
  answerLineOffer,
  lineBoardsPerWindowCost,
  lineMaterialPerWindow,
  lineReorderWindows,
  lineShortOf,
  officeOrdersLineMaterial,
  reserveLineMaterial,
  runLineDay,
  runningLineContract,
} from '../../src/engine/lineContract';
import { freeRoomFor, roomFor } from '../../src/engine/machines';
import {
  buyStock,
  fetchFromStorage,
  freeFor,
  glassUnitPrice,
  reserveSheetsFor,
  reserveShortfalls,
  reservedFor,
  restockCheck,
  restockSheets,
  restockSplit,
  stockLine,
  stockOnItem,
  unloadIntoStock,
} from '../../src/engine/materials';
import { acceptContract, drawContract, reserveContractSheets } from '../../src/engine/contracts';
import { warnings } from '../../src/engine/warnings';
import { isWorkingDay } from '../../src/engine/clock';
import { movingMachines } from '../../src/engine/tasks';
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
import { lineState } from '../../src/engine/lineContract';

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

/** A labourer, who takes every unloading off the list without being asked (CLAUDE.md T11 3.4). */
function labourer(): Worker {
  return { ...testJoiner('w-lab', 'Gus'), role: 'helper', tier: null, rate: 0 };
}

/** The whole line standing from (2, 14), two engineers on the books, a timber store of this class
 *  behind the line and a glass rack of this class on the floor (CLAUDE.md T32 2.1), and the line's
 *  contract running from this minute. */
function running(
  store: 'timberRack' | 'timberShelter' | null = 'timberShelter',
  rack: 'glassRack' | 'glassRackLarge' | null = 'glassRackLarge',
): GameState {
  const state = bigUnit();
  LINE_MODULES.forEach((id, index) => placeEquipment(state, id, { x: 2 + 6 * index, y: 14, id: `kit-line-${index + 1}` }));
  for (const id of ['eng-1', 'eng-2']) state.workers.push(engineer(id));
  if (store !== null) placeEquipment(state, store, { variantId: 'standard', x: 30, y: 2, id: 'kit-store' });
  if (rack !== null) placeGlassRack(state, rack);
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

/** Boards on the timber stores and glass on the glass racks, as if they had come in: the company's
 *  stock, and the line's contract holds its week of it as it does after every unloading (CLAUDE.md
 *  T32 2.2, 2.5). Flipped in v96: the line has no boards or glass of its own. */
function stocked(state: GameState, boards = 40, glass = 20): GameState {
  state.stock.boards += boards;
  state.stock.glass += glass;
  reserveLineMaterial(state, 1);
  return state;
}

/** What the line's running contract holds of each kind. */
function held(state: GameState): { boards: number; glass: number } {
  const contract = runningLineContract(state, 1);
  return { boards: contract?.boardsReserved ?? 0, glass: contract?.glassReserved ?? 0 };
}

/** The office's restock lines in the ledger, by what they say. */
function officeLines(state: GameState): string[] {
  return state.ledger
    .filter((entry) => entry.category === 'material' && entry.label.endsWith('for stock, ordered by Anna'))
    .map((entry) => entry.label);
}

/** Loads for stock of a kind, not yet unloaded. */
function stockLoads(state: GameState, kind: 'boards' | 'glass'): number {
  return state.deliveries.filter((delivery) => delivery.jobId === null && delivery.material === kind && !delivery.unloaded).length;
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
    // Flipped in v96: the glass of a window is one glass unit at the one price the store sells it
    // at, written from the line's own figures (CLAUDE.md T32 2.3).
    expect(glassUnitPrice() * LINE_GLASS_PER_WINDOW).toBe(lineMaterialPerWindow() - 2 * SHEET_VALUE);
    expect(lineBoardsPerWindowCost() + glassUnitPrice() * LINE_GLASS_PER_WINDOW).toBe(600);
  });

  it('takes two boards off the timber stores and one glass unit off the glass racks for each window, held first, and books no material', () => {
    const state = stocked(running());
    expect(held(state)).toEqual({ boards: 40, glass: 20 });
    const sheets = state.stock.sheets;
    const cash = state.cash;
    const after = play(state, LINE_WINDOW_MINUTES);
    expect(lineState(after, 1).contract?.windowsMade).toBe(1);
    // Flipped in v96: off the counters of their kinds, out of what the contract holds (CLAUDE.md
    // T32 2.5); the sheets are not touched.
    expect(after.stock.boards).toBe(38);
    expect(after.stock.glass).toBe(19);
    expect(held(after)).toEqual({ boards: 38, glass: 19 });
    expect(after.stock.sheets).toBe(sheets);
    expect(after.cash).toBe(cash + LINE_WINDOW_PRICE);
    expect(after.ledger.some((entry) => entry.category === 'material' && entry.day === state.clock.day)).toBe(false);
  });

  it('takes free stock when it holds none, as a sheet contract takes the free sheets', () => {
    const state = running();
    state.stock.boards = 10;
    state.stock.glass = 5;
    expect(held(state)).toEqual({ boards: 0, glass: 0 });
    expect(lineShortOf(state, 1)).toBeNull();
    const after = play(state, LINE_WINDOW_MINUTES);
    expect(lineState(after, 1).contract?.windowsMade).toBe(1);
    expect(after.stock.boards).toBe(8);
    expect(after.stock.glass).toBe(4);
  });

  it('stands in every minute it has not a window s boards, or its glass, or either', () => {
    const noTimber = stocked(running(), 1, 20);
    expect(lineShortOf(noTimber, 1)).toBe('timber');
    const noGlass = stocked(running(), 40, 0);
    expect(lineShortOf(noGlass, 1)).toBe('glass');
    const neither = running();
    expect(lineShortOf(neither, 1)).toBe('timber or glass');
    for (const state of [noTimber, noGlass, neither]) {
      const after = play(state, 3 * LINE_WINDOW_MINUTES);
      expect(lineState(after, 1).contract?.windowsMade).toBe(0);
      // No minute of a window in hand runs while it stands.
      expect(lineState(after, 1).minutes).toBe(0);
    }
  });

  it('stops at the window whose boards run out, the minutes past it waiting for the next load', () => {
    const state = stocked(running(), 4, 20);
    const after = play(state, 4 * LINE_WINDOW_MINUTES);
    expect(lineState(after, 1).contract?.windowsMade).toBe(2);
    expect(after.stock.boards).toBe(0);
    expect(lineShortOf(after, 1)).toBe('timber');
  });
});

describe('the line s boards are held (CLAUDE.md T31 2.1, T32 2.5)', () => {
  it('counts them in what is held of the boards, never as free sheets, on the stores plates and the boards line', () => {
    const state = running();
    const sheetsFree = freeFor(state, 'sheets');
    const sheets = state.stock.sheets;
    const room = freeRoomFor(state, 'boards');
    stocked(state, 40, 0);
    // Flipped in v96: the boards are on a counter of their own and the contract holds them from the
    // free boards (CLAUDE.md T32 2.2, 2.5).
    expect(held(state).boards).toBe(40);
    expect(reservedFor(state, 'boards')).toBe(40);
    expect(freeFor(state, 'boards')).toBe(0);
    expect(reservedFor(state, 'sheets')).toBe(0);
    expect(freeFor(state, 'sheets')).toBe(sheetsFree);
    expect(state.stock.sheets).toBe(sheets);
    expect(freeRoomFor(state, 'boards')).toBe(room - 40);
    expect(stockOnItem(state, { id: 'kit-store' })).toBe(40);
    expect(stockLine(state, 'boards')).toMatchObject({ free: 0, reserved: 40, total: 40, capacity: roomFor(state, 'boards') });
  });

  it('holds the week in hand s boards and glass and no more, from the free stock only', () => {
    const state = stocked(running(), 100, 50);
    // Forty windows a week at 60 minutes (v97), none made yet: eighty boards and forty glass units.
    expect(held(state)).toEqual({ boards: 80, glass: 40 });
    expect(freeFor(state, 'boards')).toBe(20);
    expect(freeFor(state, 'glass')).toBe(10);
    const contract = runningLineContract(state, 1);
    if (contract === null) throw new Error('the contract is wanted');
    contract.windowsThisWeek = 35;
    contract.boardsReserved = 0;
    contract.glassReserved = 0;
    reserveLineMaterial(state, 1);
    expect(held(state)).toEqual({ boards: 10, glass: 5 });
  });

  it('holds after the jobs: what lands is held by the jobs short of it first, then by the line for its week', () => {
    const state = running();
    const taken = acceptNow(state, placeEnquiry(state, {}).id);
    const job = taken.jobs.at(-1);
    if (job === undefined) throw new Error('the job is wanted');
    // A window short of its twelve boards and seven glass units, taken before the stock came in.
    Object.assign(job, { timber: true, sheets: 12, sheetsUsed: 0, sheetsReserved: 0, glassUnits: 7, glassUsed: 0, glassReserved: 0 });
    taken.stock.boards = 14;
    taken.stock.glass = 8;
    reserveShortfalls(taken);
    expect([job.sheetsReserved, job.glassReserved]).toEqual([12, 7]);
    expect(held(taken)).toEqual({ boards: 2, glass: 1 });
    expect(freeFor(taken, 'boards')).toBe(0);
    expect(freeFor(taken, 'glass')).toBe(0);
  });

  it('holds nothing while the contract is only offered or there is none', () => {
    const offered = running();
    const contract = lineState(offered, 1).contract;
    if (contract === null) throw new Error('the contract is wanted');
    contract.status = 'offered';
    offered.stock.boards = 40;
    offered.stock.glass = 20;
    reserveLineMaterial(offered, 1);
    expect(contract.boardsReserved).toBe(0);
    expect(reservedFor(offered, 'boards')).toBe(0);
    expect(reservedFor(offered, 'glass')).toBe(0);
    const none = running();
    lineState(none, 1).contract = null;
    none.stock.boards = 40;
    reserveLineMaterial(none, 1);
    expect(freeFor(none, 'boards')).toBe(40);
  });

  it('never lets a sheet job or a standing sheet contract take one of them', () => {
    const state = stocked(running(), 40, 0);
    // Nothing on the sheets' counter: the forty are boards, on their own counter (CLAUDE.md T32
    // 2.2). Flipped in v96: no shared counter to keep them apart on.
    state.stock.sheets = 0;
    expect(freeFor(state, 'sheets')).toBe(0);
    const taken = acceptNow(state, placeEnquiry(state, {}).id);
    const job = taken.jobs[taken.jobs.length - 1];
    if (job === undefined) throw new Error('the job is wanted');
    expect(job.materialKind).toBe('sheet');
    expect(job.sheetsReserved).toBe(0);
    expect(reserveSheetsFor(taken, job)).toBe(0);
    const contract = drawContract(taken, structuredClone(taken));
    contract.pieceId = 'cutSheetPack';
    taken.contracts.push(contract);
    expect(acceptContract(taken, contract.id).ok).toBe(true);
    expect(reserveContractSheets(taken, contract)).toBe(0);
    // The forty are still held by the line, on the boards' counter, and none of them a sheet.
    expect(held(taken).boards).toBe(40);
    expect(taken.stock.boards).toBe(40);
    expect(taken.stock.sheets).toBe(0);
  });
});

describe('the line s material comes in (CLAUDE.md T32 2.3, 2.6)', () => {
  it('as a restock of boards, in the next working morning, unloaded onto the timber stores and held by the line from then on', () => {
    const state = running();
    expect(restockCheck(state, 'boards', 40).ok).toBe(true);
    expect(buyStock(state, 'boards', 40)).toBe(true);
    expect(state.ledger.at(-1)?.label).toBe('40 boards for stock');
    let next = nextDay(state);
    const load = next.deliveries.at(-1);
    if (load === undefined) throw new Error('the load is wanted');
    expect(load).toMatchObject({ jobId: null, sheets: 40, material: 'boards', arrived: true });
    const task = next.tasks.find((entry) => entry.kind === 'unload' && !entry.done && entry.deliveryId === load.id);
    expect(task?.label).toBe('Unload 40 boards');
    const before = next.stock.boards;
    const sheets = next.stock.sheets;
    unloadIntoStock(next, load);
    expect(next.stock.boards).toBe(before + 40);
    expect(next.stock.sheets).toBe(sheets);
    expect(next.stock.tempStorageBoards).toBe(0);
    next = structuredClone(next);
    expect(held(next).boards).toBe(40);
  });

  it('as a restock of glass units at 200 each, on a lorry the next working morning, unloaded onto the glass racks and held by the line', () => {
    const state = running();
    const cash = state.cash;
    expect(buyStock(state, 'glass', 20)).toBe(true);
    expect(state.cash).toBe(cash - 20 * glassUnitPrice());
    expect(state.ledger.at(-1)).toMatchObject({ category: 'material', label: '20 glass units for stock', amount: -4000 });
    const next = nextDay(state);
    const load = next.deliveries.at(-1);
    if (load === undefined) throw new Error('the load is wanted');
    expect(load).toMatchObject({ jobId: null, sheets: 20, material: 'glass', arrived: true });
    expect(next.tasks.find((entry) => entry.kind === 'unload' && !entry.done && entry.deliveryId === load.id)?.label).toBe(
      'Unload 20 glass units',
    );
    unloadIntoStock(next, load);
    expect(next.stock.glass).toBe(20);
    expect(held(next).glass).toBe(20);
  });
});

describe('the office orders it (CLAUDE.md T31 2.3, T32 2.5)', () => {
  it('restocks each kind at two working days left, named in the ledger, and nothing with no admin on duty', () => {
    // Two working days of windows: sixteen at an hour a window (v97).
    expect(lineReorderWindows(running(), 1)).toBe(16);
    const state = stocked(running(), 14, 7);
    officeOrdersLineMaterial(state, 1);
    expect(stockLoads(state, 'boards') + stockLoads(state, 'glass')).toBe(0);
    state.workers.push(admin());
    // Flipped in v96: his order is the Restock with nothing typed, which fills each kind's free
    // places (CLAUDE.md T32 2.5).
    const boards = restockSheets(state, 'boards');
    const glass = restockSheets(state, 'glass');
    expect(boards).toBe(roomFor(state, 'boards') - 14);
    expect(glass).toBe(roomFor(state, 'glass') - 7);
    officeOrdersLineMaterial(state, 1);
    expect(officeLines(state)).toEqual([`${boards} boards for stock, ordered by Anna`, `${glass} glass units for stock, ordered by Anna`]);
    expect(stockLoads(state, 'boards')).toBe(1);
    expect(stockLoads(state, 'glass')).toBe(1);
    // Once on its way it is counted: nothing more is ordered the same minute.
    const count = state.ledger.length;
    officeOrdersLineMaterial(state, 1);
    expect(state.ledger.length).toBe(count);
  });

  it('orders the minute the contract is taken, so a new contract waits no working day for it', () => {
    const state = running();
    state.workers.push(admin());
    const contract = lineState(state, 1).contract;
    if (contract === null) throw new Error('the contract is wanted');
    contract.status = 'offered';
    answerLineOffer(state, 1, 'take');
    expect(lineState(state, 1).contract?.status).toBe('active');
    // Flipped in v96: a restock of each kind, for stock (CLAUDE.md T32 2.5).
    expect(stockLoads(state, 'boards')).toBe(1);
    expect(stockLoads(state, 'glass')).toBe(1);
  });

  it('orders only what Restock allows: nothing past the overdraft, no boards with no timber store and no glass with no glass rack', () => {
    const broke = stocked(running(), 0, 0);
    broke.workers.push(admin());
    broke.cash = -1e9;
    expect(restockCheck(broke, 'boards').ok).toBe(false);
    expect(restockCheck(broke, 'glass').ok).toBe(false);
    officeOrdersLineMaterial(broke, 1);
    expect(broke.deliveries.some((delivery) => delivery.jobId === null && !delivery.unloaded)).toBe(false);
    // Flipped in v96: the stores' refusals are Restock's, in each kind's words (CLAUDE.md T32 2.3).
    const storeless = stocked(running(null), 0, 0);
    storeless.workers.push(admin());
    expect(restockCheck(storeless, 'boards').reason).toBe('No timber store');
    officeOrdersLineMaterial(storeless, 1);
    expect(stockLoads(storeless, 'boards')).toBe(0);
    // The glass, which a glass rack holds, is ordered all the same.
    expect(stockLoads(storeless, 'glass')).toBe(1);
    const rackless = stocked(running('timberShelter', null), 0, 0);
    rackless.workers.push(admin());
    expect(restockCheck(rackless, 'glass').reason).toBe('No glass rack');
    officeOrdersLineMaterial(rackless, 1);
    expect(stockLoads(rackless, 'glass')).toBe(0);
    expect(stockLoads(rackless, 'boards')).toBe(1);
  });

  it('does not order while two days are on hand, and orders the boards only into free places', () => {
    // Two days on hand are sixteen windows from v97: 32 boards and 16 glass units.
    const plenty = stocked(running(), 32, 16);
    plenty.workers.push(admin());
    officeOrdersLineMaterial(plenty, 1);
    expect(officeLines(plenty)).toEqual([]);
    // One rack of 40 with ten boards on it: he fills its thirty free places and sends nothing to the
    // paid store. Flipped in v96: the batch of 40 that would have waited at the gate is gone
    // (CLAUDE.md T32 2.5, 2.8).
    const tight = stocked(running('timberRack'), 10, 20);
    tight.workers.push(admin());
    expect(restockSplit(tight, 'boards')).toMatchObject({ sheets: 30, onRack: 30, toStorage: 0, storageCost: 0 });
    officeOrdersLineMaterial(tight, 1);
    expect(officeLines(tight)).toEqual(['30 boards for stock, ordered by Anna']);
    expect(tight.deliveries.at(-1)).toMatchObject({ material: 'boards', sheets: 30, jobId: null });
    expect(restockSheets(tight, 'boards')).toBe(0);
  });

  it('keeps the line in material through a played fortnight, so it never stands for it', () => {
    let state = stocked(running(), 40, 20);
    state.workers.push(admin());
    // Flipped in v96: the glass comes by lorry too, so two loads land on one morning and the owner
    // answers one card at a time; the labourer unloads both without being asked (CLAUDE.md T32 2.6).
    state.workers.push(labourer());
    const seen: GameEvent[] = [];
    let workingDays = 0;
    for (let day = 0; day < 14; day += 1) {
      if (isWorkingDay(state.clock.day)) workingDays += 1;
      state = nextDay(state, seen);
    }
    // Eight windows every working day played (v97: an hour a window), so it never stood for its
    // timber or glass.
    expect(lineState(state, 1).contract?.windowsMade).toBe(8 * workingDays);
    const labels = officeLines(state);
    expect(labels.filter((label) => label.includes(' boards for stock')).length).toBeGreaterThanOrEqual(1);
    expect(labels.filter((label) => label.includes(' glass units for stock')).length).toBeGreaterThanOrEqual(1);
    // Never into the paid store: he fills the free places only.
    expect(state.ledger.some((entry) => entry.category === 'storage')).toBe(false);
  });
});

describe('the end and the sale (CLAUDE.md T31 2.1, T32 2.5)', () => {
  it('frees what the contract held when it ends, keeps the stock, and orders nothing for it', () => {
    const state = stocked(running(), 12, 5);
    expect(held(state)).toEqual({ boards: 12, glass: 5 });
    state.workers.push(admin());
    const ended = act(state, { type: 'END_LINE_CONTRACT', line: 1 });
    // Flipped in v96: the boards and the glass are the company's, free again (CLAUDE.md T32 2.5).
    expect(ended.stock.boards).toBe(12);
    expect(ended.stock.glass).toBe(5);
    expect(freeFor(ended, 'boards')).toBe(12);
    expect(freeFor(ended, 'glass')).toBe(5);
    const count = ended.ledger.length;
    officeOrdersLineMaterial(ended, 1);
    expect(ended.ledger.length).toBe(count);
    expect(officeLines(ended)).toEqual([]);
  });

  it('writes nothing off at the line s sale: its boards and glass stay on the counters, free, and a restock on its way still comes', () => {
    const state = stocked(running(), 20, 6);
    buyStock(state, 'boards', 40);
    buyStock(state, 'glass', 20);
    const deliveries = state.deliveries.length;
    const cash = state.cash;
    expect(held(state)).toEqual({ boards: 20, glass: 6 });
    expect([reservedFor(state, 'boards'), reservedFor(state, 'glass')]).toEqual([20, 6]);
    expect(sellMachine(state, 'kit-line-3').ok).toBe(true);
    expect([reservedFor(state, 'boards'), reservedFor(state, 'glass')]).toEqual([0, 0]);
    // Flipped in v96: nothing written off and no load called off (CLAUDE.md T32 2.5).
    expect(state.ledger.some((entry) => entry.label.startsWith('Material written off'))).toBe(false);
    expect(state.stock.boards).toBe(20);
    expect(state.stock.glass).toBe(6);
    expect(freeFor(state, 'boards')).toBe(20);
    expect(freeFor(state, 'glass')).toBe(6);
    expect(state.deliveries).toHaveLength(deliveries);
    expect(state.cash).toBe(cash);
  });
});

/** A window job on the books of this company, its boards and glass as given (CLAUDE.md T32 2.4). */
function windowOn(state: GameState, sheetsReserved: number, glassReserved: number): GameState {
  const taken = acceptNow(state, placeEnquiry(state, {}).id);
  const job = taken.jobs[taken.jobs.length - 1];
  if (job === undefined) throw new Error('the job is taken');
  Object.assign(job, { timber: true, sheets: 12, sheetsUsed: 0, sheetsReserved, glassUnits: 7, glassUsed: 0, glassReserved });
  return taken;
}

describe('the line holds after the windows, at every turn (CLAUDE.md T32 2.5, section 7)', () => {
  it('holds at the open only what the windows short of their material leave it, and a fresh week when the week turns', () => {
    const taken = windowOn(running(), 0, 0);
    const job = taken.jobs[taken.jobs.length - 1];
    taken.stock.boards = 14;
    taken.stock.glass = 8;
    runLineDay(taken);
    expect([job?.sheetsReserved, job?.glassReserved]).toEqual([12, 7]);
    // The line first would have held all 14 and 8.
    expect(held(taken)).toEqual({ boards: 2, glass: 1 });
    const week = stocked(running(), 100, 50);
    const contract = runningLineContract(week, 1);
    if (contract === null) throw new Error('the contract runs');
    contract.windowsThisWeek = 40;
    contract.boardsReserved = 0;
    contract.glassReserved = 0;
    week.clock.day += DAYS_PER_WEEK;
    runLineDay(week);
    expect(contract.windowsThisWeek).toBe(0);
    // A fresh week of forty windows (v97): eighty boards and forty units.
    expect(held(week)).toEqual({ boards: 80, glass: 40 });
  });

  it('holds what the morning s fetch brings back from the paid store', () => {
    const state = running();
    state.stock.tempStorageBoards = 30;
    state.stock.tempStorageGlass = 10;
    fetchFromStorage(state);
    expect([state.stock.boards, state.stock.glass]).toEqual([30, 10]);
    expect(held(state)).toEqual({ boards: 30, glass: 10 });
  });

  it('never takes what a window holds: it stands beside it, the window s boards and glass untouched', () => {
    const taken = windowOn(running(), 12, 7);
    taken.stock.boards = 13;
    taken.stock.glass = 7;
    expect(lineShortOf(taken, 1)).toBe('timber or glass');
    taken.stock.glass = 8;
    expect(lineShortOf(taken, 1)).toBe('timber');
    const after = play(taken, LINE_WINDOW_MINUTES);
    expect(lineState(after, 1).contract?.windowsMade).toBe(0);
    expect(after.stock.boards).toBe(13);
  });

  it('has the office look again after every window made', () => {
    const state = stocked(running(), 33, 20);
    state.workers.push(admin());
    officeOrdersLineMaterial(state, 1);
    // Thirty three boards and twenty glass units are two days of windows (sixteen from v97) and more.
    expect(officeLines(state)).toEqual([]);
    const after = play(state, LINE_WINDOW_MINUTES);
    expect(lineState(after, 1).contract?.windowsMade).toBe(1);
    expect(officeLines(after)).toEqual([`${roomFor(after, 'boards') - 31} boards for stock, ordered by Anna`]);
  });
});

describe('the strip (CLAUDE.md T31 2.4)', () => {
  it('says the line stands for want of timber, glass or both, only with the contract running and both engineers on duty', () => {
    const texts = (state: GameState): string[] => warnings(state).map((warning) => warning.text);
    expect(texts(stocked(running(), 0, 20))).toContain('Line 1 stands: no timber for its next window');
    expect(texts(stocked(running(), 40, 0))).toContain('Line 1 stands: no glass for its next window');
    expect(texts(running())).toContain('Line 1 stands: no timber or glass for its next window');
    expect(warnings(stocked(running())).some((warning) => warning.key === 'lineNeedsMaterial')).toBe(false);
    const one = running();
    one.workers = one.workers.filter((worker) => worker.id !== 'eng-2');
    expect(warnings(one).some((warning) => warning.key === 'lineNeedsMaterial')).toBe(false);
    const none = running();
    lineState(none, 1).contract = null;
    expect(warnings(none).some((warning) => warning.key === 'lineNeedsMaterial')).toBe(false);
    // While the line is being moved it is the move that stops it, not the material.
    let moving = act({ ...running(), speed: 0 } as GameState, { type: 'MOVE_ITEM', itemId: 'kit-line-1', x: 2, y: 11 });
    moving = act(moving, { type: 'END_SETUP', speed: 1 });
    moving = act(moving, { type: 'RESOLVE_EVENT', choiceId: 'do' });
    expect(movingMachines(moving)).not.toBeNull();
    expect(warnings(moving).some((warning) => warning.key === 'lineNeedsMaterial')).toBe(false);
  });
});
