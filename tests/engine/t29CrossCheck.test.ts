/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// @vitest-environment jsdom
// Turn 29, E3: the clauses of the brief's section 7 that the cross check found asserted in part
// or not at all, each asserted here as section 7 words it (CLAUDE.md T29 section 7).

import { describe, expect, it } from 'vitest';
import { EQUIPMENT_SPECS, LINE_FACTOR, LINE_MODULES, MACHINE_CAPACITY } from '../../src/engine/constants';
import type { GameState, Worker } from '../../src/engine/index';
import { canBuy, placeEquipmentOrder } from '../../src/engine/game';
import { dropJob, stagedJob } from '../../src/engine/jobs';
import { boardsHeld, findSpec, lineLevel, lineModules, outputBreakdown, sheetsOnCounter } from '../../src/engine/machines';
import {
  canUnload,
  createDelivery,
  drawSheetsFor,
  rackCapacity,
  stockFree,
  unloadIntoStock,
} from '../../src/engine/materials';
import { migrateState } from '../../src/engine/migrate';
import { stagePlanFor } from '../../src/engine/stages';
import { tradeUsage } from '../../src/engine/usage';
import { renderSpriteCheck, spriteTargets } from '../../src/ui/spriteCheck';
import { renderTeam } from '../../src/ui/team';
import {
  act,
  acceptNow,
  buyStartingKit,
  fillRack,
  newGame,
  nextDay,
  placeEnquiry,
  placeEquipment,
  testJoiner,
  withAir,
} from '../helpers';

const NEW_FAMILIES = ['cnc5', 'sprayRobot', ...LINE_MODULES, 'timberRack', 'timberShelter'];
const STORE_KIT = ['sprayRobot', 'timberRack', 'timberShelter'];

/** A company in the 800 m2 unit with the day one kit, air enough for a CNC, the timber machines
 *  at their standard class and the sash cutters, and no timber store unless asked for. */
function bigUnit(options: { cnc5?: boolean; stores?: boolean } = {}): GameState {
  let state = newGame({ difficulty: 'veryEasy' });
  state.cash = 9000000;
  state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
  state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'second' }));
  state = withAir(buyStartingKit(state), 'industrial');
  state.cash = 9000000;
  state.reputation = 40;
  state.enquiries = [];
  const kit: Array<[string, number, number]> = [
    ['crossCut', 20, 2],
    ['planer', 26, 2],
    ['spindleMoulder', 32, 2],
    ['sander', 20, 6],
    ['framePress', 26, 6],
    ['sprayBooth', 32, 6],
    ['cuttersSash', 0, 0],
  ];
  if (options.cnc5 === true) kit.push(['cnc5', 20, 9]);
  if (options.stores === true) kit.push(['timberShelter', 40, 1], ['timberRack', 36, 12]);
  for (const [id, x, y] of kit) placeEquipment(state, id, { variantId: 'standard', x, y, id: `kit-${id}` });
  return state;
}

function withLine(state: GameState, count: number): GameState {
  for (let n = 1; n <= count; n += 1) {
    placeEquipment(state, `windowLine${n}`, { x: 5 + 6 * (n - 1), y: 14, id: `kit-line-${n}` });
  }
  return state;
}

function withEngineers(state: GameState, count: number): GameState {
  for (let n = 1; n <= count; n += 1) {
    state.workers.push({ ...testJoiner(`eng-${n}`, `Engineer ${n}`), role: 'lineEngineer', tier: null, rate: 0, monthlyWage: 15000 });
  }
  return state;
}

function windowJob(): ReturnType<typeof stagedJob> {
  return stagedJob(100, 'solidWood', false, 'lacquer', false, true);
}

describe('the pictures on the Sprite check page (CLAUDE.md T29 2.4, section 7)', () => {
  it('shows a file, a footprint and no red port line for every class of every new family', () => {
    const targets = spriteTargets().filter((target) => NEW_FAMILIES.includes(target.specId));
    // Three classes of the five axis CNC and one of each of the other eight families.
    expect(targets).toHaveLength(11);
    const page = document.createElement('div');
    page.innerHTML = renderSpriteCheck();
    for (const target of targets) {
      const cell = page.querySelector(`[data-sprite-target="${target.name}"]`);
      expect(cell, target.name).not.toBeNull();
      expect(cell?.querySelector('.sprite-shot.is-missing'), target.name).toBeNull();
      expect(cell?.querySelector('.sprite-shot image'), target.name).not.toBeNull();
      expect(cell?.textContent, target.name).not.toContain('no file yet');
      expect(cell?.textContent, target.name).toContain('works in');
      expect(cell?.querySelector('[data-port="none"]'), target.name).toBeNull();
    }
  });
});

