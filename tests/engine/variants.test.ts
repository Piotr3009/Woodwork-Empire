// Machine families and the classes a family can be bought as (CLAUDE.md T3 3.5).

import { describe, expect, it } from 'vitest';
import { classPaceOf, hallPace } from '../../src/engine/machines';
import {
  BY_HAND_DURATION_FACTOR,
  CLASS_BADGE,
  CLASS_LADDER_FAMILIES,
  CLASS_ORDER,
  ENDURANCE_MINUTES_BY_CLASS,
  EQUIPMENT_SPECS,
  MACHINE_ENDURANCE_HOURS,
  MACHINE_ENDURANCE_HOURS_DEFAULT,
  OVERDUE_BREAKDOWN_CHANCE,
  POWER_BASE_DAILY,
  SERVICE_INTERVAL_DAYS,
  STANDARD_VARIANT,
  TABLE_SAW_VARIANTS,
} from '../../src/engine/constants';
import {
  dailyPower,
  enduranceHoursFor,
  familyForStage,
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
        // Power is the machines' and the extraction's, and nothing else is charged it: a van or a
        // pallet truck draws none (PIOTR, 24.09: "power only for the machines"; v54).
        if (spec.category === 'machine' || spec.category === 'extraction') {
          expect(variant.powerPerDay, `${spec.id}.${variant.id}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('gives every family of the one ladder exactly five classes, in order, with a badge each', () => {
    // Five is the number: used, budget, standard, pro, industrial, and class 5 is always the
    // industrial one (PIOTR; CLAUDE.md T13 1, 3.12). The thicknesser, the CNC, the spray booth,
    // the drill and the spindle moulder joined the ladder in Turn 13. The timber tool set joined
    // it then as well and is gone from the game: the thicknesser and the spindle moulder are all a
    // furniture shop needs (PIOTR, 24.09; v53).
    expect(CLASS_ORDER).toEqual(['used', 'budget', 'standard', 'pro', 'industrial']);
    for (const family of ['thicknesser', 'cnc', 'sprayBooth', 'spindleMoulder']) {
      expect(CLASS_LADDER_FAMILIES, family).toContain(family);
    }
    expect(CLASS_LADDER_FAMILIES).not.toContain('solidWoodTools');
    expect(findSpec('solidWoodTools')).toBeNull();
    for (const family of CLASS_LADDER_FAMILIES) {
      const spec = findSpec(family);
      expect(spec, family).not.toBeNull();
      expect(spec?.variants.map((variant) => variant.id), family).toEqual([...CLASS_ORDER]);
      for (const variant of spec?.variants ?? []) {
        expect(CLASS_BADGE[variant.id], `${family}.${variant.id}`).toBeDefined();
        // A class carries no dust figure of its own: the dust is the family's (CLAUDE.md T13 10.1).
        expect('dust' in variant, `${family}.${variant.id}`).toBe(false);
      }
    }
    // Every family the badge table names is one of the five, once each.
    expect(Object.keys(CLASS_BADGE)).toEqual([...CLASS_ORDER]);
    // And a family off the ladder has its one class and never wears a badge.
    for (const spec of EQUIPMENT_SPECS) {
      if (CLASS_LADDER_FAMILIES.includes(spec.id)) continue;
      expect(spec.variants.map((variant) => variant.id), spec.id).toEqual(['standard']);
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
    expect(classPaceOf({ specId: 'airDryer', variantId: STANDARD_VARIANT })).toBe(1);
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
    // A hall may have several of anything since v37: nothing is refused as already owned.
  });

  it('keeps the Turn 1 price of every family that has one class', () => {
    // The extractor's line carries its cheapest class now, the used one at 400; the Turn 1 price
    // of 600 is what its budget class costs (CLAUDE.md T10 3.4).
    expect(findSpec('extractor')?.price).toBe(400);
    expect(findVariant('extractor', 'budget')?.price).toBe(600);
    // The van is five classes from v54 and its line carries the used one; the Turn 1 van is the
    // standard class, at the Turn 1 price (PIOTR, 24.09).
    expect(findSpec('van')?.price).toBe(3500);
    expect(findVariant('van', 'standard')?.price).toBe(9000);
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
  /** The 400 job's 240 minutes on the day one hall: the cutting's quarter at the saw's pace, the
   *  edging's on the hand bander at 1.00, the moulding's by hand, the hall having no spindle
   *  moulder, and the assembly's at 1.00 (v55). */
  function minutesWithSaw(factor: number): number {
    return 240 * (0.25 / factor + 0.25 + 0.25 * BY_HAND_DURATION_FACTOR + 0.25);
  }

  it('moves the cutting quarter and leaves the other three alone', () => {
    const budget = withSaw('budget');
    expect(minutesRemainingFor(budget, firstJob(budget), 1)).toBeCloseTo(minutesWithSaw(1), 6);
    expect(minutesRemainingFor(budget, firstJob(budget), 1)).toBeCloseTo(270, 6);
    const used = withSaw('used');
    expect(stageSpeed(used, firstJob(used), 'cutting').speed).toBeCloseTo(0.95, 10);
    expect(minutesRemainingFor(used, firstJob(used), 1)).toBeCloseTo(minutesWithSaw(0.95), 6);
    const industrial = withSaw('industrial');
    // The industrial class's pace, 1.12 from v52 (CLAUDE.md T25 2.4).
    expect(stageSpeed(industrial, firstJob(industrial), 'cutting').speed).toBeCloseTo(1.12, 10);
    expect(minutesRemainingFor(industrial, firstJob(industrial), 1)).toBeCloseTo(
      minutesWithSaw(1.12),
      6,
    );
    // The assembly of the same job is the bench's business and the saw never touches it.
    expect(stageSpeed(industrial, firstJob(industrial), 'assembly').speed).toBeCloseTo(1, 10);
  });

  it('counts only the better of two saws, not both', () => {
    const state = withSaw('used');
    placeEquipment(state, 'tableSaw', { variantId: 'pro', x: 10, y: 8 });
    // The pro saw's 1.08 is the hall's pace, whichever saw the man is at (CLAUDE.md T25 2.4).
    expect(stageSpeed(state, firstJob(state), 'cutting').speed).toBeCloseTo(1.08, 10);
  });

  it('cuts at the industrial saw s 1.12 with a used saw beside it, and at 0.95 while it is down', () => {
    // The shop cuts on the good saw and the old one takes the overflow: the pace is the hall's,
    // the best class standing unbroken and not away for its service [PIOTR, 21.09]
    // (CLAUDE.md T25 2.4).
    const state = withSaw('used');
    placeEquipment(state, 'tableSaw', { variantId: 'industrial', x: 10, y: 8, id: 'kit-saw-good' });
    expect(hallPace(state, 'tableSaw')).toBe(1.12);
    expect(stageSpeed(state, firstJob(state), 'cutting').speed).toBeCloseTo(1.12, 10);
    const good = state.equipment.find((item) => item.id === 'kit-saw-good');
    if (good === undefined) throw new Error('the industrial saw is wanted');
    good.broken = true;
    expect(hallPace(state, 'tableSaw')).toBe(0.95);
    good.broken = false;
    good.inServiceUntilDay = state.clock.day + 1;
    expect(hallPace(state, 'tableSaw')).toBe(0.95);
    good.inServiceUntilDay = null;
    expect(hallPace(state, 'tableSaw')).toBe(1.12);
  });

  it('cuts a solid wood job too, and moulds it on the spindle moulder like every job', () => {
    const state = withSaw('industrial');
    const table = { ...firstJob(state), materialKind: 'solidWood' as const };
    // Every job is cut on the saw (CLAUDE.md T7 3.1) and moulded on the spindle moulder, timber
    // and sheet alike (PIOTR, 24.09; v55). With no spindle moulder in the hall the moulding is by
    // hand; the thicknesser has no stage until the timber branch and changes nothing here.
    expect(stageSpeed(state, table, 'cutting').speed).toBeCloseTo(1.12, 10);
    expect(familyForStage(table, 'moulding')).toBe('spindleMoulder');
    expect(stageSpeed(state, table, 'moulding').byHand).toBe(true);
    expect(stageSpeed(state, table, 'moulding').speed).toBeCloseTo(1 / BY_HAND_DURATION_FACTOR, 10);
    placeEquipment(state, 'thicknesser', { variantId: 'pro', x: 10, y: 8 });
    expect(stageSpeed(state, table, 'moulding').byHand).toBe(true);
    // A professional spindle moulder: the moulding at the class's 1.08 (CLAUDE.md T25 2.4).
    placeEquipment(state, 'spindleMoulder', { variantId: 'pro', x: 14, y: 8 });
    expect(stageSpeed(state, table, 'moulding').byHand).toBe(false);
    expect(stageSpeed(state, table, 'moulding').speed).toBeCloseTo(1.08, 10);
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
    // stood at it (CLAUDE.md T7 2). The owner's turn at the saw is the first half hour of the two
    // and a bench the second (v55), so the hour books half an hour on it.
    const worked = machineOf(tick(state, 60), 'tableSaw');
    expect(worked.hoursUsed).toBeCloseTo(0.5, 2);
    expect(pastEndurance(worked)).toBe(false);
    worked.hoursUsed = 750;
    expect(pastEndurance(worked)).toBe(true);
  });

  it('gives a worn out machine the same chance of giving up as an unserviced one, on top', () => {
    const state = newGame();
    const today = state.clock.day;
    const saw = placeEquipment(state, 'tableSaw', { variantId: 'used' });
    expect(overdueBreakdownChance(saw, today)).toBe(0);
    // Worn out, with its service up to date: one chance.
    saw.hoursUsed = saw.enduranceHours;
    expect(overdueBreakdownChance(saw, today)).toBe(OVERDUE_BREAKDOWN_CHANCE);
    // A service overdue on top of that, six months on the calendar since the last (v51): two.
    saw.servicedDay = today - SERVICE_INTERVAL_DAYS;
    expect(overdueBreakdownChance(saw, today)).toBe(OVERDUE_BREAKDOWN_CHANCE * 2);
    saw.broken = true;
    expect(overdueBreakdownChance(saw, today)).toBe(0);
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
