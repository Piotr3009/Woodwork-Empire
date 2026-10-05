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
// what they do]. Boards are kept on a timber store and never on a sheet rack, one counter read two
// ways, a load of boards in whole or not at all and never silent, and the board asking for a store
// (CLAUDE.md T29 2.11, section 7).

import { describe, expect, it } from 'vitest';
import type { Delivery, GameState, Job, Worker } from '../../src/engine/index';
import { lockReasonFor, template } from '../../src/engine/catalog';
import { canAccept, kitBlockFor } from '../../src/engine/board';
import { cancelOrder, canBuy, canSell, placeEquipmentOrder } from '../../src/engine/game';
import { dropJob } from '../../src/engine/jobs';
import { canPlace } from '../../src/engine/layout';
import { boardRoom, boardsHeld, findSpec, isHeavy, sheetsOnCounter } from '../../src/engine/machines';
import {
  arriveDeliveries,
  boardsOnStore,
  canUnload,
  drawSheetsFor,
  orderForJob,
  sheetsOnRack,
  stockLines,
  unloadIntoStock,
} from '../../src/engine/materials';
import { shoppingList } from '../../src/engine/orders';
import { startTaskCheck } from '../../src/engine/tasks';
import { WARNING_ORDER, warnings } from '../../src/engine/warnings';
import { renderBoard } from '../../src/ui/board';
import { renderMaterials } from '../../src/ui/materials';
import { renderHall } from '../../src/render/hall';
import type { GameEvent } from '../../src/engine/index';
import { act, acceptNow, buyNow, buyStartingKit, fillRack, newGame, nextDay, placeEnquiry, placeEquipment, testJoiner } from '../helpers';

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

/** Its boards ordered and standing at the gate this morning. */
function boardsAtTheGate(state: GameState, job: Job): Delivery {
  state.deliveries = state.deliveries.filter((delivery) => delivery.jobId !== job.id);
  state.tasks = state.tasks.filter((task) => task.kind !== 'unload' || task.jobId !== job.id);
  const delivery = orderForJob(state, job);
  if (delivery === null) throw new Error('the boards are ordered');
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
  it('are the table s two families, a rack on the floor and a shelter on the apron', () => {
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
      width: 3,
      depth: 6,
      height: 3,
      boardCapacity: 400,
      sheetCapacity: 0,
    });
    expect(isHeavy('timberRack', 'standard')).toBe(false);
    expect(isHeavy('timberShelter', 'standard')).toBe(false);
  });

  it('stands the shelter on the apron, refuses one with no room there, and never drags its outline in', () => {
    const state = windowHall('none');
    expect(placeEquipmentOrder(state, 'timberShelter').ok).toBe(true);
    const order = state.onOrder.find((item) => item.specId === 'timberShelter');
    expect(order).toMatchObject({ anchorX: state.unit.widthCells, anchorY: 1 });
    if (order === undefined) throw new Error('the shelter is on order');
    expect(canPlace(state, order.id, 10, 8)).toEqual({ ok: false, reason: 'It stands in the yard' });
    // A second has no six metres of apron left beside the van, the first held for it on order or
    // standing.
    expect(canBuy(state, 'timberShelter')).toEqual({ ok: false, reason: 'No room on the apron' });
    const landed = buyNow(windowHall('shelter'), 'timberShelter');
    expect(landed.equipment.filter((item) => item.specId === 'timberShelter')).toHaveLength(1);
    expect(canBuy(landed, 'timberShelter')).toEqual({ ok: false, reason: 'No room on the apron' });
    // And it is bought in the 200 m2 unit, as the rack and the robot are.
    expect(state.unit.areaM2).toBe(200);
  });
});

