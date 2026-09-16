import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { kitBlockFor } from '../../src/engine/board';
import {
  EXPRESS_PRICE_UPLIFT_MAX,
  EXPRESS_PRICE_UPLIFT_MIN,
  LOW_REPUTATION_PRICE_FACTOR,
  PRODUCT_TEMPLATES,
  RATING_EXPRESS_ON_TIME,
  RATING_ON_TIME,
  REPUTATION_MAX,
  REPUTATION_MIN,
  TIMBER_BRANCH_MIN_SPINDLE_CLASS,
} from '../../src/engine/constants';
import {
  availableFinishes,
  findTemplate,
  lockReasonFor,
  marketPriceFactor,
  missingEquipment,
  priceFor,
  template,
  templatesForReputation,
} from '../../src/engine/catalog';
import { clampReputation, ratingFor, reputationTier } from '../../src/engine/reputation';
import { callsForPrice } from '../../src/engine/calls';
import type { Job } from '../../src/engine/index';
import { buyNow, newGame, placeEquipment } from '../helpers';

function job(partial: Partial<Job>): Job {
  return {
    id: 'job-1',
    templateId: 'garageShelves',
    name: 'Garage shelves',
    price: 400,
    basePrice: 400,
    sizeMultiplier: 1,
    finish: 'laminate',
    materialKind: 'sheet',
    materialCost: 160,
    sheets: 2,
    sheetsUsed: 0,
    sheetsReserved: 0,
    kind: 'residential',
    budget: 400,
    nightMinutes: 0,
    needsSpindle: false,
    blockedBy: '',
    bespokeMaterial: false,
    express: false,
    byHand: false,
    sawFallback: true,
    needsMeasure: false,
    labourValue: 160,
    labourRemaining: 0,
    acceptedDay: 1,
    finishedDay: null,
    deliverOnDay: null,
    dueDay: 11,
    stage: 'completed',
    calls: [],
    callsMissed: 0,
    designMinutesRemaining: 0,
    assignedTo: null,
    secondAssignee: null,
    stageRuns: [],
    completedDay: 11,
    daysLate: 0,
    depositPaid: 200,
    balancePaid: 200,
    penalty: 0,
    emailsUnanswered: 0,
    wetFinish: false,
    productionMinutes: 0,
    dustyMinutes: 0,
    rating: null,
    overdueWarned: false,
    ...partial,
  };
}

describe('templates', () => {
  it('finds a template and throws on a name that is not there', () => {
    expect(template('wardrobe').basePrice).toBe(1600);
    expect(findTemplate('nope')).toBeNull();
    expect(() => template('nope')).toThrow();
  });

  it('opens up as the reputation rises, on the minus 50 to 100 scale', () => {
    expect(templatesForReputation(0).map((entry) => entry.id)).toEqual([
      'garageShelves',
      'bookcase',
    ]);
    expect(templatesForReputation(-50).map((entry) => entry.id)).toEqual([
      'garageShelves',
      'bookcase',
    ]);
    expect(templatesForReputation(5).map((entry) => entry.id)).toContain('tvUnit');
    expect(templatesForReputation(10).map((entry) => entry.id)).toContain('wardrobe');
    expect(templatesForReputation(10).map((entry) => entry.id)).toContain('oakDiningTable');
    expect(templatesForReputation(20).map((entry) => entry.id)).toContain('smallKitchen');
    expect(templatesForReputation(20)).toHaveLength(PRODUCT_TEMPLATES.length);
  });
});

