// A machine on order is a drawing on the floor and nothing more (CLAUDE.md T10 1, 3.10). It cuts
// nothing, it has no places and it answers no question about what is in the hall. The one
// question it may answer is the board's lock, and the board asked it days before anybody cut
// anything. Until v53 the stage that wanted it stood and waited for the lorry; from v53 nothing
// stops a job but the whole hall, so its share goes by hand until the lorry comes (PIOTR, 24.09).

import { describe, expect, it } from 'vitest';
import {
  countOf,
  hallBlock,
  hallPlaces,
  has,
  hasExtraction,
  machineIsShared,
  startProductionCheck,
} from '../../src/engine/index';
import { createOnOrder } from '../../src/engine/orders';
import { lockReasonFor } from '../../src/engine/catalog';
import { template } from '../../src/engine/catalog';
import { OWNER_LABOUR_PER_MINUTE } from '../../src/engine/constants';
import { jobPace, stageSpeed } from '../../src/engine/stages';
import {
  acceptNow,
  act,
  fillRack,
  firstJob,
  newGame,
  placeEnquiry,
  placeEquipment,
  runClock,
  withAir,
} from '../helpers';
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
    expect(hallPlaces(state, 'tableSaw')).toBe(0);
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

  it('stops no job for the saw on the lorry: the cutting goes by hand until it comes', () => {
    const state = sawOnTheRoad();
    // Until v53 the job stood with `saw on order, due ...` on it and Start production refused it.
    // Now the lorry stops nothing: the cutting, and the machining with no edgebander in the hall,
    // go at the by hand 1 / 1.5, and the rest at 1.00 (PIOTR, 24.09; v53).
    expect(hallBlock(state, firstJob(state))).toBe('');
    expect(startProductionCheck(state, firstJob(state))).toEqual({ ok: true, reason: '' });
    expect(stageSpeed(state, firstJob(state), 'cutting')).toEqual({ speed: 1 / 1.5, byHand: true });
    expect(jobPace(state, firstJob(state))).toBeCloseTo(1 / (0.4 * 1.5 + 0.6), 10);
  });

  it('writes nothing on the job the minute the owner stands at it, and he cuts by hand at a bench', () => {
    // A compressor behind the bench, so the minute is the by hand cutting's and nothing of the air.
    const state = withAir(sawOnTheRoad());
    const next = runClock(act(state, { type: 'WORK_HERE', jobId: firstJob(state).id }), 10);
    const job = firstJob(next);
    expect(job.blockedBy).toBe('');
    expect(next.owner.station).toBe('machine:workbench');
    // Until v53 nothing was cut while it waited; now ten minutes of it at the job's one pace,
    // 5.56 of labour, all of it on the cutting where the bar stands.
    expect(job.labourValue - job.labourRemaining).toBeCloseTo((10 * OWNER_LABOUR_PER_MINUTE) / 1.2, 6);
    expect(job.stageLabour.cutting ?? 0).toBeCloseTo((10 * OWNER_LABOUR_PER_MINUTE) / 1.2, 6);
  });

  it('puts the cutting on the saw the moment the same saw is standing in the hall', () => {
    const state = sawOnTheRoad();
    placeEquipment(state, 'tableSaw', { variantId: 'budget', x: 2, y: 1 });
    state.onOrder = [];
    expect(hallBlock(state, firstJob(state))).toBe('');
    // The saw's one place, and the cutting at its pace: the job's one pace rises from 0.8333 by
    // hand to 0.9302, the machining still by hand with no edgebander in the hall (v53).
    expect(hallPlaces(state, 'tableSaw')).toBe(1);
    expect(stageSpeed(state, firstJob(state), 'cutting')).toEqual({ speed: 1, byHand: false });
    expect(jobPace(state, firstJob(state))).toBeCloseTo(1 / (0.25 + 0.15 * 1.5 + 0.6), 10);
  });

  it('falls back to a pair of hands when nothing of the family is owned or ordered', () => {
    const state = sawOnTheRoad();
    state.onOrder = [];
    // No saw anywhere: the Turn 1 by hand path, which is slow and not a wait (CLAUDE.md T7 3.1).
    expect(hallBlock(state, firstJob(state))).toBe('');
  });
});
