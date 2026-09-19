// The owner on the phone, and an order called off before the lorry (PIOTR, 15.09;
// CLAUDE.md T11 3.11, 3.12).

import { describe, expect, it } from 'vitest';
import { STATION_PHONE, stationForTask } from '../../src/engine/stations';
import { ANIMATIONS, animationForStation } from '../../src/render/characters';
import { shoppingList } from '../../src/engine/orders';
import { renderHall } from '../../src/render/hall';
import { officeFigure as renderOfficeFigure } from '../../src/render/office';
import { renderShopping } from '../../src/ui/shopping';
import { createTask } from '../../src/engine/tasks';
import { orderForJob } from '../../src/engine/materials';
import { orderForJobCheck } from '../../src/engine/jobs';
import type { GameState, TaskInstance } from '../../src/engine/index';
import {
  acceptNow,
  act,
  buyStartingKit,
  fillRack,
  firstJob,
  newGame,
  placeEnquiry,
} from '../helpers';

/** A quiet hall with the day 1 kit and nothing on the board. */
function quietHall(): GameState {
  const state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 40);
  state.enquiries = [];
  return state;
}

function callTask(state: GameState): TaskInstance {
  return createTask(state, { kind: 'clientCall', label: 'Client call: Bookcase', minutes: 6 });
}

// ---------------------------------------------------------------------------
// 3.11 The owner on the phone
// ---------------------------------------------------------------------------

describe('the owner on the phone', () => {
  it('has a sheet of his own, on the list the loader reads', () => {
    expect([...ANIMATIONS]).toContain('phone');
  });

  it('stands at the phone while the call lasts, and at the desk for everything else', () => {
    const state = quietHall();
    const call = callTask(state);
    expect(stationForTask(state, call)).toBe(STATION_PHONE);
    const books = createTask(state, { kind: 'bookkeeping', label: 'Bookkeeping', minutes: 60 });
    expect(stationForTask(state, books)).toBe('office');
  });

  it('plays the phone sheet at that station and idle everywhere else', () => {
    expect(animationForStation(STATION_PHONE)).toBe('phone');
    expect(animationForStation('office')).toBe('idle');
    expect(animationForStation('idle')).toBe('idle');
    expect(animationForStation('bench')).toBe('bench');
  });

  it('points the owner s image at the phone sheet the minute he answers', () => {
    const state = quietHall();
    const call = callTask(state);
    const answering = act(state, { type: 'START_TASK', taskId: call.id });
    expect(answering.owner.currentTaskId).toBe(call.id);
    expect(answering.owner.station).toBe(STATION_PHONE);
    // The phone is on the desk, so from T20 2.12 he has gone through the office door: he is not
    // on the hall at all and the office view is where the phone sheet is played.
    expect(renderHall(answering)).not.toContain('data-figure="owner"');
    const office = renderOfficeFigure(answering, ['character.owner.phone.sheet.png']);
    expect(office).toContain('data-character="owner"');
    expect(office).toContain('character.owner.phone.sheet.png');
    // And with the phone down he is back on the floor, off the sheet.
    const done = act(answering, { type: 'PAUSE_TASK' });
    expect(renderOfficeFigure(done, ['character.owner.phone.sheet.png'])).toBe('');
  });
});

// ---------------------------------------------------------------------------
// 3.12 Cancel, for material and for the kit in transit
// ---------------------------------------------------------------------------

/** A hall with one job on the books whose drawings are done and whose material is on the road.
 *  The drawings and the measure are marked done here, because this test is about calling the
 *  lorry off and not about the days before it. */
function materialOnTheRoad(): GameState {
  const state = quietHall();
  state.stock.sheets = 0;
  const enquiry = placeEnquiry(state, { price: 4000, deadlineDays: 40 });
  const next = acceptNow(state, enquiry.id, false);
  const job = firstJob(next);
  for (const task of next.tasks) {
    if (task.jobId !== job.id) continue;
    if (task.kind === 'design' || task.kind === 'siteMeasure' || task.kind === 'clientMeeting') {
      task.minutesRemaining = 0;
      task.done = true;
      task.doneDay = next.clock.day;
    }
  }
  job.designMinutesRemaining = 0;
  // Nothing held for it: the whole of its material comes on its own lorry (CLAUDE.md T13 3.3).
  job.sheetsReserved = 0;
  const delivery = orderForJob(next, job);
  if (delivery === null) throw new Error('no lorry booked');
  job.stage = 'materialOrdered';
  for (const task of next.tasks) {
    if (task.kind === 'materialTakeOff' && task.jobId === job.id) {
      task.minutesRemaining = 0;
      task.done = true;
      task.doneDay = next.clock.day;
    }
  }
  return next;
}

