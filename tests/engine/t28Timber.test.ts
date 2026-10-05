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
import { readFileSync } from 'node:fs';
import {
  FINISHES_LACQUER,
  MINUTES_PER_WORKING_DAY,
  PRODUCT_TEMPLATES,
  TIMBER_EQUIPMENT,
  TIMBER_FAMILIES,
  TIMBER_STAGES,
  BY_HAND_DURATION_FACTOR,
  DRAWN_TURN_MINUTES,
  TIMBER_LEAD_DAYS,
} from '../../src/engine/constants';
import { lockReasonFor, missingEquipment, template } from '../../src/engine/catalog';
import { blockFor, enquiryDeadlineDays, kitBlockFor } from '../../src/engine/board';
import { deadlineDaysFrom, labourValueFor, ownerDaysFor, stagedJob } from '../../src/engine/jobs';
import {
  currentStage,
  jobMinutesFor,
  jobOnCnc,
  stageDoing,
  stageDone,
  stageLabel,
  stagePlanFor,
  stagesOf,
} from '../../src/engine/stages';
import { drawnPlaces } from '../../src/engine/drawn';
import { migrateState } from '../../src/engine/migrate';
import { planPlaces } from '../../src/engine/production';
import { workshopRate } from '../../src/engine/plan';
import type { GameState, Job } from '../../src/engine/index';
import {
  acceptNow,
  buyStartingKit,
  fillRack,
  firstJob,
  newGame,
  placeEnquiry,
  placeEquipment,
  testJoiner,
} from '../helpers';

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
        // The rule every enquiry has, off the owner days of the timber job's own plan (2.7).
        const old = deadlineDaysFrom(draw, {
          ownerDays: ownerDaysFor(state, labourValueFor(entry.basePrice), entry.material, false, true),
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
    const staged = stagedJob(labourValueFor(entry.basePrice), entry.material, false, 'laminate', false, true);
    const days = jobMinutesFor(state, staged, workshopRate(state)) / MINUTES_PER_WORKING_DAY;
    const enough = Math.ceil(days);
    expect(blockFor(state, entry, enough + TIMBER_LEAD_DAYS, entry.basePrice)).toBeNull();
    expect(blockFor(state, entry, enough - 1 + TIMBER_LEAD_DAYS, entry.basePrice)?.reason).toBe('too few people for the deadline');
  });
});

/** A sash window job taken on in the timber hall, at its first stage. */
function sashJob(state: GameState = timberHall()): { state: GameState; job: Job } {
  const enquiry = placeEnquiry(state, {
    templateId: 'sashWindows',
    name: 'Sash windows',
    price: 14000,
    finish: 'lacquer',
    materialKind: 'solidWood',
    needsMeasure: true,
    deadlineDays: 40,
  });
  const next = acceptNow(state, enquiry.id);
  return { state: next, job: firstJob(next) };
}

function day149(): GameState {
  const raw = JSON.parse(readFileSync('tests/fixtures/day149-v25.woodwork.json', 'utf8')) as {
    state: Record<string, unknown> & { version: number };
  };
  const state = migrateState(raw.state, raw.state.version);
  if (state === null) throw new Error('the day 149 save did not open');
  return state;
}