describe('the big kit and the smaller units (CLAUDE.md T29 2.5.1, section 7)', () => {
  it('refuses the five axis CNC and every module in the 200 and the 400 m² unit, and sells them the robot and the stores', () => {
    const small = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    small.cash = 9000000;
    small.reputation = 40;
    let middle = newGame({ difficulty: 'veryEasy' });
    middle.cash = 9000000;
    middle = buyStartingKit(nextDay(act(middle, { type: 'EXTEND_UNIT' })));
    middle.cash = 9000000;
    middle.reputation = 40;
    expect(middle.unit.areaM2).toBe(400);
    for (const state of [small, middle]) {
      for (const id of ['cnc5', ...LINE_MODULES]) {
        expect(canBuy(state, id), `${state.unit.areaM2} ${id}`).toEqual({ ok: false, reason: 'Needs the 800 m² unit' });
      }
      placeEquipment(state, 'sprayBooth', { variantId: 'standard', x: 12, y: 2, id: 'kit-booth' });
      for (const id of STORE_KIT) expect(canBuy(state, id), `${state.unit.areaM2} ${id}`).toEqual({ ok: true, reason: '' });
    }
  });

  it('names a unit for the five axis CNC and the five modules and no other family, so the catalogue tests pass over those six only', () => {
    const named = EQUIPMENT_SPECS.filter((spec) => spec.minUnitM2 !== undefined).map((spec) => spec.id);
    expect(named.sort()).toEqual(['cnc5', ...LINE_MODULES].sort());
    for (const id of named) expect(findSpec(id)?.minUnitM2, id).toBe(800);
  });

  it('asks the reputation before the unit', () => {
    const small = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    small.cash = 9000000;
    const spec = findSpec('cnc5');
    if (spec === null || spec === undefined) throw new Error('the five axis CNC is wanted');
    small.reputation = spec.minReputation - 1;
    expect(canBuy(small, 'cnc5')).toEqual({ ok: false, reason: `Needs reputation ${spec.minReputation}` });
    small.reputation = spec.minReputation;
    expect(canBuy(small, 'cnc5')).toEqual({ ok: false, reason: 'Needs the 800 m² unit' });
  });
});

describe('a sheet job in a hall with all of it (CLAUDE.md T29 2.5.3, section 7)', () => {
  it('is family for family what it is with none of it, and only the robot moves its pace, at the Finishing', () => {
    // None of it: no five axis CNC, no robot, no line, no store.
    const plain = bigUnit();
    // All of it: the five axis CNC, the robot, the whole line running under two engineers, and
    // both stores.
    const full = withEngineers(withLine(bigUnit({ cnc5: true, stores: true }), 5), 2);
    placeEquipment(full, 'sprayRobot', { variantId: 'standard', x: 36, y: 6, id: 'kit-robot' });
    expect(lineLevel(full)).toBe(5);
    for (const finish of ['laminate', 'lacquer'] as const) {
      const job = stagedJob(100, 'sheet', false, finish, true, false);
      const before = stagePlanFor(plain, job);
      const after = stagePlanFor(full, job);
      expect(after.map((stage) => [stage.id, stage.family])).toEqual(before.map((stage) => [stage.id, stage.family]));
      after.forEach((stage, index) => {
        const was = before[index]?.speed ?? 0;
        expect(stage.speed, `${finish} ${stage.id}`).toBeCloseTo(stage.id === 'finishing' ? was * 2 : was, 10);
      });
    }
  });
});

