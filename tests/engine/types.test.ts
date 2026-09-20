import { describe, expect, it } from 'vitest';
import { createGame } from '../../src/engine/game';
import {
  DIFFICULTIES,
  EQUIPMENT_SPECS,
  LABOUR_FRACTION,
  MATERIAL_FRACTION,
  OWNER_LABOUR_PER_MINUTE,
  PRODUCT_TEMPLATES,
  PROFIT_FRACTION,
  STATE_VERSION,
  WORKER_RATES,
} from '../../src/engine/constants';
import type { GameState } from '../../src/engine/types';

// One code path builds states: the engine's own createGame.
const sample: GameState = createGame({
  seed: 1234,
  difficulty: 'easy',
  playerName: 'Piotr',
  companyName: 'Woodwork Empire',
  showWhy: true,
});

describe('GameState', () => {
  it('survives a JSON round trip unchanged', () => {
    const copy = JSON.parse(JSON.stringify(sample)) as GameState;
    expect(copy).toEqual(sample);
    expect(JSON.stringify(copy)).toBe(JSON.stringify(sample));
  });

  it('carries the version the loader checks, and it moved with the shape', () => {
    // The metre grid and the painted floor changed what an anchor means, so a Turn 4 save cannot
    // be opened: the loader refuses anything that is not this number (src/cloud/saves.ts). Turn 8
    // added the list of what is bought and not yet delivered, so a Turn 7 save goes the same way,
    // and Turn 9 made a lorry load one unloading of several orders (CLAUDE.md T9 3.1). Turn 11
    // put the owner's own day on the state, and the last week of them (CLAUDE.md T11 3.1). Turn 12
    // moved the bags onto the extractor, and a Turn 11 save is lifted rather than refused
    // (CLAUDE.md T12 2.3). Turn 23 wrote the closed months down on the state
    // (CLAUDE.md T23 section 4).
    expect(STATE_VERSION).toBe(20);
    expect(sample.version).toBe(STATE_VERSION);
  });

  it('measures the unit in cells, with nothing left of the old tile fields', () => {
    expect(sample.unit.widthCells).toBe(20);
    expect(sample.unit.depthCells).toBe(10);
    const unit = sample.unit as unknown as Record<string, unknown>;
    expect(unit.widthTiles).toBeUndefined();
    expect(unit.depthTiles).toBeUndefined();
    // Every anchor in the starting layout is inside the painted floor.
    for (const item of sample.equipment) {
      expect(item.anchorY, item.specId).toBeLessThan(sample.unit.depthCells);
    }
  });

  it('holds no non JSON values', () => {
    const walk = (value: unknown, path: string): void => {
      if (value === null) return;
      const kind = typeof value;
      if (kind === 'function' || kind === 'symbol' || kind === 'undefined') {
        throw new Error(`${path} is ${kind}`);
      }
      if (kind === 'object') {
        expect(value instanceof Map, `${path} is a Map`).toBe(false);
        expect(value instanceof Set, `${path} is a Set`).toBe(false);
        expect(value instanceof Date, `${path} is a Date`).toBe(false);
        expect(Object.getPrototypeOf(value) === Object.prototype || Array.isArray(value)).toBe(true);
        for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
          walk(child, `${path}.${key}`);
        }
      }
    };
    walk(sample, 'state');
  });
});

describe('constants', () => {
  it('splits a job price into material, labour and profit', () => {
    expect(MATERIAL_FRACTION + LABOUR_FRACTION + PROFIT_FRACTION).toBeCloseTo(1, 10);
  });

  it('matches the owner productivity example from CLAUDE.md 8.5', () => {
    // A 6400 wardrobe carries 2560 of labour value.
    const labour = 6400 * LABOUR_FRACTION;
    expect(labour).toBe(2560);
    expect(labour / OWNER_LABOUR_PER_MINUTE / 480).toBeCloseTo(8, 6);
    // The ladder is Piotr's own four figures from tonight: the very experienced man matches the
    // owner, and everybody below him is slower, so the same wardrobe is ten days for an
    // experienced man and thirteen and a third for one with no experience (CLAUDE.md T21 2.9).
    expect(labour / (OWNER_LABOUR_PER_MINUTE * WORKER_RATES.senior) / 480).toBeCloseTo(8, 6);
    expect(labour / (OWNER_LABOUR_PER_MINUTE * WORKER_RATES.experienced) / 480).toBeCloseTo(10, 6);
    expect(labour / (OWNER_LABOUR_PER_MINUTE * WORKER_RATES.novice) / 480).toBeCloseTo(13.3333, 4);
  });

  it('has unique ids in every catalogue', () => {
    const ids = (list: Array<{ id: string }>): string[] => list.map((entry) => entry.id);
    for (const list of [EQUIPMENT_SPECS, PRODUCT_TEMPLATES, DIFFICULTIES]) {
      const seen = ids(list);
      expect(new Set(seen).size).toBe(seen.length);
    }
  });

  it('only references equipment that exists in the catalogue', () => {
    const known = new Set(EQUIPMENT_SPECS.map((spec) => spec.id));
    for (const template of PRODUCT_TEMPLATES) {
      for (const required of template.requiredEquipment) {
        expect(known.has(required), `${template.id} requires ${required}`).toBe(true);
      }
    }
    for (const spec of EQUIPMENT_SPECS) {
      for (const required of spec.requires) {
        expect(known.has(required), `${spec.id} requires ${required}`).toBe(true);
      }
    }
  });
});
