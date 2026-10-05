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
  GLASS_DELIVERY_WORKING_DAYS,
  GLASS_SHARE,
  DAY_END_MINUTE,
  DRAWN_TURN_MINUTES,
  TIMBER_LEAD_DAYS,
} from '../../src/engine/constants';
import { lockReasonFor, missingEquipment, template } from '../../src/engine/catalog';
import {
  blockFor,
  enquiryDeadlineDays,
  generateEnquiry,
  generateUnreachable,
  kitBlockFor,
  offeredOnTheBoard,
  timberOnTheBoard,
} from '../../src/engine/board';
import { drawBigJob } from '../../src/engine/agency';
import { deadlineDaysFrom, labourValueFor, ownerDaysFor, stagedJob } from '../../src/engine/jobs';
import { addWorkingDays } from '../../src/engine/clock';
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
import { tick } from '../../src/engine/game';
import {
  autoOrderMaterial,
  dropJob,
  hallStops,
  nightsLeft,
  orderGlassCheck,
  paperworkDone,
  refreshJob,
  WAITING_FOR_GLASS,
} from '../../src/engine/jobs';
import { boardsCostOf, glassCostOf, sheetsForCost } from '../../src/engine/materials';
import { WARNING_ORDER, warnings } from '../../src/engine/warnings';
import { materialLine } from '../../src/ui/jobCard';
import { formatCalendarDay } from '../../src/engine/clock';
import { workPlan } from '../../src/engine/plan';
import { migrateState } from '../../src/engine/migrate';
import { planPlaces } from '../../src/engine/production';
import { workshopRate } from '../../src/engine/plan';
import type { GameState, Job } from '../../src/engine/index';
import {
  acceptNow,
  act,
  nextDay,
  buyStartingKit,
  clearEvents,
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

/** A timber job in production with Tom on it, its material in hand and its bags full to within a
 *  few minutes of the end of this stage. */
function standingAt(stageId: 'pressing' | 'finishing', template = 'sashWindows'): { state: GameState; job: Job } {
  let state = timberHall();
  const enquiry = placeEnquiry(state, {
    templateId: template,
    name: template === 'sashWindows' ? 'Sash windows' : 'Lacquered kitchen',
    price: 14000,
    finish: 'lacquer',
    materialKind: template === 'sashWindows' ? 'solidWood' : 'sheet',
    deadlineDays: 60,
  });
  state = fillRack(acceptNow(state, enquiry.id), 80);
  const job = firstJob(state);
  job.stage = 'inProduction';
  job.sheetsReserved = job.sheets;
  job.designMinutesRemaining = 0;
  const tom = testJoiner('w-tom', 'Tom');
  state.workers.push(tom);
  tom.jobId = job.id;
  job.assignees = [tom.id];
  state.tasks = state.tasks.filter((task) => task.jobId !== job.id);
  const plan = stagePlanFor(state, job);
  const at = plan.find((stage) => stage.id === stageId);
  if (at === undefined) throw new Error(`no ${stageId} on the plan`);
  const bags: Partial<Record<string, number>> = {};
  for (const stage of plan) {
    if (stage.to <= at.from) bags[stage.id] = stage.to - stage.from;
  }
  bags[stageId] = at.to - at.from - 0.5;
  job.stageLabour = bags as Job['stageLabour'];
  job.labourRemaining = job.labourValue - (at.to - 0.5);
  job.stageRuns = [{ stage: plan[0]?.id ?? 'cutting', startDay: state.clock.day, startMinute: 0, endDay: null, endMinute: null } as never];
  state.clock.minute = 60;
  return { state, job };
}

describe('the two nights (CLAUDE.md T28 2.8)', () => {
  it('stands a night after the pressing: glue curing, a hall stop, no material card, until the next working day opens', () => {
    let { state } = standingAt('pressing');
    const day = state.clock.day;
    let job = firstJob(state);
    expect(nightsLeft(state, job)).toBe(2);
    // Work until the pressing is filled.
    for (let minute = 0; minute < 120 && firstJob(state).curing === null; minute += 1) state = tick(state, 1);
    job = firstJob(state);
    expect(job.curing).toEqual({ reason: 'glue curing', untilDay: addWorkingDays(day, 1) });
    expect(hallStops(state, job)).toBe('glue curing');
    expect(nightsLeft(state, job)).toBe(2);
    // The rest of the day: nothing goes into it, the minutes are the hall's stop, Tom stays on it.
    const labour = job.labourRemaining;
    const stopped = state.dayStats.efficiency.lost.hallStopped;
    state = tick(state, 60);
    job = firstJob(state);
    expect(job.labourRemaining).toBe(labour);
    expect(job.blockedBy).toBe('glue curing');
    expect(job.assignees).toEqual(['w-tom']);
    expect(state.dayStats.efficiency.lost.hallStopped).toBeGreaterThan(stopped);
    expect(state.eventQueue.some((event) => event.kind === 'noMaterial')).toBe(false);
    expect(state.activeEvent?.kind === 'noMaterial').toBe(false);
    // The next working day opens and the frame is free.
    state.clock.minute = DAY_END_MINUTE;
    state = clearEvents(act(clearEvents(state), { type: 'END_DAY' }));
    expect(state.clock.day).toBe(addWorkingDays(day, 1));
    job = firstJob(state);
    expect(job.curing).toBeNull();
    expect(hallStops(state, job)).toBe('');
    expect(nightsLeft(state, job)).toBe(1);
  });

  it('stands a night after the finishing too: lacquer drying', () => {
    let { state } = standingAt('finishing');
    for (let minute = 0; minute < 120 && firstJob(state).curing === null; minute += 1) state = tick(state, 1);
    const job = firstJob(state);
    expect(job.curing?.reason).toBe('lacquer drying');
    expect(hallStops(state, job)).toBe('lacquer drying');
    expect(nightsLeft(state, job)).toBe(1);
  });

  it('never stands a sheet job, lacquered or not', () => {
    let { state } = standingAt('finishing', 'lacqueredKitchen');
    expect(firstJob(state).timber).toBeUndefined();
    const before = firstJob(state).labourRemaining;
    state = tick(state, 120);
    const job = firstJob(state);
    expect(job.curing).toBeNull();
    expect(job.labourRemaining).toBeLessThan(before);
    expect(nightsLeft(state, job)).toBe(0);
  });

  it('counts a working day on the Work Plan for every night not yet stood', () => {
    const { state, job } = sashJob();
    const row = workPlan(state).rows.find((entry) => entry.jobId === job.id);
    expect(nightsLeft(state, job)).toBe(2);
    // Not started: the bar is its work and two working days, and its latest start is counted back
    // over both from the deadline.
    const work = (row?.minutesTotal ?? 0) / MINUTES_PER_WORKING_DAY;
    expect(row?.to).toBeCloseTo((row?.from ?? 0) + work + 2, 2);
    expect(row?.latestStartPoint).toBeCloseTo((row?.duePoint ?? 0) - work - 2, 1);
  });

  it('is ended by the day it names whatever lies between: a weekend adds nothing', () => {
    const { state, job } = sashJob();
    // A Friday's pressing stands until Monday's open.
    state.clock.day = 5;
    job.curing = { reason: 'glue curing', untilDay: addWorkingDays(5, 1) };
    expect(job.curing.untilDay).toBe(8);
    expect(hallStops(state, job)).toBe('glue curing');
    state.clock.day = 8;
    expect(hallStops(state, job)).toBe('');
  });
});

/** The desk work of a job done: the drawing, the site measure and the material list. */
function paperworkOf(state: GameState, job: Job): void {
  for (const task of state.tasks) {
    if (task.jobId === job.id && ['design', 'siteMeasure', 'materialTakeOff'].includes(task.kind)) task.done = true;
  }
}

describe('the glass (CLAUDE.md T28 2.9)', () => {
  it('is a timber job s alone: 0.35 of the material, the boards the rest', () => {
    const { state, job } = sashJob();
    expect(GLASS_SHARE).toBe(0.35);
    expect(job.glass).toBe('toOrder');
    expect(job.glassDay).toBeNull();
    expect(glassCostOf(job)).toBe(Math.round(job.materialCost * 0.35 * 100) / 100);
    expect(boardsCostOf(job.materialCost, true) + glassCostOf(job)).toBeCloseTo(job.materialCost, 2);
    expect(job.sheets).toBe(sheetsForCost(boardsCostOf(job.materialCost, true)));
    expect(job.sheets).toBeLessThan(sheetsForCost(job.materialCost));
    // A sheet job and the oak table have none.
    const kitchen = placeEnquiry(state, { templateId: 'smallKitchen', name: 'Small kitchen', price: 5000 });
    const next = acceptNow(state, kitchen.id);
    const sheet = next.jobs.find((entry) => entry.templateId === 'smallKitchen');
    expect(sheet?.glass).toBe('none');
    expect(sheet?.sheets).toBe(sheetsForCost(sheet?.materialCost ?? 0));
  });

  it('cannot be ordered before the paperwork is done, and is ordered by the owner s click after it', () => {
    const { state, job } = sashJob();
    expect(paperworkDone(state, job)).toBe(false);
    expect(orderGlassCheck(state, job)).toEqual({ ok: false, reason: 'The drawing is not finished' });
    expect(materialLine(state, job)).toContain('data-glass="toOrder"');
    paperworkOf(state, job);
    expect(orderGlassCheck(state, job)).toEqual({ ok: true, reason: '' });
    const html = materialLine(state, job);
    expect(html).toContain('Glass not ordered');
    expect(html).toContain('data-do="orderGlass"');
    expect(html).toContain('data-do="orderForJob"');
    const cash = state.cash;
    const after = act(state, { type: 'ORDER_GLASS', jobId: job.id });
    const ordered = firstJob(after);
    expect(ordered.glass).toBe('ordered');
    expect(ordered.glassDay).toBe(addWorkingDays(after.clock.day, GLASS_DELIVERY_WORKING_DAYS));
    expect(after.cash).toBeCloseTo(cash - glassCostOf(job), 2);
    const line = after.ledger[after.ledger.length - 1];
    expect(line?.category).toBe('material');
    expect(line?.label).toBe('Glass for Sash windows');
    expect(materialLine(after, ordered)).toContain(`Glass ordered, here on ${formatCalendarDay(ordered.glassDay ?? 0)}`);
    // No minutes of his day: the clock did not move.
    expect(after.clock.minute).toBe(state.clock.minute);
    expect(orderGlassCheck(after, ordered).reason).toBe('Ordered already');
  });

  it('is ordered by the office admin with the boards', () => {
    const { state, job } = sashJob();
    const sue = testJoiner('w-sue', 'Sue');
    sue.role = 'officeAdmin';
    sue.tier = null;
    state.workers.push(sue);
    paperworkOf(state, job);
    refreshJob(state, job);
    expect(job.stage).toBe('materialOrdered');
    expect(job.glass).toBe('ordered');
    expect(state.ledger.some((entry) => entry.label === 'Glass for Sash windows, ordered by Sue')).toBe(true);
    expect(state.ledger.some((entry) => entry.label.startsWith('Material for Sash windows'))).toBe(true);
    expect(autoOrderMaterial(state, job)).toBe(false);
  });

  it('arrives ten working days on, at the open of its day, and stops the Glazing until it does', () => {
    const { state, job } = sashJob();
    paperworkOf(state, job);
    const ordered = act(state, { type: 'ORDER_GLASS', jobId: job.id });
    const windowJob = firstJob(ordered);
    // At the Glazing with every bag before it full.
    const plan = stagePlanFor(ordered, windowJob);
    const bags: Partial<Record<string, number>> = {};
    for (const stage of plan) if (stage.id !== 'assembly') bags[stage.id] = stage.to - stage.from;
    windowJob.stageLabour = bags as Job['stageLabour'];
    windowJob.labourRemaining = windowJob.labourValue - (plan[plan.length - 1]?.from ?? 0);
    expect(currentStage(ordered, windowJob)?.id).toBe('assembly');
    expect(hallStops(ordered, windowJob)).toBe(WAITING_FOR_GLASS);
    expect(WAITING_FOR_GLASS).toBe('waiting for glass');
    // The day before it is due it is still on its way; the morning it is due it is in.
    let morning = ordered;
    for (let day = 1; day <= GLASS_DELIVERY_WORKING_DAYS; day += 1) {
      morning.clock.minute = DAY_END_MINUTE;
      morning = clearEvents(act(clearEvents(morning), { type: 'END_DAY' }));
      const glass = firstJob(morning).glass;
      expect(glass, String(morning.clock.day)).toBe(day < GLASS_DELIVERY_WORKING_DAYS ? 'ordered' : 'in');
    }
    expect(morning.clock.day).toBe(windowJob.glassDay);
    expect(hallStops(morning, firstJob(morning))).toBe('');
    expect(materialLine(morning, firstJob(morning))).toContain('Glass is in');
  });

  it('is said on the strip while it is to order, directly under the drawing line', () => {
    expect(WARNING_ORDER.indexOf('glassNotOrdered')).toBe(WARNING_ORDER.indexOf('drawingDone') + 1);
    const { state, job } = sashJob();
    const line = (now: GameState): string | undefined => warnings(now).find((entry) => entry.key === 'glassNotOrdered')?.text;
    // Not before the paperwork is done.
    expect(line(state)).toBeUndefined();
    paperworkOf(state, job);
    expect(line(state)).toBe('Glass not ordered: Sash windows');
    const after = act(state, { type: 'ORDER_GLASS', jobId: job.id });
    expect(line(after)).toBeUndefined();
  });

  it('is lost with a job dropped after it was ordered, as its boards are', () => {
    const { state, job } = sashJob();
    paperworkOf(state, job);
    const ordered = act(state, { type: 'ORDER_GLASS', jobId: job.id });
    const windowJob = firstJob(ordered);
    const cost = glassCostOf(windowJob);
    expect(dropJob(ordered, windowJob.id)).toBe(true);
    const loss = ordered.ledger.find((entry) => entry.label === 'Glass written off: Sash windows');
    expect(loss?.amount).toBeCloseTo(-cost, 2);
  });
});

const TIMBER_IDS = FIVE.map(([id]) => id);

/** A company in the 800 m2 hall, the second extension open the morning after it was paid for, with
 *  the day one kit, at a standing that opens all five, on the template site so the band draws from
 *  the top tier, and the timber kit but what is named. */
function bigHall(without: string[] = []): GameState {
  let state = newGame({ difficulty: 'veryEasy' });
  state.cash = 3000000;
  state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
  state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'second' }));
  expect(state.unit.areaM2).toBe(800);
  state = buyStartingKit(state);
  state.cash = 3000000;
  state.reputation = 40;
  state.website.level = 3;
  state.enquiries = [];
  const kit: Array<[string, number, number]> = [
    ['crossCut', 22, 12],
    ['planer', 27, 12],
    ['spindleMoulder', 32, 12],
    ['sander', 22, 15],
    ['framePress', 27, 15],
    ['sprayBooth', 32, 15],
    ['cuttersSash', 0, 0],
    ['cuttersCasement', 0, 0],
    ['cuttersDoor', 0, 0],
  ];
  for (const [id, x, y] of kit) {
    if (without.includes(id)) continue;
    placeEquipment(state, id, { variantId: 'standard', x, y, id: `kit-${id}` });
  }
  return state;
}

