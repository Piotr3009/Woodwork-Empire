// Calling an order off before the lorry, and selling a machine the hall has finished with
// (PIOTR, 13.09; CLAUDE.md T8 3.5).

import { describe, expect, it } from 'vitest';
import { SALE_FRACTION, SALE_FRACTION_USED } from '../../src/engine/constants';
import { canSell, salePriceFor } from '../../src/engine/index';
import { nextWorkingDay } from '../../src/engine/clock';
import { shoppingList } from '../../src/engine/orders';
import { renderCatalogue } from '../../src/ui/catalogue';
import { renderShopping } from '../../src/ui/shopping';
import type { GameEvent, GameState } from '../../src/engine/index';
import { act, buyStartingKit, clearEvents, fillRack, newGame, runClock } from '../helpers';

function shop(): GameState {
  const state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
  state.cash = 200000;
  return state;
}

/** Plays on, answering everything and taking whatever is at the gate off the lorry, until
 *  nothing is on order any more. */
function untilLanded(state: GameState): GameState {
  let next = clearEvents(state);
  let guard = 0;
  while (next.onOrder.length > 0 && guard < 4000) {
    guard += 1;
    const task = next.tasks.find((entry) => entry.orderIds.length > 0 && !entry.done);
    if (task !== undefined && next.owner.currentTaskId === null) {
      next = act(next, { type: 'START_TASK', taskId: task.id });
    }
    next = clearEvents(runClock(next, 15));
    if (next.clock.minute >= 540 && next.activeEvent === null && !next.owner.wentHome) {
      next = clearEvents(act(next, { type: 'END_DAY' }));
    }
  }
  return next;
}

/** Plays whole days, answering everything, until this absolute day has started. */
function toDay(state: GameState, day: number, seen: GameEvent[] = []): GameState {
  let next = clearEvents(state, seen);
  let guard = 0;
  while (next.clock.day < day && guard < 4000) {
    next = clearEvents(runClock(next, 30), seen);
    if (next.clock.minute >= 540 && next.activeEvent === null && !next.owner.wentHome) {
      next = clearEvents(act(next, { type: 'END_DAY' }), seen);
    }
    guard += 1;
  }
  return clearEvents(next, seen);
}

describe('cancelling an order', () => {
  it('hands back every penny on day 3 of a seven day wait, and frees the floor', () => {
    let state = act(shop(), {
      type: 'BUY_EQUIPMENT',
      specId: 'tableSaw',
      variantId: 'pro',
    });
    const order = state.onOrder[0];
    if (!order) throw new Error('nothing on order');
    expect(order.dueDay - order.orderedDay).toBeGreaterThanOrEqual(7);
    const paid = order.pricePaid;
    expect(paid).toBe(15000);
    // Day 3, well before the lorry.
    state = toDay(state, 3);
    expect(state.onOrder).toHaveLength(1);
    const before = state.cash;
    state = act(state, { type: 'CANCEL_ORDER', orderId: order.id });
    expect(state.cash - before).toBe(paid);
    expect(state.onOrder).toHaveLength(0);
    const line = state.ledger[state.ledger.length - 1];
    expect(line?.label).toBe('Order cancelled: Professional table saw');
    expect(line?.amount).toBe(paid);
  });

  it('is offered on the list and on the tile, and only until the lorry comes', () => {
    const state = act(shop(), { type: 'BUY_EQUIPMENT', specId: 'cnc' });
    expect(renderShopping(state)).toContain('data-do="cancelOrder"');
    expect(renderCatalogue(state, '', 'owned', null, 'all')).toContain('data-do="cancelOrder"');
    const order = state.onOrder[0];
    if (!order) throw new Error('nothing on order');
    // At the gate is too late: it is here and somebody has to take it off the lorry.
    order.arrived = true;
    expect(shoppingList(state)[0]?.canCancel).toBe(false);
    const tried = act(state, { type: 'CANCEL_ORDER', orderId: order.id });
    expect(tried.onOrder).toHaveLength(1);
    expect(renderShopping(tried)).not.toContain('data-do="cancelOrder"');
  });
});

