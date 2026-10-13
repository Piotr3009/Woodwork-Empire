/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// @vitest-environment jsdom
// Turn 29, 2.11: the timber stores [PIOTR, 05.10: sent with "you have it in the zip"; TUNE: chat:
// what they do]. Boards are kept on a timber store and never on a sheet rack, and the board asks for
// a store (CLAUDE.md T29 2.11, section 7). Flipped in v96: the boards have a counter of their own, and
// a load of them comes in as a load of sheets does, what does not fit going to the paid store; the
// whole load rule, its strip line and the board's refusal of a window bigger than the stores are
// gone (CLAUDE.md T32 2.2, 2.6, 2.8).

import { describe, expect, it } from 'vitest';
import type { Delivery, GameState, Job, Worker } from '../../src/engine/index';
import { lockReasonFor, template } from '../../src/engine/catalog';
import { canAccept, kitBlockFor } from '../../src/engine/board';
import { cancelOrder, canBuy, canSell, placeEquipmentOrder } from '../../src/engine/game';
import { dropJob } from '../../src/engine/jobs';
import { canPlace } from '../../src/engine/layout';
import { findSpec, isHeavy, roomFor } from '../../src/engine/machines';
import {
  arriveDeliveries,
  canUnload,
  drawSheetsFor,
  fetchFromStorage,
  freeFor,
  orderForJob,
  stockLines,
  unloadIntoStock,
  stockOnItem,
} from '../../src/engine/materials';
import { TEMP_STORAGE_COST } from '../../src/engine/constants';
import { shoppingList } from '../../src/engine/orders';
import { startTaskCheck } from '../../src/engine/tasks';
import { warnings } from '../../src/engine/warnings';
import { renderBoard } from '../../src/ui/board';
import { renderMaterials } from '../../src/ui/materials';
import { renderHall } from '../../src/render/hall';
import type { GameEvent } from '../../src/engine/index';
import { act, acceptNow, buyNow, buyStartingKit, fillRack, newGame, nextDay, placeEnquiry, placeEquipment, placeGlassRack, testJoiner } from '../helpers';

/** The day one hall with every machine a window wants, its cutters, sheets on the rack, and the
 *  timber store named, or none. */
function windowHall(store: 'none' | 'rack' | 'shelter' = 'rack'): GameState {
  let state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 20);
  state.cash = 1000000;
  state.reputation = 40;
  const kit: Array<[string, number, number]> = [
    ['crossCut', 2, 9],
    ['planer', 7, 9],
    ['spindleMoulder', 12, 9],
    ['sander', 16, 6],
    ['framePress', 2, 6],
    ['sprayBooth', 7, 5],
    ['cuttersSash', 0, 0],
    ['cuttersCasement', 0, 0],
    ['cuttersDoor', 0, 0],
  ];
  for (const [id, x, y] of kit) placeEquipment(state, id, { variantId: 'standard', x, y, id: `kit-${id}` });
  // And a glass rack, which a window asks for from Turn 32 (CLAUDE.md T32 2.1).
  placeGlassRack(state);
  if (store === 'rack') state = buyNow(state, 'timberRack');
  if (store === 'shelter') state = buyNow(state, 'timberShelter');
  state.cash = 1000000;
  return state;
}

function withLabourer(state: GameState): GameState {
  const labourer: Worker = { ...testJoiner('w-lab', 'Gus'), role: 'helper', tier: null, rate: 0 };
  state.workers.push(labourer);
  return state;
}

/** A sash window of 19 boards taken, its paperwork done. */
function sash(state: GameState, price = 14000): { state: GameState; job: Job } {
  const enquiry = placeEnquiry(state, {
    templateId: 'sashWindows',
    name: 'Sash windows',
    price,
    finish: 'lacquer',
    materialKind: 'solidWood',
    deadlineDays: 60,
  });
  const before = new Set(state.jobs.map((entry) => entry.id));
  const next = acceptNow(state, enquiry.id);
  const job = next.jobs.find((entry) => !before.has(entry.id));
  if (job === undefined) throw new Error('the window is wanted');
  return { state: next, job };
}

/** Its boards ordered and standing at the gate this morning (its glass, ordered with them from v96,
 *  on the road for tomorrow's open). */
function boardsAtTheGate(state: GameState, job: Job): Delivery {
  state.deliveries = state.deliveries.filter((delivery) => delivery.jobId !== job.id);
  state.tasks = state.tasks.filter((task) => task.kind !== 'unload' || task.jobId !== job.id);
  const delivery = orderForJob(state, job).find((entry) => entry.material === 'boards');
  if (delivery === undefined) throw new Error('the boards are ordered');
  delivery.arriveDay = state.clock.day;
  arriveDeliveries(state);
  return delivery;
}