/** The templates of so many draws of the band. */
function drawn(state: GameState, draws: number): string[] {
  const ids: string[] = [];
  for (let at = 0; at < draws; at += 1) {
    const enquiry = generateEnquiry(state);
    if (enquiry !== null) ids.push(enquiry.templateId);
  }
  return ids;
}

/** The templates of so many greyed tiles. */
function greyed(state: GameState, draws: number): Array<{ templateId: string; reason: string }> {
  const found: Array<{ templateId: string; reason: string }> = [];
  for (let at = 0; at < draws; at += 1) {
    state.enquiries = [];
    const enquiry = generateUnreachable(state);
    if (enquiry !== null) found.push({ templateId: enquiry.templateId, reason: enquiry.blockReason });
  }
  return found;
}

describe('timber on the board of the 800 m2 hall (CLAUDE.md T28 2.3)', () => {
  it('offers the 200 and the 400 m2 hall exactly the templates it offered before, and no window', () => {
    const small = timberHall();
    const middle = nextDay(act(Object.assign(timberHall(), { cash: 3000000 }), { type: 'EXTEND_UNIT' }));
    expect(middle.unit.areaM2).toBe(400);
    const sheet = PRODUCT_TEMPLATES.filter((entry) => entry.material === 'sheet').map((entry) => entry.id);
    for (const state of [small, middle]) {
      expect(timberOnTheBoard(state)).toBe(false);
      expect(PRODUCT_TEMPLATES.filter((entry) => offeredOnTheBoard(state, entry)).map((entry) => entry.id)).toEqual(sheet);
      state.website.level = 3;
      for (const id of drawn(state, 300)) expect(TIMBER_IDS, id).not.toContain(id);
      for (const tile of greyed(state, 120)) expect(TIMBER_IDS, tile.templateId).not.toContain(tile.templateId);
    }
  });

  it('offers windows and doors to the 800 m2 hall with the kit and the cutters, never bespoke, with the lead on', () => {
    const state = bigHall();
    expect(timberOnTheBoard(state)).toBe(true);
    expect(offeredOnTheBoard(state, template('oakDiningTable'))).toBe(false);
    const live: Array<{ templateId: string; bespoke: boolean; days: number; locked: string | null }> = [];
    for (let at = 0; at < 400; at += 1) {
      const enquiry = generateEnquiry(state);
      if (enquiry === null || !TIMBER_IDS.includes(enquiry.templateId)) continue;
      live.push({ templateId: enquiry.templateId, bespoke: enquiry.bespokeMaterial, days: enquiry.deadlineDays, locked: enquiry.lockReason });
    }
    expect(live.length).toBeGreaterThan(10);
    expect(new Set(live.map((entry) => entry.templateId)).size).toBeGreaterThanOrEqual(3);
    for (const entry of live) {
      expect(entry.bespoke, entry.templateId).toBe(false);
      expect(entry.locked, entry.templateId).toBeNull();
      expect(entry.days, entry.templateId).toBeGreaterThanOrEqual(TIMBER_LEAD_DAYS + 3);
    }
  });

  it('locks a live window without its cutters, and greys the rest for what the hall is short of', () => {
    const noSash = bigHall(['cuttersSash']);
    const sash: Array<string | null> = [];
    for (let at = 0; at < 500 && sash.length < 3; at += 1) {
      const enquiry = generateEnquiry(noSash);
      if (enquiry?.templateId === 'sashWindows') sash.push(enquiry.lockReason);
    }
    expect(sash.length).toBeGreaterThan(0);
    for (const reason of sash) expect(reason).toBe('Needs sash window cutter set');
    // Greyed: for the machines and for the cutters, in the reasons' own words.
    const short = greyed(bigHall(['crossCut', 'planer', 'cuttersDoor']), 200).filter((tile) => TIMBER_IDS.includes(tile.templateId));
    expect(short.length).toBeGreaterThan(0);
    for (const tile of short) {
      const cutters = template(tile.templateId).cutters === 'cuttersDoor' ? ', door cutter set' : '';
      expect(tile.reason, tile.templateId).toBe(`no cross cut saw, four sided planer${cutters}`);
    }
    const noBooth = greyed(bigHall(['sprayBooth']), 200).filter((tile) => TIMBER_IDS.includes(tile.templateId));
    expect(noBooth.length).toBeGreaterThan(0);
    for (const tile of noBooth) expect(tile.reason).toBe('needs a spray booth');
  });

  it('never has the agency draw a window or a door as a big job', () => {
    const state = bigHall();
    state.reputation = 90;
    for (let seed = 0; seed < 300; seed += 1) {
      const job = drawBigJob(state, { rng: seed * 7919 + 1 });
      if (job === null) continue;
      expect(TIMBER_IDS, job.templateId).not.toContain(job.templateId);
    }
  });
});
