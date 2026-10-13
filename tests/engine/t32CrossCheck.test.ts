/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// @vitest-environment jsdom
// Turn 32's cross check (CLAUDE.md T32 section 7): the edges of the one store that the turn's own
// files did not reach. The Restock's refusals in the sheets' order when more than one holds, a
// window holding from the free stock only, its two loads one in and one on the road, its glass held
// in the paid store and not yet in hand, a drop of each kind the window held, drew or used, two glass
// racks of glass spread and sold, and a load of each kind at the gate with room and without.

import { describe, expect, it } from 'vitest';
import { canSell } from '../../src/engine/game';
import { dropJob, hallStops, orderForJobCheck } from '../../src/engine/jobs';
import {
  buyStock,
  canUnload,
  deliveryDay,
  drawSheetsFor,
  fetchFromStorage,
  freeFor,
  glassShortfallOf,
  orderForJob,
  orderForJobCost,
  reservedFor,
  restockCheck,
  shortfallOf,
  stockOnItem,
  unloadIntoStock,
} from '../../src/engine/materials';
import { stockStrandedBySale } from '../../src/engine/machines';
import { canWorkOn } from '../../src/engine/production';
import { STATION_GATE, STATION_GLASS_RACK, unloadFarStation } from '../../src/engine/stations';
import { startTaskCheck, unloadMinutes } from '../../src/engine/tasks';
import { renderHall } from '../../src/render/hall';
import type { GameEvent, GameState, Job, Worker } from '../../src/engine/index';
import { acceptNow, act, buyStartingKit, doTask, fillRack, newGame, nextDay, placeEnquiry, placeEquipment, placeGlassRack, testJoiner } from '../helpers';

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

/** A casement window job of 9,000 taken off the board, its desk work taken off it: 3,600 of
 *  material, 12 boards and 7 glass units. */
function casement(state: GameState, name = 'Oak Lane'): { state: GameState; job: Job } {
  const enquiry = placeEnquiry(state, {
    templateId: 'casementWindows',
    name,
    price: 9000,
    basePrice: 9000,
    finish: 'laminate',
    materialKind: 'solidWood',
    deadlineDays: 60,
  });
  const taken = acceptNow(state, enquiry.id);
  const job = taken.jobs.find((entry) => entry.name === name);
  if (job === undefined) throw new Error('the window is taken');
  taken.tasks = taken.tasks.filter((task) => task.jobId !== job.id);
  return { state: taken, job };
}

/** The cards a morning raised, the one in front and the ones behind it. */
function cardsOf(state: GameState, seen: GameEvent[]): GameEvent[] {
  return [...seen, ...(state.activeEvent === null ? [] : [state.activeEvent]), ...state.eventQueue];
}

function writtenOff(state: GameState, name: string): number[] {
  return state.ledger.filter((entry) => entry.label === `Material written off: ${name}`).map((entry) => entry.amount);
}

describe('the Restock s refusals, each in its words and in the sheets order (CLAUDE.md T32 2.3, section 7)', () => {
  it('says the sheets on their way, the boards with no room and the cash last, carrying what it would buy', () => {
    const rack = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 10);
    const bought = act(rack, { type: 'RESTOCK', kind: 'sheets' });
    // The sheets' ledger line as it always was: forty at the ladder's 180.
    expect(bought.ledger[bought.ledger.length - 1]).toMatchObject({ category: 'material', label: '40 sheets for stock', amount: -7200 });
    expect(restockCheck(bought, 'sheets')).toEqual({ ok: false, reason: '40 sheets are on the way', sheets: 0, cost: 0 });
    const full = stores();
    full.stock.boards = 40;
    expect(restockCheck(full, 'boards')).toEqual({ ok: false, reason: 'No room on the timber stores', sheets: 0, cost: 0 });
    const broke = stores();
    broke.cash = -1e9;
    expect(restockCheck(broke, 'sheets', 10)).toEqual({ ok: false, reason: 'Not enough cash', sheets: 10, cost: 1900 });
    expect(restockCheck(broke, 'boards', 10)).toEqual({ ok: false, reason: 'Not enough cash', sheets: 10, cost: 1900 });
    expect(restockCheck(broke, 'glass', 10)).toEqual({ ok: false, reason: 'Not enough cash', sheets: 10, cost: 2000 });
  });

  it('keeps the order when more than one refusal holds: no kit, then on the way, then no room, then the cash', () => {
    const bare = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    bare.equipment = bare.equipment.filter((item) => item.specId !== 'sheetRack');
    bare.cash = -1e9;
    expect(restockCheck(bare, 'sheets', 10).reason).toBe('No shelving yet');
    expect(restockCheck(bare, 'boards', 10).reason).toBe('No timber store');
    expect(restockCheck(bare, 'glass', 10).reason).toBe('No glass rack');
    const state = stores();
    buyStock(state, 'boards', 40);
    buyStock(state, 'glass', 40);
    state.cash = -1e9;
    expect(restockCheck(state, 'boards')).toEqual({ ok: false, reason: '40 boards are on the way', sheets: 0, cost: 0 });
    expect(restockCheck(state, 'glass')).toEqual({ ok: false, reason: '40 glass units are on the way', sheets: 0, cost: 0 });
    state.deliveries = [];
    state.stock.glass = 40;
    expect(restockCheck(state, 'glass').reason).toBe('No room on the glass racks');
  });
});

