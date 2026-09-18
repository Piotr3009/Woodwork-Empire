// A job's own delivery is the job's, rack or no rack (PIOTR: "materials for a 50k job want
// ordering several times at 7k"; CLAUDE.md T20 2.16).
//
// The bug: `unloadIntoStock` gave a job only what fitted on the rack, so a bespoke load bigger
// than the free places left the job short the moment it was unloaded and its card asked for
// another order, at the ad hoc price, for material that was standing in the yard. From tonight
// the whole lorry is the job's: what the rack took is held for it, what would not go on stands on
// its own pallet and is held for it just the same, and the pallet goes on the rack as the cutting
// makes room. Nothing of a job's own load is ever written off in the yard.

import { describe, expect, it } from 'vitest';
import {
  BESPOKE_COST_UPLIFT,
  MATERIAL_FRACTION,
  SHEET_VALUE,
} from '../../src/engine/constants';
import {
  arriveDeliveries,
  deliveriesInYard,
  drawSheetsFor,
  freeSheets,
  jobSheetsOnPallet,
  landPalletSheets,
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
  it('is whole after one order and one unload, with the rest of it held on its pallet', () => {
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

    // No shortfall after: the rack holds fifty of them and the pallet holds the rest.
    expect(shortfallOf(job)).toBe(0);
    expect(state.stock.sheets).toBe(places);
    expect(jobSheetsOnPallet(state, job.id)).toBe(job.sheets - places);
    expect(job.sheetsReserved).toBe(job.sheets);
    // The rack's own count stays the rack's: what is on the pallet is not on it.
    expect(reservedSheets(state)).toBe(places);
    expect(freeSheets(state)).toBe(0);
    // And the card has nothing to order.
    expect(orderForJobCheck(state, job)).toEqual({ ok: false, reason: 'Nothing short' });
    const card = materialLine(state, job);
    expect(card).toContain(`${job.sheets} of ${job.sheets} sheets in hand`);
    expect(card).not.toContain('Order for this job');
  });

  it('keeps the pallet overnight and puts it on the rack as the cutting makes room', () => {
    const { state, job } = bespokeJob(hall());
    orderShortfall(state, job.id);
    state.clock.day = state.deliveries[0]?.arriveDay ?? state.clock.day;
    arriveDeliveries(state);
    const delivery = deliveriesInYard(state)[0];
    if (!delivery) throw new Error('a lorry is wanted');
    unloadIntoStock(state, delivery);
    delivery.unloaded = true;
    const pallet = jobSheetsOnPallet(state, job.id);
    expect(pallet).toBeGreaterThan(0);

    // The night comes and nothing of the job's own load is written off.
    expect(writeOffSheetsLeftOutside(state)).toBe(0);
    expect(jobSheetsOnPallet(state, job.id)).toBe(pallet);

    // The rack is full, so nothing lands until the job has cut into it.
    const places = rackCapacity(state);
    expect(landPalletSheets(state)).toBe(0);
    job.stage = 'inProduction';
    expect(drawSheetsFor(state, job, 0.1)).toBe(true);
    expect(state.stock.sheets).toBeLessThan(places);
    const firstCut = job.sheetsUsed;
    // And the pallet comes in behind the saw, which the next slice of work does by itself: the
    // rack is filled again from the pallet and the slice is cut off it.
    expect(drawSheetsFor(state, job, 0.2)).toBe(true);
    expect(state.stock.sheets).toBe(places - (job.sheetsUsed - firstCut));
    expect(jobSheetsOnPallet(state, job.id)).toBeLessThan(pallet);
    // What it has cut plus what it still holds is the whole load, wherever it is standing.
    expect(job.sheetsUsed + job.sheetsReserved).toBe(job.sheets);
    expect(shortfallOf(job)).toBe(0);
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
