import { describe, expect, it } from 'vitest';
import {
  BESPOKE_COST_UPLIFT,
  MATERIAL_FRACTION,
  SHEET_PRICE_STOCK,
  SHEET_VALUE,
  STOCK_MATERIAL_FRACTION,
  TEMP_STORAGE_COST,
  TEMP_STORAGE_FETCH_MINUTES,
} from '../../src/engine/constants';
import {
  deliveryDay,
  materialCostFor,
  rackCapacity,
  sheetsDueFor,
  sheetsForCost,
  stockCostFor,
  stockFree,
  stockIsLow,
} from '../../src/engine/materials';
import { canBuy } from '../../src/engine/game';
import { jobProgress, tick } from '../../src/engine/index';
import type { GameEvent, GameState } from '../../src/engine/index';
import {
  act,
  buyNow,
  buyStartingKit,
  choose,
  clearEvents,
  doTask,
  eventsOfKind,
  fillRack,
  firstJob,
  newGame,
  placeEnquiry,
  runToDay,
  softwareNow,
} from '../helpers';

function ready(difficulty: 'easy' | 'veryEasy' = 'easy'): GameState {
  // The budget saw: this file is about the rack, not about what a class of saw does to the bag
  // or to the speed of the bench (CLAUDE.md T3 3.5).
  const state = buyStartingKit(newGame({ difficulty }), { sawVariant: 'budget' });
  state.enquiries = [];
  return state;
}

/** Accepts a job and clears its calls and drawing, ready for the material order. */
function upToMaterial(state: GameState, extra = {}): GameState {
  const enquiry = placeEnquiry(state, { price: 400, deadlineDays: 30, ...extra });
  let next = act(state, { type: 'ACCEPT_ENQUIRY', enquiryId: enquiry.id, byHand: false });
  next = doTask(next, 'design');
  return next;
}

describe('what material costs', () => {
  it('is 0.40 of the price per job and 15% more when it is bespoke', () => {
    expect(materialCostFor(1000, false)).toBe(1000 * MATERIAL_FRACTION);
    expect(materialCostFor(1000, true)).toBe(460);
    expect(BESPOKE_COST_UPLIFT).toBe(0.15);
  });

  it('is 0.34 of the price when the sheets were bought for stock', () => {
    const perJob = materialCostFor(1000, false);
    const sheets = sheetsForCost(perJob);
    expect(stockCostFor(sheets)).toBeCloseTo(1000 * STOCK_MATERIAL_FRACTION, 6);
    expect(SHEET_PRICE_STOCK).toBeLessThan(SHEET_VALUE);
  });

  it('turns a material cost into whole sheets of 200 of value each', () => {
    expect(SHEET_VALUE).toBe(200);
    expect(sheetsForCost(160)).toBe(1);
    expect(sheetsForCost(200)).toBe(1);
    expect(sheetsForCost(201)).toBe(2);
    expect(sheetsForCost(1)).toBe(1);
    // A 10,000 job carries 4,000 of material, which is 20 sheets (CLAUDE.md T2 3.6).
    expect(sheetsForCost(10000 * MATERIAL_FRACTION)).toBe(20);
  });
});

describe('when the lorry comes', () => {
  it('is the next working day for standard material', () => {
    const state = newGame();
    expect(deliveryDay(state, false)).toBe(2);
    const friday = { ...state, clock: { day: 5, minute: 0 } };
    expect(deliveryDay(friday, false)).toBe(8);
  });

  it('is three working days for bespoke material', () => {
    const state = newGame();
    expect(deliveryDay(state, true)).toBe(4);
    const thursday = { ...state, clock: { day: 4, minute: 0 } };
    expect(deliveryDay(thursday, true)).toBe(9);
  });

  it('books the bespoke job three days out and charges the uplift', () => {
    const state = doTask(upToMaterial(ready(), { bespokeMaterial: true }), 'materialOrder');
    expect(firstJob(state).materialCost).toBe(184);
    expect(state.deliveries[0]?.arriveDay).toBe(4);
    expect(state.deliveries[0]?.bespoke).toBe(true);
    const day2 = runToDay(state, 2).state;
    expect(day2.deliveries[0]?.arrived).toBe(false);
    const day4 = runToDay(state, 4).state;
    expect(day4.deliveries[0]?.arrived).toBe(true);
  });
});