describe('a timber job s stages (CLAUDE.md T28 2.7)', () => {
  it('has the seven stages in the brief s order and shares, the benches its Glazing', () => {
    const { state, job } = sashJob();
    expect(job.timber).toBe(true);
    expect(stagesOf(state, job)).toEqual(TIMBER_STAGES);
    const plan = stagePlanFor(state, job);
    expect(plan.map((stage) => [stage.id, stage.label, stage.share, stage.family])).toEqual([
      ['crossCutting', 'Cross cutting', 0.08, 'crossCut'],
      ['planing', 'Planing', 0.12, 'planer'],
      ['moulding', 'Moulding', 0.25, 'spindleMoulder'],
      ['pressing', 'Pressing', 0.15, 'framePress'],
      ['sanding', 'Sanding', 0.12, 'sander'],
      ['finishing', 'Finishing', 0.13, 'sprayBooth'],
      ['assembly', 'Glazing', 0.15, 'workbench'],
    ]);
    expect(TIMBER_STAGES.reduce((sum, stage) => sum + stage.share, 0)).toBeCloseTo(1, 10);
    expect(plan[plan.length - 1]?.to).toBeCloseTo(job.labourValue, 6);
    // The words of a stage say so, on the card and over the man.
    expect(stageLabel('assembly', job)).toBe('Glazing');
    expect(stageDoing('assembly', true, true)).toBe('glazing');
    expect(stageDoing('crossCutting', true, true)).toBe('cross cutting');
    expect(stageDoing('pressing', true, true)).toBe('pressing');
    // A sheet job's are what they were.
    expect(stageLabel('assembly')).toBe('Assembly');
    expect(stageDoing('assembly', false)).toBe('assembling');
    // Never on the CNC.
    placeEquipment(state, 'cnc', { variantId: 'standard', x: 12, y: 3 });
    expect(jobOnCnc(state, job)).toBe(false);
  });

  it('goes by hand at the machine stages the hall has no machine for, at the by hand rate', () => {
    const { state, job } = sashJob(timberHall(['planer']));
    const planing = stagePlanFor(state, job).find((stage) => stage.id === 'planing');
    expect(planing?.byHand).toBe(true);
    expect(planing?.speed).toBeCloseTo(1 / BY_HAND_DURATION_FACTOR, 10);
    const cross = stagePlanFor(state, job).find((stage) => stage.id === 'crossCutting');
    expect(cross?.byHand).toBe(false);
  });

  it('counts the labour in the four new bags once, and the bar moves on past them', () => {
    const { state, job } = sashJob();
    const plan = stagePlanFor(state, job);
    const cross = plan[0];
    const planing = plan[1];
    if (cross === undefined || planing === undefined) throw new Error('no plan');
    const crossLabour = cross.to - cross.from;
    job.stageLabour = { crossCutting: crossLabour, planing: 1 };
    job.labourRemaining = job.labourValue - crossLabour - 1;
    expect(stageDone(job, plan, cross)).toBeCloseTo(crossLabour, 6);
    expect(stageDone(job, plan, planing)).toBeCloseTo(1, 6);
    expect(currentStage(state, job)?.id).toBe('planing');
  });

  it('leaves the oak table s plan as it was, in the day 149 save and in a new job', () => {
    const state = day149();
    const oak = state.jobs.find((entry) => entry.templateId === 'oakDiningTable');
    if (oak === undefined) throw new Error('no oak table in the day 149 save');
    expect(oak.timber).toBeUndefined();
    expect(stagePlanFor(state, oak).map((stage) => stage.id)).toEqual(['cutting', 'edging', 'moulding', 'assembly']);
    expect(stageLabel('assembly', oak)).toBe('Assembly');
    // And a new one is not a window either.
    const kitted = timberHall();
    placeEquipment(kitted, 'thicknesser', { variantId: 'standard', x: 12, y: 6 });
    const enquiry = placeEnquiry(kitted, { templateId: 'oakDiningTable', name: 'Oak dining table', price: 12000, materialKind: 'solidWood' });
    const table = firstJob(acceptNow(kitted, enquiry.id));
    expect(table.timber).toBeUndefined();
    expect(stagePlanFor(kitted, table).map((stage) => stage.id)).toEqual(['cutting', 'edging', 'moulding', 'assembly']);
  });
});

describe('where a window man is drawn (CLAUDE.md T28 2.7)', () => {
  it('draws him only at the families of his own plan, and a kitchen man never at a timber machine', () => {
    let state = timberHall();
    placeEquipment(state, 'edgebander', { variantId: 'standard', x: 12, y: 3, id: 'kit-edge' });
    const window = placeEnquiry(state, { templateId: 'sashWindows', name: 'Sash windows', price: 14000, finish: 'lacquer', materialKind: 'solidWood', deadlineDays: 40 });
    state = acceptNow(state, window.id);
    const kitchen = placeEnquiry(state, { templateId: 'smallKitchen', name: 'Small kitchen', price: 5000, deadlineDays: 40 });
    state = acceptNow(state, kitchen.id);
    state = fillRack(state, 60);
    const windowJob = state.jobs.find((job) => job.templateId === 'sashWindows');
    const kitchenJob = state.jobs.find((job) => job.templateId === 'smallKitchen');
    if (windowJob === undefined || kitchenJob === undefined) throw new Error('jobs wanted');
    for (const job of [windowJob, kitchenJob]) {
      job.stage = 'inProduction';
      job.sheetsReserved = job.sheets;
    }
    const tom = testJoiner('w-tom', 'Tom');
    const ben = testJoiner('w-ben', 'Ben');
    state.workers.push(tom, ben);
    tom.jobId = windowJob.id;
    ben.jobId = kitchenJob.id;
    windowJob.assignees = [tom.id];
    kitchenJob.assignees = [ben.id];
    const windowFamilies = new Set(stagePlanFor(state, windowJob).map((stage) => stage.family));
    let seenTimber = false;
    for (let hour = 0; hour < 9; hour += 1) {
      state.clock.minute = hour * DRAWN_TURN_MINUTES;
      planPlaces(state);
      for (const entry of drawnPlaces(state)) {
        if (entry.who === tom.id) {
          expect(windowFamilies.has(entry.item.specId), `${hour} ${entry.item.specId}`).toBe(true);
          expect(['edgebander', 'tableSaw'], `${hour}`).not.toContain(entry.item.specId);
          if (TIMBER_FAMILIES.includes(entry.item.specId)) seenTimber = true;
        } else {
          expect(TIMBER_FAMILIES, `${hour} ${entry.who}`).not.toContain(entry.item.specId);
        }
      }
    }
    expect(seenTimber).toBe(true);
  });
});