describe('a window s boards and glass, at their edges (CLAUDE.md T32 2.4, section 7)', () => {
  it('holds from the free stock only: what another window or the line holds is not taken', () => {
    const start = stores();
    start.stock.boards = 12;
    start.stock.glass = 7;
    const first = casement(start);
    expect([first.job.sheetsReserved, first.job.glassReserved]).toEqual([12, 7]);
    const second = casement(first.state, 'Elm Row');
    expect([second.job.sheetsReserved, second.job.glassReserved]).toEqual([0, 0]);
    expect([shortfallOf(second.job), glassShortfallOf(second.job)]).toEqual([12, 7]);
    expect(orderForJobCost(second.job)).toBe(12 * 190 + 7 * 200);
    const oak = second.state.jobs.find((entry) => entry.name === 'Oak Lane');
    expect([oak?.sheetsReserved, oak?.glassReserved]).toEqual([12, 7]);
    expect([reservedFor(second.state, 'boards'), reservedFor(second.state, 'glass')]).toEqual([12, 7]);
  });

  it('has nothing short with both in hand, and is on its way while either load is still on the road', () => {
    const start = stores();
    start.stock.boards = 12;
    start.stock.glass = 7;
    const whole = casement(start);
    expect(orderForJobCheck(whole.state, whole.job)).toEqual({ ok: false, reason: 'Nothing short' });
    expect(orderForJobCost(whole.job)).toBe(0);
    expect(orderForJob(whole.state, whole.job)).toEqual([]);
    expect(whole.state.ledger.some((entry) => entry.label.startsWith('Material for Oak Lane'))).toBe(false);
    const { state, job } = casement(stores());
    const [boards] = orderForJob(state, job);
    if (boards === undefined) throw new Error('the boards are ordered');
    expect(boards.material).toBe('boards');
    boards.arrived = true;
    boards.unloaded = true;
    unloadIntoStock(state, boards);
    expect([job.sheetsReserved, glassShortfallOf(job)]).toEqual([12, 7]);
    expect(orderForJobCheck(state, job)).toEqual({ ok: false, reason: 'On its way already' });
    expect(orderForJob(state, job)).toEqual([]);
    expect(state.deliveries).toHaveLength(2);
  });

  it('has its glass alone ordered by the office admin by himself, the boards in hand', () => {
    const start = stores();
    start.workers.push(admin());
    start.stock.boards = 20;
    const { state, job } = casement(start);
    // The next settle of the game: any action the player makes.
    const next = act(state, { type: 'SET_SPEED', speed: 1 });
    expect(next.deliveries.map((load) => [load.material, load.jobId, load.sheets, load.pricePaid])).toEqual([['glass', job.id, 7, 1400]]);
    expect(next.ledger.filter((entry) => entry.label === 'Material for Oak Lane: glass, ordered by Anna').map((entry) => entry.amount)).toEqual([-1400]);
    expect(next.ledger.some((entry) => entry.label.startsWith('Material for Oak Lane: boards'))).toBe(false);
  });

  it('stands at its Glazing while the glass it holds lies in the paid store, and goes on at the morning s fetch', () => {
    const start = stores();
    start.stock.boards = 12;
    const { state, job } = casement(start);
    job.glassReserved = 7;
    state.stock.glass = 3;
    state.stock.tempStorageGlass = 4;
    job.stage = 'inProduction';
    job.labourRemaining = job.labourValue * 0.15;
    expect(glassShortfallOf(job)).toBe(0);
    expect(hallStops(state, job)).toBe('waiting for glass');
    expect(canWorkOn(state, job)).toBe(false);
    expect(job.glassUsed).toBe(0);
    fetchFromStorage(state);
    expect(state.stock.glass).toBe(7);
    expect(hallStops(state, job)).toBe('');
    expect(canWorkOn(state, job)).toBe(true);
    expect([job.glassUsed, job.glassReserved, state.stock.glass]).toEqual([7, 0, 0]);
  });
});