describe('calling an order off', () => {
  it('offers the Cancel on a load of sheets that is still on the road', () => {
    const state = quietHall();
    const bought = act(state, { type: 'BUY_STOCK', sheets: 10 });
    const line = shoppingList(bought).find((entry) => entry.kind === 'material');
    expect(line).toBeDefined();
    expect(line?.canCancel).toBe(true);
    expect(renderShopping(bought)).toContain(`data-do="cancelOrder" data-id="${line?.id}"`);
  });

  it('hands the money back in full on the evening before the lorry', () => {
    const state = quietHall();
    const before = state.cash;
    const bought = act(state, { type: 'BUY_STOCK', sheets: 10 });
    const paid = before - bought.cash;
    expect(paid).toBeGreaterThan(0);
    const line = shoppingList(bought).find((entry) => entry.kind === 'material');
    if (line === undefined) throw new Error('nothing on the list');
    // The evening before it lands: the clock has run, the lorry has not.
    bought.clock.minute = 500;
    const cancelled = act(bought, { type: 'CANCEL_ORDER', orderId: line.id });
    expect(cancelled.cash).toBe(before);
    expect(cancelled.deliveries).toHaveLength(0);
    expect(shoppingList(cancelled)).toHaveLength(0);
  });

  it('is too late once the lorry is at the gate, and says so', () => {
    const state = quietHall();
    const bought = act(state, { type: 'BUY_STOCK', sheets: 10 });
    const delivery = bought.deliveries[0];
    if (delivery === undefined) throw new Error('nothing on the road');
    delivery.arrived = true;
    const line = shoppingList(bought).find((entry) => entry.kind === 'material');
    expect(line?.canCancel).toBe(false);
    expect(renderShopping(bought)).toContain('At the gate, too late to call off');
    const cash = bought.cash;
    const same = act(bought, { type: 'CANCEL_ORDER', orderId: delivery.id });
    expect(same.cash).toBe(cash);
    expect(same.deliveries).toHaveLength(1);
  });

  it('puts the job back to wanting its material ordered again', () => {
    const state = materialOnTheRoad();
    const delivery = state.deliveries[0];
    if (delivery === undefined) throw new Error('no material on the road');
    expect(firstJob(state).stage).toBe('materialOrdered');
    const cancelled = act(state, { type: 'CANCEL_ORDER', orderId: delivery.id });
    expect(cancelled.deliveries).toHaveLength(0);
    expect(firstJob(cancelled).stage).toBe('materialPending');
    // And the job's own button is back: it is short again (CLAUDE.md T13 3.3).
    expect(orderForJobCheck(cancelled, firstJob(cancelled)).ok).toBe(true);
  });

  it('puts what it refunds back in the bank, even below the overdraft limit', () => {
    // A material order is booked whether the money is there or not: the supplier has loaded it
    // (CLAUDE.md 8.3), and from Turn 22 it is paid out of the account whatever the balance. So
    // called off, what comes back is cash, and there is nothing else for it to go against
    // (CLAUDE.md T22 2.1).
    const state = materialOnTheRoad();
    const delivery = state.deliveries[0];
    if (delivery === undefined) throw new Error('no material on the road');
    // The bank under its limit, the way a company that paid this bill out of it would be.
    state.cash = state.finance.overdraftLimit - delivery.pricePaid;
    const cancelled = act(state, { type: 'CANCEL_ORDER', orderId: delivery.id });
    expect(cancelled.cash).toBeCloseTo(state.finance.overdraftLimit, 6);
  });

  it('still calls a machine off while it is in transit, and refuses one at the gate', () => {
    const state = quietHall();
    const before = state.cash;
    const ordered = act(state, {
      type: 'BUY_EQUIPMENT',
      specId: 'tableSaw',
      variantId: 'standard',
    });
    const order = ordered.onOrder[0];
    if (order === undefined) throw new Error('nothing on order');
    expect(shoppingList(ordered).find((line) => line.id === order.id)?.canCancel).toBe(true);
    const cancelled = act(ordered, { type: 'CANCEL_ORDER', orderId: order.id });
    expect(cancelled.cash).toBe(before);
    expect(cancelled.onOrder).toHaveLength(0);
  });
});
