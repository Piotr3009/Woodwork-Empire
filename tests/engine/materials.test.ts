import { describe, expect, it } from 'vitest';
import {
  BESPOKE_COST_UPLIFT,
  MATERIAL_FRACTION,
  SHEET_PRICE,
  SHEET_PRICE_STOCK,
  STOCK_MATERIAL_FRACTION,
  TEMP_STORAGE_COST,
  TEMP_STORAGE_FETCH_MINUTES,
} from '../../src/engine/constants';
import {
  deliveryDay,
  materialCostFor,
  sheetsForCost,
  stockCostFor,
  stockFree,
} from '../../src/engine/materials';
import { tick } from '../../src/engine/index';
import type { GameEvent, GameState } from '../../src/engine/index';
import {
  act,
  buyStartingKit,
  choose,
  clearEvents,
  doTask,
  eventsOfKind,
  firstJob,
  newGame,
  placeEnquiry,
  runToDay,
} from '../helpers';

function ready(difficulty: 'easy' | 'veryEasy' = 'easy'): GameState {
  const state = buyStartingKit(newGame({ difficulty }));
  state.enquiries = [];
  return state;
}

/** Accepts a job and clears its calls and drawing, ready for the material order. */
function upToMaterial(state: GameState, extra = {}): GameState {
  const enquiry = placeEnquiry(state, { price: 400, deadlineDays: 30, ...extra });
  let next = act(state, { type: 'ACCEPT_ENQUIRY', enquiryId: enquiry.id, byHand: false });
  next = doTask(next, 'clientCall');
  next = doTask(next, 'clientCall');
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
    expect(SHEET_PRICE_STOCK).toBeLessThan(SHEET_PRICE);
  });

  it('turns a material cost into whole sheets', () => {
    expect(sheetsForCost(160)).toBe(2);
    expect(sheetsForCost(161)).toBe(3);
    expect(sheetsForCost(1)).toBe(1);
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
    expect(stockFree(state)).toBe(state.stock.capacity - 5);
  });

  it('lets a job draw from the rack instead of ordering, with no second payment', () => {
    let state = act(ready(), { type: 'BUY_STOCK', sheets: 6 });
    state = clearEvents(runToDay(state, 2).state);
    state = doTask(state, 'unload');
    state = upToMaterial(state);
    state = act(state, { type: 'SET_MATERIAL_MODE', jobId: firstJob(state).id, mode: 'stock' });
    const before = state.cash;
    state = doTask(state, 'materialOrder');
    expect(state.cash).toBe(before);
    expect(state.stock.sheets).toBe(4);
    expect(firstJob(state).stage).toBe('ready');
    expect(firstJob(state).materialCost).toBeCloseTo(stockCostFor(2), 6);
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
    let state = act(ready(), { type: 'BUY_STOCK', sheets: 15 });
    const events: GameEvent[] = [];
    state = clearEvents(runToDay(state, 2).state, events);
    state = doTask(state, 'unload');
    return { state, events };
  }

  it('fills the rack and asks what happens to the rest', () => {
    const { state } = overflowing();
    expect(state.stock.sheets).toBe(12);
    expect(state.activeEvent?.kind).toBe('stockOverflow');
    expect(state.activeEvent?.data.sheets).toBe(3);
    expect(state.activeEvent?.choices.map((choice) => choice.id)).toEqual(['storage', 'outside']);
  });

  it('writes off what was left in the yard, in the morning', () => {
    const { state } = overflowing();
    const left = choose(state, 'outside');
    expect(left.deliveries[0]?.overflowSheets).toBe(3);
    const cashBefore = left.cash;
    const run = runToDay(left, 3);
    expect(run.state.stock.sheets).toBe(12);
    expect(run.state.deliveries[0]?.overflowSheets).toBe(0);
    const writeOff = run.state.ledger.find((entry) => entry.label.includes('written off'));
    expect(writeOff?.unpaid).toBe(true);
    expect(writeOff?.amount).toBeCloseTo(-stockCostFor(3), 6);
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
    expect(stored.stock.tempStorageSheets).toBe(3);
    expect(stored.deliveries[0]?.overflowSheets).toBe(0);
    stored = clearEvents(runToDay(stored, 3).state);
    const fetch = stored.tasks.find((task) => task.kind === 'fetchStorage' && !task.done);
    expect(fetch?.minutesTotal).toBe(TEMP_STORAGE_FETCH_MINUTES);
    const done = doTask(stored, 'fetchStorage');
    expect(done.stock.sheets).toBe(15);
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
    state.reputation = 1;
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
    state = doTask(state, 'clientCall');
    state = doTask(state, 'clientCall');
    state = doTask(state, 'clientCall');
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
    let state = act(ready(), { type: 'BUY_STOCK', sheets: 15 });
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
