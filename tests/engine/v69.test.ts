// v69 (PIOTR, 03.10): "we have to add a rack that holds 320, looking the same but red, at 20k,
// fifteen days of waiting and a hundred thousand hours, because the racks take too much of our
// space". One class on its own line of the Storage tab, on the industrial rack's own floor.

import { describe, expect, it } from 'vitest';
import {
  CLASS_LADDER_FAMILIES,
  SHEET_RACK_HIGH,
  STANDARD_VARIANT,
} from '../../src/engine/constants';
import { canBuy } from '../../src/engine/game';
import { canPlaceSpec } from '../../src/engine/layout';
import {
  enduranceHoursFor,
  findSpec,
  isSellableFamily,
  sheetCapacityOf,
  zoneOf,
} from '../../src/engine/machines';
import { rackCapacity } from '../../src/engine/materials';
import { standingCell } from '../../src/engine/stations';
import { pickSprite, spriteFiles } from '../../src/render/sprites';
import { newGame, placeEquipment } from '../helpers';

describe('the high capacity rack', () => {
  it('is one class at Piotr s figures: 320 sheets, 20,000, fifteen days, a hundred thousand hours', () => {
    const spec = findSpec(SHEET_RACK_HIGH);
    if (!spec) throw new Error('the rack is wanted in the catalogue');
    expect(spec.name).toBe('High capacity rack');
    expect(spec.tab).toBe('storage');
    expect(spec.category).toBe('storage');
    expect(spec.variants.map((variant) => variant.id)).toEqual([STANDARD_VARIANT]);
    expect(spec.variants[0]?.price).toBe(20000);
    expect(spec.variants[0]?.deliveryDays).toBe(15);
    expect(sheetCapacityOf({ specId: SHEET_RACK_HIGH, variantId: STANDARD_VARIANT })).toBe(320);
    expect(enduranceHoursFor(SHEET_RACK_HIGH, STANDARD_VARIANT)).toBe(100000);
    // The ladder of the Racks folder is still five classes: this is a line of its own.
    expect(CLASS_LADDER_FAMILIES).not.toContain(SHEET_RACK_HIGH);
    expect(findSpec('sheetRack')?.variants).toHaveLength(5);
    // No more standing wanted than any rack wants, and it sells like any rack.
    expect(spec.minReputation).toBe(findSpec('sheetRack')?.minReputation);
    expect(isSellableFamily(SHEET_RACK_HIGH)).toBe(true);
  });

  it('stands on the floor of an industrial rack and holds twice its sheets', () => {
    expect(zoneOf(SHEET_RACK_HIGH, STANDARD_VARIANT)).toEqual(zoneOf('sheetRack', 'industrial'));
    expect(sheetCapacityOf({ specId: SHEET_RACK_HIGH, variantId: STANDARD_VARIANT })).toBe(
      2 * sheetCapacityOf({ specId: 'sheetRack', variantId: 'industrial' }),
    );
  });

  it('is a rack to the hall: bought, placed, counted into the stock s room and stood at', () => {
    const state = newGame({ difficulty: 'veryEasy' });
    state.cash = 50000;
    expect(canBuy(state, SHEET_RACK_HIGH).ok).toBe(true);
    // A pound past what the overdraft allows.
    state.cash = 19999 + state.finance.overdraftLimit;
    expect(canBuy(state, SHEET_RACK_HIGH)).toEqual({ ok: false, reason: 'Not enough cash' });
    expect(canPlaceSpec(state, SHEET_RACK_HIGH, 10, 8, null).ok).toBe(true);
    const before = rackCapacity(state);
    const rack = placeEquipment(state, SHEET_RACK_HIGH, { x: 10, y: 8, id: 'kit-high-rack' });
    expect(rackCapacity(state)).toBe(before + 320);
    // A man fetching sheets has a cell to stand on beside it.
    const cell = standingCell(state, rack, 'operator');
    expect(Number.isFinite(cell.x) && Number.isFinite(cell.y)).toBe(true);
  });

  it('has its picture in red, in both turns, on the industrial rack s own canvas', () => {
    const files = spriteFiles();
    expect(files).toContain('sheetRackHigh.standard.png');
    expect(files).toContain('sheetRackHigh.standard.r.png');
    expect(pickSprite(files, SHEET_RACK_HIGH, STANDARD_VARIANT)).toBe('/sprites/sheetRackHigh.standard.png');
    expect(pickSprite(files, SHEET_RACK_HIGH, STANDARD_VARIANT, 1)).toBe('/sprites/sheetRackHigh.standard.r.png');
  });
});
