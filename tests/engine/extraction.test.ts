// The extraction has to add up (PIOTR's tables of 13.09; CLAUDE.md T10 3.1). Every machine has a
// demand while somebody is at one of its places (CLAUDE.md T25 2.3), every fan has a capacity, and the sums decide whether
// the hall runs clean. Nothing is pre-booked and no machine ever stops.

import { describe, expect, it } from 'vitest';
import {
  DUSTY_JOB_RATING,
  DUSTY_JOB_SHARE,
  DUST_PER_PRODUCTION_MINUTE,
  EXTRACTION_CAPACITY,
  EXTRACTION_DEMAND,
  EXTRACTION_MARGIN,
  UNDER_EXTRACTION_DUST_MULTIPLIER,
  UNDER_EXTRACTION_OUTPUT_PENALTY,
} from '../../src/engine/constants';
import {
  extractionCheck,
  extractionCapacityOf,
  extractionDemandOf,
  madeInADustyWorkshop,
  outputBreakdown,
  ratingFor,
  underExtracted,
} from '../../src/engine/index';
import { dustGainPerMinute, hallProductivityFactor } from '../../src/engine/machines';
import { applyRating } from '../../src/engine/reputation';
import { hallProblems } from '../../src/render/hall';
import type { GameState, Job } from '../../src/engine/index';
import {
  acceptNow,
  act,
  atAPlace,
  fillRack,
  firstJob,
  newGame,
  offHisPlace,
  placeEnquiry,
  placeEquipment,
  runClock,
  withAir,
} from '../helpers';

/** A two man shop: a standard saw and a floor edgebander, both with a man at them, and one
 *  extractor of the class the test names. Piotr's own example (CLAUDE.md T10 3.1). The compressor
 *  is there for the edgebander: a floor bander runs on air, and a family that will not run on the
 *  air it has has no places, so without one nobody could stand at it at all (PIOTR, 24.09; v53).
 *  It asks nothing of the extraction, so every sum below is the one it always was. */
function twoManShop(extractorClass: string): GameState {
  const state = newGame({ difficulty: 'veryEasy' });
  placeEquipment(state, 'tableSaw', { variantId: 'standard', x: 6, y: 1 });
  placeEquipment(state, 'edgebander', { variantId: 'standard', x: 12, y: 1 });
  placeEquipment(state, 'extractor', { variantId: extractorClass, x: 18, y: 6 });
  withAir(state);
  atAPlace(state, 'owner', 'tableSaw');
  atAPlace(state, 'staff-1', 'edgebander');
  return state;
}

describe('what a machine asks of the air and what a fan gives it', () => {
  it('is Piotr’s table, class by class', () => {
    expect(EXTRACTION_DEMAND.tableSaw).toEqual({
      used: 800,
      budget: 900,
      standard: 1100,
      pro: 1400,
      industrial: 2200,
    });
    // The two hand classes of the edgebander want none: they are used at a bench.
    expect(extractionDemandOf({ specId: 'edgebander', variantId: 'used' })).toBe(0);
    expect(extractionDemandOf({ specId: 'edgebander', variantId: 'budget' })).toBe(0);
    expect(extractionDemandOf({ specId: 'edgebander', variantId: 'standard' })).toBe(1400);
    expect(extractionDemandOf({ specId: 'thicknesser', variantId: 'standard' })).toBe(1500);
    // The timber tool set's line of the table went with it: it is no longer in the game
    // (PIOTR, 24.09; v53).
    expect(EXTRACTION_DEMAND).not.toHaveProperty('solidWoodTools');
    expect(extractionDemandOf({ specId: 'cnc', variantId: 'standard' })).toBe(1600);
    // The spray booth has extraction of its own and is not counted here.
    expect(extractionDemandOf({ specId: 'sprayBooth', variantId: 'standard' })).toBe(0);
    // A bench and a rack ask for nothing at all.
    expect(extractionDemandOf({ specId: 'workbench', variantId: 'budget' })).toBe(0);

    expect(EXTRACTION_CAPACITY.extractor).toEqual({
      used: 1000,
      budget: 1000,
      standard: 2000,
      pro: 3600,
      industrial: 8000,
    });
    expect(extractionCapacityOf({ specId: 'dustSystem', variantId: 'standard' })).toBe(12000);
    expect(extractionCapacityOf({ specId: 'flexiSystem', variantId: 'standard' })).toBe(15000);
    expect(extractionCapacityOf({ specId: 'tableSaw', variantId: 'used' })).toBe(0);
    // A fifth of the fan is left spare, so a hall is worked to 0.83 of what it pulls.
    expect(EXTRACTION_MARGIN).toBe(0.83);
  });
});

