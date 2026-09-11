import { describe, expect, it } from 'vitest';
import { EXPRESS_PRICE_UPLIFT, PRODUCT_TEMPLATES } from '../../src/engine/constants';
import {
  availableFinishes,
  findTemplate,
  lockReasonFor,
  missingEquipment,
  priceFor,
  template,
  templatesForReputation,
} from '../../src/engine/catalog';
import { clampReputation, ratingFor, reputationTier } from '../../src/engine/reputation';
import type { Job } from '../../src/engine/index';
import { act, newGame } from '../helpers';

function job(partial: Partial<Job>): Job {
  return {
    id: 'job-1',
    templateId: 'garageShelves',
    name: 'Garage shelves',
    price: 400,
    sizeMultiplier: 1,
    finish: 'laminate',
    materialKind: 'sheet',
    materialCost: 160,
    materialMode: 'perJob',
    sheets: 2,
    bespokeMaterial: false,
    express: false,
    byHand: false,
    needsMeasure: false,
    measureDone: false,
    labourValue: 160,
    labourRemaining: 0,
    labourTotal: 160,
    acceptedDay: 1,
    dueDay: 11,
    stage: 'completed',
    callsRemaining: 0,
    designMinutesRemaining: 0,
    assignedTo: null,
    completedDay: 11,
    daysLate: 0,
    depositPaid: 200,
    balancePaid: 200,
    penalty: 0,
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

  it('opens up as the reputation rises', () => {
    expect(templatesForReputation(0).map((entry) => entry.id)).toEqual([
      'garageShelves',
      'bookcase',
    ]);
    expect(templatesForReputation(0.5).map((entry) => entry.id)).toContain('tvUnit');
    expect(templatesForReputation(1).map((entry) => entry.id)).toContain('wardrobe');
    expect(templatesForReputation(1.5).map((entry) => entry.id)).toContain('smallKitchen');
    expect(templatesForReputation(5)).toHaveLength(PRODUCT_TEMPLATES.length);
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
    state = act(state, { type: 'BUY_EQUIPMENT', specId: 'tableSaw' });
    state = act(state, { type: 'BUY_EQUIPMENT', specId: 'drill' });
    expect(lockReasonFor(state, template('garageShelves'))).toBeNull();
    // The bookcase still needs the edgebander.
    expect(lockReasonFor(state, template('bookcase'))).toBe('Needs hand edgebander');
  });

  it('locks solid wood behind the solid wood tools', () => {
    const state = newGame();
    expect(lockReasonFor(state, template('oakDiningTable'))).toBe('Needs solid wood tools');
  });

  it('offers laminate only while there is no spray booth', () => {
    const state = newGame();
    expect(availableFinishes(state, template('wardrobe'))).toEqual(['laminate']);
  });
});

describe('prices', () => {
  it('rounds a size variant to the nearest 10', () => {
    expect(priceFor(400, 1, 0)).toBe(400);
    expect(priceFor(400, 1.37, 0)).toBe(550);
    expect(priceFor(900, 0.8, 0)).toBe(720);
    expect(priceFor(1200, 1.6, 0)).toBe(1920);
  });

  it('adds the express uplift before rounding', () => {
    expect(priceFor(1000, 1, EXPRESS_PRICE_UPLIFT)).toBe(1200);
    expect(priceFor(400, 1, EXPRESS_PRICE_UPLIFT)).toBe(480);
  });
});

describe('reputation', () => {
  it('maps a score onto a tier', () => {
    expect(reputationTier(0)).toBe(0);
    expect(reputationTier(0.9)).toBe(0);
    expect(reputationTier(1)).toBe(1);
    expect(reputationTier(2.4)).toBe(1);
    expect(reputationTier(2.5)).toBe(2);
    expect(reputationTier(5)).toBe(2);
    expect(reputationTier(-1)).toBe(0);
  });

  it('keeps the score inside the scale', () => {
    expect(clampReputation(9)).toBe(5);
    expect(clampReputation(-9)).toBe(-5);
    expect(clampReputation(1.2)).toBe(1.2);
  });

  it('rates on time, late and express jobs', () => {
    expect(ratingFor(job({}))).toBe(0.3);
    expect(ratingFor(job({ express: true }))).toBe(0.5);
    expect(ratingFor(job({ daysLate: 3 }))).toBe(-0.3);
    expect(ratingFor(job({ express: true, daysLate: 1 }))).toBe(-0.1);
    expect(ratingFor(job({ byHand: true }))).toBe(0.3);
  });
});
