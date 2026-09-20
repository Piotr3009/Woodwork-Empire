import { describe, expect, it } from 'vitest';
import {
  BESPOKE_COST_UPLIFT,
  LOW_STOCK_SHEETS,
  MATERIAL_FRACTION,
  SHEET_PRICE_LADDER,
  SHEET_VALUE,
  TEMP_STORAGE_COST,
  TEMP_STORAGE_FETCH_MINUTES,
} from '../../src/engine/constants';
import { decodeSaveFile, encodeSaveFile } from '../../src/cloud/file';
import {
  canUnload,
  deliveryDay,
  freeSheets,
  materialCostFor,
  orderForJobCost,
  sheetPriceFor,
  rackCapacity,
  reservedSheets,
  restockCheck,
  restockSheets,
  sheetsDueFor,
  sheetsForCost,
  shortfallOf,
  stockCostFor,
  stockFree,
  stockIsLow,
  stockLines,
  stockNumberFor,
} from '../../src/engine/materials';
import { addWorkingDays } from '../../src/engine/clock';
import { canBuy, sellMachine } from '../../src/engine/game';
import { orderForJobCheck } from '../../src/engine/jobs';
import { jobProgress, tick } from '../../src/engine/index';
import type { GameEvent, GameState } from '../../src/engine/index';
import {
  acceptNow,
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

/** Accepts a job and clears its calls and drawing, ready for the material take off. */
function upToMaterial(state: GameState, extra = {}): GameState {
  const enquiry = placeEnquiry(state, { price: 400, deadlineDays: 30, ...extra });
  let next = acceptNow(state, enquiry.id, false);
  next = doTask(next, 'design');
  return next;
}

/** The take off done and the shortfall ordered for the job, the way the player clicks it when
 *  the rack has nothing to hold for it (CLAUDE.md T13 3.3). */
function ordered(state: GameState): GameState {
  const next = doTask(state, 'materialTakeOff');
  return act(next, { type: 'ORDER_FOR_JOB', jobId: firstJob(next).id });
}

describe('what material costs', () => {
  it('is 0.40 of the price per job and 15% more when it is bespoke', () => {
    expect(materialCostFor(1000, false)).toBe(1000 * MATERIAL_FRACTION);
    expect(materialCostFor(1000, true)).toBe(460);
    expect(BESPOKE_COST_UPLIFT).toBe(0.15);
  });

  it('is the ladder s price for the number of sheets on the order', () => {
    const perJob = materialCostFor(1000, false);
    const sheets = sheetsForCost(perJob);
    expect(stockCostFor(sheets)).toBeCloseTo(sheets * sheetPriceFor(sheets), 6);
    // A load big enough to be worth stocking costs less a sheet than a sheet is worth, which is
    // where the margin on holding stock comes from (CLAUDE.md T23 2.16).
    expect(sheetPriceFor(50)).toBeLessThan(SHEET_VALUE);
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
    let state = doTask(upToMaterial(ready(), { bespokeMaterial: true }), 'materialTakeOff');
    expect(firstJob(state).materialCost).toBe(184);
    // Bespoke material never comes off the rack: it is ordered for the job (CLAUDE.md T13 3.3).
    expect(shortfallOf(firstJob(state))).toBe(1);
    expect(orderForJobCost(firstJob(state))).toBe(230);
    state = act(state, { type: 'ORDER_FOR_JOB', jobId: firstJob(state).id });
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
    // The sheets were held for it the moment it was taken (CLAUDE.md T13 3.3); the take off is
    // paperwork and not an order.
    expect(firstJob(state).sheetsReserved).toBe(1);
    expect(shortfallOf(firstJob(state))).toBe(0);
    state = doTask(state, 'materialTakeOff');
    // The only movement is the client's deposit coming in: nothing went out for material.
    expect(state.cash).toBe(before + firstJob(state).depositPaid);
    // The sheets stay on the rack and come off it as the job is made (CLAUDE.md T2 3.6).
    expect(state.stock.sheets).toBe(6);
    expect(firstJob(state).stage).toBe('ready');
    // No lorry, so nothing to unload.
    expect(state.deliveries.filter((delivery) => delivery.jobId !== null)).toHaveLength(0);
  });

  it('is short when the rack is empty, until the shortfall is ordered for the job', () => {
    let state = upToMaterial(ready());
    expect(shortfallOf(firstJob(state))).toBe(1);
    state = doTask(state, 'materialTakeOff');
    expect(firstJob(state).stage).toBe('materialPending');
    const before = state.cash;
    state = act(state, { type: 'ORDER_FOR_JOB', jobId: firstJob(state).id });
    expect(firstJob(state).stage).toBe('materialOrdered');
    expect(before - state.cash).toBe(orderForJobCost(firstJob(state)));
    expect(state.deliveries[0]?.jobId).toBe(firstJob(state).id);
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
    let state = ordered(upToMaterial(ready()));
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
    state = acceptNow(state, table.id, true);
    state = doTask(state, 'design');
    state = doTask(state, 'materialTakeOff');
    // Solid wood is ordered, not taken off the board rack (CLAUDE.md T13 3.3).
    expect(firstJob(state).sheetsReserved).toBe(0);
    expect(firstJob(state).stage).toBe('materialPending');
    state = act(state, { type: 'ORDER_FOR_JOB', jobId: firstJob(state).id });
    expect(firstJob(state).stage).toBe('materialOrdered');
    expect(state.stock.sheets).toBe(20);
  });

  it('refuses an order for the job past the overdraft floor, and the job stays short', () => {
    let state = upToMaterial(ready());
    state.cash = state.finance.overdraftLimit + 10;
    state = doTask(state, 'materialTakeOff');
    const cash = state.cash;
    state = act(state, { type: 'ORDER_FOR_JOB', jobId: firstJob(state).id });
    expect(state.cash).toBe(cash);
    expect(firstJob(state).stage).toBe('materialPending');
    expect(state.deliveries).toHaveLength(0);
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
    let state = ordered(upToMaterial(ready()));
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
    // A rack that is sold stands in the hall until the van comes and it is no room: nothing is
    // unloaded onto a rack that leaves in the morning (CLAUDE.md T20 2.10, landed in T20-C1).
    const sold = sellMachine(used, used.equipment.find((item) => item.specId === 'sheetRack')?.id ?? '');
    expect(sold.ok).toBe(true);
    expect(rackCapacity(used)).toBe(0);
    expect(canUnload(used)).toBe(false);
  });

  it('leaves a delivery at the gate while there is nowhere to put it', () => {
    let state = newGame();
    state.enquiries = [];
    // Everything but the shelving, so the job can be taken and ordered.
    for (const specId of ['desk', 'laptop', 'tableSaw', 'edgebander', 'extractor']) {
      state = buyNow(state, specId);
    }
    state = softwareNow(state, 'oneOff');
    state = ordered(upToMaterial(state));
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
    state = fillRack(acceptNow(state, enquiry.id, false));
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
  it('reads a free count under the low figure as low, whatever the rack holds', () => {
    const state = ready();
    expect(rackCapacity(state)).toBe(50);
    // The figure is the free sheets, not a share of the rack (CLAUDE.md T13 3.2).
    state.stock.sheets = LOW_STOCK_SHEETS - 1;
    expect(stockIsLow(state)).toBe(true);
    state.stock.sheets = LOW_STOCK_SHEETS;
    expect(stockIsLow(state)).toBe(false);
    // Sheets held for a job are not free: the badge reads what a new job could have.
    const enquiry = placeEnquiry(state, { price: 400, deadlineDays: 90 });
    const held = acceptNow(state, enquiry.id, false);
    expect(firstJob(held).sheetsReserved).toBe(1);
    expect(stockIsLow(held)).toBe(true);
    // No shelving, no alarm: the hall says there is no shelving instead.
    const bare = newGame();
    expect(stockIsLow(bare)).toBe(false);
  });

  it('says it once a week in the morning, with work on the books', () => {
    let state = ready();
    const enquiry = placeEnquiry(state, { price: 400, deadlineDays: 90 });
    state = acceptNow(state, enquiry.id, false);
    state.stock.sheets = 0;
    const week = runToDay(state, 5);
    expect(eventsOfKind(week.events, 'lowStock')).toHaveLength(1);
    const fortnight = runToDay(state, 12);
    expect(eventsOfKind(fortnight.events, 'lowStock')).toHaveLength(2);
  });
});

describe('the reservation rule and Restock (CLAUDE.md T13 3.2, 3.3)', () => {
  it('holds the sheets from the free stock the moment a job is taken', () => {
    const state = fillRack(ready(), 10);
    const enquiry = placeEnquiry(state, { price: 400, deadlineDays: 90 });
    const held = acceptNow(state, enquiry.id, false);
    expect(firstJob(held).sheetsReserved).toBe(1);
    expect(shortfallOf(firstJob(held))).toBe(0);
    expect(reservedSheets(held)).toBe(1);
    expect(freeSheets(held)).toBe(9);
    // The total on the rack is what the company board values: nothing left it.
    expect(held.stock.sheets).toBe(10);
    const line = stockLines(held)[0];
    expect(line).toMatchObject({ kind: 'sheet', free: 9, reserved: 1, total: 10, capacity: 50 });
  });

  it('is short by what the rack could not spare, and a restock clears it once it is unloaded', () => {
    // 800 of price is 320 of material: two sheets, and the rack has one.
    const state = fillRack(ready(), 1);
    const enquiry = placeEnquiry(state, { price: 800, deadlineDays: 90 });
    let next = acceptNow(state, enquiry.id, false);
    expect(firstJob(next).sheets).toBe(2);
    expect(firstJob(next).sheetsReserved).toBe(1);
    expect(shortfallOf(firstJob(next))).toBe(1);
    expect(stockIsLow(next)).toBe(true);
    next = act(next, { type: 'RESTOCK' });
    expect(next.deliveries).toHaveLength(1);
    next = clearEvents(runToDay(next, 2).state);
    next = doTask(next, 'unload');
    expect(shortfallOf(firstJob(next))).toBe(0);
    expect(firstJob(next).sheetsReserved).toBe(2);
  });

  it('fills the rack at the stock price when no number is typed, and no more', () => {
    const state = fillRack(ready(), LOW_STOCK_SHEETS - 2);
    expect(stockIsLow(state)).toBe(true);
    const sheets = restockSheets(state);
    // What fills the rack: the free places on it (CLAUDE.md T17 2.20).
    expect(sheets).toBe(stockFree(state));
    expect(restockCheck(state)).toEqual({
      ok: true,
      reason: '',
      sheets,
      cost: sheets * sheetPriceFor(sheets),
    });
    const before = state.cash;
    const bought = act(state, { type: 'RESTOCK' });
    expect(before - bought.cash).toBeCloseTo(sheets * sheetPriceFor(sheets), 6);
    expect(bought.deliveries[0]?.sheets).toBe(sheets);
    expect(bought.deliveries[0]?.jobId).toBeNull();
    expect(bought.ledger[bought.ledger.length - 1]?.category).toBe('material');
    // A second click before the lorry buys nothing: the sheets on the road count as here.
    expect(restockSheets(bought)).toBe(0);
    expect(restockCheck(bought).reason).toContain('on the way');
    const again = act(bought, { type: 'RESTOCK' });
    expect(again.deliveries).toHaveLength(1);
    expect(again.cash).toBe(bought.cash);
  });

  it('buys the number the player typed, capped at the free places on the rack', () => {
    const state = fillRack(ready(), 2);
    // Six sheets asked for, six bought (CLAUDE.md T17 2.20).
    expect(restockSheets(state, 6)).toBe(6);
    const six = act(state, { type: 'RESTOCK', sheets: 6 });
    expect(six.deliveries[0]?.sheets).toBe(6);
    // The material lands the next working day, which is the lead time a standard sheet has.
    expect(six.deliveries[0]?.arriveDay).toBe(addWorkingDays(state.clock.day, 1));
    expect(six.deliveries[0]?.bespoke).toBe(false);
    // More than the rack holds is cut back to what it holds, and never refused outright.
    const room = stockFree(state);
    expect(restockSheets(state, room + 50)).toBe(room);
    expect(restockCheck(state, room + 50).sheets).toBe(room);
  });

  it('does nothing when the rack is full', () => {
    const state = fillRack(ready(), rackCapacity(ready()));
    expect(restockSheets(state)).toBe(0);
    expect(restockCheck(state)).toMatchObject({ ok: false, reason: 'No room on the rack' });
    const same = act(state, { type: 'RESTOCK' });
    expect(same.deliveries).toHaveLength(0);
    expect(same.cash).toBe(state.cash);
  });

  it('never orders more than the rack has room for', () => {
    // A rack of 50 with 48 on it, all held for three big jobs: nothing free, two spaces.
    let state = fillRack(ready('veryEasy'), 48);
    for (let job = 0; job < 3; job += 1) {
      const enquiry = placeEnquiry(state, { price: 10000, deadlineDays: 90 });
      state = acceptNow(state, enquiry.id, false);
    }
    expect(reservedSheets(state)).toBe(48);
    expect(freeSheets(state)).toBe(0);
    expect(stockFree(state)).toBe(2);
    expect(restockSheets(state)).toBe(2);
  });

  it('prices a sheet by the number on the order, and prices a take off the same way', () => {
    // Turn 13 had two prices and nothing between them: 175 for stock and 200 ad hoc, whatever the
    // size of either order. Piotr made it one ladder on 20.09, because a merchant prices a load
    // and not a customer (CLAUDE.md T23 2.16).
    expect(sheetPriceFor(1)).toBe(200);
    expect(sheetPriceFor(9)).toBe(200);
    expect(sheetPriceFor(10)).toBe(190);
    expect(sheetPriceFor(29)).toBe(190);
    expect(sheetPriceFor(30)).toBe(180);
    expect(sheetPriceFor(49)).toBe(180);
    expect(sheetPriceFor(50)).toBe(170);
    expect(sheetPriceFor(99)).toBe(170);
    expect(sheetPriceFor(100)).toBe(160);
    expect(sheetPriceFor(199)).toBe(160);
    expect(sheetPriceFor(200)).toBe(150);
    expect(sheetPriceFor(499)).toBe(150);
    expect(sheetPriceFor(500)).toBe(135);
    expect(sheetPriceFor(999)).toBe(135);
    expect(sheetPriceFor(1000)).toBe(120);
    expect(sheetPriceFor(5000)).toBe(120);
    // The ladder only ever falls, and its first band starts at a single sheet.
    expect(SHEET_PRICE_LADDER[0]?.from).toBe(1);
    for (let index = 1; index < SHEET_PRICE_LADDER.length; index += 1) {
      const above = SHEET_PRICE_LADDER[index - 1];
      const band = SHEET_PRICE_LADDER[index];
      expect(band?.from).toBeGreaterThan(above?.from ?? 0);
      expect(band?.price).toBeLessThan(above?.price ?? 0);
    }
    // A restock of four and a take off of two both pay the top of it: they are small orders.
    expect(stockCostFor(4)).toBe(4 * 200);
    const state = upToMaterial(ready(), { price: 800 });
    expect(shortfallOf(firstJob(state))).toBe(2);
    expect(orderForJobCost(firstJob(state))).toBe(2 * 200);
  });

  it('pays the ladder for a take off of six, which is what the flat ad hoc price was', () => {
    // 2.16's own worked example: six sheets is the top band, so a take off that small is not a
    // penny different from what Turn 13 charged for it (CLAUDE.md T23 2.16).
    expect(sheetPriceFor(6)).toBe(200);
    expect(stockCostFor(6)).toBe(1200);
    expect(stockCostFor(10)).toBe(1900);
    expect(stockCostFor(1000)).toBe(120000);
  });

  it('gives the line a stock number in the style of the software, stable across a save', () => {
    const state = ready();
    const number = stockNumberFor(state, 'sheet');
    expect(number).toMatch(/^MFC-18-WHT-\d{3}$/);
    const opened = decodeSaveFile(encodeSaveFile(state)).state;
    expect(opened).not.toBeNull();
    if (opened) expect(stockNumberFor(opened, 'sheet')).toBe(number);
    expect(stockLines(state)[0]?.number).toBe(number);
    // A different seed, a different number: it is generated, not typed in.
    expect(stockNumberFor(newGame({ seed: 7 }), 'sheet')).not.toBe(number);
  });
});

describe('a job whose load is bigger than the rack (PIOTR, 18.09: a £50,000 job ordered three times over)', () => {
  it('keeps the whole load for the job, stores what does not fit, and never asks to order again', () => {
    // A bespoke job that needs eighty sheets against a fifty sheet rack.
    let state = doTask(upToMaterial(ready('veryEasy'), { bespokeMaterial: true }), 'materialTakeOff');
    const job = firstJob(state);
    job.sheets = 80;
    expect(shortfallOf(job)).toBe(80);
    state = act(state, { type: 'ORDER_FOR_JOB', jobId: job.id });
    expect(state.deliveries[0]?.sheets).toBe(80);
    const cashAfterOrder = state.cash;
    // While it is on the way the card cannot ask for another lorry.
    expect(orderForJobCheck(state, firstJob(state)).ok).toBe(false);
    const arrival = state.deliveries[0]?.arriveDay ?? 0;
    let day = clearEvents(runToDay(state, arrival).state);
    day = doTask(day, 'unload');
    const after = firstJob(day);
    // Fifty on the rack, thirty in storage, all eighty the job's: no shortfall, no question.
    expect(day.stock.sheets).toBe(50);
    expect(day.stock.tempStorageSheets).toBe(30);
    expect(after.sheetsReserved).toBe(80);
    expect(shortfallOf(after)).toBe(0);
    expect(day.activeEvent?.kind).not.toBe('stockOverflow');
    expect(day.deliveries[0]?.overflowSheets).toBe(0);
    // One storage charge, and no second lorry bought for the job since the order.
    expect(cashAfterOrder).toBeGreaterThan(day.cash);
    const storage = day.ledger.filter((entry) => entry.category === 'storage');
    expect(storage).toHaveLength(1);
    expect(storage[0]?.amount).toBeCloseTo(-TEMP_STORAGE_COST, 6);
    expect(day.deliveries.filter((entry) => entry.jobId === after.id)).toHaveLength(1);
    expect(orderForJobCheck(day, after).ok).toBe(false);
    expect(orderForJobCost(after)).toBe(0);
    // The morning fetch brings the thirty back to the rack and the job keeps them.
    const morning = clearEvents(runToDay(day, arrival + 1).state);
    expect(morning.tasks.some((task) => task.kind === 'fetchStorage' && !task.done)).toBe(true);
    const fetched = doTask(morning, 'fetchStorage');
    expect(fetched.stock.tempStorageSheets).toBe(0);
    expect(fetched.stock.sheets).toBe(80);
    expect(shortfallOf(firstJob(fetched))).toBe(0);
  });
});