describe('the line s purchase, in its order and on one morning (CLAUDE.md T29 2.9.2, section 7)', () => {
  it('asks what a module requires before one of each, and one of each before the cash', () => {
    // Module 2 standing with no module 1 (a save could hold it): its requires is asked first.
    const gap = withLine(bigUnit({ cnc5: true, stores: true }), 0);
    placeEquipment(gap, 'windowLine2', { x: 11, y: 14, id: 'kit-line-2' });
    expect(canBuy(gap, 'windowLine2')).toEqual({ ok: false, reason: 'Needs Window line, module 1 first' });
    // Module 1 on order and no money left: one of each is asked before the cash.
    const poor = bigUnit({ cnc5: true, stores: true });
    expect(placeEquipmentOrder(poor, 'windowLine1').ok).toBe(true);
    poor.cash = 0;
    expect(canBuy(poor, 'windowLine1')).toEqual({ ok: false, reason: 'The line has this module' });
  });

  it('stands all five on the one morning they are due, ordered in one morning, and none the evening before', () => {
    let state = bigUnit({ cnc5: true, stores: true });
    for (const id of LINE_MODULES) expect(placeEquipmentOrder(state, id).ok, id).toBe(true);
    const due = state.onOrder.find((item) => item.specId === 'windowLine1')?.dueDay ?? 0;
    let guard = 0;
    while (state.clock.day < due - 1 && guard < 80) {
      guard += 1;
      state = nextDay(state);
    }
    expect(lineModules(state)).toBe(0);
    state = nextDay(state);
    expect(state.clock.day).toBe(due);
    expect(lineModules(state)).toBe(5);
  });
});

describe('every covered stage at its level (CLAUDE.md T29 2.9.5, 2.9.6, section 7)', () => {
  it('puts the Planing on module 1 at every level and the Pressing on module 4 at 4 and 5, at the factor times 1.12', () => {
    for (let level = 1; level <= 5; level += 1) {
      const state = withEngineers(withLine(bigUnit({ cnc5: true, stores: true }), level), level > 3 ? 2 : 1);
      const plan = stagePlanFor(state, windowJob());
      const factor = LINE_FACTOR[level] ?? 1;
      const planing = plan.find((stage) => stage.id === 'planing');
      expect(planing?.family, `${level}`).toBe('windowLine1');
      expect(planing?.speed, `${level}`).toBeCloseTo(factor * 1.12, 10);
      const pressing = plan.find((stage) => stage.id === 'pressing');
      if (level >= 4) {
        expect(pressing?.family, `${level}`).toBe('windowLine4');
        expect(pressing?.speed, `${level}`).toBeCloseTo(factor * 1.12, 10);
      } else {
        expect(pressing?.family, `${level}`).toBe('framePress');
      }
    }
  });

  it('says Too few of no module with thirty three men on timber work and the whole line', () => {
    const state = withEngineers(withLine(bigUnit({ cnc5: true, stores: true }), 5), 2);
    const enquiry = placeEnquiry(state, {
      templateId: 'sashWindows',
      name: 'Sash windows',
      price: 14000,
      basePrice: 14000,
      finish: 'lacquer',
      materialKind: 'solidWood',
      deadlineDays: 60,
    });
    const taken = acceptNow(state, enquiry.id);
    const job = taken.jobs.find((entry) => entry.templateId === 'sashWindows');
    if (job === undefined) throw new Error('the window is taken');
    job.stage = 'inProduction';
    const men: Worker[] = [];
    for (let n = 1; n <= 32; n += 1) men.push({ ...testJoiner(`w-${n}`, `Man ${n}`), working: true, jobId: job.id });
    taken.workers.push(...men);
    job.assignees = men.map((man) => man.id);
    taken.owner.working = true;
    job.assignees.unshift('owner');
    expect(MACHINE_CAPACITY.windowLine1?.standard).toBe(33);
    const lines = outputBreakdown(taken).lines.map((line) => line.label);
    expect(lines.filter((label) => label.startsWith('Too few line module'))).toEqual([]);
    // The booths are what such a hall is short of (CLAUDE.md T29 section 8).
    expect(lines.some((label) => label.startsWith('Too few booths'))).toBe(true);
  });
});

describe('the engineer s full week (CLAUDE.md T29 2.8, section 7)', () => {
  it('books him a full week at the line, never standing, and his tile never asks for a second man', () => {
    let state = withEngineers(withLine(bigUnit({ cnc5: true, stores: true }), 2), 1);
    for (let day = 0; day < 7; day += 1) state = nextDay(state);
    const tile = tradeUsage(state).find((entry) => entry.trade === 'lineEngineer');
    expect(tile?.percent).not.toBeNull();
    expect(tile?.percent ?? 0).toBeGreaterThanOrEqual(90);
    expect(tile?.words).toBe('The line runs as 2 of its 2 modules.');
    expect(tile?.words).not.toContain('Near full');
    const page = renderTeam(state, 'ourTeam', 'lineEngineer');
    expect(page).not.toContain('standing most of the week');
    expect(page).not.toContain('Near full');
  });
});

