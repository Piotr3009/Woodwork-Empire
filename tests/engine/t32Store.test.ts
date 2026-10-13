/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// Turn 32, 2.2 to 2.8: one store for every material [PIOTR, 13.10: "ordering the timber for the
// windows and the glass should work identically to the sheets"]. Three counters, each kind's room,
// free places, held and free from one function each; Restock for each kind; a window's boards and
// glass off the stores, ordered as a sheet job's shortfall is and its glass taken whole at its
// Glazing; the line fed from the stores and the office's restock for it; glass by lorry; every
// kind's overflow to its paid store and back at one fetch; and every name of 2.8 gone from src/
// (CLAUDE.md T32 section 7).

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LINE_MODULES, LINE_WINDOW_MINUTES, LINE_WINDOW_PRICE, TEMP_STORAGE_COST } from '../../src/engine/constants';
import { applyAction, runMinutes } from '../../src/engine/game';
import { insuredStockValue } from '../../src/engine/insurance';
import { autoOrderMaterial, dropJob, hallStops, orderForJobCheck } from '../../src/engine/jobs';
import { lineOfferBody, lineReorderWindows, lineShortOf, lineState, reserveLineMaterial } from '../../src/engine/lineContract';
import { freeRoomFor, roomFor } from '../../src/engine/machines';
import {
  buyStock,
  canUnload,
  drawGlassFor,
  fetchFromStorage,
  freeFor,
  glassAtHand,
  glassForJob,
  glassUnitPrice,
  orderForJob,
  orderForJobCost,
  pendingStockSheets,
  reservedFor,
  restockCheck,
  restockSheets,
  restockSplit,
  stockCostFor,
  unloadIntoStock,
} from '../../src/engine/materials';
import { canWorkOn } from '../../src/engine/production';
import { warnings } from '../../src/engine/warnings';
import type { GameEvent, GameState, Job, Worker } from '../../src/engine/index';
import {
  acceptNow,
  act,
  buyStartingKit,
  fillRack,
  newGame,
  nextDay,
  placeEnquiry,
  placeEquipment,
  placeGlassRack,
  testJoiner,
  withAir,
} from '../helpers';

/** The 200 m2 unit with the day one kit, a timber rack of 40 boards and a glass rack of 40 units. */
function stores(): GameState {
  const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
  state.cash = 200000;
  state.reputation = 40;
  state.enquiries = [];
  placeEquipment(state, 'timberRack', { x: 14, y: 2, id: 'kit-timber' });
  placeGlassRack(state);
  return state;
}

function admin(): Worker {
  return { ...testJoiner('adm-1', 'Anna'), role: 'officeAdmin', tier: null, rate: 0, monthlyWage: 2000 };
}

/** A casement window job of 9,000 taken off the board: 3,600 of material, 12 boards and 7 glass
 *  units. Its desk work is taken off it, so its material is the only question left. */
