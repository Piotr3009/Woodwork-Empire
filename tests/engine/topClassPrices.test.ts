/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// The two top classes of a machine a fifth dearer (PIOTR, 04.10: "machines 20% up, but only the
// two highest; leave the cheap ones as they are"; CLAUDE.md T27 2.5, section 7): the fourteen
// prices, everything else of the catalogue as it was, and a machine already owned selling on its
// own purchase price.

import { describe, expect, it } from 'vitest';
import { MACHINE_REPAIR_COST_FRACTION, SERVICE_COST_FRACTION } from '../../src/engine/constants';
import { findSpec, salePriceFor } from '../../src/engine/index';
import { insuranceForClass, repairCostFor, serviceCostFor } from '../../src/engine/machines';
import { migrateState } from '../../src/engine/migrate';
import type { GameState } from '../../src/engine/index';
import { buyNow, newGame, placeEquipment } from '../helpers';

/** The class prices of a family, used to industrial. */
function prices(family: string): number[] {
  return (findSpec(family)?.variants ?? []).map((variant) => variant.price);
}

describe('the fourteen prices (CLAUDE.md T27 2.5)', () => {
  it('puts the pro and the industrial class of the seven machine families up by exactly a fifth', () => {
    const fourteen: Array<[string, number, number]> = [
      ['tableSaw', 18000, 30000],
      ['edgebander', 19200, 38400],
      ['compressor', 10800, 26400],
      ['thicknesser', 13200, 26400],
      ['spindleMoulder', 19200, 33600],
      ['cnc', 90000, 144000],
      ['sprayBooth', 38400, 66000],
    ];
    const before: Record<string, [number, number]> = {
      tableSaw: [15000, 25000],
      edgebander: [16000, 32000],
      compressor: [9000, 22000],
      thicknesser: [11000, 22000],
      spindleMoulder: [16000, 28000],
      cnc: [75000, 120000],
      sprayBooth: [32000, 55000],
    };
    for (const [family, pro, industrial] of fourteen) {
      expect(findSpec(family)?.category, family).toBe('machine');
      expect(prices(family).slice(3), family).toEqual([pro, industrial]);
      const [oldPro, oldIndustrial] = before[family] ?? [0, 0];
      expect(pro, family).toBe(Math.round(oldPro * 1.2));
      expect(industrial, family).toBe(Math.round(oldIndustrial * 1.2));
    }
  });

  it('leaves the used, the budget and the standard class of the seven what they were', () => {
    expect(prices('tableSaw').slice(0, 3)).toEqual([1800, 5000, 7000]);
    expect(prices('edgebander').slice(0, 3)).toEqual([500, 900, 7500]);
    expect(prices('compressor').slice(0, 3)).toEqual([300, 1200, 3500]);
    expect(prices('thicknesser').slice(0, 3)).toEqual([900, 2500, 5500]);
    expect(prices('spindleMoulder').slice(0, 3)).toEqual([1500, 4000, 9000]);
    expect(prices('cnc').slice(0, 3)).toEqual([18000, 30000, 45000]);
    expect(prices('sprayBooth').slice(0, 3)).toEqual([6000, 11000, 18000]);
  });

  it('leaves every other family what it was, the top classes of the extractor, the van, the forklift, the bench, the rack and the cabinet among them', () => {
    expect(prices('extractor')).toEqual([400, 600, 1400, 3200, 7500]);
    expect(prices('van')).toEqual([3500, 6000, 9000, 14000, 22000]);
    expect(prices('forklift').slice(1)).toEqual([1800, 6000, 12000, 20000]);
    expect(prices('workbench')).toEqual([120, 250, 450, 900, 2200]);
    expect(prices('sheetRack')).toEqual([200, 400, 900, 1800, 4500]);
    expect(prices('toolCabinet')).toEqual([90, 175, 350, 700, 1400]);
    // And the single class kit: the central systems, the drying racks, the tool changer head and
    // the pelletiser are not machines of five classes.
    for (const family of ['dustSystem', 'flexiSystem', 'dryingRacks', 'cncHead', 'pelletiser']) {
      expect(findSpec(family)?.variants, family).toHaveLength(1);
    }
  });

  it('carries the new price into what the game reads off it for a machine bought tonight', () => {
    const saw = findSpec('tableSaw')?.variants.find((variant) => variant.id === 'pro');
    if (saw === undefined) throw new Error('no pro saw');
    // The insurance line of its card: the property rate on 18,000 and not on 15,000.
    expect(insuranceForClass(saw)).toBe(360);
    const bought = buyNow(newGame({ difficulty: 'veryEasy' }), 'tableSaw', 'pro');
    const item = bought.equipment.find((entry) => entry.specId === 'tableSaw');
    if (item === undefined) throw new Error('the saw did not land');
    expect(item.purchasePrice).toBe(18000);
    expect(serviceCostFor(item)).toBe(18000 * SERVICE_COST_FRACTION);
    expect(repairCostFor(item)).toBe(18000 * MACHINE_REPAIR_COST_FRACTION);
    expect(salePriceFor(item)).toBe(9000);
  });

  it('sells a pro saw bought before tonight for half its own purchase price', () => {
    // A v39 save of a hall with a pro saw bought at v80's 15,000.
    const state: GameState = newGame({ difficulty: 'veryEasy' });
    placeEquipment(state, 'tableSaw', { variantId: 'pro', x: 8, y: 4, id: 'kit-old-saw' });
    const raw = JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
    const finance = raw.finance as Record<string, unknown>;
    delete finance.taxPaidForYear;
    delete finance.taxWarnedForYear;
    const equipment = raw.equipment as Array<Record<string, unknown>>;
    const old = equipment.find((entry) => entry.id === 'kit-old-saw');
    if (old === undefined) throw new Error('no saw in the save');
    old.purchasePrice = 15000;
    raw.version = 39;
    const lifted = migrateState(raw, 39);
    const saw = lifted?.equipment.find((entry) => entry.id === 'kit-old-saw');
    if (saw === undefined) throw new Error('the saw did not load');
    expect(saw.purchasePrice).toBe(15000);
    expect(salePriceFor(saw)).toBe(7500);
    expect(serviceCostFor(saw)).toBe(1500);
  });
});