describe('tool gating', () => {
  it('names the missing tools on an empty unit', () => {
    const state = newGame();
    expect(missingEquipment(state, template('garageShelves'))).toEqual(['tableSaw', 'drill']);
    expect(lockReasonFor(state, template('garageShelves'))).toBe('Needs table saw, cordless drill');
  });

  it('clears the lock once the tools are bought', () => {
    let state = newGame();
    state = buyNow(state, 'tableSaw');
    state = buyNow(state, 'drill');
    expect(lockReasonFor(state, template('garageShelves'))).toBeNull();
    // The bookcase still needs the edgebander.
    expect(lockReasonFor(state, template('bookcase'))).toBe('Needs edgebander');
  });

  it('locks solid wood behind the solid wood tools', () => {
    const state = newGame();
    expect(lockReasonFor(state, template('oakDiningTable'))).toBe('Needs solid wood tools');
  });

  it('offers laminate only while there is no spray booth', () => {
    const state = newGame();
    expect(availableFinishes(state, template('wardrobe'))).toEqual(['laminate']);
  });

  it('locks the lacquered and the handleless kitchen behind the spindle moulder', () => {
    // The shared family both kitchens need: a J profile and shaker fronts are moulded
    // (PIOTR; CLAUDE.md T13 3.13). The board greys them without it, through the one kit check.
    const state = newGame();
    state.reputation = 100;
    for (const specId of ['tableSaw', 'drill', 'edgebander', 'sprayBooth', 'extractor']) {
      placeEquipment(state, specId, { variantId: 'standard' });
    }
    for (const id of ['lacqueredKitchen', 'handlelessKitchen']) {
      expect(template(id).requiredEquipment, id).toContain('spindleMoulder');
      expect(lockReasonFor(state, template(id)), id).toBe('Needs spindle moulder');
      expect(kitBlockFor(state, template(id))?.reason, id).toBe('no spindle moulder');
    }
    placeEquipment(state, 'spindleMoulder', { variantId: 'used' });
    for (const id of ['lacqueredKitchen', 'handlelessKitchen']) {
      expect(lockReasonFor(state, template(id)), id).toBeNull();
      expect(kitBlockFor(state, template(id)), id).toBeNull();
    }
  });

  it('writes the future timber gate in the constants, and nothing reads it', () => {
    // Class 3 or above on the spindle moulder is the gate to timber production; the branch
    // choice is parked, so the constant exists and nothing reads it (CLAUDE.md T13 3.13, 8).
    expect(TIMBER_BRANCH_MIN_SPINDLE_CLASS).toBe('standard');
    const files: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) walk(path);
        else if (path.endsWith('.ts')) files.push(path);
      }
    };
    // Vitest runs from the repository root, the way the deliveries test reads the source too.
    walk('src');
    const readers = files.filter(
      (path) =>
        !path.endsWith('constants.ts') &&
        readFileSync(path, 'utf8').includes('TIMBER_BRANCH_MIN_SPINDLE_CLASS'),
    );
    expect(readers).toEqual([]);
  });
});

describe('prices', () => {
  it('rounds a size variant to the nearest 10', () => {
    expect(priceFor(400, 1, 0, 1)).toBe(400);
    expect(priceFor(400, 1.37, 0, 1)).toBe(550);
    expect(priceFor(900, 0.8, 0, 1)).toBe(720);
    expect(priceFor(1200, 1.6, 0, 1)).toBe(1920);
  });

  it('adds the express uplift before rounding', () => {
    // The band is 30% to 50% from Turn 10, drawn uniformly (CLAUDE.md T10 3.7).
    expect(EXPRESS_PRICE_UPLIFT_MIN).toBe(0.3);
    expect(EXPRESS_PRICE_UPLIFT_MAX).toBe(0.5);
    expect(priceFor(1000, 1, EXPRESS_PRICE_UPLIFT_MIN, 1)).toBe(1300);
    expect(priceFor(1000, 1, EXPRESS_PRICE_UPLIFT_MAX, 1)).toBe(1500);
    expect(priceFor(400, 1, EXPRESS_PRICE_UPLIFT_MIN, 1)).toBe(520);
  });

  it('offers barely profitable work below the low reputation band', () => {
    expect(marketPriceFactor(0)).toBe(1);
    expect(marketPriceFactor(-25)).toBe(1);
    expect(marketPriceFactor(-26)).toBe(LOW_REPUTATION_PRICE_FACTOR);
    expect(marketPriceFactor(REPUTATION_MIN)).toBe(LOW_REPUTATION_PRICE_FACTOR);
    expect(priceFor(1000, 1, 0, LOW_REPUTATION_PRICE_FACTOR)).toBe(850);
  });
});

describe('reputation', () => {
  it('maps a score onto a tier below 0, 0 to 20, and above 20', () => {
    expect(reputationTier(-50)).toBe(0);
    expect(reputationTier(-1)).toBe(0);
    expect(reputationTier(0)).toBe(1);
    expect(reputationTier(19)).toBe(1);
    expect(reputationTier(20)).toBe(2);
    expect(reputationTier(100)).toBe(2);
  });

  it('keeps the score inside the minus 50 to 100 scale', () => {
    expect(clampReputation(900)).toBe(REPUTATION_MAX);
    expect(clampReputation(-900)).toBe(REPUTATION_MIN);
    expect(clampReputation(12)).toBe(12);
  });

  it('rates on time, late and express jobs on the new weights', () => {
    expect(ratingFor(job({}))).toBe(RATING_ON_TIME);
    expect(ratingFor(job({ express: true }))).toBe(RATING_EXPRESS_ON_TIME);
    expect(ratingFor(job({ daysLate: 3 }))).toBe(-3);
    expect(ratingFor(job({ express: true, daysLate: 1 }))).toBe(-1);
    expect(ratingFor(job({ byHand: true }))).toBe(RATING_ON_TIME);
  });
});

describe('the call counts of 9.1 against the price curve of 8.10', () => {
  it('agrees with the 9.1 column at every base price', () => {
    // 9.1 lists calls per template, 8.10 gives them by price. They agree at the base price of all
    // six templates, so the curve is the one code path and the column is its check. Size variants
    // follow the curve: a 0.8 size TV unit gets 2 calls, not the 3 the column shows.
    for (const entry of PRODUCT_TEMPLATES) {
      expect(callsForPrice(entry.basePrice), entry.id).toBe(entry.calls);
    }
  });
});