function casement(state: GameState): { state: GameState; job: Job } {
  const enquiry = placeEnquiry(state, {
    templateId: 'casementWindows',
    name: 'Oak Lane',
    price: 9000,
    basePrice: 9000,
    finish: 'laminate',
    materialKind: 'solidWood',
    deadlineDays: 60,
  });
  const taken = acceptNow(state, enquiry.id);
  const job = taken.jobs.find((entry) => entry.name === 'Oak Lane');
  if (job === undefined) throw new Error('the window is taken');
  taken.tasks = taken.tasks.filter((task) => task.jobId !== job.id);
  return { state: taken, job };
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

/** Unloads every load at the gate through the engine's own path, as the unloading task does, and
 *  takes its task off the list with it. */
function unloadAll(state: GameState): void {
  for (const delivery of state.deliveries) {
    if (!delivery.arrived || delivery.unloaded) continue;
    delivery.unloaded = true;
    unloadIntoStock(state, delivery);
    state.tasks = state.tasks.filter((task) => task.deliveryId !== delivery.id);
  }
}

describe('three counters (CLAUDE.md T32 2.2)', () => {
  it('keeps each kind on its own counter, its room and free places from one function each', () => {
    const state = fillRack(stores(), 20);
    expect(state.stock).toMatchObject({ sheets: 20, boards: 0, glass: 0, tempStorageSheets: 0, tempStorageBoards: 0, tempStorageGlass: 0 });
    expect(roomFor(state, 'sheets')).toBe(50);
    expect(roomFor(state, 'boards')).toBe(40);
    expect(roomFor(state, 'glass')).toBe(40);
    state.stock.boards = 30;
    state.stock.glass = 45;
    expect(freeRoomFor(state, 'sheets')).toBe(30);
    expect(freeRoomFor(state, 'boards')).toBe(10);
    // Never below nought, however far past its room a kind stands.
    expect(freeRoomFor(state, 'glass')).toBe(0);
  });

  it('holds a window s boards and glass on their own counters, and the sheets counter holds sheets only', () => {
    const start = fillRack(stores(), 20);
    start.stock.boards = 30;
    start.stock.glass = 10;
    const { state, job } = casement(start);
    expect(job.timber).toBe(true);
    expect([job.sheets, job.glassUnits]).toEqual([12, 7]);
    expect([job.sheetsReserved, job.glassReserved]).toEqual([12, 7]);
    expect(reservedFor(state, 'sheets')).toBe(0);
    expect(reservedFor(state, 'boards')).toBe(12);
    expect(reservedFor(state, 'glass')).toBe(7);
    expect(freeFor(state, 'sheets')).toBe(20);
    expect(freeFor(state, 'boards')).toBe(18);
    expect(freeFor(state, 'glass')).toBe(3);
    expect(state.stock.sheets).toBe(20);
  });

  it('insures all three: the sheets and the boards at a sheet s value, the glass at a unit s price', () => {
    const state = fillRack(stores(), 10);
    state.stock.boards = 5;
    state.stock.glass = 3;
    expect(glassUnitPrice()).toBe(200);
    expect(insuredStockValue(state)).toBe((10 + 5) * 200 + 3 * 200);
  });
});

describe('Restock for each kind (CLAUDE.md T32 2.3)', () => {
  it('refuses each kind first in its own words, in the sheets order', () => {
    const bare = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    bare.equipment = bare.equipment.filter((item) => item.specId !== 'sheetRack');
    expect(restockCheck(bare, 'sheets').reason).toBe('No shelving yet');
    expect(restockCheck(bare, 'boards').reason).toBe('No timber store');
    expect(restockCheck(bare, 'glass').reason).toBe('No glass rack');
    const state = stores();
    expect(restockCheck(state, 'boards')).toMatchObject({ ok: true, sheets: 40 });
    expect(buyStock(state, 'boards', 40)).toBe(true);
    expect(restockCheck(state, 'boards').reason).toBe('40 boards are on the way');
    expect(buyStock(state, 'glass', 1)).toBe(true);
    // The field empty asks for what fills the free places less what is on its way: 39.
    expect(restockSheets(state, 'glass')).toBe(39);
    expect(buyStock(state, 'glass', 39)).toBe(true);
    expect(restockCheck(state, 'glass').reason).toBe('40 glass units are on the way');
    state.stock.glass = 40;
    state.deliveries = [];
    expect(restockCheck(state, 'glass').reason).toBe('No room on the glass racks');
    state.cash = -100000;
    expect(restockCheck(state, 'boards', 10).reason).toBe('Not enough cash');
  });

  it('buys the typed number whole, the boards on the ladder and the glass at 200, and quotes the paid store', () => {
    const state = stores();
    expect(restockSheets(state, 'boards', 60)).toBe(60);
    expect(restockCheck(state, 'boards', 60)).toMatchObject({ ok: true, sheets: 60, cost: 60 * 170 });
    expect(restockSplit(state, 'boards', 60)).toEqual({ sheets: 60, onRack: 40, toStorage: 20, storageCost: TEMP_STORAGE_COST });
    expect(restockCheck(state, 'glass', 30)).toMatchObject({ ok: true, sheets: 30, cost: 30 * 200 });
    expect(restockSplit(state, 'glass', 30)).toMatchObject({ onRack: 30, toStorage: 0, storageCost: 0 });
    // The sheets' ladder is what it was to the pound.
    expect(stockCostFor('sheets', 40)).toBe(7200);
    expect(stockCostFor('boards', 40)).toBe(7200);
    expect(stockCostFor('glass', 40)).toBe(8000);
    const bought = act(act(state, { type: 'RESTOCK', kind: 'boards', sheets: 60 }), { type: 'RESTOCK', kind: 'glass', sheets: 30 });
    expect(bought.ledger.map((entry) => entry.label)).toEqual(
      expect.arrayContaining(['60 boards for stock', '30 glass units for stock']),
    );
    expect(pendingStockSheets(bought, 'boards')).toBe(60);
    expect(pendingStockSheets(bought, 'glass')).toBe(30);
    expect(pendingStockSheets(bought, 'sheets')).toBe(0);
  });
});

describe('every kind by lorry, its overflow to its paid store (CLAUDE.md T32 2.6)', () => {
  it('unloads the boards and the glass onto their kit, the rest to the paid store at one fee a load, back at one fetch', () => {
    let state = stores();
    state = act(state, { type: 'RESTOCK', kind: 'boards', sheets: 60 });
    state = act(state, { type: 'RESTOCK', kind: 'glass', sheets: 50 });
    const day = state.clock.day;
    state = nextDay(state);
    const tasks = state.tasks.filter((task) => task.kind === 'unload').map((task) => task.label);
    expect(tasks).toEqual(expect.arrayContaining(['Unload 60 boards', 'Unload 50 glass units']));
    expect(state.deliveries.every((delivery) => delivery.arriveDay === state.clock.day && delivery.arriveDay > day)).toBe(true);
    const cash = state.cash;
    unloadAll(state);
    expect([state.stock.boards, state.stock.tempStorageBoards]).toEqual([40, 20]);
    expect([state.stock.glass, state.stock.tempStorageGlass]).toEqual([40, 10]);
    expect(state.cash).toBe(cash - 2 * TEMP_STORAGE_COST);
    expect(state.ledger.map((entry) => entry.label)).toEqual(
      expect.arrayContaining(['Temporary storage for 20 boards', 'Temporary storage for 10 glass units']),
    );
    state = nextDay(state);
    const fetch = state.tasks.find((task) => task.kind === 'fetchStorage' && !task.done);
    expect(fetch?.label).toBe('Fetch 20 boards and 10 glass units from storage');
    fetchFromStorage(state);
    expect([state.stock.boards, state.stock.glass, state.stock.tempStorageBoards, state.stock.tempStorageGlass]).toEqual([60, 50, 0, 0]);
  });

  it('keeps a load of a kind with no kit at all at the gate, and its card says so in its kind s words', () => {
    let state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    state.cash = 200000;
    expect(buyStock(state, 'glass', 7)).toBe(true);
    const seen: GameEvent[] = [];
    state = nextDay(state, seen);
    const load = state.deliveries[0];
    if (load === undefined) throw new Error('the glass is on its lorry');
    expect(load).toMatchObject({ material: 'glass', arrived: true, unloaded: false });
    expect(canUnload(state, load)).toBe(false);
    const card = [...seen, state.activeEvent, ...state.eventQueue].find((event) => event?.kind === 'deliveryArrived');
    expect(card?.body).toBe('7 glass units have arrived and there is no glass rack to put them on. Buy one from the catalogue.');
    expect(card?.choices.map((choice) => choice.id)).toEqual(['later']);
  });
});

describe('a window s boards and glass off the stores (CLAUDE.md T32 2.4)', () => {
  it('reckons a 9,000 casement window s glass at seven units, and none for a sheet job', () => {
    expect(glassForJob(3600, true)).toBe(7);
    expect(glassForJob(3600, false)).toBe(0);
  });

  it('orders both shortfalls at one click, on two lorries at the two prices, in the next working morning', () => {
    const { state, job } = casement(stores());
    expect([job.sheetsReserved, job.glassReserved]).toEqual([0, 0]);
    expect(orderForJobCost(job)).toBe(12 * 190 + 7 * 200);
    const loads = orderForJob(state, job);
    expect(loads.map((load) => [load.material, load.sheets, load.pricePaid])).toEqual([
      ['boards', 12, 2280],
      ['glass', 7, 1400],
    ]);
    expect(loads.every((load) => load.arriveDay === loads[0]?.arriveDay)).toBe(true);
    expect(state.ledger.map((entry) => entry.label)).toEqual(
      expect.arrayContaining(['Material for Oak Lane: boards', 'Material for Oak Lane: glass']),
    );
    expect(orderForJobCheck(state, job).reason).toBe('On its way already');
  });

  it('has the office admin order both by himself, his name on both lines, and a shortfall of glass alone', () => {
    const start = stores();
    start.workers.push(admin());
    start.stock.boards = 20;
    const { state, job } = casement(start);
    expect([job.sheetsReserved, job.glassReserved]).toEqual([12, 0]);
    expect(autoOrderMaterial(state, job)).toBe(true);
    expect(state.deliveries.map((load) => [load.material, load.sheets])).toEqual([['glass', 7]]);
    expect(state.ledger.some((entry) => entry.label === 'Material for Oak Lane: glass, ordered by Anna')).toBe(true);
  });

  it('takes its whole glass at the start of its Glazing, held first, and stands there without it', () => {
    const start = stores();
    start.stock.boards = 12;
    start.stock.glass = 4;
    const { state, job } = casement(start);
    expect([job.sheetsReserved, job.glassReserved]).toEqual([12, 4]);
    // At its Glazing: 85 per cent of its labour in, the last stage on the timber plan.
    job.stage = 'inProduction';
    job.labourRemaining = job.labourValue * 0.15;
    expect(glassAtHand(state, job)).toBe(false);
    expect(hallStops(state, job)).toBe('waiting for glass');
    expect(canWorkOn(state, job)).toBe(false);
    state.stock.glass = 7;
    expect(hallStops(state, job)).toBe('');
    expect(canWorkOn(state, job)).toBe(true);
    expect([job.glassUsed, job.glassReserved, state.stock.glass]).toEqual([7, 0, 0]);
    // Taken whole once: nothing more is asked of the racks.
    expect(drawGlassFor(state, job)).toBe(true);
    expect(state.stock.glass).toBe(0);
  });

  it('puts back what it held free when dropped, and writes off what was ordered in for it, each on its own counter', () => {
    const start = stores();
    start.stock.boards = 12;
    const { state, job } = casement(start);
    orderForJob(state, job);
    const glassLoad = state.deliveries.find((load) => load.material === 'glass');
    if (glassLoad === undefined) throw new Error('the glass is ordered');
    expect(dropJob(state, job.id)).toBe(true);
    const lines = state.ledger.filter((entry) => entry.label === 'Material written off: Oak Lane');
    // The boards came off the stores and go back free; the glass was ordered in and is written off
    // at its share of the material, 1,260.
    expect(lines.map((entry) => entry.amount)).toEqual([-1260]);
    expect(state.ledger.some((entry) => entry.label.startsWith('Glass written off'))).toBe(false);
    expect(freeFor(state, 'boards')).toBe(12);
    // The load on its lorry is not called off: it comes in as stock, as a dropped sheet job's does.
    expect(state.deliveries).toContain(glassLoad);
  });
});

/** A company in the 800 m2 unit with the whole line from (2, 14), two engineers, a timber rack and a
 *  glass rack, and the line's contract taken this minute. */
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

describe('the line fed from the stores (CLAUDE.md T32 2.5)', () => {
  it('keeps what it holds when a window is taken: the window holds from the free stock only', () => {
    const state = lineCompany();
    state.stock.boards = 30;
    state.stock.glass = 30;
    reserveLineMaterial(state, 1);
    expect(lineState(state, 1).contract).toMatchObject({ boardsReserved: 30, glassReserved: 20 });
    const { state: taken, job } = casement(state);
    expect([job.sheetsReserved, job.glassReserved]).toEqual([0, 7]);
    expect(lineState(taken, 1).contract).toMatchObject({ boardsReserved: 30, glassReserved: 20 });
    expect(freeFor(taken, 'glass')).toBe(3);
  });

  it('holds the week s boards and glass after the jobs, and a window takes two boards and a unit, held first', () => {
    const state = lineCompany();
    state.stock.boards = 30;
    state.stock.glass = 30;
    reserveLineMaterial(state, 1);
    // Twenty windows a week at two hours: forty boards and twenty units wanted, what is free held.
    expect(lineState(state, 1).contract).toMatchObject({ boardsReserved: 30, glassReserved: 20 });
    const cash = state.cash;
    const after = play(state, LINE_WINDOW_MINUTES);
    expect(lineState(after, 1).contract).toMatchObject({ windowsMade: 1, boardsReserved: 28, glassReserved: 19 });
    expect([after.stock.boards, after.stock.glass]).toEqual([28, 29]);
    expect(after.cash).toBe(cash + LINE_WINDOW_PRICE);
  });

  it('stands with no timber once the stores run dry, said on the strip, and has no material of its own', () => {
    const state = lineCompany();
    state.stock.glass = 10;
    expect(lineShortOf(state, 1)).toBe('timber');
    expect(warnings(state).some((warning) => warning.key === 'lineNeedsMaterial' && warning.text === 'Line 1 stands: no timber for its next window')).toBe(true);
    for (const key of ['boards', 'glass', 'glassOnTheWay']) expect(key in lineState(state, 1), key).toBe(false);
    expect(lineOfferBody(state, 1)).toContain(
      'The timber and the glass cost £600 a window, taken from your timber stores and glass racks: restock them on the Materials page, or the office does.',
    );
  });

  it('has the office admin restock each kind for it at two days left, into the free places only, his name on the line', () => {
    const state = lineCompany();
    state.workers.push(admin());
    state.stock.boards = 10;
    // Sixteen boards are two working days at a window every two hours.
    expect(lineReorderWindows(state, 1) * 2).toBe(16);
    const next = act(state, { type: 'SET_SPEED', speed: 1 });
    const fresh = play(nextDay(next), 1);
    const labels = fresh.ledger.map((entry) => entry.label);
    expect(labels.some((label) => /^\d+ boards for stock, ordered by Anna$/.test(label))).toBe(true);
    expect(labels.some((label) => /^\d+ glass units for stock, ordered by Anna$/.test(label))).toBe(true);
    // Into the free places and never past them: nothing of it goes to the paid store.
    expect(pendingStockSheets(fresh, 'boards') + fresh.stock.boards).toBeLessThanOrEqual(roomFor(fresh, 'boards'));
    expect(pendingStockSheets(fresh, 'glass') + fresh.stock.glass).toBeLessThanOrEqual(roomFor(fresh, 'glass'));
  });

  it('buys nothing with no admin on duty, and frees what the contract held when it ends, writing nothing off', () => {
    const state = lineCompany();
    state.stock.boards = 30;
    state.stock.glass = 30;
    reserveLineMaterial(state, 1);
    const fresh = nextDay(state);
    expect(fresh.ledger.some((entry) => / for stock/.test(entry.label))).toBe(false);
    const ended = act(fresh, { type: 'END_LINE_CONTRACT', line: 1 });
    expect(reservedFor(ended, 'boards')).toBe(0);
    expect(reservedFor(ended, 'glass')).toBe(0);
    expect([ended.stock.boards, ended.stock.glass]).toEqual([fresh.stock.boards, fresh.stock.glass]);
    expect(ended.ledger.some((entry) => entry.label.startsWith('Material written off'))).toBe(false);
  });
});

/** Every source file under a directory. */
function sourceFiles(directory: string): string[] {
  const found: string[] = [];
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) found.push(...sourceFiles(path));
    else if (path.endsWith('.ts')) found.push(path);
  }
  return found;
}

