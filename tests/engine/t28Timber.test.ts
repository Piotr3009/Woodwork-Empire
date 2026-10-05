/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// Turn 28, sections 2.3 and 2.6 to 2.10: the timber department's windows and doors, as the engine
// makes them. The five templates and their locks, the deadline's lead, the plan of seven stages, the
// two nights, the glass, and the board that offers them to a company in the 800 m2 hall
// (CLAUDE.md T28 2.6 to 2.10, 2.3, section 7). Every figure is [TUNE: chat] unless Piotr's.

import { describe, expect, it } from 'vitest';
import {
  FINISHES_LACQUER,
  MINUTES_PER_WORKING_DAY,
  PRODUCT_TEMPLATES,
  TIMBER_EQUIPMENT,
  TIMBER_LEAD_DAYS,
} from '../../src/engine/constants';
import { lockReasonFor, missingEquipment, template } from '../../src/engine/catalog';
import { blockFor, enquiryDeadlineDays, kitBlockFor } from '../../src/engine/board';
import { deadlineDaysFrom, labourValueFor, ownerDaysFor, stagedJob } from '../../src/engine/jobs';
import { jobMinutesFor } from '../../src/engine/stages';
import { workshopRate } from '../../src/engine/plan';
import type { GameState } from '../../src/engine/index';
import { buyStartingKit, newGame, placeEquipment } from '../helpers';

const FIVE: Array<[string, string, number, string, number, number[]]> = [
  ['casementWindows', 'Casement windows', 9000, 'cuttersCasement', 25, [0, 0, 12]],
  ['sashWindows', 'Sash windows', 14000, 'cuttersSash', 30, [0, 0, 10]],
  ['frenchDoors', 'French doors', 6000, 'cuttersDoor', 25, [0, 0, 10]],
  ['patioDoors', 'Patio doors', 10000, 'cuttersDoor', 30, [0, 0, 8]],
  ['bifoldDoors', 'Bifold doors', 18000, 'cuttersDoor', 35, [0, 0, 6]],
];

/** The day one hall with every machine a window wants but what is named, at a standing that opens
 *  every timber template. */
function timberHall(without: string[] = []): GameState {
  const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
  state.cash = 1000000;
  state.reputation = 40;
  const kit: Array<[string, string, number, number]> = [
    ['crossCut', 'standard', 2, 9],
    ['planer', 'standard', 7, 9],
    ['spindleMoulder', 'standard', 12, 9],
    ['sander', 'standard', 16, 6],
    ['framePress', 'standard', 2, 6],
    ['sprayBooth', 'standard', 7, 5],
    ['cuttersSash', 'standard', 0, 0],
    ['cuttersCasement', 'standard', 0, 0],
    ['cuttersDoor', 'standard', 0, 0],
  ];
  for (const [id, variantId, x, y] of kit) {
    if (without.includes(id)) continue;
    placeEquipment(state, id, { variantId, x, y, id: `kit-${id}` });
  }
  return state;
}

