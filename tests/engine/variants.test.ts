// Machine families and the classes a family can be bought as (CLAUDE.md T3 3.5).

import { describe, expect, it } from 'vitest';
import {
  ENDURANCE_MINUTES_BY_CLASS,
  EQUIPMENT_SPECS,
  MACHINE_ENDURANCE_HOURS,
  MACHINE_ENDURANCE_HOURS_DEFAULT,
  OVERDUE_BREAKDOWN_CHANCE,
  POWER_BASE_DAILY,
  SERVICE_INTERVAL_HOURS,
  STANDARD_VARIANT,
  TABLE_SAW_VARIANTS,
} from '../../src/engine/constants';
import {
  dailyPower,
  enduranceHoursFor,
  findSpec,
  findVariant,
  footprintOf,
  minutesRemainingFor,
  stageSpeed,
  overdueBreakdownChance,
  pastEndurance,
  tick,
  variantFor,
  zoneOf,
} from '../../src/engine/index';
import type { Equipment, GameState } from '../../src/engine/index';
import {
  acceptNow,
  act,
  buyNow,
  buyStartingKit,
  fillRack,
  firstJob,
  newGame,
  placeEnquiry,
  placeEquipment,
} from '../helpers';

function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error('missing test fixture');
  return value;
}

function machineOf(state: GameState, specId: string): Equipment {
  return required(state.equipment.find((item) => item.specId === specId));
}

/** A very easy game with the day 1 kit and the named class of saw in the hall. */
function withSaw(variantId: string): GameState {
  let state = buyStartingKit(newGame({ difficulty: 'veryEasy' }), { sawVariant: variantId });
  state.enquiries = [];
  const enquiry = placeEnquiry(state, { price: 400, name: 'Garage shelves' });
  state = fillRack(acceptNow(state, enquiry.id, false));
  firstJob(state).stage = 'ready';
  return state;
}

