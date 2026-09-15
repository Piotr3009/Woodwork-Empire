// Dust in cubic metres, one figure per family, and bags only on the extractor (PIOTR, 15.09;
// CLAUDE.md T12 2.1, 2.3). A dearer saw does not make more dust: the material makes the dust and
// not the price of the machine. Extraction power stays per class, because a big edgebander has
// five pipes and a small one has one.

import { describe, expect, it } from 'vitest';
import {
  BAG_M3,
  DUST_OUTPUT_M3_PER_HOUR,
  EQUIPMENT_SPECS,
  EXTRACTION_DEMAND,
  EXTRACTOR_BAGS,
  bagsToM3,
} from '../../src/engine/constants';
import { findSpec } from '../../src/engine/machines';

describe('dust is one figure per family, in cubic metres an hour of use', () => {
  it('has an entry for every family of the machine category, and every entry is a family', () => {
    for (const spec of EQUIPMENT_SPECS) {
      if (spec.category !== 'machine') continue;
      expect(DUST_OUTPUT_M3_PER_HOUR, spec.id).toHaveProperty(spec.id);
    }
    for (const family of Object.keys(DUST_OUTPUT_M3_PER_HOUR)) {
      expect(findSpec(family), family).not.toBeNull();
      expect(DUST_OUTPUT_M3_PER_HOUR[family], family).toBeGreaterThanOrEqual(0);
    }
  });

  it('is Piotr’s table: a CNC fills half a bag a day and a saw four times less', () => {
    expect(DUST_OUTPUT_M3_PER_HOUR).toMatchObject({
      tableSaw: 0.015,
      edgebander: 0.01,
      thicknesser: 0.25,
      cnc: 0.06,
      cncHead: 0.06,
      solidWoodTools: 0,
      sprayBooth: 0,
      drill: 0,
    });
    // About half a bag a day off a CNC cutting all day (0.48 of one, to the figure), and a saw
    // at a quarter of that: the point of reference the whole table is drawn from (T12 2.1).
    expect((DUST_OUTPUT_M3_PER_HOUR.cnc ?? 0) * 8).toBeCloseTo(0.5 * BAG_M3, 1);
    expect((DUST_OUTPUT_M3_PER_HOUR.tableSaw ?? 0) * 4).toBeCloseTo(
      DUST_OUTPUT_M3_PER_HOUR.cnc ?? 0,
      10,
    );
  });

  it('carries no per class bag factor and no bag interval anywhere in the catalogue', () => {
    // The dust is the family's and the air is the class's (PIOTR). Nothing in the catalogue says
    // a bag every N minutes any more, on any class of any family (CLAUDE.md T12 2.4).
    for (const spec of EQUIPMENT_SPECS) {
      expect(Object.keys(spec), spec.id).not.toContain('bagInterval');
      for (const variant of spec.variants) {
        expect(Object.keys(variant), `${spec.id}.${variant.id}`).not.toContain('bagIntervalFactor');
      }
    }
    // The air, by contrast, is still a ladder per class, untouched (CLAUDE.md T12 2.2).
    expect(EXTRACTION_DEMAND.tableSaw).toEqual({
      used: 800,
      budget: 900,
      standard: 1100,
      pro: 1400,
      industrial: 2200,
    });
  });
});

describe('bags on the extractor, and only there', () => {
  it('gives every class of extractor its bags, off the descriptions on the shelf', () => {
    const extractor = findSpec('extractor');
    if (extractor === null) throw new Error('no extractor family');
    for (const variant of extractor.variants) {
      expect(EXTRACTOR_BAGS, variant.id).toHaveProperty(variant.id);
      expect(EXTRACTOR_BAGS[variant.id], variant.id).toBeGreaterThan(0);
    }
    expect(EXTRACTOR_BAGS).toEqual({ used: 1, budget: 1, standard: 2, pro: 4, industrial: 10 });
  });

  it('holds a bag to be one cubic metre, through the one conversion', () => {
    expect(BAG_M3).toBe(1);
    expect(bagsToM3(EXTRACTOR_BAGS.industrial ?? 0)).toBe(10);
    expect(bagsToM3(0)).toBe(0);
  });
});
