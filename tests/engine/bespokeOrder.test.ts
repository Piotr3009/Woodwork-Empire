// A job's own delivery is the job's, rack or no rack (PIOTR: "materials for a 50k job want
// ordering several times at 7k"; CLAUDE.md T20 2.16).
//
// The bug: `unloadIntoStock` gave a job only what fitted on the rack, so a bespoke load bigger
// than the free places left the job short the moment it was unloaded and its card asked for
// another order, at the ad hoc price, for material that was standing in the yard. From tonight
// the whole lorry is the job's: what the rack took is held for it and what would not go on it goes
// into temporary storage for it, one charge, and comes back on the morning fetch. Nothing of a
// job's own load is ever left in the yard to be written off.

import { describe, expect, it } from 'vitest';
import {
  BESPOKE_COST_UPLIFT,
  MATERIAL_FRACTION,
  SHEET_VALUE,
  TEMP_STORAGE_COST,
} from '../../src/engine/constants';
import {
  arriveDeliveries,
  deliveriesInYard,
  fetchFromStorage,
  freeSheets,
  rackCapacity,
  reservedSheets,
  shortfallOf,
  unloadIntoStock,
  writeOffSheetsLeftOutside,
} from '../../src/engine/materials';
import { orderForJobCheck, orderShortfall } from '../../src/engine/jobs';
import { materialLine } from '../../src/ui/jobCard';
import type { GameState, Job } from '../../src/engine/index';
import { acceptNow, buyStartingKit, newGame, placeEnquiry, placeEquipment, withAir, withExtraction } from '../helpers';

/** The day 1 kit and one budget sheet rack: fifty places and nothing on them. */
function hall(): GameState {
  return withAir(withExtraction(buyStartingKit(newGame({ difficulty: 'veryEasy' }))));
}

/** A fifty thousand pound job with bespoke material, accepted and waiting on its sheets. */
function bespokeJob(state: GameState): { state: GameState; job: Job } {
  const enquiry = placeEnquiry(state, { price: 50000, deadlineDays: 90, bespokeMaterial: true });
  const next = acceptNow(state, enquiry.id);
  const job = next.jobs[0];
  if (!job) throw new Error('a job is wanted');
  return { state: next, job };
}

describe('the fifty thousand pound job and the fifty place rack (CLAUDE.md T20 2.16)', () => {
  it('is whole after one order and one unload, with the rest of it held in storage for it', () => {
    const { state, job } = bespokeJob(hall());
    const places = rackCapacity(state);
    expect(places).toBe(50);
    // The job wants more sheets than the rack has places: 0.40 of the price, 15 per cent on top
    // because it is bespoke, over the value of a sheet.
    const wanted = Math.ceil((50000 * MATERIAL_FRACTION * (1 + BESPOKE_COST_UPLIFT)) / SHEET_VALUE);
    expect(job.sheets).toBe(wanted);
    expect(job.sheets).toBeGreaterThan(places);
    expect(shortfallOf(job)).toBe(job.sheets);

    // One order.
    expect(orderForJobCheck(state, job).ok).toBe(true);
    expect(orderShortfall(state, job.id)).toBe(true);
    expect(state.deliveries).toHaveLength(1);
    // And no second one while it is on the road: the button says so.
    expect(orderForJobCheck(state, job)).toEqual({ ok: false, reason: 'On its way already' });

    // One unload.
    state.clock.day = state.deliveries[0]?.arriveDay ?? state.clock.day;
    arriveDeliveries(state);
    const delivery = deliveriesInYard(state)[0];
    if (!delivery) throw new Error('a lorry is wanted');
    expect(unloadIntoStock(state, delivery)).toBe(0);
    delivery.unloaded = true;

    // No shortfall after: the rack holds fifty of them and storage holds the rest, and every one
    // of them is the job's.
    expect(shortfallOf(job)).toBe(0);
    expect(state.stock.sheets).toBe(places);
    expect(state.stock.tempStorageSheets).toBe(job.sheets - places);
    expect(job.sheetsReserved).toBe(job.sheets);
    // Nothing of the job's load is left in the yard to be lost overnight, and it was charged
    // storage once and not once a sheet.
    expect(state.deliveries[0]?.overflowSheets).toBe(0);
    const storage = state.ledger.filter((entry) => entry.category === 'storage');
    expect(storage).toHaveLength(1);
    expect(storage[0]?.amount).toBeCloseTo(-TEMP_STORAGE_COST, 6);
    // The whole load is claimed, so the rack has nothing to spare for anybody else.
    expect(reservedSheets(state)).toBe(job.sheets);
    expect(freeSheets(state)).toBe(0);
    // And the card has nothing to order.
    expect(orderForJobCheck(state, job)).toEqual({ ok: false, reason: 'Nothing short' });
    const card = materialLine(state, job);
    expect(card).toContain(`${job.sheets} of ${job.sheets} sheets in hand`);
    expect(card).not.toContain('Order for this job');
  });

  it('loses none of it overnight and keeps it all through the morning fetch', () => {
    const { state, job } = bespokeJob(hall());
    orderShortfall(state, job.id);
    state.clock.day = state.deliveries[0]?.arriveDay ?? state.clock.day;
    arriveDeliveries(state);
    const delivery = deliveriesInYard(state)[0];
    if (!delivery) throw new Error('a lorry is wanted');
    unloadIntoStock(state, delivery);
    delivery.unloaded = true;
    const stored = state.stock.tempStorageSheets;
    expect(stored).toBe(job.sheets - rackCapacity(state));

    // The night comes and nothing of the job's own load is in the yard to be written off.
    expect(writeOffSheetsLeftOutside(state)).toBe(0);
    expect(state.stock.tempStorageSheets).toBe(stored);

    // The morning fetch brings them in and they are still the job's: one order bought the lot.
    fetchFromStorage(state);
    expect(state.stock.tempStorageSheets).toBe(0);
    expect(state.stock.sheets).toBe(job.sheets);
    expect(job.sheetsReserved).toBe(job.sheets);
    expect(shortfallOf(job)).toBe(0);
    expect(freeSheets(state)).toBe(0);
  });

  it('leaves a stock lorry overflow where it was, nobody\u0027s and gone by morning', () => {
    const state = hall();
    placeEquipment(state, 'sheetRack', { variantId: 'budget', x: 2, y: 2, id: 'rack-2' });
    const room = rackCapacity(state);
    state.stock.sheets = room - 5;
    const delivery = {
      id: 'del-stock',
      jobId: null,
      sheets: 20,
      orderedDay: 1,
      pricePaid: 0,
      arriveDay: 1,
      arrived: true,
      unloaded: false,
      bespoke: false,
      overflowSheets: 0,
    };
    state.deliveries.push(delivery);
    expect(unloadIntoStock(state, delivery)).toBe(15);
    expect(delivery.overflowSheets).toBe(15);
    expect(writeOffSheetsLeftOutside(state)).toBe(15);
    expect(delivery.overflowSheets).toBe(0);
  });
});