describe('every catalogue line is a family', () => {
  it('gives each one at least one variant, and the line carries the cheapest price', () => {
    for (const spec of EQUIPMENT_SPECS) {
      expect(spec.variants.length, spec.id).toBeGreaterThanOrEqual(1);
      expect(spec.price, spec.id).toBe(spec.variants[0]?.price);
      for (const variant of spec.variants) {
        expect(variant.description.length, `${spec.id}.${variant.id}`).toBeGreaterThan(10);
        expect(variant.powerPerDay, `${spec.id}.${variant.id}`).toBeGreaterThan(0);
      }
    }
  });

  it('gives four families their five classes, and everything else one standard', () => {
    for (const family of ['tableSaw', 'workbench', 'sheetRack', 'edgebander']) {
      expect(findSpec(family)?.variants.map((variant) => variant.id), family).toEqual([
        'used',
        'budget',
        'standard',
        'pro',
        'industrial',
      ]);
    }
    // Every class says what it stands on and what floor it reserves (CLAUDE.md T7 3.3, 3.6).
    for (const family of ['tableSaw', 'workbench', 'sheetRack', 'edgebander']) {
      for (const variant of findSpec(family)?.variants ?? []) {
        const stands = footprintOf(family, variant.id);
        const zone = zoneOf(family, variant.id);
        expect(stands.width, `${family}.${variant.id}`).toBeGreaterThan(0);
        expect(zone.width >= stands.width || zone.width === 0).toBe(true);
        expect(zone.depth >= stands.depth || zone.depth === 0).toBe(true);
      }
    }
    // The better shelving is a class of the rack now, not a family of its own.
    expect(findSpec('sheetRackBetter')).toBeNull();
  });

  it('gives the table saw its five classes and a family with no ladder one standard', () => {
    expect(findSpec('tableSaw')?.variants.map((variant) => variant.id)).toEqual([
      'used',
      'budget',
      'standard',
      'pro',
      'industrial',
    ]);
    expect(TABLE_SAW_VARIANTS.map((variant) => variant.price)).toEqual([
      1800, 5000, 7000, 15000, 25000,
    ]);
    // Every machine family has its five classes from Turn 13 (CLAUDE.md T13 3.12); a line that
    // is not a machine family, like the air dryer, still has the one synthetic standard class.
    expect(findSpec('thicknesser')?.variants).toHaveLength(5);
    expect(findSpec('airDryer')?.variants).toHaveLength(1);
    expect(findSpec('airDryer')?.variants[0]?.id).toBe(STANDARD_VARIANT);
    expect(findSpec('airDryer')?.variants[0]?.outputFactor).toBe(1);
  });

  it('gives the extractor and the compressor the five classes of Turn 10', () => {
    for (const family of ['extractor', 'compressor']) {
      expect(findSpec(family)?.variants.map((variant) => variant.id), family).toEqual([
        'used',
        'budget',
        'standard',
        'pro',
        'industrial',
      ]);
    }
    // Piotr's prices [TUNE] of CLAUDE.md T10 3.4.
    expect(findSpec('extractor')?.variants.map((variant) => variant.price)).toEqual([
      400, 600, 1400, 3200, 7500,
    ]);
    expect(findSpec('compressor')?.variants.map((variant) => variant.price)).toEqual([
      300, 1200, 3500, 9000, 22000,
    ]);
    // The footprints of 3.4, and the zone is the footprint for both families.
    const extractorSizes = [
      [1, 1, 2],
      [1, 1, 2],
      [2, 1, 2],
      [3, 1, 2.5],
      [5, 1, 2.5],
    ];
    const compressorSizes = [
      [1, 1, 1],
      [1, 1, 1],
      [2, 1, 1.5],
      [2, 1, 1.5],
      [2, 2, 2.5],
    ];
    const classes = ['used', 'budget', 'standard', 'pro', 'industrial'];
    classes.forEach((id, index) => {
      expect(footprintOf('extractor', id), `extractor.${id}`).toEqual({
        width: extractorSizes[index]?.[0],
        depth: extractorSizes[index]?.[1],
        height: extractorSizes[index]?.[2],
      });
      expect(zoneOf('extractor', id), `extractor.${id} zone`).toEqual({
        width: extractorSizes[index]?.[0],
        depth: extractorSizes[index]?.[1],
      });
      expect(footprintOf('compressor', id), `compressor.${id}`).toEqual({
        width: compressorSizes[index]?.[0],
        depth: compressorSizes[index]?.[1],
        height: compressorSizes[index]?.[2],
      });
      expect(zoneOf('compressor', id), `compressor.${id} zone`).toEqual({
        width: compressorSizes[index]?.[0],
        depth: compressorSizes[index]?.[1],
      });
    });
    // A hall may have several of either, so neither is refused as already owned.
    expect(findSpec('extractor')?.stackable).toBe(true);
    expect(findSpec('compressor')?.stackable).toBe(true);
  });

  it('keeps the Turn 1 price of every family that has one class', () => {
    // The extractor's line carries its cheapest class now, the used one at 400; the Turn 1 price
    // of 600 is what its budget class costs (CLAUDE.md T10 3.4).
    expect(findSpec('extractor')?.price).toBe(400);
    expect(findVariant('extractor', 'budget')?.price).toBe(600);
    expect(findSpec('van')?.price).toBe(9000);
    // The saw's cheapest class is the used one at the Turn 1 price (CLAUDE.md T3 3.5), and the
    // Turn 1 items of the three families that got their classes tonight are the budget ones
    // (CLAUDE.md T7 3.6).
    expect(findSpec('tableSaw')?.price).toBe(1800);
    expect(findVariant('edgebander', 'budget')?.price).toBe(900);
    expect(findVariant('workbench', 'budget')?.price).toBe(250);
    expect(findVariant('sheetRack', 'budget')?.price).toBe(400);
    // The line carries the cheapest way into the family.
    expect(findSpec('edgebander')?.price).toBe(500);
    expect(findSpec('workbench')?.price).toBe(120);
    expect(findSpec('sheetRack')?.price).toBe(200);
  });
});

describe('buying a class of machine', () => {
  it('pays that class and stands that class in the hall', () => {
    const before = newGame({ difficulty: 'veryEasy' });
    const bought = buyNow(before, 'tableSaw', 'industrial');
    const saw = required(bought.equipment[0]);
    expect(saw.variantId).toBe('industrial');
    expect(saw.purchasePrice).toBe(25000);
    expect(before.cash - bought.cash).toBe(25000);
    expect(variantFor(saw)?.name).toBe('Industrial table saw');
  });

  it('buys the cheapest class when none is named, which is the used saw', () => {
    const bought = buyNow(newGame(), 'tableSaw');
    expect(bought.equipment[0]?.variantId).toBe('used');
    expect(bought.equipment[0]?.purchasePrice).toBe(1800);
  });

  it('refuses a class the workshop cannot pay for, and names the reason', () => {
    const poor = newGame({ difficulty: 'hard' });
    const tried = buyNow(poor, 'tableSaw', 'industrial');
    expect(tried.equipment).toHaveLength(0);
  });
});