function unloadTaskOf(state: GameState, delivery: Delivery): string {
  const task = state.tasks.find((entry) => entry.deliveryId === delivery.id && !entry.done);
  if (task === undefined) throw new Error('the unloading is on the list');
  return task.id;
}

describe('the two timber stores (CLAUDE.md T29 2.11.1)', () => {
  it('are the table s two families, a rack on the floor and a shelter behind the rear wall', () => {
    expect(findSpec('timberRack')).toMatchObject({
      name: 'Timber rack',
      folder: 'Timber racks',
      tab: 'storage',
      category: 'storage',
      price: 1200,
      deliveryDays: 3,
      width: 4,
      depth: 1,
      height: 2.5,
      zoneWidth: 4,
      zoneDepth: 2,
      boardCapacity: 40,
      sheetCapacity: 0,
    });
    expect(findSpec('timberShelter')).toMatchObject({
      name: 'Timber shelter',
      folder: 'Timber shelters',
      price: 18000,
      deliveryDays: 15,
      // 6 m along the wall by 3 m deep from Turn 31 (CLAUDE.md T31 2.8).
      width: 6,
      depth: 3,
      height: 3,
      boardCapacity: 400,
      sheetCapacity: 0,
    });
    expect(isHeavy('timberRack', 'standard')).toBe(false);
    expect(isHeavy('timberShelter', 'standard')).toBe(false);
  });

  it('stands the shelter behind the rear wall with the plant, refuses one with no room there, and never drags its outline in', () => {
    // From Turn 31 it stands where the extractors are, its 3 m depth a metre behind the wall, and
    // never on the apron, where the van stands alone (PIOTR, 11.10; CLAUDE.md T31 2.8).
    const state = windowHall('none');
    expect(placeEquipmentOrder(state, 'timberShelter').ok).toBe(true);
    const order = state.onOrder.find((item) => item.specId === 'timberShelter');
    expect(order).toMatchObject({ anchorY: -4 });
    if (order === undefined) throw new Error('the shelter is on order');
    expect(order.anchorX + 6).toBeLessThanOrEqual(state.unit.widthCells);
    expect(canPlace(state, order.id, 10, 8)).toEqual({ ok: false, reason: 'It stands in the yard' });
    // More are stood along the wall while it has length for them, the first held for it on order;
    // then the wall is full.
    for (let more = 0; more < 6 && canBuy(state, 'timberShelter').ok; more += 1) {
      expect(placeEquipmentOrder(state, 'timberShelter').ok).toBe(true);
    }
    expect(canBuy(state, 'timberShelter')).toEqual({ ok: false, reason: 'No room behind the hall' });
    expect(state.onOrder.filter((item) => item.specId === 'timberShelter').every((item) => item.anchorY === -4)).toBe(true);
    // And it is bought in the 200 m2 unit, as the rack and the robot are.
    expect(state.unit.areaM2).toBe(200);
  });
});

