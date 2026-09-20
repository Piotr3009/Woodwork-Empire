// A machine on order is a drawing on the floor and nothing more (CLAUDE.md T10 1, 3.10). It cuts
// nothing, it holds no queue and it answers no question about what is in the hall. The one
// question it may answer is the board's lock, and the board asked it days before anybody cut
// anything.

import { describe, expect, it } from 'vitest';
import {
  countOf,
  freeMachines,
  hallBlock,
  has,
  hasExtraction,
  machineIsShared,
  startProductionCheck,
} from '../../src/engine/index';
import { createOnOrder } from '../../src/engine/orders';
import { lockReasonFor } from '../../src/engine/catalog';
import { template } from '../../src/engine/catalog';
import { acceptNow, act, fillRack, firstJob, newGame, placeEnquiry, placeEquipment, runClock } from '../helpers';
import { formatCalendarDay } from '../../src/engine/index';
import type { GameState } from '../../src/engine/index';

/** A hall with a bench and an extractor, a sheet job ready for the bench, and a table saw that is
 *  bought and still on the road. */
function sawOnTheRoad(): GameState {
  const state = fillRack(newGame(), 40);
  placeEquipment(state, 'extractor', { x: 14, y: 1 });
  placeEquipment(state, 'workbench', { variantId: 'budget', x: 8, y: 6 });
  state.enquiries = [];
  const enquiry = placeEnquiry(state, { price: 4000, deadlineDays: 40 });
  let next = acceptNow(state, enquiry.id, false);
  createOnOrder(next, {
    specId: 'tableSaw',
    variantId: 'budget',
    pricePaid: 5000,
    anchorX: 2,
    anchorY: 1,
  });
  const job = firstJob(next);
  job.stage = 'ready';
  next = act(next, { type: 'SET_SPEED', speed: 1 });
  return next;
}

describe('kit that is bought and still on the road', () => {
  it('is in no hall query: the saw is on order and the workshop owns none', () => {
    const state = sawOnTheRoad();
    expect(state.onOrder.map((item) => item.specId)).toEqual(['tableSaw']);
    expect(has(state, 'tableSaw')).toBe(false);
    expect(countOf(state, 'tableSaw')).toBe(0);
    expect(freeMachines(state, 'tableSaw')).toEqual([]);
    expect(machineIsShared(state, 'tableSaw')).toBe(true);
    // What it does answer is the board's lock: a company that has ordered a saw can take sheet
    // work, because the drawing and the material take days of their own (CLAUDE.md T8 3.2), so
    // the saw is off the list of what is missing and the job is not locked at all.
    expect(lockReasonFor(state, template('garageShelves'))).toBeNull();
  });

  it('cannot extract either: an extractor on order leaves the hall with no extraction', () => {
    const state = fillRack(newGame(), 10);
    placeEquipment(state, 'workbench', { variantId: 'budget', x: 8, y: 6 });
    createOnOrder(state, {
      specId: 'extractor',
      variantId: 'budget',
      pricePaid: 600,
      anchorX: 14,
      anchorY: 1,
    });
    expect(hasExtraction(state)).toBe(false);
  });

  it('makes the Cutting stage wait, with the lorry named, instead of falling back to hands', () => {
    const state = sawOnTheRoad();
    const order = state.onOrder[0];
    if (!order) throw new Error('the saw should be on order');
    // The article is the drawing's, and the phrase is the one the game says about any machine a job
    // cannot have (CLAUDE.md T21 2.7).
    const wanted = `waiting for the saw (on order, due ${formatCalendarDay(order.dueDay)})`;
    expect(hallBlock(state, firstJob(state))).toBe(wanted);
    expect(startProductionCheck(state, firstJob(state))).toEqual({ ok: false, reason: wanted });
  });

  it('writes that line on the job the minute the owner stands at it', () => {
    const state = sawOnTheRoad();
    const order = state.onOrder[0];
    if (!order) throw new Error('the saw should be on order');
    const next = runClock(act(state, { type: 'WORK_HERE', jobId: firstJob(state).id }), 10);
    const job = firstJob(next);
    expect(job.blockedBy).toBe(
      `waiting for the saw (on order, due ${formatCalendarDay(order.dueDay)})`,
    );
    // And nothing was cut while it waited.
    expect(job.labourRemaining).toBe(job.labourValue);
  });

  it('lets the work start the moment the same saw is standing in the hall', () => {
    const state = sawOnTheRoad();
    placeEquipment(state, 'tableSaw', { variantId: 'budget', x: 2, y: 1 });
    state.onOrder = [];
    expect(hallBlock(state, firstJob(state))).toBe('');
  });

  it('falls back to a pair of hands when nothing of the family is owned or ordered', () => {
    const state = sawOnTheRoad();
    state.onOrder = [];
    // No saw anywhere: the Turn 1 by hand path, which is slow and not a wait (CLAUDE.md T7 3.1).
    expect(hallBlock(state, firstJob(state))).toBe('');
  });
});