describe('the sums for a two man shop', () => {
  it('is short on a standard extractor, and says so in Piotr’s own words', () => {
    const check = extractionCheck(twoManShop('standard'));
    expect(check.demand).toBe(2500);
    expect(check.capacity).toBe(2000);
    expect(check.allowed).toBe(1660);
    expect(check.short).toBe(true);
    expect(check.line).toBe('Extraction short: 2,500 of 1,660 usable');
  });

  it('is fine on a pro extractor', () => {
    const check = extractionCheck(twoManShop('pro'));
    expect(check.demand).toBe(2500);
    expect(check.capacity).toBe(3600);
    expect(check.allowed).toBe(2988);
    expect(check.short).toBe(false);
    expect(check.line).toBe('');
  });

  it('adds several extractors up, because the hall is one duct run', () => {
    const state = twoManShop('standard');
    expect(underExtracted(state)).toBe(true);
    placeEquipment(state, 'extractor', { variantId: 'standard', x: 18, y: 8, id: 'kit-fan-2' });
    expect(extractionCheck(state).capacity).toBe(4000);
    expect(underExtracted(state)).toBe(false);
  });

  it('counts an ungated machine whenever it is connected, and a gated one only while it runs', () => {
    // The duct is open through every ungated branch, so the idle bander still pulls on the fan
    // while the saw runs; an automatic gate on its drop shuts its branch until a man is at it
    // (PIOTR; CLAUDE.md T13 3.11).
    const state = twoManShop('standard');
    const bander = state.equipment.find((item) => item.specId === 'edgebander');
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    if (!bander || !saw) throw new Error('no machines');
    offHisPlace(state, 'staff-1');
    expect(extractionCheck(state).demand).toBe(2500);
    expect(underExtracted(state)).toBe(true);
    // The gate: the saw alone is 1,100 against the 1,660 the fan allows.
    state.gates.push(bander.id);
    expect(extractionCheck(state).demand).toBe(1100);
    expect(underExtracted(state)).toBe(false);
    // A gated machine with a man at it counts as it always did.
    atAPlace(state, 'staff-1', 'edgebander');
    expect(extractionCheck(state).demand).toBe(2500);
    expect(underExtracted(state)).toBe(true);
    // And the gate changes the air sum only: the dust the bander makes is the family's figure,
    // gated or not (CLAUDE.md T13 10.1).
    expect(dustGainPerMinute(state)).toBe(DUST_PER_PRODUCTION_MINUTE * UNDER_EXTRACTION_DUST_MULTIPLIER);
  });

  it('counts nothing at all while no machine runs, gates or no gates', () => {
    const state = twoManShop('standard');
    offHisPlace(state, 'owner');
    offHisPlace(state, 'staff-1');
    expect(extractionCheck(state).demand).toBe(0);
    expect(underExtracted(state)).toBe(false);
    expect(extractionCheck(state).line).toBe('');
  });

  it('counts a machine with no pipe as not served, and never as part of the sum', () => {
    const state = twoManShop('pro');
    const bander = state.equipment.find((item) => item.specId === 'edgebander');
    if (!bander) throw new Error('no edgebander');
    state.pipes = state.pipes.filter((run) => run.equipmentId !== bander.id);
    const check = extractionCheck(state);
    expect(check.demand).toBe(1100);
    expect(check.short).toBe(true);
    expect(check.line).toBe('Extraction: a machine is not connected');
    // Served again the moment it is connected (CLAUDE.md T13 3.19, 10.1).
    state.pipes.push({ id: 'pipe-b', equipmentId: bander.id, extractorId: 'x', tiles: [], metres: 1 });
    expect(extractionCheck(state).demand).toBe(2500);
    expect(extractionCheck(state).short).toBe(false);
  });

  it('counts nothing that is only on order, or sold', () => {
    const state = twoManShop('pro');
    const fan = state.equipment.find((item) => item.specId === 'extractor');
    if (!fan) throw new Error('no extractor');
    fan.soldOnDay = 3;
    // A machine that is sold stops working the minute the sale is made (CLAUDE.md T8 3.5).
    expect(extractionCheck(state).capacity).toBe(0);
    expect(underExtracted(state)).toBe(true);
  });
});