describe('a load of boards, as a load of sheets (CLAUDE.md T29 2.11.2, T32 2.6)', () => {
  it('is refused with no timber store, says so whoever unloads, and is never silent', () => {
    const { state, job } = sash(withLabourer(windowHall('none')));
    const delivery = boardsAtTheGate(state, job);
    expect(delivery.material).toBe('boards');
    expect(delivery.sheets).toBe(19);
    expect(canUnload(state, delivery)).toBe(false);
    // The sheet racks have room, and still the boards do not go on them.
    expect(canUnload(state)).toBe(true);
    const task = unloadTaskOf(state, delivery);
    expect(state.tasks.find((entry) => entry.id === task)?.label).toBe('Unload 19 boards');
    expect(startTaskCheck(state, task).reason).toBe('Nowhere to put it');
    const asked = act(state, { type: 'ASK_UNLOAD', deliveryId: delivery.id });
    const card = asked.activeEvent ?? asked.eventQueue[0];
    expect(card?.body).toBe('19 boards have arrived and there is no timber store to put them on. Buy one from the catalogue.');
    expect(card?.choices).toEqual([{ id: 'later', label: 'Leave it at the gate' }]);
    // Flipped in v96: the card says it, as a load of sheets with no rack is said; the strip's own
    // line of the boards at the gate is gone (CLAUDE.md T32 2.8).
    expect(warnings(state).some((entry) => (entry.key as string) === 'boardsAtTheGate')).toBe(false);
    expect(renderHall(state)).toContain('Delivery: 19 boards');
    expect(shoppingList(state).find((line) => line.id === delivery.id)?.name).toBe('19 boards');
  });

  it('raises its card at the morning it comes, with a labourer on duty, and the Low stock card counts sheets', () => {
    const { state, job } = sash(withLabourer(windowHall('none')));
    // Another window's boards lie on their own counter, held by it (flipped in v96: CLAUDE.md T32
    // 2.2); three sheets of MFC are left.
    const other = sash(state, 9000);
    other.state.stock.boards = other.job.sheets;
    other.job.sheetsReserved = other.job.sheets;
    other.state.stock.sheets = 3;
    other.state.deliveries = [];
    const ordered = other.state.jobs.find((entry) => entry.id === job.id);
    if (ordered === undefined) throw new Error('the window is wanted');
    expect(orderForJob(other.state, ordered).map((delivery) => delivery.material)).toContain('boards');
    const events: GameEvent[] = [];
    nextDay(other.state, events);
    const card = events.find((event) => event.kind === 'deliveryArrived');
    expect(card?.body).toBe('19 boards have arrived and there is no timber store to put them on. Buy one from the catalogue.');
    const low = events.find((event) => event.kind === 'lowStock');
    expect(low?.body.startsWith('3 sheets left of')).toBe(true);
  });

  it('goes onto a timber rack, on the boards own counter, and the sheet racks count sheets only', () => {
    const { state, job } = sash(windowHall('rack'));
    const sheetsBefore = state.stock.sheets;
    const delivery = boardsAtTheGate(state, job);
    expect(canUnload(state, delivery)).toBe(true);
    const card = act(state, { type: 'ASK_UNLOAD', deliveryId: delivery.id });
    expect((card.activeEvent ?? card.eventQueue[0])?.body).toBe('19 boards have arrived. Nothing can be made until they are inside.');
    delivery.unloaded = true;
    unloadIntoStock(state, delivery);
    expect(state.stock.boards).toBe(19);
    expect(state.stock.tempStorageBoards).toBe(0);
    expect(state.stock.sheets).toBe(sheetsBefore);
    const rack = state.equipment.find((item) => item.specId === 'timberRack');
    const sheetRack = state.equipment.find((item) => item.specId === 'sheetRack');
    if (rack === undefined || sheetRack === undefined) throw new Error('both racks are wanted');
    expect(stockOnItem(state, rack)).toBe(19);
    expect(stockOnItem(state, sheetRack)).toBe(sheetsBefore);
    expect(stockLines(state)[0]?.total).toBe(sheetsBefore);
    const page = renderMaterials(state, '');
    expect(page).toContain('Timber boards');
    expect(page).toContain('Reserved 19');
    expect(page).toContain('Total 19 of 40');
    // A store with boards on it is not sold, in the rack's own words.
    expect(canSell(state, rack.id)).toEqual({ ok: false, reason: 'Empty it first, 19 boards on it' });
  });

  it('puts what does not fit on the stores into the paid store, and the morning s fetch brings it back', () => {
    // Flipped in v96: the whole load rule is gone; a load of boards bigger than the stores' free
    // places comes in as a load of sheets bigger than the racks does (CLAUDE.md T32 2.6, 2.8).
    const first = sash(windowHall('rack'), 14000);
    const load = boardsAtTheGate(first.state, first.job);
    load.unloaded = true;
    unloadIntoStock(first.state, load);
    // A second window of 24 boards: the rack holds 40 and 19 are on it, so there is room for 21.
    const second = sash(first.state, 18000);
    expect(second.job.sheets).toBe(24);
    const waiting = boardsAtTheGate(second.state, second.job);
    expect(canUnload(second.state, waiting)).toBe(true);
    expect(startTaskCheck(second.state, unloadTaskOf(second.state, waiting)).ok).toBe(true);
    const asked = act(second.state, { type: 'ASK_UNLOAD', deliveryId: waiting.id });
    expect((asked.activeEvent ?? asked.eventQueue[0])?.body).toBe('24 boards have arrived. Nothing can be made until they are inside.');
    const cash = second.state.cash;
    waiting.unloaded = true;
    unloadIntoStock(second.state, waiting);
    expect([second.state.stock.boards, second.state.stock.tempStorageBoards]).toEqual([40, 3]);
    expect(second.state.cash).toBe(cash - TEMP_STORAGE_COST);
    expect(second.state.ledger.some((entry) => entry.label === 'Temporary storage for 3 boards')).toBe(true);
    // Its own load is its own whether it fits or not, as a sheet job's is (CLAUDE.md T20 2.16): all
    // 24 held, 21 on the stores and 3 in the paid store for it.
    expect(second.state.jobs.find((entry) => entry.id === second.job.id)?.sheetsReserved).toBe(24);
    fetchFromStorage(second.state);
    expect([second.state.stock.boards, second.state.stock.tempStorageBoards]).toEqual([43, 0]);
    expect(second.state.jobs.find((entry) => entry.id === second.job.id)?.sheetsReserved).toBe(24);
  });

  it('writes off a dropped window s boards ordered in for it, and leaves what it held on the stores, free', () => {
    // Flipped in v96: a window's boards are dealt with as a sheet job's sheets are, on their own
    // counter; the Turn 29 branch that took them off the counter and called the load off is gone
    // (CLAUDE.md T32 2.4).
    const held = sash(windowHall('rack'));
    const load = boardsAtTheGate(held.state, held.job);
    load.unloaded = true;
    unloadIntoStock(held.state, load);
    expect(held.state.stock.boards).toBe(19);
    expect(freeFor(held.state, 'boards')).toBe(0);
    expect(dropJob(held.state, held.job.id)).toBe(true);
    expect(held.state.stock.boards).toBe(19);
    expect(freeFor(held.state, 'boards')).toBe(19);
    expect(held.state.ledger.some((entry) => entry.label === 'Material written off: Sash windows')).toBe(true);
    // A load still on the road for a dropped window comes in as free stock when it lands.
    const road = sash(windowHall('rack'));
    const onTheRoad = boardsAtTheGate(road.state, road.job);
    expect(dropJob(road.state, road.job.id)).toBe(true);
    onTheRoad.unloaded = true;
    unloadIntoStock(road.state, onTheRoad);
    expect([road.state.stock.boards, freeFor(road.state, 'boards')]).toEqual([19, 19]);
  });

  it('says boards in the ledger when an order of them is called off', () => {
    const { state, job } = sash(windowHall('rack'));
    const delivery = orderForJob(state, job).find((entry) => entry.material === 'boards');
    if (delivery === undefined) throw new Error('the boards are ordered');
    expect(cancelOrder(state, delivery.id).ok).toBe(true);
    expect(state.ledger.some((entry) => entry.label === 'Order cancelled: 19 boards')).toBe(true);
  });
});