describe('buying sheets for stock', () => {
  it('pays the stock price and books a lorry with no job attached', () => {
    const state = ready();
    const before = state.cash;
    const bought = act(state, { type: 'BUY_STOCK', sheets: 5 });
    expect(before - bought.cash).toBeCloseTo(stockCostFor(5), 6);
    expect(bought.deliveries[0]?.jobId).toBeNull();
    expect(bought.deliveries[0]?.sheets).toBe(5);
  });

  it('puts the sheets on the rack once they are unloaded', () => {
    let state = act(ready(), { type: 'BUY_STOCK', sheets: 5 });
    state = clearEvents(runToDay(state, 2).state);
    expect(state.stock.sheets).toBe(0);
    state = doTask(state, 'unload');
    expect(state.stock.sheets).toBe(5);
    expect(rackCapacity(state)).toBe(50);
    expect(stockFree(state)).toBe(45);
  });

  it('lets a job draw from the rack instead of ordering, with no second payment', () => {
    let state = act(ready(), { type: 'BUY_STOCK', sheets: 6 });
    state = clearEvents(runToDay(state, 2).state);
    state = doTask(state, 'unload');
    const before = state.cash;
    // The rack has it, so the job is ready the moment the drawing exists: no order on the desk,
    // nothing to pay (PIOTR, 13.09: the sheets on the rack are what a workshop uses).
    state = upToMaterial(state);
    expect(state.tasks.some((task) => task.kind === 'materialOrder' && !task.done)).toBe(false);
    // The only movement is the client's deposit coming in: nothing went out for material.
    expect(state.cash).toBe(before + firstJob(state).depositPaid);
    // The sheets stay on the rack and come off it as the job is made (CLAUDE.md T2 3.6).
    expect(state.stock.sheets).toBe(6);
    expect(firstJob(state).stage).toBe('ready');
    expect(firstJob(state).materialCost).toBeCloseTo(stockCostFor(1), 6);
    // No lorry, so nothing to unload.
    expect(state.deliveries.filter((delivery) => delivery.jobId !== null)).toHaveLength(0);
  });

  it('falls back to a per job order when the rack is too empty', () => {
    let state = upToMaterial(ready());
    state = act(state, { type: 'SET_MATERIAL_MODE', jobId: firstJob(state).id, mode: 'stock' });
    state = doTask(state, 'materialOrder');
    expect(firstJob(state).stage).toBe('materialOrdered');
    expect(firstJob(state).materialMode).toBe('perJob');
  });
});