describe('what a machine fetches', () => {
  it('is half what it cost, and a third and a bit for a second hand one', () => {
    const state = shop();
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    if (!saw) throw new Error('no saw');
    expect(saw.variantId).toBe('used');
    expect(saw.purchasePrice).toBe(1800);
    expect(salePriceFor(saw)).toBe(Math.round(1800 * SALE_FRACTION_USED));
    expect(salePriceFor(saw)).toBe(630);
    expect(salePriceFor({ ...saw, variantId: 'standard', purchasePrice: 5000 })).toBe(
      Math.round(5000 * SALE_FRACTION),
    );
  });
});

describe('selling a machine', () => {
  it('pays half of 5,000 the next morning and takes the machine away', () => {
    let state = shop();
    state = act(state, { type: 'BUY_EQUIPMENT', specId: 'tableSaw', variantId: 'budget' });
    state = untilLanded(state);
    // The budget saw is in the hall and nobody is at it.
    const saw = state.equipment.find(
      (item) => item.specId === 'tableSaw' && item.variantId === 'budget',
    );
    if (!saw) throw new Error('no budget saw in the hall');
    expect(saw.purchasePrice).toBe(5000);
    expect(salePriceFor(saw)).toBe(2500);
    const before = state.cash;
    state = act(state, { type: 'SELL_MACHINE', equipmentId: saw.id });
    // Sold, still standing there, and it does no more work.
    expect(state.equipment.some((item) => item.id === saw.id)).toBe(true);
    expect(state.equipment.find((item) => item.id === saw.id)?.soldOnDay).toBe(
      nextWorkingDay(state.clock.day),
    );
    expect(state.cash).toBe(before);
    expect(renderCatalogue(state, '', 'owned', null, 'all')).toContain('Sold, collection on day');
    // The next morning the buyer's van comes, and the cash with it.
    const seen: GameEvent[] = [];
    state = toDay(state, nextWorkingDay(state.clock.day), seen);
    expect(state.equipment.some((item) => item.id === saw.id)).toBe(false);
    expect(seen.some((event) => event.kind === 'machineCollected')).toBe(true);
    const line = state.ledger.find((entry) => entry.label === 'Sold: Table saw');
    expect(line?.amount).toBe(2500);
    // The morning's only equipment line is the sale, and it is money in.
    expect(state.finance.day.byCategory.equipment).toBe(2500);
    // The rent and the rates ran that morning as they run every morning, so the bank is up by
    // the sale less the day's own costs and not by the sale alone.
    expect(state.cash).toBeGreaterThan(before);
  });

  it('refuses a machine somebody is standing at, a broken one and a hand tool', () => {
    const state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
    state.enquiries = [];
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    const bander = state.equipment.find((item) => item.specId === 'edgebander');
    const bench = state.equipment.find((item) => item.specId === 'workbench');
    if (!saw || !bander || !bench) throw new Error('no kit');
    expect(canSell(state, saw.id).ok).toBe(true);
    // Somebody is standing at it.
    const busy: GameState = {
      ...state,
      equipment: state.equipment.map((item) =>
        item.id === saw.id ? { ...item, takenBy: 'owner' } : item,
      ),
    };
    expect(canSell(busy, saw.id).ok).toBe(false);
    expect(canSell(busy, saw.id).reason).toBe('Somebody is standing at it');
    // Broken.
    const broken: GameState = {
      ...state,
      equipment: state.equipment.map((item) =>
        item.id === saw.id ? { ...item, broken: true } : item,
      ),
    };
    expect(canSell(broken, saw.id).reason).toBe('It is broken. Fix it first');
    // A hand edgebander lives in a tool cabinet, and a bench is a fitting.
    expect(canSell(state, bander.id).reason).toBe('It lives in a tool cabinet');
    expect(canSell(state, bench.id).reason).toBe('Nobody buys second hand fittings');
    // The tile says the reason rather than offering a button the engine would refuse.
    const page = renderCatalogue(busy, '', 'owned', null, 'all');
    expect(page).toContain('Cannot sell it: Somebody is standing at it');
  });

  it('stops the machine working the minute it is sold', () => {
    let state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
    state.enquiries = [];
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    if (!saw) throw new Error('no saw');
    state = act(state, { type: 'SELL_MACHINE', equipmentId: saw.id });
    // The catalogue says so, and nobody can take it.
    expect(renderCatalogue(state, '', 'owned', null, 'all')).toContain('does no more work');
    expect(state.equipment.find((item) => item.id === saw.id)?.takenBy).toBeNull();
  });
});