describe('the board asks for a store (CLAUDE.md T29 2.11.3)', () => {
  it('locks and greys a window with no store, in the list s own words, and takes it with either', () => {
    const sashEntry = template('sashWindows');
    const none = windowHall('none');
    expect(lockReasonFor(none, sashEntry)).toBe('Needs timber store');
    expect(kitBlockFor(none, sashEntry)).toEqual({ reason: 'no timber store', where: 'catalogue' });
    const noPlaner = windowHall('none');
    noPlaner.equipment = noPlaner.equipment.filter((item) => item.specId !== 'planer');
    expect(lockReasonFor(noPlaner, sashEntry)).toBe('Needs four sided planer, timber store');
    expect(kitBlockFor(noPlaner, sashEntry)).toEqual({ reason: 'no four sided planer, timber store', where: 'catalogue' });
    expect(lockReasonFor(windowHall('rack'), sashEntry)).toBeNull();
    expect(lockReasonFor(windowHall('shelter'), sashEntry)).toBeNull();
  });

  it('takes a window whose boards are more than the stores hold, as a sheet job bigger than the racks', () => {
    // Flipped in v96: the board's refusal of a window the stores could not hold even empty is gone;
    // what does not fit goes to the paid store (CLAUDE.md T32 2.8).
    const state = windowHall('rack');
    expect(roomFor(state, 'boards')).toBe(40);
    const big = placeEnquiry(state, {
      templateId: 'sashWindows',
      name: 'Sash windows',
      price: 86500,
      basePrice: 86500,
      finish: 'lacquer',
      materialKind: 'solidWood',
      deadlineDays: 90,
    });
    expect(canAccept(state, big).ok).toBe(true);
    const tile = document.createElement('div');
    tile.innerHTML = renderBoard(state, '');
    expect(tile.querySelector(`[data-enquiry="${big.id}"] [data-stores]`)).toBeNull();
    expect(tile.querySelector(`[data-enquiry="${big.id}"]`)?.textContent).toContain('113 boards and');
    expect(tile.querySelector(`[data-enquiry="${big.id}"] [data-do="acceptEnquiry"]`)).not.toBeNull();
  });
});

describe('a save made before the stores (CLAUDE.md T29 2.11.4)', () => {
  it('finishes a window whose boards are in without a store, and counts each kind on its own', () => {
    const { state, job } = sash(windowHall('none'));
    // The boards came in on v83, onto the sheet rack, and the job holds them; from v96 the lift has
    // put them on the boards' own counter (CLAUDE.md T32 section 4).
    const sheets = state.stock.sheets;
    state.stock.boards = 19;
    job.sheetsReserved = 19;
    job.stage = 'inProduction';
    const sheetRack = state.equipment.find((item) => item.specId === 'sheetRack');
    if (sheetRack === undefined) throw new Error('the rack is wanted');
    expect(stockOnItem(state, sheetRack)).toBe(sheets);
    // Nothing asks it for a store: it draws its boards off their counter to its last one.
    expect(drawSheetsFor(state, job, 1)).toBe(true);
    expect(job.sheetsUsed).toBe(19);
    expect(state.stock.boards).toBe(0);
    expect(state.stock.sheets).toBe(sheets);
  });
});