describe('a rack that is too small', () => {
  function overflowing(): { state: GameState; events: GameEvent[] } {
    let state = act(ready('veryEasy'), { type: 'BUY_STOCK', sheets: 55 });
    const events: GameEvent[] = [];
    state = clearEvents(runToDay(state, 2).state, events);
    state = doTask(state, 'unload');
    return { state, events };
  }

  it('fills the rack and asks what happens to the rest', () => {
    const { state } = overflowing();
    expect(state.stock.sheets).toBe(50);
    expect(state.activeEvent?.kind).toBe('stockOverflow');
    expect(state.activeEvent?.data.sheets).toBe(5);
    expect(state.activeEvent?.choices.map((choice) => choice.id)).toEqual(['storage', 'outside']);
  });

  it('writes off what was left in the yard, in the morning', () => {
    const { state } = overflowing();
    const left = choose(state, 'outside');
    expect(left.deliveries[0]?.overflowSheets).toBe(5);
    const cashBefore = left.cash;
    const run = runToDay(left, 3);
    expect(run.state.stock.sheets).toBe(50);
    expect(run.state.deliveries[0]?.overflowSheets).toBe(0);
    const writeOff = run.state.ledger.find((entry) => entry.label.includes('written off'));
    expect(writeOff?.unpaid).toBe(true);
    expect(writeOff?.amount).toBeCloseTo(-stockCostFor(5), 6);
    // The cash went when the sheets were bought: the write off moves no money.
    expect(run.state.cash).toBeLessThan(cashBefore);
    expect(
      run.state.ledger
        .filter((entry) => entry.unpaid)
        .every((entry) => entry.category === 'material'),
    ).toBe(true);
  });

  it('pays 150 for storage and loses an hour fetching them back', () => {
    const { state } = overflowing();
    const cashBefore = state.cash;
    let stored = choose(state, 'storage');
    expect(cashBefore - stored.cash).toBe(TEMP_STORAGE_COST);
    expect(stored.stock.tempStorageSheets).toBe(5);
    expect(stored.deliveries[0]?.overflowSheets).toBe(0);
    stored = clearEvents(runToDay(stored, 3).state);
    const fetch = stored.tasks.find((task) => task.kind === 'fetchStorage' && !task.done);
    expect(fetch?.minutesTotal).toBe(TEMP_STORAGE_FETCH_MINUTES);
    const done = doTask(stored, 'fetchStorage');
    expect(done.stock.sheets).toBe(55);
    expect(done.stock.tempStorageSheets).toBe(0);
    expect(done.owner.minutesByCategory.workshop).toBeGreaterThanOrEqual(60);
  });

  it('never asks the question when everything fits', () => {
    let state = act(ready('veryEasy'), { type: 'BUY_STOCK', sheets: 8 });
    const events: GameEvent[] = [];
    state = clearEvents(runToDay(state, 2).state, events);
    state = doTask(state, 'unload');
    expect(eventsOfKind(events, 'stockOverflow')).toHaveLength(0);
    expect(state.stock.sheets).toBe(8);
    expect(state.activeEvent).toBeNull();
  });
});

describe('unloading', () => {
  it('has to happen before anything can be made', () => {
    let state = doTask(upToMaterial(ready()), 'materialOrder');
    state = clearEvents(runToDay(state, 2).state);
    expect(firstJob(state).stage).toBe('materialInYard');
    const tried = act(state, { type: 'WORK_HERE', jobId: null });
    expect(firstJob(tried).stage).toBe('materialInYard');
    const idle = tick(tried, 100);
    expect(firstJob(idle).labourRemaining).toBe(160);
    const unloaded = doTask(state, 'unload');
    expect(firstJob(unloaded).stage).toBe('ready');
    const working = tick(act(unloaded, { type: 'WORK_HERE', jobId: null }), 100);
    expect(firstJob(working).labourRemaining).toBeLessThan(160);
  });
});

describe('what stock cannot cover', () => {
  it('never gives solid wood or bespoke material off the sheet rack', () => {
    let state = act(ready('veryEasy'), { type: 'BUY_STOCK', sheets: 20 });
    state = clearEvents(runToDay(state, 2).state);
    state = doTask(state, 'unload');
    expect(state.stock.sheets).toBe(20);
    state.reputation = 10;
    const table = placeEnquiry(state, {
      templateId: 'oakDiningTable',
      name: 'Oak dining table',
      price: 1200,
      sizeMultiplier: 0.5,
      materialKind: 'solidWood',
      deadlineDays: 60,
      byHandAvailable: true,
      lockReason: 'Needs solid wood tools',
    });
    state = act(state, { type: 'ACCEPT_ENQUIRY', enquiryId: table.id, byHand: true });
    state = doTask(state, 'design');
    state = act(state, { type: 'SET_MATERIAL_MODE', jobId: firstJob(state).id, mode: 'stock' });
    state = doTask(state, 'materialOrder');
    // Solid wood is ordered, not taken off the board rack.
    expect(firstJob(state).stage).toBe('materialOrdered');
    expect(state.stock.sheets).toBe(20);
  });

  it('charges material against the overdraft floor and books it as arrears when there is no room', () => {
    let state = upToMaterial(ready());
    state.cash = state.finance.overdraftLimit + 10;
    state = doTask(state, 'materialOrder');
    expect(state.cash).toBeGreaterThanOrEqual(state.finance.overdraftLimit);
    expect(state.finance.arrearsAmount).toBeGreaterThan(0);
    const unpaid = state.ledger.filter((entry) => entry.unpaid && entry.category === 'material');
    expect(unpaid).toHaveLength(1);
  });

  it('puts the write off through the ledger like every other line', () => {
    let state = act(ready('veryEasy'), { type: 'BUY_STOCK', sheets: 55 });
    state = clearEvents(runToDay(state, 2).state);
    state = doTask(state, 'unload');
    state = choose(state, 'outside');
    const run = runToDay(state, 3);
    const writeOff = run.state.ledger.find((entry) => entry.label.includes('written off'));
    expect(writeOff).toBeDefined();
    expect(writeOff?.balance).toBeGreaterThan(0);
    expect(run.state.ledger.length).toBeLessThanOrEqual(200);
  });
});