describe('a window dropped, each kind on its own counter (CLAUDE.md T32 2.4, section 7)', () => {
  it('puts back free the glass it held off the racks, and writes off the boards ordered in at their share alone', () => {
    const start = stores();
    start.stock.glass = 7;
    const { state, job } = casement(start);
    expect([job.sheetsReserved, job.glassReserved]).toEqual([0, 7]);
    expect(orderForJob(state, job).map((load) => load.material)).toEqual(['boards']);
    expect(dropJob(state, job.id)).toBe(true);
    expect([state.stock.glass, freeFor(state, 'glass'), reservedFor(state, 'glass')]).toEqual([7, 7, 0]);
    expect(state.stock.boards).toBe(0);
    // The boards' share of the 3,600: all of it less the 1,260 of glass.
    expect(writtenOff(state, 'Oak Lane')).toEqual([-2340]);
  });

  it('puts the boards the bench drew and has not cut back on the boards counter, never the sheets, and writes nothing off', () => {
    const start = stores();
    start.stock.boards = 12;
    start.stock.glass = 7;
    const { state, job } = casement(start);
    const sheets = state.stock.sheets;
    job.stage = 'inProduction';
    expect(drawSheetsFor(state, job, 0)).toBe(true);
    expect([state.stock.boards, job.sheetsUsed, job.sheetsReserved]).toEqual([11, 1, 11]);
    expect(dropJob(state, job.id)).toBe(true);
    expect([state.stock.boards, freeFor(state, 'boards'), state.stock.sheets]).toEqual([12, 12, sheets]);
    expect([state.stock.glass, freeFor(state, 'glass')]).toEqual([7, 7]);
    expect(state.ledger.some((entry) => entry.label.startsWith('Material written off'))).toBe(false);
  });

  it('keeps in the window the glass it took at its Glazing: none of it comes back', () => {
    const start = stores();
    start.stock.boards = 12;
    start.stock.glass = 7;
    const { state, job } = casement(start);
    job.stage = 'inProduction';
    job.labourRemaining = job.labourValue * 0.15;
    expect(canWorkOn(state, job)).toBe(true);
    expect([job.glassUsed, state.stock.glass]).toEqual([7, 0]);
    expect(dropJob(state, job.id)).toBe(true);
    expect([state.stock.glass, freeFor(state, 'glass')]).toEqual([0, 0]);
    expect(state.stock.boards).toBe(freeFor(state, 'boards'));
    expect(writtenOff(state, 'Oak Lane')).toEqual([]);
  });
});

describe('two glass racks with glass on them (CLAUDE.md T32 2.1, section 7)', () => {
  it('spread the glass in the order they were bought, on their plates and their names', () => {
    const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    state.cash = 1000000;
    const small = placeGlassRack(state);
    const large = placeGlassRack(state, 'glassRackLarge');
    state.stock.glass = 45;
    expect([stockOnItem(state, small), stockOnItem(state, large)]).toEqual([40, 5]);
    const holder = document.createElement('div');
    holder.innerHTML = renderHall(state);
    expect(holder.querySelector(`[data-kit="${small.id}"]`)?.textContent).toContain('Glass rack: 40 / 40');
    expect(holder.querySelector(`[data-kit="${large.id}"]`)?.textContent).toContain('Large glass rack: 5 / 200');
    expect(holder.querySelector(`[data-kit="${large.id}"] .rack-count`)?.textContent).toBe('5');
  });

  it('are refused for sale while their glass would be stranded, in the racks words', () => {
    const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    state.cash = 1000000;
    const small = placeGlassRack(state);
    const large = placeGlassRack(state, 'glassRackLarge');
    state.stock.glass = 45;
    expect(stockStrandedBySale(state, small)).toBe(0);
    expect(canSell(state, small.id)).toEqual({ ok: true, reason: '' });
    expect(stockStrandedBySale(state, large)).toBe(5);
    expect(canSell(state, large.id)).toEqual({ ok: false, reason: 'Empty it first, 5 glass units on it' });
    state.stock.glass = 41;
    expect(canSell(state, large.id).reason).toBe('Empty it first, 1 glass unit on it');
  });
});