describe('what goes (CLAUDE.md T32 2.8)', () => {
  it('leaves none of the glazier, the boards whole load, the stores refusal, the line s own material or the one counter in src/', () => {
    const gone = [
      'ORDER_GLASS',
      'orderGlass',
      'orderGlassFor',
      'orderGlassCheck',
      'arriveGlass',
      'GlassState',
      'glassNotOrdered',
      'Glass written off',
      'boardsAtTheGate',
      'They wait at the gate',
      'storesHoldCheck',
      'ORDER_LINE_TIMBER',
      'ORDER_LINE_GLASS',
      'orderLineTimber',
      'orderLineGlass',
      'lineTimberCheck',
      'lineGlassCheck',
      'lineTimberBatch',
      'lineGlassBatchCost',
      'lineBoardsOnTheWay',
      'lineGlassOnTheWay',
      'arriveLineGlass',
      'lineGlassWindows',
      'writeOffLineMaterial',
      'LineGlassOnTheWay',
      'LINE_GLASS_WINDOWS_MAX',
      'LINE_ORDER_WINDOWS',
      'lineGlassPerWindowCost',
      'lineLoadInWords',
      'isBoards',
      'sheetsOnCounter',
      'boardsHeld',
      'freeBoardRoom',
      'reservedSheets',
      'freeSheets',
      'stockFree',
      'Timber is ordered for the job',
      'Order glass',
      'Order timber',
      // The job card's glass figures, the board's red line of the stores and the page's rows of a
      // line's glass (CLAUDE.md T32 2.7, 2.8).
      'Glass not ordered',
      'Glass ordered, here on',
      'Glass is in',
      'and the timber stores hold',
      'data-stores',
      'lineGlass',
      'boardsRow',
    ];
    // No code name of them stands anywhere in src/, the lifts among them.
    const everywhere = sourceFiles('src');
    for (const name of gone) {
      const holders = everywhere.filter((path) => readFileSync(path, 'utf8').includes(name));
      expect(holders, name).toEqual([]);
    }
    // The lifts read the old shape of a save by its old field names, as raw JSON, and are the one
    // place those may stand (CLAUDE.md T32 section 4): the glazier's two fields, a job's glass state,
    // a line's glass on its way and a delivery's two marks.
    const files = everywhere.filter((path) => !path.endsWith('migrate.ts'));
    for (const field of ['glassDay', 'glassOnTheWay']) {
      expect(files.filter((path) => readFileSync(path, 'utf8').includes(field)), field).toEqual([]);
    }
    for (const pattern of [/\bjob\.glass\b/, /\bdelivery\.(line|boards)\b/, /\bboards\?: true/]) {
      expect(files.filter((path) => pattern.test(readFileSync(path, 'utf8'))), String(pattern)).toEqual([]);
    }
  });
});