describe('the van at the gate', () => {
  it('asks again who unloads it when it is clicked (CLAUDE.md 10.1)', () => {
    let state = doTask(upToMaterial(ready()), 'materialOrder');
    state = clearEvents(runToDay(state, 2).state);
    const delivery = state.deliveries[0];
    expect(delivery?.arrived).toBe(true);
    expect(state.activeEvent).toBeNull();
    state = act(state, { type: 'ASK_UNLOAD', deliveryId: delivery?.id ?? '' });
    expect(state.activeEvent?.kind).toBe('deliveryArrived');
    expect(state.activeEvent?.choices.map((choice) => choice.id)).toEqual(['unload', 'later']);
    state = choose(state, 'unload');
    expect(state.owner.currentTaskId).not.toBeNull();
  });

  it('says nothing when there is nothing at the gate', () => {
    const state = act(ready(), { type: 'ASK_UNLOAD', deliveryId: 'nothing' });
    expect(state.activeEvent).toBeNull();
  });
});

describe('the rack the sheets live on', () => {
  it('is bought from the catalogue and nothing can be unloaded without it', () => {
    const bare = newGame();
    expect(rackCapacity(bare)).toBe(0);
    expect(canBuy(bare, 'sheetRack').ok).toBe(true);
    // The classes of the one rack family, in Piotr's table (CLAUDE.md T7 3.6).
    const used = buyNow(bare, 'sheetRack');
    expect(rackCapacity(used)).toBe(30);
    // A second rack is a second rack: what the hall holds is what the two of them hold.
    const two = buyNow(used, 'sheetRack', 'standard');
    expect(rackCapacity(two)).toBe(30 + 75);
    const big = buyNow(bare, 'sheetRack', 'industrial');
    expect(rackCapacity(big)).toBe(160);
  });

  it('leaves a delivery at the gate while there is nowhere to put it', () => {
    let state = newGame();
    state.enquiries = [];
    // Everything but the shelving, so the job can be taken and ordered.
    for (const specId of ['desk', 'laptop', 'tableSaw', 'drill', 'edgebander', 'extractor']) {
      state = buyNow(state, specId);
    }
    state = softwareNow(state, 'oneOff');
    state = doTask(upToMaterial(state), 'materialOrder');
    state = clearEvents(runToDay(state, 2).state);
    const task = state.tasks.find((entry) => entry.kind === 'unload' && !entry.done);
    expect(task).toBeDefined();
    const tried = act(state, { type: 'START_TASK', taskId: task?.id ?? '' });
    expect(tried.owner.currentTaskId).toBeNull();
    // Buy the shelving and the same task goes through.
    const withRack = buyNow(state, 'sheetRack');
    const started = act(withRack, { type: 'START_TASK', taskId: task?.id ?? '' });
    expect(started.owner.currentTaskId).toBe(task?.id);
  });
});