describe('a load of each kind at the gate (CLAUDE.md T32 2.6, section 7)', () => {
  it('brings glass the next working day, bespoke or not, while bespoke boards take their own days', () => {
    const state = newGame();
    expect(deliveryDay(state, true, 'glass')).toBe(2);
    expect(deliveryDay(state, false, 'glass')).toBe(2);
    expect(deliveryDay(state, true, 'boards')).toBe(4);
  });

  it('raises the lorry s card for glass with room as for any load, its unloading as long as its count, to the glass rack', () => {
    const state = stores();
    buyStock(state, 'glass', 7);
    const seen: GameEvent[] = [];
    const morning = nextDay(state, seen);
    const card = cardsOf(morning, seen).find((event) => event.kind === 'deliveryArrived');
    expect(card?.body).toBe('7 glass units have arrived. Nothing can be made until they are inside.');
    expect(card?.choices.map((choice) => choice.id)).toEqual(['unload', 'later']);
    const task = morning.tasks.find((entry) => entry.kind === 'unload' && entry.label === 'Unload 7 glass units');
    if (task === undefined) throw new Error('the unloading is on the list');
    expect(task.minutesTotal).toBe(unloadMinutes(morning, 7));
    expect(unloadFarStation(morning, task)).toBe(STATION_GLASS_RACK);
  });

  it('fetches every kind from the paid store at the one chore of the morning, its label naming the three', () => {
    const state = stores();
    state.stock.tempStorageSheets = 12;
    state.stock.tempStorageBoards = 30;
    state.stock.tempStorageGlass = 5;
    const morning = nextDay(state);
    expect(morning.tasks.filter((task) => task.kind === 'fetchStorage' && !task.done).map((task) => task.label)).toEqual([
      'Fetch 12 sheets, 30 boards and 5 glass units from storage',
    ]);
    const done = doTask(morning, 'fetchStorage');
    expect([done.stock.sheets, done.stock.boards, done.stock.glass]).toEqual([12, 30, 5]);
    expect([done.stock.tempStorageSheets, done.stock.tempStorageBoards, done.stock.tempStorageGlass]).toEqual([0, 0, 0]);
  });

  it('keeps a load of sheets with no rack at the gate with the sheets card of today', () => {
    let state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    state.equipment = state.equipment.filter((item) => item.specId !== 'sheetRack');
    state.cash = 200000;
    buyStock(state, 'sheets', 10);
    const seen: GameEvent[] = [];
    state = nextDay(state, seen);
    const card = cardsOf(state, seen).find((event) => event.kind === 'deliveryArrived');
    expect(card?.body).toBe('10 sheets have arrived and there is no shelving to put them on. Buy some from the catalogue.');
    expect(card?.choices.map((choice) => choice.id)).toEqual(['later']);
  });

  it('keeps a load of glass with no glass rack at the gate whoever unloads, and lets it in once a rack stands', () => {
    let state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    state.cash = 200000;
    state.workers.push({ ...testJoiner('w-lab', 'Gus'), role: 'helper', tier: null, rate: 0 });
    buyStock(state, 'glass', 7);
    const load = state.deliveries[0];
    if (load === undefined) throw new Error('the glass is ordered');
    const seen: GameEvent[] = [];
    state = nextDay(state, seen);
    const card = cardsOf(state, seen).find((event) => event.kind === 'deliveryArrived');
    expect(card?.body).toBe('7 glass units have arrived and there is no glass rack to put them on. Buy one from the catalogue.');
    const task = state.tasks.find((entry) => entry.deliveryId === load.id && !entry.done);
    if (task === undefined) throw new Error('the unloading is on the list');
    expect(startTaskCheck(state, task.id).reason).toBe('Nowhere to put it');
    expect(unloadFarStation(state, task)).toBe(STATION_GATE);
    const later = nextDay(state);
    expect(later.deliveries.find((entry) => entry.id === load.id)).toMatchObject({ arrived: true, unloaded: false });
    expect(later.stock.glass).toBe(0);
    placeGlassRack(later);
    expect(canUnload(later, later.deliveries.find((entry) => entry.id === load.id))).toBe(true);
  });
});