describe('what a minute of under extraction costs', () => {
  it('takes 0.30 off everything the hall turns out, through the one breakdown', () => {
    const fine = twoManShop('pro');
    const short = twoManShop('standard');
    expect(hallProductivityFactor(fine)).toBeCloseTo(1, 6);
    expect(hallProductivityFactor(short)).toBeCloseTo(1 - UNDER_EXTRACTION_OUTPUT_PENALTY, 6);
    const line = outputBreakdown(short).lines.find((entry) =>
      entry.label.startsWith('Extraction short'),
    );
    expect(line?.points).toBeCloseTo(-UNDER_EXTRACTION_OUTPUT_PENALTY, 6);
    expect(line?.hall).toBe(true);
    // And the line is not there at all when the sums are fine.
    expect(
      outputBreakdown(fine).lines.some((entry) => entry.label.startsWith('Extraction short')),
    ).toBe(false);
  });

  it('raises the dust three times as fast, the way a broken extractor does', () => {
    expect(UNDER_EXTRACTION_DUST_MULTIPLIER).toBe(3);
    expect(dustGainPerMinute(twoManShop('pro'))).toBeCloseTo(DUST_PER_PRODUCTION_MINUTE, 10);
    expect(dustGainPerMinute(twoManShop('standard'))).toBeCloseTo(
      DUST_PER_PRODUCTION_MINUTE * UNDER_EXTRACTION_DUST_MULTIPLIER,
      10,
    );
  });

  it('says so on a chip over the floor, and never stops a machine', () => {
    const said = hallProblems(twoManShop('standard')).map((problem) => problem.text);
    expect(said.join(' ')).toContain('Extraction short: 2,500 of 1,660 usable');
    expect(said.join(' ')).toContain('everything is 30% slower');
    expect(hallProblems(twoManShop('pro')).join(' ')).not.toContain('Extraction short');
  });
});

describe('a job made in a dusty workshop', () => {
  function job(productionMinutes: number, dustyMinutes: number): Job {
    const state = newGame();
    state.enquiries = [];
    const enquiry = placeEnquiry(state, { price: 4000 });
    const next = acceptNow(state, enquiry.id, false);
    const made = firstJob(next);
    made.productionMinutes = productionMinutes;
    made.dustyMinutes = dustyMinutes;
    return made;
  }

  it('loses a point of rating past a tenth of its own minutes, and not before', () => {
    expect(DUSTY_JOB_SHARE).toBe(0.1);
    expect(madeInADustyWorkshop(job(1000, 100))).toBe(false);
    expect(madeInADustyWorkshop(job(1000, 101))).toBe(true);
    // A job nobody has worked a minute of is not dusty.
    expect(madeInADustyWorkshop(job(0, 0))).toBe(false);
  });

  it('is a point off the client’s verdict, and a line on the company board', () => {
    const state = newGame();
    state.enquiries = [];
    const enquiry = placeEnquiry(state, { price: 4000 });
    const next = acceptNow(state, enquiry.id, false);
    const made = firstJob(next);
    made.productionMinutes = 600;
    made.dustyMinutes = 300;
    const clean = ratingFor(made);
    const rating = applyRating(next, made);
    expect(rating).toBe(clean - DUSTY_JOB_RATING);
    expect(next.reputationLog.map((entry) => entry.reason)).toContain(
      `${made.name}: dusty workshop`,
    );
  });
});

describe('the bench in an under extracted hall', () => {
  it('keeps working, and writes down the dusty minutes on the piece', () => {
    // The owner alone at a standard saw, on the cheapest fan there is: 1,100 against the 830 a
    // single bag extractor allows, so every minute he works is a dusty one.
    const state = fillRack(twoManShop('used'), 40);
    placeEquipment(state, 'workbench', { variantId: 'budget', x: 2, y: 8 });
    state.enquiries = [];
    const enquiry = placeEnquiry(state, { price: 4000, deadlineDays: 40 });
    let next = acceptNow(state, enquiry.id, false);
    firstJob(next).stage = 'ready';
    next = act(next, { type: 'WORK_HERE', jobId: firstJob(next).id });
    next = runClock(next, 30);
    const made = firstJob(next);
    // No machine stopped: the work went in, and every minute of it was a dusty one.
    expect(made.productionMinutes).toBeGreaterThan(0);
    expect(made.dustyMinutes).toBe(made.productionMinutes);
    expect(made.labourRemaining).toBeLessThan(made.labourValue);
  });
});