describe('material coming off the rack as the job is made', () => {
  function onTheBench(price: number): GameState {
    let state = ready('veryEasy');
    const enquiry = placeEnquiry(state, { price, deadlineDays: 90 });
    state = fillRack(act(state, { type: 'ACCEPT_ENQUIRY', enquiryId: enquiry.id, byHand: false }));
    firstJob(state).stage = 'ready';
    return act(state, { type: 'WORK_HERE', jobId: null });
  }

  it('draws whole sheets pro rata to the labour, so half made is half the sheets', () => {
    // A 10,000 job carries 4,000 of material: 20 sheets.
    const state = onTheBench(10000);
    expect(firstJob(state).sheets).toBe(20);
    expect(sheetsDueFor(firstJob(state), 0)).toBe(1);
    expect(sheetsDueFor(firstJob(state), 0.5)).toBe(10);
    expect(sheetsDueFor(firstJob(state), 1)).toBe(20);
    // Half made: the rack has given up half the sheets and no more.
    const halfWay = { ...state, jobs: state.jobs.map((job) => ({ ...job })) };
    const first = halfWay.jobs[0];
    if (first) first.labourRemaining = first.labourValue / 2;
    expect(jobProgress(firstJob(halfWay))).toBe(0.5);
    const half = tick(halfWay, 1);
    expect(firstJob(half).sheetsUsed).toBe(10);
    expect(half.stock.sheets).toBe(20 - 10);
  });

  it('stops the job where it stands when the rack cannot cover the next slice', () => {
    const state = onTheBench(10000);
    state.stock.sheets = 2;
    // Days of it: the rack runs dry long before the job does, and the day keeps asking him
    // questions on the way, all of which are answered with the first choice.
    let stalled = state;
    for (let guard = 0; guard < 300 && firstJob(stalled).blockedBy === ''; guard += 1) {
      stalled = clearEvents(tick(stalled, 30));
    }
    const job = firstJob(stalled);
    expect(job.blockedBy).toBe('waiting for material');
    expect(stalled.stock.sheets).toBe(0);
    expect(job.sheetsUsed).toBe(2);
    expect(jobProgress(job)).toBeLessThan(0.2);
  });

  it('says so once a day and no more, and the wages run anyway', () => {
    const state = onTheBench(10000);
    state.stock.sheets = 0;
    const events: GameEvent[] = [];
    const day = clearEvents(tick(state, 400), events);
    expect(eventsOfKind(events, 'noMaterial')).toHaveLength(1);
    const more = clearEvents(tick(day, 400), events);
    expect(eventsOfKind(events, 'noMaterial')).toHaveLength(1);
    // A new day, a new reminder.
    const tomorrow = runToDay(more, 3);
    expect(eventsOfKind(tomorrow.events, 'noMaterial').length).toBeGreaterThanOrEqual(1);
  });
});

describe('the low stock alarm', () => {
  it('reads under a tenth of the rack as low', () => {
    const state = ready();
    expect(rackCapacity(state)).toBe(50);
    state.stock.sheets = 4;
    expect(stockIsLow(state)).toBe(true);
    state.stock.sheets = 5;
    expect(stockIsLow(state)).toBe(false);
    // No shelving, no alarm: the hall says there is no shelving instead.
    const bare = newGame();
    expect(stockIsLow(bare)).toBe(false);
  });

  it('says it once a week in the morning, with work on the books', () => {
    let state = ready();
    const enquiry = placeEnquiry(state, { price: 400, deadlineDays: 90 });
    state = act(state, { type: 'ACCEPT_ENQUIRY', enquiryId: enquiry.id, byHand: false });
    state.stock.sheets = 0;
    const week = runToDay(state, 5);
    expect(eventsOfKind(week.events, 'lowStock')).toHaveLength(1);
    const fortnight = runToDay(state, 12);
    expect(eventsOfKind(fortnight.events, 'lowStock')).toHaveLength(2);
  });
});