describe('the counter read two ways, at its edges (CLAUDE.md T29 2.11.2, 2.11.4, section 7)', () => {
  it('never puts a load of sheets on a timber store, and counts the sheet racks room without the boards', () => {
    const state = fillRack(bigUnit({ stores: true }), 0);
    // A window holds 19 boards on the stores.
    const enquiry = placeEnquiry(state, {
      templateId: 'sashWindows',
      name: 'Sash windows',
      price: 14000,
      basePrice: 14000,
      finish: 'lacquer',
      materialKind: 'solidWood',
      deadlineDays: 60,
    });
    const taken = acceptNow(state, enquiry.id);
    const job = taken.jobs.find((entry) => entry.templateId === 'sashWindows');
    if (job === undefined) throw new Error('the window is taken');
    taken.deliveries = [];
    taken.stock.sheets += job.sheets;
    job.sheetsReserved = job.sheets;
    expect(boardsHeld(taken)).toBe(19);
    // The sheet racks' room is the racks less the sheets, the boards not in it.
    expect(stockFree(taken)).toBe(rackCapacity(taken) - sheetsOnCounter(taken));
    // The sheet racks full: a load of sheets goes past the stores, which have room, and its
    // overflow to the paid store for the night, as on v83; not one sheet is put on a store.
    taken.stock.sheets += stockFree(taken);
    expect(stockFree(taken)).toBe(0);
    const sheets = createDelivery(taken, null, 5, false);
    expect(canUnload(taken, sheets)).toBe(true);
    sheets.unloaded = true;
    unloadIntoStock(taken, sheets);
    expect(taken.stock.tempStorageSheets).toBe(5);
    expect(sheetsOnCounter(taken)).toBe(rackCapacity(taken));
    expect(boardsHeld(taken)).toBe(19);
  });

  it('takes a dropped window s load off the road as well as off the gate', () => {
    const state = bigUnit({ stores: true });
    const enquiry = placeEnquiry(state, {
      templateId: 'sashWindows',
      name: 'Sash windows',
      price: 14000,
      basePrice: 14000,
      finish: 'lacquer',
      materialKind: 'solidWood',
      deadlineDays: 60,
    });
    const taken = acceptNow(state, enquiry.id);
    const job = taken.jobs.find((entry) => entry.templateId === 'sashWindows');
    if (job === undefined) throw new Error('the window is taken');
    taken.deliveries = [];
    const onTheRoad = createDelivery(taken, job.id, job.sheets, false, 0, true);
    expect(onTheRoad.arriveDay).toBeGreaterThan(taken.clock.day);
    const counter = taken.stock.sheets;
    expect(dropJob(taken, job.id)).toBe(true);
    expect(taken.deliveries.some((delivery) => delivery.id === onTheRoad.id)).toBe(false);
    expect(taken.stock.sheets).toBe(counter);
  });

  it('opens a v41 save whose window holds its boards with no store, and the window draws them to the last', () => {
    const state = bigUnit();
    const enquiry = placeEnquiry(state, {
      templateId: 'sashWindows',
      name: 'Sash windows',
      price: 14000,
      basePrice: 14000,
      finish: 'lacquer',
      materialKind: 'solidWood',
      deadlineDays: 60,
    });
    const taken = acceptNow(state, enquiry.id);
    const held = taken.jobs.find((entry) => entry.templateId === 'sashWindows');
    if (held === undefined) throw new Error('the window is taken');
    // On v83 its boards came in onto the sheet rack, and the job holds them.
    taken.deliveries = [];
    taken.stock.sheets += 19;
    held.sheetsReserved = 19;
    held.stage = 'inProduction';
    const raw = JSON.parse(JSON.stringify(taken)) as Record<string, unknown>;
    raw.version = 41;
    const opened = migrateState(raw, 41);
    if (opened === null) throw new Error('the save opens');
    expect(opened.equipment.some((item) => item.specId === 'timberRack' || item.specId === 'timberShelter')).toBe(false);
    expect(boardsHeld(opened)).toBe(19);
    const job = opened.jobs.find((entry) => entry.id === held.id);
    if (job === undefined) throw new Error('the window is in the save');
    expect(drawSheetsFor(opened, job, 1)).toBe(true);
    expect(job.sheetsUsed).toBe(19);
    expect(boardsHeld(opened)).toBe(0);
  });
});