describe('what a class of saw does to the work', () => {
  /** The cutting quarter of a 400 job, at this class of saw, and the three quarters after it. */
  function minutesWithSaw(factor: number): number {
    return 240 * (0.25 / factor + 0.75);
  }

  it('moves the cutting quarter and leaves the other three alone', () => {
    const budget = withSaw('budget');
    expect(minutesRemainingFor(budget, firstJob(budget), 1)).toBeCloseTo(240, 6);
    const used = withSaw('used');
    expect(stageSpeed(used, firstJob(used), 'cutting').speed).toBeCloseTo(0.95, 10);
    expect(minutesRemainingFor(used, firstJob(used), 1)).toBeCloseTo(minutesWithSaw(0.95), 6);
    const industrial = withSaw('industrial');
    expect(stageSpeed(industrial, firstJob(industrial), 'cutting').speed).toBeCloseTo(1.3, 10);
    expect(minutesRemainingFor(industrial, firstJob(industrial), 1)).toBeCloseTo(
      minutesWithSaw(1.3),
      6,
    );
    // The assembly of the same job is the bench's business and the saw never touches it.
    expect(stageSpeed(industrial, firstJob(industrial), 'assembly').speed).toBeCloseTo(1, 10);
  });

  it('counts only the better of two saws, not both', () => {
    const state = withSaw('used');
    placeEquipment(state, 'tableSaw', { variantId: 'pro', x: 10, y: 8 });
    expect(stageSpeed(state, firstJob(state), 'cutting').speed).toBeCloseTo(1.15, 10);
  });

  it('cuts a solid wood job too, and leaves its machining to the timber tools', () => {
    const state = withSaw('industrial');
    const table = { ...firstJob(state), materialKind: 'solidWood' as const };
    // Every job is cut on the saw (CLAUDE.md T7 3.1); only the machining takes the material.
    expect(stageSpeed(state, table, 'cutting').speed).toBeCloseTo(1.3, 10);
    expect(stageSpeed(state, table, 'machining').byHand).toBe(true);
  });
});

describe('what a class of saw does to the life of the machine', () => {
  it('gives a used saw a quarter of the hours and an industrial one twice them', () => {
    expect(MACHINE_ENDURANCE_HOURS.tableSaw).toBe(3000);
    expect(MACHINE_ENDURANCE_HOURS_DEFAULT).toBe(5000);
    expect(enduranceHoursFor('tableSaw', 'used')).toBe(750);
    expect(enduranceHoursFor('tableSaw', 'budget')).toBe(3000);
    expect(enduranceHoursFor('tableSaw', 'industrial')).toBe(6000);
    // A compressor's life is written in running minutes, and the hours come off that table and
    // not off the family's own figure (PIOTR; CLAUDE.md T10 3.2).
    expect(ENDURANCE_MINUTES_BY_CLASS.compressor?.standard).toBe(200000);
    expect(enduranceHoursFor('compressor', STANDARD_VARIANT)).toBeCloseTo(200000 / 60, 6);
    expect(enduranceHoursFor('compressor', 'used')).toBe(1000);
    expect(enduranceHoursFor('compressor', 'industrial')).toBeCloseTo(800000 / 60, 6);
    // A family with no minutes of its own still reads the family hours and the class ladder,
    // which follows the saw's: the standard class has 1.2 of the family's hours (T13 3.12).
    expect(enduranceHoursFor('thicknesser', STANDARD_VARIANT)).toBe(2500 * 1.2);
  });

  it('runs the hours down as the bench works, and calls it worn out at the end', () => {
    const state = act(withSaw('used'), { type: 'WORK_HERE', jobId: null });
    const saw = machineOf(state, 'tableSaw');
    expect(saw.hoursUsed).toBe(0);
    expect(saw.enduranceHours).toBe(750);
    // An hour of cutting is an hour on the saw's own clock: its hours are the minutes somebody
    // stood at it (CLAUDE.md T7 2).
    const worked = machineOf(tick(state, 60), 'tableSaw');
    expect(worked.hoursUsed).toBeCloseTo(1, 2);
    expect(pastEndurance(worked)).toBe(false);
    worked.hoursUsed = 750;
    expect(pastEndurance(worked)).toBe(true);
  });

  it('gives a worn out machine the same chance of giving up as an unserviced one, on top', () => {
    const state = newGame();
    const saw = placeEquipment(state, 'tableSaw', { variantId: 'used' });
    expect(overdueBreakdownChance(saw)).toBe(0);
    // Worn out, and serviced the hour it wore out: one chance.
    saw.hoursUsed = saw.enduranceHours;
    saw.serviceHours = saw.hoursUsed;
    expect(overdueBreakdownChance(saw)).toBe(OVERDUE_BREAKDOWN_CHANCE);
    // A service overdue on top of that: two.
    saw.serviceHours = saw.hoursUsed - SERVICE_INTERVAL_HOURS;
    expect(overdueBreakdownChance(saw)).toBe(OVERDUE_BREAKDOWN_CHANCE * 2);
    saw.broken = true;
    expect(overdueBreakdownChance(saw)).toBe(0);
  });
});

describe('power', () => {
  it('charges what each class in the hall draws, not a flat rate per machine', () => {
    const used = newGame();
    placeEquipment(used, 'tableSaw', { variantId: 'used' });
    expect(dailyPower(used)).toBe(POWER_BASE_DAILY + 3);
    const industrial = newGame();
    placeEquipment(industrial, 'tableSaw', { variantId: 'industrial' });
    expect(dailyPower(industrial)).toBe(POWER_BASE_DAILY + 7);
  });
});