describe('a load of boards, whole or not at all (CLAUDE.md T29 2.11.2)', () => {
  it('is refused with no timber store, says so whoever unloads, and is never silent', () => {
    const { state, job } = sash(withLabourer(windowHall('none')));
    const delivery = boardsAtTheGate(state, job);
    expect(delivery.boards).toBe(true);
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
    expect(WARNING_ORDER.indexOf('boardsAtTheGate')).toBe(WARNING_ORDER.indexOf('glassNotOrdered') + 1);
    expect(warnings(state).find((entry) => entry.key === 'boardsAtTheGate')?.text).toBe(
      'Boards at the gate, no timber store: Sash windows',
    );
    expect(renderHall(state)).toContain('Delivery: 19 boards');
    expect(shoppingList(state).find((line) => line.id === delivery.id)?.name).toBe('19 boards');
  });

  it('raises its card at the morning it comes, with a labourer on duty, and the Low stock card counts sheets', () => {
    const { state, job } = sash(withLabourer(windowHall('none')));
    // Another window's boards came in on v83, onto the sheet rack, and are held by it; three
    // sheets of MFC are left.
    const other = sash(state, 9000);
    other.job.sheetsReserved = other.job.sheets;
    other.state.stock.sheets = 3 + other.job.sheets;
    other.state.deliveries = [];
    const ordered = other.state.jobs.find((entry) => entry.id === job.id);
    if (ordered === undefined) throw new Error('the window is wanted');
    expect(orderForJob(other.state, ordered)?.boards).toBe(true);
    const events: GameEvent[] = [];
    nextDay(other.state, events);
    const card = events.find((event) => event.kind === 'deliveryArrived');
    expect(card?.body).toBe('19 boards have arrived and there is no timber store to put them on. Buy one from the catalogue.');
    const low = events.find((event) => event.kind === 'lowStock');
    expect(low?.body.startsWith('3 sheets left of')).toBe(true);
  });

  it('goes onto a timber rack whole, and the sheet racks count sheets only', () => {
    const { state, job } = sash(windowHall('rack'));
    const sheetsBefore = sheetsOnCounter(state);
    const delivery = boardsAtTheGate(state, job);
    expect(canUnload(state, delivery)).toBe(true);
    const card = act(state, { type: 'ASK_UNLOAD', deliveryId: delivery.id });
    expect((card.activeEvent ?? card.eventQueue[0])?.body).toBe('19 boards have arrived. Nothing can be made until they are inside.');
    delivery.unloaded = true;
    unloadIntoStock(state, delivery);
    expect(boardsHeld(state)).toBe(19);
    expect(state.stock.tempStorageSheets).toBe(0);
    expect(sheetsOnCounter(state)).toBe(sheetsBefore);
    const rack = state.equipment.find((item) => item.specId === 'timberRack');
    const sheetRack = state.equipment.find((item) => item.specId === 'sheetRack');
    if (rack === undefined || sheetRack === undefined) throw new Error('both racks are wanted');
    expect(boardsOnStore(state, rack)).toBe(19);
    expect(sheetsOnRack(state, sheetRack)).toBe(sheetsBefore);
    expect(stockLines(state)[0]?.total).toBe(sheetsBefore);
    const page = renderMaterials(state, '');
    expect(page).toContain('Timber boards');
    expect(page).toContain('Held 19');
    expect(page).toContain('Room 21');
    // A store with boards on it is not sold, in the rack's own words.
    expect(canSell(state, rack.id)).toEqual({ ok: false, reason: 'Empty it first, 19 boards on it' });
  });

  it('waits at the gate for room on the stores, and comes in whole once a job has drawn its boards', () => {
    const first = sash(windowHall('rack'), 14000);
    const load = boardsAtTheGate(first.state, first.job);
    load.unloaded = true;
    unloadIntoStock(first.state, load);
    // A second window of 24 boards: the rack holds 40 and 19 are on it, so there is room for 21.
    const second = sash(withLabourer(first.state), 18000);
    expect(second.job.sheets).toBe(24);
    const waiting = boardsAtTheGate(second.state, second.job);
    expect(canUnload(second.state, waiting)).toBe(false);
    expect(startTaskCheck(second.state, unloadTaskOf(second.state, waiting)).reason).toBe('Nowhere to put it');
    const asked = act(second.state, { type: 'ASK_UNLOAD', deliveryId: waiting.id });
    expect((asked.activeEvent ?? asked.eventQueue[0])?.body).toBe(
      '24 boards have arrived and the timber stores have room for 21. They wait at the gate until a job uses its boards or another store is bought.',
    );
    expect(warnings(second.state).find((entry) => entry.key === 'boardsAtTheGate')?.text).toBe(
      'Boards at the gate, no room on the stores: Sash windows',
    );
    // The first window draws three of its boards: room for 24, and the load comes in whole.
    const drawing = second.state.jobs.find((entry) => entry.id === first.job.id);
    if (drawing === undefined) throw new Error('the first window is wanted');
    drawing.sheetsReserved -= 3;
    drawing.sheetsUsed += 3;
    second.state.stock.sheets -= 3;
    expect(canUnload(second.state, waiting)).toBe(true);
    waiting.unloaded = true;
    unloadIntoStock(second.state, waiting);
    expect(boardsHeld(second.state)).toBe(16 + 24);
    expect(second.state.stock.tempStorageSheets).toBe(0);
  });

  it('leaves no board and no load behind a window that is dropped', () => {
    const { state, job } = sash(windowHall('none'));
    const delivery = boardsAtTheGate(state, job);
    const counter = state.stock.sheets;
    expect(dropJob(state, job.id)).toBe(true);
    expect(state.deliveries.some((entry) => entry.id === delivery.id)).toBe(false);
    expect(state.tasks.some((entry) => entry.deliveryId === delivery.id)).toBe(false);
    expect(state.stock.sheets).toBe(counter);
    // And a window whose boards are in takes them with it.
    const held = sash(windowHall('rack'));
    const load = boardsAtTheGate(held.state, held.job);
    load.unloaded = true;
    unloadIntoStock(held.state, load);
    const before = held.state.stock.sheets;
    expect(dropJob(held.state, held.job.id)).toBe(true);
    expect(held.state.stock.sheets).toBe(before - 19);
    expect(boardsHeld(held.state)).toBe(0);
  });

  it('says boards in the ledger when an order of them is called off', () => {
    const { state, job } = sash(windowHall('rack'));
    const delivery = orderForJob(state, job);
    if (delivery === null) throw new Error('the boards are ordered');
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

  it('will not take a window whose boards are more than the stores hold, and says so in red', () => {
    const state = windowHall('rack');
    expect(boardRoom(state)).toBe(40);
    const big = placeEnquiry(state, {
      templateId: 'sashWindows',
      name: 'Sash windows',
      price: 86500,
      basePrice: 86500,
      finish: 'lacquer',
      materialKind: 'solidWood',
      deadlineDays: 90,
    });
    expect(canAccept(state, big)).toEqual({ ok: false, reason: '113 boards, and the timber stores hold 40' });
    const tile = document.createElement('div');
    tile.innerHTML = renderBoard(state, '');
    const line = tile.querySelector(`[data-enquiry="${big.id}"] [data-stores="short"] .bad`);
    expect(line?.textContent).toBe('113 boards, and the timber stores hold 40');
    expect(tile.querySelector(`[data-enquiry="${big.id}"] [data-do="acceptEnquiry"]`)).toBeNull();
    // With the shelter's four hundred it is taken.
    const roomy = windowHall('shelter');
    const same = placeEnquiry(roomy, { ...big, id: 'enq-roomy' });
    expect(canAccept(roomy, same).ok).toBe(true);
  });
});

describe('a save made before the stores (CLAUDE.md T29 2.11.4)', () => {
  it('finishes a window whose boards are in without a store, and counts each kind on its own', () => {
    const { state, job } = sash(windowHall('none'));
    // The boards came in on v83, onto the sheet rack, and the job holds them.
    state.stock.sheets += 19;
    job.sheetsReserved = 19;
    job.stage = 'inProduction';
    expect(boardsHeld(state)).toBe(19);
    const sheetRack = state.equipment.find((item) => item.specId === 'sheetRack');
    if (sheetRack === undefined) throw new Error('the rack is wanted');
    expect(sheetsOnRack(state, sheetRack)).toBe(sheetsOnCounter(state));
    // The Low stock card and the contract man's mark count sheets only.
    expect(sheetsOnCounter(state)).toBe(state.stock.sheets - 19);
    // Nothing asks it for a store: it draws its boards off the counter to its last one.
    expect(drawSheetsFor(state, job, 1)).toBe(true);
    expect(job.sheetsUsed).toBe(19);
    expect(boardsHeld(state)).toBe(0);
  });
});
