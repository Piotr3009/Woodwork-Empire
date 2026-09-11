import { describe, expect, it } from 'vitest';
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

const sample: GameState = {
  version: STATE_VERSION,
  seed: 1234,
  rng: 1234,
  nextId: 1,
  difficulty: 'easy',
  playerName: 'Piotr',
  companyName: 'Woodwork Empire',
  clock: { day: 1, minute: 0 },
  speed: 1,
  cash: 20000,
  reputation: 0,
  dust: 0,
  unit: {
    areaM2: 60,
    widthTiles: 24,
    depthTiles: 10,
    rentMonthly: 1200,
    ratesMonthly: 450,
    benchSlots: 4,
    sheetCapacity: 12,
  },
  owner: {
    present: true,
    minutesByCategory: { admin: 0, design: 0, workshop: 0 },
    minutesWorked: 0,
    overtimeHours: 0,
    fatigue: 0,
    wentHome: false,
    currentTaskId: null,
    productionJobId: null,
    sickDaysRemaining: 0,
    sickStartDay: null,
    stayHome: false,
  },
  software: { mode: 'none', tier: 'basic', jobsRemaining: 0 },
  stock: { sheets: 0, capacity: 12, tempStorageSheets: 0 },
  equipment: [],
  workers: [],
  enquiries: [],
  jobs: [],
  tasks: [],
  deliveries: [],
  finance: {
    overdraftLimit: -10000,
    arrearsAmount: 0,
    arrearsMonths: 0,
    firstArrearsDay: null,
    day: { income: 0, costs: 0, byCategory: {} },
    week: { income: 0, costs: 0, byCategory: {} },
    month: { income: 0, costs: 0, byCategory: {} },
  },
  ledger: [],
  eventQueue: [],
  activeEvent: null,
  dayStats: { jobsAdvanced: [], jobsCompleted: [], productionMinutes: 0, dustAtStart: 0 },
  gameOver: null,
};

describe('GameState', () => {
  it('survives a JSON round trip unchanged', () => {
    const copy = JSON.parse(JSON.stringify(sample)) as GameState;
    expect(copy).toEqual(sample);
    expect(JSON.stringify(copy)).toBe(JSON.stringify(sample));
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
    expect(labour / (OWNER_LABOUR_PER_MINUTE * WORKER_RATES.normal) / 480).toBeCloseTo(10, 6);
    expect(labour / (OWNER_LABOUR_PER_MINUTE * WORKER_RATES.poor) / 480).toBeCloseTo(13.333, 3);
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