describe('the five windows and doors (CLAUDE.md T28 2.6)', () => {
  it('are solid wood, lacquered, measured, never by hand, and want the cutters of their kind', () => {
    for (const [id, name, basePrice, cutters, minReputation, weightsByTier] of FIVE) {
      expect(template(id), id).toMatchObject({
        name,
        basePrice,
        material: 'solidWood',
        calls: 4,
        needsMeasure: true,
        allowedFinishes: FINISHES_LACQUER,
        byHandAllowed: false,
        cutters,
        minReputation,
        weightsByTier,
      });
      expect(template(id).requiredEquipment, id).toEqual(TIMBER_EQUIPMENT);
    }
    expect(TIMBER_EQUIPMENT).toEqual(['crossCut', 'planer', 'spindleMoulder', 'sander', 'framePress', 'sprayBooth']);
    // Every template the game had wants no cutters, the oak table among them.
    const others = PRODUCT_TEMPLATES.filter((entry) => !FIVE.some(([id]) => id === entry.id));
    expect(others).toHaveLength(9);
    for (const entry of others) expect(entry.cutters, entry.id).toBeNull();
    expect(template('oakDiningTable').requiredEquipment).toEqual(['thicknesser', 'spindleMoulder']);
  });

  it('counts the cutter set as kit, and locks a live enquiry without it', () => {
    const state = timberHall(['cuttersSash']);
    expect(missingEquipment(state, template('sashWindows'))).toEqual(['cuttersSash']);
    expect(lockReasonFor(state, template('sashWindows'))).toBe('Needs sash window cutter set');
    // The casement's own set is there: it is free.
    expect(lockReasonFor(state, template('casementWindows'))).toBeNull();
    expect(lockReasonFor(timberHall(), template('sashWindows'))).toBeNull();
    // Not held to the oak table's thicknesser: a window never asks for one.
    expect(state.equipment.some((item) => item.specId === 'thicknesser')).toBe(false);
    expect(lockReasonFor(timberHall(['crossCut', 'planer']), template('frenchDoors'))).toBe(
      'Needs cross cut saw, four sided planer',
    );
  });

  it('says what a company is short of in the order the brief has it', () => {
    const sash = template('sashWindows');
    // The reputation first.
    const low = timberHall();
    low.reputation = 20;
    expect(kitBlockFor(low, sash)).toEqual({ reason: 'reputation too low (needs 30)', where: '' });
    // Then the spray booth.
    expect(kitBlockFor(timberHall(['sprayBooth', 'crossCut']), sash)).toEqual({ reason: 'needs a spray booth', where: 'catalogue' });
    // Then the machines by name, the cutters among them.
    expect(kitBlockFor(timberHall(['crossCut', 'planer']), sash)).toEqual({
      reason: 'no cross cut saw, four sided planer',
      where: 'catalogue',
    });
    expect(kitBlockFor(timberHall(['planer', 'cuttersSash']), sash)).toEqual({
      reason: 'no four sided planer, sash window cutter set',
      where: 'catalogue',
    });
    expect(kitBlockFor(timberHall(['cuttersSash']), sash)).toEqual({ reason: 'no sash window cutter set', where: 'catalogue' });
    // Never the oak table's timber machines, which are the thicknesser and the spindle moulder.
    expect(kitBlockFor(timberHall(), sash)).toBeNull();
    // And then the hands against the deadline.
    expect(blockFor(timberHall(), sash, 1 + TIMBER_LEAD_DAYS, sash.basePrice)).toEqual({
      reason: 'too few people for the deadline',
      where: 'team',
    });
  });
});

describe('a timber deadline (CLAUDE.md T28 2.10)', () => {
  it('is the deadline every enquiry is given, and twelve working days on top', () => {
    expect(TIMBER_LEAD_DAYS).toBe(12);
    const state = timberHall();
    for (const [id] of FIVE) {
      const entry = template(id);
      for (const express of [false, true]) {
        const draw = { rng: 12345 };
        const old = deadlineDaysFrom(draw, {
          ownerDays: ownerDaysFor(state, labourValueFor(entry.basePrice), entry.material),
          price: entry.basePrice,
          express,
        });
        expect(enquiryDeadlineDays(state, entry, draw, entry.basePrice, express), `${id} ${express}`).toBe(old + 12);
      }
    }
    // A sheet template has no lead.
    const kitchen = template('handlelessKitchen');
    const draw = { rng: 777 };
    expect(enquiryDeadlineDays(state, kitchen, draw, kitchen.basePrice, false)).toBe(
      deadlineDaysFrom(draw, {
        ownerDays: ownerDaysFor(state, labourValueFor(kitchen.basePrice), kitchen.material),
        price: kitchen.basePrice,
        express: false,
      }),
    );
  });

  it('holds the workshop s hands against the days without the lead', () => {
    const state = timberHall();
    const entry = template('frenchDoors');
    const days = jobMinutesFor(state, stagedJob(labourValueFor(entry.basePrice), entry.material, false), workshopRate(state)) / MINUTES_PER_WORKING_DAY;
    const enough = Math.ceil(days);
    expect(blockFor(state, entry, enough + TIMBER_LEAD_DAYS, entry.basePrice)).toBeNull();
    expect(blockFor(state, entry, enough - 1 + TIMBER_LEAD_DAYS, entry.basePrice)?.reason).toBe('too few people for the deadline');
  });
});
